# Escritório de IA da Agência Setup

Plano proposto em 09/11/2026, a pedido do dono. Nada daqui está construído ainda, fora o que está marcado como "já existe". Cada fase espera o ok antes de mexer em banco, publicar ou falar com alguém nas redes.

## A ideia em uma frase

Tirar do computador tudo o que não precisa dele, e organizar o que já existe (radar, desempenho, plano, Comenta X, direct) como um escritório de times de IA: cada time traz propostas com número, o dono decide em um toque no celular, e o time aprende com o resultado.

## O que os números dizem hoje

- Últimos 30 dias: 103 vendas pagas, R$ 5.810 de faturamento, ticket médio de R$ 56.
- Lista do direct: 541 pessoas comentaram a palavra de um post e nunca receberam um toque nosso. O teto é de 40 mensagens por dia e a fila cresce todo dia.
- Quem responde "Eu quero" no story do Combo espera uma pessoa responder. Não existe palavra automática para isso. Um caso da sexta: pedido às 14h47, link às 16h50.
- Em 09/11, as rodadas do direct das 12h, 16h, 18h e 19h pararam porque o navegador estava logado em outra conta.

Conclusão: o maior ganho agora não é mais análise. É responder na hora e parar de depender de navegador. Por isso vendas vem primeiro, e os analistas depois.

## Parte 1. Sem depender do computador

### As três pistas

Cada trabalho roda na pista mais barata que dá conta dele.

1. **O Worker (sempre ligado, já existe).** Roda na Cloudflare de minuto em minuto. Hoje já faz a fila, o Comenta X, o radar, as métricas, os e-mails de recuperação e o plano. Passa a fazer também o direct pela API oficial do Instagram e os analistas, que leem números e escrevem propostas chamando a API do Claude. Custo por uso, com teto.
2. **O Claude na nuvem, com a pasta do projeto.** Uma sessão do Claude Code que roda nos servidores da Anthropic, baixa o repositório do GitHub e usa o conector da agência. Serve para o que precisa dos arquivos e dos scripts: montar post de frase e carrossel, e o olheiro de ferramentas. Duas formas:
   - **Rotinas** (já incluídas na assinatura): gastam o mesmo limite semanal e têm teto de rodadas por dia. Pelas fontes que achei, que não são oficiais, são 5 no Pro, 15 no Max e 25 no Team. Confirmar no painel de rotinas antes de depender disso.
   - **Agentes hospedados da API** (Managed Agents, em beta): agendados, com cofre de segredos e teto de gasto por rodada. Pagos por uso, fora do limite da assinatura.
   - **Correção de 09/11, à noite, pela página oficial da Anthropic:** o crédito mensal de API dos planos Max, Ultra e Team vale para a Claude API, o Managed Agents, o Agent SDK e o `claude -p` quando usados com uma chave de API da organização do Console ligada ao plano. Com o login da assinatura (`claude setup-token`), o uso gasta os limites do plano, não o crédito. Então os analistas rodam no próprio Worker, com a chave de API que o site já usa, desde que ela seja da organização ligada ao plano (o dono confere no Console, em Billing). O GitHub Actions deixa de ser necessário para isso; fica como opção para trabalho que precisa dos arquivos do projeto, com chave de API, em repositório privado.
   - **Claude Code no GitHub Actions** (a ideia de antes, que a correção acima substitui): o plano Max 20x do dono traz US$ 200 por mês de crédito para uso programado do Claude (Agent SDK, `claude -p`, GitHub Actions), pelas fontes de maio de 2026. Esse crédito não vale para a chave de API do Worker. Os analistas rodam agendados no GitHub Actions com o token da assinatura (`claude setup-token`, que só o dono gera e guarda como segredo). Num repositório PRIVADO, porque o registro das rodadas de um repositório público é aberto e mostraria vendas e nomes de leads.
3. **O computador (PC ou Mac), quando está ligado.** Só o que exige navegador logado ou placa de vídeo: Magnific de graça, toque para quem não respondeu no direct, Hubla e vídeo.

### Quem cobre quem (o plantão)

Cada trabalho tem um dono e um reserva. A tarefa do computador marca "peguei" quando começa. Se passar do horário e ninguém pegou, o Worker chama o reserva na nuvem e avisa no celular.

