// As páginas do site público. Tudo é HTML montado no Worker, sem JavaScript obrigatório.
import { esc, markdown, dataLonga, tamanho, urlSegura } from '../nucleo/util.js';
import { htmlAnuncio, htmlAdsense } from '../lib/anuncios.js';

export const TIPOS = {
  prompt: 'Prompt', template: 'Template', planilha: 'Planilha', automacao: 'Automação',
  guia: 'Guia', pack: 'Pack', ferramenta: 'Ferramenta', video: 'Vídeo',
};

const nomeCategoria = (cats, id) => (cats.find((c) => c.id === id) || {}).nome || '';

function chip(texto, fechar = true) {
  return `<span class="chip">${fechar ? '<i aria-hidden="true">×</i>' : ''}<span>${esc(texto)}</span>${fechar ? '<i aria-hidden="true">×</i>' : ''}</span>`;
}

function cartaoRecurso(r, cats) {
  return `<a class="cartao" href="/recursos/${esc(r.slug)}">
  <div class="cartao-capa">${r.capa_url ? `<img src="${esc(urlSegura(r.capa_url))}" alt="" loading="lazy">` : `<span class="cartao-tipo-grande">${esc(TIPOS[r.tipo] || r.tipo)}</span>`}</div>
  <div class="cartao-corpo">
    <p class="rotulo">${esc(TIPOS[r.tipo] || r.tipo)}${r.categoria_id ? ` · ${esc(nomeCategoria(cats, r.categoria_id))}` : ''}</p>
    <h3>${esc(r.titulo)}</h3>
    ${r.resumo ? `<p class="mudo">${esc(r.resumo)}</p>` : ''}
    <p class="cartao-pe"><span>Grátis</span>${r.downloads ? `<span>${r.downloads.toLocaleString('pt-BR')} downloads</span>` : ''}</p>
  </div>
</a>`;
}

function cartaoArtigo(a, cats) {
  return `<a class="cartao cartao-artigo" href="/novidades/${esc(a.slug)}">
  ${a.capa_url ? `<div class="cartao-capa"><img src="${esc(urlSegura(a.capa_url))}" alt="" loading="lazy"></div>` : ''}
  <div class="cartao-corpo">
    <p class="rotulo">${a.categoria_id ? esc(nomeCategoria(cats, a.categoria_id)) : 'Novidade'} · ${esc(dataLonga(a.publicado_em))}</p>
    <h3>${esc(a.titulo)}</h3>
    ${a.resumo ? `<p class="mudo">${esc(a.resumo)}</p>` : ''}
  </div>
</a>`;
}

function vazio(titulo, texto) {
  return `<div class="vazio"><p class="vazio-titulo">${esc(titulo)}</p><p class="mudo">${esc(texto)}</p></div>`;
}

export function home({ recursos, artigos, cats, anuncios, cfg }) {
  return `
<section class="heroi">
  <div class="faixa heroi-faixa">
    <p class="contador">#001 / 365</p>
    ${chip('IA para quem cria')}
    <h1 class="display">Use IA para <span class="destaque">trabalhar menos</span> e criar melhor</h1>
    <p class="heroi-sub serif">Recursos gratuitos para Social Media e Design. Posts com IA, sem cara de IA.</p>
    <div class="acoes">
      <a class="botao" href="/recursos">Ver os recursos grátis</a>
      <a class="botao botao-vazado" href="/novidades">O que mudou na IA</a>
    </div>
  </div>
  <div class="heroi-brilho" aria-hidden="true"></div>
</section>

<section class="faixa secao">
  <div class="secao-topo"><h2 class="titulo-secao">Recursos <span class="serif destaque">grátis</span></h2><a class="mais" href="/recursos">Ver todos</a></div>
  ${recursos.length ? `<div class="grade">${recursos.map((r) => cartaoRecurso(r, cats)).join('')}</div>` : vazio('Os primeiros recursos chegam em breve.', 'Prompts, templates, planilhas e automações para usar IA no seu trabalho. Tudo grátis.')}
</section>

${htmlAnuncio(anuncios.meio, 'meio') ? `<section class="faixa">${htmlAnuncio(anuncios.meio, 'meio')}</section>` : ''}

<section class="faixa secao">
  <div class="secao-topo"><h2 class="titulo-secao">Novidades</h2><a class="mais" href="/novidades">Ver todas</a></div>
  ${artigos.length ? `<div class="grade grade-artigos">${artigos.map((a) => cartaoArtigo(a, cats)).join('')}</div>` : vazio('Nenhuma novidade publicada ainda.', 'Aqui entram as mudanças das ferramentas de IA que importam para quem cria.')}
</section>

<section class="faixa secao">
  <h2 class="titulo-secao">Assuntos</h2>
  <div class="assuntos">${cats.map((c) => `<a class="assunto" href="/recursos?c=${esc(c.slug)}"><strong>${esc(c.nome)}</strong><span class="mudo">${esc(c.descricao || '')}</span></a>`).join('')}</div>
</section>

${htmlAdsense(cfg) ? `<section class="faixa">${htmlAdsense(cfg)}</section>` : ''}`;
}

