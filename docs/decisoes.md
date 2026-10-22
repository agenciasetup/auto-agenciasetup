# Decisões

## Tomadas em 22/10/2026

- **Arquitetura igual à do olharondoniense:** um Worker da Cloudflare atende site, downloads, anúncios e conector do Claude; banco no Supabase. Motivo: já provado nos outros projetos, um lugar só para manter.
- **Worker com domínio próprio em vez de Cloudflare Pages.** O pedido foi "Cloudflare Pages"; a Cloudflare hoje recomenda Workers com arquivos estáticos, e só o Worker tem o relógio (cron) que a fila das redes e as tarefas diárias vão usar. O resultado para quem visita é o mesmo.
- **Supabase em São Paulo (sa-east-1), plano grátis**, organização "equipe setup".
- **Banco fechado:** RLS em tudo sem política; só o Worker lê e escreve.
- **Arquivos (downloads e imagens) no Storage do Supabase**, buckets públicos `recursos` e `midia`. O R2 da Cloudflare pede cartão cadastrado; dá para migrar depois.
- **Site não é portal de notícias:** recursos para baixar (grátis, sem cadastro obrigatório) e "novidades" curtas. URLs: `/recursos/<slug>`, `/novidades/<slug>`, `/cursos/<slug>` (landing pages), `/baixar/<slug>` (conta o download e redireciona).
- **Anúncios:** os nossos produtos aparecem por afinidade (tags e categoria da página, com peso); AdSense entra quando o `ca-pub` for gravado em `config.adsense`. `/ir/<id>` conta o clique e o destino vem do banco (não aceita destino pela URL).
- **Conector MCP por chave (`as_...`)**, guardada só como hash. OAuth para o app do Claude fica para a fase do painel.
- **Estilo:** visual de 2026 (escuro, âmbar/laranja, serifada + condensada, cards de vidro, grão) com a fórmula de conteúdo de 2024 (cultura pop + lição, polêmica com virada, palavra-chave nos comentários levando a um recurso grátis).
- **DNS:** mantidos todos os registros de e-mail (MX Google, SendGrid, mail, SRV, SPF, DKIM, DMARC) e as verificações do Google e do Facebook. Removidos os do site antigo na Vercel (raiz, www, proposta, `_vercel`), o `_acme-challenge` antigo e o teste do cPanel. Todos respondiam 402 (Vercel parada). Backup em `_backup/`.

## Tomadas em 22/10/2026 (painel e conector)

- **Ordem:** o dono pediu painel e login do conector antes da Meta, com a base pronta para receber cada rede de forma modular.
- **Painel em React + Vite, igual ao do olharondoniense** (mesmos padrões: roteador sem biblioteca, login do Supabase no navegador, dados só pela API do Worker). Compilado fora do Git.
- **Cargos:** Administrador, Editor, Redator. App que se registra sozinho no OAuth liga no máximo como Redator; a sugestão para apps conferidos (Claude, ChatGPT) é Editor.
- **OAuth do conector trazido do olharondoniense** (que veio do Olhar de Fé e já funciona com o app do Claude). Prefixos `as_` (chave) e `asc_` (app registrado). Segredo `OAUTH_SEGREDO`.
- **Convites por link, não por e-mail.** No plano grátis do Supabase, o e-mail padrão só chega a quem é da organização e o texto não pode ser trocado sem SMTP próprio. O painel gera o link (convite ou troca de senha) e o administrador envia.
- **Cadastro fechado** no Supabase Auth; senha mínima de 10 caracteres.
- **Redes plugáveis:** um módulo por rede com contrato único; credenciais cifradas (AES-GCM, `CRIPTO_CHAVE`); fila no relógio de 10 minutos, 3 tentativas (5, 10, 15 minutos). Rede sem módulo pronto: a peça vira erro com explicação, sem tentar de novo.
- **Publicar nas redes é "perigosa"** no conector (o app do Claude pede o sim); publicar no site é "escrita" (dá para arquivar depois).
- **Teste local sem senha:** membro "Teste local (só no computador)", desativado, usado só com `DEV_USUARIO` + `AMBIENTE=local` + cabeçalho de teste.

## Tomadas em 22/10/2026 (site novo)

- **Referências estudadas:** Designi (frase do que é + busca grande + atalhos com contagem + calendário do marketing), Magnific (palavra que troca, abas de produto), Hubla (preto, seções que aparecem na rolagem). Mais as telas de painel e bento que o dono mandou.
- **Só tema escuro**, como a marca e as referências. Um tema só = consistência e menos coisa para conferir.
- **Inter + Instrument Serif itálico** (uma palavra por título), no lugar da Anton condensada: mais limpo, jeito iOS, e ainda conversa com a serifa dos carrosséis de 2026.
- **Agente de IA vira tipo de recurso**, com "abrir no ChatGPT/Claude" (`link_uso`, contado em `/usar/<slug>`). Recursos ganham ferramentas, galeria, vídeo, "o que vem", formato e nível.
- **Sem conta para quem visita.** Baixar e abrir é direto. O contato fica no "Receber novidades" (e-mail opcional, tabela `leads`).
- **Busca de verdade** no banco (sem acento, em título, resumo, tags e ferramentas) e instantânea no site.

## Em aberto

- **SPF não inclui o Google.** O registro atual é `v=spf1 a mx include:websitewelcome.com ~all`, mas o e-mail chega pelo Google Workspace. Se os e-mails enviados pelo Gmail caem no spam, falta `include:_spf.google.com` (e talvez o DKIM do Google). Não mexi: e-mail ficou como estava.
- **Projeto antigo na Vercel** (o que servia o site e o `proposta`) continua lá, parado. Apagar ou não é com o dono.
- **Fontes com licença:** os títulos usam Anton (gratuita). Se a marca usa Tusker Grotesk ou outra paga, trocar quando houver licença.
- **Ordem das próximas fases** (design system, Meta, tarefas diárias, AdSense).
- **Rotacionar** o token do Supabase e a chave global da Cloudflare (foram colados no chat). Para a Cloudflare, o ideal é um token com permissão só de Workers e DNS desta zona.
