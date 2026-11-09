// exportar.mjs: transforma o modelo desta pasta (o arquivo .html) em PNG 1080 x 1350, pronto para o Instagram.
//
// PRECISA, UMA VEZ SÓ (no terminal, nesta pasta):  npm install puppeteer
// Sem o puppeteer, o script tenta o puppeteer-core com o Google Chrome do computador (outro navegador: variável CHROME).
//
// COMO USAR (no terminal, nesta pasta):
//   node exportar.mjs              a peça final (etapa 5), em saida/01.png, 02.png...
//   node exportar.mjs --etapa 1    etapa 1: o mínimo, sem efeito e sem textura (para revisar)
//   node exportar.mjs --etapa 3    etapa 3: com os efeitos, ainda sem textura (para revisar)
//   node exportar.mjs outro.html   quando a pasta tiver mais de um modelo
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const i = args.indexOf('--etapa');
const etapa = i >= 0 && [1, 3].includes(Number(args[i + 1])) ? Number(args[i + 1]) : 5;
const html = args.find((a) => a.endsWith('.html')) || readdirSync(AQUI).find((a) => a.endsWith('.html'));
const sair = (m) => { console.error(m); process.exit(1); };
if (!html || !existsSync(join(AQUI, html))) sair('Não achei o modelo (.html) nesta pasta.');

async function abrirNavegador() {
  const ARGS = ['--allow-file-access-from-files', '--font-render-hinting=none'];
  const chrome = process.env.CHROME || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA || ''}/Google/Chrome/Application/chrome.exe`,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((c) => c && existsSync(c));
  try {
    const { default: puppeteer } = await import('puppeteer');
    try { return await puppeteer.launch({ headless: true, args: ARGS }); } catch (e) { if (!chrome) throw e; return await puppeteer.launch({ headless: true, args: ARGS, executablePath: chrome }); }
  } catch (e) {
    if (e.code !== 'ERR_MODULE_NOT_FOUND' && !String(e.message).includes('Cannot find')) throw e;
  }
  try {
    const { default: puppeteer } = await import('puppeteer-core');
    if (!chrome) sair('Não achei o Chrome. Rode "npm install puppeteer" nesta pasta.');
    return await puppeteer.launch({ headless: true, args: ARGS, executablePath: chrome });
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND') sair('Falta o puppeteer. Nesta pasta, rode uma vez: npm install puppeteer');
    throw e;
  }
}

const saida = join(AQUI, 'saida', etapa === 5 ? '' : `etapa-${etapa}`);
mkdirSync(saida, { recursive: true });
const navegador = await abrirNavegador();
const pagina = await navegador.newPage();
await pagina.setViewport({ width: 1080, height: 1350 });
const url = pathToFileURL(join(AQUI, html)).href;
await pagina.goto(`${url}?s=1&etapa=${etapa}`, { waitUntil: 'networkidle0' });
const total = await pagina.$$eval('.slide', (l) => l.length);
for (let s = 1; s <= total; s++) {
  await pagina.goto(`${url}?s=${s}&etapa=${etapa}`, { waitUntil: 'networkidle0' });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.screenshot({ path: join(saida, `${String(s).padStart(2, '0')}.png`), type: 'png' });
}
await navegador.close();
console.log(`${total} slides em ${saida}`);
