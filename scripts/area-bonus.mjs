// O bônus da conquista dos 7 dias do curso "Posts automáticos com Claude": os "Modelos prontos" (4 estilos editáveis
// que aparecem no curso e na página de venda), com as prévias. Monta o pacote, gera 3 prévias por estilo, sobe o .zip
// para o bucket privado "curso" e as prévias para "midia", grava o arquivo no curso e o bônus em config.conquista.
// Pode rodar de novo: acha o arquivo pelo nome e atualiza no lugar; o dia de cada aluno continua o mesmo.
//
// Uso: node scripts/area-bonus.mjs              (monta, gera as prévias, sobe e grava)
//      node scripts/area-bonus.mjs --local      (só monta o pacote e as prévias em _local/bonus7/, sem subir)
//
// De onde vem cada modelo:
//   1-Padrao-Setup   o modelo em camadas do kit (Curso/kit/modelo e ferramentas/exportar.mjs, só leitura) + o conteúdo
//                    "criado no Claude" sem foto de ninguém (templates/bonus/padrao-setup/)
//   2-Advocacia      templates/bonus/advocacia/ (cópia genérica de templates/estilos/advogado.html)
//   3-Elegante       templates/bonus/elegante/ (sem a foto do Filipe: espaço reservado para a foto da pessoa)
//   4-Religioso      templates/bonus/religioso/ (o visual da skill sacro-design em HTML; pinturas de exemplo feitas com IA)
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { env, exige, raiz } from './env.mjs';

const local = process.argv.includes('--local');
const FONTE = join(raiz, 'templates', 'bonus');
const KIT = join(raiz, 'Curso', 'kit');
const SAIDA = join(raiz, '_local', 'bonus7');
const PACOTE = join(SAIDA, 'Modelos-Prontos');
const PREVIAS = join(SAIDA, 'previas');
const ZIP = join(SAIDA, 'Modelos-Prontos.zip');
const NOME = 'Modelos-Prontos.zip';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// Os modelos: pasta no pacote, como abrir cada slide e quais 3 slides viram prévia.
const MODELOS = [
  { id: 'setup', pasta: '1-Padrao-Setup', nome: 'Padrão Setup', texto: 'O modelo em camadas do curso, com o carrossel "criado no Claude".', html: '1-Padrao-Setup/modelo/modelo.html', url: (s) => `?c=criado-no-claude&s=${s}&etapa=5`, slides: [1, 2, 7] },
  { id: 'advocacia', pasta: '2-Advocacia', nome: 'Advocacia', texto: 'Escuro, vidro e verde-limão, no jeito do iPhone.', html: '2-Advocacia/advocacia.html', url: (s) => `?s=${s}&etapa=5`, slides: [1, 2, 3] },
  { id: 'elegante', pasta: '3-Elegante', nome: 'Elegante', texto: 'Tom quente, monograma dourado e espaço para a sua foto.', html: '3-Elegante/elegante.html', url: (s) => `?s=${s}&etapa=5`, slides: [1, 2, 3] },
  { id: 'religioso', pasta: '4-Religioso', nome: 'Religioso', texto: 'Pintura escura, texto claro e uma palavra manuscrita.', html: '4-Religioso/religioso.html', url: (s) => `?s=${s}&etapa=5`, slides: [1, 2, 3] },
];

