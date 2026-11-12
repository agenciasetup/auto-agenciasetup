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
2. `node scripts/biblioteca.mjs adicionar <imagem> <tema/pasta> <nome> "<o que é>" --fonte "..." --tags a,b --dica "..."` (com `--volume` para nuvem de verdade em fundo preto, que guarda a sombra dela; com `--luz` para fumaça e brilho; com `--ja-recortado` se já for PNG sem fundo ou for para usar com `mistura: 'multiply'`, como o banco de nuvens em fundo branco). O script tira o fundo no computador, corta justo, salva e refaz este índice.
3. Confira a folha da pasta: recorte com borda reta, fundo sobrando ou pedaço comido não fica.

## Temas que ainda não têm nada
Dinheiro (notas, moedas, maço), mosquitos e outros insetos voando, cobras, outros pássaros, ovos soltos, madeira em tábua, pedras, flores tropicais. Quando um post pedir, gere e acrescente aqui.

## Outros recortes do projeto (fora desta pasta)
- `templates/carrossel/imagens/bicho-*.png`: os bichos das capas (o quadro inteiro, com a transparência em volta).
- `templates/carrossel/imagens/elementos/`: as letras, a placa e o travessão de posts antigos.
- `templates/frase/imagens/`: os objetos dos posts de frase.

## O que tem (109 elementos)

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

### arte/quadros (10)

Folha: `arte/quadros/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `arte/quadros/quadro-moldura-dourada-girassois.png` | Moldura dourada barroca com uma pintura no estilo dos Girassóis de Van Gogh (obra de domínio público), de frente. | 742 x 904 | quadro, moldura, dourado, van-gogh, girassol | Nos cards escuros, embaixo do texto, como os quadros do carrossel do Leonardo. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id N2QEavd6D9 |
| `arte/quadros/quadro-moldura-dourada-noite-estrelada-2.png` | Moldura dourada antiga com uma pintura no estilo da Noite Estrelada (obra de domínio público), de frente. | 803 x 810 | quadro, moldura, dourado, pintura, van gogh, arte | Atrás do personagem, sutilmente desfocado (blur 3 a 5), como na capa do Van Gogh. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id LwXD11hswO |
| `arte/quadros/quadro-moldura-dourada-noite-estrelada-3.png` | Moldura dourada antiga com uma pintura no estilo da Noite Estrelada (obra de domínio público), de frente. | 832 x 728 | quadro, moldura, dourado, pintura, van gogh, arte | Atrás do personagem, sutilmente desfocado (blur 3 a 5), como na capa do Van Gogh. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id xSeVKFpjfW |
| `arte/quadros/quadro-moldura-dourada-noite-estrelada-grande.png` | Moldura dourada com pintura no estilo da Noite Estrelada, ampliada em dobro (1606 px). | 1606 x 1620 | quadro, moldura, dourado, van-gogh, grande | Atrás do personagem, centralizado e sutilmente desfocado. | quadro-moldura-dourada-noite-estrelada-2.png ampliado 2x (Real-ESRGAN) em 11/11/2026 |
| `arte/quadros/quadro-moldura-dourada-noite-estrelada.png` | Moldura dourada antiga com uma pintura no estilo da Noite Estrelada (obra de domínio público), de frente. | 814 x 757 | quadro, moldura, dourado, pintura, van gogh, arte | Atrás do personagem, sutilmente desfocado (blur 3 a 5), como na capa do Van Gogh. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id 4REvJxP9Aa |
| `arte/quadros/quadro-moldura-dourada-terraco-cafe.png` | Moldura dourada barroca com uma pintura no estilo do Terraço do Café à Noite de Van Gogh (obra de domínio público), de frente. | 695 x 844 | quadro, moldura, dourado, van-gogh, noite | Nos cards escuros, embaixo do texto; a quina desfocada atravessa entre dois cards. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id YMjrKLsWeC |
| `arte/quadros/quadro-renascentista-designer-deitado-2.png` | Moldura dourada barroca deitada com a pintura renascentista do homem ao computador, variação com o homem maior e a torre do computador à mostra. | 958 x 684 | quadro, moldura, dourado, renascenca, pintura, designer, computador, humano, horizontal | Reserva do quadro deitado. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id UPttraJwny; recorte pelo fundo liso |
| `arte/quadros/quadro-renascentista-designer-deitado.png` | Moldura dourada barroca DEITADA (horizontal) com uma pintura no estilo renascentista: um homem de roupa da época à mesa, à esquerda, e no meio o computador com um programa de edição de imagem aberto (um retrato na tela); cortina vermelha e arcos com paisagem. | 1104 x 751 | quadro, moldura, dourado, renascenca, pintura, designer, computador, humano, horizontal | Quadro deitado da largura da headline, colado embaixo dela, com o conjunto centralizado na capa (pedido do dono). É fundo: desfocado e mais escuro; o assunto fica na frente. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id nVxxigFYQD; recorte pelo fundo liso (scripts/recortar-fundo-liso.mjs) |
| `arte/quadros/quadro-renascentista-designer-no-computador-2.png` | Moldura dourada barroca com uma pintura no estilo renascentista: um homem de barba, de gibão preto, de perfil à mesa, com o teclado e o monitor de lado; cortina vermelha e janela em arco. | 746 x 938 | quadro, moldura, dourado, renascenca, pintura, designer, computador, humano | Variação com o homem maior e o monitor de lado. Para os cards de dentro ou a chamada. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id cpssF6n0eP; recorte pelo fundo liso |
| `arte/quadros/quadro-renascentista-designer-no-computador.png` | Moldura dourada barroca com uma pintura no estilo renascentista: um homem de roupa da época sentado à mesa, trabalhando num computador com um programa de edição de imagem aberto (um retrato na tela); cortina vermelha e janela em arco com paisagem. | 701 x 866 | quadro, moldura, dourado, renascenca, pintura, designer, computador, humano | O humano que cria, em pintura clássica. No meio da capa, atrás das mãos (a de robô vindo de cima e a humana vindo de baixo), sutilmente desfocado. O recorte por modelo corta só o homem: recorte pelo fundo. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id ov44LTl829; recorte pelo fundo liso (scripts/recortar-fundo-liso.mjs) |

### ceu/nevoa (2)

Folha: `ceu/nevoa/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `ceu/nevoa/nevoa-de-baixo.png` | Névoa branca suave que sobe de baixo. | 1200 x 498 | nevoa, neblina, branco |  | templates/carrossel/imagens/elementos/ |
| `ceu/nevoa/nevoa-de-cima.png` | Névoa branca suave que desce de cima. | 1200 x 520 | nevoa, neblina, branco |  | templates/carrossel/imagens/elementos/ |

