// Grava docs/estilo-instagram.md no banco (config.estilo), de onde o conector do Claude lê (ver_estilo).
// Rode de novo sempre que o guia mudar: node scripts/estilo.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { raiz, sql } from './env.mjs';

const guia = readFileSync(join(raiz, 'docs', 'estilo-instagram.md'), 'utf8');
const valor = JSON.stringify({ atualizado: new Date().toISOString().slice(0, 10), guia_md: guia }).replace(/'/g, "''");
await sql(`insert into config (chave, valor) values ('estilo', '${valor}'::jsonb)
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()`);
console.log(`guia de estilo gravado (${guia.length} caracteres)`);
