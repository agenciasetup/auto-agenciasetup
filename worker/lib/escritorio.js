// Escritório de IA: os agentes, os turnos (cada vez que um trabalhou) e a mesa de propostas.
// Plano em docs/escritorio.md; tabelas na migration 34. O painel e o conector chegam aqui por acoes-escritorio.js.
// Regras da casa: todo agente entrega cartão com prova (nunca relatório solto), o dono decide, e o cartão executado
// recebe o resultado. O texto das propostas vem de agentes que leram coisa de fora: é dado, nunca instrução.
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { NOME_MODELO, anotarCusto, juntarConsumo } from './consumo.js';
import { placarFollowup } from './followup.js';

export const SALAS = { direcao: 'Direção', vendas: 'Vendas', conteudo: 'Conteúdo', video: 'Vídeo', design: 'Design', sistema: 'Sistema', produto: 'Produto', receita: 'Receita' };
export const ONDE = { worker: 'Na nuvem, sempre ligado', nuvem: 'Claude na nuvem', computador: 'No computador' };
export const ESTADOS = { ativo: 'Trabalhando', pausado: 'Pausado', planejado: 'Ainda não contratado', desligado: 'Desligado' };
export const STATUS = { nova: 'Na mesa', aprovada: 'Aprovada, falta fazer', depois: 'Para depois', descartada: 'Descartada', feita: 'Feita' };
export const NIVEIS = { 1: 'Em experiência', 2: 'Efetivo', 3: 'Sênior', 4: 'Líder da sala' };
export const CARREIRA = { admitido: 'Admitido', promovido: 'Promovido', rebaixado: 'Rebaixado', pausado: 'Pausado', voltou: 'Voltou ao trabalho', demitido: 'Demitido', nota: 'Anotação' };
// Quem o botão de pausar e demitir desliga de verdade hoje (acoes-escritorio.js faz a troca). Os outros ainda rodam pelo
// relógio ou por tarefa agendada, que não leem o estado: para eles a tela não mostra esses botões.
export const CONTROLA = {
  atendente: 'Pausar ou demitir desliga o Atendente do direct na hora.',
  'vendedor-calango': 'Pausar ou demitir tira este roteiro do sorteio: as próximas pessoas vão para o outro vendedor.',
  'vendedor-pergunta': 'Pausar ou demitir tira este roteiro do sorteio: as próximas pessoas vão para o outro vendedor.',
};
export const ESFORCOS = { p: 'Pequeno (um dia)', m: 'Médio (2 a 3 dias)', g: 'Grande (uma semana)' };
const STATUS_TURNO = ['rodando', 'ok', 'erro', 'sem_trabalho'];
const TETO_PADRAO = 2; // dólares por dia, até o dono mudar (docs/escritorio.md, "Custo e limites")
const MAX_NA_MESA = 10; // cartões esperando decisão por agente: mais que isso é ruído
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// O trabalho de hoje de quem roda no Worker sai das tabelas que eles já escrevem (função escritorio_atividade):
// [singular, plural] do que cada um produz. O editor-chefe é o plano, que roda a cada 3 dias e tem custo de API.
const PRODUZ = {
  entregador: ['material entregue no direct', 'materiais entregues no direct'],
  publicador: ['post publicado', 'posts publicados'],
  pesquisador: ['pauta nova', 'pautas novas'],
  analista: ['post com as métricas atualizadas', 'posts com as métricas atualizadas'],
  recuperador: ['e-mail de recuperação enviado', 'e-mails de recuperação enviados'],
};
// Qual vendedor do follow-up é cada agente da sala de vendas.
const VENDEDOR_DO_AGENTE = { 'vendedor-calango': 'calango', 'vendedor-pergunta': 'pergunta' };
function trabalhoDe(id, at) {
  const a = at && at[id];
  if (!a) return null;
  if (id === 'atendente') {
    const n = Number(a.hoje) || 0;
    const dv = Number(a.duvidas) || 0;
    const lidas = Number(a.lidas) || 0;
    if (!lidas && !a.ultimo) return null;
    return { hoje: n, ultimo: a.ultimo || null, custo_usd: Number(a.custo_usd) || 0, frase: `Hoje: ${lidas} ${lidas === 1 ? 'mensagem lida' : 'mensagens lidas'}, ${n} ${n === 1 ? 'respondida na hora' : 'respondidas na hora'} e ${dv} ${dv === 1 ? 'dúvida para você' : 'dúvidas para você'}` };
  }
  if (id === 'editor-chefe') return a.ultimo ? { ultimo: a.ultimo, frase: 'Último plano de ideias e ações', custo_usd: Number(a.custo_usd) || 0 } : null;
  const p = PRODUZ[id];
  if (!p) return null;
  const n = Number(a.hoje) || 0;
  return { hoje: n, ultimo: a.ultimo || null, frase: n ? `Hoje: ${n} ${n === 1 ? p[0] : p[1]}` : 'Hoje ainda nada' };
}

