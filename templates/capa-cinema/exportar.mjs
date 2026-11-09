// Fotografa as capas "cinema" em JPEG 1080 x 1350. Uso: node templates/capa-cinema/exportar.mjs [nome...] [--so foto]
// Sai em _local/capas-v2/<nome>.jpg.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { raiz } from '../../scripts/env.mjs';

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((c) => existsSync(c));
const args = process.argv.slice(2);
const so = args.includes('--so') ? args[args.indexOf('--so') + 1] : null;
// --etapas: também as 3 etapas da montagem (<nome>-etapa-1.jpg a -3), para o carrossel que mostra o processo.
const etapas = args.includes('--etapas');
const nomes = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--so');
const todos = ['posts-no-automatico', 'arte-bonita-com-ia', 'skill-social-media', 'vale-a-pena-claude', 'quatro-carrosseis-um-prompt'];
const pagina = pathToFileURL(join(raiz, 'templates', 'capa-cinema', 'capa.html')).href;
const nav = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
const p = await nav.newPage();
await p.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
for (const n of nomes.length ? nomes : todos) {
  for (const e of etapas ? [1, 2, 3, 4] : [4]) {
    await p.goto(`${pagina}?c=${n}${so ? `&so=${so}` : ''}&etapa=${e}`, { waitUntil: 'networkidle0' });
    await p.waitForFunction(() => window.PRONTO === true, { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 200));
    const saida = join(raiz, '_local', 'capas-v2', `${n}${so ? `-${so}` : ''}${e < 4 ? `-etapa-${e}` : ''}.jpg`);
    await p.screenshot({ path: saida, type: 'jpeg', quality: 93 });
    console.log(saida);
  }
}
await nav.close();
