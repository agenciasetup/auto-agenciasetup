// Tarefa do dia (10/11/2026), Em alta: a Anthropic lançou o Claude Fable 5.2 em 09/11/2026.
// Fontes conferidas: anúncio oficial (anthropic.com/claude-fable-and-mythos-5-2), claude.com/pricing e o artigo de
// suporte da promoção (support.claude.com/en/articles/17506494). TechCrunch e The Verge só como confirmação.
// Ângulo: o que o modelo novo muda no nosso processo. Nada de trocar tudo: cada etapa do post tem um modelo.
// A prova é nossa (worker/lib): Haiku 5.5 responde comentário e direct (comenta.js, atendente.js), Sonnet 5.5 escreve
// roteiros e versões de mensagem (roteirista.js, comenta.js), Opus 5.5 monta o plano de posts (plano.js; o de 08/11
// custou US$ 0,20392) e este carrossel foi montado pelo Fable 5.2.
// Preços (API, por milhão de tokens de entrada, claude.com/pricing em 10/11/2026): Haiku 0,10; Sonnet 2; Opus 4; Fable 8.
// Capa: três spitz brancos de três tamanhos, cada um atrás da tigela do seu tamanho (o tamanho certo para cada um).
// Magnific do Mac, Nano Banana 2.1 (ilimitado). Ficha em _local/carrossel/qual-modelo/ficha.md.
(() => {
  const X = -10, Y = 172, W = 1100;
  const bicho = (y = Y, x = X, w = W) => ({ arq: 'bicho-spitz-modelo.png', x, y, w, sombra: false, brilho: false, cru: true });
  // cena.py com desce 240 na largura 1100: a cena começa 240 px acima do recorte.
  const cena = (y = Y, x = X, w = W) => ({ fundoFoto: { arq: 'spitz-modelo-cena.jpg', x, y: y - Math.round(240 * w / 1100), w } });
  const ficha = (faixa, nome, preco, meu, seu, claro) => `<div style="font-family:Outfit;text-align:left;width:100%">
    <div style="font-family:'JetBrains Mono';font-size:21px;letter-spacing:.08em;opacity:.6;text-transform:uppercase">${faixa}</div>
    <div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:4px">
      <span class="serifa" style="font-size:86px;line-height:1;color:${claro ? '#e07a00' : '#ff9a1f'}">${nome}</span>
      <span style="font-size:27px;opacity:.75">${preco}</span>
    </div>
    <div style="height:1px;background:currentColor;opacity:.18;margin:22px 0 20px"></div>
    <div style="font-size:30px;line-height:1.3"><b>No meu sistema:</b> ${meu}</div>
    <div style="font-size:30px;line-height:1.3;margin-top:14px"><b>No seu post:</b> ${seu}</div>
  </div>`;
  const pe = 'preço da API por milhão de tokens de entrada';
  window.CARROSSEL = {
    nome: 'qual-modelo',
    marca: { perfil: '@agenciasetup', nome: 'Calango' },
    capas: [],
    palavra: 'MODELO',
    legenda: `Comenta MODELO que eu te mando a tabela de qual Claude usar em cada etapa do post! 🦎
Dia 9/11 saiu o Fable 5.2, o Claude mais forte. Muita gente vai querer usar ele pra tudo, mas na prática ele custa 80 vezes o mais leve na API, e modelo forte come o seu limite mais rápido.
Aqui cada etapa tem o seu: o leve responde comentário e direct, o do meio escreve, o forte planeja. O novo fica pro difícil. Este carrossel, por exemplo, foi montado nele.
Se você é Pro, até 16/11 dá pra testar o Fable com até metade do limite da semana, sem pagar a mais.
Qual Claude você usa pra tudo hoje? 👇
.
.
#boracalango #claude #socialmedia`,
    slides: [
      {
        tipo: 'capa', tema: 'amarelo', ...cena(), semRegua: true,
        titulo: {
          semSombra: true,
          pre: '<span style="color:#ffffff">saiu Claude novo. qual</span>', preLado: 'centro',
          script: 'M', fonteScript: 'Great Vibes', scriptTam: 250, condensada: 'ODELO', tam: 215, y: 258, dx: 30, encaixe: -0.16,
          cor: '#ffffff', corScript: '#141311',
          foco: { esq: 1.5, dir: 3.5, centro: [0.26, 0.74] },
          pos: '<span style="color:#141311">usar em cada <span class="serifa" style="color:#141311">post?</span></span>', posTam: 44, posLado: 'direita', posEspaco: 12,
        },
        assunto: bicho(),
        selo: { aponta: '.pos-titulo .serifa', ponto: [0.05, 1.02], pequeno: true },
        movimento: {
          fundo: { escala: 0.03, origem: [540, 760] },
          assunto: { escala: 0.03, origem: [540, 760] },
          titulo: { escala: 0.016, voltas: 2, fase: 0.35 },
          luz: { brilho: 0.05, vinheta: 0.4, voltas: 3, fase: 0.2 },
          selo: { modo: 'selecionar', de: 0.93, ate: 0 }, // da direita para a esquerda: a etiqueta não passa da janela
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'Calango,', vocativo: true,
        titulo: 'o Claude novo <span class="serifa">não é</span> pra tudo.',
        texto: 'Dia 9/11 saiu o Fable 5.2, o mais forte dos quatro. Na API, ele custa <b>80 vezes</b> o mais leve.',
        prova: {
          tipo: 'numeros',
          itens: [{ v: '8', t: 'dólares no Fable 5.2, o mais forte' }, { v: '0,10', t: 'dólar no Haiku 5.5, o mais leve', fraco: true }],
          pe: `${pe} · claude.com/pricing, 10/11/2026`,
        },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'o leve',
        titulo: 'O que <span class="serifa">repete</span> todo dia vai no leve.',
        texto: 'Tarefa curta, que acontece cem vezes por dia. Rápido e barato resolve.',
        prova: { tipo: 'exemplo', cor: '#141311', tinta: '#f5f1ea', h: 430, legenda: pe,
          html: ficha('modelo leve', 'Haiku 5.5', 'US$ 0,10', 'responde cada comentário e cada direct.', 'adaptar a legenda, variar um gancho, resumir uma pauta.') },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'o do meio',
        titulo: 'Texto que segue um <span class="serifa">guia</span> vai no do meio.',
        texto: 'Com o seu estilo escrito, ele não precisa adivinhar nada. Só seguir.',
        prova: { tipo: 'exemplo', cor: '#f5f1ea', tinta: '#141311', h: 430, legenda: pe,
          html: ficha('modelo do meio', 'Sonnet 5.5', 'US$ 2', 'escreve os roteiros e as versões das mensagens do direct.', 'legenda, roteiro e carrossel, seguindo o seu guia de estilo.', true) },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'o forte do dia a dia',
        titulo: '<span class="serifa">Planejar</span> vai no forte do dia a dia.',
        texto: 'É o que a própria Anthropic indica pra começar. Aqui, cada plano sai por uns US$ 0,20.',
        prova: { tipo: 'exemplo', cor: '#141311', tinta: '#f5f1ea', h: 430, legenda: pe,
          html: ficha('forte do dia a dia', 'Opus 5.5', 'US$ 4', 'lê os números e monta o plano de posts a cada 3 dias.', 'o calendário do mês e a escolha da pauta.') },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'o mais forte',
        titulo: 'O <span class="serifa">novo</span> fica pro difícil.',
        texto: 'Se você é Pro: até 16/11 dá pra usar até metade do limite da semana nele, sem pagar a mais.',
        prova: { tipo: 'exemplo', cor: '#f5f1ea', tinta: '#141311', h: 430, legenda: pe,
          html: ficha('o mais forte', 'Fable 5.2', 'US$ 8', 'montou este carrossel, da pauta à montagem, um dia depois de sair.', 'montar o seu estilo e a sua rotina, uma vez só.', true) },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'a rotina inteira',
        titulo: 'E quem liga um modelo no <span class="serifa">outro</span>?',
        texto: 'No mini curso eu mostro a rotina inteira: pauta, texto e arte no seu estilo. Você só aprova.',
        prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Estilo, pauta, texto e arte'], preco: 'R$ 39,90', pe: 'link na bio' },
      },
      {
        tipo: 'chamada', tema: 'amarelo', ...cena(112), semRegua: true,
        titulo: { pre: '<span style="color:#ffffff">comenta</span>', condensada: 'MODELO', centro: true, y: 255, tam: 300, cor: '#ffffff' },
        assunto: { foto: true, ...bicho(112) },
        blocos: [{ tipo: 'nota', x: 110, y: 1196, w: 860, tam: 30, solido: true, fundo: '#141311', html: '<span style="color:#f5f1ea">e recebe</span> <span class="serifa" style="font-size:42px;color:#ffcc00">a tabela de qual Claude usar em cada etapa</span>' }],
        selo: { aponta: '.palavra-chamada', pontoCentro: [0.8, 1.0], pequeno: true },
      },
    ],
  };
})();
