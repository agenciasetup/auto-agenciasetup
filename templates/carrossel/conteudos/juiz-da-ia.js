// Pedido do dono (03/11/2026): o do juiz estava fraco; o assunto passa a ser "como eu faço a IA revisar meus conteúdos".
// Tudo é do nosso processo de verdade: o agente revisor-de-capa (references/revisor-de-capa.md), as capas aprovadas
// (templates/carrossel/referencias/capas/aprovada-*) e as lições (references/licoes.md). O "5 de 5" é a rodada de 31/10
// (o slide 6 mostra as capas finais, que ficam em _local/):
// o post do dado, a preguiça, o polvo, o mico e o "como eu automatizei" voltaram reprovados na primeira revisão.
// Capa: o panda-vermelho de juiz, com o martelo. Palavra: REVISOR.
const CAPAS = '../carrossel/referencias/capas';
window.CARROSSEL = {
  nome: 'juiz-da-ia',
  marca: { perfil: '@agenciasetup', nome: 'Calango' },
  capas: [],
  palavra: 'REVISOR',
  legenda: '',
  slides: [
    {
      tipo: 'capa', tema: 'preto',
      fundoFoto: { arq: 'panda-juiz-cena.jpg', x: 20, y: 35, w: 1040 },
      titulo: {
        semSombra: true, pre: 'como eu faço a <span class="serifa" style="color:#fff">IA</span>', preLado: 'centro', preEspaco: 14,
        script: 'R', fonteScript: 'Great Vibes', scriptTam: 250, condensada: 'EVISAR', tam: 200, y: 265, encaixe: -0.14,
        foco: { esq: 3, dir: 3, centro: [0.28, 0.72], min: 0.6 },
        pos: 'meus <span class="serifa" style="color:#fff">conteúdos</span>', posTam: 50,
      },
      assunto: { arq: 'bicho-panda-juiz.png', x: 20, y: 225, w: 1040, sombra: false, brilho: false, cru: true },
      selo: { aponta: '.pos-titulo .serifa', ponto: [0.5, 0.9], pequeno: true },
    },
    {
      tipo: 'miolo', tema: 'branco', rotulo: 'Calango,', vocativo: true,
      titulo: 'quem fez o post não pode <span class="serifa">revisar</span> o post.',
      texto: 'A IA defende o que acabou de fazer. Por isso eu uso um segundo Claude só pra revisar.',
      prova: {
        tipo: 'exemplo', cor: '#141311', tinta: '#f5f1ea', legenda: 'dois Claudes, duas funções',
        html: `<div style="display:flex;gap:26px;align-items:center;font-family:Outfit;text-align:left">${[['Claude 1', 'faz o post'], ['Claude 2', 'só revisa,<br>sem ter feito']].map(([a, b], k) => `<div style="background:${k ? '#ff9a1f' : 'rgba(255,255,255,.1)'};color:${k ? '#141311' : '#f5f1ea'};border-radius:22px;padding:30px 34px;width:300px"><div style="font-size:26px;opacity:.75">${a}</div><div style="font-size:40px;font-weight:700;line-height:1.15;margin-top:8px">${b}</div></div>`).join('<span style="font-size:44px;opacity:.6">→</span>')}</div>`,
      },
    },
    {
      tipo: 'miolo', tema: 'preto', rotulo: 'passo 1',
      titulo: 'Dê uma <span class="serifa">lista</span> pro revisor.',
      texto: 'Sem lista, ele dá opinião. Com lista, ele confere. A minha começa assim:',
      prova: { tipo: 'checklist', itens: ['O título se lê em 1 segundo?', 'Todo número tem fonte?', 'Soa como eu falo?', 'Nada cortado nem fora da margem?'] },
    },
    {
      tipo: 'miolo', tema: 'branco', rotulo: 'passo 2',
      titulo: 'Mostre o que você já <span class="serifa">aprovou</span>.',
      texto: 'Ele compara cada post novo com as capas que eu aprovei.',
      prova: { tipo: 'galeria', itens: [`${CAPAS}/aprovada-skill-dedo-no-arquivo.webp`, `${CAPAS}/aprovada-automatico-instagram.webp`, `${CAPAS}/aprovada-arte-peca-na-mao.webp`], legenda: 'capas que eu aprovei' },
    },
    {
      tipo: 'miolo', tema: 'preto', rotulo: 'passo 3',
      titulo: 'Ele <span class="serifa">reprova</span> com o motivo.',
      texto: 'Nada de "ficou bom". Ele diz onde está o erro e como consertar.',
      prova: {
        tipo: 'exemplo', cor: '#f5f1ea', tinta: '#141311', legenda: 'trechos de revisões desta semana',
        html: `<div style="font-family:Outfit;font-size:31px;line-height:1.35;text-align:left;width:720px">${[['Slide 2', 'o "e" de "chance" está cortado.', 'afaste um pouco as letras.'], ['Capa', 'tem roxo numa carta.', 'troque pelo azul da própria carta.'], ['Slide 2', 'esse número não tem fonte.', 'tire ou ponha a fonte.']].map(([a, b, c]) => `<div style="padding:12px 0;border-bottom:1px solid rgba(0,0,0,.12)"><b style="font-weight:700;color:#d95f00">${a}:</b> ${b}<br><span style="opacity:.65">Conserto: ${c}</span></div>`).join('')}</div>`,
      },
    },
    {
      tipo: 'miolo', tema: 'branco', rotulo: 'sem dó',
      titulo: 'Na última rodada, ele reprovou <span class="serifa">5 de 5</span>.',
      texto: 'Todos voltaram melhores. O roxo da carta, por exemplo, eu não tinha visto.',
      prova: {
        tipo: 'exemplo', cor: '#141311', tinta: '#f5f1ea', legenda: 'os 5 posts e o motivo da primeira reprovação',
        html: `<div style="display:flex;gap:14px;font-family:Outfit;text-align:center">${[['../../_local/frase/post-nao-postado/01.jpg', 'letra cortada'], ['../../_local/carrossel/posts-automaticos-ia/01.jpg', 'foto duplicada'], ['../../_local/carrossel/posts-dos-clientes/01.jpg', 'telas vazias'], ['../../_local/carrossel/arte-varios-estilos/01.jpg', 'roxo na carta'], ['../../_local/carrossel/como-automatizei-meu-perfil/01.jpg', 'mão solta']].map(([src, motivo]) => `<div style="width:142px"><img src="${src}" style="width:142px;height:178px;object-fit:cover;border-radius:12px;display:block"><div style="font-size:22px;line-height:1.2;margin-top:10px;color:#ff9a1f">${motivo}</div></div>`).join('')}</div>`,
      },
    },
    {
      tipo: 'miolo', tema: 'preto', rotulo: 'passo 4',
      titulo: 'Toda correção vira <span class="serifa">regra</span>.',
      texto: 'O que ele pega e eu concordo entra na lista. No próximo post, ele já confere.',
      prova: { tipo: 'codigo', arquivo: 'revisor / regras.md', linhas: ['# O que já foi reprovado', '- texto sem sombra', '- capa sem roxo', '- número sempre com fonte', '- foto sem esticar pelos lados'] },
    },
    {
      tipo: 'miolo', tema: 'branco', rotulo: 'no seu perfil',
      titulo: 'Quer que ele aprenda com <span class="serifa">você</span>?',
      texto: 'No mini curso, cada correção sua vira regra na sua skill de estilo, e o Claude passa a seguir.',
      prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Correção vira regra'], preco: 'R$ 39,90', pe: 'link na bio' },
    },
    {
      tipo: 'chamada', tema: 'preto',
      fundoFoto: { arq: 'panda-juiz-cena.jpg', x: 20, y: -10, w: 1040 },
      titulo: { pre: 'comenta', condensada: 'REVISOR', centro: true, y: 265, tam: 250 },
      assunto: { foto: true, arq: 'bicho-panda-juiz.png', x: 20, y: 180, w: 1040, sombra: false, brilho: false, cru: true },
      blocos: [{ tipo: 'nota', x: 110, y: 1206, w: 860, tam: 30, solido: true, fundo: '#141311', html: '<span style="color:#f5f1ea">e recebe no direct</span> <span class="serifa" style="font-size:42px;color:#ff9a1f">o prompt do revisor e a lista</span>' }],
      selo: { aponta: '.palavra-chamada', pontoCentro: [0.86, 0.62], pequeno: true },
    },
  ],
};
