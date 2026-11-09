// Vídeos das aulas no Bunny Stream. A chave nunca passa pelo chat nem pelo terminal: vem do .env.local (BUNNY_CHAVE)
// ou da integração guardada no painel (Integrações > Bunny Stream, cifrada no banco; abre com a CRIPTO_CHAVE do .env.local).
//   node scripts/bunny.mjs situacao            cada aula do curso e o vídeo dela no Bunny (enviado, convertendo, pronto)
//   node scripts/bunny.mjs subir [1.1 2.3]     sobe Curso/videos/aula-<código>.mp4 das aulas sem vídeo no Bunny e grava o id na aula
//                          --refazer           sobe de novo mesmo quem já tem vídeo: a aula segue com o antigo até o novo
//                                              terminar de converter, e só então troca (o antigo fica no Bunny; apague lá se quiser)
//   node scripts/bunny.mjs dev                 grava BUNNY_BIBLIOTECA e BUNNY_TOKEN no .dev.vars (para testar o player no computador)
//   node scripts/bunny.mjs vsl --curso <slug>  sobe <pasta>/vsl.mp4 como a VSL do curso, espera converter e mostra o id
//                                              (não mexe na VSL do curso de posts, que é do scripts/vsl.mjs)
//   --curso <slug>                             padrão: posts-automaticos-com-claude
//   --pasta <pasta>                            onde estão os MP4 (aula-<código>.mp4). Padrão: Curso/videos; no curso
//                                              videos-com-claude, Curso-Videos/videos
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { decifrar } from '../worker/nucleo/cripto.js';
import { env, exige, raiz } from './env.mjs';

// O banco pela API com a chave secreta (a mesma do Worker). Antes ia pela API de gestão (SUPABASE_ACCESS_TOKEN), que
// parou quando o token foi trocado em 29/10/2026.
exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY');
async function rest(caminho, opcoes = {}) {
  const k = env.SUPABASE_SECRET_KEY;
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1${caminho}`, { ...opcoes, headers: { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': 'application/json', ...(opcoes.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`banco ${caminho.split('?')[0]} ${r.status}: ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}
const cursoPeloSlug = async (slug) => (await rest(`/cursos?slug=eq.${encodeURIComponent(slug)}&select=id,titulo`))[0] || null;
const trocarVideo = (aulaId, guid) => rest(`/aulas?id=eq.${aulaId}`, { method: 'PATCH', body: JSON.stringify({ video_bunny: guid }) });

const args = process.argv.slice(2);
const cmd = args[0] || 'situacao';
const opc = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const CURSO = opc('--curso') || 'posts-automaticos-com-claude';
const PASTA_DO_CURSO = { 'videos-com-claude': join('Curso-Videos', 'videos'), 'posts-on-autopilot': join('Curso', 'videos-en'), 'videos-with-claude': join('Curso-Videos', 'videos-en') };
const PASTA = ((p) => (isAbsolute(p) ? p : join(raiz, p)))(opc('--pasta') || PASTA_DO_CURSO[CURSO] || join('Curso', 'videos'));
const codigos = args.slice(1).filter((a, i, l) => !a.startsWith('--') && !['--curso', '--pasta'].includes(l[i - 1]));

async function config() {
  if (env.BUNNY_CHAVE && env.BUNNY_BIBLIOTECA) return { chave: env.BUNNY_CHAVE, biblioteca: env.BUNNY_BIBLIOTECA, token: env.BUNNY_TOKEN || null };
  const [linha] = await rest('/config?chave=eq.bunny&select=valor');
  const v = linha && linha.valor;
  if (!v || !v.chave || !v.biblioteca) {
    console.log('Falta a chave do Bunny: cole em Integrações > Bunny Stream no painel (ou BUNNY_CHAVE e BUNNY_BIBLIOTECA no .env.local).');
    process.exit(1);
  }
  const abrir = async (c) => (c ? (await decifrar(env, c)).valor : null);
  return { chave: await abrir(v.chave), biblioteca: String(v.biblioteca), token: await abrir(v.token) };
}

