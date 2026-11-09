// English version of skill-social-media.js ("This is the best skill for social media"), for @setupagency_eng. 9 slides.
// Same layout, photos and colors; only the text changes. Thesis: a Claude skill that gets your niche, researches
// what's trending and hands you the finished post every day.
// Slide 3 shows the skill file. The English material is expected as "social-media-autopilot" (the Portuguese one
// is materiais/skills/social-media-no-automatico/); rename the lines if the English file ends up with another name.
// Radar stories: the same real ones used in posts-no-automatico-en. Keyword: SKILL.
window.CARROSSEL = {
  nome: 'skill-social-media-en',
  marca: { perfil: '@setupagency_eng', nome: 'Setup Agency', selo: 'setup' },
  capas: [],
  palavra: 'SKILL',
  legenda: 'Comment SKILL and I\'ll DM you the skill! 🦎\nI turned what our system does every day into a skill for Claude: it gets your niche, finds what\'s trending and hands you the finished post, in your voice.\nJust install it, answer 4 questions and ask "what should I post today?".\nWhich niche do you want to test first? 👇\n.\n.\n#socialmedia #claude #socialmediamanager',
  slides: [
    // 1. Cover: bright flat yellow, Filipe pointing up at the skill file. Behind the title, Claude's screen in glass
    // (screen blend) using the skill.
    {
      tipo: 'capa', tema: 'amarelo',
      fundoLiso: '#ffbf1a',
      fundoBlocos: [
        { tipo: 'prompt', vidro: true, mescla: 'screen', x: 735, y: 290, w: 330, rot: 5, blur: 2.4, op: 0.85, texto: 'Find what\'s trending in my niche' },
        { tipo: 'janela', vidro: true, mescla: 'screen', x: 700, y: 590, w: 390, rot: -4, blur: 0.8, entrada: false, eu: 'What should I post today?', ia: 'I used the social-media skill: 3 ideas for your niche, ready in your voice.' },
        { tipo: 'prompt', vidro: true, mescla: 'screen', x: 705, y: 990, w: 380, rot: -4, blur: 1.2, texto: 'Write the carousel for idea 1' },
      ],
      titulo: { semSombra: false,
        pre: 'this is the <span class="serifa">best</span>', preEspaco: 24,
        script: 'S', fonteScript: 'Great Vibes', scriptTam: 280, condensada: 'KILL', tam: 250, y: 215, encaixe: -0.18, dx: -100,
        foco: { esq: 4, dir: 7, centro: [0.25, 0.8] },
        pos: 'for <span class="serifa">Social Media</span>', posTam: 46,
      },
      // The fingertip is at (x + 0.26 w, y + 0.451 of the height) of the photo: the file sits right above it.
      assunto: { arq: 'filipe-v7-skill.png', x: -126, y: 150, w: 1300, sombra: false, brilho: false },
      blocos: [{ tipo: 'documento', x: 62, y: 580, nome: 'social-media.skill', tipoArq: 'SKILL' }],
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.6, 0.9], pequeno: true },
    },

    // 2. The context.
    {
      tipo: 'miolo', tema: 'preto',
      titulo: 'I built a <span class="serifa">skill</span><br>that works for me.',
      texto: 'It gets your niche, finds what\'s trending and writes your content. <b>Every day.</b>',
      prova: {
        tipo: 'conversa',
        eu: 'What should I post today?',
        ia: 'Let\'s go! First, quick question: what do you do, who is it for and what do you sell?',
      },
    },

    // 3. What a skill is, with the file.
    {
      tipo: 'miolo', tema: 'branco',
      titulo: 'A skill is a <span class="serifa">manual</span><br>Claude follows.',
      texto: 'You teach it once. It does it the same way, every time, without you asking again.',
      prova: {
        tipo: 'codigo', arquivo: 'social-media-autopilot / SKILL.md',
        linhas: ['---', 'name: social-media-autopilot', '---', '# Social Media on Autopilot', '1. Understand the niche', '2. Research what\'s trending', '3. Write in the person\'s voice', '4. Deliver and learn'],
      },
    },

    // 4. Step 1: it gets you.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'step 1',
      titulo: 'First, it <span class="serifa">gets</span> you.',
      texto: 'Niche, audience, what you sell and how you talk. One conversation, and it\'s saved.',
      prova: {
        tipo: 'conversa',
        eu: 'I post about AI for social media managers and designers. Casual tone. I sell a mini course.',
        ia: 'Got your niche, your audience and your tone. From now on, I\'ll write like that.',
      },
    },

    // 5. Step 2: research (real stories from the radar).
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'step 2',
      titulo: 'Then it <span class="serifa">researches</span><br>what\'s trending.',
      texto: 'News from your niche from the last few days, each one with the source and a score.',
      prova: {
        tipo: 'lista',
        itens: [
          { calor: 84, t: 'Canva\'s new image model makes editable layers', fonte: 'The Verge and TechCrunch' },
          { calor: 69, t: 'Adobe rebuilds Photoshop and Premiere for NVIDIA\'s new AI chip', fonte: 'Techeconomy' },
          { calor: 68, t: 'Claude Code now runs long tasks in the background', fonte: 'Pasquale Pillitteri' },
        ],
      },
    },

    // 6. Step 3: it hands you the post.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'step 3',
      titulo: 'And hands you the<br>finished <span class="serifa">post</span>.',
      texto: 'Hook, carousel script, caption and CTA.<br>In your voice.',
      prova: {
        tipo: 'notificacoes',
        itens: [
          { icone: 'claude', app: 'Claude', quando: '7:00 AM', texto: 'Today\'s topic: Canva launched Craft' },
          { icone: 'claude', app: 'Claude', quando: '7:01 AM', texto: 'Carousel script, 7 slides' },
          { icone: 'claude', app: 'Claude', quando: '7:01 AM', texto: 'Caption ready, with the call to action' },
        ],
      },
    },

    // 7. Every day, on its own.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'every day',
      titulo: 'And it runs <span class="serifa">on its own</span>,<br>every morning.',
      texto: 'Put the skill in a Claude project and schedule a task. You wake up with your content ready.',
      prova: {
        tipo: 'conversa',
        eu: 'Every day at 7 AM, use the skill and send me today\'s content.',
        ia: 'Deal. The first one arrives tomorrow at 7 AM.',
      },
    },

    // 8. The mini course.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'want the whole system?',
      titulo: 'The skill is the start.<br>The <span class="serifa">system</span> is in the course.',
      texto: 'In the mini course I set it up with you: topics, copy and design, every day, in your style.',
      prova: {
        tipo: 'oferta', selo: 'mini course',
        imagem: 'curso-card-en.jpg',
        titulo: 'Posts on Autopilot with Claude',
        itens: ['18 short lessons, from scratch', 'Kit with the prompts and templates', 'The daily routine, set up with you'],
        preco: '$19', pe: 'link in bio',
      },
    },

    // 9. Call to action: closes in yellow, with the same photo as the cover, closer.
    {
      tipo: 'chamada', tema: 'amarelo',
      fundoLiso: '#ffbf1a',
      titulo: { pre: 'comment', condensada: 'SKILL', centro: true, y: 225, tam: 340 },
      assunto: { foto: true, arq: 'filipe-v7-skill.png', x: -60, y: -30, w: 1300, sombra: false, brilho: false }, // the finger points at SKILL
      blocos: [{
        tipo: 'nota', x: 110, y: 1060, w: 860, tam: 38, solido: true,
        html: 'and I\'ll DM you the <span class="serifa" style="font-size:50px">skill</span> 🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">just install it in Claude and answer 4 questions</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
