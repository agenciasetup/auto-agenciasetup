// Ações da equipe para a turma (painel > Comunidade e Comunicação). Mesma regra de acoes.js: cargo (permissoes.js) e
// auditoria em toda escrita. Suporte responde comentários e dúvidas; Editor e Administrador cuidam de avisos e desafios.
import { auditar, exigir } from '../nucleo/auth.js';
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { cursoUrl } from './alunos.js';
import { emailDesafio, emailResposta, enviarEmail } from './emails.js';
import { PONTOS, conferirSelos, ganharXP, notificar } from './jogo.js';
import { MODELOS } from './tutor.js';

const UUID = /^[0-9a-f-]{36}$/;
const id = (v) => { if (!UUID.test(String(v))) throw new Erro(404, 'Não encontrado.'); return v; };
const texto = (v, n, msg) => { const t = String(v || '').trim().slice(0, n); if (!t) throw new Erro(400, msg); return t; };

// ---------------------------------------------------------------- o que espera a equipe
export async function filaComunidade(x) {
  exigir(x.u, 'comunidade.ver');
  const conta = (tabela, filtros) => db.select(x.env, tabela, { filtros, select: 'id', limite: 1, contar: true }).then((r) => r.total);
  const [comentarios, duvidas, entregas, depoimentos, semResposta] = await Promise.all([
    conta('comentarios', { status: 'eq.pendente' }),
    conta('tutor_conversas', { status: 'eq.enviada' }),
    conta('entregas', { status: 'eq.pendente' }),
    conta('depoimentos', { status: 'eq.pendente' }),
    conta('comentarios', { status: 'eq.publicado', tipo: 'eq.duvida', pai_id: 'is.null', resolvido: 'is.false', equipe_id: 'is.null' }),
  ]);
  return { comentarios, duvidas, entregas, depoimentos, sem_resposta: semResposta };
}

// ---------------------------------------------------------------- comentários
export async function listarComentariosEquipe(x, { status = 'pendente', pagina = 1 }) {
  exigir(x.u, 'comunidade.ver');
  const filtros = { pai_id: 'is.null' };
  if (status === 'duvidas') Object.assign(filtros, { status: 'eq.publicado', tipo: 'eq.duvida', resolvido: 'is.false' });
  else if (['pendente', 'publicado', 'oculto'].includes(status)) filtros.status = `eq.${status}`;
  const r = await db.select(x.env, 'comentarios', {
    filtros, contar: true, limite: 30, offset: (Math.max(1, pagina) - 1) * 30, ordem: 'criado_em.desc',
    select: 'id,texto,minuto_s,tipo,status,motivo_pendente,oficial,fixado,resolvido,curtidas,criado_em,aula:aulas(id,codigo,titulo),aluno:alunos!comentarios_aluno_id_fkey(id,nome,email),equipe:equipe(nome),respostas:comentarios!pai_id(id,texto,criado_em,oficial,status,equipe:equipe(nome),aluno:alunos!comentarios_aluno_id_fkey(nome))',
  });
  return { itens: r.linhas, total: r.total, por_pagina: 30 };
}

export async function moderarComentario(x, cid, acao) {
  exigir(x.u, 'comunidade.editar');
  const mudanca = { publicar: { status: 'publicado', motivo_pendente: null }, ocultar: { status: 'oculto' }, fixar: { fixado: true }, desafixar: { fixado: false }, resolver: { resolvido: true } }[acao];
  if (!mudanca) throw new Erro(400, 'Ação inválida.');
  const [c] = await db.update(x.env, 'comentarios', { id: `eq.${id(cid)}` }, mudanca, 'id,aluno_id,aula_id');
  if (!c) throw new Erro(404, 'Comentário não encontrado.');
  await auditar(x.env, x.u, `comentario.${acao}`, `comentario:${c.id}`);
  return { ok: true };
}

