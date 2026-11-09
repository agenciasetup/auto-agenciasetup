// Conteúdo: "Essa é a melhor skill para Social Media" (24/10/2026). 9 slides.
// Tese: uma skill do Claude que entende o seu nicho, pesquisa o que está em alta e entrega o post pronto todo dia.
// Capa em amarelo vivo liso: o Filipe apontando para cima, para o arquivo da skill (social-media.skill).
// A skill existe de verdade: materiais/skills/social-media-no-automatico/ (o slide 3 mostra as linhas reais do arquivo).
// Pautas reais do radar de 24/10/2026. Palavra: SKILL.
window.CARROSSEL = {
  nome: 'skill-social-media',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'SKILL',
  legenda: 'Comenta SKILL que eu te mando a skill no direct! 🦎\nEu transformei o que o nosso sistema faz todo dia numa skill pro Claude: ela entende o seu nicho, procura o que está em alta e entrega o post pronto, no seu tom.\nÉ só instalar, responder 4 perguntas e pedir "o que eu posto hoje?".\nQual nicho você quer testar primeiro? 👇\n.\n.\n#boracalango #socialmedia #claude',
  slides: [
    // 1. Capa (24/10/2026, revista): foto nova no Nano Banana Pro (sem as pintas que ele não tem), amarelo vivo liso
    // sem brilho atrás e, onde o dedo aponta, o arquivo da skill. Sem notificação.
    // Ajuste de 25/10/2026 (pedido dele): o SKILL parecia fora do eixo (o floreio do S puxava para a esquerda e o fim
    // borrado esvaziava a direita) e o fundo, "meio morto". S menor e mais encaixado, fim menos borrado e o título
    // recentrado pelo peso das letras; atrás dele, a tela do Claude em vidro, em mesclagem tela, usando a skill.
    {
      tipo: 'capa', tema: 'amarelo',
      fundoLiso: '#ffbf1a',
      fundoBlocos: [
        { tipo: 'prompt', vidro: true, mescla: 'screen', x: 735, y: 290, w: 330, rot: 5, blur: 2.4, op: 0.85, texto: 'Pesquisa o que tá em alta no meu nicho' },
        { tipo: 'janela', vidro: true, mescla: 'screen', x: 700, y: 590, w: 390, rot: -4, blur: 0.8, entrada: false, eu: 'O que eu posto hoje?', ia: 'Usei a skill social-media: 3 pautas do seu nicho, prontas no seu tom.' },
        { tipo: 'prompt', vidro: true, mescla: 'screen', x: 705, y: 990, w: 380, rot: -4, blur: 1.2, texto: 'Escreve o carrossel da pauta 1' },
      ],
      titulo: {
        pre: 'essa é a <span class="serifa">melhor</span>', preEspaco: 24,
        script: 'S', fonteScript: 'Great Vibes', scriptTam: 280, condensada: 'KILL', tam: 250, y: 215, encaixe: -0.18, dx: -100,
        foco: { esq: 4, dir: 7, centro: [0.25, 0.8] },
        pos: 'pra <span class="serifa">Social Media</span>', posTam: 46,
      },
      // A ponta do dedo fica em (x + 0,26 w, y + 0,451 da altura) da foto: o arquivo entra logo acima dela.
      assunto: { arq: 'filipe-v7-skill.png', x: -126, y: 150, w: 1300, sombra: false, brilho: false },
      blocos: [{ tipo: 'documento', x: 62, y: 580, nome: 'social-media.skill', tipoArq: 'SKILL' }],
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.6, 0.9], pequeno: true },
    },

    // 2. O contexto.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'Calango,', vocativo: true,
      titulo: 'Eu criei uma <span class="serifa">skill</span><br>que trabalha por mim.',
      texto: 'Ela entende o seu nicho, procura o que está em alta e escreve o seu conteúdo. <b>Todo dia.</b>',
      prova: {
        tipo: 'conversa',
        eu: 'O que eu posto hoje?',
        ia: 'Bora! Antes, me conta rapidinho: o que você faz, pra quem e o que você vende?',
      },
    },

    // 3. O que é uma skill, com o arquivo de verdade.
    {
      tipo: 'miolo', tema: 'branco',
      titulo: 'Skill é um <span class="serifa">manual</span><br>que o Claude segue.',
      texto: 'Você ensina uma vez. Ele faz igual, sempre, sem você repetir o pedido.',
      prova: {
        tipo: 'codigo', arquivo: 'social-media-no-automatico / SKILL.md',
        linhas: ['---', 'name: social-media-no-automatico', '---', '# Social Media no automático', '1. Entender o nicho', '2. Pesquisar o que está em alta', '3. Escrever no tom da pessoa', '4. Entregar e aprender'],
      },
    },

    // 4. Passo 1: entende você.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'passo 1',
      titulo: 'Primeiro, ela <span class="serifa">entende</span> você.',
      texto: 'Nicho, público, o que você vende e como você fala. Uma conversa só, e fica guardado.',
      prova: {
        tipo: 'conversa',
        eu: 'Falo de IA pra social media e designer. Tom leve, com gíria. Vendo um mini curso.',
        ia: 'Anotei o seu nicho, o seu público e o seu tom. Daqui pra frente eu escrevo assim.',
      },
    },

    // 5. Passo 2: pesquisa (pautas reais do dia).
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'passo 2',
      titulo: 'Depois, <span class="serifa">pesquisa</span><br>o que está em alta.',
      texto: 'Notícias do seu nicho dos últimos dias, cada uma com a fonte e uma nota.',
      prova: {
        tipo: 'lista',
        itens: [
          { calor: 84, t: 'Canva lança gerador de imagens com camadas editáveis', fonte: 'Canaltech' },
          { calor: 69, t: 'Integração do Canva com o Gemini chega em português', fonte: '33 Giga' },
          { calor: 68, t: 'Claude Code ganha tarefas longas em segundo plano', fonte: 'Pasquale Pillitteri' },
        ],
      },
    },

    // 6. Passo 3: entrega o post.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'passo 3',
      titulo: 'E entrega o <span class="serifa">post</span> pronto.',
      texto: 'Gancho, roteiro do carrossel, legenda e a chamada. No seu tom.',
      prova: {
        tipo: 'notificacoes',
        itens: [
          { icone: 'claude', app: 'Claude', quando: '7:00', texto: 'Pauta do dia: o Canva lançou o Craft' },
          { icone: 'claude', app: 'Claude', quando: '7:01', texto: 'Roteiro do carrossel, 7 slides' },
          { icone: 'claude', app: 'Claude', quando: '7:01', texto: 'Legenda pronta, com a chamada' },
        ],
      },
    },

    // 7. Todo dia sozinha.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'todo dia',
      titulo: 'E roda <span class="serifa">sozinha</span>,<br>toda manhã.',
      texto: 'Coloque a skill num projeto do Claude e agende uma tarefa. Você acorda com o conteúdo pronto.',
      prova: {
        tipo: 'conversa',
        eu: 'Todo dia às 7h, usa a skill e me manda o conteúdo do dia.',
        ia: 'Combinado. Amanhã às 7h o primeiro já chega aqui.',
      },
    },

    // 8. O mini curso.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'quer o sistema inteiro?',
      titulo: 'A skill é o começo.<br>O <span class="serifa">sistema</span> tá no curso.',
      texto: 'No mini curso eu ligo isso com você: pauta, texto e arte, todo dia, no seu estilo.',
      prova: {
        tipo: 'oferta',
        imagem: 'curso-card.jpg',
        titulo: 'Posts automáticos com Claude',
        itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'A rotina diária montada com você'],
        preco: 'R$ 39,90', pe: 'link na bio',
      },
    },

    // 9. Chamada: fecha no amarelo, com a mesma foto da capa mais perto.
    {
      tipo: 'chamada', tema: 'amarelo',
      fundoLiso: '#ffbf1a',
      titulo: { pre: 'comenta', condensada: 'SKILL', x: 104, y: 230, tam: 280 },
      assunto: { foto: true, arq: 'filipe-v7-skill.png', x: -60, y: -30, w: 1300, sombra: false, brilho: false }, // o dedo aponta para o SKILL
      blocos: [{
        tipo: 'nota', x: 110, y: 1060, w: 860, tam: 38, solido: true,
        html: 'que eu te mando a <span class="serifa" style="font-size:50px">skill</span> no direct 🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">é só instalar no Claude e responder 4 perguntas</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
