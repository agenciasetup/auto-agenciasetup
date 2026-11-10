// O consumo de IA dos agentes do escritório: uma linha por chamada, com o modelo (tabela consumo_ia, migration 38).
// Quem chama a IA em nome de um agente anota aqui; a tela Escritório soma por sala, por modelo e por agente.
// Anotar nunca derruba quem chamou: é registro.
import { db } from '../nucleo/db.js';
import { custo } from './tutor.js';

export const NOME_MODELO = {
  'claude-opus-5-5': 'Opus 5.5',
  'claude-sonnet-5-5': 'Sonnet 5.5',
  'claude-haiku-5-5': 'Haiku 5.5',
};
export const nomeDoModelo = (m) => NOME_MODELO[m] || String(m || 'Sem modelo');

// uso: o "usage" que a API do Claude devolve. origem: atendente, teste, comenta, variantes, plano.
export async function anotarConsumo(env, agente, modelo, uso = {}, origem = '') {
  try {
    const entrada = (uso.input_tokens || 0) + (uso.cache_read_input_tokens || 0) + (uso.cache_creation_input_tokens || 0);
    await db.insert(env, 'consumo_ia', [{
      agente_id: agente || null, modelo: String(modelo || 'claude').slice(0, 60), origem: origem ? String(origem).slice(0, 40) : null,
      tokens_entrada: entrada, tokens_saida: uso.output_tokens || 0, custo_usd: Number(custo(modelo, uso).toFixed(5)),
    }], { select: 'id' });
  } catch (e) { console.error('consumo', e && e.message); }
}

// Custo já calculado por quem trabalhou (o turno de uma tarefa agendada informa o valor pronto).
export async function anotarCusto(env, agente, modelo, { custo_usd = 0, tokens_entrada = 0, tokens_saida = 0 } = {}, origem = 'turno') {
  if (!(Number(custo_usd) > 0)) return;
  try {
    await db.insert(env, 'consumo_ia', [{
      agente_id: agente || null, modelo: String(modelo || 'claude').slice(0, 60), origem,
      tokens_entrada: Math.max(0, Math.round(Number(tokens_entrada) || 0)), tokens_saida: Math.max(0, Math.round(Number(tokens_saida) || 0)), custo_usd: Number(Number(custo_usd).toFixed(5)),
    }], { select: 'id' });
  } catch (e) { console.error('consumo', e && e.message); }
}

// As linhas de escritorio_consumo() (por agente e modelo) viram: o consumo de cada agente e o de cada sala.
export function juntarConsumo(linhas, salaDoAgente) {
  const vazio = () => ({ hoje: 0, d7: 0, d30: 0, chamadas_hoje: 0, chamadas_7d: 0, chamadas_30d: 0, modelos: [] });
  const soma = (alvo, l) => {
    alvo.hoje += l.custo_hoje || 0; alvo.d7 += l.custo_7d || 0; alvo.d30 += l.custo_30d || 0;
    alvo.chamadas_hoje += l.chamadas_hoje || 0; alvo.chamadas_7d += l.chamadas_7d || 0; alvo.chamadas_30d += l.chamadas_30d || 0;
    let m = alvo.modelos.find((x) => x.modelo === l.modelo);
    if (!m) { m = { modelo: l.modelo, nome: nomeDoModelo(l.modelo), custo_hoje: 0, custo_7d: 0, custo_30d: 0, chamadas_hoje: 0, chamadas_7d: 0, chamadas_30d: 0, tokens_entrada_30d: 0, tokens_saida_30d: 0 }; alvo.modelos.push(m); }
    m.custo_hoje += l.custo_hoje || 0; m.custo_7d += l.custo_7d || 0; m.custo_30d += l.custo_30d || 0;
    m.chamadas_hoje += l.chamadas_hoje || 0; m.chamadas_7d += l.chamadas_7d || 0; m.chamadas_30d += l.chamadas_30d || 0;
    m.tokens_entrada_30d += Number(l.tokens_entrada_30d) || 0; m.tokens_saida_30d += Number(l.tokens_saida_30d) || 0;
  };
  const agentes = {}; const salas = {};
  for (const l of Array.isArray(linhas) ? linhas : []) {
    if (!l.agente_id) continue;
    soma(agentes[l.agente_id] || (agentes[l.agente_id] = vazio()), l);
    const s = salaDoAgente[l.agente_id];
    if (s) soma(salas[s] || (salas[s] = vazio()), l);
  }
  const arruma = (c) => { c.modelos.sort((a, b) => b.custo_30d - a.custo_30d); return c; };
  Object.values(agentes).forEach(arruma); Object.values(salas).forEach(arruma);
  return { agentes, salas };
}
