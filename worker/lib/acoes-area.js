// Ações da área de membros (vendas, alunos, aulas, ofertas, links). Mesma regra de acoes.js: cada uma confere o cargo
// (permissoes.js) e grava na auditoria; o painel chama daqui (e o conector do Claude, quando ganhar estas ferramentas).
import { auditar, exigir } from '../nucleo/auth.js';
import { cifrar } from '../nucleo/cripto.js';
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { cursoUrl, emailValido, garantirAluno, linkDeEntrada, normalEmail } from './alunos.js';
import { emailBoasVindas, emailBoasVindasEn, enviarEmail } from './emails.js';
import { cursosComMarca } from './marcas.js';
import { asaas, esquecerAsaas, prepararAsaas } from '../pagamento/index.js';
import { canalDe } from './origem.js';
import { cancelarReembolso, devolverReembolsoAgora, entregarAcesso, filaDeReembolso, reembolsar } from './vendas.js';
import { avisarSistemas, pessoa } from './plataforma.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id = (v) => { if (!UUID.test(String(v))) throw new Erro(404, 'Não encontrado.'); return v; };
const PEDIDO_LISTA = 'id,numero,status,metodo,parcelas,total_centavos,moeda,teste,criado_em,pago_em,provedor,primeiro_toque,ultimo_toque,aluno:alunos!pedidos_aluno_id_fkey(id,nome,email),oferta:ofertas(nome,slug),reembolsos(status,devolver_em)';

// ---------------------------------------------------------------- vendas
const DIA = 86400_000;
const BRASILIA = 3 * 3600_000;
const diaBr = (ms) => new Date(ms - BRASILIA).toISOString().slice(0, 10);
const NAO_PAGOS = ['aberto', 'aguardando', 'expirado', 'recusado', 'cancelado'];

function periodoDe({ de, ate, dias }) {
  const fim = ate ? new Date(ate) : new Date();
  const ini = de ? new Date(de) : new Date(fim.getTime() - Math.min(730, Math.max(1, Number(dias) || 30)) * DIA);
  if (Number.isNaN(ini.getTime()) || Number.isNaN(fim.getTime()) || ini >= fim || fim - ini > 732 * DIA) throw new Erro(400, 'Período inválido (até 2 anos).');
  return { ini: ini.getTime(), fim: fim.getTime(), antes: ini.getTime() - (fim.getTime() - ini.getTime()) };
}

// O Supabase devolve até 1000 linhas por pedido: junta até 3 páginas e avisa quando pode ter ficado algo de fora.
async function paginas(env, tabela, op) {
  const saida = [];
  for (let i = 0; i < 3; i++) {
    const l = await db.select(env, tabela, { ...op, limite: 1000, offset: i * 1000 });
    saida.push(...l);
    if (l.length < 1000) return { linhas: saida, cortou: false };
  }
  return { linhas: saida, cortou: true };
}

// Quanto de cada pedido é de cada produto (com cupom e juros, a parte de cada um no total pago; o bump conta como produto).
function fatias(p) {
  const it = p.itens || [];
  const soma = it.reduce((s, i) => s + (i.centavos || 0), 0);
  if (!it.length || !soma) return [{ id: p.oferta_id, nome: 'Sem produto', bump: false, centavos: p.total_centavos }];
  return it.map((i) => ({ id: i.oferta_id || i.nome, nome: i.nome, bump: !!i.bump, centavos: Math.round((p.total_centavos * (i.centavos || 0)) / soma) }));
}

const somar = (mapa, chave, base, n, centavos) => { const c = mapa[chave] || (mapa[chave] = { ...base, vendas: 0, centavos: 0 }); c.vendas += n; c.centavos += centavos; };
const ordenar = (mapa) => Object.values(mapa).sort((a, b) => b.centavos - a.centavos || (b.visitas || 0) - (a.visitas || 0));

