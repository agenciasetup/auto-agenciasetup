# Elegante

Tom quente, monograma dourado atrás da pessoa, nome em serifa itálica e etiqueta verde. Três slides: o anúncio com a sua foto (capa), a frase e o convite com a lista do que a pessoa ganha.

**A sua foto:** salve a foto recortada (PNG sem fundo, de frente, da cintura para cima) como `imagens/sua-foto.png`. Ela entra sozinha no lugar do espaço reservado. Para tirar o fundo, peça ao Claude ou use o recorte do seu editor de imagem.

## Pedido pronto

Arraste esta pasta no Claude e mande:

> Este é um modelo de carrossel em HTML (`elegante.html`, 3 slides de 1080 x 1350). Adapte para **[ex.: o lançamento da minha mentoria de confeitaria]**. Troque "Seu Nome", "Sua Marca", a letra do monograma e a etiqueta verde por **[seus dados]**, e as cores do `:root` por **[suas cores, se quiser]**. Minha foto está em `imagens/sua-foto.png`. Siga a regra das 5 etapas e exporte com `node exportar.mjs`.

## Exportar à mão

```
npm install puppeteer        (uma vez só)
node exportar.mjs            final em saida/01.png, 02.png, 03.png
```
