// Ações da entrega de arquivo com licença (11/11/2026, a Família Calango; o caminho está em lib/entrega-arquivo.js).
// Painel e conector: a lista de quem pagou e espera a cópia (arquivos_pendentes), o link de envio para o Mac subir o
// zip (arquivo_link_envio) e o "pronto" (arquivo_pronto), que manda ao comprador o e-mail com o link da tela de
// download. Público: o estado da tela /arquivo/<pedido_id> e o download, que grava o aceite de novo (momento
// "download") antes de abrir o link do zip, que vence em 10 minutos.
import { auditar, exigir } from '../nucleo/auth.js';
import { db } from '../nucleo/db.js';
import { Erro, aleatorio } from '../nucleo/util.js';
import { aceiteDaOferta, licencaDe } from './licencas.js';
import { entregarAcesso, gravarAceite } from './vendas.js';
import { CAMINHO, apagarArquivo, arquivoDe, arquivoGuardado, gravarMarcaDoArquivo, linkDeEnvio, linkParaBaixar, marcaDoArquivo, marcasDeArquivo, telaDoArquivo } from './entrega-arquivo.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PEDIDO = 'id,numero,status,teste,pago_em,oferta_id,oferta:ofertas(id,slug,nome,checkout,produto:produtos(slug,nome)),aluno:alunos!pedidos_aluno_id_fkey(nome,email)';
const quemFez = (u) => (u.casa ? `conector (${u.nome || 'chave da casa'})` : (u.nome || u.email || u.id || 'equipe'));
const formatarDoc = (d) => {
  const s = String(d || '').replace(/\D/g, '');
  if (s.length === 11) return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (s.length === 14) return s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return d || null;
};
const nomeDoZip = (p) => `${(p.oferta.produto && p.oferta.produto.slug) || 'arquivo'}-licenca-${p.numero}.zip`;

// O pedido de uma oferta com entrega de arquivo, pago. Os outros não entram aqui.
async function pedidoDeArquivo(env, pedidoId) {
  if (!UUID.test(String(pedidoId || ''))) throw new Erro(400, 'Mande o pedido_id (da lista de arquivos_pendentes).');
  const p = await db.um(env, 'pedidos', { id: `eq.${pedidoId}` }, PEDIDO);
  if (!p || !arquivoDe(p.oferta)) throw new Erro(404, 'Este pedido não é de um produto entregue como arquivo.');
  if (p.status !== 'pago') throw new Erro(409, `O pedido nº ${p.numero} não está pago (está ${p.status}).`);
  return p;
}

// Quem pagou e ainda espera a cópia: o número do pedido, o nome e o CPF (ou CNPJ) do aceite da compra, que vão
// dentro da cópia, e o e-mail. teste: true entra também pedido de teste (pagamento simulado no computador).
export async function arquivosPendentes(x, { limite = 100, teste = false } = {}) {
  exigir(x.u, 'alunos.ver');
  const todas = await db.select(x.env, 'ofertas', { select: 'id,slug,nome,checkout,produto:produtos(slug)', limite: 500 });
  const ofertas = todas.filter((o) => arquivoDe(o));
  if (!ofertas.length) return { pendentes: [], total_pendentes: 0, prontos: 0, ofertas: [] };
  const pedidos = await db.select(x.env, 'pedidos', {
    filtros: { oferta_id: `in.(${ofertas.map((o) => o.id).join(',')})`, status: 'eq.pago', ...(teste ? {} : { teste: 'is.false' }) },
    select: 'id,numero,oferta_id,pago_em,teste,aluno:alunos!pedidos_aluno_id_fkey(nome,email)', ordem: 'pago_em.asc', limite: 2000,
  });
  const m = await marcasDeArquivo(x.env);
  const sem = pedidos.filter((p) => !(m[p.id] && m[p.id].caminho));
  const ids = sem.slice(0, 200).map((p) => p.id);
  const aceites = ids.length ? await db.select(x.env, 'aceites', { filtros: { pedido_id: `in.(${ids.join(',')})`, momento: 'eq.compra' }, select: 'pedido_id,nome,documento,versao' }).catch(() => []) : [];
  const n = Math.min(200, Math.max(1, Number(limite) || 100));
  return {
    pendentes: sem.slice(0, n).map((p) => {
      const o = ofertas.find((e) => e.id === p.oferta_id);
      const a = aceites.find((y) => y.pedido_id === p.id);
      return {
        pedido_id: p.id, numero: p.numero, comprador: (a && a.nome) || (p.aluno && p.aluno.nome) || null, documento: a ? formatarDoc(a.documento) : null,
        email: p.aluno ? p.aluno.email : null, produto: o.produto ? o.produto.slug : o.slug, oferta: o.nome, versao_licenca: a ? a.versao : null, pago_em: p.pago_em, ...(p.teste ? { teste: true } : {}),
      };
    }),
    total_pendentes: sem.length, prontos: pedidos.length - sem.length,
    ofertas: ofertas.map((o) => ({ slug: o.slug, nome: o.nome, ...arquivoDe(o) })),
    como: 'Para cada pendente: no Mac, gere a cópia identificada (montar.py --pedido <numero> --comprador "<comprador>" --documento "<documento>"). Peça arquivo_link_envio com o pedido_id, suba o zip com o comando que ele devolve e chame arquivo_pronto com o pedido_id e o caminho. O comprador recebe o e-mail com o link na hora. Roteiro em docs/entrega-familia-calango.md.',
  };
}

