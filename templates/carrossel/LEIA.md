# Modelo de carrossel (Instagram 4:5)

Carrossel no visual de 2026 da @agenciasetup, montado em código: cada slide é HTML em camadas e sai em JPEG 1080 × 1350 pelo Chrome.

**O processo completo (pauta, texto no jeito do Filipe, capa intencional, foto dele, as 5 etapas e as verificações) está na skill `carrossel-agenciasetup`** (`.claude/skills/`, no painel em Claude > Skills e no conector com `ver_skill`). Este LEIA é o manual do modelo; a skill é o roteiro de cada post.

```
node scripts/carrossel.mjs criado-no-claude --etapa 1   # etapa 1: só o mínimo, sem efeito nem textura
node scripts/carrossel.mjs criado-no-claude --etapa 3   # etapa 3: com os efeitos, sem textura
node scripts/carrossel.mjs criado-no-claude             # a peça final (etapa 5), as capas extras e a prévia
node scripts/carrossel.mjs criado-no-claude --so 1      # só a capa (e as variações)
```

Sai em `_local/carrossel/<nome>/` (`01.jpg` ... `07.jpg`, `capa-preto.jpg`, `capa-branco.jpg`, `previa.jpg`); as etapas 1 e 3 saem em `etapa-1/` e `etapa-3/`. Para ver um slide no navegador: `templates/carrossel/modelo.html?c=<nome>&s=<n>&tema=<amarelo|preto|branco>&etapa=<1|3|5>`.

## A capa "cinema" foi reprovada (24/10/2026)

Em 24/10/2026 testei uma capa sem efeito em `templates/capa-cinema/` (foto inteira de fundo, Anton + Outfit). Os slides prontos entram no conteúdo como `{ tipo: 'foto', arq: ... }`. O Filipe reprovou: "tirou o estilo clean, tirou os desfoques, mudou fonte; antes estava melhor". A capa e a chamada continuam sendo as deste modelo (versão 4, abaixo); o que se corrige é o acabamento (recorte limpo, sem halo branco, fundo desfocado atrás do título).

## A regra das 5 etapas (do Filipe, vale para toda peça)

1. **Mínimo bem feito primeiro.** Organiza tudo e finaliza sem efeito, sem ruído, sem meio-tom (`--etapa 1`).
2. **Revisa** a diagramação, a intenção do fundo (preto, branco, amarelo) e a intenção de cada elemento.
3. Ficou bom? **Efeitos onde faz sentido** (`--etapa 3`): luz que vem de algum lugar, desfoque do que está perto da câmera, brilho onde a luz bate. Nunca aleatório.
4. **Revisa** se algum efeito ficou sem sentido. Flare solto no canto de cada slide, por exemplo, não liga um card ao outro: sai.
5. Ficou bom? **Ruído, meio-tom, poeirinhas e contraste** (a peça final; já vêm no modelo).

Nada sem intenção, nada sem propósito. Sempre conferir se não poluiu.

## As camadas

| Camada | O que vai | Como |
| --- | --- | --- |
| 4 | Acabamento: janela (— e ×), cabeçalho, réguas (só capa e chamada), selo "calango", linha de progresso | por cima de tudo, pode vazar a borda |
| 3 | Profundidade: pétalas desfocadas na frente, notificação e blocos por cima da foto | por cima do assunto |
| 2 | Assunto recortado (rosto, bicho ou objeto, PNG sem fundo) e a `nevoa` na frente dele | dentro da janela |
| título de trás | A palavra condensada gigante e as linhas de cima e de baixo. O assunto passa NA FRENTE: é a profundidade da marca | entre 1 e 2 |
| 1 | Detalhes do fundo: textinhos, rabiscos, palavra vazada, desfocados. Só com motivo; na capa, nunca | dentro da janela |
| 0 | Fundo: cor do tema, degradê, luz e vinheta | dentro da janela |

## Capa (versão 4, 23/10/2026)

Gabarito: as capas da agência em `referencias/capas/` (o LEIA de lá diz o que cada uma ensina; `gabarito-alpaca.jpg` e `gabarito-pinguim.jpg` são as sem rosto de 30/10/2026). **O padrão atual, com título, chamada, imagem e efeitos, está em `references/profundidade.md` da skill.**

