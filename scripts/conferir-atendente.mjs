// Ensaio da confiabilidade do Atendente do direct e do Comenta X (10/11/2026).
// Banco, Meta, Claude e push são FALSOS, em memória: o script troca o fetch do Node por um de mentira e qualquer
// endereço que não seja um dos falsos dá erro. Não lê o .env.local, não toca no banco de verdade e não manda nada.
// O código testado é o de verdade (worker/lib/atendente.js, gatilhos.js, relogio.js, nucleo/db.js, o módulo do Instagram).
// Uso: node scripts/conferir-atendente.mjs
import { atender, conferir, configAtendente, registrarEnvios, responderPendentes, salvarConfigAtendente } from '../worker/lib/atendente.js';
import { aoDirect, enviarRespostas, esquecerAjustesComenta } from '../worker/lib/gatilhos.js';
import { rodarMinuto } from '../worker/lib/relogio.js';
import { rodarZelador } from '../worker/lib/agentes/zelador.js';
import { salvarNaColmeia } from '../worker/lib/acoes-colmeia.js';
import { chamadasFeitas, comContador, folgaDeChamadas } from '../worker/nucleo/db.js';
import { cifrar } from '../worker/nucleo/cripto.js';
import { plataforma } from '../worker/plataformas/index.js';

const MINUTO = 60_000;
const HORA = 3600_000;
const iso = (ms = Date.now()) => new Date(ms).toISOString();
const copia = (x) => JSON.parse(JSON.stringify(x));
const b64u = (u8) => Buffer.from(u8).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// ---------------------------------------------------------------- o placar do ensaio
let falhas = 0;
let feitos = 0;
const secao = (t) => console.log(`\n== ${t}`);
function ok(cond, texto, extra = '') {
  feitos++;
  if (!cond) falhas++;
  console.log(`  ${cond ? 'ok  ' : 'ERRO'} ${texto}${extra ? ` (${extra})` : ''}`);
}

// ---------------------------------------------------------------- o banco falso (o bastante do PostgREST)
let banco;
function novoBanco() {
  return { t: {}, seq: 1000, falhas: [], semTabela: new Set(), semFuncao: new Set(), custoHoje: 0 };
}
const tab = (n) => (banco.t[n] ||= []);
const PADROES = {
  atendimentos: () => ({ id: ++banco.seq, followup_id: null, perfil: 'br', classe: 'anotou', detalhe: null, custo_usd: 0, tokens_entrada: null, tokens_saida: null, colmeia: [], modelo: null, criado_em: iso() }),
  followups: () => ({ id: crypto.randomUUID(), perfil: 'br', nome: null, fase: 'novo', interesse: 'nao_sei', origem: 'direct', toques: 0, historico: [], palavras: [], igsid: null, humano_em: null, nosso_em: null, vendedor: null, tocado_em: null, respondeu_em: null, duvida: null, resposta: null, ultima_mensagem: null, ultima_em: null, proxima_mensagem: null, proximo_em: null, comprou_em: null, criado_em: iso() }),
  mensagens_nossas: () => ({ sistema: false, eco_em: null, criado_em: iso() }),
  respostas_gatilho: () => ({ id: ++banco.seq, status: 'pendente', origem: 'comentario', tentativas: 0, pego_em: null, enviado_em: null, igsid: null, variante: null, publico_ok: null, erro: null, nome: null, usuario: null, link_codigo: null, respondeu_em: null, criado_em: iso() }),
  colmeia: () => ({ id: crypto.randomUUID(), produto: 'geral', origem: 'dono', status: 'ativa', prova: null, criado_em: iso(), atualizado_em: iso() }),
};
const padrao = (tabela) => (PADROES[tabela] ? PADROES[tabela]() : { criado_em: iso() });

// Separa por vírgula no nível de cima, respeitando parênteses e aspas.
function separar(s) {
  const partes = [];
  let nivel = 0;
  let aspas = false;
  let atual = '';
  for (const ch of s) {
    if (ch === '"') aspas = !aspas;
    if (!aspas && ch === '(') nivel++;
    if (!aspas && ch === ')') nivel--;
    if (!aspas && nivel === 0 && ch === ',') { partes.push(atual); atual = ''; continue; }
    atual += ch;
  }
  if (atual) partes.push(atual);
  return partes;
}
const semAspas = (s) => String(s).replace(/^"|"$/g, '');
function comparar(a, b) {
  const da = typeof a === 'string' && /^\d{4}-\d\d-\d\d/.test(a) ? Date.parse(a) : Number(a);
  const dbb = /^\d{4}-\d\d-\d\d/.test(b) ? Date.parse(b) : Number(b);
  return [da, dbb];
}
function condicao(linha, col, expr) {
  let nega = false;
  if (expr.startsWith('not.')) { nega = true; expr = expr.slice(4); }
  const i = expr.indexOf('.');
  const op = i < 0 ? expr : expr.slice(0, i);
  const v = i < 0 ? '' : expr.slice(i + 1);
  const val = linha[col];
  let r;
  if (op === 'eq') r = val !== null && val !== undefined && String(val) === semAspas(v);
  else if (op === 'neq') r = String(val) !== semAspas(v);
  else if (op === 'in') r = separar(v.slice(1, -1)).map(semAspas).includes(String(val));
  else if (['gte', 'gt', 'lte', 'lt'].includes(op)) {
    const [a, b] = comparar(val, semAspas(v));
    r = val !== null && val !== undefined && (op === 'gte' ? a >= b : op === 'gt' ? a > b : op === 'lte' ? a <= b : a < b);
  } else if (op === 'is') r = v === 'null' ? val === null || val === undefined : v === 'true' ? val === true : val === false;
  else if (op === 'like' || op === 'ilike') {
    const re = new RegExp(`^${semAspas(v).split('*').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`, op === 'ilike' ? 'i' : '');
    r = val !== null && val !== undefined && re.test(String(val));
  } else throw new Error(`banco falso: filtro desconhecido "${op}" em ${col}`);
  return nega ? !r : r;
}
function logica(linha, tipo, texto) {
  const rs = separar(texto.slice(1, -1)).map((it) => {
    const m = it.match(/^(and|or)(\(.*\))$/s);
    if (m) return logica(linha, m[1], m[2]);
    const i = it.indexOf('.');
    return condicao(linha, it.slice(0, i), it.slice(i + 1));
  });
  return tipo === 'or' ? rs.some(Boolean) : rs.every(Boolean);
}
const FORA_DO_FILTRO = new Set(['select', 'order', 'limit', 'offset', 'on_conflict']);
function filtrar(tabela, params) {
  let linhas = tab(tabela);
  for (const [k, v] of params) {
    if (FORA_DO_FILTRO.has(k)) continue;
    linhas = linhas.filter((l) => (k === 'or' || k === 'and' ? logica(l, k, v) : condicao(l, k, v)));
  }
  return linhas;
}
function ordenar(linhas, ordem) {
  if (!ordem) return linhas;
  const chaves = ordem.split(',').map((o) => { const [col, dir, nulos] = o.split('.'); return { col, desc: dir === 'desc', nulosPrimeiro: nulos === 'nullsfirst' }; });
  return [...linhas].sort((a, b) => {
    for (const c of chaves) {
      const x = a[c.col]; const y = b[c.col];
      if (x === y) continue;
      if (x === null || x === undefined) return c.nulosPrimeiro ? -1 : 1;
      if (y === null || y === undefined) return c.nulosPrimeiro ? 1 : -1;
      const r = x < y ? -1 : 1;
      return c.desc ? -r : r;
    }
    return 0;
  });
}

