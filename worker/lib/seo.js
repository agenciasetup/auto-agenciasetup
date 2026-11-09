// SEO e GEO do site (fase A de docs/seo-geo.md): robots com os robôs de IA, llms.txt, dados estruturados (quem somos,
// migalhas, listas), sitemap separado por tipo e IndexNow (avisa Bing e Yandex na hora em que algo é publicado; o
// ChatGPT busca pelo índice do Bing). Modelo: o jk-portal (src/lib/schema, src/lib/seo, src/app/llms.txt).
import { db } from '../nucleo/db.js';
import { esc } from '../nucleo/util.js';
import { ASSUNTOS, caminhoArtigo } from './assuntos.js';

const INSTAGRAM = 'https://instagram.com/agenciasetup';
const INSTAGRAM_FILIPE = 'https://instagram.com/lipealourenco';
const DESCRICAO = 'Recursos gratuitos e novidades sobre IA aplicada ao Social Media e ao Design: prompts, templates, planilhas e agentes de IA prontos para usar, e o mini curso de posts automáticos com o Claude.';

// ---------------------------------------------------------------- robots
// Os robôs de IA entram no mesmo grupo do "*": as mesmas regras, e o nome escrito deixa claro que são bem-vindos.
const ROBOS_IA = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot'];
const agentes = () => ['*', ...ROBOS_IA].map((a) => `User-agent: ${a}`).join('\n');

export function robotsBr(site) {
  return `${agentes()}\nAllow: /\nDisallow: /baixar/\nDisallow: /usar/\nDisallow: /busca\nDisallow: /ir/\nDisallow: /l/\nDisallow: /checkout/\nDisallow: /mcp\nDisallow: /admin/\nDisallow: /api/\nDisallow: /oauth/\nSitemap: ${site}/sitemap.xml\n`;
}

// O site em inglês (agenciasetup.com): só a página de venda, o material grátis, os termos e o llms.txt.
export function robotsEn(site) {
  return `${agentes()}\nAllow: /$\nAllow: /free/\nAllow: /terms\nAllow: /privacy\nAllow: /refunds\nAllow: /llms.txt\nAllow: /img/\nAllow: /estatico/\nDisallow: /free/*/download\nDisallow: /free/*/open\nDisallow: /\nSitemap: ${site}/sitemap.xml\n`;
}

// ---------------------------------------------------------------- dados estruturados
// Quem fala: a Agência Setup e o fundador. Os dados vêm do próprio site do Calango Studio (nosso); nada inventado.
export function entidades(site) {
  const org = {
    '@type': 'Organization', '@id': `${site}/#organizacao`, name: 'Agência Setup', url: `${site}/`, description: DESCRICAO,
    logo: { '@type': 'ImageObject', url: `${site}/img/logo-setup.png`, width: 1024, height: 1024 },
    email: 'contato@agenciasetup.com.br', sameAs: [INSTAGRAM, 'https://agenciasetup.com'], founder: { '@id': `${site}/#filipe` },
    knowsAbout: ['Inteligência Artificial para Design', 'Social Media', 'Claude', 'Criação de Conteúdo Digital', 'Design Gráfico'],
  };
  const filipe = {
    '@type': 'Person', '@id': `${site}/#filipe`, name: 'Filipe Lourenço', jobTitle: 'Designer e Empreendedor Digital',
    sameAs: [INSTAGRAM_FILIPE], worksFor: { '@id': org['@id'] },
    knowsAbout: ['Design Gráfico', 'Inteligência Artificial para Design', 'Criação de Conteúdo Digital', 'Produção de Conteúdo para Redes Sociais'],
  };
  const website = {
    '@type': 'WebSite', '@id': `${site}/#site`, name: 'Agência Setup', url: `${site}/`, inLanguage: 'pt-BR', publisher: { '@id': org['@id'] },
    potentialAction: { '@type': 'SearchAction', target: `${site}/busca?q={q}`, 'query-input': 'required name=q' },
  };
  return { org, filipe, website };
}

