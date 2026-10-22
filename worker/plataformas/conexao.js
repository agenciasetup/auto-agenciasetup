// Conectar uma conta de rede: o painel pede o endereço de login da rede, a rede volta em /api/redes/:id/retorno.
// O "state" vai assinado (mesmo selo do OAuth do conector): ninguém de fora fabrica uma volta.
import { auditar, exigir } from '../nucleo/auth.js';
import { cifrar } from '../nucleo/cripto.js';
import { db } from '../nucleo/db.js';
import { abrir, assinar, oauthLigado } from '../nucleo/oauth.js';
import { Erro } from '../nucleo/util.js';
import { configurada, plataforma } from './index.js';

const VIDA_ESTADO = 15 * 60;

export async function iniciarConexao(x) {
  exigir(x.u, 'redes.conectar');
  const m = plataforma(x.params.id);
  if (!m) throw new Erro(404, 'Rede desconhecida.');
  if (!m.disponivel || !m.urlConectar) throw new Erro(501, `${m.nome} ainda não está ligada ao sistema. O módulo dela entra numa próxima etapa.`);
  if (!configurada(x.env, m)) throw new Erro(503, `Falta configurar o app de ${m.nome} no servidor (${m.segredos.join(', ')}).`);
  if (!oauthLigado(x.env)) throw new Erro(503, 'Falta OAUTH_SEGREDO no servidor.');
  const estado = await assinar(x.env, 'rede', { p: m.id, u: x.u.id }, VIDA_ESTADO);
  const url = await m.urlConectar({ env: x.env, estado, retorno: `${x.url.origin}/api/redes/${m.id}/retorno` });
  await auditar(x.env, x.u, 'rede.conectar_inicio', `rede:${m.id}`);
  return { url };
}

// Volta da rede (navegador da pessoa, sem cabeçalho de login): vale o state assinado.
export async function retornoConexao(request, env, url, id) {
  const painel = (q) => Response.redirect(`${url.origin}/admin/redes?${q}`, 302);
  const m = plataforma(id);
  if (!m || !m.disponivel || !m.concluirConexao) return painel(`erro=${encodeURIComponent('Rede desconhecida ou ainda não disponível.')}`);
  if (url.searchParams.get('error')) return painel(`erro=${encodeURIComponent(`${m.nome} recusou: ${url.searchParams.get('error_description') || url.searchParams.get('error')}`.slice(0, 200))}`);
  const e = await abrir(env, 'rede', url.searchParams.get('state') || '');
  if (!e || e.p !== m.id) return painel(`erro=${encodeURIComponent('O pedido de conexão venceu. Tente de novo pelo painel.')}`);
  try {
    const c = await m.concluirConexao({ env, url, retorno: `${url.origin}/api/redes/${m.id}/retorno` });
    const linha = {
      plataforma: m.id, conta_id: String(c.conta_id), conta_nome: c.conta_nome || null, conta_foto: c.conta_foto || null,
      credenciais: await cifrar(env, c.credenciais), escopos: c.escopos || [], expira_em: c.expira_em || null,
      status: 'ativa', ultimo_erro: null, conectado_por: e.u,
    };
    await db.insert(env, 'conexoes', linha, { upsert: true, conflito: 'plataforma,conta_id', select: 'id' });
    const membro = await db.um(env, 'equipe', { id: `eq.${e.u}` }, 'id,nome');
    await auditar(env, { ...(membro || {}), via: 'painel' }, 'rede.conectar', `rede:${m.id}`, { conta: c.conta_nome || c.conta_id });
    return painel(`conectada=${m.id}`);
  } catch (err) {
    console.error('rede retorno', m.id, err && err.stack);
    return painel(`erro=${encodeURIComponent((err instanceof Erro ? err.message : `Não consegui concluir a conexão com ${m.nome}.`).slice(0, 200))}`);
  }
}

export async function desligarConexao(x) {
  exigir(x.u, 'redes.conectar');
  const [c] = await db.update(x.env, 'conexoes', { id: `eq.${x.params.id}` }, { status: 'desligada' }, 'id,plataforma,conta_nome');
  if (!c) throw new Erro(404, 'Conexão não encontrada.');
  await auditar(x.env, x.u, 'rede.desligar', `rede:${c.plataforma}`, { conta: c.conta_nome });
  return { ok: true };
}
