# Biblioteca de elementos

Recortes sem fundo para compor posts (carrossel, frase, capa), organizados por tema, para reaproveitar em vez de gerar de novo. Pedido do Filipe em 11/11/2026: "Crie uma pasta no projeto com elementos que você já baixou, organize de forma inteligente por tema... no futuro teremos uma quantidade absurda e não precisaremos ficar gerando."

**Este arquivo é gerado** por `node scripts/biblioteca.mjs indice` a partir do `indice.json`. Para mudar a descrição de um elemento, mude no `indice.json` e rode de novo. As imagens ficam só no computador (fora do Git: o repositório é público); este índice e o `indice.json` entram no Git.

## Como usar
- **Antes de gerar qualquer elemento, procure aqui** (por tema abaixo, ou pelas `tags` no `indice.json`). Abra a `folha.jpg` da pasta para ver todos de uma vez.
- No conteúdo do carrossel (`templates/carrossel/conteudos/`), o caminho é relativo a `templates/carrossel/imagens/`: `arq: '../../biblioteca/<arquivo>'`. Na travessia do carrossel infinito: `{ arq: '../../biblioteca/insetos/borboletas/...png', x, y, w, matiz, sat, luz, blur }`.
- **Ajuste a cor para a cena** (regra do Filipe, 11/11/2026: "Folha verde que tá numa cor completamente diferente do cenário, quebra tudo e deixa amador"): `matiz` (graus), `sat` e `luz` na travessia.
- **O foco segue a distância do assunto**: no plano do assunto, nítido; perto da lente, maior e desfocado; no fundo, menor e desfocado.
- Os elementos daqui foram feitos com **luz suave vindo de cima, à esquerda**. Quem gera um novo pede a mesma luz, para tudo combinar.

## Como acrescentar
1. Gere o elemento **sozinho**, nunca a cena inteira, em fundo liso cinza claro (o que é claro, como nuvem e fumaça, em fundo preto), com a luz de cima à esquerda e o elemento inteiro dentro do quadro (borda natural, sem corte). No Magnific, só o modelo que diz "Unlimited".
2. `node scripts/biblioteca.mjs adicionar <imagem> <tema/pasta> <nome> "<o que é>" --fonte "..." --tags a,b --dica "..."` (com `--luz` para nuvem e fumaça; com `--ja-recortado` se já for PNG sem fundo). O script tira o fundo no computador, corta justo, salva e refaz este índice.
3. Confira a folha da pasta: recorte com borda reta, fundo sobrando ou pedaço comido não fica.

## Temas que ainda não têm nada
Dinheiro (notas, moedas, maço), mosquitos e outros insetos voando, cobras, outros pássaros, ovos soltos, madeira em tábua, pedras, flores tropicais. Quando um post pedir, gere e acrescente aqui.

## Outros recortes do projeto (fora desta pasta)
- `templates/carrossel/imagens/bicho-*.png`: os bichos das capas (o quadro inteiro, com a transparência em volta).
- `templates/carrossel/imagens/elementos/`: as letras, a placa e o travessão de posts antigos.
- `templates/frase/imagens/`: os objetos dos posts de frase.

## O que tem (59 elementos)

### animais/abelhas (3)

Folha: `animais/abelhas/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `animais/abelhas/abelha-voando-2.png` | Abelha voando de lado, asas abertas, corpo listrado dourado e preto. | 802 x 661 | abelha, inseto, voando, van gogh, girassol | Em profundidades diferentes: perto da lente maior e desfocada, no plano do assunto nítida, no fundo pequena e desfocada. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id IfNyXfdtvE |
| `animais/abelhas/abelha-voando-3.png` | Abelha voando de lado, asas abertas, corpo listrado dourado e preto. | 850 x 699 | abelha, inseto, voando, van gogh, girassol | Em profundidades diferentes: perto da lente maior e desfocada, no plano do assunto nítida, no fundo pequena e desfocada. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id cpsrGcj0eP |
| `animais/abelhas/abelha-voando.png` | Abelha voando de lado, asas abertas, corpo listrado dourado e preto. | 804 x 647 | abelha, inseto, voando, van gogh, girassol | Em profundidades diferentes: perto da lente maior e desfocada, no plano do assunto nítida, no fundo pequena e desfocada. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id 9ZuaOzENYZ |

### animais/aves (1)

Folha: `animais/aves/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `animais/aves/tucano-toco-lado.png` | Tucano-toco de lado, olhando para a direita, bico laranja grande, sem o galho. | 1185 x 1140 | tucano, ave, passaro, selva, laranja | Sem apoio: os pés ficam fora do card ou em cima de um galho da biblioteca. | Magnific (capa do CORES, 05/11/2026) |

