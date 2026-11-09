// Frase do digital: o cliente que some e volta com pressa.
// Por que compartilha: todo freela e social media já viveu isso; vai pro grupo da agência, como indireta.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
window.FRASE = {
  titulo: '12h · Volta com um urgente',
  pos: 'meio',
  slides: [
    { tema: 'branco', tamanho: 165, entrelinha: 1.05, espaco: '-0.035em', texto: 'o cliente\nsome por\ntrês semanas\ne volta com\num “[urgente]”.' },
    { tema: 'preto', tamanho: 165, entrelinha: 1.05, espaco: '-0.035em', texto: 'o cliente\nsome por\ntrês semanas\ne volta com\num “[urgente]”.' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05,
      texto: 'ele some, o [Claude]\ncontinua criando\nos seus posts.',
      apoio: 'Todo dia um post pronto: você aprova\ne só posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 135, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase volta com urgente: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Cliente some, mas o seu perfil não precisa sumir junto 🦎 No mini curso Posts automáticos com Claude você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, ele levou três semanas pra responder. Você tem até amanhã. 🦎\n\nManda pro grupo da agência, ou pra quem acabou de receber esse "urgente".\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #freelancer #socialmedia #designer',
};
