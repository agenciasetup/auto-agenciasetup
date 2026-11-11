// Exemplo do carrossel infinito (11/11/2026, pedido do dono: uma tela larga de 3 x 1080 cortada em fatias, as molduras
// pretas ficam e os elementos passam por cima delas de um card para o outro, como no carrossel do Van Gogh com o girassol
// e as abelhas). Não é post para publicar: é a prova da técnica, em cima do CORES (o tucano na selva verde-água).
// Coordenadas da TELA LARGA: x de 0 a 3240; a divisa entre o card 1 e o 2 é x = 1080, entre o 2 e o 3, x = 2160.
window.CARROSSEL = {
  nome: 'infinito-cores',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'CORES',
  // A selva desfocada passa por dentro das três janelas, como uma paisagem vista por janelas lado a lado.
  panorama: { arq: 'selva-larga.jpg', luz: 0.85 },
  travessia: [
    // O tucano pousa na divisa do card 1 para o 2: o corpo no 1, o bico entrando no 2, por cima da moldura preta.
    { arq: 'tucano-v2-recorte.png', x: 520, y: 640, w: 840 },
    // Pétalas soltas no ar entre o 1 e o 2 (perto da lente, um pouco desfocadas).
    { arq: 'petalas-recorte.png', x: 1000, y: 190, w: 210, rot: -24, blur: 2 },
    // A folha de monstera entra pelo alto, atravessando do 2 para o 3, bem perto da lente.
    { arq: 'folha-recorte.png', x: 1860, y: -170, w: 640, rot: 158, blur: 11, acima: true },
    // As folhas da frente fecham embaixo, do 2 para o 3, desfocadas.
    { arq: 'tucano-v2-folhas-recorte.png', x: 1520, y: 1010, w: 1560, blur: 6, luz: 1.35, acima: true },
  ],
  slides: [
    {
      tipo: 'capa', tema: 'preto',
      titulo: {
        semSombra: true, preEspaco: 14, preLado: 'esquerda',
        pre: 'os melhores',
        script: 'C', fonteScript: 'Great Vibes', scriptTam: 236, scriptForte: 3, condensada: 'OMBOS', tam: 205, y: 225, encaixe: -0.03, dx: -30,
        pos: 'de <span class="serifa">cores</span>', posTam: 50, posEspaco: 0,
      },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.9, 0.7], pequeno: true },
    },
    { tipo: 'miolo', tema: 'preto', rotulo: '1 de 6', prova: { tipo: 'combo', a: { nome: 'Vinho', hex: '#3B0A1E' }, b: { nome: 'Mel', hex: '#F2C879' }, clima: 'Elegante · Misterioso' } },
    { tipo: 'miolo', tema: 'preto', rotulo: '2 de 6', prova: { tipo: 'combo', a: { nome: 'Azul real', hex: '#1238D6' }, b: { nome: 'Creme', hex: '#F6EFE0' }, clima: 'Clássico · Confiável' } },
  ],
};
