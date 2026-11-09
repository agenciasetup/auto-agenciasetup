// A capa de um carrossel por etapas, somando as camadas: só o fundo, + o título, + o assunto (sem efeito) e a final.
// É o que o post "arte bonita com IA" mostra sendo montado. Uso: node templates/carrossel/ferramentas/etapas.mjs <conteudo>
// Sai em _local/carrossel/<conteudo>/etapas/ (1-fundo.jpg, 2-titulo.jpg, 3-assunto.jpg, 4-final.jpg).
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const raiz = join(import.meta.dirname, '..', '..', '..');
const nome = process.argv[2];
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((c) => existsSync(c));
const modelo = pathToFileURL(join(raiz, 'templates', 'carrossel', 'modelo.html')).href;
const saida = join(raiz, '_local', 'carrossel', nome, 'etapas');
mkdirSync(saida, { recursive: true });
const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--font-render-hinting=none'] });
const pagina = await navegador.newPage();
await pagina.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
for (const [arq, q] of [['1-fundo', 'ate=fundo&etapa=1'], ['2-titulo', 'ate=titulo&etapa=1'], ['3-assunto', 'ate=assunto&etapa=1'], ['4-final', 'etapa=5']]) {
  await pagina.goto(`${modelo}?c=${nome}&s=1&${q}`, { waitUntil: 'networkidle0' });
  await pagina.evaluate(async () => { await document.fonts.ready; });
  await pagina.waitForFunction(() => window.PRONTO === true, { timeout: 5000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 300));
  await pagina.screenshot({ path: join(saida, `${arq}.jpg`), type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
  console.log(`  ${arq}.jpg`);
}
await navegador.close();