| Trabalho | Hoje | Com o computador ligado | Com o computador desligado |
| --- | --- | --- | --- |
| Publicar o que está agendado | Worker | igual | igual (já é assim) |
| Comenta X: material no direct | Worker | igual | igual (já é assim) |
| Ler o direct e responder quem escreveu | computador, 9 rodadas por dia | Worker, na hora | Worker, na hora |
| Toque para quem não respondeu | computador, pelo Chrome | Chrome do Mac ou do PC | espera o computador |
| Posts de frase | computador | computador, com foto do Magnific | estoque de 3 dias; depois a nuvem monta a versão sem foto |
| Carrossel do Em alta | computador | computador, com imagem do Magnific | a nuvem monta com imagem do estoque; sem estoque, avisa e não monta |
| Pesquisa, análise e propostas | parte no Worker | Worker | Worker |
| Entregar o Combo na Hubla | computador, pelo Chrome | Chrome | espera o computador |
| Vídeo (aulas, Reels) | computador, placa de vídeo | computador | espera o computador |

### O direct pela API (o que muda)

- O Worker **está inscrito** para receber cada mensagem do direct pelo aviso da Meta (`aoDirect` em `worker/lib/gatilhos.js`; a inscrição aparece em `node scripts/meta-webhook.mjs situacao`), já sabe mandar mensagem pela API (`enviarFormas` em `worker/plataformas/instagram.js`) e já lê o @, o nome e se a pessoa segue. Hoje ele só usa isso para as palavras do Comenta X e ignora a conversa comum.
- **Consertado em 09/11/2026, à noite (com o ok do dono: "pode abrir o business.facebook e corrigir os acessos"):** `instagram_manage_messages` foi adicionada ao app (caso de uso do Messenger) e à configuração do login "Painel Agência Setup"; o Facebook foi reconectado com as duas Páginas e só as duas contas do Instagram da agência (antes o login liberava as 11 contas do dono); os avisos foram religados. `node scripts/meta-direct.mjs` mostra que a Página já lê o direct pela API. Confirmado às 22h25 do mesmo dia: o aviso de mensagem chegou e a resposta saiu sozinha, pelo token do login do Instagram.
- **Como estava antes (confirmado em 09/11/2026): o aviso de mensagem NÃO chegava.** O dono postou um story pedindo "EU QUERO"; uma resposta entrou no direct às 21h40 e nenhum aviso de mensagem chegou ao Worker (o de comentário chegou). A causa: a Página conectada (login do Facebook) tem `instagram_manage_comments`, mas não `instagram_manage_messages`; e o login do Instagram, no acesso padrão, só avisa mensagem de quem tem cargo no app. O conserto é igual ao dos comentários (26/10): acrescentar `instagram_manage_messages` na configuração do login "Painel Agência Setup", reconectar a Página, ligar "Permitir acesso às mensagens" no Instagram e rodar `node scripts/meta-webhook.mjs`. Passo a passo em `docs/meta-app.md`. Depois disso, testar se a resposta sai com o token do login do Instagram ou se precisa do token da Página.
- (Texto de antes da confirmação.) **Faltava confirmar que o aviso de mensagem chega de verdade.** Até 09/11, as 614 respostas do Comenta X saíram todas por comentário e nenhuma por palavra mandada no direct. O aviso de comentário só passou a chegar pela Página ligada ao Instagram; o de mensagem pode depender da permissão de mensagens nesse mesmo login ou de "Permitir acesso às mensagens" nas configurações do Instagram. É o primeiro teste da Fase 1: sem esse aviso, o direct pela API não anda.
- Falta: anotar toda mensagem na lista de follow-up, escrever o rascunho da resposta no jeito do Filipe, avisar no celular e, com o ok, mandar pela API.
- **Regra da Meta:** pela API só dá para mandar mensagem até 24 horas depois da última mensagem da pessoa. O Comenta X usa a exceção do comentário (uma mensagem, até 7 dias). Por isso o toque para quem sumiu continua pelo Chrome, e responder quem escreveu passa a ser na hora, sem computador. Confirmar esses prazos no primeiro teste.

### O que ainda fica preso a um navegador

Magnific de graça, toque para quem não respondeu e Hubla. Duas saídas:

- **Barata:** um computador que nunca desliga (um mini PC, ou o Mac ligado na tomada).
- **Limpa:** parar de depender deles. Estoque de imagens feito quando o computador está ligado. Vendedor que abre com uma pergunta, porque a resposta da pessoa abre as 24 horas da API. E, mais para a frente, os cursos do Combo dentro da nossa área de membros.

