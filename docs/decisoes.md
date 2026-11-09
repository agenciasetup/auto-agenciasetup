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

## Tomadas em 22/10/2026 (motor de engajamento)

- **Foco do sistema:** engajar, entregar material atualizado e vender o mini curso no fim. O caminho: novidade quente (alcance) e material grátis com "Comenta PALAVRA" (comentário) levam ao site, e o site leva ao mini curso.
- **Métrica sem perfeição:** nota = (curtidas + 3 comentários + 2 salvos + 2 compartilhamentos) sobre o alcance. Sem alcance (post antigo ou sem permissão), usa os seguidores. Medianas, nunca médias (um viral de 150 mil curtidas distorce a média).
- **"Comenta X" sem webhook** (trocado em 24/10/2026 pelo aviso na hora, ver abaixo): a Meta só manda webhook para app publicado. O relógio lê os comentários (até 2 posts e 6 DMs por vez no plano grátis). Resposta privada (DM ligada ao comentário) vale até 7 dias depois dele; uma por comentário (`respostas_gatilho` com unique).
- **Quem liga a DM:** palavra criada com a peça liga sozinha quando a peça aprovada é publicada (a aprovação da peça já é a aprovação da DM) e só com o material publicado. Palavra avulsa liga no painel, com cargo de Editor ("perigosa" no Claude).
- **Radar por fontes abertas, sem IA paga:** RSS, Google Notícias, Hacker News, GitHub e Google Trends. Nota por regra (fonte, ferramenta, assunto de design e conteúdo, lançamento, sinais). O ângulo fino quem escreve é o Claude, na hora de criar.
- **Plano grátis da Cloudflare:** cada execução tem pouco processamento e 50 chamadas externas. O relógio faz rodízio; fontes grandes são lidas só no começo do arquivo. Se precisar de mais velocidade, Workers Paid (US$ 5/mês) + `WORKERS_PAGO=1`.
- **Segredos do Worker** passam por `scripts/segredos.mjs` (a API da Cloudflare). `wrangler secret put` no PowerShell pôs um BOM invisível no ID do app e quebrou o login do Instagram.
- **Mini curso:** rascunho "Posts com IA sem cara de IA" (o que a agência faz de melhor, segundo os números). Preço, checkout e conteúdo final são do dono.

## Tomadas em 23/10/2026 (Facebook e modo do app)

- **Facebook pelo Login do Facebook para Empresas** (config_id), no mesmo app da Meta. Cada Página liberada vira uma conexão com o token da Página (sem vencimento). O módulo publica post, álbum, vídeo e texto; lê seguidores, posts, alcance e comentários; responde e manda DM pelo Messenger.
- **Desempenho por rede** (`desempenho(p_dias, p_rede)`): Instagram e Facebook não se misturam. Os seguidores do Início são os do Instagram.
- **Comentários vazios em desenvolvimento:** com o app não publicado, a Meta não entrega comentários do público. Publicar o app (modo ao vivo) é decisão do dono; DM para o público pode pedir revisão do app (Acesso Avançado).

## Tomadas em 23/10/2026 (modelo de carrossel)

- **O assunto das capas é sempre o Filipe**, num estilo criativo, com o rosto idêntico. Gerar do zero errou o rosto (testa, cor dos olhos); o caminho é a foto real dele como base no Nano Banana Pro, trocando só fundo e luz. Fotos em `templates/carrossel/referencias/filipe/` (fora do Git) e no Magnific.
- **Desfoque do título por camadas somadas** (plus-lighter): o desfoque cresce aos poucos, como nas capas da agência. Duas cópias cruzadas (nítida e borrada) davam letra dupla.
- **Capas da agência como gabarito** em `templates/carrossel/referencias/capas/`: floreio por cima da palavra, assunto ultra contrastado com brilho e sempre conferir se não poluiu.
- **Regra das 5 etapas** para toda peça visual: mínimo bem feito (sem efeito nem textura), revisão, efeitos só onde fazem sentido, revisão, e só então ruído, meio-tom e contraste. O modelo tem as etapas embutidas (`--etapa 1|3`).
- **Slides de dentro no padrão do perfil:** um assunto por slide, centralizado, margem larga, uma prova só, fundos alternando preto e branco. Flare solto nos cantos saiu (não ligava um card ao outro); a linha de progresso embaixo é o que liga.
- **Pele:** tirar só espinhas e manchas, sem alisar. O realce de pele automático do Magnific mudou o rosto e foi descartado.
- **Texto de apoio alinhado à borda da palavra grande**, medido depois das fontes. Nada de posição solta.
- **Recorte:** foto gerada no fundo da cor do tema (não em preto) e filtro que fecha furos e limpa a borda. O recorte automático em fundo preto deixava o cabelo serrilhado e furado.
- **Slide das camadas com as camadas reais da capa**, exportadas uma a uma, em vez de planos desenhados à mão com números.
- **Skill `carrossel-agenciasetup`** com o processo inteiro (pauta, voz do Filipe estudada em 80 legendas, capa intencional, foto, 5 etapas, verificações e o histórico de correções). Fica no repositório (`.claude/skills/`), no banco (`config` "skill:<nome>", gravada com `npm run skill`), no painel (Claude > Skills, com download do `.skill`) e no conector (`listar_skills`, `ver_skill`; as instruções do conector mandam ler antes de qualquer peça visual).
- **Piercing:** o Filipe tem um só, na parte de cima da orelha esquerda, e nenhum brinco. Vai no pedido de toda geração e na verificação.

## Tomadas em 23/10/2026 (YouTube e Pinterest)

- **YouTube** pela YouTube Data API v3, com o projeto **Agencia Setup Redes** na conta Google do canal (endereço em `_local/contas.md`, fora do Git). App em teste: vídeo enviado pela API fica privado até a auditoria do YouTube, e o login vence em 7 dias (pôr o app "Em produção" sem verificação resolve os 7 dias; decisão do dono). Upload em stream (o vídeo não passa inteiro pela memória do Worker).
- **Pinterest** pela API v5, app **Agencia Setup Publicador** na conta business Agencia Setup. No Trial os pins ficam visíveis só para a conta; o Standard pede um vídeo do login e de uma publicação. O pin vai para o quadro da agência e leva para o recurso do site com `?de=pinterest`.
- **"Comenta X" em rede sem DM:** o link do material vai na resposta pública ao comentário. A API do Pinterest não abre comentários, então lá não há "Comenta X".
- **Facebook conectado** pelo Facebook do Filipe Lourenço (MacBook), com acesso total ao app dado no Meta Business Suite; só a Página Agência Setup e o portfólio Agência Setup 1 foram liberados no login.
- **Plano grátis com três redes:** "Atualizar agora" passou de 50 chamadas por execução. Agora o botão atualiza só a rede escolhida na tela, e o relógio lê posts e métricas de uma conta por vez (rodízio em `config` "vez:posts" e "vez:metricas").
- **Token morto genérico:** o módulo marca `tokenMorto` (HTTP 401 do Pinterest e do Google) e `credenciais.js` pede "Reconectar", como já fazia com os códigos da Meta.

## Tomadas em 23/10/2026 (área de membros, Fase B)

- **Um Worker só** serve o site e o `curso.agenciasetup.com.br` (decide pelo endereço). No computador, o `wrangler dev` troca o endereço da chamada, então o app do aluno roda numa segunda instância (`npm run dev:curso`, porta 8788, `MODO=curso`).
- **Cartão pelo caminho B** (página de pagamento do Asaas, volta para o nosso "obrigado"). O caminho A (cartão no nosso checkout) fica para quando o suporte do Asaas liberar token e 3D Secure.
- **Pagamento simulado no computador:** sem `ASAAS_CHAVE`, o checkout usa um provedor de mentira com a mesma interface. O pedido sai marcado como teste e não entra nos números. `ASAAS_AMBIENTE=producao` troca o sandbox pela produção.
- **Aviso do Asaas** grava o evento (sem repetir pelo id) e processa depois; o relógio reprocessa o que falhou e vence o Pix parado.
- **Login do aluno pelo Supabase Auth**, sem senha obrigatória: link mágico no e-mail, código de 8 números ou senha (opcional, no perfil). Depois do pagamento, um atalho de entrada vale uma vez, por 2 horas.
- **E-mail pelo Resend** quando houver a chave. Sem ela, o e-mail fica no banco como "simulado" e o link de entrada sai pelo painel (Alunos).
- **Acesso de 365 dias** por compra (em `produto_acessos`; muda por produto). Oferta nasce **desligada**: só vende com o dono ligando no painel, depois do teste de R$ 1.
- **Cargo Suporte:** vê alunos, reenvia acesso, gera link de entrada e libera ou tira curso. Não vê faturamento nem reembolsa (reembolso é só do administrador).
- **Origem da venda:** cookie próprio `as_v` (sem IP), toques dos últimos 30 dias, primeiro e último toque gravados no pedido. A marca do Comenta X passou de `?de=dm-<id>` para `?de=dm-<palavra>`, para a venda aparecer como "instagram · dm · palavra".
- **Ações da área** em `worker/lib/acoes-area.js`, exportadas por `acoes.js` (painel e, depois, o conector chamam o mesmo).

## Tomadas em 23/10/2026 (Asaas em produção)

- **Asaas direto em produção**, sem sandbox (pedido do dono). No computador continua o pagamento simulado: a chave nunca vai para o `.dev.vars`.
- **A conta do Asaas é a mesma do Veritas Dei.** O Asaas manda os avisos de todas as cobranças da conta para todos os sites. Por isso tudo o que é nosso leva `setup:` no `externalReference` (cobrança `setup:<pedido>`, cliente `setup:aluno:<id>`), e aviso sem a marca responde 200 sem ser guardado (erro pausaria a fila; guardar seria ficar com dados de clientes do Veritas).
- **Chave e token do aviso guardados pelo painel**, cifrados no banco (`config` "asaas", AES-GCM com `CRIPTO_CHAVE`), não em segredo do Worker: o administrador cola a chave em Área de membros > Pagamento e liga o aviso com um botão (o token é gerado no servidor). Segredo do Worker (`ASAAS_CHAVE`, `ASAAS_AVISO_TOKEN`) ainda vale e tem a vez. As ferramentas do Chrome escondem chaves, então o Claude nunca as lê nem digita.
- **Chave própria no Asaas** ("Agencia Setup - Area de membros"), separada da do Veritas, sem permissão de saque.
- **Preço R$ 39,90.** Parcela mínima de R$ 5 (regra do Asaas): o checkout e o servidor cortam o número de parcelas (hoje até 9x, com 3,19% ao mês).
- **Do Veritas, aplicado:** descrição da cobrança sem acento nem travessão; QR do Pix com até 4 tentativas; `PAYMENT_APPROVED_BY_RISK_ANALYSIS` libera o acesso (cartão em análise); tempo-limite de 20 s nas chamadas. Cartão continua na página do Asaas (caminho B): o Veritas teve recusas do antifraude com o cartão digitado no próprio site, e a página do Asaas passava.
- **Retorno do cartão** (`callback.successUrl`) só funciona com o domínio cadastrado na conta do Asaas. Se o Asaas recusar, a cobrança sai sem o retorno.
- **Painel do cliente** (app do aluno, Compras e pagamentos): pagar o que ficou pendente, trocar Pix e cartão (cancela a cobrança velha antes de criar a nova, para ninguém pagar duas vezes), comprovante do Asaas, garantia com pedido de reembolso por e-mail e dados de cobrança (nome, celular, CPF; o CPF fica só no Asaas). Trocar cartão e cancelar assinatura entram quando houver produto por assinatura.

## Tomadas em 23/10/2026 (área de membros, Fases C a F)

- **Tutor de IA pelo SDK oficial da Anthropic**, modelo escolhido em Integrações (padrão Claude Opus 5.5), com cache do contexto da aula, limite por aluno por dia e teto de gasto no mês. Pergunta repetida vira resposta pronta (custo zero). O texto do aluno é dado, nunca instrução.
- **Integrações pelo painel** (Resend, Claude, Panda, Turnstile, Pixel/Google, nota fiscal), cada chave conferida no próprio serviço e cifrada no banco, como o Asaas. Segredo do Worker continua tendo a vez. No computador o banco é ignorado (nada cobra, manda e-mail ou gasta IA de verdade).
- **Webhooks de saída por fila:** o evento entra em `webhook_envios` e o relógio manda (3 por rodada, até 6 tentativas), assinado com HMAC SHA-256. A venda ou a aula nunca espera o outro sistema. 30 falhas seguidas desligam o webhook. O segredo aparece uma vez e fica cifrado.
- **Números numa função só do banco** (`numeros_area`), uma chamada, cabe no plano grátis. Pedidos e matrículas de teste ficam fora.
- **Relatório da semana:** segunda-feira, 8h de Brasília, com o Claude ligado (pode desligar em Integrações). Custa centavos de dólar; "Gerar agora" no painel refaz.
- **Conector:** ferramentas `area_*`. Cupom e aviso criados pelo Claude nascem desligados; ligar e liberar curso só quando a pessoa pedir (mesma regra das peças).
- **Funções da área fechadas para o público** (migration 13): só o Worker (chave secreta) chama, como as outras do banco.
- **Pedido tem dois caminhos até o aluno** (`aluno_id` e `indicado_por`, desde a migration 10). Toda consulta de pedido que junta o aluno usa `alunos!pedidos_aluno_id_fkey`; sem isso o banco recusa (foi o que o `conferir-plataforma` pegou).
- **Não feito, e por quê:** cartão salvo e 1 clique, 2 ou 3 cartões (precisam do cartão digitado no nosso checkout, o caminho A, que o Asaas só libera com token e 3D Secure); assinatura e Pix Automático (não há produto por assinatura); push no celular (chaves VAPID e app instalado no iPhone; o sino e o e-mail cobrem); afiliados e coprodução (divisão de pagamento do Asaas, quando houver parceiro). A entrega do webhook foi conferida até o envio assinado; falta testar com um n8n de verdade.

## Tomadas em 23/10/2026 (Resend)

- **E-mail sai por `envio.agenciasetup.com.br`**, subdomínio só do Resend (região São Paulo, Resend Forge). Três registros novos no DNS: TXT `resend._domainkey.envio` (DKIM) e os CNAME `rsend.envio` e `send.envio` (só DNS, sem proxy). Nenhum registro de e-mail do domínio principal mudou.
- **Chave do Resend só de envio** ("Sending access"). Ela não lê a lista de domínios: o Resend responde 401 `restricted_api_key`, e o painel aceita isso como "chave aceita (só envio)". Chave inválida (400 `validation_error`) é recusada e nada é gravado.
- **Lição:** o painel no computador grava no banco de produção. Testar uma chave pelo painel local grava de verdade; um teste meu gravou uma chave falsa na configuração do e-mail por alguns minutos (apagada em seguida).

## Tomadas em 23/10/2026 (vídeos no Bunny)

- **Bunny Stream entra ao lado do Panda** (pedido do dono: "não precisa tirar o Panda"). Cada aula tem `video_bunny` e `video_panda`; o app usa o Bunny quando a aula tem o id dele e a integração está ligada, senão o Panda.
- **Biblioteca "Agencia Setup Cursos" (788430)**, principal em Frankfurt com cópia em São Paulo, Los Angeles, Nova York e Singapura (São Paulo custa US$ 0,005/GB a mais; armazenamento US$ 0,035/GB por mês).
- **Proteção:** sem "direct play", link direto do arquivo bloqueado, só toca em `curso.agenciasetup.com.br` (e `localhost`/`127.0.0.1` para testar), player só abre com link assinado pelo Worker (SHA-256 da chave do token + id + validade, 6 horas) e os pedaços do vídeo também assinados (CDN token). Tirar `localhost` e `127.0.0.1` quando não precisar mais testar no computador.
- **O player manda o endereço do site** (`referrerPolicy="origin"` no iframe do Bunny e do Panda). O site usa `referrer-policy: same-origin`, então sem isso o navegador não dizia ao Bunny de onde vinha o pedido e o Bunny respondia 403. Só vai o domínio, sem o caminho da aula.
- **Envio pelo `scripts/bunny.mjs`**, deste computador (os vídeos estão em `Curso/videos/`), direto na API do Bunny. As duas chaves (API da biblioteca e do token) ficam na integração do painel, cifradas; o Claude não lê nem digita.

## Tomadas em 23/10/2026 (novo início do aluno)

- **Início no jeito de streaming, mais limpo** (pedido do dono, com referências de Netflix e Marvel): o destaque é um bloco arredondado (o mesmo dos posts: fundo preto e bloco com borda arredondada) com a prévia da aula em vídeo no fundo, o texto num vidro desfocado e, no computador, as próximas aulas ao lado. No celular, pôster alto com o título forte e o carrossel logo abaixo.
- **Título do destaque em Anton** (caixa alta, condensada), a mesma letra das capas das aulas.
- **Seções em ordem e poucas:** seu progresso (curso, trilha, sequência e nível), da turma (desafio, mural ou o convite para postar, ranking), materiais e o que conhecer.
- **Prévia em vídeo pública** (`aulas.previa_url`, bucket `midia`): 8 s sem som, 50 a 160 KB. O vídeo da aula continua protegido no Bunny. Não toca para quem pede menos movimento ou economia de dados, e pausa fora da tela.

## Tomadas em 23/10/2026 (logo, destaque e sino)

- **Logo nova em todo lugar** (a que o dono mandou, laranja com degradê): fundo tirado pelo brilho, borda firmada e as cores da própria imagem. Arquivo mestre `public/img/logo-setup.png`; os tamanhos saem do `scripts/logo.mjs`. Substitui o quadrado laranja com "S" no site, checkout, painel, app do aluno, certificado e perfil público, favicons e ícones do app. No `curso.` a logo vem de `/aluno/logo.png` (lá só `/aluno/*` é servido).
- **Destaque do início de ponta a ponta** (pedido do dono: "a hero inteira"): o vídeo ocupa a largura toda e some no preto da página; o conteúdo fica na largura do site. A prévia agora é 1600 px, com desfoque leve e um pouco mais escura no próprio arquivo (o app vira ambiente, sem custo no celular), e só pega trecho com o app em ação.
- **Sino é uma lista suspensa** presa ao botão (no celular, na largura toda logo abaixo do topo), não uma janela no meio da tela.

