// O relógio de 10 minutos. Plano grátis da Cloudflare: cada execução tem pouco processamento e no máximo 50 chamadas
// externas (banco incluído). Por isso: toda vez a fila das redes e o "Comenta X"; e uma tarefa da vez, em rodízio
// (por hora: 3 rodadas de radar, 2 de métricas, 1 de posts), e métricas e posts pegam uma conta da vez (rodízio em
// config "vez:<tarefa>"). Com WORKERS_PAGO=1, cada tarefa faz mais por vez e passa por todas as contas.
// Nos outros minutos (pedido do dono em 26/10/2026, "igual ManyChat"): só a fila e o "Comenta X" dos posts dos
// últimos 2 dias, para quem comentou receber em 1 ou 2 minutos sem esperar o Acesso Avançado da Meta.
import { processarFila } from '../plataformas/fila.js';
import { atualizarMetricas, atualizarRecentes, sincronizarPosts } from './desempenho.js';
import { enviarRespostas, varrerComentarios } from './gatilhos.js';
import { atualizarRadar } from './radar.js';
import { cuidarDosPedidos } from './vendas.js';
import { cuidarDaArea } from './area-relogio.js';
import { fecharODia } from './push.js';
import { importarDaVez } from './searchconsole.js';
import { prepararIntegracoes } from './integracoes.js';

const RODIZIO = ['radar', 'metricas', 'radar', 'posts', 'radar', 'metricas'];
const TAREFAS = {
  radar: (env) => atualizarRadar(env),
  metricas: (env) => atualizarMetricas(env),
  posts: (env) => sincronizarPosts(env),
};

export const tarefaDaVez = (quando) => RODIZIO[Math.floor(quando / 600_000) % RODIZIO.length];

export async function rodarMinuto(env, quando = Date.now()) {
  const feito = {};
  const etapas = [
    ['fila', () => processarFila(env)],
    ['comenta', async () => ({ varrer: await varrerComentarios(env, { recentes: 48 }), enviar: await enviarRespostas(env) })],
  ];
  // A cada 5 minutos (fora da volta completa): números e imagem dos posts recentes, para o painel ficar quase ao vivo.
  if (new Date(quando).getUTCMinutes() % 5 === 3) etapas.push(['recentes', () => atualizarRecentes(env)]);
  // Às 23h58 (Brasília): o resumo do dia no celular da equipe (push.js). Fora dessa hora não faz nada.
  etapas.push(['fechamento', () => fecharODia(env, quando)]);
  // Search Console (searchconsole.js): no minuto 17 das horas cheias, das 6h às 23h de Brasília, um site por vez, até os
  // dois estarem em dia. Sozinho num minuto, para caber nas 50 chamadas do plano grátis.
  const h = (new Date(quando).getUTCHours() + 21) % 24;
  // A chave da conta robô vem de Integrações (o relógio de minuto não carrega as integrações sozinho).
  if (new Date(quando).getUTCMinutes() === 17 && h >= 6) etapas.push(['seo', async () => { await prepararIntegracoes(env); return importarDaVez(env, quando); }]);
  for (const [nome, fn] of etapas) {
    try {
      feito[nome] = await fn();
    } catch (e) {
      feito[nome] = { erro: e && e.message };
      console.error('minuto', nome, e && (e.stack || e.message));
    }
  }
  return feito;
}

export async function rodarRelogio(env, quando = Date.now()) {
  const vez = tarefaDaVez(quando);
  const etapas = [
    ['fila', () => processarFila(env)],
    ['comenta', async () => ({ varrer: await varrerComentarios(env), enviar: await enviarRespostas(env) })],
    // Pix vencido sai da espera; aviso de pagamento que falhou tenta de novo; reembolso agendado que chegou no dia sai.
    ['pedidos', () => cuidarDosPedidos(env)],
    // Área de membros: lembrete de evento, recuperação de compra, "você parou" e o resumo da semana.
    ['area', () => cuidarDaArea(env, quando)],
    [vez, () => TAREFAS[vez](env)],
  ];
  const feito = {};
  for (const [nome, fn] of etapas) {
    try {
      feito[nome] = await fn();
    } catch (e) {
      feito[nome] = { erro: e && e.message };
      console.error('relogio', nome, e && (e.stack || e.message));
    }
  }
  return feito;
}
