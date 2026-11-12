# Direção de arte: como criar no nível do Van Gogh de 11/11/2026

Este guia reúne o que o dono ensinou refazendo o carrossel do Van Gogh em 11/11/2026, volta por volta, e o pedido dele no fim: "quero que você aprenda, atualize nossas skills para criar assim... melhore a forma como você enxerga". Leia antes da Fase 3 (direção de arte) e volte a ele na Fase 5 (montagem). Em diagramação, luz, profundidade, cor e elementos, ele vale mais que os documentos antigos. O `profundidade.md` continua valendo para gerar a foto do bicho ou do objeto, e o `foto-do-filipe.md` para o rosto.

O gabarito é o `templates/carrossel/conteudos/vangogh-infinito.js` (o resultado em `_local/carrossel/vangogh-infinito/`). Abra a `larga.jpg` e os mapas dele antes de montar uma peça nova.

**Regra de tudo:** o Claude clona o jeito do dono. Não "reinventa" nem "melhora". O que está aqui é o padrão dele, medido.

## 0. Os erros que eu não posso repetir (leia sempre, antes de tudo)

No fim de 11/11/2026, depois de corrigir o carrossel "A IA vai tirar seu emprego" em mais de dez voltas, o dono mandou: "reaprender com todos os erros que cometeu aqui". Esta lista é o resumo; o detalhe está nas seções 8 e 9 e no `licoes.md`.

1. **O pior erro: a escolha da imagem.** (A raposa de gravata e depois o xadrez, as duas reprovadas: "Capa sem sentido!".) A solução dele, e ela é obrigatória antes de gerar qualquer coisa:
   - **Busque no perfil da agência um conteúdo parecido que deu bom.** O Desempenho (`ver_desempenho`, `listar_posts` com `busca`), a leitura do Olheiro (`design_leitura`), o banco de capas (`templates/carrossel/referencias/banco/`) e o arquivo (`node scripts/design-arquivo.mjs`, e `--post <código>` para um post que ele citou). Abra as lâminas, não só o título.
   - **Busque no Pinterest referências bonitas que se aproximem do nosso estilo** (pelo Chrome com a conta da agência): de 3 a 6, guardadas em `_local/carrossel/<nome>/referencias/`.
   - A ficha da capa cita as referências (as do perfil e as de fora) e diz o que tira de cada uma: a ideia, a luz, a composição. Nunca copiar; nunca gerar a imagem sem ter olhado referência.
2. **Headline e CTA sempre bonitas:** com degradê (do amarelo ao laranja na palavra de destaque) e com o desfoque nas pontas. A chamada leva o mesmo acabamento da capa.
3. **Elementos: excesso é ruim, pouco é ruim.** Precisa ser assertivo: cada elemento tem um motivo e um lugar. **A maioria desfocada**: eles não são o foco, são complemento. Um por divisa é a medida que funcionou.
4. **Elemento desfocado desfoca o fundo junto**, principalmente aviso, popup e coisas do gênero (`{ vidro: true }`): o objeto, as bordas e o que está atrás, tudo fora de foco.
5. **Anotação à mão quase não aparece.** Opacidade baixa (o padrão do modelo é 26%), desfoque leve, mesclada. É detalhe.
6. **Conceito com sentido:** imagem bela e conhecida relida com os símbolos do tema, não metáfora que precisa de explicação.
7. **Composição:** o que é comprido entra pelo canto; o título e o elemento de fundo formam um bloco (mesma largura, colados, no meio); o que atravessa a divisa chega até o fim, sem corte reto no card vizinho.
8. **Profundidade e luz:** desfocado de fundo é escuro, o claro vai para a frente; luz com fonte (poucos pontos de luz, nunca brilho dourado geral); vinheta no card e no elemento de fundo.
9. **Acabamento que ele sente falta quando some:** a régua ao lado da moldura, o cursor "calango", a assinatura quase apagada embaixo, o degradê e o desfoque nas pontas do título.
10. **Antes de mostrar:** a última linha de cada título (palavra sozinha, artigo solto), fatia fina de elemento na borda de um card, régua por cima de braço, cisco de poeira em cima de elemento desfocado.

## 1. Imagens criativas

