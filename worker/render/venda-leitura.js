// A página de venda de um curso com marca própria e tema "leitura" (o primeiro é o Dúvidas da Fé), na raiz do endereço
// dele (duvidasdafe.agenciasetup.com.br). Quem chega vem do Instagram, no celular, e muitas vezes tem dificuldade de ler:
// pouca frase, letra grande, um botão só ("Quero o livro", sempre verde), o preço sempre à vista e a ajuda no WhatsApp.
// Visual da capa do livro (templates/duvidas/capa.html): azul de Nossa Senhora, ouro nos detalhes, creme no texto e as
// pinturas do curso. As seções alternam azul e creme, para a leitura descansar. O texto vem dos blocos da landing page
// (painel, Cursos > Landing pages); os capítulos, o exemplo e o preço vêm do banco. Estilo em
// public/estatico/venda-leitura.css.
import { esc, jsonScript, markdown } from '../nucleo/util.js';
import { parcelasPossiveis } from '../lib/vendas.js';
import { rastreio } from './checkout.js';

const V = 4; // versão do CSS (troque ao mudar public/estatico/venda-leitura.css)
const FONTES = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600;1,700&family=Inter:wght@400;500;600;700&display=swap';
const I = {
  ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  nao: '<path d="M18 6 6 18M6 6l12 12"/>',
  seta: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  baixo: '<path d="m6 9 6 6 6-6"/>',
  carrinho: '<path d="M3 4h2l2.2 11.2a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
  celular: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18h2"/>',
  zap: '<path d="M4.5 20 6 15.6A8 8 0 1 1 9 18.6L4.5 20Z"/><path d="M9.2 9.2c0 2.8 2.8 5.6 5.6 5.6l1.2-1.6-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2-1.6 1.2Z"/>',
  escudo: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  print: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m21 15-4.5-4.5L8 19"/>',
  cadeado: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/>',
};
const ic = (n) => `<svg class="vl-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const CRUZ = '<svg class="vl-cruz" viewBox="0 0 16 22" aria-hidden="true"><path d="M6.6 0h2.8v6h5.6v2.8H9.4V22H6.6V8.8H1V6h5.6z"/></svg>';
const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const aspas = (t) => esc(t).replace(/&quot;(.*?)&quot;/g, '“$1”');
const ICONES_PASSOS = ['carrinho', 'email', 'celular'];
// O trecho em destaque do título sai em ouro e itálico (como o "da Fé" da capa).
const comDestaque = (titulo, destaque) => {
  const t = esc(titulo || '');
  const d = esc(destaque || '');
  return d && t.includes(d) ? t.replace(d, `<em>${d}</em>`) : t;
};
const olho = (b) => (b.olho ? `<p class="vl-olho">${esc(b.olho)}</p>` : '');
const livro = (x, classe = '') => (x.capaLivro ? `<div class="vl-livro ${classe}"><img src="${esc(x.capaLivro)}" alt="Capa do livro digital ${esc(x.marca.nome)}"></div>` : '');
// O livro é digital, e isso precisa ficar claro (quem vê a capa em 3D pode achar que chega pelo correio).
const DIGITAL = `<p class="vl-digital">${ic('celular')}Livro digital em PDF · não é livro de papel</p>`;
const botao = (b, x, classe = '') => `<a class="vl-botao ${classe}" href="${esc(x.checkout)}" data-cta>${esc(b.cta || 'Quero o livro')}<span>${brl(x.preco)}</span></a>`;

// ---------------------------------------------------------------- blocos
function heroi(b, x) {
  const provas = (b.provas || []).filter(Boolean).map((p) => `<li>${ic('ok')}${esc(p)}</li>`).join('');
  return `<section class="vl-heroi vl-escuro">
  <div class="vl-heroi-in">
    <div class="vl-heroi-livro">${livro(x, 'vl-livro-heroi')}${DIGITAL}</div>
    <div class="vl-heroi-txt">
      ${b.selo ? `<p class="vl-selo">${esc(b.selo)}</p>` : ''}
      <h1>${comDestaque(b.titulo || x.marca.nome, b.destaque)}</h1>
      ${b.subtitulo ? `<p class="vl-sub">${esc(b.subtitulo)}</p>` : ''}
      ${botao(b, x)}
      ${provas ? `<ul class="vl-provas">${provas}</ul>` : ''}
    </div>
  </div>
