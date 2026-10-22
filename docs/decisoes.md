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

## Em aberto

- **SPF não inclui o Google.** O registro atual é `v=spf1 a mx include:websitewelcome.com ~all`, mas o e-mail chega pelo Google Workspace. Se os e-mails enviados pelo Gmail caem no spam, falta `include:_spf.google.com` (e talvez o DKIM do Google). Não mexi: e-mail ficou como estava.
- **Projeto antigo na Vercel** (o que servia o site e o `proposta`) continua lá, parado. Apagar ou não é com o dono.
- **Fontes com licença:** os títulos usam Anton (gratuita). Se a marca usa Tusker Grotesk ou outra paga, trocar quando houver licença.
- **Ordem das próximas fases** (design system, Meta, tarefas diárias, AdSense).
- **Rotacionar** o token do Supabase e a chave global da Cloudflare (foram colados no chat). Para a Cloudflare, o ideal é um token com permissão só de Workers e DNS desta zona.
