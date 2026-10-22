// Login por conector do MCP (OAuth 2.1): liga a Agência Setup no app do Claude (web, computador e celular) e em
// outras IAs, cada pessoa com o próprio login do painel. A chave "as_..." colada à mão (Claude Code) continua valendo.
// Modelo: worker/nucleo/oauth.js do olharondoniense (que veio do Olhar de Fé). Mudou: prefixos (as_, asc_),
// endereço, os três cargos daqui (app que se registrou sozinho recebe no máximo Redator) e os textos.
//
// O caminho (cliente público, PKCE S256 obrigatório):
// 1. A IA chama /mcp sem chave e recebe 401 com o endereço da ficha do servidor (/.well-known/oauth-protected-resource/mcp).
// 2. A IA se apresenta pelo endereço da própria ficha publicada (CIMD: claude.ai e chatgpt.com fazem assim)
//    ou se registra em /oauth/register (DCR, para as outras).
// 3. /oauth/authorize confere o pedido e manda a pessoa para o painel (/admin/conectar), que pede login e mostra quem pede.
// 4. Com o "Permitir", o painel devolve a pessoa para a IA com um código de uso único (2 minutos).
// 5. A IA troca o código em /oauth/token por uma chave "as_..." de 1 hora e uma renovação de 90 dias, que gira a cada uso.
//
// Cada conexão é uma linha de chaves_api chamada "Conector: <app>" (com oauth_codigo preenchido), que aparece no painel
// em Claude e é desligada ali. O que não precisa ficar guardado (o pedido, o código, o registro da IA e a renovação) vai
// assinado com OAUTH_SEGREDO (HMAC). Sem OAUTH_SEGREDO, nada disto aparece: o MCP segue só com a chave colada à mão.
import { auditar, exigir } from './auth.js';
import { db } from './db.js';
import { DESCRICAO_PAPEL, NOME_PAPEL, PAPEIS, acimaOuIgual, menorPapel, pode } from './permissoes.js';
import { Erro, aleatorio, corpoJson, esc, json, sha256 } from './util.js';
import { q } from './rota.js';

const ESCOPO = 'agencia-setup';
const TETO_SEM_CONFERENCIA = 'redator';
const VIDA_ACESSO = 3600;
const VIDA_RENOVAR = 90 * 86400;
const VIDA_CODIGO = 120;
const VIDA_PEDIDO = 15 * 60;
const VIDA_MAXIMA = 365 * 86400;
const VIDA_REGISTRO = 365 * 86400;
const FOLGA_GIRO = 60;
const NOMES = { 'claude.ai': 'Claude', 'claude.com': 'Claude', 'chatgpt.com': 'ChatGPT' };
// Cópia das fichas publicadas dos apps mais usados, para quando o site do app recusa a leitura automática.
const FICHAS_CONHECIDAS = {
  'https://claude.ai/oauth/mcp-oauth-client-metadata': ['https://claude.ai/api/mcp/auth_callback'],
  'https://claude.ai/oauth/claude-code-client-metadata': ['http://localhost/callback', 'http://127.0.0.1/callback'],
  'https://chatgpt.com/oauth/client.json': ['https://chatgpt.com/connector_platform_oauth_redirect'],
};
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type, mcp-protocol-version',
  'access-control-max-age': '86400',
};

export const oauthLigado = (env) => !!(env.OAUTH_SEGREDO && env.OAUTH_SEGREDO.length >= 32);
const agora = () => Math.floor(Date.now() / 1000);
const daqui = (s) => new Date(Date.now() + s * 1000).toISOString();

// ---------------------------------------------------------------- base64url e assinatura
const utf8 = (s) => new TextEncoder().encode(s);
function b64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function deB64(s) {
  const t = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(t + '='.repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0));
}

