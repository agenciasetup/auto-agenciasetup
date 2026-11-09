// Comunidade sem rede social (seção 7): desafios da equipe, mural de criações (o que a turma fez com o curso, com curtida),
// e o depoimento que vira material ("conta como foi e ganhe o pack"), com o check-in de resultado depois de 30 dias.
import { db, enviarArquivo } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { cursoPorSlug, cursosDoAluno } from './acesso.js';
import { conferirSelos } from './jogo.js';
import { cursosComMarca } from './marcas.js';

const UUID = /^[0-9a-f-]{36}$/;
// Cada endereço tem a sua turma: no curso com marca (ex.: o em inglês, aluno.escopo = { curso_id }), só as criações e os
// desafios dele; no app da Setup, nada dos cursos com marca.
async function filtroDaTurma(env, aluno) {
  if (aluno.escopo && aluno.escopo !== 'setup' && aluno.escopo.curso_id) return { curso_id: `eq.${aluno.escopo.curso_id}` };
  const marcas = [...(await cursosComMarca(env)).keys()];
  return marcas.length ? { or: `(curso_id.is.null,curso_id.not.in.(${marcas.join(',')}))` } : {};
}
const autorDe = (a) => (a ? { nome: a.nome || 'Aluno', foto_url: a.foto_url || null, usuario: a.perfil_publico ? a.usuario : null, moldura: !!a.moldura } : null);

// ---------------------------------------------------------------- desafios
export async function listarDesafios(env, aluno) {
  const lista = await db.select(env, 'desafios', { filtros: { status: 'in.(aberto,encerrado)', ...(await filtroDaTurma(env, aluno)) }, select: 'id,slug,titulo,descricao,premio,capa_url,inicio,fim,status,curso_id', ordem: 'inicio.desc', limite: 20 });
  if (!lista.length) return [];
  const minhas = await db.select(env, 'entregas', { filtros: { aluno_id: `eq.${aluno.id}`, desafio_id: `in.(${lista.map((d) => d.id).join(',')})` }, select: 'desafio_id,status' });
  const contagem = await db.select(env, 'entregas', { filtros: { desafio_id: `in.(${lista.map((d) => d.id).join(',')})`, status: 'in.(aprovada,destaque)' }, select: 'desafio_id' });
  return lista.map((d) => ({ ...d, minha: (minhas.find((m) => m.desafio_id === d.id) || {}).status || null, entregas: contagem.filter((c) => c.desafio_id === d.id).length }));
}

export async function lerDesafio(env, aluno, slug) {
  const d = await db.um(env, 'desafios', { slug: `eq.${slug}`, status: 'in.(aberto,encerrado)' }, 'id,slug,titulo,descricao,regras,premio,capa_url,inicio,fim,status,curso_id');
  if (!d) throw new Erro(404, 'Desafio não encontrado.');
  const [mural, minha] = await Promise.all([
    muralDe(env, aluno, { desafio_id: d.id }),
    db.um(env, 'entregas', { desafio_id: `eq.${d.id}`, aluno_id: `eq.${aluno.id}` }, 'id,titulo,status,motivo,link,imagem_url,criado_em'),
  ]);
  return { ...d, mural, minha };
}

// ---------------------------------------------------------------- mural e entregas
async function muralDe(env, aluno, { desafio_id = null, pagina = 1 } = {}) {
  const filtros = { status: 'in.(aprovada,destaque)', ...(desafio_id ? {} : await filtroDaTurma(env, aluno)) };
  if (desafio_id) filtros.desafio_id = `eq.${desafio_id}`;
  const itens = await db.select(env, 'entregas', {
    filtros, select: 'id,titulo,descricao,link,imagem_url,status,curtidas,criado_em,desafio:desafios(slug,titulo),aluno:alunos!entregas_aluno_id_fkey(nome,foto_url,usuario,perfil_publico,moldura)',
    ordem: 'status.desc,criado_em.desc', limite: 30, offset: (Math.max(1, pagina) - 1) * 30,
  });
  const ids = itens.map((i) => i.id);
  const curti = ids.length ? await db.select(env, 'entrega_curtidas', { filtros: { aluno_id: `eq.${aluno.id}`, entrega_id: `in.(${ids.join(',')})` }, select: 'entrega_id' }) : [];
  return itens.map(({ aluno: a, ...e }) => ({ ...e, autor: autorDe(a), eu_curti: curti.some((c) => c.entrega_id === e.id) }));
}

