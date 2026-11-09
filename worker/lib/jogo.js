// Jogo da área de membros (seção 2.10): XP só pelo que é real, selos, níveis com nome da casa, ranking semanal e
// mensal (só quem aceitou) e sequência de dias. Selo novo vira aviso no sino.
import { db } from '../nucleo/db.js';

// Pontos por ação. A ref (no banco) garante que cada coisa conta uma vez só.
export const PONTOS = {
  aula: 10, passo: 3, comentario_curtido: 2, comentario_resolveu: 5, modulo: 25, curso: 100,
  entrega: 30, destaque: 50, certificado: 50, depoimento: 20, desafio: 20,
};

export const NIVEIS = [
  { xp: 0, nome: 'Calango filhote' },
  { xp: 100, nome: 'Calango curioso' },
  { xp: 300, nome: 'Calango aplicado' },
  { xp: 700, nome: 'Calango criador' },
  { xp: 1500, nome: 'Calango mestre' },
  { xp: 3000, nome: 'Calango lenda' },
];

export function nivel(xp = 0) {
  let i = 0;
  while (i + 1 < NIVEIS.length && xp >= NIVEIS[i + 1].xp) i++;
  const prox = NIVEIS[i + 1] || null;
  return { numero: i + 1, nome: NIVEIS[i].nome, xp, de: NIVEIS[i].xp, ate: prox ? prox.xp : null, proximo: prox ? prox.nome : null, pct: prox ? Math.round(((xp - NIVEIS[i].xp) / (prox.xp - NIVEIS[i].xp)) * 100) : 100 };
}

export async function notificar(env, alunoId, { tipo, titulo, texto = null, link = null, ref = null }) {
  return db.insert(env, 'notificacoes', { aluno_id: alunoId, tipo, titulo, texto, link, ref }, { ignorar: !!ref, conflito: ref ? 'aluno_id,ref' : undefined, select: 'id' }).catch((e) => console.error('notificar', e.message));
}

// Confere os selos e avisa no sino os que acabaram de sair.
export async function conferirSelos(env, alunoId) {
  const ganhos = await db.rpc(env, 'verificar_conquistas', { p_aluno: alunoId }).catch(() => []);
  if (!ganhos || !ganhos.length) return [];
  const selos = await db.select(env, 'conquistas', { filtros: { id: `in.(${ganhos.join(',')})` }, select: 'id,nome,descricao' });
  for (const s of selos) await notificar(env, alunoId, { tipo: 'selo', titulo: `Selo novo: ${s.nome}`, texto: s.descricao, link: '/perfil?aba=conquistas', ref: `selo:${s.id}` });
  return selos;
}

// Dá XP (uma vez por ref) e confere os selos. Devolve o XP novo ou null se já tinha ganho.
export async function ganharXP(env, alunoId, tipo, ref, { pontos, curso_id = null, selos = true } = {}) {
  const p = pontos ?? PONTOS[tipo] ?? 0;
  const xp = await db.rpc(env, 'ganhar_xp', { p_aluno: alunoId, p_tipo: tipo, p_pontos: p, p_ref: ref, p_curso: curso_id });
  if (xp !== null && selos) await conferirSelos(env, alunoId);
  return xp;
}

// Dia de estudo (sequência). Chamado quando o aluno assiste ou aplica.
export async function marcarDia(env, alunoId) {
  return db.rpc(env, 'marcar_dia', { p_aluno: alunoId }).catch(() => null);
}

const desde = (periodo) => {
  const d = new Date();
  if (periodo === 'semana') { const dia = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dia); d.setUTCHours(3, 0, 0, 0); return d; }
  if (periodo === 'mes') return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 3));
  return new Date(0);
};

export async function rankingDe(env, aluno, { periodo = 'semana', curso_id = null } = {}) {
  const p = ['semana', 'mes', 'tudo'].includes(periodo) ? periodo : 'semana';
  const quando = desde(p).toISOString();
  const [top, eu] = await Promise.all([
    db.rpc(env, 'ranking', { p_desde: quando, p_curso: curso_id, p_limite: 10 }),
    db.rpc(env, 'posicao_ranking', { p_aluno: aluno.id, p_desde: quando, p_curso: curso_id }),
  ]);
  const minha = (eu && eu[0]) || { pontos: 0, posicao: null, participantes: 0 };
  return {
    periodo: p, participo: !!aluno.no_ranking,
    top: top.map((t) => ({ nome: t.nome, foto_url: t.foto_url, usuario: t.usuario, moldura: t.moldura, pontos: Number(t.pontos), posicao: Number(t.posicao), eu: t.aluno_id === aluno.id })),
    eu: { pontos: Number(minha.pontos || 0), posicao: minha.posicao ? Number(minha.posicao) : null, participantes: Number(minha.participantes || 0) },
  };
}

// Tudo do jogo para o perfil: nível, sequência, selos (ganhos e por ganhar) e os últimos pontos.
export async function meuJogo(env, aluno) {
  const [a, todos, meus, ultimos] = await Promise.all([
    db.um(env, 'alunos', { id: `eq.${aluno.id}` }, 'xp,sequencia,maior_sequencia,moldura'),
    db.select(env, 'conquistas', { filtros: { ativa: 'is.true' }, select: 'id,nome,descricao,raridade,icone,cor,secreta', ordem: 'ordem.asc' }),
    db.select(env, 'aluno_conquistas', { filtros: { aluno_id: `eq.${aluno.id}` }, select: 'conquista_id,ganha_em,vista' }),
    db.select(env, 'xp_eventos', { filtros: { aluno_id: `eq.${aluno.id}`, pontos: 'neq.0' }, select: 'tipo,pontos,criado_em', ordem: 'criado_em.desc', limite: 10 }),
  ]);
  const ganhos = Object.fromEntries(meus.map((m) => [m.conquista_id, m]));
  const selos = todos.filter((c) => !c.secreta || ganhos[c.id]).map((c) => ({ ...c, ganho: !!ganhos[c.id], ganha_em: ganhos[c.id] ? ganhos[c.id].ganha_em : null, novo: ganhos[c.id] ? !ganhos[c.id].vista : false }));
  if (meus.some((m) => !m.vista)) await db.update(env, 'aluno_conquistas', { aluno_id: `eq.${aluno.id}`, vista: 'is.false' }, { vista: true }, 'aluno_id').catch(() => {});
  return { nivel: nivel(a.xp), sequencia: a.sequencia, maior_sequencia: a.maior_sequencia, moldura: a.moldura, selos, ultimos };
}
