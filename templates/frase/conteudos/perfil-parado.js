// Frase do digital (casa de ferreiro): a social media que posta todo dia pro cliente e deixa o próprio perfil parado.
// Por que compartilha: vai pra amiga social media ou pro grupo da agência ("somos nós").
// A piada é com a situação de quem atende cliente, não com ninguém.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// Sem imagem: em 10/11 o conector do Magnific estava desligado (não dava para baixar), e a tarefa manda a frase no meio.
// Começa no preto porque os posts de frase das 12h dos três dias anteriores (15, 16 e 17/11) começam no branco.
window.FRASE = {
  titulo: 'qua 18/11 · 12h · Perfil parado',
  pos: 'meio',
  slides: [
    { tema: 'preto', tamanho: 150, entrelinha: 1.08, espaco: '-0.035em', texto: 'posto todo dia\npro cliente.\nmeu perfil tá\nparado desde\n[março].' },
    { tema: 'branco', tamanho: 150, entrelinha: 1.08, espaco: '-0.035em', texto: 'posto todo dia\npro cliente.\nmeu perfil tá\nparado desde\n[março].' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'e se o seu perfil\nfosse o seu\n[melhor cliente]?',
      apoio: 'O Claude cria o post do dia do seu perfil, no seu estilo.\nVocê aprova e posta. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase perfil parado: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia, e você aprova e posta. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Chega de cuidar do perfil de todo mundo e esquecer do seu 🦎 No mini curso Posts automáticos com Claude o post do dia do seu perfil chega pronto, no seu estilo. Você confere, aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, o perfil do cliente tá em dia. o seu tá em março. 🦎\n\nManda pra social media que cuida de cinco perfis e esqueceu do dela.\n\nE se você quer o seu perfil com post novo sem tirar tempo dos clientes, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #socialmedia #freela #criadordeconteudo',
};
