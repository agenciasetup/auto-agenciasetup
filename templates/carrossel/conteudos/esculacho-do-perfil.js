// Conteúdo: "Pedi pro Claude esculachar o meu Instagram" (25/10/2026). 9 slides.
// Tese: a trend do esculacho (pedir pra IA te zoar) com utilidade: o Claude esculacha o perfil com os números reais da
// @agenciasetup (tela Desempenho, 1.500 posts) e cada esculacho vira uma lição.
// Capa em quase preto: o Filipe rindo com a mão na testa (levou o esculacho e concorda), com o perfil de verdade atrás
// (mockup com os números e os posts da @agenciasetup; pedido dele em 26/10/2026, no lugar da janela do Claude).
// Números de 25/10/2026: engajamento = (curtidas + 3 comentários + 2 salvos + 2 compartilhamentos) ÷ alcance.
// Palavra: ESCULACHO (material: o prompt do esculacho).
const CARROSSEIS = '../../_local/carrossel';
const IG = '../../_local/ig-perfil'; // foto de perfil e miniaturas dos posts, baixadas do Instagram (fora do Git)
window.CARROSSEL = {
  nome: 'esculacho-do-perfil',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'ESCULACHO',
  legenda: 'Comenta ESCULACHO que eu te mando o prompt pra esculachar o seu perfil 🦎\nMandei os números do meu Instagram pro Claude e pedi sem dó. Doeu: 1.273 posts sem pedir comentário, Photoshop demais e post na hora errada.\nMas virou plano, e esse perfil já tá mudando.\nTem coragem de mandar o seu? 👇\n.\n.\n#boracalango #claude #instagram',
  slides: [
    // 1. Capa: ele rindo da própria cara (o esculacho doeu e ele concorda). Atrás, o perfil que levou o esculacho,
    // desfocado de leve. Sem notificação.
    {
      tipo: 'capa', tema: 'preto',
      fundoLiso: '#141210',
      fundoBlocos: [{
        tipo: 'perfil', x: 650, y: 575, w: 430, rot: 4, blur: 1.4,
        avatar: `${IG}/avatar.jpg`, usuario: 'agenciasetup', nome: 'Calango | Agência Setup', posts: '1.488', seguidores: '128 mil', seguindo: '73',
        bio: '☕️ Fazemos tua empresa vender mais online<br>👀 Quer um diagnóstico? Responde aí 👇🏻', destaques: ['FEEDBACKS', 'Comece por aqui'],
        grade: [1, 2, 3, 4, 5, 6].map((n) => `${IG}/post-${n}.jpg`),
      }],
      titulo: {
        pre: 'pedi pro <span class="serifa">Claude</span>', preEspaco: 14,
        script: 'E', fonteScript: 'Great Vibes', scriptTam: 250, condensada: 'SCULACHAR', tam: 168, y: 220, encaixe: -0.2,
        foco: { esq: 4, dir: 7, centro: [0.25, 0.8] },
        pos: 'o meu <span class="serifa">Instagram</span>', posTam: 48,
      },
      assunto: { arq: 'filipe-v8-esculacho.png', x: -142, y: 150, w: 1250, sombra: false, brilho: false },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.35, 0.9], pequeno: true },
    },

    // 2. O contexto: o pedido.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'Calango,', vocativo: true,
      titulo: 'Eu pedi <span class="serifa">sem dó</span>.',
      texto: 'Mandei os números do meu perfil pro Claude e falei: me esculacha.',
      prova: { tipo: 'conversa', eu: 'Esculacha meu Instagram. Sem dó.', ia: 'Bora. Você pediu. Achei 3 coisas, e a primeira dói.' },
    },

    // 3. Esculacho 1: post sem palavra.
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'esculacho 1',
      titulo: '1.273 posts sem<br>pedir <span class="serifa">nada</span>.',
      texto: 'Post com "Comenta PALAVRA" teve <b>21 vezes mais engajamento</b>. E eu deixei de pedir em 1.273.',
      prova: { tipo: 'numeros', tam: 150, itens: [{ v: '12,8', t: 'com "Comenta PALAVRA"' }, { v: '0,6', t: 'sem pedir nada', fraco: true }], pe: 'engajamento médio no meu perfil' },
    },

    // 4. Esculacho 2: o assunto errado.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'esculacho 2',
      titulo: '140 posts de Photoshop.<br>22 de <span class="serifa">prompt</span>.',
      texto: 'Adivinha qual rende mais? Prompt teve <b>17 vezes mais engajamento</b>.',
      prova: { tipo: 'numeros', tam: 150, itens: [{ v: '19,5', t: 'posts de prompt' }, { v: '1,1', t: 'posts de Photoshop', fraco: true }], pe: 'engajamento médio no meu perfil' },
    },

    // 5. Esculacho 3: a hora errada (849 posts à noite; a tarde rende mais).
    {
      tipo: 'miolo', tema: 'preto',
      rotulo: 'esculacho 3',
      titulo: '849 posts à <span class="serifa">noite</span>.',
      texto: 'Meu público tá na tarde: <b>38% mais engajamento</b> entre meio-dia e 18h.',
      prova: { tipo: 'numeros', tam: 150, itens: [{ v: '0,87', t: 'à tarde' }, { v: '0,63', t: 'à noite', fraco: true }], pe: 'engajamento médio no meu perfil' },
    },

    // 6. O conserto.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'o conserto',
      titulo: 'Doeu. Mas virou <span class="serifa">plano</span>.',
      prova: { tipo: 'checklist', itens: ['Todo post com uma palavra pra comentar', 'Mais IA e prompt, menos Photoshop', 'Postar à tarde, às 17h'] },
    },

    // 7. A prova de que mudou: a semana de 26 a 30/10.
    {
      tipo: 'miolo', tema: 'preto',
      titulo: 'Esse perfil já tá <span class="serifa">mudando</span>.',
      texto: 'Os posts desta semana saíram assim: à tarde, com palavra e com material.',
      prova: { tipo: 'galeria', itens: [`${CARROSSEIS}/vale-a-pena-claude/01.jpg`, `${CARROSSEIS}/posts-no-automatico/01.jpg`, `${CARROSSEIS}/skill-social-media/01.jpg`], legenda: 'a semana de 26 a 30/10' },
    },

    // 8. O mini curso.
    {
      tipo: 'miolo', tema: 'branco',
      rotulo: 'o sistema',
      titulo: 'O Claude não só aponta.<br>Ele <span class="serifa">faz</span>.',
      texto: 'No mini curso eu monto com você o Claude que acha o assunto, escreve e deixa pronto pra postar na hora certa.',
      prova: {
        tipo: 'oferta',
        imagem: 'curso-card.jpg',
        titulo: 'Posts automáticos com Claude',
        itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Pauta, texto e arte no automático'],
        preco: 'R$ 39,90', pe: 'link na bio',
      },
    },

    // 9. Chamada: fecha no quase preto da capa, com ele rindo mais perto.
    {
      tipo: 'chamada', tema: 'preto',
      fundoLiso: '#141210',
      titulo: { pre: 'comenta', condensada: 'ESCULACHO', x: 104, y: 230, tam: 205 },
      assunto: { foto: true, arq: 'filipe-v8-esculacho.png', x: -300, y: 130, w: 1500, sombra: false, brilho: false },
      blocos: [{
        tipo: 'nota', x: 110, y: 1060, w: 860, tam: 38, solido: true,
        html: 'que eu te mando o <span class="serifa" style="font-size:50px;color:#ff9a1f">prompt do esculacho</span> 🦎<div style="font-family:\'JetBrains Mono\',monospace;font-size:22px;opacity:.7;margin-top:10px">com os seus números, sem dó e sem ofensa</div>',
      }],
      selo: { aponta: '.palavra-chamada', ponto: [0.03, 0.97], pequeno: true },
    },
  ],
};
