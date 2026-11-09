// Conteúdo: "Como fazer arte bonita com IA" (24/10/2026). 10 slides.
// Tese: arte de IA fica bonita quando sai por etapas (fundo, título, assunto, efeitos), como código; um prompt só no
// GPT dá a poluição preta e dourada com cara de IA.
// Capa em quase preto: a selfie rindo dele, de camiseta amarela, com o carrossel "criado no Claude" impresso na mão.
// Os slides 4 a 7 mostram a própria capa sendo montada (as etapas reais, exportadas com ferramentas/etapas.mjs).
// A arte do slide 2 foi pedida de verdade ao ChatGPT (plano grátis do dono, 24/10/2026), com um prompt só.
const ETAPAS = '../../_local/carrossel/arte-bonita-com-ia/etapas';
window.CARROSSEL = {
  nome: 'arte-bonita-com-ia',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'CAMADAS',
  legenda: 'Comenta CAMADAS que eu te mando o prompt das 5 etapas no direct! 🦎\nMuita gente pede tudo num prompt só e sai aquela arte preta e dourada, com gráfico subindo e cara de IA.\nNo Claude eu faço por etapas: primeiro o fundo, depois o título, o assunto e só no fim os efeitos. Como se ele programasse a arte.\nEsse carrossel foi 100% feito lá. Nem abri o Photoshop.\nQual você prefere: a do slide 2 ou essa? 👇\n.\n.\n#boracalango #designcomia #claude',
  slides: [
    // 1. Capa (24/10/2026): a selfie rindo dele de verdade, editada no Nano Banana Pro: camiseta amarela e, na mão, o
    // carrossel "criado no Claude" impresso (a arte bonita que ele fez).
    // Revisão de 24/10/2026: quase preto liso, sem o brilho atrás dele e sem notificação (a prova é o carrossel na mão).
    {
      tipo: 'capa', tema: 'preto',
      fundoLiso: '#0e0d0c',
      titulo: {
        pre: 'como fazer', preEspaco: 22,
        script: 'A', fonteScript: 'Great Vibes', scriptTam: 310, condensada: 'RTE', tam: 250, y: 215, encaixe: -0.16,
        foco: { esq: 4, dir: 12, centro: [0.25, 0.7] },
        pos: 'bonita com <span class="serifa">IA</span>', posTam: 54,
      },
      assunto: { arq: 'filipe-v6-arte.png', x: -40, y: 200, w: 1250, sombra: false, brilho: false },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.7, 0.92], pequeno: true },
    },

    // 2. O problema, com a prova: a arte do ChatGPT, de um prompt só.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'Calango,', vocativo: true,
      titulo: 'Arte de IA tem <span class="serifa">cara</span> de IA?',
      texto: 'Um prompt só no GPT e sai isso: preto, dourado, gráfico subindo e número inventado.',
      prova: { tipo: 'imagem', arq: 'gpt-arte-um-prompt.png', w: 540, legenda: 'um prompt só, no ChatGPT' },
    },

    // 3. O porquê: tudo de uma vez.
    {
      tipo: 'miolo', tema: 'preto',
      titulo: 'O erro é pedir<br><span class="serifa">tudo</span> de uma vez.',
      texto: 'Fundo, texto, foto e efeito num prompt só. A IA chuta o resto, e chuta no clichê.',
      prova: {
        tipo: 'numeros',
        itens: [{ v: '1', t: 'prompt pra tudo', fraco: true }, { v: '5', t: 'etapas, uma de cada vez' }],
        pe: 'o jeito que eu faço no Claude',
      },
    },

    // 4 a 7. A capa deste carrossel sendo montada, etapa por etapa (camadas reais).
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'etapa 1',
      titulo: 'Primeiro, só o <span class="serifa">fundo</span>.',
      texto: 'A cor e o clima. Nada mais.',
      prova: { tipo: 'imagem', arq: `${ETAPAS}/1-fundo.jpg`, w: 500 },
    },
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'etapa 2',
      titulo: 'Depois, o <span class="serifa">título</span>.',
      texto: 'Num eixo só, com a palavra que carrega a ideia.',
      prova: { tipo: 'imagem', arq: `${ETAPAS}/2-titulo.jpg`, w: 500 },
    },
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'etapa 3',
      titulo: 'Aí entra o <span class="serifa">assunto</span>.',
      texto: 'A foto recortada passa na frente do título. É isso que dá profundidade.',
      prova: { tipo: 'imagem', arq: `${ETAPAS}/3-assunto.jpg`, w: 500 },
    },
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'etapa 4',
      titulo: 'Por último, os <span class="serifa">efeitos</span>.',
      texto: 'Só onde faz sentido: desfoque no fim da palavra, o selo e a textura.',
      prova: { tipo: 'imagem', arq: `${ETAPAS}/4-final.jpg`, w: 500 },
    },

    // 8. Por que funciona: cada camada é código.
    {
      tipo: 'miolo', tema: 'branco',
      titulo: 'É como se ele <span class="serifa">programasse</span> a arte.',
      texto: 'Cada camada é código: dá pra mexer numa sem estragar as outras. <b>Esse carrossel foi 100% feito lá.</b> Nem abri o Photoshop.',
      prova: {
        tipo: 'conversa',
        eu: 'Desce o título um pouco, pro cabelo passar na frente.',
        ia: 'Feito. Mexi só no título, o resto ficou igual.',
      },
    },

    // 9. O mini curso.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'quer aprender?',
      titulo: 'O <span class="serifa">passo a passo</span><br>tá no mini curso.',
      texto: 'Do zero: o seu estilo, as etapas e a revisão de cada arte, tudo no Claude.',
      prova: {
        tipo: 'oferta',
        imagem: 'curso-card.jpg',
        titulo: 'Posts automáticos com Claude',
        itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Arte em camadas, sem Photoshop'],
        preco: 'R$ 39,90', pe: 'link na bio',
      },
    },

    // 10. Chamada: fecha no preto, com o Filipe da capa mais perto.
    {
      tipo: 'chamada', tema: 'preto',
      fundoLiso: '#0e0d0c',
      titulo: { pre: 'comenta', condensada: 'CAMADAS', x: 104, y: 230, tam: 230 },
      assunto: { foto: true, arq: 'filipe-v6-arte.png', x: -60, y: 120, w: 1300, sombra: false, brilho: false },
      blocos: [{
        tipo: 'nota', x: 110, y: 1040, w: 860, tam: 38, solido: true,
        html: 'que eu te mando o <span class="serifa" style="font-size:50px;color:#ff9a1f">prompt das 5 etapas</span> 🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">no direct: o mesmo que eu usei nesse carrossel</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
