// English version of esculacho-do-perfil.js ("I asked Claude to roast my Instagram"), for @setupagency_eng. 9 slides.
// Same layout, photos and colors; only the text changes. "Esculachar" is "roast" (the same trend in English).
// The numbers are the real ones of the agency's main profile (@agenciasetup, 1,488 posts, 128K followers, read on
// 10/25/2026), so the English text says "my main profile". Engagement = (likes + 3 comments + 2 saves + 2 shares) /
// reach. The mockup behind him is that profile, with the bio and the labels in English.
// Keyword: ROAST (material: the roast prompt).
const CARROSSEIS = '../../_local/carrossel';
const IG = '../../_local/ig-perfil'; // profile photo and post thumbnails, downloaded from Instagram (outside Git)
window.CARROSSEL = {
  nome: 'esculacho-do-perfil-en',
  marca: { perfil: '@setupagency_eng', nome: 'Setup Agency', selo: 'setup' },
  capas: [],
  palavra: 'ROAST',
  legenda: 'Comment ROAST and I\'ll DM you the prompt to roast your own profile 🦎\nI sent the numbers from my main Instagram (128K followers) to Claude and asked for no mercy. It hurt: 1,273 posts that never asked for a comment, way too much Photoshop and posting at the wrong time.\nBut it turned into a plan, and this profile is already changing.\nBrave enough to send yours? 👇\n.\n.\n#claude #instagram #socialmediatips',
  slides: [
    // 1. Cover: Filipe laughing at himself (the roast hurt and he agrees). Behind him, the profile that got roasted,
    // slightly blurred. No notification.
    {
      tipo: 'capa', tema: 'preto',
      fundoLiso: '#141210',
      fundoBlocos: [{
        tipo: 'perfil', x: 650, y: 575, w: 430, rot: 4, blur: 1.4,
        avatar: `${IG}/avatar.jpg`, usuario: 'agenciasetup', nome: 'Calango | Agência Setup', posts: '1,488', seguidores: '128K', seguindo: '73',
        bio: '☕️ We help your business sell more online<br>👀 Want a free audit? Reply below 👇🏻', destaques: ['FEEDBACK', 'Start here'],
        grade: [1, 2, 3, 4, 5, 6].map((n) => `${IG}/post-${n}.jpg`),
      }],
      titulo: { semSombra: false,
        pre: 'I asked <span class="serifa">Claude</span> to', preEspaco: 14,
        script: 'R', fonteScript: 'Great Vibes', scriptTam: 300, condensada: 'OAST', tam: 250, y: 220, encaixe: -0.2,
        foco: { esq: 4, dir: 7, centro: [0.25, 0.8] },
        pos: 'my <span class="serifa">Instagram</span>', posTam: 48,
      },
      assunto: { arq: 'filipe-v8-esculacho.png', x: -142, y: 150, w: 1250, sombra: false, brilho: false },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.35, 0.9], pequeno: true },
    },

    // 2. The context: the request.
    {
      tipo: 'miolo', tema: 'branco',
      titulo: 'I asked for <span class="serifa">no mercy</span>.',
      texto: 'I sent my main profile\'s numbers to Claude and said: roast me.',
      prova: { tipo: 'conversa', eu: 'Roast my Instagram. No mercy.', ia: 'Okay. You asked for it. I found 3 things, and the first one hurts.' },
    },

    // 3. Roast 1: posts with no keyword.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'roast 1',
      titulo: '1,273 posts that<br>asked for <span class="serifa">nothing</span>.',
      texto: 'Keyword posts got <b>21x more engagement</b>.<br>And 1,273 of mine had no keyword.',
      prova: { tipo: 'numeros', tam: 150, itens: [{ v: '12.8', t: 'with "Comment KEYWORD"' }, { v: '0.6', t: 'asking for nothing', fraco: true }], pe: 'average engagement on my profile' },
    },

    // 4. Roast 2: the wrong topic.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'roast 2',
      titulo: '140 Photoshop posts.<br>22 <span class="serifa">prompt</span> posts.',
      texto: 'Guess which one performs better? Prompt posts got <b>17x more engagement</b>.',
      prova: { tipo: 'numeros', tam: 150, itens: [{ v: '19.5', t: 'prompt posts' }, { v: '1.1', t: 'Photoshop posts', fraco: true }], pe: 'average engagement on my profile' },
    },

    // 5. Roast 3: the wrong time (849 posts at night; the afternoon performs better).
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'roast 3',
      titulo: '849 posts at <span class="serifa">night</span>.',
      texto: 'My audience shows up in the afternoon: <b>38% more engagement</b> between noon and 6 PM.',
      prova: { tipo: 'numeros', tam: 150, itens: [{ v: '0.87', t: 'afternoon' }, { v: '0.63', t: 'night', fraco: true }], pe: 'average engagement on my profile' },
    },

    // 6. The fix.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'the fix',
      titulo: 'It hurt. But it<br>became a <span class="serifa">plan</span>.',
      prova: { tipo: 'checklist', itens: ['Every post asks for a keyword in the comments', 'More AI and prompts, less Photoshop', 'Post in the afternoon, at 5 PM'] },
    },

    // 7. Proof that it changed: the week of Oct 26 to 30 (the English versions of those posts).
    {
      tipo: 'miolo', tema: 'preto',
      titulo: 'This profile is<br>already <span class="serifa">changing</span>.',
      texto: 'This week\'s posts went out like this: in the afternoon, with a keyword and a freebie.',
      prova: { tipo: 'galeria', itens: [`${CARROSSEIS}/vale-a-pena-claude-en/01.jpg`, `${CARROSSEIS}/posts-no-automatico-en/01.jpg`, `${CARROSSEIS}/skill-social-media-en/01.jpg`], legenda: 'the week of Oct 26 to 30' },
    },

    // 8. The mini course.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'the system',
      titulo: 'Claude doesn\'t just roast.<br>It <span class="serifa">fixes</span>.',
      texto: 'In the mini course, we set up Claude together so it finds the topic, writes the post and gets it ready for the right time.',
      prova: {
        tipo: 'oferta', selo: 'mini course',
        imagem: 'curso-card-en.jpg',
        titulo: 'Posts on Autopilot with Claude',
        itens: ['18 short lessons, from scratch', 'Kit with the prompts and templates', 'Ideas, copy and design on autopilot'],
        preco: '$19', pe: 'link in bio',
      },
    },

    // 9. Call to action: back to the near black of the cover, with him laughing, closer.
    {
      tipo: 'chamada', tema: 'preto',
      fundoLiso: '#141210',
      titulo: { pre: 'comment', condensada: 'ROAST', centro: true, y: 225, tam: 340 },
      assunto: { foto: true, arq: 'filipe-v8-esculacho.png', x: -300, y: 130, w: 1500, sombra: false, brilho: false },
      blocos: [{
        tipo: 'nota', x: 110, y: 1060, w: 860, tam: 38, solido: true,
        html: 'and I\'ll DM you the <span class="serifa" style="font-size:50px;color:#ff9a1f">roast prompt</span> 🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">with your numbers, no mercy and no insults</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};

// The model writes the Instagram profile labels in Portuguese ("publicações", "seguidores", "seguindo", "Editar
// perfil", "Ver arquivo") and has no option for the language yet. Until it does, this English version swaps them as
// soon as the slide is drawn, before the export.
if (typeof document !== 'undefined') {
  const TROCAS = { 'publicações': 'posts', seguidores: 'followers', seguindo: 'following', 'Editar perfil': 'Edit profile', 'Ver arquivo': 'View archive' };
  new MutationObserver(() => {
    document.querySelectorAll('.perfil-ig .pi-topo span, .perfil-ig .pi-botoes span').forEach((el) => {
      if (TROCAS[el.textContent]) el.textContent = TROCAS[el.textContent];
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
}