### animais/borboletas (3)

Folha: `animais/borboletas/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `animais/borboletas/borboleta-morpho-azul-de-cima.png` | Borboleta morpho azul de asas abertas vista de cima, simétrica. | 877 x 786 | borboleta, morpho, azul, inseto, floresta, voando | Azul elétrico: conversa com azul real e com cena verde. No plano do assunto, nítida e com sombra. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id UPtBjnhwny |
| `animais/borboletas/borboleta-morpho-azul-pousada.png` | Borboleta morpho azul de asas abertas em três quartos, como pousada. | 852 x 717 | borboleta, morpho, azul, inseto, floresta, voando | Azul elétrico: conversa com azul real e com cena verde. No plano do assunto, nítida e com sombra. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id s7BpkN1l8e |
| `animais/borboletas/borboleta-morpho-azul-tres-quartos.png` | Borboleta morpho azul de asas abertas, inclinada em três quartos (parece voando). | 902 x 740 | borboleta, morpho, azul, inseto, floresta, voando | Azul elétrico: conversa com azul real e com cena verde. No plano do assunto, nítida e com sombra. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id KLVWQ3Rkqp |

### animais/ninhos (3)

Folha: `animais/ninhos/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `animais/ninhos/ninho-ovos-tucano-2.png` | Ninho de gravetos, palha e musgo com três ovos creme pintados (ovos de tucano), visto de cima em três quartos. | 820 x 713 | ninho, ovos, tucano, passaro, floresta | Precisa estar apoiado: em cima de um galho ou cortado pela borda de baixo. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id TdgjnMnVNR |
| `animais/ninhos/ninho-ovos-tucano-3.png` | Ninho de gravetos, palha e musgo com três ovos creme pintados (ovos de tucano), visto de cima em três quartos. | 787 x 662 | ninho, ovos, tucano, passaro, floresta | Precisa estar apoiado: em cima de um galho ou cortado pela borda de baixo. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id w4moLxk7EI |
| `animais/ninhos/ninho-ovos-tucano.png` | Ninho de gravetos, palha e musgo com três ovos creme pintados (ovos de tucano), visto de cima em três quartos. | 833 x 684 | ninho, ovos, tucano, passaro, floresta | Precisa estar apoiado: em cima de um galho ou cortado pela borda de baixo. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id P3ChU7g42C |

### animais/vagalumes (6)

