// Integrações configuradas pelo painel (Integrações), guardadas no banco (config "<nome>") com os segredos cifrados
// (AES-GCM com CRIPTO_CHAVE, trava 8). Nunca voltam para a tela nem para o Claude. Segredo do Worker com o mesmo nome
// tem a vez quando existe. No computador (AMBIENTE=local) o banco é ignorado: nada cobra, manda e-mail ou gasta IA de verdade.
import { db } from '../nucleo/db.js';
import { cifrar, decifrar } from '../nucleo/cripto.js';
import { Erro } from '../nucleo/util.js';

// O que cada integração guarda. publicos: campos que o painel mostra; segredos: só "guardado ou não".
// env: de qual campo sai cada variável que o resto do Worker já usa.
export const INTEGRACOES = {
  asaas: { nome: 'Asaas (pagamento)', segredos: ['chave', 'aviso'], publicos: [], env: { ASAAS_CHAVE: 'chave', ASAAS_AVISO_TOKEN: 'aviso' } },
  // Venda em dólar (curso em inglês). aviso: o segredo de assinatura do webhook (whsec_), gravado por scripts/stripe.mjs aviso.
  stripe: { nome: 'Stripe (venda em dólar)', segredos: ['chave', 'aviso'], publicos: [], env: { STRIPE_CHAVE: 'chave', STRIPE_AVISO_SEGREDO: 'aviso' } },
  // webhook: o segredo de assinatura do aviso do Resend (aberto, clicado...), gravado por scripts/resend-rastreio.mjs.
  email: { nome: 'Resend (e-mail)', segredos: ['chave', 'webhook'], publicos: ['de', 'responder_para', 'dominio'], env: { RESEND_CHAVE: 'chave', EMAIL_DE: 'de', EMAIL_RESPONDER: 'responder_para', RESEND_WEBHOOK_SEGREDO: 'webhook' } },
  ia: { nome: 'Claude (tutor de IA)', segredos: ['chave'], publicos: ['ativo', 'modelo_tutor', 'limite_dia', 'teto_mes_usd', 'instrucoes', 'relatorio'], env: { ANTHROPIC_CHAVE: 'chave' } },
  panda: { nome: 'Panda Video', segredos: ['chave'], publicos: ['biblioteca'], env: { PANDA_CHAVE: 'chave', PANDA_BIBLIOTECA: 'biblioteca' } },
  bunny: { nome: 'Bunny Stream', segredos: ['chave', 'token'], publicos: ['biblioteca'], env: { BUNNY_CHAVE: 'chave', BUNNY_TOKEN: 'token', BUNNY_BIBLIOTECA: 'biblioteca' } },
  turnstile: { nome: 'Turnstile (checkout sem robô)', segredos: ['segredo'], publicos: ['site'], env: { TURNSTILE_SEGREDO: 'segredo', TURNSTILE_SITE: 'site' } },
  rastreio: { nome: 'Pixel da Meta e Google', segredos: ['meta_token'], publicos: ['meta_pixel', 'ga4', 'google_ads', 'google_ads_rotulo'], env: { META_CAPI_TOKEN: 'meta_token' } },
  nota_fiscal: { nome: 'Nota fiscal (Asaas)', segredos: [], publicos: ['ativo', 'servico_codigo', 'servico_nome', 'descricao', 'iss_pct', 'observacoes'], env: {} },
  // A conta robô do Google que lê o Search Console (lib/searchconsole.js). conta: o JSON da chave, cifrado.
  search_console: { nome: 'Google Search Console', segredos: ['conta'], publicos: ['email', 'sites'], env: { GSC_CONTA: 'conta' } },
};
const NOMES = Object.keys(INTEGRACOES);

const VALIDADE = 5 * 60_000;
let lido = { quando: 0, linhas: {} };

async function lerTudo(env) {
  const linhas = await db.select(env, 'config', { filtros: { chave: `in.(${NOMES.join(',')})` }, select: 'chave,valor' });
  const out = {};
  for (const l of linhas) {
    const def = INTEGRACOES[l.chave];
    const v = { ...(l.valor || {}) };
    for (const s of def.segredos) {
      if (v[s]) { try { v[s] = (await decifrar(env, v[s])).valor; } catch { v[s] = null; } }
    }
    out[l.chave] = v;
  }
  return out;
}

// Chamado antes das rotas que cobram, mandam e-mail, usam IA ou configuram (worker/index.js) e no relógio.
export async function prepararIntegracoes(env) {
  if (env.AMBIENTE === 'local') return;
  if (!env.__doSegredo) {
    env.__doSegredo = {};
    for (const n of NOMES) for (const k of Object.keys(INTEGRACOES[n].env)) env.__doSegredo[k] = !!env[k];
  }
  if (Date.now() - lido.quando > VALIDADE) {
    try { lido = { quando: Date.now(), linhas: await lerTudo(env) }; } catch (e) { console.error('integracoes', e.message); lido.quando = Date.now(); }
  }
  for (const n of NOMES) {
    const v = lido.linhas[n] || {};
    for (const [k, campo] of Object.entries(INTEGRACOES[n].env)) if (!env.__doSegredo[k]) env[k] = v[campo] || undefined;
  }
  env.__ia = lido.linhas.ia || {};
  // Compra de quem mora fora do Brasil (Área de membros > Pagamento): lib/vendas.js, estrangeirosLigado.
  env.__estrangeiros = (lido.linhas.asaas || {}).estrangeiros === true;
  env.__rastreio = lido.linhas.rastreio || {};
}

export function esquecerIntegracoes() { lido.quando = 0; }

// ---------------------------------------------------------------- painel
export async function situacao(env, nome) {
  const def = INTEGRACOES[nome];
  const c = await db.um(env, 'config', { chave: `eq.${nome}` });
  const v = (c && c.valor) || {};
  const doSegredo = env.__doSegredo || {};
  const publicos = Object.fromEntries(def.publicos.map((p) => [p, v[p] ?? null]));
  const segredos = Object.fromEntries(def.segredos.map((s) => {
    const k = Object.entries(def.env).find(([, campo]) => campo === s);
    return [s, !!v[s] || !!(k && doSegredo[k[0]])];
  }));
  const { salva_em = null, teste = null } = v;
  return { nome, titulo: def.nome, publicos, segredos, salva_em, teste, extra: v.extra || null };
}

// Grava os campos públicos e os segredos que vieram preenchidos (segredo em branco mantém o que estava).
export async function gravar(env, nome, d, extra = {}) {
  const def = INTEGRACOES[nome];
  if (!def) throw new Erro(404, 'Integração desconhecida.');
  const c = await db.um(env, 'config', { chave: `eq.${nome}` });
  const v = { ...((c && c.valor) || {}) };
  for (const p of def.publicos) if (d[p] !== undefined) v[p] = d[p];
  for (const s of def.segredos) {
    const novo = d[s] === undefined || d[s] === null ? '' : String(d[s]).trim();
    if (novo) v[s] = await cifrar(env, { valor: novo });
    else if (d[s] === null && d.apagar_segredo) delete v[s];
  }
  Object.assign(v, extra, { salva_em: new Date().toISOString() });
  await db.insert(env, 'config', { chave: nome, valor: v }, { upsert: true, conflito: 'chave', select: 'chave' });
  esquecerIntegracoes();
  return v;
}
