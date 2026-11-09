// Frase do digital: a desculpa oficial de quem trabalha com design e conteúdo para não começar.
// Por que compartilha: vai pro amigo designer que está "esperando o briefing" há uma semana, ou pro grupo da agência.
// A piada é com a gente (a desculpa), não com o cliente.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// Sem imagem: a frase no meio enche a janela. Começa no branco porque o vizinho da fila (Galeria de referência, 19h de 6/11) começa no preto.
window.FRASE = {
  titulo: '12h · Esperando o briefing',
  pos: 'meio',
  slides: [
    { tema: 'branco', tamanho: 175, entrelinha: 1.02, espaco: '-0.035em', texto: 'eu não\nprocrastino.\neu tô\nesperando o\n[briefing].' },
    { tema: 'preto', tamanho: 175, entrelinha: 1.02, espaco: '-0.035em', texto: 'eu não\nprocrastino.\neu tô\nesperando o\n[briefing].' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'o post do seu perfil\nnunca vai ter\n[briefing].',
      apoio: 'O Claude acha o assunto e faz o post.\nVocê aprova e posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase esperando o briefing: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Cansado de esperar o assunto do post cair do céu? 🦎 No mini curso Posts automáticos com Claude você monta o sistema que acha o assunto, escreve e monta o post do seu perfil todo dia, e você aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, a desculpa mais profissional do mercado. 🦎\n\nManda pro amigo designer que tá “esperando o briefing” desde segunda.\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #designgrafico #designer #freelancer',
};
