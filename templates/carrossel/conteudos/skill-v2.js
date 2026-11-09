// Teste da direção nova (05/11/2026): a capa do carrossel SKILL refeita com cor, contraste e bicho com atitude. Só a
// capa, para comparar com a original (skill-social-media.js, nota 23,3). Segunda versão, depois do dono: "ficou ruim
// porque desalinhou, ele precisava estar no centro; pode deixar SKILL bem maior, meio que por trás do shiba" e "senti
// falta deles estarem emoldurados". O shiba (Magnific, gerado centralizado, opção 2) no centro, dentro da moldura; o
// SKILL enorme atrás da cabeça; o cartucho e as patas (`ferramentas/frente.py`) por cima da régua e saindo da moldura
// embaixo. Título com "essa é a melhor" e "pra Social Media" à esquerda, não à direita.
window.CARROSSEL = {
  nome: 'skill-v2',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'SKILL',
  slides: [
    {
      tipo: 'capa', tema: 'preto',
      fundoFoto: { arq: 'shiba-skill-2-cena.jpg', x: 20, y: 37, w: 1040 },
      titulo: {
        // Correções do dono: o S cursivo do tamanho do KILL, desfoque nas duas pontas, "essa é a melhor" no centro.
        // O "pra Social Media" saiu do título: virou uma etiqueta de vidro no meio do moletom, com a setinha do selo.
        semSombra: true, preEspaco: 30, preLado: 'centro',
        pre: 'essa é a <span class="serifa">melhor</span>',
        script: 'S', fonteScript: 'Great Vibes', scriptTam: 430, condensada: 'KILL', tam: 380, y: 240, encaixe: -0.2, dx: -20,
        foco: { esq: 6, dir: 10, centro: [0.3, 0.72] },
      },
      assunto: { arq: 'shiba-skill-2.png', x: 20, y: 107, w: 1040, sombra: false, brilho: false, cru: true },
      // A etiqueta de vidro escuro no peito do moletom (entre os cordões), centralizada.
      blocos: [{
        tipo: 'nota', x: 335, y: 790, w: 410, tam: 40,
        fundo: 'linear-gradient(140deg, rgba(40, 22, 8, 0.42), rgba(40, 22, 8, 0.22))',
        html: '<div style="text-align:center;white-space:nowrap">pra <span class="serifa" style="font-size:50px">Social Media</span></div>',
      }],
      selo: { aponta: '.vidro', ponto: [0.97, 0.12], pequeno: true },
      frente: [{ arq: 'shiba-skill-2-cartucho.png', x: 20, y: 107, w: 1040 }],
    },
  ],
};
