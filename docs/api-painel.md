# API do painel (`/api/admin`)

O painel (`admin/`, React) fala só com esta API. O conector do Claude (`/mcp`) usa as **mesmas ações** (`worker/lib/acoes.js`): o que vale no painel vale no Claude.

- **Login:** `Authorization: Bearer <token do Supabase Auth>` (o painel pega com `supabase-js`). No computador (`AMBIENTE=local`), o cabeçalho `x-teste: 1` entra como `DEV_USUARIO`, sem login.
- **Erro:** status HTTP e `{ "erro": "texto para mostrar", ...extra }`. 401 = entrar de novo; 403 = cargo não permite.
- **Datas:** ISO 8601 (UTC). O painel mostra no fuso de São Paulo.
- **Perfis** (`worker/lib/perfis.js`, desde 29/10/2026): `br` = Agência Setup · Brasil (@agenciasetup, português) e `en` = Setup Agency · Inglês (@setupagency_eng, inglês, curso em dólar). Cada conta conectada, peça, palavra do "Comenta X" e post importado tem `perfil` (padrão `br`: tudo o que existia é do Brasil). Para gravar, perfil desconhecido é 400 (nunca vira `br` calado). Nas listas, `perfil` vazio = os dois; desempenho e resultados são de um perfil por vez (padrão `br`).

## Cargos e permissões

| Cargo | O que faz |
| --- | --- |
| `administrador` | Tudo: equipe, configurações, conectar redes, chaves de todos. |
| `editor` | Publica conteúdo, aprova e agenda peças, liga o "Comenta X", cuida de cursos e anúncios. |
| `redator` | Cria e edita rascunhos (conteúdo, peças, pautas, palavras do "Comenta X"). Não publica, não aprova, não liga DM. |
| `suporte` | Atende os alunos: vê quem comprou e quem travou (tela Suporte), reenvia o acesso, gera link de entrada, libera ou tira curso. Não vê faturamento nem reembolsa. |

Permissões (vêm em `GET /eu`): `painel.ver`, `conteudo.ver`, `conteudo.editar`, `conteudo.publicar`, `pecas.ver`, `pecas.editar`, `pecas.aprovar`, `pautas.ver`, `pautas.editar`, `desempenho.ver`, `gatilhos.ver`, `gatilhos.editar`, `gatilhos.ativar`, `cursos.ver`, `cursos.editar`, `arquivos.enviar`, `redes.ver`, `redes.conectar`, `equipe.ver`, `equipe.editar`, `config.editar`, `historico.ver`, `chaves.proprias`, `chaves.todas`, `alunos.ver`, `alunos.editar`, `suporte.ver`, `vendas.ver`, `vendas.reembolsar`, `ofertas.editar`.

## Sessão

- `GET /eu` → `{ usuario: { id, nome, email, papel, nome_papel }, permissoes: string[], site: { nome, dominio, url }, mcp_url }`
- `PATCH /eu` `{ nome }` → `usuario`
- `GET /pendencias` → `{ pecas_rascunho, pecas_aprovadas, pecas_agendadas, pecas_erro, recursos_rascunho, artigos_rascunho, pautas_novas }`
- `GET /inicio` → `{ numeros: {...numeros_painel}, proximas: Peca[] (até 6 agendadas), erros: Peca[] (até 5), atividade: Evento[] (10), redes: RedeResumo[], motor: { em_alta: Pauta[] (3, 24 h), assuntos[], melhores: Post[] (3 do mês), medianas, palavra_chave } }`
  `numeros_painel` também traz: `seguidores, posts_7d, ultimo_post, em_alta_24h, leads_7d, gatilhos_ativos, dms_7d, dms_pendentes`. `seguidores`, `ultimo_post` e o `motor` são do perfil do Brasil (Instagram); as peças trazem `perfil`.

## Conteúdo do site (`:tipo` = `recursos` | `artigos`)

- `GET /conteudo/:tipo?status=&busca=&pagina=1` → `{ itens, total, por_pagina }` (itens: `id, slug, titulo, resumo, status, tipo?, categoria_id, capa_url, downloads?, perfil?, publicado_em, atualizado_em`)
- `GET /conteudo/:tipo/:id` → item completo + `endereco` (URL pública; recurso `en`: `agenciasetup.com/free/<slug>`)
- `POST /conteudo/:tipo` (campos) → item | `PATCH /conteudo/:tipo/:id` (campos) → item
- `POST /conteudo/:tipo/:id/publicar` → item | `POST /conteudo/:tipo/:id/arquivar` → item
- Campos de recurso: `titulo, slug, resumo, corpo_md, tipo (prompt|template|planilha|automacao|guia|pack|ferramenta|video), categoria_id, capa_url, arquivo_url, arquivo_nome, arquivo_bytes, link_externo, tags[], destaque, perfil (br|en; en = material em inglês, fora do site em português, desde 30/10/2026)`
- Campos de artigo: `titulo, slug, resumo, corpo_md, categoria_id, capa_url, tags[], fontes[{nome,url}], recurso_id, destaque`
- `GET /categorias` → `[{ id, slug, nome, descricao, ordem }]`
- `POST /arquivos` (multipart: `arquivo`, `bucket` = `recursos` | `midia`) → `{ url, bytes, nome, tipo }` (até 50 MB)

## Cursos e anúncios

- `GET /produtos` → `Produto[]` | `POST /produtos` | `PATCH /produtos/:id`
  Produto: `id, slug, nome, chamada, descricao, preco_centavos, preco_de_centavos, link_checkout, imagem_url, tags[], ativo`
- `GET /landing-pages` → lista (cada uma com `na_lista`: se aparece em `/cursos`; o interruptor é `seo.vitrine`, e `false` tira da lista e do mapa do site) | `GET /landing-pages/:id` | `POST /landing-pages` | `PATCH /landing-pages/:id` | `POST /landing-pages/:id/publicar` | `POST /landing-pages/:id/arquivar`
  Landing page: `id, slug, titulo, produto_id, blocos[], seo{titulo,descricao,imagem}, status, endereco`
  Blocos: `heroi {selo,titulo,subtitulo,cta}`, `lista {titulo,itens[]}`, `texto {titulo,md}`, `depoimentos {titulo,itens[{nome,texto}]}`, `preco {texto,cta}`, `faq {titulo,itens[{p,r}]}`, `chamada {titulo,cta}`
- `GET /anuncios` → lista (com `impressoes, cliques`) | `POST /anuncios` | `PATCH /anuncios/:id`
  Anúncio: `produto_id, titulo, texto, cta, imagem_url, link, alvo_tags[], alvo_categorias[], posicoes[] (topo|meio|lateral|fim), peso (1-100), ativo, inicio, fim`

## Posts e agenda (peças)

