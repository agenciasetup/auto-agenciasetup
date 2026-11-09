# Foto do Filipe

Vale quando o assunto da capa é o Filipe. Ele alterna com bicho e objeto ("pode usar meu rosto, mas não sempre"): quando escolher e como gerar os outros está em `profundidade.md`. Com ele na capa, o rosto é **idêntico**. "Se ficar diferente demais (olho, nariz, boca, testa), fica ruim" (palavras dele).

## Identidade (tem que bater 100%)

- Rosto igual às fotos reais: formato, olho, nariz, boca, testa e queixo.
- Olhos **castanho médio/escuro**. Nas fotos o reflexo da lente parece verde: não é.
- Testa **do tamanho real** (média). Gerar do zero deixou a testa enorme.
- Óculos redondos de aro fino prateado.
- Cabelo escuro curto, com volume em cima e laterais baixas.
- Barba rala.
- **Um piercing só, na parte de cima (cartilagem) da orelha esquerda. Sem brinco no lóbulo e sem segundo piercing.** As gerações de 23/10/2026 inventaram brinco e piercing a mais: errado.
- Pintas no rosto onde estão nas fotos: **uma na bochecha e uma marquinha na testa, do mesmo lado**. Pinta a mais foi reprovação ("pintas no meu rosto que eu não tenho", 24/10/2026).
- Pele **sem espinha e sem mancha, com poros e textura**. Nada de pele de plástico.
- **Corpo de academia**: ombro largo, braço grosso, peito largo, postura de homem. "Sou HOMEM" (24/10/2026): nada de rosto gordo e deformado, de cara de "muleque nerd", de biquinho ou pose fofa. Expressão de homem engraçado e confiante: sorriso aberto de verdade, meio sorriso de lado, sobrancelha levantada.
- Estilo: camiseta amarela justa, boné (bege, amarelo, preto, branco), ou um personagem famoso em live-action (ver `capa-intencional.md`).

## Fotos reais (a base)

No Magnific, projeto "Agência Setup · Filipe (referências e capas)". No computador, `templates/carrossel/referencias/filipe/` (fora do Git).

| Foto | Id no Magnific | Serve para |
| --- | --- | --- |
| `01-bone-elevador.jpg` | `1lWyX8gr4r` | casual, boné, braço (bastidor) |
| `02-rosto-frente.jpg` | `6AaT51eiJO` | rosto de frente (apoio de identidade em toda geração) |
| `03-camiseta-preta.jpg` | `DoLfy9xpcl` | selfie de espelho, meio sorriso, olhando o celular |
| `04-sorriso.jpg` | `Tdrh7yJVNR` | sorriso aberto, celular na mão (chamada, convite) |
| `05-terno.jpg` | `jUT98mHLD0` | terno, mãos no bolso (autoridade, negócio) |

Selfies de espelho são espelhadas: a orelha esquerda dele aparece do lado esquerdo da imagem.

**Recortes prontos com o rosto dele de verdade** (`templates/carrossel/imagens/`): `filipe-celular.png` e `filipe-sorriso.png` (as selfies 03 e 04 com o fundo trocado, do "criado no Claude"), `filipe-real-bone.png` (01), `filipe-real-terno.png` (05, baixa resolução: não passe de 1700 px de largura) e `filipe-real-espanto.png` (02, de perto). Desde 24/10/2026 são o caminho seguro: o rosto não muda. Foto gerada só com o ok dele no rosto.

## Como gerar

- Modelo **Nano Banana Pro**: no Magnific o identificador é `imagen-nano-banana-2` (o `imagen-nano-banana-2-flash` é o Nano Banana 2 comum).
- **As 5 fotos reais entram como referência em toda geração.** A 1ª é a mais perto da expressão pedida (o sorriso aberto: `04`; o meio sorriso: `03`; o terno: `05`; o boné: `01`); as outras seguram o rosto.
- Fundo: estúdio liso da cor do tema, ou a cena do personagem **desfocada** atrás dele (o título vai em cima do fundo; cenário nítido atrás da headline atrapalha).
- 4:5, 2k, `count: 2` (75 créditos cada). **Avise o custo antes.** Recorte: 3 créditos.
- Pasta: o projeto do Filipe no Magnific (`folderReference` do projeto "Agência Setup · Filipe (referências e capas)").

