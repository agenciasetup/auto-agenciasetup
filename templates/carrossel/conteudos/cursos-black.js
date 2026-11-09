// Pedido do dono (08/11/2026), carrossel 05 do lote, às 21h de 13/11: "Todos meus cursos na Black por menos de 100 reais
// (mesmo contexto do outro)". Os cards dos cursos são os mesmos do cursos-97.js (copiados daqui; mudou lá, mude aqui).
// O contexto do 02, para referência:
// "Todos meus cursos por R$ 97. Design, Criar infoprodutos, vendas High Ticket e muito mais. Mostra que a pessoa pode
// aprender tudo. Em cada card um curso resumido com imagem dele, e uma CTA em uma tag: Comenta CURSO em todos."
// Oferta: Combo Black Calango (R$ 97, 1 ano de acesso, entregue na Hubla). Cursos, textos, números e preços cheios da
// landing combo-black-calango (bloco "Os 7 cursos, um por um"). A Jornada do Infoprodutor está dentro do Black Design
// (dono, 09/11) e não tem capa na landing: capa só de letra. "Criar infoprodutos" = Jornada do Infoprodutor;
// "high ticket" = Mestre das Vendas (dono, 09/11). A soma dos preços cheios dos 7 da landing é R$ 3.965,80.
// Comenta CURSO: a DM manda a página do combo (comenta.link em peca.json).
(() => {
  const TAG = 'comenta CURSO';
  const curso = (n, total, tema, titulo, texto, c) => ({
    tipo: 'miolo', tema, rotulo: `curso ${n} de ${total}`, titulo, texto,
    prova: { tipo: 'curso', tag: TAG, preco: 'no combo', ...c },
  });
  const T = 7;
  const CURSOS = [
    curso(1, T, 'branco', 'Do primeiro post até <span class="serifa">vender</span>.', 'O mais completo, com Photoshop em ênfase<br>e as mentorias gravadas.',
      { capa: 'curso-operacao-designer.jpg', nome: 'Operação Designer', numeros: ['34 módulos', '202 aulas e materiais', '+100 horas'], de: 'R$ 497' }),
    curso(2, T, 'preto', 'A IA aplicada ao <span class="serifa">design</span>.', 'Gerar imagem e montar post mais rápido,<br>junto com o que você já faz.',
      { capa: 'curso-designer-criador.jpg', nome: 'Designer Criador', numeros: ['35 módulos', '171 aulas e materiais'], de: 'R$ 1.697' }),
    curso(3, T, 'branco', 'Vender pra cliente <span class="serifa">high ticket</span>.', 'E cobrar o que o seu trabalho vale.',
      { capa: 'curso-mestre-das-vendas.jpg', nome: 'Mestre das Vendas', numeros: ['10 módulos', '49 aulas e materiais'] }),
    curso(4, T, 'preto', 'Criar o seu <span class="serifa">infoproduto</span>.', 'O caminho pra criar e vender<br>o seu produto digital.',
      { capaTexto: 'Jornada do<br><em>Infoprodutor</em>', nome: 'Jornada do Infoprodutor' }),
    curso(5, T, 'branco', 'Página de venda do <span class="serifa">zero</span>.', 'No WordPress, pra você<br>ou pros seus clientes.',
      { capa: 'curso-landing-page-expert.jpg', nome: 'Landing Page Expert', numeros: ['17 módulos', '60 aulas e materiais'], de: 'R$ 697' }),
    curso(6, T, 'preto', 'Photoshop pro <span class="serifa">Instagram</span>.', 'Criativos e o caminho pra vender,<br>direto ao ponto.',
      { capa: 'curso-designer-expert.jpg', nome: 'Designer Expert', numeros: ['21 módulos', '99 aulas e materiais'], de: 'R$ 497' }),
    curso(7, T, 'branco', 'Os seus primeiros <span class="serifa">clientes</span>.', 'Photoshop e Canva na prática,<br>com IA pra gerar imagem.',
      { capa: 'curso-formacao-designer.jpg', nome: 'Formação Designer', numeros: ['22 módulos', '92 aulas e materiais'], de: 'R$ 497' }),
  ];

  window.CARROSSEL = {
    nome: 'cursos-black',
    marca: { perfil: '@agenciasetup', nome: 'Calango' },
    capas: [],
    palavra: 'CURSO',
    legenda: '',
    slides: [
      // 1. Capa (09/11, "Gato 2"): o gato laranja de óculos escuros pretos, de baixo para cima no campo de margaridas,
      // com as flores desfocadas na frente e o céu azul (Magnific do Mac, Nano Banana 2 1k, ampliado 2x; a partir das
      // referências de gatinhos com flores que o dono mandou). O céu continua para cima (cena.py); a cena é a placa,
      // porque a capa anima. Título branco com o B em amarelo (regra: título só preto, amarelo e branco).
      {
        tipo: 'capa', tema: 'preto', fundoFoto: { arq: 'gato-black-cena.jpg', x: 0, y: 355 - 700, w: 1080 }, reguasAtras: true,
        titulo: {
          semSombra: true, pre: '<span style="position:relative;left:30px">todos os meus cursos na</span>', preLado: 'centro', preEspaco: -11, dx: -30,
          script: 'B', fonteScript: 'Great Vibes', scriptTam: 260, condensada: 'LACK', tam: 240, y: 255, encaixe: -0.18, folgaTopo: 0.15,
          cor: '#ffffff', corScript: 'linear-gradient(160deg, #ffe14d 10%, #ffc400 60%, #ffb400 100%)',
          foco: { esq: 1.5, dir: 4, centro: [0.26, 0.74] },
          pos: '<span style="position:relative;left:30px">por menos de <span class="serifa" style="color:#ffd21a">100 reais</span></span>', posTam: 46, posLado: 'centro', posEspaco: 21,
        },
        assunto: { arq: 'bicho-gato-black.png', x: 0, y: 355, w: 1080, sombra: false, brilho: false, cru: true },
        selo: { aponta: '.pos-titulo .serifa', ponto: [1.0, 0.85], pequeno: true },
        movimento: {
          fundo: { escala: -0.03, deriva: [-4, 0], faseDeriva: 0.9 },
          assunto: { escala: 0.035, origem: [540, 685], fase: 0.15, deriva: [6, 0], faseDeriva: 0.9 },
          titulo: { escala: 0.018, voltas: 2, fase: 0.35 },
          luz: { brilho: 0.05, vinheta: 0.35, voltas: 3, fase: 0.2 },
          // pedido dele (09/11): o cursor aponta e seleciona o "100 reais".
          selo: { modo: 'selecionar' },
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'Calango,', vocativo: true,
        titulo: 'é Black: todos os meus<br>cursos por <span class="serifa">R$ 97</span>.',
        texto: 'Design, criar infoprodutos, vendas high ticket<br>e muito mais, com 1 ano de acesso. Só até 30/11.',
        prova: {
          tipo: 'numeros', tam: 100,
          itens: [{ v: 'R$&nbsp;3.965', t: 'os cursos separados,<br>pelo preço cheio', fraco: true }, { v: 'R$&nbsp;97', t: 'todos juntos,<br>no combo' }],
          pe: 'preço cheio de cada curso na página do combo',
        },
      },
      ...CURSOS,
      {
        tipo: 'chamada', tema: 'preto', fundoFoto: { arq: 'gato-black-cena.jpg', x: 0, y: 250 - 700, w: 1080 }, reguasAtras: true,
        titulo: { pre: 'comenta', condensada: 'CURSO', centro: true, y: 225, tam: 300, cor: '#ffffff' },
        assunto: { foto: true, arq: 'bicho-gato-black.png', x: 0, y: 250, w: 1080, sombra: false, brilho: false, cru: true },
        blocos: [{ tipo: 'nota', x: 110, y: 1150, w: 860, tam: 30, solido: true, fundo: '#141311', html: '<span style="color:#f5f1ea">e recebe o link no direct:</span> <span class="serifa" style="font-size:42px;color:#ffcc00">todos os cursos por R$&nbsp;97</span><br><span style="color:#f5f1ea;font-size:24px">só até 30/11</span>' }],
        selo: { aponta: '.palavra-chamada', pontoCentro: [0.86, -0.32], pequeno: true },
      },
    ],
  };
})();
