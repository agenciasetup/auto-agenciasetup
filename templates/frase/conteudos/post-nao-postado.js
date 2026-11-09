// Motivacional do digital: o post parado no rascunho, com o zero da frase nas faces de um dado (chance que nem chega a ser jogada).
// Por que compartilha: a pessoa repõe no story pra si mesma, ou manda pra quem vive adiando o primeiro post.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// O dado em camadas (references/imagens.md da skill): gerado no site do Magnific, projeto "Agência Setup · Posts de frase". O dono pediu para trocar o café (30/10/2026).
window.FRASE = {
  titulo: '19h · O post que você não postou',
  slides: [
    {
      tema: 'preto', pos: 'baixo', tamanho: 124, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'o post que\nvocê não postou\ntem [zero] chance\nde viralizar.',
      imagem: { arq: 'imagens/zero/dado-luz.jpg', recorte: 'imagens/zero/dado-xicara.png', caixa: [0.1372, 0.0881, 0.8598, 0.911], x: 92, y: 175, w: 440, perto: 72, fumaca: 0 },
    },
    { tema: 'branco', pos: 'meio', tamanho: 160, entrelinha: 1.05, espaco: '-0.035em', texto: 'o post que\nvocê não\npostou tem\n[zero] chance\nde viralizar.' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100,
      texto: 'o próximo post\npode vir [pronto].\nquer ver como?',
      apoio: 'O Claude cria o post todo dia, você aprova\ne só posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 135, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase post não postado: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Chega de post parado no rascunho 🦎 No mini curso Posts automáticos com Claude você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, rascunho não tem alcance. 🦎\n\nManda pra quem tá há três meses ajustando o primeiro post.\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #socialmedia #designer #criadordeconteudo',
};
