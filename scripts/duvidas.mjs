// Dúvidas da Fé: grava os dados para os modelos (templates/duvidas) e exporta as telas do leitor e o livro em PDF.
// Usa o Chrome instalado (puppeteer-core), como o carrossel. O conteúdo mora em Curso-Duvidas/ (curso.json, duvidas/, img/).
// Uso: node scripts/duvidas.mjs [telas|pdf|conferir|icones|capa]   (sem nada, faz telas e pdf)
// Sai em _local/duvidas/: dados.js, inicio.png, duvida-<slug>.png e duvidas-da-fe.pdf (ou -amostra, se faltam dúvidas).
// conferir: campos, capítulo, imagem, travessão, tamanho e se cada versículo e cada citação da Igreja estão, palavra por
// palavra, na aula de origem da Escola do Olhar de Fé (o repositório olhar-de-fe ao lado deste).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { raiz } from './env.mjs';

const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((c) => existsSync(c));
const pasta = join(raiz, 'Curso-Duvidas');
const saida = join(raiz, '_local', 'duvidas');
const so = process.argv[2];
mkdirSync(saida, { recursive: true });

const curso = JSON.parse(readFileSync(join(pasta, 'curso.json'), 'utf8'));

if (so === 'conferir') {
  const CAMPOS = 'slug,capitulo,situacao,titulo,minutos,fonte,imagem,resposta,explicacao,biblia,igreja,diga,e_se,guardar,video';
  // Compara só as palavras (sem markdown, aspas e pontuação); "[…]" separa trechos que podem estar longe um do outro.
  const limpo = (t) => String(t).replace(/[*_>#“”"«».,;:!?()]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const trechos = (t) => String(t).split(/\[(?:…|\.\.\.)\]/).map(limpo).filter((x) => x.length > 3);
  const textos = (o) => (typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(textos) : o && typeof o === 'object' ? Object.values(o).flatMap(textos) : []);
  let erros = 0;
  let avisos = 0;
  for (const arq of readdirSync(join(pasta, 'duvidas')).filter((f) => f.endsWith('.json')).sort()) {
    const bruto = readFileSync(join(pasta, 'duvidas', arq), 'utf8');
    const problemas = [];
    const erro = (m) => { problemas.push(`  erro: ${m}`); erros++; };
    const aviso = (m) => { problemas.push(`  aviso: ${m}`); avisos++; };
    let d;
    try { d = JSON.parse(bruto); } catch (e) { console.log(`${arq}\n  erro: JSON inválido (${e.message})`); erros++; continue; }
    if (Object.keys(d).join(',') !== CAMPOS) erro(`campos diferentes do modelo: ${Object.keys(d).join(',')}`);
    if (`${d.slug}.json` !== arq) erro('slug diferente do nome do arquivo');
    const cap = curso.capitulos.find((c) => c.duvidas.some((x) => x.slug === d.slug));
    if (!cap || cap.slug !== d.capitulo) erro(`capítulo "${d.capitulo}" não bate com o curso.json (${cap?.slug})`);
    if (/[—–]/.test(bruto)) erro('tem travessão');
    // "IA" só em maiúsculas: "ia" minúsculo é o verbo ir ("ia à sinagoga").
    const corrido = textos({ ...d, imagem: null }).join(' ');
    if (/\bIA\b/.test(corrido) || /intelig[eê]ncia artificial/i.test(corrido)) erro('fala de IA fora da imagem');
    if (d.imagem && !existsSync(join(pasta, 'img', d.imagem.arquivo))) erro(`imagem não existe: ${d.imagem.arquivo}`);
    if (d.imagem && !/feita com IA/.test(d.imagem.legenda)) erro('legenda da imagem sem "feita com IA"');
    const palavras = textos([d.resposta, d.explicacao, d.diga, d.e_se, d.guardar]).join(' ').split(/\s+/).length;
    if (palavras > 650 || palavras < 250) aviso(`${palavras} palavras (o normal é de 350 a 550)`);
    const fonte = join(raiz, '..', d.fonte);
    if (!existsSync(fonte)) { erro(`aula de origem não encontrada: ${d.fonte}`); } else {
      const aula = JSON.parse(readFileSync(fonte, 'utf8'));
      const tudo = limpo(textos(aula).join(' '));
      const citacoes = aula.blocos.flatMap((b) => b.citacoes || []);
      for (const v of d.biblia) {
        if (!trechos(v.texto).every((t) => tudo.includes(t))) erro(`versículo ${v.ref} não está igual na aula`);
        if (!tudo.includes(limpo(v.ref.split(',')[0]))) aviso(`o capítulo de ${v.ref} não aparece na aula`);
      }
      for (const c of d.igreja) {
        const par = citacoes.find((x) => trechos(c.texto).every((t) => limpo(x.texto).includes(t)));
        if (!par) erro(`citação da Igreja (${c.numero}) não está igual na aula`);
        else if (par.doc !== c.doc || par.numero !== c.numero || par.url !== c.url) erro(`citação da Igreja (${c.numero}) com documento, número ou link diferente da aula`);
      }
      // Trechos entre aspas no texto corrido (fora a fala da objeção em "E se disserem"): quase sempre versículo.
      // O que não está na aula fica como aviso para ler.
      for (const t of textos([d.resposta, d.explicacao, d.diga, d.e_se.map((e) => e.resposta), d.guardar])) {
        for (const [, q] of t.matchAll(/"([^"]*)"/g)) {
          if (q.length >= 12 && !trechos(q).every((x) => tudo.includes(x))) aviso(`entre aspas e não está na aula: "${q.slice(0, 70)}"`);
        }
      }
    }
    if (problemas.length) console.log(`${arq}\n${problemas.join('\n')}`);
  }
  console.log(`\n${readdirSync(join(pasta, 'duvidas')).length} dúvidas conferidas: ${erros} erros, ${avisos} avisos`);
  process.exit(erros ? 1 : 0);
}
const ordem = curso.capitulos.flatMap((c) => c.duvidas.map((d) => d.slug));
const duvidas = Object.fromEntries(ordem
  .filter((s) => existsSync(join(pasta, 'duvidas', `${s}.json`)))
  .map((s) => [s, JSON.parse(readFileSync(join(pasta, 'duvidas', `${s}.json`), 'utf8'))]));
const amostra = Object.keys(duvidas).length < curso.total;
const img = `${pathToFileURL(join(pasta, 'img')).href}/`;
writeFileSync(join(saida, 'dados.js'), `window.DADOS = ${JSON.stringify({ curso, duvidas, amostra, img })};\n`);
console.log(`${Object.keys(duvidas).length} de ${curso.total} dúvidas prontas`);

const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--font-render-hinting=none'] });
const pagina = await navegador.newPage();

// capa: a capa do livro (templates/duvidas/capa.html) em Curso-Duvidas/img/capa-livro.jpg (1600 × 2400, para o PDF e a
// imagem do produto) e em public/img/marcas/<curso>-capa.webp e .jpg (800 × 1200: página de venda, checkout e leitor).
if (so === 'capa') {
  await pagina.setViewport({ width: 1600, height: 2400, deviceScaleFactor: 1 });
  await abrir('capa.html');
  await pagina.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });
  await pagina.screenshot({ path: join(pasta, 'img', 'capa-livro.jpg'), type: 'jpeg', quality: 90 });
  await pagina.setViewport({ width: 1600, height: 2400, deviceScaleFactor: 0.5 });
  await abrir('capa.html');
  await pagina.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });
  const marcas = join(raiz, 'public', 'img', 'marcas');
  await pagina.screenshot({ path: join(marcas, `${curso.slug}-capa.webp`), type: 'webp', quality: 86 });
  await pagina.screenshot({ path: join(marcas, `${curso.slug}-capa.jpg`), type: 'jpeg', quality: 86 });
  console.log(`  Curso-Duvidas/img/capa-livro.jpg e public/img/marcas/${curso.slug}-capa.webp e .jpg`);
  await navegador.close();
  process.exit(0);
}

