// Vendas: preço do pedido, checkout, aviso de pagamento, entrega do acesso, reembolso e Pix vencido.
// O preço é sempre calculado aqui (nunca vem do navegador). Ver docs/area-de-membros.md, seção 4.
import { db } from '../nucleo/db.js';
import { auditar, exigir } from '../nucleo/auth.js';
import { Erro } from '../nucleo/util.js';
import { provedor, provedorDoPedido } from '../pagamento/index.js';
import { cursoUrl, emailValido, garantirAluno, linkDeEntrada, normalEmail } from './alunos.js';
import { emailBoasVindas, emailBoasVindasEn, emailEntregaExterna, emailLivro, emailReembolsoEquipe, emailReembolsoPedido, emailReembolsoPedidoEn, enviarEmail } from './emails.js';
import { linkDoPdf, marcaDaOferta, marcaDoPedido } from './marcas.js';
import { comCampanha } from './campanha.js';
import { toquesDoVisitante } from './origem.js';
import { cancelarIndicacao, depoisDoPagamento, entregarPresente, indicadorDe } from './pos-venda.js';
import { emailPresenteEnviado } from './emails.js';
import { avisarSistemas, pessoa } from './plataforma.js';
import { paisPorCodigo } from './paises.js';
import { pedidoCriado, pedidoPago } from './recuperacao.js';
import { avisarDepois, avisarPedido } from './push.js';
import { aceiteDaOferta, hashDoAceite } from './licencas.js';
import { arquivoDe, marcaDoArquivo, telaDoArquivo } from './entrega-arquivo.js';
import { emailArquivoAguarde, emailArquivoPronto } from './emails.js';

const OFERTA = 'id,slug,produto_id,nome,preco_centavos,preco_de_centavos,parcelas_max,juros_mes,pix_desconto_pct,pix_minutos,metodos,garantia_dias,checkout,limite_vendas,valida_ate,ativa,moeda';

