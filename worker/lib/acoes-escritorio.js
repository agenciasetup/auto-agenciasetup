// Escritório de IA (painel e conector), lógica em lib/escritorio.js. Cargo e auditoria em toda escrita.
// Quem decide proposta é gente (ou o Claude a pedido do dono): os agentes só registram turno e põem cartão na mesa.
import { auditar, exigir } from '../nucleo/auth.js';
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { salvarConfigAtendente } from './atendente.js';
import { VENDEDORES } from './followup.js';
import { CONTROLA, baterPonto, sinalDeVida, criarProposta, decidirProposta, lerAgente, registrarTurno, resultadoProposta, salvarAgente, salvarTeto, verEscritorio, verFilaDoExecutor } from './escritorio.js';

const quemE = (u) => ({ quem: u.casa ? null : u.id, quemNome: u.casa ? 'Claude' : String(u.nome || '').trim().split(/\s+/)[0] });

export async function verOEscritorio(x) {
  exigir(x.u, 'escritorio.ver');
  return verEscritorio(x.env);
}

// A fila do Executor (docs/tarefa-aprovadas.md): se ele pode trabalhar, o próximo cartão aprovado que dá para fazer
// sozinho e o andamento dos outros. Só leitura: o andamento se escreve pelo turno (registrarTurnoDoEscritorio).
export async function verAFilaDoExecutor(x) {
  exigir(x.u, 'escritorio.ver');
  return verFilaDoExecutor(x.env);
}

export async function lerAgenteDoEscritorio(x, id) {
  exigir(x.u, 'escritorio.ver');
  return (await lerAgente(x.env, id)) || { aviso: 'Esse agente não existe no escritório.' };
}

// Mudar o estado de quem tem uma chave própria para ligar e desligar: o Atendente (config.atendente) e os vendedores do
// follow-up (config.followup_vendedores). Sempre fica pelo menos um vendedor no sorteio.
// Os outros agentes do Worker não precisam de troca aqui: cada um confere agentes.estado no começo da rodada
// (agenteLiberado, em escritorio.js). A lista de quem obedece à pausa é CONTROLA.
const VENDEDOR = { 'vendedor-calango': 'calango', 'vendedor-pergunta': 'pergunta' };
async function aplicarEstado(env, id, estado) {
  if (id === 'atendente') return salvarConfigAtendente(env, { ligado: estado === 'ativo' });
  const v = VENDEDOR[id];
  if (!v) return null;
  const c = await db.um(env, 'config', { chave: 'eq.followup_vendedores' }).catch(() => null);
  const atuais = c && c.valor && Array.isArray(c.valor.ativos) && c.valor.ativos.length ? c.valor.ativos.filter((k) => VENDEDORES[k]) : Object.keys(VENDEDORES);
  const novos = estado === 'ativo' ? [...new Set([...atuais, v])] : atuais.filter((k) => k !== v);
  if (!novos.length) throw new Erro(409, 'Pelo menos um vendedor precisa continuar trabalhando. Volte o outro antes de tirar este.');
  await db.insert(env, 'config', { chave: 'followup_vendedores', valor: { ativos: novos } }, { upsert: true, conflito: 'chave', select: 'chave' });
  return { ativos: novos };
}

export async function salvarAgenteDoEscritorio(x, dados, id) {
  exigir(x.u, 'escritorio.editar');
  const chave = String(id || (dados && dados.id) || '').trim().toLowerCase();
  const novoEstado = dados && dados.estado;
  if (novoEstado && (chave === 'atendente' || VENDEDOR[chave])) {
    const atual = await db.um(x.env, 'agentes', { id: `eq.${chave}` }, 'id,estado');
    if (atual && atual.estado !== novoEstado && ['ativo', 'pausado', 'desligado'].includes(novoEstado)) await aplicarEstado(x.env, chave, novoEstado);
  }
  const r = await salvarAgente(x.env, dados || {}, id, quemE(x.u));
  await auditar(x.env, x.u, r.criado ? 'escritorio.agente.criar' : 'escritorio.agente.editar', `agente:${r.id}`, { estado: (dados && dados.estado) || null, nivel: r.nivel || null, motivo: (dados && dados.motivo) ? String(dados.motivo).slice(0, 200) : null, caderno: !!(dados && (dados.caderno !== undefined || dados.caderno_mais)) });
  // Pausar ou demitir quem não lê o estado só muda a tela: quem pediu (o painel não mostra o botão, mas o conector
  // aceita) fica sabendo que a tarefa continua rodando.
  if ((novoEstado === 'pausado' || novoEstado === 'desligado') && !CONTROLA[r.id]) {
    return { ...r, aviso: r.onde === 'computador' ? 'O estado mudou só na tela: este agente roda no computador, por tarefa agendada do Claude, e ela continua rodando. Para parar de verdade, desligue a tarefa no app do Claude.' : 'O estado mudou só na tela: este agente é uma rotina fixa do relógio do sistema e continua rodando.' };
  }
  return r;
}

// O sinal de vida de um computador (scripts/batimento.mjs, de 5 em 5 minutos). Sem auditoria: é só um relógio.
export async function baterPontoDaMaquina(x, maquina) {
  exigir(x.u, 'escritorio.trabalhar');
  return baterPonto(x.env, String(maquina || '').toLowerCase());
}

// Como está cada computador e o comando para ligar o sinal no Mac. Só para quem pode editar o escritório.
export async function verSinalDeVida(x) {
  exigir(x.u, 'escritorio.editar');
  return sinalDeVida(x.env, 'https://agenciasetup.com.br');
}

export async function registrarTurnoDoEscritorio(x, dados) {
  exigir(x.u, 'escritorio.trabalhar');
  const r = await registrarTurno(x.env, dados || {});
  await auditar(x.env, x.u, 'escritorio.turno', `agente:${String((dados && dados.agente) || '').slice(0, 40)}`, { turno: r.turno, status: r.status });
  return r;
}

export async function proporNoEscritorio(x, dados) {
  exigir(x.u, 'escritorio.trabalhar');
  const r = await criarProposta(x.env, dados || {});
  await auditar(x.env, x.u, 'escritorio.proposta.criar', `proposta:${r.id}`, { sala: r.sala, agente: r.agente_id });
  return r;
}

export async function decidirPropostaDoEscritorio(x, id, dados) {
  exigir(x.u, 'escritorio.decidir');
  const r = await decidirProposta(x.env, id, dados || {}, quemE(x.u));
  await auditar(x.env, x.u, 'escritorio.proposta.decidir', `proposta:${id}`, { decisao: r.status });
  return r;
}

export async function resultadoDaProposta(x, id, dados) {
  exigir(x.u, 'escritorio.trabalhar');
  const r = await resultadoProposta(x.env, id, dados || {});
  await auditar(x.env, x.u, 'escritorio.proposta.resultado', `proposta:${id}`, {});
  return r;
}

export async function salvarTetoDoEscritorio(x, valor) {
  exigir(x.u, 'escritorio.editar');
  const r = await salvarTeto(x.env, valor);
  await auditar(x.env, x.u, 'escritorio.teto', 'config:escritorio', { teto_dia_usd: r.teto_dia_usd });
  return r;
}
