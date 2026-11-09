// Quem vê o quê na área de membros: matrículas, cursos do aluno, liberação programada, a árvore do curso com o
// progresso e onde continuar. Usado pela API do aluno e pelos módulos de comentários, tutor, certificado e jogo.
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { cursosComMarca } from './marcas.js';

export const AULA_LISTA = 'id,codigo,titulo,duracao_s,capa_url,previa_url,modulo_id,ordem,gratis,status,tipo';

export async function matriculas(env, aluno) {
  const agora = Date.now();
  const linhas = await db.select(env, 'matriculas', { filtros: { aluno_id: `eq.${aluno.id}`, status: 'eq.ativa' }, select: 'curso_id,inicio,fim,origem' });
  return linhas.filter((m) => !m.fim || new Date(m.fim).getTime() > agora);
}

// Cada endereço com os seus cursos (pedido do dono em 29/10/2026: quem tinha a Setup e o Dúvidas da Fé via um curso
// no app do outro). aluno.escopo vem da API do aluno: 'setup' (curso.) tira os cursos com marca própria; { curso_id, cursos }
// (o endereço da marca) deixa só os cursos dela. Sem escopo (painel, relógio), vale tudo.
async function doEscopo(env, aluno, ids) {
  const e = aluno.escopo;
  if (!e) return ids;
  if (e.curso_id) return ids.filter((id) => (e.cursos || [e.curso_id]).includes(id));
  const marcas = await cursosComMarca(env);
  return ids.filter((id) => !marcas.has(id));
}

// Cursos que a pessoa pode ver: os da matrícula; a equipe vê todos (inclusive rascunho, para conferir).
export async function cursosDoAluno(env, aluno) {
  const mats = await matriculas(env, aluno);
  if (aluno.equipe) {
    const todos = await db.select(env, 'cursos', { filtros: { status: 'neq.arquivado' }, select: 'id' });
    return { ids: await doEscopo(env, aluno, todos.map((c) => c.id)), mats, inicioDe: () => new Date(0) };
  }
  return { ids: await doEscopo(env, aluno, mats.map((m) => m.curso_id)), mats, inicioDe: (cursoId) => new Date((mats.find((m) => m.curso_id === cursoId) || {}).inicio || Date.now()) };
}

export function liberado(modulo, inicio, equipe) {
  if (equipe || modulo.liberacao === 'imediata') return { ok: true };
  const quando = modulo.liberacao === 'dias' ? new Date(inicio.getTime() + (modulo.liberar_dias || 0) * 86400_000) : new Date(modulo.liberar_em || 0);
  return quando.getTime() <= Date.now() ? { ok: true } : { ok: false, em: quando.toISOString() };
}

// A árvore do curso com o progresso da pessoa.
export async function arvore(env, curso, aluno, inicio) {
  const [secoes, modulos, aulas] = await Promise.all([
    db.select(env, 'secoes', { filtros: { curso_id: `eq.${curso.id}` }, select: 'id,titulo,ordem', ordem: 'ordem.asc' }),
    db.select(env, 'modulos', { filtros: { curso_id: `eq.${curso.id}` }, select: 'id,secao_id,numero,titulo,descricao,ordem,liberacao,liberar_dias,liberar_em', ordem: 'ordem.asc' }),
    db.select(env, 'aulas', { filtros: { curso_id: `eq.${curso.id}`, status: aluno.equipe ? 'neq.arquivado' : 'eq.publicado' }, select: AULA_LISTA, ordem: 'ordem.asc' }),
  ]);
  const prog = aulas.length ? await db.select(env, 'progresso', { filtros: { aluno_id: `eq.${aluno.id}`, aula_id: `in.(${aulas.map((a) => a.id).join(',')})` }, select: 'aula_id,posicao_s,assistido_s,concluida_em,passos,atualizado_em' }) : [];
  const pr = Object.fromEntries(prog.map((p) => [p.aula_id, p]));
  const ordenadas = [];
  const mods = modulos.map((m) => {
    const lib = liberado(m, inicio, !!aluno.equipe);
    const as = aulas.filter((a) => a.modulo_id === m.id).map((a) => {
      const p = pr[a.id];
      const item = { ...a, liberada: lib.ok, concluida: !!(p && p.concluida_em), posicao_s: p ? p.posicao_s : 0, pct: p && a.duracao_s ? Math.min(100, Math.round((p.assistido_s / a.duracao_s) * 100)) : 0, atualizado_em: p ? p.atualizado_em : null };
      ordenadas.push(item);
      return item;
    });
    return { ...m, liberado: lib.ok, libera_em: lib.em || null, aulas: as };
  });
  const total = ordenadas.length;
  const feitas = ordenadas.filter((a) => a.concluida).length;
  return { secoes, modulos: mods, ordenadas, total, feitas, pct: total ? Math.round((feitas / total) * 100) : 0 };
}

// Onde continuar: a aula mexida por último que não terminou; senão, a primeira depois da última concluída.
export function continuarDe(ordenadas) {
  const abertas = ordenadas.filter((a) => a.liberada && !a.concluida);
  const mexida = abertas.filter((a) => a.atualizado_em).sort((x, y) => new Date(y.atualizado_em) - new Date(x.atualizado_em))[0];
  return mexida || abertas[0] || null;
}

export async function cursoPorSlug(env, slug, aluno) {
  const c = await db.um(env, 'cursos', { slug: `eq.${slug}` }, 'id,slug,titulo,subtitulo,descricao,capa_url,trailer_url,cor,certificado_pct,status');
  if (!c || (c.status !== 'publicado' && !aluno.equipe)) throw new Erro(404, 'Curso não encontrado.');
  return c;
}