### ceu/nuvens (6)

Folha: `ceu/nuvens/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `ceu/nuvens/banco-de-nuvens-branco-2.png` | Banco de nuvens de verdade, largo, fotografado em FUNDO BRANCO (não tem transparência). | 1376 x 768 | nuvem, ceu, real, banco, multiply | Só em card claro, no panorama, com mistura: 'multiply'. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id XmyJdgCBfo |
| `ceu/nuvens/banco-de-nuvens-branco.png` | Banco de nuvens de verdade, largo, fotografado em FUNDO BRANCO (não tem transparência). | 1376 x 768 | nuvem, ceu, real, banco, multiply | Só em card claro, no panorama, com mistura: 'multiply': o branco some e o volume da nuvem funde no card. Como um chão de nuvens na base dos cards. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id LwXejM6swO |
| `ceu/nuvens/nuvem-fofa-2.png` | Nuvem branca fofa (cúmulo), com sombra suave; fundo transparente pelo claro. | 854 x 729 | nuvem, ceu, branco, van gogh | Fica bem sobre amarelo, céu ou preto; sobre o branco some. Desfocada quando está longe ou perto da lente. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id WDL1GCJcXe |
| `ceu/nuvens/nuvem-fofa.png` | Nuvem branca fofa (cúmulo), com sombra suave; fundo transparente pelo claro. | 849 x 664 | nuvem, ceu, branco, van gogh | Fica bem sobre amarelo, céu ou preto; sobre o branco some. Desfocada quando está longe ou perto da lente. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id Dowl0kXpcl |
| `ceu/nuvens/nuvem-real-quente-2.png` | Nuvem de verdade (cúmulo), com volume: topo claro em luz quente e sombra cinza embaixo; a borda some no ar. | 1231 x 640 | nuvem, ceu, real, volume, quente | Na frente das coisas (perto da lente, desfocada) ou sobre cor e preto. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id JNvm7vtOq4 |
| `ceu/nuvens/nuvem-real-quente.png` | Nuvem de verdade (cúmulo), com volume: topo claro em luz quente e sombra cinza embaixo; a borda some no ar. | 1179 x 602 | nuvem, ceu, real, volume, quente | Na frente das coisas (perto da lente, desfocada) ou sobre cor e preto. Tem volume: não chapar com luz nem sat 0. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id p87UDO3ehw |

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

### fundos/pinturas (1)

Folha: `fundos/pinturas/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `fundos/pinturas/fundo-laranja-noite-estrelada.png` | Fundo laranja vivo com textura de pintura (a Noite Estrelada em tons de laranja), 2160 x 1350, para dois cards. | 2160 x 1350 | fundo, laranja, pintura, van-gogh, textura | O laranja do Van Gogh original (#FAA004 no alto, #F57A06 embaixo). Panorama dos cards 1 e 2. | Feito no computador a partir do quadro da biblioteca em 11/11/2026 (scratchpad fundo-laranja.mjs) |

### madeira/galhos (3)

Folha: `madeira/galhos/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `madeira/galhos/galho-musgo-pontas-finas.png` | Galho retorcido com musgo e duas pontas finas de graveto; horizontal. | 1256 x 274 | galho, tronco, madeira, musgo, floresta, selva | Para um bicho pousar ou para atravessar a divisa entre cards. O que tem peso precisa de apoio: deixe uma ponta saindo pela borda do card. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id yifmgWaPW9 |
| `madeira/galhos/galho-musgo-reto.png` | Galho reto e mais fino, todo coberto de musgo; horizontal. | 1234 x 273 | galho, tronco, madeira, musgo, floresta, selva | Para um bicho pousar ou para atravessar a divisa entre cards. O que tem peso precisa de apoio: deixe uma ponta saindo pela borda do card. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id vQRNByAa47 |
| `madeira/galhos/galho-musgo-retorcido.png` | Galho grosso e retorcido coberto de musgo verde, com samambaias pequenas; horizontal, as duas pontas aparecem. | 1270 x 341 | galho, tronco, madeira, musgo, floresta, selva | Para um bicho pousar ou para atravessar a divisa entre cards. O que tem peso precisa de apoio: deixe uma ponta saindo pela borda do card. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id s7BpK2gl8e |

### objetos/janelas (7)

Folha: `objetos/janelas/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `objetos/janelas/janela-claude-pedido.png` | Caixa de pedido escura no jeito do Claude: 'Crie o post de hoje no meu estilo', com o botão laranja de enviar. | 1400 x 208 | claude, janela, popup, pedido, interface, ia, voando | Elemento do Claude voando; em card claro, a caixa escura aparece melhor. | Feita em código em 11/11/2026 (_local/janelas/janelas-claude.mjs), Calango Sans |
| `objetos/janelas/janela-claude-pensando.png` | Pílula clara no jeito do Claude, com a faísca laranja: 'Claude está pensando…'. | 910 x 148 | claude, janela, popup, interface, ia, voando | Elemento do Claude voando nos cards (a IA). Sutil: pequeno e inclinado; perto da lente, grande e desfocado. Sem sombra (está no ar). | Feita em código em 11/11/2026 (_local/janelas/janelas-claude.mjs), Calango Sans |
| `objetos/janelas/janela-claude-post-pronto.png` | Aviso claro no jeito do Claude: 'O post de hoje está pronto pra você revisar.' | 1120 x 364 | claude, janela, popup, aviso, interface, ia, voando | Elemento do Claude voando; combina com o card da oferta (o Claude cria, você revisa). | Feita em código em 11/11/2026 (_local/janelas/janelas-claude.mjs), Calango Sans |
| `objetos/janelas/vidro-claude-icone-claro.png` | Azulejo de vidro com a faísca laranja do Claude, para card claro (vidro leitoso com borda). | 440 x 440 | claude, vidro, interface, ia, composicao, desfocado | A versão para card branco. Grande, bem desfocado, no canto, dentro da janela (panorama). | Feito em código em 11/11/2026 (_local/janelas/vidro-claude.mjs) |
| `objetos/janelas/vidro-claude-icone-escuro.png` | Azulejo de vidro com a faísca laranja do Claude, para card escuro (vidro claro, borda de luz). | 440 x 440 | claude, vidro, interface, ia, composicao, desfocado | Só elemento de composição (pedido do dono): grande e BEM desfocado (blur 14 a 22), no canto do card, cortado pela borda. No panorama, para ficar dentro da janela. Nunca nítido, nunca pequeno, um por card. | Feito em código em 11/11/2026 (_local/janelas/vidro-claude.mjs) |
| `objetos/janelas/vidro-claude-painel-claro.png` | Painel de vidro com a faísca do Claude e duas barras (sem texto), para card claro. | 820 x 300 | claude, vidro, interface, ia, composicao, desfocado | A versão para card branco. Grande, bem desfocado, no canto, dentro da janela (panorama). | Feito em código em 11/11/2026 (_local/janelas/vidro-claude.mjs) |
| `objetos/janelas/vidro-claude-painel-escuro.png` | Painel de vidro com a faísca do Claude e duas barras (sem texto), para card escuro. | 820 x 300 | claude, vidro, interface, ia, composicao, desfocado | Como o azulejo de vidro: grande, bem desfocado, no canto, dentro da janela (panorama). | Feito em código em 11/11/2026 (_local/janelas/vidro-claude.mjs) |

### objetos/robos (9)

Folha: `objetos/robos/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `objetos/robos/mao-de-robo-apontando-criacao-longa.png` | A mão de robô apontando (pose da Criação de Adão) com o braço esticado até bem além do corte, para sair pela borda do card vizinho. | 1307 x 1441 | robo, mao, ia, branco, criacao-de-adao, apontando, braco-longo | Use esta quando o braço atravessa a divisa: o corte reto do recorte não pode aparecer em card nenhum (o dono: 'o restante do braço morreu ali. Precisa chegar até o final'). A ponta do indicador fica em (0,0015; 0,939) da imagem. | mao-de-robo-apontando-criacao esticada em leque a partir do vértice (115, 678) com scripts/esticar-recorte.mjs em 11/11/2026 |
| `objetos/robos/mao-de-robo-apontando-criacao.png` | Mão e antebraço de robô branco descendo do alto à direita, o indicador estendido para baixo à esquerda, na pose da mão de Deus na Criação de Adão; fio de luz dourada. | 787 x 921 | robo, mao, ia, branco, criacao-de-adao, apontando | A IA na releitura da Criação de Adão: vem de cima, pode passar um pouco por cima da headline; a ponta do dedo quase encosta na da mão humana. O braço sai pelo alto: o corte reto fica fora do slide. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id ksMMZ5616B |
| `objetos/robos/mao-de-robo-branca-descendo-2.png` | Mão e antebraço de robô branco com juntas à mostra, descendo do alto à direita, dedos abertos. | 826 x 987 | robo, mao, ia, branco | Variação da mão de robô, mais mecânica. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id P3CCRaD42C |
| `objetos/robos/mao-de-robo-branca-descendo-grande.png` | A mão de robô branca descendo, ampliada em dobro (1534 px). | 1534 x 2030 | robo, mao, ia, grande | Atravessa a divisa vindo do alto à direita. | mao-de-robo-branca-descendo ampliada 2x (Real-ESRGAN) em 11/11/2026 |
| `objetos/robos/mao-de-robo-branca-descendo.png` | Mão e antebraço de robô branco descendo do alto à direita, dedos abertos para pegar algo embaixo, com fio de luz dourada. | 767 x 1015 | robo, mao, ia, branco | A IA vindo pegar. O braço sai pelo canto de cima à direita: o corte reto fica fora do slide. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id mEiiu66hJQ |
| `objetos/robos/peca-casca-branca.png` | Fragmento curvo de casca branca de robô, com filete dourado. | 398 x 734 | robo, peca, casca, branco, ia, voando | Peça voando; some no card branco, use nos pretos. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id lJoocWIgv9 (folha de 4 peças, separada e ampliada 2x) |
| `objetos/robos/peca-dedo-de-robo.png` | Segmento de dedo de robô branco com junta escura, solto, inclinado; fio de luz dourada. | 544 x 757 | robo, peca, dedo, ia, voando | Peça de robô voando nos cards (a IA). Sutil: pequena e nítida, ou grande e desfocada perto da lente. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id lJoocWIgv9 (folha de 4 peças, separada e ampliada 2x) |
| `objetos/robos/peca-engrenagem-latao.png` | Engrenagem pequena de latão, em três quartos. | 472 x 458 | robo, peca, engrenagem, latao, ia, voando, igual | Peça voando nos cards. Várias iguais em fila dizem 'todo mundo igual'. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id lJoocWIgv9 (folha de 4 peças, separada e ampliada 2x) |
| `objetos/robos/peca-parafuso-aco.png` | Parafuso sextavado de aço, pequeno, inclinado. | 344 x 404 | robo, peca, parafuso, aco, ia, voando | Peça voando nos cards, pequena. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id lJoocWIgv9 (folha de 4 peças, separada e ampliada 2x) |

### objetos/xadrez (4)

Folha: `objetos/xadrez/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `objetos/xadrez/cavalo-dourado-contraluz-grande.png` | O cavalo de ouro em contraluz, ampliado em dobro (1044 px). | 1044 x 1888 | xadrez, cavalo, ouro, grande | Assunto de capa. | cavalo-dourado-contraluz ampliado 2x (Real-ESRGAN) em 11/11/2026 |
| `objetos/xadrez/cavalo-dourado-contraluz.png` | Cavalo de xadrez de ouro polido, em três quartos para a esquerda, em contraluz: fio de luz dourada na crina e nas bordas. | 522 x 944 | xadrez, cavalo, ouro, estrategia, contraluz | A estratégia, quem pensa diferente (a peça que anda diferente). Assunto de capa em cena escura, com luz quente atrás. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id jUddwWzLD0 |
| `objetos/xadrez/cavalo-dourado.png` | Cavalo de xadrez de ouro, em três quartos para a esquerda, luz de estúdio com reflexos. | 475 x 951 | xadrez, cavalo, ouro, estrategia | Reserva do cavalo em contraluz; mais nítido, menos brilho. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id lJooOcrgv9 |
| `objetos/xadrez/peao-preto-fio-de-luz.png` | Peão de xadrez preto fosco, com um fio de luz dourada na borda esquerda. | 409 x 729 | xadrez, peao, preto, igual | Todo mundo igual: em fila, ou desfocado perto da lente. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id w4mm9fe7EI |

### personagens/esculturas (4)

Folha: `personagens/esculturas/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `personagens/esculturas/calango-marmore-terno-2.png` | Estátua de mármore branco de um lagarto (o Calango) de terno e gravata, do peito para cima, em três quartos olhando para a esquerda. | 652 x 934 | calango, estatua, marmore, terno, lagarto, museu | O Calango de mármore do carrossel do Van Gogh. Cortado pela borda de baixo (o peito some), para não flutuar. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id 6AFEMFliJO |
| `personagens/esculturas/calango-marmore-terno-3.png` | Estátua de mármore branco de um lagarto (o Calango) de terno e gravata, do peito para cima, em três quartos olhando para a esquerda. | 582 x 954 | calango, estatua, marmore, terno, lagarto, museu | O Calango de mármore do carrossel do Van Gogh. Cortado pela borda de baixo (o peito some), para não flutuar. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id iGHuDud3uK |
| `personagens/esculturas/calango-marmore-terno-grande.png` | Estátua de mármore do Calango de terno, do peito para cima, ampliada em dobro (1304 px). | 1304 x 1868 | calango, estatua, marmore, terno, grande | Grande (uns 900 px de largura), atravessando a divisa, com a base cortada pela borda de baixo; sem sombra. | calango-marmore-terno-2.png ampliado 2x (Real-ESRGAN) em 11/11/2026 |
| `personagens/esculturas/calango-marmore-terno.png` | Estátua de mármore branco de um lagarto (o Calango) de terno e gravata, do peito para cima, em três quartos olhando para a esquerda. | 601 x 923 | calango, estatua, marmore, terno, lagarto, museu | O Calango de mármore do carrossel do Van Gogh. Cortado pela borda de baixo (o peito some), para não flutuar. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id P3CvcHc42C |

### personagens/historicos (4)

Folha: `personagens/historicos/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `personagens/historicos/van-gogh-3d-2.png` | Van Gogh em 3D, estilo filme de animação: chapéu de palha, barba ruiva, camisa azul e suspensório, da cintura para cima, olhar um pouco preocupado. | 653 x 1106 | van gogh, personagem, 3d, pintor, arte | Personagem histórico (domínio público). Na capa, na frente do quadro desfocado e atrás das abelhas. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id s7BpxMyl8e |
| `personagens/historicos/van-gogh-3d-3.png` | Van Gogh em 3D, estilo filme de animação: chapéu de palha, barba ruiva, camisa azul e suspensório, da cintura para cima, olhar um pouco preocupado. | 693 x 1092 | van gogh, personagem, 3d, pintor, arte | Personagem histórico (domínio público). Na capa, na frente do quadro desfocado e atrás das abelhas. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id s7BpxdIl8e |
| `personagens/historicos/van-gogh-3d-grande.png` | Van Gogh em 3D, chapéu de palha, barba ruiva, camisa azul, ampliado em dobro (1386 px). | 1386 x 2184 | van-gogh, personagem, 3d, grande | No meio da capa, com o quadro atrás, o chapéu um pouco por cima da headline e o corpo saindo pela moldura de baixo. | van-gogh-3d-3.png ampliado 2x (Real-ESRGAN) em 11/11/2026 |
| `personagens/historicos/van-gogh-3d.png` | Van Gogh em 3D, estilo filme de animação: chapéu de palha, barba ruiva, camisa azul e suspensório, da cintura para cima, olhar um pouco preocupado. | 763 x 1099 | van gogh, personagem, 3d, pintor, arte | Personagem histórico (domínio público). Na capa, na frente do quadro desfocado e atrás das abelhas. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id O6atwE0ynm |

### personagens/maos (2)

Folha: `personagens/maos/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `personagens/maos/mao-humana-apontando.png` | Mão e antebraço humanos subindo de baixo à esquerda, o indicador bem estendido apontando para o alto à direita; luz quente de contorno. | 791 x 871 | mao, humano, pele, apontando, braco | Variação mais firme (aponta de verdade). O braço sai pela borda de baixo. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id KLVVZxekqp |
| `personagens/maos/mao-humana-criacao-de-adao.png` | Mão e antebraço humanos subindo de baixo à esquerda, pulso solto e indicador estendido para o alto à direita, na pose da mão de Adão na Criação de Adão; luz quente de contorno. | 781 x 855 | mao, humano, pele, criacao-de-adao, braco | O humano na releitura da Criação de Adão: vem de baixo, o braço sai pela borda de baixo (o corte reto fica fora do slide). | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id iGHHtGl3uK |

### plantas/flores (13)

Folha: `plantas/flores/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `plantas/flores/girassol-caule-reto.png` | Girassol de frente, caule mais reto e duas folhas. | 781 x 922 | girassol, flor, amarelo, van gogh | O girassol do Van Gogh: pode atravessar a divisa entre dois cards. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id nVxKZSaYQD |
| `plantas/flores/girassol-contraluz-de-frente-grande.png` | O girassol de frente em contraluz, ampliado em dobro. | 1256 x 2138 | girassol, contraluz, grande | Saindo do quadro no CTA. | girassol-contraluz-de-frente ampliado 2x (Real-ESRGAN) em 11/11/2026 |
| `plantas/flores/girassol-contraluz-de-frente.png` | Girassol de frente em contraluz dourado: pétalas translúcidas acesas por dentro, fio de luz no caule e nas folhas; caule reto cortado embaixo. | 628 x 1069 | girassol, flor, amarelo, van-gogh, contraluz | Saindo do quadro no CTA, por cima do pé da headline. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id MBUg78bDCm |
| `plantas/flores/girassol-contraluz-tres-quartos-grande.png` | O girassol em três quartos em contraluz, ampliado em dobro. | 1556 x 2146 | girassol, contraluz, grande | Cabeça com uns 800 px na divisa. | girassol-contraluz-tres-quartos ampliado 2x (Real-ESRGAN) em 11/11/2026 |
| `plantas/flores/girassol-contraluz-tres-quartos.png` | Girassol em três quartos em contraluz dourado: pétalas translúcidas acesas por dentro, fio de luz no caule e nas folhas; caule cortado embaixo. | 778 x 1073 | girassol, flor, amarelo, van-gogh, contraluz | A luz de trás é o que dá vida (as referências do dono). Atravessando a divisa, caule pela borda de baixo. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id bx0WVP75Y2 |
| `plantas/flores/girassol-de-frente-grande.png` | Girassol de frente, caule curvo e duas folhas, ampliado em dobro (1564 px). | 1564 x 1906 | girassol, flor, amarelo, van-gogh, grande | Para a cabeça ocupar metade da altura do card (uns 800 px), como no Van Gogh original: atravessando a divisa, o caule cortado pela borda de baixo. | girassol-de-frente.png ampliado 2x (Real-ESRGAN) em 11/11/2026 |
| `plantas/flores/girassol-de-frente.png` | Girassol de frente, com caule curvo e duas folhas. | 782 x 953 | girassol, flor, amarelo, van gogh | O girassol do Van Gogh: pode atravessar a divisa entre dois cards. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id ksMcHC816B |
| `plantas/flores/girassol-luz-de-frente-grande.png` | O girassol de frente com luz de contorno, ampliado em dobro. | 1670 x 2198 | girassol, flor, grande, contorno | Saindo do quadro no CTA. | girassol-luz-de-frente ampliado 2x (Real-ESRGAN) em 11/11/2026 |
| `plantas/flores/girassol-luz-de-frente.png` | Girassol de frente, cabeça grande, duas folhas, luz de contorno dourada, caule cortado embaixo. | 835 x 1099 | girassol, flor, amarelo, van-gogh, contorno | Saindo do quadro, por cima do pé da headline (o CTA do Van Gogh). | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id hu36PdIvqL |
| `plantas/flores/girassol-luz-tres-quartos-grande.png` | O girassol em três quartos com luz de contorno, ampliado em dobro. | 1682 x 2182 | girassol, flor, grande, contorno | Para a cabeça com uns 800 px. | girassol-luz-tres-quartos ampliado 2x (Real-ESRGAN) em 11/11/2026 |
| `plantas/flores/girassol-luz-tres-quartos.png` | Girassol em três quartos com as pétalas vindo para a frente, luz de contorno dourada, caule cortado embaixo. | 841 x 1091 | girassol, flor, amarelo, van-gogh, contorno | O girassol com vida: atravessa a divisa com o caule saindo pela borda de baixo. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id LwXeMnqswO |
| `plantas/flores/girassol-tres-quartos-grande.png` | Girassol em três quartos, caule curvo e duas folhas, ampliado em dobro (1350 px). | 1350 x 1846 | girassol, flor, amarelo, van-gogh, grande | O girassol saindo do quadro, na frente da headline do último card. | girassol-tres-quartos.png ampliado 2x (Real-ESRGAN) em 11/11/2026 |
| `plantas/flores/girassol-tres-quartos.png` | Girassol grande com caule curvo e duas folhas, em três quartos. | 675 x 923 | girassol, flor, amarelo, van gogh | O girassol do Van Gogh: pode atravessar a divisa entre dois cards. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id aFZ6IVmfSh |

### plantas/folhas (10)

Folha: `plantas/folhas/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `plantas/folhas/folha-curvada-contraluz.png` | Folha verde curvada, com a ponta virada, em contraluz. | 374 x 439 | folha, verde, contraluz, humano, voando | Voando, perto da lente (grande e desfocada) ou pequena ao fundo. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id KLVVZzrkqp (folha de 4, separada e ampliada 2x) |
| `plantas/folhas/folha-filodendro-coracao-longa.png` | Folha de filodendro grande, coração alongado e brilhante, com o talo. | 776 x 787 | folha, filodendro, tropical, selva, verde | Na selva verde-água escura do tucano: matiz +15, sat 0,7, luz 0,8. Perto da lente: blur 6 a 10. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id YMjkRNFWeC |
| `plantas/folhas/folha-filodendro-coracao.png` | Folha de filodendro inteira em forma de coração, verde-escuro, com o talo. | 654 x 728 | folha, filodendro, tropical, selva, verde | Na selva verde-água escura do tucano: matiz +15, sat 0,7, luz 0,8. Perto da lente: blur 6 a 10. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id BhP7VTxoQR |
| `plantas/folhas/folha-filodendro-recortada.png` | Folha de filodendro partida (recortes nas bordas), verde-escuro, com o talo. | 786 x 816 | folha, filodendro, tropical, selva, verde | Na selva verde-água escura do tucano: matiz +15, sat 0,7, luz 0,8. Perto da lente: blur 6 a 10. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id 1lD0FqNr4r |
| `plantas/folhas/folha-louro-contraluz.png` | Folha de louro verde-viva em contraluz, com as nervuras à mostra e a borda acesa. | 482 x 743 | folha, louro, verde, contraluz, humano, voando | Folha de planta voando nos cards: o humano, o vivo. Em contraluz, a luz atravessa. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id KLVVZzrkqp (folha de 4, separada e ampliada 2x) |
| `plantas/folhas/folha-monstera.png` | Folha de monstera (costela-de-adão) grande, verde vivo, de frente. | 1610 x 1728 | folha, monstera, tropical, selva, verde | Verde vivo: numa cena verde-água escura, matiz +20, sat 0,6, luz 0,75 (sem ajuste, quebra a cena). | templates/carrossel/imagens/folha.png |
| `plantas/folhas/folha-redonda-contraluz.png` | Folha verde-clara arredondada, de frente, em contraluz. | 437 x 526 | folha, verde, contraluz, humano, voando | Voando; a diferente no meio das peças iguais. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id KLVVZzrkqp (folha de 4, separada e ampliada 2x) |
| `plantas/folhas/folha-samambaia-arqueada.png` | Folha de samambaia arqueada, verde-água, pontas naturais. | 877 x 790 | folha, samambaia, selva, verde, floresta | Na selva verde-água escura do tucano: matiz +15, sat 0,7, luz 0,8. Perto da lente: blur 6 a 10. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id EbGRhRtuuO |
| `plantas/folhas/folha-samambaia-diagonal.png` | Folha de samambaia longa na diagonal, verde-água, pontas naturais. | 844 x 783 | folha, samambaia, selva, verde, floresta | Na selva verde-água escura do tucano: matiz +15, sat 0,7, luz 0,8. Perto da lente: blur 6 a 10. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id LwXDk0NswO |
| `plantas/folhas/ramo-oliveira-contraluz.png` | Raminho de oliveira com quatro folhas, em contraluz. | 510 x 570 | folha, oliveira, ramo, verde, contraluz, humano, voando | Voando ou atravessando a divisa; combina com a pintura renascentista. | Magnific 11/11/2026, Nano Banana 2.1 (ilimitado), id KLVVZzrkqp (folha de 4, separada e ampliada 2x) |

### plantas/grama (1)

Folha: `plantas/grama/folha.jpg`

| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |
| --- | --- | --- | --- | --- | --- |
| `plantas/grama/grama-com-flores.png` | Tufo de grama verde com florzinhas brancas. | 2239 x 1536 | grama, campo, verde | A base é reta (cortada da foto): a borda de baixo precisa ficar fora do card. | templates/carrossel/imagens/elementos/ |
