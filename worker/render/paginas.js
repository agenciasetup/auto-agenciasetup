// As páginas do site público, montadas no Worker. Funcionam sem JavaScript; o site.js só melhora (busca, animações).
// Regra de UX: quem chega entende em segundos o que é (recursos e agentes de IA grátis) e qual é o próximo clique.
import { dataLonga, esc, markdown, tamanho, urlSegura } from '../nucleo/util.js';
import { htmlAdsense, htmlAnuncio } from '../lib/anuncios.js';
import { icone } from './icones.js';
import { ASSUNTOS, TIPOS_ARTIGO, caminhoArtigo } from '../lib/assuntos.js';

// ---------------------------------------------------------------- vocabulário
export const TIPOS = {
  agente: { t: 'Agente de IA', p: 'Agentes', i: 'agente', c: 'var(--c-agente)' },
  prompt: { t: 'Prompt', p: 'Prompts', i: 'prompt', c: 'var(--c-prompt)' },
  template: { t: 'Template', p: 'Templates', i: 'template', c: 'var(--c-template)' },
  planilha: { t: 'Planilha', p: 'Planilhas', i: 'planilha', c: 'var(--c-planilha)' },
  automacao: { t: 'Automação', p: 'Automações', i: 'automacao', c: 'var(--c-automacao)' },
  guia: { t: 'Guia', p: 'Guias', i: 'guia', c: 'var(--c-guia)' },
  pack: { t: 'Pack', p: 'Packs', i: 'pack', c: 'var(--c-pack)' },
  ferramenta: { t: 'Ferramenta', p: 'Ferramentas', i: 'ferramenta', c: 'var(--c-ferramenta)' },
  video: { t: 'Vídeo', p: 'Vídeos', i: 'video', c: 'var(--c-video)' },
};
const ORDEM_TIPOS = ['agente', 'prompt', 'template', 'planilha', 'automacao', 'guia', 'pack', 'ferramenta', 'video'];
export const FERRAMENTAS = {
  chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini', midjourney: 'Midjourney', magnific: 'Magnific', n8n: 'n8n', make: 'Make',
  notion: 'Notion', figma: 'Figma', capcut: 'CapCut', sheets: 'Planilhas Google', excel: 'Excel', canva: 'Canva', zapier: 'Zapier', perplexity: 'Perplexity',
};
const ASSUNTO = {
  'ia-no-social-media': { i: 'megafone', c: 'var(--c-agente)' },
  'design-com-ia': { i: 'paleta', c: 'var(--c-prompt)' },
  automacao: { i: 'raio', c: 'var(--c-automacao)' },
  'crm-e-organizacao': { i: 'pessoas', c: 'var(--c-planilha)' },
  prospeccao: { i: 'alvo', c: 'var(--c-pack)' },
  ferramentas: { i: 'ferramenta', c: 'var(--c-template)' },
};
const NIVEL = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' };

const tipo = (t) => TIPOS[t] || { t: t || 'Recurso', p: 'Recursos', i: 'camadas', c: 'var(--marca)' };
const nomeFerramenta = (f) => FERRAMENTAS[f] || f;
export function numero(n) {
  n = Number(n) || 0;
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace('.0', '').replace('.', ',')} mil`;
}
const plural = (n, um, varios) => `${numero(n)} ${n === 1 ? um : varios}`;
const ehAgente = (r) => r.tipo === 'agente' && r.link_uso;
const capaUrl = (r) => r.capa_url || (Array.isArray(r.galeria) && r.galeria[0] && r.galeria[0].url) || null;

// ---------------------------------------------------------------- peças
function etiquetaTipo(t) {
  const x = tipo(t);
  return `<span class="etiqueta" style="--c:${x.c}">${icone(x.i)}${esc(x.t)}</span>`;
}

function ferramentasHtml(lista = [], max = 3) {
  if (!lista || !lista.length) return '';
  return `<span class="ferramentas">${lista.slice(0, max).map((f) => `<span class="ferramenta">${esc(nomeFerramenta(f))}</span>`).join('')}</span>`;
}

// Capa: a imagem do recurso ou, sem imagem, uma capa feita em código no tom do tipo (o site nunca fica sem cara).
function capa(r, { grande = false } = {}) {
  const x = tipo(r.tipo);
  // Mesmo nome na lista e na página: a capa "voa" de uma para a outra (transição entre páginas).
  const vt = r.id ? `view-transition-name:capa-${esc(r.id)}` : '';
  const url = capaUrl(r);
  if (url) return `<div class="capa" style="${vt}"><img src="${esc(urlSegura(url))}" alt="" loading="${grande ? 'eager' : 'lazy'}" decoding="async"></div>`;
  return `<div class="capa capa-auto" style="--c:${x.c};${vt}">
    <span class="capa-titulo">${esc(r.titulo)}</span>
    ${icone(x.i, 'i-grande')}
  </div>`;
}

export function cartaoRecurso(r, i = 0) {
  const x = tipo(r.tipo);
  const agente = r.tipo === 'agente';
  return `<a class="cartao" href="/recursos/${esc(r.slug)}" style="--c:${x.c};--i:${i % 6}" data-revelar>
  ${capa(r)}
  <div class="cartao-corpo">
    <div class="cartao-meta">${etiquetaTipo(r.tipo)}${ferramentasHtml(r.ferramentas, 2)}</div>
    <h3>${esc(r.titulo)}</h3>
    ${r.resumo ? `<p>${esc(r.resumo)}</p>` : ''}
    <div class="cartao-pe">
      <span><span class="gratis">Grátis</span>${r.downloads ? ` · ${agente ? plural(r.downloads, 'uso', 'usos') : plural(r.downloads, 'download', 'downloads')}` : ''}</span>
      <span class="acao">${agente ? 'Abrir' : 'Ver'}${icone('seta')}</span>
    </div>
  </div>
