// O que a área de membros faz sozinha no relógio de 10 minutos, com pouco por vez (plano grátis: 50 chamadas por execução):
// lembrete de evento ao vivo (sempre), e uma da vez: recuperação de compra (Pix vencido, cartão recusado), "você parou"
// e o resumo da semana (segunda de manhã). E-mail só sai com o Resend ligado; sem ele, só o sino.
import { db } from '../nucleo/db.js';
import { cursoUrl, linkDeEntrada } from './alunos.js';
import { emailParou, emailResumoSemanal, enviarEmail } from './emails.js';
import { notificar } from './jogo.js';
import { cuidarDasNotas } from './notas.js';
import { planoDaSemana } from './plano.js';
import { enviarWebhooks, relatorioDaSemana } from './plataforma.js';
import { enviarLembretes } from './recuperacao.js';

const HORA = 3600_000;
const DIA = 24 * HORA;
const agoraSP = () => new Date(Date.now() - 3 * HORA);

// Eventos que começam na próxima hora: aviso no sino (e e-mail) para quem pediu "Me lembre".
async function lembretesDeEvento(env) {
  const agora = Date.now();
  const eventos = await db.select(env, 'avisos', { filtros: { tipo: 'eq.evento', ativo: 'is.true', evento_em: `gte.${new Date(agora).toISOString()}`, and: `(evento_em.lte.${new Date(agora + HORA).toISOString()})` }, select: 'id,titulo,evento_em,evento_link', limite: 3 });
  let n = 0;
  for (const e of eventos) {
    const pedidos = await db.select(env, 'aviso_interacoes', { filtros: { aviso_id: `eq.${e.id}`, tipo: 'eq.lembrete' }, select: 'aluno_id', limite: 200 });
    if (!pedidos.length) continue;
    const hora = new Date(e.evento_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    const linhas = pedidos.map((p) => ({ aluno_id: p.aluno_id, tipo: 'evento', titulo: `Hoje às ${hora}: ${e.titulo}`, texto: 'O link aparece no início 10 minutos antes.', link: '/', ref: `evento:${e.id}` }));
    const novos = await db.insert(env, 'notificacoes', linhas, { ignorar: true, conflito: 'aluno_id,ref', select: 'aluno_id' });
    n += novos.length;
  }
  return n;
}

// Quem chegou no checkout e não comprou: 15 minutos depois e no dia seguinte, um e-mail (lib/recuperacao.js).
async function recuperacao(env) {
  if (!env.RESEND_CHAVE) return 'sem e-mail';
  return enviarLembretes(env);
}

// "Você parou": uma vez por dia (10h), para quem não assiste há 7 dias. No máximo um a cada 30 dias por aluno.
async function parou(env) {
  if (!env.RESEND_CHAVE) return 'sem e-mail';
  const sp = agoraSP();
  if (sp.getUTCHours() !== 10) return 'fora da hora';
  const agora = Date.now();
  const parados = await db.select(env, 'progresso', {
    filtros: { concluida_em: 'is.null', atualizado_em: `lte.${new Date(agora - 7 * DIA).toISOString()}`, and: `(atualizado_em.gte.${new Date(agora - 8 * DIA).toISOString()})` },
    select: 'aluno_id,aula_id,posicao_s,aula:aulas(codigo,titulo),aluno:alunos(id,nome,email,auth_id,ultimo_acesso)', ordem: 'atualizado_em.desc', limite: 8,
  });
  let n = 0;
  const vistos = new Set();
  for (const p of parados) {
    if (!p.aluno || vistos.has(p.aluno_id)) continue;
    vistos.add(p.aluno_id);
    if (p.aluno.ultimo_acesso && agora - new Date(p.aluno.ultimo_acesso).getTime() < 7 * DIA) continue;
    const recente = await db.um(env, 'emails', { para: `eq.${p.aluno.email}`, tipo: 'eq.parou', criado_em: `gte.${new Date(agora - 30 * DIA).toISOString()}` }, 'id');
    if (recente) continue;
    const { link } = await linkDeEntrada(env, p.aluno);
    const m = emailParou({ nome: p.aluno.nome, aula: p.aula ? `${p.aula.codigo} ${p.aula.titulo}` : 'a sua aula', link: `${link}&volta=${encodeURIComponent(`/aulas/${p.aula_id}?t=${p.posicao_s || 0}`)}`, dias: 7 });
    await enviarEmail(env, { para: p.aluno.email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: 'parou', ref: `parou:${p.aluno_id}:${p.aula_id}` });
    n++;
  }
  return n;
}

// Resumo da semana: segunda, das 9h às 12h, aos poucos (quem entrou nos últimos 30 dias).
async function resumoSemanal(env) {
  if (!env.RESEND_CHAVE) return 'sem e-mail';
  const sp = agoraSP();
  if (sp.getUTCDay() !== 1 || sp.getUTCHours() < 9 || sp.getUTCHours() > 11) return 'fora da hora';
  const semana = sp.toISOString().slice(0, 10);
  const agora = Date.now();
  const alunos = await db.select(env, 'alunos', { filtros: { ultimo_acesso: `gte.${new Date(agora - 30 * DIA).toISOString()}` }, select: 'id,nome,email,sequencia', ordem: 'id.asc', limite: 200 });
  const ja = await db.select(env, 'emails', { filtros: { tipo: 'eq.resumo', ref: `like.resumo:*:${semana}` }, select: 'para', limite: 1000 });
  const feitos = new Set(ja.map((e) => e.para));
  const fila = alunos.filter((a) => !feitos.has(a.email)).slice(0, 6);
  const [mural, desafio] = await Promise.all([
    db.select(env, 'entregas', { filtros: { status: 'in.(aprovada,destaque)', criado_em: `gte.${new Date(agora - 7 * DIA).toISOString()}` }, select: 'id', limite: 100 }),
    db.um(env, 'desafios', { status: 'eq.aberto' }, 'titulo'),
  ]);
  let n = 0;
  for (const a of fila) {
    const xp = await db.select(env, 'xp_eventos', { filtros: { aluno_id: `eq.${a.id}`, criado_em: `gte.${new Date(agora - 7 * DIA).toISOString()}` }, select: 'tipo,pontos', limite: 500 });
    const aulas = xp.filter((x) => x.tipo === 'aula').length;
    const pontos = xp.reduce((s, x) => s + x.pontos, 0);
    const linhas = [
      aulas ? `Você assistiu ${aulas} ${aulas === 1 ? 'aula' : 'aulas'} e fez ${pontos} XP na semana.` : 'Essa semana passou sem aula. Dez minutos hoje já colocam você de volta no ritmo.',
      a.sequencia > 1 ? `Sua sequência está em ${a.sequencia} dias.` : null,
      mural.length ? `A turma colocou ${mural.length} ${mural.length === 1 ? 'criação' : 'criações'} no mural.` : null,
      desafio ? `Desafio aberto: ${desafio.titulo}.` : null,
    ].filter(Boolean);
    const m = emailResumoSemanal({ nome: a.nome, linhas, link: cursoUrl(env) });
    await enviarEmail(env, { para: a.email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: 'resumo', ref: `resumo:${a.id}:${semana}` });
    n++;
  }
  return n;
}

const VEZ = [parou, resumoSemanal, relatorioDaSemana, planoDaSemana];
export async function cuidarDaArea(env, quando = Date.now()) {
  const eventos = await lembretesDeEvento(env).catch((e) => ({ erro: e.message }));
  const notas = await cuidarDasNotas(env).catch((e) => ({ erro: e.message }));
  const webhooks = await enviarWebhooks(env).catch((e) => ({ erro: e.message }));
  // Fora do rodízio: o lembrete perde força a cada minuto, então confere toda rodada de 10 minutos.
  const lembretes = await recuperacao(env).catch((e) => ({ erro: e.message }));
  const tarefa = VEZ[Math.floor(quando / 600_000) % VEZ.length];
  const feito = await tarefa(env, quando).catch((e) => ({ erro: e.message }));
  return { eventos, notas, webhooks, lembretes, [tarefa.name]: feito };
}
