// A Colmeia de vendas (migration 39): a base única que todos os vendedores leem antes de falar e onde fica o que se
// aprende. O Atendente busca aqui só o que serve para a conversa (menos texto na IA, menos gasto); os vendedores da
// tarefa do direct leem e escrevem pelo conector; o dono ensina em português simples no painel.
// O texto dos itens vai para dentro da instrução da IA: por isso item de agente que vira regra ou resposta nasce como
// proposta e só vale depois do sim do dono. O que os agentes observam (vendeu, nao_vendeu) entra como dado.
// A exceção é a junção do Conciliador (migration 40, agentes/conciliador.js): quando dois itens do dono se contradizem,
// ele escreve um item novo só com o que os dois já diziam, e esse item guarda em "substitui" quem ele substitui. O dono
// desfaz com um botão.
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
    // porque e pergunta: o "por quê" da junção sem a pergunta, e a pergunta que o Conciliador fez ao dono (lerProva).
    itens: itens.map((i) => ({ ...i, ...lerProva(i), usos: (p[i.id] || {}).usos || 0, vendas: (p[i.id] || {}).vendas || 0 })),
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
    // "Desfazer a junção" na tela: o item que juntou sai e os itens de antes voltam a valer.
    if (d.desfazer) return desfazerJuncao(env, id);
    if (d.status !== undefined) { if (!STATUS_COLMEIA[d.status]) throw new Erro(400, 'Status desconhecido.'); m.status = d.status; }
    if (!Object.keys(m).length) throw new Erro(400, 'Nada para mudar.');
    m.atualizado_em = new Date().toISOString();
    const [i] = await db.update(env, 'colmeia', { id: `eq.${id}` }, m);
    if (!i) throw new Erro(404, 'Não encontrado.');
    // Junção aprovada (ou que voltou a valer): os itens que ela substitui saem, para não ficarem as duas versões.
    const antes = m.status === 'ativa' ? idsDaJuncao(i) : [];
    let arquivados = null;
    if (antes.length) {
      try {
        arquivados = await db.update(env, 'colmeia', { id: `in.(${antes.join(',')})`, status: 'eq.ativa' }, { status: 'arquivada', atualizado_em: m.atualizado_em }, 'id');
      } catch (e) {
        // Sem arquivar os itens de antes a junção não entra: volta a esperar o dono, que tenta de novo.
        await db.update(env, 'colmeia', { id: `eq.${id}` }, { status: 'proposta', atualizado_em: m.atualizado_em }, 'id').catch((e2) => console.error('colmeia aprovar junção', e2 && e2.message));
        esquecerColmeia();
        throw e;
      }
    }
    esquecerColmeia();
    return { ok: true, ...i, ...(arquivados ? { arquivados: arquivados.length } : {}) };
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

// ---------------------------------------------------------------- junções (o Conciliador da Colmeia)
// O item que junta outros guarda em "substitui" a lista de quem ele substitui: [{ id, titulo }]. Enquanto ele vale, os
// itens de antes ficam arquivados. Nada é apagado: desfazer arquiva o novo e devolve os de antes.
export const idsDaJuncao = (i) => (Array.isArray(i && i.substitui) ? i.substitui : []).map((s) => String((s && s.id) || '')).filter((id) => UUID.test(id));

// A pergunta do Conciliador ao dono. Quando ele não sabe qual regra deve ganhar, a junção nasce como proposta e a
// pergunta vai no fim do "por quê" (coluna prova), depois de "Pergunta:". A tela mostra a pergunta separada, com um
// campo para o dono responder; a resposta volta para o Conciliador, que reescreve o item (responderAoConciliador).
// Sem coluna nova: assim o Worker e o banco não dependem de ordem de publicação.
const MARCA_PERGUNTA = 'Pergunta:';
const LIMITE_PROVA = 600;
const encurtar = (t, max) => (t.length <= max ? t : `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`);
// Monta o "por quê" com a pergunta no fim, sem deixar o corte de tamanho comer a pergunta.
export function provaComPergunta(porque, pergunta) {
  const p = limpo(pergunta, 260).split(MARCA_PERGUNTA).join(' ').trim();
  const q = limpo(porque, LIMITE_PROVA).split(MARCA_PERGUNTA).join(' ').trim();
  if (!p) return encurtar(q, LIMITE_PROVA);
  return `${encurtar(q, LIMITE_PROVA - p.length - MARCA_PERGUNTA.length - 2)} ${MARCA_PERGUNTA} ${p}`.trim();
}
// Lê de volta: { porque, pergunta }. Só junção que ainda espera o dono tem pergunta. As propostas gravadas antes da
// marca (até 10/11/2026) trazem a pergunta como última frase do "por quê", terminada em "?".
export function lerProva(i) {
  const prova = String((i && i.prova) || '').trim();
  if (!i || i.status !== 'proposta' || !idsDaJuncao(i).length || !prova) return { porque: prova, pergunta: '' };
  const k = prova.lastIndexOf(MARCA_PERGUNTA);
  if (k >= 0) return { porque: prova.slice(0, k).trim(), pergunta: prova.slice(k + MARCA_PERGUNTA.length).trim() };
  if (!prova.endsWith('?')) return { porque: prova, pergunta: '' };
  const m = prova.match(/^([\s\S]*[.!?])\s+(\S[\s\S]*\?)$/);
  return m ? { porque: m[1].trim(), pergunta: m[2].trim() } : { porque: '', pergunta: prova };
}

