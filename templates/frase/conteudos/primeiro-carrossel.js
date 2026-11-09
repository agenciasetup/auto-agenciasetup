// Motivacional do digital: o primeiro carrossel feio, com os rascunhos amassados de quem foi tentando até o centésimo.
// Por que compartilha: a pessoa repõe no story pra si mesma, ou manda pra quem tem vergonha de postar o primeiro.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// O papel em camadas (references/imagens.md da skill): gerado no site do Magnific, projeto "Agência Setup · Posts de frase".
window.FRASE = {
  titulo: '19h · O primeiro carrossel',
  slides: [
    {
      tema: 'preto', pos: 'baixo', tamanho: 124, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'seu primeiro\ncarrossel vai\nser feio.\no [centésimo], não.',
      imagem: { arq: 'imagens/papel/papel-luz.jpg', recorte: 'imagens/papel/papel-xicara.png', caixa: [0.0977, 0.0933, 0.9028, 0.9019], x: 92, y: 120, w: 480, perto: 44, fumaca: 0 },
    },
    { tema: 'branco', pos: 'meio', tamanho: 160, entrelinha: 1.05, espaco: '-0.035em', texto: 'seu primeiro\ncarrossel\nvai ser feio.\no [centésimo],\nnão.' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05,
      texto: 'do primeiro ao\ncentésimo, o [Claude]\nfaz com você.',
      apoio: 'Todo dia um post pronto: você aprova\ne só posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 135, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase primeiro carrossel: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Chega de amassar ideia antes de postar 🦎 No mini curso Posts automáticos com Claude você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, o feio publicado ensina mais que o perfeito na pasta. 🦎\n\nManda pra quem tem vergonha de postar o primeiro.\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #socialmedia #designer #criadordeconteudo',
};
