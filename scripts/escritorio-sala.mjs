// Prepara uma sala do Escritório de IA para a tela: tira a moldura escura da captura, apaga o fundo lilás (fica
// transparente, só a sala) e grava em _local/escritorio/salas/<sala>.webp. As salas são geradas no Magnific (ilimitado)
// e não entram no Git: sobem para o bucket "midia" com scripts/escritorio-arte.mjs.
//   node scripts/escritorio-sala.mjs <captura.png> <sala> [--caixa x,y,l,a]
// Todas as salas usam a mesma caixa (a da Direção), para o chão cair no mesmo lugar em todas: é o que deixa os
// bonecos andarem com as mesmas coordenadas em qualquer sala.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [entrada, sala] = process.argv.slice(2);
const iCaixa = process.argv.indexOf('--caixa');
const fixa = iCaixa > 0 ? process.argv[iCaixa + 1].split(',').map(Number) : null;
if (!entrada || !sala) { console.error('uso: node scripts/escritorio-sala.mjs <captura.png> <sala> [--caixa x,y,l,a]'); process.exit(1); }
const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const px = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const lilas = ([r, g, b]) => b > 190 && r > 150 && g > 150 && b - Math.min(r, g) > 18 && Math.abs(r - g) < 22;

// 1) O quadrado lilás dentro da moldura escura.
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (lilas(px(x, y))) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
if (x1 <= x0) { console.error('não achei o fundo lilás'); process.exit(1); }

// 2) Enche o fundo a partir das bordas do quadrado: só o lilás ligado à borda some (o lilás de dentro da sala fica).
const fora = new Uint8Array(W * H);
const fila = [];
const tenta = (x, y) => { if (x < x0 || x > x1 || y < y0 || y > y1) return; const k = y * W + x; if (fora[k]) return; if (!lilas(px(x, y))) return; fora[k] = 1; fila.push(k); };
for (let x = x0; x <= x1; x++) { tenta(x, y0); tenta(x, y1); }
for (let y = y0; y <= y1; y++) { tenta(x0, y); tenta(x1, y); }
while (fila.length) { const k = fila.pop(); const x = k % W; const y = (k - x) / W; tenta(x + 1, y); tenta(x - 1, y); tenta(x, y + 1); tenta(x, y - 1); }
let a0 = W, b0 = H, a1 = 0, b1 = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const k = y * W + x; const dentro = x >= x0 && x <= x1 && y >= y0 && y <= y1 && !fora[k];
  data[k * 4 + 3] = dentro ? 255 : 0;
  if (dentro) { if (x < a0) a0 = x; if (x > a1) a1 = x; if (y < b0) b0 = y; if (y > b1) b1 = y; }
}
// 3) Recorta na sala com uma folga igual dos quatro lados e grava.
const folga = 12;
const caixa = fixa ? { left: fixa[0], top: fixa[1], width: fixa[2], height: fixa[3] } : { left: Math.max(0, a0 - folga), top: Math.max(0, b0 - folga), width: Math.min(W, a1 + folga) - Math.max(0, a0 - folga), height: Math.min(H, b1 + folga) - Math.max(0, b0 - folga) };
const pasta = '_local/escritorio/salas';
fs.mkdirSync(pasta, { recursive: true });
const saida = path.join(pasta, `${sala}.webp`);
await sharp(data, { raw: { width: W, height: H, channels: 4 } }).extract(caixa).webp({ quality: 92, alphaQuality: 100 }).toFile(saida);
const m = await sharp(saida).metadata();
console.log(`caixa ${caixa.left},${caixa.top},${caixa.width},${caixa.height}`);
console.log(`${saida}: ${m.width} x ${m.height}, ${Math.round(fs.statSync(saida).size / 1024)} KB`);