export const grafo = (...nos) => ({ '@context': 'https://schema.org', '@graph': nos.flat().filter(Boolean) });

// Migalhas: [['Início', '/'], ['Recursos', '/recursos'], ['Título', '/recursos/slug']].
export function migalhas(site, itens) {
  return { '@type': 'BreadcrumbList', itemListElement: itens.map(([nome, caminho], i) => ({ '@type': 'ListItem', position: i + 1, name: nome, item: `${site}${caminho === '/' ? '/' : caminho}` })) };
}

// Uma página de lista: o que ela tem, na ordem, para o buscador e a IA entenderem a coleção.
export function colecao(site, { caminho, nome, descricao, itens }) {
  return {
    '@type': 'CollectionPage', '@id': `${site}${caminho}#pagina`, url: `${site}${caminho}`, name: nome, description: descricao || undefined,
    inLanguage: 'pt-BR', isPartOf: { '@id': `${site}/#site` },
    mainEntity: { '@type': 'ItemList', numberOfItems: itens.length, itemListElement: itens.map(([titulo, c], i) => ({ '@type': 'ListItem', position: i + 1, url: `${site}${c}`, name: titulo })) },
  };
}

// ---------------------------------------------------------------- sitemap
const urlset = (site, itens) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${itens.map((u) => `<url><loc>${esc(site + u.loc)}</loc>${u.lastmod ? `<lastmod>${String(u.lastmod).slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>`;
const xml = (corpo) => new Response(corpo, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=600' } });

export const PARTES_SITEMAP = ['paginas', 'recursos', 'novidades', 'cursos'];

async function itensDoSitemap(env, parte) {
  if (parte === 'paginas') {
    // As fixas, os assuntos com artigo publicado (/ia, /equipamentos...) e as páginas de autor.
    const [arts, autores] = await Promise.all([
      db.select(env, 'artigos', { filtros: { status: 'eq.publicado' }, select: 'assunto', limite: 5000 }).catch(() => []),
      db.select(env, 'autores', { filtros: { ativo: 'eq.true' }, select: 'slug,atualizado_em', limite: 100 }).catch(() => []),
    ]);
    const hubs = [...new Set(arts.map((a) => a.assunto).filter((x) => x && x !== 'novidades'))];
    return [...['/', '/recursos', '/agentes', '/novidades', '/cursos', ...hubs.map((h) => `/${h}`)].map((loc) => ({ loc })), ...autores.map((a) => ({ loc: `/autor/${a.slug}`, lastmod: a.atualizado_em }))];
  }
  if (parte === 'recursos') {
    const r = await db.select(env, 'recursos', { filtros: { status: 'eq.publicado', perfil: 'eq.br' }, select: 'slug,atualizado_em', ordem: 'publicado_em.desc', limite: 5000 });
    return r.map((x) => ({ loc: `/recursos/${x.slug}`, lastmod: x.atualizado_em }));
  }
  if (parte === 'novidades') {
    // Todos os artigos (novidades, guias, tutoriais...), cada um no endereço do seu assunto.
    const a = await db.select(env, 'artigos', { filtros: { status: 'eq.publicado' }, select: 'slug,assunto,atualizado_em', ordem: 'publicado_em.desc', limite: 5000 });
    return a.map((x) => ({ loc: caminhoArtigo(x), lastmod: x.atualizado_em }));
  }
  if (parte === 'cursos') {
    const l = await db.select(env, 'landing_pages', { filtros: { status: 'eq.publicado' }, select: 'slug,seo,atualizado_em', limite: 500 });
    // Fora da vitrine (curso com marca própria) não entra: o endereço dele é o da marca.
    return l.filter((x) => !(x.seo && x.seo.vitrine === false)).map((x) => ({ loc: `/cursos/${x.slug}`, lastmod: x.atualizado_em }));
  }
  return null;
}

// /sitemap.xml é o índice; /sitemap-<parte>.xml, cada tipo (o Search Console mostra a indexação de cada um).
export async function sitemapBr(env, site, caminho) {
  if (caminho === '/sitemap.xml') {
    return xml(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PARTES_SITEMAP.map((p) => `<sitemap><loc>${esc(`${site}/sitemap-${p}.xml`)}</loc></sitemap>`).join('\n')}\n</sitemapindex>`);
  }
  const m = caminho.match(/^\/sitemap-([a-z]+)\.xml$/);
  const itens = m ? await itensDoSitemap(env, m[1]) : null;
  return itens ? xml(urlset(site, itens)) : null;
}

