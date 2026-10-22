// Conversa com o Supabase pela API REST (PostgREST), sempre com a chave secreta.
// O banco não deixa a chave pública fazer nada; por isso todo acesso passa por aqui.
// Modelo: worker/nucleo/db.js do olharondoniense.
import { Erro } from './util.js';

function cabecalhos(env, extra = {}) {
  const k = env.SUPABASE_SECRET_KEY;
  if (!k || !env.SUPABASE_URL) throw new Erro(503, 'O banco de dados não está configurado neste ambiente.');
  // Chave nova (sb_secret_...) vai só no apikey; a antiga (JWT) vai nos dois.
  const auth = k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` };
  return { apikey: k, ...auth, 'Content-Type': 'application/json', ...extra };
}

async function pedir(env, caminho, opcoes = {}) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1${caminho}`, { ...opcoes, headers: cabecalhos(env, opcoes.headers) });
  const t = await r.text();
  if (!r.ok) {
    let msg = t;
    try {
      const j = JSON.parse(t);
      msg = j.message || j.hint || t;
      if (j.code === '23505') throw new Erro(409, /slug/.test(j.details || j.message) ? 'Já existe um conteúdo com esse endereço. Escolha outro.' : 'Já existe um registro igual.', { codigo: 'duplicado' });
      if (j.code === '23514') throw new Erro(400, 'Algum campo está fora do formato aceito.');
    } catch (e) {
      if (e instanceof Erro) throw e;
    }
    console.error('supabase', r.status, caminho.split('?')[0], String(msg).slice(0, 500));
    throw new Erro(r.status >= 500 ? 502 : 400, 'O banco recusou a operação.');
  }
  if (!t) return null;
  return JSON.parse(t);
}

// Filtros no formato do PostgREST: { id: 'eq.123', status: 'in.(a,b)' }.
function qs(filtros = {}, extra = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...filtros, ...extra })) if (v !== undefined && v !== null) p.append(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const db = {
  async select(env, tabela, { filtros, select = '*', ordem, limite, offset, contar } = {}) {
    const caminho = `/${tabela}${qs(filtros, { select, order: ordem, limit: limite, offset })}`;
    if (!contar) return pedir(env, caminho);
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1${caminho}`, { headers: cabecalhos(env, { Prefer: 'count=exact' }) });
    if (!r.ok) { console.error('supabase', r.status, (await r.text()).slice(0, 300)); throw new Erro(502, 'O banco recusou a consulta.'); }
    const total = Number((r.headers.get('content-range') || '').split('/')[1] || 0);
    return { linhas: await r.json(), total };
  },
  async um(env, tabela, filtros, select = '*') {
    const r = await pedir(env, `/${tabela}${qs(filtros, { select, limit: 1 })}`);
    return r && r[0] ? r[0] : null;
  },
  insert(env, tabela, dados, { upsert, conflito, select = '*' } = {}) {
    const prefer = ['return=representation'];
    if (upsert) prefer.push('resolution=merge-duplicates');
    return pedir(env, `/${tabela}${qs({}, { select, on_conflict: conflito })}`, {
      method: 'POST', headers: { Prefer: prefer.join(',') }, body: JSON.stringify(dados),
    });
  },
  // Sem retorno: para registros em segundo plano.
  inserirRapido(env, tabela, dados) {
    return pedir(env, `/${tabela}`, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(dados) });
  },
  update(env, tabela, filtros, dados, select = '*') {
    if (!filtros || !Object.keys(filtros).length) throw new Erro(500, 'update sem filtro');
    return pedir(env, `/${tabela}${qs(filtros, { select })}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(dados) });
  },
  rpc(env, nome, args = {}) {
    return pedir(env, `/rpc/${nome}`, { method: 'POST', body: JSON.stringify(args) });
  },
};

// Auth do Supabase (admin): gerar link de convite ou de troca de senha, criar e apagar logins.
export async function authAdmin(env, caminho, opcoes = {}) {
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1${caminho}`, { ...opcoes, headers: cabecalhos(env, opcoes.headers) });
  const t = await r.text();
  if (!r.ok) {
    let msg = t;
    try { const j = JSON.parse(t); msg = j.msg || j.message || j.error_description || t; } catch {}
    throw new Erro(r.status === 422 || r.status === 400 ? 400 : 502, `O login do Supabase recusou: ${msg}`.slice(0, 300));
  }
  return t ? JSON.parse(t) : null;
}

// Envia um arquivo para o Storage do Supabase e devolve o endereço público.
export async function enviarArquivo(env, bucket, caminho, corpo, tipo) {
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${bucket}/${caminho}`, {
    method: 'POST',
    headers: { ...cabecalhos(env, { 'Content-Type': tipo || 'application/octet-stream' }), 'x-upsert': 'true' },
    body: corpo,
  });
  if (!r.ok) {
    console.error('storage', r.status, (await r.text()).slice(0, 300));
    throw new Erro(502, 'O armazenamento recusou o arquivo.');
  }
  return `${env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${caminho}`;
}
