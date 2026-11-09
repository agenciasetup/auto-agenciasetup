// English version of eu-te-amo-no-digital.js, for @setupagency_eng. Series "in X:" (shareable carousel): "I love you"
// translated into the languages of people who work online. Why it gets shared: every slide is someone (the designer,
// the freelancer, the social media manager) and goes to a partner, a friend or the group chat. The last one asks for
// the share. Adapted, not translated: the Pix line ("o pix caiu antes do prazo") became the invoice paid early.
// Same coffee photos as the Portuguese post (the freelancer cup still has the Pix symbol in the foam: it reads as a
// plain diamond outside Brazil). The offer card shows the English sales page (imagens/curso-tela-en.jpg, from
// agenciasetup.com; _local/en-posts/gerar-imagens.mjs tela).
const CAIXAS = {
  claude: [0.0977, 0.0884, 0.9204, 0.9165], cliente: [0.2383, 0.3198, 0.7627, 0.8452], 'coracao-a': [0.2017, 0.3423, 0.7803, 0.9175],
  designer: [0.1689, 0.1743, 0.855, 0.8364], freela: [0.1396, 0.2554, 0.8364, 0.9473], ia: [0.1968, 0.2837, 0.8179, 0.8638],
  instagram: [0.1904, 0.2764, 0.8071, 0.8784], manda: [0.1802, 0.3296, 0.8125, 0.9023], social: [0.2144, 0.248, 0.8037, 0.834],
};
const cafe = (nome, w, y) => ({ arq: `imagens/cafe/preto/${nome}-luz.jpg`, recorte: `imagens/cafe/preto/${nome}-xicara.png`, caixa: CAIXAS[nome], x: 92, y, w, perto: 40 });

window.FRASE = {
  marca: { perfil: '@setupagency_eng', nome: 'Setup Agency' },
  titulo: 'I love you in 7 digital languages',
  tema: 'preto',
  pos: 'baixo',
  // Series: the same size on every slide; lines kept to about 12 letters, like the Portuguese one.
  tamanho: 124,
  slides: [
    { texto: '*I love you,\nin 7 digital\nlanguages.', tamanho: 150, imagem: cafe('coracao-a', 500, 175) },
    { rotulo: 'in Claude:', texto: 'your weekly\nlimit has\nreset.', imagem: cafe('claude', 400, 130) },
    { rotulo: 'in designer:', texto: 'I sent you\nthe source\nfiles.', imagem: cafe('designer', 400, 130) },
    { rotulo: 'in client:', texto: 'go ahead,\nit\'s approved.', imagem: cafe('cliente', 400, 130) },
    { rotulo: 'in Instagram:', texto: 'I sent you\na reel at\n3 AM.', imagem: cafe('instagram', 400, 130) },
    { rotulo: 'in freelancer:', texto: 'the invoice\ngot paid\nearly.', imagem: cafe('freela', 400, 130) },
    { rotulo: 'in AI:', texto: 'you\'re\nabsolutely\nright, I\'ll\nfix it.', imagem: cafe('ia', 400, 130) },
    { rotulo: 'in social media:', texto: 'take the\nweekend off,\nit\'s all\nscheduled.', imagem: cafe('social', 400, 130) },
    // 4 lines in English (3 in Portuguese): the cup is a bit smaller (440) so it doesn't touch the text.
    { texto: 'send this to\nsomeone who\nspeaks your\n[language].', tamanho: 150, imagem: cafe('manda', 440, 175) },
    // The offer card (owner's rule, 10/29/2026: every post gets one more card that sells the mini course), with the
    // notebook showing the English sales page.
    {
      tamanho: 100,
      texto: 'want posts\nlike this [every day]\non your profile?',
      apoio: 'Claude creates, you approve and the post goes\nout on its own. Mini course for just $19.',
      cta: { texto: 'Comment', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela-en.jpg', moldura: 'notebook', x: 190, y: 135, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Phrase I love you in digital (EN): POSTS (mini course)', modo: 'direto',
    link: 'https://agenciasetup.com/',
    variantes: [
      { id: 'a', nome: 'straight to the point', dm: 'Hey {usuario}! 🦎 Here\'s my mini course, Posts on Autopilot with Claude. In a few short lessons you set up the system that creates your posts every day and just waits for your ok. All for $19.', botao: 'See the course 🦎', publico: ['Sent it to your DMs 🦎', 'Just sent it, check your DMs!', 'It\'s in your DMs 🦎'] },
      { id: 'b', nome: 'the love language', dm: 'Want to hear my love language? Posts that make themselves 💛 In Posts on Autopilot with Claude you set up the system that creates your posts every day, and you just approve. $19.', botao: 'I want the course', publico: ['Check your DMs 💛', 'Sent you everything in DMs!', 'Check your DMs 🦎'] },
    ],
  },
  legenda: 'what\'s your love language? 💛\n\nsend this to your freelance partner, to the client who approves on the first try, or to whoever sends you reels at 3 AM.\n\nAnd if you want posts like this going out on your profile every day, comment POSTS and I\'ll send you my mini course, Posts on Autopilot with Claude, for just $19.\n.\n.\n#designer #socialmedia #claude',
};