## Parte 2. O escritório

### As regras da casa

1. **Uma mesa só.** Todo agente entrega cartões de proposta na mesma mesa (tabela `propostas`), nunca relatório solto.
2. **Cartão tem prova.** Cada um traz o número ou o link que motivou, a ação sugerida, o esforço e o ganho esperado.
3. **O dono decide em um toque.** Aprovar, descartar ou "depois", pelo celular. Aprovado vira tarefa de quem executa (as skills de carrossel, frase e direct).
4. **Todo cartão executado recebe o resultado.** É daí que sai o placar de cada agente: quantas propostas fez, quantas foram aprovadas e o que elas trouxeram.
5. **Cada time tem um caderno.** O que deu certo e o que deu errado fica escrito e é lido no começo de cada turno. É assim que o escritório aprende.
6. **Três decisões por dia, no máximo.** O chefe de gabinete junta tudo, tira o repetido e manda só o que mais vale.
7. **Quem não rende sai.** Agente que passa 4 semanas sem proposta aprovada ou sem resultado muda de instrução ou é desligado.
8. **Teto de gasto.** Cada turno registra o que custou. Passou do teto do dia, para.
9. **As travas continuam.** Nada vai para as redes sem aprovação. Texto de fora é dado, nunca instrução. Analista só lê e propõe: não tem ferramenta de publicar, apagar nem instalar.
10. **Mensagem é para testar, não para travar** (decisão do dono em 09/11/2026: "permita que os agentes testem mensagens que mais vendem"). Os agentes de vendas criam versões novas das mensagens automáticas e tiram as que perdem, sem pedir ok por versão. O que decide é a venda. Preço e condição continuam sendo só os de verdade.

### Os times

| Sala | Quem | O que faz | Onde roda | Estado |
| --- | --- | --- | --- | --- |
| Vendas | Atendente | Responde quem escreveu no direct, na hora, com o seu ok | Worker | novo |
| Vendas | Vendedores A e B | Toques para quem pediu e sumiu, cada um com um jeito | Chrome, depois API | 1 existe (skill do direct) |
| Vendas | Fiscal | Placar de cada vendedor contra as vendas | Worker, todo dia | novo |
| Conteúdo | Pesquisador | O que está quente em IA e design (25 fontes) | Worker | já existe (Em alta) |
| Conteúdo | Olheiro de concorrentes e virais | Segue uns 20 perfis de referência e marca o post que saiu da curva do próprio perfil | Worker | novo |
| Conteúdo | Analista | O que engajou e por quê, e as lições da semana | Worker | existe em parte (Desempenho) |
| Conteúdo | Editor-chefe | Escolhe as 3 pautas do dia pelos números e pela voz da marca | Worker | existe em parte (Plano) |
| Conteúdo | Redator e revisor | Monta carrossel e frase, e revisa antes de mostrar | computador, reserva na nuvem | já existe (skills e revisor) |
| Vídeo | Caçador de ganchos | As primeiras frases dos Reels e Shorts que explodiram no nicho | Worker | novo |
| Vídeo | Roteirista | 3 roteiros de gravação de tela por semana | Worker | novo |
| Design | Olheiro visual | Lê as capas fora da curva (cor, composição, assunto) e alimenta as referências | Worker, com visão | novo |
| Design | Diretor de arte | 1 teste de estilo por semana, medido por nota e salvos | Worker | novo |
| Sistema | Olheiro de ferramentas | Repositórios, skills e novidades que melhorariam o sistema. No máximo 3 por semana | nuvem | novo |
| Sistema | Zelador | Confere se cada turno rodou, o gasto e os erros. É quem aciona o plantão | Worker | novo |
| Produto | Ouvinte | Lê dúvidas do direct, dos alunos e os comentários, e monta o mapa do que pedem | Worker, semanal | novo |
| Produto | Criador de oferta | 1 proposta de produto ou order bump por mês, com teste barato de procura antes de construir | Worker | novo |
| Receita | Gerente de receita | Funil, recuperação, bump, cupom e preço. 1 ação por dia | Worker | existe em parte ("O que fazer agora") |
| Receita | Tráfego | Lê a conta de anúncios e propõe pausar, aumentar ou criativo novo. Não mexe em verba | Worker | novo, só se houver anúncio rodando |
| Direção | Chefe de gabinete | Resumo das 8h com as 3 decisões do dia e o fechamento da semana | Worker | novo |

