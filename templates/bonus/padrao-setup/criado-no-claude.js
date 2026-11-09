// Conteúdo pronto: "Esse carrossel foi criado no Claude" (7 slides), no Padrão Setup. Sem foto de ninguém: o assunto
// da capa e da chamada é um celular desenhado em código. Troque @seuperfil, o nome da marca e os textos pelos seus.
// Ordem dos fundos, com intenção: a capa na cor da marca; os de dentro alternando escuro e claro; a chamada volta à
// cor da marca para fechar onde a capa abriu. Coordenadas do slide inteiro: 1080 x 1350.
// Os números do slide 3 são de exemplo: no seu, use números reais do seu perfil (ou troque a prova).
window.CARROSSEL = {
  nome: 'criado-no-claude',
  marca: { perfil: '@seuperfil', nome: 'Sua marca', inicial: 'S', selo: '@seuperfil' },
  visual: { janela: true, controles: true, topo: true, reguas: false, trilho: true },
  capas: ['marca'],
  palavra: 'CLAUDE',
  legenda: 'Esse carrossel foi criado no Claude.\nEu mandei um texto. Ele leu o perfil, achou o assunto do dia, montou as 5 camadas e agendou.\nComenta CLAUDE que eu te mando o passo a passo no direct.',
  slides: [
    // 1. Capa: "esse carrossel foi / CRIADO / no Claude". O celular mostra o próprio post e passa na frente da palavra.
    {
      tipo: 'capa', tema: 'marca', luzX: '50%', luzY: '46%',
      luz: { x: 540, y: 600, r: 1000 },
      titulo: {
        pre: 'esse <span class="serifa">carrossel</span> foi',
        script: 'C', scriptTam: 350, condensada: 'RIADO', tam: 270, y: 250, encaixe: -0.18,
        foco: { esq: 5, dir: 15, centro: [0.3, 0.62] },
        pos: 'no <span class="serifa">Claude</span>', posTam: 44,
      },
      assunto: {
        forma: 'celular', x: 290, y: 486, w: 450, rot: -5, sombraX: 34, sombraY: 30,
        tela: { tipo: 'post', linha: 'esse carrossel foi', palavra: 'CRIADO' },
        foco: { angulo: 180, de: 0.72, ate: 1, max: 5 },
      },
      notificacao: { y: 1110, icone: 'ia', app: 'Claude', quando: 'agora', texto: 'Seu carrossel está pronto. 7 slides ✓' },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.55, 0.88], pequeno: true },
    },

    // 2. O contexto, com a prova: o pedido e a resposta.
    {
      tipo: 'miolo', tema: 'escuro',
      rotulo: 'Olha só,', vocativo: true,
      titulo: 'Eu não abri o Photoshop.<br>Nem o Canva.',
      texto: 'Mandei <b>um texto</b> pro Claude. Ele fez o resto.',
      prova: {
        tipo: 'conversa',
        eu: 'Faz um carrossel mostrando que foi você que fez. Visual da marca, capa na nossa cor.',
        ia: 'Feito: 7 slides. Quer que eu agende pra hoje às 18h?',
      },
    },

    // 3. O que ele leu: os números do perfil (troque pelos seus).
    {
      tipo: 'miolo', tema: 'claro',
      rotulo: 'passo 1',
      titulo: 'Primeiro, ele <span class="serifa">leu</span> o perfil.',
      texto: 'Os últimos posts do perfil. Post que pede uma palavra nos comentários teve <b>muito mais comentários</b>.',
      prova: {
        tipo: 'numeros',
        itens: [{ v: '111', t: 'comentários quando o post pede uma palavra' }, { v: '13', t: 'quando não pede', fraco: true }],
        pe: 'exemplo: troque pelos números do seu perfil',
      },
    },

    // 4. O assunto do dia: o radar.
    {
      tipo: 'miolo', tema: 'escuro',
      rotulo: 'passo 2',
      titulo: 'Depois, <span class="serifa">achou</span> o assunto do dia.',
      texto: 'As fontes do seu nicho, lidas sozinhas. O mais quente de hoje:',
      prova: {
        tipo: 'lista',
        itens: [
          { calor: 84, t: 'O assunto mais comentado do seu nicho hoje', fonte: 'site de notícias e mais 2' },
          { calor: 74, t: 'Uma novidade que muda o trabalho do seu cliente', fonte: 'blog oficial' },
          { calor: 73, t: 'Um número novo que vale um post', fonte: 'pesquisa do setor' },
        ],
      },
    },

    // 5. Como montou: as 5 camadas, de baixo para cima.
    {
      tipo: 'miolo', tema: 'claro',
      rotulo: 'passo 3',
      titulo: 'E montou tudo em <span class="serifa">5 camadas</span>.',
      prova: {
        tipo: 'lista',
        itens: [
          { marcador: '1', t: 'Fundo', sub: 'a cor da marca e a luz' },
          { marcador: '2', t: 'Título', sub: 'a palavra grande, atrás do assunto' },
          { marcador: '3', t: 'Assunto', sub: 'a foto recortada ou o celular' },
          { marcador: '4', t: 'Frente', sub: 'notificação e o que voa perto da câmera' },
          { marcador: '5', t: 'Acabamento', sub: 'janela, selo e textura' },
        ],
      },
    },

    // 6. O meu trabalho: aprovar.
    {
      tipo: 'miolo', tema: 'escuro',
      titulo: 'E eu só <span class="serifa">aprovei</span>.',
      texto: 'Ele agenda, posta e manda o material na DM de quem comenta a palavra.',
      prova: {
        tipo: 'notificacoes',
        itens: [
          { icone: 'marca', app: 'Post aprovado', quando: 'agora', texto: 'Sai hoje às 18h no Instagram' },
          { icone: 'conversa', app: 'Direct', quando: '1 min', texto: 'Material enviado para quem comentou' },
          { icone: 'baixar', app: 'Download', quando: '3 min', texto: 'Modelo de carrossel em 5 camadas' },
        ],
      },
    },

    // 7. Chamada: "comenta CLAUDE"; o celular com os comentários chegando; o que a pessoa recebe num bloco.
    {
      tipo: 'chamada', tema: 'marca', luzX: '62%', luzY: '40%',
      luz: { x: 720, y: 560, r: 950 },
      titulo: { pre: 'comenta', condensada: 'CLAUDE', x: 104, y: 262, tam: 300 },
      assunto: {
        forma: 'celular', x: 575, y: 492, w: 430, rot: 7, sombraX: 30, sombraY: 26,
        tela: { tipo: 'comentarios', itens: [
          { nome: 'ana', texto: 'CLAUDE' },
          { nome: 'joão', texto: 'CLAUDE!', quando: '1 min', cor: 'linear-gradient(140deg,#8ea2ff,#3355ff)' },
          { nome: 'bia', texto: 'CLAUDE', quando: '2 min', cor: 'linear-gradient(140deg,#ffd36b,#ff8a3d)' },
        ] },
      },
      blocos: [{
        x: 110, y: 1040, w: 860, tam: 38,
        html: 'que eu te mando o <span class="serifa" style="font-size:50px">passo a passo</span> no direct<small>o modelo das 5 camadas + o pedido que eu usei</small>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97] },
    },
  ],
};
