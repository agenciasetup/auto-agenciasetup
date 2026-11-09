// Stripe: a venda em dólar do curso em inglês (pedido do dono em 29/10/2026). Mesma interface do Asaas.
// A pessoa paga na página segura do Stripe (Checkout Session): cartão, Apple Pay, Google Pay e Link. O número do cartão
// nunca passa por aqui. A conta é a da Agência Setup LTDA (Brasil): cobra em US$ e o Stripe repassa em real.
// Chave em STRIPE_CHAVE (do painel, Integrações > Stripe, cifrada no banco; no computador, a chave de teste no .dev.vars).
// sk_live_/rk_live_ fala com a produção; sk_test_/rk_test_, com o modo de teste. O aviso (webhook) chega assinado com
// STRIPE_AVISO_SEGREDO (whsec_), conferido em conferirAviso. Conferido na documentação em 10/2026 (docs.stripe.com/api).
import { Erro } from '../nucleo/util.js';

const API = 'https://api.stripe.com/v1';
export const nome = 'stripe';
export const producao = (chave) => /^(sk|rk)_live_/.test(chave || '');

// O Stripe recebe o corpo como formulário, com colchetes para os campos aninhados (line_items[0][price_data][currency]).
function formulario(obj, prefixo = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const chave = prefixo ? `${prefixo}[${k}]` : k;
    if (typeof v === 'object') formulario(v, chave, out);
    else out.append(chave, String(v));
  }
  return out;
}

async function pedirCom(chave, caminho, { metodo = 'GET', corpo, idem } = {}) {
  let r;
  try {
    r = await fetch(`${API}${caminho}`, {
      method: metodo,
      signal: AbortSignal.timeout(20_000),
      headers: {
        Authorization: `Bearer ${chave}`, 'Stripe-Version': '2024-06-20',
        ...(corpo ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        ...(idem ? { 'Idempotency-Key': idem } : {}),
      },
      body: corpo ? formulario(corpo) : undefined,
    });
  } catch {
    throw new Erro(502, 'Não consegui falar com o Stripe agora. Tente de novo em instantes.');
  }
  const d = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = (d && d.error && d.error.message) || `Stripe respondeu ${r.status}`;
    console.error('stripe', r.status, caminho.split('?')[0], msg.slice(0, 300));
    throw new Erro(r.status >= 500 ? 502 : 400, msg.slice(0, 300), { provedor: 'stripe' });
  }
  return d;
}

function pedir(env, caminho, opcoes) {
  if (!env.STRIPE_CHAVE) throw new Erro(503, 'O pagamento em dólar ainda não está configurado.');
  return pedirCom(env.STRIPE_CHAVE, caminho, opcoes);
}

// O que é nosso leva este prefixo (igual ao do Asaas), na referência e nos metadados.
export const MARCA = 'setup:';

// Confere uma chave nova antes de guardar: o nome da conta, o país e se é produção. A chave restrita (rk_) pode não ler a
// conta: aí vale ela conseguir listar as sessões do Checkout, que é o que a venda usa.
export async function testarChave(chave) {
  try {
    const c = await pedirCom(chave, '/account');
    return { nome: (c.business_profile && c.business_profile.name) || (c.settings && c.settings.dashboard && c.settings.dashboard.display_name) || '', email: c.email || '', pais: c.country || '', moeda: c.default_currency || '', producao: producao(chave) };
  } catch (e) {
    if (!/^rk_/.test(chave)) throw e;
    await pedirCom(chave, '/checkout/sessions?limit=1');
    return { nome: 'chave restrita', email: '', pais: '', moeda: '', producao: producao(chave) };
  }
}

// Os avisos que a venda usa. Cadastrados pelo painel (Integrações > Stripe > Ligar o aviso).
export const EVENTOS_AVISO = [
  'checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed',
  'checkout.session.expired', 'charge.refunded', 'charge.dispute.created',
];

