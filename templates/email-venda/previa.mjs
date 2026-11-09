// Monta as imagens dos e-mails de venda e a prévia de cada um, no celular.
// Uso: node templates/email-venda/previa.mjs
// Sai em _local/email-venda/: vitrine-leque.jpg e vitrine-grade.jpg (as imagens que vão no e-mail),
// email-N.html (o e-mail com um nome de exemplo) e email-N.jpg (a prévia em 420 px, como no celular).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { montar } from './emails.mjs';

const raiz = join(import.meta.dirname, '..', '..');
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((c) => existsSync(c));
const saida = join(raiz, '_local', 'email-venda');
mkdirSync(saida, { recursive: true });
const estilo = (n) => pathToFileURL(join(raiz, 'public', 'img', 'estilos', `${n}.webp`)).href;

// Leque: quatro capas abertas como cartas, sobre o preto com um brilho laranja embaixo.
const cartas = [['religioso-1', -330, 150, -10], ['elegante-1', 330, 150, 10], ['advogado-1', 110, 112, 3.5], ['setup-1', -110, 112, -3.5]];
const leque = `<!doctype html><html><body style="margin:0;width:1120px;height:640px;overflow:hidden;position:relative;
background:radial-gradient(ellipse 70% 60% at 50% 115%,rgba(255,122,0,.45),rgba(255,122,0,0) 70%),#0B0B0C">
${cartas.map(([n, x, y, r]) => `<img src="${estilo(n)}" style="position:absolute;width:320px;height:400px;object-fit:cover;left:${560 - 160 + x}px;top:${y}px;transform:rotate(${r}deg);border-radius:18px;box-shadow:0 30px 60px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.08)">`).join('')}
</body></html>`;

// Grade: as quatro capas 2 x 2 com o nicho embaixo de cada uma.
const nichos = [['setup-1', 'Social media'], ['advogado-1', 'Advocacia'], ['elegante-1', 'Marca pessoal'], ['religioso-1', 'Conteúdo católico']];
const grade = `<!doctype html><html><body style="margin:0;width:1120px;background:#0B0B0C;font-family:'Segoe UI',Arial,sans-serif">
<div style="display:grid;grid-template-columns:1fr 1fr;gap:28px 24px;padding:32px">
${nichos.map(([n, t]) => `<div><img src="${estilo(n)}" style="display:block;width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:16px;box-shadow:0 0 0 1px rgba(255,255,255,.08)">
<div style="margin-top:14px;font-size:26px;font-weight:700;color:#F5F1EA;text-align:center">${t}</div></div>`).join('')}
</div></body></html>`;

const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
const pagina = await navegador.newPage();

async function fotografar(html, arquivo, largura, altura) {
  const tmp = join(saida, `_${arquivo}.html`);
  writeFileSync(tmp, html);
  await pagina.setViewport({ width: largura, height: altura || 800, deviceScaleFactor: 1 });
  await pagina.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle0' });
  await pagina.screenshot({ path: join(saida, arquivo), type: 'jpeg', quality: 86, fullPage: !altura });
}

await fotografar(leque, 'vitrine-leque.jpg', 1120, 640);
await fotografar(grade, 'vitrine-grade.jpg', 1120);

const emails = montar({ img: pathToFileURL(saida).href + '/', nome: 'Lucas', sair: '#' });
await pagina.setViewport({ width: 420, height: 900, deviceScaleFactor: 2 });
for (const e of emails) {
  const html = join(saida, `${e.slug}.html`);
  writeFileSync(html, e.html);
  await pagina.goto(pathToFileURL(html).href, { waitUntil: 'networkidle0' });
  await pagina.screenshot({ path: join(saida, `${e.slug}.jpg`), type: 'jpeg', quality: 80, fullPage: true });
  console.log(`${e.slug}: ${e.assunto}`);
}
await navegador.close();
console.log(`Prévia em ${saida}`);
