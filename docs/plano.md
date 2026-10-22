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

## Fase 1. Design system e templates de peça

- [ ] Templates de carrossel 4:5 em código (6 papéis: capa, "Calango,", desenvolvimento, chamada), no visual de 2026 com a fórmula de 2024.
- [ ] Gerar PNG dos slides no Worker (Browser Rendering ou Satori) e guardar em `midia`.
- [ ] Mascote calango 3D (Magnific) e banco de imagens da marca.
- [ ] Site: refinar visual (camadas, profundidade, imagens), capas automáticas dos recursos.

## Fase 2. Meta (Instagram, Facebook, Threads)

- [ ] Criar o app na Meta (precisa do dono: Business Manager, verificação do domínio já existe no DNS).
- [ ] Login das contas, tokens guardados como segredo, publicação de carrossel, Reels e story pela fila.
- [ ] Palavra-chave nos comentários vira DM com o link do recurso (o motor dos virais de 2024).

## Fase 3. Outras redes

- [ ] X, Threads (se não vier com a Meta), TikTok, YouTube (Shorts), LinkedIn.

## Fase 4. Tarefas diárias de IA

- [ ] Pautas em tempo real (lançamentos de IA, ferramentas, assuntos da semana) gravadas em `pautas`.
- [ ] Tarefa programada que transforma a melhor pauta em novidade + carrossel + thread, como rascunho.
- [ ] Série diária #NNN/365.

## Fase 5. Monetização

- [ ] AdSense: pedir aprovação com o site já com conteúdo (precisa do dono).
- [ ] Landing pages dos cursos e anúncios ligados aos produtos.
- [ ] Captura de e-mail opcional nos downloads.

## Fase 6. Skills

- [x] Painel e login do conector (adiantados para a Fase 0.5).
- [ ] Skills da agência (post, carrossel, vídeo, recurso) empacotadas para o app do Claude.

## Fase 7. Vídeo

- [ ] Vídeos de IA e gravação de tela mostrando uma ideia (Reels, Shorts, TikTok).