// Cria ou atualiza o nosso aviso (pela URL). O segredo de assinatura só vem quando o aviso nasce: quem chama guarda cifrado.
export async function configurarAviso(env, { url }) {
  const lista = await pedir(env, '/webhook_endpoints?limit=100');
  const ja = ((lista && lista.data) || []).find((w) => w.url === url);
  const corpo = { url, enabled_events: EVENTOS_AVISO, description: 'Area de membros Agencia Setup (curso em ingles)' };
  if (ja) {
    const w = await pedir(env, `/webhook_endpoints/${ja.id}`, { metodo: 'POST', corpo: { ...corpo, disabled: false } });
    return { id: w.id, url: w.url, eventos: (w.enabled_events || []).length, ligado: w.status === 'enabled', novo: false, segredo: null };
  }
  const w = await pedir(env, '/webhook_endpoints', { metodo: 'POST', corpo });
  return { id: w.id, url: w.url, eventos: (w.enabled_events || []).length, ligado: w.status === 'enabled', novo: true, segredo: w.secret || null };
}

// Sem cadastro de cliente antes: o Checkout cria o dele com o e-mail. Fica um marcador, para o resto do sistema
// (alunos.asaas_cliente) não confundir com o cliente do Asaas.
export async function criarCliente() { return null; }

// A cobrança é a sessão do Checkout. Um item por linha do pedido (curso e extras), com o desconto já descontado do
// primeiro item (o preço é sempre calculado aqui, em lib/vendas.js). voltar: o obrigado; desistir: o checkout de novo.
export async function criarCobranca(env, { centavos, itens, moeda = 'usd', email, ref, voltar, desistir, idioma = 'en', numero }) {
  const linhas = (itens && itens.length ? itens : [{ nome: `Pedido ${numero || ''}`.trim(), centavos }]).map((i) => ({ nome: i.nome, centavos: i.centavos }));
  // O total pode ser menor que a soma (cupom, upgrade): a diferença sai do primeiro item, que é o curso.
  const soma = linhas.reduce((s, l) => s + l.centavos, 0);
  if (soma !== centavos) linhas[0].centavos -= soma - centavos;
  if (linhas.some((l) => l.centavos < 50)) throw new Erro(400, 'The order total is too low to charge.');
  const corpo = {
    mode: 'payment',
    customer_email: email || undefined,
    client_reference_id: ref,
    locale: idioma === 'en' ? 'en' : 'pt-BR',
    success_url: voltar,
    cancel_url: desistir || voltar,
    customer_creation: 'always',
    billing_address_collection: 'auto',
    metadata: { pedido: ref, sistema: 'setup' },
    payment_intent_data: { metadata: { pedido: ref, sistema: 'setup' }, description: linhas.map((l) => l.nome).join(' + ').slice(0, 300) },
    line_items: linhas.map((l) => ({ quantity: 1, price_data: { currency: moeda, unit_amount: l.centavos, product_data: { name: l.nome.slice(0, 250) } } })),
    expires_at: Math.floor(Date.now() / 1000) + 23 * 3600,
  };
  const s = await pedir(env, '/checkout/sessions', { metodo: 'POST', corpo, idem: `ck-${ref}-${centavos}-${Math.floor(Date.now() / 60_000)}` });
  return { id: s.id, parcelamento: null, link: s.url, status: s.status };
}

// Situação da sessão no formato que o resto do sistema já entende (o do Asaas): RECEIVED quando pago.
export async function lerCobranca(env, cobranca) {
  const s = await pedir(env, `/checkout/sessions/${encodeURIComponent(cobranca)}?expand[]=payment_intent.latest_charge`);
  const pi = s.payment_intent && typeof s.payment_intent === 'object' ? s.payment_intent : null;
  const charge = pi && pi.latest_charge && typeof pi.latest_charge === 'object' ? pi.latest_charge : null;
  const status = s.payment_status === 'paid' ? (charge && charge.refunded ? 'REFUNDED' : 'RECEIVED') : s.status === 'expired' ? 'OVERDUE' : 'PENDING';
  return { status, link: s.status === 'open' ? s.url : null, comprovante: (charge && charge.receipt_url) || null, intencao: pi ? pi.id : null, pedido: (s.metadata && s.metadata.pedido) || s.client_reference_id || null };
}

export async function qrPix() { throw new Erro(400, 'Pix is not available for payments in dollars.'); }