</a>`;
}

function cartaoNovidade(a, i = 0) {
  return `<a class="painel novidade" href="${esc(caminhoArtigo(a))}" style="--i:${i}" data-revelar>
  ${a.capa_url ? `<div class="capa"><img src="${esc(urlSegura(a.capa_url))}" alt="" loading="lazy" decoding="async"></div>` : ''}
  <div class="corpo">
    <span class="quando">${a.tipo && a.tipo !== 'noticia' && TIPOS_ARTIGO[a.tipo] ? `${esc(TIPOS_ARTIGO[a.tipo])} · ` : ''}${esc(dataLonga(a.publicado_em))}</span>
    <h3>${esc(a.titulo)}</h3>
    ${a.resumo ? `<p>${esc(a.resumo)}</p>` : ''}
  </div>
</a>`;
}

function vazio(icon, titulo, texto, acao = '') {
  return `<div class="vazio"><span class="ic">${icone(icon)}</span><b>${esc(titulo)}</b><p>${esc(texto)}</p>${acao}</div>`;
}

function secaoTopo(titulo, sub, mais) {
  return `<div class="secao-topo" data-revelar><div><h2 class="t-titulo">${titulo}</h2>${sub ? `<p class="t-lead">${sub}</p>` : ''}</div>${mais ? `<a class="mais" href="${mais.href}">${esc(mais.t)}${icone('seta')}</a>` : ''}</div>`;
}

// "Receber novidades". Na página de um recurso, o e-mail fica ligado ao material (recurso) e, com oferta no ar,
// a coluna da esquerda vira o próximo passo do funil: o mini curso.
export function receberNovidades(origem = 'site', { recurso, oferta, voltar } = {}) {
  const id = esc(origem.replace(/[^a-z0-9-]/gi, '-'));
  const esquerda = oferta
    ? `<div>
      <p class="olho">${icone('curso')}Próximo passo</p>
      <h2 class="t-titulo">${esc(oferta.titulo)}</h2>
      ${oferta.texto ? `<p class="t-lead" style="margin-top:10px">${esc(oferta.texto)}</p>` : ''}
      <a class="bt bt-marca" style="margin-top:18px" href="${esc(urlSegura(oferta.link))}">${esc(oferta.cta || 'Quero conhecer')}${icone('seta')}</a>
    </div>`
    : `<div>
      <p class="olho">${icone('email')}${recurso ? 'Sempre atualizado' : 'Toda semana'}</p>
      <h2 class="t-titulo">${recurso ? 'Receba a versão nova <span class="serifa marca-texto">deste material</span>' : 'Receba os recursos novos <span class="serifa marca-texto">primeiro</span>'}</h2>
      <p class="t-lead" style="margin-top:10px">${recurso ? 'A IA muda toda semana. Quando este material for atualizado, ou sair um parecido, você recebe por e-mail.' : 'Um e-mail por semana com os agentes, prompts e modelos que saíram. Sem spam, sai quando quiser.'}</p>
    </div>`;
  return `<section class="faixa secao">
  <div class="painel receber" data-revelar data-receber>
    ${esquerda}
    <div>
      ${oferta ? `<p class="t-mudo" style="margin:0 0 12px 6px">${recurso ? 'Ou receba a versão nova deste material quando sair:' : 'Ou receba os recursos novos por e-mail:'}</p>` : ''}
      <form class="form-email" action="/api/lead" method="post" data-form-lead>
        <label class="sr" for="email-${id}">Seu e-mail</label>
        <input id="email-${id}" type="email" name="email" required placeholder="seu@email.com" autocomplete="email" inputmode="email">
        <input class="armadilha" type="text" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">
        <input type="hidden" name="origem" value="${esc(origem)}">
        ${recurso ? `<input type="hidden" name="recurso" value="${esc(recurso)}">` : ''}
        ${voltar ? `<input type="hidden" name="voltar" value="${esc(voltar)}">` : ''}
        <button class="bt ${oferta ? '' : 'bt-marca'}" type="submit">Quero receber</button>
      </form>
      <p class="form-ok" role="status">${icone('ok')}Pronto! Você vai receber ${recurso ? 'as atualizações' : 'os próximos recursos'}.</p>
      <p class="t-fraco t-peq" style="margin:10px 0 0 6px">Usamos seu e-mail só para isso. <a href="/privacidade" style="text-decoration:underline">Privacidade</a>.</p>
    </div>
  </div>
</section>`;
}

// ---------------------------------------------------------------- início
// Embaixo do herói: um leque com posts feitos pelo Claude (os exemplos de estilo do mini curso), levando ao curso,
// e uma faixa com as ferramentas de IA correndo, dividindo o herói do resto (o mesmo desenho da página de venda).
const POSTS_LEQUE = [
  ['Religioso', '/img/estilos/religioso-1.webp'], ['Advocacia', '/img/estilos/advogado-1.webp'], ['Padrão Setup', '/img/estilos/setup-1.webp'],
  ['Elegante', '/img/estilos/elegante-1.webp?v=2'],
];
const FERRAMENTAS_FAIXA = ['ChatGPT', 'Claude', 'Gemini', 'Midjourney', 'Magnific', 'Nano Banana', 'n8n', 'Notion', 'Canva', 'CapCut', 'Perplexity'];
function lequePosts() {
  const cartas = [...POSTS_LEQUE.map(([nome, img]) => `<span class="lq-carta-in"><span class="lq-cab">${esc(nome)}</span><img src="${esc(img)}" alt="Post de exemplo no estilo ${esc(nome)}" loading="lazy" decoding="async" width="864" height="1080"></span>`),
    '<span class="lq-carta-in lq-sua"><span class="lq-cab">O seu estilo</span><span class="lq-sua-miolo"><em>seu</em><b>estilo</b></span></span>'];
  const linha = FERRAMENTAS_FAIXA.map((t) => `<span>${esc(t)}</span><i>✦</i>`).join('');
  return `<section class="leque-secao" aria-label="Posts feitos pelo Claude">
  <a class="leque-chamada" href="/cursos/posts-automaticos">${icone('brilho')}Posts feitos pelo Claude, sem cara de IA<span class="seta">Ver como${icone('seta')}</span></a>
  <div class="lq" data-leque>${cartas.map((c, i) => `<a class="lq-carta" href="/cursos/posts-automaticos" style="--i:${i - 2}" tabindex="-1">${c}</a>`).join('')}</div>
