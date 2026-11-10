// Frase do digital: quem posta e fica abrindo os insights de minuto em minuto.
// Por que compartilha: vai pro amigo que posta e fica atualizando a tela, ou pro grupo da agência.
// A piada é com a ansiedade de quem posta, não com ninguém. "insights" é o detalhe do Instagram (não serve para e-mail).
// Entrou no lugar do `perfil-parado`, que o revisor (10/11) mandou para 27/11 em diante (mesma tese do carrossel de 11/11).
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// Sem imagem: em 10/11 o conector do Magnific estava desligado (não dava para baixar), e a tarefa manda a frase no meio.
// Começa no preto porque os posts de frase das 12h dos três dias anteriores (15, 16 e 17/11) começam no branco.
window.FRASE = {
  titulo: 'qua 18/11 · 12h · Insights 11 vezes',
  pos: 'meio',
  slides: [
    { tema: 'preto', tamanho: 160, entrelinha: 1.08, espaco: '-0.035em', texto: 'postei há\n4 minutos.\njá abri\nos insights\n[11 vezes].' },
    { tema: 'branco', tamanho: 160, entrelinha: 1.08, espaco: '-0.035em', texto: 'postei há\n4 minutos.\njá abri\nos insights\n[11 vezes].' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'você confere\nos números. o Claude\nfaz o [próximo].',
      apoio: 'O Claude cria o post do dia no seu estilo.\nVocê aprova e posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 105, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase insights 11 vezes: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Enquanto você confere os números do post de hoje, o de amanhã já pode estar pronto 🦎 No mini curso Posts automáticos com Claude o Claude cria o post do dia no seu estilo. Você confere, aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, postar é rápido. difícil é largar o celular depois. 🦎\n\nManda pro amigo que posta e fica atualizando a tela.\n\nE se você quer o próximo post pronto enquanto confere os números, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #socialmedia #instagram #criadordeconteudo',
};
