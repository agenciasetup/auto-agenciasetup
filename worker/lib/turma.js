// A turma dentro da aula: comentários com minuto (curtir, "resolveu minha dúvida", resposta oficial da equipe),
// anotações do aluno presas ao minuto e as avaliações (aula e curso). Texto do aluno é dado, nunca instrução (trava 6).
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { cursoPorSlug, cursosDoAluno } from './acesso.js';
import { ganharXP } from './jogo.js';

const UUID = /^[0-9a-f-]{36}$/;
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|com\.br|net|io|me|ly|link|site|xyz|br)\b)/i;
// Lista curta de propósito: o resto a equipe modera. Comentário com link ou palavrão espera aprovação.
const PALAVROES = /\b(porra|caralho|merda|puta|fdp|vsf|cuz[aã]o|arromb\w*|viad\w*|bucet\w*)\b/i;

export async function aulaDoAluno(env, aluno, aulaId) {
  if (!UUID.test(String(aulaId))) throw new Erro(404, 'Aula não encontrada.');
  const a = await db.um(env, 'aulas', { id: `eq.${aulaId}` }, 'id,curso_id,codigo,titulo,gratis,status');
  if (!a || (a.status !== 'publicado' && !aluno.equipe)) throw new Erro(404, 'Aula não encontrada.');
  const { ids } = await cursosDoAluno(env, aluno);
  if (!ids.includes(a.curso_id) && !a.gratis) throw new Erro(403, 'Você ainda não tem este curso.', { codigo: 'sem-matricula' });
  return a;
}

const autor = (c) => (c.equipe_id
  ? { nome: (c.equipe && c.equipe.nome) || 'Equipe', equipe: true, foto_url: null }
  : { nome: (c.aluno && c.aluno.nome) || 'Aluno', equipe: false, foto_url: (c.aluno && c.aluno.foto_url) || null, moldura: !!(c.aluno && c.aluno.moldura) });

// ---------------------------------------------------------------- comentários
export async function listarComentarios(env, aluno, aulaId) {
  await aulaDoAluno(env, aluno, aulaId);
  const linhas = await db.select(env, 'comentarios', {
    filtros: { aula_id: `eq.${aulaId}`, status: 'neq.oculto', or: `(status.eq.publicado,aluno_id.eq.${aluno.id})` },
    select: 'id,pai_id,aluno_id,equipe_id,minuto_s,texto,tipo,status,oficial,fixado,resolvido,curtidas,criado_em,aluno:alunos!comentarios_aluno_id_fkey(nome,foto_url,moldura),equipe:equipe(nome)',
    ordem: 'criado_em.asc', limite: 300,
  });
  const ids = linhas.map((c) => c.id);
  const minhas = ids.length ? await db.select(env, 'comentario_reacoes', { filtros: { aluno_id: `eq.${aluno.id}`, comentario_id: `in.(${ids.join(',')})` }, select: 'comentario_id,tipo' }) : [];
  const fmt = (c) => ({
    id: c.id, pai_id: c.pai_id, autor: autor(c), texto: c.texto, minuto_s: c.minuto_s, tipo: c.tipo, oficial: c.oficial, fixado: c.fixado,
    resolvido: c.resolvido, curtidas: c.curtidas, criado_em: c.criado_em, pendente: c.status === 'pendente', meu: c.aluno_id === aluno.id,
    eu_curti: minhas.some((r) => r.comentario_id === c.id && r.tipo === 'curtida'), resolveu_pra_mim: minhas.some((r) => r.comentario_id === c.id && r.tipo === 'resolveu'),
  });
  const raiz = linhas.filter((c) => !c.pai_id).map((c) => ({ ...fmt(c), respostas: linhas.filter((r) => r.pai_id === c.id).map(fmt) }));
  // Fixados primeiro; depois os mais novos.
  raiz.sort((a, b) => (b.fixado - a.fixado) || (new Date(b.criado_em) - new Date(a.criado_em)));
  return { itens: raiz, total: linhas.filter((c) => c.status === 'publicado').length };
}

