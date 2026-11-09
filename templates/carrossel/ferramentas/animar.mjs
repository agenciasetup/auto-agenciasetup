// Card animado: fotografa um slide quadro a quadro (window.seek(t) no modelo) e junta num MP4 H.264 1080 x 1350, sem
// áudio, para o Instagram (dentro do carrossel). Uso:
//   node templates/carrossel/ferramentas/animar.mjs <conteudo> <slide> [segundos=7] [fps=30] [parte=0.85]
// Sai em _local/carrossel/<conteudo>/<NN>.mp4. A animação vai de t = 0 a 1 na `parte` do tempo e segura o fim parado
// (0.45 em 12 s: anima em 5 s e deixa 7 s para ler, antes do loop).
// `parte` = loop: uma volta inteira, sem segurar (t = i / quadros, o último quadro não repete o primeiro). É o da capa com
// `movimento` (vai e volta, sem emenda): node templates/carrossel/ferramentas/animar.mjs <conteudo> 1 8 30 loop
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const raiz = join(import.meta.dirname, '..', '..', '..');
const [nome, slide, seg = '7', fps = '30', parte = '0.85'] = process.argv.slice(2);
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((c) => existsSync(c));
const modelo = pathToFileURL(join(raiz, 'templates', 'carrossel', 'modelo.html')).href;
const pasta = join(raiz, '_local', 'carrossel', nome, `quadros-${slide}`);
rmSync(pasta, { recursive: true, force: true });
mkdirSync(pasta, { recursive: true });
const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--font-render-hinting=none'] });
const pagina = await navegador.newPage();
await pagina.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
await pagina.goto(`${modelo}?c=${nome}&s=${slide}&t=0`, { waitUntil: 'networkidle0' });
await pagina.evaluate(async () => { await document.fonts.ready; });
const total = Math.round(Number(seg) * Number(fps));
const loop = parte === 'loop';
const anima = loop ? total : Math.round(total * Number(parte));
for (let i = 0; i < total; i++) {
  const t = loop ? i / total : Math.min(i / (anima - 1), 1);
  await pagina.evaluate((x) => window.seek(x), t);
  await pagina.screenshot({ path: join(pasta, `${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 94, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
}
await navegador.close();
const mp4 = join(raiz, '_local', 'carrossel', nome, `${String(slide).padStart(2, '0')}.mp4`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', fps, '-i', join(pasta, '%04d.jpg'), '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-profile:v', 'high', '-preset', 'slow', '-tune', 'grain', '-crf', '16', '-movflags', '+faststart', '-an', mp4]);
console.log(`${mp4} (${total} quadros)`);
