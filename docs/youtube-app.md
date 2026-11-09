# App do Google (YouTube)

O módulo do YouTube (`worker/plataformas/youtube.js`) usa a **YouTube Data API v3** com login do Google (OAuth). Publica Short e vídeo no canal, lê inscritos, vídeos, visualizações, curtidas e comentários, e responde comentários. YouTube não tem DM.

## Situação (23/10/2026)

- Módulo escrito e ligado (`disponivel: true`); teste com o canal conectado é o próximo passo (conectar no painel em produção).
- Projeto no Google Cloud **Agencia Setup Redes** (id `agencia-setup-redes`), na conta Google do canal (endereço em `_local/contas.md`, fora do Git): YouTube Data API v3 ligada; tela de consentimento externa, **Em teste**, com a conta do canal como usuária de teste; cliente OAuth Web **Painel Agencia Setup** com os três endereços de volta abaixo.
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env.local`, no `.dev.vars` e no Worker.

## Passo a passo no Google Cloud

1. **Projeto:** console.cloud.google.com > seletor de projetos > Novo projeto > nome **Agência Setup**.
2. **API:** APIs e serviços > Biblioteca > **YouTube Data API v3** > Ativar.
3. **Tela de consentimento** (Google Auth Platform):
   - Branding: nome **Agência Setup**, e-mail de suporte `contato@agenciasetup.com.br`, página inicial `https://agenciasetup.com.br`, política de privacidade `https://agenciasetup.com.br/privacidade`, termos `https://agenciasetup.com.br/termos`, domínio autorizado `agenciasetup.com.br`. Sem logo (logo pede verificação).
   - Público-alvo: **Externo**, status **Em teste**. Em Usuários de teste, adicionar o e-mail da conta do Google que administra o canal.
   - Acesso a dados: adicionar os três escopos da tabela abaixo.
4. **Cliente OAuth:** Clientes > Criar cliente > tipo **Aplicativo da Web** > nome **Painel Agência Setup**. Em "URIs de redirecionamento autorizados", os três:
   - `https://agenciasetup.com.br/api/redes/youtube/retorno`
   - `http://localhost:8787/api/redes/youtube/retorno`
   - `http://127.0.0.1:8787/api/redes/youtube/retorno`

   "Origens JavaScript" fica vazio. Criar > copiar o ID do cliente e a chave secreta.
5. **Segredos:** colar no `.env.local` (e no `.dev.vars`, para testar no computador) e mandar para o Worker:
   `npm run segredos -- GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET`
   Não use `wrangler secret put` no PowerShell: ele põe um BOM invisível no valor.
6. **Conectar:** painel > Redes > YouTube > Conectar > entrar com a conta do canal. Se aparecer "O Google não verificou este app": Avançado > Acessar Agência Setup. Deixar **todas as caixas marcadas** e Continuar. Se a conta tiver mais de um canal (conta de marca), escolher o da Agência Setup.

## Escopos

| Escopo | Para quê |
| --- | --- |
| `https://www.googleapis.com/auth/youtube.upload` | Enviar Shorts e vídeos (sem ele a conexão é recusada) |
| `https://www.googleapis.com/auth/youtube.readonly` | Inscritos, vídeos, curtidas, comentários e visualizações (Desempenho) |
| `https://www.googleapis.com/auth/youtube.force-ssl` | Ler e responder comentários (Comenta X) |

## Limitações

- **Vídeo privado até a auditoria.** Projeto criado depois de 28/07/2020 que não passou pela auditoria do YouTube sobe todo vídeo como **privado (travado)**, mesmo pedindo público. O sistema pede público; o YouTube trava. Dá para testar o caminho inteiro (o vídeo sobe, o link sai), mas o público não vê. Para liberar: formulário "YouTube API Services - Audit and Quota Extension" (support.google.com/youtube/contact/yt_api_form). Leva semanas e pede o site no ar com política de privacidade.
- **Login de 7 dias em teste.** Com a tela de consentimento "Em teste", o Google faz a chave de renovação vencer em 7 dias. O painel passa a mostrar "Login vencido: conecte de novo". Para acabar com isso sem verificação: Público-alvo > Publicar app (**Em produção**). App em produção sem verificação vale para até 100 contas, com o aviso "O Google não verificou este app" na hora de conectar. A verificação do Google (que tira o aviso) é separada da auditoria do YouTube.
- **Cota de 10.000 unidades por dia** por projeto. Zera à meia-noite do horário do Pacífico (4h em Brasília no horário de verão dos EUA, 5h no resto do ano). Na prática: uns 5 envios por dia, com folga para métricas e comentários. Mais que isso: pedir aumento no mesmo formulário da auditoria.

  | Chamada | Custo |
  | --- | --- |
  | Enviar vídeo | 1.600 |
  | Responder comentário | 50 |
  | Ler canal, vídeos, métricas ou uma página de comentários | 1 |

- **Short:** vídeo vertical ou quadrado de até 3 minutos. O YouTube decide sozinho se vira Short; o sistema põe `#Shorts` na descrição.
- **Título** até 100 caracteres (sai do título da peça ou da primeira linha da legenda). **Descrição** até 5.000 bytes (letra com acento conta 2, emoji conta 4). `<` e `>` não passam: o sistema troca por `‹` e `›`.
- **Métricas:** visualizações valem como alcance. Salvos e compartilhamentos só existem na YouTube Analytics API (outra permissão), por isso ficam vazios. Inscritos chegam arredondados pela API.

## Erros na conexão e o que significam

| O que aparece | Causa |
| --- | --- |
| "Erro 400: redirect_uri_mismatch" na tela do Google | O endereço de volta não está cadastrado exatamente igual (https x http, localhost x 127.0.0.1) |
| "Erro 403: access_denied" na tela do Google | App "Em teste" e a conta que entrou não está em Usuários de teste |
| "O Google não devolveu a chave de renovação" | A conta já tinha autorizado o app antes: tirar em myaccount.google.com/permissions e conectar de novo |
| "Faltou liberar o envio de vídeos" | Alguma caixa foi desmarcada na tela do Google |
| "Essa conta do Google não tem canal no YouTube" | Entrou com a conta errada ou não escolheu o canal da marca |
| "O Google não reconheceu o app" | `GOOGLE_CLIENT_ID` ou `GOOGLE_CLIENT_SECRET` errado no Worker (ou com BOM) |
| "A YouTube Data API v3 não está ligada" | Faltou o passo 2 |
| "A cota diária da API do YouTube acabou" | Passou de 10.000 unidades no dia: a fila tenta de novo, e no dia seguinte volta |
| Painel com "Login vencido: conecte de novo" | Os 7 dias do modo de teste ou o acesso foi retirado na conta do Google |

## Segredos no Worker

| Segredo | De onde vem |
| --- | --- |
| `GOOGLE_CLIENT_ID` | ID do cliente OAuth (termina em `.apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | Chave secreta do cliente (começa com `GOCSPX-`) |

Com os dois no Worker, o painel mostra o YouTube como "Pronta para conectar".

## O que só o dono pode fazer

1. Entrar com a conta do Google do canal na hora de conectar (e de novo a cada 7 dias enquanto o app estiver "Em teste").
2. Pedir a auditoria do YouTube (formulário acima) para os vídeos saírem públicos.
3. Se for subir vídeo com mais de 15 minutos: verificar o canal por telefone em youtube.com/verify.
