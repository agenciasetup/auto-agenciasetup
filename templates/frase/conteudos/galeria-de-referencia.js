// Frase do digital: a galeria do celular de quem trabalha com design e conteúdo é toda de referência.
// Por que compartilha: vai pro amigo designer que não acha a foto do aniversário no meio dos prints, ou a pessoa repõe no story ("sou eu").
// Regra do dono (29/10/2026): post de 1 frase tem 3 cards: a frase, a mesma frase invertida e o card de oferta.
// O celular em camadas (references/imagens.md da skill): gerado no site do Magnific, projeto "Agência Setup · Posts de frase".
// Por que o celular: é a própria galeria da frase, cheia de referências coloridas. Deitado na diagonal, sem fumaça (fumaca: 0).
window.FRASE = {
  titulo: '19h · Galeria de referência',
  slides: [
    {
      tema: 'preto', pos: 'baixo', rotulo: 'minha galeria:', tamanho: 104, entrelinha: 1.05, espaco: '-0.035em',
      texto: '9 mil prints de\n[referência].\n3 fotos da\nfamília.',
      imagem: { arq: 'imagens/galeria/galeria-luz.jpg', recorte: 'imagens/galeria/galeria-xicara.png', caixa: [0.1831, 0.1978, 0.8057, 0.7866], x: 92, y: 130, w: 490, perto: 50, fumaca: 0 },
    },
    { tema: 'branco', pos: 'meio', rotulo: 'minha galeria:', tamanho: 150, entrelinha: 1.05, espaco: '-0.035em', texto: '9 mil prints de\n[referência].\n3 fotos da\nfamília.' },
    {
      tema: 'preto', pos: 'baixo', tamanho: 100, entrelinha: 1.05, espaco: '-0.035em',
      texto: 'a referência\nvocê já tem.\nfalta virar [post].',
      apoio: 'O Claude faz o post do dia no seu estilo.\nMini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 120, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase galeria de referência: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Nele você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Tanta referência salva e o post do dia ainda por fazer? 🦎 No mini curso Posts automáticos com Claude você monta o sistema que transforma o seu estilo em post pronto todo dia, e você só aprova. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, a pasta de referência é o nosso álbum de família. 🦎\n\nManda pro amigo designer que não acha a foto do aniversário no meio de 9 mil prints.\n\nE se você quer posts prontos todo dia pra você aprovar, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #designgrafico #designer #socialmedia',
};
