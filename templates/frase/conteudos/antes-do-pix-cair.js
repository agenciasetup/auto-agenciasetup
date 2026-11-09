// Frase do digital: o arquivo que só vira final quando o pagamento entra.
// Por que compartilha: é a regra que todo freela queria ter seguido; vai pro grupo dos freelas ou pro par que também espera o pix.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
window.FRASE = {
  titulo: '19h · Antes do pix cair',
  pos: 'meio',
  slides: [
    { tema: 'preto', tamanho: 172, entrelinha: 1.05, espaco: '-0.035em', texto: 'nenhum\narquivo é\n[final] antes\ndo pix cair.' },
    { tema: 'branco', tamanho: 172, entrelinha: 1.05, espaco: '-0.035em', texto: 'nenhum\narquivo é\n[final] antes\ndo pix cair.' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05,
      texto: 'enquanto o pix\nnão cai, o [Claude]\ncria os seus posts.',
      apoio: 'Todo dia um post pronto: você aprova\ne só posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 135, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase antes do pix: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Enquanto o pix não cai, o seu perfil não precisa ficar parado 🦎 No mini curso Posts automáticos com Claude você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, sem pix é só mais um arquivo bonito. 🦎\n\nManda pro grupo dos freelas, ou pra quem tá esperando aquele pix desde sexta.\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #freelancer #designer #socialmedia',
};
