// Follow-up do direct (painel e conector), lógica em lib/followup.js. Cargo e auditoria em toda escrita.
import { auditar, exigir } from '../nucleo/auth.js';
import { listaFollowup, lerFollowup, respostasAprendidas, responderDuvida, salvarFollowup, sincronizarFollowup } from './followup.js';

const quemE = (u) => ({ quem: u.casa ? null : u.id, quemNome: u.casa ? 'Claude' : String(u.nome || '').trim().split(/\s+/)[0] });

export async function verFollowup(x, { fase, interesse, busca, perfil, limite } = {}) {
  exigir(x.u, 'followup.ver');
  return listaFollowup(x.env, { fase, interesse, busca, perfil, limite });
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
  const r = await responderDuvida(x.env, id, resposta, quemE(x.u));
  await auditar(x.env, x.u, 'followup.responder', `followup:${id}`, {});
  return r;
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
