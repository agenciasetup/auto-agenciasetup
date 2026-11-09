// Motivacional do digital: o preço não baixa só porque o cliente sumiu. A etiqueta de preço inteira, com o R$, conta a frase.
// Por que compartilha: vai pra quem baixou o orçamento por medo do silêncio, ou a pessoa repõe no story pra si mesma.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// A etiqueta em camadas (references/imagens.md da skill): gerada no site do Magnific, projeto "Agência Setup · Posts de frase".
window.FRASE = {
  titulo: '19h · Deixou no vácuo',
  slides: [
    {
      tema: 'preto', pos: 'baixo', tamanho: 124, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'o seu preço\nnão cai só\nporque o cliente\nte deixou [no vácuo].',
      imagem: { arq: 'imagens/etiqueta/etiqueta-luz.jpg', recorte: 'imagens/etiqueta/etiqueta-xicara.png', caixa: [0.0933, 0.2339, 0.9233, 0.7651], x: 92, y: 120, w: 600, perto: 44, fumaca: 0 },
    },
    { tema: 'branco', pos: 'meio', tamanho: 150, entrelinha: 1.05, espaco: '-0.035em', texto: 'o seu preço\nnão cai\nsó porque\no cliente\nte deixou\n[no vácuo].' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'o cliente sumiu.\nseu perfil, não:\n[post todo dia].',
      apoio: 'O Claude cria, você aprova e só posta.\nMini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase deixou no vácuo: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Enquanto o cliente não responde, o seu perfil continua aparecendo 🦎 No mini curso Posts automáticos com Claude você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, vácuo não é contraproposta. 🦎\n\nManda pra quem baixou o orçamento só porque o cliente sumiu.\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #freelancer #socialmedia #designer',
};
