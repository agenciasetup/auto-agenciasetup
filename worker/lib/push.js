// Avisos no celular da equipe (pedido do dono em 08/11/2026: "saiu venda, ele notifica"). O painel instalado na tela de
// início do iPhone (/admin/celular, o app "Vendas") recebe Web Push: venda aprovada, pedido feito (Pix gerado ou cartão),
// reembolso (pedido pelo aluno, agendado, feito, contestação) e cartão recusado.
// Sem tabela nova: as chaves do servidor ficam em config.push (a privada cifrada com a CRIPTO_CHAVE, criadas sozinhas na
// primeira vez) e os aparelhos em config.push_inscricoes ({ lista }), poucos por pessoa da equipe.
// Só quem tem vendas.ver (Administrador e Editor) recebe, e a pessoa precisa continuar ativa na equipe.
// Nunca derruba quem chamou: o checkout e o aviso de pagamento seguem mesmo se o push falhar.
import { cifrar, decifrar } from '../nucleo/cripto.js';
import { db } from '../nucleo/db.js';
import { pode } from '../nucleo/permissoes.js';
import { enviarPush, novasChaves } from './webpush.js';

export const TIPOS_AVISO = {
  venda: { t: 'Venda aprovada', sub: 'O pagamento entrou, no Pix ou no cartão.', padrao: true },
  pedido: { t: 'Pedido feito', sub: 'Alguém gerou o Pix ou foi para o pagamento do cartão.', padrao: true },
  reembolso: { t: 'Reembolso e contestação', sub: 'Aluno pediu reembolso, reembolso agendado ou feito, contestação no cartão.', padrao: true },
  recusado: { t: 'Cartão recusado', sub: 'O cartão não passou: bom momento para chamar no WhatsApp.', padrao: true },
  escritorio: { t: 'Escritório de IA', sub: 'O resumo do dia do chefe de gabinete e os alertas do zelador (tarefa que não rodou, erro, gasto perto do teto).', padrao: true },
  direct: { t: 'Dúvida no direct', sub: 'Alguém perguntou no direct algo que só você sabe responder, ou uma resposta ficou pronta para você mandar.', padrao: true },
  fechamento: { t: 'Resumo do fim do dia', sub: 'Às 23h58, quanto o dia fechou, no tom do dia.', padrao: true },
  teste: { t: 'Pedidos de teste', sub: 'Compras simuladas e ofertas de teste também avisam.', padrao: false },
};
export const TIPOS_PADRAO = Object.keys(TIPOS_AVISO).filter((k) => TIPOS_AVISO[k].padrao);
// Tipo novo de aviso chega a quem já tinha os avisos ligados (achado da revisão de 10/11/2026: o Escritório e o
// direct avisavam 0 aparelhos, porque o único aparelho tinha sido ligado antes de esses dois tipos existirem).
// Cada aparelho guarda em "conhece" os tipos que existiam quando a pessoa escolheu pela última vez. Tipo padrão que o
// aparelho ainda não conhece vale como ligado; desligado de propósito continua desligado. Aparelho ligado antes desta
// regra não tem "conhece": vale a lista dos tipos que existiam em 08/11/2026, quando o app Vendas nasceu.
const TIPOS_DE_ANTES = ['venda', 'pedido', 'reembolso', 'recusado', 'fechamento', 'teste'];
export const TODOS_OS_TIPOS = Object.keys(TIPOS_AVISO);
export function querTipo(aparelho, tipo) {
  if (!aparelho || !TIPOS_AVISO[tipo]) return false;
  if ((aparelho.eventos || []).includes(tipo)) return true;
  const conhece = Array.isArray(aparelho.conhece) ? aparelho.conhece : TIPOS_DE_ANTES;
  return TIPOS_AVISO[tipo].padrao && !conhece.includes(tipo);
}
// Os tipos que o aparelho recebe de verdade (o que a tela mostra ligado).
export const tiposDoAparelho = (aparelho) => TODOS_OS_TIPOS.filter((t) => querTipo(aparelho, t));
export const MAX_APARELHOS = 10;

