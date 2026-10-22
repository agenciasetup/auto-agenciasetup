// Worker da Agência Setup: site público, downloads, anúncios, painel (/admin), API do painel (/api/admin),
// login do conector (/oauth) e o conector do Claude (/mcp). Arquivos fixos (CSS, imagens, painel compilado) saem de public/.
import { db } from './nucleo/db.js';
import { Erro, esc, json, respostaErro, urlSegura } from './nucleo/util.js';
import { ehRotaOauth, rotasOauth } from './nucleo/oauth.js';
import * as C from './lib/conteudo.js';
import { escolher, contar as contarAnuncio } from './lib/anuncios.js';
import { servidorMcp } from './lib/mcp.js';
import { apiPainel } from './lib/api/painel.js';
import { retornoConexao } from './plataformas/conexao.js';
import { processarFila } from './plataformas/fila.js';
import { casca } from './render/casca.js';
import * as P from './render/paginas.js';

// O painel é um app de uma página só: qualquer /admin/... devolve o mesmo index.html compilado.
async function painel(request, env) {
  const r = await env.ASSETS.fetch(new Request(new URL('/admin/index.html', request.url)));
  if (!r.ok) return new Response('O painel ainda não foi montado (npm run painel).', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  return new Response(r.body, {
    headers: {
      'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'x-robots-tag': 'noindex',
      'referrer-policy': 'same-origin', 'x-content-type-options': 'nosniff',
    },
  });
}

const POR_PAGINA = 24;

function html(corpo, status = 200, cache = 'public, max-age=60, s-maxage=300') {
  return new Response(corpo, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cache, 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' } });
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
      ldjson: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Agência Setup', url: env.SITE_URL, potentialAction: { '@type': 'SearchAction', target: `${env.SITE_URL}/busca?q={q}`, 'query-input': 'required name=q' } },
    }));
  }

  if (caminho === '/recursos') return lista(env, ctx, base, url, cats, n, null);
  if (caminho === '/agentes') return lista(env, ctx, base, url, cats, n, 'agente');

  let m = caminho.match(/^\/recursos\/([a-z0-9-]+)$/);
  if (m) {
    const r = await C.recurso(env, m[1]);
    if (!r) return naoEncontrada(base);
    const [relacionados, anuncios] = await Promise.all([C.relacionados(env, r, 3), escolher(env, ['lateral', 'fim'], { tags: [...(r.tags || []), r.tipo], categoria_id: r.categoria_id })]);
    registrar(env, ctx, anuncios);
    const capa = r.capa_url || (Array.isArray(r.galeria) && r.galeria[0] && r.galeria[0].url) || undefined;
    return html(casca({
      ...base, titulo: r.titulo, descricao: r.resumo, imagem: capa, classe: 'pagina-recurso', aba: r.tipo === 'agente' ? '/agentes' : '/recursos',
      corpo: P.paginaRecurso({ r, cats, relacionados, anuncios, cfg }),
      ldjson: { '@context': 'https://schema.org', '@type': r.tipo === 'agente' ? 'SoftwareApplication' : 'CreativeWork', name: r.titulo, description: r.resumo, isAccessibleForFree: true, image: capa, datePublished: r.publicado_em, dateModified: r.atualizado_em, offers: { '@type': 'Offer', price: 0, priceCurrency: 'BRL' }, publisher: { '@type': 'Organization', name: 'Agência Setup' } },
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

  if (caminho === '/novidades') {
    const a = await C.artigos(env, { limite: POR_PAGINA, offset: (n - 1) * POR_PAGINA });
    return html(casca({ ...base, titulo: 'Novidades da IA', descricao: 'O que mudou nas ferramentas de IA e o que isso muda no seu trabalho.', corpo: P.listaNovidades({ itens: a.linhas, total: a.total, pagina: n, porPagina: POR_PAGINA, cfg }) }));
  }

  m = caminho.match(/^\/novidades\/([a-z0-9-]+)$/);
  if (m) {
    const a = await C.artigo(env, m[1]);
    if (!a) return naoEncontrada(base);
    const [anuncios, recurso] = await Promise.all([
      escolher(env, ['meio'], { tags: a.tags, categoria_id: a.categoria_id }),
      a.recurso_id ? db.um(env, 'recursos', { id: `eq.${a.recurso_id}`, status: 'eq.publicado' }).catch(() => null) : null,
    ]);
    registrar(env, ctx, anuncios);
    return html(casca({ ...base, titulo: a.titulo, descricao: a.resumo, imagem: a.capa_url, corpo: P.paginaNovidade({ a, recurso, anuncios, cfg }), ldjson: { '@context': 'https://schema.org', '@type': 'Article', headline: a.titulo, description: a.resumo, datePublished: a.publicado_em, dateModified: a.atualizado_em, image: a.capa_url || undefined, publisher: { '@type': 'Organization', name: 'Agência Setup' } } }));
  }

  if (caminho === '/cursos') {
    const lps = await db.select(env, 'landing_pages', { filtros: { status: 'eq.publicado' }, select: 'slug,titulo', ordem: 'publicado_em.desc' });
    return html(casca({ ...base, titulo: 'Cursos', corpo: P.listaCursos({ lps }) }));
  }

  m = caminho.match(/^\/cursos\/([a-z0-9-]+)$/);
  if (m) {
    const lp = await C.landing(env, m[1]);
    if (!lp) return naoEncontrada(base);
    return html(casca({ ...base, titulo: lp.seo?.titulo || lp.titulo, descricao: lp.seo?.descricao || lp.produto?.chamada, imagem: lp.seo?.imagem || lp.produto?.imagem_url, corpo: P.landingPage({ lp }), classe: 'pagina-lp' }));
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
  const voltar = (ok) => (tipo.includes('application/json') ? json({ ok }, ok ? 200 : 400) : Response.redirect(new URL(`/?inscrito=${ok ? 1 : 0}#receber`, request.url).toString(), 303));
  if (d.site) return voltar(true); // armadilha para robô: finge que deu certo
  if (!/^[^@\s]{1,64}@[^@\s]{1,190}\.[a-z]{2,24}$/i.test(email)) return voltar(false);
  await db.rpc(env, 'guardar_lead', { p_email: email, p_origem: String(d.origem || 'site').slice(0, 60), p_recurso: null });
  return voltar(true);
}

function naoEncontrada(base) {
  return html(casca({ ...base, titulo: 'Página não encontrada', corpo: P.naoEncontrada(), noindex: true }), 404, 'no-store');
}

async function sitemap(env) {
  const site = env.SITE_URL;
  const fixos = ['/', '/recursos', '/agentes', '/novidades', '/cursos'].map((loc) => ({ loc }));
  const todos = [...fixos, ...(await C.enderecos(env))];
  const corpo = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${todos.map((u) => `<url><loc>${esc(site + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>`;
  return new Response(corpo, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=600' } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // www e endereços antigos vão para o domínio principal.
    if (url.hostname === 'www.agenciasetup.com.br') return Response.redirect(`https://agenciasetup.com.br${url.pathname}${url.search}`, 301);
    try {
      if (url.pathname === '/mcp') return await servidorMcp(request, env, ctx);
      if (ehRotaOauth(url.pathname)) return await rotasOauth(request, env, url);
      if (url.pathname.startsWith('/api/admin/')) return await apiPainel(request, env, ctx, url);
      if (url.pathname === '/api/busca') return await apiBusca(env, url);
      if (url.pathname === '/api/lead' && request.method === 'POST') return await apiLead(request, env);
      const volta = url.pathname.match(/^\/api\/redes\/([a-z]+)\/retorno$/);
      if (volta) return await retornoConexao(request, env, url, volta[1]);
      if (url.pathname === '/admin') return Response.redirect(`${url.origin}/admin/`, 301);
      if (url.pathname.startsWith('/admin/')) return await painel(request, env);
      if (url.pathname === '/api/saude') {
        let banco = 'ok';
        try { await db.select(env, 'config', { select: 'chave', limite: 1 }); } catch { banco = 'fora'; }
        return json({ site: 'ok', banco, quando: new Date().toISOString() });
      }
      if (url.pathname === '/robots.txt') return new Response(`User-agent: *\nAllow: /\nDisallow: /baixar/\nDisallow: /usar/\nDisallow: /busca\nDisallow: /ir/\nDisallow: /mcp\nDisallow: /admin/\nDisallow: /api/\nDisallow: /oauth/\nSitemap: ${env.SITE_URL}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
      if (url.pathname === '/sitemap.xml') return await sitemap(env);
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
      if (url.pathname.startsWith('/api/') || url.pathname === '/mcp') return respostaErro(e);
      console.error('pagina', url.pathname, e && e.stack);
      return html(`<!doctype html><meta charset="utf-8"><title>Fora do ar</title><body style="background:#0b0b0c;color:#f5f1ea;font-family:system-ui;padding:3rem"><h1>O site está se ajustando.</h1><p>Tente de novo em alguns instantes.</p></body>`, 503, 'no-store');
    }
  },

  // Relógio (a cada 10 minutos): publica as peças agendadas, cada uma pelo módulo da sua rede.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(processarFila(env).catch((e) => console.error('fila', e && e.stack)));
  },
};

const PRIVACIDADE = `Esta política explica o que a Agência Setup faz com os dados de quem visita agenciasetup.com.br.

## O que coletamos
- **Visitas e downloads:** contamos quantas vezes cada recurso foi baixado, o país e a página de origem. Não guardamos seu IP nem criamos perfil seu.
- **E-mail, se você deixar:** usamos só para avisar de recursos novos. Você pode pedir para sair a qualquer momento.

## Anúncios
Mostramos anúncios dos nossos próprios cursos e, em algumas páginas, anúncios do Google AdSense. O Google pode usar cookies para mostrar anúncios com base nas suas visitas a este e a outros sites. Você pode desativar a personalização em [Configurações de anúncios do Google](https://adssettings.google.com).

## Seus direitos (LGPD)
Você pode pedir acesso, correção ou exclusão dos seus dados pelo e-mail contato@agenciasetup.com.br.`;

const TERMOS = `Os recursos de agenciasetup.com.br são gratuitos para uso pessoal e comercial no seu próprio trabalho.

- Não revenda nem redistribua os arquivos como se fossem seus.
- Os recursos são oferecidos como estão. Confira o resultado antes de usar com clientes.
- Marcas e ferramentas citadas pertencem aos seus donos.

Dúvidas: contato@agenciasetup.com.br.`;