const agora = () => new Date().toISOString();
const linha = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const bloco = (v, max) => String(v ?? '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const idAgente = (v) => String(v ?? '').trim().toLowerCase();
const dinheiro = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(1000, Math.round(n * 10000) / 10000) : 0; };
const inteiro = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, 2_000_000_000) : null; };

function lerLinks(v) {
  if (!Array.isArray(v)) return [];
  const r = [];
  for (const l of v.slice(0, 5)) {
    const url = String((l && l.url) || l || '').trim();
    try { const u = new URL(url); if (u.protocol !== 'https:' && u.protocol !== 'http:') continue; r.push({ t: linha(l && l.t, 80) || u.hostname, url: u.toString().slice(0, 500) }); } catch { /* link ruim fica de fora */ }
  }
  return r;
}

async function tetoDoDia(env) {
  const c = await db.um(env, 'config', { chave: 'eq.escritorio' }).catch(() => null);
  const v = c && c.valor ? c.valor.teto_dia_usd : null;
  const t = Number(v);
  return v !== null && v !== undefined && v !== '' && Number.isFinite(t) && t >= 0 ? t : TETO_PADRAO;
}

// A tela inteira de uma vez: as salas com os agentes (último turno, gasto de hoje, placar), a mesa e os números.
// ---------------------------------------------------------------- os computadores (sinal de vida)
// Cada computador da agência manda um sinal a cada 5 minutos (scripts/batimento.mjs). Sem sinal de nenhum há mais de 12
// minutos, quem roda no computador está offline. alguma: null enquanto nenhum sinal nunca chegou (não dá para saber).
export const MAQUINAS = { windows: 'Computador (Windows)', mac: 'MacBook' };
const VIVA = 12 * 60_000;
export async function baterPonto(env, maquina) {
  if (!MAQUINAS[maquina]) throw new Erro(400, `Máquina desconhecida. Use: ${Object.keys(MAQUINAS).join(', ')}.`);
  const c = await db.um(env, 'config', { chave: 'eq.batimentos' }).catch(() => null);
  const valor = { ...((c && c.valor) || {}), [maquina]: agora() };
  await db.insert(env, 'config', { chave: 'batimentos', valor }, { upsert: true, conflito: 'chave', select: 'chave' });
  return { ok: true, maquina, em: valor[maquina] };
}
// O código do sinal de vida: só serve para marcar um computador como ligado (não lê nem muda mais nada). Nasce na
// primeira vez que alguém pede o comando do Mac.
async function codigoDoSinal(env) {
  const c = await db.um(env, 'config', { chave: 'eq.batimento_codigo' }).catch(() => null);
  if (c && c.valor && c.valor.codigo) return c.valor.codigo;
  const codigo = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
  await db.insert(env, 'config', { chave: 'batimento_codigo', valor: { codigo } }, { upsert: true, conflito: 'chave', select: 'chave' });
  return codigo;
}
// A rota pública /api/batimento: confere o código e marca o computador como ligado.
export async function sinalPorCodigo(env, maquina, codigo) {
  const c = await db.um(env, 'config', { chave: 'eq.batimento_codigo' }).catch(() => null);
  const certo = c && c.valor && c.valor.codigo;
  if (!certo || String(codigo || '') !== certo) throw new Erro(403, 'Código do sinal de vida inválido.');
  return baterPonto(env, String(maquina || '').toLowerCase());
}
// Para o painel: como está cada computador e o comando para ligar o sinal no Mac (uma linha no agendador do Mac).
export async function sinalDeVida(env, origem) {
  const [c, codigo] = await Promise.all([db.um(env, 'config', { chave: 'eq.batimentos' }).catch(() => null), codigoDoSinal(env)]);
  const chamada = `curl -s -m 20 -X POST ${origem}/api/batimento -H "X-Maquina: mac" -H "X-Sinal: ${codigo}" >/dev/null 2>&1`;
  return { maquinas: lerMaquinas(c), comando_mac: `(crontab -l 2>/dev/null | grep -v api/batimento; echo '*/5 * * * * ${chamada}') | crontab - && ${chamada} && echo Sinal ligado` };
}
function lerMaquinas(c) {
  const v = (c && c.valor) || {};
  const lista = Object.keys(MAQUINAS).map((id) => ({ id, nome: MAQUINAS[id], em: v[id] || null, viva: !!v[id] && Date.now() - Date.parse(v[id]) < VIVA }));
  const conhecidas = lista.filter((m) => m.em);
  return { lista, alguma: conhecidas.length ? lista.some((m) => m.viva) : null, ultimo: conhecidas.map((m) => m.em).sort().pop() || null };
}