**O que funcionou (24/10/2026, terceira rodada):** editar uma **selfie dele em que o rosto ocupa boa parte da foto** (`03`, `04`, `01`) e mudar só a roupa, o objeto na mão e o fundo. Começar com "Edit @imgN. Keep the man exactly as he is in @imgN: identical face, ... expression, head angle and pose ... Change only this: ...". Nunca dar o nome do personagem (o "El Profesor" virou o ator); descreva a roupa ("green and black checkered haori", "wide-brimmed straw hat with a red band"). A foto de terno (`05`, corpo inteiro, rosto pequeno) não segura o rosto. Gerar no site do Magnific (Image Generator, modo ilimitado), não pelo conector: lá não gasta crédito. Confira a orelha: uma opção veio com brinco no lóbulo (errado).

Na capa: recorte da foto por cima e a cena da própria foto sem a pessoa e desfocada atrás (`_local/estilos/fundo-limpo.py` e `fundoFoto` no conteúdo), com o título entre os dois.

## O que foi aprovado ("Perfeito!", 24/10/2026)

**Onde gerar, de graça:** no site do Magnific (Image Generator, Nano Banana Pro, modo ilimitado), pelo Claude in Chrome do Windows (selecione esse navegador antes; o do MacBook é reserva). Confira se o formato está em 4:5, porque ele volta para outro ao recarregar. Referências na caixa, nesta ordem: @img1 terno, @img2 rosto de frente, @img3 selfie séria (03), @img4 selfie sorrindo (04), @img5 boné (01). 4:5, 2K, uma imagem por clique (clique em Generate 3 vezes para ter opções).
- Antes de colar um pedido novo, limpe a caixa com JavaScript, senão os pedidos se somam: `const el=document.querySelector('[contenteditable="true"]'); el.focus(); const r=document.createRange(); r.selectNodeContents(el); const s=getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('delete');`
- Lotes curtos de ações no navegador: lote longo derruba a conexão. Para achar o que saiu, `creations_search` e `creations_get` no conector (ler não gasta crédito) e baixe com `curl`.
- **Recorte grátis:** primeiro no computador (`node scripts/recortar.mjs`, ver "Recorte" abaixo). Se não der, na página da criação, aba **Edit > Background > Remove Background**, espere uns 18 s e **Save**. O recorte vira uma criação nova (`creations_search` acha). Não use o "What do you want to change?" do editor: ele cobra crédito (aparece a oferta de compra; feche).
- Pelo conector (`images_generate`) custa 75 créditos por imagem: só se o site não estiver disponível, e avisando antes.

**O pedido que segurou o rosto** nas poses novas (apontando para cima, apresentando com a mão aberta). A base é a selfie com a expressão pedida; o bloco das pintas foi o que tirou as "pintas que eu não tenho":
```
The man is Filipe from the reference photos. Keep his face [and his big real smile] exactly as in @img4: same face shape with full cheeks, nose, mouth [and teeth], eyebrows, forehead and hairline, short dark brown hair, thin round silver wire glasses, light stubble, same skin tone, dark brown eyes. Clean skin with only the one or two small moles that appear in @img4; do not add any other moles, freckles or spots. Do not slim, widen, beautify or change his face, and do not replace him with anyone else. Strong athletic build, broad shoulders, thick arms. Exactly one small piercing in the upper cartilage of the left ear, no earring on the earlobe. Real skin with pores, no airbrushing. No phone. He wears a fitted plain black t-shirt.
Pose: [he points up with his index finger toward the empty space above his shoulder, big confident smile] / [standing, one arm extended to his side with the open palm up, presenting something next to him; one eyebrow slightly raised and a subtle closed-lips half smile], looking at the camera, waist up.
Background: a plain seamless [vivid warm yellow / warm off-white] studio backdrop, flat and even, no glow and no vignette. Lots of empty backdrop above his head [and beside his open hand]. Photorealistic studio portrait, no text.
```
- A pose deixa **espaço para o elemento da tese** (acima do dedo, ao lado da mão aberta): é ali que entra o arquivo, os carrosséis.
- Fundo liso e sem brilho já na foto: o recorte sai limpo e a capa usa o `fundoLiso`.
- Confira cada opção: uma veio com um segundo rosto flutuando no fundo (descartada) e outra com pintas a mais na testa e nas duas bochechas. Ele tem uma pinta na bochecha e uma marquinha na testa, do mesmo lado.
- Escolha pelo rosto lado a lado com as fotos reais, e não pela que ficou mais bonita.

