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

## Depende do dono

- [ ] **Os avisos de dúvida do direct e do Escritório não chegam a ninguém.** O único aparelho com avisos (o iPad) só tem os tipos de venda ligados. "Dúvida no direct", o resumo das 8h, os alarmes do Zelador e as junções da Colmeia saem para 0 aparelhos. Ligar "Direct" e "Escritório de IA" nos avisos do app Vendas (ou autorizar ligar pelo banco).
- [ ] **Entregar o Combo na Hubla é só manual.** A tarefa existe mas não está agendada: quem compra espera até alguém mandar. Agendar 2 vezes por dia e avisar quando houver entrega esperando há mais de 6 horas?
- [ ] **Rodadas do direct:** são 9 por dia. Com a saída cedo, as vazias quase não gastam. Reduzir para 5 (9h, 12h, 18h, 20h, 22h) continua possível.
- [ ] **Quem executa o cartão aprovado?** Hoje ninguém: só quando o dono pede ao Claude. Opções: o Chefe de gabinete cobrar as aprovadas paradas há 2 dias, ou uma tarefa "fazer as aprovadas".
- [ ] **O Mac não dá sinal de vida.** O comando está em Escritório > Computadores; sem ele a tela não sabe quando o direct parou.

## Lote 2: próximo (código)

- [ ] **Tetos do follow-up no código.** 10 por rodada, 40 por dia e "3 toques sem resposta" só existem no texto da skill. Fazer a lista devolver quanto ainda cabe hoje e o `followup_mandar` recusar acima do teto.
- [ ] **`followup_mandar` conferir preço e link** como o Atendente confere (hoje só olha travessão e tamanho).
- [ ] **Pausar e demitir valer para todos os agentes do Worker.** Chefe, Caçador e Conciliador rodam mesmo pausados; a tela diz "ainda não dá por aqui" para agentes que já respeitam.
- [ ] **O agente ler o recado do dono.** Roteirista, Olheiros e Diretor de arte recebem só o título dos cartões antigos. Passar "aprovados, com resultado" e "descartados, com o recado" na instrução de cada um.
- [ ] **Teto de gasto completo:** o Plano (Opus), as respostas do Comenta X e as versões de mensagem não olham o teto do dia; `teto_dia_usd` por agente é gravado e ninguém lê.
- [ ] **Placar por item da Colmeia** conta todas as regras em toda conversa (não mede nada). Gravar só o que a IA usou.
- [ ] **Comenta X aprender com venda**, não só com clique e seguidor.
- [ ] **Cartões parados:** "Depois" nunca volta; aprovado que já foi feito não fecha; cartão do Olheiro visual fica órfão quando é aprovado depois do Diretor rodar.
- [ ] **Zelador:** alarmar quando o aviso sai para 0 aparelhos; vigiar as entregas da Hubla, o Chefe parado e a rodada do direct perdida entre duas rodadas seguidas.
- [ ] **Turnos:** custo informado no fechamento de um turno aberto não entra em `consumo_ia`; `dados` com mais de 4.000 letras some sem erro; o Caçador não registra turno quando falha.
- [ ] **Telas:** seletor de modo do Atendente (hoje um toque troca o modo sem dizer para qual); contador no menu e bloco "Esperando você" no Início; filtro "Arquivados" na Colmeia com "Voltar a valer"; o roteiro inteiro na tela de vídeos; a seta de desempenho contar só venda dos últimos 7 dias; a tarefa (frase ou carrossel) no rótulo do turno.
- [ ] **Uma fonte só para preço e resposta:** a skill do direct repete a tabela de respostas e os preços que também estão na Colmeia e na oferta.
- [ ] **Cadastro dos agentes** (onde roda, modelo, cadência) diferente do que existe; `docs/escritorio.md` com itens já feitos marcados como pendentes.
- [ ] **Limite do plano:** as tarefas de carrossel e de frase leem uns 135 KB e 56 KB de skill todo dia; separar "regras vigentes" do histórico. A parte "Comandos" do `CLAUDE.md` é mais da metade do arquivo e carrega em toda sessão.

## O que está bem feito (não mexer)

- Marcar a tentativa antes de gastar, com tentativas limitadas, e o `simular` em todo agente com IA.
- A conferência em código do que a IA devolve (preço, link, número, palavra) em todos os agentes.
- O eco reconhecido pelo id da mensagem e o silêncio de 12 horas depois de conversa de gente.
- A pessoa no link, e a junção segura do Conciliador com o botão de desfazer.