## Tomadas em 23/10/2026 (venda do mini curso, certificado e pontas soltas)

- **Página de venda própria** (`worker/render/venda.js`, `public/estatico/venda.css` e `venda.js`), no lugar da landing por blocos do site: quem chega vem da DM do Instagram, no celular. Página leve (sem o `site.js`), vídeo que só carrega no toque, botão de compra preso embaixo (some quando outro botão está na tela), preço à vista, parcelado e no Pix calculados da oferta. Os blocos continuam editáveis no painel (Cursos > Landing pages), com tipos novos: linha do tempo do dia, cartões (carrossel de arrastar no celular), para quem é, aulas e kit (do banco), quem ensina, garantia. Depoimentos aprovados entram sozinhos.
- **Texto da página no jeito do Filipe e honesto sobre o que precisa** (plano pago do Claude, computador, 3 a 4 horas para montar), para vender rápido sem gerar reembolso.
- **Funil ligado:** landing `posts-automaticos` publicada, produto e oferta ativos, `config.oferta` apontando para ela. A DM do Comenta X leva `/cursos/posts-automaticos?de=dm-<palavra>`.
- **Bunny aceita o site principal** (`agenciasetup.com.br` nos domínios liberados) para o vídeo do topo tocar na landing. As aulas pagas continuam só com link assinado; a página só assina aula marcada como grátis ou a VSL.
- **VSL de uns 3 minutos** feita no mesmo motor das aulas (`Curso/aulas/vsl/aula.js`, voz clonada do Filipe): promessa, problema, demonstração (estilo, radar, quadro, arte), o dia, o curso, o que precisa, preço, garantia e botão.
- **Certificado padrão Setup:** modelo escuro (preto com brilho laranja, grão, logo grande ao fundo) ou claro (papel), nome em letra cursiva, curso em destaque no degradê, selo redondo, assinatura em letra de assinatura (ou imagem) e QR. Tudo medido pela largura da folha, então a tela e o PDF saem iguais. Editável no painel (Área de membros > Certificado, com prévia ao vivo) e pelo conector (`area_certificado`, `area_salvar_certificado`); fica em `config.certificado` e vale também para os já emitidos. Exemplo público em `curso.agenciasetup.com.br/certificado/exemplo`.
- **E-mail nunca sai para domínio de teste** (example.com, .test, .invalid): os testes automáticos usavam esses endereços com o Resend ligado, e e-mail que volta derruba a reputação do domínio de envio. E-mails com a logo nova.
- **Descrição do produto sem o tutor de IA** enquanto a chave da API do Claude não estiver em Integrações. A chave entrou no mesmo dia (Claude Haiku 5.5) e o tutor foi testado em produção.
- **Bunny:** já tinha cartão salvo e recarga automática (US$ 10 quando o saldo cai abaixo de US$ 2); o crédito de teste é de US$ 50. Nada a fazer antes do fim do teste.
- **Order bumps:** proposta em `docs/order-bumps.md`. Criado o de acesso vitalício (R$ 19,90, com o ok do dono): a oferta do bump fica desligada para não ser comprada sozinha (o checkout carrega o bump mesmo assim), e o acesso sem prazo vence o de 1 ano na mesma compra.
- **Exemplos de estilo na página de venda** (pedido do dono): bloco `estilos` com 4 carrosséis de 3 slides, feitos pelo método do curso, para mostrar que serve a qualquer nicho. Padrão Setup (o carrossel aprovado "Esse carrossel foi criado no Claude"), advocacia no visual iOS da referência do dono (escuro, vidro, verde-limão; tema voo atrasado pela Resolução 400/2016 da ANAC, informativo e sem promessa de resultado, como pede a OAB), elegante (foto do Filipe de terno, monograma dourado, anunciando o próprio curso; refeito no mesmo dia a pedido do dono: foto nova num ambiente quente editada da foto real no Nano Banana Pro, fundo desfocado sem a pessoa dentro, "F" em Great Vibes translúcido e desfocado, nome mais alto, mais 153 créditos) e religioso (skill sacro-design; Marta e Maria, Lc 10,41-42 e Catecismo 2559, pintura nova no Magnific). No celular as capas são de arrastar; o toque abre o carrossel em tela cheia. Gasto no Magnific: 156 créditos (2 pinturas e 2 recortes).
- **Checkout no navegador estava quebrado:** o script parava ao ligar os botões Pix e cartão (`$` no lugar de `$$`), então o botão de pagar não enviava. Os testes usavam a API direto e não pegaram. Corrigido, publicado e conferido no navegador em produção (o bump soma, o cartão mostra as parcelas, o formulário envia). Teste novo pelo navegador antes de mexer no checkout.
- **Pinterest:** o app continua com "Acesso Trial pendente". Enquanto isso o portal não mostra a chave secreta nem deixa cadastrar o endereço de volta; não há o que fazer do nosso lado.
- **VSL refeita (pedido do dono: "muito estática, ninguém vê"):** 1min43 em vez de 3 min. Nos 3 primeiros segundos o notebook abre e o post do dia já está na tela; depois os 4 estilos em celulares, o Flávio (personagem de exemplo, antes e depois), o radar, a escrita e a aprovação, a arte montando em camadas 3D, o post com curtidas e comentários, o curso e a oferta com o botão verde. Voz 12% mais rápida (atempo do ffmpeg), pausas curtas, música de fundo (Lyria 3 Pro) que abaixa quando a voz fala e efeitos novos (notebook, notificação, impacto). O motor das aulas ganhou cenas próprias por vídeo (`tipos` no `aula.js`, CSS em `aulas/<id>/estilo.css`), `deriva` (a cena aproxima devagar) e `voz` (ritmo da narração). A VSL antiga ficou em `_local/vsl-antiga/`. Gasto no Magnific: 300 créditos (Flávio em 3D, de frente, luz roxa e luz amarela) e 185 (música e 3 efeitos).
- **Página de venda com movimento, depois limpa:** GSAP + ScrollTrigger servidos do próprio site (`public/estatico/vendor/`), sempre como melhoria (sem JS ou com menos movimento, tudo aparece). Blocos novos: `historia` (Flávio antes e depois com a chave "Modo automático"), `simulacao` (conversa do Claude, arte em camadas só no computador, post no Instagram) e `marquee` (fora da página por enquanto), com formulários no painel. Botão de compra verde e "Vitalício por + R$ 19,90", que leva ao checkout já marcado (`?com=acesso-vitalicio`). O dono achou a primeira versão poluída; a que está no ar tem fundo preto na maior parte, papel só no Flávio e nos estilos, amarelo só na oferta, sem fitas, meio-tom, grão nem cartões tortos. A notificação da simulação não fala em DM automática (isso não faz parte do curso). Transição de CSS em `transform` trava a animação do GSAP: para efeito de clique e hover, usar `scale` e `translate`.
- **Página de venda no meio-termo (segundo retorno do dono: "infantil e poluída; muita gente séria vem, muito designer vem"):** cores lisas no lugar dos degradês com brilho (título, preço, números), botões sem brilho correndo nem pulso, linha acima dos títulos em serifa itálica (sem a letra de máquina com tracinho, que parecia "cara de IA"), topo sem o selo "Mini curso" e entrando de uma vez com calma, oferta no preto com o cartão contornado de amarelo (sem fundo amarelo e sem o carimbo girando), uma faixa reta amarela entre "Quem ensina" e a oferta, margem lateral de 24 px no celular. A foto do autor fica dentro do círculo (só a cabeça e o celular passam por cima), escondendo o corte reto de baixo e o braço cortado; nada de paralaxe nela, porque o recorte se mexe junto.
- **Página de venda como landing moderna (terceiro retorno: "ficou sem degradê, sem vida, quadrado, muito estilo Setup"; referências de landing escura com leque de cartões, cartões de vidro e parede curva de imagens):** títulos em Inter Tight com degradê prateado e o destaque em Instrument Serif itálica com degradê quente; corpo em Inter; fundo escuro com grade sutil e brilhos; menu em pílula; topo com texto à esquerda e vídeo à direita e, embaixo, um leque com as capas dos estilos e o cartão "O seu estilo", cortado por uma faixa de nichos em degradê; estilos numa parede curva (uma coluna por estilo, o toque abre o carrossel); oferta com borda em degradê girando devagar; rolagem suave com Lenis 1.3.26 (em `public/estatico/vendor/`). Lição: o GSAP reescreve a transformação de quem ele anima e zera `translate`/`rotate`/`scale` do CSS; a posição fica num elemento e a animação num filho (`.v-carta` e `.v-carta-in`), e efeito de hover não usa `translate` em quem o GSAP mexe.
- **Página inicial no mesmo espírito, sem virar página de venda:** continua o centro de recursos grátis (busca, atalhos, mais baixados, assuntos). Ganhou os títulos do site (`.t-display`, `.t-titulo`) em Inter Tight com degradê prateado e o destaque em degradê quente, a grade no fundo do herói, um leque com os posts de exemplo (Religioso, Advocacia, Padrão Setup, Elegante e "O seu estilo") com a chamada "Posts feitos pelo Claude, sem cara de IA" levando ao mini curso, e a faixa com as ferramentas de IA correndo. Rolagem suave (Lenis) em todas as páginas do site; a caixa de busca e a galeria têm `data-lenis-prevent` para rolar por dentro. Sem GSAP no site (o leque abre com CSS quando aparece), para o site seguir leve.

## Tomadas em 24/10/2026 (Comenta X na hora)

- **O relógio funcionava, só demorava:** o primeiro TESTEDM do dono entrou logo depois de uma leitura e a DM saiu na seguinte (até 10 minutos), sem erro. A DM para quem não tem função no app sai com o acesso padrão: não precisa de revisão da Meta.
- **Aviso na hora, como no Olhar de Fé (pedido do dono):** a Meta avisa cada comentário novo em `/api/redes/meta/webhook` e a resposta sai em segundos. O endereço só aceita aviso assinado com a chave secreta do app (sem assinatura, recusa) e o token de verificação sai da `CRIPTO_CHAVE`, sem segredo novo. O comentário passa pela mesma regra do relógio (`registrarComentarios` em `gatilhos.js`) e entra uma vez só na fila, então o relógio continua como reserva sem mandar DM em dobro.
- **Inscrição por script** (`node scripts/meta-webhook.mjs`), não pelo painel da Meta: inscreve o app no objeto `instagram` (comentários e mensagens) e liga os avisos na conta conectada. Reconectou o Instagram, roda de novo.
- **Comentário do público na hora depende do Acesso Avançado:** o teste do painel da Meta chega e é lido certo, mas a Meta só manda os comentários de verdade com Acesso Avançado de `instagram_business_manage_comments` ("Advanced Access is required for comments and live_comments notifications"). Isso pede a análise do app, que é um pedido da empresa: fica com o dono (roteiro em `docs/meta-app.md`). Enquanto isso, o relógio responde em até 10 minutos, como fez com o TESTEDM.
- **Registro só do tipo do aviso** no Worker (rede, campo, quantos comentários, quantos foram para a fila), sem texto nem nome, para conferir com `wrangler tail`.

## Tomadas em 24/10/2026 (Comenta X no estilo do ManyChat)

Pedido do dono: "quero todo aquele esquema de automação" do Olhar de Fé, "ao gerar o post já prepara a automação estilo ManyChat, com link, botão, bem humano, primeiro nome, link com UTM, respostas personalizadas, não robóticas".

- **Evolui a palavra que já existia** (`gatilhos`) em vez de criar tabelas novas: a peça, o painel, o conector e o relógio já falavam com ela. A mensagem antiga virou a versão "a" (migration 016, só acrescenta colunas).
- **Versões da mensagem e a que ganha:** cada palavra tem até 8 versões; cada uma recebe 25 envios e depois a amostragem de Thompson manda mais a que traz cliques e seguidores, sem parar de testar as outras (igual ao Olhar de Fé). O painel mostra a chance de cada uma ser a melhor só depois de 10 envios em cada.
- **Link num botão, com link curto e UTM por versão** (`/l/<palavra>-<versão>-<post>`: source a rede, medium dm, campaign a palavra, content palavra e versão, term o post). O clique conta na versão e a visita leva a origem até a venda. O mini curso vai como segundo botão, com a palavra como campanha. Se a Meta recusar o botão, vai o texto com os links.
- **Três modos:** direto (o material no primeiro direct), seguir (o primeiro direct pede para seguir, com o botão "Já segui 🦎"; o material só vai para quem segue) e pergunta ("Quero o link 🦎"). Padrão das peças novas: direto, até o "seguir" ser conferido de ponta a ponta com um toque de verdade.
- **Primeiro nome:** a Meta só mostra o perfil depois que a pessoa toca num botão ou escreve no direct. Por isso o nome entra na mensagem que vai com o material (modos seguir e pergunta); sem nome, o `{usuario}` some junto com a vírgula. Nunca o @.
- **Resposta no comentário escrita pela IA** (Claude Haiku, pela chave de Integrações) para cada pessoa, reagindo ao que ela escreveu, curta e sem link; o comentário entra como dado. Se a IA falhar ou fugir das regras (link, @, travessão, longa), vai uma das respostas da versão. Testado com um comentário pedindo para "ignorar as instruções": respondeu normal.
- **As versões quem escreve é o Claude ao criar o post** (conector e skill do carrossel). Para palavra criada no painel, o botão "Escrever com IA" pede ao Claude (Sonnet) duas versões, que a pessoa revisa antes de salvar. O Sonnet 5.5 não aceita `tool_choice` forçado: o pedido diz para usar a ferramenta e `strict` garante o formato.
- **Um direct por pessoa em cada post**, garantido por índice no banco (como no Olhar de Fé). Contas de teste (Comenta X > Ajustes) recebem de novo. Limite de 200 directs por hora (ajustável), para proteger a conta.
- **Palavra mandada no direct** (de um story ou Reels) também entrega o material, uma vez por pessoa a cada 24 horas.
- **O que depende da Meta:** os toques no botão chegam pelo aviso `messaging_postbacks` (inscrito em 24/10/2026).

## Tomadas em 24/10/2026 (painel organizado, Novo post e Resultados)

Pedido do dono: "eu mesmo não posso postar? Achei que teria o painel de agendar post, escolher as plataformas, legenda, formato... com todas as funções do Instagram", "ta muito confuso o painel" e "quero ver por post as automações, as métricas organizadas, qual vendeu mais, qual engajou melhor, qual foi uma merda".

- **Menu pelo que a pessoa faz:** Hoje (Início), Redes sociais (Posts e agenda, Resultados, Automações, Em alta, Contas conectadas), Site, Vendas, Alunos e Sistema. Sem o selo "Novo" em tudo. Botão "Novo post" fixo no topo do menu. No celular, as abas de baixo são Início, Posts, Resultados e Automação. Os endereços antigos (`/fila`, `/desempenho`) continuam abrindo.
- **Novo post** (`/posts/novo`): redes escolhidas em cartões (com a conta de cada uma), formato, mídias (arrasta e solta, ordem, texto alternativo; PNG e WebP viram JPEG no navegador, porque o Instagram só aceita JPEG pela API), legenda com contador e texto próprio por rede, opções do Instagram (colaboradores, primeiro comentário, localização, capa e áudio do Reels, mostrar no feed, Reels de teste), o Comenta X com as versões e o "Escrever com IA", e rascunho, agendar ou publicar agora. Prévia do post no Instagram ao lado. Cada rede vira uma peça, todas no mesmo `grupo`. Agendar e publicar passam pela validação de cada rede antes de criar.
- **Publicação no Instagram com as opções:** opção que o Instagram recusar (conta sem a função, parâmetro novo) sai do post com aviso na auditoria, em vez de derrubar o post. O primeiro comentário sai do perfil logo depois. Carrossel aceita vídeo (cada vídeo processa antes de montar o carrossel).
- **Agenda em calendário:** o mês com o que está agendado, o que saiu pelo painel e o que foi postado direto no app (para ver a conta inteira), e os rascunhos sem data. No celular, vira lista por dia.
- **Resultados por post** (`/resultados`): resumo do período, destaques (mais engajou, mais vendeu, mais comentado, mais directs, foi mal) e a tabela de todos os posts, ordenável por qualquer número e filtrável por "acima da média" (1,5 vez a mediana do período ou mais), "na média" e "abaixo" (60% ou menos). O "foi mal" ignora post sem curtida nem comentário (número que não chegou) e post com menos de 2 dias. O antigo Desempenho virou a aba "O que funciona".
- **Venda por post:** a venda vai para o post do último toque: o link curto do Comenta X (que leva o post em `utm_term`) ou, pela palavra do direct, o post mais recente com aquela palavra antes da compra. Só Editor e Administrador veem valores.
- **Detalhe do post** (`/resultados/:id`): os números contra a mediana da época do post (120 dias antes e 30 depois: com a conta parada há meses, "os últimos 90 dias" ficavam vazios), o Comenta X por versão, as últimas respostas e as vendas.
- **Início enxuto:** atalhos para Novo post, Agenda, Resultados, Automações e Em alta; números só do que pede atenção ("posts com erro" só aparece quando há). Se a Meta não entregar no acesso padrão, os modos seguir e pergunta ficam esperando o toque; por isso o padrão continua "direto" até o teste com o dono.

## Tomadas em 24/10/2026 (capas "cinema": reprovada)

**Reprovada pelo dono no mesmo dia:** "ficou horrível", rostos "extremamente diferentes do meu", "efeitos sem profundidade, tirou o estilo clean, tirou os desfoques, mudou fonte; antes estava melhor". Fundo com cenário atrás da headline atrapalha (Luffy); o Demon Slayer "dava pra ficar bom" com o fundo desfocado. E: "mudou o site sem permissão". O estilo volta a ser o da versão 4 (`templates/carrossel/`), consertando só o acabamento. As imagens originais do exemplo "Padrão Setup" foram restauradas no computador e só voltam ao ar com o ok dele. O registro abaixo fica como histórico do que foi feito.

