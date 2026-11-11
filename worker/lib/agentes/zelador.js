// O Zelador (docs/escritorio.md, sala Sistema): de hora em hora confere a saúde do escritório. Só regras, sem IA, custo zero.
// O que ele olha:
// 1. Tarefa do computador que não rodou. As tarefas agendadas do Claude gravam um turno (tabela turnos). As diárias:
//    passaram 45 minutos da hora esperada e não tem turno de hoje, é alerta. A rodada do direct (9 por dia): cada
//    rodada tem de ter o seu turno, entre a hora dela e 7 minutos depois da hora cheia seguinte (rodadasDoDia).
// 2. Erros: turno com erro nas últimas 24 horas, atendimento do direct com erro, fila do Atendente parada (mensagem
//    esperando há mais de 5 minutos) e conversa que ficou no meio do caminho (a execução caiu depois de pegar a mensagem
//    e ninguém respondeu).
// 3. Gasto: o gasto de IA do dia passou de 80% do teto.
// 4. O aviso da Meta parou: nenhuma mensagem nem comentário chegando na hora por 5 horas no horário de pico, ou
//    comentários entrando só pela leitura do relógio.
// 5. Entrega do Combo parada: a tarefa "entregar-combo-hubla" roda às 11h e às 17h e não grava turno. Quem pagou antes
//    de uma rodada e continua fora da Hubla depois dela mostra que a rodada não rodou ou não conseguiu.
// 6. O resumo das 8h não saiu: depois das 9h, o resumo de hoje não existe ou ficou pela metade ou com erro.
// 7. Turno preso: aberto ("rodando") há mais de 2 horas, sem turno mais novo do mesmo agente.
// 8. Cópia do banco parada: o sinal que scripts/backup.mjs grava (config.backup_ultimo) não existe, tem mais de 36
//    horas ou veio com zero tabelas ou zero linhas. Cópia em dia, mas com aviso dentro, é alerta menor.
// O que ele faz com um alerta: um aviso no celular (tipo "escritorio") e, quando o problema se repete (2 dias seguidos
// ou 3 vezes em 24 horas), um cartão na mesa, com o número e a hora como prova.
// Quando o aviso sai e nenhum aparelho recebe, o que não chegou vira cartão na mesa (um por dia, no máximo), dizendo
// como ligar os avisos: sem isso o alerta ficava anotado como "dado" e ninguém via.
// Ele não repete o mesmo aviso: só de novo depois de 6 horas ou quando o problema muda. O que já avisou fica em
// config.zelador_estado. O Zelador só lê e avisa: não religa tarefa, não mexe em agente e não chama o plantão sozinho.
// Pausado ou demitido no Escritório, ele não avisa nem grava nada.
import { db } from '../../nucleo/db.js';
import { entregasPendentes } from '../acoes-entregas.js';
import { criarProposta, orcamento, podeTrabalhar, registrarTurno } from '../escritorio.js';
import { avisarEquipe } from '../push.js';

const AGENTE = 'zelador';
const CHAVE = 'zelador_estado';
const MINUTO = 60_000;
const HORA = 3_600_000;
const DIA = 86_400_000;
const FUSO = 3 * HORA; // o Worker roda em UTC; Brasília é UTC menos 3, sem horário de verão
const TOLERANCIA = 45 * MINUTO; // quanto a tarefa pode atrasar antes de virar alerta
// A rodada do direct grava o turno quando termina, e a conferência roda no minuto 7 de cada hora. O turno de uma rodada
// vale até 7 minutos depois da hora cheia seguinte: são os mesmos 67 minutos que ela já tinha para aparecer, e a rodada
// que demora um pouco mais de uma hora não vira alarme.
const FOLGA_DA_RODADA = 7 * MINUTO;
const JANELA_DA_RODADA = HORA + FOLGA_DA_RODADA;
const SAIDA_CEDO = 3 * MINUTO; // a rodada sem ninguém para puxar grava "sem_trabalho" em um ou dois minutos
const TURNOS_JUNTOS = 2 * MINUTO; // os dois vendedores gravam o turno da mesma rodada um logo depois do outro
const AVISAR_DE_NOVO = 6 * HORA; // o mesmo alerta, sem mudar, só volta ao celular depois disso
const AVISAR_MENOR_DE_NOVO = 3 * DIA; // o alerta menor (marcado com "menor"), sem mudar, só volta depois disso
const EM_ORDEM_A_CADA = 6 * HORA; // o turno "Tudo em ordem" entra no máximo uma vez nesse tempo
const FILA_PARADA = 5 * MINUTO;
const JANELA_DA_FILA = 6 * HORA; // o Atendente só pega mensagem de até 6 horas (função atendente_fila)
// O aviso da Meta (webhook): o público escreve mais das 16h às 23h. Em 7 dias de novembro de 2026 o maior buraco sem
// nada chegando nesse horário foi de 4h36; 5 horas sem nada, ali, é sinal de aviso parado.
const PICO_DE = 16;
const PICO_ATE = 23;
const SEM_AVISO = 5 * HORA;
const NA_HORA = 5_000; // comentário que entra na fila em até 5 segundos veio pelo aviso (256 de 257 na mesma semana)
const SO_PELO_RELOGIO = 3 * HORA; // janela para ver comentários entrando só pela leitura do relógio
const TENTATIVA_FALHOU = 'Tentativa 1 falhou'; // o mesmo começo de detalhe que o Atendente usa (atendente.js)
const GASTO_ALTO = 0.8;
const COSTUME_DIAS = 14; // quantos dias de turnos ele lê para saber a que horas a tarefa do dia costuma chegar
const CARTAO_DE_NOVO = 7 * DIA; // um cartão por problema; outro só depois de uma semana
const GUARDAR = 3 * DIA;
// A tarefa "entregar-combo-hubla" do computador (Agendadas, no app do Claude): as horas de Brasília em que começa. Ela
// não grava turno (sem comprador novo, termina sem abrir o navegador), então a conferência é pela lista de entregas.
const ENTREGA_HORAS = [11, 17];
const ENTREGA_MARGEM = 10 * MINUTO; // quem pagou nos últimos minutos antes da rodada pode não ter entrado na lista dela
const TURNO_PRESO = 2 * HORA; // turno aberto há mais que isso: a tarefa caiu no meio
const TURNO_PRESO_ATE = 2 * DIA; // depois disso deixa de ser alarme (a tarefa que não rodou já cobra por outro lado)
const CHEFE = 'chefe-de-gabinete';
const RESUMO_DO_CHEFE = 'escritorio_resumo_dia'; // a linha de config que o Chefe de gabinete grava (chefe-de-gabinete.js)
const HORA_DO_RESUMO = 9; // o resumo sai às 8h02 (e tenta de novo às 8h22 e 8h42): às 9h já devia existir
const COPIA = 'backup_ultimo'; // a linha de config que scripts/backup.mjs grava no fim de cada cópia que deu certo
// A cópia é diária (de madrugada, pelo Agendador do Windows). 36 horas: a de ontem não saiu e a de hoje já devia ter saído.
const COPIA_PARADA = 36 * HORA;
// A lista de entregas exige cargo (acoes-entregas.js). O Zelador é o sistema lendo, sem pessoa por trás.
const DO_SISTEMA = { papel: 'administrador' };

