// Situação do dia a dia (quem vende pelo Instagram): o preço está em todo lugar e o primeiro comentário pergunta o valor.
// Por que compartilha: vai pra amiga que vende pelo Instagram, ou pro grupo de social media ("é todo dia").
// A piada é com a situação (ninguém lê a legenda), não com quem comentou.
// Teste da troca: legenda, destaques, bio e comentário só existem no Instagram.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// Começa no branco porque o post de frase das 12h do dia anterior (Insights 11 vezes, 18/11) começa no preto.
// A lupa laranja aumentando a etiqueta de preço, no card invertido: o preço que ninguém enxerga.
window.FRASE = {
  titulo: 'qui 19/11 · 12h · Valor na legenda',
  slides: [
    { tema: 'branco', pos: 'meio', tamanho: 175, entrelinha: 1.04, espaco: '-0.035em', texto: 'o preço tá na\nlegenda, nos\ndestaques\ne na bio.\n1º comentário:\n[“valor?”]' },
    {
      // "story fixado" não existe no Instagram: o certo é "destaques" (revisor, 11/11).
      tema: 'preto', pos: 'baixo', tamanho: 120, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'o preço tá na legenda,\nnos destaques e na bio.\n1º comentário: [“valor?”]',
      imagem: { arq: 'imagens/lupa2/lupa-luz.jpg', recorte: 'imagens/lupa2/lupa-xicara.png', caixa: [0.0, 0.1938, 0.8198, 0.9043], x: 92, y: 140, w: 640, perto: 40, fumaca: 0 },
    },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      // Fecha a tese da própria frase (ninguém lê a legenda), sem a divisão de tarefas do card 3 de 18/11 (revisor, 11/11).
      texto: 'se ninguém lê\na legenda, que ela\nnão te custe [uma hora].',
      apoio: 'O Claude cria o post do dia e a legenda, no seu estilo.\nVocê aprova e posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase valor na legenda: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Se ninguém lê a legenda, ela não pode te custar uma hora 🦎 No mini curso Posts automáticos com Claude o post do dia chega pronto, com a legenda no seu estilo. Você confere, aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, tá na legenda. tá nos destaques. tá na bio. 🦎\n\nManda pra amiga que vende pelo Instagram e responde "valor?" quarenta vezes por dia.\n\nE se você quer o post do dia com a legenda pronta, no seu estilo, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #socialmedia #criadordeconteudo #instagram',
};
