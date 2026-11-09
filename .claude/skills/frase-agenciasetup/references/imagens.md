# Imagens dos posts de frase

O Filipe pediu isto em 29/10/2026, sobre a série "eu te amo, em 7 línguas":
- "Sinto um vazio muito grande ali em cima": o espaço vazio da janela ganha uma imagem com motivo, e o card de oferta ganha o mockup do curso.
- Na mesma noite: "os recortes ficaram uma merda... separar em duas camadas, o fundo e o café", "a xícara alinhada pra esquerda, igual o texto, e maior", "senti falta do ruído, halftone".

## Qual objeto usar

**O café não é mais o padrão.** Em 30/10/2026, sobre o post "o post que você não postou tem zero chance de viralizar", com um zero na espuma, o Filipe disse: "não gostei de usar um café de novo. Poderia usar outra coisa."

- Escolha um objeto que conte aquela frase. Pergunte "por que este objeto, nesta frase?". Se a resposta servir para qualquer frase, troque.
- Não repita o objeto de um post para o outro: olhe a fila antes.
- O café só volta se o Filipe pedir. As instruções abaixo valem para qualquer objeto visto de cima sobre preto puro; a fumaça só entra quando o objeto solta fumaça de verdade.

## O objeto visto de cima, em camadas (o exemplo do café)

Na série "eu te amo", com a frase embaixo (`pos: 'baixo'`), o espaço de cima recebeu uma xícara de cappuccino vista de cima, com fumacinha.

- **Capa:** o desenho na espuma conta o tema do post (o coração no post de amor).
- **Cada slide da série:** o ícone do assunto do slide na espuma. Exemplos que já funcionaram:
  - Claude: a estrela de raios finos;
  - designer: o bico de caneta;
  - cliente: o "ok" de aprovado;
  - Instagram: a câmera;
  - freela: o Pix;
  - IA: o brilho;
  - social media: o calendário com o "ok";
  - "manda pra": o aviãozinho de enviar.
- **Outro objeto além do café**, se o tema pedir (um notebook fechado, um celular, um caderno): sempre visto de cima e no mesmo fundo preto puro. A série inteira usa o mesmo objeto.
- **Não use** quando a frase fica no meio e enche a janela (o post de 1 frase, como o "Max 20x"). Ali a frase é a imagem.

### As camadas (nunca um recorte redondo com a borda esfumada)

O recorte redondo esfumado foi reprovado: "claramente um recorte". A imagem entra em três camadas:

1. **O fundo da janela.** O tema `preto` já tem o degradê.
2. **A luz** (`<nome>-luz.jpg`): a foto sobre fundo preto puro, com os pretos fechados, só na região do vapor. Ela entra no modo tela, então o preto some e ficam só a fumaça e a luz, sem disco nem borda. Ela some aos poucos acima da xícara (`fumaca`, padrão 0,3 da altura da xícara), para não bater no cabeçalho nem ser cortada pela borda da janela.
3. **A xícara recortada** (`<nome>-xicara.png`), por cima. A sombra vai para baixo e para a direita, porque a luz da foto vem do alto à esquerda.

**Posição:**
- A xícara fica alinhada à esquerda com o texto (`x: 92`) e é grande. Na capa e no slide sem rótulo, `w: 500`. Na série com rótulo, `w: 400`, o mesmo tamanho em todos os slides.
- **Ela encosta no texto de cada card** (`perto: 40`): o pé da xícara fica 40 px acima do rótulo, medido depois que a frase se ajusta.
- **A altura muda de card para card.** O Filipe reprovou o padrão reto: "cada card o café pode se alinhar melhor próximo do texto, não precisa ficar tudo reto". Card de 2 linhas tem a xícara mais baixa que card de 4.
- O `y` é só o limite de cima, para não bater no cabeçalho: 175 na capa, 130 na série.
- O `w` e o `y` são da xícara, não da foto.

O conteúdo usa um ajudante, como em `templates/frase/conteudos/eu-te-amo-no-digital.js`:

```js
const cafe = (nome, w, y) => ({ arq: `imagens/cafe/preto/${nome}-luz.jpg`, recorte: `imagens/cafe/preto/${nome}-xicara.png`, caixa: CAIXAS[nome], x: 92, y, w, perto: 40 });
// slide: { rotulo: 'em Claude:', texto: '...', imagem: cafe('claude', 400, 130) }
```

