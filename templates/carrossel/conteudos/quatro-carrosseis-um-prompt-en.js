// English version of quatro-carrosseis-um-prompt.js ("I made 4 carousels with one prompt"), for @setupagency_eng.
// 8 slides. Same layout, photos and colors; only the text changes, and every carousel shown is its English version:
// the Setup covers (made-in-claude and the -en carousels of this batch; export them before this one), the lawyer and
// the elegant ones (public/img/estilos-en/, from templates/estilos/exportar-en.mjs) and the faith one
// (_local/estilos/religioso-en/, the sacro-design cards redone in English: _local/sacro/card0N-en.json).
// Keyword: PROMPT (material: the 4 prompts).
const ESTILOS = '../../public/img/estilos-en';
const RELIGIOSO = '../../_local/estilos/religioso-en';
const CARROSSEIS = '../../_local/carrossel';
window.CARROSSEL = {
  nome: 'quatro-carrosseis-um-prompt-en',
  marca: { perfil: '@setupagency_eng', nome: 'Setup Agency', selo: 'setup' },
  capas: [],
  palavra: 'PROMPT',
  legenda: 'Comment PROMPT and I\'ll DM you the 4 prompts! 🦎\nNo Photoshop, no Canva. One prompt for each style: ours, a lawyer\'s, an elegant one and a faith page.\nThe secret isn\'t a magic word, it\'s the method: style, steps and review.\nWhich of the 4 is most you? 👇\n.\n.\n#aidesign #claude #graphicdesign',
  slides: [
    // 1. Cover: centered title, Filipe presenting with his open hand, and the 4 real carousels fanned out above it.
    // Under the hand, the prompt that made the four (the tag clicks send).
    {
      tipo: 'capa', tema: 'branco',
      fundoLiso: '#f3f0ea',
      titulo: { semSombra: false,
        pre: 'I made 4 <span class="serifa">carousels</span> with one', preEspaco: 66, preLado: 'centro', // above the P flourish
        script: 'P', fonteScript: 'Great Vibes', scriptTam: 300, condensada: 'ROMPT', tam: 220, y: 255, encaixe: -0.14,
        foco: { esq: 4, dir: 8, centro: [0.26, 0.74] },
      },
      // The palm is at (x + 0.108 w, y + 0.56 of the height) of the photo; the fan opens right above it.
      assunto: { arq: 'filipe-v7-prompt.png', cru: true, x: 110, y: 200, w: 1100, sombra: false, brilho: false },
      blocos: [
        { tipo: 'imagem', arq: `${RELIGIOSO}/religioso-1.jpg`, x: 55, y: 600, w: 245, rot: -14 },
        { tipo: 'imagem', arq: `${ESTILOS}/elegante-1.webp`, x: 158, y: 562, w: 245, rot: -5 },
        { tipo: 'imagem', arq: `${ESTILOS}/advogado-1.webp`, x: 262, y: 562, w: 245, rot: 5 },
        { tipo: 'imagem', arq: `${CARROSSEIS}/made-in-claude/01.jpg`, x: 365, y: 600, w: 245, rot: 14 },
        { tipo: 'prompt', x: 60, y: 1118, w: 440, texto: 'Make 4 carousels in different styles' },
      ],
      selo: { aponta: '.caixa-prompt .enviar', ponto: [0.5, 0.6], pequeno: true },
    },

    // 2. The context.
    {
      tipo: 'miolo', tema: 'preto',
      titulo: 'One <span class="serifa">prompt</span> for each style.',
      texto: 'No Photoshop, no Canva. I sent the prompt, reviewed the result and got this:',
      prova: {
        tipo: 'conversa',
        eu: 'Make a carousel for a lawyer about delayed flights. Serious, dark with lime green.',
        ia: 'Done: 3 slides, with the flight card and what the passenger is owed as the hours add up.',
      },
    },

    // 3 to 6. The 4 carousels (3 slides each, fanned out).
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: '1 · ours',
      titulo: 'The Setup one: <span class="serifa">yellow</span>,<br>with my face.',
      // Real Setup covers, with his face (export these three English carousels before this one).
      prova: { tipo: 'galeria', itens: [`${CARROSSEIS}/vale-a-pena-claude-en/01.jpg`, `${CARROSSEIS}/posts-no-automatico-en/01.jpg`, `${CARROSSEIS}/skill-social-media-en/01.jpg`], legenda: 'social media agency' },
    },
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: '2 · lawyer',
      titulo: 'For a <span class="serifa">lawyer</span>:<br>serious and trustworthy.',
      prova: { tipo: 'galeria', itens: [`${ESTILOS}/advogado-2.webp`, `${ESTILOS}/advogado-1.webp`, `${ESTILOS}/advogado-3.webp`], legenda: 'passenger rights' },
    },
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: '3 · elegant',
      titulo: 'For an <span class="serifa">elegant</span> brand:<br>editorial.',
      prova: { tipo: 'galeria', itens: [`${ESTILOS}/elegante-2.webp`, `${ESTILOS}/elegante-1.webp`, `${ESTILOS}/elegante-3.webp`], legenda: 'course and personal brand' },
    },
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: '4 · faith',
      titulo: 'For a <span class="serifa">Catholic</span> page:<br>painting and light.',
      prova: { tipo: 'galeria', itens: [`${RELIGIOSO}/religioso-2.jpg`, `${RELIGIOSO}/religioso-1.jpg`, `${RELIGIOSO}/religioso-3.jpg`], legenda: 'faith and evangelization' },
    },

    // 7. The mini course: the method behind it.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'the method',
      titulo: 'The prompt is just the <span class="serifa">start</span>.',
      texto: 'In the mini course I show you what makes it look good: the style, the steps and reviewing every slide.',
      prova: {
        tipo: 'oferta', selo: 'mini course',
        imagem: 'curso-card-en.jpg',
        titulo: 'Posts on Autopilot with Claude',
        itens: ['18 short lessons, from scratch', 'Kit with the prompts and templates', 'From your style to the finished post'],
        preco: '$19', pe: 'link in bio',
      },
    },

    // 8. Call to action: closes in white, with Filipe's open hand presenting the note.
    {
      tipo: 'chamada', tema: 'branco',
      fundoLiso: '#f3f0ea',
      titulo: { pre: 'comment', condensada: 'PROMPT', centro: true, y: 225, tam: 300 },
      assunto: { foto: true, cru: true, arq: 'filipe-v7-prompt.png', x: 110, y: 290, w: 1100, sombra: false, brilho: false }, // the open hand presents the note
      blocos: [{
        tipo: 'nota', x: 60, y: 760, w: 540, tam: 36, solido: true,
        html: 'and I\'ll DM you <span class="serifa" style="font-size:50px;color:#f06000">4 prompts</span>&nbsp;🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">Setup, lawyer, elegant and faith</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
