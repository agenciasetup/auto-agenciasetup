// Monta um post de frase a partir de um conteúdo (conteudos/<nome>.js define window.FRASE).
// Endereço: modelo.html?c=<nome>&s=<número do slide, de 1>&etapa=<1|3|5>
// Etapas (a regra das 5 etapas): 1 = só a frase na janela, sem rabisco nem grão; 3 = com o rabisco; 5 = com o grão.
// Marcação no texto: \n quebra a linha (a quebra é escolha de quem escreve), [palavra] vai na serifa itálica laranja e
// o * no começo vira o asterisco laranja. Coordenadas (rabisco) são da janela: 1000 x 1270, com o 0 no canto dela.
(function () {
  const q = new URLSearchParams(location.search);
  const nome = (q.get('c') || '').replace(/[^a-z0-9-]/g, '');
  const n = Math.max(1, parseInt(q.get('s') || '1', 10));
  const ETAPA = [1, 3, 5].includes(Number(q.get('etapa'))) ? Number(q.get('etapa')) : 5;
  const s = document.createElement('script');
  s.src = `conteudos/${nome}.js`;
  s.onload = () => desenhar(window.FRASE);
  s.onerror = () => { document.body.innerHTML = `<p style="color:#fff;font:30px sans-serif;padding:40px">Conteúdo ${nome} não encontrado.</p>`; };
  document.head.appendChild(s);

  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const marcar = (t) => esc(t).replace(/\[([^\]]+)\]/g, '<span class="destaque">$1</span>').replace(/^\*/, '<span class="asterisco">*</span>');

  // Rabiscos feitos à mão (um traço só, irregular de propósito). Só entram com motivo: o coração no post de amor.
  const RABISCOS = {
    coracao: '<svg viewBox="0 0 120 108"><path fill="currentColor" d="M61 104c-9-8-27-20-40-35C8 54 2 41 6 27 10 13 24 4 37 7c10 2 17 10 22 20 4-11 12-21 25-23 15-2 30 8 31 25 1 15-7 28-19 41-11 12-24 23-35 34z"/></svg>',
  };

  // Poeirinhas da etapa 5: pontos de tamanhos diferentes e um ou outro fiapo, sempre os mesmos em cada slide (a semente é o
  // nome e o número). Ficam fora do miolo, onde está a frase.
  function poeira(k) {
    let r = [...nome].reduce((a, c) => a + c.charCodeAt(0), k * 97);
    const sorte = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    const longe = (x, y) => x > 25 && x < 975 && y > 125 && y < 1245 && !(x > 80 && x < 920 && y > 230 && y < 1090);
    let svg = '';
    for (let i = 0; i < 50; i++) {
      const x = sorte() * 1000, y = sorte() * 1270, t = 0.7 + sorte() ** 3 * 1.7, op = 0.22 + sorte() * 0.36;
      if (longe(x, y)) svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${t.toFixed(2)}" opacity="${op.toFixed(2)}"/>`;
    }
    for (let i = 0; i < 6; i++) {
      const x = sorte() * 1000, y = sorte() * 1270, dx = 8 + sorte() * 16, dy = -6 + sorte() * 12;
      if (longe(x, y)) svg += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}q${(dx / 2).toFixed(1)} ${(dy * 2).toFixed(1)} ${dx.toFixed(1)} ${dy.toFixed(1)}" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.4"/>`;
    }
    return `<svg class="poeira" viewBox="0 0 1000 1270" fill="currentColor">${svg}</svg>`;
  }

  function desenhar(F) {
    const total = F.slides.length;
    window.SLIDES = total;
    const k = Math.min(n, total);
    const sl = F.slides[k - 1];
    const tema = sl.tema || F.tema || 'branco';
    const raiz = document.getElementById('raiz');
    raiz.className = 'post';
    const foto = sl.foto || (tema === 'foto' ? F.foto : null);
    let h = `<div class="janela tema-${tema} alinha-${sl.alinha || F.alinha || 'esquerda'} pos-${sl.pos || F.pos || 'meio'}">`;
    if (foto) h += `<div class="foto" style="background-image:url('${foto.arq}');background-position:${foto.foco || 'center'}"></div><div class="veu" style="opacity:${foto.veu ?? 1}"></div>`;
    // imagem: no espaço vazio da janela (coordenadas da janela, 1000 x 1270), atrás da frase.
    // - Em camadas (o café, pedido do dono em 29/10/2026: "separar em duas camadas, o fundo e o café"): arq é a foto
    //   sobre fundo preto puro, que entra no modo tela (o preto some e fica a fumaça e a luz, sem borda nenhuma), e
    //   recorte é a xícara sem fundo (scripts/recortar.mjs), por cima, com sombra. caixa = onde a xícara está na foto
    //   (frações: esquerda, topo, direita, baixo; sai do frase-camadas.py). x, y e w posicionam a xícara, não a foto:
    //   x = 92 alinha a xícara com o texto.
    // - moldura 'notebook': a tela num notebook (o mockup do curso).
    if (sl.imagem) {
      const im = sl.imagem;
      if (im.recorte && im.caixa) {
        const [l, t, r, b] = im.caixa;
        const W = im.w / (r - l);
        // A fumaça some aos poucos até `fumaca` (em alturas da xícara) acima dela, para não bater no cabeçalho nem ser
        // cortada pela borda da janela (o corte seco entrega a montagem).
        const alto = im.fumaca ?? 0.3;
        const de = Math.max(0, t - alto * (b - t)) * 100, ate = t * 100;
        const mascara = `linear-gradient(to bottom, transparent ${de.toFixed(1)}%, #000 ${ate.toFixed(1)}%)`;
        h += `<div class="imagem camadas" style="left:${im.x - l * W}px;top:${im.y - t * W}px;width:${W}px"><img class="luz" src="${im.arq}" alt="" style="-webkit-mask-image:${mascara};mask-image:${mascara}"><img class="xicara" src="${im.recorte}" alt=""></div>`;
        // perto: a xícara encosta no texto de cada card (a tantos px acima do rótulo), em vez de ficar na mesma altura em
        // todos ("cada card o café pode se alinhar melhor próximo do texto, não precisa ficar tudo reto"). Ver ajustar().
      } else {
        const pos = `left:${im.x}px;top:${im.y}px;width:${im.w}px;${im.rot ? `transform:rotate(${im.rot}deg);` : ''}`;
        h += im.moldura === 'notebook'
          ? `<div class="imagem notebook" style="${pos}"><div class="tela"><img src="${im.arq}" alt=""></div><div class="base"></div></div>`
          : `<div class="imagem esfumada" style="${pos}"><img src="${im.arq}" alt=""></div>`;
      }
    }
    h += `<div class="bloco">`;
    if (sl.rotulo) h += `<div class="rotulo">${marcar(sl.rotulo)}</div>`;
    h += `<div class="frase" style="${sl.entrelinha ? `line-height:${sl.entrelinha};` : ''}${sl.espaco ? `letter-spacing:${sl.espaco};` : ''}">${marcar(sl.texto)}</div>`;
    if (sl.apoio) h += `<div class="apoio">${marcar(sl.apoio)}</div>`;
    // cta: o botão do card de oferta. { texto: 'Comenta', palavra: 'POSTS' }.
    if (sl.cta) h += `<div class="cta">${esc(sl.cta.texto || 'Comenta')} <b>${esc(sl.cta.palavra)}</b></div>`;
    h += `</div>`;
    if (ETAPA >= 3 && sl.rabisco && RABISCOS[sl.rabisco.tipo]) {
      const r = sl.rabisco;
      h += `<div class="rabisco" style="left:${r.x}px;top:${r.y}px;width:${r.w || 120}px;transform:rotate(${r.rot || 0}deg)">${RABISCOS[r.tipo]}</div>`;
    }
    h += `<div class="cabecalho"><i class="min"></i><span>${(window.FRASE.marca || {}).perfil || '@agenciasetup'} | <b>${(window.FRASE.marca || {}).nome || 'Calango'}</b></span><i class="fechar"></i></div>`;
    // O trilho mostra em que ponto da série a pessoa está (só em carrossel), como nos carrosséis da agência.
    if (total > 1) h += `<div class="trilho"><i style="left:${((k - 1) / (total - 1)) * 100}%"></i></div>`;
    // Etapa 5: a textura de impressão da agência, como nos carrosséis: meio-tom no fundo, pontinhos dentro da letra
    // (.etapa-5 .frase) e o ruído de filme por cima de tudo (pedido do dono em 29/10/2026: "senti falta do ruído, halftone").
    if (ETAPA >= 5) h += `${poeira(k)}<div class="meio-tom"></div><div class="grao"></div>`;
    h += `</div>`;
    raiz.className = `post etapa-${ETAPA}`;
    raiz.innerHTML = h;
    document.fonts.ready.then(() => { ajustar(sl, F); tirarPoeiraDoTexto(); window.PRONTO = true; });
  }

  // Poeira nunca em cima de texto nem colada nele: depois de tudo no lugar, apaga a que cai perto de alguma letra.
  function tirarPoeiraDoTexto() {
    const textos = [];
    const andar = document.createTreeWalker(document.getElementById('raiz'), NodeFilter.SHOW_TEXT);
    const faixa = document.createRange();
    while (andar.nextNode()) {
      if (!andar.currentNode.textContent.trim()) continue;
      faixa.selectNodeContents(andar.currentNode);
      textos.push(...faixa.getClientRects());
    }
    document.querySelectorAll('.poeira > *').forEach((p) => {
      const c = p.getBoundingClientRect();
      if (c.bottom > 1205 && c.top < 1295) { p.remove(); return; } // a faixa do trilho
      if (textos.some((r) => c.right > r.left - 48 && c.left < r.right + 48 && c.bottom > r.top - 48 && c.top < r.bottom + 48)) p.remove();
    });
  }

  // A frase enche a largura: o tamanho sai da linha mais comprida, até o teto (tamanho). Numa série, ponha o mesmo
  // tamanho em todos os slides (F.tamanho) e só diminui o que não cabe. Se o bloco passar da altura, diminui.
  function ajustar(sl, F) {
    const frase = document.querySelector('.frase');
    const rotulo = document.querySelector('.rotulo');
    const largura = sl.largura || F.largura || 816;
    const teto = sl.tamanho || F.tamanho || 170;
    frase.style.fontSize = '100px';
    let tam = Math.min(teto, (100 * largura) / frase.getBoundingClientRect().width);
    const aplicar = () => {
      frase.style.fontSize = `${tam}px`;
      if (rotulo) rotulo.style.fontSize = `${sl.tamRotulo || F.tamRotulo || Math.round(tam * 0.72)}px`;
    };
    aplicar();
    const bloco = document.querySelector('.bloco');
    const alturaMax = sl.altura || F.altura || 900;
    const alt = bloco.getBoundingClientRect().height;
    if (alt > alturaMax) { tam *= alturaMax / alt; aplicar(); }
    // A imagem em camadas com `perto`: o pé da xícara fica a `perto` px do começo do texto (nunca acima do `y`, que
    // segura o espaço do cabeçalho).
    const im = sl.imagem;
    const caixa = document.querySelector('.camadas');
    if (im && im.recorte && im.caixa && im.perto != null && caixa) {
      const [l, t, r, b] = im.caixa;
      const W = im.w / (r - l);
      const alturaXicara = (b - t) * W;
      const topoTexto = bloco.getBoundingClientRect().top - document.querySelector('.janela').getBoundingClientRect().top;
      const y = Math.max(im.y, topoTexto - im.perto - alturaXicara);
      caixa.style.top = `${y - t * W}px`;
    }
  }
})();
