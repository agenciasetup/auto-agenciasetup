// Confere, SÓ LENDO o banco de verdade, o que os dois agentes da sala Sistema fariam agora:
// o Zelador (worker/lib/agentes/zelador.js) e o Olheiro de ferramentas (worker/lib/agentes/olheiro-de-ferramentas.js).
// Chama os dois com simular: true. Não avisa ninguém, não grava nada e não chama a IA. Não imprime dado de cliente:
// só contagens, os títulos dos alertas e o estado dos dois agentes.
//   node scripts/conferir-sistema.mjs
//   node scripts/conferir-sistema.mjs --quando 2026-11-10T02:07:00Z   (como se fosse esse instante, em UTC)
//   node scripts/conferir-sistema.mjs --instrucao                     (mostra o texto que o Olheiro manda para a IA)
import { env, exige } from './env.mjs';

exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY');

// Trava de leitura. Daqui só sai consulta ao banco: GET, e a função que soma o gasto do dia (ela só lê, mas é chamada
// por POST). Qualquer outra chamada (gravar, avisar no celular, IA) é barrada antes de sair do computador.
const banco = new URL(env.SUPABASE_URL).origin;
const SO_LEEM = ['/rest/v1/rpc/escritorio_resumo'];
const buscar = globalThis.fetch;
globalThis.fetch = (alvo, opcoes = {}) => {
  const u = new URL(typeof alvo === 'string' ? alvo : alvo.url);
  const metodo = String(opcoes.method || 'GET').toUpperCase();
  const leitura = u.origin === banco && (metodo === 'GET' || (metodo === 'POST' && SO_LEEM.includes(u.pathname)));
  if (!leitura) throw new Error(`Barrado pela trava de leitura: ${metodo} ${u.origin === banco ? u.pathname : u.origin}`);
  return buscar(alvo, opcoes);
};

const { rodarZelador } = await import('../worker/lib/agentes/zelador.js');
const { rodarOlheiroDeFerramentas } = await import('../worker/lib/agentes/olheiro-de-ferramentas.js');

// O que o helper do banco lê (worker/nucleo/db.js): SUPABASE_URL e SUPABASE_SECRET_KEY. AMBIENTE local: as integrações
// (a chave do Claude) não são carregadas.
const e = { SUPABASE_URL: env.SUPABASE_URL, SUPABASE_SECRET_KEY: env.SUPABASE_SECRET_KEY, AMBIENTE: 'local' };

const args = process.argv.slice(2);
const iQuando = args.indexOf('--quando');
const quando = iQuando >= 0 ? Date.parse(args[iQuando + 1]) : Date.now();
if (!Number.isFinite(quando)) { console.error('Data inválida em --quando. Use, por exemplo, 2026-11-10T02:07:00Z.'); process.exit(1); }
const emBrasilia = (ms) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(ms));
const dolar = (v) => `US$ ${(Number(v) || 0).toFixed(2).replace('.', ',')}`;
const ou = (v, vazio = 'não deu para ler') => (v === null || v === undefined ? vazio : v);

console.log(`Conferência da sala Sistema (só leitura), como se fosse ${emBrasilia(quando)} de Brasília.\n`);

// ---------------------------------------------------------------- Zelador
const z = await rodarZelador(e, quando, { simular: true });
console.log('ZELADOR');
if (z.pulou) {
  console.log(`  Não rodaria: o agente está ${z.pulou}.`);
} else {
  const g = z.leu.gasto;
  console.log(`  Leu: ${ou(z.leu.agentes)} agentes, ${ou(z.leu.turnos)} ${z.leu.turnos === 1 ? 'turno' : 'turnos'} em 14 dias (${ou(z.leu.turnos_com_erro_24h)} com erro em 24 horas),`);
  console.log(`       ${ou(z.leu.atendimentos_com_erro_24h)} atendimentos com erro em 24 horas, ${ou(z.leu.mensagens_esperando)} mensagens esperando há mais de 5 minutos,`);
  console.log(`       gasto de IA de hoje: ${g ? `${dolar(g.gasto_hoje_usd)} de ${dolar(g.teto_dia_usd)}` : 'não deu para ler'}.`);
  console.log(`  Alertas agora: ${z.alertas.length}`);
  for (const a of z.alertas) {
    console.log(`  - ${a.titulo}`);
    console.log(`      ${a.corpo}`);
    console.log(`      ${a.avisaria ? 'Avisaria no celular agora.' : 'Já avisado há menos de 6 horas: não avisaria de novo.'}${a.repete ? ` Repete: ${a.repete}.` : ''}`);
  }
  if (z.aviso) console.log(`  Aviso que sairia: "${z.aviso.titulo}"`);
  if (z.cartao) console.log(`  Cartão que iria para a mesa: "${z.cartao.titulo}"`);
  console.log(`  Turno que gravaria: ${z.turno === 'ok' ? 'ok, com o resumo dos alertas' : z.turno === 'sem_trabalho' ? 'sem_trabalho ("Tudo em ordem.")' : 'nenhum (nada de novo desde o último)'}`);
}

// ---------------------------------------------------------------- Olheiro de ferramentas
const o = await rodarOlheiroDeFerramentas(e, quando, { simular: true });
const MOTIVOS = {
  pausado: 'o agente está pausado', desligado: 'o agente foi desligado', ja_rodou_esta_semana: 'já rodou nesta semana',
  falhou_3_vezes_esta_semana: 'falhou 3 vezes nesta semana', tentou_ha_pouco: 'tentou há menos de 6 horas e falhou',
  sem_orcamento_hoje: 'faltou teto hoje, tenta amanhã', sem_orcamento: 'sem sobra no teto de hoje', mesa_cheia: 'já tem 10 cartões dele na mesa',
};
console.log('\nOLHEIRO DE FERRAMENTAS');
console.log(`  Modelo: ${o.modelo}. Busca: ${o.busca.type}, até ${o.busca.max_uses} buscas, chamada direta. Ferramenta dos cartões: ${o.ferramenta} (estrita).`);
console.log(`  Semana: a de ${o.semana}. Última rodada concluída: ${o.estado.ultima_em ? emBrasilia(Date.parse(o.estado.ultima_em)) : 'nenhuma ainda'}.`);
console.log(`  Links já sugeridos: ${o.estado.links.length}. Cartões dele na mesa: ${o.cartoes_na_mesa}. Cabem nesta rodada: ${o.vagas}.`);
console.log(`  Teto: ${o.orcamento ? `sobra de ${dolar(o.orcamento.sobra_usd)} hoje` : 'não deu para ler'} (uma rodada pede ${dolar(o.reserva_usd)} livres).`);
console.log(`  Rodaria agora (no Worker, com a chave do Claude): ${o.rodaria ? 'sim' : `não, ${MOTIVOS[o.motivo] || o.motivo}`}.`);
console.log(`  Instrução: ${o.sistema.length} letras fixas e ${o.pedido.length} do pedido da semana.`);
if (args.includes('--instrucao')) {
  console.log('\n----- instrução fixa -----\n' + o.sistema);
  console.log('\n----- pedido da semana -----\n' + o.pedido);
} else {
  console.log('  (use --instrucao para ver o texto)');
}
