// O carrossel do Van Gogh refeito no jeito infinito (11/11/2026). O original é de 26/04/2024 (3.372 curtidas, o
// gabarito do dono: "Esse com a imagem do Van Gogh, com as abelhas, o girassol no meio de dois cards... é lindo!").
// O texto é o dele, com o truque de ler de trás para frente: na ordem, "nunca contrate um designer"; de trás para
// frente, "o design é essencial para todos os negócios".
// Cada elemento foi gerado sozinho no Magnific e mora na biblioteca (templates/biblioteca/), como ele ensinou:
// "não gere a imagem INTEIRA. Gere cada camada dela."
// A capa, nas camadas que ele descreveu: 0 o fundo amarelo, 1 o quadro sutilmente desfocado, 2 a headline, 3 o Van
// Gogh, 4 a luz por cima, 5 a 7 as abelhas e as nuvens, com sombras e luzes entre elas.
// Coordenadas da tela larga: x de 0 a 10800 (10 cards); a divisa entre o card k e o k+1 é x = 1080 vezes k.
const B = '../../biblioteca/';
const C = (k) => (k - 1) * 1080; // onde começa o card k
const abelha = (n, x, y, w, extra = {}) => ({ arq: `${B}animais/abelhas/abelha-voando${n > 1 ? `-${n}` : ''}.png`, x, y, w, ...extra });
const nuvem = (n, x, y, w, extra = {}) => ({ arq: `${B}ceu/nuvens/nuvem-fofa${n > 1 ? `-${n}` : ''}.png`, x, y, w, sombra: false, ...extra });

window.CARROSSEL = {
  nome: 'vangogh-infinito',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: '',
  // Por dentro das janelas: o quadro atrás do Van Gogh (camada 1), as nuvens longe dos cards brancos e a pincelada que
  // atravessa os três cards pretos, passando por trás das molduras.
  panorama: [
    { arq: `${B}arte/quadros/quadro-moldura-dourada-noite-estrelada-2.png`, x: 450, y: 560, w: 640, blur: 4, luz: 0.95 },
    nuvem(1, C(3) + 560, 980, 560, { blur: 5, op: 0.9 }),
    nuvem(2, C(3) - 80, -140, 520, { blur: 7, op: 0.8 }),
    nuvem(2, C(9) + 520, 900, 620, { blur: 5, op: 0.9 }),
    nuvem(1, C(9) - 120, -60, 560, { blur: 8, op: 0.75 }),
    // A pincelada fina como no original: uma em cima e outra embaixo, deixando o meio para o texto.
    // Abelhas longe, por dentro das janelas (atrás da moldura): pequenas e desfocadas pela distância.
    abelha(2, 860, 330, 70, { z: -0.5 }),
    abelha(2, C(3) + 360, 230, 80, { z: -0.4 }),
    abelha(3, C(10) - 20, 540, 90, { z: -0.5 }),
    { arq: `${B}formas/pinceladas/pincelada-rosa-coral-2.png`, x: C(6) + 10, y: 40, w: 3220, h: 300, rot: -2 },
    { arq: `${B}formas/pinceladas/pincelada-rosa-coral-3.png`, x: C(6) + 10, y: 1010, w: 3220, h: 280, rot: 2, espelho: true },
  ],
  travessia: [
    // Camada 4: a luz por cima, quente, vindo do alto à esquerda da capa.
    { halo: true, x: 60, y: 40, d: 1100, cor: '#fff1c4', op: 0.32 },
    // Camadas 5 a 7 (cada uma na sua distância, o desfoque e a sombra saem dela): a abelha no plano do Van Gogh, uma
    // perto da lente saindo da capa para o card 2, e as nuvens perto da lente embaixo.
    abelha(1, 650, 545, 130, { rot: -8, z: 0 }),
    abelha(3, 820, -60, 300, { z: 0.75, acima: true, rot: 12 }),
    nuvem(1, -260, 1060, 780, { z: 0.6, acima: true }),
    nuvem(2, 840, 1140, 540, { z: 0.35 }),
    // O girassol no meio de dois cards (o que o dono ama): do 2 para o 3, no plano do foco, cortado pela borda de baixo.
    { arq: `${B}plantas/flores/girassol-de-frente.png`, x: C(3) - 330, y: 560, w: 680, z: 0 },
    abelha(1, C(3) - 40, 360, 110, { rot: 10, espelho: true, z: 0 }),
    // As abelhas seguem para o card 4, uma perto da lente.
    abelha(3, C(4) - 150, 80, 260, { z: 0.75, acima: true, espelho: true }),
    // O Calango de mármore de terno entre o 4 e o 5, no plano do foco, cortado pela borda de baixo.
    { arq: `${B}personagens/esculturas/calango-marmore-terno.png`, x: C(5) - 300, y: 470, w: 640, z: 0 },
    // A volta para o claro: abelhas no "Me perdoa..." e o girassol saindo do quadro no último card.
    abelha(1, C(9) + 200, 380, 120, { rot: -6, z: 0 }),
    abelha(2, C(9) + 820, 760, 260, { z: 0.75, acima: true }),
    { arq: `${B}arte/quadros/quadro-moldura-dourada-noite-estrelada-2.png`, x: C(10) + 560, y: 700, w: 520, z: 0 },
    { arq: `${B}plantas/flores/girassol-de-frente.png`, x: C(10) + 560, y: 420, w: 560, z: 0.08 },
  ],
  slides: [
    {
      tipo: 'capa', tema: 'amarelo',
      titulo: {
        pre: '', script: '', condensada: 'NUNCA', linha2: 'CONTRATE', tam: 170, y: 150, dx: -120, cor2: '#1d1305', foco: { esq: 0, dir: 3, centro: [0.1, 0.9] },
        pos: 'um <span class="serifa">designer</span>', posTam: 56, posLado: 'esquerda',
      },
      assunto: { arq: `${B}personagens/historicos/van-gogh-3d-3.png`, x: -10, y: 610, w: 730, brilho: false, cru: true, sombraX: 30, sombraY: 22 },
    },
    { tipo: 'miolo', tema: 'amarelo', lado: 'esquerda', semTrilho: true, titulo: 'Não vou te <span class="serifa">iludir</span> falando...' },
    { tipo: 'miolo', tema: 'branco', lado: 'direita', semTrilho: true, titulo: '“O design vai te trazer mais <span class="serifa">visibilidade</span>.”' },
    { tipo: 'miolo', tema: 'branco', lado: 'esquerda', semTrilho: true, titulo: 'Mas preciso <span class="serifa">falar que...</span>' },
    { tipo: 'miolo', tema: 'branco', lado: 'direita', semTrilho: true, titulo: 'Um designer é <span class="serifa">desnecessário!</span>' },
    { tipo: 'miolo', tema: 'preto', semTrilho: true, titulo: 'Nunca vou <span class="serifa">dizer que...</span>' },
    { tipo: 'miolo', tema: 'preto', semTrilho: true, titulo: 'O design é <span class="serifa">essencial</span> para todos os negócios.' },
    { tipo: 'miolo', tema: 'preto', semTrilho: true, titulo: 'Eu preciso <span class="serifa">ser sincero</span> com você!' },
    { tipo: 'miolo', tema: 'branco', semTrilho: true, titulo: 'Me <span class="serifa">perdoa...</span>' },
    { tipo: 'miolo', tema: 'branco', lado: 'esquerda', semTrilho: true, titulo: 'Antes de me cancelar, leia de trás <span class="serifa">para frente!</span>' },
  ],
};