export async function responderComentario(x, cid, d) {
  exigir(x.u, 'comunidade.editar');
  const pai = await db.um(x.env, 'comentarios', { id: `eq.${id(cid)}` }, 'id,pai_id,aula_id,curso_id,aluno_id,texto,aula:aulas(id,codigo,titulo),aluno:alunos!comentarios_aluno_id_fkey(nome,email)');
  if (!pai) throw new Erro(404, 'Comentário não encontrado.');
  const raiz = pai.pai_id || pai.id;
  const t = texto(d.texto, 2000, 'Escreva a resposta.');
  const [c] = await db.insert(x.env, 'comentarios', { aula_id: pai.aula_id, curso_id: pai.curso_id, equipe_id: x.u.id, pai_id: raiz, texto: t, oficial: true, status: 'publicado' }, { select: 'id' });
  await db.update(x.env, 'comentarios', { id: `eq.${raiz}` }, { resolvido: !!d.resolver || undefined, status: 'publicado' }, 'id').catch(() => {});
  if (pai.aluno_id) {
    const link = `/aulas/${pai.aula_id}?aba=comentarios`;
    await notificar(x.env, pai.aluno_id, { tipo: 'resposta', titulo: 'A equipe respondeu o seu comentário', texto: t.slice(0, 140), link, ref: `resposta:${c.id}` });
    const m = emailResposta({ nome: pai.aluno && pai.aluno.nome, aula: pai.aula ? `${pai.aula.codigo} ${pai.aula.titulo}` : 'da aula', resposta: t, link: `${cursoUrl(x.env)}${link}` });
    if (pai.aluno && pai.aluno.email) await enviarEmail(x.env, { para: pai.aluno.email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: 'resposta', ref: `comentario:${c.id}` }).catch(() => {});
  }
  await auditar(x.env, x.u, 'comentario.responder', `comentario:${raiz}`);
  return { id: c.id };
}

// ---------------------------------------------------------------- dúvidas do tutor e respostas prontas
export async function listarDuvidas(x, { status = 'enviada' }) {
  exigir(x.u, 'comunidade.ver');
  const filtros = ['enviada', 'respondida', 'aberta'].includes(status) ? { status: `eq.${status}` } : {};
  const conversas = await db.select(x.env, 'tutor_conversas', { filtros, select: 'id,status,enviada_em,respondida_em,atualizado_em,aula:aulas(id,codigo,titulo),aluno:alunos!tutor_conversas_aluno_id_fkey(nome,email)', ordem: 'atualizado_em.desc', limite: 40 });
  if (!conversas.length) return [];
  const msgs = await db.select(x.env, 'tutor_mensagens', { filtros: { conversa_id: `in.(${conversas.map((c) => c.id).join(',')})` }, select: 'conversa_id,papel,texto,com_imagem,util,criado_em', ordem: 'criado_em.asc', limite: 600 });
  return conversas.map((c) => ({ ...c, mensagens: msgs.filter((m) => m.conversa_id === c.id) }));
}

export async function responderDuvida(x, conversaId, d) {
  exigir(x.u, 'comunidade.editar');
  const c = await db.um(x.env, 'tutor_conversas', { id: `eq.${id(conversaId)}` }, 'id,aluno_id,aula_id,curso_id,aula:aulas(codigo,titulo),aluno:alunos!tutor_conversas_aluno_id_fkey(nome,email)');
  if (!c) throw new Erro(404, 'Dúvida não encontrada.');
  const t = texto(d.texto, 3000, 'Escreva a resposta.');
  await db.insert(x.env, 'tutor_mensagens', { conversa_id: c.id, aluno_id: c.aluno_id, papel: 'equipe', texto: t }, { select: 'id' });
  await db.update(x.env, 'tutor_conversas', { id: `eq.${c.id}` }, { status: 'respondida', resposta_equipe: t, respondida_por: x.u.id, respondida_em: new Date().toISOString() }, 'id');
  // Pergunta que se repete vira resposta pronta (custo zero da próxima vez).
  if (d.virar_pronta) {
    const ultima = await db.um(x.env, 'tutor_mensagens', { conversa_id: `eq.${c.id}`, papel: 'eq.aluno', order: 'criado_em.desc' }, 'texto');
    if (ultima) await salvarRespostaPronta(x, { curso_id: c.curso_id, aula_id: c.aula_id, pergunta: ultima.texto, resposta: t, palavras: d.palavras || [] });
  }
  const link = c.aula_id ? `/aulas/${c.aula_id}?aba=tutor` : '/';
  await notificar(x.env, c.aluno_id, { tipo: 'resposta', titulo: 'A equipe respondeu a sua dúvida', texto: t.slice(0, 140), link, ref: `duvida:${c.id}:${Date.now()}` });
  const m = emailResposta({ nome: c.aluno && c.aluno.nome, aula: c.aula ? `${c.aula.codigo} ${c.aula.titulo}` : 'do curso', resposta: t, link: `${cursoUrl(x.env)}${link}` });
  if (c.aluno && c.aluno.email) await enviarEmail(x.env, { para: c.aluno.email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: 'resposta', ref: `duvida:${c.id}` }).catch(() => {});
  await auditar(x.env, x.u, 'duvida.responder', `duvida:${c.id}`, { pronta: !!d.virar_pronta });
  return { ok: true };
}