// icones: o ícone do app no celular ("Adicionar à tela inicial") e da aba, a cruz dourada no azul da capa.
// Sai em public/img/marcas/<curso>-192.png e -512.png (o Worker usa no manifesto e na página do endereço da marca).
if (so === 'icones') {
  const pastaIcones = join(raiz, 'public', 'img', 'marcas');
  mkdirSync(pastaIcones, { recursive: true });
  for (const n of [192, 512]) {
    await pagina.setViewport({ width: n, height: n, deviceScaleFactor: 1 });
    await pagina.setContent(`<html><body style="margin:0;width:${n}px;height:${n}px;background:radial-gradient(70% 70% at 50% 30%,#1B3566,#0A1429);display:grid;place-items:center"><svg width="${Math.round(n * 0.4)}" height="${Math.round(n * 0.55)}" viewBox="0 0 16 22"><path fill="#E2B964" d="M6.6 0h2.8v6h5.6v2.8H9.4V22H6.6V8.8H1V6h5.6z"/></svg></body></html>`);
    await pagina.screenshot({ path: join(pastaIcones, `${curso.slug}-${n}.png`) });
  }
  console.log(`  public/img/marcas/${curso.slug}-192.png e -512.png`);
  // A tela do app no celular que a página de venda mostra ("O que você recebe"): o início, claro, sem a barra do sistema.
  await pagina.setViewport({ width: 390, height: 760, deviceScaleFactor: 2 });
  await pagina.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await abrir('leitor.html', '?tela=inicio');
  await pagina.screenshot({ path: join(pastaIcones, `${curso.slug}-app.webp`), type: 'webp', quality: 82, clip: { x: 0, y: 0, width: 390, height: 760 } });
  console.log(`  public/img/marcas/${curso.slug}-app.webp`);
  await navegador.close();
  process.exit(0);
}