Folha: `animais/vagalumes/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `animais/vagalumes/vagalume-voando-de-cima-2.png` | Vagalume de verdade voando visto de cima em três quartos, asas transparentes abertas, a cauda acesa. | 810 x 698 | vagalume, inseto, luz, noite, floresta, voando | O vagalume que o dono quer é o inseto, não só o ponto de luz (referências: os posts do Anaconda e do Leonardo da Vinci). Junte um brilho quente na cauda ({ vagalume: true, cor: "quente" }) e varie a profundidade: nítido perto do texto, grande e desfocado perto da lente. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id eIJUbOedqL |
| `animais/vagalumes/vagalume-voando-de-cima-3.png` | Vagalume de verdade voando visto de cima em três quartos, asas transparentes abertas, a cauda acesa. | 722 x 678 | vagalume, inseto, luz, noite, floresta, voando | O vagalume que o dono quer é o inseto, não só o ponto de luz (referências: os posts do Anaconda e do Leonardo da Vinci). Junte um brilho quente na cauda ({ vagalume: true, cor: "quente" }) e varie a profundidade: nítido perto do texto, grande e desfocado perto da lente. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id ksM06BU16B |
| `animais/vagalumes/vagalume-voando-de-cima.png` | Vagalume de verdade voando visto de cima em três quartos, asas transparentes abertas, a cauda acesa. | 786 x 693 | vagalume, inseto, luz, noite, floresta, voando | O vagalume que o dono quer é o inseto, não só o ponto de luz (referências: os posts do Anaconda e do Leonardo da Vinci). Junte um brilho quente na cauda ({ vagalume: true, cor: "quente" }) e varie a profundidade: nítido perto do texto, grande e desfocado perto da lente. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id YMj1a17WeC |
| `animais/vagalumes/vagalume-voando-de-lado-2.png` | Vagalume de verdade voando de lado, asas abertas, corpo escuro com o escudo laranja e a cauda acesa (amarelo alaranjado). | 786 x 684 | vagalume, inseto, luz, noite, floresta, voando | O vagalume que o dono quer é o inseto, não só o ponto de luz (referências: os posts do Anaconda e do Leonardo da Vinci). Junte um brilho quente na cauda ({ vagalume: true, cor: "quente" }) e varie a profundidade: nítido perto do texto, grande e desfocado perto da lente. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id gO8XzzASXO |
| `animais/vagalumes/vagalume-voando-de-lado-3.png` | Vagalume de verdade voando de lado, asas abertas, corpo escuro com o escudo laranja e a cauda acesa (amarelo alaranjado). | 776 x 553 | vagalume, inseto, luz, noite, floresta, voando | O vagalume que o dono quer é o inseto, não só o ponto de luz (referências: os posts do Anaconda e do Leonardo da Vinci). Junte um brilho quente na cauda ({ vagalume: true, cor: "quente" }) e varie a profundidade: nítido perto do texto, grande e desfocado perto da lente. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id SyIBn0IUb8 |
| `animais/vagalumes/vagalume-voando-de-lado.png` | Vagalume de verdade voando de lado, asas abertas, corpo escuro com o escudo laranja e a cauda acesa (amarelo alaranjado). | 827 x 651 | vagalume, inseto, luz, noite, floresta, voando | O vagalume que o dono quer é o inseto, não só o ponto de luz (referências: os posts do Anaconda e do Leonardo da Vinci). Junte um brilho quente na cauda ({ vagalume: true, cor: "quente" }) e varie a profundidade: nítido perto do texto, grande e desfocado perto da lente. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id bx0Y4OG5Y2 |

### arte/quadros (3)

Folha: `arte/quadros/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `arte/quadros/quadro-moldura-dourada-noite-estrelada-2.png` | Moldura dourada antiga com uma pintura no estilo da Noite Estrelada (obra de domínio público), de frente. | 803 x 810 | quadro, moldura, dourado, pintura, van gogh, arte | Atrás do personagem, sutilmente desfocado (blur 3 a 5), como na capa do Van Gogh. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id LwXD11hswO |
| `arte/quadros/quadro-moldura-dourada-noite-estrelada-3.png` | Moldura dourada antiga com uma pintura no estilo da Noite Estrelada (obra de domínio público), de frente. | 832 x 728 | quadro, moldura, dourado, pintura, van gogh, arte | Atrás do personagem, sutilmente desfocado (blur 3 a 5), como na capa do Van Gogh. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id xSeVKFpjfW |
| `arte/quadros/quadro-moldura-dourada-noite-estrelada.png` | Moldura dourada antiga com uma pintura no estilo da Noite Estrelada (obra de domínio público), de frente. | 814 x 757 | quadro, moldura, dourado, pintura, van gogh, arte | Atrás do personagem, sutilmente desfocado (blur 3 a 5), como na capa do Van Gogh. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id 4REvJxP9Aa |

### ceu/nevoa (2)

Folha: `ceu/nevoa/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `ceu/nevoa/nevoa-de-baixo.png` | Névoa branca suave que sobe de baixo. | 1200 x 498 | nevoa, neblina, branco |  | templates/carrossel/imagens/elementos/ |
| `ceu/nevoa/nevoa-de-cima.png` | Névoa branca suave que desce de cima. | 1200 x 520 | nevoa, neblina, branco |  | templates/carrossel/imagens/elementos/ |

### ceu/nuvens (2)

Folha: `ceu/nuvens/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `ceu/nuvens/nuvem-fofa-2.png` | Nuvem branca fofa (cúmulo), com sombra suave; fundo transparente pelo claro. | 854 x 729 | nuvem, ceu, branco, van gogh | Fica bem sobre amarelo, céu ou preto; sobre o branco some. Desfocada quando está longe ou perto da lente. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id WDL1GCJcXe |
| `ceu/nuvens/nuvem-fofa.png` | Nuvem branca fofa (cúmulo), com sombra suave; fundo transparente pelo claro. | 849 x 664 | nuvem, ceu, branco, van gogh | Fica bem sobre amarelo, céu ou preto; sobre o branco some. Desfocada quando está longe ou perto da lente. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id Dowl0kXpcl |

