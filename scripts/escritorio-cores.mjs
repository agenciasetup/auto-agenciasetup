// Pinta cada Calango do Escritório de IA com a cor do setor dele (a cor da parede, um pouco mais clara): lê os bonecos
// verdes de _local/escritorio/bonecos-verde/ (saída de scripts/escritorio-bonecos.mjs), troca só o verde da pele pela
// cor da sala do agente e grava em _local/escritorio/bonecos/, que scripts/escritorio-arte.mjs sobe. Roupa, olho e
// objeto ficam como estão. Vendas é a sala verde: lá o Calango continua verde.
//   node scripts/escritorio-cores.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { sql } from './env.mjs';

// tom (graus), quanto de cor fica (multiplica a saturação) e quanto clareia (soma na luz, de -1 a 1)
const COR = {
  vendas: null,
  direcao: { tom: 50, cor: 1.6, luz: 0.11 },
  conteudo: { tom: 206, cor: 0.95, luz: 0.07 },
  video: { tom: 4, cor: 1.35, luz: 0.09 },
  design: { tom: 26, cor: 1.7, luz: 0.1 },
  sistema: { tom: 215, cor: 0.14, luz: 0.05 },
  produto: { tom: 183, cor: 1.1, luz: 0.04 },
  receita: { tom: 42, cor: 1.35, luz: 0 },
};

function paraHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function paraRgb(h, s, l) {
  const f = (n) => { const k = (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return [f(0), f(8), f(4)];
}
const limite = (v) => Math.max(0, Math.min(1, v));

const entrada = '_local/escritorio/bonecos-verde';
const saida = '_local/escritorio/bonecos';
if (!fs.existsSync(entrada)) { console.error(`falta a pasta ${entrada}`); process.exit(1); }
fs.mkdirSync(saida, { recursive: true });
const salas = Object.fromEntries((await sql('select id, sala from agentes')).map((a) => [a.id, a.sala]));

let feitos = 0;
for (const f of fs.readdirSync(entrada).filter((n) => n.endsWith('.webp')).sort()) {
  const id = f.replace(/-sentado\.webp$|\.webp$/, '');
  const alvo = COR[salas[id] || 'vendas'];
  const { data, info } = await sharp(path.join(entrada, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (alvo) {
    for (let k = 0; k < data.length; k += 4) {
      if (data[k + 3] < 8) continue;
      const [h, s, l] = paraHsl(data[k], data[k + 1], data[k + 2]);
      if (h < 62 || h > 170 || s < 0.3) continue; // só o verde da pele (e o contorno verde-escuro)
      const [r, g, b] = paraRgb(alvo.tom, limite(s * alvo.cor), limite(l + alvo.luz * (0.4 + l)));
      data[k] = r; data[k + 1] = g; data[k + 2] = b;
    }
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(saida, f));
  feitos++;
}
console.log(`${feitos} boneco(s) pintado(s) pela sala. Agora: node scripts/escritorio-arte.mjs`);