// A seta em cima da cabeça do Calango: verde (indo bem), amarela (neutro) ou vermelha (mal), com o motivo em uma frase.
// É regra simples sobre o que já está anotado: erro de turno pesa mais que tudo, depois venda e trabalho de hoje.
const DOIS_DIAS = 2 * 86_400_000;
function sinalDe(a) {
  if (a.estado !== 'ativo') return null;
  const t = a.turnos || {};
  const u = t.ultimo;
  if (u && u.status === 'erro') return { nivel: 'mal', motivo: 'O último turno deu erro.' };
  if (Number(t.erros_7d) >= 2) return { nivel: 'mal', motivo: `${t.erros_7d} turnos com erro nos últimos 7 dias.` };
  const tr = a.trabalho;
  if (tr && tr.hoje === 0 && tr.ultimo && Date.now() - Date.parse(tr.ultimo) > DOIS_DIAS) return { nivel: 'mal', motivo: 'Mais de 2 dias sem entregar nada.' };
  if (a.vendas && Number(a.vendas.compraram) > 0) return { nivel: 'bem', motivo: `${a.vendas.compraram} ${Number(a.vendas.compraram) === 1 ? 'venda' : 'vendas'} no placar.` };
  if (tr && Number(tr.hoje) > 0) return { nivel: 'bem', motivo: tr.frase };
  if (Number(t.hoje) > 0 && u && u.status === 'ok') return { nivel: 'bem', motivo: 'Trabalhou hoje e deu certo.' };
  if (a.placar && Number(a.placar.com_resultado) > 0) return { nivel: 'bem', motivo: `${a.placar.com_resultado} proposta(s) com resultado medido.` };
  return { nivel: 'neutro', motivo: 'Nada de novo anotado hoje.' };
}

