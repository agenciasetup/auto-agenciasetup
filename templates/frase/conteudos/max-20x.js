// Frase do digital: a frase do Filipe, com os planos do Claude como medida de esforço e de preço.
// Por que compartilha: todo freela já entregou demais por pouco; quem usa Claude entende o Max 20x na hora.
// Regra do dono (29/10/2026): todo post leva um card a mais. Post de 1 frase: a frase, a mesma frase no tema
// invertido (preto) e o card de oferta do mini curso com o "Comenta POSTS".
window.FRASE = {
  titulo: 'Frase: Max 20x pra quem paga o Pro',
  pos: 'meio',
  slides: [
    { tema: 'branco', texto: 'não faça um\ntrabalho [Max 20x]\npra quem quer\npagar só o Pro.' },
    { tema: 'preto', texto: 'não faça um\ntrabalho [Max 20x]\npra quem quer\npagar só o Pro.' },
    {
      tema: 'preto', tamanho: 132,
      texto: 'quer posts\nassim [todo dia]\nno seu perfil?',
      apoio: 'O Claude cria, você aprova e o post sai\nsozinho. Mini curso por apenas R$ 39,90.',
      cta: { texto: 'Comenta', palavra: 'POSTS' },
    },
  ],
  // Quem comenta POSTS recebe o link da página do mini curso no direct (liga sozinho quando o post sai).
  comenta: {
    palavra: 'POSTS', nome: 'Frase Max 20x: POSTS (mini curso)', modo: 'direto',
    link: 'https://agenciasetup.com.br/cursos/posts-automaticos',
    variantes: [
      { id: 'a', nome: 'direto ao ponto', dm: 'Aqui está o mini curso Posts automáticos com Claude 🦎 Em poucas aulas você monta o sistema que cria os posts do seu perfil todo dia e só espera o seu ok. Tudo por R$ 39,90.', botao: 'Ver o mini curso 🦎', publico: ['Te mandei no direct 🦎', 'Mandei agora, confere o direct!', 'Tá no seu direct 🦎'] },
      { id: 'b', nome: 'pela dor', dm: 'Chega de passar a noite fazendo post 🦎 No mini curso Posts automáticos com Claude você monta o sistema que cria os posts do seu perfil todo dia, e você só aprova. São R$ 39,90.', botao: 'Quero o mini curso', publico: ['Corre no direct que mandei 🦎', 'Te mandei tudo no direct!', 'Olha o direct 🦎'] },
    ],
  },
  legenda: 'Calango, o seu esforço também tem plano. 🦎\n\nManda pra aquele amigo que entrega Max 20x e cobra como Free.\n\nE se você quer posts assim saindo todo dia no seu perfil, comenta POSTS que eu te mando o mini curso Posts automáticos com Claude, por apenas R$ 39,90.\n.\n.\n#boracalango #designer #socialmedia #freelancer',
};
