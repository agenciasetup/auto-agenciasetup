# O modelo em código (`templates/carrossel/`)

Cada slide é HTML em camadas, fotografado pelo Chrome em JPEG 1080 × 1350. O conteúdo de cada carrossel é um arquivo em `templates/carrossel/conteudos/<nome>.js`. Use `criado-no-claude.js` como exemplo vivo: copie, troque textos, imagens e provas. O `LEIA.md` da pasta tem os detalhes.

## Comandos (PowerShell, na raiz do repositório)

```
node scripts/carrossel.mjs <nome> --etapa 1     # etapa 1: o mínimo (sem efeito, sem textura) -> _local/carrossel/<nome>/etapa-1/
node scripts/carrossel.mjs <nome> --etapa 3     # etapa 3: com efeitos, sem textura           -> etapa-3/
node scripts/carrossel.mjs <nome>               # final (etapa 5): slides, capas extras e previa.jpg
node scripts/carrossel.mjs <nome> --so 1,7      # só alguns slides
node scripts/carrossel-zoom.mjs <nome> <slide> <x> <y> <largura> <altura> [etapa]   # recorte ampliado para conferir
node scripts/lado-a-lado.mjs <imagem> <imagem> [...]                                  # fotos lado a lado (identidade)
```

Ver um slide no navegador: `templates/carrossel/modelo.html?c=<nome>&s=<n>&tema=<amarelo|preto|branco>&etapa=<1|3|5>`.

## As camadas

| Camada | O que vai |
| --- | --- |
| 4 acabamento | janela (— e ×), cabeçalho e selo da `marca`, réguas (só capa e chamada), linha de progresso |
| 3 frente | `folhas` (podem vazar a janela), notificação, blocos por cima da foto |
| 2 assunto | o assunto recortado (rosto, bicho ou objeto; filtro `#recorte`) e a `nevoa` (na frente dele, presa na janela) |
| título de trás | a palavra grande e as linhas de apoio, atrás do Filipe |
| 1 detalhes | textinhos, rabiscos, palavra vazada (só com motivo; na capa, nunca) |
| 0 fundo | cor do tema, degradê, luz, vinheta |

Por cima de tudo, na etapa 5 (já vem pronto, não ponha na mão):
- **Grão de filme** (`--grao-forca`): amarelo 0,88, preto 1, branco 0,48.
- **Meio-tom de pontos pequenos** (a cada 3 px, `--meio-tom`): preto 0,1, amarelo e branco 0,075.
- **Poeirinhas** (`poeira()` em `modelo.js`): pontos de tamanhos diferentes e um ou outro fiapo, fora do miolo e do cabeçalho, sempre os mesmos em cada slide.

Mudou esses valores, mude também no modelo de frases (`templates/frase/`).

## O arquivo de conteúdo

```js
window.CARROSSEL = {
  nome: 'meu-carrossel',
  marca: { perfil: '@agenciasetup', nome: 'Calango' }, // inglês: { perfil: '@setupagency_eng', nome: 'Setup Agency', selo: 'setup' }
  capas: ['amarelo'],            // capas extras saem como capa-<tema>.jpg (só se pedirem variação)
  legenda: '...',                // a legenda do post, pelo molde de voz.md
  palavra: 'PALAVRA',
  slides: [ /* capa, miolos, chamada */ ],
};
```

### Slide pronto (`tipo: 'foto'`)

Uma imagem 1080 × 1350 feita fora do modelo entra inteira: `{ tipo: 'foto', arq: '../../_local/...jpg', titulo: '...' }`. Foi usado na capa "cinema" de 24/10/2026, que o Filipe reprovou: a capa e a chamada são os tipos abaixo.

### Capa (`tipo: 'capa'`)

```js
{
  tipo: 'capa', tema: 'amarelo', luzX: '50%', luzY: '46%',
  luz: { x: 520, y: 560, r: 950 },                       // luz de fundo em modo tela (a fonte da luz de recorte)
  titulo: {
    pre: 'esse <span class="serifa">carrossel</span> foi',  // linha de cima (alinha sozinha à direita da palavra)
    script: 'C', fonteScript: 'Great Vibes', scriptTam: 350, // letra de floreio, por cima da condensada
    condensada: 'RIADO', tam: 270, y: 250, encaixe: -0.18,  // a palavra grande (y = topo, em px do slide)
    foco: { esq: 5, dir: 15, centro: [0.3, 0.62] },          // desfoque progressivo nas pontas (etapa 3)
    pos: 'no <span class="serifa">Claude</span>', posTam: 44, // linha de baixo (alinha sozinha)
  },
  assunto: { arq: 'filipe-celular.png', x: -100, y: 190, w: 1140, sombraX: 30, sombraY: 24,
             foco: { angulo: 130, de: 0.55, ate: 0.9, max: 6 } }, // desfoque no que está perto da câmera
  notificacao: { y: 1060, app: 'Claude', quando: 'agora', texto: '...' },
  folhas: [{ arq: 'petalas.png', x: -170, y: 980, w: 520, rot: 18, blur: 20, luz: 1 }],
  selo: { aponta: '.pos-titulo .serifa', ponto: [0.55, 0.88], pequeno: true }, // ponta do cursor na palavra
}
```

