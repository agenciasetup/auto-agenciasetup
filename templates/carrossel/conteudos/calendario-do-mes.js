// Ângulo novo sobre automatizar posts (03/11/2026): o mês inteiro de pautas num prompt só.
// Nenhuma pauta do Em alta de 03/11 passou nos 4 testes (ver o resumo da tarefa). O PAUTA (26/10) era a pauta do dia,
// tirada das notícias; este é o plano do mês, tirado do nicho. Números do slide 2: ver_desempenho, br, 30 dias.
// "Num prompt só" é verdade: o prompt do material pede a pauta e o gancho de cada dia na mesma tabela.
// Capa em amarelo: o elefante filhote (elefante não esquece) trazendo o calendário cheio. Título pedido pelo dono em
// 03/11/2026: "prompt para gerar 30 Dias de posts", com o D cursivo.
(() => {
  // Foto nova (03/11/2026): o dono achou a anterior "seca/tosca" e pediu o elefante pisando em grama. Gerada de novo no
  // Magnific: elefante de pé na grama, fundo amarelo de estúdio, calendário cheio de posts na tromba.
  const CENA = { fundoFoto: { arq: 'elefante-grama-cena.jpg', x: 30, y: -35, w: 1020 } };
  const BICHO = { arq: 'bicho-elefante-grama.png', x: 30, y: 150, w: 1020, sombra: false, brilho: false, cru: true };
  const CENA_CH = CENA;
  const BICHO_CH = BICHO;
  const linha = (dia, formato, pauta) => `<div style="display:flex;gap:22px;align-items:baseline;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.14)"><b style="font-weight:700;width:96px;flex:none">${dia}</b><span style="color:#ff9a1f;width:150px;flex:none">${formato}</span><span>${pauta}</span></div>`;
  window.CARROSSEL = {
    nome: 'calendario-do-mes',
    marca: { perfil: '@agenciasetup', nome: 'Calango' },
    capas: [],
    palavra: 'AGENDA',
    legenda: '',
    slides: [
      {
        tipo: 'capa', tema: 'amarelo', ...CENA, reguasAtras: true, semPoeira: [[520, 840, 520, 480]],
        titulo: {
          semSombra: true, pre: '<span class="serifa">prompt</span> para gerar', preLado: 'centro', preEspaco: 30,
          antes: '30', script: 'D', fonteScript: 'Great Vibes', scriptTam: 250, condensada: 'IAS', tam: 200, y: 250, encaixe: -0.2, cor: '#fff', corScript: '#141311',
          foco: { esq: 2, dir: 3, centro: [0.26, 0.74] },
          pos: 'de <span class="serifa">posts</span>', posTam: 46, posLado: 'esquerda',
        },
        assunto: BICHO,
        selo: { aponta: '.titulo-capa .progressivo .condensada', ponto: [0.7, 0.5], pequeno: true },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'Calango,', vocativo: true,
        titulo: 'o que trava não é a arte.<br>É o <span class="serifa">"posto o quê hoje?"</span>',
        texto: 'Aqui no perfil, o post com mais comentário do mês foi o carrossel da pauta do dia.',
        prova: {
          tipo: 'numeros', tam: 150, semX: true,
          itens: [
            { v: '209', t: 'comentários no carrossel da pauta do dia' },
            { v: '15', t: 'comentários num post nosso, na mediana', fraco: true },
          ],
          pe: 'Números do @agenciasetup nos últimos 30 dias.',
        },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'passo 1',
        titulo: 'Primeiro, um <span class="serifa">formato</span> pra cada dia.',
        texto: 'Aí o Claude não inventa do zero toda vez.<br>Ele só preenche.',
        prova: {
          tipo: 'exemplo', cor: '#141311', tinta: '#f5f1ea', legenda: 'exemplo de semana',
          html: `<div style="font-family:Outfit;font-size:30px;line-height:1.25;text-align:left;padding:34px 0;width:400px;margin:0 auto">${[
            ['Seg', 'dica rápida'], ['Ter', 'lista pra salvar'], ['Qua', 'bastidor'], ['Qui', 'antes e depois'],
            ['Sex', 'novidade da semana'], ['Sáb', 'frase'], ['Dom', 'pergunta pro público'],
          ].map(([d, f]) => `<div style="display:flex;gap:26px;padding:6px 0"><b style="font-weight:700;width:80px">${d}</b><span>${f}</span></div>`).join('')}</div>`,
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'passo 2',
        titulo: 'Depois, ele enche os <span class="serifa">30 dias</span>.',
        texto: 'Você conta o nicho, o público e o que vende. Ele escreve a pauta de cada dia.',
        prova: {
          tipo: 'exemplo', cor: '#1c1b19', tinta: '#f5f1ea', legenda: 'exemplo de uma confeitaria',
          html: `<div style="font-family:Outfit;font-size:30px;line-height:1.3;text-align:left;padding:26px 40px;width:760px">${
            linha('Ter', 'lista', 'erros que deixam o bolo com cara de barato') +
            linha('Qua', 'bastidor', 'a encomenda que quase deu errado') +
            linha('Qui', 'antes e depois', 'meu primeiro bolo e o de hoje')
          }</div>`,
        },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'no mesmo prompt',
        titulo: 'Peça o <span class="serifa">gancho</span> de cada post junto.',
        texto: 'A pauta é o assunto.<br>O gancho é a frase da capa.',
        prova: {
          tipo: 'exemplo', cor: '#ffcc00', tinta: '#141311', legenda: 'o gancho da terça, pronto pra capa', w: 380, h: 475,
          html: '<div style="width:300px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:22px;margin:0 auto;text-align:center;font:400 52px/1.22 Anton,sans-serif;text-transform:uppercase"><div>Seu bolo<br>é bom.</div><div>A foto diz<br>que é</div><span style="background:#141311;color:#ffcc00;padding:8px 22px 4px">barato</span></div>',
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'todo mês',
        titulo: 'Guarde num <span class="serifa">projeto</span> e repita.',
        texto: 'Na primeira vez, monte o projeto.<br>Depois, é um pedido só.',
        prova: {
          tipo: 'exemplo', cor: '#1c1b19', tinta: '#f5f1ea', legenda: 'o pedido do mês seguinte',
          html: '<div style="font-family:Outfit;font-size:30px;line-height:1.4;text-align:left;padding:40px 46px;width:720px">' +
            '<div style="opacity:.7">1. Crie um projeto no Claude</div><div style="opacity:.7;margin-bottom:26px">2. Cole seu nicho, público, o que vende e os formatos nas instruções</div>' +
            '<div style="background:#f5f1ea;color:#141311;border-radius:18px;padding:26px 30px;font-size:34px;line-height:1.3">"Faz o calendário de dezembro sem repetir pauta."</div></div>',
        },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'e depois?',
        titulo: 'Do calendário pro <span class="serifa">post pronto</span>.',
        texto: 'No mini curso, o Claude escreve e monta a arte de cada dia. Você só aprova.',
        prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Estilo, pauta, texto e arte'], preco: 'R$ 39,90', pe: 'link na bio' },
      },
      {
        tipo: 'chamada', tema: 'amarelo', ...CENA_CH, reguasAtras: true, semPoeira: [[520, 900, 560, 460]],
        titulo: { pre: 'comenta', condensada: 'AGENDA', centro: true, y: 262, tam: 260, cor: '#fff' },
        assunto: { foto: true, ...BICHO_CH },
        blocos: [{ tipo: 'nota', x: 230, y: 1130, w: 620, tam: 32, solido: true, fundo: '#141311', html: '<span style="color:#f5f1ea">e eu te mando no direct</span><br><span class="serifa" style="font-size:44px;color:#ff9a1f">o prompt do calendário</span>' }],
        selo: { aponta: '.palavra-chamada', pontoCentro: [0.9, 0.9], pequeno: true },
      },
    ],
  };
})();
