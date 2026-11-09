// Pedido do dono (31/10/2026), no lugar do Figma Weave: "Como eu automatizei os posts no meu perfil". 9 slides.
// Tese: o sistema real da @agenciasetup, parte por parte. Tudo aqui existe: as tarefas das 8h e das 10h, o radar de
// 25 fontes (pautas de ver_em_alta em 31/10/2026), a base da voz (references/voz.md), as frases dele (references/licoes.md)
// e os números do Comenta X (ver_resultados, 30 dias, 31/10/2026). Capa com o rosto dele, porque a tese é dele, e o
// perfil de verdade atrás. Palavra: SISTEMA.
(() => {
  const IG = '../../_local/ig-perfil';
  window.CARROSSEL = {
    nome: 'como-automatizei-meu-perfil',
    marca: { perfil: '@agenciasetup', nome: 'Calango' },
    capas: [],
    palavra: 'SISTEMA',
    legenda: 'Comenta SISTEMA que eu te mando o mapa do meu sistema no direct! 🦎\nEu mostrei tudo: de onde vem a pauta, como o Claude aprendeu a falar como eu e por que nada vai pro ar sem o meu ok.\nNão é mágica. É um monte de correção minha virando regra.\nQual parte você queria tirar das suas costas primeiro? 👇\n.\n.\n#boracalango #claude #socialmedia',
    slides: [
      {
        tipo: 'capa', tema: 'preto', fundoLiso: '#141210',
        fundoBlocos: [{
          tipo: 'perfil', x: 540, y: 570, w: 430, rot: 4, blur: 1.4,
          avatar: `${IG}/avatar.jpg`, usuario: 'agenciasetup', nome: 'Calango | Agência Setup', posts: '1.488', seguidores: '128 mil', seguindo: '73',
          bio: '☕️ Fazemos tua empresa vender mais online<br>👀 Quer um diagnóstico? Responde aí 👇🏻', destaques: [],
          grade: [1, 2, 3, 4, 5, 6].map((n) => `${IG}/post-${n}.jpg`),
        }],
        titulo: {
          pre: 'como eu', preEspaco: 14,
          script: 'A', fonteScript: 'Great Vibes', scriptTam: 240, condensada: 'UTOMATIZEI', tam: 158, y: 250, encaixe: -0.18,
          foco: { esq: 3, dir: 2, centro: [0.25, 0.8] },
          pos: 'os <span class="serifa">posts</span> do meu perfil', posTam: 46,
        },
        assunto: { arq: 'filipe-v10-perfil.png', x: -50, y: 260, w: 1000, sombra: false, brilho: false }, // a mão aberta apresenta o perfil
        selo: { aponta: '.pos-titulo .serifa', ponto: [0.35, 0.9], pequeno: true },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'Calango,', vocativo: true,
        titulo: 'Hoje eu acordo com os posts no <span class="serifa">rascunho</span>.',
        texto: 'Eu montei um sistema com o Claude. O meu dia ficou assim:',
        prova: { tipo: 'notificacoes', itens: [{ icone: 'claude', app: 'Claude', quando: '8:00', texto: '2 posts de frase no rascunho' }, { icone: 'claude', app: 'Claude', quando: '10:00', texto: '1 carrossel no rascunho' }, { icone: 'logo', app: 'Eu', quando: 'quando der', texto: 'Aprovo ou peço ajuste' }] },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'parte 1 · a pauta',
        titulo: 'Ele lê <span class="serifa">25 fontes</span> de notícia pra mim.',
        texto: 'Só de IA e design. Cada assunto ganha uma nota de calor. Olha o que veio esta semana:',
        prova: { tipo: 'lista', itens: [{ calor: 64, t: 'CapCut ganha atalho de edição via ChatGPT', fonte: 'Estadão' }, { calor: 62, t: 'Figma Weave junta geração e edição de imagem', fonte: 'Figma' }] },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'parte 2 · a voz',
        titulo: 'Ele estudou como eu <span class="serifa">falo</span>.',
        texto: 'Antes de escrever, ele leu o que eu já postei.',
        prova: { tipo: 'numeros', tam: 190, semX: true, itens: [{ v: '150', t: 'carrosséis analisados' }, { v: '80', t: 'legendas lidas' }], pe: 'virou o meu guia de estilo' },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'parte 3 · a arte',
        titulo: 'Toda correção minha vira <span class="serifa">regra</span>.',
        texto: 'Ele monta a arte, eu corrijo. Reclamei? Vale pro próximo post.',
        prova: { tipo: 'exemplo', cor: '#f5f1ea', tinta: '#141311', legenda: 'frases minhas, do arquivo de regras dele', html: `<div style="font-family:Outfit;font-size:38px;line-height:1.5;text-align:left">${[['sombra é feio', 'texto sem sombra'], ['tem muita poluição', 'capa só com o essencial'], ['o flare não tem sentido', 'sem flare solto']].map(([a, b]) => `"${a}"<br><b style="font-weight:700;color:#d95f00">vira: ${b}</b>`).join('<div style="height:14px"></div>')}</div>` },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'parte 4 · a aprovação',
        titulo: 'Nada vai pro ar sem o meu <span class="serifa">ok</span>.',
        texto: 'É regra do sistema, sem exceção.',
        prova: { tipo: 'checklist', itens: ['Todo post nasce como rascunho', 'Eu aprovo ou peço ajuste', 'Só então ele entra na agenda'] },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'parte 5 · o direct',
        titulo: 'Quem comenta<br><span class="serifa">recebe</span> na hora.',
        texto: 'Comentou a palavra, o sistema responde e manda o material no direct.',
        prova: { tipo: 'numeros', tam: 190, semX: true, itens: [{ v: '230', t: 'directs enviados' }, { v: '157', t: 'cliques no material' }], pe: 'em 7 posts, nos últimos 30 dias' },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'pra você',
        titulo: 'Você não precisa do meu sistema <span class="serifa">inteiro</span>.',
        texto: 'No mini curso a gente monta estilo, pauta, texto e arte, no seu computador. O direct fica de fora.',
        prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'De 10 a 15 min por dia, depois de montado'], preco: 'R$ 39,90', pe: 'link na bio' },
      },
      {
        tipo: 'chamada', tema: 'preto', fundoLiso: '#141210',
        titulo: { pre: 'comenta', condensada: 'SISTEMA', centro: true, y: 265, tam: 280 },
        assunto: { foto: true, arq: 'filipe-v10-perfil.png', x: 72, y: 50, w: 1300, sombra: false, brilho: false },
        blocos: [{ tipo: 'nota', x: 190, y: 1115, w: 700, tam: 36, solido: true, fundo: '#141311', html: `e eu te mando no direct<br><span class="serifa" style="font-size:48px;color:#ff9a1f">o mapa do meu sistema</span>` }],
        selo: { aponta: '.palavra-chamada', pontoCentro: [0.86, 0.9], pequeno: true },
      },
    ],
  };
})();
