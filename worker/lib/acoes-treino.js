// O Treino da Colmeia (painel), lógica em lib/treino.js. Cargo em toda chamada e auditoria no que muda alguma coisa de
// verdade: recomeçar, salvar, tirar da lista e aprender. As falas da conversa não vão para a auditoria, uma a uma: é
// conversa de ensaio entre pessoas do time e não muda nada no sistema.
// Só pelo painel: o Treino é de gente. Um agente não escreve como atendente nem manda a IA aprender.
import { auditar, exigir } from '../nucleo/auth.js';
import { Erro } from '../nucleo/util.js';
import { aprenderDoTreino, descartarTreino, falarNoTreino, lerTreino, recomecarTreino, responderNoTreino, salaDeTreino, salvarTreino } from './treino.js';

const primeiroNome = (u) => String((u && u.nome) || '').trim().split(/\s+/)[0];
const soNoPainel = (u) => { if (u && (u.via === 'mcp' || u.casa)) throw new Erro(403, 'O Treino é das pessoas do time, no painel.'); };

export async function verTreino(x, { id, depois } = {}) {
  exigir(x.u, 'colmeia.ver');
  soNoPainel(x.u);
  return id ? lerTreino(x.env, id) : salaDeTreino(x.env, { depois, quemNome: primeiroNome(x.u) });
}

export async function falarNoTreinoDaColmeia(x, { id, papel, texto } = {}) {
  exigir(x.u, 'colmeia.editar');
  soNoPainel(x.u);
  return falarNoTreino(x.env, { id, papel, texto, quemNome: primeiroNome(x.u) });
}

export async function pedirRespostaNoTreino(x, { id } = {}) {
  exigir(x.u, 'colmeia.editar');
  soNoPainel(x.u);
  return responderNoTreino(x.env, { id });
}

export async function recomecarOTreino(x) {
  exigir(x.u, 'colmeia.editar');
  soNoPainel(x.u);
  const r = await recomecarTreino(x.env, { quemNome: primeiroNome(x.u) });
  await auditar(x.env, x.u, 'treino.recomecar', `treino:${r.treino.id}`, {});
  return r;
}

export async function salvarOTreino(x, { id, titulo } = {}) {
  exigir(x.u, 'colmeia.editar');
  soNoPainel(x.u);
  const r = await salvarTreino(x.env, { id, titulo, quemNome: primeiroNome(x.u) });
  await auditar(x.env, x.u, 'treino.salvar', `treino:${id}`, { falas: r.salva.n });
  return r;
}

export async function aprenderComOTreino(x, { id } = {}) {
  exigir(x.u, 'colmeia.editar');
  soNoPainel(x.u);
  const r = await aprenderDoTreino(x.env, { id, quemNome: primeiroNome(x.u) });
  await auditar(x.env, x.u, 'treino.aprender', `treino:${id}`, { itens: r.itens.length, ja_sabia: r.ja_sabia.length, custo_usd: r.custo_usd });
  return r;
}

export async function mudarOTreino(x, id, { status } = {}) {
  exigir(x.u, 'colmeia.editar');
  soNoPainel(x.u);
  if (status !== 'descartada') throw new Erro(400, 'Só dá para tirar uma conversa salva da lista.');
  const r = await descartarTreino(x.env, id);
  await auditar(x.env, x.u, 'treino.descartar', `treino:${id}`, {});
  return r;
}
