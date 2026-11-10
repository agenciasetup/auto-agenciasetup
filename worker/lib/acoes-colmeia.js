// A Colmeia de vendas (painel e conector), lógica em lib/colmeia.js. Cargo e auditoria em toda escrita.
// Pelo conector (qualquer chave: a da casa, a de uma pessoa ou o login do app do Claude) quem escreve é o Claude, e a
// escrita é de agente: regra e resposta nascem como proposta e esperam o dono no painel; lição de vendedor (vendeu,
// nao_vendeu) vale na hora, com a prova. O texto de um item vai para dentro da instrução do Atendente, por isso só o
// que foi escrito no painel, por gente, vale direto. A chamada do conector vem com via "mcp" (nucleo/auth.js).
import { auditar, exigir } from '../nucleo/auth.js';
import { listarColmeia, salvarColmeia } from './colmeia.js';

const peloConector = (u) => !!u && (u.via === 'mcp' || !!u.casa);
const primeiroNome = (u) => String(u.nome || '').trim().split(/\s+/)[0];
const nomeDe = (u) => (u.casa ? 'Claude' : u.via === 'mcp' ? `Claude (${primeiroNome(u)})` : primeiroNome(u));

export async function verColmeia(x, filtros = {}) {
  exigir(x.u, 'colmeia.ver');
  return listarColmeia(x.env, filtros || {});
}

export async function salvarNaColmeia(x, dados, id) {
  exigir(x.u, 'colmeia.editar');
  const r = await salvarColmeia(x.env, dados || {}, { id, quemNome: (dados && dados.autor) || nomeDe(x.u), agente: peloConector(x.u) });
  await auditar(x.env, x.u, r.criado ? 'colmeia.criar' : 'colmeia.editar', `colmeia:${r.id}`, { tipo: r.tipo, status: r.status });
  return r;
}

// Aprovar uma proposta, arquivar ou voltar a valer: só gente, no painel (o dono ou quem é Editor).
export async function decidirNaColmeia(x, id, status) {
  exigir(x.u, 'colmeia.editar');
  const r = await salvarColmeia(x.env, { status }, { id, quemNome: nomeDe(x.u), agente: peloConector(x.u) });
  await auditar(x.env, x.u, 'colmeia.decidir', `colmeia:${id}`, { status: r.status });
  return r;
}