### formas/gotas (14)

Folha: `formas/gotas/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `formas/gotas/gota-tinta-preta-1.png` | Gota de tinta preta brilhante, com reflexo (líquido espesso). | 128 x 148 | gota, tinta, preto, liquido |  | templates/carrossel/imagens/elementos/ |
| `formas/gotas/gota-tinta-preta-10.png` | Gota de tinta preta brilhante, com reflexo (líquido espesso). | 211 x 153 | gota, tinta, preto, liquido |  | templates/carrossel/imagens/elementos/ |
| `formas/gotas/gota-tinta-preta-11.png` | Gota de tinta preta brilhante, com reflexo (líquido espesso). | 141 x 145 | gota, tinta, preto, liquido |  | templates/carrossel/imagens/elementos/ |
| `formas/gotas/gota-tinta-preta-12.png` | Gota de tinta preta brilhante, com reflexo (líquido espesso). | 150 x 206 | gota, tinta, preto, liquido |  | templates/carrossel/imagens/elementos/ |
| `formas/gotas/gota-tinta-preta-13.png` | Gota de tinta preta brilhante, com reflexo (líquido espesso). | 156 x 142 | gota, tinta, preto, liquido |  | templates/carrossel/imagens/elementos/ |
| `formas/gotas/gota-tinta-preta-14.png` | Gota de tinta preta brilhante, com reflexo (líquido espesso). | 127 x 126 | gota, tinta, preto, liquido |  | templates/carrossel/imagens/elementos/ |
| `formas/gotas/gota-tinta-preta-2.png` | Gota de tinta preta brilhante, com reflexo (líquido espesso). | 122 x 121 | gota, tinta, preto, liquido |  | templates/carrossel/imagens/elementos/ |
| `formas/gotas/gota-tinta-preta-3.png` | Gota de tinta preta brilhante, com reflexo (líquido espesso). | 30 x 31 | gota, tinta, preto, liquido |  | templates/carrossel/imagens/elementos/ |
| `formas/gotas/gota-tinta-preta-4.png` | Gota de tinta preta brilhante, com reflexo (líquido espesso). | 180 x 186 | gota, tinta, preto, liquido |  | templates/carrossel/imagens/elementos/ |
| `formas/gotas/gota-tinta-preta-5.png` | Gota de tinta preta brilhante, com reflexo (líquido espesso). | 254 x 342 | gota, tinta, preto, liquido |  | templates/carrossel/imagens/elementos/ |
| `formas/gotas/gota-tinta-preta-6.png` | Gota de tinta preta brilhante, com reflexo (líquido espesso). | 144 x 139 | gota, tinta, preto, liquido |  | templates/carrossel/imagens/elementos/ |
| `formas/gotas/gota-tinta-preta-7.png` | Gota de tinta preta brilhante, com reflexo (líquido espesso). | 200 x 160 | gota, tinta, preto, liquido |  | templates/carrossel/imagens/elementos/ |
| `formas/gotas/gota-tinta-preta-8.png` | Gota de tinta preta brilhante, com reflexo (líquido espesso). | 175 x 177 | gota, tinta, preto, liquido |  | templates/carrossel/imagens/elementos/ |
| `formas/gotas/gota-tinta-preta-9.png` | Gota de tinta preta brilhante, com reflexo (líquido espesso). | 116 x 120 | gota, tinta, preto, liquido |  | templates/carrossel/imagens/elementos/ |

### formas/pinceladas (3)

Folha: `formas/pinceladas/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `formas/pinceladas/pincelada-rosa-coral-2.png` | Pincelada longa de tinta acrílica, do rosa ao coral, com a textura das cerdas, em S deitado. | 1334 x 376 | pincelada, tinta, rosa, coral, traco | Passa por dentro das janelas de cards pretos (panorama), como no carrossel do Van Gogh. É imagem: pode ser rosa; o título nunca. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id eIJUFhOdqL |
| `formas/pinceladas/pincelada-rosa-coral-3.png` | Pincelada longa de tinta acrílica, do rosa ao coral, com a textura das cerdas, em S deitado. | 1465 x 500 | pincelada, tinta, rosa, coral, traco | Passa por dentro das janelas de cards pretos (panorama), como no carrossel do Van Gogh. É imagem: pode ser rosa; o título nunca. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id nVxktVQYQD |
| `formas/pinceladas/pincelada-rosa-coral.png` | Pincelada longa de tinta acrílica, do rosa ao coral, com a textura das cerdas, em S deitado. | 1462 x 554 | pincelada, tinta, rosa, coral, traco | Passa por dentro das janelas de cards pretos (panorama), como no carrossel do Van Gogh. É imagem: pode ser rosa; o título nunca. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id tC641bqmZJ |