**Comece pelo banco de capas.** `templates/carrossel/referencias/banco/` (o `LEIA.md` diz o que cada capa ensina; a `folha.jpg` mostra todas). Escolha de 1 a 3 como direção e diga quais na ficha. Nunca copie: é a direção, não o modelo. Capa nova que o dono mandar entra com `node scripts/banco-capas.mjs adicionar` (ou ele joga em `banco/entrada/`). Post de referência da própria conta: `node scripts/design-arquivo.mjs --post <código>`.

**Cada camada é uma imagem.** "Não gere a imagem INTEIRA. Gere cada camada dela." O personagem, o quadro, as abelhas, as nuvens e o girassol nascem separados e a peça é composta no modelo. Antes de gerar, procure na biblioteca (`templates/biblioteca/LEIA.md`); o que gerar novo entra nela (`node scripts/biblioteca.mjs adicionar`).

**Como pedir no Magnific** (só o modelo que mostra "Unlimited"; em 11/11/2026 era o Nano Banana 2.1 em 1K):
- Um elemento só, inteiro dentro do quadro, com borda natural e sem texto.
- O fundo liso certo para o recorte: cinza claro ou bege para objeto; **preto** para o que é claro e some no ar (nuvem, fumaça); **branco** para a nuvem que vai fundir num card claro.
- A luz dita no pedido. É ela que dá vida (item 4).
- Elemento pequeno que vai crescer: amplie antes com `node scripts/tratar.mjs ampliar <img> --escala 2` (de graça, na placa de vídeo).

**O que torna a imagem bonita, pelas referências dele:**
- **Contraluz.** "A luz nos dois últimos" (os girassóis de referência): pétala translúcida acesa por dentro, fio de luz nas bordas, nos pelos do caule e nas folhas, luz quente atrás. Peça: `backlit by warm golden hour sunlight coming from behind`, `petals translucent and glow from within`, `every edge outlined by a bright golden rim light`. Luz de estúdio de frente deixa bonito e morto ("achei feio esse girassol").
- **O objeto de verdade, com luz, no lugar do enfeite.** Nos cards escuros, um quadro em moldura dourada com luz quente atrás vale mais que uma pincelada de tinta ("sei que no original tem essa tinta, mas acho feio; eu exploraria quinas do quadro, molduras ou elementos mais bonitos").
- **Tudo pertence à cena.** Liste o que existe no mundo do post (no Van Gogh: girassol, abelha, quadro, moldura, nuvem, chapéu de palha, tinta) e use só isso. Elemento sem contexto reprova ("pedras amarelas sem contexto nenhum").
- **Real, com volume.** Nuvem é nuvem de verdade, com sombra e volume ("estão muito falsas, cinzas e feias"). Vagalume é o inseto, não um ponto de luz.
- **Bicho com detalhe, atitude e cor cheia** (as referências de 05/11, no banco).

## 2. Profundidade, camadas, tamanho, luz e desfoque

**As camadas, de trás para a frente** (a capa do Van Gogh, como ele descreveu): 0 o fundo; 1 o objeto de fundo, sutilmente desfocado (o quadro); 2 a headline; 3 o assunto; 4 a luz por cima; 5 a 7 o que voa e o que está perto da lente (abelhas, nuvens). "Talvez entre elas algumas sombras e luzes."

**Todo elemento tem a distância `z`**, e o desfoque e a sombra saem dela, com a mesma conta para todos:

| z | Onde está | Desfoque | Tamanho | Exemplo |
| --- | --- | --- | --- | --- |
| -1 a -0,3 | no fundo, dentro da janela | de 3 a 10 px | pequeno | a abelha longe |
| 0 | o plano do foco (o dos cartões e do assunto) | nítido | o tamanho de verdade | o Van Gogh, o girassol, o busto |
| 0,3 a 0,6 | entre o assunto e a lente | de 5 a 14 px | maior | a abelha grande, a quina da moldura |
| 0,7 a 1 | colado na lente | de 20 a 30 px | enorme, só um pedaço à vista | a nuvem do canto, a borboleta |