// As tarefas agendadas do Claude no computador e a hora de Brasília em que cada uma começa (as mesmas do app, em
// Agendadas: direct-followup, posts-de-frase-do-dia, carrossel-em-alta-do-dia, fazer-aprovadas e video-do-roteiro).
// agentes: basta um deles ter turno.
// horas: uma rodada em cada hora marcada. diaria: uma vez por dia. Para as diárias a hora é só o ponto de partida: o
// Zelador aprende, nos turnos, a que horas o turno costuma chegar (horaDeCostume).
// tarefa: desde 10/11/2026 o Redator e o Designer trabalham nas duas tarefas de post (frase às 8h, carrossel às 10h), e
// cada turno diz de qual tarefa veio (dados.tarefa). Turno antigo, sem tarefa, conta pelo agente de antes (legado).
// A quarta tarefa agendada, "entregar-combo-hubla" (11h e 17h), não grava turno: é conferida pela lista de entregas
// (entregasParadas, mais abaixo).
// minuto: para a diária que não começa na hora cheia. admitido: a tarefa só é cobrada com o agente no cadastro e ativo
// (as outras, por segurança, são cobradas também quando o agente não aparece na lista). É o caso da "fazer-aprovadas"
// (docs/tarefa-aprovadas.md): sem o Executor no cadastro, pausado ou em vaga aberta, ela sai sem trabalhar e sem turno.
// O Executor só trabalha nessa tarefa, então qualquer turno dele vale (sem "tarefa" marcada, como na rodada do direct).
const TAREFAS = [
  {
    tipo: 'nao-rodou:direct', nome: 'A rodada do direct', problema: 'A rodada do direct está falhando',
    agentes: ['vendedor-calango', 'vendedor-pergunta'], horas: [9, 10, 12, 16, 18, 19, 20, 21, 22],
    acao: 'Ver se o computador está ligado e se o Chrome do direct está na conta da agência. Depois rodar a tarefa "direct-followup" à mão para recuperar a rodada.',
    ganho: 'Cada rodada perdida deixa até 10 pessoas sem o toque no direct.',
  },
  {
    tipo: 'nao-rodou:redator-de-frase', nome: 'A tarefa dos posts de frase', problema: 'A tarefa dos posts de frase está falhando',
    agentes: ['redator-de-frase', 'redator-de-carrossel'], tarefa: 'posts-de-frase-do-dia', legado: 'redator-de-frase', diaria: 8,
    acao: 'Ver se o computador ficou ligado de manhã e rodar a tarefa "posts-de-frase-do-dia" à mão. Se a agenda estiver com menos de 3 dias de posts, fazer hoje.',
    ganho: 'A agenda continua com 3 dias de posts de frase prontos para aprovar.',
  },
  {
    tipo: 'nao-rodou:redator-de-carrossel', nome: 'A tarefa do carrossel do dia', problema: 'A tarefa do carrossel do dia está falhando',
    agentes: ['redator-de-frase', 'redator-de-carrossel'], tarefa: 'carrossel-em-alta-do-dia', legado: 'redator-de-carrossel', diaria: 10,
    acao: 'Ver se o computador ficou ligado de manhã e rodar a tarefa "carrossel-em-alta-do-dia" à mão.',
    ganho: 'O tema quente do dia não passa sem carrossel.',
  },
  {
    tipo: 'nao-rodou:executor', nome: 'A tarefa dos cartões aprovados', problema: 'A tarefa dos cartões aprovados está falhando',
    agentes: ['executor'], diaria: 7, minuto: 10, admitido: true,
    acao: 'Ver se o computador ficou ligado de manhã e rodar a tarefa "fazer-aprovadas" à mão. Para desligar de propósito, pausar o Executor no Escritório.',
    ganho: 'O cartão aprovado pequeno do dia é feito sem ninguém precisar pedir.',
  },
  {
    // O vídeo do roteiro aprovado (desde 10/11/2026, às 14h). Ela grava turno todo dia, mesmo sem roteiro para produzir
    // (sem_trabalho, com o motivo), sempre com dados.tarefa = 'video-do-roteiro'. Os turnos dos vídeos feitos à mão não
    // têm tarefa e não contam (sem legado).
    tipo: 'nao-rodou:video', nome: 'A tarefa do vídeo do roteiro', problema: 'A tarefa do vídeo do roteiro está falhando',
    agentes: ['locutor', 'animador', 'revisor-de-video'], tarefa: 'video-do-roteiro', diaria: 14,
    acao: 'Ver se o computador ficou ligado à tarde e rodar a tarefa "video-do-roteiro" à mão. Sem roteiro aprovado, ela só confere a mesa e sai.',
    ganho: 'O roteiro que você aprovou vira vídeo em rascunho no mesmo dia, sem ninguém precisar lembrar.',
  },
];

// ---------------------------------------------------------------- hora de Brasília e texto
const noBrasil = (ms) => new Date(ms - FUSO); // ler sempre com getUTC*
const diaBR = (ms) => noBrasil(ms).toISOString().slice(0, 10);
const meiaNoiteBR = (ms) => { const b = noBrasil(ms); return Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) + FUSO; };
const dois = (n) => String(n).padStart(2, '0');
const horaBR = (ms) => { const b = noBrasil(ms); return `${b.getUTCHours()}h${dois(b.getUTCMinutes())}`; };
const diaMes = (ms) => { const b = noBrasil(ms); return `${dois(b.getUTCDate())}/${dois(b.getUTCMonth() + 1)}`; };
const quandoFoi = (ms, agora) => (diaBR(ms) === diaBR(agora) ? `hoje às ${horaBR(ms)}` : `em ${diaMes(ms)} às ${horaBR(ms)}`);
const horaDoDia = (min) => (min % 60 ? `${Math.floor(min / 60)}h${dois(min % 60)}` : `${min / 60}h`);
const tempo = (min) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${dois(min % 60)}`);
// Espera longa: em horas até 2 dias, depois em dias.
const espera = (ms) => (ms < 2 * DIA ? tempo(Math.round(ms / MINUTO)) : `${Math.floor(ms / DIA)} dias`);
const dolar = (v) => `US$ ${(Number(v) || 0).toFixed(2).replace('.', ',')}`;
const juntar = (l) => (l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}`);
const nomeDe = (agentes, id) => { const a = agentes[id]; return a ? (a.apelido ? `${a.apelido} (${a.nome})` : a.nome) : id; };
// Passou mais que o limite desde a data? Data vazia ou ruim conta como "passou".
const passou = (iso, limite, agora) => !(agora - Date.parse(iso || '') < limite);

// ---------------------------------------------------------------- o que ele lembra (config.zelador_estado)
// avisos: por tipo de alerta, a assinatura do que foi avisado e quando. vezes: cada vez que um problema novo apareceu
// (é daqui que sai "3 vezes em 24 horas" e "2 dias seguidos"). cartoes: quando cada tipo ganhou cartão na mesa.
function lerEstado(linha) {
  const v = (linha && linha.valor) || {};
  const objeto = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? { ...x } : {});
  // orfas_desde: quando ele começou a conferir conversa no meio do caminho (as linhas de antes não têm o motivo anotado).
  // sem_aparelho: o último cartão de "os avisos não estão chegando" ({ dia, proposta }), para sair um por dia no máximo.
  const semAparelho = v.sem_aparelho && typeof v.sem_aparelho === 'object' && v.sem_aparelho.dia ? { dia: String(v.sem_aparelho.dia), proposta: v.sem_aparelho.proposta || null } : null;
  return { avisos: objeto(v.avisos), vezes: Array.isArray(v.vezes) ? v.vezes.filter((x) => x && x.tipo && x.em) : [], cartoes: objeto(v.cartoes), em_ordem_em: v.em_ordem_em || null, orfas_desde: v.orfas_desde || null, sem_aparelho: semAparelho };
}
function podar(estado, agora) {
  for (const [k, v] of Object.entries(estado.avisos)) if (passou(v && v.avisado_em, GUARDAR, agora)) delete estado.avisos[k];
  estado.vezes = estado.vezes.filter((v) => !passou(v.em, GUARDAR, agora)).slice(-200);
  for (const [k, v] of Object.entries(estado.cartoes)) if (passou(v, 30 * DIA, agora)) delete estado.cartoes[k];
}
const gravar = (env, estado) => db.insert(env, 'config', { chave: CHAVE, valor: estado }, { upsert: true, conflito: 'chave', select: 'chave' });

// ---------------------------------------------------------------- 1) tarefa do computador que não rodou
// A que horas (minutos desde a meia-noite de Brasília) o turno do dia costuma chegar: a mediana do primeiro turno de
// cada dia, nos últimos 14 dias. As tarefas gravam o turno quando terminam, então isso já inclui o tempo de trabalho.
// Com menos de 3 dias de histórico vale a hora em que a tarefa está agendada.
function horaDeCostume(turnos, agendada, agora) {
  const hoje = meiaNoiteBR(agora);
  const porDia = new Map();
  for (const t of turnos) {
    const em = Date.parse(t.inicio);
    if (!(em < hoje)) continue;
    const dia = diaBR(em);
    const min = Math.round((em - meiaNoiteBR(em)) / MINUTO);
    if (!porDia.has(dia) || min < porDia.get(dia)) porDia.set(dia, min);
  }
  const l = [...porDia.values()].sort((a, b) => a - b);
  if (l.length < 3) return { min: agendada, aprendeu: false };
  return { min: Math.max(agendada, l[Math.floor(l.length / 2)]), aprendeu: true };
}