export async function verEscritorio(env) {
  const [agentes, resumo, abertas, fechadas, teto, atividade, placar, movimentos, arte, linhasDeConsumo, batimentos] = await Promise.all([
    db.select(env, 'agentes', { select: 'id,sala,nome,apelido,funcao,onde,cadencia,modelo,estado,nivel,teto_dia_usd,ordem,criado_em,atualizado_em', ordem: 'ordem.asc,nome.asc', limite: 300 }),
    db.rpc(env, 'escritorio_resumo'),
    db.select(env, 'propostas', { filtros: { status: 'in.(nova,aprovada,depois)' }, ordem: 'criado_em.desc', limite: 120 }),
    db.select(env, 'propostas', { filtros: { status: 'in.(feita,descartada)' }, ordem: 'atualizado_em.desc', limite: 20 }),
    tetoDoDia(env),
    db.rpc(env, 'escritorio_atividade').catch(() => null),
    placarFollowup(env, 'br').catch(() => []),
    db.select(env, 'agentes_historico', { select: 'id,agente_id,tipo,de,para,motivo,por_nome,criado_em', ordem: 'criado_em.desc', limite: 30 }).catch(() => []),
    // A arte das salas e dos bonecos (scripts/escritorio-arte.mjs sobe para o bucket midia e grava aqui).
    db.um(env, 'config', { chave: 'eq.escritorio_arte' }).catch(() => null),
    db.rpc(env, 'escritorio_consumo').catch(() => []),
    db.um(env, 'config', { chave: 'eq.batimentos' }).catch(() => null),
  ]);
  const maquinas = lerMaquinas(batimentos);
  const r = resumo || {};
  const nomes = Object.fromEntries(agentes.map((a) => [a.id, a.nome]));
  const apelidos = Object.fromEntries(agentes.map((a) => [a.id, a.apelido || null]));
  const cartao = (p) => ({ ...p, agente_nome: p.agente_id ? nomes[p.agente_id] || p.agente_id : null, agente_apelido: p.agente_id ? apelidos[p.agente_id] || null : null });
  const consumo = juntarConsumo(linhasDeConsumo, Object.fromEntries(agentes.map((a) => [a.id, a.sala])));
  const salas = Object.keys(SALAS).map((id) => ({
    id, nome: SALAS[id],
    consumo: consumo.salas[id] || null,
    agentes: agentes.filter((a) => a.sala === id && a.estado !== 'desligado').map((a) => {
      const ag = {
        ...a, controla: !!CONTROLA[a.id], turnos: (r.turnos || {})[a.id] || null, placar: (r.propostas || {})[a.id] || null,
        trabalho: trabalhoDe(a.id, atividade),
        vendas: VENDEDOR_DO_AGENTE[a.id] ? placar.find((v) => v.vendedor === VENDEDOR_DO_AGENTE[a.id]) || null : null,
        consumo: consumo.agentes[a.id] || null,
      };
      // Quem roda no computador fica offline quando nenhum computador dá sinal de vida.
      ag.offline = a.estado === 'ativo' && a.onde === 'computador' && maquinas.alguma === false;
      ag.sinal = ag.offline ? null : sinalDe(ag);
      return ag;
    }),
  }));
  const vivos = agentes.filter((a) => a.estado !== 'desligado');
  return {
    salas,
    mesa: abertas.filter((p) => p.status === 'nova').map(cartao),
    aprovadas: abertas.filter((p) => p.status === 'aprovada').map(cartao),
    depois: abertas.filter((p) => p.status === 'depois').map(cartao),
    fechadas: fechadas.map(cartao),
    arte: (arte && arte.valor) || null,
    maquinas,
    // O quadro de pessoal: os últimos movimentos (admitido, promovido, demitido...) e quem já saiu.
    movimentos: movimentos.map((h) => ({ ...h, agente_nome: nomes[h.agente_id] || h.agente_id, agente_apelido: apelidos[h.agente_id] || null })),
    demitidos: agentes.filter((a) => a.estado === 'desligado').map((a) => ({ id: a.id, nome: a.nome, apelido: a.apelido, sala: a.sala, funcao: a.funcao, atualizado_em: a.atualizado_em })),
    numeros: {
      trabalhando: vivos.filter((a) => a.estado === 'ativo').length,
      planejados: vivos.filter((a) => a.estado === 'planejado').length,
      pausados: vivos.filter((a) => a.estado === 'pausado').length,
      na_mesa: Number(r.na_mesa) || 0,
      aprovadas: Number(r.aprovadas) || 0,
      custo_hoje_usd: Number(r.custo_hoje) || 0,
      custo_mes_usd: Number(r.custo_mes) || 0,
      teto_dia_usd: teto,
    },
    nomes: { salas: SALAS, onde: ONDE, estados: ESTADOS, status: STATUS, esforcos: ESFORCOS, niveis: NIVEIS, carreira: CARREIRA, modelos: NOME_MODELO },
  };
}