- **O assunto alterna:** o Filipe (foto real, rosto idêntico, pele limpa sem alisar), um bicho chamativo ou um objeto. Olhe os vizinhos da fila.
- **Recorte:** gere a foto num fundo de estúdio da cor do tema (amarelo-laranja para a capa amarela), nunca em fundo preto: cabelo escuro em fundo preto vira borda serrilhada e furada. Use `node scripts/recortar.mjs <foto> <saida> --modelo hr-matting` e compare com a original. O filtro `#recorte` (em `modelo.html`) ainda fecha os furos, come 1 px da borda e suaviza. Foto bem recortada em fundo claro: `assunto.cru: true`.
- Palavra grande: letra de floreio (Calango Signature; a Great Vibes nas antigas) **por cima** da condensada, sem sombra ("sombra é feio"; `semSombra: false` só nas capas antigas já aprovadas). Duas linhas formam um bloco (`linha2`, `bloco`). O título fica longe da margem de cima.
- Linha de cima e linha de baixo **alinhadas à borda direita da palavra grande** (como "Todos os nossos CURSOS"), nunca soltas. O modelo mede e alinha sozinho depois das fontes (`alinhar()` em `modelo.js`).
- Selo com a ponta do cursor na palavra que importa (`selo.aponta` + `ponto`), nunca em cima do rosto. O texto dele vem de `marca.selo` (padrão "calango"; no inglês, "setup").
- Notificação no estilo iOS com o símbolo do app, só quando conta o post.
- Efeitos (etapa 3), cada um com motivo: desfoque progressivo nas pontas do título; desfoque no que está mais perto da câmera. Fora: flare, pôr do sol, halo colado no assunto, sombra em texto, elemento voando sem motivo.
- Nada de símbolo gigante no fundo, textinhos, rabiscos, lápis ou vidro na capa: polui.

## Chamada

A palavra fica grande e no centro, como o título da capa: `titulo: { pre: 'comenta', condensada: 'PALAVRA', centro: true, y: 225, tam: 340 }`. O "comenta" e a nota centralizam, a palavra se ajusta a `larg` (padrão 860) e o assunto passa um pouquinho por cima.

## Slides de dentro (`miolo`)

No padrão dos carrosséis do perfil: **um assunto só, centralizado, com margem larga** (150 px de cada lado) e **uma prova** por slide. Fundos alternando preto e branco, com intenção; a chamada volta ao amarelo para fechar onde a capa começou.

- `rotulo` (pequeno, em mono: "passo 1"; ou o vocativo "Calango," com `vocativo: true`), `titulo` (fino, com uma palavra em serifa laranja), `texto` (curto) e `prova`.
- Provas: `conversa` (o pedido e a resposta do Claude), `numeros` (o que importa em laranja x a comparação), `lista` (pautas com o calor), `notificacoes` (empilhadas com "+" entre elas, como as vendas aprovadas) e `camadas` (a capa de verdade desmontada: o `scripts/carrossel.mjs` exporta cada camada da capa com `&so=` em `_local/carrossel/<nome>/camadas/`, e o slide empilha as cinco com o mesmo espaço e o nome de cada uma ao lado, ligado por uma linha; sem números).
- A palavra em destaque do título nunca quebra ("5 camadas" na mesma linha).
- Textura (etapa 5): meio-tom com pontos pequenos (a cada 3 px, também dentro das letras), ruído de grão graúdo e poeirinhas fora do miolo. Os valores estão em `modelo.css` (`--grao-forca`, `--meio-tom`) e a poeira em `poeira()`, no `modelo.js`.
- Sem régua, sem flare, sem efeito solto. A linha de baixo (`trilho`) mostra em que ponto do carrossel a pessoa está: é o que liga um card ao outro.

## Provas e recursos novos (24/10/2026)

