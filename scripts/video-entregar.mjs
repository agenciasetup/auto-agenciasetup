// Entrega um vídeo curto (Reels) do setor de vídeo como RASCUNHO na fila: sobe o MP4 e a capa para o bucket "midia" e
// cria a peça com o "Comenta X". Não aprova, não agenda, não publica.
//   node scripts/video-entregar.mjs <pasta> [--simular] [--atualizar]
// <pasta> tem um peca.json (por costume em _local/video/<nome>/, fora do Git):
//   { "titulo", "slug", "perfil": "br"|"en", "video": "caminho do .mp4", "capa": "caminho do .jpg", "alt", "legenda",
//     "roteiro": "as falas" (ou "video_js": caminho do video.js do estúdio, de onde as falas são lidas),
//     "recurso_id": id do material grátis que a palavra manda (opcional; sem ele, use comenta.link),
//     "comenta": { palavra, nome, modo, estrategia, link?, responder_publico, resposta_ia, variantes } }
// Os caminhos valem a partir da raiz do projeto. O resultado fica em <pasta>/entrega.json, para não duplicar a peça.
// --simular confere tudo e não sobe nem cria nada. --atualizar sobe de novo e troca o vídeo, a capa e a legenda da peça.
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import vm from 'node:vm';
import { env, raiz } from './env.mjs';

const args = process.argv.slice(2);
const pasta = args.find((a) => !a.startsWith('--'));
const simular = args.includes('--simular');
const atualizar = args.includes('--atualizar');
if (!pasta) { console.error('uso: node scripts/video-entregar.mjs <pasta> [--simular] [--atualizar]'); process.exit(1); }
const dir = resolve(raiz, pasta);
const arqPeca = join(dir, 'peca.json');
if (!existsSync(arqPeca)) { console.error(`Não achei ${arqPeca}`); process.exit(1); }
const P = JSON.parse(readFileSync(arqPeca, 'utf8'));
const caminho = (c) => (isAbsolute(c) ? c : resolve(raiz, c));

// ---------------------------------------------------------------- conferência (vale também para --simular)
const erros = [];
const TRAVESSAO = /[—–]/;
for (const campo of ['titulo', 'slug', 'video', 'capa', 'legenda', 'comenta']) if (!P[campo]) erros.push(`Falta "${campo}" no peca.json.`);
const perfil = P.perfil === 'en' ? 'en' : 'br';
const video = P.video ? caminho(P.video) : '';
const capa = P.capa ? caminho(P.capa) : '';
if (video && !existsSync(video)) erros.push(`O vídeo não existe: ${video}`);
if (capa && !existsSync(capa)) erros.push(`A capa não existe: ${capa}`);
const mb = video && existsSync(video) ? statSync(video).size / 1048576 : 0;
if (mb > 50) erros.push(`O vídeo tem ${mb.toFixed(1)} MB e o limite é 50 MB. Reencode com libx264 antes.`);
if (video && !/\.(mp4|mov)$/i.test(video)) erros.push('O vídeo precisa ser .mp4 ou .mov.');
if (P.slug && !/^[a-z0-9-]{3,60}$/.test(P.slug)) erros.push('O slug só leva letras minúsculas, números e hífen.');
if (P.legenda && TRAVESSAO.test(P.legenda)) erros.push('A legenda tem travessão.');
const c = P.comenta || {};
if (P.comenta) {
  if (!c.palavra) erros.push('Falta a palavra do Comenta X.');
  if (!P.recurso_id && !c.link) erros.push('O Comenta X precisa de um material: "recurso_id" no peca.json ou "link" dentro de "comenta".');
  for (const v of c.variantes || []) for (const t of [v.dm, v.pergunta, v.depois, ...(v.publico || [])]) if (t && TRAVESSAO.test(t)) erros.push(`A versão ${v.id} da mensagem tem travessão.`);
  if (P.legenda && c.palavra && !P.legenda.toUpperCase().includes(String(c.palavra).toUpperCase())) erros.push(`A legenda não pede a palavra ${c.palavra}.`);
}
let roteiro = P.roteiro || '';
if (!roteiro && P.video_js) {
  try {
    const ctx = { window: {} };
    vm.runInNewContext(readFileSync(caminho(P.video_js), 'utf8'), ctx);
    roteiro = (ctx.window.AULA.falas || []).map((f) => f.texto).join('\n');
  } catch (e) { erros.push(`Não consegui ler as falas de ${P.video_js}: ${e.message}`); }
}
if (!roteiro) erros.push('Falta o roteiro ("roteiro" ou "video_js").');

