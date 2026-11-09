# Search Console automático: passo a passo

A tela **SEO e Google** do painel mostra os números do Google: cliques, buscas, posição e as oportunidades. O relógio busca esses números todo dia a partir das 6h. Para ler o Search Console, o Google pede uma **conta robô**, que é uma conta de serviço que só lê.

São quatro etapas, uns 15 minutos, tudo de graça. Modelo: o mesmo passo a passo do portal da JK.

> A chave que você baixa na etapa 1 é uma senha. Ela vai para o painel, em Integrações, e para mais lugar nenhum: nada de WhatsApp, e-mail ou Trello. Depois de colar, apague o arquivo do computador.

---

## Etapa 1. Criar a conta robô no Google Cloud

1. **Abra o Google Cloud.** Entre em [console.cloud.google.com](https://console.cloud.google.com) com a conta do Google que já tem o projeto **Agencia Setup Redes** (o do YouTube, na conta Google do canal). Qualquer conta serve, mas esse projeto já existe.
2. **Escolha o projeto.** No seletor de projeto, no topo, escolha **Agencia Setup Redes**.
3. **Ligue a API.**
   - Abra o menu ☰ > **APIs e serviços** > **Biblioteca**.
   - Busque `Google Search Console API`, abra e clique em **Ativar**. Ela é gratuita.
4. **Crie a conta.**
   - Abra o menu ☰ > **IAM e administrador** > **Contas de serviço** > **Criar conta de serviço**.
   - Nome: `leitor-search-console`.
   - Clique em **Criar e continuar**.
   - Na parte de papéis (permissões do projeto), **não escolha nada**. Clique em **Continuar** e depois em **Concluir**.
5. **Baixe a chave.**
   - Na lista, clique na conta que você criou.
   - Vá na aba **Chaves** > **Adicionar chave** > **Criar nova chave** > **JSON** > **Criar**.
   - O navegador baixa um arquivo `.json`.
6. **Copie o e-mail da conta.** Ele aparece na mesma tela e termina em `.iam.gserviceaccount.com`.

## Etapa 2. Dar acesso de leitura no Search Console

Faça isto nos **dois** sites, com a conta dona do Search Console (a do Filipe, logada no Chrome do Mac).

1. Abra o [Search Console](https://search.google.com/search-console) e escolha **agenciasetup.com.br**.
2. Vá em **Configurações** (engrenagem, no menu da esquerda) > **Usuários e permissões** > **Adicionar usuário**.
3. Cole o e-mail da conta robô, escolha **Restrito** (só lê, não muda nada) e clique em **Adicionar**.
4. Repita em **agenciasetup.com**, o site em inglês.

## Etapa 3. Colar a chave no painel

1. **Copie a chave.** Abra o arquivo `.json` num editor de texto (Bloco de Notas ou TextEdit), selecione **tudo** e copie, do `{` ao `}`.
2. **Cole e salve.** No painel, abra **Integrações** > **Google Search Console**, cole no campo da chave e clique em **Salvar**.
3. **Confira.** O painel confere na hora e mostra "Conta aceita: lê agenciasetup.com.br e agenciasetup.com".
4. **Apague o arquivo** `.json` do computador e esvazie a lixeira.

## Etapa 4. Ver os números

Abra **SEO e Google** no menu (em Site) e clique em **Buscar agora**. Depois disso o relógio busca sozinho todo dia.

---

## Se der erro

| Mensagem | O que fazer |
| --- | --- |
| "Esse arquivo não é a chave de uma conta de serviço" | Você colou outra coisa ou só um pedaço. Copie o `.json` inteiro, do `{` ao `}`. |
| "O Google não aceitou a chave da conta robô" | A chave foi apagada no Google Cloud ou está incompleta. Gere uma chave nova (etapa 1, item 5) e cole de novo. |
| "A chave funciona, mas a conta robô ainda não vê os sites" | Falta a etapa 2. Adicione o e-mail da conta como Restrito nos dois sites. O Google pode levar alguns minutos para liberar. |
| "A conta robô não tem acesso" | Igual ao anterior, num dos dois sites. |
| A tela mostra "Ainda sem números" | Site novo no Search Console demora uns 2 dias para ter números. |

## Como funciona por dentro

- **A chave fica cifrada no banco**, em `config.search_console`, com a `CRIPTO_CHAVE`, e nunca volta para a tela nem para o Claude.
- **A leitura** (`worker/lib/searchconsole.js`) assina o pedido com o WebCrypto do Worker, sem biblioteca.
- **O relógio busca um site por vez**, no minuto 17 das horas cheias, a partir das 6h. Ele para quando os dois estão em dia e tenta de novo na hora seguinte se der erro.
- **O que é guardado:**
  - os 90 dias, dia a dia, em `seo_dias`;
  - os últimos 28 dias por página, por busca e por par busca e página, em `seo_itens`.
- **As oportunidades saem desses números:**
  - pouco clique para a posição;
  - quase na primeira página;
  - busca sem página própria.
- **O Claude lê pelo conector** com `ver_seo` e transforma uma oportunidade em pauta com `oportunidade_para_pauta`.
