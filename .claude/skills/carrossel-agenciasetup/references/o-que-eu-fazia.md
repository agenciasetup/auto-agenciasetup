# O que o Filipe fazia e não faz mais (o arquivo, 11/11/2026)

Pedido dele: "O time de Design vai estudar meus carrosséis antigos e ver o que eu fazia que não faço agora. Ex.: carrossel infinito, elementos voando entre os carrosséis, sombras realistas, profundidade, efeitos bonitos. Quero que colha isso pra gente."

**Como foi feito:** 28 carrosséis do @agenciasetup, de quatro épocas, com os slides baixados da conta (`node scripts/design-arquivo.mjs`; folhas em `_local/design-arquivo/folhas/`, só neste computador). Em cada época, os de melhor resultado e dois do meio da fila (para ver o estilo de todo dia); nos automáticos, os 3 melhores e os 2 piores. Antes de novembro de 2024 a nota não serve (o alcance antigo veio errado): ali a comparação é por curtidas, comentários e salvos.

| Época | O que é | Média por carrossel |
| --- | --- | --- |
| Auge (jun/2022 a ago/2023) | o perfil crescendo | 704 curtidas, 25 comentários |
| Depois do auge (set/2023 a out/2024) | | 863 curtidas, 57 comentários |
| À mão (nov/2024 a mai/2026) | ainda feitos por ele, com alcance medido | 746 curtidas, 135 comentários, nota mediana de 11 a 16 |
| Automáticos (out e nov/2026) | feitos pelo sistema | 119 curtidas, 26 comentários, nota mediana 6,3 em novembro |

Os números caíram junto com a mudança de jeito. Não dá para culpar só o design (o perfil, a época e o algoritmo também mudaram), mas a diferença é grande o bastante para trazer o jeito antigo de volta e medir.

## O que ele fazia e o sistema não faz

