// Capa deitada (1600 x 900) para a página do recurso no site: a capa do carrossel no meio e dois slides de dentro dos
// lados, sobre fundo escuro. A página corta imagem em pé; esta cabe inteira. Uso:
//   node templates/carrossel/ferramentas/capa-site.mjs <conteudo> <slide esquerda> <slide direita>
import sharp from 'sharp';
import { join } from 'node:path';

const raiz = join(import.meta.dirname, '..', '..', '..');
const [nome, esq = '2', dir = '3'] = process.argv.slice(2);
const pasta = join(raiz, '_local', 'carrossel', nome);
const slide = async (n, h) => sharp(join(pasta, `${String(n).padStart(2, '0')}.jpg`)).resize({ height: h }).toBuffer();
const lados = 560, meio = 820;
const [a, b, c] = await Promise.all([slide(esq, lados), slide(1, meio), slide(dir, lados)]);
const wl = Math.round(lados * 0.8), wm = Math.round(meio * 0.8);
const gap = 28, total = wl * 2 + wm + gap * 2, x0 = Math.round((1600 - total) / 2);
await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#0d0d0e' } })
  .composite([
    { input: a, left: x0, top: Math.round((900 - lados) / 2) },
    { input: c, left: x0 + wl + gap * 2 + wm, top: Math.round((900 - lados) / 2) },
    { input: b, left: x0 + wl + gap, top: Math.round((900 - meio) / 2) },
  ])
  .jpeg({ quality: 88 }).toFile(join(pasta, 'capa-site.jpg'));
console.log(join(pasta, 'capa-site.jpg'));