</section>`;
}

const lista = (b) => `<section class="vl-sec vl-perguntas"><div class="vl-in">
  <h2 class="vl-h2">${esc(b.titulo || '')}</h2>
  <div class="vl-baloes">${(b.itens || []).filter(Boolean).map((t, i) => `<p class="vl-balao${i % 2 ? ' vl-balao-dir' : ''}">${esc(t)}</p>`).join('')}</div>
  <p class="vl-resposta-curta">${ic('ok')}No livro, cada uma tem resposta.</p>
</div></section>`;

const texto = (b) => `<section class="vl-sec"><div class="vl-in vl-estreito">${b.titulo ? `<h2 class="vl-h2">${esc(b.titulo)}</h2>` : ''}<div class="vl-prosa">${markdown(b.md || '')}</div></div></section>`;

// "Como funciona": passos numerados (o bloco "cards" do painel).
function cards(b) {
  const itens = (b.itens || []).filter((i) => i && i.titulo).map((i, k) => `<li><span class="vl-passo-ic">${ic(ICONES_PASSOS[k] || 'ok')}<i>${k + 1}</i></span><span><b>${esc(i.titulo)}</b>${i.texto ? `<span>${esc(i.texto)}</span>` : ''}</span></li>`).join('');
  return `<section class="vl-sec vl-passos"><div class="vl-in">${olho(b)}<h2 class="vl-h2">${comDestaque(b.titulo, b.destaque)}</h2><ol>${itens}</ol></div></section>`;
}

function exemplo(b, x) {
  const d = x.exemplo;
  if (!d || !d.corpo) return '';
  const c = d.corpo;
  return `<section class="vl-sec vl-escuro vl-exemplo"><div class="vl-in">
  ${olho(b)}<h2 class="vl-h2">${esc(b.titulo || 'Veja como é por dentro')}</h2>
  <article class="vl-amostra">
    ${c.imagem && c.imagem.url ? `<img class="vl-amostra-img" src="${esc(c.imagem.url)}" alt="${esc(c.imagem.alt || '')}" loading="lazy">` : ''}
    <div class="vl-amostra-corpo">
      <p class="vl-amostra-olho">${d.capitulo ? `Capítulo ${d.capitulo} · ` : ''}${c.minutos || 3} minutos de leitura</p>
      <h3>${esc(d.titulo)}</h3>
      ${c.diga ? `<div class="vl-diga"><p class="vl-rotulo">Se alguém te perguntar, diga</p><p>${aspas(c.diga)}</p></div>` : `<div class="vl-resp"><p class="vl-rotulo">${ic('ok')}Resposta rápida</p><p>${aspas(c.resposta)}</p></div>`}
      <ul class="vl-tem">${['Resposta rápida', 'Explicação com calma', 'Na Bíblia', 'A Igreja ensina', 'Para guardar'].map((t) => `<li>${ic('ok')}${t}</li>`).join('')}</ul>
    </div>
  </article>
</div></section>`;
}

// Os capítulos com a pintura de cada um (a da primeira dúvida dele).
function capitulos(b, x) {
  const mods = (x.curso && x.curso.modulos) || [];
  if (!mods.length) return '';
  const total = mods.reduce((s, m) => s + m.aulas.length, 0);
  const capa = (m) => (m.aulas.find((a) => a.capa_url) || {}).capa_url;
  return `<section class="vl-sec vl-caps"><div class="vl-in">
  ${olho(b)}<h2 class="vl-h2">${esc(b.titulo || `${total} dúvidas em ${mods.length} capítulos`)}</h2>
  ${b.texto ? `<p class="vl-mudo">${esc(b.texto)}</p>` : ''}
  <ul class="vl-caps-grade">${mods.map((m) => `<li>${capa(m) ? `<img src="${esc(capa(m))}" alt="" loading="lazy">` : ''}<span><i>${m.numero}</i><b>${esc(m.titulo)}</b><small>${m.aulas.length} dúvidas</small></span></li>`).join('')}</ul>