// ---------------------------------------------------------------- chaves do servidor (VAPID)
let chavesCache = null;
export async function chavesPush(env) {
  if (chavesCache) return chavesCache;
  let linha = await db.um(env, 'config', { chave: 'eq.push' });
  if (!linha) {
    const n = await novasChaves();
    // Dois pedidos ao mesmo tempo: o segundo não sobrescreve (ignorar) e os dois leem a mesma linha.
    await db.insert(env, 'config', { chave: 'push', valor: { publica: n.publica, privada: await cifrar(env, n.privada), criado_em: new Date().toISOString() } }, { ignorar: true, conflito: 'chave', select: 'chave' });
    linha = await db.um(env, 'config', { chave: 'eq.push' });
  }
  chavesCache = { publica: linha.valor.publica, privada: await decifrar(env, linha.valor.privada) };
  return chavesCache;
}

// ---------------------------------------------------------------- aparelhos
export async function lerAparelhos(env) {
  const l = await db.um(env, 'config', { chave: 'eq.push_inscricoes' });
  return l && l.valor && Array.isArray(l.valor.lista) ? l.valor.lista : [];
}
export async function gravarAparelhos(env, lista) {
  await db.insert(env, 'config', { chave: 'push_inscricoes', valor: { lista }, atualizado_em: new Date().toISOString() }, { upsert: true, conflito: 'chave', select: 'chave' });
}

const contato = (env) => env.SITE_URL || 'https://agenciasetup.com.br';

// Manda para uma lista de aparelhos e guarda o que mudou: tira quem saiu (404/410) e anota o último erro de cada um.
export async function mandarPara(env, lista, alvo, dados) {
  if (!alvo.length) return [];
  const chaves = await chavesPush(env);
  const res = await Promise.all(alvo.map((i) => enviarPush(i, dados, chaves, contato(env)).catch((e) => ({ ok: false, status: 0, erro: String(e.message || e).slice(0, 160) })).then((r) => ({ i, r }))));
  let mudou = false;
  const saiu = new Set();
  for (const { i, r } of res) {
    if (r.status === 404 || r.status === 410) { saiu.add(i.endpoint); mudou = true; continue; }
    const item = lista.find((x) => x.endpoint === i.endpoint);
    if (!item) continue;
    if (r.ok && (item.ultimo_erro || !item.ultimo_ok || Date.now() - new Date(item.ultimo_ok).getTime() > 86400_000)) { item.ultimo_erro = null; item.ultimo_ok = new Date().toISOString(); mudou = true; }
    if (!r.ok) { item.ultimo_erro = { em: new Date().toISOString(), erro: r.erro }; mudou = true; }
  }
  if (mudou) await gravarAparelhos(env, lista.filter((x) => !saiu.has(x.endpoint))).catch((e) => console.error('push gravar', e.message));
  return res.map(({ i, r }) => ({ id: i.id, ok: r.ok, status: r.status, erro: r.erro, saiu: saiu.has(i.endpoint) }));
}

// Avisa todo mundo da equipe que ligou esse tipo. teste: só quem marcou "Pedidos de teste".
export async function avisarEquipe(env, tipo, msg, { teste = false } = {}) {
  try {
    const lista = await lerAparelhos(env);
    const quer = lista.filter((i) => querTipo(i, tipo) && (!teste || (i.eventos || []).includes('teste')));
    if (!quer.length) return 0;
    const ids = [...new Set(quer.map((i) => i.equipe_id).filter(Boolean))];
    const equipe = ids.length ? await db.select(env, 'equipe', { filtros: { id: `in.(${ids.join(',')})`, ativo: 'is.true' }, select: 'id,papel' }) : [];
    const podem = new Set(equipe.filter((m) => pode(m.papel, 'vendas.ver')).map((m) => m.id));
    const res = await mandarPara(env, lista, quer.filter((i) => podem.has(i.equipe_id)), { ...msg, tipo, em: Date.now() });
    return res.filter((r) => r.ok).length;
  } catch (e) {
    console.error('push', tipo, e && e.message);
    return 0;
  }
}