- `imagem` `{ arq, w, legenda }`: um print ou uma arte num cartão, com a legenda numa pílula (ex.: a arte do ChatGPT de um prompt só).
- `versus-imagens` `{ itens: [{ arq, legenda, fraco }] }`: duas imagens com "x" no meio.
- `galeria` `{ itens: [3 imagens], legenda }`: os slides de outro carrossel em leque (o do meio na frente).
- `oferta` `{ imagem, titulo, itens, preco, pe }`: o cartão do mini curso (o slide que vende antes da chamada).
- `checklist` `{ itens }`, `codigo` `{ arquivo, linhas }` (um arquivo de verdade aberto, como o SKILL.md) e `linha-do-tempo` (o card animado).
- `numeros` aceita `tam` (palavra em vez de número: "horas" x "min").
- Capa: `blocos` (ex.: `menu`, o clique direito com "Copiar prompt"), `notificacao.x/w`, `titulo.folgaTopo` (acento) e `assunto.cru` (sem o filtro de recorte, para fundo claro).
- `&ate=<camada>` desenha a capa somando as camadas (a capa "por etapas"); `&t=<0 a 1>` e `window.seek(t)` animam o slide.
- Fundo da capa e da chamada: `fundoLiso: '#211309'` (uma cor só, com vinheta; no amarelo a vinheta é laranja) ou `fundoFoto` (a cena da foto, desfocada, sem a pessoa). `assunto.brilho: false` tira o halo em volta da pessoa.
- `fundoBlocos`: blocos atrás do título e da pessoa (camada 1), em coordenadas do slide. Ex.: a janela do Claude desfocada.
- Blocos novos: `documento` `{ nome, tipoArq }` (ícone de arquivo com o nome selecionado, para o dedo apontar), `janela` `{ eu, ia, w, rot, blur, op }` (o Claude com uma troca de mensagens), `prompt` `{ texto, w }` (a caixa de mensagem com o botão de enviar), `imagem` `{ arq, w, rot }` (um slide solto, para leque) e `arquivo` (o chip deitado).
- `titulo.preLado: 'centro'`: a linha de cima centraliza na palavra inteira (para linha comprida; suba com `preEspaco` se encostar no floreio).
- `titulo.dx`: desloca o título do centro da caixa, para centralizar pelo peso das letras quando o floreio é grande (o S da skill).
- `janela` e `prompt` com `vidro: true`: vidro transparente. Com `mescla: 'screen'` em `fundoBlocos`, vão para a camada 0 e se misturam com o fundo (cada camada isola a mistura). `janela.entrada: false` tira a caixa "Responder ao Claude" quando um `prompt` faz esse papel.
- Notificação: `icone: 'instagram'` e `app: 'Instagram'` para o aviso do Instagram. Só quando conta o post.

Novos de 30/10/2026: provas `exemplo`, `fonte`, `combo` e `grade`; bloco `escrito`; no título `linha2`, `bloco`, `vao`, `fonte1`, `cor1`, `fonte2`, `cor2`, `foco2`; `nevoa` (na frente do assunto, presa na janela); `marca.selo`. Detalhes em `references/modelo-em-codigo.md` da skill.

Ferramentas em `ferramentas/`: `folha.py <pasta> <saida.jpg> [colunas]` (folha das opções de foto, para mostrar ao Filipe), `cena.py <foto> <saida.jpg> <desce> <largura>` (a foto como cena, continuando o topo; nunca os lados), `etapas.mjs <conteudo>` (a capa por etapas), `animar.mjs <conteudo> <slide>` (o MP4 do card animado), `capa-site.mjs` (a capa deitada da página do recurso), `pdf.mjs` (o material em PDF), `empacotar-skill.mjs`, `rostos.mjs` (rostos lado a lado para a identidade) e `entregar.mjs` (sobe tudo e cria o recurso e a peça como rascunho).

## Fontes

- **Calango Condensed** (Black, a fonte da agência desde 11/11/2026): a palavra condensada. Arquivos em `templates/fontes/` (fora do Git; ver o `LEIA.md` de lá). A Anton fica de reserva; peça antiga aprovada que precisa sair igual pede no slide `vars: { 'fonte-condensada': "'Anton', sans-serif", 'peso-condensada': 400 }`.
- **Calango Signature** (da agência, desde 11/11/2026): a letra de floreio da capa (`titulo.script`). A Great Vibes só nas peças antigas que pedem por `fonteScript`.
- A **Calango Sans** vem depois, no lugar da Outfit.
- **Instrument Serif**: a palavra de destaque em itálico e os números grandes.
- **Outfit**: textos (300 fino nos títulos dos slides de dentro).
- **Inter**: notificações no estilo iOS.
- **JetBrains Mono**: rótulos, réguas e rodapés.

## Temas

`amarelo` (capa oficial e chamada), `preto` e `branco` (slides de dentro, alternando, e capas alternativas). As cores estão em `modelo.css`, no começo, e seguem `docs/estilo-instagram.md`.

## Conteúdo novo

Copie `conteudos/criado-no-claude.js`, troque textos, imagens (em `imagens/`, PNG recortado) e provas. Capa e chamada usam coordenadas do slide (1080 × 1350) para o assunto, a notificação, as pétalas e a luz; os textos de apoio e o selo se alinham sozinhos.

Regras de texto: as de `docs/estilo-instagram.md` (frase curta, sem travessão, "Calango," no 2º slide, "Comenta PALAVRA" no fim, e a palavra precisa ter um material no site). No perfil em inglês não existe "Calango": `marca` própria e a seção "A versão em inglês" da skill.