O dono reprovou as 5 capas dos carrosséis novos: rosto que não era o dele (gordo, "muleque nerd", biquinho), roupa "arrumadinha" e, em todas, "recorte lixo, sombras e efeitos jogados, blur branco atrás, desfoques aleatórios". Pediu o estilo dele (camiseta amarela, boné, personagens famosos como já fez no perfil) e postura de homem.

- **Capa e chamada saem de `templates/capa-cinema/`:** a foto gerada inteira é o fundo (cena de cinema com o terço de cima limpo), o título em cima e o recorte da mesma foto por cima do título (o cabelo passa na frente sem borda). Sem desfoque, brilho, halo, sombra projetada, floreio ou selo. Entram no carrossel como slide pronto (`tipo: 'foto'` no modelo).
- **Foto do Filipe:** as 5 fotos reais como referência em toda geração, com um bloco fixo de rosto (idêntico, sem afinar nem engordar) e de corpo (academia, ombro largo); a cena é um personagem em live-action escolhido pela tese (o Professor, o caçador de demônios, o Luffy) ou o estilo dele (camiseta amarela, boné). O pedido está na skill (`foto-do-filipe.md`).
- **Os 5 carrosséis** ganharam capa, chamada e, no da arte, as etapas mostrando a capa nova sendo montada (foto, título, recorte, detalhes); no dos 4 estilos, o "da Setup" mostra as capas novas. Os rascunhos e as capas das 5 páginas de recurso foram atualizados. Os cards de dentro não tinham desfoque nem brilho e ficaram como estavam.
- **Rosto conferido lado a lado com as fotos reais** antes de mostrar: o do Demon Slayer saiu mais fino e com o cabelo preto demais e foi refeito a partir da foto de terno (a que deu o rosto mais fiel). Na capa, o "pra Social Media" subiu para a linha de cima, porque a lua clara atrás da cabeça apagava a linha de baixo.
- **Exemplo "Padrão Setup" da página de venda e do início:** saiu o carrossel antigo (com desfoque e brilho) e entrou a capa e a chamada do "vale a pena usar o Claude" (camiseta amarela e boné). O card do meio continua o "Eu não abri o Photoshop". Os arquivos antigos estão em `_backup/`.

## Tomadas em 24/10/2026 (capas: intencionalidade)

Retorno do dono sobre as capas com as selfies editadas: glow amarelo colado atrás dele "sem sentido", cinza e amarelo "sem vida", pintas que ele não tem, dedo apontando para o nada, foto fora do centro, título do prompt desalinhado e, em todas, a notificação do Claude "vaga, parece aleatória". Gostou do fundo e do contraste da do Claude.

- **Fundo liso de cor decidida** (`fundoLiso` no modelo) ou a cena desfocada da foto, e **sem halo colado na pessoa** (`assunto.brilho: false`). Automático em marrom escuro, arte em quase preto, skill em amarelo vivo (vinheta laranja, não preta).
- **Cada elemento ligado ao post:** a notificação ficou só no automático, e é do Instagram ("Seu post de hoje foi publicado", 18h, igual ao slide 5). Na skill, o dedo aponta para o arquivo `social-media.skill`; no Claude, a janela do Claude desfocada no fundo com a pergunta do post; no prompt, os 4 carrosséis de verdade em leque na mão aberta e o prompt embaixo.
- **Fotos novas** no site do Magnific (ilimitado, sem gastar crédito do conector) para a skill (sem as pintas) e o prompt (apresentando, sem riso), recortadas de graça na aba Edit > Background.
- As chamadas seguem o fundo e a foto da capa. Os 5 voltaram ao painel como rascunho (peças novas, palavras desligadas).
- **Agenda (ok do dono: "agende os conteúdos a partir do dia 26, 1 por dia"):** às 17h, porque a tarde é a melhor faixa do perfil (nota 0,87 contra 0,63 da noite e 0,51 da manhã, em 1.500 posts). A ordem abre com a promessa do mini curso (o automático), passa pela objeção (vale a pena?), pelo material grátis (skill), pela arte e fecha na sexta com o tema que mais engaja no perfil (prompt) e com as capas da semana já vistas no feed (o slide "o da Setup" mostra as três primeiras).
- **Aprovadas pelo dono ("Perfeito!").** Viraram o gabarito de capa: `templates/carrossel/referencias/capas/aprovada-*.webp`, com a receita na skill (`capa-intencional.md` e `foto-do-filipe.md`). A aprovação é das artes; publicar no Instagram e trocar as capas das páginas de recurso no ar continuam esperando o ok dele para cada um.

## Tomadas em 25/10/2026 (recorte e tratamento de imagem no computador)

Pedido do dono: parar de gastar crédito do Magnific com recorte e ter tratamento pontual de graça, olhando o que o Calango Studio (`agenciasetup/Calango.studio`) faz.

- **Recorte:** `scripts/recortar.mjs`, com BiRefNet (MIT) na RTX 3070 e refino de borda. Comparado com o Magnific nas fotos do Filipe, empatou ou ganhou (`_local/recorte/comparacao.jpg`). O BRIA RMBG 2.0 ficou de fora por ser não comercial.
- **Tratamento pontual:** `scripts/tratar.mjs`, com o IOPaint e o LaMa para apagar (Apache 2.0), o Real-ESRGAN para ampliar (BSD) e o OpenCV para luz e cor. O editor com pincel abre no computador (`tratar.mjs editor`). As funções pagas do Calango Studio (preencher e ampliar por API) foram trocadas por esses modelos abertos.
- **Sem restauração de rosto nem alisar pele:** o CodeFormer é não comercial, o GFPGAN muda o rosto, e o dono já reprovou o realce de pele.
- **Sem gerar as fotos dele no computador:** manter o rosto exigiria pesos não comerciais (insightface) ou treinar no SDXL, com qualidade bem abaixo. O site do Magnific segue como gerador, de graça.
- **Primeiro uso:** o piercing a mais da foto do Claude saiu (ele tem um só). Capa, chamada e o slide 3 do "4 carrosséis" foram refeitos e trocados nos posts agendados e nas páginas de recurso. A foto original está em `_local/tratar/filipe-v6-vale-original.png`.

## Tomadas em 26/10/2026 (segundo lote)

Retorno do dono sobre as 3 capas novas: a marrom "não parece eu", a headline do "menos usa IA" confusa e os elementos sem sentido; e a regra nova "não precisa ser sempre eu".

- **A capa não precisa ter o Filipe** (anotado na skill, `capa-intencional.md`). Quando tem, o elemento ao lado dele tem que se entender sem explicação.
- **Esculacho com o perfil dele de verdade atrás:** bloco novo `perfil` no modelo (mockup do Instagram no modo escuro, com avatar, números, bio, destaques e grade dos posts recentes, tirados do próprio perfil). O dado do slide 3 foi corrigido para "849 posts à noite" (nota 0,87 contra 0,63; a "manhã" tinha só 117 posts).
- **Headline com o número:** "Só 1 em cada 3 criativos usa IA no trabalho", com o gráfico deitado (criativos 32% contra todo mundo 62%) e o país dito no post, porque os números são dos EUA.
- **Arte de referência entra colada, não gerada:** o Magnific não reproduz uma arte específica na mão da pessoa. A foto foi gerada com um cartão em branco e a arte do GPT de verdade foi colada em perspectiva por cima (o polegar fica na frente). O piercing a mais saiu com `tratar.mjs apagar`.
- **Carrossel esperava pouco para publicar:** o post das 17h de 26/10 foi recusado pelo Instagram com "The media is not ready to be published". O código criava o álbum e publicava no mesmo segundo, e só esperava o processamento no caso de vídeo. Agora espera o álbum ficar pronto (`esperarPronto` em `instagram.js`). Publicado com o ok do dono: o deploy levou só essa mudança. O post saiu às 17h11 (soltei pelo `publicar_peca_agora`) e a palavra PAUTA ligou.
- **Comenta X na hora, igual ManyChat e Olhar de Fé (pedido do dono):**
  - **Relógio:** agora roda a cada minuto, com a fila e os comentários dos posts dos últimos 2 dias. O completo continua a cada 10 minutos.
  - **Aviso da Meta:** o comentário chega na hora pela Página (login do Facebook, acesso padrão), como no Olhar de Fé.
  - **Acesso Avançado:** não foi pedido. Exigiria virar "Provedor de Tecnologia", que não tem volta.
  - **No post PAUTA:** 15 directs saíram em minutos.
  - **Lição:** trocar o cron no deploy leva alguns minutos para valer na Cloudflare, e nesse intervalo o relógio não rodou.
- **Tela Suporte (pedido do dono: "identificar GARGALO" e agir antes do problema):**
  - **Onde fica:** Alunos > Suporte (`admin/src/telas/Suporte.tsx`, ação `verSuporte` em `worker/lib/acoes-suporte.js`, permissão `suporte.ver`, ferramenta `area_suporte` no conector).
  - **O que mostra:** o funil da compra até a conclusão, com o maior gargalo, e a lista de quem precisa de ajuda, com o motivo e o WhatsApp com mensagem pronta por etapa. Tudo calculado no Worker, sem migration.
  - **Ainda não mostra:** e-mail aberto ou clicado (o Resend registra só o envio) e o pedido de reembolso antes de ele ser feito. Publicado com o ok do dono.
- **Rastreio do e-mail aberto e clicado na tela Suporte (ok do dono):**
  - **Como:** o envio guarda o id do Resend (`emails.resend_id`, migration `20261026000018`) e a rota `/api/resend/webhook` grava só a hora do primeiro entregue, aberto, clicado, voltou e spam (assinatura Svix, 5 minutos de tolerância, sem guardar o conteúdo). O segredo fica cifrado em Integrações > Resend.
  - **Funil:** "abriu o e-mail" e "clicou no link" entre "e-mail enviado" e "entrou". Ajuda: não abriu em 2 horas, abriu e não clicou, clicou e não entrou, voltou ou spam, cada um com a sua mensagem.
  - **E-mail de antes do rastreio:** fica como "sem dado de abertura", fora de quem parou. Nunca conta como "não abriu".
  - **Ligar no Resend:** `scripts/resend-rastreio.mjs ligar`. Precisa de uma chave de acesso total, em `RESEND_CHAVE_ADMIN` no `.env.local` ou em Integrações. A chave só de envio não muda domínio nem webhook.
  - **Ligado em 26/10/2026, com o ok do dono:**
    - O webhook está ativo, com 5 eventos.
    - O Resend agora só liga a contagem de abertura e de clique com um **subdomínio de rastreio**: pela API, o PATCH respondia 200 e não mudava nada.
    - Criei `links.envio.agenciasetup.com.br` no Resend e o CNAME na Cloudflare (`links.envio` aponta para `links2.resend-dns.com`, sem proxy). O DNS de antes está em `_backup/dns-antes-rastreio-resend-2026-10-26.json`.
    - O domínio voltou a "verified", com abertura e clique ligados. Os links dos e-mails passam por esse subdomínio.
- **Aulas no ar:** as 18 refeitas foram para o Bunny e para a área. Cada aula só troca de vídeo depois que o novo termina de converter (`bunny.mjs subir --refazer`), e só então entram a duração, as legendas e os marcadores (`area-semente.mjs --so`).
- **Asaas sem nenhum envio de cobrança** (pedido do dono em 27/10/2026: "desative tudo que gasta a mais, todos envios, não quero que o Asaas mande cobrança"):
  - Marquei `notificationDisabled` pela API em todos os 66 clientes da conta. 58 estavam com envio ligado (e-mail, SMS, WhatsApp, voz e Correios) e agora são 0.
  - O site já criava cada cliente novo com envio desligado (`worker/pagamento/asaas.js`). Quem avisa é o nosso e-mail.
  - A conta é dividida com o Veritas Dei. Cliente criado por outro sistema ou à mão pode nascer com envio ligado de novo. Para conferir e desligar: `node scripts/asaas-notificacoes.mjs`, que mostra quantos estão ligados, e `--desligar`, que desliga todos.
- **Agenda (ok do dono: "publique os 2 materiais novos no site e agende os 3 carrosséis"):** 31/10 esculacho, 01/11 quem cria usa menos IA e 02/11 texto com cara de IA, às 17h, seguindo os 5 do primeiro lote. Os 2 materiais novos foram publicados antes de agendar, para a palavra poder ligar quando o post sair. O FUTURO entrega as 10 tarefas, que já estavam no ar.

## Tomadas em 26/10/2026 (complemento "Vídeos com Claude", R$ 29,90)

- **Curso, produto e oferta** pelo `scripts/area-semente-videos.mjs` (lê `Curso-Videos/`): curso em rascunho (roxo, 2 módulos, 7 aulas), produto e oferta de R$ 29,90 desligados, kit no bucket `curso`. Rodar de novo não duplica e não mexe no que já existe (só completa o que falta na oferta).
- **Etiqueta e bump moram na oferta nova** (`checkout.etiqueta` e `checkout.bump_em`), não em `ofertas_bumps`: o código antigo mostra todo bump da tabela mesmo com a oferta desligada. Os dois só aparecem com a oferta ligada. No computador, `OFERTAS_LIGADAS` no `.dev.vars` liga na memória para testar.
- **Etiqueta "✨ Vídeo e voz gerados com IA | Aprender"** em cima do vídeo das aulas de posts (exceção à regra "nunca por cima do vídeo": só abre quando a pessoa toca). Painel pequeno no computador, folha no celular, o vídeo da aula pausa. Quem tem o curso vê "Ir para o curso". Botão roxo: o laranja da tela é a ação da aula.
- **Compra pelo app:** não existe compra com um clique (Fase D, cartão salvo, não feita). O botão leva ao checkout do curso novo com e-mail e nome preenchidos. Os dois vão depois do `#` (não chegam ao servidor) e o checkout tira do endereço antes do Pixel e do Google carregarem.

## Tomadas em 27/10/2026 (compra de quem mora fora do Brasil, pronta e desligada)

- **Pedido do dono:** quem mora em Portugal e em outros países compra sem CPF. Fica pronto e **desligado até o Asaas liberar "Pagadores estrangeiros"** na conta (protocolo 1921730, até 4 dias úteis). A conta é a mesma do Veritas Dei.
- **Regras do Asaas para pagador estrangeiro** (atendimento): só cartão internacional de crédito ou débito, só à vista (sem parcelas, boleto, Pix ou link de pagamento), cobrança avulsa pela API. Documentação: `foreignCustomer: true` no cliente; "em produção, o recurso depende de liberação para a conta".
- **Chave:** `config.asaas.estrangeiros`, em Área de membros > Pagamento (só Administrador, com auditoria). Desligada, o checkout é o de sempre. No computador, `ESTRANGEIROS=1` no `.dev.vars` liga na memória.
- **Checkout:** link "Moro fora do Brasil / não tenho CPF": país (Portugal primeiro, `worker/lib/paises.js`), celular com o código do país, só cartão à vista, valor em reais. O order bump continua. Sem upsell de Pix depois da compra.
- **Dados:** `pedidos.pagador` (migration 19) guarda `{ estrangeiro, pais, pais_nome, ddi }`. O celular de fora fica em `alunos.celular` com "+" e o código do país; o "+" é o que separa os dois no resto do sistema (WhatsApp do Suporte sem o 55, Meta, app do aluno sem CPF).
- **Em aberto:** o que vai no `cpfCnpj` do cliente estrangeiro. Por ora vai omitido, e o celular também não vai ao Asaas. Ponto único para ajustar: `corpoClienteEstrangeiro` em `worker/pagamento/asaas.js`. Antes de ligar, testar no sandbox com "Pagadores estrangeiros" habilitado.

## Tomadas em 27/10/2026 (conquista dos 7 dias e o bônus "Modelos prontos")

- **Pedido do dono:** menos reembolso (a garantia é de 7 dias). Uma barra de 7 partes, visível desde o primeiro dia, que enche uma parte por dia e no fim abre os modelos prontos e o "Solicitar certificado".
- **Contagem:** o dia da compra paga (ou da liberação da matrícula, `matriculas.inicio`) é o dia 1, no fuso de Brasília; abre no dia N (7). Curso dado como bônus (`origem` bonus ou equipe) e a equipe: já liberado. Código em `worker/lib/conquista.js`.
- **Sem migration:** a liberação por dias do banco é só de módulo (`modulos.liberacao`), e o bônus é um arquivo. A regra fica em `config.conquista` (`ligada`, `dias` pelo painel; `bonus` pelo `scripts/area-bonus.mjs`, com o id do arquivo e as prévias).
- **Certificado:** com a conquista ligada, não sai sozinho antes do dia N; a partir dele sai sozinho ao chegar nos 70% ou pelo botão "Solicitar certificado" (`POST /api/aluno/cursos/:slug/certificado`). Desligada: só os 70%, como antes.
- **O pacote:** 4 estilos editáveis (Padrão Setup, Advocacia, Elegante, Religioso), sem foto do Filipe e sem marca (fontes em `templates/bonus/`). O Religioso virou HTML (antes era Python). Zip no bucket `curso`, prévias em `midia`.
- **Atenção:** com 7, o bônus abre no último dia da garantia. Para abrir só depois dela, ponha 8 no painel.
- **Mudou em 28/10/2026, a pedido do dono:** 8 dias. O bônus abre depois da garantia.

## Tomadas em 28/10/2026 ("Vídeos com Claude" v3 e v4, e o curso no Drive)

