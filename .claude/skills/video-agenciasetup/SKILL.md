---
name: video-agenciasetup
description: Produção dos vídeos curtos (Reels e Shorts, 9:16) do setor de vídeo da Agência Setup, a partir de um roteiro que o dono aprovou na mesa do Escritório. Narra com a voz clonada do Filipe (OmniVoice) no Windows, monta as cenas no estúdio em código (Curso-Videos/estudio), revisa os quadros, entrega como rascunho na fila com o Comenta X e registra o trabalho no Escritório. Use quando o pedido for produzir, refazer ou entregar um vídeo, Reels ou Short da agência, um roteiro da Roteirista aprovado, "faz o vídeo do roteiro", ou o trabalho do Locutor, do Animador e do Revisor de vídeo, mesmo que a pessoa não fale em skill.
---

# Vídeos curtos da Agência Setup (setor de vídeo)

O caminho: o **Caçador de virais** acha o Short que saiu da curva, a **Roteirista** escreve o roteiro e põe na mesa, **o dono aprova**, e só então este processo produz. Vídeo sem roteiro aprovado não nasce. O vídeo vai para a fila como **rascunho**; quem aprova e agenda é o dono.

Quem faz cada parte (sala Vídeo do Escritório, todos no Windows): **Locutor** (Arão S.) narra, **Animador** (Noemi T.) monta e renderiza, **Revisor de vídeo** (Gideão F.) assiste aos quadros e corrige. No fim, um turno de cada um no Escritório.

**Sozinho, desde 10/11/2026:** a tarefa agendada `video-do-roteiro` (Windows, todo dia às 14h) segue esta skill para o roteiro aprovado mais antigo, um vídeo por rodada e até 5 em 7 dias, só com o limite semanal do Claude abaixo de 80%. A vez sai de `node scripts/video-vez.mjs` (só lê o banco): ele confere o roteiro contra as regras e o preço de hoje, vê se a placa está livre, sugere a música do rodízio e o número do Reel. Roteiro que esbarra numa regra não é produzido: o dono recebe o aviso e decide. Feito à mão, fora da tarefa, rode o `video-vez.mjs --travar <cartão>` antes de usar a placa e o `--soltar` no fim, para a tarefa não começar outro vídeo junto.

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

Para variar o movimento (desde 11/11/2026, o dono mandou levar para o motor): gancho com `entra: 'letras'` e `marca: true`, troca de cena com `transicao: 'giro'`, palavra-chave com `anota` (círculo à mão com nota), `entra: 'linhas'` no título do passo, o elemento `antes-depois` (post comum contra post no padrão) e a função `gsap` de uma cena. Tudo no vocabulário do estúdio (`references/vocabulario.md` da skill `video-com-claude`); o teste com tudo junto é `videos\teste-motor-novo`. Use um ou dois por vídeo, não todos.

**O começo prende no primeiro segundo** (crítica do dono em 11/11/2026: "muito estático, muito texto e fundo genérico, não tem profundidade, não tem impacto"). O quadro zero já tem movimento e coisa de verdade; duas ou três palavras grandes, no máximo (a frase inteira está na voz e na legenda); fundo com profundidade (foto, camadas em 3D, algo desfocado na frente, câmera andando), nunca gradiente liso; e um golpe no ritmo da fala (a palavra batendo, tremida, clarão, som de impacto). Monte e confira o começo antes do resto. Exemplo: a cena 1 de `videos\teste-motor-novo` (posts reais voando em 3D e "SÓ aprovo." batendo).

**A cara da agência** (pedido do dono em 11/11/2026: "sinto falta do estilo da agência", "não gosto do amarelo e azul claro de fundo"): o vídeo usa o visual dos carrosséis de 2026. A janela preta "— @agenciasetup | Calango ×" com as réguas fica parada por cima do vídeo inteiro (`moldura` no `window.AULA`), o fundo é quase preto com luz âmbar, os títulos são Anton com a palavra em serifa itálica laranja, o selo "calango" com o cursor aponta o que importa, os cartões são escuros e a legenda da fala acende a palavra em laranja. As peças prontas estão no `estilo.css` de `videos\teste-motor-novo` (copie para o vídeo novo). E cada ideia da fala vira coisa que mostra a ideia: "o trabalho chato" é um Trello com o cartão se escrevendo sozinho, não a frase na tela. Essa cara é a base, não uma prisão (o dono, no mesmo dia: "pode ter liberdade pra fugir do estilo às vezes, mexer em perspectiva, fundo só preto pra causar impacto, às vezes uma cor de contraste, pode explorar"): varie a cada vídeo, sem voltar ao fundo amarelo ou azul claro, ao gradiente liso e ao texto parado.