let chaveHmac = null;
let segredoDaChave = null;
async function chave(env) {
  if (!oauthLigado(env)) throw new Erro(503, 'O login por conector não está ligado neste servidor.');
  if (!chaveHmac || segredoDaChave !== env.OAUTH_SEGREDO) {
    chaveHmac = await crypto.subtle.importKey('raw', utf8(env.OAUTH_SEGREDO), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    segredoDaChave = env.OAUTH_SEGREDO;
  }
  return chaveHmac;
}

// O tipo entra na assinatura: um código não passa por renovação, nem um pedido por código.
// Exportadas: o login das redes (worker/plataformas) usa o mesmo selo para o "state".
export async function assinar(env, tipo, dados, vida) {
  const corpo = b64(utf8(JSON.stringify({ ...dados, t: tipo, ...(vida ? { exp: agora() + vida } : {}) })));
  const sig = await crypto.subtle.sign('HMAC', await chave(env), utf8(`${tipo}.${corpo}`));
  return `${corpo}.${b64(new Uint8Array(sig))}`;
}
export async function abrir(env, tipo, s) {
  const k = await chave(env);
  if (typeof s !== 'string' || s.length > 6000) return null;
  const i = s.indexOf('.');
  if (i < 1 || s.indexOf('.', i + 1) !== -1) return null;
  try {
    if (!(await crypto.subtle.verify('HMAC', k, deB64(s.slice(i + 1)), utf8(`${tipo}.${s.slice(0, i)}`)))) return null;
    const d = JSON.parse(new TextDecoder().decode(deB64(s.slice(0, i))));
    if (!d || d.t !== tipo || (d.exp !== undefined && !(d.exp > agora()))) return null;
    return d;
  } catch {
    return null;
  }
}
const resumo = async (s) => (await sha256(String(s))).slice(0, 32);
async function desafioPkce(verificador) {
  return b64(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(verificador))));
}

// ---------------------------------------------------------------- endereços de volta (redirect_uri)
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);
const ESQUEMAS_DE_APP = new Set(['cursor:', 'vscode:', 'vscode-insiders:', 'windsurf:', 'zed:', 'claude:', 'raycast:']);
function lerUrl(s) {
  try { return new URL(s); } catch { return null; }
}
function ehLoopback(r) {
  const u = lerUrl(r);
  return !!u && u.protocol === 'http:' && LOOPBACK.has(u.hostname);
}
function redirecaoValida(r) {
  if (typeof r !== 'string' || r.length > 500) return false;
  const u = lerUrl(r);
  if (!u || u.hash || u.username || u.password) return false;
  if (u.protocol === 'https:') return !!u.hostname;
  if (u.protocol === 'http:') return LOOPBACK.has(u.hostname);
  return ESQUEMAS_DE_APP.has(u.protocol) || /^[a-z][a-z0-9+-]*(\.[a-z0-9+-]+)+:$/.test(u.protocol);
}
function mesmaRedirecao(pedida, registrada) {
  if (pedida === registrada) return true;
  if (!ehLoopback(pedida) || !ehLoopback(registrada)) return false;
  const a = new URL(pedida), b = new URL(registrada);
  return a.hostname === b.hostname && a.pathname === b.pathname && a.search === b.search;
}
function ondeVolta(r) {
  const u = lerUrl(r);
  if (!u) return '?';
  if (u.protocol === 'https:') return u.hostname;
  if (u.protocol === 'http:') return 'este computador';
  return `${u.protocol}//${u.host}`.slice(0, 80);
}

function recursoAceito(url, r) {
  return [`${url.origin}/mcp`, `${url.origin}/mcp/`, url.origin, `${url.origin}/`].includes(r);
}

