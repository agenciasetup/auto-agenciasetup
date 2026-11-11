# Banco de capas

As peças que ensinam. Abra a `folha.jpg` (as miniaturas, na ordem desta lista) e leia o que cada uma ensina antes de criar uma capa: escolha de 1 a 3 como direção e diga quais no registro do turno. **Nunca copie uma delas: é a direção, não o modelo.**

As imagens ficam fora do Git. Mediana do banco: cor 74, luz 76, contraste 207 (a conferência avisa quando a capa nova fica com menos de 60% da cor mediana).

Para pôr uma capa nova: `node scripts/banco-capas.mjs adicionar <imagem> <nome> "<o que ensina>" --origem dono|aprovada|inspiracao|nossa --tags ...`. O dono pode só jogar o arquivo em `entrada/` e pedir para descrever (`node scripts/banco-capas.mjs entrada`).

## Do dono (as que engajaram) (8)

| Arquivo | O que ensina | Tags | Cor, luz, contraste | Cores | Nota |
| --- | --- | --- | --- | --- | --- |
| `dono-vangogh-2024-capa.jpg` | Fundo laranja com textura de pintura (não cor lisa). Headline em duas linhas da mesma largura, com o personagem encostando nela. Quadro atrás do personagem. Abelhas em três distâncias, com rastro. Girassol desfocado no alto, perto da lente. Tudo pertence ao tema: a cena é uma só. | composicao, cor, profundidade, headline, fundo-pintado | 130, 158, 206 | #f9ab06 #f79706 #f4f5f4 | 3.372 curtidas (26/04/2024) |
| `dono-vangogh-2024-girassol.jpg` | O elemento da divisa é enorme (a cabeça do girassol com metade da altura do card) e passa para o card seguinte. O texto é pequeno, numa caixa, longe do elemento. O fundo muda de mundo (do laranja para o claro) bem na divisa. | elemento-na-divisa, escala, carrossel-infinito | 124, 154, 130 | #f79306 #f8aa06 #f87207 |  |
| `dono-vangogh-2024-fim.jpg` | O fim com a força da capa: título grande em bloco, a palavra final em outra cor, o girassol saindo do quadro por cima do pé do título, nuvens bem desfocadas. | cta, headline, elemento-sobre-titulo | 89, 180, 174 | #f3f2f1 #d2cfce #b0afaf |  |
| `dono-leonardo-capa.jpg` | Cena escura com uma luz quente pontual atrás do personagem. Personagem cortado pela borda de baixo. Headline serifada em duas cores (branco e laranja). Textos miúdos de textura. Vagalumes de verdade em distâncias diferentes. | escuro, luz-atras, vagalumes, headline | 58, 47, 167 | #080402 #2b1607 #4d2d0d | 533 curtidas, 142 salvos, nota 12,28 |
| `dono-leonardo-quadro.jpg` | Card escuro: a frase no alto e um quadro em moldura dourada embaixo, com a luz quente atrás dele e uma legenda miúda. O objeto de verdade, com luz, no lugar de enfeite. | escuro, quadro, moldura, luz-atras | 52, 37, 162 | #040101 #2e1503 #4e2c0b |  |
| `dono-leonardo-fim.jpg` | O fim: o quadro grande com a personagem saindo da moldura por cima do título. Quinas de moldura desfocadas nos cantos, perto da lente. | cta, quadro, quina-de-moldura, profundidade | 57, 58, 189 | #080301 #2e1605 #4f2c0c |  |
| `dono-anaconda-capa.jpg` | Capa de cinema: o bicho enorme saindo pelo lado, o tronco perto da lente como moldura natural, a luz âmbar atrás do título, vagalumes. O título tem a sua área, com respiro. | cinema, luz-atras, moldura-natural, vagalumes | 85, 54, 170 | #0d0806 #2b170b #4e2b0e | 425 curtidas, 102 salvos, nota 10,10 |
| `dono-anaconda-meio.jpg` | Slide de dentro em cena contínua: o mesmo fundo de floresta desfocado passa de um card para o outro. Caixas de vidro para o texto, fotos pequenas com setas, vagalumes em primeiro plano. | cena-continua, carrossel-infinito, vidro | 39, 29, 105 | #0e0603 #2b1609 #4b2d12 |  |

## Nossas, do jeito novo (o gabarito) (5)

| Arquivo | O que ensina | Tags | Cor, luz, contraste | Cores | Nota |
| --- | --- | --- | --- | --- | --- |
| `nossa-vangogh-2026-capa.jpg` | O gabarito do jeito novo, corrigido pelo dono volta por volta: respiro (margem de cima parecida com a dos lados), headline em bloco na largura do quadro, o personagem no meio saindo pela moldura de baixo, a cursiva branca encostando no pé da headline, luz em sobrepor, cantos desfocados, nuvem branca de verdade perto da lente. | gabarito, respiro, headline, profundidade, luz | 127, 153, 251 | #f7b106 #fbfbf7 #fac606 |  |
| `nossa-vangogh-2026-girassol.jpg` | O girassol em contraluz (pétala acesa por dentro, fio de luz na borda), grande, atravessando a divisa, com a luz quente atrás da cabeça e o texto livre dele. | contraluz, elemento-na-divisa, gabarito | 126, 150, 191 | #f7ae07 #f69707 #020201 |  |
| `nossa-vangogh-2026-busto.jpg` | Mundo claro: chão de nuvens de verdade fundido no card (multiply), o busto grande na divisa com a base cortada, uma nuvem branca na frente dele e abelha com cor e rastro de voo. | claro, nuvens, elemento-na-divisa, gabarito | 13, 205, 252 | #f1f0ec #d4d2cd #010101 |  |
| `nossa-vangogh-2026-quadro.jpg` | Card escuro: a frase no alto, o quadro em moldura dourada embaixo com a luz quente atrás, a quina da moldura desfocada entrando pelo vão com a sombra subindo, a abelha mais escura porque está no escuro. | escuro, quadro, quina-de-moldura, gabarito | 53, 48, 176 | #0f0e0d #241c15 #2e2318 |  |
| `nossa-vangogh-2026-fim.jpg` | O fim: a palavra final em amarelo e a de apoio em cinza-claro, o girassol em contraluz saindo do quadro desfocado por cima do pé do título. | cta, headline, contraluz, gabarito | 97, 165, 243 | #f1f0ec #000000 #f9c70b |  |