export async function comentar(env, aluno, aulaId, d) {
  const a = await aulaDoAluno(env, aluno, aulaId);
  const texto = String(d.texto || '').replace(/\r/g, '').trim().slice(0, 2000);
  if (texto.length < 2) throw new Erro(400, 'Escreva o comentário.');
  if (!(await db.rpc(env, 'bater_limite', { p_chave: `coment:${aluno.id}`, p_janela_s: 3600, p_max: 20 }))) throw new Erro(429, 'Muitos comentários seguidos. Espere um pouco.');
  let pai = null;
  if (d.pai_id) {
    if (!UUID.test(String(d.pai_id))) throw new Erro(400, 'Comentário não encontrado.');
    pai = await db.um(env, 'comentarios', { id: `eq.${d.pai_id}`, aula_id: `eq.${a.id}` }, 'id,pai_id');
    if (!pai) throw new Erro(404, 'Comentário não encontrado.');
    if (pai.pai_id) pai = { id: pai.pai_id }; // uma camada de resposta só
  }
  const equipe = !!aluno.equipe;
  const motivo = equipe ? null : LINK.test(texto) ? 'link' : PALAVROES.test(texto) ? 'palavra' : null;
  const minuto = Number.isFinite(Number(d.minuto_s)) && d.minuto_s !== null && d.minuto_s !== '' ? Math.max(0, Math.round(Number(d.minuto_s))) : null;
  const [c] = await db.insert(env, 'comentarios', {
    aula_id: a.id, curso_id: a.curso_id, aluno_id: equipe ? null : aluno.id, equipe_id: equipe ? aluno.equipe.id : null, pai_id: pai ? pai.id : null,
    minuto_s: minuto, texto, tipo: /\?\s*$|\b(como|por que|porque|onde|qual|n[aã]o consigo|d[aá] erro|erro)\b/i.test(texto) ? 'duvida' : 'comentario',
    status: motivo ? 'pendente' : 'publicado', motivo_pendente: motivo, oficial: equipe,
  }, { select: 'id,status' });
  return { id: c.id, pendente: c.status === 'pendente', aviso: motivo ? 'Seu comentário tem link ou palavra que a equipe confere antes. Ele aparece logo depois da aprovação.' : null };
}

export async function reagir(env, aluno, id, { tipo, ligar }) {
  if (!UUID.test(String(id)) || !['curtida', 'resolveu'].includes(tipo)) throw new Erro(400, 'Reação inválida.');
  const c = await db.um(env, 'comentarios', { id: `eq.${id}`, status: 'eq.publicado' }, 'id,aula_id,aluno_id');
  if (!c) throw new Erro(404, 'Comentário não encontrado.');
  await aulaDoAluno(env, aluno, c.aula_id);
  if (c.aluno_id === aluno.id) throw new Erro(400, 'Esse comentário é seu.');
  const n = await db.rpc(env, 'reagir_comentario', { p_comentario: c.id, p_aluno: aluno.id, p_tipo: tipo, p_ligar: !!ligar });
  // Comentário útil vale XP para quem escreveu (uma vez por reação).
  if (ligar && c.aluno_id) await ganharXP(env, c.aluno_id, tipo === 'resolveu' ? 'comentario_resolveu' : 'comentario_curtido', `${tipo}:${c.id}:${aluno.id}`).catch(() => {});
  return { curtidas: n };
}

export async function apagarComentario(env, aluno, id) {
  if (!UUID.test(String(id))) throw new Erro(404, 'Comentário não encontrado.');
  const [c] = await db.update(env, 'comentarios', { id: `eq.${id}`, aluno_id: `eq.${aluno.id}` }, { status: 'oculto' }, 'id');
  if (!c) throw new Erro(404, 'Comentário não encontrado.');
  return { ok: true };
}