## Capa animada em loop (`movimento`, desde 08/11/2026)

Regra do Filipe para todo post: a capa ganha um movimento sutil que vai e volta, sem emenda, sem cortar nada e sem esconder texto. No slide: `movimento: { fundo: { escala: -0.03 }, assunto: { escala: 0.035, origem: [x, y] }, titulo: { escala: 0.02 }, selo: { de: [dx, dy] } }` (detalhes em `mover()` do `modelo.js`). Com fundo e assunto em escalas diferentes, a cena precisa ser a placa (o fundo sem o assunto). Vídeo: `node templates/carrossel/ferramentas/animar.mjs <conteudo> 1 8 30 loop`; entrega: `entregar-videos.mjs <conteudo> 1`. Processo e verificação: Fase 5e da skill `carrossel-agenciasetup`.

## Carrossel infinito (`panorama` e `travessia`, desde 11/11/2026)

Pedido do Filipe: "ao invés de 1080x1350 + 1080x1350 + 1080x1350, faz um 3240x1350... cria margens que dividem a cada 1080 (tipo fatias) e aí você consegue colocar essas imagens entre cards. Pode manter as molduras pretas, mas pode ter elementos que ficam por cima delas de um card pro outro." O gabarito é o carrossel do Van Gogh de 2024, com o girassol entre dois cards e as abelhas voando (`references/o-que-eu-fazia.md` da skill).

Os dois ficam no carrossel (fora de `slides`), em coordenadas da **tela larga**: x vai de 0 a 1080 vezes o número de cards; a divisa entre o card 1 e o 2 é x = 1080, entre o 2 e o 3, x = 2160. Cada card mostra a sua fatia da mesma tela, com a mesma conta, e a emenda casa no pixel.

