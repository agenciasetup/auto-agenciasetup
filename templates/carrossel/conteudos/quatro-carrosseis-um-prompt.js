// Conteúdo: "4 carrosséis que eu fiz com um prompt no Claude" (24/10/2026). 8 slides.
// Tese: com um prompt bem feito (e o método por trás), o Claude faz carrosséis bonitos em estilos bem diferentes.
// Os 4 são reais: o da Setup (as capas dos outros carrosséis deste lote) e o do advogado, o elegante e o religioso
// (public/img/estilos/). Capa branca: o Filipe apresenta os 4 em leque na mão aberta, com o prompt embaixo.
// Palavra: PROMPT (material: os 4 prompts).
const ESTILOS = '../../public/img/estilos';
const CARROSSEIS = '../../_local/carrossel';
window.CARROSSEL = {
  nome: 'quatro-carrosseis-um-prompt',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'PROMPT',
  legenda: 'Comenta PROMPT que eu te mando os 4 prompts no direct! 🦎\nNada de Photoshop, nada de Canva. Um prompt pra cada estilo: o nosso, o de um advogado, um elegante e um religioso.\nO segredo não é a palavra mágica, é o método: estilo, etapas e revisão.\nQual dos 4 é a sua cara? 👇\n.\n.\n#boracalango #designcomia #claude',
  slides: [
    // 1. Capa (24/10/2026, revista): título centralizado, foto nova (ele apresenta com a mão aberta, sem sorriso
    // forçado) e os 4 carrosséis de verdade em leque em cima da mão: o da Setup, o do advogado, o elegante e o religioso.
    // Sem sombra projetada e sem luz de fundo (no branco, ela virava o borrão laranja que ele reprovou).
    {
      tipo: 'capa', tema: 'branco',
      fundoLiso: '#f3f0ea',
      titulo: {
        pre: 'fiz 4 <span class="serifa">carrosséis</span> com um', preEspaco: 66, preLado: 'centro', // acima do floreio do P
        script: 'P', fonteScript: 'Great Vibes', scriptTam: 300, condensada: 'ROMPT', tam: 220, y: 255, encaixe: -0.14,
        foco: { esq: 4, dir: 8, centro: [0.26, 0.74] },
      },
      // A palma fica em (x + 0,108 w, y + 0,56 da altura) da foto; o leque abre logo acima dela.
      assunto: { arq: 'filipe-v7-prompt.png', cru: true, x: 110, y: 200, w: 1100, sombra: false, brilho: false },
      // Embaixo da mão, o prompt que fez os quatro (o selo clica em enviar).
      blocos: [
        { tipo: 'imagem', arq: `${ESTILOS}/religioso-1.webp`, x: 55, y: 600, w: 245, rot: -14 },
        { tipo: 'imagem', arq: `${ESTILOS}/elegante-1.webp`, x: 158, y: 562, w: 245, rot: -5 },
        { tipo: 'imagem', arq: `${ESTILOS}/advogado-1.webp`, x: 262, y: 562, w: 245, rot: 5 },
        { tipo: 'imagem', arq: `${CARROSSEIS}/criado-no-claude/01.jpg`, x: 365, y: 600, w: 245, rot: 14 },
        { tipo: 'prompt', x: 60, y: 1118, w: 440, texto: 'Faz 4 carrosséis com estilos diferentes' },
      ],
      selo: { aponta: '.caixa-prompt .enviar', ponto: [0.5, 0.6], pequeno: true },
    },

    // 2. O contexto.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'Calango,', vocativo: true,
      titulo: 'Um <span class="serifa">prompt</span> pra cada estilo.',
      texto: 'Nada de Photoshop, nada de Canva. Mandei o prompt, revisei e saiu isso:',
      prova: {
        tipo: 'conversa',
        eu: 'Faz um carrossel pra um advogado falar de voo atrasado. Sério, verde escuro.',
        ia: 'Pronto: 3 slides, com o cartão do voo e o que a pessoa tem direito a cada hora de atraso.',
      },
    },

    // 3 a 6. Os 4 carrosséis (3 slides de cada, em leque).
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: '1 · o nosso',
      titulo: 'O da Setup: <span class="serifa">amarelo</span>,<br>com a minha cara.',
      // Capas reais da Setup, com o rosto dele (exporte estes três carrosséis antes deste).
      prova: { tipo: 'galeria', itens: [`${CARROSSEIS}/vale-a-pena-claude/01.jpg`, `${CARROSSEIS}/posts-no-automatico/01.jpg`, `${CARROSSEIS}/skill-social-media/01.jpg`], legenda: 'agência de social media' },
    },
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: '2 · advogado',
      titulo: 'Pra um <span class="serifa">advogado</span>:<br>sério e confiável.',
      prova: { tipo: 'galeria', itens: [`${ESTILOS}/advogado-2.webp`, `${ESTILOS}/advogado-1.webp`, `${ESTILOS}/advogado-3.webp`], legenda: 'direito do passageiro' },
    },
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: '3 · elegante',
      titulo: 'Pra uma marca <span class="serifa">elegante</span>:<br>editorial.',
      prova: { tipo: 'galeria', itens: [`${ESTILOS}/elegante-2.webp`, `${ESTILOS}/elegante-1.webp`, `${ESTILOS}/elegante-3.webp`], legenda: 'curso e marca pessoal' },
    },
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: '4 · religioso',
      titulo: 'Pra uma página <span class="serifa">católica</span>:<br>pintura e luz.',
      prova: { tipo: 'galeria', itens: [`${ESTILOS}/religioso-2.webp`, `${ESTILOS}/religioso-1.webp`, `${ESTILOS}/religioso-3.webp`], legenda: 'fé e evangelização' },
    },

    // 7. O mini curso: o método por trás.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'o método',
      titulo: 'O prompt é só o <span class="serifa">começo</span>.',
      texto: 'No mini curso eu mostro o que faz ficar bonito: o estilo, as etapas e a revisão de cada slide.',
      prova: {
        tipo: 'oferta',
        imagem: 'curso-card.jpg',
        titulo: 'Posts automáticos com Claude',
        itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Do seu estilo ao post pronto'],
        preco: 'R$ 39,90', pe: 'link na bio',
      },
    },

    // 8. Chamada: fecha no branco, com o Filipe rindo (a foto de perto da capa não deixa lugar para o bloco).
    {
      tipo: 'chamada', tema: 'branco',
      fundoLiso: '#f3f0ea',
      titulo: { pre: 'comenta', condensada: 'PROMPT', x: 110, y: 230, tam: 250 },
      assunto: { foto: true, cru: true, arq: 'filipe-v7-prompt.png', x: 110, y: 290, w: 1100, sombra: false, brilho: false }, // a mão aberta apresenta a nota
      blocos: [{
        tipo: 'nota', x: 60, y: 760, w: 540, tam: 36, solido: true,
        html: 'que eu te mando os <span class="serifa" style="font-size:50px;color:#f06000">4 prompts</span> no direct 🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">o da Setup, o do advogado, o elegante e o religioso</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