// A hora da última mudança no que está valendo. É o que o Conciliador olha todo minuto para saber se tem trabalho.
export async function marcaDaColmeia(env) {
  const [i] = await db.select(env, 'colmeia', { filtros: { status: 'eq.ativa' }, select: 'atualizado_em', ordem: 'atualizado_em.desc', limite: 1 });
  return i ? i.atualizado_em : null;
}

// O que o Conciliador lê, numa chamada só: os itens que estão valendo e toda junção que existe (valendo, esperando o
// dono, desfeita ou descartada). semJuncoes: só os itens que valem, para o banco que ainda não tem a migration 40.
export async function lerParaConciliar(env, { limite = 600, semJuncoes = false } = {}) {
  const linhas = await db.select(env, 'colmeia', {
    filtros: semJuncoes ? { status: 'eq.ativa' } : { or: '(status.eq.ativa,substitui.not.is.null)' },
    select: `id,tipo,produto,titulo,texto,origem,status,atualizado_em${semJuncoes ? '' : ',substitui'}`, ordem: 'atualizado_em.desc', limite,
  });
  return { ativos: linhas.filter((i) => i.status === 'ativa'), juncoes: linhas.filter((i) => idsDaJuncao(i).length), cortou: linhas.length >= limite };
}

// As junções de uma rodada do Conciliador, em duas chamadas: uma cria os itens novos e outra arquiva os itens de antes
// das junções que já valem (aplicar). A ordem é de propósito: primeiro o novo, depois o arquivo. Se a segunda falhar,
// o item novo volta para proposta e nada se perde.
// juncoes: [{ tipo, produto, titulo, texto, prova, origem, aplicar, originais: [{ id, titulo }] }].
export async function gravarJuncoes(env, juncoes = [], { autor = '' } = {}) {
  if (!juncoes.length) return [];
  const linhas = juncoes.map((j) => {
    const originais = (Array.isArray(j.originais) ? j.originais : []).filter((o) => o && UUID.test(String(o.id)));
    const linha = {
      tipo: j.tipo, produto: PRODUTOS[j.produto] ? j.produto : 'geral', titulo: limpo(j.titulo, 200), texto: limpo(j.texto, 1200), prova: limpo(j.prova, 600) || null,
      origem: j.origem === 'dono' ? 'dono' : 'agente', autor: limpo(autor, 80) || null, status: j.aplicar ? 'ativa' : 'proposta',
      substitui: originais.map((o) => ({ id: String(o.id), titulo: limpo(o.titulo, 200) })),
    };
    if (!TIPOS[linha.tipo] || linha.titulo.length < 3 || linha.texto.length < 3 || linha.substitui.length < 2) throw new Erro(400, 'Junção precisa de tipo, do "quando", do "o que fazer" e de pelo menos 2 itens para juntar.');
    return linha;
  });
  const criados = await db.insert(env, 'colmeia', linhas);
  // Cada item de antes entra em uma junção só: o primeiro deles diz qual linha criada é de qual junção.
  const feitas = linhas.map((l) => ({ ...(criados.find((c) => idsDaJuncao(c)[0] === l.substitui[0].id) || l), originais: l.substitui }));
  const valendo = feitas.filter((f) => f.status === 'ativa' && f.id);
  if (valendo.length) {
    const agora = new Date().toISOString();
    try {
      await db.update(env, 'colmeia', { id: `in.(${valendo.flatMap((f) => f.originais.map((o) => o.id)).join(',')})`, status: 'eq.ativa' }, { status: 'arquivada', atualizado_em: agora }, 'id');
    } catch (e) {
      console.error('colmeia juntar', e && e.message);
      await db.update(env, 'colmeia', { id: `in.(${valendo.map((f) => f.id).join(',')})` }, { status: 'proposta', atualizado_em: agora }, 'id').catch((e2) => console.error('colmeia juntar, voltar para proposta', e2 && e2.message));
      for (const f of valendo) { f.status = 'proposta'; f.rebaixada = true; }
    }
  }
  esquecerColmeia();
  return feitas;
}

