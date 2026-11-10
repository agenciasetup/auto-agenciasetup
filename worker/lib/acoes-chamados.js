// Chamados de suporte (painel e conector), lógica em lib/chamados.js. Cargo e auditoria em toda escrita.
// Ler e resolver é de quem atende os alunos (Administrador, Editor e Suporte). Pelo conector, um agente lê e abre
// chamado (o vendedor da tarefa do direct, quando alguém conta um problema), mas resolver é de gente, no painel.
import { auditar, exigir } from '../nucleo/auth.js';
import { Erro } from '../nucleo/util.js';
import { abrirChamado, listarChamados, mudarChamado } from './chamados.js';
import { esquecerEsperando } from './acoes-esperando.js';

const peloConector = (u) => !!u && (u.via === 'mcp' || !!u.casa);
const primeiroNome = (u) => String((u && u.nome) || '').trim().split(/\s+/)[0];

export async function verChamados(x, { status, limite } = {}) {
  exigir(x.u, 'suporte.ver');
  return listarChamados(x.env, { status, limite });
}

export async function abrirUmChamado(x, d = {}) {
  exigir(x.u, 'suporte.atender');
  const r = await abrirChamado(x.env, { ...d, origem: peloConector(x.u) ? 'vendedor' : 'painel' });
  esquecerEsperando();
  await auditar(x.env, x.u, r.criado ? 'chamado.abrir' : 'chamado.completar', `chamado:${r.id}`, { origem: r.origem });
  return { ok: true, ...r };
}

export async function mudarUmChamado(x, id, d = {}) {
  exigir(x.u, 'suporte.atender');
  if (peloConector(x.u) && d.status !== undefined) throw new Erro(403, 'Resolver ou reabrir um chamado é do time, no painel.');
  const r = await mudarChamado(x.env, id, d, { quemNome: primeiroNome(x.u) });
  esquecerEsperando();
  await auditar(x.env, x.u, 'chamado.mudar', `chamado:${id}`, { status: r.status });
  return r;
}
