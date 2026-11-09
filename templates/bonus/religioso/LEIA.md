# Religioso

Pintura escura no fundo, texto claro em Poppins, uma palavra em letra manuscrita, cabeçalho com o seu @ e rodapé numerado. Três slides: a pergunta (capa), o ensino com a citação num balão e o detalhe ampliado da pintura, e o convite para seguir. As pinturas em `imagens/` são exemplos feitos com IA.

## Pedido pronto

Arraste esta pasta no Claude e mande:

> Este é um modelo de carrossel em HTML (`religioso.html`, 3 slides de 1080 x 1350). Adapte para **[ex.: um post sobre a paciência, para o meu perfil de oração]**. Troque "@seuperfil" e "Seu Nome" pelos meus. Citação da Bíblia ou do Catecismo só literal, com o número certo. Se eu mandar outra pintura, ponha em `imagens/` e ajuste o escurecimento para o texto ficar legível. Siga a regra das 5 etapas e exporte com `node exportar.mjs`.

## Exportar à mão

```
npm install puppeteer        (uma vez só)
node exportar.mjs            final em saida/01.png, 02.png, 03.png
```
