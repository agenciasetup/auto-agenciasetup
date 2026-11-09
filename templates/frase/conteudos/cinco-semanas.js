// Frase do digital: o contraste de tempo. A IA entrega rápido, a aprovação do cliente é que demora.
// Por que compartilha: vai pro sócio ou pro par que também é freela e está esperando o ok do cliente agora.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// Sem imagem: a frase no meio enche a janela (o Chrome com o Magnific estava desligado em 3/11/2026).
window.FRASE = {
  titulo: '19h · Cinco semanas',
  pos: 'meio',
  slides: [
    { tema: 'preto', tamanho: 165, entrelinha: 1.05, espaco: '-0.035em', texto: 'a IA faz em\n5 minutos.\no cliente\naprova em\n[5 semanas].' },
    { tema: 'branco', tamanho: 165, entrelinha: 1.05, espaco: '-0.035em', texto: 'a IA faz em\n5 minutos.\no cliente\naprova em\n[5 semanas].' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'no seu perfil,\nquem [aprova]\né você.',
      apoio: 'O Claude cria, você aprova e só posta.\nMini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase cinco semanas: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'No seu perfil não tem cliente pra aprovar 🦎 No mini curso Posts automáticos com Claude você monta o sistema que cria os posts do seu perfil todo dia, e o único ok que ele espera é o seu. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, o gargalo nunca foi a ferramenta. 🦎\n\nManda pro seu sócio que tá esperando o ok do cliente desde setembro.\n\nE no seu perfil quem aprova é você: comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #agencia #inteligenciaartificial #socialmedia',
};