export async function sitemapEn(env, site) {
  const rec = await db.select(env, 'recursos', { filtros: { status: 'eq.publicado', perfil: 'eq.en' }, select: 'slug,atualizado_em', limite: 2000 }).catch(() => []);
  return xml(urlset(site, [{ loc: '/' }, ...rec.map((r) => ({ loc: `/free/${r.slug}`, lastmod: r.atualizado_em }))]));
}

// ---------------------------------------------------------------- llms.txt
// O mapa do site para as IAs (llmstxt.org): quem somos e cada página com uma linha do que ela resolve.
const linha = (titulo, url, resumo) => `- [${String(titulo).replace(/[[\]]/g, '')}](${url})${resumo ? `: ${String(resumo).replace(/\s+/g, ' ').trim().slice(0, 220)}` : ''}`;
const txt = (corpo) => new Response(corpo, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });

export async function llmsBr(env, site) {
  const [rec, art, lps] = await Promise.all([
    db.select(env, 'recursos', { filtros: { status: 'eq.publicado', perfil: 'eq.br' }, select: 'slug,titulo,resumo,tipo', ordem: 'publicado_em.desc', limite: 500 }),
    db.select(env, 'artigos', { filtros: { status: 'eq.publicado' }, select: 'slug,titulo,resumo,assunto,resposta', ordem: 'publicado_em.desc', limite: 300 }),
    db.select(env, 'landing_pages', { filtros: { status: 'eq.publicado' }, select: 'slug,titulo,seo,produto:produtos(chamada)', limite: 50 }),
  ]);
  const cursos = lps.filter((l) => !(l.seo && l.seo.vitrine === false));
  const agentesIa = rec.filter((r) => r.tipo === 'agente');
  const outros = rec.filter((r) => r.tipo !== 'agente');
  const partes = [
    '# Agência Setup',
    '',
    `> ${DESCRICAO}`,
    '',
    'Site em português do Brasil, feito pela Agência Setup (fundador: Filipe Lourenço). Os recursos são grátis e sem cadastro; cada página explica para que serve e como usar. Versão em inglês: https://agenciasetup.com/llms.txt',
    '',
    '## Cursos',
    ...cursos.map((l) => linha(l.titulo, `${site}/cursos/${l.slug}`, (l.seo && l.seo.descricao) || (l.produto && l.produto.chamada))),
    '',
    '## Recursos grátis',
    ...outros.map((r) => linha(r.titulo, `${site}/recursos/${r.slug}`, r.resumo)),
  ];
  if (agentesIa.length) partes.push('', '## Agentes de IA prontos', ...agentesIa.map((r) => linha(r.titulo, `${site}/recursos/${r.slug}`, r.resumo)));
  // Os artigos por assunto; a resposta rápida, quando tem, é a melhor linha para a IA citar.
  for (const [chave, s] of Object.entries(ASSUNTOS)) {
    const doAssunto = art.filter((a) => (a.assunto || 'novidades') === chave);
    if (doAssunto.length) partes.push('', `## ${s.nome}`, ...doAssunto.map((a) => linha(a.titulo, `${site}${caminhoArtigo(a)}`, a.resposta || a.resumo)));
  }
  partes.push('', '## Sobre', linha('Filipe Lourenço, fundador', `${site}/autor/filipe-lourenco`), linha('Instagram da Agência Setup', INSTAGRAM), linha('Filipe Lourenço no Instagram', INSTAGRAM_FILIPE), '- Contato: contato@agenciasetup.com.br', '');
  return txt(partes.join('\n'));
}

