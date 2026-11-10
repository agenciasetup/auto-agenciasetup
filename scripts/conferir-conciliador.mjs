// Confere o Conciliador da Colmeia (worker/lib/agentes/conciliador.js) sem gastar, sem gravar e sem avisar ninguém:
// 1. roda com simular no banco de verdade, SÓ LENDO (a rede desta parte recusa tudo o que não é leitura de tabela do
//    banco), e mostra quantos itens iriam para a IA, o tamanho da instrução e se a rodada trabalharia agora;
// 2. passa soluções de mentira pela conferência do código (número novo, link novo, item de agente, item que não
//    existe, grupo que o dono já decidiu) e monta o aviso do celular, sem mandar;
// 3. roda a rodada inteira com banco e IA de mentira, em memória: junção segura aplicada, junção com número novo
//    virando proposta, aprovar, desfazer, rodada sem mudança saindo cedo, erro da IA e dia sem orçamento. Esta parte
//    usa um endereço de banco que não existe e uma rede que só fala com a memória: não tem como tocar no banco real.
// A IA não é chamada: no computador não existe a chave do Claude.
// Uso: node scripts/conferir-conciliador.mjs [--dados] [--sem-banco]
//   --dados mostra também a mensagem com os itens (texto do dono: é para olhar aqui, não para colar fora).
//   --sem-banco pula a parte 1.
import { env as local } from './env.mjs';
import { conferirConflito, esquecerConciliador, responderAoConciliador, rodarConciliador, situacao, textoDoAviso } from '../worker/lib/agentes/conciliador.js';
import { lerProva, listarColmeia, salvarColmeia } from '../worker/lib/colmeia.js';
import { salvarNaColmeia } from '../worker/lib/acoes-colmeia.js';

const args = process.argv.slice(2);
const verDados = args.includes('--dados');
const semBanco = args.includes('--sem-banco');

