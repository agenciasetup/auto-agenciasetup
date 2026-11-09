// English version of criado-no-claude.js ("This carousel was made in Claude"), for the English course
// ("Posts on Autopilot with Claude"). Same 7 slides, same layout and same photos of Filipe (imagens/, untouched).
// The cover comes out in yellow (official), black and white; the inside slides alternate black and white, and the
// call to action goes back to yellow to close where it started. Numbers are the real ones from 10/23/2026:
// 400 posts read, median comments 111 (asks for a keyword) x 13 (does not); radar of 25 sources.
// The course example uses slides 1, 2 and 7 (templates/estilos/exportar-en.mjs setup).
window.CARROSSEL = {
  nome: 'made-in-claude',
  marca: { perfil: '@setupagency_eng', nome: 'Setup Agency', selo: 'setup' },
  capas: ['amarelo', 'preto', 'branco'],
  legenda: 'This carousel was made in Claude. 🦎\nI sent one text. It read the profile, found the topic of the day, built the 5 layers and scheduled it.\nComment CLAUDE and I\'ll send you the step-by-step in your DMs.\n.\n.\n#claude #aidesign #socialmediatips',
  palavra: 'CLAUDE',
  slides: [
    // 1. Cover. Filipe (real photo, background and light swapped) in front of the big word; the top and bottom lines
    // align to the right edge of "ADE". Effects with a reason: the background light explains the light on the cutout;
    // the end of the word and the hand with the phone, closer to the camera, blur; the petals pass in front of the lens.
    {
      tipo: 'capa', tema: 'amarelo', luzX: '50%', luzY: '46%',
      luz: { x: 520, y: 560, r: 950 },
      titulo: { semSombra: false,
        pre: 'this <span class="serifa">carousel</span> was',
        script: 'M', fonteScript: 'Great Vibes', scriptTam: 300, condensada: 'ADE', tam: 330, y: 230, encaixe: 0.04,
        foco: { esq: 5, dir: 15, centro: [0.3, 0.62] },
        pos: 'in <span class="serifa">Claude</span>', posTam: 44,
      },
      assunto: { arq: 'filipe-celular.png', x: -100, y: 190, w: 1140, sombraX: 30, sombraY: 24, foco: { angulo: 130, de: 0.55, ate: 0.9, max: 6 } },
      notificacao: { y: 1060, app: 'Claude', quando: 'now', texto: 'Your carousel is ready. 7 slides ✓' },
      folhas: [
        { arq: 'petalas.png', x: -170, y: 980, w: 520, rot: 18, blur: 20, luz: 1 },
      ],
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.55, 0.88], pequeno: true },
    },

    // 2. The context, with the proof: the request I sent and the answer.
    {
      tipo: 'miolo', tema: 'preto',
      titulo: 'I didn\'t open Photoshop.<br>Or Canva.',
      texto: 'I sent <b>one text</b> to Claude. It did the rest.',
      prova: {
        tipo: 'conversa',
        eu: 'Make a carousel that shows you made it. Agency look, yellow cover.',
        ia: 'Done: 7 slides and 3 covers. Want me to schedule it for today at 6 PM?',
      },
    },

    // 3. What it read: the profile numbers.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'step 1',
      titulo: 'First, it <span class="serifa">read</span> the profile.',
      texto: 'The last 400 posts from @agenciasetup. Posts that ask for a keyword in the comments got <b>8x&nbsp;more&nbsp;comments</b>.',
      prova: {
        tipo: 'numeros',
        itens: [{ v: '111', t: 'comments when the post asks for a keyword' }, { v: '13', t: 'when it doesn\'t', fraco: true }],
        pe: 'median of 400 posts',
      },
    },

    // 4. The topic of the day: the radar.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'step 2',
      titulo: 'Then it <span class="serifa">found</span> today\'s topic.',
      texto: 'It reads 25 sources on its own, all day.<br>Today\'s hottest:',
      prova: {
        tipo: 'lista',
        itens: [
          { calor: 84, t: 'Canva launched its first image model', fonte: 'The Verge, TechCrunch and 2 more' },
          { calor: 74, t: 'Figma\'s new agent follows your design system', fonte: 'Figma blog' },
          { calor: 73, t: 'Uber rolled out ChatGPT Work to 30,000 employees', fonte: 'OpenAI' },
        ],
      },
    },

    // 5. How it built it: the cover itself taken apart into its 5 real layers (bottom to top).
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'step 3',
      titulo: 'And built it in <span class="serifa">5 layers</span>.',
      prova: {
        tipo: 'camadas',
        camadas: [
          { arq: 'fundo', nome: 'background', desc: 'the yellow and the light' },
          { arq: 'titulo', nome: 'title', desc: 'behind me' },
          { arq: 'assunto', nome: 'me', desc: 'the cutout photo' },
          { arq: 'frente', nome: 'front', desc: 'notification and petals' },
          { arq: 'acabamento', nome: 'finishing', desc: 'window and tag' },
        ],
      },
    },

    // 6. My job: approve. The stacked notifications, like the approved sales in the agency's carousels.
    {
      tipo: 'miolo', tema: 'preto',
      titulo: 'And I just <span class="serifa">approved</span>.',
      texto: 'It schedules, posts and DMs the freebie to everyone who comments the keyword.',
      prova: {
        tipo: 'notificacoes',
        itens: [
          { icone: 'logo', app: 'Post approved', quando: 'now', texto: 'Goes out today at 6 PM on Instagram' },
          { icone: 'conversa', app: 'Auto DM', quando: '1 min', texto: 'DM sent with the freebie' },
          { icone: 'baixar', app: 'Site download', quando: '3 min', texto: '5-layer carousel template' },
        ],
      },
    },

    // 7. Call to action: Filipe smiling in front of the word, what the person gets in a solid block, the tag on the word.
    {
      tipo: 'chamada', tema: 'amarelo', luzX: '50%', luzY: '38%',
      luz: { x: 560, y: 520, r: 950 },
      titulo: { pre: 'comment', condensada: 'CLAUDE', centro: true, y: 225, tam: 300 },
      assunto: { foto: true, arq: 'filipe-sorriso.png', x: -36, y: 170, w: 1200, sombraX: 30, sombraY: 24 },
      folhas: [{ arq: 'petalas.png', x: -150, y: 980, w: 480, rot: 30, blur: 18, luz: 1 }],
      blocos: [{
        tipo: 'nota', x: 110, y: 1030, w: 860, tam: 38, solido: true,
        html: 'and I\'ll DM you the <span class="serifa" style="font-size:50px">step-by-step</span> 🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">the 5-layer template + the prompt I used</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
