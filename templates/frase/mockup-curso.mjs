// Foto da página de venda do mini curso para o mockup do card de oferta (o notebook do post de frase).
// Uso: node templates/frase/mockup-curso.mjs  ->  templates/frase/imagens/curso-tela.jpg (1440 x 900, o topo da página)
// Rode de novo quando a página de venda mudar (título, VSL, preço).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((c) => existsSync(c));
const saida = join(import.meta.dirname, 'imagens', 'curso-tela.jpg');
const nav = await puppeteer.launch({ executablePath: CHROME, headless: true });
const p = await nav.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await p.goto('https://agenciasetup.com.br/cursos/posts-automaticos', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));
await p.screenshot({ path: saida, type: 'jpeg', quality: 92 });
await nav.close();
console.log('mockup:', saida);
