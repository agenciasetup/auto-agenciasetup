// Frase do digital: o erro que só aparece depois que o post já tem curtidas.
// O revisor (8/11) reprovou a 1ª versão ("o erro de digitação sempre espera o post sair pra aparecer"): meme conhecido, sem detalhe nosso.
// Por que compartilha: vai pro grupo da agência ou pra social media que já apagou e repostou um post por causa de uma letra.
// A piada é com a situação (todo mundo já passou), não com ninguém.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// Sem imagem: em 8/11 o Chrome (Windows e MacBook) não respondeu, e a tarefa manda a frase no meio quando não dá para gerar no Magnific.
// Começa no branco porque o vizinho da fila (Tokens na primeira linha, 19h de 8/11) começa no preto.
window.FRASE = {
  titulo: '12h · Erro de digitação',
  pos: 'meio',
  slides: [
    { tema: 'branco', tamanho: 150, entrelinha: 1.08, espaco: '-0.035em', texto: 'revisei a arte\n3 vezes.\no erro esperou\no post ter\n[200 curtidas]\npra aparecer.' },
    { tema: 'preto', tamanho: 150, entrelinha: 1.08, espaco: '-0.035em', texto: 'revisei a arte\n3 vezes.\no erro esperou\no post ter\n[200 curtidas]\npra aparecer.' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'ache o erro\nno [rascunho],\nnão no feed.',
      apoio: 'O Claude cria o post do dia no seu estilo.\nVocê aprova e posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase erro de digitação: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Chega de achar o erro só depois de postar 🦎 No mini curso Posts automáticos com Claude o post do dia chega pronto como rascunho, com calma pra você revisar. Você aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, revisei três vezes. o erro esperou eu postar. 🦎\n\nManda pra social media que já apagou um post inteiro por causa de uma letra.\n\nE se você quer posts prontos todo dia pra você revisar com calma, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #socialmedia #revisao #criadordeconteudo',
};
