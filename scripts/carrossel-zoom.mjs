// Recorte ampliado de um slide do carrossel, para conferir de perto (cabelo, mãos, títulos, textura).
// Uso: node scripts/carrossel-zoom.mjs <conteudo> <slide> <x> <y> <largura> <altura> [etapa]
// Ex.:  node scripts/carrossel-zoom.mjs criado-no-claude 1 330 450 500 420
// Sai em _local/carrossel/<conteudo>/zoom-<slide>-<x>-<y>.jpg, ampliado 2x.
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { raiz } from './env.mjs';

const [nome, slide, x, y, w, h, etapa] = process.argv.slice(2);
if (!nome || !slide || [x, y, w, h].some((v) => !Number.isFinite(Number(v)))) {
  console.error('Uso: node scripts/carrossel-zoom.mjs <conteudo> <slide> <x> <y> <largura> <altura> [etapa]');
  process.exit(1);
}
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((c) => existsSync(c));
const modelo = pathToFileURL(join(raiz, 'templates', 'carrossel', 'modelo.html')).href;
const saida = join(raiz, '_local', 'carrossel', nome);
mkdirSync(saida, { recursive: true });

const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--font-render-hinting=none'] });
const pagina = await navegador.newPage();
await pagina.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
await pagina.goto(`${modelo}?c=${nome}&s=${slide}${etapa ? `&etapa=${etapa}` : ''}`, { waitUntil: 'networkidle0' });
await pagina.waitForFunction(() => window.PRONTO === true, { timeout: 8000 }).catch(() => console.log('(alinhamento não confirmou)'));
await new Promise((r) => setTimeout(r, 250));
const arquivo = join(saida, `zoom-${slide}-${x}-${y}.jpg`);
await pagina.screenshot({ path: arquivo, type: 'jpeg', quality: 92, clip: { x: Number(x), y: Number(y), width: Number(w), height: Number(h) } });
await navegador.close();
console.log(arquivo);