// Devolve tudo: pela intenção de pagamento da sessão.
export async function reembolsar(env, { cobranca }) {
  const s = await pedir(env, `/checkout/sessions/${encodeURIComponent(cobranca)}`);
  if (!s.payment_intent) throw new Erro(409, 'Esta compra não tem pagamento no Stripe para devolver.');
  return pedir(env, '/refunds', { metodo: 'POST', corpo: { payment_intent: s.payment_intent, metadata: { sistema: 'setup' } }, idem: `rf-${s.payment_intent}` });
}

// Sessão aberta que não serve mais (troca de forma, pedido vencido): expira, para ninguém pagar duas vezes.
export async function cancelar(env, cobranca) {
  const s = await pedir(env, `/checkout/sessions/${encodeURIComponent(cobranca)}`);
  if (s.status !== 'open') return { ok: true, ja: s.status };
  return pedir(env, `/checkout/sessions/${encodeURIComponent(cobranca)}/expire`, { metodo: 'POST', corpo: {} });
}

export async function lerCliente() { return { nome: '', cpf: '', celular: '' }; }
export async function atualizarCliente() {}

// ---------------------------------------------------------------- aviso (webhook)
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const iguais = (a, b) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

// Cabeçalho Stripe-Signature: t=<segundos>,v1=<hmac>[,v1=...]. Assinatura = HMAC-SHA256("<t>.<corpo>") com o whsec.
// Vale até 5 minutos de diferença no relógio (o padrão do Stripe).
export async function conferirAviso(env, corpoBruto, cabecalho) {
  const segredo = env.STRIPE_AVISO_SEGREDO;
  if (!segredo || !cabecalho) return false;
  const partes = String(cabecalho).split(',').map((p) => p.split('='));
  const t = (partes.find(([k]) => k === 't') || [])[1];
  const assinaturas = partes.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !assinaturas.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const esperado = hex(await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(`${t}.${new TextDecoder().decode(corpoBruto)}`)));
  return assinaturas.some((a) => iguais(a, esperado));
}

// O pedido de uma intenção de pagamento (reembolso e contestação chegam pela cobrança, sem o pedido).
async function pedidoDaIntencao(env, intencao) {
  if (!intencao) return null;
  const pi = await pedir(env, `/payment_intents/${encodeURIComponent(intencao)}`).catch(() => null);
  return pi && pi.metadata && pi.metadata.sistema === 'setup' ? pi.metadata.pedido || null : null;
}

// Traduz o evento do Stripe para o formato do aviso que lib/vendas.js já processa (o do Asaas). null: não é nosso ou
// não interessa. O id é o do evento do Stripe (o banco guarda cada um uma vez só).
export async function traduzirAviso(env, ev) {
  const o = (ev && ev.data && ev.data.object) || {};
  const nosso = (m) => m && m.sistema === 'setup' && m.pedido;
  let tipo = null, pedido = null, cobranca = null;
  if (ev.type.startsWith('checkout.session.')) {
    if (!nosso(o.metadata)) return null;
    pedido = o.metadata.pedido;
    cobranca = o.id;
    if (ev.type === 'checkout.session.completed') tipo = o.payment_status === 'paid' ? 'PAYMENT_CONFIRMED' : null;
    else if (ev.type === 'checkout.session.async_payment_succeeded') tipo = 'PAYMENT_CONFIRMED';
    else if (ev.type === 'checkout.session.async_payment_failed') tipo = 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED';
    else if (ev.type === 'checkout.session.expired') tipo = 'PAYMENT_OVERDUE';
  } else if (ev.type === 'charge.refunded') {
    // Só a devolução inteira tira o acesso; devolução de parte fica como está.
    if (!o.refunded) return null;
    pedido = nosso(o.metadata) ? o.metadata.pedido : await pedidoDaIntencao(env, o.payment_intent);
    tipo = 'PAYMENT_REFUNDED';
  } else if (ev.type === 'charge.dispute.created') {
    pedido = await pedidoDaIntencao(env, o.payment_intent);
    tipo = 'PAYMENT_CHARGEBACK_REQUESTED';
  }
  if (!tipo || !pedido) return null;
  return { id: ev.id, event: tipo, payment: { id: cobranca, externalReference: `${MARCA}${pedido}`, value: (o.amount_total || o.amount || 0) / 100 }, stripe: { tipo: ev.type, objeto: o.id, modo: ev.livemode ? 'producao' : 'teste' } };
}