// Desfaz uma junção que está valendo: o item novo é arquivado e os itens de antes voltam a valer.
export async function desfazerJuncao(env, id) {
  if (!UUID.test(String(id))) throw new Erro(404, 'Não encontrado.');
  const agora = new Date().toISOString();
  // Uma chamada que confere e arquiva ao mesmo tempo: só sai o item que é junção e que está valendo.
  const [i] = await db.update(env, 'colmeia', { id: `eq.${id}`, status: 'eq.ativa', substitui: 'not.is.null' }, { status: 'arquivada', atualizado_em: agora });
  if (!i) throw new Erro(400, 'Só dá para desfazer uma junção que está valendo.');
  const antes = idsDaJuncao(i);
  let voltaram = [];
  if (antes.length) {
    try {
      voltaram = await db.update(env, 'colmeia', { id: `in.(${antes.join(',')})`, status: 'eq.arquivada' }, { status: 'ativa', atualizado_em: agora }, 'id');
    } catch (e) {
      // Os itens de antes não voltaram: a junção volta a valer, para os vendedores não ficarem sem as duas regras.
      await db.update(env, 'colmeia', { id: `eq.${id}` }, { status: 'ativa', atualizado_em: agora }, 'id').catch((e2) => console.error('colmeia desfazer', e2 && e2.message));
      esquecerColmeia();
      throw e;
    }
  }
  esquecerColmeia();
  return { ok: true, ...i, desfeita: true, voltaram: voltaram.length };
}

// ---------------------------------------------------------------- buscar o que serve para uma conversa
let guardado = { quando: 0, itens: [] };
const VALIDADE = 90_000;
export function esquecerColmeia() { guardado.quando = 0; }
// Duas leituras: o que o dono ensinou (regra, resposta, objeção, produto) e as lições dos vendedores. Separadas para
// as lições, que chegam várias por dia, nunca empurrarem para fora o que o dono escreveu.
const LICOES = ['vendeu', 'nao_vendeu'];
const ehLicao = (i) => LICOES.includes(i.tipo);
async function ativos(env) {
  if (Date.now() - guardado.quando > VALIDADE) {
    const campos = 'id,tipo,produto,titulo,texto,origem';
    const [base, licoes] = await Promise.all([
      db.select(env, 'colmeia', { filtros: { status: 'eq.ativa', tipo: `not.in.(${LICOES.join(',')})` }, select: campos, ordem: 'atualizado_em.desc', limite: 400 }),
      db.select(env, 'colmeia', { filtros: { status: 'eq.ativa', tipo: `in.(${LICOES.join(',')})` }, select: campos, ordem: 'atualizado_em.desc', limite: 60 }).catch(() => []),
    ]);
    guardado = { quando: Date.now(), itens: [...base, ...licoes].map((i) => ({ ...i, pt: palavras(i.titulo), px: palavras(i.texto) })) };
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
// licoes: até 3 lições dos vendedores que têm a ver com a conversa. Vão separadas dos itens porque são observação de
// agente, escrita a partir de conversa de cliente: quem usa precisa mostrar como dado, nunca como resposta liberada.
export async function conhecimentoPara(env, texto, { interesse = '', max = 7 } = {}) {
  const todos = await ativos(env).catch(() => []);
  const alvo = palavras(texto);
  const regras = todos.filter((i) => i.tipo === 'regra').slice(0, 30);
  const pontuar = (lista, n) => lista.map((i) => {
    let p = 0;
    for (const w of alvo) { if (i.pt.has(w)) p += 2; else if (i.px.has(w)) p += 1; }
    if (p && interesse && i.produto === interesse) p += 1;
    return { i, p };
  }).filter((x) => x.p > 0).sort((a, b) => b.p - a.p).slice(0, n).map((x) => x.i);
  const pontuados = pontuar(todos.filter((i) => i.tipo !== 'regra' && !ehLicao(i)), max);
  const fatos = todos.filter((i) => i.tipo === 'produto' && !pontuados.includes(i) && (pontuados.length < 2 || pontuados.some((q) => q.produto === i.produto)));
  const itens = [...pontuados, ...fatos].slice(0, max + 2);
  const licoes = pontuar(todos.filter(ehLicao), 3);
  // ids: o que entrou nesta conversa por ter a ver com ela, para o placar de cada item. As regras ficam de fora da
  // conta: entram em toda conversa, então somavam o mesmo número de usos e de vendas e o placar delas não media nada.
  return { regras, itens, licoes, ids: [...itens, ...licoes].map((i) => i.id) };
}