### Como gerar (de graça) e montar as camadas

1. **Gerar** no site do Magnific, pelo Chrome do Windows (selecione esse navegador antes; o do MacBook é reserva):
   - abra o projeto **Agência Setup · Posts de frase** e o Image Generator (Nano Banana Pro, 1:1, 2K; confira o formato, que muda ao recarregar);
   - uma imagem por clique em Generate;
   - para trocar o pedido, limpe a caixa com JavaScript antes, senão os pedidos se somam.
2. **Baixar** os PNG pelo conector, que só lê e não gasta crédito: `creations_search` com `from: project-root` e a referência do projeto, depois `creations_get` e `curl` na `url`. Guarde em `templates/frase/imagens/cafe/preto/<nome>.png`.
3. **Recortar no computador:** `node scripts/recortar.mjs templates/frase/imagens/cafe/preto templates/frase/imagens/cafe/preto/recorte`.
4. **Montar as camadas:** `_local/recorte/venv/Scripts/python.exe -I templates/frase/camadas.py templates/frase/imagens/cafe/preto`. Ele grava `-luz.jpg`, `-xicara.png` e `caixas.json`; copie as caixas para o conteúdo.

Pelo conector do Magnific (`images_generate`) cada imagem custa 75 créditos: só com aviso e ok.

Pedido base, trocando só o desenho:

```
Overhead top-down studio photo looking straight down at a single cappuccino in a matte off-white ceramic cup on a
matching saucer. Latte art in the milk foam [shaped like ...], drawn cleanly with steamed milk and easy to recognize.
Soft wisps of white steam rising from the cup and drifting upward and slightly to the right, clearly visible and
delicate. Pure solid black background (#000000) everywhere around the saucer: no table, no surface texture, no gradient,
no vignette, no reflections, no cast shadow visible. Soft warm key light from the upper left on the cup only. The cup and
saucer take about 50% of the frame width, placed in the lower center of the frame, with the steam in the upper part.
Realistic premium product photography, sharp focus. No text, no letters, no words, no spoon, no hands, no other objects.
```

**O que aprendemos:**
- Fundo preto puro é o que deixa a fumaça entrar sem borda. Foto sobre mesa ou fundo texturizado não serve para camadas.
- O modelo às vezes põe uma luz num canto. O `camadas.py` só usa a região do vapor, então ela não vaza.
- **Claude:**
  - "asterisco com pontas redondas" vira flor;
  - "twelve thin straight rays" vira sol ou bússola, que o Filipe reprovou ("a logo do Claude tá diferente");
  - use: "the Claude AI logo: a bold irregular starburst spark of about eleven thick tapered rays of clearly uneven lengths, wide near the center and narrowing to soft rounded ends ... dusted in terracotta orange cinnamon color".
- Ícone simples (câmera, calendário, "ok", aviãozinho) sai certo de primeira.
- Vários objetos juntos (bolas de papel, 1/11/2026): pedir "pile" sai em roseta simétrica, que de longe parece flor. Peça um monte bagunçado, com tamanhos diferentes e um ou dois afastados, e luz branca neutra, senão o papel sai bege de um lado e lilás do outro.

- Etiqueta de preço (2/11/2026): saiu limpa de primeira, mas a tinta escura puxou para o roxo. Confira a cor do que é "preto" na foto e tire a saturação só dela, sem mexer no resto (a capa não leva roxo).

- Objeto de frente, simétrico e parado (cadeado, 4/11/2026) parece foto de catálogo e deixa vazio do lado. Peça o objeto **na diagonal**, deitado e visto um pouco de cima (o carimbo do "aprovado" saiu assim e ficou vivo), e use `w` perto de 500.

