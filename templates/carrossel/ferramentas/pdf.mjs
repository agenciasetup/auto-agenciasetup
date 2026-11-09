// Material grátis em PDF (A4), no visual da Agência Setup, a partir de um Markdown de materiais/.
// Uso: node templates/carrossel/ferramentas/pdf.mjs <arquivo.md> <saida.pdf>
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { markdown } from '../../../worker/nucleo/util.js';

const [md, saida] = process.argv.slice(2);
const raiz = join(import.meta.dirname, '..', '..', '..');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((c) => existsSync(c));
const logo = `data:image/png;base64,${readFileSync(join(raiz, 'public', 'img', 'logo-setup-128.png')).toString('base64')}`;
// O título (# ...) vira h1 aqui: o markdown() do site começa no ##, porque a página já tem o título.
const texto = readFileSync(md, 'utf8').split(String.fromCharCode(13)).join('');
const titulo = (texto.match(/^# (.+)$/m) || [])[1] || '';
const corpo = `${titulo ? `<h1>${titulo}</h1>` : ''}${markdown(texto.replace(/^# .+$/m, ''))}`;
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;600&family=Outfit:wght@300;400;600;700&display=block" rel="stylesheet">
<style>
  @page { size: A4; margin: 22mm 18mm 20mm; }
  body { background: #fff; font-family: 'Outfit', sans-serif; font-weight: 300; font-size: 11.5pt; line-height: 1.55; color: #1c1c1c; }
  .topo { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; font-size: 10pt; color: #666; }
  .topo img { width: 28px; height: 28px; }
  .topo b { color: #1c1c1c; font-weight: 600; }
  h1 { font-family: 'Anton', sans-serif; font-weight: 400; text-transform: uppercase; font-size: 34pt; line-height: 1.02; letter-spacing: 0.005em; margin: 0 0 10px; }
  h1 + p { font-size: 13pt; color: #444; }
  h2 { font-weight: 600; font-size: 15pt; margin: 26px 0 8px; padding-top: 14px; border-top: 1px solid #eee; }
  h2::before { content: ''; display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 10px; background: linear-gradient(140deg, #ffb000, #ff6a00); vertical-align: 1px; }
  strong { font-weight: 600; }
  em { font-family: 'Instrument Serif', serif; font-size: 1.15em; color: #f06000; }
  pre { background: #19191b; color: #f5f1ea; border-radius: 12px; padding: 14px 16px; white-space: pre-wrap; font-family: 'JetBrains Mono', monospace; font-size: 9.2pt; line-height: 1.55; page-break-inside: avoid; }
  code { font-family: 'JetBrains Mono', monospace; font-size: 0.9em; }
  p code, li code { background: #f3f1ec; padding: 1px 5px; border-radius: 5px; }
  ul, ol { padding-left: 20px; } li { margin: 3px 0; }
  a { color: #f06000; }
  .fim { margin-top: 30px; padding: 16px 18px; border-radius: 14px; background: linear-gradient(140deg, #ffe27a, #ffbf1a 55%, #ff9a1f); color: #1d1305; font-size: 11pt; }
</style></head><body>
<div class="topo"><img src="${logo}" alt=""><span><b>Agência Setup</b> | material grátis | @agenciasetup</span></div>
${corpo}
<div class="fim">Gostou? Me conta no direct da <b>@agenciasetup</b> o que você fez com ele. 🦎</div>
</body></html>`;
const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true });
const pagina = await navegador.newPage();
await pagina.setContent(html, { waitUntil: 'networkidle0' });
await pagina.evaluate(async () => { await document.fonts.ready; });
if (process.env.PREVIA) { await pagina.setViewport({ width: 794, height: 1123 }); await pagina.screenshot({ path: process.env.PREVIA, fullPage: true }); }
await pagina.pdf({ path: saida, format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '18mm', left: '18mm', right: '18mm' } });
await navegador.close();
console.log(saida);
