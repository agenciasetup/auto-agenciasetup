// Monta (ou atualiza) o curso em inglês "Posts on Autopilot with Claude" na área de membros, a partir de Curso/aulas-en,
// Curso/videos-en e Curso/kit-en (pedido do dono em 29/10/2026). É o mesmo mini curso, com marca própria em inglês:
// endereço agenciasetup.com (marca.dominio), página de venda, checkout em dólar (Stripe), app e e-mails em inglês.
// Pode rodar de novo: acha cada coisa pelo seu código (curso pelo slug, módulo pelo número, aula pelo código, arquivo pelo
// nome) e atualiza no lugar, sem apagar progresso de ninguém.
// O que nasce desligado fica como o dono deixar: produto e ofertas nascem desligados e a landing page nasce em rascunho,
// fora da lista de cursos; se já existem, este script não liga, não desliga e não muda preço nem texto de venda (a landing
// só é regravada com --landing). O curso nasce publicado: ele só aparece no endereço dele (os apps da Setup escondem curso
// com marca) e o endereço ainda não está no ar.
// Uso: node scripts/area-semente-en.mjs                 curso, módulos, aulas que já têm vídeo, kit, produto, ofertas, landing
//      node scripts/area-semente-en.mjs --sem-kit       não sobe o kit de novo
//      node scripts/area-semente-en.mjs --landing       regrava os blocos da landing page (templates/venda-en/landing.json)
//      node scripts/area-semente-en.mjs --so 1.1,1.2    só o que vem do vídeo dessas aulas (duração, legendas, capítulos...)
//      node scripts/area-semente-en.mjs --so-kit        só os arquivos do kit; curso, módulos e aulas ficam como estão no ar
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { env, exige, raiz } from './env.mjs';

exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY');
const CURSO = join(raiz, 'Curso');
const KIT = join(CURSO, 'kit-en');
const SLUG = 'posts-on-autopilot';
const VITALICIO = 'posts-on-autopilot-lifetime';
const MARCA = { nome: 'Posts on Autopilot', dominio: 'agenciasetup.com', tema: 'video', idioma: 'en' };
const k = env.SUPABASE_SECRET_KEY;
const H = { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': 'application/json' };

async function rest(caminho, opcoes = {}) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1${caminho}`, { ...opcoes, headers: { ...H, Prefer: 'return=representation', ...(opcoes.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${caminho} ${r.status}: ${t.slice(0, 400)}`);
  return t ? JSON.parse(t) : null;
}
const um = async (tabela, filtro) => (await rest(`/${tabela}?${filtro}&limit=1`))[0] || null;
async function salvar(tabela, filtro, dados) {
  const atual = await um(tabela, filtro);
  if (atual) return (await rest(`/${tabela}?id=eq.${atual.id}`, { method: 'PATCH', body: JSON.stringify(dados) }))[0];
  return (await rest(`/${tabela}`, { method: 'POST', body: JSON.stringify(dados) }))[0];
}
const criar = async (tabela, dados) => (await rest(`/${tabela}`, { method: 'POST', body: JSON.stringify(dados) }))[0];
async function subir(bucket, caminho, corpo, tipo) {
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${bucket}/${caminho.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST', headers: { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': tipo, 'x-upsert': 'true' }, body: corpo,
  });
  if (!r.ok) throw new Error(`upload ${bucket}/${caminho} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return `${env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${caminho}`;
}

// ---------------------------------------------------------------- o curso (os nomes seguem Curso/GLOSSARIO-EN.md)
const SECOES = ['Build the base', 'Create every day', 'Go further'];
const MODULOS = [
  [1, 0, 'Start here'], [2, 0, 'Claude learns your style'], [3, 1, 'Hot topics and daily posts'],
  [4, 1, 'High-end design'], [5, 2, 'AI images (optional)'], [6, 2, 'Everything on autopilot'],
];
const AULAS = [
  ['1.1', "What you'll build", ['00-READ-ME-FIRST.md']],
  ['1.2', 'Installing Claude and getting to know the screen', ['screen-guide.md']],
  ['1.3', 'Your project folder and the kit', ['01-start-here.md']],
  ['1.4', 'Granting access', ['02-grant-access.md']],
  ['2.1', 'Your profile interview', ['03-my-style.md']],
  ['2.2', 'Claude reads your Instagram', []],
  ['2.3', 'Your style skill: test and fix', ['correction-examples.md', 'skills/my-style']],
  ['3.1', 'The hot-topics radar', ['04-radar.md', 'skills/radar']],
  ['3.2', 'The content board', ['05-board.md']],
  ['3.3', 'Daily posts and scheduled tasks', ['06-daily-posts.md', 'skills/daily-posts']],
  ['4.1', 'The layered design template', ['07-design.md', 'template', 'tools/export.mjs', 'tools/cutout.mjs']],
  ['4.2', 'Intentional covers and the 5-step rule', ['skills/high-end-design']],
  ['4.3', 'Effects with a reason, and finishing', ['design-lessons.md']],
  ['4.4', "How to fix Claude's design", ['how-to-give-feedback.md']],
  ['5.1', "Nano Banana through Google's API", ['08-nano-banana.md', 'tools/generate-image.mjs']],
  ['5.2', 'Magnific and your photo with your exact face', ['09-magnific.md']],
  ['6.1', 'A day on autopilot', ['10-routine.md']],
  ['6.2', 'When something goes wrong', ['ERRORS-AND-FIXES.md']],
];
const ABRIR = ['Open your project folder in Claude (Code tab).', 'Drag this file into the chat.', 'Answer the questions it asks, one at a time.'];
const FICHAS = {
  'Posts-on-Autopilot-Kit.zip': ['pacote', 'The whole kit in one folder: recipes, guides, skills and the design template.', 'Before lesson 1.3. Download it, unzip it and keep the folder in Documents.', ['Download the file.', 'Unzip it (double-click on a Mac; on Windows, right-click and Extract All).', 'Move the Posts-on-Autopilot-Kit folder to Documents.'], '2 min'],
  '00-READ-ME-FIRST.md': ['guia', 'What you need and the order of everything, in a short list.', 'Before the hands-on lessons.', ['Open the file and check the list.', 'Follow the order of the lessons.'], '3 min'],
  'screen-guide.md': ['guia', 'The Claude desktop screen explained, button by button.', "When you can't find a button or don't know where to click.", ['Open it and look for the part of the screen you want to understand.'], '5 min'],
  '01-start-here.md': ['receita', 'Sets up your project folder and checks what is missing.', 'In lesson 1.3, with Claude open in your project folder.', ABRIR, '10 min'],
  '02-grant-access.md': ['receita', 'Turns on Claude in Chrome, scheduled tasks and permissions.', 'In lesson 1.4.', ABRIR, '10 min'],
  '03-my-style.md': ['receita', 'Your profile interview, the reading of your Instagram and your visual style sheet, measured on the covers you send as references.', 'In lessons 2.1 and 2.2.', ABRIR, '30 min'],
  'correction-examples.md': ['guia', 'Good and bad style corrections, with examples from many niches and ready-made lines.', "Whenever a text from Claude doesn't sound like you.", ['Open it when you are about to correct a text.', 'Pick a ready-made line close to your case.', 'Swap the example for the way you talk and send it to Claude.'], '5 min'],
  'skills/my-style': ['skill', 'The style skill template. Claude builds yours in lesson 2.1; this one is for comparing.', 'Only if you want to check yours (lesson 2.3).', ['Unzip it.', 'Compare it with yours, in the .claude/skills folder of your project.'], '5 min'],
  '04-radar.md': ['receita', 'Sets up the hot-topics radar for your niche.', 'In lesson 3.1.', ABRIR, '15 min'],
  'skills/radar': ['skill', 'The radar skill template.', 'Only if you want to compare it with yours (lesson 3.1).', ['Unzip it.', 'Compare it with yours, in the .claude/skills folder of your project.'], '5 min'],
  '05-board.md': ['receita', 'Creates the content board, like Trello, inside your folder.', 'In lesson 3.2.', ABRIR, '15 min'],
  '06-daily-posts.md': ['receita', 'Creates the daily posts skill and the task that runs on its own.', 'In lesson 3.3.', ABRIR, '15 min'],
  'skills/daily-posts': ['skill', 'The daily posts skill template.', 'Only if you want to compare it with yours (lesson 3.3).', ['Unzip it.', 'Compare it with yours, in the .claude/skills folder of your project.'], '5 min'],
  '07-design.md': ['receita', 'Puts your style into the layered design template, installs the image exporter and the free background remover, and makes your first design next to your references.', 'In lesson 4.1.', ABRIR, '40 min'],
  template: ['modelo', 'The layered design template (HTML) that becomes your posts, in your style.', 'Recipe 07 installs it for you. Download it only if you want to open it by hand.', ['Unzip it.', 'Read the README.md inside the folder.'], '5 min'],
  'tools/export.mjs': ['ferramenta', 'Exports the design as an image ready for Instagram and measures your references.', "Claude uses it on its own. You don't need to open it.", ['Keep it in the tools folder of your project.'], '1 min'],
  'tools/cutout.mjs': ['ferramenta', 'Removes the background from your photos for free, on your computer, without sending the photo anywhere.', "Claude uses it on its own in recipe 07, when the cover needs it. You don't need to open it.", ['Keep it in the tools folder of your project.'], '1 min'],
  'skills/high-end-design': ['skill', 'Reads your style from your references and designs in it, following the 5-step rule.', 'In lesson 4.2.', ['Unzip it.', 'Drag the folder into the chat and ask Claude to install the skill in your project.'], '5 min'],
  'design-lessons.md': ['guia', "Agência Setup's design lessons, explained for any niche.", 'In lesson 4.3 and whenever you review a design.', ['Read it once, all the way through.', 'Come back to it when a design looks "flat".'], '10 min'],
  'how-to-give-feedback.md': ['guia', "How to fix Claude's design with text, a screenshot or a reference.", 'In lesson 4.4 and every time a design needs changes.', ['Pick the way (text, screenshot or reference).', 'Use the ready-made line from the guide.'], '5 min'],
  '08-nano-banana.md': ['receita', 'Turns on Nano Banana with your Google AI Studio key.', 'In lesson 5.1. It is optional and paid per use.', ABRIR, '15 min'],
  'tools/generate-image.mjs': ['ferramenta', 'Creates images with Nano Banana.', "Claude uses it on its own. You don't need to open it.", ['Keep it in the tools folder of your project.'], '1 min'],
  '09-magnific.md': ['receita', 'Turns on Magnific and makes your photo with your exact face.', 'In lesson 5.2. It is optional.', ABRIR, '15 min'],
  '10-routine.md': ['receita', 'Schedules the three daily tasks and the weekly review.', 'In lesson 6.1.', ABRIR, '10 min'],
  'ERRORS-AND-FIXES.md': ['guia', 'What gets stuck and how to fix it, the simplest way.', 'When something goes wrong.', ['Find the error by its title.', 'Follow the steps.', "Didn't work? Ask the lesson's tutor, with a screenshot."], '5 min'],
};

const duracao = (arq) => Math.round(Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq]).toString().trim()));
const lerJson = (arq) => (existsSync(arq) ? JSON.parse(readFileSync(arq, 'utf8').replace(/^﻿/, '')) : null);
function previaDe(arq) {
  if (!existsSync(arq) || statSync(arq).isDirectory()) return null;
  return readFileSync(arq, 'utf8').split(/\r?\n/).filter((l) => l.trim()).slice(0, 6).join('\n').slice(0, 400);
}
// O tar do Windows grava o zip com "/" nos caminhos. O Compress-Archive grava "\", que no Mac pode virar um arquivo só.
function zipar(origem, destino) {
  rmSync(destino, { force: true });
  execFileSync(join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'), ['-a', '-c', '-f', destino, '-C', dirname(origem), basename(origem)]);
}
const mp4 = (id) => join(CURSO, 'videos-en', `aula-${id}.mp4`);

// Dados de cada aula que saem do vídeo (mudam quando o vídeo é refeito).
function doVideo(id) {
  const pasta = join(CURSO, 'aulas-en', id);
  const falas = lerJson(join(pasta, 'audio', 'falas.json')) || [];
  const tempos = (lerJson(join(pasta, 'audio', 'tempos.json')) || {}).falas || {};
  const area = lerJson(join(pasta, 'area.json')) || {};
  const dados = {
    duracao_s: duracao(mp4(id)),
    falas: falas.filter((f) => tempos[f.id]).map((f) => ({ s: Math.floor(tempos[f.id].inicio), f: Math.ceil(tempos[f.id].fim), texto: f.texto })),
  };
  if (area.marcadores) dados.marcadores = area.marcadores.map(({ s, titulo }) => ({ s, titulo }));
  if (area.resumo) dados.resumo = area.resumo;
  if (area.faca_agora) dados.faca_agora = area.faca_agora;
  return dados;
}

const semKit = process.argv.includes('--sem-kit');
const soKit = process.argv.includes('--so-kit');
const iSo = process.argv.indexOf('--so');
const so = iSo > 0 ? String(process.argv[iSo + 1] || '').split(',').map((s) => s.trim()).filter(Boolean) : null;
const tmp = join(raiz, '_local', 'area-semente-en');
mkdirSync(tmp, { recursive: true });

// A capa de cada aula: um quadro do começo do vídeo em inglês (o título da aula na tela).
async function capaDe(id) {
  const jpg = join(tmp, `aula-${id}.jpg`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '2.2', '-i', mp4(id), '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '3', jpg]);
  return subir('midia', `curso/posts-on-autopilot/aula-${id}.jpg`, readFileSync(jpg), 'image/jpeg');
}

const prontas = AULAS.filter(([id]) => existsSync(mp4(id)));
const faltam = AULAS.filter(([id]) => !existsSync(mp4(id))).map(([id]) => id);
if (faltam.length) console.log(`Aulas ainda sem vídeo em inglês (ficam para a próxima vez): ${faltam.join(', ')}`);

if (so) {
  const c = await um('cursos', `slug=eq.${SLUG}`);
  for (const id of so) {
    const atual = c && await um('aulas', `curso_id=eq.${c.id}&codigo=eq.${id}`);
    if (!atual) { console.log(`${id}: aula não encontrada`); continue; }
    const d = doVideo(id);
    await rest(`/aulas?id=eq.${atual.id}`, { method: 'PATCH', body: JSON.stringify(d) });
    console.log(`${id}: ${atual.duracao_s} s -> ${d.duracao_s} s, ${d.falas.length} legendas, ${(d.marcadores || []).length} capítulos`);
  }
  process.exit(0);
}

const DESC = 'A folder on your computer that learns your style, finds a hot topic every day, writes your posts on a board and makes high-end designs. No coding: you drag a file into the chat and answer the questions Claude asks.';
const cursoAtual = await um('cursos', `slug=eq.${SLUG}`);
if (soKit && !cursoAtual) throw new Error(`--so-kit: o curso ${SLUG} ainda não existe; rode sem --so-kit`);
const curso = soKit ? cursoAtual : await salvar('cursos', `slug=eq.${SLUG}`, {
  slug: SLUG, titulo: 'Posts on Autopilot with Claude', subtitulo: 'From zero to finished posts, beautiful and in your style.', descricao: DESC,
  cor: '#ff7a00', certificado_pct: 70, marca: MARCA, tags: ['claude', 'automation', 'posts', 'design'],
  ...(cursoAtual ? {} : { status: 'publicado', publicado_em: new Date().toISOString() }),
});
console.log('curso', curso.slug, curso.status);

const aulas = {};
for (const a of await rest(`/aulas?curso_id=eq.${curso.id}&select=id,codigo,capa_url`)) aulas[a.codigo] = a;
if (!soKit) {
  const secoes = [];
  for (const [i, t] of SECOES.entries()) secoes.push(await salvar('secoes', `curso_id=eq.${curso.id}&ordem=eq.${i}`, { curso_id: curso.id, titulo: t, ordem: i }));
  const modulos = {};
  for (const [n, s, t] of MODULOS) modulos[n] = await salvar('modulos', `curso_id=eq.${curso.id}&numero=eq.${n}`, { curso_id: curso.id, secao_id: secoes[s].id, numero: n, titulo: t, ordem: n });
  for (const [id, titulo] of prontas) {
    const ordem = AULAS.findIndex(([x]) => x === id) + 1;
    const capa_url = await capaDe(id);
    aulas[id] = await salvar('aulas', `curso_id=eq.${curso.id}&codigo=eq.${id}`, {
      curso_id: curso.id, modulo_id: modulos[+id[0]].id, codigo: id, titulo, ordem, status: 'publicado', capa_url, gratis: id === '1.1', ...doVideo(id),
    });
    process.stdout.write(`${id} `);
  }
  console.log(`\naulas com vídeo: ${prontas.length} de ${AULAS.length}`);
  if (aulas['1.1'] && aulas['1.1'].capa_url) await rest(`/cursos?id=eq.${curso.id}`, { method: 'PATCH', body: JSON.stringify({ capa_url: aulas['1.1'].capa_url }) });
}

// Arquivos do kit (bucket privado "curso"). Pastas viram .zip. Arquivo de aula que ainda não existe fica sem aula.
if (!semKit) {
  const kitTmp = join(tmp, 'Posts-on-Autopilot-Kit');
  rmSync(kitTmp, { recursive: true, force: true });
  cpSync(KIT, kitTmp, { recursive: true, filter: (s) => !/[\\/]_testes$/.test(s) && !/[\\/]_testes[\\/]/.test(s) });
  zipar(kitTmp, join(tmp, 'Posts-on-Autopilot-Kit.zip'));
  const usados = [['Posts-on-Autopilot-Kit.zip', null]];
  for (const [id, , mats] of AULAS) for (const m of mats) if (!usados.some(([n]) => n === m)) usados.push([m, id]);
  for (const [ordem, [nome, aulaId]] of usados.entries()) {
    const [tipo, o_que, quando, como, tempo] = FICHAS[nome];
    let arq = nome === 'Posts-on-Autopilot-Kit.zip' ? join(tmp, nome) : join(KIT, nome);
    if (!existsSync(arq)) { console.log(`\n  falta no kit: ${nome}`); continue; }
    let publicado = basename(nome);
    if (statSync(arq).isDirectory()) { const z = join(tmp, `${basename(nome)}.zip`); zipar(arq, z); arq = z; publicado = `${basename(nome)}.zip`; }
    const caminho = `${SLUG}/${publicado}`;
    const corpo = readFileSync(arq);
    await subir('curso', caminho, corpo, publicado.endsWith('.zip') ? 'application/zip' : publicado.endsWith('.md') ? 'text/markdown; charset=utf-8' : 'text/javascript; charset=utf-8');
    await salvar('arquivos', `curso_id=eq.${curso.id}&nome=eq.${encodeURIComponent(publicado)}`, {
      curso_id: curso.id, aula_id: aulaId && aulas[aulaId] ? aulas[aulaId].id : null, nome: publicado, tipo, o_que, quando, como, tempo,
      previa: previaDe(join(KIT, nome)), origem: 'storage', caminho, bytes: corpo.length, versao: new Date().toISOString().slice(0, 10).split('-').reverse().join('/'), ordem,
    });
    process.stdout.write('.');
  }
  console.log(`\narquivos do kit: ${usados.length}`);
}
if (soKit) process.exit(0);

// ---------------------------------------------------------------- produto, ofertas e landing (nascem desligados; se existem, ficam)
const produto = await um('produtos', `slug=eq.${SLUG}`) || await criar('produtos', {
  slug: SLUG, nome: 'Posts on Autopilot with Claude', chamada: 'From zero to finished posts, beautiful and in your style.',
  descricao: 'Mini course with 18 lessons, the kit with recipes and skills, and the AI tutor.', preco_centavos: 1900, ativo: false, tags: ['claude', 'automation', 'posts'],
});
if (!(await um('produto_acessos', `produto_id=eq.${produto.id}&curso_id=eq.${curso.id}`))) await criar('produto_acessos', { produto_id: produto.id, curso_id: curso.id, dias: 365 });
const prodVit = await um('produtos', `slug=eq.${VITALICIO}`) || await criar('produtos', {
  slug: VITALICIO, nome: 'Lifetime access to Posts on Autopilot', chamada: 'Every new or updated lesson is yours, with no 1-year limit.',
  descricao: 'Removes the 1-year limit of the mini course.', preco_centavos: 900, ativo: false, tags: ['claude'],
});
if (!(await um('produto_acessos', `produto_id=eq.${prodVit.id}&curso_id=eq.${curso.id}`))) await criar('produto_acessos', { produto_id: prodVit.id, curso_id: curso.id, dias: null });

const oferta = await um('ofertas', `slug=eq.${SLUG}`) || await criar('ofertas', {
  slug: SLUG, produto_id: produto.id, nome: 'Posts on Autopilot with Claude', preco_centavos: 1900, moeda: 'usd',
  parcelas_max: 1, juros_mes: 0, pix_desconto_pct: 0, pix_minutos: 30, metodos: ['cartao'], garantia_dias: 7, ativa: false,
  checkout: {
    subtitulo: '1 year of access · starts right away',
    poster: { tipo: 'Mini course', a: 'Posts on autopilot', b: 'with Claude', pe: '18 lessons', cor: '#ff7a00' },
    inclui: ['18 video lessons, 5 to 7 minutes each', 'The kit: recipes, skills and the design template', '"Do it now" in every lesson, with the prompt ready', 'Certificate when you finish 70%'],
    depoimentos: [], presente: false,
  },
});
const ofVit = await um('ofertas', `slug=eq.${VITALICIO}`) || await criar('ofertas', {
  slug: VITALICIO, produto_id: prodVit.id, nome: 'Lifetime access', preco_centavos: 900, moeda: 'usd',
  parcelas_max: 1, juros_mes: 0, pix_desconto_pct: 0, pix_minutos: 30, metodos: ['cartao'], garantia_dias: 7, ativa: false, checkout: {},
});
if (!(await um('ofertas_bumps', `oferta_id=eq.${oferta.id}&bump_id=eq.${ofVit.id}`))) {
  await criar('ofertas_bumps', { oferta_id: oferta.id, bump_id: ofVit.id, ordem: 0, titulo: 'Yes, I want lifetime access', texto: 'The course changes as Claude changes. Every new or updated lesson is yours, with no 1-year limit. Only on this page.' });
}
console.log(`oferta ${oferta.slug} US$ ${(oferta.preco_centavos / 100).toFixed(2)} (${oferta.ativa ? 'ligada' : 'desligada'}), extra ${ofVit.slug} US$ ${(ofVit.preco_centavos / 100).toFixed(2)}`);

const LANDING = join(raiz, 'templates', 'venda-en', 'landing.json');
const lpAtual = await um('landing_pages', `slug=eq.${SLUG}`);
if (existsSync(LANDING) && (!lpAtual || process.argv.includes('--landing'))) {
  const l = JSON.parse(readFileSync(LANDING, 'utf8'));
  const dados = { slug: SLUG, titulo: l.titulo, produto_id: produto.id, blocos: l.blocos, seo: { ...l.seo, vitrine: false } };
  if (lpAtual) await rest(`/landing_pages?id=eq.${lpAtual.id}`, { method: 'PATCH', body: JSON.stringify(dados) });
  else await criar('landing_pages', { ...dados, status: 'rascunho' });
  console.log(`landing ${SLUG}: ${l.blocos.length} blocos (${lpAtual ? lpAtual.status : 'rascunho'})`);
} else console.log(`landing ${SLUG}: ${lpAtual ? `fica como está (${lpAtual.status}); --landing regrava os blocos` : 'falta templates/venda-en/landing.json'}`);
