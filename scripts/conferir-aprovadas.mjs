// Ensaio de quem faz o cartão aprovado (o Executor; roteiro em docs/tarefa-aprovadas.md).
// O banco é de MENTIRA, em memória: o endereço não existe e a rede deste script só responde o que está neste arquivo
// (qualquer outro endereço dá erro). Não lê o .env.local, não toca no banco de verdade e não avisa ninguém.
// O código testado é o de verdade: worker/lib/escritorio.js e worker/lib/acoes-escritorio.js.
//  1. o andamento de um cartão aprovado, tirado dos turnos que citam o cartão (só contas);
//  2. a fila: quem o Executor pode pegar e por que não pega os outros (só contas);
//  3. a leitura que a tarefa faz primeiro (escritorio_ver com fila), o ciclo inteiro pelos turnos de verdade
//     (abrir, fechar, falhar, tentar de novo, aprovar de novo, resultado) e o que a tela Escritório recebe;
//  4. o cartão da mesa em "Esperando você" (worker/lib/acoes-esperando.js): a nota das aprovadas prontas ou esperando;
//  5. o roteiro (docs/tarefa-aprovadas.md) e o conector falam a mesma língua do código.
// Uso: node scripts/conferir-aprovadas.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const HORA = 3_600_000;
const DIA = 24 * HORA;
const BANCO = 'https://banco-de-mentira.invalid';
const m = { SUPABASE_URL: BANCO, SUPABASE_SECRET_KEY: 'sb_secret_de_mentira', AMBIENTE: 'local' };
const tabelas = { agentes: [], turnos: [], propostas: [], config: [], consumo_ia: [], agentes_historico: [], auditoria: [], followups: [], colmeia: [], ofertas: [] };
// cai: (método, caminho) => true faz o banco de mentira responder erro 500.
const mundo = { chamadas: [], cai: null };

