// Sobe a arte do Escritório de IA (as salas e, quando existirem, os bonecos) para o bucket público "midia" e grava os
// endereços em config.escritorio_arte, que a tela Escritório lê. A arte é gerada no Magnific e fica fora do Git
// (_local/escritorio/). Pode rodar de novo: cada rodada troca a versão no endereço, para o navegador buscar a nova.
//   node scripts/escritorio-arte.mjs [--simular]
import fs from 'node:fs';
import path from 'node:path';
import { env, exige, sql } from './env.mjs';

exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY');
const k = env.SUPABASE_SECRET_KEY;
const simular = process.argv.includes('--simular');
const versao = Date.now().toString(36);
const pastas = { salas: '_local/escritorio/salas', bonecos: '_local/escritorio/bonecos' };

async function subir(caminho, arquivo) {
  if (simular) return;
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/midia/${caminho}`, {
    method: 'POST',
    headers: { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': 'image/webp', 'x-upsert': 'true', 'cache-control': 'max-age=31536000' },
    body: fs.readFileSync(arquivo),
  });
  if (!r.ok) throw new Error(`não subiu ${caminho}: ${r.status} ${(await r.text()).slice(0, 200)}`);
}

const arte = { versao, salas: {}, bonecos: {} };
for (const [tipo, pasta] of Object.entries(pastas)) {
  if (!fs.existsSync(pasta)) continue;
  for (const f of fs.readdirSync(pasta).filter((n) => /^[a-z0-9-]+\.webp$/.test(n)).sort()) {
    const id = f.replace(/\.webp$/, '');
    await subir(`escritorio/${tipo}/${f}`, path.join(pasta, f));
    arte[tipo][id] = `${env.SUPABASE_URL}/storage/v1/object/public/midia/escritorio/${tipo}/${f}?v=${versao}`;
    console.log(`${simular ? 'simulado' : 'subiu'} ${tipo}/${f}`);
  }
}
if (!simular) {
  const valor = JSON.stringify(arte).replace(/'/g, "''");
  await sql(`insert into config (chave, valor) values ('escritorio_arte', '${valor}'::jsonb) on conflict (chave) do update set valor = excluded.valor`);
}
console.log(`${Object.keys(arte.salas).length} sala(s) e ${Object.keys(arte.bonecos).length} boneco(s). Versão ${versao}.`);
