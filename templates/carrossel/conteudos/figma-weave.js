// Carrossel do Em alta de 30/10/2026: Figma Weave. Fontes: figma.com/blog/the-tldr-on-figma-weave e weave.figma.com/pricing.
(() => {
  const bloco = (t) => `<span style="display:inline-block;padding:12px 34px;border-radius:20px;background:rgba(255,255,255,.14);font-family:Outfit;font-weight:600;font-size:44px;white-space:nowrap">${t}</span>`;
  const desce = '<span style="font-family:Outfit;font-size:34px;line-height:1;opacity:.6">↓</span>';
  const img = (arq, h, legenda) => `<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><img src="imagens/weave-${arq}.jpg" style="height:${h}px;width:${Math.round(h * 0.8)}px;object-fit:cover;border-radius:18px;display:block"><span style="font-family:Outfit;font-weight:500;font-size:28px;line-height:1">${legenda}</span></div>`;
  const seta = '<svg width="70" height="150" viewBox="0 0 70 150" style="flex:none"><path d="M4 75C34 75 30 18 62 18M4 75C34 75 30 132 62 132" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity=".6"/></svg>';
  const BG = { fundoFoto: { arq: 'gato-weave-cena.jpg', x: -10, y: -70, w: 1100 } };
  const ASSUNTO = { arq: 'bicho-gato-weave.png', x: -10, y: 130, w: 1100, sombra: false, brilho: false, cru: true };
  window.CARROSSEL = {
    nome: 'figma-weave',
    marca: { perfil: '@agenciasetup', nome: 'Calango' },
    capas: [],
    palavra: 'FLUXO',
    legenda: 'Comenta FLUXO que eu te mando 3 fluxos passo a passo pro Figma Weave, com os prompts prontos, no direct! 🦎\nMuita gente refaz a mesma arte toda semana: recorta, põe no fundo, acerta a cor, corta pro feed.\nNo Weave esses passos ficam ligados num fluxo só. Você troca a foto e roda de novo.\nDá pra testar de graça, com 150 créditos por mês.\nQual arte você mais cansou de refazer? 👇\n.\n.\n#boracalango #figma #designer',
    slides: [
      {
        tipo: 'capa', tema: 'preto', ...BG,
        titulo: { semSombra: true, pre: 'troca a foto e sai a arte no', preLado: 'centro', preEspaco: 14, script: '', condensada: 'FIGMA', tam: 200, linha2: 'Weave', fonte2: 'Great Vibes', tam2: 160, cor2: 'linear-gradient(90deg,#ffc83d,#ff9a1f)', foco2: { esq: 1, dir: 2, centro: [0.2, 0.8] }, bloco: 540, vao: -85, y: 190, foco: { esq: 6, dir: 9, centro: [0.28, 0.7], min: 0.6 } },
        assunto: ASSUNTO,
        selo: { aponta: '.titulo-capa .progressivo .condensada', ponto: [0.98, 0.75], pequeno: true },
      },
      {
        tipo: 'miolo', tema: 'branco', rotulo: 'Calango,', vocativo: true,
        titulo: 'tem arte que você <span class="serifa">refaz</span> toda semana.',
        texto: 'No Figma Weave, cada passo vira um bloco ligado no próximo. O conjunto é o fluxo.',
        prova: { tipo: 'exemplo', cor: '#141311', tinta: '#f5f1ea', html: `<div style="display:flex;flex-direction:column;align-items:center;gap:8px">${[bloco('Foto do produto'), bloco('Troca o fundo'), bloco('Corta em 4:5')].join(desce)}</div>` },
      },
      {
        tipo: 'miolo', tema: 'preto',
        titulo: 'Troca a foto.<br>O <span class="serifa">fluxo</span> fica igual.',
        texto: 'Produto novo na semana que vem? Você muda só o primeiro bloco e roda de novo.',
        prova: { tipo: 'exemplo', cor: '#f5f1ea', tinta: '#141311', legenda: 'imagens de exemplo, geradas com IA', html: `<div style="display:flex;justify-content:center;gap:50px">${img('mochila', 290, 'semana 1')}${img('caneca', 290, 'semana 2')}</div>` },
      },
      {
        tipo: 'miolo', tema: 'branco',
        titulo: 'Testa dois caminhos sem perder o <span class="serifa">original</span>.',
        texto: 'Da mesma foto saem duas versões, e a original fica ali para comparar.',
        prova: { tipo: 'exemplo', cor: '#141311', tinta: '#f5f1ea', legenda: 'imagens de exemplo, geradas com IA', html: `<div style="display:flex;align-items:center;justify-content:center;gap:14px">${img('base', 200, 'original')}${seta}<div style="display:flex;gap:14px">${img('versao-amarelo', 290, 'versão 1')}${img('versao-azul', 290, 'versão 2')}</div></div>` },
      },
      {
        tipo: 'miolo', tema: 'preto',
        titulo: 'Ajuste fino não precisa <span class="serifa">gerar de novo</span>.',
        texto: 'Cor, luz e corte têm blocos próprios. Assim você não gasta crédito com outra imagem.',
        prova: { tipo: 'exemplo', cor: '#f5f1ea', tinta: '#141311', legenda: 'os nomes dos blocos no Weave', html: `<div style="font-family:Outfit;font-size:46px;line-height:1.45;text-align:left">${[['Color correction', 'cor'], ['Levels', 'luz'], ['Crop', 'corte']].map(([a, b]) => `<b style="font-weight:700">${a}:</b> ${b}`).join('<br>')}</div>` },
      },
      {
        tipo: 'miolo', tema: 'branco',
        titulo: 'E dá pra testar de <span class="serifa">graça</span>.',
        texto: 'Só com imagem: vídeo fica nos planos pagos.',
        prova: { tipo: 'exemplo', cor: '#141311', tinta: '#f5f1ea', legenda: 'plano Free, em weave.figma.com/pricing (30/10/2026)', html: `<div style="display:flex;justify-content:center;gap:90px;text-align:center">${[['150', 'créditos por mês'], ['5', 'fluxos']].map(([v, t]) => `<div><div style="font-family:'Instrument Serif';font-style:italic;font-size:150px;line-height:1;color:#ff9a1f">${v}</div><div style="font-family:Outfit;font-size:30px;margin-top:8px">${t}</div></div>`).join('')}</div>` },
      },
      {
        tipo: 'miolo', tema: 'preto', rotulo: 'próximo passo',
        titulo: 'Quer o Claude fazendo<br>a <span class="serifa">arte inteira</span>?',
        texto: 'No mini curso, ele aprende o seu estilo e monta cada post em camadas.',
        prova: { tipo: 'oferta', selo: 'mini curso', imagem: 'curso-card.jpg', titulo: 'Posts automáticos com Claude', itens: ['18 aulas curtas, do zero', 'Kit com os prompts e modelos', 'Arte em camadas, sem Photoshop'], preco: 'R$ 39,90', pe: 'link na bio' },
      },
      {
        tipo: 'chamada', tema: 'preto', ...BG,
        titulo: { pre: 'comenta', condensada: 'FLUXO', centro: true, y: 225, tam: 340 },
        assunto: { foto: true, ...ASSUNTO },
        blocos: [{ tipo: 'nota', x: 190, y: 1115, w: 700, tam: 36, solido: true, fundo: '#141311', html: `e eu te mando no direct<br><span class="serifa" style="font-size:48px;color:#ff9a1f">3 fluxos passo a passo</span>` }],
        selo: { aponta: '.palavra-chamada', pontoCentro: [0.86, 0.9], pequeno: true },
      },
    ],
  };
})();
