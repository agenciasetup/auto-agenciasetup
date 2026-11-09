// Tarefa do Em alta (08/11/2026). Nenhuma pauta das últimas 24 horas passou nos 4 testes (ver o resumo da tarefa),
// então o ângulo é novo e de automatizar posts: como o perfil posta 2 frases por dia sem o Filipe escrever nenhuma.
// Fonte de tudo: a skill frase-agenciasetup (20 ideias, os 7 testes do filtro, o lote da semana) e os números reais
// do Instagram (alcance de "nenhum arquivo é final antes do pix cair", 4.408, e de "o post que você não postou tem
// zero chance de viralizar", 4.569; listar_posts em 08/11). A fila do slide 6 é a real (semana de 9/11).
// Capa: arara-canindé de moletom e óculos num galho, de baixo para cima, contra o céu azul, com o post de frase
// impresso no bico (a frase é a coisa que a gente "fala" todo dia). Ficha em _local/carrossel/frase-por-dia/ficha.md.
(() => {
  // Posição da foto e do recorte: acertar depois do cena.py (mesma caixa nos dois).
  const X = -44, W = 1150, DESCE = 0;
  const Y = 150, Y_CH = 120;
  const bicho = (y) => ({ arq: 'bicho-arara-frase.png', x: X, y, w: W, sombra: false, brilho: false, cru: true });
  const cena = (y) => ({ fundoFoto: { arq: 'arara-frase-cena.jpg', x: X, y: y - DESCE, w: W } });
  window.CARROSSEL = {
    nome: 'frase-por-dia',
    marca: { perfil: '@agenciasetup', nome: 'Calango' },
    capas: [],
    palavra: 'FRASE',
    legenda: '',
    slides: [
      {
        tipo: 'capa', tema: 'preto', ...cena(Y), reguasAtras: true,
        titulo: {
          pre: '2 posts de', preLado: 'centro',
          script: 'F', fonteScript: 'Great Vibes', scriptTam: 300, condensada: 'RASE', tam: 250, y: 262, encaixe: -0.17, dx: -30,
          cor: '#ffffff', corScript: '#ffcc00',
          foco: { esq: 4, dir: 4, centro: [0.28, 0.72] },
          pos: 'por dia, <span class="serifa">sem escrever</span> nenhuma', posTam: 40,
        },
        assunto: bicho(Y),
        selo: { aponta: '.pos-titulo .serifa', ponto: [0.5, 0.9], pequeno: true },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'Calango,', vocativo: true,
        titulo: 'o perfil posta <span class="serifa">2 frases</span> por dia.',
        texto: 'Às 12h e às 19h. Quem escreve é o Claude. Eu escolho e aprovo.',
        prova: {
          tipo: 'numeros',
          itens: [
            { v: '4.408', t: 'pessoas viram "nenhum arquivo é final antes do pix cair"' },
            { v: '4.569', t: 'viram "o post que você não postou tem zero chance de viralizar"' },
          ],
          pe: 'alcance no Instagram da @agenciasetup, 08/11/2026',
        },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'passo 1',
        titulo: 'Ele escreve <span class="serifa">20</span> pra sobrar 2.',
        texto: 'A primeira ideia quase sempre é a mais óbvia. Primeiro muitas, depois o corte.',
        prova: {
          tipo: 'numeros',
          itens: [
            { v: '20', t: 'frases que o Claude escreve' },
            { v: '18', t: 'caem no filtro', fraco: true },
            { v: '2', t: 'chegam no feed' },
          ],
          pe: 'o pedido completo vai no material',
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'passo 2',
        titulo: 'Os <span class="serifa">7 testes</span> que cortam 18.',
        texto: 'Reprovou em um, a frase sai. Sem dó.',
        prova: { tipo: 'checklist', itens: ['Quem é do ramo se reconhece em 1 segundo', 'Dá pra dizer pra quem a pessoa manda', 'Tem um detalhe do digital', 'Soa como gente, não como coach', 'A graça não precisa de explicação', 'Até umas 14 palavras', 'A frase é nossa, não de outro perfil'] },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'o corte, na prática',
        titulo: 'Sem <span class="serifa">detalhe</span>, é frase de caneca.',
        texto: 'Troca "cliente" por "chefe" e continua igual? Serve pra qualquer profissão. Cai.',
        prova: {
          tipo: 'exemplo', cor: '#f5f1ea', tinta: '#141311', legenda: 'as duas passaram pelo mesmo filtro',
          html: `<div style="font-family:Outfit;font-size:44px;line-height:1.3;text-align:center"><span style="text-decoration:line-through;opacity:.45">segunda-feira é difícil, né?</span><br><span style="font-size:28px;color:#d4342a;font-weight:700">caiu: serve pra qualquer um</span><br><br><span style="font-weight:800">nenhum arquivo é final<br>antes do pix cair.</span><br><span style="font-size:28px;color:#1f9d55;font-weight:700">passou: vai pro grupo dos freelas</span></div>`,
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'passo 3',
        titulo: 'Eu aprovo o <span class="serifa">lote</span> da semana.',
        texto: 'As frases chegam no rascunho com o horário no título. Eu leio, aprovo e agendo.',
        prova: { tipo: 'codigo', arquivo: 'fila de posts, semana de 9/11', linhas: ['seg 12h · Token semanal', 'seg 19h · Aprovado', 'ter 12h · Volta com um urgente', 'ter 19h · Galeria de referência', 'qua 12h · Igual fofoca', 'qua 19h · Férias de freela'] },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'a sua rotina',
        titulo: 'Quer o Claude fazendo o seu <span class="serifa">lote</span>?',
        texto: 'No mini curso você monta a sua rotina: estilo, pauta, texto e arte. Você aprova e posta.',
        prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Estilo, pauta, texto e arte'], preco: 'R$ 39,90', pe: 'link na bio' },
      },
      {
        tipo: 'chamada', tema: 'preto', ...cena(Y_CH), reguasAtras: true,
        titulo: { pre: 'comenta', condensada: 'FRASE', centro: true, y: 225, tam: 340, cor: '#ffffff' },
        assunto: { foto: true, ...bicho(Y_CH) },
        blocos: [{ tipo: 'nota', x: 110, y: 1190, w: 860, tam: 30, solido: true, fundo: '#141311', html: '<span style="color:#f5f1ea">e recebe no direct</span> <span class="serifa" style="font-size:42px;color:#ffcc00">o pedido das 20 frases + os 7 testes</span>' }],
        selo: { aponta: '.palavra-chamada', pontoCentro: [0.86, 0.98], pequeno: true },
      },
    ],
  };
})();
