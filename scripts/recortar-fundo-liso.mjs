// Recorta o que está sobre um fundo liso (cinza) enchendo a partir das bordas: para quadro com moldura, que o recorte
// por modelo confunde com a pessoa pintada dentro. Uso: node scripts/recortar-fundo-liso.mjs <entrada> <saida.png>
import sharp from 'sharp';
const [entrada, saida] = process.argv.slice(2);
const { data, info } = await sharp(entrada).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, N = W * H;
const px = (i) => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
const cinza = (i) => { const [r, g, b] = px(i); return Math.max(r, g, b) - Math.min(r, g, b) <= 16; };
const fundo = new Uint8Array(N);
const fila = [];
const tenta = (i, de) => { if (fundo[i] || !cinza(i)) return; if (de >= 0) { const a = px(i), b = px(de); if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 14) return; } fundo[i] = 1; fila.push(i); };
for (let x = 0; x < W; x++) { tenta(x, -1); tenta((H - 1) * W + x, -1); }
for (let y = 0; y < H; y++) { tenta(y * W, -1); tenta(y * W + W - 1, -1); }
while (fila.length) { const i = fila.pop(); const x = i % W, y = (i - x) / W; if (x > 0) tenta(i - 1, i); if (x < W - 1) tenta(i + 1, i); if (y > 0) tenta(i - W, i); if (y < H - 1) tenta(i + W, i); }
// alfa: 0 no fundo, 255 no resto; come 1 px da borda (a franja cinza) e suaviza
const alfa = Buffer.alloc(N);
for (let i = 0; i < N; i++) alfa[i] = fundo[i] ? 0 : 255;
const suave = await sharp(alfa, { raw: { width: W, height: H, channels: 1 } }).blur(1.2).linear(2.2, -150).extractChannel(0).raw().toBuffer();
const out = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) { out[i * 4] = data[i * 3]; out[i * 4 + 1] = data[i * 3 + 1]; out[i * 4 + 2] = data[i * 3 + 2]; out[i * 4 + 3] = suave[i]; }
const img = sharp(out, { raw: { width: W, height: H, channels: 4 } }).png();
const t = await sharp(await img.toBuffer()).trim({ threshold: 1 }).png().toFile(saida);
console.log(saida, t.width + 'x' + t.height);