</section>
<div class="fita-ferramentas" aria-hidden="true"><div class="fita-trilho"><div>${linha}</div><div>${linha}</div></div></div>`;
}

export function home({ destaques, agentes, novidades, cats, cont, anuncios, cfg }) {
  const nTipo = (t) => (cont.tipos && cont.tipos[t]) || 0;
  const atalhos = ['agente', 'prompt', 'template', 'planilha', 'automacao', 'guia']
    .map((t, i) => `<a class="atalho" href="${t === 'agente' ? '/agentes' : `/recursos?tipo=${t}`}" style="--c:${TIPOS[t].c};--i:${i}"><span class="ic">${icone(TIPOS[t].i)}</span>${esc(TIPOS[t].p)}${nTipo(t) ? `<span class="n">${numero(nTipo(t))}</span>` : ''}</a>`).join('');
  const nCat = (id) => (cont.categorias && cont.categorias[id]) || 0;
  return `
<section class="heroi">
  <div class="faixa heroi-grade">
    <div class="heroi-texto">
      <a class="anuncio-pilula" href="/agentes"><span class="novo">Novo</span> Agentes de IA prontos para usar <span class="seta">${icone('seta')}</span></a>
      <h1 class="t-display">Recursos e agentes de IA <span class="serifa degrade-texto">grátis</span> para quem cria conteúdo</h1>
      <p class="t-lead">Prompts, templates, planilhas e agentes prontos para usar no Social Media e no Design. Tudo testado na Agência Setup, sem cadastro.</p>
      <form class="busca-heroi" action="/busca" role="search">
        ${icone('busca')}
        <input type="search" name="q" placeholder="O que você quer fazer hoje?" aria-label="O que você procura?" autocomplete="off" enterkeyhint="search" data-placeholders="Ex.: carrossel que prende|Ex.: CRM para social media|Ex.: pautas do dia|Ex.: prospectar clientes|Ex.: imagens no estilo cinema">
        <button class="bt bt-marca" type="submit">${icone('busca')}<span>Buscar</span></button>
      </form>
      <nav class="atalhos" aria-label="Tipos de recurso">${atalhos}</nav>
    </div>
    <div class="heroi-visual" aria-hidden="true">
      <div class="flutua" style="--c:var(--c-prompt)">
        <div class="flutua-topo"><span class="flutua-icone">${icone('prompt')}</span><div><b>10 prompts de carrossel</b><small>Prompt · ChatGPT</small></div></div>
        <div class="linhas"><span></span><span></span><span></span></div>
        <span class="bt">${icone('baixar')}Baixar grátis</span>
      </div>
      <div class="flutua" style="--c:var(--c-agente)">
        <div class="flutua-topo"><span class="flutua-icone">${icone('agente')}</span><div><b>Agente de pautas do dia</b><small>Agente de IA · abre no ChatGPT</small></div></div>
        <div class="linhas"><span></span><span></span></div>
        <span class="bt bt-marca">${icone('brilho')}Abrir agente</span>
      </div>
      <div class="flutua" style="--c:var(--c-planilha)">
        <div class="flutua-topo"><span class="flutua-icone">${icone('planilha')}</span><div><b>CRM para social media</b><small>Planilha · Google</small></div></div>
        <div class="mini-tabela"><span>Padaria Sol</span><span>Proposta</span><span class="ok">R$ 900</span><span>Studio Bela</span><span>Fechado</span><span class="ok">R$ 1.400</span></div>
      </div>
    </div>
  </div>
</section>
${lequePosts()}

<section class="faixa" style="padding-bottom:8px">
  <div class="passos">
    ${[
      ['busca', 'Escolha o que precisa', 'Ache pelo tipo, pelo assunto ou pela ferramenta que você usa.'],
      ['baixar', 'Baixe ou abra', 'Tudo grátis e sem cadastro. Agente abre direto no ChatGPT ou no Claude.'],
      ['raio', 'Use no seu trabalho', 'Cada recurso tem o passo a passo de como a agência usa.'],
    ].map(([ic, t, d], i) => `<div class="painel passo" style="--i:${i}" data-revelar><span class="num">${icone(ic)}</span><div><h3>${t}</h3><p>${d}</p></div></div>`).join('')}
  </div>
</section>

${agentes.length ? `<section class="faixa secao">
  ${secaoTopo('Agentes de IA <span class="serifa marca-texto">prontos</span>', 'Assistentes já configurados: você abre, conta o que precisa e ele faz com você.', { href: '/agentes', t: 'Ver agentes' })}
  <div class="trilho" data-trilho>${agentes.map((r, i) => cartaoRecurso(r, i)).join('')}</div>
</section>` : ''}

<section class="faixa secao">
  ${secaoTopo('Mais baixados', 'O que mais gente está usando agora.', destaques.length ? { href: '/recursos', t: 'Ver todos' } : null)}
  ${destaques.length ? `<div class="grade">${destaques.map((r, i) => cartaoRecurso(r, i)).join('')}</div>`
    : vazio('presente', 'Os primeiros recursos chegam esta semana', 'Prompts, agentes, planilhas e modelos que a agência usa no dia a dia. Deixe seu e-mail lá embaixo para saber quando sair.')}
</section>

