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

## Lote 3: corrigido e no ar em 10/11 (ok do dono: "Sim, comece" e "Sim, publique"; versão `ef626e03`)

Publicado em 10/11 às 19h19 (UTC). Depois da publicação: agente `executor` (Neemias R.) criado pelo conector e tarefa agendada `fazer-aprovadas` criada (7h10). Conferido no ar: `conferir.mjs` na produção, o Escritório pelo conector (os 32 agentes com o campo `fala`, a fila do Executor respondendo) e o relógio de minuto sem erro.

**Quem faz o cartão aprovado (o Executor)**
- [x] **A tarefa diária `fazer-aprovadas`.** Pega um cartão aprovado por rodada, só de esforço pequeno, o aprovado há mais tempo primeiro. Faz o que cabe dentro do projeto, confere com os ensaios, deixa um commit local e anota o andamento no cartão. Nunca publica, nunca grava no banco e nunca fala com ninguém: site público, dinheiro, redes, mensagens, tetos e as instruções do próprio Claude continuam esperando o dono. O roteiro e o texto da tarefa estão em `docs/tarefa-aprovadas.md`.
- [x] **O andamento sem tabela nova.** É o último turno que cita o cartão (`turnos.dados.proposta`, com `desfecho`, `nota` e `commit`). Quatro desfechos: feito, pronto e falta publicar, espera você, tentou e não conseguiu (tenta outro dia, uma vez). Quem escolhe o cartão é o sistema (`verFilaDoExecutor`, `filaDoExecutor`, `andamentosDe` e `lerAndamentos` em `worker/lib/escritorio.js`; no conector, `escritorio_ver` com `fila` verdadeiro).
- [x] **A tela e o Chefe falam a mesma língua.** Em "Aprovadas, falta fazer" cada cartão ganhou a linha do andamento (`Escritorio.tsx`). O Chefe de gabinete cobra "Pronto, falta publicar" separado de "Aprovado e parado" (`cobrancaDe` em `chefe-de-gabinete.js`).
- [x] **"Esperando você" conta o que está pronto.** O cartão da mesa, no Início, ganhou uma frase pequena: quantas aprovadas estão prontas (falta publicar) e quantas esperam uma decisão dele, contando as que o Executor tentou 2 vezes e não conseguiu (`nota` em `GET /esperando`, `worker/lib/acoes-esperando.js`). O número grande e o contador do menu continuam sendo só as propostas novas. Custa uma leitura a mais, e só quando há cartão aprovado.
- [x] **O Zelador cobra a tarefa só de quem existe.** A `fazer-aprovadas` entrou na lista de tarefas do computador (7h10, alerta depois das 7h55 sem turno do dia), mas só com o agente `executor` no cadastro e ativo, e a partir do dia seguinte ao da entrada dele. Sem o agente, pausado ou em vaga aberta, não cobra.
- [x] **Cartão aprovado que já foi feito tem dono para fechar.** O Executor fecha sozinho o que não precisa de publicação. O que precisa fica como "Pronto, falta publicar" e quem publica fecha (`escritorio_resultado` ou o botão "Foi feita", que abre com a nota dele).

**Cópia do banco**
- [x] **O Supabase grátis não guarda backup nenhum** (a API de gestão respondeu `"backups": []`). Agora o computador copia o banco inteiro uma vez por dia para `_backup/banco/` (fora do Git): as 80 tabelas, as migrations, a estrutura, os logins e a lista de arquivos, uns 4 MB por cópia, 14 cópias guardadas. `node scripts/backup.mjs` copia e confere a contagem de cada tabela; `node scripts/backup-restaurar.mjs` só simula e, para escrever, exige `--tabela <nome> --confirmo`. Tudo explicado em `docs/backup.md`.
- [x] **O Zelador avisa quando a cópia para.** Cada cópia que dá certo grava o sinal `config.backup_ultimo`. Alerta quando o sinal não existe, tem mais de 36 horas ou veio com zero tabelas ou zero linhas; alerta menor (uma vez, e de novo só depois de 3 dias) quando a cópia saiu com algum aviso. Não custa chamada a mais: o sinal vem na leitura de config que já trazia o modo do Atendente (`copiaDoBanco` em `zelador.js`).

