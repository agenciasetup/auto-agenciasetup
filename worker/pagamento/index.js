// Qual provedor de pagamento usar: o Asaas (real) ou o Stripe (dólar), pela moeda da oferta; o simulado só no computador.
// Em produção sem chave, o checkout avisa que o pagamento não está configurado (nunca cai no simulado).
// As chaves e os avisos vêm do painel (Integrações), cifrados no banco: ver lib/integracoes.js.
import { Erro } from '../nucleo/util.js';
import * as asaas from './asaas.js';
import * as simulado from './simulado.js';
import * as stripe from './stripe.js';

export { prepararIntegracoes as prepararAsaas, esquecerIntegracoes as esquecerAsaas } from '../lib/integracoes.js';

// moeda: a da oferta ('brl' ou 'usd'). No computador sem chave do Stripe, a venda em dólar também é simulada.
export function provedor(env, moeda = 'brl') {
  if (moeda === 'usd') {
    if (env.STRIPE_CHAVE) return stripe;
    if (env.AMBIENTE === 'local') return simulado;
    throw new Erro(503, 'Payments are not set up yet. Please try again later.');
  }
  if (env.ASAAS_CHAVE) return asaas;
  if (env.AMBIENTE === 'local') return simulado;
  throw new Erro(503, 'O pagamento ainda não está configurado. Tente de novo mais tarde.');
}

export function provedorDoPedido(env, pedido) {
  if (pedido.provedor === 'simulado') {
    if (env.AMBIENTE !== 'local') throw new Erro(409, 'Pedido de teste: só existe no computador.');
    return simulado;
  }
  if (pedido.provedor === 'stripe') return stripe;
  return asaas;
}

export { asaas, simulado, stripe };
