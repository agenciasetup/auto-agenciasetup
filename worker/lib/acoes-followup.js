// Follow-up do direct (painel e conector), lógica em lib/followup.js. Cargo e auditoria em toda escrita.
import { auditar, exigir } from '../nucleo/auth.js';
import { listaFollowup, lerFollowup, respostasAprendidas, responderDuvida, salvarFollowup, sincronizarFollowup } from './followup.js';
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { contaAtiva, credenciaisAtivas } from '../plataformas/credenciais.js';
import { salvarAgente } from './escritorio.js';
import { MODELOS_ATENDENTE, MODOS_ATENDENTE, configAtendente, levarResposta, mandarParaFollowup, salvarConfigAtendente, simular } from './atendente.js';
import { aprenderResposta } from './colmeia.js';

const quemE = (u) => ({ quem: u.casa ? null : u.id, quemNome: u.casa ? 'Claude' : String(u.nome || '').trim().split(/\s+/)[0] });

export async function verFollowup(x, { fase, interesse, busca, perfil, limite } = {}) {
  exigir(x.u, 'followup.ver');
  const [lista, atendente] = await Promise.all([listaFollowup(x.env, { fase, interesse, busca, perfil, limite }), configAtendente(x.env)]);
  return { ...lista, atendente: { ...atendente, modos: MODOS_ATENDENTE, modelos: MODELOS_ATENDENTE } };
}

// O Atendente: ligar, desligar e escolher entre responder sozinho e só preparar a resposta.
export async function salvarAtendente(x, dados) {
  exigir(x.u, 'followup.atendente');
  const r = await salvarConfigAtendente(x.env, dados || {});
  await salvarAgente(x.env, { estado: r.ligado ? 'ativo' : 'pausado', motivo: r.ligado ? `Ligado: ${MODOS_ATENDENTE[r.modo].toLowerCase()}.` : 'Desligado no painel.' }, 'atendente', quemE(x.u)).catch(() => null);
  await auditar(x.env, x.u, 'followup.atendente', 'config:atendente', { ligado: r.ligado, modo: r.modo, modelo: r.modelo });
  return { ...r, modos: MODOS_ATENDENTE, modelos: MODELOS_ATENDENTE };
}

// O que o Atendente responderia a uma mensagem. Não manda nada e não grava nada: é para testar.
// A conta do Instagram de um perfil com o token aberto (para ler a conversa de verdade no teste).
const contaDoPerfil = (env) => async (perfil) => {
  const c = await contaAtiva(env, 'instagram', perfil).catch(() => null);
  return c ? { c, credenciais: await credenciaisAtivas(env, c.conexao) } : null;
};

export async function testarAtendente(x, { texto, nome, usuario, modelo, ha_min } = {}) {
  exigir(x.u, 'followup.editar');
  return simular(x.env, { texto, nome, usuario, modelo, ha_min, contaDe: contaDoPerfil(x.env) });
}

// Manda uma mensagem pela API do Instagram para alguém da lista (só dentro das 24 horas da última mensagem da pessoa).
export async function mandarFollowupPeloSistema(x, id, texto) {
  exigir(x.u, 'followup.editar');
  const f = await db.um(x.env, 'followups', { id: `eq.${String(id || '')}` }, 'id,perfil,usuario,igsid,ultima_em,proxima_mensagem');
  if (!f) throw new Erro(404, 'Não encontrado.');
  const conta = await contaAtiva(x.env, 'instagram', f.perfil);
  if (!conta || !conta.m.mandarDirect) throw new Erro(409, 'O Instagram desse perfil não está conectado.');
  const credenciais = await credenciaisAtivas(x.env, conta.conexao);
  const r = await mandarParaFollowup(x.env, f, texto || f.proxima_mensagem, { conta, credenciais, ...quemE(x.u) });
  await auditar(x.env, x.u, 'followup.mandar_api', `followup:${f.id}`, {});
  return r;
}

export async function lerUmFollowup(x, { id, usuario, perfil } = {}) {
  exigir(x.u, 'followup.ver');
  return (await lerFollowup(x.env, { id, usuario, perfil })) || { aviso: 'Essa pessoa ainda não está na lista.' };
}

export async function salvarUmFollowup(x, dados, id) {
  exigir(x.u, 'followup.editar');
  const r = await salvarFollowup(x.env, dados || {}, { id, ...quemE(x.u) });
  await auditar(x.env, x.u, r.criado ? 'followup.criar' : 'followup.editar', `followup:${r.id}`, { fase: dados.fase || null, mandei: !!dados.mandei, duvida: !!dados.duvida });
  return r;
}

export async function responderDuvidaFollowup(x, id, resposta) {
  exigir(x.u, 'followup.editar');
  const antes = await db.um(x.env, 'followups', { id: `eq.${String(id || '')}` }, 'id,perfil,usuario,igsid,ultima_em,duvida,interesse').catch(() => null);
  const r = await responderDuvida(x.env, id, resposta, quemE(x.u));
  // A resposta do dono entra na Colmeia (vale para todos os vendedores, para sempre) e, se a pessoa ainda está dentro
  // das 24 horas, o Atendente leva a resposta para ela no próximo minuto.
  let levou = false;
  if (antes && antes.duvida) {
    await aprenderResposta(x.env, { pergunta: antes.duvida, resposta, produto: antes.interesse, autor: `para @${antes.usuario}` });
    const cfg = await configAtendente(x.env);
    if (cfg.ligado && cfg.modo === 'automatico') levou = await levarResposta(x.env, antes).catch(() => false);
  }
  await auditar(x.env, x.u, 'followup.responder', `followup:${id}`, { colmeia: !!(antes && antes.duvida), atendente_leva: levou });
  return { ...r, na_colmeia: !!(antes && antes.duvida), atendente_leva: levou };
}

export async function sincronizarFollowupAgora(x, { tudo } = {}) {
  exigir(x.u, 'followup.editar');
  const r = await sincronizarFollowup(x.env, { tudo: !!tudo });
  await auditar(x.env, x.u, 'followup.sincronizar', 'followup', { importados: r.importados, compras: r.compras });
  return r;
}

export async function verRespostasFollowup(x, { limite } = {}) {
  exigir(x.u, 'followup.ver');
  return respostasAprendidas(x.env, { limite });
}
