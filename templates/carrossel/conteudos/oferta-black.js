// Conteúdo: carrossel de oferta da Black Friday (04/11/2026), para turbinar. 6 slides.
// Pedido do dono: capa direta "Automatize seus carrosséis com o Claude no seu estilo", ele como mágico com o carrossel
// voando de uma mão para a outra; cards com clareza do que o curso ensina; um card essencial "pra quem não tem tempo de
// ficar fazendo arte"; motion; CTA para comentar ou clicar no link, R$ 39,90 só nesta Black Friday.
// Sequência: capa (a promessa) → pra quem é (identificação) → os 3 passos do curso, cada um com a prova animada
// (módulo 2 estilo, módulo 3 assunto e texto, módulo 4 arte) → a chamada com o preço e a urgência.
// Fundos: capa e chamada em quase preto (Black Friday, fecha onde abriu), miolo alternando preto e branco.
// Os slides 2 a 5 têm `anima: true` e saem também em MP4 (templates/carrossel/ferramentas/animar.mjs).
window.CARROSSEL = {
  nome: 'oferta-black',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'POSTS',
  legenda: 'Comenta POSTS que eu te mando o link do mini curso no direct! 🦎 (ou clica no link da bio)\nMuita gente quer postar todo dia, mas não tem tempo de ficar fazendo arte. No mini curso Posts automáticos com Claude eu te mostro como montar o Claude que:\n→ aprende o seu estilo (cores, fontes e jeito de falar)\n→ acha o assunto em alta e escreve no seu tom\n→ monta a arte em etapas, sem cara de IA\nServe pro seu perfil, pro da sua empresa e pro dos seus clientes.\nSão 18 aulas curtas + o kit pronto, por R$ 39,90 só nesta Black Friday. Não perde essa, calango! 🔥\n.\n.\n#boracalango #claude #socialmedia',
  slides: [
    // 1. Capa: ele de mágico, o carrossel (posts de verdade da agência) caindo de uma mão para a outra. A mágica é a
    // tese: o carrossel sai sozinho. Quase preto liso (Black Friday), sem notificação: o elemento da tese é o carrossel.
    {
      tipo: 'capa', tema: 'preto',
      titulo: {
        pre: 'automatize seus',
        script: 'C', fonteScript: 'Great Vibes', scriptTam: 250, condensada: 'ARROSSÉIS', tam: 160, y: 248, encaixe: -0.16, folgaTopo: 0.12, dx: -30,
        foco: { esq: 4, dir: 10, centro: [0.26, 0.6] },
        pos: 'com o Claude, no seu <span class="serifa">estilo</span>', posTam: 42,
      },
      // Fundo: o estúdio da própria foto, sem ele e desfocado (`_local/estilos/fundo-limpo.py`), ampliado em volta do
      // corpo dele: um pouco mais claro atrás dele e escurecendo até as bordas, como vinheta. O brilho redondo de código
      // ("falsão", 04/11/2026) saiu. A carta desfocada no canto também saiu ("ficou transparente e feio, pode remover").
      fundoFoto: { arq: 'oferta-cena.jpg', x: -130, y: 33, w: 1340 },
      assunto: { arq: 'filipe-magico-2.png', x: 58, y: 290, w: 927, sombra: false, brilho: false },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0, 0.92], pequeno: true },
      semPoeira: [[100, 780, 880, 540]], // poeira nenhuma em cima da jaqueta e das cartas
    },

    // 2. Pra quem é (o card essencial, pedido dele): a identificação logo depois da promessa. O título já diz que é o
    // curso (para quem chega pelo anúncio) e a lista continua os dois-pontos.
    // Slides 2 a 5: o texto já está na tela no primeiro quadro (`animaTexto: false`); só a prova anima.
    {
      tipo: 'miolo', tema: 'preto', anima: true, animaTexto: false,
      rotulo: 'Calango,', vocativo: true,
      titulo: 'O mini curso é <span class="serifa">essencial</span><br>pra quem:',
      prova: {
        tipo: 'checklist',
        itens: [
          'Não tem tempo de ficar fazendo arte',
          'Quer automatizar a criação de conteúdo',
          'Quer o design da empresa sempre no padrão',
        ],
      },
    },

    // 3. Passo 1 (módulo 2 do curso): ele lê o Instagram e guarda o estilo numa skill. As linhas são o nosso estilo de verdade.
    {
      tipo: 'miolo', tema: 'branco', anima: true, animaTexto: false,
      rotulo: 'no curso · passo 1',
      titulo: 'O Claude aprende<br>o seu <span class="serifa">estilo</span>.',
      texto: 'Lê o seu Instagram e guarda numa <b>skill</b><br>as cores, as fontes e o jeito de falar.',
      semPoeira: [[120, 620, 840, 460]], // nada de fiapo dentro da janela do código
      prova: {
        tipo: 'codigo', arquivo: 'meu-estilo/SKILL.md', tam: 27,
        linhas: [
          '# O estilo da @agenciasetup',
          'cores: amarelo, preto e branco',
          'fontes: Anton com um toque cursivo',
          'voz: chama o seguidor de calango',
          'sempre: frase curta, uma ideia por slide',
          'nunca: travessão nem cara de IA',
        ],
      },
    },

    // 4. Passo 2 (módulo 3): a tarefa agendada de toda manhã, nos horários do kit.
    {
      tipo: 'miolo', tema: 'preto', anima: true, animaTexto: false,
      rotulo: 'no curso · passo 2',
      titulo: 'Todo dia, ele acha<br>o <span class="serifa">assunto</span> e escreve.',
      texto: 'Uma tarefa agendada acorda o Claude: ele vê o que está em alta e escreve <b>no seu tom</b>.',
      prova: {
        tipo: 'notificacoes',
        itens: [
          { icone: 'claude', app: 'Claude', quando: '7:00', texto: 'Achei 3 assuntos em alta hoje' },
          { icone: 'claude', app: 'Claude', quando: '8:00', texto: 'Escrevi o carrossel no seu tom' },
          { icone: 'claude', app: 'Claude', quando: '13:00', texto: 'A arte está pronta pra você aprovar' },
        ],
      },
    },

    // 5. Passo 3 (módulo 4): a mesma capa de verdade ("criado no Claude") passando pelas etapas, de perto (o título e o
    // rosto, onde o desfoque e a textura mudam), com a etapa seguinte entrando como cortina.
    {
      tipo: 'miolo', tema: 'branco', anima: true, animaTexto: false,
      rotulo: 'no curso · passo 3',
      titulo: 'E monta a <span class="serifa">arte</span> em etapas.',
      texto: 'O mínimo bem feito, os efeitos com motivo e o acabamento. <b>Sem cara de IA.</b>',
      prova: {
        tipo: 'etapas', w: 640, h: 521,
        itens: [
          { arq: 'oferta-etapa-1-zoom.jpg', legenda: '1 · o mínimo' },
          { arq: 'oferta-etapa-3-zoom.jpg', legenda: '2 · os efeitos' },
          { arq: 'oferta-etapa-5-zoom.jpg', legenda: '3 · o acabamento' },
        ],
      },
    },

    // 6. Chamada: a mesma foto da capa, mais perto; a palavra grande no centro; o preço e a urgência na nota.
    {
      tipo: 'chamada', tema: 'preto',
      titulo: { pre: 'comenta', condensada: 'POSTS', centro: true, y: 225, tam: 340 },
      fundoFoto: { arq: 'oferta-cena.jpg', x: -230, y: 1, w: 1540 },
      assunto: { foto: true, arq: 'filipe-magico-2.png', x: -136, y: 150, w: 1300, sombra: false, brilho: false },
      // A nota desce até a base e cobre os pedaços de carta; o link e o que vem no curso em letra que se lê no celular.
      blocos: [{
        tipo: 'nota', x: 110, y: 1056, w: 860, tam: 36, solido: true,
        html: 'que eu te mando o link do <span class="serifa" style="font-size:48px">mini curso</span> 🦎<div style="margin-top:10px;font-family:\'Instrument Serif\',serif;font-size:70px;line-height:1;color:#ff9a00">R$ 39,90 <span style="font-family:Outfit,sans-serif;font-size:31px;color:inherit">só nesta Black Friday</span></div><div style="font-size:29px;margin-top:14px">18 aulas + o kit pronto · <b>ou clica no link da bio</b></div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