**Atenção:** o pedido abaixo gerou rostos que eu achei parecidos e o Filipe achou "extremamente diferentes" do dele (24/10/2026). Ele não resolve o rosto. Mostre a foto gerada a ele antes de montar, ou use uma foto real dele. Peça a cena com o fundo desfocado atrás do título.

Pedido usado nas capas de 24/10/2026 (troque a cena e a composição; o bloco do rosto e do corpo fica igual):
```
The man is Filipe, the exact same person in all five reference photos. Use reference 1 as the base for his face [and his real big smile]. His face must be IDENTICAL to the references: same face shape with full cheeks and a defined jaw, same straight nose, same lips [and teeth], same eyebrows, same forehead height and hairline, same short dark brown hair with volume on top and short sides, same thin round silver wire glasses, same light stubble beard and mustache, same small moles on the cheek, same skin tone, same dark brown eyes. Do not slim or widen his face, do not beautify, do not make him look younger or nerdy. Body: strong athletic gym build exactly like the references, broad shoulders, thick arms, wide chest, masculine confident posture. Only one small piercing on the upper cartilage of his left ear, no earring on the earlobe. Real skin texture, remove only pimples and redness, no airbrushing.

Scene: [he is dressed as "El Profesor" from Money Heist: ... He stands with his arms crossed, a confident half smile, looking straight into the camera ... Behind him: ... Dramatic warm tungsten light from a hanging lamp above him, cinematic film still.]

Composition: vertical 4:5 movie poster photo. He fills the lower 65% of the frame, the top of his head at about one third from the top; the upper third is [a clean dark wall / clean sky] with no objects (space for a title). 50mm lens, sharp focus on him, realistic photo. No text, no letters, no logos, no watermark.
```
- Boca fechada e relaxada quando não sorri: escreva "closed relaxed lips (no pouting)", senão vem biquinho.
- Rosto sério ou de meio sorriso: a foto de terno (`05`, `jUT98mHLD0`) como 1ª referência deu o rosto mais fiel. Com a camiseta preta (`03`) como base, o Demon Slayer saiu de rosto fino e cabelo preto azulado; resolveu acrescentar "do not make the face narrower or longer", "dark brown, not jet black, not styled up" e "do not smooth the skin".
- Peça pronta na mão (o post impresso): mande a imagem do post como 6ª referência e peça "keeping that poster design exactly as it is, flat and facing the camera, beside his face (never covers his face)".

Não faça:
- `images_skin_enhancer` (realce de pele automático): alisou demais e mudou o rosto.
- "ultra high contrast", "crisp skin texture" no pedido: marcam a pele cansada.
- Descrever traços que não estão nas fotos (o "green eyes" virou olho verde).
- Gerar do zero ou com uma referência só (testa enorme, rosto de outra pessoa).
- Recorte com borda, furo no cabelo ou halo branco em volta: o Filipe chamou de "recorte lixo". Confira a borda ampliada antes de montar.

## Verificação de identidade (antes de montar)

1. `node scripts/lado-a-lado.mjs <foto real> <gerada> [mais...]`: abre as imagens lado a lado na mesma altura em `_local/lado-a-lado.jpg`. Compare o rosto e a orelha esquerda.
2. Marque a lista da Verificação 4 do `SKILL.md`. Falhou um item, gere de novo (ou peça a foto certa ao Filipe).
3. Escolha a mais fiel entre as geradas, não a mais bonita.

## Recorte

1. **No computador (primeira opção, grátis):** `node scripts/recortar.mjs <foto> templates/carrossel/imagens/<nome>.png`. A foto não sai do computador: roda na placa de vídeo (uns 2 s por foto; pela CPU, cerca de 1 minuto). Sai um PNG transparente do mesmo tamanho, com o fio do cabelo e o aro fino dos óculos, e a cor da borda refeita (sem halo do fundo antigo). Aceita uma pasta inteira. O padrão (`dynamic`) tem a borda firme; `--modelo hr-matting` dá a borda mais macia (vale tentar no cabelo em fundo claro). Na primeira vez: `node scripts/recortar.mjs --instalar`. Comparado com o Magnific em 25/10/2026 (`_local/recorte/comparacao.jpg`): empate no cabelo, nos dedos e no aro, sem a franja amarela no cabelo e sem a mancha na lente que o Magnific deixou; perde um pouco no braço contra luz laranja (borda um tico mais macia).
2. Se não der (sem o ambiente ou sem o computador): no site do Magnific (Edit > Background > Remove Background > Save, grátis) ou `images_remove_background` pelo conector (3 créditos); baixe para `templates/carrossel/imagens/`.
3. Amplie e confira (`node scripts/carrossel-zoom.mjs`): cabelo (furos, serrilhado), mãos, óculos e a borda inteira. Nada de halo branco em volta.
4. O modelo aplica o filtro `#recorte` (fecha furos pequenos, come 1 px da borda e suaviza). Foto bem recortada em fundo claro: `assunto.cru: true`. Se ainda aparecer buraco grande, gere de novo.

