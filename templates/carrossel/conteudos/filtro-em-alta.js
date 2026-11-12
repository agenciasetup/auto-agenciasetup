// Tarefa do Em alta (11/11/2026). Nenhuma pauta das últimas 24 h passou nos 4 testes (ficha em
// _local/carrossel/filtro-em-alta/ficha.md), então o post conta o próprio filtro, com o radar de hoje como prova:
// - Adobe MAX (agentes de IA e MCP no Photoshop, calor 82; The Verge, TNW, iMasters): já tem Reel na fila hoje
//   ("Reel: Claude no Photoshop (Adobe MAX)", agendado 11/11 12h).
// - O Claude abre o Canva dentro do chat (calor 74, post no Reddit de 11/11): o Canva já entrava no Claude desde
//   janeiro (MacRumors, 27/01/2026), a novidade de 10/11 só aparece em uma fonte, e Canva não é o que a gente ensina.
// - Gemini 4 Carbon (calor 68, blog do Google, 10/11): modelo novo, mas não muda o post de ninguém amanhã.
// A frase do dono no slide 4 é dele sobre o carrossel do Figma Weave (31/10, references/licoes.md).
// Capa: martim-pescador com UM peixe no bico, num galho com musgo sobre o rio turquesa, capim desfocado na frente
// (Magnific do Windows, Nano Banana 2.1 ilimitado, opção D de 5). De tudo que passa no rio, ele pega um.
// Teste de estilo da semana (9dcbc201): assunto grande perto da lente, algo desfocado na frente, cena natural, cor viva.
(() => {
  const X = -10, W = 1100;
  // cena.py com desce 220 na largura 1100: a cena começa 220 px acima do recorte.
  const bicho = (y, x = X, w = W) => ({ arq: 'bicho-martim-filtro.png', x, y, w, sombra: false, brilho: false, cru: true });
  const cena = (y, x = X, w = W) => ({ fundoFoto: { arq: 'martim-filtro-cena.jpg', x, y: y - Math.round(220 * w / 1100), w } });
  // Etapa 1: com Y 140 a cabeça tapava "pra assunto"; em 200 a crista só encosta na base da linha de baixo.
  const Y = 170, Y_CH = 215;
  // Revisor (1ª rodada): Y 200 deixava 40 px de vão entre a crista e "assunto"; em 170 a crista encosta na linha.
  window.CARROSSEL = {
    nome: 'filtro-em-alta',
    marca: { perfil: '@agenciasetup', nome: 'Calango' },
    capas: [],
    palavra: 'FILTRO',
    legenda: '',
    slides: [
      {
        tipo: 'capa', tema: 'preto', ...cena(Y),
        titulo: {
          semSombra: true,
          pre: '<span style="color:#ffffff">o meu</span>', preLado: 'centro',
          script: 'F', fonteScript: 'Great Vibes', scriptTam: 300, condensada: 'ILTRO', tam: 230, y: 250, encaixe: -0.2, folgaTopo: 0.12, dx: -20,
          cor: '#ffffff', corScript: 'linear-gradient(160deg, #ffd21a 15%, #ffa600 55%, #ff7f00 95%)',
          foco: { esq: 2, dir: 3, centro: [0.26, 0.74] },
          pos: '<span style="color:#ffffff">pra assunto em <span class="serifa" style="color:#ffcc00">alta</span></span>', posTam: 44, posLado: 'centro', posEspaco: 0,
        },
        assunto: bicho(Y),
        selo: { aponta: '.pos-titulo .serifa', ponto: [0.5, 0.95], pequeno: true },
        // Capa animada: a câmera chegando no martim-pescador. Fundo e assunto escalam em volta do mesmo ponto, os pés
        // no galho (440, 1080): os pés não escorregam e o pássaro da cena, que encolhe, fica sempre atrás do recorte,
        // que cresce (sem placa). Sem deriva pelo mesmo motivo. Cada camada no seu ritmo: o fundo afasta 1 vez, o
        // pássaro chega 1 vez com atraso, o título respira 2, a luz 3, e o cursor seleciona "alta".
        movimento: {
          fundo: { escala: -0.025, origem: [440, 1080] },
          assunto: { escala: 0.035, origem: [440, 1080], fase: 0.15 },
          titulo: { escala: 0.016, voltas: 2, fase: 0.35 },
          luz: { brilho: 0.05, vinheta: 0.4, voltas: 3, fase: 0.2 },
          selo: { modo: 'selecionar' },
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'Calango,', vocativo: true,
        titulo: 'hoje o meu radar trouxe <span class="serifa">40</span> pautas quentes.',
        texto: 'Ele lê 25 sites de IA e design todo dia.<br>As 3 mais quentes caíram no meu filtro.',
        prova: {
          tipo: 'lista',
          itens: [
            { calor: 82, t: 'Novidades de IA no Photoshop', fonte: 'caiu: já tem 2 posts disso na semana' },
            { calor: 74, t: 'O Claude abre o Canva no chat', fonte: 'caiu: não deu pra confirmar' },
            { calor: 68, t: 'Saiu o Gemini 4 Carbon', fonte: 'caiu: não muda o post de ninguém' },
          ],
        },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'pergunta 1',
        titulo: 'Isso muda o <span class="serifa">meu</span> jeito de postar?',
        texto: 'Se o meu processo continua igual amanhã,<br>é só notícia. E notícia o jornal dá melhor.',
        prova: {
          tipo: 'exemplo', cor: '#141311', tinta: '#f5f1ea', legenda: 'o Gemini 4 Carbon, hoje',
          html: `<div style="font-family:Outfit;font-size:44px;line-height:1.5;text-align:center"><span style="opacity:.6">modelo novo do Google</span><br><b style="font-weight:700">amanhã eu posto do mesmo jeito</b><br><span style="font-family:'Instrument Serif',serif;font-style:italic;font-size:70px;color:#ffaa00">não vira post</span></div>`,
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'pergunta 2',
        titulo: 'Tem a ver com o que eu <span class="serifa">vendo</span>?',
        texto: 'Eu vendo posts no automático. Ferramenta<br>legal sem ligação com isso não vende.',
        prova: {
          tipo: 'exemplo', cor: '#f5f1ea', tinta: '#141311', legenda: 'o que eu disse de um carrossel do Figma',
          html: `<div style="font-family:'Instrument Serif',serif;font-style:italic;font-size:54px;line-height:1.25;text-align:center">"achei meio fora do que falamos, por mais que seja em alta"</div>`,
        },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'pergunta 3',
        titulo: 'Eu já falei disso nos últimos <span class="serifa">14 dias</span>?',
        texto: 'Repetir assunto cansa quem te segue.<br>Eu olho o que saiu e o que está na fila.',
        prova: { tipo: 'codigo', arquivo: 'a minha fila, esta semana', linhas: ['09/11  Feito 100% no Claude', '11/11  Reel: Claude no Photoshop', '12/11  Eu abandonei o Photoshop', '', 'Novidades de IA no Photoshop?', 'Terceiro post do assunto: cai.'] },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'pergunta 4',
        titulo: 'Dá pra <span class="serifa">confirmar</span> na fonte?',
        texto: 'Post de rede social não é fonte. Eu procuro<br>em site grande e no de quem lançou.',
        prova: {
          tipo: 'exemplo', cor: '#f5f1ea', tinta: '#141311', legenda: 'o Canva no Claude, procurado hoje',
          html: `<div style="font-family:Outfit;font-size:37px;line-height:1.5;text-align:center"><span style="opacity:.6">o post de hoje dizia</span><br><b style="font-weight:700">"o Claude agora abre o Canva"</b><br><span style="opacity:.6">fonte: 1 post no Reddit</span><br><span style="opacity:.6">nos sites grandes, só uma<br>notícia de janeiro</span><br><span style="font-family:'Instrument Serif',serif;font-style:italic;font-size:54px;color:#d95f00">não deu pra confirmar</span></div>`,
        },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'o seu radar',
        titulo: 'Quer montar o seu <span class="serifa">radar</span>?',
        texto: 'No mini curso você monta o seu Claude que acha o assunto quente, escreve no seu estilo e faz a arte.',
        prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Estilo, pauta, texto e arte'], preco: 'R$ 39,90', pe: 'link na bio' },
      },
      {
        tipo: 'chamada', tema: 'preto', ...cena(Y_CH),
        titulo: { pre: 'comenta', condensada: 'FILTRO', centro: true, y: 225, tam: 300, cor: '#ffffff' },
        assunto: { foto: true, ...bicho(Y_CH) },
        blocos: [{ tipo: 'nota', x: 110, y: 1150, w: 860, tam: 30, solido: true, fundo: '#0d2b29', html: '<span style="color:#f5f1ea">e recebe no direct</span> <span class="serifa" style="font-size:42px;color:#ffcc00">o prompt do radar + as 4 perguntas</span>' }],
        // Revisor: o selo comia a curva do O ("FILTRQ"); vai para baixo da palavra.
        selo: { aponta: '.palavra-chamada', pontoCentro: [0.9, 1.12], pequeno: true },
      },
    ],
  };
})();
