// O carrossel do Van Gogh refeito no jeito infinito (11/11/2026). O original é de 26/04/2024 (3.372 curtidas, o
// gabarito do dono: "Esse com a imagem do Van Gogh, com as abelhas, o girassol no meio de dois cards... é lindo!").
// O texto é o dele, com o truque de ler de trás para frente: na ordem, "nunca contrate um designer"; de trás para
// frente, "o design é essencial para todos os negócios".
// Segunda versão, pelas correções do dono no mesmo dia (o original em _local/design-arquivo/b-meio-2024-04-26-*):
// 1. o laranja do original (#FAA004 no alto, #F57A06 embaixo), com textura de pintura, e não o amarelo liso;
// 2. as duas linhas da headline com a mesma largura (`bloco`), mesmo que a fonte fique de tamanho diferente;
// 3. o Van Gogh no meio, o quadro atrás dele, o chapéu um pouco por cima da headline e o corpo saindo pela moldura
//    preta de baixo (ele está na travessia, que não é cortada pela janela);
// 4. o girassol e o busto grandes (a cabeça do girassol com uns 800 px, metade da altura do card), sem sombra: nada que
//    voa ou sai da borda de baixo tem sombra ("a sombra na abelha ficou artificial");
// 6. respiro: a headline e os elementos um pouco menores, com a margem de cima parecida com a dos lados ("o que você
//    faz costuma ficar muito colado"); a headline na largura do quadro, o que abre espaço para o "um designer" ao lado
//    do chapéu (`posFrente` o põe na frente, se encostar);
// 5. o fim como o do original: o título grande "DE TRÁS PARA / FRENTE!" com o girassol saindo do quadro na frente dele.
// E as cores por mundo, como no original: os cards 1 e 2 em cor (laranja, girassol, abelha dourada); os brancos em
// cinza (nuvens cinza, abelhas sem cor, o busto de mármore); os pretos com a pincelada rosa.
// Coordenadas da tela larga: x de 0 a 10800 (10 cards); a divisa entre o card k e o k+1 é x = 1080 vezes k.
const B = '../../biblioteca/';
const C = (k) => (k - 1) * 1080; // onde começa o card k
const abelha = (n, x, y, w, extra = {}) => ({ arq: `${B}animais/abelhas/abelha-voando${n > 1 ? `-${n}` : ''}.png`, x, y, w, ...extra });
const nuvem = (n, x, y, w, extra = {}) => ({ arq: `${B}ceu/nuvens/nuvem-fofa${n > 1 ? `-${n}` : ''}.png`, x, y, w, ...extra });
// No mundo branco tudo é cinza (como no original): nuvem escurecida e abelha sem cor.
const CINZA = { sat: 0, luz: 0.74 };
const SEM_COR = { sat: 0 };