- **Escopo:** o dono reprovou o curso só de motion: "não apenas esses vídeos simples". A versão 3 ensina a editar vídeo gravado (ver, cortar, legendar, reenquadrar, zoom, cor, música, fundo, b-roll, cortes), a economizar tokens (projeto, pastas, `PROJETO.md`, ler a folha de quadros e a fala em vez de abrir o vídeo) e a aprender com o YouTube e o Instagram pelo Claude in Chrome, além do motion. São 14 aulas em 5 módulos.
- **Ferramentas:** ffmpeg e Whisper no kit, com rosto e fundo por IA como instalação opcional. Dos 8 repositórios do post de referência (gut1n), AutoSubs e AutoClip valem; OpenChatCut e Herk Edit Kit ficam como opção; BackgroundRemover, StoryToolkitAI e NarratoAI são só citados; LatentSync fica fora (placa grande e risco de deepfake).
- **Claude in Chrome no curso:** só leitura. Nada de login, curtir, seguir, comentar ou baixar. Os prints são estudo e não entram em vídeo. Os passos de ligar seguem a documentação oficial (`claude --chrome`, `/chrome`, "Enabled by default", "Install extension").
- **Tamanho das aulas (v4):** o dono pediu de 5 a 6 minutos ("Videos de 2 minutos ja servem?"). Viraram 12 aulas, aprovadas em roteiro, geradas em 3 lotes. A voz fica a 1,14x, como no curso de posts. O tempo a mais vem de ensino: segundo exemplo, segundo erro, o porquê de cada passo e uma dica de tokens. Não vem de deixar a voz mais lenta. Medida: a voz fala a uns 220 palavras por minuto, então uma aula sem trecho reaproveitado leva de 1.100 a 1.250 palavras.
- **Drive:** o curso de posts está organizado no Drive do Erick (conta e pasta em `_local/contas.md`, fora do Git). São 82 arquivos, com legendas `.srt` (`scripts/legendas-srt.mjs`). A cópia antiga de 23/10 foi para a lixeira com o ok do dono.

## Tomadas em 29/10/2026 ("Vídeos com Claude" v4 no ar)

- **Troca feita com o ok do dono ("Pode trocar"),** antes de ele assistir às aulas. O Bunny e o curso estão na v4: 5 módulos, 12 aulas, 67 minutos, kit novo na aula 1. Os vídeos antigos continuam no Bunny, sem aula. Os ids e os textos de antes estão em `Curso-Videos/TROCA-V4.md`.
- **Textos de venda:** foram trocados junto com o curso, para a venda não prometer o que o curso não tem. Mudaram a capa ("12 aulas"), a lista "inclui", o bump no checkout de posts, e a chamada e a descrição do produto. Ficaram como estavam: o preço, a etiqueta e a mini VSL, que ainda vende só o motion.
- **Envio para o Bunny:** um vídeo de 190 MB caiu no meio ("Headers Timeout"). O `bunny.mjs` agora tenta de novo no mesmo vídeo, até 3 vezes.
- **Erro no conector e no painel:** editar um produto que já existe falhava sempre ("O banco recusou a operação"), porque `salvar` em `acoes.js` pedia a coluna `status`, que produtos e anúncios não têm. Por isso, desta vez o produto foi trocado direto no banco. A correção foi ao ar no mesmo dia, com o ok do dono, e foi conferida pelo conector.

## Tomadas em 29/10/2026 (curso de leitura "Dúvidas da Fé", amostra)

- **O que é:** um curso para ler, sem vídeo por enquanto, vendido no perfil da Raquel. Público leigo, com dificuldade de ler e de usar o navegador. A pessoa recebe o PDF no e-mail e na tela de obrigado, e tem uma área de leitura no celular.
- **Endereço:** `duvidasdafe.agenciasetup.com.br` (subdomínio, escolha do dono). **Preço:** R$ 19,90 ("quero vender MUITO"). **Order bump:** "Acesso para sempre", + R$ 14,90. **WhatsApp de ajuda:** (11) 93259-7969.
- **Conteúdo:** as 60 aulas do curso "Defesa da Fé", da Escola do Olhar de Fé, publicadas e revisadas. Elas estão nos arquivos do repositório `olhar-de-fe` (`web/escola/defesa-da-fe/`), não no Supabase. Cada aula tem umas 3.600 palavras; a versão do curso tem 3 minutos de leitura. A ordem de cada dúvida: resposta rápida, explicando com calma, na Bíblia, a Igreja ensina, "se alguém te perguntar, diga", "e se a conversa continuar?" e para guardar. As citações e os versículos saem literais da aula de origem; nada é inventado. Um revisor separado confere a doutrina antes de a dúvida ir para o curso. Os 15 temas viraram 8 capítulos (`Curso-Duvidas/curso.json`).
- **Amostra feita:** três dúvidas (irmãos de Jesus, confissão, purgatório), revisadas, com os ajustes do revisor aplicados. Modelos em `templates/duvidas/` (leitor do celular e livro A5), exportados por `node scripts/duvidas.mjs [telas|pdf]` para `_local/duvidas/`. A capa é do Magnific, gerada no site (criação `aF6JyI3fSh`); as imagens das dúvidas são as da própria Escola.
- **Vídeo preparado:** cada dúvida tem o campo `video`; vazio, não aparece.
- **Segunda rodada (pedido do dono):**
  - Assinam "Filipe e Raquel".
  - O bump "Acesso para sempre" vale para os dois: a área de leitura e as aulas em vídeo que vierem depois, sem prazo.
  - Visual: o da Escola do Olhar de Fé (`olhar-de-fe/web/fonte/portal.css`), no leitor e no livro. Papel quente, blocos claros com raio e sombra macia, títulos em serifa, texto na fonte do sistema, ouro na Bíblia e na Igreja, verde na resposta e "Para guardar" em tinta. O leitor tem tema escuro.
  - PDF clicável. No sumário, o capítulo e a dúvida levam direto. Em cada dúvida, "Voltar ao sumário" em cima e no fim, mais a próxima dúvida. A abertura de cada capítulo lista as dúvidas dele.
  - Conferido: 21 links, todos com destino na página certa.
- **As 60 dúvidas (amostra aprovada pelo dono, "Aprovado, pode seguir"):**
  - **Como foram feitas:** quatro lotes por capítulo, cada um escrito por um agente a partir das três dúvidas aprovadas. Cada lote passou por um revisor separado, que conferiu a doutrina, a fidelidade à aula, as palavras simples e o tamanho. O que o revisor achou foi aplicado só quando a aula de origem sustentava; o que a aula não sustentava foi adaptado ou deixado de fora.
  - **Exemplos de ajuste:**
    - Celibato como regra da Igreja latina, não dogma.
    - Datas discutidas ficaram com a ressalva.
    - "Crisma" não é o nome que a Bíblia usa.
    - Os limites da infalibilidade.
    - Com quem duvida de Deus, falar sem tom de acusação.
  - **Conferência automática:** `node scripts/duvidas.mjs conferir`. Ela olha:
    - os campos, o capítulo e a imagem;
    - travessão e menção a IA;
    - o tamanho;
    - se cada versículo e cada citação da Igreja estão palavra por palavra na aula de origem.

    Deu 0 erros. Os 22 avisos são objeções escritas do jeito que as pessoas falam.
  - **O livro completo:** 261 páginas, 9 MB, 368 links, todos com destino. O tamanho de cada dúvida vai de 305 a 512 palavras (mediana 439). Todas estão como `revisada`.
  - **Imagens:** o PDF usa as imagens em JPEG, e o leitor usa as WebP. Com WebP, o Chrome refazia cada imagem e o PDF chegava a 62 MB; o JPEG ele guarda como está.
- **Área de membros do Dúvidas da Fé (pedido do dono, "a área de membros é diferente, mas ela parte dali mesmo"):**
  - **Mesma base:** o mesmo Worker, banco e painel da Setup. O endereço decide a cara (`worker/lib/marcas.js`, `cursos.marca`). Em `duvidasdafe.agenciasetup.com.br`:
    - o app do aluno abre o leitor (`aluno/src/leitor/`), com início, capítulo e dúvida, PDF, "Ouvir", "Letra maior", busca e WhatsApp;
    - o checkout, o obrigado e os e-mails saem com a marca.
  - **No banco:** a aula ganhou `tipo` ("video" ou "leitura") e `corpo` (o texto da dúvida); o curso ganhou `marca`. Migration `20261029000020_curso_leitura.sql`, aplicada em 29/10/2026 com o ok do dono.
  - **Gravado:** `scripts/area-semente-duvidas.mjs` gravou o curso em rascunho, com 8 capítulos, 60 dúvidas, 61 imagens no `midia` e o PDF no bucket privado `curso`. Também criou dois produtos desligados (ficam fora da vitrine da Setup) e duas ofertas desligadas: `duvidas-da-fe` por R$ 19,90, com o bump `duvidas-da-fe-para-sempre` por R$ 14,90 em `ofertas_bumps`.
  - **Depois de pagar:**
    - o obrigado começa o download do PDF e mostra "Baixar o PDF" e "Ler no celular";
    - o e-mail sai como "Dúvidas da Fé", com o PDF anexado (o Resend busca o arquivo pelo link assinado);
    - o "Ler no celular" (`/entrar?pedido=`) vale por 30 dias, até 10 vezes por dia. No curso de leitura, o id do pedido é o segredo.
  - **Fora o que é da Setup:** o curso de leitura não ganha XP, aviso de módulo nem certificado da Setup, e não aparece no "Para conhecer" da Setup.
  - **No painel:** em Área de membros > Cursos e aulas, cada dúvida abre um editor de leitura. O curso tem os campos da área própria: endereço, nome, quem assina, WhatsApp e PDF. Vendas, Alunos e Ofertas funcionam como nos outros cursos.
  - **Conferido no computador:** `node scripts/conferir-duvidas.mjs`, 27 de 27 ok. Também conferi no navegador o obrigado, o login pelo "Ler no celular", o início, o capítulo, a dúvida (marca como lida no fim), a busca e o editor do painel (salvar sem mudar deixa o texto igual). Os dados de teste foram apagados.
  - **Token do Supabase:** o do `.env.local` tinha vencido (401). O dono mandou um novo pelo chat, e ele já está salvo no `.env.local`. Vale trocar de novo quando der, porque passou pelo chat.

## Tomadas em 29/10/2026 (posts de frase)

- **Para que servem:** ser enviados (direct, story, salvos). Não precisam do rosto do Filipe nem de "Comenta PALAVRA". O carrossel com material grátis continua na skill do carrossel.
- **Visual:** o creme ou bege dos perfis de referência foi reprovado ("fugiu MUUUUUUITO do estilo da agência"). Em todos vão a janela de cantos redondos sobre o preto e o cabeçalho "@agenciasetup | Calango". A letra é grande ("não precisa ser pequeninha"), com duas fontes: Inter Tight pesada e Instrument Serif itálica laranja. Dentro da janela, o fundo é branco, preto ou foto.
- **Frases:** cada uma passa por 7 testes (`references/filtro.md`). A frase de outro perfil nunca entra, só o formato da trend. Um print de conversa com IA só vale se a conversa for real.
- **Rotina:** 2 por dia (12h e 19h), feitos em lote e aprovados pelo dono no painel. Nada sai sem aprovação.
- **Token de gestão do Supabase:** parou em 29/10/2026 ("Invalid access token"), entre 16h e 17h. O `npm run skill` e o `bunny.mjs` passaram a gravar pela chave secreta. Ainda dependem do token (`SUPABASE_ACCESS_TOKEN` no `.env.local`) as migrations e os scripts que usam `sql`. Se o dono trocou o token, falta pôr o novo no `.env.local`.

## Tomadas em 29/10/2026 (Dúvidas da Fé: página de venda, leitor no computador e ajudante de IA)

- **Página de venda** (pedido do dono: "bonita, mas com a identidade clara e fácil de vender, pro público leigo, católico"):
  - Fica na raiz do endereço do curso (`duvidasdafe.agenciasetup.com.br/`). O leitor passou para `/ler`, e quem já entrou vai direto para lá.
  - É uma landing page como as outras (slug `duvidas-da-fe`, em rascunho), com os blocos editáveis no painel em Cursos > Landing pages. O desenho é próprio (`worker/render/venda-leitura.js`, `public/estatico/venda-leitura.css`), no visual da Escola.
  - Os blocos: as perguntas que a pessoa já ouviu, uma dúvida de exemplo, o livro e o celular, os 8 capítulos, para quem é, Filipe e Raquel, preço com o "para sempre", garantia e perguntas.
  - Em rascunho, ela só aparece no computador.
- **Leitor no computador** (o dono achou "PÉSSIMO a área de membros em web"):
  - A partir de 1000 px, o leitor ganha um menu ao lado com Início, Tirar uma dúvida, o progresso e os capítulos (com lidas e o atual marcado). Os capítulos rolam dentro do menu; o PDF e o WhatsApp ficam sempre à vista embaixo, inclusive num notebook de 768 px de altura.
  - O início fica em duas colunas, com a capa ao lado do "Olá" e os capítulos em grade. A leitura fica numa coluna de 760 px.
  - No celular, nada mudou.
- **Ajudante de IA** (pedido do dono: "gastasse QUASE NADA", que "busque e responda as dúvidas do que já tem ali" e leia print, porque "as pessoas normalmente usam isso pra responder comentários"):
  - A tela "Tirar uma dúvida" (`/perguntar`) tem o campo da pergunta e o botão "Anexar print". A resposta vem com "Copiar a resposta pronta", "Mandar" e os links das dúvidas do livro. Para chegar nela, há um cartão no início, outro no fim de cada dúvida e o item do menu.
  - **Como gasta pouco** (`worker/lib/tutor-leitura.js`):
    - o Worker acha as 3 dúvidas mais parecidas por palavras, de graça, e manda só elas e a lista dos 60 títulos;
    - responde o Claude Haiku 5.5, sem raciocínio estendido e com até 800 tokens;
    - o print é reduzido no celular (1200 px, JPEG) e lido numa chamada curta antes;
    - custo: perto de US$ 0,001 por pergunta, uns R$ 3 a cada mil perguntas (um pouco mais com print).
  - **Regras do texto:**
    - responde só com o que está no livro, sem inventar citação;
    - para comentário ou print, começa a sugestão com "Você pode responder assim:";
    - termina com a dúvida para ler;
    - nunca usa travessão.
  - **Limites:** usa a mesma chave e os mesmos limites do tutor da Setup (Integrações > Claude): 15 perguntas por dia por aluno, o teto do mês e o liga e desliga.
  - **No painel:** as perguntas entram nos números do tutor como "Ajudante · Dúvidas da Fé".
  - **A chave do chat:** a chave da Anthropic que o dono mandou pelo chat não foi instalada. O dono permitiu usar a do tutor ("ou use a mesma do tutor da agência e apague essa"); falta ele revogar a do chat no console da Anthropic.
  - **Só funciona no ar:** no computador, a ajudante fica desligada, porque o local não lê as Integrações. As telas foram conferidas com uma resposta simulada no navegador, sem gastar nada.
- **Conferido no computador:** `node scripts/conferir-duvidas.mjs`, 29 de 29 ok (inclui o estado da ajudante e o bloqueio sem login). Tirei fotos do leitor no computador (1280 e 1366 × 768) e no celular. Os dados de teste foram apagados.
- **Publicado em 29/10/2026, com o ok do dono ("Pode publicar"):**
  - Deploy da versão `757d4337`.
  - A página de venda foi publicada pelo painel. O curso continua em rascunho e a oferta desligada.
  - Conferido no ar:
    - a venda abre na raiz do endereço do curso e o leitor abre em `/ler`, já com o menu do computador e a ajudante;
    - `agenciasetup.com.br/cursos` e o mapa do site não mostram o Dúvidas da Fé, e `/cursos/duvidas-da-fe` leva ao endereço do curso;
    - a ajudante não abre sem entrar.
- **Ajudante testada no ar** com um comprador de teste (apagado depois):
  - Pergunta escrita ("Pra que confessar com o padre..."): respondeu em 2,9 s, indicou a 6.2 e custou US$ 0,00074 (5.738 tokens de entrada).
  - Print de um comentário inventado ("vocês adoram Maria"): leu o print, deu a resposta pronta e a dúvida para ler, em 4,2 s, por US$ 0,00087.
- **"Aparece na lista de cursos"** (pedido do dono: "não quero que esse curso apareça no agenciasetup.com.br/cursos", "é bom poder limitar o que aparece ou não"):
  - Cada landing page tem esse interruptor no painel, no grupo "Onde aparece". Ele fica gravado em `seo.vitrine`; sem valor, a página aparece.
  - Desligado, a página sai da lista de cursos e do mapa do site, mas o link continua no ar.
  - Na lista de landing pages do painel aparece "Fora da lista de cursos", e o conector também conhece o campo.
  - Ele substitui a regra fixa que escondia curso com marca própria. O Dúvidas da Fé está desligado, e a semente (`area-semente-duvidas.mjs`) já cria desligado.

## Tomadas em 29/10/2026 (e-mail do domínio e campanha para a lista de alunos)

- **O e-mail do domínio saiu do Google** (pedido do dono: "quero tirar do google", "100% free"). O teste para `contato@agenciasetup.com.br` voltou com "550 5.1.1: a conta não existe" no Google, e esse endereço é o de resposta dos e-mails do curso. Agora é o **Email Routing da Cloudflare**, grátis:
  - `contato@` e qualquer outro endereço do domínio repassam para `equipesetup01@gmail.com` (destino verificado). O repasse geral evita perder e-mail de alguma caixa antiga.
  - MX: saiu o `SMTP.GOOGLE.COM`, entraram `route1`, `route2` e `route3.mx.cloudflare.net`. Entrou o DKIM do repasse (`cf2024-1._domainkey`).
  - SPF: era `v=spf1 a mx include:websitewelcome.com ~all`, já no limite de 10 consultas de DNS. Agora é `v=spf1 include:_spf.mx.cloudflare.net include:websitewelcome.com ~all` (9 consultas). O `a` e o `mx` não serviam mais.
  - Ficaram iguais: `mailsg` (SendGrid), `mail`, `m1._domainkey`, DMARC e as verificações do Google e do Facebook. Backup antes da troca em `_backup/dns-antes-email-routing-2026-10-29.json`.
  - Conferido: a Resend entregou um teste a outro endereço do domínio (aceito pela Cloudflare). A Resend bloqueou o `contato@` depois da primeira devolução ("suppressed"); isso só impede a Resend de mandar *para* ele, não as respostas dos alunos.
