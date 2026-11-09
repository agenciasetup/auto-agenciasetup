// Frase do digital: a palavra que todo designer e social media espera ouvir do cliente.
// Por que compartilha: vai pro designer que está na sétima versão esperando essa palavra, ou pro grupo da agência.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// O carimbo em camadas (references/imagens.md da skill): gerado no site do Magnific, projeto "Agência Setup · Posts de frase".
// Por que o carimbo: é o objeto do "aprovado", com o visto na borracha. Sem fumaça (fumaca: 0).
// Trocada em 4/11/2026 no lugar de "não mande o arquivo aberto pra quem ainda não pagou o sinal" (o revisor reprovou: o
// arquivo aberto vai depois do pagamento final, não do sinal, e a tese repetia o "antes do pix cair").
window.FRASE = {
  titulo: '19h · Aprovado',
  slides: [
    {
      tema: 'preto', pos: 'baixo', tamanho: 124, entrelinha: 1.05, espaco: '-0.035em',
      texto: '“[aprovado]” é a\npalavra mais\nbonita da língua\nportuguesa.',
      imagem: { arq: 'imagens/carimbo/carimbo-luz.jpg', recorte: 'imagens/carimbo/carimbo-xicara.png', caixa: [0.2119, 0.2065, 0.7646, 0.7397], x: 92, y: 130, w: 500, perto: 70, fumaca: 0 },
    },
    { tema: 'branco', pos: 'meio', tamanho: 150, entrelinha: 1.05, espaco: '-0.035em', texto: '“[aprovado]”\né a palavra\nmais bonita\nda língua\nportuguesa.' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'e se o post\ndo dia chegasse\n[pronto]?',
      apoio: 'O Claude cria o post do dia, você só posta.\nMini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase aprovado: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Imagina abrir o dia com o post pronto, só esperando você postar 🦎 No mini curso Posts automáticos com Claude você monta o sistema que cria os posts do seu perfil todo dia, e você só posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, nenhuma música chega perto. 🦎\n\nManda pro amigo designer que comemora cada “aprovado” como gol de final.\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #designgrafico #identidadevisual #publicitario',
};