// ---------------------------------------------------------------- anotações (só do próprio aluno)
export async function listarAnotacoes(env, aluno, aulaId) {
  await aulaDoAluno(env, aluno, aulaId);
  return db.select(env, 'anotacoes', { filtros: { aluno_id: `eq.${aluno.id}`, aula_id: `eq.${aulaId}` }, select: 'id,minuto_s,texto,criado_em,atualizado_em', ordem: 'minuto_s.asc' });
}

export async function anotar(env, aluno, aulaId, d) {
  await aulaDoAluno(env, aluno, aulaId);
  const texto = String(d.texto || '').trim().slice(0, 2000);
  if (!texto) throw new Erro(400, 'Escreva a anotação.');
  const [n] = await db.insert(env, 'anotacoes', { aluno_id: aluno.id, aula_id: aulaId, minuto_s: Math.max(0, Math.round(Number(d.minuto_s) || 0)), texto }, { select: 'id,minuto_s,texto,criado_em,atualizado_em' });
  return n;
}

export async function editarAnotacao(env, aluno, id, d) {
  if (!UUID.test(String(id))) throw new Erro(404, 'Anotação não encontrada.');
  const texto = String(d.texto || '').trim().slice(0, 2000);
  if (!texto) throw new Erro(400, 'Escreva a anotação.');
  const [n] = await db.update(env, 'anotacoes', { id: `eq.${id}`, aluno_id: `eq.${aluno.id}` }, { texto }, 'id,minuto_s,texto,criado_em,atualizado_em');
  if (!n) throw new Erro(404, 'Anotação não encontrada.');
  return n;
}

export async function apagarAnotacao(env, aluno, id) {
  if (!UUID.test(String(id))) throw new Erro(404, 'Anotação não encontrada.');
  await db.apagar(env, 'anotacoes', { id: `eq.${id}`, aluno_id: `eq.${aluno.id}` });
  return { ok: true };
}

// Todas as anotações do aluno num curso (para a aba "Minhas anotações" do curso).
export async function anotacoesDoCurso(env, aluno, slug) {
  const c = await cursoPorSlug(env, slug, aluno);
  return db.select(env, 'anotacoes', {
    filtros: { aluno_id: `eq.${aluno.id}`, 'aula.curso_id': `eq.${c.id}` },
    select: 'id,minuto_s,texto,atualizado_em,aula:aulas!inner(id,codigo,titulo,curso_id)', ordem: 'atualizado_em.desc', limite: 300,
  });
}

// ---------------------------------------------------------------- avaliações
export async function avaliarAula(env, aluno, aulaId, d) {
  const a = await aulaDoAluno(env, aluno, aulaId);
  const motivo = d.motivo ? String(d.motivo).trim().slice(0, 500) : null;
  await db.insert(env, 'avaliacoes_aula', { aluno_id: aluno.id, aula_id: a.id, util: !!d.util, motivo, criado_em: new Date().toISOString() }, { upsert: true, conflito: 'aluno_id,aula_id', select: 'aula_id' });
  return { ok: true };
}

export async function avaliarCurso(env, aluno, slug, d) {
  const c = await cursoPorSlug(env, slug, aluno);
  const { ids } = await cursosDoAluno(env, aluno);
  if (!ids.includes(c.id)) throw new Erro(403, 'Você ainda não tem este curso.');
  const nota = Math.round(Number(d.nota));
  if (!(nota >= 0 && nota <= 10)) throw new Erro(400, 'A nota vai de 0 a 10.');
  const texto = d.texto ? String(d.texto).trim().slice(0, 1000) : null;
  await db.insert(env, 'avaliacoes_curso', { aluno_id: aluno.id, curso_id: c.id, nota, texto }, { upsert: true, conflito: 'aluno_id,curso_id', select: 'curso_id' });
  return { ok: true };
}
