// Asaas: cliente, cobrança (Pix ou cartão na página segura do Asaas), QR do Pix, reembolso e cancelamento.
// Conferido na documentação em 10/2026 (docs.asaas.com). Chave em ASAAS_CHAVE (do painel, cifrada no banco, ou segredo
// do Worker; ver pagamento/index.js). Chave $aact_prod_ fala com a produção; $aact_hmlg_, com o sandbox.
// O número do cartão nunca passa por aqui: no caminho B do plano, a pessoa digita o cartão na página do Asaas (invoiceUrl).
import { Erro, hoje } from '../nucleo/util.js';

const baseDa = (chave) => (/^\$aact_prod_/.test(chave || '') ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3');

async function pedirCom(chave, caminho, opcoes = {}) {
  let r;
  try {
    r = await fetch(`${baseDa(chave)}${caminho}`, {
      ...opcoes,
      signal: AbortSignal.timeout(20_000),
      headers: { access_token: chave, 'Content-Type': 'application/json', 'User-Agent': 'AgenciaSetup/1.0 (+https://agenciasetup.com.br)', ...(opcoes.headers || {}) },
    });
  } catch {
    throw new Erro(502, 'Não consegui falar com o Asaas agora. Tente de novo em instantes.');
  }
  const t = await r.text();
  let d = null;
  try { d = t ? JSON.parse(t) : null; } catch { d = null; }
  if (!r.ok) {
    const msg = (d && d.errors && d.errors.map((e) => e.description).join(' ')) || `Asaas respondeu ${r.status}`;
    console.error('asaas', r.status, caminho.split('?')[0], msg.slice(0, 300));
    throw new Erro(r.status >= 500 ? 502 : 400, msg.slice(0, 300), { provedor: 'asaas' });
  }
  return d;
}

function pedir(env, caminho, opcoes = {}) {
  if (!env.ASAAS_CHAVE) throw new Erro(503, 'O pagamento ainda não está configurado.');
  return pedirCom(env.ASAAS_CHAVE, caminho, opcoes);
}

export const nome = 'asaas';

// Os avisos (webhooks) que a área de membros usa. Cadastrados pelo painel (Área de membros > Pagamento).
export const EVENTOS_AVISO = [
  'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_APPROVED_BY_RISK_ANALYSIS', 'PAYMENT_REFUNDED', 'PAYMENT_OVERDUE', 'PAYMENT_DELETED',
  'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE', 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
  'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED', 'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
];

// Confere uma chave nova antes de guardar: devolve a situação e o nome da conta.
export async function testarChave(chave) {
  const [status, info] = await Promise.all([pedirCom(chave, '/myAccount/status'), pedirCom(chave, '/myAccount/commercialInfo').catch(() => ({}))]);
  return { status, nome: info.companyName || info.name || '', email: info.email || '', producao: /^\$aact_prod_/.test(chave) };
}

// Cria ou atualiza o nosso aviso (pela URL; os avisos de outros sites da conta ficam como estão).
export async function configurarAviso(env, { url, token, email }) {
  const corpo = {
    name: 'Area de membros Agencia Setup', url, email, enabled: true, interrupted: false, apiVersion: 3,
    authToken: token, sendType: 'SEQUENTIALLY', events: EVENTOS_AVISO,
  };
  const lista = await pedir(env, '/webhooks?limit=100');
  const ja = ((lista && lista.data) || []).find((w) => w.url === url);
  const w = ja ? await pedir(env, `/webhooks/${ja.id}`, { method: 'PUT', body: JSON.stringify(corpo) }) : await pedir(env, '/webhooks', { method: 'POST', body: JSON.stringify(corpo) });
  return { id: w.id, url: w.url, eventos: (w.events || []).length, ligado: !!w.enabled, novo: !ja };
}

// A conta do Asaas é a mesma do Veritas Dei: o Asaas manda os avisos de todas as cobranças para todos os sites.
// Tudo o que é nosso leva este prefixo no externalReference; aviso sem ele não é nosso (lib/api/checkout.js).
export const MARCA = 'setup:';
// O Asaas recusa travessão e outros caracteres especiais na descrição (aprendido no Veritas): vai sem acento.
const semAcento = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();

// PONTO ÚNICO do cliente estrangeiro (quem mora fora do Brasil, sem CPF). Docs: docs.asaas.com/reference/criar-novo-cliente
// ("Para cadastrar um pagador estrangeiro, informe foreignCustomer: true"; em produção depende de liberação na conta).
// O Asaas confirmou (atendimento, protocolo 1921730): só cartão internacional de crédito ou débito, só à vista, cobrança
// avulsa pela API. FALTA a resposta do Asaas sobre o cpfCnpj (a referência ainda lista o campo como obrigatório): por ora
// vai omitido. O celular também fica fora (não sabemos se o Asaas aceita número de fora); ele mora em alunos.celular.
// Quando o Asaas responder, ajuste só aqui.
function corpoClienteEstrangeiro({ nome: n, email, pais, ref }) {
  return {
    name: n, email, foreignCustomer: true,
    // cpfCnpj: omitido de propósito até a resposta do Asaas (protocolo 1921730).
    observations: pais ? `Mora fora do Brasil: ${semAcento(pais)}` : undefined,
    externalReference: `${MARCA}aluno:${ref}`, notificationDisabled: true,
  };
}

export async function criarCliente(env, { nome: n, email, cpf, celular, ref, estrangeiro = false, pais = null }) {
  const c = await pedir(env, '/customers', {
    method: 'POST',
    // Os avisos do Asaas para o cliente ficam desligados: quem avisa somos nós (e-mail da casa).
    body: JSON.stringify(estrangeiro
      ? corpoClienteEstrangeiro({ nome: n, email, pais, ref })
      : { name: n, email, cpfCnpj: cpf, mobilePhone: celular || undefined, externalReference: `${MARCA}aluno:${ref}`, notificationDisabled: true }),
  });
  return c.id;
}

// metodo 'pix' ou 'cartao'. Cartão parcelado: parcelas > 1 e o valor de cada parcela (já com juros).
export async function criarCobranca(env, { cliente, metodo, centavos, parcelas = 1, parcelaCentavos, descricao, ref, voltar }) {
  const corpo = {
    customer: cliente,
    billingType: metodo === 'pix' ? 'PIX' : 'CREDIT_CARD',
    dueDate: hoje(),
    description: semAcento(descricao).slice(0, 500),
    externalReference: `${MARCA}${ref}`,
  };
  if (metodo === 'cartao' && parcelas > 1) {
    corpo.installmentCount = parcelas;
    corpo.installmentValue = parcelaCentavos / 100;
  } else {
    corpo.value = centavos / 100;
  }
  // Depois de pagar na página do Asaas, a pessoa volta para a nossa tela de obrigado.
  if (voltar) corpo.callback = { successUrl: voltar, autoRedirect: true };
  let c;
  try {
    c = await pedir(env, '/payments', { method: 'POST', body: JSON.stringify(corpo) });
  } catch (e) {
    // O retorno só vale para domínio cadastrado na conta do Asaas (que é dividida com o Veritas): sem ele, a cobrança
    // sai mesmo assim e a pessoa volta pelo e-mail ou pela área do aluno.
    if (!corpo.callback || !/dom[ií]nio|callback|successUrl/i.test(e.message)) throw e;
    console.error('asaas sem retorno', e.message);
    delete corpo.callback;
    c = await pedir(env, '/payments', { method: 'POST', body: JSON.stringify(corpo) });
  }
  return { id: c.id, parcelamento: c.installment || null, link: c.invoiceUrl, status: c.status };
}

export async function qrPix(env, cobranca) {
  // O QR pode não estar pronto logo depois de criar a cobrança: tenta até 4 vezes.
  let q;
  for (let i = 0; i < 4; i++) {
    try { q = await pedir(env, `/payments/${cobranca}/pixQrCode`); if (q && q.payload) break; } catch (e) { if (i === 3) throw e; }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  return { copia: q.payload, qr: q.encodedImage ? `data:image/png;base64,${q.encodedImage}` : null, vence: q.expirationDate || null };
}

export async function reembolsar(env, { cobranca, parcelamento }) {
  // Parcelado: o estorno é do parcelamento inteiro.
  if (parcelamento) return pedir(env, `/installments/${parcelamento}/refund`, { method: 'POST', body: '{}' });
  return pedir(env, `/payments/${cobranca}/refund`, { method: 'POST', body: '{}' });
}

export async function cancelar(env, cobranca) {
  return pedir(env, `/payments/${cobranca}`, { method: 'DELETE' });
}

// Painel do aluno: situação da cobrança e o comprovante; dados do cliente (nome, CPF, celular).
export async function lerCobranca(env, cobranca) {
  const c = await pedir(env, `/payments/${cobranca}`);
  return { status: c.status, link: c.invoiceUrl || null, comprovante: c.transactionReceiptUrl || null };
}

export async function lerCliente(env, cliente) {
  const c = await pedir(env, `/customers/${cliente}`);
  return { nome: c.name || '', cpf: c.cpfCnpj || '', celular: c.mobilePhone || '' };
}

export async function atualizarCliente(env, cliente, { nome: n, cpf, celular }) {
  const corpo = {};
  if (n) corpo.name = n;
  if (cpf) corpo.cpfCnpj = cpf;
  if (celular) corpo.mobilePhone = celular;
  await pedir(env, `/customers/${cliente}`, { method: 'PUT', body: JSON.stringify(corpo) });
}

// O aviso (webhook) chega com o token que cadastramos no Asaas, no cabeçalho asaas-access-token.
export function conferirAviso(request, env) {
  const t = request.headers.get('asaas-access-token') || '';
  const certo = env.ASAAS_AVISO_TOKEN || '';
  if (!certo || t.length !== certo.length) return false;
  let dif = 0;
  for (let i = 0; i < t.length; i++) dif |= t.charCodeAt(i) ^ certo.charCodeAt(i);
  return dif === 0;
}