</div></section>`;
}

// A ajudante que lê print (só no curso de leitura): um exemplo desenhado em código, sem foto de ninguém.
const ajudante = (b) => `<section class="vl-sec vl-escuro vl-ajudante"><div class="vl-in vl-duas">
  <div>${olho(b)}<h2 class="vl-h2">${esc(b.titulo || '')}</h2>${b.texto ? `<p class="vl-sub">${esc(b.texto)}</p>` : ''}</div>
  <div class="vl-conversa" aria-hidden="true">
    <div class="vl-print"><span class="vl-print-ic">${ic('print')}Print</span><p><b>alguém</b> Católico adora imagem, isso é idolatria.</p></div>
    <div class="vl-ia"><p class="vl-rotulo">${ic('ok')}Você pode responder assim</p><p>“Eu não adoro imagem, adoro só a Deus. A imagem me lembra quem viveu perto d'Ele, como a foto de alguém que eu amo.”</p></div>
  </div>
</div></section>`;

const paraQuem = (b) => `<section class="vl-sec vl-para"><div class="vl-in vl-duas">
  <div class="vl-cartao"><h2 class="vl-h3">Para quem é</h2><ul>${(b.sim || []).filter(Boolean).map((t) => `<li>${ic('ok')}${esc(t)}</li>`).join('')}</ul></div>
  ${(b.nao || []).filter(Boolean).length ? `<div class="vl-cartao vl-nao"><h2 class="vl-h3">Não é para</h2><ul>${b.nao.filter(Boolean).map((t) => `<li>${ic('nao')}${esc(t)}</li>`).join('')}</ul></div>` : ''}
</div></section>`;

// Os números aceitam o formato do painel ("60|dúvidas": o número grande) e texto corrido ("60 dúvidas").
const numero = (n) => { const [a, ...r] = String(n).split('|'); return r.length ? `<b>${esc(a.trim())}</b><span>${esc(r.join('|').trim())}</span>` : `<span>${esc(n)}</span>`; };
// Quem escreveu: o título e uma linha, a história de cada um num cartão (com a credencial em ouro e a foto, se houver;
// sem foto, a inicial), a frase em destaque e o selo do Catecismo. Sem os cartões (itens), fica o bloco simples.
const autor = (b) => {
  const pessoas = (b.itens || []).filter((p) => p && p.nome);
  const inicial = (n) => esc(String(n).trim().charAt(0).toUpperCase());
  return `<section class="vl-sec vl-autor"><div class="vl-in">
  <div class="vl-autor-cab">${CRUZ}<p class="vl-olho">${esc(b.papel || 'Quem preparou')}</p><h2 class="vl-h2">${esc(b.nome || '')}</h2>
  ${b.texto ? `<div class="vl-prosa">${markdown(b.texto)}</div>` : ''}</div>
  ${pessoas.length ? `<div class="vl-autores">${pessoas.map((p) => `<article class="vl-autor-cartao">
    <div class="vl-autor-topo">${p.foto ? `<img class="vl-autor-foto" src="${esc(p.foto)}" alt="${esc(p.nome)}" loading="lazy">` : `<span class="vl-monograma" aria-hidden="true">${inicial(p.nome)}</span>`}<div><b>${esc(p.nome)}</b>${p.selo ? `<span class="vl-autor-selo">${esc(p.selo)}</span>` : ''}</div></div>
    ${p.texto ? `<p>${esc(p.texto)}</p>` : ''}
  </article>`).join('')}</div>` : ''}
  ${b.destaque ? `<div class="vl-autor-destaque">${CRUZ}<p>${esc(b.destaque)}</p></div>` : ''}
  ${b.fecho ? `<p class="vl-autor-fecho">${ic('escudo')}<span>${esc(b.fecho)}</span></p>` : ''}
  ${(b.numeros || []).filter(Boolean).length ? `<ul class="vl-numeros">${b.numeros.filter(Boolean).map((n) => `<li>${numero(n)}</li>`).join('')}</ul>` : ''}
