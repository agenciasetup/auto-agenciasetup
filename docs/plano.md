# Plano

Marque `[x]` quando ficar pronto e conferido. Pare onde está escrito **PARE**.

## Fase 0. Estrutura base (22/10/2026)

- [x] Repositório `agenciasetup/auto-agenciasetup` nesta pasta; `.gitignore` com segredos e backups fora.
- [x] Chaves no `.env.local` (Supabase, Cloudflare) e `.dev.vars` (Worker local). **Rotacionar depois.**
- [x] Supabase: projeto `auto-agenciasetup` (`sjwhbjldecbabexqdnis`, São Paulo, plano grátis).
- [x] Banco (migration 001): config, categorias, recursos, artigos (novidades), produtos, landing pages, anúncios, downloads, leads, pautas, peças (fila das redes), chaves do conector, auditoria. RLS em tudo. Buckets `recursos` e `midia`.
- [x] Leitura do Instagram: 150 carrosséis com números, 29 analisados slide por slide. Guia em `docs/estilo-instagram.md`, gravado no banco (`ver_estilo`).
- [x] Worker: home, recursos (lista, filtro, página, download contado), novidades, cursos, landing page por blocos, privacidade, termos, 404, sitemap, robots, ads.txt.
- [x] Anúncios inteligentes dos nossos produtos (por assunto da página) e espaço do AdSense (liga quando houver `ca-pub`).
- [x] Conector do Claude em `/mcp` com 16 ferramentas e chave `as_...`.
- [x] Conferência local: 23 de 23.
- [x] DNS: backup, e-mail preservado, registros do site antigo (Vercel, parado com erro 402) removidos.
- [x] Site no ar em agenciasetup.com.br (Worker com domínio próprio).

**PARE.** Mostrar ao dono e decidir a ordem das próximas fases. (Decidido em 22/10: painel e login do conector primeiro.)

## Fase 0.5. Painel, login do conector e redes plugáveis (22/10/2026)

- [x] Banco (migration 002): equipe com cargos, chaves de API (coladas ou do login do app), conexões das redes (credenciais cifradas), fila com tentativas e "pegar sem repetir".
- [x] Login do painel pelo Supabase Auth (ES256), só por convite; links de convite e troca de senha gerados no painel.
- [x] OAuth 2.1 do conector (fichas de descoberta, registro do app, PKCE, código de uso único, chave de 1 hora que gira, revogação): o app do Claude conecta pelo endereço `/mcp`.
- [x] Ações num lugar só (`acoes.js`): painel e Claude com as mesmas regras de cargo e a mesma auditoria.
- [x] Redes como módulos (8, "em breve"), cofre AES-GCM, retorno de login das redes, fila no relógio com 3 tentativas.
- [x] Painel: início, fila e peça (slides), recursos e novidades, cursos (produtos, landing pages por blocos, anúncios), pautas, redes, Claude (conectar e chaves), equipe, configuração, histórico, tela "Permitir".
- [x] Conferência: `conferir-painel.mjs` (52 itens) e `conferir.mjs`, no computador e em produção.
- [ ] Primeiro administrador entrar (precisa do dono: o e-mail).
- [ ] Conectar no app do Claude e testar um pedido de verdade (precisa do dono).

**PARE.** Próxima: Fase 1 (templates e imagens dos carrosséis) ou Fase 2 (app da Meta).

## Fase 0.8. Motor de engajamento (22/10/2026)

Pedido do dono: o sistema 100% focado em engajar, entregar material atualizado e vender o mini curso no fim. Métrica sem perfeição.