<section class="faixa secao">
  ${secaoTopo('Explore por assunto', null, null)}
  <div class="bento">
    ${cats.map((c, i) => {
      const a = ASSUNTO[c.slug] || { i: 'camadas', c: 'var(--marca)' };
      const n = nCat(c.id);
      return `<a class="bloco${i === 0 || i === 3 ? ' bloco-largo' : ''}" href="/recursos?c=${esc(c.slug)}" style="--c:${a.c};--i:${i % 4}" data-revelar>
        <span class="ic">${icone(a.i)}</span>
        <div><h3>${esc(c.nome)}</h3>${c.descricao ? `<p>${esc(c.descricao)}</p>` : ''}</div>
        <span class="n">${n ? plural(n, 'recurso', 'recursos') : 'Em breve'}</span>
      </a>`;
    }).join('')}
  </div>
</section>

${anuncios.meio ? `<section class="faixa" data-revelar>${htmlAnuncio(anuncios.meio, 'meio')}</section>` : ''}

${novidades.length ? `<section class="faixa secao">
  ${secaoTopo('Novidades da IA', 'O que mudou nas ferramentas e o que isso muda no seu trabalho.', { href: '/novidades', t: 'Ver todas' })}
  <div class="lista-novidades">${novidades.map((a, i) => cartaoNovidade(a, i)).join('')}</div>
</section>` : ''}

${htmlAdsense(cfg) ? `<section class="faixa">${htmlAdsense(cfg)}</section>` : ''}
${receberNovidades('home')}`;
}

// ---------------------------------------------------------------- lista de recursos (e de agentes)
function linkFiltro(base, atual, muda) {
  const p = { ...atual, ...muda };
  const q = new URLSearchParams();
  for (const k of ['tipo', 'c', 'f', 'ordem', 'q']) if (p[k]) q.set(k, p[k]);
  if (p.p && p.p > 1) q.set('p', p.p);
  const s = q.toString();
  return esc(`${base}${s ? `?${s}` : ''}`);
}

function filtrosLaterais(base, f, cats, cont, fixoTipo) {
  const cur = (v, x) => (String(v || '') === String(x || '') ? ' aria-current="true"' : '');
  const ferr = Object.entries(cont.ferramentas || {}).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return `
  <div><h4>Assunto</h4><div class="lado-lista">
    <a href="${linkFiltro(base, f, { c: null, p: null })}"${cur(f.c, null)}>${icone('camadas')}Todos</a>
    ${cats.map((c) => `<a href="${linkFiltro(base, f, { c: c.slug, p: null })}"${cur(f.c, c.slug)}>${icone((ASSUNTO[c.slug] || {}).i || 'camadas')}${esc(c.nome)}${cont.categorias && cont.categorias[c.id] ? `<span class="n">${cont.categorias[c.id]}</span>` : ''}</a>`).join('')}
  </div></div>
  ${ferr.length ? `<div><h4>Ferramenta</h4><div class="lado-lista">
    <a href="${linkFiltro(base, f, { f: null, p: null })}"${cur(f.f, null)}>Todas</a>
    ${ferr.map(([k, n]) => `<a href="${linkFiltro(base, f, { f: k, p: null })}"${cur(f.f, k)}>${esc(nomeFerramenta(k))}<span class="n">${n}</span></a>`).join('')}
  </div></div>` : ''}
  <div><h4>Ordenar</h4><div class="lado-lista">
    <a href="${linkFiltro(base, f, { ordem: null, p: null })}"${cur(f.ordem, null)}>${icone('fogo')}Mais baixados</a>
    <a href="${linkFiltro(base, f, { ordem: 'novos', p: null })}"${cur(f.ordem, 'novos')}>${icone('relogio')}Mais novos</a>
  </div></div>`;
}

export function listaRecursos({ base, titulo, intro, itens, total, cats, cont, f, pagina, porPagina, anuncios, cfg, fixoTipo }) {
  const paginas = Math.ceil(total / porPagina);
  const tiposComItens = ORDEM_TIPOS.filter((t) => (cont.tipos && cont.tipos[t]) || t === f.tipo);
  const segmentos = fixoTipo ? '' : `<nav class="segmentos" aria-label="Tipo de recurso" style="margin-top:22px">
    <a href="${linkFiltro(base, f, { tipo: null, p: null })}"${!f.tipo ? ' aria-current="true"' : ''}>Todos${cont.total ? ` <span class="t-fraco">${numero(cont.total)}</span>` : ''}</a>
    ${tiposComItens.map((t) => `<a href="${t === 'agente' ? '/agentes' : linkFiltro(base, f, { tipo: t, p: null })}"${f.tipo === t ? ' aria-current="true"' : ''}>${icone(TIPOS[t].i)}${esc(TIPOS[t].p)}</a>`).join('')}
  </nav>`;
  const filtrosAtivos = [f.c && cats.find((c) => c.slug === f.c), f.f && { nome: nomeFerramenta(f.f) }].filter(Boolean);
  return `
<section class="faixa cabeca">
  ${intro}
  ${segmentos}