const ESTADO = { 0: 'criado', 1: 'enviado', 2: 'processando', 3: 'convertendo', 4: 'pronto', 5: 'erro', 6: 'erro no envio', 7: 'convertendo', 8: 'convertendo' };
function api(c) {
  return async (caminho, opcoes = {}) => {
    const r = await fetch(`https://video.bunnycdn.com/library/${c.biblioteca}${caminho}`, { ...opcoes, headers: { AccessKey: c.chave, accept: 'application/json', ...(opcoes.headers || {}) } });
    const t = await r.text();
    if (!r.ok) throw new Error(`Bunny ${r.status} em ${caminho}: ${t.slice(0, 200)}`);
    return t ? JSON.parse(t) : null;
  };
}

async function aulasDoCurso() {
  const curso = await cursoPeloSlug(CURSO);
  return curso ? rest(`/aulas?curso_id=eq.${curso.id}&select=id,codigo,titulo,video_bunny,ordem&order=ordem.asc`) : [];
}

if (cmd === 'dev') {
  const c = await config();
  const arq = join(raiz, '.dev.vars');
  let linhas = (existsSync(arq) ? readFileSync(arq, 'utf8') : '').replace(/^﻿/, '').split(/\r?\n/).filter((l) => !/^BUNNY_(BIBLIOTECA|TOKEN)=/.test(l));
  while (linhas.length && !linhas[linhas.length - 1]) linhas.pop();
  linhas.push(`BUNNY_BIBLIOTECA=${c.biblioteca}`);
  if (c.token) linhas.push(`BUNNY_TOKEN=${c.token}`);
  writeFileSync(arq, `${linhas.join('\n')}\n`);
  console.log(`.dev.vars: BUNNY_BIBLIOTECA${c.token ? ' e BUNNY_TOKEN' : ''} gravados. Religue o npm run dev:curso.`);
  process.exit(0);
}

const c = await config();
const bunny = api(c);

// Uma coleção por curso, para organizar no painel do Bunny.
async function colecaoDoCurso() {
  const nome = (await cursoPeloSlug(CURSO)).titulo;
  const colecoes = await bunny('/collections?page=1&itemsPerPage=100');
  return (colecoes.items || []).find((x) => x.name === nome) || bunny('/collections', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: nome }) });
}