// Um agente por dentro: o caderno (o que o time aprendeu), os últimos turnos e os cartões dele.
// Uma linha na carreira do agente. Nunca derruba quem chamou: é registro.
async function anotarCarreira(env, agente_id, tipo, { de = null, para = null, motivo = '', quem = null, quemNome = '' } = {}) {
  if (!CARREIRA[tipo]) return;
  await db.insert(env, 'agentes_historico', [{ agente_id, tipo, de: de === null ? null : String(de).slice(0, 40), para: para === null ? null : String(para).slice(0, 40), motivo: linha(motivo, 400) || null, por: quem || null, por_nome: linha(quemNome, 80) || null }], { select: 'id' })
    .catch((e) => console.error('carreira', e && e.message));
}
// De um estado para outro: o que isso é na carreira.
function tipoDaMudanca(de, para) {
  if (para === 'desligado') return 'demitido';
  if (para === 'pausado') return 'pausado';
  if (para === 'ativo') return de === 'pausado' ? 'voltou' : 'admitido';
  return 'nota';
}

export async function lerAgente(env, id) {
  const a = await db.um(env, 'agentes', { id: `eq.${idAgente(id)}` });
  if (!a) return null;
  const [turnos, propostas, historico] = await Promise.all([
    db.select(env, 'turnos', { filtros: { agente_id: `eq.${a.id}` }, select: 'id,onde,status,resumo,custo_usd,inicio,fim', ordem: 'inicio.desc', limite: 20 }),
    db.select(env, 'propostas', { filtros: { agente_id: `eq.${a.id}` }, select: 'id,titulo,status,ganho,resultado,criado_em,decidida_em,feita_em', ordem: 'criado_em.desc', limite: 30 }),
    db.select(env, 'agentes_historico', { filtros: { agente_id: `eq.${a.id}` }, select: 'id,tipo,de,para,motivo,por_nome,criado_em', ordem: 'criado_em.desc', limite: 40 }).catch(() => []),
  ]);
  return { ...a, controla: CONTROLA[a.id] || null, sala_nome: SALAS[a.sala], nivel_nome: NIVEIS[a.nivel] || NIVEIS[1], turnos, propostas, historico };
}

