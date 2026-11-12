// Medidas e mapas do modelo de carrossel (11/11/2026). Pedido do dono: "melhore a forma como você enxerga... crie mapa
// de margem, mapa de construção, mapa de profundidade, de desfoque, desfoque de movimento, luz, sombra realista".
//   window.MEDIR()            as caixas e os números de tudo que está no slide (a conferência lê: scripts/conferir-arte.mjs)
//   &mapa=construcao          o esqueleto: cada camada numa cor, na ordem, os terços, o centro e as bordas alinhadas
//   &mapa=margens             as distâncias do título e do texto até a janela, o espaço entre as linhas e as regras
//   &mapa=luz                 de onde vem a luz, cada bola de luz, para onde cai cada sombra, o contorno e o degradê
// (profundidade e desfoque são do próprio modelo.js: pintam cada elemento num cinza.)
// O exportador (scripts/carrossel.mjs) salva todos em _local/carrossel/<nome>/mapas/.
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const caixa = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, x2: r.right, y2: r.bottom }; };
  const uniao = (cs) => {
    const v = cs.filter(Boolean);
    if (!v.length) return null;
    const x = Math.min(...v.map((c) => c.x)), y = Math.min(...v.map((c) => c.y)), x2 = Math.max(...v.map((c) => c.x2)), y2 = Math.max(...v.map((c) => c.y2));
    return { x, y, w: x2 - x, h: y2 - y, x2, y2 };
  };
  const r1 = (v) => Math.round(v * 10) / 10;
  // A caixa cruza o slide? (no carrossel infinito, os elementos dos outros cards ficam fora da tela)
  const noSlide = (c) => c.x2 > 4 && c.x < 1076 && c.y2 > 4 && c.y < 1346;
  const arred = (c) => (c ? { x: r1(c.x), y: r1(c.y), w: r1(c.w), h: r1(c.h), x2: r1(c.x2), y2: r1(c.y2) } : null);

  // A tinta de uma linha de texto: onde a letra pinta de verdade (não a caixa da linha, que tem a folga da fonte em
  // cima e embaixo). Sai da medida da fonte no canvas. É por ela que se mede margem e espaço entre linhas.
  let ctx = null;
  function tinta(el) {
    const cs = getComputedStyle(el);
    const texto = (cs.textTransform === 'uppercase' ? el.textContent.toUpperCase() : el.textContent).trim();
    if (!texto) return null;
    ctx = ctx || document.createElement('canvas').getContext('2d');
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    try { ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing; } catch { /* navegador antigo */ }
    const m = ctx.measureText(texto);
    // A linha de base e o começo do texto, medidos de verdade: uma sonda sem tamanho posta antes da primeira letra
    // (o pé dela assenta na linha de base). A conta pelo line-height errava uns 13 px na Calango Condensed.
    const sonda = document.createElement('i');
    sonda.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0;border:0;visibility:hidden';
    el.insertBefore(sonda, el.firstChild);
    const sr = sonda.getBoundingClientRect();
    sonda.remove();
    const base = sr.bottom, x0 = sr.left;
    const c = { x: x0 - m.actualBoundingBoxLeft, y: base - m.actualBoundingBoxAscent, x2: x0 + m.actualBoundingBoxRight, y2: base + m.actualBoundingBoxDescent };
    return { ...c, w: c.x2 - c.x, h: c.y2 - c.y };
  }

  function medir() {
    const slide = document.querySelector('.slide');
    if (!slide) return null;
    const C = window.CARROSSEL || {};
    const n = Math.max(1, parseInt(new URLSearchParams(location.search).get('s') || '1', 10));
    const s = (C.slides || [])[n - 1] || {};
    const jan = caixa(document.querySelector('.janela'));
    // O título da capa: a tinta de cada linha, o bloco, as margens até a janela e o espaço entre as linhas.
    const linhasEl = [...document.querySelectorAll('.c-titulo .titulo-capa')].map((t) => t.querySelector('.progressivo .condensada')).filter(Boolean);
    const linhas = linhasEl.map((el) => ({ texto: el.textContent.trim(), tam: r1(parseFloat(getComputedStyle(el).fontSize)), fonte: getComputedStyle(el).fontFamily.split(',')[0].replace(/['"]/g, ''), tinta: arred(tinta(el)) })).filter((l) => l.tinta);
    const bloco = uniao(linhas.map((l) => l.tinta));
    const apoio = (sel) => { const el = document.querySelector(sel); if (!el || !el.textContent.trim()) return null; return { texto: el.textContent.trim(), tam: r1(parseFloat(getComputedStyle(el).fontSize)), fonte: getComputedStyle(el).fontFamily.split(',')[0].replace(/['"]/g, ''), cor: getComputedStyle(el).color, caixa: arred(caixa(el)), naFrente: el.classList.contains('na-frente') }; };
    const pos = apoio('.pos-titulo'), pre = apoio('.pre-titulo');
    const titulo = bloco ? {
      linhas, bloco: arred(bloco),
      margens: { cima: r1(Math.min(bloco.y, pre ? pre.caixa.y : 1e9) - jan.y), esquerda: r1(bloco.x - jan.x), direita: r1(jan.x2 - bloco.x2) },
      vaos: linhas.slice(1).map((l, i) => r1(l.tinta.y - linhas[i].tinta.y2)),
      larguras: linhas.map((l) => l.tinta.w),
    } : null;
    // Os textos do slide de dentro: o bloco e as margens até a janela.
    const textos = [...document.querySelectorAll('.rotulo-miolo, .t-miolo, .texto-miolo, .palavra-chamada, .pre-chamada')].filter((el) => el.textContent.trim()).map((el) => {
      const cs = getComputedStyle(el);
      // A caixa do texto de verdade (as linhas), não a do bloco inteiro.
      const faixa = document.createRange(); faixa.selectNodeContents(el);
      const linhasT = [...faixa.getClientRects()].filter((r) => r.width > 2);
      const cx = linhasT.length ? uniao(linhasT.map((r) => ({ x: r.left, y: r.top, x2: r.right, y2: r.bottom }))) : caixa(el);
      return { tipo: el.className.split(' ')[0], texto: el.textContent.trim().slice(0, 80), tam: r1(parseFloat(cs.fontSize)), cor: cs.color, caixa: arred(cx), linhas: linhasT.length };
    });
    const blocoTexto = uniao(textos.map((t) => t.caixa));
    const texto = blocoTexto ? { bloco: arred(blocoTexto), margens: { cima: r1(blocoTexto.y - jan.y), baixo: r1(jan.y2 - blocoTexto.y2), esquerda: r1(blocoTexto.x - jan.x), direita: r1(jan.x2 - blocoTexto.x2) } } : null;
    // Os elementos: o que tem no panorama, na travessia, o assunto da capa.
    const el2 = (el, camada) => {
      const d = el.dataset, c = caixa(el), im = el.tagName === 'IMG' ? el : el.querySelector('img');
      const [sx, sy, sb, so] = (d.sombra || '').split(',').map(Number);
      const [rp, ra] = (d.rastro || '').split(',').map(Number);
      // A largura de verdade da imagem (offsetWidth não muda com o giro). A caixa na tela de um elemento girado é maior
      // que ele, e acusava "vai ficar mole" numa mão girada 40 graus que estava menor que o arquivo.
      const larg = Number(d.w) || (im ? (im.offsetWidth || im.getBoundingClientRect().width) : c.w);
      return {
        arq: d.arq || (im ? im.getAttribute('src').split('/').pop().replace(/\.\w+$/, '') : ''), pasta: d.pasta || '', camada: d.camada || camada,
        z: d.z === '' || d.z === undefined ? null : Number(d.z), blur: Number(d.blur || 0), sat: d.sat === undefined ? null : Number(d.sat), luz: d.luz === undefined ? null : Number(d.luz),
        sombra: d.sombra ? { x: sx, y: sy, blur: sb, op: so } : null, rastro: d.rastro ? { px: rp, angulo: ra } : null,
        fundo: !!d.fundo, suave: !!d.suave, contorno: !!d.contorno, escurece: !!d.escurece, mistura: d.mistura || null,
        caixa: arred(c), largura: r1(larg), natural: im && im.naturalWidth ? im.naturalWidth : null, escala: im && im.naturalWidth ? r1(larg / im.naturalWidth) : null,
        visivel: noSlide(c),
      };
    };
    const elementos = [
      ...[...document.querySelectorAll('.c0 .panorama')].map((e) => el2(e, 'panorama')),
      ...[...document.querySelectorAll('.c2 .assunto')].map((e) => el2(e, 'assunto')),
      ...[...document.querySelectorAll('.c-trav:not(.acima) .travessa')].map((e) => el2(e, 'travessia')),
      ...[...document.querySelectorAll('.c-trav.acima .travessa')].map((e) => el2(e, 'acima')),
    ];
    const luzes = [
      ...[...document.querySelectorAll('.halo-luz')].map((e) => ({ tipo: 'bola', modo: e.dataset.modo, op: Number(e.dataset.op), caixa: arred(caixa(e)) })),
      ...[...document.querySelectorAll('.vagalume')].filter((e) => Number(e.dataset.r) >= 40).map((e) => ({ tipo: 'atras', modo: 'screen', op: Number(e.dataset.op), caixa: arred(caixa(e)) })),
    ].filter((l) => noSlide(l.caixa));
    const topo = document.querySelector('.topo');
    return {
      slide: n, total: (C.slides || []).length, tipo: s.tipo || '', tema: [...slide.classList].find((c) => c.startsWith('tema-'))?.slice(5) || '',
      larga: slide.classList.contains('larga'), janela: arred(jan), topo: topo ? arred(caixa(topo)) : null,
      titulo, pos, pre, textos, texto, elementos, luzes,
      luzDe: C.luzDe || 'cima-esquerda',
      // As fontes Calango que o slide pede e não carregaram (faltam os arquivos em templates/fontes/).
      fontes: { faltando: [...new Set([...document.querySelectorAll('.titulo-capa .progressivo .condensada, .pos-titulo, .pre-titulo, .t-miolo, .palavra-chamada, .topo')].map((el) => { const cs = getComputedStyle(el), fam = cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim(); return fam.startsWith('Calango') && !document.fonts.check(`${cs.fontWeight} 40px '${fam}'`) ? fam : null; }).filter(Boolean))] },
    };
  }
  window.MEDIR = medir;

  // ------------------------------------------------------------------ desenho
  const no = (tag, attrs = {}, texto) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); if (texto !== undefined) e.textContent = texto; return e; };
  function tela(veu) {
    const svg = no('svg', { class: 'mapa-camada', viewBox: '0 0 1080 1350', width: 1080, height: 1350 });
    svg.appendChild(no('rect', { x: 0, y: 0, width: 1080, height: 1350, fill: `rgba(8,8,12,${veu})` }));
    const defs = no('defs');
    for (const [id, cor] of [['seta-b', '#ffffff'], ['seta-v', '#ff4d6d'], ['seta-a', '#ffd24a'], ['seta-g', '#5dff8a']]) {
      const m = no('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
      m.appendChild(no('path', { d: 'M0 0L10 5L0 10z', fill: cor }));
      defs.appendChild(m);
    }
    svg.appendChild(defs);
    document.querySelector('.slide').appendChild(svg);
    return svg;
  }
  const ret = (svg, c, cor, extra = {}) => svg.appendChild(no('rect', { x: c.x, y: c.y, width: Math.max(1, c.w), height: Math.max(1, c.h), fill: 'none', stroke: cor, 'stroke-width': 2, ...extra }));
  const lin = (svg, x1, y1, x2, y2, cor, extra = {}) => svg.appendChild(no('line', { x1, y1, x2, y2, stroke: cor, 'stroke-width': 2, ...extra }));
  function etiqueta(svg, x, y, texto, cor = '#fff', tam = 19) {
    const larg = texto.length * tam * 0.61 + 14;
    const px = Math.max(4, Math.min(1080 - larg - 4, x)), py = Math.max(tam + 8, Math.min(1344, y));
    svg.appendChild(no('rect', { x: px, y: py - tam - 5, width: larg, height: tam + 10, rx: 6, fill: 'rgba(0,0,0,.82)' }));
    svg.appendChild(no('text', { x: px + 7, y: py, fill: cor, 'font-family': "'JetBrains Mono', monospace", 'font-size': tam, 'font-weight': 600 }, texto));
  }
  // A cota: a linha com as duas pontas e o número no meio.
  function cota(svg, x1, y1, x2, y2, texto, ok = true) {
    const cor = ok ? '#5dff8a' : '#ff4d6d';
    lin(svg, x1, y1, x2, y2, cor, { 'marker-start': `url(#seta-${ok ? 'g' : 'v'})`, 'marker-end': `url(#seta-${ok ? 'g' : 'v'})` });
    etiqueta(svg, (x1 + x2) / 2 + (x1 === x2 ? 10 : -30), (y1 + y2) / 2 + (x1 === x2 ? 8 : -10), texto, cor, 21);
  }

  const COR = { fundo: '#7a7f8c', panorama: '#5aa9ff', assunto: '#5dff8a', travessia: '#5dff8a', perto: '#ffb347', acima: '#ff5d73', texto: '#ffe14a', luz: '#ffffff' };
  const corDoElemento = (e) => (e.fundo ? COR.fundo : e.camada === 'acima' ? COR.acima : e.camada === 'panorama' ? COR.panorama : (e.z || 0) > 0.05 ? COR.perto : COR.travessia);

  // O esqueleto da peça: cada camada na sua cor, na ordem em que é empilhada, os terços, o centro, e as bordas que
  // estão alinhadas (a headline na largura do quadro aparece como duas linhas magenta).
  function construcao(m) {
    const svg = tela(0.62), j = m.janela;
    ret(svg, j, 'rgba(255,255,255,.75)', { rx: 46 });
    for (const k of [1, 2]) {
      lin(svg, j.x + (j.w * k) / 3, j.y, j.x + (j.w * k) / 3, j.y2, 'rgba(255,255,255,.22)', { 'stroke-dasharray': '6 8', 'stroke-width': 1.5 });
      lin(svg, j.x, j.y + (j.h * k) / 3, j.x2, j.y + (j.h * k) / 3, 'rgba(255,255,255,.22)', { 'stroke-dasharray': '6 8', 'stroke-width': 1.5 });
    }
    lin(svg, 540, j.y, 540, j.y2, 'rgba(255,255,255,.4)', { 'stroke-dasharray': '2 6', 'stroke-width': 1.5 });
    lin(svg, j.x, 675, j.x2, 675, 'rgba(255,255,255,.4)', { 'stroke-dasharray': '2 6', 'stroke-width': 1.5 });
    let ordem = 0;
    const principais = [];
    m.elementos.filter((e) => e.visivel).forEach((e) => {
      ordem += 1;
      if (e.fundo) { etiqueta(svg, j.x + 12, j.y2 - 44, `${ordem} fundo: ${e.arq}`, COR.fundo, 17); return; }
      const cor = corDoElemento(e);
      ret(svg, e.caixa, cor, e.suave ? { 'stroke-dasharray': '10 7' } : {});
      etiqueta(svg, e.caixa.x + 4, e.caixa.y + 24, `${ordem} ${e.arq.slice(0, 22)}${e.z !== null ? ` z${e.z}` : ''}`, cor, 16);
      if (!e.suave && e.caixa.w >= 260) principais.push({ nome: e.arq, ...e.caixa });
    });
    if (m.titulo) {
      m.titulo.linhas.forEach((l) => ret(svg, l.tinta, COR.texto, { 'stroke-width': 3 }));
      etiqueta(svg, m.titulo.bloco.x, m.titulo.bloco.y - 8, `título (${m.titulo.linhas.map((l) => Math.round(l.tinta.w)).join(' e ')} px)`, COR.texto, 17);
      principais.push({ nome: 'título', ...m.titulo.bloco });
    }
    for (const t of [m.pos, m.pre].filter(Boolean)) { ret(svg, t.caixa, COR.texto, { 'stroke-dasharray': '4 4' }); }
    m.textos.forEach((t) => ret(svg, t.caixa, COR.texto, { 'stroke-dasharray': '4 4' }));
    if (m.texto) principais.push({ nome: 'texto', ...m.texto.bloco });
    m.luzes.forEach((l) => svg.appendChild(no('ellipse', { cx: l.caixa.x + l.caixa.w / 2, cy: l.caixa.y + l.caixa.h / 2, rx: l.caixa.w / 2, ry: l.caixa.h / 2, fill: 'none', stroke: COR.luz, 'stroke-width': 1.5, 'stroke-dasharray': '3 9' })));
    // Bordas alinhadas (até 8 px de diferença) entre as peças principais: a linha que organiza a composição.
    const guia = (eixo) => {
      const pontos = principais.flatMap((p) => (eixo === 'x' ? [[p.x, p.nome], [p.x2, p.nome], [p.x + p.w / 2, p.nome]] : [[p.y, p.nome], [p.y2, p.nome]]));
      const usados = new Set();
      pontos.forEach(([v, nome], i) => {
        if (usados.has(i) || v < 20 || v > (eixo === 'x' ? 1060 : 1330)) return;
        const grupo = pontos.map(([v2, n2], k) => ({ v2, n2, k })).filter((o) => Math.abs(o.v2 - v) <= 8 && o.n2 !== nome);
        if (!grupo.length) return;
        grupo.forEach((o) => usados.add(o.k)); usados.add(i);
        if (eixo === 'x') lin(svg, v, 0, v, 1350, '#ff5dd8', { 'stroke-width': 1.5 }); else lin(svg, 0, v, 1080, v, '#ff5dd8', { 'stroke-width': 1.5 });
      });
    };
    guia('x'); guia('y');
    const leg = [['fundo', COR.fundo], ['dentro da janela', COR.panorama], ['plano do foco', COR.travessia], ['perto da lente', COR.perto], ['por cima de tudo', COR.acima], ['texto', COR.texto], ['alinhado', '#ff5dd8']];
    leg.forEach(([t, c], i) => etiqueta(svg, 8 + (i % 4) * 268, 1318 - (i < 4 ? 30 : 0), t, c, 15));
  }

  // As margens. Regras (do dono, 11/11/2026: "dá uma margem igual em cima e dos lados, ou aproximado... mas em cima
  // precisa ter um espaço mesmo. O que você faz costuma ficar muito colado"): a margem de cima do título é de pelo menos
  // 85% da menor margem lateral e nunca menos de 110 px; as duas linhas do título têm a mesma largura e ficam coladas (de 0 a
  // 34 px uma da outra, sem se sobrepor); o texto do slide de dentro fica a pelo menos 70 px da janela.
  function regras(m) {
    const r = [];
    if (m.titulo) {
      const g = m.titulo.margens, lado = Math.min(g.esquerda, g.direita);
      // Grave (reprova) quando está colado de verdade: menos de 110 px ou menos de 60% da margem lateral. Entre 60% e
      // 85% é para olhar (capas antigas aprovadas ficam nessa faixa).
      r.push({ id: 'titulo-cima', ok: g.cima >= 110 && g.cima >= lado * 0.85, grave: g.cima < 110 || g.cima < lado * 0.6, texto: `margem de cima do título ${Math.round(g.cima)} px (lados ${Math.round(g.esquerda)} e ${Math.round(g.direita)})` });
      r.push({ id: 'titulo-lados', ok: lado >= 60, texto: `margem lateral do título ${Math.round(lado)} px` });
      if (m.titulo.linhas.length > 1) {
        const [a, b] = m.titulo.larguras;
        r.push({ id: 'titulo-bloco', ok: Math.abs(a - b) <= Math.max(a, b) * 0.025, texto: `linhas do título com ${Math.round(a)} e ${Math.round(b)} px de largura` });
        m.titulo.vaos.forEach((v) => r.push({ id: 'titulo-vao', ok: v >= 0 && v <= 34, texto: `espaço entre as linhas do título ${Math.round(v)} px` }));
      }
    }
    if (m.texto && !m.titulo) {
      const g = m.texto.margens;
      r.push({ id: 'texto-lados', ok: Math.min(g.esquerda, g.direita) >= 70, texto: `texto a ${Math.round(g.esquerda)} px da esquerda e ${Math.round(g.direita)} px da direita da janela` });
      r.push({ id: 'texto-cima', ok: g.cima >= 110, texto: `texto a ${Math.round(g.cima)} px do alto da janela` });
    }
    m.textos.filter((t) => t.tipo !== 'rotulo-miolo' && t.tam < 30).forEach((t) => r.push({ id: 'texto-pequeno', ok: false, texto: `texto com ${t.tam} px ("${t.texto.slice(0, 30)}"): pequeno demais para o celular` }));
    return r;
  }
  function margens(m) {
    const svg = tela(0.5), j = m.janela, rs = regras(m), ok = (id) => rs.filter((x) => x.id === id).every((x) => x.ok);
    ret(svg, j, 'rgba(255,255,255,.8)', { rx: 46 });
    // O corte da grade do perfil (3:4): o que fica fora dessas linhas some na miniatura.
    for (const x of [33.75, 1046.25]) lin(svg, x, 0, x, 1350, 'rgba(255,255,255,.45)', { 'stroke-dasharray': '5 7', 'stroke-width': 1.5 });
    etiqueta(svg, 40, 30, 'grade do perfil (3:4)', 'rgba(255,255,255,.8)', 14);
    if (m.titulo) {
      const b = m.titulo.bloco, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      m.titulo.linhas.forEach((l) => ret(svg, l.tinta, '#ffe14a', { 'stroke-width': 2 }));
      const topoTitulo = Math.min(b.y, m.pre ? m.pre.caixa.y : 1e9);
      cota(svg, cx, j.y, cx, topoTitulo, `${Math.round(m.titulo.margens.cima)}`, ok('titulo-cima'));
      cota(svg, j.x, cy, b.x, cy, `${Math.round(m.titulo.margens.esquerda)}`, ok('titulo-lados'));
      cota(svg, b.x2, cy, j.x2, cy, `${Math.round(m.titulo.margens.direita)}`, ok('titulo-lados'));
      m.titulo.linhas.slice(1).forEach((l, i) => { const a = m.titulo.linhas[i].tinta; etiqueta(svg, b.x2 + 10, (a.y2 + l.tinta.y) / 2 + 8, `entre linhas ${Math.round(m.titulo.vaos[i])}`, ok('titulo-vao') ? '#5dff8a' : '#ff4d6d', 17); });
      m.titulo.linhas.forEach((l) => etiqueta(svg, l.tinta.x, l.tinta.y2 - 6, `${Math.round(l.tinta.w)} x ${Math.round(l.tinta.h)} · ${l.fonte} ${Math.round(l.tam)}`, ok('titulo-bloco') ? '#ffe14a' : '#ff4d6d', 15));
      for (const t of [m.pos, m.pre].filter(Boolean)) { ret(svg, t.caixa, '#ffe14a', { 'stroke-dasharray': '4 4' }); etiqueta(svg, t.caixa.x, t.caixa.y2 + 22, `${t.fonte} ${Math.round(t.tam)}`, '#ffe14a', 15); }
    }
    if (m.texto) {
      const b = m.texto.bloco, cy = b.y + b.h / 2, cx = b.x + b.w / 2;
      m.textos.forEach((t) => { ret(svg, t.caixa, '#ffe14a', { 'stroke-dasharray': '4 4' }); etiqueta(svg, t.caixa.x, t.caixa.y2 + 22, `${Math.round(t.tam)} px`, '#ffe14a', 15); });
      if (!m.titulo) {
        cota(svg, j.x, cy, b.x, cy, `${Math.round(m.texto.margens.esquerda)}`, ok('texto-lados'));
        cota(svg, b.x2, cy, j.x2, cy, `${Math.round(m.texto.margens.direita)}`, ok('texto-lados'));
        cota(svg, cx, j.y, cx, b.y, `${Math.round(m.texto.margens.cima)}`, ok('texto-cima'));
      }
    }
    rs.filter((x) => !x.ok).slice(0, 4).forEach((x, i) => etiqueta(svg, 48, 1290 - i * 30, `✖ ${x.texto}`.slice(0, 84), '#ff4d6d', 16));
    if (rs.length && rs.every((x) => x.ok)) etiqueta(svg, 48, 1290, '✔ margens dentro da regra', '#5dff8a', 17);
  }

  // A luz: de onde ela vem, cada bola de luz, para onde cai cada sombra (tem de ser o lado oposto ao da luz), e o que
  // tem luz de contorno ou sombra em degradê.
  const VETOR = { 'cima-esquerda': [-1, -1], cima: [0, -1], 'cima-direita': [1, -1], esquerda: [-1, 0], direita: [1, 0], 'baixo-esquerda': [-1, 1], baixo: [0, 1], 'baixo-direita': [1, 1], contraluz: [0, -1] };
  function luz(m) {
    const svg = tela(0.58), j = m.janela;
    ret(svg, j, 'rgba(255,255,255,.6)', { rx: 46 });
    const [vx, vy] = VETOR[m.luzDe] || VETOR['cima-esquerda'];
    const ox = vx < 0 ? 110 : vx > 0 ? 970 : 540, oy = vy < 0 ? 120 : vy > 0 ? 1230 : 675;
    svg.appendChild(no('circle', { cx: ox, cy: oy, r: 30, fill: '#ffd24a' }));
    lin(svg, ox - vx * 44, oy - vy * 44, ox - vx * 150, oy - vy * 150, '#ffd24a', { 'stroke-width': 5, 'marker-end': 'url(#seta-a)' });
    etiqueta(svg, ox + 44, oy + 8, `a luz vem de ${m.luzDe}`, '#ffd24a', 18);
    m.luzes.forEach((l) => {
      const cx = l.caixa.x + l.caixa.w / 2, cy = l.caixa.y + l.caixa.h / 2;
      svg.appendChild(no('ellipse', { cx, cy, rx: l.caixa.w / 2, ry: l.caixa.h / 2, fill: l.tipo === 'atras' ? 'rgba(255,170,60,.12)' : 'rgba(255,255,255,.07)', stroke: l.tipo === 'atras' ? '#ffb347' : '#ffffff', 'stroke-width': 2, 'stroke-dasharray': '8 7' }));
      etiqueta(svg, cx - 110, cy + 6, l.tipo === 'atras' ? `luz atrás · ${Math.round(l.op * 100)}%` : `bola · ${l.modo} · ${Math.round(l.op * 100)}%`, l.tipo === 'atras' ? '#ffb347' : '#fff', 16);
    });
    m.elementos.filter((e) => !e.fundo && e.visivel).forEach((e) => {
      const cx = e.caixa.x + e.caixa.w / 2, cy = e.caixa.y + e.caixa.h / 2;
      if (e.sombra) {
        // A sombra cai para o lado oposto ao da luz: se cair para o lado da luz, está errada (seta vermelha).
        const certo = e.sombra.x * -vx + e.sombra.y * -vy >= 0;
        lin(svg, cx, cy, cx + e.sombra.x * 1.4, cy + e.sombra.y * 1.4, certo ? '#fff' : '#ff4d6d', { 'stroke-width': 3, 'marker-end': `url(#seta-${certo ? 'b' : 'v'})` });
        etiqueta(svg, cx + e.sombra.x * 1.4 + 8, cy + e.sombra.y * 1.4 + 8, `sombra ${e.sombra.x},${e.sombra.y} · ${Math.round(e.sombra.op * 100)}%`, certo ? '#fff' : '#ff4d6d', 15);
      }
      const marcas = [e.contorno ? 'contorno' : '', e.escurece ? 'degradê de sombra' : '', e.luz !== null && e.luz < 0.8 ? `escurecido ${e.luz}` : '', e.sat !== null && e.sat > 1 ? `cor +${Math.round((e.sat - 1) * 100)}%` : '', e.sat === 0 ? 'SEM COR' : ''].filter(Boolean);
      if (marcas.length) { ret(svg, e.caixa, e.sat === 0 ? '#ff4d6d' : '#ffd24a', { 'stroke-dasharray': '3 6', 'stroke-width': 1.5 }); etiqueta(svg, e.caixa.x + 4, e.caixa.y2 - 8, `${e.arq.slice(0, 16)}: ${marcas.join(', ')}`, e.sat === 0 ? '#ff4d6d' : '#ffd24a', 15); }
    });
  }

  window.MAPAS = {
    regras,
    depois({ mapa }) {
      document.querySelectorAll('.mapa-camada').forEach((e) => e.remove());
      const m = medir();
      if (!m) return;
      window.MEDIDAS = { ...m, regras: regras(m) };
      if (mapa === 'construcao') construcao(m);
      if (mapa === 'margens') margens(m);
      if (mapa === 'luz') luz(m);
    },
  };
})();
