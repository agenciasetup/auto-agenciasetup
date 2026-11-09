// Pedido do dono (31/10/2026), no lugar do Figma Weave: "Como fazer posts automáticos com IA". 8 slides.
// Tese: post automático é o Claude fazendo o trabalho pesado todo dia e você só aprovando. Os horários e os 10 a 15 min
// vêm do kit do curso (Curso/kit/00-LEIA-PRIMEIRO.md e 10-rotina.md).
// Capa em amarelo: a preguiça com dois celulares (quem faz o trabalho não é ela). Palavra: ROTINA.
(() => {
  const CENA = { fundoFoto: { arq: 'preguica-cena.jpg', x: -10, y: 0, w: 1100 } };
  const BICHO = { arq: 'bicho-preguica.png', x: -10, y: 200, w: 1100, sombra: false, brilho: false, cru: true };
  window.CARROSSEL = {
    nome: 'posts-automaticos-ia',
    marca: { perfil: '@agenciasetup', nome: 'Calango' },
    capas: [],
    palavra: 'ROTINA',
    legenda: 'Comenta ROTINA que eu te mando os prompts pra montar a sua no direct! 🦎\nMuita gente acha que post automático é robô postando sozinho. Não é.\nÉ o Claude procurando o assunto, escrevendo e fazendo a arte. Você lê, aprova e posta.\nQuanto tempo você gasta hoje pra sair um post? 👇\n.\n.\n#boracalango #claude #socialmedia',
    slides: [
      {
        tipo: 'capa', tema: 'amarelo', ...CENA,
        titulo: { semSombra: true, pre: 'como fazer com IA', preEspaco: 14, preLado: 'centro', script: '', condensada: 'POSTS', tam: 190, linha2: 'Automáticos', fonte2: 'Great Vibes', tam2: 150, cor2: '#141311', foco2: { esq: 1, dir: 2, centro: [0.2, 0.8] }, bloco: 520, vao: -55, y: 255, cor: '#ffffff', foco: { esq: 3, dir: 4, centro: [0.28, 0.72], min: 0.6 } },
        assunto: BICHO,
        selo: { aponta: '.titulo-capa .progressivo .condensada', ponto: [0.98, 0.75], pequeno: true },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'Calango,', vocativo: true,
        titulo: 'Post automático não é <span class="serifa">robô</span> postando sozinho.',
        texto: 'É o Claude fazendo o trabalho pesado todo dia. Quem aprova e posta é você.',
        prova: { tipo: 'exemplo', cor: '#f5f1ea', tinta: '#141311', html: `<div style="text-align:center"><div style="font-family:'Instrument Serif';font-style:italic;font-size:120px;line-height:1;color:#d95f00">10 a 15 min</div><div style="font-family:Outfit;font-size:32px;margin-top:14px">por dia, depois de montado:<br>ler, aprovar e postar</div></div>` },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'passo 1',
        titulo: 'Primeiro, ele aprende o <span class="serifa">seu jeito</span>.',
        texto: 'Sem isso, sai aquele texto com cara de IA.',
        prova: { tipo: 'conversa', eu: 'Lê meus posts que mais engajaram e me entrevista. Quero que você escreva como eu.', ia: 'Bora. Primeiro, umas 13 perguntas, uma de cada vez. Depois eu leio o seu Instagram e gravo o seu estilo.' },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'passo 2',
        titulo: 'Depois, ele <span class="serifa">procura</span> o assunto do dia.',
        texto: 'Toda manhã, no seu nicho:',
        prova: { tipo: 'checklist', itens: ['Google Notícias e Google Trends', 'YouTube e Reddit', 'Os perfis que você admira'] },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'passo 3',
        titulo: 'E deixa <span class="serifa">pronto</span> pra você aprovar.',
        texto: 'Uma tarefa agendada pra cada parte do dia:',
        prova: { tipo: 'notificacoes', itens: [{ icone: 'claude', app: 'Claude', quando: '7:00', texto: 'Radar de hoje pronto' }, { icone: 'claude', app: 'Claude', quando: '8:00', texto: 'Post do dia esperando o seu ok' }, { icone: 'claude', app: 'Claude', quando: '13:00', texto: 'Arte pronta pra postar' }] },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'sem enrolação',
        titulo: 'Pra rodar, precisa de <span class="serifa">3 coisas</span>.',
        texto: 'Não precisa saber programar.',
        prova: { tipo: 'checklist', itens: ['Plano pago do Claude (Pro ou Max)', 'Computador ligado, app e Chrome abertos nos horários', 'Você, pra aprovar antes de postar'] },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'o passo a passo',
        titulo: 'Quer montar a sua rotina <span class="serifa">inteira</span>?',
        texto: 'No mini curso a gente monta juntos, do zero. Você arrasta o arquivo e responde as perguntas.',
        prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Pauta, texto e arte todo dia'], preco: 'R$ 39,90', pe: 'link na bio' },
      },
      {
        tipo: 'chamada', tema: 'amarelo', ...CENA,
        titulo: { pre: 'comenta', condensada: 'ROTINA', centro: true, y: 265, tam: 280, cor: '#ffffff' },
        assunto: { foto: true, ...BICHO },
        blocos: [{ tipo: 'nota', x: 190, y: 1115, w: 700, tam: 36, solido: true, fundo: '#141311', html: `<span style="color:#f5f1ea">e eu te mando no direct</span><br><span class="serifa" style="font-size:48px;color:#ff9a1f">os prompts da rotina</span>` }],
        selo: { aponta: '.palavra-chamada', pontoCentro: [0.86, 0.9], pequeno: true },
      },
    ],
  };
})();