// Todos os números de um período, com os filtros. As vendas contam pela data do pagamento (Pix de ontem pago hoje é
// venda de hoje); pedidos não pagos, pela data em que nasceram. Pedidos de teste ficam fora dos números.
async function calcularVendas(env, { de, ate, dias, moeda = 'brl', produto, canal, campanha, conteudo } = {}) {
  const m = moeda === 'usd' ? 'usd' : 'brl';
  const { ini, fim, antes } = periodoDe({ de, ate, dias });
  const iso = (ms) => new Date(ms).toISOString();
  const faixa = (c, a, b) => `and(${c}.gte.${iso(a)},${c}.lt.${iso(b)})`;
  const [ped, toq, alunos] = await Promise.all([
    paginas(env, 'pedidos', { filtros: { moeda: `eq.${m}`, or: `(${faixa('criado_em', antes, fim)},${faixa('pago_em', antes, fim)})` }, select: 'id,aluno_id,status,metodo,total_centavos,teste,criado_em,pago_em,oferta_id,itens,ultimo_toque', ordem: 'criado_em.desc' }),
    // As visitas não dizem a moeda: só no real, onde mora quase todo o tráfego, e sem o filtro de produto.
    m === 'brl' && !produto ? paginas(env, 'toques', { filtros: { and: `(quando.gte.${iso(ini)},quando.lt.${iso(fim)})` }, select: 'visitante,origem,meio,campanha,conteudo', ordem: 'quando.desc' }) : { linhas: null, cortou: false },
    db.select(env, 'alunos', { select: 'id', limite: 1, contar: true }),
  ]);
  const passa = (t, sem) => (sem === 'canal' || !canal || canalDe(t) === canal) && (sem === 'campanha' || !campanha || (t || {}).campanha === campanha) && (sem === 'conteudo' || !conteudo || (t || {}).conteudo === conteudo);
  const temProduto = (p) => !produto || fatias(p).some((f) => f.id === produto);
  const valor = (p) => (produto ? fatias(p).filter((f) => f.id === produto).reduce((s, f) => s + f.centavos, 0) : p.total_centavos);
  const entre = (v, a, b) => { const t = v ? Date.parse(v) : NaN; return t >= a && t < b; };

  const reais = ped.linhas.filter((p) => !p.teste);
  const pagoEm = (p, a, b) => p.status === 'pago' && entre(p.pago_em, a, b);
  const pagos = reais.filter((p) => pagoEm(p, ini, fim) && temProduto(p));
  const filtrados = pagos.filter((p) => passa(p.ultimo_toque));
  const anteriores = reais.filter((p) => pagoEm(p, antes, ini) && temProduto(p) && passa(p.ultimo_toque));
  const nasceram = reais.filter((p) => entre(p.criado_em, ini, fim) && temProduto(p) && passa(p.ultimo_toque));
  const fat = (l) => l.reduce((s, p) => s + valor(p), 0);
  // Só conta quem não comprou mesmo: a pessoa que tentou de novo e pagou a mesma oferta fica de fora, e quem tentou 3 vezes
  // conta uma vez, no pedido mais novo (a lista já vem do mais novo para o mais antigo).
  const pessoa = (p) => `${p.aluno_id}|${p.oferta_id}`;
  const compraram = new Set(reais.filter((p) => p.status === 'pago').map(pessoa));
  const vistos = new Set();
  const naoPagos = nasceram.filter((p) => {
    if (!NAO_PAGOS.includes(p.status) || compraram.has(pessoa(p)) || vistos.has(pessoa(p))) return false;
    vistos.add(pessoa(p));
    return true;
  });
  const devolvidos = reais.filter((p) => ['reembolsado', 'contestado'].includes(p.status) && entre(p.pago_em || p.criado_em, ini, fim) && temProduto(p) && passa(p.ultimo_toque));

  const dia = {};
  for (const p of filtrados) { const k = diaBr(Date.parse(p.pago_em)); (dia[k] = dia[k] || { pagos: 0, centavos: 0 }).pagos += 1; dia[k].centavos += valor(p); }
  const porDia = [];
  for (let t = Date.parse(`${diaBr(ini)}T12:00:00Z`), f = diaBr(fim - 1); ; t += DIA) { const k = new Date(t).toISOString().slice(0, 10); porDia.push({ dia: k, ...(dia[k] || { pagos: 0, centavos: 0 }) }); if (k >= f || porDia.length > 800) break; }

  // Cada lista ignora o próprio filtro: escolher um canal não some com os outros da tabela, e dá para comparar.
  const produtos = {}, canais = {}, campanhas = {}, conteudos = {};
  for (const p of reais.filter((q) => pagoEm(q, ini, fim) && passa(q.ultimo_toque))) for (const f of fatias(p)) somar(produtos, f.id, { id: f.id, nome: f.nome, bump: 0 }, 1, f.centavos), produtos[f.id].bump += f.bump ? 1 : 0;
  for (const p of pagos) {
    const t = p.ultimo_toque || {};
    if (passa(t, 'canal')) somar(canais, canalDe(t), { nome: canalDe(t) }, 1, valor(p));
    if (t.campanha && passa(t, 'campanha')) somar(campanhas, t.campanha, { nome: t.campanha }, 1, valor(p));
    if (t.conteudo && passa(t, 'conteudo')) somar(conteudos, t.conteudo, { nome: t.conteudo }, 1, valor(p));
  }
  if (toq.linhas) {
    const gente = (mapa, base, chave, v) => { somar(mapa, chave, base, 0, 0); (mapa[chave].gente = mapa[chave].gente || new Set()).add(v); };
    for (const t of toq.linhas) {
      if (passa(t, 'canal')) gente(canais, { nome: canalDe(t) }, canalDe(t), t.visitante);
      if (t.campanha && passa(t, 'campanha')) gente(campanhas, { nome: t.campanha }, t.campanha, t.visitante);
      if (t.conteudo && passa(t, 'conteudo')) gente(conteudos, { nome: t.conteudo }, t.conteudo, t.visitante);
    }
    for (const mapa of [canais, campanhas, conteudos]) for (const c of Object.values(mapa)) { c.visitas = c.gente ? c.gente.size : 0; delete c.gente; }
    // Quem chega sem marca não deixa toque: as visitas do "Direto" não são zero, são desconhecidas.
    if (canais[canalDe(null)]) canais[canalDe(null)].visitas = null;
  }

  // As escolhas dos filtros: tudo o que apareceu no período, pago ou não.
  const noPeriodo = reais.filter((p) => pagoEm(p, ini, fim) || entre(p.criado_em, ini, fim));
  const unicos = (f) => [...new Set(noPeriodo.map(f).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
  const nomeProduto = {};
  for (const p of noPeriodo) for (const f of fatias(p)) if (f.id) nomeProduto[f.id] = f.nome;

  const lista = ped.linhas.filter((p) => (pagoEm(p, ini, fim) || entre(p.criado_em, ini, fim)) && temProduto(p) && passa(p.ultimo_toque));
  const n = filtrados.length;
  return {
    lista,
    resumo: {
      moeda: m, de: iso(ini), ate: iso(fim), cortou: ped.cortou || toq.cortou,
      numeros: {
        pagos: n, faturamento_centavos: fat(filtrados), ticket_centavos: n ? Math.round(fat(filtrados) / n) : 0,
        pix: filtrados.filter((p) => p.metodo === 'pix').length, cartao: filtrados.filter((p) => p.metodo === 'cartao').length,
        aguardando: nasceram.filter((p) => p.status === 'aguardando').length,
        nao_pagos: naoPagos.length, nao_pagos_centavos: fat(naoPagos),
        conversao: nasceram.length ? nasceram.filter((p) => p.status === 'pago').length / nasceram.length : null,
        reembolsados: devolvidos.filter((p) => p.status === 'reembolsado').length, contestados: devolvidos.filter((p) => p.status === 'contestado').length,
        alunos: alunos.total || 0,
        anterior: { pagos: anteriores.length, faturamento_centavos: fat(anteriores) },
      },
      por_dia: porDia,
      produtos: ordenar(produtos), canais: ordenar(canais), campanhas: ordenar(campanhas).slice(0, 30), conteudos: ordenar(conteudos).slice(0, 30),
      // Antes se chamava "origens" (o conector ainda lê assim).
      origens: ordenar(canais).filter((c) => c.vendas).map((c) => ({ origem: c.nome, vendas: c.vendas, centavos: c.centavos })),
      opcoes: {
        produtos: Object.entries(nomeProduto).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
        canais: unicos((p) => canalDe(p.ultimo_toque)), campanhas: unicos((p) => (p.ultimo_toque || {}).campanha), conteudos: unicos((p) => (p.ultimo_toque || {}).conteudo),
      },
    },
  };
}

export const resumoVendas = async (env, op) => (await calcularVendas(env, op)).resumo;

const comCanal = (t) => (t ? { ...t, canal: canalDe(t) } : t);
const pedidoComCanal = (p) => ({ ...p, primeiro_toque: comCanal(p.primeiro_toque), ultimo_toque: comCanal(p.ultimo_toque), canal: canalDe(p.ultimo_toque) });

// moeda: 'brl' (padrão) ou 'usd' (curso em inglês). Números, origens e a lista são só daquela moeda.
// Período: de e ate (data e hora) ou dias (padrão 30). Filtros: produto (id da oferta, bump incluído), canal, campanha, conteudo.
// A busca por pedido, nome ou e-mail procura em todas as datas (quem procura uma pessoa não sabe o dia da compra).
export async function listarVendas(x, { status, busca, limite = 30, offset = 0, moeda = 'brl', de, ate, dias, produto, canal, campanha, conteudo }) {
  exigir(x.u, 'vendas.ver');
  const { lista, resumo } = await calcularVendas(x.env, { de, ate, dias, moeda, produto, canal, campanha, conteudo });
  const filtros = { moeda: `eq.${resumo.moeda}` };
  if (status) filtros.status = `eq.${status}`;
  let r;
  if (busca) {
    if (/^\d+$/.test(busca)) filtros.numero = `eq.${busca}`;
    else {
      const b = busca.replace(/[*,()]/g, '');
      const alunos = await db.select(x.env, 'alunos', { filtros: { or: `(email.ilike.*${b}*,nome.ilike.*${b}*)` }, select: 'id', limite: 50 });
      if (!alunos.length) return { ...resumo, itens: [], total: 0 };
      filtros.aluno_id = `in.(${alunos.map((a) => a.id).join(',')})`;
    }
    r = await db.select(x.env, 'pedidos', { filtros, select: PEDIDO_LISTA, ordem: 'criado_em.desc', limite, offset, contar: true });
  } else {
    const dela = status ? lista.filter((p) => p.status === status) : lista;
    const ids = dela.slice(offset, offset + limite).map((p) => p.id);
    r = { total: dela.length, linhas: ids.length ? await db.select(x.env, 'pedidos', { filtros: { id: `in.(${ids.join(',')})` }, select: PEDIDO_LISTA, ordem: 'criado_em.desc', limite }) : [] };
  }
  return { ...resumo, itens: r.linhas.map(pedidoComCanal), total: r.total };
}

export async function lerVenda(x, pedidoId) {
  exigir(x.u, 'vendas.ver');
  const p = await db.um(x.env, 'pedidos', { id: `eq.${id(pedidoId)}` }, `*,aluno:alunos!pedidos_aluno_id_fkey(id,nome,email,celular),oferta:ofertas(nome,slug)`);
  if (!p) throw new Erro(404, 'Pedido não encontrado.');
  const [eventos, emails, nota, reembolsos] = await Promise.all([
    db.select(x.env, 'eventos_pagamento', { filtros: { pedido_id: `eq.${p.id}` }, select: 'id,tipo,recebido_em,processado_em,erro', ordem: 'recebido_em.asc' }),
    db.select(x.env, 'emails', { filtros: { ref: `eq.pedido:${p.id}` }, select: 'id,assunto,status,criado_em', ordem: 'criado_em.desc' }),
    db.um(x.env, 'notas_fiscais', { pedido_id: `eq.${p.id}` }, 'status,numero,pdf_url,erro'),
    db.select(x.env, 'reembolsos', { filtros: { pedido_id: `eq.${p.id}` }, select: 'id,status,dias,devolver_em,motivo,tirou_acesso,pelo_aluno,nota,erro,feito_em,criado_em,quem:equipe!reembolsos_pedido_por_fkey(nome)', ordem: 'criado_em.desc' }),
  ]);
  const { pix_qr, ...resto } = p;
  return { ...pedidoComCanal(resto), toques: (resto.toques || []).map(comCanal), eventos, emails, nota_fiscal: nota, reembolsos };
}

// corpo: { dias: 0 a 30 (0 = agora), motivo, tirar_acesso }. Sem dias, devolve agora (como era antes da fila).
export async function reembolsarVenda(x, pedidoId, corpo = {}) {
  return reembolsar(x, id(pedidoId), { dias: corpo.dias, motivo: corpo.motivo, tirarAcesso: corpo.tirar_acesso });
}

export async function listarReembolsos(x) {
  return filaDeReembolso(x);
}

export async function cancelarReembolsoVenda(x, reembolsoId) {
  return cancelarReembolso(x, id(reembolsoId));
}

export async function devolverReembolso(x, reembolsoId) {
  return devolverReembolsoAgora(x, id(reembolsoId));
}

export async function reenviarAcesso(x, pedidoId) {
  exigir(x.u, 'alunos.editar');
  const r = await entregarAcesso(x.env, id(pedidoId), { reenviar: true });
  await auditar(x.env, x.u, 'aluno.reenviar_acesso', `pedido:${pedidoId}`);
  return r;
}

// ---------------------------------------------------------------- alunos
export async function listarAlunos(x, { busca, limite = 30, offset = 0 }) {
  exigir(x.u, 'alunos.ver');
  const filtros = {};
  const b = String(busca || '').replace(/[*,()]/g, '').trim();
  if (b) filtros.or = `(email.ilike.*${b}*,nome.ilike.*${b}*)`;
  const r = await db.select(x.env, 'alunos', { filtros, select: 'id,nome,email,instagram,ultimo_acesso,criado_em,matriculas(status,curso:cursos(titulo))', ordem: 'criado_em.desc', limite, offset, contar: true });
  return { itens: r.linhas, total: r.total };
}

export async function lerAluno(x, alunoId) {
  exigir(x.u, 'alunos.ver');
  const a = await db.um(x.env, 'alunos', { id: `eq.${id(alunoId)}` }, 'id,nome,email,celular,instagram,bio,area,auth_id,ultimo_acesso,criado_em');
  if (!a) throw new Erro(404, 'Aluno não encontrado.');
  const [matriculas, pedidos, progresso, emails] = await Promise.all([
    db.select(x.env, 'matriculas', { filtros: { aluno_id: `eq.${a.id}` }, select: 'id,curso_id,status,origem,inicio,fim,motivo,curso:cursos(titulo,slug)', ordem: 'criado_em.desc' }),
    x.u && ['administrador', 'editor'].includes(x.u.papel)
      ? db.select(x.env, 'pedidos', { filtros: { aluno_id: `eq.${a.id}` }, select: 'id,numero,status,metodo,total_centavos,moeda,criado_em,pago_em,teste', ordem: 'criado_em.desc' })
      : [],
    db.select(x.env, 'progresso', { filtros: { aluno_id: `eq.${a.id}` }, select: 'concluida_em,atualizado_em,aula:aulas(codigo,titulo,curso_id)', ordem: 'atualizado_em.desc', limite: 200 }),
    db.select(x.env, 'emails', { filtros: { para: `eq.${a.email}` }, select: 'id,assunto,tipo,status,criado_em', ordem: 'criado_em.desc', limite: 10 }),
  ]);
  const { auth_id, ...resto } = a;
  return { ...resto, tem_login: !!auth_id, matriculas, pedidos, concluidas: progresso.filter((p) => p.concluida_em).length, ultimas: progresso.slice(0, 8), emails };
}

// Link de entrada (24 horas, uma vez) para mandar à pessoa (WhatsApp), igual aos convites da equipe.
export async function linkDoAluno(x, alunoId) {
  exigir(x.u, 'alunos.editar');
  const a = await db.um(x.env, 'alunos', { id: `eq.${id(alunoId)}` }, 'id,email,nome,auth_id');
  if (!a) throw new Erro(404, 'Aluno não encontrado.');
  const { link } = await linkDeEntrada(x.env, a);
  await auditar(x.env, x.u, 'aluno.link', `aluno:${a.id}`);
  return { link };
}

// Libera um curso na mão (bônus, presente, cortesia). Manda o e-mail de acesso e devolve o link.
export async function liberarCurso(x, { email, nome, curso_id, dias, origem = 'bonus' }) {
  exigir(x.u, 'alunos.editar');
  email = normalEmail(email);
  if (!emailValido(email)) throw new Erro(400, 'Confira o e-mail.');
  if (!['bonus', 'presente', 'equipe'].includes(origem)) throw new Erro(400, 'Origem inválida.');
  const curso = await db.um(x.env, 'cursos', { id: `eq.${id(curso_id)}` }, 'id,titulo');
  if (!curso) throw new Erro(404, 'Curso não encontrado.');
  const aluno = await garantirAluno(x.env, { email, nome: String(nome || '').trim().slice(0, 120) || undefined });
  const fim = dias ? new Date(Date.now() + Number(dias) * 86400_000).toISOString() : null;
  await db.insert(x.env, 'matriculas', { aluno_id: aluno.id, curso_id: curso.id, origem, inicio: new Date().toISOString(), fim, status: 'ativa', motivo: null }, { upsert: true, conflito: 'aluno_id,curso_id', select: 'id' });
  // Como na compra (vendas.js, entregarAcesso): curso com marca em vídeo (o em inglês) abre no endereço da marca, e o
  // em inglês manda o e-mail em inglês.
  const marca = (await cursosComMarca(x.env)).get(curso.id) || null;
  const { link } = await linkDeEntrada(x.env, aluno, marca && marca.tema !== 'leitura' ? marca.url : null);
  if (marca && marca.idioma === 'en') {
    const m = emailBoasVindasEn({ nome: aluno.nome, curso: curso.titulo, link, entrar: `${marca.url}/entrar`, marca });
    await enviarEmail(x.env, { para: email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: 'acesso', ref: `aluno:${aluno.id}`, de: `${marca.nome} <cursos@envio.agenciasetup.com.br>` });
  } else {
    const m = emailBoasVindas({ nome: aluno.nome, curso: curso.titulo, link, entrar: `${cursoUrl(x.env)}/entrar` });
    await enviarEmail(x.env, { para: email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: 'acesso', ref: `aluno:${aluno.id}` });
  }
  await avisarSistemas(x.env, 'aluno.liberado', { aluno: pessoa({ ...aluno, email }), cursos: [curso.titulo], origem, fim });
  await auditar(x.env, x.u, 'aluno.liberar', `aluno:${aluno.id}`, { curso: curso.titulo, origem, dias: dias || null });
  return { aluno_id: aluno.id, link };
}

export async function revogarMatricula(x, matriculaId, motivo) {
  exigir(x.u, 'alunos.editar');
  const [m] = await db.update(x.env, 'matriculas', { id: `eq.${id(matriculaId)}` }, { status: 'revogada', motivo: String(motivo || 'retirada pela equipe').slice(0, 200) }, 'id,aluno_id,curso_id');
  if (!m) throw new Erro(404, 'Matrícula não encontrada.');
  await auditar(x.env, x.u, 'aluno.revogar', `aluno:${m.aluno_id}`, { curso_id: m.curso_id, motivo });
  return { ok: true };
}

// ---------------------------------------------------------------- aulas e ofertas
export async function listarCursosArea(x) {
  exigir(x.u, 'cursos.ver');
  const cursos = await db.select(x.env, 'cursos', { select: 'id,slug,titulo,status,certificado_pct,modulos(id,numero,titulo,ordem,aulas(id,codigo,titulo,ordem,status,video_panda,video_bunny,duracao_s,gratis,abertura_fim_s,final_inicio_s))', ordem: 'ordem.asc' });
  for (const c of cursos) {
    c.modulos.sort((a, b) => a.ordem - b.ordem);
    for (const m of c.modulos) m.aulas.sort((a, b) => a.ordem - b.ordem);
  }
  return cursos;
}

const CAMPOS_AULA = ['titulo', 'descricao', 'video_panda', 'video_bunny', 'status', 'gratis', 'abertura_fim_s', 'final_inicio_s', 'resumo'];
export async function editarAula(x, aulaId, d) {
  exigir(x.u, 'cursos.editar');
  const dados = {};
  for (const k of CAMPOS_AULA) if (d[k] !== undefined) dados[k] = d[k];
  if (dados.status && !['rascunho', 'publicado', 'arquivado'].includes(dados.status)) throw new Erro(400, 'Status inválido.');
  for (const k of ['video_panda', 'video_bunny']) if (dados[k] !== undefined) dados[k] = String(dados[k] || '').trim() || null;
  for (const k of ['abertura_fim_s', 'final_inicio_s']) if (dados[k] !== undefined) dados[k] = dados[k] === null || dados[k] === '' ? null : Math.max(0, Math.round(Number(dados[k]) || 0));
  const [a] = await db.update(x.env, 'aulas', { id: `eq.${id(aulaId)}` }, dados, 'id,codigo,titulo,status,video_panda,video_bunny,gratis,abertura_fim_s,final_inicio_s');
  if (!a) throw new Erro(404, 'Aula não encontrada.');
  await auditar(x.env, x.u, 'aula.editar', `aula:${a.id}`, { campos: Object.keys(dados) });
  return a;
}

export async function listarOfertas(x) {
  exigir(x.u, 'cursos.ver');
  return db.select(x.env, 'ofertas', { select: '*,produto:produtos(nome,slug)', ordem: 'criado_em.asc' });
}

export async function editarOferta(x, ofertaId, d) {
  exigir(x.u, 'ofertas.editar');
  const dados = {};
  if (d.nome !== undefined) dados.nome = String(d.nome).trim().slice(0, 120);
  if (d.preco_centavos !== undefined) { const v = Math.round(Number(d.preco_centavos)); if (!(v >= 100)) throw new Erro(400, 'O preço mínimo é R$ 1,00.'); dados.preco_centavos = v; }
  if (d.preco_de_centavos !== undefined) dados.preco_de_centavos = d.preco_de_centavos ? Math.round(Number(d.preco_de_centavos)) : null;
  if (d.parcelas_max !== undefined) dados.parcelas_max = Math.max(1, Math.min(21, Math.round(Number(d.parcelas_max) || 1)));
  if (d.juros_mes !== undefined) dados.juros_mes = Math.max(0, Math.min(0.15, Number(d.juros_mes) || 0));
  if (d.pix_desconto_pct !== undefined) dados.pix_desconto_pct = Math.max(0, Math.min(50, Number(d.pix_desconto_pct) || 0));
  if (d.pix_minutos !== undefined) dados.pix_minutos = Math.max(5, Math.min(1440, Math.round(Number(d.pix_minutos) || 30)));
  if (d.garantia_dias !== undefined) dados.garantia_dias = Math.max(7, Math.round(Number(d.garantia_dias) || 7));
  if (d.metodos !== undefined) { const m = (d.metodos || []).filter((v) => ['pix', 'cartao'].includes(v)); if (!m.length) throw new Erro(400, 'Deixe pelo menos uma forma de pagamento.'); dados.metodos = m; }
  if (d.ativa !== undefined) dados.ativa = !!d.ativa;
  if (d.valida_ate !== undefined) dados.valida_ate = d.valida_ate || null;
  if (d.checkout !== undefined && typeof d.checkout === 'object') dados.checkout = d.checkout;
  const [o] = await db.update(x.env, 'ofertas', { id: `eq.${id(ofertaId)}` }, dados, '*');
  if (!o) throw new Erro(404, 'Oferta não encontrada.');
  await auditar(x.env, x.u, 'oferta_curso.editar', `oferta:${o.id}`, { campos: Object.keys(dados), ativa: o.ativa, preco: o.preco_centavos });
  return o;
}

// ---------------------------------------------------------------- links rastreáveis e e-mails
export async function listarLinks(x) {
  exigir(x.u, 'cursos.ver');
  return db.select(x.env, 'links', { select: '*', ordem: 'criado_em.desc', limite: 200 });
}

export async function criarLink(x, d) {
  exigir(x.u, 'cursos.editar');
  const codigo = String(d.codigo || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  if (codigo.length < 2) throw new Erro(400, 'Escolha um código curto (letras, números e hífen).');
  const destino = String(d.destino || '').trim();
  if (!destino.startsWith('/') || destino.startsWith('//')) throw new Erro(400, 'O destino é um endereço do site, começando com / (ex.: /checkout/posts-automaticos).');
  const limpa = (v) => (v ? String(v).trim().slice(0, 100) : null);
  const [l] = await db.insert(x.env, 'links', { codigo, destino, utm_source: limpa(d.utm_source), utm_medium: limpa(d.utm_medium), utm_campaign: limpa(d.utm_campaign), utm_content: limpa(d.utm_content), utm_term: limpa(d.utm_term) }, { select: '*' });
  await auditar(x.env, x.u, 'link.criar', `link:${codigo}`, { destino });
  return l;
}

export async function listarEmails(x) {
  exigir(x.u, 'alunos.ver');
  return db.select(x.env, 'emails', { select: 'id,para,assunto,tipo,status,erro,criado_em,html', ordem: 'criado_em.desc', limite: 40 });
}

// ---------------------------------------------------------------- pagamento (Asaas): chave e aviso, cifrados no banco
// A chave é colada pelo administrador no painel e nunca volta para a tela nem para o Claude (trava 8 do CLAUDE.md).
async function lerConfigAsaas(env) {
  const c = await db.um(env, 'config', { chave: 'eq.asaas' });
  return (c && c.valor) || {};
}
async function gravarConfigAsaas(env, valor) {
  await db.insert(env, 'config', { chave: 'asaas', valor }, { upsert: true, conflito: 'chave', select: 'chave' });
  esquecerAsaas();
}

export async function situacaoPagamento(x) {
  exigir(x.u, 'pagamentos.configurar');
  const v = await lerConfigAsaas(x.env);
  const ds = x.env.__doSegredo || {};
  const segredo = { chave: !!ds.ASAAS_CHAVE, aviso: !!ds.ASAAS_AVISO_TOKEN };
  return {
    configurada: !!(v.chave || segredo.chave), origem: segredo.chave ? 'segredo do Worker' : v.chave ? 'painel' : null,
    producao: v.producao ?? null, conta: v.conta || null, salva_em: v.salva_em || null,
    aviso: v.aviso_id || segredo.aviso ? { url: v.aviso_url || null, eventos: v.aviso_eventos || null, em: v.aviso_em || null } : null,
    aviso_url: `${x.env.SITE_URL || 'https://agenciasetup.com.br'}/api/asaas/aviso`,
    estrangeiros: v.estrangeiros === true, estrangeiros_em: v.estrangeiros_em || null,
    estrangeiros_local: x.env.AMBIENTE === 'local' && x.env.ESTRANGEIROS === '1',
  };
}

// Compra de quem mora fora do Brasil (sem CPF, cartão internacional à vista). Só ligar depois que o Asaas liberar
// "Pagadores estrangeiros" na conta (pedido em análise, protocolo 1921730). Desligada, o checkout é o de sempre.
export async function ligarEstrangeiros(x, ligado) {
  exigir(x.u, 'pagamentos.configurar');
  if (typeof ligado !== 'boolean') throw new Erro(400, 'Diga se liga ou desliga.');
  const v = await lerConfigAsaas(x.env);
  await gravarConfigAsaas(x.env, { ...v, estrangeiros: ligado, estrangeiros_em: new Date().toISOString() });
  await auditar(x.env, x.u, ligado ? 'pagamento.estrangeiros.ligar' : 'pagamento.estrangeiros.desligar', 'config:asaas', { estrangeiros: ligado });
  await prepararAsaas(x.env);
  return situacaoPagamento(x);
}

export async function salvarChaveAsaas(x, chave) {
  exigir(x.u, 'pagamentos.configurar');
  chave = String(chave || '').trim();
  if (!/^\$aact_(prod|hmlg)_[A-Za-z0-9_:=+/.-]{20,}$/.test(chave)) throw new Erro(400, 'Isso não parece uma chave do Asaas. Ela começa com $aact_prod_ (produção) ou $aact_hmlg_ (sandbox).');
  let t;
  try { t = await asaas.testarChave(chave); } catch (e) { throw new Erro(400, `O Asaas não aceitou a chave: ${e.message}`); }
  const v = await lerConfigAsaas(x.env);
  // Chave nova: o aviso antigo continua cadastrado no Asaas, mas o token dele fica guardado junto.
  await gravarConfigAsaas(x.env, { ...v, chave: await cifrar(x.env, { valor: chave }), producao: t.producao, conta: { nome: t.nome, situacao: t.status && t.status.general }, salva_em: new Date().toISOString() });
  await auditar(x.env, x.u, 'pagamento.chave', 'config:asaas', { producao: t.producao, conta: t.nome });
  await prepararAsaas(x.env);
  return situacaoPagamento(x);
}

export async function ligarAvisoAsaas(x) {
  exigir(x.u, 'pagamentos.configurar');
  await prepararAsaas(x.env);
  if (!x.env.ASAAS_CHAVE) throw new Erro(409, 'Cole a chave do Asaas antes de ligar o aviso.');
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  const url = `${x.env.SITE_URL || 'https://agenciasetup.com.br'}/api/asaas/aviso`;
  const conta = await asaas.testarChave(x.env.ASAAS_CHAVE);
  const v = await lerConfigAsaas(x.env);
  // Grava o token antes de avisar o Asaas: o primeiro aviso pode chegar logo depois.
  await gravarConfigAsaas(x.env, { ...v, aviso: await cifrar(x.env, { valor: token }) });
  const w = await asaas.configurarAviso(x.env, { url, token, email: conta.email || x.u.email });
  await gravarConfigAsaas(x.env, { ...(await lerConfigAsaas(x.env)), aviso_id: w.id, aviso_url: w.url, aviso_eventos: w.eventos, aviso_em: new Date().toISOString() });
  await auditar(x.env, x.u, 'pagamento.aviso', 'config:asaas', { url: w.url, eventos: w.eventos, novo: w.novo });
  await prepararAsaas(x.env);
  return situacaoPagamento(x);
}

// ---------------------------------------------------------------- ofertas novas, combos, bumps e cupons
// Oferta nova: produto (o que libera) + preço. Combo = produto que libera vários cursos (produto_acessos).
export async function criarOferta(x, d) {
  exigir(x.u, 'ofertas.editar');
  const slug = String(d.slug || d.nome || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  if (slug.length < 3) throw new Erro(400, 'Dê um nome à oferta.');
  const preco = Math.round(Number(d.preco_centavos));
  if (!(preco >= 100)) throw new Erro(400, 'O preço mínimo é R$ 1,00.');
  let produtoId = d.produto_id;
  if (!produtoId) {
    const nome = String(d.produto_nome || d.nome || '').trim().slice(0, 120);
    if (!nome) throw new Erro(400, 'Escolha o produto ou dê um nome a um produto novo.');
    const [p] = await db.insert(x.env, 'produtos', { slug, nome, preco_centavos: preco, ativo: true }, { select: 'id' });
    produtoId = p.id;
  }
  const [o] = await db.insert(x.env, 'ofertas', {
    slug, produto_id: id(produtoId), nome: String(d.nome || '').trim().slice(0, 120) || slug, preco_centavos: preco,
    parcelas_max: 12, juros_mes: 0.0319, pix_desconto_pct: 5, pix_minutos: 30, metodos: ['pix', 'cartao'], garantia_dias: 7, ativa: false, checkout: {},
  }, { select: '*' });
  await auditar(x.env, x.u, 'oferta_curso.criar', `oferta:${o.id}`, { slug, preco });
  return o;
}

export async function acessosDoProduto(x, produtoId) {
  exigir(x.u, 'cursos.ver');
  return db.select(x.env, 'produto_acessos', { filtros: { produto_id: `eq.${id(produtoId)}` }, select: 'curso_id,dias,curso:cursos(titulo)' });
}

// Os cursos que o produto libera (e por quantos dias). Troca a lista inteira.
export async function salvarAcessos(x, produtoId, lista) {
  exigir(x.u, 'ofertas.editar');
  id(produtoId);
  const itens = (Array.isArray(lista) ? lista : []).filter((a) => UUID.test(String(a.curso_id))).map((a) => ({ produto_id: produtoId, curso_id: a.curso_id, dias: a.dias ? Math.max(1, Math.round(Number(a.dias))) : null }));
  if (!itens.length) throw new Erro(400, 'O produto precisa liberar pelo menos um curso.');
  await db.apagar(x.env, 'produto_acessos', { produto_id: `eq.${produtoId}` });
  await db.insert(x.env, 'produto_acessos', itens, { select: 'curso_id' });
  await auditar(x.env, x.u, 'produto.acessos', `produto:${produtoId}`, { cursos: itens.length });
  return acessosDoProduto(x, produtoId);
}

export async function bumpsDaOferta(x, ofertaId) {
  exigir(x.u, 'cursos.ver');
  return db.select(x.env, 'ofertas_bumps', { filtros: { oferta_id: `eq.${id(ofertaId)}` }, select: 'bump_id,titulo,texto,ordem,bump:ofertas!ofertas_bumps_bump_id_fkey(nome,preco_centavos)', ordem: 'ordem.asc' });
}

export async function salvarBumps(x, ofertaId, lista) {
  exigir(x.u, 'ofertas.editar');
  id(ofertaId);
  const itens = (Array.isArray(lista) ? lista : []).slice(0, 2).filter((b) => UUID.test(String(b.bump_id)) && b.bump_id !== ofertaId)
    .map((b, i) => ({ oferta_id: ofertaId, bump_id: b.bump_id, titulo: String(b.titulo || '').trim().slice(0, 120) || 'Leve junto', texto: String(b.texto || '').trim().slice(0, 300) || null, ordem: i }));
  await db.apagar(x.env, 'ofertas_bumps', { oferta_id: `eq.${ofertaId}` });
  if (itens.length) await db.insert(x.env, 'ofertas_bumps', itens, { select: 'bump_id' });
  await auditar(x.env, x.u, 'oferta_curso.bumps', `oferta:${ofertaId}`, { bumps: itens.length });
  return bumpsDaOferta(x, ofertaId);
}

export async function listarCupons(x) {
  exigir(x.u, 'cursos.ver');
  return db.select(x.env, 'cupons', { select: '*', ordem: 'criado_em.desc', limite: 200 });
}

export async function salvarCupom(x, d, codigoAtual) {
  exigir(x.u, 'ofertas.editar');
  const dados = {};
  if (!codigoAtual) {
    dados.codigo = String(d.codigo || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(dados.codigo)) throw new Erro(400, 'O código tem de 3 a 30 letras, números, - ou _.');
  }
  if (d.tipo !== undefined) { if (!['pct', 'valor'].includes(d.tipo)) throw new Erro(400, 'Tipo inválido.'); dados.tipo = d.tipo; }
  if (d.valor !== undefined) { const v = Number(d.valor); if (!(v > 0)) throw new Erro(400, 'Valor inválido.'); if ((d.tipo || 'pct') === 'pct' && v > 90) throw new Erro(400, 'Desconto de no máximo 90%.'); dados.valor = v; }
  if (d.ofertas !== undefined) dados.ofertas = (d.ofertas || []).filter((o) => UUID.test(String(o)));
  if (d.limite !== undefined) dados.limite = d.limite ? Math.max(1, Math.round(Number(d.limite))) : null;
  if (d.valido_ate !== undefined) dados.valido_ate = d.valido_ate || null;
  if (d.primeira_compra !== undefined) dados.primeira_compra = !!d.primeira_compra;
  if (d.ativo !== undefined) dados.ativo = !!d.ativo;
  if (d.descricao !== undefined) dados.descricao = String(d.descricao || '').slice(0, 200) || null;
  const [c] = codigoAtual
    ? await db.update(x.env, 'cupons', { codigo: `eq.${String(codigoAtual).toUpperCase()}` }, dados, '*')
    : await db.insert(x.env, 'cupons', { tipo: 'pct', ...dados }, { select: '*' });
  if (!c) throw new Erro(404, 'Cupom não encontrado.');
  await auditar(x.env, x.u, codigoAtual ? 'cupom.editar' : 'cupom.criar', `cupom:${c.codigo}`, { tipo: c.tipo, valor: c.valor });
  return c;
}