</section>
<section class="faixa explorar">
  <aside class="lado" aria-label="Filtros">${filtrosLaterais(base, f, cats, cont, fixoTipo)}</aside>
  <div>
    <div class="barra-lista">
      <form class="filtro-busca" action="${esc(base)}" role="search">
        ${icone('busca')}
        ${f.tipo && !fixoTipo ? `<input type="hidden" name="tipo" value="${esc(f.tipo)}">` : ''}${f.c ? `<input type="hidden" name="c" value="${esc(f.c)}">` : ''}${f.f ? `<input type="hidden" name="f" value="${esc(f.f)}">` : ''}
        <input type="search" name="q" value="${esc(f.q || '')}" placeholder="Filtrar ${fixoTipo ? 'agentes' : 'recursos'}…" aria-label="Filtrar pelo nome" enterkeyhint="search">
      </form>
      <button type="button" class="bt so-celular" data-abrir-folha="folha-filtros">${icone('filtros')}Filtros${filtrosAtivos.length ? ` <span class="marca-texto">${filtrosAtivos.length}</span>` : ''}</button>
      <span class="contagem">${plural(total, fixoTipo ? 'agente' : 'recurso', fixoTipo ? 'agentes' : 'recursos')}${filtrosAtivos.length ? ` em ${filtrosAtivos.map((x) => esc(x.nome)).join(' · ')}` : ''}</span>
    </div>
    ${itens.length ? `<div class="grade">${itens.map((r, i) => cartaoRecurso(r, i)).join('')}</div>`
      : vazio(fixoTipo ? 'agente' : 'busca', f.q || filtrosAtivos.length ? 'Nada com esses filtros' : fixoTipo ? 'Os primeiros agentes chegam em breve' : 'Os primeiros recursos chegam em breve',
        f.q || filtrosAtivos.length ? 'Tente outro termo ou limpe os filtros.' : 'Deixe seu e-mail e a gente avisa quando sair.',
        f.q || filtrosAtivos.length ? `<a class="bt" href="${esc(base)}">Limpar filtros</a>` : '<a class="bt bt-tingido" href="#receber">Quero ser avisado</a>')}
    ${paginas > 1 ? `<nav class="paginas" aria-label="Páginas">${pagina > 1 ? `<a class="bt" href="${linkFiltro(base, f, { p: pagina - 1 })}">${icone('esquerda')}Anterior</a>` : ''}<span>Página ${pagina} de ${paginas}</span>${pagina < paginas ? `<a class="bt" href="${linkFiltro(base, f, { p: pagina + 1 })}">Próxima${icone('direita')}</a>` : ''}</nav>` : ''}
    ${htmlAnuncio(anuncios.fim, 'fim')}
    ${htmlAdsense(cfg)}
  </div>
</section>
<dialog class="folha" id="folha-filtros" aria-label="Filtros">
  <div class="folha-topo"><b class="t-sub">Filtros</b><button class="bt bt-simples" data-fechar-folha>Pronto</button></div>
  <div class="lado-lista-celular">${filtrosLaterais(base, f, cats, cont, fixoTipo).replace(/class="lado-lista"/g, 'class="lado-lista" style="display:flex;flex-direction:column;gap:2px"').replace(/<h4>/g, '<h4 style="margin:18px 0 8px">')}</div>
</dialog>
<div id="receber">${itens.length ? '' : receberNovidades(fixoTipo ? 'agentes' : 'recursos')}</div>`;
}

export const introRecursos = (atual) => `
  <p class="olho">${icone('camadas')}Biblioteca grátis</p>
  <h1 class="t-titulo">${atual ? esc(atual.nome) : 'Recursos para criar <span class="serifa marca-texto">mais rápido</span>'}</h1>
  <p class="t-lead">${atual && atual.descricao ? esc(atual.descricao) : 'Prompts, templates, planilhas, automações e agentes que a Agência Setup usa no dia a dia. Baixe, use e adapte. Sem cadastro.'}</p>`;

export const introAgentes = () => `
  <p class="olho">${icone('agente')}Agentes de IA</p>
  <h1 class="t-titulo">Agentes de IA <span class="serifa marca-texto">prontos</span> para usar</h1>
  <p class="t-lead">Um agente é um assistente já configurado para uma tarefa. Você abre, conta o que precisa e ele faz com você, no ChatGPT, no Claude ou no Gemini.</p>
  <div class="chips chips-quebra" style="margin-top:18px">
    <span class="chip">${icone('sair')}1. Abra o agente</span>
    <span class="chip">${icone('prompt')}2. Conte o que precisa</span>
    <span class="chip">${icone('brilho')}3. Ele faz com você</span>
  </div>`;

// ---------------------------------------------------------------- página do recurso
function videoEmbed(url) {
  const u = urlSegura(url);
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(yt[1])}" title="Vídeo de como usar" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`;
  if (/\.(mp4|webm)(\?|$)/i.test(u)) return `<div class="video"><video src="${esc(u)}" controls preload="metadata" playsinline></video></div>`;
  return `<a class="bt" href="${esc(u)}" target="_blank" rel="noopener">${icone('video')}Ver vídeo de como usar</a>`;
}

