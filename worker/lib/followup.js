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

// ---------------------------------------------------------------- os tetos (a conta não pode ser banida)
// Até 10/11/2026 os tetos do follow-up só existiam no texto da tarefa do direct: se ela errasse a conta, nada segurava.
// Agora a conta é do sistema. "Puxada" é a mensagem nossa para quem não escreveu por último (o toque do vendedor);
// responder quem escreveu não gasta o teto do dia, mas conta nas pessoas da rodada.
// - dia: mensagens puxadas por dia (o dia de Brasília);
// - rodada: pessoas que recebem mensagem nossa dentro da janela (uma rodada da tarefa);
// - sem_resposta: mensagens nossas seguidas sem resposta dela; na última, a pessoa vai para "Não quer".
// O dono muda em config.followup_tetos; sem a chave, vale o padrão. A conta do dia fica em config.followup_toques.
const TETOS_PADRAO = { dia: 40, rodada: 10, janela_min: 45, sem_resposta: 3 };
const CHAVE_TETOS = 'followup_tetos';
const CHAVE_TOQUES = 'followup_toques';
const BRASILIA = 3 * 3600_000;
const diaDeBrasilia = (ms) => new Date(ms - BRASILIA).toISOString().slice(0, 10);
const inteiroEntre = (v, min, max, padrao) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= min && n <= max ? n : padrao; };

export async function tetosFollowup(env, agora = Date.now()) {
  const linhas = await db.select(env, 'config', { filtros: { chave: `in.(${CHAVE_TETOS},${CHAVE_TOQUES})` }, select: 'chave,valor' }).catch(() => []);
  const de = (chave) => ((linhas.find((l) => l.chave === chave) || {}).valor) || {};
  const c = de(CHAVE_TETOS);
  const cfg = {
    dia: inteiroEntre(c.dia, 1, 200, TETOS_PADRAO.dia), rodada: inteiroEntre(c.rodada, 1, 50, TETOS_PADRAO.rodada),
    janela_min: inteiroEntre(c.janela_min, 10, 240, TETOS_PADRAO.janela_min), sem_resposta: inteiroEntre(c.sem_resposta, 1, 10, TETOS_PADRAO.sem_resposta),
  };
  const t = de(CHAVE_TOQUES);
  const hoje = diaDeBrasilia(agora);
  const puxadas = t.dia === hoje ? Math.max(0, Number(t.puxadas) || 0) : 0;
  const horas = (Array.isArray(t.horas) ? t.horas : []).filter((h) => agora - Date.parse(h) < cfg.janela_min * 60_000);
  return {
    dia: { usado: puxadas, teto: cfg.dia, sobra: Math.max(0, cfg.dia - puxadas) },
    rodada: { usado: horas.length, teto: cfg.rodada, sobra: Math.max(0, cfg.rodada - horas.length), janela_min: cfg.janela_min },
    sem_resposta: cfg.sem_resposta, hoje, horas,
  };
}
// Soma um toque de vendedor na conta do dia e da rodada. Nunca derruba quem chamou: a mensagem já saiu.
async function contarToque(env, puxada, agora = Date.now(), lidos = null) {
  try {
    const t = lidos || await tetosFollowup(env, agora);
    await db.insert(env, 'config', {
      chave: CHAVE_TOQUES, atualizado_em: new Date(agora).toISOString(),
      valor: { dia: t.hoje, puxadas: t.dia.usado + (puxada ? 1 : 0), horas: [...t.horas, new Date(agora).toISOString()].slice(-60) },
    }, { upsert: true, conflito: 'chave', select: 'chave' });
  } catch (e) { console.error('followup tetos', e && e.message); }
}

