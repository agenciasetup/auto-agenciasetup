// Worker da Agência Setup: site público, downloads, anúncios, painel (/admin), API do painel (/api/admin),
// login do conector (/oauth) e o conector do Claude (/mcp). Arquivos fixos (CSS, imagens, painel compilado) saem de public/.
import { db } from './nucleo/db.js';
import { Erro, esc, json, jsonScript, respostaErro, urlSegura } from './nucleo/util.js';
import { ehRotaOauth, rotasOauth } from './nucleo/oauth.js';
import * as C from './lib/conteudo.js';
import { escolher, contar as contarAnuncio } from './lib/anuncios.js';
import { servidorMcp } from './lib/mcp.js';
import { apiPainel } from './lib/api/painel.js';
import { retornoConexao } from './plataformas/conexao.js';
import { rodarMinuto, rodarRelogio } from './lib/relogio.js';
import { ofertaAtiva, webhookMeta } from './lib/gatilhos.js';
import { webhookResend } from './lib/emails.js';
import { casca } from './render/casca.js';
import * as P from './render/paginas.js';
import { apiCheckout, linkCurto } from './lib/api/checkout.js';
import { apiAluno } from './lib/api/aluno.js';
import { estrangeirosLigado, lerOferta } from './lib/vendas.js';
import { prepararAsaas } from './pagamento/index.js';
import { depoimentosDaLanding } from './lib/acoes-comunidade.js';
import { EXEMPLO_CERT, certificadoPublico, configCertificado } from './lib/certificados.js';
import { perfilPublico } from './lib/perfil.js';
import { cursoUrl } from './lib/alunos.js';
import { marcaDaOferta, marcaDoPedido, marcaPorHost, pdfDoPedido } from './lib/marcas.js';
import { paginaVendaLeitura } from './render/venda-leitura.js';
import { paginaCertificado, paginaNaoAchada, paginaPerfil } from './render/publico.js';
import { paginaCheckout, paginaFechada, paginaObrigado, paginaSemPdf } from './render/checkout.js';
import { paginaVenda } from './render/venda.js';
import { paginaCheckoutEn, paginaFechadaEn, paginaObrigadoEn } from './render/checkout-en.js';
import { paginaLegalEn } from './render/legal-en.js';
import { paginaRecursoEn } from './render/recurso-en.js';
import { arquivoIndexNow, colecao, entidades, grafo, llmsBr, llmsEn, migalhas, robotsBr, robotsEn, sitemapBr, sitemapEn } from './lib/seo.js';
import { ASSUNTOS, caminhoArtigo } from './lib/assuntos.js';

// O que o app do aluno precisa saber da marca do endereço (vai na própria página, antes do app abrir).
const marcaParaApp = (m) => ({ nome: m.nome, tema: m.tema, autores: m.autores, whatsapp: m.whatsapp, cor: m.cor, pdf: m.pdf_arquivo_id, curso: { slug: m.curso.slug, titulo: m.curso.titulo, subtitulo: m.curso.subtitulo, capa_url: m.curso.capa_url } });