- "Mais perto da câmera desfoca. Mais perto do assunto foca. Mais longe do assunto, no fundo, desfoca. E a luz também afeta."
- No mesmo plano, um exemplar nítido de cada coisa e nos tamanhos de verdade ("tem duas borboletas ali que estão em foco, parece que uma é gigante").
- O elemento da divisa é **grande**: a cabeça do girassol com metade da altura do card, o busto do peito para cima com a base cortada pela borda.
- Poucos elementos: um grande por divisa ("exagerou na quantidade de coisas").
- **O que voa tem rastro** (`rastro: { px: 7, angulo: -8 }`): o desfoque só na direção do voo.
- **O assunto sai da moldura.** O personagem vai na `travessia` (a janela não corta) e o corpo passa por cima da moldura preta de baixo: "daria profundidade".
- **Foto inteira (bicho, cena):** `node scripts/tratar.mjs profundidade <foto> --planos 3` mede a distância de cada ponto (Depth Anything V2) e corta a foto em planos. Serve para pôr um elemento entre dois planos da foto e para o `foco` (`node scripts/tratar.mjs foco <foto> --ponto x,y`), que desfoca como lente de verdade.

## 3. Headline, tamanho, margens, espaçamentos e fontes

**As fontes da agência** (`templates/fontes/`, fora do Git): **Calango Condensed** Black na headline; **Calango Signature** na cursiva (o floreio e o texto pequeno por cima da headline); **Calango Sans** nos textos e no cabeçalho; Instrument Serif itálico no destaque dentro da frase. Anton, Great Vibes e Outfit ficam só nas peças antigas aprovadas.

**As regras, com número** (o mapa de margens mostra cada uma em verde ou vermelho):
- **Respiro em cima.** "Dá uma margem igual em cima e dos lados, ou aproximado... mas em cima precisa ter um espaço mesmo. O que você faz costuma ficar muito colado." A margem de cima da headline (da janela até a letra) tem pelo menos 85% da menor margem lateral, e nunca menos de 110 px.
- **Um pouco menor.** "Ele diminui um pouco os elementos e a headline." Menor do que o primeiro impulso.
- **Duas linhas, a mesma largura** (`bloco`), "mesmo que a fonte fique de tamanho diferente".
- **A largura do bloco é a do elemento principal** (o quadro atrás do personagem). As bordas alinhadas organizam a capa e a linha de baixo passa do chapéu, abrindo espaço. O mapa de construção mostra as bordas alinhadas em magenta.
- **As linhas coladas.** "Aproxime o CONTRATE do NUNCA": de 0 a uns 10 px entre as letras (`vao` negativo; na Calango Condensed, `vao: -25` dá uns 4 px).
- **O assunto encosta de leve na headline**, por cima dela: até uns 12% da palavra coberta. Mais que isso esconde.
- **A cursiva por cima.** O texto pequeno ("um designer") na Calango Signature, branco e grande, à esquerda, encostando no pé da headline, na frente do assunto (`posFonte`, `posCor`, `posFrente`, `posEspaco` negativo). "Vira um charme." Com um pouco de respiro: só uma haste toca a palavra.
- **Cor da headline:** preto, amarelo ou branco. No fim, a palavra que fecha a leitura leva a cor (FRENTE em amarelo) e a de apoio recua (cinza-claro).
- **Texto do slide de dentro:** pelo menos 70 px da janela, livre do elemento grande (`lado: 'esquerda' | 'direita'`); com um objeto embaixo, a frase vai no alto (`alto: true`). Nenhum texto com menos de 30 px.
- **O fim repete a força da capa:** título grande em bloco, a frase pequena em cima, o elemento principal por cima do pé do título.

## 4. Efeitos, tratamento e cor

