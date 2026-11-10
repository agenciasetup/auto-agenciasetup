# Revisão do Escritório (10/11/2026)

Pedido do dono: "olhar o escritório todo, todas funções. O que está inconsistente, o que pode se atrapalhar, o que não está funcionando bem, o que pode barrar o aprendizado, o que poderia ser vinculado melhor, otimizado, se falta alguma peça, se tem algo fazendo o que não devia, o que está intuitivamente ruim. Você vai corrigir pra mim."

Três leituras em paralelo (relógio e agentes com o estado de produção; vendas e aprendizado; telas e tarefas do computador) deram uns 40 achados. Este arquivo é a lista de trabalho: o que já foi corrigido, o que vem no próximo lote e o que depende de uma decisão do dono.

## Lote 1: corrigido e no ar em 10/11 (ok do dono: "Sim, publique"; versão `62f6cf2b`)

**Vendas e direct**
- [x] **A palavra dentro de uma pergunta.** "Quanto custa o POSTS?" mandava o material e a pergunta ficava sem resposta (e, se a pessoa já tinha recebido o material nas últimas 24 horas, a mensagem era jogada fora). Agora o material sai e a pergunta segue para o Atendente (`temPergunta` em `worker/lib/gatilhos.js`). Só a palavra, sozinha, continua como antes.
- [x] **A resposta do Atendente não conta como toque de vendedor.** Antes ela marcava o primeiro toque e sorteava um vendedor para quem nunca foi tocado por vendedor nenhum: o placar Calango x Pergunta contava gente que só falou com o Atendente (`salvarFollowup`, opção `atendente`).
- [x] **A rodada do direct não fala por cima do dono nem do Atendente.** A lista do follow-up traz `pausa` ("dono": ele conversou pelo aplicativo nas últimas 12 horas; "atendente": mensagem na fila ou resposta esperando o ok) e a tarefa pula essas pessoas. O `followup_mandar` recusa mandar por cima de conversa do dono quando quem pede é agente, e recusa quem está em "Não quer".
- [x] **Quem pagou sai da fila em até 10 minutos.** A conferência de compras e a entrada de quem comentou rodavam só quando o computador rodava a tarefa. Agora rodam no relógio de 10 minutos (`sincronizarFollowup` em `rodarRelogio`): o Atendente não oferta para quem já comprou.
- [x] **Quem espera a resposta do dono não fica mudo.** Se a pessoa escreve de novo em "Dúvida com você", o dono é lembrado no celular, uma vez por dia por conversa.
- [x] **Proposta não vale como regra.** Pelo conector, `colmeia_ler` devolve só o que está valendo. Antes a resposta que o dono deu para UMA pessoa (que nasce como proposta) aparecia para o vendedor como "resposta do dono". A skill e a tarefa do direct dizem a mesma coisa agora.
- [x] **Lição de vendedor entra como observação.** `vendeu` e `nao_vendeu` iam para a instrução do Atendente na mesma lista das respostas liberadas. Agora vão num bloco separado ("é só observação: não é regra nem frase liberada"), no máximo 3 por conversa, lidas à parte para nunca empurrar para fora o que o dono ensinou. O teto de regras subiu de 12 para 30.
- [x] **O Atendente também roda na volta de 10 minutos.** Essa volta roda no lugar da de minuto: quem parava de escrever perto de um minuto terminado em 0 esperava um minuto a mais. O Conciliador idem.

**Telas**
- [x] **Pergunta do Conciliador com campo de resposta** (tela Colmeia): o dono responde no cartão, o Conciliador reescreve o item e o texto novo espera o Aprovar.
- [x] **Recado para o agente na mesa do Escritório.** Cada cartão tem um campo "Recado para o agente (opcional)": o que mudar, ou por que não. Vale para Aprovar, Depois e Descartar, fica guardado no cartão (`propostas.motivo`), aparece em "Últimas fechadas" e no perfil do agente. Descartada ganhou "Voltar para a mesa".
- [x] **Aprovar diz a verdade.** O aviso e o rodapé dizem que ninguém começa sozinho, e "Aprovadas, falta fazer" subiu para logo abaixo da mesa.
- [x] **"Agentes ativos"** no lugar de "agentes trabalhando" (ativo é contratado e sem pausa, não "trabalhando agora").
- [x] **O aviso de dúvida abre a aba certa** (`/admin/followup?fase=duvida`).
- [x] **Responder uma dúvida diz o que acontece:** se o Atendente leva em um minuto ou se a pessoa só recebe na próxima rodada.

