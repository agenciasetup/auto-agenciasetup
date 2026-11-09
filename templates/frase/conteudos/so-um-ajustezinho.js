// Frase do digital: o pedido pequeno que vira um projeto novo.
// Por que compartilha: todo designer e social media já recebeu esse "só um ajustezinho", e manda pro grupo da agência.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
window.FRASE = {
  titulo: '12h · Só um ajustezinho',
  pos: 'meio',
  slides: [
    { tema: 'branco', texto: 'todo “só um\najustezinho”\ntem alma de\n[rebranding].' },
    { tema: 'preto', texto: 'todo “só um\najustezinho”\ntem alma de\n[rebranding].' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100,
      texto: 'entre um ajuste\ne outro, o [Claude]\ncria os seus posts.',
      apoio: 'O Claude cria o post todo dia, você aprova\ne só posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 135, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase só um ajustezinho: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Entre um ajuste e outro, o seu perfil fica parado 🦎 No mini curso Posts automáticos com Claude você monta o sistema que cria os posts do seu perfil todo dia, e você só aprova. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, começa no tamanho da logo e termina no manual da marca. 🦎\n\nManda pro grupo da agência, ou pra quem acabou de ouvir essa frase hoje.\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #designer #socialmedia #freelancer',
};