- **A cor se mede.** "Inclusive o amarelo no fundo, olhe a cor." Tire a amostra de pixel do original (sharp) e use o número. O laranja dele vai de #FAA004 no alto a #F57A06 embaixo.
- **Fundo com textura, não cor lisa.** O laranja do Van Gogh é uma pintura em tons de laranja (`fundos/pinturas/` na biblioteca).
- **Mais cor nos assuntos.** "Sinto falta de cor (sutilmente mais saturação nos assuntos)": `sat: 1.1` a `1.15` no personagem, no quadro, nas abelhas e nas flores.
- **Ser vivo nunca fica cinza.** "Você deixou abelhas cinzas, não curto."
- **No escuro, o que está no escuro escurece.** "A abelha, em tese, deveria estar mais escura": `luz: 0.4` a `0.6`.
- **A luz, pela receita dele:** "uma bola desfocada na cor do fundo (amarelo na maioria das vezes), com o centro dela um amarelo mais claro. Muda o modo de mesclagem pra modo tela, ou divisão, ou sobrepor. Diminui a opacidade... aumenta o desfoque se precisar pra ficar sutil." No modelo: `{ halo: true, x, y, d, cor (o centro), borda (a cor do fundo), blur: 40, op: 0.35 a 0.5, mistura }`.
  - **Sobrepor (`overlay`) é o padrão** quando há preto ou branco na área: acende a cor e deixa o preto e o branco como estão. É o blend-if que ele usava. O modo tela desbotou o CONTRATE escuro.
  - **Luz atrás de um elemento** (a cabeça do girassol, o quadro no escuro) vai no `panorama`, atrás dele: `{ vagalume: true, cor: 'quente', r: 100, blur: 40, op: 0.5 }`. Por cima, ela acende só meio elemento e a divisa aparece.
  - **Luz de contorno:** `contorno: '#ffd24a'` no elemento em contraluz.
  - A luz nunca vaza para a moldura preta.
- **Cantos desfocados** ("desfoque nos cantos são bem-vindos"): `cantos: { blur: 7, de: 0.58 }` na capa e no fim.
- **Mesclagem por elemento** (`mistura`): `multiply` para a nuvem fotografada em fundo branco fundir no card claro; `screen` para luz.
- **Sombra em degradê por cima do elemento** (`escurece: { y0, y1, forca }`, alturas na tela: escuro em y0, limpo em y1): a quina da moldura que entra pelo vão escurece para a ponta ("uma sombra vindo de baixo neles, escurecendo, ficaria melhor").
- O grão, o meio-tom e a poeira já vêm no modelo (etapa 5).

## 5. Elementos no carrossel, luz e sombra

- **Com intenção, nunca solto.** "Meio aleatórias" reprova. Cada elemento tem um lugar que se explica: o chão de nuvens na base dos cards claros, contínuo de um card para o outro; a quina da moldura entrando pelo vão entre dois cards; o quadro embaixo da frase; a nuvem por cima da base do busto.
- **Nuvens:**
  - Na frente das coisas ou sobre cor e preto: a nuvem de verdade recortada do fundo preto com `--volume` (o corpo opaco, com a sombra dela), clara (`luz: 1.4`), desfocada pela distância.
  - No card claro: o banco de nuvens em fundo branco com `mistura: 'multiply'`, no `panorama`.
  - Nunca nuvem cinza chapada, e nenhuma nos cards pretos ("as nuvens cinzas não ornaram").
- **Sombra só perto de uma superfície** (`sombra: true`): a borboleta sobre o cartão, o tronco sobre o card. O que voa no ar ou sai da borda de baixo fica sem ("a sombra na abelha ficou artificial... o girassol tem uma sombra artificial, o busto também"). A sombra cai para o lado oposto ao da luz (`luzDe` no carrossel; o mapa de luz confere).
- **Abelhas e o que voa:** com cor, em distâncias diferentes, com rastro, mais escuras no escuro.
- **O que atravessa não cobre texto**, e o que tem peso está apoiado ou cortado pela borda de baixo.
- **Os mundos do carrossel:** cada trecho tem a sua cor (no Van Gogh: o laranja pintado, o claro com nuvens, o preto com quadros dourados) e a troca acontece na divisa, com um elemento grande em cima dela.

## 6. O processo com os mapas

O que mudou no fluxo da skill:

1. **Fase 3:** abra o banco de capas e o gabarito; escreva a ficha com as camadas (0 a 7), o `z` de cada elemento, de onde vem a luz e o que cruza cada divisa.
2. **Fase 4:** gere cada camada separada, com a luz dita no pedido; biblioteca primeiro.
3. **Fase 5:** monte e exporte (`node scripts/carrossel.mjs <conteudo>`). Saem os mapas em `_local/carrossel/<conteudo>/mapas/`. Abra todos, nesta ordem:
   - `construcao.jpg`: cada camada na sua cor e na ordem; os terços e o centro; em magenta, as bordas alinhadas. Pergunte: o olho tem um caminho? As peças principais se alinham?
   - `margens.jpg`: as cotas em verde (na regra) ou vermelho. Nenhuma vermelha.
   - `profundidade.jpg`: mais claro, mais perto da lente. O tamanho de cada elemento bate com o cinza dele?
   - `desfoque.jpg`: branco é nítido. O que está perto ou longe está desfocado na medida, e o que voa tem rastro?
   - `luz.jpg`: de onde vem a luz, cada bola de luz e para onde cai cada sombra (seta vermelha é sombra para o lado da luz).