// ---------------------------------------------------------------- validação dos dados de quem compra
export function cpfValido(c) {
  const d = String(c || '').replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += +d[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === +d[9] && dv(10) === +d[10];
}
const soDigitos = (s) => String(s || '').replace(/\D/g, '');

// ---------------------------------------------------------------- quem mora fora do Brasil (sem CPF)
// Chave em config "asaas".estrangeiros (Área de membros > Pagamento, só Administrador). Precisa da liberação "Pagadores
// estrangeiros" na conta do Asaas (pedido em análise, protocolo 1921730). Desligada, o checkout é o de sempre.
// No computador, ESTRANGEIROS=1 no .dev.vars liga só na memória, para testar sem tocar no banco.
export async function estrangeirosLigado(env) {
  if (env.AMBIENTE === 'local' && env.ESTRANGEIROS === '1') return true;
  if (typeof env.__estrangeiros === 'boolean') return env.__estrangeiros;
  const c = await db.um(env, 'config', { chave: 'eq.asaas' }, 'valor').catch(() => null);
  return !!(c && c.valor && c.valor.estrangeiros === true);
}

// Celular de quem mora fora: guardado com "+" e o código do país (ex.: +351912345678). O do Brasil continua só com
// números e DDD (10 ou 11 dígitos), como sempre. O "+" é o que diferencia os dois no resto do sistema.
// Número escrito com "+" já traz o código do país; sem "+", o código vem do campo ao lado.
export function celularDeFora(ddi, numero) {
  const cru = String(numero || '').trim();
  const tudo = cru.startsWith('+') ? soDigitos(cru) : `${soDigitos(ddi)}${soDigitos(cru).replace(/^0+/, '')}`;
  if (!cru.startsWith('+') && (!soDigitos(ddi) || soDigitos(ddi).length > 4)) return null;
  if (tudo.length < 8 || tudo.length > 15) return null;
  return `+${tudo}`;
}

// ---------------------------------------------------------------- preço
export function parcelaCentavos(base, n, juros) {
  if (n <= 1 || !juros) return Math.ceil(base / Math.max(1, n));
  const j = Number(juros);
  return Math.ceil((base * j) / (1 - Math.pow(1 + j, -n)));
}

// O Asaas não aceita parcela menor que R$ 5: o número de parcelas cai até a parcela caber.
export const PARCELA_MIN = 500;
export function parcelasPossiveis(base, oferta) {
  let n = Math.max(1, Number(oferta.parcelas_max) || 1);
  while (n > 1 && parcelaCentavos(base, n, oferta.juros_mes) < PARCELA_MIN) n--;
  return n;
}

// Oferta + bumps + cupom + forma de pagamento -> valores em centavos.
export function precificar({ oferta, bumps = [], cupom = null, metodo = 'pix', parcelas = 1, extra = 0 }) {
  const itens = [{ oferta_id: oferta.id, produto_id: oferta.produto_id, nome: oferta.nome, centavos: oferta.preco_centavos, bump: false },
    ...bumps.map((b) => ({ oferta_id: b.id, produto_id: b.produto_id, nome: b.nome, centavos: b.preco_centavos, bump: true }))];
  const subtotal = itens.reduce((s, i) => s + i.centavos, 0);
  let desconto = 0;
  if (cupom) desconto += cupom.tipo === 'pct' ? Math.round((subtotal * Number(cupom.valor)) / 100) : Math.round(Number(cupom.valor) * 100);
  if (extra > 0) desconto += Math.round(extra);
  desconto = Math.min(desconto, subtotal - 100);
  let base = subtotal - desconto;
  if (metodo === 'pix' && Number(oferta.pix_desconto_pct) > 0) {
    const d = Math.round((base * Number(oferta.pix_desconto_pct)) / 100);
    desconto += d;
    base -= d;
  }
  const n = metodo === 'cartao' ? Math.max(1, Math.min(Number(parcelas) || 1, parcelasPossiveis(base, oferta))) : 1;
  const parcela = parcelaCentavos(base, n, metodo === 'cartao' && n > 1 ? oferta.juros_mes : 0);
  const total = n > 1 ? parcela * n : base;
  return { itens, subtotal, desconto, juros: total - base, total, parcelas: n, parcela };
}

// Oferta vendendo: ligada e no prazo. No computador, OFERTAS_LIGADAS no .dev.vars (slugs separados por vírgula) liga a
// oferta só na memória, para ver a etiqueta das aulas e o bump sem tocar no banco. Em produção esse nome não existe.
export function ofertaLigada(env, o) {
  if (!o) return false;
  if (o.ativa && (!o.valida_ate || new Date(o.valida_ate) > new Date())) return true;
  return env.AMBIENTE === 'local' && String(env.OFERTAS_LIGADAS || '').split(',').map((v) => v.trim()).includes(o.slug);
}

// Bump de complemento: um curso que também se vende sozinho (ex.: "Vídeos com Claude") entra no checkout de outra
// oferta pelo checkout.bump_em dele ([{ oferta: "posts-automaticos", titulo, texto }]), e só com a oferta dele ligada.
// Fica na oferta do complemento, e não em ofertas_bumps, para que nada apareça antes de ele ser ligado.
async function bumpsDeComplemento(env, slug) {
  const ofs = await db.select(env, 'ofertas', { filtros: { 'checkout->bump_em': 'not.is.null' }, select: 'id,slug,nome,produto_id,preco_centavos,preco_de_centavos,ativa,valida_ate,checkout', ordem: 'criado_em.asc', limite: 20 });
  return ofs.filter((b) => b.slug !== slug && ofertaLigada(env, b)).map((b) => {
    const em = (Array.isArray(b.checkout.bump_em) ? b.checkout.bump_em : []).find((x) => x && x.oferta === slug);
    return em ? { id: b.id, slug: b.slug, nome: b.nome, produto_id: b.produto_id, preco_centavos: b.preco_centavos, preco_de_centavos: b.preco_de_centavos,
      titulo: em.titulo || `Leve junto: ${b.nome}`, texto: em.texto || null, cor: (b.checkout.poster || {}).cor || null } : null;
  }).filter(Boolean);
}

export async function lerOferta(env, slug, { local = false } = {}) {
  const o = comCampanha(await db.um(env, 'ofertas', { slug: `eq.${slug}` }, OFERTA));
  if (!o) return null;
  const aberta = o.ativa && (!o.valida_ate || new Date(o.valida_ate) > new Date());
  // No computador dá para testar uma oferta ainda desligada (o pedido nasce marcado como teste).
  if (!aberta && !local) return { ...o, fechada: true };
  const [bumps, complementos, produto] = await Promise.all([
    db.select(env, 'ofertas_bumps', { filtros: { oferta_id: `eq.${o.id}` }, select: 'titulo,texto,ordem,bump:ofertas!ofertas_bumps_bump_id_fkey(id,slug,nome,produto_id,preco_centavos,preco_de_centavos)', ordem: 'ordem.asc' }),
    bumpsDeComplemento(env, o.slug),
    db.um(env, 'produtos', { id: `eq.${o.produto_id}` }, 'id,slug,nome,chamada,descricao,imagem_url'),
  ]);
  const daTabela = bumps.map((b) => ({ ...b.bump, titulo: b.titulo, texto: b.texto }));
  return { ...o, fechada: false, teste: !aberta, produto, bumps: [...daTabela, ...complementos.filter((c) => !daTabela.some((b) => b.id === c.id))] };
}

async function lerCupom(env, codigo, oferta, email = null) {
  if (!codigo) return null;
  const c = await db.um(env, 'cupons', { codigo: `eq.${String(codigo).trim().toUpperCase()}` });
  const ok = c && c.ativo && (!c.valido_ate || new Date(c.valido_ate) > new Date()) && (c.limite == null || c.usos < c.limite) && (!c.ofertas || !c.ofertas.length || c.ofertas.includes(oferta.id));
  if (!ok) throw new Erro(400, 'Esse cupom não vale para esta oferta ou já acabou.', { campo: 'cupom' });
  // "Só na primeira compra": quem já tem pedido pago não usa.
  if (c.primeira_compra && email) {
    const a = await db.um(env, 'alunos', { email: `eq.${email}` }, 'id');
    const pago = a ? await db.um(env, 'pedidos', { aluno_id: `eq.${a.id}`, status: 'eq.pago' }, 'id') : null;
    if (pago) throw new Erro(400, 'Esse cupom é só para a primeira compra.', { campo: 'cupom' });
  }
  return c;
}

// Upgrade: quem já tem o produto anterior (oferta.checkout.upgrade.de_produto_id) paga só a diferença.
async function descontoUpgrade(env, oferta, email) {
  const u = (oferta.checkout || {}).upgrade;
  if (!u || !u.de_produto_id || !u.desconto_centavos || !email) return 0;
  const a = await db.um(env, 'alunos', { email: `eq.${email}` }, 'id');
  if (!a) return 0;
  const cursos = await db.select(env, 'produto_acessos', { filtros: { produto_id: `eq.${u.de_produto_id}` }, select: 'curso_id' });
  if (!cursos.length) return 0;
  const tem = await db.um(env, 'matriculas', { aluno_id: `eq.${a.id}`, status: 'eq.ativa', curso_id: `in.(${cursos.map((c) => c.curso_id).join(',')})` }, 'id');
  return tem ? Number(u.desconto_centavos) || 0 : 0;
}

// O preço que o checkout mostra antes de pagar (cupom, upgrade, Pix ou parcelas). Não cria nada.
export async function cotar(env, dados, ip) {
  if (!(await db.rpc(env, 'bater_limite', { p_chave: `cotar:${ip || 'sem-ip'}`, p_janela_s: 600, p_max: 60 }))) throw new Erro(429, 'Muitas consultas. Espere um pouco.');
  const oferta = await lerOferta(env, String(dados.oferta || ''), { local: env.AMBIENTE === 'local' });
  if (!oferta || oferta.fechada) throw new Erro(404, 'Esta oferta não está disponível agora.');
  const email = emailValido(normalEmail(dados.email)) ? normalEmail(dados.email) : null;
  // Quem mora fora paga no cartão, à vista (regra do Asaas para pagador estrangeiro). Em dólar (Stripe), também.
  const deFora = dados.estrangeiro === true || oferta.moeda === 'usd';
  const metodo = deFora || dados.metodo === 'cartao' ? 'cartao' : 'pix';
  const bumps = oferta.bumps.filter((b) => Array.isArray(dados.bumps) && dados.bumps.includes(b.id));
  let cupom = null, erroCupom = null;
  try { cupom = await lerCupom(env, dados.cupom, oferta, email); } catch (e) { erroCupom = oferta.moeda === 'usd' ? 'This coupon is not valid for this offer or has run out.' : e.message; }
  const extra = await descontoUpgrade(env, oferta, email);
  const preco = precificar({ oferta, bumps, cupom, metodo, parcelas: deFora ? 1 : dados.parcelas, extra });
  return { ...preco, moeda: oferta.moeda || 'brl', cupom: cupom ? { codigo: cupom.codigo, tipo: cupom.tipo, valor: Number(cupom.valor) } : null, erro_cupom: dados.cupom ? erroCupom : null, upgrade_centavos: extra };
}

// ---------------------------------------------------------------- checkout em dólar (curso em inglês, pelo Stripe)
// Sem CPF nem celular: nome e e-mail, e a pessoa paga na página do Stripe (cartão, Apple Pay, Google Pay), à vista.
// O resto é o mesmo caminho da venda em real: preço calculado aqui, pedido, aviso, entrega do acesso. Mensagens em inglês.
async function criarPedidoDolar(env, { dados, visitante, ip, ctx }) {
  const local = env.AMBIENTE === 'local';
  const email = normalEmail(dados.email);
  const nome = String(dados.nome || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  if (!emailValido(email)) throw new Erro(400, 'Please check your email: your access is sent there.', { campo: 'email' });
  if (nome.split(' ').length < 2) throw new Erro(400, 'Please enter your full name.', { campo: 'nome' });
  const okIp = await db.rpc(env, 'bater_limite', { p_chave: `ck:${ip || 'sem-ip'}`, p_janela_s: 600, p_max: 15 });
  const okEmail = await db.rpc(env, 'bater_limite', { p_chave: `ck:${email}`, p_janela_s: 600, p_max: 8 });
  if (!okIp || !okEmail) throw new Erro(429, 'Too many attempts in a row. Please wait a few minutes and try again.');

  const oferta = await lerOferta(env, String(dados.oferta || ''), { local });
  if (!oferta || oferta.fechada) throw new Erro(404, 'This offer is not available right now.');
  // A caixa de aceite da licença só existe no checkout em real: oferta em dólar com aceite não vende.
  if (aceiteDaOferta(oferta)) throw new Erro(404, 'This offer is not available right now.');
  const bumps = oferta.bumps.filter((b) => Array.isArray(dados.bumps) && dados.bumps.includes(b.id));
  let cupom;
  try { cupom = await lerCupom(env, dados.cupom, oferta, email); } catch { throw new Erro(400, 'This coupon is not valid for this offer or has run out.', { campo: 'cupom' }); }
  const extra = await descontoUpgrade(env, oferta, email);
  const preco = precificar({ oferta, bumps, cupom, metodo: 'cartao', parcelas: 1, extra });
  const indicador = await indicadorDe(env, dados.indicado, email);

  const pag = provedor(env, 'usd');
  const aluno = await garantirAluno(env, { email, nome, celular: null });
  if (!aluno.idioma || aluno.idioma === 'pt') {
    // Quem nunca comprou em real passa a receber os e-mails em inglês.
    const pagouEmReal = await db.um(env, 'pedidos', { aluno_id: `eq.${aluno.id}`, status: 'eq.pago', moeda: 'eq.brl' }, 'id');
    if (!pagouEmReal) await db.update(env, 'alunos', { id: `eq.${aluno.id}` }, { idioma: 'en' }, 'id').catch(() => {});
  }
  const origem = await toquesDoVisitante(env, visitante);
  const [pedido] = await db.insert(env, 'pedidos', {
    aluno_id: aluno.id, oferta_id: oferta.id, itens: preco.itens, cupom: cupom ? cupom.codigo : null,
    subtotal_centavos: preco.subtotal, desconto_centavos: preco.desconto, juros_centavos: 0, total_centavos: preco.total,
    metodo: 'cartao', parcelas: 1, status: 'aberto', provedor: pag.nome, teste: !!oferta.teste || pag.nome === 'simulado', moeda: 'usd',
    visitante, primeiro_toque: origem.primeiro, ultimo_toque: origem.ultimo, toques: origem.lista,
    indicado_por: indicador, vagas: 1, pagador: { estrangeiro: true, moeda: 'usd' },
  }, { select: 'id,numero' });
  if (indicador) await db.insert(env, 'indicacoes', { indicador_id: indicador, pedido_id: pedido.id }, { ignorar: true, conflito: 'pedido_id', select: 'id' }).catch(() => {});
  if (!oferta.teste && pag.nome !== 'simulado') await pedidoCriado(env, { email, nome, celular: null, oferta, total: preco.total, pedido: pedido.id, visitante, toque: origem.ultimo }).catch((e) => console.error('recuperacao', e.message));

  const marca = await marcaDaOferta(env, oferta);
  const site = marca ? marca.url : env.SITE_URL || 'https://agenciasetup.com.br';
  let cob;
  try {
    cob = await pag.criarCobranca(env, {
      metodo: 'cartao', centavos: preco.total, parcelas: 1, parcelaCentavos: preco.total, moeda: 'usd', idioma: 'en', email, numero: pedido.numero,
      itens: preco.itens.map((i) => ({ nome: i.nome, centavos: i.centavos })),
      descricao: `${preco.itens.map((i) => i.nome).join(' + ')} (order ${pedido.numero})`, ref: pedido.id,
      voltar: `${site}/checkout/obrigado?pedido=${pedido.id}`, desistir: `${site}/checkout/${oferta.slug}`,
    });
  } catch (e) {
    await db.update(env, 'pedidos', { id: `eq.${pedido.id}` }, { status: 'recusado' }, 'id').catch(() => {});
    throw e;
  }
  await db.update(env, 'pedidos', { id: `eq.${pedido.id}` }, { status: 'aguardando', cobranca_id: cob.id, link_pagamento: cob.link }, 'id');
  await avisarDepois(ctx, avisarPedido(env, pedido.id, 'pedido'));
  return { pedido: pedido.id, numero: pedido.numero, metodo: 'cartao', moeda: 'usd', total_centavos: preco.total, parcelas: 1, parcela_centavos: preco.total, pix: null, pagar_em: cob.link, simulado: pag.nome === 'simulado' };
}

// Stripe: a volta da página de pagamento pode chegar antes do aviso. O obrigado pergunta a situação; se a sessão já está
// paga, o pagamento entra pelo mesmo caminho do aviso (um aviso com id próprio; o segundo aviso, o do webhook, vira
// "ignorado" porque o pedido já está pago). No máximo 30 consultas ao Stripe a cada 10 minutos por pedido.
async function conferirVoltaStripe(env, p) {
  if (p.provedor !== 'stripe' || !['aberto', 'aguardando'].includes(p.status) || !p.cobranca_id) return false;
  if (!(await db.rpc(env, 'bater_limite', { p_chave: `volta:${p.id}`, p_janela_s: 600, p_max: 30 }).catch(() => false))) return false;
  const c = await provedorDoPedido(env, p).lerCobranca(env, p.cobranca_id).catch(() => null);
  if (!c || c.status !== 'RECEIVED') return false;
  const evento = { id: `stripe-volta-${p.cobranca_id}`, event: 'PAYMENT_CONFIRMED', payment: { id: p.cobranca_id, externalReference: `setup:${p.id}` }, stripe: { tipo: 'volta' } };
  if (await guardarAviso(env, evento, 'stripe')) await processarAviso(env, evento.id);
  return true;
}

// ---------------------------------------------------------------- checkout
// ctx (opcional): o aviso "Pedido feito" no celular da equipe sai depois da resposta, sem atrasar o Pix de quem compra.
// ---------------------------------------------------------------- aceite da licença (produto para baixar)
// A oferta com checkout.aceite (a Família Calango, 11/11/2026) só vende com a caixa marcada, na versão que a página
// mostrou. A tela já não deixa seguir sem ela; esta é a trava de verdade (pedido mandado direto para a API).
// Antes de criar qualquer coisa, confere também que a tabela da prova responde: sem onde gravar, não vende.
async function conferirAceite(env, oferta, dados) {
  const a = aceiteDaOferta(oferta);
  if (!a) return null;
  if (a.invalida) throw new Erro(503, 'Esta oferta está sem o texto da licença. Fale com a gente antes de comprar.');
  const d = dados.aceite && typeof dados.aceite === 'object' ? dados.aceite : {};
  if (d.marcado !== true) throw new Erro(400, 'Para comprar, marque que leu e aceita a licença e o termo.', { campo: 'aceite' });
  if (String(d.versao || '') !== a.versao) throw new Erro(409, 'A licença foi atualizada. Recarregue a página, leia de novo e marque a caixa.', { campo: 'aceite' });
  try { await db.select(env, 'aceites', { select: 'id', limite: 1 }); } catch (e) {
    console.error('aceites', e.message);
    throw new Erro(503, 'Não deu para registrar o seu aceite agora. Tente de novo em alguns minutos.');
  }
  return a;
}

// A prova do aceite (tabela aceites): o pedido, o nome, o CPF (ou CNPJ), o e-mail, a data e a hora, o IP, o navegador,
// a versão, a frase marcada e o hash dela junto com a licença e o termo (lib/licencas.js). Falhou, o pedido não segue:
// não há venda sem a prova.
export async function gravarAceite(env, { pedido, aceite, nome, documento, email, ip, navegador, teste, momento = 'compra' }) {
  await db.insert(env, 'aceites', {
    pedido_id: pedido, momento, licenca: aceite.l.chave, versao: aceite.versao, texto: aceite.texto, hash: await hashDoAceite(aceite.texto, aceite.l),
    nome: String(nome || '').slice(0, 160), documento: documento || null, email: email || null, ip: ip ? String(ip).slice(0, 64) : null,
    navegador: navegador ? String(navegador).slice(0, 500) : null, teste: !!teste,
  }, { select: 'id' });
}

export async function criarPedido(env, { dados, visitante, ip, navegador = null, ctx }) {
  const local = env.AMBIENTE === 'local';
  // Oferta em dólar: outro caminho (Stripe, sem CPF), com as mensagens em inglês.
  const qual = await db.um(env, 'ofertas', { slug: `eq.${String(dados.oferta || '').slice(0, 80)}` }, 'moeda').catch(() => null);
  if (qual && qual.moeda === 'usd') return criarPedidoDolar(env, { dados, visitante, ip, ctx });
  const email = normalEmail(dados.email);
  const nome = String(dados.nome || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  // Quem mora fora do Brasil (só com a chave ligada): sem CPF, com país e celular com o código do país; cartão à vista.
  const deFora = dados.estrangeiro === true;
  let pagador = null, cpf = '', celular, metodo;
  if (!emailValido(email)) throw new Erro(400, 'Confira o e-mail: seu acesso chega nele.', { campo: 'email' });
  if (nome.split(' ').length < 2) throw new Erro(400, 'Escreva o nome completo.', { campo: 'nome' });
  if (deFora) {
    if (!(await estrangeirosLigado(env))) throw new Erro(400, 'Por enquanto, a compra precisa de CPF. Estamos liberando o pagamento para quem mora fora do Brasil.', { campo: 'cpf' });
    const pais = paisPorCodigo(dados.pais);
    if (!pais) throw new Erro(400, 'Escolha o país onde você mora.', { campo: 'pais' });
    if (pais.codigo === 'BR') throw new Erro(400, 'Quem mora no Brasil compra com CPF.', { campo: 'pais' });
    celular = celularDeFora(pais.ddi || dados.ddi, dados.celular);
    if (!celular) throw new Erro(400, 'Escreva o celular com o código do país.', { campo: 'celular' });
    metodo = 'cartao';
    pagador = { estrangeiro: true, pais: pais.codigo, pais_nome: pais.nome, ddi: soDigitos(pais.ddi || dados.ddi) || null };
  } else {
    cpf = soDigitos(dados.cpf);
    celular = soDigitos(dados.celular);
    metodo = dados.metodo === 'cartao' ? 'cartao' : 'pix';
    if (!cpfValido(cpf)) throw new Erro(400, 'Esse CPF não confere. Confira os números.', { campo: 'cpf' });
    if (celular.length < 10 || celular.length > 11) throw new Erro(400, 'Escreva o celular com DDD.', { campo: 'celular' });
  }

  const okIp = await db.rpc(env, 'bater_limite', { p_chave: `ck:${ip || 'sem-ip'}`, p_janela_s: 600, p_max: 15 });
  const okEmail = await db.rpc(env, 'bater_limite', { p_chave: `ck:${email}`, p_janela_s: 600, p_max: 8 });
  if (!okIp || !okEmail) throw new Erro(429, 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.');

  const oferta = await lerOferta(env, String(dados.oferta || ''), { local });
  if (!oferta || oferta.fechada) throw new Erro(404, 'Esta oferta não está disponível agora.');
  if (!oferta.metodos.includes(metodo)) throw new Erro(400, deFora ? 'Esta oferta ainda não aceita cartão, que é o pagamento de quem mora fora.' : 'Essa forma de pagamento não vale para esta oferta.');
  const aceite = await conferirAceite(env, oferta, dados);
  const bumps = oferta.bumps.filter((b) => Array.isArray(dados.bumps) && dados.bumps.includes(b.id));
  const cupom = await lerCupom(env, dados.cupom, oferta, email);
  const extra = await descontoUpgrade(env, oferta, email);
  // Estrangeiro: à vista, sem parcelamento (o Asaas não parcela para pagador estrangeiro).
  const preco = precificar({ oferta, bumps, cupom, metodo, parcelas: deFora ? 1 : dados.parcelas, extra });
  // Presente: o acesso vai para outra pessoa, com mensagem.
  let presente = null;
  if (dados.presente && dados.presente.email) {
    const pe = normalEmail(dados.presente.email);
    if (!emailValido(pe)) throw new Erro(400, 'Confira o e-mail de quem vai ganhar o presente.', { campo: 'presente' });
    presente = { email: pe, nome: String(dados.presente.nome || '').trim().slice(0, 120) || null, mensagem: String(dados.presente.mensagem || '').trim().slice(0, 500) || null };
  }
  const indicador = await indicadorDe(env, dados.indicado, email);
  const vagas = Math.max(1, Math.min(50, Math.round(Number((oferta.checkout || {}).vagas)) || 1));

  const pag = provedor(env);
  const aluno = await garantirAluno(env, { email, nome, celular });
  let cliente = aluno.asaas_cliente;
  // Comprou antes do outro jeito (com CPF e agora de fora, ou o contrário): o cadastro do Asaas não serve, nasce outro.
  let trocou = false;
  if (cliente) {
    const [ultimo] = await db.select(env, 'pedidos', { filtros: { aluno_id: `eq.${aluno.id}`, cobranca_id: 'not.is.null' }, select: 'pagador', ordem: 'criado_em.desc', limite: 1 });
    trocou = !!(ultimo && ultimo.pagador && ultimo.pagador.estrangeiro) !== deFora;
  }
  // O cliente do simulado não serve no Asaas de verdade (e vice-versa).
  if (!cliente || trocou || (pag.nome === 'asaas') !== !cliente.startsWith('cus_sim_')) {
    cliente = await pag.criarCliente(env, { nome, email, cpf, celular, ref: aluno.id, estrangeiro: deFora, pais: pagador ? pagador.pais_nome : null });
    await db.update(env, 'alunos', { id: `eq.${aluno.id}` }, { asaas_cliente: cliente }, 'id');
  }

  const origem = await toquesDoVisitante(env, visitante);
  const [pedido] = await db.insert(env, 'pedidos', {
    aluno_id: aluno.id, oferta_id: oferta.id, itens: preco.itens, cupom: cupom ? cupom.codigo : null,
    subtotal_centavos: preco.subtotal, desconto_centavos: preco.desconto, juros_centavos: preco.juros, total_centavos: preco.total,
    metodo, parcelas: preco.parcelas, status: 'aberto', provedor: pag.nome, teste: !!oferta.teste || pag.nome === 'simulado',
    visitante, primeiro_toque: origem.primeiro, ultimo_toque: origem.ultimo, toques: origem.lista,
    presente, indicado_por: indicador, vagas, ...(pagador ? { pagador } : {}),
  }, { select: 'id,numero' });
  if (aceite) {
    try {
      await gravarAceite(env, { pedido: pedido.id, aceite, nome, documento: cpf || null, email, ip, navegador, teste: !!oferta.teste || pag.nome === 'simulado' });
    } catch (e) {
      console.error('aceite', e.message);
      await db.update(env, 'pedidos', { id: `eq.${pedido.id}` }, { status: 'cancelado' }, 'id').catch(() => {});
      throw new Erro(503, 'Não deu para registrar o seu aceite agora. Tente de novo em alguns minutos.');
    }
  }
  if (indicador) await db.insert(env, 'indicacoes', { indicador_id: indicador, pedido_id: pedido.id }, { ignorar: true, conflito: 'pedido_id', select: 'id' }).catch(() => {});
  if (!oferta.teste && pag.nome !== 'simulado') await pedidoCriado(env, { email, nome, celular, oferta, total: preco.total, pedido: pedido.id, visitante, toque: origem.ultimo }).catch((e) => console.error('recuperacao', e.message));

  // Curso com marca própria: o cartão volta para o obrigado do endereço dele.
  const marca = await marcaDaOferta(env, oferta);
  const site = marca ? marca.url : env.SITE_URL || 'https://agenciasetup.com.br';
  let cob;
  try {
    cob = await pag.criarCobranca(env, {
      cliente, metodo, centavos: preco.total, parcelas: preco.parcelas, parcelaCentavos: preco.parcela,
      descricao: `${preco.itens.map((i) => i.nome).join(' + ')} (pedido ${pedido.numero})`, ref: pedido.id,
      voltar: metodo === 'cartao' ? `${site}/checkout/obrigado?pedido=${pedido.id}` : null,
    });
  } catch (e) {
    await db.update(env, 'pedidos', { id: `eq.${pedido.id}` }, { status: 'recusado' }, 'id').catch(() => {});
    throw e;
  }
  const atualiza = { status: 'aguardando', cobranca_id: cob.id, parcelamento_id: cob.parcelamento, link_pagamento: cob.link };
  if (metodo === 'pix') {
    const q = await pag.qrPix(env, cob.id);
    Object.assign(atualiza, { pix_copia: q.copia, pix_qr: q.qr, pix_vence: new Date(Date.now() + oferta.pix_minutos * 60_000).toISOString() });
  }
  await db.update(env, 'pedidos', { id: `eq.${pedido.id}` }, atualiza, 'id');
  await avisarDepois(ctx, avisarPedido(env, pedido.id, 'pedido'));
  return {
    pedido: pedido.id, numero: pedido.numero, metodo, total_centavos: preco.total, parcelas: preco.parcelas, parcela_centavos: preco.parcela,
    pix: metodo === 'pix' ? { copia: atualiza.pix_copia, qr: atualiza.pix_qr, vence: atualiza.pix_vence } : null,
    pagar_em: metodo === 'cartao' ? cob.link : null,
    simulado: pag.nome === 'simulado',
  };
}

// O que a tela do Pix e a de obrigado precisam saber (sem dados pessoais).
// No obrigado: onde chega o acesso da entrega externa e, se o pedido levou um curso nosso junto, o nome dele (aí o
// botão de entrar aparece).
async function externaDoObrigado(env, oferta, itens) {
  const e = entregaDe(oferta);
  if (!e) return null;
  const comCurso = await produtosComCurso(env, itens);
  return { ...e, aqui: (itens || []).filter((i) => comCurso.has(i.produto_id)).map((i) => i.nome) };
}

export async function situacaoPedido(env, id) {
  if (!/^[0-9a-f-]{36}$/.test(String(id))) throw new Erro(404, 'Pedido não encontrado.');
  const CAMPOS = 'id,numero,status,metodo,moeda,total_centavos,parcelas,pix_copia,pix_qr,pix_vence,provedor,cobranca_id,pago_em,itens,aluno:alunos!pedidos_aluno_id_fkey(email),oferta:ofertas(slug,checkout)';
  let p = await db.um(env, 'pedidos', { id: `eq.${id}` }, CAMPOS);
  if (!p) throw new Erro(404, 'Pedido não encontrado.');
  if (await conferirVoltaStripe(env, p)) p = await db.um(env, 'pedidos', { id: `eq.${id}` }, CAMPOS);
  const email = p.aluno && p.aluno.email ? p.aluno.email.replace(/^(.{2}).*(@.*)$/, '$1***$2') : null;
  const { aluno, oferta, itens, cobranca_id, ...resto } = p;
  // Curso com marca: o obrigado leva para o app do endereço dele e, pago, oferece o PDF (o id do pedido é o segredo).
  const marca = await marcaDoPedido(env, itens);
  const leitura = !!(marca && marca.tema === 'leitura');
  return {
    ...resto, email, oferta: oferta ? oferta.slug : null, curso_url: marca ? marca.url : cursoUrl(env), idioma: (marca && marca.idioma) || 'pt',
    externa: await externaDoObrigado(env, oferta, itens), // entrega fora da nossa área: o obrigado diz onde o acesso chega
    arquivo: arquivoDe(oferta), // arquivo com licença (a Família Calango): o obrigado diz que a cópia chega por e-mail
    ...(leitura ? { leitura: true, pdf: p.status === 'pago' && marca.pdf_arquivo_id ? `${marca.url}/checkout/pdf?pedido=${p.id}` : null } : {}),
  };
}

// ---------------------------------------------------------------- aviso de pagamento (webhook) e entrega
// Cartão em análise de risco: quando o Asaas libera, chega só PAYMENT_APPROVED_BY_RISK_ANALYSIS (aprendido no Veritas).
const PAGO = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_APPROVED_BY_RISK_ANALYSIS'];
const DEVOLVIDO = ['PAYMENT_REFUNDED'];
const CONTESTADO = ['PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE', 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL'];
const RECUSADO = ['PAYMENT_CREDIT_CARD_CAPTURE_REFUSED', 'PAYMENT_REPROVED_BY_RISK_ANALYSIS'];
const VENCIDO = ['PAYMENT_OVERDUE', 'PAYMENT_DELETED'];

// Grava o aviso (uma vez só pelo id) e devolve se é novo.
export async function guardarAviso(env, evento, provedorNome = 'asaas') {
  const pay = evento.payment || {};
  const novos = await db.insert(env, 'eventos_pagamento', {
    id: String(evento.id), provedor: provedorNome, tipo: String(evento.event || ''), cobranca_id: pay.id || null, payload: evento,
  }, { ignorar: true, conflito: 'id', select: 'id' });
  return novos.length > 0;
}

export async function processarAviso(env, eventoId) {
  const ev = await db.um(env, 'eventos_pagamento', { id: `eq.${eventoId}` });
  if (!ev || ev.processado_em) return { ok: true, ja: true };
  try {
    const pay = ev.payload.payment || {};
    const bruto = String(pay.externalReference || '').replace(/^setup:/, '');
    const ref = /^[0-9a-f-]{36}$/.test(bruto) ? bruto : null;
    const pedido = ref
      ? await db.um(env, 'pedidos', { id: `eq.${ref}` })
      : pay.id ? await db.um(env, 'pedidos', { cobranca_id: `eq.${pay.id}` }) : null;
    let resultado = 'ignorado';
    // Recusa e vencimento só valem para a cobrança atual: a velha, cancelada numa troca de Pix para cartão, não derruba a nova.
    const atual = pedido && (!pay.id || pay.id === pedido.cobranca_id || (pay.installment && pay.installment === pedido.parcelamento_id));
    if (pedido) {
      if (PAGO.includes(ev.tipo) && ['aberto', 'aguardando', 'recusado', 'expirado'].includes(pedido.status)) {
        await db.update(env, 'pedidos', { id: `eq.${pedido.id}` }, { status: 'pago', pago_em: new Date().toISOString() }, 'id');
        if (pedido.cupom) await db.rpc(env, 'usar_cupom', { p_codigo: pedido.cupom }).catch(() => {});
        await entregarAcesso(env, pedido.id);
        await depoisDoPagamento(env, pedido.id).catch((e) => console.error('pos-venda', e.message));
        await pedidoPago(env, pedido.id).catch((e) => console.error('recuperacao', e.message));
        await avisarSistemas(env, 'venda.paga', await dadosDaVenda(env, pedido));
        await avisarPedido(env, pedido.id, 'venda');
        resultado = 'pago';
      } else if (DEVOLVIDO.includes(ev.tipo) && pedido.status !== 'reembolsado') {
        await db.update(env, 'pedidos', { id: `eq.${pedido.id}` }, { status: 'reembolsado' }, 'id');
        await db.rpc(env, 'revogar_pedido', { p_pedido: pedido.id, p_motivo: 'reembolso' });
        await cancelarIndicacao(env, pedido.id);
        await avisarSistemas(env, 'venda.reembolsada', { ...(await dadosDaVenda(env, pedido)), motivo: 'reembolso' });
        await fecharFila(env, pedido.id, 'feito', 'devolvido fora do painel');
        await avisarPedido(env, pedido.id, 'reembolso', { qual: 'feito' });
        resultado = 'reembolsado';
      } else if (CONTESTADO.includes(ev.tipo) && pedido.status !== 'contestado') {
        await db.update(env, 'pedidos', { id: `eq.${pedido.id}` }, { status: 'contestado' }, 'id');
        await db.rpc(env, 'revogar_pedido', { p_pedido: pedido.id, p_motivo: 'contestação no cartão' });
        await cancelarIndicacao(env, pedido.id);
        await avisarSistemas(env, 'venda.reembolsada', { ...(await dadosDaVenda(env, pedido)), motivo: 'contestacao' });
        await fecharFila(env, pedido.id, 'cancelado', 'contestação no cartão: nada a devolver');
        await avisarPedido(env, pedido.id, 'reembolso', { qual: 'contestacao' });
        resultado = 'contestado';
      } else if (RECUSADO.includes(ev.tipo) && atual && pedido.status === 'aguardando') {
        await db.update(env, 'pedidos', { id: `eq.${pedido.id}` }, { status: 'recusado' }, 'id');
        await avisarPedido(env, pedido.id, 'recusado');
        resultado = 'recusado';
      } else if (VENCIDO.includes(ev.tipo) && atual && pedido.status === 'aguardando') {
        await db.update(env, 'pedidos', { id: `eq.${pedido.id}` }, { status: 'expirado' }, 'id');
        resultado = 'expirado';
      }
    }
    await db.update(env, 'eventos_pagamento', { id: `eq.${ev.id}` }, { processado_em: new Date().toISOString(), erro: null, pedido_id: pedido ? pedido.id : null }, 'id');
    if (pedido && resultado !== 'ignorado') await auditar(env, null, `venda.${resultado}`, `pedido:${pedido.id}`, { evento: ev.tipo, numero: pedido.numero });
    return { ok: true, resultado };
  } catch (e) {
    console.error('aviso', ev.id, e && e.stack);
    await db.update(env, 'eventos_pagamento', { id: `eq.${ev.id}` }, { erro: String(e.message || e).slice(0, 300) }, 'id').catch(() => {});
    return { ok: false };
  }
}

// O que vai para os outros sistemas (webhooks) quando a venda muda.
async function dadosDaVenda(env, p) {
  const a = await db.um(env, 'alunos', { id: `eq.${p.aluno_id}` }, 'id,nome,email,celular').catch(() => null);
  return {
    pedido: { id: p.id, numero: p.numero, total_centavos: p.total_centavos, desconto_centavos: p.desconto_centavos, metodo: p.metodo, parcelas: p.parcelas, cupom: p.cupom, itens: (p.itens || []).map((i) => ({ nome: i.nome, centavos: i.centavos, bump: !!i.bump })), origem: p.ultimo_toque || null, criado_em: p.criado_em },
    aluno: pessoa(a),
  };
}

// Entrega fora da nossa área: a oferta do pedido diz (checkout.entrega = { tipo: 'externa', plataforma, o_que, prazo, dias }).
// Ex.: o Combo Black Calango (05/11/2026), que o dono libera à mão na Hubla. Sem curso aqui, sem login e sem "entrar".
// Produtos do pedido que viram curso aqui (têm produto_acessos). Num pedido de entrega externa, um bump nosso
// (ex.: o mini curso no checkout do combo, 05/11/2026) é liberado aqui; o resto é entregue fora.
export async function produtosComCurso(env, itens) {
  const ids = [...new Set((itens || []).map((i) => i.produto_id).filter((v) => /^[0-9a-f-]{36}$/.test(String(v))))];
  if (!ids.length) return new Set();
  const rows = await db.select(env, 'produto_acessos', { filtros: { produto_id: `in.(${ids.join(',')})` }, select: 'produto_id', limite: 500 });
  return new Set(rows.map((r) => r.produto_id));
}

export function entregaDe(oferta) {
  const e = oferta && oferta.checkout && oferta.checkout.entrega;
  return e && e.tipo === 'externa' ? { plataforma: e.plataforma || 'Hubla', o_que: e.o_que || null, prazo: e.prazo || null, dias: Number(e.dias) || null } : null;
}

// Libera os cursos do pedido, cria o login e manda o e-mail com o link de entrada.
export async function entregarAcesso(env, pedidoId, { reenviar = false } = {}) {
  const p = await db.um(env, 'pedidos', { id: `eq.${pedidoId}` }, 'id,numero,status,aluno_id,itens,presente,aluno:alunos!pedidos_aluno_id_fkey(id,email,nome,auth_id),oferta:ofertas(nome,checkout)');
  if (!p || p.status !== 'pago') throw new Erro(409, 'O pedido ainda não está pago.');
  // Arquivo com licença (a Família Calango): sem curso nem login. A cópia identificada é feita no Mac e o link chega
  // depois (lib/entrega-arquivo.js). Aqui sai o "recebemos"; reenviar com a cópia já pronta manda o link de novo.
  const arquivo = arquivoDe(p.oferta);
  if (arquivo) {
    const marca = await marcaDoArquivo(env, p.id);
    const pronto = !!(marca && marca.caminho);
    const dados = { nome: p.aluno.nome, oferta: p.oferta.nome, o_que: arquivo.o_que, prazo: arquivo.prazo, numero: p.numero };
    const m = pronto ? emailArquivoPronto({ ...dados, link: telaDoArquivo(env, p.id) }) : emailArquivoAguarde(dados);
    await enviarEmail(env, { para: p.aluno.email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: pronto ? 'acesso' : 'recibo', ref: `pedido:${p.id}` });
    return { arquivo: true, pronto };
  }
  const externa = entregaDe(p.oferta);
  if (externa) {
    // O e-mail de confirmação diz que o acesso é liberado na outra plataforma (a equipe adiciona; lista no conector,
    // entregas_pendentes). O vitalício é o bump que não vira curso aqui. Bump que é curso nosso (o mini curso) é
    // liberado aqui, com o e-mail de entrada de sempre.
    const comCurso = await produtosComCurso(env, p.itens);
    const aqui = (p.itens || []).filter((i) => comCurso.has(i.produto_id));
    const vitalicio = (p.itens || []).some((i) => i.bump && !comCurso.has(i.produto_id));
    const m = emailEntregaExterna({ nome: p.aluno.nome, email: p.aluno.email, oferta: p.oferta.nome, ...externa, vitalicio, aqui: aqui.map((i) => i.nome) });
    await enviarEmail(env, { para: p.aluno.email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: 'recibo', ref: `pedido:${p.id}` });
    if (!aqui.length) return { externa: true };
    if (!reenviar) await db.rpc(env, 'liberar_pedido', { p_pedido: p.id });
    const { link } = await linkDeEntrada(env, p.aluno, null);
    const b = emailBoasVindas({ nome: p.aluno.nome, curso: aqui[0].nome, link, entrar: `${cursoUrl(env)}/entrar` });
    await enviarEmail(env, { para: p.aluno.email, assunto: b.assunto, html: b.html, texto: b.texto, tipo: 'acesso', ref: `pedido:${p.id}` });
    if (!reenviar) await avisarSistemas(env, 'aluno.liberado', { aluno: pessoa(p.aluno), cursos: aqui.map((i) => i.nome), origem: 'compra', pedido_numero: p.numero });
    return { externa: true, link };
  }
  if (p.presente && p.presente.email) {
    const r = await entregarPresente(env, p);
    const curso = (p.itens[0] && p.itens[0].nome) || 'curso';
    const m = emailPresenteEnviado({ nome: p.aluno.nome, para: p.presente.nome || p.presente.email, curso });
    if (!reenviar) await enviarEmail(env, { para: p.aluno.email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: 'recibo', ref: `pedido:${p.id}` }).catch(() => {});
    if (!reenviar) await avisarSistemas(env, 'aluno.liberado', { aluno: { nome: p.presente.nome || null, email: p.presente.email }, cursos: (p.itens || []).map((i) => i.nome), origem: 'presente', pedido_numero: p.numero, presente_de: pessoa(p.aluno) });
    return r;
  }
  if (!reenviar) await db.rpc(env, 'liberar_pedido', { p_pedido: p.id });
  const marca = await marcaDoPedido(env, p.itens);
  // Curso com marca em vídeo (o em inglês): o link de entrada abre o app no endereço da marca.
  const { link } = await linkDeEntrada(env, p.aluno, marca && marca.tema !== 'leitura' ? marca.url : null);
  const curso = (p.itens[0] && p.itens[0].nome) || 'seu curso';
  if (marca && marca.idioma === 'en') {
    const m = emailBoasVindasEn({ nome: p.aluno.nome, curso, link, entrar: `${marca.url}/entrar`, marca });
    await enviarEmail(env, { para: p.aluno.email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: 'acesso', ref: `pedido:${p.id}`, de: `${marca.nome} <cursos@envio.agenciasetup.com.br>` });
  } else if (marca && marca.tema === 'leitura') {
    // Curso de leitura: o e-mail sai com a cara da marca e o PDF anexado (o Resend busca o arquivo pelo link assinado).
    // "Ler no celular" leva ao atalho do pedido, que nesse curso vale por 30 dias (api/aluno.js, entrar-pedido).
    const pdf = await linkDoPdf(env, marca, 3600);
    const m = emailLivro({ nome: p.aluno.nome, marca, ler: `${marca.url}/entrar?pedido=${p.id}`, baixar: pdf ? `${marca.url}/checkout/pdf?pedido=${p.id}` : null });
    await enviarEmail(env, { para: p.aluno.email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: 'acesso', ref: `pedido:${p.id}`, de: `${marca.nome} <cursos@envio.agenciasetup.com.br>`, anexos: pdf ? [{ filename: pdf.nome, path: pdf.url }] : null });
  } else {
    const m = emailBoasVindas({ nome: p.aluno.nome, curso, link, entrar: `${cursoUrl(env)}/entrar` });
    await enviarEmail(env, { para: p.aluno.email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: 'acesso', ref: `pedido:${p.id}` });
  }
  if (!reenviar) await avisarSistemas(env, 'aluno.liberado', { aluno: pessoa(p.aluno), cursos: (p.itens || []).map((i) => i.nome), origem: 'compra', pedido_numero: p.numero });
  return { link };
}

// ---------------------------------------------------------------- reembolso: na hora ou na fila
// Pedido do dono (29/10/2026): o reembolso é agendado para daqui a N dias (padrão 7 no painel), para o dinheiro só sair
// do caixa no dia. Na fila, o pedido continua "pago" e, por padrão, o acesso cai na hora. O relógio de 10 minutos
// devolve no Asaas quando chega o dia (cuidarDosReembolsos). Tabela `reembolsos`; um aberto por pedido.
const ACESSO_NA_FILA = 'reembolso agendado';
const ABERTO = 'in.(agendado,devolvendo)';

// Devolve o dinheiro e tira o acesso. O aviso do Asaas confirma depois; aqui o acesso já cai na hora.
async function devolverPedido(env, p) {
  await provedorDoPedido(env, p).reembolsar(env, { cobranca: p.cobranca_id, parcelamento: p.parcelamento_id });
  await db.update(env, 'pedidos', { id: `eq.${p.id}` }, { status: 'reembolsado' }, 'id');
  await db.rpc(env, 'revogar_pedido', { p_pedido: p.id, p_motivo: 'reembolso' });
  await cancelarIndicacao(env, p.id);
  await avisarSistemas(env, 'venda.reembolsada', { ...(await dadosDaVenda(env, p)), motivo: 'reembolso' });
  await avisarPedido(env, p.id, 'reembolso', { qual: 'feito' });
}

// dias 0 (ou sem dias): devolve agora. 1 a 30: entra na fila. tirarAcesso (padrão sim): o acesso cai já na fila.
export async function reembolsar(x, pedidoId, { dias, motivo, tirarAcesso } = {}) {
  exigir(x.u, 'vendas.reembolsar');
  const p = await db.um(x.env, 'pedidos', { id: `eq.${pedidoId}` });
  if (!p) throw new Erro(404, 'Pedido não encontrado.');
  if (p.status !== 'pago') throw new Erro(409, 'Só dá para reembolsar pedido pago.');
  if (await db.um(x.env, 'reembolsos', { pedido_id: `eq.${p.id}`, status: ABERTO }, 'id')) throw new Erro(409, 'Este pedido já está na fila de reembolso.');
  const n = dias == null || dias === '' ? 0 : Number(dias);
  if (!Number.isInteger(n) || n < 0 || n > 30) throw new Erro(400, 'Escolha de 0 a 30 dias.');
  const porque = String(motivo || '').trim().slice(0, 300) || null;
  const agora = new Date().toISOString();
  const linha = { pedido_id: p.id, dias: n, motivo: porque, pedido_por: x.u.id || null };
  if (n === 0) {
    await devolverPedido(x.env, p);
    await db.insert(x.env, 'reembolsos', { ...linha, status: 'feito', devolver_em: agora, feito_em: agora, tirou_acesso: true }, { select: 'id' });
    await auditar(x.env, x.u, 'venda.reembolsar', `pedido:${p.id}`, { numero: p.numero, total: p.total_centavos });
    return { ok: true, feito: true };
  }
  const tirar = tirarAcesso !== false;
  const [r] = await db.insert(x.env, 'reembolsos', { ...linha, status: 'agendado', devolver_em: new Date(Date.now() + n * 86400_000).toISOString(), tirou_acesso: tirar }, { select: 'id,devolver_em' });
  if (tirar) await db.rpc(x.env, 'revogar_pedido', { p_pedido: p.id, p_motivo: ACESSO_NA_FILA });
  await auditar(x.env, x.u, 'venda.reembolso_agendar', `pedido:${p.id}`, { numero: p.numero, total: p.total_centavos, dias: n, tirou_acesso: tirar });
  await avisarPedido(x.env, p.id, 'reembolso', { qual: 'agendado', devolver_em: r.devolver_em });
  return { ok: true, agendado: r };
}

// Tira da fila. Se o acesso tinha caído por causa da fila e o pedido continua pago, o acesso volta.
export async function cancelarReembolso(x, reembolsoId) {
  exigir(x.u, 'vendas.reembolsar');
  const [r] = await db.update(x.env, 'reembolsos', { id: `eq.${reembolsoId}`, status: 'in.(agendado,falhou)' }, { status: 'cancelado', cancelado_por: x.u.id || null }, 'id,pedido_id,tirou_acesso');
  if (!r) throw new Erro(409, 'Este reembolso não está mais na fila.');
  let voltou = 0;
  const p = await db.um(x.env, 'pedidos', { id: `eq.${r.pedido_id}` }, 'id,numero,status');
  if (r.tirou_acesso && p && p.status === 'pago') {
    voltou = (await db.update(x.env, 'matriculas', { pedido_id: `eq.${p.id}`, status: 'eq.revogada', motivo: `eq.${ACESSO_NA_FILA}` }, { status: 'ativa', motivo: null }, 'aluno_id')).length;
  }
  await auditar(x.env, x.u, 'venda.reembolso_cancelar', `pedido:${r.pedido_id}`, { numero: p && p.numero, acesso_voltou: voltou });
  return { ok: true, acesso_voltou: voltou };
}

// Devolve agora um que está na fila (o dono não quer esperar o dia). O que falhou 3 vezes também tenta de novo por aqui.
export async function devolverReembolsoAgora(x, reembolsoId) {
  exigir(x.u, 'vendas.reembolsar');
  await db.update(x.env, 'reembolsos', { id: `eq.${reembolsoId}`, status: 'eq.falhou' }, { status: 'agendado', tentativas: 0 }, 'id');
  const r = await executarReembolso(x.env, reembolsoId);
  if (!r.ok) throw new Erro(r.erro ? 502 : 409, r.erro || 'Este reembolso não está mais na fila.');
  await auditar(x.env, x.u, 'venda.reembolsar', `pedido:${r.pedido_id}`, { numero: r.numero, total: r.total, da_fila: true });
  return r;
}

// Executa um da fila. Pega o reembolso trocando agendado -> devolvendo (dois relógios não pegam o mesmo).
// Pedido que não está mais pago (devolvido no Asaas, contestado no cartão) sai da fila sem devolver de novo.
// Falhou: tenta de novo em 1 hora; na 3ª falha, fica "falhou" para o dono ver no painel.
async function executarReembolso(env, reembolsoId) {
  const atual = await db.um(env, 'reembolsos', { id: `eq.${reembolsoId}`, status: 'eq.agendado' }, 'id,tentativas');
  if (!atual) return { ok: false };
  const [r] = await db.update(env, 'reembolsos', { id: `eq.${atual.id}`, status: 'eq.agendado' }, { status: 'devolvendo', tentativas: atual.tentativas + 1 }, 'id,pedido_id,tentativas');
  if (!r) return { ok: false };
  const p = await db.um(env, 'pedidos', { id: `eq.${r.pedido_id}` });
  const fim = (campos) => db.update(env, 'reembolsos', { id: `eq.${r.id}` }, campos, 'id');
  if (!p || p.status !== 'pago') {
    const nota = !p ? 'pedido não existe mais' : p.status === 'reembolsado' ? 'já tinha sido devolvido fora do painel' : p.status === 'contestado' ? 'contestação no cartão: nada a devolver' : `pedido ${p.status}`;
    await fim({ status: p && p.status === 'reembolsado' ? 'feito' : 'cancelado', nota, feito_em: new Date().toISOString(), erro: null });
    return { ok: true, pedido_id: r.pedido_id, numero: p && p.numero, total: p && p.total_centavos, nota };
  }
  try {
    await devolverPedido(env, p);
    await fim({ status: 'feito', feito_em: new Date().toISOString(), erro: null });
    return { ok: true, pedido_id: p.id, numero: p.numero, total: p.total_centavos };
  } catch (e) {
    const erro = String((e && e.message) || e).slice(0, 300);
    await fim(r.tentativas >= 3 ? { status: 'falhou', erro } : { status: 'agendado', erro, devolver_em: new Date(Date.now() + 3600_000).toISOString() });
    console.error('reembolso', r.id, erro);
    return { ok: false, erro, pedido_id: p.id };
  }
}

// O Asaas avisou que o pedido foi devolvido ou contestado: o que estava na fila sai sem devolver de novo.
const fecharFila = (env, pedidoId, status, nota) =>
  db.update(env, 'reembolsos', { pedido_id: `eq.${pedidoId}`, status: 'eq.agendado' }, { status, nota, feito_em: new Date().toISOString() }, 'id');

// Relógio de 10 minutos: devolve os que chegaram no dia (2 por vez, pelo limite de chamadas do plano grátis).
export async function cuidarDosReembolsos(env) {
  const vencidos = await db.select(env, 'reembolsos', { filtros: { status: 'eq.agendado', devolver_em: `lte.${new Date().toISOString()}` }, select: 'id', ordem: 'devolver_em.asc', limite: 2 });
  let feitos = 0;
  for (const v of vencidos) {
    const r = await executarReembolso(env, v.id);
    if (r.ok) { feitos += 1; await auditar(env, null, 'venda.reembolsar', `pedido:${r.pedido_id}`, { numero: r.numero, total: r.total, da_fila: true, nota: r.nota || null }); }
  }
  return { reembolsos: feitos };
}

// A fila no painel: o que está esperando o dia (e o que falhou), com o total que ainda vai sair do caixa.
export async function filaDeReembolso(x) {
  exigir(x.u, 'vendas.ver');
  const itens = await db.select(x.env, 'reembolsos', {
    filtros: { status: 'in.(agendado,devolvendo,falhou)' },
    select: 'id,status,dias,devolver_em,motivo,tirou_acesso,pelo_aluno,erro,tentativas,criado_em,quem:equipe!reembolsos_pedido_por_fkey(nome),pedido:pedidos(id,numero,total_centavos,moeda,metodo,parcelas,teste,aluno:alunos!pedidos_aluno_id_fkey(nome,email))',
    ordem: 'devolver_em.asc', limite: 100,
  });
  // Real e dólar (curso em inglês) somam à parte.
  const soma = (m) => itens.filter((r) => r.pedido && !r.pedido.teste && (r.pedido.moeda || 'brl') === m).reduce((s, r) => s + r.pedido.total_centavos, 0);
  return { itens, total_centavos: soma('brl'), total_usd_centavos: soma('usd') };
}

// ---------------------------------------------------------------- painel do aluno: compras, pagar, trocar a forma, comprovante
const COMPRA = 'id,numero,aluno_id,oferta_id,itens,cupom,total_centavos,moeda,metodo,parcelas,status,provedor,cobranca_id,parcelamento_id,link_pagamento,pix_copia,pix_qr,pix_vence,teste,criado_em,pago_em,pagador,'
  + 'oferta:ofertas(id,slug,produto_id,nome,garantia_dias,metodos,parcelas_max,juros_mes,pix_desconto_pct,pix_minutos),reembolsos(status,devolver_em,pelo_aluno)';
const PENDENTE = ['aguardando', 'expirado', 'recusado'];

const deForaDo = (p) => !!(p && p.pagador && p.pagador.estrangeiro);

function resumoCompra(p) {
  const o = p.oferta || {};
  const base = p.itens.reduce((s, i) => s + i.centavos, 0);
  const fora = deForaDo(p);
  return {
    id: p.id, numero: p.numero, itens: p.itens.map((i) => i.nome), total_centavos: p.total_centavos, moeda: p.moeda || 'brl', metodo: p.metodo, parcelas: p.parcelas,
    status: p.status, criado_em: p.criado_em, pago_em: p.pago_em, teste: p.teste,
    garantia_ate: fimDaGarantia(p),
    // Reembolso na fila: o app mostra "o valor volta até" e esconde o pedido de reembolso.
    reembolso: (() => { const r = (p.reembolsos || []).find((x) => ['agendado', 'devolvendo', 'falhou'].includes(x.status)); return r ? { devolver_em: r.devolver_em } : null; })(),
    // Quem mora fora: só cartão, à vista.
    pendente: PENDENTE.includes(p.status), metodos: fora ? (o.metodos || []).filter((m) => m === 'cartao') : o.metodos || [], pix_desconto_pct: fora ? 0 : Number(o.pix_desconto_pct) || 0,
    parcelas_max: fora ? 1 : o.parcelas_max ? parcelasPossiveis(base, o) : 1,
  };
}

async function compraDoAluno(env, aluno, id) {
  if (!/^[0-9a-f-]{36}$/.test(String(id))) throw new Erro(404, 'Compra não encontrada.');
  const p = await db.um(env, 'pedidos', { id: `eq.${id}`, aluno_id: `eq.${aluno.id}` }, COMPRA);
  if (!p) throw new Erro(404, 'Compra não encontrada.');
  return p;
}

export async function comprasDoAluno(env, aluno) {
  const l = await db.select(env, 'pedidos', { filtros: { aluno_id: `eq.${aluno.id}`, status: 'neq.aberto' }, select: COMPRA, ordem: 'criado_em.desc', limite: 50 });
  return l.map(resumoCompra);
}

// O que mostrar para pagar: o Pix (QR e copia e cola) ou o link do cartão. Se o Pix venceu, ou a pessoa quer outra forma
// (Pix <-> cartão, outro número de parcelas), cancela a cobrança velha e cria outra no mesmo pedido.
export async function pagarCompra(env, aluno, id, { metodo, parcelas } = {}) {
  const p = await compraDoAluno(env, aluno, id);
  if (!PENDENTE.includes(p.status)) throw new Erro(409, p.status === 'pago' ? 'Esta compra já está paga.' : 'Esta compra não pode mais ser paga.');
  const fora = deForaDo(p);
  const quer = fora ? 'cartao' : metodo === 'cartao' || metodo === 'pix' ? metodo : p.metodo;
  const n = fora ? 1 : quer === 'cartao' ? Math.max(1, Number(parcelas) || p.parcelas || 1) : 1;
  const pixVivo = p.metodo === 'pix' && p.pix_copia && p.pix_vence && new Date(p.pix_vence) > new Date(Date.now() + 60_000);
  // Stripe: a sessão de pagamento vence em 23 horas, então sempre nasce uma nova (a velha expira antes).
  const stripe = p.provedor === 'stripe';
  if (!stripe && p.status === 'aguardando' && quer === p.metodo && (quer === 'pix' ? pixVivo : n === p.parcelas && p.link_pagamento)) {
    return { metodo: p.metodo, total_centavos: p.total_centavos, parcelas: p.parcelas, pix: quer === 'pix' ? { copia: p.pix_copia, qr: p.pix_qr, vence: p.pix_vence } : null, link: quer === 'cartao' ? p.link_pagamento : null };
  }
  const o = p.oferta;
  if (!o || !o.metodos.includes(quer)) throw new Erro(400, 'Essa forma de pagamento não vale para esta compra.');
  if (!(await db.rpc(env, 'bater_limite', { p_chave: `pagar:${p.id}`, p_janela_s: 3600, p_max: 8 }))) throw new Erro(429, 'Muitas trocas seguidas. Espere um pouco e tente de novo.');

  const pag = provedorDoPedido(env, p);
  // A cobrança velha sai antes de nascer a nova: assim ninguém paga duas vezes.
  if (['aguardando', 'recusado'].includes(p.status) && p.cobranca_id) {
    const velha = await pag.lerCobranca(env, p.cobranca_id).catch(() => null);
    if (velha && ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(velha.status)) throw new Erro(409, 'Esse pagamento acabou de entrar. Atualize a página em alguns segundos.');
    await pag.cancelar(env, p.cobranca_id).catch((e) => console.error('cancelar cobrança velha', p.id, e.message));
  }
  // Mesmo preço da compra (o do dia em que a pessoa comprou), mesma escolha de itens e cupom.
  const principal = p.itens.find((i) => !i.bump) || p.itens[0];
  const bumps = p.itens.filter((i) => i.bump).map((i) => ({ id: i.oferta_id, produto_id: i.produto_id, nome: i.nome, preco_centavos: i.centavos }));
  const cupom = p.cupom ? await db.um(env, 'cupons', { codigo: `eq.${p.cupom}` }) : null;
  const preco = precificar({ oferta: { ...o, preco_centavos: principal.centavos }, bumps, cupom, metodo: quer, parcelas: n });
  const cadastro = await db.um(env, 'alunos', { id: `eq.${aluno.id}` }, 'asaas_cliente,email');
  const cliente = cadastro.asaas_cliente;
  if (!cliente && !stripe) throw new Erro(409, 'Não achei o seu cadastro de pagamento. Fale com a gente.');
  const marca = stripe ? await marcaDoPedido(env, p.itens) : null;
  const app = marca ? marca.url : cursoUrl(env);
  const cob = await pag.criarCobranca(env, {
    cliente, metodo: quer, centavos: preco.total, parcelas: preco.parcelas, parcelaCentavos: preco.parcela,
    descricao: `${preco.itens.map((i) => i.nome).join(' + ')} (pedido ${p.numero})`, ref: p.id,
    voltar: quer === 'cartao' ? `${app}/compras` : null,
    ...(stripe ? { moeda: 'usd', idioma: 'en', email: cadastro.email, numero: p.numero, itens: preco.itens.map((i) => ({ nome: i.nome, centavos: i.centavos })) } : {}),
  });
  const atualiza = {
    status: 'aguardando', metodo: quer, parcelas: preco.parcelas, subtotal_centavos: preco.subtotal, desconto_centavos: preco.desconto, juros_centavos: preco.juros,
    total_centavos: preco.total, cobranca_id: cob.id, parcelamento_id: cob.parcelamento, link_pagamento: cob.link, pix_copia: null, pix_qr: null, pix_vence: null,
  };
  if (quer === 'pix') {
    const q = await pag.qrPix(env, cob.id);
    Object.assign(atualiza, { pix_copia: q.copia, pix_qr: q.qr, pix_vence: new Date(Date.now() + o.pix_minutos * 60_000).toISOString() });
  }
  await db.update(env, 'pedidos', { id: `eq.${p.id}` }, atualiza, 'id');
  await auditar(env, null, 'venda.trocar_forma', `pedido:${p.id}`, { metodo: quer, parcelas: preco.parcelas });
  return { metodo: quer, total_centavos: preco.total, parcelas: preco.parcelas, pix: quer === 'pix' ? { copia: atualiza.pix_copia, qr: atualiza.pix_qr, vence: atualiza.pix_vence } : null, link: quer === 'cartao' ? cob.link : null };
}

// Comprovante do Asaas (compra paga) ou a fatura (pendente).
export async function comprovanteCompra(env, aluno, id) {
  const p = await compraDoAluno(env, aluno, id);
  if (!p.cobranca_id || p.provedor === 'simulado') return { url: null };
  const c = await provedorDoPedido(env, p).lerCobranca(env, p.cobranca_id);
  return { url: c.comprovante || c.link };
}

// ---------------------------------------------------------------- reembolso pedido pelo aluno
// Pedido do dono (29/10/2026): dentro da garantia, o aluno pede pelo app (Compras), mas com barreiras. Primeiro vê o que
// já usou (aulas assistidas e arquivos baixados) e o aviso de que usar o material depois não é permitido; depois marca
// que concorda e confirma. O pedido entra na fila com 7 dias, o acesso cai na hora e a equipe recebe um e-mail.
// No painel, o dono pode tirar da fila (o acesso volta) ou devolver antes.
const DIAS_PEDIDO_ALUNO = 7;
const fimDaGarantia = (p) => (p.pago_em && p.oferta && p.oferta.garantia_dias ? new Date(new Date(p.pago_em).getTime() + p.oferta.garantia_dias * 86400_000).toISOString() : null);

async function compraParaReembolso(env, aluno, id) {
  const p = await compraDoAluno(env, aluno, id);
  if (p.status !== 'pago') throw new Erro(409, 'Só dá para pedir reembolso de uma compra paga.');
  if ((p.reembolsos || []).some((r) => ['agendado', 'devolvendo', 'falhou'].includes(r.status))) throw new Erro(409, 'O reembolso desta compra já foi pedido.');
  const ate = fimDaGarantia(p);
  // Produto para baixar com licença própria (garantia 0, ex.: a Família Calango): sem botão de reembolso no app. O que
  // a lei garante (cláusula 8.4 da licença) é pedido por escrito ao contato, e a equipe resolve no painel.
  if (p.oferta && Number(p.oferta.garantia_dias) === 0) throw new Erro(409, 'Esta compra não tem prazo de garantia: é um arquivo com licença própria. Para falar sobre ela, escreva para contato@agenciasetup.com.br.');
  if (!ate || new Date(ate).getTime() < Date.now()) throw new Erro(409, 'O prazo de garantia desta compra já passou. Para falar sobre ela, escreva para contato@agenciasetup.com.br.');
  return p;
}

// O que a pessoa já usou dos cursos desta compra. Os arquivos baixados contam a partir de 29/10/2026 (antes só havia
// o total por arquivo).
export async function usoAntesDoReembolso(env, aluno, id) {
  const p = await compraParaReembolso(env, aluno, id);
  const produtos = (p.itens || []).map((i) => i.produto_id).filter(Boolean);
  const acessos = produtos.length ? await db.select(env, 'produto_acessos', { filtros: { produto_id: `in.(${produtos.join(',')})` }, select: 'curso_id' }) : [];
  const cursos = new Set(acessos.map((a) => a.curso_id));
  const [baixados, progresso] = await Promise.all([
    db.select(env, 'arquivos_baixados', { filtros: { aluno_id: `eq.${aluno.id}` }, select: 'vezes,ultima_vez,arquivo:arquivos(nome,curso_id)', ordem: 'ultima_vez.desc', limite: 100 }),
    db.select(env, 'progresso', { filtros: { aluno_id: `eq.${aluno.id}` }, select: 'assistido_s,concluida_em,aula:aulas(curso_id)', limite: 1000 }),
  ]);
  const daCompra = (c) => cursos.has(c);
  const aulas = progresso.filter((r) => r.aula && daCompra(r.aula.curso_id) && (r.assistido_s > 0 || r.concluida_em));
  return {
    numero: p.numero, total_centavos: p.total_centavos, metodo: p.metodo, dias: DIAS_PEDIDO_ALUNO,
    arquivos: baixados.filter((b) => b.arquivo && daCompra(b.arquivo.curso_id)).map((b) => ({ nome: b.arquivo.nome, vezes: b.vezes, quando: b.ultima_vez })),
    aulas_vistas: aulas.length, aulas_concluidas: aulas.filter((a) => a.concluida_em).length,
    minutos: Math.round(aulas.reduce((s, a) => s + (a.assistido_s || 0), 0) / 60),
  };
}

const MOTIVOS_REEMBOLSO = ['Não era o que eu esperava', 'Não tenho tempo para fazer agora', 'Tive problema para acessar ou usar', 'Comprei por engano', 'Outro motivo'];

export async function pedirReembolso(env, aluno, id, { motivo, concordo } = {}) {
  if (concordo !== true) throw new Erro(400, 'Marque que concorda com os termos para confirmar.');
  if (!MOTIVOS_REEMBOLSO.includes(motivo)) throw new Erro(400, 'Escolha o motivo do reembolso.');
  const p = await compraParaReembolso(env, aluno, id);
  const devolverEm = new Date(Date.now() + DIAS_PEDIDO_ALUNO * 86400_000).toISOString();
  await db.insert(env, 'reembolsos', { pedido_id: p.id, status: 'agendado', dias: DIAS_PEDIDO_ALUNO, devolver_em: devolverEm, motivo, tirou_acesso: true, pelo_aluno: true }, { select: 'id' });
  await db.rpc(env, 'revogar_pedido', { p_pedido: p.id, p_motivo: ACESSO_NA_FILA });
  await auditar(env, null, 'venda.reembolso_aluno', `pedido:${p.id}`, { numero: p.numero, total: p.total_centavos, motivo });
  const a = await db.um(env, 'alunos', { id: `eq.${aluno.id}` }, 'nome,email').catch(() => null);
  const dados = { nome: a && a.nome, email: a && a.email, numero: p.numero, curso: (p.itens || []).map((i) => i.nome).join(' + '), total: p.total_centavos, moeda: p.moeda || 'brl', metodo: p.metodo, devolver: devolverEm, motivo };
  if (a && a.email) { const m = p.moeda === 'usd' ? emailReembolsoPedidoEn(dados) : emailReembolsoPedido(dados); await enviarEmail(env, { para: a.email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: 'recibo', ref: `pedido:${p.id}` }).catch(() => {}); }
  // Pedido de teste (pagamento simulado) não avisa a equipe de verdade.
  if (!p.teste) { const e = emailReembolsoEquipe(dados); await enviarEmail(env, { para: env.EMAIL_EQUIPE || 'contato@agenciasetup.com.br', assunto: e.assunto, html: e.html, texto: e.texto, tipo: 'aviso', ref: `pedido:${p.id}` }).catch(() => {}); }
  await avisarPedido(env, p.id, 'reembolso', { qual: 'aluno', motivo, devolver_em: devolverEm });
  return { ok: true, devolver_em: devolverEm, metodo: p.metodo };
}

// Dados de cobrança (nome, CPF, celular): ficam no Asaas; aqui só o celular e o nome, para a equipe atender.
export async function dadosDoAluno(env, aluno) {
  const a = await db.um(env, 'alunos', { id: `eq.${aluno.id}` }, 'nome,email,celular,asaas_cliente');
  let cpf = '';
  if (a.asaas_cliente && !a.asaas_cliente.startsWith('cus_sim_') && env.ASAAS_CHAVE) {
    const c = await provedor(env).lerCliente(env, a.asaas_cliente).catch(() => null);
    cpf = c ? c.cpf : '';
  }
  // estrangeiro: celular com "+" (mora fora do Brasil); o app do aluno esconde o CPF e pede o código do país.
  const estrangeiro = String(a.celular || '').startsWith('+');
  return { nome: a.nome, email: a.email, celular: a.celular || '', estrangeiro, cpf: cpf && !estrangeiro ? `***.${cpf.slice(3, 6)}.***-${cpf.slice(-2)}` : '' };
}

export async function salvarDadosDoAluno(env, aluno, d) {
  const nome = d.nome !== undefined ? String(d.nome).trim().replace(/\s+/g, ' ').slice(0, 120) : undefined;
  // Celular com "+" na frente = número de fora do Brasil, com o código do país.
  const deFora = d.celular !== undefined && String(d.celular).trim().startsWith('+');
  const celular = d.celular === undefined ? undefined : deFora ? celularDeFora('', d.celular) : soDigitos(d.celular);
  const cpf = d.cpf && !deFora ? soDigitos(d.cpf) : undefined;
  if (nome !== undefined && nome.split(' ').length < 2) throw new Erro(400, 'Escreva o nome completo.');
  if (deFora && !celular) throw new Erro(400, 'Escreva o celular com o código do país, começando com +.');
  if (!deFora && celular !== undefined && (celular.length < 10 || celular.length > 11)) throw new Erro(400, 'Escreva o celular com DDD.');
  if (cpf !== undefined && !cpfValido(cpf)) throw new Erro(400, 'Esse CPF não confere. Confira os números.');
  const a = await db.um(env, 'alunos', { id: `eq.${aluno.id}` }, 'asaas_cliente');
  // Número de fora não vai para o Asaas (ver corpoClienteEstrangeiro em pagamento/asaas.js).
  if (a.asaas_cliente && !a.asaas_cliente.startsWith('cus_sim_') && env.ASAAS_CHAVE) await provedor(env).atualizarCliente(env, a.asaas_cliente, { nome, cpf, celular: deFora ? undefined : celular });
  const dados = {};
  if (nome !== undefined) dados.nome = nome;
  if (celular !== undefined) dados.celular = celular;
  if (Object.keys(dados).length) await db.update(env, 'alunos', { id: `eq.${aluno.id}` }, dados, 'id');
  return dadosDoAluno(env, aluno);
}

// ---------------------------------------------------------------- relógio: Pix vencido e avisos que falharam
export async function cuidarDosPedidos(env) {
  const agora = new Date().toISOString();
  const vencidos = await db.select(env, 'pedidos', { filtros: { status: 'eq.aguardando', metodo: 'eq.pix', pix_vence: `lt.${agora}` }, select: 'id,cobranca_id,provedor', limite: 3 });
  for (const p of vencidos) {
    try { await provedorDoPedido(env, p).cancelar(env, p.cobranca_id); } catch (e) { console.error('cancelar pix', p.id, e.message); }
    await db.update(env, 'pedidos', { id: `eq.${p.id}`, status: 'eq.aguardando' }, { status: 'expirado' }, 'id');
  }
  const presos = await db.select(env, 'eventos_pagamento', { filtros: { processado_em: 'is.null', recebido_em: `lt.${new Date(Date.now() - 60_000).toISOString()}` }, select: 'id', ordem: 'recebido_em.asc', limite: 2 });
  for (const e of presos) await processarAviso(env, e.id);
  const fila = await cuidarDosReembolsos(env);
  return { vencidos: vencidos.length, reprocessados: presos.length, ...fila };
}

// ---------------------------------------------------------------- upsell e downsell (tela de obrigado)
// O que oferecer depois do pagamento: oferta.checkout.upsell (e, se recusar, .downsell) = { oferta: "slug", titulo, texto }.
export async function ofertaDepois(env, pedidoId, qual = 'upsell') {
  const p = await db.um(env, 'pedidos', { id: `eq.${pedidoId}` }, 'id,status,aluno_id,pago_em,pagador,oferta:ofertas(checkout)');
  if (!p || p.status !== 'pago' || !p.oferta) return null;
  // O upsell de 1 toque é no Pix: quem mora fora não vê (paga só no cartão).
  if (deForaDo(p)) return null;
  const cfg = ((p.oferta.checkout || {})[qual]) || null;
  if (!cfg || !cfg.oferta) return null;
  const o = await lerOferta(env, cfg.oferta, { local: env.AMBIENTE === 'local' });
  if (!o || o.fechada) return null;
  // Quem já tem o produto não vê a oferta.
  const cursos = await db.select(env, 'produto_acessos', { filtros: { produto_id: `eq.${o.produto_id}` }, select: 'curso_id' });
  if (cursos.length) {
    const tem = await db.select(env, 'matriculas', { filtros: { aluno_id: `eq.${p.aluno_id}`, status: 'eq.ativa', curso_id: `in.(${cursos.map((c) => c.curso_id).join(',')})` }, select: 'curso_id' });
    if (tem.length >= cursos.length) return null;
  }
  return { qual, slug: o.slug, nome: o.nome, titulo: cfg.titulo || o.nome, texto: cfg.texto || '', preco_centavos: o.preco_centavos, preco_de_centavos: o.preco_de_centavos, pix_desconto_pct: Number(o.pix_desconto_pct) || 0, metodos: o.metodos };
}

export async function criarUpsell(env, { pedido, oferta, metodo }) {
  if (!/^[0-9a-f-]{36}$/.test(String(pedido))) throw new Erro(404, 'Pedido não encontrado.');
  const p = await db.um(env, 'pedidos', { id: `eq.${pedido}` }, 'id,status,aluno_id,pago_em,provedor,visitante,primeiro_toque,ultimo_toque,toques,teste,aluno:alunos!pedidos_aluno_id_fkey(id,asaas_cliente,email)');
  if (!p || p.status !== 'pago') throw new Erro(409, 'O pedido ainda não está pago.');
  if (!p.pago_em || Date.now() - new Date(p.pago_em).getTime() > 6 * 3600_000) throw new Erro(410, 'Essa oferta já passou.');
  if (!(await db.rpc(env, 'bater_limite', { p_chave: `upsell:${p.id}`, p_janela_s: 3600, p_max: 4 }))) throw new Erro(429, 'Muitas tentativas. Espere um pouco.');
  const pode = (await Promise.all(['upsell', 'downsell'].map((q) => ofertaDepois(env, p.id, q)))).filter(Boolean);
  const alvo = pode.find((o) => o.slug === oferta);
  if (!alvo) throw new Erro(404, 'Essa oferta não está disponível.');
  const o = await lerOferta(env, alvo.slug, { local: env.AMBIENTE === 'local' });
  // Oferta com aceite de licença não vai no 1 toque: a pessoa precisa ler e marcar a caixa no checkout dela.
  if (aceiteDaOferta(o)) throw new Erro(409, 'Essa oferta precisa do aceite da licença: compre pela página dela.');
  const met = metodo === 'cartao' && o.metodos.includes('cartao') ? 'cartao' : 'pix';
  const preco = precificar({ oferta: o, metodo: met, parcelas: 1 });
  const pag = provedorDoPedido(env, p);
  const cliente = p.aluno && p.aluno.asaas_cliente;
  if (!cliente) throw new Erro(409, 'Não achei o seu cadastro de pagamento.');
  // O pedido do complemento herda a origem do original, para o dinheiro cair no mesmo canal. Quem conta vendas por
  // origem conta a pessoa uma vez só (calcularVendas em acoes-area.js, vendasPorVersao em comenta.js).
  const [novo] = await db.insert(env, 'pedidos', {
    aluno_id: p.aluno_id, oferta_id: o.id, itens: preco.itens, subtotal_centavos: preco.subtotal, desconto_centavos: preco.desconto, juros_centavos: preco.juros,
    total_centavos: preco.total, metodo: met, parcelas: preco.parcelas, status: 'aberto', provedor: pag.nome, teste: p.teste,
    visitante: p.visitante, primeiro_toque: p.primeiro_toque, ultimo_toque: p.ultimo_toque, toques: p.toques, pedido_origem: p.id,
  }, { select: 'id,numero' });
  const site = env.SITE_URL || 'https://agenciasetup.com.br';
  const cob = await pag.criarCobranca(env, { cliente, metodo: met, centavos: preco.total, parcelas: 1, parcelaCentavos: preco.parcela, descricao: `${o.nome} (pedido ${novo.numero})`, ref: novo.id, voltar: met === 'cartao' ? `${site}/checkout/obrigado?pedido=${novo.id}` : null });
  const atualiza = { status: 'aguardando', cobranca_id: cob.id, parcelamento_id: cob.parcelamento, link_pagamento: cob.link };
  if (met === 'pix') {
    const q = await pag.qrPix(env, cob.id);
    Object.assign(atualiza, { pix_copia: q.copia, pix_qr: q.qr, pix_vence: new Date(Date.now() + o.pix_minutos * 60_000).toISOString() });
  }
  await db.update(env, 'pedidos', { id: `eq.${novo.id}` }, atualiza, 'id');
  return { pedido: novo.id, numero: novo.numero, metodo: met, total_centavos: preco.total, pix: met === 'pix' ? { copia: atualiza.pix_copia, qr: atualiza.pix_qr, vence: atualiza.pix_vence } : null, pagar_em: met === 'cartao' ? cob.link : null, simulado: pag.nome === 'simulado' };
}