### madeira/galhos (3)

Folha: `madeira/galhos/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `madeira/galhos/galho-musgo-pontas-finas.png` | Galho retorcido com musgo e duas pontas finas de graveto; horizontal. | 1256 x 274 | galho, tronco, madeira, musgo, floresta, selva | Para um bicho pousar ou para atravessar a divisa entre cards. O que tem peso precisa de apoio: deixe uma ponta saindo pela borda do card. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id yifmgWaPW9 |
| `madeira/galhos/galho-musgo-reto.png` | Galho reto e mais fino, todo coberto de musgo; horizontal. | 1234 x 273 | galho, tronco, madeira, musgo, floresta, selva | Para um bicho pousar ou para atravessar a divisa entre cards. O que tem peso precisa de apoio: deixe uma ponta saindo pela borda do card. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id vQRNByAa47 |
| `madeira/galhos/galho-musgo-retorcido.png` | Galho grosso e retorcido coberto de musgo verde, com samambaias pequenas; horizontal, as duas pontas aparecem. | 1270 x 341 | galho, tronco, madeira, musgo, floresta, selva | Para um bicho pousar ou para atravessar a divisa entre cards. O que tem peso precisa de apoio: deixe uma ponta saindo pela borda do card. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id s7BpK2gl8e |

### personagens/esculturas (3)

Folha: `personagens/esculturas/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `personagens/esculturas/calango-marmore-terno-2.png` | Estátua de mármore branco de um lagarto (o Calango) de terno e gravata, do peito para cima, em três quartos olhando para a esquerda. | 652 x 934 | calango, estatua, marmore, terno, lagarto, museu | O Calango de mármore do carrossel do Van Gogh. Cortado pela borda de baixo (o peito some), para não flutuar. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id 6AFEMFliJO |
| `personagens/esculturas/calango-marmore-terno-3.png` | Estátua de mármore branco de um lagarto (o Calango) de terno e gravata, do peito para cima, em três quartos olhando para a esquerda. | 582 x 954 | calango, estatua, marmore, terno, lagarto, museu | O Calango de mármore do carrossel do Van Gogh. Cortado pela borda de baixo (o peito some), para não flutuar. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id iGHuDud3uK |
| `personagens/esculturas/calango-marmore-terno.png` | Estátua de mármore branco de um lagarto (o Calango) de terno e gravata, do peito para cima, em três quartos olhando para a esquerda. | 601 x 923 | calango, estatua, marmore, terno, lagarto, museu | O Calango de mármore do carrossel do Van Gogh. Cortado pela borda de baixo (o peito some), para não flutuar. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id P3CvcHc42C |

### personagens/historicos (3)