window.CARROSSEL = {
  nome: 'vangogh-infinito',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: '',
  // Por dentro das janelas (atrás da moldura): o fundo laranja pintado dos cards 1 e 2, o quadro atrás do Van Gogh, as
  // nuvens cinza dos cards brancos e a pincelada dos cards pretos.
  panorama: [
    { arq: `${B}fundos/pinturas/fundo-laranja-noite-estrelada.png`, x: 0, y: 0, w: 2160, blur: 1 },
    // Camada 1: o quadro no meio, atrás do Van Gogh, sutilmente desfocado.
    { arq: `${B}arte/quadros/quadro-moldura-dourada-noite-estrelada-grande.png`, x: 190, y: 720, w: 700, blur: 3, luz: 0.97, sat: 1.15 },
    abelha(2, 880, 300, 64, { z: -0.5 }),
    // Os cards brancos: nuvens cinza grandes e desfocadas em cima e embaixo, como no original.
    nuvem(1, C(3) + 380, 930, 980, { blur: 9, ...CINZA }),
    nuvem(2, C(4) + 520, -330, 1100, { blur: 12, ...CINZA, op: 0.85 }),
    nuvem(1, C(5) + 520, 960, 900, { blur: 9, ...CINZA }),
    abelha(2, C(3) + 260, 1040, 70, { z: -0.5, ...SEM_COR }),
    nuvem(2, C(9) - 120, -260, 980, { blur: 12, ...CINZA, op: 0.85 }),
    nuvem(1, C(9) + 260, 1000, 900, { blur: 9, ...CINZA }),
    nuvem(2, C(10) + 640, -220, 760, { blur: 12, ...CINZA, op: 0.8 }),
    // Os cards pretos: a pincelada em diagonal, uma em cima do 6 para o 7 e outra embaixo atravessando os três.
    { arq: `${B}formas/pinceladas/pincelada-rosa-coral-2.png`, x: C(6) + 200, y: 200, w: 1230, h: 160, rot: -13 },
    { arq: `${B}formas/pinceladas/pincelada-rosa-coral-3.png`, x: C(6) - 160, y: 1080, w: 3360, h: 200, rot: -5, espelho: true },
  ],
  travessia: [
    // Camada 4: a luz pela receita do dono (uma bola desfocada na cor do fundo, o centro amarelo mais claro, em modo tela
    // e com pouca opacidade), vindo do alto à esquerda; e uma em sobrepor no rosto, que esquenta a cor sem mexer no preto
    // e no branco (o efeito do blend-if).
    { halo: true, x: 250, y: 330, d: 1150, cor: '#fff6c0', borda: '#ffb000', blur: 40, op: 0.4, mistura: 'screen' },
    { halo: true, x: 600, y: 930, d: 1000, cor: '#ffe9a0', borda: '#ff9800', blur: 50, op: 0.35, mistura: 'overlay' },
    // Camada 3: o Van Gogh no meio, na frente do quadro, com o chapéu por cima do fim da headline e o corpo saindo pela
    // moldura de baixo (fica na travessia para não ser cortado pela janela).
    { arq: `${B}personagens/historicos/van-gogh-3d-grande.png`, x: 254, y: 601, w: 600, z: 0, sat: 1.12 },
    // Camadas 5 a 7: abelhas em distâncias diferentes, sem sombra, e as nuvens perto da lente embaixo.
    abelha(1, 130, 720, 110, { rot: 8, z: 0, espelho: true, sat: 1.15 }),
    abelha(3, 800, 1010, 200, { z: 0.45, acima: true, rot: -6, sat: 1.15 }),
    nuvem(1, -300, 1060, 820, { z: 0.6, acima: true }),
    nuvem(2, 880, 1150, 560, { z: 0.4 }),
    // O girassol grande no meio do card 2 e do 3 (a cabeça com uns 820 px), o caule cortado pela borda de baixo.
    { arq: `${B}plantas/flores/girassol-de-frente-grande.png`, x: 1571, y: 101, w: 1364, z: 0, sat: 1.08 },
    abelha(1, C(2) + 470, 760, 110, { rot: 8, z: 0 }),
    abelha(3, C(3) + 560, 120, 100, { z: 0, ...SEM_COR, rot: 10 }),
    // O Calango de mármore grande entre o 4 e o 5, do peito para cima, a base cortada pela borda de baixo.
    { arq: `${B}personagens/esculturas/calango-marmore-terno-grande.png`, x: 3931, y: 391, w: 861, z: 0 },
    abelha(2, C(5) + 820, 820, 120, { z: 0, ...SEM_COR, espelho: true }),
    // A abelha grande perto da lente no "Me perdoa...", sem cor (como no original).
    abelha(1, C(9) + 600, 330, 380, { z: 0.5, acima: true, ...SEM_COR, rot: -8 }),
  ],
  slides: [
    {
      tipo: 'capa', tema: 'amarelo',
      // Os cantos desfocados ("desfoque nos cantos são bem-vindos").
      cantos: { blur: 7, de: 0.58 },
      titulo: {
        pre: '', script: '', condensada: 'NUNCA', linha2: 'CONTRATE', tam: 200, y: 190, bloco: 700, vao: -25, cor2: '#1d1305',
        foco: { esq: 0, dir: 3, centro: [0.1, 0.9] },
        pos: 'um <span class="serifa">designer</span>', posTam: 40, posLado: 'direita', posEspaco: 4, posFrente: true,
      },
    },
    { tipo: 'miolo', tema: 'amarelo', lado: 'esquerda', semTrilho: true, vars: { acento: '#5c1d00' }, titulo: 'Não vou te <span class="serifa">iludir</span> falando...' },
    { tipo: 'miolo', tema: 'branco', lado: 'direita', semTrilho: true, titulo: '“O design vai te trazer mais <span class="serifa">visibilidade</span>.”' },
    { tipo: 'miolo', tema: 'branco', lado: 'esquerda', semTrilho: true, titulo: 'Mas preciso <span class="serifa">falar que...</span>' },
    { tipo: 'miolo', tema: 'branco', lado: 'direita', semTrilho: true, titulo: 'Um designer é <span class="serifa">desnecessário!</span>' },
    { tipo: 'miolo', tema: 'preto', semTrilho: true, titulo: 'Nunca vou <span class="serifa">dizer que...</span>' },
    { tipo: 'miolo', tema: 'preto', semTrilho: true, titulo: 'O design é <span class="serifa">essencial</span> para todos os negócios.' },
    { tipo: 'miolo', tema: 'preto', semTrilho: true, titulo: 'Eu preciso <span class="serifa">ser sincero</span> com você!' },
    { tipo: 'miolo', tema: 'branco', semTrilho: true, titulo: 'Me <span class="serifa">perdoa...</span>' },
    {
      // O fim como o do original: o título grande, as duas linhas com a mesma largura, e o girassol saindo do quadro na
      // frente do "FRENTE!".
      tipo: 'capa', tema: 'branco', semRegua: true, cantos: { blur: 7, de: 0.6 },
      titulo: {
        pre: 'Antes de me cancelar, leia', preLado: 'centro', preEspaco: 10, script: '', condensada: 'DE TRÁS PARA', linha2: 'FRENTE!',
        tam: 150, y: 250, bloco: 640, vao: 4, folgaTopo: 0.12, cor: '#141210', cor2: '#8c8781',
        foco: { esq: 2, dir: 0, centro: [0.2, 0.95] },
      },
      fundoBlocos: [],
      assunto: { arq: `${B}plantas/flores/girassol-tres-quartos-grande.png`, x: -30, y: 525, w: 860, cru: true, brilho: false, sombra: false },
    },
  ],
};
// O quadro do último card, atrás do girassol: no panorama (dentro da janela), embaixo, cortado pela borda.
window.CARROSSEL.panorama.push({ arq: `${B}arte/quadros/quadro-moldura-dourada-noite-estrelada-grande.png`, x: C(10) + 120, y: 700, w: 840, luz: 0.98 });