</div></section>`;
};

function preco(b, x) {
  const parc = x.oferta ? parcelasPossiveis(x.preco, x.oferta) : 1;
  // Lista em branco no painel: usa a do checkout (o que a pessoa vê na hora de pagar).
  const itens = (b.itens || []).filter(Boolean).length ? b.itens.filter(Boolean) : ((x.oferta && x.oferta.checkout && x.oferta.checkout.inclui) || []);
  const bump = x.oferta && Array.isArray(x.oferta.bumps) ? x.oferta.bumps[0] : null;
  return `<section class="vl-sec vl-escuro vl-preco" id="comprar"><div class="vl-in">
  <div class="vl-preco-caixa">
    <div class="vl-preco-topo">${livro(x, 'vl-livro-mini')}<div>${olho(b)}<h2 class="vl-h2">${esc(b.titulo || x.marca.nome)}</h2><span class="vl-tag-digital">${ic('celular')}Livro digital (PDF)</span></div></div>
    <ul>${itens.map((t) => `<li>${ic('ok')}${esc(t)}</li>`).join('')}</ul>
    <p class="vl-valor">${x.precoDe ? `<s>${brl(x.precoDe)}</s>` : ''}<b>${brl(x.preco)}</b>${parc > 1 ? `<small>ou até ${parc}x no cartão</small>` : ''}</p>
    <a class="vl-botao" href="${esc(x.checkout)}" data-cta>${esc(b.cta || 'Quero o livro')}${ic('seta')}</a>
    ${bump ? `<p class="vl-preco-bump">Na hora de pagar, você pode incluir o <b>${esc(bump.titulo || bump.nome)}</b> por + ${brl(bump.preco_centavos)}.</p>` : ''}
    <p class="vl-preco-pe">${ic('cadeado')}${esc(b.texto || 'Pagamento seguro.')}</p>
  </div>
</div></section>`;
}

const garantia = (b) => `<section class="vl-sec vl-garantia"><div class="vl-in vl-estreito"><div class="vl-selo-garantia">${ic('escudo')}<div><b>${esc(b.titulo || 'Garantia de 7 dias')}</b>${b.texto ? `<p>${esc(b.texto)}</p>` : ''}</div></div></div></section>`;

const faq = (b) => `<section class="vl-sec vl-faq"><div class="vl-in vl-estreito"><h2 class="vl-h2">${esc(b.titulo || 'Perguntas frequentes')}</h2><div class="vl-lista">${(b.itens || []).filter((i) => i && i.p).map((i) => `<details><summary><b>${esc(i.p)}</b>${ic('baixo')}</summary><p>${esc(i.r || '')}</p></details>`).join('')}</div></div></section>`;

const chamada = (b, x) => `<section class="vl-sec vl-escuro vl-chamada"><div class="vl-in">${livro(x, 'vl-livro-chamada')}<h2 class="vl-h2">${comDestaque(b.titulo, b.destaque)}</h2>${b.texto ? `<p class="vl-sub">${esc(b.texto)}</p>` : ''}${botao(b, x)}</div></section>`;

const depoimentos = (b) => ((b.itens || []).length ? `<section class="vl-sec vl-depos"><div class="vl-in"><h2 class="vl-h2">${esc(b.titulo || 'Quem já leu')}</h2><div class="vl-depos-grade">${b.itens.map((d) => `<figure class="vl-cartao"><blockquote>${esc(d.texto)}</blockquote><figcaption>${esc(d.nome)}</figcaption></figure>`).join('')}</div></div></section>` : '');

const BLOCOS = { heroi, lista, texto, exemplo, cards, aulas: capitulos, ajudante, para_quem: paraQuem, autor, preco, garantia, faq, chamada, depoimentos };

// ---------------------------------------------------------------- a página
// x: { lp, marca, oferta, curso, exemplo, capaLivro, rastrear, url, previa }
export function paginaVendaLeitura(x) {
  const { lp, marca } = x;
  const o = x.oferta;
  const dados = {
    ...x,
    capaLivro: x.capaLivro || marca.curso.capa_url,
    preco: o ? o.preco_centavos : (lp.produto && lp.produto.preco_centavos) || 0,
    precoDe: o ? o.preco_de_centavos : null,
    checkout: `/checkout/${o ? o.slug : marca.curso.slug}`,
  };
  const seo = lp.seo || {};
  const titulo = seo.titulo || `${marca.nome}: ${marca.curso.subtitulo || ''}`;
  const descricao = seo.descricao || marca.curso.subtitulo || '';
  const imagem = seo.imagem || x.capaLivroJpg || dados.capaLivro;
  const zap = marca.whatsapp ? `https://wa.me/${marca.whatsapp}` : null;
  const corpo = (Array.isArray(lp.blocos) ? lp.blocos : []).map((b) => (BLOCOS[b.tipo] ? BLOCOS[b.tipo](b, dados) : '')).join('\n');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title><meta name="description" content="${esc(descricao)}">${x.previa ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="website"><meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(descricao)}">${imagem ? `<meta property="og:image" content="${esc(imagem)}">` : ''}<meta property="og:url" content="${esc(x.url)}"><link rel="canonical" href="${esc(x.url)}">
