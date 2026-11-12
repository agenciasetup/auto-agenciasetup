// Separa um recorte com várias peças soltas (PNG com transparência) em um PNG por peça, pela ordem de leitura.
// Uso: node scripts/separar-recortes.mjs <recorte.png> <pasta-saida> <prefixo>
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
const [entrada, pasta, prefixo] = process.argv.slice(2);
fs.mkdirSync(pasta, { recursive: true });
const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const rot = new Int32Array(W * H);
const caixas = [];
for (let i = 0; i < W * H; i++) {
  if (rot[i] || data[i * 4 + 3] < 40) continue;
  const id = caixas.length + 1; const c = { x0: W, y0: H, x1: 0, y1: 0, n: 0 }; const fila = [i]; rot[i] = id;
  while (fila.length) { const j = fila.pop(); const x = j % W, y = (j - x) / W; c.n++; if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
    for (const k of [j - 1, j + 1, j - W, j + W]) { if (k < 0 || k >= W * H || rot[k] || data[k * 4 + 3] < 40) continue; if ((k === j - 1 && x === 0) || (k === j + 1 && x === W - 1)) continue; rot[k] = id; fila.push(k); } }
  caixas.push({ id, ...c });
}
const grandes = caixas.filter((c) => c.n > 1500).sort((a, b) => (Math.round(a.y0 / 300) - Math.round(b.y0 / 300)) || (a.x0 - b.x0));
let n = 0;
for (const c of grandes) {
  n++; const m = 6; const x0 = Math.max(0, c.x0 - m), y0 = Math.max(0, c.y0 - m), w = Math.min(W, c.x1 + m + 1) - x0, h = Math.min(H, c.y1 + m + 1) - y0;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = (y0 + y) * W + (x0 + x); const d = (y * w + x) * 4; const meu = rot[s] === c.id || rot[s] === 0; out[d] = data[s * 4]; out[d + 1] = data[s * 4 + 1]; out[d + 2] = data[s * 4 + 2]; out[d + 3] = meu ? data[s * 4 + 3] : 0; }
  const f = path.join(pasta, `${prefixo}-${n}.png`);
  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(f);
  console.log(f.split(/[\/]/).pop(), w + 'x' + h);
}