- `POST /posts` `{ perfil (br|en, padrão br), redes[], formato, titulo, legenda, textos: { rede: texto }, midias[{url, tipo, alt}], opcoes: { instagram: Opcoes }, comenta?, acao: rascunho|agendar|publicar, agendado_para }` → `{ grupo, perfil, pecas[{ id, rede, formato, perfil, status, erro, url_publicada }], avisos[] }`. Uma peça por rede, no mesmo `grupo` e no mesmo perfil; carrossel: as mídias viram os slides. `agendar` e `publicar` exigem `pecas.aprovar` e passam pela validação de cada rede antes de criar; o `comenta` (versões) é conferido antes também. No perfil `en`, o `comenta` precisa de `link` (as páginas de recurso do site são em português).
- `GET /agenda?de=&ate=&perfil=` (até 1 ano, para a vista do ano; padrão: 7 dias atrás a 35 à frente; `perfil` vazio: os dois) → `{ de, ate, perfil, itens: [{ id, rede, formato, perfil, titulo, status, quando, url_publicada, grupo, miniatura, erro, pelo_app?, post_id? }], rascunhos: [...] }` (`pelo_app`: post feito direto no app da rede, sem peça)
- Opcoes (Instagram): `colaboradores[] (até 3), primeiro_comentario, local_id, local_nome, capa_url, capa_ms, audio_nome, no_feed (false), teste (MANUAL | SS_PERFORMANCE)`. Opção que o Instagram recusar sai do post com aviso na auditoria (`avisos`).
- `GET /pecas?status=&rede=&perfil=&pagina=1` → `{ itens, total, por_pagina }` (cada item com `perfil`)
- `GET /pecas/:id` → peça completa + `rede_id` (texto) + `origem: { tipo, id, titulo, endereco } | null` + `rede: RedeResumo` (o objeto substitui o texto de `rede`)
- `PATCH /pecas/:id` `{ titulo, legenda, roteiro, slides[], midias[], agendado_para, conexao_id, perfil, opcoes }` → peça (só em rascunho, aprovado ou erro). `conexao_id` precisa ser da rede e do perfil da peça (400). Mudar o `perfil` tira a conta escolhida do outro perfil e leva junto a palavra do Comenta X da peça (desligada).
- `POST /pecas/:id/aprovar` → peça (status `aprovado`)
- `POST /pecas/:id/agendar` `{ agendado_para }` → peça (status `agendado`; precisa de `pecas.aprovar`)
- `POST /pecas/:id/publicar-agora` → peça (409 se a rede não tem conta no perfil da peça, ou se a conta escolhida é do outro perfil)
- `POST /pecas/:id/cancelar` → peça | `POST /pecas/:id/voltar` → peça (volta a rascunho)

Peça: `id, rede, perfil (br|en), formato (carrossel|post|story|reels|video|short|thread|texto), titulo, legenda, roteiro, slides[{titulo,texto,imagem_prompt,imagem_url,video_url,alt}], midias[{url,tipo,alt}], opcoes, grupo, status (rascunho|aprovado|agendado|publicando|publicado|erro|cancelado), agendado_para, publicado_em, url_publicada, erro, tentativas, origem_tipo, origem_id, conexao_id, criado_em, atualizado_em`. Carrossel do Instagram aceita slide em vídeo (`video_url`, MP4 ou MOV).

## Resultados por post

- `GET /resultados?dias=30&rede=instagram&perfil=br` → `{ dias, rede, perfil, contas (do perfil), redes (com conta no perfil), perfis (com alguma conta), ve_vendas, medianas (do perfil), resumo: { posts, alcance, curtidas, comentarios, salvos, compartilhamentos, pedidos_palavra, directs, cliques, seguidores, vendas?, vendas_centavos? }, destaques: { engajamento, comentarios, alcance, vendas?, directs, pior }, posts: [Post + comenta { pedidos, directs, materiais, seguidores, falhas, cliques } + classe (acima|normal|abaixo) + vezes + vendas?] }` (até 400 posts; vendas só para Editor e Administrador)
- `GET /resultados/:id` (id do painel ou id na rede) → `{ post (com perfil), peca, medianas (da época do post: 120 dias antes e 30 depois, só posts do mesmo perfil), classe, vezes, comenta: { ..., gatilhos[], versoes[] }, ultimas[15], vendas? { quantidade, centavos, pedidos[] } }`

## Pautas e em alta

- `GET /pautas?status=nova&manuais=1` → `Pauta[]` (`manuais=1`: só as anotadas à mão; as do radar ficam em `/em-alta`) | `POST /pautas` `{ titulo, resumo, fonte_url, fonte_nome, tags[] }` | `PATCH /pautas/:id` `{ status }`
- `GET /em-alta?horas=48&limite=40` → `{ assuntos: [{ ferramenta, mencoes, fontes }], pautas: [{ id, titulo, resumo, fonte_url, fonte_nome, fonte_id, tipo (lancamento|ferramenta|discussao|tendencia|noticia), ferramentas[], angulo, formato_sugerido, sinais, publicado_na_fonte, calor (0-100) }], fontes: [{ id, nome, grupo, lido_em, ultimo_ok, ultimo_erro, itens }] }`
- `POST /em-alta/atualizar` → `{ fontes: [{ id, nome, pautas, erro }], pautas }` (lê 4 fontes agora)

## Desempenho

- `GET /desempenho?dias=30&rede=instagram&perfil=br` → `{ dias, rede, perfil, seguidores, seguidores_7d, seguidores_30d, posts, com_metricas, totais, medianas, top: Post[10], mais_comentados: Post[5], por_formato[], por_tema[], palavra_chave: { com, sem, melhores[] }, por_horario[], por_dia[], contas: [{ rede, perfil, conta, foto, metricas, comentarios, mensagens }], redes, perfis }`. Um perfil por vez (função `desempenho(p_dias, p_rede, p_perfil)` do banco): posts e seguidores só das contas do perfil.
- `GET /desempenho/posts?ordem=recentes|nota|comentarios|curtidas|salvos|compartilhamentos|alcance&formato=&dias=&busca=&perfil=br&pagina=1` → `{ itens: Post[], total, por_pagina }`
- `POST /desempenho/atualizar` `{ rede, perfil }` → `{ posts: [...], metricas: [...] }` (uma fatia da rede pedida, padrão instagram: conta, posts novos, uma página antiga, 8 posts de métricas; com `perfil`, só a conta daquele perfil)

Post: `id, rede, perfil (o da conta que publicou), id_na_rede, peca_id, formato, legenda, link, miniatura_url, publicado_em, curtidas, comentarios, salvos, compartilhamentos, alcance, visualizacoes, nota (% sobre o alcance), palavra_chave, temas[], metricas_em`

## "Comenta X"