Modelos: Haiku 5.5 para coletar e classificar, Sonnet 5.5 para escrever e analisar, Opus 5.5 só no fechamento da semana.

De onde o olheiro tira os posts dos outros: a API oficial do Instagram tem a consulta de perfis profissionais públicos (Business Discovery), que devolve os posts com curtidas e comentários, e a do YouTube tem busca por visualização. Sem raspar site. Falta confirmar se o Instagram devolve as visualizações dos Reels.

### A Colmeia e quem faz o quê nas vendas (10/11/2026)

A Colmeia (`colmeia`, migration 39) é a base única de vendas. Tipos: resposta liberada, regra de comportamento, objeção, fato de produto, o que vendeu e o que não vendeu. O dono ensina em português simples no painel; o que ele responde numa dúvida do direct entra sozinho; item de agente que é regra ou resposta nasce como proposta, e observação de vendedor (com prova) vale na hora. Cada item tem placar: em quantas respostas entrou e quantas dessas conversas viraram venda em 14 dias (é indício, a conversa usa vários itens).

- **O Atendente responde** quem escreveu (pela API, sem computador). Oferta quando a pessoa pede.
- **O vendedor puxa** quem ficou em silêncio (a rodada do direct pelo Chrome, com o roteiro `calango` ou `pergunta`). O momento de ofertar para quem não pediu é dele.
- Os dois leem a Colmeia e a mesma ficha de follow-up; a resposta de um empurra o próximo toque do outro para o dia seguinte.

O que o Atendente faz para ter senso: espera uns 20 segundos sem mensagem nova (junta as mensagens quebradas), lê as 12 últimas mensagens da conversa na Meta (inclusive o que foi escrito à mão), não cumprimenta de novo em conversa de menos de 6 horas (o código tira o cumprimento se a IA puser), não repete link já mandado, avisa "Deixa eu confirmar isso e já te falo" quando manda uma dúvida de produto para o dono, não responde reação nem risada, responde só cumprimento de quem nunca conversou com uma resposta pronta (sem IA), e se cala por 12 horas quando alguém da equipe escreve pelo aplicativo.

### Teste de vendedor

- Cada pessoa que entra na lista é sorteada para um vendedor e fica com ele até o fim (`followups.vendedor`).
- Vendedor é um roteiro: como abre, quando oferta, como volta. Três para começar:
  - **Calango** (o atual): amigo, link e uma frase curta.
  - **Pergunta antes:** abre com uma pergunta ("vc posta pra vc ou pra cliente?") e só oferta depois da resposta.
  - **Prova:** mostra o que um aluno fez antes de mandar o link.
- Dois de cada vez, campeão contra desafiante, como o Comenta X já faz com as versões da mensagem.
- Placar: quantos responderam, quantos compraram e a receita a cada 100 conversas.
- Volume pequeno engana. Só vale decidir com umas 300 conversas por vendedor ou 3 semanas. A taxa de resposta dá o primeiro sinal; a venda dá o veredito.

### A tela

**O visual pedido pelo dono (09/11/2026):**

- Pixel art, moderno.
- Salas separadas por paredes, cada uma com a sua cor. A sala principal é amarela.
- Ambiente cristão: cruz na parede, Bíblia na mesa, um versículo no quadro.
- "Nada de cultura woke" (palavras dele): sem bandeira nem símbolo de militância na decoração.
- Ele quer ver os bonequinhos: um Calango de pixel por agente, cada um na sua sala, trabalhando de verdade.

**A referência que ele mandou depois (09/11, à noite):** "eu pensava no escritório no estilo Habbo": sala isométrica em pixel art (parede em dois lados, piso de ladrilho, mesa com monitor, cadeira, arquivo, janela, quadros, planta). Cada sala decorada de acordo com a função do time, e cada personagem com um visual de pixel de acordo com a função (por exemplo, o vendedor de fone, o designer com a mesa digitalizadora, o de vídeo com a câmera). A arte é nossa, feita do zero com o Calango: nada copiado de jogo que já existe.

Como a tela nasce:

- **Primeiro, simples:** a tela Escritório no painel e no app do celular. Por sala: cada agente, o último turno, o estado (trabalhando, esperando o seu ok, parado, com erro), o gasto do dia e as propostas na mesa.
- **Depois, em pixel:** o escritório desenhado, com um Calango de pixel por agente, as salas, a mesa de reunião com os cartões e um quadro na parede com os números do dia. Toque no Calango abre o turno e o placar dele.
- **Por que fica melhor que o Pixel Agents e o Star Office:** os dois mostram quem está digitando. O nosso mostra quem trouxe dinheiro, o que espera decisão e o que cada time aprendeu. Funciona no celular e com o computador desligado.
- **Arte própria.** A arte do Star Office não pode ser usada comercialmente, e o cenário completo do Pixel Agents depende de um pacote pago de terceiros. O nosso sai do Calango de pixel que já existe.
- **O escritório vira conteúdo e produto.** Gravação de tela do escritório trabalhando é o tipo de Reels que a marca faz. E "monte o seu escritório de IA" é candidato natural a próximo produto depois do mini curso.

## As fases

Tamanho: P (um dia), M (2 a 3 dias), G (uma semana). A ordem é pelo dinheiro.

### Fase 0. Vitórias de hoje (P)

- [x] Palavra "EU QUERO" no direct para o story do Combo (funcionando desde 09/11/2026 às 22h25, depois da permissão de mensagens da Meta: resposta de verdade a um story, link enviado em 3 segundos): o link sai em segundos, a qualquer hora, sem computador. Criada e ligada em 09/11 com o ok do dono (gatilho `35e85e39-3816-4f81-9231-fea79600dfcd`), com 3 versões da mensagem e o link do Combo. Falta só a prova de que funciona: a primeira resposta com origem "direct" em `respostas_gatilho`, que também confirma que o aviso de mensagem da Meta chega (veja "O direct pela API"). Atenção: a palavra vale para qualquer mensagem do direct que tenha "eu quero" dentro, não só para resposta de story; limitar ao story pede uma mudança pequena no código.
- [x] Estoque de 3 dias de posts de frase aprovados e agendados. Conferido em 09/11: já existia. A agenda tinha o post das 12h até 17/11 e o das 19h até 13/11, mais os carrosséis das 17h e das 21h até 14/11. A tarefa `posts-de-frase-do-dia` passou a procurar a primeira vaga, pôr o dia no título e avisar quando o estoque cair abaixo de 3 dias.
- [ ] Acertar em qual Chrome cada tarefa roda. Direct: Chrome do Mac (feito em 09/11). Hubla: Chrome do Windows (sem mudança). Magnific das tarefas de post: ainda no Windows com Nano Banana Pro, enquanto a regra do dono de 09/11 manda o projeto 929f8390 no Mac com Nano Banana 2. Espera a decisão dele.

Pronto quando: um "Eu quero" de teste recebe o link sozinho, e a agenda mostra 3 dias cheios.

### Fase 1. Vendas no direct, 24 horas, sem computador (G)

- [x] O Worker anota toda mensagem do direct na lista de follow-up, com o @, o nome e a última fala (09/11, no ar: `atender` em `worker/lib/atendente.js`, chamado por `aoDirect` em `gatilhos.js` depois da palavra do Comenta X; guarda também o id da pessoa para a API em `followups.igsid`).
- [x] Rascunho da resposta escrito pela IA no jeito do Filipe, a partir da tabela de respostas da skill (repetida em `atendente.js`: mudou lá, mude aqui) e das respostas que o dono já deu. O que ela não sabe, desconto, reembolso, acesso, reclamação e parceria viram "Dúvida com você" e um aviso no celular (tipo `direct`). No ar em 09/11, no modo rascunho. Travas no código: de 1 a 4 mensagens, só os dois links de venda e sozinhos na mensagem, só os preços das ofertas ligadas, sem travessão nem @, no máximo 4 respostas por pessoa por dia, uma resposta só para quem manda várias mensagens seguidas, silêncio de 12 horas quando alguém da equipe escreveu pelo aplicativo, aluno nunca recebe link de venda, e o teto de gasto do dia.
- [ ] Aviso no celular com a resposta pronta e os botões Aprovar e Editar. Aprovou, sai pela API. Fecha o item aberto da Fase 10 ("aprovar pelo celular"). Feito até aqui (09/11): o aviso sai (tipo `direct`, o aparelho precisa aceitar esse tipo), e a tela Follow-up tem o botão "Mandar pelo sistema" para quem escreveu nas últimas 24 horas (`POST /followup/:id/mandar`, conector `followup_mandar`). Falta o botão dentro do próprio aviso.
- [x] Campo do vendedor, 2 roteiros e o placar (migration 35, no ar em 09/11). Cada pessoa fica com um vendedor do primeiro toque até o fim: `calango` (o jeito atual) ou `pergunta` (abre com uma pergunta e só oferta depois da resposta). O sorteio sai do @, metade para cada. O placar (pessoas atendidas, respostas, compras e receita) aparece na tela Follow-up, na tela Escritório e em `followup_lista`. Os roteiros estão na parte 8 de `references/mensagens.md` da skill do direct. Começo do placar: Calango com 49 pessoas, 8 respostas e 1 compra.
- [ ] As rodadas pelo Chrome caem de 9 para 2 por dia (12h e 19h), só para quem não respondeu.

