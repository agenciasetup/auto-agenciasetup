// Comunicação dentro da área (seção 6): banners, avisos e eventos ao vivo para o público certo (quem tem o curso X,
// quem não tem o produto Y, quem parou há N dias, quem passou de N%, quem terminou), contando visto, clique e fechado.
// E o sino: as notificações do aluno (selo novo, resposta da equipe, certificado, evento começando).
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';

const UUID = /^[0-9a-f-]{36}$/;

// cursos: [{ id, pct, feitas, total }] do aluno (o início já calcula). ultimo: data do último progresso.
function serve(av, ctx) {
  const p = av.publico || {};
  if (p.curso_id && !ctx.cursos.some((c) => c.id === p.curso_id)) return false;
  if (p.sem_produto_id && ctx.produtos.includes(p.sem_produto_id)) return false;
  if (p.parado_dias && (!ctx.ultimo || Date.now() - new Date(ctx.ultimo).getTime() < p.parado_dias * 86400_000)) return false;
  const alvo = p.curso_id ? ctx.cursos.filter((c) => c.id === p.curso_id) : ctx.cursos;
  if (p.min_pct && !alvo.some((c) => c.pct >= p.min_pct)) return false;
  if (p.concluiu && !alvo.some((c) => c.total && c.feitas === c.total)) return false;
  return true;
}

export async function avisosParaMim(env, aluno, { cursos = [], curso_id = null } = {}) {
  const agora = new Date().toISOString();
  const [lista, minhas, mats, ultimo] = await Promise.all([
    db.select(env, 'avisos', { filtros: { ativo: 'is.true', inicio: `lte.${agora}`, or: `(fim.is.null,fim.gt.${agora})` }, select: 'id,tipo,titulo,texto,imagem_url,botao_texto,botao_link,publico,evento_em,evento_fim,evento_link,gravacao_aula_id,importante,ordem', ordem: 'ordem.asc,inicio.desc', limite: 30 }),
    db.select(env, 'aviso_interacoes', { filtros: { aluno_id: `eq.${aluno.id}`, tipo: 'in.(fechado,lembrete,visto)' }, select: 'aviso_id,tipo', limite: 500 }),
    db.select(env, 'matriculas', { filtros: { aluno_id: `eq.${aluno.id}`, status: 'eq.ativa' }, select: 'curso_id,pedido:pedidos(itens)' }),
    db.um(env, 'progresso', { aluno_id: `eq.${aluno.id}`, order: 'atualizado_em.desc' }, 'atualizado_em'),
  ]);
  const produtos = [...new Set(mats.flatMap((m) => ((m.pedido && m.pedido.itens) || []).map((i) => i.produto_id)).filter(Boolean))];
  const ctx = { cursos, produtos, ultimo: ultimo ? ultimo.atualizado_em : null };
  const fechou = new Set(minhas.filter((m) => m.tipo === 'fechado').map((m) => m.aviso_id));
  const lembra = new Set(minhas.filter((m) => m.tipo === 'lembrete').map((m) => m.aviso_id));
  const viu = new Set(minhas.filter((m) => m.tipo === 'visto').map((m) => m.aviso_id));
  const meus = lista.filter((a) => !fechou.has(a.id) && serve(a, ctx) && (!curso_id || !a.publico?.curso_id || a.publico.curso_id === curso_id));
  // Evento passado (mais de 3 horas) só fica se tiver a gravação.
  const vivos = meus.filter((a) => a.tipo !== 'evento' || !a.evento_em || new Date(a.evento_fim || a.evento_em).getTime() + 3 * 3600_000 > Date.now() || a.gravacao_aula_id);
  const fmt = ({ publico, ...a }) => ({ ...a, lembrete: lembra.has(a.id), novo: !viu.has(a.id) });
  return {
    banners: vivos.filter((a) => a.tipo === 'banner').map(fmt),
    avisos: vivos.filter((a) => a.tipo === 'aviso').map(fmt),
    eventos: vivos.filter((a) => a.tipo === 'evento').sort((a, b) => new Date(a.evento_em) - new Date(b.evento_em)).map(fmt),
  };
}

export async function interagirAviso(env, aluno, id, tipo) {
  if (!UUID.test(String(id)) || !['visto', 'clique', 'fechado', 'lembrete'].includes(tipo)) throw new Erro(400, 'Ação inválida.');
  await db.rpc(env, 'interagir_aviso', { p_aviso: id, p_aluno: aluno.id, p_tipo: tipo });
  return { ok: true };
}

// ---------------------------------------------------------------- o sino
export async function minhasNotificacoes(env, aluno) {
  const itens = await db.select(env, 'notificacoes', { filtros: { aluno_id: `eq.${aluno.id}` }, select: 'id,tipo,titulo,texto,link,lida_em,criado_em', ordem: 'criado_em.desc', limite: 30 });
  return { itens, nao_lidas: itens.filter((n) => !n.lida_em).length };
}

export async function lerNotificacoes(env, aluno) {
  await db.update(env, 'notificacoes', { aluno_id: `eq.${aluno.id}`, lida_em: 'is.null' }, { lida_em: new Date().toISOString() }, 'id');
  return { ok: true };
}

export async function contarNaoLidas(env, aluno) {
  const r = await db.select(env, 'notificacoes', { filtros: { aluno_id: `eq.${aluno.id}`, lida_em: 'is.null' }, select: 'id', limite: 1, contar: true });
  return r.total;
}
