// Entregas fora da nossa área (painel e conector), pedido do dono em 05/11/2026: o Combo Black Calango é pago aqui
// (Asaas) e liberado à mão na Hubla, que só pede o e-mail. Aqui fica a lista de quem pagou e ainda não foi adicionado
// lá, e a marca de "entregue". Uma tarefa agendada do Claude lê a lista pelo conector, adiciona na Hubla pelo Chrome
// e marca. A marca mora em config 'entregas_externas' ({ <pedido_id>: { em, por, nota, removido_em } }), sem
// tabela nova. Vale para toda oferta com checkout.entrega.tipo 'externa' (lib/vendas.js, entregaDe).
import { auditar, exigir } from '../nucleo/auth.js';
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { entregaDe, produtosComCurso } from './vendas.js';

const UUID = /^[0-9a-f-]{36}$/;
const CHAVE = 'entregas_externas';
const marcas = async (env) => ((await db.um(env, 'config', { chave: `eq.${CHAVE}` })) || {}).valor || {};

async function ofertasExternas(env) {
  const todas = await db.select(env, 'ofertas', { select: 'id,slug,nome,checkout', limite: 500 });
  return todas.filter((o) => entregaDe(o));
}

// Quem pagou e ainda não foi adicionado; e quem foi adicionado e depois teve o dinheiro devolvido (para tirar de lá).
export async function entregasPendentes(x, { limite = 200 } = {}) {
  exigir(x.u, 'alunos.ver');
  const ofertas = await ofertasExternas(x.env);
  if (!ofertas.length) return { pendentes: [], total_pendentes: 0, entregues: 0, para_remover: [], ofertas: [] };
  const pedidos = await db.select(x.env, 'pedidos', {
    filtros: { oferta_id: `in.(${ofertas.map((o) => o.id).join(',')})`, status: 'in.(pago,reembolsado,contestado)', teste: 'is.false' },
    select: 'id,numero,status,oferta_id,itens,pago_em,aluno:alunos!pedidos_aluno_id_fkey(nome,email,celular)', ordem: 'pago_em.asc', limite: 5000,
  });
  const m = await marcas(x.env);
  // O vitalício é o bump que não vira curso aqui (um bump que é curso nosso, como o mini curso, é liberado na área).
  const comCurso = await produtosComCurso(x.env, pedidos.flatMap((p) => p.itens || []));
  const linha = (p) => {
    const o = ofertas.find((e) => e.id === p.oferta_id);
    const e = entregaDe(o);
    return {
      pedido_id: p.id, numero: p.numero, email: p.aluno ? p.aluno.email : null, nome: p.aluno ? p.aluno.nome : null, celular: p.aluno ? p.aluno.celular : null,
      vitalicio: (p.itens || []).some((i) => i.bump && !comCurso.has(i.produto_id)), produto: o.nome, plataforma: e.plataforma, pago_em: p.pago_em, entregue: m[p.id] || null,
    };
  };
  const pagos = pedidos.filter((p) => p.status === 'pago').map(linha);
  const pendentes = pagos.filter((l) => !l.entregue);
  const paraRemover = pedidos.filter((p) => p.status !== 'pago' && m[p.id] && !m[p.id].removido_em).map(linha);
  return {
    pendentes: pendentes.slice(0, Math.min(500, Math.max(1, Number(limite) || 200))), total_pendentes: pendentes.length,
    entregues: pagos.length - pendentes.length, para_remover: paraRemover,
    ofertas: ofertas.map((o) => ({ slug: o.slug, nome: o.nome, ...entregaDe(o) })),
    como: 'Na plataforma, adicione os e-mails como membros: quem tem vitalicio true com o acesso vitalício marcado; os outros pelo prazo normal. Depois chame marcar_entregue com os pedido_id. Quem está em para_remover pediu o dinheiro de volta: tire o acesso lá e marque com removido true.',
  };
}

// Marca (ou desfaz) a entrega de uma lista de pedidos. Só vale para pedido de oferta com entrega externa.
export async function marcarEntregue(x, pedidos, { nota, desfazer = false, removido = false } = {}) {
  exigir(x.u, 'alunos.editar');
  const lista = [...new Set((Array.isArray(pedidos) ? pedidos : [pedidos]).map(String).filter((s) => UUID.test(s)))];
  if (!lista.length) throw new Erro(400, 'Mande os pedido_id (da lista de pendentes).');
  if (lista.length > 500) throw new Erro(400, 'No máximo 500 pedidos por vez.');
  const achados = await db.select(x.env, 'pedidos', { filtros: { id: `in.(${lista.join(',')})` }, select: 'id,status,oferta:ofertas(checkout)', limite: 500 });
  const validos = achados.filter((p) => entregaDe(p.oferta));
  const m = await marcas(x.env);
  const agora = new Date().toISOString();
  const quem = x.u.casa ? `conector (${x.u.nome || 'chave da casa'})` : (x.u.nome || x.u.email || x.u.id || 'equipe');
  for (const p of validos) {
    if (desfazer) delete m[p.id];
    else if (removido) m[p.id] = { ...(m[p.id] || {}), removido_em: agora, removido_por: quem };
    else m[p.id] = { ...(m[p.id] || {}), em: agora, por: quem, ...(nota ? { nota: String(nota).slice(0, 200) } : {}) };
  }
  await db.insert(x.env, 'config', { chave: CHAVE, valor: m }, { upsert: true, conflito: 'chave', select: 'chave' });
  await auditar(x.env, x.u, desfazer ? 'entrega.desfazer' : removido ? 'entrega.removido' : 'entrega.marcar', `pedidos:${validos.length}`, { ids: validos.map((p) => p.id) });
  return { marcados: validos.length, ignorados: lista.length - validos.length };
}
