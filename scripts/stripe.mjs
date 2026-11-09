// Stripe (venda em dólar do curso em inglês). Nunca imprime chave nem segredo.
//   node scripts/stripe.mjs situacao          a conta (nome, país, produção ou teste), o aviso (webhook) e o que o painel guarda
//   node scripts/stripe.mjs aviso             cria o aviso para https://agenciasetup.com.br/api/stripe/aviso (ou acerta o que
//                                             existe) e guarda o segredo de assinatura cifrado em Integrações > Stripe
//   node scripts/stripe.mjs testar [endereço] manda à rota (padrão http://localhost:8787) um aviso sem assinatura (esperado
//                                             401) e um assinado de um evento que não é nosso (esperado 200, ignorado)
// Chave: a de Integrações > Stripe (cifrada no banco; produção) ou STRIPE_CHAVE_TESTE do .env.local (modo de teste).
// Segredo do teste: STRIPE_AVISO_SEGREDO do .dev.vars (Worker local) ou o guardado em Integrações (produção).
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cifrar, decifrar } from '../worker/nucleo/cripto.js';
import { env, raiz, sql } from './env.mjs';

const cmd = process.argv[2] || 'situacao';
const ENDPOINT = 'https://agenciasetup.com.br/api/stripe/aviso';
const EVENTOS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired', 'charge.refunded', 'charge.dispute.created'];
const txt = (v) => `'${String(v).replace(/'/g, "''")}'`;

async function lerConfig() {
  const [linha] = await sql(`select valor from config where chave = 'stripe'`);
  return (linha && linha.valor) || null;
}
async function chave(cfg) {
  if (cfg && cfg.chave) return { chave: (await decifrar(env, cfg.chave)).valor, de: 'Integrações > Stripe' };
  if (env.STRIPE_CHAVE_TESTE) return { chave: env.STRIPE_CHAVE_TESTE, de: 'STRIPE_CHAVE_TESTE do .env.local ' };
  console.log('Falta a chave do Stripe: cole a chave restrita (rk_live_) no painel, em Integrações > Stripe.');
  process.exit(1);
}
const corpo = (o, p = '', out = new URLSearchParams()) => {
  for (const [k, v] of Object.entries(o)) {
    const c = p ? `${p}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => out.append(`${c}[${i}]`, x));
    else if (v && typeof v === 'object') corpo(v, c, out);
    else if (v != null) out.append(c, String(v));
  }
  return out;
};
function api(k) {
  return async (caminho, metodo = 'GET', dados = null) => {
    const r = await fetch(`https://api.stripe.com/v1${caminho}`, { method: metodo, headers: { Authorization: `Bearer ${k}`, 'Stripe-Version': '2024-06-20', ...(dados ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) }, body: dados ? corpo(dados) : undefined });
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error(`Stripe ${r.status}: ${(d && d.error && d.error.message) || ''}`);
    return d;
  };
}

const cfg = await lerConfig();
const { chave: k, de } = await chave(cfg);
const stripe = api(k);
const producao = /^(sk|rk)_live_/.test(k);

