// Follow-up do direct (pedido do dono em 08/11/2026: "vender todos os dias"). Cada pessoa do Instagram que pode comprar,
// na fase em que está, até vender: quem comentou a palavra de um post (importado do Comenta X) e quem chegou pelo direct
// (a tarefa agendada do Claude lê o direct pelo Chrome e anota aqui pelo conector). A mensagem sai pelo Claude só com o
// ok do dono na sessão da tarefa, ou pela equipe; o sistema nunca manda sozinho. A dúvida que o Claude não sabe
// responder fica na fase "duvida" até o dono responder na tela; as respostas viram exemplo (respostasAprendidas).
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { LINKS_VENDA, codigoDaPessoa, marcarLinks } from './pessoa.js';

const DIA = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHAVE_SYNC = 'followup_sincronizado';

export const FASES = {
  novo: 'Chegou, sem oferta',
  ofertado: 'Oferta enviada',
  conversando: 'Conversando',
  duvida: 'Dúvida com você',
  nao_sei: 'Não sei o que fazer',
  comprou: 'Comprou',
  nao_quer: 'Não quer',
};
export const INTERESSES = {
  posts: 'Posts automáticos',
  combo: 'Combo Black',
  videos: 'Vídeos com Claude',
  material: 'Material grátis',
  outro: 'Outro assunto',
  nao_sei: 'Não sei',
};
const ORIGENS = ['direct', 'story', 'comentario', 'manual'];
const PERFIS = ['br', 'en'];

// Teste de vendedor (10/11/2026, docs/escritorio.md): cada vendedor é um roteiro de conversa, descrito em
// .claude/skills/direct-agenciasetup/references/mensagens.md. A pessoa fica com o mesmo vendedor do primeiro toque
// até o fim. Quem ainda não foi tocado já aparece na lista com o vendedor que vai atender: o sorteio sai do @, então
// é sempre o mesmo para a mesma pessoa e divide a lista em partes iguais, sem ninguém escolher.
export const VENDEDORES = {
  calango: 'Calango (amigo, link e frase curta)',
  pergunta: 'Pergunta antes (só oferta depois da resposta)',
};
const VENDEDORES_PADRAO = ['calango', 'pergunta'];
async function vendedoresAtivos(env) {
  const c = await db.um(env, 'config', { chave: 'eq.followup_vendedores' }).catch(() => null);
  const lista = c && c.valor && Array.isArray(c.valor.ativos) ? c.valor.ativos.filter((v) => VENDEDORES[v]) : [];
  return lista.length ? lista : VENDEDORES_PADRAO;
}
export function vendedorDe(usuario, ativos = VENDEDORES_PADRAO) {
  let h = 2166136261;
  for (const ch of String(usuario || '')) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return ativos[h % ativos.length];
}

