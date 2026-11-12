// A página de venda de um curso (/cursos/<slug>). Quem chega quase sempre vem da DM do Instagram, no celular.
// Visual da própria Agência Setup (o dos carrosséis e da VSL): blocos amarelo, preto e papel, letra condensada
// gigante, floreio, meio-tom e grão, notificações do iPhone. Movimento com GSAP (public/estatico/venda.js), sempre
// como melhoria: sem JavaScript, ou para quem pede menos movimento, a página continua inteira e legível.
// O texto vem dos blocos da landing page (painel, Cursos > Landing pages); aulas, kit, preço e depoimentos, do banco.
import { blocosComCampanha } from '../lib/campanha.js';
import { esc, jsonScript, markdown, urlSegura } from '../nucleo/util.js';
import { parcelaCentavos, parcelasPossiveis } from '../lib/vendas.js';
import { rastreio } from './checkout.js';
import { usd } from './checkout-en.js';
import { emIngles, topoERodapeEn } from './venda-en.js';

const FONTES = 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700&family=Inter:wght@400;500;600&family=Instrument+Serif:ital@1&family=JetBrains+Mono:wght@500&display=swap';
const V = 9; // versão do CSS e do JS da página (troque ao mudar public/estatico/venda.*)
const I = {
  ok: '<path d="M20 6 9 17l-5-5"/>',
  nao: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  seta: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor" stroke="none"/>',
  escudo: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  raio: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  pix: '<path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="m8.2 12 3.8-3.8 3.8 3.8-3.8 3.8z"/>',
  arquivo: '<path d="M14 3v5h5"/><path d="M19 8.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h8.5z"/>',
  baixo: '<path d="m6 9 6 6 6-6"/>',
  coracao: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  balao: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  aviao: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/>',
  fogo: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
};
const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
const FAISCA = '<svg class="faisca" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.5c.4 3.9 1.3 6.2 2.9 7.6 1.5 1.4 3.9 2.1 7.6 2.4-3.7.4-6.1 1.1-7.6 2.5-1.6 1.4-2.5 3.7-2.9 7.5-.4-3.8-1.3-6.1-2.9-7.5-1.5-1.4-3.9-2.1-7.6-2.5 3.7-.3 6.1-1 7.6-2.4 1.6-1.4 2.5-3.7 2.9-7.6z"/></svg>';
const brlReal = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const minutos = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
function duracaoLonga(s) {
  const m = Math.round(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m} min`;
}
const TIPO_ARQ = {
  receita: ['receita', 'receitas', 'Você arrasta na conversa e o Claude faz o passo inteiro.'],
  skill: ['skill', 'skills', 'Modelos prontos que o Claude usa sozinho.'],
  guia: ['guia', 'guias', 'Para ler com calma, sem jargão.'],
  modelo: ['modelo de arte', 'modelos de arte', 'Em camadas, vira o seu post.'],
  ferramenta: ['ferramenta', 'ferramentas', 'Exporta a arte e gera imagens.'],
};

// Destaca, no título, o trecho escrito em "destaque" (serifa itálica).
function tituloComDestaque(titulo, destaque) {
  const t = esc(titulo || '');
  const d = esc(destaque || '');
  if (!d || !t.includes(d)) return t;
  // A pontuação logo depois entra no destaque (sem o vão da letra inclinada antes do ponto).
  const i = t.indexOf(d) + d.length;
  const pont = (t.slice(i).match(/^[.!?,:;]+/) || [''])[0];
  return `${t.slice(0, i - d.length)}<em>${d}${pont}</em>${t.slice(i + pont.length)}`;
}

// Preço que aparece na página (o que vale é o do checkout, calculado no servidor).
export function precoDaVenda(oferta, produto) {
  const base = (oferta && oferta.preco_centavos) || (produto && produto.preco_centavos) || 0;
  if (!base) return null;
  const pct = oferta ? Number(oferta.pix_desconto_pct) || 0 : 0;
  const temCartao = !oferta || (oferta.metodos || []).includes('cartao');
  const temPix = !oferta || (oferta.metodos || []).includes('pix');
  const n = oferta && temCartao ? parcelasPossiveis(base, oferta) : 1;
  return {
    base, de: (oferta && oferta.preco_de_centavos) || null,
    pix: temPix && pct ? base - Math.round((base * pct) / 100) : null, pixPct: pct,
    parcelas: n > 1 ? { n, valor: parcelaCentavos(base, n, oferta.juros_mes) } : null,
    // 0 = sem garantia de satisfação (produto para baixar com licença própria, ex.: a Família Calango). Por isso `??`
    // e não `||`: o `||` trocava o 0 por 7.
    garantia: oferta && oferta.garantia_dias != null ? Number(oferta.garantia_dias) : 7,
  };
}

// Contador que sobe quando aparece na tela ("128 mil" -> 128 sobe, " mil" fica).
function contador(texto) {
  const m = String(texto).match(/^(\D*)(\d+(?:[.,]\d+)?)(.*)$/);
  if (!m) return esc(texto);
  return `${esc(m[1])}<span data-conta="${esc(m[2].replace(/\./g, '').replace(',', '.'))}">${esc(m[2])}</span>${esc(m[3])}`;
}

// idioma 'en' (curso em inglês, marca própria): preço em dólar e os rótulos fixos em inglês (render/venda-en.js).
// garantiaDias: a garantia quando não há oferta ligada (dadosDaVenda tira da oferta desligada do produto). Com 0, a
// página não fala em garantia em lugar nenhum: nem selo, nem bloco, nem barra fixa.
export function paginaVenda({ lp, oferta, curso, video, depoimentos = [], garantiaDias = null, rastrear = null, url, idioma = 'pt', marca = null }) {
  lp = { ...lp, blocos: blocosComCampanha(lp.blocos) }; // o que é de campanha com data some depois dela (lib/campanha.js)
  const en = idioma === 'en';
  const brl = en ? usd : brlReal;
  const p = lp.produto || {};
  const preco = precoDaVenda(oferta, p);
  const linkCompra = oferta ? `/checkout/${oferta.slug}` : urlSegura(p.link_checkout || '#');
  const comprar = esc(linkCompra);
  const bump = oferta && Array.isArray(oferta.bumps) ? oferta.bumps[0] : null;
  const linhaPreco = preco ? `${preco.parcelas ? `${preco.parcelas.n}x de ${brl(preco.parcelas.valor)} ou ` : ''}${brl(preco.base)} à vista` : '';
  const garantia = oferta && preco ? preco.garantia : garantiaDias != null ? Number(garantiaDias) || 0 : 7;
  const aulas = curso ? curso.modulos.reduce((s, m) => s + m.aulas.length, 0) : 0;
  const totalS = curso ? curso.modulos.reduce((s, m) => s + m.aulas.reduce((x, a) => x + (a.duracao_s || 0), 0), 0) : 0;
  const bt = (texto, extra = '') => `<a class="v-bt" href="${comprar}" data-comprar${extra}><span>${esc(texto || 'Quero entrar')}</span>${ic('seta')}</a>`;
  // O bump como segundo botão: chega ao checkout já marcado (?com=<slug>).
  const btVitalicio = () => (bump ? `<a class="v-bt-vitalicio" href="${esc(`${linkCompra}?com=${encodeURIComponent(bump.slug)}`)}" data-comprar>${ic('fogo')}<span>Vitalício por + ${esc(brl(bump.preco_centavos))}</span></a>` : '');
  // Os selos do topo. `heroi.selos` troca os textos (ex.: o combo de cursos de fora não tem "Acesso na hora");
  // os ícones seguem a ordem raio, escudo, Pix.
  // Sem garantia (0), o selo padrão do escudo some e os outros dois ficam com os seus ícones.
  const selosDoTopo = (b) => {
    const pares = Array.isArray(b.selos)
      ? b.selos.filter(Boolean).map((t, i) => [t, ['raio', 'escudo', 'pix'][i % 3]])
      : [['Acesso na hora', 'raio'], ...(garantia ? [[`${garantia} dias de garantia`, 'escudo']] : []), ['Pix ou cartão', 'pix']];
    return pares.length ? `<ul class="v-selos">${pares.map(([t, i]) => `<li>${ic(i)}${esc(t)}</li>`).join('')}</ul>` : '';
  };
  const cab = (b, padrao, intro) => `${b.olho ? `<p class="v-olho">${esc(b.olho)}</p>` : ''}<h2 class="v-h2" data-split>${tituloComDestaque(b.titulo || padrao, b.destaque)}</h2>${(b.texto || intro) ? `<p class="v-intro">${esc(b.texto || intro)}</p>` : ''}`;
  const ancoraDe = (b) => String(b.ancora || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  // Brasas subindo (Black Friday, pedido do dono em 05/11/2026): pontinhos de fogo em posições fixas (sem sorteio, a
  // página sai sempre igual). Só animam com movimento liberado (venda.css).
  const brasas = (n = 22) => `<div class="v-brasas" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i style="--x:${(i * 37 + 7) % 100}%;--d:${((i * 0.73) % 6).toFixed(2)}s;--t:${5 + (i % 5)}s;--s:${2 + (i % 4)}px;--dx:${(i % 2 ? 1 : -1) * (10 + ((i * 7) % 24))}px"></i>`).join('')}</div>`;
  const sec = (tema, classe, miolo, id = '') => `<section class="v-sec t-${tema} ${classe}"${id ? ` id="${id}"` : ''}><div class="v-faixa">${miolo}</div></section>`;
  const notificacao = (app, quando, texto, extra = '') => `<div class="v-notif"${extra}><span class="v-notif-ic">${/data-ig/.test(extra) ? '' : FAISCA}</span><div><p><b>${esc(app)}</b><small>${esc(quando)}</small></p><span>${esc(texto)}</span></div></div>`;
  // O leque do topo: as capas dos estilos (o primeiro estilo no meio) e, na ponta, o cartão "O seu estilo".
  const leque = () => {
    const eb = (Array.isArray(lp.blocos) ? lp.blocos : []).find((x) => x && x.tipo === 'estilos');
    const its = eb ? (eb.itens || []).filter((x) => x && x.nome && Array.isArray(x.imagens) && x.imagens.filter(Boolean).length) : [];
    if (its.length < 3) return '';
    // o <a> fica com a posição no leque (CSS); o miolo é o que anima (o GSAP reescreve a transformação de quem ele mexe)
    const carta = (x) => `<a class="v-carta" href="#estilos"><span class="v-carta-in"><span class="v-carta-cab"><b>${esc(x.nome)}</b><small>${esc(x.nicho || '')}</small></span><img src="${esc(urlSegura(x.imagens.filter(Boolean)[0]))}" alt="Capa do exemplo ${esc(x.nome)}" decoding="async" width="864" height="1080"></span></a>`;
    const seu = `<a class="v-carta v-carta-sua" href="#historia"><span class="v-carta-in"><span class="v-carta-cab"><b>O seu estilo</b><small>aprendido do seu Instagram</small></span><span class="v-carta-sua-miolo"><em>seu</em><span>estilo</span></span></span></a>`;
    const [a, b2, c, d] = its;
    const ordem = [d ? carta(d) : '', carta(b2), carta(a), c ? carta(c) : '', seu].filter(Boolean);
    return `<div class="v-leque" data-leque>${ordem.map((h, i) => h.replace('class="v-carta', `style="--i:${i - (ordem.length - 1) / 2}" class="v-carta`)).join('')}</div>`;
  };

  const B = {
    // Topo: texto e botões de um lado, vídeo do outro; embaixo, um leque com os estilos de post (do bloco "estilos"),
    // cortado pela faixa que vem logo depois.
    heroi: (b) => `
<section class="v-heroi t-preto">
  <div class="v-heroi-fundo" aria-hidden="true"></div>
  ${b.brasas ? brasas() : ''}
  <div class="v-faixa v-heroi-grade">
    <div class="v-heroi-texto">
      ${b.selo ? `<p class="v-rotulo${b.brasas ? ' v-rotulo-black' : ''}">${b.brasas ? ic('fogo') : ''}${esc(b.selo)}</p>` : ''}
      ${b.grande ? `<h1 class="v-capa"><span class="v-capa-pre">${esc(b.pre || '')}</span><span class="v-capa-grande${b.brasas ? ' v-capa-fogo' : ''}">${esc(b.grande)}</span><span class="v-capa-pos">${tituloComDestaque(b.pos || '', b.destaque)}</span></h1>`
        : `<h1 class="v-titulo">${tituloComDestaque(b.titulo || lp.titulo, b.destaque)}</h1>`}
      ${b.subtitulo ? `<p class="v-sub">${esc(b.subtitulo)}</p>` : ''}
      ${b.mostrar_de && preco && preco.de > preco.base ? `<p class="v-heroi-de"><s>${brl(preco.de)}</s><b>${brl(preco.base)}</b><span>-${Math.round((1 - preco.base / preco.de) * 100)}%</span></p>` : ''}
      <div class="v-heroi-acao">
        <div class="v-botoes">${bt(b.cta || 'Quero entrar', ' data-cta-topo')}${b.vitalicio !== false ? btVitalicio() : ''}</div>
        ${linhaPreco ? `<p class="v-preco-linha">${esc(linhaPreco)}${preco.pix ? ` · ${brl(preco.pix)} no Pix` : ''}</p>` : ''}
        ${selosDoTopo(b)}
      </div>
    </div>
    <div class="v-heroi-video">
      ${!video && b.imagem ? `<div class="v-video v-heroi-imagem"><img src="${esc(urlSegura(b.imagem))}" alt="${esc(b.imagem_alt || '')}" width="1280" height="720" fetchpriority="high"></div>` : videoHtml(video, b, curso)}
      ${video ? notificacao('Claude', 'agora', 'Seu post de hoje está pronto para aprovar ✓', ' data-toast') : ''}
    </div>
  </div>
  ${b.leque === false ? '' : leque()}
</section>`,

    // Faixa inclinada com palavras correndo: a quebra entre um bloco e outro.
    marquee: (b) => {
      const itens = (b.itens || []).filter(Boolean);
      if (!itens.length) return '';
      const linha = itens.map((t) => `<span>${esc(t)}</span><i>✦</i>`).join('');
      const fita = (c) => `<div class="v-fita ${c}"><div class="v-fita-trilho"><div>${linha}</div><div>${linha}</div></div></div>`;
      // uma faixa reta com as palavras correndo, entre dois blocos
      return `<div class="v-marquee" aria-hidden="true">${fita('a')}</div>`;
    },

    // O antes e o depois de uma pessoa (personagem de exemplo), com a chave "modo automático" no meio.
    historia: (b) => {
      const a = b.antes || {}, d = b.depois || {};
      return sec(b.tema || 'preto', 'v-historia', `
  ${cab(b, 'Esse é o Flávio')}
  <div class="v-flavio">
    <article class="v-flavio-card antes" data-revelar>
      <figure>${a.foto ? `<img src="${esc(urlSegura(a.foto))}" alt="${esc(a.alt || '')}" loading="lazy" decoding="async" width="960" height="1192">` : ''}
        <figcaption>${(a.chips || []).filter(Boolean).map((t, i) => `<span class="v-chip c${i}">${esc(t)}</span>`).join('')}</figcaption></figure>
      <div class="v-flavio-txt"><h3>${tituloComDestaque(a.titulo || 'Antes', a.destaque)}</h3>${a.texto ? `<p>${esc(a.texto)}</p>` : ''}
      ${(a.itens || []).filter(Boolean).length ? `<ul class="v-dores">${a.itens.filter(Boolean).map((t) => `<li>${ic('nao')}<span>${esc(t)}</span></li>`).join('')}</ul>` : ''}</div>
    </article>
    <div class="v-virada" data-virada>
      <span class="v-chave" aria-hidden="true"><i></i></span>
      <b>${esc(b.chave || 'Modo automático')}</b>
      ${b.virada ? `<small>${esc(b.virada)}</small>` : ''}
    </div>
    <article class="v-flavio-card depois" data-revelar>
      <figure>${d.foto ? `<img src="${esc(urlSegura(d.foto))}" alt="${esc(d.alt || '')}" loading="lazy" decoding="async" width="960" height="1192">` : ''}
        <div class="v-notifs">${(d.notificacoes || []).filter((n) => n && n.texto).map((n) => notificacao(n.app || 'Claude', n.hora || 'agora', n.texto, ' data-notif')).join('')}</div></figure>
      <div class="v-flavio-txt"><h3>${tituloComDestaque(d.titulo || 'Depois', d.destaque)}</h3>${d.texto ? `<p>${esc(d.texto)}</p>` : ''}
      ${(d.itens || []).filter(Boolean).length ? `<ul class="v-ganhos">${d.itens.filter(Boolean).map((t) => `<li>${ic('ok')}<span>${esc(t)}</span></li>`).join('')}</ul>` : ''}</div>
    </article>
  </div>
  ${b.nota ? `<p class="v-nota">${esc(b.nota)}</p>` : ''}`, 'historia');
    },

    // O Claude trabalhando: acha o assunto, escreve, monta a arte em camadas e o post sai no Instagram.
    simulacao: (b) => {
      const assuntos = (b.assuntos || []).filter((x) => x && x.t).slice(0, 3);
      const palavra = esc(b.palavra || 'PALAVRA');
      return sec(b.tema || 'preto', 'v-sim', `
  ${cab(b, 'Veja o Claude trabalhando')}
  <div class="v-sim-palco" data-sim>
    <div class="v-janela" data-revelar>
      <div class="v-janela-topo"><i></i><i></i><i></i><span>${esc(b.janela || 'Claude · Posts-Automaticos')}</span></div>
      <div class="v-chat">
        <div class="v-msg eu" data-passo><span class="v-anexo">${ic('arquivo')}${esc(b.arquivo || '04-radar.md')}</span>siga este arquivo</div>
        <div class="v-msg ia" data-passo><span class="v-msg-ic">${FAISCA}</span><span>Procurando o que está em alta em <b>${esc(b.nicho || 'seu nicho')}</b>…</span></div>
        <div class="v-radar" data-passo>${assuntos.map((x) => `<div><span>${esc(x.t)}</span><i style="--calor:${Math.max(5, Math.min(100, Number(x.calor) || 50))}%"><b></b></i><em data-conta="${Number(x.calor) || 50}">${Number(x.calor) || 50}</em></div>`).join('')}</div>
        <div class="v-msg ia" data-passo><span class="v-msg-ic">${FAISCA}</span><span>Escrevi o post do dia no seu estilo: <q>${esc(b.post_titulo || '')}</q> Aprova?</span></div>
        <div class="v-msg-acoes" data-passo><span class="v-aprovar" data-aprovar>Aprovar</span><span>Pedir ajuste</span></div>
      </div>
    </div>
    <div class="v-arte" data-arte data-revelar aria-hidden="true">
      <div class="v-camada c0"><b>fundo</b></div>
      <div class="v-camada c1"><b>título</b><span>${esc(b.post_titulo || '')}</span></div>
      <div class="v-camada c2"><b>elementos</b><i></i><i></i><i></i></div>
      <div class="v-camada c3"><b>acabamento</b></div>
      ${b.imagem ? `<img class="v-arte-final" src="${esc(urlSegura(b.imagem))}" alt="" loading="lazy" decoding="async" width="864" height="1080">` : ''}
    </div>
    <div class="v-fone" data-fone data-revelar>
      <div class="v-fone-tela">
        <div class="v-ig-topo"><span class="v-ig-av"></span><b>${esc(b.perfil || '@seuperfil')}</b><small>agora</small></div>
        <div class="v-ig-post">${b.imagem ? `<img src="${esc(urlSegura(b.imagem))}" alt="Post de exemplo" loading="lazy" decoding="async" width="864" height="1080">` : ''}</div>
        <div class="v-ig-acoes">${ic('coracao')}${ic('balao')}${ic('aviao')}</div>
        <p class="v-ig-curtidas"><b data-conta="${Number(b.curtidas) || 1284}">${(Number(b.curtidas) || 1284).toLocaleString(en ? 'en-US' : 'pt-BR')}</b> curtidas</p>
        <div class="v-ig-coments"><p data-coment><b>marina.adv</b> ${palavra}</p><p data-coment><b>jose_r</b> ${palavra} 🙏</p><p data-coment><b>carla.m</b> ${palavra}!!</p></div>
      </div>
      <div class="v-fone-dm" data-dm>${notificacao('Instagram', 'agora', b.dm || '128 novos comentários no seu post', ' data-ig')}</div>
    </div>
  </div>
  ${(b.passos || []).length ? `<ol class="v-sim-passos">${b.passos.map((t, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span>${esc(t)}</li>`).join('')}</ol>` : ''}`, 'como-funciona');
    },

    // `inicio`: o primeiro número (dois blocos de cartões seguidos contam 01 a 07); `ancora` e `menu`: entra no menu do topo.
    cards: (b) => sec(b.tema || 'preto', '', `
  ${cab(b, 'O que você monta')}
  <div class="v-cards"${Number(b.colunas) >= 2 && Number(b.colunas) <= 4 ? ` style="--colunas:${Number(b.colunas)}"` : ''}>${(b.itens || []).map((x, i) => `<article class="v-card${x.imagem ? ' v-card-com-capa' : ''}" data-revelar>${x.imagem ? `<img class="v-card-capa" src="${esc(urlSegura(x.imagem))}" alt="${esc(x.titulo ? `Capa do ${x.titulo}` : '')}" loading="lazy" decoding="async" width="820" height="440">` : ''}<span class="v-num">${String(i + (Number(b.inicio) || 1)).padStart(2, '0')}</span><h3>${esc(x.titulo || '')}</h3><p>${esc(x.texto || '')}</p></article>`).join('')}</div>
  ${(b.itens || []).length > 1 ? `<p class="v-arraste">${ic('seta')}Arraste para o lado</p>` : ''}`, ancoraDe(b)),

    // Exemplos de estilo: uma parede curva com os slides de cada estilo (uma coluna por estilo); o toque abre o carrossel.
    estilos: (b) => {
      const itens = (b.itens || []).filter((x) => x && x.nome && Array.isArray(x.imagens) && x.imagens.filter(Boolean).length);
      if (!itens.length) return '';
      const dados = itens.map((x) => ({ nome: x.nome, nicho: x.nicho || '', imagens: x.imagens.filter(Boolean).map((u) => urlSegura(u)) }));
      const meio = (dados.length - 1) / 2;
      return `
<section class="v-sec t-${esc(b.tema || 'preto')} v-estilos-sec" id="estilos"><div class="v-faixa">
  <div class="v-centro">${cab(b, 'Posts no seu estilo')}</div>
  <div class="v-parede" data-parede>${dados.map((x, i) => `
    <div class="v-parede-col" style="--k:${i - meio}">
      ${x.imagens.slice(0, 3).map((u, j) => `<a class="v-post" href="${esc(u)}" data-estilo="${i}" data-slide="${j}" aria-label="${esc(`${x.nome}, slide ${j + 1}`)}"><img src="${esc(u)}" alt="" loading="lazy" decoding="async" width="864" height="1080"></a>`).join('')}
      <p class="v-parede-nome"><b>${esc(x.nome)}</b><small>${esc(x.nicho)}</small></p>
    </div>`).join('')}
  </div>
  <p class="v-parede-dica">${esc(b.dica || 'Toque num post para ver o carrossel inteiro.')}</p>
</div>
<dialog class="v-galeria" data-galeria aria-label="Exemplo de carrossel" data-lenis-prevent><div class="v-galeria-topo"><b data-galeria-nome></b><button type="button" data-galeria-fechar aria-label="Fechar">${ic('nao')}</button></div><div class="v-galeria-fotos" data-galeria-fotos></div><p class="v-galeria-pe" data-galeria-pe></p></dialog>
<script type="application/json" data-estilos>${jsonScript(dados)}</script>
</section>`;
    },

    lista: (b) => sec(b.tema || 'papel', '', `
  ${cab(b, 'O que você aprende')}
  <ul class="v-lista">${(b.itens || []).filter(Boolean).map((t) => `<li data-revelar>${ic('ok')}<span>${esc(t)}</span></li>`).join('')}</ul>`),

    texto: (b) => sec(b.tema || 'papel', 'v-estreita-sec', `
  ${b.titulo ? `<h2 class="v-h2" data-split>${tituloComDestaque(b.titulo, b.destaque)}</h2>` : ''}
  <div class="v-texto">${markdown(b.md || '')}</div>`),

    dia: (b) => sec(b.tema || 'papel', 'v-dia-sec', `
  ${cab(b, 'Como fica o seu dia')}
  <ol class="v-dia">${(b.itens || []).map((x) => `<li class="${/voc/i.test(x.quem || '') ? 'voce' : ''}" data-revelar><span class="v-hora">${esc(x.hora || '')}</span><div><b>${esc(x.quem || '')}</b><p>${esc(x.texto || '')}</p></div></li>`).join('')}</ol>
  ${b.nota ? `<p class="v-nota">${esc(b.nota)}</p>` : ''}`),

    para_quem: (b) => sec(b.tema || 'preto', 'v-pq-sec', `
  ${b.titulo ? cab(b, '') : ''}
  <div class="v-paraquem">
    <div class="v-pq sim" data-revelar><h3>É para você se</h3><ul>${(b.sim || []).filter(Boolean).map((t) => `<li>${ic('ok')}<span>${esc(t)}</span></li>`).join('')}</ul></div>
    ${(b.nao || []).filter(Boolean).length ? `<div class="v-pq nao" data-revelar><h3>Não é para você se</h3><ul>${b.nao.filter(Boolean).map((t) => `<li>${ic('nao')}<span>${esc(t)}</span></li>`).join('')}</ul></div>` : ''}
  </div>`),

    aulas: (b) => (!curso ? '' : sec(b.tema || 'preto', 'v-aulas-sec', `
  ${cab(b, `As ${aulas} aulas`)}
  <p class="v-resumo-aulas"><b data-conta="${aulas}">${aulas}</b> aulas <i>·</i> <b>${duracaoLonga(totalS)}</b> de vídeo <i>·</i> <b data-conta="${curso.modulos.length}">${curso.modulos.length}</b> módulos</p>
  <div class="v-modulos">${curso.modulos.map((m, i) => `
    <details class="v-modulo"${i === 0 ? ' open' : ''} data-revelar>
      <summary><span class="v-mod-n">${String(m.numero).padStart(2, '0')}</span><span class="v-mod-t"><b>${esc(m.titulo)}</b><small>${m.aulas.length} ${m.aulas.length === 1 ? 'aula' : 'aulas'} · ${duracaoLonga(m.aulas.reduce((x, a) => x + (a.duracao_s || 0), 0))}</small></span>${ic('baixo')}</summary>
      <ol>${m.aulas.map((a) => `<li><span class="v-cod">${esc(a.codigo)}</span><span class="v-aula-t">${esc(a.titulo)}${a.gratis && video ? ' <a class="v-gratis" href="#video" data-assistir>Grátis</a>' : ''}</span><span class="v-dur">${a.duracao_s ? minutos(a.duracao_s) : ''}</span></li>`).join('')}</ol>
    </details>`).join('')}
  </div>`, 'aulas')),

    kit: (b) => {
      if (!curso || !curso.arquivos.length) return '';
      const conta = {};
      for (const a of curso.arquivos) if (TIPO_ARQ[a.tipo]) conta[a.tipo] = (conta[a.tipo] || 0) + 1;
      const tiles = Object.entries(conta).sort((x, y) => y[1] - x[1]).map(([t, n]) => `<div class="v-tile" data-revelar><b data-conta="${n}">${n}</b><span>${n === 1 ? TIPO_ARQ[t][0] : TIPO_ARQ[t][1]}</span><small>${TIPO_ARQ[t][2]}</small></div>`).join('');
      const lista = curso.arquivos.filter((a) => a.tipo !== 'pacote');
      return sec(b.tema || 'preto', 'v-kit-sec', `
  ${cab(b, 'O kit que vem junto')}
  <div class="v-tiles">${tiles}</div>
  <details class="v-todos"><summary>Ver os ${lista.length} arquivos${ic('baixo')}</summary><ul>${lista.map((a) => `<li>${ic('arquivo')}<div><b>${esc(a.nome)}</b>${a.o_que ? `<span>${esc(a.o_que)}</span>` : ''}</div></li>`).join('')}</ul></details>`);
    },

    autor: (b) => sec(b.tema || 'preto', 'v-autor-sec', `
  <div class="v-autor">
    ${b.foto ? `<div class="v-autor-foto" data-paralaxe><span class="v-autor-disco"></span><img src="${esc(urlSegura(b.foto))}" alt="${esc(b.nome || '')}" loading="lazy" decoding="async" width="560" height="695"></div>` : ''}
    <div class="v-autor-texto">
      <p class="v-olho">${esc(b.olho || 'Quem ensina')}</p>
      <h2 class="v-h2" data-split>${esc(b.nome || '')}</h2>
      ${b.papel ? `<p class="v-papel">${esc(b.papel)}</p>` : ''}
      ${b.texto ? `<div class="v-texto">${markdown(b.texto)}</div>` : ''}
      ${(b.numeros || []).filter(Boolean).length ? `<ul class="v-numeros">${b.numeros.filter(Boolean).map((t) => { const [n, ...r] = String(t).includes('|') ? String(t).split('|') : String(t).split(' '); return `<li><b>${contador(n.trim())}</b><span>${esc(r.join(' ').trim())}</span></li>`; }).join('')}</ul>` : ''}
    </div>
  </div>`),

    depoimentos: (b) => {
      const itens = [...(b.itens || []), ...depoimentos].filter((d) => d && d.texto).slice(0, 8);
      if (!itens.length) return '';
      return sec(b.tema || 'preto', '', `
  ${cab(b, 'Quem já fez')}
  <div class="v-depos">${itens.map((d) => `<blockquote class="v-depo" data-revelar><p>“${esc(d.texto)}”</p><cite>${esc(d.nome || '')}</cite></blockquote>`).join('')}</div>`);
    },

    // A oferta: o cartão em destaque, com o preço grande, o botão verde e o vitalício.
    preco: (b) => {
      const inclui = (b.itens && b.itens.filter(Boolean).length ? b.itens : (oferta && oferta.checkout && oferta.checkout.inclui) || []).filter(Boolean);
      return `
<section class="v-sec t-${esc(b.tema || 'preto')} v-oferta-sec" id="comprar"><div class="v-faixa">
  <div class="v-oferta" data-oferta>
    <p class="v-olho">${esc(b.olho || 'Comece hoje')}</p>
    <h2 class="v-h2" data-split>${tituloComDestaque(b.titulo || p.nome || lp.titulo, b.destaque)}</h2>
    ${inclui.length ? `<ul class="v-inclui">${inclui.map((t) => `<li data-revelar>${ic('ok')}<span>${esc(t)}</span></li>`).join('')}</ul>` : ''}
    ${preco ? `<div class="v-valor" data-revelar>
      ${preco.de ? `<s>${brl(preco.de)}</s>` : ''}
      <strong>${brl(preco.base)}</strong>
      <span>${preco.parcelas ? `ou ${preco.parcelas.n}x de ${brl(preco.parcelas.valor)} no cartão` : 'no cartão'}${preco.pix ? ` · <b>${brl(preco.pix)} no Pix</b>` : ''}</span>
    </div>` : ''}
    ${bt(b.cta || 'Quero entrar agora')}
    ${btVitalicio()}
    ${bump && b.nota_vitalicio !== '' ? `<p class="v-vitalicio-nota">${esc(b.nota_vitalicio || 'O vitalício tira o prazo de 1 ano: toda aula nova ou refeita fica sua.')}</p>` : ''}
    <p class="v-seguro">${ic('escudo')}Pagamento seguro. ${esc(b.texto || 'O acesso chega no seu e-mail assim que o pagamento for aprovado.')}</p>
  </div>
</div></section>`;
    },

    garantia: (b) => (!garantia ? '' : sec(b.tema || 'preto', 'v-garantia-sec', `
  <div class="v-garantia" data-revelar>
    <div class="v-selo-garantia"><b>${garantia}</b><span>dias</span></div>
    <div><h2 class="v-h3">${esc(b.titulo || `${garantia} dias de garantia`)}</h2><p>${esc(b.texto || 'Entrou e achou que não é para você? É só pedir e devolvemos todo o seu dinheiro.')}</p></div>
  </div>`)),

    faq: (b) => sec(b.tema || 'preto', 'v-faq-sec', `
  ${cab(b, 'Perguntas frequentes')}
  <div class="v-faq">${(b.itens || []).filter((f) => f && f.p).map((f) => `<details><summary>${esc(f.p)}${ic('baixo')}</summary><p>${esc(f.r || '')}</p></details>`).join('')}</div>`),

    // Parede de capas correndo (duas fileiras em sentidos opostos): dá o tamanho do que vem junto.
    capas: (b) => {
      const its = (b.itens || []).filter(Boolean).map((u) => urlSegura(u));
      if (its.length < 3) return '';
      const fila = (lista, i) => `<div class="v-capas-fila${i ? ' volta' : ''}"><div class="v-capas-trilho">${[...lista, ...lista].map((u, j) => `<img src="${esc(u)}" alt="" loading="lazy" decoding="async" width="820" height="440"${j >= lista.length ? ' aria-hidden="true"' : ''}>`).join('')}</div></div>`;
      const meio = Math.ceil(its.length / 2);
      return `<section class="v-sec t-preto v-capas-sec" aria-label="${esc(b.rotulo || 'Os cursos do combo')}">${b.titulo ? `<div class="v-faixa v-centro">${cab(b, '')}</div>` : ''}${fila([...its.slice(meio), ...its.slice(0, meio)], 0)}${fila([...its.slice(0, meio), ...its.slice(meio)].reverse(), 1)}</section>`;
    },

    // Um cartão grande por curso: a capa, a etiqueta, os números, o preço de tabela riscado, o texto e o que tem dentro.
    cursos: (b) => {
      const its = (b.itens || []).filter((x) => x && x.nome);
      if (!its.length) return '';
      return sec(b.tema || 'preto', 'v-cursos-sec', `
  ${cab(b, 'O que vem no combo')}
  <div class="v-cursos">${its.map((x, i) => `
    <article class="v-curso" data-revelar>
      ${x.imagem ? `<div class="v-curso-capa"><img src="${esc(urlSegura(x.imagem))}" alt="${esc(`Capa do ${x.nome}`)}" loading="lazy" decoding="async" width="820" height="440"><span class="v-curso-n">${String(i + 1).padStart(2, '0')}</span></div>` : ''}
      <div class="v-curso-texto">
        ${x.etiqueta ? `<p class="v-curso-etiqueta">${esc(x.etiqueta)}</p>` : ''}
        <h3>${esc(x.nome)}</h3>
        ${(x.numeros || []).length ? `<p class="v-curso-numeros">${x.numeros.map((t) => `<span>${esc(t)}</span>`).join('')}</p>` : ''}
        ${x.texto ? `<p class="v-curso-desc">${esc(x.texto)}</p>` : ''}
        ${(x.dentro || []).length ? `<ul class="v-curso-dentro">${x.dentro.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${Number(x.preco_centavos) > 0 ? `<p class="v-curso-preco">Na tabela: <s>${brl(Number(x.preco_centavos))}</s><b>No combo</b></p>` : ''}
      </div>
    </article>`).join('')}
  </div>`, ancoraDe(b));
    },

    // Contador grande no meio da página (a mesma data do contador do alto).
    contador: (b) => {
      const hbx = (Array.isArray(lp.blocos) ? lp.blocos : []).find((x) => x && x.tipo === 'heroi');
      const ate = b.ate || (hbx && hbx.contador && hbx.contador.ate);
      if (!ate || !Date.parse(ate)) return '';
      // Já sai com o tempo que falta na hora em que a página foi montada (sem "00" piscando antes do relógio).
      let falta = Math.max(0, Math.floor((Date.parse(ate) - Date.now()) / 1000));
      const v = { d: Math.floor(falta / 86400) };
      falta %= 86400; v.h = String(Math.floor(falta / 3600)).padStart(2, '0');
      falta %= 3600; v.m = String(Math.floor(falta / 60)).padStart(2, '0'); v.s = String(falta % 60).padStart(2, '0');
      const caixa = (k, t) => `<div class="v-cont-caixa"><b data-c="${k}">${v[k]}</b><span>${t}</span></div>`;
      return sec(b.tema || 'preto', 'v-cont-sec', `
  <div class="v-centro">${cab(b, 'Só até 30/11')}</div>
  <div class="v-cont-grande" data-contador="${esc(new Date(ate).toISOString())}" data-estilo="grande" role="timer">${caixa('d', 'dias')}${caixa('h', 'horas')}${caixa('m', 'min')}${caixa('s', 'seg')}</div>
  ${b.nota ? `<p class="v-cont-nota">${esc(b.nota)}</p>` : ''}
  ${b.cta ? bt(b.cta) : ''}`);
    },

    // A conta (ancoragem): o preço de tabela de cada item riscado, o total riscado e o preço da oferta grande.
    ancora: (b) => {
      const itens = (b.itens || []).filter((x) => x && x.nome && Number(x.preco_centavos) > 0);
      if (!itens.length || !preco) return '';
      const total = itens.reduce((s, x) => s + Number(x.preco_centavos), 0);
      const economia = total - preco.base;
      return sec(b.tema || 'preto', 'v-ancora-sec', `
  <div class="v-centro">${cab(b, 'A conta')}</div>
  <div class="v-ancora" data-revelar>
    <ul>${itens.map((x) => `<li><span>${esc(x.nome)}</span><s>${brl(Number(x.preco_centavos))}</s></li>`).join('')}</ul>
    <p class="v-ancora-total"><span>${esc(b.total_texto || 'Tudo separado')}</span><s>${brl(total)}</s></p>
    <p class="v-ancora-hoje"><span>${esc(b.hoje_texto || 'No combo, hoje')}</span><strong>${brl(preco.base)}</strong></p>
    ${economia > 0 ? `<p class="v-ancora-econ">${ic('fogo')}Você economiza ${brl(economia)} (${Math.round((economia / total) * 100)}% de desconto)</p>` : ''}
    ${bt(b.cta || 'Quero o combo')}
  </div>`, ancoraDe(b));
    },

    // Números grandes em fila (ex.: "10.000+|alunos"): o número sobe quando aparece.
    numeros: (b) => {
      const itens = (b.itens || []).filter(Boolean);
      if (!itens.length) return '';
      return sec(b.tema || 'preto', 'v-numeros-sec', `
  ${b.titulo ? `<div class="v-centro">${cab(b, '')}</div>` : ''}
  <ul class="v-numeros v-numeros-faixa">${itens.map((t) => { const [n, ...r] = String(t).split('|'); return `<li data-revelar><b>${contador(n.trim())}</b><span>${esc(r.join(' ').trim())}</span></li>`; }).join('')}</ul>`);
    },

    chamada: (b) => `
<section class="v-sec t-preto v-final">${b.brasas ? brasas(16) : ''}<div class="v-faixa">
  ${b.grande ? `<p class="v-final-grande" data-letras aria-label="${esc(b.grande)}">${esc(b.grande)}</p>` : ''}
  <h2 class="v-h2" data-split>${tituloComDestaque(b.titulo || lp.titulo, b.destaque)}</h2>
  ${b.texto ? `<p class="v-intro">${esc(b.texto)}</p>` : ''}
  ${bt(b.cta || 'Quero entrar')}
  ${btVitalicio()}
  ${linhaPreco ? `<p class="v-preco-linha">${esc(linhaPreco)}</p>` : ''}
</div></section>`,
  };

  const blocos = Array.isArray(lp.blocos) && lp.blocos.length ? lp.blocos : [{ tipo: 'heroi' }, { tipo: 'aulas' }, { tipo: 'preco' }];
  const corpo = blocos.map((b) => (B[b.tipo] ? B[b.tipo](b) : '')).join('\n');
  // Contador no alto (`heroi.contador`: { ate: data ISO, texto, fim_texto }): sem JavaScript fica a data por extenso.
  const hb = blocos.find((b) => b && b.tipo === 'heroi');
  // Passou da data, o contador do alto some (a página continua vendendo; não fica "Oferta encerrada" no topo).
  const cont = hb && hb.contador && Date.parse(hb.contador.ate) > Date.now() ? hb.contador : null;
  const contadorHtml = cont ? `<div class="v-contador" data-contador="${esc(new Date(cont.ate).toISOString())}" role="timer"><span class="v-contador-txt">${ic('fogo')}${esc(cont.texto || 'A oferta acaba em')}</span><span class="v-contador-tempo" data-contador-tempo>${esc(cont.fim_texto || '')}</span></div>` : '';
  // O relógio dos contadores: o do alto (em linha) e o bloco "contador" (caixas grandes).
  const contadorJs = cont || blocos.some((b) => b && b.tipo === 'contador') ? '<script>(function(){function p(n){return(n<10?"0":"")+n}document.querySelectorAll("[data-contador]").forEach(function(e){var f=Date.parse(e.getAttribute("data-contador")),g=e.getAttribute("data-estilo")==="grande",t=e.querySelector("[data-contador-tempo]");function k(){var s=Math.max(0,Math.floor((f-Date.now())/1000)),d=Math.floor(s/86400),r=s%86400,h=Math.floor(r/3600),m=Math.floor(r%3600/60),x=r%60;if(g){var v={d:d,h:p(h),m:p(m),s:p(x)};e.querySelectorAll("[data-c]").forEach(function(b){b.textContent=v[b.getAttribute("data-c")]})}else if(t){t.innerHTML=s?"<b>"+d+"</b>d <b>"+p(h)+"</b>h <b>"+p(m)+"</b>m <b>"+p(x)+"</b>s":"Oferta encerrada"}if(s)setTimeout(k,1000-Date.now()%1000)}k()})})();</script>' : '';
  // O menu do topo só leva às seções que existem nesta página (mais as que o bloco pede com `menu` e `ancora`).
  const menu = [['historia', 'Exemplo'], ['como-funciona', 'Como funciona'], ['estilos', 'Estilos'], ['aulas', 'Aulas'],
    ...blocos.filter((b) => b && b.menu && ancoraDe(b)).map((b) => [ancoraDe(b), b.menu]), ['comprar', 'Preço']]
    .filter(([id]) => corpo.includes(`id="${id}"`))
    .sort((a, c) => corpo.indexOf(`id="${a[0]}"`) - corpo.indexOf(`id="${c[0]}"`))
    .map(([id, t]) => `<a href="#${id}">${esc(t)}</a>`).join('');
  // A barra fixa de baixo. `heroi.barra_cta` troca o "Quero entrar" (que é de curso; a Família Calango usa "Quero a
  // Família Calango") e `heroi.barra_linha` é a linha embaixo do preço quando não há parcelas nem garantia.
  const hbBarra = (Array.isArray(lp.blocos) ? lp.blocos : []).find((b) => b && b.tipo === 'heroi') || {};
  const linhaBarra = garantia ? `${garantia} dias de garantia` : hbBarra.barra_linha || 'Pagamento seguro';
  const barra = `<div class="v-barra" data-barra><div class="v-barra-preco">${preco ? `<b>${brl(preco.base)}</b><span>${preco.parcelas ? `ou ${preco.parcelas.n}x de ${brl(preco.parcelas.valor)}` : esc(linhaBarra)}</span>` : `<b>${esc(lp.titulo)}</b>`}</div><a class="v-bt v-bt-p" href="${comprar}" data-comprar><span>${esc(hbBarra.barra_cta || 'Quero entrar')}</span>${ic('seta')}</a></div>`;

  const seo = lp.seo || {};
  const titulo = seo.titulo || `${lp.titulo} | ${en && marca ? marca.nome : 'Agência Setup'}`;
  const desc = seo.descricao || p.chamada || '';
  const imagem = seo.imagem || p.imagem_url || (curso && curso.capa_url) || '';
  const ld = { '@context': 'https://schema.org', '@type': 'Course', name: lp.titulo, description: desc, provider: { '@type': 'Organization', name: 'Agência Setup', sameAs: 'https://agenciasetup.com.br' }, ...(preco ? { offers: { '@type': 'Offer', price: (preco.base / 100).toFixed(2), priceCurrency: 'BRL', category: 'Paid', availability: 'https://schema.org/InStock', url } } : {}) };
  const pagina = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Agência Setup">
<meta property="og:title" content="${esc(lp.titulo)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
${imagem ? `<meta property="og:image" content="${esc(imagem)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0a0a0a">
<meta name="color-scheme" content="dark">
<link rel="icon" href="/img/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/img/logo-setup-128.png">
${video && video.poster ? `<link rel="preload" as="image" href="${esc(video.poster)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTES}">
<link rel="stylesheet" href="/estatico/venda.css?v=${V}">
<script>document.documentElement.classList.add('js')</script>
<script type="application/ld+json">${jsonScript(ld)}</script>
${rastreio(rastrear)}
</head>
<body${cont ? ' class="com-contador"' : ''}>
${contadorHtml}
<header class="v-topo"><div class="v-faixa"><a class="v-logo" href="/"><img src="/img/logo-setup-128.png" alt="" width="28" height="28">Agência Setup</a><nav class="v-menu" aria-label="Nesta página">${menu}</nav>${curso ? '<a class="v-topo-entrar" href="https://curso.agenciasetup.com.br/">Já sou aluno</a>' : ''}</div></header>
<main>
${corpo}
</main>
<footer class="v-rodape"><div class="v-faixa">
  <a class="v-logo" href="/"><img src="/img/logo-setup-128.png" alt="" width="24" height="24">Agência Setup</a>
  <p>Dúvidas? Chama no Instagram <a href="https://instagram.com/agenciasetup" target="_blank" rel="noopener">@agenciasetup</a>.</p>
  <nav><a href="/privacidade">Privacidade</a><a href="/termos">Termos</a><a href="/recursos">Recursos grátis</a></nav>
</div></footer>
${barra}
${contadorJs}
<script src="/estatico/vendor/gsap.min.js?v=3.13.0" defer></script>
<script src="/estatico/vendor/ScrollTrigger.min.js?v=3.13.0" defer></script>
<script src="/estatico/vendor/lenis.min.js?v=1.3.26" defer></script>
<script src="/estatico/venda.js?v=${V}" defer></script>
</body>
</html>`;
  if (!en) return pagina;
  return topoERodapeEn(emIngles(pagina), { entrar: marca ? `${marca.url}/entrar` : '/entrar', nome: marca ? marca.nome : 'Agência Setup' });
}

// O vídeo do topo: capa e botão; o player só carrega no toque (página leve no 4G).
function videoHtml(video, b, curso) {
  if (!video) {
    const capa = curso && curso.capa_url;
    return capa ? `<div class="v-video" id="video"><img src="${esc(capa)}" alt="" width="1280" height="720"></div>` : '';
  }
  return `<div class="v-video" id="video">
  <button type="button" class="v-video-capa" data-video="${esc(video.url)}" aria-label="${esc(b.video_rotulo || 'Assistir ao vídeo')}">
    ${video.poster ? `<img src="${esc(video.poster)}" alt="" width="1280" height="720" fetchpriority="high">` : ''}
    <span class="v-video-rotulo"><span class="v-play">${ic('play')}</span><b>${esc(b.video_rotulo || 'Assista de graça')}</b>${video.duracao_s ? `<span class="v-dur-video">${duracaoLonga(video.duracao_s)}</span>` : ''}</span>
  </button>
</div>`;
}