// Mensagens nossas seguidas, de vendedor, depois da última fala dela (as do Atendente não contam: ele só responde).
function semRespostaDe(historico) {
  let n = 0;
  const h = Array.isArray(historico) ? historico : [];
  for (let i = h.length - 1; i >= 0; i--) {
    if (h[i].tipo === 'pessoa') break;
    if (h[i].tipo === 'nos' && h[i].quem !== 'Atendente') n++;
  }
  return n;
}
// Ela falou por último? (então a nossa próxima mensagem é resposta, não puxada)
const elaFalouPorUltimo = (l) => !!l.ultima_em && (!l.nosso_em || Date.parse(l.ultima_em) > Date.parse(l.nosso_em));

// Pode mandar mensagem para esta pessoa agora? É a regra única: a lista, a ficha e o envio pelo sistema usam a mesma.
// l: a linha da pessoa (com fase, ultima_em, nosso_em, historico). pausa: de pausasDe. Devolve { pode_tocar, toque,
// nao_tocar_motivo }. toque: "resposta" (ela escreveu por último) ou "puxada".
export function podeTocar(l, tetos, pausa = null, agora = Date.now()) {
  const nao = (motivo, toque) => ({ pode_tocar: false, toque, nao_tocar_motivo: motivo });
  const resposta = elaFalouPorUltimo(l);
  const toque = resposta ? 'resposta' : 'puxada';
  if (pausa && pausa.pausa) return nao(pausa.pausa_motivo, toque);
  if (l.fase === 'nao_quer') return nao('Está em "Não quer": não mande nada.', toque);
  if (l.fase === 'duvida') return nao('A dúvida dela está com o dono: espere a resposta dele.', toque);
  if (l.fase === 'nao_sei') return nao('Está em "Não sei o que fazer": o dono decide.', toque);
  if (l.fase === 'comprou' && !resposta) return nao('Já comprou: só responda se ela escrever.', toque);
  if (!tetos) return { pode_tocar: true, toque, nao_tocar_motivo: null };
  if (tetos.rodada.sobra <= 0) return nao(`Teto de ${tetos.rodada.teto} pessoas por rodada: espere a próxima rodada.`, toque);
  if (resposta) return { pode_tocar: true, toque, nao_tocar_motivo: null };
  if (semRespostaDe(l.historico) >= tetos.sem_resposta) return nao(`Já foram ${tetos.sem_resposta} mensagens nossas sem resposta: não insista.`, toque);
  if (l.nosso_em && diaDeBrasilia(Date.parse(l.nosso_em)) === diaDeBrasilia(agora)) return nao('Já recebeu mensagem nossa hoje.', toque);
  if (tetos.dia.sobra <= 0) return nao(`Teto de ${tetos.dia.teto} mensagens puxadas por dia: acabou por hoje.`, toque);
  return { pode_tocar: true, toque, nao_tocar_motivo: null };
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
// pausa: quem a rodada do direct não deve tocar agora, com o motivo. "atendente": a mensagem dela está na fila do
// Atendente (ele responde no próximo minuto) ou a resposta que ele preparou espera o ok do dono (modo rascunho).
// "dono": ele conversou com a pessoa pelo aplicativo nas últimas 12 horas. conversaDeGente vem de fora (atendente.js),
// para este arquivo não depender do Atendente.
async function pausasDe(env, linhas, agora, conversaDeGente) {
  const mapa = new Map();
  if (!linhas.length) return mapa;
  const fila = await db.select(env, 'atendimentos', {
    filtros: { followup_id: `in.(${linhas.map((l) => l.id).join(',')})`, classe: 'in.(esperando,rascunho)', criado_em: `gte.${new Date(agora - DIA).toISOString()}` },
    select: 'followup_id,classe,criado_em', ordem: 'criado_em.desc', limite: 400,
  }).catch(() => []);
  for (const a of fila) {
    const l = linhas.find((x) => x.id === a.followup_id);
    if (!l || mapa.has(l.id)) continue;
    if (a.classe === 'esperando' && agora - Date.parse(a.criado_em) < 6 * 3600_000) mapa.set(l.id, { pausa: 'atendente', pausa_motivo: 'A mensagem dela está na fila do Atendente: ele responde no próximo minuto.' });
    else if (a.classe === 'rascunho' && (!l.nosso_em || Date.parse(a.criado_em) > Date.parse(l.nosso_em))) mapa.set(l.id, { pausa: 'atendente', pausa_motivo: 'A resposta que o Atendente preparou espera o ok do dono.' });
  }
  if (conversaDeGente) {
    const suspeitos = linhas.filter((l) => !mapa.has(l.id) && l.igsid && l.humano_em && agora - Date.parse(l.humano_em) < 12 * 3600_000).slice(0, 20);
    const gente = await Promise.all(suspeitos.map((l) => conversaDeGente(env, l, agora).catch(() => false)));
    suspeitos.forEach((l, k) => { if (gente[k]) mapa.set(l.id, { pausa: 'dono', pausa_motivo: 'Conversa pelo aplicativo nas últimas 12 horas: essa pessoa está sendo atendida à mão, e a rodada do direct não manda nada por cima.' }); });
  }
  return mapa;
}

export async function listaFollowup(env, { fase = 'novo', interesse = '', busca = '', perfil = 'br', limite = 50, agora = Date.now(), conversaDeGente = null } = {}) {
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
  const [r, ativos, placar, tetos] = await Promise.all([
    db.select(env, 'followups', { filtros, select: CAMPOS, ordem, limite: lim, contar: true }),
    vendedoresAtivos(env),
    db.rpc(env, 'followup_placar', { p_perfil: p }).catch(() => []),
    tetosFollowup(env, agora).catch(() => null),
  ]);
  const linhas = r.linhas || r;
  const pausas = await pausasDe(env, linhas, agora, conversaDeGente);
  const itens = await Promise.all(linhas.map(async (l) => ({
    ...l, quem: undefined, respondida_por: l.quem ? l.quem.nome : null,
    ...(pausas.get(l.id) || { pausa: null, pausa_motivo: null }),
    // A regra única de "pode mandar mensagem para esta pessoa agora?" (podeTocar): quem manda só obedece.
    ...podeTocar(l, tetos, pausas.get(l.id), agora),
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
    // Quanto ainda cabe hoje e nesta rodada (a conta é do sistema, não de quem manda).
    tetos: resumoDosTetos(tetos),
  };
}
const resumoDosTetos = (t) => (t ? { dia: t.dia, rodada: t.rodada, sem_resposta: t.sem_resposta } : null);

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
export async function lerFollowup(env, { id, usuario, perfil = 'br', conversaDeGente = null, agora = Date.now() }) {
  const filtros = id ? { id: `eq.${id}` } : { perfil: `eq.${PERFIS.includes(perfil) ? perfil : 'br'}`, usuario: `eq.${normalUsuario(usuario)}` };
  if (id && !UUID.test(String(id))) throw new Erro(404, 'Não encontrado.');
  const l = await db.um(env, 'followups', filtros, CAMPOS);
  if (!l) return null;
  const [ativos, tetos, pausas] = await Promise.all([vendedoresAtivos(env), tetosFollowup(env, agora).catch(() => null), pausasDe(env, [l], agora, conversaDeGente).catch(() => new Map())]);
  const vendedor = l.vendedor || vendedorDe(l.usuario, ativos);
  const pausa = pausas.get(l.id) || { pausa: null, pausa_motivo: null };
  return {
    ...l, quem: undefined, respondida_por: l.quem ? l.quem.nome : null, vendedor, vendedor_fixo: !!l.vendedor,
    pode_api: !!(l.igsid && l.ultima_em && agora - Date.parse(l.ultima_em) < 23.5 * 3600_000),
    ...pausa, ...podeTocar(l, tetos, pausa, agora), tetos: resumoDosTetos(tetos),
    ...links(l), ...(await comVenda(l, vendedor)),
  };
}

// ---------------------------------------------------------------- salvar
// Cria (pelo @) ou muda uma pessoa. Só os campos enviados mudam. mandei: a mensagem que acabou de sair (conta um toque e
// entra no histórico). evento: uma linha no histórico. duvida: a pergunta que só o dono responde (vai para a fase duvida).
// atendente: quem mandou foi o Atendente (resposta a quem escreveu). Não conta como toque de vendedor: não soma em
// "toques", não marca o primeiro toque e não fixa o vendedor da pessoa, para o placar dos vendedores medir só o que
// os vendedores fizeram.
export async function salvarFollowup(env, d = {}, { id, quem = null, quemNome = '', atendente = false } = {}) {
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
  let toqueDeVendedor = null; // { puxada, tetos }: preenchido quando um vendedor (não o Atendente) mandou mensagem
  if (d.mandei) {
    const t = texto(typeof d.mandei === 'string' ? d.mandei : atual.proxima_mensagem, 1000);
    if (!atendente) {
      const tetos = await tetosFollowup(env).catch(() => null);
      // Ela falou por último (contando o que veio neste mesmo pedido)? Então é resposta, não puxada.
      const puxada = !elaFalouPorUltimo({ ultima_em: m.ultima_em || atual.ultima_em, nosso_em: atual.nosso_em });
      toqueDeVendedor = { puxada, tetos };
      // A última mensagem sem resposta: a pessoa sai da fila sozinha, sem depender de quem manda lembrar da regra.
      const limite = tetos ? tetos.sem_resposta : TETOS_PADRAO.sem_resposta;
      if (puxada && d.fase === undefined && semRespostaDe([...(atual.historico || []), ...hist]) + 1 >= limite && ['novo', 'ofertado', 'conversando'].includes(atual.fase || 'novo')) {
        d.fase = 'nao_quer';
        d.proximo_em = null;
        hist.push({ em: agora, tipo: 'nota', texto: `${limite} mensagens nossas sem resposta: saiu da fila.` });
      }
    }
    m.nosso_em = agora;
    if (!atendente) m.toques = (atual.toques || 0) + 1;
    m.proxima_mensagem = d.proxima_mensagem !== undefined ? texto(d.proxima_mensagem, 1000) : null;
    if (d.proximo_em === undefined) m.proximo_em = new Date(Date.now() + DIA).toISOString();
    if (d.fase === undefined && (atual.fase === 'novo' || atual.novo)) d.fase = 'ofertado';
    // O primeiro toque fixa o vendedor da pessoa: o que veio no pedido (se for um dos ativos) ou o do sorteio pelo @.
    if (!atendente && !atual.tocado_em) m.tocado_em = agora;
    if (!atendente && !atual.vendedor) {
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
    return { ok: true, criado: true, ...nova, ...(await depoisDoToque(env, toqueDeVendedor)) };
  }
  await db.update(env, 'followups', { id: `eq.${atual.id}` }, m, 'id');
  return { ok: true, id: atual.id, usuario: atual.usuario, ...Object.fromEntries(Object.entries(m).filter(([k]) => k !== 'historico')), ...(await depoisDoToque(env, toqueDeVendedor)) };
}
// Depois de anotar um toque de vendedor: soma na conta e devolve quanto ainda cabe, com um aviso quando passou.
async function depoisDoToque(env, toque) {
  if (!toque) return {};
  await contarToque(env, toque.puxada, Date.now(), toque.tetos);
  const t = await tetosFollowup(env).catch(() => null);
  if (!t) return {};
  const passou = (toque.puxada && toque.tetos && toque.tetos.dia.sobra <= 0) || (toque.tetos && toque.tetos.rodada.sobra <= 0);
  return { tetos: resumoDosTetos(t), ...(passou ? { aviso: 'Esta mensagem passou do teto. Pare de mandar: confira "tetos" e só volte a mandar quando houver sobra.' } : {}) };
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