// ---------------------------------------------------------------- quem é a IA (client_id)
async function fichaPublicada(url, clientId) {
  const u = lerUrl(clientId);
  if (!u || u.protocol !== 'https:' || u.pathname === '/' || u.username || u.password || u.hash || u.port) return null;
  const h = u.hostname;
  if (!h.includes('.') || /^\[|^[\d.]+$/.test(h) || h === url.hostname || h === 'agenciasetup.com.br' || h.endsWith('.agenciasetup.com.br')) return null;
  const lidas = (await lerFicha(clientId)) || FICHAS_CONHECIDAS[clientId];
  if (!lidas) return null;
  const redirecoes = lidas.filter((x) => redirecaoValida(x) && (ehLoopback(x) || (lerUrl(x).protocol === 'https:' && lerUrl(x).hostname === h))).slice(0, 10);
  if (!redirecoes.length) return null;
  return { nome: NOMES[h] || h, host: h, conferido: true, conhecido: !!NOMES[h], redirecoes };
}

async function lerFicha(clientId) {
  let r;
  try {
    r = await fetch(clientId, {
      headers: { accept: 'application/json', 'user-agent': 'AgenciaSetup/1.0 (+https://agenciasetup.com.br)' },
      redirect: 'manual', signal: AbortSignal.timeout(5000), cf: { cacheTtl: 300, cacheEverything: true },
    });
  } catch {
    return null;
  }
  if (r.status !== 200) return null;
  const texto = await lerAte(r, 10_000);
  let d;
  try { d = JSON.parse(texto); } catch { return null; }
  return d && d.client_id === clientId && Array.isArray(d.redirect_uris) ? d.redirect_uris : null;
}

async function lerAte(r, limite) {
  if (Number(r.headers.get('content-length') || 0) > limite) return null;
  const leitor = r.body && r.body.getReader();
  if (!leitor) return null;
  const partes = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > limite) { leitor.cancel().catch(() => {}); return null; }
    partes.push(value);
  }
  const tudo = new Uint8Array(total);
  let p = 0;
  for (const x of partes) { tudo.set(x, p); p += x.byteLength; }
  return new TextDecoder().decode(tudo);
}

async function cliente(env, url, clientId) {
  if (typeof clientId !== 'string' || !clientId || clientId.length > 4000) return null;
  if (clientId.startsWith('https://')) return fichaPublicada(url, clientId);
  if (clientId.startsWith('asc_')) {
    const d = await abrir(env, 'cliente', clientId.slice(4));
    if (!d || !Array.isArray(d.r)) return null;
    return { nome: d.n || null, host: null, conferido: false, conhecido: false, redirecoes: d.r };
  }
  return null;
}

// ---------------------------------------------------------------- fichas (descoberta)
function fichaRecurso(url) {
  return { resource: `${url.origin}/mcp`, authorization_servers: [url.origin], scopes_supported: [ESCOPO], bearer_methods_supported: ['header'], resource_name: 'Agência Setup' };
}
function fichaServidor(url) {
  const b = url.origin;
  return {
    issuer: b,
    authorization_endpoint: `${b}/oauth/authorize`,
    token_endpoint: `${b}/oauth/token`,
    registration_endpoint: `${b}/oauth/register`,
    revocation_endpoint: `${b}/oauth/revoke`,
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    revocation_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: [ESCOPO, 'offline_access'],
    client_id_metadata_document_supported: true,
    authorization_response_iss_parameter_supported: true,
  };
}

// O 401 do /mcp diz à IA onde está a ficha (sem ele, o app do Claude não acha o login).
export function desafio(env, url, invalido) {
  if (!oauthLigado(env)) return 'Bearer realm="agencia-setup"';
  return `Bearer ${invalido ? 'error="invalid_token", ' : ''}resource_metadata="${url.origin}/.well-known/oauth-protected-resource/mcp", scope="${ESCOPO}"`;
}