- `GET /comenta?perfil=` (vazio: os dois) → `{ perfil, contas, ajustes: { testadores[], limite_hora }, gatilhos: [{ id, palavra, nome, rede, perfil, recurso: { id, slug, titulo, status }, link, modo (direto | seguir | pergunta), estrategia (melhor | igual), responder_publico, resposta_ia, variantes: Versao[], nota, posts[], peca_id, ativo, enviados, link_dm, numeros: { pendentes, falhas, enviadas_7d, cliques }, por_versao: [{ id, nome, ativa, comentarios, enviados, links, respostas, seguidores, ja_seguiam, erros, cliques, taxa_clique, taxa_seguidor, chance_de_ser_a_melhor }], antes_das_versoes }], ultimas: Resposta[30] (com origem, nome, variante, seguia, seguiu_em, publico_ok, link_em), sugestoes: Post[] (do último ano, pedem palavra e ainda não respondem sozinhos) }`
- Versao: `{ id (a a h), nome, dm (direto), pergunta (seguir e pergunta, sem link), depois (com o material, depois do toque), lembrete (seguir), botao (até 20), publico[] (respostas no comentário), ativa, origem (painel | mcp | ia) }`. Aceita `{usuario}` (primeiro nome), `{titulo}`, `{curso}` e `{link}`; sem travessão, @ ou endereço (`comenta.js`, `conferirVariantes`).
- `POST /comenta` `{ palavra, nome, perfil (br|en, padrão br), recurso_id | link, modo, estrategia, responder_publico, resposta_ia, variantes[], posts[] }` → gatilho (nasce desligado; sem versões, a padrão do modo no idioma do perfil) | `PATCH /comenta/:id` (ligado: só com `gatilhos.ativar`; `variantes` troca a lista inteira; `perfil` só muda em palavra avulsa e desligada; a de peça segue a peça)
  No perfil `en` o material é o `link` (obrigatório; o recurso do site não vale), as mensagens fixas (botões, lembrete, respostas padrão) saem em inglês, a IA escreve em inglês e o segundo botão leva à oferta `oferta_en` (raiz do site em inglês). A palavra só responde na conta do perfil dela (relógio e aviso da Meta: `entry.id` diz a conta).
  Cada resposta em `ultimas` e cada sugestão trazem `perfil`.
- `POST /comenta/escrever` `{ palavra, perfil, recurso_id | link, legenda, modo, quantas }` → `{ variantes[] }` (o Claude de Integrações escreve, em inglês no perfil `en`; não grava)
- `POST /comenta/:id/nota` `{ texto }` → a nota do Claude | `GET /comenta/ajustes` | `PATCH /comenta/ajustes` `{ testadores[], limite_hora }` (`gatilhos.ativar`)
- `POST /comenta/:id/ligar` → gatilho (409 sem material publicado) | `POST /comenta/:id/desligar` → gatilho

## Oferta do funil (mini curso)

- `GET /oferta` → `{ ativo, landing_slug, titulo, texto, cta, linha_dm, curso_primeiro, no_ar, link }` (`curso_primeiro`: o botão do mini curso em cima do material no direct do Comenta X) | `PATCH /oferta` (mesmos campos; `cursos.editar`)
- `GET /video/virais?status=novo|roteiro|usado|descartado&dias=&idioma=&limite=` → `{ itens: [{ video_id, canal, idioma, titulo, publicado_em, views, base, vezes, por_dia, status, leitura, url }], canais, regua, ultima_rodada }` (`pautas.ver`) | `POST /video/virais/:id` `{ status: novo|usado|descartado }` | `GET /video/canais` | `POST /video/canais` `{ id, nome, idioma, tema, arroba, tirar }` (`pautas.editar`)
  Só aparece (fim da página de recurso e fim da DM) com `ativo`, landing page publicada e produto ativo.

## Área de membros (vendas, alunos, aulas, ofertas, links)

Ações em `worker/lib/acoes-area.js`. Plano em `docs/area-de-membros.md`.

- `GET /vendas?de=&ate=&dias=30&produto=&canal=&campanha=&conteudo=&status=&busca=&pagina=1&moeda=brl` → `{ itens, total, por_pagina, moeda, de, ate, cortou, numeros (com anterior, o período de mesmo tamanho logo antes), por_dia, produtos, canais, campanhas, conteudos, origens, opcoes }` (`vendas.ver`). Período: `de` e `ate` (data ISO) ou `dias`, até 2 anos. `moeda`: `brl` (padrão) ou `usd` (curso em inglês), nunca somam juntos. `produto`: id da oferta, bump incluído, e o valor é a parte daquele produto no total pago. `canal`: o nome em português de `canalDe` (`worker/lib/origem.js`); as marcas gravadas não mudam. Venda conta pela data do pagamento; pedido não pago, pela data em que nasceu. `busca` (número do pedido, e-mail ou nome) procura em todas as datas. Visitas (pessoas diferentes por canal) só no real e sem `produto`. `cortou`: mais de 3.000 registros no período. Pedidos de teste ficam fora dos números. `numeros.pagos` conta pedidos e `numeros.compradores` conta as pessoas (quem levou o complemento depois tem dois pedidos e é uma pessoa). Em `canais`, `campanhas` e `conteudos`, `vendas` conta pessoas que compraram e `centavos` soma todos os pedidos delas; em `produtos` e em `por_dia` a conta continua por pedido.
- `GET /vendas/:id` → pedido com `aluno`, `oferta`, toques, `eventos` (avisos do pagamento), `emails`, `reembolsos` (a fila e o histórico) e `aceites` (a prova do aceite da licença: `momento`, `licenca`, `versao`, `texto`, `hash`, `nome`, `documento`, `email`, `ip`, `navegador`, `criado_em`; vazio fora das ofertas com `checkout.aceite` e antes da migration 48) e `arquivo` (oferta com entrega por arquivo: `{ o_que, prazo, marca: { caminho, bytes, pronto_em, por, enviado_em } | null }`; nulo nas outras). Na lista, cada pedido traz `reembolsos(status, devolver_em)`.
- `POST /vendas/:id/reembolsar` `{ dias, motivo, tirar_acesso }` → `{ ok, feito }` ou `{ ok, agendado: { id, devolver_em } }` (`vendas.reembolsar`). `dias` 0 (ou sem `dias`): devolve no Asaas e tira o acesso na hora. 1 a 30: entra na fila de reembolso; o pedido continua pago e, com `tirar_acesso` (padrão sim), o acesso cai na hora. Um reembolso aberto por pedido (409 no segundo).
- `GET /vendas/reembolsos` → `{ itens, total_centavos, total_usd_centavos }` (`vendas.ver`): a fila (agendado, devolvendo, falhou), com o pedido (e a `moeda`) e o aluno; os totais, em real e em dólar, sem os de teste.
- `POST /vendas/reembolsos/:id/cancelar` → `{ ok, acesso_voltou }` (`vendas.reembolsar`): tira da fila e devolve o acesso que a fila tirou. `POST /vendas/reembolsos/:id/devolver` → devolve agora (também tenta de novo o que falhou).
- Avisos no celular (Web Push, `vendas.ver`, cada pessoa só mexe nos próprios aparelhos; `worker/lib/acoes-avisos.js` e `push.js`):
  - `GET /avisos` → `{ publica, tipos: [{ id, t, sub, padrao }], aparelhos: [{ id, aparelho, eventos, criado_em, ultimo_ok, ultimo_erro }] }`. `publica` é a chave VAPID para o `pushManager.subscribe` (criada sozinha na primeira vez, em `config.push`).
  - `POST /avisos` `{ endpoint, keys: { p256dh, auth }, aparelho, eventos? }` → o aparelho. Só aceita endereço de serviço de push conhecido (Apple, Google, Mozilla, Microsoft). O mesmo endereço ligando de novo só atualiza.
  - `PATCH /avisos/:id` `{ eventos }` → o aparelho. Tipos: `venda`, `pedido`, `reembolso`, `recusado`, `teste` (pedidos de teste; desligado por padrão).
  - `POST /avisos/teste` `{ id? }` → `{ resultados: [{ id, aparelho, ok, status, erro, saiu }] }`. `POST /avisos/:id/desligar` → `{ ok }`.