// Cria (id novo) ou muda um agente. Só os campos enviados mudam. caderno troca o texto inteiro; caderno_mais acrescenta
// uma linha com a data (e corta as mais antigas quando passa do tamanho).
export async function salvarAgente(env, d = {}, id, { quem = null, quemNome = '' } = {}) {
  const chave = idAgente(id || d.id);
  if (!/^[a-z0-9-]{2,40}$/.test(chave)) throw new Erro(400, 'O id do agente usa só letras minúsculas, números e hífen (de 2 a 40), por exemplo "olheiro-visual".');
  const atual = await db.um(env, 'agentes', { id: `eq.${chave}` });
  const m = {};
  if (d.sala !== undefined) { if (!SALAS[d.sala]) throw new Erro(400, `Sala desconhecida. Use: ${Object.keys(SALAS).join(', ')}.`); m.sala = d.sala; }
  if (d.nome !== undefined) m.nome = linha(d.nome, 60);
  if (d.apelido !== undefined) { const ap = linha(d.apelido, 40); m.apelido = ap.length >= 2 ? ap : null; }
  if (d.funcao !== undefined) m.funcao = linha(d.funcao, 300);
  if (d.onde !== undefined) { if (!ONDE[d.onde]) throw new Erro(400, 'Onde roda: worker, nuvem ou computador.'); m.onde = d.onde; }
  if (d.cadencia !== undefined) m.cadencia = linha(d.cadencia, 120) || null;
  if (d.modelo !== undefined) m.modelo = linha(d.modelo, 60) || null;
  if (d.estado !== undefined) { if (!ESTADOS[d.estado]) throw new Erro(400, `Estado desconhecido. Use: ${Object.keys(ESTADOS).join(', ')}.`); m.estado = d.estado; }
  if (d.teto_dia_usd !== undefined) m.teto_dia_usd = d.teto_dia_usd === null || d.teto_dia_usd === '' ? null : Math.min(1000, Math.max(0, Math.round(Number(d.teto_dia_usd) * 100) / 100 || 0));
  // Promover e rebaixar mudam o nível, um degrau por vez; nivel manda direto (de 1 a 4).
  const nivelAtual = (atual && atual.nivel) || 1;
  if (d.nivel !== undefined) m.nivel = Math.max(1, Math.min(4, Math.round(Number(d.nivel)) || 1));
  else if (d.promover) m.nivel = Math.min(4, nivelAtual + 1);
  else if (d.rebaixar) m.nivel = Math.max(1, nivelAtual - 1);
  if (d.ordem !== undefined) m.ordem = Math.max(0, Math.min(9999, Math.round(Number(d.ordem)) || 0));
  if (d.caderno !== undefined) m.caderno = bloco(d.caderno, 6000) || null;
  if (d.caderno_mais) {
    const nova = `${agora().slice(0, 10)}: ${linha(d.caderno_mais, 600)}`;
    let c = [m.caderno !== undefined ? m.caderno : atual && atual.caderno, nova].filter(Boolean).join('\n');
    while (c.length > 6000 && c.includes('\n')) c = c.slice(c.indexOf('\n') + 1);
    m.caderno = c.slice(-6000);
  }
  if (!atual) {
    if (!m.sala || !m.nome || !m.funcao) throw new Erro(400, 'Agente novo precisa de sala, nome e função.');
    const [a] = await db.insert(env, 'agentes', [{ id: chave, ...m }]);
    if (a.estado === 'ativo') await anotarCarreira(env, a.id, 'admitido', { de: 'planejado', para: 'ativo', motivo: d.motivo || 'Contratado.', quem, quemNome });
    return { ok: true, criado: true, ...a };
  }
  if (!Object.keys(m).length) {
    if (d.motivo) { await anotarCarreira(env, atual.id, 'nota', { motivo: d.motivo, quem, quemNome }); return { ok: true, anotado: true, ...atual }; }
    return { ok: true, ...atual };
  }
  if ((m.nome !== undefined && m.nome.length < 2) || (m.funcao !== undefined && m.funcao.length < 3)) throw new Erro(400, 'Nome e função não podem ficar vazios.');
  const [a] = await db.update(env, 'agentes', { id: `eq.${chave}` }, m);
  if (m.estado !== undefined && m.estado !== atual.estado) await anotarCarreira(env, a.id, tipoDaMudanca(atual.estado, m.estado), { de: atual.estado, para: m.estado, motivo: d.motivo || (m.estado === 'planejado' ? 'Voltou para a lista de espera.' : ''), quem, quemNome });
  if (m.nivel !== undefined && m.nivel !== nivelAtual) await anotarCarreira(env, a.id, m.nivel > nivelAtual ? 'promovido' : 'rebaixado', { de: NIVEIS[nivelAtual], para: NIVEIS[m.nivel], motivo: d.motivo, quem, quemNome });
  return { ok: true, criado: false, ...a };
}