// O turno é desta tarefa? Sem tarefa marcada (a rodada do direct), qualquer turno dos agentes dela vale.
export const daTarefa = (t, x) => t.agentes.includes(x.agente_id) && (!t.tarefa || (x.tarefa ? x.tarefa === t.tarefa : x.agente_id === t.legado));

// A rodada do direct: cada rodada com o seu turno. Antes bastava qualquer turno depois da hora marcada; em rodadas
// seguidas (9h e 10h; 18h a 22h) o turno da rodada anterior, gravado pouco depois da hora cheia, valia também pela
// rodada seguinte e escondia uma rodada perdida. Agora cada rodada fica com um turno só e cada turno serve a uma só:
// - a janela da rodada vai da hora dela até a hora cheia seguinte mais a folga (JANELA_DA_RODADA);
// - os turnos que os dois vendedores gravam juntos, no fim da mesma rodada (os dois "ok"), contam como um;
// - na folga pode chegar também o turno da rodada seguinte. É dela o turno que saiu cedo ("sem_trabalho" até 3
//   minutos depois da hora) e o que foi aberto no começo (ainda "rodando", ou com o fim gravado depois do início). O
//   resto é o fim atrasado da rodada anterior, se ela ainda está sem turno.
// As rodadas são atendidas em ordem, a mais antiga primeiro: uma rodada só fica sem turno quando falta turno de verdade.
function sinaisDeRodada(turnos) {
  const sinais = [];
  for (const x of [...turnos].sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))) {
    const em = Date.parse(x.inicio);
    const u = sinais[sinais.length - 1];
    if (u && u.status === 'ok' && x.status === 'ok' && em - u.em <= TURNOS_JUNTOS && !u.agentes.includes(x.agente_id)) { u.agentes.push(x.agente_id); continue; }
    sinais.push({ em, status: x.status, agentes: [x.agente_id], noComeco: x.status === 'rodando' || Date.parse(x.fim || '') - em > MINUTO });
  }
  return sinais;
}

// horas: as horas de Brasília das rodadas. turnos: os da tarefa. Devolve as rodadas de hoje que já começaram, cada uma
// com { h, de (o começo), venceu (a janela já fechou), sinal (o turno que ficou com ela, ou null) }.
export function rodadasDoDia(horas, turnos, agora) {
  const hoje = meiaNoiteBR(agora);
  const comecos = new Set(horas.map((h) => hoje + h * HORA));
  const livres = sinaisDeRodada(turnos.filter((x) => { const em = Date.parse(x.inicio); return em >= hoje && em <= agora; }));
  const rodadas = horas.map((h) => ({ h, de: hoje + h * HORA })).filter((r) => r.de <= agora);
  for (const r of rodadas) {
    const seguinte = r.de + HORA;
    const daSeguinte = (s) => comecos.has(seguinte) && s.em >= seguinte && (s.noComeco || (s.status === 'sem_trabalho' && s.em - seguinte <= SAIDA_CEDO));
    const i = livres.findIndex((s) => s.em >= r.de && s.em < r.de + JANELA_DA_RODADA && !daSeguinte(s));
    r.sinal = i >= 0 ? livres.splice(i, 1)[0] : null;
    r.venceu = r.de + JANELA_DA_RODADA <= agora;
  }
  return rodadas;
}

export function tarefasQueNaoRodaram(turnos, agentes, agora) {
  const alertas = [];
  const hoje = meiaNoiteBR(agora);
  const dia = diaBR(agora);
  // Agente pausado ou demitido não é cobrado. Sem a lista de agentes (leitura falhou), cobra todos.
  const ativo = (id) => !agentes[id] || agentes[id].estado === 'ativo';
  // Tarefa com "admitido": só é cobrada com o agente no cadastro e ativo (fora do cadastro, em vaga aberta, pausado,
  // demitido ou sem a lista, não). E só a partir do dia seguinte ao da entrada dele: no dia em que o agente é criado a
  // hora da tarefa pode já ter passado, e cobrar seria alarme falso.
  const admitido = (id) => podeTrabalhar(agentes[id]) && !(Date.parse(agentes[id].criado_em) >= hoje);
  for (const t of TAREFAS) {
    if (!t.agentes.some(t.admitido ? admitido : ativo)) continue;
    const dele = turnos.filter((x) => daTarefa(t, x)).map((x) => Date.parse(x.inicio));
    const ultimo = dele.length ? Math.max(...dele) : 0;
    const ultimoTxt = ultimo ? `O último turno foi ${quandoFoi(ultimo, agora)}.` : `Nenhum turno nos últimos ${COSTUME_DIAS} dias.`;
    if (t.horas) {
      // Só a rodada mais recente que já venceu: as anteriores foram conferidas nas horas anteriores.
      const vencidas = rodadasDoDia(t.horas, turnos.filter((x) => daTarefa(t, x)), agora).filter((r) => r.venceu);
      if (!vencidas.length) continue;
      const r = vencidas[vencidas.length - 1];
      if (r.sinal) continue;
      const h = r.h;
      // Para a prova: quantas rodadas de hoje ficaram sem turno.
      const faltaram = vencidas.filter((x) => !x.sinal);
      const antes = dele.filter((em) => em < r.de);
      const antesTxt = antes.length ? `O último turno antes dela foi ${quandoFoi(Math.max(...antes), agora)}.` : `Nenhum turno antes dela nos últimos ${COSTUME_DIAS} dias.`;
      // Um turno só chegou logo depois da hora desta rodada e ficou com a anterior, que estava sem nenhum: uma das duas
      // não rodou, e o turno não diz qual.
      const anterior = vencidas[vencidas.length - 2];
      const dividido = anterior && anterior.sinal && anterior.sinal.em >= r.de ? anterior : null;
      const umSo = dividido ? `Para as rodadas das ${dividido.h}h e das ${h}h chegou um turno só, às ${horaBR(dividido.sinal.em)}` : '';
      alertas.push({
        tipo: t.tipo, assinatura: `${dia}T${dois(h)}`, problema: t.problema,
        titulo: dividido ? `${t.nome}: a das ${dividido.h}h ou a das ${h}h não rodou` : `${t.nome} das ${h}h não rodou`,
        corpo: dividido ? `${umSo} (conferido às ${horaBR(agora)}).` : `Sem turno da rodada das ${h}h (conferido às ${horaBR(agora)}). ${antesTxt}`,
        prova: `Hoje, ${diaMes(agora)}, ${faltaram.length} de ${vencidas.length} ${vencidas.length === 1 ? 'rodada ficou' : 'rodadas ficaram'} sem turno: ${juntar(faltaram.map((x) => `${x.h}h`))}. ${dividido ? `${umSo}.` : antesTxt}`,
        acao: t.acao, ganho: t.ganho,
      });
    } else {
      const costume = horaDeCostume(turnos.filter((x) => daTarefa(t, x)), t.diaria * 60 + (t.minuto || 0), agora);
      if (hoje + costume.min * MINUTO + TOLERANCIA > agora) continue;
      if (dele.some((em) => em >= hoje)) continue; // qualquer turno de hoje vale, mesmo antes da hora de costume
      const esperado = costume.aprendeu ? `O turno dela costuma chegar por volta das ${horaDoDia(costume.min)}` : `Ela está agendada para as ${horaDoDia(costume.min)}`;
      alertas.push({
        tipo: t.tipo, assinatura: dia, problema: t.problema,
        titulo: `${t.nome} não rodou hoje`,
        corpo: `${esperado} e, até as ${horaBR(agora)}, nenhum turno de hoje. ${ultimoTxt}`,
        prova: `Hoje, ${diaMes(agora)}, sem turno até as ${horaBR(agora)}. ${esperado}. ${ultimoTxt}`,
        acao: t.acao, ganho: t.ganho,
      });
    }
  }
  return alertas;
}

