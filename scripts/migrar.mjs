// Aplica no banco as migrations de supabase/migrations que ainda não foram aplicadas.
// Uso: node scripts/migrar.mjs            (aplica as pendentes)
//      node scripts/migrar.mjs --listar   (só mostra o que já foi aplicado)
// Modelo: scripts/migrar.mjs do olharondoniense.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gestao, raiz, projeto, sql } from './env.mjs';

const pasta = join(raiz, 'supabase', 'migrations');
const arquivos = readdirSync(pasta).filter((f) => f.endsWith('.sql')).sort();
// O Supabase grava a versão com a hora em que aplicou; por isso a comparação é pelo nome.
const feitas = new Set((await gestao('/database/migrations')).map((m) => m.name));
const nome = (f) => f.replace(/\.sql$/, '').split('_').slice(1).join('_');

console.log(`projeto ${projeto}`);
if (process.argv.includes('--listar')) {
  for (const f of arquivos) console.log(feitas.has(nome(f)) ? 'aplicada ' : 'PENDENTE ', f);
  process.exit(0);
}

for (const f of arquivos) {
  const [versao, ...resto] = f.replace(/\.sql$/, '').split('_');
  if (feitas.has(nome(f))) continue;
  process.stdout.write(`aplicando ${f}... `);
  await gestao('/database/migrations', {
    method: 'POST',
    headers: { 'Idempotency-Key': `${versao}-${resto.join('_')}` },
    body: JSON.stringify({ query: readFileSync(join(pasta, f), 'utf8'), name: resto.join('_'), version: versao }),
  });
  console.log('ok');
}
// A API REST guarda a lista de tabelas e funções; sem este aviso, função nova dá 404 por um tempo.
await sql("notify pgrst, 'reload schema'");
console.log('banco em dia');