console.log(`${P.titulo || '(sem título)'}: perfil ${perfil}, vídeo de ${mb.toFixed(1)} MB, palavra ${c.palavra || '?'}, ${P.recurso_id ? `material ${P.recurso_id}` : `link ${c.link || '?'}`}, ${(c.variantes || []).length} versão(ões) da mensagem, roteiro com ${roteiro.split('\n').filter(Boolean).length} falas.`);
if (erros.length) { for (const e of erros) console.error('ERRO:', e); process.exit(1); }
if (simular) { console.log('Simulação: está tudo certo para entregar. Nada foi enviado.'); process.exit(0); }

// ---------------------------------------------------------------- envio
async function chamar(name, argumentos) {
  const r = await fetch('https://agenciasetup.com.br/mcp/ferramentas', { // /mcp é o modo código desde 09/11/2026
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${env.MCP_CHAVE}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: argumentos } }),
  });
  const t = await r.text();
  const linha = t.split('\n').find((l) => l.startsWith('data:'));
  const j = JSON.parse(linha ? linha.slice(5) : t);
  const bloco = j.result && j.result.content && j.result.content[0];
  if (j.error || (j.result && j.result.isError)) throw new Error(`${name}: ${bloco ? bloco.text : JSON.stringify(j.error)}`);
  try { return JSON.parse(bloco.text); } catch { return bloco.text; }
}
// O vídeo é grande demais para o conector: sobe direto no bucket "midia" do Supabase.
async function subir(arq, nome, tipo) {
  const k = env.SUPABASE_SECRET_KEY;
  const destino = `reels-${perfil === 'en' ? 'en' : 'pt'}/${nome}`;
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/midia/${destino}`, {
    method: 'POST', headers: { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': tipo, 'x-upsert': 'true' }, body: readFileSync(arq),
  });
  if (!r.ok) throw new Error(`envio de ${destino}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return `${env.SUPABASE_URL}/storage/v1/object/public/midia/${destino}`;
}

const arqEntrega = join(dir, 'entrega.json');
const feito = existsSync(arqEntrega) ? JSON.parse(readFileSync(arqEntrega, 'utf8')) : {};
const gravar = () => writeFileSync(arqEntrega, JSON.stringify(feito, null, 1));
const v = Date.now().toString(36);
if (!feito.video || atualizar) { feito.video = await subir(video, `${P.slug}-${v}.mp4`, 'video/mp4'); gravar(); console.log('vídeo no ar:', feito.video); }
if (!feito.capa || atualizar) { feito.capa = await subir(capa, `${P.slug}-capa-${v}.jpg`, 'image/jpeg'); gravar(); console.log('capa no ar:', feito.capa); }
const midias = [{ tipo: 'video', url: feito.video, alt: P.alt || P.titulo }];
const opcoes = { capa_url: feito.capa, ...(P.opcoes || {}) };
if (!feito.peca_id) {
  const origem = P.recurso_id ? { origem_tipo: 'recurso', origem_id: P.recurso_id } : { origem_tipo: 'livre' };
  const r = await chamar('criar_pecas', { perfil, ...origem, pecas: [{ rede: 'instagram', formato: 'reels', titulo: P.titulo, legenda: P.legenda, midias, opcoes, roteiro, comenta: P.comenta }] });
  const peca = (r.pecas || [r])[0];
  feito.peca_id = peca.id; feito.avisos = r.avisos || null; gravar();
  console.log(`peça criada como rascunho: ${peca.id}${r.avisos ? ` (avisos: ${JSON.stringify(r.avisos)})` : ''}`);
} else if (atualizar) {
  await chamar('editar_peca', { id: feito.peca_id, titulo: P.titulo, roteiro, legenda: P.legenda, midias, opcoes });
  console.log('peça atualizada:', feito.peca_id);
} else console.log('a peça já existia:', feito.peca_id, '(use --atualizar para trocar o vídeo)');
console.log(`No painel: https://agenciasetup.com.br/admin/posts/${feito.peca_id}`);
