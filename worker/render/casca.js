// A moldura de toda página: <head>, cabeçalho (vidro), abas embaixo no celular, busca e rodapé.
// O visual vem de public/estatico/site.css; o comportamento (busca, aparecer na rolagem), de site.js.
import { esc, jsonScript } from '../nucleo/util.js';
import { MARCA, icone, sprite } from './icones.js';

const FONTES = 'https://fonts.googleapis.com/css2?family=Inter:wght@400..700&family=Instrument+Serif:ital@1&display=swap';

// Seções do site: o que aparece no menu do computador e nas abas do celular.
const NAV = [
  { href: '/recursos', t: 'Recursos', i: 'grade' },
  { href: '/agentes', t: 'Agentes', i: 'agente' },
  { href: '/novidades', t: 'Novidades', i: 'novidades' },
  { href: '/cursos', t: 'Cursos', i: 'curso' },
];
const ativo = (caminho, href) => (href === '/' ? caminho === '/' : caminho === href || caminho.startsWith(`${href}/`) || caminho.startsWith(`${href}?`));

// aba: qual seção acende no menu (ex.: a página de um agente acende "Agentes"); sem ela, vale o caminho.
export function casca({ titulo, descricao, caminho = '/', aba, imagem, cfg = {}, corpo, classe = '', ldjson, semMolde = false, noindex = false, url, extraFim = '' }) {
  const site = cfg.site || {};
  const base = url || `https://${site.dominio || 'agenciasetup.com.br'}`;
  const nome = site.nome || 'Agência Setup';
  const tituloCompleto = titulo ? `${titulo} | ${nome}` : `${nome}: recursos e agentes de IA grátis para quem cria conteúdo`;
  const desc = descricao || site.descricao || 'Prompts, templates, planilhas e agentes de IA prontos para usar no Social Media e no Design. Grátis e sem cadastro.';
  const ad = cfg.adsense && cfg.adsense.ativo && /^ca-pub-\d+$/.test(cfg.adsense.cliente || '') ? cfg.adsense.cliente : '';
  const canonico = base + caminho.split('#')[0];
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(tituloCompleto)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonico)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${esc(nome)}">
<meta property="og:title" content="${esc(titulo || tituloCompleto)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonico)}">
${imagem ? `<meta property="og:image" content="${esc(imagem)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#09090a">
<meta name="color-scheme" content="dark">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTES}">
<link rel="stylesheet" href="/estatico/site.css?v=4">
<script>document.documentElement.classList.add('js');setTimeout(function(){if(!document.documentElement.classList.contains('revelar-ok'))document.documentElement.classList.remove('js')},2500)</script>
${ad ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(ad)}" crossorigin="anonymous"></script>` : ''}
${ldjson ? `<script type="application/ld+json">${jsonScript(ldjson)}</script>` : ''}
</head>
<body class="${esc(classe)}">
${semMolde ? '' : cabecalho(aba || caminho)}
<main id="conteudo">
${corpo}
</main>
${semMolde ? '' : rodape(site) + abas(aba || caminho) + caixaBusca()}
${extraFim}
<script src="/estatico/site.js?v=4" defer></script>
</body>
</html>`;
}

function cabecalho(caminho) {
  return `<header class="topo" data-topo>
  <div class="faixa topo-faixa">
    <a class="logo" href="/" aria-label="Agência Setup, início">${MARCA}<span>Agência Setup</span></a>
    <nav class="nav" aria-label="Principal">
      ${NAV.map((n) => `<a href="${n.href}"${ativo(caminho, n.href) ? ' aria-current="page"' : ''}>${n.t}</a>`).join('')}
    </nav>
    <div class="topo-acoes">
      <a class="gatilho-busca" href="/busca" data-abrir-busca aria-label="Buscar recursos">${icone('busca')}<span class="rotulo">Buscar recursos…</span><kbd>Ctrl K</kbd></a>
    </div>
  </div>
</header>`;
}

function abas(caminho) {
  const item = (href, t, i) => `<a href="${href}"${ativo(caminho, href) ? ' aria-current="page"' : ''}>${icone(i)}<span>${t}</span></a>`;
  return `<nav class="abas" aria-label="Navegação">
  ${item('/', 'Início', 'inicio')}
  ${item('/recursos', 'Recursos', 'grade')}
  ${item('/agentes', 'Agentes', 'agente')}
  ${item('/novidades', 'Novidades', 'novidades')}
  <a href="/busca" data-abrir-busca${caminho.startsWith('/busca') ? ' aria-current="page"' : ''}>${icone('busca')}<span>Buscar</span></a>
</nav>`;
}

function caixaBusca() {
  return `<dialog class="busca-caixa" id="busca" aria-label="Buscar">
  <form class="busca-campo" action="/busca" role="search">
    ${icone('busca')}
    <input type="search" name="q" placeholder="Buscar prompts, agentes, planilhas…" autocomplete="off" enterkeyhint="search" aria-label="O que você procura?" data-busca-campo>
    <button type="button" class="bt bt-simples" data-fechar-busca>Fechar</button>
  </form>
  <div class="busca-resultados" data-busca-resultados></div>
  <div class="busca-dica"><span><kbd>↑</kbd> <kbd>↓</kbd> para navegar</span><span><kbd>Enter</kbd> para abrir</span><span><kbd>Esc</kbd> para fechar</span></div>
</dialog>
${sprite(['agente', 'prompt', 'template', 'planilha', 'automacao', 'guia', 'pack', 'ferramenta', 'video', 'novidades', 'busca', 'direita', 'fogo', 'camadas'])}`;
}

function rodape(site) {
  const ano = new Date().getFullYear();
  const insta = esc(site.instagram || 'agenciasetup');
  return `<footer class="rodape">
  <div class="faixa">
    <div class="rodape-grade">
      <div>
        <a class="logo" href="/">${MARCA}<span>Agência Setup</span></a>
        <p style="margin:14px 0 0;max-width:38ch">Recursos e agentes de IA para quem cria conteúdo. Testado no dia a dia da agência, grátis para você usar.</p>
        <div class="redes">
          <a class="bt bt-icone" href="https://instagram.com/${insta}" target="_blank" rel="noopener" aria-label="Instagram">${icone('instagram')}</a>
          <a class="bt bt-icone" href="mailto:contato@agenciasetup.com.br" aria-label="E-mail">${icone('email')}</a>
        </div>
      </div>
      <div>
        <h4>Explorar</h4>
        <ul><li><a href="/recursos">Recursos</a></li><li><a href="/agentes">Agentes de IA</a></li><li><a href="/novidades">Novidades</a></li><li><a href="/cursos">Cursos</a></li></ul>
      </div>
      <div>
        <h4>Agência</h4>
        <ul><li><a href="https://instagram.com/${insta}" target="_blank" rel="noopener">@${insta}</a></li><li><a href="mailto:contato@agenciasetup.com.br">contato@agenciasetup.com.br</a></li><li><a href="/privacidade">Privacidade</a></li><li><a href="/termos">Termos de uso</a></li></ul>
      </div>
    </div>
    <div class="fim"><span>© ${ano} Agência Setup</span><span>Feito com IA, revisado por gente.</span></div>
  </div>
</footer>`;
}
