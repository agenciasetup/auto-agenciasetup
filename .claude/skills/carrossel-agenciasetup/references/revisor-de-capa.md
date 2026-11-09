# O revisor

Quem monta a peça se acostuma com ela e deixa passar o óbvio. Em 30/10/2026 saiu um camaleão no ar sem galho, uma "fonte sem cara de IA" e um card de conversa que não dizia nada, e foi o Filipe quem viu ("cadê o revisor pra ver esses detalhes que não fazem sentido?", "cuidado com os conteúdos sempre"). Por isso **todo carrossel passa por um revisor separado antes de ser mostrado a ele**: a capa, os slides de dentro, a chamada e a legenda.

## Como rodar

- **No Claude Code:** chame o agente `revisor-de-capa` (`.claude/agents/revisor-de-capa.md`) com o caminho dos slides, a foto original, a tese do post, o que o dono já decidiu, os vizinhos da fila e, se houver, a pasta da versão no outro idioma. Não conte o que você achou: ele precisa olhar sem a sua opinião.
- **Sem agentes (app do Claude):** abra a peça de novo, finja que nunca a viu e responda à lista abaixo por escrito.
- Reprovou: conserte e rode de novo. No máximo 3 rodadas; depois mostre ao Filipe com as dúvidas.
- **O que o dono já decidiu vale mais que esta lista.** O revisor aponta o conflito, não desfaz a decisão.

## A lista (responda com o que você vê, não com sim ou não)

### 1. Conteúdo: faz sentido? (vale para todos os slides)

Leia a peça inteira em voz alta, como quem nunca viu.
1. Cada frase é verdade e faz sentido sozinha? "Não existe fonte com cara de IA": o termo tem que existir no mundo real. A frase da capa se lê de cima para baixo como uma frase só ("as melhores FONTES pra usar nos seus posts"). Junte as linhas e leia: "as melhores, sem cara de IA fontes" reprovou.
2. O título diz o assunto? "Hand / Written" sem "fonts" não dizia. A versão em cada idioma diz a mesma coisa.
3. Cada slide é a continuação do anterior? Uma lista de fontes que de repente vira "Calango, depois, arrasta para o Claude" não tem sentido, e na lista de fundos o "Deixa o fundo aparecer" com "POSTA LOGO" também não ("isso nem tem sentido, pode tirar do post"). Pergunte de cada slide: "por que isto está aqui, depois daquilo? O que a pessoa aprende que os outros não disseram?". Se a resposta é "porque o modelo tem esse slide", ele sai. Dica não é obrigatória: lista boa pode ir direto da última amostra para a oferta.
4. O "Calango," se lê junto com o título, como uma frase? ("Calango, use no máximo 2 fontes por arte.")
5. Conversa com o Claude só quando conversar é o assunto do post. Não enfie um chat inventado para vender o Claude. Prefira a dica aplicada num exemplo de verdade (`prova: 'exemplo'`).
6. A oferta diz o que o curso faz por quem está lendo este post? "O passo a passo" de quê?
7. Fale como o público fala: "ninguém fala à mão, dizemos manuscrito(a)". Nada de jargão nem de frase de IA.
8. A palavra do "Comenta" faz sentido com o material, e a legenda, a chamada, o material e a DM dizem a mesma coisa?
9. Texto escrito dentro da imagem está no idioma do post e faz sentido? (papel na mão, carta, tela)

### 1b. Peça em inglês: um americano diria assim?

