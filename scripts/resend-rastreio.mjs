// Rastreio do e-mail aberto e clicado (tela Suporte). Liga no Resend, pela API, o rastreio de abertura e de clique no
// domínio de envio e o aviso (webhook) que grava a hora de cada evento na tabela emails (rota /api/resend/webhook).
// Nunca imprime chave nem segredo.
//   node scripts/resend-rastreio.mjs situacao          o domínio (rastreio de abertura e de clique) e o webhook (ativo, eventos)
//   node scripts/resend-rastreio.mjs ligar             liga os dois rastreios no domínio, cria o webhook (ou acerta o que já
//                                                      existe) e guarda o segredo de assinatura cifrado em Integrações > Resend
//   node scripts/resend-rastreio.mjs testar [endereço] manda à rota (padrão http://localhost:8787) avisos sem assinatura, com
//                                                      assinatura errada e vencida (esperado 401) e um assinado (esperado 200)
//                                                      para um id que não existe; confere que nenhuma linha de emails mudou
// Chave: RESEND_CHAVE_ADMIN no .env.local (acesso total; a de Integrações é só de envio e não liga nada) ou a de Integrações.
// Segredo do teste: RESEND_WEBHOOK_SEGREDO do .dev.vars (Worker local) ou o guardado em Integrações (produção).
import { createHmac, randomUUID } from 'node:crypto';
import { cifrar, decifrar } from '../worker/nucleo/cripto.js';
import { env, sql } from './env.mjs';

const cmd = process.argv[2] || 'situacao';
const DOMINIO = 'envio.agenciasetup.com.br';
const ENDPOINT = 'https://agenciasetup.com.br/api/resend/webhook';
const EVENTOS = ['email.delivered', 'email.opened', 'email.clicked', 'email.bounced', 'email.complained'];
const txt = (v) => `'${String(v).replace(/'/g, "''")}'`;

async function lerConfig() {
  const [linha] = await sql(`select valor from config where chave = 'email'`);
  return (linha && linha.valor) || null;
}

async function chave(cfg) {
  if (env.RESEND_CHAVE_ADMIN) return { chave: env.RESEND_CHAVE_ADMIN, de: 'RESEND_CHAVE_ADMIN do .env.local' };
  if (env.RESEND_CHAVE) return { chave: env.RESEND_CHAVE, de: 'RESEND_CHAVE do .env.local' };
  if (cfg && cfg.chave) return { chave: (await decifrar(env, cfg.chave)).valor, de: 'Integrações > Resend' };
  console.log('Falta a chave do Resend: ponha RESEND_CHAVE_ADMIN (acesso total) no .env.local.');
  process.exit(1);
}

function api(k) {
  return async (caminho, opcoes = {}) => {
    const r = await fetch(`https://api.resend.com${caminho}`, { ...opcoes, headers: { Authorization: `Bearer ${k}`, 'Content-Type': 'application/json', ...(opcoes.headers || {}) } });
    const t = await r.text();
    let d = null;
    try { d = t ? JSON.parse(t) : null; } catch { d = null; }
    if (!r.ok) {
      const nome = (d && d.name) || '';
      if (r.status === 401 && /restricted/.test(nome)) {
        throw new Error('A chave do Resend é só de envio ("Sending access"): ela não lê nem muda domínio e webhook. Crie uma chave de acesso total no Resend (API Keys > Create, "Full access") e ponha como RESEND_CHAVE_ADMIN no .env.local.');
      }
      throw new Error(`Resend ${r.status} em ${caminho}: ${(d && d.message) || t.slice(0, 200)}`);
    }
    return d;
  };
}

async function acharDominio(resend) {
  const lista = await resend('/domains');
  const d = (lista.data || []).find((x) => x.name === DOMINIO);
  if (!d) throw new Error(`O domínio ${DOMINIO} não está no Resend.`);
  return resend(`/domains/${d.id}`);
}

async function acharWebhook(resend) {
  const lista = await resend('/webhooks');
  const w = (lista.data || []).find((x) => x.endpoint === ENDPOINT);
  return w ? resend(`/webhooks/${w.id}`) : null;
}

const sim = (v) => (v === true ? 'ligado' : v === false ? 'desligado' : 'o Resend não informou');

async function situacao() {
  const cfg = await lerConfig();
  const k = await chave(cfg);
  const resend = api(k.chave);
  console.log(`chave: ${k.de}`);
  const d = await acharDominio(resend);
  console.log(`domínio ${d.name}: ${d.status}, região ${d.region || '-'}`);
  console.log(`  rastreio de abertura: ${sim(d.open_tracking)}`);
  console.log(`  rastreio de clique:   ${sim(d.click_tracking)}`);
  const w = await acharWebhook(resend);
  if (!w) console.log(`webhook: nenhum para ${ENDPOINT}`);
  else {
    const faltam = EVENTOS.filter((e) => !(w.events || []).includes(e));
    console.log(`webhook ${w.id}: ${w.status === 'enabled' ? 'ativo' : w.status}, ${ENDPOINT}`);
    console.log(`  eventos: ${(w.events || []).join(', ')}${faltam.length ? ` (faltam: ${faltam.join(', ')})` : ''}`);
  }
  const guardado = !!(cfg && cfg.webhook);
  const confere = guardado && w && w.signing_secret ? (await decifrar(env, cfg.webhook)).valor === w.signing_secret : null;
  console.log(`segredo de assinatura em Integrações: ${guardado ? (confere === false ? 'guardado, mas diferente do webhook (rode ligar)' : 'guardado') : 'não guardado'}`);
  console.log(`rastreio desde: ${(cfg && cfg.rastreio_desde) || '-'}`);
}

