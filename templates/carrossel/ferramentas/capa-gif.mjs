// Capa com GIF: fotografa um slide uma vez por quadro do GIF (&quadro=1..N; o conteúdo troca o assunto pelo quadro)
// e junta num MP4 H.264 1080 x 1350 em loop, sem áudio, para entrar no carrossel do Instagram (o feed não aceita GIF).
// Uso: node templates/carrossel/ferramentas/capa-gif.mjs <conteudo> [slide=1] [quadros=8] [ms por quadro=180] [voltas=5]
// `quadros` também aceita a ordem dos quadros (ex.: 2,3,4,5,4,3): só esses entram, nessa ordem (para tirar um tranco).
// Sai em _local/carrossel/<conteudo>/<NN>.mp4 e <NN>.gif (o GIF é só para mostrar ao Filipe).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const raiz = join(import.meta.dirname, '..', '..', '..');
const [nome, slide = '1', quadros = '8', ms = '180', voltas = '5'] = process.argv.slice(2);
if (!nome) { console.log('Uso: node templates/carrossel/ferramentas/capa-gif.mjs <conteudo> [slide] [quadros] [ms] [voltas]'); process.exit(1); }
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((c) => existsSync(c));
const modelo = pathToFileURL(join(raiz, 'templates', 'carrossel', 'modelo.html')).href;
const NN = String(slide).padStart(2, '0');
const ordem = String(quadros).includes(',') ? String(quadros).split(',').map(Number) : Array.from({ length: Number(quadros) }, (_, k) => k + 1);
const unicos = [...new Set(ordem)];
const nome2 = (q) => `${String(q).padStart(2, '0')}.png`;
const pasta = join(raiz, '_local', 'carrossel', nome, `gif-${NN}`);
rmSync(pasta, { recursive: true, force: true });
mkdirSync(pasta, { recursive: true });

const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--font-render-hinting=none'] });
const pagina = await navegador.newPage();
await pagina.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
for (const q of unicos) {
  await pagina.goto(`${modelo}?c=${nome}&s=${slide}&quadro=${q}`, { waitUntil: 'networkidle0' });
  await pagina.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; }))));
  });
  await pagina.waitForFunction(() => window.PRONTO === true, { timeout: 5000 }).catch(() => console.log('  (alinhamento não confirmou)'));
  await new Promise((r) => setTimeout(r, 250));
  await pagina.screenshot({ path: join(pasta, nome2(q)), type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1350 } });
  console.log(`  quadro ${q}`);
}
await navegador.close();

// A lista do concat repete os quadros (voltas vezes), cada um pelo seu tempo.
const seg = Number(ms) / 1000;
const linhas = [];
for (let v = 0; v < Number(voltas); v++) for (const q of ordem) linhas.push(`file '${nome2(q)}'`, `duration ${seg}`);
linhas.push(`file '${nome2(ordem[ordem.length - 1])}'`);
writeFileSync(join(pasta, 'lista.txt'), linhas.join('\n'));
const mp4 = join(raiz, '_local', 'carrossel', nome, `${NN}.mp4`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(pasta, 'lista.txt'), '-vf', 'fps=30,scale=in_range=full:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-profile:v', 'high', '-preset', 'slow', '-tune', 'grain', '-crf', '16', '-movflags', '+faststart', '-an', mp4]);
const gif = join(raiz, '_local', 'carrossel', nome, `${NN}.gif`);
const umaVolta = [];
for (const q of ordem) umaVolta.push(`file '${nome2(q)}'`, `duration ${seg}`);
umaVolta.push(`file '${nome2(ordem[ordem.length - 1])}'`);
writeFileSync(join(pasta, 'volta.txt'), umaVolta.join('\n'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(pasta, 'volta.txt'), '-vf', `fps=${1000 / Number(ms)},scale=540:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer`, '-loop', '0', gif]);
console.log(`${mp4}\n${gif}`);