export async function listarRespostasProntas(x) {
  exigir(x.u, 'comunidade.ver');
  return db.select(x.env, 'tutor_respostas_prontas', { select: 'id,pergunta,resposta,palavras,ativa,usos,criado_em,aula:aulas(codigo,titulo)', ordem: 'usos.desc,criado_em.desc', limite: 200 });
}

export async function salvarRespostaPronta(x, d, pid) {
  exigir(x.u, 'comunidade.editar');
  const dados = {
    pergunta: texto(d.pergunta, 1500, 'Escreva a pergunta.'), resposta: texto(d.resposta, 3000, 'Escreva a resposta.'),
    palavras: (Array.isArray(d.palavras) ? d.palavras : String(d.palavras || '').split(',')).map((p) => String(p).trim().toLowerCase()).filter(Boolean).slice(0, 8),
  };
  if (d.ativa !== undefined) dados.ativa = !!d.ativa;
  if (!pid) Object.assign(dados, { curso_id: d.curso_id || null, aula_id: d.aula_id || null, criado_por: x.u.id });
  const [r] = pid
    ? await db.update(x.env, 'tutor_respostas_prontas', { id: `eq.${id(pid)}` }, dados, 'id')
    : await db.insert(x.env, 'tutor_respostas_prontas', dados, { select: 'id' });
  await auditar(x.env, x.u, pid ? 'pronta.editar' : 'pronta.criar', `pronta:${r.id}`);
  return r;
}

// Custo e uso do tutor (painel > Integrações > Claude).
export async function numerosTutor(x) {
  exigir(x.u, 'ia.ver');
  const inicio = new Date(); inicio.setUTCDate(1); inicio.setUTCHours(3, 0, 0, 0);
  const [gasto, msgs] = await Promise.all([
    db.rpc(x.env, 'tutor_gasto_mes'),
    db.select(x.env, 'tutor_mensagens', { filtros: { criado_em: `gte.${inicio.toISOString()}` }, select: 'papel,util,pronta_id,modelo,conversa:tutor_conversas(aula:aulas(codigo,titulo),curso:cursos(titulo))', limite: 5000 }),
  ]);
  const perguntas = msgs.filter((m) => m.papel === 'aluno');
  const respostas = msgs.filter((m) => m.papel === 'tutor');
  const porAula = {};
  for (const m of perguntas) {
    // A ajudante dos cursos de leitura (tutor-leitura.js) pergunta sobre o curso inteiro, sem aula.
    const a = m.conversa && m.conversa.aula ? `${m.conversa.aula.codigo} ${m.conversa.aula.titulo}` : m.conversa && m.conversa.curso ? `Ajudante · ${m.conversa.curso.titulo}` : 'Sem aula';
    porAula[a] = (porAula[a] || 0) + 1;
  }
  return {
    gasto_usd: Number(gasto), perguntas: perguntas.length, prontas: respostas.filter((r) => r.pronta_id).length,
    uteis: respostas.filter((r) => r.util === true).length, nao_uteis: respostas.filter((r) => r.util === false).length,
    por_aula: Object.entries(porAula).map(([aula, n]) => ({ aula, n })).sort((a, b) => b.n - a.n).slice(0, 10),
    modelos: Object.entries(MODELOS).map(([idm, m]) => ({ id: idm, nome: m.nome, preco: m.preco })),
  };
}