export function paginaRecurso({ r, cats, relacionados, anuncios, cfg, oferta }) {
  const x = tipo(r.tipo);
  const agente = ehAgente(r);
  const arquivo = r.arquivo_url || r.link_externo;
  const ferr = (r.ferramentas || []).map(nomeFerramenta);
  const ondeAbre = agente ? (/claude\.ai/.test(r.link_uso) ? 'Claude' : /gemini\.google/.test(r.link_uso) ? 'Gemini' : /chatgpt\.com|chat\.openai/.test(r.link_uso) ? 'ChatGPT' : ferr[0] || 'IA') : null;
  const cat = cats.find((c) => c.id === r.categoria_id);
  const principal = agente
    ? `<a class="bt bt-marca bt-g bt-cheio" href="/usar/${esc(r.slug)}" target="_blank" rel="noopener nofollow">${icone('brilho')}Abrir no ${esc(ondeAbre)}</a>`
    : arquivo ? `<a class="bt bt-marca bt-g bt-cheio" href="/baixar/${esc(r.slug)}" rel="nofollow">${icone('baixar')}Baixar grátis</a>`
      : `<span class="bt bt-g bt-cheio" aria-disabled="true">Arquivo em breve</span>`;
  const secundario = agente && arquivo ? `<a class="bt bt-cheio" href="/baixar/${esc(r.slug)}" rel="nofollow">${icone('baixar')}Baixar material de apoio</a>` : '';
  const ficha = [
    ['Tipo', x.t],
    r.formato && ['Formato', r.formato],
    r.nivel && ['Nível', NIVEL[r.nivel] || r.nivel],
    ferr.length && ['Funciona com', ferr.join(', ')],
    !agente && r.arquivo_bytes && ['Tamanho', tamanho(r.arquivo_bytes)],
    r.downloads && [agente ? 'Usos' : 'Downloads', numero(r.downloads)],
    ['Atualizado', dataLonga(r.atualizado_em || r.publicado_em)],
  ].filter(Boolean);
  const galeria = (Array.isArray(r.galeria) ? r.galeria : []).filter((g) => g && g.url);
  return `
<div class="faixa">
  <nav class="migalhas" aria-label="Você está em"><a href="/recursos">Recursos</a>${icone('direita')}<a href="${r.tipo === 'agente' ? '/agentes' : `/recursos?tipo=${esc(r.tipo)}`}">${esc(x.p)}</a></nav>
  <div class="recurso">
    <article>
      <div class="recurso-capa">${capa(r, { grande: true })}</div>
      ${galeria.length > (r.capa_url ? 0 : 1) ? `<div class="galeria">${galeria.slice(r.capa_url ? 0 : 1).map((g) => `<img src="${esc(urlSegura(g.url))}" alt="${esc(g.alt || '')}" loading="lazy" decoding="async">`).join('')}</div>` : ''}
      <header class="recurso-titulo" style="margin-top:26px">
        <div class="cartao-meta">${etiquetaTipo(r.tipo)}${cat ? `<a class="etiqueta etiqueta-neutra" href="/recursos?c=${esc(cat.slug)}">${esc(cat.nome)}</a>` : ''}</div>
        <h1 class="t-titulo">${esc(r.titulo)}</h1>
        ${r.resumo ? `<p class="t-lead">${esc(r.resumo)}</p>` : ''}
      </header>
      ${Array.isArray(r.itens) && r.itens.length ? `<div class="bloco-texto"><h2 class="t-sub">O que vem</h2><ul class="vem">${r.itens.map((t) => `<li>${icone('ok')}${esc(t)}</li>`).join('')}</ul></div>` : ''}
      ${r.video_url ? `<div class="bloco-texto"><h2 class="t-sub">Veja como usar</h2>${videoEmbed(r.video_url)}</div>` : ''}
      ${r.corpo_md ? `<div class="bloco-texto"><h2 class="t-sub">${agente ? 'Como usar o agente' : 'Como usar'}</h2><div class="texto">${markdown(r.corpo_md)}</div></div>` : ''}
      ${htmlAnuncio(anuncios.fim, 'fim')}
    </article>
    <aside>
      <div class="painel acao-card" data-acao-principal>
        <div class="preco"><b>Grátis</b><span>${agente ? 'sem cadastro, abre na hora' : 'sem cadastro'}</span></div>
        ${principal}
        ${secundario}
        <button type="button" class="bt bt-simples" data-copiar-link>${icone('link')}<span>Copiar link</span></button>
        <ul class="ficha">${ficha.map(([k, v]) => `<li><span>${esc(k)}</span><span>${esc(v)}</span></li>`).join('')}</ul>
      </div>
      ${anuncios.lateral ? `<div style="margin-top:16px">${htmlAnuncio(anuncios.lateral, 'lateral')}</div>` : ''}
    </aside>
  </div>
  ${htmlAdsense(cfg)}
  ${relacionados.length ? `<section class="secao" style="padding-top:24px">${secaoTopo('Você também vai gostar', null, { href: r.tipo === 'agente' ? '/agentes' : '/recursos', t: 'Ver mais' })}<div class="grade">${relacionados.map((x2, i) => cartaoRecurso(x2, i)).join('')}</div></section>` : ''}
</div>
${receberNovidades(`recurso:${r.slug}`, { recurso: r.id, oferta, voltar: `/recursos/${r.slug}` })}
<div class="barra-acao" data-barra-acao>
  <div><b>${esc(r.titulo)}</b><small>Grátis</small></div>
  ${agente ? `<a class="bt bt-marca" href="/usar/${esc(r.slug)}" target="_blank" rel="noopener nofollow">${icone('brilho')}Abrir</a>`
    : arquivo ? `<a class="bt bt-marca" href="/baixar/${esc(r.slug)}" rel="nofollow">${icone('baixar')}Baixar</a>` : ''}
</div>`;
}

// ---------------------------------------------------------------- busca
export function paginaBusca({ q, res }) {
  const n = res.recursos.length + res.artigos.length;
  const sugestoes = ['carrossel', 'agente', 'crm', 'prompt de imagem', 'automação', 'prospecção'];
  return `
<section class="faixa cabeca">
  <p class="olho">${icone('busca')}Buscar</p>
  <form class="busca-heroi" action="/busca" role="search" style="max-width:720px">
    ${icone('busca')}
    <input type="search" name="q" value="${esc(q)}" placeholder="Buscar prompts, agentes, planilhas…" aria-label="O que você procura?" autofocus enterkeyhint="search">
    <button class="bt bt-marca" type="submit">${icone('busca')}<span>Buscar</span></button>
  </form>
  <div class="chips" style="margin-top:16px">${sugestoes.map((s) => `<a class="chip" href="/busca?q=${encodeURIComponent(s)}">${esc(s)}</a>`).join('')}</div>
</section>
<section class="faixa secao" style="padding-top:20px">
  ${!q ? vazio('busca', 'O que você quer fazer hoje?', 'Busque por tarefa (carrossel, CRM, pautas), por ferramenta (ChatGPT, Notion, n8n) ou por tipo (agente, planilha).')
    : !n ? vazio('busca', `Nada para "${q}" ainda`, 'Tente uma palavra mais simples ou veja tudo o que já temos.', '<a class="bt" href="/recursos">Ver todos os recursos</a>')
      : `<p class="t-mudo" style="margin:0 0 18px">${plural(n, 'resultado', 'resultados')} para <b>${esc(q)}</b></p>
        ${res.recursos.length ? `<div class="grade">${res.recursos.map((r, i) => cartaoRecurso(r, i)).join('')}</div>` : ''}
        ${res.artigos.length ? `<h2 class="t-sub" style="margin:36px 0 16px">Novidades</h2><div class="lista-novidades">${res.artigos.map((a, i) => cartaoNovidade(a, i)).join('')}</div>` : ''}`}
</section>`;
}