### 1. Carrossel infinito (panorama contínuo)
- **Como:** uma cena só, numa tela larga, cortada em slides. O fundo, a nuvem, a névoa, o chão e as folhas continuam na emenda; uma pincelada ou uma faixa atravessa os slides.
- **Onde:** o melhor é `b-meio-2024-04-26` (10 slides: girassol gigante, nuvens e abelhas em cinco slides, a pincelada rosa no preto; 3.372 curtidas, https://www.instagram.com/p/C6PSakZJOx1/). Também `a-auge-2023-04-07` (o fundo do mar laranja e preto), `a-auge-2023-04-08`, `05-30`, `04-19`, `06-22`, `c-mao-2025-10-28`, `2025-05-26`, `2025-11-04` e `2025-02-05`.
- **Época:** foi o padrão por três anos (2022 a novembro de 2025).
- **Hoje:** os automáticos até 11/11 não tinham. Desde 11/11/2026 o modelo faz: `panorama` (a cena larga por dentro das janelas) e `travessia` (o que passa por cima da moldura de um card para o outro), em coordenadas da tela larga. Veja o `LEIA.md` do modelo e o exemplo `conteudos/infinito-cores.js`.
- **Cuidado:** panorama sozinho não garante resultado (`a-auge-2023-07-29` e `b-meio-2024-09-24` têm e renderam pouco). Ele funciona junto com o assunto forte e o material.

### 2. Elemento que atravessa a divisa
- **Como:** uma peça recortada fica metade num slide e metade no seguinte (a lata, a tartaruga, o tronco, o girassol, a cabine telefônica, o poste). Peças pequenas (abelhas, folhas, penas, notas, anéis) ficam soltas pelos slides, algumas desfocadas, como se voassem de um para o outro.
- **Onde:** `a-auge-2023-04-08` (a lata entre 1 e 2), `2023-04-07` (a tartaruga e os corais), `b-meio-2024-04-26` (o girassol e as abelhas), `c-mao-2025-02-05` (a cabine entre 1 e 2, o poste entre 4 e 5), `2025-10-07` e `2025-10-28` (abelhas), `2025-01-27` (os anéis do Sonic).
- **Hoje:** não tem. O objeto fica dentro da janela.

### 3. Sombra realista
- **Como:** sombra projetada coerente com a luz (a lata, o lagarto no pedestal, a lanterna pendurada, o cartão branco que flutua sobre a cena) e sombra de contato embaixo do objeto (as fritas, a águia na pedra, o navegador, a bandeja de madeira).
- **Onde:** `a-auge-2023-04-08`, `2023-06-07`, `2023-04-07`, `2023-04-19`, `b-meio-2023-12-08`, `c-mao-2025-02-05`, `2025-05-26`, `2025-11-04`.
- **Hoje:** quase não tem. As janelas e os cartões ficam chapados.

### 4. Profundidade em três planos, também por dentro
- **Como:** frente desfocada (folha, galho, nuvem, flor), objeto nítido no meio, fundo suave. O texto fica atrás ou entre os objetos: "VISUAL" escondido pelas fritas, os bichos dentro das letras das fontes, o tubarão por cima de "CANAL".
- **Onde:** quase todo o auge e o à mão (`a-auge-2023-04-07`, `04-08`, `05-30`, `04-19`, `b-meio-2024-06-10`, `04-06`, `04-26`).
- **Hoje:** só na capa (o bicho ou o Filipe na frente da palavra grande). Os slides de dentro são planos.

### 5. A interface do editor como cenário
- **Como:** alças de seleção tracejadas, cursor, barra de ferramentas, ícone do Photoshop, slider de antes e depois, bloco pixelado revelando a nitidez. O post parece o bastidor do trabalho.
- **Onde:** `a-auge-2023-06-07`, `2023-07-29`, `b-meio-2024-06-10`, `2024-04-06`, `2024-09-24`, `c-mao-2025-02-05` (o mímico com as alças), `2025-05-26`, `2025-10-28`.
- **Hoje:** o sistema usa interface de verdade (o chat do Claude, a skill, as notificações), que é prova melhor. Falta o clima de bastidor em volta.

### 6. Bicho com atitude e personagem da cultura pop em todos os slides
- **Como:** animal vestido (chapéu, terno), pássaros coloridos, Sonic, GTA, Van Gogh em 3D, sempre ligados ao assunto do slide, e não só na capa.
- **Onde:** `a-auge-2023-06-07`, `2023-04-07`, `2023-05-30`, `2023-06-22`, `b-meio-2024-04-26`, `c-mao-2025-01-27`, `2025-05-12`.
- **Hoje:** em parte. O bicho aparece na capa (alpaca, cachorro), sem cultura pop e sem voltar nos slides de dentro. Personagem de marca continua só em post orgânico.

### 7. O material como cena (peça-presente)
- **Como:** o que a pessoa ganha vira objeto na cena: o baú brilhando, a bandeja de madeira com os elementos do pacote, o celular preso numa grade, o navegador mostrando o grid.
- **Onde:** `c-mao-2025-05-26` (2.095 comentários), `2025-11-04` (871), `2025-10-07` (779), `2025-07-13`, `2025-02-05` (2.587 comentários).
- **Hoje:** mais simples: a grade 2x2 de amostras e o cartão do curso, sem a cena.

### 8. O cartão claro dentro da cena
- **Como:** um cartão branco ou creme de cantos redondos, com sombra, corta a cena escura ou colorida e guarda o texto ou a paleta: uma janela dentro do panorama, e não o slide inteiro.
- **Onde:** `a-auge-2023-04-07` (o "AQUARIUM"), `2023-04-08`, `2023-05-30`, `2023-04-19`, `c-mao-2025-01-27`, `2025-02-05` (o grid).
- **Hoje:** o slide inteiro é a janela, sem cena em volta.

## O que continua igual
- Amarelo e laranja da marca, com preto, branco e creme.
- A headline condensada pesada com a manuscrita laranja.
- Cartões de amostra e de paleta, e "Comenta PALAVRA" no último slide.
- O Filipe ou um bicho na capa, e a capa carregando o carrossel.
- Mockup de tela e interface como prova.

Os automáticos trouxeram coisas boas: a prova com a interface real do Claude, o cartão da oferta com o preço, os passos numerados e o texto grande e legível. Os de só tipografia (`d-auto-2026-10-31`, 47 curtidas e 5 salvos; `d-auto-2026-11-10-posts`, 13 curtidas e nenhum salvo) são os piores do arquivo.

## Os gabaritos antigos (olhe antes da ficha da capa)
1. `a-auge-2023-04-07`: o carrossel com mais salvos do arquivo (5.732). A receita inteira: o fundo do mar contínuo, os bichos dentro das letras, o cartão branco no meio, sombra e profundidade. https://www.instagram.com/p/Cqv84-RgghP/
2. `c-mao-2025-10-28`: o panorama mais recente, com 35 mil de alcance, 1.476 compartilhamentos e nota 35,4. O tema (texturas) é parente do FUNDOS de hoje. https://www.instagram.com/p/DQWpW28ERax/
3. `c-mao-2025-02-05`: 2.587 comentários e nota 34,1. Camadas, a cabine cruzando a divisa, o navegador com sombra e o fechamento "Comenta GRID": o melhor para copiar o jeito de vender um material. https://www.instagram.com/p/DFtL13lS8p7/
4. `b-meio-2024-04-26`: a melhor aula de panorama longo (10 slides). https://www.instagram.com/p/C6PSakZJOx1/

As folhas (os slides lado a lado, sem espaço) estão em `_local/design-arquivo/folhas/<nome>.jpg`, e cada slide em tamanho cheio em `_local/design-arquivo/<nome>/`.

## A decisão do Filipe (11/11/2026)
"Ao invés de você codificar um arquivo 1080x1350 + 1080x1350 + 1080x1350... faz um 3240x1350. Dessa forma você só cria margens que dividem a cada 1080 (tipo fatias) e aí você consegue colocar essas imagens entre cards. Pode manter as molduras pretas, mas pode ter elementos que ficam por cima delas de um card pro outro. Podemos manter um estilo novo top. Esse com a imagem do Van Gogh, com as abelhas, o girassol no meio de dois cards... é lindo!"
- As molduras pretas ficam. A cena contínua passa por dentro das janelas, e o que atravessa sai por cima da moldura.
- O gabarito do jeito novo é `b-meio-2024-04-26` (o Van Gogh, o girassol entre dois cards, as abelhas).