Folha: `personagens/historicos/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `personagens/historicos/van-gogh-3d-2.png` | Van Gogh em 3D, estilo filme de animação: chapéu de palha, barba ruiva, camisa azul e suspensório, da cintura para cima, olhar um pouco preocupado. | 653 x 1106 | van gogh, personagem, 3d, pintor, arte | Personagem histórico (domínio público). Na capa, na frente do quadro desfocado e atrás das abelhas. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id s7BpxMyl8e |
| `personagens/historicos/van-gogh-3d-3.png` | Van Gogh em 3D, estilo filme de animação: chapéu de palha, barba ruiva, camisa azul e suspensório, da cintura para cima, olhar um pouco preocupado. | 693 x 1092 | van gogh, personagem, 3d, pintor, arte | Personagem histórico (domínio público). Na capa, na frente do quadro desfocado e atrás das abelhas. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id s7BpxdIl8e |
| `personagens/historicos/van-gogh-3d.png` | Van Gogh em 3D, estilo filme de animação: chapéu de palha, barba ruiva, camisa azul e suspensório, da cintura para cima, olhar um pouco preocupado. | 763 x 1099 | van gogh, personagem, 3d, pintor, arte | Personagem histórico (domínio público). Na capa, na frente do quadro desfocado e atrás das abelhas. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id O6atwE0ynm |

### plantas/flores (3)

Folha: `plantas/flores/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `plantas/flores/girassol-caule-reto.png` | Girassol de frente, caule mais reto e duas folhas. | 781 x 922 | girassol, flor, amarelo, van gogh | O girassol do Van Gogh: pode atravessar a divisa entre dois cards. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id nVxKZSaYQD |
| `plantas/flores/girassol-de-frente.png` | Girassol de frente, com caule curvo e duas folhas. | 782 x 953 | girassol, flor, amarelo, van gogh | O girassol do Van Gogh: pode atravessar a divisa entre dois cards. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id ksMcHC816B |
| `plantas/flores/girassol-tres-quartos.png` | Girassol grande com caule curvo e duas folhas, em três quartos. | 675 x 923 | girassol, flor, amarelo, van gogh | O girassol do Van Gogh: pode atravessar a divisa entre dois cards. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id aFZ6IVmfSh |

### plantas/folhas (6)

Folha: `plantas/folhas/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `plantas/folhas/folha-filodendro-coracao-longa.png` | Folha de filodendro grande, coração alongado e brilhante, com o talo. | 776 x 787 | folha, filodendro, tropical, selva, verde | Na selva verde-água escura do tucano: matiz +15, sat 0,7, luz 0,8. Perto da lente: blur 6 a 10. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id YMjkRNFWeC |
| `plantas/folhas/folha-filodendro-coracao.png` | Folha de filodendro inteira em forma de coração, verde-escuro, com o talo. | 654 x 728 | folha, filodendro, tropical, selva, verde | Na selva verde-água escura do tucano: matiz +15, sat 0,7, luz 0,8. Perto da lente: blur 6 a 10. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id BhP7VTxoQR |
| `plantas/folhas/folha-filodendro-recortada.png` | Folha de filodendro partida (recortes nas bordas), verde-escuro, com o talo. | 786 x 816 | folha, filodendro, tropical, selva, verde | Na selva verde-água escura do tucano: matiz +15, sat 0,7, luz 0,8. Perto da lente: blur 6 a 10. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id 1lD0FqNr4r |
| `plantas/folhas/folha-monstera.png` | Folha de monstera (costela-de-adão) grande, verde vivo, de frente. | 1610 x 1728 | folha, monstera, tropical, selva, verde | Verde vivo: numa cena verde-água escura, matiz +20, sat 0,6, luz 0,75 (sem ajuste, quebra a cena). | templates/carrossel/imagens/folha.png |
| `plantas/folhas/folha-samambaia-arqueada.png` | Folha de samambaia arqueada, verde-água, pontas naturais. | 877 x 790 | folha, samambaia, selva, verde, floresta | Na selva verde-água escura do tucano: matiz +15, sat 0,7, luz 0,8. Perto da lente: blur 6 a 10. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id EbGRhRtuuO |
| `plantas/folhas/folha-samambaia-diagonal.png` | Folha de samambaia longa na diagonal, verde-água, pontas naturais. | 844 x 783 | folha, samambaia, selva, verde, floresta | Na selva verde-água escura do tucano: matiz +15, sat 0,7, luz 0,8. Perto da lente: blur 6 a 10. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id LwXDk0NswO |

### plantas/grama (1)

Folha: `plantas/grama/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `plantas/grama/grama-com-flores.png` | Tufo de grama verde com florzinhas brancas. | 2239 x 1536 | grama, campo, verde | A base é reta (cortada da foto): a borda de baixo precisa ficar fora do card. | templates/carrossel/imagens/elementos/ |
