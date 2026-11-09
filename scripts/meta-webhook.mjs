// Liga o aviso na hora da Meta para o "Comenta X" (como no Olhar de Fé): inscreve o endereço do webhook no app da
// Meta (objeto instagram, campos comments, messages e messaging_postbacks, este o toque nos botões do direct) e liga
// os avisos na conta do Instagram conectada.
// Uso: node scripts/meta-webhook.mjs [situacao]
// Segredos do .env.local (META_APP_ID, META_APP_SECRET, CRIPTO_CHAVE); a credencial da conta é decifrada aqui dentro.
// Nada secreto é impresso.
import { env, sql } from './env.mjs';
import { decifrar } from '../worker/nucleo/cripto.js';

const GRAPH = 'https://graph.facebook.com/v21.0';
const IG = 'https://graph.instagram.com/v21.0';
const ENDERECO = 'https://agenciasetup.com.br/api/redes/meta/webhook';
const appToken = `${env.META_APP_ID}|${String(env.META_APP_SECRET || '').trim()}`;
const verificacao = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`webhook-meta:${env.CRIPTO_CHAVE}`)))].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
const ver = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { texto: t.slice(0, 200) }; } };

const so = process.argv[2] === 'situacao';
if (!so) {
  const r = await ver(await fetch(`${GRAPH}/${env.META_APP_ID}/subscriptions`, { method: 'POST', body: new URLSearchParams({ object: 'instagram', callback_url: ENDERECO, fields: 'comments,messages,messaging_postbacks', include_values: 'true', verify_token: verificacao, access_token: appToken }) }));
  console.log('app inscrito no objeto instagram:', JSON.stringify(r));
}
const lista = await ver(await fetch(`${GRAPH}/${env.META_APP_ID}/subscriptions?access_token=${encodeURIComponent(appToken)}`));
console.log('inscrições do app:', JSON.stringify((lista.data || []).map((s) => ({ objeto: s.object, endereco: s.callback_url, ativa: s.active, campos: (s.fields || []).map((f) => f.name) }))), lista.error ? JSON.stringify(lista.error) : '');

// Todas as contas ativas, de cada perfil (o do Brasil e o em inglês): cada uma liga os avisos dela.
for (const c of await sql(`select conta_nome, perfil, credenciais from conexoes where plataforma = 'instagram' and status = 'ativa' order by criado_em`)) {
  const cred = await decifrar(env, c.credenciais);
  if (!so) {
    const r = await ver(await fetch(`${IG}/me/subscribed_apps?subscribed_fields=comments,messages,messaging_postbacks&access_token=${encodeURIComponent(cred.token)}`, { method: 'POST' }));
    console.log(`conta do Instagram ${c.conta_nome} (${c.perfil}) ligada aos avisos:`, JSON.stringify(r));
  }
  const s = await ver(await fetch(`${IG}/me/subscribed_apps?access_token=${encodeURIComponent(cred.token)}`));
  console.log(`avisos da conta ${c.conta_nome} (${c.perfil}):`, JSON.stringify(s.data || s.error || s));
}

// O caminho do Olhar de Fé: a Página ligada ao Instagram, pelo login do Facebook. Por ele a Meta manda os comentários
// do Instagram no acesso padrão (pelo login do Instagram, só com Acesso Avançado). A conexão da Página precisa de
// pages_manage_metadata e instagram_manage_comments: depois de mudar a configuração do login, reconecte a Página.
for (const p of await sql(`select conta_id, conta_nome, perfil, credenciais from conexoes where plataforma = 'facebook' and status = 'ativa' order by criado_em`)) {
  const pc = await decifrar(env, p.credenciais);
  if (!so) {
    const r = await ver(await fetch(`${GRAPH}/${p.conta_id}/subscribed_apps`, { method: 'POST', body: new URLSearchParams({ subscribed_fields: 'feed,messages,messaging_postbacks', access_token: pc.token }) }));
    console.log(`Página ${p.conta_nome} (${p.perfil}) ligada aos avisos:`, JSON.stringify(r));
  }
  const s2 = await ver(await fetch(`${GRAPH}/${p.conta_id}/subscribed_apps?access_token=${encodeURIComponent(pc.token)}`));
  console.log(`avisos da Página ${p.conta_nome} (${p.perfil}):`, JSON.stringify(s2.data || s2.error || s2));
}