// ---------------------------------------------------------------- o texto de cada aviso
const valor = (c, moeda) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda === 'usd' ? 'USD' : 'BRL' }).format((Number(c) || 0) / 100);
// "R$ 97" quando não tem centavos, "R$ 39,90" quando tem (o jeito de falar das frases).
export function valorCurto(c, moeda) {
  const n = (Number(c) || 0) / 100;
  const casas = Number.isInteger(n) ? 0 : 2;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda === 'usd' ? 'USD' : 'BRL', minimumFractionDigits: casas, maximumFractionDigits: casas }).format(n);
}
const sortear = (lista, ultimo) => {
  if (lista.length < 2) return 0;
  let i = Math.floor(Math.random() * lista.length);
  if (i === ultimo) i = (i + 1 + Math.floor(Math.random() * (lista.length - 1))) % lista.length;
  return i;
};

// Venda aprovada no jeito do Calango (pedido do dono em 08/11/2026: "engraçado e motivador"). Cada frase: o título e a
// linha do valor. f.na/f.no: "na PIXXXX"/"no Pix" ou "no cartão" (com as parcelas). soReal: gíria de real ("pila", "conto").
const FRASES_VENDA = [
  { f: (v, p) => ['É vendaaaa Calango!', `${v} ${p.na}`] },
  { f: (v, p) => ['Saiu mais umaaaa!', `Foi ${v} ${p.no}`] },
  { f: (v) => ['Ih rapaz, abriu a porteira.', `Mais uma de ${v} pila`], soReal: true },
  { f: (v, p) => ['O pai tá voando!', p.pix ? `PIXXXX de ${v}` : `${v} ${p.no}`] },
  { f: (v) => ['Hoje tá rendendo hein kk', `Soma mais ${v} conto aí`], soReal: true },
  { f: (v, p) => ['É os Calango, guri!', `${v} ${p.no}`] },
  { f: (v, p) => ['Plim! Caiu dinheiro!', `${v} ${p.na}`] },
  { f: (v, p) => ['Calango não para!', `Mais ${v} ${p.no}`] },
  { f: (v) => ['Segura que lá vem mais!', `${v} acabaram de cair`] },
  { f: (v, p) => ['Olha o barulhinho bom!', `${v} ${p.na}`] },
  { f: (v) => ['Mais um pro bando!', `${v} pra conta`] },
  { f: (v, p) => ['Tá chovendo venda!', `${v} ${p.no}`] },
];
let ultimaVenda = -1;
export function fraseDeVenda(centavos, moeda, metodo, parcelas = 1) {
  const lista = FRASES_VENDA.filter((x) => moeda !== 'usd' || !x.soReal);
  const i = sortear(lista, ultimaVenda);
  ultimaVenda = i;
  const pix = metodo === 'pix';
  const cartao = `no cartão${parcelas > 1 ? ` em ${parcelas}x` : ''}`;
  return lista[i].f(valorCurto(centavos, moeda), { pix, na: pix ? 'na PIXXXX' : cartao, no: pix ? 'no Pix' : cartao });
}

// O fim do dia: o tom sai da comparação com a média dos 14 dias antes (zerado, ruim, bem, estourou).
const FRASES_DIA = {
  zerado: [['Tá moscando?', 'Fechamo zerado hoje.'], ['Hoje o bicho não pegou.', 'Zero venda. Amanhã a gente vira o jogo!'], ['Dia de descanso, Calango?', 'Fechamo zerado. Bora postar amanhã!']],
  ruim: [['Ih, hoje foi ruinzinho hein.', 'Chegamos a {v} só.'], ['Dia meio parado...', 'Fechamo com {v}. Amanhã tem mais!'], ['Devagar e sempre, Calango.', 'Hoje deu {v}.']],
  bem: [['Fechamo hoje bem!', 'Com {v}!'], ['Dia bom, Calango!', 'Fechamo com {v} no bolso.'], ['Tá pago o dia!', 'Fechamo com {v}.']],
  estourou: [['RAPAZ ESTOURAMOO!', 'FECHAMO COM {v}.'], ['QUE DIA, CALANGO!', 'Fechamo com {v}!'], ['O BANDO TÁ ON!', 'FECHAMO COM {v}!']],
};
export function faixaDoDia(total, media) {
  if (!total) return 'zerado';
  if (!media || total >= media * 1.5) return 'estourou';
  return total >= media * 0.75 ? 'bem' : 'ruim';
}
// total e media em centavos de real; n: vendas do dia; recorde: melhor dia dos últimos 30; usd: centavos de dólar do dia.
export function textoDoDia({ total, n, media, recorde, usd = 0 }) {
  const faixa = faixaDoDia(total, media);
  const [t, linha] = FRASES_DIA[faixa][Math.floor(Math.random() * FRASES_DIA[faixa].length)];
  const linhas = [linha.replace('{v}', valorCurto(total, 'brl'))];
  if (n) linhas.push(`${n} ${n === 1 ? 'venda' : 'vendas'}${media ? ` · média de ${valorCurto(Math.round(media), 'brl')} por dia` : ''}`);
  if (recorde) linhas.push('É o melhor dia dos últimos 30 dias!');
  if (usd) linhas.push(`E mais ${valorCurto(usd, 'usd')} no curso em inglês.`);
  return { faixa, titulo: recorde && faixa === 'estourou' ? 'RECORDE, CALANGO!' : t, corpo: linhas.join('\n') };
}