const texto = (v, max) => { const t = String(v ?? '').trim(); return t ? t.slice(0, max) : null; };
const quando = (v) => { if (v === null || v === '') return null; const d = new Date(v); if (Number.isNaN(d.getTime())) throw new Erro(400, 'Data inválida.'); return d.toISOString(); };
export const normalUsuario = (v) => String(v || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').toLowerCase();
const usuarioValido = (u) => /^[a-z0-9._]{1,30}$/.test(u);

// Os links de quem atende: a conversa (quando a tarefa já anotou o id dela) e o perfil.
function links(f) {
  return {
    abrir: f.conversa ? `https://www.instagram.com/direct/t/${f.conversa}/` : `https://ig.me/m/${f.usuario}`,
    perfil_url: `https://www.instagram.com/${f.usuario}/`,
  };
}

// Os links de venda desta pessoa (pessoa.js): levam o vendedor dela e o código dela, para a compra cair no nome certo.
// A mensagem pronta já sai com eles no lugar do link sem marca.
async function comVenda(l, vendedor) {
  const codigo = await codigoDaPessoa(l.perfil, l.usuario).catch(() => '');
  return {
    links_venda: Object.fromEntries(Object.entries(LINKS_VENDA).map(([k, url]) => [k, marcarLinks(url, vendedor, codigo)])),
    proxima_mensagem: l.proxima_mensagem ? marcarLinks(l.proxima_mensagem, vendedor, codigo) : l.proxima_mensagem,
  };
}

// ---------------------------------------------------------------- a lista
const CAMPOS = 'id,perfil,usuario,nome,conversa,origem,interesse,fase,palavras,posts,email,ultima_mensagem,ultima_em,nosso_em,toques,proxima_mensagem,proximo_em,duvida,duvida_em,resposta,respondida_em,produto,comprou_em,compra_por,pos_venda_em,nota,historico,primeiro_em,atualizado_em,vendedor,tocado_em,respondeu_em,igsid,humano_em,quem:equipe!followups_respondida_por_fkey(nome)';
const ORDEM = {
  duvida: 'duvida_em.asc.nullslast',
  comprou: 'comprou_em.desc.nullslast',
  nao_quer: 'atualizado_em.desc',
  nao_sei: 'primeiro_em.desc',
};

// numeros: quantas pessoas em cada fase e quantas estão na hora do próximo toque. A lista da fase vem com o histórico
// curto (as últimas 8 coisas) e os links de abrir a conversa.
export async function listaFollowup(env, { fase = 'novo', interesse = '', busca = '', perfil = 'br', limite = 50, agora = Date.now() } = {}) {
  const p = PERFIS.includes(perfil) ? perfil : 'br';
  const n = (await db.rpc(env, 'followup_numeros', { p_perfil: p })) || {};
  const numeros = Object.fromEntries(Object.keys(FASES).map((k) => [k, Number((n.fases || {})[k]) || 0]));
  const naHora = Number(n.na_hora) || 0;
  const porInteresse = n.interesses || {};
  const f =Object.keys(FASES).includes(fase) ? fase : (fase === 'na_hora' ? 'na_hora' : 'novo');
  const filtros = { perfil: `eq.${p}` };
  if (f === 'na_hora') Object.assign(filtros, { fase: 'in.(novo,ofertado,conversando)', proximo_em: `lte.${new Date(agora).toISOString()}` });
  else filtros.fase = `eq.${f}`;
  if (interesse && INTERESSES[interesse]) filtros.interesse = `eq.${interesse}`;
  const b = normalUsuario(busca).replace(/[^a-z0-9._ ]/g, '');
  if (b) filtros.or = `(usuario.ilike.*${b}*,nome.ilike.*${b}*,email.ilike.*${b}*)`;
  const lim = Math.min(200, Math.max(1, Number(limite) || 50));
  const ordem = ORDEM[f] || 'proximo_em.asc.nullsfirst,ultima_em.desc.nullslast';
  const [r, ativos, placar] = await Promise.all([
    db.select(env, 'followups', { filtros, select: CAMPOS, ordem, limite: lim, contar: true }),
    vendedoresAtivos(env),
    db.rpc(env, 'followup_placar', { p_perfil: p }).catch(() => []),
  ]);
  const linhas = r.linhas || r;
  const itens = await Promise.all(linhas.map(async (l) => ({
    ...l, quem: undefined, respondida_por: l.quem ? l.quem.nome : null,
    historico: (l.historico || []).slice(-8),
    na_hora: !!(l.proximo_em && Date.parse(l.proximo_em) <= agora && ['novo', 'ofertado', 'conversando'].includes(l.fase)),
    // O vendedor de quem já foi tocado é fixo; o de quem ainda não foi é o do sorteio.
    vendedor: l.vendedor || vendedorDe(l.usuario, ativos), vendedor_fixo: !!l.vendedor,
    // Dá para mandar pelo sistema (API) só até 24 horas depois da última mensagem da pessoa.
    pode_api: !!(l.igsid && l.ultima_em && agora - Date.parse(l.ultima_em) < 23.5 * 3600_000), igsid: undefined,
    ...links(l), ...(await comVenda(l, l.vendedor || vendedorDe(l.usuario, ativos))),
  })));
  return {
    numeros: { ...numeros, na_hora: naHora, por_interesse: porInteresse }, fases: FASES, interesses: INTERESSES, fase: f, itens, total: r.total ?? itens.length,
    vendedores: VENDEDORES, vendedores_ativos: ativos, placar: lerPlacar(placar),
  };
}

// O placar dos vendedores: de cada um, quantas pessoas atendeu, quantas responderam, quantas compraram e a receita.
// As taxas só aparecem com 30 pessoas ou mais: com menos, o número engana.
function lerPlacar(linhas) {
  return (Array.isArray(linhas) ? linhas : []).map((l) => {
    const pessoas = Number(l.pessoas) || 0;
    const taxa = (n) => (pessoas >= 30 ? Math.round((Number(n) / pessoas) * 1000) / 10 : null);
    return {
      vendedor: l.vendedor, nome: VENDEDORES[l.vendedor] || l.vendedor, pessoas,
      responderam: Number(l.responderam) || 0, compraram: Number(l.compraram) || 0, receita_centavos: Number(l.receita_centavos) || 0,
      taxa_resposta: taxa(l.responderam), taxa_compra: taxa(l.compraram),
      receita_por_100_centavos: pessoas >= 30 ? Math.round(((Number(l.receita_centavos) || 0) / pessoas) * 100) : null,
      desde: l.desde || null, pouco: pessoas < 300,
    };
  });
}
export async function placarFollowup(env, perfil = 'br') {
  return lerPlacar(await db.rpc(env, 'followup_placar', { p_perfil: PERFIS.includes(perfil) ? perfil : 'br' }).catch(() => []));
}

// Uma pessoa pelo id ou pelo @ (com o histórico inteiro).
export async function lerFollowup(env, { id, usuario, perfil = 'br' }) {
  const filtros = id ? { id: `eq.${id}` } : { perfil: `eq.${PERFIS.includes(perfil) ? perfil : 'br'}`, usuario: `eq.${normalUsuario(usuario)}` };
  if (id && !UUID.test(String(id))) throw new Erro(404, 'Não encontrado.');
  const l = await db.um(env, 'followups', filtros, CAMPOS);
  if (!l) return null;
  const vendedor = l.vendedor || vendedorDe(l.usuario, await vendedoresAtivos(env));
  return { ...l, quem: undefined, respondida_por: l.quem ? l.quem.nome : null, vendedor, vendedor_fixo: !!l.vendedor, ...links(l), ...(await comVenda(l, vendedor)) };
}

// ---------------------------------------------------------------- salvar
// Cria (pelo @) ou muda uma pessoa. Só os campos enviados mudam. mandei: a mensagem que acabou de sair (conta um toque e
// entra no histórico). evento: uma linha no histórico. duvida: a pergunta que só o dono responde (vai para a fase duvida).
export async function salvarFollowup(env, d = {}, { id, quem = null, quemNome = '' } = {}) {
  let atual = null;
  if (id) {
    if (!UUID.test(String(id))) throw new Erro(404, 'Não encontrado.');
    atual = await db.um(env, 'followups', { id: `eq.${id}` }, '*');
    if (!atual) throw new Erro(404, 'Não encontrado.');
  } else {
    const u = normalUsuario(d.usuario);
    if (!usuarioValido(u)) throw new Erro(400, 'Mande o @ da pessoa no Instagram (letras, números, ponto e _).');
    const perfil = PERFIS.includes(d.perfil) ? d.perfil : 'br';
    atual = await db.um(env, 'followups', { perfil: `eq.${perfil}`, usuario: `eq.${u}` }, '*');
    if (!atual) atual = { novo: true, perfil, usuario: u, fase: 'novo', interesse: 'nao_sei', toques: 0, historico: [] };
  }
  const agora = new Date().toISOString();
  const m = {};
  const hist = [];
  const evento = (tipo, t) => hist.push({ em: agora, tipo, texto: String(t).slice(0, 500), ...(quemNome ? { quem: quemNome } : {}) });

  if (d.nome !== undefined) m.nome = texto(d.nome, 120);
  if (d.igsid !== undefined) m.igsid = /^[0-9]{5,30}$/.test(String(d.igsid || '')) ? String(d.igsid) : null;
  if (d.conversa !== undefined) {
    const c = String(d.conversa || '').match(/(\d{6,25})/);
    m.conversa = c ? c[1] : null;
  }
  if (d.origem !== undefined) { if (!ORIGENS.includes(d.origem)) throw new Erro(400, 'Origem inválida.'); m.origem = d.origem; }
  if (d.interesse !== undefined && d.interesse !== atual.interesse) {
    if (!INTERESSES[d.interesse]) throw new Erro(400, 'Interesse inválido.');
    m.interesse = d.interesse;
    if (!atual.novo) evento('interesse', `Interesse: ${INTERESSES[d.interesse]}`);
  }
  if (d.email !== undefined) m.email = texto(d.email, 200) ? String(d.email).trim().toLowerCase().slice(0, 200) : null;
  if (d.ultima_mensagem !== undefined) {
    m.ultima_mensagem = texto(d.ultima_mensagem, 500);
    m.ultima_em = d.ultima_em ? quando(d.ultima_em) : agora;
    if (m.ultima_mensagem && m.ultima_mensagem !== atual.ultima_mensagem) evento('pessoa', m.ultima_mensagem);
    // A primeira resposta depois do nosso primeiro toque: é o que o placar dos vendedores conta.
    if (m.ultima_mensagem && atual.tocado_em && !atual.respondeu_em && Date.parse(m.ultima_em) > Date.parse(atual.tocado_em)) m.respondeu_em = m.ultima_em;
  } else if (d.ultima_em !== undefined) m.ultima_em = quando(d.ultima_em);
  // mandei: o que saiu agora. A próxima mensagem enviada junto é a do toque seguinte; sem ela, fica vazia. Sem
  // proximo_em, o próximo toque fica para daqui a um dia, e quem estava em "novo" passa para "ofertado".
  if (d.mandei) {
    const t = texto(typeof d.mandei === 'string' ? d.mandei : atual.proxima_mensagem, 1000);
    m.nosso_em = agora;
    m.toques = (atual.toques || 0) + 1;
    m.proxima_mensagem = d.proxima_mensagem !== undefined ? texto(d.proxima_mensagem, 1000) : null;
    if (d.proximo_em === undefined) m.proximo_em = new Date(Date.now() + DIA).toISOString();
    if (d.fase === undefined && (atual.fase === 'novo' || atual.novo)) d.fase = 'ofertado';
    // O primeiro toque fixa o vendedor da pessoa: o que veio no pedido (se for um dos ativos) ou o do sorteio pelo @.
    if (!atual.tocado_em) m.tocado_em = agora;
    if (!atual.vendedor) {
      const ativos = await vendedoresAtivos(env);
      m.vendedor = ativos.includes(d.vendedor) ? d.vendedor : vendedorDe(atual.usuario, ativos);
    }
    evento('nos', t || 'Mensagem enviada');
  } else if (d.proxima_mensagem !== undefined) m.proxima_mensagem = texto(d.proxima_mensagem, 1000);
  if (d.proximo_em !== undefined) m.proximo_em = quando(d.proximo_em);
  if (d.duvida !== undefined) {
    m.duvida = texto(d.duvida, 1000);
    if (m.duvida) { m.duvida_em = agora; m.resposta = null; m.respondida_em = null; m.respondida_por = null; if (d.fase === undefined) d.fase = 'duvida'; evento('duvida', `Dúvida: ${m.duvida}`); }
  }
  if (d.fase !== undefined && d.fase !== atual.fase) {
    if (!FASES[d.fase]) throw new Erro(400, 'Fase inválida.');
    m.fase = d.fase;
    if (d.fase === 'comprou' && !atual.comprou_em) Object.assign(m, { comprou_em: agora, compra_por: 'manual' });
    evento('fase', `${FASES[atual.fase] || 'Nova'} → ${FASES[d.fase]}`);
  }
  if (d.pos_venda) m.pos_venda_em = agora;
  if (d.nota !== undefined) m.nota = texto(d.nota, 500);
  if (d.evento) evento('nota', d.evento);
  if (Array.isArray(d.palavras)) m.palavras = [...new Set([...(atual.palavras || []), ...d.palavras.map((p) => String(p).toUpperCase().slice(0, 40))])].slice(0, 50);

  if (!Object.keys(m).length && !hist.length && !atual.novo) throw new Erro(400, 'Nada para mudar.');
  if (hist.length) m.historico = [...(atual.historico || []), ...hist].slice(-60);

  if (atual.novo) {
    const linha = { perfil: atual.perfil, usuario: atual.usuario, fase: 'novo', interesse: 'nao_sei', origem: 'direct', ...m };
    if (!hist.some((h) => h.tipo === 'chegou')) linha.historico = [{ em: agora, tipo: 'chegou', texto: `Entrou na lista (${linha.origem})` }, ...(linha.historico || [])];
    const [nova] = await db.insert(env, 'followups', linha, { select: 'id,usuario,fase' });
    return { ok: true, criado: true, ...nova };
  }
  await db.update(env, 'followups', { id: `eq.${atual.id}` }, m, 'id');
  return { ok: true, id: atual.id, usuario: atual.usuario, ...Object.fromEntries(Object.entries(m).filter(([k]) => k !== 'historico')) };
}

// O dono responde a dúvida na tela. A pessoa volta para "conversando", com o próximo toque para agora: a próxima rodada
// da tarefa escreve a resposta no jeito da agência e pede o ok para mandar.
export async function responderDuvida(env, id, resposta, { quem = null, quemNome = '' } = {}) {
  if (!UUID.test(String(id))) throw new Erro(404, 'Não encontrado.');
  const r = texto(resposta, 2000);
  if (!r) throw new Erro(400, 'Escreva a resposta.');
  const atual = await db.um(env, 'followups', { id: `eq.${id}` }, 'id,fase,duvida,historico,comprou_em');
  if (!atual) throw new Erro(404, 'Não encontrado.');
  const agora = new Date().toISOString();
  const m = {
    resposta: r, respondida_em: agora, respondida_por: quem, proximo_em: agora, proxima_mensagem: null,
    fase: atual.fase === 'duvida' ? (atual.comprou_em ? 'comprou' : 'conversando') : atual.fase,
    historico: [...(atual.historico || []), { em: agora, tipo: 'resposta', texto: `Resposta do dono: ${r}`.slice(0, 500), ...(quemNome ? { quem: quemNome } : {}) }].slice(-60),
  };
  await db.update(env, 'followups', { id: `eq.${id}` }, m, 'id');
  return { ok: true, id, fase: m.fase };
}

// As dúvidas que o dono já respondeu: o Claude lê antes de responder uma pergunta parecida.
export async function respostasAprendidas(env, { limite = 200 } = {}) {
  const l = await db.select(env, 'followups', { filtros: { resposta: 'not.is.null', duvida: 'not.is.null' }, select: 'usuario,interesse,duvida,resposta,respondida_em', ordem: 'respondida_em.desc', limite: Math.min(500, Math.max(1, Number(limite) || 200)) });
  return { respostas: l.map((x) => ({ pergunta: x.duvida, resposta: x.resposta, interesse: x.interesse, em: x.respondida_em, de: x.usuario })), total: l.length };
}

// ---------------------------------------------------------------- sincronizar
// Traz quem comentou a palavra desde a última vez (com um dia de folga) e confere quem pagou. Duas chamadas ao banco.
export async function sincronizarFollowup(env, { tudo = false } = {}) {
  const c = await db.um(env, 'config', { chave: `eq.${CHAVE_SYNC}` });
  const desde = !tudo && c && c.valor && c.valor.em ? new Date(Date.parse(c.valor.em) - DIA).toISOString() : null;
  const agora = new Date().toISOString();
  const importados = await db.rpc(env, 'followup_importar', { p_desde: desde });
  const compras = await db.rpc(env, 'followup_compras');
  await db.insert(env, 'config', { chave: CHAVE_SYNC, valor: { em: agora, importados, compras } }, { upsert: true, conflito: 'chave', select: 'chave' });
  return { ok: true, importados: Number(importados) || 0, compras: Number(compras) || 0, desde };
}
