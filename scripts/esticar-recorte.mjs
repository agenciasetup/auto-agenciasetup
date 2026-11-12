// Estica o braço de um recorte que termina num corte reto na borda da imagem (o dono, 11/11/2026: "o restante do braço
// morreu ali. Precisa chegar até o final pra não ficar esquisito"). O braço abre em leque a partir de um ponto (onde as
// duas bordas dele se encontrariam): cada ponto novo, além da borda, copia o ponto da imagem que está na mesma reta
// saindo desse vértice. As bordas continuam retas e o braço continua alargando, como na foto.
// Uso: node scripts/esticar-recorte.mjs <entrada.png> <saida.png> <quanto px> <vértice x> <vértice y>
// (só para o braço que sai pelo canto de cima à direita)
import sharp from 'sharp';
const [entrada, saida, qStr, axStr, ayStr] = process.argv.slice(2);
const E = Number(qStr), ax = Number(axStr), ay = Number(ayStr);
const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, m = 6;
const NW = W + E, NH = H + E;
const out = Buffer.alloc(NW * NH * 4);
const pega = (x, y) => {
  const x0 = Math.max(0, Math.min(W - 1, Math.floor(x))), y0 = Math.max(0, Math.min(H - 1, Math.floor(y)));
  const x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1), fx = Math.min(1, Math.max(0, x - x0)), fy = Math.min(1, Math.max(0, y - y0));
  const r = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const a = data[(y0 * W + x0) * 4 + c], b = data[(y0 * W + x1) * 4 + c], d = data[(y1 * W + x0) * 4 + c], e = data[(y1 * W + x1) * 4 + c];
    r[c] = (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy;
  }
  return r;
};
for (let Y = 0; Y < NH; Y++) for (let X = 0; X < NW; X++) {
  const x = X, y = Y - E; // na imagem antiga (a nova cresce para cima e para a direita)
  let sx = x, sy = y;
  if (x > W - 1 - m || y < m) {
    const kx = x > W - 1 - m ? (x - ax) / (W - 1 - m - ax) : 1, ky = y < m ? (ay - y) / (ay - m) : 1, k = Math.max(kx, ky, 1);
    sx = ax + (x - ax) / k; sy = ay + (y - ay) / k;
  }
  if (sx < 0 || sy < 0 || sx > W - 1 || sy > H - 1) continue;
  const p = pega(sx, sy), d = (Y * NW + X) * 4;
  out[d] = p[0]; out[d + 1] = p[1]; out[d + 2] = p[2]; out[d + 3] = p[3];
}
await sharp(out, { raw: { width: NW, height: NH, channels: 4 } }).png().toFile(saida);
console.log(saida.split(/[\/]/).pop(), NW + 'x' + NH);