// As funções do banco que o código chama. pegar_respostas e marcar_resposta seguem a migration 41.
const FUNCOES = {
  atendente_fila({ p_espera = 20, p_limite = 2 }, usuarios) {
    const agora = Date.now();
    const grupos = new Map();
    for (const a of tab('atendimentos')) {
      if (a.classe !== 'esperando' || !a.followup_id || Date.parse(a.criado_em) < agora - 6 * HORA) continue;
      if (usuarios) { const f = tab('followups').find((x) => x.id === a.followup_id); if (!f || !usuarios.includes(f.usuario)) continue; }
      const g = grupos.get(a.followup_id) || { followup_id: a.followup_id, desde: a.criado_em, ate: a.criado_em, n: 0 };
      if (a.criado_em < g.desde) g.desde = a.criado_em;
      if (a.criado_em > g.ate) g.ate = a.criado_em;
      g.n++;
      grupos.set(a.followup_id, g);
    }
    return [...grupos.values()].filter((g) => Date.parse(g.ate) <= agora - Math.max(5, p_espera) * 1000).sort((a, b) => (a.desde < b.desde ? -1 : 1)).slice(0, Math.max(1, Math.min(10, p_limite)));
  },
  atendente_fila_ensaio(a) { return FUNCOES.atendente_fila(a, a.p_usuarios || []); },
  escritorio_resumo() { return { custo_hoje: banco.custoHoje }; },
  numeros_variantes() { return {}; },
  colmeia_placar() { return {}; },
  soltar_pecas_presas() { return 0; },
  pegar_pecas_para_publicar() { return []; },
  pegar_respostas({ p_limite = 10 }) {
    const agora = Date.now();
    for (const r of tab('respostas_gatilho')) {
      if (r.status === 'enviando' && r.pego_em && Date.parse(r.pego_em) < agora - 15 * MINUTO) Object.assign(r, { status: 'falhou', pego_em: null, erro: 'O envio parou no meio e o direct pode ter saído. Confira no Instagram antes de mandar de novo.' });
    }
    const lote = tab('respostas_gatilho').filter((r) => r.status === 'pendente').sort((a, b) => (a.criado_em < b.criado_em ? -1 : 1)).slice(0, Math.max(1, Math.min(p_limite, 50)));
    for (const r of lote) Object.assign(r, { status: 'enviando', tentativas: r.tentativas + 1, pego_em: iso() });
    return lote.map(copia);
  },
  marcar_resposta({ p_id, p_status, p_erro = null, p_extra = {} }) {
    const r = tab('respostas_gatilho').find((x) => x.id === p_id);
    if (!r) return null;
    const antes = r.status;
    if (p_status === 'pendente' && r.tentativas >= 3) p_status = 'falhou';
    Object.assign(r, { status: p_status, erro: p_erro ? String(p_erro).slice(0, 300) : null, pego_em: null });
    if (['enviada', 'pergunta'].includes(p_status) && !r.enviado_em) r.enviado_em = iso();
    for (const k of ['variante', 'igsid', 'link_codigo', 'nome', 'usuario']) if (p_extra[k] !== undefined && p_extra[k] !== null) r[k] = String(p_extra[k]);
    if (typeof p_extra.publico_ok === 'boolean') r.publico_ok = p_extra.publico_ok;
    if (['enviada', 'pergunta'].includes(p_status) && !['enviada', 'pergunta', 'respondendo', 'link'].includes(antes)) { const g = tab('gatilhos').find((x) => x.id === r.gatilho_id); if (g) g.enviados = (g.enviados || 0) + 1; }
    const igsid = p_extra.igsid || r.igsid;
    if (p_extra.mid && igsid && /^[0-9]{5,30}$/.test(igsid)) {
      const ja = tab('mensagens_nossas').find((x) => x.mid === p_extra.mid);
      if (ja) ja.sistema = true; else tab('mensagens_nossas').push({ ...padrao('mensagens_nossas'), mid: p_extra.mid, igsid, sistema: true });
    }
    return null;
  },
};

function respostaJson(dados, status = 200) {
  return new Response(dados === undefined ? null : JSON.stringify(dados), { status, headers: { 'content-type': 'application/json' } });
}
function pedidoAoBanco(url, init) {
  const u = new URL(url);
  const metodo = (init.method || 'GET').toUpperCase();
  const caminho = u.pathname.replace('/rest/v1/', '');
  const corpo = init.body ? JSON.parse(init.body) : null;
  const prefer = String((init.headers && (init.headers.Prefer || init.headers.prefer)) || '');
  const falha = banco.falhas.find((f) => f.vezes > 0 && f.quando({ metodo, caminho, corpo, params: u.searchParams }));
  if (falha) { falha.vezes--; return respostaJson({ message: 'falha de teste no banco' }, 500); }
  if (caminho.startsWith('rpc/')) {
    const nome = caminho.slice(4);
    if (banco.semFuncao.has(nome) || !FUNCOES[nome]) return respostaJson({ code: 'PGRST202', message: `Could not find the function ${nome}` }, 404);
    return respostaJson(FUNCOES[nome](corpo || {}));
  }
  const tabela = caminho;
  if (banco.semTabela.has(tabela)) return respostaJson({ code: 'PGRST205', message: `Could not find the table ${tabela}` }, 404);
  const devolve = (linhas) => (prefer.includes('return=minimal') ? respostaJson(undefined, 204) : respostaJson(linhas.map(copia), metodo === 'POST' ? 201 : 200));
  if (metodo === 'GET') {
    let linhas = ordenar(filtrar(tabela, u.searchParams), u.searchParams.get('order'));
    const limite = Number(u.searchParams.get('limit'));
    if (limite) linhas = linhas.slice(0, limite);
    return respostaJson(linhas.map(copia));
  }
  if (metodo === 'POST') {
    const conflito = (u.searchParams.get('on_conflict') || '').split(',').filter(Boolean);
    const novas = [];
    for (const d of Array.isArray(corpo) ? corpo : [corpo]) {
      const ja = conflito.length ? tab(tabela).find((l) => conflito.every((c) => String(l[c]) === String(d[c]))) : null;
      if (ja && prefer.includes('ignore-duplicates')) continue;
      if (ja && prefer.includes('merge-duplicates')) { Object.assign(ja, d); novas.push(ja); continue; }
      if (ja) return respostaJson({ code: '23505', message: 'duplicate key', details: conflito.join(',') }, 409);
      const linha = { ...padrao(tabela), ...d };
      tab(tabela).push(linha);
      novas.push(linha);
    }
    return devolve(novas);
  }
  if (metodo === 'PATCH') {
    const linhas = filtrar(tabela, u.searchParams);
    for (const l of linhas) Object.assign(l, corpo);
    return devolve(linhas);
  }
  if (metodo === 'DELETE') {
    const fora = new Set(filtrar(tabela, u.searchParams));
    banco.t[tabela] = tab(tabela).filter((l) => !fora.has(l));
    return respostaJson(undefined, 204);
  }
  throw new Error(`banco falso: método ${metodo}`);
}

// ---------------------------------------------------------------- a Meta falsa (a API do Instagram)
let meta;
function novaMeta() {
  return { enviadas: [], conversas: {}, respostasPublicas: [], n: 0, falhas: [], perfis: {} };
}
const NOSSO_ID = '17840000000000001';
function pedidoAMeta(url, init) {
  const u = new URL(url);
  const metodo = (init.method || 'GET').toUpperCase();
  const corpo = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : null;
  const falha = meta.falhas.find((f) => f.vezes > 0 && f.quando({ metodo, caminho: u.pathname, corpo }));
  if (falha) { falha.vezes--; return respostaJson({ error: { message: falha.mensagem || 'falha de teste na Meta', code: falha.codigo || 1 } }, falha.status || 400); }
  if (u.pathname === '/me/conversations') {
    const com = u.searchParams.get('user_id');
    const lista = (meta.conversas[com] || []).map((m) => ({ message: m.texto, from: { id: m.de === 'pessoa' ? com : NOSSO_ID }, created_time: m.em }));
    return respostaJson({ data: [{ messages: { data: lista } }] });
  }
  if (metodo === 'POST' && u.pathname.endsWith('/messages')) {
    const mid = `mid.falso.${++meta.n}`;
    const para = corpo.recipient.id || `9${String(corpo.recipient.comment_id).replace(/\D/g, '').padStart(9, '0')}`;
    meta.enviadas.push({ para, comentario: corpo.recipient.comment_id || null, texto: corpo.message.text || (corpo.message.attachment && corpo.message.attachment.payload.text) || '', mid, em: iso() });
    if (corpo.recipient.id && corpo.message.text) (meta.conversas[para] ||= []).push({ de: 'nos', texto: corpo.message.text, em: iso() });
    return respostaJson({ recipient_id: para, message_id: mid });
  }
  if (metodo === 'POST' && u.pathname.endsWith('/replies')) { meta.respostasPublicas.push(u.pathname); return respostaJson({ id: `r${++meta.n}` }); }
  if (u.pathname.endsWith('/comments')) return respostaJson({ data: [] });
  const id = u.pathname.slice(1);
  if (meta.perfis[id]) return respostaJson(meta.perfis[id]);
  return respostaJson({ error: { message: 'endereço que a Meta falsa não conhece', code: 100 } }, 400);
}

// ---------------------------------------------------------------- o Claude falso
let claude;
const RESPOSTA_BOA = { classe: 'responder', mensagens: ['Tá R$ 39,90', 'https://agenciasetup.com.br/cursos/posts-automaticos'], interesse: 'posts', espera: false, motivo: 'Pediu o preço do mini curso.' };
function novoClaude() {
  return { fila: [], chamadas: [], padrao: RESPOSTA_BOA };
}
function pedidoAoClaude(url, init) {
  const corpo = JSON.parse(init.body);
  claude.chamadas.push({ modelo: corpo.model, comFerramenta: !!corpo.tools });
  const proxima = claude.fila.length ? claude.fila.shift() : null;
  if (proxima && proxima.erro) return new Response(JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'falha de teste no Claude' } }), { status: proxima.erro, headers: { 'content-type': 'application/json', 'x-should-retry': 'false' } });
  const base = { id: `msg_${claude.chamadas.length}`, type: 'message', role: 'assistant', model: corpo.model, stop_sequence: null, usage: { input_tokens: 900, output_tokens: 60 } };
  if (!corpo.tools) return respostaJson({ ...base, content: [{ type: 'text', text: 'Te mandei no direct, corre lá!' }], stop_reason: 'end_turn' });
  return respostaJson({ ...base, content: [{ type: 'tool_use', id: 'toolu_1', name: 'decidir_resposta', input: (proxima && proxima.decisao) || claude.padrao }], stop_reason: 'tool_use' });
}