- A foto precisa chegar até a borda da janela (x + w ≥ 1040) quando o corpo é cortado pela própria imagem.
- Se o cabelo encostar na linha de baixo, mova a foto ou diminua `posTam`. Texto nunca fica atrás do cabelo.
- O exemplo acima tem foto do Filipe e `notificacao`. Em lista e material, o padrão é mais limpo: só título, assunto e selo.

**A foto como cena (bicho ou objeto).** A própria foto no `fundoFoto` e o recorte dela no `assunto`, na mesma caixa, com o título entre os dois:
```js
fundoFoto: { arq: 'alpaca-cena.jpg', x: -10, y: -40, w: 1100 },
assunto: { arq: 'bicho-alpaca.png', x: -10, y: 100, w: 1100, cru: true, brilho: false },
```
Para o assunto descer sem emenda, `python templates/carrossel/ferramentas/cena.py <foto> <saida.jpg> <desce> <largura>` continua o topo da foto para cima e diz o `y`. Os lados nunca.

**O título, além do básico:**
- `script: ''` deixa só a condensada. `fonteScript`, `scriptTam`, `scriptForte` (quanto o floreio pesa).
- `linha2`, `tam2`, `y2`, `dx2`: segunda linha. `bloco`: largura em px, com as duas linhas ajustadas a ela. `vao`: o espaço entre as duas. **Headline em duas linhas sempre em `bloco`** (o dono, 11/11/2026: "a headline deve ter o mesmo tamanho as duas linhas nesse estilo, mesmo que a fonte fique de tamanho diferente"), na largura do elemento principal da capa (o quadro atrás do Van Gogh): isso abre espaço ao lado do assunto para o texto pequeno.
- `posFrente: true`: o texto pequeno de baixo ("um designer") vai para a frente do assunto, e o assunto pode encostar na headline sem esconder o texto.
- `fonte1`, `cor1`, `fonte2`, `cor2`, `foco2`: fonte, cor (aceita `linear-gradient`) e desfoque de cada linha.
- `cor`, `corScript`: cor do título. `dx`: desloca o conjunto (floreio pesa pouco, compense). `foco.min`: desfoque mínimo em toda a palavra.
- O título não tem sombra ("sombra é feio"). `semSombra: false` existe só para as capas antigas já aprovadas: não use em peça nova.
- `posEspaco`: onde entra a linha de baixo, para ela não ficar atrás do assunto.

Exemplos prontos em `_local/novos-posts/gerar.mjs`, onde estão os 8 conteúdos de 30/10/2026.

### Miolo (`tipo: 'miolo'`)

```js
{ tipo: 'miolo', tema: 'preto', rotulo: 'passo 1',          // ou rotulo: 'Calango,', vocativo: true
  titulo: 'Primeiro, ele <span class="serifa">leu</span> o perfil.',
  texto: 'Apoio curto, com <b>o número</b> que importa.',
  prova: { tipo: '...' } }
```

Provas (uma por slide):
- `conversa`: `{ eu: 'o pedido', ia: 'a resposta do Claude' }`
- `numeros`: `{ itens: [{ v: '111', t: 'legenda' }, { v: '13', t: 'legenda', fraco: true }], pe: 'fonte do número' }`
- `lista`: `{ itens: [{ calor: 84, t: 'título', fonte: 'de onde veio' }] }`
- `notificacoes`: `{ itens: [{ icone: 'logo'|'conversa'|'baixar'|'claude', app, quando, texto }] }`
- `camadas`: `{ camadas: [{ arq: 'fundo'|'titulo'|'assunto'|'frente'|'acabamento', nome, desc }] }` (de baixo para cima). O exportador gera as camadas reais da capa em `_local/carrossel/<nome>/camadas/` antes de fotografar os slides.
- `exemplo`: `{ cor|fundo, tinta, legenda, html }`, a dica aplicada num quadro de verdade. É o que substitui conversa inventada.
- `fonte`, `combo`, `grade`: a amostra ocupando o card, para lista salvável (uma fonte aplicada, a dupla de cores, a grade de fundos). Veja `modelo.js` e `_local/novos-posts/gerar.mjs`.