async function ligar() {
  const cfg = await lerConfig();
  if (!cfg) throw new Error('Não há configuração do Resend em Integrações (config "email").');
  const k = await chave(cfg);
  const resend = api(k.chave);
  const d = await acharDominio(resend);
  await resend(`/domains/${d.id}`, { method: 'PATCH', body: JSON.stringify({ open_tracking: true, click_tracking: true }) });
  console.log(`domínio ${d.name}: rastreio de abertura e de clique ligados.`);

  let w = await acharWebhook(resend);
  let segredo;
  if (w) {
    await resend(`/webhooks/${w.id}`, { method: 'PATCH', body: JSON.stringify({ endpoint: ENDPOINT, events: EVENTOS, status: 'enabled' }) });
    w = await resend(`/webhooks/${w.id}`);
    segredo = w.signing_secret;
    console.log(`webhook ${w.id}: já existia; eventos e estado acertados.`);
  } else {
    const novo = await resend('/webhooks', { method: 'POST', body: JSON.stringify({ endpoint: ENDPOINT, events: EVENTOS }) });
    w = novo;
    segredo = novo.signing_secret || (await resend(`/webhooks/${novo.id}`)).signing_secret;
    console.log(`webhook ${novo.id}: criado.`);
  }
  if (!segredo || !/^whsec_/.test(segredo)) throw new Error('O Resend não devolveu o segredo de assinatura do webhook.');
  const cifrado = await cifrar(env, { valor: segredo });
  const desde = cfg.rastreio_desde || new Date().toISOString();
  await sql(`update config set valor = valor || jsonb_build_object('webhook', ${txt(cifrado)}::text, 'webhook_id', ${txt(w.id)}::text, 'rastreio_desde', ${txt(desde)}::text) where chave = 'email'`);
  console.log(`segredo de assinatura guardado cifrado em Integrações > Resend. Rastreio desde ${desde}.`);
}

async function testar() {
  const base = (process.argv[3] || 'http://localhost:8787').replace(/\/$/, '');
  let segredo = env.RESEND_WEBHOOK_SEGREDO;
  if (!segredo || !/localhost|127\.0\.0\.1/.test(base)) {
    const cfg = await lerConfig();
    if (!cfg || !cfg.webhook) throw new Error('Não há segredo do webhook guardado em Integrações (rode ligar).');
    segredo = (await decifrar(env, cfg.webhook)).valor;
  }
  const url = `${base}/api/resend/webhook`;
  const idFalso = `teste-${randomUUID()}`;
  const corpo = JSON.stringify({ type: 'email.opened', created_at: new Date().toISOString(), data: { email_id: idFalso } });
  const assinar = (id, ts, c) => `v1,${createHmac('sha256', Buffer.from(segredo.replace(/^whsec_/, ''), 'base64')).update(`${id}.${ts}.${c}`).digest('base64')}`;
  const agora = Math.floor(Date.now() / 1000);
  const mandar = (h) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: corpo }).then((r) => r.status);
  const antes = (await sql(`select count(*)::int as n, max(greatest(entregue_em, aberto_em, clicado_em, devolvido_em, spam_em)) as ultimo from emails`))[0];
  const casos = [
    ['sem assinatura', {}, 401],
    ['assinatura errada', { 'svix-id': 'msg_teste', 'svix-timestamp': String(agora), 'svix-signature': 'v1,AAAA' }, 401],
    ['assinatura vencida (10 min)', { 'svix-id': 'msg_teste', 'svix-timestamp': String(agora - 600), 'svix-signature': assinar('msg_teste', agora - 600, corpo) }, 401],
    ['assinada certa, id que não existe', { 'svix-id': 'msg_teste', 'svix-timestamp': String(agora), 'svix-signature': `v1,xxxx ${assinar('msg_teste', agora, corpo)}` }, 200],
  ];
  let falhou = false;
  for (const [nome, h, esperado] of casos) {
    const s = await mandar(h);
    if (s !== esperado) falhou = true;
    console.log(`${s === esperado ? 'ok  ' : 'FALHOU'} ${nome}: ${s} (esperado ${esperado})`);
  }
  await new Promise((r) => setTimeout(r, 2500));
  const depois = (await sql(`select count(*)::int as n, max(greatest(entregue_em, aberto_em, clicado_em, devolvido_em, spam_em)) as ultimo from emails`))[0];
  const comId = (await sql(`select count(*)::int as n from emails where resend_id = ${txt(idFalso)}`))[0].n;
  const intacto = antes.n === depois.n && String(antes.ultimo) === String(depois.ultimo) && comId === 0;
  if (!intacto) falhou = true;
  console.log(`${intacto ? 'ok  ' : 'FALHOU'} nenhuma linha de emails mudou (${depois.n} linhas; id do teste em ${comId})`);
  process.exit(falhou ? 1 : 0);
}

try {
  if (cmd === 'situacao') await situacao();
  else if (cmd === 'ligar') { await ligar(); console.log(''); await situacao(); }
  else if (cmd === 'testar') await testar();
  else { console.log('Use: situacao | ligar | testar [endereço]'); process.exit(1); }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