- O relógio de 10 minutos (`cuidarDosPedidos` > `cuidarDosReembolsos`) devolve os que chegaram no dia, 2 por vez; falha tenta de novo em 1 hora e, na 3ª, fica "falhou". Aviso do Asaas de devolução ou contestação tira da fila sem devolver de novo.
- `POST /vendas/:id/reenviar` → `{ link }` (`alunos.editar`: manda o e-mail de acesso de novo)
- `GET /alunos?busca=&pagina=1` → `{ itens, total, por_pagina }` (`alunos.ver`) | `GET /alunos/:id` → aluno, `matriculas`, `pedidos` (só administrador e editor), `concluidas`, `ultimas`, `emails`
- `POST /alunos` `{ email, nome?, curso_id, origem: bonus|presente|equipe, dias? }` → `{ aluno_id, link }` (libera um curso na mão e manda o e-mail)
- `POST /alunos/:id/link` → `{ link }` (entrada de 24 horas, uma vez) | `POST /matriculas/:id/revogar` `{ motivo? }` → `{ ok }`
- `GET /suporte?dias=90&curso=&etapa=&busca=&ajuda=1` → `{ dias, curso: { id, titulo, slug }, cursos[], etapas: [{ id, t, estado, dica, n, parados, sem_rastreio }], resumo: { compraram, entraram, concluiram, precisam_ajuda, reembolsos, na_mao, sem_telefone }, pessoas: [{ id, aluno_id, nome, email, celular, origem, liberado_em, pedido: { numero, metodo, status, pago_em, total_centavos? }, situacao (ativo|reembolsado|contestado), etapa, etapa_t, entrou_em, email_acesso, aulas_feitas, aulas_total, email_rastreio: { entregue_em, aberto_em, clicado_em, devolvido_em, spam_em } | null, ultima_aula, ultima_atividade, motivos: [{ id, prioridade, desde, texto }], motivo, precisa_ajuda, mensagem, whatsapp: { numero, link } | null, sem_acesso? }], total, ve_valor, rastreio_email, rastreio_desde }` (`suporte.ver`; ação `verSuporte` em `worker/lib/acoes-suporte.js`; conector: `area_suporte`). `dias` 0 = desde sempre (padrão 90, pela data em que o acesso foi liberado). Etapas do funil, cumulativas (quem passou conta): `comprou` (matrícula de pedido pago, sem teste; presente conta para quem recebeu; bônus fica fora), `email` (e-mail `acesso` com status `enviado` ou já entrou), `abriu` e `clicou` (só com o rastreio ligado: aviso do Resend de aberto ou clicado, ou já entrou), `entrou` (`ultimo_acesso` depois da compra ou algum progresso), `aula_1` (abriu a primeira aula ou passou dela), `modulo_1` (todas as aulas do 1º módulo concluídas), `modulo_3` (abriu aula do 3º módulo em diante), `concluiu` (todas as aulas ou certificado). `parados` = quem parou naquela etapa. Rastreio do e-mail: vale para o e-mail que saiu depois de `rastreio_desde` (config `email`, gravado por `scripts/resend-rastreio.mjs ligar`) e já tem algum aviso do Resend; quem parou no e-mail sem esse dado (saiu antes do rastreio) fica na etapa `sem_rastreio` ("sem dado de abertura"), fora de `parados`, contado em `sem_rastreio` da etapa `email`, nunca como "não abriu". Motivos, do mais urgente (1) ao menos (4): `sem_acesso` (pagou há 10 min ou mais e não tem matrícula), `contestado`, `email` (e-mail de acesso com erro ou não saiu, e não entrou), `email_voltou` e `email_spam` (o Resend avisou que voltou ou que a pessoa marcou como spam, e não entrou), `nao_abriu` (recebeu e não abriu em 2 horas), `abriu_nao_clicou` (abriu há 1 hora e não clicou), `clicou_nao_entrou` (clicou há 1 hora e não entrou), `nao_entrou` (1 hora, para quem não tem rastreio), `duvida` (tutor enviado à equipe ou dúvida nos comentários sem resposta da equipe), `instalacao` (parado 3 dias no 1º módulo), `nao_comecou` (entrou e não abriu aula em 24 horas), `parado` (3 dias sem avançar), `reembolso` (30 dias). `whatsapp.link` é `https://wa.me/55<celular>?text=` com a mensagem pronta da etapa (primeiro nome, quem atende). `total_centavos` só com `vendas.ver`. O painel filtra etapa e busca na tela; `etapa`, `busca` e `ajuda=1` servem ao conector. Abertura é um sinal, não certeza (alguns apps abrem sozinhos ou bloqueiam a contagem).
- `GET /area/cursos` → cursos com módulos e aulas (`cursos.ver`) | `PATCH /area/aulas/:id` `{ titulo, video_panda, status, gratis, abertura_fim_s, final_inicio_s }` (`cursos.editar`)
- `GET /area/ofertas` | `PATCH /area/ofertas/:id` `{ nome, preco_centavos, preco_de_centavos, parcelas_max, juros_mes, pix_desconto_pct, pix_minutos, garantia_dias, metodos, ativa, valida_ate, checkout }` (`ofertas.editar`). `garantia_dias`: 0 (sem garantia, arquivo com licença própria) ou 7 ou mais; vazio vira 7. `checkout.aceite = { licenca, versao }` liga a caixa de aceite (`worker/lib/licencas.js`)
- `GET /area/links` | `POST /area/links` `{ codigo, destino: "/...", utm_source, utm_medium, utm_campaign, utm_content, utm_term }` → link curto `/l/<codigo>`
- `GET /area/emails` → os 40 últimos e-mails (para quem, assunto, situação, HTML para a prévia)
- `GET /area/certificado` → `{ config, padrao, exemplo }`: o visual do certificado (modelo `escuro`|`claro`, `cor`, `titulo`, `abertura`, `antes_do_curso`, `detalhes` com `{nome}`, `{curso}`, `{aulas_feitas}`, `{aulas_total}`, `{horas}`, `{data}`, `assinatura_nome`, `assinatura_cargo`, `assinatura_img`, `selo`, `qr`) e o link do exemplo público. `cursos.ver`
- `PUT /area/certificado` → salva (só os campos enviados mudam; vale também para os já emitidos). `cursos.editar`
- `GET /area/conquista-dias` → `{ ligada, dias, bonus }`: a conquista dos 7 dias (barra do app do aluno; o bônus e o "Solicitar certificado" abrem no dia `dias`). `cursos.ver`
- `PUT /area/conquista-dias` `{ ligada?, dias? (1 a 30) }` → salva, com auditoria (`conquista.salvar`). `cursos.editar`
- `POST /area/certificado/previa` (`?formato=story`) → `{ html }`: a página do certificado com um nome de exemplo e o que está no corpo, sem salvar. `cursos.ver`
- `GET /pagamento` → `{ configurada, origem, producao, conta, salva_em, aviso, aviso_url }` (`pagamentos.configurar`, só administrador; nunca devolve a chave)
- `POST /pagamento/chave` `{ chave }` → confere no Asaas e guarda cifrada | `POST /pagamento/aviso` → cria ou atualiza o aviso no Asaas com um token novo (gerado no servidor)
- `POST /pagamento/estrangeiros` `{ ligado }` → liga ou desliga a compra de quem mora fora do Brasil (`config.asaas.estrangeiros`, só com a liberação do Asaas; auditoria `pagamento.estrangeiros.*`). O `GET /pagamento` traz `estrangeiros`, `estrangeiros_em` e `estrangeiros_local`