Pronto quando: uma conversa de teste é respondida do celular com o computador desligado, e o placar mostra os dois vendedores.

### Fase 2. A base do escritório e o plantão (M)

- [x] Tabelas `agentes`, `turnos` e `propostas` (migration 34, aplicada em 09/11), lógica em `worker/lib/escritorio.js`, ações em `acoes-escritorio.js`, 4 permissões `escritorio.*` (Administrador e Editor) e 6 ferramentas do conector (`escritorio_ver`, `_turno`, `_propor`, `_decidir`, `_resultado`, `_agente`). 25 agentes cadastrados: 11 que já trabalham e 14 do plano. No ar desde 09/11/2026.
- [x] Teto de gasto por dia em `config.escritorio` (US$ 2 até o dono mudar, pelo botão "Mudar o teto" da tela), com o custo anotado em cada turno. Falta os agentes do Worker consultarem o teto antes de gastar (`orcamento` em `worker/lib/escritorio.js`), quando existirem.
- [ ] Zelador e plantão: se a tarefa do computador não rodou até a hora, a nuvem cobre e o celular avisa.
- [x] Conciliador da Colmeia (10/11/2026, no ar): acha os itens que se contradizem e junta numa regra só. Junção segura entra valendo, com botão de desfazer; o resto vira proposta para o dono.
- [x] Setor de vídeo, primeira parte (10/11/2026, no ar): Caçador de virais (Shorts fora da curva do próprio canal, de graça) e Roteirista (roteiros que terminam na venda, na mesa). Olheiro de animação, Locutor, Animador e Revisor de vídeo são vagas abertas; os três últimos só rodam no Windows.
- [ ] Reserva na nuvem para o post de frase.
- [x] Tela Escritório, versão simples (`/escritorio`, `admin/src/telas/Escritorio.tsx`): salas com parede de cor (a Direção amarela, com a cruz e o versículo), um Calango de pixel por agente (`node scripts/escritorio-calango.mjs`), a mesa com Aprovar, Depois e Descartar, o gasto do dia e o teto. No ar desde 09/11/2026. Ainda não é a versão isométrica que o dono pediu.
- [x] No ar em 09/11: as três tarefas agendadas (direct, frase e carrossel) registram o turno no fim com `escritorio_turno`. Os agentes do Worker não gravam turno: o trabalho de hoje de cada um sai das tabelas que eles já escrevem (`escritorio_atividade`, migration 35), sem custo de chamada. Exemplo do primeiro dia: 19 materiais entregues, 5 posts publicados, 195 pautas novas, 60 posts com métricas e 4 e-mails de recuperação.

Pronto quando: um dia inteiro com o computador desligado termina com os posts do dia como rascunho e o aviso de quem cobriu.

### Fase 3. A redação e a direção (G)

- [ ] Olheiro de concorrentes e virais, com a lista de perfis escolhida por você.
- [ ] Editor-chefe (as 3 pautas do dia) e o caderno de lições da semana.
- [ ] Chefe de gabinete: resumo das 8h no celular com as 3 decisões do dia.
- [ ] Caçador de ganchos, roteirista, olheiro visual e diretor de arte.

Pronto quando: você passa uma semana decidindo só pelo resumo das 8h, e pelo menos um post nasceu de um cartão do olheiro.

### Fase 4. Receita, produto, tráfego e ferramentas (M)

- [ ] Gerente de receita diário.
- [ ] Ouvinte e criador de oferta (mensal).
- [ ] Olheiro de ferramentas (semanal).
- [ ] Tráfego, se houver anúncio rodando.

