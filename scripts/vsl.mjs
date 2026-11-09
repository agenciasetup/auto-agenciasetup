// A VSL do mini curso: sobe Curso/videos/aula-vsl.mp4 para o Bunny (biblioteca do curso), espera converter,
// tira a capa de um quadro da abertura, guarda a capa no bucket público `midia` e põe vídeo e capa no topo da
// página de venda (landing `posts-automaticos`), na imagem do produto e no anúncio do curso dentro do site.
//   node scripts/vsl.mjs                  sobe (ou reaproveita a que já subiu) e atualiza a página
//   node scripts/vsl.mjs --refazer        apaga a VSL antiga no Bunny e sobe de novo (depois de refazer o vídeo)
//   --capa-em 2.6                         segundo do vídeo usado como capa (padrão 2.6: título sem a notificação)
//   --en                                  a VSL do curso em inglês (Curso/videos-en/aula-vsl.mp4, landing `posts-on-autopilot`)
// Para refazer o vídeo: em Curso, `.\_ferramentas\produzir.ps1 vsl tudo` (roteiro em Curso/aulas/vsl/aula.js).
// A chave do Bunny vem cifrada do banco (Integrações > Bunny Stream) e nunca é impressa.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decifrar } from '../worker/nucleo/cripto.js';
import { env, raiz, sql } from './env.mjs';

const args = process.argv.slice(2);
const opc = (n, padrao) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : padrao; };
const EN = args.includes('--en');
const VIDEO = join(raiz, 'Curso', EN ? 'videos-en' : 'videos', 'aula-vsl.mp4');
const CAPA = join(tmpdir(), EN ? 'vsl-capa-en.jpg' : 'vsl-capa.jpg');
const LANDING = EN ? 'posts-on-autopilot' : 'posts-automaticos';
const TITULO = EN ? 'VSL · Posts on Autopilot with Claude' : 'VSL · Posts automáticos com Claude';
const ROTULO = EN ? 'Watch the course in 2 minutes' : 'Veja o curso em 3 minutos';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const [l] = await sql(`select valor from config where chave = 'bunny'`);
if (!l || !l.valor || !l.valor.chave) { console.log('Falta a chave do Bunny em Integrações > Bunny Stream.'); process.exit(1); }
const chave = (await decifrar(env, l.valor.chave)).valor;
const lib = l.valor.biblioteca;
const api = async (caminho, op = {}) => {
  const r = await fetch(`https://video.bunnycdn.com/library/${lib}${caminho}`, { ...op, headers: { AccessKey: chave, accept: 'application/json', ...(op.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`Bunny ${r.status} em ${caminho}: ${t.slice(0, 160)}`);
  return t ? JSON.parse(t) : null;
};

// 1. o vídeo no Bunny
const lista = await api(`/videos?search=${encodeURIComponent('VSL')}&itemsPerPage=20`);
let v = (lista.items || []).find((x) => x.title === TITULO);
if (v && args.includes('--refazer')) { await api(`/videos/${v.guid}`, { method: 'DELETE' }); v = null; }
if (!v) {
  v = await api('/videos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: TITULO }) });
  console.log(`enviando ${(statSync(VIDEO).size / 1e6).toFixed(1)} MB…`);
  await api(`/videos/${v.guid}`, { method: 'PUT', headers: { 'content-type': 'application/octet-stream' }, body: readFileSync(VIDEO) });
}
let duracao = null;
for (let i = 0; ; i++) {
  const s = await api(`/videos/${v.guid}`);
  if (s.status === 4) { duracao = Math.round(s.length); console.log(`pronto no Bunny: ${v.guid} (${Math.round(s.length)} s)`); break; }
  if (s.status === 5 || s.status === 6 || i > 90) throw new Error('o Bunny não terminou de converter o vídeo');
  await espera(10000);
}

// 2. a capa
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(opc('--capa-em', '2.6')), '-i', VIDEO, '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '3', CAPA]);
const caminho = `curso/${LANDING}/vsl-capa.jpg`;
const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/midia/${caminho}`, { method: 'POST', headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, 'content-type': 'image/jpeg', 'x-upsert': 'true', 'cache-control': '3600' }, body: readFileSync(CAPA) });
if (!r.ok) throw new Error(`capa: ${r.status} ${(await r.text()).slice(0, 160)}`);
const capa = `${env.SUPABASE_URL}/storage/v1/object/public/midia/${caminho}?v=${Date.now().toString(36)}`;

// 3. página de venda, produto e anúncio
const [lp] = await sql(`select id, produto_id, blocos from landing_pages where slug = '${LANDING}'`);
if (!lp) throw new Error(`landing ${LANDING} não encontrada`);
const blocos = lp.blocos.map((b) => (b.tipo === 'heroi' ? { ...b, video: v.guid, video_capa: capa, video_duracao_s: duracao || b.video_duracao_s, video_rotulo: b.video_rotulo || ROTULO } : b));
await sql(`update landing_pages set blocos = $j$${JSON.stringify(blocos)}$j$::jsonb where id = '${lp.id}'`);
if (lp.produto_id) {
  await sql(`update produtos set imagem_url = '${capa}' where id = '${lp.produto_id}'`);
  await sql(`update anuncios set imagem_url = '${capa}' where produto_id = '${lp.produto_id}'`);
}
console.log(`página de venda com a VSL e a capa nova (${capa})`);
