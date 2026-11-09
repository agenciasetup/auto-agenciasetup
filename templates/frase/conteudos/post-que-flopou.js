// Motivacional do digital: o post que flopou pesa só pra quem postou. Ninguém mais lembra.
// Por que compartilha: a pessoa repõe no story pra si mesma, ou manda pra amiga que apagou o post de ontem.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// Sem imagem: a frase no meio enche a janela (o Chrome com o Magnific estava desligado em 3/11/2026).
window.FRASE = {
  titulo: '12h · O post que flopou',
  pos: 'meio',
  slides: [
    { tema: 'branco', tamanho: 165, entrelinha: 1.05, espaco: '-0.035em', texto: 'ninguém\nlembra do\nseu post que\n[flopou].\nsó você.' },
    { tema: 'preto', tamanho: 165, entrelinha: 1.05, espaco: '-0.035em', texto: 'ninguém\nlembra do\nseu post que\n[flopou].\nsó você.' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'um post flopou?\no [próximo] já\nvem pronto.',
      apoio: 'O Claude cria, você aprova e só posta.\nMini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase post que flopou: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Post que flopou não trava ninguém quando o próximo já está pronto 🦎 No mini curso Posts automáticos com Claude você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, seu seguidor já rolou o feed. 🦎\n\nManda pra quem apagou o post de ontem porque teve poucas curtidas.\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #socialmedia #criadordeconteudo #instagram',
};