**Zelador e tarefas**
- [x] **Erro já resolvido não é alarme.** O Zelador repetia por 24 horas o erro de um agente que já tinha rodado certo depois.
- [x] **Tarefa do direct:** as rodadas que não são a das 9h começam vendo se há alguém para puxar; sem ninguém, terminam sem ler a skill nem abrir o Chrome (economia do limite do plano). A ordem do lote não manda mais responder quem o Atendente já respondeu. Quem escreveu nas últimas 24 horas recebe pelo `followup_mandar`, sem Chrome.

Conferido antes de publicar: `node scripts/conferir-atendente.mjs` (121 conferências, com os casos novos), `conferir-conciliador`, `conferir-sistema`, `conferir-video`, e o painel compila. Conferido em produção: `node scripts/conferir.mjs https://agenciasetup.com.br` deu tudo certo; pelo conector, `colmeia_ler` devolve só os 32 itens que valem e as 3 propostas vêm com a pergunta separada; `followup_lista` traz o campo `pausa`. Não foi visto na tela: o cartão com o campo de resposta e o recado na mesa (a prévia local travou). A reescrita do Conciliador com a IA de verdade só acontece quando o dono responder o primeiro cartão.

## Lote 2: corrigido e no ar em 10/11 (ok do dono: "Sim, comece... pode regaçar e fazer com perfeição" e "Sim, publique"; versão `e428af03`)

**Avisos e o que espera o dono**
- [x] **Os avisos chegam.** Tipo novo de aviso passa a valer para aparelho que já estava ligado (`querTipo` em `worker/lib/push.js`; cada aparelho guarda em `conhece` os tipos que existiam quando a pessoa escolheu). O iPad passa a receber "Dúvida no direct" e "Escritório de IA" sem ninguém mexer no banco; o que o dono desligar depois continua desligado.
- [x] **"Esperando você" num lugar só.** Bloco no topo do Início com quatro números (mesa do Escritório, dúvidas do direct, propostas da Colmeia, entregas do Combo) e contador no menu em Escritório, Follow-up e Colmeia. Rota `GET /esperando` (`worker/lib/acoes-esperando.js`).

**Direct**
- [x] **Tetos no código.** `tetosFollowup` e `podeTocar` em `worker/lib/followup.js`: 40 mensagens puxadas por dia, 10 pessoas por rodada (janela de 45 minutos) e 3 mensagens sem resposta. A lista e a ficha trazem `tetos`, `pode_tocar`, `toque` e `nao_tocar_motivo`; na terceira mensagem sem resposta a pessoa vai para "Não quer" sozinha. O dono muda os números em `config.followup_tetos`. A tela Follow-up mostra quanto já foi usado. A tarefa do direct obedece a conta do sistema.
- [x] **`followup_mandar` confere.** Quando quem manda é agente: a regra única (`pode_tocar`) e preço e link (`conferirToque` em `atendente.js`: só os preços de hoje, o que o dono liberou na Colmeia, na resposta à dúvida e na nota da ficha; link só os nossos, com ou sem a etiqueta da pessoa).
- [x] **Atendente em uns 20 segundos.** Despertador num Durable Object (`worker/despertador.js`, lógica em `worker/lib/despertador.js`): a mensagem arma o alarme para depois da espera, o alarme roda o mesmo Atendente e marca a próxima hora se alguém ainda está escrevendo. O relógio de minuto continua de reserva. Liga em Follow-up > Avançado (`config.atendente.na_hora`); nasce desligado.
- [x] **Placar por item da Colmeia** não conta mais as regras (entravam em toda conversa e somavam o mesmo número em todas).

**Comenta X**
- [x] **A versão que vende ganha.** A venda de cada versão entra na escolha com peso 20 sobre o clique, sem deixar 1 venda de sorte decidir (`vendasPorVersao` e `escolherVariante` em `comenta.js`). A tela mostra as vendas de cada versão e a "chance de ser a melhor" usa a mesma conta do envio. Sem a leitura de vendas, a escolha é a de antes. `node scripts/conferir-comenta.mjs` (64 conferências).
- [x] **Teto de gasto:** a resposta pública do Comenta X, as versões de mensagem e o Plano (Opus) conferem o teto do dia antes de chamar a IA.

**Agentes do Worker**
- [x] **Pausar e demitir valem para todos** os agentes do Worker com código próprio (`agenteLiberado` em `escritorio.js`; `CONTROLA` com os 11). Para quem roda no computador ou é rotina fixa do relógio, a tela diz por que o botão não aparece.
- [x] **O agente lê o recado do dono.** Roteirista, Olheiro de ferramentas, Olheiro visual e Diretor de arte recebem os próprios cartões antigos com status, recado e resultado (`memoriaDoAgente`), com a instrução de não repetir o que foi descartado.
- [x] **O Chefe cobra o parado:** aprovado há mais de 2 dias sem resultado e "Depois" há mais de 7 dias entram no resumo das 8h; aprovada deixou de aparecer como decisão nova.
- [x] **Zelador:** aviso que sai para 0 aparelhos vira cartão na mesa; entrega do Combo esperando há mais de 6 horas, resumo das 8h que não saiu e turno preso em "rodando" viram alerta.
- [x] **Turnos:** custo informado no fechamento entra na conta (só a diferença); `dados` acima de 4.000 letras é recusado com erro em vez de sumir; o Caçador sempre avança o cursor e registra erro quando mais da metade dos canais falha.

