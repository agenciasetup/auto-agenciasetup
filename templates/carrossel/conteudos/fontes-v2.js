// Teste da direção nova (05/11/2026): a capa do carrossel FONTES refeita com cor, contraste e bicho com atitude. Só a
// capa, para comparar com a original (fontes.js, nota 14,7). Capivara de moletom amarelo e óculos, de baixo para cima
// contra o céu, segurando o "A" gigante de madeira bem na lente, dentro da moldura. O céu foi continuado para cima
// (`ferramentas/cena.py`, desce 310) para caber o título. O "A" e a pata (`ferramentas/frente.py`) vão na camada
// `frente`, por cima da régua e saindo da moldura embaixo: é o que encosta na lente. Título todo centralizado.
window.CARROSSEL = {
  nome: 'fontes-v2',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'FONTES',
  slides: [
    {
      tipo: 'capa', tema: 'preto',
      fundoFoto: { arq: 'capivara-fontes-cena.jpg', x: 30, y: 37, w: 1100 },
      titulo: {
        semSombra: true, preEspaco: 14, preLado: 'meio', posLado: 'meio',
        pre: 'as melhores',
        script: 'F', fonteScript: 'Great Vibes', scriptTam: 259, condensada: 'ONTES', tam: 225, y: 212, encaixe: -0.16, dx: -95,
        foco: { esq: 2, dir: 3, centro: [0.25, 0.8] },
        pos: 'pros seus <span class="serifa">posts</span>', posTam: 46,
      },
      assunto: { arq: 'capivara-fontes.png', x: 30, y: 347, w: 1100, sombra: false, brilho: false, cru: true },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.9, 0.7], pequeno: true },
      frente: [{ arq: 'capivara-fontes-letra.png', x: 30, y: 347, w: 1100 }],
    },
  ],
};
