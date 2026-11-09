# App da Meta (Instagram, depois Facebook e Threads)

O módulo do Instagram (`worker/plataformas/instagram.js`) usa a **API do Instagram com login do Instagram**: conecta a conta profissional direto, sem precisar de Página do Facebook. Publica post, carrossel (2 a 10 fotos JPEG), story e Reels.

## Situação (22/10/2026)

- App **Agência Setup** criado: ID da Meta `2250794995702960`, portfólio **Agência Setup 1** (empresa verificada, id `109869838447298`), modo de desenvolvimento.
- Casos de uso: "Gerenciar mensagens e conteúdo no Instagram" e "Gerenciar tudo na sua Página" (este para o módulo do Facebook, depois).
- Instagram: app "Agência Setup-IG", ID `1119160331074680`; permissões `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_insights` (métricas), `instagram_business_manage_comments` e `instagram_business_manage_messages` (Comenta X), todas prontas para teste; endereço de volta salvo.
- Conectado em 22/10/2026 (@agenciasetup, 128 mil seguidores). As 3 permissões novas entraram depois: **reconectar em Redes** para liberar métricas e DM.
- Webhooks só funcionam com o app publicado: o "Comenta X" lê os comentários pelo relógio, sem webhook.
- Configurações básicas: domínio, privacidade, termos, exclusão de dados e categoria (Negócio e Páginas) salvos.
- @agenciasetup convidado como Testador do Instagram (**pendente**: aceitar no Instagram).
- `INSTAGRAM_APP_ID` e `INSTAGRAM_APP_SECRET` no Worker (e no `.env.local`/`.dev.vars`). O painel mostra o Instagram como "Pronta para conectar".
- Falta: aceitar o convite de testador e conectar em Redes > Instagram > Conectar (login do Instagram + Permitir).
- Primeira tentativa (22/10): o ID do app tinha um BOM invisível no Worker. Corrigido (segredos regravados por `scripts/segredos.mjs` e o módulo limpa o valor). Com o ID certo, o Instagram responde "Cargo de programador insuficiente" para conta que não aceitou o convite: o @agenciasetup estava **pendente** em Funções do app. Convite aceito em 22/10/2026 (conferido em Funções do app).

## Modo de desenvolvimento x publicado (23/10/2026)

- Com o app **não publicado**, a Meta só entrega dados de quem tem função no app. Conferido: métricas do @agenciasetup chegam (alcance, salvos, compartilhamentos, visualizações), mas a lista de comentários volta **vazia** em todos os posts (até nos de 4 mil comentários). Por isso o "Comenta X" não acha ninguém.
- A tela Publicar diz que "todas as configurações necessárias do app foram concluídas": dá para publicar sem revisão, com o acesso padrão. Publicar é decisão do dono (dá para voltar para desenvolvimento).
- **App publicado em 23/10/2026** (com o ok do dono). Logo depois, os comentários do público passaram a chegar, os mais novos primeiro. O nome de quem comentou vem em cerca de metade dos comentários (a DM usa "calango" quando não vem).
- Teste da DM: palavra **TESTEDM** (desligada) no post mais recente, só nele. Ligar, comentar de uma conta pessoal e conferir em Comenta X > Últimas respostas.
- A DM para quem comentou saiu no acesso padrão (TESTEDM do dono, 24/10/2026, sem erro). O **Acesso Avançado** (revisão do app; a empresa Agência Setup 1 já é verificada) só faz falta para o aviso na hora dos comentários (ver abaixo).

## Aviso na hora (webhook), 24/10/2026

Como no Olhar de Fé: a Meta avisa cada comentário novo em `https://agenciasetup.com.br/api/redes/meta/webhook` e o "Comenta X" responde em segundos (`worker/lib/gatilhos.js`: `webhookMeta` confere a assinatura `x-hub-signature-256` com a chave secreta do app do Instagram ou da Meta, põe na fila e envia). O relógio de 10 minutos continua como reserva; cada comentário entra uma vez só na fila.

