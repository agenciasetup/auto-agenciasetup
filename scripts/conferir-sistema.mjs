// Confere a sala Sistema e a base do Escritório, em duas partes:
// 1. SÓ LENDO o banco de verdade, o que os dois agentes da sala fariam agora: o Zelador
//    (worker/lib/agentes/zelador.js) e o Olheiro de ferramentas (worker/lib/agentes/olheiro-de-ferramentas.js).
//    Chama os dois com simular: true. Não avisa ninguém, não grava nada e não chama a IA. Não imprime dado de cliente:
//    só contagens, os títulos dos alertas e o estado dos dois agentes.
// 2. Com banco de mentira, em memória (um endereço que não existe e uma rede que só responde o que está neste
//    arquivo): as regras novas do Zelador (entrega do Combo parada, resumo das 8h que não saiu, turno preso, aviso que
//    não chega a nenhum aparelho virando cartão), a rodada inteira dele, e a base de worker/lib/escritorio.js (agente
//    liberado, memória do agente, turnos e consumo, a seta de desempenho). Esta parte não tem como tocar no banco real.
//   node scripts/conferir-sistema.mjs
//   node scripts/conferir-sistema.mjs --quando 2026-11-10T02:07:00Z   (como se fosse esse instante, em UTC)
//   node scripts/conferir-sistema.mjs --instrucao                     (mostra o texto que o Olheiro manda para a IA)
//   node scripts/conferir-sistema.mjs --sem-banco                     (pula a parte 1)
import { env, exige } from './env.mjs';

const args = process.argv.slice(2);
const semBanco = args.includes('--sem-banco');
const buscar = globalThis.fetch;
const emBrasilia = (ms) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(ms));
const dolar = (v) => `US$ ${(Number(v) || 0).toFixed(2).replace('.', ',')}`;
const ou = (v, vazio = 'não deu para ler') => (v === null || v === undefined ? vazio : v);

// ================================================================ 1. o banco de verdade, só lendo
if (!semBanco) {
  exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY');

  // Trava de leitura. Daqui só sai consulta ao banco: GET, e a função que soma o gasto do dia (ela só lê, mas é chamada
  // por POST). Qualquer outra chamada (gravar, avisar no celular, IA) é barrada antes de sair do computador.
  const banco = new URL(env.SUPABASE_URL).origin;
  const SO_LEEM = ['/rest/v1/rpc/escritorio_resumo'];
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

  const iQuando = args.indexOf('--quando');
  const quando = iQuando >= 0 ? Date.parse(args[iQuando + 1]) : Date.now();
  if (!Number.isFinite(quando)) { console.error('Data inválida em --quando. Use, por exemplo, 2026-11-10T02:07:00Z.'); process.exit(1); }

  console.log(`Conferência da sala Sistema (só leitura), como se fosse ${emBrasilia(quando)} de Brasília.\n`);

  // -------------------------------------------------------------- Zelador
  const z = await rodarZelador(e, quando, { simular: true });
  console.log('ZELADOR');
  if (z.pulou) {
    console.log('  Não rodaria: o agente está pausado, demitido ou ainda é vaga aberta no Escritório.');
  } else {
    const g = z.leu.gasto;
    console.log(`  Leu: ${ou(z.leu.agentes)} agentes, ${ou(z.leu.turnos)} ${z.leu.turnos === 1 ? 'turno' : 'turnos'} em 14 dias (${ou(z.leu.turnos_com_erro_24h)} com erro em 24 horas, ${ou(z.leu.turnos_abertos)} com o status "rodando"),`);
    console.log(`       ${ou(z.leu.atendimentos_com_erro_24h)} atendimentos com erro em 24 horas, ${ou(z.leu.mensagens_esperando)} mensagens esperando há mais de 5 minutos,`);
    console.log(`       ${ou(z.leu.entregas_pendentes)} entregas do Combo pendentes, resumo das 8h de hoje: ${ou(z.leu.resumo_do_dia)},`);
    console.log(`       última cópia do banco: ${Number.isFinite(Date.parse(z.leu.copia_do_banco)) ? emBrasilia(Date.parse(z.leu.copia_do_banco)) : ou(z.leu.copia_do_banco)},`);
    console.log(`       gasto de IA de hoje: ${g ? `${dolar(g.gasto_hoje_usd)} de ${dolar(g.teto_dia_usd)}` : 'não deu para ler'}.`);
    console.log(`  Alertas agora: ${z.alertas.length}`);
    for (const a of z.alertas) {
      console.log(`  - ${a.titulo}`);
      console.log(`      ${a.corpo}`);
      console.log(`      ${a.avisaria ? 'Avisaria no celular agora.' : 'Já avisado há menos de 6 horas: não avisaria de novo.'}${a.repete ? ` Repete: ${a.repete}.` : ''}`);
    }
    if (z.aviso) console.log(`  Aviso que sairia: "${z.aviso.titulo}"`);
    if (z.cartao) console.log(`  Cartão que iria para a mesa: "${z.cartao.titulo}"`);
    if (z.cartao_se_o_aviso_nao_chegar) console.log(`  Se o aviso não chegar a nenhum aparelho, o cartão seria: "${z.cartao_se_o_aviso_nao_chegar.titulo}"`);
    console.log(`  Turno que gravaria: ${z.turno === 'ok' ? 'ok, com o resumo dos alertas' : z.turno === 'sem_trabalho' ? 'sem_trabalho ("Tudo em ordem.")' : 'nenhum (nada de novo desde o último)'}`);
  }

  // -------------------------------------------------------------- Olheiro de ferramentas
  const o = await rodarOlheiroDeFerramentas(e, quando, { simular: true });
  const MOTIVOS = {
    agente_parado: 'o agente está pausado, demitido ou ainda é vaga aberta', ja_rodou_esta_semana: 'já rodou nesta semana',
    falhou_3_vezes_esta_semana: 'falhou 3 vezes nesta semana', tentou_ha_pouco: 'tentou há menos de 6 horas e falhou',
    sem_orcamento_hoje: 'faltou teto hoje, tenta amanhã', sem_orcamento: 'sem sobra no teto de hoje', mesa_cheia: 'já tem 10 cartões dele na mesa',
  };
  console.log('\nOLHEIRO DE FERRAMENTAS');
  console.log(`  Modelo: ${o.modelo}. Busca: ${o.busca.type}, até ${o.busca.max_uses} buscas, chamada direta. Ferramenta dos cartões: ${o.ferramenta} (estrita).`);
  console.log(`  Semana: a de ${o.semana}. Última rodada concluída: ${o.estado.ultima_em ? emBrasilia(Date.parse(o.estado.ultima_em)) : 'nenhuma ainda'}.`);
  console.log(`  Links já sugeridos: ${o.estado.links.length}. Cartões dele na mesa: ${o.cartoes_na_mesa}. Cabem nesta rodada: ${o.vagas}.`);
  console.log(`  Memória: ${o.memoria_cartoes} ${o.memoria_cartoes === 1 ? 'cartão anterior' : 'cartões anteriores'} com a decisão do dono (${(o.memoria.match(/Recado do dono:/g) || []).length} com recado, ${(o.memoria.match(/Resultado:/g) || []).length} com resultado). ${o.pedido.includes(o.memoria) && o.memoria_cartoes ? 'O bloco vai no pedido.' : o.memoria_cartoes ? 'ATENÇÃO: o bloco não entrou no pedido.' : 'Sem cartão anterior, o pedido diz isso.'}`);
  console.log(`  Teto: ${o.orcamento ? `sobra de ${dolar(o.orcamento.sobra_usd)} hoje` : 'não deu para ler'} (uma rodada pede ${dolar(o.reserva_usd)} livres).`);
  console.log(`  Rodaria agora (no Worker, com a chave do Claude): ${o.rodaria ? 'sim' : `não, ${MOTIVOS[o.motivo] || o.motivo}`}.`);
  console.log(`  Instrução: ${o.sistema.length} letras fixas e ${o.pedido.length} do pedido da semana.`);
  if (args.includes('--instrucao')) {
    console.log('\n----- instrução fixa -----\n' + o.sistema);
    console.log('\n----- pedido da semana -----\n' + o.pedido);
  } else {
    console.log('  (use --instrucao para ver o texto)');
  }
}

