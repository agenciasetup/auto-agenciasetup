// Confere o Chefe de gabinete (worker/lib/agentes/chefe-de-gabinete.js) sem gastar, sem gravar e sem avisar ninguém:
// 1. monta os dados do resumo das 8h com o banco de verdade, SÓ LENDO (a rede deste script recusa qualquer escrita e
//    qualquer endereço que não seja o banco), e mostra o tamanho de cada parte, a instrução que iria para a IA e
//    quantas chamadas ao banco a leitura fez;
// 2. passa respostas de mentira pela conferência do que pode sair (travessão, link, mais de 3 decisões, tela que não
//    existe, valor em dinheiro inventado) e monta o aviso do celular, sem mandar;
// 3. confere a cobrança do que está parado (cartão aprovado há mais de 2 dias sem resultado e cartão em "Depois" há
//    mais de 7 dias), com cartões de mentira, e se o aviso continua cabendo no limite do celular. O que o Executor já
//    fez e só espera publicar (docs/tarefa-aprovadas.md) sai de "parado" e é cobrado como "pronto, falta publicar".
// A IA não é chamada: no computador não existe a chave do Claude.
// Uso: node scripts/conferir-chefe.mjs [--dados] [--quando 2026-11-10T11:00:00Z]
//   --dados mostra também os dados e a mensagem inteira. Têm texto de clientes: é para olhar aqui, não para colar fora.
import { env as local } from './env.mjs';
import { cobrancaDe, conferirResumo, rodarChefeDeGabinete, textoDaCobranca, textoDoAviso } from '../worker/lib/agentes/chefe-de-gabinete.js';

const args = process.argv.slice(2);
const verDados = args.includes('--dados');
const iQuando = args.indexOf('--quando');
const quando = iQuando >= 0 ? Date.parse(args[iQuando + 1]) : Date.now();
if (!Number.isFinite(quando)) { console.error('Data inválida em --quando. Exemplo: --quando 2026-11-10T11:00:00Z'); process.exit(1); }
if (!local.SUPABASE_URL || !local.SUPABASE_SECRET_KEY) { console.error('Faltam SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local.'); process.exit(1); }

// O ambiente do Worker, só com o que a leitura precisa. Sem chave do Claude e sem a chave do cofre: mesmo que o código
// tentasse, não teria como chamar a IA nem abrir segredo nenhum.
const env = { SUPABASE_URL: local.SUPABASE_URL, SUPABASE_SECRET_KEY: local.SUPABASE_SECRET_KEY, AMBIENTE: 'local' };

// A rede deste script: só leitura no banco. Passa GET nas tabelas e as funções que só leem; o resto é recusado.
const FUNCOES_DE_LEITURA = new Set(['numeros_area', 'followup_placar', 'escritorio_atividade', 'escritorio_resumo']);
const base = `${env.SUPABASE_URL}/rest/v1/`;
const rede = globalThis.fetch;
const chamadas = [];
globalThis.fetch = async (alvo, op = {}) => {
  const url = String(alvo && alvo.url ? alvo.url : alvo);
  const metodo = String(op.method || (alvo && alvo.method) || 'GET').toUpperCase();
  const caminho = url.startsWith(base) ? url.slice(base.length).split('?')[0] : null;
  const leitura = caminho !== null && (metodo === 'GET' || (metodo === 'POST' && caminho.startsWith('rpc/') && FUNCOES_DE_LEITURA.has(caminho.slice(4))));
  if (!leitura) throw new Error(`Recusei ${metodo} ${caminho === null ? 'para fora do banco' : caminho}: este script só lê.`);
  chamadas.push(`${metodo === 'GET' ? 'tabela' : 'função'} ${caminho.replace(/^rpc\//, '')}`);
  return rede(alvo, op);
};