1. Imagens reais em `midia\` (posts e carrosséis de verdade: `_local\carrossel\<nome>\`, `templates\carrossel\`, posts do perfil em `_local\ig-perfil`). Nada de número, depoimento ou resultado inventado; tela desenhada (conversa, botão) é ilustração e não pode parecer print real de cliente.
2. `node ferramentas/montar.mjs videos/pt-reel-<n> --falas`
3. A voz, com regravação até o Whisper ouvir certo (umas 1,5 min):
   `$env:PYTHONIOENCODING='utf-8'; & "..\..\Curso\_ferramentas\voz\.venv\Scripts\python.exe" videos\_reels-en\tomadas.py pt <n>`
   Grafia para a voz: "Clawd" no lugar de Claude, número por extenso ("cinco"), preço falado ("trinta e nove e noventa"). A legenda na tela mostra o texto normal.
4. Se mudar o ritmo da voz no `video.js` (velocidade, pausas), rode o passo 2 de novo.
5. `.\videos\_reels-en\juntar-voz.ps1 pt <n>` (junta e marca o tempo de cada palavra).
6. A música, do Pixabay sem Content ID (`musicas\pixabay`, veja o `LICENCA.md`; nunca o `piano.mjs`): `ffmpeg -v error -y -ss <início> -t <duração> -i musicas/pixabay/<faixa>.mp3 -ar 48000 -ac 2 -c:a pcm_s16le videos/pt-reel-<n>/audio/musica.wav`. `musica.volume` de 0,55 deixa a música uns 12,5 dB abaixo da voz (0,62 dá uns 11,5 dB e 0,7, uns 10,4 dB, medidos nos Reels 41 a 43). Os efeitos das trocas de cena caem nas pausas: meça o mix final também. Trocar só a música não pede render novo: `node ferramentas/mix.mjs` e um ffmpeg que copia o vídeo (`-c:v copy`) e troca o áudio.
   Rodízio: nunca a faixa de nenhum dos 3 vídeos anteriores, sempre com outro trecho. O `node scripts/video-vez.mjs --local` diz qual usar (a nunca usada primeiro); depois do vídeo, anote com `--musica <faixa> --reel <n> --inicio <s>` (fica em `musicas/pixabay/uso.json`). São 8 faixas: Upbeat Funk (Reels 33 e 41), Lofi Upbeat (32), Energetic Upbeat (42), Good Morning (43) e, desde 10/11/2026, Hip Hop Upbeat, Future Bass, Upbeat Corporate e Tropical House Paradise. Faixa nova só com o ok do dono e sem "Content ID Registered" na página (anote no `LICENCA.md`).
7. Prévia com as conferências: `node ferramentas/fazer.mjs videos/pt-reel-<n> previa --zona-segura`. As quatro conferências precisam dar zero.
8. Quadros de perto: `node ferramentas/render.mjs videos/pt-reel-<n> quadros 5.0 6.2 ...`.
9. Final: `.\videos\_reels-en\final.ps1 pt <n>` (umas 1,5 min). Sai em `Curso-Videos\videos-pt\reel-<n>.mp4`, até 50 MB. O de `estudio\prontos\` passa do limite: não use.
10. Capa: um quadro com o gancho legível, sem a legenda da fala, em 1080x1920 (`capa.mjs` do molde 41), conferindo o corte 3:4 da grade do perfil. Rode sempre depois do `final.ps1`, que grava a capa a partir do quadro zero.

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
- O `tomadas.py` refaz as tomadas da fala do preço toda vez que roda, porque ela nunca passa da nota. Regravar outra fala gasta placa de vídeo com o preço de novo.
- "Comenta PALAVRA, que..." pode sair "Comenta a PALAVRA". Na voz, "Comenta: palavra!" resolve.
- No `estilo.css` de cada vídeo, use nomes com prefixo (`r42-...`). Nome genérico colide com o motor: `.msg` deixa o texto quase branco, `.ico` encolhe o ícone e `.anexo` já tem estilo lá.
- O elemento `carimbo` ocupa a largura toda e vira uma faixa: para carimbo, use `html` com `inline-block`.
- `sai` depois de `voa` faz o elemento voltar ao lugar de origem. Para sumir com algo que voou, use `esconde`.
- Fundo próprio (classe do vídeo) o motor trata como escuro: em cenário claro, defina as cores do texto no CSS.
- Elemento largo com `entra: 'esquerda'` dispara o aviso de texto cortado. Use `sobe`.
- No PowerShell 5.1, `Set-Content -Encoding utf8` põe BOM no arquivo: use `[IO.File]::WriteAllText`.

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
