# A arte em 5 etapas no Claude

O prompt que eu uso para o Claude fazer a arte de um carrossel por etapas, como se estivesse programando a arte. Primeiro o fundo, depois o título, o assunto e só no fim os efeitos. Sai bonito, sem cara de IA e sem abrir o Photoshop.

Feito pela Agência Setup (@agenciasetup).

## Por que por etapas

Quando você pede tudo num prompt só (fundo, texto, foto e efeito), a IA chuta o resto e chuta no clichê: preto, dourado, brilho em tudo e letra torta. Por etapas, cada decisão tem um motivo, e dá para mexer numa camada sem estragar as outras.

## O prompt

Cole no Claude (de preferência no Claude com o recurso de criar arquivos ligado) e troque o que está entre colchetes.

```
Você vai fazer a arte de um carrossel para o Instagram, em HTML e CSS, slide por slide, no tamanho 1080 x 1350.
O assunto é: [o tema do post, ex.: 3 erros que travam o seu perfil].
A marca: [nome, cores em hex, fontes, ex.: amarelo #FFBF1A e preto, Anton para títulos, Outfit para texto].
A foto principal: [descreva ou anexe a foto recortada, ex.: eu de camiseta preta, olhando para a câmera].

Monte a capa em camadas, uma etapa de cada vez, e me mostre o resultado de cada etapa antes de seguir:
Etapa 1, o fundo: uma cor lisa e decidida pela ideia do post (ex.: amarelo vivo, marrom escuro, quase preto, creme). Nada de cinza nem de degradê sem motivo.
Etapa 2, o título: a frase inteira, com a pontuação, num eixo só, com a palavra que carrega a ideia bem grande e as linhas de apoio alinhadas à borda dela.
Etapa 3, o assunto: a foto recortada no centro, passando na frente da palavra grande (é isso que dá profundidade), sem cobrir a leitura. E UM elemento que conte a ideia do post: a peça na mão, o arquivo onde o dedo aponta, a janela do app desfocada atrás.
Etapa 4, os efeitos: só onde fazem sentido. Desfoque no fim da palavra grande ou no que está mais perto da câmera. Nada de brilho colado em volta da pessoa nem de sombra projetada. Para cada efeito, me diga o motivo.
Etapa 5, a textura: um ruído leve e um meio-tom bem fraco, sem sujar a leitura.

Regras:
- Nada sem intenção: para cada coisa na arte, pergunte "isso conta o quê deste post?". Se a resposta for "enfeite" ou "ficou bonito", ela sai.
- Se a pessoa aponta, aponta para alguma coisa. Notificação de celular só entra se contar o post (ex.: o Instagram avisando que o post saiu sozinho), e não em todas as artes.
- Margem de 110 px nas bordas; nos slides de dentro, um assunto e uma prova por slide, centralizados.
- Sem símbolo gigante no fundo, sem textinho decorativo, sem flare solto.
- Depois da capa, faça os slides de dentro no mesmo estilo, alternando fundo claro e escuro, e a chamada final voltando à cor da capa.
No fim, me diga como exportar cada slide em JPEG.
```

## Dicas que fazem diferença

- Revise entre as etapas. Se a etapa 1 já não está bonita, nenhum efeito salva.
- Peça ajustes pequenos e diretos: "sobe o título 20 px", "tira o brilho do canto". Como cada camada é código, só aquilo muda.
- Foto recortada em fundo da cor da capa sai com o recorte mais limpo do que em fundo preto.
- Antes de postar, olhe a capa e conte os elementos: você, o título e um elemento da ideia. Se tiver mais, tire.

## Quer o passo a passo completo?

No mini curso **Posts automáticos com Claude** eu mostro do zero: o seu estilo, as etapas e a revisão de cada arte. Está em agenciasetup.com.br/cursos/posts-automaticos.