// Um turno: o agente trabalhou. Sem id, registra um turno já fechado (ou aberto, com status "rodando"); com id, fecha
// o turno aberto. O agente que estava só no plano passa a "trabalhando" no primeiro turno que dá certo.
export async function registrarTurno(env, d = {}) {
  const a = await db.um(env, 'agentes', { id: `eq.${idAgente(d.agente)}` }, 'id,onde,estado,modelo');
  if (!a) throw new Erro(404, 'Esse agente não existe no escritório. Os ids estão em escritorio_ver.');
  const status = STATUS_TURNO.includes(d.status) ? d.status : 'ok';
  const dados = d.dados && typeof d.dados === 'object' && !Array.isArray(d.dados) && JSON.stringify(d.dados).length <= 4000 ? d.dados : {};
  const campos = { status, resumo: bloco(d.resumo, 1500) || null, custo_usd: dinheiro(d.custo_usd), tokens_entrada: inteiro(d.tokens_entrada), tokens_saida: inteiro(d.tokens_saida), dados };
  let t;
  if (d.id) {
    [t] = await db.update(env, 'turnos', { id: `eq.${Math.round(Number(d.id)) || 0}`, agente_id: `eq.${a.id}` }, { ...campos, fim: status === 'rodando' ? null : agora() }, 'id,status,inicio,fim');
    if (!t) throw new Erro(404, 'Não achei esse turno deste agente.');
  } else {
    let inicio = agora();
    const pedido = d.inicio ? Date.parse(d.inicio) : NaN;
    if (Number.isFinite(pedido) && pedido <= Date.now() && pedido >= Date.now() - 2 * 86_400_000) inicio = new Date(pedido).toISOString();
    [t] = await db.insert(env, 'turnos', [{ agente_id: a.id, onde: ONDE[d.onde] ? d.onde : a.onde, ...campos, inicio, fim: status === 'rodando' ? null : agora() }], { select: 'id,status,inicio,fim' });
    await anotarCusto(env, a.id, linha(d.modelo, 60) || a.modelo || 'claude', campos);
  }
  if (a.estado === 'planejado' && (status === 'ok' || status === 'sem_trabalho')) {
    await db.update(env, 'agentes', { id: `eq.${a.id}` }, { estado: 'ativo' }, 'id');
    await anotarCarreira(env, a.id, 'admitido', { de: 'planejado', para: 'ativo', motivo: 'Fez o primeiro turno.', quemNome: 'Sistema' });
  }
  return { ok: true, turno: t.id, status: t.status, inicio: t.inicio, fim: t.fim };
}

// Um cartão na mesa. Precisa da prova (o número ou o link que motivou) e da ação sugerida.
export async function criarProposta(env, d = {}) {
  let a = null;
  if (d.agente) {
    a = await db.um(env, 'agentes', { id: `eq.${idAgente(d.agente)}` }, 'id,sala');
    if (!a) throw new Erro(404, 'Esse agente não existe no escritório. Os ids estão em escritorio_ver.');
  }
  const sala = SALAS[d.sala] ? d.sala : a && a.sala;
  if (!sala) throw new Erro(400, `Diga a sala da proposta: ${Object.keys(SALAS).join(', ')}.`);
  const p = { agente_id: a ? a.id : null, sala, titulo: linha(d.titulo, 160), prova: bloco(d.prova, 1500), acao: bloco(d.acao, 1500), esforco: ESFORCOS[d.esforco] ? d.esforco : 'p', ganho: linha(d.ganho, 400) || null, links: lerLinks(d.links) };
  if (p.titulo.length < 3) throw new Erro(400, 'A proposta precisa de um título.');
  if (p.prova.length < 3) throw new Erro(400, 'A proposta precisa da prova: o número ou o link que motivou. Sem prova, não vai para a mesa.');
  if (p.acao.length < 3) throw new Erro(400, 'A proposta precisa da ação sugerida: o que fazer, em uma ou duas frases.');
  if (a) {
    const r = await db.select(env, 'propostas', { filtros: { agente_id: `eq.${a.id}`, status: 'eq.nova' }, select: 'id', limite: 1, contar: true });
    if ((r.total || 0) >= MAX_NA_MESA) throw new Erro(409, `Esse agente já tem ${MAX_NA_MESA} propostas na mesa esperando decisão. Espere o dono decidir antes de mandar mais.`);
  }
  const [nova] = await db.insert(env, 'propostas', [p]);
  return { ok: true, ...nova };
}

