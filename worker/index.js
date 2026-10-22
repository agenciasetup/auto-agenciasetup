// Worker da Agência Setup: site público, downloads, anúncios e o conector do Claude (/mcp).
// Os arquivos fixos (CSS, imagens) saem direto de public/; o resto passa por aqui.
import { db } from './nucleo/db.js';
import { Erro, esc, json, respostaErro, urlSegura } from './nucleo/util.js';
import * as C from './lib/conteudo.js';
import { escolher, contar as contarAnuncio } from './lib/anuncios.js';
import { servidorMcp } from './lib/mcp.js';
import { casca } from './render/casca.js';
import * as P from './render/paginas.js';

const POR_PAGINA = 24;

function html(corpo, status = 200, cache = 'public, max-age=60, s-maxage=300') {
  return new Response(corpo, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cache, 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' } });
}

// Conta as impressões dos anúncios mostrados, sem atrasar a página.
function registrar(env, ctx, anuncios) {
  const ids = Object.values(anuncios).filter(Boolean).map((a) => a.id);
  if (ids.length) ctx.waitUntil(contarAnuncio(env, ids, 'impressao'));
}

async function pagina(request, env, ctx, url) {
  const caminho = url.pathname.replace(/\/+$/, '') || '/';
  const [cfg, cats] = await Promise.all([C.config(env), C.categorias(env)]);
  const base = { cfg, caminho, url: env.SITE_URL };
  const n = Math.max(1, parseInt(url.searchParams.get('p') || '1', 10) || 1);

  if (caminho === '/') {
    const [r, a, anuncios] = await Promise.all([C.recursos(env, { limite: 6 }), C.artigos(env, { limite: 3 }), escolher(env, ['meio'])]);
    registrar(env, ctx, anuncios);
    return html(casca({ ...base, corpo: P.home({ recursos: r.linhas, artigos: a.linhas, cats, anuncios, cfg }), classe: 'pagina-home', ldjson: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Agência Setup', url: env.SITE_URL } }));
  }

  if (caminho === '/recursos') {
    const atual = cats.find((c) => c.slug === url.searchParams.get('c')) || null;
    const [r, anuncios] = await Promise.all([C.recursos(env, { categoria: atual && atual.id, limite: POR_PAGINA, offset: (n - 1) * POR_PAGINA }), escolher(env, ['fim'], { categoria_id: atual && atual.id })]);
    registrar(env, ctx, anuncios);
    return html(casca({ ...base, titulo: atual ? `Recursos de ${atual.nome}` : 'Recursos grátis', descricao: atual?.descricao, caminho: atual ? `/recursos?c=${atual.slug}` : '/recursos', corpo: P.listaRecursos({ recursos: r.linhas, total: r.total, cats, atual, pagina: n, porPagina: POR_PAGINA, anuncios, cfg }) }));
  }

  let m = caminho.match(/^\/recursos\/([a-z0-9-]+)$/);
  if (m) {
    const r = await C.recurso(env, m[1]);
    if (!r) return naoEncontrada(base);
    const anuncios = await escolher(env, ['lateral', 'fim'], { tags: r.tags, categoria_id: r.categoria_id });
    registrar(env, ctx, anuncios);
    return html(casca({ ...base, titulo: r.titulo, descricao: r.resumo, imagem: r.capa_url, corpo: P.paginaRecurso({ r, cats, anuncios, cfg }), ldjson: { '@context': 'https://schema.org', '@type': 'CreativeWork', name: r.titulo, description: r.resumo, isAccessibleForFree: true, datePublished: r.publicado_em, publisher: { '@type': 'Organization', name: 'Agência Setup' } } }));
  }

  m = caminho.match(/^\/baixar\/([a-z0-9-]+)$/);
  if (m) {
    const r = await C.recurso(env, m[1]);
    const destino = r && (r.arquivo_url || r.link_externo);
    if (!destino) return naoEncontrada(base);
    const origem = (request.headers.get('referer') || '').slice(0, 200) || null;
    ctx.waitUntil(db.rpc(env, 'contar_download', { p_recurso: r.id, p_origem: origem, p_pais: request.cf?.country || null }).catch(() => {}));
    return Response.redirect(urlSegura(destino), 302);
  }

  if (caminho === '/novidades') {
    const a = await C.artigos(env, { limite: POR_PAGINA, offset: (n - 1) * POR_PAGINA });
    return html(casca({ ...base, titulo: 'Novidades', descricao: 'O que mudou nas ferramentas de IA e o que isso muda no seu trabalho.', corpo: P.listaArtigos({ artigos: a.linhas, total: a.total, cats, pagina: n, porPagina: POR_PAGINA, cfg }) }));
  }

  m = caminho.match(/^\/novidades\/([a-z0-9-]+)$/);
  if (m) {
    const a = await C.artigo(env, m[1]);
    if (!a) return naoEncontrada(base);
    const anuncios = await escolher(env, ['meio', 'lateral'], { tags: a.tags, categoria_id: a.categoria_id });
    registrar(env, ctx, anuncios);
    return html(casca({ ...base, titulo: a.titulo, descricao: a.resumo, imagem: a.capa_url, corpo: P.paginaArtigo({ a, cats, anuncios, cfg }), ldjson: { '@context': 'https://schema.org', '@type': 'Article', headline: a.titulo, description: a.resumo, datePublished: a.publicado_em, dateModified: a.atualizado_em, image: a.capa_url || undefined, publisher: { '@type': 'Organization', name: 'Agência Setup' } } }));
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

function naoEncontrada(base) {
  return html(casca({ ...base, titulo: 'Página não encontrada', corpo: P.naoEncontrada(), noindex: true }), 404, 'no-store');
}

async function sitemap(env) {
  const site = env.SITE_URL;
  const fixos = ['/', '/recursos', '/novidades', '/cursos'].map((loc) => ({ loc }));
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
      if (url.pathname === '/api/saude') {
        let banco = 'ok';
        try { await db.select(env, 'config', { select: 'chave', limite: 1 }); } catch { banco = 'fora'; }
        return json({ site: 'ok', banco, quando: new Date().toISOString() });
      }
      if (url.pathname === '/robots.txt') return new Response(`User-agent: *\nAllow: /\nDisallow: /baixar/\nDisallow: /ir/\nDisallow: /mcp\nSitemap: ${env.SITE_URL}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
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

  // Relógio: publica o que foi agendado. A publicação nas redes entra quando cada rede for conectada.
  async scheduled(event, env, ctx) {
    const agora = new Date().toISOString();
    for (const tabela of ['recursos', 'artigos']) {
      ctx.waitUntil(db.update(env, tabela, { status: 'eq.rascunho', 'seo->>agendar_para': `lte.${agora}` }, { status: 'publicado', publicado_em: agora }, 'id').catch((e) => console.error('agendados', tabela, e && e.message)));
    }
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