let falhas = 0;
const confere = (nome, ok, extra = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${extra ? `  ${extra}` : ''}`); if (!ok) falhas += 1; };
const tokens = (n) => Math.round(n / 3.5);
const rede = globalThis.fetch;

// ---------------------------------------------------------------- 1. os itens e a instrução, com o banco de verdade
if (!semBanco) {
  if (!local.SUPABASE_URL || !local.SUPABASE_SECRET_KEY) { console.error('Faltam SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local.'); process.exit(1); }
  // O ambiente do Worker, só com o que a leitura precisa. Sem chave do Claude e sem a chave do cofre.
  const env = { SUPABASE_URL: local.SUPABASE_URL, SUPABASE_SECRET_KEY: local.SUPABASE_SECRET_KEY, AMBIENTE: 'local' };
  // A rede desta parte: só GET nas tabelas do banco. O resto é recusado.
  const base = `${env.SUPABASE_URL}/rest/v1/`;
  const chamadas = [];
  globalThis.fetch = async (alvo, op = {}) => {
    const url = String(alvo && alvo.url ? alvo.url : alvo);
    const metodo = String(op.method || (alvo && alvo.method) || 'GET').toUpperCase();
    const caminho = url.startsWith(base) ? url.slice(base.length).split('?')[0] : null;
    if (caminho === null || metodo !== 'GET' || caminho.startsWith('rpc/')) throw new Error(`Recusei ${metodo} ${caminho === null ? 'para fora do banco' : caminho}: esta parte só lê.`);
    chamadas.push(caminho);
    return rede(alvo, op);
  };
  // O banco que ainda não tem a migration 40 recusa a primeira leitura, e o código lê de novo sem a coluna nova.
  // Esse erro esperado fica fora da tela.
  const erroDoConsole = console.error;
  const calados = [];
  console.error = (...a) => { calados.push(a.join(' ')); };
  const t0 = Date.now();
  let r;
  try { r = await rodarConciliador(env, Date.now(), { simular: true }); } finally { console.error = erroDoConsole; }
  const tempo = Date.now() - t0;

  console.log('Rodada simulada no banco de verdade (nada foi gravado, nenhuma IA chamada, nenhum aviso).\n');
  console.log(`Leitura: ${chamadas.length} chamadas ao banco em ${tempo} ms (${chamadas.join(', ')})`);
  if (r.falta_migration) console.log('O banco ainda não tem a coluna colmeia.substitui (migration 40 não aplicada): li só os itens que valem.');
  else for (const c of calados) console.log(`  aviso do banco: ${c}`);
  const conta = (campo) => Object.entries(r.itens.reduce((s, i) => ({ ...s, [i[campo]]: (s[i[campo]] || 0) + 1 }), {})).map(([k, n]) => `${k} ${n}`).join(' · ');
  console.log(`\nItens valendo na Colmeia: ${r.valendo}. Iriam para a IA: ${r.itens.length}${r.fora ? ` (${r.fora} mais antigos ficariam de fora)` : ''}.`);
  console.log(`  por tipo: ${conta('tipo') || 'nada'}`);
  console.log(`  por origem: ${conta('origem') || 'nada'}`);
  console.log(`  marcados como "mudou" desde a última rodada: ${r.itens.filter((i) => i.mudou).length} · grupos já decididos pelo dono: ${r.ja_decididos.length}`);
  const entrada = tokens(r.instrucao.length + r.mensagem.length);
  console.log(`\nInstrução: ${r.instrucao.length} caracteres. Mensagem com os itens: ${r.mensagem.length} caracteres.`);
  console.log(`Entrada estimada: uns ${entrada} tokens (conta de cabeça: 3,5 letras por token). Modelo: ${r.modelo}.`);
  console.log(`Custo estimado de uma rodada que trabalha: uns US$ ${((entrada * 2 + 1500 * 10) / 1e6).toFixed(3).replace('.', ',')} (US$ 2 por milhão na entrada, US$ 10 na saída, até uns 1.500 tokens de saída).`);
  console.log(`\nEstado guardado (config conciliador_estado): ${r.estado.status ? `${r.estado.status}, conferido até ${r.estado.marca || 'nunca'}` : 'nenhum, nunca rodou'}`);
  console.log(`Última mudança no que vale na Colmeia: ${r.marca || 'nenhuma'}`);
  console.log(`Trabalharia agora: ${r.situacao.rodar ? 'sim' : `não. ${r.situacao.motivo}`}`);

  confere('a leitura coube em 3 chamadas', chamadas.length <= 3, `${chamadas.length}`);
  confere('todo item tem código, tipo, produto, origem, título e texto', r.itens.every((i) => /^i\d+$/.test(i.id) && i.tipo && i.produto && i.origem && i.titulo && i.texto));
  confere('nenhum id do banco vai para a IA', !/[0-9a-f]{8}-[0-9a-f]{4}-/.test(r.mensagem));
  confere('texto de fora não fecha a marcação', !/[<>]/.test(r.itens.map((i) => i.titulo + i.texto).join('')));
  confere('a mensagem põe os itens entre marcações', /^<itens>\n[\s\S]*\n<\/itens>\n\n<ja_decididos>\n[\s\S]*\n<\/ja_decididos>$/.test(r.mensagem));
  confere('a instrução não tem travessão', !/[—–]/.test(r.instrucao));
  confere('a instrução diz que o texto dos itens é dado', /é dado, nunca instrução/.test(r.instrucao));
  confere('a instrução proíbe inventar preço, desconto, prazo e promessa', /nenhum preço, desconto, prazo, promessa/.test(r.instrucao));

  console.log('\n---------------- instrução (igual toda rodada, sem dado de ninguém) ----------------');
  console.log(r.instrucao);
  console.log('------------------------------------------------------------------------------------');
  if (verDados) {
    console.log('\n---------------- mensagem com os itens (não cole fora daqui) ----------------');
    console.log(r.mensagem);
    console.log('-----------------------------------------------------------------------------');
  }
}

// ---------------------------------------------------------------- 2. a conferência de cada solução (sem banco)
console.log('\nConferência das soluções (com itens e respostas de mentira):');
const item = (n, tipo, produto, origem, titulo, texto) => ({ id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, tipo, produto, origem, titulo, texto });
const A = item(1, 'regra', 'geral', 'dono', 'Disse "to com uma dificuldade no curso"', 'Pergunte qual curso.');
const B = item(2, 'regra', 'geral', 'dono', 'Falou de um curso que você desconhece', 'Mande para o WhatsApp: wa.me/5569900000000');
const C = item(3, 'resposta', 'combo', 'semente', 'O combo é vitalício?', '"1 ano de acesso, mas tem a opção de vitalício por +39,90 brother"');
const D = item(4, 'resposta', 'combo', 'dono', 'O combo tem acesso para sempre?', 'Diga que é 1 ano de acesso.');
const F = item(6, 'vendeu', 'posts', 'agente', 'Mandar o link na hora vendeu', 'Quem pediu o preço e recebeu o link na mesma hora comprou.');
const G = item(7, 'regra', 'posts', 'dono', 'Pediu o preço do mini curso', 'Pergunte antes o que a pessoa faz.');
const montado = { porCodigo: new Map([['i1', A], ['i2', B], ['i3', C], ['i4', D], ['i6', F], ['i7', G]]), decididos: [] };
const sol = (itens, texto, extra = {}) => ({ itens, conflito: 'Um manda perguntar e o outro manda para o WhatsApp', tipo: 'regra', titulo: 'Falou de dificuldade em um curso', texto, precisa_do_dono: false, duvida: '', ...extra });

const segura = conferirConflito(sol(['i1', 'i2'], 'Se a pessoa ainda não disse qual é o curso, pergunte qual curso. Se já disse e não é um dos nossos dois produtos, mande para o WhatsApp: https://wa.me/5569900000000.'), montado);
confere('junção segura entra valendo', !!segura.juncao && segura.juncao.aplicar === true, segura.fora || (segura.juncao && segura.juncao.motivos.join(' ')));
confere('junção segura continua sendo palavra do dono', !!segura.juncao && segura.juncao.origem === 'dono');
confere('link que já estava nos itens passa, com ou sem https', !!segura.juncao && segura.juncao.aplicar);
confere('guarda os itens de antes com o título', !!segura.juncao && segura.juncao.originais.length === 2 && segura.juncao.originais[0].titulo === A.titulo);
const numero = conferirConflito(sol(['i3', 'i4'], 'É 1 ano de acesso, com a opção de vitalício por +49,90.', { tipo: 'resposta' }), montado);
confere('número que não estava nos itens vira proposta', !!numero.juncao && numero.juncao.aplicar === false && /49,9/.test(numero.juncao.prova), numero.juncao && numero.juncao.prova);
confere('proposta com número novo é item de agente', !!numero.juncao && numero.juncao.origem === 'agente');
const mesmoNumero = conferirConflito(sol(['i3', 'i4'], 'É 1 ano de acesso, mas tem a opção de vitalício por +39.90 brother.', { tipo: 'resposta' }), montado);
confere('o mesmo número escrito de outro jeito passa', !!mesmoNumero.juncao && mesmoNumero.juncao.aplicar === true, mesmoNumero.juncao && mesmoNumero.juncao.prova);
confere('produto igual nos itens fica no item novo', !!mesmoNumero.juncao && mesmoNumero.juncao.produto === 'combo' && mesmoNumero.juncao.tipo === 'resposta');
const link = conferirConflito(sol(['i1', 'i2'], 'Pergunte qual curso e mande para www.site-novo.com/ajuda.'), montado);
confere('link que não estava nos itens vira proposta', !!link.juncao && link.juncao.aplicar === false && /site-novo/.test(link.juncao.prova));
const arroba = conferirConflito(sol(['i1', 'i2'], 'Pergunte qual curso e mande chamar o @suporte_setup.'), montado);
confere('@ que não estava nos itens vira proposta', !!arroba.juncao && arroba.juncao.aplicar === false);
const promessa = conferirConflito(sol(['i1', 'i2'], 'Pergunte qual curso e ofereça um desconto se a pessoa reclamar.'), montado);
confere('falar de desconto sem os itens falarem vira proposta', !!promessa.juncao && promessa.juncao.aplicar === false);
const agente = conferirConflito(sol(['i6', 'i7'], 'Se a pessoa pediu o preço, mande o link na hora.'), montado);
confere('item de agente no meio vira proposta', !!agente.juncao && agente.juncao.aplicar === false && agente.juncao.origem === 'agente');
confere('tipo fora dos itens de antes vira um tipo deles', !!agente.juncao && agente.juncao.tipo === 'regra');
const duvida = conferirConflito(sol(['i1', 'i2'], 'Pergunte qual curso.', { precisa_do_dono: true, duvida: 'Quando a pessoa já disse o curso, pergunto de novo ou mando para o WhatsApp' }), montado);
confere('IA sem saber qual regra ganha vira proposta com a dúvida', !!duvida.juncao && duvida.juncao.aplicar === false && /pergunto de novo/.test(duvida.juncao.prova));
confere('proposta só por dúvida, sem novidade no texto, continua do dono', !!duvida.juncao && duvida.juncao.origem === 'dono');
// A pergunta fica separada do "por quê", para a tela mostrar com o campo de resposta.
const propostaDe = (j) => ({ status: 'proposta', prova: j.prova, substitui: j.originais });
const lida = lerProva(propostaDe(duvida.juncao));
confere('a pergunta para o dono termina em "?" e sai separada do por quê', duvida.juncao.pergunta === 'Quando a pessoa já disse o curso, pergunto de novo ou mando para o WhatsApp?' && lida.pergunta === duvida.juncao.pergunta && lida.porque === 'Um manda perguntar e o outro manda para o WhatsApp.', JSON.stringify(lida));
const comprida = conferirConflito(sol(['i6', 'i7'], 'Mande o link www.site-novo.com/x por 49,90 com desconto.', { conflito: 'x'.repeat(400), precisa_do_dono: true, duvida: 'Mando o link na hora ou pergunto antes' }), montado);
confere('por quê comprido não corta a pergunta', comprida.juncao.prova.length <= 600 && lerProva(propostaDe(comprida.juncao)).pergunta === 'Mando o link na hora ou pergunto antes?', `${comprida.juncao.prova.length} letras`);
confere('proposta sem pergunta não mostra campo de resposta', lerProva(propostaDe(numero.juncao)).pergunta === '' && lerProva(propostaDe(numero.juncao)).porque === numero.juncao.prova);
const antiga = lerProva({ status: 'proposta', substitui: [A, B], prova: 'Um item manda oferecer o combo e o outro manda oferecer o Formação Design por R$ 69,90 com outro link. Quando alguém pergunta por curso de design, devo oferecer o combo, o Formação Design ou os dois?' });
confere('proposta antiga (sem a marca): a última frase com "?" é a pergunta', antiga.pergunta === 'Quando alguém pergunta por curso de design, devo oferecer o combo, o Formação Design ou os dois?' && /69,90 com outro link\.$/.test(antiga.porque), JSON.stringify(antiga));
confere('item que já vale não tem pergunta, mesmo com "?" no por quê', lerProva({ status: 'ativa', substitui: [A, B], prova: 'Qual vale?' }).pergunta === '');
confere('proposta comum de agente não tem pergunta', lerProva({ status: 'proposta', substitui: null, prova: 'Será que vende?' }).pergunta === '');
confere('item que não existe fica de fora', !!conferirConflito(sol(['i1', 'i99'], 'Pergunte qual curso.'), montado).fora);
confere('um item só não é conflito', !!conferirConflito(sol(['i1', 'i1'], 'Pergunte qual curso.'), montado).fora);
confere('item já usado em outra junção fica de fora', !!conferirConflito(sol(['i1', 'i2'], 'Pergunte qual curso.'), montado, new Set([A.id])).fora);
confere('grupo que o dono já decidiu fica de fora', !!conferirConflito(sol(['i1', 'i2'], 'Pergunte qual curso.'), { ...montado, decididos: [[A.id, B.id]] }).fora);
confere('texto maior que a Colmeia aceita fica de fora', !!conferirConflito(sol(['i1', 'i2'], 'x'.repeat(1201)), montado).fora);
const traco = conferirConflito(sol(['i1', 'i2'], 'Pergunte qual curso — e só depois mande para o WhatsApp.'), montado);
confere('travessão vira vírgula', !!traco.juncao && !/[—–]/.test(traco.juncao.texto) && traco.juncao.texto.includes('curso, e só'));

const aviso = textoDoAviso([
  { status: 'ativa', titulo: 'Falou de dificuldade em um curso', conflito: 'Um manda perguntar e o outro manda para o WhatsApp.', motivos: [], originais: [A, B] },
  { status: 'proposta', titulo: 'O combo é vitalício?', conflito: 'Um fala do vitalício e o outro não.', motivos: ['O texto novo tem número que não está nos itens de antes (49,9).'], originais: [C, D] },
]);
confere('aviso com uma junção feita e uma esperando', aviso.titulo === 'Colmeia: 1 junção feita e 1 esperando o seu sim' && aviso.corpo.split('\n').length === 3, aviso.titulo);
confere('o aviso ensina a desfazer', /Desfazer a junção/.test(aviso.corpo));
confere('o aviso cabe no limite do push (3000)', JSON.stringify({ ...aviso, url: '/admin/colmeia', tipo: 'escritorio', em: Date.now(), tag: 'conciliador-1' }).length < 3000);
const agora = Date.now();
const iso = (t) => new Date(t).toISOString();
confere('Colmeia que mudou há 1 minuto espera', situacao({ marca: iso(agora - 3600_000) }, iso(agora - 60_000), agora).rodar === false);
confere('Colmeia que mudou há 4 minutos trabalha', situacao({ marca: iso(agora - 3600_000) }, iso(agora - 240_000), agora).rodar === true);
confere('Colmeia sem mudança não trabalha', situacao({ marca: iso(agora - 240_000), status: 'ok' }, iso(agora - 240_000), agora).rodar === false);

// ---------------------------------------------------------------- 3. a rodada inteira, com banco e IA de mentira
console.log('\nA rodada inteira, com banco e IA de mentira (em memória):');
const BANCO = 'https://banco-de-mentira.invalid';
const env = { SUPABASE_URL: BANCO, SUPABASE_SECRET_KEY: 'sb_secret_de_mentira', AMBIENTE: 'local', ANTHROPIC_CHAVE: 'chave-de-mentira' };
const tabelas = { colmeia: [], config: [], turnos: [], consumo_ia: [], agentes_historico: [], equipe: [], auditoria: [], agentes: [{ id: 'conciliador', onde: 'worker', estado: 'planejado', modelo: 'claude-sonnet-5-5' }] };
let serie = 100;
const novoId = () => `00000000-0000-4000-8000-${String(++serie).padStart(12, '0')}`;
const mundo = { chamadas: [], ia: null, pedidos: [], gastoHoje: 0.1, falharArquivo: false };

function passa(linha, coluna, cond) {
  const v = linha[coluna];
  if (cond.startsWith('eq.')) return String(v) === cond.slice(3);
  if (cond.startsWith('neq.')) return String(v) !== cond.slice(4);
  if (cond.startsWith('in.(')) return cond.slice(4, -1).split(',').includes(String(v));
  if (cond === 'not.is.null') return v !== null && v !== undefined;
  if (cond === 'is.true') return v === true;
  throw new Error(`O banco de mentira não conhece o filtro ${coluna}=${cond}`);
}
function filtrar(linhas, params) {
  let r = linhas;
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) continue;
    if (k === 'or') {
      const partes = v.slice(1, -1).split(',').map((p) => [p.slice(0, p.indexOf('.')), p.slice(p.indexOf('.') + 1)]);
      r = r.filter((l) => partes.some(([c, cond]) => passa(l, c, cond)));
    } else r = r.filter((l) => passa(l, k, v));
  }
  const ordem = params.get('order');
  if (ordem) {
    const chaves = ordem.split(',').map((o) => o.split('.'));
    r = [...r].sort((a, b) => { for (const [c, dir] of chaves) { const d = String(a[c] ?? '').localeCompare(String(b[c] ?? '')); if (d) return dir === 'desc' ? -d : d; } return 0; });
  }
  const limite = Number(params.get('limit'));
  return limite ? r.slice(0, limite) : r;
}
const resposta = (corpo, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json', 'request-id': 'req_de_mentira' } });

// A rede da parte 3: banco e IA em memória. Qualquer outro endereço é recusado, e a rede de verdade nem é chamada.
globalThis.fetch = async (alvo, op = {}) => {
  const url = new URL(String(alvo && alvo.url ? alvo.url : alvo));
  const metodo = String(op.method || 'GET').toUpperCase();
  if (url.origin === 'https://api.anthropic.com' && url.pathname === '/v1/messages') {
    mundo.chamadas.push('IA');
    const pedido = JSON.parse(op.body);
    mundo.pedidos.push(pedido);
    if (mundo.ia === 'erro') return resposta({ type: 'error', error: { type: 'api_error', message: 'caiu' } }, 500);
    // O ajuste de uma junção com a resposta do dono (responderAoConciliador) usa outra ferramenta.
    if (pedido.tools[0].name === 'entregar_ajuste') {
      return resposta({
        id: 'msg_de_mentira', type: 'message', role: 'assistant', model: pedido.model, stop_reason: 'tool_use', stop_sequence: null,
        content: [{ type: 'tool_use', id: 'toolu_de_mentira', name: 'entregar_ajuste', input: mundo.ajuste(pedido) }],
        usage: { input_tokens: 900, output_tokens: 200 },
      });
    }
    const texto = pedido.messages[0].content;
    const itens = texto.slice(texto.indexOf('<itens>\n') + 8, texto.indexOf('\n</itens>')).split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const codigo = (titulo) => (itens.find((i) => i.titulo === titulo) || { id: 'i999' }).id;
    return resposta({
      id: 'msg_de_mentira', type: 'message', role: 'assistant', model: pedido.model, stop_reason: 'tool_use', stop_sequence: null,
      content: [{ type: 'tool_use', id: 'toolu_de_mentira', name: pedido.tools[0].name, input: mundo.ia(codigo, itens) }],
      usage: { input_tokens: 3000, output_tokens: 400 },
    });
  }
  if (url.origin !== BANCO || !url.pathname.startsWith('/rest/v1/')) throw new Error(`A rede de mentira recusou ${metodo} ${url.origin}${url.pathname}`);
  const caminho = url.pathname.slice('/rest/v1/'.length);
  mundo.chamadas.push(`${metodo} ${caminho}`);
  if (caminho.startsWith('rpc/')) return resposta(caminho === 'rpc/escritorio_resumo' ? { custo_hoje: mundo.gastoHoje } : {});
  const tabela = tabelas[caminho];
  if (!tabela) throw new Error(`O banco de mentira não tem a tabela ${caminho}`);
  if (metodo === 'GET') return resposta(filtrar(tabela, url.searchParams));
  const corpo = JSON.parse(op.body);
  if (metodo === 'POST') {
    const criadas = [];
    for (const d of Array.isArray(corpo) ? corpo : [corpo]) {
      const existente = caminho === 'config' ? tabela.find((l) => l.chave === d.chave) : null;
      if (existente) { Object.assign(existente, d); criadas.push(existente); continue; }
      const agoraIso = new Date().toISOString();
      const linha = caminho === 'colmeia' ? { id: novoId(), produto: 'geral', prova: null, origem: 'dono', autor: null, status: 'ativa', substitui: null, criado_em: agoraIso, atualizado_em: agoraIso, ...d }
        : caminho === 'turnos' ? { id: tabela.length + 1, ...d } : { ...d };
      tabela.push(linha);
      criadas.push(linha);
    }
    return resposta(criadas, 201);
  }
  if (metodo === 'PATCH') {
    if (mundo.falharArquivo && caminho === 'colmeia' && corpo.status === 'arquivada') { mundo.falharArquivo = false; return resposta({ message: 'caiu de propósito' }, 500); }
    const mudadas = filtrar(tabela, url.searchParams);
    for (const l of mudadas) Object.assign(l, corpo);
    return resposta(mudadas);
  }
  throw new Error(`O banco de mentira não faz ${metodo}`);
};

const semear = (tipo, produto, origem, titulo, texto, haMinutos = 30) => {
  const quando = new Date(Date.now() - haMinutos * 60_000).toISOString();
  const linha = { id: novoId(), tipo, produto, titulo, texto, prova: origem === 'agente' ? 'Três conversas no dia 09/11.' : null, origem, autor: null, status: 'ativa', substitui: null, criado_em: quando, atualizado_em: quando };
  tabelas.colmeia.push(linha);
  return linha;
};
const sA = semear('regra', 'geral', 'dono', A.titulo, 'Pergunte qual curso.');
const sB = semear('regra', 'geral', 'dono', B.titulo, 'Mande para o WhatsApp.');
const sC = semear('resposta', 'combo', 'semente', C.titulo, C.texto);
const sD = semear('resposta', 'combo', 'dono', D.titulo, D.texto);
const sE = semear('regra', 'geral', 'dono', 'Quando ofertar', 'Oferte só quando a pessoa pedir preço ou disser que quer.');
const sF = semear('vendeu', 'posts', 'agente', F.titulo, F.texto);
const sG = semear('regra', 'posts', 'dono', G.titulo, G.texto);
const linhaDe = (id) => tabelas.colmeia.find((l) => l.id === id);
const estado = () => (tabelas.config.find((l) => l.chave === 'conciliador_estado') || { valor: {} }).valor;
const rodar = async (quando, opcoes) => { mundo.chamadas = []; return rodarConciliador(env, quando, opcoes); };
const minuto = 60_000;
// Uma pausa curta entre os passos, para duas mudanças seguidas não caírem no mesmo milésimo de segundo.
const pausa = () => new Promise((ok) => setTimeout(ok, 15));
let relogio = Date.now();
esquecerConciliador();

// A IA de mentira: um conflito seguro, um com item que não existe, um com número novo e um com item de agente.
const quatroConflitos = (codigo) => ({
  ha_mais: false,
  conflitos: [
    { itens: [codigo(sA.titulo), codigo(sB.titulo)], conflito: 'Um manda perguntar qual curso e o outro manda para o WhatsApp', tipo: 'regra', titulo: 'Falou de dificuldade em um curso', texto: 'Se a pessoa ainda não disse qual é o curso, pergunte qual curso. Se já disse e não é um dos nossos produtos, mande para o WhatsApp.', precisa_do_dono: false, duvida: '' },
    { itens: [codigo(sE.titulo), 'i999'], conflito: 'Conflito com item que não existe', tipo: 'regra', titulo: 'Quando ofertar', texto: 'Oferte sempre.', precisa_do_dono: false, duvida: '' },
    { itens: [codigo(sC.titulo), codigo(sD.titulo)], conflito: 'Um fala da opção de vitalício e o outro só fala de 1 ano', tipo: 'resposta', titulo: 'O combo é vitalício ou tem acesso para sempre?', texto: 'Diga que é 1 ano de acesso, com a opção de vitalício por +49,90.', precisa_do_dono: false, duvida: '' },
    { itens: [codigo(sF.titulo), codigo(sG.titulo)], conflito: 'A lição diz que mandar o link na hora vendeu, e a regra manda perguntar antes', tipo: 'regra', titulo: 'Pediu o preço do mini curso', texto: 'Mande o link na hora.', precisa_do_dono: true, duvida: 'Mando o link na hora ou pergunto antes o que a pessoa faz' },
  ],
});

// 3.1 a Colmeia acabou de mudar: espera, sem chamar a IA
sA.atualizado_em = new Date(relogio - minuto).toISOString();
mundo.ia = quatroConflitos;
let r = await rodar(relogio);
confere('mudou há 1 minuto: sai sem trabalhar, em 2 leituras', r === null && mundo.chamadas.length === 2 && !mundo.chamadas.includes('IA') && tabelas.config.length === 0, mundo.chamadas.join(', '));

// 3.2 quieta há 4 minutos: trabalha
relogio += 3 * minuto;
r = await rodar(relogio);
const parado = [...mundo.chamadas];
const novas = tabelas.colmeia.filter((l) => l.substitui);
const n1 = novas.find((l) => l.substitui.some((s) => s.id === sA.id));
const n2 = novas.find((l) => l.substitui.some((s) => s.id === sC.id));
const n3 = novas.find((l) => l.substitui.some((s) => s.id === sF.id));
confere('a rodada que trabalha termina ok com 3 junções e 1 conflito de fora', !!r && r.status === 'ok' && r.feitas.length === 3 && r.fora.length === 1, r ? `${r.status}: ${r.resumo}` : 'null');
confere('junção segura entrou valendo, como palavra do dono', !!n1 && n1.status === 'ativa' && n1.origem === 'dono' && /Salomão/.test(n1.autor || ''));
confere('os dois itens de antes foram para o arquivo', sA.status === 'arquivada' && sB.status === 'arquivada');
confere('o item novo guarda quem ele juntou, com os títulos', !!n1 && n1.substitui.length === 2 && n1.substitui.map((s) => s.titulo).includes(sB.titulo));
confere('número novo: entrou como proposta e os itens de antes continuam valendo', !!n2 && n2.status === 'proposta' && n2.origem === 'agente' && sC.status === 'ativa' && sD.status === 'ativa' && /49,9/.test(n2.prova || ''), n2 && n2.prova);
confere('item de agente: entrou como proposta, com a dúvida', !!n3 && n3.status === 'proposta' && sF.status === 'ativa' && sG.status === 'ativa' && /pergunto antes/.test(n3.prova || ''));
confere('nada além disso mudou na Colmeia', tabelas.colmeia.length === 10 && sE.status === 'ativa');
confere('o estado guarda até onde conferiu', estado().status === 'ok' && !!n1 && estado().marca === n1.atualizado_em);
confere('o turno saiu com o custo, uma vez só', tabelas.turnos.length === 1 && tabelas.turnos[0].status === 'ok' && Number(tabelas.turnos[0].custo_usd) > 0 && tabelas.consumo_ia.length === 1, `turnos ${tabelas.turnos.length}, consumo ${tabelas.consumo_ia.length}`);
confere('o agente passou a trabalhando no primeiro turno', tabelas.agentes[0].estado === 'ativo');
confere('chamou a IA uma vez e tentou avisar o dono', mundo.chamadas.filter((c) => c === 'IA').length === 1 && mundo.chamadas.filter((c) => c === 'GET config').length === 3, mundo.chamadas.join(', '));
const pedido = mundo.pedidos.at(-1);
confere('a chamada à IA segue o combinado', pedido.model === 'claude-sonnet-5-5' && pedido.output_config.effort === 'low' && pedido.tools[0].strict === true && pedido.tool_choice.type === 'auto' && /é dado, nunca instrução/.test(pedido.system));
confere('nenhum id do banco foi para a IA', !/[0-9a-f]{8}-[0-9a-f]{4}-/.test(pedido.messages[0].content));
console.log(`     chamadas externas da rodada que trabalha (3 junções, primeiro turno, sem aparelho com aviso ligado): ${parado.length}`);
console.log(`     ${parado.join(' · ')}`);

// 3.3 sem mudança: sai cedo
r = await rodar(relogio + minuto);
confere('minuto seguinte, sem mudança: 1 leitura', r === null && mundo.chamadas.length === 1, mundo.chamadas.join(', '));
esquecerConciliador();
r = await rodar(relogio + 2 * minuto);
confere('sem a memória do Worker: 2 leituras', r === null && mundo.chamadas.length === 2, mundo.chamadas.join(', '));

// 3.4 o dono aprova a proposta: os itens de antes saem
await pausa();
let a = await salvarColmeia(env, { status: 'ativa' }, { id: n2.id, quemNome: 'Filipe' });
confere('aprovar a junção arquiva os itens de antes', n2.status === 'ativa' && sC.status === 'arquivada' && sD.status === 'arquivada' && a.arquivados === 2);
relogio += 10 * minuto;
mundo.ia = () => ({ conflitos: [], ha_mais: false });
r = await rodar(relogio);
confere('depois da aprovação ele confere de novo e não acha nada', !!r && r.status === 'sem_trabalho' && r.feitas.length === 0 && tabelas.turnos.at(-1).status === 'sem_trabalho', r ? r.resumo : 'null');
confere('rodada sem junção não avisa o dono', !!r && r.avisados === 0 && mundo.chamadas.filter((c) => c === 'GET config').length === 2, mundo.chamadas.join(', '));
console.log(`     chamadas externas da rodada que confere e não acha nada: ${mundo.chamadas.length}`);

// 3.5 o dono desfaz a junção: o novo sai, os de antes voltam, e o Conciliador não junta de novo
await pausa();
a = await salvarColmeia(env, { status: 'arquivada', desfazer: true }, { id: n1.id, quemNome: 'Filipe' });
confere('desfazer arquiva o item novo e devolve os de antes', n1.status === 'arquivada' && sA.status === 'ativa' && sB.status === 'ativa' && a.voltaram === 2 && a.desfeita === true);
relogio += 10 * minuto;
mundo.ia = (codigo) => ({ ha_mais: false, conflitos: [quatroConflitos(codigo).conflitos[0]] });
const antesDeTentar = tabelas.colmeia.length;
r = await rodar(relogio);
confere('junção desfeita não é feita de novo', !!r && r.status === 'sem_trabalho' && tabelas.colmeia.length === antesDeTentar && sA.status === 'ativa' && sB.status === 'ativa', r ? r.resumo : 'null');
confere('a IA recebe o grupo que o dono já decidiu', /<ja_decididos>\n\[\["i\d+","i\d+"\]/.test(mundo.pedidos.at(-1).messages[0].content));
let recusou = null;
try { await salvarColmeia(env, { status: 'arquivada', desfazer: true }, { id: n1.id }); } catch (e) { recusou = e; }
confere('desfazer duas vezes é recusado', !!recusou && recusou.status === 400 && sA.status === 'ativa');
recusou = null;
try { await salvarColmeia(env, { status: 'arquivada', desfazer: true }, { id: sE.id }); } catch (e) { recusou = e; }
confere('desfazer um item comum é recusado e não arquiva', !!recusou && recusou.status === 400 && sE.status === 'ativa');
recusou = null;
try { await salvarColmeia(env, { status: 'arquivada', desfazer: true }, { id: n2.id, agente: true }); } catch (e) { recusou = e; }
confere('agente não desfaz junção', !!recusou && recusou.status === 403 && n2.status === 'ativa');

// 3.6 o dono descarta a proposta: os itens de antes continuam valendo
await salvarColmeia(env, { status: 'arquivada' }, { id: n3.id, quemNome: 'Filipe' });
confere('descartar a proposta não mexe nos itens de antes', n3.status === 'arquivada' && sF.status === 'ativa' && sG.status === 'ativa');

// 3.7 a IA cai: nada muda, tenta mais uma vez 10 minutos depois
await pausa();
sE.atualizado_em = new Date().toISOString();
relogio = Date.now() + 4 * minuto;
mundo.ia = 'erro';
const turnosAntes = tabelas.turnos.length;
const erroDaIa = console.error;
console.error = () => {}; // o erro esperado da IA fica fora da tela
try { r = await rodar(relogio); } finally { console.error = erroDaIa; }
confere('IA fora do ar: rodada com erro e Colmeia intacta', !!r && r.status === 'erro' && tabelas.colmeia.length === antesDeTentar && estado().status === 'erro' && tabelas.turnos.length === turnosAntes + 1, r ? r.resumo : 'null');
mundo.ia = () => ({ conflitos: [], ha_mais: false });
r = await rodar(relogio + minuto);
confere('um minuto depois do erro ainda espera', r === null && !mundo.chamadas.includes('IA'));
r = await rodar(relogio + 11 * minuto);
confere('10 minutos depois tenta de novo e fecha', !!r && r.status === 'sem_trabalho' && estado().status === 'sem_trabalho');

// 3.8 dia sem orçamento: não chama a IA e fica para o dia seguinte
await pausa();
sE.atualizado_em = new Date().toISOString();
relogio = Date.now() + 4 * minuto;
mundo.gastoHoje = 5;
r = await rodar(relogio);
confere('sem orçamento: não chama a IA e guarda para depois', !!r && r.status === 'sem_orcamento' && !mundo.chamadas.includes('IA') && !!estado().adiado_ate, r ? r.resumo : 'null');
r = await rodar(relogio + minuto);
confere('no mesmo dia não tenta de novo', r === null && mundo.chamadas.length === 2);
mundo.gastoHoje = 0.1;
r = await rodar(Date.parse(estado().adiado_ate) + minuto);
confere('no dia seguinte confere', !!r && r.status === 'sem_trabalho' && mundo.chamadas.includes('IA'));

// 3.9 o arquivo falha depois de criar o item novo: a junção vira proposta e nada se perde
await pausa();
const sH = semear('regra', 'geral', 'dono', 'Mandou só um áudio', 'Peça para escrever.', 0);
const sI = semear('regra', 'geral', 'dono', 'A pessoa mandou áudio', 'Diga que no momento só consegue ler texto.', 0);
relogio = Date.now() + 4 * minuto;
mundo.falharArquivo = true;
mundo.ia = (codigo) => ({ ha_mais: false, conflitos: [{ itens: [codigo(sH.titulo), codigo(sI.titulo)], conflito: 'Os dois falam de áudio com respostas diferentes', tipo: 'regra', titulo: 'A pessoa mandou só áudio', texto: 'Diga que no momento só consegue ler texto e peça para escrever.', precisa_do_dono: false, duvida: '' }] });
const erroDoConsole = console.error;
console.error = () => {};
try { r = await rodar(relogio); } finally { console.error = erroDoConsole; }
const n4 = tabelas.colmeia.find((l) => l.substitui && l.substitui.some((s) => s.id === sH.id));
confere('arquivo falhou: a junção ficou como proposta e os itens de antes continuam valendo', !!r && r.status === 'ok' && !!n4 && n4.status === 'proposta' && sH.status === 'ativa' && sI.status === 'ativa' && r.feitas[0].status === 'proposta', r ? r.resumo : 'null');

// 3.10 simular não grava nem chama a IA
const retrato = JSON.stringify(tabelas);
r = await rodar(relogio, { simular: true });
confere('simular só lê', JSON.stringify(tabelas) === retrato && mundo.chamadas.every((c) => c.startsWith('GET ')) && r.itens.length > 0 && typeof r.instrucao === 'string', mundo.chamadas.join(', '));

// 3.11 o dono responde a pergunta no cartão: o Conciliador reescreve o item e a proposta continua esperando o sim
console.log('\nA resposta do dono a uma pergunta do Conciliador:');
const sJ = semear('resposta', 'geral', 'dono', 'Tem outro curso de design?', 'Apresente o combo Black Calango com o preço de hoje e o link do combo.');
const sK = semear('resposta', 'geral', 'dono', 'Você tem algum curso de design?', 'Apresente o Formação Design por R$ 69,90, com o link https://pay.hub.la/abc123.');
const proposta = (extra = {}) => {
  const quando = new Date().toISOString();
  const linha = { id: novoId(), tipo: 'resposta', produto: 'geral', titulo: 'Tem curso de design?', texto: 'Apresente o combo Black Calango ou o Formação Design por R$ 69,90.', prova: 'Um item manda oferecer o combo e o outro o Formação Design. Pergunta: Ofereço o combo, o Formação Design ou os dois?', origem: 'dono', autor: 'Salomão R. (Conciliador)', status: 'proposta', substitui: [{ id: sJ.id, titulo: sJ.titulo }, { id: sK.id, titulo: sK.titulo }], criado_em: quando, atualizado_em: quando, ...extra };
  tabelas.colmeia.push(linha);
  return linha;
};
const p1 = proposta();
const naTela = async (id) => (await listarColmeia(env, {})).itens.find((i) => i.id === id);
let cartao = await naTela(p1.id);
confere('a tela recebe a pergunta separada do por quê', cartao.pergunta === 'Ofereço o combo, o Formação Design ou os dois?' && cartao.porque === 'Um item manda oferecer o combo e o outro o Formação Design.', JSON.stringify({ pergunta: cartao.pergunta, porque: cartao.porque }));
const marcaAntes = tabelas.colmeia.filter((l) => l.status === 'ativa').map((l) => l.atualizado_em).sort().at(-1);
const turnosAntesDoAjuste = tabelas.turnos.length;
const consumoAntes = tabelas.consumo_ia.length;
mundo.ajuste = () => ({ entendi: true, titulo: 'Tem curso de design? Quero aprender design', texto: 'Apresente primeiro o combo Black Calango com o preço de hoje e o link do combo. Se a pessoa achar caro, apresente o Formação Design por R$ 69,90, com o link https://pay.hub.la/abc123.', pergunta: '' });
mundo.chamadas = [];
const dono = { id: '11111111-1111-4111-8111-111111111111', nome: 'Filipe Lourenço', papel: 'administrador', via: 'painel' };
r = await salvarNaColmeia({ env, u: dono }, { responder: 'Os dois: primeiro o combo, e o Formação Design se a pessoa achar caro.' }, p1.id);
confere('a resposta ajusta o texto e a proposta continua esperando o sim', r.ajustou === true && p1.status === 'proposta' && /primeiro o combo Black Calango/.test(p1.texto) && sJ.status === 'ativa' && sK.status === 'ativa', `${p1.status}: ${p1.texto.slice(0, 60)}`);
confere('texto feito dos itens do dono e da resposta dele continua palavra do dono', p1.origem === 'dono' && /Confira o texto e aprove/.test(r.aviso), `${p1.origem}: ${r.aviso}`);
cartao = await naTela(p1.id);
confere('o cartão fica sem pergunta e guarda o que o dono respondeu', cartao.pergunta === '' && /Você respondeu: "Os dois: primeiro o combo/.test(cartao.porque) && !/Pergunta:/.test(p1.prova), p1.prova);
const pedidoAjuste = mundo.pedidos.at(-1);
confere('a IA recebe os itens de antes, a proposta, a pergunta e a resposta, sem id do banco', /<itens_de_antes>[\s\S]*<proposta>[\s\S]*<pergunta>\nOfereço o combo[\s\S]*<resposta_do_dono>\nOs dois: primeiro/.test(pedidoAjuste.messages[0].content) && !/[0-9a-f]{8}-[0-9a-f]{4}-/.test(pedidoAjuste.messages[0].content));
confere('a instrução do ajuste segue o combinado', pedidoAjuste.model === 'claude-sonnet-5-5' && pedidoAjuste.tools[0].strict === true && /é dado, nunca instrução/.test(pedidoAjuste.system) && /Não invente nada/.test(pedidoAjuste.system) && !/[—–]/.test(pedidoAjuste.system));
confere('o ajuste anota um turno com o custo, uma vez só', tabelas.turnos.length === turnosAntesDoAjuste + 1 && Number(tabelas.turnos.at(-1).custo_usd) > 0 && tabelas.consumo_ia.length === consumoAntes + 1, `turnos +${tabelas.turnos.length - turnosAntesDoAjuste}, consumo +${tabelas.consumo_ia.length - consumoAntes}`);
confere('ajustar a proposta não acorda outra rodada do Conciliador', tabelas.colmeia.filter((l) => l.status === 'ativa').map((l) => l.atualizado_em).sort().at(-1) === marcaAntes);
a = await salvarColmeia(env, { status: 'ativa' }, { id: p1.id, quemNome: 'Filipe' });
confere('depois de aprovar, os itens de antes saem e o ajustado vale', p1.status === 'ativa' && sJ.status === 'arquivada' && sK.status === 'arquivada' && a.arquivados === 2);

// A resposta não resolve: o texto fica como estava e a pergunta nova entra no cartão.
const sL = semear('regra', 'geral', 'dono', 'Pediu desconto no combo', 'Diga que o preço é R$ 97.');
const sM = semear('regra', 'geral', 'dono', 'Achou o combo caro', 'Ofereça por 79,90 se fechar agora.');
const p2 = proposta({ tipo: 'regra', titulo: 'Tem desconto no combo?', texto: 'Diga que o preço é R$ 97.', prova: 'Um item segura o preço e o outro dá desconto. O preço fixo agora é R$ 97 mesmo?', substitui: [{ id: sL.id, titulo: sL.titulo }, { id: sM.id, titulo: sM.titulo }] });
const textoAntes = p2.texto;
mundo.ajuste = () => ({ entendi: false, titulo: '', texto: '', pergunta: 'Quem já recebeu a oferta de 79,90 continua com ela' });
r = await responderAoConciliador(env, p2.id, 'depende');
cartao = await naTela(p2.id);
confere('resposta que não resolve: texto igual e pergunta nova no cartão', r.ajustou === false && p2.texto === textoAntes && p2.status === 'proposta' && cartao.pergunta === 'Quem já recebeu a oferta de 79,90 continua com ela?' && /Você respondeu: "depende"/.test(cartao.porque), JSON.stringify({ pergunta: cartao.pergunta, porque: cartao.porque }));

// A IA inventa um número: o cartão avisa e o item deixa de ser palavra do dono.
mundo.ajuste = () => ({ entendi: true, titulo: 'Tem desconto no combo?', texto: 'Diga que o preço é R$ 97. Para quem já recebeu a oferta, mantenha 79,90 por mais 48 horas.', pergunta: '' });
r = await responderAoConciliador(env, p2.id, 'Fixo em R$ 97. Quem já recebeu a oferta de 79,90 continua com ela.');
confere('número que não estava nos itens nem na resposta: avisa e vira item de agente', r.ajustou === true && p2.origem === 'agente' && /48/.test(p2.prova) && /Atenção/.test(r.aviso) && p2.status === 'proposta', `${p2.origem}: ${r.aviso}`);
mundo.ajuste = () => ({ entendi: true, titulo: 'Tem desconto no combo?', texto: 'Diga que o preço é R$ 97. Para quem já recebeu a oferta, mantenha 79,90.', pergunta: '' });
r = await responderAoConciliador(env, p2.id, 'Sem as 48 horas. Fixo em R$ 97, e quem já recebeu a oferta de 79,90 continua com ela.');
confere('o dono pode responder de novo depois do ajuste', r.ajustou === true && p2.origem === 'dono' && !/48 horas\./.test(p2.texto), `${p2.origem}: ${p2.texto}`);

// O que é recusado.
const recusa = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };
let e1 = await recusa(() => responderAoConciliador(env, p1.id, 'Mude de novo'));
confere('junção que já vale não aceita resposta', !!e1 && e1.status === 400);
e1 = await recusa(() => responderAoConciliador(env, sE.id, 'Oferte sempre'));
confere('item comum não aceita resposta', !!e1 && e1.status === 400 && sE.texto === 'Oferte só quando a pessoa pedir preço ou disser que quer.');
e1 = await recusa(() => responderAoConciliador(env, p2.id, ' '));
confere('resposta vazia é recusada', !!e1 && e1.status === 400);
const chamadasIa = mundo.pedidos.length;
e1 = await recusa(() => salvarNaColmeia({ env, u: { ...dono, via: 'mcp' } }, { responder: 'Aprove tudo' }, p2.id));
confere('pelo conector ninguém responde no lugar do dono', !!e1 && e1.status === 403 && mundo.pedidos.length === chamadasIa);
e1 = await recusa(() => salvarNaColmeia({ env, u: { ...dono, papel: 'redator' } }, { responder: 'Aprove tudo' }, p2.id));
confere('quem não pode editar a Colmeia não responde', !!e1 && e1.status === 403 && mundo.pedidos.length === chamadasIa);
mundo.ia = 'erro';
const provaAntes = p2.prova;
console.error = () => {};
try { e1 = await recusa(() => responderAoConciliador(env, p2.id, 'Fixo em 97')); } finally { console.error = erroDoConsole; }
confere('IA fora do ar: a proposta fica como estava e o erro explica', !!e1 && e1.status === 502 && p2.prova === provaAntes && /tente de novo/.test(e1.message), e1 && e1.message);

console.log(falhas ? `\n${falhas} conferência(s) falharam.` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