4. **A conferência:** `node scripts/conferir-arte.mjs <conteudo>`. Ela mede o que o olho deixa passar: margem, bloco, texto coberto, contraste no pior trecho, bicho sem cor, sombra em quem voa, tamanho incoerente no mesmo plano, imagem ampliada demais, luz vazando na moldura, emenda e cor da capa contra o banco. **Zero erro antes do revisor.** Cada aviso se explica ou se conserta.
5. **O revisor** (`references/revisor-de-capa.md`), que abre os mapas e o `conferencia.md` junto com os slides.
6. **Mostre ao dono** com a tela inteira e a capa. O que ele corrigir vira linha no `licoes.md` e, se for regra medível, entra na conferência.

## 7. O que ele já reprovou (não repetir)

Amarelo liso no lugar do laranja medido. Headline colada no alto. Linhas da headline com larguras diferentes. Assunto no canto com o quadro ao lado. Girassol pequeno na divisa. Sombra em abelha, girassol e busto. Pincelada de tinta nos cards pretos. Nuvem cinza, chapada ou solta. Abelha sem cor. Abelha clara no escuro. Luz vazando na moldura. Luz em modo tela desbotando o preto. Fim de carrossel fraco, com texto pequeno e elemento pequeno no canto. Elementos demais. Dois exemplares nítidos da mesma coisa em tamanhos diferentes. Elemento sem contexto. Recorte com borda reta à vista. As frases dele, com a data, estão em `licoes.md`.

Da peça "A IA vai tirar seu EMPREGO?" (11/11/2026, quatro voltas): capa de metáfora que precisa de explicação (o xadrez). Braço entrando pelo meio da borda. Raminho, engrenagem e parafuso espalhados ("excesso de poluição"); a mesma peça repetida em fila. Elemento de interface com texto para ler voando no card. Desfocado claro no fundo. Brilho dourado sem fonte atrás de tudo. Braço que acaba no corte reto dentro do card vizinho. Vidro que não desfoca o que está atrás. Quadro pequeno desalinhado da headline.

## 8. O que a capa do "IA vai tirar seu emprego" ensinou (11/11/2026, à noite)

O gabarito é `conteudos/ia-emprego.js` (a capa que ele chamou de "perfeito!"). As palavras dele estão no `licoes.md`.