export async function mural(env, aluno, pagina = 1) {
  const [itens, minhas] = await Promise.all([
    muralDe(env, aluno, { pagina }),
    db.select(env, 'entregas', { filtros: { aluno_id: `eq.${aluno.id}` }, select: 'id,titulo,status,motivo,criado_em,desafio:desafios(titulo)', ordem: 'criado_em.desc', limite: 20 }),
  ]);
  return { itens, minhas };
}

export async function entregar(env, aluno, d) {
  const titulo = String(d.titulo || '').trim().slice(0, 120);
  if (titulo.length < 2) throw new Erro(400, 'Dê um título para a sua criação.');
  const link = d.link ? String(d.link).trim().slice(0, 500) : null;
  if (link && !/^https:\/\/[^\s]+$/i.test(link)) throw new Erro(400, 'O link precisa começar com https://');
  if (!link && !d.imagem) throw new Erro(400, 'Mande o link do post ou uma imagem.');
  if (!(await db.rpc(env, 'bater_limite', { p_chave: `entrega:${aluno.id}`, p_janela_s: 3600, p_max: 6 }))) throw new Erro(429, 'Muitas entregas seguidas. Espere um pouco.');
  let desafio = null;
  if (d.desafio_id) {
    if (!UUID.test(String(d.desafio_id))) throw new Erro(404, 'Desafio não encontrado.');
    desafio = await db.um(env, 'desafios', { id: `eq.${d.desafio_id}`, status: 'eq.aberto' }, 'id,curso_id,fim');
    if (!desafio) throw new Erro(409, 'Esse desafio não está aberto.');
    if (desafio.fim && new Date(desafio.fim) < new Date()) throw new Erro(409, 'O prazo desse desafio acabou.');
    const ja = await db.um(env, 'entregas', { desafio_id: `eq.${desafio.id}`, aluno_id: `eq.${aluno.id}` }, 'id');
    if (ja) throw new Erro(409, 'Você já entregou neste desafio.');
  }
  let imagem_url = null;
  if (d.imagem) {
    const m = String(d.imagem).match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw new Erro(400, 'Mande a imagem em JPG, PNG ou WEBP.');
    if (m[2].length > 2_800_000) throw new Erro(400, 'A imagem ficou grande demais.');
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    imagem_url = await enviarArquivo(env, 'midia', `entregas/${aluno.id}-${Date.now().toString(36)}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`, bytes, `image/${m[1]}`);
  }
  const [e] = await db.insert(env, 'entregas', {
    desafio_id: desafio ? desafio.id : null, aluno_id: aluno.id, titulo,
    curso_id: desafio ? desafio.curso_id : aluno.escopo && aluno.escopo !== 'setup' ? aluno.escopo.curso_id || null : null,
    descricao: d.descricao ? String(d.descricao).trim().slice(0, 1000) : null, link, imagem_url, autoriza_repost: !!d.autoriza_repost,
  }, { select: 'id,status' });
  return { id: e.id, status: e.status };
}

export async function curtirEntrega(env, aluno, id, ligar) {
  if (!UUID.test(String(id))) throw new Erro(404, 'Criação não encontrada.');
  const e = await db.um(env, 'entregas', { id: `eq.${id}`, status: 'in.(aprovada,destaque)' }, 'id,aluno_id');
  if (!e) throw new Erro(404, 'Criação não encontrada.');
  if (e.aluno_id === aluno.id) throw new Erro(400, 'Essa criação é sua.');
  return { curtidas: await db.rpc(env, 'curtir_entrega', { p_entrega: e.id, p_aluno: aluno.id, p_ligar: !!ligar }) };
}