// O link para subir o zip de um pedido (vale 2 horas, um arquivo só, no bucket privado). Não precisa de chave do banco.
export async function arquivoLinkEnvio(x, pedidoId) {
  exigir(x.u, 'alunos.editar');
  const p = await pedidoDeArquivo(x.env, pedidoId);
  const produto = (p.oferta.produto && p.oferta.produto.slug) || p.oferta.slug;
  const caminho = `licencas/${produto}/${p.numero}-${aleatorio(16).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16).padEnd(8, '0')}.zip`;
  const url = await linkDeEnvio(x.env, caminho);
  await auditar(x.env, x.u, 'arquivo.link_envio', `pedido:${p.id}`, { numero: p.numero, caminho });
  return {
    pedido_id: p.id, numero: p.numero, caminho, envio_url: url, vence_em: new Date(Date.now() + 2 * 3600_000).toISOString(),
    comando: `curl -sS -X PUT -H "Content-Type: application/zip" --data-binary @"<caminho do zip>" "${url}"`,
    depois: 'Subido o zip, chame arquivo_pronto com este pedido_id e este caminho.',
  };
}

// A cópia do pedido está no bucket: grava a marca e manda ao comprador o e-mail com o link da tela de download.
// Cópia refeita (outro caminho) apaga a anterior. sem_email: só marca (ex.: teste).
export async function arquivoPronto(x, pedidoId, caminho, { nota, sem_email = false } = {}) {
  exigir(x.u, 'alunos.editar');
  const p = await pedidoDeArquivo(x.env, pedidoId);
  const produto = (p.oferta.produto && p.oferta.produto.slug) || p.oferta.slug;
  const c = String(caminho || '').trim();
  if (!CAMINHO.test(c) || !c.startsWith(`licencas/${produto}/${p.numero}-`)) throw new Erro(400, 'Esse caminho não é o deste pedido. Use o caminho que o arquivo_link_envio devolveu.');
  const bytes = await arquivoGuardado(x.env, c);
  if (!bytes) throw new Erro(409, 'O zip ainda não está no bucket. Suba pelo link de envio e chame de novo.');
  const antes = await marcaDoArquivo(x.env, p.id);
  if (antes && antes.caminho && antes.caminho !== c) await apagarArquivo(x.env, antes.caminho).catch(() => {});
  let marca = { caminho: c, bytes, pronto_em: new Date().toISOString(), por: quemFez(x.u), ...(nota ? { nota: String(nota).slice(0, 200) } : {}) };
  await gravarMarcaDoArquivo(x.env, p.id, marca);
  if (!sem_email) {
    await entregarAcesso(x.env, p.id, { reenviar: true });
    marca = await gravarMarcaDoArquivo(x.env, p.id, { ...marca, enviado_em: new Date().toISOString() });
  }
  await auditar(x.env, x.u, 'arquivo.pronto', `pedido:${p.id}`, { numero: p.numero, caminho: c, bytes, email: !sem_email });
  return { pedido_id: p.id, numero: p.numero, bytes, email_enviado: !sem_email, tela: telaDoArquivo(x.env, p.id) };
}

// ---------------------------------------------------------------- a tela pública de download (/arquivo/<pedido_id>)
// A licença que vale para o pedido: a da versão aceita na compra (cláusula 13.4: vale a do dia do pedido). Sem aceite
// gravado (não deveria acontecer), a da oferta.
async function licencaDoPedido(env, p) {
  const compra = await db.um(env, 'aceites', { pedido_id: `eq.${p.id}`, momento: 'eq.compra' }, 'licenca,versao,nome,documento,email').catch(() => null);
  const daOferta = aceiteDaOferta(p.oferta);
  if (compra) {
    if (daOferta && !daOferta.invalida && daOferta.l.chave === compra.licenca && daOferta.versao === compra.versao) return { a: daOferta, compra };
    const l = licencaDe(compra.licenca, compra.versao);
    if (l) return { a: { versao: l.versao, texto: l.caixa, licenca_url: `${l.licenca_url}${l.atual ? '' : `?v=${l.versao}`}`, termo_url: `${l.termo_url}${l.atual ? '' : `?v=${l.versao}`}`, l }, compra };
  }
  return { a: daOferta && !daOferta.invalida ? daOferta : null, compra: null };
}