// A decisão do dono: aprovada, depois, descartada, ou nova (volta para a mesa).
export async function decidirProposta(env, id, { decisao, motivo } = {}, { quem, quemNome } = {}) {
  if (!UUID.test(String(id || ''))) throw new Erro(400, 'Id da proposta inválido.');
  if (!['aprovada', 'depois', 'descartada', 'nova'].includes(decisao)) throw new Erro(400, 'Decisão: aprovada, depois, descartada ou nova (volta para a mesa).');
  const atual = await db.um(env, 'propostas', { id: `eq.${id}` }, 'id,status');
  if (!atual) throw new Erro(404, 'Proposta não encontrada.');
  if (atual.status === 'feita') throw new Erro(409, 'Essa proposta já foi feita e tem resultado. Não dá para decidir de novo.');
  const m = decisao === 'nova'
    ? { status: 'nova', motivo: null, decidida_em: null, decidida_por: null, decidida_nome: null }
    : { status: decisao, motivo: linha(motivo, 500) || null, decidida_em: agora(), decidida_por: quem || null, decidida_nome: linha(quemNome, 60) || null };
  const [p] = await db.update(env, 'propostas', { id: `eq.${id}` }, m);
  return { ok: true, ...p };
}

// O que a proposta aprovada trouxe. É daqui que sai o placar de cada agente.
export async function resultadoProposta(env, id, { resultado } = {}) {
  if (!UUID.test(String(id || ''))) throw new Erro(400, 'Id da proposta inválido.');
  const texto = bloco(resultado, 1500);
  if (texto.length < 3) throw new Erro(400, 'Escreva o resultado: o que foi feito e o que mudou nos números.');
  const atual = await db.um(env, 'propostas', { id: `eq.${id}` }, 'id,status');
  if (!atual) throw new Erro(404, 'Proposta não encontrada.');
  if (!['aprovada', 'feita'].includes(atual.status)) throw new Erro(409, 'Só proposta aprovada recebe resultado. Essa ainda não foi aprovada pelo dono.');
  const [p] = await db.update(env, 'propostas', { id: `eq.${id}` }, { status: 'feita', resultado: texto, feita_em: agora() });
  return { ok: true, ...p };
}

// O teto de gasto do dia do escritório inteiro, em dólar.
export async function salvarTeto(env, valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0 || n > 1000) throw new Erro(400, 'O teto do dia é um valor em dólar, de 0 a 1000.');
  const teto = Math.round(n * 100) / 100;
  await db.insert(env, 'config', { chave: 'escritorio', valor: { teto_dia_usd: teto } }, { upsert: true, conflito: 'chave', select: 'chave' });
  return { ok: true, teto_dia_usd: teto };
}

// Para o agente que roda no Worker saber se ainda pode gastar hoje.
export async function orcamento(env) {
  const [teto, r] = await Promise.all([tetoDoDia(env), db.rpc(env, 'escritorio_resumo')]);
  const gasto = Number(r && r.custo_hoje) || 0;
  return { teto_dia_usd: teto, gasto_hoje_usd: gasto, sobra_usd: Math.max(0, Math.round((teto - gasto) * 10000) / 10000) };
}
