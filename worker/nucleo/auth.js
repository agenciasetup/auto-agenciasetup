// Quem está pedindo? Duas portas:
// 1. Painel: o token de login do Supabase (JWT ES256), conferido aqui com a chave pública do projeto.
// 2. Claude (MCP): chave "as_..." colada à mão (Claude Code) ou criada pelo login do app (OAuth). O banco guarda só o hash.
// Depois, a pessoa precisa estar na equipe e ativa. O cargo vem da equipe, nunca do token.
// Modelo: worker/nucleo/auth.js do olharondoniense.
import { db } from './db.js';
import { Erro, ehLocal, sha256 } from './util.js';
import { NOME_PAPEL, menorPapel, pode } from './permissoes.js';

let jwks = null;
let jwksEm = 0;

async function chavesPublicas(env, forcar = false) {
  if (!forcar && jwks && Date.now() - jwksEm < 10 * 60_000) return jwks;
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`, { cf: { cacheTtl: 600 } });
  if (!r.ok) throw new Erro(503, 'Não consegui conferir o login agora. Tente de novo.');
  const { keys } = await r.json();
  jwks = await Promise.all(keys.filter((k) => k.alg === 'ES256').map(async (k) => ({
    kid: k.kid,
    chave: await crypto.subtle.importKey('jwk', k, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']),
  })));
  jwksEm = Date.now();
  return jwks;
}

function b64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function conferirJwt(env, token) {
  const partes = token.split('.');
  if (partes.length !== 3) throw new Erro(401, 'Sessão inválida. Entre de novo.');
  let cab, corpo;
  try {
    cab = JSON.parse(new TextDecoder().decode(b64url(partes[0])));
    corpo = JSON.parse(new TextDecoder().decode(b64url(partes[1])));
  } catch {
    throw new Erro(401, 'Sessão inválida. Entre de novo.');
  }
  if (cab.alg !== 'ES256') throw new Erro(401, 'Sessão inválida. Entre de novo.');
  let lista = await chavesPublicas(env);
  if (!lista.find((k) => k.kid === cab.kid)) lista = await chavesPublicas(env, true);
  const k = lista.find((x) => x.kid === cab.kid);
  if (!k) throw new Erro(401, 'Sessão inválida. Entre de novo.');
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k.chave, b64url(partes[2]), new TextEncoder().encode(`${partes[0]}.${partes[1]}`));
  if (!ok) throw new Erro(401, 'Sessão inválida. Entre de novo.');
  const agora = Math.floor(Date.now() / 1000);
  if (!corpo.exp || corpo.exp < agora - 30) throw new Erro(401, 'Sua sessão expirou. Entre de novo.', { codigo: 'expirada' });
  if (corpo.iss !== `${env.SUPABASE_URL}/auth/v1`) throw new Erro(401, 'Sessão de outro projeto.');
  if (corpo.role !== 'authenticated') throw new Erro(401, 'Sessão inválida.');
  return corpo;
}

const COLUNAS = 'id,auth_id,email,nome,papel,ativo,ultimo_acesso';

// Devolve { id, nome, email, papel, via, chave_id? } ou lança 401/403.
// Chave sem dono (equipe_id vazio) é a "chave da casa", criada por scripts/nova-chave.mjs.
export async function quemPede(request, env, ctx, { aceitaChave = false } = {}) {
  if (env.DEV_USUARIO && ehLocal(request, env)) {
    const m = await db.um(env, 'equipe', { id: `eq.${env.DEV_USUARIO}` }, COLUNAS);
    if (m) return { ...m, via: 'painel' };
  }
  const h = request.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) throw new Erro(401, 'Entre para continuar.');

  if (token.startsWith('as_')) {
    if (!aceitaChave) throw new Erro(401, 'Chave do conector só vale no Claude. No painel, entre com e-mail e senha.');
    const hash = await sha256(token);
    const chave = await db.um(env, 'chaves_api', { hash: `eq.${hash}`, revogada_em: 'is.null' }, 'id,nome,equipe_id,papel,expira_em,usos,oauth_codigo');
    if (!chave || (chave.expira_em && new Date(chave.expira_em) < new Date())) throw new Erro(401, 'Chave do conector inválida, vencida ou revogada.');
    ctx.waitUntil(db.update(env, 'chaves_api', { id: `eq.${chave.id}` }, { ultimo_uso: new Date().toISOString(), usos: (chave.usos || 0) + 1 }, 'id').catch(() => {}));
    if (!chave.equipe_id) {
      return { id: null, nome: chave.nome, email: null, papel: chave.papel, ativo: true, via: 'mcp', chave_id: chave.id, conector: false, casa: true };
    }
    const m = await db.um(env, 'equipe', { id: `eq.${chave.equipe_id}` }, COLUNAS);
    if (!m || !m.ativo) throw new Erro(403, 'A pessoa dona desta chave não está mais ativa na equipe.');
    return { ...m, papel: menorPapel(chave.papel, m.papel), via: 'mcp', chave_id: chave.id, conector: !!chave.oauth_codigo };
  }

  const jwt = await conferirJwt(env, token);
  let m = await db.um(env, 'equipe', { auth_id: `eq.${jwt.sub}` }, COLUNAS);
  // Primeiro login de quem foi convidado: liga o login à linha da equipe pelo e-mail.
  if (!m && jwt.email) {
    const pelo = await db.um(env, 'equipe', { email: `eq.${String(jwt.email).toLowerCase()}`, auth_id: 'is.null' }, COLUNAS);
    if (pelo) [m] = await db.update(env, 'equipe', { id: `eq.${pelo.id}` }, { auth_id: jwt.sub }, COLUNAS);
  }
  if (!m) throw new Erro(403, 'Seu login não está ligado a ninguém da equipe. Peça um convite ao administrador.');
  if (!m.ativo) throw new Erro(403, 'Seu acesso foi desativado. Fale com o administrador.');
  if (!m.ultimo_acesso || Date.now() - new Date(m.ultimo_acesso).getTime() > 10 * 60_000) {
    ctx.waitUntil(db.update(env, 'equipe', { id: `eq.${m.id}` }, { ultimo_acesso: new Date().toISOString() }, 'id').catch(() => {}));
  }
  return { ...m, via: 'painel' };
}

export function exigir(usuario, acao) {
  if (!pode(usuario.papel, acao)) throw new Erro(403, `O cargo ${NOME_PAPEL[usuario.papel] || usuario.papel} não permite fazer isso.`, { acao });
}

// Registro do que mudou. "quem" é legível; equipe_id e via ligam ao autor.
export async function auditar(env, usuario, acao, alvo, detalhes = {}) {
  try {
    const quem = !usuario ? 'sistema' : usuario.via === 'mcp' ? `Claude (${usuario.nome || 'chave'})` : usuario.nome || usuario.email || 'painel';
    await db.inserirRapido(env, 'auditoria', {
      quem, acao, alvo: alvo ? String(alvo) : null, detalhes: detalhes || {},
      equipe_id: usuario && usuario.id ? usuario.id : null, via: usuario ? usuario.via || 'painel' : 'sistema',
    });
  } catch (e) {
    console.error('auditoria falhou', e.message);
  }
}