Bloco `escrito` `{ x, y, w, rot, tam, cor, html, classe }`: texto solto em cima da foto, só com motivo.

### Chamada (`tipo: 'chamada'`)

```js
{ tipo: 'chamada', tema: 'amarelo', luz: { x: 560, y: 520, r: 950 },
  titulo: { pre: 'comenta', condensada: 'PALAVRA', centro: true, y: 225, tam: 340 }, // no centro, como a capa
  assunto: { foto: true, arq: 'filipe-sorriso.png', x: -36, y: 170, w: 1200 },
  blocos: [{ tipo: 'nota', x: 110, y: 1030, w: 860, tam: 38, solido: true, html: 'o que a pessoa recebe' }],
  selo: { aponta: '.palavra-chamada', pequeno: true } }
```

Com `centro: true`, o "comenta" e a nota centralizam, a palavra encolhe sozinha para caber em `larg` (padrão 860) e o selo fica no canto dela. `tam` por tamanho da palavra: até 3 letras, 420; até 5, 340; 6, 300; mais, 400 (ela encolhe). Palavra pequena foi "pequeno e feio".

### Carrossel infinito (`panorama` e `travessia`, desde 11/11/2026)

No carrossel (fora de `slides`), em coordenadas da tela larga: x de 0 a 1080 vezes o número de cards; a divisa entre o card 1 e o 2 é x = 1080. Cada card mostra a sua fatia, e a emenda casa no pixel. As molduras pretas ficam (decisão do Filipe em 11/11: "pode manter as molduras pretas, mas pode ter elementos que ficam por cima delas de um card pro outro").
- `panorama: { arq, x, y, w, blur, luz, op }`: a cena larga por dentro das janelas, passando por trás da moldura entre os cards. `semPanorama: true` no slide que não quer.
- `travessia: [{ arq, x, y, w, rot, espelho, blur, luz, op, sombra, acima }]`: o que atravessa por cima da moldura. Sem `z`, sombra realista por padrão (contato e projetada), sem sombra quando tem `blur`; com `z`, sombra só com `sombra: true`, para o que está perto de uma superfície (nada que voa ou sai da borda de baixo); `acima: true` passa também por cima do cabeçalho e do progresso. `semTravessia: true` no slide que não quer.
- Sai também `larga.jpg` (a tela inteira em tamanho real): confira a emenda ali. Exemplo: `conteudos/infinito-cores.js`. Detalhes e cuidados no `LEIA.md` do modelo.
- **Distância em cada elemento (`z`, de -1 o fundo a 1 colado na lente):** o desfoque e a sombra saem dela, e o exportador salva o `profundidade.jpg` (o mapa). Um exemplar nítido de cada coisa por plano, nos tamanhos de verdade; poucos elementos. Luz por cima: `{ halo: true, x, y, d, cor, op }`. Slide de dentro com `lado: 'esquerda'|'direita'` e `semTrilho`.
- Cor para a cena em cada elemento: `matiz`, `sat`, `luz`. Vagalumes em código: `{ vagalume: true, x, y, r, blur, op }` (o foco segue a distância do assunto). Os fundos podem alternar (o panorama é opcional).
- **Os elementos vêm da biblioteca** `templates/biblioteca/` (procure no `LEIA.md` de lá antes de gerar): `arq: '../../biblioteca/<arquivo>'`. Elemento novo: gere sozinho no Magnific (nunca a cena inteira, regra do dono de 11/11/2026) e guarde com `node scripts/biblioteca.mjs adicionar <imagem> <tema/pasta> <nome> "<o que é>"`.

## O que o modelo já faz sozinho (não refaça na mão)

- Alinha as linhas de apoio e o selo depois que as fontes carregam (`alinhar()` em `modelo.js`).
- Desfoque progressivo sem letra dupla (cópias somadas com `plus-lighter`).
- Filtro `#recorte`: fecha furos do cabelo, come 1 px da borda, suaviza.
- Etapas: `etapa-1` esconde efeitos e textura; `etapa-3` esconde só a textura (ruído, meio-tom e poeira).
- A palavra em destaque dos títulos do miolo nunca quebra de linha.

## Fontes

Calango Condensed Black (palavra condensada, a fonte da agência desde 11/11/2026, em `templates/fontes/`; a Anton fica de reserva e nas capas antigas, com `vars: { 'fonte-condensada': "'Anton', sans-serif", 'peso-condensada': 400 }`), Calango Signature (floreio da capa, da agência; a Great Vibes só nas antigas, por `fonteScript`), Instrument Serif itálico (destaque e números), Outfit (textos), Inter (notificações iOS), JetBrains Mono (rótulos). A Ballet e a Pinyon foram testadas para o floreio: a Ballet escondia o C, a Pinyon ficava fraca.
