// Frase do digital: o carrossel bom prende como fofoca, ninguém para no começo.
// Por que compartilha: vai pro par de fofoca que também faz carrossel, ou pro grupo da agência.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
window.FRASE = {
  titulo: '12h · Igual fofoca',
  pos: 'meio',
  slides: [
    { tema: 'branco', tamanho: 165, entrelinha: 1.05, espaco: '-0.035em', texto: 'carrossel bom\né igual fofoca:\nninguém para\nno [primeiro\nslide].' },
    { tema: 'preto', tamanho: 165, entrelinha: 1.05, espaco: '-0.035em', texto: 'carrossel bom\né igual fofoca:\nninguém para\nno [primeiro\nslide].' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'o assunto da fofoca,\no [Claude] traz\ntodo dia.',
      apoio: 'O Claude cria, você aprova e só posta.\nMini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase igual fofoca: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Acabou aquela hora procurando assunto 🦎 No mini curso Posts automáticos com Claude você monta o sistema que acha o assunto e cria os posts do seu perfil todo dia, e você aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, a capa só conta o começo da fofoca. 🦎\n\nManda pra sua dupla de fofoca que também faz carrossel.\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #socialmedia #designer #carrossel',
};