async function abrir(arquivo, busca = '') {
  await pagina.goto(`${pathToFileURL(join(raiz, 'templates', 'duvidas', arquivo)).href}${busca}`, { waitUntil: 'networkidle0' });
  await pagina.waitForFunction(() => window.PRONTO === true, { timeout: 5000 });
  await pagina.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; }))));
  });
}

async function tela(busca, arquivo, tema = 'light') {
  await pagina.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: tema }]);
  await abrir('leitor.html', busca);
  await pagina.screenshot({ path: join(saida, arquivo), fullPage: true });
  console.log(`  ${arquivo}`);
}

if (so !== 'pdf') {
  await pagina.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await tela('?tela=inicio', 'inicio.png');
  for (const slug of Object.keys(duvidas)) await tela(`?tela=duvida&d=${slug}`, `duvida-${slug}.png`);
  // O leitor segue o tema do celular: uma prévia do modo escuro.
  await tela('?tela=inicio', 'inicio-escuro.png', 'dark');
  await pagina.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
}

// O livro usa JPEG: o Chrome guarda o JPEG como está no PDF, e o WebP ele refaz pesado (60 imagens davam 62 MB).
// Cada WebP ganha uma cópia .jpg ao lado, feita pelo próprio Chrome; o leitor continua no WebP.
async function jpegs() {
  const pastaImg = join(pasta, 'img');
  for (const webp of readdirSync(pastaImg).filter((f) => f.endsWith('.webp'))) {
    const jpg = join(pastaImg, webp.replace(/\.webp$/, '.jpg'));
    if (existsSync(jpg)) continue;
    const b64 = await pagina.evaluate(async (src) => {
      const i = new Image();
      i.src = src;
      await i.decode();
      const c = document.createElement('canvas');
      c.width = i.naturalWidth;
      c.height = i.naturalHeight;
      c.getContext('2d').drawImage(i, 0, 0);
      return c.toDataURL('image/jpeg', 0.82).split(',')[1];
    }, `data:image/webp;base64,${readFileSync(join(pastaImg, webp)).toString('base64')}`);
    writeFileSync(jpg, Buffer.from(b64, 'base64'));
  }
}

if (so !== 'telas') {
  await jpegs();
  await abrir('livro.html');
  const nome = `duvidas-da-fe${amostra ? '-amostra' : ''}.pdf`;
  await pagina.pdf({ path: join(saida, nome), preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
  console.log(`  ${nome}`);
}
await navegador.close();
