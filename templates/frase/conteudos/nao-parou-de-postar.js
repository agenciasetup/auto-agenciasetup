// Motivacional do digital: o perfil que a pessoa inveja não tem mais talento, tem mais constância.
// Por que compartilha: vai pra amiga que vive comparando o feed dela com o dos outros, ou a pessoa repõe no story pra si mesma.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// Sem imagem: a frase no meio enche a janela. Começa no branco porque o vizinho da fila (Cinco semanas, 19h) começa no preto.
window.FRASE = {
  titulo: '12h · Não parou de postar',
  pos: 'meio',
  slides: [
    { tema: 'branco', tamanho: 150, entrelinha: 1.05, espaco: '-0.035em', texto: 'o perfil que\nvocê inveja\nnão é melhor\nque o seu.\nele só não\n[parou de postar].' },
    { tema: 'preto', tamanho: 150, entrelinha: 1.05, espaco: '-0.035em', texto: 'o perfil que\nvocê inveja\nnão é melhor\nque o seu.\nele só não\n[parou de postar].' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'quem posta\n[todo dia] não\nfaz tudo na mão.',
      apoio: 'O Claude cria, você aprova e só posta.\nMini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase não parou de postar: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Quem não para de postar quase sempre tem um sistema por trás 🦎 No mini curso Posts automáticos com Claude você monta o seu: ele cria os posts do seu perfil todo dia, e você aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, o feed dele não é mágica, é calendário. 🦎\n\nManda pra amiga que vive comparando o feed dela com o dos outros.\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #constancia #marketingdigital #instagramtips',
};
