# O padrão visual: imagem, profundidade, título, efeitos e finalização

Tudo o que o Filipe decidiu nas rodadas de 30/10/2026, sem contradição. Vale para carrossel e post de frase, em português e inglês. **Quando este arquivo discordar de um texto mais antigo da skill, vale este.** O que ele corrigir de novo entra aqui e na lista do revisor (`revisor-de-capa.md`).

A ordem importa: a ideia e a foto decidem a capa. Efeito não salva imagem feia ("assunto feio não se conserta com efeito"). Por isso: **ideia → fotos → ele escolhe → montagem → revisor → ele vê.**

## 1. O que aparece na capa: alternar

"Pode usar meu rosto, mas não sempre, é legal alternar, brincar com o feed."

Antes de escolher, olhe os vizinhos na fila (`redes_ver_fila` ou `listar_posts`) e alterne:

| Assunto | Quando | Como |
| --- | --- | --- |
| **O rosto do Filipe** | A tese é dele: reação, opinião, a peça que ele fez | `foto-do-filipe.md`; rosto idêntico, mostre a foto a ele antes |
| **Bicho** | Lista, material, ideia que dá para contar com uma cena engraçada | Raposa, pinguim, girafa, panda-vermelho, panda, furão, gato, mico-leão-dourado, tucano, abelha, pavão, pomba, águia, elefante |
| **Objeto ou prova** | Ferramenta, dado, print, antes e depois | Grande, nítido e legível sozinho |

- Bicho ou objeto **conta a tese**: o pinguim aponta a caneta para a lente (fontes manuscritas), a cabra morde a letra P (fontes), o tucano colorido (cores), a alpaca posa num fundo de estúdio no pasto (fundos).
- Varie também a cor da capa: dois brancos ou dois bichos brancos de frente, lado a lado, ficam repetidos.
- Reprovados: camaleão ("não gostei"), robô de disfarce ("imagem feia"), rabiscos e riscos ("coisas feias").
- Texto escrito dentro da imagem (papel, carta, tela) fica no idioma do post. Se a foto trouxer letras, confira ou escreva por cima.

## 2. Como gerar a imagem

**Antes de escrever o pedido, olhe as referências do dono em `templates/carrossel/referencias/inspiracao/profundidade/` (o `LEIA.md` de lá tem a régua): o assunto vivo, o desfoque de lente de verdade nas 3 camadas, a luz com direção, a cor do assunto contra a do fundo e o espaço livre para o título (09/11/2026).**

**Onde:** no site do Magnific (`magnific.com/app/ai-image-generator`), Nano Banana Pro, modo ilimitado, **pelo Chrome do Windows** (pedido do Filipe, 30/10/2026; o do MacBook é reserva). Gerar lá não gasta crédito. Pelo conector custa 75 créditos por imagem: só avisando antes.

**Passo a passo:**
1. **Confira o formato: 4:5.** A página volta para outro formato ao recarregar e outra sessão pode ter mudado. Clique no botão do formato, escolha 4:5, e confirme depois em `metadata.aspectRatio`.
2. Limpe a caixa e cole o pedido por JavaScript. Dá para deixar a função na aba:
   ```js
   window.gerar = async (txt, n = 1) => { const el = document.querySelector('[contenteditable="true"]'); el.focus(); const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('delete'); document.execCommand('insertText', false, txt); await new Promise((f) => setTimeout(f, 700)); const b = [...document.querySelectorAll('button')].find((x) => /^\s*Generate/.test(x.textContent)); for (let i = 0; i < n; i++) { b.click(); await new Promise((f) => setTimeout(f, 2500)); } return 'ok'; };
   ```
3. **Gere 3 opções** de cada ideia e espere uns 40 s.
4. Ache com `creations_search` (`query`, `dateStart`, `full: true`; ler não gasta crédito) e baixe pela `url`.
5. Monte a folha (`python templates/carrossel/ferramentas/folha.py <pasta> <saida.jpg> 3`) e **mande ao Filipe antes de montar**. Montar em cima de foto que ele não gosta gastou várias rodadas.

**O pedido que deu certo (alpaca, cabra, pinguim).** Grande angular colada no bicho, limpa e cheia de detalhe:
```
Extreme wide-angle 14mm fisheye photo, clean and crisp, inches from the lens. [BICHO] leans into the camera, its head huge and almost touching the lens, [OBJETO DA TESE] coming toward the lens, the small body and legs shrinking dramatically behind it, strong barrel distortion. [FUNDO]. Bright clean even light, crisp sharp detail on every hair. Absolutely no lens flare, no sun, no haze, no glow, no sunset tones, no particles. The top third of the frame is empty and clean. Commercial advertising photo. No other text, no logos, no watermark.
```
`[FUNDO]`, por exemplo: `Plain seamless vivid saturated yellow studio backdrop and floor`, `Deep clean blue sky with no clouds at the top`, `Clean bright white snow with cool blue shadows`, `Plain seamless near-black studio backdrop`.

