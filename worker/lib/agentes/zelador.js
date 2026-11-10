// O Zelador (docs/escritorio.md, sala Sistema): de hora em hora confere a saúde do escritório. Só regras, sem IA, custo zero.
// O que ele olha:
// 1. Tarefa do computador que não rodou. As tarefas agendadas do Claude gravam um turno (tabela turnos). Passaram 45
//    minutos da hora esperada e não tem turno desde então: é alerta.
// 2. Erros: turno com erro nas últimas 24 horas, atendimento do direct com erro e fila do Atendente parada (mensagem
//    esperando há mais de 5 minutos).
// 3. Gasto: o gasto de IA do dia passou de 80% do teto.
// O que ele faz com um alerta: um aviso no celular (tipo "escritorio") e, quando o problema se repete (2 dias seguidos
// ou 3 vezes em 24 horas), um cartão na mesa, com o número e a hora como prova.
// Ele não repete o mesmo aviso: só de novo depois de 6 horas ou quando o problema muda. O que já avisou fica em
// config.zelador_estado. O Zelador só lê e avisa: não religa tarefa, não mexe em agente e não chama o plantão sozinho.
import { db } from '../../nucleo/db.js';
import { criarProposta, orcamento, registrarTurno } from '../escritorio.js';
import { avisarEquipe } from '../push.js';

const AGENTE = 'zelador';
const CHAVE = 'zelador_estado';
const MINUTO = 60_000;
const HORA = 3_600_000;
const DIA = 86_400_000;
const FUSO = 3 * HORA; // o Worker roda em UTC; Brasília é UTC menos 3, sem horário de verão
const TOLERANCIA = 45 * MINUTO; // quanto a tarefa pode atrasar antes de virar alerta
const AVISAR_DE_NOVO = 6 * HORA; // o mesmo alerta, sem mudar, só volta ao celular depois disso
const EM_ORDEM_A_CADA = 6 * HORA; // o turno "Tudo em ordem" entra no máximo uma vez nesse tempo
const FILA_PARADA = 5 * MINUTO;
const JANELA_DA_FILA = 6 * HORA; // o Atendente só pega mensagem de até 6 horas (função atendente_fila)
const GASTO_ALTO = 0.8;
const COSTUME_DIAS = 14; // quantos dias de turnos ele lê para saber a que horas a tarefa do dia costuma chegar
const CARTAO_DE_NOVO = 7 * DIA; // um cartão por problema; outro só depois de uma semana
const GUARDAR = 3 * DIA;