// ---------------------------------------------------------------- depoimentos
export async function listarDepoimentos(x, { status = 'pendente' }) {
  exigir(x.u, 'comunidade.ver');
  return db.select(x.env, 'depoimentos', { filtros: ['pendente', 'aprovado', 'recusado'].includes(status) ? { status: `eq.${status}` } : {}, select: 'id,nota,texto,video_url,autoriza_uso,status,na_landing,resultado,criado_em,aluno:alunos(id,nome,email,instagram,foto_url),curso:cursos(titulo)', ordem: 'criado_em.desc', limite: 60 });
}

export async function avaliarDepoimento(x, did, d) {
  exigir(x.u, 'comunidade.editar');
  const status = d.acao === 'aprovar' ? 'aprovado' : d.acao === 'recusar' ? 'recusado' : null;
  const mudanca = {};
  if (status) Object.assign(mudanca, { status, avaliado_por: x.u.id, avaliado_em: new Date().toISOString() });
  if (d.na_landing !== undefined) mudanca.na_landing = !!d.na_landing;
  const [dep] = await db.update(x.env, 'depoimentos', { id: `eq.${id(did)}` }, mudanca, 'id,aluno_id,autoriza_uso,na_landing,status');
  if (!dep) throw new Erro(404, 'Depoimento não encontrado.');
  if (dep.na_landing && !dep.autoriza_uso) { await db.update(x.env, 'depoimentos', { id: `eq.${dep.id}` }, { na_landing: false }, 'id'); throw new Erro(409, 'Esse aluno não autorizou usar o depoimento na página.'); }
  if (status === 'aprovado') await ganharXP(x.env, dep.aluno_id, 'depoimento', `depoimento:${dep.id}`, { pontos: PONTOS.depoimento });
  await auditar(x.env, x.u, `depoimento.${d.acao || 'editar'}`, `depoimento:${dep.id}`, mudanca);
  return { ok: true };
}

// Depoimentos aprovados e autorizados para a landing do curso (o bloco "depoimentos" lê daqui).
export async function depoimentosDaLanding(env, cursoIds = []) {
  const filtros = { status: 'eq.aprovado', na_landing: 'is.true', autoriza_uso: 'is.true' };
  if (cursoIds.length) filtros.curso_id = `in.(${cursoIds.join(',')})`;
  return db.select(env, 'depoimentos', { filtros, select: 'nota,texto,aluno:alunos(nome,instagram,foto_url)', ordem: 'nota.desc,criado_em.desc', limite: 12 });
}

// ---------------------------------------------------------------- desafios e entregas
const CAMPOS_DESAFIO = ['titulo', 'descricao', 'regras', 'premio', 'curso_id', 'capa_url', 'inicio', 'fim', 'conquista_id', 'status'];
export async function listarDesafiosEquipe(x) {
  exigir(x.u, 'comunidade.ver');
  return db.select(x.env, 'desafios', { select: '*,entregas(count)', ordem: 'criado_em.desc', limite: 50 });
}

export async function salvarDesafio(x, d, did) {
  exigir(x.u, 'comunicacao.editar');
  const dados = {};
  for (const k of CAMPOS_DESAFIO) if (d[k] !== undefined) dados[k] = d[k] === '' ? null : d[k];
  if (!did) {
    dados.titulo = texto(d.titulo, 120, 'Dê um título ao desafio.');
    dados.slug = String(d.slug || d.titulo).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    dados.criado_por = x.u.id;
  }
  if (dados.status && !['rascunho', 'aberto', 'encerrado'].includes(dados.status)) throw new Erro(400, 'Situação inválida.');
  const antes = did ? await db.um(x.env, 'desafios', { id: `eq.${id(did)}` }, 'status') : null;
  const [r] = did ? await db.update(x.env, 'desafios', { id: `eq.${did}` }, dados, 'id,slug,titulo,status,fim') : await db.insert(x.env, 'desafios', dados, { select: 'id,slug,titulo,status,fim' });
  // Abriu agora: aviso no sino de todo aluno ativo (e e-mail, se o Resend estiver ligado).
  if (r.status === 'aberto' && (!antes || antes.status !== 'aberto')) await avisarDesafio(x.env, r).catch((e) => console.error('desafio aviso', e.message));
  await auditar(x.env, x.u, did ? 'desafio.editar' : 'desafio.criar', `desafio:${r.id}`, { status: r.status });
  return r;
}

