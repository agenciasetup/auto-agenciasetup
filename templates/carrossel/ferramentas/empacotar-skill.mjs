// Empacota uma pasta de skill em <nome>.skill (zip com <nome>/SKILL.md, <nome>/references/...), no formato do
// empacotador do skill-creator (o mesmo de scripts/skill.mjs). Uso: node templates/carrossel/ferramentas/empacotar-skill.mjs <pasta> <saida.skill>
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

const [pasta, saida] = process.argv.slice(2);
const nome = basename(pasta);
const arquivos = [];
(function andar(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) andar(p); else arquivos.push(p); } })(pasta);

const partes = [], centrais = [];
let offset = 0;
for (const p of arquivos) {
  const dados = readFileSync(p);
  const n = Buffer.from(`${nome}/${relative(pasta, p).split(sep).join('/')}`, 'utf8'), comp = deflateRawSync(dados), crc = crc32(dados);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
  local.writeUInt16LE(0, 10); local.writeUInt16LE(0x21, 12); local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(dados.length, 22); local.writeUInt16LE(n.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(8, 10); central.writeUInt16LE(0, 12); central.writeUInt16LE(0x21, 14); central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(comp.length, 20); central.writeUInt32LE(dados.length, 24); central.writeUInt16LE(n.length, 28);
  central.writeUInt32LE(offset, 42);
  partes.push(local, n, comp);
  centrais.push(central, n);
  offset += 30 + n.length + comp.length;
}
const dir = Buffer.concat(centrais), fim = Buffer.alloc(22);
fim.writeUInt32LE(0x06054b50, 0); fim.writeUInt16LE(arquivos.length, 8); fim.writeUInt16LE(arquivos.length, 10);
fim.writeUInt32LE(dir.length, 12); fim.writeUInt32LE(offset, 16);
const pacote = Buffer.concat([...partes, dir, fim]);
writeFileSync(saida, pacote);
console.log(`${saida}: ${arquivos.length} arquivos, ${pacote.length} bytes`);
