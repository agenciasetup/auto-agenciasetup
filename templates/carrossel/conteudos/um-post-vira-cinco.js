// Ângulo novo sobre automatizar posts (04/11/2026): o post que deu certo vira 5 formatos num pedido só.
// Nenhuma pauta do Em alta de 04/11 passou nos 4 testes: a mais forte (ChatGPT e Codex dividindo o limite) já virou o
// carrossel limite-ia em 01/11. Ver o resumo da tarefa.
// Números do slide 2 (ver_desempenho, br, 30 dias): o Reels "Como fazer posts automáticos com IA" (31/10, POSTS) teve
// 190 comentários; o carrossel do mesmo assunto (01/11, ROTINA), 21. Slide 3: o carrossel da pauta (26/10, PAUTA),
// 209 comentários e 225 salvos (o Reels ganha na soma: 190 + 309 = 499 contra 434). As 2 frases do slide 6 são as primeiras linhas reais dessas duas legendas.
// Capa: a pata branca chegando na lente, com os 5 patinhos atrás (1 vira 5), na grama e no céu azul. A foto está
// espelhada (pata à direita) para a cabeça passar pelo fim da palavra, como pediu o revisor (04/11/2026).
(() => {
  const CENA = { fundoFoto: { arq: 'pato-cena-esp.jpg', x: 30, y: 20, w: 1040 } };
  const BICHO = { arq: 'bicho-pato-esp.png', x: 30, y: 20, w: 1040, sombra: false, brilho: false, cru: true };
  const C = '<span style="font-family:\'Great Vibes\',cursive;font-size:1.22em;color:#ffcc00;text-transform:none;margin-right:-0.08em;position:relative;z-index:2;vertical-align:-0.06em">C</span>INCO';
  window.CARROSSEL = {
    nome: 'um-post-vira-cinco',
    marca: { perfil: '@agenciasetup', nome: 'Calango' },
    capas: [],
    palavra: 'CINCO',
    legenda: '',
    slides: [
      {
        tipo: 'capa', tema: 'preto', ...CENA, reguasAtras: true,
        titulo: {
          semSombra: true, pre: 'como eu faço 1 <span class="serifa">post</span> virar', preLado: 'centro', preEspaco: 30,
          script: 'C', fonteScript: 'Great Vibes', scriptTam: 300, condensada: 'INCO', tam: 270, y: 312, encaixe: -0.1, dx: -15, cor: '#fff', corScript: '#ffcc00',
          foco: { esq: 3, dir: 3, centro: [0.24, 0.72] },
        },
        assunto: BICHO,
        selo: { aponta: '.titulo-capa .progressivo .condensada', ponto: [1.0, 0.12], pequeno: true },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'Calango,', vocativo: true,
        titulo: 'o mesmo assunto, em <span class="serifa">dois formatos</span>, deu isso:',
        texto: 'Ninguém sabe em qual formato<br>o assunto explode. Por isso eu faço os 5.',
        prova: {
          tipo: 'numeros', tam: 150, semX: true,
          itens: [
            { v: '190', t: 'no Reels de posts automáticos' },
            { v: '21', t: 'no carrossel do mesmo assunto', fraco: true },
          ],
          pe: 'Números do @agenciasetup, 31/10 e 01/11/2026.',
        },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'passo 1',
        titulo: 'Eu escolho pelo <span class="serifa">número</span>, não pelo gosto.',
        texto: 'Pego o post do mês com mais<br>comentário + salvamento, somados.<br>O assunto já provou que prende.',
        prova: {
          tipo: 'numeros', tam: 150, semX: true,
          itens: [
            { v: '190', t: 'comentários no Reels de posts automáticos' },
            { v: '309', t: 'salvamentos, o mais salvo do mês' },
          ],
          pe: 'O post do mês no @agenciasetup (31/10/2026).',
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'passo 2',
        titulo: 'Um pedido só, <span class="serifa">cinco formatos</span>.',
        texto: 'Colo o post no Claude<br>e peço as 5 versões de uma vez.<br>A regra de cada formato vai junto.',
        prova: {
          tipo: 'codigo', arquivo: 'pedido.txt',
          linhas: [
            '# 1 post vira 5',
            'Esse post deu certo no meu perfil:',
            '[cola a legenda e o texto dos slides]',
            '',
            'Faz 5 versões do mesmo assunto:',
            '1. o formato que faltou',
            '2. frase pra compartilhar',
            '3. stories com enquete',
            '4. texto pro Threads',
            '5. post pro LinkedIn',
            '',
            '[a regra de cada formato: no direct]',
          ],
        },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'uma das 5',
        titulo: 'Aquele Reels, virado em <span class="serifa">Threads</span>.',
        texto: 'Mesmo assunto, outro gancho.<br>É o tipo de texto que o pedido devolve.',
        prova: {
          tipo: 'exemplo', cor: '#ffffff', tinta: '#141311', legenda: 'exemplo: o Reels de posts automáticos, em Threads',
          html: '<div style="font-family:Outfit;text-align:left;padding:34px 40px;width:720px">' +
            '<div style="display:flex;gap:16px;align-items:center;margin-bottom:18px"><i style="width:56px;height:56px;border-radius:50%;background:#ffcc00;display:block"></i><div style="font-size:26px;line-height:1.2"><b>agenciasetup</b><div style="opacity:.5;font-size:22px">agora</div></div></div>' +
            '<div style="font-size:30px;line-height:1.35">190 pessoas comentaram num Reels meu pra receber a mesma coisa.<br>O assunto: post automático. O Claude acha o tema, escreve e monta a arte.<br><br>Qual parte do post você ainda faz na mão?</div></div>',
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'a regra',
        titulo: 'Muda o <span class="serifa">gancho</span>,<br>não o assunto.',
        texto: 'Cada formato abre com uma frase nova.<br>Do mesmo assunto, as nossas duas:',
        prova: {
          tipo: 'exemplo', cor: '#1c1b19', tinta: '#f5f1ea', legenda: 'as primeiras linhas do carrossel e do Reels',
          html: '<div style="font-family:Outfit;font-size:34px;line-height:1.3;text-align:left;padding:38px 46px;width:740px">' +
            '<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.55;margin-bottom:10px">CARROSSEL</div>' +
            '<div style="margin-bottom:30px">"Muita gente acha que post automático é robô postando sozinho. Não é."</div>' +
            '<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.55;margin-bottom:10px">REELS</div>' +
            '<div style="color:#ff9a1f">"Quanto tempo você gasta hoje pra sair um post?"</div></div>',
        },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'e depois?',
        titulo: 'Do pedido pro <span class="serifa">post pronto</span>.',
        texto: 'No mini curso, você ensina o Claude a escrever e montar a arte do post no seu estilo.',
        prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Estilo, pauta, texto e arte'], preco: 'R$ 39,90', pe: 'link na bio' },
      },
      {
        tipo: 'chamada', tema: 'preto', ...CENA, reguasAtras: true,
        titulo: { pre: 'comenta', condensada: C, centro: true, y: 275, tam: 300, cor: '#fff' },
        assunto: { foto: true, ...BICHO },
        blocos: [{ tipo: 'nota', x: 110, y: 1135, w: 560, tam: 32, solido: true, fundo: '#141311', html: '<div style="text-align:center;color:#f5f1ea">e eu te mando no direct<br><span class="serifa" style="font-size:46px;color:#ff9a1f">o pedido dos 5 formatos</span></div>' }],
        selo: { aponta: '.palavra-chamada', pontoCentro: [0.8, -0.22], pequeno: true },
      },
    ],
  };
})();