async function avisarDesafio(env, d) {
  const alunos = await db.select(env, 'matriculas', { filtros: { status: 'eq.ativa' }, select: 'aluno:alunos(id,nome,email)', limite: 1000 });
  const vistos = new Set();
  const fim = d.fim ? new Date(d.fim).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null;
  const link = `/turma?aba=desafios&desafio=${d.slug}`;
  const linhas = [];
  for (const m of alunos) {
    if (!m.aluno || vistos.has(m.aluno.id)) continue;
    vistos.add(m.aluno.id);
    linhas.push({ aluno_id: m.aluno.id, tipo: 'desafio', titulo: `Desafio novo: ${d.titulo}`, texto: fim ? `Até ${fim}` : null, link, ref: `desafio:${d.id}` });
  }
  for (let i = 0; i < linhas.length; i += 200) await db.insert(env, 'notificacoes', linhas.slice(i, i + 200), { ignorar: true, conflito: 'aluno_id,ref', select: 'id' });
  if (env.RESEND_CHAVE) {
    for (const m of alunos.slice(0, 80)) {
      if (!m.aluno) continue;
      const e = emailDesafio({ nome: m.aluno.nome, titulo: d.titulo, link: `${cursoUrl(env)}${link}`, fim });
      await enviarEmail(env, { para: m.aluno.email, assunto: e.assunto, html: e.html, texto: e.texto, tipo: 'desafio', ref: `desafio:${d.id}` }).catch(() => {});
    }
  }
}

export async function listarEntregas(x, { status = 'pendente' }) {
  exigir(x.u, 'comunidade.ver');
  return db.select(x.env, 'entregas', { filtros: ['pendente', 'aprovada', 'destaque', 'recusada'].includes(status) ? { status: `eq.${status}` } : {}, select: 'id,titulo,descricao,link,imagem_url,status,motivo,autoriza_repost,curtidas,criado_em,aluno:alunos!entregas_aluno_id_fkey(id,nome,email,instagram),desafio:desafios(titulo,conquista_id)', ordem: 'criado_em.desc', limite: 60 });
}

export async function avaliarEntrega(x, eid, d) {
  exigir(x.u, 'comunidade.editar');
  const status = { aprovar: 'aprovada', destaque: 'destaque', recusar: 'recusada' }[d.acao];
  if (!status) throw new Erro(400, 'Ação inválida.');
  const [e] = await db.update(x.env, 'entregas', { id: `eq.${id(eid)}` }, { status, motivo: status === 'recusada' ? String(d.motivo || '').slice(0, 300) || null : null, avaliada_por: x.u.id, avaliada_em: new Date().toISOString() }, 'id,aluno_id,titulo,desafio_id,curso_id,desafio:desafios(conquista_id)');
  if (!e) throw new Erro(404, 'Criação não encontrada.');
  if (status !== 'recusada') {
    await ganharXP(x.env, e.aluno_id, 'entrega', `entrega:${e.id}`, { pontos: PONTOS.entrega, curso_id: e.curso_id, selos: false });
    if (status === 'destaque') await ganharXP(x.env, e.aluno_id, 'destaque', `destaque:${e.id}`, { pontos: PONTOS.destaque, curso_id: e.curso_id, selos: false });
    // Recompensa visual por criar: moldura no avatar.
    await db.update(x.env, 'alunos', { id: `eq.${e.aluno_id}` }, { moldura: true }, 'id');
    // Selo do desafio, se a equipe ligou um.
    if (e.desafio && e.desafio.conquista_id) await db.insert(x.env, 'aluno_conquistas', { aluno_id: e.aluno_id, conquista_id: e.desafio.conquista_id }, { ignorar: true, conflito: 'aluno_id,conquista_id', select: 'aluno_id' }).catch(() => {});
    await conferirSelos(x.env, e.aluno_id);
  }
  await notificar(x.env, e.aluno_id, {
    tipo: 'entrega', titulo: status === 'recusada' ? 'Sua criação não entrou no mural' : status === 'destaque' ? 'Sua criação virou destaque!' : 'Sua criação está no mural',
    texto: status === 'recusada' ? d.motivo || e.titulo : e.titulo, link: '/turma', ref: `entrega:${e.id}:${status}`,
  });
  await auditar(x.env, x.u, `entrega.${d.acao}`, `entrega:${e.id}`);
  return { ok: true };
}