// ---------------------------------------------------------------- 2) erros
function turnosComErro(turnos, agentes, agora) {
  // Erro que já foi seguido de um turno que deu certo (ou sem trabalho) do mesmo agente está resolvido: não é alarme.
  const ultimoBom = new Map();
  for (const t of turnos) {
    if (t.status !== 'ok' && t.status !== 'sem_trabalho') continue;
    const quando = Date.parse(t.inicio);
    if (quando > (ultimoBom.get(t.agente_id) || 0)) ultimoBom.set(t.agente_id, quando);
  }
  const porAgente = new Map();
  for (const t of turnos) {
    if (t.status !== 'erro' || agora - Date.parse(t.inicio) > DIA) continue;
    if (Date.parse(t.inicio) < (ultimoBom.get(t.agente_id) || 0)) continue;
    porAgente.set(t.agente_id, [...(porAgente.get(t.agente_id) || []), t]);
  }
  return [...porAgente].map(([id, l]) => {
    const ultimo = l.reduce((a, b) => (Date.parse(b.inicio) > Date.parse(a.inicio) ? b : a));
    const nome = nomeDe(agentes, id);
    const n = `${l.length} ${l.length === 1 ? 'turno com erro' : 'turnos com erro'}`;
    return {
      tipo: `erro-turno:${id}`, assinatura: String(ultimo.id), problema: `${nome} está dando erro`,
      titulo: `${nome}: ${n} em 24 horas`,
      corpo: `O último foi ${quandoFoi(Date.parse(ultimo.inicio), agora)}. O que ele anotou está no perfil dele, no Escritório.`,
      prova: `${n} nas últimas 24 horas (tabela turnos). O último foi ${quandoFoi(Date.parse(ultimo.inicio), agora)}, turno ${ultimo.id}.`,
      acao: `Abrir o perfil de ${nome} no Escritório, ler o resumo do turno com erro e consertar a causa (login, permissão ou arquivo que mudou).`,
      ganho: 'O agente volta a entregar sem ninguém precisar olhar.',
    };
  });
}

// Uma leitura só: os atendimentos com erro das últimas 24 horas e tudo o que chegou nas últimas 6 horas (para ver a
// fila parada, a conversa que ficou no meio do caminho e a última chegada pelo aviso da Meta).
// As datas vão entre aspas porque o ponto e os dois-pontos são sinais do filtro "or" do PostgREST.
function lerAtendimentos(env, agora) {
  const data = (ms) => `"${new Date(ms).toISOString()}"`;
  const ou = `(and(classe.eq.erro,criado_em.gte.${data(agora - DIA)}),criado_em.gte.${data(agora - JANELA_DA_FILA)})`;
  return db.select(env, 'atendimentos', { filtros: { or: ou }, select: 'id,classe,criado_em,followup_id,detalhe,mid', ordem: 'criado_em.desc', limite: 1000 });
}

// ensaio: o Atendente está no modo ensaio (mensagem de quem não é conta de teste espera de propósito).
// orfasDesde: só confere conversa no meio do caminho nas linhas criadas depois disso.
function doAtendente(linhas, agora, { ensaio = false, orfasDesde = 0 } = {}) {
  const alertas = [];
  const em = (l) => Date.parse(l.criado_em);
  const erros = linhas.filter((l) => l.classe === 'erro' && em(l) <= agora && agora - em(l) <= DIA);
  if (erros.length) {
    const ultimo = erros.reduce((a, b) => (em(b) > em(a) ? b : a));
    const n = `${erros.length} ${erros.length === 1 ? 'erro' : 'erros'}`;
    alertas.push({
      tipo: 'erro-atendente', assinatura: String(ultimo.id), problema: 'O Atendente do direct está dando erro',
      titulo: `O Atendente teve ${n} em 24 horas`,
      corpo: `O último foi ${quandoFoi(em(ultimo), agora)}. Quem escreveu pode ter ficado sem resposta.`,
      prova: `${n} nas últimas 24 horas (tabela atendimentos, classe erro). O último foi ${quandoFoi(em(ultimo), agora)}.`,
      acao: 'Abrir o Follow-up e responder quem ficou sem resposta. Depois ver no registro do Worker o motivo do erro (chave do Claude, permissão de mensagens da Meta ou perfil sem @).',
      ganho: 'Quem escreve no direct volta a receber resposta na hora.',
    });
  }
  // Conversa no meio do caminho: a mensagem mais nova da pessoa ficou como "anotou" sem motivo (ou com a marca de que
  // a primeira tentativa falhou). O Atendente anota o motivo sempre que só anota; sem motivo, a execução caiu depois de
  // pegar a mensagem (ou antes de pôr na lista, quando nem ficha tem) e ninguém respondeu.
  const semMotivo = (l) => l.classe === 'anotou' && (!l.detalhe || String(l.detalhe).startsWith(TENTATIVA_FALHOU));
  const naJanela = (l) => em(l) >= orfasDesde && agora - em(l) >= FILA_PARADA && agora - em(l) <= JANELA_DA_FILA;
  const ultimaDe = new Map();
  for (const l of linhas) {
    if (!l.followup_id) continue;
    const u = ultimaDe.get(l.followup_id);
    if (!u || Number(l.id) > Number(u.id)) ultimaDe.set(l.followup_id, l);
  }
  const orfas = [...[...ultimaDe.values()].filter((l) => semMotivo(l) && naJanela(l)), ...linhas.filter((l) => !l.followup_id && semMotivo(l) && naJanela(l))];
  if (orfas.length) {
    const nova = orfas.reduce((a, b) => (Number(b.id) > Number(a.id) ? b : a));
    const n = `${orfas.length} ${orfas.length === 1 ? 'conversa ficou' : 'conversas ficaram'}`;
    alertas.push({
      tipo: 'sem-resposta', assinatura: String(nova.id), problema: 'Conversas do direct estão ficando sem resposta por erro',
      titulo: `${n} sem resposta no direct`,
      corpo: `O Atendente pegou a mensagem e parou no meio, sem responder nem passar para você. A última foi ${quandoFoi(em(nova), agora)}.`,
      prova: `${n} no meio do caminho nas últimas 6 horas (tabela atendimentos, classe anotou sem motivo). A última chegou ${quandoFoi(em(nova), agora)}.`,
      acao: 'Abrir o Follow-up, ver quem escreveu nesse horário e responder. Depois ver no registro do Worker por que a execução caiu (limite de chamadas ou banco fora do ar).',
      ganho: 'Ninguém que escreveu no direct fica esperando para sempre.',
    });
  }
  // No modo ensaio, quem não é conta de teste espera de propósito: a fila parada não é alerta.
  const parados = ensaio ? [] : linhas.filter((l) => l.classe === 'esperando' && agora - em(l) >= FILA_PARADA && agora - em(l) <= JANELA_DA_FILA);
  if (parados.length) {
    const antigo = parados.reduce((a, b) => (em(b) < em(a) ? b : a));
    const n = `${parados.length} ${parados.length === 1 ? 'mensagem esperando' : 'mensagens esperando'}`;
    const ha = tempo(Math.round((agora - em(antigo)) / MINUTO));
    alertas.push({
      // A assinatura é a mensagem mais antiga da fila: enquanto for a mesma, é o mesmo problema.
      tipo: 'fila-parada', assinatura: String(antigo.id), problema: 'A fila do Atendente está parando',
      titulo: 'A fila do Atendente está parada',
      corpo: `${n} resposta, a mais antiga há ${ha} (conferido às ${horaBR(agora)}).`,
      prova: `${n} resposta há mais de 5 minutos (tabela atendimentos, classe esperando). A mais antiga chegou ${quandoFoi(em(antigo), agora)}, há ${ha}.`,
      acao: 'Ver se o relógio de minuto do Worker está rodando (node scripts/worker-saude.mjs) e se o Atendente está ligado. Enquanto isso, responder pelo Follow-up.',
      ganho: 'Quem escreve no direct volta a receber resposta em menos de um minuto.',
    });
  }
  return alertas;
}

// ---------------------------------------------------------------- 4) o aviso da Meta parou
// O que chega "na hora" vem pelo aviso da Meta: toda mensagem do direct (tabela atendimentos, fora as linhas
// "resposta:", que são do painel), o pedido da palavra pelo direct e o comentário que entra na fila em poucos segundos.
// Comentário que entra minutos depois de feito foi achado pela leitura do relógio, não pelo aviso.
// Dois sinais: (a) no horário de pico, 5 horas sem nada chegando na hora; (b) em 3 horas, três ou mais comentários
// achados só pelo relógio e nenhum chegando na hora.
function lerComentarios(env, agora) {
  return db.select(env, 'respostas_gatilho', { filtros: { criado_em: `gte.${new Date(agora - SEM_AVISO).toISOString()}` }, select: 'origem,criado_em,comentado_em', ordem: 'criado_em.desc', limite: 500 });
}

