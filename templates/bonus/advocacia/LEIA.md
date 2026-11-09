# Advocacia

Escuro, vidro e verde-limão, no jeito do iPhone. Três slides: o problema num painel (capa), a regra explicada em blocos e o "Comenta PALAVRA" com o que a pessoa recebe. O exemplo é sobre voo atrasado (Resolução 400 da ANAC).

## Pedido pronto

Arraste esta pasta no Claude e mande:

> Este é um modelo de carrossel em HTML (`advocacia.html`, 3 slides de 1080 x 1350). Adapte para o meu nicho: **[ex.: advogada trabalhista em Curitiba]**. Troque "Sua Advocacia" e o § por **[sua marca]**, mantenha o visual e faça sobre **[o assunto, ex.: o que a empresa tem que pagar na demissão sem justa causa]**, com "Comenta **[PALAVRA]**" no fim. Lei, número e artigo só se forem reais e conferidos. Siga a regra das 5 etapas e exporte com `node exportar.mjs`.

## Exportar à mão

```
npm install puppeteer        (uma vez só)
node exportar.mjs --etapa 1  revisar o mínimo
node exportar.mjs            final em saida/01.png, 02.png, 03.png
```