## Aprovadas pelo dono (8)

| Arquivo | O que ensina | Tags | Cor, luz, contraste | Cores | Nota |
| --- | --- | --- | --- | --- | --- |
| `aprovada-cores-tucano.jpg` | Bicho com cor viva contra a selva escura. As folhas da própria cena, desfocadas, na frente da lente. Título gigante com o floreio por cima. O selo aponta a palavra que importa. | bicho, cor-viva, profundidade, floreio | 46, 62, 207 | #112f2d #05090a #2e504d |  |
| `aprovada-alpaca.jpg` | Grande angular colada no focinho: o bicho chega perto da lente e ganha atitude. Fundo limpo, cor cheia. | bicho, grande-angular, atitude | 107, 120, 236 | #066bad #055490 #000000 |  |
| `aprovada-pinguim.jpg` | Grande angular com perspectiva forte e fundo limpo: a própria foto já tem os planos. | bicho, grande-angular, perspectiva | 26, 166, 223 | #e4e6ea #d7dce4 #080809 |  |
| `aprovada-claude-janela.jpg` | A janela do aplicativo desfocada no fundo, atrás do título e da pessoa: profundidade com um objeto do assunto. | filipe, profundidade, objeto-no-fundo | 52, 78, 240 | #100d0e #261b17 #f3f1eb |  |
| `aprovada-arte-na-mao.jpg` | A peça na mão do Filipe, perto da lente: o objeto do post vira o primeiro plano. | filipe, primeiro-plano | 63, 68, 217 | #0f0e0c #f1eee9 #d69748 |  |
| `aprovada-skill-dedo.jpg` | O gesto aponta o que importa: o dedo no arquivo, o olho segue. | filipe, gesto, direcao-do-olhar | 125, 153, 234 | #fcc61c #0c0b0a #fbcb2a |  |
| `aprovada-cursos-abelha.jpg` | Fundo preto com o bicho nítido e cheio de detalhe: o contraste faz a cor saltar. | bicho, preto, contraste | 84, 65, 244 | #0d0c0b #262626 #f6f6f6 |  |
| `aprovada-identidade-da-vinci.jpg` | O personagem histórico como assunto, em cena escura com luz quente. | personagem, escuro, luz-quente | 58, 47, 165 | #080402 #2b1607 #4d2d0d |  |

## Inspiração de fora (a direção, nunca o modelo) (7)

| Arquivo | O que ensina | Tags | Cor, luz, contraste | Cores | Nota |
| --- | --- | --- | --- | --- | --- |
| `fora-girafa-terno.jpg` | A favorita do dono: bicho hiper-detalhado, vestido, com atitude, em cor cheia tirada do próprio assunto. | bicho, atitude, cor-cheia | 103, 101, 219 | #110c08 #2d130a #532a14 |  |
| `fora-cachorro-olho-de-peixe.jpg` | Olho de peixe visto de cima: o focinho colado na lente, o corpo pequeno atrás. Fundo de uma cor só. | bicho, grande-angular, cor-cheia | 46, 44, 148 | #01172b #030c17 #052f4f |  |
| `fora-gato-patas-na-lente.jpg` | As patas na lente e o céu atrás: o primeiro plano encosta em quem olha. | bicho, primeiro-plano, ceu | 133, 124, 168 | #4a95f1 #6fb4fc #910411 |  |
| `fora-arara-selva.jpg` | Bicho de cor viva contra a selva escura, folhas desfocadas na frente da lente e título gigante atrás do assunto. | bicho, cor-viva, profundidade, titulo-atras | 75, 68, 253 | #020606 #fafbfa #043012 |  |
| `fora-onca-selva.jpg` | O assunto vivo contra a cena escura, com o título enorme passando por trás dele. | bicho, contraste, titulo-atras | 19, 76, 236 | #050708 #f0f1f0 #2a3231 |  |
| `fora-leopardo-vermelho.jpg` | Uma cor só dominando tudo (vermelho), com o bicho como joia no centro. | cor-cheia, bicho, monocromia | 67, 48, 111 | #2d0b0a #541313 #b82f28 |  |
| `fora-abelha-cristais.jpg` | Nitidez extrema no assunto e desfoque forte em volta: o foco diz para onde olhar. | nitidez, foco, detalhe | 74, 70, 238 | #0c0402 #2f1004 #6e3008 |  |
