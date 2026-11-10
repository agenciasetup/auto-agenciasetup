// A Colmeia de vendas (painel e conector), lógica em lib/colmeia.js. Cargo e auditoria em toda escrita.
// Pelo conector com a chave da casa (uma tarefa agendada, um agente) a escrita é de agente: regra e resposta nascem como
// proposta e esperam o dono; lição de vendedor (vendeu, nao_vendeu) vale na hora, com a prova.
import { auditar, exigir } from '../nucleo/auth.js';
import { listarColmeia, salvarColmeia } from './colmeia.js';

const nomeDe = (u) => (u.casa ? 'Claude' : String(u.nome || '').trim().split(/\s+/)[0]);

export async function verColmeia(x, filtros = {}) {
  exigir(x.u, 'colmeia.ver');
  return listarColmeia(x.env, filtros || {});
}

export async function salvarNaColmeia(x, dados, id) {
  exigir(x.u, 'colmeia.editar');
  const r = await salvarColmeia(x.env, dados || {}, { id, quemNome: (dados && dados.autor) || nomeDe(x.u), agente: !!x.u.casa });
  await auditar(x.env, x.u, r.criado ? 'colmeia.criar' : 'colmeia.editar', `colmeia:${r.id}`, { tipo: r.tipo, status: r.status });
  return r;
}

// Aprovar uma proposta, arquivar ou voltar a valer: só gente (o dono ou quem é Editor).
export async function decidirNaColmeia(x, id, status) {
  exigir(x.u, 'colmeia.editar');
  const r = await salvarColmeia(x.env, { status }, { id, quemNome: nomeDe(x.u), agente: !!x.u.casa });
  await auditar(x.env, x.u, 'colmeia.decidir', `colmeia:${id}`, { status: r.status });
  return r;
}
