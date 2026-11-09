// Conteúdo: "Vale a pena usar o Claude?" (24/10/2026). 8 slides.
// Tese: depende. Se você quer ganhar tempo, cortar operação e focar em vender, vale: o que leva horas (buscar, escrever,
// desenhar, animar) o Claude faz em minutos, e você só refina. Os tempos de designer e motion são os do dono.
// Capa: a foto de boné dele de verdade, editada no Nano Banana Pro (camiseta amarela, estúdio escuro com luz laranja
// desfocado atrás do título), com a cara do "hmm, depende", no centro, e a janela do Claude desfocada no fundo.
// O slide 5 é o card animado (MP4 feito em código: ferramentas/animar.mjs); parado, mostra o último quadro.
// Palavra: TEMPO (material: as 10 tarefas de social media para passar pro Claude).
window.CARROSSEL = {
  nome: 'vale-a-pena-claude',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'TEMPO',
  legenda: 'Vale a pena usar o Claude? Depende. 🦎\nSe você quer ganhar tempo, parar de fazer o operacional e focar em vender: vale, e muito.\nBuscar assunto e escrever leva horas. Um carrossel leva de 2 a 4 horas. Um motion, de 3 a 5. O Claude faz em minutos, e você só refina.\nComenta TEMPO que eu te mando as 10 tarefas pra passar pro Claude ainda essa semana.\n.\n.\n#boracalango #claude #socialmedia',
  slides: [
    // 1. Capa (24/10/2026): a foto de boné dele de verdade, editada no Nano Banana Pro (camiseta amarela, estúdio com
    // luz laranja desfocado atrás do título), com a cara do "hmm, depende" e o braço mostrando força (vale, e muito).
    // O punho, mais perto da câmera, desfoca. A foto desce para o boné não cobrir o "depende.".
    // Revisão de 24/10/2026: o "?" no título, a foto no centro (antes sobrava um vazio do lado) e a janela do Claude
    // desfocada no fundo, com a pergunta do post. Sem notificação.
    {
      tipo: 'capa', tema: 'preto', luzX: '50%', luzY: '40%',
      fundoFoto: { arq: 'filipe-v6-vale-fundo.jpg', x: -75, y: 40, w: 1250 }, fundoBrilho: 0.85,
      fundoBlocos: [{ tipo: 'janela', x: 650, y: 650, w: 560, rot: 3, blur: 2.5, eu: 'Vale a pena assinar o Claude?', ia: 'Depende. Quantas horas por semana você passa escrevendo?' }],
      titulo: {
        pre: 'vale a pena usar o', preEspaco: 12,
        script: 'C', fonteScript: 'Great Vibes', scriptTam: 320, condensada: 'LAUDE?', tam: 215, y: 225, encaixe: -0.16,
        foco: { esq: 4, dir: 5, centro: [0.25, 0.8] }, // o "?" precisa ler: pouco desfoque no fim
        pos: '<span class="serifa">depende.</span>', posTam: 56,
      },
      assunto: { arq: 'filipe-v6-vale.png', x: -75, y: 330, w: 1250, sombra: false, foco: { angulo: 270, de: 0.6, ate: 0.9, max: 5 } },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.6, 0.9], pequeno: true },
    },

    // 2. A resposta honesta.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'Calango,', vocativo: true,
      titulo: 'Depende do que você quer da sua <span class="serifa">semana</span>.',
      texto: 'Se é ganhar tempo, cortar operação e automatizar tarefa: <b>vale, e muito.</b>',
      prova: {
        tipo: 'conversa',
        eu: 'Vale a pena assinar o Claude?',
        ia: 'Depende. Quantas horas por semana você passa procurando assunto e escrevendo?',
      },
    },

    // 3. Social media.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'social media',
      titulo: 'Buscar e escrever<br>leva <span class="serifa">horas</span>.',
      texto: 'O Claude faz em minutos, e bem. Você só refina.',
      prova: {
        tipo: 'numeros', tam: 130,
        itens: [{ v: 'horas', t: 'procurando assunto e escrevendo do zero', fraco: true }, { v: 'min', t: 'com o Claude, e você só refina' }],
      },
    },

    // 4. Designer.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'designer',
      titulo: 'Um carrossel leva<br>de 2 a 4 <span class="serifa">horas</span>.',
      texto: 'Esse aqui saiu em minutos, no Claude. E ficou desse nível.',
      prova: {
        tipo: 'numeros', tam: 130,
        itens: [{ v: '2 a 4 h', t: 'um designer, um carrossel', fraco: true }, { v: 'min', t: 'o Claude, este carrossel' }],
      },
    },

    // 5. Motion: o card animado (vídeo). A linha do tempo anda, as camadas entram e o relógio vira "minutos".
    {
      tipo: 'miolo', tema: 'preto', anima: true,
      rotulo: 'motion',
      titulo: 'Um motion leva<br>de 3 a 5 <span class="serifa">horas</span>.',
      texto: 'Esse card animado foi feito em minutos.',
      prova: {
        tipo: 'linha-do-tempo', projeto: 'card-animado.mp4', segundos: 6, antes: '3 a 5 horas', depois: 'minutos',
        camadas: [
          { nome: 'fundo', cor: '#4a4a50', de: 0, ate: 1, chaves: [0.02, 0.9] },
          { nome: 'título', cor: 'linear-gradient(90deg,#ff8a1f,#ffb000)', de: 0.06, ate: 1, chaves: [0.08, 0.3] },
          { nome: 'texto', cor: 'linear-gradient(90deg,#ffb000,#ffd36b)', de: 0.16, ate: 1, chaves: [0.18, 0.4] },
          { nome: 'relógio', cor: '#d97757', de: 0.62, ate: 1, chaves: [0.64, 0.9] },
        ],
      },
    },

    // 6. A conclusão.
    {
      tipo: 'miolo', tema: 'branco',
      titulo: 'Então, vale a <span class="serifa">pena</span>?',
      texto: 'Se você quer parar o operacional e focar em vender: vale. <b>Assina o Claude e usa direito.</b>',
      prova: {
        tipo: 'checklist',
        itens: ['A pauta do dia, sem procurar', 'O texto no seu estilo', 'A arte e a animação em minutos', 'Mais tempo pra vender'],
      },
    },

    // 7. O mini curso: usar direito.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'usar direito',
      titulo: 'Usar <span class="serifa">direito</span><br>é o que eu ensino.',
      texto: 'No mini curso eu mostro o passo a passo pra deixar o Claude trabalhando por você.',
      prova: {
        tipo: 'oferta',
        imagem: 'curso-card.jpg',
        titulo: 'Posts automáticos com Claude',
        itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Pauta, texto e arte no automático'],
        preco: 'R$ 39,90', pe: 'link na bio',
      },
    },

    // 8. Chamada: fecha no preto, com o Filipe da capa mais perto.
    {
      tipo: 'chamada', tema: 'preto', luzX: '50%', luzY: '40%',
      fundoFoto: { arq: 'filipe-v6-vale-fundo.jpg', x: -330, y: 40, w: 1500 }, fundoBrilho: 0.8,
      titulo: { pre: 'comenta', condensada: 'TEMPO', x: 104, y: 230, tam: 260 },
      assunto: { foto: true, arq: 'filipe-v6-vale.png', x: -280, y: 200, w: 1400, sombra: false },
      blocos: [{
        tipo: 'nota', x: 110, y: 1060, w: 860, tam: 38, solido: true,
        html: 'que eu te mando as <span class="serifa" style="font-size:50px;color:#ff9a1f">10 tarefas</span> no direct 🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">pra passar pro Claude ainda essa semana</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
