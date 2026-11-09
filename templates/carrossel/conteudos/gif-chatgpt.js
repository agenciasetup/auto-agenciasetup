// Refeito em 06 e 07/11/2026 a pedido do Filipe ("não gostei do mascote"; o calango de 1928 ficou "muito feio, pensa
// em outro estilo mais fácil"). Tese: agora você pode fazer GIF no ChatGPT (Images 2.6,
// openai.com/index/introducing-images-2-6, 4/11/2026).
// Prova nossa, feita no ChatGPT em 06 e 07/11/2026:
// - o Mickey de 1928 (Steamboat Willie) foi recusado duas vezes ("semelhança com conteúdos de terceiros"): slide 6;
// - o Calango de pixel dos nossos Reels, mandado de referência, saiu de primeira dançando e acenando: GIF de 8 quadros,
//   276 x 695 px (pedido em 4:5), 0,16 s por quadro. Do quadro 5 pro 6 o braço desce de uma vez: slide 5.
// A capa e a chamada são animadas: cada quadro (recortado, devolvido à grade do GIF e ampliado x4 por vizinho mais
// próximo) entra como o assunto (&quadro=1..8), e o templates/carrossel/ferramentas/capa-gif.mjs junta só os quadros
// do aceno (2,3,4,5,4,3), sem o tranco, num MP4 em loop. Parada, a peça usa o quadro 4 (piscadinha).
// O cenário (imagens/cenario-sertao-pixel.png) também saiu do ChatGPT, no mesmo pixel; a lua foi para a esquerda,
// fora de trás do título.
(() => {
  const Q = new URLSearchParams(location.search).get('quadro') || '4';
  // O recorte tem 603 x 716 (todos os quadros na mesma caixa). x centraliza a caixa.
  const calango = (y, w = 620) => ({ arq: `calango-pixel-q${Q}.png`, x: 540 - w / 2, y, w, sombra: false, brilho: false, cru: true });
  // 07/11: capa preta com um cenário em pixel atrás (também do ChatGPT, mesmo estilo do Calango) e o título em duas
  // linhas, como ele escreveu: "agora você pode fazer / GIF no ChatGPT".
  const CENA = { fundoFoto: { arq: 'cenario-sertao-pixel.png', x: 32, y: 40, w: 1016 } };
  // Depois (07/11, pedido dele): "GIF bem grande, com um G cursivo, atrás do personagem, com efeito de desfoque; o
  // no ChatGPT pode ficar por cima do GIF". Sem a lua: o GIF fica sozinho no céu.
  const G = (tam) => `<span style="font-family:'Great Vibes',cursive;text-transform:none;font-weight:400;color:#ff8a00;-webkit-text-fill-color:#ff8a00;font-size:${tam}em;margin-right:-0.14em;position:relative;z-index:2">G</span>`;
  window.CARROSSEL = {
    nome: 'gif-chatgpt',
    marca: { perfil: '@agenciasetup', nome: 'Calango' },
    capas: [],
    palavra: 'GIF',
    legenda: '',
    slides: [
      {
        tipo: 'capa', tema: 'preto', ...CENA,
        titulo: {
          // Depois (07/11, com a referência do "Meu acervo de SITES"): "deixe GIF sem cursiva, o GIF por trás"; headline
          // "Abra o ChatGPT e crie um / GIF". A frase em cursiva em cima e a palavra enorme, nítida, atrás do Calango.
          // "o texto pode ser em fonte sans serif e ChatGPT cursiva" e "outra fonte cursiva pro GPT, que não dá pra ler"
          // (07/11): Dancing Script no lugar da Great Vibes. Mais espaço entre a frase e o GIF, o GIF mais baixo e com as
          // bordas bem desfocadas.
          semSombra: true, preLado: 'centro', preEspaco: 44,
          pre: 'Abra o <span style="font-family:\'Dancing Script\',cursive;font-weight:700;font-size:1.45em;color:#ffb347;line-height:0.8">ChatGPT</span> e crie um',
          script: '', condensada: 'GIF', tam: 700, y: 330,
          // Cor de areia, escurecendo de leve nas pontas desfocadas ("mais areia ao invés de branco, e nas bordas
          // desfocadas mais escuro, sutil"), no mesmo ângulo do desfoque.
          cor1: 'linear-gradient(120deg, #8a7150 0%, #cdb68c 20%, #eadab8 42%, #eadab8 62%, #cdb68c 82%, #8a7150 100%)',
          // Desfoque na diagonal (07/11: "um na ponta superior esquerda, outro na inferior direita"). Em 135° a lateral
          // reta do G voltava nítida de uma vez e parecia cortada; em 120° ela vai ficando nítida aos poucos.
          foco: { esq: 14, dir: 14, centro: [0.4, 0.66], angulo: 120 },
        },
        // O Calango cobre só a parte de baixo do GIF (o I continua lendo), com os pés no chão e uma sombrinha atrás
        // dele, no GIF (pedido de 07/11).
        assunto: { ...calango(595, 560), sombra: true, sombraX: 22, sombraY: 14 },
        selo: { aponta: '.titulo-capa .progressivo .condensada', ponto: [0.9, 0.03], pequeno: true },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'Calango,', vocativo: true,
        titulo: 'o GIF sai na própria<br><span class="serifa">conversa</span>.',
        texto: 'Veio no Images 2.6, lançado em 4/11, e segura<br>o mesmo personagem de uma edição pra outra.',
        prova: {
          tipo: 'numeros', tam: 175, semX: true,
          itens: [
            { v: '50%', t: 'mais rápido<br>pra gerar imagem' },
            { v: 'todos', t: 'os planos já têm', fraco: true },
          ],
          pe: 'Fonte: OpenAI, 4/11/2026.',
        },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'passo 1',
        titulo: 'Mande o <span class="serifa">personagem</span>.',
        texto: 'Eu mandei o Calango de pixel dos nossos Reels<br>e pedi ele acenando, com uma piscadinha.',
        prova: {
          tipo: 'checklist',
          itens: ['a imagem do personagem, de referência', 'o que ele faz, num movimento só', 'o estilo: pixel art 16 bits', 'fundo liso, sem texto e sem bordas', '8 quadros, o último voltando pro primeiro'],
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'passo 2',
        titulo: 'Ele devolve o<br><span class="serifa">GIF pronto</span>.',
        texto: '8 quadros, em menos de 1 minuto. Pedi 4:5<br>e veio 276 × 695 px: amplie antes de postar.',
        prova: { tipo: 'imagem', arq: 'calango-chatgpt-8-quadros.jpg', w: 780, legenda: 'os 8 quadros (cortei o fundo vazio de cima e de baixo)' },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'passo 3',
        titulo: 'Confira <span class="serifa">quadro por quadro</span>.',
        texto: 'No meu, o braço caiu de uma vez do 5 pro 6.<br>Na capa, eu usei só os quadros do aceno.',
        prova: {
          tipo: 'versus-imagens',
          itens: [
            { arq: 'calango-pixel-quadro-5.jpg', legenda: 'quadro 5' },
            { arq: 'calango-pixel-quadro-6.jpg', legenda: 'quadro 6: o braço caiu' },
          ],
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'cuidado',
        titulo: 'Personagem <span class="serifa">famoso</span>,<br>ele trava.',
        texto: 'Eu tentei o Mickey de 1928, que já é domínio público. O ChatGPT recusou duas vezes.',
        // O pedido e a resposta, com as palavras do print do ChatGPT (imagens/chatgpt-recusa-mickey.png), em letra que se lê no feed.
        prova: {
          tipo: 'exemplo', cor: '#0d0d0d', w: 820, h: 430, legenda: 'o meu pedido e a resposta do ChatGPT',
          html: '<div style="width:100%;text-align:left;font-family:Inter,sans-serif"><div style="margin-left:auto;max-width:560px;background:#1b3f78;color:#fff;border-radius:26px;padding:18px 24px;font-size:25px;line-height:1.4">Crie um GIF animado em loop do Mickey da versão Steamboat Willie (1928), que está em domínio público…</div><div style="margin-top:28px;color:#f2f2f2;font-size:27px;line-height:1.45">Lamentamos, mas a imagem que criámos pode violar as nossas proteções relativas à semelhança com conteúdos de terceiros.</div></div>',
        },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'e depois?',
        titulo: 'O GIF tá pronto.<br>E o <span class="serifa">post</span>?',
        texto: 'No mini curso, o Claude escreve e monta a arte de cada post. Você só aprova.',
        prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Estilo, pauta, texto e arte'], preco: 'R$ 39,90', pe: 'link na bio' },
      },
      {
        tipo: 'chamada', tema: 'preto', ...CENA,
        titulo: { pre: 'comenta', preEspaco: 24, condensada: 'GIF', centro: true, y: 295, tam: 420 },
        assunto: { foto: true, ...calango(620, 450) },
        blocos: [{ tipo: 'nota', x: 150, y: 1170, w: 780, tam: 28, solido: true, html: 'e eu te mando no direct<br><span class="serifa" style="font-size:36px">os 5 prompts de GIF pro mascote do seu cliente</span>' }],
        selo: { aponta: '.palavra-chamada', pontoCentro: [0.92, 0.35], pequeno: true },
      },
    ],
  };
})();
