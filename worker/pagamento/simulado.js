// Pagamento de mentira, só no computador (AMBIENTE=local, sem ASAAS_CHAVE): mesmo jeito do Asaas, sem dinheiro.
// "Simular pagamento" no checkout cria um aviso igual ao do Asaas e passa pelo mesmo caminho (lib/vendas.js).
import { aleatorio } from '../nucleo/util.js';

export const nome = 'simulado';

export async function criarCliente() {
  return `cus_sim_${aleatorio(10)}`;
}

export async function criarCobranca(env, { metodo, parcelas = 1, ref }) {
  const id = `pay_sim_${aleatorio(12)}`;
  return {
    id,
    parcelamento: metodo === 'cartao' && parcelas > 1 ? `ins_sim_${aleatorio(10)}` : null,
    // Cartão: no simulado, a "página do Asaas" é a nossa tela de obrigado com o botão de simular.
    link: metodo === 'cartao' ? `/checkout/obrigado?pedido=${ref}&simulado=1` : null,
    status: 'PENDING',
  };
}

export async function qrPix(env, cobranca) {
  return { copia: `00020126580014br.gov.bcb.pix0136simulado-${cobranca}-sem-valor5204000053039865802BR`, qr: null, vence: null };
}

export async function lerCobranca() { return { status: 'PENDING', link: null, comprovante: null }; }
export async function lerCliente() { return { nome: '', cpf: '', celular: '' }; }
export async function atualizarCliente() {}
export async function reembolsar() { return { status: 'REFUNDED' }; }
export async function cancelar() { return { deleted: true }; }
export function conferirAviso() { return false; }