### Montar cursos e trilhas (Fase F, `worker/lib/acoes-cursos.js`, `cursos.editar` para escrever)

- `GET /area/cursos/:id` → `{ curso, secoes, modulos: [{ ...modulo, aulas }], arquivos }` | `POST /area/cursos` `{ titulo, subtitulo? }` (nasce rascunho, slug do título) | `PATCH /area/cursos/:id` `{ titulo, subtitulo, descricao, capa_url, trailer_url, cor, certificado_pct, tags, status }`
- `POST|PATCH /area/secoes[/:id]` `{ curso_id, titulo }` | `POST|PATCH /area/modulos[/:id]` `{ curso_id, titulo, descricao, secao_id, liberacao: imediata|dias|data, liberar_dias, liberar_em }` (número sozinho)
- `POST /area/aulas` `{ modulo_id, titulo, ... }` (código `<módulo>.<n>` sozinho) | `PUT /area/aulas/:id` `{ titulo, codigo, status, gratis, video_panda, duracao_s, abertura_fim_s, final_inicio_s, capa_url, descricao, resumo, tags, marcadores: [{ s, titulo, tipo?: oferta, link? }], pausas: [{ s, texto }], faca_agora: [{ titulo, texto, prompt, acoes: "copiar, claude, baixar:arquivo" }] }`
- `POST /area/aulas/:id/atualizada` `{ nota }` → `{ avisados }` (curso vivo: quem já concluiu recebe no sino) | `POST /area/ordem/:tabela` `{ ids }` (`secoes`, `modulos`, `aulas`, `arquivos`)
- `POST /area/cursos/:id/arquivo` (FormData `arquivo`, até 50 MB) → `{ caminho, bytes, nome }` no bucket privado `curso` | `POST|PATCH /area/arquivos[/:id]` `{ curso_id, nome, tipo, o_que, quando, como (uma linha por passo), tempo, previa, versao, aula_id, origem: storage|drive|link, link, caminho, recompensa }` | `POST /area/arquivos/:id/remover`
- `GET|POST|PATCH /area/trilhas[/:id]` `{ titulo, descricao, objetivo (vazio = padrão), ativa, itens: [{ tipo: curso|modulo|aula, id, titulo }] }` (o aluno vê a do objetivo dele em `/inicio`, campo `trilha`)

### Vender mais, comunidade e comunicação (Fases C a E)

- Ofertas: `POST /area/ofertas` (cria), `GET|PUT /area/ofertas/:id/bumps`, `GET|PUT /area/produtos/:id/acessos`. `checkout` da oferta aceita `upsell` e `downsell` `{ oferta: slug, titulo, texto }`, `upgrade` `{ de_produto_id, desconto_centavos }` e `vagas` (plano equipe).
- Cupons: `GET /area/cupons` | `POST /area/cupons` `{ codigo, tipo: pct|valor, valor, ofertas, limite, valido_ate, primeira_compra, descricao, ativo }` | `PATCH /area/cupons/:codigo`
- Comunidade (`comunidade.ver` / `comunidade.editar`): `/comunidade/fila`, `comentarios` (`POST /:id/responder`, `POST /:id/publicar|ocultar|fixar|resolver`), `duvidas` (`POST /:id/responder` `{ texto, virar_pronta }`), `prontas`, `depoimentos`, `desafios`, `entregas`, `selos`.
- Comunicação (`comunicacao.editar`): `GET|POST|PATCH /comunicacao/avisos[/:id]` (banner, aviso ou evento, com `publico` `{ curso_id, sem_produto_id, parado_dias, min_pct, concluiu }`).
- Integrações (`integracoes.configurar`, só administrador): `GET /integracoes`, `POST /integracoes/:nome` (email, ia, bunny, panda, turnstile, rastreio, nota_fiscal; a chave é conferida no serviço e guardada cifrada), `GET /integracoes/ia/numeros`.

### Plataforma (Fase F, `worker/lib/acoes-plataforma.js`)

