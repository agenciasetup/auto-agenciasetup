// Recorta o rosto de várias fotos (caixas relativas: cx, cy, largura) e põe lado a lado na mesma altura, para conferir a
// identidade do Filipe (olho, nariz, boca, testa, orelha esquerda). Uso:
//   node templates/carrossel/ferramentas/rostos.mjs saida.jpg foto1.png:cx,cy,w foto2.jpg:cx,cy,w ...
import sharp from 'sharp';
const [saida, ...itens] = process.argv.slice(2);
const ALT = 640;
const pecas = [];
for (const it of itens) {
  const i = it.lastIndexOf(':');
  const arq = it.slice(0, i);
  const [cx, cy, w] = it.slice(i + 1).split(',').map(Number);
  const m = await sharp(arq).metadata();
  const lw = Math.round(m.width * w), lh = Math.round(lw * 1.25);
  const left = Math.max(0, Math.min(m.width - lw, Math.round(m.width * cx - lw / 2)));
  const top = Math.max(0, Math.min(m.height - lh, Math.round(m.height * cy - lh / 2)));
  const buf = await sharp(arq).extract({ left, top, width: Math.min(lw, m.width - left), height: Math.min(lh, m.height - top) }).resize({ height: ALT }).jpeg().toBuffer();
  const mm = await sharp(buf).metadata();
  pecas.push({ buf, w: mm.width });
}
const total = pecas.reduce((a, p) => a + p.w + 8, 8);
let x = 8;
const comp = pecas.map((p) => { const o = { input: p.buf, left: x, top: 8 }; x += p.w + 8; return o; });
await sharp({ create: { width: total, height: ALT + 16, channels: 3, background: '#111' } }).composite(comp).jpeg({ quality: 90 }).toFile(saida);
console.log(saida);
