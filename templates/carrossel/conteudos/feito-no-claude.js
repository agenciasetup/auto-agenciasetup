// Pedido do dono (08/11/2026), carrossel 01 do lote "mais 1 carrossel por dia", às 21h de 09/11:
// "Esse carrossel foi feito 100% no Claude / arrasta pro lado pra tu ver. Mostra que 90% das pessoas usa IA do jeito
// errado, e por isso o design fica feio e genérico. Esse parece feito por um Designer no Photoshop. No final, indica o
// post automático." O "90%" não tem fonte: o texto diz "quase todo mundo" (regra: número sem fonte não entra).
// A foto do bicho sai do Magnific (dito no slide 6, como manda a lição de 05/11); o resto é do Claude.
// Comenta POSTS: a DM manda a página do mini curso (comenta.link em peca.json).
window.CARROSSEL = {
  nome: 'feito-no-claude',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'POSTS',
  legenda: '',
  slides: [
    // 1. Capa (09/11, escolhida por ele: "Panda top, gostei, pode usar"): o panda-vermelho de moletom turquesa e óculos,
    // de baixo para cima em olho de peixe, assinando a foto com a caneta da mesa digitalizadora, no céu azul (Magnific do
    // Mac, Nano Banana 2 1k, ampliado 2x no computador). O céu continua para cima (cena.py) e a cena é a placa (sem o
    // panda), porque a capa anima. O corpo vaza pela borda de baixo (`frente`).
    {
      tipo: 'capa', tema: 'preto', fundoFoto: { arq: 'panda-claude-cena.jpg', x: 0, y: 210 - 233, w: 1080 }, reguasAtras: true,
      frente: [{ arq: 'bicho-panda-claude.png', x: 0, y: 210, w: 1080 }],
      titulo: {
        semSombra: true, pre: 'esse carrossel foi feito 100% no', preLado: 'centro',
        script: 'C', fonteScript: 'Great Vibes', scriptTam: 260, condensada: 'LAUDE', tam: 230, y: 250, encaixe: -0.18, folgaTopo: 0.15,
        cor: '#ffffff', corScript: 'linear-gradient(160deg, #ffe14d 10%, #ffc400 60%, #ffb400 100%)',
        foco: { esq: 1.5, dir: 4, centro: [0.26, 0.74] },
        pos: 'arrasta pro lado pra tu <span class="serifa" style="color:#ffd21a">ver</span>', posTam: 42, posLado: 'centro',
      },
      assunto: { arq: 'bicho-panda-claude.png', x: 0, y: 210, w: 1080, sombra: false, brilho: false, cru: true },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.5, 0.95], pequeno: true },
      // Capa animada (regra de 08/11): cada camada no seu ritmo; o panda cresce para baixo (origem no alto, longe do
      // título); o cursor seleciona o "ver".
      movimento: {
        fundo: { escala: -0.03, deriva: [-4, 0], faseDeriva: 0.9 },
        assunto: { escala: 0.035, origem: [540, 605], fase: 0.15, deriva: [6, 0], faseDeriva: 0.9 },
        titulo: { escala: 0.018, voltas: 2, fase: 0.35 },
        luz: { brilho: 0.05, vinheta: 0.4, voltas: 3, fase: 0.2 },
        selo: { modo: 'selecionar' },
      },
    },
    {
      tipo: 'miolo', tema: 'preto', rotulo: 'Calango,', vocativo: true,
      titulo: 'quase todo mundo usa IA<br>do <span class="serifa">jeito errado</span>.',
      texto: 'Pede um post bonito e aceita o que vier.',
      prova: {
        tipo: 'antes-depois',
        rotuloAntes: 'o pedido de quase todo mundo', antes: 'Faz um post bonito sobre marketing digital.',
        rotuloDepois: 'o que eu peço', depois: 'Lê o meu estilo, escolhe o assunto do dia e monta a capa em camadas.',
      },
    },
    {
      tipo: 'miolo', tema: 'branco', rotulo: 'o resultado',
      titulo: 'Pedido genérico,<br><span class="serifa">design genérico</span>.',
      texto: 'A IA não conhece o seu estilo. Então chuta:<br>degradê roxo, ícone 3D, foto de banco.',
      prova: {
        tipo: 'versus-imagens', itens: [{ arq: 'post-generico-ia.png', legenda: 'pedido genérico', fraco: true }, { arq: 'feito-capa-mini.jpg', legenda: 'o meu estilo' }],
      },
    },
    {
      tipo: 'miolo', tema: 'preto', rotulo: 'o jeito certo',
      titulo: 'Primeiro, ensine<br>o seu <span class="serifa">estilo</span>.',
      texto: 'Eu mostrei pro Claude os posts que mais<br>deram certo aqui. Ele guardou tudo numa skill.',
      prova: { tipo: 'codigo', arquivo: 'meu-estilo/SKILL.md', tam: 29, linhas: ['cores: amarelo, preto e branco', 'fundo: céu azul ou cor viva', 'titulo: palavra grande, 1ª letra cursiva', 'capa: bicho perto da lente', 'voz: "Calango," e frase curta', 'nunca: roxo, travessão, cara de IA'] },
    },
    {
      tipo: 'miolo', tema: 'branco', rotulo: 'depois',
      titulo: 'Monte em <span class="serifa">camadas</span>,<br>igual designer.',
      texto: 'Primeiro o fundo, depois o título,<br>por último o bicho na frente.',
      prova: { tipo: 'galeria', itens: ['feito-no-claude-ate-fundo.jpg', 'feito-no-claude-ate-titulo.jpg', 'feito-capa-mini.jpg'], legenda: 'esta capa: o fundo, o título e pronta' },
    },
    {
      tipo: 'miolo', tema: 'preto', rotulo: 'a prova',
      titulo: 'Sem abrir o<br><span class="serifa">Photoshop</span>.',
      texto: 'Quem fez cada parte deste carrossel:',
      prova: { tipo: 'checklist', itens: ['A foto do bicho: o Claude pediu no Magnific', 'O recorte: Claude, no meu computador', 'A capa e as outras 7 telas: Claude', 'A animação da capa: Claude', 'O meu trabalho: aprovar'] },
    },
    {
      tipo: 'miolo', tema: 'branco', rotulo: 'o seu assim',
      titulo: 'Quer os seus posts<br><span class="serifa">assim</span>?',
      texto: 'No mini curso você ensina o seu estilo<br>pro Claude e ele monta os posts todo dia.',
      prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Estilo, pauta, texto e arte'], preco: 'R$ 39,90', pe: 'link na bio' },
    },
    {
      tipo: 'chamada', tema: 'preto', fundoFoto: { arq: 'panda-claude-cena.jpg', x: 0, y: 80 - 233, w: 1080 }, reguasAtras: true,
      titulo: { pre: 'comenta', condensada: 'POSTS', centro: true, y: 225, tam: 300, cor: '#ffffff' },
      assunto: { foto: true, arq: 'bicho-panda-claude.png', x: 0, y: 80, w: 1080, sombra: false, brilho: false, cru: true },
      blocos: [{ tipo: 'nota', x: 110, y: 1110, w: 860, tam: 30, solido: true, fundo: '#141311', html: '<span style="color:#f5f1ea">e recebe no direct o link do mini curso</span><br><span class="serifa" style="font-size:42px;color:#ffcc00">Posts automáticos com Claude</span>' }],
      selo: { aponta: '.palavra-chamada', pontoCentro: [0.86, -0.32], pequeno: true },
    },
  ],
};
