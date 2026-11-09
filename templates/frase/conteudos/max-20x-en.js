// English version of max-20x.js, for @setupagency_eng. Digital-life phrase, with Claude's plans as the measure of
// effort and price. Why it gets shared: every freelancer has overdelivered for too little; anyone on Claude gets
// Max 20x right away. Owner's rule (10/29/2026): every post gets one extra card. 1-phrase post: the phrase, the same
// phrase in the inverted theme (black) and the offer card for the mini course, with "Comment POSTS".
window.FRASE = {
  marca: { perfil: '@setupagency_eng', nome: 'Setup Agency' },
  titulo: 'Phrase: Max 20x for someone paying for Pro',
  pos: 'meio',
  slides: [
    { tema: 'branco', texto: 'don\'t do\n[Max 20x] work\nfor someone who\nonly pays for Pro.' },
    { tema: 'preto', texto: 'don\'t do\n[Max 20x] work\nfor someone who\nonly pays for Pro.' },
    {
      tema: 'preto', tamanho: 132,
      texto: 'want posts\nlike this [every day]\non your profile?',
      apoio: 'Claude creates, you approve and the post goes\nout on its own. Mini course for just $19.',
      cta: { texto: 'Comment', palavra: 'POSTS' },
    },
  ],
  // Whoever comments POSTS gets the English course page in the DM (turns on by itself when the post goes out).
  comenta: {
    palavra: 'POSTS', nome: 'Phrase Max 20x (EN): POSTS (mini course)', modo: 'direto',
    link: 'https://agenciasetup.com/',
    variantes: [
      { id: 'a', nome: 'straight to the point', dm: 'Hey {usuario}! 🦎 Here\'s my mini course, Posts on Autopilot with Claude. In a few short lessons you set up the system that creates your posts every day and just waits for your ok. All for $19.', botao: 'See the course 🦎', publico: ['Sent it to your DMs 🦎', 'Just sent it, check your DMs!', 'It\'s in your DMs 🦎'] },
      { id: 'b', nome: 'the pain', dm: 'No more late nights making posts 🦎 In Posts on Autopilot with Claude you set up the system that creates your posts every day, and you just approve. It\'s $19.', botao: 'I want the course', publico: ['Check your DMs, I sent it 🦎', 'Sent you everything in DMs!', 'Check your DMs 🦎'] },
    ],
  },
  legenda: 'Your effort comes in plans too. 🦎\n\nSend this to the friend who delivers Max 20x and charges like it\'s Free.\n\nAnd if you want posts like this going out on your profile every day, comment POSTS and I\'ll send you my mini course, Posts on Autopilot with Claude, for just $19.\n.\n.\n#designer #socialmedia #freelancer',
};

