// Rotas públicas da venda: checkout (/api/checkout), aviso do Asaas (/api/asaas/aviso), toques de origem (/api/toque)
// e links curtos (/l/<codigo>). Nenhuma delas devolve dado pessoal de ninguém.
import { db } from '../../nucleo/db.js';
import { Erro, corpoJson, json, respostaErro } from '../../nucleo/util.js';
import { asaas, stripe } from '../../pagamento/index.js';
import { cookieVisitante, destinoComMarcas, lerVisitante, marcasDe, novoVisitante, registrarToque } from '../origem.js';
import { codigoDeLink, codigoValido, comPessoa } from '../pessoa.js';
import { dadosParaRetomar, guardarContato, moedaDaLinha, pararLembretes } from '../recuperacao.js';
import { cotar, criarPedido, criarUpsell, guardarAviso, ofertaDepois, processarAviso, situacaoPedido } from '../vendas.js';
import { baixarArquivo } from '../acoes-arquivos.js';

async function turnstileOk(env, token, ip) {
  if (!env.TURNSTILE_SEGREDO) return true;
  if (!token) return false;
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SEGREDO, response: token, ...(ip ? { remoteip: ip } : {}) }),
  }).then((x) => x.json()).catch(() => ({}));
  return !!r.success;
}

export async function apiCheckout(request, env, ctx, url) {
  try {
    const caminho = url.pathname;
    const ip = request.headers.get('cf-connecting-ip') || null;

    if (caminho === '/api/checkout' && request.method === 'POST') {
      const dados = await corpoJson(request, 20_000);
      if (!(await turnstileOk(env, dados.turnstile, ip))) throw new Erro(400, 'Confirme que você não é um robô e tente de novo.');
      return json(await criarPedido(env, { dados, visitante: lerVisitante(request), ip, navegador: request.headers.get('user-agent'), ctx }));
    }
    // O botão "Baixar" da tela do arquivo com licença (a Família Calango): grava o aceite e devolve o link do zip.
    const arq = caminho.match(/^\/api\/checkout\/arquivo\/([0-9a-f-]{36})$/);
    if (arq && request.method === 'POST') return json(await baixarArquivo(env, arq[1], { dados: await corpoJson(request, 2_000), ip, navegador: request.headers.get('user-agent') }));
    if (caminho === '/api/checkout/preco' && request.method === 'POST') return json(await cotar(env, await corpoJson(request, 4_000), ip));
    // O checkout guarda o contato quando a pessoa sai de um campo: responde logo e grava depois, sem atrasar a tela.
    if (caminho === '/api/checkout/contato' && request.method === 'POST') {
      const dados = await corpoJson(request, 4_000);
      ctx.waitUntil(guardarContato(env, dados, lerVisitante(request), ip).catch((e) => console.error('contato', e.message)));
      return json({ ok: true });
    }
    const retomar = caminho.match(/^\/api\/checkout\/retomar\/([0-9a-f-]{36})$/);
    if (retomar && request.method === 'GET') return json(await dadosParaRetomar(env, retomar[1]));
    // Parar os lembretes: abrir o link só mostra o botão (programa de e-mail abre links sozinho e pararia sem a pessoa querer).
    const parar = caminho.match(/^\/api\/checkout\/parar\/([0-9a-f-]{36})$/);
    if (parar && (request.method === 'GET' || request.method === 'POST')) {
      const en = (await moedaDaLinha(env, parar[1])) === 'usd';
      const feito = request.method === 'POST';
      if (feito) await pararLembretes(env, parar[1]);
      const corpo = feito
        ? `<h1>${en ? 'Done' : 'Pronto'}</h1><p>${en ? "You won't get these reminders anymore." : 'Você não recebe mais estes lembretes.'}</p>`
        : `<h1>${en ? 'Stop the reminders?' : 'Parar os lembretes?'}</h1><p>${en ? 'We will stop emailing you about this purchase.' : 'Vamos parar de escrever sobre essa compra.'}</p><form method="post"><button>${en ? 'Stop reminders' : 'Parar lembretes'}</button></form>`;
      return new Response(`<!doctype html><html lang="${en ? 'en' : 'pt-BR'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${en ? 'Reminders' : 'Lembretes'}</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:420px;margin:15vh auto;padding:0 20px;color:#27272a}h1{font-size:24px;margin:0 0 8px}button{margin-top:12px;padding:12px 20px;border:0;border-radius:999px;background:#27272a;color:#fff;font:inherit;font-weight:600;cursor:pointer}</style></head><body>${corpo}</body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }
    if (caminho === '/api/checkout/upsell' && request.method === 'POST') return json(await criarUpsell(env, await corpoJson(request, 2_000)));
    let d2 = caminho.match(/^\/api\/checkout\/pedido\/([0-9a-f-]{36})\/depois$/);
    if (d2 && request.method === 'GET') return json({ upsell: await ofertaDepois(env, d2[1], 'upsell'), downsell: await ofertaDepois(env, d2[1], 'downsell') });
    let m = caminho.match(/^\/api\/checkout\/pedido\/([0-9a-f-]{36})$/);
    if (m && request.method === 'GET') return json(await situacaoPedido(env, m[1]));

    // Só no computador: finge o aviso do Asaas e passa pelo mesmo caminho de um pagamento de verdade.
    m = caminho.match(/^\/api\/checkout\/simular\/([0-9a-f-]{36})$/);
    if (m && request.method === 'POST') {
      if (env.AMBIENTE !== 'local') throw new Erro(404, 'Endereço da API não existe.');
      const p = await db.um(env, 'pedidos', { id: `eq.${m[1]}`, provedor: 'eq.simulado' }, 'id,cobranca_id,total_centavos,metodo');
      if (!p) throw new Erro(404, 'Pedido simulado não encontrado.');
      const evento = { id: `evt_sim_${crypto.randomUUID()}`, event: p.metodo === 'pix' ? 'PAYMENT_RECEIVED' : 'PAYMENT_CONFIRMED', payment: { id: p.cobranca_id, externalReference: p.id, value: p.total_centavos / 100 } };
      await guardarAviso(env, evento, 'simulado');
      return json(await processarAviso(env, evento.id));
    }

    if (caminho === '/api/asaas/aviso' && request.method === 'POST') {
      if (!asaas.conferirAviso(request, env)) return json({ erro: 'não autorizado' }, 401);
      const evento = await corpoJson(request, 200_000);
      if (!evento.id || !evento.event) return json({ ok: true, ignorado: true });
      // A conta do Asaas é dividida com o Veritas Dei: aviso de cobrança que não é nossa responde 200 e não é guardado
      // (erro faria o Asaas pausar a fila; guardar seria ficar com dados de clientes de outro site).
      const pay = evento.payment || {};
      const nosso = String(pay.externalReference || '').startsWith(asaas.MARCA)
        || (pay.id && (await db.um(env, 'pedidos', { cobranca_id: `eq.${pay.id}` }, 'id')));
      if (!nosso) return json({ ok: true, ignorado: true });
      // Grava e responde rápido (o Asaas espera até 10 s); o processamento vem logo depois.
      const novo = await guardarAviso(env, evento, 'asaas');
      if (novo) ctx.waitUntil(processarAviso(env, String(evento.id)));
      return json({ ok: true });
    }

    // Aviso do Stripe (venda em dólar): corpo assinado com o segredo do aviso. Só os eventos com o nosso pedido nos
    // metadados entram; o resto responde 200 e some (erro faria o Stripe tentar de novo por dias).
    if (caminho === '/api/stripe/aviso' && request.method === 'POST') {
      if (Number(request.headers.get('content-length') || 0) > 500_000) return json({ erro: 'grande demais' }, 413);
      const bruto = new Uint8Array(await request.arrayBuffer());
      if (bruto.byteLength > 500_000) return json({ erro: 'grande demais' }, 413);
      if (!(await stripe.conferirAviso(env, bruto, request.headers.get('stripe-signature')))) return json({ erro: 'não autorizado' }, 401);
      let ev;
      try { ev = JSON.parse(new TextDecoder().decode(bruto)); } catch { return json({ ok: true, ignorado: true }); }
      if (!ev || !ev.id || !ev.type) return json({ ok: true, ignorado: true });
      const evento = await stripe.traduzirAviso(env, ev);
      if (!evento) return json({ ok: true, ignorado: true });
      const novo = await guardarAviso(env, evento, 'stripe');
      if (novo) ctx.waitUntil(processarAviso(env, String(evento.id)));
      return json({ ok: true });
    }

    if (caminho === '/api/toque' && request.method === 'POST') {
      const d = await corpoJson(request, 4_000);
      let alvo;
      try { alvo = new URL(String(d.url || '')); } catch { return json({ ok: true }); }
      const marcas = marcasDe(alvo, d.referrer);
      if (!marcas) return json({ ok: true });
      let v = lerVisitante(request);
      const novo = !v;
      if (novo) v = novoVisitante();
      let referer = null;
      try { referer = d.referrer ? new URL(String(d.referrer)).hostname : null; } catch {}
      // até 30 toques a cada 10 minutos do mesmo endereço de internet; acima disso, ignora calado (robô não enche a tabela)
      const ip = request.headers.get('cf-connecting-ip') || 'sem-ip';
      ctx.waitUntil((async () => {
        if (!(await db.rpc(env, 'bater_limite', { p_chave: `toque:${ip}`, p_janela_s: 600, p_max: 30 }).catch(() => true))) return;
        await registrarToque(env, v, marcas, { pagina: alvo.pathname, referer, pais: request.cf?.country || null });
      })().catch(() => {}));
      return json({ ok: true }, 200, novo ? { 'set-cookie': cookieVisitante(env, v, new URL(request.url).hostname) } : {});
    }
    throw new Erro(404, 'Endereço da API não existe.');
  } catch (e) {
    return respostaErro(e);
  }
}

// O código do link curto vai junto ("&l=", pessoa.js) quando o destino é o nosso próprio site: a página do material
// passa a versão para a faixa do mini curso no topo (linkDoTopo em render/paginas.js), e a venda pela faixa cai na
// versão certa do Comenta X. A visita com o mesmo código não vira toque novo (registrarToque compara sem o link).
function comVersao(destino, codigo, host) {
  const c = codigoDeLink(codigo);
  if (!c) return destino;
  try { const u = new URL(destino); if (u.hostname !== host) return destino; u.searchParams.set('l', c); return u.toString(); } catch { return destino; }
}

// /l/<codigo>: conta o clique, guarda o toque e leva para o destino com as marcas.
export async function linkCurto(request, env, ctx, url, codigo) {
  const l = await db.rpc(env, 'clicar_link', { p_codigo: codigo }).catch(() => null);
  if (!l || !l.codigo) return Response.redirect(`${url.origin}/`, 302);
  let v = lerVisitante(request);
  const novo = !v;
  if (novo) v = novoVisitante();
  // "?p=código": a pessoa do Instagram que recebeu este link no direct (pessoa.js). Vai junto para a página de destino.
  const pessoa = codigoValido(url.searchParams.get('p'));
  const marcas = { origem: l.utm_source, meio: l.utm_medium, campanha: l.utm_campaign, conteudo: l.utm_content, termo: l.utm_term, clid: null, pessoa };
  // Só o caminho e só o domínio: o endereço inteiro, depois de limpo, virava "/recursos/skilldedm-skill".
  const soCaminho = (u, base) => { try { return new URL(u, base).pathname; } catch { return null; } };
  const soDominio = (u) => { try { return new URL(u).hostname; } catch { return null; } };
  ctx.waitUntil(registrarToque(env, v, marcas, { link: l.codigo, pagina: soCaminho(l.destino, url.origin), referer: soDominio(request.headers.get('referer') || ''), pais: request.cf?.country || null }).catch(() => {}));
  const headers = { location: comVersao(comPessoa(destinoComMarcas(url.origin, l), pessoa), l.codigo, url.hostname), 'cache-control': 'no-store' };
  if (novo) headers['set-cookie'] = cookieVisitante(env, v, new URL(request.url).hostname);
  return new Response(null, { status: 302, headers });
}