- [x] Leitura de 1.200 posts reais: novidade de ferramenta traz alcance; "Comenta PALAVRA" traz 7 vezes mais comentários (mediana 88 x 12); a conta está parada desde 08/05/2026.
- [x] App da Meta com 5 permissões (básica, publicar, métricas, comentários, mensagens), prontas para teste.
- [x] Banco (migration 004): posts e números (`posts_redes`, nota de engajamento), seguidores por dia, radar (pautas com calor, `radar_fontes`), "Comenta X" (`gatilhos`, `respostas_gatilho`), oferta do funil (`config.oferta`), consultas `desempenho` e `em_alta`.
- [x] Desempenho: o relógio traz a conta inteira aos poucos (página nova + uma antiga por hora) e as métricas de cada post.
- [x] Em alta: 25 fontes (oficiais, imprensa do Brasil e de fora, Hacker News, Reddit, Product Hunt, GitHub, Google Trends), nota com peso para design e conteúdo, ângulo e formato sugeridos, "pedido pronto para o Claude".
- [x] Comenta X: o relógio lê os comentários, responde no post e manda a DM com o link do recurso (e a oferta). Palavra de peça liga sozinha quando a peça aprovada é publicada.
- [x] Oferta do funil no fim de cada recurso e da DM; captura de e-mail ligada ao recurso. Rascunho do mini curso "Posts com IA sem cara de IA" (produto inativo, landing em rascunho).
- [x] Painel: Início com o motor, Em alta, Desempenho, Comenta X, Oferta (em Cursos), aviso de reconexão em Redes. Claude: 9 ferramentas novas e instruções do motor.
- [x] Plano grátis da Cloudflare respeitado: relógio em rodízio (fila e Comenta X sempre; radar, métricas ou posts por vez). `WORKERS_PAGO=1` aumenta tudo se o plano mudar.
- [x] Workers pago (10/11/2026, assinado pelo dono, US$ 5 por mês): `WORKERS_PAGO=1` no `wrangler.jsonc`. O Atendente responde até 6 conversas por minuto (eram 2), o Comenta X lê mais posts e mais páginas de comentários, o radar lê as 25 fontes por rodada e métricas e posts passam por todas as contas. Os tetos de mensagens para as pessoas não mudaram. Ver `docs/decisoes.md` (10/11/2026, Workers pago).
- [x] Modo pago no ar (10/11/2026, "Sim, publique"), versão `55912598` (e na `95e9e709`, publicada logo depois pelo time de Design): conferido o site e o conector, e o relógio rodando sem erro.
- [x] Reconectar o Instagram em Redes (23/10/2026): 5 permissões, métricas chegando.
- [x] Publicar o app da Meta (modo ao vivo), em 23/10/2026: os comentários do público passaram a chegar.
- [x] Teste de ponta a ponta da DM (palavra TESTEDM no post mais recente): o comentário do dono foi lido pelo relógio e a DM saiu em 24/10/2026 (23h10 de Brasília do dia 23), sem erro. O acesso padrão da Meta basta.
- [x] Comenta X na hora (24/10/2026, pedido do dono, como no Olhar de Fé): a Meta avisa cada comentário em `/api/redes/meta/webhook` e a DM sai em segundos; o relógio continua como reserva. App e conta inscritos por `node scripts/meta-webhook.mjs`.
- [x] Aviso na hora conferido de ponta a ponta com o teste do painel da Meta (24/10/2026): chega assinado, é lido como comentário e não vai para a fila quando não pede palavra.
- [ ] Comentário de verdade na hora: a Meta só manda com Acesso Avançado de `instagram_business_manage_comments` (análise do app, pedida pelo dono; roteiro em `docs/meta-app.md`). Até lá o relógio responde em até 10 minutos.
- [x] Comenta X no estilo do ManyChat (24/10/2026, pedido do dono, como no Olhar de Fé): versões da mensagem com escolha da que ganha, link num botão com link curto e UTM por versão, mini curso no segundo botão, modos direto, seguir e pergunta, primeiro nome depois do toque, resposta no comentário escrita pela IA para cada pessoa, um direct por pessoa em cada post, palavra mandada no direct, contas de teste e limite por hora. Migration 016, `worker/lib/comenta.js`, tela nova, conector (`salvar_comenta` com versões, `escrever_comenta`, `nota_comenta`) e a skill do carrossel montando a automação junto com o post. No ar e conferido (`npm run conferir` e `conferir-painel` em produção).
- [x] Painel organizado e completo para postar (24/10/2026, pedido do dono): menu novo, Novo post (redes, formato, mídias, legenda por rede, opções do Instagram, Comenta X, rascunho, agenda ou publicar), agenda em calendário, Resultados por post (destaques, tabela ordenável, Comenta X e vendas por post) e o detalhe de cada post. Migration 017. No ar e conferido (`conferir` e `conferir-painel` em produção, teste do Novo post pela API com limpeza).
- [x] 5 carrosséis do Claude em rascunho (24/10/2026, pedido do dono): posts no automático (PAUTA), arte bonita com IA (CAMADAS), skill para Social Media (SKILL, com a skill de verdade em `materiais/skills/social-media-no-automatico/`), vale a pena usar o Claude (TEMPO, com card animado em vídeo) e 4 carrosséis com um prompt (PROMPT). Capas com o Filipe no Nano Banana Pro nos estilos das referências do Pinterest, venda do mini curso no penúltimo card, Comenta X em modo direto com 2 versões (desligado até a peça sair). Os 5 materiais publicados no site. 390 créditos do Magnific.
- [x] Os 5 rascunhos reprovados saíram do painel (cancelados, a pedido do dono, 24/10/2026).
- [x] Artes novas dos 5 carrosséis (24/10/2026): fotos reais do Filipe (as duas do "criado no Claude", o boné, o terno e o olho arregalado; recortes de 3 créditos cada, sem foto gerada) no estilo da versão 4, sem sombra projetada, luz de fundo e pétalas. Só no computador (`_local/carrossel/`), esperando a aprovação dele.
- [x] (Reprovada: "só recortou") Recortes das fotos reais no estilo da versão 4.
- [x] Artes v5 (24/10/2026): fotos geradas no Magnific (site, modo ilimitado) editando as selfies reais dele (terno do plano, camiseta amarela com o post impresso na mão, Demon Slayer, boné com camiseta amarela, Luffy), escolhidas pelo rosto lado a lado; recorte por cima da cena desfocada da própria foto (`fundoFoto`), título no meio. Só no computador, esperando a aprovação dele.
- [x] (Reprovada: glow sem sentido, notificação aleatória) Artes v5/v6.
- [x] Artes v7 (24/10/2026, retorno do dono sobre a intencionalidade): fundo liso de cor decidida e sem halo nele, fotos novas na skill (sem as pintas) e no prompt (apresentando), arquivo da skill no dedo, janela do Claude no fundo, os 4 carrosséis em leque na mão, notificação só a do Instagram no automático. Chamadas no mesmo padrão. Os 5 de volta no painel como **rascunho** (peças novas; as canceladas ficam no histórico; palavras desligadas).
- [x] Com o ok do dono ("Pode corrigir tudo, e agende", 24/10/2026): capas e galerias das 5 páginas de recurso trocadas pelas aprovadas (`entregar.mjs --capas-site`, conferido no ar); página de venda de volta ao exemplo original (deploy só com as 2 imagens de `public/img/estilos/`, `npm run conferir` em produção ok); os 5 carrosséis **agendados no Instagram às 17h, um por dia**: 26/10 automático (PAUTA), 27/10 vale a pena o Claude (TEMPO), 28/10 skill (SKILL), 29/10 arte (CAMADAS), 30/10 os 4 carrosséis (PROMPT). Comenta X em modo direto, liga sozinho quando cada post sai (material já no ar).
- [x] Materiais atualizados com as lições das capas (24/10/2026, pedido do dono): "A arte em 5 etapas" e "Os 4 prompts dos carrosséis" (fundo liso de cor decidida, um elemento só que conta a ideia, nada de brilho em volta da pessoa nem sombra projetada, notificação só quando conta o post). PDFs refeitos e trocados nas páginas no ar (`entregar.mjs --material`), conferidos no download. O pauteiro, as 10 tarefas e a skill não falam de visual e ficaram como estavam.
- [x] Segundo lote em rascunho no painel (25/10/2026): esculacho do perfil (ESCULACHO), quem cria é quem menos usa IA (FUTURO, com as 10 tarefas) e texto com cara de IA (TEXTO). Fotos no site do Magnific (grátis), recorte no computador, roteiros no documento "Roteiros: 5 ideias para o perfil". Os 2 materiais novos estão no site como rascunho.
- [x] Segundo lote refeito com os ajustes do dono (26/10/2026): esculacho com o perfil dele de verdade atrás, headline nova com o número ("Só 1 em cada 3 criativos usa IA no trabalho") e gráfico deitado e legível, foto nova do "percebe que foi a IA" (a arte do GPT numa mão, o texto com travessão na outra). Com o ok dele ("publique os 2 materiais novos no site e agende os 3 carrosséis"): `/recursos/esculacho-do-perfil` e `/recursos/prompt-tira-cara-de-ia` publicados (página 200, PDF baixando, oferta do curso no fim) e os 3 **agendados às 17h**: 31/10 esculacho (ESCULACHO), 01/11 quem cria usa menos IA (FUTURO, material das 10 tarefas) e 02/11 texto com cara de IA (TEXTO). Palavras desligadas até cada post sair.
- [x] Mini curso complemento **"Vídeos com Claude"** (26/10/2026, pedido do dono; roteiros e voz aprovados): kit para download em `Curso-Videos/`, mini VSL de 38 s e 7 aulas de uns 2:30, em roxo, com a voz pelo OmniVoice. Os vídeos estão no Bunny. O curso está em rascunho e o produto e a oferta (R$ 29,90) desligados. A etiqueta em cima das aulas do curso de posts e o bump no checkout ficaram prontos no código.
- [x] **"Vídeos com Claude" no ar** em 27/10/2026, com o ok do dono ("publique com o que tem"). O deploy levou a etiqueta e o bump; o curso foi publicado e o produto e a oferta de R$ 29,90 foram ligados. Conferido no ar:
  - o bump aparece no checkout do curso de posts, junto do vitalício;
  - `/checkout/videos-com-claude` abre;
  - a etiqueta aparece em cima das aulas e abre a mini VSL com o botão Comprar.
- [x] (Substituído) Refazer as aulas do "Vídeos com Claude" para **ensinar** em vez de mostrar, com foco em Reels. Os 11 roteiros de `Curso-Videos/aulas2/` foram aprovados em 27/10/2026. Em 28/10 saíram o Reels de exemplo `legenda-rapida`, os 21 mockups e as aulas 1 a 3 em `videos2/`. Aí o dono reprovou o escopo, porque o curso ficava só no motion.
- [ ] **"Vídeos com Claude" versão 4: edição de vídeo, motion, tokens e Claude in Chrome, em aulas de 5 a 6 minutos** (pedido do dono em 28/10/2026; **no ar desde 29/10**). A v3, com 14 aulas de uns 2 minutos em `aulas3/`, foi substituída: o dono achou as aulas curtas demais.
  - **Pronto:**
    - 12 roteiros em 5 módulos, em `Curso-Videos/aulas4/`, aprovados pelo dono ("Aprovo, pode gerar"); resumo e medida em `aulas4/roteiros-para-aprovar.md`;
    - as 12 aulas em `videos4/` (5:28 a 5:39), com as conferências zeradas, -16 LUFS, cópia para celular e quadros em `videos4/_previa-aula-N/`;
    - o zip do kit com os pedidos novos das 12 aulas;
    - 14 ferramentas de edição em `kit/ferramentas/editar/`, testadas, com os antes e depois em `estudio/edicao/antes-e-depois/`;
    - receitas 08 a 11 e `FERRAMENTAS-DO-GITHUB.md`, com os 8 repositórios do post de referência;
    - o zip v3, `Curso-Videos/Video-com-Claude-Kit.zip`; o v2 foi para `arquivo/`.
  - **Troca preparada e simulada (28/10, nada gravado):**
    - `scripts/area-semente-videos.mjs` faz a v4 (5 módulos, 12 aulas, legendas, marcadores, resumo e "Faça agora") e tem `--simular`, que só lê;
    - `scripts/videos-v4.mjs` lê as aulas dos arquivos;
    - os comandos, na ordem, estão em `Curso-Videos/TROCA-V4.md`;
    - o curso tem 5 alunos e nenhum começou uma aula, então a troca não mexe em progresso;
    - `scripts/legendas-srt.mjs --curso videos-com-claude --drive` montou `_local/drive/Vídeos com Claude/` (68 arquivos).
  - **Troca feita em 29/10/2026, com o ok do dono ("Pode trocar"):**
    - as 12 aulas estão no Bunny e no curso;
    - os textos de venda já falam em 12 aulas (capa, "inclui", bump, chamada e descrição do produto);
    - conferido: o banco tem 5 módulos e 12 aulas publicadas, cada uma com vídeo pronto, 6 marcadores, legendas, resumo e "Faça agora"; o kit no bucket tem 1.445.170 bytes e as receitas 00 a 11; o checkout e o bump mostram os textos novos;
    - app do aluno conferido por dentro em 29/10, pelo Chrome do Mac do dono, já logado: página do curso (subtítulo, 12 aulas, 5 módulos), aula 1 (vídeo novo, 6 assuntos, "Faça agora", o kit nos Materiais) e aula 12 (vídeo novo).
  - **Print da aula 1 refeito (29/10):**
    - o print da área com "7 aulas" (`estudio/videos/_comum/area.jpg`) foi trocado por um da página de hoje, tirado com o Chrome em 90%, sem o bloco do certificado (que é da conta do dono);
    - as frações em `v2-aula-2/video.js` foram medidas na página;
    - o trecho foi emendado de novo, a aula voltou a 5:35 e -16 LUFS e subiu no Bunny (2c62d2ba);
    - o antigo está em `Curso-Videos/arquivo/print-area-7-aulas/`.
  - **Falta:**
    1. subir a pasta do Drive: está pronta em `_local/drive/Vídeos com Claude/` (68 arquivos, 2,2 GB), e o dono arrasta para o Meu Drive. O Chrome só aceita 10 MB por arquivo pelo Claude, e as aulas têm de 150 a 220 MB;
    2. o curso não tem capa: a caixa do lado do título fica vazia na página do curso. Uma capa (ex.: um quadro da mini VSL) só entra com o ok do dono;
    3. decidir se a mini VSL de 38 s, que ainda vende só o motion, será refeita.
  - **Deploy em 29/10/2026, com o ok do dono ("Pode fazer o deploy"):** foi só a correção de `acoes.js` (era o único arquivo do site mudado desde o deploy de 27/10). Editar produto pelo conector voltou a funcionar, e o `npm run conferir` em produção deu "tudo certo".
  - **Para o próximo curso:** pôr no `produzir.ps1` a transcrição fala por fala (`transcrever.py --trechos`), que acertou os tempos das aulas 10 a 12. O Reels de teste `estudio/edicao/fala-teste/prontos/` tem a legenda "Comente Dark" no lugar de "Comenta EDITAR" perto do segundo 26. Ele não vai no kit e nenhuma aula mostra esse trecho.
  - **Avisos do Chrome (aula 3 e receita 10):** conferidos em 28/10 contra o app 4.29 e a extensão 1.0.102. O app mostra "Claude wants to use your browser", com os botões "Install" e "Not now". A extensão mostra "New permissions required", com "Claude wants to navigate to:", o site e os botões "Allow this action" e "Decline". A aula 3 foi refeita com esses textos.
  - **Depois da troca:** tirar de novo o print da área (o de hoje diz "7 aulas", no trecho que a aula 1 reaproveita da v2), refazer esse trecho e a aula 1, e subir a aula 1 de novo.
  - **Exemplos:** sem uma gravação real do dono, ficam o vídeo de teste e o `podcast-teste` (foto e voz gerada).
  - **Não testado:** as ferramentas no Mac.
