// A Colmeia de vendas (painel e conector), lógica em lib/colmeia.js. Cargo e auditoria em toda escrita.
// Pelo conector (qualquer chave: a da casa, a de uma pessoa ou o login do app do Claude) quem escreve é o Claude, e a
// escrita é de agente: regra e resposta nascem como proposta e esperam o dono no painel; lição de vendedor (vendeu,
// nao_vendeu) vale na hora, com a prova. O texto de um item vai para dentro da instrução do Atendente, por isso só o
// que foi escrito no painel, por gente, vale direto. A chamada do conector vem com via "mcp" (nucleo/auth.js).
import { auditar, exigir } from '../nucleo/auth.js';
import { Erro } from '../nucleo/util.js';
import { listarColmeia, salvarColmeia } from './colmeia.js';
import { responderAoConciliador } from './agentes/conciliador.js';

const peloConector = (u) => !!u && (u.via === 'mcp' || !!u.casa);
const primeiroNome = (u) => String(u.nome || '').trim().split(/\s+/)[0];
const nomeDe = (u) => (u.casa ? 'Claude' : u.via === 'mcp' ? `Claude (${primeiroNome(u)})` : primeiroNome(u));

// Pelo conector vem só o que está valendo, a não ser que o pedido diga o status. Motivo: a resposta que o dono deu
// para UMA pessoa nasce como proposta com origem "dono", e o vendedor lia aquilo como regra para todo mundo.
export async function verColmeia(x, filtros = {}) {
  exigir(x.u, 'colmeia.ver');
  const f = { ...(filtros || {}) };
  if (peloConector(x.u) && !f.status) f.status = 'ativa';
  const r = await listarColmeia(x.env, f);
  return peloConector(x.u) && !(filtros || {}).status ? { ...r, aviso: 'Só os itens que estão valendo. Para ver o que espera o dono, peça com status "proposta": proposta ainda não vale como regra.' } : r;
}

export async function salvarNaColmeia(x, dados, id) {
  exigir(x.u, 'colmeia.editar');
  // A resposta do dono a uma pergunta do Conciliador ({ responder: "..." } no cartão da junção): só gente, no painel.
  if (id && dados && dados.responder !== undefined) {
    if (peloConector(x.u)) throw new Erro(403, 'A resposta ao Conciliador é do dono, no painel.');
    const r = await responderAoConciliador(x.env, id, dados.responder);
    await auditar(x.env, x.u, 'colmeia.responder', `colmeia:${id}`, { ajustou: r.ajustou });
    return r;
  }
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