## Tratamento pontual

Quando a foto está boa e só um detalhe está errado (um piercing a mais, uma pinta que ele não tem, um objeto sobrando), ou falta tamanho, luz ou cor: trate no computador em vez de gerar de novo. Grátis, na placa de vídeo, e a foto não sai daqui. Rosto errado (olho, nariz, boca, testa) não se conserta aqui: gere de novo.

1. Ache as coordenadas ampliando: `node scripts/tratar.mjs comparar <foto> <foto> --caixa x,y,w,h --vezes 8` mostra o pedaço em `_local/tratar/`.
2. Apague só o detalhe, para um arquivo novo (a saída nunca sobrescreve a foto sem `--no-lugar`):
   `node scripts/tratar.mjs apagar templates/carrossel/imagens/<foto>.png _local/tratar/<foto>-limpa.png --caixa x,y,w,h --redondo [--ignorar x,y,w,h]`
   - `--caixa` cobre o detalhe com a sombra dele; `--redondo` serve para pinta e piercing.
   - `--ignorar` marca o que fica igual quando há outro objeto colado (o piercing de verdade ao lado do falso): o modelo não copia e não muda.
   - Pelo pincel: `node scripts/tratar.mjs editor <foto>` (IOPaint em `http://127.0.0.1:8080`; "Save" grava em `_local/tratar/editor/`; `--clique` seleciona um objeto com um clique).
3. Confira de perto: `node scripts/tratar.mjs comparar <antes> <depois> --caixa x,y,w,h --vezes 3` (e 8x a 12x no ponto). Pele natural, sem mancha nem borrão. Se ficar mancha, aumente a `--caixa` para pegar a sombra toda.
4. Se precisar: `ampliar <img> --escala 2` (padrão `geral`, `--ruido 0.2`, mantém a textura da pele) e `ajustar <img> --brilho 8 --temperatura 10 --nitidez 30` (de -100 a 100; nitidez de 0 a 100).

**Não alise a pele.** O realce de pele mudou o rosto dele e foi reprovado. Não use `--modelo foto` nem `--ruido` acima de 0.3 em rosto, nem restauração de rosto (GFPGAN, CodeFormer). Na pele, só apagar o ponto errado.

Exemplo (25/10/2026): o segundo piercing da `filipe-v6-vale.png` saiu com `apagar ... --caixa 656,857,11,11 --ignorar 655,847,10,9 --redondo --folga 1` (1,4 s); antes e depois em `_local/tratar/antes-depois.jpg`.

## Pose nova

Se a tese pede uma pose que não existe nas fotos reais, use o pedido de "O que foi aprovado" (a selfie de base com o rosto travado e as pintas contadas): apontar para cima e apresentar com a mão aberta saíram com o rosto dele. Verificação de identidade dobrada. Se o rosto não segurar depois de 3 tentativas, peça ao Filipe uma selfie nessa pose.

## Cabelo sempre arrumado (09/11/2026)

O dono mandou selfies novas (camiseta vinho, cadeira preta) e avisou: "Importante: corrija sempre o cabelo, o meu tá bagunçado aí". Em todo pedido com o rosto dele, acrescente: "his short dark brown hair neatly styled and combed, swept up and slightly to the side with volume on top, short and tidy on the sides, no messy strands, no hair falling on the forehead". As selfies servem para o rosto, não para o penteado. Elas ficam em `templates/carrossel/referencias/filipe/` (o dono salva lá; foto mandada no meio da conversa não vira arquivo).

**As selfies novas (09/11/2026, camiseta vinho, de frente para a câmera), em `referencias/filipe/`:** 11 sorriso aberto, 14 sorriso aberto (o mais parecido de frente), 17 sorriso enorme, 16 meio sorriso de boca fechada, 13 sério de frente, 12, 15 e 18 desconfiado de lado, 19 surpreso de boca aberta, 20 de baixo para cima, bem perto. Para o rosto, use estas como referência principal (a selfie da expressão pedida primeiro, mais duas de frente) e peça o cabelo arrumado (as selfies estão com o cabelo bagunçado).
