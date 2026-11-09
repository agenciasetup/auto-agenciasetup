# App do Pinterest

O módulo do Pinterest (`worker/plataformas/pinterest.js`) usa a **API v5** com login OAuth da conta business. Publica pin de imagem (`post`), pin carrossel (`carrossel`, de 2 a 5 imagens) e pin de vídeo (`video`), sempre com link para o site (o recurso ou a novidade de onde a peça saiu, com `?de=pinterest`). Lê seguidores, pins (reações e comentários) e as métricas de cada pin (impressões, salvos, cliques). A API do Pinterest não abre comentários nem mensagens: sem "Comenta X" aqui.

## Situação (29/10/2026)

- Módulo escrito e ligado (`disponivel: true`); no painel aparece "Falta configurar" até os segredos entrarem.
- App **Agencia Setup Publicador** (ID `1628476`) criado em developers.pinterest.com/apps, na conta business **Agencia Setup** (e-mail em `_local/contas.md`, fora do Git).
- **Trial negado em 26/10/2026** (e-mail genérico do Pinterest, sem o motivo). O portal mostra "Acesso Trial negado", a chave secreta fica indisponível e os campos do app ficam travados: não dá para conectar nem para corrigir e mandar de novo por ali.
- Motivo mais provável, pelo guia do Pinterest: a política de privacidade (`/privacidade`) não fala de contas conectadas nem do Pinterest (só de visitantes, compras e área do aluno). A descrição do app estava clara.
- Caminho: (1) ~~pôr na política uma parte sobre as contas da agência conectadas ao painel~~ feito em 29/10/2026 (parte "Redes sociais" em `/privacidade`, deploy `78b44a8d`); (2) ~~pedir nova análise por tíquete~~ enviado em 29/10/2026 pela Central de Ajuda ([Ferramentas de API e para desenvolvedores](https://help.pinterest.com/contact?pinterest_api_and_developer_tools=api_access&origin=pbc), tópico "Acesso à API", conta Agencia Setup, com o texto abaixo; resposta chega no e-mail da conta do Pinterest); (3) se o tíquete não andar em uma semana, criar outro app (o limite é 5) com a política nova.

### Texto do tíquete (em inglês, que é o idioma da equipe que analisa)

> **Subject:** Trial access denied, request for re-review (App ID 1628476)
>
> Hello Pinterest Developer team,
>
> Our app "Agencia Setup Publicador" (App ID 1628476) had its Trial access request denied on October 26, 2026. The app fields are now locked, so we cannot edit them and resubmit.
>
> What the app does: it is an internal tool used only by Agência Setup to publish and schedule Pins on our own business account (Agencia Setup), with links to the free resources on our website (https://agenciasetup.com.br), and to read the analytics of our own Pins. It does not access other people's accounts or data. Scopes: user_accounts:read, boards:read, pins:read and pins:write.
>
> We have updated our privacy policy (https://agenciasetup.com.br/privacidade) with a "Redes sociais" (social networks) section that explains how our connected accounts are used, that access tokens are stored encrypted on our server and how to disconnect.
>
> Could you please re-review the app, or unlock the fields so we can resubmit?
>
> Thank you,
> Filipe, Agência Setup
- A conta certa é a da **Agência Setup**, no Chrome do Mac onde ela está logada. Num dos Macs o Pinterest logado é o da JK Alianças: não usar.

## Quando o Pinterest aprovar o Trial

1. developers.pinterest.com/apps > Agencia Setup Publicador > **URIs de redirecionamento**: `https://agenciasetup.com.br/api/redes/pinterest/retorno` e `http://localhost:8787/api/redes/pinterest/retorno`.
2. Copiar o **ID do aplicativo** e a **chave secreta** para o `.env.local` (e o `.dev.vars`) como `PINTEREST_APP_ID` e `PINTEREST_APP_SECRET`, e mandar para o Worker: `npm run segredos -- PINTEREST_APP_ID PINTEREST_APP_SECRET`. Não use `wrangler secret put` no PowerShell (BOM invisível).
3. Painel > Redes > Pinterest > Conectar > Permitir. O módulo escolhe o quadro da agência (nome com "Setup", "Agência" ou "Calango"; senão, o primeiro) e guarda nas credenciais.

## Trial e Standard

- **Trial:** o app funciona, mas os pins e quadros criados pela API ficam visíveis **só para a própria conta** (sandbox do Pinterest). Leitura de pins, quadros e métricas funciona.
- **Standard:** os pins saem públicos. Pede-se em My apps > **Upgrade**, com um vídeo mostrando o login (OAuth) e uma publicação de verdade pelo painel. Gravar a tela do painel: Redes > Conectar Pinterest > Permitir > uma peça indo para a fila e virando pin.
- Docs: [níveis de acesso](https://developers.pinterest.com/docs/key-concepts/access-tiers/), [autenticação](https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/).

## Escopos

`user_accounts:read`, `boards:read`, `pins:read` (métricas) e `pins:write` (publicar).

## Tokens

O token de acesso vale 30 dias; o de renovação contínua vale 60 dias e se renova sem limite. O sistema renova sozinho antes de vencer (`credenciais.js`). Token recusado (HTTP 401) marca a conexão como expirada e o painel pede "Conectar de novo".
