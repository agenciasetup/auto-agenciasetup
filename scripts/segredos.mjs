// Grava segredos do Worker pela API da Cloudflare, lendo os valores do .env.local. Nunca imprime os valores.
// Use este script em vez de `wrangler secret put` no PowerShell: o terminal do Windows põe um BOM (U+FEFF)
// invisível na frente do valor, e a Meta recusa o app ("Esta página não está disponível").
// Uso: node scripts/segredos.mjs INSTAGRAM_APP_ID INSTAGRAM_APP_SECRET
import { env, exige } from './env.mjs';

const nomes = process.argv.slice(2).map((n) => n.toUpperCase());
if (!nomes.length) {
  console.error('Diga quais segredos gravar. Ex.: node scripts/segredos.mjs INSTAGRAM_APP_ID INSTAGRAM_APP_SECRET');
  process.exit(1);
}
exige('CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_EMAIL', 'CLOUDFLARE_API_KEY', ...nomes);

const limpo = (v) => String(v).replace(/^﻿/, '').trim();
const base = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/agenciasetup/secrets`;
const headers = { 'X-Auth-Email': env.CLOUDFLARE_EMAIL, 'X-Auth-Key': env.CLOUDFLARE_API_KEY, 'Content-Type': 'application/json' };

let falhou = false;
for (const nome of nomes) {
  const r = await fetch(base, { method: 'PUT', headers, body: JSON.stringify({ name: nome, text: limpo(env[nome]), type: 'secret_text' }) });
  const d = await r.json().catch(() => ({}));
  if (d.success) console.log(`${nome}: gravado no Worker.`);
  else { falhou = true; console.error(`${nome}: falhou (${r.status}) ${JSON.stringify(d.errors || d).slice(0, 300)}`); }
}
process.exit(falhou ? 1 : 0);
