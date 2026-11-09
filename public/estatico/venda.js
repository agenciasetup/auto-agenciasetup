// Página de venda: rolagem suave (Lenis) e animações discretas (GSAP + ScrollTrigger), sempre como melhoria: sem elas,
// ou para quem pede menos movimento, tudo aparece no lugar. Também: o vídeo carrega no toque, a galeria dos estilos,
// a barra de compra que some quando outro botão está na tela e o "toque" das visitas com marca de origem.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const html = document.documentElement;
  const calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (v) => Math.round(v).toLocaleString('pt-BR');

  if (/[?&](utm_[a-z]+|fbclid|gclid|ttclid|de)=/.test(location.search) || (document.referrer && !/agenciasetup\.com/.test(document.referrer))) {
    fetch('/api/toque', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: location.href, referrer: document.referrer }), keepalive: true }).catch(() => {});
  }
  if (window.fbq) window.fbq('track', 'ViewContent');

  // ---------------------------------------------------------------- vídeo: o player do Bunny só entra no toque
  const capa = $('[data-video]');
  const tocar = () => {
    if (!capa || !capa.isConnected) return;
    const f = document.createElement('iframe');
    f.src = capa.dataset.video.replace('autoplay=false', 'autoplay=true');
    f.allow = 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.referrerPolicy = 'origin';
    f.title = capa.getAttribute('aria-label') || 'Vídeo';
    capa.replaceWith(f);
  };
  if (capa) capa.addEventListener('click', tocar);
  $$('[data-assistir]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const v = $('#video');
    if (v) v.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(tocar, 450);
  }));

  // ---------------------------------------------------------------- estilos: o toque num post abre o carrossel inteiro
  const estilos = (() => { try { return JSON.parse(($('[data-estilos]') || {}).textContent || '[]'); } catch { return []; } })();
  const galeria = $('[data-galeria]');
  const fotos = $('[data-galeria-fotos]'), pe = $('[data-galeria-pe]');
  const contarGaleria = () => {
    if (!fotos || !pe || !fotos.children.length) return;
    const w = fotos.firstElementChild.offsetWidth + 12;
    const i = Math.round(fotos.scrollLeft / Math.max(1, w));
    pe.textContent = `${Math.min(i + 1, fotos.children.length)} de ${fotos.children.length} · arraste para o lado`;
  };
  if (galeria && galeria.showModal && estilos.length) {
    fotos.addEventListener('scroll', contarGaleria, { passive: true });
    $('[data-galeria-fechar]').addEventListener('click', () => galeria.close());
    galeria.addEventListener('click', (e) => { if (e.target === galeria || e.target === fotos) galeria.close(); });
    $$('[data-estilo]').forEach((a) => a.addEventListener('click', (e) => {
      const x = estilos[+a.dataset.estilo];
      if (!x) return;
      e.preventDefault();
      $('[data-galeria-nome]').textContent = `${x.nome}${x.nicho ? ` · ${x.nicho}` : ''}`;
      fotos.innerHTML = x.imagens.map((u, i) => `<img src="${u}" alt="Slide ${i + 1} do exemplo ${x.nome}" decoding="async">`).join('');
      galeria.showModal();
      const j = +a.dataset.slide || 0;
      requestAnimationFrame(() => { const alvo = fotos.children[j]; fotos.scrollLeft = alvo ? alvo.offsetLeft - (fotos.clientWidth - alvo.clientWidth) / 2 : 0; contarGaleria(); });
    }));
  }

  // ---------------------------------------------------------------- barra de compra
  const barra = $('[data-barra]');
  const vigiar = $$('[data-cta-topo], [data-oferta], .v-final');
  if (barra && vigiar.length && 'IntersectionObserver' in window) {
    const vistos = new Set();
    barra.classList.add('fora');
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? vistos.add(e.target) : vistos.delete(e.target)));
      barra.classList.toggle('fora', vistos.size > 0);
    });
    vigiar.forEach((el) => io.observe(el));
  }

  // ---------------------------------------------------------------- movimento
  const G = window.gsap, ST = window.ScrollTrigger;
  if (!G || !ST || calmo) {
    // sem GSAP (ou com menos movimento): aparece na rolagem com CSS e os estados finais já ficam certos
    const alvos = $$('[data-revelar]');
    if ('IntersectionObserver' in window && !calmo) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
      alvos.forEach((el) => io.observe(el));
    } else alvos.forEach((el) => el.classList.add('visto'));
    $$('[data-virada]').forEach((v) => v.classList.add('ligado'));
    $$('[data-aprovar]').forEach((a) => a.classList.add('feito'));
    $$('[data-fone]').forEach((f) => f.classList.add('curtido'));
    return;
  }
  G.registerPlugin(ST);
  html.classList.add('anima');
  const em = (el, extra = {}) => ({ trigger: el, start: 'top 86%', once: true, ...extra });

  // rolagem suave no mouse e no trackpad (no toque do celular fica a rolagem nativa)
  if (window.Lenis) {
    const lenis = new window.Lenis({ lerp: 0.1, anchors: true });
    lenis.on('scroll', ST.update);
    G.ticker.add((t) => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
    // a galeria em tela cheia rola sozinha
    if (galeria) { galeria.addEventListener('close', () => lenis.start()); new MutationObserver(() => (galeria.open ? lenis.stop() : lenis.start())).observe(galeria, { attributes: true, attributeFilter: ['open'] }); }
  }

  // ---------- topo: texto e vídeo sobem; o leque abre do meio para as pontas
  const heroi = $('.v-heroi');
  if (heroi) {
    const partes = $$('.v-heroi-texto, .v-heroi-video', heroi);
    G.set([...partes, $('.v-leque', heroi)].filter(Boolean), { opacity: 1 });
    G.from($$('.v-heroi-texto > *', heroi), { y: 22, opacity: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out', delay: 0.05 });
    G.from($('.v-heroi-video', heroi), { y: 30, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.25 });
    const toast = $('[data-toast]', heroi);
    if (toast) G.from(toast, { y: -14, opacity: 0, duration: 0.7, ease: 'power3.out', delay: 1.1 });
    const cartas = $$('.v-carta-in', heroi);
    if (cartas.length) {
      G.from(cartas, { y: 220, opacity: 0, duration: 1.2, ease: 'power3.out', stagger: { each: 0.09, from: 'center' }, delay: 0.45 });
      // ao rolar, o leque sobe um pouco mais devagar que a página (profundidade)
      G.to($('.v-leque', heroi), { y: -40, ease: 'none', scrollTrigger: { trigger: heroi, start: 'top top', end: 'bottom top', scrub: true } });
    }
  }

  // ---------- títulos e textos: sobem um pouco ao aparecer
  $$('[data-split], [data-letras], .v-olho, .v-intro, .v-nota, .v-papel').forEach((el) => {
    if (el.closest('.v-heroi')) return;
    G.from(el, { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: em(el) });
  });

  // ---------- o que aparece na rolagem (em lote), fora da história e da simulação
  const soltos = $$('[data-revelar]').filter((el) => !el.closest('[data-sim]') && !el.classList.contains('v-flavio-card'));
  G.set(soltos, { y: 36, opacity: 0 });
  ST.batch(soltos, { start: 'top 90%', once: true, onEnter: (els) => G.to(els, { y: 0, opacity: 1, stagger: 0.08, duration: 0.8, ease: 'power3.out', overwrite: true }) });
  $$('.v-modulo, .v-faq details, .v-pq li, .v-inclui li').forEach((el) => G.from(el, { y: 10, opacity: 0, duration: 0.6, ease: 'power2.out', scrollTrigger: em(el, { start: 'top 94%' }) }));

  // ---------- contadores
  $$('[data-conta]').forEach((el) => {
    if (el.closest('[data-sim]')) return;
    const alvo = Number(el.dataset.conta);
    if (!Number.isFinite(alvo)) return;
    const o = { v: 0 };
    el.textContent = '0';
    G.to(o, { v: alvo, duration: 1.6, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v); }, scrollTrigger: em(el, { start: 'top 92%' }) });
  });

  // ---------- história do Flávio: os cartões sobem, a chave liga, as notificações chegam
  const hist = $('.v-flavio');
  if (hist) {
    const [antes, depois] = $$('.v-flavio-card', hist);
    const virada = $('[data-virada]', hist);
    if (antes) {
      G.from(antes, { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: em(antes, { start: 'top 88%' }) });
      const chips = $$('.v-chip', antes);
      if (chips.length) G.from(chips, { y: 10, opacity: 0, stagger: 0.18, duration: 0.6, ease: 'power3.out', scrollTrigger: em(antes, { start: 'top 60%' }) });
      G.fromTo($('img', antes), { scale: 1.1 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: antes, start: 'top bottom', end: 'bottom top', scrub: true } });
    }
    if (virada) G.from(virada, { opacity: 0, duration: 0.7, ease: 'power2.out', scrollTrigger: em(virada, { start: 'top 80%', onEnter: () => setTimeout(() => virada.classList.add('ligado'), 450) }) });
    if (depois) {
      G.from(depois, { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: em(depois, { start: 'top 88%' }) });
      const ns = $$('[data-notif]', depois);
      if (ns.length) G.from(ns, { y: -14, opacity: 0, stagger: 0.3, duration: 0.7, ease: 'power3.out', scrollTrigger: em(depois, { start: 'top 55%' }) });
      G.fromTo($('img', depois), { scale: 1.1 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: depois, start: 'top bottom', end: 'bottom top', scrub: true } });
    }
  }

  // ---------- simulação: conversa, arte em camadas e o post no Instagram, um depois do outro
  const sim = $('[data-sim]');
  if (sim) {
    const janela = $('.v-janela', sim), arte = $('[data-arte]', sim), fone = $('[data-fone]', sim);
    const passos = $$('[data-passo]', sim);
    const barras = $$('.v-radar i b', sim), notas = $$('.v-radar em', sim);
    const aprovar = $('[data-aprovar]', sim);
    const camadas = arte ? $$('.v-camada', arte) : [];
    const final = arte ? $('.v-arte-final', arte) : null;
    const curtidas = fone ? $('.v-ig-curtidas b', fone) : null;
    const coments = fone ? $$('[data-coment]', fone) : [];
    const dm = fone ? $('[data-dm]', fone) : null;
    G.set(passos, { opacity: 0, y: 14 });
    G.set(barras, { width: 0 });
    notas.forEach((n) => { n.textContent = '0'; });
    if (arte) { G.set(arte, { rotationX: 56, rotationZ: -34, scale: 0.86 }); G.set(camadas, { opacity: 0, z: 140 }); if (final) G.set(final, { opacity: 0 }); }
    G.set(coments, { opacity: 0, y: 10 });
    if (dm) G.set(dm, { opacity: 0, y: -30 });
    if (curtidas) curtidas.textContent = '0';

    const chat = G.timeline({ paused: true, defaults: { ease: 'power3.out', duration: 0.45 } });
    passos.forEach((p, i) => {
      chat.to(p, { opacity: 1, y: 0 }, i ? '+=.45' : 0);
      if (p.classList.contains('v-radar')) {
        chat.to(barras, { width: (k, el) => getComputedStyle(el.parentElement).getPropertyValue('--calor') || '50%', duration: 1, stagger: 0.12, ease: 'power2.out' }, '<.1');
        notas.forEach((n, k) => { const o = { v: 0 }; chat.to(o, { v: Number(n.dataset.conta) || 0, duration: 1, ease: 'power2.out', onUpdate: () => { n.textContent = fmt(o.v); } }, `<${k ? 0.12 : 0}`); });
      }
    });
    if (aprovar) chat.add(() => aprovar.classList.add('feito'), '+=.7');

    const montar = G.timeline({ paused: true });
    if (arte) {
      montar.to(camadas, { opacity: 1, z: (i) => i * 34, stagger: 0.28, duration: 0.55, ease: 'power3.out' })
        .to(arte, { rotationX: 0, rotationZ: 0, scale: 1, duration: 1, ease: 'power3.inOut' }, '+=.35')
        .to(camadas, { z: 0, duration: 1, ease: 'power3.inOut' }, '<')
        .to(final, { opacity: 1, duration: 0.5 }, '-=.35');
    }
    const post = G.timeline({ paused: true });
    if (fone) {
      post.add(() => fone.classList.add('curtido'));
      if (curtidas) { const o = { v: 0 }; const alvo = Number(curtidas.dataset.conta) || 1284; post.to(o, { v: alvo, duration: 2.2, ease: 'power2.out', onUpdate: () => { curtidas.textContent = fmt(o.v); } }, 0); }
      post.to(coments, { opacity: 1, y: 0, stagger: 0.4, duration: 0.4, ease: 'power2.out' }, 0.3);
      if (dm) post.to(dm, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=.2');
    }
    // cada parte começa quando aparece na tela E a anterior terminou (no celular elas ficam uma embaixo da outra)
    const etapas = [[janela, chat], [arte, montar], [fone, post]].filter(([el]) => el && el.offsetParent !== null);
    const vistos = new Set(), feitos = new Set();
    const tentar = () => etapas.forEach(([, tl], i) => {
      if (tl.isActive() || tl.progress() > 0) return;
      if (vistos.has(i) && (i === 0 || feitos.has(i - 1))) tl.play();
    });
    etapas.forEach(([el, tl], i) => {
      tl.eventCallback('onComplete', () => { feitos.add(i); tentar(); });
      ST.create({ trigger: el, start: 'top 78%', once: true, onEnter: () => { vistos.add(i); tentar(); } });
      if (el !== arte) G.from(el, { y: 50, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: em(el, { start: 'top 92%' }) });
    });
  }

  // ---------- estilos: a parede de posts entra do meio para as pontas e gira de leve com a rolagem
  const parede = $('[data-parede]');
  if (parede) {
    const posts = $$('.v-post', parede);
    G.from(posts, { y: 60, opacity: 0, scale: 0.92, duration: 1, ease: 'power3.out', stagger: { each: 0.05, from: 'center', grid: 'auto' }, scrollTrigger: em(parede, { start: 'top 85%' }) });
    G.fromTo(parede, { rotationX: 8 }, { rotationX: -4, ease: 'none', scrollTrigger: { trigger: parede, start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  // ---------- autor: o círculo e a foto aparecem
  const foto = $('[data-paralaxe]');
  if (foto) {
    G.from($('.v-autor-disco', foto), { scale: 0.85, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: em(foto) });
    G.from($('img', foto), { opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: em(foto) });
  }

  // ---------- oferta: o cartão sobe
  const oferta = $('[data-oferta]');
  if (oferta) G.from(oferta, { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: em(oferta, { start: 'top 92%' }) });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh());
})();