- **Lista única de alunos** em `Leads Exportados/` (dados pessoais, fora do site): 6 exports da área de membros antiga e o CRM (Clint, 11/11/2025), sem repetidos, 3.609 pessoas. Do CRM entrou quem tem tag de produto pago e quem tem "Operação Designer" (o dono confirmou que é aluno).
- **Campanha do Posts automáticos por e-mail** (`templates/email-venda/`): 3 e-mails de venda (R$ 39,90, pagamento único), botão logo no topo, UTM em todos os links (`utm_campaign=lista-alunos-posts-automaticos`, `utm_content` por botão). Sai em Broadcast da Resend **dentro do plano grátis com 30% de folga** (pedido do dono): lotes de 700 contatos, um a cada 30 dias, dos compradores mais recentes para os mais antigos; a cota transacional (acesso e código) fica livre. "100% automático" ficou de fora do texto porque o curso pede aprovação de cada post. Visual dos e-mails no estilo da página de venda (fundo escuro, itálico âmbar, botão verde), pedido do dono. Lote 1 (700 compradores mais recentes): e-mail 1 saiu em 29/10/2026; o 2 e o 3 estão agendados na Resend para 31/10 e 02/11, às 9h. O lote 2 pode ser montado a partir de 28/11 (`node templates/email-venda/disparo.mjs situacao`).

## Tomadas em 29/10/2026 (Dúvidas da Fé: visual novo)

O dono achou a primeira versão feia: área de membros "TA FEIO" perto da da Setup, página de venda "muito texto, confuso de ler, tudo preto e branco, nem botão verde tem" e a capa "horrorosa". Pediu "um meio termo... uma página bem pensada, bonita e clean".

- **A capa nova** manda nas cores de tudo:
  - É feita em código (`templates/duvidas/capa.html`, gerada por `node scripts/duvidas.mjs capa`): a Imaculada (pintura do Olhar de Fé, 1376 px) num arco dourado sobre o azul de Nossa Senhora, com "Dúvidas *da Fé*" em Playfair Display e "Filipe e Raquel".
  - Antes, comparei a Transfiguração, a Imaculada e Jesus ensinando no Templo. A Imaculada venceu: o manto azul conversa com o fundo, a luz dourada também, e é a imagem mais católica das três.
  - A mesma capa está no PDF (página 1), no checkout, na página de venda (livro em 3D) e no ícone do app (cruz dourada no azul).
- **Área de membros**, no mesmo acabamento da área da Setup:
  - fundo azul-noite, ouro nos detalhes e verde só no que se toca;
  - no início, a pintura da dúvida da vez de ponta a ponta, com "Continue de onde parou" e o botão verde;
  - os 8 capítulos viram cartões com a pintura deles (a da primeira dúvida). O capítulo abre com a pintura e a lista com miniaturas;
  - na dúvida, cada bloco tem a sua cor: resposta com traço verde, Bíblia em ouro, Igreja em azul, "diga assim" em verde e "para guardar" num cartão dourado;
  - tema escuro único (antes era o creme da Escola).
- **Página de venda:**
  - Uns 35% menos texto (675 → 442 palavras); o texto antigo ficou em `Curso-Duvidas/venda-v1.json`.
  - As seções alternam azul e creme. Todo botão de compra é verde e leva o preço.
  - A ordem: o livro em 3D, "Alguém já te perguntou?", como funciona (3 passos), uma dúvida de exemplo (só o "diga assim" e o que cada dúvida tem), os capítulos com as pinturas, a ajudante que lê print (bloco novo `ajudante`, também no painel e no conector), quem preparou, preço com o "Acesso para sempre", garantia, perguntas e a chamada final.
  - No computador, o topo fica em duas colunas.
- **Checkout:** também ficou creme claro, com a capa no resumo e o botão de pagar verde.
- **Para ver antes de trocar a página:**
  - no computador, `?lp=<slug>` mostra outra landing page na raiz do endereço da marca;
  - o rascunho `duvidas-da-fe-nova` guarda os blocos novos. Ele está fora da lista de cursos, e ninguém de fora o vê.
- **Conferido no computador:** `node scripts/conferir-duvidas.mjs` deu tudo certo. Tirei fotos do celular e do computador do leitor, da venda, do checkout, da tela de entrar e da capa do PDF. Os dados de teste foram apagados.
- **Publicado em 29/10/2026, com o ok do dono ("Pode publicar"):**
  - Deploy das versões `315eb9a2` e `f7e3c14f`. A segunda é um ajuste: no celular, o livro do topo ficou menor para o botão verde caber na primeira tela; o fim do botão fica em 657 px de 844.
  - Pelo painel: os blocos novos entraram na landing page `duvidas-da-fe` (publicada e fora da lista) e o rascunho `duvidas-da-fe-nova` foi arquivado. A capa do curso e a imagem do produto agora são `midia/duvidas-da-fe/capa-livro.jpg`.
  - `node scripts/area-semente-duvidas.mjs` subiu o PDF com a capa nova (8,6 MB). O curso continuou publicado, a oferta ligada e as dúvidas sem mudança.
- **Produtos desligados.** Os dois produtos do Dúvidas da Fé estavam ligados desde a criação, e eu tinha dito ao dono que estavam desligados.
  - Ligados, eles entrariam na vitrine da área de membros da Setup (`/vitrine`, `lib/vitrine.js`) para quem é aluno da Setup.
  - Foram desligados pelo painel. A venda não depende disso: o checkout e a página de venda olham a oferta, não o produto.
- **Conferido no ar:**
  - a venda nova, o estilo, a capa e o ícone;
  - o checkout com a capa e o leitor novo;
  - `/cursos` e o mapa do site sem o curso;
  - curso publicado, oferta ligada e produtos desligados;
  - o PDF no armazenamento, que é o novo.
- **Quem escreveu e "livro digital"**, pedido do dono: "o livro pode soar como algo físico, precisa ser CLARO em vários lugares que é DIGITAL" e "essa parte precisa falar sobre nossa história... com cara de autoridade". Publicado em 29/10/2026 com o ok do dono, na versão `5c0fd52b`. A página e o checkout foram trocados pelo painel.
  - **O bloco autor**, no curso de leitura, ganhou:
    - `itens[{nome,selo,foto,texto}]`: um cartão por pessoa, com a credencial em ouro e a inicial quando não há foto;
    - `destaque`: a frase numa faixa azul;
    - `fecho`: a linha com o selo.
    - Tudo é editável no painel, e o conector também conhece esses campos.
  - **O texto da história é o do dono**, quase sem mudança: Raquel veio da igreja evangélica pentecostal e se tornou católica; Filipe era católico de batismo e hoje é palestrante em encontros católicos; os dois namoraram sendo de igrejas diferentes.
  - **"Digital" em 9 lugares da página:**
    - a etiqueta embaixo do livro ("não é livro de papel");
    - o subtítulo;
    - o passo 2 do "como funciona";
    - a etiqueta e a linha do preço ("nada é enviado pelo correio");
    - uma pergunta nova no topo das perguntas frequentes ("É um livro de papel?");
    - a chamada final;
    - a barra de compra;
    - o título do Google.
  - **No checkout:** o subtítulo e o primeiro item da oferta também dizem que é digital.
  - **Conferido no ar:** tudo acima, sem travessão. O botão verde segue na primeira tela do celular (735 px de 844), e `/cursos` continua sem o curso.

## Tomadas em 29/10/2026 (cada app com os seus cursos)

- **O problema:** quem tinha a Setup e o Dúvidas da Fé via a aula do Dúvidas como "sua próxima aula" no app da Setup (e o contrário na busca do leitor).
- **A regra:** cada endereço mostra só os seus cursos. A API do aluno marca o pedido com o escopo do endereço (`aluno.escopo`). Em `curso.` (Setup), os cursos com marca própria (`cursos.marca`) ficam fora. No endereço da marca, entra só o curso dela. Quem filtra é `cursosDoAluno` (`worker/lib/acesso.js`), então início, curso, aula, busca, turma e comunidade seguem juntos. O painel e o relógio não têm escopo e veem tudo.
- **Quem tem os dois:** o início da Setup mostra "Cursos em outro app", com o botão para o app do curso. Abrir o curso da marca dentro da Setup mostra "Este curso abre no app dele" e o botão.
- **No ar** em 29/10/2026 com o ok do dono, versão `b72f08e5`. Conferido com um aluno de teste dos dois cursos nos dois endereços, com o `conferir-area` e com o `npm run conferir` em produção.

## Tomadas em 29/10/2026 (card de oferta nos posts de frase)

- **Todo post de frase leva um card a mais que vende o mini curso** (pedido do dono: "precisamos vender muito o curso"). Post de 1 frase vira carrossel de 3: a frase, a mesma frase no tema invertido e o card de oferta ("quer posts assim todo dia no seu perfil?", o preço e o botão laranja "Comenta POSTS"). Série: o card de oferta entra no fim. A legenda fecha com a oferta, depois do pedido de envio.
- **A palavra é POSTS**, nova (nenhuma palavra existente levava ao curso). Cada peça nasce com o seu Comenta X: modo direto, link da página de venda `/cursos/posts-automaticos`, 2 versões ("direto ao ponto" e "pela dor"). Liga sozinha quando o post sai.
- **Café em camadas, não recorte redondo (segunda rodada do dono, mesma noite):** o recorte redondo esfumado foi reprovado ("claramente um recorte"). Agora a foto sai sobre fundo preto puro e entra em duas camadas por cima do fundo da janela:
  - a luz no modo tela: o preto some e fica só a fumaça, que some antes do cabeçalho;
  - a xícara recortada no computador (BiRefNet), com sombra.

  O `templates/frase/camadas.py` monta as duas. A xícara fica maior, alinhada à esquerda com o texto, e encosta no texto de cada card (`perto: 40`), não numa altura fixa. A logo do Claude foi refeita como a faísca de raios grossos cor de terracota. A etapa 5 ganhou ruído mais forte, meio-tom e pontinhos dentro da letra. Antes de mostrar, a skill manda avaliar o acabamento: profissional ou amador.
- **Sem vazio grande na janela (pedido do dono):** na série, o espaço de cima ganha um café visto de cima. A capa leva um coração na espuma, e cada slide leva o ícone do seu assunto na espuma. As imagens saem de graça do site do Magnific, no projeto "Agência Setup · Posts de frase", e ficam em `templates/frase/imagens/cafe/`. O card de oferta ganha o notebook com a página de venda (`templates/frase/mockup-curso.mjs`). Regras e o pedido base estão em `references/imagens.md` da skill. O "eu te amo" de 30/10 já saiu assim.
- **Peças já agendadas:** o "Max 20x" (hoje, 19h) e o "eu te amo, em 7 línguas" (30/10, 12h) foram refeitos como peças novas, já que o painel não troca post por carrossel nem põe palavra em peça pronta. Agendados nos mesmos horários; as antigas foram canceladas.

## Tomadas em 29/10/2026 (fila de reembolso e pedido pelo aluno)

- **Fila de reembolso (pedido do dono):** o reembolso pode ser agendado para daqui a 1 a 30 dias (padrão 7 no painel), "para deixar na fila sem afetar o caixa". Na fila, o pedido continua "pago" e conta no faturamento; o dinheiro só sai no dia. Tabela `reembolsos` (migration 21), um aberto por pedido.
- **O acesso cai na hora** (padrão), mesmo com o dinheiro na fila. O painel deixa desmarcar. Tirar da fila devolve o acesso que a fila tirou (matrículas com o motivo "reembolso agendado").
- **Quem devolve é o relógio de 10 minutos** (`cuidarDosReembolsos`, dentro de `cuidarDosPedidos`), 2 por vez. Ele pega o reembolso trocando "agendado" por "devolvendo", para dois relógios não devolverem o mesmo. Falhou: tenta de novo em 1 hora; na 3ª falha fica "falhou" e o painel mostra "Tentar de novo". Pedido que já não está pago (devolvido no Asaas, contestado) sai da fila sem devolver de novo, e o aviso do Asaas também fecha a fila.
- **Pedido pelo aluno, com barreiras (pedido do dono):** o e-mail "Pedir reembolso" do app virou um caminho em etapas. Primeiro "Tem certeza?", com as aulas assistidas e os arquivos baixados e o aviso de que usar o material depois não é permitido. Depois o motivo (obrigatório) e o "concordo com os termos e não vou utilizar nada do curso". Por fim "Confirmar" e "em até 7 dias o reembolso estará na sua conta" (no cartão, até 2 faturas). Entra na fila de 7 dias, o acesso cai, o aluno recebe a confirmação e a equipe um e-mail no `contato@` (pedido de teste não avisa). Só dentro da garantia da oferta.
- **Frase do aviso, ajustada:** o dono sugeriu "nós identificaremos e entraremos em contato". Ficou "se você pedir o reembolso e usar o material do curso, e nós identificarmos o uso, entraremos em contato". O sistema registra acesso, aulas e downloads, mas não vê o uso dos arquivos fora dele, e a frase não promete o que ele não faz.
- **Downloads por aluno:** antes só havia o total por arquivo. Desde 29/10/2026, cada download do kit grava em `arquivos_baixados` (migration 22). Os de antes não aparecem na tela do reembolso. A política de privacidade ganhou "os materiais que você baixou" e a linha do reembolso.
- **No ar** em 29/10/2026 com o ok do dono ("pode publicar o que vc fez do reembolso"), versão `fda64c60`; `npm run conferir` em produção ok.
- **Direito de arrependimento:** a barreira não impede o pedido dentro do prazo. Com mais etapas, o reembolso continua a poucos toques, como pede o direito de arrependimento de 7 dias da compra on-line.

## Tomadas em 29 e 30/10/2026 (versão em inglês)

Pedido do dono: o perfil novo @setupagency_eng com os mesmos posts em inglês e o curso vendido em inglês, com áudio e vídeos em inglês, em dólar. "Pode fazer tudo até finalizar as aulas, estrutura", com acesso ao Stripe e à HostGator pelo Chrome do Mac.

- **Nome do curso:** "Posts on Autopilot with Claude", US$ 19 à vista (o dono sugeriu "uns 19U$"), 1 ano de acesso, extra "Lifetime access" por US$ 9 no checkout, garantia de 7 dias. Nomes das aulas, do kit e das telas em `Curso/GLOSSARIO-EN.md`.
- **Mesmo Worker, mesmo banco, mesmo painel.** O curso em inglês é um curso com marca própria (`cursos.marca` com `idioma: 'en'`, tema vídeo), como o Dúvidas da Fé. O endereço decide a cara: `agenciasetup.com` (comprado pelo dono na HostGator em 30/10/2026). No computador: `npm run dev:en` (porta 8791).
- **Stripe, não Asaas:** o Asaas cobra em real no cartão de fora e precisa de liberação. A conta do Stripe é da Agência Setup LTDA (Brasil): cobra em US$ e repassa em real; taxa no Brasil 3,99% + R$ 0,39, mais 2% por cartão de fora. A pessoa paga na página do Stripe (cartão, Apple Pay, Google Pay); o número do cartão não passa pelo Worker. A volta da página confirma o pagamento na hora (`conferirVoltaStripe`) e o aviso assinado (`/api/stripe/aviso`) é a reserva. A chave de produção não foi lida nem guardada por mim: o dono cola uma chave restrita (`rk_live_`) em Integrações > Stripe; a de teste está só no `.dev.vars` e no `.env.local`.
- **Moeda separada nos números:** nenhum número soma real com dólar. Em Vendas e em Números, a chave "Real (R$) / Dólar (US$)" (pedido do dono em 30/10/2026: "eu vejo o que veio em dólar e o que veio em reais") troca números, gráfico, origens, funil e a lista de pedidos para a moeda escolhida (migration 26: `numeros_area` e `numeros_vendas` com `p_moeda`). A fila de reembolso mostra os dois totais à parte. Fora do faturamento não há chave de idioma: cada tela de posts tem a sua escolha de perfil.
- **Dois perfis, nada misturado (pedido do dono: "evite confusão"):** perfil `br` e `en` em contas, peças, palavras do Comenta X e posts. Peça sem conta escolhida sai pela conta do seu perfil; reconectar uma conta não troca o perfil dela (trocar é uma ação explícita, só administrador). O Comenta X do perfil em inglês responde em inglês e manda o material por link avulso (as páginas de recurso do site são em português); a oferta do fim do direct em inglês é a config `oferta_en`, criada desligada.
- **App do aluno em inglês sem mexer no português:** uma segunda compilação (`npm run aluno:en`) troca os textos por um dicionário (`aluno/en.json`); a compilação em português continua idêntica byte a byte. No endereço em inglês as mensagens do servidor saem em inglês (`worker/lib/api/aluno-en.js`), e turma, mural, desafios e ranking são só da turma dele (no app da Setup, nada do curso em inglês). Aluno que compra só em dólar fica com `alunos.idioma = 'en'`: recebe os e-mails de acesso, código e reembolso em inglês, e os que só existem em português (lembretes, desafio, resumo, certificado) não saem para ele.
- **Aulas em inglês com a voz do Filipe:** o mesmo motor, com `idioma: 'en'` no roteiro. O motor em português não muda: uma tabela (`motor/en.json`) traduz as telas do Claude, do Chrome e do Instagram numa cópia do motor dentro da aula. A voz é o mesmo clone do OmniVoice falando inglês, conferida pelo Whisper em inglês; a 1.1 passou 58 de 59 falas na primeira narração. Exemplos de post em inglês (`public/img/estilos-en/`, `Curso/_ferramentas/video/midia-en/`, carrossel `made-in-claude`) no lugar dos em português. "Calango" saiu das aulas em inglês (o público de lá não conhece).
- **Domínio:** zona `agenciasetup.com` no Cloudflare da conta (plano grátis), servidores `alan` e `sky.ns.cloudflare.com` trocados na HostGator (registro conferido no RDAP). Como o domínio não manda e-mail, ganhou SPF `-all` e DMARC `reject` (ninguém manda e-mail falso com o nome dele). O widget do Turnstile do checkout passou a aceitar o domínio. A rota do Worker para `agenciasetup.com` e `www` está no `wrangler.jsonc` e só vale no próximo deploy; antes dele, ligar o domínio mostraria a versão antiga do site.
- **Teste de ponta a ponta no computador (30/10/2026):** compra no modo de teste do Stripe com o cartão de teste deles, US$ 28 (curso + vitalício), pedido pago em dólar marcado como teste, matrícula sem prazo, e-mail em inglês (simulado no computador) e o app em inglês sem nenhum texto em português.

