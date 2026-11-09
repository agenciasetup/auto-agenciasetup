// Grava as skills de .claude/skills/ no banco (config "skill:<nome>"), de onde o painel (Claude > Skills) e o conector
// do Claude (listar_skills, ver_skill) leem, e gera o arquivo .skill de cada uma em _local/skills/ (para instalar no
// app do Claude). Rode de novo sempre que uma skill mudar: npm run skill [-- <nome>]
import { crc32, deflateRawSync } from 'node:zlib';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { env, exige, raiz } from './env.mjs';

// Grava pela API do banco com a chave secreta (a mesma do Worker). Antes ia pela API de gestão (SUPABASE_ACCESS_TOKEN),
// que parou quando o token foi trocado em 29/10/2026.
exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY');
async function guardar(chave, valor) {
  const k = env.SUPABASE_SECRET_KEY;
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/config?on_conflict=chave`, {
    method: 'POST',
    headers: { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ chave, valor, atualizado_em: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(`config ${chave} ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

const pasta = join(raiz, '.claude', 'skills');
const pedidas = process.argv.slice(2);
const nomes = readdirSync(pasta).filter((n) => statSync(join(pasta, n)).isDirectory() && (!pedidas.length || pedidas.includes(n)));
if (!nomes.length) { console.error('Nenhuma skill encontrada em .claude/skills/.'); process.exit(1); }

const arquivosDe = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  if (statSync(p).isDirectory()) return n === 'evals' || n === 'node_modules' ? [] : arquivosDe(p);
  return n === '.DS_Store' ? [] : [p];
});

// Zip simples (deflate), no formato que o empacotador do skill-creator gera: <nome>/SKILL.md, <nome>/references/...
function zip(arquivos) {
  const partes = [], centrais = [];
  let offset = 0;
  for (const { nome, dados } of arquivos) {
    const n = Buffer.from(nome, 'utf8'), comp = deflateRawSync(dados), crc = crc32(dados);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10); local.writeUInt16LE(0x21, 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(dados.length, 22); local.writeUInt16LE(n.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10); central.writeUInt16LE(0, 12); central.writeUInt16LE(0x21, 14); central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comp.length, 20); central.writeUInt32LE(dados.length, 24); central.writeUInt16LE(n.length, 28);
    central.writeUInt32LE(offset, 42);
    partes.push(local, n, comp);
    centrais.push(central, n);
    offset += 30 + n.length + comp.length;
  }
  const dir = Buffer.concat(centrais), fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0); fim.writeUInt16LE(arquivos.length, 8); fim.writeUInt16LE(arquivos.length, 10);
  fim.writeUInt32LE(dir.length, 12); fim.writeUInt32LE(offset, 16);
  return Buffer.concat([...partes, dir, fim]);
}

mkdirSync(join(raiz, '_local', 'skills'), { recursive: true });
for (const nome of nomes) {
  const base = join(pasta, nome);
  const caminhos = arquivosDe(base);
  const skill = readFileSync(join(base, 'SKILL.md'), 'utf8');
  const topo = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const campo = (k) => (topo ? (topo[1].match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) || [])[1] : '') || '';
  if (!topo || campo('name') !== nome || !campo('description')) {
    console.error(`${nome}: o SKILL.md precisa começar com name: ${nome} e description.`);
    process.exit(1);
  }
  const arquivos = Object.fromEntries(caminhos.map((p) => [relative(base, p).split(sep).join('/'), readFileSync(p, 'utf8')]));
  const pacote = zip(caminhos.map((p) => ({ nome: `${nome}/${relative(base, p).split(sep).join('/')}`, dados: readFileSync(p) })));
  writeFileSync(join(raiz, '_local', 'skills', `${nome}.skill`), pacote);
  await guardar(`skill:${nome}`, {
    nome, descricao: campo('description'), atualizado: new Date().toISOString().slice(0, 10),
    arquivos, pacote_b64: pacote.toString('base64'),
  });
  console.log(`skill ${nome}: ${Object.keys(arquivos).length} arquivos gravados no painel; pacote em _local/skills/${nome}.skill (${pacote.length} bytes)`);
}