**Vendas e Comenta X**
- [x] **O botão do mini curso no direct leva a versão da mensagem:** o endereço ganha `l=<código do link curto da versão>` e `utm_term=<post>`; as marcas de sempre (`curso`, `curso-topo`, a palavra, a pessoa) não mudam. A visita guarda o código no campo `link` (`origem.js`) e a venda cai direto na versão (`comenta.js`); o caminho pela pessoa fica de reserva para os pedidos de antes.
- [x] **A mesma pessoa contada duas vezes em Vendas:** em canal, campanha e conteúdo, "vendas" passou a contar pessoas; o dinheiro do complemento continua somando na origem (`calcularVendas` em `acoes-area.js`). O topo continua contando pedidos e ganhou `compradores`. Na base de 10/11 não havia nenhum pedido de upsell (nenhuma oferta tem upsell ligado); a conta dobrava para 1 pessoa, que comprou o complemento pelo checkout comum no dia seguinte (link da bio: de 37 para 36).
- [x] **A tela Vendas diz o que conta.** O rodapé de "De onde vieram as vendas" explica que ali, em Campanhas e em Conteúdos, quem comprou duas vezes conta uma; ao lado de "Vendas pagas" aparece de quantas pessoas elas são (`Vendas.tsx`).

**Zelador**
- [x] **Cada rodada do direct com o seu turno:** a janela da rodada fecha 7 minutos depois da hora cheia seguinte e um turno não vale mais por duas rodadas (`rodadasDoDia` em `zelador.js`). Limite que ficou: rodada de mais de 67 minutos ainda alarma, como antes; para acabar com isso a tarefa do direct teria de abrir o turno no começo (o Zelador já entende esse turno).
- [x] **Entrega do Combo por rodada:** a tarefa das 11h e das 17h não grava turno, então a conferência é pela lista. Avisa quando uma compra feita antes da rodada continua fora da Hubla 45 minutos depois dela. A regra antiga ("há mais de 6 horas") tocaria de madrugada para toda compra feita à noite.

**Telas e cadastro**
- [x] **No celular, o botão "Mais" mostra a soma dos contadores** do que está dentro dele (`admin/src/main.tsx`).
- [x] **Cadastro dos agentes igual ao que roda** (acertado no banco em 10/11 pelo conector, `escritorio_agente`): o Chefe com o modelo Sonnet 5.5; o Atendente como "misto: claude-haiku-5-5 abre, claude-sonnet-5-5 continua"; o Testador de mensagens com o modelo Sonnet 5.5 e a cadência "Todo dia, na rodada do direct das 9h. No Worker, só quando pedem versões novas" (continua "computador": a troca de versão de todo dia é o passo 2b da tarefa do direct); Roteirista "Segunda e quinta, às 9h31", Olheiro visual "Toda segunda, às 9h03", Diretor de arte "Toda segunda, às 10h03". Se o dono trocar o modelo do Atendente na tela, o cadastro precisa acompanhar.

Conferido no computador: `conferir-atendente` (154), `conferir-comenta` (87), `conferir-aprovadas` (72), `conferir-chefe` (48), `conferir-video` (43), `conferir-design` (55), `conferir-sistema --sem-banco` (107), `conferir-conciliador --sem-banco` (90), o painel compila e o pacote do Worker monta na simulação (`wrangler deploy --dry-run`). Não foi visto: nenhuma tela com dado de verdade, a primeira rodada do Executor, a restauração de uma tabela (só simulada) e os alertas novos do Zelador em produção.

## A planta do Escritório: "correções bobas" do dono, no ar em 10/11 (versão `ef626e03`)

Pedido dele olhando a tela: a Direção estava poluída, o Salomão estava com o desenho errado, os textos incomodavam e a Lista estava "poluída demais".

- [x] **Balão curto e pequeno.** Um por sala, de uma linha, em letra de 10,5 px. Só fala quem trabalha agora, quem acabou de fazer algo (30 minutos) e quem deu erro ou trouxe alerta (12 horas). Frase fixa por agente ("Atendendo no direct", "Fechei o resumo do dia"), sem IA: `falaDe` em `worker/lib/escritorio.js`. O resumo comprido do turno fica no perfil.
- [x] **Lista redesenhada.** Um bloco igual por sala, quatro colunas e um botão "Ver perfil" por linha. A mesa saiu de dentro da Direção. No celular, duas linhas por agente, sem rolar de lado.
- [x] **Direção nova.** Uma mesa só, plaquinhas, troféus e o tapete de urso polar. O dono escolheu entre três opções ("Sala 1 e os três").
- [x] **Calangos novos:** o do Filipe (óculos prata, boné bege, camisa branca, jeans, tênis branco), o do Erick (barba, jaqueta de couro preta), o do Salomão e o do Neemias, o Executor (o de crachá e café, que estava de reserva).
- [ ] **Não foi visto:** a tela de verdade com dados reais, o movimento (a troca de balão a cada 8 segundos), Safari e iPhone. A conferência foi na prévia com dados de mentira, no Chrome.
- [ ] **Com o Windows desligado, os três "ZzzZz" da sala Vídeo ficam um em cima do outro.** Já era assim.

