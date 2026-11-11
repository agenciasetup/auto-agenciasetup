// O relógio de 10 minutos: toda vez a fila das redes e o "Comenta X"; e uma tarefa da vez, em rodízio (por hora: 3
// rodadas de radar, 2 de métricas, 1 de posts). Desde 10/11/2026 a conta tem o Workers pago (WORKERS_PAGO=1 no
// wrangler.jsonc): o radar lê todas as fontes, métricas e posts passam por todas as contas e cada tarefa faz mais por
// vez. No plano grátis (50 chamadas externas por execução) era uma conta da vez, em rodízio em config "vez:<tarefa>".
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
import { responderPendentes } from './atendente.js';
import { sincronizarFollowup } from './followup.js';
import { rodarChefeDeGabinete } from './agentes/chefe-de-gabinete.js';
import { rodarZelador } from './agentes/zelador.js';
import { rodarConciliador } from './agentes/conciliador.js';
import { rodarCacadorDeVirais } from './agentes/cacador-de-virais.js';
import { rodarRoteirista } from './agentes/roteirista.js';
import { rodarOlheiroVisual } from './agentes/olheiro-visual.js';
import { rodarDiretorDeArte } from './agentes/diretor-de-arte.js';
import { rodarOlheiroDeFerramentas } from './agentes/olheiro-de-ferramentas.js';
import { contaAtiva, credenciaisAtivas } from '../plataformas/credenciais.js';
import { chamadasFeitas, comContador, folgaDeChamadas, reservarChamadas } from '../nucleo/db.js';

const RODIZIO = ['radar', 'metricas', 'radar', 'posts', 'radar', 'metricas'];
const TAREFAS = {
  radar: (env) => atualizarRadar(env),
  metricas: (env) => atualizarMetricas(env),
  posts: (env) => sincronizarPosts(env),
};

export const tarefaDaVez = (quando) => RODIZIO[Math.floor(quando / 600_000) % RODIZIO.length];

// A conta do Instagram de cada perfil, com o token aberto, para o Atendente ler a conversa e responder.
// Exportada para o despertador do Atendente (worker/despertador.js), que roda o mesmo caminho fora do relógio.
export async function atenderODirect(env) {
  await prepararIntegracoes(env);
  const guardadas = new Map();
  const contaDe = async (perfil) => {
    if (!guardadas.has(perfil)) {
      const c = await contaAtiva(env, 'instagram', perfil).catch(() => null);
      guardadas.set(perfil, c ? { c, credenciais: await credenciaisAtivas(env, c.conexao) } : null);
    }
    return guardadas.get(perfil);
  };
  return responderPendentes(env, { limite: env.WORKERS_PAGO === '1' ? 6 : 2, contaDe });
}

// Chamadas externas que cada etapa do minuto precisa ter garantidas (estimativa por cima). Ficam reservadas desde o
// começo, para o Atendente e o Comenta X não gastarem tudo antes; a reserva é solta quando a etapa começa.
// fila: só a conferência de todo minuto (publicar uma peça gasta mais, e a fila ainda não olha o contador).
const RESERVA = { fila: 2, fechamento: 8, seo: 12, chefe: 24, zelador: 26, 'olheiro-de-ferramentas': 12, 'cacador-de-virais': 12, roteirista: 32, 'olheiro-visual': 33, 'diretor-de-arte': 17 };
// O Comenta X lê os comentários (a reserva do aviso da Meta) deixando lugar para um envio da fila: o fixo e um item.
const RESERVA_ENVIO = 17;
// Os números dos posts recentes são só para o painel e gastam umas 6 chamadas por conta (4 contas): num minuto cheio
// eles ficam para daqui a 5 minutos, em vez de estourar o limite no meio.
const FOLGA_RECENTES = 26;

