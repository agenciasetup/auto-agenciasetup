// Ideia do Filipe (11/11/2026, pauta c110dfd5): "A IA vai tirar seu EMPREGO?".
// Tese: a IA evolui de verdade e já faz o operacional; o que continua sendo do profissional é criar e pensar estratégia
// (com todo mundo usando a mesma IA, todo mundo fica igual, e quem ganha é quem pensa diferente). Tom: sem medo.
// Fontes conferidas em 11/11/2026:
// - Blog da Adobe, "Adobe MAX 2026 Sneaks: Previewing the future of creativity" (John Yang, 11/11/2026): 10 projetos
//   de pesquisa; Project Sight Span (a imagem vira um ambiente para entrar e explorar) e Project Screen Test (criar o
//   visual, a voz e a personalidade de um personagem e conversar com ele).
// - The Verge, "Adobe's AI experiments let you walk around in photos and interview your characters" (Jess Weatherbed,
//   11/11/2026): são prévias de tecnologia, sem garantia de virar ferramenta; Gautham Mysore (pesquisador da Adobe)
//   diz que são exemplos de como o profissional aplica o julgamento dele.
//
// TERCEIRA VERSÃO DO VISUAL (11/11/2026). A primeira foi a raposa de gravata na neve (arquivo-v1-raposa: lembrava o
// gato da Black). A segunda foi o xadrez (arquivo-v2-xadrez: a mão de robô vindo pegar um cavalo dourado), e o dono
// reprovou: "Capa sem sentido! Eu faria algo belo aqui. Mão humana e mão robótica, no estilo do quadro Criação de Adão.
// Um quadro atrás delas no meio, nesse quadro um ser humano no computador com Photoshop aberto, estilo pintura
// renascentista mesmo. Quadro no meio, com moldura. Uma mão vindo de cima (IA, robótica). Uma mão vindo de baixo
// (humana). Os cards poderiam ter mais imagens, elementos voando. Pode ser peças robóticas ou popups/elementos do
// Claude e folhas (de planta mesmo) simbolizando o humano. Sutil. Não faz mal a mão passar por cima da headline um
// pouco." O texto é o mesmo, já revisado. A ficha está em _local/carrossel/ia-emprego/ficha-v3.md e o padrão em
// references/direcao-de-arte.md.
// O sistema de símbolos: a IA é o robô (a mão branca) e o vidro do Claude; o humano é a mão de gente e a folha de
// planta. Na capa as duas mãos quase se encostam na frente do quadro; na chamada, elas se encostam.
// A segunda volta do dono, no mesmo dia (eu tinha enchido os cards de peças, janelinhas e raminhos): braços saindo dos
// cantos, quadro menor e desfocado, nada sem intenção, um elemento por card, vidro bem desfocado só de composição.
// Coordenadas da tela larga: x de 0 a 8640 (8 cards); a divisa entre o card k e o k+1 é x = 1080 vezes k.
(() => {
  const B = '../../biblioteca/';
  const C = (k) => (k - 1) * 1080; // onde começa o card k
  const SANS = "font-family:'Calango Sans',Outfit,sans-serif";
  const SERIFA = "font-family:'Calango Serif','Instrument Serif',serif;font-style:italic";
  const MONO = "font-family:'JetBrains Mono',monospace";
  const QUADRO = `${B}arte/quadros/quadro-renascentista-designer-deitado.png`;
  // Cada mão com o tamanho do recorte e onde fica a ponta do indicador (fração da largura e da altura).
  const ROBO = { arq: `${B}objetos/robos/mao-de-robo-apontando-criacao-longa.png`, dim: [1307, 1441], ponta: [0.0015, 0.939] };
  const GENTE = { arq: `${B}personagens/maos/mao-humana-criacao-de-adao.png`, dim: [781, 855], ponta: [0.98, 0.012] };
  // Põe a mão de modo que a ponta do dedo, depois do giro, caia no ponto pedido (o giro é em volta do meio da imagem).
  const mao = (m, w, rot, [tx, ty], extra = {}) => {
    const h = w * m.dim[1] / m.dim[0];
    const a = rot * Math.PI / 180;
    const dx = (m.ponta[0] - 0.5) * w, dy = (m.ponta[1] - 0.5) * h;
    const cx = tx - (dx * Math.cos(a) - dy * Math.sin(a)), cy = ty - (dx * Math.sin(a) + dy * Math.cos(a));
    return { arq: m.arq, x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w, rot, ...extra };
  };
  const folha = (nome, x, y, w, extra = {}) => ({ arq: `${B}plantas/folhas/${nome}-contraluz.png`, x, y, w, sat: 1.1, ...extra });
  // Vagalume de verdade: o inseto e a luz quente na cauda (a cauda fica nesta fração do arquivo: de lado e de cima).
  const CAUDA = { lado: [827, 651, 0.88, 0.71], cima: [786, 693, 0.84, 0.84] };
  const vagalume = (tipo, x, y, w, { z = 0, espelho = false, brilho = 1, acima = false, anima, escuro = 0.7, rastro } = {}) => {
    const [lw, lh, fx, fy] = CAUDA[tipo];
    const h = (w * lh) / lw;
    const longe = z < 0;
    return [
      { arq: `${B}animais/vagalumes/vagalume-voando-de-${tipo}.png`, x, y, w, z, espelho, acima, luz: escuro, ...(longe ? { blur: 3 } : {}), ...(rastro ? { rastro } : {}), ...(anima ? { anima } : {}) },
      { vagalume: true, cor: 'quente', x: x + w * (espelho ? 1 - fx : fx), y: y + h * fy, r: Math.max(5, w * 0.055) * brilho, blur: z > 0 ? Math.round(30 * z * z + 6 * z) + 4 : longe ? 5 : 2, op: 0.95, acima },
    ];
  };

  window.CARROSSEL = {
    nome: 'ia-emprego',
    marca: { perfil: '@agenciasetup', nome: 'Calango' },
    capas: [],
    palavra: 'POSTS',
    legenda: '',
    luzDe: 'cima-esquerda',
    // Por dentro das janelas: o quadro, que é fundo. As regras do dono, volta por volta: "desfocados no fundo precisam
    // ser mais escuros. Se forem mais claros, ficam por cima"; "um quadro na horizontal que fique do tamanho da
    // headline. A headline mais colada com o quadro e centralizada na imagem"; "esse brilho dourado no fundo não tem
    // sentido. Prefiro que fique preto, e ter alguns pontos de luz só"; e, com a capa do Leonardo de referência,
    // "podia ter uma vinheta, vinheta no quadro também... meio que sumindo no fundo".
    panorama: [
      // A luz do vagalume colado na lente, no canto de cima à esquerda (por dentro da janela, para não vazar na moldura).
      { vagalume: true, cor: 'quente', x: 104, y: 136, r: 74, blur: 28, op: 0.95 },
      // Camada 1: o quadro deitado, da largura da headline, colado embaixo dela. Desfocado, e sumindo para as bordas.
      { arq: QUADRO, x: 220, y: 572, w: 640, blur: 3.5, sat: 1.08, luz: 1, escurece: { de: 'bordas', forca: 0.92, ate: 0.28, centro: '50% 36%' }, anima: { escala: 0.015, fase: 0.1 } },
    ],
    travessia: [
      // Camada 4: a luz que vem de cima, do canto à esquerda, como na capa do Leonardo. Tem fonte (o vagalume colado na
      // lente) e fica no canto: não é o brilho dourado atrás de tudo, que ele tirou.
      { halo: true, x: 30, y: 40, d: 1000, cor: '#ffd060', borda: '#b85a00', blur: 70, op: 0.5, mistura: 'screen' },
      // Camada 3: as duas mãos, no estilo da Criação de Adão, cada braço saindo de um canto ("braço humano pode sair de
      // um canto e robótico de outro. No meio fica esquisito"). A do robô (a IA) vem do canto de cima à direita e passa
      // por cima do fim da headline: pode ("elementos por cima podem ficar por cima de textos desde que dê pra entender.
      // Mesmo que corte uma última letra"). O braço dela continua no card 2 até sair pelo alto ("o restante do braço
      // morreu ali. Precisa chegar até o final"): por isso o recorte esticado. A de gente vem do canto de baixo à
      // esquerda, por cima da moldura preta. As pontas dos dedos quase se encostam na frente do quadro.
      mao(ROBO, 1063, -8.5, [652, 868], { z: 0, acima: true }),
      mao(GENTE, 620, 13, [600, 912], { z: 0, sat: 1.05, anima: { deriva: [5, -3], fase: 0.2 } }),
      // Os pontos de luz da capa, como na capa do Leonardo: só dois vagalumes de verdade ("achei que foi excesso de
      // vagalume, meio mal feito"). Um colado na lente, no canto de cima à esquerda, escuro, com a luz grande e quente
      // (é ela que ilumina o canto); o outro pequeno e nítido, ao lado do quadro, com o rastro do voo.
      ...vagalume('lado', 164, 640, 70, { z: 0, espelho: true, brilho: 2.4, anima: { deriva: [-5, 4], fase: 0.75 } }),
      // Os cards de dentro: um elemento por divisa, perto da lente e fora de foco ("excesso de poluição de elementos...
      // duas engrenagens seguidas, ramo feio e mal desfocado"). Nos cards da IA, o aviso de vidro do Claude, que desfoca
      // o que está atrás ("efeitos de vidro e bem desfocados. É só elemento de composição"; "precisava desfocar o fundo
      // que ela está por cima também"; a referência é o aviso "Venda aprovada" do post DXuCSZDHAfz). Nos cards do
      // humano, a folha de louro.
      { vidro: true, x: C(3) - 566, y: 1100, w: 560, h: 172, rot: -7, titulo: 'Claude', texto: 'O post de hoje está pronto', z: 0.8, acima: true },
      { vidro: true, x: C(4) + 24, y: -70, w: 300, rot: 12, z: 0.8, acima: true },
      folha('folha-louro', C(5) - 290, 1000, 400, { z: 0.7, acima: true, rot: 28, luz: 0.92, sat: 1.05 }),
      folha('folha-louro', C(7) + 44, 1050, 380, { z: 0.7, acima: true, rot: -24, luz: 0.9, sat: 1.05 }),
      // Card 8 (a chamada): aqui as mãos se encostam, com um ponto de luz no toque. A de gente vem do canto de baixo, a
      // do robô vem da direita.
      { vagalume: true, cor: 'quente', x: C(8) + 544, y: 1046, r: 17, blur: 6, op: 0.9 },
      mao(ROBO, 1050, 35, [C(8) + 546, 1045], { z: 0 }),
      mao(GENTE, 600, 4, [C(8) + 542, 1050], { z: 0, sat: 1.05 }),
    ],
    slides: [
      {
        // O que o dono sentiu falta, olhando a capa do Leonardo: "o desfoque nas bordas do texto", "a reguazinha do lado
        // ali da moldura", "um ponto de luz igual essa segunda referência, vindo de cima" e "o degradê na palavra amarela".
        tipo: 'capa', tema: 'preto', reguasAtras: true,
        cantos: { blur: 6, de: 0.6 },
        // A vinheta: o fundo e o quadro somem para as bordas; o título e as mãos ficam.
        vinheta: { forca: 0.8, de: 0.38, centro: '50% 46%' },
        // "Na capa senti falta do cursor com calango" e, embaixo, "com a fonte Calango Signature, opacidade 15%, Feito no
        // Claude, por Calango. Pequeno, no meio, só pra não ficar vazio".
        selo: { left: 600, top: 1036, pequeno: true },
        assinatura: { texto: 'Feito no Claude, por Calango', y: 1222, tam: 44, op: 0.15 },
        // Os rabiscos (o dono, 11/11/2026: "como se alguém tivesse escrito ali... os comentários podem ser informais, como
        // se fosse mensagem de amigo no WhatsApp"). Um por card, em cinco cards, sempre onde não há texto.
        anotacoes: [{ texto: 'calma, lê até o fim kkk', x: 648, y: 1136, tam: 34, rot: -3 }],
        titulo: {
          pre: '', script: '', condensada: 'A IA VAI TIRAR SEU', linha2: 'EMPREGO?', tam: 120, y: 300, bloco: 640, vao: -6,
          cor: '#ffffff', cor2: 'linear-gradient(90deg, #ffd000 0%, #ffb000 45%, #ff7a00 100%)', foco: { esq: 4, dir: 4, centro: [0.17, 0.83] },
        },
        // Capa animada: o título respira, o quadro do fundo cresce um nada e a mão de gente se aproxima e volta. A mão
        // do robô fica parada (o braço cruza a divisa com o card 2).
        movimento: { titulo: { escala: 0.014, voltas: 2, fase: 0.35 } },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'Calango,', vocativo: true, semTrilho: true,
        anotacoes: [{ texto: 'tudo isso, sacou??', x: 168, y: 1176, tam: 36, rot: -4 }],
        titulo: 'as IAs estão cada vez mais <span class="serifa">absurdas</span>.',
        texto: 'Aqui na agência, a IA já faz<br>tudo isso por mim:',
        prova: { tipo: 'checklist', itens: ['Escreve os meus posts', 'Faz a arte dos carrosséis', 'Narra vídeo com a minha voz', 'Lê as métricas de cada post', 'Cria as páginas do meu site'] },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'no Adobe MAX 2026', semTrilho: true,
        titulo: 'E a Adobe mostrou <span class="serifa">mais</span>.',
        texto: 'São experimentos: nem todo vira<br>ferramenta. Mas impressionam.',
        prova: {
          tipo: 'exemplo', cor: '#141311', tinta: '#f5f1ea', legenda: 'blog da Adobe e The Verge, 11/11/2026',
          html: `<div style="${SANS};text-align:center;line-height:1.35"><div style="${MONO};font-size:22px;letter-spacing:.08em;opacity:.6">PROJECT SIGHT SPAN</div><div style="font-size:40px;margin:8px 0 34px">a foto vira um lugar<br>pra você <span style="${SERIFA};font-size:46px;color:#ffaa00">entrar e andar</span></div><div style="${MONO};font-size:22px;letter-spacing:.08em;opacity:.6">PROJECT SCREEN TEST</div><div style="font-size:40px;margin-top:8px">você cria o visual, a voz e o jeito<br>do personagem e <span style="${SERIFA};font-size:46px;color:#ffaa00">conversa</span> com ele</div></div>`,
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'mesmo assim', semTrilho: true, semPoeira: [[30, 30, 320, 240]],
        anotacoes: [{ texto: 'anota essa, mano! kkk', x: 160, y: 1172, tam: 36, rot: -3 }],
        titulo: 'Tem uma coisa que a IA<br>não <span class="serifa">substitui</span>.',
        texto: 'A sua cabeça: criar<br>e pensar estratégia.',
        prova: {
          tipo: 'exemplo', cor: '#f5f1ea', tinta: '#141311', legenda: 'Gautham Mysore, pesquisador da Adobe, ao The Verge',
          html: `<div style="${SANS};font-size:36px;line-height:1.45;text-align:center">Até quem cria esses experimentos na Adobe diz: o Sight Span é pro profissional aplicar o<br><span style="${SERIFA};font-size:52px;line-height:1.2;color:#d95f00;white-space:nowrap">próprio julgamento</span>.</div>`,
        },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'num mundo perfeito', semTrilho: true,
        titulo: 'Se todo mundo usar<br>a melhor IA, fica todo<br>mundo <span class="serifa">igual</span>.',
        texto: 'A melhor imagem, o melhor SEO.<br>Quem se destaca é quem pensa diferente.',
        prova: {
          tipo: 'exemplo', cor: '#141311', tinta: '#f5f1ea', w: 600, h: 400, legenda: 'o feed quando todo mundo usa a mesma IA',
          html: `<div style="display:grid;grid-template-columns:repeat(3,150px);gap:14px;justify-content:center">${Array.from({ length: 6 }, (_, k) => k === 4
            ? `<div style="height:152px;border-radius:14px;background:linear-gradient(140deg,#ffcc00,#ff8a00);color:#1d1305;display:flex;align-items:center;justify-content:center;text-align:center;${SERIFA};font-size:36px;line-height:1.05;padding:10px">a sua<br>ideia</div>`
            : `<div style="height:152px;border-radius:14px;background:#2a2826;color:#8d8983;display:flex;align-items:center;justify-content:center;text-align:center;${SANS};font-size:21px;line-height:1.25;padding:12px">5 dicas pra<br>vender mais</div>`).join('')}</div>`,
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'o meu conselho', semTrilho: true,
        titulo: 'O operacional pra IA,<br>a <span class="serifa">criatividade</span> pra você.',
        texto: 'Aprenda sobre pessoas e sobre venda.<br>E viva: é vivendo que nasce a ideia.',
        prova: { tipo: 'colunas', colunas: [{ titulo: 'deixe pra IA', itens: ['Rascunho da legenda', 'Adaptar formatos', 'Juntar as métricas', 'Garimpar o assunto'] }, { titulo: '<span style="color:#141311;font-weight:700">fica com você</span>', itens: ['Entender pessoas', 'Pensar a estratégia', 'Vender', 'Viver e se inspirar'], destaque: true }] },
      },
      {
        tipo: 'miolo', tema: 'branco', semTrilho: true,
        anotacoes: [{ texto: 'se vacilar é vapooo!', x: 560, y: 1092, tam: 36, rot: -3 }],
        titulo: 'Quer começar<br>pelo seu <span class="serifa">perfil</span>?',
        texto: 'O Claude cria os seus posts, você revisa,<br>aprova e posta. E sobra tempo pra pensar.',
        prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Estilo, pauta, texto e arte'], preco: 'R$ 39,90' },
      },
      {
        // A chamada fecha a ideia da capa: lá as mãos quase se encostam, aqui elas se encostam (você e a IA juntos). A
        // frase do mini curso sobe para debaixo da palavra, e a cena fica embaixo.
        // "Diagrame a CTA melhor: efeito degradê no texto, desfoque nas bordas. Alinhe ele ao centro, ajuste a imagem."
        // Por isso é uma capa: o POSTS com o degradê e o desfoque nas pontas, o bloco (comenta, POSTS e a frase) junto e no
        // meio, a régua atrás do braço do robô.
        tipo: 'capa', tema: 'preto', reguasAtras: true, semPoeira: [[180, 960, 760, 390]],
        anotacoes: [{ texto: 'olha o direct, mano', x: 168, y: 806, tam: 36, rot: -3 }],
        cantos: { blur: 6, de: 0.6 },
        vinheta: { forca: 0.7, de: 0.42, centro: '50% 52%' },
        titulo: {
          pre: '<span style="font-size:64px">comenta</span>', preLado: 'centro', preEspaco: 10, script: '', condensada: 'POSTS', tam: 300, y: 356, bloco: 590,
          cor1: 'linear-gradient(90deg, #ffd000 0%, #ffb000 45%, #ff7a00 100%)', foco: { esq: 4, dir: 4, centro: [0.17, 0.83] },
        },
        blocos: [{ tipo: 'nota', x: 150, y: 640, w: 780, tam: 30, solido: true, html: '<div style="text-align:center">que eu te mando no direct <span class="serifa" style="font-size:36px;color:#d95f00;white-space:nowrap">o mini curso por R$ 39,90</span></div>' }],
      },
    ],
  };
})();