- **Capa com sentido.** Antes de inventar metáfora, procure uma imagem bela que todo mundo reconhece e que já diz a tese (uma obra clássica, uma cena famosa) e releia com os símbolos diretos do tema. Ali: a Criação de Adão, com a mão de robô (a IA) e a mão de gente, e um quadro renascentista de um homem ao computador.
- **Bloco de título e fundo.** O título e o elemento que fica atrás do assunto formam um bloco só: a mesma largura (`bloco`), colados um no outro, e o conjunto no meio do card (o `y` do título desce; o respiro de cima continua existindo, maior). Quadro pequeno solto embaixo de uma headline larga dá estranhamento.
- **O assunto entra pelos cantos.** Braço, galho e tudo que é comprido entra na diagonal, por um canto, nunca pelo meio da borda. Dois assuntos vêm de cantos opostos.
- **Pode cobrir.** O que está por cima pode passar sobre o texto e sobre coisa importante "desde que dê pra entender", até cortar a última letra. Não desvie o assunto do título a qualquer custo.
- **Fundo escuro, frente clara.** O que está desfocado no fundo fica mais escuro; o que é claro e desfocado vai para a frente, por cima.
- **Luz com fonte.** Em cena escura, o fundo é preto e a luz vem de poucos pontos: no máximo dois ou três vagalumes de verdade, bem feitos, como na capa do Leonardo (`banco/dono-leonardo-capa.jpg`). Um colado na lente, num canto, escuro, com a luz grande e quente (é ela que ilumina o canto); outro pequeno e nítido perto do elemento de fundo, com o rastro do voo. Mais que isso é "excesso de vagalume, meio mal feito". Halo e névoa dourada atrás de tudo "não tem sentido".
- **Vinheta.** O fundo some para as bordas (`vinheta` no slide) e o elemento de fundo também (`escurece: { de: 'bordas' }`): "meio que sumindo no fundo". O título e o assunto ficam acesos.
- **Um elemento por divisa.** "Mais imagens nos cards" quer dizer um elemento bonito por divisa, grande e bem desfocado perto da lente, ligado ao tema (ali: vidro do Claude nos cards da IA, folha de louro nos do humano). Miudeza espalhada e peça repetida são poluição. Na dúvida, tira.
- **Aviso fora de foco.** Interface entra como um aviso perto da lente, inteiro fora de foco (`{ vidro: true, titulo, texto }`): "é desfocado, não efeito vidro. Ele desfoca o objeto, as bordas e o fundo, tudo igual". Nada de borda nítida. Ponha a ponta dele por cima de uma caixa, para o desfoque do fundo aparecer.
- **O acabamento da capa escura** (o que ele sentiu falta, olhando a do Leonardo): o desfoque nas pontas do título (`foco: { esq: 4, dir: 4 }`), a régua ao lado da moldura (`reguasAtras: true`, e não `semRegua`), o degradê na palavra amarela (`cor2: 'linear-gradient(90deg, #ffd000, #ffb000 45%, #ff7a00)'`) e uma luz vindo de cima, do canto, com fonte (o vagalume colado na lente; a luz dele por dentro da janela, no `panorama`, para não vazar na moldura, mais um `halo` em tela).
- **Até o fim.** O que atravessa a divisa não mostra o corte reto do recorte em card nenhum: olhe o card vizinho na `larga.jpg`.
- **A serifada é a Calango Serif** (mais larga que a antiga: confira as quebras de linha).
- **A chamada com o acabamento da capa.** "Diagrame a CTA melhor: efeito degradê no texto, desfoque nas bordas. Alinhe ele ao centro, ajuste a imagem": o bloco (comenta, a palavra e a frase do preço) junto e no meio, a palavra em degradê com o desfoque nas pontas, a régua atrás do que sai pela borda, e a cena embaixo, fechando a ideia da capa (lá as mãos quase se encostam, aqui se encostam).
- **O cursor e a assinatura.** A capa leva o cursor com o nome "calango" (`selo`), num lugar que não cubra palavra do título, e pode levar embaixo, no meio, a `assinatura` na Calango Signature a 15% ("Feito no Claude, por Calango"), "só pra não ficar vazio".

## 9. Os rabiscos (anotações à mão, desde 11/11/2026)

O dono mostrou cinco posts dele (o Halloween do Designer, o do portfólio, o "conteúdo massa vs conteúdo paia", o "arrume seu perfil" e o da sombra projetada) e disse: "esses posts têm uns rabiscos escritos bem escondidinho? Levemente desfocados, só pra dar um charme e rabisco na arte, como se alguém tivesse escrito ali. Uma comunicação mais informal, um comentário, anotação, sabe? Eu acho isso bonito! Você pode fazer de várias formas, em vários posts."

- **A letra é a Calango Ink** (`anotacoes: [{ texto, x, y, rot, tam, cor, op, blur, mistura, seta }]` no slide).
- **É detalhe.** "Sempre desfoque sutilmente só pra ficar mais mesclado, bem pouco. Mescle com efeito tela, multiplicar ou algum. Sempre com opacidade menor, pois é detalhe!" O padrão do modelo já é esse: 0,8 px de desfoque, 26% de opacidade (ele pediu menos ainda depois de ver: "precisa quase não aparecer"), tela no card escuro e multiplicar no claro. Pequeno (34 a 38 px), um pouco torto (2 a 4 graus).
- **A voz é de amigo no WhatsApp.** Exemplos dele: "anota essa mano! kkk", "sacou??", "presta atenção calango!", "mosca pra tu ver kkk", "se vacilar é vapooo!", "truuuucooo", "assina aí, vai", "olha o direct mano". O recado comenta o card: não repete o título, não traz dado novo, não tem travessão.
- **Onde.** Num vazio do card, perto do que ele comenta (ao lado do assunto, embaixo da caixa, perto do preço), nunca em cima de texto. Um por card, e não em todo card: em um carrossel de 8, uns 4 ou 5.
- Pode vir com uma setinha à mão (`seta`) apontando para o que comenta.