// ---------------------------------------------------------------- respostas
function voltar(destino, params) {
  const u = new URL(destino);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  return u.toString();
}
function paginaErro(texto, status = 400) {
  return new Response(
    `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Não deu para conectar | Agência Setup</title>`
    + `<body style="font:17px/1.5 -apple-system,system-ui,sans-serif;background:#0b0b0c;color:#f5f1ea;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center">`
    + `<div style="max-width:420px"><h1 style="font-weight:700">Não deu para conectar</h1><p style="color:#a39e96">${esc(texto)}</p></div>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'x-frame-options': 'DENY', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'" } },
  );
}
function erroToken(error, descricao, status = 400) {
  return json({ error, error_description: descricao }, status, CORS);
}
async function lerCorpo(request) {
  const tipo = request.headers.get('content-type') || '';
  if (tipo.includes('application/json')) return corpoJson(request, 20_000);
  const t = await request.text();
  if (t.length > 20_000) throw new Erro(413, 'Conteúdo grande demais.');
  const d = Object.fromEntries(new URLSearchParams(t));
  const h = request.headers.get('authorization') || '';
  if (!d.client_id && h.startsWith('Basic ')) {
    try { d.client_id = decodeURIComponent(atob(h.slice(6).trim()).split(':')[0]); } catch {}
  }
  return d;
}

// ---------------------------------------------------------------- rotas do servidor de login
export const ehRotaOauth = (caminho) => caminho.startsWith('/.well-known/oauth-') || caminho.startsWith('/oauth/');

export async function rotasOauth(request, env, url) {
  const caminho = url.pathname.replace(/\/+$/, '');
  const conhecido = ['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp', '/.well-known/oauth-authorization-server',
    '/oauth/authorize', '/oauth/token', '/oauth/register', '/oauth/revoke'].includes(caminho);
  if (!conhecido || !oauthLigado(env)) return json({ error: 'not_found' }, 404, CORS);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  try {
    if (caminho.startsWith('/.well-known/oauth-protected-resource')) return json(fichaRecurso(url), 200, { ...CORS, 'cache-control': 'public, max-age=300' });
    if (caminho === '/.well-known/oauth-authorization-server') return json(fichaServidor(url), 200, { ...CORS, 'cache-control': 'public, max-age=300' });
    if (caminho === '/oauth/authorize') return request.method === 'GET' ? await autorizar(env, url) : paginaErro('Use o link do app.', 405);
    if (request.method !== 'POST') return erroToken('invalid_request', 'Use POST.', 405);
    if (caminho === '/oauth/token') return await token(request, env, url);
    if (caminho === '/oauth/register') return await registrar(request, env);
    return await revogar(request, env);
  } catch (e) {
    if (!(e instanceof Erro)) console.error('oauth', caminho, e && e.stack);
    return caminho === '/oauth/authorize' ? paginaErro('Algo deu errado do nosso lado. Volte ao app e tente de novo.', 500)
      : erroToken(e instanceof Erro && e.status < 500 ? 'invalid_request' : 'server_error', e instanceof Erro ? e.message : 'Erro interno.', e instanceof Erro ? e.status : 500);
  }
}

async function registrar(request, env) {
  let d;
  try { d = await corpoJson(request, 10_000); } catch { return erroToken('invalid_client_metadata', 'Envie o registro em JSON.'); }
  const r = Array.isArray(d.redirect_uris) ? d.redirect_uris : [];
  if (!r.length || r.length > 5 || !r.every(redirecaoValida)) {
    return erroToken('invalid_redirect_uri', 'Endereços de volta aceitos: https, http só em localhost/127.0.0.1, ou o de um aplicativo instalado.');
  }
  const nome = typeof d.client_name === 'string' ? d.client_name.replace(/[\p{Cc}\p{Cf}]/gu, '').trim().slice(0, 60) : '';
  const emitido = agora();
  const id = `asc_${await assinar(env, 'cliente', { r, n: nome || undefined, i: emitido }, VIDA_REGISTRO)}`;
  return json({
    client_id: id, client_id_issued_at: emitido, client_id_expires_at: emitido + VIDA_REGISTRO, ...(nome ? { client_name: nome } : {}), redirect_uris: r,
    grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none', scope: ESCOPO,
  }, 201, CORS);
}

async function autorizar(env, url) {
  const p = url.searchParams;
  const c = await cliente(env, url, p.get('client_id'));
  if (!c) return paginaErro('Não reconheci o app que pediu a conexão. Volte a ele e tente conectar de novo.');
  let r = p.get('redirect_uri');
  if (!r && c.redirecoes.length === 1 && !ehLoopback(c.redirecoes[0])) r = c.redirecoes[0];
  if (!r || !redirecaoValida(r) || !c.redirecoes.some((x) => mesmaRedirecao(r, x))) {
    return paginaErro('O endereço de volta não confere com o que o app registrou. Volte ao app e tente de novo.');
  }
  const estado = p.get('state') || undefined;
  const erro = (error, descricao) => (!c.conferido ? paginaErro(`O app mandou um pedido inválido (${descricao}).`)
    : new Response(null, { status: 302, headers: { location: voltar(r, { error, error_description: descricao, state: estado, iss: url.origin }), 'cache-control': 'no-store' } }));
  if (p.get('response_type') !== 'code') return erro('unsupported_response_type', 'Só response_type=code.');
  const cc = p.get('code_challenge') || '';
  if (p.get('code_challenge_method') !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(cc)) return erro('invalid_request', 'PKCE com S256 é obrigatório.');
  const recurso = p.get('resource');
  if (recurso && !recursoAceito(url, recurso)) return erro('invalid_target', 'Este servidor só dá acesso ao MCP da Agência Setup.');
  if (estado && estado.length > 1000) return erro('invalid_request', 'state grande demais.');
  const app = c.conferido ? `${c.nome} (${c.host})` : `${c.nome || 'App sem nome'} (${ondeVolta(r)})`;
  const pedido = await assinar(env, 'pedido', {
    ch: await resumo(p.get('client_id')), r, cc, s: estado, app, nome: c.nome, host: c.host, cf: c.conferido ? 1 : 0, cn: c.conhecido ? 1 : 0,
  }, VIDA_PEDIDO);
  return new Response(null, { status: 302, headers: { location: `${url.origin}/admin/conectar?pedido=${encodeURIComponent(pedido)}`, 'cache-control': 'no-store' } });
}

async function token(request, env, url) {
  const d = await lerCorpo(request);
  if (d.resource && !recursoAceito(url, d.resource)) return erroToken('invalid_target', 'Este servidor só dá acesso ao MCP da Agência Setup.');
  if (d.grant_type === 'authorization_code') return trocarCodigo(env, d);
  if (d.grant_type === 'refresh_token') return renovar(env, d);
  return erroToken('unsupported_grant_type', 'Use authorization_code ou refresh_token.');
}

async function trocarCodigo(env, d) {
  const c = await abrir(env, 'codigo', d.code);
  if (!c) return erroToken('invalid_grant', 'Código inválido ou vencido. Conecte de novo.');
  if (!d.client_id || (await resumo(d.client_id)) !== c.ch) return erroToken('invalid_grant', 'Este código foi emitido para outro app.');
  if (d.redirect_uri && (await resumo(d.redirect_uri)) !== c.rh) return erroToken('invalid_grant', 'O endereço de volta não confere.');
  const v = String(d.code_verifier || '');
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(v) || (await desafioPkce(v)) !== c.cc) return erroToken('invalid_grant', 'A prova PKCE não confere.');
  const m = await db.um(env, 'equipe', { id: `eq.${c.u}` }, 'id,nome,papel,ativo');
  if (!m || !m.ativo || !pode(m.papel, 'chaves.proprias')) return erroToken('invalid_grant', 'Esta pessoa não pode mais ligar IAs ao painel.');
  const papel = menorPapel(c.p, m.papel);
  const acesso = `as_${aleatorio(40)}`;
  let linha;
  try {
    [linha] = await db.insert(env, 'chaves_api', {
      nome: `Conector: ${c.app}`.slice(0, 80), prefixo: acesso.slice(0, 7), hash: await sha256(acesso), equipe_id: m.id, papel,
      expira_em: daqui(VIDA_ACESSO), oauth_codigo: c.j,
    }, { select: 'id,hash' });
  } catch (e) {
    if (e instanceof Erro && e.status === 409) {
      // Código usado de novo: alguém pode ter copiado. A conexão feita com ele cai (OAuth 2.1, seção 4.1.2).
      await db.update(env, 'chaves_api', { oauth_codigo: `eq.${c.j}`, revogada_em: 'is.null' }, { revogada_em: new Date().toISOString() }, 'id').catch(() => {});
      return erroToken('invalid_grant', 'Este código já foi usado.');
    }
    throw e;
  }
  await auditar(env, { id: m.id, nome: m.nome, via: 'mcp' }, 'conector.ligar', `chave:${linha.id}`, { app: c.app, papel });
  return respostaToken(env, linha, acesso, c.ch);
}

async function renovar(env, d) {
  const r = await abrir(env, 'renovar', d.refresh_token);
  if (!r) return erroToken('invalid_grant', 'Renovação inválida ou vencida. Conecte de novo.');
  if (!d.client_id || (await resumo(d.client_id)) !== r.ch) return erroToken('invalid_grant', 'Esta renovação é de outro app.');
  const linha = await db.um(env, 'chaves_api', { id: `eq.${r.k}` }, 'id,hash,equipe_id,revogada_em,criado_em,expira_em');
  if (!linha || linha.revogada_em) return erroToken('invalid_grant', 'Esta conexão foi desligada. Conecte de novo.');
  if (!linha.hash.startsWith(r.h)) {
    const giradaHa = agora() - (new Date(linha.expira_em).getTime() / 1000 - VIDA_ACESSO);
    if (giradaHa > FOLGA_GIRO) {
      await db.update(env, 'chaves_api', { id: `eq.${linha.id}`, revogada_em: 'is.null' }, { revogada_em: new Date().toISOString() }, 'id').catch(() => {});
      await auditar(env, { id: linha.equipe_id, via: 'mcp' }, 'conector.renovacao_repetida', `chave:${linha.id}`, { aviso: 'Renovação já usada apareceu de novo: conexão desligada.' });
    }
    return erroToken('invalid_grant', 'Esta renovação já foi usada. Conecte de novo.');
  }
  if (Date.now() - new Date(linha.criado_em).getTime() > VIDA_MAXIMA * 1000) return erroToken('invalid_grant', 'A conexão fez um ano. Conecte de novo.');
  const m = await db.um(env, 'equipe', { id: `eq.${linha.equipe_id}` }, 'id,papel,ativo');
  if (!m || !m.ativo || !pode(m.papel, 'chaves.proprias')) return erroToken('invalid_grant', 'Esta pessoa não pode mais ligar IAs ao painel.');
  const acesso = `as_${aleatorio(40)}`;
  const [nova] = (await db.update(env, 'chaves_api', { id: `eq.${linha.id}`, hash: `eq.${linha.hash}`, revogada_em: 'is.null' },
    { hash: await sha256(acesso), prefixo: acesso.slice(0, 7), expira_em: daqui(VIDA_ACESSO) }, 'id,hash')) || [];
  if (!nova) return erroToken('invalid_grant', 'A renovação já foi usada. Conecte de novo.');
  return respostaToken(env, nova, acesso, r.ch);
}

async function respostaToken(env, linha, acesso, ch) {
  const renovacao = await assinar(env, 'renovar', { k: linha.id, h: linha.hash.slice(0, 24), ch }, VIDA_RENOVAR);
  return json({ access_token: acesso, token_type: 'Bearer', expires_in: VIDA_ACESSO, refresh_token: renovacao, scope: ESCOPO }, 200, { ...CORS, pragma: 'no-cache' });
}

async function revogar(request, env) {
  const d = await lerCorpo(request);
  const t = String(d.token || '');
  const agoraIso = new Date().toISOString();
  if (t.startsWith('as_')) {
    await db.update(env, 'chaves_api', { hash: `eq.${await sha256(t)}`, oauth_codigo: 'not.is.null', revogada_em: 'is.null' }, { revogada_em: agoraIso }, 'id').catch(() => {});
  } else {
    const r = await abrir(env, 'renovar', t);
    if (r) await db.update(env, 'chaves_api', { id: `eq.${r.k}`, hash: `like.${r.h}*`, revogada_em: 'is.null' }, { revogada_em: agoraIso }, 'id').catch(() => {});
  }
  return new Response(null, { status: 200, headers: { ...CORS, 'cache-control': 'no-store' } });
}

// ---------------------------------------------------------------- a tela "Permitir" (API do painel, com login)
function soPeloPainel(x) {
  if (x.u.via !== 'painel') throw new Erro(403, 'Conexões só são aprovadas pelo painel, com login.');
}

export async function lerPedido(x) {
  soPeloPainel(x);
  const p = await abrir(x.env, 'pedido', q(x, 'p', ''));
  if (!p) throw new Erro(410, 'Este pedido de conexão venceu ou não é válido. Volte ao app e conecte de novo.');
  const web = lerUrl(p.r).protocol === 'https:';
  return {
    app: p.cf ? p.nome : web ? ondeVolta(p.r) : 'app deste computador', declarado: p.cf ? null : p.nome || null,
    host: p.host, conferido: !!p.cf, conhecido: !!p.cn, volta: ondeVolta(p.r), local: !web,
    // Cargo sugerido: no máximo Editor (publica e aprova, sem mexer em equipe nem configuração).
    sugerido: !p.cf ? TETO_SEM_CONFERENCIA : acimaOuIgual(x.u.papel, 'editor') ? 'editor' : x.u.papel,
    pode: pode(x.u.papel, 'chaves.proprias'),
    papeis: PAPEIS.filter((pp) => acimaOuIgual(x.u.papel, pp) && pode(pp, 'chaves.proprias') && (p.cf || acimaOuIgual(TETO_SEM_CONFERENCIA, pp)))
      .map((pp) => ({ id: pp, nome: NOME_PAPEL[pp], descricao: DESCRICAO_PAPEL[pp] })),
  };
}

export async function aprovar(x) {
  soPeloPainel(x);
  const d = await corpoJson(x.request, 10_000);
  const p = await abrir(x.env, 'pedido', String(d.pedido || ''));
  if (!p) throw new Erro(410, 'Este pedido de conexão venceu. Volte ao app e conecte de novo.');
  const iss = x.url.origin;
  if (d.permitir !== true) {
    await auditar(x.env, x.u, 'conector.recusar', null, { app: p.app });
    return { destino: voltar(p.r, { error: 'access_denied', error_description: 'A conexão foi recusada.', state: p.s, iss }) };
  }
  exigir(x.u, 'chaves.proprias');
  const papel = PAPEIS.includes(d.papel) ? d.papel : x.u.papel;
  if (!acimaOuIgual(x.u.papel, papel)) throw new Erro(403, 'A conexão não pode ter cargo acima do seu.');
  if (!p.cf && !acimaOuIgual(TETO_SEM_CONFERENCIA, papel)) throw new Erro(403, 'App que se registrou sozinho recebe no máximo o cargo de Redator.');
  const codigo = await assinar(x.env, 'codigo', { u: x.u.id, p: papel, ch: p.ch, rh: await resumo(p.r), cc: p.cc, app: p.app, j: aleatorio(20) }, VIDA_CODIGO);
  await auditar(x.env, x.u, 'conector.autorizar', null, { app: p.app, papel });
  return { destino: voltar(p.r, { code: codigo, state: p.s, iss }) };
}