- `GET /webhooks` → `{ webhooks, envios (30 últimos), eventos }` | `POST /webhooks` `{ nome, url (https), eventos }` → webhook + `segredo` (aparece só aqui) | `PATCH /webhooks/:id` `{ nome, url, eventos, ativo, novo_segredo }` | `POST /webhooks/:id/testar` → `{ ok, status, erro }`. Eventos: `venda.paga`, `venda.reembolsada`, `aluno.liberado`, `aula.concluida`, `curso.concluido`, `certificado.emitido`. Corpo `{ id, evento, em, dados }`, cabeçalhos `X-Setup-Evento`, `X-Setup-Id` e `X-Setup-Assinatura: sha256=<HMAC do corpo com o segredo>`. O relógio manda 3 por rodada e tenta até 6 vezes.
- `GET /numeros?dias=30&moeda=brl` (`moeda`: `brl` padrão ou `usd`; vendas, por dia, origens e funil só daquela moeda) → `{ vendas (com conversao), por_dia, origens, funil, alunos, cursos (nota, NPS), aulas (comecaram, concluiram, uteis, nao_uteis, duvidas, comentarios), turmas, tutor, relatorio, ia }` (`numeros.ver`; função `numeros_area` do banco; testes fora)
- `GET /relatorios` → os 12 últimos | `POST /relatorios` → gera ou refaz o desta semana agora (`relatorio.gerar`; 409 sem o Claude ligado)
- `GET /recuperar?aba=nova&busca=&limite=50` → `{ numeros, itens: [{ id, nome, email, situacao, moeda, produto, oferta_ligada, motivo: { id, t }, canal, pedido, visto_em, lembretes, chamado_em, contatos, quem, nota, link, whatsapp: [{ id, t, texto, link }], valor_centavos? }], total, aba }` (`recuperar.ver`; abas: nova, chamei, comprou, nao_quer; valores só para quem tem `vendas.ver`) | `POST /recuperar/:id` `{ situacao?, nota? }` (`recuperar.editar`).
- `GET /followup?fase=na_hora&interesse=&busca=&perfil=br&limite=50` → `{ numeros: { novo, ofertado, conversando, duvida, nao_sei, comprou, nao_quer, na_hora, por_interesse }, fases, interesses, fase, itens: [{ id, usuario, nome, conversa, origem, interesse, fase, palavras, posts, email, ultima_mensagem, ultima_em, nosso_em, toques, proxima_mensagem, proximo_em, duvida, resposta, respondida_por, produto, comprou_em, compra_por, pos_venda_em, nota, historico (as 8 últimas), na_hora, abrir, perfil_url }], total }` (`followup.ver`; `na_hora` = fase aberta com o próximo toque vencido) | `POST /followup` `{ usuario, ... }` cria ou atualiza pelo @ | `POST /followup/:id` `{ fase?, interesse?, nome?, conversa?, email?, ultima_mensagem?, mandei?, proxima_mensagem?, proximo_em?, duvida?, nota?, evento?, pos_venda? }` | `POST /followup/:id/responder` `{ resposta }` (a dúvida volta para conversando) | `POST /followup/sincronizar` (traz quem comentou e marca quem pagou) | `GET /followup/respostas` (as dúvidas já respondidas) (`followup.editar` nas escritas).
- Públicas do checkout: `POST /api/checkout/contato` (guarda nome, e-mail e celular, nunca CPF) | `GET /api/checkout/retomar/:id` (os dados para preencher a compra) | `GET` e `POST /api/checkout/parar/:id` (parar os lembretes).
- `GET /plano` → `{ recomendacoes: [{ id, tipo (alerta, agenda, vender, alcance), titulo, texto, para, acao }], plano, ia }` (`plano.ver`) | `POST /plano` → refaz as ideias e as ações agora (`plano.gerar`; 409 sem o Claude ligado; se a resposta vier incompleta, 502 e o plano anterior fica) | `POST /plano/ideias/:id` `{ status: nova, feita ou descartada }` → o plano atualizado (`plano.gerar`). `plano` mora em `config.plano_ia`: `{ criado_em, modelo, custo_usd, resumo, ideias: [{ id, status, titulo, gancho, formato, perfil, objetivo, palavra, material, por_que, dia }], vender, alcance }`.

App do aluno (`curso.`, `/api/aluno`): `GET /compras`, `POST /compras/:id/pagar` `{ metodo, parcelas }` (Pix vencido, cartão recusado ou troca de forma), `GET /compras/:id/comprovante`, `GET|PATCH /dados` (nome, celular, CPF de cobrança). Reembolso pelo app (dentro da garantia): `GET /compras/:id/reembolso` → o que a pessoa já usou (`aulas_vistas`, `minutos`, `arquivos` baixados) e `dias` (7); `POST /compras/:id/reembolso` `{ motivo, concordo: true }` → entra na fila de 7 dias, o acesso cai, o aluno recebe a confirmação e a equipe um e-mail (pedido de teste não avisa a equipe). Cada download do kit grava em `arquivos_baixados` (desde 29/10/2026).

Fora do painel: `/checkout/<oferta>`, `/checkout/obrigado?pedido=`, `POST /api/checkout`, `GET /api/checkout/pedido/:id`, `POST /api/asaas/aviso` (cabeçalho `asaas-access-token`), `POST /api/resend/webhook` (aviso do Resend, assinatura Svix: cabeçalhos `svix-id`, `svix-timestamp` e `svix-signature`, HMAC-SHA256 de `id.timestamp.corpo` com o segredo `whsec_` guardado cifrado em Integrações > Resend; recusa com 401 sem assinatura, assinatura errada ou mais de 5 minutos de diferença; corpo até 64 KB; grava em `emails` só a hora do primeiro `email.delivered`, `email.opened`, `email.clicked`, `email.bounced` e `email.complained` pelo `resend_id`, sem o conteúdo, e responde 200 na hora), `POST /api/toque`, `/l/<codigo>`. No `curso.`: o app do aluno e `/api/aluno/*` (login do Supabase do aluno).

## Redes (módulos plugáveis)

- `GET /redes` → `RedeResumo[]`:
  `{ id, nome, cor, formatos[], disponivel, configurada, descricao, requisitos[], conexoes: [{ id, conta_id, conta_nome, conta_foto, perfil, status, expira_em, ultimo_erro, criado_em, faltam[] }] }` (o painel agrupa por perfil)
  - `faltam`: funções que a conexão ainda não liberou (métricas, comentários, mensagens). Conectar de novo resolve.
  - `disponivel`: o módulo já sabe conectar e publicar.
  - `configurada`: os segredos do app daquela rede estão no Worker.
- `POST /redes/:id/conectar` `{ perfil }` → `{ url }` (o painel manda a pessoa para lá; o perfil vai no state assinado; a rede volta em `/api/redes/:id/retorno` e depois para `/admin/redes?conectada=:id&perfil=br|en` ou `?erro=...`). 501 se o módulo ainda não está disponível. A conta nova entra no perfil pedido; conta que já estava conectada (e não desligada) continua no perfil dela, e a volta traz `&ficou=<aviso>` explicando.
- `POST /conexoes/:id/desligar` → `{ ok }`
- `POST /conexoes/:id/perfil` `{ perfil }` → `{ conexao, mudou, avisos[] }` (`redes.conectar`, só administrador; auditoria `rede.perfil`): muda a conta de perfil e leva os posts dela junto. `avisos`: peças agendadas do perfil de antes que ficaram sem conta, e peças que tinham escolhido esta conta.

## Claude