// ---------------------------------------------------------------- depoimento que vira material
export async function estadoDepoimento(env, aluno, curso, pct) {
  const [dep, recompensas] = await Promise.all([
    db.um(env, 'depoimentos', { aluno_id: `eq.${aluno.id}`, curso_id: `eq.${curso.id}` }, 'id,nota,status,criado_em,resultado'),
    db.select(env, 'arquivos', { filtros: { curso_id: `eq.${curso.id}`, recompensa: 'is.true' }, select: 'id,nome,o_que' }),
  ]);
  const dias = dep ? (Date.now() - new Date(dep.criado_em).getTime()) / 86400_000 : 0;
  return {
    pode: pct >= 50, enviado: !!dep, status: dep ? dep.status : null, recompensas: recompensas.map((r) => ({ nome: r.nome, o_que: r.o_que })),
    pedir_resultado: !!dep && !dep.resultado && dias >= 30,
  };
}

export async function enviarDepoimento(env, aluno, slug, d) {
  const c = await cursoPorSlug(env, slug, aluno);
  const { ids } = await cursosDoAluno(env, aluno);
  if (!ids.includes(c.id)) throw new Erro(403, 'Você ainda não tem este curso.');
  // O presente do depoimento libera a partir de 50% do curso (antes disso não dá para contar como foi).
  const aulas = await db.select(env, 'aulas', { filtros: { curso_id: `eq.${c.id}`, status: 'eq.publicado' }, select: 'id' });
  const feitas = aulas.length ? (await db.select(env, 'progresso', { filtros: { aluno_id: `eq.${aluno.id}`, aula_id: `in.(${aulas.map((a) => a.id).join(',')})`, concluida_em: 'not.is.null' }, select: 'aula_id' })).length : 0;
  if (!aluno.equipe && (!aulas.length || feitas * 2 < aulas.length)) throw new Erro(409, 'O depoimento abre depois de metade das aulas.');
  const nota = Math.round(Number(d.nota));
  if (!(nota >= 0 && nota <= 10)) throw new Erro(400, 'A nota vai de 0 a 10.');
  const texto = String(d.texto || '').trim().slice(0, 2000);
  if (texto.length < 10) throw new Erro(400, 'Conte um pouco mais: pelo menos uma frase.');
  const video = d.video_url ? String(d.video_url).trim().slice(0, 500) : null;
  if (video && !/^https:\/\/[^\s]+$/i.test(video)) throw new Erro(400, 'O link do vídeo precisa começar com https://');
  await db.insert(env, 'depoimentos', { aluno_id: aluno.id, curso_id: c.id, nota, texto, video_url: video, autoriza_uso: !!d.autoriza_uso }, { upsert: true, conflito: 'aluno_id,curso_id', select: 'id' });
  await db.insert(env, 'avaliacoes_curso', { aluno_id: aluno.id, curso_id: c.id, nota, texto: texto.slice(0, 1000) }, { upsert: true, conflito: 'aluno_id,curso_id', select: 'curso_id' });
  await conferirSelos(env, aluno.id).catch(() => {});
  return { ok: true, liberado: true };
}

export async function salvarResultado(env, aluno, slug, d) {
  const c = await cursoPorSlug(env, slug, aluno);
  const texto = String(d.resultado || '').trim().slice(0, 500);
  if (!texto) throw new Erro(400, 'Conte o resultado.');
  const [r] = await db.update(env, 'depoimentos', { aluno_id: `eq.${aluno.id}`, curso_id: `eq.${c.id}` }, { resultado: texto, resultado_em: new Date().toISOString() }, 'id');
  if (!r) throw new Erro(404, 'Envie o depoimento antes.');
  return { ok: true };
}

// O aluno vê o material de recompensa só depois de mandar o depoimento do curso.
export async function temDepoimento(env, aluno, cursoId) {
  return !!(await db.um(env, 'depoimentos', { aluno_id: `eq.${aluno.id}`, curso_id: `eq.${cursoId}` }, 'id'));
}
