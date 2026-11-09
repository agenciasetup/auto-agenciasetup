// English version of quem-cria-usa-menos-ia.js ("Only 1 in 3 creatives use AI at work"), for @setupagency_eng. 8 slides.
// Same layout, photos and colors; only the text changes. Thesis: in the US, only 32% of people who work in the arts use
// AI at work (average: 62%) and 200K creative jobs disappeared in 4 years. You can't put all the blame on AI, but the
// risk is being the last one to use it. Source: Apricitas Economics, 09/27/2026
// (https://www.apricitas.io/p/ai-and-the-fall-of-the-creative-class). The numbers are from the US, and the post says so.
// Keyword: FUTURE (material: the 10 tasks to hand off to Claude).
window.CARROSSEL = {
  nome: 'quem-cria-usa-menos-ia-en',
  marca: { perfil: '@setupagency_eng', nome: 'Setup Agency', selo: 'setup' },
  capas: [],
  palavra: 'FUTURE',
  legenda: 'Only 1 in 3 creatives use AI at work 😳\nIn the US, only 32% of people who work in the arts use AI on the job. The average is 62%. And 200K creative jobs disappeared in 4 years.\nCan you blame it all on AI? No. But the risk isn\'t AI showing up, it\'s you being the last one to use it.\nComment FUTURE and I\'ll DM you the 10 tasks to hand off to Claude this week 🦎\nHave you handed any tasks off to AI yet? 👇\n.\n.\n#socialmedia #ai #creatives',
  slides: [
    // 1. Cover: the "wait, what?" face of someone who just read the number; the number is in the chart next to him, sharp.
    {
      tipo: 'capa', tema: 'branco',
      fundoLiso: '#f3f0ea',
      fundoBlocos: [{ tipo: 'grafico', deitado: true, x: 762, y: 640, w: 262, titulo: 'Use AI at work', pe: 'US, 2026', itens: [{ t: 'creatives', v: '32%', p: 0.32, destaque: true }, { t: 'everyone', v: '62%', p: 0.62 }] }],
      titulo: { semSombra: false,
        pre: 'only 1 in 3', preEspaco: 10,
        script: 'C', fonteScript: 'Great Vibes', scriptTam: 260, condensada: 'REATIVES', tam: 190, y: 220, encaixe: -0.16, dx: -40,
        foco: { esq: 4, dir: 7, centro: [0.25, 0.8] },
        pos: 'use <span class="serifa">AI</span> at work', posTam: 50,
      },
      assunto: { arq: 'filipe-v8-futuro.png', cru: true, x: -95, y: 225, w: 1250, sombra: false, brilho: false },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.4, 0.9], pequeno: true },
    },

    // 2. The number.
    {
      tipo: 'miolo', tema: 'preto',
      titulo: 'Look at this <span class="serifa">number</span>.',
      texto: 'In the US, only 32% of people who work in the arts use AI on the job. The average across everyone is 62%.',
      prova: { tipo: 'numeros', tam: 170, itens: [{ v: '32%', t: 'arts and entertainment' }, { v: '62%', t: 'average across all industries', fraco: true }], pe: 'Apricitas Economics, September 2026' },
    },

    // 3. The losses.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'in the US',
      titulo: 'In 4 years, 200K creative<br><span class="serifa">jobs</span> disappeared.',
      texto: 'Film, TV, news and magazines lost the most.',
      prova: { tipo: 'barras', itens: [{ t: 'Film and TV', v: 'over 100K', p: 1 }, { t: 'Writing and publishing', v: 'over 70K', p: 0.7 }, { t: 'Live events', v: 'grew', p: 0.3, sobe: true }], pe: 'creative jobs lost, 2022 to 2026' },
    },

    // 4. The blame: honesty that builds trust.
    {
      tipo: 'miolo', tema: 'preto',
      titulo: 'Was it AI? Not even the<br><span class="serifa">economists</span> know.',
      prova: { tipo: 'conversa', eu: 'Did AI take these jobs?', ia: 'Partly. Studios are merging, production is moving abroad and audiences are trading TV for creators. You can\'t pin it all on AI.' },
    },

    // 5. Who lost.
    {
      tipo: 'miolo', tema: 'branco',
      titulo: 'But look at <span class="serifa">who</span> lost.',
      texto: 'The digital side lost jobs. Live work grew.<br>Screen-only work is at risk.',
      prova: { tipo: 'colunas', colunas: [{ titulo: 'lost jobs', itens: ['Film and TV', 'News and magazines', 'Graphic design'] }, { titulo: 'grew', itens: ['Shows and events', 'Anything live'], destaque: true }] },
    },

    // 6. The lesson.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'the lesson',
      titulo: 'The risk is being<br>the <span class="serifa">last</span> one.',
      texto: 'AI showing up isn\'t the problem. The problem is being the last one to use it.',
      prova: { tipo: 'colunas', colunas: [{ titulo: 'hand off to AI', itens: ['Topics', 'Drafts', 'Rough layouts', 'Captions'] }, { titulo: 'stays with you', itens: ['The idea', 'The taste', 'The client', 'The sale'], destaque: true }] },
    },

    // 7. The mini course.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'the method',
      titulo: 'Handing off the busywork<br>is what I <span class="serifa">teach</span>.',
      texto: 'In the mini course, we set up Claude together to do the busywork, so you keep the part that makes money.',
      prova: {
        tipo: 'oferta', selo: 'mini course',
        imagem: 'curso-card-en.jpg',
        titulo: 'Posts on Autopilot with Claude',
        itens: ['18 short lessons, from scratch', 'Kit with the prompts and templates', 'Ideas, copy and design on autopilot'],
        preco: '$19', pe: 'link in bio',
      },
    },

    // 8. Call to action: back to the cream of the cover.
    {
      tipo: 'chamada', tema: 'branco',
      fundoLiso: '#f3f0ea',
      titulo: { pre: 'comment', condensada: 'FUTURE', centro: true, y: 225, tam: 300 },
      assunto: { foto: true, cru: true, arq: 'filipe-v8-futuro.png', x: -170, y: 90, w: 1380, sombra: false, brilho: false },
      blocos: [{
        tipo: 'nota', x: 110, y: 1070, w: 860, tam: 38, solido: true,
        html: 'and I\'ll DM you <span class="serifa" style="font-size:50px;color:#f06000">10 tasks</span> 🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">to hand off to Claude this week, with the prompt ready</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