- Celular com a tela acesa (galeria de referências, 5/11/2026): o Nano Banana deixa o fundo num degradê cinza, não preto puro, e a camada de luz mostrou um retângulo claro em volta. Objeto sem fumaça nem brilho a somar: troque o `-luz.jpg` por um quadrado preto (`ffmpeg -f lavfi -i color=black:s=1200x1200 -frames:v 1 <nome>-luz.jpg`) e fique só com o recorte. A tela sai como mural de cartões com letras sem sentido; para uma galeria de verdade, peça "tight square photo grid with no gaps, abstract images, no readable text".
- Objeto com chama e parte escura (fósforo queimando, 9/11/2026): saiu limpo de primeira, com fumaça de verdade. O recorte perde a parte carbonizada (escuro sobre preto), mas a camada de luz no modo tela devolve a chama, a fumaça e a cabeça queimada, e o recorte segura a madeira clara: juntos ficam sem borda. Use `fumaca: 0.8` para a fumaça subir e sumir antes do cabeçalho. O `recortar.mjs` padrão estourou a memória nessa foto; `--modelo hr-matting` resolveu.
- A fila do modo ilimitado do Magnific pode levar uns 4 minutos por imagem. Peça 2 opções, não 3, e cancele na fila as que não vai usar.
- O `perto` não vence o `y`: se o objeto não cabe entre o `y` e o texto, ele cobre o rótulo. Diminua o `w` (ou o `tamanho` da frase) até sobrar o espaço, e confira ampliando a junta do objeto com o rótulo.

## A textura (etapa 5)

Igual aos carrosséis da agência, e mais forte desde 30/10/2026 ("um pouco mais de texturinha de ruído e halftone"). Já vem no modelo (`templates/frase/modelo.css` e `modelo.js`):
- **Ruído de filme:** preto 0,72 (`soft-light`), branco 0,36 (`multiply`), foto 0,46 (`overlay`).
- **Meio-tom no fundo:** pontos pequenos a cada 3 px; preto 0,09, branco e foto 0,075.
- **Pontinhos dentro da letra da frase:** textura de impressão. O destaque laranja fica liso.
- **Poeirinhas:** pontos de tamanhos diferentes e um ou outro fiapo, fora do miolo e do cabeçalho, sempre os mesmos em cada slide.

Sem a etapa 5, o post parece arte digital lisa.

## O mockup do curso (card de oferta)

O card de oferta mostra a página de venda do mini curso num notebook:

```js
imagem: { arq: 'imagens/curso-tela.jpg', moldura: 'notebook', x: 190, y: 135, w: 620, rot: -3 },
```

Nesse card, a frase vai embaixo (`pos: 'baixo'`, `tamanho: 100`) com o `apoio` e o botão "Comenta POSTS".

A tela sai de `node templates/frase/mockup-curso.mjs`, que fotografa o topo de `agenciasetup.com.br/cursos/posts-automaticos`. Rode de novo quando a página de venda mudar (título, preço, VSL).

## Avaliar o acabamento como profissional (antes de mostrar ao Filipe)

Abra cada JPEG final e amplie as bordas (`ffmpeg -i NN.jpg -vf "crop=300:300:x:y,scale=600:600:flags=neighbor" zoom.jpg`). Responda com honestidade se **parece profissional ou amador**. O Filipe percebe na hora, e "quase bom" volta.

- [ ] **Recorte:** a borda da xícara está limpa, sem halo claro ou escuro, sem pedaço comido do pires ou da alça.
- [ ] **Fade:** nenhum disco, quadrado ou mancha mostrando onde a foto acaba. A fumaça some aos poucos e não é cortada pela borda da janela nem bate no cabeçalho.
- [ ] **Luz e sombra:** a sombra cai do mesmo lado da luz da foto e o objeto parece apoiado, não colado.
- [ ] **Alinhamento:** a xícara alinhada com o texto à esquerda e encostada nele (`perto`), com o mesmo tamanho na série. A altura acompanha o texto, não um padrão reto.
- [ ] **Ícone fiel:** a logo ou o ícone na espuma parece o de verdade. A estrela do Claude é uma faísca de raios grossos, de tamanhos diferentes e pontas redondas, cor de terracota. Raio fino como de sol ou de bússola não serve.
- [ ] **Espaço:** nada encosta na frase nem no cabeçalho.
- [ ] **Textura:** o ruído, o meio-tom e as poeirinhas aparecem a 100%, sem sujar a leitura.
- [ ] **Letra inteira:** a perna do g, do p e do j na última linha da frase aparece até o fim. Em 31/10/2026 o "g" de "energia" saiu cortado pela textura da letra (corrigido em `modelo.css`); confira sempre.
- [ ] **Teste do feed:** a capa, vista pequena, parece post de perfil grande, não montagem.

Se alguma resposta for "amador", corrija antes de entregar: outra geração, o recorte de novo (`--modelo hr-matting`), a máscara da fumaça ou outra posição. Não mande "quase bom".
