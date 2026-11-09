// English version of texto-cara-de-ia.js ("Why everyone can spot the AI"), for @setupagency_eng. 8 slides.
// Same layout, photos and colors; only the text changes. Thesis: a 10/21/2026 study (Clark, Martin and Mahowald,
// https://arxiv.org/abs/2610.29162) compared text from 9 AIs with human text: the AI text is harder to understand.
// 4 habits that are easy to spot, each with a before and after. The "befores" are our own examples, written in English
// for this version (the AI words are the ones English readers spot: leverage, unlock, delve...).
// The big word is S + POT ("can SPOT the AI"; the Great Vibes T of "TELL" read as a J), sized up because it is half as long as ERCEBE.
// Cover and slide 8: Filipe with a "we all know" smile, holding the two proofs. The photo is filipe-v9-texto.png with the
// papers rewritten in English (_local/novos-posts/papel-en.py). The robot in a disguise was rejected ("imagem feia", 10/30/2026).
// Keyword: HUMAN (material: the prompt that takes the AI out of your text).
window.CARROSSEL = {
  nome: 'texto-cara-de-ia-en',
  marca: { perfil: '@setupagency_eng', nome: 'Setup Agency', selo: 'setup' },
  capas: [],
  palavra: 'HUMAN',
  legenda: 'Comment HUMAN and I\'ll DM you the prompt that takes the AI out of your writing 🦎\nA new study compared text from 9 AIs with text written by people. The AI text is harder to understand, and you can see why.\nThings doing what only people do, stacked words, sentences that take forever to land.\nWhich one do you see the most? 👇\n.\n.\n#copywriting #claude #writingtips',
  slides: [
    // 1. Cover: the two proofs in his hands (the AI-looking design and the text full of dashes); flat background.
    {
      tipo: 'capa', tema: 'preto',
      fundoLiso: '#211309',
      titulo: {
        pre: 'why everyone can', preEspaco: 34,
        script: 'S', fonteScript: 'Great Vibes', scriptTam: 340, condensada: 'POT', tam: 290, y: 235, semSombra: true, encaixe: -0.18, dx: -70,
        foco: { esq: 4, dir: 7, centro: [0.25, 0.8] },
        pos: 'the <span class="serifa">AI</span>', posTam: 52,
      },
      assunto: { arq: 'filipe-v9-texto-en.png', x: -10, y: 435, w: 1100, sombra: false, brilho: false },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.4, 0.9], pequeno: true },
    },

    // 2. The study.
    {
      tipo: 'miolo', tema: 'branco',
      titulo: 'A new <span class="serifa">study</span> looked at this.',
      texto: 'They compared text from 9 AIs with text written by people. The AI text is harder to understand, and you can see why.',
      prova: { tipo: 'codigo', arquivo: 'arXiv · Oct 21, 2026', linhas: ['# Why is AI-generated language', '# so hard to understand?', 'authors: Clark, Martin and Mahowald', '- 9 AIs compared with human text', '- AI writes to pack in information,', '  not to have a conversation'] },
    },

    // 3 to 6. The 4 habits, each with the before and after.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'habit 1',
      titulo: 'Things doing what<br>only <span class="serifa">people</span> do.',
      texto: 'Tools don\'t "seek" anything. People do.',
      prova: { tipo: 'antes-depois', rotuloAntes: 'sounds like AI', rotuloDepois: 'sounds like you', antes: 'This tool seeks to transform your content.', depois: 'You transform your content in 5 minutes.' },
    },
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'habit 2',
      titulo: '<span class="serifa">Stacked</span> words.',
      texto: 'A pile of words to say one thing.',
      prova: { tipo: 'antes-depois', rotuloAntes: 'sounds like AI', rotuloDepois: 'sounds like you', antes: 'Content engagement optimization strategy', depois: 'A way to get more comments' },
    },
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'habit 3',
      titulo: 'Sentences that take<br>forever to <span class="serifa">land</span>.',
      texto: 'When the verb shows up way too late, you read it twice.',
      prova: { tipo: 'antes-depois', rotuloAntes: 'sounds like AI', rotuloDepois: 'sounds like you', antes: 'The post, which I made with the prompt Claude suggested after researching the niche, blew up.', depois: 'I made the post in Claude. It blew up.' },
    },
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'habit 4',
      titulo: 'Words nobody <span class="serifa">says</span>.',
      texto: 'If you wouldn\'t say it in a voice memo, don\'t write it in a post.',
      prova: { tipo: 'riscadas', itens: ['leverage', 'unlock', 'journey', 'delve', 'elevate'] },
    },

    // 7. The mini course.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'the method',
      titulo: 'Writing your way<br>can be <span class="serifa">taught</span>.',
      texto: 'In the mini course, Claude learns how you talk and reviews the copy before you post.',
      prova: {
        tipo: 'oferta', selo: 'mini course',
        imagem: 'curso-card-en.jpg',
        titulo: 'Posts on Autopilot with Claude',
        itens: ['18 short lessons, from scratch', 'Kit with the prompts and templates', 'Ideas, copy and design on autopilot'],
        preco: '$19', pe: 'link in bio',
      },
    },

    // 8. Call to action: back to the brown of the cover.
    {
      tipo: 'chamada', tema: 'preto',
      fundoLiso: '#211309',
      titulo: { pre: 'comment', condensada: 'HUMAN', centro: true, y: 225, tam: 340 },
      assunto: { foto: true, arq: 'filipe-v9-texto-en.png', x: -10, y: 405, w: 1100, sombra: false, brilho: false },
      blocos: [{
        tipo: 'nota', x: 110, y: 1070, w: 860, tam: 38, solido: true,
        html: 'and I\'ll DM you the <span class="serifa" style="font-size:50px;color:#ff9a1f">prompt</span> 🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">that takes the AI out of your text, in your own voice</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