## Ainda aberto

**Do lote 3**
- [x] Publicado, agente `executor` criado, tarefa `fazer-aprovadas` agendada e cópia do banco registrada no Agendador do Windows (`AgenciaSetup-Backup`, 3h30). Tudo em 10/11.
- [ ] **A permissão da tarefa `fazer-aprovadas` (depende do dono).** Ela foi criada por uma conversa aberta de fora do app, e o modo de permissão não foi junto: a rodada pode parar pedindo permissão, sem ninguém para responder. O dono abre a tarefa no app do Claude, escolhe o modo e clica em "Run now" uma vez. Se ela não rodar, o Zelador avisa depois das 7h55 (a partir de 12/11).
- [ ] **Ver a primeira rodada do Executor** (11/11) e a primeira cópia do banco pela tarefa do Windows (11/11, 3h30).
- [x] Os três textos de instrução foram aplicados em 10/11 (o `CLAUDE.md` e uma linha em cada tarefa, `direct-followup` e `entregar-combo-hubla`).

**Depende do dono**
- [ ] **O Mac não dá sinal de vida.** O comando está em Escritório > Computadores; sem ele a tela não sabe quando o direct parou.
- [ ] **Rodadas do direct:** são 9 por dia. Com a saída cedo, as vazias quase não gastam. Reduzir para 5 continua possível.
- [ ] **Enxugar o que as tarefas de carrossel e de frase leem** (uns 135 KB e 56 KB todo dia). É a régua de qualidade das capas: separar "regras vigentes" do histórico com o dono olhando.
- [ ] **Trocar as chaves que foram coladas no chat.** Quem troca é o dono, no painel de cada serviço; depois é gravar a nova em Integrações ou no `.env.local`.
- [ ] **Segunda cópia do banco fora do computador.** Hoje a cópia fica só neste computador: se o HD queimar, vai junto. As saídas (nuvem só dele ou HD externo) e os cuidados estão em `docs/backup.md`, "Se o computador pifar".
- [ ] **Storage acima do plano grátis?** O projeto está com 1,56 GB de arquivos e o plano grátis do Supabase costuma incluir 1 GB. Conferir na tela de uso do Supabase. `node scripts/midia-limpar.mjs` simula a limpeza das peças já publicadas.

**Código**
- [ ] **O cartão do Olheiro visual fica órfão** quando é aprovado depois do Diretor de arte rodar.
- [ ] **Uma fonte só para preço e resposta:** a skill do direct ainda repete a tabela de respostas (agora dizendo que a Colmeia vale mais).
- [ ] **`teto_dia_usd` por agente** é gravado e ninguém lê.
- [ ] **Posts de frase montados na nuvem** (Browser Rendering, que o Workers pago já inclui): hoje a arte sai do computador, e a tarefa das 8h depende dele ligado.
- [ ] **O perfil em inglês não tem link curto** (`/l/` não existe em `agenciasetup.com`): o botão do curso em inglês não leva a versão, e o Comenta X em inglês não conta clique nem venda por versão.
- [x] **A faixa "material-topo"** agora leva a pessoa (`p`) e a versão (`l`) para a venda (12/11/2026): o link curto passa o próprio código para a página do nosso site (`comVersao` em `worker/lib/api/checkout.js`), e `linkDoTopo` (`worker/render/paginas.js`) passa os dois adiante. Falta o deploy.
- [x] **As vendas por post contam pessoas** (12/11/2026, `atribuirVendas` e `somarVendas` em `worker/lib/acoes.js`): quem comprou duas vezes pelo mesmo post conta uma, como em Vendas > Canais; o dinheiro soma os dois pedidos. Falta o deploy.
- [ ] **Espelhar os buckets `curso` e `recursos`** (uns 90 MB): a cópia do banco leva só a lista dos arquivos. Hoje a segunda cópia deles são as pastas deste computador.

## O que está bem feito (não mexer)

- Marcar a tentativa antes de gastar, com tentativas limitadas, e o `simular` em todo agente com IA.
- A conferência em código do que a IA devolve (preço, link, número, palavra) em todos os agentes.
- O eco reconhecido pelo id da mensagem e o silêncio de 12 horas depois de conversa de gente.
- A pessoa no link, e a junção segura do Conciliador com o botão de desfazer.
