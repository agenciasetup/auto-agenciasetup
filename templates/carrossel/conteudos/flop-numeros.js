// Tarefa do Em alta (06/11/2026). Nenhuma pauta das últimas 24 h passou nos 4 testes (ver _local/carrossel/flop-numeros/ficha.md),
// então saiu o conteúdo de 31/10 que ficou sem imagem (o Chrome estava desconectado), com os números atualizados em 06/11:
// Prova com dois carrosséis com material e alcance quase igual (o revisor pediu formato com formato):
// SKILL (28/10): alcance 3.726, 160 curtidas, 135 comentários, 110 salvos, 38 compartilhamentos, nota 23,11.
// TEMPO (27/10, "vale a pena usar o Claude? depende", material: as 10 tarefas): alcance 3.776, 136 curtidas, 40 comentários, 45 salvos, 14 compartilhamentos, nota 9,90.
// A foto teve dois fios da testa apagados no computador (tratar.mjs apagar, c-limpo2.png).
// Capa: o panda de colete amarelo na neve, com a prancheta do gráfico caindo perto da lente (Magnific, Nano Banana Pro, opção C).
// A fila em volta tem muito céu azul, amarelo e escuro: o branco da neve alterna, e branco é a cor de "dado, análise".
(() => {
  const bicho = (y) => ({ arq: 'bicho-panda-flop.png', x: 40, y, w: 1000, sombra: false, brilho: false, cru: true });
  // cena.py com desce 300 na largura 1000: a cena começa 300 px acima do recorte.
  const cena = (y) => ({ fundoFoto: { arq: 'panda-flop-cena.jpg', x: 40, y: y - 300, w: 1000 } });
  // Na chamada a palavra se lê inteira: a orelha começa abaixo dela (licoes.md, 24/10).
  const Y = 295, Y_CH = 400, XPOS = 156;
  window.CARROSSEL = {
    nome: 'flop-numeros',
    marca: { perfil: '@agenciasetup', nome: 'Calango' },
    capas: [],
    palavra: 'FLOP',
    legenda: '',
    slides: [
      {
        tipo: 'capa', tema: 'branco', ...cena(Y),
        titulo: {
          semSombra: true,
          pre: '',
          script: 'F', fonteScript: 'Great Vibes', scriptTam: 262, condensada: 'LOPA', tam: 196, y: 262, encaixe: -0.16, dx: -150,
          cor: '#4a4744', corScript: '#f07800',
          foco: { esq: 3, dir: 2, centro: [0.26, 0.74] },
        },
        // Título alinhado à esquerda (regra de 05/11: variar o alinhamento pela imagem): a cabeça do panda fica no
        // centro-direita, logo abaixo da palavra, e a orelha não pode tapar a linha de baixo. As duas linhas de apoio
        // ficam alinhadas à borda esquerda do floreio, onde a frase começa e termina.
        blocos: [
          { tipo: 'escrito', x: XPOS, y: 206, w: 600, tam: 48, cor: '#2b2926', html: `<span style="font-family:Outfit,sans-serif">automatizar <span class="serifa">post</span> que</span>` },
          { tipo: 'escrito', classe: 'apoio-flop', x: XPOS, y: 474, w: 330, tam: 48, cor: '#2b2926', html: `<span style="font-family:Outfit,sans-serif;line-height:1.15">só faz <span class="serifa">flopar</span><br>mais rápido</span>` },
        ],
        assunto: bicho(Y),
        semPoeira: [[870, 780, 70, 60]],
        selo: { aponta: '.titulo-capa .progressivo .condensada', ponto: [0.97, 0.55], pequeno: true },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'Calango,', vocativo: true, semPoeira: [[60, 555, 70, 60], [975, 905, 50, 50]],
        titulo: 'automatizar não conserta post <span class="serifa">ruim</span>.',
        texto: 'Só repete ele todo dia, sem você perceber.',
        prova: {
          tipo: 'exemplo', cor: '#f5f1ea', tinta: '#141311', legenda: 'a conta que ninguém faz',
          html: `<div style="font-family:Outfit;font-size:46px;line-height:1.5;text-align:center"><b style="font-weight:700">1 post que flopa</b><br><span style="opacity:.6">+ uma tarefa todo dia</span><br><span style="font-family:'Instrument Serif',serif;font-style:italic;font-size:72px;color:#d95f00">= 30 flops no mês</span></div>`,
        },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'a prova', semPoeira: [[75, 1020, 55, 50]],
        titulo: 'Alcance quase igual: <span class="serifa">135 x 40</span> comentários.',
        texto: 'Dois carrosséis nossos com material, um dia depois do outro. Sem olhar o número, eu repetiria os dois.',
        prova: {
          tipo: 'numeros', tam: 190, semX: true,
          itens: [{ v: '135', t: 'comentários, a skill pronta' }, { v: '40', t: 'comentários, a lista de tarefas', fraco: true }],
          pe: 'Posts de 28/10 e 27/10. Alcance 3.726 x 3.776.',
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'passo 1',
        titulo: 'Junta os <span class="serifa">números</span> numa planilha.',
        texto: 'Pelo menos 20 posts. Os números ficam nos insights de cada post.',
        prova: { tipo: 'checklist', itens: ['Data, formato e assunto', 'A primeira linha da legenda', 'Alcance, curtidas, comentários, salvos e compartilhamentos'] },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'passo 2', semPoeira: [[275, 1245, 150, 55]],
        titulo: 'O Claude dá uma <span class="serifa">nota</span> pra cada post.',
        texto: 'Comentário pesa mais, porque é ele que leva pro direct.',
        prova: { tipo: 'codigo', arquivo: 'a conta', linhas: ['nota = (curtidas', '  + 3 x comentários', '  + 2 x salvos', '  + 2 x compartilhamentos)', '  / alcance x 100', '', '# a skill pronta: 23,11', '# a lista de tarefas: 9,90'] },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'passo 3',
        titulo: 'Vira um arquivo que a tarefa lê <span class="serifa">antes</span>.',
        texto: 'Só vira regra o que tem 3 posts de prova. E você continua aprovando tudo.',
        prova: { tipo: 'codigo', arquivo: 'o-que-funciona.md', linhas: ['# REPETIR', '# PARAR', '# TESTAR', '', 'tarefa do dia:', 'antes de escrever, leia', 'o-que-funciona.md'] },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'do zero',
        titulo: 'Ainda não tem a <span class="serifa">tarefa</span>?',
        texto: 'No mini curso você monta a sua do zero: estilo, pauta, texto e arte.',
        prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Estilo, pauta, texto e arte'], preco: 'R$ 39,90', pe: 'link na bio' },
      },
      {
        // A chamada desce o panda mais: cena própria com o céu continuado 440 px (cena.py), para não sobrar faixa no topo.
        tipo: 'chamada', tema: 'branco', fundoFoto: { arq: 'panda-flop-cena-ch.jpg', x: 40, y: Y_CH - 440, w: 1000 },
        titulo: { pre: 'comenta', condensada: 'FLOP', centro: true, y: 225, tam: 340, cor: '#4a4744' },
        assunto: { foto: true, ...bicho(Y_CH) },
        blocos: [{ tipo: 'nota', x: 110, y: 1078, w: 860, tam: 30, solido: true, fundo: '#141311', html: '<span style="color:#f5f1ea">e recebe no direct</span> <span class="serifa" style="font-size:42px;color:#ff9a1f">os 3 prompts do raio-x</span>' }],
        selo: { aponta: '.palavra-chamada', pontoCentro: [0.9, 0.5], pequeno: true },
      },
    ],
  };
})();
