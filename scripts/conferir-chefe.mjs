// Confere o Chefe de gabinete (worker/lib/agentes/chefe-de-gabinete.js) sem gastar, sem gravar e sem avisar ninguém:
// 1. monta os dados do resumo das 8h com o banco de verdade, SÓ LENDO (a rede deste script recusa qualquer escrita e
//    qualquer endereço que não seja o banco), e mostra o tamanho de cada parte, a instrução que iria para a IA e
//    quantas chamadas ao banco a leitura fez;
// 2. passa respostas de mentira pela conferência do que pode sair (travessão, link, mais de 3 decisões, tela que não
//    existe, valor em dinheiro inventado) e monta o aviso do celular, sem mandar.
// A IA não é chamada: no computador não existe a chave do Claude.
// Uso: node scripts/conferir-chefe.mjs [--dados] [--quando 2026-11-10T11:00:00Z]
//   --dados mostra também os dados e a mensagem inteira. Têm texto de clientes: é para olhar aqui, não para colar fora.
import { env as local } from './env.mjs';
import { conferirResumo, rodarChefeDeGabinete, textoDoAviso } from '../worker/lib/agentes/chefe-de-gabinete.js';

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
console.log(`  propostas na mesa: ${d.mesa.na_mesa} (${d.mesa.propostas.length} na lista) · aprovadas sem fazer: ${d.mesa.aprovadas_sem_fazer} (${d.mesa.aprovadas.length} na lista)`);
console.log(`  dúvidas do direct: ${d.duvidas_do_direct.total} · Colmeia esperando: ${d.colmeia_esperando_aprovacao.total} · vendedores no placar: ${d.vendedores.length}`);
console.log(`  vendas ontem (${d.vendas.ontem.dia}): ${d.vendas.ontem.vendas} · no mês até ontem: ${d.vendas.mes_ate_ontem.vendas} em ${d.vendas.mes_ate_ontem.dias} dias`);
console.log(`  atendente ontem: ${d.atendente_ontem.mensagens} mensagens, ${d.atendente_ontem.respondidas} respondidas, ${d.atendente_ontem.duvidas_para_o_dono} dúvidas`);
console.log(`  agentes com turno desde ontem: ${d.agentes.turnos_desde_ontem.length} · turnos com erro: ${d.agentes.erros.length}`);
console.log(`  tem o que dizer (chamaria a IA): ${r.tem_materia ? 'sim' : 'não'} · orçamento lido: ${r.orcamento ? `sobra US$ ${r.orcamento.sobra_usd} de US$ ${r.orcamento.teto_dia_usd}` : 'não'}`);

confere('a leitura coube em 11 chamadas', chamadas.length <= 11, `${chamadas.length}`);
confere('os dados têm todas as partes', ['vendas', 'mesa', 'duvidas_do_direct', 'colmeia_esperando_aprovacao', 'vendedores', 'atendente_ontem', 'agentes', 'gasto_de_ia'].every((k) => d[k] !== undefined));
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

console.log(falhas ? `\n${falhas} conferência(s) falharam.` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