if (cmd === 'vsl') {
  if (CURSO === 'posts-automaticos-com-claude') { console.log('A VSL do curso de posts sobe pelo scripts/vsl.mjs.'); process.exit(1); }
  const curso = await cursoPeloSlug(CURSO);
  if (!curso) { console.log(`Curso ${CURSO} não encontrado.`); process.exit(1); }
  const arquivo = join(PASTA, 'vsl.mp4');
  if (!existsSync(arquivo)) { console.log(`Não achei ${arquivo}`); process.exit(1); }
  const titulo = `VSL · ${curso.titulo}`;
  const lista = await bunny(`/videos?search=${encodeURIComponent('VSL')}&itemsPerPage=50`);
  let v = (lista.items || []).find((x) => x.title === titulo);
  if (v && args.includes('--refazer')) { await bunny(`/videos/${v.guid}`, { method: 'DELETE' }); v = null; }
  if (!v) {
    const colecao = await colecaoDoCurso();
    v = await bunny('/videos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: titulo, collectionId: colecao.guid }) });
    console.log(`enviando ${(statSync(arquivo).size / 1048576).toFixed(1)} MB...`);
    await bunny(`/videos/${v.guid}`, { method: 'PUT', headers: { 'content-type': 'application/octet-stream' }, body: readFileSync(arquivo) });
  } else console.log('A VSL já está no Bunny (use --refazer para mandar de novo).');
  for (let i = 0; ; i++) {
    const s = await bunny(`/videos/${v.guid}`);
    if (s.status === 4) { console.log(`VSL pronta no Bunny: ${v.guid} (${Math.round(s.length)} s)\nGrave na oferta: node scripts/area-semente-videos.mjs --vsl ${v.guid}`); break; }
    if ([5, 6].includes(s.status) || i > 90) { console.log(`O Bunny não terminou de converter (${ESTADO[s.status] || s.status}): ${v.guid}`); process.exit(1); }
    await new Promise((r) => setTimeout(r, 10_000));
  }
  process.exit(0);
}

const aulas = await aulasDoCurso();
if (!aulas.length) { console.log(`Nenhuma aula no curso ${CURSO}.`); process.exit(1); }

if (cmd === 'situacao') {
  const lista = await bunny('/videos?page=1&itemsPerPage=100');
  const porId = new Map((lista.items || []).map((v) => [v.guid, v]));
  console.log(`biblioteca ${c.biblioteca}: ${lista.totalItems} vídeos\n`);
  for (const a of aulas) {
    const v = a.video_bunny ? porId.get(a.video_bunny) : null;
    const quanto = v ? `${ESTADO[v.status] || v.status}${v.status !== 4 && v.encodeProgress ? ` ${v.encodeProgress}%` : ''}${v.length ? ` · ${Math.floor(v.length / 60)}:${String(v.length % 60).padStart(2, '0')}` : ''}` : a.video_bunny ? 'id na aula, mas não está no Bunny' : 'sem vídeo no Bunny';
    console.log(`${a.codigo.padEnd(5)} ${quanto.padEnd(28)} ${a.titulo}`);
  }
  process.exit(0);
}

if (cmd === 'subir') {
  const refazer = args.includes('--refazer');
  const alvo = aulas.filter((a) => (!codigos.length || codigos.includes(a.codigo)) && (refazer || !a.video_bunny));
  if (!alvo.length) { console.log('Nada para subir (use --refazer para mandar de novo).'); process.exit(0); }
  const colecao = await colecaoDoCurso();
  let ok = 0;
  const trocas = [];
  for (const a of alvo) {
    const arquivo = join(PASTA, `aula-${a.codigo}.mp4`);
    if (!existsSync(arquivo)) { console.log(`${a.codigo}: não achei ${arquivo}`); continue; }
    const mb = (statSync(arquivo).size / 1048576).toFixed(1);
    process.stdout.write(`${a.codigo} (${mb} MB): criando... `);
    const v = await bunny('/videos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: `${a.codigo} ${a.titulo}`, collectionId: colecao.guid }) });
    process.stdout.write('enviando... ');
    const t0 = Date.now();
    // Envio grande às vezes cai no meio (29/10: "Headers Timeout" no 6º vídeo): tenta de novo no mesmo vídeo, até 3 vezes.
    for (let tentativa = 1; ; tentativa++) {
      try { await bunny(`/videos/${v.guid}`, { method: 'PUT', headers: { 'content-type': 'application/octet-stream' }, body: readFileSync(arquivo) }); break; }
      catch (e) { if (tentativa === 3) throw e; process.stdout.write(`caiu (${(e.cause && e.cause.code) || e.message}), de novo... `); await new Promise((r) => setTimeout(r, 10_000)); }
    }
    // Aula que já tem vídeo no ar só troca quando o novo estiver convertido: o aluno nunca fica sem vídeo.
    if (a.video_bunny) trocas.push({ a, guid: v.guid });
    else await trocarVideo(a.id, v.guid);
    ok++;
    console.log(`ok em ${Math.round((Date.now() - t0) / 1000)} s (${v.guid})`);
  }
  console.log(`\n${ok} de ${alvo.length} enviados.`);
  if (trocas.length) {
    console.log(`Esperando o Bunny converter ${trocas.length} para trocar nas aulas (até 1 hora)...`);
    const ate = Date.now() + 60 * 60_000;
    while (trocas.length && Date.now() < ate) {
      for (const t of [...trocas]) {
        const v = await bunny(`/videos/${t.guid}`);
        if (v.status === 4) await trocarVideo(t.a.id, t.guid);
        if ([4, 5, 6].includes(v.status)) {
          trocas.splice(trocas.indexOf(t), 1);
          console.log(v.status === 4 ? `${t.a.codigo}: pronto e trocado na aula` : `${t.a.codigo}: o Bunny deu ${ESTADO[v.status]}; a aula segue com o vídeo antigo`);
        }
      }
      if (trocas.length) await new Promise((r) => setTimeout(r, 20_000));
    }
    for (const t of trocas) console.log(`${t.a.codigo}: ainda convertendo (${t.guid}); a aula segue com o vídeo antigo`);
  } else console.log('O Bunny converte cada vídeo em alguns minutos: node scripts/bunny.mjs situacao');
  process.exit(0);
}

console.log('Comandos: situacao, subir [códigos] [--refazer], vsl, dev (com --curso <slug> e --pasta <pasta>)');
