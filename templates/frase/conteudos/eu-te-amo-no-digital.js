// Série "em X:" (carrossel compartilhável): "eu te amo" traduzido para as línguas de quem trabalha no digital.
// Por que compartilha: cada slide é a cara de alguém (o designer, o freela, a social media) e vai para o par, o amigo
// ou o grupo. A última fecha pedindo o envio.

// O café em camadas (pedido do dono em 29/10/2026, depois do recorte redondo reprovado): a foto sobre fundo preto
// puro no modo tela (só a fumaça e a luz) e a xícara recortada por cima, alinhada à esquerda com o texto (x 92).
// caixa = onde a xícara está na foto (templates/frase/camadas.py, caixas.json). perto: a xícara encosta no texto de cada\n// card (40 px acima do rótulo); y é só o limite de cima, para não bater no cabeçalho.
const CAIXAS = {
  claude: [0.0977, 0.0884, 0.9204, 0.9165], cliente: [0.2383, 0.3198, 0.7627, 0.8452], 'coracao-a': [0.2017, 0.3423, 0.7803, 0.9175],
  designer: [0.1689, 0.1743, 0.855, 0.8364], freela: [0.1396, 0.2554, 0.8364, 0.9473], ia: [0.1968, 0.2837, 0.8179, 0.8638],
  instagram: [0.1904, 0.2764, 0.8071, 0.8784], manda: [0.1802, 0.3296, 0.8125, 0.9023], social: [0.2144, 0.248, 0.8037, 0.834],
};
const cafe = (nome, w, y) => ({ arq: `imagens/cafe/preto/${nome}-luz.jpg`, recorte: `imagens/cafe/preto/${nome}-xicara.png`, caixa: CAIXAS[nome], x: 92, y, w, perto: 40 });

window.FRASE = {
  titulo: 'Eu te amo em 7 línguas do digital',
  tema: 'preto',
  pos: 'baixo',
  // Série: o mesmo tamanho em todos os slides; as linhas foram quebradas para nenhuma passar de 12 letras.
  tamanho: 124,
  // O espaço vazio de cima ganhou um café visto de cima (pedido do dono em 29/10/2026): na capa, o coração na espuma;
  // em cada língua, o ícone dela desenhado na espuma. Geradas no site do Magnific (projeto "Agência Setup · Posts de
  // frase"), em templates/frase/imagens/cafe/. No fim, o notebook com a página do curso (mockup-curso.mjs).
  slides: [
    { texto: '*eu te amo,\nem 7 línguas\ndo digital.', tamanho: 150, imagem: cafe('coracao-a', 500, 175) },
    { rotulo: 'em Claude:', texto: 'seus tokens\nsemanais\nforam\nrenovados.', imagem: cafe('claude', 400, 130) },
    { rotulo: 'em designer:', texto: 'te mandei\no arquivo\naberto.', imagem: cafe('designer', 400, 130) },
    { rotulo: 'em cliente:', texto: 'pode seguir,\ntá aprovado.', imagem: cafe('cliente', 400, 130) },
    { rotulo: 'em Instagram:', texto: 'te mandei\num reels às\n3 da manhã.', imagem: cafe('instagram', 400, 130) },
    { rotulo: 'em freela:', texto: 'o pix caiu\nantes do\nprazo.', imagem: cafe('freela', 400, 130) },
    { rotulo: 'em IA:', texto: 'você tem\ntoda razão,\nvou refazer.', imagem: cafe('ia', 400, 130) },
    { rotulo: 'em social media:', texto: 'tira o fim\nde semana,\njá agendei\ntudo.', imagem: cafe('social', 400, 130) },
    { texto: 'manda pra\nquem fala a\nsua [língua].', tamanho: 150, imagem: cafe('manda', 500, 175) },
    // O card de oferta (regra do dono em 29/10/2026: todo post leva um card a mais que vende o mini curso), com o
    // notebook mostrando a página de venda.
    {
      tamanho: 100,
      texto: 'quer posts\nassim [todo dia]\nno seu perfil?',
      apoio: 'O Claude cria, você aprova e o post sai\nsozinho. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
      imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 135, w: 620, rot: -3 },
    },
  ],
  comenta: {
    palavra: 'POSTS', nome: 'Frase eu te amo no digital: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Em poucas aulas você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Chega de passar a noite fazendo post 🦎 No mini curso Posts automáticos com Claude você monta o sistema que cria os posts do seu perfil todo dia, e você só aprova. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'qual é a sua língua do amor? 💛\n\nmanda pro seu par de freela, pro cliente que aprova de primeira ou pra quem te manda reels de madrugada.\n\nE se você quer posts assim saindo todo dia no seu perfil, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #designer #socialmedia #claude',
};
