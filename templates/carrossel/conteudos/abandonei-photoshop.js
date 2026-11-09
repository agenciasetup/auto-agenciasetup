// Pedido do dono (08/11/2026), carrossel 04 do lote, às 21h de 12/11:
// "Eu abandonei o Photoshop e adotei 100% a IA. Antigamente pra fazer um carrossel desse eu levava no mínimo 2 horas...
// Hoje, o Claude faz em minutos. Eu ensinei 100% meu estilo, e criei tarefas 100% automáticas pra criar todos os dias."
// O texto fica como ele escreveu (perguntado sobre o combo do dia 13, que ensina Photoshop: "Deixar como está").
// Comenta POSTS: a DM manda a página do mini curso (comenta.link em peca.json).
window.CARROSSEL = {
  nome: 'abandonei-photoshop',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'POSTS',
  legenda: '',
  slides: [
    // 1. Capa (09/11, refeita: "totalmente mal diagramado; dá pra descer um pouco eu; e adotei 100% a IA ficou muito
    // fora; aumentar um pouco a palavra Photoshop e colocar o e adotei de um lado e 100% a IA de outro; o cursor pode
    // selecionar 100% a IA; o símbolo do Photoshop poderia dar zoom in e zoom out e um leve giro; eu poderia ficar dando
    // zoom ao contrário"). A foto (Magnific do Windows, Nano Banana Pro 2k) foi separada em 4 camadas
    // (_local/carrossel/abandonei-photoshop/camadas.py): ele (lix04-pessoa), a lixeira (lix04-lixeira, mais alta que na
    // foto para continuar aparecendo com ele mais baixo), o ícone (lix04-icone, recortado pelo BiRefNet) e o fundo sem
    // nada (lix04-cena). Ele e a cena passam 20 px de cada lado da janela, para o zoom não mostrar borda.
    {
      tipo: 'capa', tema: 'preto', fundoFoto: { arq: 'lix04-cena.jpg', x: 20, y: 325 - 420, w: 1040 }, reguasAtras: true,
      titulo: {
        semSombra: true, pre: 'eu abandonei o', preLado: 'centro',
        script: 'P', fonteScript: 'Great Vibes', scriptTam: 210, condensada: 'HOTOSHOP', tam: 165, y: 230, encaixe: -0.16, folgaTopo: 0.15,
        cor: '#ffffff', corScript: 'linear-gradient(160deg, #ffe14d 10%, #ffc400 60%, #ffb400 100%)',
        foco: { esq: 1.5, dir: 4, centro: [0.26, 0.74] },
      },
      assunto: { arq: 'lix04-pessoa.png', x: 20, y: 325, w: 1040, sombra: false, brilho: false, cru: true },
      frente: [
        { arq: 'lix04-lixeira.png', x: 20, y: 150, w: 1040, dentro: true, solto: true },
        { arq: 'lix04-icone.png', x: 455, y: 900, w: 360, dentro: true, solto: true },
      ],
      blocos: [
        { tipo: 'escrito', x: 83, y: 408, w: 260, tam: 46, cor: '#ffffff', html: '<div style="font-family:Outfit,sans-serif;font-weight:300;text-align:right;line-height:1.1"><span class="alvo-adotei">e adotei</span></div>' },
        { tipo: 'escrito', x: 695, y: 408, w: 300, tam: 46, cor: '#ffffff', html: '<div style="font-family:Outfit,sans-serif;font-weight:300;text-align:left;line-height:1.1"><span class="alvo-ia">100% a <span class="serifa" style="color:#ffd21a;font-size:1.25em">IA</span></span></div>' },
      ],
      selo: { aponta: '.alvo-ia', ponto: [0.6, 1.0], pequeno: true },
      movimento: {
        fundo: { escala: 0.012, origem: [540, 1310] },
        assunto: { escala: -0.025, origem: [540, 1310] },
        objetos: [{}, { escala: 0.07, giro: 2.5, voltas: 1 }],
        titulo: { escala: 0.018, voltas: 2, fase: 0.35 },
        luz: { brilho: 0.05, vinheta: 0.35, voltas: 3, fase: 0.2 },
        // pedido dele (09/11): o cursor descansa 2 s em "e adotei", vai rápido até "100% a IA", seleciona e volta.
        // Vídeo de 8 s: animar.mjs abandonei-photoshop 1 8 30 loop.
        selo: { modo: 'selecionar', casa: '.alvo-adotei', de: 0.93, ate: 0 },
      },
    },
    {
      tipo: 'miolo', tema: 'preto', rotulo: 'Calango,', vocativo: true,
      titulo: 'antigamente, um carrossel<br>desse me levava <span class="serifa">2 horas</span>.',
      texto: 'No mínimo. Slide por slide,<br>camada por camada.',
      prova: { tipo: 'numeros', tam: 220, semX: true, itens: [{ v: '2h', t: 'no mínimo,<br>por carrossel' }], pe: 'no Photoshop' },
    },
    {
      tipo: 'miolo', tema: 'branco', rotulo: 'hoje',
      titulo: 'O Claude faz<br>em <span class="serifa">minutos</span>.',
      texto: 'Do assunto à arte pronta, com a minha cara.',
      prova: { tipo: 'checklist', itens: ['Escolhe o assunto do dia', 'Escreve no meu jeito de falar', 'Monta a capa em 5 camadas', 'Deixa pronto pra eu aprovar'] },
    },
    {
      tipo: 'miolo', tema: 'preto', rotulo: 'o segredo',
      titulo: 'Eu ensinei 100%<br>o meu <span class="serifa">estilo</span>.',
      texto: 'Os posts que mais deram certo aqui viraram<br>uma skill que o Claude lê antes de criar.',
      prova: { tipo: 'codigo', arquivo: 'meu-estilo/SKILL.md', tam: 29, linhas: ['cores: amarelo, preto e branco', 'titulo: palavra grande, 1ª cursiva', 'capa: bicho ou rosto perto da lente', 'voz: "Calango," e frase curta', 'nunca: roxo, travessão, cara de IA'] },
    },
    {
      tipo: 'miolo', tema: 'branco', rotulo: 'e todo dia',
      titulo: 'E criei tarefas<br><span class="serifa">automáticas</span>.',
      texto: 'Elas rodam sozinhas e deixam tudo<br>como rascunho pra eu aprovar.',
      prova: {
        tipo: 'notificacoes',
        itens: [
          { icone: 'claude', app: 'Claude', quando: '7h', texto: 'Li as notícias de IA e design de hoje' },
          { icone: 'claude', app: 'Claude', quando: '7h20', texto: 'Carrossel do dia pronto como rascunho' },
          { icone: 'logo', app: 'Peça aprovada', quando: '8h', texto: 'Sai hoje às 21h no Instagram' },
        ],
      },
    },
    {
      tipo: 'miolo', tema: 'preto', rotulo: 'a sua vez',
      titulo: 'Quer largar o Photoshop<br><span class="serifa">também</span>?',
      texto: 'No mini curso você ensina o seu estilo<br>pro Claude e ele monta os posts todo dia.',
      prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Estilo, pauta, texto e arte'], preco: 'R$ 39,90', pe: 'link na bio' },
    },
    {
      tipo: 'chamada', tema: 'preto', fundoFoto: { arq: 'filipe-lixeira-cena.jpg', x: 40, y: 410 - 420, w: 1000 }, reguasAtras: true,
      titulo: { pre: 'comenta', condensada: 'POSTS', centro: true, y: 225, tam: 300, cor: '#ffffff' },
      assunto: { foto: true, arq: 'filipe-lixeira.png', x: 40, y: 410, w: 1000, sombra: false, brilho: false, cru: true },
      blocos: [{ tipo: 'nota', x: 110, y: 1110, w: 860, tam: 30, solido: true, fundo: '#141311', html: '<span style="color:#f5f1ea">e recebe no direct o link do mini curso</span><br><span class="serifa" style="font-size:42px;color:#ffcc00">Posts automáticos com Claude</span>' }],
      selo: { aponta: '.palavra-chamada', pontoCentro: [0.86, -0.32], pequeno: true },
    },
  ],
};
