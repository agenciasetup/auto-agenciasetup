// Exporta os exemplos de estilo EM INGLÊS (curso "Posts on Autopilot with Claude"), sem tocar nos em português.
//   node templates/estilos/exportar-en.mjs advogado --etapa 1     (advogado | elegante | setup; etapas 1, 3 ou 5; padrão 5, a final)
//   node templates/estilos/exportar-en.mjs advogado --web         a final também em WebP 864 x 1080 (mesmo tamanho e qualidade do exportar.mjs)
// advogado e elegante usam templates/estilos/<estilo>-en.html. setup usa o modelo em camadas (templates/carrossel) com o
// conteúdo made-in-claude, nos slides 1, 2 e 7 (os mesmos do setup-1..3.webp em português).
// Sai em _local/estilos/<estilo>-en/ (etapa-1/, etapa-3/ e a final); com --web, em public/img/estilos-en/<estilo>-<n>.webp.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..', '..');
const args = process.argv.slice(2);
const estilo = args[0];
const i = args.indexOf('--etapa');
const etapa = i >= 0 && [1, 3, 5].includes(Number(args[i + 1])) ? Number(args[i + 1]) : 5;
const web = args.includes('--web');
if (!['advogado', 'elegante', 'setup'].includes(estilo)) { console.log('uso: node templates/estilos/exportar-en.mjs <advogado|elegante|setup> [--etapa 1|3|5] [--web]'); process.exit(1); }

const SETUP = { conteudo: 'made-in-claude', slides: [1, 2, 7] };
const endereco = (s) => (estilo === 'setup'
  ? `${pathToFileURL(join(raiz, 'templates', 'carrossel', 'modelo.html')).href}?c=${SETUP.conteudo}&s=${SETUP.slides[s - 1]}&etapa=${etapa}`
  : `${pathToFileURL(join(aqui, `${estilo}-en.html`)).href}?s=${s}&etapa=${etapa}`);
const total = 3;

const pasta = join(raiz, '_local', 'estilos', `${estilo}-en`, etapa === 5 ? '' : `etapa-${etapa}`);
mkdirSync(pasta, { recursive: true });
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((c) => existsSync(c));
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--font-render-hinting=none'] });
const p = await b.newPage();

async function abrir(s) {
  await p.goto(endereco(s), { waitUntil: 'networkidle0' });
  await p.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((im) => (im.complete ? null : new Promise((r) => { im.onload = r; im.onerror = r; }))));
  });
  if (estilo === 'setup') await p.waitForFunction(() => window.PRONTO === true, { timeout: 5000 }).catch(() => console.log('  (alinhamento não confirmou)'));
  await new Promise((r) => setTimeout(r, 250));
}

const arquivos = [];
await p.setViewport({ width: 1080, height: 1350 });
for (let s = 1; s <= total; s++) {
  await abrir(s);
  const arq = join(pasta, `${String(s).padStart(2, '0')}.jpg`);
  await p.screenshot({ path: arq, type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
  arquivos.push(arq);
}
if (web && etapa === 5) {
  const saida = join(raiz, 'public', 'img', 'estilos-en');
  mkdirSync(saida, { recursive: true });
  await p.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 0.8 });
  for (let s = 1; s <= total; s++) {
    await abrir(s);
    await p.screenshot({ path: join(saida, `${estilo}-${s}.webp`), type: 'webp', quality: 82, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
  }
}
await b.close();
// prévia: os slides lado a lado, pequenos
const previa = join(pasta, 'previa.jpg');
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...arquivos.flatMap((a) => ['-i', a]), '-filter_complex', `${arquivos.map((_, k) => `[${k}]scale=540:-1[v${k}]`).join(';')};${arquivos.map((_, k) => `[v${k}]`).join('')}hstack=inputs=${arquivos.length}`, '-q:v', '3', previa]);
console.log(`${total} slides em ${pasta}${web && etapa === 5 ? ' e em public/img/estilos-en/' : ''}`);
