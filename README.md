# auto-agenciasetup

Sistema automático de conteúdo da Agência Setup: site de recursos gratuitos e novidades sobre IA (agenciasetup.com.br), landing pages, anúncios e a fila das redes, operados pelo Claude via conector MCP.

- Stack: Worker da Cloudflare (`worker/`) + Supabase (`supabase/migrations/`).
- Começar: copie `.env.example` para `.env.local`, preencha, crie o `.dev.vars` e rode `npm install` e `npm run dev`.
- Regras, comandos e travas: [CLAUDE.md](CLAUDE.md). Plano: [docs/plano.md](docs/plano.md). Estilo da marca: [docs/estilo-instagram.md](docs/estilo-instagram.md).
