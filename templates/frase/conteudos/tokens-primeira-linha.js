// Frase do digital: gastar o Claude (e a cabeça) escrevendo a proposta perfeita pra quem responde "quanto fica?".
// Por que compartilha: vai pro amigo freela que escreve proposta de 3 páginas e recebe "quanto fica?", ou pro grupo da agência.
// A piada é com a situação (o texto que ninguém lê), não com o cliente.
// Entrou no lugar do "arquivo aberto" em 7/11: o revisor reprovou aquele por repetir a tese do antes-do-pix-cair (1/11).
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// Sem imagem: a frase no meio enche a janela. Começa no preto porque o vizinho da fila (Reels do gato, 12h de 8/11) começa no branco.
window.FRASE = {
  titulo: '19h · Tokens na primeira linha',
  pos: 'meio',
  slides: [
    { tema: 'preto', tamanho: 165, entrelinha: 1.02, espaco: '-0.035em', texto: 'não gaste\nseus [tokens]\ncom quem não\nlê nem a\nprimeira linha.' },
    { tema: 'branco', tamanho: 165, entrelinha: 1.02, espaco: '-0.035em', texto: 'não gaste\nseus [tokens]\ncom quem não\nlê nem a\nprimeira linha.' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'o seu público lê.\ngaste seus [tokens]\ncom ele.',
      apoio: 'O Claude cria o post do dia no seu estilo.\nVocê aprova e posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase tokens na primeira linha: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Gaste seus tokens com quem lê: o seu público 🦎 No mini curso Posts automáticos com Claude você ensina o seu estilo pro Claude uma vez, e ele cria o post do seu perfil todo dia. Você aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, proposta de 3 páginas pra quem responde "quanto fica?". 🦎\n\nManda pro amigo que caprichou no texto e recebeu um "vi agora".\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #claude #freelancer #propostacomercial',
};
