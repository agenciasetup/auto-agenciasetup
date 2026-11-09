// Lista os clientes do Asaas e se as notificações estão ligadas. Com --desligar, marca notificationDisabled em todos.
// A chave vem da integração cifrada no banco e nunca é impressa.
import { decifrar } from '../worker/nucleo/cripto.js';
import { env, sql } from './env.mjs';

const [linha] = await sql(`select valor from config where chave = 'asaas'`);
const v = (linha && linha.valor) || {};
const cifrada = v.chave || v.api || v.token;
if (!cifrada) { console.log('campos da config asaas:', Object.keys(v).join(', ')); process.exit(1); }
const k = (await decifrar(env, cifrada)).valor;
const base = /^\$aact_hmlg/.test(k) ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';
const api = async (c, o = {}) => { const r = await fetch(`${base}${c}`, { ...o, headers: { access_token: k, 'Content-Type': 'application/json', 'User-Agent': 'agenciasetup' } }); return { status: r.status, d: await r.json().catch(() => null) }; };

const todos = [];
for (let off = 0; ; off += 100) {
  const { d } = await api(`/customers?limit=100&offset=${off}`);
  todos.push(...((d && d.data) || []));
  if (!d || !d.hasMore) break;
}
const desligar = process.argv.includes('--desligar');
let ligados = 0, mudados = 0;
for (const c of todos) {
  if (!c.notificationDisabled) ligados++;
  if (desligar && !c.notificationDisabled) {
    const r = await api(`/customers/${c.id}`, { method: 'POST', body: JSON.stringify({ notificationDisabled: true }) });
    if (r.status === 200 && r.d && r.d.notificationDisabled) mudados++;
    else console.log(`falhou ${c.id}: ${r.status} ${JSON.stringify(r.d && r.d.errors)}`);
  }
}
console.log(`clientes: ${todos.length} | com notificação ligada antes: ${ligados}${desligar ? ` | desligados agora: ${mudados}` : ''}`);