- [ ] **Posts de frase compartilháveis, mais de um por dia** (pedido do dono em 29/10/2026: "10000% compartilháveis, virais, frase de efeito, sem parecer IA").
  - **Pronto:**
    - a skill `frase-agenciasetup`, com 6 formatos, os 7 testes do filtro, o banco com 20 frases prontas e a rotina de 2 por dia. Está gravada no painel e no conector;
    - o modelo `templates/frase/`, com a janela da agência em todos, letra grande e duas fontes, mais `scripts/frase.mjs` e `templates/frase/entregar.mjs`;
    - os 2 primeiros agendados com o ok do dono ("pode agendar"): o post "Max 20x" (f74010f0) em 29/10 às 19h e o carrossel "eu te amo, em 7 línguas do digital" (e3244f78, 9 slides) em 30/10 às 12h.
  - **Falta:**
    1. conferir se os dois saíram (`listar_posts`) e se a fila pegou a conexão do Instagram, como pegou nos carrosséis de 26 a 28/10;
    2. decidir se o lote da semana sai sozinho, por uma tarefa agendada que deixa os rascunhos prontos toda segunda. Ele continua aprovando no painel;
    3. depois de 2 semanas no ar, olhar os envios e os salvos (`ver_desempenho`) e anotar o que ganhou em `references/formatos.md`.
- [ ] Reels: parados por decisão do dono (o do Canva ficou como rascunho). O Canva Craft foi testado em 26/10/2026 (`_local/reels-canva/teste.md`); o Reels ainda não foi feito.
- [x] As 18 aulas foram refeitas em 26/10/2026, com mais movimento e a voz mais rápida. O curso passou de 112 para 95 minutos. Com o ok do dono, subiram no Bunny e na área. O registro de antes, fica como histórico: Aulas refeitas com mais movimento e a voz mais rápida (pedido do dono em 26/10/2026; estilo da 1.1 aprovado, curso inteiro autorizado). Por enquanto ficam só no computador, e os vídeos antigos estão em `Curso/videos/_antes/`. Para publicar, com o ok do dono e nesta ordem:
  1. trocar os vídeos no Bunny;
  2. rodar `area-semente.mjs`, que leva duração, legendas, marcadores e o kit para a área.
  Ao contrário, as legendas novas ficariam sobre os vídeos antigos. O kit já diz "duas ou três correções por vez" (decisão do dono). O `area-semente.mjs` não mexe mais no produto que já existe: antes, rodar de novo desligava a venda e voltava o preço para R$ 97.
- [ ] Acompanhar cada publicação (26/10 a 02/11): o post saiu, a palavra ligou e o primeiro direct foi entregue (`listar_comenta`). Depois do primeiro "Material entregue", o teste do "Já segui".
- [x] (Reprovada) Capas refeitas depois da reprovação do dono (24/10/2026): rosto pelas 5 fotos reais, corpo e postura dele, personagens (o Professor, o caçador de demônios, o Luffy), camiseta amarela e boné, no modelo novo `templates/capa-cinema/` (sem desfoque, brilho nem halo). Capa, chamada e as etapas da arte trocadas nos 5 rascunhos e nas capas das 5 páginas de recurso. A foto do Demon Slayer foi refeita (o primeiro rosto saiu mais fino). O exemplo "Padrão Setup" da página de venda e do início (`public/img/estilos/setup-1` e `setup-3`) passou para a capa nova do "vale a pena" (as antigas estão em `_backup/`), publicado e conferido. 546 créditos do Magnific (7 fotos e 7 recortes); sobram 28.
- [ ] O dono revisar os 5 rascunhos (e os rostos nas capas novas) e aprovar ou agendar.
- [x] Opções do Instagram conferidas sem publicar (24/10/2026): o carrossel do post 4 montado na API (container, sem `media_publish`) com texto alternativo na capa, o card em vídeo processado (FINISHED) e colaborador @filipealourenco aceito. O container vence sozinho em 24 horas.
- [ ] Primeiro comentário: só dá para conferir num post publicado de verdade (na primeira publicação pelo painel).
- [ ] Conferir com o dono o modo "seguir" de ponta a ponta: comentar TESTEDM, receber o direct com "Já segui 🦎", tocar e receber o material com o nome. Depende de a Meta entregar o toque no botão (`messaging_postbacks`) no acesso padrão.
- [ ] Se a DM para o público for recusada: pedir Acesso Avançado (revisão do app) para mensagens.
- [x] Módulo do Facebook (Página): conectar (várias Páginas), publicar post, álbum, vídeo e texto, seguidores, posts, alcance, comentários, resposta e DM. Desempenho separado por rede.
- [x] `META_APP_SECRET` no Worker e Página Agência Setup conectada em Redes (23/10/2026), pelo Facebook do Filipe Lourenço (administrador do app pelo Business Suite). Desempenho do Facebook lendo posts e alcance.
- [x] Mini curso à venda (23/10/2026, a pedido do dono): página de venda própria para o celular em `/cursos/posts-automaticos`, produto e oferta ativos, funil (DM do Comenta X e fim dos recursos) apontando para ela. Conferido em produção (vídeo tocando, botão até o checkout, largura certa no celular).
- [ ] Primeiros materiais no site e ligar o Comenta X nos virais antigos que ainda recebem comentário (GRID, STUDIO, GRAMA, ELEMENTOS...).
- [x] Agenda por dia, semana, mês e ano; Vendas com período, produto e UTM; canais com nome único e um toque por visita; Plano com o que fazer agora e ideias do Claude (30/10/2026, conferido no computador).
- [x] Publicado com o ok do dono (30/10/2026). Conferido em produção: páginas, conector, filtros de Vendas, Plano e toque único (visitante de teste, apagado depois).
- [ ] Conferir a primeira renovação do Plano pelo relógio, a partir de 02/11/2026 (`config.plano_ia`, `criado_em`).
- [x] Recuperar vendas (30/10/2026, conferido no computador): contato guardado no checkout, tela com WhatsApp, e-mails novos e número inflado corrigido. Tabela `recuperacoes` já no banco.
- [x] Publicar a recuperação de vendas (31/10/2026, com o ok do dono; contato, link e parar conferidos no ar).
- [ ] Conferir os primeiros lembretes em produção (`recuperacoes.lembretes`, tipo `recuperacao` em `emails`).

