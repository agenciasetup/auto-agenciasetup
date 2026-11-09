// English version of oferta-black.js (the Black Friday offer carousel, 11/04/2026), for @setupagency_eng and the
// English course "Posts on Autopilot with Claude" (US$ 19, 18 lessons + kit). Same 6 slides, same layout and photos.
// Adapted, not translated: no "calango"; the "Calango," on slide 2 became the course name as the label. The cards in
// his hands said "COMO" (Portuguese): filipe-magico-2-en.png has "HOW" written over them. The stages on slide 5 come
// from the English cover (made-in-claude, seen up close without the badge: oferta-etapa-N-zoom-en.jpg).
// Slides 2 to 5 have `anima: true` and also come out as MP4 (templates/carrossel/ferramentas/animar.mjs).
window.CARROSSEL = {
  nome: 'oferta-black-en',
  marca: { perfil: '@setupagency_eng', nome: 'Setup Agency', selo: 'setup' },
  capas: [],
  palavra: 'POSTS',
  legenda: 'Comment POSTS and I\'ll DM you the link to the mini course! 🦎 (or tap the link in bio)\nLots of people want to post every day, but don\'t have time to sit down and design. In my mini course, Posts on Autopilot with Claude, I\'ll show you how to set up Claude so it:\n→ learns your style (colors, fonts and voice)\n→ finds what\'s trending and writes in your voice\n→ builds the design in stages, so nothing looks AI-made\nIt works for your profile, your business and your clients.\n18 short lessons + the ready-made kit, for $19 this Black Friday only. Don\'t miss it! 🔥\n.\n.\n#claude #aidesign #socialmediatips',
  slides: [
    // 1. Cover: Filipe as a magician, the carousel falling from one hand to the other.
    {
      tipo: 'capa', tema: 'preto',
      titulo: {
        pre: 'automate your',
        script: 'C', fonteScript: 'Great Vibes', scriptTam: 250, condensada: 'AROUSELS', tam: 160, y: 248, encaixe: -0.16, folgaTopo: 0.12, dx: -30,
        foco: { esq: 4, dir: 10, centro: [0.26, 0.6] },
        pos: 'with Claude, in your <span class="serifa">style</span>', posTam: 42,
      },
      fundoFoto: { arq: 'oferta-cena.jpg', x: -130, y: 33, w: 1340 },
      assunto: { arq: 'filipe-magico-2-en.png', x: 58, y: 290, w: 927, sombra: false, brilho: false },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0, 0.92], pequeno: true },
      semPoeira: [[100, 780, 880, 540]],
    },

    // 2. Who it's for: right after the promise. The label names the course (for whoever comes from the ad).
    {
      tipo: 'miolo', tema: 'preto', anima: true, animaTexto: false,
      rotulo: 'Posts on Autopilot',
      titulo: 'This mini course<br>is a <span class="serifa">must</span> if you:',
      prova: {
        tipo: 'checklist',
        itens: [
          'Don\'t have time to sit down and design posts',
          'Want your content creation on autopilot',
          'Want your brand\'s design always on point',
        ],
      },
    },

    // 3. Step 1 (module 2): it reads the Instagram and saves the style in a skill (skills/my-style in the English kit).
    {
      tipo: 'miolo', tema: 'branco', anima: true, animaTexto: false,
      rotulo: 'in the course · step 1',
      titulo: 'Claude learns<br>your <span class="serifa">style</span>.',
      texto: 'It reads your Instagram and saves your colors,<br>fonts and voice in a <b>skill</b>.',
      semPoeira: [[120, 620, 840, 460]],
      prova: {
        tipo: 'codigo', arquivo: 'my-style/SKILL.md', tam: 27,
        linhas: [
          '# The @setupagency_eng style',
          'colors: yellow, black and white',
          'fonts: Anton + a touch of script',
          'voice: like a friend, zero jargon',
          'always: short lines, one idea per slide',
          'never: em dashes or that AI look',
        ],
      },
    },

    // 4. Step 2 (module 3): the scheduled task every morning.
    {
      tipo: 'miolo', tema: 'preto', anima: true, animaTexto: false,
      rotulo: 'in the course · step 2',
      titulo: 'Every day, it picks<br>a <span class="serifa">topic</span> and writes it up.',
      texto: 'A scheduled task wakes Claude up: it checks what\'s trending and writes <b>in your voice</b>.',
      prova: {
        tipo: 'notificacoes',
        itens: [
          { icone: 'claude', app: 'Claude', quando: '7:00 AM', texto: 'Found 3 trending topics today' },
          { icone: 'claude', app: 'Claude', quando: '8:00 AM', texto: 'Wrote the carousel in your voice' },
          { icone: 'claude', app: 'Claude', quando: '1:00 PM', texto: 'The design is ready for you to approve' },
        ],
      },
    },

    // 5. Step 3 (module 4): the same real cover ("made in Claude") going through the stages, up close.
    {
      tipo: 'miolo', tema: 'branco', anima: true, animaTexto: false,
      rotulo: 'in the course · step 3',
      titulo: 'Then it <span class="serifa">designs</span> in stages.',
      texto: 'The basics done right, effects with a reason, then the finish. <b>No AI look.</b>',
      prova: {
        tipo: 'etapas', w: 640, h: 521,
        itens: [
          { arq: 'oferta-etapa-1-zoom-en.jpg', legenda: '1 · the basics' },
          { arq: 'oferta-etapa-3-zoom-en.jpg', legenda: '2 · the effects' },
          { arq: 'oferta-etapa-5-zoom-en.jpg', legenda: '3 · the finish' },
        ],
      },
    },

    // 6. Call to action: the cover photo up close, the big word in the center, the price and the deadline in the note.
    {
      tipo: 'chamada', tema: 'preto',
      titulo: { pre: 'comment', condensada: 'POSTS', centro: true, y: 225, tam: 340 },
      fundoFoto: { arq: 'oferta-cena.jpg', x: -230, y: 1, w: 1540 },
      assunto: { foto: true, arq: 'filipe-magico-2-en.png', x: -136, y: 150, w: 1300, sombra: false, brilho: false },
      blocos: [{
        tipo: 'nota', x: 110, y: 1056, w: 860, tam: 36, solido: true,
        html: 'and I\'ll DM you the link to the <span class="serifa" style="font-size:48px">mini course</span> 🦎<div style="margin-top:10px;font-family:\'Instrument Serif\',serif;font-size:70px;line-height:1;color:#ff9a00">$19 <span style="font-family:Outfit,sans-serif;font-size:31px;color:inherit">this Black Friday only</span></div><div style="font-size:29px;margin-top:14px">18 lessons + the ready-made kit · <b>or tap the link in bio</b></div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