// ---------------------------------------------------------------- o fetch de mentira
const rede = { total: 0, banco: 0, meta: 0, claude: 0, push: 0, cortarEm: null };
const zerarRede = () => Object.assign(rede, { total: 0, banco: 0, meta: 0, claude: 0, push: 0, cortarEm: null });
globalThis.fetch = async (url, init = {}) => {
  const endereco = String(url);
  // Para imitar a execução que estoura o limite do plano grátis: daqui para a frente toda chamada falha.
  if (rede.cortarEm !== null && rede.total >= rede.cortarEm) throw new Error('Too many subrequests (ensaio)');
  rede.total++;
  if (endereco.startsWith('https://banco.falso/rest/v1/')) { rede.banco++; return pedidoAoBanco(endereco, init); }
  if (endereco.startsWith('https://graph.instagram.com/')) { rede.meta++; return pedidoAMeta(endereco, init); }
  if (endereco.startsWith('https://api.anthropic.com/')) { rede.claude++; return pedidoAoClaude(endereco, init); }
  if (endereco.startsWith('https://web.push.apple.com/')) { rede.push++; return new Response('', { status: 201 }); }
  throw new Error(`o ensaio não fala com a rede de verdade: ${endereco.slice(0, 80)}`);
};

// ---------------------------------------------------------------- o cenário
const ENV = {
  SUPABASE_URL: 'https://banco.falso', SUPABASE_SECRET_KEY: 'sb_chave_falsa', AMBIENTE: 'local', ANTHROPIC_CHAVE: 'chave-falsa',
  SITE_URL: 'https://agenciasetup.com.br', CRIPTO_CHAVE: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64'),
};
const ig = plataforma('instagram');
const CREDENCIAIS = { token: 'token-falso', usuario: NOSSO_ID };
let conexao;
const contaDe = async () => (conexao.status === 'ativa' ? { c: { conexao, m: ig }, credenciais: CREDENCIAIS } : null);
const DONO = '11111111-1111-4111-8111-111111111111';

async function novoCenario({ modo = 'automatico', comAparelho = true } = {}) {
  banco = novoBanco();
  meta = novaMeta();
  claude = novoClaude();
  zerarRede();
  esquecerAjustesComenta();
  tab('config').push({ chave: 'atendente', valor: { ligado: true, modo, modelo: 'misto' } });
  tab('ofertas').push({ slug: 'posts-automaticos', preco_centavos: 3990, ativa: true }, { slug: 'combo-black-calango', preco_centavos: 9700, ativa: true });
  tab('colmeia').push(
    { ...padrao('colmeia'), tipo: 'regra', titulo: 'Quando ofertar', texto: 'Oferte só quando a pessoa pedir preço ou disser que quer.', origem: 'semente' },
    { ...padrao('colmeia'), tipo: 'resposta', produto: 'posts', titulo: 'Quanto custa o mini curso de posts', texto: 'Tá e o preço de hoje, e o link numa mensagem só dele.', origem: 'semente' },
  );
  conexao = { id: crypto.randomUUID(), plataforma: 'instagram', perfil: 'br', status: 'ativa', conta_id: NOSSO_ID, conta_nome: '@agenciasetup', escopos: ['instagram_business_basic', 'instagram_business_manage_comments', 'instagram_business_manage_messages'], credenciais: await cifrar(ENV, CREDENCIAIS), expira_em: iso(Date.now() + 60 * 24 * HORA), criado_em: iso(Date.now() - 30 * 24 * HORA) };
  tab('conexoes').push(conexao);
  tab('equipe').push({ id: DONO, nome: 'Filipe', papel: 'administrador', ativo: true });
  if (comAparelho) {
    // Um celular de mentira que recebe os avisos (a chave é gerada aqui, só para a cifra do push funcionar).
    const par = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const publica = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));
    tab('config').push({ chave: 'push_inscricoes', valor: { lista: [{ id: 'a1', equipe_id: DONO, endpoint: 'https://web.push.apple.com/falso', p256dh: b64u(publica), auth: b64u(crypto.getRandomValues(new Uint8Array(16))), eventos: ['direct', 'escritorio'] }] } });
  }
}

let nMid = 0;
// A pessoa escreve: entra pelo mesmo caminho do aviso da Meta (atender) e a linha é empurrada 30 segundos para trás,
// como se ela tivesse parado de escrever (o Atendente espera 20 segundos).
async function escreve(usuario, igsid, texto, { haSegundos = 30 } = {}) {
  const mid = `mid.pessoa.${++nMid}`;
  (meta.conversas[igsid] ||= []).push({ de: 'pessoa', texto, em: iso() });
  const r = await atender(ENV, { conta: { conexao, m: ig }, igsid, mid, texto, perfilDaPessoa: { usuario, nome: usuario } });
  const linha = tab('atendimentos').find((a) => a.mid === mid);
  linha.criado_em = iso(Date.now() - haSegundos * 1000);
  return { r, linha };
}
const ficha = (usuario) => tab('followups').find((f) => f.usuario === usuario);
const linhasDe = (usuario) => tab('atendimentos').filter((a) => a.followup_id === ficha(usuario).id).sort((a, b) => a.id - b.id);
const ultimaDe = (usuario) => linhasDe(usuario).at(-1);
const enviadasPara = (igsid) => meta.enviadas.filter((m) => m.para === igsid);
const rodar = (env = ENV, limite = 2) => responderPendentes(env, { limite, contaDe });
// O eco de uma mensagem nossa, como a Meta manda no aviso.
const eco = (igsid, mid, texto = 'oi') => aoDirect(ENV, 'instagram', { sender: { id: NOSSO_ID }, recipient: { id: igsid }, message: { is_echo: true, mid, text: texto } }, { conexao, m: ig });

