---
name: video-agenciasetup
description: Produção dos vídeos curtos (Reels e Shorts, 9:16) do setor de vídeo da Agência Setup, a partir de um roteiro que o dono aprovou na mesa do Escritório. Narra com a voz clonada do Filipe (OmniVoice) no Windows, monta as cenas no estúdio em código (Curso-Videos/estudio), revisa os quadros, entrega como rascunho na fila com o Comenta X e registra o trabalho no Escritório. Use quando o pedido for produzir, refazer ou entregar um vídeo, Reels ou Short da agência, um roteiro da Roteirista aprovado, "faz o vídeo do roteiro", ou o trabalho do Locutor, do Animador e do Revisor de vídeo, mesmo que a pessoa não fale em skill.
---

# Vídeos curtos da Agência Setup (setor de vídeo)

O caminho: o **Caçador de virais** acha o Short que saiu da curva, a **Roteirista** escreve o roteiro e põe na mesa, **o dono aprova**, e só então este processo produz. Vídeo sem roteiro aprovado não nasce. O vídeo vai para a fila como **rascunho**; quem aprova e agenda é o dono.

Quem faz cada parte (sala Vídeo do Escritório, todos no Windows): **Locutor** (Arão S.) narra, **Animador** (Noemi T.) monta e renderiza, **Revisor de vídeo** (Gideão F.) assiste aos quadros e corrige. No fim, um turno de cada um no Escritório.

Leia antes: a memória `reels-e-voz.md` (o que o dono aprovou e reprovou em vídeo) e `clonar-estilo-nao-reinventar.md`, `docs/estilo-instagram.md` e o `CLAUDE.md` do estúdio (`Curso-Videos/estudio/CLAUDE.md`, com a skill `video-com-claude` dele).

## A mensagem (o erro que já aconteceu)

O primeiro vídeo (Reel 41, 10/11/2026) dizia "Pedi pro Claude reinventar o meu feed" e chamava o feed antigo de "sem padrão, sem graça". O dono reprovou: o feed dele é o padrão de mercado em design, e o Claude **clona** o estilo dele, chegando perto (ele diz uns 80%). Por isso:

- O Claude aprende o padrão e repete: "no meu estilo", "no meu padrão".
- Nunca "reinventou", "melhorou", "consertou", "mais bonito". Nunca o feed antigo como feio, sem padrão ou sem graça. Nada de "antes e depois" em que a IA melhora o trabalho dele.
- Não prometa igual. A promessa é tempo: o post sai no padrão dele sem abrir editor.
- O fim sempre vende: o mini curso com o preço de verdade (`ver_oferta`) e "Comenta PALAVRA" grande na tela.

## 1. O roteiro

- A mesa: `node scripts/conector.mjs escritorio_ver '{}'`. O cartão da `roteirista` tem que estar **aprovado**.
- O roteiro inteiro (formato, gancho, falas, tela, palavra, segundos): `node scripts/conector.mjs video_virais '{"status":"roteiro"}'`, em `leitura.roteiro`. O link do cartão leva o id do Short que inspirou.
- Antes de produzir, confira o texto contra a regra acima e o preço do dia. Se algo estiver errado, mostre ao dono a correção antes de gastar a voz e o render.

## 2. A produção (PowerShell, na pasta `Curso-Videos\estudio`)

Pasta do vídeo: `videos\pt-reel-<n>` (o próximo número livre). Comece de um molde parecido (`pt-reel-31` a `pt-reel-34`, ou `pt-reel-41` para o formato de tela) e mude gancho, cenário e música: o dono reprova o que fica "muito igual".