- `GET /claude` → `{ mcp_url, chaves: [{ id, nome, prefixo, papel, dono: { id, nome } | null, conector, criado_em, ultimo_uso, usos, expira_em }] }` (só as ativas; quem tem `chaves.todas` vê de todos)
- `POST /claude/chaves` `{ nome, papel }` → `{ chave, id }` (a chave aparece só uma vez)
- `POST /claude/chaves/:id/revogar` → `{ ok }`
- `GET /skills` → `[{ nome, descricao, atualizado, arquivos: [caminho] }]` (as skills de `.claude/skills/`, gravadas com `npm run skill`)
- `GET /skills/:nome` → `{ nome, descricao, atualizado, arquivos, conteudo: { caminho: texto }, pacote_b64 }` (o `.skill` para instalar no app do Claude)
- Tela "Permitir" do app do Claude: `GET /oauth/pedido?p=<pedido>` → `{ app, declarado, host, conferido, conhecido, volta, local, sugerido, pode, papeis: [{ id, nome, descricao }] }` e `POST /oauth/aprovar` `{ pedido, permitir, papel }` → `{ destino }` (o painel faz `location.assign(destino)`).

## Equipe e site

- `GET /equipe` → `[{ id, nome, email, papel, nome_papel, ativo, ultimo_acesso, convite_pendente }]`
- `GET /equipe/papeis` → `[{ id, nome, descricao }]`
- `POST /equipe` `{ email, nome, papel }` → `{ membro, link }` (link de convite para mandar à pessoa)
- `PATCH /equipe/:id` `{ nome, papel, ativo }` → membro
- `POST /equipe/:id/link` → `{ link }` (novo link de acesso: convite ou troca de senha)
- `GET /config` → `{ site: {...}, adsense: { cliente, ativo } }` | `PATCH /config/:chave` `{ valor }` → `{ ok }` (`site`, `adsense`)
- `GET /historico?pagina=1` → `{ itens: [{ id, quando, quem, via, acao, alvo, detalhes }], total, por_pagina }`

## Escritório de IA (`worker/lib/acoes-escritorio.js`; `escritorio.ver` para ler, `escritorio.decidir` para decidir, `escritorio.editar` para o resto)

- `GET /escritorio` → `{ salas: [{ id, nome, agentes: [{ id, sala, nome, funcao, onde, cadencia, modelo, estado, turnos: { ultimo, hoje, custo_hoje, erros_7d } | null, placar: { feitas_por_ele, na_mesa, aprovadas, com_resultado } | null }] }], mesa: [proposta], aprovadas: [proposta], depois: [proposta], fechadas: [proposta], numeros: { trabalhando, planejados, pausados, na_mesa, aprovadas, custo_hoje_usd, custo_mes_usd, teto_dia_usd }, nomes: { salas, onde, estados, status, esforcos } }`
- `GET /escritorio` também devolve `arte: { versao, salas: { <sala>: url }, bonecos } | null`, `movimentos` (os 30 últimos da carreira, com `agente_nome`), `demitidos`, e em cada agente `nivel` e `controla` (se pausar e demitir desligam de verdade); `nomes.niveis` e `nomes.carreira` trazem os rótulos
- `GET /escritorio`, quem faz o cartão aprovado (`docs/tarefa-aprovadas.md`): cada item de `aprovadas` traz `andamento: { estado: feito|falta_publicar|espera_dono|falhou|fazendo, nota, em, agente_id, agente_nome, turno, commit, tentativas, hoje } | null` (null: ninguém pegou), `pode_fazer` e `por_que_nao` (se o Executor pode pegar e, quando não, o motivo; os dois faltam quando a leitura do andamento falhou). `executor: { ativo }` diz se a tarefa diária está valendo, e `nomes.andamentos` traz os rótulos dos estados. Nenhuma rota nova: o andamento é o último turno que cita o cartão (`turnos.dados.proposta`), e a fila da tarefa sai pelo conector (`escritorio_ver` com `fila` verdadeiro)
- `GET /escritorio`, o balão da planta: cada agente traz `fala: { texto, tipo: agora|feito|atencao } | null`. É uma frase curta (até 34 letras), fixa por agente e sem IA, do que ele está fazendo (turno rodando), do que acabou de fazer (deu certo nos últimos 30 minutos) ou do que pede atenção (erro ou alerta do Zelador nas últimas 12 horas). Nunca leva o resumo do turno, valor, nome nem @. `null`: o Calango fica quieto (parado, em pausa, offline, vaga ou turno sem trabalho). Regra em `falaDe`, `worker/lib/escritorio.js`
- `GET /escritorio/vendas?dias=7|30|90` (exige `escritorio.ver` e `vendas.ver`) → `{ dias, desde, ranking: [{ agente, apelido, nome, estado, como, vendas, pedidos, centavos }], calangos: { vendas, centavos }, fora: { vendas, pedidos, centavos }, cortou }`. Quem vendeu mais na sala de Vendas: cada venda paga em real vai para o Calango do último link tocado antes de pagar (`calangoDaVenda` em `worker/lib/escritorio.js`: Comenta X é o Entregador, a conversa do direct é de quem mandou o link, o e-mail de recuperação é da Recuperadora); `vendas` são pessoas e `fora` é o que veio do conteúdo do dono. No conector: `escritorio_ver` com `vendas: 7|30|90`
- `GET /escritorio/agentes/:id` → o agente com `caderno`, `turnos` (20), `propostas` (30), `historico` (40 da carreira), `nivel_nome` e `controla` (a frase que explica o que o botão desliga, ou `null`)
- `POST /escritorio/agentes/:id` `{ sala, nome, funcao, onde, cadencia, modelo, estado, nivel, promover, rebaixar, motivo, teto_dia_usd, ordem, caderno, caderno_mais }` → o agente (cria se o id é novo). Mudar `estado` ou o nível grava uma linha na carreira com o `motivo`; só `motivo` grava uma anotação. No Atendente e nos dois vendedores, o estado liga e desliga de verdade
- `POST /escritorio/teto` `{ teto_dia_usd }` → `{ ok, teto_dia_usd }`
- `POST /escritorio/propostas/:id/decidir` `{ decisao: aprovada|depois|descartada|nova, motivo }` → a proposta
- `POST /escritorio/propostas/:id/resultado` `{ resultado }` → a proposta, com status `feita`
- Turno e proposta nova entram só pelo conector (`escritorio_turno`, `escritorio_propor`): quem trabalha são os agentes.

## Colmeia de vendas (`worker/lib/acoes-colmeia.js`; `colmeia.ver` para ler, `colmeia.editar` para escrever)

