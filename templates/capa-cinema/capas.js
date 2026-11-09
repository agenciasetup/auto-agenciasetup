// As 5 capas refeitas (24/10/2026). foto: o arquivo em _local/capas-v2 (PNG 1856 x 2304) e a caixa dentro da janela
// (1000 x 1270): x, y e largura em px. titulo.y: o topo do bloco (linha de cima e palavra grande); folga: espaço a mais
// para acento. A cabeça só encosta na base da palavra grande; a linha de baixo (pos) fica ao lado da cabeça, sempre por
// cima, para nunca sumir. Sem selo: a capa fica limpa, como as capas que mais engajaram no perfil.
window.CAPAS = {
  'posts-no-automatico': {
    foto: { arq: 'professor', x: -60, y: 120, w: 1120 },
    atras: false, // a luminária fica entre o título e a cabeça: sem profundidade aqui
    sombraTopo: 0.45,
    titulo: { y: 100, folga: 26, pre: 'seus <span class="serifa">posts</span> no', grande: 'AUTOMÁTICO', tam: 200, cor: '#ffb000' },
    pos: { x: 100, y: 386, w: 800, alinha: 'center', html: 'e no seu <span class="serifa">estilo</span>' },
    notificacao: { y: 1110, quando: '7:00', texto: '3 pautas de hoje prontas, no seu estilo ✓' },
  },
  'arte-bonita-com-ia': {
    // Segunda foto (a primeira não era ele): o sorriso dele de verdade e o carrossel "criado no Claude" na mão.
    foto: { arq: 'arte2', x: 0, y: 80, w: 1000 },
    // O título desce um pouco para o cabelo passar na frente da base do "ARTE": é a profundidade que o carrossel
    // mostra sendo montada (etapas 2 e 3).
    sombraTopo: 0.2,
    titulo: { y: 128, pre: 'como fazer', grande: 'ARTE', tam: 250, cor: '#ffb000' },
    pos: { x: 50, y: 420, w: 420, alinha: 'left', html: 'bonita com <span class="serifa">IA</span>' },
    notificacao: { y: 1110, escura: true, texto: 'Arte pronta em 5 etapas. Revisa? ✓' },
  },
  'skill-social-media': {
    // Segunda foto (24/10/2026): a primeira tinha o rosto mais fino e o cabelo preto demais; esta saiu da foto de terno.
    foto: { arq: 'demon2', x: -356, y: -215, w: 1700 },
    sombraTopo: 0.25,
    // A lua fica bem atrás da cabeça: linha de baixo branca sobre ela não se lê. O "pra Social Media" sobe para a linha
    // de cima, no céu escuro.
    titulo: { y: 100, pre: 'pra <span class="serifa">Social Media</span>, essa é a melhor', grande: 'SKILL', tam: 250, cor: '#ffb000' },
    notificacao: { y: 1110, escura: true, quando: '7:00', texto: 'Seu conteúdo de hoje está pronto ✓' },
  },
  'vale-a-pena-claude': {
    foto: { arq: 'bone', x: -60, y: 70, w: 1120 },
    sombraTopo: 0.25,
    titulo: { y: 100, pre: 'vale a pena usar o', grande: 'CLAUDE', tam: 250, cor: '#ffb000' },
    pos: { x: 660, y: 396, w: 280, alinha: 'right', html: '<span class="serifa">depende.</span>' },
    notificacao: { y: 1110, escura: true, texto: 'Pesquisei, escrevi e fiz a arte. Revisa? ✓' },
  },
  'quatro-carrosseis-um-prompt': {
    foto: { arq: 'luffy', x: -330, y: -140, w: 1680 },
    sombraTopo: 0.5,
    titulo: { y: 100, pre: 'fiz 4 <span class="serifa">carrosséis</span> com um', grande: 'PROMPT', tam: 250, cor: '#ffb000' },
    // Céu claro: a linha de baixo vai escura, que é o que se lê sobre o azul.
    pos: { x: 60, y: 396, w: 300, alinha: 'left', cor: '#14213a', html: 'no <span class="serifa">Claude</span>' },
    notificacao: { y: 1110, quando: 'agora', texto: '4 carrosséis prontos, um prompt só ✓' },
  },

  // As chamadas (último card): a mesma foto da capa, mais perto, com "comenta PALAVRA" e o que vai no direct.
  'posts-no-automatico-chamada': {
    foto: { arq: 'professor', x: -200, y: 60, w: 1400 }, atras: false, sombraTopo: 0.5,
    titulo: { y: 110, pre: 'comenta', grande: 'PAUTA', tam: 270, cor: '#ffb000' },
    nota: { y: 1060, html: 'que eu te mando os <span class="serifa">2 prompts</span> no direct 🦎', sub: 'a pauta do dia + o que ensina o seu estilo' },
  },
  'arte-bonita-com-ia-chamada': {
    // A foto sobe para a notificação do pôster ficar inteira acima da nota (antes ela aparecia cortada atrás).
    foto: { arq: 'arte2', x: -90, y: -10, w: 1260 }, sombraTopo: 0.3,
    titulo: { y: 92, pre: 'comenta', grande: 'CAMADAS', tam: 228, cor: '#ffb000' },
    nota: { y: 1084, escura: true, html: 'que eu te mando o <span class="serifa">prompt das 5 etapas</span> 🦎', sub: 'no direct: o mesmo que eu usei nesse carrossel' },
  },
  'skill-social-media-chamada': {
    foto: { arq: 'demon2', x: -560, y: -300, w: 2000 }, sombraTopo: 0.3,
    titulo: { y: 110, pre: 'comenta', grande: 'SKILL', tam: 270, cor: '#ffb000' },
    nota: { y: 1060, escura: true, html: 'que eu te mando a <span class="serifa">skill</span> no direct 🦎', sub: 'é só instalar no Claude e responder 4 perguntas' },
  },
  'vale-a-pena-claude-chamada': {
    foto: { arq: 'bone', x: -200, y: 40, w: 1400 }, sombraTopo: 0.3,
    titulo: { y: 110, pre: 'comenta', grande: 'TEMPO', tam: 270, cor: '#ffb000' },
    nota: { y: 1060, escura: true, html: 'que eu te mando as <span class="serifa">10 tarefas</span> no direct 🦎', sub: 'pra passar pro Claude ainda essa semana' },
  },
  'quatro-carrosseis-um-prompt-chamada': {
    foto: { arq: 'luffy', x: -650, y: -270, w: 2100 }, sombraTopo: 0.5,
    titulo: { y: 110, pre: 'comenta', grande: 'PROMPT', tam: 270, cor: '#ffb000' },
    nota: { y: 1060, html: 'que eu te mando os <span class="serifa">4 prompts</span> no direct 🦎', sub: 'o da Setup, o do advogado, o elegante e o religioso' },
  },
};
