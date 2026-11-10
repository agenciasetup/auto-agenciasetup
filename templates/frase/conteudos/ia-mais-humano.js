// Frase do digital: quem pede pra IA "deixar mais humano" e recebe um foguete na legenda.
// Por que compartilha: vai pro amigo que posta legenda de IA com foguete, ou pro grupo da agência.
// A piada é com a situação (todo mundo que usa IA já passou), não com ninguém. Sem marca de IA na frase.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// Sem imagem: em 10/11 o conector do Magnific estava desligado (não dava para baixar), e a tarefa manda a frase no meio.
// Se voltar, a ideia é um foguete de brinquedo laranja, na diagonal, visto de cima, no card preto.
// Começa no preto porque os vizinhos da fila (Algo simples, 12h de 14/11, e Esperando o briefing, 12h de 15/11) começam no branco.
window.FRASE = {
  titulo: 'sáb 14/11 · 19h · IA mais humana',
  pos: 'meio',
  slides: [
    { tema: 'preto', tamanho: 150, entrelinha: 1.08, espaco: '-0.035em', texto: 'pedi pra IA\ndeixar a\nlegenda mais\nhumana.\nela colocou\num [foguete].' },
    { tema: 'branco', tamanho: 150, entrelinha: 1.08, espaco: '-0.035em', texto: 'pedi pra IA\ndeixar a\nlegenda mais\nhumana.\nela colocou\num [foguete].' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'quer post com IA\n[sem cara] de IA?',
      apoio: 'O Claude aprende como você fala. Sem foguete.\nVocê aprova e posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase IA mais humana: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Chega de legenda com cara de IA 🦎 No mini curso Posts automáticos com Claude você ensina o Claude a escrever do seu jeito, e ele cria o post do dia. Você confere, aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, eu pedi "mais humano" e veio um foguete. 🦎\n\nManda pro amigo que esquece de tirar o foguete da legenda.\n\nE se você quer post com IA que sai com o seu jeito de falar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #inteligenciaartificial #socialmedia #criadordeconteudo',
};