function semAvisoDaMeta(atendimentos, comentarios, agora) {
  if (!atendimentos || !comentarios) return []; // sem uma das leituras não dá para afirmar nada
  const em = (l) => Date.parse(l.criado_em);
  const peloAviso = (c) => c.origem === 'direct' || (c.comentado_em && em(c) - Date.parse(c.comentado_em) < NA_HORA);
  const chegadas = [
    ...atendimentos.filter((a) => !String(a.mid || '').startsWith('resposta:')).map(em),
    ...comentarios.filter(peloAviso).map(em),
  ].filter((t) => t <= agora);
  const ultima = chegadas.length ? Math.max(...chegadas) : 0;
  const ultimaTxt = ultima ? `A última chegada na hora foi ${quandoFoi(ultima, agora)}.` : `Nenhuma chegada na hora nas últimas ${SEM_AVISO / HORA} horas.`;
  const base = {
    tipo: 'sem-aviso-meta', assinatura: diaBR(agora), problema: 'O aviso da Meta está parando',
    acao: 'Rodar "node scripts/meta-webhook.mjs situacao" para ver se o aviso continua ligado na conta e na Página, e conferir em Redes se o Instagram e o Facebook estão conectados. Enquanto isso o direct fica sem resposta: olhe o Instagram.',
    ganho: 'O direct e o Comenta X voltam a responder na hora.',
  };
  // (b) O relógio está achando comentários que o aviso não trouxe. Só conta o comentário achado até 30 minutos depois
  // de feito: mais velho que isso é a primeira leitura de um post que acabou de ganhar palavra, não aviso perdido.
  const recentes = comentarios.filter((c) => agora - em(c) <= SO_PELO_RELOGIO && em(c) <= agora);
  const peloRelogio = recentes.filter((c) => c.origem !== 'direct' && c.comentado_em && !peloAviso(c) && em(c) - Date.parse(c.comentado_em) <= 30 * MINUTO);
  const naHora = chegadas.filter((t) => agora - t <= SO_PELO_RELOGIO);
  if (peloRelogio.length >= 3 && !naHora.length) {
    return [{
      ...base, titulo: 'O aviso da Meta parou de chegar',
      corpo: `Em 3 horas, ${peloRelogio.length} comentários entraram só pela leitura do relógio e nada chegou na hora. ${ultimaTxt}`,
      prova: `Nas últimas 3 horas (conferido às ${horaBR(agora)}): ${peloRelogio.length} comentários achados pelo relógio, nenhuma mensagem e nenhum comentário pelo aviso. ${ultimaTxt}`,
    }];
  }
  // (a) Horário de pico inteiro dentro da janela, e nada chegou.
  const hora = noBrasil(agora).getUTCHours();
  const pico = hora >= PICO_DE && hora <= PICO_ATE && agora - SEM_AVISO >= meiaNoiteBR(agora) + PICO_DE * HORA;
  if (pico && !(ultima > agora - SEM_AVISO)) {
    return [{
      ...base, titulo: `Nenhum aviso da Meta há ${SEM_AVISO / HORA} horas, em horário de pico`,
      corpo: `Nenhuma mensagem do direct e nenhum comentário chegaram na hora desde as ${horaBR(agora - SEM_AVISO)} (conferido às ${horaBR(agora)}). ${ultimaTxt}`,
      prova: `Das ${horaBR(agora - SEM_AVISO)} às ${horaBR(agora)} de ${diaMes(agora)}, horário em que o público mais escreve, nada chegou pelo aviso da Meta (tabelas atendimentos e respostas_gatilho). ${ultimaTxt}`,
    }];
  }
  return [];
}

// ---------------------------------------------------------------- 3) gasto
function gastoAlto(o, agora) {
  if (!o || !(o.teto_dia_usd > 0)) return []; // teto zero é o dono travando o gasto de propósito
  const parte = o.gasto_hoje_usd / o.teto_dia_usd;
  if (parte < GASTO_ALTO) return [];
  const estourou = parte >= 1;
  const numeros = `${dolar(o.gasto_hoje_usd)} de ${dolar(o.teto_dia_usd)} (${Math.round(parte * 100)}%)`;
  return [{
    // Passar de 80% e depois passar do teto são dois avisos: a assinatura muda.
    tipo: 'gasto', assinatura: `${diaBR(agora)}:${estourou ? 100 : 80}`, problema: 'O gasto de IA está batendo no teto',
    titulo: estourou ? 'O gasto de IA de hoje passou do teto' : 'O gasto de IA de hoje passou de 80% do teto',
    corpo: `${numeros}, conferido às ${horaBR(agora)}. ${estourou ? 'O Atendente para de responder sozinho até amanhã.' : 'Se passar do teto, o Atendente para de responder sozinho até amanhã.'}`,
    prova: `Gasto de IA de hoje, ${diaMes(agora)}: ${numeros}, conferido às ${horaBR(agora)}.`,
    acao: 'Ver no Escritório qual agente e qual modelo mais gastou. Depois escolher: subir o teto do dia ou pôr esse agente num modelo mais barato.',
    ganho: 'O Atendente não para no meio do dia por falta de teto.',
  }];
}

// ---------------------------------------------------------------- 5) entrega do Combo parada
// Quem pagou um produto entregue fora da nossa área (o Combo, na Hubla) e ainda não foi adicionado lá. A lista é a
// mesma do conector (entregasPendentes). O alerta não leva nome nem e-mail de ninguém: só a conta e a hora.
// Desde 10/11/2026 a entrega é a tarefa agendada "entregar-combo-hubla", às 11h e às 17h, e ela não grava turno. A
// conferência é pelo resultado: quem pagou antes de uma rodada e continua na lista depois dela mostra que a rodada não
// rodou ou não conseguiu. Quem pagou depois da última rodada está só esperando a próxima, e não é alarme (antes a regra
// era "há mais de 6 horas", que tocaria de madrugada para toda compra feita à noite).
export function entregasParadas(entregas, agora) {
  if (!entregas || !Array.isArray(entregas.pendentes)) return [];
  // A rodada mais recente que já teve tempo de terminar, de hoje ou de ontem.
  const hoje = meiaNoiteBR(agora);
  const rodadas = [hoje - DIA, hoje].flatMap((dia) => ENTREGA_HORAS.map((h) => ({ h, de: dia + h * HORA }))).filter((r) => r.de + TOLERANCIA <= agora);
  const rodada = rodadas[rodadas.length - 1];
  const em = (p) => Date.parse(p.pago_em);
  const velhas = entregas.pendentes.filter((p) => em(p) < rodada.de - ENTREGA_MARGEM);
  if (!velhas.length) return [];
  const antiga = velhas.reduce((a, b) => (em(b) < em(a) ? b : a));
  const n = `${velhas.length} ${velhas.length === 1 ? 'entrega do Combo esperando' : 'entregas do Combo esperando'}`;
  const onde = String(antiga.plataforma || 'Hubla').replace(/[<>]/g, '').slice(0, 30);
  const desde = `O pagamento mais antigo foi ${quandoFoi(em(antiga), agora)}, há ${espera(agora - em(antiga))}.`;
  const qual = `das ${rodada.h}h${rodada.de < hoje ? ' de ontem' : ''}`;
  return [{
    // A assinatura é o pedido mais antigo da lista: enquanto for o mesmo, é o mesmo problema.
    tipo: 'entrega-parada', assinatura: String(antiga.pedido_id), problema: 'As entregas do Combo estão ficando paradas',
    titulo: `${n} depois da rodada ${qual}`,
    corpo: `Quem pagou antes da rodada ${qual} e ainda não entrou na ${onde}: a tarefa "entregar-combo-hubla" não rodou ou não conseguiu. ${desde}`,
    prova: `${n} depois da rodada ${qual} (pedidos pagos antes dela e ainda não marcados como entregues na ${onde}), conferido às ${horaBR(agora)}. ${desde}`,
    acao: `Ver se o computador estava ligado na hora da rodada e se o Chrome do Windows continua logado na ${onde}. Depois rodar /vigiar no Claude, que adiciona na ${onde} pelo Chrome e marca como entregue (roteiro em docs/entrega-hubla.md).`,
    ganho: 'Quem pagou o Combo recebe o acesso no mesmo dia.',
  }];
}

