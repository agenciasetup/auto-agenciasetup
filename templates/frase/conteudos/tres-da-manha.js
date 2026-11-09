// Frase do digital (contraste de horário): a ideia boa de post nunca chega no horário de trabalho.
// Por que compartilha: vai pro amigo criador que manda áudio de ideia de madrugada, ou pro grupo de social media.
// A piada é com a situação (a cabeça que só cria na hora de dormir).
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// Sem imagem: em 8/11 o Chrome não respondeu; a frase no meio enche a janela.
// Começa no preto (frase de madrugada) porque o vizinho das 12h (Erro de digitação) começa no branco.
window.FRASE = {
  titulo: '19h · Três da manhã',
  pos: 'meio',
  slides: [
    { tema: 'preto', tamanho: 165, entrelinha: 1.04, espaco: '-0.035em', texto: 'a ideia boa\nde post não\nchega às 9h.\nchega às\n[3 da manhã].' },
    { tema: 'branco', tamanho: 165, entrelinha: 1.04, espaco: '-0.035em', texto: 'a ideia boa\nde post não\nchega às 9h.\nchega às\n[3 da manhã].' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'anota a ideia.\nde manhã, o Claude\nmonta o [post].',
      apoio: 'Você guarda a ideia, ele escreve no seu estilo.\nVocê aprova e posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase três da manhã: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Chega de perder ideia boa de madrugada 🦎 No mini curso Posts automáticos com Claude você guarda a ideia, e o Claude escreve e monta o post no seu estilo. Você aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, às 9h: nada. às 3h: um carrossel inteiro na cabeça. 🦎\n\nManda pro amigo que te manda áudio de ideia de madrugada.\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #criadordeconteudo #socialmedia #ideias',
};
