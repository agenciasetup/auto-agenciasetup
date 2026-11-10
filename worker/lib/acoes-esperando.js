// "Esperando você": os lugares onde algo espera a decisão do dono, um número para cada. É o que o bloco do Início e os
// contadores do menu mostram (revisão do Escritório, 10/11/2026: a mesa de propostas, as dúvidas do direct, as
// propostas da Colmeia e as entregas do Combo ficavam cada uma numa tela, e ele só via abrindo uma por uma).
// Só leitura. Cada número só vem para quem pode abrir a tela dele; sem a permissão, vem null.
import { db } from '../nucleo/db.js';
import { pode } from '../nucleo/permissoes.js';
import { entregasPendentes } from './acoes-entregas.js';

const contar = async (env, tabela, filtros) => {
  const r = await db.select(env, tabela, { filtros, select: 'id', limite: 1, contar: true });
  return Number(r.total) || 0;
};

// Os números são os mesmos para todo mundo: ficam 30 segundos na memória do Worker, porque o menu pede em toda tela.
let guardado = { em: 0, valor: null };
const VALIDADE = 30_000;
export function esquecerEsperando() { guardado = { em: 0, valor: null }; }

async function numeros(x) {
  if (guardado.valor && Date.now() - guardado.em < VALIDADE) return guardado.valor;
  const seguro = (fn) => fn().catch((e) => { console.error('esperando', e && e.message); return null; });
  const [mesa, duvidas, colmeia, entregas] = await Promise.all([
    seguro(() => contar(x.env, 'propostas', { status: 'eq.nova' })),
    seguro(() => contar(x.env, 'followups', { fase: 'eq.duvida' })),
    seguro(() => contar(x.env, 'colmeia', { status: 'eq.proposta' })),
    // Quem pagou o Combo e ainda não foi adicionado na Hubla (a mesma lista da tela e do conector).
    seguro(async () => Number((await entregasPendentes({ ...x, u: { ...x.u, papel: 'administrador' } }, { limite: 1 })).total_pendentes) || 0),
  ]);
  guardado = { em: Date.now(), valor: { mesa, duvidas, colmeia, entregas } };
  return guardado.valor;
}

// Devolve { itens: [{ id, n, titulo, um, varios, url }], total }. n é null quando a pessoa não pode ver aquela tela ou
// quando a leitura falhou; total soma só o que veio.
export async function verEsperando(x) {
  const n = await numeros(x);
  const ve = (acao) => pode(x.u.papel, acao);
  const itens = [
    { id: 'mesa', n: ve('escritorio.ver') ? n.mesa : null, titulo: 'Mesa do Escritório', um: 'proposta dos agentes', varios: 'propostas dos agentes', url: '/escritorio' },
    { id: 'duvidas', n: ve('followup.ver') ? n.duvidas : null, titulo: 'Dúvidas do direct', um: 'pessoa esperando a sua resposta', varios: 'pessoas esperando a sua resposta', url: '/followup?fase=duvida' },
    { id: 'colmeia', n: ve('colmeia.ver') ? n.colmeia : null, titulo: 'Colmeia', um: 'item esperando o seu sim', varios: 'itens esperando o seu sim', url: '/colmeia' },
    { id: 'entregas', n: ve('alunos.ver') ? n.entregas : null, titulo: 'Entregas do Combo', um: 'compra para liberar na Hubla', varios: 'compras para liberar na Hubla', url: null },
  ];
  return { itens, total: itens.reduce((s, i) => s + (Number(i.n) || 0), 0) };
}
