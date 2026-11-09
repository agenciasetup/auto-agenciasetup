// Conteúdo: "Esse carrossel foi criado no Claude". 7 slides; a capa sai em amarelo (oficial), preto e branco.
// Ordem dos fundos com intenção: capa amarela, e os de dentro alternando preto e branco, como nos carrosséis do perfil;
// a chamada volta ao amarelo para fechar onde começou.
// Posições da capa e da chamada (assunto, notificação, pétalas, luz) em coordenadas do slide (1080 x 1350).
// Números reais de 23/10/2026: 400 posts lidos, mediana de comentários 111 (pede palavra) x 13 (não pede); radar de 25 fontes.
window.CARROSSEL = {
  nome: 'criado-no-claude',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: ['amarelo', 'preto', 'branco'],
  legenda: 'Esse carrossel foi criado no Claude. 🦎\nEu mandei um texto. Ele leu o perfil, achou o assunto do dia, montou as 5 camadas e agendou.\nComenta CLAUDE que eu te mando o passo a passo no direct.\n.\n.\n#boracalango #claude #designcomia',
  palavra: 'CLAUDE',
  slides: [
    // 1. Capa. O Filipe (foto real, fundo e luz trocados) na frente da palavra; as linhas de cima e de baixo se alinham à
    // borda direita de "RIADO". Efeitos com motivo: a luz de fundo explica o recorte de luz da foto; o fim da palavra
    // e a mão com o celular, mais perto da câmera, desfocam; as pétalas passam na frente da lente.
    {
      tipo: 'capa', tema: 'amarelo', luzX: '50%', luzY: '46%',
      luz: { x: 520, y: 560, r: 950 },
      titulo: {
        pre: 'esse <span class="serifa">carrossel</span> foi',
        script: 'C', fonteScript: 'Great Vibes', scriptTam: 350, condensada: 'RIADO', tam: 270, y: 250, encaixe: -0.18,
        foco: { esq: 5, dir: 15, centro: [0.3, 0.62] },
        pos: 'no <span class="serifa">Claude</span>', posTam: 44,
      },
      assunto: { arq: 'filipe-celular.png', x: -100, y: 190, w: 1140, sombraX: 30, sombraY: 24, foco: { angulo: 130, de: 0.55, ate: 0.9, max: 6 } },
      notificacao: { y: 1060, app: 'Claude', quando: 'agora', texto: 'Seu carrossel está pronto. 7 slides ✓' },
      folhas: [
        { arq: 'petalas.png', x: -170, y: 980, w: 520, rot: 18, blur: 20, luz: 1 },
      ],
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.55, 0.88], pequeno: true },
    },

    // 2. O contexto, com a prova: o pedido que eu mandei e a resposta.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'Calango,', vocativo: true,
      titulo: 'Eu não abri o Photoshop.<br>Nem o Canva.',
      texto: 'Mandei <b>um texto</b> pro Claude. Ele fez o resto.',
      prova: {
        tipo: 'conversa',
        eu: 'Faz um carrossel mostrando que foi você que fez. Visual da agência, capa amarela.',
        ia: 'Feito: 7 slides e 3 capas. Quer que eu agende pra hoje às 18h?',
      },
    },

    // 3. O que ele leu: os números do perfil.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'passo 1',
      titulo: 'Primeiro, ele <span class="serifa">leu</span> o perfil.',
      texto: 'Os últimos 400 posts da @agenciasetup. Post que pede uma palavra nos comentários teve <b>8x mais comentários</b>.',
      prova: {
        tipo: 'numeros',
        itens: [{ v: '111', t: 'comentários quando o post pede uma palavra' }, { v: '13', t: 'quando não pede', fraco: true }],
        pe: 'mediana de 400 posts',
      },
    },

    // 4. O assunto do dia: o radar.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'passo 2',
      titulo: 'Depois, <span class="serifa">achou</span> o assunto do dia.',
      texto: '25 fontes lidas sozinhas, o dia inteiro. O mais quente de hoje:',
      prova: {
        tipo: 'lista',
        itens: [
          { calor: 84, t: 'A Canva lançou o primeiro modelo de imagem dela', fonte: 'The Verge, TechCrunch e mais 2' },
          { calor: 74, t: 'O Figma ganhou um agente que segue o seu design system', fonte: 'Blog do Figma' },
          { calor: 73, t: 'A Uber liberou o ChatGPT Work para 30 mil funcionários', fonte: 'OpenAI' },
        ],
      },
    },

    // 5. Como montou: a própria capa desmontada nas 5 camadas reais (de baixo para cima).
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'passo 3',
      titulo: 'E montou tudo em <span class="serifa">5 camadas</span>.',
      prova: {
        tipo: 'camadas',
        camadas: [
          { arq: 'fundo', nome: 'fundo', desc: 'o amarelo e a luz' },
          { arq: 'titulo', nome: 'título', desc: 'atrás de mim' },
          { arq: 'assunto', nome: 'eu', desc: 'a foto recortada' },
          { arq: 'frente', nome: 'frente', desc: 'notificação e pétalas' },
          { arq: 'acabamento', nome: 'acabamento', desc: 'janela e selo' },
        ],
      },
    },

    // 6. O meu trabalho: aprovar. As notificações empilhadas, como as vendas aprovadas dos carrosséis da agência.
    {
      tipo: 'miolo', tema: 'preto',
      titulo: 'E eu só <span class="serifa">aprovei</span>.',
      texto: 'Ele agenda, posta e manda o material na DM de quem comenta a palavra.',
      prova: {
        tipo: 'notificacoes',
        itens: [
          { icone: 'logo', app: 'Peça aprovada', quando: 'agora', texto: 'Sai hoje às 18h no Instagram' },
          { icone: 'conversa', app: 'Comenta X', quando: '1 min', texto: 'DM enviada com o material' },
          { icone: 'baixar', app: 'Download no site', quando: '3 min', texto: 'Modelo de carrossel em 5 camadas' },
        ],
      },
    },

    // 7. Chamada: o Filipe sorrindo na frente da palavra, o que a pessoa recebe num bloco sólido, o selo na palavra.
    {
      tipo: 'chamada', tema: 'amarelo', luzX: '50%', luzY: '38%',
      luz: { x: 560, y: 520, r: 950 },
      titulo: { pre: 'comenta', condensada: 'CLAUDE', x: 104, y: 262, tam: 300 },
      assunto: { foto: true, arq: 'filipe-sorriso.png', x: -36, y: 170, w: 1200, sombraX: 30, sombraY: 24 },
      folhas: [{ arq: 'petalas.png', x: -150, y: 980, w: 480, rot: 30, blur: 18, luz: 1 }],
      blocos: [{
        tipo: 'nota', x: 110, y: 1030, w: 860, tam: 38, solido: true,
        html: 'que eu te mando o <span class="serifa" style="font-size:50px">passo a passo</span> no direct 🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">o modelo das 5 camadas + o prompt que eu usei</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
