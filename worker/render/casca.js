// A casca de toda página: <head>, cabeçalho, rodapé. O visual vem de public/estatico/site.css.
import { esc, jsonScript } from '../nucleo/util.js';

const FONTES = 'https://fonts.googleapis.com/css2?family=Anton&family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap';

export function casca({ titulo, descricao, caminho = '/', imagem, cfg = {}, corpo, classe = '', ldjson, semCabecalho = false, noindex = false, url }) {
  const site = cfg.site || {};
  const base = url || `https://${site.dominio || 'agenciasetup.com.br'}`;
  const tituloCompleto = titulo ? `${titulo} | ${site.nome || 'Agência Setup'}` : `${site.nome || 'Agência Setup'}: IA para quem cria`;
  const desc = descricao || site.descricao || '';
  const ad = cfg.adsense && cfg.adsense.ativo && /^ca-pub-\d+$/.test(cfg.adsense.cliente || '') ? cfg.adsense.cliente : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(tituloCompleto)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(base + caminho)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.nome || 'Agência Setup')}">
<meta property="og:title" content="${esc(titulo || tituloCompleto)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(base + caminho)}">
${imagem ? `<meta property="og:image" content="${esc(imagem)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0b0b0c">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTES}">
<link rel="stylesheet" href="/estatico/site.css">
${ad ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(ad)}" crossorigin="anonymous"></script>` : ''}
${ldjson ? `<script type="application/ld+json">${jsonScript(ldjson)}</script>` : ''}
</head>
<body class="${esc(classe)}">
<div class="grao" aria-hidden="true"></div>
${semCabecalho ? '' : cabecalho(caminho)}
<main id="conteudo">
${corpo}
</main>
${semCabecalho ? '' : rodape(site)}
<script src="/estatico/site.js" defer></script>
</body>
</html>`;
}

function cabecalho(caminho) {
  const item = (href, txt) => `<a href="${href}"${caminho.startsWith(href) ? ' aria-current="page"' : ''}>${txt}</a>`;
  return `<header class="topo">
  <div class="faixa">
    <a class="marca" href="/" aria-label="Agência Setup, início"><span class="marca-calango">Calango</span><span class="marca-sep">|</span><span>Agência Setup</span></a>
    <nav class="menu" aria-label="Principal">
      ${item('/recursos', 'Recursos')}
      ${item('/novidades', 'Novidades')}
      ${item('/cursos', 'Cursos')}
    </nav>
  </div>
</header>`;
}

function rodape(site) {
  const ano = new Date().getFullYear();
  return `<footer class="rodape">
  <div class="faixa">
    <div>
      <p class="rodape-marca">Agência Setup</p>
      <p class="mudo">IA aplicada ao Social Media e ao Design. Recursos gratuitos, sem cadastro obrigatório.</p>
    </div>
    <nav aria-label="Rodapé">
      <a href="/recursos">Recursos</a>
      <a href="/novidades">Novidades</a>
      <a href="/cursos">Cursos</a>
      <a href="https://instagram.com/${esc(site.instagram || 'agenciasetup')}" target="_blank" rel="noopener">Instagram</a>
      <a href="/privacidade">Privacidade</a>
      <a href="/termos">Termos</a>
    </nav>
  </div>
  <p class="faixa mudo pequeno">© ${ano} Agência Setup. Feito com IA, revisado por gente.</p>
</footer>`;
}