export async function rodarMinuto(envDoWorker, quando = Date.now()) {
  // Um env só desta execução, com o contador de chamadas externas (nucleo/db.js): teto de 1.000 no Workers pago (50 no
  // grátis). Cada etapa olha a folga antes de começar um trabalho que não pode parar no meio.
  const env = comContador(envDoWorker);
  const feito = {};
  const etapas = [
    // O Atendente do direct vem primeiro: responde quem parou de escrever há uns 20 segundos (até 6 conversas por minuto
    // no Workers pago, 2 no grátis; cada uma só começa se houver folga de chamadas para ela inteira).
    ['atendente', () => atenderODirect(env)],
    ['fila', () => processarFila(env)],
    ['comenta', async () => {
      reservarChamadas(env, RESERVA_ENVIO);
      const varrer = await varrerComentarios(env, { recentes: 48 }).finally(() => reservarChamadas(env, -RESERVA_ENVIO));
      return { varrer, enviar: await enviarRespostas(env) };
    }],
  ];
  // A cada 5 minutos (fora da volta completa): números e imagem dos posts recentes, para o painel ficar quase ao vivo.
  if (new Date(quando).getUTCMinutes() % 5 === 3) etapas.push(['recentes', () => (folgaDeChamadas(env) < FOLGA_RECENTES ? { pulou: 'sem folga de chamadas neste minuto' } : atualizarRecentes(env))]);
  // Às 23h58 (Brasília): o resumo do dia no celular da equipe (push.js). Fora dessa hora não faz nada.
  etapas.push(['fechamento', () => fecharODia(env, quando)]);
  // Search Console (searchconsole.js): no minuto 17 das horas cheias, das 6h às 23h de Brasília, um site por vez, até os
  // dois estarem em dia. Sozinho num minuto (vem do plano grátis, que cortava em 50 chamadas).
  const h = (new Date(quando).getUTCHours() + 21) % 24;
  // A chave da conta robô vem de Integrações (o relógio de minuto não carrega as integrações sozinho).
  if (new Date(quando).getUTCMinutes() === 17 && h >= 6) etapas.push(['seo', async () => { await prepararIntegracoes(env); return importarDaVez(env, quando); }]);
  // O Chefe de gabinete: o resumo das 8h com as 3 decisões do dia (8h02, e de novo às 8h22 e 8h42 se a primeira falhar;
  // ele mesmo não repete no dia). Fica por último: se as chamadas do minuto acabarem, quem espera é ele.
  if (h === 8 && [2, 22, 42].includes(new Date(quando).getUTCMinutes())) etapas.push(['chefe', () => rodarChefeDeGabinete(env, quando)]);
  // O Zelador (sem IA): no minuto 7 de toda hora confere se as tarefas rodaram, os erros e o gasto, e avisa.
  if (new Date(quando).getUTCMinutes() === 7) etapas.push(['zelador', () => rodarZelador(env, quando)]);
  // O Olheiro de ferramentas: todo dia às 9h21 de Brasília ele vê se já rodou na semana; só trabalha uma vez por semana.
  if (h === 9 && new Date(quando).getUTCMinutes() === 21) etapas.push(['olheiro-de-ferramentas', () => rodarOlheiroDeFerramentas(env, quando)]);
  // O setor de vídeo. O Caçador de virais (sem IA): no minuto 37 de toda hora lê 4 canais da lista, em rodízio, e guarda
  // o Short que saiu da curva. A Roteirista: segunda e quinta às 9h31 de Brasília (de novo às 9h41 e 9h51 se falhar; ela
  // mesma não repete no dia) escreve até 3 roteiros e põe na mesa.
  if (new Date(quando).getUTCMinutes() === 37) etapas.push(['cacador-de-virais', () => rodarCacadorDeVirais(env, quando)]);
  if (h === 9 && [31, 41, 51].includes(new Date(quando).getUTCMinutes())) etapas.push(['roteirista', () => rodarRoteirista(env, quando)]);
  // O setor de Design, toda segunda (eles mesmos conferem o dia e não repetem): o Olheiro visual às 9h03 (de novo às
  // 9h13 e 9h43 se falhar) lê as capas fora da curva; o Diretor de arte às 10h03 (10h13, 10h43) anda o teste de estilo.
  if (h === 9 && [3, 13, 43].includes(new Date(quando).getUTCMinutes())) etapas.push(['olheiro-visual', () => rodarOlheiroVisual(env, quando)]);
  if (h === 10 && [3, 13, 43].includes(new Date(quando).getUTCMinutes())) etapas.push(['diretor-de-arte', () => rodarDiretorDeArte(env, quando)]);
  // O Conciliador da Colmeia: só trabalha quando a Colmeia mudou e está quieta há 3 minutos (nos outros minutos, 1 leitura).
  etapas.push(['conciliador', () => rodarConciliador(env, quando)]);
  // O resumo do dia só trabalha a partir das 23h58: fora disso não precisa de reserva.
  const precisa = (nome) => (nome === 'fechamento' && h * 60 + new Date(quando).getUTCMinutes() < 23 * 60 + 58 ? 0 : RESERVA[nome] || 0);
  for (const [nome] of etapas) reservarChamadas(env, precisa(nome));
  for (const [nome, fn] of etapas) {
    reservarChamadas(env, -precisa(nome));
    try {
      feito[nome] = await fn();
    } catch (e) {
      feito[nome] = { erro: e && e.message };
      console.error('minuto', nome, e && (e.stack || e.message));
    }
  }
  // Para acompanhar no registro do Worker (wrangler tail) quando um minuto chega perto do limite.
  const chamadas = chamadasFeitas(env);
  if (chamadas !== null) {
    feito.chamadas = chamadas;
    if (chamadas >= 40) console.log(`minuto: ${chamadas} chamadas externas contadas`);
  }
  return feito;
}

export async function rodarRelogio(env, quando = Date.now()) {
  const vez = tarefaDaVez(quando);
  const etapas = [
    // O Atendente também responde nesta volta: ela roda no lugar da de minuto, e sem isto quem parava de escrever perto
    // de um minuto terminado em 0 esperava um minuto a mais.
    ['atendente', () => atenderODirect(env)],
    ['fila', () => processarFila(env)],
    ['comenta', async () => ({ varrer: await varrerComentarios(env), enviar: await enviarRespostas(env) })],
    // Pix vencido sai da espera; aviso de pagamento que falhou tenta de novo; reembolso agendado que chegou no dia sai.
    ['pedidos', () => cuidarDosPedidos(env)],
    // Quem comentou a palavra entra na lista de follow-up e quem pagou vai para "Comprou" sem esperar a rodada do
    // computador: o Atendente não oferta para quem já comprou e o vendedor não toca de novo.
    ['followup', () => sincronizarFollowup(env)],
    // O Conciliador da Colmeia (nos outros minutos ele roda na volta de minuto).
    ['conciliador', () => rodarConciliador(env, quando)],
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