export async function llmsEn(env, site, marca) {
  const [rec, lp] = await Promise.all([
    db.select(env, 'recursos', { filtros: { status: 'eq.publicado', perfil: 'eq.en' }, select: 'slug,titulo,resumo', ordem: 'publicado_em.desc', limite: 500 }).catch(() => []),
    marca && marca.curso ? db.um(env, 'landing_pages', { slug: `eq.${marca.curso.slug}`, status: 'eq.publicado' }, 'titulo,seo,produto:produtos(chamada)').catch(() => null) : null,
  ]);
  const partes = [
    '# Setup Agency (Agência Setup)',
    '',
    '> Free AI resources for social media and design, and the mini course "Posts on Autopilot with Claude": set up Claude once and get your posts written and designed in your own style every day.',
    '',
    'English site of Agência Setup (founder: Filipe Lourenço). The Portuguese site is https://agenciasetup.com.br/llms.txt',
    '',
    '## Course',
    linha(lp ? lp.titulo : 'Posts on Autopilot with Claude', `${site}/`, lp && ((lp.seo && lp.seo.descricao) || (lp.produto && lp.produto.chamada))),
  ];
  if (rec.length) partes.push('', '## Free resources', ...rec.map((r) => linha(r.titulo, `${site}/free/${r.slug}`, r.resumo)));
  partes.push('', '## About', linha('Instagram', 'https://instagram.com/setupagency_eng'), '');
  return txt(partes.join('\n'));
}

// ---------------------------------------------------------------- IndexNow
// A chave nasce sozinha na primeira vez (config.indexnow) e fica pública em /<chave>.txt nos dois sites, como o
// protocolo pede. Não é segredo: só prova que o aviso veio do dono do site.
let chaveGuardada = null;
export async function chaveIndexNow(env) {
  if (chaveGuardada) return chaveGuardada;
  let l = await db.um(env, 'config', { chave: 'eq.indexnow' });
  if (!l) {
    const k = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
    await db.insert(env, 'config', { chave: 'indexnow', valor: { chave: k, criado_em: new Date().toISOString() } }, { ignorar: true, conflito: 'chave', select: 'chave' });
    l = await db.um(env, 'config', { chave: 'eq.indexnow' });
  }
  chaveGuardada = l && l.valor && l.valor.chave;
  return chaveGuardada;
}

// /<chave>.txt: devolve a chave, ou null para seguir o caminho normal (404 do site).
export async function arquivoIndexNow(env, caminho) {
  const m = caminho.match(/^\/([a-f0-9]{32})\.txt$/);
  if (!m) return null;
  const k = await chaveIndexNow(env).catch(() => null);
  return k === m[1] ? new Response(k, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' } }) : null;
}

// Avisa o IndexNow das páginas novas ou mudadas, um pedido por site. Nunca derruba quem chamou.
export async function avisarIndexNow(env, urls) {
  try {
    if (env.AMBIENTE === 'local') return { ok: false, motivo: 'no computador não avisa' };
    const lista = [...new Set((urls || []).filter((u) => /^https:\/\//.test(u || '')))];
    if (!lista.length) return { ok: false, motivo: 'sem endereço' };
    const chave = await chaveIndexNow(env);
    const porSite = new Map();
    for (const u of lista) { const h = new URL(u).host; porSite.set(h, [...(porSite.get(h) || []), u]); }
    const r = await Promise.all([...porSite].map(async ([host, urlList]) => {
      const resp = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host, key: chave, keyLocation: `https://${host}/${chave}.txt`, urlList: urlList.slice(0, 1000) }),
        signal: AbortSignal.timeout(8000),
      });
      return { host, status: resp.status };
    }));
    return { ok: r.every((x) => x.status === 200 || x.status === 202), sites: r };
  } catch (e) {
    console.error('indexnow', e && e.message);
    return { ok: false, motivo: e && e.message };
  }
}