// ---------------------------------------------------------------- 1. o pacote
if (!existsSync(join(KIT, 'modelo', 'modelo.html'))) throw new Error('Não achei Curso/kit/modelo (o modelo em camadas do kit).');
for (const p of [PACOTE, PREVIAS, ZIP]) rmSync(p, { recursive: true, force: true });
mkdirSync(PREVIAS, { recursive: true });
const copiar = (de, para) => cpSync(de, para, { recursive: true });
copiar(join(FONTE, 'LEIA-PRIMEIRO.md'), join(PACOTE, 'LEIA-PRIMEIRO.md'));
// Padrão Setup: o modelo do kit, as ferramentas e o conteúdo pronto.
const ps = join(PACOTE, '1-Padrao-Setup');
copiar(join(KIT, 'modelo'), join(ps, 'modelo'));
copiar(join(KIT, 'ferramentas', 'exportar.mjs'), join(ps, 'ferramentas', 'exportar.mjs'));
copiar(join(FONTE, 'padrao-setup', 'criado-no-claude.js'), join(ps, 'modelo', 'conteudos', 'criado-no-claude.js'));
copiar(join(FONTE, 'padrao-setup', 'LEIA.md'), join(ps, 'LEIA.md'));
mkdirSync(join(ps, 'imagens'), { recursive: true });
writeFileSync(join(ps, 'imagens', 'suas-fotos-aqui.txt'), 'Ponha aqui as fotos recortadas (PNG sem fundo) e os prints que o carrossel usar. No conteúdo, basta o nome do arquivo.\n');
// Os três em HTML: o modelo, o LEIA, as imagens e o exportador.
for (const [de, para] of [['advocacia', '2-Advocacia'], ['elegante', '3-Elegante'], ['religioso', '4-Religioso']]) {
  copiar(join(FONTE, de), join(PACOTE, para));
  copiar(join(FONTE, 'exportar.mjs'), join(PACOTE, para, 'exportar.mjs'));
}
mkdirSync(join(PACOTE, '3-Elegante', 'imagens'), { recursive: true });
writeFileSync(join(PACOTE, '3-Elegante', 'imagens', 'sua-foto-aqui.txt'), 'Salve aqui a sua foto recortada (PNG sem fundo, de frente, da cintura para cima) com o nome sua-foto.png. Ela entra sozinha na capa.\n');

// Nada de foto ou nome de gente real nem marca de terceiros no pacote.
const proibido = /filipe|lourenço|lourenco|agenciasetup|agência setup|calango/i;
const conferir = (p) => { for (const f of readdirSync(p)) { const a = join(p, f); if (statSync(a).isDirectory()) conferir(a); else { if (proibido.test(f)) throw new Error(`Arquivo com nome proibido: ${a}`); if (/\.(md|html|js|mjs|css|txt)$/.test(f) && proibido.test(readFileSync(a, 'utf8'))) throw new Error(`Texto proibido em ${a}`); } } };
conferir(PACOTE);

// ---------------------------------------------------------------- 2. as prévias (3 por estilo, WebP 864 x 1080)
const nav = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--font-render-hinting=none'] });
const pg = await nav.newPage();
await pg.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 0.8 });
const previas = {};
for (const m of MODELOS) {
  previas[m.id] = [];
  for (const [k, s] of m.slides.entries()) {
    await pg.goto(pathToFileURL(join(PACOTE, m.html)).href + m.url(s), { waitUntil: 'networkidle0', timeout: 60000 });
    await pg.evaluate(() => document.fonts.ready);
    if (m.id === 'setup') await pg.waitForFunction(() => window.PRONTO === true, { timeout: 10000 }).catch(() => console.log('  (o alinhamento do Padrão Setup não confirmou)'));
    await new Promise((r) => setTimeout(r, 250));
    const arq = join(PREVIAS, `${m.id}-${k + 1}.webp`);
    await pg.screenshot({ path: arq, type: 'webp', quality: 82 });
    previas[m.id].push(arq);
  }
  process.stdout.write(`${m.id} `);
}
await nav.close();
console.log('\nprévias em', PREVIAS);
copiar(PREVIAS, join(PACOTE, 'previas'));

// ---------------------------------------------------------------- 3. o .zip
rmSync(ZIP, { force: true });
// O tar do Windows (bsdtar) grava as pastas com "/": abre certo no Mac. O Compress-Archive grava com "\\" e no Mac
// vira um arquivo só com o nome cheio de barras.
const TAR = process.env.SystemRoot && existsSync(join(process.env.SystemRoot, 'System32', 'tar.exe')) ? join(process.env.SystemRoot, 'System32', 'tar.exe') : 'tar';
execFileSync(TAR, ['-a', '-c', '-f', ZIP, '-C', SAIDA, 'Modelos-Prontos']);
const corpo = readFileSync(ZIP);
console.log(`${NOME}: ${(corpo.length / 1048576).toFixed(2)} MB`);
if (local) process.exit(0);