// "YYYY-MM-DD" do dia no horário de Brasília.
const diaBR = (ms) => new Date(ms - 3 * 3600_000).toISOString().slice(0, 10);

// Os números de um dia (horário de Brasília) e o texto do resumo.
export async function resumoDoDia(env, dia) {
  const fim = Date.parse(`${dia}T03:00:00Z`) + 86400_000;
  const desde = new Date(fim - 31 * 86400_000).toISOString();
  const pagos = await db.select(env, 'pedidos', { filtros: { status: 'eq.pago', teste: 'is.false', pago_em: `gte.${desde}` }, select: 'total_centavos,moeda,pago_em', limite: 5000 });
  const porDia = {};
  let usd = 0;
  for (const p of pagos) {
    const d = diaBR(Date.parse(p.pago_em));
    if (d > dia) continue;
    if ((p.moeda || 'brl') === 'usd') { if (d === dia) usd += p.total_centavos || 0; continue; }
    porDia[d] = porDia[d] || { c: 0, n: 0 };
    porDia[d].c += p.total_centavos || 0;
    porDia[d].n += 1;
  }
  const hoje = porDia[dia] || { c: 0, n: 0 };
  const antes = (k) => Array.from({ length: k }, (_, i) => diaBR(fim - (i + 2) * 86400_000 + 3 * 3600_000));
  const media = antes(14).reduce((s, d) => s + ((porDia[d] && porDia[d].c) || 0), 0) / 14;
  const melhorAntes = Math.max(0, ...antes(30).map((d) => (porDia[d] && porDia[d].c) || 0));
  const recorde = hoje.c > 0 && hoje.c > melhorAntes;
  return { dia, total: hoje.c, n: hoje.n, media, usd, recorde, ...textoDoDia({ total: hoje.c, n: hoje.n, media, recorde, usd }) };
}

// Relógio de minuto: às 23h58 (horário de Brasília) manda o resumo do dia uma vez só. Se o relógio pulou esse minuto,
// manda até 00h30 o do dia anterior. Fora dessa janela não lê nada do banco.
export async function fecharODia(env, quando = Date.now()) {
  const b = new Date(quando - 3 * 3600_000);
  const min = b.getUTCHours() * 60 + b.getUTCMinutes();
  const dia = min >= 23 * 60 + 58 ? diaBR(quando) : min < 30 ? diaBR(quando - 86400_000) : null;
  if (!dia) return null;
  const marca = await db.um(env, 'config', { chave: 'eq.push_fechamento' });
  if (marca && marca.valor && marca.valor.dia >= dia) return null;
  // Marca antes de mandar: o próximo minuto não manda de novo.
  await db.insert(env, 'config', { chave: 'push_fechamento', valor: { dia, em: new Date().toISOString() } }, { upsert: true, conflito: 'chave', select: 'chave' });
  const r = await resumoDoDia(env, dia);
  const mandados = await avisarEquipe(env, 'fechamento', { titulo: r.titulo, corpo: r.corpo, url: '/admin/celular', tag: `dia-${dia}` });
  return { dia, faixa: r.faixa, total: r.total, mandados };
}
const nomeCurto = (a) => {
  const n = String((a && a.nome) || '').trim().split(/\s+/).filter(Boolean);
  return n.length ? n.slice(0, 2).join(' ') : (a && a.email) || 'Alguém';
};
const diaMes = (iso) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
// Meia-noite de hoje no horário de Brasília (sem horário de verão desde 2019).
function inicioDeHoje() {
  const b = new Date(Date.now() - 3 * 3600_000);
  return new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate(), 3)).toISOString();
}