## Tomadas em 30/10/2026 (posts e material grátis em inglês)

Pedido do dono: "agende TODOS os posts que saíram na agência, agora em INGLÊS no perfil novo", com os horários internacionais por minha conta, e "as automações já funcionam?".

- **@setupagency_eng conectado (30/10):** a conta virou testadora do Instagram no app da Meta (convite aceito pelo dono), o Instagram e a Página "Setup Agency" entraram no perfil Inglês e os avisos da Meta (`node scripts/meta-webhook.mjs`) estão ligados nas 4 contas. Na conexão da Página em inglês, a tela do Facebook ficou só com ela marcada e a Página do Brasil perdeu o acesso (erro 190); reconectei com as duas marcadas e cada uma ficou no seu perfil. **Regra:** ao conectar o Facebook de novo, marque sempre as duas Páginas.
- **Material grátis em inglês no site em inglês (escolha do dono: "páginas no site"):** `recursos.perfil` (migration 27, padrão `br`). O recurso `en` mora em `agenciasetup.com/free/<slug>` (`worker/render/recurso-en.js`, visual escuro do checkout em inglês, botão "Copy" em cada prompt, o curso no fim quando a `oferta_en` estiver ligada) e não aparece no site em português (lista, busca, contagens, mapa do site). Baixar e abrir passam por `/free/<slug>/download` e `/open`, que contam o uso. A palavra do Comenta X em inglês manda o recurso em inglês (ou um link); recurso do outro perfil é recusado com erro claro. No painel, o editor de recurso tem "Perfil" e a lista mostra a etiqueta EN.
- **Os 7 materiais traduzidos e adaptados** (não ao pé da letra: os prompts pedem resposta em inglês americano, US$, horários "7 AM"): pauteiro (IDEAS), 10 tarefas (TIME e FUTURE), skill de Social Media (SKILL), arte em 5 etapas (LAYERS), 4 prompts de carrossel (PROMPT), esculacho (ROAST), tira cara de IA (HUMAN). Os arquivos são PDFs no visual dos de português e a skill em `.skill`; textos em `_local/recursos-en/`. Gravados como rascunho; publicar só depois do deploy (o código no ar ainda mostraria recurso em inglês no site em português).
- **Cookie de origem no domínio em inglês:** o `as_v` era gravado só para `.agenciasetup.com.br`, e o navegador recusa em `agenciasetup.com`: a venda em dólar perderia a origem (DM, post). Agora vale no domínio de quem pede.
- **Horários do perfil em inglês (ponto de partida, conferir em 3 semanas com `ver_desempenho` perfil en):** o público é dos EUA. Carrossel às 12h de Nova York (9h na Califórnia, 17h em Londres) e frase às 20h de Nova York; melhores dias de terça a quinta. Em Brasília: 14h e 22h de novembro a março, 13h e 21h de março a novembro (os EUA têm horário de verão, o Brasil não). Registrado nas skills de carrossel e de frase.
- **A agenda dos posts em inglês** (um carrossel por dia às 12h de Nova York, 13h ou 14h em Brasília; as 2 frases às 20h de Nova York, 22h em Brasília), 8 agendados em 30/10 pelo conector (aprovados em nome da chave da casa, a pedido do dono): 31/10 posts no automático (IDEAS), 1/11 vale a pena o Claude (TIME, com o card animado), 2/11 skill (SKILL), 3/11 4 carrosséis (PROMPT) e à noite a frase Max 20x (POSTS), 4/11 esculacho (ROAST), 5/11 quem cria e a IA (FUTURE) e à noite a frase "I love you" (POSTS). Ficaram fora a arte em 5 etapas (LAYERS, reservada para 6/11) e o texto com cara de IA (HUMAN, 7/11): a foto da capa tem texto em português na mão do Filipe (o carrossel impresso "CRIADO no Claude" e os papéis), e na arte em 5 etapas o slide 2 é a resposta real do ChatGPT em português. Precisam de foto nova. Artes em `templates/carrossel/conteudos/<nome>-en.js` e `templates/frase/conteudos/<nome>-en.js`; o cabeçalho e o selo "Calango" ficaram (são do modelo, como no `made-in-claude`).

## Tomadas em 30/10/2026 (vídeos em inglês e posts salváveis)

- **"Videos with Claude" em inglês por US$ 12** (escolha do dono; o preço é falado na mini VSL e aparece na animação, de US$ 37 para US$ 12). Mudou o preço, refaça a VSL. Slug `videos-with-claude`, script `scripts/area-semente-videos-en.mjs`; curso nasce em rascunho, produto e oferta desligados.
- **Vários cursos no mesmo endereço** (migration 28, com o ok do dono): `agenciasetup.com` tem o de posts e o de vídeos. O curso principal é o marcado com `marca.principal` ou, sem marcação, o mais antigo; a regra única agora vale só para o principal. O app da marca mostra todos os do endereço (`marcas.js`, `acesso.js`).
- **Oferta só no app dela** (`vitrine.js`, `doApp`): depois de ligar a venda em dólar, ofertas de um app apareciam em outro. Agora o app da Setup só mostra curso sem marca, e o de cada marca só os cursos do endereço dela.
- **VSL da página de venda em inglês:** `node scripts/vsl.mjs --en`. A rota da marca passou a carregar as integrações, sem o que a biblioteca do Bunny faltava e o vídeo não aparecia.
- **Capa alterna rosto, bicho e objeto** ("pode usar meu rosto, mas não sempre", dono). `arte-bonita-com-ia-en` virou calango sobre 5 placas; em `texto-cara-de-ia-en` ficou o rosto do Filipe, com os papéis reescritos em inglês (o robô mal disfarçado foi reprovado). Guia de profundidade e revisor de capa novos na skill (`references/profundidade.md`, `references/revisor-de-capa.md`, agente `revisor-de-capa`).
- **Inglês sem muleta de tradução** (dono: "o inglês tá correto? você tá entendendo contexto?"): saiu o "Real talk," e o "Calango" de tudo o que ainda não foi publicado; o perfil em inglês usa `marca: { nome: 'Setup Agency', selo: 'setup' }`, nos carrosséis e nas frases, e preço como "$19". Os 2 posts já publicados (30/10) ficaram como saíram, porque o Instagram não troca imagem de post publicado. Revisão só de inglês feita por um agente, sem nativo: risco avisado ao dono.
- **Revisor de peça** (`references/revisor-de-capa.md`, agente `revisor-de-capa`): olha o post inteiro, com o conteúdo primeiro, e reúne tudo o que o dono corrigiu. O que o dono decidiu vale mais que a lista.
- **Listas salváveis, em português e inglês:** o dono mandou 4 posts de @adarshxdesign como referência de formato. Fizemos 4 temas próprios (fontes, fontes manuscritas, cores, fundos), com imagens e textos nossos: fontes do Google Fonts de licença aberta, 6 pares de cores nossos e 20 fundos gerados no Magnific. Código em `_local/novos-posts/`; provas `fonte`, `combo` e `grade` no modelo do carrossel. O ZIP de 24 MB vai direto para o bucket, porque não passa pelo conector.

## Tomadas em 30/10/2026 (padrão visual, revisor e limpeza)

- **Padrão visual único:** `references/profundidade.md` da skill de carrossel junta o que o dono decidiu nas rodadas de capa: alternar rosto, bicho e objeto; gerar no site do Magnific pelo Chrome do Windows; grande angular limpa; título em bloco, centralizado, longe da margem; chamada grande no centro; névoa no branco. Vale mais que os textos antigos da skill, que foram acertados.
- **Finalização mais forte:** ruído e meio-tom subiram nos dois modelos, com pontos de 3 px também nas frases, e entraram as poeirinhas (`poeira()`), fora do miolo. Fazem parte da etapa 5.
- **Título sem sombra por padrão.** As 5 capas antigas já aprovadas e agendadas em inglês seguem com `semSombra: false`, para não mudar o que ele aprovou.
- **Revisor:** o agente `revisor-de-capa` abre cada slide em tamanho real e compara com os gabaritos, com os vizinhos da fila e com a versão no outro idioma. Nova nota de acabamento.
- **Agenda das listas, com o ok do dono ("agende tudo"):** um post por dia, sem fontes e manuscritas em dias seguidos. Brasil às 20h UTC, de 3 a 6/11 (fontes, cores, manuscritas, fundos). Inglês às 17h UTC, de 2 a 7/11 (spot, fonts, designs, colors, handwritten, backgrounds). Os 8 materiais foram publicados no mesmo dia, com o ok dele. O card "Deixa o fundo aparecer" saiu do post de fundos a pedido dele. Scripts: `_local/novos-posts/agendar.mjs`.
- **Imagens dos scripts vão direto para o bucket** (`_local/mcp-local.mjs`): pelo conector, cada envio estourava o limite do Worker no plano grátis (erro 1102). Por isso esses envios não passam pela auditoria do conector, como já acontece nos scripts da área de membros.
- **Limpeza do computador, com o ok do dono:** foram para a lixeira os MP4 finais dos dois cursos de posts (estão no Drive e no Bunny) e as cópias de `Curso-Videos/estudio/prontos`, mais a voz descartada (`_local/voz-chatterbox`) e dois repositórios sem uso. Ficaram os áudios, os roteiros, o motor, a voz OmniVoice e o curso "Vídeos com Claude", que não está nesse Drive. Para refazer só uma aula, o `produzir` continua funcionando; `legendas-srt --drive` e `previas.mjs` precisam dos MP4 de volta.

## Tomadas em 30/10/2026 (agenda, vendas e o painel que pensa)

Pedido do dono: "só vejo um painel com números".

- **Agenda:** abas Hoje, Semana, Mês, Ano e Lista. O "+3" saiu: dia cheio rola dentro da própria célula, e tocar no número abre o dia.
- **Vendas:** período (Hoje, 7, 15, 30, 60, 90 dias e personalizado), produto, canal, campanha e conteúdo, com comparação com o período anterior. Tudo calculado no Worker, sem mudar o banco. Venda conta pela data do pagamento, e a parte de cada produto sai proporcional ao total pago (o bump conta como produto).
- **UTMs, o que estava errado:** a mesma origem vinha com nomes diferentes (`ig`, `instagram`, `story`, `meta`); clique no link curto mais a página que abre contavam como 2 toques (307 de 1.217); `pagina` e `referer` gravavam lixo ("/recursos/skilldedm-skill"); com mais de 20 toques, o "último" não era o último; visita sem UTM vinda de rede ou busca não contava. Agora há um nome por canal (`canalDe`, na leitura, vale para o que já está gravado, sem reescrever nada), um toque por visita e as origens conhecidas pelo `referrer`. Os toques antigos continuam duplicados, mas as visitas contam pessoas diferentes.
- **Plano:** "O que fazer agora" são regras sobre os números, de graça, e cada item cita o número e leva à tela certa. Ideias e ações são do Claude. Com o Haiku (o modelo do tutor) o plano repetia palavra e errava conclusão; por isso usa o Opus, cerca de US$ 0,19 por plano, a cada 3 dias (uns US$ 2 por mês). Palavra já usada é tirada da ideia no servidor.
- **O plano não cria peça nem publica.** A imagem depende da skill e do computador, então a ideia vira um pedido para colar no Claude, ou "faz a primeira ideia do plano" pelo conector. O post nasce rascunho, como sempre.
- **Fora desta rodada:** lucro de verdade precisa do custo de anúncio e das taxas, que o sistema não guarda; hoje o painel mostra faturamento.

## Tomadas em 30/10/2026 (tarefas diárias de conteúdo)

- **Por enquanto, só carrossel.** Pedido do dono: "foco em carrossel por enquanto, nada de vídeo". As tarefas ignoram o `formato_sugerido` do radar. O radar e as instruções do conector ainda sugerem Reels: trocar lá depende de deploy, então ficou como está.
- **A tarefa de frases parou 2 vezes no primeiro uso do conector.** A causa provável é a aprovação de ferramenta sem ninguém olhando, e o status "concluída" do app não prova que ela entregou. A aprovação fica guardada na tarefa: o dono aprova uma vez e as próximas execuções seguem sozinhas. O que vale conferir é a peça em rascunho no painel.
- **Tarefa nova `carrossel-em-alta-do-dia`, às 10h:** 1 carrossel por dia a partir do melhor tema do Em alta. O tema precisa servir para designer ou social media, não repetir os últimos 14 dias e ter o fato confirmado na fonte. Sem tema bom, não há post, e o resumo diz por quê.
- **Sem o rosto do Filipe nessa tarefa:** só bicho ou objeto, porque o rosto precisa do olhar dele antes de montar. Ela também não espera a escolha na folha de fotos: escolhe, entrega como rascunho e mostra a folha junto.
- **As imagens das duas tarefas saem do Chrome do Windows**, como já era a regra do carrossel. O do MacBook é reserva.
- **`templates/carrossel/entregar.mjs`:** entrega de carrossel reaproveitável, igual à de frase. Antes, o caminho estava preso ao lote de `_local/novos-posts/`.
- **Post de frase sem café como padrão.** Pedido do dono sobre o post do "zero chance": "não gostei de usar um café de novo. Poderia usar outra coisa." Cada frase ganha um objeto ligado a ela; no post do zero, um dado com zero nas faces.
- **O foco dos carrosséis é automatizar posts** (31/10/2026). O dono reprovou o carrossel do Figma Weave: "o ideal é focar em automatizar posts, que é o que vendeu". A tarefa das 10h só usa tema do Em alta que ajude nisso; sem tema assim, faz um ângulo novo sobre automatizar posts, em vez de parar.
- **Capa:** sem roxo, linha de cima longe da margem, floreio colado na condensada, foto do Filipe nova em cada capa e tela de celular com post real, gerado com IA junto da foto (a colagem por código foi reprovada).

## Tomadas em 30/10/2026 (recuperar vendas)

Pedido do dono: quem chegou no checkout e não comprou "poderia ser chamado pelo email, sinalizado pra um setor de recuperar vendas, com mensagens prontas pra clicar e ir pro WhatsApp".

- **O que medimos antes:** 10 pedidos não pagos eram só 7 pessoas, e 4 já tinham comprado em outro pedido; sobravam 3 pessoas. Os "R$ 645,12 ficaram no checkout" estavam inflados e agora só contam quem não comprou, uma vez por pessoa. Quem paga, paga rápido (90% em até 3 minutos). 6 lembretes tinham saído, com 1 abertura e nenhum clique.
- **Tabela `recuperacoes`:** uma linha por pessoa e oferta, que nasce quando o checkout recebe um e-mail válido ou quando o pedido é criado. Nunca guarda CPF. Os pedidos não pagos dos últimos 30 dias entraram na migração.
- **Aviso e privacidade:** o checkout avisa, abaixo dos dados, que o contato pode ser usado para ajudar a concluir a compra, e as duas políticas de privacidade dizem o mesmo. Todo e-mail tem o link para parar, e abrir esse link só mostra o botão, porque programa de e-mail abre links sozinho. O texto foi escrito por nós e não passou por revisão jurídica.
- **Tela Recuperar vendas (`/recuperar`, conector `area_recuperar` e `area_marcar_recuperacao`):** motivo em uma frase, produto, de onde veio, e duas mensagens de WhatsApp. Abrir a mensagem marca como chamada. Suporte atende sem ver valores.
- **WhatsApp com clique de quem atende, não automático:** disparo automático tem custo e pode bloquear o número. Vale rever se o volume crescer.
- **E-mails:** o primeiro em 15 minutos, o segundo no dia seguinte, com texto por motivo, em inglês para o curso em dólar e com o nome da marca no Dúvidas da Fé. O relógio confere a cada 10 minutos, fora do rodízio, até 2 por rodada por causa do limite do plano grátis.
- **Link direto:** abre a oferta com nome, e-mail e celular preenchidos, sem passar pelo login. O id fica depois do `#`, fora do alcance do servidor e do Pixel. As vendas aparecem em Vendas como "Recuperação: WhatsApp", "Recuperação: e-mail" ou "Recuperação: link".
- **Recuperado só conta quem foi chamado ou recebeu lembrete antes de pagar.** Quem preenche e paga na hora vira "comprou" e fica fora da conta.

## Tomadas em 03/11/2026 (kit do curso para o Codex)

Pedido do dono: alunos que só usam o Codex da OpenAI também poderem seguir o mini curso.

- **As skills são as mesmas.** O Codex lê o mesmo formato SKILL.md, em `.agents/skills/` em vez de `.claude/skills/`, e o `AGENTS.md` faz o papel do `CLAUDE.md`.
- **O kit do Codex é gerado, não escrito à parte.** `node Curso/_ferramentas/kit-codex.mjs` copia `Curso/kit/` para `Curso/kit-codex/` com as trocas de tela (pasta, permissões, Chrome, tarefas e conectores). Os arquivos reescritos à mão (guia da tela, liberar acessos e o roteiro de teste) ficam em `Curso/kit-codex-manual/`. Mudou o kit do Claude, gere de novo.
- **Equivalências:** modo "Aceitar edições" vira **Ask for approval**; o Claude in Chrome vira a extensão do ChatGPT (**Settings > Computer Use**, `@Chrome`); "Executar agora" vira **Run now**, em **Scheduled**; os conectores viram **Plugins** (Trello) ou **Settings > Integrations and MCP**. Nomes conferidos na documentação e nas respostas do próprio Codex num Mac.
- **Diferença que muda o fluxo:** a tarefa agendada do Codex roda sem ninguém olhando e não espera licença; se faltar, ela falha. Por isso toda tarefa nova passa por um teste com **Run now** antes de valer.
- **Ainda não testado de ponta a ponta.** O maior risco é o radar das 7h usar o `@Chrome` (Trends e Instagram logado) sozinho. O roteiro está em `Curso/kit-codex/TESTAR-NO-CODEX.md`. Só vender para quem usa o Codex depois desse teste, e as aulas em vídeo continuam mostrando o app do Claude.