"O inglês tá correto? Você tá entendendo contexto?" (30/10/2026). Eu estava traduzindo palavra por palavra. Leia como um americano que nunca viu o português:
- **Sem muleta de tradução:** nada de trocar "Calango," por "Real talk,". "Real talk" só antes de opinião direta, e não em todo post. Sem "Calango" no cabeçalho nem no selo: marca `{ perfil: '@setupagency_eng', nome: 'Setup Agency', selo: 'setup' }`.
- **Ordem das palavras:** "Handwritten FONTS", não "FONTS Handwritten". "Want Claude to make…", não "making". "a simple one", não "one simple". "I build with you the Claude that…" é português.
- **Falsos amigos e termos:** "material" vira "freebie"; "códigos" vira "hex codes"; "arte base" vira "rough layouts"; "E você, …?" sai; "100% feito lá" vira "the whole thing was made there"; "um eixo" não existe. Preço é "$19", não "US$19". Hífen no substantivo: "step-by-step".
- **Variáveis:** "The {titulo}" sai "The The prompt". Leia a mensagem com o título de verdade no lugar.
- **A palavra do "Comment"** diz alguma coisa sozinha? ("HAND" não dizia; "PEN" diz.)
- Sem um nativo por perto, avise o dono do risco e passe uma revisão só de inglês.

### 2. A imagem é bonita?

10. Dá vontade de parar o dedo? O Filipe reprovou: robô de disfarce e "riscos feios" ("imagem feia"), cenário "de capa de caderno", pôr do sol ("esse tom de fim de tarde não combina com o perfil"), flare ("parece câmera fotográfica"), amarelo mostarda e bege ("morto"), bicho sem graça (camaleão).
11. Ele aprovou: alpaca em grande angular, tucano com o bico para a câmera, cabra limpa no amarelo vivo, pinguim com a caneta na lente. Limpa, com muito detalhe, cor viva, luz clara.
12. Bicho chamativo: raposa, pinguim, girafa, panda-vermelho, panda, furão, gato, mico-leão-dourado, tucano, abelha, pavão, pomba, águia, elefante.
13. O assunto alterna com os vizinhos da fila (rosto, bicho, objeto; e a cor)? Dois brancos seguidos com a cabeça de frente repetem.
14. Foto nunca esticada nem expandida pelos lados ("odiei a forma que você expandiu"). Se falta lado, gere de novo em 4:5. Continuar céu ou fundo liso para cima, sem emenda visível, pode.
15. Nada estranho: dedo a mais, bicho sem apoio, rabo atravessando objeto, letra sem sentido. Tudo que tem peso está apoiado. Compare com a foto original: o recorte comeu alguma coisa?
15b. Rosto do Filipe na capa? Confira com `foto-do-filipe.md`: uma pinta na bochecha e uma marquinha na testa, um piercing só, óculos de aro fino, corpo forte, sem biquinho. Na dúvida, o rosto vai para ele decidir: você não é bom juiz do rosto dele.

### 3. Perspectiva e profundidade

16. Tem perspectiva de verdade, com distorção de câmera? ("Quero perspectiva, profundidade, distorção de câmera.") O que está perto da lente é enorme e o resto diminui.
17. O que está perto é maior e desfocado; o que está longe é menor. "Você desfocou o R, mas ele está menor que o P: a profundidade está errada."
18. O assunto passa um pouquinho por cima do título, sem tampar a leitura (no máximo uma letra e meia, nunca o começo)? Dá um charme.
19. A luz vem de um lugar só e parece uma cena, não um recorte colado?
20. Quantos planos existem? (`profundidade.md`) Nas capas com foto em perspectiva forte, a própria foto basta.

### 4. Poluição

21. Sobrou só título, assunto e selo? "Headline poluída, excesso de informação." Linha de apoio ou cartão só se dizem algo novo.
22. Nada voando sem motivo ("muito feio os elementos que você colocou voando"). Nada de cartão desalinhado ("muito menos da caixa de texto ali desalinhada"), frase grande colorida para tapar buraco ("feio pra cacete") ou mancha sem forma.
23. Selo em cima de nada importante: nem do rosto, nem do bico, nem da régua, nem da borda.

### 5. Título, fonte e tamanho