// ---------------------------------------------------------------- novidades
// A lista de um assunto (/novidades, /ia, /equipamentos, /tutoriais, /guias). hubs: os outros assuntos com conteúdo,
// como atalhos no topo (assunto sem artigo publicado não aparece: página vazia não ajuda ninguém).
export function listaNovidades({ assunto = 'novidades', itens, total, pagina, porPagina, cfg, hubs = [] }) {
  const s = ASSUNTOS[assunto] || ASSUNTOS.novidades;
  const rota = `/${assunto}`;
  const paginas = Math.ceil(total / porPagina);
  const atalhos = hubs.filter((h) => h !== assunto);
  return `
<section class="faixa cabeca">
  <p class="olho">${icone(s.icone)}${esc(s.nome)}</p>
  <h1 class="t-titulo">${esc(s.titulo)} <span class="serifa marca-texto">${esc(s.destaque)}</span></h1>
  <p class="t-lead">${esc(s.lead)}</p>
  ${atalhos.length ? `<nav class="chips" aria-label="Outros assuntos" style="margin-top:18px">${atalhos.map((h) => `<a class="chip" href="/${h}">${esc(ASSUNTOS[h].nome)}</a>`).join('')}</nav>` : ''}
</section>
<section class="faixa secao" style="padding-top:24px">
  ${itens.length ? `<div class="lista-novidades">${itens.map((a, i) => cartaoNovidade(a, i)).join('')}</div>` : vazio(s.icone, 'Nada publicado aqui ainda', 'Assim que sair o primeiro, ele aparece aqui.')}
  ${paginas > 1 ? `<nav class="paginas">${pagina > 1 ? `<a class="bt" href="${rota}?p=${pagina - 1}">${icone('esquerda')}Anterior</a>` : ''}<span>Página ${pagina} de ${paginas}</span>${pagina < paginas ? `<a class="bt" href="${rota}?p=${pagina + 1}">Próxima${icone('direita')}</a>` : ''}</nav>` : ''}
  ${htmlAdsense(cfg)}
</section>
${receberNovidades(assunto)}`;
}

const minutosDeLeitura = (md) => Math.max(1, Math.round((String(md || '').match(/\S+/g) || []).length / 200));

// A chamada do mini curso no meio do texto (bloco ```curso) e no fim do artigo.
function chamadaCurso(oferta) {
  if (!oferta) return '';
  return `<aside class="painel chamada-curso"><p class="olho">${icone('curso')}Próximo passo</p><h3>${esc(oferta.titulo)}</h3>${oferta.texto ? `<p>${esc(oferta.texto)}</p>` : ''}<a class="bt bt-marca" href="${esc(urlSegura(oferta.link))}">${esc(oferta.cta || 'Quero conhecer')}${icone('seta')}</a></aside>`;
}

// O artigo (notícia, guia, tutorial, comparativo, review): migalhas, título, quem assina e quando, a resposta rápida,
// o índice, o texto com os blocos, as perguntas, o recurso ligado, a chamada do curso e as fontes.
export function paginaNovidade({ a, recurso, anuncios, cfg, oferta }) {
  const fontes = Array.isArray(a.fontes) ? a.fontes : [];
  const faqs = (Array.isArray(a.faqs) ? a.faqs : []).filter((f) => f && f.pergunta && f.resposta);
  const s = ASSUNTOS[a.assunto] || ASSUNTOS.novidades;
  let corpo = markdown(a.corpo_md || '');
  const comCurso = corpo.includes('data-bloco-curso');
  corpo = corpo.replace(/<div class="bloco-curso" data-bloco-curso><\/div>/g, chamadaCurso(oferta));
  // Índice quando o texto tem 3 intertítulos ou mais.
  const h2 = [...corpo.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)];
  const indice = h2.length >= 3 ? `<nav class="indice" aria-label="Neste artigo"><b>Neste artigo</b><ol>${h2.map((m) => `<li><a href="#${m[1]}">${m[2].replace(/<[^>]+>/g, '')}</a></li>`).join('')}</ol></nav>` : '';
  const autor = a.autor || null;
  const atualizado = a.atualizado_em && a.publicado_em && new Date(a.atualizado_em) - new Date(a.publicado_em) > 86400000;
  return `
<article class="leitura">
  <nav class="migalhas" aria-label="Você está em" style="padding-top:0"><a href="/">Início</a>${icone('direita')}<a href="/${a.assunto && ASSUNTOS[a.assunto] ? a.assunto : 'novidades'}">${esc(s.nome)}</a></nav>
  <h1 class="t-titulo">${esc(a.titulo)}</h1>
  ${a.resumo ? `<p class="t-lead">${esc(a.resumo)}</p>` : ''}
  <div class="assina">
    ${autor ? `<a href="/autor/${esc(autor.slug)}" class="assina-autor">${autor.foto_url ? `<img src="${esc(urlSegura(autor.foto_url))}" alt="" width="36" height="36" loading="lazy">` : ''}<span><b>${esc(autor.nome)}</b>${autor.cargo ? `<small>${esc(autor.cargo)}</small>` : ''}</span></a>` : '<span class="assina-autor"><span><b>Agência Setup</b></span></span>'}
    <span class="assina-data">${atualizado ? `Atualizado em ${esc(dataLonga(a.atualizado_em))}` : esc(dataLonga(a.publicado_em))} · ${minutosDeLeitura(a.corpo_md)} min de leitura${a.revisor ? ` · Revisado por <a href="/autor/${esc(a.revisor.slug)}">${esc(a.revisor.nome)}</a>` : ''}</span>
  </div>
  ${a.afiliado ? '<p class="aviso-afiliado">Alguns links desta página são de afiliado: se você comprar por eles, a Agência Setup ganha uma comissão, sem custo a mais para você. Isso não muda o que recomendamos.</p>' : ''}
  ${a.resposta ? `<section class="resposta-rapida" aria-label="Resposta rápida"><p class="olho">Resposta rápida</p><p>${esc(a.resposta)}</p></section>` : ''}
  ${a.capa_url ? `<div class="capa"><img src="${esc(urlSegura(a.capa_url))}" alt="" decoding="async"></div>` : '<div style="height:12px"></div>'}
  ${indice}
  <div class="texto">${corpo}</div>
  ${a.conferido_em ? `<p class="t-mudo conferido">Preços e disponibilidade conferidos em ${esc(dataLonga(`${String(a.conferido_em).slice(0, 10)}T12:00:00-03:00`))}. Podem ter mudado desde então.</p>` : ''}
  ${faqs.length ? `<section class="faq"><h2 class="t-titulo" style="font-size:1.5rem">Perguntas frequentes</h2>${faqs.map((f) => `<details><summary>${esc(f.pergunta)}</summary><p>${esc(f.resposta)}</p></details>`).join('')}</section>` : ''}
  ${recurso ? `<div style="margin:32px 0"><p class="olho">${icone('presente')}Material grátis deste artigo</p><div class="grade">${cartaoRecurso(recurso)}</div></div>` : ''}
  ${comCurso ? '' : chamadaCurso(oferta)}
  ${htmlAnuncio(anuncios.meio, 'meio')}
  ${fontes.length ? `<section class="fontes"><h4>Fontes</h4><ul>${fontes.map((f) => `<li><a href="${esc(urlSegura(f.url || f))}" target="_blank" rel="noopener">${esc(f.nome || f.url || f)}</a></li>`).join('')}</ul></section>` : ''}
  ${htmlAdsense(cfg)}
</article>`;
}

