# Padrão Setup

O modelo de arte em camadas do curso (aulas 4.1 a 4.4), com dois conteúdos prontos:

- `modelo/conteudos/criado-no-claude.js`: "Esse carrossel foi criado no Claude" (7 slides);
- `modelo/conteudos/exemplo.js`: "Arte bonita é ORDEM, não efeito" (6 slides).

As cores e as fontes da marca ficam no começo do `modelo/modelo.css`. O `modelo/LEIA.md` explica as camadas e os tipos de slide.

## Pedido pronto

Arraste esta pasta no Claude e mande:

> Este é o meu modelo de carrossel em camadas. Adapte para o meu nicho: **[seu nicho, ex.: nutricionista para mulheres de 30 a 45 anos]**. Troque a marca para **[@seu perfil e nome]** e as cores para **[suas cores]**. Faça um carrossel novo, copiando `criado-no-claude.js`, sobre **[o assunto]**, com "Comenta **[PALAVRA]**" no fim. Siga a regra das 5 etapas: me mostre a etapa 1, depois a 3 e só então a final. Exporte com `node ferramentas/exportar.mjs <nome>`.

## Exportar à mão

```
npm install puppeteer                                   (uma vez só)
node ferramentas/exportar.mjs criado-no-claude --etapa 1
node ferramentas/exportar.mjs criado-no-claude          final em posts/criado-no-claude/arte/
```

Quer a sua foto na capa? Salve a foto recortada (PNG sem fundo) em `imagens/` e, no conteúdo, troque o `assunto` por `{ arq: 'sua-foto.png', x: -60, y: 190, w: 1140 }`.
