// Conteúdo: "Só 1 em cada 3 criativos usa IA no trabalho" (25/10/2026; headline refeita em 26/10, a primeira, "quem cria
// é quem menos usa IA", ficou confusa para o dono). 8 slides.
// Tese: nos EUA, só 32% de quem trabalha com arte usa IA (média: 62%) e 200 mil empregos criativos sumiram em 4 anos.
// Não dá pra pôr toda a culpa na IA, mas o risco é ser o último a usar. Fonte: Apricitas Economics, 27/09/2026
// (https://www.apricitas.io/p/ai-and-the-fall-of-the-creative-class). Os números são dos EUA e o post diz isso.
// Capa creme (dado, análise): o Filipe com a mão no queixo e a sobrancelha levantada; ao lado, o gráfico nítido, com
// título e rótulos (criativos 32% x todo mundo 62%), que se entende sem legenda.
// Palavra: FUTURO (material: as 10 tarefas pro Claude, que já está no site).
window.CARROSSEL = {
  nome: 'quem-cria-usa-menos-ia',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'FUTURO',
  legenda: 'Só 1 em cada 3 criativos usa IA no trabalho 😳\nNos EUA, só 32% de quem trabalha com arte usa IA no trabalho. A média é 62%. E 200 mil empregos criativos sumiram em 4 anos.\nDá pra culpar só a IA? Não. Mas o risco não é ela chegar, é você ser o último a usar.\nComenta FUTURO que eu te mando as 10 tarefas pra passar pro Claude ainda essa semana 🦎\nE você, já passou alguma tarefa pra IA? 👇\n.\n.\n#boracalango #socialmedia #ia',
  slides: [
    // 1. Capa: a cara de "como assim?" de quem acabou de ler o número; o número está no gráfico ao lado dele, nítido.
    {
      tipo: 'capa', tema: 'branco',
      fundoLiso: '#f3f0ea',
      fundoBlocos: [{ tipo: 'grafico', deitado: true, x: 762, y: 640, w: 262, titulo: 'Usam IA no trabalho', pe: 'EUA, 2026', itens: [{ t: 'criativos', v: '32%', p: 0.32, destaque: true }, { t: 'todo mundo', v: '62%', p: 0.62 }] }],
      titulo: {
        pre: 'só 1 em cada 3', preEspaco: 10,
        script: 'C', fonteScript: 'Great Vibes', scriptTam: 260, condensada: 'RIATIVOS', tam: 190, y: 220, encaixe: -0.16, dx: -40,
        foco: { esq: 4, dir: 7, centro: [0.25, 0.8] },
        pos: 'usa <span class="serifa">IA</span> no trabalho', posTam: 50,
      },
      assunto: { arq: 'filipe-v8-futuro.png', cru: true, x: -95, y: 225, w: 1250, sombra: false, brilho: false },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.4, 0.9], pequeno: true },
    },

    // 2. O número.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'Calango,', vocativo: true,
      titulo: 'Olha esse <span class="serifa">número</span>.',
      texto: 'Nos EUA, só 32% de quem trabalha com arte usa IA no trabalho. A média de todo mundo é 62%.',
      prova: { tipo: 'numeros', tam: 170, itens: [{ v: '32%', t: 'arte e entretenimento' }, { v: '62%', t: 'média de todos os setores', fraco: true }], pe: 'Apricitas Economics, setembro de 2026' },
    },

    // 3. As perdas.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'nos EUA',
      titulo: 'Em 4 anos, sumiram<br>200 mil <span class="serifa">empregos</span>.',
      texto: 'Cinema, TV, jornal e revista foram os que mais perderam.',
      prova: { tipo: 'barras', itens: [{ t: 'Cinema e TV', v: 'mais de 100 mil', p: 1 }, { t: 'Textos e publicação', v: 'mais de 70 mil', p: 0.7 }, { t: 'Evento ao vivo', v: 'cresceu', p: 0.3, sobe: true }], pe: 'empregos criativos perdidos, de 2022 a 2026' },
    },

    // 4. A culpa: honestidade que dá credibilidade.
    {
      tipo: 'miolo', tema: 'preto',
      titulo: 'Foi a IA? Nem o<br><span class="serifa">economista</span> sabe.',
      prova: { tipo: 'conversa', eu: 'Foi a IA que tirou esses empregos?', ia: 'Em parte. Tem estúdio se juntando, produção indo pra fora e público trocando a TV pelos criadores. Não dá pra pôr tudo na conta da IA.' },
    },

    // 5. Quem perdeu.
    {
      tipo: 'miolo', tema: 'branco',
      titulo: 'Mas repara <span class="serifa">quem</span> perdeu.',
      texto: 'O lado digital perdeu vaga. O que é ao vivo cresceu. Quem só executa na tela ficou exposto.',
      prova: { tipo: 'colunas', colunas: [{ titulo: 'perdeu vaga', itens: ['Cinema e TV', 'Jornal e revista', 'Design gráfico'] }, { titulo: 'cresceu', itens: ['Show e evento', 'Tudo que é ao vivo'], destaque: true }] },
    },

    // 6. A lição.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'a lição',
      titulo: 'O risco é ser o <span class="serifa">último</span>.',
      texto: 'A IA chegar não é o problema. O problema é você ser o último a usar.',
      prova: { tipo: 'colunas', colunas: [{ titulo: 'passa pra IA', itens: ['Pauta', 'Rascunho', 'Arte de base', 'Legenda'] }, { titulo: 'fica com você', itens: ['A ideia', 'O gosto', 'O cliente', 'A venda'], destaque: true }] },
    },

    // 7. O mini curso.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'o método',
      titulo: 'Passar o operacional<br>é o que eu <span class="serifa">ensino</span>.',
      texto: 'No mini curso eu monto com você o Claude que faz o operacional, e você fica com o que dá dinheiro.',
      prova: {
        tipo: 'oferta',
        imagem: 'curso-card.jpg',
        titulo: 'Posts automáticos com Claude',
        itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Pauta, texto e arte no automático'],
        preco: 'R$ 39,90', pe: 'link na bio',
      },
    },

    // 8. Chamada: volta ao creme da capa.
    {
      tipo: 'chamada', tema: 'branco',
      fundoLiso: '#f3f0ea',
      titulo: { pre: 'comenta', condensada: 'FUTURO', x: 110, y: 230, tam: 250 },
      assunto: { foto: true, cru: true, arq: 'filipe-v8-futuro.png', x: -170, y: 90, w: 1380, sombra: false, brilho: false },
      blocos: [{
        tipo: 'nota', x: 110, y: 1070, w: 860, tam: 38, solido: true,
        html: 'que eu te mando as <span class="serifa" style="font-size:50px;color:#f06000">10 tarefas</span> no direct 🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">pra passar pro Claude ainda essa semana, com o pedido pronto</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
