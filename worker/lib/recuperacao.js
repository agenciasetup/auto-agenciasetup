// Recuperar vendas (pedido do dono em 30/10/2026): quem chegou no checkout e não comprou. Guarda o contato assim que a
// pessoa preenche o e-mail, manda dois lembretes por e-mail e monta a lista da tela Recuperar vendas, com o motivo em uma
// frase e as mensagens prontas para o WhatsApp. A mensagem sai com um clique de quem atende, nunca sozinha: disparo
// automático no WhatsApp tem custo e pode bloquear o número. O link leva direto à oferta, com os dados já preenchidos.
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { emailValido, normalEmail } from './alunos.js';
import { emailRecuperacao, emailRecuperacaoEn, enviarEmail } from './emails.js';
import { marcaDaOferta } from './marcas.js';
import { numeroWhatsapp } from './acoes-suporte.js';
import { canalDe } from './origem.js';
import { celularDeFora } from './vendas.js';

const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const soDigitos = (v) => String(v || '').replace(/\D/g, '');
const primeiro = (nome) => { const p = String(nome || '').trim().split(/\s+/)[0] || ''; return p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : ''; };

// ---------------------------------------------------------------- guardar o contato
// Chamado pelo checkout quando a pessoa sai de um campo ou da página. Só com e-mail válido; nunca guarda CPF.
export async function guardarContato(env, dados, visitante, ip) {
  const email = normalEmail(dados.email);
  if (!emailValido(email)) return;
  if (!(await db.rpc(env, 'bater_limite', { p_chave: `contato:${ip || 'sem-ip'}`, p_janela_s: 600, p_max: 40 }).catch(() => false))) return;
  const oferta = await db.um(env, 'ofertas', { slug: `eq.${String(dados.oferta || '').slice(0, 80)}` }, 'id,moeda,preco_centavos');
  if (!oferta) return;
  const linha = { email, oferta_id: oferta.id, moeda: oferta.moeda || 'brl', valor_centavos: oferta.preco_centavos || 0, visto_em: new Date().toISOString() };
  const nome = String(dados.nome || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  if (nome) linha.nome = nome;
  const cel = dados.estrangeiro === true ? celularDeFora(dados.ddi, dados.celular) : soDigitos(dados.celular);
  if (cel && (cel.startsWith('+') || (cel.length >= 10 && cel.length <= 11))) linha.celular = cel;
  if (visitante) {
    linha.visitante = visitante;
    const [t] = await db.select(env, 'toques', { filtros: { visitante: `eq.${visitante}` }, select: 'quando,origem,meio,campanha,conteudo,termo,link,clid,pagina', ordem: 'quando.desc', limite: 1 }).catch(() => []);
    if (t) linha.ultimo_toque = t;
  }
  await db.insert(env, 'recuperacoes', linha, { upsert: true, conflito: 'email,oferta_id', select: 'id' });
}

// O pedido nasceu: a linha passa a apontar para ele, com o valor de verdade. Nunca derruba a venda.
export async function pedidoCriado(env, { email, nome, celular, oferta, total, pedido, visitante, toque }) {
  await db.insert(env, 'recuperacoes', {
    email, oferta_id: oferta.id, moeda: oferta.moeda || 'brl', valor_centavos: total, pedido_id: pedido, visto_em: new Date().toISOString(),
    ...(nome ? { nome } : {}), ...(celular ? { celular } : {}), ...(visitante ? { visitante } : {}), ...(toque ? { ultimo_toque: toque } : {}),
  }, { upsert: true, conflito: 'email,oferta_id', select: 'id' });
}

// O pagamento entrou: sai da lista. Só conta como recuperado quem foi chamado ou recebeu o lembrete antes de pagar.
export async function pedidoPago(env, pedidoId) {
  const p = await db.um(env, 'pedidos', { id: `eq.${pedidoId}` }, 'oferta_id,total_centavos,pago_em,ultimo_toque,aluno:alunos!pedidos_aluno_id_fkey(email)');
  if (!p || !p.oferta_id || !p.aluno) return;
  const r = await db.um(env, 'recuperacoes', { email: `eq.${p.aluno.email}`, oferta_id: `eq.${p.oferta_id}` }, 'id,situacao,chamado_em,lembretes');
  if (!r || r.situacao === 'comprou') return;
  const veio = r.chamado_em || r.lembretes > 0 || (p.ultimo_toque || {}).origem === 'recuperacao';
  await db.update(env, 'recuperacoes', { id: `eq.${r.id}` }, { situacao: 'comprou', comprou_em: p.pago_em || new Date().toISOString(), recuperado_centavos: veio ? p.total_centavos : 0 }, 'id');
}

// O link abre a oferta e o checkout preenche nome, e-mail e celular (o id fica depois do #: não vai para o servidor nem
// para o Pixel, e o script do início da página tira do endereço). As marcas mostram em Vendas o que a recuperação trouxe.
function linkDe(site, r, meio) {
  const slug = r.oferta.slug;
  return `${site}/checkout/${slug}?utm_source=recuperacao&utm_medium=${meio}&utm_campaign=${encodeURIComponent(slug)}#r=${r.id}`;
}

async function siteDaOferta(env, oferta, guardados = new Map()) {
  if (guardados.has(oferta.id)) return guardados.get(oferta.id);
  const marca = await marcaDaOferta(env, oferta).catch(() => null);
  const v = { site: marca ? marca.url : env.SITE_URL || 'https://agenciasetup.com.br', marca };
  guardados.set(oferta.id, v);
  return v;
}

// O que o checkout pede para preencher. O id é o segredo, e só quem recebeu o link tem. Nunca devolve CPF.
export async function dadosParaRetomar(env, id) {
  if (!UUID.test(String(id))) throw new Erro(404, 'Não encontrado.');
  const r = await db.um(env, 'recuperacoes', { id: `eq.${id}` }, 'email,nome,celular');
  if (!r) throw new Erro(404, 'Não encontrado.');
  return { email: r.email, nome: r.nome || '', celular: r.celular && !r.celular.startsWith('+') ? r.celular : '' };
}

export async function pararLembretes(env, id) {
  if (!UUID.test(String(id))) return null;
  const r = await db.um(env, 'recuperacoes', { id: `eq.${id}` }, 'id,situacao,moeda');
  if (!r) return null;
  if (r.situacao !== 'comprou') await db.update(env, 'recuperacoes', { id: `eq.${r.id}` }, { situacao: 'nao_quer' }, 'id');
  return r;
}

export async function moedaDaLinha(env, id) {
  if (!UUID.test(String(id))) return 'brl';
  const r = await db.um(env, 'recuperacoes', { id: `eq.${id}` }, 'moeda').catch(() => null);
  return (r && r.moeda) || 'brl';
}

// ---------------------------------------------------------------- o motivo
// Em uma frase, a partir do pedido. Sem pedido: preencheu o formulário e saiu antes de clicar em comprar.
export function motivoDe(pedido) {
  if (!pedido) return { id: 'saiu', t: 'Saiu antes de clicar em comprar' };
  if (pedido.status === 'recusado') return { id: 'cartao', t: 'O cartão não passou' };
  if (pedido.metodo === 'cartao') return { id: 'cartao_aberto', t: 'Abriu o pagamento no cartão e não terminou' };
  if (pedido.status === 'expirado') return { id: 'pix', t: 'O Pix venceu sem pagamento' };
  return { id: 'pix', t: 'Gerou o Pix e não pagou' };
}

// ---------------------------------------------------------------- e-mails (relógio)
// Quem paga, paga rápido: 90% em até 3 minutos (medido em 30/10/2026). Por isso o primeiro sai em 15 minutos e o segundo
// no dia seguinte. Até 2 por rodada, porque o plano grátis tem 50 chamadas por execução e o relógio passa a cada 10 minutos.
const CAMPOS_LINHA = 'id,email,nome,celular,moeda,valor_centavos,pedido_id,lembretes,visto_em,oferta:ofertas(id,nome,slug,produto_id,ativa,garantia_dias),pedido:pedidos(status,metodo)';
export async function enviarLembretes(env, agora = Date.now()) {
  let n = 0;
  for (const [vez, de, ate] of [[1, 15 * MIN, 6 * HORA], [2, DIA, 3 * DIA]]) {
    if (n >= 2) break;
    const linhas = await db.select(env, 'recuperacoes', {
      filtros: { situacao: 'eq.nova', lembretes: `lt.${vez}`, visto_em: `lte.${new Date(agora - de).toISOString()}`, and: `(visto_em.gte.${new Date(agora - ate).toISOString()})` },
      select: CAMPOS_LINHA, ordem: 'visto_em.desc', limite: 2,
    });
    for (const r of linhas) {
      if (n >= 2) break;
      if (!r.oferta || !r.oferta.ativa) continue;
      // Já comprou essa oferta: sai da lista, sem e-mail.
      const a = await db.um(env, 'alunos', { email: `eq.${r.email}` }, 'id');
      const pago = a ? await db.um(env, 'pedidos', { aluno_id: `eq.${a.id}`, oferta_id: `eq.${r.oferta.id}`, status: 'eq.pago' }, 'pago_em') : null;
      if (pago) { await db.update(env, 'recuperacoes', { id: `eq.${r.id}` }, { situacao: 'comprou', comprou_em: pago.pago_em }, 'id'); continue; }
      // O lembrete antigo (o de antes desta tabela) já saiu para este pedido.
      const ja = r.pedido_id ? await db.um(env, 'emails', { ref: `eq.recuperacao:${r.pedido_id}:${vez}` }, 'id') : null;
      if (!ja) {
        const { site, marca } = await siteDaOferta(env, r.oferta);
        const en = r.moeda === 'usd';
        const dados = { nome: r.nome, produto: r.oferta.nome, link: linkDe(site, r, 'email'), parar: `${site}/api/checkout/parar/${r.id}`, motivo: motivoDe(r.pedido).id, vez, garantia: r.oferta.garantia_dias, marca };
        const m = en ? emailRecuperacaoEn(dados) : emailRecuperacao(dados);
        await enviarEmail(env, { para: r.email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: en ? 'recuperacao_en' : 'recuperacao', ref: `recuperacao:r:${r.id}:${vez}`, ...(marca ? { de: `${marca.nome} <cursos@envio.agenciasetup.com.br>` } : {}) });
        n++;
      }
      await db.update(env, 'recuperacoes', { id: `eq.${r.id}` }, { lembretes: vez, lembrete_em: new Date(agora).toISOString() }, 'id');
    }
  }
  return n;
}

// ---------------------------------------------------------------- a lista
// As mensagens prontas: curtas, com o primeiro nome, quem fala e o link. A primeira resolve; a segunda pergunta o motivo,
// que é o que mais ensina sobre a oferta.
function mensagens(r, motivo, quem, marca, link) {
  const n = primeiro(r.nome);
  const produto = r.oferta.nome;
  if (r.moeda === 'usd') {
    const eu = `${quem ? `${quem} here, from` : 'This is'} ${marca ? marca.nome : 'Setup Agency'}.`;
    return [
      { id: 'pagar', t: 'Help finish', texto: `Hi${n ? ` ${n}` : ''}! ${eu} I saw you started buying ${produto} and didn't finish. This link opens with your details filled in: ${link}` },
      { id: 'motivo', t: 'Ask why', texto: `Hi${n ? ` ${n}` : ''}! ${eu} Quick question: what stopped you from finishing ${produto}? Price, a doubt about the content or an error? Tell me and I'll help.` },
    ];
  }
  const eu = `${quem ? `${quem} aqui, da` : 'Aqui é da'} ${marca ? marca.nome : 'Agência Setup'}.`;
  const abre = `Oi${n ? `, ${n}` : ''}! ${eu}`;
  const pagar = {
    saiu: `Vi que você começou a compra do ${produto} e não terminou. Esse link abre com seus dados preenchidos, se quiser continuar: ${link}`,
    pix: `Vi que o Pix do ${produto} não foi pago. Acontece, ele vence rápido. Esse link gera um novo na hora: ${link}`,
    cartao: `Vi que o cartão não passou na compra do ${produto}. Acontece bastante. Dá para tentar outro cartão ou pagar no Pix, que aprova na hora: ${link}`,
    cartao_aberto: `Vi que o pagamento do ${produto} não terminou. Se o cartão deu problema, no Pix aprova na hora: ${link}`,
  }[motivo.id];
  return [
    { id: 'pagar', t: 'Ajudar a pagar', texto: `${abre} ${pagar}` },
    { id: 'motivo', t: 'Perguntar o motivo', texto: `${abre} Posso te fazer uma pergunta rápida? O que te fez parar na compra do ${produto}: preço, dúvida sobre o conteúdo ou deu algum erro? Me conta que eu te ajudo.` },
  ];
}

// Quem pagou a oferta pelos últimos 90 dias: a linha pode ter nascido depois da compra (a pessoa voltou ao checkout).
async function pagantes(env, ofertas, agora) {
  if (!ofertas.length) return new Set();
  const l = await db.select(env, 'pedidos', { filtros: { status: 'eq.pago', oferta_id: `in.(${ofertas.join(',')})`, pago_em: `gte.${new Date(agora - 90 * DIA).toISOString()}` }, select: 'oferta_id,aluno:alunos!pedidos_aluno_id_fkey(email)', limite: 1000 });
  return new Set(l.map((p) => `${p.aluno && p.aluno.email}|${p.oferta_id}`));
}

const CAMPOS_LISTA = 'id,email,nome,celular,moeda,valor_centavos,ultimo_toque,situacao,lembretes,lembrete_em,chamado_em,contatos,nota,comprou_em,recuperado_centavos,visto_em,oferta:ofertas(id,nome,slug,produto_id,ativa),pedido:pedidos(status,metodo,numero),quem:equipe(nome)';

// A lista de uma aba, os números de todas e as mensagens de quem aparece. veValor: Suporte vê quem chamar, sem o dinheiro.
export async function listaRecuperacao(env, { aba = 'nova', busca = '', limite = 50, quem = '', veValor = false, agora = Date.now() } = {}) {
  const desde = new Date(agora - 60 * DIA).toISOString();
  const todas = await db.select(env, 'recuperacoes', { filtros: { visto_em: `gte.${desde}` }, select: CAMPOS_LISTA, ordem: 'visto_em.desc', limite: 1000 });
  // Dá 10 minutos antes de entrar na lista: quem está pagando agora não é para ser chamado.
  const maduras = todas.filter((r) => r.oferta && (r.situacao !== 'nova' || agora - Date.parse(r.visto_em) >= 10 * MIN));
  const jaPagou = await pagantes(env, [...new Set(maduras.filter((r) => ['nova', 'chamei'].includes(r.situacao)).map((r) => r.oferta.id))], agora);
  for (const r of maduras) if (['nova', 'chamei'].includes(r.situacao) && jaPagou.has(`${r.email}|${r.oferta.id}`)) r.situacao = 'comprou';
  // Compra sem nenhum contato nosso não é recuperação: na aba "Comprou" só entra quem foi chamado ou recebeu lembrete.
  const dela = (r, s) => (s === 'nova' ? r.situacao === 'nova' && r.oferta.ativa : s === 'comprou' ? r.situacao === 'comprou' && r.recuperado_centavos > 0 : r.situacao === s);
  const soma = (l, f) => l.reduce((t, r) => t + (f(r) || 0), 0);
  const emReal = (l) => l.filter((r) => r.moeda !== 'usd');
  const emDolar = (l) => l.filter((r) => r.moeda === 'usd');
  const conta = (s) => maduras.filter((r) => dela(r, s));
  const numeros = {
    nova: conta('nova').length, chamei: conta('chamei').length, comprou: conta('comprou').length, nao_quer: conta('nao_quer').length,
    ...(veValor ? {
      a_chamar_centavos: soma(emReal(conta('nova')), (r) => r.valor_centavos), a_chamar_usd_centavos: soma(emDolar(conta('nova')), (r) => r.valor_centavos),
      recuperado_centavos: soma(emReal(conta('comprou')), (r) => r.recuperado_centavos), recuperado_usd_centavos: soma(emDolar(conta('comprou')), (r) => r.recuperado_centavos),
    } : {}),
  };
  const b = String(busca || '').trim().toLowerCase();
  const filtradas = conta(['nova', 'chamei', 'comprou', 'nao_quer'].includes(aba) ? aba : 'nova').filter((r) => !b || String(r.nome || '').toLowerCase().includes(b) || r.email.includes(b));
  const guardados = new Map();
  const itens = [];
  for (const r of filtradas.slice(0, limite)) {
    const { site, marca } = await siteDaOferta(env, r.oferta, guardados);
    const motivo = motivoDe(r.pedido);
    const numero = numeroWhatsapp(r.celular);
    const link = linkDe(site, r, 'whatsapp');
    itens.push({
      id: r.id, nome: r.nome, email: r.email, situacao: r.situacao, moeda: r.moeda, produto: r.oferta.nome, oferta_ligada: r.oferta.ativa, motivo, canal: canalDe(r.ultimo_toque),
      pedido: r.pedido ? r.pedido.numero : null, visto_em: r.visto_em, lembretes: r.lembretes, lembrete_em: r.lembrete_em, chamado_em: r.chamado_em, contatos: r.contatos, quem: r.quem ? r.quem.nome : null, nota: r.nota, comprou_em: r.comprou_em,
      link: linkDe(site, r, 'link'),
      whatsapp: numero ? mensagens(r, motivo, quem, marca, link).map((m) => ({ ...m, link: `https://wa.me/${numero}?text=${encodeURIComponent(m.texto)}` })) : [],
      ...(veValor ? { valor_centavos: r.valor_centavos, recuperado_centavos: r.recuperado_centavos } : {}),
    });
  }
  return { numeros, itens, total: filtradas.length, aba };
}

// Só os números da lista (o Plano usa): quantas pessoas chamar e quanto isso vale, sem montar mensagens.
export async function resumoRecuperacao(env, agora = Date.now()) {
  const r = await listaRecuperacao(env, { aba: 'nova', limite: 0, veValor: true, agora });
  return r.numeros;
}

// situacao: chamei (conta mais um contato), comprou (pagou por fora), nao_quer ou nova (desfaz). nota: anotação de quem atende.
export async function marcarLinha(env, id, { situacao, nota, quem = null } = {}) {
  if (!UUID.test(String(id))) throw new Erro(404, 'Não encontrado.');
  const r = await db.um(env, 'recuperacoes', { id: `eq.${id}` }, 'id,situacao,contatos,valor_centavos');
  if (!r) throw new Erro(404, 'Não encontrado.');
  const mudar = {};
  if (nota !== undefined) mudar.nota = String(nota || '').trim().slice(0, 500) || null;
  if (situacao !== undefined) {
    if (!['nova', 'chamei', 'comprou', 'nao_quer'].includes(situacao)) throw new Erro(400, 'Situação inválida.');
    mudar.situacao = situacao;
    if (situacao === 'chamei') Object.assign(mudar, { chamado_em: new Date().toISOString(), chamado_por: quem, contatos: r.contatos + 1 });
    if (situacao === 'comprou') Object.assign(mudar, { comprou_em: new Date().toISOString(), recuperado_centavos: r.valor_centavos });
    if (situacao === 'nova') Object.assign(mudar, { comprou_em: null, recuperado_centavos: 0 });
  }
  if (!Object.keys(mudar).length) throw new Erro(400, 'Nada para mudar.');
  await db.update(env, 'recuperacoes', { id: `eq.${r.id}` }, mudar, 'id');
  return { ok: true, id: r.id, ...mudar };
}
