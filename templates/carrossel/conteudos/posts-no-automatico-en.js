// English version of posts-no-automatico.js ("Your posts on autopilot"), for @setupagency_eng. 8 slides.
// Same layout, photos and colors; only the text changes. Thesis: Claude finds the day's news and writes the post in
// your style, and you just approve.
// The radar list uses real stories from 10/23 and 10/24/2026 (English sources where the Portuguese one only made sense
// in Brazil: "Canva + Gemini now in Portuguese" became Adobe's Photoshop and Premiere news).
// Keyword: IDEAS (material: the 2 prompts, one finds today's topics and one learns your style).
window.CARROSSEL = {
  nome: 'posts-no-automatico-en',
  marca: { perfil: '@setupagency_eng', nome: 'Setup Agency', selo: 'setup' },
  capas: [],
  palavra: 'IDEAS',
  legenda: 'Comment IDEAS and I\'ll DM you the 2 prompts! 🦎\nA lot of people lose the whole morning hunting for a topic and writing from scratch. Here, Claude wakes up with today\'s post ideas ready, written my way.\nOne prompt finds the news. The other one learns your style. You just approve.\nHow much time do you lose every day figuring out what to post? 👇\n.\n.\n#claude #socialmedia #contentcreator',
  slides: [
    // 1. Cover: the same dark brown, Filipe in the suit with his hands on his head, and the Instagram alert saying the
    // post went out on its own. "AUTOPILOT" has no accent, so the cover drops the extra room the accent needed.
    {
      tipo: 'capa', tema: 'preto',
      fundoLiso: '#211309',
      titulo: {
        pre: 'your <span class="serifa">posts</span> on',
        script: 'A', fonteScript: 'Great Vibes', scriptTam: 250, condensada: 'UTOPILOT', tam: 158, y: 205, encaixe: -0.16,
        foco: { esq: 4, dir: 14, centro: [0.26, 0.6] },
        pos: 'in <span class="serifa">your style</span>', posTam: 44,
      },
      assunto: { arq: 'filipe-v6-terno.png', x: -4, y: 190, w: 1250, sombra: false, brilho: false, foco: { angulo: 130, de: 0.6, ate: 0.92, max: 5 } },
      notificacao: { x: 80, y: 1110, w: 640, icone: 'instagram', app: 'Instagram', quando: '6:00 PM', texto: 'Your post for today is live ✓' },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.55, 0.88], pequeno: true },
    },

    // 2. The context: the everyday conversation.
    {
      tipo: 'miolo', tema: 'preto',
      titulo: 'No more topic hunting.<br>Or writing from <span class="serifa">scratch</span>.',
      texto: 'By 7 AM, Claude has <b>today\'s&nbsp;ideas</b> ready, written my way.',
      prova: {
        tipo: 'conversa',
        eu: 'Morning! What should I post today?',
        ia: 'I picked 3 hot AI and design stories and already wrote the 3 posts in your voice. Want to see the first one?',
      },
    },

    // 3. Step 1: it reads the news (real stories from the radar).
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'step 1',
      titulo: 'It <span class="serifa">reads</span> the news for you.',
      texto: 'You ask once: every morning, find what\'s new in your niche. Today it found this:',
      prova: {
        tipo: 'lista',
        itens: [
          { calor: 84, t: 'Canva\'s new image model makes editable layers', fonte: 'The Verge and TechCrunch' },
          { calor: 69, t: 'Adobe rebuilds Photoshop and Premiere for NVIDIA\'s new AI chip', fonte: 'Techeconomy' },
          { calor: 68, t: 'Claude Code now runs long tasks in the background', fonte: 'Pasquale Pillitteri' },
        ],
      },
    },

    // 4. Step 2: it studies the way you talk.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'step 2',
      titulo: 'Then it <span class="serifa">studies</span><br>the way you talk.',
      texto: 'Send it your 20 best posts. It writes your <b>style&nbsp;guide</b> and always uses it.',
      prova: {
        tipo: 'conversa',
        eu: 'Read these 20 posts and tell me how I write.',
        ia: 'You talk to followers like friends, use short sentences and light slang, never use dashes and end with a question. Saved it as your guide.',
      },
    },

    // 5. Step 3: the post comes out in your voice. The whole day, in three alerts.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'step 3',
      titulo: 'And writes <span class="serifa">like you</span>.',
      texto: 'You tweak one word and approve.',
      prova: {
        tipo: 'notificacoes',
        itens: [
          { icone: 'claude', app: 'Claude', quando: '7:00 AM', texto: '3 post ideas for today, in your style' },
          { icone: 'logo', app: 'You', quando: '7:12 AM', texto: 'Approved 2 posts, asked for one tweak' },
          { icone: 'instagram', app: 'Instagram', quando: '6:00 PM', texto: 'Your post is live' },
        ],
      },
    },

    // 6. What makes it work every day: the routine, set up once.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'the secret',
      titulo: 'The <span class="serifa">routine</span> is what<br>keeps it running.',
      texto: 'Set it up once and forget it:',
      prova: {
        tipo: 'checklist',
        itens: [
          'A Claude project with your style guide',
          'The daily ideas prompt, always the same',
          'A scheduled task that runs at 7 AM',
        ],
      },
    },

    // 7. The mini course: the whole step-by-step.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'want more?',
      titulo: 'Want this <span class="serifa">running</span><br>every day?',
      texto: 'In the mini course I set it up with you: Claude finds the topic, writes and designs.',
      prova: {
        tipo: 'oferta', selo: 'mini course',
        imagem: 'curso-card-en.jpg',
        titulo: 'Posts on Autopilot with Claude',
        itens: ['18 short lessons, from scratch', 'Kit with the prompts and templates', 'Ideas, copy and design on autopilot'],
        preco: '$19', pe: 'link in bio',
      },
    },

    // 8. Call to action: closes in the brown of the cover, with the same photo closer.
    {
      tipo: 'chamada', tema: 'preto',
      fundoLiso: '#211309',
      titulo: { pre: 'comment', condensada: 'IDEAS', x: 104, y: 200, tam: 280 },
      assunto: { foto: true, arq: 'filipe-v6-terno.png', x: -230, y: 120, w: 1450, sombra: false, brilho: false },
      blocos: [{
        tipo: 'nota', x: 110, y: 1040, w: 860, tam: 38, solido: true,
        html: 'and I\'ll DM you the <span class="serifa" style="font-size:50px">2 prompts</span> 🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">one finds today\'s topics, the other learns your style</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