// ================================================================ os ensaios
try {
  // ---------------------------------------------------------------- item 6: a conferência do que sai
  secao('6. A conferência do que sai (conferir)');
  const p = { posts: '39,90', combo: '97' };
  const LINK = 'https://agenciasetup.com.br/cursos/posts-automaticos';
  const barra = (msgs, precos = p, liberados = []) => conferir(msgs, precos, liberados, []);
  ok(!!barra(['Custa R$ 1.000']), 'barra "R$ 1.000"', barra(['Custa R$ 1.000']));
  ok(!!barra(['Fica 2.000,00 no pix']), 'barra "2.000,00"', barra(['Fica 2.000,00 no pix']));
  ok(!!barra(['Sai por 1,000.00']), 'barra "1,000.00"');
  ok(!!barra(['Entra em bit.ly/x']), 'barra "bit.ly/x"', barra(['Entra em bit.ly/x']));
  ok(!!barra(['Olha site.com/y']), 'barra "site.com/y"', barra(['Olha site.com/y']));
  ok(!!barra(['Compra em loja.com.br']), 'barra "loja.com.br"');
  ok(!!barra(['agenciasetup.com.br/cursos/posts-automaticos']), 'barra o link certo escrito sem "http"');
  ok(!!barra(['Tá 97'], { posts: '39,90', combo: '147' }), 'barra "97" quando o preço do combo mudou para 147');
  ok(!!barra(['Custa 20 dólares']), 'barra "20 dólares" quando o número não está liberado');
  ok(!barra(['Tá R$ 39,90']), 'deixa passar "Tá R$ 39,90"', barra(['Tá R$ 39,90']) || '');
  ok(!barra(['Tá R$ 39,90.']), 'deixa passar "Tá R$ 39,90." com ponto no fim');
  ok(!barra(['1 ano de acesso']), 'deixa passar "1 ano de acesso"');
  ok(!barra(['Custa 20 dólares'], p, ['20']), 'deixa passar "20 dólares" quando o dono liberou o 20');
  ok(!barra(['R$ 1.000 mesmo'], p, ['1000']), 'deixa passar "R$ 1.000" quando o dono liberou mil');
  ok(!barra([LINK]), 'deixa passar o link certo sozinho');
  ok(!barra(['Tá 97 com 1 ano de acesso']), 'deixa passar "97" enquanto é o preço do combo');
  ok(!barra(['Tá R$ 147'], { posts: '39,90', combo: '147' }), 'deixa passar o preço novo do combo');
  ok(!barra(['Fechou.Qualquer coisa me chama aqui!']), 'não confunde frase sem espaço depois do ponto com link');
  ok(!barra(['São 18 aulas e vc usa no Claude']), 'deixa passar "18 aulas"');
  ok(!barra(['Vc compra no site agenciasetup.com.br']), 'deixa passar o nome do nosso site, sem caminho, no meio da frase');
  ok(!barra(['Vc usa no claude.ai']), 'deixa passar "claude.ai" (sem caminho, não é final comum de link)');
  ok(!!barra(['Vê em instagram.com/agenciasetup']), 'barra "instagram.com/agenciasetup"');
  ok(!!barra(['Parcela em 10x de 9,90']), 'continua barrando valor que não é preço liberado ("9,90")');
  ok(!!barra(['Tem 50% de desconto']), 'continua barrando "50%"');
  ok(!!barra([`Acessa ai ${LINK}`]), 'continua barrando link no meio da frase');

  // ---------------------------------------------------------------- item 2: chamadas externas por conversa
  secao('2. Chamadas externas (o limite de 50 do plano grátis)');
  await novoCenario();
  await escreve('maria.teste', '100000001', 'quanto custa o curso de posts?');
  zerarRede();
  let r = await rodar(comContador(ENV));
  ok(r.feitos && r.feitos[0] === 'respondeu', 'conversa comum: respondeu', JSON.stringify(r.feitos));
  const comum = { ...rede };
  console.log(`       conversa comum (1 chamada à IA, 2 mensagens): ${comum.total} chamadas externas (banco ${comum.banco}, Meta ${comum.meta}, Claude ${comum.claude}); sem as 2 do começo do minuto (a fila e a configuração), a conversa gasta ${comum.total - 2}`);
  ok(comum.total <= 22, 'a conversa comum cabe no custo previsto (22)', `${comum.total}`);

  // A conversa mais cara do dia a dia: a IA barata passa para o dono, a cuidadosa responde com 3 mensagens, e houve eco
  // de gente antigo para conferir.
  await novoCenario();
  await escreve('joao.teste', '100000002', 'me explica como funciona o combo?');
  ficha('joao.teste').humano_em = iso(Date.now() - 11 * HORA);
  ficha('joao.teste').nosso_em = iso(Date.now() - 11 * HORA);
  claude.fila.push({ decisao: { classe: 'duvida', mensagens: [], interesse: 'combo', espera: true, motivo: 'Não sei.' } }, { decisao: { classe: 'responder', mensagens: ['São os cursos de design', 'Tá 97 com 1 ano de acesso', 'https://agenciasetup.com.br/cursos/combo-black-calango'], interesse: 'combo', espera: false, motivo: 'Explicou o combo.' } });
  zerarRede();
  const envCaro = comContador(ENV);
  r = await rodar(envCaro);
  ok(r.feitos[0] === 'respondeu' && enviadasPara('100000002').length === 3, 'conversa cara: segunda opinião e 3 mensagens', JSON.stringify(r.feitos));
  const cara = { ...rede };
  console.log(`       conversa cara (2 chamadas à IA, 3 mensagens, eco para conferir): ${cara.total} chamadas externas (banco ${cara.banco}, Meta ${cara.meta}, Claude ${cara.claude}); a conversa gasta ${cara.total - 2}`);
  ok(cara.total <= 24, 'a conversa cara cabe em 24 chamadas', `${cara.total}`);
  ok(chamadasFeitas(envCaro) >= cara.total, 'o contador não conta menos do que saiu de verdade', `contou ${chamadasFeitas(envCaro)}, saíram ${cara.total}`);

  // Com pouca folga a segunda conversa nem começa: fica esperando, inteira, para o próximo minuto.
  await novoCenario();
  await escreve('ana.teste', '100000003', 'quanto custa o curso de posts?', { haSegundos: 60 });
  await escreve('bia.teste', '100000004', 'quanto custa o curso de posts?', { haSegundos: 40 });
  const envCurto = comContador(ENV);
  envCurto.__chamadas.n = 10; // como se a execução já tivesse gasto 10 chamadas antes
  zerarRede();
  r = await rodar(envCurto);
  ok(r.feitos[0] === 'respondeu' && /sem folga/.test(r.feitos[1] || ''), 'com pouca folga, só a primeira conversa começa', JSON.stringify(r.feitos));
  ok(ultimaDe('bia.teste').classe === 'esperando' && enviadasPara('100000004').length === 0, 'a segunda continua "esperando", sem ser pega');
  r = await rodar(comContador(ENV));
  ok(ultimaDe('bia.teste').classe === 'respondeu', 'e é respondida no minuto seguinte', JSON.stringify(r.feitos));

  // O minuto inteiro, com tudo cheio: 2 conversas (uma com segunda opinião), 6 directs do Comenta X na fila e posts para ler.
  await novoCenario();
  const gid = crypto.randomUUID();
  tab('gatilhos').push({ id: gid, rede: 'instagram', perfil: 'br', palavra: 'POSTS', ativo: true, posts: ['p1'], modo: 'direto', estrategia: 'melhor', link: null, mensagem: null, respostas: [], responder_publico: true, resposta_ia: true, enviados: 0, variantes: [{ id: 'a', nome: 'A', dm: 'Toma o material {link}', pergunta: '', depois: '', lembrete: '', botao: '', publico: ['Mandei no direct!'], ativa: true }], recurso: { slug: 'material', titulo: 'Material', status: 'publicado', perfil: 'br' } });
  tab('posts_redes').push({ id: crypto.randomUUID(), rede: 'instagram', perfil: 'br', id_na_rede: 'p1', palavra_chave: 'POSTS', publicado_em: iso(Date.now() - 2 * HORA), comentarios_ate: null, comentarios_lidos_em: null });
  for (let i = 1; i <= 6; i++) tab('respostas_gatilho').push({ ...padrao('respostas_gatilho'), gatilho_id: gid, rede: 'instagram', comentario_id: `c${i}`, post_id: 'p1', usuario: `pessoa${i}`, pessoa_id: `70000000${i}`, texto: 'POSTS', comentado_em: iso(), criado_em: iso(Date.now() - (10 - i) * 1000) });
  await escreve('carla.teste', '100000005', 'me explica como funciona o combo?', { haSegundos: 60 });
  await escreve('duda.teste', '100000006', 'quanto custa o curso de posts?', { haSegundos: 40 });
  claude.fila.push({ decisao: { classe: 'duvida', mensagens: [], interesse: 'combo', espera: true, motivo: 'Não sei.' } }, { decisao: { classe: 'responder', mensagens: ['São os cursos de design', 'Tá 97 com 1 ano de acesso', 'https://agenciasetup.com.br/cursos/combo-black-calango'], interesse: 'combo', espera: false, motivo: 'Explicou.' } });
  zerarRede();
  // 14h31 de Brasília: minuto sem etapa de hora marcada.
  const agora = new Date();
  const quando = Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), 17, 31);
  const feito = await rodarMinuto(ENV, quando);
  console.log(`       minuto cheio: ${rede.total} chamadas externas de verdade (banco ${rede.banco}, Meta ${rede.meta}, Claude ${rede.claude}, push ${rede.push}); o contador marcou ${feito.chamadas}`);
  console.log(`       atendente: ${JSON.stringify(feito.atendente)}; comenta: ${JSON.stringify(feito.comenta)}`);
  ok(rede.total <= 50, 'o minuto cheio fica dentro das 50 chamadas', `${rede.total}`);
  ok(!Object.values(feito).some((v) => v && v.erro), 'nenhuma etapa deu erro', JSON.stringify(Object.fromEntries(Object.entries(feito).filter(([, v]) => v && v.erro))));
  ok(ultimaDe('carla.teste').classe === 'respondeu', 'a primeira conversa foi respondida');
  ok(['respondeu', 'esperando'].includes(ultimaDe('duda.teste').classe), 'a segunda foi respondida ou continua esperando (nunca pega e largada)', ultimaDe('duda.teste').classe);
  ok(!tab('respostas_gatilho').some((x) => x.status === 'enviando'), 'nenhum direct do Comenta X ficou preso em "enviando"', JSON.stringify(tab('respostas_gatilho').map((x) => x.status)));
  const cheio = rede.total;
  // Mais dois minutos: o que sobrou anda.
  zerarRede(); const f2 = await rodarMinuto(ENV, quando + MINUTO); const m2 = rede.total;
  zerarRede(); const f3 = await rodarMinuto(ENV, quando + 3 * MINUTO); const m3 = rede.total; // 14h34: outro minuto sem etapa de hora marcada
  console.log(`       minuto 2: ${JSON.stringify({ atendente: f2.atendente, comenta: f2.comenta })}`);
  console.log(`       minuto 3: ${JSON.stringify({ atendente: f3.atendente, comenta: f3.comenta })}`);
  ok(m2 <= 50 && m3 <= 50, 'os minutos seguintes também ficam dentro das 50', `${m2} e ${m3}`);
  ok(ultimaDe('duda.teste').classe === 'respondeu', 'a segunda conversa foi respondida até o minuto seguinte');
  console.log(`       depois de 3 minutos: ${tab('respostas_gatilho').filter((x) => x.status === 'enviada').length} de 6 directs do Comenta X enviados, ${tab('respostas_gatilho').filter((x) => x.status === 'pendente').length} na fila (minutos: ${cheio}, ${m2}, ${m3} chamadas)`);

  // ---------------------------------------------------------------- item 2b: o mesmo minuto no Workers pago
  // Desde 10/11/2026 o Worker roda com WORKERS_PAGO=1: o minuto faz mais por vez, e os tetos para as pessoas continuam.
  secao('2b. Workers pago (WORKERS_PAGO=1): mais por minuto, os mesmos tetos');
  const ENV_PAGO = { ...ENV, WORKERS_PAGO: '1' };
  await novoCenario();
  const gp = crypto.randomUUID();
  tab('gatilhos').push({ id: gp, rede: 'instagram', perfil: 'br', palavra: 'POSTS', ativo: true, posts: ['p1'], modo: 'direto', estrategia: 'melhor', link: null, mensagem: null, respostas: [], responder_publico: true, resposta_ia: true, enviados: 0, variantes: [{ id: 'a', nome: 'A', dm: 'Toma o material {link}', pergunta: '', depois: '', lembrete: '', botao: '', publico: ['Mandei no direct!'], ativa: true }], recurso: { slug: 'material', titulo: 'Material', status: 'publicado', perfil: 'br' } });
  tab('posts_redes').push({ id: crypto.randomUUID(), rede: 'instagram', perfil: 'br', id_na_rede: 'p1', palavra_chave: 'POSTS', publicado_em: iso(Date.now() - 2 * HORA), comentarios_ate: null, comentarios_lidos_em: null });
  for (let i = 1; i <= 15; i++) tab('respostas_gatilho').push({ ...padrao('respostas_gatilho'), gatilho_id: gp, rede: 'instagram', comentario_id: `pc${i}`, post_id: 'p1', usuario: `pessoa${i}`, pessoa_id: `7100000${String(i).padStart(2, '0')}`, texto: 'POSTS', comentado_em: iso(), criado_em: iso(Date.now() - (30 - i) * 1000) });
  const pagos = Array.from({ length: 8 }, (_, i) => `pago${i + 1}.teste`);
  for (const [i, u] of pagos.entries()) await escreve(u, `30000000${i + 1}`, 'quanto custa o curso de posts?', { haSegundos: 60 - i });
  const contarStatus = (s) => tab('respostas_gatilho').filter((x) => x.status === s).length;
  zerarRede();
  const fp = await rodarMinuto(ENV_PAGO, quando);
  console.log(`       minuto pago: ${rede.total} chamadas externas (banco ${rede.banco}, Meta ${rede.meta}, Claude ${rede.claude}); o contador marcou ${fp.chamadas}`);
  ok(!Object.values(fp).some((v) => v && v.erro), 'nenhuma etapa deu erro', JSON.stringify(Object.fromEntries(Object.entries(fp).filter(([, v]) => v && v.erro))));
  ok(pagos.filter((u) => ultimaDe(u).classe === 'respondeu').length === 6, 'o Atendente responde até 6 conversas no minuto (no grátis, 2)', pagos.map((u) => ultimaDe(u).classe).join(','));
  ok(pagos.filter((u) => ultimaDe(u).classe === 'esperando').length === 2, 'as outras 2 continuam esperando, sem ser pegas');
  ok(contarStatus('enviada') === 10 && contarStatus('pendente') === 5, 'o Comenta X manda até 10 directs por execução (no grátis, 5) e o resto espera na fila', tab('respostas_gatilho').map((x) => x.status).join(','));
  ok(contarStatus('enviando') === 0, 'nenhum direct ficou preso em "enviando"');
  ok(fp.chamadas <= 996 && rede.total <= 1000, 'o minuto fica dentro do teto de 1.000 chamadas', `${rede.total}`);
  // O teto por hora continua por cima: limite de 12 por hora, 10 já saíram, então só mais 2.
  tab('config').push({ chave: 'comenta', valor: { limite_hora: 12, testadores: [] } });
  esquecerAjustesComenta();
  zerarRede();
  const fp2 = await rodarMinuto(ENV_PAGO, quando + 3 * MINUTO);
  ok(contarStatus('enviada') === 12 && contarStatus('pendente') === 3, 'o teto por hora (config.comenta.limite_hora) continua valendo: só mais 2 saem', `${contarStatus('enviada')} enviadas, ${contarStatus('pendente')} na fila; ${JSON.stringify(fp2.comenta && fp2.comenta.enviar)}`);
  ok(pagos.every((u) => ultimaDe(u).classe === 'respondeu'), 'as 2 conversas que sobraram são respondidas no minuto seguinte', pagos.map((u) => ultimaDe(u).classe).join(','));
  esquecerAjustesComenta();

  // ---------------------------------------------------------------- item 9: achados da revisão do Escritório (10/11)
  secao('9. Revisão de 10/11: palavra com pergunta, toque do Atendente e dúvida com o dono');
  await novoCenario();
  tab('gatilhos').push({ id: crypto.randomUUID(), rede: 'instagram', perfil: 'br', palavra: 'POSTS', ativo: true, posts: [], modo: 'direto', estrategia: 'melhor', link: null, mensagem: null, respostas: [], responder_publico: true, resposta_ia: true, enviados: 0, variantes: [{ id: 'a', nome: 'A', dm: 'Toma o material {link}', pergunta: '', depois: '', lembrete: '', botao: '', publico: ['Mandei no direct!'], ativa: true }], recurso: { slug: 'material', titulo: 'Material', status: 'publicado', perfil: 'br' } });
  meta.perfis['400000001'] = { username: 'nove.um', name: 'Nove Um' };
  meta.perfis['400000002'] = { username: 'nove.dois', name: 'Nove Dois' };
  const direto = (igsid, mid, text) => aoDirect(ENV, 'instagram', { sender: { id: igsid }, recipient: { id: NOSSO_ID }, message: { mid, text } }, { conexao, m: ig });
  const naFilaDoAtendente = (mid) => tab('atendimentos').some((x) => x.mid === mid);
  let r9 = await direto('400000001', 'mid.nove.1', 'POSTS');
  ok(r9 === 'material' && !naFilaDoAtendente('mid.nove.1'), 'só a palavra no direct: vai o material e o Atendente não é chamado', r9);
  r9 = await direto('400000002', 'mid.nove.2', 'quanto custa o POSTS?');
  ok(/^material e /.test(r9) && naFilaDoAtendente('mid.nove.2') && enviadasPara('400000002').length === 1, 'a palavra dentro de uma pergunta: vai o material e a pergunta segue para o Atendente', r9);
  r9 = await direto('400000002', 'mid.nove.3', 'e o posts parcela?');
  ok(/^repetido e /.test(r9) && naFilaDoAtendente('mid.nove.3') && enviadasPara('400000002').length === 1, 'material já mandado nas últimas 24 horas: a pergunta nova não é jogada fora, e o material não sai de novo', r9);
  r9 = await direto('400000001', 'mid.nove.4', 'posts');
  ok(r9 === 'repetido' && !naFilaDoAtendente('mid.nove.4'), 'a palavra sozinha repetida continua sendo ignorada', r9);

  await novoCenario();
  await escreve('toque.teste', '400000009', 'quanto custa o curso de posts?');
  await rodar();
  const ft = ficha('toque.teste');
  ok(ultimaDe('toque.teste').classe === 'respondeu' && !ft.vendedor && !ft.tocado_em && !(ft.toques > 0) && !!ft.nosso_em, 'a resposta do Atendente não conta como toque de vendedor nem fixa o vendedor da pessoa', JSON.stringify({ vendedor: ft.vendedor || null, tocado_em: ft.tocado_em || null, toques: ft.toques || 0 }));
  Object.assign(ft, { fase: 'duvida', duvida: 'Parcela em quantas vezes?' });
  await escreve('toque.teste', '400000009', 'e ai, conseguiu ver?');
  zerarRede();
  let r9b = await rodar();
  ok(/dúvida com o dono/.test(r9b.feitos[0]) && rede.push === 1, 'quem espera a resposta do dono escreve de novo: ele é lembrado no celular', `${r9b.feitos[0]}, avisos ${rede.push}`);
  await escreve('toque.teste', '400000009', 'oi?');
  zerarRede();
  r9b = await rodar();
  ok(/dúvida com o dono/.test(r9b.feitos[0]) && rede.push === 0, 'o lembrete sai uma vez por dia por conversa', `avisos ${rede.push}`);

  // ---------------------------------------------------------------- item 3: erro no meio não deixa órfã
  secao('3. Erro no meio de responder');
  await novoCenario();
  await escreve('erro.ia', '100000010', 'quanto custa o curso de posts?');
  claude.fila.push({ erro: 500 }, { erro: 500 });
  r = await rodar();
  ok(/volta para a fila/.test(r.feitos[0]), 'a IA caiu: a conversa volta para a fila', JSON.stringify(r.feitos));
  ok(ultimaDe('erro.ia').classe === 'esperando' && /^Tentativa 1 falhou/.test(ultimaDe('erro.ia').detalhe || ''), 'a mensagem voltou para "esperando", com o motivo', ultimaDe('erro.ia').detalhe);
  ok(enviadasPara('100000010').length === 0, 'nada foi enviado');
  r = await rodar();
  ok(r.feitos[0] === 'respondeu' && enviadasPara('100000010').length === 2, 'no minuto seguinte a pessoa é respondida', JSON.stringify(r.feitos));

  await novoCenario();
  await escreve('erro.dois', '100000011', 'quanto custa o curso de posts?');
  claude.fila.push({ erro: 500 }, { erro: 500 }, { erro: 500 }, { erro: 500 });
  await rodar();
  r = await rodar();
  ok(/2 tentativas/.test(r.feitos[0]) && ultimaDe('erro.dois').classe === 'erro' && /Falhou 2 vezes/.test(ultimaDe('erro.dois').detalhe), 'falhou de novo: fecha como erro, com o motivo', ultimaDe('erro.dois').detalhe);
  r = await rodar();
  ok(r.fila === 0, 'e não tenta uma terceira vez', JSON.stringify(r));

  await novoCenario();
  await escreve('erro.banco', '100000012', 'quanto custa o curso de posts?');
  // O banco recusa a gravação da ficha (a que anota a resposta antes de mandar).
  banco.falhas.push({ vezes: 1, quando: (q) => q.metodo === 'PATCH' && q.caminho === 'followups' && q.corpo && q.corpo.nosso_em });
  r = await rodar();
  ok(/volta para a fila/.test(r.feitos[0]) && ultimaDe('erro.banco').classe === 'esperando' && enviadasPara('100000012').length === 0, 'o banco falhou antes do envio: volta para a fila, nada saiu', JSON.stringify(r.feitos));
  r = await rodar();
  ok(r.feitos[0] === 'respondeu', 'e o minuto seguinte responde', JSON.stringify(r.feitos));

  await novoCenario();
  await escreve('erro.envio', '100000013', 'quanto custa o curso de posts?');
  let nEnvio = 0;
  meta.falhas.push({ vezes: 1, status: 500, quando: (q) => q.metodo === 'POST' && q.caminho.endsWith('/messages') && ++nEnvio === 2 });
  r = await rodar();
  ok(r.feitos[0] === 'erro ao mandar' && ultimaDe('erro.envio').classe === 'erro' && /Saíram 1 de 2/.test(ultimaDe('erro.envio').detalhe), 'a Meta falhou na segunda mensagem: fecha como erro, sem voltar para a fila', ultimaDe('erro.envio').detalhe);
  ok(enviadasPara('100000013').length === 1 && !!ficha('erro.envio').proxima_mensagem, 'saiu uma mensagem só, e o texto ficou guardado para o dono conferir');
  r = await rodar();
  ok(r.fila === 0 && enviadasPara('100000013').length === 1, 'não manda de novo sozinho');

  // A execução cortada no meio (o limite de chamadas estourou): nem o conserto consegue gravar. O Zelador enxerga.
  await novoCenario();
  await escreve('cortada', '100000014', 'quanto custa o curso de posts?');
  zerarRede();
  rede.cortarEm = 4; // a fila, a configuração, o "pegar" e a ficha passam; daí para a frente tudo falha
  r = await rodar();
  rede.cortarEm = null;
  ok(ultimaDe('cortada').classe === 'anotou' && !ultimaDe('cortada').detalhe, 'execução cortada: a linha fica "anotou" sem motivo', `${ultimaDe('cortada').classe} / ${ultimaDe('cortada').detalhe}`);
  ultimaDe('cortada').criado_em = iso(Date.now() - 20 * MINUTO);
  tab('config').push({ chave: 'zelador_estado', valor: { orfas_desde: iso(Date.now() - 2 * HORA) } });
  let z = await rodarZelador(ENV, Date.now(), { simular: true });
  ok(z.alertas.some((a) => a.tipo === 'sem-resposta'), 'o Zelador avisa a conversa que ficou no meio do caminho', JSON.stringify(z.alertas.filter((a) => a.tipo === 'sem-resposta').map((a) => a.titulo)));
  // Quem só é anotado de propósito leva o motivo e não vira alerta.
  await novoCenario();
  tab('config').find((c) => c.chave === 'atendente').valor.ligado = false;
  await escreve('desligado', '100000015', 'oi, tudo bem?');
  ok(ultimaDe('desligado').classe === 'anotou' && /desligado/.test(ultimaDe('desligado').detalhe || ''), 'Atendente desligado: anotado com o motivo', ultimaDe('desligado').detalhe);
  ultimaDe('desligado').criado_em = iso(Date.now() - 20 * MINUTO);
  tab('config').push({ chave: 'zelador_estado', valor: { orfas_desde: iso(Date.now() - 2 * HORA) } });
  z = await rodarZelador(ENV, Date.now(), { simular: true });
  ok(!z.alertas.some((a) => a.tipo === 'sem-resposta'), 'anotado de propósito não vira alerta no Zelador');

  // ---------------------------------------------------------------- itens 4 e 5: o eco pelo id e o aviso do silêncio
  secao('4 e 5. O eco pelo id, a conversa de gente e o aviso ao dono');
  await novoCenario();
  await escreve('lucia.teste', '100000020', 'quanto custa o curso de posts?');
  await rodar();
  const mandadas = enviadasPara('100000020');
  ok(tab('mensagens_nossas').filter((m) => m.sistema).length === 2, 'os ids das 2 mensagens do sistema ficaram guardados');
  let rEco = await eco('100000020', mandadas[0].mid, mandadas[0].texto);
  await eco('100000020', mandadas[1].mid, mandadas[1].texto);
  ok(rEco === 'eco do sistema' && !ficha('lucia.teste').humano_em, 'eco com id conhecido: é do sistema, a conversa não fica marcada', rEco);
  await escreve('lucia.teste', '100000020', 'e parcela?');
  claude.padrao = { classe: 'responder', mensagens: ['Pix ou cartão, direto na página'], interesse: 'posts', espera: false, motivo: 'Como paga.' };
  r = await rodar();
  ok(r.feitos[0] === 'respondeu', 'eco com id conhecido não cala o Atendente', JSON.stringify(r.feitos));
  for (const m of enviadasPara('100000020').slice(2)) await eco('100000020', m.mid, m.texto);

  // O dono escreve à mão 2 minutos depois de um envio do sistema (antes isso passava por envio do sistema).
  const pushAntes = rede.push;
  rEco = await eco('100000020', 'mid.do.aplicativo.1', 'Opa, aqui é o Filipe, deixa que eu te ajudo');
  ok(rEco === 'eco de gente' && !!ficha('lucia.teste').humano_em, 'eco com id desconhecido: marca a conversa como de gente', rEco);
  ok(Math.abs(Date.parse(ficha('lucia.teste').nosso_em) - Date.now()) < 10 * MINUTO, '(o envio do sistema foi há menos de 10 minutos: pela hora, o Atendente falaria por cima)');
  const antesDeCalar = enviadasPara('100000020').length;
  await escreve('lucia.teste', '100000020', 'ah que bom, me ajuda sim');
  r = await rodar();
  ok(r.feitos[0] === 'anotou (conversa de gente)' && enviadasPara('100000020').length === antesDeCalar, 'eco desconhecido cala o Atendente', JSON.stringify(r.feitos));
  ok(rede.push === pushAntes + 1, 'o dono recebe um aviso no celular de que a pessoa escreveu', `${rede.push - pushAntes} aviso(s)`);
  ok(/avisou você/.test(ultimaDe('lucia.teste').detalhe || ''), 'a mensagem fica anotada com o motivo', ultimaDe('lucia.teste').detalhe);
  await escreve('lucia.teste', '100000020', 'oi? tem alguém ai?');
  r = await rodar();
  ok(r.feitos[0] === 'anotou (conversa de gente)' && rede.push === pushAntes + 1, 'na segunda mensagem do dia o aviso não se repete', `${rede.push - pushAntes} aviso(s)`);

  // O eco que chega antes de o id ser guardado (a Meta avisa em menos de um segundo).
  await novoCenario();
  await escreve('rapido.teste', '100000021', 'quanto custa o curso de posts?');
  await rodar();
  tab('mensagens_nossas').length = 0;
  ficha('rapido.teste').humano_em = null;
  const duas = enviadasPara('100000021');
  rEco = await eco('100000021', duas[0].mid, duas[0].texto);
  ok(rEco === 'eco de gente', 'eco que chega antes do registro do id parece de gente na hora', rEco);
  await registrarEnvios(ENV, '100000021', duas.map((m) => m.mid));
  await eco('100000021', duas[1].mid, duas[1].texto);
  await escreve('rapido.teste', '100000021', 'e parcela?');
  r = await rodar();
  ok(r.feitos[0] === 'respondeu', 'mas na hora de responder o id já está guardado: não cala', JSON.stringify(r.feitos));

  // A reserva: sem a tabela dos ids (migration ainda não aplicada), vale a hora, como antes.
  await novoCenario();
  banco.semTabela.add('mensagens_nossas');
  await escreve('reserva.teste', '100000022', 'quanto custa o curso de posts?');
  await rodar();
  rEco = await eco('100000022', 'mid.qualquer.1', 'Tá R$ 39,90');
  await escreve('reserva.teste', '100000022', 'e parcela?');
  r = await rodar();
  ok(r.feitos[0] === 'respondeu', 'sem a tabela: eco perto de um envio do sistema continua sendo do sistema', JSON.stringify(r.feitos));
  ficha('reserva.teste').nosso_em = iso(Date.now() - 3 * HORA);
  ficha('reserva.teste').historico = ficha('reserva.teste').historico.map((h) => (h.tipo === 'nos' ? { ...h, em: iso(Date.now() - 3 * HORA) } : h));
  await eco('100000022', 'mid.qualquer.2', 'Opa, aqui é o Filipe');
  await escreve('reserva.teste', '100000022', 'oi Filipe');
  r = await rodar();
  ok(r.feitos[0] === 'anotou (conversa de gente)', 'sem a tabela: eco longe de qualquer envio do sistema é de gente', JSON.stringify(r.feitos));

  // O follow-up mandado pelo Chrome (a tarefa do direct) não tem id: está anotado na ficha, e aí vale a hora.
  await novoCenario();
  await escreve('chrome.teste', '100000023', 'quanto custa o curso de posts?');
  await rodar();
  for (const m of enviadasPara('100000023')) await eco('100000023', m.mid, m.texto);
  // A resposta do Atendente foi há 3 minutos; agora a tarefa manda o toque pelo Chrome e anota na ficha logo depois.
  for (const l of tab('mensagens_nossas')) Object.assign(l, { criado_em: iso(Date.now() - 3 * MINUTO), eco_em: iso(Date.now() - 3 * MINUTO) });
  ficha('chrome.teste').historico = ficha('chrome.teste').historico.map((h) => (h.tipo === 'nos' ? { ...h, em: iso(Date.now() - 3 * MINUTO) } : h));
  await eco('100000023', 'mid.do.chrome.1', 'E ai, conseguiu ver?');
  ficha('chrome.teste').historico.push({ em: iso(Date.now() + 20_000), tipo: 'nos', texto: 'E ai, conseguiu ver?', quem: 'Claude' });
  ficha('chrome.teste').nosso_em = iso(Date.now() + 20_000);
  await escreve('chrome.teste', '100000023', 'ainda não, e parcela?');
  r = await rodar();
  ok(r.feitos[0] === 'respondeu', 'toque da tarefa do direct (pelo Chrome, anotado na ficha) não cala o Atendente', JSON.stringify(r.feitos));

  // ---------------------------------------------------------------- o modo ensaio
  secao('Modo ensaio (contas de teste)');
  await novoCenario({ modo: 'ensaio' });
  let cfg = await configAtendente(ENV);
  ok(cfg.modo === 'ensaio' && cfg.contas_teste.length === 5 && cfg.contas_teste.includes('overitasdei'), 'as cinco contas de teste valem como padrão', cfg.contas_teste.join(', '));
  let c1 = await escreve('cliente.real', '100000030', 'quanto custa o curso de posts?', { haSegundos: 90 });
  ok(c1.r === 'na fila' && ultimaDe('cliente.real').classe === 'esperando', 'em ensaio, a mensagem de quem não é teste entra como "esperando"');
  await escreve('overitasdei', '100000031', 'quanto custa o curso de posts?', { haSegundos: 40 });
  r = await rodar();
  ok(enviadasPara('100000031').length === 2 && ultimaDe('overitasdei').classe === 'respondeu', 'a conta de teste é respondida', JSON.stringify(r.feitos));
  ok(enviadasPara('100000030').length === 0 && ultimaDe('cliente.real').classe === 'esperando' && !ultimaDe('cliente.real').detalhe, 'quem não é de teste não é pego nem respondido', ultimaDe('cliente.real').classe);

  // Muita gente que não é de teste esperando na frente: a conta de teste não fica travada.
  await novoCenario({ modo: 'ensaio' });
  for (let i = 1; i <= 12; i++) await escreve(`cliente${i}`, `1000001${String(i).padStart(2, '0')}`, 'quanto custa o curso de posts?', { haSegundos: 600 - i });
  await escreve('raquelandrademusic', '100000032', 'quanto custa o curso de posts?', { haSegundos: 40 });
  r = await rodar();
  ok(enviadasPara('100000032').length === 2 && meta.enviadas.length === 2, '12 conversas que não são de teste na frente: só a de teste é respondida', JSON.stringify(r.feitos));
  ok(tab('atendimentos').filter((a) => a.classe === 'esperando').length === 12, 'as 12 continuam esperando');
  // Sem a função nova do banco (migration não aplicada), o filtro do código ainda garante que ninguém de fora recebe.
  await novoCenario({ modo: 'ensaio' });
  banco.semFuncao.add('atendente_fila_ensaio');
  await escreve('cliente.a', '100000040', 'quanto custa o curso de posts?', { haSegundos: 90 });
  await escreve('_olhardefe', '100000041', 'quanto custa o curso de posts?', { haSegundos: 40 });
  r = await rodar();
  ok(enviadasPara('100000041').length === 2 && enviadasPara('100000040').length === 0, 'sem a função do banco: a de teste é respondida e a outra não', JSON.stringify(r.feitos));
  // O modo volta para automático: quem esperou é respondido.
  await salvarConfigAtendente(ENV, { modo: 'automatico' });
  r = await rodar();
  ok(enviadasPara('100000040').length === 2 && ultimaDe('cliente.a').classe === 'respondeu', 'quando o modo volta para automático, quem esperou é respondido', JSON.stringify(r.feitos));
  cfg = await configAtendente(ENV);
  ok(cfg.modo === 'automatico' && cfg.contas_teste.length === 5, 'a lista de contas continua guardada na configuração');
  // O Zelador não trata a espera do ensaio como fila parada.
  await novoCenario({ modo: 'ensaio' });
  c1 = await escreve('cliente.b', '100000042', 'oi, quero saber do curso', { haSegundos: 20 * 60 });
  z = await rodarZelador(ENV, Date.now(), { simular: true });
  ok(!z.alertas.some((a) => a.tipo === 'fila-parada'), 'em ensaio, o Zelador não dá alerta de fila parada');
  tab('config').find((c) => c.chave === 'atendente').valor.modo = 'automatico';
  z = await rodarZelador(ENV, Date.now(), { simular: true });
  ok(z.alertas.some((a) => a.tipo === 'fila-parada'), 'fora do ensaio, a mesma espera é alerta');

  // ---------------------------------------------------------------- item 1: o Comenta X não manda duas vezes
  secao('1. Comenta X: o material não sai duas vezes');
  const prepararComenta = async (quantos) => {
    await novoCenario();
    const g = crypto.randomUUID();
    tab('gatilhos').push({ id: g, rede: 'instagram', perfil: 'br', palavra: 'POSTS', ativo: true, posts: ['p1'], modo: 'direto', estrategia: 'melhor', link: null, mensagem: null, respostas: [], responder_publico: true, resposta_ia: true, enviados: 0, variantes: [{ id: 'a', nome: 'A', dm: 'Toma o material {link}', pergunta: '', depois: '', lembrete: '', botao: '', publico: ['Mandei no direct!'], ativa: true }], recurso: { slug: 'material', titulo: 'Material', status: 'publicado', perfil: 'br' } });
    for (let i = 1; i <= quantos; i++) tab('respostas_gatilho').push({ ...padrao('respostas_gatilho'), gatilho_id: g, rede: 'instagram', comentario_id: `c${i}`, post_id: 'p1', usuario: `pessoa${i}`, pessoa_id: `70000000${i}`, texto: 'POSTS', comentado_em: iso(), criado_em: iso(Date.now() - (10 - i) * 1000) });
  };
  const directsDe = (comentario) => meta.enviadas.filter((m) => m.comentario === comentario).length;
  const status = () => tab('respostas_gatilho').map((x) => x.status).join(',');

  // A execução é cortada logo depois do direct do primeiro item e do registro dele (na resposta pública).
  await prepararComenta(3);
  let viuDirect = false;
  let viuRegistro = false;
  const fetchDeMentira = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    if (viuDirect && viuRegistro) throw new Error('Too many subrequests (ensaio)');
    const resposta = await fetchDeMentira(url, init);
    if (String(url).endsWith('/rpc/marcar_resposta') && viuDirect) viuRegistro = true;
    if (String(url).includes('/messages')) viuDirect = true;
    return resposta;
  };
  await enviarRespostas(ENV).catch((e) => e);
  globalThis.fetch = fetchDeMentira;
  ok(tab('respostas_gatilho')[0].status === 'enviada' && directsDe('c1') === 1, 'cortada depois do direct: o item já está como "enviada" (antes ficava "enviando" e saía de novo)', status());
  for (const x of tab('respostas_gatilho')) if (x.pego_em) x.pego_em = iso(Date.now() - 16 * MINUTO);
  await enviarRespostas(ENV);
  ok(directsDe('c1') === 1, 'e 16 minutos depois o primeiro não recebe de novo', `${directsDe('c1')} direct(s)`);

  // A execução cai entre o direct e o registro: o item fica "enviando" e vai para conferência, sem reenviar.
  await prepararComenta(3);
  banco.falhas.push({ vezes: 1, quando: (q) => q.caminho === 'rpc/marcar_resposta' });
  await enviarRespostas(ENV).catch((e) => e);
  ok(tab('respostas_gatilho')[0].status === 'enviando' && directsDe('c1') === 1, 'caiu entre o direct e o registro: o item fica "enviando"', status());
  ok(tab('respostas_gatilho')[1].status === 'pendente' && tab('respostas_gatilho')[2].status === 'pendente', 'os que foram pegos e não tentados voltam para "pendente" na hora', status());
  tab('respostas_gatilho')[0].pego_em = iso(Date.now() - 16 * MINUTO);
  await enviarRespostas(ENV);
  ok(tab('respostas_gatilho')[0].status === 'falhou' && /Confira/.test(tab('respostas_gatilho')[0].erro) && directsDe('c1') === 1, 'depois de 15 minutos ele vai para conferência e NÃO recebe de novo', `${tab('respostas_gatilho')[0].status}: ${tab('respostas_gatilho')[0].erro}`);
  ok(directsDe('c2') === 1 && directsDe('c3') === 1, 'e os outros dois recebem uma vez cada');

  // A Meta pede para parar (limite de chamadas) no segundo item: os que sobraram voltam para a fila na hora.
  await prepararComenta(4);
  let nDm = 0;
  meta.falhas.push({ vezes: 1, codigo: 4, quando: (q) => q.metodo === 'POST' && q.caminho.endsWith('/messages') && ++nDm === 2 });
  r = await enviarRespostas(ENV);
  ok(status() === 'enviada,pendente,pendente,pendente' && r.devolvidas === 2, 'limite da Meta no segundo: ele e os seguintes ficam "pendente", nenhum preso', `${status()} ${JSON.stringify(r)}`);
  await enviarRespostas(ENV);
  ok(status() === 'enviada,enviada,enviada,enviada' && [1, 2, 3, 4].every((i) => directsDe(`c${i}`) === 1), 'na volta seguinte todos recebem, uma vez cada', status());
  ok(tab('mensagens_nossas').filter((m) => m.sistema).length === 4, 'o id de cada direct do Comenta X ficou guardado (para o eco)');

  // Sem folga de chamadas nada é pego; com folga para 2, pega 2.
  await prepararComenta(5);
  let apertado = comContador(ENV);
  apertado.__chamadas.n = 40;
  r = await enviarRespostas(apertado);
  ok(/Sem folga/.test(r.limite || '') && status() === 'pendente,pendente,pendente,pendente,pendente', 'sem folga de chamadas: nada sai da fila', JSON.stringify(r));
  apertado = comContador(ENV);
  apertado.__chamadas.n = 20;
  zerarRede();
  r = await enviarRespostas(apertado);
  ok(r.enviadas === 2 && tab('respostas_gatilho').filter((x) => x.status === 'pendente').length === 3 && !status().includes('enviando'), 'com folga para 2: manda 2 e deixa 3 na fila', `${status()}, ${rede.total} chamadas, folga final ${folgaDeChamadas(apertado)}`);

  // ---------------------------------------------------------------- item 7: Colmeia pelo conector
  secao('7. Colmeia: quem escreve pelo conector é agente');
  await novoCenario();
  const regra = { tipo: 'regra', titulo: 'Quando falar de desconto', texto: 'Diga que o combo já está com desconto.' };
  let item = await salvarNaColmeia({ env: ENV, u: { id: DONO, nome: 'Filipe Lourenço', papel: 'administrador', via: 'mcp', conector: true } }, regra);
  ok(item.status === 'proposta' && item.origem === 'agente', 'regra escrita pelo conector com o login do dono nasce como proposta', `${item.status} / ${item.origem} / ${item.autor}`);
  item = await salvarNaColmeia({ env: ENV, u: { id: null, nome: 'Tarefa', papel: 'editor', via: 'mcp', casa: true } }, { ...regra, tipo: 'resposta' });
  ok(item.status === 'proposta' && item.origem === 'agente', 'resposta escrita com a chave da casa nasce como proposta');
  item = await salvarNaColmeia({ env: ENV, u: { id: DONO, nome: 'Filipe Lourenço', papel: 'administrador', via: 'painel' } }, regra);
  ok(item.status === 'ativa' && item.origem === 'dono', 'a mesma regra escrita no painel vale na hora', `${item.status} / ${item.origem}`);
  item = await salvarNaColmeia({ env: ENV, u: { id: DONO, nome: 'Filipe Lourenço', papel: 'administrador', via: 'mcp' } }, { tipo: 'vendeu', titulo: 'Mandar o link logo', texto: 'Quem recebeu o link na primeira resposta comprou mais.', prova: '3 vendas em 10 conversas de 09/11.' });
  ok(item.status === 'ativa' && item.origem === 'agente', 'lição de vendedor pelo conector vale na hora, com a prova');

  // ---------------------------------------------------------------- item 8: falhas com alerta
  secao('8. Falhas com alerta');
  await novoCenario();
  await escreve('token.teste', '100000050', 'quanto custa o curso de posts?');
  meta.falhas.push({ vezes: 5, codigo: 190, mensagem: 'Error validating access token', quando: () => true });
  zerarRede();
  r = await rodar();
  ok(conexao.status === 'expirada', 'acesso do Instagram vencido: a conexão fica marcada para reconectar', conexao.status);
  ok(rede.push === 1 && rede.claude === 0, 'o dono é avisado no celular e a IA nem é chamada', `${rede.push} aviso(s), ${rede.claude} chamada(s) à IA`);
  ok(ultimaDe('token.teste').classe === 'esperando', 'a mensagem volta para a fila', JSON.stringify(r.feitos));
  r = await rodar();
  ok(ultimaDe('token.teste').classe === 'erro' && /não está conectado/.test(ultimaDe('token.teste').detalhe) && rede.push === 1, 'sem reconectar, fecha como erro (o Zelador avisa) e o aviso não se repete', ultimaDe('token.teste').detalhe);

  // O Zelador: nenhum aviso da Meta há 5 horas em horário de pico.
  const dia = new Date();
  const as = (h, min = 7) => Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate(), h + 3, min); // hora de Brasília
  const cenarioZelador = async (quandoZ, { mensagemHa, comentariosPeloRelogio = 0, comentarioNaHoraHa } = {}) => {
    await novoCenario();
    tab('config').push({ chave: 'zelador_estado', valor: { orfas_desde: iso(quandoZ - HORA) } });
    if (mensagemHa !== undefined) tab('atendimentos').push({ ...padrao('atendimentos'), mid: 'm.z', followup_id: crypto.randomUUID(), classe: 'respondeu', criado_em: iso(quandoZ - mensagemHa) });
    for (let i = 0; i < comentariosPeloRelogio; i++) tab('respostas_gatilho').push({ ...padrao('respostas_gatilho'), comentario_id: `z${i}`, status: 'enviada', comentado_em: iso(quandoZ - 30 * MINUTO - i * MINUTO - 4 * MINUTO), criado_em: iso(quandoZ - 30 * MINUTO - i * MINUTO) });
    if (comentarioNaHoraHa !== undefined) tab('respostas_gatilho').push({ ...padrao('respostas_gatilho'), comentario_id: 'zh', status: 'enviada', comentado_em: iso(quandoZ - comentarioNaHoraHa - 500), criado_em: iso(quandoZ - comentarioNaHoraHa) });
    return (await rodarZelador(ENV, quandoZ, { simular: true })).alertas.filter((a) => a.tipo === 'sem-aviso-meta');
  };
  let al = await cenarioZelador(as(21), { mensagemHa: 5.5 * HORA });
  ok(al.length === 1 && /5 horas/.test(al[0].titulo), 'às 21h07, nada chegou desde as 15h37: alerta', al.map((a) => a.titulo).join(' | '));
  al = await cenarioZelador(as(21), { mensagemHa: 2 * HORA });
  ok(al.length === 0, 'às 21h07, com mensagem às 19h07: sem alerta');
  al = await cenarioZelador(as(21), { comentarioNaHoraHa: 3 * HORA });
  ok(al.length === 0, 'às 21h07, com comentário chegando na hora às 18h07: sem alerta');
  al = await cenarioZelador(as(18), { mensagemHa: 5.5 * HORA });
  ok(al.length === 0, 'às 18h07 o buraco ainda pega a tarde, fora do pico: sem alerta');
  al = await cenarioZelador(as(10), {});
  ok(al.length === 0, 'às 10h07, manhã sem movimento: sem alerta');
  al = await cenarioZelador(as(14), { comentariosPeloRelogio: 3 });
  ok(al.length === 1 && /parou de chegar/.test(al[0].titulo), 'comentários entrando só pela leitura do relógio: alerta a qualquer hora', al.map((a) => a.titulo).join(' | '));
  al = await cenarioZelador(as(14), { comentariosPeloRelogio: 3, comentarioNaHoraHa: HORA });
  ok(al.length === 0, 'com um comentário chegando na hora no meio: sem alerta');
} catch (e) {
  falhas++;
  console.error('\nO ensaio parou com erro:', e && (e.stack || e.message));
}

console.log(`\n${feitos - falhas} de ${feitos} conferências passaram.${falhas ? ` ${falhas} FALHARAM.` : ''}`);
process.exit(falhas ? 1 : 0);
