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

// ---------------------------------------------------------------- contador de chamadas externas
// O plano grátis da Cloudflare deixa cada execução fazer 50 chamadas externas, e cada ida ao banco conta. O relógio de
// minuto cria um env só daquela execução com um contador (comContador). Toda ida ao banco soma sozinha; quem chama a
// Meta ou o Claude soma com contarChamada. Antes de começar um trabalho que não pode parar no meio, a etapa pergunta a
// folga (folgaDeChamadas) e, se for pouca, deixa para a próxima execução. reservarChamadas guarda chamadas para uma
// etapa que roda depois. Sem contador (site, painel, aviso da Meta, relógio de 10 minutos) nada muda: a folga é infinita.
const TETO_GRATIS = 50;
const TETO_PAGO = 1000;
const SOBRA = 4; // fica fora da conta: uma chamada repetida, o registro de um erro

export function comContador(env) {
  const e = Object.create(env);
  // Um env que não se deixa herdar segue sem contador, como era antes.
  if (e.SUPABASE_URL !== env.SUPABASE_URL) return env;
  e.__chamadas = { n: 0, reserva: 0, teto: (env.WORKERS_PAGO === '1' ? TETO_PAGO : TETO_GRATIS) - SOBRA };
  return e;
}
export function contarChamada(env, n = 1) {
  if (env && env.__chamadas) env.__chamadas.n += Math.max(0, Number(n) || 0);
}
export function folgaDeChamadas(env) {
  const c = env && env.__chamadas;
  return c ? c.teto - c.reserva - c.n : Infinity;
}
// n positivo guarda, n negativo solta (a etapa que tinha a reserva vai rodar agora).
export function reservarChamadas(env, n) {
  if (env && env.__chamadas) env.__chamadas.reserva = Math.max(0, env.__chamadas.reserva + (Number(n) || 0));
}
export const chamadasFeitas = (env) => (env && env.__chamadas ? env.__chamadas.n : null);

async function pedir(env, caminho, opcoes = {}) {
  contarChamada(env);
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
    contarChamada(env);
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1${caminho}`, { headers: cabecalhos(env, { Prefer: 'count=exact' }) });
    if (!r.ok) { console.error('supabase', r.status, (await r.text()).slice(0, 300)); throw new Erro(502, 'O banco recusou a consulta.'); }
    const total = Number((r.headers.get('content-range') || '').split('/')[1] || 0);
    return { linhas: await r.json(), total };
  },
  async um(env, tabela, filtros, select = '*') {
    const r = await pedir(env, `/${tabela}${qs(filtros, { select, limit: 1 })}`);
    return r && r[0] ? r[0] : null;
  },
  // upsert: junta com o que já existe. ignorar: o que já existe fica como está (devolve só as linhas novas).
  insert(env, tabela, dados, { upsert, ignorar, conflito, select = '*' } = {}) {
    const prefer = ['return=representation'];
    if (upsert) prefer.push('resolution=merge-duplicates');
    else if (ignorar) prefer.push('resolution=ignore-duplicates');
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
  // Apagar de verdade só o que é do próprio aluno (anotação) ou dado temporário; conteúdo se arquiva.
  apagar(env, tabela, filtros) {
    if (!filtros || !Object.keys(filtros).length) throw new Erro(500, 'apagar sem filtro');
    return pedir(env, `/${tabela}${qs(filtros)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  },
  rpc(env, nome, args = {}) {
    return pedir(env, `/rpc/${nome}`, { method: 'POST', body: JSON.stringify(args) });
  },
};

// Auth do Supabase (admin): gerar link de convite ou de troca de senha, criar e apagar logins.
export async function authAdmin(env, caminho, opcoes = {}) {
  contarChamada(env);
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
  contarChamada(env);
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
