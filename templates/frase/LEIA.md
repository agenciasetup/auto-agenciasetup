# Modelo de post de frase (Instagram 4:5)

Post de frase da @agenciasetup, montado em código: cada slide é HTML e sai em JPEG 1080 × 1350 pelo Chrome. **O processo completo (ideias, filtros, formatos, rotina e entrega) está na skill `frase-agenciasetup`** (`.claude/skills/`, no painel em Claude > Skills e no conector com `ver_skill`).

```
node scripts/frase.mjs max-20x --etapa 1   # etapa 1: só a frase na janela
node scripts/frase.mjs max-20x --etapa 3   # etapa 3: com o rabisco (se tiver)
node scripts/frase.mjs max-20x             # a final, com a textura, e a prévia
node templates/frase/entregar.mjs max-20x  # sobe as imagens e cria a peça como RASCUNHO na fila
```

Sai em `_local/frase/<nome>/` (`01.jpg` ... e `previa.jpg` quando tem mais de um slide). Para ver no navegador: `templates/frase/modelo.html?c=<nome>&s=<n>&etapa=<1|3|5>`.

## O que é da agência e vai em todos

Pedido do Filipe em 29/10/2026 ("um pouquinho que tiver da agência já salva"):

- o fundo preto em volta e a janela de cantos redondos (40 px de margem, raio de 46 px), igual aos carrosséis;
- o cabeçalho "— @agenciasetup | **Calango** ×" em Outfit (no inglês, `marca: { perfil: '@setupagency_eng', nome: 'Setup Agency' }` no conteúdo);
- duas fontes: a frase em Inter Tight 800, em minúsculas, e o rótulo e a palavra de destaque em Instrument Serif itálica laranja;
- letra grande, enchendo a janela;
- na série, o trilho embaixo com o ponto laranja no slide atual;
- a textura na final: ruído de filme, meio-tom de pontos pequenos e poeirinhas fora do miolo (valores em `modelo.css`, poeira em `poeira()`, no `modelo.js`).

O creme foi reprovado ("fugiu muito do estilo da agência").

## Conteúdo

Copie um arquivo de `conteudos/` e troque:

```js
window.FRASE = {
  titulo: 'Nome na fila do painel',
  tema: 'branco',          // o fundo de dentro da janela: branco (névoa), preto ou foto
  pos: 'meio',             // meio, baixo ou cima
  tamanho: 124,            // série: o mesmo tamanho em todos os slides (teto; diminui só o que não cabe)
  foto: { arq: 'imagens/cafe.jpg', foco: 'center', veu: 1 },   // só no tema foto
  slides: [
    { rotulo: 'em Claude:', texto: 'seus tokens\nsemanais\nforam\nrenovados.' },
    { texto: 'não faça um\ntrabalho [Max 20x]\npra quem quer\npagar só o Pro.' },
    { texto: '*eu te amo,\n...', rabisco: { tipo: 'coracao', x: 770, y: 560, w: 120, rot: 12 } },
  ],
  legenda: 'A legenda, com o pedido de envio e #boracalango.',
};
```

- `\n` quebra a linha: a quebra é escolha de quem escreve. A frase enche a largura da janela (816 px) pela linha mais comprida, até o `tamanho`.
- `[palavra]` vai em serifa itálica laranja. O `*` no começo vira o asterisco laranja.
- `apoio`: uma linha menor, em Outfit, embaixo da frase (para a lista salvável e o card de oferta).
- `cta`: o botão laranja do card de oferta, `{ texto: 'Comenta', palavra: 'POSTS' }`.
- `imagem`: a foto do espaço vazio, atrás da frase, em coordenadas da janela. **Em camadas** (o café): `{ arq: '<nome>-luz.jpg', recorte: '<nome>-xicara.png', caixa, x: 92, y, w }`, a luz no modo tela e a xícara recortada por cima, saídas do `camadas.py` (o recorte redondo esfumado foi reprovado). Com `moldura: 'notebook'`, a tela entra num notebook (o mockup do curso, `imagens/curso-tela.jpg`, que sai de `node templates/frase/mockup-curso.mjs`). Pedido base e posições: `references/imagens.md` da skill.
- `comenta` (no conteúdo, fora dos slides): o Comenta X da peça, que o `entregar.mjs` manda junto. Modelo em `conteudos/max-20x.js`.

**Regra do card a mais (29/10/2026):** todo post leva o card de oferta do mini curso no fim. Post de 1 frase tem 3 cards: a frase, a mesma frase no tema invertido e a oferta. Detalhes na skill `frase-agenciasetup`.
- `rabisco`: em coordenadas da janela (1000 × 1270). Hoje só tem o `coracao`; rabisco novo entra em `RABISCOS` no `modelo.js`, sempre com motivo.
- Cada slide pode trocar `tema`, `pos`, `tamanho`, `alinha` (`esquerda` ou `centro`) e `foto`.
- Foto: em `imagens/`, com a fonte e a licença anotadas em `imagens/FONTES.md`. Sem rosto de pessoa real.
