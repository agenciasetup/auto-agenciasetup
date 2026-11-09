// Monta (ou atualiza) o complemento em inglês "Videos with Claude" (pedido do dono em 30/10/2026), a partir de
// Curso-Videos/aulas-en, videos-en, o estúdio (en-aula-<n>) e o Videos-with-Claude-Kit.zip (scripts/videos-v4.mjs).
// É o "Vídeos com Claude" em inglês, no mesmo endereço do curso de posts em inglês (agenciasetup.com, marca de idioma "en"):
// o app em inglês mostra os dois cursos para quem tem os dois (marcas.js: um endereço, vários cursos).
// Pode rodar de novo: acha cada coisa pelo seu código (curso pelo slug, módulo pelo número, aula pelo código, arquivo pelo
// nome) e atualiza no lugar, sem apagar progresso de ninguém. Só entram as aulas que já têm o MP4.
// O que nasce desligado fica como o dono deixar: o curso nasce em rascunho e o produto e a oferta nascem desligados; se já
// existem, este script não publica, não liga e não muda preço nem texto de venda. A etiqueta nas aulas do curso de posts
// em inglês (checkout.etiqueta) e o bump no checkout dele (checkout.bump_em) moram na oferta e só aparecem com ela ligada.
// Uso: node scripts/area-semente-videos-en.mjs             curso, módulos, aulas com vídeo, kit, produto e oferta
//      node scripts/area-semente-videos-en.mjs --sem-kit   não sobe o kit de novo
//      node scripts/area-semente-videos-en.mjs --vsl <id>  grava o id da mini VSL (Bunny) na etiqueta das aulas
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env, exige, raiz } from './env.mjs';
import { KIT_ZIP_EN, lerCurso } from './videos-v4.mjs';

exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY');
const SLUG = 'videos-with-claude';
const COR = '#8b5cf6';
const KIT = 'Videos-with-Claude-Kit.zip';
const MARCA = { nome: 'Videos with Claude', dominio: 'agenciasetup.com', tema: 'video', idioma: 'en' };
const PRECO = 1200; // US$ 12 (dono, 30/10/2026); é falado na mini VSL. Só vale para o que ainda não existe
const k = env.SUPABASE_SECRET_KEY;
const H = { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': 'application/json' };

async function rest(caminho, opcoes = {}) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1${caminho}`, { ...opcoes, headers: { ...H, Prefer: 'return=representation', ...(opcoes.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${caminho} ${r.status}: ${t.slice(0, 400)}`);
  return t ? JSON.parse(t) : null;
}
const um = async (tabela, filtro) => (await rest(`/${tabela}?${filtro}&limit=1`))[0] || null;
const criar = async (tabela, dados) => (await rest(`/${tabela}`, { method: 'POST', body: JSON.stringify(dados) }))[0];
const mudar = async (tabela, id, dados) => (await rest(`/${tabela}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(dados) }))[0];
async function salvar(tabela, filtro, dados) {
  const atual = await um(tabela, filtro);
  return atual ? mudar(tabela, atual.id, dados) : criar(tabela, dados);
}
async function subir(bucket, caminho, corpo, tipo) {
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${bucket}/${caminho.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST', headers: { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': tipo, 'x-upsert': 'true' }, body: corpo,
  });
  if (!r.ok) throw new Error(`upload ${bucket}/${caminho} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return `${env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${caminho}`;
}

// ---------------------------------------------------------------- só a VSL
const iVsl = process.argv.indexOf('--vsl');
if (iVsl > 0) {
  const id = String(process.argv[iVsl + 1] || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) { console.log('Passe o id do vídeo no Bunny (36 letras e números, com hífens).'); process.exit(1); }
  const o = await um('ofertas', `slug=eq.${SLUG}`);
  if (!o) { console.log('A oferta ainda não existe: rode o script sem --vsl primeiro.'); process.exit(1); }
  const c = o.checkout || {};
  await mudar('ofertas', o.id, { checkout: { ...c, etiqueta: { ...(c.etiqueta || {}), vsl_bunny: id } } });
  console.log(`VSL gravada na etiqueta. A oferta segue ${o.ativa ? 'ligada' : 'desligada'}.`);
  process.exit(0);
}

// ---------------------------------------------------------------- o curso
const { aulas, modulos: MODULOS } = lerCurso('en');
const prontas = aulas.filter((a) => a.mp4);
const faltam = aulas.filter((a) => !a.mp4).map((a) => a.codigo);
if (faltam.length) console.log(`Aulas ainda sem vídeo em inglês (ficam para a próxima vez): ${faltam.join(', ')}`);

const tmp = join(raiz, '_local', 'area-semente-videos-en');
mkdirSync(tmp, { recursive: true });
// A capa de cada aula: um quadro do começo do vídeo (o título da aula na tela).
async function capaDe(a) {
  const jpg = join(tmp, `aula-${a.codigo}.jpg`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '2.2', '-i', a.mp4, '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '3', jpg]);
  return subir('midia', `curso/${SLUG}/aula-${a.codigo}.jpg`, readFileSync(jpg), 'image/jpeg');
}

const DADOS_CURSO = {
  titulo: 'Videos with Claude', subtitulo: 'From the video you shot to a finished Reel, edited by Claude.',
  descricao: 'Edit the video you shot on your phone with Claude: cut pauses and mistakes, make it vertical following your face, zoom, color, background, captions, music and several Reels from one long video. Make videos in code, which is motion, and put a screenshot or motion on top of what you say.\n\nClaude looks at the video through a contact sheet and the transcript, without watching it, which saves tokens. It also studies YouTube tutorials and Instagram Reels through Claude in Chrome, only reading, so you can copy the pace of people who already hold attention. The kit has the recipes, the tools and the ready-made prompts for each lesson.',
  cor: COR, certificado_pct: 70, marca: MARCA, tags: ['claude', 'video', 'reels', 'youtube'],
};
const cursoAtual = await um('cursos', `slug=eq.${SLUG}`);
const curso = cursoAtual ? await mudar('cursos', cursoAtual.id, DADOS_CURSO) : await criar('cursos', { slug: SLUG, ...DADOS_CURSO, status: 'rascunho' });
console.log('curso', curso.slug, curso.status);

const idModulo = {};
for (const m of MODULOS) idModulo[m.numero] = (await salvar('modulos', `curso_id=eq.${curso.id}&numero=eq.${m.numero}`, { curso_id: curso.id, numero: m.numero, titulo: m.titulo, ordem: m.numero })).id;
const idAula = {};
for (const a of prontas) {
  const capa_url = await capaDe(a);
  const atual = await um('aulas', `curso_id=eq.${curso.id}&codigo=eq.${a.codigo}`);
  const dados = { modulo_id: idModulo[a.modulo.numero], titulo: a.titulo, ordem: a.n, duracao_s: a.duracao_s, capa_url, ...a.area };
  idAula[a.codigo] = (atual ? await mudar('aulas', atual.id, dados) : await criar('aulas', { curso_id: curso.id, codigo: a.codigo, status: 'publicado', gratis: false, ...dados })).id;
  process.stdout.write(`${a.codigo} `);
}
console.log(`\naulas com vídeo: ${prontas.length} de ${aulas.length}`);
if (idAula['1']) await mudar('cursos', curso.id, { capa_url: (await um('aulas', `id=eq.${idAula['1']}`)).capa_url });

// ---------------------------------------------------------------- o kit (bucket privado "curso")
if (!process.argv.includes('--sem-kit')) {
  if (!existsSync(KIT_ZIP_EN)) throw new Error(`Falta ${KIT_ZIP_EN}`);
  const corpo = readFileSync(KIT_ZIP_EN);
  const caminho = `${SLUG}/${KIT}`;
  await subir('curso', caminho, corpo, 'application/zip');
  const aula1 = idAula['1'] || (await um('aulas', `curso_id=eq.${curso.id}&codigo=eq.1`) || {}).id || null;
  await salvar('arquivos', `curso_id=eq.${curso.id}&nome=eq.${encodeURIComponent(KIT)}`, {
    curso_id: curso.id, aula_id: aula1, nome: KIT, tipo: 'pacote',
    o_que: 'The whole kit in one folder: recipes 01 to 11, the videos-with-claude skill, the editing tools, the motion engine with the Reels templates, the ready-made prompts for each lesson and the errors and fixes.',
    quando: 'In lesson 1. Download it, unzip it and keep the folder in Documents.',
    como: ['Download the file.', 'Unzip it (double-click on a Mac; on Windows, right-click and Extract All).', 'Move the Videos-with-Claude folder to Documents and open it in Claude (Code tab).'],
    tempo: '2 min', previa: null, origem: 'storage', caminho, bytes: corpo.length, versao: new Date().toISOString().slice(0, 10).split('-').reverse().join('/'), ordem: 0,
  });
  console.log(`kit ${KIT} (${Math.round(corpo.length / 1024)} KB)`);
}

// ---------------------------------------------------------------- produto, acesso e oferta (nascem desligados; se existem, ficam)
const produto = await um('produtos', `slug=eq.${SLUG}`) || await criar('produtos', {
  slug: SLUG, nome: 'Videos with Claude', chamada: DADOS_CURSO.subtitulo,
  descricao: 'Add-on mini course with 12 lessons of about 6 minutes and the kit to edit the video you shot with Claude, make motion and study references.',
  preco_centavos: PRECO, ativo: false, tags: ['claude', 'video', 'reels', 'youtube'],
});
if (!(await um('produto_acessos', `produto_id=eq.${produto.id}&curso_id=eq.${curso.id}`))) await criar('produto_acessos', { produto_id: produto.id, curso_id: curso.id, dias: 365 });
// A etiqueta em cima dos vídeos do curso de posts em inglês e o bump no checkout dele (vendas.js, vitrine.js).
const ETIQUETA = {
  cursos: ['posts-on-autopilot'], rotulo: 'Video and voice made with AI', acao: 'Learn', vsl_bunny: null,
  texto: 'See this video? Claude made it. Every move and every scene is code. Want to learn how to make videos like this and edit the ones you record?',
};
const BUMP_EM = [{
  oferta: 'posts-on-autopilot', titulo: 'Add: Videos with Claude',
  texto: 'Edit the videos you record with Claude and make videos like the lessons in this course. 12 lessons and the kit.',
}];
let oferta = await um('ofertas', `slug=eq.${SLUG}`);
if (oferta) {
  const c = oferta.checkout || {};
  if (!c.etiqueta || !c.bump_em) oferta = await mudar('ofertas', oferta.id, { checkout: { ...c, etiqueta: c.etiqueta || ETIQUETA, bump_em: c.bump_em || BUMP_EM } });
} else {
  oferta = await criar('ofertas', {
    slug: SLUG, produto_id: produto.id, nome: 'Videos with Claude', preco_centavos: PRECO, moeda: 'usd',
    parcelas_max: 1, juros_mes: 0, pix_desconto_pct: 0, pix_minutos: 30, metodos: ['cartao'], garantia_dias: 7, ativa: false,
    checkout: {
      subtitulo: '1 year of access · starts right away',
      poster: { tipo: 'Mini course', a: 'Videos', b: 'with Claude', pe: '12 lessons', cor: COR },
      inclui: ['12 lessons of about 6 minutes', 'Edit the video you shot: cuts, vertical, zoom, color, captions and music', 'Motion, and a screenshot or motion on top of what you say', 'YouTube and Instagram references through Claude in Chrome, using few tokens', 'The kit: recipes, tools and the ready-made prompts for each lesson'],
      depoimentos: [], presente: false, etiqueta: ETIQUETA, bump_em: BUMP_EM,
    },
  });
}
console.log(`produto ${produto.slug} (${produto.ativo ? 'ligado' : 'desligado'}), oferta ${oferta.slug} US$ ${(oferta.preco_centavos / 100).toFixed(2)} (${oferta.ativa ? 'ligada' : 'desligada'})`);
const c = oferta.checkout || {};
console.log(`etiqueta nas aulas de: ${((c.etiqueta || {}).cursos || []).join(', ') || 'nenhum'} · VSL ${(c.etiqueta || {}).vsl_bunny ? 'gravada' : 'ainda sem'}`);
console.log(`bump no checkout de: ${(c.bump_em || []).map((b) => b.oferta).join(', ') || 'nenhum'} · os dois aparecem só com a oferta ligada`);
