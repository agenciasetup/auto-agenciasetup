// Motivacional do digital: a energia medida como o limite semanal do Claude.
// Por que compartilha: quem usa Claude conhece o limite da semana; a pessoa repõe no story ou manda pra quem começa a semana a mil.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
window.FRASE = {
  titulo: '12h · Token semanal',
  pos: 'meio',
  slides: [
    { tema: 'branco', tamanho: 128, entrelinha: 1.05, espaco: '-0.035em', texto: 'trate sua\nenergia como\n[tokens semanais]:\nnão dá pra\ngastar tudo\nna segunda.' },
    { tema: 'preto', tamanho: 128, entrelinha: 1.05, espaco: '-0.035em', texto: 'trate sua\nenergia como\n[tokens semanais]:\nnão dá pra\ngastar tudo\nna segunda.' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05,
      texto: 'deixa o [Claude]\ngastar o token,\nnão a sua energia.',
      apoio: 'O Claude cria o post todo dia, você aprova\ne só posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 135, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase token semanal: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Gaste a sua energia com o que importa 🦎 No mini curso Posts automáticos com Claude você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, quem gasta tudo na segunda passa o resto da semana esperando renovar. 🦎\n\nManda pra quem começa a semana a mil.\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #socialmedia #designer #claude',
};
