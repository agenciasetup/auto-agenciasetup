// Convida alguém para o painel (usado para o primeiro administrador; depois, convide pelo painel em Equipe).
// Cria a linha da equipe e um link de convite (não manda e-mail: o link aparece aqui para você enviar).
// Uso: node scripts/convidar.mjs email@dominio "Nome" administrador|editor|redator
import { env, exige, sql } from './env.mjs';

exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY');
const [email, nome, papel = 'administrador'] = process.argv.slice(2);
if (!email || !nome || !['administrador', 'editor', 'redator'].includes(papel)) {
  console.error('Uso: node scripts/convidar.mjs email "Nome" administrador|editor|redator');
  process.exit(1);
}
const e = email.trim().toLowerCase();
const s = (t) => t.replace(/'/g, "''");
await sql(`insert into equipe (email, nome, papel) values ('${s(e)}', '${s(nome)}', '${papel}')
  on conflict (email) do update set nome = excluded.nome, papel = excluded.papel, ativo = true`);

async function link(tipo) {
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SECRET_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ type: tipo, email: e }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.msg || j.message || JSON.stringify(j));
  return j.hashed_token || (j.properties && j.properties.hashed_token);
}
let tipo = 'invite';
let hash;
try { hash = await link('invite'); } catch { tipo = 'recovery'; hash = await link('recovery'); }
const base = (process.argv.includes('--local') ? 'http://localhost:8787' : 'https://agenciasetup.com.br');
console.log(`${nome} (${papel}) está na equipe. Link de ${tipo === 'invite' ? 'convite' : 'acesso'} (vale 24 horas, uso único):`);
console.log(`${base}/admin/entrar?token=${encodeURIComponent(hash)}&tipo=${tipo}`);
