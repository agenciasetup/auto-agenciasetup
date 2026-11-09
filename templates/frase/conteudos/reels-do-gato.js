// Frase do digital (contraste): o reels caprichado flopa e o vídeo tremido do gato explode.
// Por que compartilha: vai pro amigo que edita reels a madrugada inteira, ou pro grupo de criadores ("toda semana é isso").
// A piada é com o algoritmo e com a gente, não com ninguém.
// O detalhe nosso (trilha, legenda, transição; o gato) veio do revisor em 7/11: a primeira versão ("editado em 4 horas /
// gravado no carro") era quase o meme de fora traduzido (teste 7, originalidade).
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// Sem imagem: a frase no meio enche a janela. Começa no branco porque o vizinho da fila (Férias de freela, 19h de 7/11) começa no preto.
window.FRASE = {
  titulo: '12h · Reels do gato',
  pos: 'meio',
  slides: [
    { tema: 'branco', tamanho: 150, entrelinha: 1.08, espaco: '-0.035em', texto: 'reels com trilha,\nlegenda e\ntransição:\n200 views.\nreels tremido\ndo seu gato:\n[40 mil].' },
    { tema: 'preto', tamanho: 150, entrelinha: 1.08, espaco: '-0.035em', texto: 'reels com trilha,\nlegenda e\ntransição:\n200 views.\nreels tremido\ndo seu gato:\n[40 mil].' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'o algoritmo não vê\na sua [edição].\nvê se você postou.',
      apoio: 'O Claude cria o post do dia no seu estilo.\nVocê aprova e posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase reels do gato: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Chega de horas editando um post só 🦎 No mini curso Posts automáticos com Claude você monta o sistema que acha o assunto, escreve e monta o post do seu perfil todo dia, e você aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, o algoritmo não viu a sua transição. 🦎\n\nManda pro amigo que tá editando reels desde as 22h.\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #reels #criadordeconteudo #socialmedia',
};
