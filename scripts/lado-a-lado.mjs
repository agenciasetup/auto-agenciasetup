// Põe imagens lado a lado, na mesma altura, para comparar (ex.: a foto real do Filipe e as geradas, antes de usar).
// Uso: node scripts/lado-a-lado.mjs <imagem> <imagem> [mais imagens...] [--saida arquivo.jpg] [--altura 900]
// Sai em _local/lado-a-lado.jpg (ou no --saida).
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { raiz } from './env.mjs';

const args = process.argv.slice(2);
const opcao = (k, padrao) => { const i = args.indexOf(k); if (i < 0) return padrao; const v = args[i + 1]; args.splice(i, 2); return v; };
const saida = resolve(opcao('--saida', join(raiz, '_local', 'lado-a-lado.jpg')));
const altura = Number(opcao('--altura', 900));
const imagens = args.map((a) => resolve(a));
if (imagens.length < 2 || imagens.some((i) => !existsSync(i))) {
  console.error('Uso: node scripts/lado-a-lado.mjs <imagem> <imagem> [mais...] [--saida arquivo.jpg] [--altura 900] (todas precisam existir)');
  process.exit(1);
}
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((c) => existsSync(c));
mkdirSync(dirname(saida), { recursive: true });
const html = join(raiz, '_local', 'lado-a-lado.html');
writeFileSync(html, `<!doctype html><body style="margin:0;background:#111;display:flex;gap:10px;padding:10px;width:max-content">
${imagens.map((i) => `<figure style="margin:0"><img src="${pathToFileURL(i).href}" style="height:${altura}px;display:block"><figcaption style="color:#ccc;font:16px sans-serif;margin-top:6px">${i.split(/[\\/]/).pop()}</figcaption></figure>`).join('')}
</body>`);
const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
const pagina = await navegador.newPage();
await pagina.setViewport({ width: 800, height: altura + 60 });
await pagina.goto(pathToFileURL(html).href, { waitUntil: 'networkidle0' });
await pagina.screenshot({ path: saida, type: 'jpeg', quality: 90, fullPage: true });
await navegador.close();
console.log(saida);