// A página de quem assina: quem é, onde encontrar e o que escreveu. O Google pergunta "quem escreveu e por que confiar".
export function paginaAutor({ autor, itens }) {
  const perfis = Array.isArray(autor.perfis) ? autor.perfis : [];
  const nomeDoPerfil = (u) => { const m = String(u).match(/instagram\.com\/([^/?#]+)/); return m ? `@${m[1]} no Instagram` : String(u).replace(/^https?:\/\//, ''); };
  return `
<article class="leitura">
  <nav class="migalhas" aria-label="Você está em" style="padding-top:0"><a href="/">Início</a>${icone('direita')}<span>Autor</span></nav>
  <div class="autor-cabeca">
    ${autor.foto_url ? `<img src="${esc(urlSegura(autor.foto_url))}" alt="${esc(autor.nome)}" width="96" height="96">` : ''}
    <div><h1 class="t-titulo">${esc(autor.nome)}</h1>${autor.cargo ? `<p class="t-lead">${esc(autor.cargo)}</p>` : ''}</div>
  </div>
  ${autor.bio ? `<div class="texto"><p>${esc(autor.bio)}</p></div>` : ''}
  ${perfis.length ? `<ul class="autor-perfis">${perfis.map((u) => `<li><a href="${esc(urlSegura(u))}" target="_blank" rel="noopener me">${esc(nomeDoPerfil(u))}</a></li>`).join('')}</ul>` : ''}
  <h2 class="t-titulo" style="font-size:1.5rem;margin-top:36px">O que ${esc(autor.nome.split(' ')[0])} escreveu</h2>
  ${itens.length ? `<div class="lista-novidades" style="margin-top:16px">${itens.map((a, i) => cartaoNovidade(a, i)).join('')}</div>` : '<p class="t-mudo">Nenhum artigo publicado ainda.</p>'}
</article>`;
}

// ---------------------------------------------------------------- cursos e landing page
export function listaCursos({ lps }) {
  return `
<section class="faixa cabeca">
  <p class="olho">${icone('curso')}Cursos</p>
  <h1 class="t-titulo">Aprenda a usar IA <span class="serifa marca-texto">do nosso jeito</span></h1>
  <p class="t-lead">IA no Social Media e no Design, do jeito que a gente usa no dia a dia da agência.</p>
</section>
<section class="faixa secao" style="padding-top:24px">
  ${lps.length ? `<div class="grade grade-2">${lps.map((l, i) => { const p = l.produto || {}; const img = (l.seo && l.seo.imagem) || p.imagem_url; return `<a class="cartao" href="/cursos/${esc(l.slug)}" style="--i:${i}" data-revelar>
    ${img ? `<div class="capa"><img src="${esc(urlSegura(img))}" alt="" loading="lazy" decoding="async"></div>` : `<div class="capa capa-auto" style="--c:var(--marca)"><span class="capa-titulo">${esc(l.titulo)}</span>${icone('curso', 'i-grande')}</div>`}
    <div class="cartao-corpo"><h3>${esc(l.titulo)}</h3>${p.chamada ? `<p>${esc(p.chamada)}</p>` : ''}<div class="cartao-pe"><span>Mini curso</span><span class="acao">Conhecer${icone('seta')}</span></div></div></a>`; }).join('')}</div>`
    : vazio('curso', 'As inscrições abrem em breve', 'Siga o @agenciasetup para saber primeiro.', '<a class="bt" href="https://instagram.com/agenciasetup" target="_blank" rel="noopener">Seguir no Instagram</a>')}
</section>`;
}

// ---------------------------------------------------------------- institucionais e 404
export function institucional(titulo, md) {
  return `<article class="leitura"><h1 class="t-titulo">${esc(titulo)}</h1><div class="texto" style="margin-top:24px">${markdown(md)}</div></article>`;
}

export function naoEncontrada() {
  return `<section class="faixa secao" style="min-height:60vh;display:grid;place-items:center">
  ${vazio('busca', 'Essa página não existe', 'O endereço pode ter mudado. Busque o que você procura ou veja todos os recursos.', '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><a class="bt bt-marca" href="/recursos">Ver recursos</a><a class="bt" href="/busca" data-abrir-busca>Buscar</a></div>')}
</section>`;
}
