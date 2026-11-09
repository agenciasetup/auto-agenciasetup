// Frase do digital (contraste de horário): o post "programado" das 19h sempre sai em cima da hora.
// Por que compartilha: vai pro amigo social media que posta no último minuto, ou pro grupo da agência.
// A piada é com a correria de quem posta, não com uma pessoa.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// Começa no branco porque a série das 12h do mesmo dia (Tô cansado) é preta. O invertido, preto, leva o fósforo
// quase no fim (o último minuto), em camadas, gerado no site do Magnific (projeto "Agência Setup · Posts de frase").
// Não é a ampulheta porque a capa do carrossel "Eu não tinha tempo pra postar" (12/11) já tem uma.
window.FRASE = {
  titulo: '19h · O post das 19h',
  slides: [
    // "programado" é o detalhe do Instagram: sem ele, a frase servia para reunião ou apresentação (revisor, 9/11).
    { tema: 'branco', pos: 'meio', tamanho: 175, entrelinha: 1.04, espaco: '-0.035em', texto: 'o post\nprogramado\npras 19h foi\nfeito às\n[18h57].' },
    {
      // O fósforo da 2ª geração: a chama presa na ponta e o palito quase todo queimado (a 1ª tinha a chama solta).
      tema: 'preto', pos: 'baixo', tamanho: 150, entrelinha: 1.04, espaco: '-0.035em',
      texto: 'o post\nprogramado pras\n19h foi feito\nàs [18h57].',
      imagem: { arq: 'imagens/fosforo2/fosforo-luz.jpg', recorte: 'imagens/fosforo2/fosforo-xicara.png', caixa: [0.1562, 0.2329, 0.7251, 0.7754], x: 92, y: 150, w: 520, perto: 40, fumaca: 0.12 },
    },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'e se o post\ndas 19h ficasse\npronto [no almoço]?',
      apoio: 'O Claude deixa o post do dia pronto cedo, no seu estilo.\nVocê aprova e posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase post das 19h: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Chega de fazer post correndo às 18h57 🦎 No mini curso Posts automáticos com Claude o post do dia fica pronto cedo, no seu estilo, e você só confere, aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, programado pras 19h, finalizado aos 45 do segundo tempo. 🦎\n\nManda pro amigo social media que vive no último minuto.\n\nE se você quer o post do dia pronto bem antes, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #socialmedia #criadordeconteudo #instagram',
};
