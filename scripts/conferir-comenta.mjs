// Ensaio do Comenta X que aprende com a venda e do teto de gasto de IA (10/11/2026).
// Banco, Meta e Claude são de MENTIRA, em memória: o endereço do banco não existe e a rede deste script só fala com a
// memória (qualquer outro endereço dá erro). Não lê o .env.local, não toca no banco de verdade e não manda nada.
// O código testado é o de verdade: worker/lib/comenta.js, gatilhos.js (o envio inteiro), plano.js e nucleo/db.js.
//  1. a conta: de qual versão é cada venda (link curto, link refeito pelas marcas, botão do mini curso com a pessoa);
//  2. a leitura das vendas: uma para todas as palavras, guardada na memória, que não derruba ninguém quando falha;
//  3. a escolha: sem vendas é a de antes, pouca amostra não decide, a versão que vende ganha da que só tem clique;
//  4. o envio de ponta a ponta: a versão que vende sai mais, e nem as vendas nem o teto são lidos a cada direct;
//  5. o teto de gasto: resposta pública, versões escritas pela IA e o plano;
//  6. o botão do mini curso leva a versão: o link, a visita (origem.js), a venda na versão certa, o pedido antigo pela
//     reserva, e a tela Vendas (acoes-area.js) com "curso" e "curso-topo" iguais e a pessoa contada uma vez.
// Uso: node scripts/conferir-comenta.mjs
import { vendasPorVersao, chanceDeSerAMelhor, codigoDoLink, comVendas, escolherVariante, escreverVariantesIA, esquecerOrcamento, esquecerVendas, pistasDoPedido, respostaPublicaIA, vendasDasVersoes } from '../worker/lib/comenta.js';
import { enviarRespostas, esquecerAjustesComenta, linkDaVariante } from '../worker/lib/gatilhos.js';
import { gerarPlano, planoDaSemana } from '../worker/lib/plano.js';
import { codigoDaPessoa } from '../worker/lib/pessoa.js';
import { canalDe, marcasDe, registrarToque, toquesDoVisitante } from '../worker/lib/origem.js';
import { resumoVendas } from '../worker/lib/acoes-area.js';
import { chamadasFeitas, comContador } from '../worker/nucleo/db.js';
import { cifrar } from '../worker/nucleo/cripto.js';

const MINUTO = 60_000;
const HORA = 3600_000;
const DIA = 24 * HORA;
const iso = (ms = Date.now()) => new Date(ms).toISOString();
const copia = (x) => JSON.parse(JSON.stringify(x));

let falhas = 0;
let feitos = 0;
const secao = (titulo) => console.log(`\n== ${titulo}`);
function ok(cond, texto, extra = '') {
  feitos++;
  if (!cond) falhas++;
  console.log(`  ${cond ? 'ok  ' : 'ERRO'} ${texto}${extra !== '' ? ` (${extra})` : ''}`);
}
const recusa = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };
// O que o código avisa no console quando uma leitura falha de propósito não precisa sujar o ensaio.
const erroDoConsole = console.error;
const calado = async (fn) => { console.error = () => {}; try { return await fn(); } finally { console.error = erroDoConsole; } };

