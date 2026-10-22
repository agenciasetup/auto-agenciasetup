// Lê o .env.local e o .dev.vars da raiz (fora do Git). Nunca imprime os valores.
// Modelo: scripts/env.mjs do olharondoniense.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

export const env = { ...process.env };
for (const arq of ['.env.local', '.dev.vars']) {
  const caminho = join(raiz, arq);
  if (!existsSync(caminho)) continue;
  for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    if (/^\s*#/.test(linha) || !linha.includes('=')) continue;
    const i = linha.indexOf('=');
    const nome = linha.slice(0, i).trim().toUpperCase().replace(/\s+/g, '_');
    const valor = linha.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (nome && valor && !env[nome]) env[nome] = valor;
  }
}

// O único banco deste projeto, anotado em .claude/supabase-projeto.
export const projeto = existsSync(join(raiz, '.claude', 'supabase-projeto'))
  ? readFileSync(join(raiz, '.claude', 'supabase-projeto'), 'utf8').trim()
  : '';
const doEndereco = (env.SUPABASE_URL || '').match(/^https:\/\/([a-z0-9]{20})\.supabase\.co/)?.[1];
if (!projeto || (doEndereco && doEndereco !== projeto)) {
  console.error('Parei: o projeto do Supabase não confere com .claude/supabase-projeto.');
  process.exit(1);
}

export function exige(...nomes) {
  const faltam = nomes.filter((n) => !env[n]);
  if (faltam.length) {
    console.error(`Faltam no .env.local: ${faltam.join(', ')}`);
    process.exit(1);
  }
}

// API de gestão do Supabase, pelo token da conta, sempre no projeto deste repositório.
export async function gestao(caminho, opcoes = {}) {
  exige('SUPABASE_ACCESS_TOKEN');
  const r = await fetch(`https://api.supabase.com/v1/projects/${projeto}${caminho}`, {
    ...opcoes,
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json', ...(opcoes.headers || {}) },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`API de gestão ${caminho} falhou (${r.status}): ${t.slice(0, 2000)}`);
  return t ? JSON.parse(t) : null;
}

export const sql = (query) => gestao('/database/query', { method: 'POST', body: JSON.stringify({ query }) });
