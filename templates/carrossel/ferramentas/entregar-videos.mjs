// Põe vídeo em slides de um carrossel já entregue (capa animada, chamada animada): sobe <NN>.mp4 de
// _local/carrossel/<conteudo>/ direto no bucket "midia" (o conector não aceita arquivo grande) e troca a peça com
// slides[k].video_url, mantendo a imagem parada (imagem_url) para a miniatura do painel. Não aprova nem agenda.
// Uso: node templates/carrossel/ferramentas/entregar-videos.mjs <conteudo> <slide> [slide...]
// Rode depois do `entregar.mjs <conteudo> --atualizar` (que sobe as imagens e grava a peça).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const raiz = join(import.meta.dirname, '..', '..', '..');
const [nome, ...nums] = process.argv.slice(2);
if (!nome || !nums.length) { console.log('Uso: node templates/carrossel/ferramentas/entregar-videos.mjs <conteudo> <slide> [slide...]'); process.exit(1); }
const env = Object.fromEntries(readFileSync(join(raiz, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const chave = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const pasta = join(raiz, '_local', 'carrossel', nome);
const feito = JSON.parse(readFileSync(join(pasta, 'entrega.json'), 'utf8'));
if (!feito.peca_id) throw new Error('Sem peça em entrega.json: rode o entregar.mjs antes.');

let n = 0, iniciado = false;
async function mcp(method, params = {}) {
  const r = await fetch('https://agenciasetup.com.br/mcp/ferramentas', { // /mcp é o modo código desde 09/11/2026
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${env.MCP_CHAVE}` }, body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method, params }) });
  const t = await r.text();
  const linha = t.split('\n').find((l) => l.startsWith('data:'));
  return JSON.parse(linha ? linha.slice(5) : t);
}
async function chamar(ferramenta, args) {
  if (!iniciado) { await mcp('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'entregar-videos', version: '1' } }); iniciado = true; }
  const r = await mcp('tools/call', { name: ferramenta, arguments: args });
  const c = r.result && r.result.content && r.result.content[0];
  if (r.error || (r.result && r.result.isError)) throw new Error(`${ferramenta}: ${c ? c.text : JSON.stringify(r.error)}`);
  try { return JSON.parse(c.text); } catch { return c.text; }
}

const peca = await chamar('ler', { tipo: 'pecas', id: feito.peca_id });
const slides = peca.slides.map((s) => ({ ...s }));
const versao = Date.now().toString(36);
const mes = new Date().toISOString().slice(0, 7);
for (const num of nums) {
  const NN = String(num).padStart(2, '0');
  const arq = join(pasta, `${NN}.mp4`);
  if (!existsSync(arq)) throw new Error(`Falta ${arq}`);
  const caminho = `${mes}/${crypto.randomUUID().slice(0, 8)}-carrossel-${nome}-${versao}-${NN}.mp4`;
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/midia/${caminho}`, { method: 'POST', headers: { Authorization: `Bearer ${chave}`, apikey: chave, 'Content-Type': 'video/mp4', 'x-upsert': 'false' }, body: readFileSync(arq) });
  if (!r.ok) throw new Error(`Envio do ${NN}.mp4: ${r.status} ${await r.text()}`);
  const url = `${env.SUPABASE_URL}/storage/v1/object/public/midia/${caminho}`;
  slides[Number(num) - 1].video_url = url;
  console.log(`slide ${num}: vídeo no ar em ${url}`);
}
await chamar('editar_peca', { id: feito.peca_id, slides });
const depois = await chamar('ler', { tipo: 'pecas', id: feito.peca_id });
console.log(`peça ${feito.peca_id} (${depois.status}): ${depois.slides.filter((s) => s.video_url).length} slide(s) com vídeo`);