## Fase 1. Design system e templates de peça

- [x] Sistema de design do site (`docs/design-system.md`): tokens, componentes, celular como app, busca instantânea, animações de rolagem, transição entre páginas, capas automáticas (22/10/2026).
- [x] Site novo: início, recursos com filtros, agentes, página do recurso, busca, novidades, cursos, receber novidades. Publicado em 22/10/2026, com as conferências passando em produção.
- [x] Modelo de dados: agentes, ferramentas, galeria, vídeo, "o que vem", formato, nível, busca e leads (migration 003).
- [ ] Conteúdo inicial: os materiais que já foram iscas no Instagram (fontes, textura, Trello, Prompt Maker) e os primeiros agentes.
- [x] Modelo de carrossel 4:5 em código, em 5 camadas (`templates/carrossel/`), temas amarelo, preto e branco, exportado em JPEG pelo Chrome (`scripts/carrossel.mjs`). Primeiro conteúdo: "Esse carrossel foi criado no Claude" (23/10/2026).
- [x] Regra das 5 etapas embutida no modelo (`--etapa 1|3`), slides de dentro no padrão do perfil, recorte limpo e camadas reais da capa (23/10/2026).
- [x] Skill `carrossel-agenciasetup` com o processo completo e as verificações, no repositório, no painel (Claude > Skills) e no conector (`ver_skill`) (23/10/2026).
- [ ] Exportar no Worker (Browser Rendering) para o Claude gerar e subir sozinho; hoje sai no computador.
- [ ] Gerar PNG dos slides no Worker (Browser Rendering ou Satori) e guardar em `midia`.
- [ ] Mascote calango 3D (Magnific) e banco de imagens da marca.
- [ ] Painel com os mesmos tokens do site.

## Fase 2. Meta (Instagram, Facebook, Threads)

Roteiro completo em `docs/meta-app.md`.

- [x] Módulo do Instagram (API com login do Instagram): conectar, token de 60 dias com renovação, post, carrossel, story e Reels, validação (22/10/2026).
- [x] Conta de desenvolvedor da Meta (feita pelo dono, 22/10/2026).
- [x] App "Agência Setup" (2250794995702960) no portfólio Agência Setup 1, casos de uso do Instagram e da Página, domínio, privacidade, termos, exclusão de dados, endereço de volta e permissões.
- [x] `INSTAGRAM_APP_ID` e `INSTAGRAM_APP_SECRET` no Worker; @agenciasetup convidado como testador.
- [ ] Aceitar o convite de testador no Instagram e conectar em Redes > Instagram (precisa do dono).
- [ ] Primeira publicação de teste (com o ok do dono: vai para o perfil de verdade).
- [ ] Módulos do Facebook (Página) e do Threads.
- [ ] Palavra-chave nos comentários vira DM com o link do recurso (o motor dos virais de 2024).

## Fase 3. Outras redes

- [x] YouTube (Shorts e vídeo): módulo, projeto no Google Cloud (na conta Google do canal) e segredos no Worker (23/10/2026). Falta conectar o canal e testar um envio (vídeo sobe privado até a auditoria do Google). `docs/youtube-app.md`.
- [x] Pinterest (pin de imagem, carrossel e vídeo): módulo e app criado (23/10/2026). Falta o Pinterest aprovar o acesso Trial para cadastrar o endereço de volta, pegar a chave secreta e conectar; pins públicos pedem o Standard. `docs/pinterest-app.md`. **Trial negado em 26/10/2026**; política de privacidade com a parte "Redes sociais" no ar em 29/10. Tíquete pedindo nova análise enviado em 29/10; esperando a resposta por e-mail.
- [x] "Comenta X" em rede sem DM (YouTube): o link vai na resposta ao comentário.
- [ ] X, Threads (se não vier com a Meta), TikTok, LinkedIn.

## Fase 4. Tarefas diárias de IA

- [ ] Pautas em tempo real (lançamentos de IA, ferramentas, assuntos da semana) gravadas em `pautas`.
- [x] Tarefa programada `carrossel-em-alta-do-dia` (30/10/2026): todo dia por volta das 10h, no app do Claude deste computador, pega o melhor tema do Em alta e monta 1 carrossel com material grátis e Comenta PALAVRA, como rascunho. Só carrossel, por pedido do dono. Se nenhum tema servir, não força o post. Thread fica para quando o Threads estiver ligado. Só roda com o app aberto; o dono aprova as ferramentas uma vez em "Run now".
- [ ] Série diária #NNN/365.

## Fase 5. Monetização

- [ ] AdSense: pedir aprovação com o site já com conteúdo (precisa do dono).
- [x] Landing pages dos cursos (página de venda por blocos, 23/10/2026) e anúncios ligados aos produtos.
- [x] Order bump do acesso vitalício (R$ 19,90) na oferta do mini curso (23/10/2026); as outras ideias em `docs/order-bumps.md`.
- [x] Correção do checkout no navegador (o botão de pagar não enviava), publicada e conferida em produção (23/10/2026).
- [x] Galeria de exemplos de estilo na página de venda (Setup, advocacia iOS, elegante, religioso), publicada e conferida em produção (23/10/2026).
- [ ] Captura de e-mail opcional nos downloads.

## Fase 6. Skills

- [x] Painel e login do conector (adiantados para a Fase 0.5).
- [ ] Skills da agência para post único, vídeo e recurso (a de carrossel já existe: `carrossel-agenciasetup`).

## Fase 7. Vídeo

- [ ] Vídeos de IA e gravação de tela mostrando uma ideia (Reels, Shorts, TikTok).

## Fase 8. Área de membros, checkout e vendas

Plano completo em `docs/area-de-membros.md` (23/10/2026): `curso.agenciasetup.com.br` estilo Netflix, checkout próprio com o Asaas, Panda, tutor de IA, UTMs, gamificação e painel. Fases A a F lá dentro.

- [x] Estudo de custo e carga (Hubla x Asaas + Panda) e plano das fases (23/10/2026).
- [x] Plano aprovado pelo dono (23/10/2026).
- [x] Fase A: protótipo das 6 telas em HTML navegável, pela regra das 5 etapas, com o conteúdo real do mini curso (`_local/prototipo-area/`, fora do Git; publicado como Artifact privado). Conferido em celular (390 px) e computador (1440 px).
- [x] Dono aprovou o visual do protótipo (PARE da Fase A, 23/10/2026).
- [x] Fase B, no computador (23/10/2026):
  - banco (`20261024000006_area_membros.sql`, `..._07_area_busca.sql`) e o mini curso carregado pelo `scripts/area-semente.mjs` (18 aulas, kit no bucket privado `curso`, oferta desligada);
  - rota do `curso.` no Worker (no computador, segunda instância na porta 8788: `npm run dev:curso`);
  - checkout próprio (Pix com desconto, cartão pela página do Asaas, bump, cupom, Turnstile quando houver chave), Asaas e o pagamento simulado;
  - acesso automático, e-mail de boas-vindas e de código (Resend quando houver chave; sem ela fica "simulado"), entrada por link, código ou senha;
  - app do aluno (`aluno/`): início, curso, aula com Panda, retomar, concluir, marcadores, pular abertura e final, fichas, busca, perfil;
  - origem da venda: toques, links curtos `/l/`, primeiro e último toque no pedido; o link do Comenta X leva a palavra como campanha;
  - painel: Vendas, Alunos, Área de membros (aulas, ofertas, links, e-mails) e o cargo Suporte;
  - `node scripts/conferir-area.mjs`: 45 conferências de ponta a ponta, apaga o que cria.