let falhas = 0;
const confere = (nome, ok, extra = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${extra ? `  ${extra}` : ''}`); if (!ok) falhas += 1; };
const tokens = (n) => Math.round(n / 3.5);

// ---------------------------------------------------------------- 1. os dados e a instrução, com o banco de verdade
const t0 = Date.now();
const r = await rodarChefeDeGabinete(env, quando, { simular: true });
const ms = Date.now() - t0;
const json = JSON.stringify(r.dados);

console.log(`Rodada simulada para ${new Date(quando).toISOString()} (nada foi gravado, nenhuma IA chamada, nenhum aviso).\n`);
console.log(`Leitura: ${chamadas.length} chamadas ao banco em ${ms} ms`);
for (const c of chamadas) console.log(`  ${c}`);
console.log('\nTamanho dos dados, por parte (caracteres):');
for (const [k, v] of Object.entries(r.dados)) console.log(`  ${k.padEnd(30)} ${String(JSON.stringify(v).length).padStart(6)}`);
console.log(`  ${'total'.padEnd(30)} ${String(json.length).padStart(6)}`);
console.log(`\nInstrução: ${r.instrucao.length} caracteres. Mensagem com os dados: ${r.mensagem.length} caracteres.`);
console.log(`Entrada estimada: uns ${tokens(r.instrucao.length + r.mensagem.length)} tokens (conta de cabeça: 3,5 letras por token).`);
const d = r.dados;
console.log('\nContagens (sem texto de ninguém):');
console.log(`  propostas na mesa: ${d.mesa.na_mesa} (${d.mesa.propostas.length} na lista)`);
console.log(`  cobrança (só código, fora da IA): ${r.cobranca.falta_publicar.length} prontas, falta publicar · ${r.cobranca.aprovadas_paradas.length} aprovadas há mais de 2 dias sem resultado · ${r.cobranca.depois_antigas.length} em "Depois" há mais de 7 dias`);
for (const l of r.cobranca_no_aviso) console.log(`    no aviso: ${l}`);
console.log(`  o Chefe está liberado no Escritório (ativo): ${r.agente_liberado ? 'sim' : 'não, a rodada de verdade sairia quieta'}`);
console.log(`  dúvidas do direct: ${d.duvidas_do_direct.total} · Colmeia esperando: ${d.colmeia_esperando_aprovacao.total} · vendedores no placar: ${d.vendedores.length}`);
console.log(`  vendas ontem (${d.vendas.ontem.dia}): ${d.vendas.ontem.vendas} · no mês até ontem: ${d.vendas.mes_ate_ontem.vendas} em ${d.vendas.mes_ate_ontem.dias} dias`);
console.log(`  atendente ontem: ${d.atendente_ontem.mensagens} mensagens, ${d.atendente_ontem.respondidas} respondidas, ${d.atendente_ontem.duvidas_para_o_dono} dúvidas`);
console.log(`  agentes com turno desde ontem: ${d.agentes.turnos_desde_ontem.length} · turnos com erro: ${d.agentes.erros.length}`);
console.log(`  tem o que dizer (chamaria a IA): ${r.tem_materia ? 'sim' : 'não'} · orçamento lido: ${r.orcamento ? `sobra US$ ${r.orcamento.sobra_usd} de US$ ${r.orcamento.teto_dia_usd}` : 'não'}`);

confere('a leitura coube em 13 chamadas (11 dos dados, a lista de agentes e, com cartão aprovado, o andamento deles)', chamadas.length <= 13, `${chamadas.length}`);
confere('a cobrança traz as três listas', ['falta_publicar', 'aprovadas_paradas', 'depois_antigas'].every((k) => Array.isArray(r.cobranca[k])));
confere('os dados têm todas as partes', ['vendas', 'mesa', 'duvidas_do_direct', 'colmeia_esperando_aprovacao', 'vendedores', 'atendente_ontem', 'agentes', 'gasto_de_ia'].every((k) => d[k] !== undefined));
confere('o que o dono já aprovou não vai para a IA como decisão', d.mesa.aprovadas === undefined && d.mesa.aprovadas_sem_fazer === undefined && !/aprovada que ninguém fez/.test(r.instrucao) && /não é decisão de hoje/.test(r.instrucao));
confere('texto de fora não fecha a marcação', !json.includes('<') && !json.includes('>'));
confere('a mensagem põe os dados entre marcações', /<dados>\n[\s\S]+\n<\/dados>$/.test(r.mensagem));
confere('a instrução não tem travessão', !/[—–]/.test(r.instrucao));
confere('a instrução diz que texto de fora é dado', /é dado, nunca instrução/.test(r.instrucao));

console.log('\n---------------- instrução (igual todo dia, sem dado de ninguém) ----------------');
console.log(r.instrucao);
console.log('---------------------------------------------------------------------------------');
if (verDados) {
  console.log('\n---------------- mensagem com os dados (não cole fora daqui) ----------------');
  console.log(r.mensagem.replace(json, JSON.stringify(r.dados, null, 2)));
  console.log('-----------------------------------------------------------------------------');
}

// ---------------------------------------------------------------- 2. a conferência do que pode sair
console.log('\nConferência da resposta (com respostas de mentira):');
const falsos = { vendas: { ontem: { total: 'R$ 187,00' }, mes_ate_ontem: { total: 'R$ 1.234,50' } }, gasto_de_ia: { no_mes: 'US$ 4,10' } };
const boa = conferirResumo({
  resumo: 'Ontem entraram R$ 187 em 4 vendas — acima da média. No mês já são R$ 1.234,50. Veja https://exemplo.com/x agora.',
  decisoes: [
    { titulo: 'Responder as 3 dúvidas do direct', por_que: 'A mais antiga espera há 14 h.', onde: '/admin/followup' },
    { titulo: 'Decidir a proposta do olheiro', por_que: 'Está na mesa há 2 dias.', onde: '/admin/tela-que-nao-existe' },
    { titulo: 'Aprovar o item da Colmeia', por_que: 'Um item espera há 1 dia.', onde: '/admin/colmeia' },
    { titulo: 'Quarta decisão', por_que: 'Não pode passar de três.', onde: '/admin/vendas' },
    { titulo: '', por_que: 'Sem título.', onde: '/admin/vendas' },
  ],
}, falsos);
confere('resposta boa passa', !boa.problema && !!boa.resumo, boa.problema || '');
confere('travessão vira vírgula', !!boa.resumo && !/[—–]/.test(boa.resumo) && boa.resumo.includes('vendas, acima'));
confere('link sai do texto', !!boa.resumo && !/https?:|exemplo\.com/.test(boa.resumo));
confere('no máximo 3 decisões', (boa.decisoes || []).length === 3, `${(boa.decisoes || []).length}`);
confere('tela desconhecida vira a do escritório', !!boa.decisoes && boa.decisoes[1].onde === '/admin/escritorio');
confere('valor sem centavos é o mesmo valor', !boa.problema);
const inventou = conferirResumo({ resumo: 'Ontem entraram R$ 999,99 em 4 vendas, bem acima da média.', decisoes: [] }, falsos);
confere('valor que não está nos dados barra o resumo', !!inventou.problema, inventou.problema || '');
const conta = conferirResumo({ resumo: 'Ontem foi bom.', decisoes: [{ titulo: 'Ver as vendas', por_que: 'Somando dá R$ 1.421,50 no mês.', onde: '/admin/vendas' }] }, falsos);
confere('valor inventado numa decisão também barra', !!conta.problema);
confere('resumo vazio é barrado', !!conferirResumo({ resumo: '  ', decisoes: [] }, falsos).problema);
confere('resposta sem ferramenta é barrada', !!conferirResumo(undefined, falsos).problema);
const nada = conferirResumo({ resumo: 'Ontem não teve venda e não há nada para decidir hoje.', decisoes: [] }, falsos);
confere('zero decisões é resposta válida', !nada.problema && nada.decisoes.length === 0);

const aviso = textoDoAviso(boa.problema ? { resumo: '', decisoes: [] } : boa);
const avisoVazio = textoDoAviso(nada.problema ? { resumo: '', decisoes: [] } : nada);
confere('aviso com decisões', aviso.titulo === 'Resumo das 8h: 3 decisões para hoje' && aviso.corpo.split('\n').length === 4, aviso.titulo);
confere('aviso sem decisões', avisoVazio.titulo === 'Resumo das 8h: nada para decidir hoje', avisoVazio.titulo);
confere('o aviso cabe no limite do push (3000)', JSON.stringify({ ...aviso, url: '/admin/escritorio', tipo: 'escritorio', em: Date.now(), tag: 'resumo-2026-11-10' }).length < 3000);

// ---------------------------------------------------------------- 3. a cobrança do que está parado (cartões de mentira)
console.log('\nA cobrança do que está parado (com cartões de mentira):');
const DIA = 86_400_000;
const agora = Date.parse('2026-11-20T11:02:00Z');
const ha = (dias) => new Date(agora - dias * DIA).toISOString();
const agentes = [{ id: 'olheiro-visual', nome: 'Olheiro visual', apelido: 'Sara L.' }, { id: 'zelador', nome: 'Zelador', apelido: null }];
const cartoes = [
  { agente_id: 'olheiro-visual', sala: 'design', titulo: 'Capas fora da curva: bicho perto da lente — cor cheia', status: 'aprovada', criado_em: ha(9), decidida_em: ha(5.5) },
  { agente_id: 'zelador', sala: 'sistema', titulo: 'A rodada do direct está falhando: veja https://exemplo.com/x <b>agora</b>', status: 'aprovada', criado_em: ha(4), decidida_em: ha(3.2) },
  { agente_id: null, sala: 'video', titulo: 'Aprovada ontem', status: 'aprovada', criado_em: ha(3), decidida_em: ha(1.1) },
  { agente_id: 'roteirista', sala: 'video', titulo: 'Roteiro (tela): fica para depois da Black Friday', status: 'depois', criado_em: ha(12), decidida_em: ha(9) },
  { agente_id: 'zelador', sala: 'sistema', titulo: 'Depois recente', status: 'depois', criado_em: ha(6), decidida_em: ha(6) },
  { agente_id: 'zelador', sala: 'sistema', titulo: 'Na mesa há 30 dias', status: 'nova', criado_em: ha(30), decidida_em: null },
  { agente_id: 'zelador', sala: 'sistema', titulo: 'Feita', status: 'feita', criado_em: ha(30), decidida_em: ha(20) },
];
const c = cobrancaDe(cartoes, agentes, agora);
confere('aprovada há mais de 2 dias sem resultado entra, da mais antiga para a mais nova', c.aprovadas_paradas.length === 2 && c.aprovadas_paradas[0].dias === 5 && c.aprovadas_paradas[1].dias === 3, JSON.stringify(c.aprovadas_paradas));
confere('aprovada ontem, cartão na mesa e cartão feito ficam de fora', !JSON.stringify(c).includes('Aprovada ontem') && !JSON.stringify(c).includes('Na mesa há') && !JSON.stringify(c).includes('Feita'));
confere('"Depois" só entra com mais de 7 dias', c.depois_antigas.length === 1 && c.depois_antigas[0].dias === 9, JSON.stringify(c.depois_antigas));
confere('diz de quem é o cartão pelo nome da tela (ou pelo id, sem cadastro)', c.aprovadas_paradas[0].de === 'Sara L.' && c.aprovadas_paradas[1].de === 'Zelador' && c.depois_antigas[0].de === 'roteirista');
confere('título de cartão sai sem travessão, sem link e sem marcação', !/[—–<>]|https?:/.test(JSON.stringify(c)), JSON.stringify(c.aprovadas_paradas.map((p) => p.titulo)));
const linhas = textoDaCobranca(c);
confere('a cobrança diz o título, de quem é e há quantos dias', linhas.length === 2 && linhas[0].includes('(Sara L., 5 dias)') && linhas[0].includes('(Zelador, 3 dias)'), linhas[0]);
confere('aprovado e parado: manda pedir ao Claude', /^Aprovado e parado: /.test(linhas[0]) && /dias\)\. Peça ao Claude para fazer\.$/.test(linhas[0]), linhas[0]);
confere('"Depois": pergunta se ainda vale', /^Em "Depois" há mais de 7 dias: /.test(linhas[1]) && /\(roteirista, 9 dias\)\. Ainda vale\?$/.test(linhas[1]), linhas[1]);
const curtas = textoDaCobranca(c, { curto: true });
confere('no celular vai só o mais antigo de cada tipo e quantos mais', curtas[0].includes('5 dias) e mais 1.') && !curtas[0].includes('Zelador'), curtas[0]);
confere('sem nada parado, a cobrança não escreve nada', textoDaCobranca(cobrancaDe([], agentes, agora)).length === 0 && textoDaCobranca(null).length === 0);
const comCobranca = textoDoAviso({ ...boa, cobranca: c });
confere('o aviso leva as decisões e, embaixo, a cobrança', comCobranca.titulo === 'Resumo das 8h: 3 decisões para hoje' && comCobranca.corpo.split('\n').length === 6 && comCobranca.corpo.endsWith('Ainda vale?'), comCobranca.corpo);
const soCobranca = textoDoAviso({ ...nada, cobranca: c });
confere('sem decisão nova mas com cartão parado, o título diz isso', soCobranca.titulo === 'Resumo das 8h: nada novo para decidir, tem cartão parado' && soCobranca.corpo.includes('Aprovado e parado'), soCobranca.titulo);
// O pior caso de tamanho: resumo no limite, 3 decisões no limite e muitos cartões parados com título comprido.
const cheio = cobrancaDe(Array.from({ length: 30 }, (_, i) => ({ agente_id: 'olheiro-visual', sala: 'design', titulo: `Cartão ${i} ${'com um título bem comprido '.repeat(8)}`, status: i % 2 ? 'aprovada' : 'depois', criado_em: ha(200), decidida_em: ha(120 + i) })), [{ id: 'olheiro-visual', nome: 'Olheiro visual', apelido: 'Um apelido bem comprido para o agente da sala' }], agora);
const grande = textoDoAviso({ resumo: `${'Ontem entraram vendas acima da média do mês. '.repeat(13)}`.trim(), decisoes: [1, 2, 3].map((i) => ({ titulo: `${i} ${'decisão comprida '.repeat(6)}`.slice(0, 90), por_que: 'x', onde: '/admin/escritorio' })), cobranca: cheio });
confere('o aviso continua em até 900 letras, com as decisões e a cobrança inteiras', grande.corpo.length <= 900 && grande.corpo.includes('3. 3 decisão') && grande.corpo.endsWith('Ainda vale?') && grande.corpo.includes('Peça ao Claude para fazer.'), `${grande.corpo.length} letras`);
confere('quem encolhe é o resumo, e ele continua lá', grande.corpo.split('\n')[0].length >= 160 && grande.corpo.split('\n').length === 6, `${grande.corpo.split('\n')[0].length} letras de resumo`);

// ---------------------------------------------------------------- 4. o que o Executor já fez não é "parado"
console.log('\nA cobrança com o andamento do Executor (cartões de mentira):');
const idDe = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const comExecutor = [
  { id: idDe(1), agente_id: 'olheiro-visual', sala: 'design', titulo: 'Trocar o texto do botão do material', status: 'aprovada', criado_em: ha(9), decidida_em: ha(6) },
  { id: idDe(2), agente_id: 'zelador', sala: 'sistema', titulo: 'Baixar o preço do Combo', status: 'aprovada', criado_em: ha(8), decidida_em: ha(4) },
  { id: idDe(3), agente_id: 'zelador', sala: 'sistema', titulo: 'Aprovado ontem e feito de madrugada', status: 'aprovada', criado_em: ha(2), decidida_em: ha(1.2) },
  { id: idDe(4), agente_id: 'zelador', sala: 'sistema', titulo: 'Tentou e falhou', status: 'aprovada', criado_em: ha(8), decidida_em: ha(3.5) },
  { id: idDe(5), agente_id: 'roteirista', sala: 'video', titulo: 'Roteiro para depois', status: 'depois', criado_em: ha(12), decidida_em: ha(9) },
];
// 20/11 às 8h02 de Brasília: 5,2 dias antes é 15/11 de madrugada; 0,4 dia antes é 19/11 às 22h26.
const andamentos = {
  [idDe(1)]: { estado: 'falta_publicar', em: ha(5.2), nota: 'Texto trocado em worker/lib/comenta.js.' },
  [idDe(2)]: { estado: 'espera_dono', em: ha(3.9), nota: 'Mexe em preço.' },
  [idDe(3)]: { estado: 'falta_publicar', em: ha(0.4), nota: 'Pronto.' },
  [idDe(4)]: { estado: 'falhou', em: ha(1.4), nota: 'O ensaio não passou.' },
  [idDe(5)]: { estado: 'falta_publicar', em: ha(1), nota: 'Andamento de cartão que não está aprovado não conta.' },
};
const ce = cobrancaDe(comExecutor, agentes, agora, andamentos);
confere('pronto, falta publicar: sai de "parado" e entra na lista própria, do mais antigo para o mais novo', ce.falta_publicar.length === 2 && ce.falta_publicar[0].titulo === 'Trocar o texto do botão do material' && ce.falta_publicar[0].feito_em === '15/11' && !JSON.stringify(ce.aprovadas_paradas).includes('Trocar o texto'), JSON.stringify(ce.falta_publicar));
confere('pronto entra desde o primeiro dia, com o dia de Brasília em que ficou pronto', ce.falta_publicar[1].titulo === 'Aprovado ontem e feito de madrugada' && ce.falta_publicar[1].feito_em === '19/11' && ce.falta_publicar[1].dias === 0, JSON.stringify(ce.falta_publicar[1]));
confere('o que espera o dono e o que falhou continuam como aprovado e parado', ce.aprovadas_paradas.length === 2 && ce.aprovadas_paradas[0].titulo === 'Baixar o preço do Combo' && ce.aprovadas_paradas[1].titulo === 'Tentou e falhou', JSON.stringify(ce.aprovadas_paradas));
confere('andamento de cartão em "Depois" não vira pronto', ce.depois_antigas.length === 1 && !JSON.stringify(ce.falta_publicar).includes('Roteiro'));
const semLeitura = cobrancaDe(comExecutor, agentes, agora, null);
confere('sem a leitura do andamento, cobra como antes (tudo o que é aprovado há mais de 2 dias é parado)', semLeitura.falta_publicar.length === 0 && semLeitura.aprovadas_paradas.length === 3 && semLeitura.aprovadas_paradas[0].titulo === 'Trocar o texto do botão do material');
const linhasE = textoDaCobranca(ce);
confere('a cobrança diz "pronto, falta publicar" primeiro, com o dia em que ficou pronto', linhasE.length === 3 && linhasE[0] === 'Pronto, falta publicar: "Trocar o texto do botão do material" (feito em 15/11); "Aprovado ontem e feito de madrugada" (feito em 19/11). Dê o ok ao Claude para pôr no ar.', linhasE[0]);
confere('depois vêm o parado e o "Depois"', /^Aprovado e parado: "Baixar o preço do Combo" \(Zelador, 4 dias\)/.test(linhasE[1]) && /^Em "Depois"/.test(linhasE[2]), linhasE[1]);
const curtasE = textoDaCobranca(ce, { curto: true });
confere('no celular, o pronto mais antigo e quantos mais', curtasE[0] === 'Pronto, falta publicar: "Trocar o texto do botão do material" (feito em 15/11) e mais 1. Dê o ok ao Claude para pôr no ar.', curtasE[0]);
const soPronto = textoDoAviso({ ...nada, cobranca: cobrancaDe(comExecutor.slice(0, 1), agentes, agora, andamentos) });
confere('sem decisão nova e com cartão pronto, o título diz que tem o que publicar', soPronto.titulo === 'Resumo das 8h: nada novo para decidir, tem cartão pronto para publicar' && soPronto.corpo.split('\n').length === 2, soPronto.titulo);
confere('sem pronto nenhum, o título continua falando de cartão parado', textoDoAviso({ ...nada, cobranca: cobrancaDe(comExecutor.slice(1, 2), agentes, agora, andamentos) }).titulo === 'Resumo das 8h: nada novo para decidir, tem cartão parado');
// O pior caso de tamanho, agora com as três linhas da cobrança.
const muitos = Array.from({ length: 45 }, (_, i) => ({ id: idDe(100 + i), agente_id: 'olheiro-visual', sala: 'design', titulo: `Cartão ${i} ${'com um título bem comprido '.repeat(8)}`, status: i % 3 === 2 ? 'depois' : 'aprovada', criado_em: ha(200), decidida_em: ha(120 + i) }));
const prontos = Object.fromEntries(muitos.filter((_, i) => i % 3 === 0).map((p, i) => [p.id, { estado: 'falta_publicar', em: ha(100 + i) }]));
const cheio3 = cobrancaDe(muitos, [{ id: 'olheiro-visual', nome: 'Olheiro visual', apelido: 'Um apelido bem comprido para o agente da sala' }], agora, prontos);
const grande3 = textoDoAviso({ resumo: `${'Ontem entraram vendas acima da média do mês. '.repeat(13)}`.trim(), decisoes: [1, 2, 3].map((i) => ({ titulo: `${i} ${'decisão comprida '.repeat(6)}`.slice(0, 90), por_que: 'x', onde: '/admin/escritorio' })), cobranca: cheio3 });
const partes3 = grande3.corpo.split('\n');
confere('com as três linhas da cobrança o aviso continua em até 900 letras, com tudo inteiro', cheio3.falta_publicar.length === 15 && grande3.corpo.length <= 900 && partes3.length === 7 && /^Pronto, falta publicar: .* e mais 14\. Dê o ok ao Claude para pôr no ar\.$/.test(partes3[4]) && /Peça ao Claude para fazer\.$/.test(partes3[5]) && partes3[6].endsWith('Ainda vale?'), `${grande3.corpo.length} letras`);
confere('e o resumo continua lá, com pelo menos 120 letras', partes3[0].length >= 120, `${partes3[0].length} letras de resumo`);

console.log(falhas ? `\n${falhas} conferência(s) falharam.` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