// ---------------------------------------------------------------- sorteio com semente (para o ensaio dar sempre igual)
const sorteioDoNode = Math.random;
function semente(n) {
  let a = n >>> 0;
  Math.random = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// A escolha como era ANTES das vendas (cópia do código de 09/11/2026), para comparar sorteio por sorteio.
function normalAntes() { const u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function gamaAntes(k) {
  if (k < 1) return gamaAntes(k + 1) * Math.random() ** (1 / k);
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do { x = normalAntes(); v = 1 + c * x; } while (v <= 0);
    v = v ** 3;
    const u = Math.random();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
const betaAntes = (a, b) => { const x = gamaAntes(a); return x / (x + gamaAntes(b)); };
const sucessosAntes = (s) => Math.min((s.cliques || 0) + (s.seguidores || 0), s.enviados || 0);
function escolherAntes(g, stats = {}) {
  const ativas = g.variantes.filter((v) => v.ativa !== false);
  if (!ativas.length) return null;
  const sorteio = (l) => l[Math.floor(Math.random() * l.length)];
  if (g.estrategia === 'igual' || ativas.length === 1) return sorteio(ativas);
  const env = (v) => (stats[v.id] && stats[v.id].enviados) || 0;
  const poucas = ativas.filter((v) => env(v) < 25);
  if (poucas.length) {
    const menor = Math.min(...poucas.map(env));
    return sorteio(poucas.filter((v) => env(v) === menor));
  }
  let melhor = null, nota = -1;
  for (const v of ativas) {
    const s = stats[v.id] || {};
    const t = betaAntes(sucessosAntes(s) + 1, Math.max(env(v) - sucessosAntes(s), 0) + 1);
    if (t > nota) { nota = t; melhor = v; }
  }
  return melhor;
}

// ---------------------------------------------------------------- o banco de mentira (o bastante do PostgREST)
const BANCO = 'https://banco-de-mentira.invalid';
let t = {};
let serie = 1000;
const mundo = { chamadas: [], gastoHoje: 0, falhar: null, ia: [], directs: [], respostasPublicas: [] };
const tab = (nome) => (t[nome] ||= []);
const contar = (trecho) => mundo.chamadas.filter((c) => c.includes(trecho)).length;
const escritas = () => mundo.chamadas.filter((c) => !c.startsWith('GET ') && !c.startsWith('POST rpc/') && !c.startsWith('IA') && !c.startsWith('META'));

function separar(s) {
  const partes = [];
  let nivel = 0, aspas = false, atual = '';
  for (const ch of s) {
    if (ch === '"') aspas = !aspas;
    if (!aspas && (ch === '(' || ch === '[' || ch === '{')) nivel++;
    if (!aspas && (ch === ')' || ch === ']' || ch === '}')) nivel--;
    if (!aspas && nivel === 0 && ch === ',') { partes.push(atual); atual = ''; continue; }
    atual += ch;
  }
  if (atual) partes.push(atual);
  return partes;
}
const semAspas = (s) => String(s).replace(/^"|"$/g, '');
const numeroOuData = (v) => (typeof v === 'string' && /^\d{4}-\d\d-\d\d/.test(v) ? Date.parse(v) : Number(v));
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
    const a = numeroOuData(val), b = numeroOuData(semAspas(v));
    r = val !== null && val !== undefined && (op === 'gte' ? a >= b : op === 'gt' ? a > b : op === 'lte' ? a <= b : a < b);
  } else if (op === 'is') r = v === 'null' ? val === null || val === undefined : v === 'true' ? val === true : val === false;
  // "contém", no jsonb: cada objeto pedido tem de existir na lista da linha, com os mesmos valores.
  else if (op === 'cs') r = Array.isArray(val) && JSON.parse(v).every((quer) => val.some((tem) => tem && Object.entries(quer).every(([k, x]) => tem[k] === x)));
  else throw new Error(`banco de mentira: filtro desconhecido "${op}" em ${col}`);
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
  const ordem = params.get('order');
  if (ordem) {
    const chaves = ordem.split(',').map((o) => { const [col, dir] = o.split('.'); return { col, desc: dir === 'desc' }; });
    linhas = [...linhas].sort((a, b) => {
      for (const c of chaves) {
        const x = a[c.col], y = b[c.col];
        if (x === y) continue;
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        return (x < y ? -1 : 1) * (c.desc ? -1 : 1);
      }
      return 0;
    });
  }
  const limite = Number(params.get('limit'));
  return limite ? linhas.slice(0, limite) : linhas;
}
const ENVIADOS = ['enviando', 'enviada', 'pergunta', 'respondendo', 'link'];
const FUNCOES = {
  escritorio_resumo() { return { custo_hoje: mundo.gastoHoje }; },
  // Os números por versão, como a função do banco: envios pelas respostas, cliques pelos links curtos.
  numeros_variantes({ p_gatilho }) {
    const saida = {};
    const de = (gid, v) => ((saida[gid] ||= {})[v || '?'] ||= { comentarios: 0, enviados: 0, links: 0, respostas: 0, seguidores: 0, ja_seguiam: 0, erros: 0, cliques: 0 });
    for (const r of tab('respostas_gatilho')) if (r.gatilho_id && (!p_gatilho || r.gatilho_id === p_gatilho)) { const n = de(r.gatilho_id, r.variante); n.comentarios++; if (ENVIADOS.includes(r.status)) n.enviados++; }
    for (const l of tab('links')) if (l.gatilho_id && (!p_gatilho || l.gatilho_id === p_gatilho)) de(l.gatilho_id, l.variante).cliques += l.cliques || 0;
    return saida;
  },
  pegar_respostas({ p_limite = 10 }) {
    const lote = tab('respostas_gatilho').filter((r) => r.status === 'pendente').sort((a, b) => (a.criado_em < b.criado_em ? -1 : 1)).slice(0, p_limite);
    for (const r of lote) Object.assign(r, { status: 'enviando', tentativas: (r.tentativas || 0) + 1, pego_em: iso() });
    return lote.map(copia);
  },
  marcar_resposta({ p_id, p_status, p_erro = null, p_extra = {} }) {
    const r = tab('respostas_gatilho').find((x) => x.id === p_id);
    if (!r) return null;
    Object.assign(r, { status: p_status, erro: p_erro, pego_em: null });
    if (['enviada', 'pergunta'].includes(p_status) && !r.enviado_em) r.enviado_em = iso();
    if (['enviada', 'link'].includes(p_status) && !r.link_em) r.link_em = iso();
    for (const k of ['variante', 'igsid', 'link_codigo', 'nome', 'usuario']) if (p_extra[k] !== undefined && p_extra[k] !== null) r[k] = String(p_extra[k]);
    return null;
  },
};
const resposta = (corpo, status = 200, cab = {}) => new Response(corpo === undefined ? null : JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json', 'request-id': 'req_de_mentira', ...cab } });

function pedidoAoBanco(url, op) {
  const metodo = String(op.method || 'GET').toUpperCase();
  const caminho = url.pathname.slice('/rest/v1/'.length);
  const marca = url.searchParams.get('toques') ? '?toques' : '';
  mundo.chamadas.push(`${metodo} ${caminho}${marca}`);
  if (mundo.falhar && mundo.falhar(metodo, caminho)) return resposta({ message: 'falha de propósito' }, 500);
  const corpo = op.body ? JSON.parse(op.body) : null;
  if (caminho.startsWith('rpc/')) {
    const f = FUNCOES[caminho.slice(4)];
    return resposta(f ? f(corpo || {}) : {});
  }
  const prefer = String((op.headers && (op.headers.Prefer || op.headers.prefer)) || '');
  if (metodo === 'GET') {
    let linhas = filtrar(caminho, url.searchParams).map(copia);
    // O que o código pede junto: a palavra de cada resposta (gatilho:gatilhos(palavra,perfil)).
    if (caminho === 'respostas_gatilho' && (url.searchParams.get('select') || '').includes('gatilho:gatilhos(')) {
      linhas = linhas.map((l) => { const g = tab('gatilhos').find((x) => x.id === l.gatilho_id); return { ...l, gatilho: g ? { palavra: g.palavra, perfil: g.perfil } : null }; });
    }
    return resposta(linhas, 200, { 'content-range': `0-${Math.max(linhas.length - 1, 0)}/${linhas.length}` });
  }
  if (metodo === 'POST') {
    const conflito = (url.searchParams.get('on_conflict') || '').split(',').filter(Boolean);
    const novas = [];
    for (const d of Array.isArray(corpo) ? corpo : [corpo]) {
      const ja = conflito.length ? tab(caminho).find((l) => conflito.every((c) => String(l[c]) === String(d[c]))) : null;
      if (ja && prefer.includes('ignore-duplicates')) continue;
      if (ja) { Object.assign(ja, d); novas.push(ja); continue; }
      // A visita ganha a hora do banco (a coluna "quando" tem o agora como padrão).
      const linha = { id: ++serie, criado_em: iso(), ...(caminho === 'toques' ? { quando: iso() } : {}), ...d };
      tab(caminho).push(linha);
      novas.push(linha);
    }
    return prefer.includes('return=minimal') ? resposta(undefined, 204) : resposta(novas.map(copia), 201);
  }
  if (metodo === 'PATCH') {
    const linhas = filtrar(caminho, url.searchParams);
    for (const l of linhas) Object.assign(l, corpo);
    return resposta(linhas.map(copia));
  }
  throw new Error(`banco de mentira: não faz ${metodo}`);
}

// O Claude de mentira: a frase da resposta pública, as versões e o plano.
function pedidoAoClaude(op) {
  const pedido = JSON.parse(op.body);
  const ferramenta = pedido.tools && pedido.tools[0] && pedido.tools[0].name;
  mundo.ia.push(ferramenta || 'frase');
  mundo.chamadas.push(`IA ${ferramenta || 'frase'}`);
  const base = { id: `msg_${mundo.ia.length}`, type: 'message', role: 'assistant', model: pedido.model, stop_sequence: null, usage: { input_tokens: 800, output_tokens: 60 } };
  if (!ferramenta) return resposta({ ...base, content: [{ type: 'text', text: 'Escrita pela IA: corre no direct!' }], stop_reason: 'end_turn' });
  const entrada = ferramenta === 'gravar_versoes'
    ? { variantes: [{ nome: 'gancho curioso', dm: 'Oi, {usuario}! Aqui está o {titulo}. Toca no botão:', botao: 'Abrir o material 🦎', publico: ['Te mandei no direct!', 'Olha sua DM'] }, { nome: 'direto ao ponto', dm: 'Chegou o {titulo}, {usuario}. É só tocar:', botao: 'Quero ver 🦎', publico: ['Mandei agora!', 'Já tá no direct'] }] }
    : { resumo: 'Vendas estáveis.', ideias: [{ titulo: 'Agenda de posts', gancho: 'Seu mês de posts em 1 hora', formato: 'carrossel', perfil: 'br', objetivo: 'venda', palavra: 'MES', material: 'Modelo de agenda', por_que: 'Poucos dados ainda.', dia: 'terça' }], vender: [{ titulo: 'Testar o bump', como: 'Trocar o texto.', por_que: 'Poucos dados.' }], alcance: [{ titulo: 'Repetir o formato', como: 'Mais listas.', por_que: 'Poucos dados.' }] };
  return resposta({ ...base, content: [{ type: 'tool_use', id: 'toolu_de_mentira', name: ferramenta, input: entrada }], stop_reason: 'tool_use', usage: { input_tokens: 3000, output_tokens: 500 } });
}

// A Meta de mentira: o direct e a resposta no comentário.
function pedidoAMeta(url, op) {
  if (url.pathname.endsWith('/messages')) {
    const corpo = JSON.parse(op.body);
    const botoes = (corpo.message.attachment && corpo.message.attachment.payload.buttons) || [];
    mundo.chamadas.push('META direct');
    mundo.directs.push({ comentario: corpo.recipient.comment_id, links: botoes.map((b) => b.url) });
    return resposta({ recipient_id: `9${String(corpo.recipient.comment_id).replace(/\D/g, '').padStart(8, '0')}`, message_id: `mid.${mundo.directs.length}` });
  }
  if (url.pathname.endsWith('/replies')) {
    mundo.chamadas.push('META resposta');
    mundo.respostasPublicas.push(new URLSearchParams(String(op.body)).get('message'));
    return resposta({ id: `r${mundo.respostasPublicas.length}` });
  }
  return resposta({ error: { message: 'endereço que a Meta de mentira não conhece', code: 100 } }, 400);
}

// A rede do ensaio: só a memória. A rede de verdade nem é chamada.
globalThis.fetch = async (alvo, op = {}) => {
  const url = new URL(String(alvo && alvo.url ? alvo.url : alvo));
  if (url.origin === BANCO && url.pathname.startsWith('/rest/v1/')) return pedidoAoBanco(url, op);
  if (url.origin === 'https://api.anthropic.com' && url.pathname === '/v1/messages') return pedidoAoClaude(op);
  if (url.origin === 'https://graph.instagram.com') return pedidoAMeta(url, op);
  throw new Error(`a rede de mentira recusou ${url.origin}${url.pathname}`);
};

const ENV = {
  SUPABASE_URL: BANCO, SUPABASE_SECRET_KEY: 'sb_secret_de_mentira', AMBIENTE: 'local', ANTHROPIC_CHAVE: 'chave-de-mentira',
  SITE_URL: 'https://agenciasetup.com.br', CRIPTO_CHAVE: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64'),
};
const ENV_PAGO = { ...ENV, WORKERS_PAGO: '1' };

// ---------------------------------------------------------------- o cenário: uma palavra, duas versões, vendas na B
// A versão A tem mais cliques (24 em 40 envios); a B tem menos cliques (16 em 40) e é a que vende.
let nPost = 0;
async function novoCenario({ pendentes = 0, vendasNaB = true } = {}) {
  t = {};
  Object.assign(mundo, { chamadas: [], gastoHoje: 0, falhar: null, ia: [], directs: [], respostasPublicas: [] });
  esquecerAjustesComenta();
  esquecerVendas();
  esquecerOrcamento();
  const post = `1790000000${String(++nPost).padStart(7, '0')}`;
  const outroPost = `1790000000${String(++nPost).padStart(7, '0')}`;
  const gid = crypto.randomUUID();
  const outra = crypto.randomUUID(); // a mesma palavra em outro post: as versões A e B de lá são outras mensagens
  const versao = (id) => ({ id, nome: id.toUpperCase(), dm: 'Toma o material {link}', pergunta: '', depois: '', lembrete: '', botao: '', publico: [`Pronta da versão ${id.toUpperCase()}`], ativa: true });
  const palavra = (id, p) => ({ id, rede: 'instagram', perfil: 'br', palavra: 'POSTS', ativo: true, posts: [p], modo: 'direto', estrategia: 'melhor', link: null, mensagem: null, respostas: [], responder_publico: true, resposta_ia: true, enviados: 0, variantes: [versao('a'), versao('b')], recurso: { slug: 'material', titulo: 'Material', status: 'publicado', perfil: 'br' } });
  tab('gatilhos').push(palavra(gid, post), palavra(outra, outroPost));
  tab('conexoes').push({ id: crypto.randomUUID(), plataforma: 'instagram', perfil: 'br', status: 'ativa', conta_id: '17840000000000001', escopos: ['instagram_business_basic', 'instagram_business_manage_comments', 'instagram_business_manage_messages'], credenciais: await cifrar(ENV, { token: 'token-de-mentira', usuario: '17840000000000001' }), expira_em: iso(Date.now() + 60 * DIA), criado_em: iso(Date.now() - 30 * DIA) });
  const cod = { a: codigoDoLink('posts', 'a', post), b: codigoDoLink('posts', 'b', post), outraA: codigoDoLink('posts', 'a', outroPost) };
  const link = (codigo, g, v, p, cliques) => ({ codigo, destino: '/recursos/material?de=dm-posts', utm_source: 'instagram', utm_medium: 'dm', utm_campaign: 'posts', utm_content: `posts-${v}`, utm_term: p, gatilho_id: g, variante: v, cliques });
  tab('links').push(link(cod.a, gid, 'a', post, 24), link(cod.b, gid, 'b', post, 16), link(cod.outraA, outra, 'a', outroPost, 3));
  // 40 directs já enviados de cada versão, há 3 dias.
  const ha3dias = Date.now() - 3 * DIA;
  let n = 0;
  const enviada = (v, usuario) => tab('respostas_gatilho').push({ id: ++serie, gatilho_id: gid, rede: 'instagram', origem: 'comentario', comentario_id: `antigo${++n}`, post_id: post, usuario, pessoa_id: `60${n}`, texto: 'POSTS', status: 'enviada', variante: v, tentativas: 1, enviado_em: iso(ha3dias), link_em: iso(ha3dias), criado_em: iso(ha3dias) });
  for (let i = 1; i <= 40; i++) enviada('a', `recebeu.a${i}`);
  for (let i = 1; i <= 39; i++) enviada('b', `recebeu.b${i}`);
  enviada('b', 'compradora.um'); // quem vai comprar pelo botão do mini curso
  for (let i = 1; i <= pendentes; i++) tab('respostas_gatilho').push({ id: ++serie, gatilho_id: gid, rede: 'instagram', origem: 'comentario', comentario_id: `novo${nPost}x${i}`, post_id: post, usuario: `pessoa${i}`, pessoa_id: `70${i}`, texto: 'POSTS', status: 'pendente', variante: null, tentativas: 0, pego_em: null, enviado_em: null, comentado_em: iso(), criado_em: iso(Date.now() - (60 - i) * 1000) });

  // Os pedidos. "dm" é o toque de um direct do Comenta X; a ordem da lista é a do banco (do mais antigo para o mais novo).
  const ontem = Date.now() - DIA;
  const dm = (extra, quando) => ({ quando: iso(quando), origem: 'instagram', meio: 'dm', campanha: 'posts', conteudo: null, termo: null, pessoa: null, link: null, clid: null, pagina: null, ...extra });
  const pedido = (extra) => { const p = { id: crypto.randomUUID(), aluno_id: crypto.randomUUID(), status: 'pago', teste: false, moeda: 'brl', total_centavos: 3990, pago_em: iso(ontem + HORA), criado_em: iso(ontem + HORA), toques: [], ...extra }; tab('pedidos').push(p); return p; };
  const pessoa = await codigoDaPessoa('br', 'compradora.um');
  const ped = {};
  if (vendasNaB) {
    // 1. clicou no botão do material da versão B (o link curto) e comprou.
    ped.link = pedido({ toques: [dm({ conteudo: 'posts-b', termo: post, link: cod.b, pessoa: await codigoDaPessoa('br', 'recebeu.b1') }, ontem)] });
    // 2. a visita ficou sem o código do link (a página abriu antes): o código é refeito pelas marcas.
    ped.refeito = pedido({ toques: [dm({ conteudo: 'posts-b', termo: post, pagina: '/recursos/material' }, ontem)] });
    // 3. clicou no material da B e depois na faixa do curso no topo ("material-topo" não diz versão nem pessoa).
    ped.topo = pedido({ toques: [dm({ conteudo: 'posts-b', termo: post, link: cod.b }, ontem), dm({ conteudo: 'material-topo', termo: post, pagina: '/cursos/posts-automaticos' }, ontem + MINUTO)] });
    // 4. clicou direto no botão do mini curso: só o código da pessoa. O follow-up sabe quem comprou.
    ped.curso = pedido({ toques: [dm({ conteudo: 'curso-topo', pessoa, pagina: '/cursos/posts-automaticos' }, ontem)] });
    tab('followups').push({ id: crypto.randomUUID(), perfil: 'br', usuario: 'compradora.um', pedido_id: ped.curso.id, comprou_em: ped.curso.pago_em, compra_por: 'link' });
    // 5 e 6. mais duas pelo link da B.
    ped.b5 = pedido({ toques: [dm({ conteudo: 'posts-b', termo: post, link: cod.b }, ontem)] });
    ped.b6 = pedido({ toques: [{ quando: iso(ontem - HORA), origem: 'ig', meio: 'social', campanha: null, conteudo: 'link_in_bio' }, dm({ conteudo: 'posts-b', termo: post, link: cod.b }, ontem)] });
    // 7. quem comprou pelo link (1) levou o complemento depois: o pedido novo herda as visitas. É a mesma pessoa.
    ped.complemento = pedido({ aluno_id: ped.link.aluno_id, total_centavos: 2990, toques: copia(ped.link.toques) });
    // O que NÃO entra: venda de outro canal, pedido de teste, reembolso e pedido não pago, todos com o link da versão A.
    pedido({ toques: [{ quando: iso(ontem), origem: 'ig', meio: 'social', campanha: null, conteudo: 'link_in_bio' }] });
    pedido({ teste: true, toques: [dm({ conteudo: 'posts-a', termo: post, link: cod.a }, ontem)] });
    pedido({ status: 'reembolsado', toques: [dm({ conteudo: 'posts-a', termo: post, link: cod.a }, ontem)] });
    pedido({ status: 'aguardando', pago_em: null, toques: [dm({ conteudo: 'posts-a', termo: post, link: cod.a }, ontem)] });
    // A mesma palavra em outro post: a venda é da versão A de lá, não da versão A daqui.
    ped.outra = pedido({ toques: [dm({ conteudo: 'posts-a', termo: outroPost, link: cod.outraA }, ontem)] });
  }
  return { gid, outra, post, cod, ped, pessoa };
}

try {
  // ---------------------------------------------------------------- 1. a conta: de qual versão é cada venda
  secao('1. A conta: de qual versão é cada venda');
  const G = 'palavra-1', H = 'palavra-2';
  const links = { 'posts-a-000001': { gatilho_id: G, variante: 'a' }, 'posts-b-000001': { gatilho_id: G, variante: 'b' }, 'posts-a-000002': { gatilho_id: H, variante: 'a' } };
  const toque = (extra, quando) => ({ quando: iso(quando), origem: 'instagram', meio: 'dm', campanha: 'posts', ...extra });
  const base = Date.parse('2026-11-08T15:00:00Z');
  const um = (toques, extra = {}) => ({ id: crypto.randomUUID(), aluno_id: crypto.randomUUID(), total_centavos: 3990, toques, ...extra });
  let r = vendasPorVersao([um([toque({ conteudo: 'posts-b', termo: '17900000000000001', link: 'posts-b-000001' }, base)])], links);
  ok(r[G] && r[G].b && r[G].b.vendas === 1 && r[G].b.vendas_centavos === 3990 && !r[G].a, 'clique no link curto da versão B: a venda é da B', JSON.stringify(r));
  r = vendasPorVersao([um([toque({ conteudo: 'posts-b', termo: '17900000000000001' }, base)])], links);
  ok(r[G] && r[G].b && r[G].b.vendas === 1, 'visita sem o código do link: ele é refeito pela campanha, pelo conteúdo e pelo post', JSON.stringify(r));
  r = vendasPorVersao([um([toque({ conteudo: 'posts-a', termo: '17900000000000002' }, base)])], links);
  ok(r[H] && r[H].a.vendas === 1 && !r[G], 'a mesma palavra em outro post: a venda vai para a versão daquele post', JSON.stringify(r));
  r = vendasPorVersao([um([toque({ conteudo: 'posts-a', link: 'posts-a-000001' }, base), toque({ conteudo: 'material-topo', termo: '17900000000000001' }, base + MINUTO)])], links);
  ok(r[G] && r[G].a.vendas === 1, 'material e depois a faixa do curso ("material-topo"): vale a versão do material', JSON.stringify(r));
  r = vendasPorVersao([um([toque({ conteudo: 'posts-a', link: 'posts-a-000001' }, base), toque({ conteudo: 'posts-b', link: 'posts-b-000001' }, base + DIA)])], links);
  ok(r[G] && r[G].b && r[G].b.vendas === 1 && !r[G].a, 'recebeu duas versões: a venda é de UMA só, a do toque mais novo', JSON.stringify(r));
  const codigo = 'ab12cd34ef';
  const envios = { [codigo]: [{ gatilho_id: G, variante: 'a', campanha: 'posts', em: base - 2 * DIA }, { gatilho_id: G, variante: 'b', campanha: 'posts', em: base - HORA }, { gatilho_id: H, variante: 'a', campanha: 'posts', em: base + DIA }, { gatilho_id: 'palavra-3', variante: 'c', campanha: 'agenda', em: base - MINUTO }] };
  r = vendasPorVersao([um([toque({ conteudo: 'curso-topo', pessoa: codigo }, base)])], links, envios);
  ok(r[G] && r[G].b && r[G].b.vendas === 1 && Object.keys(r).length === 1, 'botão do mini curso (só o código da pessoa): a versão do último direct daquela palavra antes do toque', JSON.stringify(r));
  r = vendasPorVersao([um([toque({ conteudo: 'curso', pessoa: 'ffffffffff' }, base)])], links, envios);
  ok(Object.keys(r).length === 0, 'código de pessoa que ninguém conhece: a venda não vai para nenhuma versão', JSON.stringify(r));
  r = vendasPorVersao([um([toque({ conteudo: 'posts-a', link: 'posts-a-000001' }, base - DIA), toque({ conteudo: 'curso', pessoa: 'ffffffffff' }, base)])], links, envios);
  ok(r[G] && r[G].a.vendas === 1, 'se o toque mais novo não resolve, vale o anterior', JSON.stringify(r));
  r = vendasPorVersao([um([{ quando: iso(base), origem: 'ig', meio: 'social', conteudo: 'link_in_bio' }]), um([]), um(null)], links, envios);
  ok(Object.keys(r).length === 0, 'venda que não passou por direct do Comenta X: de nenhuma versão');
  const mesma = crypto.randomUUID();
  r = vendasPorVersao([um([toque({ link: 'posts-b-000001' }, base)], { aluno_id: mesma }), um([toque({ link: 'posts-b-000001' }, base)], { aluno_id: mesma, total_centavos: 2990 })], links);
  ok(r[G].b.vendas === 1 && r[G].b.vendas_centavos === 6980, 'a mesma pessoa com dois pedidos (o curso e o complemento): 1 venda, a receita soma', JSON.stringify(r[G].b));
  ok(pistasDoPedido(um([toque({ conteudo: 'curso' }, base), toque({ conteudo: 'material-topo' }, base)])).length === 0, 'toque sem código de link e sem pessoa não é pista');
  // O botão do mini curso com a versão no endereço (o código do link curto fica em "link" na visita): a pista direta
  // vale antes do caminho pela pessoa, que continua de reserva.
  r = vendasPorVersao([um([toque({ conteudo: 'curso', termo: '17900000000000001', link: 'posts-b-000001' }, base)])], links);
  ok(r[G] && r[G].b && r[G].b.vendas === 1 && Object.keys(r).length === 1, 'botão do mini curso com o código da versão: a venda é da versão B, sem precisar da pessoa', JSON.stringify(r));
  r = vendasPorVersao([um([toque({ conteudo: 'curso-topo', link: 'posts-a-000001', pessoa: codigo }, base)])], links, envios);
  ok(r[G] && r[G].a && r[G].a.vendas === 1 && !r[G].b, 'o código no link diz A e o último direct da pessoa foi o B: vale a pista direta (A)', JSON.stringify(r));
  r = vendasPorVersao([um([toque({ conteudo: 'curso', link: 'posts-z-999999', pessoa: codigo }, base)])], links, envios);
  ok(r[G] && r[G].b && r[G].b.vendas === 1, 'código que não resolve (link apagado): cai na reserva, pelo último direct da pessoa (B)', JSON.stringify(r));
  ok(JSON.stringify(comVendas({ a: { enviados: 30, cliques: 9 } }, { a: { vendas: 2, vendas_centavos: 7980 }, b: { vendas: 1, vendas_centavos: 3990 } })) === JSON.stringify({ a: { enviados: 30, cliques: 9, vendas: 2, vendas_centavos: 7980 }, b: { vendas: 1, vendas_centavos: 3990 } }), 'as vendas entram junto dos números de cada versão');
  const semLeitura = { a: { enviados: 30 } };
  ok(comVendas(semLeitura, null) === semLeitura && comVendas(semLeitura, undefined) === semLeitura, 'sem leitura de vendas, os números ficam como vieram');
  // O código refeito tem de ser o mesmo que o envio de verdade grava (linkDaVariante, em gatilhos.js).
  await novoCenario({ vendasNaB: false });
  const gReal = tab('gatilhos')[0];
  t.links = [];
  const casos = [['POSTS', 'a', '17912345678901234'], ['EU QUERO', 'b', '18000000000000042'], ['Agência Setup de Conteúdo Longo', 'c', '17999999999999999'], ['CLIENTES', 'a', null]];
  let iguais = 0;
  for (const [palavra, v, post] of casos) {
    const feito = await linkDaVariante(ENV, { ...gReal, id: crypto.randomUUID(), palavra }, { id: v }, { rede: 'instagram', post_id: post });
    const gravado = tab('links').at(-1);
    if (feito && feito.codigo && feito.codigo === codigoDoLink(gravado.utm_campaign, v, gravado.utm_term) && gravado.utm_content === `${gravado.utm_campaign}-${v}`) iguais++;
  }
  ok(iguais === casos.length, 'o código refeito pelas marcas é o mesmo que o envio grava no link curto', `${iguais} de ${casos.length}`);

  // ---------------------------------------------------------------- 2. a leitura das vendas
  secao('2. A leitura das vendas: uma para todas as palavras, guardada na memória');
  let c = await novoCenario();
  let v = await vendasDasVersoes(ENV);
  const esperado = 3990 * 6 + 2990;
  ok(v && v[c.gid] && v[c.gid].b && v[c.gid].b.vendas === 6 && v[c.gid].b.vendas_centavos === esperado && !v[c.gid].a, 'versão B: 6 vendas (link, link refeito, material e faixa, botão do curso e mais 2) e a receita com o complemento', JSON.stringify(v[c.gid]));
  ok(v[c.outra] && v[c.outra].a && v[c.outra].a.vendas === 1, 'a venda da mesma palavra em outro post ficou na versão de lá', JSON.stringify(v[c.outra]));
  ok(!v[c.gid].a, 'teste, reembolso, pedido não pago e venda de outro canal não contam para ninguém');
  ok(mundo.chamadas.join(', ') === 'GET pedidos?toques, GET links, GET followups, GET respostas_gatilho', 'quatro leituras para todas as palavras, e só leitura', mundo.chamadas.join(', '));
  mundo.chamadas = [];
  for (let i = 0; i < 20; i++) await vendasDasVersoes(ENV);
  ok(mundo.chamadas.length === 0, 'pedir de novo 20 vezes em seguida não lê nada: vale a memória');
  // Falha na leitura: devolve null, não derruba, e não tenta de novo no mesmo minuto.
  esquecerVendas();
  mundo.falhar = (metodo, caminho) => caminho === 'pedidos';
  mundo.chamadas = [];
  v = await calado(() => vendasDasVersoes(ENV));
  const depoisDaFalha = await calado(() => vendasDasVersoes(ENV));
  ok(v === null && depoisDaFalha === null && contar('GET pedidos') === 1, 'o banco falha: volta vazio, sem erro, e só tenta de novo depois de 1 minuto', `${contar('GET pedidos')} tentativa(s)`);
  // Sem folga de chamadas (o minuto contado do plano grátis): não lê.
  esquecerVendas();
  mundo.falhar = null;
  mundo.chamadas = [];
  const semFolga = comContador(ENV);
  v = await vendasDasVersoes(semFolga);
  ok(v === null && mundo.chamadas.length === 0 && chamadasFeitas(semFolga) === 0, 'no minuto contado do plano grátis (46 chamadas) a leitura não acontece: não tira chamada do envio');
  v = await vendasDasVersoes(comContador(ENV_PAGO));
  ok(!!v && v[c.gid].b.vendas === 6 && contar('GET pedidos') === 1, 'no Workers pago (teto de 1.000) a leitura acontece');
  ok(escritas().length === 0, 'nada foi gravado no banco nesta parte', escritas().join(', '));

  // ---------------------------------------------------------------- 3. a escolha da versão
  secao('3. A escolha: a versão que vende ganha, com o cuidado de sempre');
  const g = { estrategia: 'melhor', variantes: [{ id: 'a', ativa: true }, { id: 'b', ativa: true }] };
  const fatia = (palavra, stats, vezes = 4000, escolher = escolherVariante) => { let a = 0; for (let i = 0; i < vezes; i++) if (escolher(palavra, stats).id === 'a') a++; return Math.round((a / vezes) * 100); };
  // Sem vendas, a escolha é a de antes, sorteio por sorteio.
  const semVendas = [
    { a: { enviados: 25, cliques: 5 }, b: { enviados: 25, cliques: 15 } },
    { a: { enviados: 80, cliques: 34 }, b: { enviados: 31, cliques: 14, seguidores: 3 } },
    { a: { enviados: 40, cliques: 30, vendas: 0, vendas_centavos: 0 }, b: { enviados: 60, cliques: 20, vendas: 0, vendas_centavos: 0 } },
    { a: { enviados: 10, cliques: 2 }, b: { enviados: 3, cliques: 3 } },
  ];
  let diferentes = 0;
  for (const [i, s] of semVendas.entries()) {
    semente(100 + i); const nova = Array.from({ length: 500 }, () => escolherVariante(g, s).id).join('');
    semente(100 + i); const antiga = Array.from({ length: 500 }, () => escolherAntes(g, s).id).join('');
    if (nova !== antiga) diferentes++;
  }
  ok(diferentes === 0, 'sem a leitura de vendas (ou com zero venda na palavra) a escolha é a de antes, sorteio por sorteio', `${semVendas.length} situações, 500 sorteios cada`);
  // Pouca amostra não decide.
  semente(7);
  ok(fatia(g, { a: { enviados: 10, cliques: 2, vendas: 2 }, b: { enviados: 3, cliques: 0, vendas: 0 } }, 300) === 0, 'versão com menos de 25 envios: sai a que tem menos envios, mesmo que a outra já tenha vendido');
  semente(8);
  let f = fatia(g, { a: { enviados: 25, cliques: 5, vendas: 1 }, b: { enviados: 25, cliques: 5, vendas: 0 } });
  ok(f >= 55 && f <= 85, 'uma venda de sorte em 25 envios (cliques iguais) empurra, mas não decide', `a versão da venda fica com ${f}% dos envios`);
  semente(9);
  f = fatia(g, { a: { enviados: 25, cliques: 5, vendas: 1 }, b: { enviados: 25, cliques: 8, vendas: 0 } });
  ok(f >= 45 && f <= 80, 'a mesma venda única contra uma versão com mais cliques: fica perto do meio', `${f}%`);
  semente(10);
  f = fatia(g, { a: { enviados: 100, cliques: 30, vendas: 1 }, b: { enviados: 100, cliques: 45, vendas: 0 } });
  ok(f < 60, 'uma venda só em 100 envios não vira o jogo contra 15 pontos a mais de clique', `${f}%`);
  // A versão que vende ganha da que só tem clique.
  const vende = { a: { enviados: 100, cliques: 30, vendas: 4 }, b: { enviados: 100, cliques: 45, vendas: 0 } };
  semente(11);
  f = fatia(g, vende);
  semente(11);
  const antes = fatia(g, vende, 4000, escolherAntes);
  ok(f >= 80 && antes <= 5, '4 vendas contra nenhuma em 100 envios: ganha a que vende, mesmo com menos cliques', `a que vende fica com ${f}% dos envios; antes ficava com ${antes}%`);
  semente(12);
  f = fatia(g, { a: { enviados: 300, cliques: 90, vendas: 12 }, b: { enviados: 300, cliques: 135, vendas: 3 } });
  ok(f >= 90, 'com mais envios e mais vendas, mais certeza (12 a 3 em 300)', `${f}%`);
  semente(13);
  f = fatia(g, { a: { enviados: 100, cliques: 30, vendas: 2 }, b: { enviados: 100, cliques: 45, vendas: 2 } });
  ok(f < 45, 'vendendo igual, o clique continua desempatando', `a de menos cliques fica com ${f}%`);
  semente(14);
  f = fatia({ ...g, estrategia: 'igual' }, vende);
  ok(f >= 45 && f <= 55, 'no modo "sortear igual" a venda não muda nada', `${f}%`);
  semente(15);
  const chance = chanceDeSerAMelhor(g.variantes, vende);
  ok(chance.a >= 80 && chance.a + chance.b >= 99, 'a chance de ser a melhor que o painel mostra usa a mesma conta', JSON.stringify(chance));
  semente(16);
  const tres = { ...g, variantes: [...g.variantes, { id: 'c', ativa: false }] };
  ok(fatia(tres, { ...vende, c: { enviados: 100, cliques: 90, vendas: 30 } }) >= 80, 'versão pausada não entra na conta, nem com venda');

  // ---------------------------------------------------------------- 4. o envio de ponta a ponta
  secao('4. O envio de verdade (gatilhos.js) com rede de mentira');
  c = await novoCenario({ pendentes: 10 });
  semente(21);
  let env = comContador(ENV_PAGO);
  let feito = await enviarRespostas(env);
  const saiu = (id) => tab('respostas_gatilho').filter((x) => /^novo/.test(x.comentario_id) && x.status === 'enviada' && x.variante === id).length;
  ok(feito.enviadas === 10 && saiu('a') + saiu('b') === 10, 'os 10 directs saíram', JSON.stringify(feito));
  ok(saiu('b') >= 7, 'a versão que vende saiu mais, mesmo com menos cliques', `B ${saiu('b')}, A ${saiu('a')}`);
  ok(contar('GET pedidos?toques') === 1, 'as vendas foram lidas uma vez para os 10 directs, e não uma por direct', `${contar('GET pedidos?toques')} leitura(s)`);
  ok(contar('rpc/escritorio_resumo') === 1 && contar('GET config') <= 3, 'o teto de gasto foi lido uma vez para os 10 directs', `${contar('rpc/escritorio_resumo')} leitura(s) do gasto`);
  ok(mundo.ia.length === 10 && mundo.respostasPublicas.every((x) => x === 'Escrita pela IA: corre no direct!'), 'com orçamento, a resposta de cada comentário é a da IA', `${mundo.ia.length} chamadas à IA`);
  ok(mundo.directs.length === 10 && mundo.directs.every((d) => /\/l\/posts-[ab]-/.test(d.links[0]) && /[?&]p=[a-f0-9]{10}/.test(d.links[0])), 'cada direct levou o link curto da versão com o código da pessoa');
  console.log(`       ${chamadasFeitas(env)} chamadas externas contadas nos 10 directs`);

  // Sem as vendas (a leitura falha): tudo sai, e a escolha volta a ser a dos cliques.
  c = await novoCenario({ pendentes: 10 });
  mundo.falhar = (metodo, caminho) => caminho === 'pedidos';
  semente(21);
  feito = await calado(() => enviarRespostas(comContador(ENV_PAGO)));
  ok(feito.enviadas === 10 && saiu('a') >= 7, 'a leitura de vendas falha: os 10 saem e a escolha é a de antes (ganha a de mais cliques)', `A ${saiu('a')}, B ${saiu('b')}`);
  ok(contar('GET pedidos') === 1, 'e a leitura que falhou não se repete a cada direct', `${contar('GET pedidos')} tentativa(s)`);

  // Teto de gasto já usado: nenhum direct deixa de sair, só a IA da resposta pública que para.
  c = await novoCenario({ pendentes: 10 });
  mundo.gastoHoje = 2.4; // o teto padrão é de 2 dólares por dia
  semente(22);
  feito = await enviarRespostas(comContador(ENV_PAGO));
  ok(feito.enviadas === 10 && mundo.directs.length === 10, 'teto do dia já usado: os 10 directs saem do mesmo jeito', JSON.stringify(feito));
  ok(mundo.ia.length === 0, 'e a IA não é chamada nenhuma vez', `${mundo.ia.length} chamadas`);
  ok(mundo.respostasPublicas.length === 10 && mundo.respostasPublicas.every((x) => /^Pronta da versão [AB]$/.test(x)), 'cada comentário recebe uma das respostas prontas da versão', [...new Set(mundo.respostasPublicas)].join(' | '));
  ok(contar('rpc/escritorio_resumo') === 1, 'o gasto do dia foi lido uma vez só', `${contar('rpc/escritorio_resumo')}`);

  // Não deu para ler o gasto do dia: não bloqueia (segue como era).
  c = await novoCenario({ pendentes: 3 });
  mundo.falhar = (metodo, caminho) => caminho === 'rpc/escritorio_resumo';
  feito = await calado(() => enviarRespostas(comContador(ENV_PAGO)));
  ok(feito.enviadas === 3 && mundo.ia.length === 3 && contar('rpc/escritorio_resumo') === 1, 'falha ao ler o gasto: a IA responde como antes, e a leitura não se repete a cada direct', `${mundo.ia.length} chamadas à IA, ${contar('rpc/escritorio_resumo')} tentativa(s)`);

  // O minuto contado do plano grátis: nenhuma chamada a mais do que antes.
  c = await novoCenario({ pendentes: 3 });
  env = comContador(ENV);
  feito = await enviarRespostas(env);
  ok(feito.enviadas === 3 && contar('GET pedidos') === 0 && contar('rpc/escritorio_resumo') === 0, 'no plano grátis o envio não ganha nenhuma chamada: nem vendas nem gasto são lidos no minuto contado', `${chamadasFeitas(env)} chamadas para 3 directs`);
  ok(chamadasFeitas(env) <= 10 + 7 * 3, 'e cabe no custo previsto do envio (10 fixas e 7 por direct)', `${chamadasFeitas(env)}`);

  // ---------------------------------------------------------------- 5. o teto de gasto de IA
  secao('5. Teto de gasto de IA: resposta pública, versões e plano');
  const frase = () => respostaPublicaIA(ENV, { comentario: 'POSTS', palavra: 'POSTS', titulo: 'Material', exemplos: ['Te mandei no direct!'] });
  await novoCenario();
  mundo.gastoHoje = 0.3;
  let texto = await frase();
  ok(texto === 'Escrita pela IA: corre no direct!' && mundo.ia.length === 1, 'resposta pública com orçamento: a IA escreve');
  await frase(); await frase();
  ok(contar('rpc/escritorio_resumo') === 1 && mundo.ia.length === 3, 'três respostas em seguida: o gasto do dia é lido uma vez (fica 1 minuto na memória)');
  await novoCenario();
  mundo.gastoHoje = 2;
  texto = await frase();
  ok(texto === null && mundo.ia.length === 0, 'resposta pública sem orçamento: devolve vazio e não chama a IA');
  await novoCenario();
  mundo.falhar = (metodo, caminho) => caminho === 'rpc/escritorio_resumo';
  texto = await calado(frase);
  ok(texto === 'Escrita pela IA: corre no direct!', 'resposta pública sem conseguir ler o gasto: segue como antes');

  const versoes = () => escreverVariantesIA(ENV, { palavra: 'POSTS', titulo: 'Material', legenda: 'Comenta POSTS', modo: 'direto', quantas: 2 });
  await novoCenario();
  mundo.gastoHoje = 0.3;
  let escritas2 = await versoes();
  ok(escritas2.length === 2 && escritas2[0].origem === 'ia' && mundo.ia.join() === 'gravar_versoes', 'versões com orçamento: o Claude escreve as duas');
  await novoCenario();
  mundo.gastoHoje = 1.98;
  let e = await recusa(versoes);
  ok(!!e && e.status === 409 && mundo.ia.length === 0 && /gasto de IA de hoje já chegou a US\$ 1,98 do teto de US\$ 2,00/.test(e.message) && /Escreva à mão/.test(e.message) && !/[—–]/.test(e.message), 'versões sem orçamento: não chama a IA e diz o motivo', e && e.message);
  // A resposta pública guardou o gasto há pouco; o botão do painel lê de novo (o dono pode ter aumentado o teto).
  await novoCenario();
  mundo.gastoHoje = 2.5;
  await frase();
  tab('config').push({ chave: 'escritorio', valor: { teto_dia_usd: 10 } });
  escritas2 = await versoes();
  ok(escritas2.length === 2, 'o dono aumenta o teto e aperta o botão de novo: escreve na hora, sem esperar a memória');
  await novoCenario();
  mundo.falhar = (metodo, caminho) => caminho === 'rpc/escritorio_resumo';
  escritas2 = await calado(versoes);
  ok(escritas2.length === 2, 'versões sem conseguir ler o gasto: segue como antes');

  const ha4dias = Date.now() - 4 * DIA;
  await novoCenario({ vendasNaB: false });
  mundo.gastoHoje = 1.9;
  mundo.chamadas = [];
  e = await recusa(() => gerarPlano(ENV));
  ok(!!e && e.status === 409 && mundo.ia.length === 0 && /US\$ 1,90 do teto de US\$ 2,00/.test(e.message) && /plano não foi gerado/.test(e.message) && !/[—–]/.test(e.message), 'plano sem orçamento: não chama a IA e diz o motivo', e && e.message);
  ok(mundo.chamadas.length === 2 && !tab('config').some((x) => x.chave === 'plano_ia'), 'e para antes de juntar os números (só as 2 leituras do gasto), sem gravar nada', mundo.chamadas.join(', '));
  tab('config').push({ chave: 'plano_ia', valor: { criado_em: iso(ha4dias), ideias: [{ id: 'velha' }] } });
  let p = await planoDaSemana(ENV);
  ok(p === 'sem orçamento' && tab('config').find((x) => x.chave === 'plano_ia').valor.ideias[0].id === 'velha', 'no relógio, o plano de 4 dias sem orçamento não é erro: fica o anterior e tenta de novo depois', JSON.stringify(p));
  mundo.gastoHoje = 0.5;
  p = await planoDaSemana(ENV);
  const gravado = tab('config').find((x) => x.chave === 'plano_ia').valor;
  ok(p && p.gerado === 1 && mundo.ia.join() === 'entregar_plano' && gravado.ideias[0].palavra === 'MES', 'com orçamento, o plano é gerado e gravado', JSON.stringify(p));
  ok(tab('consumo_ia').length === 1 && tab('consumo_ia')[0].origem === 'plano', 'e o gasto dele fica anotado (é o que o teto soma)');
  await novoCenario({ vendasNaB: false });
  mundo.falhar = (metodo, caminho) => caminho === 'rpc/escritorio_resumo';
  p = await calado(() => gerarPlano(ENV));
  ok(!!p && p.ideias.length === 1, 'plano sem conseguir ler o gasto: segue como antes');
  await novoCenario({ vendasNaB: false });
  tab('config').push({ chave: 'escritorio', valor: { teto_dia_usd: 0 } });
  e = await recusa(() => gerarPlano(ENV));
  texto = await frase();
  ok(!!e && e.status === 409 && texto === null && mundo.ia.length === 0, 'teto em zero (o dono desligou o gasto): nem plano nem resposta pública chamam a IA');

  // ---------------------------------------------------------------- 6. o botão do mini curso leva a versão
  secao('6. O botão do mini curso leva a versão da mensagem');
  // A oferta do mini curso ligada: é ela que põe o segundo botão no direct.
  const comOferta = (extra = {}) => {
    tab('config').push({ chave: 'oferta', valor: { ativo: true, landing_slug: 'posts-automaticos', ...extra } });
    tab('landing_pages').push({ slug: 'posts-automaticos', status: 'publicado', titulo: 'Posts automáticos', produto: { nome: 'Posts automáticos', ativo: true, chamada: '', preco_centavos: 3790, imagem_url: null } });
  };
  const partes = (url) => { const u = new URL(url); return { caminho: u.pathname, ...Object.fromEntries(u.searchParams) }; };
  const codigoDoBotao = (url) => (String(url).match(/\/l\/([a-z0-9-]+)/) || [])[1] || null;
  const versaoDoDirect = (d) => (tab('respostas_gatilho').find((x) => x.comentario_id === d.comentario) || {}).variante;
  c = await novoCenario({ pendentes: 6, vendasNaB: false });
  comOferta();
  semente(31);
  env = comContador(ENV_PAGO);
  feito = await enviarRespostas(env);
  const chamadasDe6 = chamadasFeitas(env);
  const doCurso = mundo.directs.map((d) => partes(d.links[1] || 'https://sem-botao.invalid/'));
  ok(feito.enviadas === 6 && mundo.directs.every((d) => d.links.length === 2 && codigoDoBotao(d.links[0])), 'com a oferta ligada, cada direct sai com os dois botões: o material (link curto) e o mini curso', JSON.stringify(feito));
  ok(doCurso.every((p) => p.caminho === '/cursos/posts-automaticos' && p.utm_source === 'instagram' && p.utm_medium === 'dm' && p.utm_campaign === 'posts' && p.utm_content === 'curso' && /^[a-f0-9]{10}$/.test(p.p || '')), 'o botão do mini curso continua com as marcas de sempre: instagram, dm, a palavra, "curso" e a pessoa', JSON.stringify(doCurso[0]));
  ok(mundo.directs.every((d, i) => doCurso[i].l === codigoDoBotao(d.links[0]) && doCurso[i].utm_term === c.post), 'e agora leva a versão: o código do link curto do material do mesmo direct, e o post', JSON.stringify(doCurso[0]));
  ok(mundo.directs.every((d, i) => { const l = tab('links').find((x) => x.codigo === doCurso[i].l); return l && l.gatilho_id === c.gid && l.variante === versaoDoDirect(d); }), 'o código é o da versão que saiu para aquela pessoa (confere com o registro do envio)');
  // A visita de verdade: a página de venda manda o endereço para /api/toque, que lê as marcas e grava (origem.js).
  const um6 = mundo.directs[0];
  const marcas6 = marcasDe(new URL(um6.links[1]));
  ok(marcas6 && marcas6.conteudo === 'curso' && marcas6.campanha === 'posts' && marcas6.meio === 'dm' && marcas6.termo === c.post && marcas6.link === codigoDoBotao(um6.links[0]) && canalDe(marcas6) === 'Direct do Comenta X', 'a visita lê as marcas iguais (canal "Direct do Comenta X", conteúdo "curso") e guarda o código da versão', JSON.stringify(marcas6));
  ok(marcasDe(new URL('https://agenciasetup.com.br/cursos/posts-automaticos?utm_source=instagram&utm_medium=dm&utm_campaign=posts&utm_content=curso&l=Posts%20B%3Cx%3E')).link === null, 'código fora do formato dos links curtos não é guardado');
  await registrarToque(ENV, 'visitante6a', marcas6, { pagina: '/cursos/posts-automaticos' });
  const origem6 = await toquesDoVisitante(ENV, 'visitante6a');
  ok(origem6.lista.length === 1 && origem6.ultimo.link === marcas6.link && origem6.ultimo.conteudo === 'curso' && origem6.ultimo.pessoa === marcas6.pessoa, 'o toque gravado leva o código no campo "link", o mesmo que o clique no link curto preenche', JSON.stringify(origem6.ultimo));
  const pagoOntem = iso(Date.now() - 2 * HORA);
  const comprou = (extra) => { const p = { id: crypto.randomUUID(), aluno_id: crypto.randomUUID(), status: 'pago', teste: false, moeda: 'brl', total_centavos: 3790, pago_em: pagoOntem, criado_em: pagoOntem, itens: [], toques: [], ...extra }; tab('pedidos').push(p); return p; };
  const pedidoNovo = comprou({ toques: origem6.lista, primeiro_toque: origem6.primeiro, ultimo_toque: origem6.ultimo });
  esquecerVendas();
  mundo.chamadas = [];
  v = await vendasDasVersoes(ENV);
  const versaoDoUm = versaoDoDirect(um6);
  ok(v && v[c.gid] && v[c.gid][versaoDoUm] && v[c.gid][versaoDoUm].vendas === 1 && Object.keys(v[c.gid]).length === 1, `a venda pelo botão do mini curso vai para a versão que saiu no direct (${String(versaoDoUm).toUpperCase()})`, JSON.stringify(v && v[c.gid]));
  ok(mundo.chamadas.join(', ') === 'GET pedidos?toques, GET links', 'pela pista direta: duas leituras, sem procurar a pessoa no follow-up', mundo.chamadas.join(', '));
  // O pedido de antes: o botão só levava a pessoa. Continua indo para a versão do último direct que ela recebeu.
  // Quem comprou recebeu, há 3 dias, a outra versão (uma das 40 que o cenário já traz como enviadas).
  const outraVersao = versaoDoUm === 'a' ? 'b' : 'a';
  const dela6 = tab('respostas_gatilho').find((x) => x.status === 'enviada' && x.variante === outraVersao && /^antigo/.test(x.comentario_id));
  const pedidoAntigo = comprou({ toques: [{ quando: iso(Date.now() - 3 * HORA), origem: 'instagram', meio: 'dm', campanha: 'posts', conteudo: 'curso', termo: null, pessoa: await codigoDaPessoa('br', dela6.usuario), link: null, clid: null, pagina: '/cursos/posts-automaticos' }] });
  pedidoAntigo.ultimo_toque = pedidoAntigo.toques[0];
  tab('followups').push({ id: crypto.randomUUID(), perfil: 'br', usuario: dela6.usuario, pedido_id: pedidoAntigo.id, comprou_em: pagoOntem, compra_por: 'link' });
  esquecerVendas();
  mundo.chamadas = [];
  v = await vendasDasVersoes(ENV);
  ok(v[c.gid][outraVersao] && v[c.gid][outraVersao].vendas === 1 && v[c.gid][versaoDoUm].vendas === 1, `pedido antigo, só com a pessoa: continua indo para a versão do último direct dela (${outraVersao.toUpperCase()}), como antes`, JSON.stringify(v[c.gid]));
  ok(mundo.chamadas.join(', ') === 'GET pedidos?toques, GET links, GET followups, GET respostas_gatilho', 'e a reserva é a de antes: o follow-up e os directs que a pessoa recebeu', mundo.chamadas.join(', '));
  // Em Vendas (acoes-area.js) nada muda de nome: canal, campanha e conteúdo iguais para o pedido novo e para o antigo.
  // E a pessoa que leva o complemento depois (o pedido herda a origem) conta uma vez, com o dinheiro dos dois.
  comprou({ aluno_id: pedidoNovo.aluno_id, total_centavos: 2990, toques: origem6.lista, primeiro_toque: origem6.primeiro, ultimo_toque: origem6.ultimo, pedido_origem: pedidoNovo.id });
  let resumo6 = await resumoVendas(ENV, { dias: 30 });
  const linha6 = (lista, nome) => lista.find((x) => x.nome === nome) || {};
  ok(linha6(resumo6.conteudos, 'curso').vendas === 2 && linha6(resumo6.conteudos, 'curso').centavos === 3790 + 3790 + 2990 && resumo6.conteudos.length === 1, 'Vendas, por conteúdo: "curso" aparece igual, com 2 pessoas (a do complemento conta uma vez) e a receita dos 3 pedidos', JSON.stringify(resumo6.conteudos));
  ok(linha6(resumo6.canais, 'Direct do Comenta X').vendas === 2 && linha6(resumo6.canais, 'Direct do Comenta X').centavos === 10570 && linha6(resumo6.campanhas, 'posts').vendas === 2 && linha6(resumo6.campanhas, 'posts').centavos === 10570, 'Vendas, por canal e por campanha: "Direct do Comenta X" e a palavra, a mesma conta', JSON.stringify({ canais: resumo6.canais, campanhas: resumo6.campanhas }));
  ok(resumo6.numeros.pagos === 3 && resumo6.numeros.compradores === 2 && resumo6.numeros.faturamento_centavos === 10570 && resumo6.origens.length === 1 && resumo6.origens[0].origem === 'Direct do Comenta X' && resumo6.origens[0].vendas === 2 && resumo6.origens[0].centavos === 10570, 'o topo continua contando pedidos (3) e diz quantas pessoas são (2); a receita é a de todos', JSON.stringify({ numeros: resumo6.numeros, origens: resumo6.origens }));
  ok(linha6(resumo6.canais, 'Direct do Comenta X').visitas === 1 && !('compradores' in linha6(resumo6.canais, 'Direct do Comenta X')), 'as visitas do canal continuam contando gente, e a conta não vaza para a resposta', JSON.stringify(resumo6.canais));
  const filtrado6 = await resumoVendas(ENV, { dias: 30, conteudo: 'curso' });
  ok(filtrado6.numeros.pagos === 3 && (await resumoVendas(ENV, { dias: 30, conteudo: 'curso-topo' })).numeros.pagos === 0, 'o filtro de conteúdo "curso" continua achando esses pedidos');
  // Com o botão do curso em cima ("curso_primeiro"): a marca é "curso-topo" e a versão vai do mesmo jeito.
  c = await novoCenario({ pendentes: 2, vendasNaB: false });
  comOferta({ curso_primeiro: true });
  semente(32);
  env = comContador(ENV_PAGO);
  feito = await enviarRespostas(env);
  const chamadasDe2 = chamadasFeitas(env);
  const topo6 = mundo.directs.map((d) => ({ curso: partes(d.links[0]), material: codigoDoBotao(d.links[1]) }));
  ok(feito.enviadas === 2 && topo6.every((x) => x.curso.utm_content === 'curso-topo' && x.curso.l === x.material && !!x.material && x.curso.utm_term === c.post), 'com o curso em cima: "curso-topo" no primeiro botão, com o código da versão do material que vem embaixo', JSON.stringify(topo6[0]));
  const marcasTopo = marcasDe(new URL(mundo.directs[0].links[0]));
  await registrarToque(ENV, 'visitante6b', marcasTopo, { pagina: '/cursos/posts-automaticos' });
  const origemTopo = await toquesDoVisitante(ENV, 'visitante6b');
  comprou({ toques: origemTopo.lista, ultimo_toque: origemTopo.ultimo });
  resumo6 = await resumoVendas(ENV, { dias: 30 });
  esquecerVendas();
  v = await vendasDasVersoes(ENV);
  ok(linha6(resumo6.conteudos, 'curso-topo').vendas === 1 && v[c.gid][versaoDoDirect(mundo.directs[0])].vendas === 1, '"curso-topo" aparece igual em Vendas e a venda cai na versão certa', JSON.stringify({ conteudos: resumo6.conteudos, versoes: v[c.gid] }));
  // Nenhuma leitura a mais por direct: 4 directs a mais custam o mesmo de sempre (até 7 chamadas cada).
  ok((chamadasDe6 - chamadasDe2) / 4 <= 7, 'levar a versão no botão não custa chamada nenhuma por direct', `${chamadasDe2} chamadas para 2 directs, ${chamadasDe6} para 6`);
  // Material de fora do site não tem link curto: o botão do curso sai sem o código e a conta fica na reserva (a pessoa).
  c = await novoCenario({ pendentes: 1, vendasNaB: false });
  comOferta();
  Object.assign(tab('gatilhos')[0], { recurso: null, link: 'https://exemplo.com/material.pdf' });
  feito = await enviarRespostas(comContador(ENV_PAGO));
  const fora6 = partes((mundo.directs[0] || { links: [] }).links[1] || 'https://sem-botao.invalid/');
  ok(feito.enviadas === 1 && fora6.utm_content === 'curso' && !('l' in fora6) && /^[a-f0-9]{10}$/.test(fora6.p || ''), 'material de fora do site (sem link curto): o botão do curso sai sem o código, só com a pessoa', JSON.stringify(fora6));
} catch (e) {
  falhas++;
  console.error = erroDoConsole;
  console.error('\nO ensaio parou com erro:', e && (e.stack || e.message));
}

Math.random = sorteioDoNode;
console.log(`\n${feitos - falhas} de ${feitos} conferências passaram.${falhas ? ` ${falhas} FALHARAM.` : ''}`);
process.exit(falhas ? 1 : 0);
