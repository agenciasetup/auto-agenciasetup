// Conteúdo: "Por que todo mundo percebe que foi a IA" (25/10/2026). 8 slides.
// Tese: um estudo de 21/10/2026 (Clark, Martin e Mahowald, https://arxiv.org/abs/2610.29162) comparou texto de 9 IAs
// com texto de gente: o de IA é mais difícil de entender. Viram 4 manias fáceis de achar, cada uma com antes e depois.
// Os "antes" são exemplos escritos pela gente, para ilustrar.
// Capa em marrom escuro (refeita em 26/10/2026, a primeira foto "não parecia ele"): o Filipe segurando numa mão a arte
// do GPT de um prompt só (a mesma do slide 2 do carrossel da arte, colada no papel em perspectiva) e na outra um texto
// cheio de travessão, com a cara de "todo mundo percebe". Ideia dele.
// Palavra: TEXTO (material: o prompt que tira a cara de IA).
window.CARROSSEL = {
  nome: 'texto-cara-de-ia',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'TEXTO',
  legenda: 'Comenta TEXTO que eu te mando o prompt que tira a cara de IA do seu texto 🦎\nSaiu um estudo comparando texto de 9 IAs com texto de gente. O de IA é mais difícil de entender, e dá pra ver por quê.\nCoisa fazendo o que só gente faz, palavra empilhada, frase que demora pra chegar.\nQual dessas você mais vê por aí? 👇\n.\n.\n#boracalango #copywriting #claude',
  slides: [
    // 1. Capa: as duas provas na mão (a arte com cara de IA e o texto com travessão); o fundo fica liso.
    {
      tipo: 'capa', tema: 'preto',
      fundoLiso: '#211309',
      titulo: {
        pre: 'por que todo mundo', preEspaco: 12,
        script: 'P', fonteScript: 'Great Vibes', scriptTam: 270, condensada: 'ERCEBE', tam: 205, y: 220, encaixe: -0.16, dx: -60,
        foco: { esq: 4, dir: 7, centro: [0.25, 0.8] },
        pos: 'que foi a <span class="serifa">IA</span>', posTam: 52,
      },
      assunto: { arq: 'filipe-v9-texto.png', x: -10, y: 385, w: 1100, sombra: false, brilho: false },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.4, 0.9], pequeno: true },
    },

    // 2. O estudo.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'Calango,', vocativo: true,
      titulo: 'Saiu um <span class="serifa">estudo</span> sobre isso.',
      texto: 'Compararam texto de 9 IAs com texto de gente. O de IA é mais difícil de entender, e dá pra ver por quê.',
      prova: { tipo: 'codigo', arquivo: 'arXiv · 21/10/2026', linhas: ['# Why is AI-generated language', '# so hard to understand?', 'autores: Clark, Martin e Mahowald', '- 9 IAs comparadas com texto de gente', '- a IA escreve pra caber informação,', '  não pra conversar'] },
    },

    // 3 a 6. As 4 manias, cada uma com o antes e o depois.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'mania 1',
      titulo: 'Coisa fazendo o que<br>só <span class="serifa">gente</span> faz.',
      texto: 'Ferramenta não busca nada. Quem faz é você.',
      prova: { tipo: 'antes-depois', antes: 'A ferramenta busca transformar o seu conteúdo.', depois: 'Você transforma o seu conteúdo em 5 minutos.' },
    },
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'mania 2',
      titulo: 'Palavra <span class="serifa">empilhada</span>.',
      texto: 'Um monte de palavra pra dizer uma coisa só.',
      prova: { tipo: 'antes-depois', antes: 'Estratégia de otimização de engajamento de conteúdo', depois: 'Um jeito de ter mais comentário' },
    },
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'mania 3',
      titulo: 'Frase que demora<br>pra <span class="serifa">chegar</span>.',
      texto: 'Quando o verbo fica lá no fim, você relê.',
      prova: { tipo: 'antes-depois', antes: 'O post, que eu fiz com o prompt que o Claude sugeriu depois de pesquisar o nicho, bombou.', depois: 'Fiz o post no Claude. Bombou.' },
    },
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'mania 4',
      titulo: 'Palavra que ninguém <span class="serifa">fala</span>.',
      texto: 'Se você não fala assim no áudio, não escreve assim no post.',
      prova: { tipo: 'riscadas', itens: ['potencializar', 'alavancar', 'jornada', 'mergulhe', 'desvende'] },
    },

    // 7. O mini curso.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'o método',
      titulo: 'Escrever do seu jeito<br>dá pra <span class="serifa">ensinar</span>.',
      texto: 'No mini curso, o Claude aprende o seu jeito de falar e revisa o texto antes de você postar.',
      prova: {
        tipo: 'oferta',
        imagem: 'curso-card.jpg',
        titulo: 'Posts automáticos com Claude',
        itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Pauta, texto e arte no automático'],
        preco: 'R$ 39,90', pe: 'link na bio',
      },
    },

    // 8. Chamada: volta ao marrom da capa.
    {
      tipo: 'chamada', tema: 'preto',
      fundoLiso: '#211309',
      titulo: { pre: 'comenta', condensada: 'TEXTO', x: 104, y: 230, tam: 280 },
      assunto: { foto: true, arq: 'filipe-v9-texto.png', x: -10, y: 405, w: 1100, sombra: false, brilho: false },
      blocos: [{
        tipo: 'nota', x: 110, y: 1070, w: 860, tam: 38, solido: true,
        html: 'que eu te mando o <span class="serifa" style="font-size:50px;color:#ff9a1f">prompt</span> no direct 🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">que tira a cara de IA do seu texto, no seu jeito de falar</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
