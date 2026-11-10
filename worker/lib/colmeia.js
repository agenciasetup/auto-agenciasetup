// A Colmeia de vendas (migration 39): a base única que todos os vendedores leem antes de falar e onde fica o que se
// aprende. O Atendente busca aqui só o que serve para a conversa (menos texto na IA, menos gasto); os vendedores da
// tarefa do direct leem e escrevem pelo conector; o dono ensina em português simples no painel.
// O texto dos itens vai para dentro da instrução da IA: por isso item de agente que vira regra ou resposta nasce como
// proposta e só vale depois do sim do dono. O que os agentes observam (vendeu, nao_vendeu) entra como dado.
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';

export const TIPOS = {
  resposta: 'Resposta liberada',
  regra: 'Regra de comportamento',
  objecao: 'Objeção e como responder',
  produto: 'Sobre o produto',
  vendeu: 'O que vendeu',
  nao_vendeu: 'O que não vendeu',
};
export const PRODUTOS = { geral: 'Geral', posts: 'Posts automáticos', combo: 'Combo Black Calango', videos: 'Vídeos com Claude', duvidas: 'Dúvidas da Fé' };
export const STATUS_COLMEIA = { ativa: 'Valendo', proposta: 'Esperando você', arquivada: 'Arquivada' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const limpo = (v, max) => String(v ?? '').replace(/[—–]/g, ',').replace(/\s+/g, ' ').trim().slice(0, max);

// ---------------------------------------------------------------- ler
export async function listarColmeia(env, { tipo, produto, status, busca, limite = 300 } = {}) {
  const filtros = {};
  if (TIPOS[tipo]) filtros.tipo = `eq.${tipo}`;
  if (PRODUTOS[produto]) filtros.produto = `eq.${produto}`;
  filtros.status = STATUS_COLMEIA[status] ? `eq.${status}` : 'in.(ativa,proposta)';
  const b = String(busca || '').replace(/[^\p{L}\p{N} ]/gu, ' ').trim().slice(0, 60);
  if (b) filtros.or = `(titulo.ilike.*${b}*,texto.ilike.*${b}*)`;
  const [itens, placar] = await Promise.all([
    db.select(env, 'colmeia', { filtros, ordem: 'status.desc,tipo.asc,atualizado_em.desc', limite: Math.min(500, Math.max(1, Number(limite) || 300)) }),
    db.rpc(env, 'colmeia_placar').catch(() => ({})),
  ]);
  const p = placar || {};
  return {
    itens: itens.map((i) => ({ ...i, usos: (p[i.id] || {}).usos || 0, vendas: (p[i.id] || {}).vendas || 0 })),
    numeros: { ativas: itens.filter((i) => i.status === 'ativa').length, propostas: itens.filter((i) => i.status === 'proposta').length },
    nomes: { tipos: TIPOS, produtos: PRODUTOS, status: STATUS_COLMEIA },
  };
}

// ---------------------------------------------------------------- escrever
// agente: true quando quem escreve é um agente (chave da casa, tarefa agendada). Regra, resposta, objeção e fato de
// produto escritos por agente esperam o dono; observação (vendeu, nao_vendeu) vale na hora.
export async function salvarColmeia(env, d = {}, { id, quemNome = '', agente = false } = {}) {
  const m = {};
  if (d.tipo !== undefined) { if (!TIPOS[d.tipo]) throw new Erro(400, `Tipo desconhecido. Use: ${Object.keys(TIPOS).join(', ')}.`); m.tipo = d.tipo; }
  if (d.produto !== undefined) { if (!PRODUTOS[d.produto]) throw new Erro(400, `Produto desconhecido. Use: ${Object.keys(PRODUTOS).join(', ')}.`); m.produto = d.produto; }
  if (d.titulo !== undefined) m.titulo = limpo(d.titulo, 200);
  if (d.texto !== undefined) m.texto = limpo(d.texto, 1200);
  if (d.prova !== undefined) m.prova = limpo(d.prova, 600) || null;
  if (m.titulo !== undefined && m.titulo.length < 3) throw new Erro(400, 'Escreva quando isso vale: a pergunta ou a situação.');
  if (m.texto !== undefined && m.texto.length < 3) throw new Erro(400, 'Escreva o que responder ou fazer.');
  if (id) {
    if (!UUID.test(String(id))) throw new Erro(404, 'Não encontrado.');
    if (agente) throw new Erro(403, 'Mudar um item que já existe é com o dono. Proponha um item novo.');
    if (d.status !== undefined) { if (!STATUS_COLMEIA[d.status]) throw new Erro(400, 'Status desconhecido.'); m.status = d.status; }
    if (!Object.keys(m).length) throw new Erro(400, 'Nada para mudar.');
    m.atualizado_em = new Date().toISOString();
    const [i] = await db.update(env, 'colmeia', { id: `eq.${id}` }, m);
    if (!i) throw new Erro(404, 'Não encontrado.');
    esquecerColmeia();
    return { ok: true, ...i };
  }
  if (!m.tipo || !m.titulo || !m.texto) throw new Erro(400, 'Item novo precisa de tipo, do "quando" e do "o que fazer".');
  const observacao = m.tipo === 'vendeu' || m.tipo === 'nao_vendeu';
  if (agente && observacao && !m.prova) throw new Erro(400, 'Lição de vendedor precisa da prova: o que aconteceu, com número ou com a conversa.');
  const linha = { produto: 'geral', ...m, origem: agente ? 'agente' : 'dono', autor: limpo(quemNome, 80) || null, status: agente && !observacao ? 'proposta' : 'ativa' };
  const [i] = await db.insert(env, 'colmeia', [linha]);
  esquecerColmeia();
  return { ok: true, criado: true, ...i };
}

// A resposta do dono a uma dúvida do direct entra como proposta: ele respondeu para UMA pessoa ("volta com 79,90"), e
// só ele sabe se vale para todo mundo. A pessoa recebe a resposta do mesmo jeito (o recado do Atendente).
export async function aprenderResposta(env, { pergunta, resposta, produto = 'geral', autor = '' }) {
  const titulo = limpo(pergunta, 200);
  const texto = limpo(resposta, 1200);
  if (titulo.length < 3 || texto.length < 3) return null;
  const [i] = await db.insert(env, 'colmeia', [{ tipo: 'resposta', produto: PRODUTOS[produto] ? produto : 'geral', titulo, texto, origem: 'dono', autor: limpo(autor, 80) || 'Resposta a uma dúvida', status: 'proposta' }], { select: 'id' }).catch((e) => { console.error('colmeia aprender', e && e.message); return []; });
  esquecerColmeia();
  return i || null;
}

// ---------------------------------------------------------------- buscar o que serve para uma conversa
let guardado = { quando: 0, itens: [] };
const VALIDADE = 90_000;
export function esquecerColmeia() { guardado.quando = 0; }
async function ativos(env) {
  if (Date.now() - guardado.quando > VALIDADE) {
    const itens = await db.select(env, 'colmeia', { filtros: { status: 'eq.ativa' }, select: 'id,tipo,produto,titulo,texto,origem', ordem: 'atualizado_em.desc', limite: 400 });
    guardado = { quando: Date.now(), itens: itens.map((i) => ({ ...i, pt: palavras(i.titulo), px: palavras(i.texto) })) };
  }
  return guardado.itens;
}
const SEM_PESO = new Set('a o e de da do das dos um uma uns umas que eu vc voce tu ele ela pra para por com sem em no na nos nas se me te ja nao sim tem ter ta esta estao isso esse essa este aqui ai la mais muito bem como qual quais quando onde ou mas so tambem foi vai ser sao meu minha seu sua oi ola opa bom boa dia tarde noite tudo quero queria gostaria posso pode fazer sobre'.split(' '));
function palavras(t) {
  const n = String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ');
  return new Set(n.split(/\s+/).filter((p) => p.length >= 3 && !SEM_PESO.has(p)).map((p) => (p.length > 5 ? p.slice(0, 5) : p)));
}

// As regras entram sempre (são poucas e curtas). Dos outros tipos, só os que têm a ver com o que a pessoa escreveu:
// o "quando" pesa o dobro do "o que fazer"; o produto do interesse dela desempata. Sem nada a ver, vão os fatos dos
// produtos. Devolve também os ids usados, para o placar de cada item.
export async function conhecimentoPara(env, texto, { interesse = '', max = 7 } = {}) {
  const todos = await ativos(env).catch(() => []);
  const alvo = palavras(texto);
  const regras = todos.filter((i) => i.tipo === 'regra').slice(0, 12);
  const pontuados = todos.filter((i) => i.tipo !== 'regra').map((i) => {
    let p = 0;
    for (const w of alvo) { if (i.pt.has(w)) p += 2; else if (i.px.has(w)) p += 1; }
    if (p && interesse && i.produto === interesse) p += 1;
    return { i, p };
  }).filter((x) => x.p > 0).sort((a, b) => b.p - a.p).slice(0, max).map((x) => x.i);
  const fatos = todos.filter((i) => i.tipo === 'produto' && !pontuados.includes(i) && (pontuados.length < 2 || pontuados.some((q) => q.produto === i.produto)));
  const itens = [...pontuados, ...fatos].slice(0, max + 2);
  return { regras, itens, ids: [...regras, ...itens].map((i) => i.id) };
}