**Telas**
- [x] Seletor de modo do Atendente com as três opções à vista; "Arquivados" na Colmeia com "Voltar a valer"; o roteiro inteiro em Vídeos fora da curva; a tarefa no rótulo do turno e "Seu recado" no perfil do agente; a seta de desempenho conta só venda dos últimos 7 dias; etiqueta "Conversa com você" e "Com o Atendente" na ficha do follow-up.

**Tarefas e limite do plano**
- [x] **Entrega do Combo na Hubla agendada** às 11h e às 17h (antes era só manual). Sem comprador novo, termina sem abrir o navegador.
- [x] **`CLAUDE.md` um terço menor:** a lista de comandos foi para `docs/comandos.md`, e a instrução de "ler antes de qualquer comando" passou a mandar procurar pelo assunto em vez de ler o plano e as decisões inteiros (mais de 220 KB).

Conferido no computador: `conferir-atendente` (154), `conferir-comenta` (64), `conferir-sistema` (64), `conferir-chefe` (35), `conferir-video` (43), `conferir-design` (55), `conferir-conciliador` (90), o painel compila e o pacote do Worker monta com o despertador. As telas novas foram vistas numa prévia com dados de mentira (Início, Follow-up, Colmeia, Vídeos).

Conferido em produção: `node scripts/conferir.mjs https://agenciasetup.com.br` deu tudo certo; pelo conector, `followup_lista` traz `tetos` e `pode_tocar`, `listar_comenta` traz as vendas de 9 versões e `escritorio_ver` abre. O contador de toques nasceu no meio do dia e foi acertado com as 5 mensagens de vendedor que já tinham saído. O despertador foi ligado logo depois da publicação (`config.atendente.na_hora`). Não foi visto com dado de verdade: as telas novas, o efeito do recado no que os agentes escrevem e a troca de versão do Comenta X por venda.

## Ainda aberto

**Depende do dono**
- [ ] **O Mac não dá sinal de vida.** O comando está em Escritório > Computadores; sem ele a tela não sabe quando o direct parou.
- [ ] **Rodadas do direct:** são 9 por dia. Com a saída cedo, as vazias quase não gastam. Reduzir para 5 continua possível.
- [ ] **Enxugar o que as tarefas de carrossel e de frase leem** (uns 135 KB e 56 KB todo dia). É a régua de qualidade das capas: separar "regras vigentes" do histórico com o dono olhando.
- [ ] **Cadastro dos agentes diferente do que roda** (é banco): o Chefe sem modelo (roda Sonnet 5.5), o Atendente como "Sonnet" (é misto), o Testador de mensagens como "computador, 9h" (as versões são escritas no Worker), e os horários "às 9h" e "às 10h" (são 9h31, 9h03 e 10h03).

**Código**
- [ ] **Quem executa o cartão aprovado.** O Chefe cobra, mas ninguém começa sozinho. Uma tarefa "fazer as aprovadas pequenas" seria o próximo passo.
- [ ] **Cartões parados:** aprovado que já foi feito não fecha sozinho; o cartão do Olheiro visual fica órfão quando é aprovado depois do Diretor rodar.
- [ ] **Uma fonte só para preço e resposta:** a skill do direct ainda repete a tabela de respostas (agora dizendo que a Colmeia vale mais).
- [ ] **`teto_dia_usd` por agente** é gravado e ninguém lê.
- [ ] **O botão do mini curso no direct não leva a versão da mensagem:** a venda é atribuída pela pessoa (follow-up). Levar o código do link curto deixaria a conta direta.
- [ ] **Pedido de upsell herda os toques do original** (`vendas.js`): em Vendas a mesma pessoa conta duas vezes no mesmo conteúdo.
- [ ] **Zelador:** a rodada do direct perdida entre duas rodadas seguidas ainda passa.
- [ ] **No celular,** Escritório, Follow-up e Colmeia ficam dentro de "Mais": o contador só aparece abrindo a folha.

## O que está bem feito (não mexer)

- Marcar a tentativa antes de gastar, com tentativas limitadas, e o `simular` em todo agente com IA.
- A conferência em código do que a IA devolve (preço, link, número, palavra) em todos os agentes.
- O eco reconhecido pelo id da mensagem e o silêncio de 12 horas depois de conversa de gente.
- A pessoa no link, e a junção segura do Conciliador com o botão de desfazer.
