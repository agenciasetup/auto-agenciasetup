// Em alta (05/11/2026): ChatGPT Images 2.6 (openai.com/index/introducing-images-2-6, 4/11/2026). Fatos usados:
// GIF no ChatGPT, personagem/produto/marca consistentes entre edições, 50% mais rápido, todos os planos.
// Ângulo pelo processo: o mascote do cliente animado com o pedido de 6 quadros numa grade (o mesmo dos exemplos da OpenAI).
// Prova nossa, dita como é: a grade do mascote de padaria saiu do Nano Banana Pro (Magnific) com esse pedido, e eu montei
// o GIF no computador; o quadro 5 trocou de braço, e isso virou a dica de conferir quadro por quadro. (A piscadinha dos
// quadros 3 e 4 estava no pedido.)
// Capa no quase preto (a fila em volta está cheia de céu azul): a raposa de gorro amarelo apoiada num folioscópio
// (o "GIF de papel"), com o desenho dela acenando.
(() => {
  // Foto escolhida: opção G (fundo quase preto, a fila em volta tem muito céu azul). Cena com o fundo escuro continuado
  // 440 px para cima (cena.py): a capa desce a raposa mais que a chamada, para a frase de cima caber.
  const bicho = (y) => ({ arq: 'bicho-raposa-gif.png', x: 40, y, w: 1000, sombra: false, brilho: false, cru: true });
  const cena = (y) => ({ fundoFoto: { arq: 'raposa-gif-cena.jpg', x: 40, y: y - 407, w: 1000 } });
  const CENA = cena(372), BICHO = bicho(372), CENA_CH = cena(318), BICHO_CH = bicho(318);
  const G = (tam) => `<span style="font-family:'Great Vibes',cursive;text-transform:none;font-weight:400;color:#ffcc00;font-size:${tam}em;margin-right:-0.14em;position:relative;z-index:2">G</span>`;
  window.CARROSSEL = {
    nome: 'gif-mascote',
    marca: { perfil: '@agenciasetup', nome: 'Calango' },
    capas: [],
    palavra: 'GIF',
    legenda: '',
    slides: [
      {
        tipo: 'capa', tema: 'preto', ...CENA,
        titulo: {
          // A frase inteira fica em cima (a raposa ocupa embaixo): "no ChatGPT, o mascote do seu cliente agora vira GIF".
          semSombra: true, pre: '<div style="line-height:1.15;text-align:center">no <span class="serifa">ChatGPT</span>, o mascote do<br>seu <span class="serifa">cliente</span> agora vira</div>', preLado: 'centro', preEspaco: 28,
          script: 'G', fonteScript: 'Great Vibes', scriptTam: 370, condensada: 'IF', tam: 350, y: 362, encaixe: -0.12, dx: -20,
          cor: '#fff', corScript: '#ffcc00',
          foco: { esq: 2, dir: 3, centro: [0.25, 0.75] },
        },
        assunto: BICHO,
        selo: { aponta: '.titulo-capa .progressivo .condensada', ponto: [0.92, 0.3], pequeno: true },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'Calango,', vocativo: true, semPoeira: [[250, 150, 260, 220]],
        titulo: 'o ChatGPT ganhou o <span class="serifa">Images 2.6</span>.',
        texto: 'Agora ele faz GIF. E segura o mesmo personagem de uma edição pra outra.',
        prova: {
          tipo: 'numeros', tam: 175, semX: true,
          itens: [
            { v: '50%', t: 'mais rápido pra gerar imagem' },
            { v: 'todos', t: 'os planos já têm', fraco: true },
          ],
          pe: 'Fonte: OpenAI, 4/11/2026.',
        },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'passo 1',
        titulo: 'Mande o mascote do cliente de <span class="serifa">referência</span>.',
        texto: 'É aí que o 2.6 ajuda: o personagem não muda de um pedido pro outro.',
        prova: {
          tipo: 'checklist',
          itens: ['a imagem do mascote, junto com o pedido', 'o que ele faz, em 6 momentos', '3 colunas e 2 linhas, câmera parada', 'sem texto e sem bordas', 'o último quadro voltando pro primeiro'],
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'passo 2',
        titulo: 'Peça <span class="serifa">6 quadros</span><br>numa grade.',
        texto: 'Os 6 quadros, em sequência, viram o GIF.<br>Testei esse pedido no Nano Banana Pro.',
        prova: { tipo: 'imagem', arq: 'grade-mascote-padaria.jpg', w: 760, legenda: 'a grade do mascote de uma padaria, no meu teste' },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'passo 3', semPoeira: [[40, 1150, 300, 170]],
        titulo: 'Confira <span class="serifa">quadro por quadro</span>.',
        texto: 'No meu teste, o quadro 5 trocou de braço.<br>No GIF, isso vira um pulo. Refaça só ele.',
        prova: {
          tipo: 'versus-imagens',
          itens: [
            { arq: 'quadro-4-padaria.jpg', legenda: 'quadro 4' },
            { arq: 'quadro-5-padaria.jpg', legenda: 'quadro 5: outro braço' },
          ],
        },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'e depois?',
        titulo: 'Do mascote pro <span class="serifa">post pronto</span>.',
        texto: 'No mini curso, o Claude escreve e monta a arte de cada post. Você só aprova.',
        prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Estilo, pauta, texto e arte'], preco: 'R$ 39,90', pe: 'link na bio' },
      },
      {
        tipo: 'chamada', tema: 'preto', ...CENA_CH,
        titulo: { pre: 'comenta', preEspaco: 50, condensada: `${G(1.15)}IF`, centro: true, y: 300, tam: 400, cor: '#fff' },
        assunto: { foto: true, ...BICHO_CH },
        blocos: [{ tipo: 'nota', x: 190, y: 1158, w: 700, tam: 32, solido: true, fundo: '#141311', html: '<span style="color:#f5f1ea">e eu te mando no direct</span><br><span class="serifa" style="font-size:44px;color:#ff9a1f">os 5 prompts de GIF pro mascote</span>' }],
        selo: { aponta: '.palavra-chamada', pontoCentro: [0.92, 0.35], pequeno: true },
      },
    ],
  };
})();
