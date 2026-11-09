// Checkout em inglês (curso em inglês, em dólar, pelo Stripe): a mesma cara escura da Setup (estatico/checkout.css),
// com menos campos: e-mail, nome, o extra (bump) e o cupom. A pessoa paga na página segura do Stripe (cartão, Apple Pay,
// Google Pay) e volta para o obrigado. JavaScript em public/estatico/checkout-en.js?v=2. As páginas em português
// (render/checkout.js) não mudam.
import { esc, jsonScript } from '../nucleo/util.js';
import { rastreio } from './checkout.js';

const FONTES = 'https://fonts.googleapis.com/css2?family=Inter:wght@400..700&family=Instrument+Serif:ital@1&display=swap';
const LOGO = '<img src="/img/logo-setup-128.png" alt="" width="30" height="30">';
const I = {
  ok: '<path d="M20 6 9 17l-5-5"/>',
  escudo: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  cartao: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
  seta: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  fechar: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
};
const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
export const usd = (c) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;
const SITE = 'https://agenciasetup.com.br';

function pagina({ titulo, corpo, scripts = '', turnstile = false, rastrear = null, marca = null }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><link rel="icon" href="/img/favicon.png" type="image/png">
<title>${esc(titulo)}</title><meta name="robots" content="noindex"><meta name="theme-color" content="#09090a">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${FONTES}">
<link rel="stylesheet" href="/estatico/checkout.css?v=4">${turnstile ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' : ''}${rastreio(rastrear)}
</head><body>
<header class="gutter"><div class="ck-topo"><a class="logo" href="/">${LOGO}${esc((marca && marca.nome) || 'Agência Setup')}</a><span class="seguro">${ic('escudo')}Secure checkout</span></div></header>
<main class="gutter">${corpo}</main>${scripts}
</body></html>`;
}

function poster(o) {
  const p = (o.checkout && o.checkout.poster) || {};
  const nome = p.a || (o.produto && o.produto.nome) || o.nome;
  return `<div class="poster" style="--c:${esc(p.cor || '#ff7a00')}"><span class="tipo">${esc(p.tipo || 'Course')}</span><span class="nome">${esc(nome)}${p.b ? `<span class="serifa">${esc(p.b)}</span>` : ''}</span><span class="pe">${esc(p.pe || '')}</span></div>`;
}

export function paginaCheckoutEn({ oferta, simulado, turnstileSite, rastrear = null, marca = null }) {
  const c = oferta.checkout || {};
  const inclui = (c.inclui || []).map((t) => `<li>${ic('ok')}${esc(t)}</li>`).join('');
  const depos = (c.depoimentos || []).map((d) => `<div class="depo"><b>${esc(d.nome)}${d.quem ? ` · ${esc(d.quem)}` : ''}</b>"${esc(d.texto)}"</div>`).join('');
  const dados = {
    oferta: oferta.slug, preco: oferta.preco_centavos, bumps: oferta.bumps.map((b) => ({ id: b.id, nome: b.nome, preco: b.preco_centavos })),
    nome: oferta.nome, simulado: !!simulado, teste: !!oferta.teste, turnstile: turnstileSite || null,
    rastreio: rastrear ? { meta: !!rastrear.meta_pixel, ga4: !!rastrear.ga4, ads: rastrear.google_ads && rastrear.google_ads_rotulo ? `${rastrear.google_ads}/${rastrear.google_ads_rotulo}` : null } : null,
  };
  const corpo = `
<div class="ck" id="ck">
  <aside class="ck-resumo" aria-label="Order summary">
    <div class="ck-prod">${poster(oferta)}<div><h1>${esc(oferta.nome)}</h1><p>${esc(c.subtitulo || 'Instant access')}</p></div></div>
    ${inclui ? `<ul class="ck-inclui">${inclui}</ul>` : ''}
    <div class="ck-linhas" id="ck-linhas"><div class="total"><span>Total</span><span class="num">${usd(oferta.preco_centavos)}</span></div></div>
    <div class="ck-garantia">${ic('escudo')}<span><b>${oferta.garantia_dias}-day guarantee.</b> Not for you? Full refund.</span></div>
  </aside>

  <form class="ck-form" id="ck-form" novalidate>
    ${oferta.teste ? '<div class="erro-geral">Test offer: it only works on the computer and charges nothing.</div>' : ''}
    <div class="ck-bloco">
      <h2><span class="n">1</span>Your details</h2>
      <div class="campos">
        <div class="campo" data-campo="email"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" inputmode="email" required><small>Your access is sent here.</small></div>
        <div class="campo" data-campo="nome"><label for="nome">Full name</label><input id="nome" name="nome" autocomplete="name" required></div>
      </div>
      <small class="ck-aviso-contato">If you don't finish your purchase, we may email you to help you complete it. You can stop this anytime.</small>
    </div>

    <div class="ck-bloco">
      <h2><span class="n">2</span>Payment</h2>
      <div class="aviso-metodo aviso-cartao">${ic('cartao')}<span>One-time payment of <b id="total-txt">${usd(oferta.preco_centavos)}</b> in US dollars. Card, Apple Pay or Google Pay on Stripe's secure page, then you come back here. Your card number never goes through us.</span></div>
    </div>

    ${oferta.bumps.length ? `<div class="ck-bloco">${oferta.bumps.map((b) => `<label class="bump${b.cor ? ' tingido' : ''}" for="bump-${esc(b.id)}"${b.cor ? ` style="--c:${esc(b.cor)}"` : ''}><input type="checkbox" id="bump-${esc(b.id)}" data-bump="${esc(b.id)}"><span><b>${esc(b.titulo || `Add ${b.nome}`)}</b><p>${esc(b.texto || '')} <span class="preco-b">+ ${usd(b.preco_centavos)}</span>${b.preco_de_centavos ? ` <span class="fraco"><s>${usd(b.preco_de_centavos)}</s></span>` : ''}</p></span></label>`).join('')}</div>` : ''}

    <div class="ck-bloco">
      <button type="button" class="link-simples" id="tem-cupom">I have a coupon</button>
      <div class="cupom-linha" id="cupom-linha" hidden><div class="campo" data-campo="cupom" style="flex:1"><label for="cupom" class="fraco">Coupon</label><input id="cupom" name="cupom" autocomplete="off" style="text-transform:uppercase"><small id="cupom-msg"></small></div><button type="button" class="bt bt-p" id="aplicar-cupom">Apply</button></div>
    </div>

    ${turnstileSite ? `<div class="cf-turnstile" data-sitekey="${esc(turnstileSite)}" data-theme="dark" data-size="flexible"></div>` : ''}
    <div class="erro-geral" id="erro" role="alert" hidden></div>
    <div class="pagar-fixo">
      <button type="submit" class="bt bt-marca bt-g bt-cheio" id="pagar">Continue to payment</button>
      <small>By paying you agree to the <a href="/terms">terms of use</a>, the <a href="/privacy">privacy policy</a> and the <a href="/refunds">refund policy</a>.</small>
    </div>
    ${depos ? `<div class="depos">${depos}</div>` : ''}
  </form>
</div>
<script type="application/json" id="ck-dados">${jsonScript(dados)}</script>`;
  return pagina({ titulo: `${oferta.nome} · Checkout`, corpo, scripts: '<script src="/estatico/checkout-en.js?v=2" defer></script>', turnstile: !!turnstileSite, rastrear, marca });
}

export function paginaObrigadoEn({ pedidoId, simulado, rastrear = null, marca = null }) {
  const corpo = `
<div class="ck pago" id="ck">
  <section class="ok-tela" id="ok" aria-live="polite">
    <span class="bola" id="bola"><span class="giro"></span></span>
    <h2 id="ok-titulo">Checking your payment...</h2>
    <p id="ok-texto">This takes a few seconds. You can keep this page open.</p>
    <a class="bt bt-marca bt-g" id="entrar" href="#" hidden>Open the course${ic('seta')}</a>
    ${simulado ? '<button class="bt bt-p" type="button" id="simular">Simulate payment (computer only)</button>' : ''}
  </section>
</div>
<script type="application/json" id="ck-dados">${jsonScript({ pedido: pedidoId, simulado: !!simulado, rastreio: rastrear ? { meta: !!rastrear.meta_pixel, ga4: !!rastrear.ga4, ads: rastrear.google_ads && rastrear.google_ads_rotulo ? `${rastrear.google_ads}/${rastrear.google_ads_rotulo}` : null } : null })}</script>`;
  return pagina({ titulo: `Payment · ${(marca && marca.nome) || 'Agência Setup'}`, corpo, scripts: '<script src="/estatico/checkout-en.js?v=2" defer></script>', rastrear, marca });
}

export function paginaFechadaEn({ marca = null } = {}) {
  return pagina({ titulo: `Offer unavailable · ${(marca && marca.nome) || 'Agência Setup'}`, marca, corpo: `<div class="fechada"><span class="bola ruim">${ic('fechar')}</span><h2>This offer isn't available right now</h2><p class="mudo">It may have ended or not started yet.</p><a class="bt" href="/">Back to the course page</a></div>` });
}
