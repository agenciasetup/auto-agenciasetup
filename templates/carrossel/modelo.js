// Monta um slide do carrossel a partir de um conteúdo (conteudos/<nome>.js define window.CARROSSEL).
// Endereço: modelo.html?c=<nome>&s=<número do slide, de 1>&tema=<amarelo|preto|branco>&etapa=<1|3|5>
// Cada tipo de slide (capa, miolo, chamada) desenha as mesmas camadas, de 0 a 4 (modelo.css).
// Camadas 0 a 2 e o título de trás ficam dentro da janela (cortados por ela); 3 e 4 ficam por cima e podem vazar a borda.
// Etapas (a regra das 5 etapas, LEIA.md): 1 = só o mínimo bem feito, sem efeito nem textura; 3 = com os efeitos;
// 5 = com ruído, meio-tom e contraste (a peça final).
// &so=<fundo|titulo|assunto|frente|acabamento> desenha uma camada só, em fundo transparente (o slide das camadas usa).
(function () {
  const q = new URLSearchParams(location.search);
  const nome = (q.get('c') || 'criado-no-claude').replace(/[^a-z0-9-]/g, '');
  const n = Math.max(1, parseInt(q.get('s') || '1', 10));
  const ETAPA = [1, 3, 5].includes(Number(q.get('etapa'))) ? Number(q.get('etapa')) : 5;
  const SO = ['fundo', 'titulo', 'assunto', 'frente', 'acabamento'].includes(q.get('so')) ? q.get('so') : null;
  // &mapa=<nome>: os mapas de conferência (11/11/2026, pedido do dono: "crie mapa de margem, mapa de construção, mapa de
  // profundidade, de desfoque, desfoque de movimento, luz, sombra realista"). profundidade e desfoque pintam cada elemento
  // num cinza; construcao, margens e luz desenham por cima da peça (templates/carrossel/mapas.js); texto e elementos
  // deixam só uma parte à vista, em fundo transparente, para a conferência medir o que cobre o quê.
  const MAPA = ['profundidade', 'desfoque', 'construcao', 'margens', 'luz', 'texto', 'elementos'].includes(q.get('mapa')) ? q.get('mapa') : (q.get('profundidade') === '1' ? 'profundidade' : null);
  // &ate=<camada>: desenha as camadas de baixo até esta (fundo, título, assunto, frente, acabamento), somando. É a capa
  // "por etapas" que o post mostra sendo montada (primeiro o fundo, depois o título, o assunto e os efeitos).
  const ATE = ['fundo', 'titulo', 'assunto', 'frente', 'acabamento'].includes(q.get('ate')) ? q.get('ate') : null;
  // &t=<0 a 1>: o momento da animação (card animado). Sem t, a peça parada é o último quadro (t = 1).
  // window.seek(t) redesenha no mesmo lugar, para o exportador de vídeo fotografar quadro a quadro.
  let T = q.has('t') ? Math.min(Math.max(Number(q.get('t')) || 0, 0), 1) : 1;
  // Só o vídeo mexe: sem t na URL (a exportação parada), o `movimento` não entra e a peça sai como foi aprovada.
  let ANIMANDO = q.has('t');
  const surge = (de, dura = 0.08) => Math.min(Math.max((T - de) / dura, 0), 1);
  const suave = (x) => 1 - (1 - x) ** 3;
  // Prova animada (miolo com `anima: true`, 04/11/2026): cada item da prova entra no seu tempo (checklist, notificações,
  // linhas de código, etapas). Sem `anima`, `ap` devolve 1 e a prova sai parada, como sempre.
  let ANIMA = false;
  const ap = (de, dura = 0.1) => (ANIMA ? suave(surge(de, dura)) : 1);
  const s = document.createElement('script');
  s.src = `conteudos/${nome}.js`;
  s.onload = () => desenhar(window.CARROSSEL, n, q.get('tema'));
  s.onerror = () => { document.body.innerHTML = `<p style="color:#fff;font:30px sans-serif;padding:40px">Conteúdo ${nome} não encontrado.</p>`; };
  document.head.appendChild(s);

  // ---------------------------------------------------------------- peças comuns
  const JANELA = 40;
  // Número vira px, menos nas propriedades sem unidade (line-height 0.9 não é 0.9px).
  const SEM_UNIDADE = new Set(['lineHeight', 'opacity', 'zIndex', 'fontWeight', 'flex']);
  const estilo = (o = {}) => Object.entries(o).map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${typeof v === 'number' && !SEM_UNIDADE.has(k) ? `${v}px` : v}`).join(';');
  const img = (arq, o, classe = '') => `<img class="${classe}" src="imagens/${arq}" alt="" style="${estilo(o)}">`;
  // Imagem de prova: nome em imagens/ ou caminho relativo (../../public/img/..., ../../_local/...).
  const caminhoImg = (arq) => (/^(\.\.\/|https?:|data:)/.test(arq) ? arq : `imagens/${arq}`);
  const VISTO = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const cromo = () => `<svg class="cromo menos" viewBox="0 0 32 32"><path d="M4 16h24"/></svg><svg class="cromo fechar" viewBox="0 0 32 32"><path d="M7 7l18 18M25 7L7 25"/></svg>`;
  const topo = (marca) => `<div class="topo"><span class="fina">${marca.perfil}</span> | <b>${marca.nome}</b></div>`;
  function reguas() {
    let nums = '';
    for (let y = 0, v = 0; y <= 1000; y += 100, v += 50) nums += `<span style="top:${y - 6}px">${v}</span>`;
    return `<div class="regua esq">${nums}</div><div class="regua dir">${nums}</div>`;
  }
  // s.reguasAtras: a régua vai para trás do assunto (o objeto que vaza até a borda passa por cima dela, sem traço em cima).
  const reguasAtras = (s) => (s.reguasAtras ? `<div style="position:absolute;left:-40px;top:-40px;width:1080px;height:1350px">${reguas()}</div>` : '');
  // Linha de baixo dos slides de dentro: mostra em que ponto do carrossel a pessoa está (liga um card ao outro).
  const trilho = (i, total) => `<div class="trilho"><i style="left:${((i - 1) / (total - 1)) * 100}%"></i></div>`;
  const CURSOR = '<svg viewBox="0 0 46 46"><defs><linearGradient id="gcur" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb000"/><stop offset="1" stop-color="#ff6a00"/></linearGradient></defs><path d="M6 4 L41 21 L25 26 L19 42 Z" fill="url(#gcur)" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>';
  // Selo "calango": o cursor de quem está editando. `aponta` é o elemento para onde a ponta do cursor vai (alinhar()).
  const selo = (o) => `<div class="selo-calango ${o.pequeno ? 'pequeno' : ''}" data-aponta="${o.aponta || ''}" data-ponto="${(o.ponto || [0, 1]).join(',')}" style="${o.aponta ? '' : estilo({ left: o.left, top: o.top })}">${CURSOR}<b>${(window.CARROSSEL.marca && window.CARROSSEL.marca.selo) || 'calango'}</b></div>`;
  // Símbolo do Claude (o da Anthropic, do Wikimedia Commons), para o ícone do app nas notificações e na conversa.
  const CLAUDE = 'm19.6 66.5 19.7-11 .3-1-.3-.5h-1l-3.3-.2-11.2-.3L14 53l-9.5-.5-2.4-.5L0 49l.2-1.5 2-1.3 2.9.2 6.3.5 9.5.6 6.9.4L38 49.1h1.6l.2-.7-.5-.4-.4-.4L29 41l-10.6-7-5.6-4.1-3-2-1.5-2-.6-4.2 2.7-3 3.7.3.9.2 3.7 2.9 8 6.1L37 36l1.5 1.2.6-.4.1-.3-.7-1.1L33 25l-6-10.4-2.7-4.3-.7-2.6c-.3-1-.4-2-.4-3l3-4.2L28 0l4.2.6L33.8 2l2.6 6 4.1 9.3L47 29.9l2 3.8 1 3.4.3 1h.7v-.5l.5-7.2 1-8.7 1-11.2.3-3.2 1.6-3.8 3-2L61 2.6l2 2.9-.3 1.8-1.1 7.7L59 27.1l-1.5 8.2h.9l1-1.1 4.1-5.4 6.9-8.6 3-3.5L77 13l2.3-1.8h4.3l3.1 4.7-1.4 4.9-4.4 5.6-3.7 4.7-5.3 7.1-3.2 5.7.3.4h.7l12-2.6 6.4-1.1 7.6-1.3 3.5 1.6.4 1.6-1.4 3.4-8.2 2-9.6 2-14.3 3.3-.2.1.2.3 6.4.6 2.8.2h6.8l12.6 1 3.3 2 1.9 2.7-.3 2-5.1 2.6-6.8-1.6-16-3.8-5.4-1.3h-.8v.4l4.6 4.5 8.3 7.5L89 80.1l.5 2.4-1.3 2-1.4-.2-9.2-7-3.6-3-8-6.8h-.5v.7l1.8 2.7 9.8 14.7.5 4.5-.7 1.4-2.6 1-2.7-.6-5.8-8-6-9-4.7-8.2-.5.4-2.9 30.2-1.3 1.5-3 1.2-2.5-2-1.4-3 1.4-6.2 1.6-8 1.3-6.4 1.2-7.9.7-2.6v-.2H49L43 72l-9 12.3-7.2 7.6-1.7.7-3-1.5.3-2.8L24 86l10-12.8 6-7.9 4-4.6-.1-.5h-.3L17.2 77.4l-4.7.6-2-2 .2-3 1-1 8-5.5Z';
  const simboloClaude = () => `<svg viewBox="0 0 100 100"><path d="${CLAUDE}"/></svg>`;
  const LOGO = '<svg viewBox="0 0 32 32"><path d="M20.5 10.2c-2.9-1.9-8.6-1.2-8.6 2.6 0 4.5 9 2.9 9 7.4 0 4-5.6 4.9-9.2 2.8" fill="none" stroke="#140800" stroke-width="3.2" stroke-linecap="round"/></svg>';
  const ICONES = {
    claude: simboloClaude(),
    logo: LOGO,
    instagram: '<svg viewBox="0 0 32 32"><rect x="6" y="6" width="20" height="20" rx="6" fill="none" stroke="#fff" stroke-width="2.6"/><circle cx="16" cy="16" r="4.6" fill="none" stroke="#fff" stroke-width="2.6"/><circle cx="21.6" cy="10.4" r="1.6" fill="#fff"/></svg>',
    conversa: '<svg viewBox="0 0 32 32"><path d="M7 9h18a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H15l-6 5v-5H7a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3z" fill="none" stroke="#140800" stroke-width="2.6" stroke-linejoin="round"/></svg>',
    baixar: '<svg viewBox="0 0 32 32"><path d="M16 5v15m-6-6 6 6 6-6M7 25h18" fill="none" stroke="#140800" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  // Notificação no estilo iOS (ícone do app, nome, hora e mensagem). `classe` = 'na-pilha' quando vem empilhada.
  const notificacao = (nt, classe = '', st = '') => `<div class="notificacao ${classe}" style="${st}">
      <span class="app ${nt.icone === 'instagram' ? 'instagram' : nt.icone && nt.icone !== 'claude' ? 'laranja' : ''}">${ICONES[nt.icone || 'claude']}</span>
      <div class="corpo"><div class="cabeca"><b>${nt.app}</b><time>${nt.quando}</time></div><p>${nt.texto}</p></div>
    </div>`;

  // Desfoque progressivo (o das capas da agência): o desfoque cresce aos poucos ao longo de uma direção, sem corte seco.
  // Várias cópias com desfoques crescentes, cada uma numa faixa; as vizinhas se somam (plus-lighter, dentro de um grupo
  // isolado), então a forma nunca fica dupla nem perde força na passagem. `perfil(t)` dá o desfoque em px na posição t
  // (0 a 1 ao longo do degradê). `folga` é a margem em px em volta do conteúdo (para o desfoque não ser cortado).
  // Na etapa 1 não há desfoque: sai só a cópia nítida.
  const NIVEIS = [0, 1.5, 3.5, 6.5, 10.5, 16];
  function progressivo(html, perfil, { angulo = 90, folga = 0 } = {}) {
    if (ETAPA < 3) return `<div class="copia">${html}</div>`;
    const PASSOS = 40;
    const pos = (t) => (folga ? `calc(${folga}px + ${(t * 100).toFixed(2)}% - ${(t * 2 * folga).toFixed(1)}px)` : `${(t * 100).toFixed(2)}%`);
    const amostras = Array.from({ length: PASSOS + 1 }, (_, i) => i / PASSOS).map((t) => [t, Math.min(Math.max(perfil(t), 0), NIVEIS.at(-1))]);
    return NIVEIS.map((nivel, k) => {
      const ant = NIVEIS[k - 1], prox = NIVEIS[k + 1];
      const peso = (b) => (b <= nivel ? (ant === undefined ? (b === nivel ? 1 : 0) : Math.max(0, (b - ant) / (nivel - ant))) : (prox === undefined ? 1 : Math.max(0, (prox - b) / (prox - nivel))));
      const pesos = amostras.map(([t, b]) => [t, peso(b)]);
      if (pesos.every(([, p]) => p < 0.002)) return '';
      const mascara = `linear-gradient(${angulo}deg, ${pesos.map(([t, p]) => `rgba(0,0,0,${p.toFixed(3)}) ${pos(t)}`).join(', ')})`;
      return `<div class="copia" style="filter:${nivel ? `blur(${nivel}px)` : 'none'};-webkit-mask-image:${mascara};mask-image:${mascara}">${html}</div>`;
    }).join('');
  }
  // Perfil de foco: nítido entre `centro`, crescendo até `esq` px na ponta esquerda e `dir` px na direita.
  const perfilFoco = ({ esq = 7, dir = 14, centro = [0.3, 0.66], min = 0 } = {}) => (t) => Math.max(min, t < centro[0] ? esq * ((centro[0] - t) / centro[0]) ** 1.4 : t > centro[1] ? dir * ((t - centro[1]) / (1 - centro[1])) ** 1.4 : 0);

  // Efeitos (etapa 3): cada um precisa de um motivo no conteúdo (de onde vem a luz, o que está perto da câmera).
  function flare(x, y, escala = 1, semReflexos = false) {
    // Núcleo, risco horizontal e reflexos (fantasmas) na linha até o centro. Em capa com rosto, sem reflexos:
    // eles caem no meio do slide, em cima do assunto.
    const cx = 540, cy = 675;
    const fant = semReflexos ? '' : [0.35, 0.6, 0.85, 1.25].map((t, i) => {
      const fx = (cx - x) * t, fy = (cy - y) * t, r = [70, 34, 120, 50][i];
      return `<i style="left:${fx - r / 2}px;top:${fy - r / 2}px;width:${r}px;height:${r}px;opacity:${[0.6, 0.9, 0.35, 0.5][i]}"></i>`;
    }).join('');
    return `<div class="flare" style="left:${x}px;top:${y}px;transform:scale(${escala})"><div class="nucleo"></div><div class="risco"></div><div class="fantasmas">${fant}</div></div>`;
  }
  const bokeh = (lista = []) => lista.map(([x, y, r, cor, op]) => `<div class="bokeh" style="left:${x}px;top:${y}px;width:${r}px;height:${r}px;opacity:${op ?? 0.55};background:radial-gradient(circle,${cor || 'rgba(255,214,120,.9)'},rgba(255,160,40,.15) 70%)"></div>`).join('');
  // `solto: true`: o objeto não acompanha o zoom do assunto; anda sozinho pelo `movimento.objetos` (na ordem dos soltos).
  const folhas = (lista = []) => lista.map((f) => img(f.arq || 'folha.png', { left: f.x, top: f.y, width: f.w, transform: `rotate(${f.rot || 0}deg)`, filter: `blur(${f.blur ?? 14}px) brightness(${f.luz ?? 0.9})`, opacity: f.op ?? 1 }, f.solto ? 'folha solto' : 'folha')).join('');
  const frente = (s) => {
    const lista = (s.frente || []).map((f) => ({ blur: 0, luz: 1, ...f }));
    const dentro = lista.filter((f) => f.dentro);
    const j = s.sangra ? 0 : JANELA;
    return `${folhas(lista.filter((f) => !f.dentro))}${dentro.length ? `<div class="frente-dentro" style="position:absolute;inset:${j}px;border-radius:${j ? 46 : 0}px;overflow:hidden">${folhas(dentro.map((f) => ({ ...f, x: f.x - j, y: f.y - j })))}</div>` : ''}`;
  };
  const luzFundo = (l) => (l ? `<div class="luz-fundo" style="${estilo({ left: l.x - l.r / 2 - JANELA, top: l.y - l.r / 2 - JANELA, width: l.r, height: l.r })}"></div>` : '');
  // Fundo de foto (24/10/2026): a cena da própria foto, sem a pessoa e desfocada (`_local/estilos/fundo-limpo.py`), na
  // mesma caixa do assunto. O título fica entre ela e o recorte nítido: é o desfoque de campo que o Filipe pediu.
  // `fundoBrilho` (0 a 1) escurece a cena para o título ler. `fundoFoto` também aceita { arq, x, y, w }: a cena em outra
  // caixa, para a pessoa descer na janela e a cena continuar cobrindo o topo.
  const fundoFoto = (s) => {
    // `fundoLiso`: uma cor só, sem brilho nem degradê (o Filipe reprovou o brilho "colocado à toa" atrás dele).
    if (s.fundoLiso) return `<div class="fundo-liso" style="background:${s.fundoLiso}"></div>`;
    if (!s.fundoFoto || !s.assunto) return '';
    const f = typeof s.fundoFoto === 'string' ? { arq: s.fundoFoto, ...s.assunto } : { ...s.assunto, ...s.fundoFoto };
    return img(f.arq, { left: f.x - JANELA, top: f.y - JANELA, width: f.w, ...(s.fundoBrilho ? { filter: `brightness(${s.fundoBrilho})` } : {}) }, 'fundo-foto');
  };

  // Detalhes do fundo (camada 1): textinhos, rabiscos, palavra vazada. Só com motivo; na capa, nunca (poluem).
  const miudos = (lista = []) => lista.map(([t, x, y, rot, forte]) => `<div class="miudo ${forte ? 'forte' : ''}" style="left:${x}px;top:${y}px;transform:rotate(${rot || 0}deg)">${t}</div>`).join('');
  const RABISCOS = {
    espiral: 'M40 40c0-10 14-12 18-3s-6 20-18 18-18-16-8-26 32-8 34 8-12 30-30 28',
    estrela: 'M30 4l7 18 19 2-15 12 5 19-16-10-16 10 5-19L4 24l19-2z',
    onda: 'M0 20c20-20 40 20 60 0s40 20 60 0 40 20 60 0',
    circulo: 'M60 10c30 0 52 14 50 32s-30 30-60 28S0 52 4 34 30 8 64 12',
    xis: 'M4 4l40 40M44 4L4 44',
  };
  const rabiscos = (lista = []) => lista.map(([nomeR, x, y, esc, rot]) => `<svg class="rabisco" style="left:${x}px;top:${y}px;width:180px;height:100px;transform:scale(${esc || 1}) rotate(${rot || 0}deg)" viewBox="0 0 180 100"><path d="${RABISCOS[nomeR]}"/></svg>`).join('');
  // Anotações à mão (11/11/2026, o dono, mostrando cinco posts dele: "esses posts têm uns rabiscos escritos bem
  // escondidinho? Levemente desfocados, só pra dar um charme e rabisco na arte, como se alguém tivesse escrito ali. Uma
  // comunicação mais informal, um comentário, anotação... Use a fonte Calango Ink. Sempre desfoque sutilmente, bem
  // pouco. Mescle com efeito tela, multiplicar ou algum. Sempre com opacidade menor, pois é detalhe!").
  // `anotacoes: [{ texto, x, y, rot, tam, larg, cor, op, blur, mistura, alinha, seta }]` no slide, em coordenadas da
  // página. O texto quebra onde houver quebra de linha. Padrão: 34 px, 0,8 px de desfoque, 26% de opacidade ("precisa quase não aparecer"), tela no
  // card escuro e
  // multiplicar no claro. `seta`: uma setinha à mão no fim ('direita', 'esquerda', 'cima', 'baixo').
  const SETAS = { direita: 0, baixo: 90, esquerda: 180, cima: 270 };
  const anotacoes = (s) => (s.anotacoes || []).map((a) => {
    const escuro = s.tema === 'preto';
    const cor = a.cor || (escuro ? '#f3ead8' : '#3a2c1c');
    const seta = a.seta !== undefined ? `<svg viewBox="0 0 120 60" width="${Math.round((a.tam || 34) * 2.1)}" style="display:block;margin:${a.setaMargem || '6px 0 0 18px'};transform:rotate(${(typeof a.seta === 'number' ? a.seta : SETAS[a.seta] ?? 0)}deg);overflow:visible"><path d="M6 40c26-22 58-26 96-14M84 12l20 14-22 12" fill="none" stroke="${cor}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>` : '';
    return `<div class="anotacao" style="left:${a.x - JANELA}px;top:${a.y - JANELA}px;${a.larg ? `width:${a.larg}px;` : ''}font-size:${a.tam || 34}px;color:${cor};opacity:${a.op ?? 0.26};filter:blur(${a.blur ?? 0.8}px);mix-blend-mode:${a.mistura || (escuro ? 'screen' : 'multiply')};text-align:${a.alinha || 'left'};transform:rotate(${a.rot || 0}deg)">${String(a.texto).split('\n').join('<br>')}${seta}</div>`;
  }).join('');
  const camada0 = (s) => `<div class="fundo" style="--luz-x:${s.luzX || '55%'};--luz-y:${s.luzY || '35%'}"></div>${s.halo ? `<div class="brilho-assunto" style="${estilo(s.halo)}"></div>` : ''}`;
  // `fundoBlocos`: blocos atrás do título e da pessoa (a janela do Claude, os slides soltos). Bloco com `mescla`
  // (ex.: 'screen') vai para a camada 0, junto do fundo: cada camada isola a mistura, e na 1 ele não teria com o que
  // se misturar.
  const blocoFundo = (b) => BLOCOS[b.tipo]({ ...b, x: b.x - JANELA, y: b.y - JANELA });
  const blocosMescla = (s) => (s.fundoBlocos || []).filter((b) => b.mescla).map(blocoFundo).join('');
  const camada1 = (s) => `${s.vazada ? `<div class="vazada" style="${estilo(s.vazada.pos)}">${s.vazada.texto}</div>` : ''}${miudos(s.miudos)}${rabiscos(s.rabiscos)}${anotacoes(s)}${(s.fundoBlocos || []).filter((b) => !b.mescla).map(blocoFundo).join('')}`;

  // Assunto recortado de foto (camada 2): sombra projetada no fundo, halo quente e, se pedir, desfoque progressivo no que
  // está mais perto da câmera (`foco`: nítido até `de`, cresce até `max` px em `ate`, na direção `angulo`).
  function assuntoFoto(a) {
    const caixa = { left: a.x - JANELA, top: a.y - JANELA, width: a.w, ...(a.contorno ? { filter: `drop-shadow(0 0 3px ${a.contorno}) drop-shadow(0 0 26px ${a.contorno}70)` } : {}) };
    const f = a.foco;
    // `brilho: false`: sem o halo quente em volta da pessoa (o Filipe reprovou o "glow sem sentido" atrás dele, 24/10/2026).
    const classes = `assunto limpo${a.cru ? ' cru' : ''}${a.brilho === false ? ' sem-brilho' : ''}`;
    const foto = f
      ? `<div class="progressivo ${classes}" style="${estilo(caixa)}">${progressivo(`<img src="imagens/${a.arq}" alt="">`, (x) => (x <= f.de ? 0 : f.max * Math.min(1, (x - f.de) / (f.ate - f.de)) ** 1.3), { angulo: f.angulo ?? 180 })}</div>`
      : img(a.arq, caixa, classes);
    // `sombra: false`: sem a sombra projetada (o Filipe reprovou "sombras péssimas" em 24/10/2026).
    const sombra = a.sombra === false ? '' : img(a.arq, { ...caixa, transform: `translate(${a.sombraX ?? 34}px, ${a.sombraY ?? 26}px)` }, 'sombra-projetada');
    return `${sombra}${foto}`;
  }

  // ---------------------------------------------------------------- carrossel infinito (11/11/2026)
  // Pedido do dono: "ao invés de 1080x1350 + 1080x1350 + 1080x1350, faz um 3240x1350... cria margens que dividem a cada
  // 1080 (tipo fatias) e aí você consegue colocar essas imagens entre cards. Pode manter as molduras pretas, mas pode
  // ter elementos que ficam por cima delas de um card pro outro."
  // `panorama` e `travessia` ficam no carrossel (não no slide), em coordenadas da TELA LARGA: x vai de 0 a 1080 vezes o
  // número de cards, e a divisa entre o card 1 e o 2 é x = 1080 (entre o 2 e o 3, x = 2160). Cada card mostra a sua
  // fatia da mesma tela, com a mesma conta, e por isso a emenda casa no pixel.
  //   panorama: { arq, x, y, w, blur, luz, op } ou uma lista: a cena larga por dentro das janelas. A moldura preta
  //     continua; entre os cards a cena passa por trás dela, como uma paisagem vista por janelas lado a lado. Fica por
  //     cima do fundo do tema. Slide que não quer: `semPanorama: true`.
  //   travessia: [{ arq, x, y, w, rot, espelho, blur, luz, op, sombra, acima }]: o que atravessa de um card para o outro
  //     por cima da moldura (o girassol entre dois cards, as abelhas, a folha). Sombra realista por padrão (a de contato
  //     e a projetada); `sombra: false` tira, `sombra: { x, y, blur, op }` muda a projetada. Com `blur` (o que está perto
  //     da lente), sem sombra. `acima: true` passa também por cima do acabamento (cabeçalho, progresso, selo). Na etapa 1
  //     (o mínimo), entra sem sombra e sem desfoque. A textura (ruído, meio-tom) continua por cima de tudo.
  const CARD = 1080;
  const listaDe = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  // A cor de cada elemento, para a harmonia da cena (11/11/2026: "Folha verde que tá numa cor completamente diferente
  // do cenário, quebra tudo e deixa amador"): `matiz` em graus, `sat` (1 = igual) e `luz` (1 = igual).
  const corDe = (t) => [t.matiz ? `hue-rotate(${t.matiz}deg)` : '', t.sat !== undefined && t.sat !== 1 ? `saturate(${t.sat})` : '', t.luz && t.luz !== 1 ? `brightness(${t.luz})` : ''].filter(Boolean);
  // Profundidade (11/11/2026, o dono: "você precisa criar um mapa de profundidade pra entender"; "nesse tamanho, a
  // borboleta estaria bem mais desfocada, considerando proporção... não teria uma sombra também embaixo dela? embaixo
  // do tronco?"). `z` de -1 (o fundo, longe) a 0 (o plano do foco, o dos cartões) a 1 (colado na lente). Sem `blur`
  // próprio, o desfoque sai do z, com a mesma conta para todos: perto da lente cresce rápido (z 0,35 = 6 px, z 0,6 = 14,
  // z 0,9 = 30), no fundo mais devagar (z -1 = 10). A sombra também: quanto mais longe da superfície, mais deslocada,
  // maior e mais fraca; no fundo não há sombra. Dois elementos nítidos no mesmo plano precisam ter tamanhos de verdade
  // parecidos (uma borboleta nítida maior que a outra parece gigante).
  const PROF = MAPA === 'profundidade' || MAPA === 'desfoque';
  // O cinza de cada elemento no mapa: na profundidade, mais claro é mais perto da lente; no desfoque, branco é nítido e
  // escuro é muito desfocado.
  const cinzaDoMapa = (t) => (MAPA === 'desfoque' ? 1 - Math.min(1, (t.blur || 0) / 36) * 0.82 : 0.5 + 0.5 * (t.z || 0));
  function comProfundidade(t) {
    if (t.z === undefined || t.halo) return t;
    const z = Math.max(-1, Math.min(1, Number(t.z) || 0));
    const blur = t.blur ?? Math.round(z > 0 ? 30 * z * z + 6 * z : -10 * z);
    // Sombra só quando pedida (`sombra: true` ou um objeto), para o que está perto de uma superfície: a borboleta sobre o
    // cartão, o tronco sobre o card. O que voa ou sai da borda de baixo (abelha, girassol, busto) fica sem: o dono, em
    // 11/11/2026, "a sombra na abelha ficou artificial... o girassol tem uma sombra artificial, o busto também".
    const sombra = !t.sombra || z < 0 ? false
      : (typeof t.sombra === 'object' ? t.sombra : { x: Math.round(18 + 150 * z), y: Math.round(26 + 190 * z), blur: Math.round(26 + 110 * z), op: Math.max(0.12, Math.round((0.42 - 0.26 * z) * 100) / 100) });
    return { ...t, z, blur, sombra, comZ: true };
  }
  function filtroDaTravessia(t) {
    if (PROF) return `brightness(0) invert(${cinzaDoMapa(t).toFixed(2)})`;
    if (ETAPA < 3) return corDe(t).join(' ') || 'none';
    const f = [];
    if (t.blur) f.push(`blur(${t.blur}px)`);
    // `contorno`: a luz de contorno na borda (o dono, 11/11/2026: "um girassol lindo, com uma luz de contorno nos lados,
    // amarelo"), um brilho fino e outro largo na cor pedida.
    if (t.contorno && ETAPA >= 3) f.push(`drop-shadow(0 0 3px ${t.contorno})`, `drop-shadow(0 0 26px ${t.contorno}70)`);
    if (t.comZ ? t.sombra : t.sombra !== false && !t.blur) {
      const p = { x: 22, y: 34, blur: 38, op: 0.42, ...(typeof t.sombra === 'object' ? t.sombra : {}) };
      // A sombra de contato (curta e escura) só no que encosta na superfície; o que voa acima dela fica só com a larga.
      if (!t.comZ || t.z <= 0.05) f.push(`drop-shadow(0 4px 5px rgba(0,0,0,${Math.min(0.6, p.op + 0.1)}))`);
      f.push(`drop-shadow(${p.x}px ${p.y}px ${p.blur}px rgba(0,0,0,${p.op}))`);
    }
    return [...f, ...corDe(t)].join(' ') || 'none';
  }
  // Vagalume (11/11/2026, pedido do dono: "vagalumes, em profundidades desfocadas... mais perto da câmera desfoca, mais
  // perto do assunto foca, mais longe do assunto no fundo desfoca, e a luz também afeta"): a luz feita em código, sem
  // imagem. { vagalume: true, x, y (o centro), r (o raio do núcleo), blur, op, mistura }. O brilho em volta vai até 5
  // vezes o raio e ilumina o que está atrás (mistura `screen`; num fundo branco, `mistura: 'normal'`). No plano do
  // assunto: núcleo nítido (blur 0). Perto da lente: maior e bem desfocado. No fundo: menor, desfocado e mais fraco
  // (melhor dentro das janelas, no `panorama`).
  function vagalume(v, x, y) {
    const r = v.r || 6;
    const d = r * 10;
    return `<div class="vagalume${v.cor === 'quente' ? ' quente' : ''}" data-r="${r}" data-op="${v.op ?? 1}" style="${estilo({ left: x - d / 2, top: y - d / 2, width: d, height: d, filter: v.blur && ETAPA >= 3 ? `blur(${v.blur}px)` : 'none', opacity: v.op ?? 1, mixBlendMode: v.mistura || 'screen' })}"></div>`;
  }
  function telaLarga(partes) {
    const C = window.CARROSSEL || {};
    const s = (C.slides || [])[n - 1] || {};
    const j = String(partes.classe || '').split(' ').includes('sangra') ? 0 : JANELA;
    const dx = (n - 1) * CARD;
    const largura = CARD * ((C.slides || []).length || 1);
    // Um elemento da tela larga (panorama ou travessia). Além da imagem:
    //   `mistura`: o modo de mesclagem. No panorama, a nuvem fotografada em fundo branco com 'multiply' funde no card
    //     claro (o branco some e fica só o volume); na travessia a mistura vale só entre os elementos da própria camada.
    //   `escurece`: a sombra em degradê por cima do próprio elemento, só onde ele é opaco ({ de: 'baixo' | 'cima' |
    //     'esquerda' | 'direita' ou graus, forca, ate }): o dono, sobre as quinas da moldura nos cards pretos, "uma
    //     sombra vindo de baixo neles, escurecendo, ficaria melhor". A direção é a da tela, mesmo com o elemento girado.
    //   `rastro`: o desfoque de movimento do que voa ({ px, angulo }, o ângulo em graus na direção do voo).
    // Cada um leva os dados (data-*) que os mapas e a conferência leem.
    const rastros = new Set();
    const DIRECAO = { baixo: 0, esquerda: 90, cima: 180, direita: 270 };
    const dados = (t, camada) => ` data-arq="${String(t.arq || '').split('/').pop().replace(/\.\w+$/, '')}" data-pasta="${String(t.arq || '').split('/').slice(-3, -1).join('/')}" data-camada="${camada}" data-z="${t.z ?? ''}" data-blur="${t.blur || 0}"${t.sombra && typeof t.sombra === 'object' ? ` data-sombra="${t.sombra.x},${t.sombra.y},${t.sombra.blur},${t.sombra.op}"` : ''}${t.sat !== undefined ? ` data-sat="${t.sat}"` : ''}${t.luz !== undefined ? ` data-luz="${t.luz}"` : ''}${t.rastro ? ` data-rastro="${t.rastro.px ?? 10},${t.rastro.angulo || 0}"` : ''}${t.fundo || (camada === 'panorama' && (t.w || largura) >= 2000) ? ' data-fundo="1"' : ''}${t.contorno ? ' data-contorno="1"' : ''}${t.escurece ? ' data-escurece="1"' : ''}${t.mistura ? ` data-mistura="${t.mistura}"` : ''}${(t.blur || 0) >= 16 || t.mistura ? ' data-suave="1"' : ''}${t.anima ? ` data-anima='${JSON.stringify(t.anima)}'` : ''}`;
    const elemento = (t, left, top, classe, camada, filtro) => {
      const giro = `rotate(${t.rot || 0}deg)${t.espelho ? ' scaleX(-1)' : ''}`;
      const caixa = { left, top, width: t.w || largura, ...(t.h ? { height: t.h } : {}) };
      const resto = { opacity: PROF ? 1 : t.op ?? 1, ...(t.mistura && !PROF ? { mixBlendMode: t.mistura } : {}) };
      if (PROF || ETAPA < 3 || (!t.escurece && !t.rastro)) return `<img class="${classe}" src="imagens/${t.arq}" alt=""${dados(t, camada)} style="${estilo({ ...caixa, transform: giro, filter: filtro, ...resto })}">`;
      const e = t.escurece && { de: 'baixo', forca: 0.85, ate: 0.8, ...(t.escurece === true ? {} : t.escurece) };
      const alvo = e ? (typeof e.de === 'number' ? e.de : DIRECAO[e.de] ?? 0) : 0;
      const local = t.espelho ? (t.rot || 0) - alvo : alvo - (t.rot || 0);
      // Com `y0` e `y1` (alturas na tela: escuro em y0, limpo em y1), o degradê é medido no slide e não na caixa da peça:
      // serve para a peça girada que só mostra a ponta (a quina da moldura). Quem acerta é ajustarEscurece(), depois que
      // a imagem carrega e a altura dela é conhecida.
      const naTela = e && e.y0 !== undefined ? ` data-y0="${e.y0}" data-y1="${e.y1 ?? 0}" data-forca="${e.forca}" data-rot="${t.rot || 0}" data-espelho="${t.espelho ? 1 : 0}"` : '';
      // `de: 'bordas'`: a vinheta no próprio elemento (o dono, 11/11/2026: "vinheta no quadro também... meio que sumindo
      // no fundo"): limpo no `centro` (padrão '50% 45%') até a fração `ate`, e escurecendo até as bordas.
      const degrade = e && e.de === 'bordas'
        ? `radial-gradient(ellipse farthest-corner at ${e.centro || '50% 45%'}, rgba(0,0,0,0) ${Math.round((e.ate ?? 0.35) * 100)}%, rgba(0,0,0,${e.forca}) 100%)`
        : e ? `linear-gradient(${local}deg, rgba(0,0,0,${e.forca}) 0%, rgba(0,0,0,0) ${Math.round(e.ate * 100)}%)` : '';
      const dentro = `<img src="imagens/${t.arq}" alt="" style="display:block;width:100%${t.h ? ';height:100%' : ''}">${e ? `<div class="escurece"${naTela} style="background:${degrade};-webkit-mask-image:url('imagens/${t.arq}');mask-image:url('imagens/${t.arq}')"></div>` : ''}`;
      if (!t.rastro) return `<div class="${classe} grupo"${dados(t, camada)} style="${estilo({ ...caixa, transform: giro, filter: filtro, ...resto })}">${dentro}</div>`;
      const r = { px: 10, angulo: 0, ...t.rastro };
      rastros.add(r.px);
      return `<div class="${classe} grupo"${dados(t, camada)} style="${estilo({ ...caixa, transform: `rotate(${r.angulo}deg)`, filter: `url(#rastro-${r.px})`, ...resto })}"><div style="position:relative;transform:rotate(${(t.rot || 0) - r.angulo}deg)${t.espelho ? ' scaleX(-1)' : ''};filter:${filtro}">${dentro}</div></div>`;
    };
    // Vidro (11/11/2026, o dono: "os elementos de Claude flutuando podiam ser efeitos de vidro e bem desfocados. É só
    // elemento de composição"; "os efeitos desfocados devem desfocar o fundo junto"; e a referência dele, o aviso "Venda
    // aprovada" do post DXuCSZDHAfz): um aviso de vidro perto da lente, feito em código. Desfoca de verdade o que está
    // atrás dele (backdrop-filter), tem a borda mole (ele mesmo está fora de foco) e, dentro, o ícone (a faísca do
    // Claude num azulejo claro) e até duas linhas de texto, também fora de foco: dá para adivinhar, não é para ler.
    // { vidro: true, x, y, w, h, rot, raio, desfoque (o do fundo, 18), borda (a moleza da borda, 9), dentro (o desfoque
    //   do conteúdo, 5), icone (false tira), titulo, texto, tom: 'escuro' (sobre card escuro) ou 'claro', op, acima }.
    // Um por divisa. O desfoque do fundo só aparece onde há o que desfocar: ponha a ponta dele por cima de uma caixa ou
    // de uma borda (pode cobrir o fim de um texto, desde que dê para entender).
    const TOM_DO_VIDRO = {
      escuro: 'linear-gradient(140deg, rgba(255,255,255,.34) 0%, rgba(255,255,255,.16) 55%, rgba(255,255,255,.22) 100%)',
      claro: 'linear-gradient(140deg, rgba(255,255,255,.62) 0%, rgba(226,216,204,.42) 55%, rgba(255,255,255,.5) 100%)',
    };
    const vidro = (t, left, top, camada) => {
      const w = t.w || 420, h = t.h || w, raio = t.raio ?? Math.round(Math.min(w, h) * 0.3), mole = t.borda ?? 26, desf = t.desfoque ?? 16;
      const base = `left:${left}px;top:${top}px;width:${w}px;height:${h}px;transform:rotate(${t.rot || 0}deg);border-radius:${raio}px`;
      const dadosV = ` data-arq="vidro" data-pasta="vidro" data-camada="${camada}" data-z="${t.z ?? ''}" data-blur="${desf}" data-suave="1"`;
      if (PROF) return `<div class="travessa"${dadosV} style="${base};background:rgb(${Array(3).fill(Math.round(255 * cinzaDoMapa({ ...t, blur: desf }))).join(',')})"></div>`;
      if (ETAPA < 3) return '';
      const some = (g) => `linear-gradient(${g}deg, transparent 0, rgba(0,0,0,.5) ${Math.round(mole * 0.55)}px, #000 ${mole}px, #000 calc(100% - ${mole}px), rgba(0,0,0,.5) calc(100% - ${Math.round(mole * 0.55)}px), transparent 100%)`;
      const mascara = `${some(90)}, ${some(180)}`;
      const fundo = `blur(${desf}px) brightness(${t.brilho ?? (t.tom === 'claro' ? 1.0 : 1.18)}) saturate(1.3)`;
      const temTexto = !!(t.titulo || t.texto);
      const lado = Math.round(h * (temTexto ? 0.56 : 0.6));
      const raios = Array.from({ length: 12 }, (_, k) => `<rect x="46.5" y="5" width="7" height="${k % 2 ? 30 : 39}" rx="3.5" transform="rotate(${k * 30} 50 50)"/>`).join('');
      const icone = t.icone === false ? '' : `<div style="flex:none;width:${lado}px;height:${lado}px;border-radius:${Math.round(lado * 0.26)}px;background:linear-gradient(150deg,#fbf6ee,#efe4d4);display:grid;place-items:center"><svg viewBox="0 0 100 100" width="${Math.round(lado * 0.68)}" height="${Math.round(lado * 0.68)}" fill="#d97757">${raios}</svg></div>`;
      const tinta = t.tom === 'claro' ? '#26211b' : '#ffffff';
      const linhas = temTexto ? `<div style="min-width:0;display:flex;flex-direction:column;gap:${Math.round(h * 0.05)}px;color:${tinta};white-space:nowrap">${t.titulo ? `<b style="font-weight:700;font-size:${Math.round(h * 0.22)}px;line-height:1">${t.titulo}</b>` : ''}${t.texto ? `<span style="font-weight:400;font-size:${Math.round(h * 0.17)}px;line-height:1;opacity:.86">${t.texto}</span>` : ''}</div>` : '';
      return `<div class="travessa placa-fora-de-foco"${dadosV} style="${base};opacity:${t.op ?? 1}"><div class="vidro-fundo" style="border-radius:${raio}px;background:${TOM_DO_VIDRO[t.tom] || TOM_DO_VIDRO.escuro};-webkit-backdrop-filter:${fundo};backdrop-filter:${fundo};-webkit-mask-image:${mascara};mask-image:${mascara}"></div><div class="vidro-dentro" style="gap:${Math.round(h * 0.16)}px;padding:0 ${Math.round(h * (temTexto ? 0.2 : 0))}px;justify-content:${temTexto ? 'flex-start' : 'center'};filter:blur(${t.dentro ?? 6}px)">${icone}${linhas}</div></div>`;
    };
    const panorama = s.semPanorama ? '' : listaDe(C.panorama).map(comProfundidade).map((p) => (p.vagalume ? vagalume(p, p.x - dx - j, p.y - j) : elemento(p, (p.x || 0) - dx - j, (p.y || 0) - j, 'panorama', 'panorama',
      PROF ? `brightness(0) invert(${cinzaDoMapa(p).toFixed(2)})` : [p.blur && ETAPA >= 3 ? `blur(${p.blur}px)` : '', ...corDe(p)].filter(Boolean).join(' ') || 'none'))).join('');
    const todas = s.semTravessia ? [] : listaDe(C.travessia);
    // Luz por cima (11/11/2026, a camada 4 da capa do Van Gogh): { halo: true, x, y (o centro), d (o diâmetro), cor, op }.
    // Vai numa camada própria em modo tela, que clareia o que está embaixo (o assunto, o título, o fundo).
    // A receita do dono (11/11/2026): "uma bola desfocada na cor do fundo (amarelo na maioria das vezes), com o centro
    // dela um amarelo mais claro. Muda o modo de mesclagem pra tela, ou divisão, ou sobrepor. Diminui a opacidade...
    // aumenta o desfoque se precisar pra ficar sutil." `cor` é o centro, `borda` a cor do fundo, `mistura` o modo
    // ('screen', 'overlay', 'color-dodge', 'soft-light'; o 'overlay' e o 'soft-light' deixam o preto e o branco como
    // estão, o efeito do blend-if do Photoshop) e `blur` o desfoque. Uma camada por modo, presa na janela (a luz não vaza
    // para a moldura preta).
    const bola = (t) => `<div class="halo-luz" data-modo="${t.mistura || 'screen'}" data-op="${t.op ?? 0.5}" style="${estilo({ left: t.x - dx - j - (t.d || 900) / 2, top: t.y - j - (t.d || 900) / 2, width: t.d || 900, height: t.d || 900, opacity: t.op ?? 0.5, filter: t.blur && ETAPA >= 3 ? `blur(${t.blur}px)` : 'none', background: t.borda ? `radial-gradient(circle, ${t.cor || '#fff4b0'} 0%, ${t.borda} 42%, transparent 70%)` : `radial-gradient(circle, ${t.cor || '#fff1c2'} 0%, transparent 68%)` })}"></div>`;
    const modos = [...new Set(todas.filter((t) => t.halo).map((t) => t.mistura || 'screen'))];
    const halos = modos.map((m) => `<div class="camada c-luz" style="mix-blend-mode:${m}">${todas.filter((t) => t.halo && (t.mistura || 'screen') === m).map(bola).join('')}</div>`).join('');
    const pecas = todas.filter((t) => !t.halo).map((t) => (t.vidro ? t : comProfundidade(t)));
    // No mapa de profundidade, cada elemento leva o número da distância escrito em cima.
    const rotulo = (t) => (MAPA === 'desfoque' ? `${t.blur ? `desfoque ${t.blur}` : 'nítido'}${t.rastro ? ` · rastro ${t.rastro.px ?? 10}` : ''}` : `z ${t.z ?? 0}${t.blur ? ` · desfoque ${t.blur}` : ''}${t.sombra ? ' · sombra' : ''}`);
    const marca = (t) => (PROF && !t.vagalume ? `<div class="rotulo-z" style="${estilo({ left: t.x - dx + (t.w || 0) / 2 - 60, top: Math.max(8, Math.min(1300, t.y + (t.w || 0) * 0.3)) })}">${rotulo(t)}</div>` : '');
    const travessa = (t) => (t.vagalume ? (PROF ? '' : vagalume(t, t.x - dx, t.y)) : (t.vidro ? vidro(t, t.x - dx, t.y, t.acima ? 'acima' : 'travessia') : elemento(t, t.x - dx, t.y, 'travessa', t.acima ? 'acima' : 'travessia', filtroDaTravessia(t))) + marca(t));
    const travessia = pecas.filter((t) => !t.acima).map(travessa).join('');
    const acima = pecas.filter((t) => t.acima).map(travessa).join('');
    // Os filtros do rastro (o desfoque só num eixo; o elemento gira para o eixo cair na direção do voo).
    const defs = rastros.size ? `<svg width="0" height="0" style="position:absolute"><defs>${[...rastros].map((px) => `<filter id="rastro-${px}" x="-80%" y="-80%" width="260%" height="260%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${px} 0"/></filter>`).join('')}</defs></svg>` : '';
    return { panorama, travessia, acima, luz: halos, defs };
  }

  // Monta o slide: dentro da janela (0, 1, título de trás, 2) e por cima (3, 4). O carrossel infinito põe o panorama na
  // camada 0 e a travessia por cima da moldura (entre a 3 e a 4; com `acima`, depois da 4).
  function montar(tema, partes) {
    // partes.classe: classe a mais no slide (ex.: 'sangra', a capa até a borda, sem a moldura preta; 05/11/2026).
    const larga = telaLarga(partes);
    const infinito = (larga.travessia || larga.acima || larga.luz ? ' larga' : '') + (PROF ? ' profundidade' : '') + (MAPA ? ` mapa-${MAPA}` : '');
    // `vars` no slide: troca as cores do tema só nele (ex.: { acento: '#5c1d00' }, o destaque escuro sobre o laranja
    // pintado, onde o laranja do tema some).
    const sv = ((window.CARROSSEL || {}).slides || [])[n - 1] || {};
    const vars = sv.vars ? ` style="${Object.entries(sv.vars).map(([k, v]) => `--${k}:${v}`).join(';')}"` : '';
    return `<div class="slide tema-${tema} etapa-${ETAPA}${infinito}${partes.classe ? ` ${partes.classe}` : ''}${SO ? ` so so-${SO}` : ''}${ATE ? ` ate ate-${ATE}` : ''}"${vars}>
      ${larga.defs || ''}<div class="janela">
        <div class="camada c0">${partes.c0 || ''}${larga.panorama}</div>
        <div class="camada c1">${partes.c1 || ''}</div>
        ${sv.vinheta && ETAPA >= 3 && !MAPA ? `<div class="vinheta" style="background:radial-gradient(ellipse farthest-corner at ${sv.vinheta.centro || '50% 50%'}, rgba(0,0,0,0) ${Math.round((sv.vinheta.de ?? 0.4) * 100)}%, rgba(0,0,0,${sv.vinheta.forca ?? 0.7}) 100%)"></div>` : ''}
        <div class="camada c-titulo">${partes.atras || ''}</div>
        <div class="camada c2">${partes.c2 || ''}</div>
        ${sv.cantos && ETAPA >= 3 ? `<div class="cantos" style="--cantos-blur:${sv.cantos.blur ?? 7}px;--cantos-de:${Math.round((sv.cantos.de ?? 0.58) * 100)}%"></div>` : ''}
      </div>
      <div class="camada c3">${partes.c3 || ''}</div>
      ${larga.travessia ? `<div class="camada c-trav">${larga.travessia}</div>` : ''}
      ${larga.luz || ''}
      <div class="camada c4">${partes.c4 || ''}</div>
      ${larga.acima ? `<div class="camada c-trav acima">${larga.acima}</div>` : ''}
      <div class="camada c5">${partes.c5 || ''}</div>
      ${poeira()}<div class="meio-tom"></div><div class="grao"></div>
    </div>`;
  }

  // Poeirinhas da etapa 5: pontos de tamanhos diferentes e um ou outro fiapo, sempre os mesmos em cada slide (a semente é o
  // nome e o número). Ficam fora do miolo, onde está o texto pequeno.
  function poeira() {
    // `poeiraDe` no slide: sorteia como outra peça (a capa aprovada reaproveitada fica igual no pixel).
    const semente = ((window.CARROSSEL && window.CARROSSEL.slides[n - 1]) || {}).poeiraDe || nome;
    let r = [...semente].reduce((a, c) => a + c.charCodeAt(0), n * 97);
    const sorte = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    const fora = ((window.CARROSSEL && window.CARROSSEL.slides[n - 1]) || {}).semPoeira || [];
    const longe = (x, y) => x > 25 && x < 975 && y > 125 && y < 1245 && !(x > 150 && x < 850 && y > 260 && y < 1010) &&
      !fora.some(([fx, fy, fw, fh]) => x + 40 > fx && x + 40 < fx + fw && y + 40 > fy && y + 40 < fy + fh);
    let svg = '';
    for (let i = 0; i < 44; i++) {
      const x = sorte() * 1000, y = sorte() * 1270, t = 0.7 + sorte() ** 3 * 1.7, op = 0.22 + sorte() * 0.36;
      if (longe(x, y)) svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${t.toFixed(2)}" opacity="${op.toFixed(2)}"/>`;
    }
    for (let i = 0; i < 4; i++) {
      const x = sorte() * 1000, y = sorte() * 1270, dx = 8 + sorte() * 16, dy = -6 + sorte() * 12;
      if (longe(x, y)) svg += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}q${(dx / 2).toFixed(1)} ${(dy * 2).toFixed(1)} ${dx.toFixed(1)} ${dy.toFixed(1)}" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.4"/>`;
    }
    return `<svg class="poeira" viewBox="0 0 1000 1270" fill="currentColor">${svg}</svg>`;
  }

  // ---------------------------------------------------------------- provas dos slides de dentro (uma por slide)
  const PROVAS = {
    // Conversa com o Claude: o pedido (bolha) e a resposta (com o ícone do app).
    conversa: (p) => `<div class="cartao conversa">
        <div class="msg eu">${p.eu}</div>
        <div class="msg ia"><span class="app-mini">${simboloClaude()}</span><div>${p.ia}</div></div>
      </div>`,
    // Dois números lado a lado: o que importa (laranja) e a comparação (apagado). semX: quando não é comparação.
    numeros: (p) => `<div class="numeros">${p.itens.map((it) => `<div class="num ${it.fraco ? 'fraco' : ''}"><b${p.tam ? ` style="font-size:${p.tam}px"` : ''}>${it.v}</b><span>${it.t}</span></div>`).join(p.semX ? '' : '<i class="versus">x</i>')}</div>${p.pe ? `<div class="pe-prova">${p.pe}</div>` : ''}`,
    // Lista curta num cartão (as pautas do radar, com o calor).
    lista: (p) => `<div class="cartao lista">${p.itens.map((it) => `<div class="item-lista"><span class="calor">${it.calor}</span><div><h4>${it.t}</h4><p>${it.fonte}</p></div></div>`).join('')}</div>`,
    // Notificações empilhadas com "+" entre elas (como as vendas aprovadas dos carrosséis da agência).
    // Animada: cada aviso cai no seu tempo (p.de, p.passo), como chegando no celular.
    notificacoes: (p) => {
      const de = p.de ?? 0.22, passo = p.passo ?? 0.2;
      const aviso = (nt, k) => { const v = ap(de + k * passo, 0.08); return notificacao(nt, 'na-pilha', ANIMA ? `opacity:${v};transform:translateY(${(1 - v) * -40}px) scale(${0.94 + 0.06 * v})` : ''); };
      const mais = (k) => `<span class="mais"${ANIMA ? ` style="opacity:${ap(de + k * passo + passo * 0.6, 0.06)}"` : ''}>+</span>`;
      return `<div class="pilha-avisos">${p.itens.map((nt, k) => (k ? mais(k - 1) : '') + aviso(nt, k)).join('')}</div>`;
    },
    // Uma imagem num cartão (print, arte, capa), com a legenda numa pílula embaixo. `arq` em imagens/ ou caminho relativo.
    imagem: (p) => `<figure class="prova-imagem ${p.sem_moldura ? 'sem-moldura' : ''}" style="width:${p.w || 600}px;transform:rotate(${p.rot || 0}deg)">
        <img src="${caminhoImg(p.arq)}" alt="">${p.legenda ? `<figcaption>${p.legenda}</figcaption>` : ''}
      </figure>`,
    // Duas imagens lado a lado com "x" no meio: a comparação (o que importa em cor, a outra apagada).
    'versus-imagens': (p) => `<div class="versus-imagens">${p.itens.map((it) => `<figure class="${it.fraco ? 'fraco' : ''}"><img src="${caminhoImg(it.arq)}" alt=""><figcaption>${it.legenda}</figcaption></figure>`).join('<i class="versus">x</i>')}</div>`,
    // Os slides de um carrossel em leque (o do meio na frente), como quem arrasta no Instagram.
    galeria: (p) => `<div class="galeria">${p.itens.map((arq, k) => `<img class="g${k}" src="${caminhoImg(arq)}" alt="">`).join('')}</div>${p.legenda ? `<div class="pe-prova">${p.legenda}</div>` : ''}`,
    // O mini curso: cartão com a imagem, o nome, o que tem dentro e o preço.
    oferta: (p) => `<div class="cartao oferta">
        ${p.imagem ? `<img class="oferta-img" src="${caminhoImg(p.imagem)}" alt="">` : ''}
        <div class="oferta-corpo">
          <small>${p.selo || 'mini curso'}</small>
          <h4>${p.titulo}</h4>
          <ul>${(p.itens || []).map((t) => `<li>${t}</li>`).join('')}</ul>
          <div class="oferta-preco">${p.de ? `<s>${p.de}</s>` : ''}<b>${p.preco}</b>${p.pe ? `<span>${p.pe}</span>` : ''}</div>
        </div>
      </div>`,
    // Um curso do combo (09/11/2026, carrossel "Todos meus cursos por R$ 97"): a capa larga do curso no alto com a
    // etiqueta do Comenta X ("comenta CURSO", pedido do dono: "uma CTA em uma tag em todos"), o nome, os números em
    // pílulas e o preço cheio riscado. `capa` em imagens/; sem capa, `capaTexto` desenha uma capa só de letra.
    curso: (p) => `<div class="cartao curso">
        <div class="curso-capa">${p.capa ? `<img src="${caminhoImg(p.capa)}" alt="">` : `<div class="curso-capa-texto"><div>${p.capaTexto || p.nome}</div></div>`}
          ${p.tag ? `<span class="curso-tag">${p.tag}</span>` : ''}</div>
        <div class="curso-corpo">
          <h4>${p.nome}</h4>
          ${p.numeros && p.numeros.length ? `<div class="curso-numeros">${p.numeros.map((n) => `<span>${n}</span>`).join('')}</div>` : ''}
          ${p.de || p.preco ? `<div class="curso-preco">${p.de ? `<s>${p.de}</s>` : ''}${p.preco ? `<b>${p.preco}</b>` : ''}</div>` : ''}
        </div>
      </div>`,
    // Amostra de fonte (30/10/2026): a frase escrita na própria fonte sobre um fundo, e embaixo o nome e o clima.
    fonte: (p) => `<div class="amostra-fonte">
        <div class="af-quadro" style="${p.fundo ? `background-image:url('${caminhoImg(p.fundo)}');` : ''}color:${p.cor || '#fff'}"><span style="font-family:'${p.familia}';font-size:${p.tam || 130}px;font-weight:${p.peso || 400};font-style:${p.italico ? 'italic' : 'normal'};line-height:${p.linha || 1}">${p.amostra}</span></div>
        <div class="af-pe"><b>${p.familia}</b><span>${p.clima}</span></div>
      </div>`,
    // Combinação de cores (30/10/2026): as duas cores uma sobre a outra, com o nome na cor da outra e o código na pílula.
    combo: (p) => {
      const quadro = (c, o) => `<div class="cc-quadro" style="background:${c.hex};color:${o.hex}"><b>${c.nome}</b><span style="background:${o.hex};color:${c.hex}">${c.hex}</span></div>`;
      return `<div class="combo-cores">${quadro(p.a, p.b)}<p>${p.clima}</p>${quadro(p.b, p.a)}</div>`;
    },
    // Grade de 4 imagens (30/10/2026): os fundos de uma família, com um toque de cada.
    grade: (p) => `<div class="grade-fundos">${p.itens.map((arq) => `<img src="${caminhoImg(arq)}" alt="">`).join('')}</div>`,
    // Exemplo de verdade (30/10/2026): a dica aplicada num quadro, com fundo de cor (`cor`) ou imagem (`fundo`), e a legenda embaixo.
    // p.w e p.h trocam o tamanho do quadro (ex.: 380 x 475 para parecer uma capa de post em 4:5).
    exemplo: (p) => `<div class="exemplo-quadro" style="${p.fundo ? `background-image:url('${caminhoImg(p.fundo)}');` : `background:${p.cor};`}color:${p.tinta || '#fff'}${p.w ? `;width:${p.w}px` : ''}${p.h ? `;height:${p.h}px` : ''}">${p.html}</div>${p.legenda ? `<div class="pe-prova">${p.legenda}</div>` : ''}`,
    // Lista de feitos, com o visto laranja (o que a pessoa passa a ter).
    // Animada: cada linha entra e o visto "estala" logo depois.
    checklist: (p) => {
      const de = p.de ?? 0.22, passo = p.passo ?? 0.16;
      return `<div class="cartao checklist">${p.itens.map((t, k) => {
        const v = ap(de + k * passo), vi = ap(de + k * passo + 0.06, 0.06);
        return `<div class="item-check"${ANIMA ? ` style="opacity:${0.15 + 0.85 * v};transform:translateX(${(1 - v) * 30}px)"` : ''}><i${ANIMA ? ` style="transform:scale(${vi < 1 ? 0.5 + vi * 0.62 : 1});opacity:${vi}"` : ''}>${VISTO}</i><span>${t}</span></div>`;
      }).join('')}</div>`;
    },
    // A mesma frase antes (riscada, com cara de IA) e depois (do jeito da pessoa), uma embaixo da outra.
    'antes-depois': (p) => `<div class="antes-depois"><div class="cartao ad antes"><small>${p.rotuloAntes || 'com cara de IA'}</small><p>${p.antes}</p></div><i class="seta-ad"><svg viewBox="0 0 24 24"><path d="M12 4v15m-6-6 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></i><div class="cartao ad depois"><small>${p.rotuloDepois || 'do seu jeito'}</small><p>${p.depois}</p></div></div>`,
    // Duas colunas lado a lado (o que passa pra IA x o que fica com você); `destaque` pinta a coluna que importa.
    colunas: (p) => `<div class="colunas">${p.colunas.map((c) => `<div class="cartao coluna${c.destaque ? ' destaque' : ''}"><small>${c.titulo}</small>${c.itens.map((t) => `<div>${t}</div>`).join('')}</div>`).join('')}</div>`,
    // Palavras riscadas (as que ninguém fala).
    riscadas: (p) => `<div class="riscadas">${p.itens.map((t) => `<span>${t}</span>`).join('')}</div>${p.pe ? `<div class="pe-prova">${p.pe}</div>` : ''}`,
    // Barras deitadas com o valor escrito (perdas por área); `p` é o tamanho da barra (0 a 1); `sobe` pinta de verde.
    barras: (p) => `<div class="cartao barras">${p.itens.map((it) => `<div class="barra-item${it.sobe ? ' sobe' : ''}"><div class="barra-topo"><span>${it.t}</span><b>${it.v}</b></div><i style="width:${Math.round((it.p ?? 1) * 100)}%"></i></div>`).join('')}</div>${p.pe ? `<div class="pe-prova">${p.pe}</div>` : ''}`,
    // Um arquivo de verdade aberto (a skill, um prompt): nome do arquivo em cima e as linhas em mono.
    // Animado: as linhas vão sendo escritas, uma depois da outra (como o Claude gravando o arquivo).
    codigo: (p) => {
      const de = p.de ?? 0.2, passo = p.passo ?? 0.07;
      return `<div class="cartao codigo"><div class="codigo-topo"><i></i><i></i><i></i><span>${p.arquivo}</span></div><pre${p.tam ? ` style="font-size:${p.tam}px"` : ''}>${p.linhas.map((l, k) => `<span class="${/^#/.test(l) ? 'cab' : /^---/.test(l) ? 'reg' : /^[a-z_]+:/.test(l) ? 'chave' : /^\s*[-0-9]/.test(l) ? 'item' : ''}"${ANIMA ? ` style="opacity:${ap(de + k * passo, 0.05)}"` : ''}>${l}</span>`).join('\n')}</pre></div>`;
    },
    // A mesma peça passando pelas etapas (04/11/2026): uma imagem por vez, a seguinte entrando como uma cortina da
    // esquerda para a direita (com a linha da emenda), e as pílulas embaixo acendendo a etapa da vez. Parada (T = 1),
    // mostra a última. `itens: [{ arq, legenda }]`, `w` e `h` o tamanho do quadro (h padrão: 4:5).
    etapas: (p) => {
      const n = p.itens.length, de = p.de ?? 0.16, ate = p.ate ?? 0.78, w = p.w || 480, h = p.h || Math.round(w * 1.25);
      const inicio = (k) => de + (k * (ate - de)) / Math.max(1, n - 1);
      const passou = (k) => (k === 0 ? 1 : ANIMA ? ap(inicio(k) - 0.06, 0.12) : 1);
      const ativa = (k) => (ANIMA ? T >= inicio(k) - 0.04 && (k === n - 1 || T < inicio(k + 1) - 0.04) : k === n - 1);
      const imgs = p.itens.map((it, k) => {
        const v = passou(k);
        const corte = k && v < 1 ? `;clip-path:inset(0 ${((1 - v) * 100).toFixed(2)}% 0 0)` : '';
        return `<img src="${caminhoImg(it.arq)}" alt="" style="opacity:${k && v === 0 ? 0 : 1}${corte}">${k && v > 0 && v < 1 ? `<i class="etapas-emenda" style="left:${(v * 100).toFixed(2)}%"></i>` : ''}`;
      }).join('');
      return `<div class="etapas-prova">
          <div class="etapas-quadro" style="width:${w}px;height:${h}px">${imgs}</div>
          <div class="etapas-pilulas">${p.itens.map((it, k) => `<span class="${ativa(k) ? 'acesa' : ''}">${it.legenda}</span>`).join('')}</div>
        </div>`;
    },
    // Linha do tempo de um programa de animação (camadas, quadros-chave e a agulha), que anda com T: é o card animado.
    // Parado (T = 1), mostra tudo montado e o relógio em "minutos".
    'linha-do-tempo': (p) => {
      const x = Math.min(T / 0.8, 1), agulha = x * x * (3 - 2 * x); // anda devagar no começo e no fim (como um motion de verdade)
      const camadas = p.camadas.map((c, k) => {
        const largura = Math.max(0, Math.min(1, (agulha - c.de) / (c.ate - c.de)));
        const chaves = (c.chaves || []).map((x) => `<i class="chave ${agulha >= x ? 'acesa' : ''}" style="left:${x * 100}%"></i>`).join('');
        return `<div class="faixa-camada" style="opacity:${0.25 + 0.75 * surge(0.04 + k * 0.05, 0.1)}"><span class="nome">${c.nome}</span><div class="trilha"><b style="left:${c.de * 100}%;width:${(c.ate - c.de) * largura * 100}%;background:${c.cor}"></b>${chaves}</div></div>`;
      }).join('');
      const fim = surge(0.84, 0.1);
      return `<div class="cartao linha-tempo">
          <div class="lt-topo"><span>${p.projeto || 'card-animado.mp4'}</span><span class="tempo">00:${String(Math.round(agulha * (p.segundos || 6))).padStart(2, '0')}</span></div>
          <div class="lt-regua">${Array.from({ length: 7 }, (_, i) => `<span>${i}s</span>`).join('')}</div>
          <div class="lt-faixas">${camadas}<i class="agulha" style="left:calc(150px + (100% - 150px) * ${agulha})"></i></div>
        </div>
        <div class="lt-relogio" style="opacity:${fim};transform:translateY(${(1 - fim) * 24}px)"><s>${p.antes || '3 a 5 horas'}</s><b>${p.depois || 'minutos'}</b></div>`;
    },
    // A capa de verdade desmontada: cada plano é uma camada real da capa (exportada pelo scripts/carrossel.mjs com
    // &so=), de baixo para cima, com o mesmo espaço entre elas; o nome fica à direita, ligado por uma linha (alinhar()).
    camadas: (p) => {
      const pasta = p.pasta || `../../_local/carrossel/${nome}/camadas`;
      const total = p.camadas.length, passo = p.passo || 106, topo0 = p.topo ?? -70;
      return `<div class="explodida">
          ${p.camadas.map((c, k) => `<div class="plano-real ${k === 0 ? 'base' : 'vazio'}" data-plano="${k}" style="top:${topo0 + (total - 1 - k) * passo}px"><img src="${pasta}/${c.arq}.png" alt=""></div>`).join('')}
          ${p.camadas.map((c, k) => `<i class="linha-camada" data-plano="${k}"></i><div class="nome-camada" data-plano="${k}"><b>${c.nome}</b><small>${c.desc}</small></div>`).join('')}
        </div>`;
    },
  };

  // ---------------------------------------------------------------- tipos de slide
  const TIPOS = {
    // Slide pronto, feito fora do modelo: a capa e a chamada "cinema" (templates/capa-cinema, 24/10/2026), já em
    // 1080 x 1350. Entra inteiro, sem moldura nem efeito por cima.
    foto: (s) => `<img src="${caminhoImg(s.arq)}" alt="" style="position:absolute;left:0;top:0;width:1080px;height:1350px;display:block">`,
    // Capa num eixo só (o centro): linha de cima, palavra grande atrás do assunto (a letra de floreio POR CIMA da
    // condensada) e linha de baixo também atrás. As linhas de cima e de baixo se alinham à borda direita da palavra
    // grande (alinhar()), como nas capas da agência. Na frente, a notificação no estilo iOS com o símbolo do app.
    // Efeitos (etapa 3): desfoque progressivo no fim da palavra, com brilho; desfoque no que está perto da câmera;
    // luz de fundo em modo tela (a fonte da luz de recorte da foto); pétalas voando. O selo "calango" aponta o que importa.
    capa(s, tema, ctx) {
      const t = s.titulo;
      const FOLGA = 170; // margem em volta do título para o desfoque, o brilho e o floreio não serem cortados
      const enc = t.encaixe ?? -0.1;
      // Palavra com acento (AUTOMÁTICO): a letra com recorte de texto só pinta dentro da caixa, e a linha de 0,86 corta
      // o acento. `folgaTopo` (em) abre espaço em cima sem mexer no lugar da palavra. Vale também para o `antes` e para
      // letra de topo redondo em tamanho grande (o 3, o G e o S de "3 REGRAS" saíam com o topo cortado reto, 08/11/2026).
      const ft = t.folgaTopo || 0;
      // `scriptForte`: engrossa o floreio quando ele some ao lado da condensada (o C fino de COMBOS se lia como enfeite).
      const linha = `<div class="linha" style="padding:${FOLGA}px">${t.script ? `<span class="script" style="font-family:'${t.fonteScript || 'Calango Signature'}',cursive;font-size:${t.scriptTam}px;margin-right:calc(${enc}em - 0.4em)${t.scriptForte ? `;-webkit-text-stroke:${t.scriptForte}px ${t.scriptCor || '#ff9a00'}` : ''}">${t.script}</span>` : ''}<span class="condensada" style="font-size:${t.tam}px${t.fonte1 ? `;font-family:'${t.fonte1}',cursive;text-transform:none;line-height:1;padding:.3em .3em;margin:-.3em -.3em` : ''}${t.cor1 ? `;background:radial-gradient(rgba(0,0,0,.05) 30%,transparent 34%) 0 0/4.5px 4.5px,${t.cor1};-webkit-background-clip:text;background-clip:text` : ''}${ft ? `;padding-top:${ft}em;margin-top:-${ft}em` : ''}">${t.condensada}</span>${t.antes ? `<span class="condensada" style="order:-1;font-size:${t.tam}px;margin-right:0.18em${ft ? `;padding-top:${ft}em;margin-top:-${ft}em` : ''}">${t.antes}</span>` : ''}</div>`;
      // `antes`: parte da palavra grande que vem antes do floreio ("30" + D cursivo + "IAS"). Fica depois no HTML e vai para
      // a frente pelo flex, para a âncora das linhas e do selo continuar sendo a condensada principal.
      const perfil = perfilFoco(t.foco);
      const maior = Math.max(t.foco?.esq ?? 7, t.foco?.dir ?? 14);
      const brilhoMascara = `linear-gradient(90deg, ${Array.from({ length: 21 }, (_, i) => i / 20).map((x) => `rgba(0,0,0,${(perfil(x) / maior).toFixed(3)}) calc(${FOLGA}px + ${x * 100}% - ${x * 2 * FOLGA}px)`).join(', ')})`;
      // `dx`: tira o título do centro matemático quando o floreio puxa o olho para um lado (o S da skill).
      // `cor` e `corScript` trocam a cor do título neste slide (título escuro no amarelo vivo); o título não tem sombra ("sombra é feio", 30/10/2026); `semSombra: false` só para as capas antigas já aprovadas.
      const titulo = `<div class="titulo-capa${t.semSombra !== false ? ' sem-sombra' : ''}"${t.bloco ? ` data-bloco="${t.bloco}" data-vao="${t.vao ?? 8}"` : ''} style="top:${t.y - JANELA - FOLGA}px${t.dx ? `;margin-left:${t.dx}px` : ''}${t.cor ? `;--titulo:${t.cor}` : ''}${t.corScript ? `;--script:${t.corScript}` : ''}">
          <div class="brilho-titulo" style="-webkit-mask-image:${brilhoMascara};mask-image:${brilhoMascara}">${linha}</div>
          <div class="progressivo">${progressivo(linha, perfil, { folga: FOLGA, angulo: t.foco?.angulo ?? 90 })}</div>
        </div>`;
      // Lado 'centro': a linha centraliza na palavra inteira (floreio e condensada), não só na condensada.
      // Palavra comprida em duas linhas (`linha2`: Hand / written), a segunda logo abaixo, com tamanho (`tam2`) e cor (`cor2`) próprios.
      const tam2 = t.tam2 || t.tam;
      // `fonte2`: a segunda linha em outra fonte, sem caixa alta (o "written" escrito à mão, de verdade).
      const linha2 = `<div class="linha" style="padding:${FOLGA}px"><span class="condensada" style="font-size:${tam2}px${t.fonte2 ? `;font-family:'${t.fonte2}',cursive;text-transform:none;line-height:1;padding:.3em .3em;margin:-.3em -.3em` : ''}${t.cor2 ? (t.cor2.startsWith('linear') ? `;background:radial-gradient(rgba(0,0,0,.05) 30%,transparent 34%) 0 0/4.5px 4.5px,${t.cor2};-webkit-background-clip:text;background-clip:text` : `;background:none;-webkit-text-fill-color:${t.cor2};color:${t.cor2}`) : ''}">${t.linha2}</span></div>`;
      const titulo2 = t.linha2 ? `<div class="titulo-capa titulo-capa-2${t.semSombra !== false ? ' sem-sombra' : ''}" style="top:${(t.y2 ?? t.y + t.tam * 0.98) - JANELA - FOLGA}px${t.dx2 ? `;margin-left:${t.dx2}px` : ''}"><div class="progressivo">${progressivo(linha2, t.foco2 ? perfilFoco(t.foco2) : perfil, { folga: FOLGA })}</div></div>` : '';
      // lado 'meio': centrado na palavra condensada (sem o floreio), que é onde o olho vê o centro (05/11/2026).
      const ancora = (lado, posicao, espaco) => `data-ancora="${t.linha2 && posicao === 'abaixo' ? '.titulo-capa-2' : '.titulo-capa'} .progressivo .condensada"${lado === 'centro' ? ' data-centro=".titulo-capa .progressivo .linha"' : lado === 'meio' ? ' data-centro=".titulo-capa .progressivo .condensada"' : ''} data-lado="${lado === 'meio' ? 'centro' : lado}" data-posicao="${posicao}" data-espaco="${espaco}"`;
      // `posFrente`: o texto pequeno de baixo ("um designer") fica na frente do assunto, e o assunto pode passar por cima
      // da headline sem esconder o texto (o Van Gogh do dono, 11/11/2026: o chapéu cobre o pé do CONTRATE e o "um
      // designer" fica por cima do chapéu).
      // `posFonte` e `posCor`: o texto pequeno noutra fonte ("um designer" na Calango Signature, 11/11/2026).
      const posTitulo = t.pos ? `<div class="pos-titulo${t.posFrente ? ' na-frente' : ''}" style="font-size:${t.posTam || 56}px${t.posFonte ? `;font-family:'${t.posFonte}',cursive;font-weight:400;letter-spacing:0` : ''}${t.posCor ? `;color:${t.posCor}` : ''}" ${ancora(t.posLado || 'direita', 'abaixo', t.posEspaco ?? 4)}>${t.pos}</div>` : '';
      const n = s.notificacao;
      return montar(tema, {
        classe: s.sangra ? 'sangra' : '',
        c0: `${camada0(s)}${fundoFoto(s)}${luzFundo(s.luz)}${blocosMescla(s)}`,
        c1: camada1(s),
        atras: `${reguasAtras(s)}${titulo}${titulo2}
          <div class="pre-titulo" ${ancora(t.preLado || 'direita', 'acima', t.preEspaco ?? 6)}>${t.pre}</div>
          ${t.pos && !t.posFrente ? posTitulo : ''}`,
        c2: `${s.assunto ? assuntoFoto(s.assunto) : ''}${folhas((s.nevoa || []).map((f) => ({ ...f, x: f.x - JANELA, y: f.y - JANELA })))}`,
        c3: `${folhas(s.folhas)}${bokeh(s.bokeh)}${n ? notificacao(n, '', `top:${n.y}px;${n.w ? `width:${n.w}px;` : ''}${n.x != null ? `left:${n.x}px;transform:none;` : ''}`) : ''}${(s.blocos || []).map((b) => BLOCOS[b.tipo](b)).join('')}${s.assinatura ? `<div class="assinatura-capa" style="top:${s.assinatura.y ?? 1226}px;font-size:${s.assinatura.tam ?? 44}px;opacity:${s.assinatura.op ?? 0.15}">${s.assinatura.texto}</div>` : ''}`,
        // s.assinatura: a linha miúda embaixo, no meio, na Calango Signature, quase apagada (o dono, 11/11/2026: "embaixo,
        // com a fonte Calango Signature, pode escrever com opacidade 15%, Feito no Claude, por Calango. Pequeno, no meio,
        // só pra não ficar vazio"). { texto, y, tam, op }.
        // s.semRegua: capa sem a régua (para recortar a capa de perto como prova de outro slide, ex.: as etapas).
        c4: `${cromo()}${topo(ctx.marca)}${s.reguasAtras || s.semRegua ? '' : reguas()}${s.selo ? selo(s.selo) : ''}${t.posFrente ? posTitulo : ''}`,
        // s.frente: o que fica entre a lente e tudo o mais (a folha desfocada da própria foto, por cima da régua e do
        // cabeçalho), em coordenadas da página. Pedido do dono em 05/11/2026: "dar sensação de profundidade".
        // `dentro: true`: fica por cima da régua, mas cortado pela moldura (a folha da cena). Sem ele, o objeto pode
        // sair da moldura sobre o preto (o que encosta na lente: o cartucho, a letra).
        c5: frente(s),
      });
    },

    // Miolo: o slide de dentro, no padrão dos carrosséis do perfil. Um assunto só, centralizado, com muito respiro:
    // rótulo pequeno, frase, texto curto e UMA prova (conversa, números, lista, notificações ou camadas). Sem régua e
    // sem efeito solto; a linha de baixo mostra em que ponto do carrossel a pessoa está.
    miolo(s, tema, ctx) {
      ANIMA = !!s.anima;
      const p = s.prova ? PROVAS[s.prova.tipo](s.prova) : '';
      // Card animado (s.anima): o rótulo, o título e o texto entram em sequência, subindo um pouco (T de 0 a 1).
      // `animaTexto: false`: o rótulo, o título e o texto já estão na tela no primeiro quadro (só a prova anima), para o
      // vídeo em loop nunca apagar o que a pessoa está lendo (revisor, 04/11/2026).
      const entra = (de) => (s.anima && s.animaTexto !== false ? ` style="opacity:${suave(surge(de, 0.09))};transform:translateY(${(1 - suave(surge(de, 0.09))) * 26}px)"` : '');
      return montar(tema, {
        c0: camada0({ luzX: '50%', luzY: '0%', ...s }),
        c1: camada1(s),
        c3: `${folhas(s.folhas)}${bokeh(s.bokeh)}`,
        c4: `${cromo()}${topo(ctx.marca)}
          <div class="miolo${s.lado === 'esquerda' || s.lado === 'direita' ? ` ${s.lado}` : ''}${s.alto ? ' alto' : ''}">
            ${s.rotulo ? `<div class="rotulo-miolo ${s.vocativo ? 'vocativo' : ''}"${entra(0)}>${s.rotulo}</div>` : ''}
            ${s.titulo ? `<h2 class="t-miolo"${entra(0.05)}>${s.titulo}</h2>` : ''}
            ${s.texto ? `<p class="texto-miolo"${entra(0.12)}>${s.texto}</p>` : ''}
            ${p ? `<div class="prova">${p}</div>` : ''}
          </div>
          ${s.semTrilho ? '' : trilho(ctx.i, ctx.total)}`,
      });
    },

    // Chamada: "comenta" + a palavra gigante atrás do assunto + o que a pessoa recebe.
    chamada(s, tema, ctx) {
      const t = s.titulo;
      const cond = `font-size:${t.tam}px;${t.centro ? 'left:50%;transform:translateX(-50%)' : `left:${t.x - JANELA}px`};top:${t.y - JANELA}px${t.cor ? `;--titulo:${t.cor}` : ''}`;
      return montar(tema, {
        classe: s.sangra ? 'sangra' : '',
        c0: `${camada0(s)}${fundoFoto(s)}${luzFundo(s.luz)}${blocosMescla(s)}`,
        c1: camada1(s),
        atras: `${reguasAtras(s)}<div class="condensada palavra-chamada"${t.centro ? ` data-larg="${t.larg || 860}"` : ''} style="position:absolute;${cond}">${t.condensada}</div>
          <div class="pre-chamada" data-ancora=".palavra-chamada" ${t.centro ? 'data-centro=".palavra-chamada" data-lado="centro"' : 'data-lado="esquerda"'} data-posicao="acima" data-espaco="${t.preEspaco ?? 2}">${t.pre}</div>`,
        c2: `${s.assunto ? assuntoFoto(s.assunto) : ''}${folhas((s.nevoa || []).map((f) => ({ ...f, x: f.x - JANELA, y: f.y - JANELA })))}`,
        c3: `${folhas(s.folhas)}${bokeh(s.bokeh)}<div class="${t.centro ? 'chamada-centro' : ''}">${(s.blocos || []).map((b) => BLOCOS[b.tipo](b)).join('')}</div>`,
        c4: `${cromo()}${topo(ctx.marca)}${s.reguasAtras || s.semRegua ? '' : reguas()}${s.selo ? selo(t.centro ? { ...s.selo, ponto: s.selo.pontoCentro || [0.8, 0.98] } : s.selo) : ''}`,
      });
    },
  };

  // ---------------------------------------------------------------- blocos (camada 3)
  const BLOCOS = {
    nota: (b) => `<div class="vidro ${b.solido ? 'solido' : ''}" style="${b.fundo ? `background:${b.fundo};` : ''}${estilo({ left: b.x, top: b.y, width: b.w, fontSize: b.tam || 34, lineHeight: 1.25 })}">${b.html}</div>`,
    // Texto solto por cima da foto, girado junto com o que ele acompanha (o que está escrito no papel na mão do robô).
    escrito: (b) => `<div class="${b.classe || ''}" style="${estilo({ position: 'absolute', left: b.x, top: b.y, width: b.w, fontSize: b.tam || 34, lineHeight: 1.3, color: b.cor || '#1a1a1a', transform: `rotate(${b.rot || 0}deg)`, fontFamily: 'Inter, sans-serif' })}">${b.html}</div>`,
    // Arquivo de skill do Claude (o que a capa da skill entrega), onde o dedo do Filipe aponta.
    arquivo: (b) => `<div class="arquivo-skill" style="${estilo({ left: b.x, top: b.y, transform: `rotate(${b.rot || 0}deg)` })}"><span class="app">${simboloClaude()}</span><div><b>${b.nome}</b><small>${b.sub || ''}</small></div></div>`,
    // Janela do Claude (mockup) com uma troca de mensagens, para o fundo das capas sobre o Claude.
    // `vidro`: a mesma janela em vidro transparente (branco translúcido), para mesclar com o fundo (`mescla: 'screen'`).
    janela: (b) => `<div class="janela-claude${b.vidro ? ' vidro' : ''}" style="${estilo({ left: b.x, top: b.y, width: b.w || 760, transform: `rotate(${b.rot || 0}deg)`, filter: b.blur ? `blur(${b.blur}px)` : 'none', opacity: b.op ?? 1, ...(b.mescla ? { mixBlendMode: b.mescla } : {}) })}">
        <div class="barra"><i></i><i></i><i></i><span>${simboloClaude()}Claude</span></div>
        <div class="msg eu">${b.eu}</div><div class="msg ia"><span class="app-mini">${simboloClaude()}</span><div>${b.ia}</div></div>
        ${b.entrada === false ? '' : '<div class="entrada">Responder ao Claude...</div>'}</div>`,
    // Ícone de arquivo do computador (a folha com a ponta dobrada e o nome embaixo, selecionado), para o dedo apontar.
    documento: (b) => `<div class="doc-arquivo" style="${estilo({ left: b.x, top: b.y, transform: `rotate(${b.rot || 0}deg)` })}"><div class="folha-doc"><span class="app">${simboloClaude()}</span><em>${b.tipoArq || ''}</em></div><b>${b.nome}</b></div>`,
    // Caixa de mensagem do Claude com o prompt escrito e o botão de enviar (o "um prompt" da capa).
    prompt: (b) => `<div class="caixa-prompt${b.vidro ? ' vidro' : ''}" style="${estilo({ left: b.x, top: b.y, width: b.w || 520, transform: `rotate(${b.rot || 0}deg)`, filter: b.blur ? `blur(${b.blur}px)` : 'none', opacity: b.op ?? 1, ...(b.mescla ? { mixBlendMode: b.mescla } : {}) })}">${b.texto}<span class="enviar"><svg viewBox="0 0 32 32"><path d="M16 25V8m-7 7 7-7 7 7" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div>`,
    // Gráfico de barras em pé (o número da capa), para o fundo: `itens` = [{ t, v, p (0 a 1), destaque }].
    // `titulo` diz o que o número mede (sem ele, o gráfico vira enfeite: "não entendi os elementos", 26/10/2026).
    // `deitado`: barras na horizontal (cabem num espaço estreito, do lado do rosto).
    grafico: (b) => `<div class="grafico-bloco${b.deitado ? ' deitado' : ''}" style="${estilo({ left: b.x, top: b.y, width: b.w || 420, ...(b.deitado ? {} : { height: b.h || 460 }), transform: `rotate(${b.rot || 0}deg)`, filter: b.blur ? `blur(${b.blur}px)` : 'none', opacity: b.op ?? 1 })}">${b.titulo ? `<div class="gb-titulo">${b.titulo}</div>` : ''}${b.deitado
      ? b.itens.map((it) => `<div class="gb-linha${it.destaque ? ' destaque' : ''}"><div><span>${it.t}</span><b>${it.v}</b></div><i style="width:${Math.round(it.p * 100)}%"></i></div>`).join('')
      : `<div class="gb-cols">${b.itens.map((it) => `<div class="gb-col${it.destaque ? ' destaque' : ''}"><b>${it.v}</b><i style="height:${Math.round(it.p * 100)}%"></i><span>${it.t}</span></div>`).join('')}</div>`}${b.pe ? `<div class="gb-pe">${b.pe}</div>` : ''}</div>`,
    // Perfil do Instagram (mockup no modo escuro), com os números e a grade de verdade: `avatar`, `usuario`, `nome`,
    // `bio`, `posts`, `seguidores`, `seguindo`, `destaques` (nomes) e `grade` (6 imagens).
    perfil: (b) => `<div class="perfil-ig" style="${estilo({ left: b.x, top: b.y, width: b.w || 440, transform: `rotate(${b.rot || 0}deg)`, filter: b.blur ? `blur(${b.blur}px)` : 'none', opacity: b.op ?? 1 })}">
        <div class="pi-barra"><b>${b.usuario}</b><i></i></div>
        <div class="pi-topo"><img class="pi-avatar" src="${caminhoImg(b.avatar)}" alt=""><div><b>${b.posts}</b><span>publicações</span></div><div><b>${b.seguidores}</b><span>seguidores</span></div><div><b>${b.seguindo}</b><span>seguindo</span></div></div>
        <div class="pi-nome">${b.nome}</div><div class="pi-bio">${b.bio}</div>
        <div class="pi-botoes"><span>Editar perfil</span><span>Ver arquivo</span></div>
        <div class="pi-destaques">${(b.destaques || []).map((d) => `<div><i></i><span>${d}</span></div>`).join('')}</div>
        <div class="pi-grade">${(b.grade || []).map((a) => `<img src="${caminhoImg(a)}" alt="">`).join('')}</div>
      </div>`,
    // Legenda de post com trechos grifados (<mark>), para o fundo: o texto com cara de IA.
    legenda: (b) => `<div class="legenda-bloco" style="${estilo({ left: b.x, top: b.y, width: b.w || 520, transform: `rotate(${b.rot || 0}deg)`, filter: b.blur ? `blur(${b.blur}px)` : 'none', opacity: b.op ?? 1 })}"><div class="lb-topo"><i></i><b>${b.perfil || '@seu.perfil'}</b></div><p>${b.texto}</p></div>`,
    // Imagem solta (um slide de verdade, por exemplo), girada, com sombra e, se pedir, desfoque de distância.
    imagem: (b) => `<img class="carta-img" src="${caminhoImg(b.arq)}" alt="" style="${estilo({ left: b.x, top: b.y, width: b.w, transform: `rotate(${b.rot || 0}deg)`, filter: b.blur ? `blur(${b.blur}px)` : 'none', zIndex: b.z || 0 })}">`,
    // Menu de contexto do computador (clique direito), com um item marcado: "Copiar prompt".
    menu: (b) => `<div class="menu-contexto" style="${estilo({ left: b.x, top: b.y, transform: `rotate(${b.rot || 0}deg)` })}">${b.itens.map((t, k) => `<div class="${k === b.ativo ? 'ativo' : ''}">${t}</div>`).join('')}</div>`,
  };

  // A sombra em degradê medida na tela (`escurece: { y0, y1 }`): acha o centro da peça e escreve o degradê com as
  // paradas em px, na direção que, depois do giro da peça, fica na vertical do slide.
  function ajustarEscurece() {
    document.querySelectorAll('.escurece[data-y0]').forEach((el) => {
      const w = el.offsetWidth, h = el.offsetHeight, g = el.closest('.grupo');
      if (!w || !h || !g) return;
      const r = g.getBoundingClientRect(), cy = r.top + r.height / 2;
      const rot = Number(el.dataset.rot) || 0, y0 = Number(el.dataset.y0), y1 = Number(el.dataset.y1), sobe = y1 < y0;
      const alvo = sobe ? 0 : 180, a = el.dataset.espelho === '1' ? rot - alvo : alvo - rot, rad = (a * Math.PI) / 180;
      const L = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
      const p = (y) => Math.round(L / 2 + (sobe ? cy - y : y - cy));
      el.style.background = `linear-gradient(${a}deg, rgba(0,0,0,${el.dataset.forca}) ${p(y0)}px, rgba(0,0,0,0) ${p(y1)}px)`;
    });
  }
  window.addEventListener('load', ajustarEscurece);

  // ---------------------------------------------------------------- alinhamento depois das fontes
  // Texto de apoio nunca fica solto: alinha à borda da palavra grande (data-ancora), e o selo põe a ponta do cursor
  // no elemento que aponta (data-aponta, `ponto` = fração da largura e da altura dele).
  function alinhar() {
    const caixa = (el) => el.getBoundingClientRect();
    // Chamada centralizada: a palavra cresce até `tam`, sem passar de `larg`.
    document.querySelectorAll('.palavra-chamada[data-larg]').forEach((el) => {
      const fs = parseFloat(getComputedStyle(el).fontSize), w = el.getBoundingClientRect().width;
      if (w > Number(el.dataset.larg)) el.style.fontSize = `${fs * Number(el.dataset.larg) / w}px`;
    });
    // Título em bloco (`titulo.bloco`, em px): as duas linhas com a mesma largura, alinhadas dos dois lados, uma colada na
    // outra. Cada linha tem várias cópias (o desfoque progressivo): mede a primeira e aplica a todas.
    const blocoLargura = document.querySelector('[data-bloco]');
    if (blocoLargura) {
      const largura = Number(blocoLargura.dataset.bloco);
      const linhas = [...document.querySelectorAll('.titulo-capa')];
      linhas.forEach((tl) => {
        const todas = tl.querySelectorAll('.condensada');
        const c0 = tl.querySelector('.progressivo .condensada');
        const est = getComputedStyle(c0);
        const novo = parseFloat(est.fontSize) * largura / (c0.getBoundingClientRect().width - parseFloat(est.paddingLeft) - parseFloat(est.paddingRight));
        todas.forEach((el) => { el.style.fontSize = `${novo}px`; });
      });
      if (linhas[1]) {
        const a = caixa(linhas[0].querySelector('.progressivo .condensada')), b = caixa(linhas[1].querySelector('.progressivo .condensada'));
        linhas[1].style.top = `${parseFloat(linhas[1].style.top) + a.bottom + Number(blocoLargura.dataset.vao || 8) - b.top}px`;
      }
    }
    document.querySelectorAll('[data-ancora]').forEach((el) => {
      const alvo = document.querySelector(el.dataset.ancora);
      if (!alvo) return;
      const a = caixa(alvo), pai = caixa(el.offsetParent), esp = Number(el.dataset.espaco || 0);
      if (el.dataset.lado === 'direita') el.style.right = `${pai.right - a.right}px`;
      else if (el.dataset.lado === 'centro') {
        // A linha tem a folga do desfoque dos dois lados, então o centro dela é o centro da palavra inteira.
        const c = caixa(document.querySelector(el.dataset.centro));
        el.style.left = `${c.left + c.width / 2 - pai.left - el.offsetWidth / 2}px`;
      }
      else el.style.left = `${a.left - pai.left}px`;
      if (el.dataset.posicao === 'acima') el.style.bottom = `${pai.bottom - a.top + esp}px`;
      else el.style.top = `${a.bottom - pai.top + esp}px`;
    });
    mover(window.CARROSSEL && window.CARROSSEL.slides[n - 1]);
    document.querySelectorAll('[data-aponta]:not([data-aponta=""])').forEach((el) => {
      const alvo = document.querySelector(el.dataset.aponta);
      if (!alvo) return;
      const [fx, fy] = el.dataset.ponto.split(',').map(Number);
      const a = caixa(alvo), pai = caixa(el.offsetParent), ponta = el.querySelector('svg').getBoundingClientRect().width * (6 / 46);
      el.style.left = `${a.left + a.width * fx - pai.left - ponta}px`;
      el.style.top = `${a.top + a.height * fy - pai.top - ponta * 0.7}px`;
    });
    moverSelo(window.CARROSSEL && window.CARROSSEL.slides[n - 1]);
    // Slide das camadas: acha o canto direito de cada plano (a transformação 3D aplicada aos 4 cantos), põe o nome na
    // altura dele, numa coluna só, e liga os dois com uma linha.
    const planos = [...document.querySelectorAll('.plano-real')];
    if (planos.length) {
      const cantos = planos.map((pl) => {
        const m = new DOMMatrix(getComputedStyle(pl).transform), w = pl.offsetWidth, h = pl.offsetHeight;
        return [[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => {
          const p = m.transformPoint(new DOMPoint(x - w / 2, y - h / 2, 0, 1));
          return [pl.offsetLeft + w / 2 + p.x / p.w, pl.offsetTop + h / 2 + p.y / p.w];
        }).reduce((a, b) => (b[0] > a[0] ? b : a));
      });
      const coluna = Math.max(...cantos.map(([x]) => x)) + 70;
      planos.forEach((pl, k) => {
        const [x, y] = cantos[k];
        const nomeEl = document.querySelector(`.nome-camada[data-plano="${k}"]`), linha = document.querySelector(`.linha-camada[data-plano="${k}"]`);
        nomeEl.style.left = `${coluna}px`;
        nomeEl.style.top = `${y - nomeEl.offsetHeight / 2}px`;
        Object.assign(linha.style, { left: `${x + 14}px`, top: `${y}px`, width: `${coluna - x - 34}px` });
      });
    }
    tirarPoeiraDoTexto();
    ajustarEscurece();
    // As medidas e os mapas (templates/carrossel/mapas.js): window.MEDIR() devolve as caixas de tudo; com &mapa=, desenha.
    if (window.MAPAS) window.MAPAS.depois({ mapa: MAPA, n, janela: JANELA, carrossel: window.CARROSSEL });
    window.PRONTO = true;
  }

  // ---------------------------------------------------------------- movimento em loop (capa animada)
  // Pedido do dono (08/11/2026), regra para todo post: "um motion em LOOP que vai e volta sutil. Não pode cortar e nem
  // ficar sem texto. Não pode ser extremamente agressivo." `s.movimento` no conteúdo; T vai de 0 a 1 numa volta inteira
  // (ferramentas/animar.mjs com `loop`), sem emenda. Só no vídeo: a imagem parada é a composição aprovada.
  // Depois: "animou tudo muito sincronizado... era pra ser cada movimento diferente, pq dá uma sensação de
  // profundidade": cada camada tem o seu ritmo (`voltas`, um número inteiro de idas e voltas por loop, para não ter
  // emenda) e o seu atraso (`fase`, de 0 a 1). Cada campo é o máximo:
  //   fundo:   { escala: -0.03, origem, voltas, fase, deriva: [dx, dy], faseDeriva }  a cena afasta e balança
  //   assunto: { escala: 0.035, origem: [x, y], voltas, fase, deriva, faseDeriva }    o recorte e a `frente` chegam
  //   titulo:  { escala: 0.02, voltas, fase }       o título e as linhas de apoio respiram, em volta do centro deles
  //   luz:     { brilho: 0.06, vinheta: 0.5, voltas, fase }  o fundo escurece e clareia, e a vinheta aperta e solta
  //   selo:    { de: [dx, dy], janela: [0.16, 0.84], clique: true }  o cursor sai e volta para a palavra, com um clique
  // `deriva` com sinais opostos no fundo e no assunto dá a paralaxe (o que está perto anda mais que o fundo).
  // Com fundo e assunto em escalas diferentes, a cena não pode ter o assunto dentro (apareceria dobrado): use a cena sem
  // ele (a "placa", o fundo preenchido onde ele estava).
  const onda = (o) => (1 - Math.cos(2 * Math.PI * ((o.voltas || 1) * T + (o.fase || 0)))) / 2; // 0 a 1, macio nas pontas
  const balanco = (o) => Math.sin(2 * Math.PI * ((o.voltasDeriva || 1) * T + (o.faseDeriva || 0))); // -1 a 1
  const derivar = (els, o) => {
    if (!o.deriva) return;
    const b = balanco(o);
    els.forEach((el) => { el.style.translate = `${(o.deriva[0] * b).toFixed(2)}px ${(o.deriva[1] * b).toFixed(2)}px`; });
  };
  // Escala em volta de um ponto F da página: transform-origin no sistema do próprio elemento (a posição de layout, sem o
  // transform, vem de offsetLeft/offsetTop). A propriedade `scale` soma com o transform que o elemento já tem.
  function escalar(els, k, F) {
    els.forEach((el) => {
      const pai = el.offsetParent ? el.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };
      el.style.transformOrigin = `${F[0] - pai.left - el.offsetLeft}px ${F[1] - pai.top - el.offsetTop}px`;
      el.style.scale = String(k);
    });
  }
  function mover(s) {
    const m = s && s.movimento;
    if (!m || !ANIMANDO) return;
    const fundo = [...document.querySelectorAll('.c0 .fundo-foto')];
    if (m.fundo) {
      escalar(fundo, 1 + m.fundo.escala * onda(m.fundo), m.fundo.origem || [540, 675]);
      derivar(fundo, m.fundo);
    }
    if (m.assunto) {
      const els = [...document.querySelectorAll('.c2 .assunto, .c2 .sombra-projetada, .c5 .folha:not(.solto)')];
      escalar(els, 1 + m.assunto.escala * onda(m.assunto), m.assunto.origem || [540, 675]);
      derivar(els, m.assunto);
    }
    // Objetos soltos (a `frente` com `solto: true`), cada um no seu ritmo, em volta do próprio centro (09/11/2026: o
    // ícone do Photoshop dá zoom e um giro leve enquanto ele faz o zoom ao contrário).
    //   objetos: [{ escala: 0.07, giro: 3, voltas, fase, deriva: [dx, dy], faseDeriva }]  (giro em graus, vai e volta)
    if (m.objetos) {
      [...document.querySelectorAll('.c5 .folha.solto')].forEach((el, k) => {
        const o = m.objetos[k];
        if (!o) return;
        el.style.transformOrigin = '50% 50%';
        if (o.escala) el.style.scale = String(1 + o.escala * onda(o));
        if (o.giro) el.style.rotate = `${(o.giro * Math.sin(2 * Math.PI * ((o.voltas || 1) * T + (o.fase || 0)))).toFixed(3)}deg`;
        derivar([el], o);
      });
    }
    // O que está na tela larga (panorama e travessia) também se mexe na capa animada, cada elemento no seu ritmo, em
    // volta do próprio centro: `anima: { escala, giro, voltas, fase, deriva: [dx, dy], faseDeriva }` no elemento. Só no
    // que NÃO cruza a divisa com o card 2 (o vídeo é só da capa: o que cruza tem de ficar parado para a emenda casar).
    document.querySelectorAll('[data-anima]').forEach((el) => {
      let o = null;
      try { o = JSON.parse(el.dataset.anima); } catch { return; }
      if (o.escala) el.style.scale = String(1 + o.escala * onda(o));
      if (o.giro) el.style.rotate = `${(o.giro * Math.sin(2 * Math.PI * ((o.voltas || 1) * T + (o.fase || 0)))).toFixed(3)}deg`;
      derivar([el], o);
    });
    if (m.luz) {
      // O fundo escurece e clareia em volta do aprovado (brilho 1 ± `brilho`), e uma vinheta a mais aperta os cantos
      // quando ele escurece. Só no fundo: o assunto continua aceso, e a diferença dá a profundidade.
      const w = onda(m.luz);
      fundo.forEach((el) => { el.style.filter = `${el.style.filter || ''} brightness(${(1 + (m.luz.brilho ?? 0.06) * (1 - 2 * w)).toFixed(4)})`.trim(); });
      const c0 = document.querySelector('.c0');
      if (c0) c0.insertAdjacentHTML('beforeend', `<div class="vinheta-viva" style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 72% 68% at 50% 54%, transparent 42%, rgba(0,0,0,.72) 100%);opacity:${((m.luz.vinheta ?? 0.5) * w).toFixed(4)}"></div>`);
    }
    if (m.titulo) {
      const els = [...document.querySelectorAll('.c-titulo .titulo-capa, .c-titulo .titulo-capa-2, .c-titulo .pre-titulo, .c-titulo .pos-titulo')];
      const caixas = [...document.querySelectorAll('.c-titulo .progressivo > .copia:first-child .condensada, .c-titulo .progressivo > .copia:first-child .script, .c-titulo .pre-titulo, .c-titulo .pos-titulo')]
        .map((el) => el.getBoundingClientRect()).filter((r) => r.width > 2 && r.height > 2);
      if (caixas.length) {
        const x0 = Math.min(...caixas.map((r) => r.left)), x1 = Math.max(...caixas.map((r) => r.right));
        const y0 = Math.min(...caixas.map((r) => r.top)), y1 = Math.max(...caixas.map((r) => r.bottom));
        escalar(els, 1 + m.titulo.escala * onda(m.titulo), m.titulo.origem || [(x0 + x1) / 2, (y0 + y1) / 2]);
      }
    }
  }
  // O selo anda depois de apontar (ele segue a palavra já com o título em escala). Fica parado na palavra fora da
  // `janela` da volta, sai e volta dentro dela, e dá um clique (encolhe 8%) logo depois de chegar.
  function moverSelo(s) {
    const m = s && s.movimento && s.movimento.selo;
    const el = document.querySelector('.c4 .selo-calango');
    if (!m || !el || !ANIMANDO) return;
    if (m.modo === 'selecionar') { selecionar(m, el); return; }
    const [a, b] = m.janela || [0.16, 0.84];
    const u = Math.min(Math.max((T - a) / (b - a), 0), 1);
    const fora = Math.sin(Math.PI * u) ** 2;
    const [dx, dy] = m.de || [60, 30];
    el.style.translate = `${(dx * fora).toFixed(2)}px ${(dy * fora).toFixed(2)}px`;
    const tc = (T - b + 1) % 1; // tempo desde a chegada
    const c = tc > 0.01 && tc < 0.13 ? Math.sin(Math.PI * (tc - 0.01) / 0.12) : 0;
    if (m.clique !== false && c) { el.style.transformOrigin = '0 0'; el.style.scale = String(1 - 0.08 * c); }
  }

  // Selo que seleciona a palavra (`selo: { modo: 'selecionar' }`, 08/11/2026). O dono não gostou do cursor passeando:
  // "normalmente o cursor é mais estável. Tipo ir clicar... ou selecionou o SOZINHA... clicar e arrastar por cima pra
  // selecionar igual iOS". Na volta: parado onde aponta, vai até o começo da palavra, aperta, arrasta até o fim com a
  // seleção azul do iOS crescendo atrás das letras, solta (as alças aparecem) e volta para casa; a seleção fica e some.
  // `de` e `ate`: começo e fim da seleção (fração da largura da palavra); `cor`: a da seleção (azul do iOS no escuro).
  const limitar = (x) => Math.min(Math.max(x, 0), 1);
  const macio = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
  function selecionar(m, el) {
    const alvo = document.querySelector(el.dataset.aponta);
    if (!alvo) return;
    const r = alvo.getBoundingClientRect();
    const [casa, casaY] = el.dataset.ponto.split(',').map(Number);
    const ini = m.de ?? 0, fim = m.ate ?? 1;
    if (m.casa) { selecionarDeOutra(m, el, r, casa, casaY, ini, fim); return; }
    // A ponta sobe para a parte de baixo das letras durante a seleção (`altura`, fração da palavra): a caixa do selo
    // sobe junto e não encosta no que está embaixo. Depois de soltar, o cursor volta para casa e a palavra continua
    // selecionada: ele não fica parado na ponta da palavra, perto da borda.
    const alt = m.altura ?? 0.72;
    const trecho = (a, b) => macio(limitar((T - a) / (b - a)));
    let fx, fy;
    if (T < 0.20) { fx = casa; fy = casaY; }
    else if (T < 0.32) { const k = trecho(0.20, 0.32); fx = casa + (ini - casa) * k; fy = casaY + (alt - casaY) * k; }
    else if (T < 0.35) { fx = ini; fy = alt; }
    else if (T < 0.55) { fx = ini + (fim - ini) * trecho(0.35, 0.55); fy = alt; }
    else if (T < 0.56) { fx = fim; fy = alt; }
    else if (T < 0.70) { const k = trecho(0.56, 0.70); fx = fim + (casa - fim) * k; fy = alt + (casaY - alt) * k; }
    else { fx = casa; fy = casaY; }
    el.style.translate = `${((fx - casa) * r.width).toFixed(2)}px ${((fy - casaY) * r.height).toFixed(2)}px`;
    // apertado durante o arrasto (encolhe 6%). Solta já voltando para casa: a caixa volta ao tamanho longe da borda
    // (revisor: soltando parada na ponta da palavra, ela chegava a 6 px da borda da janela).
    const aperto = limitar((T - 0.32) / 0.03) - limitar((T - 0.58) / 0.04);
    if (aperto > 0) { el.style.transformOrigin = '0 0'; el.style.scale = String(1 - 0.06 * aperto); }
    // a seleção: cresce com o arrasto, fica, e some de 0,80 a 0,90
    const larg = T < 0.35 ? 0 : T < 0.55 ? fx - ini : fim - ini;
    const op = T < 0.80 ? 1 : 1 - limitar((T - 0.80) / 0.10);
    const camada = document.querySelector('.c-titulo');
    if (larg <= 0.002 || op <= 0 || !camada) return;
    const c = camada.getBoundingClientRect(), cor = m.cor || '#0a84ff';
    const x = r.left - c.left + ini * r.width - 3, y = r.top - c.top + r.height * 0.12, w = larg * r.width + 6, h = r.height * 0.8;
    const alca = limitar((T - 0.55) / 0.04) * op; // as alças entram ao soltar
    const html = `<div class="selecao-ios" style="position:absolute;left:0;top:0;opacity:${op.toFixed(3)};pointer-events:none">
        <div style="position:absolute;left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;background:${cor};opacity:.38;border-radius:4px"></div>
        <div style="position:absolute;left:${(x - 1.5).toFixed(1)}px;top:${(y + 8).toFixed(1)}px;width:3px;height:${(h - 8).toFixed(1)}px;background:${cor};border-radius:2px;opacity:${alca.toFixed(3)}"><i style="position:absolute;left:-5px;top:-11px;width:13px;height:13px;border-radius:50%;background:${cor}"></i></div>
        <div style="position:absolute;left:${(x + w - 1.5).toFixed(1)}px;top:${y.toFixed(1)}px;width:3px;height:${(h + 4).toFixed(1)}px;background:${cor};border-radius:2px;opacity:${alca.toFixed(3)}"><i style="position:absolute;left:-5px;bottom:-11px;width:13px;height:13px;border-radius:50%;background:${cor}"></i></div>
      </div>`;
    const pos = camada.querySelector('.pos-titulo');
    if (pos) pos.insertAdjacentHTML('beforebegin', html); else camada.insertAdjacentHTML('beforeend', html);
  }

  // O cursor descansa em OUTRA palavra (`selo.casa`, um seletor; `casaPonto` = fração dela, padrão embaixo no meio) e só
  // vai até o alvo para selecionar (09/11/2026, capa do 04: "Cursor começa no 'e adotei', fica 2 segundos (sem
  // selecionar), vai rápido pro lado '100% a IA' e seleciona. Depois volta."). `tempos` (fração da volta):
  // [fim do descanso, chega no alvo, fim do aperto, fim do arrasto, solta, fim da pausa no alvo, de volta em casa].
  function selecionarDeOutra(m, el, r, casa, casaY, ini, fim) {
    const ce = document.querySelector(m.casa);
    if (!ce) return;
    const rc = ce.getBoundingClientRect(), [cpx, cpy] = m.casaPonto || [0.55, 1.0];
    const alt = m.altura ?? 0.72;
    const base = [r.left + r.width * casa, r.top + r.height * casaY]; // onde o alinhar() pôs a ponta
    const A = [rc.left + rc.width * cpx, rc.top + rc.height * cpy];
    const S = [r.left + r.width * ini, r.top + r.height * alt], E = [r.left + r.width * fim, S[1]];
    const [t0, t1, t2, t3, t4, t5, t6] = m.tempos || [0.25, 0.33, 0.35, 0.55, 0.58, 0.72, 0.80];
    const trecho = (a, b) => macio(limitar((T - a) / (b - a)));
    const mix = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
    let P;
    if (T < t0) P = A;
    else if (T < t1) P = mix(A, S, trecho(t0, t1));
    else if (T < t2) P = S;
    else if (T < t3) P = mix(S, E, trecho(t2, t3));
    else if (T < t5) P = E;
    else if (T < t6) P = mix(E, A, trecho(t5, t6));
    else P = A;
    el.style.translate = `${(P[0] - base[0]).toFixed(2)}px ${(P[1] - base[1]).toFixed(2)}px`;
    const aperto = limitar((T - t1) / (t2 - t1)) - limitar((T - t3) / (t4 - t3));
    if (aperto > 0) { el.style.transformOrigin = '0 0'; el.style.scale = String(1 - 0.06 * aperto); }
    // `de` maior que `ate` seleciona da direita para a esquerda (a etiqueta do cursor termina longe da borda).
    const atual = T < t2 ? ini : T < t3 ? (P[0] - r.left) / r.width : fim;
    const a0 = Math.min(ini, atual), larg = Math.abs(atual - ini);
    const op = T < t6 ? 1 : 1 - limitar((T - t6) / 0.1);
    const camada = document.querySelector('.c-titulo');
    if (larg <= 0.002 || op <= 0 || !camada) return;
    const c = camada.getBoundingClientRect(), cor = m.cor || '#0a84ff';
    const x = r.left - c.left + a0 * r.width - 3, y = r.top - c.top + r.height * 0.12, w = larg * r.width + 6, h = r.height * 0.8;
    const alca = limitar((T - t3) / (t4 - t3)) * op;
    camada.insertAdjacentHTML('beforeend', `<div class="selecao-ios" style="position:absolute;left:0;top:0;opacity:${op.toFixed(3)};pointer-events:none">
        <div style="position:absolute;left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;background:${cor};opacity:.38;border-radius:4px"></div>
        <div style="position:absolute;left:${(x - 1.5).toFixed(1)}px;top:${(y + 8).toFixed(1)}px;width:3px;height:${(h - 8).toFixed(1)}px;background:${cor};border-radius:2px;opacity:${alca.toFixed(3)}"><i style="position:absolute;left:-5px;top:-11px;width:13px;height:13px;border-radius:50%;background:${cor}"></i></div>
        <div style="position:absolute;left:${(x + w - 1.5).toFixed(1)}px;top:${y.toFixed(1)}px;width:3px;height:${(h + 4).toFixed(1)}px;background:${cor};border-radius:2px;opacity:${alca.toFixed(3)}"><i style="position:absolute;left:-5px;bottom:-11px;width:13px;height:13px;border-radius:50%;background:${cor}"></i></div>
      </div>`);
  }

  // Poeira nunca em cima de texto nem colada nele: depois de tudo no lugar, apaga a que cai perto de alguma letra.
  function tirarPoeiraDoTexto() {
    const textos = [];
    const andar = document.createTreeWalker(document.getElementById('raiz') || document.body, NodeFilter.SHOW_TEXT);
    const faixa = document.createRange();
    while (andar.nextNode()) {
      if (!andar.currentNode.textContent.trim()) continue;
      faixa.selectNodeContents(andar.currentNode);
      textos.push(...faixa.getClientRects());
    }
    document.querySelectorAll('.poeira > *').forEach((p) => {
      const c = p.getBoundingClientRect();
      if (textos.some((r) => c.right > r.left - 18 && c.left < r.right + 18 && c.bottom > r.top - 18 && c.top < r.bottom + 18)) p.remove();
    });
  }

  // ---------------------------------------------------------------- desenha
  function desenhar(C, n, temaPedido) {
    const s = C.slides[n - 1];
    if (!s) { document.body.innerHTML = `<p style="color:#fff;font:30px sans-serif;padding:40px">Slide ${n} não existe (o conteúdo tem ${C.slides.length}).</p>`; return; }
    const tema = ['amarelo', 'preto', 'branco'].includes(temaPedido) ? temaPedido : s.tema || 'preto';
    document.getElementById('raiz').innerHTML = TIPOS[s.tipo](s, tema, { i: n, total: C.slides.length, marca: C.marca });
    document.title = `${C.nome} · ${n}/${C.slides.length} · ${tema}`;
    window.SLIDES = C.slides.length;
    window.CAPAS = C.capas || [];
    if (SO || MAPA === 'texto' || MAPA === 'elementos') { document.documentElement.style.background = 'transparent'; document.body.style.background = 'transparent'; }
    document.fonts.ready.then(alinhar);
  }
  // Card animado: redesenha no momento t (0 a 1) sem recarregar a página (fontes e imagens já estão na memória).
  window.seek = (t) => {
    T = Math.min(Math.max(Number(t) || 0, 0), 1);
    ANIMANDO = true;
    window.PRONTO = false;
    desenhar(window.CARROSSEL, n, q.get('tema'));
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  };
})();
