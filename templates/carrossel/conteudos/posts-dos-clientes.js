// Pedido do dono (31/10/2026), no lugar do Figma Weave: "Como automatizar posts dos seus clientes no Claude". 9 slides.
// Tese: o mesmo método do curso, repetido numa pasta por cliente, sem misturar a voz de um com a de outro. As pastas e os
// nomes de clientes são exemplos, e o slide diz isso. O curso ensina no perfil da pessoa: o slide da oferta não promete
// aula de clientes. Horários separados: tarefa ao mesmo tempo pode ser pulada (Curso/kit/10-rotina.md).
// Capa em branco: o polvo com um celular em cada braço. A ênfase é "como automatizar", não "clientes" (pedido do dono). Palavra: CLIENTES.
(() => {
  const CENA = { fundoFoto: { arq: 'polvo-cena.jpg', x: 30, y: 30, w: 1020 } };
  const BICHO = { arq: 'bicho-polvo.png', x: 30, y: 215, w: 1020, sombra: false, brilho: false, cru: true };
  window.CARROSSEL = {
    nome: 'posts-dos-clientes',
    marca: { perfil: '@agenciasetup', nome: 'Calango' },
    capas: [],
    palavra: 'CLIENTES',
    legenda: 'Comenta CLIENTES que eu te mando o modelo da pasta de cliente no direct! 🦎\nMuita gente usa o mesmo prompt pra todo cliente e depois não entende por que tudo sai igual.\nO jeito é simples: uma pasta pra cada um, com o estilo dele, a pauta dele e a tarefa dele. E o cliente aprova antes de ir pro ar.\nQuantos clientes você atende hoje? 👇\n.\n.\n#boracalango #socialmedia #claude',
    slides: [
      {
        tipo: 'capa', tema: 'branco', ...CENA,
        titulo: { semSombra: true, pre: '', script: '', condensada: 'COMO', tam: 190, linha2: 'Automatizar', fonte2: 'Great Vibes', tam2: 150, cor2: 'linear-gradient(90deg,#ffaa00,#f06000)', foco2: { esq: 1, dir: 2, centro: [0.2, 0.8] }, bloco: 560, vao: -95, y: 195, cor: '#6b6864', foco: { esq: 2, dir: 3, centro: [0.26, 0.74] }, pos: 'os posts dos seus <span class="serifa">clientes</span> no Claude', posLado: 'centro', posTam: 44, posEspaco: -55 },
        assunto: BICHO,
        selo: { aponta: '.titulo-capa .progressivo .condensada', ponto: [0.98, 0.5], pequeno: true },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'Calango,', vocativo: true,
        titulo: 'Mesmo prompt pra todo cliente? Sai tudo <span class="serifa">igual</span>.',
        texto: 'A clínica não fala como a padaria. O Claude precisa saber quem é quem.',
        prova: { tipo: 'exemplo', cor: '#f5f1ea', tinta: '#141311', legenda: 'exemplo de como separar', html: `<div style="font-family:Outfit;font-size:40px;line-height:1.6;text-align:left">${[['Clínica', 'calma e explicativa'], ['Advogado', 'sério e direto'], ['Padaria', 'leve e que dá fome']].map(([a, b]) => `<b style="font-weight:700">${a}:</b> ${b}`).join('<br>')}</div>` },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'passo 1',
        titulo: 'Uma <span class="serifa">pasta</span> pra cada cliente.',
        texto: 'O Claude só trabalha na pasta aberta. Aí uma voz nunca entra na outra.',
        prova: { tipo: 'codigo', arquivo: 'Clientes / padaria', linhas: ['# O que fica na pasta', '- CLAUDE.md: as regras do cliente', '- estilo: como ele fala', '- radar: os assuntos do dia', '- posts: o que foi escrito', '- aprovados: o que ele aprovou'] },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'passo 2',
        titulo: 'Ensine o jeito dele <span class="serifa">uma vez</span>.',
        texto: 'O Claude lê os melhores posts do cliente e pergunta o que falta. Fica tudo guardado.',
        prova: { tipo: 'conversa', eu: 'Lê os posts que mais engajaram nesse perfil e me pergunta o que você precisa saber do cliente.', ia: 'Li. Ele fala direto e usa pouco emoji. Agora me diz: o que ele vende e o que ele não quer falar de jeito nenhum?' },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'passo 3',
        titulo: 'Uma tarefa por cliente, em <span class="serifa">horários</span> separados.',
        texto: 'Duas ao mesmo tempo podem ser puladas. Separe um pouco cada uma.',
        prova: { tipo: 'notificacoes', itens: [{ icone: 'claude', app: 'Clínica', quando: '7:00', texto: 'Post de hoje pra aprovar' }, { icone: 'claude', app: 'Advogado', quando: '7:40', texto: 'Post de hoje pra aprovar' }, { icone: 'claude', app: 'Padaria', quando: '8:20', texto: 'Post de hoje pra aprovar' }] },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'passo 4',
        titulo: 'O cliente <span class="serifa">aprova</span> antes de ir pro ar.',
        texto: 'É o nome dele que tá ali. Combina isso desde o começo:',
        prova: { tipo: 'checklist', itens: ['Você lê e ajusta primeiro', 'Manda o lote da semana pro cliente', 'Só posta o que ele aprovou'] },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'antes de vender isso',
        titulo: 'Fica ligado em <span class="serifa">3 cuidados</span>.',
        texto: 'Antes de oferecer pro cliente:',
        prova: { tipo: 'checklist', itens: ['Comece com um cliente só', 'A tarefa só roda com o computador ligado e gasta o limite do plano', 'Senha do cliente nunca vai pro Claude'] },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'por onde começar',
        titulo: 'Monta no <span class="serifa">seu</span> perfil primeiro.',
        texto: 'No mini curso você monta o sistema do zero. Funcionou? Aí repete a pasta pro cliente.',
        prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Estilo, pauta, texto e arte'], preco: 'R$ 39,90', pe: 'link na bio' },
      },
      {
        tipo: 'chamada', tema: 'branco', ...CENA,
        titulo: { pre: 'comenta', condensada: 'CLIENTES', centro: true, y: 265, tam: 250, cor: '#6b6864' },
        assunto: { foto: true, ...BICHO },
        blocos: [{ tipo: 'nota', x: 190, y: 1115, w: 700, tam: 36, solido: true, fundo: '#141311', html: `<span style="color:#f5f1ea">e eu te mando no direct</span><br><span class="serifa" style="font-size:48px;color:#ff9a1f">o modelo da pasta de cliente</span>` }],
        selo: { aponta: '.palavra-chamada', pontoCentro: [0.86, 0.9], pequeno: true },
      },
    ],
  };
})();
