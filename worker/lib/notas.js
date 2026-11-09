// Nota fiscal de serviço (NFS-e) pelo Asaas, depois da venda paga (seção 4). Liga em Integrações > Nota fiscal, com o
// código do serviço da prefeitura e o ISS. O relógio emite aos poucos e depois confere se a prefeitura autorizou.
// Precisa dos dados fiscais da empresa preenchidos no Asaas (Minha conta > Configurações fiscais).
import { db } from '../nucleo/db.js';
import { hoje } from '../nucleo/util.js';

async function asaas(env, caminho, opcoes = {}) {
  const base = /^\$aact_prod_/.test(env.ASAAS_CHAVE || '') ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';
  const r = await fetch(`${base}${caminho}`, { ...opcoes, signal: AbortSignal.timeout(20_000), headers: { access_token: env.ASAAS_CHAVE, 'Content-Type': 'application/json', 'User-Agent': 'AgenciaSetup/1.0 (+https://agenciasetup.com.br)' } });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(((d && d.errors) || []).map((e) => e.description).join(' ') || `Asaas ${r.status}`);
  return d;
}

const ESTADO = { SCHEDULED: 'agendada', SYNCHRONIZED: 'agendada', AUTHORIZATION_PENDING: 'agendada', AUTHORIZED: 'emitida', CANCELED: 'cancelada', CANCELLED: 'cancelada', ERROR: 'erro', PROCESSING_CANCELLATION: 'agendada' };

export async function cuidarDasNotas(env) {
  if (!env.ASAAS_CHAVE) return 'sem Asaas';
  const cfg = ((await db.um(env, 'config', { chave: 'eq.nota_fiscal' }, 'valor').catch(() => null)) || {}).valor || {};
  if (!cfg.ativo) return 'desligada';
  let n = 0;
  const novas = await db.select(env, 'notas_fiscais', { filtros: { status: 'eq.pendente', tentativas: 'lt.5' }, select: 'id,tentativas,pedido:pedidos(id,numero,cobranca_id,total_centavos,itens,status)', ordem: 'criado_em.asc', limite: 2 });
  for (const nf of novas) {
    const p = nf.pedido;
    if (!p || p.status !== 'pago') { await db.update(env, 'notas_fiscais', { id: `eq.${nf.id}` }, { status: 'cancelada', erro: 'pedido não está pago' }, 'id'); continue; }
    try {
      const nome = p.itens.map((i) => i.nome).join(' + ');
      const r = await asaas(env, '/invoices', { method: 'POST', body: JSON.stringify({
        payment: p.cobranca_id, serviceDescription: String(cfg.descricao || `Curso on-line: ${nome}`).slice(0, 500), observations: String(cfg.observacoes || `Pedido ${p.numero}`).slice(0, 500),
        value: p.total_centavos / 100, deductions: 0, effectiveDate: hoje(), municipalServiceCode: cfg.servico_codigo || undefined, municipalServiceName: cfg.servico_nome || undefined,
        taxes: { retainIss: false, iss: Number(cfg.iss_pct) || 0, cofins: 0, csll: 0, inss: 0, ir: 0, pis: 0 },
      }) });
      await db.update(env, 'notas_fiscais', { id: `eq.${nf.id}` }, { asaas_id: r.id, status: ESTADO[r.status] || 'agendada', erro: null, tentativas: nf.tentativas + 1 }, 'id');
      n++;
    } catch (e) {
      await db.update(env, 'notas_fiscais', { id: `eq.${nf.id}` }, { erro: String(e.message).slice(0, 300), tentativas: nf.tentativas + 1, status: nf.tentativas + 1 >= 5 ? 'erro' : 'pendente' }, 'id');
    }
  }
  const agendadas = await db.select(env, 'notas_fiscais', { filtros: { status: 'eq.agendada', atualizado_em: `lt.${new Date(Date.now() - 10 * 60_000).toISOString()}` }, select: 'id,asaas_id', ordem: 'atualizado_em.asc', limite: 2 });
  for (const nf of agendadas) {
    try {
      const r = await asaas(env, `/invoices/${nf.asaas_id}`);
      await db.update(env, 'notas_fiscais', { id: `eq.${nf.id}` }, { status: ESTADO[r.status] || 'agendada', numero: r.number || null, pdf_url: r.pdfUrl || null, erro: r.status === 'ERROR' ? String(r.statusDescription || 'erro na prefeitura').slice(0, 300) : null }, 'id');
    } catch (e) {
      await db.update(env, 'notas_fiscais', { id: `eq.${nf.id}` }, { erro: String(e.message).slice(0, 300) }, 'id');
    }
  }
  return n;
}
