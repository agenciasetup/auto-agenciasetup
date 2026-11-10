// Recorta os bonecos do Escritório de IA de uma folha gerada no Magnific (quatro Calangos em fila sobre fundo lilás):
// tira a moldura da captura, o fundo e a sombra, separa cada boneco e grava um por arquivo, todos na mesma escala e
// com os pés na mesma linha, em _local/escritorio/bonecos-verde/<id>.webp (sentado: <id>-sentado). O id é o do agente (o perfil e a planta procuram
// o boneco pelo id). A arte é imagem gerada e fica fora do Git. Depois: scripts/escritorio-cores.mjs (a cor do setor) e scripts/escritorio-arte.mjs (sobe).
//   node scripts/escritorio-bonecos.mjs <captura.png> <id1,id2,id3,id4>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [entrada, lista] = process.argv.slice(2);
const ids = String(lista || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!entrada || !ids.length) { console.error('uso: node scripts/escritorio-bonecos.mjs <captura.png> <id1,id2,id3,id4>'); process.exit(1); }

const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const cor = (k) => [data[k * 4], data[k * 4 + 1], data[k * 4 + 2]];
// Lilás do fundo e da sombra (um lilás mais escuro): azul acima do vermelho e do verde, e os dois parecidos.
const lilas = ([r, g, b]) => b > 150 && r > 105 && g > 100 && b - Math.max(r, g) > 14 && Math.abs(r - g) < 26;
const claro = ([r, g, b]) => b > 190 && r > 150 && g > 150 && b - Math.min(r, g) > 18;

// 1) O quadrado lilás dentro da moldura escura da captura.
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (claro(cor(y * W + x))) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
if (x1 <= x0) { console.error('não achei o fundo lilás'); process.exit(1); }

// 2) Fundo e sombra: todo lilás ligado à borda do quadrado.
const fora = new Uint8Array(W * H);
let fila = [];
const tenta = (x, y) => { if (x < x0 || x > x1 || y < y0 || y > y1) return; const k = y * W + x; if (fora[k] || !lilas(cor(k))) return; fora[k] = 1; fila.push(k); };
for (let x = x0; x <= x1; x++) { tenta(x, y0); tenta(x, y1); }
for (let y = y0; y <= y1; y++) { tenta(x0, y); tenta(x1, y); }
while (fila.length) { const k = fila.pop(); const x = k % W; const y = (k - x) / W; tenta(x + 1, y); tenta(x - 1, y); tenta(x, y + 1); tenta(x, y - 1); }
// O lilás preso dentro do boneco (entre o fone e a cabeça, no meio do rabo enrolado) não toca a borda: sai pela cor,
// quando é quase igual à média do fundo.
let sr = 0, sg = 0, sb = 0, sn = 0;
for (let k = 0; k < W * H; k += 7) if (fora[k] && claro(cor(k))) { const c = cor(k); sr += c[0]; sg += c[1]; sb += c[2]; sn++; }
const media = sn ? [sr / sn, sg / sn, sb / sn] : [186, 182, 236];
for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
  const k = y * W + x;
  if (fora[k]) continue;
  const c = cor(k);
  if (Math.abs(c[0] - media[0]) + Math.abs(c[1] - media[1]) + Math.abs(c[2] - media[2]) < 36) fora[k] = 1;
}
const cheio = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1 && !fora[y * W + x];

// 3) Cada boneco é uma ilha de pontos cheios. Ficam as maiores, da esquerda para a direita.
const rotulo = new Int32Array(W * H);
const ilhas = [];
for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
  const k = y * W + x;
  if (rotulo[k] || !cheio(x, y)) continue;
  const n = ilhas.length + 1;
  const ilha = { n, area: 0, a0: x, a1: x, b0: y, b1: y };
  fila = [k]; rotulo[k] = n;
  while (fila.length) {
    const q = fila.pop(); const qx = q % W; const qy = (q - qx) / W;
    ilha.area++;
    if (qx < ilha.a0) ilha.a0 = qx; if (qx > ilha.a1) ilha.a1 = qx; if (qy < ilha.b0) ilha.b0 = qy; if (qy > ilha.b1) ilha.b1 = qy;
    for (const [vx, vy] of [[qx + 1, qy], [qx - 1, qy], [qx, qy + 1], [qx, qy - 1], [qx + 1, qy + 1], [qx - 1, qy - 1], [qx + 1, qy - 1], [qx - 1, qy + 1]]) {
      if (vx < x0 || vx > x1 || vy < y0 || vy > y1) continue;
      const v = vy * W + vx;
      if (!rotulo[v] && cheio(vx, vy)) { rotulo[v] = n; fila.push(v); }
    }
  }
  ilhas.push(ilha);
}
const grandes = ilhas.sort((a, b) => b.area - a.area).slice(0, ids.length).sort((a, b) => a.a0 - b.a0);
if (grandes.length < ids.length) { console.error(`achei ${grandes.length} boneco(s), esperava ${ids.length}`); process.exit(1); }

// 4) Mesma escala para todos (a do mais alto da folha vira ALTURA) e os pés na base, no meio da largura.
const ALTURA = 236, LARGURA = 220, CHAO = 4;
const maisAlto = Math.max(...grandes.map((i) => i.b1 - i.b0 + 1));
const escala = ALTURA / maisAlto;
const pasta = '_local/escritorio/bonecos-verde'; // verdes, como saem do Magnific; scripts/escritorio-cores.mjs pinta pela sala
fs.mkdirSync(pasta, { recursive: true });
for (let i = 0; i < ids.length; i++) {
  const g = grandes[i];
  const l = g.a1 - g.a0 + 1; const a = g.b1 - g.b0 + 1;
  const recorte = Buffer.alloc(l * a * 4);
  for (let y = 0; y < a; y++) for (let x = 0; x < l; x++) {
    const k = (g.b0 + y) * W + (g.a0 + x);
    if (rotulo[k] !== g.n) continue; // só a ilha deste boneco: pedaço do vizinho não entra
    const d = (y * l + x) * 4;
    recorte[d] = data[k * 4]; recorte[d + 1] = data[k * 4 + 1]; recorte[d + 2] = data[k * 4 + 2]; recorte[d + 3] = 255;
  }
  const nl = Math.min(LARGURA, Math.max(1, Math.round(l * escala))); const na = Math.max(1, Math.round(a * escala));
  const peca = await sharp(recorte, { raw: { width: l, height: a, channels: 4 } }).resize(nl, na, { kernel: 'lanczos3' }).png().toBuffer();
  const saida = path.join(pasta, `${ids[i]}.webp`);
  await sharp({ create: { width: LARGURA, height: ALTURA + CHAO, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: peca, left: Math.round((LARGURA - nl) / 2), top: ALTURA - na }]).webp({ quality: 92, alphaQuality: 100 }).toFile(saida);
  console.log(`${saida}: ${nl} x ${na} (área ${g.area})`);
}