// ---------------------------------------------------------------- 6) o resumo das 8h não saiu
// Depois das 9h: o resumo de hoje não existe, ou ficou em "fazendo" ou "erro" (a linha que o Chefe de gabinete grava).
// "sem_trabalho" conta como saiu: ele rodou e não tinha o que dizer. Chefe pausado ou demitido não é cobrado.
// resumo: a linha de config (objeto vazio quando ainda não existe). agentes: o cadastro por id, ou null se não leu.
export function resumoQueNaoSaiu(resumo, agentes, agora) {
  if (!resumo || noBrasil(agora).getUTCHours() < HORA_DO_RESUMO) return [];
  if (agentes && !podeTrabalhar(agentes[CHEFE])) return [];
  const v = resumo.valor || {};
  const hoje = diaBR(agora);
  const deHoje = v.dia === hoje;
  if (deHoje && v.status !== 'fazendo' && v.status !== 'erro') return [];
  const motivo = String(v.erro || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
  const oQue = !deHoje ? 'O Chefe de gabinete não gravou nenhum resumo hoje'
    : v.status === 'erro' ? `O Chefe de gabinete tentou e deu erro${motivo ? `: ${motivo}` : '.'}`
      : `O Chefe de gabinete começou${v.criado_em ? ` às ${horaBR(Date.parse(v.criado_em))}` : ''} e não terminou`;
  const frase = /[.!?]$/.test(oQue) ? oQue : `${oQue}.`;
  return [{
    tipo: 'resumo-nao-saiu', assinatura: hoje, problema: 'O resumo das 8h está falhando',
    titulo: 'O resumo das 8h não saiu hoje',
    corpo: `${frase} Conferido às ${horaBR(agora)}.`,
    prova: `Hoje, ${diaMes(agora)}, até as ${horaBR(agora)} não existe resumo do dia pronto (config ${RESUMO_DO_CHEFE}). ${frase}`,
    acao: 'Abrir o perfil do Chefe de gabinete no Escritório e ler o último turno. As causas comuns são a chave do Claude, o teto de gasto do dia e o relógio do Worker parado às 8h.',
    ganho: 'As decisões do dia e a cobrança do que está parado voltam a chegar de manhã.',
  }];
}

// ---------------------------------------------------------------- 7) turno preso
// Turno aberto ("rodando") há mais de 2 horas e sem nenhum turno mais novo do mesmo agente: a tarefa abriu o turno e
// caiu no meio. A tela fica mostrando "trabalhando agora" para quem já parou.
export function turnosPresos(turnos, agentes, agora) {
  const em = (t) => Date.parse(t.inicio);
  const maisNovo = new Map();
  for (const t of turnos) if (em(t) > (maisNovo.get(t.agente_id) || 0)) maisNovo.set(t.agente_id, em(t));
  const presos = turnos.filter((t) => t.status === 'rodando' && agora - em(t) > TURNO_PRESO && agora - em(t) <= TURNO_PRESO_ATE && em(t) >= maisNovo.get(t.agente_id));
  if (!presos.length) return [];
  const antigo = presos.reduce((a, b) => (em(b) < em(a) ? b : a));
  const quem = juntar([...new Set(presos.map((t) => nomeDe(agentes, t.agente_id)))]);
  const n = `${presos.length} ${presos.length === 1 ? 'turno aberto' : 'turnos abertos'}`;
  return [{
    // A assinatura é o turno preso mais antigo: enquanto for o mesmo, é o mesmo problema.
    tipo: 'turno-preso', assinatura: String(antigo.id), problema: 'Turnos estão ficando abertos sem terminar',
    titulo: presos.length === 1 ? `${quem} está com um turno aberto há ${espera(agora - em(antigo))}` : `${n} há mais de 2 horas`,
    corpo: `${presos.length === 1 ? 'O turno começou' : `De ${quem}. O mais antigo começou`} ${quandoFoi(em(antigo), agora)} e não foi fechado. A tarefa deve ter caído no meio.`,
    prova: `${n} com o status "rodando" há mais de 2 horas (tabela turnos), sem turno mais novo do mesmo agente: ${quem}. O mais antigo é o turno ${antigo.id}, aberto ${quandoFoi(em(antigo), agora)}.`,
    acao: 'Ver se a tarefa desse agente ainda está rodando no computador. Se caiu, rodar de novo. O turno que ficou para trás se fecha pelo conector, com escritorio_turno, mandando o id dele e o status.',
    ganho: 'O Escritório para de mostrar "trabalhando agora" para quem já parou, e a tarefa que caiu é refeita.',
  }];
}

// ---------------------------------------------------------------- 8) cópia do banco parada
// O Supabase está no plano grátis e não guarda backup (docs/backup.md). A cópia é feita no computador da agência, uma
// vez por dia (scripts/backup.mjs), e cada cópia que dá certo grava o sinal em config.backup_ultimo:
// { em, tabelas, linhas, bytes, avisos }. É alerta quando o sinal não existe, quando a última cópia tem mais de 36
// horas e quando ela veio com zero tabelas ou zero linhas. Com a cópia em dia e algum aviso dentro dela (um extra que
// ficou de fora, por exemplo), o alerta é menor: sai uma vez, só volta depois de 3 dias e não segura o "Tudo em ordem".
// linha: a linha de config (objeto vazio quando ainda não existe; null quando a leitura falhou, e aí não afirma nada).
// Os avisos são texto do script: entram cortados, sem sinal de marcação e sem travessão.
export function copiaDoBanco(linha, agora) {
  if (!linha) return [];
  const v = linha.valor && typeof linha.valor === 'object' ? linha.valor : {};
  const em = Date.parse(v.em || '');
  const semBackup = 'O Supabase está no plano grátis e não guarda backup: esta cópia é a única.';
  const fazer = 'Rode "node scripts/backup.mjs" no computador da agência (passo a passo em docs/backup.md).';
  const parada = {
    tipo: 'copia-parada', problema: 'A cópia do banco está parando',
    acao: 'Abrir docs/backup.md. No computador da agência, rodar "node scripts/backup.mjs" e ver no Agendador de Tarefas do Windows se a tarefa "AgenciaSetup-Backup" existe e está ligada.',
    ganho: 'O banco volta a ter uma cópia de no máximo um dia para o caso de perda.',
  };
  if (!Number.isFinite(em)) {
    return [{
      ...parada, assinatura: 'sem-sinal', titulo: 'A cópia do banco nunca avisou que rodou',
      corpo: `O sinal da última cópia não existe (conferido às ${horaBR(agora)}). ${fazer}`,
      prova: `Hoje, ${diaMes(agora)} às ${horaBR(agora)}, a linha ${COPIA} da tabela config não existe ou está sem data. ${semBackup}`,
    }];
  }
  const feita = `A última cópia foi ${quandoFoi(em, agora)}`;
  if (agora - em > COPIA_PARADA) {
    const ha = espera(agora - em);
    return [{
      // A assinatura é a última cópia: enquanto não sair outra, é o mesmo problema.
      ...parada, assinatura: String(v.em), titulo: `A cópia do banco está parada há ${ha}`,
      corpo: `${feita} (conferido às ${horaBR(agora)}). ${fazer}`,
      prova: `${feita}, há ${ha}. Ela é diária e a folga é de ${COPIA_PARADA / HORA} horas (config ${COPIA}, conferido às ${horaBR(agora)}). ${semBackup}`,
    }];
  }
  const tabelas = Number(v.tabelas) || 0;
  const linhas = Number(v.linhas) || 0;
  if (!tabelas || !linhas) {
    return [{
      ...parada, assinatura: `${v.em}:vazia`, titulo: 'A última cópia do banco saiu vazia',
      corpo: `${feita} e veio vazia (tabelas: ${tabelas}, linhas: ${linhas}). ${fazer}`,
      prova: `${feita} e gravou o sinal com tabelas: ${tabelas} e linhas: ${linhas} (config ${COPIA}, conferido às ${horaBR(agora)}). ${semBackup}`,
    }];
  }
  const avisos = (Array.isArray(v.avisos) ? v.avisos : []).map((a) => String(a ?? '').replace(/[<>]/g, '').replace(/\s*[—–]\s*/g, ', ').replace(/\s+/g, ' ').trim().slice(0, 160)).filter(Boolean);
  if (!avisos.length) return [];
  const n = `${avisos.length} ${avisos.length === 1 ? 'aviso' : 'avisos'}`;
  const primeiro = /[.!?]$/.test(avisos[0]) ? avisos[0] : `${avisos[0]}.`;
  return [{
    // A assinatura é o primeiro aviso, sem os números: o mesmo aviso em cópias seguidas é o mesmo problema.
    tipo: 'copia-com-aviso', menor: true, assinatura: avisos[0].replace(/\d+/g, '#').slice(0, 80), problema: 'A cópia do banco está saindo com aviso',
    titulo: `A cópia do banco saiu com ${n}`,
    corpo: `${feita} e foi gravada. ${avisos.length === 1 ? 'O aviso' : 'O primeiro aviso'}: ${primeiro} Rode "node scripts/backup.mjs" no computador da agência para ver ${avisos.length === 1 ? 'se continua' : 'todos'} (ajuda em docs/backup.md).`,
    prova: `${feita}, com ${n} no sinal (config ${COPIA}, conferido às ${horaBR(agora)}). ${avisos.length === 1 ? 'O aviso' : 'O primeiro'}: ${primeiro}`,
    acao: 'Rodar "node scripts/backup.mjs" no computador da agência e ler os avisos que ele mostra. Aviso de extra que ficou de fora costuma ser o token da conta do Supabase vencido (SUPABASE_ACCESS_TOKEN no .env.local). Os limites da cópia estão em docs/backup.md.',
    ganho: 'A cópia volta a sair inteira, sem nada de fora.',
  }];
}

// ---------------------------------------------------------------- aviso, cartão e turno
// O aviso saiu e nenhum aparelho recebeu: o que não chegou vira cartão na mesa, com o jeito de ligar os avisos.
export function cartaoSemAparelho(avisar, agora) {
  const titulos = avisar.slice(0, 6).map((a) => a.titulo);
  return {
    agente: AGENTE, esforco: 'p',
    titulo: 'Os avisos do Escritório não estão chegando. Ligue no app Vendas do celular: Avisos > "Escritório de IA" e "Dúvida no direct"',
    prova: `Hoje, ${diaMes(agora)} às ${horaBR(agora)}, mandei ${avisar.length} ${avisar.length === 1 ? 'alerta' : 'alertas'} e nenhum aparelho recebeu: ${titulos.join('; ')}${avisar.length > 6 ? `; e mais ${avisar.length - 6}` : ''}.`,
    acao: 'No celular, abrir o app Vendas, tocar em Avisos e ligar "Escritório de IA" e "Dúvida no direct". Se os dois já estiverem ligados, desligar e ligar de novo nesse aparelho: a inscrição dele pode ter vencido.',
    ganho: 'O resumo das 8h, os alertas do Zelador e as dúvidas do direct passam a chegar na hora.',
  };
}

function mensagem(avisar) {
  if (avisar.length === 1) return { titulo: avisar[0].titulo, corpo: avisar[0].corpo, url: '/admin/escritorio' };
  const linhas = avisar.slice(0, 4).map((a) => a.titulo);
  if (avisar.length > 4) linhas.push(`E mais ${avisar.length - 4}.`);
  return { titulo: `Zelador: ${avisar.length} alertas no escritório`, corpo: linhas.join('\n'), url: '/admin/escritorio' };
}

function cartaoDe(a, estado) {
  const vezes = estado.vezes.filter((v) => v.tipo === a.tipo).slice(-6).map((v) => `${diaMes(Date.parse(v.em))} às ${horaBR(Date.parse(v.em))}`);
  return {
    agente: AGENTE, esforco: 'p', titulo: `${a.problema}: ${a.repete}`,
    prova: `${a.prova} O Zelador viu o problema ${a.repete}: ${juntar(vezes)}.`,
    acao: a.acao, ganho: a.ganho,
  };
}

// quando: o instante da conferência (o relógio manda a hora marcada). simular: devolve o que acharia, sem avisar e
// sem gravar nada.
// Para chamar uma vez por hora, perto do minuto 7: as tarefas gravam o turno quando terminam (a rodada das 21h de
// 09/11/2026 gravou às 21h59), e no minuto 7 a rodada da hora anterior já teve 67 minutos para aparecer. A janela de
// cada rodada do direct fecha nesse mesmo minuto (FOLGA_DA_RODADA): se o minuto do relógio mudar, mude a folga junto.
export async function rodarZelador(env, quando = Date.now(), { simular = false } = {}) {
  // As leituras, de uma vez: oito chamadas de antes, mais a lista de entregas (até 4) e, depois das 9h, a linha do
  // resumo do dia (1). A do estado não pode falhar em silêncio (sem ela ele repetiria todos os avisos); as outras, se
  // falharem, só pulam a conferência que dependia delas. O sinal da cópia do banco não custa chamada: vem na mesma
  // leitura de config que já trazia o modo do Atendente.
  const pular = (nome) => (e) => { console.error('zelador', nome, e && e.message); return null; };
  const horaDoResumo = noBrasil(quando).getUTCHours() >= HORA_DO_RESUMO;
  const [linhaEstado, listaAgentes, turnosLidos, atendimentos, gasto, comentarios, linhasDeConfig, entregas, resumoDoDia] = await Promise.all([
    db.um(env, 'config', { chave: `eq.${CHAVE}` }),
    db.select(env, 'agentes', { select: 'id,nome,apelido,estado,criado_em', limite: 300 }).catch(pular('agentes')),
    db.select(env, 'turnos', { filtros: { inicio: `gte.${new Date(quando - COSTUME_DIAS * DIA).toISOString()}` }, select: 'id,agente_id,status,inicio,fim,tarefa:dados->>tarefa', ordem: 'inicio.desc', limite: 1000 }).catch(pular('turnos')),
    lerAtendimentos(env, quando).catch(pular('atendimentos')),
    orcamento(env).catch(pular('gasto')),
    lerComentarios(env, quando).catch(pular('comentarios')),
    db.select(env, 'config', { filtros: { chave: `in.(atendente,${COPIA})` }, select: 'chave,valor', limite: 2 }).catch(pular('config')),
    entregasPendentes({ env, u: DO_SISTEMA }).catch(pular('entregas')),
    // Antes das 9h o resumo ainda pode estar saindo: nem lê. Linha que não existe vira objeto vazio (leitura que falhou, null).
    horaDoResumo ? db.um(env, 'config', { chave: `eq.${RESUMO_DO_CHEFE}` }).then((l) => l || {}).catch(pular('resumo')) : null,
  ]);
  const estado = lerEstado(linhaEstado);
  // Primeira rodada desta versão: as linhas de antes não têm o motivo anotado, então a conferência de conversa no meio
  // do caminho só vale daqui para a frente.
  const estreia = !estado.orfas_desde;
  if (estreia) estado.orfas_desde = new Date(quando).toISOString();
  const cfg = linhasDeConfig ? Object.fromEntries(linhasDeConfig.map((l) => [l.chave, l])) : null;
  const cfgAtendente = cfg && cfg.atendente;
  const ensaio = !!(cfgAtendente && cfgAtendente.valor && cfgAtendente.valor.modo === 'ensaio');
  // O sinal da cópia do banco: objeto vazio quando a linha ainda não existe, null quando a leitura falhou.
  const copia = cfg ? cfg[COPIA] || {} : null;
  const agentes = Object.fromEntries((listaAgentes || []).map((a) => [a.id, a]));
  // Pausado, demitido ou vaga aberta: não avisa nem grava (a mesma regra de todos os agentes do Worker). Ele é o vigia:
  // sem a lista de agentes (a leitura falhou) ou sem a própria linha no cadastro, continua olhando.
  if (agentes[AGENTE] && !podeTrabalhar(agentes[AGENTE])) return { pulou: 'agente_parado', alertas: [] };
  const turnos = turnosLidos ? turnosLidos.filter((t) => Date.parse(t.inicio) <= quando) : null;

  const alertas = [
    ...(turnos ? tarefasQueNaoRodaram(turnos, agentes, quando) : []),
    ...(turnos ? turnosComErro(turnos, agentes, quando) : []),
    ...(turnos ? turnosPresos(turnos, agentes, quando) : []),
    ...(atendimentos ? doAtendente(atendimentos, quando, { ensaio, orfasDesde: Date.parse(estado.orfas_desde) }) : []),
    ...semAvisoDaMeta(atendimentos, comentarios, quando),
    ...gastoAlto(gasto, quando),
    ...entregasParadas(entregas, quando),
    ...resumoQueNaoSaiu(resumoDoDia, listaAgentes ? agentes : null, quando),
    ...copiaDoBanco(copia, quando),
  ];

  // O que é novo, o que já foi avisado e o que está se repetindo.
  const agora = new Date(quando).toISOString();
  const hoje = diaBR(quando);
  const ontem = diaBR(quando - DIA);
  for (const a of alertas) {
    const reg = estado.avisos[a.tipo];
    a.novo = !reg || reg.assinatura !== a.assinatura;
    a.avisar = a.novo || passou(reg.avisado_em, a.menor ? AVISAR_MENOR_DE_NOVO : AVISAR_DE_NOVO, quando);
    if (a.novo) estado.vezes.push({ tipo: a.tipo, em: agora, dia: hoje });
    if (a.avisar) estado.avisos[a.tipo] = { assinatura: a.assinatura, avisado_em: agora };
    const vezes = estado.vezes.filter((v) => v.tipo === a.tipo);
    const em24h = vezes.filter((v) => quando - Date.parse(v.em) <= DIA).length;
    const doisDias = vezes.some((v) => v.dia === hoje) && vezes.some((v) => v.dia === ontem);
    a.repete = em24h >= 3 ? `${em24h} vezes em 24 horas` : doisDias ? '2 dias seguidos' : null;
  }
  const avisar = alertas.filter((a) => a.avisar);
  // Um cartão por rodada, para caber nas chamadas do plano grátis. O próximo sai na hora seguinte.
  const paraCartao = alertas.find((a) => a.repete && passou(estado.cartoes[a.tipo], CARTAO_DE_NOVO, quando)) || null;
  // O alerta menor não segura o turno "em ordem": ele pode durar semanas, e o Zelador ficaria sem dar sinal de vida.
  const menores = alertas.filter((a) => a.menor);
  const emOrdem = alertas.length === menores.length && passou(estado.em_ordem_em, EM_ORDEM_A_CADA, quando);
  const proposta = paraCartao ? cartaoDe(paraCartao, estado) : null;
  if (paraCartao) estado.cartoes[paraCartao.tipo] = agora;
  if (emOrdem) estado.em_ordem_em = agora;
  podar(estado, quando);

  const errosAtendente = atendimentos ? atendimentos.filter((l) => l.classe === 'erro').length : null;
  const esperando = atendimentos ? atendimentos.filter((l) => l.classe === 'esperando' && quando - Date.parse(l.criado_em) >= FILA_PARADA).length : null;
  if (simular) {
    return {
      simulado: true, quando: agora,
      alertas: alertas.map((a) => ({ tipo: a.tipo, titulo: a.titulo, corpo: a.corpo, avisaria: a.avisar, repete: a.repete })),
      aviso: avisar.length ? mensagem(avisar) : null,
      cartao: proposta,
      // Só mandando dá para saber quantos aparelhos recebem. Se nenhum receber, este é o cartão que iria para a mesa
      // (um por dia no máximo, e nunca com o anterior ainda esperando).
      cartao_se_o_aviso_nao_chegar: avisar.length ? cartaoSemAparelho(avisar, quando) : null,
      turno: avisar.length || proposta ? 'ok' : emOrdem ? 'sem_trabalho' : null,
      leu: {
        agentes: listaAgentes ? listaAgentes.length : null, turnos: turnos ? turnos.length : null, turnos_com_erro_24h: turnos ? turnos.filter((t) => t.status === 'erro' && quando - Date.parse(t.inicio) <= DIA).length : null,
        turnos_abertos: turnos ? turnos.filter((t) => t.status === 'rodando').length : null,
        atendimentos_com_erro_24h: errosAtendente, mensagens_esperando: esperando, comentarios_5h: comentarios ? comentarios.length : null, atendente_em_ensaio: ensaio, gasto,
        entregas_pendentes: entregas ? entregas.total_pendentes : null,
        // Quando foi a última cópia do banco (data ISO), "não existe" ou null se a leitura falhou.
        copia_do_banco: !copia ? null : (copia.valor && copia.valor.em) || 'não existe',
        resumo_do_dia: !horaDoResumo ? 'ainda não é hora de conferir' : !resumoDoDia ? null : (resumoDoDia.valor && resumoDoDia.valor.dia === hoje ? resumoDoDia.valor.status : 'não existe'),
      },
    };
  }

  // Marca antes de mandar: se algo falhar depois, a próxima hora não manda o mesmo aviso de novo.
  if (avisar.length || proposta || emOrdem || estreia) await gravar(env, estado);
  const aparelhos = avisar.length ? await avisarEquipe(env, 'escritorio', { ...mensagem(avisar), sala: 'sistema' }) : 0;
  // O aviso saiu e nenhum aparelho recebeu: o que não chegou vira cartão na mesa. Um por dia no máximo, e nunca com o
  // cartão anterior ainda esperando na mesa. Continua sendo um cartão por rodada: este passa na frente, e o cartão do
  // problema que se repete fica para a hora seguinte.
  let propostaDaVez = proposta;
  let semAparelho = false;
  const antesDoCartao = estado.sem_aparelho;
  if (avisar.length && aparelhos === 0 && (!antesDoCartao || antesDoCartao.dia !== hoje)) {
    const anterior = antesDoCartao && antesDoCartao.proposta ? await db.um(env, 'propostas', { id: `eq.${antesDoCartao.proposta}` }, 'id,status').catch(pular('cartão dos avisos')) : null;
    if (!anterior || anterior.status !== 'nova') {
      semAparelho = true;
      propostaDaVez = cartaoSemAparelho(avisar, quando);
      if (paraCartao) delete estado.cartoes[paraCartao.tipo];
      estado.sem_aparelho = { dia: hoje, proposta: null };
      await gravar(env, estado);
    }
  }
  let cartao = null;
  if (propostaDaVez) {
    try {
      const p = await criarProposta(env, propostaDaVez);
      cartao = { id: p.id, titulo: p.titulo };
      if (semAparelho) { estado.sem_aparelho = { dia: hoje, proposta: p.id }; await gravar(env, estado).catch(() => {}); }
    } catch (e) {
      console.error('zelador cartao', e && e.message);
      // Mesa cheia (409) continua marcada, para não tentar de hora em hora. Outro erro: desmarca e tenta na próxima.
      if (!(e && e.status === 409)) {
        if (semAparelho) estado.sem_aparelho = antesDoCartao; else delete estado.cartoes[paraCartao.tipo];
        await gravar(env, estado).catch(() => {});
      }
    }
  }

  // Turno só quando teve novidade (aviso ou cartão) ou, com tudo em ordem, no máximo uma vez a cada 6 horas.
  let turno = null;
  if (avisar.length || cartao) {
    const resumo = [
      `${avisar.length} ${avisar.length === 1 ? 'alerta' : 'alertas'}: ${avisar.map((a) => a.titulo).join('; ') || 'nenhum novo'}.`,
      avisar.length ? `Aviso no celular: ${aparelhos} ${aparelhos === 1 ? 'aparelho' : 'aparelhos'}.` : '',
      cartao ? `Cartão na mesa: ${cartao.titulo}.` : '',
    ].filter(Boolean).join(' ');
    turno = await registrarTurno(env, { agente: AGENTE, status: 'ok', resumo, dados: { alertas: alertas.slice(0, 12).map((a) => ({ tipo: a.tipo, titulo: a.titulo })), aparelhos, cartao: cartao ? cartao.id : null } })
      .catch((e) => { console.error('zelador turno', e && e.message); return null; });
  } else if (emOrdem) {
    turno = await registrarTurno(env, { agente: AGENTE, status: 'sem_trabalho', resumo: menores.length ? `Nada grave. ${menores.map((a) => a.titulo).join('. ')}.` : 'Tudo em ordem.', dados: { turnos_lidos: turnos ? turnos.length : null, gasto_hoje_usd: gasto ? gasto.gasto_hoje_usd : null } })
      .catch((e) => { console.error('zelador turno', e && e.message); return null; });
  }
  return { alertas: alertas.length, avisados: avisar.length, aparelhos, cartao, turno: turno ? turno.status : null };
}