- [x] No ar em 23/10/2026: deploy com o domínio `curso.agenciasetup.com.br`, preço R$ 39,90 (Pix 5% off, cartão até 9x pela parcela mínima de R$ 5), Asaas direto em produção (sem sandbox, pedido do dono), chave criada no Asaas ("Agencia Setup - Area de membros", sem saque) e guardada pelo painel (Área de membros > Pagamento), painel do cliente no app do aluno (Compras e pagamentos).
- [ ] Ligar o aviso do Asaas pelo painel e fazer a primeira compra de verdade (dono), com reembolso.
- [x] Resend ligado (e-mail de acesso e de código saindo de verdade). Turnstile só se o dono quiser; o Bunny entrou no lugar do Panda para os vídeos.
- [ ] PARE da Fase B: compra de verdade pelo dono, e o mini curso no ar.
- [x] Fases C, D, E e F, no computador (23/10/2026), a pedido do dono ("termine todas as outras funções"): aprender aplicando (tutor de IA, comentários, notas, certificado, PWA), vender dentro (ofertas pelo tema, upsell, presente, vagas, indicação, recuperação, Pixel e API de Conversões, nota fiscal), engajar (XP, selos, ranking, desafios, mural, depoimentos, avisos, sino, perfil público) e plataforma (montar cursos e trilhas no painel, Integrações, webhooks, Números, relatório da semana, ferramentas `area_*` no conector). Migrations 08 a 13 aplicadas. Conferido com `conferir-area`, `conferir-turma` e `conferir-plataforma`. O que ficou de fora e por quê: `docs/decisoes.md`.
- [x] Fases C a F no ar em 23/10/2026 (deploy com o ok do dono), com a correção do pedido que junta o aluno. Conferido em produção: site, conector (44 ferramentas), painel inteiro e as telas novas da área (Vendas, Números, Webhooks, Trilhas, montador, Integrações, app do aluno).
- [x] Resend: os 3 registros do `envio.agenciasetup.com.br` no DNS (com o ok do dono, 23/10/2026; cópia do DNS antes em `_backup/`), domínio verificado (São Paulo, Resend Forge) e chave "Agencia Setup - Area de membros" (só envio) criada.
- [x] Correção do teste da chave do Resend no ar (23/10/2026): chave só de envio é aceita; chave errada é recusada sem gravar (conferido em produção).
- [x] Chave do Resend colada pelo dono (23/10/2026): "Chave aceita (só envio)".
- [x] Bunny Stream ao lado do Panda (23/10/2026, no computador): biblioteca 788430 criada e protegida, integração no painel, player do aluno, campo na aula e `scripts/bunny.mjs`.
- [x] Bunny no ar (23/10/2026, com o ok do dono), chaves coladas pelo dono e as 18 aulas no Bunny (convertidas, 1,5 GB). Correção do 403 (o player manda o endereço do site). Conferido em produção: as 18 abrem com o link assinado; sem assinatura ou em outro site, o Bunny recusa. O dono viu a aula 1.1 tocar no navegador dele.
- [ ] Tirar `localhost` e `127.0.0.1` dos domínios liberados no Bunny quando não precisar mais testar no computador.
- [x] Cobrança do Bunny: cartão salvo e recarga automática ligada (US$ 10 quando o saldo cai abaixo de US$ 2), conferido em 23/10/2026. Crédito de teste de US$ 50; quando acabar, cobra sozinho.
- [x] Certificado padrão Setup (23/10/2026): modelos escuro e claro, selo, assinatura, QR e story; editável no painel (Área de membros > Certificado) com prévia ao vivo e pelo conector. No ar e conferido em produção.
- [x] VSL no topo da página de venda (`Curso/aulas/vsl/`, voz clonada do Filipe, no Bunny). Refeita em 23/10/2026: 1min43, notebook abrindo com o post pronto, 4 estilos, música e efeitos.
- [x] Página de venda com movimento (GSAP), história do Flávio, simulação do Claude, botão verde e botão do vitalício; depois limpa a pedido do dono (23/10/2026). No ar e conferida em produção.
- [x] Página de venda como landing moderna (terceiro retorno do dono): leque de estilos no topo, faixa dividindo, parede curva de posts, cartões de vidro, rolagem suave (23/10/2026). No ar e conferida.
- [x] Página inicial no mesmo espírito (23/10/2026): títulos em degradê prateado (Inter Tight), grade no topo, leque de posts feitos pelo Claude levando ao mini curso, faixa de ferramentas e rolagem suave no site todo. No ar; `npm run conferir` passando.
- [x] Pontas soltas (23/10/2026): e-mails com a logo nova e nunca para domínio de teste; descrição do produto sem prometer o tutor; cartão do curso em `/cursos` com imagem; conferências (`conferir`, `conferir-painel`, `conferir-area`) passando.
- [x] Tutor de IA ligado (23/10/2026): chave colada pelo dono em Integrações (Claude Haiku 5.5), testado em produção com um aluno de teste (respondeu citando o minuto da aula). Teto padrão: 15 perguntas por aluno por dia e US$ 50 por mês.
- [x] Novo início do aluno (23/10/2026, no computador): destaque com a prévia em vídeo e vidro, seções em ordem, celular no jeito de pôster. 18 prévias no ar (`scripts/previas.mjs`). Aprovado pelo dono e publicado no mesmo dia; conferido em produção (app novo, prévia no início, vídeo abrindo).
- [x] Ajustes pedidos pelo dono (23/10/2026, no computador): destaque de ponta a ponta, prévias só do app em 1600 px com desfoque leve, logo nova em tudo (`scripts/logo.mjs`) e o sino como lista suspensa. Publicado com o ok do dono e conferido em produção (arquivos da logo, site, checkout, app do aluno, sino e destaque).
- [x] Conquista dos 7 dias e bônus "Modelos prontos" (27/10/2026, no computador, sem deploy): barra de 7 partes no início, no curso e na aula; o bônus e o "Solicitar certificado" abrem no dia 7 (trava na tela e no servidor); painel em Área de membros > Certificado. Testado com compras simuladas de 1, 4 e 8 dias (prints em `_local/bonus7/`). Falta: deploy e, logo depois, `node scripts/area-bonus.mjs`.
- [x] Fila de reembolso e pedido pelo aluno (29/10/2026, no computador, pedido do dono): no painel (Vendas), o reembolso sai agora ou entra na fila para daqui a N dias (padrão 7), sem mexer no caixa até o dia; dá para tirar da fila (o acesso volta) ou devolver antes, e o relógio devolve no dia. No app do aluno, "Pedir reembolso" com barreiras: "tem certeza?" com as aulas assistidas e os arquivos baixados, motivo, "concordo" e confirmar; entra na fila de 7 dias e a equipe recebe um e-mail. Migrations 21 e 22 aplicadas (tabelas `reembolsos` e `arquivos_baixados`). Conferido com `conferir-area` (fila, tirar da fila, pedido do aluno, devolver agora) e um teste do relógio com pedido de teste. No ar em 29/10/2026 com o ok do dono (versão `fda64c60`), `npm run conferir` em produção ok.
- [x] Regra do card a mais nos posts de frase (29/10/2026, pedido do dono): todo post termina com o card de oferta do mini curso ("Comenta POSTS", R$ 39,90) e o Comenta X da palavra POSTS levando à página de venda; post de 1 frase vira carrossel de 3 (a frase, a mesma invertida e a oferta). Botão `cta` no modelo, `comenta` no conteúdo e no `entregar.mjs`, regra na skill `frase-agenciasetup` (gravada no painel). O "Max 20x" de hoje às 19h e o "eu te amo, em 7 línguas" de amanhã às 12h foram refeitos assim (peças novas no mesmo horário; as antigas, canceladas).
- [x] Cada app com os seus cursos (29/10/2026, no ar com o ok do dono, versão `b72f08e5`): no app da Setup, o curso com marca própria (Dúvidas da Fé) sai do início, da busca e da turma e vira o cartão "Cursos em outro app"; no endereço da marca, só o curso dela.
- [x] Imagens nos posts de frase (29/10/2026): café visto de cima com o ícone na espuma no espaço vazio da série e o notebook com a página do curso no card de oferta (Magnific de graça pelo site; `references/imagens.md` da skill). O "eu te amo" de amanhã às 12h já saiu assim.
- [x] Tarefa agendada `posts-de-frase-do-dia` (29/10/2026, pedido do dono: "as tarefas que vão fazer isso todos os dias"): todo dia por volta das 8h, no app do Claude deste computador, monta os 2 posts de frase do dia (12h e 19h) pela skill `frase-agenciasetup`, com o card a mais, o café em camadas e a avaliação de acabamento, e deixa como RASCUNHO no painel. Não aprova nem agenda. Só roda com o app aberto; para não parar pedindo permissão, o dono clica uma vez em "Run now" na página da tarefa e aprova as ferramentas.

## Fase 9. Versão em inglês (perfil @setupagency_eng e o curso em dólar)

Pedido do dono em 29/10/2026: os mesmos posts em inglês no perfil novo e o curso vendido em inglês, com áudio e vídeos em inglês, em dólar. Decisões em `docs/decisoes.md` ("versão em inglês").

