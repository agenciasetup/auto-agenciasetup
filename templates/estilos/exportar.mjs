// Exporta os exemplos de estilo (templates/estilos/<estilo>.html) em JPEG 1080 x 1350 e a prévia lado a lado.
//   node templates/estilos/exportar.mjs advogado --etapa 1     (etapas 1, 3 ou 5; padrão 5, a final)
//   node templates/estilos/exportar.mjs advogado --web          a final também em WebP 864 x 1080 para a página de venda
// Sai em _local/estilos/<estilo>/ (etapa-1/, etapa-3/ e a final); com --web, em public/img/estilos/<estilo>-<n>.webp.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..', '..');
const args = process.argv.slice(2);
const estilo = args[0];
const etapa = Number((args[args.indexOf('--etapa') + 1] && args.includes('--etapa')) ? args[args.indexOf('--etapa') + 1] : 5);
const web = args.includes('--web');
if (!estilo) { console.log('uso: node templates/estilos/exportar.mjs <estilo> [--etapa 1|3|5] [--web]'); process.exit(1); }

const pasta = join(raiz, '_local', 'estilos', estilo, etapa === 5 ? '' : `etapa-${etapa}`);
mkdirSync(pasta, { recursive: true });
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files'] });
const p = await b.newPage();
await p.setViewport({ width: 1080, height: 1350 });
const url = pathToFileURL(join(aqui, `${estilo}.html`)).href;
await p.goto(`${url}?s=1&etapa=${etapa}`, { waitUntil: 'networkidle0' });
const total = await p.$$eval('.slide', (l) => l.length);
const arquivos = [];
for (let s = 1; s <= total; s++) {
  await p.goto(`${url}?s=${s}&etapa=${etapa}`, { waitUntil: 'networkidle0' });
  await p.evaluate(() => document.fonts.ready);
  const arq = join(pasta, `${String(s).padStart(2, '0')}.jpg`);
  await p.screenshot({ path: arq, type: 'jpeg', quality: 92 });
  arquivos.push(arq);
  if (web && etapa === 5) {
    mkdirSync(join(raiz, 'public', 'img', 'estilos'), { recursive: true });
    await p.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 0.8 });
    await p.screenshot({ path: join(raiz, 'public', 'img', 'estilos', `${estilo}-${s}.webp`), type: 'webp', quality: 82 });
    await p.setViewport({ width: 1080, height: 1350 });
  }
}
await b.close();
// prévia: os slides lado a lado, pequenos
const previa = join(pasta, 'previa.jpg');
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...arquivos.flatMap((a) => ['-i', a]), '-filter_complex', `${arquivos.map((_, i) => `[${i}]scale=540:-1[v${i}]`).join(';')};${arquivos.map((_, i) => `[v${i}]`).join('')}hstack=inputs=${arquivos.length}`, '-q:v', '3', previa]);
console.log(`${total} slides em ${pasta}${web && etapa === 5 ? ' e em public/img/estilos/' : ''}`);
