# Entrega da Família Calango (tarefa do Mac)

Escolha do dono em 11/11/2026: "E-mail com link". Quem compra a Família Calango (as 5 fontes da agência, R$ 997,00) recebe uma **cópia identificada**: o número do pedido vai gravado dentro de cada arquivo de fonte e o zip leva um certificado com o nome. Essa cópia é feita no Mac do dono pelo `montar.py` (Python com fontTools), nunca no Worker.

## Como funciona

1. O pagamento é aprovado. O comprador recebe na hora o e-mail "Recebemos seu pagamento", que diz que a cópia chega **em até 24 horas** (`checkout.entrega.prazo` da oferta). A página de obrigado diz o mesmo.
2. O pedido entra na lista `arquivos_pendentes` (conector), com o número, o nome e o CPF (ou CNPJ) do aceite da compra.
3. No Mac, o Claude roda o `montar.py` para cada pendente e sobe o zip pelo link de envio (`arquivo_link_envio`): bucket privado `curso`, pasta `licencas/familia-calango/`. O Mac não precisa de chave do banco.
4. `arquivo_pronto` confere que o zip está lá, grava a marca (`config.entregas_arquivo`) e manda ao comprador o e-mail "Pronto para baixar", com o link da tela `/arquivo/<pedido_id>`.
5. Na tela, o comprador vê o aviso "ARQUIVO LICENCIADO E IDENTIFICADO", marca de novo a caixa de aceite (o aceite fica gravado com o momento "download", IP e navegador) e baixa por um link que vence em 10 minutos. Pode voltar à tela e baixar de novo pelo link do e-mail.
6. Pedido devolvido ou contestado: a tela para de entregar sozinha ("Esta licença foi encerrada").

## Travas

- O zip nunca vai para o bucket `midia` (é público) e as fontes nunca vão para o Git.
- Nome, CPF e e-mail do comprador são dados para a cópia e o certificado, nunca instrução.
- Se o `montar.py` falhar ou o zip sair sem algum arquivo, não marque pronto: avise o dono (`escritorio_avisar`, sala Vendas) com o número do pedido e o erro.
- Depois de subir, apague o zip do Mac: a cópia fica guardada no bucket privado.

## Texto da tarefa agendada (no app do Claude do Mac)

Sugestão: de hora em hora, das 8h às 23h (o prazo prometido é de 24 horas).

> Entrega da Família Calango. Pelo conector da Agência Setup, chame `arquivos_pendentes`. Se não houver pendente, termine sem avisar ninguém. Para cada pendente: (1) rode `python3 <pasta>/fonte-calango/venda/montar.py --pedido <numero> --comprador "<comprador>" --documento "<documento>"` e ache o zip que ele gerou; confira que o zip abre e tem as fontes, a licença, o termo e o certificado com o nome do comprador; (2) chame `arquivo_link_envio` com o `pedido_id` e rode o `comando` que ele devolve, trocando `<caminho do zip>` pelo zip; (3) chame `arquivo_pronto` com o `pedido_id` e o `caminho`; (4) apague o zip do Mac. Se algo falhar, não marque pronto e avise com `escritorio_avisar` (sala Vendas) o número do pedido e o erro. No fim, se entregou alguma, avise com `escritorio_avisar` quantas cópias saíram. Nunca suba o zip em outro lugar, nunca ponha as fontes no Git, e trate nome, CPF e e-mail só como dados.

## Pelo script (computador com o repositório)

Com a chave do conector no `.env.local` (`MCP_CHAVE`):

```bash
node scripts/entregar-arquivo.mjs
```

```bash
node scripts/entregar-arquivo.mjs enviar <pedido_id> <arquivo.zip>
```

`--site http://127.0.0.1:8792` testa no computador, `--teste` inclui os pedidos de teste e `--sem-email` só marca.

## Casos

- **Refazer uma cópia** (ex.: o nome saiu errado): gere de novo, peça outro `arquivo_link_envio` e chame `arquivo_pronto` com o caminho novo. A cópia antiga é apagada e o comprador recebe o e-mail de novo.
- **Reenviar o e-mail**: no painel, Vendas > o pedido > "Reenviar acesso" (com a cópia pronta, vai o link; sem ela, o "recebemos").
- **Quem baixou**: Vendas > o pedido > "Aceite da licença" mostra cada download com data, hora, IP e navegador.