- [x] Dois perfis no sistema (migration 23): cada conta, peça, palavra do Comenta X e post é do perfil `br` ou `en`. Painel com uma seção por perfil em Redes, "Para qual perfil?" no Novo post, filtro e etiqueta "EN" nas listas, Desempenho e Resultados por perfil; Comenta X com a conta e o idioma do perfil; conector com `perfil`. As 5 peças do Brasil já agendadas continuam saindo por @agenciasetup.
- [x] Venda em dólar pelo Stripe (migrations 24 e 25): moeda na oferta e no pedido, `worker/pagamento/stripe.js` (Checkout Session, aviso assinado, volta que confirma, reembolso), checkout e obrigado em inglês, página de venda em inglês (os blocos em `templates/venda-en/landing.json`), termos, privacidade e reembolso em inglês, e-mails de acesso, código e reembolso em inglês, e os e-mails só em português não saem para aluno em inglês. Números do painel sem misturar real e dólar.
- [x] App do aluno em inglês (`npm run aluno:en`, em `public/aluno-en/`): o mesmo app, com os textos trocados na compilação (`aluno/en.json`); mensagens do servidor em inglês no endereço do curso em inglês; turma, mural e ranking só da turma dele.
- [x] Kit em inglês (`Curso/kit-en/`), glossário (`Curso/GLOSSARIO-EN.md`) e os roteiros das 18 aulas e da VSL em inglês (`Curso/aulas-en/`). Motor das aulas com `idioma: 'en'` (tabela `motor/en.json`), voz do Filipe em inglês (OmniVoice) conferida pelo Whisper em inglês, `produzir-en.ps1` e `area-en.mjs`.
- [x] Curso no banco (`node scripts/area-semente-en.mjs`): curso `posts-on-autopilot` com marca (agenciasetup.com, idioma `en`), oferta US$ 19 e o vitalício US$ 9 desligados, landing em rascunho fora da lista.
- [x] Compra de teste completa no computador, no modo de teste do Stripe (30/10/2026): checkout, página do Stripe, volta, pedido pago em dólar, matrícula vitalícia, e-mail em inglês, app em inglês.
- [x] Domínio agenciasetup.com (comprado pelo dono na HostGator, 30/10/2026): zona no Cloudflare, servidores trocados na HostGator, SPF e DMARC de "sem e-mail", Turnstile liberado. A rota no Worker (`wrangler.jsonc`) só vale no próximo deploy.
- [x] Vídeos das 18 aulas e da VSL em inglês (fila `produzir-en.ps1`), no Bunny (`node scripts/bunny.mjs subir --curso posts-on-autopilot`) e no banco (`area-semente-en.mjs --sem-kit`).
- [x] No ar (30/10/2026, com o ok do dono): deploy, Stripe (chave restrita e aviso), landing publicada em agenciasetup.com. @setupagency_eng conectado (Instagram e Página "Setup Agency" no perfil Inglês) e avisos da Meta ligados nas 4 contas.
- [x] Material grátis em inglês (migration 27, `recursos.perfil`): páginas em `agenciasetup.com/free/<slug>`, fora do site em português; os 7 materiais traduzidos e gravados como rascunho.
- [x] Os posts do Brasil em inglês: 10 artes, 8 agendados de 31/10 a 5/11 no horário dos EUA (12h de Nova York; frases às 20h); horários registrados nas skills.
- [x] Deploy `5ffd4cd5` e os 7 materiais em inglês publicados (30/10/2026, ok do dono), conferidos no ar.
- [x] Ligar a venda (produto, ofertas e `oferta_en`), com o ok do dono; fotos novas para os 2 posts que esperavam (agora em rascunho).
- [x] Vários cursos no mesmo endereço (migration 28) e oferta só no app dela.
- [ ] "Videos with Claude" em inglês: 12 aulas, mini VSL e kit prontos (US$ 12). Falta conferir o app e o checkout com os dois cursos, publicar e ligar a venda (com o ok do dono).
- [x] 4 listas salváveis em português e inglês (fontes, manuscritas, cores, fundos): agendadas de 3 a 7/11, com o ok do dono.
- [x] Os 8 materiais dessas listas publicados (30/10/2026, ok do dono), páginas e downloads conferidos no ar.

## Fase 10. Follow-up do direct (vender todos os dias)

Pedido do dono em 08/11/2026: uma tarefa diária que lê o direct da agência, anota cada pessoa numa lista de follow-up até vender, compara com quem comprou e prepara as mensagens no jeito dele. Decisões em `docs/decisoes.md` ("follow-up do direct").

- [x] Fase 1: lidas umas 30 conversas do direct (Primary, General e Pedidos) para aprender o jeito de conversar e de ofertar.
- [x] Lista no painel (migration 30, `followups`): Vendas > Follow-up do direct (`/followup`), com as fases (na hora, dúvida com você, chegaram, ofertados, conversando, não sei o que fazer, compraram, não querem), o interesse (mini curso, Combo Black, material grátis...), a próxima mensagem, o histórico e a resposta do dono para cada dúvida. Conector: `followup_lista`, `followup_ver`, `followup_salvar`, `followup_responder_duvida`, `followup_sincronizar`, `followup_respostas`.
- [x] Fase 3 pelo banco: `followup_importar` traz quem comentou a palavra de cada post do Comenta X (com o @, a palavra e o post); `followup_compras` marca quem pagou (e-mail, ou nome e sobrenome iguais, "confira").
- [x] Fase 2: skill `direct-agenciasetup` com o jeito de conversar, as fases, as travas e o banco de mensagens (`references/mensagens.md`).
- [x] Migration 30 aplicada e publicado (08/11/2026, ok do dono: "Pode fazer tudo"), versão `8267d516`. `npm run conferir` em produção ok; as 6 ferramentas `followup_*` respondem no conector.
- [x] Primeira sincronização: 532 pessoas do perfil br (216 pediram o mini curso, 316 um material grátis) e 1 do en. Testado na tela e pela API (criar, mandar, dúvida, resposta do dono, compra achada pelo nome), com o teste apagado depois.
- [x] Fases 4 a 6: tarefa agendada `direct-followup`, que lê, anota, prepara e só manda com o ok do dono na sessão. Desde 08/11/2026 às 9h, 10h, 12h, 16h, 18h, 19h, 20h, 21h e 22h (os de pico do público são 12h e 16h a 22h).
- [x] Primeira rodada de verdade (08/11/2026, 21h40, com o ok do dono pelo celular): 31 pessoas do direct anotadas, 9 mensagens enviadas com pausa de 45 a 90 segundos, 2 dúvidas para o dono. Pós-venda tirado da rotina (só quem não comprou).
- [ ] Reconectar o conector "Agencia Setup | Painel" no app do Claude (as ferramentas `followup_*` só aparecem depois disso; até lá a tarefa usa `scripts/conector.mjs`).
- [ ] Aprovar pelo celular: as rodadas da tarefa rodam numa sessão própria, sem Remote Control.
- [ ] O Comenta X não guarda o nome de quem comenta (só o @): a compra dessas pessoas só é achada quando a tarefa anota o nome ou o e-mail na conversa.

## Fase 11. Escritório de IA (em andamento desde 09/11/2026)

Pedido do dono em 09/11/2026: automatizar sem depender do computador ligado e organizar tudo como um escritório de times de IA (vendas, conteúdo, vídeo, design, sistema, produto, receita e direção). O plano inteiro, com as três pistas, o plantão, os times, as fases 0 a 5, o custo e as decisões que são dele, está em `docs/escritorio.md`.

