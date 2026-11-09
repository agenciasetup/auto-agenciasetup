// Série "em X:" (carrossel compartilhável): "tô cansado" traduzido para as línguas de quem trabalha no digital.
// Por que compartilha: cada slide é a cara de alguém (o designer, a social media, o freela, quem usa o Claude, o cliente)
// e vai para o amigo ou o grupo da agência. O fecho pede o envio pra quem "tá no limite", que volta no slide do Claude.
// A piada é com o cansaço de cada um, não com a pessoa.
// Regra do dono (29/10/2026): série termina com o card de oferta.
// Sem imagem (9/11/2026): a frase fica no meio e enche a janela, como o "Max 20x"; o objeto do dia ficou para o post
// das 19h (o fósforo). Preto porque é série de cansaço; o vizinho das 19h começa no branco.
window.FRASE = {
  titulo: '12h · Tô cansado em 5 línguas',
  tema: 'preto',
  pos: 'meio',
  // Série: o mesmo tamanho em todos os slides; nenhuma linha passa de umas 12 letras.
  tamanho: 150,
  entrelinha: 1.04,
  espaco: '-0.035em',
  slides: [
    // Capa com entrelinha 1.08: o g de "línguas" encostava no l de "digital" (revisor, 9/11).
    { texto: '*tô cansado,\nem 5 línguas\ndo digital.', entrelinha: 1.08 },
    // Todas as traduções com 3 linhas, para o rótulo ficar na mesma altura em todos os slides (revisor, 9/11).
    { rotulo: 'em designer:', texto: 'ctrl+s,\nfecha tudo\ne boa noite.' },
    { rotulo: 'em social media:', texto: 'hoje, o\nalgoritmo\nque lute.' },
    { rotulo: 'em freela:', texto: 'aceito o pix\ne mais\nnada.' },
    { rotulo: 'em Claude:', texto: 'você atingiu\no limite.\nvolte às 18h.' },
    { rotulo: 'em cliente:', texto: 'vamos deixar\npra depois\ndo carnaval.' },
    { texto: 'manda pra\nquem tá no\n[limite] hoje.' },
    {
      pos: 'baixo', tamanho: 100, entrelinha: 1.05,
      texto: 'cansado de\nfazer post\n[todo dia]?',
      apoio: 'O Claude acha o assunto e escreve no seu estilo.\nVocê aprova e posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase tô cansado no digital: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Cansou de pensar em post todo dia? 🦎 No mini curso Posts automáticos com Claude o Claude procura o assunto e monta o post no seu estilo. Você só confere, aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, qual é a sua língua do cansaço? 🦎\n\nManda pro amigo que tá no limite hoje, ou pro grupo da agência.\n\nE se você cansou de fazer post todo dia, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #designer #socialmedia #freelancer',
};
