// A capa montada aos poucos: fotografa o slide com &ate=<camada> (fundo, titulo, assunto, frente, acabamento), somando as
// camadas de baixo até aquela. Serve de prova "montei em etapas" num slide de dentro (09/11/2026: as etapas 1, 3 e final
// da mesma capa ficaram iguais no celular; a montagem camada por camada mostra a diferença).
// Uso: node templates/carrossel/ferramentas/capa-ate.mjs <conteudo> [slide=1] [camadas=fundo,titulo,assunto]
// Sai em templates/carrossel/imagens/<conteudo>-ate-<camada>.jpg (para usar na prova `galeria` de outro slide).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const raiz = join(import.meta.dirname, '..', '..', '..');
const [nome, slide = '1', lista = 'fundo,titulo,assunto'] = process.argv.slice(2);
if (!nome) { console.log('Uso: node templates/carrossel/ferramentas/capa-ate.mjs <conteudo> [slide] [camadas]'); process.exit(1); }
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((c) => existsSync(c));
const modelo = pathToFileURL(join(raiz, 'templates', 'carrossel', 'modelo.html')).href;
const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--font-render-hinting=none'] });
const pagina = await navegador.newPage();
await pagina.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
for (const camada of lista.split(',')) {
  await pagina.goto(`${modelo}?c=${nome}&s=${slide}&ate=${camada}`, { waitUntil: 'networkidle0' });
  await pagina.evaluate(async () => { await document.fonts.ready; });
  await pagina.waitForFunction(() => window.PRONTO === true, { timeout: 5000 }).catch(() => {});
  // A `frente` (a cópia do assunto que vaza a moldura) fica na camada de cima: antes da frente, ela não aparece.
  if (['fundo', 'titulo', 'assunto'].includes(camada)) await pagina.evaluate(() => document.querySelectorAll('.c5 > *').forEach((e) => { e.style.display = 'none'; }));
  await new Promise((r) => setTimeout(r, 300));
  const saida = join(raiz, 'templates', 'carrossel', 'imagens', `${nome}-ate-${camada}.jpg`);
  await pagina.screenshot({ path: saida, type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
  console.log(saida);
}
await navegador.close();