**Sem grande angular também funciona quando o bicho é chamativo:** o tucano foi `wide-angle close-up, huge beak pointing toward the camera, plain near-black backdrop, rich saturated colors, soft rim light`.

**O que ele reprovou na imagem:**
- Pôr do sol, tom de fim de tarde, névoa dourada: "não combina com o perfil".
- Flare de câmera, sol estourando, raios de luz: "horrível, parece câmera fotográfica".
- Paisagem realista: "parece capa de caderno". Pedido de "golden hour" ou "photo manipulation poster" leva a isso: não use.
- Amarelo mostarda e bege: "morto". Cor viva, ou o recorte sobre a cor certa.
- Foto esticada ou expandida pelos lados: "odiei". Se falta espaço dos lados, gere de novo. Continuar um céu ou fundo liso **para cima**, sem emenda visível, pode (`ferramentas/cena.py`).
- Bicho sem apoio, rabo atravessando objeto, dedo a mais: confira a foto inteira.

**Depois de escolher:**
1. Recorte no computador: `node scripts/recortar.mjs <foto> templates/carrossel/imagens/<nome>.png --modelo hr-matting`. Compare com a original: o padrão comeu o galho do camaleão e furou o vidro; o `hr-matting` resolveu. Vidro transparente não recorta: peça objeto sólido.
2. **Foto como cena:** a própria foto no `fundoFoto` e o recorte no `assunto`, na mesma caixa, com o título entre os dois. A cor bate sozinha e não parece colado. Se quiser cor de fundo mais viva, use o recorte sobre `fundoLiso`.

## 3. Perspectiva e profundidade

**A profundidade boa vem da foto.** "Quero perspectiva, profundidade, distorção de câmera." Com a foto em grande angular, a capa quase não precisa de mais nada.

- **Pense em 3D.** O que está perto é maior e desfocado; o que está longe é menor. "Você desfocou o R, mas ele está menor que o P: a profundidade está errada."
- **O assunto passa um pouquinho por cima da letra.** "Dá um charme de profundidade." No máximo uma letra e meia, nunca o começo da palavra.
- **Nada solto só para dar profundidade.** "Muito feio os elementos que você colocou voando." Repita um elemento só quando ele voaria de verdade na cena (pétalas, abelhas), com tamanhos e focos coerentes, e reconhecível.
- **Desfoque só em coisa reconhecível.** Mancha sem forma é sujeira ("os efeitos de desfoque parecem sujeira"). Em fundo claro, cuidado dobrado.
- **Nada sem apoio.** O que tem peso está apoiado ou tem motivo para voar.
- **Uma luz só:** assunto e fundo na mesma luz, sem parecer colado. Luz que aparece na imagem é objeto da cena (uma lâmpada), nunca flare de câmera.

**Os gabaritos de capa** (`templates/carrossel/referencias/capas/`): `gabarito-alpaca.jpg` e `gabarito-pinguim.jpg` (as que ele mais gostou em 30/10/2026), `aprovada-*.webp` (com o rosto dele), `profundidade-abelha.webp` e `profundidade-girafa.webp`. No Instagram da agência, para olhar quando precisar: a mão do mico (DPSCTfeEYxZ), o tênis vazando a janela (DWjlam6EZ0r), a máquina de escrever (DWhfza3kTu3), o branco com ossos (DR0QirAEdM-), o pinguim pescando (DEMITA CLIENTES).

## 4. Título

