// Pedido do dono (08/11/2026), carrossel 03 do lote, às 21h de 11/11:
// "Eu não tinha tempo pra postar / Por isso eu automatizei, e vou te ensinar. Explica que por conta dos clientes e
// outros projetos da vida eu não conseguia mais postar no meu perfil. Faz 2 semanas que posto todos os dias 3 posts
// por dia e tudo de forma automática."
// Números reais (posts_redes do @agenciasetup, 09/11/2026): nenhum post de 30/09 a 25/10 (26 dias); de 26/10 a 08/11,
// 36 posts em 14 dias, todos pela fila automática; na última semana, de 2 a 4 por dia (3 em média).
// Comenta POSTS: a DM manda a página do mini curso (comenta.link em peca.json).
window.CARROSSEL = {
  nome: 'sem-tempo',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'POSTS',
  legenda: '',
  slides: [
    // 1. Capa (09/11, aprovada por ele): ele relaxado na cadeira, mãos atrás da cabeça, com a ampulheta na mesa, luz
    // Rembrandt e contorno laranja no fundo verde-petróleo (Magnific do Windows, Nano Banana Pro 2k, com as 5 fotos
    // dele). A cena é a placa (sem ele), porque a capa anima; o zoom dele cresce a partir da linha da mesa, para a borda
    // da cadeira cortada pela mesa não escorregar. Título branco com o T em amarelo.
    {
      tipo: 'capa', tema: 'preto', fundoFoto: { arq: 'filipe-ampulheta-cena.jpg', x: 40, y: 205 - 215, w: 1000 }, reguasAtras: true,
      titulo: {
        semSombra: true, pre: 'eu não tinha', preLado: 'centro',
        script: 'T', fonteScript: 'Great Vibes', scriptTam: 200, condensada: 'EMPO', tam: 172, y: 240, encaixe: -0.18, folgaTopo: 0.15,
        cor: '#ffffff', corScript: 'linear-gradient(160deg, #ffe14d 10%, #ffc400 60%, #ffb400 100%)',
        foco: { esq: 1.5, dir: 4, centro: [0.26, 0.74] },
        pos: 'pra <span class="serifa" style="color:#ffd21a">postar</span>', posTam: 46, posLado: 'centro',
      },
      assunto: { arq: 'filipe-ampulheta.png', x: 40, y: 205, w: 1000, sombra: false, brilho: false, cru: true },
      selo: { aponta: '.titulo-capa .progressivo .condensada', ponto: [0.98, 0.04], pequeno: true },
      movimento: {
        fundo: { escala: 0.012, origem: [540, 1272] },
        assunto: { escala: 0.022, origem: [540, 1272], fase: 0.15 },
        titulo: { escala: 0.018, voltas: 2, fase: 0.35 },
        luz: { brilho: 0.05, vinheta: 0.35, voltas: 3, fase: 0.2 },
      },
    },
    {
      tipo: 'miolo', tema: 'preto', rotulo: 'Calango,', vocativo: true,
      titulo: 'cliente, projeto, vida...<br>e o meu perfil <span class="serifa">parado</span>.',
      texto: 'Eu fazia o post de todo mundo, menos o meu.',
      prova: { tipo: 'numeros', tam: 220, semX: true, itens: [{ v: '0', t: 'posts no meu perfil<br>em 26 dias' }], pe: 'de 30/09 a 25/10' },
    },
    {
      tipo: 'miolo', tema: 'branco', rotulo: 'por isso',
      titulo: 'Eu <span class="serifa">automatizei</span>.',
      texto: 'Desde 26/10, o meu perfil posta todo dia.<br>Na última semana, 3 posts por dia.',
      prova: { tipo: 'numeros', tam: 170, semX: true, itens: [{ v: '36', t: 'posts em<br>14 dias' }, { v: '0', t: 'montados<br>por mim', fraco: true }], pe: 'de 26/10 a 08/11, todos pela fila automática' },
    },
    {
      tipo: 'miolo', tema: 'preto', rotulo: 'como',
      titulo: 'Uma tarefa do Claude<br><span class="serifa">todo dia</span>.',
      texto: 'Ela faz o trabalho chato e deixa tudo<br>como rascunho pra mim.',
      prova: { tipo: 'checklist', itens: ['Lê o que está em alta em IA e design', 'Escolhe o tema e diz por quê', 'Escreve no meu jeito de falar', 'Monta a arte no meu estilo'] },
    },
    {
      tipo: 'miolo', tema: 'branco', rotulo: 'o que sobrou pra mim',
      titulo: 'E eu só <span class="serifa">aprovo</span>.',
      texto: 'No celular, entre um cliente e outro.',
      prova: {
        tipo: 'notificacoes',
        itens: [
          { icone: 'claude', app: 'Claude', quando: '8h', texto: 'Posts de hoje prontos pra você aprovar' },
          { icone: 'logo', app: 'Peça aprovada', quando: '8h05', texto: 'Sai hoje às 12h, 17h e 19h' },
          { icone: 'instagram', app: 'Instagram', quando: '12h', texto: 'Post publicado no @agenciasetup' },
        ],
      },
    },
    {
      tipo: 'miolo', tema: 'preto', rotulo: 'e vou te ensinar',
      titulo: 'O seu perfil também<br>pode <span class="serifa">postar sozinho</span>.',
      texto: 'No mini curso você monta a sua tarefa:<br>estilo, pauta, texto e arte.',
      prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Você só aprova, no celular'], preco: 'R$ 39,90', pe: 'link na bio' },
    },
    {
      tipo: 'chamada', tema: 'preto', fundoFoto: { arq: 'filipe-ampulheta-cena.jpg', x: 40, y: 200 - 215, w: 1000 }, reguasAtras: true,
      titulo: { pre: 'comenta', condensada: 'POSTS', centro: true, y: 225, tam: 300, cor: '#ffffff' },
      assunto: { foto: true, arq: 'filipe-ampulheta.png', x: 40, y: 200, w: 1000, sombra: false, brilho: false, cru: true },
      blocos: [{ tipo: 'nota', x: 110, y: 1110, w: 860, tam: 30, solido: true, fundo: '#141311', html: '<span style="color:#f5f1ea">e recebe no direct o link do mini curso</span><br><span class="serifa" style="font-size:42px;color:#ffcc00">Posts automáticos com Claude</span>' }],
      selo: { aponta: '.palavra-chamada', pontoCentro: [0.86, -0.32], pequeno: true },
    },
  ],
};
