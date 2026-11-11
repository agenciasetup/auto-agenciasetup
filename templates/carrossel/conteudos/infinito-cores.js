// Carrossel infinito do CORES, quarta versão (11/11/2026), com o mapa de profundidade. O dono, sobre a terceira:
// "tirando a poluição, essa é a ideia... mas exagerou na quantidade de coisas agora. Você precisa criar um mapa de
// profundidade pra entender... tem duas borboletas ali que estão em foco, parece que uma é gigante... o desfoque da
// borboleta grande entre o card 2 e 3 tá igual do tronco. Nesse tamanho, a borboleta estaria bem mais desfocada,
// considerando proporção... não teria uma sombra também embaixo dela? embaixo do tronco?"
// Cada elemento tem a distância `z` (-1 o fundo, 0 o plano dos cartões, 1 colado na lente); o desfoque e a sombra saem
// dela (templates/carrossel/modelo.js, comProfundidade). O exportador salva o mapa em profundidade.jpg.
// No plano do foco (z 0) só uma borboleta e um vagalume, nos tamanhos de verdade de um para o outro.
// Coordenadas da tela larga: x de 0 a 3240; a divisa entre o card 1 e o 2 é x = 1080, entre o 2 e o 3, x = 2160.
const B = '../../biblioteca/';
// Vagalume: o inseto e a luz quente na cauda (a cauda fica nesta fração do arquivo: de lado e de cima).
const CAUDA = { lado: [827, 651, 0.88, 0.71], cima: [786, 693, 0.84, 0.84] };
function vagalume(tipo, x, y, w, { z = 0, espelho = false, brilho = 1, acima = false } = {}) {
  const [lw, lh, fx, fy] = CAUDA[tipo];
  const h = (w * lh) / lw;
  return [
    { arq: `${B}animais/vagalumes/vagalume-voando-de-${tipo}.png`, x, y, w, z, espelho, acima, sombra: false },
    { vagalume: true, cor: 'quente', x: x + w * (espelho ? 1 - fx : fx), y: y + h * fy, r: Math.max(5, w * 0.055) * brilho, blur: z > 0 ? Math.round(30 * z * z + 6 * z) + 4 : 2, op: 0.95, acima },
  ];
}

window.CARROSSEL = {
  nome: 'infinito-cores',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'CORES',
  travessia: [
    // O tronco (z 0,35): sobe da borda de baixo do card 2 (a ponta de trás fica no vão preto, nunca embaixo da janela
    // da capa) e a ponta passa por cima do MEL, com a sombra caindo no card branco. O musgo com o matiz girado para o
    // verde-água da capa.
    { arq: `${B}madeira/galhos/galho-musgo-retorcido.png`, x: 1115, y: 1100, w: 930, rot: -22, z: 0.35, acima: true, sombra: true, matiz: 48, sat: 0.55, luz: 0.72 },
    // A samambaia (z 0,6): maior, mais perto que o tronco, embaixo no card preto.
    { arq: `${B}plantas/folhas/folha-samambaia-diagonal.png`, x: 2020, y: 1130, w: 980, rot: 12, z: 0.6, acima: true, matiz: 6, sat: 1.3, luz: 1 },
    // A morpho no plano dos cartões (z 0): nítida, por cima de tudo, do branco para o preto, com a sombra nos cartões.
    { arq: `${B}animais/borboletas/borboleta-morpho-azul-tres-quartos.png`, x: 2010, y: 500, w: 330, rot: -10, z: 0, acima: true, sombra: true },
    // A mesma borboleta, colada na lente (z 0,9): grande, muito desfocada, com a sombra grande e fraca no card. Mais clara e
    // um pouco transparente (o branco atrás vaza pela borda desfocada, como na lente; escura, a borda vira fumaça cinza) e
    // com a cor da nítida.
    { arq: `${B}animais/borboletas/borboleta-morpho-azul-de-cima.png`, x: 1860, y: -300, w: 900, rot: 24, z: 0.9, luz: 1.12, sat: 0.65, op: 0.86, acima: true, sombra: true },
    // Vagalumes de verdade, só no escuro: um nítido perto do AZUL REAL (no tamanho de verdade perto da morpho: uns 90 px
    // contra 330) e um perto da lente, embaixo do CREME, com a luz da cauda dentro do card.
    ...vagalume('lado', 2880, 230, 90, { espelho: true, brilho: 1.4 }),
    ...vagalume('lado', 2760, 1050, 320, { z: 0.75, acima: true, brilho: 1.2 }),
  ],
  slides: [
    {
      // A capa aprovada (cores-v2), sem mudar nada (a poeira sorteada como a dela). Nada atravessa a capa
      // (`semTravessia`): assim ela fica com a textura do tema dela, igual à aprovada.
      tipo: 'capa', tema: 'preto', poeiraDe: 'cores-v2', semTravessia: true,
      // A capa aprovada continua na Anton (feita antes da Calango Condensed, 11/11/2026).
      vars: { 'fonte-condensada': "'Anton', sans-serif", 'peso-condensada': 400 },
      fundoFoto: { arq: 'tucano-v2-cena.jpg', x: -60, y: -78, w: 1200 },
      titulo: {
        semSombra: true, preEspaco: 14, preLado: 'esquerda',
        pre: 'os melhores',
        script: 'C', fonteScript: 'Great Vibes', scriptTam: 236, scriptForte: 3, condensada: 'OMBOS', tam: 205, y: 225, encaixe: -0.03, dx: -30,
        foco: { esq: 4, dir: 10, centro: [0.25, 0.75] },
        pos: 'de <span class="serifa">cores</span>', posTam: 50, posEspaco: 0,
      },
      assunto: { arq: 'tucano-v2.png', x: -60, y: -78, w: 1200, sombra: false, brilho: false, cru: true },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.9, 0.7], pequeno: true },
      frente: [{ arq: 'tucano-v2-folhas.png', x: -60, y: -78, w: 1200, dentro: true }],
    },
    { tipo: 'miolo', tema: 'branco', rotulo: '1 de 6', semTrilho: true, semPoeira: [[300, 230, 480, 110]], prova: { tipo: 'combo', a: { nome: 'Vinho', hex: '#3B0A1E' }, b: { nome: 'Mel', hex: '#F2C879' }, clima: 'Elegante · Misterioso' } },
    { tipo: 'miolo', tema: 'preto', rotulo: '2 de 6', semTrilho: true, semPoeira: [[300, 230, 480, 110]], prova: { tipo: 'combo', a: { nome: 'Azul real', hex: '#1238D6' }, b: { nome: 'Creme', hex: '#F6EFE0' }, clima: 'Clássico · Confiável' } },
  ],
};