if (cmd === 'situacao') {
  console.log(`Chave: ${de} (${producao ? 'produção' : 'modo de teste'})`);
  // A chave restrita (rk_) não lê a conta: aí só o aviso e o painel.
  const conta = await stripe('/account').catch(() => null);
  if (conta) console.log(`Conta: ${(conta.business_profile && conta.business_profile.name) || conta.settings?.dashboard?.display_name || '?'} · país ${conta.country} · moeda ${conta.default_currency} · cobranças ${conta.charges_enabled ? 'liberadas' : 'NÃO liberadas'} · repasses ${conta.payouts_enabled ? 'liberados' : 'NÃO liberados'}`);
  else console.log('Conta: a chave restrita não lê os dados da conta (normal).');
  const ws = await stripe('/webhook_endpoints?limit=100');
  const w = (ws.data || []).find((x) => x.url === ENDPOINT);
  console.log(w ? `Aviso: ${w.status}, ${w.enabled_events.length} eventos (${EVENTOS.every((e) => w.enabled_events.includes(e)) ? 'todos os que a venda usa' : 'FALTAM eventos'})` : `Aviso: não existe para ${ENDPOINT} (rode: node scripts/stripe.mjs aviso)`);
  console.log(`Painel: chave ${cfg && cfg.chave ? 'guardada' : 'não guardada'}, segredo do aviso ${cfg && cfg.aviso ? 'guardado' : 'não guardado'}`);
} else if (cmd === 'aviso') {
  if (!producao) console.log('Atenção: chave de TESTE. O aviso criado vale só para o modo de teste do Stripe.');
  const ws = await stripe('/webhook_endpoints?limit=100');
  const ja = (ws.data || []).find((x) => x.url === ENDPOINT);
  let segredo = null;
  if (ja) {
    await stripe(`/webhook_endpoints/${ja.id}`, 'POST', { enabled_events: EVENTOS, disabled: 'false' });
    console.log(`Aviso já existia (${ja.id}): eventos acertados.${cfg && cfg.aviso ? ' O segredo guardado continua.' : ' O Stripe só mostra o segredo quando o aviso nasce: copie o "Signing secret" do aviso no painel do Stripe e cole em Integrações > Stripe.'}`);
  } else {
    const w = await stripe('/webhook_endpoints', 'POST', { url: ENDPOINT, enabled_events: EVENTOS, description: 'Area de membros Agencia Setup (curso em ingles)' });
    segredo = w.secret;
    console.log(`Aviso criado (${w.id}) com ${w.enabled_events.length} eventos.`);
  }
  if (segredo) {
    const valor = { ...(cfg || {}), aviso: await cifrar(env, { valor: segredo }), salva_em: new Date().toISOString() };
    await sql(`insert into config (chave, valor) values ('stripe', ${txt(JSON.stringify(valor))}::jsonb) on conflict (chave) do update set valor = excluded.valor`);
    console.log('Segredo de assinatura guardado cifrado em Integrações > Stripe. O Worker no ar lê em até 5 minutos.');
  }
} else if (cmd === 'testar') {
  const base = (process.argv[3] || 'http://localhost:8787').replace(/\/+$/, '');
  let segredo = null;
  try { segredo = (readFileSync(join(raiz, '.dev.vars'), 'utf8').match(/^STRIPE_AVISO_SEGREDO=(.+)$/m) || [])[1]?.trim() || null; } catch {}
  if (!base.includes('localhost') && cfg && cfg.aviso) segredo = (await decifrar(env, cfg.aviso)).valor;
  if (!segredo) { console.log('Falta o segredo do aviso (.dev.vars ou Integrações).'); process.exit(1); }
  const ev = JSON.stringify({ id: `evt_teste_${Date.now()}`, type: 'checkout.session.completed', livemode: false, data: { object: { id: 'cs_test_nao_existe', payment_status: 'paid', metadata: {} } } });
  const sem = await fetch(`${base}/api/stripe/aviso`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: ev });
  const t = Math.floor(Date.now() / 1000);
  const assinatura = createHmac('sha256', segredo).update(`${t}.${ev}`).digest('hex');
  const com = await fetch(`${base}/api/stripe/aviso`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': `t=${t},v1=${assinatura}` }, body: ev });
  const errada = await fetch(`${base}/api/stripe/aviso`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': `t=${t},v1=${'0'.repeat(64)}` }, body: ev });
  console.log(`sem assinatura: ${sem.status} (esperado 401) · assinatura errada: ${errada.status} (esperado 401) · assinado, evento que não é nosso: ${com.status} ${JSON.stringify(await com.json().catch(() => ({})))} (esperado 200, ignorado)`);
} else {
  console.log('Comandos: situacao, aviso, testar [endereço]');
}