// "Hoje: 3 vendas · R$ 81,00" (só as pagas de verdade, na moeda do pedido).
async function totalDeHoje(env, moeda) {
  const pagos = await db.select(env, 'pedidos', { filtros: { status: 'eq.pago', teste: 'is.false', moeda: `eq.${moeda}`, pago_em: `gte.${inicioDeHoje()}` }, select: 'total_centavos', limite: 2000 });
  const soma = pagos.reduce((s, p) => s + (p.total_centavos || 0), 0);
  return `Hoje: ${pagos.length} ${pagos.length === 1 ? 'venda' : 'vendas'} · ${valor(soma, moeda)}`;
}

// tipo: venda, pedido, recusado ou reembolso. extra (reembolso): { qual: 'aluno'|'agendado'|'feito'|'contestacao', motivo, devolver_em }.
export async function avisarPedido(env, pedidoId, tipo, extra = {}) {
  try {
    const a = await montarAviso(env, pedidoId, tipo, extra);
    return a ? await avisarEquipe(env, tipo, a.msg, { teste: a.teste }) : 0;
  } catch (e) {
    console.error('push pedido', tipo, e && e.message);
    return 0;
  }
}

// O texto do aviso de um pedido, sem mandar (também para conferir: scripts/conferir-push.mjs --pedido <id>).
export async function montarAviso(env, pedidoId, tipo, extra = {}) {
  const p = await db.um(env, 'pedidos', { id: `eq.${pedidoId}` }, 'id,numero,metodo,parcelas,moeda,total_centavos,itens,teste,ultimo_toque,aluno:alunos!pedidos_aluno_id_fkey(nome,email)');
  if (!p) return null;
  const moeda = p.moeda || 'brl';
  const v = valor(p.total_centavos, moeda);
  const quem = nomeCurto(p.aluno);
  const itens = (p.itens || []).map((i) => i.nome).filter(Boolean).join(' + ') || 'Pedido';
  let titulo, corpo;
  if (tipo === 'venda') {
    // A frase do Calango no título e na primeira linha; quem comprou, o quê e o total do dia embaixo.
    const [t, linha] = fraseDeVenda(p.total_centavos, moeda, p.metodo, p.parcelas);
    titulo = t;
    corpo = `${linha}\n${quem} · ${itens}`;
    if (!p.teste) corpo += `\n${await totalDeHoje(env, moeda).catch(() => '')}`;
  } else if (tipo === 'pedido') {
    titulo = p.metodo === 'pix' ? `Pix gerado: ${v}` : `Pedido no cartão: ${v}`;
    corpo = `${quem} · ${itens}\nAguardando o pagamento.`;
  } else if (tipo === 'recusado') {
    titulo = `Cartão recusado: ${v}`;
    corpo = `${quem} · ${itens}\nToque para ver o pedido e chamar no WhatsApp.`;
  } else if (tipo === 'reembolso') {
    const q = extra.qual;
    titulo = q === 'aluno' ? `Pedido de reembolso: ${v}` : q === 'agendado' ? `Reembolso agendado: ${v}` : q === 'contestacao' ? `Contestação no cartão: ${v}` : `Reembolso feito: ${v}`;
    corpo = `${quem} · ${itens}\n${q === 'aluno' ? `Pediu pelo app${extra.motivo ? `: ${extra.motivo}` : ''}. Sai em ${diaMes(extra.devolver_em)}.`
      : q === 'agendado' ? `Sai em ${diaMes(extra.devolver_em)}.`
      : q === 'contestacao' ? 'O acesso caiu. Responda a contestação no Asaas.'
      : 'O dinheiro voltou e o acesso caiu.'}`;
  } else return null;
  if (p.teste) titulo = `Teste · ${titulo}`;
  return { msg: { titulo, corpo, url: `/admin/celular?pedido=${p.id}`, tag: `pedido-${p.id}` }, teste: !!p.teste };
}

// Depois de responder, quando dá (ctx.waitUntil): quem compra não espera o aviso sair.
export function avisarDepois(ctx, tarefa) {
  if (ctx && typeof ctx.waitUntil === 'function') { ctx.waitUntil(tarefa); return Promise.resolve(); }
  return tarefa;
}