24. Título alinhado. Duas linhas formam um bloco com a mesma largura. Floreio tem que parecer intencional.
25. Quebra de linha só onde faz sentido: Back / grounds e Hand / written podem; Manu / scritas não.
26. Tamanho certo: nem miúdo ("tá pequena, pode ser maior") nem tomando a arte ("tá muito grande, dava pra diminuir"). Em tamanho de celular (300 px), lê-se em 1 segundo?
27. Longe da margem de cima: nunca colado no cabeçalho ("é feio").
28. **Sem sombra no texto** ("sombra é feio"), em todas as capas e chamadas.
29. Centralizado de verdade: floreio pesa pouco, então desloque o conjunto para ele (`dx`) para a palavra parecer no centro.
30. Fonte bonita, e a letra conta o assunto quando dá (manuscritas em letra de floreio). Caveat Brush foi "feio pra caralho".
31. Título no branco e no gelo: cinza, nunca preto; a segunda linha em degradê de #ffaa00 para laranja.

### 5b. A chamada (o último slide)

"Todas as CTAs estão feias, não sei por que não está no centro, seguindo a mesma ideia da headline da capa." A palavra fica grande e no centro, como o título da capa (`titulo: { pre, condensada, centro: true, y: 225, tam }`), com o "comenta" centralizado em cima e o assunto passando um pouquinho por cima. Palavra curta não pode ficar miúda: "PEN" pequeno foi "pequeno e feio".

### 6. Centralização vertical

32. Título e assunto, juntos, ocupam a janela e estão no meio dela? "Sinto um vazio embaixo", "embaixo tá vazio". Se sobrou espaço, suba o tamanho ou desça os dois juntos. Nunca tape o vazio com enfeite.

### 7. Desfoque e acabamento

33. Desfoque só em coisa reconhecível ("os efeitos de desfoque parecem sujeira"). Nas pontas do título ele é bem-vindo ("só colocar uns efeitos de desfoque nos títulos"), mas sem virar halo em fundo de cor viva.
34. Névoa macia, sem contorno, com fade quase branco atrás do título quando o fundo quebra a leitura. Nuvem desenhada por código é feia: nuvem de verdade vem da foto.
35. Nada de flare, brilho solto ou glow colado no assunto.
36. Finalização a 100%: ruído presente, meio-tom de pontos pequenos e poeirinhas poucas, em tamanhos diferentes, nunca sobre texto pequeno nem na margem preta. "Um pouco mais de texturinha, pra dar um charme." Em tamanho reduzido a textura some: amplie antes de julgar. Sujeira grande ou ponto escuro chamando atenção reprova.
37. Recorte a 100%: halo, franja da cor antiga, furo, serrilhado? Nada vazando para a margem preta sem querer.

### 8. Comparar (não julgue a peça sozinha)

38. **Com os gabaritos.** Abra `templates/carrossel/referencias/capas/gabarito-alpaca.jpg`, `gabarito-pinguim.jpg` e uma `aprovada-*` lado a lado com a capa (`python templates/carrossel/ferramentas/folha.py <pasta> <saida.jpg> 3`). Diga em uma frase o que a peça perde para elas. Se a resposta for "quase tudo", reprova.
39. **Com os vizinhos da fila.** Mesmo assunto ou mesma cor da peça de antes ou de depois? Aponte.
40. **Entre os idiomas.** Se existe a versão no outro idioma: a mesma ideia, o mesmo cuidado e cada título ajustado à própria palavra? Um alinhado e o outro não reprova.
41. **Em tamanho de feed.** Reduza a capa para 300 px e veja junto dos vizinhos: dá para ler e reconhecer?

### 9. Post de frase

Vale a lista acima no que couber, mais `references/imagens.md` da skill `frase-agenciasetup`. Frase verdadeira e no jeito do Filipe, lida em 2 segundos, enchendo a janela, sem vazio grande; na série, mesmo tamanho e mesma posição; no fim, o card de oferta com preço certo e palavra grande.

## A resposta

Só o que está errado, em ordem de importância, com slide, coordenada (1080 x 1350) e conserto. Separe o que é montagem do que exige foto nova. Diga o que viu só em tamanho reduzido. Termine com `APROVADA` ou `REPROVADA` e as notas de 0 a 10 de "conteúdo", "imagem", "profundidade", "limpeza" e "acabamento". Abaixo de 8 em qualquer uma, reprova.