- `GET /colmeia?tipo&produto&status&busca` → `{ itens: [{ id, tipo, produto, titulo, texto, prova, origem, autor, status, usos, vendas }], numeros: { ativas, propostas }, nomes }`
- `POST /colmeia` `{ tipo, produto, titulo, texto, prova }` → o item (pelo painel vale na hora; pelo conector com a chave da casa, regra e resposta nascem como proposta)
- `POST /colmeia/:id` `{ titulo, texto, produto, tipo, status: ativa|arquivada }` → o item
- Formato do item (migration 46): `GET /colmeia` devolve `modo` em cada item (`frase`, `explicacao` ou vazio) e `nomes.modos`; `POST /colmeia` e `POST /colmeia/:id` aceitam `modo` (no modo `frase` o texto guarda as quebras de linha: cada linha é uma mensagem)
- Treino da Colmeia (`worker/lib/acoes-treino.js`, só pelo painel; `colmeia.ver` para ler, `colmeia.editar` para o resto):
  - `GET /treino` → `{ treino: { id, titulo, status, n, aprendizado, aprendido_em }, mensagens: [{ id, papel: cliente|atendente|nota, texto, autor, ia, criado_em }], salvas: [...] }`. A conversa aberta é uma só, a mesma para todos; se não existe, nasce aqui
  - `GET /treino?depois=<id da última fala>` → `{ treino, mensagens }` só com as falas novas (o pedido que a tela faz a cada 2,5 segundos). `GET /treino?id=<id>` → uma conversa salva com as falas
  - `POST /treino/mensagem` `{ id, papel: cliente|atendente, texto }` → `{ mensagem }`. 409 quando a conversa já foi encerrada
  - `POST /treino/responder` `{ id }` → o Atendente de IA responde as últimas falas do cliente: `{ classe, mensagens }` (o que ele não responderia entra como `nota`)
  - `POST /treino/recomecar` → a sala com uma conversa limpa. `POST /treino/salvar` `{ id, titulo? }` → a sala nova e `salva`
  - `POST /treino/aprender` `{ id }` → `{ itens (propostas criadas na Colmeia), ja_sabia, fora, resumo, aprendizado, custo_usd }`. Uma chamada ao Claude, na conta do Conciliador
  - `POST /treino/:id` `{ status: "descartada" }` → tira uma conversa salva da lista
- `POST /colmeia` pelo conector aceita `substitui: [ids]` (de 1 a 5 itens que valem): a proposta nasce apontando para eles e, aprovada, fica no lugar
- Chamados de suporte (`worker/lib/acoes-chamados.js`; `suporte.ver` para ler, `suporte.atender` para o resto):
  - `GET /chamados?status=aberto|resolvido` → `{ itens: [{ id, followup_id, usuario, nome, email, telefone, curso, problema, origem: atendente|vendedor|painel, status, nota, resolvido_por, resolvido_em, criado_em, abrir }], abertos, nomes }`
  - `POST /chamados` `{ followup_id?, usuario?, nome?, email?, telefone?, curso?, problema }` → abre o chamado, ou completa o que a pessoa já tem aberto. Devolve `criado`
  - `POST /chamados/:id` `{ status: resolvido|aberto, nota? }` → resolve, reabre ou anota. Só pelo painel
  - `POST /followup/atendente/testar` devolve também `suporte`: o chamado que o Atendente abriria (`{ curso, email, telefone, nome, problema }` ou null). No teste nada é gravado
  - `GET /esperando` ganhou o item `chamados` (quantos estão abertos), que vira o contador do menu Suporte
- `POST /followup/atendente/testar` aceita `{ texto (uma mensagem por linha), nome, usuario, ha_min, modelo }` e devolve também `espera`, `modelo`, `tokens` e `contexto`
- `POST /followup/atendente` aceita `modelo: claude-haiku-5-5|claude-sonnet-5-5`

## Atendente do direct (`worker/lib/acoes-followup.js`)

- `GET /followup` devolve também `atendente: { ligado, modo, modos }` e, em cada pessoa, `pode_api` (dá para mandar pela API: escreveu nas últimas 24 horas)
- `POST /followup/atendente` `{ ligado, modo: automatico|rascunho }` → a configuração (`followup.atendente`, Editor)
- `POST /followup/atendente/testar` `{ texto, nome }` → `{ classe, mensagens, interesse, motivo, custo_usd }`, sem mandar nem gravar nada
- `POST /followup/:id/mandar` `{ texto }` → manda pela API do Instagram (cada linha, uma mensagem; sem texto, a próxima mensagem da ficha). 409 fora das 24 horas
- `GET /followup` devolve também `tetos: { dia: { usado, teto, sobra }, rodada: { usado, teto, sobra, janela_min }, sem_resposta }` e, em cada pessoa, `pode_tocar`, `toque` (`puxada` ou `resposta`), `nao_tocar_motivo`, `pausa` (`dono`, `atendente` ou null) e `pausa_motivo`. É a regra única do sistema (`podeTocar` em `worker/lib/followup.js`); `GET /followup/:id` traz os mesmos campos
- `POST /followup/:id/mandar` pelo conector (agente) recusa com 409 quando `pode_tocar` é falso e quando o texto tem preço ou link que não está liberado (`conferirToque` em `worker/lib/atendente.js`). Pelo painel é o dono mandando, então só recusa quem está em "Não quer"
- `POST /followup/atendente` aceita `na_hora: true|false` (a resposta sai uns 20 segundos depois da última mensagem, pelo despertador; desligado, vale só o relógio de minuto)
- `POST /colmeia/:id` `{ responder: "texto" }` → a resposta do dono a uma pergunta do Conciliador: o item é reescrito e continua em proposta. Devolve `{ ajustou, aviso, ...item }`. Só pelo painel
- `GET /colmeia` devolve, em cada item, `porque` (o "por quê" sem a pergunta) e `pergunta` (a pergunta do Conciliador ao dono, só em junção que espera)

## Esperando você (`worker/lib/acoes-esperando.js`)

- `GET /esperando` → `{ itens: [{ id: mesa|duvidas|colmeia|entregas, n, titulo, um, varios, url }], total }`. `n` é null quando a pessoa não pode abrir aquela tela. É o que o bloco do Início e os contadores do menu leem. Os números ficam 30 segundos na memória do Worker
  - O item `mesa` traz também `nota: string | null`: a frase das aprovadas que o Executor deixou prontas (`falta_publicar`) ou que esperam o dono (`espera_dono`, ou `falhou` sem nova tentativa), por exemplo "Aprovadas: 2 prontas (falta publicar) e 1 esperando uma decisão sua." (null quando não há nenhuma, quando a leitura do andamento falha ou quando a pessoa não pode abrir o Escritório). `n` e `total` continuam contando só as propostas novas. O Início mostra a nota em letra pequena; com `n` zero e nota, o cartão continua com o botão

## Rotas fora da API

- `/admin/*`: o painel (SPA). `/admin/entrar?token=<hash>&tipo=invite|recovery`: link de convite ou troca de senha. `/admin/conectar?pedido=...`: tela "Permitir".
- `/.well-known/oauth-protected-resource[/mcp]`, `/.well-known/oauth-authorization-server`, `/oauth/authorize|token|register|revoke`: login do conector.
- `/api/redes/:id/retorno`: volta do login de cada rede.