<meta name="theme-color" content="#0A1429"><link rel="icon" href="/img/marcas/${esc(marca.curso.slug)}-192.png" type="image/png"><link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${FONTES}">
<link rel="stylesheet" href="/estatico/venda-leitura.css?v=${V}">${dados.capaLivro ? `<link rel="preload" as="image" href="${esc(dados.capaLivro)}">` : ''}
<script>try{var s=localStorage.getItem('agenciasetup-aluno');if(s&&s.indexOf('access_token')>0&&!/[?&]ver=1/.test(location.search))location.replace('/ler')}catch(e){}</script>${rastreio(x.rastrear)}
</head><body>
<header class="vl-topo"><span class="vl-marca">${CRUZ}${esc(marca.nome)}</span><a class="vl-entrar" href="/entrar">Já comprei</a></header>
${x.previa ? '<p class="vl-aviso-previa">Prévia: esta página ainda não está no ar.</p>' : ''}
<main>${corpo}</main>
<footer class="vl-pe">
  ${zap ? `<a class="vl-ajuda" href="${esc(zap)}">${ic('zap')}<span><b>Ficou com alguma dúvida antes de comprar?</b>Fale com a gente no WhatsApp</span></a>` : ''}
  <p>${esc(marca.nome)}${marca.autores ? ` · ${esc(marca.autores)}` : ''}</p>
  <p><a href="https://agenciasetup.com.br/termos">Termos de uso</a> · <a href="https://agenciasetup.com.br/privacidade">Privacidade</a> · <a href="/entrar">Já comprei: entrar</a></p>
</footer>
<div class="vl-barra" id="vl-barra" hidden><span><b>${esc(marca.nome)}</b>Livro digital · ${brl(dados.preco)}</span><a class="vl-botao" href="${esc(dados.checkout)}">Quero o livro</a></div>
<script type="application/json" id="vl-dados">${jsonScript({ previa: !!x.previa })}</script>
<script>
(function(){
  // A barra de compra aparece depois do topo e some quando outro botão de compra está na tela.
  var barra=document.getElementById('vl-barra'),ctas=[].slice.call(document.querySelectorAll('[data-cta]')),vis=new Set();
  if('IntersectionObserver' in window&&barra){var ob=new IntersectionObserver(function(es){es.forEach(function(e){e.isIntersecting?vis.add(e.target):vis.delete(e.target)});var passou=ctas[0]&&ctas[0].getBoundingClientRect().bottom<0;barra.hidden=!(passou&&vis.size===0)},{threshold:0});ctas.forEach(function(c){ob.observe(c)});addEventListener('scroll',function(){var passou=ctas[0]&&ctas[0].getBoundingClientRect().bottom<0;barra.hidden=!(passou&&vis.size===0)},{passive:true})}
  // O toque das visitas com marca de origem (UTM do Instagram e dos links do Comenta X).
  if(!JSON.parse(document.getElementById('vl-dados').textContent).previa)fetch('/api/toque',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:location.href,referrer:document.referrer}),keepalive:true}).catch(function(){});
})();
</script>
</body></html>`;
}