- [x] Ok do dono para a Fase 0 (09/11/2026: "Pode começar pela fase 0"). O andamento de cada item fica em `docs/escritorio.md`.
- [x] Construção 1 (09/11/2026, "pode continuar construindo tudo"): a base do escritório. Migration 34 (`agentes`, `turnos`, `propostas`), `worker/lib/escritorio.js`, ferramentas `escritorio_*` no conector e a tela `/escritorio` com as salas, os Calangos e a mesa. Testado no computador (`node scripts/conferir.mjs`: tudo certo).
- [x] Deploy da Construção 1 (09/11/2026, "Pode pôr no ar e continue as fases"). Conferido em produção (`node scripts/conferir.mjs https://agenciasetup.com.br`: tudo certo).
- [x] Construções 2 e 3 (09/11/2026, no ar): migration 35, o trabalho de hoje dos agentes do Worker na tela Escritório, o teto editável, o teste de vendedor (`followups.vendedor`, 2 roteiros, placar) e as três tarefas agendadas registrando o turno.
- [x] Permissão de mensagens do Instagram no login da Página (09/11/2026, pelo Chrome do Mac, com o ok do dono). A Página lê o direct pela API (`node scripts/meta-direct.mjs`).
- [x] Aviso de mensagem confirmado em 09/11/2026 às 22h25: uma resposta "Eu quero" a um story chegou ao Worker (`aviso meta: instagram messaging; direct: material`) e a palavra "EU QUERO" mandou o link do Combo sozinha em 3 segundos, com o token do login do Instagram (não precisou do token da Página).
- [ ] Conferir no Console da Anthropic se a chave de API do site é da organização ligada ao plano (para os analistas gastarem o crédito mensal). É com o dono.
- [x] Construção 4 (09/11/2026, à noite, no ar): **o Atendente do direct** (migration 36, `worker/lib/atendente.js`): toda mensagem do direct que não é palavra do Comenta X entra na lista de follow-up e a IA (Sonnet 5.5, meio centavo de dólar por mensagem) decide entre responder, mandar a dúvida para o dono ou ignorar. Só responde o que o dono já liberou; preço, link, travessão e @ são conferidos no código antes de sair. Ligado no modo **rascunho** (prepara a resposta e avisa; nada sai sozinho por ele) até o dono mandar ligar o automático. Testado com 10 perguntas em produção sem mandar nada (`followup_testar_resposta`).
- [x] Construção 5 (09/11/2026, à noite, no ar): **a carreira dos agentes** (migration 37, `agentes.nivel` e `agentes_historico`: admitido, promovido, rebaixado, pausado, voltou, demitido, com motivo) e **a planta em pixel** (`admin/src/telas/EscritorioPlanta.tsx`): 8 salas isométricas geradas no Magnific no molde da sala escolhida pelo dono (a 3), bonecos que andam, pensam e falam o que estão fazendo, perfil ao lado no clique, quadro de pessoal. Pausar e demitir desligam de verdade o Atendente e os dois vendedores; os outros agentes ainda não leem o estado.
- [x] Um Calango por função (09/11/2026, à noite, no ar): o dono escolheu os Calangos ("A Calangos, muito top"). 28 bonecos gerados no Magnific a partir da folha aprovada (mesmo rosto e proporção, roupa e objeto da função), recortados por `scripts/escritorio-bonecos.mjs` e ligados a cada agente pelo id (`config.escritorio_arte.bonecos`). Todos os 26 agentes têm o seu; sobram 2 de reserva.
- [x] Atendente no automático (10/11/2026, "pode ligar automatico"): o dono mandou um direct de teste pelo @overitasdei, o Atendente preparou a resposta em segundos e o envio pela API funcionou; depois de perguntar por que um cliente ficou sem resposta (era o modo rascunho), ele mandou ligar. Aprendeu também a tratar elogio curto em resposta a story como elogio.
- [x] Construção 6 (10/11/2026, no ar): migration 38. Cada Calango tem nome de gente (`agentes.apelido`: "João L. · Vendedor Calango", o dono muda no perfil); o gasto de IA é anotado chamada por chamada, com o modelo (`consumo_ia`, `worker/lib/consumo.js`: Atendente, resposta pública do Comenta X, versões de mensagem, plano e custo informado em turno); a tela mostra o consumo por sala, por modelo e por agente; seta de desempenho em cima de cada Calango (verde, amarela ou vermelha, com o motivo no perfil); Calangos pintados com a cor do setor (`scripts/escritorio-cores.mjs`); quem roda sempre ligado trabalha sentado, nas cadeiras das mesas da sala (8 bonecos sentados gerados no Magnific); balões menores; visão geral e visão do setor (a sala grande, o consumo e a equipe); no celular, duas salas por linha e o toque abre a sala.
- [x] Visão geral arrumada (10/11/2026, no ar), depois do retorno do dono ("muito ruim, mais organizadinho"): as 8 salas do mesmo tamanho (a Direção deixou de ser maior), em cartões com espaço, nome e ponto da cor do setor, e um botão de expandir; a sala inteira não é mais clicável e não há cursor de lupa; a passagem para a sala aberta é animada.
- [x] **Colmeia de vendas** (10/11/2026, no ar, "Boa, construir!"): migration 39, `worker/lib/colmeia.js`, tela `/admin/colmeia` (ensinar, testar o Atendente, aprovar proposta, lista com placar), conector `colmeia_ler` e `colmeia_salvar`. Nasceu com 26 itens (as 15 respostas e os fatos dos dois produtos que estavam na skill, 7 regras e as respostas que o dono já tinha dado). A resposta do dono a uma dúvida entra sozinha e o Atendente leva para a pessoa.
- [x] **Atendente, segunda versão** (10/11/2026, no ar): espera a pessoa terminar de escrever (a mensagem fica "esperando" e o relógio de minuto responde o conjunto), lê as últimas mensagens de verdade pela Meta e o tempo que passou (até 6 horas continua direto; perto de um dia, cumprimenta), busca na Colmeia só o que serve, modelo barato por padrão com o cuidadoso de segunda opinião. Custo medido: de US$ 0,0078 para US$ 0,0005 por resposta, e uma resposta por conjunto de mensagens em vez de uma por mensagem.
- [x] Teste ao vivo do Atendente novo (10/11/2026, pelo @overitasdei): as 3 mensagens quebradas viraram uma decisão só. O teste mostrou três defeitos, corrigidos na hora: (1) ele passava para o dono uma dúvida vaga em vez de perguntar qual era o problema; (2) o modelo barato se perdia na conversa com idas e vindas, e o padrão virou o modo misto (o barato abre, o cuidadoso continua); (3) a nossa última pergunta ficava fora do contexto quando a pessoa respondia em poucos segundos, e ele repetia a pergunta. Depois dos acertos a resposta saiu certa. O dono ensinou 8 itens na Colmeia durante o teste e eles já foram usados.
- [x] A resposta do dono a uma dúvida de uma pessoa entra na Colmeia como proposta ("vale para todo mundo?"), não como regra geral: uma resposta antiga ("volta com R$ 79,90", para uma pessoa só) tinha virado regra.
- [x] Sinal de vida no Windows (10/11/2026, com o ok do dono): tarefa agendada "AgenciaSetup-Batimento", de 5 em 5 minutos, que roda `scripts/batimento-oculto.vbs` (sem janela) e este chama `node scripts/batimento.mjs windows`. Conferido: o sinal chega e o Windows aparece ligado. Para o Mac, o painel (Escritório > Computadores) mostra um comando de uma linha para o dono colar no Terminal; ele usa a rota `/api/batimento` com um código que só serve para o sinal (`config.batimento_codigo`), sem chave do conector no Mac. Falta o dono colar no Mac e ver um Calango ficar offline de verdade.
- [x] Chefe de gabinete ligado no relógio (10/11/2026): `worker/lib/agentes/chefe-de-gabinete.js`, às 8h02 de Brasília (tenta de novo às 8h22 e 8h42 se falhar; não repete no dia). Uma chamada de IA por dia (perto de 1 centavo de dólar). Ainda não rodou de verdade: a primeira vez é a próxima manhã. O aviso no celular só chega depois que o dono ligar "Escritório de IA" nos avisos do app Vendas. Conferência sem gravar: `node scripts/conferir-chefe.mjs`.
- [ ] Registro antigo: Offline dos agentes do computador (10/11/2026): o código está no ar (`scripts/batimento.mjs`, conector `escritorio_batimento`, `config.batimentos`; cinza com ZzzZz quando nenhum computador dá sinal há 12 minutos). Falta instalar o sinal de 5 em 5 minutos no Windows (Agendador de Tarefas) e no Mac, com o ok do dono. Enquanto nenhum sinal chegar, a tela não marca ninguém como offline.
- [x] Zelador e Olheiro de ferramentas ligados no relógio (10/11/2026): `worker/lib/agentes/zelador.js` (sem IA, minuto 7 de toda hora: tarefa do computador que não rodou, erros, fila do Atendente parada, gasto acima de 80% do teto; avisa no celular e abre cartão quando o problema se repete) e `worker/lib/agentes/olheiro-de-ferramentas.js` (uma vez por semana, com busca na web, até 3 cartões na mesa). Conferência sem gravar: `node scripts/conferir-sistema.mjs`. Nenhum dos dois rodou de verdade ainda; a busca na web do Olheiro depende de estar ligada no Console da Anthropic.
- [x] **Confiabilidade do direct** (10/11/2026, no ar, "Pode fazer, e já corrigir os outros pontos"): migration 41 (`mensagens_nossas`, `marcar_resposta` e `pegar_respostas` refeitas, `atendente_fila_ensaio`). O relógio de minuto conta as chamadas externas de cada execução (`comContador` e `folgaDeChamadas` em `worker/nucleo/db.js`) e a etapa que não cabe fica para o minuto seguinte. O Atendente ganhou o modo `ensaio` (só responde as contas de teste do dono, `config.atendente.contas_teste`). O Comenta X marca "enviada" logo depois do direct, e o que fica preso em "enviando" vira "falhou: confira". `node scripts/conferir-atendente.mjs`: 106 conferências com banco, Meta e Claude de mentira.
- [x] **Conciliador da Colmeia** (10/11/2026, no ar; pedido do dono: "Crie um agente que verifica contradições"): migration 40 (`colmeia.substitui` e o agente `conciliador`, o Salomão R.), `worker/lib/agentes/conciliador.js` no relógio de minuto. Sai com uma leitura quando a Colmeia não mudou; trabalha quando ela mudou e está quieta há 3 minutos. Junção segura entra valendo e os itens de antes vão para o arquivo; qualquer outro caso vira proposta. A tela Colmeia mostra o que foi juntado e tem o botão de desfazer. `node scripts/conferir-conciliador.mjs`.
- [x] **Oferta no topo do material** (10/11/2026, no ar): faixa do mini curso no topo da página do recurso, com o preço de verdade da oferta (`ofertaComPreco` em `worker/lib/conteudo.js`) e `utm_content=material-topo`. Motivo, pelos números dos agentes de análise: quem ia do direct para o material comprava em 1% dos casos (3 de 307), contra 14% de quem ia direto para a página de venda (21 de 147).
- [x] **Curso como primeiro botão do direct** (10/11/2026, no ar e ligado): `config.oferta.curso_primeiro` (Cursos > Oferta; conector `salvar_oferta`). Ligado, o botão do mini curso vai em cima do material no direct do Comenta X e o link leva `utm_content=curso-topo` (desligado, `curso`), para comparar em Vendas.
- [x] **A pessoa no link** (10/11/2026, no ar): migration 42 (`toques.pessoa`, `followup_codigo`, e `followup_compras` acha a compra pelo link antes do e-mail e do nome) e `worker/lib/pessoa.js`. Os botões do Comenta X levam `&p=<código>`. O Atendente e os vendedores mandam o link de venda com `?de=<a|c|p>-<código>` (Atendente, Calango, Pergunta), que aparece em Vendas como o canal "Conversa no direct", com o conteúdo `atendente`, `calango` ou `pergunta`. A lista do follow-up traz `links_venda` de cada pessoa e a mensagem pronta já sai com ele. Antes, só 2 de 551 pessoas estavam ligadas a uma compra.
- [x] **Mídia: postou, apagou** (10/11/2026, com o ok do dono: "pode limpar o supabase sim, só cuidado pra não limpar o que não foi postado ainda"): `scripts/midia-limpar.mjs` tirou do Supabase os originais de 53 peças publicadas há 2 dias ou mais (255 arquivos, 586 MB) e deixou uma miniatura por peça (`midia/miniaturas/<id>.webp`, `pecas.opcoes.midia_limpa`). O bucket `midia` foi de 1,9 GB para 1,3 GB. Rascunho, aprovada, agendada e arquivo do site, do curso e do escritório não entram.
- [ ] Ligar a rotina automática do "postou, apagou" (`worker/lib/midia-limpeza.js`, escrita e desligada) e fazer a miniatura nascer com a peça.
- [ ] Decisão do dono: apagar ou não os arquivos sem peça com mais de 7 dias (759 MB).
- [ ] Ver ao vivo: o primeiro direct com o curso como primeiro botão e a primeira compra achada pelo link.
- [x] **Setor de vídeo, primeira parte** (10/11/2026, no ar; pedido do dono: "crie agora o setor de vídeo... um time que saiba viralizar... mas que tenham sentido e VENDAM"): migration 43 (`agentes.maquina`, `videos_virais`, `videos_virais_guardar` e o time de 6). **Caçador de virais** (`worker/lib/agentes/cacador-de-virais.js`, o Simão P., sem IA): no minuto 37 de toda hora lê 4 canais da lista, em rodízio, pelo RSS de Shorts do YouTube (de graça, sem chave) e guarda o Short que passou de 3 vezes a mediana do próprio canal. **Roteirista** (`worker/lib/agentes/roteirista.js`, a Débora M., Sonnet 5.5, uns 2 centavos de dólar por rodada): segunda e quinta às 9h31 lê os virais novos, a oferta com o preço e as palavras do Comenta X ligadas e põe até 3 roteiros na mesa, cada um num formato (`tela`, `filminho`, `estudio`, `noticia`), sempre terminando em "Comenta PALAVRA". O código barra viral fora da lista, palavra que não está ligada, link, travessão e valor que não seja o preço da oferta. Ações em `worker/lib/acoes-video.js`, conector `video_*`, aba "Vídeos fora da curva" em Em alta (`admin/src/telas/VideosVirais.tsx`). Na estreia: 36 canais conferidos (`node scripts/video-canais.mjs semente`), 4 Shorts fora da curva e 3 roteiros na mesa. `node scripts/conferir-video.mjs` (26 conferências).
- [x] Offline por máquina (10/11/2026): agente com `maquina` (windows ou mac) fica cinza quando essa máquina para de dar sinal, mesmo com a outra ligada. O Locutor, o Animador e o Revisor de vídeo são do Windows (a voz clonada e o render).
- [ ] Setor de vídeo, segunda parte: produzir o primeiro vídeo de um roteiro aprovado no estúdio (`Curso-Videos/estudio`), escrever a skill de produção com o que funcionou e só então ligar o Locutor, o Animador e o Revisor de vídeo (hoje são vagas abertas). Depois, a decisão do dono: produção sozinha a cada roteiro aprovado ou só quando ele mandar.
- [ ] Olheiro de animação automático (hoje vaga aberta; os 3 primeiros cartões vieram da pesquisa da criação do setor: GSAP no motor, garimpar o HyperFrames, Calango que fala).
- [ ] Seguir perfis do Instagram (as referências do dono são de lá e não têm canal no YouTube) e mais canais em português: nos 9 de hoje nada saiu da curva em 10 dias.
- [x] **Conteúdo e Design** (10/11/2026, com o ok do dono: "Pode aplicar"): migration 44 muda a sala, o nome e a função (o Redator escreve os dois formatos, o Designer e o Revisor vão para o Design), a carreira de cada um com o motivo, os Calangos do Designer e do Revisor em laranja, as tarefas das 8h e das 10h registrando três turnos com `dados.tarefa` (o Zelador separa as duas tarefas por essa marca) e as skills de carrossel e de frase com "Quem faz o quê".
- [x] **Time de Design no ar** (10/11/2026, deploy com o ok do dono: "Pode publicar"): o **Olheiro visual** (`worker/lib/agentes/olheiro-visual.js`, a Sara L., Sonnet com visão, segunda às 9h03) e o **Diretor de arte** (`worker/lib/agentes/diretor-de-arte.js`, o Davi C., segunda às 10h03, teste de estilo da semana medido só com código), ações em `worker/lib/acoes-design.js`, conector `design_leitura`, `design_olheiro` e `design_diretor`. `node scripts/conferir-design.mjs` (39 conferências; `--banco` simula com o banco de verdade). A API do Claude não busca imagem do Instagram pelo endereço ("This URL..."): o Worker baixa cada capa e manda a imagem junto. Primeira rodada de verdade: a Sara leu 9 capas (5 acima, 4 abaixo da curva; US$ 0,05) e pôs o cartão na mesa; o Davi propôs o primeiro teste, "Assunto perto da lente com grama desfocada na frente", em 3 capas de carrossel (US$ 0,01), que espera a aprovação do dono.
- [ ] Primeiro teste de estilo medido: o dono aprova o cartão, o Designer marca 3 capas (`dados.design_teste`) e o Diretor de arte mede na segunda seguinte.
- [ ] Calangos próprios para os 4 agentes novos da sala de Vídeo (hoje usam desenhos de reserva, pintados com a cor da sala).
- [ ] Registro antigo: Agentes em construção em paralelo (10/11/2026): Chefe de gabinete (`worker/lib/agentes/chefe-de-gabinete.js`), Zelador e Olheiro de ferramentas (`worker/lib/agentes/`). Falta ligar no relógio e publicar.
- [ ] Pedido original, para registro: **Colmeia de vendas** (pedido do dono em 10/11: "existe alguma base colmeia pra todos vendedores, sobre o que é bom, ruim, deu certo, vendeu, não vendeu? Aprende com minhas instruções"): hoje o conhecimento do Atendente está em três lugares (a tabela de respostas dentro de `worker/lib/atendente.js`, os preços das ofertas e as dúvidas que o dono respondeu) e os vendedores da tarefa do direct leem a skill. Falta uma base única, que todos leiam e escrevam, que o dono edite em português simples e que aprenda com as vendas.
- [ ] Relógio e tarefas agendadas lerem o estado do agente (pausado ou demitido não roda), para o botão valer para todos.
- [ ] Apagar no Magnific as 2 opções de sala que não foram usadas e a folha de pessoas (o dono escolheu os Calangos).
- [ ] Próximas construções: os primeiros analistas no Worker (chefe de gabinete e gerente de receita), o zelador e o plantão.
