// Situação do dia a dia: o cliente pede "algo simples" e depois manda um mural de referências.
// Por que compartilha: indireta perfeita pro grupo da agência, ou pro amigo designer que está vivendo isso agora.
// A piada é com a situação, não com o cliente: todo mundo já pediu "algo simples" querendo muita coisa.
// Formato 6 em dois cards (a fala e a virada) e o card de oferta. Sem imagem: a frase no meio enche a janela.
// Começa no branco porque o vizinho da fila (Aprovado, 19h de 5/11) começa no preto.
window.FRASE = {
  titulo: '12h · Algo simples',
  pos: 'meio',
  slides: [
    { tema: 'branco', rotulo: 'o cliente:', tamanho: 170, entrelinha: 1.05, espaco: '-0.035em', texto: '“pode ser\nalgo bem\nsimples.”' },
    { tema: 'preto', rotulo: 'também o cliente:', tamanho: 150, entrelinha: 1.05, espaco: '-0.035em', texto: 'manda [14]\nreferências\ndo Pinterest.' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'o post do [seu\nperfil] pode ser\nsimples de verdade.',
      apoio: 'O Claude cria os posts do seu perfil, você só aprova.\nMini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase algo simples: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Pro seu perfil, simples de verdade 🦎 No mini curso Posts automáticos com Claude você ensina o seu estilo pro Claude uma vez, e ele cria os posts do seu perfil todo dia. Você só aprova. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, “simples” nunca vem com menos de 10 referências. 🦎\n\nManda pro amigo designer que acabou de abrir a pasta de referências do cliente.\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #designgrafico #socialmedia #freelancer',
};
