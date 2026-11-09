// English version of vale-a-pena-claude.js ("Is Claude worth it?"), for @setupagency_eng. 8 slides.
// Same layout, photos and colors; only the text changes. Thesis: it depends. If you want to save time, cut the
// busywork and focus on selling, it's worth it: what takes hours (research, writing, design, motion) Claude does in
// minutes, and you just polish. The designer and motion times are the owner's.
// Slide 5 is the animated card (MP4 made in code: ferramentas/animar.mjs vale-a-pena-claude-en 5); still, it shows the last frame.
// Keyword: TIME (material: the 10 social media tasks to hand off to Claude).
window.CARROSSEL = {
  nome: 'vale-a-pena-claude-en',
  marca: { perfil: '@setupagency_eng', nome: 'Setup Agency', selo: 'setup' },
  capas: [],
  palavra: 'TIME',
  legenda: 'Is Claude worth it? It depends. 🦎\nIf you want to save time, stop doing the busywork and focus on selling: it\'s worth it, big time.\nFinding topics and writing takes hours. A carousel takes 2 to 4 hours. A motion piece, 3 to 5. Claude does it in minutes, and you just polish.\nComment TIME and I\'ll send you the 10 tasks to hand off to Claude this week.\n.\n.\n#claude #socialmedia #contentcreator',
  slides: [
    // 1. Cover: the real cap photo, the "hmm, it depends" face and the arm showing strength (it's worth it, big time).
    // Behind him, Claude's window, blurred, with the question of the post.
    {
      tipo: 'capa', tema: 'preto', luzX: '50%', luzY: '40%',
      fundoFoto: { arq: 'filipe-v6-vale-fundo.jpg', x: -75, y: 40, w: 1250 }, fundoBrilho: 0.85,
      fundoBlocos: [{ tipo: 'janela', x: 650, y: 650, w: 560, rot: 3, blur: 2.5, eu: 'Is Claude worth paying for?', ia: 'It depends. How many hours a week do you spend writing?' }],
      titulo: {
        pre: 'is it worth using', preEspaco: 12,
        script: 'C', fonteScript: 'Great Vibes', scriptTam: 320, condensada: 'LAUDE?', tam: 215, y: 225, encaixe: -0.16,
        foco: { esq: 4, dir: 5, centro: [0.25, 0.8] }, // the "?" has to read: little blur at the end
        pos: '<span class="serifa">it depends.</span>', posTam: 56,
      },
      assunto: { arq: 'filipe-v6-vale.png', x: -75, y: 330, w: 1250, sombra: false, foco: { angulo: 270, de: 0.6, ate: 0.9, max: 5 } },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.6, 0.9], pequeno: true },
    },

    // 2. The honest answer.
    {
      tipo: 'miolo', tema: 'branco',
      titulo: 'It depends on what you want from your <span class="serifa">week</span>.',
      texto: 'If it\'s saving time, cutting busywork and automating tasks: <b>it\'s worth it, big time.</b>',
      prova: {
        tipo: 'conversa',
        eu: 'Is Claude worth paying for?',
        ia: 'It depends. How many hours a week do you spend hunting for topics and writing?',
      },
    },

    // 3. Social media.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'social media',
      titulo: 'Research and writing<br>take <span class="serifa">hours</span>.',
      texto: 'Claude does it well, in minutes.<br>You just polish.',
      prova: {
        tipo: 'numeros', tam: 130,
        itens: [{ v: 'hours', t: 'hunting for topics and writing from scratch', fraco: true }, { v: 'min', t: 'with Claude, and<br>you just polish' }],
      },
    },

    // 4. Designer.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'designer',
      titulo: 'A carousel takes<br>2 to 4 <span class="serifa">hours</span>.',
      texto: 'This one took minutes in Claude.<br>And it looks this good.',
      prova: {
        tipo: 'numeros', tam: 130,
        itens: [{ v: '2-4 h', t: 'a designer, one carousel', fraco: true }, { v: 'min', t: 'Claude, this carousel' }],
      },
    },

    // 5. Motion: the animated card (video). The timeline moves, the layers come in and the clock turns to "minutes".
    {
      tipo: 'miolo', tema: 'preto', anima: true,
      rotulo: 'motion',
      titulo: 'A motion piece takes<br>3 to 5 <span class="serifa">hours</span>.',
      texto: 'This animated card was made in minutes.',
      prova: {
        tipo: 'linha-do-tempo', projeto: 'animated-card.mp4', segundos: 6, antes: '3 to 5 hours', depois: 'minutes',
        camadas: [
          { nome: 'background', cor: '#4a4a50', de: 0, ate: 1, chaves: [0.02, 0.9] },
          { nome: 'title', cor: 'linear-gradient(90deg,#ff8a1f,#ffb000)', de: 0.06, ate: 1, chaves: [0.08, 0.3] },
          { nome: 'text', cor: 'linear-gradient(90deg,#ffb000,#ffd36b)', de: 0.16, ate: 1, chaves: [0.18, 0.4] },
          { nome: 'clock', cor: '#d97757', de: 0.62, ate: 1, chaves: [0.64, 0.9] },
        ],
      },
    },

    // 6. The conclusion.
    {
      tipo: 'miolo', tema: 'branco',
      titulo: 'So, is it <span class="serifa">worth it</span>?',
      texto: 'If you want to stop the busywork and focus on selling: yes. <b>Get Claude and use it right.</b>',
      prova: {
        tipo: 'checklist',
        itens: ['Today\'s topic, without searching', 'Copy in your style', 'Design and animation in minutes', 'More time to sell'],
      },
    },

    // 7. The mini course: using it right.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'using it right',
      titulo: 'Using it <span class="serifa">right</span><br>is what I teach.',
      texto: 'In the mini course I show you, step-by-step, how to put Claude to work for you.',
      prova: {
        tipo: 'oferta', selo: 'mini course',
        imagem: 'curso-card-en.jpg',
        titulo: 'Posts on Autopilot with Claude',
        itens: ['18 short lessons, from scratch', 'Kit with the prompts and templates', 'Ideas, copy and design on autopilot'],
        preco: '$19', pe: 'link in bio',
      },
    },

    // 8. Call to action: closes in black, with the Filipe of the cover closer.
    {
      tipo: 'chamada', tema: 'preto', luzX: '50%', luzY: '40%',
      fundoFoto: { arq: 'filipe-v6-vale-fundo.jpg', x: -330, y: 40, w: 1500 }, fundoBrilho: 0.8,
      titulo: { pre: 'comment', condensada: 'TIME', x: 104, y: 230, tam: 260 },
      assunto: { foto: true, arq: 'filipe-v6-vale.png', x: -280, y: 200, w: 1400, sombra: false },
      blocos: [{
        tipo: 'nota', x: 110, y: 1060, w: 860, tam: 38, solido: true,
        html: 'and I\'ll DM you <span class="serifa" style="font-size:50px;color:#ff9a1f">10 tasks</span> 🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">to hand off to Claude this week</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};

// The model writes "Responder ao Claude..." in Claude's window (cover background) and has no option for the language
// yet. Until it does, this English version swaps that line as soon as the slide is drawn, before the export.
if (typeof document !== 'undefined') {
  new MutationObserver(() => {
    document.querySelectorAll('.janela-claude .entrada').forEach((el) => {
      if (el.textContent !== 'Reply to Claude...') el.textContent = 'Reply to Claude...';
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
}