// O app do aluno (curso.agenciasetup.com.br) é uma página só: qualquer endereço devolve o mesmo index.html compilado.
// No endereço de um curso com marca (ex.: duvidasdafe.agenciasetup.com.br), a página leva o nome e a marca: o app abre
// com a cara do curso (aluno/src/leitor/).
async function appAluno(request, env, marca = null) {
  // Curso em inglês: o mesmo app, compilado em inglês (npm run aluno:en, em public/aluno-en).
  const en = !!(marca && marca.idioma === 'en');
  const r = await env.ASSETS.fetch(new Request(new URL(en ? '/aluno-en/index.html' : '/aluno/index.html', request.url)));
  if (!r.ok) return new Response('O app do aluno ainda não foi montado (npm run aluno).', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  let corpo = r.body;
  if (en) {
    corpo = (await r.text())
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(marca.nome)}</title>`)
      .replace(/<meta name="apple-mobile-web-app-title"[^>]*>/, `<meta name="apple-mobile-web-app-title" content="${esc(marca.nome)}">`)
      .replace('</head>', `<script>window.__MARCA=${jsonScript({ ...marcaParaApp(marca), idioma: 'en' })}</script></head>`);
  } else if (marca) {
    // Nome, ícone e fonte do curso (o ícone vem de public/img/marcas, feito pelo scripts/duvidas.mjs icones).
    const icone = `/img/marcas/${esc(marca.curso.slug)}-192.png`;
    corpo = (await r.text())
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(marca.nome)}</title>`)
      .replace(/<meta name="theme-color"[^>]*>/, '<meta name="theme-color" content="#0A1429">')
      .replace(/<meta name="apple-mobile-web-app-title"[^>]*>/, `<meta name="apple-mobile-web-app-title" content="${esc(marca.nome)}">`)
      .replace(/<meta name="apple-mobile-web-app-status-bar-style"[^>]*>/, '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">')
      .replace(/<link rel="icon"[^>]*>/g, '')
      .replace(/<link rel="apple-touch-icon"[^>]*>/, `<link rel="apple-touch-icon" href="${icone}"><link rel="icon" href="${icone}" type="image/png">`)
      .replace(/family=Anton[^"]*/, 'family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Inter:wght@400..700&display=swap')
      .replace('</head>', `<script>window.__MARCA=${jsonScript(marcaParaApp(marca))}</script></head>`);
  }
  return new Response(corpo, {
    headers: {
      'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'x-robots-tag': 'noindex',
      'referrer-policy': 'same-origin', 'x-content-type-options': 'nosniff',
    },
  });
}

// Endereço de um curso com marca: o checkout, o obrigado e o PDF da compra ficam nele (com a cara dele); o resto é o
// app do aluno, como no curso.agenciasetup.com.br.
// A página de venda na raiz do endereço da marca (landing page com o mesmo slug do curso). Em rascunho, só no
// computador (com o aviso de prévia); no ar, só publicada. Sem página, a raiz continua sendo o app.
async function vendaDaMarca(env, marca, url) {
  const local = env.AMBIENTE === 'local';
  // No computador, ?lp=<slug> mostra outra landing page (um rascunho da página nova) no lugar da do curso.
  const slug = (local && /^[a-z0-9-]{3,80}$/.test(url.searchParams.get('lp') || '') && url.searchParams.get('lp')) || marca.curso.slug;
  const lp = await db.um(env, 'landing_pages', { slug: `eq.${slug}`, ...(local ? { status: 'neq.arquivado' } : { status: 'eq.publicado' }) }, '*,produto:produtos(*)').catch(() => null);
  if (!lp) return null;
  let { oferta, curso } = await C.dadosDaVenda(env, lp);
  // Oferta ainda desligada (prévia no computador): o preço mostrado é o dela, e o botão leva ao checkout dela.
  if (!oferta && local && lp.produto_id) oferta = await db.um(env, 'ofertas', { produto_id: `eq.${lp.produto_id}` }, 'id,slug,nome,preco_centavos,preco_de_centavos,parcelas_max,juros_mes,metodos,garantia_dias').catch(() => null);
  const b = (Array.isArray(lp.blocos) ? lp.blocos : []).find((x) => x.tipo === 'exemplo');
  let exemplo = null;
  if (b && b.codigo && curso) {
    const a = await db.um(env, 'aulas', { curso_id: `eq.${curso.id}`, codigo: `eq.${b.codigo}`, status: 'eq.publicado' }, 'titulo,corpo,modulo:modulos(numero)').catch(() => null);
    if (a) exemplo = { titulo: a.titulo, corpo: a.corpo, capitulo: a.modulo ? a.modulo.numero : null };
  }
  // A capa do livro sai de scripts/duvidas.mjs capa (public/img/marcas/<curso>-capa.webp e .jpg).
  return html(paginaVendaLeitura({
    lp, marca, oferta, curso, exemplo, rastrear: env.__rastreio || null,
    capaLivro: `/img/marcas/${marca.curso.slug}-capa.webp`, capaLivroJpg: `${marca.url}/img/marcas/${marca.curso.slug}-capa.jpg`,
    url: `${marca.url}/`, previa: lp.status !== 'publicado',
  }), 200, lp.status === 'publicado' && slug === marca.curso.slug ? undefined : 'no-store');
}

// O curso em inglês (marca de idioma "en", tema vídeo): a página de venda é a da Setup (render/venda.js), em inglês e em
// dólar. Em rascunho, só no computador; no ar, só publicada.
async function vendaDaMarcaEn(env, marca, url) {
  const local = env.AMBIENTE === 'local';
  const lp = await db.um(env, 'landing_pages', { slug: `eq.${marca.curso.slug}`, ...(local ? { status: 'neq.arquivado' } : { status: 'eq.publicado' }) }, '*,produto:produtos(*)').catch(() => null);
  if (!lp) return null;
  await prepararAsaas(env); // a biblioteca do Bunny (a VSL do topo) mora nas integrações
  let { oferta, curso, video } = await C.dadosDaVenda(env, lp);
  if (!oferta && local && lp.produto_id) oferta = await lerOferta(env, (await db.um(env, 'ofertas', { produto_id: `eq.${lp.produto_id}`, moeda: 'eq.usd' }, 'slug').catch(() => null) || {}).slug || '-', { local: true }).catch(() => null);
  return html(paginaVenda({ lp, oferta, curso, video, rastrear: env.__rastreio || null, url: `${marca.url}/`, idioma: 'en', marca }), 200, lp.status === 'publicado' ? undefined : 'no-store');
}

// O site em inglês (agenciasetup.com) está aberto ao Google desde 09/11/2026 (ok do dono): a página de venda, o material
// grátis, os termos e o llms.txt (robotsEn em lib/seo.js). Checkout, área do aluno e API ficam fora (a área do aluno
// também responde noindex). O Dúvidas da Fé e o curso.agenciasetup.com.br continuam fechados.
async function dominioMarca(request, env, ctx, url, marca) {
  const en = marca.idioma === 'en';
  if (en && (request.method === 'GET' || request.method === 'HEAD')) {
    const site = marca.url || url.origin;
    if (url.pathname === '/sitemap.xml') return await sitemapEn(env, site);
    if (url.pathname === '/llms.txt') return await llmsEn(env, site, marca);
    const chave = await arquivoIndexNow(env, url.pathname);
    if (chave) return chave;
  }
  if (url.pathname === '/' && (request.method === 'GET' || request.method === 'HEAD')) {
    const venda = en ? await vendaDaMarcaEn(env, marca, url) : await vendaDaMarca(env, marca, url);
    if (venda) return venda;
  }
  if (en) {
    // Termos, privacidade e reembolso em inglês (o Stripe pede).
    const legal = { '/terms': 'termos', '/privacy': 'privacidade', '/refunds': 'reembolso' }[url.pathname];
    if (legal) return html(paginaLegalEn(legal, marca));
    // O material grátis em inglês (o link da DM do "Comenta X" do perfil em inglês): a página, e baixar ou abrir, que
    // contam o uso como no site em português. Sem o material (ainda não publicado), volta para a página do curso.
    const free = url.pathname.match(/^\/free\/([a-z0-9-]+)(?:\/(download|open))?\/?$/);
    if (free && (request.method === 'GET' || request.method === 'HEAD')) {
      const r = await C.recursoEn(env, free[1]);
      if (!r) return Response.redirect(`${url.origin}/`, 302);
      if (free[2]) {
        const destino = free[2] === 'open' ? r.link_uso : r.arquivo_url || r.link_externo;
        if (!destino) return Response.redirect(`${url.origin}/free/${r.slug}`, 302);
        ctx.waitUntil(db.rpc(env, 'contar_download', { p_recurso: r.id, p_origem: (request.headers.get('referer') || '').slice(0, 200) || null, p_pais: request.cf?.country || null }).catch(() => {}));
        return Response.redirect(urlSegura(destino), 302);
      }
      const oferta = await ofertaAtiva(env, 'en').catch(() => null);
      return html(paginaRecursoEn({ r, oferta, url: `${marca.url}/free/${r.slug}` }), 200, r.status === 'publicado' ? undefined : 'no-store');
    }
    if (url.pathname === '/checkout/obrigado') {
      const pedido = url.searchParams.get('pedido') || '';
      if (!/^[0-9a-f-]{36}$/.test(pedido)) return Response.redirect(`${url.origin}/`, 302);
      return checkoutHtml(paginaObrigadoEn({ pedidoId: pedido, simulado: env.AMBIENTE === 'local' && !env.STRIPE_CHAVE, rastrear: env.__rastreio || null, marca }));
    }
    const ckEn = url.pathname.match(/^\/checkout\/([a-z0-9-]{2,80})$/);
    if (ckEn && (request.method === 'GET' || request.method === 'HEAD')) {
      const oferta = await lerOferta(env, ckEn[1], { local: env.AMBIENTE === 'local' });
      if (!oferta || oferta.fechada || oferta.moeda !== 'usd') return checkoutHtml(paginaFechadaEn({ marca }), oferta ? 410 : 404);
      return checkoutHtml(paginaCheckoutEn({ oferta, simulado: env.AMBIENTE === 'local' && !env.STRIPE_CHAVE, turnstileSite: env.TURNSTILE_SITE || null, rastrear: env.__rastreio || null, marca }));
    }
    if (url.pathname === '/manifest.webmanifest') {
      return new Response(JSON.stringify({
        name: marca.nome, short_name: marca.nome, start_url: '/inicio', scope: '/', display: 'standalone', background_color: '#09090a', theme_color: '#09090a', lang: 'en',
        icons: [192, 512].map((n) => ({ src: `/aluno/icone-${n}.png`, sizes: `${n}x${n}`, type: 'image/png', purpose: 'any' })),
      }), { headers: { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
    }
    if (/^\/aluno-en\/[\w.-]+\.(png|svg|webmanifest|js|css)$/.test(url.pathname) || url.pathname.startsWith('/aluno-en/assets/')) return env.ASSETS.fetch(request);
  }
  if (url.pathname === '/api/checkout' || url.pathname.startsWith('/api/checkout/') || url.pathname === '/api/toque' || url.pathname === '/api/stripe/aviso') return apiCheckout(request, env, ctx, url);
  // O PDF da compra (botão do obrigado e do e-mail): link assinado de 10 minutos, enquanto o pedido estiver pago.
  if (url.pathname === '/checkout/pdf') {
    const pdf = await pdfDoPedido(env, url.searchParams.get('pedido') || '');
    if (pdf) return new Response(null, { status: 302, headers: { location: pdf.url, 'cache-control': 'no-store' } });
    return checkoutHtml(paginaSemPdf({ marca }), 404);
  }
  if (url.pathname === '/checkout/obrigado') {
    const pedido = url.searchParams.get('pedido') || '';
    if (!/^[0-9a-f-]{36}$/.test(pedido)) return Response.redirect(`${url.origin}/`, 302);
    return checkoutHtml(paginaObrigado({ pedidoId: pedido, simulado: env.AMBIENTE === 'local' && !env.ASAAS_CHAVE, rastrear: env.__rastreio || null, marca }));
  }
  const ck = url.pathname.match(/^\/checkout\/([a-z0-9-]{2,80})$/);
  if (ck && (request.method === 'GET' || request.method === 'HEAD')) {
    const oferta = await lerOferta(env, ck[1], { local: env.AMBIENTE === 'local' });
    if (!oferta || oferta.fechada) return checkoutHtml(paginaFechada({ marca }), oferta ? 410 : 404);
    return checkoutHtml(paginaCheckout({ oferta, simulado: env.AMBIENTE === 'local' && !env.ASAAS_CHAVE, turnstileSite: env.TURNSTILE_SITE || null, rastrear: env.__rastreio || null, estrangeiros: await estrangeirosLigado(env), marca }));
  }
  // "Adicionar à tela inicial": o celular mostra o nome e o ícone do curso, não os da Setup.
  if (url.pathname === '/manifest.webmanifest') {
    return new Response(JSON.stringify({
      name: marca.nome, short_name: marca.nome, start_url: '/ler', scope: '/', display: 'standalone', background_color: '#EDEBE6', theme_color: '#EDEBE6', lang: 'pt-BR',
      icons: [192, 512].map((n) => ({ src: `/img/marcas/${marca.curso.slug}-${n}.png`, sizes: `${n}x${n}`, type: 'image/png', purpose: 'any' })),
    }), { headers: { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
  }
  if (url.pathname.startsWith('/img/marcas/')) return env.ASSETS.fetch(request);
  return dominioCurso(request, env, ctx, url, marca);
}

async function dominioCurso(request, env, ctx, url, marca = null) {
  if (url.pathname.startsWith('/api/aluno/')) return apiAluno(request, env, ctx, url);
  if (url.pathname === '/robots.txt') return new Response(marca && marca.idioma === 'en' ? robotsEn(marca.url || url.origin) : 'User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  if (url.pathname === '/manifest.webmanifest') return env.ASSETS.fetch(new Request(new URL('/aluno/manifest.webmanifest', request.url)));
  if (url.pathname === '/sw.js') return env.ASSETS.fetch(new Request(new URL('/aluno/sw.js', request.url)));
  // Arquivos fixos do app (manifesto com o caminho que o Vite escreve, ícones): direto dos arquivos, não a página.
  if (/^\/aluno\/[\w.-]+\.(png|svg|webmanifest|js)$/.test(url.pathname)) return env.ASSETS.fetch(request);
  if (request.method !== 'GET' && request.method !== 'HEAD') return json({ erro: 'Método não permitido.' }, 405);
  // Páginas públicas (compartilháveis): o certificado e o perfil público do aluno.
  const cert = url.pathname.match(/^\/certificado\/([A-Z0-9]{10}|exemplo)$/);
  if (cert) {
    // "exemplo": como o certificado sai hoje, com um nome de exemplo (para a equipe ver e mostrar na página de venda).
    const c = cert[1] === 'exemplo' ? { ...EXEMPLO_CERT, emitido_em: new Date().toISOString() } : await certificadoPublico(env, cert[1]);
    const cfg = c ? await configCertificado(env) : null;
    return publicoHtml(c ? paginaCertificado(c, { url: `${cursoUrl(env)}${url.pathname}`, story: url.searchParams.get('formato') === 'story', cfg }) : paginaNaoAchada('Certificado não encontrado. Confira o código.'), c ? 200 : 404);
  }
  const perfil = url.pathname.match(/^\/@([a-z0-9._]{3,30})$/);
  if (perfil) {
    const pp = await perfilPublico(env, perfil[1]);
    return publicoHtml(pp ? paginaPerfil(pp, { url: `${cursoUrl(env)}${url.pathname}` }) : paginaNaoAchada('Este perfil não existe ou não é público.'), pp ? 200 : 404);
  }
  return appAluno(request, env, marca);
}

function publicoHtml(corpo, status = 200) {
  return new Response(corpo, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': status === 200 ? 'public, max-age=300' : 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-content-type-options': 'nosniff' } });
}

function checkoutHtml(corpo, status = 200) {
  return new Response(corpo, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'x-frame-options': 'DENY', 'strict-transport-security': 'max-age=31536000', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-content-type-options': 'nosniff' } });
}

// O painel é um app de uma página só: qualquer /admin/... devolve o mesmo index.html compilado.
async function painel(request, env) {
  const r = await env.ASSETS.fetch(new Request(new URL('/admin/index.html', request.url)));
  if (!r.ok) return new Response('O painel ainda não foi montado (npm run painel).', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  return new Response(r.body, {
    headers: {
      'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'SAMEORIGIN', 'content-security-policy': "frame-ancestors 'self'", 'x-robots-tag': 'noindex',
      'referrer-policy': 'same-origin', 'x-content-type-options': 'nosniff',
    },
  });
}

// Arquivos fixos do painel fora de /admin/assets (o service worker precisa morar em /admin/ para valer no painel todo).
// O service worker nunca fica guardado: o navegador confere a versão nova a cada abertura.
async function arquivoDoPainel(request, env, url) {
  const r = await env.ASSETS.fetch(new Request(new URL(url.pathname, request.url)));
  if (!r.ok) return new Response('Não encontrado.', { status: 404 });
  const h = new Headers(r.headers);
  if (url.pathname.endsWith('sw.js')) { h.set('cache-control', 'no-cache'); h.set('service-worker-allowed', '/admin/'); }
  else if (url.pathname.endsWith('.webmanifest')) { h.set('content-type', 'application/manifest+json; charset=utf-8'); h.set('cache-control', 'public, max-age=300'); }
  else h.set('cache-control', 'public, max-age=86400');
  return new Response(r.body, { status: 200, headers: h });
}

const POR_PAGINA = 24;

// Proteções das páginas públicas: só o próprio site pode abrir a página dentro de um quadro (contra clickjacking),
// o navegador lembra de usar sempre HTTPS e a página não pede câmera, microfone nem localização.
const PROTEGE = { 'x-frame-options': 'SAMEORIGIN', 'strict-transport-security': 'max-age=31536000', 'permissions-policy': 'camera=(), microphone=(), geolocation=()' };

function html(corpo, status = 200, cache = 'public, max-age=60, s-maxage=300') {
  return new Response(corpo, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cache, 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', ...PROTEGE } });
}

// Conta as impressões dos anúncios mostrados, sem atrasar a página.
function registrar(env, ctx, anuncios) {
  const ids = Object.values(anuncios).filter(Boolean).map((a) => a.id);
  if (ids.length) ctx.waitUntil(contarAnuncio(env, ids, 'impressao'));
}

// Filtros da lista de recursos, lidos do endereço (tudo vira link: dá para compartilhar e voltar).
function filtrosDe(url, cats) {
  const s = url.searchParams;
  const tipo = P.TIPOS[s.get('tipo')] ? s.get('tipo') : null;
  const c = cats.some((x) => x.slug === s.get('c')) ? s.get('c') : null;
  const f = /^[a-z0-9-]{2,30}$/.test(s.get('f') || '') ? s.get('f') : null;
  const ordem = s.get('ordem') === 'novos' ? 'novos' : null;
  const q = (s.get('q') || '').trim().slice(0, 80) || null;
  return { tipo, c, f, ordem, q };
}

async function lista(env, ctx, base, url, cats, n, fixoTipo) {
  const f = filtrosDe(url, cats);
  if (fixoTipo) f.tipo = fixoTipo;
  const atual = f.c ? cats.find((x) => x.slug === f.c) : null;
  const [r, cont, anuncios] = await Promise.all([
    C.recursos(env, { tipo: f.tipo, categoria: atual && atual.id, ferramenta: f.f, busca: f.q, ordem: f.ordem || 'populares', limite: POR_PAGINA, offset: (n - 1) * POR_PAGINA }),
    C.contagens(env),
    escolher(env, ['fim'], { categoria_id: atual && atual.id, tags: f.tipo ? [f.tipo] : [] }),
  ]);
  registrar(env, ctx, anuncios);
  const rota = fixoTipo ? '/agentes' : '/recursos';
  const titulo = fixoTipo ? 'Agentes de IA prontos para usar' : atual ? `Recursos de ${atual.nome}` : f.tipo ? `${P.TIPOS[f.tipo].p} grátis` : 'Recursos grátis';
  return html(casca({
    ...base, titulo, caminho: `${rota}${url.search}`, noindex: !!(f.q || n > 1 || f.f || f.ordem),
    descricao: fixoTipo ? 'Assistentes de IA já configurados para Social Media e Design. Abra no ChatGPT ou no Claude e use na hora.' : atual?.descricao,
    corpo: P.listaRecursos({ base: rota, titulo, intro: fixoTipo ? P.introAgentes() : P.introRecursos(atual), itens: r.linhas, total: r.total, cats, cont, f: { ...f, tipo: fixoTipo ? null : f.tipo }, pagina: n, porPagina: POR_PAGINA, anuncios, cfg: base.cfg, fixoTipo }),
    // A lista principal (sem filtro e na primeira página) diz ao buscador e à IA o que ela tem.
    ldjson: url.search ? undefined : grafo(
      colecao(env.SITE_URL, { caminho: rota, nome: titulo, itens: r.linhas.map((x) => [x.titulo, `/recursos/${x.slug}`]) }),
      migalhas(env.SITE_URL, [['Início', '/'], [fixoTipo ? 'Agentes' : 'Recursos', rota]]),
    ),
  }));
}

async function pagina(request, env, ctx, url) {
  const caminho = url.pathname.replace(/\/+$/, '') || '/';
  const [cfg, cats] = await Promise.all([C.config(env), C.categorias(env)]);
  const base = { cfg, caminho, url: env.SITE_URL };
  const n = Math.max(1, parseInt(url.searchParams.get('p') || '1', 10) || 1);

  if (caminho === '/') {
    const [destaques, agentes, novidades, cont, anuncios] = await Promise.all([
      C.recursos(env, { semTipo: 'agente', limite: 8 }), C.recursos(env, { tipo: 'agente', limite: 6 }), C.artigos(env, { limite: 3 }), C.contagens(env), escolher(env, ['meio']),
    ]);
    registrar(env, ctx, anuncios);
    return html(casca({
      ...base, classe: 'pagina-home',
      corpo: P.home({ destaques: destaques.linhas, agentes: agentes.linhas, novidades: novidades.linhas, cats, cont, anuncios, cfg }),
      ldjson: grafo(Object.values(entidades(env.SITE_URL))),
    }));
  }

  if (caminho === '/recursos') return lista(env, ctx, base, url, cats, n, null);
  if (caminho === '/agentes') return lista(env, ctx, base, url, cats, n, 'agente');

  let m = caminho.match(/^\/recursos\/([a-z0-9-]+)$/);
  if (m) {
    const r = await C.recurso(env, m[1]);
    if (!r) return naoEncontrada(base);
    const [relacionados, anuncios, oferta] = await Promise.all([C.relacionados(env, r, 3), escolher(env, ['lateral', 'fim'], { tags: [...(r.tags || []), r.tipo], categoria_id: r.categoria_id }), C.oferta(env)]);
    registrar(env, ctx, anuncios);
    const capa = r.capa_url || (Array.isArray(r.galeria) && r.galeria[0] && r.galeria[0].url) || undefined;
    return html(casca({
      ...base, titulo: r.titulo, descricao: r.resumo, imagem: capa, classe: 'pagina-recurso', aba: r.tipo === 'agente' ? '/agentes' : '/recursos',
      corpo: P.paginaRecurso({ r, cats, relacionados, anuncios, cfg, oferta }),
      ldjson: (() => {
        const s = env.SITE_URL; const { org } = entidades(s); const agente = r.tipo === 'agente';
        return grafo({
          '@type': agente ? 'SoftwareApplication' : 'CreativeWork', '@id': `${s}/recursos/${r.slug}#recurso`, url: `${s}/recursos/${r.slug}`, mainEntityOfPage: `${s}/recursos/${r.slug}`,
          name: r.titulo, description: r.resumo, inLanguage: 'pt-BR', isAccessibleForFree: true, image: capa, datePublished: r.publicado_em, dateModified: r.atualizado_em,
          ...(agente ? { applicationCategory: 'BusinessApplication', operatingSystem: 'Web' } : {}),
          offers: { '@type': 'Offer', price: 0, priceCurrency: 'BRL' }, author: { '@id': org['@id'] }, publisher: { '@id': org['@id'] },
        }, org, migalhas(s, [['Início', '/'], agente ? ['Agentes', '/agentes'] : ['Recursos', '/recursos'], [r.titulo, `/recursos/${r.slug}`]]));
      })(),
    }));
  }

  // Baixar o arquivo ou abrir o agente: conta e redireciona.
  m = caminho.match(/^\/(baixar|usar)\/([a-z0-9-]+)$/);
  if (m) {
    const r = await C.recurso(env, m[2]);
    const destino = r && (m[1] === 'usar' ? r.link_uso : r.arquivo_url || r.link_externo);
    if (!destino) return naoEncontrada(base);
    const origem = (request.headers.get('referer') || '').slice(0, 200) || null;
    ctx.waitUntil(db.rpc(env, 'contar_download', { p_recurso: r.id, p_origem: origem, p_pais: request.cf?.country || null }).catch(() => {}));
    return Response.redirect(urlSegura(destino), 302);
  }

  if (caminho === '/busca') {
    const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
    const res = q ? await C.buscar(env, q, 40) : { recursos: [], artigos: [] };
    return html(casca({ ...base, titulo: q ? `Busca: ${q}` : 'Buscar', caminho: '/busca', noindex: true, corpo: P.paginaBusca({ q, res }) }), 200, 'no-store');
  }

  // A lista de cada assunto (lib/assuntos.js): /novidades e os grupos de páginas /ia, /equipamentos, /tutoriais, /guias.
  // Assunto sem artigo publicado responde 404 (página vazia não ajuda ninguém), menos /novidades, que sempre existe.
  m = caminho.match(/^\/(novidades|ia|equipamentos|tutoriais|guias)$/);
  if (m) {
    const assunto = m[1];
    const s = ASSUNTOS[assunto];
    const [a, hubs] = await Promise.all([C.artigos(env, { assunto, limite: POR_PAGINA, offset: (n - 1) * POR_PAGINA }), C.assuntosComConteudo(env)]);
    if (assunto !== 'novidades' && !a.total) return naoEncontrada(base);
    const nome = `${s.titulo} ${s.destaque}`;
    return html(casca({
      ...base, titulo: assunto === 'novidades' ? 'Novidades da IA' : nome, descricao: s.lead, noindex: n > 1, aba: '/novidades',
      corpo: P.listaNovidades({ assunto, itens: a.linhas, total: a.total, pagina: n, porPagina: POR_PAGINA, cfg, hubs }),
      ldjson: n > 1 ? undefined : grafo(colecao(env.SITE_URL, { caminho: `/${assunto}`, nome, descricao: s.lead, itens: a.linhas.map((x) => [x.titulo, caminhoArtigo(x)]) }), migalhas(env.SITE_URL, [['Início', '/'], [s.nome, `/${assunto}`]])),
    }));
  }

  // Quem assina: a página do autor (o Google pergunta quem escreveu e por que confiar).
  m = caminho.match(/^\/autor\/([a-z0-9-]+)$/);
  if (m) {
    const au = await C.autor(env, m[1]);
    if (!au) return naoEncontrada(base);
    const lista = await C.artigos(env, { autor: au.id, limite: 30 });
    const s = env.SITE_URL;
    const pessoa = { '@type': 'Person', '@id': `${s}/autor/${au.slug}#pessoa`, name: au.nome, jobTitle: au.cargo || undefined, description: au.bio || undefined, image: au.foto_url ? new URL(au.foto_url, s).toString() : undefined, url: `${s}/autor/${au.slug}`, sameAs: au.perfis && au.perfis.length ? au.perfis : undefined, worksFor: { '@id': `${s}/#organizacao` } };
    return html(casca({
      ...base, titulo: au.nome, descricao: au.bio ? au.bio.slice(0, 160) : `${au.nome}, ${au.cargo || 'autor'} da Agência Setup.`, imagem: au.foto_url ? new URL(au.foto_url, s).toString() : undefined, aba: '/novidades',
      corpo: P.paginaAutor({ autor: au, itens: lista.linhas }),
      ldjson: grafo({ '@type': 'ProfilePage', '@id': `${s}/autor/${au.slug}`, url: `${s}/autor/${au.slug}`, mainEntity: { '@id': pessoa['@id'] }, isPartOf: { '@id': `${s}/#site` } }, pessoa, entidades(s).org, migalhas(s, [['Início', '/'], [au.nome, `/autor/${au.slug}`]])),
    }));
  }

  // O artigo mora em /<assunto>/<slug>. Pedido pelo assunto errado (ex.: link antigo /novidades/...), vai ao certo (301).
  m = caminho.match(/^\/(novidades|ia|equipamentos|tutoriais|guias)\/([a-z0-9-]+)$/);
  if (m) {
    const a = await C.artigo(env, m[2]);
    if (!a) return naoEncontrada(base);
    const certo = caminhoArtigo(a);
    if (certo !== caminho) return Response.redirect(`${url.origin}${certo}`, 301);
    const [anuncios, recurso, oferta] = await Promise.all([
      escolher(env, ['meio'], { tags: a.tags, categoria_id: a.categoria_id }),
      a.recurso_id ? db.um(env, 'recursos', { id: `eq.${a.recurso_id}`, status: 'eq.publicado' }).catch(() => null) : null,
      C.oferta(env),
    ]);
    registrar(env, ctx, anuncios);
    const s = env.SITE_URL; const { org } = entidades(s);
    const pagina = `${s}${certo}`;
    // Quem assina: a pessoa (com a página dela) ou, sem autor, a própria Agência Setup.
    const pessoa = a.autor ? { '@type': 'Person', '@id': `${s}/autor/${a.autor.slug}#pessoa`, name: a.autor.nome, url: `${s}/autor/${a.autor.slug}`, jobTitle: a.autor.cargo || undefined, sameAs: a.autor.perfis && a.autor.perfis.length ? a.autor.perfis : undefined } : null;
    const faqs = (Array.isArray(a.faqs) ? a.faqs : []).filter((f) => f && f.pergunta && f.resposta);
    return html(casca({
      ...base, titulo: a.titulo, descricao: a.resumo, imagem: a.capa_url, aba: '/novidades', corpo: P.paginaNovidade({ a, recurso, anuncios, cfg, oferta }),
      ldjson: grafo({
        '@type': a.tipo === 'noticia' ? 'NewsArticle' : 'Article', '@id': `${pagina}#artigo`, mainEntityOfPage: pagina, url: pagina,
        headline: a.titulo, description: a.resumo, inLanguage: 'pt-BR', datePublished: a.publicado_em, dateModified: a.atualizado_em, image: a.capa_url || undefined,
        articleSection: ASSUNTOS[a.assunto] ? ASSUNTOS[a.assunto].nome : undefined, about: a.consulta_alvo || undefined, wordCount: (String(a.corpo_md || '').match(/\S+/g) || []).length,
        author: pessoa ? { '@id': pessoa['@id'] } : { '@id': org['@id'] }, publisher: { '@id': org['@id'] },
      }, pessoa, org,
      faqs.length ? { '@type': 'FAQPage', '@id': `${pagina}#perguntas`, mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.pergunta, acceptedAnswer: { '@type': 'Answer', text: f.resposta } })) } : null,
      migalhas(s, [['Início', '/'], [ASSUNTOS[a.assunto] ? ASSUNTOS[a.assunto].nome : 'Novidades', `/${a.assunto || 'novidades'}`], [a.titulo, certo]])),
    }));
  }

  if (caminho === '/cursos') {
    const todas = await db.select(env, 'landing_pages', { filtros: { status: 'eq.publicado' }, select: 'slug,titulo,seo,produto_id,produto:produtos(chamada,imagem_url)', ordem: 'publicado_em.desc' });
    // Só entra quem está com "Aparece na lista de cursos" ligado (seo.vitrine; ligado quando não tem nada). Desligado, a
    // página segue no ar para quem tem o link. Curso com marca própria (ex.: Dúvidas da Fé) nasce desligado.
    const lps = todas.filter((l) => !(l.seo && l.seo.vitrine === false));
    return html(casca({
      ...base, titulo: 'Cursos', corpo: P.listaCursos({ lps }),
      ldjson: grafo(colecao(env.SITE_URL, { caminho: '/cursos', nome: 'Cursos da Agência Setup', itens: lps.map((l) => [l.titulo, `/cursos/${l.slug}`]) }), migalhas(env.SITE_URL, [['Início', '/'], ['Cursos', '/cursos']])),
    }));
  }

  m = caminho.match(/^\/cursos\/([a-z0-9-]+)$/);
  if (m) {
    const lp = await C.landing(env, m[1]);
    if (!lp) return naoEncontrada(base);
    const daMarca = lp.produto_id ? await marcaDoPedido(env, [{ produto_id: lp.produto_id }]) : null;
    if (daMarca) return Response.redirect(`${daMarca.url}/`, 302);
    const { oferta, curso, video } = await C.dadosDaVenda(env, lp);
    // Depoimentos aprovados e autorizados pelos alunos entram sozinhos na página (antes do preço, se não houver o bloco).
    const deps = curso ? await depoimentosDaLanding(env, [curso.id]).catch(() => []) : [];
    const depoimentos = deps.map((d) => ({ texto: d.texto, nome: `${d.aluno.nome}${d.aluno.instagram ? ` (@${d.aluno.instagram})` : ''}` }));
    if (depoimentos.length && Array.isArray(lp.blocos) && !lp.blocos.some((b) => b.tipo === 'depoimentos')) {
      const p = lp.blocos.findIndex((b) => b.tipo === 'preco');
      lp.blocos = [...lp.blocos]; lp.blocos.splice(p >= 0 ? p : lp.blocos.length, 0, { tipo: 'depoimentos', titulo: 'Quem já fez' });
    }
    return html(paginaVenda({ lp, oferta, curso, video, depoimentos, rastrear: env.__rastreio || null, url: `${env.SITE_URL || 'https://agenciasetup.com.br'}/cursos/${lp.slug}` }));
  }

  if (caminho === '/privacidade') return html(casca({ ...base, titulo: 'Política de privacidade', corpo: P.institucional('Política de privacidade', PRIVACIDADE) }));
  if (caminho === '/termos') return html(casca({ ...base, titulo: 'Termos de uso', corpo: P.institucional('Termos de uso', TERMOS) }));

  return naoEncontrada(base);
}

// Busca instantânea (a caixa do site): JSON curto, com o que a lista precisa para desenhar.
async function apiBusca(env, url) {
  const q = (url.searchParams.get('q') || '').trim();
  const r = await C.buscar(env, q, 8);
  return json({
    q,
    recursos: (r.recursos || []).slice(0, 8).map((x) => ({ titulo: x.titulo, url: `/recursos/${x.slug}`, tipo: (P.TIPOS[x.tipo] || {}).t || 'Recurso', icone: x.tipo, resumo: x.resumo })),
    artigos: (r.artigos || []).slice(0, 4).map((x) => ({ titulo: x.titulo, url: `/novidades/${x.slug}`, resumo: x.resumo })),
  }, 200, { 'cache-control': 'public, max-age=60' });
}

// "Receber novidades": guarda o e-mail. Sem JavaScript, o formulário volta para a página com ?inscrito=1.
async function apiLead(request, env) {
  const tipo = request.headers.get('content-type') || '';
  const d = tipo.includes('application/json') ? await request.json().catch(() => ({})) : Object.fromEntries(await request.formData().catch(() => new FormData()));
  const email = String(d.email || '').trim().toLowerCase();
  // Sem JavaScript, volta para a página de onde veio (só endereço do próprio site).
  const pagina = /^\/[a-z0-9/-]{0,120}$/.test(String(d.voltar || '')) ? d.voltar : '/';
  const voltar = (ok) => (tipo.includes('application/json') ? json({ ok }, ok ? 200 : 400) : Response.redirect(new URL(`${pagina}?inscrito=${ok ? 1 : 0}#receber`, request.url).toString(), 303));
  if (d.site) return voltar(true); // armadilha para robô: finge que deu certo
  if (!/^[^@\s]{1,64}@[^@\s]{1,190}\.[a-z]{2,24}$/i.test(email)) return voltar(false);
  // até 10 e-mails por hora do mesmo endereço de internet (robô não enche a lista)
  const ip = request.headers.get('cf-connecting-ip') || 'sem-ip';
  if (!(await db.rpc(env, 'bater_limite', { p_chave: `lead:${ip}`, p_janela_s: 3600, p_max: 10 }).catch(() => true))) return voltar(false);
  const recurso = /^[0-9a-f-]{36}$/.test(String(d.recurso || '')) ? d.recurso : null;
  await db.rpc(env, 'guardar_lead', { p_email: email, p_origem: String(d.origem || 'site').slice(0, 60), p_recurso: recurso });
  return voltar(true);
}

function naoEncontrada(base) {
  return html(casca({ ...base, titulo: 'Página não encontrada', corpo: P.naoEncontrada(), noindex: true }), 404, 'no-store');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // www e endereços antigos vão para o domínio principal.
    if (url.hostname === 'www.agenciasetup.com.br') return Response.redirect(`https://agenciasetup.com.br${url.pathname}${url.search}`, 301);
    if (url.hostname === 'www.agenciasetup.com') return Response.redirect(`https://agenciasetup.com${url.pathname}${url.search}`, 301);
    try {
      // Chave do Asaas guardada pelo painel (cifrada): carrega antes das rotas que cobram, recebem aviso ou configuram.
      if (/^\/(api\/(checkout|asaas|stripe|aluno|admin)(\/|$)|checkout\/|cursos\/)/.test(url.pathname)) await prepararAsaas(env);
      // Curso com marca e endereço próprios (lib/marcas.js). No computador: npm run dev:duvidas (MARCA_LOCAL).
      const marca = (url.hostname !== 'agenciasetup.com.br' && !url.hostname.startsWith('curso.') && url.hostname !== 'localhost') || env.MARCA_LOCAL ? await marcaPorHost(env, url.hostname) : null;
      if (marca) return await dominioMarca(request, env, ctx, url, marca);
      // Área de membros: outro endereço, o mesmo Worker. No computador o wrangler troca o endereço de todo pedido,
      // então o app do aluno roda numa segunda porta (npm run dev:curso, MODO=curso).
      if (url.hostname.startsWith('curso.') || env.MODO === 'curso') return await dominioCurso(request, env, ctx, url);
      // /mcp em modo código (buscar, consultar, executar); /mcp/ferramentas, uma ferramenta por operação (o jeito antigo).
      if (url.pathname === '/mcp') return await servidorMcp(request, env, ctx, 'codigo');
      if (url.pathname === '/mcp/ferramentas') return await servidorMcp(request, env, ctx, 'ferramentas');
      if (url.pathname === '/api/checkout' || url.pathname.startsWith('/api/checkout/') || url.pathname === '/api/asaas/aviso' || url.pathname === '/api/stripe/aviso' || url.pathname === '/api/toque') return await apiCheckout(request, env, ctx, url);
      const curto = url.pathname.match(/^\/l\/([a-z0-9-]{2,40})$/);
      if (curto) return await linkCurto(request, env, ctx, url, curto[1]);
      if (url.pathname === '/checkout/obrigado') {
        const pedido = url.searchParams.get('pedido') || '';
        if (!/^[0-9a-f-]{36}$/.test(pedido)) return Response.redirect(`${url.origin}/cursos`, 302);
        return checkoutHtml(paginaObrigado({ pedidoId: pedido, simulado: env.AMBIENTE === 'local' && !env.ASAAS_CHAVE, rastrear: env.__rastreio || null }));
      }
      const ck = url.pathname.match(/^\/checkout\/([a-z0-9-]{2,80})$/);
      if (ck && (request.method === 'GET' || request.method === 'HEAD')) {
        const oferta = await lerOferta(env, ck[1], { local: env.AMBIENTE === 'local' });
        if (!oferta || oferta.fechada) return checkoutHtml(paginaFechada(), oferta ? 410 : 404);
        // Oferta de um curso com marca: o checkout dele mora no endereço dele.
        const daMarca = env.AMBIENTE === 'local' ? null : await marcaDaOferta(env, oferta);
        if (daMarca) return Response.redirect(`${daMarca.url}${url.pathname}${url.search}`, 302);
        return checkoutHtml(paginaCheckout({ oferta, simulado: env.AMBIENTE === 'local' && !env.ASAAS_CHAVE, turnstileSite: env.TURNSTILE_SITE || null, rastrear: env.__rastreio || null, estrangeiros: await estrangeirosLigado(env) }));
      }
      if (ehRotaOauth(url.pathname)) return await rotasOauth(request, env, url);
      if (url.pathname.startsWith('/api/admin/')) return await apiPainel(request, env, ctx, url);
      if (url.pathname === '/api/busca') return await apiBusca(env, url);
      if (url.pathname === '/api/lead' && request.method === 'POST') return await apiLead(request, env);
      // Aviso na hora da Meta (comentário novo): o "Comenta X" responde em segundos (lib/gatilhos.js).
      if (url.pathname === '/api/redes/meta/webhook') return await webhookMeta(request, env, ctx, url);
      // Aviso do Resend (e-mail entregue, aberto, clicado, voltou, spam): a tela Suporte mostra (lib/emails.js).
      if (url.pathname === '/api/resend/webhook') return await webhookResend(request, env, ctx);
      const volta = url.pathname.match(/^\/api\/redes\/([a-z]+)\/retorno$/);
      if (volta) return await retornoConexao(request, env, url, volta[1]);
      if (url.pathname === '/admin') return Response.redirect(`${url.origin}/admin/`, 301);
      // O app "Vendas" (o painel instalado na tela de início): manifesto, service worker dos avisos e ícones.
      if (/^\/admin\/(sw\.js|manifest\.webmanifest|icone-\d+\.png)$/.test(url.pathname)) return await arquivoDoPainel(request, env, url);
      if (url.pathname.startsWith('/admin/')) return await painel(request, env);
      if (url.pathname === '/api/saude') {
        let banco = 'ok';
        try { await db.select(env, 'config', { select: 'chave', limite: 1 }); } catch { banco = 'fora'; }
        return json({ site: 'ok', banco, quando: new Date().toISOString() });
      }
      // SEO e GEO (lib/seo.js): robots com os robôs de IA, sitemap por tipo, llms.txt e a chave do IndexNow.
      if (url.pathname === '/robots.txt') return new Response(robotsBr(env.SITE_URL), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
      if (/^\/sitemap(-[a-z]+)?\.xml$/.test(url.pathname)) { const s = await sitemapBr(env, env.SITE_URL, url.pathname); if (s) return s; }
      if (url.pathname === '/llms.txt') return await llmsBr(env, env.SITE_URL);
      if (/^\/[a-f0-9]{32}\.txt$/.test(url.pathname)) { const k = await arquivoIndexNow(env, url.pathname); if (k) return k; }
      if (url.pathname === '/ads.txt') {
        const cfg = await C.config(env);
        const cli = (cfg.adsense && cfg.adsense.cliente || '').replace('ca-', '');
        return new Response(cli ? `google.com, ${cli}, DIRECT, f08c47fec0942fa0\n` : '', { status: cli ? 200 : 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
      }
      const ir = url.pathname.match(/^\/ir\/([0-9a-f-]{36})$/);
      if (ir) {
        // O destino vem do banco, nunca do endereço: assim /ir/ não vira redirecionamento aberto.
        const a = await db.um(env, 'anuncios', { id: `eq.${ir[1]}` }, 'id,link,produto:produtos(slug)');
        if (!a) return Response.redirect(`${url.origin}/cursos`, 302);
        ctx.waitUntil(contarAnuncio(env, [a.id], 'clique'));
        const destino = a.link ? urlSegura(a.link) : `/cursos/${a.produto ? a.produto.slug : ''}`;
        return Response.redirect(new URL(destino === '#' ? '/cursos' : destino, url.origin).toString(), 302);
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') throw new Erro(405, 'Método não permitido.');
      return await pagina(request, env, ctx, url);
    } catch (e) {
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/mcp')) return respostaErro(e);
      console.error('pagina', url.pathname, e && e.stack);
      return html(`<!doctype html><meta charset="utf-8"><title>Fora do ar</title><body style="background:#0b0b0c;color:#f5f1ea;font-family:system-ui;padding:3rem"><h1>O site está se ajustando.</h1><p>Tente de novo em alguns instantes.</p></body>`, 503, 'no-store');
    }
  },

  // Relógio de minuto em minuto. A cada 10 minutos, o completo: fila das redes, "Comenta X" e uma tarefa da vez (radar,
  // métricas ou posts). Nos outros minutos, só a fila e o "Comenta X" dos posts recentes. Ver lib/relogio.js.
  async scheduled(event, env, ctx) {
    const completo = event.cron !== '* * * * *' || new Date(event.scheduledTime).getUTCMinutes() % 10 === 0;
    const rodar = completo ? prepararAsaas(env).then(() => rodarRelogio(env, event.scheduledTime)) : rodarMinuto(env, event.scheduledTime);
    ctx.waitUntil(rodar.catch((e) => console.error('relogio', e && e.stack)));
  },
};

const PRIVACIDADE = `Esta política explica o que a Agência Setup faz com os dados de quem visita agenciasetup.com.br e de quem fala com a gente nas redes sociais.

## O que coletamos
- **Visitas e downloads:** contamos quantas vezes cada recurso foi baixado, o país e a página de origem. Não guardamos seu IP nem criamos perfil seu.
- **E-mail, se você deixar:** usamos só para avisar de recursos novos. Você pode pedir para sair a qualquer momento.

## Anúncios
Mostramos anúncios dos nossos próprios cursos e, em algumas páginas, anúncios do Google AdSense. O Google pode usar cookies para mostrar anúncios com base nas suas visitas a este e a outros sites. Você pode desativar a personalização em [Configurações de anúncios do Google](https://adssettings.google.com).

## Compras e área do aluno
- **Para comprar:** nome, e-mail, CPF e celular, que vão para o Asaas (nosso banco de pagamentos). O número do cartão é digitado na página do Asaas e não passa por nós.
- **Se a compra não terminar:** nome, e-mail e celular preenchidos no checkout ficam guardados mesmo sem você clicar em comprar (o CPF, não). Usamos só para ajudar você a concluir: até dois e-mails, com um link para parar, e uma mensagem da nossa equipe no WhatsApp.
- **De onde você veio:** guardamos um número de visitante (cookie nosso) e as marcas do link que você clicou (post, story, anúncio), para saber qual conteúdo vendeu. Sem IP.
- **Medição de anúncios:** quando ligados, o Pixel da Meta e o Google Analytics medem a visita ao checkout e a compra. A compra também é avisada à Meta pelo nosso servidor, com o e-mail e o celular embaralhados (hash), sem enviar os dados abertos.
- **Na área do aluno:** progresso das aulas, os materiais que você baixou, notas, comentários, criações e conquistas. Perfil público e ranking só com o seu aceite. Perguntas ao tutor de IA vão para a Anthropic (Claude) só para responder.
- **Reembolso:** pedido pelo app, mostramos o que você já usou (aulas e materiais baixados) e o motivo fica guardado com o pedido.

## Redes sociais
- **Comentários nos nossos posts:** quando você comenta a palavra pedida num post nosso no Instagram ou no Facebook, a rede nos manda o seu nome de usuário e o texto do comentário. Usamos isso para responder no post e mandar o material no direct, uma vez por post. O texto vai para a Anthropic (Claude) só para escrever a resposta.
- **Contas da agência ligadas ao painel:** o nosso painel se conecta só às contas da própria Agência Setup (Instagram, Facebook, YouTube e Pinterest), pelo login oficial de cada rede. Com elas publicamos e agendamos os nossos posts, pins e vídeos e lemos as métricas deles (alcance, salvos, cliques e seguidores). As chaves de acesso ficam cifradas no nosso servidor e não são vendidas nem passadas para ninguém. Fora os comentários acima, não guardamos dados de outras pessoas dessas redes.
- **Desligar:** a conexão pode ser desligada no nosso painel ou removida nas configurações de apps da própria rede. Para apagar um comentário guardado, escreva para contato@agenciasetup.com.br.

## Seus direitos (LGPD)
Você pode pedir acesso, correção ou exclusão dos seus dados pelo e-mail contato@agenciasetup.com.br.`;

const TERMOS = `Os recursos de agenciasetup.com.br são gratuitos para uso pessoal e comercial no seu próprio trabalho.

- Não revenda nem redistribua os arquivos como se fossem seus.
- Os recursos são oferecidos como estão. Confira o resultado antes de usar com clientes.
- Marcas e ferramentas citadas pertencem aos seus donos.

Dúvidas: contato@agenciasetup.com.br.`;
