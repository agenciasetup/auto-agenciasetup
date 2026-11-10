// Monta a folha de quadros do Calango de pixel para a tela Escritório do painel.
// Entrada: os 8 quadros que já existem em templates/carrossel/imagens/calango-pixel-q1..q8.png (1068 x 1268).
// Saída: admin/src/img/escritorio-calango.webp, com os 8 quadros lado a lado (cada um 96 x 114), sem suavizar o pixel.
// Uso: node scripts/escritorio-calango.mjs. Trocou a arte? Rode de novo e depois npm run painel.
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const QUADROS = 8;
const L = 96;
const A = 114;
const pecas = [];
for (let i = 1; i <= QUADROS; i++) {
  const buf = await sharp(`templates/carrossel/imagens/calango-pixel-q${i}.png`)
    .resize(L, A, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'nearest' })
    .png()
    .toBuffer();
  pecas.push({ input: buf, left: (i - 1) * L, top: 0 });
}
mkdirSync('admin/src/img', { recursive: true });
const saida = 'admin/src/img/escritorio-calango.webp';
const info = await sharp({ create: { width: L * QUADROS, height: A, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(pecas)
  .webp({ lossless: true })
  .toFile(saida);
console.log(`${saida}: ${info.width} x ${info.height}, ${info.size} bytes, ${QUADROS} quadros de ${L} x ${A}`);
