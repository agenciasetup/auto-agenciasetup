// Checkout in English (course in US dollars, paid on Stripe): form, coupon and the thank-you page.
// The price that counts is the server's; here it is only shown. Portuguese checkout: checkout.js.
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const D = JSON.parse(($('#ck-dados') || {}).textContent || '{}');
  // Arrived straight at the checkout with a source tag (ad, bio link): it becomes a touch before the purchase.
  if (/[?&](utm_[a-z]+|fbclid|gclid|ttclid|de)=/.test(location.search) || (document.referrer && !/agenciasetup\.com/.test(document.referrer))) {
    fetch('/api/toque', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: location.href, referrer: document.referrer }), keepalive: true }).catch(() => {});
  }
  const usd = (c) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;
  const R = D.rastreio || {};
  const evento = (nome, dados = {}, id) => {
    try {
      if (R.meta && window.fbq) window.fbq('track', nome === 'compra' ? 'Purchase' : 'InitiateCheckout', dados.value ? { currency: 'USD', value: dados.value } : {}, id ? { eventID: id } : undefined);
      if (window.gtag) {
        if (nome === 'compra') {
          window.gtag('event', 'purchase', { transaction_id: id, value: dados.value, currency: 'USD' });
          if (R.ads) window.gtag('event', 'conversion', { send_to: R.ads, value: dados.value, currency: 'USD', transaction_id: id });
        } else window.gtag('event', 'begin_checkout', { currency: 'USD', value: dados.value });
      }
    } catch {}
  };
  const api = async (url, corpo) => {
    const r = await fetch(url, corpo ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) } : {});
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.erro || 'Something went wrong. Please try again.'), { dados: d });
    return d;
  };

  // ---------------------------------------------------------------- thank-you page
  if (!D.oferta && D.pedido) {
    const titulo = $('#ok-titulo'), texto = $('#ok-texto'), bola = $('#bola'), entrar = $('#entrar');
    const ver = async () => {
      try {
        const p = await api(`/api/checkout/pedido/${D.pedido}`);
        if (p.status === 'pago') {
          try { if (!sessionStorage.getItem(`compra:${p.id}`)) { sessionStorage.setItem(`compra:${p.id}`, '1'); evento('compra', { value: p.total_centavos / 100 }, p.id); } } catch {}
          bola.innerHTML = '<svg class="i" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>';
          titulo.textContent = "Payment confirmed. You're in!";
          texto.textContent = `We also sent the login link to ${p.email || 'your email'}.`;
          entrar.href = `${p.curso_url}/entrar?pedido=${encodeURIComponent(p.id)}`;
          entrar.hidden = false;
          if ($('#simular')) $('#simular').hidden = true;
          return;
        }
        if (['recusado', 'expirado', 'cancelado'].includes(p.status)) {
          bola.className = 'bola ruim';
          bola.innerHTML = '<svg class="i" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
          titulo.textContent = p.status === 'recusado' ? "The payment didn't go through" : 'This payment expired';
          texto.textContent = p.status === 'recusado' ? 'Your bank declined the card. Try another card, Apple Pay or Google Pay.' : 'Go back to the offer and start a new payment.';
          if (p.oferta) { entrar.textContent = 'Try again'; entrar.href = `/checkout/${p.oferta}`; entrar.hidden = false; }
          return;
        }
        titulo.textContent = 'Waiting for the payment to confirm...';
      } catch (e) {
        texto.textContent = e.message;
      }
      setTimeout(ver, 3000);
    };
    if ($('#simular')) $('#simular').addEventListener('click', async () => { await api(`/api/checkout/simular/${D.pedido}`, {}).catch(() => {}); });
    ver();
    return;
  }
  if (!D.oferta) return;

  // ---------------------------------------------------------------- checkout
  const form = $('#ck-form'), erro = $('#erro'), botao = $('#pagar');
  let cupom = '';
  const bumpsMarcados = () => $$('[data-bump]').filter((b) => b.checked).map((b) => b.dataset.bump);
  const indicado = new URLSearchParams(location.search).get('indicado');

  async function cotar() {
    const email = ($('#email').value || '').trim();
    try {
      const r = await api('/api/checkout/preco', { oferta: D.oferta, email, cupom: cupom || null, metodo: 'cartao', parcelas: 1, bumps: bumpsMarcados() });
      desenha(r);
      const msg = $('#cupom-msg');
      if (msg) msg.textContent = cupom ? (r.erro_cupom || (r.cupom ? 'Coupon applied.' : '')) : '';
    } catch {}
  }
  function desenha(r) {
    const linhas = $('#ck-linhas');
    let h = '';
    for (const i of r.itens || []) h += `<div><span>${i.nome.replace(/[<>&]/g, '')}</span><span class="num">${usd(i.centavos)}</span></div>`;
    if (r.desconto) h += `<div class="desc"><span>Discount</span><span class="num">-${usd(r.desconto)}</span></div>`;
    h += `<div class="total"><span>Total</span><span class="num">${usd(r.total)}</span></div>`;
    linhas.innerHTML = h;
    $('#total-txt').textContent = usd(r.total);
  }
  $$('[data-bump]').forEach((b) => b.addEventListener('change', cotar));
  $('#tem-cupom').addEventListener('click', () => { $('#cupom-linha').hidden = false; $('#tem-cupom').hidden = true; $('#cupom').focus(); });
  $('#aplicar-cupom').addEventListener('click', () => { cupom = ($('#cupom').value || '').trim().toUpperCase(); cotar(); });
  // Coming from the student app, email and name arrive after the # (they don't go to the server).
  try {
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.get('email')) $('#email').value = h.get('email');
    if (h.get('nome')) $('#nome').value = h.get('nome');
    if (h.get('email') || h.get('nome') || h.get('r')) history.replaceState(null, '', location.pathname + location.search);
    // Reminder link: fills in the details from the id. It never carries payment data.
    if (h.get('r')) api(`/api/checkout/retomar/${encodeURIComponent(h.get('r'))}`).then((c) => {
      if (c.email && !$('#email').value) $('#email').value = c.email;
      if (c.nome && !$('#nome').value) $('#nome').value = c.nome;
    }).catch(() => {});
  } catch {}
  // Keeps the contact when someone leaves a field or the page, so a person who gives up before paying can be helped later.
  let contatoEnviado = '';
  const guardaContato = () => {
    const email = ($('#email').value || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return;
    const s = JSON.stringify({ oferta: D.oferta, email, nome: $('#nome').value });
    if (s === contatoEnviado) return;
    contatoEnviado = s;
    fetch('/api/checkout/contato', { method: 'POST', headers: { 'content-type': 'application/json' }, body: s, keepalive: true }).catch(() => {});
  };
  ['#email', '#nome'].forEach((c) => $(c).addEventListener('change', guardaContato));
  addEventListener('pagehide', guardaContato);
  evento('inicio', { value: D.preco / 100 });

  function erroCampo(campo, msg) {
    $$('.campo.erro').forEach((c) => c.classList.remove('erro'));
    const c = campo && $(`.campo[data-campo="${campo}"]`);
    if (c) { c.classList.add('erro'); const i = c.querySelector('input'); if (i) i.focus(); }
    erro.textContent = msg;
    erro.hidden = false;
  }
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    erro.hidden = true;
    const corpo = {
      oferta: D.oferta, email: ($('#email').value || '').trim(), nome: ($('#nome').value || '').trim(), metodo: 'cartao', parcelas: 1,
      bumps: bumpsMarcados(), cupom: cupom || null, ...(indicado ? { indicado } : {}),
      turnstile: (document.querySelector('[name="cf-turnstile-response"]') || {}).value || null,
    };
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(corpo.email)) return erroCampo('email', 'Please check your email: your access is sent there.');
    if (corpo.nome.split(/\s+/).length < 2) return erroCampo('nome', 'Please enter your full name.');
    botao.disabled = true;
    botao.textContent = 'Opening the secure page...';
    try {
      const r = await api('/api/checkout', corpo);
      if (r.pagar_em) { location.href = r.pagar_em; return; }
      throw new Error('Something went wrong. Please try again.');
    } catch (e) {
      erroCampo(e.dados && e.dados.campo, e.message);
      botao.disabled = false;
      botao.textContent = 'Continue to payment';
      if (window.turnstile) window.turnstile.reset();
    }
  });
})();