- `panorama: { arq, x, y, w, blur, luz, op }` (ou uma lista): a cena larga por dentro das janelas. A moldura preta continua; entre os cards a cena passa por trás dela, como uma paisagem vista por janelas lado a lado. Fica por cima do fundo do tema. `w` padrão: a tela inteira. Slide que não quer: `semPanorama: true`.
- `travessia: [{ arq, x, y, w, rot, espelho, blur, luz, op, sombra, acima }]`: o que atravessa de um card para o outro **por cima da moldura** (o bicho na divisa, a folha, as pétalas, as abelhas). Sem `z`, sombra realista por padrão (a de contato e a projetada); `sombra: false` tira; `sombra: { x, y, blur, op }` muda a projetada. Com `z`, só com `sombra: true` (ver abaixo). Com `blur` (o que está perto da lente), sem sombra. Por padrão fica abaixo do acabamento (cabeçalho, progresso, selo) e por cima do resto; `acima: true` passa por cima do acabamento também. Slide que não quer: `semTravessia: true`.
- Na etapa 1 a travessia entra sem sombra e sem desfoque (é composição); na 3, com eles. A textura (ruído, meio-tom, poeira) fica por cima de tudo, para o recorte não parecer colado.
- A capa animada não mexe no panorama nem na travessia: a emenda continua casando no vídeo.
- O exportador salva também `larga.jpg` (a tela inteira, em tamanho real) quando o carrossel tem um dos dois: olhe a emenda ali.
- Recorte para travessia: PNG sem fundo e justo (sem a foto inteira em volta), nunca com borda reta à vista.
- Cuidados: o que tem peso precisa estar apoiado ou cortado pela borda de baixo (bicho flutuando reprova); o que atravessa não cobre texto; um elemento grande por divisa, e os pequenos (pétalas, abelhas) poucos e em tamanhos e focos diferentes.
- **Cor para a cena** (11/11/2026, "Folha verde que tá numa cor completamente diferente do cenário, quebra tudo e deixa amador"): `matiz` (graus), `sat` (1 = igual) e `luz` (1 = igual) em cada elemento do panorama e da travessia. Na selva verde-água do tucano: `matiz: 18, sat: 0.72, luz: 0.8`.
- **Vagalumes em código** (sem imagem): `{ vagalume: true, x, y, r, blur, op, mistura }`, com x e y no centro e `r` o raio do núcleo (o brilho vai até 5 vezes ele e ilumina o que está atrás). O foco segue a distância do assunto, como o dono ensinou: no plano do assunto, núcleo nítido (sem `blur`); perto da lente, grande e bem desfocado (`acima: true`); no fundo, pequeno, desfocado e mais fraco, por dentro das janelas (no `panorama`). Em fundo branco a luz some: use `mistura: 'normal'` ou deixe para os cards escuros.
- **Os fundos podem alternar** (11/11/2026: "O cenário não precisa ser inteiro com o mesmo fundo... eu alternava o fundo, às vezes branco, às vezes preto. E colocava elementos por cima"): o panorama é opcional; o que costura os cards são os elementos por cima da moldura.
- **A distância de cada elemento (`z`) e o mapa de profundidade** (11/11/2026, o dono: "você precisa criar um mapa de profundidade pra entender"). Em cada item do panorama e da travessia, `z` de -1 (fundo) a 0 (o plano dos cartões, o do foco) a 1 (colado na lente). O desfoque e a sombra saem dele, com a mesma conta para todos: z 0,35 = 6 px, 0,6 = 14, 0,9 = 30; a sombra fica mais deslocada, maior e mais fraca quanto mais longe da superfície; no fundo não há sombra. **A sombra só sai com `sombra: true`** (11/11/2026, "a sombra na abelha ficou artificial... o girassol tem uma sombra artificial, o busto também"): ela é para o que está perto de uma superfície (a borboleta sobre o cartão, o tronco sobre o card). O que voa no ar ou sai da borda de baixo (abelha, girassol, busto, personagem) fica sem; a sombra curta de contato só no que encosta (z até 0,05). Não ponha `blur` na mão quando usar `z`. O exportador salva `profundidade.jpg` (cada elemento num cinza pela distância, mais claro mais perto, com o número): confira ali. No mesmo plano, os tamanhos têm de ser os de verdade; e poucos elementos (um grande por divisa).
- **Luz por cima**, pela receita do dono (11/11/2026): "uma bola desfocada na cor do fundo (amarelo na maioria das vezes), com o centro dela um amarelo mais claro. Muda o modo de mesclagem pra tela, ou divisão, ou sobrepor. Diminui a opacidade... aumenta o desfoque se precisar pra ficar sutil." Na travessia: `{ halo: true, x, y, d, cor: '#fff6c0' (o centro), borda: '#ffb000' (a cor do fundo), blur: 40, op: 0.35, mistura: 'screen' | 'overlay' | 'color-dodge' | 'soft-light' }`. A luz fica presa na janela. O `overlay` e o `soft-light` deixam o preto e o branco como estão: é o efeito do blend-if do Photoshop, que ele usava para mesclar melhor. No Van Gogh: uma em tela no alto à esquerda (de onde vem a luz) e uma em sobrepor no rosto, que esquenta a cor.
- **Cantos desfocados** ("desfoque nos cantos são bem-vindos"): `cantos: { blur: 7, de: 0.58 }` no slide; o que está dentro da janela desfoca do meio para fora.
- **Mais cor nos assuntos** ("sinto falta de cor, sutilmente mais saturação nos assuntos"): `sat: 1.1` a `1.15` no personagem, no quadro, nas abelhas e no girassol.
- **As duas linhas da headline coladas** ("aproxime o CONTRATE do NUNCA"): o espaço entre as letras é o do `vao`, mas a fonte tem folga embaixo; na Calango Condensed, `vao: -25` deixa uns 15 px entre as linhas.
- No slide de dentro: `lado: 'esquerda' | 'direita'` (o texto vai para um lado e o elemento grande ocupa o outro) e `semTrilho: true`. Na capa reaproveitada: `poeiraDe: '<outro conteúdo>'` sorteia a poeira como a aprovada. Elemento com `h` estica na altura (para afinar uma pincelada).
- **O assunto saindo pela moldura**: o personagem na travessia (com `z: 0`) não é cortado pela janela; o corpo passa por cima da moldura preta de baixo e dá profundidade (o Van Gogh).
- **O texto pequeno na frente do assunto**: `titulo.posFrente: true` põe o texto de baixo ("um designer") por cima do personagem, para o chapéu poder encostar na headline sem esconder nada.
- **Cor só num slide**: `vars: { acento: '#5c1d00' }` troca as variáveis do tema naquele slide (o destaque escuro sobre o laranja pintado, onde o laranja do tema some).
- Exemplos: `conteudos/infinito-cores.js` (3 cards, a capa aprovada do CORES) e `conteudos/vangogh-infinito.js` (o Van Gogh de 2024 refeito em 10 cards, cada camada gerada separada).
- **Os elementos vêm da biblioteca** (`templates/biblioteca/`, índice no `LEIA.md` de lá): `arq: '../../biblioteca/<arquivo>'`. Elemento novo se gera sozinho no Magnific (nunca a cena inteira) e entra pela `node scripts/biblioteca.mjs adicionar`.
