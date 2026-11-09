// Exporta um post de frase do modelo (templates/frase) em JPEG 1080 x 1350, pronto para o Instagram.
// Usa o Chrome instalado (puppeteer-core): abre modelo.html por slide, espera as fontes e o ajuste do tamanho e fotografa.
// Uso: node scripts/frase.mjs <conteudo> [--etapa 1|3] [--so 1,5]
// Sai em _local/frase/<nome>/: 01.jpg ... NN.jpg e previa.jpg (todos lado a lado). --etapa 1 (só a frase no fundo) e
// --etapa 3 (com o rabisco) saem em <nome>/etapa-N/: é a regra das 5 etapas. Sem --etapa, sai a peça final, com o grão.
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { raiz } from './env.mjs';

const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((c) => existsSync(c));
const nome = process.argv[2];
if (!nome) { console.log('Uso: node scripts/frase.mjs <conteudo> [--etapa 1|3] [--so 1,5]'); process.exit(1); }
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const so = arg('--so') ? arg('--so').split(',').map(Number) : null;
const etapa = [1, 3].includes(Number(arg('--etapa'))) ? Number(arg('--etapa')) : 5;
const modelo = pathToFileURL(join(raiz, 'templates', 'frase', 'modelo.html')).href;
const saida = join(raiz, '_local', 'frase', nome, ...(etapa < 5 ? [`etapa-${etapa}`] : []));
mkdirSync(saida, { recursive: true });

const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--font-render-hinting=none'] });
const pagina = await navegador.newPage();
await pagina.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });

async function foto(n) {
  await pagina.goto(`${modelo}?c=${nome}&s=${n}&etapa=${etapa}`, { waitUntil: 'networkidle0' });
  await pagina.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; }))));
  });
  await pagina.waitForFunction(() => window.PRONTO === true, { timeout: 5000 }).catch(() => console.log('  (ajuste não confirmou)'));
  await new Promise((r) => setTimeout(r, 200));
  const arquivo = join(saida, `${String(n).padStart(2, '0')}.jpg`);
  await pagina.screenshot({ path: arquivo, type: 'jpeg', quality: 94, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
  console.log(`  ${String(n).padStart(2, '0')}.jpg`);
  return arquivo;
}

console.log(`frase ${nome} -> ${saida}`);
await pagina.goto(`${modelo}?c=${nome}&s=1`, { waitUntil: 'networkidle0' });
const total = await pagina.evaluate(() => window.SLIDES || 0);
if (!total) { console.log('Conteúdo sem slides (ou não encontrado).'); await navegador.close(); process.exit(1); }
const feitos = [];
for (let n = 1; n <= total; n++) if (!so || so.includes(n)) feitos.push(await foto(n));

// Prévia: os slides em fila, como no arrastar do Instagram.
if (!so && feitos.length > 1) {
  const b64 = (f) => `data:image/jpeg;base64,${readFileSync(f).toString('base64')}`;
  const html = `<html><body style="margin:0;background:#111;padding:40px;display:flex;gap:0">${feitos.map((f) => `<img src="${b64(f)}">`).join('')}
    <style>img{width:360px;height:450px;display:block}</style></body></html>`;
  const arq = join(saida, 'previa.html');
  writeFileSync(arq, html);
  await pagina.setViewport({ width: 80 + feitos.length * 360, height: 530, deviceScaleFactor: 1 });
  await pagina.goto(pathToFileURL(arq).href, { waitUntil: 'load' });
  await pagina.screenshot({ path: join(saida, 'previa.jpg'), type: 'jpeg', quality: 88, fullPage: true });
  console.log('  previa.jpg');
}
await navegador.close();
