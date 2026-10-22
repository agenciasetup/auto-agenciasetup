# API do painel (`/api/admin`)

O painel (`admin/`, React) fala só com esta API. O conector do Claude (`/mcp`) usa as **mesmas ações** (`worker/lib/acoes.js`): o que vale no painel vale no Claude.

- **Login:** `Authorization: Bearer <token do Supabase Auth>` (o painel pega com `supabase-js`). No computador (`AMBIENTE=local`), o cabeçalho `x-teste: 1` entra como `DEV_USUARIO`, sem login.
- **Erro:** status HTTP e `{ "erro": "texto para mostrar", ...extra }`. 401 = entrar de novo; 403 = cargo não permite.
- **Datas:** ISO 8601 (UTC). O painel mostra no fuso de São Paulo.

## Cargos e permissões

| Cargo | O que faz |
| --- | --- |
| `administrador` | Tudo: equipe, configurações, conectar redes, chaves de todos. |
| `editor` | Publica conteúdo, aprova e agenda peças, cuida de cursos e anúncios. |
| `redator` | Cria e edita rascunhos (conteúdo, peças, pautas). Não publica nem aprova. |

Permissões (vêm em `GET /eu`): `painel.ver`, `conteudo.ver`, `conteudo.editar`, `conteudo.publicar`, `pecas.ver`, `pecas.editar`, `pecas.aprovar`, `pautas.ver`, `pautas.editar`, `cursos.ver`, `cursos.editar`, `arquivos.enviar`, `redes.ver`, `redes.conectar`, `equipe.ver`, `equipe.editar`, `config.editar`, `historico.ver`, `chaves.proprias`, `chaves.todas`.

## Sessão

- `GET /eu` → `{ usuario: { id, nome, email, papel, nome_papel }, permissoes: string[], site: { nome, dominio, url }, mcp_url }`
- `PATCH /eu` `{ nome }` → `usuario`
- `GET /pendencias` → `{ pecas_rascunho, pecas_aprovadas, pecas_agendadas, pecas_erro, recursos_rascunho, artigos_rascunho, pautas_novas }`
- `GET /inicio` → `{ numeros: {...numeros_painel}, proximas: Peca[] (até 6 agendadas), erros: Peca[] (até 5), atividade: Evento[] (10), redes: RedeResumo[] }`

## Conteúdo do site (`:tipo` = `recursos` | `artigos`)

- `GET /conteudo/:tipo?status=&busca=&pagina=1` → `{ itens, total, por_pagina }` (itens: `id, slug, titulo, resumo, status, tipo?, categoria_id, capa_url, downloads?, publicado_em, atualizado_em`)
- `GET /conteudo/:tipo/:id` → item completo + `endereco` (URL pública)
- `POST /conteudo/:tipo` (campos) → item | `PATCH /conteudo/:tipo/:id` (campos) → item
- `POST /conteudo/:tipo/:id/publicar` → item | `POST /conteudo/:tipo/:id/arquivar` → item
- Campos de recurso: `titulo, slug, resumo, corpo_md, tipo (prompt|template|planilha|automacao|guia|pack|ferramenta|video), categoria_id, capa_url, arquivo_url, arquivo_nome, arquivo_bytes, link_externo, tags[], destaque`
- Campos de artigo: `titulo, slug, resumo, corpo_md, categoria_id, capa_url, tags[], fontes[{nome,url}], recurso_id, destaque`
- `GET /categorias` → `[{ id, slug, nome, descricao, ordem }]`
- `POST /arquivos` (multipart: `arquivo`, `bucket` = `recursos` | `midia`) → `{ url, bytes, nome, tipo }` (até 50 MB)

## Cursos e anúncios

- `GET /produtos` → `Produto[]` | `POST /produtos` | `PATCH /produtos/:id`
  Produto: `id, slug, nome, chamada, descricao, preco_centavos, preco_de_centavos, link_checkout, imagem_url, tags[], ativo`
- `GET /landing-pages` → lista | `GET /landing-pages/:id` | `POST /landing-pages` | `PATCH /landing-pages/:id` | `POST /landing-pages/:id/publicar` | `POST /landing-pages/:id/arquivar`
  Landing page: `id, slug, titulo, produto_id, blocos[], seo{titulo,descricao,imagem}, status, endereco`
  Blocos: `heroi {selo,titulo,subtitulo,cta}`, `lista {titulo,itens[]}`, `texto {titulo,md}`, `depoimentos {titulo,itens[{nome,texto}]}`, `preco {texto,cta}`, `faq {titulo,itens[{p,r}]}`, `chamada {titulo,cta}`
