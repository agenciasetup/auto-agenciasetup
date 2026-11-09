// Conectar uma conta de rede: o painel pede o endereço de login da rede, a rede volta em /api/redes/:id/retorno.
// O "state" vai assinado (mesmo selo do OAuth do conector): ninguém de fora fabrica uma volta.
import { auditar, exigir } from '../nucleo/auth.js';
import { cifrar } from '../nucleo/cripto.js';
import { db } from '../nucleo/db.js';
import { abrir, assinar, oauthLigado } from '../nucleo/oauth.js';
import { Erro, corpoJson } from '../nucleo/util.js';
import { PERFIS, perfilDe, perfilValido } from '../lib/perfis.js';
import { configurada, plataforma } from './index.js';

const VIDA_ESTADO = 15 * 60;

// O perfil (lib/perfis.js) vai dentro do state assinado: a conta nova entra no perfil de onde a pessoa clicou.
export async function iniciarConexao(x) {
  exigir(x.u, 'redes.conectar');
  const m = plataforma(x.params.id);
  if (!m) throw new Erro(404, 'Rede desconhecida.');
  if (!m.disponivel || !m.urlConectar) throw new Erro(501, `${m.nome} ainda não está ligada ao sistema. O módulo dela entra numa próxima etapa.`);
  if (!configurada(x.env, m)) throw new Erro(503, `Falta configurar o app de ${m.nome} no servidor (${m.segredos.join(', ')}).`);
  if (!oauthLigado(x.env)) throw new Erro(503, 'Falta OAUTH_SEGREDO no servidor.');
  const d = await corpoJson(x.request).catch(() => ({}));
  if (d.perfil !== undefined && d.perfil !== null && d.perfil !== '' && !PERFIS[d.perfil]) throw new Erro(400, 'Perfil desconhecido. Use br (Agência Setup, Brasil) ou en (Setup Agency, inglês).');
  const perfil = perfilValido(d.perfil);
  const estado = await assinar(x.env, 'rede', { p: m.id, u: x.u.id, f: perfil }, VIDA_ESTADO);
  const url = await m.urlConectar({ env: x.env, estado, retorno: `${x.url.origin}/api/redes/${m.id}/retorno` });
  await auditar(x.env, x.u, 'rede.conectar_inicio', `rede:${m.id}`, { perfil });
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
  // Pedido de antes dos perfis (sem "f"): o do Brasil.
  const perfil = perfilValido(e.f);
  try {
    // Uma conta (Instagram) ou várias de uma vez (Facebook: cada Página liberada vira uma conexão).
    const r = await m.concluirConexao({ env, url, retorno: `${url.origin}/api/redes/${m.id}/retorno` });
    const contas = Array.isArray(r) ? r : [r];
    // Conta que já estava conectada (e não desligada) continua no perfil dela: entrar com a conta errada não muda o
    // destino das peças agendadas. Mudar de perfil é uma ação à parte (Redes > Mudar de perfil).
    const ids = contas.map((c) => String(c.conta_id)).filter((id) => /^[\w-]{1,64}$/.test(id));
    const antes = ids.length ? await db.select(env, 'conexoes', { filtros: { plataforma: `eq.${m.id}`, conta_id: `in.(${ids.join(',')})` }, select: 'conta_id,conta_nome,perfil,status' }) : [];
    const porId = new Map(antes.map((c) => [c.conta_id, c]));
    const perfilDaConta = (id) => { const a = porId.get(id); return a && a.status !== 'desligada' ? perfilValido(a.perfil) : perfil; };
    const linhas = await Promise.all(contas.map(async (c) => ({
      plataforma: m.id, conta_id: String(c.conta_id), conta_nome: c.conta_nome || null, conta_foto: c.conta_foto || null,
      credenciais: await cifrar(env, c.credenciais), escopos: c.escopos || [], expira_em: c.expira_em || null,
      status: 'ativa', ultimo_erro: null, conectado_por: e.u, perfil: perfilDaConta(String(c.conta_id)),
    })));
    await db.insert(env, 'conexoes', linhas, { upsert: true, conflito: 'plataforma,conta_id', select: 'id' });
    const membro = await db.um(env, 'equipe', { id: `eq.${e.u}` }, 'id,nome');
    await auditar(env, { ...(membro || {}), via: 'painel' }, 'rede.conectar', `rede:${m.id}`, { conta: contas.map((c) => c.conta_nome || c.conta_id).join(', '), perfil, ...(linhas.some((l) => l.perfil !== perfil) ? { ficaram: linhas.filter((l) => l.perfil !== perfil).map((l) => `${l.conta_nome || l.conta_id}:${l.perfil}`) } : {}) });
    // O painel diz em que perfil a conta entrou e avisa quando uma conta que já existia ficou no perfil dela.
    const ficou = linhas.find((l) => l.perfil !== perfil);
    const aviso = ficou ? `&ficou=${encodeURIComponent(`${ficou.conta_nome || 'A conta'} já estava no perfil ${perfilDe(ficou.perfil).rotulo} e continua lá. Para conectar a conta do perfil ${perfilDe(perfil).rotulo}, entre na rede com ela. Para mudar a conta de perfil, use "Mudar de perfil".`.slice(0, 300))}` : '';
    return painel(`conectada=${m.id}&perfil=${perfil}${aviso}`);
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