- Ligar ou conferir: `node scripts/meta-webhook.mjs` (inscreve o app no objeto `instagram`, campos `comments`, `messages` e `messaging_postbacks`, este o toque nos botões do direct, e liga os avisos na conta conectada) e `node scripts/meta-webhook.mjs situacao` (só mostra). O token de verificação sai da `CRIPTO_CHAVE` e nunca é impresso.
- Reconectou o Instagram (conta nova ou token novo)? Rode o script de novo para religar os avisos da conta.
- Inscrito em 24/10/2026: app com o endereço ativo e a conta @agenciasetup com `comments` e `messages`.
- Conferido em 24/10/2026: o botão "Teste" do campo `comments` (Casos de uso > API do Instagram > Webhooks > Instagram) chega ao site com a assinatura certa e é lido como comentário (o exemplo não pede palavra, então não vai para a fila). Aviso sem assinatura ou com assinatura errada recebe 401.
- O Worker registra só o tipo de cada aviso (`aviso meta: instagram comments; 1 comentário(s), 0 na fila`), sem texto nem nome. Para acompanhar: `npx wrangler tail agenciasetup --format pretty --search "aviso meta"`.
- **Comentário de verdade só chega com Acesso Avançado.** A documentação da Meta (Set up Instagram Webhooks, login do Instagram) diz: "Advanced Access is required for comments and live_comments notifications". Hoje `instagram_business_manage_comments` está no acesso padrão ("Pronto para teste"), então a Meta manda o teste mas não os comentários do público. Até a análise do app liberar o Acesso Avançado, quem responde é o relógio (até 10 minutos). Nada muda no código quando liberar.
- A tela "Configuração da API com login do Instagram > 3. Configurar webhooks" aparece com o endereço em branco mesmo com a inscrição ativa (a tela geral de Webhooks também não mostra o endereço). A inscrição vale: o teste do painel chega ao nosso endereço.

### Comentários na hora pela Página (26/10/2026)

Igual ao Olhar de Fé: o comentário do Instagram chega pela Página ligada ao Instagram (login do Facebook), no acesso padrão e sem análise do app.
- **Configuração do login "Painel Agência Setup":** ganhou `instagram_manage_comments`, `instagram_basic` (incluída no caso de uso do Instagram) e `pages_manage_metadata`. Com isso a Página foi reconectada no painel.
- **Inscrição:** `node scripts/meta-webhook.mjs` inscreve a Página com `subscribed_fields=feed,messages,messaging_postbacks`.
- **Conferido no ar:** `aviso meta: instagram comments` chega segundos depois de cada comentário, e o direct sai na hora.
- **Respostas:** o envio continua pelo token do login do Instagram.
- **Se trocar a Página ou a configuração do login:** reconecte a Página e rode o script de novo.

### Análise do app (Acesso Avançado): não é preciso

Pedir o Acesso Avançado exige virar "Provedor de Tecnologia" (Tech Provider), que não tem volta. Em 26/10/2026 o dono preferiu o caminho da Página.

Pedido em Casos de uso > API do Instagram > Permissões e recursos > `instagram_business_manage_comments` (e `instagram_business_manage_messages`, para a DM) > Solicitar acesso avançado. A Meta pede, para cada permissão, uma explicação do uso e um vídeo de tela. O que mostrar: no painel, a palavra do "Comenta X" ligada num post; uma conta comenta a palavra; a resposta no post e a DM com o link chegando. Quem envia a análise é o dono (é um pedido em nome da empresa).

## Facebook (Página)

- Caso de uso "Gerenciar tudo na sua Página": `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_read_user_content`, `pages_manage_engagement`, `read_insights`, `business_management`, prontas para teste.
- Caso de uso "Interagir com os clientes no Messenger": `pages_messaging` (DM do "Comenta X" no Facebook).
- Login do Facebook para Empresas: endereço de volta `https://agenciasetup.com.br/api/redes/facebook/retorno`; configuração **Painel Agência Setup** (`FACEBOOK_CONFIG_ID` = `955302727649725`), token de usuário, 8 permissões.
- Segredos: `META_APP_ID`, `FACEBOOK_CONFIG_ID` e `META_APP_SECRET` no Worker (23/10/2026). Página **Agência Setup** conectada pelo Facebook do Filipe Lourenço, que tem acesso total ao app pelo Meta Business Suite (portfólio **Agência Setup 1**: Configurações > Apps > Agência Setup > Atribuir pessoas). Função no app pelo developers.facebook.com não grava: o app é do portfólio, então funções se dão no Business Suite.
- Quem conecta precisa ter função no app (Erick é administrador) e acesso à Página. Cada Página liberada vira uma conexão com o token da Página (não vence sozinho).

