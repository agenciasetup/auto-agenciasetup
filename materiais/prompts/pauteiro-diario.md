# O pauteiro diário no Claude

Os 2 prompts que fazem o Claude acordar com a pauta do dia pronta, escrita do seu jeito. Um ensina o seu estilo (uma vez só). O outro acha as notícias e escreve os posts (todo dia).

Feito pela Agência Setup (@agenciasetup).

## Antes de começar

1. Crie um **Projeto** no Claude (ex.: "Meu conteúdo").
2. Use o Prompt 1 dentro do projeto e guarde o guia que ele escrever nos arquivos do projeto.
3. Use o Prompt 2 todo dia (ou agende, no fim deste material).

## Prompt 1: o seu guia de estilo (uma vez só)

Cole o prompt e, logo abaixo, de 10 a 20 posts seus que deram certo (legenda e o texto dos slides).

```
Você vai estudar o meu jeito de escrever para redes sociais e montar o meu guia de estilo.
Abaixo estão posts meus que deram certo. Leia todos e escreva o guia com:
1. Quem eu sou e para quem eu falo (nicho, público, o que eu vendo).
2. Como eu chamo o seguidor e como eu abro um post (com exemplos meus, copiados).
3. O tamanho das minhas frases, as palavras e as gírias que eu repito, os emojis que eu uso.
4. Como eu fecho um post (pergunta, chamada, "Comenta PALAVRA").
5. O que eu nunca diria (termos, tom, clichês).
6. Três posts meus que são a minha cara, e por quê.
Use só o que está nos posts. Não invente. No fim, me pergunte se ficou certo.

[cole aqui os seus posts]
```

Quando ele terminar, peça: "Guarda esse guia como 'meu-guia-de-estilo.md' para eu colocar no projeto." Coloque o arquivo nos arquivos do projeto.

## Prompt 2: a pauta do dia (todo dia)

```
Use o meu guia de estilo (arquivo meu-guia-de-estilo.md do projeto).
1. Procure na web as notícias e novidades dos últimos 3 dias sobre [o seu nicho, ex.: IA para social media e design].
2. Escolha as 3 com mais chance de engajar o meu público. Para cada uma: o título, a fonte (nome e link) e a data. Nada de notícia sem fonte.
3. Para cada pauta, escreva um post no meu estilo:
   - gancho da capa (uma frase que para o dedo);
   - roteiro do carrossel em 6 a 8 slides (capa, contexto, 3 a 5 pontos com uma prova cada, chamada);
   - legenda (primeira linha é o gancho, depois 2 a 4 linhas curtas, fecha com pergunta ou "Comenta PALAVRA").
4. Me entregue as 3, com a melhor primeiro, e pergunte qual eu aprovo.
Regras: frase curta, sem travessão, sem "no mundo de hoje", sem número inventado.
```

## Deixar no automático

No Claude, peça dentro do projeto: **"Todo dia às 7h, rode o Prompt 2 e me mande as pautas do dia."** De manhã é só abrir, escolher e ajustar uma palavra.

## Quer o sistema inteiro?

No mini curso **Posts automáticos com Claude** eu monto isso com você, do zero: a pauta, o texto no seu estilo e a arte do post. Está em agenciasetup.com.br/cursos/posts-automaticos.