// As tarefas agendadas do Claude no computador e a hora de Brasília em que cada uma começa (as mesmas do app, em
// Agendadas: direct-followup, posts-de-frase-do-dia e carrossel-em-alta-do-dia). agentes: basta um deles ter turno.
// horas: uma rodada em cada hora marcada. diaria: uma vez por dia. Para as diárias a hora é só o ponto de partida: o
// Zelador aprende, nos turnos, a que horas o turno costuma chegar (horaDeCostume).
const TAREFAS = [
  {
    tipo: 'nao-rodou:direct', nome: 'A rodada do direct', problema: 'A rodada do direct está falhando',
    agentes: ['vendedor-calango', 'vendedor-pergunta'], horas: [9, 10, 12, 16, 18, 19, 20, 21, 22],
    acao: 'Ver se o computador está ligado e se o Chrome do direct está na conta da agência. Depois rodar a tarefa "direct-followup" à mão para recuperar a rodada.',
    ganho: 'Cada rodada perdida deixa até 10 pessoas sem o toque no direct.',
  },
  {
    tipo: 'nao-rodou:redator-de-frase', nome: 'A tarefa dos posts de frase', problema: 'A tarefa dos posts de frase está falhando',
    agentes: ['redator-de-frase'], diaria: 8,
    acao: 'Ver se o computador ficou ligado de manhã e rodar a tarefa "posts-de-frase-do-dia" à mão. Se a agenda estiver com menos de 3 dias de posts, fazer hoje.',
    ganho: 'A agenda continua com 3 dias de posts de frase prontos para aprovar.',
  },
  {
    tipo: 'nao-rodou:redator-de-carrossel', nome: 'A tarefa do carrossel do dia', problema: 'A tarefa do carrossel do dia está falhando',
    agentes: ['redator-de-carrossel'], diaria: 10,
    acao: 'Ver se o computador ficou ligado de manhã e rodar a tarefa "carrossel-em-alta-do-dia" à mão.',
    ganho: 'O tema quente do dia não passa sem carrossel.',
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
  return { avisos: objeto(v.avisos), vezes: Array.isArray(v.vezes) ? v.vezes.filter((x) => x && x.tipo && x.em) : [], cartoes: objeto(v.cartoes), em_ordem_em: v.em_ordem_em || null };
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

function tarefasQueNaoRodaram(turnos, agentes, agora) {
  const alertas = [];
  const hoje = meiaNoiteBR(agora);
  const dia = diaBR(agora);
  // Agente pausado ou demitido não é cobrado. Sem a lista de agentes (leitura falhou), cobra todos.
  const ativo = (id) => !agentes[id] || agentes[id].estado === 'ativo';
  for (const t of TAREFAS) {
    if (!t.agentes.some(ativo)) continue;
    const dele = turnos.filter((x) => t.agentes.includes(x.agente_id)).map((x) => Date.parse(x.inicio));
    const ultimo = dele.length ? Math.max(...dele) : 0;
    const ultimoTxt = ultimo ? `O último turno foi ${quandoFoi(ultimo, agora)}.` : `Nenhum turno nos últimos ${COSTUME_DIAS} dias.`;
    if (t.horas) {
      // Só a rodada mais recente que já venceu: as anteriores foram conferidas nas horas anteriores.
      const vencidas = t.horas.filter((h) => hoje + h * HORA + TOLERANCIA <= agora);
      if (!vencidas.length) continue;
      const h = vencidas[vencidas.length - 1];
      if (dele.some((em) => em >= hoje + h * HORA)) continue;
      // Para a prova: quantas rodadas de hoje ficaram sem turno, cada uma até a hora da rodada seguinte.
      const faltaram = vencidas.filter((x, i) => {
        const de = hoje + x * HORA;
        const ate = i + 1 < t.horas.length ? hoje + t.horas[i + 1] * HORA : hoje + DIA;
        return !dele.some((em) => em >= de && em < ate);
      });
      alertas.push({
        tipo: t.tipo, assinatura: `${dia}T${dois(h)}`, problema: t.problema,
        titulo: `${t.nome} das ${h}h não rodou`,
        corpo: `Sem turno desde as ${h}h (conferido às ${horaBR(agora)}). ${ultimoTxt}`,
        prova: `Hoje, ${diaMes(agora)}, ${faltaram.length} de ${vencidas.length} ${vencidas.length === 1 ? 'rodada ficou' : 'rodadas ficaram'} sem turno: ${juntar(faltaram.map((x) => `${x}h`))}. ${ultimoTxt}`,
        acao: t.acao, ganho: t.ganho,
      });
    } else {
      const costume = horaDeCostume(turnos.filter((x) => t.agentes.includes(x.agente_id)), t.diaria * 60, agora);
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
  const porAgente = new Map();
  for (const t of turnos) {
    if (t.status !== 'erro' || agora - Date.parse(t.inicio) > DIA) continue;
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

// Uma leitura só: os atendimentos com erro das últimas 24 horas e as mensagens esperando resposta há mais de 5 minutos.
// As datas vão entre aspas porque o ponto e os dois-pontos são sinais do filtro "or" do PostgREST.
function lerAtendimentos(env, agora) {
  const data = (ms) => `"${new Date(ms).toISOString()}"`;
  const ou = `(and(classe.eq.erro,criado_em.gte.${data(agora - DIA)}),and(classe.eq.esperando,criado_em.gte.${data(agora - JANELA_DA_FILA)},criado_em.lt.${data(agora - FILA_PARADA)}))`;
  return db.select(env, 'atendimentos', { filtros: { or: ou }, select: 'id,classe,criado_em', ordem: 'criado_em.desc', limite: 300 });
}

function doAtendente(linhas, agora) {
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
  const parados = linhas.filter((l) => l.classe === 'esperando' && agora - em(l) >= FILA_PARADA && agora - em(l) <= JANELA_DA_FILA);
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

// ---------------------------------------------------------------- aviso, cartão e turno
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
// 09/11/2026 gravou às 21h59), e no minuto 7 a rodada da hora anterior já teve 67 minutos para aparecer.
export async function rodarZelador(env, quando = Date.now(), { simular = false } = {}) {
  // Seis chamadas ao banco, de uma vez. A do estado não pode falhar em silêncio (sem ela ele repetiria todos os avisos);
  // as outras, se falharem, só pulam a conferência que dependia delas.
  const pular = (nome) => (e) => { console.error('zelador', nome, e && e.message); return null; };
  const [linhaEstado, listaAgentes, turnosLidos, atendimentos, gasto] = await Promise.all([
    db.um(env, 'config', { chave: `eq.${CHAVE}` }),
    db.select(env, 'agentes', { select: 'id,nome,apelido,estado', limite: 300 }).catch(pular('agentes')),
    db.select(env, 'turnos', { filtros: { inicio: `gte.${new Date(quando - COSTUME_DIAS * DIA).toISOString()}` }, select: 'id,agente_id,status,inicio', ordem: 'inicio.desc', limite: 1000 }).catch(pular('turnos')),
    lerAtendimentos(env, quando).catch(pular('atendimentos')),
    orcamento(env).catch(pular('gasto')),
  ]);
  const estado = lerEstado(linhaEstado);
  const agentes = Object.fromEntries((listaAgentes || []).map((a) => [a.id, a]));
  const proprio = agentes[AGENTE];
  if (proprio && (proprio.estado === 'pausado' || proprio.estado === 'desligado')) return { pulou: proprio.estado, alertas: [] };
  const turnos = turnosLidos ? turnosLidos.filter((t) => Date.parse(t.inicio) <= quando) : null;

  const alertas = [
    ...(turnos ? tarefasQueNaoRodaram(turnos, agentes, quando) : []),
    ...(turnos ? turnosComErro(turnos, agentes, quando) : []),
    ...(atendimentos ? doAtendente(atendimentos, quando) : []),
    ...gastoAlto(gasto, quando),
  ];

  // O que é novo, o que já foi avisado e o que está se repetindo.
  const agora = new Date(quando).toISOString();
  const hoje = diaBR(quando);
  const ontem = diaBR(quando - DIA);
  for (const a of alertas) {
    const reg = estado.avisos[a.tipo];
    a.novo = !reg || reg.assinatura !== a.assinatura;
    a.avisar = a.novo || passou(reg.avisado_em, AVISAR_DE_NOVO, quando);
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
  const emOrdem = !alertas.length && passou(estado.em_ordem_em, EM_ORDEM_A_CADA, quando);
  const proposta = paraCartao ? cartaoDe(paraCartao, estado) : null;
  if (paraCartao) estado.cartoes[paraCartao.tipo] = agora;
  if (emOrdem) estado.em_ordem_em = agora;
  podar(estado, quando);

  const errosAtendente = atendimentos ? atendimentos.filter((l) => l.classe === 'erro').length : null;
  const esperando = atendimentos ? atendimentos.filter((l) => l.classe === 'esperando').length : null;
  if (simular) {
    return {
      simulado: true, quando: agora,
      alertas: alertas.map((a) => ({ tipo: a.tipo, titulo: a.titulo, corpo: a.corpo, avisaria: a.avisar, repete: a.repete })),
      aviso: avisar.length ? mensagem(avisar) : null,
      cartao: proposta,
      turno: avisar.length || proposta ? 'ok' : emOrdem ? 'sem_trabalho' : null,
      leu: { agentes: listaAgentes ? listaAgentes.length : null, turnos: turnos ? turnos.length : null, turnos_com_erro_24h: turnos ? turnos.filter((t) => t.status === 'erro' && quando - Date.parse(t.inicio) <= DIA).length : null, atendimentos_com_erro_24h: errosAtendente, mensagens_esperando: esperando, gasto },
    };
  }

  // Marca antes de mandar: se algo falhar depois, a próxima hora não manda o mesmo aviso de novo.
  if (avisar.length || proposta || emOrdem) await gravar(env, estado);
  const aparelhos = avisar.length ? await avisarEquipe(env, 'escritorio', mensagem(avisar)) : 0;
  let cartao = null;
  if (proposta) {
    try {
      const p = await criarProposta(env, proposta);
      cartao = { id: p.id, titulo: p.titulo };
    } catch (e) {
      console.error('zelador cartao', e && e.message);
      // Mesa cheia (409) continua marcada, para não tentar de hora em hora. Outro erro: desmarca e tenta na próxima.
      if (!(e && e.status === 409)) { delete estado.cartoes[paraCartao.tipo]; await gravar(env, estado).catch(() => {}); }
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
    turno = await registrarTurno(env, { agente: AGENTE, status: 'sem_trabalho', resumo: 'Tudo em ordem.', dados: { turnos_lidos: turnos ? turnos.length : null, gasto_hoje_usd: gasto ? gasto.gasto_hoje_usd : null } })
      .catch((e) => { console.error('zelador turno', e && e.message); return null; });
  }
  return { alertas: alertas.length, avisados: avisar.length, aparelhos, cartao, turno: turno ? turno.status : null };
}