1. Imagens reais em `midia\` (posts e carrosséis de verdade: `_local\carrossel\<nome>\`, `templates\carrossel\`, posts do perfil em `_local\ig-perfil`). Nada de número, depoimento ou resultado inventado; tela desenhada (conversa, botão) é ilustração e não pode parecer print real de cliente.
2. `node ferramentas/montar.mjs videos/pt-reel-<n> --falas`
3. A voz, com regravação até o Whisper ouvir certo (umas 1,5 min):
   `$env:PYTHONIOENCODING='utf-8'; & "..\..\Curso\_ferramentas\voz\.venv\Scripts\python.exe" videos\_reels-en\tomadas.py pt <n>`
   Grafia para a voz: "Clawd" no lugar de Claude, número por extenso ("cinco"), preço falado ("trinta e nove e noventa"). A legenda na tela mostra o texto normal.
4. Se mudar o ritmo da voz no `video.js` (velocidade, pausas), rode o passo 2 de novo.
5. `.\videos\_reels-en\juntar-voz.ps1 pt <n>` (junta e marca o tempo de cada palavra).
6. A música, do Pixabay sem Content ID (`musicas\pixabay`, veja o `LICENCA.md`; nunca o `piano.mjs`): `ffmpeg -v error -y -ss <início> -t <duração> -i musicas/pixabay/<faixa>.mp3 -ar 48000 -ac 2 -c:a pcm_s16le videos/pt-reel-<n>/audio/musica.wav`. `musica.volume` em torno de 0,7 deixa a música uns 12 a 14 dB abaixo da voz nas pausas.
7. Prévia com as conferências: `node ferramentas/fazer.mjs videos/pt-reel-<n> previa --zona-segura`. As quatro conferências precisam dar zero.
8. Quadros de perto: `node ferramentas/render.mjs videos/pt-reel-<n> quadros 5.0 6.2 ...`.
9. Final: `.\videos\_reels-en\final.ps1 pt <n>` (umas 1,5 min). Sai em `Curso-Videos\videos-pt\reel-<n>.mp4`, até 50 MB. O de `estudio\prontos\` passa do limite: não use.
10. Capa: um quadro com o gancho legível, sem a legenda da fala, em 1080x1920 (`capa.mjs` do molde 41), conferindo o corte 3:4 da grade do perfil.

## 3. A revisão (antes de qualquer pessoa ver)

Folha com os quadros de 0,2 s, 0,6 s e 1,0 s, o meio de cada cena e o último quadro (`revisao.ps1` do molde 41). Olhe e corrija:

- o gancho lido e entendido em 0,2 s;
- nenhum texto vazando da tela ou passando por cima da legenda (as conferências do estúdio não pegam rótulo de cena por cima da legenda);
- nenhuma pílula ou rótulo tapando o texto de um post;
- a legenda batendo com a fala;
- a mensagem dentro da regra de clonar o estilo;
- o fim com "Comenta PALAVRA" grande;
- a música abaixo da voz.

Erros conhecidos:
- `cd` no Bash dá erro do fnm: use o PowerShell ou caminho completo.
- O `tomadas.py` dá nota baixa para preço porque o Whisper escreve em algarismos ("R$ 39,90"). Confira o trecho sozinho antes de regravar.
- `transcrever.py --placa` falha calado: rode sem `--placa`.
- O último quadro sai com `ffmpeg -sseof -0.3 -update 1`.

## 4. A entrega (rascunho)

Escreva `_local/video/<nome>/peca.json` (fora do Git):

```json
{ "titulo": "Reel: ...", "slug": "nome-do-video", "perfil": "br",
  "video": "Curso-Videos/videos-pt/reel-<n>.mp4", "capa": "Curso-Videos/videos-pt/reel-<n>-capa.jpg",
  "alt": "o que aparece no vídeo", "legenda": "...", "roteiro": "as falas, uma por linha",
  "recurso_id": "o material grátis que a palavra manda",
  "comenta": { "palavra": "PALAVRA", "nome": "Reel <n> ...: PALAVRA", "modo": "direto", "estrategia": "melhor",
    "responder_publico": true, "resposta_ia": true, "variantes": [ { "id": "a", "nome": "...", "dm": "...", "botao": "...", "publico": ["..."] } ] } }
```

A legenda segue o guia: o gancho na 1ª linha, "Comenta PALAVRA" logo na 2ª, frases curtas, pontos de respiro e #boracalango com 2 ou 3 do tema. Sem travessão. A mensagem do direct e o botão (até 20 letras) seguem as palavras que já estão no ar com a mesma palavra (`listar_comenta`).

- `node scripts/video-entregar.mjs _local/video/<nome> --simular`: confere o tamanho, a legenda, a palavra e o material, sem mandar nada.
- `node scripts/video-entregar.mjs _local/video/<nome>`: sobe o vídeo e a capa e cria a peça como rascunho, com a palavra desligada. Ela liga sozinha quando a peça aprovada for publicada.
- Refez o vídeo? `--atualizar` troca o vídeo, a capa, o título, a legenda e o roteiro na mesma peça. O vídeo antigo vai para `Curso-Videos\videos-pt\arquivo\` com o sufixo `-v1`.

## 5. O registro

- Um turno de cada agente que trabalhou (`escritorio_turno` com `locutor`, `animador` e `revisor-de-video`, `onde: computador`), dizendo o que fez, com o tempo da voz e do render.
- O resultado no cartão do roteiro (`escritorio_resultado`, com o link do rascunho em `https://agenciasetup.com.br/admin/posts/<id>`). Só vale para cartão aprovado.
- O viral como usado: `video_viral_marcar` com `usado`.
- Mande ao dono o arquivo do vídeo para assistir e o link do rascunho, e diga o que não foi conferido (por exemplo, se ninguém ouviu o áudio inteiro).