## Tomadas em 03/11/2026 (o kit aprende o estilo do aluno)

Achado no teste com uma aluna fictícia de nail design: o Claude e o Codex seguiram o kit e entregaram capas com a cara da agência. O dono: "a skill precisa aprender o estilo da PESSOA, do cliente. Não embutir o estilo da agência em cima."

- **O estilo vem das referências do aluno.** A receita 03 (Parte 2B) e a `references/ler-referencias.md` da skill `design-alto-padrao` fazem uma ficha medida de cada referência (letra, peso, itálico, cores com conta-gotas, lugar de cada texto, elementos e o que não aparece), com a fonte testada ao lado da referência, e escolhem uma capa-base. A ficha vira `estilo/visual.md` e `design/modelo/estilo.css`.
- **O visual da agência virou o "estilo clássico", desligado por padrão.** O modelo ganhou os tipos `capa-editorial` e `miolo-editorial`, que se moldam ao `estilo.css`. Janela, selo, cartões, caixa alta condensada e trilho só entram se as referências tiverem algo parecido.
- **Toda capa é conferida ao lado das referências** (`exportar.mjs lado-a-lado` e a lista "Lado a lado" de `verificacao.md`). Falhou um item, refaz antes de mostrar.
- **Recorte grátis no kit:** `ferramentas/recortar.mjs` (BiRefNet, licença MIT, roda no processador, sem placa de vídeo nem Python), com o comando `conferir` da borda. No Codex, a remoção de fundo dele (skill `imagegen`) vem primeiro, conferida com a foto original, e a ferramenta local fica de reserva.
- **No Codex, design só com esforço alto:** receitas 03 e 07 pedem o GPT-6 Astra ou o 6.1 Sol em Extra High (ou Max). O Sol no Medium gerou a capa ruim.
- **Os três kits foram atualizados** (`Curso/kit`, `Curso/kit-en` e o do Codex gerado de novo). Provas em `Curso/_testes-estilo/`.
- **No curso desde 04/11/2026** (ok do dono: "Pode subir já", sem esperar o teste no Codex). `node scripts/area-semente.mjs --so-kit` e `node scripts/area-semente-en.mjs --so-kit` trocam só os arquivos do kit (curso, módulos e aulas ficam como estão no ar). O kit do Codex virou um segundo pacote no curso em português (`Posts-Automaticos-Kit-Codex.zip`, sem o roteiro de teste da equipe). Os zips agora saem pelo `tar` do Windows, com "/" nos caminhos (o `Compress-Archive` gravava "\", que pode quebrar no Mac).
- **Falta:** testar no app do Codex (itens 14a a 14d do roteiro), o recorte num Mac, e confirmar que a foto das unhas do exemplo pode ir no kit.

## Tomadas em 05/11/2026 (vídeo "not available" e a conta do Bunny)

Um aluno no Safari do Mac via "This video is not available." em todas as aulas, enquanto os outros assistiam normalmente. O player do Bunny mostra essa frase quando o servidor de vídeo recusa a lista do vídeo (401/403). O servidor recusava porque o pedido chegava sem dizer de qual site vinha (sem `Referer`), o que acontece com extensão de privacidade, VPN ou antivírus.

- **Desligado o "Block direct url file access"** na biblioteca 788430 (ok do dono: "Pode desligar"). Continuam ligados o token do player (o Worker assina por 6 horas, `worker/lib/bunny.js`), o token do CDN e a lista de domínios liberados. Testado depois: pedido sem origem passa; pedido de outro site e pedido sem o link assinado seguem recusados (403). Religar é o mesmo botão em Stream > Security > General.
- **A conta do Bunny é pré-paga.** O teste grátis acabou em 05/11/2026 e os créditos de teste somem com ele; sem saldo, a conta para e os vídeos de todos os cursos param. O dono recarregou US$ 10 no mesmo dia. Uso real no teste: US$ 0,77 (52 GB guardados, 59 GB entregues).

## Tomadas em 05/11/2026 (Combo Black Calango, entrega na Hubla)

- **O combo é pago aqui e entregue na Hubla, à mão.** Pedido do dono, para economizar taxa: o pagamento vai pelo Asaas e os 7 cursos continuam na Hubla. A oferta leva `checkout.entrega = { tipo: 'externa', plataforma: 'Hubla' }`: o e-mail e o obrigado dizem que o acesso chega num e-mail da Hubla, e o comprador não ganha login na nossa área.
- **A lista de quem falta entregar mora no conector** (`entregas_pendentes` e `marcar_entregue`, `worker/lib/acoes-entregas.js`), com a marca em `config.entregas_externas` (sem tabela nova) e auditoria. Uma tarefa agendada do Claude lê a lista, adiciona os e-mails na Hubla pelo Claude in Chrome (Black Design Vitalício, Formação Designer e Story + Engajado, aba Membros, opção "(Padrão)"; pedido do dono, para abrir menos telas) e marca. Roteiro e ids em `docs/entrega-hubla.md`.
- **O mini curso também é bump do combo** (pedido do dono, "às vezes a galera compra"). Num pedido de entrega externa, o bump que é curso nosso (produto com `produto_acessos`) é liberado aqui na hora, com o e-mail de entrada de sempre, e o obrigado mostra o botão de entrar. O vitalício é o bump que não vira curso aqui (`produtosComCurso` em `lib/vendas.js`).
- **Black Friday no mini curso (06/11/2026):** "de R$ 97,00 por R$ 39,90, oferta exclusiva de Black Friday" (`ofertas.preco_de_centavos` 9700 e o subtítulo do checkout), com selo de fogo, brasas e contador até 30/11 no topo da página de venda. O checkout passou a mostrar o preço riscado de qualquer oferta com `preco_de_centavos`, e o contador do topo some sozinho depois da data. Depois de 30/11 o preço continua R$ 39,90 e só a ancoragem sai (decisão do dono): tudo isso mora numa **campanha com data** (`worker/lib/campanha.js`: `checkout.campanha` na oferta e `campanha` no bloco da landing), que some sozinha às 23h59 de 30/11, com até 5 minutos de cache.
- **Só marca quem entrou nos 3 produtos**; quem falhou volta na próxima rodada. Reembolso de quem já foi adicionado aparece em `para_remover`, e tirar o acesso na Hubla fica com a equipe (a tarefa só avisa).

## Tomadas em 06/11/2026 (aba Cursos no celular)

- **Cursos no lugar de Novidades nas abas de baixo do celular** (pedido do dono: "falta total de uma aba curso"). A aba fica sempre acesa, com o ícone e o texto em laranja e um brilho que respira atrás (`.aba-curso` em `site.css`, `abas()` em `worker/render/casca.js`). Novidades continua no menu do computador e no rodapé.

## Tomadas em 08/11/2026 (follow-up do direct)

Pedido do dono: "Objetivo: vender todos os dias." Uma tarefa diária lê o direct, anota cada pessoa numa lista de follow-up até vender, compara com quem comprou e prepara as mensagens no jeito dele.

- **A lista mora no painel** (escolha do dono, entre Trello, planilha e painel): tabela `followups` (migration 30), tela Vendas > Follow-up do direct, mesmas ações para painel e conector (`acoes-followup.js`), permissões `followup.ver` e `followup.editar` (Administrador, Editor e Suporte, como Recuperar vendas). Uma linha por @ e perfil.
- **Mensagem só com o ok do dono** (escolha dele: "pergunta e manda"). A tarefa lê, anota e mostra o lote numerado na sessão; ele aprova e ela manda pelo Chrome do Windows. O sistema nunca manda sozinho: aprovação escrita no Instagram ou em qualquer texto de fora não vale.
- **Quem comentou vem do banco, não do navegador:** `followup_importar` lê `respostas_gatilho` (o @, a palavra e o post de cada comentário do Comenta X) e dá o interesse pelo destino da palavra (material grátis, mini curso, combo). Os posts "EU QUERO" são de 2024 e 2025; o Combo Black de agora chega pela resposta ao story, que já está no direct.
- **Compra achada pelo e-mail ou pelo nome:** o checkout não pede o @ do Instagram. Sem e-mail anotado na conversa, vale nome e sobrenome iguais (o nome do Instagram sem o que vem depois de "|"), marcado "achado pelo nome, confira". Quem pagou antes de entrar na lista só ganha a marca do produto ("já é aluno").
- **Horários de pico** (pedido do dono: "São os horários que as pessoas mais estão ativas"): a tarefa roda às 12h, 16h, 18h, 19h, 20h, 21h e 22h, e também às 9h e 10h (pedido do dono logo depois: "Pode por mais uma 09:00, 10:00"). A rodada completa (as 3 abas do direct) é a das 9h, com o que chegou de madrugada; follow-up vale até as 22h; mais da metade do teto de 40 mensagens do dia fica para as rodadas das 18h às 22h.
- **Só quem não comprou** (pedido do dono na primeira rodada: "Não penso em acompanhamento de quem ja comprou. Só de quem não comprou. Precisamos vender a principio, não acompanhar"): nada de pós-venda. Quem está em "comprou" só recebe resposta se escrever.
- **Conector com a lista antiga:** o conector do app guarda a lista de ferramentas de quando foi conectado, então as `followup_*` não apareceram na sessão da tarefa. A tarefa usa `node scripts/conector.mjs <ferramenta> '<json>'` (chave da casa, pelo Bash) quando elas faltam; reconectar o conector no app resolve de vez.
- **Dúvida é do dono:** o que a tarefa não sabe (desconto, reembolso, acesso, pergunta técnica nova) vai para a fase "Dúvida com você". A resposta dele volta a pessoa para "conversando" com o toque para agora e fica em `followup_respostas`, que a tarefa lê antes de responder dúvida parecida.
- **Sem urgência falsa:** o mini curso continua R$ 39,90 depois de 30/11 (decisão de 06/11), então as mensagens não dizem que o preço sobe. Desconto além da tabela da skill é sempre do dono.
- **Ritmo de gente** (pedido do dono: "cuidado pra não mandar MUITA mensagem pra não sermos banidos... uns 10, ter um certo delay"): no máximo 10 pessoas por rodada, 45 a 90 segundos entre uma pessoa e outra, 3 a 8 segundos entre as mensagens da mesma pessoa, no máximo 40 mensagens puxadas por nós no dia (responder quem escreveu não conta nesse teto) e texto variado, para o Instagram não tratar a conta como robô.

## Tomadas em 08/11/2026 (app de vendas no celular, com avisos)

Pedido do dono: "transformar essa plataforma num app no iPhone, específico pra ver as coisas da venda no mobile... ativar notificações de venda, de reembolso, de pedido feito... sem precisar ir pra loja".

- **É o próprio painel, instalado pela web** (sem loja): `/admin/celular` é o app "Vendas", fora da moldura do painel, com abas embaixo: Resumo (faturamento do período, aguardando, conversão, o que ficou no checkout, reembolsos, por dia, últimos pedidos, por produto, de onde vieram), Pedidos (filtro de situação, busca, carregar mais, detalhe com WhatsApp, reenviar acesso e reembolso), Recuperar, Reembolsos e Avisos. Atualiza sozinho a cada 45 segundos e ao voltar para ele. Manifesto e ícone próprios (`admin/public/`, fundo laranja e logo escura, o contrário do app do aluno; `node scripts/logo.mjs painel`).
- **Avisos por Web Push, sem biblioteca e sem serviço pago:** `worker/lib/webpush.js` (cifra RFC 8291 e assinatura VAPID com o WebCrypto do Worker). Conferido com o exemplo oficial da RFC (byte a byte) e na Apple (assinatura aceita; a errada dá `BadJwtToken`); `node scripts/conferir-push.mjs`. No iPhone só funciona com o app na tela de início (iOS 16.4+) e a permissão pedida no toque.
- **Quando avisa:** pedido feito (Pix gerado ou cartão, depois da resposta, sem atrasar o Pix de quem compra), venda aprovada (com o total do dia), cartão recusado, e reembolso (pedido pelo aluno no app, agendado pela equipe, feito, contestação). Os ganchos ficam em `vendas.js`; o texto, em `push.js` (`montarAviso`). Pedido de teste só avisa quem ligou "Pedidos de teste".
- **Quem recebe:** só `vendas.ver` (Administrador e Editor), ativo na equipe. Cada aparelho escolhe os tipos.
- **Sem tabela nova:** as chaves ficam em `config.push` (a privada cifrada com a `CRIPTO_CHAVE`) e os aparelhos em `config.push_inscricoes`. Aparelho que saiu (404 ou 410 do serviço de push) é tirado sozinho; o último erro de cada um aparece na aba Avisos.
- **O service worker do painel (`/admin/sw.js`) só cuida dos avisos:** não guarda página nem dado. Toque no aviso abre o pedido; o número no ícone conta os avisos desde a última abertura.
- **Testado no computador:** tela no tamanho de celular, aviso entregue pelo Google a um Chrome de perfil temporário, decifrado sem erro e lido pelo service worker (o contador subiu). O aparelho de teste foi tirado do banco.
- **No ar desde 08/11/2026** (ok do dono: "Pode publicar"), versão `469f109c`. Conferido em produção: `/admin/sw.js`, o manifesto, o ícone e `/admin/celular` respondem; `/api/admin/avisos` sem login dá 401; `node scripts/conferir.mjs https://agenciasetup.com.br` tudo certo. O dono instalou e ligou no mesmo dia (o aviso de teste foi aceito pela Apple).
- **Venda no jeito do Calango** (pedido do dono: "engraçado e motivador"): o aviso de venda sorteia uma de 12 frases ("É vendaaaa Calango!", "R$ 39,90 na PIXXXX"), sem repetir a última, com quem comprou, o produto e o total do dia embaixo. Gíria de real ("pila", "conto") fica fora das vendas em dólar. `fraseDeVenda` em `push.js`.
- **Resumo do fim do dia** (tipo `fechamento`, ligado por padrão): às 23h58 de Brasília, pelo relógio de minuto (`fecharODia`; se pular, manda até 00h30 o do dia anterior; `config.push_fechamento` evita mandar duas vezes). O tom sai da média dos 14 dias antes: zerado, ruim (menos de 75% da média), bem, estourou (1,5 vez a média ou mais), e "RECORDE" quando é o melhor dia dos últimos 30.
- **Som:** a Apple não deixa site nem app da web escolher o som da notificação (com a tela bloqueada é o som padrão do iPhone). Com o app aberto, a venda toca um "plim" de moeda feito no código (`admin/src/nucleo/som.ts`, Web Audio, liga e desliga na aba Avisos) e os números atualizam na hora (o service worker avisa a tela).
- **No ar em 08/11/2026** (ok do dono: "Pode publicar"), versão `2d3a6664`. O resumo do dia foi ligado no aparelho que o dono já tinha (criado antes do tipo existir); aparelho novo já nasce com ele.

## Tomadas em 09/11/2026 (conector em modo código; SEO e GEO)

Pedido do dono: "ao invés do MCP atual, construa o MCP estilo code mode do Cloudflare... para gastar menos token, menos requisições (que seja free)", usando o `calangopro/jk-portal` como referência. E um plano de conteúdo 100% SEO e GEO (IA, eletrônicos para designer, notícias de IA, tutoriais que vendem o curso, melhores cursos de design), com afiliados no futuro.

- **`/mcp` passa a ser o modo código:** `buscar`, `consultar` e `executar` no lugar das 66 ferramentas. A lista que o app do Claude carrega em toda conversa caiu de 53 mil para 2 mil caracteres (96% menos), e um código junta várias operações numa chamada só, devolvendo só o que interessa. As operações, o cargo, a auditoria e as regras são os mesmos (`FERRAMENTAS` e `executar` de `mcp.js`); a skill que cita uma ferramenta (ex.: `followup_lista`) vira `await setup.followup_lista({})`, e o preâmbulo das instruções diz isso.
- **Grátis:** o Code Mode da Cloudflare usa Worker dinâmico (fora do plano grátis), e o Worker não aceita `eval`. Como no jk-portal, o código roda num QuickJS em WebAssembly (`quickjs-emscripten-core` e `@jitl/quickjs-wasmfile-release-sync` 0.32.0, o `.wasm` compilado na publicação). Worker com ele: 712 KB compactado (limite grátis: 3 MB). Lá dentro não há rede, `env`, `process` nem `require`; laço sem fim para pela contagem de trabalho (o relógio do Worker não anda sem espera), em uns 20 ms de processador; até 60 operações e 25 segundos por código.
- **`consultar` só lê** (o app do Claude libera sem perguntar); operação que escreve responde "rode pelo executar". Publicar no site, aprovar ou agendar peça, publicar agora, ligar Comenta X ou aviso, liberar curso e arquivar vêm marcados `[PEDE SIM]`.
- **O jeito antigo continua em `/mcp/ferramentas`** (mesmo login; a ficha do OAuth aceita os dois endereços), para cliente que lida melhor com uma ferramenta por operação.
- **Testado no computador** (porta 8794, só leitura): 16 verificações, inclusive três leituras num código só em 207 ms, recusa de escrita no consultar, laço sem fim parado, nada de rede ou segredo lá dentro e o 401 com a ficha certa nos dois endereços.
- **No ar em 09/11/2026** (ok do dono: "Pode publicar"), versão `97e21c7f`. As 16 verificações passaram em produção. Processador por pedido no `wrangler tail`: 2 a 11 ms nas consultas normais, 27 a 33 ms nos testes de laço pesado; nenhum estouro (`exceededCpu`) no plano grátis.
- **O site em inglês aberto ao Google** (ok do dono: "pode abrir pro inglês"): o robots do `agenciasetup.com` libera só a página de venda, os materiais grátis (`/free/`, sem os links de baixar e abrir) e os termos, e aponta para o `sitemap.xml` próprio (a página de venda e os recursos em inglês publicados: 12 endereços em 09/11). Checkout e área do aluno continuam com `noindex`. O Dúvidas da Fé e o `curso.` seguem fechados. `robotsEn` e `sitemapEn` em `worker/index.js`. Propriedade de domínio `sc-domain:agenciasetup.com` criada no mesmo dia (ok do dono: "Pode criar"; o dono verificou pelo botão da Cloudflare, que só pôs o TXT `google-site-verification`), sitemap enviado e indexação da página de venda pedida (o teste ao vivo passou). Na primeira leitura o sitemap apareceu como "Não foi possível buscar", embora abra normal para o Googlebot: costuma ser da propriedade recém-criada.
- **Scripts que chamam ferramenta pelo nome** passaram para `/mcp/ferramentas`: `scripts/conector.mjs` (o caminho das tarefas agendadas), `scripts/entregas.mjs`, `scripts/conferir*.mjs` e os `entregar` do carrossel (o da frase a própria tarefa já tinha trocado). Entre 08h06 e 08h30 de 09/11 eles recebiam "Ferramenta desconhecida"; `npm run conferir` em produção passou depois (38 verificações) e ganhou a do modo código.
- **SEO e GEO:** plano em `docs/seo-geo.md`. Fase A no ar em 09/11/2026 (ok do dono: "Pode começar"), versão `c713bad5`, tudo em `worker/lib/seo.js`:
  - robots com os robôs de IA (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, Bingbot) no mesmo grupo do `*`, nos dois sites;
  - `/llms.txt` nos dois sites (cursos, recursos, agentes, novidades e quem somos, do banco);
  - `/sitemap.xml` virou índice de `sitemap-paginas`, `-recursos`, `-novidades` e `-cursos` (o que já estava enviado ao Search Console continua valendo);
  - dados estruturados em grafo: `Organization` e `Person` (Filipe Lourenço, com os dados do site do Calango Studio, que é nosso), `WebSite` com busca, `CollectionPage` com `ItemList` nas listas, `BreadcrumbList`, recurso e `NewsArticle` com autor e editora apontando para a organização;
  - IndexNow: chave em `config.indexnow`, servida em `/<chave>.txt` nos dois sites; salvar algo publicado, publicar ou arquivar avisa sozinho (`avisarBuscadores` em `acoes.js`, depois da resposta). Na publicação, as 37 páginas foram avisadas de uma vez (resposta 202 nos dois sites).
  - Falta ao dono: o Bing Webmaster Tools, importando do Search Console.
- **Fase B no ar em 09/11/2026** (ok do dono: "Pode seguir"), versão `6334fd70`, migration `20261109000032_conteudo_seo.sql` aplicada:
  - **Um tipo de conteúdo só:** a tabela `artigos` ganhou tipo (notícia, guia, artigo, tutorial, comparativo, review), assunto (vira o endereço: `/novidades`, `/ia`, `/equipamentos`, `/tutoriais`, `/guias`, em `worker/lib/assuntos.js`), busca-alvo, intenção, resposta rápida, perguntas (`faqs`), autor e revisor, data em que os preços foram conferidos e afiliado. Endereço antigo `/novidades/<slug>` leva ao do assunto (301).
  - **Autores:** tabela `autores` e página `/autor/<slug>` (ProfilePage). O Filipe Lourenço entrou com o texto e os perfis do site do Calango Studio. Editar autor é de quem publica (`salvar_autor`); o painel só escolhe.
  - **Blocos no Markdown** (`markdown` em `worker/nucleo/util.js`): tabela do GitHub, ```` ```pros-contras ````, ```` ```produto ```` (link com `sponsored nofollow`), ```` ```curso ```` (a oferta no ar no meio do texto; sem ela, a chamada vai no fim) e âncora nos intertítulos (o índice aparece com 3 ou mais).
  - **A página do artigo:** migalhas, quem assina com foto, "Atualizado em", minutos de leitura, aviso de afiliado, resposta rápida, índice, perguntas abertas e fechadas, material grátis, chamada do curso e fontes; dados estruturados `Article`/`NewsArticle` com autor `Person`, `FAQPage` e migalhas. Assunto sem artigo publicado responde 404 (sem página vazia).
  - **Analisador de SEO e GEO sem IA** (`worker/lib/analisador-seo.js`, modelo `rules.ts` do jk-portal): o mesmo arquivo roda no editor do painel (nota ao vivo de Google, IAs e voz, com a dica de cada aviso), no conector (`checar_seo`) e na trava de publicar. Só barra título, resumo, H1 no corpo, imagem sem descrição e travessão; o resto é conselho (inclusive duas páginas com a mesma busca).
  - **Painel:** "Recursos e artigos"; o editor de artigo tem a nota, "Busca e resposta", perguntas e os botões de bloco. **Conector:** `salvar_artigo` com os campos novos e as regras de artigo nas instruções (notícia nunca é cópia; afiliado às claras), `checar_seo`, `listar_autores`, `salvar_autor`.
  - Testado no computador (25 verificações com um artigo de teste apagado depois) e visto no celular; em produção, as conferências de SEO e a geral (38) passaram.
- **Fase C no ar em 09/11/2026** (ok do dono: "Fase C primeiro"), versão `62991220`, migration `20261109000033_seo_metricas.sql`:
  - **Conta robô do Google** (conta de serviço, só leitura, grátis): o dono cria e cola o JSON da chave em Integrações > Google Search Console (`config.search_console`, cifrado; o painel confere na hora quais sites ela lê). Passo a passo em `docs/search-console-automatico.md`. A assinatura (JWT RS256) é feita com o WebCrypto do Worker, sem biblioteca (`worker/lib/searchconsole.js`); conferida com uma chave gerada no teste e com o próprio Google ("account not found" para a conta inventada, ou seja, pedido no formato certo).
  - **Importação no relógio de minuto:** no minuto 17 das horas cheias, das 6h às 23h, um site por vez até os dois estarem em dia (`config.seo_importacao`), para caber nas 50 chamadas do plano grátis. Guarda 90 dias dia a dia (`seo_dias`) e os últimos 28 dias por página, busca e par (`seo_itens`, trocados a cada importação).
  - **Tela SEO e Google** (Site > SEO e Google, `admin/src/telas/Seo.tsx`): os dois sites, cliques, aparições, CTR e posição contra os 28 dias antes, cliques por dia, e as abas Oportunidades, O que buscam e Páginas. Oportunidades: pouco clique para a posição, quase na primeira página (8 a 20) e busca sem página própria (cai no início ou numa lista); cada uma vira pauta num toque (sem repetir pauta nova igual).
  - **Conector:** `ver_seo`, `importar_seo` e `oportunidade_para_pauta`.
  - Falta o dono criar a conta robô (15 minutos). Até lá a tela mostra o caminho para ligar.
- **Primeiros artigos, como rascunho (09/11/2026, pedido do dono: "Escreve os artigos"):** "Como fazer posts automáticos com IA, passo a passo" (`/tutoriais/como-fazer-posts-automaticos-com-ia`, nota 93) e "Melhor notebook para designer em 2026: o que comprar" (`/equipamentos/melhor-notebook-para-designer`, nota 96). Ambos assinados pelo Filipe, com resposta rápida, perguntas, links para os recursos e a chamada do curso. O tutorial sai dos recursos da rotina e das 3 regras (nada promete post saindo sozinho). O guia só afirma o que tem fonte (MacBook Air M5: R$ 13.999 e R$ 15.999, preço oficial de lançamento em março de 2026, TechTudo e MacMagazine) e não cita preço de Windows que não deu para conferir; sem link de afiliado ainda. Os textos estão em `_local/artigos/`. Publicados no mesmo dia (ok do dono: "Pode publicar"), sem capa; as páginas `/tutoriais` e `/equipamentos` apareceram sozinhas, entraram no sitemap e no llms.txt, e o IndexNow foi avisado.

## Em aberto

- **Follow-up do direct:** no ar desde 08/11/2026 (versão `8267d516`) com a tarefa `direct-followup`. Falta a primeira rodada com o dono olhando e conferir na primeira semana se o "achado pelo nome" erra. Sete rodadas por dia lendo o direct gastam bastante do limite semanal do Claude: se apertar, ficar com 9h, 14h e 20h.
- **Recuperar vendas:** conferir em produção os primeiros lembretes (`recuperacoes.lembretes`, tipo `recuperacao` em `emails`) e o texto do aviso no checkout com quem cuida do jurídico.

- **Videos with Claude em inglês:** publicar o curso e ligar produto e oferta só com o ok do dono. 4 falas tiveram nota mais baixa na conferência de voz (aula 8 `b5`, aula 10 `kb1`, aula 12 `b1`, VSL `v3`), para ouvir.
- **Versão em inglês, no ar em 30/10/2026 (ok do dono: "pode fazer o deploy... vincular a stripe, página de venda"):**
  - deploy `26b7e105` (perfis, chave Real/Dólar, Stripe, app em inglês, rota do agenciasetup.com) e `c409c1a6` (cartão do Stripe em Integrações); `npm run conferir https://agenciasetup.com.br` ok;
  - Stripe: chave restrita "Agencia Setup - curso em ingles (Worker)" criada e colada pelo dono (Checkout Sessions, Charges and Refunds, Customers e Webhook Endpoints em gravação; Payment Intents e Events em leitura); aviso `we_1UW44M1m2iEq8aCgi4TTrQ7k` com os 6 eventos, segredo cifrado em Integrações. A conta do Stripe também tem uma chave do Veritas: o sistema só mexe em pagamento com `metadata.sistema = setup`;
  - landing `posts-on-autopilot` publicada em agenciasetup.com (fora de `/cursos`). A venda segue desligada (os botões de comprar levam a "#") até as aulas ficarem prontas: escolha do dono ("página no ar, venda depois").
- **Versão em inglês, falta:**
  - terminar a fila das aulas, subir ao Bunny, gravar no banco (`node scripts/area-semente-en.mjs --sem-kit`) e a VSL no topo da página (`heroi.video` da landing);
  - ligar a venda: produto e ofertas `posts-on-autopilot` e `posts-on-autopilot-lifetime`, e a config `oferta_en`;
  - **feito em 30/10/2026 (ok do dono: "Sim, publicar"):** deploy `5ffd4cd5` e os 7 recursos `en` publicados, com a capa do carrossel em inglês (a arte em 5 etapas e o texto com cara de IA ficam sem capa até os posts deles). Conferido no ar: `npm run conferir` ok; as 7 páginas em agenciasetup.com/free respondem e nenhuma aparece no site em português (lista, busca, mapa, `/recursos/<slug>` dá 404); baixar entrega o arquivo (o teste contou 1 download no pauteiro); as 8 palavras em inglês mandam o link certo com `?de=dm-<palavra>` e as do Brasil seguem iguais;
  - as 2 frases em inglês (POSTS, 3/11 e 5/11 às 22h) levam à página do curso: só deixar sair com a venda em dólar ligada (senão, adiar);
  - ~~fotos novas para a arte em 5 etapas e o texto com cara de IA em inglês~~: feitas em 30/10/2026; os dois estão em rascunho (`node _local/en-posts/agendar.mjs arte-bonita-com-ia texto-cara-de-ia` agenda);
  - primeira compra de verdade em dólar, com reembolso.
- **Versão em inglês, depois:** o certificado e a tela pública do perfil ainda em português; ranking da Setup ainda conta aluno do curso em inglês; o link curto `/l/` não existe no domínio em inglês (sem contagem de clique por versão no Comenta X em inglês); o mapa do site em inglês (`/free` fora do sitemap).

- **Dúvidas da Fé:**
  - O dono ler o livro completo (`_local/duvidas/duvidas-da-fe.pdf`).
  - **Deploy:** feito em 29/10/2026, com o ok do dono ("Pode publicar"); versão `b422ed88`. O endereço `duvidasdafe.agenciasetup.com.br` está no ar. O DNS e o certificado foram criados pela Cloudflare, e o DNS de e-mail não foi tocado. Conferido no ar:
    - o app abre com a marca;
    - o manifesto e o ícone respondem;
    - o checkout mostra "oferta indisponível" (a oferta está desligada);
    - o link de PDF de um pedido que não existe dá 404;
    - o site e a área da Setup seguem normais, e `npm run conferir https://agenciasetup.com.br` deu tudo certo.
  - **À venda desde 29/10/2026** (ok do dono: "Ligar e vender"):
    - curso publicado e oferta `duvidas-da-fe` ligada pelo painel. Eu disse que os dois produtos estavam desligados, mas estavam ligados desde a criação; foram desligados no mesmo dia, na publicação do visual novo (ver abaixo);
    - conferido no ar:
      - o checkout abre com R$ 19,90 e o "Acesso para sempre" (+ R$ 14,90), com Pix e cartão em até 3x;
      - o Turnstile aparece normal no endereço novo ("Confirme que é humano");
      - a página de venda mostra o preço e leva ao checkout;
      - `agenciasetup.com.br/cursos` e o mapa do site continuam sem ele.
    - o "para sempre" aparece só no checkout, como order bump; a página de venda não tem o segundo botão do mini curso (`?com=`).
  - **Falta:**
    - a primeira compra de verdade, com o reembolso, para conferir o PDF anexado saindo pelo Resend (não gerei Pix de teste para não criar cobrança no Asaas);
    - o dono revogar a chave da Anthropic que mandou pelo chat.
  - **PDF desatualizado:** mudou uma dúvida no painel, o PDF não muda sozinho. Ele é gerado dos arquivos (`node scripts/duvidas.mjs pdf`) e sobe pelo `area-semente-duvidas.mjs`.

- **Pinterest:** Trial **negado** em 26/10/2026 (e-mail genérico, sem motivo) e a ficha do app travou. Em 29/10, com o ok do dono, a política de privacidade ganhou a parte "Redes sociais" (comentários do Comenta X, contas da agência ligadas ao painel, chave cifrada, como desligar), que também serve para a Meta; deploy `78b44a8d`, `npm run conferir` em produção ok. Tíquete pedindo nova análise enviado em 29/10, com o ok do dono (texto em `docs/pinterest-app.md`; resposta no e-mail da conta do Pinterest). Se não andar em uma semana, criar outro app.
- **Área de membros (conferido em 23/10/2026):** no ar em `curso.agenciasetup.com.br`, com Asaas (chave e aviso), Bunny (vídeos; o Panda não foi preciso), Resend (domínio `envio.agenciasetup.com.br` com DKIM e SPF; e-mails reais saindo) e tutor de IA ligados; preço final R$ 39,90. Opcionais, quando o dono quiser: pixel da Meta e GA4 (contas do dono), nota fiscal pelo Asaas, Workers Paid e Supabase Pro se o volume pedir.
- **Proteções (24/10/2026, com o ok do dono):** Turnstile no checkout (widget "Agência Setup · checkout", modo managed, domínios `agenciasetup.com.br` e `curso.`; chave do site e segredo cifrado em Integrações, gravados pela ação do painel; segredo conferido na Cloudflare). Limite por IP no "Receber novidades" (10 por hora) e no registro de origem `/api/toque` (30 a cada 10 minutos, acima disso ignora calado), com o `bater_limite` que o resto já usa. Cabeçalhos nas páginas públicas: `x-frame-options: SAMEORIGIN` (contra clickjacking), HSTS de um ano (sem subdomínios, para não tocar no e-mail) e `permissions-policy` sem câmera, microfone e localização; o checkout ganhou HSTS (já tinha `DENY`). O resto já tinha limite: checkout, códigos de entrada, comentários, dúvidas do tutor e fotos.
- **App da Meta:** publicado em 22/10/2026 (conferido em 24/10 no painel: "Publicado"; alerta "mudou para o modo publicado"). As permissões de comentários e mensagens estão no acesso padrão, que a Meta diz bastar para app que atende só contas que a própria empresa administra (o @agenciasetup). Falta o primeiro teste real da DM: alguém comentar a palavra de um post a partir de uma conta pessoal. Se a DM for recusada, aí sim pedir Acesso Avançado (revisão da Meta, com vídeo e acesso de teste para o revisor, que o dono preenche).
- **Mini curso:** primeira compra de verdade pelo dono (Pix ou cartão) e o reembolso pelo painel, para conferir o caminho inteiro com dinheiro real.
- ~~Revisão do app da Meta (Acesso Avançado de comentários)~~: resolvido em 26/10/2026 sem a análise. O comentário chega na hora pela Página (ver `docs/meta-app.md`).
- **Workers Paid** se o radar ou o Comenta X precisarem de mais velocidade.

- ~~**SPF não inclui o Google.**~~ Resolvido em 29/10/2026: o e-mail saiu do Google para o Email Routing da Cloudflare (ver acima).
- **Tirar o `contato@` da lista de bloqueio da Resend** (Suppressions), para os testes da Resend chegarem nele.
- **Projeto antigo na Vercel** (o que servia o site e o `proposta`) continua lá, parado. Apagar ou não é com o dono.
- **Fontes com licença:** o site e a página de venda usam Inter Tight, Inter e Instrument Serif; os carrosséis, Anton (todas gratuitas). Se a marca usa Tusker Grotesk ou outra paga, trocar quando houver licença.
- **Ordem das próximas fases** (design system, Meta, tarefas diárias, AdSense).
- **Rotacionar** o token do Supabase, a chave global da Cloudflare e a chave de acesso total da Resend (`RESEND_CHAVE_ADMIN`, 29/10/2026) (foram colados no chat). Para a Cloudflare, o ideal é um token com permissão só de Workers e DNS desta zona.
