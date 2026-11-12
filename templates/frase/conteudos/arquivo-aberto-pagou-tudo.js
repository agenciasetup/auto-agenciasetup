// Frase do digital (o par trabalho e preço): o arquivo aberto só vai depois do pagamento final.
// Por que compartilha: vai pro amigo designer que já mandou o editável antes do pix, ou de indireta pro grupo.
// A piada é com a situação de quem entrega antes de receber, não com o cliente.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// Do banco (corrigida em 4/11: "pagou tudo", não "o sinal"). Só de 15/11 em diante, a 14 dias do `antes-do-pix-cair` (1/11).
// Começa no preto porque o post de frase das 12h do mesmo dia (Esperando o briefing) começa no branco.
// O cadeado vermelho na diagonal, com a chave do lado, em camadas: o arquivo trancado até o pagamento.
window.FRASE = {
  titulo: 'dom 15/11 · 19h · Arquivo aberto',
  slides: [
    {
      tema: 'preto', pos: 'baixo', tamanho: 130, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'não mande o\n[arquivo aberto]\npra quem ainda\nnão pagou [tudo].',
      imagem: { arq: 'imagens/cadeado3/cadeado-luz.jpg', recorte: 'imagens/cadeado3/cadeado-xicara.png', caixa: [0.1738, 0.1963, 0.8467, 0.8452], x: 92, y: 140, w: 490, perto: 40, fumaca: 0 },
    },
    { tema: 'branco', pos: 'meio', tamanho: 175, entrelinha: 1.04, espaco: '-0.035em', texto: 'não mande o\n[arquivo aberto]\npra quem\nainda não\npagou [tudo].' },
    {
      // Fecha a tese do próprio post (o arquivo aberto vai no fim), não a do pix do `antes-do-pix-cair` (revisor, 11/11).
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'o arquivo aberto\nfica pro fim.\no seu post, [todo dia].',
      apoio: 'O Claude cria o post do dia do seu perfil, no seu estilo.\nVocê aprova e posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase arquivo aberto: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'O arquivo aberto fica pro fim do projeto. Já o post do seu perfil pode ser todo dia 🦎 No mini curso Posts automáticos com Claude o post do dia do seu perfil chega pronto, no seu estilo. Você confere, aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, o arquivo aberto é a última coisa que sai do projeto. 🦎\n\nManda pro amigo designer que já mandou o editável com o projeto pago pela metade.\n\nE se você quer o seu perfil com post novo enquanto cuida dos clientes, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #designer #freela #designgrafico',
};