## Erros na conexão e o que significam

| O que aparece | Causa |
| --- | --- |
| "Esta página não está disponível" no Instagram | ID do app errado ou com caractere invisível no Worker |
| "Cargo de programador insuficiente" / "Insufficient developer role" | A conta que entrou não é testadora (convite pendente) ou não é a conta convidada |
| Painel em Redes com "O pedido de conexão venceu" | Passaram mais de 15 minutos entre "Conectar" e "Permitir" |
| Painel com "Instagram recusou: ..." | Troca do código pelo token falhou; a mensagem da Meta vem junto |

## O que só o dono pode fazer

1. **Conta de desenvolvedor:** developers.facebook.com > Começar > registrar (aceitar os termos), verificar por SMS, contato e "sobre você". É uma conta: quem cria é o dono.
2. **Testador do Instagram:** enquanto o app estiver em desenvolvimento, o @agenciasetup precisa aceitar o convite de testador no aplicativo do Instagram (Configurações > Apps e sites > Convites de testador).
3. **Mostrar a chave secreta do app** (a Meta pede a senha do Facebook para mostrar), colar no `.env.local` e mandar para o Worker:
   `npm run segredos -- INSTAGRAM_APP_ID INSTAGRAM_APP_SECRET` (o valor não fica no chat nem no Git).
   Não use `wrangler secret put` no PowerShell: ele põe um BOM invisível na frente do valor, o endereço de login sai com `client_id=%EF%BB%BF...` e o Instagram mostra "Esta página não está disponível" (aconteceu em 22/10/2026).

## Configuração do app

| Onde | Campo | Valor |
| --- | --- | --- |
| Criar app | Nome | Agência Setup |
| Criar app | Caso de uso | Gerenciar mensagens e conteúdo no Instagram |
| Criar app | Portfólio empresarial | Agência Setup |
| Configurações > Básico | Domínios do app | agenciasetup.com.br |
| Configurações > Básico | Política de privacidade | https://agenciasetup.com.br/privacidade |
| Configurações > Básico | Termos de serviço | https://agenciasetup.com.br/termos |
| Configurações > Básico | Exclusão de dados (instruções) | https://agenciasetup.com.br/privacidade |
| Instagram > Configuração da API com login do Instagram | URL de redirecionamento OAuth | https://agenciasetup.com.br/api/redes/instagram/retorno |
| Instagram > Configuração da API com login do Instagram | Permissões | instagram_business_basic, instagram_business_content_publish |
| Funções do app > Testadores do Instagram | Conta | agenciasetup |

## Segredos no Worker

| Segredo | De onde vem |
| --- | --- |
| `INSTAGRAM_APP_ID` | "ID do app do Instagram" (na tela do caso de uso; não é o ID do app da Meta) |
| `INSTAGRAM_APP_SECRET` | "Chave secreta do app do Instagram" (mesma tela) |

Com os dois no Worker, o painel mostra o Instagram como "Pronta para conectar". Em Redes > Instagram > Conectar, entra com o @agenciasetup e permite. A partir daí, peça agendada e aprovada sai sozinha pelo relógio.

## Modo ao vivo (depois)

Em desenvolvimento, só contas com função no app (testadores) conectam. Para publicar só na conta da própria agência isso basta. Revisão do app pela Meta só é necessária se outras contas forem conectar.

## Próximos módulos

- **Facebook (Página):** caso de uso "Gerenciar tudo na sua Página" no mesmo app; módulo `facebook.js`.
- **Threads:** caso de uso "Acessar a API do Threads" (a Meta cria como app separado); módulo `threads.js`.