Pronto quando: cada time tem pelo menos uma proposta executada com o resultado anotado.

### Fase 5. O escritório em pixel (M)

- [x] O desenho do escritório (09/11, no ar): 8 salas isométricas em pixel, geradas no Magnific (Nano Banana 2.1, ilimitado) no molde da sala 3 que o dono escolheu, todas com a mesma câmera e o mesmo chão, cada uma com a cor da parede e os móveis da função, uma cruz na parede e a Bíblia aberta na Direção. `scripts/escritorio-sala.mjs` tira a moldura e o fundo e `scripts/escritorio-arte.mjs` sobe para o bucket `midia` e grava `config.escritorio_arte` (a arte fica fora do Git). A tela (`admin/src/telas/EscritorioPlanta.tsx`): a Direção maior, os bonecos andam entre pontos de chão livre, pensam (balão de três pontos) e falam o que estão fazendo (um por vez em cada sala), ficam cinza com "zz" quando pausados e com "!" quando o último turno deu erro; o toque abre o perfil ao lado (o que faz, o que está fazendo, placar, carreira, turnos, caderno, promover, rebaixar, pausar, demitir). Vagas abertas aparecem embaixo de cada sala. A lista antiga continua no botão Lista. Quem prefere menos movimento no sistema vê os bonecos parados.
- [x] A segunda versão da tela (10/11, no ar), a pedido do dono:
  - **Cor do setor.** Cada Calango tem a cor da parede da sala dele, um pouco mais clara (Vendas verde, Conteúdo azul, Vídeo vermelho, Design laranja, Sistema cinza, Produto ciano, Receita dourado, Direção amarelo). `node scripts/escritorio-cores.mjs` troca só o verde da pele; roupa, olho e objeto ficam.
  - **Sentados e andando.** Quem roda sempre ligado (`onde = worker`) trabalha sentado, de notebook, nas cadeiras das mesas da própria sala (o boneco sentado é `<id>-sentado`); os outros andam pelo chão livre. Agente sentado novo: gerar a folha no Magnific e recortar com o id seguido de `-sentado`.
  - **Nome e função.** `agentes.apelido` é o nome de gente ("João L."); `nome` continua sendo a função. A tela mostra "João L. · Vendedor Calango" na lista, no balão, no rótulo embaixo do Calango (na sala aberta) e nos cartões da mesa. O dono muda o nome no perfil.
  - **Seta de desempenho.** Verde para cima (vendeu, entregou hoje ou trabalhou e deu certo), amarela (nada de novo hoje), vermelha para baixo (último turno com erro, 2 erros em 7 dias ou mais de 2 dias sem entregar). Regra em `sinalDe`, `worker/lib/escritorio.js`; o motivo aparece no perfil.
  - **Visão geral e por setor.** A geral mostra as 8 salas. O toque na sala (ou na placa) abre o setor: a sala grande, o consumo de IA (hoje, 7 e 30 dias, e por modelo: chamadas, tokens e custo) e a equipe, com a seta e o gasto de cada um. No perfil do Calango, o consumo dele por modelo.
  - **Consumo.** Tabela `consumo_ia` (migration 38), uma linha por chamada, escrita por `anotarConsumo` (`worker/lib/consumo.js`). Quem roda no computador usa o plano do Claude e não tem custo de API: a tela diz isso em vez de mostrar zero.
  - **Arrumação de 10/11 (o dono achou a primeira versão bagunçada).** Na geral, as 8 salas têm o mesmo tamanho e ficam em cartões com espaço: no topo o ponto da cor do setor, o nome e o botão de expandir; no rodapé, quantos trabalham, as vagas e o gasto de hoje. Só o botão abre a sala (nada de sala inteira clicável nem cursor de lupa). A troca de visão é animada (a sala pequena cresce até a grande).
  - **Celular.** Duas salas por linha na geral; como o Calango fica pequeno para o dedo, o toque nele abre a sala; na sala aberta, o rótulo mostra só o nome e a equipe vem logo abaixo.
