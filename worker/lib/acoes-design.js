// O setor de Design (painel e conector): a leitura do Olheiro visual, o teste de estilo da semana do Diretor de arte e
// os dois rodando fora da hora. A lógica mora em agentes/olheiro-visual.js e agentes/diretor-de-arte.js.
// Cargo e auditoria em toda escrita.
import { auditar, exigir } from '../nucleo/auth.js';
import { rodarOlheiroVisual } from './agentes/olheiro-visual.js';
import { lerDesign, rodarDiretorDeArte } from './agentes/diretor-de-arte.js';

// O que o Designer lê antes da ficha da capa: o teste da semana (e se ele deve seguir agora) e a última leitura do Olheiro.
export async function verLeituraDeDesign(x) {
  exigir(x.u, 'pautas.ver');
  return lerDesign(x.env);
}

// O Olheiro visual agora (uma chamada ao Claude com as capas, dentro do teto do dia). simular: mostra as capas que ele
// leria e as contas, sem gastar.
export async function rodarOlheiroVisualAgora(x, d = {}) {
  exigir(x.u, d.simular ? 'pautas.ver' : 'pautas.editar');
  const r = await rodarOlheiroVisual(x.env, Date.now(), { forcar: true, simular: !!d.simular });
  if (!d.simular) await auditar(x.env, x.u, 'design.olheiro.rodar', 'agente:olheiro-visual', { capas: r.capas || 0, pulou: r.pulou || null });
  return r;
}

// O Diretor de arte agora: anda o teste (espera, começa, mede) e, sem teste, propõe o próximo (uma chamada ao Claude).
export async function rodarDiretorDeArteAgora(x, d = {}) {
  exigir(x.u, d.simular ? 'pautas.ver' : 'pautas.editar');
  const r = await rodarDiretorDeArte(x.env, Date.now(), { forcar: true, simular: !!d.simular });
  if (!d.simular) await auditar(x.env, x.u, 'design.diretor.rodar', 'agente:diretor-de-arte', { teste: (r.teste && r.teste.id) || null, pulou: r.pulou || null });
  return r;
}