// O que a tela mostra: nao_achado, nao_pago, encerrado (o valor foi devolvido: a licença acabou), preparando ou pronto.
export async function estadoDoArquivo(env, pedidoId) {
  if (!UUID.test(String(pedidoId || ''))) return { estado: 'nao_achado' };
  const p = await db.um(env, 'pedidos', { id: `eq.${pedidoId}` }, PEDIDO);
  const arquivo = p ? arquivoDe(p.oferta) : null;
  if (!p || !arquivo) return { estado: 'nao_achado' };
  const base = { pedido: p.id, numero: p.numero, oferta: p.oferta.nome, ...arquivo };
  if (['reembolsado', 'contestado', 'cancelado'].includes(p.status)) return { ...base, estado: 'encerrado' };
  if (p.status !== 'pago') return { ...base, estado: 'nao_pago' };
  const marca = await marcaDoArquivo(env, p.id);
  if (!marca || !marca.caminho) return { ...base, estado: 'preparando' };
  const { a } = await licencaDoPedido(env, p);
  if (!a) return { ...base, estado: 'preparando' };
  return { ...base, estado: 'pronto', aceite: { versao: a.versao, texto: a.texto, licenca_url: a.licenca_url, termo_url: a.termo_url }, aviso: a.l.aviso_download || null };
}

// O botão "Baixar": confere o aceite, grava (momento "download", com IP e navegador) e devolve o link do zip.
export async function baixarArquivo(env, pedidoId, { dados = {}, ip = null, navegador = null } = {}) {
  if (!UUID.test(String(pedidoId || ''))) throw new Erro(404, 'Não achamos este pedido.');
  const okPedido = await db.rpc(env, 'bater_limite', { p_chave: `arq:${pedidoId}`, p_janela_s: 3600, p_max: 20 });
  const okIp = await db.rpc(env, 'bater_limite', { p_chave: `arq-ip:${ip || 'sem-ip'}`, p_janela_s: 600, p_max: 30 });
  if (!okPedido || !okIp) throw new Erro(429, 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.');
  const p = await db.um(env, 'pedidos', { id: `eq.${pedidoId}` }, PEDIDO);
  if (!p || !arquivoDe(p.oferta)) throw new Erro(404, 'Não achamos este pedido.');
  if (p.status !== 'pago') throw new Erro(409, ['reembolsado', 'contestado', 'cancelado'].includes(p.status) ? 'Esta licença foi encerrada e o arquivo não está mais disponível.' : 'O pagamento deste pedido ainda não foi confirmado.');
  const marca = await marcaDoArquivo(env, p.id);
  if (!marca || !marca.caminho) throw new Erro(409, 'Sua cópia ainda está sendo preparada. O link chega no seu e-mail.');
  const { a, compra } = await licencaDoPedido(env, p);
  if (!a) throw new Erro(503, 'Esta oferta está sem o texto da licença. Fale com a gente.');
  const d = dados.aceite && typeof dados.aceite === 'object' ? dados.aceite : {};
  if (d.marcado !== true) throw new Erro(400, 'Para baixar, marque que leu e aceita a licença e o termo.', { campo: 'aceite' });
  if (String(d.versao || '') !== a.versao) throw new Erro(409, 'A página ficou desatualizada. Recarregue, leia de novo e marque a caixa.', { campo: 'aceite' });
  await gravarAceite(env, {
    pedido: p.id, aceite: a, momento: 'download', nome: (compra && compra.nome) || (p.aluno && p.aluno.nome) || 'sem nome',
    documento: compra ? compra.documento : null, email: (compra && compra.email) || (p.aluno && p.aluno.email) || null, ip, navegador, teste: p.teste,
  });
  const url = await linkParaBaixar(env, marca.caminho, nomeDoZip(p), 600);
  if (!url) throw new Erro(503, 'Não deu para abrir o arquivo agora. Tente de novo em alguns minutos.');
  return { url, nome: nomeDoZip(p), vence_em: new Date(Date.now() + 600_000).toISOString() };
}
