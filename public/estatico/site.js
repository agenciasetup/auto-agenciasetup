// Comportamento do site. Tudo funciona sem isto; aqui só fica mais rápido e mais gostoso:
// busca instantânea, seções aparecendo na rolagem, barra de ação no celular, formulários sem recarregar.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const raiz = document.documentElement;
  const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ico = (n) => `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // ------------------------------------------------------------ aparecer na rolagem
  raiz.classList.add('revelar-ok');
  const alvos = $$('[data-revelar]');
  if ('IntersectionObserver' in window && !semMovimento) {
    const io = new IntersectionObserver((itens) => {
      for (const it of itens) if (it.isIntersecting) { it.target.classList.add('visivel'); io.unobserve(it.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    alvos.forEach((el) => io.observe(el));
  } else alvos.forEach((el) => el.classList.add('visivel'));

  // ------------------------------------------------------------ cabeçalho ganha borda ao rolar
  const topo = $('[data-topo]');
  if (topo) {
    const f = () => topo.classList.toggle('rolou', scrollY > 4);
    addEventListener('scroll', f, { passive: true });
    f();
  }

  // ------------------------------------------------------------ atalho do teclado no botão de busca
  if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) $$('.gatilho-busca kbd').forEach((k) => { k.textContent = '⌘K'; });

  // ------------------------------------------------------------ busca instantânea
  const caixa = $('#busca');
  const campo = caixa && $('[data-busca-campo]', caixa);
  const lista = caixa && $('[data-busca-resultados]', caixa);
  let selecionado = -1;
  let pedido = 0;
  let espera;

  const SUGESTOES = [
    { t: 'Agentes de IA', u: '/agentes', i: 'agente', s: 'Assistentes prontos para abrir e usar' },
    { t: 'Prompts', u: '/recursos?tipo=prompt', i: 'prompt', s: 'Para texto, carrossel e imagem' },
    { t: 'Planilhas', u: '/recursos?tipo=planilha', i: 'planilha', s: 'CRM, financeiro, calendário' },
    { t: 'Automações', u: '/recursos?tipo=automacao', i: 'automacao', s: 'n8n, Make e tarefas que rodam sozinhas' },
    { t: 'Mais baixados', u: '/recursos', i: 'fogo', s: 'O que mais gente está usando' },
  ];
  const COR = { agente: 'agente', prompt: 'prompt', template: 'template', planilha: 'planilha', automacao: 'automacao', guia: 'guia', pack: 'pack', ferramenta: 'ferramenta', video: 'video' };
  const linha = (r, i) => `<a class="resultado" href="${esc(r.url || r.u)}" role="option" id="res-${i}" aria-selected="false">
    <span class="ic"${COR[r.icone || r.i] ? ` style="--c:var(--c-${COR[r.icone || r.i]})"` : ''}>${ico(r.icone || r.i || 'camadas')}</span>
    <span style="min-width:0"><b>${esc(r.titulo || r.t)}</b><small>${esc(r.tipo ? `${r.tipo}${r.resumo ? ` · ${r.resumo}` : ''}` : r.resumo || r.s || '')}</small></span>
    ${ico('direita').replace('class="i"', 'class="i i-fim"')}</a>`;

  function desenhar(html) { lista.innerHTML = html; selecionado = -1; }
  function sugestoes() { desenhar(`<div class="busca-grupo"><h5>Atalhos</h5>${SUGESTOES.map(linha).join('')}</div>`); }

  async function procurar(q) {
    const meu = ++pedido;
    if (q.length < 2) return sugestoes();
    try {
      const r = await fetch(`/api/busca?q=${encodeURIComponent(q)}`).then((x) => x.json());
      if (meu !== pedido) return;
      let n = 0;
      const grupo = (titulo, itens) => (itens.length ? `<div class="busca-grupo"><h5>${titulo}</h5>${itens.map((x) => linha(x, n++)).join('')}</div>` : '');
      const html = grupo('Recursos', r.recursos) + grupo('Novidades', r.artigos.map((a) => ({ ...a, icone: 'novidades' })));
      desenhar(html || `<div class="busca-vazio">Nada para <b>${esc(q)}</b> ainda.<br><a class="bt" style="margin-top:14px" href="/busca?q=${encodeURIComponent(q)}">Ver busca completa</a></div>`);
    } catch {
      if (meu === pedido) desenhar('<div class="busca-vazio">Não consegui buscar agora. Tente de novo.</div>');
    }
  }

  function abrirBusca(e) {
    if (!caixa || typeof caixa.showModal !== 'function') return;
    if (e) e.preventDefault();
    if (!caixa.open) caixa.showModal();
    campo.value = '';
    sugestoes();
    requestAnimationFrame(() => campo.focus());
  }
  function mover(d) {
    const itens = $$('.resultado', lista);
    if (!itens.length) return;
    selecionado = (selecionado + d + itens.length) % itens.length;
    itens.forEach((el, i) => el.setAttribute('aria-selected', String(i === selecionado)));
    itens[selecionado].scrollIntoView({ block: 'nearest' });
  }

  if (caixa) {
    $$('[data-abrir-busca]').forEach((el) => el.addEventListener('click', abrirBusca));
    $('[data-fechar-busca]', caixa).addEventListener('click', () => caixa.close());
    caixa.addEventListener('click', (e) => { if (e.target === caixa) caixa.close(); });
    campo.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(() => procurar(campo.value.trim()), 140); });
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); mover(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); mover(-1); }
      else if (e.key === 'Enter' && selecionado >= 0) { e.preventDefault(); $$('.resultado', lista)[selecionado].click(); }
    });
    addEventListener('keydown', (e) => {
      const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !digitando)) abrirBusca(e);
    });
  }

  // ------------------------------------------------------------ dicas que trocam no campo de busca do topo
  $$('[data-placeholders]').forEach((input) => {
    const frases = input.dataset.placeholders.split('|');
    let i = 0;
    if (semMovimento) return;
    setInterval(() => {
      if (document.activeElement === input || input.value) return;
      i = (i + 1) % frases.length;
      input.setAttribute('placeholder', frases[i]);
    }, 2600);
  });

  // ------------------------------------------------------------ folhas (filtros no celular)
  $$('[data-abrir-folha]').forEach((b) => b.addEventListener('click', () => {
    const f = document.getElementById(b.dataset.abrirFolha);
    if (f && f.showModal) f.showModal();
  }));
  $$('dialog.folha').forEach((f) => {
    f.addEventListener('click', (e) => { if (e.target === f) f.close(); });
    $$('[data-fechar-folha]', f).forEach((b) => b.addEventListener('click', () => f.close()));
  });

  // ------------------------------------------------------------ receber novidades sem recarregar
  if (/[?&]inscrito=1/.test(location.search)) $$('[data-receber]').forEach((r) => r.classList.add('enviado'));
  $$('[data-form-lead]').forEach((form) => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bt = $('button', form);
    const dados = Object.fromEntries(new FormData(form));
    bt.disabled = true;
    try {
      const r = await fetch('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(dados) });
      if (!r.ok) throw new Error();
      form.closest('[data-receber]').classList.add('enviado');
    } catch {
      bt.disabled = false;
      bt.textContent = 'Confira o e-mail';
      setTimeout(() => { bt.textContent = 'Quero receber'; }, 2200);
    }
  }));

  // ------------------------------------------------------------ copiar link e copiar prompt
  async function copiar(texto, botao, ok = 'Copiado') {
    try {
      await navigator.clipboard.writeText(texto);
      const span = $('span', botao) || botao;
      const antes = span.textContent;
      span.textContent = ok;
      setTimeout(() => { span.textContent = antes; }, 1800);
    } catch {}
  }
  $$('[data-copiar-link]').forEach((b) => b.addEventListener('click', () => copiar(location.href, b, 'Link copiado')));
  $$('.texto pre').forEach((pre) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'copiar-codigo';
    b.innerHTML = `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg><span>Copiar</span>`;
    b.addEventListener('click', () => copiar(($('code', pre) || pre).innerText.trim(), b));
    pre.classList.add('tem-copiar');
    pre.appendChild(b);
  });

  // ------------------------------------------------------------ barra de ação no celular: o "Baixar" fica sempre à mão,
  // menos quando o cartão com o botão principal já está na tela (como o "Obter" da App Store).
  const principal = $('[data-acao-principal]');
  const barra = $('[data-barra-acao]');
  if (principal && barra && 'IntersectionObserver' in window) {
    new IntersectionObserver(([it]) => barra.classList.toggle('visivel', !it.isIntersecting), { threshold: 0 }).observe(principal);
  }

  // ------------------------------------------------------------ páginas prontas antes do toque
  if (HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
    const s = document.createElement('script');
    s.type = 'speculationrules';
    s.textContent = JSON.stringify({ prerender: [{ where: { href_matches: ['/recursos*', '/agentes*', '/novidades*', '/'] }, eagerness: 'moderate' }] });
    document.head.appendChild(s);
  }
})();
