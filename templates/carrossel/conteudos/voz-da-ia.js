// Tarefa do dia (09/11/2026). Nenhuma pauta do Em alta passou nos 4 testes (DeepSeek, Apple/Goldman e o
// "comment-to-DM" do Reddit: empresa, mercado ou sem confirmação). Ângulo novo sobre automatizar posts: como o
// Claude passou a escrever do jeito do Filipe. A prova é nossa: o guia de voz da skill
// (.claude/skills/carrossel-agenciasetup/references/voz.md), montado em 23/10/2026 a partir de 80 legendas
// (as 40 mais engajadas e as 40 mais recentes). As marcas, a lista do que não é a voz e o teste final dos slides
// são as do guia.
// Capa: arara-vermelha cantando no microfone (a IA que aprendeu a falar como o dono), Magnific, Nano Banana Pro.
// Ficha em _local/carrossel/voz-da-ia/ficha.md.
(() => {
  const X = 0, Y = 175, W = 1080;
  const bicho = (y = Y, x = X, w = W) => ({ arq: 'bicho-arara-voz.png', x, y, w, sombra: false, brilho: false, cru: true });
  // cena.py com desce 220 na foto de 1300: na largura W a cena começa 220 * W / 1300 px acima do recorte.
  const cena = (y = Y, x = X, w = W) => ({ fundoFoto: { arq: 'arara-voz-cena-alta.jpg', x, y: y - Math.round(220 * w / 1300), w } });
  window.CARROSSEL = {
    nome: 'voz-da-ia',
    marca: { perfil: '@agenciasetup', nome: 'Calango' },
    capas: [],
    palavra: 'VOZ',
    legenda: '',
    slides: [
      {
        tipo: 'capa', tema: 'preto', ...cena(), semRegua: true,
        titulo: {
          semSombra: true,
          pre: '<span style="color:#f5f1ea">ensinei a IA a escrever com a minha</span>', preLado: 'centro',
          script: 'V', fonteScript: 'Great Vibes', scriptTam: 310, condensada: 'OZ', tam: 270, y: 280, dx: -10, encaixe: -0.02, folgaTopo: 0.12,
          cor: '#ffffff', corScript: 'linear-gradient(160deg, #ffd21a 15%, #ffa600 55%, #ff7f00 95%)',
          foco: { esq: 1.5, dir: 4, centro: [0.26, 0.74] },
        },
        assunto: bicho(),
        selo: { aponta: '.titulo-capa .progressivo .condensada', ponto: [0.8, 0.92], pequeno: true },
        // Capa animada (regra de 08/11): a câmera chega devagar na arara (cena e recorte na mesma escala e na mesma
        // origem, perto do bico, para não precisar de placa sem o bicho), o título respira em outro ritmo, a luz do
        // fundo em outro, e o cursor fica parado e só seleciona o VOZ.
        movimento: {
          fundo: { escala: 0.03, origem: [330, 700] },
          assunto: { escala: 0.03, origem: [330, 700] },
          titulo: { escala: 0.016, voltas: 2, fase: 0.35 },
          luz: { brilho: 0.05, vinheta: 0.4, voltas: 3, fase: 0.2 },
          selo: { modo: 'selecionar', cor: 'rgba(8, 40, 90, 0.72)' },
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'Calango,', vocativo: true,
        titulo: 'sem guia, a IA escreve com <span class="serifa">cara de IA</span>.',
        texto: 'Palavra que ninguém fala e travessão em toda frase. Aí eu dei pro Claude ler as minhas legendas.',
        prova: {
          tipo: 'exemplo', cor: '#f5f1ea', tinta: '#141311', legenda: 'exemplo do jeito que a IA escreve sem guia',
          html: `<div style="font-family:Outfit;font-size:48px;line-height:1.45;text-align:center">"<span style="color:#d4342a;text-decoration:line-through">Desvende</span> o poder das cores e <span style="color:#d4342a;text-decoration:line-through">revolucione</span> seus posts <span style="color:#d4342a;font-weight:700">—</span> confira!"</div>`,
        },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'passo 1',
        titulo: 'Separei <span class="serifa">80</span> legendas minhas.',
        texto: 'As que mais deram comentário mostram o que funciona. As mais recentes, como eu falo hoje.',
        prova: { tipo: 'exemplo', cor: '#141311', tinta: '#f5f1ea', legenda: 'duas das que mais deram comentário', html: `<div style="font-family:Outfit;font-size:30px;line-height:1.35;text-align:left">"Comente VIDRO para receber esse pack e aplicar nos seus criativos!"<br><span class="serifa" style="font-size:58px;color:#ff9a1f">4.687</span> comentários<div style="height:26px"></div>"Comente Grid para baixar e nunca mais errar no seu carrossel"<br><span class="serifa" style="font-size:58px;color:#ff9a1f">2.587</span> comentários</div>` },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'passo 2',
        titulo: 'Pedi pro Claude achar o meu <span class="serifa">jeito</span>.',
        texto: 'Não as palavras soltas. As marcas: como eu abro, como eu falo e como eu fecho.',
        prova: { tipo: 'checklist', itens: ['Abro pedindo o comentário', 'Falo em primeira pessoa, com você', 'Frase curta, sem enrolação', 'Fecho com uma pergunta'] },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'passo 3',
        titulo: 'E a lista do que eu <span class="serifa">nunca</span> falo.',
        texto: 'Foi o que mais pesou. A IA aprende rápido o que imitar. Só deixa de soar como IA quando sabe o que evitar.',
        prova: { tipo: 'codigo', arquivo: 'guia de voz', tam: 29, linhas: ['# O que não é a voz', '', '- travessão', '- "desvende", "mergulhe"', '- "no mundo de hoje"', '- "jornada", "potencialize"', '- número sem fonte'] },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'o teste',
        titulo: 'No fim, toda legenda passa num <span class="serifa">teste</span>.',
        texto: 'São as 4 perguntas do guia. Se uma falha, o texto volta e é reescrito.',
        prova: { tipo: 'checklist', itens: ['Soa como um story meu', 'Nenhum travessão, nenhuma palavra da lista', 'Todo número com fonte', 'Quem nunca me viu entende o que ganha'] },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'o resultado',
        titulo: 'A legenda deste post saiu <span class="serifa">assim</span>.',
        texto: 'Escrita pelo Claude, seguindo o guia. Compara com a do começo.',
        prova: { tipo: 'exemplo', cor: '#141311', tinta: '#f5f1ea', legenda: 'a legenda deste post', html: `<div style="font-family:Outfit;font-size:34px;line-height:1.45;text-align:left">Comenta VOZ que eu te mando o prompt que monta o seu guia de voz no direct!<div style="height:16px"></div>Sem guia, a IA escreve com cara de IA [...]<div style="height:16px"></div>Eu dei pro Claude ler 80 legendas minhas [...]<div style="height:16px"></div>Qual palavra de IA você não aguenta mais ver?</div>` },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'o post inteiro',
        titulo: 'E o resto do <span class="serifa">post</span>?',
        texto: 'No mini curso a IA faz pauta, texto e arte no seu estilo. Você só aprova.',
        prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Estilo, pauta, texto e arte'], preco: 'R$ 39,90', pe: 'link na bio' },
      },
      {
        tipo: 'chamada', tema: 'preto', ...cena(), semRegua: true,
        titulo: { pre: 'comenta', condensada: 'VOZ', centro: true, y: 275, tam: 420, cor: '#ffffff' },
        assunto: { foto: true, ...bicho() },
        blocos: [{ tipo: 'nota', x: 110, y: 1150, w: 860, tam: 30, solido: true, fundo: '#11151b', html: '<span style="color:#f5f1ea">e recebe no direct</span> <span class="serifa" style="font-size:42px;color:#ffcc00">o prompt que monta o seu guia de voz</span>' }],
        selo: { aponta: '.palavra-chamada', pontoCentro: [1.03, 1.02], pequeno: true },
      },
    ],
  };
})();