export function listaRecursos({ recursos, total, cats, atual, pagina, porPagina, anuncios, cfg }) {
  const paginas = Math.ceil(total / porPagina);
  const link = (p) => `/recursos?${atual ? `c=${esc(atual.slug)}&` : ''}p=${p}`;
  return `
<section class="faixa secao">
  <p class="contador">${total.toLocaleString('pt-BR')} recursos</p>
  <h1 class="display display-medio">${atual ? esc(atual.nome) : 'Recursos <span class="destaque">grátis</span>'}</h1>
  <p class="mudo largura-texto">${atual ? esc(atual.descricao || '') : 'Baixe, use e adapte. Sem cadastro obrigatório.'}</p>
  <nav class="filtros" aria-label="Assuntos">
    <a href="/recursos"${!atual ? ' aria-current="page"' : ''}>Todos</a>
    ${cats.map((c) => `<a href="/recursos?c=${esc(c.slug)}"${atual && atual.id === c.id ? ' aria-current="page"' : ''}>${esc(c.nome)}</a>`).join('')}
  </nav>
  ${recursos.length ? `<div class="grade">${recursos.map((r) => cartaoRecurso(r, cats)).join('')}</div>` : vazio('Nada por aqui ainda.', 'Os recursos deste assunto chegam em breve.')}
  ${paginas > 1 ? `<nav class="paginas">${pagina > 1 ? `<a href="${link(pagina - 1)}">Anterior</a>` : ''}<span>Página ${pagina} de ${paginas}</span>${pagina < paginas ? `<a href="${link(pagina + 1)}">Próxima</a>` : ''}</nav>` : ''}
  ${htmlAnuncio(anuncios.fim, 'fim')}
  ${htmlAdsense(cfg)}
</section>`;
}

export function paginaRecurso({ r, cats, anuncios, cfg }) {
  const arquivo = r.arquivo_url || r.link_externo;
  return `
<article class="faixa secao conteudo-pagina">
  <div class="conteudo-principal">
    <p class="rotulo"><a href="/recursos">Recursos</a>${r.categoria_id ? ` · ${esc(nomeCategoria(cats, r.categoria_id))}` : ''}</p>
    ${chip(TIPOS[r.tipo] || r.tipo)}
    <h1 class="display display-medio">${esc(r.titulo)}</h1>
    ${r.resumo ? `<p class="heroi-sub serif">${esc(r.resumo)}</p>` : ''}
    ${r.capa_url ? `<img class="capa" src="${esc(urlSegura(r.capa_url))}" alt="">` : ''}
    <div class="baixar">
      ${arquivo ? `<a class="botao botao-grande" href="/baixar/${esc(r.slug)}" rel="nofollow">Baixar grátis</a>` : '<p class="mudo">O arquivo deste recurso ainda não foi enviado.</p>'}
      <p class="mudo pequeno">${[r.arquivo_nome, tamanho(r.arquivo_bytes), r.downloads ? `${r.downloads.toLocaleString('pt-BR')} downloads` : ''].filter(Boolean).map(esc).join(' · ')}</p>
    </div>
    ${htmlAdsense(cfg)}
    <div class="texto">${markdown(r.corpo_md || '')}</div>
    ${htmlAnuncio(anuncios.fim, 'fim')}
  </div>
  <aside class="conteudo-lado">${htmlAnuncio(anuncios.lateral, 'lateral')}</aside>
</article>`;
}

export function listaArtigos({ artigos, total, cats, pagina, porPagina, cfg }) {
  const paginas = Math.ceil(total / porPagina);
  return `
<section class="faixa secao">
  <h1 class="display display-medio">Novidades</h1>
  <p class="mudo largura-texto">O que mudou nas ferramentas de IA e o que isso muda no seu trabalho.</p>
  ${artigos.length ? `<div class="grade grade-artigos">${artigos.map((a) => cartaoArtigo(a, cats)).join('')}</div>` : vazio('Nenhuma novidade publicada ainda.', 'Volte em breve.')}
  ${paginas > 1 ? `<nav class="paginas">${pagina > 1 ? `<a href="/novidades?p=${pagina - 1}">Anterior</a>` : ''}<span>Página ${pagina} de ${paginas}</span>${pagina < paginas ? `<a href="/novidades?p=${pagina + 1}">Próxima</a>` : ''}</nav>` : ''}
  ${htmlAdsense(cfg)}
</section>`;
}