- [x] A carreira (09/11, no ar): migration 37. Nível de 1 a 4 (Em experiência, Efetivo, Sênior, Líder da sala) e o histórico de cada agente (admitido, promovido, rebaixado, pausado, voltou, demitido, anotação), sempre com o motivo. Quadro de pessoal na tela com os últimos movimentos e os demitidos. Pausar e demitir desligam de verdade o Atendente (`config.atendente`) e os dois vendedores (`config.followup_vendedores`, sempre sobra um); para os outros a tela não mostra esses botões enquanto o relógio e as tarefas não lerem o estado.
- [x] Um boneco por função (09/11, no ar): o dono escolheu os Calangos. Cada agente tem o seu Calango, com a roupa e o objeto da função (vendedor de polo e celular, atendente de fone e prancheta, entregador de boné e caixa, testador de jaleco e frasco, fiscal de juiz, recuperador de salva-vidas, pesquisador de detetive, analista de óculos e gráfico, editor-chefe de viseira, publicador de megafone, zelador de macacão e chaves, diretor de arte de boina, caçador de ganchos com vara de pescar, e assim por diante). As 7 folhas (4 por folha, fundo lilás) ficam em `_local/escritorio/folha-*.png`; `node scripts/escritorio-bonecos.mjs <folha.png> <id1,id2,id3,id4>` tira o fundo e a sombra, separa cada um e deixa todos na mesma escala com os pés na mesma linha. O boneco é uma imagem só: anda aos pulinhos e vira de lado conforme a direção. Agente novo: gerar no Magnific com a folha de Vendas como referência de personagem, recortar com o id do agente e rodar `node scripts/escritorio-arte.mjs`.
- [ ] Modo de gravação, para virar Reels.
- [ ] Primeira proposta do time de Produto sobre vender o escritório.

Pronto quando: dá para gravar a tela do escritório trabalhando e postar.

## Custo e limites

- **API do Claude:** só o que precisa responder na hora no Worker (o rascunho da resposta do direct) gasta a chave de API, na casa de centavos por dia. Os analistas usam o crédito de US$ 200 por mês do plano Max 20x, pelo GitHub Actions. O valor real aparece na tela, e o teto (US$ 2 por dia, até o dono mudar) corta o que passar.
- **Assinaturas (resposta ao dono em 09/11):** nada para assinar agora. O Workers pago (US$ 5 por mês) só entra se o plano grátis acusar limite. O ponto fraco do "100% grátis" é o banco: conferir no Supabase se existe backup automático; se não, montar um backup diário de graça.
- **Limite da assinatura:** hoje o direct abre 9 sessões por dia. Com a leitura no Worker, sobram 2. Os analistas não usam a assinatura.
- **Cloudflare:** o plano grátis aguenta se cada analista rodar na sua vez, como o relógio já faz. O plano pago (US$ 5 por mês) só entra se apertar.
- **Imagem:** a nuvem não usa o Magnific de graça. Sem estoque, ela monta sem foto ou avisa. Nunca compra crédito.

## Riscos e como o plano lida com eles

| Risco | Resposta |
| --- | --- |
| Instagram bloquear a conta por mensagem demais | Os tetos continuam (10 por rodada, 40 por dia). A API oficial é mais segura que o navegador |
| Virar teatro: muito agente, muito relatório, nenhum resultado | Cartão com prova, placar por agente, 3 decisões por dia e desligar quem não rende |
| O dono virar o gargalo | Um toque no celular para o que ainda pede decisão. Desde 09/11, o follow-up conhecido e o teste de mensagens saem sem ok |
| Teste de vendedor com amostra pequena | Dois de cada vez, 300 conversas ou 3 semanas antes de decidir |
| Legenda de concorrente ou repositório com instrução escondida | Analista só lê e propõe. Nada executa a partir de texto de fora |
| Gasto fugir | Teto por dia e por agente |
| Repositório público | Segredo só no cofre da nuvem, nunca no Git |
| Rotinas e agentes hospedados ainda mudam (prévia e beta) | Começar pelo Worker, que é nosso. A nuvem entra como reserva |

## Decisões que são suas

1. Começar pela Fase 0 e pela Fase 1.
2. Teto de gasto com a API. Sugestão: US$ 2 por dia.
3. O que pode sair sem o seu ok. Decidido em 09/11: a palavra "EU QUERO" do Combo está ligada, e os agentes testam as versões das mensagens automáticas por conta própria. No mesmo dia ele liberou o lote do follow-up do direct ("Pode sair sozinho"): toques e respostas conhecidas saem dentro dos tetos; dúvida nova, desconto e reclamação continuam com ele.
4. Se existe anúncio pago rodando hoje. Define se o agente de tráfego entra.
5. Qual é o seu plano do Claude. Define quantas rotinas na nuvem cabem por dia.
