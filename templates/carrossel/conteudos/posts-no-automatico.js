// Conteúdo: "Como deixar seus posts no automático" (24/10/2026). 8 slides.
// Tese: o Claude procura as notícias do dia e escreve o post no seu estilo, e você só aprova.
// Capa em marrom escuro: o Filipe de terno, de mãos na cabeça, e o aviso do Instagram de que o post saiu sozinho. Miolo
// alternando preto e branco; o 7 vende o mini curso; a chamada volta ao marrom.
// Pautas reais do radar de 24/10/2026 (ver_em_alta). Palavra: PAUTA (material: os 2 prompts do pauteiro).
window.CARROSSEL = {
  nome: 'posts-no-automatico',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'PAUTA',
  legenda: 'Comenta PAUTA que eu te mando os 2 prompts no direct! 🦎\nMuita gente perde a manhã inteira procurando assunto e escrevendo do zero. Aqui o Claude já acorda com a pauta do dia pronta, escrita do meu jeito.\nUm prompt acha as notícias. O outro ensina o seu estilo. Você só aprova.\nE você, quanto tempo perde por dia procurando o que postar? 👇\n.\n.\n#boracalango #claude #socialmedia',
  slides: [
    // 1. Capa (24/10/2026): a selfie dele de verdade, editada no Nano Banana Pro (terno de quem tem o plano). Floreio
    // por cima da condensada e desfoque no fim da palavra. Sem sombra projetada nem luz de fundo.
    // Revisão de 24/10/2026: marrom escuro liso (mais contraste, sem o brilho amarelo atrás dele) e a notificação vira
    // a do Instagram: o post saiu sozinho enquanto ele está de mãos na cabeça.
    {
      tipo: 'capa', tema: 'preto',
      fundoLiso: '#211309',
      titulo: {
        pre: 'seus <span class="serifa">posts</span> no',
        script: 'A', fonteScript: 'Great Vibes', scriptTam: 250, condensada: 'UTOMÁTICO', tam: 158, y: 205, encaixe: -0.16, folgaTopo: 0.12,
        foco: { esq: 4, dir: 14, centro: [0.26, 0.6] },
        pos: 'e no seu <span class="serifa">estilo</span>', posTam: 44,
      },
      assunto: { arq: 'filipe-v6-terno.png', x: -4, y: 190, w: 1250, sombra: false, brilho: false, foco: { angulo: 130, de: 0.6, ate: 0.92, max: 5 } },
      notificacao: { x: 80, y: 1110, w: 640, icone: 'instagram', app: 'Instagram', quando: '18:00', texto: 'Seu post de hoje foi publicado ✓' },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.55, 0.88], pequeno: true },
    },

    // 2. O contexto: a conversa de todo dia.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'Calango,', vocativo: true,
      titulo: 'Não procuro mais assunto.<br>Nem escrevo do <span class="serifa">zero</span>.',
      texto: 'Às 7h o Claude já deixou <b>as pautas do dia</b> prontas, escritas do meu jeito.',
      prova: {
        tipo: 'conversa',
        eu: 'Bom dia! O que eu posto hoje?',
        ia: 'Separei 3 notícias quentes de IA e design e já escrevi os 3 posts no seu tom. Quer ver o primeiro?',
      },
    },

    // 3. Passo 1: ele lê as notícias (pautas reais do radar de hoje).
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'passo 1',
      titulo: 'Ele <span class="serifa">lê</span> as notícias por você.',
      texto: 'Você pede uma vez: toda manhã, procurar o que saiu de novo no seu assunto. Hoje veio isso:',
      prova: {
        tipo: 'lista',
        itens: [
          { calor: 84, t: 'Canva lança gerador de imagens com camadas editáveis', fonte: 'Canaltech' },
          { calor: 69, t: 'Integração do Canva com o Gemini chega em português', fonte: '33 Giga' },
          { calor: 68, t: 'Claude Code ganha tarefas longas em segundo plano', fonte: 'Pasquale Pillitteri' },
        ],
      },
    },

    // 4. Passo 2: ele estuda o seu jeito de falar.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'passo 2',
      titulo: 'Depois, ele <span class="serifa">estuda</span><br>o seu jeito de falar.',
      texto: 'Mande seus 20 melhores posts. Ele escreve o seu <b>guia de estilo</b> e usa sempre.',
      prova: {
        tipo: 'conversa',
        eu: 'Lê esses 20 posts e me diz como eu escrevo.',
        ia: 'Você chama o seguidor de calango, usa frase curta e gíria leve, nunca usa travessão e fecha com pergunta. Guardei como o seu guia.',
      },
    },

    // 5. Passo 3: o post sai no seu tom. O dia inteiro, em três avisos.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'passo 3',
      titulo: 'E escreve <span class="serifa">como você</span>.',
      texto: 'Você só ajusta uma palavra e aprova.',
      prova: {
        tipo: 'notificacoes',
        itens: [
          { icone: 'claude', app: 'Claude', quando: '7:00', texto: '3 pautas de hoje prontas, no seu estilo' },
          { icone: 'logo', app: 'Você', quando: '7:12', texto: 'Aprovou 2 posts, pediu um ajuste' },
          { icone: 'instagram', app: 'Instagram', quando: '18:00', texto: 'Seu post foi publicado' },
        ],
      },
    },

    // 6. O que faz funcionar todo dia: a rotina montada uma vez.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'o segredo',
      titulo: 'O que faz rodar é a <span class="serifa">rotina</span>.',
      texto: 'Monta uma vez e esquece:',
      prova: {
        tipo: 'checklist',
        itens: [
          'Um projeto no Claude com o seu guia de estilo',
          'O prompt da pauta do dia, sempre o mesmo',
          'Uma tarefa agendada pra rodar às 7h',
        ],
      },
    },

    // 7. O mini curso: o passo a passo inteiro.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'quer ir além?',
      titulo: 'Quer isso <span class="serifa">rodando</span><br>todo dia?',
      texto: 'No mini curso eu monto com você o Claude que acha o assunto, escreve e faz a arte.',
      prova: {
        tipo: 'oferta',
        imagem: 'curso-card.jpg',
        titulo: 'Posts automáticos com Claude',
        itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Pauta, texto e arte no automático'],
        preco: 'R$ 39,90', pe: 'link na bio',
      },
    },

    // 8. Chamada: fecha no amarelo, com a mesma foto da capa mais perto.
    {
      tipo: 'chamada', tema: 'preto',
      fundoLiso: '#211309',
      titulo: { pre: 'comenta', condensada: 'PAUTA', x: 104, y: 200, tam: 280 },
      assunto: { foto: true, arq: 'filipe-v6-terno.png', x: -230, y: 120, w: 1450, sombra: false, brilho: false },
      blocos: [{
        tipo: 'nota', x: 110, y: 1040, w: 860, tam: 38, solido: true,
        html: 'que eu te mando os <span class="serifa" style="font-size:50px">2 prompts</span> no direct 🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">a pauta do dia + o que ensina o seu estilo</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
