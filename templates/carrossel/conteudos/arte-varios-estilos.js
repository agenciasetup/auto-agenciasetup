// Pedido do dono (31/10/2026), no lugar do Figma Weave: "Como fazer arte bonita de vários estilos com IA". 8 slides.
// Tese: estilo não é adjetivo, é uma ficha com 4 decisões (cor, letra, imagem, acabamento). Quem preenche a ficha muda de
// estilo sem cair na arte com cara de IA. Ângulo diferente do "4 carrosséis com um prompt" (30/10): lá eram os prompts;
// aqui, a ficha. As artes são as reais de public/img/estilos/, as mesmas daquele post, e o texto de cada ficha descreve o
// que está nelas. Capa em azul: o mico com o leque de 4 estilos. Palavra: ESTILOS.
(() => {
  const ESTILOS = '../../public/img/estilos';
  const CENA = { fundoFoto: { arq: 'mico-cena.jpg', x: -10, y: -30, w: 1100 } };
  const BICHO = { arq: 'bicho-mico.png', x: -10, y: 170, w: 1100, sombra: false, brilho: false, cru: true };
  window.CARROSSEL = {
    nome: 'arte-varios-estilos',
    marca: { perfil: '@agenciasetup', nome: 'Calango' },
    capas: [],
    palavra: 'ESTILOS',
    legenda: 'Comenta ESTILOS que eu te mando a ficha de estilo com os prompts no direct! 🦎\nMuita gente pede "faz uma arte bonita" e depois reclama que sai tudo com a mesma cara.\nBonito não diz nada pra IA. Cor, letra, imagem e acabamento dizem.\nQual estilo você mais precisa fazer? 👇\n.\n.\n#boracalango #designcomia #claude',
    slides: [
      {
        tipo: 'capa', tema: 'preto', ...CENA,
        titulo: { semSombra: true, pre: 'arte bonita em', preEspaco: 14, preLado: 'centro', script: '', condensada: 'VÁRIOS', tam: 190, folgaTopo: 0.12, linha2: 'Estilos', fonte2: 'Great Vibes', tam2: 170, cor2: 'linear-gradient(90deg,#ffc83d,#ff9a1f)', foco2: { esq: 1, dir: 2, centro: [0.2, 0.8] }, bloco: 560, vao: -165, y: 280, foco: { esq: 3, dir: 4, centro: [0.28, 0.72], min: 0.6 } },
        assunto: BICHO,
        selo: { aponta: '.titulo-capa .progressivo .condensada', ponto: [0.98, 0.75], pequeno: true },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'Calango,', vocativo: true,
        titulo: '"Faz uma arte <span class="serifa">bonita</span>" não diz nada pra IA.',
        texto: 'Sem você decidir, ela escolhe o de sempre. É daí que vem a cara de IA.',
        prova: { tipo: 'exemplo', cor: '#141311', tinta: '#f5f1ea', html: `<div style="font-family:Outfit;font-size:40px;line-height:1.5;text-align:left"><span style="opacity:.55">Em vez de:</span><br><b style="font-weight:700">"bonito e profissional"</b><div style="height:20px"></div><span style="opacity:.55">Peça:</span><br><b style="font-weight:700;color:#ff9a1f">"quase preto, verde vivo no destaque, cartão com o dado do post"</b></div>` },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'a ficha',
        titulo: 'Todo estilo são <span class="serifa">4 decisões</span>.',
        texto: 'Troca as quatro e muda o estilo inteiro.',
        prova: { tipo: 'checklist', itens: ['Cor: quais e em que quantidade', 'Letra: de título e de texto', 'Imagem: foto, pintura ou nenhuma', 'Acabamento: liso, papel ou ruído'] },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'ficha 1 · advogado',
        titulo: 'Sério e <span class="serifa">confiável</span>.',
        texto: 'Quase preto, verde vivo no destaque, letra sem serifa, um cartão com o dado e acabamento liso.',
        prova: { tipo: 'galeria', itens: [`${ESTILOS}/advogado-2.webp`, `${ESTILOS}/advogado-1.webp`, `${ESTILOS}/advogado-3.webp`], legenda: 'feito no Claude' },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'ficha 2 · elegante',
        titulo: 'Cara de <span class="serifa">revista</span>.',
        texto: 'Pouca cor, letra fina, foto grande e acabamento de papel.',
        prova: { tipo: 'galeria', itens: [`${ESTILOS}/elegante-2.webp`, `${ESTILOS}/elegante-1.webp`, `${ESTILOS}/elegante-3.webp`], legenda: 'feito no Claude' },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'ficha 3 · religioso',
        titulo: 'Pintura e <span class="serifa">luz</span>.',
        texto: 'Fundo escuro, título manuscrito, pintura clássica e acabamento com ruído.',
        prova: { tipo: 'galeria', itens: [`${ESTILOS}/religioso-2.webp`, `${ESTILOS}/religioso-1.webp`, `${ESTILOS}/religioso-3.webp`], legenda: 'feito no Claude' },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'e todo dia?',
        titulo: 'Guarda a ficha e o Claude <span class="serifa">repete</span> todo dia.',
        texto: 'No mini curso, o Claude aprende o seu estilo e faz a arte do que você aprovou.',
        prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Arte em alto padrão, sem Photoshop'], preco: 'R$ 39,90', pe: 'link na bio' },
      },
      {
        tipo: 'chamada', tema: 'preto', ...CENA,
        titulo: { pre: 'comenta', condensada: 'ESTILOS', centro: true, y: 265, tam: 280 },
        assunto: { foto: true, ...BICHO },
        blocos: [{ tipo: 'nota', x: 190, y: 1115, w: 700, tam: 36, solido: true, fundo: '#141311', html: `e eu te mando no direct<br><span class="serifa" style="font-size:48px;color:#ff9a1f">a ficha com os prompts</span>` }],
        selo: { aponta: '.palavra-chamada', pontoCentro: [0.86, 0.9], pequeno: true },
      },
    ],
  };
})();