- `GET /anuncios` → lista (com `impressoes, cliques`) | `POST /anuncios` | `PATCH /anuncios/:id`
  Anúncio: `produto_id, titulo, texto, cta, imagem_url, link, alvo_tags[], alvo_categorias[], posicoes[] (topo|meio|lateral|fim), peso (1-100), ativo, inicio, fim`

## Fila das redes (peças)

- `GET /pecas?status=&rede=&pagina=1` → `{ itens, total, por_pagina }`
- `GET /pecas/:id` → peça completa + `rede_id` (texto) + `origem: { tipo, id, titulo, endereco } | null` + `rede: RedeResumo` (o objeto substitui o texto de `rede`)
- `PATCH /pecas/:id` `{ titulo, legenda, roteiro, slides[], midias[], agendado_para, conexao_id }` → peça (só em rascunho, aprovado ou erro)
- `POST /pecas/:id/aprovar` → peça (status `aprovado`)
- `POST /pecas/:id/agendar` `{ agendado_para }` → peça (status `agendado`; precisa de `pecas.aprovar`)
- `POST /pecas/:id/publicar-agora` → peça (409 se a rede não está conectada)
- `POST /pecas/:id/cancelar` → peça | `POST /pecas/:id/voltar` → peça (volta a rascunho)

Peça: `id, rede, formato (carrossel|post|story|reels|video|short|thread|texto), titulo, legenda, roteiro, slides[{titulo,texto,imagem_prompt,imagem_url}], midias[{url,tipo}], status (rascunho|aprovado|agendado|publicando|publicado|erro|cancelado), agendado_para, publicado_em, url_publicada, erro, tentativas, origem_tipo, origem_id, conexao_id, criado_em, atualizado_em`

## Pautas

- `GET /pautas?status=nova` → `Pauta[]` | `POST /pautas` `{ titulo, resumo, fonte_url, fonte_nome, tags[] }` | `PATCH /pautas/:id` `{ status }`

## Redes (módulos plugáveis)

- `GET /redes` → `RedeResumo[]`:
  `{ id, nome, cor, formatos[], disponivel, configurada, descricao, requisitos[], conexoes: [{ id, conta_nome, conta_foto, status, expira_em, ultimo_erro, criado_em }] }`
  - `disponivel`: o módulo já sabe conectar e publicar.
  - `configurada`: os segredos do app daquela rede estão no Worker.
- `POST /redes/:id/conectar` → `{ url }` (o painel manda a pessoa para lá; a rede volta em `/api/redes/:id/retorno` e depois para `/admin/redes?conectada=:id` ou `?erro=...`). 501 se o módulo ainda não está disponível.
- `POST /conexoes/:id/desligar` → `{ ok }`

## Claude

- `GET /claude` → `{ mcp_url, chaves: [{ id, nome, prefixo, papel, dono: { id, nome } | null, conector, criado_em, ultimo_uso, usos, expira_em }] }` (só as ativas; quem tem `chaves.todas` vê de todos)
- `POST /claude/chaves` `{ nome, papel }` → `{ chave, id }` (a chave aparece só uma vez)
- `POST /claude/chaves/:id/revogar` → `{ ok }`
- Tela "Permitir" do app do Claude: `GET /oauth/pedido?p=<pedido>` → `{ app, declarado, host, conferido, conhecido, volta, local, sugerido, pode, papeis: [{ id, nome, descricao }] }` e `POST /oauth/aprovar` `{ pedido, permitir, papel }` → `{ destino }` (o painel faz `location.assign(destino)`).

## Equipe e site

- `GET /equipe` → `[{ id, nome, email, papel, nome_papel, ativo, ultimo_acesso, convite_pendente }]`
- `GET /equipe/papeis` → `[{ id, nome, descricao }]`
- `POST /equipe` `{ email, nome, papel }` → `{ membro, link }` (link de convite para mandar à pessoa)
- `PATCH /equipe/:id` `{ nome, papel, ativo }` → membro
- `POST /equipe/:id/link` → `{ link }` (novo link de acesso: convite ou troca de senha)
- `GET /config` → `{ site: {...}, adsense: { cliente, ativo } }` | `PATCH /config/:chave` `{ valor }` → `{ ok }` (`site`, `adsense`)
- `GET /historico?pagina=1` → `{ itens: [{ id, quando, quem, via, acao, alvo, detalhes }], total, por_pagina }`

## Rotas fora da API

- `/admin/*`: o painel (SPA). `/admin/entrar?token=<hash>&tipo=invite|recovery`: link de convite ou troca de senha. `/admin/conectar?pedido=...`: tela "Permitir".
- `/.well-known/oauth-protected-resource[/mcp]`, `/.well-known/oauth-authorization-server`, `/oauth/authorize|token|register|revoke`: login do conector.
- `/api/redes/:id/retorno`: volta do login de cada rede.
