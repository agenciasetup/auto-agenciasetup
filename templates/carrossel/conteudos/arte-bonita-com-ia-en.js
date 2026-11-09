// English version of arte-bonita-com-ia.js ("How to make designs look good with AI"), for @setupagency_eng. 10 slides.
// Same layout, photos and colors; only the text changes. "Arte" (the post design) is "design" in English
// (Curso/GLOSSARIO-EN.md), so the big word is D + ESIGNS, sized down because it is twice as long as RTE.
// Thesis: AI design looks good when it comes out in steps (background, title, subject, effects), like code; one prompt
// in GPT gives you the black-and-gold mess that looks like AI.
// Slides 4 to 7 show this cover being built (real stages, exported with ferramentas/etapas.mjs arte-bonita-com-ia-en).
// Cover and slide 10 (owner, 10/30/2026: it doesn't have to be his face): the lizard on 5 solid slabs, the layers of the
// title. Known leftover in Portuguese: slide 2 is the real ChatGPT art from the Portuguese prompt (gpt-arte-um-prompt.png).
const ETAPAS = '../../_local/carrossel/arte-bonita-com-ia-en/etapas';
window.CARROSSEL = {
  nome: 'arte-bonita-com-ia-en',
  marca: { perfil: '@setupagency_eng', nome: 'Setup Agency', selo: 'setup' },
  capas: [],
  palavra: 'LAYERS',
  legenda: 'Comment LAYERS and I\'ll DM you the 5-step prompt! 🦎\nA lot of people ask for everything in one prompt and get that black and gold design, with a rising chart and the AI look.\nIn Claude I do it in steps: first the background, then the title, then the subject, and the effects last. It\'s like coding the design.\nThis whole carousel was made there. I didn\'t even open Photoshop.\nWhich one do you like better: slide 2 or this one? 👇\n.\n.\n#aidesign #claude #graphicdesign',
  slides: [
    // 1. Cover: the real laughing selfie, edited in Nano Banana Pro: yellow T-shirt and, in his hand, a printed carousel.
    // Near-black flat background, no glow behind him and no notification (the proof is the carousel in his hand).
    {
      tipo: 'capa', tema: 'preto',
      fundoLiso: '#0e0d0c',
      titulo: {
        pre: 'how to make', preEspaco: 22,
        script: 'D', fonteScript: 'Great Vibes', scriptTam: 280, condensada: 'ESIGNS', tam: 180, y: 240, semSombra: true, encaixe: -0.16,
        foco: { esq: 4, dir: 12, centro: [0.25, 0.7] },
        pos: 'look good with <span class="serifa">AI</span>', posTam: 54,
      },
      assunto: { arq: 'bicho-placas.png', x: 85, y: 362, w: 860, sombra: false, brilho: false, cru: true },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.1, 0.92], pequeno: true },
    },

    // 2. The problem, with the proof: the ChatGPT design from one prompt.
    {
      tipo: 'miolo', tema: 'branco',
      titulo: 'Does your AI design <span class="serifa">look</span> like AI?',
      texto: 'One prompt in ChatGPT and you get this: black, gold, a rising chart and made-up numbers.',
      prova: { tipo: 'imagem', arq: 'gpt-arte-um-prompt.png', w: 540, legenda: 'one prompt, in ChatGPT' },
    },

    // 3. The why: everything at once.
    {
      tipo: 'miolo', tema: 'preto',
      titulo: 'The mistake is asking for<br><span class="serifa">everything</span> at once.',
      texto: 'Background, copy, photo and effects in one prompt. The AI fills the gaps with clichés.',
      prova: {
        tipo: 'numeros',
        itens: [{ v: '1', t: 'prompt for everything', fraco: true }, { v: '5', t: 'steps, one at a time' }],
        pe: 'the way I do it in Claude',
      },
    },

    // 4 to 7. This carousel's cover being built, step-by-step (real layers).
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'step 1',
      titulo: 'First, just the <span class="serifa">background</span>.',
      texto: 'The color and the mood. Nothing else.',
      prova: { tipo: 'imagem', arq: `${ETAPAS}/1-fundo.jpg`, w: 500 },
    },
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'step 2',
      titulo: 'Then, the <span class="serifa">title</span>.',
      texto: 'One alignment, one word that carries the idea.',
      prova: { tipo: 'imagem', arq: `${ETAPAS}/2-titulo.jpg`, w: 500 },
    },
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'step 3',
      titulo: 'Now the <span class="serifa">subject</span> comes in.',
      texto: 'The cutout goes in front of the title. That\'s what gives it depth.',
      prova: { tipo: 'imagem', arq: `${ETAPAS}/3-assunto.jpg`, w: 500 },
    },
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'step 4',
      titulo: 'Last, the <span class="serifa">effects</span>.',
      texto: 'Only where they make sense: blur at the end of the word, the tag and the texture.',
      prova: { tipo: 'imagem', arq: `${ETAPAS}/4-final.jpg`, w: 500 },
    },

    // 8. Why it works: every layer is code.
    {
      tipo: 'miolo', tema: 'branco',
      titulo: 'It\'s like Claude <span class="serifa">codes</span><br>the design.',
      texto: 'Every layer is code: you change one and the rest stays put. <b>This whole carousel&nbsp;was&nbsp;made&nbsp;there.</b> No Photoshop.',
      prova: {
        tipo: 'conversa',
        eu: 'Move the title down so the lizard goes in front.',
        ia: 'Done. I only moved the title, nothing else.',
      },
    },

    // 9. The mini course.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'want to learn?',
      titulo: 'The <span class="serifa">step-by-step</span><br>is in the mini course.',
      texto: 'From scratch: your style, the steps and reviewing every design, all in Claude.',
      prova: {
        tipo: 'oferta', selo: 'mini course',
        imagem: 'curso-card-en.jpg',
        titulo: 'Posts on Autopilot with Claude',
        itens: ['18 short lessons, from scratch', 'Kit with the prompts and templates', 'Layered design, no Photoshop'],
        preco: '$19', pe: 'link in bio',
      },
    },

    // 10. Call to action: closes in black, with the Filipe of the cover closer.
    {
      tipo: 'chamada', tema: 'preto',
      fundoLiso: '#0e0d0c',
      titulo: { pre: 'comment', condensada: 'LAYERS', centro: true, y: 225, tam: 300 },
      assunto: { foto: true, arq: 'bicho-placas.png', x: 190, y: 240, w: 700, sombra: false, brilho: false, cru: true },
      blocos: [{
        tipo: 'nota', x: 110, y: 1040, w: 860, tam: 38, solido: true,
        html: 'and I\'ll send you the <span class="serifa" style="font-size:50px;color:#ff9a1f">5-step prompt</span> 🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">in your DMs: the same one I used for this carousel</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