- **Sempre com floreio.** A primeira letra da palavra grande vai em cursiva (Great Vibes, `script`) por cima da condensada, ou a segunda linha em cursiva (`linha2`). Letra no meio da palavra: `antes` + `script` ("30" + D + "IAS"). Capa só com a condensada foi reprovada em 3/11/2026 ("por que os novos posts não estão fazendo a primeira letra cursiva, bonita?").
- **Centralizado de verdade.** Floreio pesa pouco: desloque o conjunto para o lado dele (`dx: -35`) para a palavra parecer no centro.
- **Longe da margem de cima,** nunca colado no cabeçalho ("é feio"). Título e assunto, juntos, no meio da janela.
- **Sem sombra e sem brilho no texto** ("sombra é feio"): é o padrão do modelo. Só o desfoque nas pontas.
- **Tamanho certo:** nem miúdo ("tá pequena, pode ser maior") nem tomando a arte ("tá muito grande, dava pra diminuir"). A palavra pode cortar um pouco atrás do assunto. Em 300 px, lê-se em 1 segundo.
- **Pouca informação:** título, assunto e selo. Linha de apoio e cartão só se dizem algo novo. Cartão desalinhado ("muito menos da caixa de texto ali desalinhada") e frase grande colorida para tapar vazio ("feio pra cacete") saem.
- **Duas linhas formam um bloco** com a mesma largura (`titulo.linha2`, `bloco`), com ar em volta. Quebre onde faz sentido: Back / grounds pode, Manu / scritas não. Sem quebra natural, use outra palavra da frase (Fontes / Manuscritas).
- **A frase da capa se lê inteira, de cima para baixo:** "as melhores FONTES pra usar nos seus posts". Linha de apoio que ficaria atrás do assunto vai para o lado livre (`posEspaco`), alinhada à borda da palavra.
- **A letra conta o assunto quando dá:** "Manuscritas" no floreio da marca (`fonte2: 'Great Vibes'`), a outra linha na condensada. Caveat Brush foi "feio pra caralho".
- **Cores:**
  - Branco e gelo: cinza (nunca preto) e degradê de #ffaa00 para laranja (`cor`, `cor2`), bem desfocado nas pontas.
  - Amarelo: fundo vivo (#ffb800 ou #ffcc00, ou degradê de #ffaa00 para laranja), título branco.
  - Céu e escuro: título claro, sem sombra.
  - Confira a linha inteira contra o que passa atrás dela (o GROUNDS amarelo sumiu no fundo amarelo).

## 5. A chamada (o último slide)

"Todas as CTAs estão feias, não sei por que não está no centro, seguindo a mesma ideia da headline da capa."

- A palavra fica **grande e no centro**, como o título da capa, com o "comenta" centralizado em cima e o assunto passando um pouquinho por cima. É o padrão do modelo: `titulo: { pre: 'comenta', condensada: 'PALAVRA', y: 225, tam: 340 }`. `tam` é o máximo; palavra comprida encolhe sozinha para caber.
- Palavra curta não fica miúda ("pequeno e feio"): até 3 letras, `tam` 420; até 5, 340; 6, 300.
- A nota com o que a pessoa recebe fica centralizada embaixo. O selo aponta para a palavra e fica dentro da janela.

## 6. Efeitos e finalização

- **Nos títulos:** desfoque progressivo nas pontas ("só colocar uns efeitos de desfoque nos títulos, aí vai ficar top"), sem virar halo branco em fundo de cor viva.
- **No branco e no gelo:** fade quase branco atrás do título quando a foto quebra a leitura e névoa macia, sem contorno, embaixo e em cima (`nevoa`, presa dentro da janela; `_local/novos-posts/nevoa.py` é o exemplo). Nuvem desenhada por código é feia: nuvem de verdade vem da foto.
- **Em todas as artes, a finalização:** ruído presente, meio-tom com pontos pequenos e poeirinhas poucas, em tamanhos diferentes, nunca sobre texto pequeno ("um pouco mais de texturinha, pra dar um charme"). Já está no modelo, na etapa 5: não ponha na mão.
- **Fora:** flare, glow colado no assunto, sombra em texto, mancha, elemento solto.

## 7. Slides de dentro

- O conteúdo vem antes de tudo: `revisor-de-capa.md`, seção 1.
- Dica aplicada num exemplo de verdade (`prova: 'exemplo'`) em vez de conversa inventada com o Claude.
- Em lista salvável, a amostra ocupa o card (`fonte`, `combo`, `grade`).
- A textura vale aqui também.

## 8. Como produzir no modelo

- **Título em bloco:** `titulo.linha2`, com `bloco` (largura em px; as duas linhas se ajustam e encostam), `vao`, `tam2`, `cor2`, `fonte2`, `foco2`; a primeira linha aceita `fonte1` e `cor1`. Sem `script`, fica só a condensada.
- **Na frente do assunto, podendo vazar a janela:** `folhas`. **Na frente do assunto, presa na janela:** `nevoa`. **Atrás do título:** `fundoBlocos`. **Na frente do título, atrás do assunto:** não existe camada; gere junto com o assunto.
- **Marca:** português, `{ perfil: '@agenciasetup', nome: 'Calango' }`; inglês, `{ perfil: '@setupagency_eng', nome: 'Setup Agency', selo: 'setup' }`. Nas frases, `marca` no conteúdo.