// ---------------------------------------------------------------- selos
export async function listarConquistas(x) {
  exigir(x.u, 'comunidade.ver');
  const [lista, ganhos] = await Promise.all([
    db.select(x.env, 'conquistas', { select: '*', ordem: 'ordem.asc' }),
    db.select(x.env, 'aluno_conquistas', { select: 'conquista_id', limite: 10000 }),
  ]);
  return lista.map((c) => ({ ...c, ganhos: ganhos.filter((g) => g.conquista_id === c.id).length }));
}

export async function salvarConquista(x, d, cid) {
  exigir(x.u, 'comunicacao.editar');
  const dados = {};
  for (const k of ['nome', 'descricao', 'raridade', 'icone', 'cor', 'regra', 'xp', 'ordem', 'ativa', 'secreta']) if (d[k] !== undefined) dados[k] = d[k];
  if (dados.raridade && !['comum', 'rara', 'epica', 'lendaria'].includes(dados.raridade)) throw new Erro(400, 'Raridade inválida.');
  if (dados.xp !== undefined) dados.xp = Math.max(0, Math.min(1000, Math.round(Number(dados.xp) || 0)));
  let r;
  if (cid) [r] = await db.update(x.env, 'conquistas', { id: `eq.${cid}` }, dados, 'id');
  else {
    dados.id = String(d.id || d.nome).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    dados.nome = texto(d.nome, 60, 'Dê um nome ao selo.');
    dados.descricao = texto(d.descricao, 200, 'Escreva como se ganha o selo.');
    [r] = await db.insert(x.env, 'conquistas', dados, { select: 'id' });
  }
  if (!r) throw new Erro(404, 'Selo não encontrado.');
  await auditar(x.env, x.u, cid ? 'selo.editar' : 'selo.criar', `selo:${r.id}`);
  return r;
}

// ---------------------------------------------------------------- comunicação: banners, avisos, eventos
const CAMPOS_AVISO = ['tipo', 'titulo', 'texto', 'imagem_url', 'botao_texto', 'botao_link', 'publico', 'inicio', 'fim', 'evento_em', 'evento_fim', 'evento_link', 'gravacao_aula_id', 'importante', 'ativo', 'ordem'];
export async function listarAvisos(x) {
  exigir(x.u, 'comunidade.ver');
  return db.select(x.env, 'avisos', { select: '*', ordem: 'criado_em.desc', limite: 100 });
}

export async function salvarAviso(x, d, aid) {
  exigir(x.u, 'comunicacao.editar');
  const dados = {};
  for (const k of CAMPOS_AVISO) if (d[k] !== undefined) dados[k] = d[k] === '' ? null : d[k];
  if (!aid) { dados.titulo = texto(d.titulo, 140, 'Dê um título.'); dados.criado_por = x.u.id; }
  if (dados.tipo && !['banner', 'aviso', 'evento'].includes(dados.tipo)) throw new Erro(400, 'Tipo inválido.');
  if ((dados.tipo === 'evento' || (!aid && d.tipo === 'evento')) && !dados.evento_em && !aid) throw new Erro(400, 'Evento precisa da data e da hora.');
  for (const k of ['botao_link', 'evento_link']) if (dados[k] && !/^(https:\/\/|\/)/.test(dados[k])) throw new Erro(400, 'Link precisa começar com https:// ou /');
  if (dados.publico && typeof dados.publico !== 'object') throw new Erro(400, 'Público inválido.');
  if (dados.publico === null) dados.publico = {};
  const [r] = aid ? await db.update(x.env, 'avisos', { id: `eq.${id(aid)}` }, dados, '*') : await db.insert(x.env, 'avisos', dados, { select: '*' });
  if (!r) throw new Erro(404, 'Aviso não encontrado.');
  await auditar(x.env, x.u, aid ? 'aviso.editar' : 'aviso.criar', `aviso:${r.id}`, { tipo: r.tipo, ativo: r.ativo });
  return r;
}
