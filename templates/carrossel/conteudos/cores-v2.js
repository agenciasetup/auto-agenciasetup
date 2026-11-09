// Teste da direção nova (05/11/2026): a capa do carrossel CORES refeita com cor e contraste. Só a capa, para comparar
// com a original (cores.js, nota 18,1). O tucano novo (Magnific, opção 2) na selva escura verde-água, com o bico
// laranja vivo, dentro da moldura ("senti falta deles estarem emoldurados"). A cabeça passa um pouco por cima de
// "OMBOS"; as folhas desfocadas de baixo, da própria foto, ficam por cima da régua (`frente`, `dentro`).
// Título: "os melhores" à esquerda e "de cores" à direita (nada de tudo à direita).
window.CARROSSEL = {
  nome: 'cores-v2',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'CORES',
  slides: [
    {
      tipo: 'capa', tema: 'preto',
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
  ],
};