export function paginaArtigo({ a, cats, anuncios, cfg }) {
  const fontes = Array.isArray(a.fontes) ? a.fontes : [];
  return `
<article class="faixa secao conteudo-pagina">
  <div class="conteudo-principal">
    <p class="rotulo"><a href="/novidades">Novidades</a>${a.categoria_id ? ` · ${esc(nomeCategoria(cats, a.categoria_id))}` : ''} · ${esc(dataLonga(a.publicado_em))}</p>
    <h1 class="display display-medio">${esc(a.titulo)}</h1>
    ${a.resumo ? `<p class="heroi-sub serif">${esc(a.resumo)}</p>` : ''}
    ${a.capa_url ? `<img class="capa" src="${esc(urlSegura(a.capa_url))}" alt="">` : ''}
    <div class="texto">${markdown(a.corpo_md || '')}</div>
    ${htmlAnuncio(anuncios.meio, 'meio')}
    ${fontes.length ? `<section class="fontes"><h2>Fontes</h2><ul>${fontes.map((f) => `<li><a href="${esc(urlSegura(f.url || f))}" target="_blank" rel="noopener">${esc(f.nome || f.url || f)}</a></li>`).join('')}</ul></section>` : ''}
    ${htmlAdsense(cfg)}
  </div>
  <aside class="conteudo-lado">${htmlAnuncio(anuncios.lateral, 'lateral')}</aside>
</article>`;
}

export function listaCursos({ lps }) {
  return `
<section class="faixa secao">
  <h1 class="display display-medio">Cursos</h1>
  <p class="mudo largura-texto">IA no Social Media e no Design, do jeito que a gente usa no dia a dia da agência.</p>
  ${lps.length ? `<div class="grade">${lps.map((l) => `<a class="cartao" href="/cursos/${esc(l.slug)}"><div class="cartao-corpo"><p class="rotulo">Curso</p><h3>${esc(l.titulo)}</h3></div></a>`).join('')}</div>` : vazio('As inscrições abrem em breve.', 'Siga o @agenciasetup para saber primeiro.')}
</section>`;
}

const preco = (c) => (c == null ? '' : (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

// Landing page por blocos. Cada bloco: { tipo, ... }. Tipos: heroi, lista, texto, depoimentos, preco, faq, chamada.
export function landingPage({ lp }) {
  const p = lp.produto || {};
  const checkout = esc(urlSegura(p.link_checkout || '#'));
  const bloco = (b) => {
    switch (b.tipo) {
      case 'heroi': return `<section class="lp-heroi"><div class="faixa">${b.selo ? chip(b.selo) : ''}<h1 class="display">${esc(b.titulo || lp.titulo)}</h1>${b.subtitulo ? `<p class="heroi-sub serif">${esc(b.subtitulo)}</p>` : ''}<a class="botao botao-grande" href="${checkout}">${esc(b.cta || 'Quero entrar')}</a></div><div class="heroi-brilho" aria-hidden="true"></div></section>`;
      case 'lista': return `<section class="faixa secao"><h2 class="titulo-secao">${esc(b.titulo || '')}</h2><ul class="lp-lista">${(b.itens || []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul></section>`;
      case 'texto': return `<section class="faixa secao texto">${b.titulo ? `<h2 class="titulo-secao">${esc(b.titulo)}</h2>` : ''}${markdown(b.md || '')}</section>`;
      case 'depoimentos': return `<section class="faixa secao"><h2 class="titulo-secao">${esc(b.titulo || 'Quem já fez')}</h2><div class="grade">${(b.itens || []).map((d) => `<blockquote class="depoimento"><p>${esc(d.texto)}</p><cite>${esc(d.nome)}</cite></blockquote>`).join('')}</div></section>`;
      case 'preco': return `<section class="faixa secao lp-preco">${p.preco_de_centavos ? `<p class="mudo"><s>${preco(p.preco_de_centavos)}</s></p>` : ''}<p class="display display-medio">${preco(p.preco_centavos)}</p>${b.texto ? `<p class="mudo">${esc(b.texto)}</p>` : ''}<a class="botao botao-grande" href="${checkout}">${esc(b.cta || 'Garantir minha vaga')}</a></section>`;
      case 'faq': return `<section class="faixa secao"><h2 class="titulo-secao">${esc(b.titulo || 'Perguntas frequentes')}</h2>${(b.itens || []).map((f) => `<details class="faq"><summary>${esc(f.p)}</summary><p>${esc(f.r)}</p></details>`).join('')}</section>`;
      case 'chamada': return `<section class="faixa secao lp-chamada"><h2 class="display display-medio">${esc(b.titulo || '')}</h2><a class="botao botao-grande" href="${checkout}">${esc(b.cta || 'Quero entrar')}</a></section>`;
      default: return '';
    }
  };
  const blocos = Array.isArray(lp.blocos) && lp.blocos.length ? lp.blocos : [{ tipo: 'heroi' }];
  return blocos.map(bloco).join('\n');
}

export function institucional(titulo, md) {
  return `<article class="faixa secao conteudo-pagina"><div class="conteudo-principal"><h1 class="display display-medio">${esc(titulo)}</h1><div class="texto">${markdown(md)}</div></div></article>`;
}

export function naoEncontrada() {
  return `<section class="faixa secao vazio-pagina"><p class="contador">404</p><h1 class="display display-medio">Essa página não existe</h1><p class="mudo">O endereço pode ter mudado. Os recursos estão todos aqui:</p><a class="botao" href="/recursos">Ver os recursos</a></section>`;
}
