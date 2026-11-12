# As fontes da Agência Setup

São fontes do dono ("São fontes nossas", 11/11/2026). Ficam nesta pasta para os criativos (os modelos de carrossel e
de frase carregam `fontes.css`), mas os arquivos **não entram no Git**: o repositório é público. Só este `LEIA.md` e o
`fontes.css` entram.

| Família | Arquivos | Onde usa |
| --- | --- | --- |
| Calango Condensed | Regular, Italic, Bold, BoldItalic, Black, BlackItalic (`CalangoCondensed-*.woff2`) | A headline condensada da capa e da chamada (Black, peso 900), no lugar da Anton |
| Calango Signature | Regular (`CalangoSignature-Regular.woff2`) | A letra de floreio da capa (`titulo.script`), no lugar da Great Vibes |
| Calango Sans | Light, Regular, Medium, SemiBold e Bold, com os itálicos (`CalangoSans-*.woff2`) | Os textos e o cabeçalho, no lugar da Outfit (carrossel) e da Inter Tight (frase). Quem pede peso 800 recebe o Bold |
| Calango Serif | Regular, Italic, Bold e BoldItalic (`CalangoSerif-*.woff2`) | A serifada dos destaques (a palavra em itálico do título, o "Calango,", o preço, o rótulo da frase), no lugar da Instrument Serif. Variável `--fonte-serifa`. O dono, em 11/11/2026: "pode explorar qualquer estilo dessas fontes" |
| Calango Ink | Regular (`CalangoInk-Regular.woff2`) | A letra de rabisco das anotações à mão escondidas na arte (`anotacoes` no slide do carrossel): recado informal, pequeno, levemente desfocado, mesclado e com pouca opacidade. O dono, em 11/11/2026: "como se alguém tivesse escrito ali... eu acho isso bonito" |

- Os `.otf` e `.ttf` (para instalar em outro programa ou no estúdio de vídeo) ficam em `_local/fontes/`.
- Em outra máquina (um clone novo do repositório), copie os `.woff2` para esta pasta; sem eles, os modelos caem na
  Anton e na Great Vibes, que vêm do Google Fonts.
- Peça antiga aprovada que precisa sair igual: `vars: { 'fonte-condensada': "'Anton', sans-serif", 'peso-condensada': 400, 'fonte-sans': "'Outfit', system-ui, sans-serif" }`
  no slide (a capa do CORES no `infinito-cores.js`).