// ---------------------------------------------------------------- 4. subir e gravar
exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY');
const k = env.SUPABASE_SECRET_KEY;
const H = { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': 'application/json' };
async function rest(caminho, opcoes = {}) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1${caminho}`, { ...opcoes, headers: { ...H, Prefer: 'return=representation', ...(opcoes.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${caminho} ${r.status}: ${t.slice(0, 400)}`);
  return t ? JSON.parse(t) : null;
}
const um = async (tabela, filtro) => (await rest(`/${tabela}?${filtro}&limit=1`))[0] || null;
async function subir(bucket, caminho, dados, tipo) {
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${bucket}/${caminho}`, {
    method: 'POST', headers: { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': tipo, 'x-upsert': 'true' }, body: dados,
  });
  if (!r.ok) throw new Error(`upload ${bucket}/${caminho} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return `${env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${caminho}`;
}

const curso = await um('cursos', 'slug=eq.posts-automaticos-com-claude&select=id,slug');
if (!curso) throw new Error('O curso posts-automaticos-com-claude não existe. Rode antes node scripts/area-semente.mjs.');
const caminho = `posts-automaticos/bonus/${NOME}`;
await subir('curso', caminho, corpo, 'application/zip');
const v = Date.now().toString(36);
const modelos = [];
for (const m of MODELOS) {
  const imagens = [];
  for (const [i, arq] of previas[m.id].entries()) imagens.push(`${await subir('midia', `curso/posts-automaticos/bonus/${m.id}-${i + 1}.webp`, readFileSync(arq), 'image/webp')}?v=${v}`);
  modelos.push({ nome: m.nome, texto: m.texto, imagens });
}
console.log('subiu o zip e', modelos.length * 3, 'prévias');

const ficha = {
  curso_id: curso.id, aula_id: null, nome: NOME, tipo: 'pacote',
  o_que: 'Bônus da conquista dos 7 dias: 4 modelos de carrossel prontos para editar (Padrão Setup, Advocacia, Elegante e Religioso), com as prévias.',
  quando: 'A partir do 7º dia. Use quando quiser um visual pronto e adaptar ao seu nicho.',
  como: ['Baixe e descompacte (no Windows, botão direito e Extrair tudo).', 'Abra o Claude na pasta do seu projeto e arraste a pasta do modelo para a conversa.', 'Cole o pedido pronto do LEIA.md, trocando o nicho e o assunto.'],
  tempo: '10 min', previa: readFileSync(join(FONTE, 'LEIA-PRIMEIRO.md'), 'utf8').split(/\r?\n/).filter((l) => l.trim()).slice(1, 4).join('\n').slice(0, 400),
  origem: 'storage', caminho, bytes: corpo.length, versao: new Date().toISOString().slice(0, 10).split('-').reverse().join('/'), ordem: 900,
};
const atual = await um('arquivos', `curso_id=eq.${curso.id}&nome=eq.${encodeURIComponent(NOME)}&select=id`);
const arquivo = atual
  ? (await rest(`/arquivos?id=eq.${atual.id}`, { method: 'PATCH', body: JSON.stringify(ficha) }))[0]
  : (await rest('/arquivos', { method: 'POST', body: JSON.stringify(ficha) }))[0];
console.log(atual ? 'arquivo atualizado' : 'arquivo criado', arquivo.id);

// O bônus em config.conquista. "ligada" e "dias" ficam como estão (o painel manda neles); sem config, nasce ligada com 7.
const cfg = await um('config', 'chave=eq.conquista&select=valor');
const valor = { ligada: true, dias: 7, ...((cfg && cfg.valor) || {}) };
valor.bonus = { curso_id: curso.id, arquivo_ids: [arquivo.id], titulo: 'Modelos prontos', texto: '4 estilos de carrossel do curso, prontos para editar.', modelos };
await rest('/config?on_conflict=chave', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ chave: 'conquista', valor }) });
console.log(`config.conquista: ${valor.ligada ? 'ligada' : 'desligada'}, ${valor.dias} dias, bônus com ${modelos.length} modelos`);