let falhas = 0;
const confere = (nome, ok, extra = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${extra && !ok ? `  ${typeof extra === 'string' ? extra : JSON.stringify(extra).slice(0, 500)}` : ''}`); if (!ok) falhas += 1; };

// ---------------------------------------------------------------- o banco de mentira
// O valor de uma coluna, também quando o filtro entra no JSON, como o PostgREST faz (dados->>proposta).
function valor(linha, coluna) {
  const [base, chave] = coluna.split('->>');
  if (chave === undefined) return linha[base];
  const o = linha[base];
  const v = o && typeof o === 'object' ? o[chave] : undefined;
  return v === undefined || v === null ? null : typeof v === 'string' ? v : JSON.stringify(v);
}
function passa(linha, coluna, cond) {
  const v = valor(linha, coluna);
  if (cond.startsWith('eq.')) return String(v) === cond.slice(3);
  if (cond.startsWith('neq.')) return String(v) !== cond.slice(4);
  if (cond.startsWith('in.(')) return cond.slice(4, -1).split(',').includes(String(v));
  if (cond.startsWith('gte.')) return String(v ?? '') >= cond.slice(4);
  if (cond === 'not.is.null') return v !== null && v !== undefined;
  throw new Error(`O banco de mentira não conhece o filtro ${coluna}=${cond}`);
}
const FORA_DO_FILTRO = ['select', 'order', 'limit', 'offset', 'on_conflict'];
function filtrar(linhas, params) {
  let r = linhas;
  for (const [k, v] of params) if (!FORA_DO_FILTRO.includes(k)) r = r.filter((l) => passa(l, k, v));
  const ordem = params.get('order');
  if (ordem) {
    const chaves = ordem.split(',').map((o) => o.split('.'));
    r = [...r].sort((a, b) => { for (const [c, dir] of chaves) { const d = String(a[c] ?? '').localeCompare(String(b[c] ?? '')); if (d) return dir === 'desc' ? -d : d; } return 0; });
  }
  const limite = Number(params.get('limit'));
  return limite ? r.slice(0, limite) : r;
}
// As colunas pedidas, com os apelidos do PostgREST ("proposta:dados->>proposta").
function projetar(linha, select) {
  if (!select || select === '*') return { ...linha };
  const r = {};
  for (const item of select.split(',')) {
    const i = item.indexOf(':');
    const [nome, de] = i > 0 ? [item.slice(0, i), item.slice(i + 1)] : [item, item];
    r[nome] = valor(linha, de);
  }
  return r;
}
const resposta = (corpo, status = 200, extra = {}) => new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json', ...extra } });

const redeDeVerdade = globalThis.fetch;
globalThis.fetch = async (alvo, op = {}) => {
  const url = new URL(String(alvo && alvo.url ? alvo.url : alvo));
  const metodo = String(op.method || 'GET').toUpperCase();
  if (url.origin !== BANCO || !url.pathname.startsWith('/rest/v1/')) throw new Error(`A rede de mentira recusou ${metodo} ${url.origin}${url.pathname}`);
  const caminho = url.pathname.slice('/rest/v1/'.length);
  mundo.chamadas.push(`${metodo} ${caminho}`);
  if (mundo.cai && mundo.cai(metodo, caminho)) return resposta({ message: 'caiu de propósito' }, 500);
  if (caminho.startsWith('rpc/')) return resposta(caminho === 'rpc/escritorio_resumo' ? {} : []);
  const tabela = tabelas[caminho];
  if (!tabela) throw new Error(`O banco de mentira não tem a tabela ${caminho}`);
  const select = url.searchParams.get('select');
  if (metodo === 'GET') {
    const linhas = filtrar(tabela, url.searchParams);
    return resposta(linhas.map((l) => projetar(l, select)), 200, { 'content-range': `${linhas.length ? `0-${linhas.length - 1}` : '*'}/${linhas.length}` });
  }
  const corpo = JSON.parse(op.body);
  if (metodo === 'POST') {
    const criadas = [];
    for (const d of Array.isArray(corpo) ? corpo : [corpo]) {
      const linha = caminho === 'turnos' ? { id: 1000 + tabela.length, ...d } : { ...d };
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
const escritas = () => mundo.chamadas.filter((c) => !c.startsWith('GET ') && !c.startsWith('POST rpc/'));

const { DESFECHOS, EXECUTOR, CONTROLA, andamentosDe, decidirProposta, filaDoExecutor, lerAndamentos, registrarTurno, resultadoProposta, verEscritorio, verFilaDoExecutor } = await import('../worker/lib/escritorio.js');
const { verAFilaDoExecutor } = await import('../worker/lib/acoes-escritorio.js');

const idDe = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const iso = (ms) => new Date(ms).toISOString();

// ================================================================ 1. o andamento (só contas)
console.log('O andamento de um cartão aprovado, pelos turnos que citam o cartão:');
const quando = Date.parse('2026-11-12T10:10:00Z'); // quinta, 7h10 em Brasília
const ha = (horas) => iso(quando - horas * HORA);
const cartao = (n, extra = {}) => ({ id: idDe(n), agente_id: 'zelador', sala: 'sistema', titulo: `Cartão ${n}`, prova: 'Prova.', acao: 'Ação.', esforco: 'p', ganho: null, links: [], motivo: null, status: 'aprovada', criado_em: ha(100), decidida_em: ha(48), decidida_nome: 'Filipe', ...extra });
const turno = (id, n, status, horasAtras, extra = {}) => ({ id, agente_id: 'executor', status, resumo: null, inicio: ha(horasAtras), fim: status === 'rodando' ? null : ha(horasAtras - 0.5), proposta: idDe(n), desfecho: null, nota: null, commit: null, ...extra });

let a = andamentosDe([cartao(1)], [], quando);
confere('cartão sem turno não tem andamento', Object.keys(a).length === 0);
a = andamentosDe([cartao(1)], [turno(10, 1, 'ok', 20, { desfecho: 'falta_publicar', nota: 'Troquei o texto do aviso.\nO ensaio do Chefe passou (48).', commit: 'ABC1234DEF' })], quando)[idDe(1)];
confere('pronto, falta publicar: estado, quem fez, quando e o commit', !!a && a.estado === 'falta_publicar' && a.agente_id === 'executor' && a.turno === 10 && a.em === ha(19.5) && a.commit === 'abc1234def' && a.tentativas === 1 && a.hoje === false, a);
confere('a nota vira uma linha só', !!a && a.nota === 'Troquei o texto do aviso. O ensaio do Chefe passou (48).', a && a.nota);
a = andamentosDe([cartao(1)], [turno(10, 1, 'ok', 60, { desfecho: 'espera_dono', nota: 'De antes da aprovação.' })], quando);
confere('turno de antes da última aprovação não conta (aprovar de novo zera o andamento)', Object.keys(a).length === 0, a);
a = andamentosDe([cartao(1), cartao(2)], [turno(10, 2, 'ok', 5, { desfecho: 'espera_dono', nota: 'Mexe em preço.' })], quando);
confere('o turno de um cartão não vaza para outro', !a[idDe(1)] && a[idDe(2)].estado === 'espera_dono');
a = andamentosDe([cartao(1)], [turno(10, 1, 'rodando', 1, { resumo: 'Começou: Cartão 1' })], quando)[idDe(1)];
confere('turno aberto há pouco: tem uma rodada trabalhando', a.estado === 'fazendo' && a.nota === 'Começou: Cartão 1' && a.hoje === true, a);
a = andamentosDe([cartao(1)], [turno(10, 1, 'rodando', 20, { resumo: 'Começou: Cartão 1' })], quando)[idDe(1)];
confere('turno aberto há mais de 3 horas: a rodada caiu no meio e conta como tentativa que falhou', a.estado === 'falhou' && a.nota === 'A rodada começou e não terminou.' && a.tentativas === 1, a);
a = andamentosDe([cartao(1)], [turno(10, 1, 'erro', 20, { desfecho: 'falta_publicar', nota: 'O ensaio não passou.' })], quando)[idDe(1)];
confere('turno com erro é sempre "falhou", diga o desfecho o que disser', a.estado === 'falhou' && a.nota === 'O ensaio não passou.', a);
a = andamentosDe([cartao(1)], [turno(10, 1, 'ok', 20, { resumo: 'Fiz alguma coisa.' })], quando)[idDe(1)];
confere('turno fechado sem desfecho: na dúvida é "falhou", com o resumo no lugar da nota', a.estado === 'falhou' && a.nota === 'Fiz alguma coisa.', a);
a = andamentosDe([cartao(1)], [turno(10, 1, 'ok', 20, { desfecho: 'publicado_e_no_ar' })], quando)[idDe(1)];
confere('desfecho que não existe não vale, e nota vazia ganha uma frase', a.estado === 'falhou' && a.nota === 'A rodada terminou sem dizer o que fez.', a);
a = andamentosDe([cartao(1)], [turno(10, 1, 'erro', 30, { desfecho: 'falhou', nota: 'Primeira.' }), turno(11, 1, 'ok', 6, { desfecho: 'falta_publicar', nota: 'Segunda.', commit: 'não é commit' })], quando)[idDe(1)];
confere('vale o turno mais novo, e as tentativas são contadas', a.estado === 'falta_publicar' && a.nota === 'Segunda.' && a.tentativas === 2 && a.turno === 11, a);
confere('commit que não parece commit fica de fora', a.commit === null);
// 7h10 de quinta em Brasília: 23h30 de quarta foi "ontem", 0h30 de quinta já é "hoje".
a = andamentosDe([cartao(1)], [turno(10, 1, 'erro', 7.67, { desfecho: 'falhou', nota: 'Ontem, 23h30.' })], quando)[idDe(1)];
const b = andamentosDe([cartao(1)], [turno(10, 1, 'erro', 6.67, { desfecho: 'falhou', nota: 'Hoje, 0h30.' })], quando)[idDe(1)];
confere('"hoje" é o dia de Brasília', a.hoje === false && b.hoje === true, { ontem: a.hoje, hoje: b.hoje });
a = andamentosDe([cartao(1)], [turno(10, 1, 'ok', 5, { desfecho: 'feito', nota: `${'x'.repeat(400)}` })], quando)[idDe(1)];
confere('nota comprida é cortada em 300 letras', a.estado === 'feito' && a.nota.length === 300);

// ================================================================ 2. a fila (só contas)
console.log('\nA fila do Executor:');
const and = (estado, extra = {}) => ({ estado, nota: 'x', em: ha(5), agente_id: 'executor', turno: 1, commit: null, tentativas: 1, hoje: false, ...extra });
const cartoes = [
  cartao(1, { decidida_em: ha(30) }),
  cartao(2, { decidida_em: ha(90), esforco: 'm' }),
  cartao(3, { decidida_em: ha(80), esforco: 'g' }),
  cartao(4, { decidida_em: ha(70) }),
  cartao(5, { decidida_em: ha(60) }),
  cartao(6, { decidida_em: ha(50) }),
  cartao(7, { decidida_em: ha(45) }),
  cartao(8, { decidida_em: ha(40) }),
  cartao(9, { decidida_em: ha(35) }),
  cartao(10, { decidida_em: ha(32) }),
];
let fila = filaDoExecutor(cartoes, {
  [idDe(4)]: and('falta_publicar'), [idDe(5)]: and('espera_dono'), [idDe(6)]: and('feito'), [idDe(7)]: and('fazendo', { hoje: true }),
  [idDe(8)]: and('falhou', { hoje: true }), [idDe(9)]: and('falhou', { tentativas: 2 }), [idDe(10)]: and('falhou'),
});
const naFila = (n) => fila.find((c) => c.id === idDe(n));
confere('a fila vai do aprovado há mais tempo para o mais novo', fila.map((c) => c.id).join() === [2, 3, 4, 5, 6, 7, 8, 9, 10, 1].map(idDe).join());
confere('médio e grande ficam de fora, com o motivo', !naFila(2).pode_fazer && /Este é médio: peça ao Claude para fazer\.$/.test(naFila(2).por_que_nao) && !naFila(3).pode_fazer && /Este é grande/.test(naFila(3).por_que_nao), naFila(2));
confere('pronto que falta publicar não é pego de novo', !naFila(4).pode_fazer && naFila(4).por_que_nao === 'Já foi feito no projeto. Falta publicar.');
confere('o que espera o dono não é pego de novo', !naFila(5).pode_fazer && naFila(5).por_que_nao === 'Espera uma decisão sua.');
confere('feito sem o resultado anotado e cartão com rodada aberta ficam de fora', !naFila(6).pode_fazer && !naFila(7).pode_fazer && /trabalhando neste cartão agora/.test(naFila(7).por_que_nao));
confere('falhou hoje: não tenta de novo no mesmo dia', !naFila(8).pode_fazer && naFila(8).por_que_nao === 'Já teve uma tentativa hoje.');
confere('falhou 2 vezes: sai da fila e espera o dono', !naFila(9).pode_fazer && naFila(9).por_que_nao === 'Tentou 2 vezes e não conseguiu. Agora espera você.');
confere('falhou uma vez, em outro dia: pode tentar de novo', naFila(10).pode_fazer === true && naFila(10).por_que_nao === null && naFila(10).andamento.estado === 'falhou');
confere('pequeno sem andamento: pode fazer', naFila(1).pode_fazer === true && naFila(1).andamento === null);
confere('o primeiro que pode é o da rodada (o que falhou ontem, aprovado antes do novo)', fila.find((c) => c.pode_fazer).id === idDe(10));
confere('sem cartão aprovado a fila é vazia', filaDoExecutor([], {}).length === 0 && filaDoExecutor(null, null).length === 0);

// ================================================================ 3. com o banco de mentira
console.log('\nA leitura da tarefa, o ciclo pelos turnos e a tela (banco de mentira):');
const agora = Date.now();
const antes = (horas) => iso(agora - horas * HORA);
const proposta = (n, extra = {}) => ({ id: idDe(n), agente_id: 'zelador', sala: 'sistema', titulo: `Cartão ${n}`, prova: 'Prova com <b>marcação</b>.', acao: 'Ação do cartão.', esforco: 'p', ganho: 'Ganho.', links: [{ t: 'Fonte', url: 'https://exemplo.com/x' }, { t: 'Ruim', url: 'javascript:alert(1)' }], status: 'aprovada', motivo: null, resultado: null, criado_em: antes(200), decidida_em: antes(72), decidida_nome: 'Filipe', atualizado_em: antes(72), ...extra });
tabelas.agentes.push(
  { id: 'zelador', sala: 'sistema', nome: 'Zelador', apelido: 'Noé K.', funcao: 'Zela.', onde: 'worker', estado: 'ativo', modelo: null, ordem: 10 },
  { id: 'chefe-de-gabinete', sala: 'direcao', nome: 'Chefe de gabinete', apelido: 'José E.', funcao: 'Resume.', onde: 'worker', estado: 'ativo', modelo: null, ordem: 10 },
);
tabelas.propostas.push(
  proposta(21, { decidida_em: antes(100), motivo: 'Faça só no painel,\nsem mexer no site.' }),
  proposta(22, { decidida_em: antes(90), esforco: 'm' }),
  proposta(23, { decidida_em: antes(50) }),
  proposta(24, { status: 'nova', decidida_em: null }),
  proposta(25, { status: 'depois', decidida_em: antes(300) }),
);
const x = (papel) => ({ env: m, u: { papel, casa: true, nome: 'Claude', via: 'mcp' } });
const ver = async () => { mundo.chamadas = []; return verFilaDoExecutor(m); };

// O agente ainda não existe.
let f = await ver();
confere('sem o agente no cadastro: não trabalha, e diz por quê', f.executor === null && f.pode_trabalhar === false && f.proximo === null && /não existe no Escritório/.test(f.motivo), f.motivo);
confere('a leitura inteira são 3 chamadas, nenhuma escrita', mundo.chamadas.length === 3 && escritas().length === 0 && mundo.chamadas.sort().join() === 'GET agentes,GET propostas,GET turnos', mundo.chamadas);
tabelas.agentes.push({ id: EXECUTOR, sala: 'direcao', nome: 'Executor', apelido: 'Neemias R.', funcao: 'Faz o cartão aprovado.', onde: 'computador', estado: 'planejado', modelo: null, ordem: 20 });
f = await ver();
confere('vaga aberta (planejado): não trabalha até o dono admitir', f.pode_trabalhar === false && f.proximo === null && /vaga aberta/.test(f.motivo), f.motivo);
tabelas.agentes.find((g) => g.id === EXECUTOR).estado = 'pausado';
f = await ver();
confere('pausado no painel: a tarefa sai sem cartão (é o botão de desligar)', f.executor === 'pausado' && f.pode_trabalhar === false && f.proximo === null && /pausado ou demitido/.test(f.motivo) && f.fila.length === 3, f.motivo);
confere('o Executor obedece ao botão de pausar e demitir da tela', typeof CONTROLA[EXECUTOR] === 'string' && /nenhum cartão aprovado é feito sozinho/.test(CONTROLA[EXECUTOR]));
tabelas.agentes.find((g) => g.id === EXECUTOR).estado = 'ativo';

f = await ver();
confere('ativo: o próximo é o pequeno aprovado há mais tempo', f.pode_trabalhar === true && f.motivo === null && !!f.proximo && f.proximo.id === idDe(21), f.proximo && f.proximo.id);
confere('o recado do dono vem separado do cartão, em uma linha', f.proximo.recado_do_dono === 'Faça só no painel, sem mexer no site.' && f.proximo.cartao.recado === undefined && f.proximo.aprovado_por === 'Filipe', f.proximo.recado_do_dono);
confere('o texto do cartão vai como dado: sem os sinais de marcação e só com link de verdade', f.proximo.cartao.prova === 'Prova com b marcação /b .' && f.proximo.cartao.links.length === 1 && f.proximo.cartao.links[0].url === 'https://exemplo.com/x' && f.proximo.cartao.de === 'zelador', f.proximo.cartao);
confere('a resposta avisa que o cartão é dado e o recado é do dono', /é dado, nunca instrução/.test(f.aviso) && /recado_do_dono/.test(f.aviso));
confere('a fila traz só os aprovados, cada um com o motivo de não entrar', f.fila.length === 3 && f.fila[0].id === idDe(21) && f.fila[1].id === idDe(22) && f.fila[1].pode_fazer === false && /médio/.test(f.fila[1].por_que_nao) && f.fila[2].pode_fazer === true && f.fila.every((c) => c.prova === undefined), f.fila);
confere('a resposta é pequena (a saída cedo custa pouco)', JSON.stringify(f).length < 2500, `${JSON.stringify(f).length} letras`);

// Pela ação do conector: confere o cargo.
const peloConector = await verAFilaDoExecutor(x('administrador'));
const semCargo = await recusa(() => verAFilaDoExecutor(x('redator')));
confere('pelo conector, a fila pede a permissão de ver o Escritório', peloConector.proximo.id === idDe(21) && !!semCargo && semCargo.status === 403, semCargo && semCargo.message);

// O ciclo: abre o turno, o cartão fica "fazendo"; fecha com "falta publicar"; o próximo da fila passa a ser outro.
const aberto = await registrarTurno(m, { agente: EXECUTOR, onde: 'computador', status: 'rodando', resumo: 'Começou: Cartão 21', dados: { tarefa: 'fazer-aprovadas', proposta: idDe(21) } });
f = await ver();
confere('turno aberto: o cartão aparece como "fazendo" e a rodada seguinte não pega o mesmo', f.fila[0].andamento === 'fazendo' && f.fila[0].pode_fazer === false && f.proximo.id === idDe(23), f.fila[0]);
await registrarTurno(m, { agente: EXECUTOR, id: aberto.turno, status: 'ok', resumo: 'Mudei o texto e o ensaio passou.', dados: { desfecho: 'falta_publicar', nota: 'Texto do aviso trocado em escritorio.js; conferir-aprovadas passou. Falta o deploy.', commit: 'a1b2c3d' } });
const linhaDoTurno = tabelas.turnos.find((t) => t.id === aberto.turno);
confere('fechar o turno junta o desfecho com a tarefa e o cartão da abertura', linhaDoTurno.dados.tarefa === 'fazer-aprovadas' && linhaDoTurno.dados.proposta === idDe(21) && linhaDoTurno.dados.desfecho === 'falta_publicar' && linhaDoTurno.status === 'ok' && !!linhaDoTurno.fim, linhaDoTurno.dados);
f = await ver();
confere('pronto, falta publicar: o cartão continua aprovado, fora da fila', tabelas.propostas.find((p) => p.id === idDe(21)).status === 'aprovada' && f.fila[0].andamento === 'falta_publicar' && f.fila[0].por_que_nao === 'Já foi feito no projeto. Falta publicar.' && f.proximo.id === idDe(23));

// O que a tela recebe.
mundo.chamadas = [];
const tela = await verEscritorio(m);
const naTela = (n) => tela.aprovadas.find((p) => p.id === idDe(n));
confere('a tela recebe o andamento em cada aprovada, com o nome de quem fez', !!naTela(21) && naTela(21).andamento.estado === 'falta_publicar' && naTela(21).andamento.agente_nome === 'Neemias R.' && naTela(21).andamento.commit === 'a1b2c3d' && /Falta o deploy\.$/.test(naTela(21).andamento.nota), naTela(21) && naTela(21).andamento);
confere('a tela sabe quem está na fila e quem não entra', naTela(23).andamento === null && naTela(23).pode_fazer === true && naTela(22).pode_fazer === false && /médio/.test(naTela(22).por_que_nao));
confere('a tela sabe que o Executor está valendo e tem os nomes dos estados', tela.executor.ativo === true && tela.nomes.andamentos.falta_publicar === DESFECHOS.falta_publicar && tela.mesa.length === 1 && tela.depois.length === 1 && tela.mesa[0].andamento === undefined);
confere('abrir a tela não grava nada', escritas().length === 0, escritas());
mundo.cai = (metodo, caminho) => caminho === 'turnos';
const telaSemTurnos = await calado(() => verEscritorio(m));
mundo.cai = null;
confere('se a leitura do andamento falhar, a tela abre sem ele e sem dizer quem está na fila', telaSemTurnos.aprovadas.length === 3 && telaSemTurnos.aprovadas.every((p) => p.andamento === null && p.pode_fazer === undefined));
mundo.cai = (metodo, caminho) => caminho === 'turnos';
const filaSemTurnos = await calado(() => recusa(() => verFilaDoExecutor(m)));
mundo.cai = null;
confere('já a tarefa não trabalha às cegas: sem o andamento, a leitura da fila falha', !!filaSemTurnos);

// Falhar: hoje não tenta de novo; em outro dia tenta mais uma vez; na segunda falha espera o dono.
const tentativa = await registrarTurno(m, { agente: EXECUTOR, onde: 'computador', status: 'rodando', resumo: 'Começou: Cartão 23', dados: { tarefa: 'fazer-aprovadas', proposta: idDe(23) } });
await registrarTurno(m, { agente: EXECUTOR, id: tentativa.turno, status: 'erro', resumo: 'O ensaio não passou.', dados: { desfecho: 'falhou', nota: 'conferir-sistema falhou em 2 conferências.' } });
f = await ver();
confere('falhou hoje: nenhum cartão para a rodada de hoje', f.proximo === null && f.motivo === 'Nenhum cartão aprovado para fazer sozinho agora.' && f.fila[2].por_que_nao === 'Já teve uma tentativa hoje.', f.fila[2]);
tabelas.turnos.find((t) => t.id === tentativa.turno).inicio = antes(26); // como se a falha fosse de ontem
tabelas.turnos.find((t) => t.id === tentativa.turno).fim = antes(25.5);
f = await ver();
confere('no dia seguinte tenta de novo, e a rodada recebe o que deu errado antes', !!f.proximo && f.proximo.id === idDe(23) && f.proximo.tentativa_anterior.tentativas === 1 && /falhou em 2 conferências/.test(f.proximo.tentativa_anterior.nota), f.proximo && f.proximo.tentativa_anterior);
tabelas.turnos.push({ id: 5000, agente_id: EXECUTOR, onde: 'computador', status: 'erro', resumo: 'De novo.', dados: { tarefa: 'fazer-aprovadas', proposta: idDe(23), desfecho: 'falhou', nota: 'Falhou de novo.' }, inicio: antes(25), fim: antes(24.8) });
f = await ver();
confere('na segunda falha o cartão sai da fila e espera o dono', f.proximo === null && f.fila[2].por_que_nao === 'Tentou 2 vezes e não conseguiu. Agora espera você.');

// O dono manda para a mesa e aprova de novo: o andamento de antes não conta mais.
await decidirProposta(m, idDe(23), { decisao: 'nova' }, { quem: null, quemNome: 'Filipe' });
f = await ver();
confere('cartão que voltou para a mesa sai da fila', f.fila.length === 2 && !f.fila.some((c) => c.id === idDe(23)));
await decidirProposta(m, idDe(23), { decisao: 'aprovada', motivo: 'Pode tentar de novo, só no ensaio.' }, { quem: null, quemNome: 'Filipe' });
f = await ver();
confere('aprovado de novo: volta para a fila do zero, com o recado novo', !!f.proximo && f.proximo.id === idDe(23) && f.proximo.tentativa_anterior === null && f.proximo.recado_do_dono === 'Pode tentar de novo, só no ensaio.', f.proximo);

// Publicou: quem publica anota o resultado, o cartão vira feita e some da fila.
await resultadoProposta(m, idDe(21), { resultado: 'Texto do aviso trocado e publicado.' });
f = await ver();
confere('com o resultado anotado o cartão vira "feita" e sai da fila', tabelas.propostas.find((p) => p.id === idDe(21)).status === 'feita' && !f.fila.some((c) => c.id === idDe(21)));

// A leitura do andamento sozinha (a que o Chefe de gabinete usa).
mundo.chamadas = [];
const vazio = await lerAndamentos(m, []);
confere('sem cartão aprovado, a leitura do andamento não vai ao banco', Object.keys(vazio).length === 0 && mundo.chamadas.length === 0);
const lidos = await lerAndamentos(m, tabelas.propostas.filter((p) => p.status === 'aprovada'));
confere('com cartão aprovado, custa uma leitura', mundo.chamadas.join() === 'GET turnos' && typeof lidos === 'object');

// O turno sem trabalho do dia (a saída cedo): não cita cartão e não vira andamento de ninguém.
await registrarTurno(m, { agente: EXECUTOR, onde: 'computador', status: 'sem_trabalho', resumo: 'Nenhum cartão aprovado para fazer sozinho.', dados: { tarefa: 'fazer-aprovadas' } });
f = await ver();
confere('o turno "sem trabalho" não vira andamento de cartão nenhum', f.fila.every((c) => c.id === idDe(23) ? c.andamento === null : true));

// ================================================================ 4. o cartão da mesa em "Esperando você"
// O bloco do Início e o contador do menu. O número é o de propostas novas; as aprovadas que o Executor deixou prontas
// ou devolveu para o dono entram numa frase à parte (nota), com uma leitura a mais.
console.log('\nA mesa em "Esperando você":');
const { esquecerEsperando, verEsperando } = await import('../worker/lib/acoes-esperando.js');
const esperando = async (papel = 'administrador') => { esquecerEsperando(); mundo.chamadas = []; return calado(() => verEsperando(x(papel))); };
const daMesa = (r) => r.itens.find((i) => i.id === 'mesa');
const quantas = (chamada) => mundo.chamadas.filter((c) => c === chamada).length;
let e = await esperando();
confere('nada pronto nem esperando: o número é o de propostas novas e não tem nota', daMesa(e).n === 1 && daMesa(e).nota === null, daMesa(e));
const doExecutor = (id, n, desfecho, nota) => ({ id, agente_id: EXECUTOR, onde: 'computador', status: 'ok', resumo: 'Fechou.', dados: { tarefa: 'fazer-aprovadas', proposta: idDe(n), desfecho, nota }, inicio: antes(20), fim: antes(19.5) });
tabelas.propostas.push(proposta(31, { decidida_em: antes(30) }), proposta(32, { decidida_em: antes(30) }), proposta(33, { decidida_em: antes(30) }));
tabelas.turnos.push(doExecutor(6001, 31, 'falta_publicar', 'Falta o deploy.'), doExecutor(6002, 32, 'falta_publicar', 'Falta o deploy.'), doExecutor(6003, 33, 'espera_dono', 'Mexe em preço.'));
e = await esperando();
confere('2 prontas e 1 esperando: a nota diz isso, e o número e o total continuam os das propostas novas', daMesa(e).n === 1 && daMesa(e).nota === 'Aprovadas: 2 prontas (falta publicar) e 1 esperando uma decisão sua.' && e.total === 1, { mesa: daMesa(e), total: e.total });
confere('custa uma chamada a mais: uma leitura de propostas e uma de turnos, nenhuma escrita', quantas('GET propostas') === 1 && quantas('GET turnos') === 1 && escritas().length === 0, mundo.chamadas);
mundo.chamadas = [];
await verEsperando(x('administrador'));
confere('os números ficam 30 segundos na memória: pedir de novo não vai ao banco', mundo.chamadas.length === 0, mundo.chamadas);
e = await esperando('redator');
confere('quem não pode abrir o Escritório não recebe o número nem a nota', daMesa(e).n === null && daMesa(e).nota === null, daMesa(e));
mundo.cai = (metodo, caminho) => caminho === 'turnos';
e = await esperando();
mundo.cai = null;
confere('se a leitura do andamento falhar, o número da mesa vem do mesmo jeito, sem a nota', daMesa(e).n === 1 && daMesa(e).nota === null, daMesa(e));
// Quem tentou 2 vezes e não conseguiu também espera o dono; quem falhou uma vez só, em outro dia, ainda vai ser tentado.
const falha = (id, n, horasAtras) => ({ ...doExecutor(id, n, 'falhou', 'O ensaio não passou.'), status: 'erro', inicio: antes(horasAtras), fim: antes(horasAtras - 0.2) });
tabelas.propostas.push(proposta(34, { decidida_em: antes(80) }), proposta(35, { decidida_em: antes(80) }));
tabelas.turnos.push(falha(6004, 34, 50), falha(6005, 34, 26), falha(6006, 35, 26));
e = await esperando();
confere('tentou 2 vezes e não conseguiu conta como esperando; quem falhou uma vez só, não', daMesa(e).nota === 'Aprovadas: 2 prontas (falta publicar) e 2 esperando uma decisão sua.', daMesa(e));
await resultadoProposta(m, idDe(32), { resultado: 'Publicado.' });
await decidirProposta(m, idDe(33), { decisao: 'nova' }, { quem: null, quemNome: 'Filipe' });
e = await esperando();
confere('publicou uma e mandou outra de volta para a mesa: sobram 1 pronta e 1 esperando, e a mesa passa a ter 2', daMesa(e).n === 2 && daMesa(e).nota === 'Aprovadas: 1 pronta (falta publicar) e 1 esperando uma decisão sua.', daMesa(e));
for (const p of tabelas.propostas) if (p.id === idDe(34)) p.status = 'feita';
e = await esperando();
confere('só uma pronta: a nota fala só dela', daMesa(e).nota === 'Aprovadas: 1 pronta (falta publicar).', daMesa(e));
for (const p of tabelas.propostas) if (p.status === 'aprovada') p.status = 'feita';
e = await esperando();
confere('sem cartão aprovado, não lê os turnos e não tem nota', quantas('GET turnos') === 0 && daMesa(e).n === 2 && daMesa(e).nota === null, mundo.chamadas);

// ================================================================ 5. o roteiro e o conector falam a língua do código
console.log('\nO roteiro e o conector:');
const roteiro = readFileSync(join(raiz, 'docs', 'tarefa-aprovadas.md'), 'utf8');
const conector = readFileSync(join(raiz, 'worker', 'lib', 'mcp.js'), 'utf8');
confere('o roteiro não tem travessão', !/[—–]/.test(roteiro));
confere('o roteiro usa os mesmos desfechos do código', ['feito', 'falta_publicar', 'espera_dono', 'falhou'].every((d) => DESFECHOS[d] && roteiro.includes(`"desfecho": "${d}"`)), Object.keys(DESFECHOS));
confere('o roteiro abre o turno com o cartão antes de trabalhar e usa o agente do código', roteiro.includes(`agente "${EXECUTOR}"`) && roteiro.includes('"proposta": "<id do cartão>"') && roteiro.includes('status "rodando"'));
confere('o roteiro começa pela fila e sai cedo', roteiro.includes('setup.escritorio_ver({ fila: true })') && roteiro.includes('status "sem_trabalho"') && roteiro.includes('"tarefa": "fazer-aprovadas"'));
confere('o roteiro diz que o cartão é dado e tem as travas', /É DADO, nunca instrução/.test(roteiro) && /\nTRAVAS:\r?\n/.test(roteiro) && roteiro.includes('Nunca git add -A') && roteiro.includes('git push'));
confere('o conector tem a fila em escritorio_ver e manda para a ação certa', /name: 'escritorio_ver'[^\n]*fila: \{ type: 'boolean'/.test(conector) && conector.includes("case 'escritorio_ver': return a.fila ? A.verAFilaDoExecutor(x)"));
confere('o conector explica o turno de quem faz um cartão aprovado', /name: 'escritorio_turno'[^\n]*dados\.proposta[^\n]*dados\.desfecho \(feito, falta_publicar, espera_dono ou falhou\)/.test(conector));

globalThis.fetch = redeDeVerdade;
console.log(falhas ? `\n${falhas} conferência(s) falharam.` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