// ================================================================ 2. banco de mentira, em memória
console.log('\nAs regras e a base do Escritório, com banco de mentira (em memória):');
const { cartaoSemAparelho, copiaDoBanco, entregasParadas, resumoQueNaoSaiu, rodadasDoDia, rodarZelador: zelador, tarefasQueNaoRodaram, turnosPresos } = await import('../worker/lib/agentes/zelador.js');
const { agenteLiberado, memoriaDoAgente, podeTrabalhar, registrarTurno, sinalDe } = await import('../worker/lib/escritorio.js');

let falhas = 0;
const confere = (nome, ok, extra = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${extra && !ok ? `  ${typeof extra === 'string' ? extra : JSON.stringify(extra).slice(0, 400)}` : ''}`); if (!ok) falhas += 1; };

const HORA = 3_600_000;
const DIA = 24 * HORA;
const BANCO = 'https://banco-de-mentira.invalid';
const m = { SUPABASE_URL: BANCO, SUPABASE_SECRET_KEY: 'sb_secret_de_mentira', AMBIENTE: 'local' };
const tabelas = { agentes: [], turnos: [], propostas: [], config: [], consumo_ia: [], agentes_historico: [], atendimentos: [], respostas_gatilho: [], ofertas: [], pedidos: [], produto_acessos: [], equipe: [] };
// cai: (método, tabela) => true faz o banco de mentira responder erro 500. antes: roda antes de cada chamada.
const mundo = { chamadas: [], chaves: [], cai: null, antes: null, gastoHoje: 0.1 };
let serie = 0;
const novoId = () => `00000000-0000-4000-8000-${String(++serie).padStart(12, '0')}`;

function passa(linha, coluna, cond) {
  const v = linha[coluna];
  if (cond.startsWith('eq.')) return String(v) === cond.slice(3);
  if (cond.startsWith('neq.')) return String(v) !== cond.slice(4);
  if (cond.startsWith('in.(')) return cond.slice(4, -1).split(',').includes(String(v));
  if (cond.startsWith('gte.')) return String(v ?? '') >= cond.slice(4);
  if (cond.startsWith('gt.')) return String(v ?? '') > cond.slice(3);
  if (cond === 'is.false') return v === false;
  if (cond === 'is.true') return v === true;
  if (cond === 'not.is.null') return v !== null && v !== undefined;
  throw new Error(`O banco de mentira não conhece o filtro ${coluna}=${cond}`);
}
function filtrar(linhas, params) {
  let r = linhas;
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'or', 'and'].includes(k)) continue;
    r = r.filter((l) => passa(l, k, v));
  }
  const ordem = params.get('order');
  if (ordem) {
    const chaves = ordem.split(',').map((o) => o.split('.'));
    r = [...r].sort((a, b) => { for (const [c, dir] of chaves) { const d = String(a[c] ?? '').localeCompare(String(b[c] ?? '')); if (d) return dir === 'desc' ? -d : d; } return 0; });
  }
  const limite = Number(params.get('limit'));
  return limite ? r.slice(0, limite) : r;
}
const resposta = (corpo, status = 200, extra = {}) => new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json', ...extra } });

globalThis.fetch = async (alvo, op = {}) => {
  const url = new URL(String(alvo && alvo.url ? alvo.url : alvo));
  const metodo = String(op.method || 'GET').toUpperCase();
  if (url.origin !== BANCO || !url.pathname.startsWith('/rest/v1/')) throw new Error(`A rede de mentira recusou ${metodo} ${url.origin}${url.pathname}`);
  const caminho = url.pathname.slice('/rest/v1/'.length);
  mundo.chamadas.push(`${metodo} ${caminho}`);
  if (metodo === 'GET' && caminho === 'config') mundo.chaves.push(url.searchParams.get('chave')); // quais linhas de config cada leitura pediu
  if (mundo.antes) mundo.antes(metodo, caminho);
  if (mundo.cai && mundo.cai(metodo, caminho)) return resposta({ message: 'caiu de propósito' }, 500);
  if (caminho.startsWith('rpc/')) return resposta(caminho === 'rpc/escritorio_resumo' ? { custo_hoje: mundo.gastoHoje } : {});
  const tabela = tabelas[caminho];
  if (!tabela) throw new Error(`O banco de mentira não tem a tabela ${caminho}`);
  if (metodo === 'GET') {
    const todas = filtrar(tabela, new URLSearchParams([...url.searchParams].filter(([k]) => k !== 'limit')));
    const linhas = filtrar(tabela, url.searchParams);
    return resposta(linhas, 200, { 'content-range': `${linhas.length ? `0-${linhas.length - 1}` : '*'}/${todas.length}` });
  }
  const corpo = JSON.parse(op.body);
  if (metodo === 'POST') {
    const criadas = [];
    for (const d of Array.isArray(corpo) ? corpo : [corpo]) {
      const existente = caminho === 'config' ? tabela.find((l) => l.chave === d.chave) : null;
      if (existente) { Object.assign(existente, d); criadas.push(existente); continue; }
      const linha = caminho === 'turnos' ? { id: 1000 + tabela.length, ...d } : caminho === 'propostas' ? { id: novoId(), status: 'nova', criado_em: new Date().toISOString(), ...d } : { ...d };
      tabela.push(linha);
      criadas.push(linha);
    }
    return resposta(criadas, 201);
  }
  if (metodo === 'PATCH') {
    const mudadas = filtrar(tabela, url.searchParams);
    for (const l of mudadas) Object.assign(l, corpo);
    return resposta(mudadas);
  }
  throw new Error(`O banco de mentira não faz ${metodo}`);
};
const calado = async (fn) => { const e = console.error; console.error = () => {}; try { return await fn(); } finally { console.error = e; } };
const recusa = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };
const escritas = () => mundo.chamadas.filter((c) => !c.startsWith('GET ') && c !== 'POST rpc/escritorio_resumo');

// ---------------------------------------------------------------- as regras novas do Zelador (só as contas)
const quando = Date.parse('2026-11-12T15:07:00Z'); // quinta, 12h07 em Brasília
const iso = (ms) => new Date(ms).toISOString();
const cadastro = { 'chefe-de-gabinete': { id: 'chefe-de-gabinete', nome: 'Chefe de gabinete', apelido: null, estado: 'ativo' }, animador: { id: 'animador', nome: 'Animador', apelido: 'Noemi T.', estado: 'ativo' } };

const pendentes = (...horas) => ({ pendentes: horas.map((h, i) => ({ pedido_id: `pd${i + 1}`, numero: 10 + i, email: 'fulano@exemplo.com', nome: 'Fulano de Teste', plataforma: 'Hubla', pago_em: iso(quando - h * HORA) })), total_pendentes: horas.length });
// A tarefa "entregar-combo-hubla" roda às 11h e às 17h e não grava turno: quem pagou antes de uma rodada e continua
// na lista depois dela mostra que a rodada não rodou. São 12h07: a rodada das 11h já teve tempo de terminar.
let a = entregasParadas(pendentes(8, 30, 2, 1), quando);
confere('entrega do Combo: alerta quem pagou antes da rodada das 11h e continua na lista, contando só esses', a.length === 1 && a[0].tipo === 'entrega-parada' && a[0].titulo === '3 entregas do Combo esperando depois da rodada das 11h' && a[0].assinatura === 'pd2', a);
confere('entrega do Combo: diz desde quando e qual tarefa, sem nome nem e-mail de ninguém', /há 30h00/.test(a[0].corpo) && /entregar-combo-hubla/.test(a[0].corpo) && !/fulano|Fulano/.test(JSON.stringify(a)) && !/[—–]/.test(JSON.stringify(a)), a[0] && a[0].corpo);
confere('entrega do Combo: quem pagou depois da rodada (ou nos 10 minutos antes dela), lista vazia e leitura que falhou não alertam', entregasParadas(pendentes(1, 0.5, 1.2), quando).length === 0 && entregasParadas(pendentes(), quando).length === 0 && entregasParadas(null, quando).length === 0);
confere('entrega do Combo: espera longa aparece em dias', /há 3 dias/.test(entregasParadas(pendentes(80), quando)[0].corpo));
// Às 11h30 a rodada das 11h ainda está no prazo: vale a das 17h de ontem.
const as11h30 = quando - 37 * 60_000;
const pagoEm = (...datas) => ({ pendentes: datas.map((d, i) => ({ pedido_id: `pd${i + 1}`, numero: 10 + i, plataforma: 'Hubla', pago_em: iso(Date.parse(d)) })), total_pendentes: datas.length });
confere('entrega do Combo: compra da noite espera a rodada das 11h sem alarme, mesmo depois de mais de 6 horas', entregasParadas(pagoEm('2026-11-11T19:00:00-03:00', '2026-11-12T01:30:00-03:00'), as11h30).length === 0);
a = entregasParadas(pagoEm('2026-11-11T15:00:00-03:00', '2026-11-11T19:00:00-03:00'), as11h30);
confere('entrega do Combo: quem pagou antes da rodada das 17h de ontem e continua na lista é alerta de manhã', a.length === 1 && a[0].titulo === '1 entrega do Combo esperando depois da rodada das 17h de ontem', a);
a = entregasParadas(pagoEm('2026-11-12T12:00:00-03:00'), Date.parse('2026-11-12T17:30:00-03:00'));
confere('entrega do Combo: a rodada das 17h só é cobrada 45 minutos depois de começar', a.length === 0 && entregasParadas(pagoEm('2026-11-12T12:00:00-03:00'), Date.parse('2026-11-12T18:07:00-03:00'))[0].titulo === '1 entrega do Combo esperando depois da rodada das 17h', a);

// ---------------------------------------------------------------- a rodada do direct: cada rodada com o seu turno
console.log('\nA rodada do direct (9h, 10h, 12h, 16h e de 18h a 22h):');
const hora = (hhmm) => Date.parse(`2026-11-12T${hhmm.length === 5 ? `${hhmm}:00` : hhmm}-03:00`);
let nTurno = 0;
const doDirect = (hhmm, status = 'ok', agente = 'vendedor-calango', extra = {}) => ({ id: 900 + (++nTurno), agente_id: agente, status, inicio: iso(hora(hhmm)), fim: iso(hora(hhmm)), ...extra });
const direct = (turnos, hhmm, agentes = {}) => tarefasQueNaoRodaram(turnos, agentes, hora(hhmm)).filter((x) => x.tipo === 'nao-rodou:direct');
const semAlerta = (turnos, ...horas) => horas.every((h) => direct(turnos, h).length === 0);
confere('dia normal: cada rodada grava o turno na sua hora, nenhum alerta', semAlerta([doDirect('09:20'), doDirect('10:15'), doDirect('10:15:20', 'ok', 'vendedor-pergunta'), doDirect('12:01', 'sem_trabalho')], '10:07', '11:07', '13:07'));
a = direct([doDirect('10:02')], '11:07');
confere('a rodada das 9h termina às 10h02 e a das 10h se perde: o turno das 9h não vale mais pelas duas', a.length === 1 && a[0].titulo === 'A rodada do direct: a das 9h ou a das 10h não rodou' && a[0].assinatura === '2026-11-12T10' && /chegou um turno só, às 10h02/.test(a[0].corpo), a);
confere('a mesma rodada das 9h, sozinha, não era alarme às 10h07 (um pouco mais de uma hora ainda conta)', semAlerta([doDirect('10:02')], '10:07') && semAlerta([doDirect('10:06:30')], '10:07'));
a = direct([doDirect('10:02'), doDirect('10:02:20', 'ok', 'vendedor-pergunta')], '11:07');
confere('os dois vendedores gravam o turno juntos no fim da rodada: contam como um, não como duas rodadas', a.length === 1 && /9h ou a das 10h/.test(a[0].titulo), a);
a = direct([doDirect('10:01', 'sem_trabalho')], '10:07');
confere('a das 9h se perde e a das 10h sai cedo ("sem_trabalho" às 10h01): o alerta é da das 9h, na hora', a.length === 1 && a[0].titulo === 'A rodada do direct das 9h não rodou' && /Sem turno da rodada das 9h/.test(a[0].corpo), a);
confere('e na hora seguinte o alerta não se repete para a das 10h, que rodou', semAlerta([doDirect('10:01', 'sem_trabalho')], '11:07'));
confere('rodada longa sem alarme falso: a das 9h acaba às 10h05 e a das 10h sai cedo às 10h01', semAlerta([doDirect('10:01', 'sem_trabalho'), doDirect('10:05')], '10:07', '11:07'));
confere('rodada longa sem alarme falso: a das 9h acaba às 10h05 e a das 10h trabalha até as 10h40', semAlerta([doDirect('10:05'), doDirect('10:40')], '10:07', '11:07'));
confere('turno aberto no começo da rodada das 10h (ainda "rodando", ou já fechado) não vale pela das 9h', direct([doDirect('10:00:30', 'rodando', 'vendedor-calango', { fim: null })], '10:07').length === 1 && direct([doDirect('10:00:30', 'ok', 'vendedor-calango', { fim: iso(hora('10:05')) })], '10:07').length === 1);
const noite = [doDirect('09:25'), doDirect('10:01', 'sem_trabalho'), doDirect('16:10', 'sem_trabalho'), doDirect('18:20')];
a = direct(noite, '20:07');
confere('o computador desliga às 18h30: a das 19h vira alerta às 20h07, com o último turno antes dela', a.length === 1 && a[0].titulo === 'A rodada do direct das 19h não rodou' && a[0].assinatura === '2026-11-12T19' && /O último turno antes dela foi hoje às 18h20/.test(a[0].corpo) && /2 de 6 rodadas ficaram sem turno: 12h e 19h\./.test(a[0].prova), a[0] && a[0].prova);
confere('e às 21h07 o alerta é outro, da das 20h; às 19h07 ainda não tinha alerta', direct(noite, '21:07')[0].assinatura === '2026-11-12T20' && semAlerta(noite, '19:07'));
confere('rodada sozinha: a das 10h sem turno é alerta às 11h07, e a das 12h, com turno, fecha o assunto às 13h07', direct([doDirect('12:01', 'sem_trabalho')], '11:07')[0].titulo === 'A rodada do direct das 10h não rodou' && semAlerta([doDirect('12:01', 'sem_trabalho')], '13:07'));
a = direct([doDirect('10:10'), doDirect('10:30')], '10:07');
confere('limite conhecido: rodada de mais de 67 minutos ainda alarma, como antes, e some na hora seguinte', a.length === 1 && a[0].titulo === 'A rodada do direct das 9h não rodou' && semAlerta([doDirect('10:10'), doDirect('10:30')], '11:07'));
confere('vendedores em pausa: a rodada não é cobrada', direct([], '11:07', { 'vendedor-calango': { estado: 'pausado' }, 'vendedor-pergunta': { estado: 'pausado' } }).length === 0);
const rd = rodadasDoDia([9, 10, 12], [doDirect('09:30'), doDirect('10:01', 'sem_trabalho')], hora('10:07'));
confere('rodadasDoDia: só as que já começaram, cada uma com o seu turno, e venceu só a que já fechou a janela', rd.length === 2 && rd[0].h === 9 && rd[0].venceu === true && !!rd[0].sinal && rd[1].h === 10 && rd[1].venceu === false && rd[1].sinal.status === 'sem_trabalho', rd);

const resumo = (valor) => ({ chave: 'escritorio_resumo_dia', valor });
a = resumoQueNaoSaiu({}, cadastro, quando);
confere('resumo das 8h: depois das 9h, sem resumo de hoje, alerta', a.length === 1 && a[0].tipo === 'resumo-nao-saiu' && a[0].titulo === 'O resumo das 8h não saiu hoje' && /não gravou nenhum resumo hoje/.test(a[0].corpo), a);
confere('resumo das 8h: resumo de ontem não vale por hoje', resumoQueNaoSaiu(resumo({ dia: '2026-11-11', status: 'ok' }), cadastro, quando).length === 1);
a = resumoQueNaoSaiu(resumo({ dia: '2026-11-12', status: 'erro', erro: 'A IA não respondeu: o resumo <b>das 8h</b> não saiu.' }), cadastro, quando);
confere('resumo das 8h: parou em erro, alerta com o motivo', a.length === 1 && /tentou e deu erro: A IA não respondeu/.test(a[0].corpo) && !/[<>]/.test(a[0].corpo), a[0] && a[0].corpo);
a = resumoQueNaoSaiu(resumo({ dia: '2026-11-12', status: 'fazendo', criado_em: '2026-11-12T11:02:10Z' }), cadastro, quando);
confere('resumo das 8h: ficou pela metade, alerta com a hora em que começou', a.length === 1 && /começou às 8h02 e não terminou/.test(a[0].corpo), a[0] && a[0].corpo);
confere('resumo das 8h: saiu (ok) ou não tinha o que dizer (sem_trabalho) não alerta', resumoQueNaoSaiu(resumo({ dia: '2026-11-12', status: 'ok' }), cadastro, quando).length === 0 && resumoQueNaoSaiu(resumo({ dia: '2026-11-12', status: 'sem_trabalho' }), cadastro, quando).length === 0);
confere('resumo das 8h: antes das 9h não cobra', resumoQueNaoSaiu({}, cadastro, Date.parse('2026-11-12T11:50:00Z')).length === 0);
confere('resumo das 8h: Chefe pausado não é cobrado; sem a lista de agentes, cobra', resumoQueNaoSaiu({}, { ...cadastro, 'chefe-de-gabinete': { ...cadastro['chefe-de-gabinete'], estado: 'pausado' } }, quando).length === 0 && resumoQueNaoSaiu({}, null, quando).length === 1);
confere('resumo das 8h: leitura que falhou não alerta', resumoQueNaoSaiu(null, cadastro, quando).length === 0);

const turno = (id, agente, status, horasAtras) => ({ id, agente_id: agente, status, inicio: iso(quando - horasAtras * HORA) });
a = turnosPresos([turno(501, 'animador', 'rodando', 3), turno(500, 'animador', 'ok', 30)], cadastro, quando);
confere('turno preso: aberto há mais de 2 horas alerta, com o nome de quem é', a.length === 1 && a[0].tipo === 'turno-preso' && a[0].titulo === 'Noemi T. (Animador) está com um turno aberto há 3h00' && a[0].assinatura === '501', a);
confere('turno preso: aberto há 1 hora ainda não', turnosPresos([turno(501, 'animador', 'rodando', 1)], cadastro, quando).length === 0);
confere('turno preso: com turno mais novo do mesmo agente, o antigo não é alarme', turnosPresos([turno(502, 'animador', 'ok', 1), turno(501, 'animador', 'rodando', 5)], cadastro, quando).length === 0);
confere('turno preso: depois de 2 dias deixa de alarmar', turnosPresos([turno(501, 'animador', 'rodando', 50)], cadastro, quando).length === 0);
a = turnosPresos([turno(501, 'animador', 'rodando', 3), turno(601, 'locutor', 'rodando', 9)], cadastro, quando);
confere('turno preso: vários viram um alerta só, assinado pelo mais antigo', a.length === 1 && a[0].titulo === '2 turnos abertos há mais de 2 horas' && a[0].assinatura === '601', a);

const cartao = cartaoSemAparelho([{ titulo: 'A fila do Atendente está parada' }, { titulo: 'O resumo das 8h não saiu hoje' }], quando);
confere('aviso que não chega: o cartão diz o problema e como ligar, no título', /não estão chegando/.test(cartao.titulo) && /app Vendas/.test(cartao.titulo) && /Avisos > "Escritório de IA" e "Dúvida no direct"/.test(cartao.titulo) && cartao.titulo.length <= 160, cartao.titulo);
confere('aviso que não chega: a prova lista o que não chegou', /mandei 2 alertas e nenhum aparelho recebeu: A fila do Atendente está parada; O resumo das 8h não saiu hoje\./.test(cartao.prova) && cartao.agente === 'zelador' && !/[—–]/.test(JSON.stringify(cartao)), cartao.prova);

// ---------------------------------------------------------------- a cópia do banco (config.backup_ultimo)
// O Supabase grátis não guarda backup: a cópia é do computador (scripts/backup.mjs) e grava o sinal a cada vez que dá certo.
console.log('\nA cópia do banco:');
const sinal = (horasAtras, extra = {}) => ({ chave: 'backup_ultimo', valor: { em: iso(quando - horasAtras * HORA), tabelas: 80, linhas: 21058, bytes: 4146001, avisos: [], ...extra } });
confere('cópia em dia (9 horas, 80 tabelas, sem aviso) não alerta; com 35 horas ainda não', copiaDoBanco(sinal(9), quando).length === 0 && copiaDoBanco(sinal(35), quando).length === 0);
a = copiaDoBanco(sinal(37), quando);
confere('mais de 36 horas é alerta, com a hora da última cópia e o que fazer em uma frase', a.length === 1 && a[0].tipo === 'copia-parada' && a[0].titulo === 'A cópia do banco está parada há 37h00' && /A última cópia foi em 10\/11 às 23h07/.test(a[0].corpo) && /Rode "node scripts\/backup\.mjs"/.test(a[0].corpo) && /docs\/backup\.md/.test(a[0].corpo) && a[0].assinatura === sinal(37).valor.em && !a[0].menor, a);
confere('parada há dias aparece em dias', /parada há 3 dias/.test(copiaDoBanco(sinal(80), quando)[0].titulo));
a = copiaDoBanco({}, quando);
confere('sem o sinal (a cópia nunca rodou) é alerta', a.length === 1 && a[0].tipo === 'copia-parada' && a[0].assinatura === 'sem-sinal' && /nunca avisou/.test(a[0].titulo) && /Rode "node scripts\/backup\.mjs"/.test(a[0].corpo) && /docs\/backup\.md/.test(a[0].corpo), a);
confere('sinal sem data conta como sem sinal; leitura que falhou não alerta', copiaDoBanco({ chave: 'backup_ultimo', valor: { tabelas: 80, linhas: 10 } }, quando)[0].assinatura === 'sem-sinal' && copiaDoBanco(null, quando).length === 0);
a = copiaDoBanco(sinal(9, { linhas: 0 }), quando);
confere('zero tabelas ou zero linhas é alerta, mesmo com a cópia em dia', a.length === 1 && a[0].tipo === 'copia-parada' && a[0].titulo === 'A última cópia do banco saiu vazia' && /linhas: 0/.test(a[0].corpo) && copiaDoBanco(sinal(9, { tabelas: 0 }), quando)[0].titulo === 'A última cópia do banco saiu vazia', a);
a = copiaDoBanco(sinal(9, { avisos: ['A API de gestão não respondeu (401 <b>Unauthorized</b> — token): os extras ficaram de fora', 'O extra auth-users não foi copiado: 401'] }), quando);
confere('em dia e com aviso é alerta menor, com o primeiro texto (sem marcação e sem travessão)', a.length === 1 && a[0].tipo === 'copia-com-aviso' && a[0].menor === true && a[0].titulo === 'A cópia do banco saiu com 2 avisos' && /O primeiro aviso: A API de gestão não respondeu \(401 bUnauthorized\/b, token\): os extras ficaram de fora\. Rode "node scripts\/backup\.mjs"/.test(a[0].corpo) && /docs\/backup\.md/.test(a[0].corpo) && !/[<>—–]/.test(JSON.stringify(a)), a[0] && a[0].corpo);
confere('o mesmo aviso com outros números é o mesmo problema (não avisa de novo a cada cópia)', copiaDoBanco(sinal(9, { avisos: ['O banco tem 181 migrations aplicadas e a pasta supabase/migrations tem 182.'] }), quando)[0].assinatura === copiaDoBanco(sinal(2, { avisos: ['O banco tem 182 migrations aplicadas e a pasta supabase/migrations tem 184.'] }), quando)[0].assinatura);
a = copiaDoBanco(sinal(40, { avisos: ['Um aviso.'] }), quando);
confere('parada e com aviso dá só o alerta da cópia parada', a.length === 1 && a[0].tipo === 'copia-parada');

// ---------------------------------------------------------------- a tarefa dos cartões aprovados (o Executor)
// docs/tarefa-aprovadas.md: sem o agente "executor" no cadastro, pausado ou em vaga aberta, a tarefa sai sem trabalhar
// e sem gravar turno. O Zelador só cobra o turno do dia de quem está no cadastro e ativo.
console.log('\nA tarefa "fazer-aprovadas" (o Executor, todo dia às 7h10):');
const doExecutor = (turnos, hhmm, agentes) => tarefasQueNaoRodaram(turnos, agentes, hora(hhmm)).filter((x) => x.tipo === 'nao-rodou:executor');
const executor = (extra = {}) => ({ executor: { id: 'executor', nome: 'Executor', apelido: 'Neemias R.', estado: 'ativo', criado_em: '2026-11-10T20:00:00Z', ...extra } });
confere('sem o Executor no cadastro, ou sem a lista de agentes, a tarefa não é cobrada', doExecutor([], '09:07', cadastro).length === 0 && doExecutor([], '09:07', {}).length === 0);
confere('Executor em vaga aberta, pausado ou demitido: a tarefa não é cobrada', ['planejado', 'pausado', 'desligado'].every((estado) => doExecutor([], '09:07', executor({ estado })).length === 0));
a = doExecutor([], '08:07', executor());
confere('Executor ativo e sem turno de hoje: alerta às 8h07, com a hora marcada e o nome da tarefa', a.length === 1 && a[0].titulo === 'A tarefa dos cartões aprovados não rodou hoje' && /Ela está agendada para as 7h10/.test(a[0].corpo) && a[0].assinatura === '2026-11-12' && /"fazer-aprovadas"/.test(a[0].acao), a);
confere('antes das 7h55 (7h10 mais 45 minutos) ainda não cobra', doExecutor([], '07:50', executor()).length === 0);
const doDia = (hhmm, status) => ({ id: 950, agente_id: 'executor', status, inicio: iso(hora(hhmm)), fim: status === 'rodando' ? null : iso(hora(hhmm)), tarefa: 'fazer-aprovadas' });
confere('com o turno do dia (fez, saiu sem cartão ou ainda está trabalhando), não alerta', ['ok', 'sem_trabalho', 'rodando'].every((s) => doExecutor([doDia('07:11', s)], '08:07', executor()).length === 0));
confere('no dia em que o Executor entra no cadastro a tarefa não é cobrada; no dia seguinte, sim', doExecutor([], '17:07', executor({ criado_em: '2026-11-12T19:00:00Z' })).length === 0 && doExecutor([], '08:07', executor({ criado_em: '2026-11-11T19:00:00Z' })).length === 1);
confere('as outras tarefas continuam cobradas quando o agente não aparece na lista', direct([], '11:07', executor()).length === 1);

// ---------------------------------------------------------------- a rodada inteira do Zelador
console.log('\nA rodada do Zelador, com banco de mentira:');
const parados = ['vendedor-calango', 'vendedor-pergunta', 'redator-de-frase', 'redator-de-carrossel']; // em pausa: as tarefas do computador não são cobradas aqui
tabelas.agentes.push(
  { id: 'zelador', sala: 'sistema', nome: 'Zelador', apelido: null, onde: 'worker', estado: 'ativo', modelo: null },
  { id: 'chefe-de-gabinete', sala: 'direcao', nome: 'Chefe de gabinete', apelido: null, onde: 'worker', estado: 'ativo', modelo: null },
  { id: 'animador', sala: 'video', nome: 'Animador', apelido: 'Noemi T.', onde: 'computador', estado: 'ativo', modelo: null },
  ...parados.map((id) => ({ id, sala: 'vendas', nome: id, apelido: null, onde: 'computador', estado: 'pausado', modelo: null })),
);
tabelas.turnos.push(turno(501, 'animador', 'rodando', 3), turno(500, 'animador', 'ok', 30));
tabelas.ofertas.push({ id: 'of1', slug: 'combo', nome: 'Combo Black Calango', checkout: { entrega: { tipo: 'externa', plataforma: 'Hubla' } } }, { id: 'of2', slug: 'posts', nome: 'Posts automáticos', checkout: {} });
const pedido = (id, horasAtras) => ({ id, numero: 1, status: 'pago', oferta_id: 'of1', teste: false, itens: [], pago_em: iso(quando - horasAtras * HORA), aluno: { nome: 'Fulano de Teste', email: 'fulano@exemplo.com', celular: null } });
tabelas.pedidos.push(pedido('pd1', 8), pedido('pd2', 2), { ...pedido('pd3', 90), oferta_id: 'of2' });
tabelas.config.push(
  resumo({ dia: '2026-11-12', status: 'erro', erro: 'A IA não respondeu: o resumo das 8h não saiu.' }),
  // A entrega já tinha aparecido ontem: hoje ela "se repete" e ganha cartão próprio.
  { chave: 'zelador_estado', valor: { avisos: {}, vezes: [{ tipo: 'entrega-parada', em: iso(quando - DIA), dia: '2026-11-11' }], cartoes: {}, orfas_desde: iso(quando - 5 * DIA) } },
);
const estadoZ = () => tabelas.config.find((l) => l.chave === 'zelador_estado').valor;
const dosAvisos = () => tabelas.propostas.filter((p) => /não estão chegando/.test(p.titulo));
// O sinal da cópia do banco. Nas rodadas abaixo a cópia está sempre em dia (feita 9 horas antes de cada conferência),
// para não entrar na conta dos outros alertas; a cópia parada tem as suas rodadas no fim, com copiaEmDia desligado.
const copia = sinal(9);
tabelas.config.push(copia);
let copiaEmDia = true;
const rodarZ = async (em, opcoes) => { mundo.chamadas = []; mundo.chaves = []; if (copiaEmDia) copia.valor = sinal(9 - (em - quando) / HORA).valor; return zelador(m, em, opcoes); };

let r = await rodarZ(quando, { simular: true });
confere('simular: acha os 3 alertas novos e não grava nada', r.alertas.length === 3 && ['turno-preso', 'entrega-parada', 'resumo-nao-saiu'].every((t) => r.alertas.some((x) => x.tipo === t)) && escritas().length === 0, r.alertas && r.alertas.map((x) => x.tipo));
confere('simular: mostra as leituras novas e o cartão que sairia se o aviso não chegasse', r.leu.entregas_pendentes === 2 && r.leu.turnos_abertos === 1 && r.leu.resumo_do_dia === 'erro' && /não estão chegando/.test(r.cartao_se_o_aviso_nao_chegar.titulo), r.leu);
confere('a lista de entregas só olha a oferta entregue fora (o pedido de outra oferta não conta)', r.leu.entregas_pendentes === 2);

r = await rodarZ(quando);
confere('nenhum aparelho recebe o aviso: o que não chegou vira cartão na mesa', r.alertas === 3 && r.avisados === 3 && r.aparelhos === 0 && !!r.cartao && dosAvisos().length === 1 && tabelas.propostas.length === 1, r);
confere('o cartão lista os alertas que não chegaram, sem dado de cliente', /mandei 3 alertas e nenhum aparelho recebeu/.test(dosAvisos()[0].prova) && /turno aberto/.test(dosAvisos()[0].prova) && !/fulano|Fulano/.test(JSON.stringify(tabelas.propostas)), dosAvisos()[0] && dosAvisos()[0].prova);
confere('o estado guarda o dia e o cartão dos avisos', estadoZ().sem_aparelho.dia === '2026-11-12' && estadoZ().sem_aparelho.proposta === dosAvisos()[0].id, estadoZ().sem_aparelho);
confere('um cartão por rodada: o dos avisos passou na frente do cartão do problema que se repete', !estadoZ().cartoes['entrega-parada'] && tabelas.propostas.length === 1);
const turnoDoZelador = tabelas.turnos.find((t) => t.agente_id === 'zelador');
confere('o turno diz que o aviso foi para 0 aparelhos e que o cartão foi para a mesa', !!turnoDoZelador && /Aviso no celular: 0 aparelhos\./.test(turnoDoZelador.resumo) && /Cartão na mesa: Os avisos do Escritório/.test(turnoDoZelador.resumo), turnoDoZelador && turnoDoZelador.resumo);

r = await rodarZ(quando + HORA);
confere('na hora seguinte sai o cartão que ficou esperando (a entrega que se repete), sem aviso novo', r.avisados === 0 && !!r.cartao && /As entregas do Combo estão ficando paradas: 2 dias seguidos/.test(r.cartao.titulo) && tabelas.propostas.length === 2 && dosAvisos().length === 1, r);
r = await rodarZ(quando + 2 * HORA);
confere('duas horas depois, nada novo: não avisa, não cria cartão e não grava', r.avisados === 0 && !r.cartao && escritas().length === 0 && tabelas.propostas.length === 2, escritas());

r = await rodarZ(quando + DIA);
confere('no dia seguinte, com o cartão dos avisos ainda na mesa, não sai outro', r.aparelhos === 0 && r.avisados >= 2 && dosAvisos().length === 1 && estadoZ().sem_aparelho.dia === '2026-11-12', { r, cartoes: tabelas.propostas.map((p) => p.titulo) });
confere('nesse dia sai o cartão do resumo que falhou dois dias seguidos', tabelas.propostas.some((p) => /O resumo das 8h está falhando: 2 dias seguidos/.test(p.titulo)) && tabelas.propostas.length === 3);

dosAvisos()[0].status = 'descartada'; // o dono decidiu sobre o cartão: se o aviso continuar sem chegar, sai outro
r = await rodarZ(quando + 2 * DIA);
confere('depois que o dono decide, um dia novo sem aparelho gera outro cartão', r.aparelhos === 0 && dosAvisos().length === 2 && estadoZ().sem_aparelho.dia === '2026-11-14' && r.alertas === 2, { r, sem: estadoZ().sem_aparelho });
r = await rodarZ(quando + 2 * DIA + 7 * HORA);
confere('no mesmo dia, outro aviso sem aparelho não gera cartão de novo (um por dia)', r.avisados >= 1 && r.aparelhos === 0 && dosAvisos().length === 2, r);

tabelas.agentes[0].estado = 'pausado';
r = await rodarZ(quando + 3 * DIA);
confere('Zelador pausado: não avisa, não cria cartão e não grava nada', r.pulou === 'agente_parado' && escritas().length === 0, escritas());
tabelas.agentes[0].estado = 'ativo';

// A cópia do banco na rodada inteira. Vinte dias depois, sem entrega esperando e com o resumo do dia feito: o único
// assunto é a cópia.
const maisTarde = quando + 20 * DIA; // 02/12, 12h07 em Brasília
tabelas.pedidos.length = 0;
const resumoEmDia = (em) => { tabelas.config.find((l) => l.chave === 'escritorio_resumo_dia').valor = { dia: iso(em - 3 * HORA).slice(0, 10), status: 'ok' }; };
resumoEmDia(maisTarde);
r = await rodarZ(maisTarde, { simular: true });
confere('com a cópia em dia e o resto em ordem, nenhum alerta', r.alertas.length === 0 && r.leu.copia_do_banco === copia.valor.em && r.turno === 'sem_trabalho', r.alertas);
confere('o sinal da cópia não custa chamada: vem na mesma leitura de config que traz o modo do Atendente', mundo.chaves.filter((c) => /backup_ultimo|atendente/.test(c)).join(' ') === 'in.(atendente,backup_ultimo)', mundo.chaves);
copiaEmDia = false;
copia.valor = sinal(40 - 20 * 24).valor; // feita 40 horas antes desta rodada
r = await rodarZ(maisTarde, { simular: true });
confere('cópia parada há 40 horas: a rodada acha o alerta, sem gravar nada', r.alertas.length === 1 && r.alertas[0].tipo === 'copia-parada' && r.alertas[0].titulo === 'A cópia do banco está parada há 40h00' && r.alertas[0].avisaria === true && escritas().length === 0, r.alertas);
tabelas.config.splice(tabelas.config.indexOf(copia), 1);
r = await rodarZ(maisTarde, { simular: true });
confere('sem a linha do sinal: alerta de que a cópia nunca rodou', r.alertas.length === 1 && /nunca avisou/.test(r.alertas[0].titulo) && r.leu.copia_do_banco === 'não existe', r.alertas);
mundo.cai = (metodo, caminho) => metodo === 'GET' && caminho === 'config' && /backup_ultimo/.test(mundo.chaves[mundo.chaves.length - 1] || '');
r = await calado(() => rodarZ(maisTarde, { simular: true }));
mundo.cai = null;
confere('se a leitura do sinal falhar, não afirma nada sobre a cópia (e segue com o resto)', r.alertas.length === 0 && r.leu.copia_do_banco === null && r.leu.atendente_em_ensaio === false, r.alertas);
// Alerta menor: a cópia saiu, com um aviso dentro. Avisa uma vez, não segura o turno "em ordem" e volta depois de 3 dias.
tabelas.config.push(copia);
const comAviso = (em) => { copia.valor = { ...sinal(9 - (em - quando) / HORA).valor, avisos: ['O extra auth-users não foi copiado: 401'] }; resumoEmDia(em); };
comAviso(maisTarde);
r = await rodarZ(maisTarde);
confere('cópia com aviso: um alerta menor, avisado uma vez', r.alertas === 1 && r.avisados === 1 && r.turno === 'ok' && estadoZ().avisos['copia-com-aviso'].assinatura === 'O extra auth-users não foi copiado: #', r);
comAviso(maisTarde + 7 * HORA);
r = await rodarZ(maisTarde + 7 * HORA);
const ultimoTurno = tabelas.turnos.filter((t) => t.agente_id === 'zelador').pop();
confere('7 horas depois, o mesmo aviso não volta ao celular, e o Zelador ainda dá o sinal de vida dele', r.alertas === 1 && r.avisados === 0 && r.turno === 'sem_trabalho' && ultimoTurno.resumo === 'Nada grave. A cópia do banco saiu com 1 aviso.', { r, resumo: ultimoTurno && ultimoTurno.resumo });
comAviso(maisTarde + 2 * DIA);
r = await rodarZ(maisTarde + 2 * DIA, { simular: true });
const menor = (x) => x.alertas.find((y) => y.tipo === 'copia-com-aviso');
confere('2 dias depois ainda não avisa de novo; com 3 dias, lembra', menor(r).avisaria === false, menor(r));
comAviso(maisTarde + 3 * DIA);
r = await rodarZ(maisTarde + 3 * DIA, { simular: true });
confere('com 3 dias do mesmo aviso, lembra uma vez', menor(r).avisaria === true && menor(r).repete === null, menor(r));
copiaEmDia = true;

// ---------------------------------------------------------------- escritorio.js: o agente pode trabalhar?
console.log('\nA base do Escritório (worker/lib/escritorio.js):');
tabelas.agentes.push({ id: 'vaga', sala: 'video', nome: 'Vaga', onde: 'worker', estado: 'planejado', modelo: 'claude-sonnet-5-5' }, { id: 'demitido', sala: 'video', nome: 'Demitido', onde: 'worker', estado: 'desligado', modelo: null });
confere('agente liberado: só quem está ativo', (await agenteLiberado(m, 'zelador')) === true && (await agenteLiberado(m, 'vendedor-calango')) === false && (await agenteLiberado(m, 'vaga')) === false && (await agenteLiberado(m, 'demitido')) === false);
confere('agente liberado: quem não existe no cadastro não trabalha', (await agenteLiberado(m, 'ninguem')) === false && podeTrabalhar(null) === false && podeTrabalhar({ estado: 'ativo' }) === true);
mundo.cai = (metodo, caminho) => caminho === 'agentes';
confere('agente liberado: se o banco falhar na leitura, deixa trabalhar', (await calado(() => agenteLiberado(m, 'vendedor-calango'))) === true);
mundo.cai = null;
mundo.chamadas = [];
await agenteLiberado(m, 'zelador');
confere('agente liberado: custa uma leitura', mundo.chamadas.join() === 'GET agentes');

// ---------------------------------------------------------------- escritorio.js: a memória do agente
tabelas.propostas.push(
  { id: novoId(), agente_id: 'vaga', titulo: 'Proposta <b>antiga</b>\ncom quebra', status: 'descartada', motivo: 'Não quero isso: prefiro vídeo curto.', resultado: null, links: [], criado_em: iso(quando - 5 * DIA), decidida_em: iso(quando - 4 * DIA) },
  { id: novoId(), agente_id: 'vaga', titulo: 'Proposta que deu certo', status: 'feita', motivo: null, resultado: 'Subiu 20% o alcance.', links: [], criado_em: iso(quando - 3 * DIA), decidida_em: iso(quando - 3 * DIA) },
  { id: novoId(), agente_id: 'vaga', titulo: 'Proposta na mesa', status: 'nova', motivo: null, resultado: null, links: [], criado_em: iso(quando - DIA), decidida_em: null },
);
mundo.chamadas = [];
let mem = await memoriaDoAgente(m, 'vaga');
confere('memória do agente: uma leitura traz os cartões dele, do mais novo para o mais antigo', mundo.chamadas.join() === 'GET propostas' && mem.linhas.length === 3 && mem.linhas[0].titulo === 'Proposta na mesa' && mem.na_mesa === 1, mem.linhas.map((p) => p.titulo));
confere('memória do agente: o texto traz a decisão, o recado do dono e o resultado, em uma linha por cartão', mem.texto.split('\n').length === 3 && /\[descartado pelo dono\] Proposta b antiga \/b com quebra \| Recado do dono: Não quero isso: prefiro vídeo curto\./.test(mem.texto) && /\[aprovado e feito\] Proposta que deu certo \| Resultado: Subiu 20% o alcance\./.test(mem.texto) && !/[<>]/.test(mem.texto), mem.texto);
confere('memória do agente: o bloco vem entre marcações', mem.bloco.startsWith('<suas_propostas_anteriores>\n- [') && mem.bloco.endsWith('\n</suas_propostas_anteriores>'));
mem = await memoriaDoAgente(m, 'zelador', { limite: 2 });
confere('memória do agente: só os cartões do próprio agente, até o limite', mem.linhas.length === 2 && mem.linhas.every((p) => p.agente_id === 'zelador'));
mundo.cai = (metodo, caminho) => caminho === 'propostas';
mem = await calado(() => memoriaDoAgente(m, 'vaga'));
confere('memória do agente: se a leitura falhar, o agente segue sem memória', mem.falhou === true && mem.linhas.length === 0 && mem.na_mesa === 0 && mem.bloco === 'Você ainda não tem propostas anteriores.');
mundo.cai = null;

// ---------------------------------------------------------------- escritorio.js: turnos e consumo
const consumoDe = (agente) => tabelas.consumo_ia.filter((c) => c.agente_id === agente);
const soma = (agente) => Math.round(consumoDe(agente).reduce((s, c) => s + Number(c.custo_usd), 0) * 10000) / 10000;
let erro = await recusa(() => registrarTurno(m, { agente: 'animador', status: 'ok', resumo: 'x', dados: { texto: 'a'.repeat(4200) } }));
confere('turno: dados com mais de 4.000 caracteres são recusados com o tamanho, em vez de sumir', !!erro && erro.status === 400 && /4\.2\d\d caracteres/.test(erro.message) && /limite é 4\.000/.test(erro.message) && !tabelas.turnos.some((t) => t.resumo === 'x'), erro && erro.message);
erro = await recusa(() => registrarTurno(m, { agente: 'animador', status: 'ok', resumo: 'y', dados: ['lista'] }));
confere('turno: dados que não são objeto são recusados', !!erro && erro.status === 400 && /objeto/.test(erro.message));
let t = await registrarTurno(m, { agente: 'animador', status: 'ok', resumo: 'Com dados em texto.', dados: '{"tarefa":"carrossel-em-alta-do-dia","n":2}' });
confere('turno: dados em texto JSON são aceitos como objeto (a marca da tarefa não some)', tabelas.turnos.find((x) => x.id === t.turno).dados.tarefa === 'carrossel-em-alta-do-dia');
t = await registrarTurno(m, { agente: 'animador', status: 'ok', resumo: 'Sem dados.' });
confere('turno: sem dados, guarda objeto vazio', JSON.stringify(tabelas.turnos.find((x) => x.id === t.turno).dados) === '{}');

// Abrir com custo, fechar com o custo total: entra só a diferença. Fechar de novo não conta outra vez.
const aberto = await registrarTurno(m, { agente: 'animador', status: 'rodando', resumo: 'Renderizando.', custo_usd: 0.02, tokens_entrada: 1000, tokens_saida: 100, modelo: 'claude-sonnet-5-5', dados: { tarefa: 'video-do-roteiro' } });
confere('turno aberto com custo: uma linha no consumo', consumoDe('animador').length === 1 && soma('animador') === 0.02 && aberto.status === 'rodando' && aberto.fim === null, consumoDe('animador'));
let fechado = await registrarTurno(m, { agente: 'animador', id: aberto.turno, status: 'ok', resumo: 'Vídeo pronto.', custo_usd: 0.05, tokens_entrada: 2600, tokens_saida: 300, modelo: 'claude-sonnet-5-5', dados: { quadros: 900 } });
const linhaDoTurno = () => tabelas.turnos.find((x) => x.id === aberto.turno);
confere('fechar o turno com custo: o consumo recebe só a diferença (o total bate com o custo do turno)', consumoDe('animador').length === 2 && soma('animador') === 0.05 && Number(consumoDe('animador')[1].custo_usd) === 0.03 && consumoDe('animador')[1].tokens_entrada === 1600 && Number(linhaDoTurno().custo_usd) === 0.05 && fechado.status === 'ok', consumoDe('animador'));
confere('fechar o turno junta os dados da abertura com os do fechamento', linhaDoTurno().dados.tarefa === 'video-do-roteiro' && linhaDoTurno().dados.quadros === 900 && linhaDoTurno().resumo === 'Vídeo pronto.', linhaDoTurno().dados);
await registrarTurno(m, { agente: 'animador', id: aberto.turno, status: 'ok', custo_usd: 0.05 });
confere('fechar de novo com o mesmo custo não conta duas vezes, e o resumo de antes fica', consumoDe('animador').length === 2 && soma('animador') === 0.05 && linhaDoTurno().resumo === 'Vídeo pronto.');
const semCusto = await registrarTurno(m, { agente: 'animador', status: 'rodando', custo_usd: 0.01 });
await registrarTurno(m, { agente: 'animador', id: semCusto.turno, status: 'ok' });
confere('fechar sem informar custo mantém o custo da abertura no turno e não anota nada a mais', Number(tabelas.turnos.find((x) => x.id === semCusto.turno).custo_usd) === 0.01 && consumoDe('animador').length === 3 && soma('animador') === 0.06);
erro = await recusa(() => registrarTurno(m, { agente: 'animador', id: 999999, status: 'ok' }));
confere('fechar um turno que não existe é recusado', !!erro && erro.status === 404);
erro = await recusa(() => registrarTurno(m, { agente: 'zelador', id: aberto.turno, status: 'ok', custo_usd: 9 }));
confere('um agente não fecha o turno de outro', !!erro && erro.status === 404 && soma('zelador') === 0);

// A admissão no primeiro turno: só de quem ainda é vaga aberta, e sem derrubar o turno se falhar.
await registrarTurno(m, { agente: 'vaga', status: 'ok', resumo: 'Primeiro turno.', custo_usd: 0.04 });
const vaga = () => tabelas.agentes.find((x) => x.id === 'vaga');
confere('vaga aberta: o primeiro turno que dá certo contrata, com a linha na carreira', vaga().estado === 'ativo' && tabelas.agentes_historico.filter((h) => h.agente_id === 'vaga' && h.tipo === 'admitido').length === 1 && soma('vaga') === 0.04);
await registrarTurno(m, { agente: 'vendedor-calango', status: 'ok', resumo: 'Tarefa rodou com o agente em pausa.' });
await registrarTurno(m, { agente: 'demitido', status: 'ok', resumo: 'Tarefa rodou com o agente demitido.' });
confere('turno de quem o dono pausou ou demitiu não reativa o agente', tabelas.agentes.find((x) => x.id === 'vendedor-calango').estado === 'pausado' && tabelas.agentes.find((x) => x.id === 'demitido').estado === 'desligado');
// O dono pausa entre a leitura do agente e a troca de estado: a troca não acontece.
tabelas.agentes.push({ id: 'corrida', sala: 'video', nome: 'Corrida', onde: 'worker', estado: 'planejado', modelo: null });
mundo.antes = (metodo, caminho) => { if (metodo === 'POST' && caminho === 'turnos') tabelas.agentes.find((x) => x.id === 'corrida').estado = 'pausado'; };
await registrarTurno(m, { agente: 'corrida', status: 'ok', resumo: 'O dono pausou no meio.' });
mundo.antes = null;
confere('pausado no meio do turno: a admissão não passa por cima da pausa', tabelas.agentes.find((x) => x.id === 'corrida').estado === 'pausado' && !tabelas.agentes_historico.some((h) => h.agente_id === 'corrida'));
// A troca de estado falha depois de o custo ter sido anotado: o turno não falha (quem chamou anotaria o custo de novo).
tabelas.agentes.push({ id: 'azarado', sala: 'video', nome: 'Azarado', onde: 'worker', estado: 'planejado', modelo: null });
mundo.cai = (metodo, caminho) => metodo === 'PATCH' && caminho === 'agentes';
erro = await calado(() => recusa(() => registrarTurno(m, { agente: 'azarado', status: 'ok', resumo: 'A admissão falhou.', custo_usd: 0.07 })));
mundo.cai = null;
confere('admissão que falha não derruba o turno: o custo fica anotado uma vez só', erro === null && consumoDe('azarado').length === 1 && soma('azarado') === 0.07 && tabelas.turnos.some((x) => x.agente_id === 'azarado'), erro && erro.message);
// O turno falha antes de anotar o custo: aí sim quem chamou anota (uma vez).
mundo.cai = (metodo, caminho) => metodo === 'POST' && caminho === 'turnos';
erro = await calado(() => recusa(() => registrarTurno(m, { agente: 'azarado', status: 'ok', resumo: 'O banco caiu.', custo_usd: 0.09 })));
mundo.cai = null;
confere('turno que não grava falha antes de anotar o custo (quem chamou anota, uma vez)', !!erro && consumoDe('azarado').length === 1);

// ---------------------------------------------------------------- escritorio.js: a seta de desempenho
const vendedor = (vendas) => ({ estado: 'ativo', turnos: { ultimo: { status: 'ok' }, hoje: 0, erros_7d: 0 }, trabalho: null, vendas, placar: null });
let s = sinalDe(vendedor({ compraram: 5, compraram_7d: 0 }));
confere('seta: venda antiga no placar não deixa verde para sempre', s.nivel === 'neutro', s);
s = sinalDe(vendedor({ compraram: 5, compraram_7d: 2 }));
confere('seta: venda dos últimos 7 dias deixa verde, com o número da semana', s.nivel === 'bem' && s.motivo === '2 vendas nos últimos 7 dias.', s);
s = sinalDe(vendedor({ compraram: 5, compraram_7d: null }));
confere('seta: sem a leitura da semana, não inventa venda', s.nivel === 'neutro', s);
s = sinalDe({ ...vendedor({ compraram: 5, compraram_7d: 3 }), turnos: { ultimo: { status: 'erro' }, hoje: 1, erros_7d: 1 } });
confere('seta: erro no último turno continua pesando mais que a venda', s.nivel === 'mal', s);
confere('seta: agente em pausa não tem seta', sinalDe({ ...vendedor({ compraram_7d: 3 }), estado: 'pausado' }) === null);

// ---------------------------------------------------------------- escritorio.js: a fala do Calango (o balão da planta)
// Só contas: quem fala, o quê e por quanto tempo. A frase é curta, fixa por agente, e nunca leva o resumo do turno.
const { FALA_MAX, falaDe, frasesDaFala } = await import('../worker/lib/escritorio.js');
const AGORA_DA_FALA = Date.parse('2026-11-10T15:00:00Z');
const haMin = (min) => new Date(AGORA_DA_FALA - min * 60_000).toISOString();
const calango = (id, extra = {}) => ({ id, sala: 'vendas', estado: 'ativo', offline: false, turnos: null, trabalho: null, ...extra });
const turnoHa = (status, min, extra = {}) => ({ ultimo: { status, inicio: haMin(min + 2), fim: status === 'rodando' ? null : haMin(min), ...extra } });
const diz = (a) => falaDe(a, AGORA_DA_FALA);
const frases = frasesDaFala();
// Os dois travessões e as reticências num caractere só, pelos códigos (para este arquivo não ter nenhum deles escrito).
const PROIBIDOS = new RegExp(`[${String.fromCharCode(0x2014, 0x2013, 0x2026)}]`);
const ruins = frases.filter((f) => f.length > FALA_MAX || f.length < 8 || PROIBIDOS.test(f) || /\.\.\.|[0-9]|R\$|@|[.!?]$/.test(f) || f[0] !== f[0].toUpperCase());
confere(`fala: as ${frases.length} frases fixas cabem em ${FALA_MAX} letras, sem travessão, reticências, número, valor nem @`, frases.length > 60 && ruins.length === 0, ruins);
let f = diz(calango('atendente', { turnos: turnoHa('rodando', 3) }));
confere('fala: turno rodando fala o que está fazendo agora', !!f && f.tipo === 'agora' && f.texto === 'Atendendo no direct', f);
confere('fala: turno rodando há mais de 3 horas é turno preso, não fala', diz(calango('atendente', { turnos: turnoHa('rodando', 200) })) === null);
f = diz(calango('chefe-de-gabinete', { sala: 'direcao', turnos: turnoHa('ok', 5, { resumo: 'Ontem foram 12 vendas, somando R$ 576,53. Maria (@maria) pediu desconto.' }) }));
confere('fala: quem acabou de trabalhar fala a frase dele, nunca o resumo (sem valor, nome nem @)', !!f && f.tipo === 'feito' && f.texto === 'Fechei o resumo do dia', f);
confere('fala: depois de 30 minutos o Calango fica quieto', diz(calango('chefe-de-gabinete', { turnos: turnoHa('ok', 31) })) === null);
confere('fala: turno sem trabalho não fala', diz(calango('zelador', { sala: 'sistema', turnos: turnoHa('sem_trabalho', 1, { resumo: 'Tudo em ordem.' }) })) === null);
f = diz(calango('vendedor-calango', { turnos: turnoHa('erro', 120, { resumo: 'Não abriu o direct.' }) }));
confere('fala: erro chama para o perfil, por até 12 horas', !!f && f.tipo === 'atencao' && f.texto === 'Deu erro, veja meu perfil' && diz(calango('vendedor-calango', { turnos: turnoHa('erro', 13 * 60) })) === null, f);
f = diz(calango('zelador', { sala: 'sistema', turnos: turnoHa('ok', 180, { resumo: '2 alertas: João L. (Vendedor Calango): 2 turnos com erro; Gasto de IA em 90% do teto. Aviso no celular: 1 aparelho.' }) }));
confere('fala: o Zelador diz quantos alertas tem, sem o texto do alerta', !!f && f.tipo === 'atencao' && f.texto === '2 alertas para você', f);
f = diz(calango('zelador', { sala: 'sistema', turnos: turnoHa('ok', 10, { resumo: '1 alerta: A cópia do banco não saiu.' }) }));
confere('fala: um alerta só, no singular', !!f && f.texto === '1 alerta para você', f);
f = diz(calango('zelador', { sala: 'sistema', turnos: turnoHa('ok', 10, { resumo: '0 alertas: nenhum novo. Cartão na mesa: Aviso sem aparelho.' }) }));
confere('fala: Zelador sem alerta novo fala a frase comum dele', !!f && f.tipo === 'feito' && f.texto === 'Conferi se tudo rodou', f);
f = diz(calango('redator-de-carrossel', { sala: 'design', turnos: turnoHa('rodando', 4, { tarefa: 'posts-de-frase-do-dia' }) }));
const outra = diz(calango('redator-de-carrossel', { sala: 'design', turnos: turnoHa('rodando', 4, { tarefa: 'tarefa-que-nao-existe' }) }));
confere('fala: quem tem mais de uma tarefa fala da tarefa do turno', !!f && f.texto === 'Montando o post de frase' && !!outra && outra.texto === 'Montando a arte do post', { f, outra });
f = diz(calango('atendente', { trabalho: { hoje: 9, ultimo: haMin(2) } }));
const antes = diz(calango('atendente', { trabalho: { hoje: 9, ultimo: haMin(20) } }));
confere('fala: o Atendente (sem turno) fala "agora" até 5 minutos depois da última resposta, e "feito" até 30', !!f && f.tipo === 'agora' && !!antes && antes.tipo === 'feito' && antes.texto === 'Respondi no direct' && diz(calango('atendente', { trabalho: { hoje: 9, ultimo: haMin(40) } })) === null, { f, antes });
f = diz(calango('publicador', { sala: 'conteudo', trabalho: { hoje: 1, ultimo: haMin(2) } }));
confere('fala: a rotina do relógio fala pelo último trabalho que saiu, sempre como "feito"', !!f && f.tipo === 'feito' && f.texto === 'Publiquei um post', f);
f = diz(calango('agente-novo', { sala: 'video', turnos: turnoHa('ok', 3) }));
const semSala = diz(calango('agente-novo', { sala: 'sala-nova', turnos: turnoHa('rodando', 3) }));
confere('fala: agente sem frase própria usa a da sala; sala desconhecida, a frase padrão', !!f && f.texto === 'Trabalhei num vídeo' && !!semSala && semSala.texto === 'Trabalhando agora', { f, semSala });
confere('fala: pausado, offline e vaga aberta não falam', [{ estado: 'pausado' }, { offline: true }, { estado: 'planejado' }].every((x) => diz(calango('atendente', { ...x, turnos: turnoHa('rodando', 1) })) === null));
f = diz(calango('zelador', { sala: 'sistema', turnos: turnoHa('ok', 10, { resumo: '999 alertas: muitos.' }) }));
confere('fala: a frase com a contagem também cabe no balão', !!f && f.texto.length <= FALA_MAX, f);

globalThis.fetch = buscar;
console.log(falhas ? `\n${falhas} conferência(s) falharam.` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
