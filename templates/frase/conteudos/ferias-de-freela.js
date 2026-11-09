// Frase do digital: o único descanso de quem é freela é quando o cliente viaja.
// Por que compartilha: vai pro amigo freela que só respira quando o cliente some de férias, ou pro grupo da agência.
// A piada é com a rotina do freela, não com o cliente.
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// O óculos em camadas (references/imagens.md da skill): gerado no site do Magnific, projeto "Agência Setup · Posts de frase".
// Por que o óculos de sol: é o objeto das férias da frase, na diagonal e com cor viva. Sem fumaça (fumaca: 0); a luz é um
// quadrado preto porque o fundo da foto saiu num degradê cinza (mesma solução do celular de 5/11).
// Começa no preto porque o vizinho da fila (Esperando o briefing, 12h de 7/11) começa no branco.
window.FRASE = {
  titulo: '19h · Férias de freela',
  slides: [
    {
      tema: 'preto', pos: 'baixo', tamanho: 118, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'férias de freela\né quando o cliente\nposta story na\n[praia].',
      imagem: { arq: 'imagens/oculos/oculos-luz.jpg', recorte: 'imagens/oculos/oculos-xicara.png', caixa: [0.1045, 0.3066, 0.8765, 0.7124], x: 92, y: 130, w: 770, perto: 50, fumaca: 0 },
    },
    { tema: 'branco', pos: 'meio', tamanho: 175, entrelinha: 1.02, espaco: '-0.035em', texto: 'férias de\nfreela é\nquando o\ncliente posta\nstory na\n[praia].' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'o seu perfil não\nprecisa esperar as\n[férias] pra ter post.',
      apoio: 'O Claude cria o post do dia, você aprova e posta.\nMini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase férias de freela: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Sem tempo pro seu próprio perfil? 🦎 No mini curso Posts automáticos com Claude você monta o sistema que cria o post do seu perfil todo dia, e você só aprova e posta. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, o melhor dia do ano é quando o cliente posta o pé na areia. 🦎\n\nManda pro amigo freela que só descansa quando o cliente viaja.\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #freelancer #socialmedia #designer',
};
