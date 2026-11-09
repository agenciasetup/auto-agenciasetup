# Área de membros, checkout e vendas (plano)

Pedido do dono (23/10/2026): uma área de membros própria em `curso.agenciasetup.com.br`, que vá além das plataformas de curso de hoje. Estilo Netflix, trilhas, tutor de IA, venda dentro do curso, arquivos organizados, comunidade, gamificação, celular perfeito, checkout próprio com o Asaas, UTMs claras e tudo no nosso painel. Vários cursos no futuro.

Este arquivo é o plano. **Nada foi construído ainda.** Cada fase termina num **PARE** para o dono conferir.

---

## 1. Em uma tela

| O quê | Como fica |
| --- | --- |
| Onde o aluno estuda | `curso.agenciasetup.com.br`: app no celular (instala na tela inicial) e no computador, tema escuro, jeito iOS |
| Onde se compra | `agenciasetup.com.br/checkout/<oferta>`: checkout nosso, uma página, Pix e cartão, sem sair do site |
| Como o curso se organiza | Curso → Seções → Módulos → Aulas → Arquivos. Trilhas juntam pedaços de vários cursos |
| O que o aluno ganha que ninguém dá junto | tutor de IA que conhece a aula e lê print de erro, "Faça agora" em cada aula, busca dentro do que foi falado, marcadores no vídeo, pular abertura e final, conquistas, ranking, desafios, mural de criações, certificado com 70% |
| Como vendemos mais | oferta pelo tema da aula, compra com 1 clique (cartão salvo), order bump, upsell, combos, cupons, recuperação de Pix e cartão, cursos bloqueados na vitrine |
| Como sabemos de onde veio | link rastreável em tudo que sai (post, DM do Comenta X, story, bio, anúncio). Cada venda guarda o primeiro e o último toque. O painel mostra quanto cada post vendeu |
| Onde a equipe controla | no painel que já existe (`/admin`): Cursos, Ofertas, Vendas, Alunos, Comunidade, Comunicação, Números, IA, Integrações. E pelo Claude (conector), com as mesmas regras |
| Onde roda | no mesmo Worker da Cloudflare e no mesmo banco (Supabase). Vídeo no Panda, pagamento no Asaas, e-mail no Resend |
| Custo fixo | cerca de R$ 265/mês com a estrutura recomendada para vender (seção 14), mais o tutor de IA conforme o modelo escolhido |

---

## 2. A jornada do aluno

### 2.1 Comprar

1. Clica no link (post, DM, anúncio). O link já carrega de onde ele veio (seção 5).
2. Página do curso (landing que já existe em `/cursos/<slug>`), com aula grátis de amostra no mesmo player.
3. Checkout: e-mail, nome, CPF, celular, forma de pagamento, order bump, cupom. Botão "Pagar".
4. Pix: QR na tela, "copia e cola", contador de validade e "esperando pagamento" ao vivo. Pagou, a tela muda sozinha.
5. Cartão aprovado: tela de obrigado com **upsell de 1 clique** (opcional) e o botão **"Entrar no curso"**, que já entra logado.

### 2.2 Primeiro acesso

- O acesso é criado pelo sistema quando o Asaas confirma o pagamento. O cadastro continua fechado, então só entra quem comprou ou foi liberado pela equipe.
- E-mail de boas-vindas com um link que entra direto. Na primeira vez, o aluno escolhe uma senha ou segue só com **código por e-mail** (6 números, bom no celular).
- Tela de boas-vindas em 3 passos: foto e @ do Instagram (pode pular), "qual seu objetivo" (vira trilha sugerida) e "quantas aulas por semana" (vira lembrete e plano de estudo).

### 2.3 Início (estilo Netflix)

- **Topo:** "Continuar de onde parou", com a capa da aula, a barra de progresso e "faltam 4 min". Quando a equipe publica um banner (lançamento, evento ao vivo), ele divide o topo.
- **Fileiras** que arrastam para o lado:
  - Continuar assistindo;
  - Seus cursos;
  - Sua trilha;
  - Próximo passo recomendado;
  - Ao vivo e próximos eventos;
  - Mural da turma (criações dos alunos);
  - Materiais mais baixados;
  - **Para você conhecer**: cursos que ele não tem, com cadeado e "Conhecer".
- Capas em dois formatos: 16:9 para as fileiras e 2:3 (pôster) para os cursos.

### 2.4 Página do curso

- Capa grande com o trailer tocando sem som, progresso e o botão "Continuar".
- Abas:
  - **Aulas:** as seções, com os módulos abrindo em acordeão e cada aula com duração, tique de concluída e cadeado se ainda não liberou;
  - **Materiais:** a biblioteca do curso inteiro;
  - **Sobre;**
  - **Avaliações;**
  - **Certificado:** mostra quanto falta para os 70%.
- Liberação programada por módulo (opcional): na hora, X dias após a compra ou numa data.

### 2.5 Aula (assistir e aplicar)

**Player (Panda):**
- marcadores na linha do tempo, com a lista de assuntos clicável ao lado;
- **Pular abertura** e **Pular final**: o botão aparece nos tempos marcados;
- velocidade, voltar e avançar 10 s, legendas, janela flutuante e espelhar na TV (Chromecast e AirPlay);
- retomar de onde parou, até trocando de aparelho;
- "Próxima aula em 5…" no fim, como episódio da Netflix.

**Abaixo do vídeo**, em abas no celular e lado a lado no computador:
- **Faça agora:** 1 a 5 passos curtos, cada um com uma ação:
  - "Copiar prompt";
  - "Baixar o .md";
  - "Abrir no Claude", com o pedido da aula já escrito;
  - "Fazer cópia no meu Drive", para modelos do Google Docs e Planilhas;
  - "Fiz este passo".
- **Materiais desta aula:** as fichas da seção 2.6.
- **Tutor:** seção 2.7.
- **Comentários:** com o minuto do vídeo.
- **Minhas anotações:** anotação presa ao minuto, que volta para o ponto exato.

**Modo aplicar (exclusivo):**
- no computador, o vídeo vira uma janela pequena fixa no canto e o passo a passo ocupa a tela;
- no celular, o vídeo fica preso no topo e os passos rolam embaixo.

**Pausa prática (exclusivo, opcional por aula):** no ponto marcado, o vídeo pausa e mostra "Agora faça isto no seu Claude", com o botão "Fiz, continuar".

**Fim da aula:** "Essa aula te ajudou?" (polegar para cima ou para baixo, com motivo opcional), marca a aula como concluída e mostra a próxima.

**Resumo e cola:** cada aula tem um resumo de 1 minuto e uma "cola" de 5 linhas para revisar sem assistir de novo. São gerados pela IA a partir da transcrição e revisados pela equipe.

### 2.6 Arquivos organizados (a ficha do arquivo)

Hoje as plataformas só anexam. Aqui cada arquivo tem uma **ficha**:

| Parte da ficha | Exemplo |
| --- | --- |
| Ícone e tipo, em cor | Receita `.md`, Prompt, Modelo, Planilha, Pacote, PDF, Link |
| O que é (1 frase) | "A receita que monta seu radar de assuntos quentes." |
| Quando usar | "Depois da aula 3.1, com a pasta do projeto aberta no Claude." |
| Como usar, em passos numerados | 1. Baixe. 2. Arraste na conversa. 3. Responda as perguntas. |
| Tempo estimado | 10 min |
| Prévia | primeiras linhas do `.md`, miniatura do modelo |
| Versão e data | "v2, atualizado em 20/10/2026", com aviso se o aluno baixou uma versão antiga |
| Botões | Baixar, Copiar, Abrir no Claude, Fazer cópia no Drive |

- A biblioteca do curso filtra por tipo, por módulo e "o que eu ainda não baixei".
- Os arquivos ficam num bucket privado. O download sai por um link que vence em minutos, então não dá para repassar o endereço.
- **Google Drive:** a equipe importa arquivos e pastas do Drive no painel (seção 10). Docs, Planilhas e Apresentações do Google ganham "Fazer cópia no meu Drive": o aluno recebe uma cópia dele, e o original fica protegido.

### 2.7 Tutor de IA

- **Contexto do tutor:** a transcrição exata da aula (temos os roteiros e os tempos de cada fala), os materiais da aula, o guia de erros do curso e o progresso do aluno.
- **Responde citando o minuto:** "veja em 3:42", e o minuto é clicável.
- **Lê print (exclusivo):** o aluno manda a captura da tela onde travou e o tutor diz o que fazer. Para este curso, que ensina a usar o Claude, isso resolve a maior parte do suporte.
- **Só fala do curso e do assunto.** Fora disso, devolve para a aula.
- **Quando não resolve:** "Enviar para a equipe" vira uma dúvida no painel, com a conversa junto.
- **Limites:** perguntas por dia por aluno e um teto de gasto por mês, os dois no painel. Polegar para cima ou para baixo em cada resposta.
- **Tutor do próprio Panda:** existe e é barato (10 créditos, ~R$ 10, por 1.000 respostas). Mas ele fica preso ao player e não lê print, não usa os nossos arquivos e não vê o progresso do aluno. O nosso vai além; o do Panda fica como plano B, se o custo da IA apertar.
- **Perguntas repetidas** viram respostas prontas (custo zero), aprovadas pela equipe.
- **O que o painel mostra:** o que mais se pergunta em cada aula, o sinal mais claro de onde a aula precisa melhorar.

### 2.8 Comentários, avaliação e curtida

- **Comentário com minuto:** clicar leva ao ponto do vídeo. A resposta da equipe fica destacada como "Resposta oficial".
- **Curtidas e dúvidas:** curtir comentário e marcar "resolveu minha dúvida". A equipe pode fixar.
- **Moderação:** um filtro de links e palavrões, e a IA separa dúvida, elogio e spam. Comentário com link vai para aprovação.
- **Avaliação:** curtida da aula em 1 toque no fim de cada uma. Nota do curso (0 a 10) depois de 50% e no certificado.
- **Aviso no sino** quando alguém responde.

### 2.9 Perfil

- **O que o aluno preenche:** foto (recortada no próprio celular antes de subir), nome, @ do Instagram, frase curta, área (social media, designer, dono de negócio…), cidade (opcional) e links.
- **Privacidade:** perfil público sim ou não, aparecer no ranking sim ou não.
- **Perfil público (exclusivo):** `curso.agenciasetup.com.br/@usuario`, com conquistas, criações e certificados. É bonito para compartilhar e traz gente nova.

### 2.10 Conquistas, ranking, desafios e mural

**Pontos (XP)** contam só o que é real:
- vídeo assistido de verdade (pelos eventos do player, pular para o fim não conta);
- passo do "Faça agora" feito;
- comentário útil (curtido ou marcado como resolveu);
- desafio entregue;
- módulo concluído;
- dias seguidos.

**Selos.** Exemplos:
- Primeira aula, Módulo 1 completo, Curso concluído;
- Primeiro post automático;
- Aplicou 10 vezes;
- Sequência de 7 dias, Madrugador;
- Ajudou a turma;
- Criador destaque, Desafio de novembro.

Cada selo tem raridade e um desenho da marca.

**Níveis** com nome da casa (sugestão: do "Calango filhote" ao "Calango lenda").

**Ranking:**
- semanal e mensal, para todo mundo ter chance, e também por curso;
- mostra os 10 primeiros e a posição do aluno;
- só entra quem aceitou.

**Desafios** (a equipe cria):
- tema, prazo, regras e prêmio;
- o aluno entrega um link do post ou uma imagem;
- a turma curte e a equipe escolhe os destaques;
- prêmio: selo exclusivo, material, destaque no mural e repost no Instagram da agência (com permissão).

**Recompensa visual por criar:** quem tem criação aprovada ganha uma moldura no avatar e o selo "Criador".

**Mural de criações:** a vitrine do que a turma fez com o curso, também com perfil e permissão.

### 2.11 Certificado com 70%

- Sai sozinho quando o aluno conclui 70% das aulas. O percentual muda por curso.
- Página pública `/certificado/<código>` com QR para conferir, em PDF (pela impressão do navegador) e em imagem para o story.
- Botão "Adicionar ao LinkedIn" com o certificado já preenchido.

### 2.12 Feedback que vira material

- Depois de 50% (ou no fim), o aluno vê: "Conta como foi e ganhe o Pack X". Ele manda texto ou vídeo curto, a nota, e marca se autoriza o uso.
- O material libera na hora. O depoimento autorizado e aprovado entra sozinho no bloco de depoimentos da landing page (exclusivo).
- Check-in de resultado 30 dias depois: "Quantos posts você já automatizou?" vira número para a página de vendas e caso de sucesso.

### 2.13 Celular (iOS, limpo e intuitivo)

- **App instalável (PWA):** ícone na tela inicial e abre sem a barra do navegador. Não depende de loja nem de aprovação da Apple.
- **Abas embaixo:** Início, Cursos, Buscar, Turma (mural e desafios) e Perfil.
- **Componentes:** folhas que sobem de baixo para materiais, tutor e oferta; botões grandes; toque com resposta; transições curtas. Tudo segue o `docs/design-system.md`.
- **Player:**
  - vídeo no topo em largura total;
  - deitar o celular põe em tela cheia;
  - botões grandes de voltar e avançar 10 s;
  - "Faça agora" e comentários rolam por baixo.
- **Login dura 90 dias** no aparelho e o app abre direto no "Continuar".
- **Sem internet:** a lista de aulas e as fichas abrem sem rede. O vídeo baixa pelo app gratuito do Panda (QR no player), quando a aula permitir.
- **Antes de codar, um protótipo das 6 telas principais** para aprovar o visual: Início, Curso, Aula no celular, Aula no computador (modo aplicar), Checkout e Perfil. Segue a regra das 5 etapas.

### 2.14 Busca dentro do que foi falado (exclusivo)

"Pesquisar nas aulas": o aluno digita "tarefa agendada" e vê cada aula e cada minuto em que isso foi dito, além dos arquivos e comentários. É possível porque temos a transcrição de cada aula com os tempos.

---

## 3. Vender dentro do curso

| Onde | O quê | Regra |
| --- | --- | --- |
| Aula | Cartão "Quer ir além?" pelo **tema da aula** (as tags da aula casam com as tags do produto, como os anúncios do site já fazem) | 1 por tela, nunca sobre o vídeo, e só para quem não tem o produto |
| Minuto do vídeo | Marcador do tipo "oferta": quando o professor cita um produto, aparece um aviso pequeno ao lado, por alguns segundos | Desliga por aula |
| Fim de módulo ou de curso | "Próximo nível": o curso seguinte, com condição por tempo (ex.: 20% por 48 h, real, sem contador falso) | Uma vez por marco |
| Material extra | Micro produto (R$ 9 a R$ 27): pack de prompts, modelos prontos daquela aula | Compra com 1 clique |
| Início | Fileira "Para você conhecer" com cadeado; banner de lançamento | Equipe controla |
| Checkout | **Order bump** (caixinha "adicionar por + R$ X"), até 2 | Por oferta |
| Depois de pagar | **Upsell de 1 clique** e, se recusar, **downsell** | Por oferta |

- **Compra com 1 clique:**
  - Quem pagou com cartão autoriza salvar o cartão (token do Asaas, nunca o número). Depois aparece "Comprar com o cartão final 1234".
  - Com Pix, sai um QR numa folha, sem sair da aula.
  - No Asaas de produção, o token precisa ser liberado pelo suporte, depois de análise. Só funciona no caminho A do checkout (seção 4).
- **Combos** (ex.: Black Friday): uma oferta que entrega vários produtos, com preço, validade e limite de vendas. Também "Upgrade": quem já tem o mini curso paga só a diferença para o curso completo.
- **Presentear:** comprar para outra pessoa. O acesso vai para o e-mail dela, com mensagem.
- **Plano equipe (exclusivo):** uma compra com 3 ou 5 vagas para agências. O comprador convida a equipe pelo painel do aluno.
- **Indique um amigo:** o aluno ganha um material (ou crédito) quando a indicação compra. Mais tarde, comissão em dinheiro com divisão de pagamento do Asaas (seção 4).
- **Cupons:** percentual ou valor, por oferta, com limite de usos, validade e "só na primeira compra".

---

## 4. Checkout próprio com o Asaas

**Visual:** simples como Hubla e Kiwify, no nosso design. Uma coluna no celular e duas no computador (resumo do produto ao lado). Logo, o que a pessoa recebe, garantia de 7 dias, segurança e 2 ou 3 depoimentos curtos. Sem contador falso.

**Campos** (o Asaas exige CPF para qualquer cobrança):
- Pix: nome, e-mail, CPF e celular.
- Cartão: os mesmos, mais o CEP e o número da casa, que o Asaas pede do titular.

Quem já comprou e está logado só escolhe como pagar.

**Formas de pagamento** (conferido na documentação do Asaas, 10/2026):

| Forma | Como funciona aqui |
| --- | --- |
| Pix | QR dinâmico pela API, confirmação automática pelo aviso do Asaas, desconto opcional no Pix. A validade em minutos é nossa: depois do prazo, o sistema cancela a cobrança e gera outra se a pessoa voltar. Precisa de chave Pix cadastrada na conta |
| Cartão à vista e parcelado | Até 12x (21x em Visa e Mastercard). O Asaas não tem campo de "juros para quem compra": nós calculamos o total com juros e mostramos parcela e total antes do clique. Ou "sem juros" em promoção |
| 2 ou 3 cartões | Não existe pronto no Asaas, então montamos com a **pré-autorização** dele: cada cartão é autorizado (o valor fica reservado) e só confirmamos quando todos passam. Se um falha, soltamos os outros. Cada cartão paga a taxa fixa de R$ 0,49 |
| Pix Automático | Já está liberado no Asaas, para assinatura (comunidade mensal, plano de materiais): a pessoa autoriza uma vez no banco. **Exige CNPJ com 6 meses ou mais** |
| Assinatura no cartão | Recorrência mensal ou anual pelo Asaas |
| Boleto | Desligado por padrão (demora e pouca gente paga). Liga por oferta, já com QR de Pix no boleto |
| Débito | O Asaas não cobra débito pela API. Fica de fora |

**O dinheiro do parcelado:** o Asaas solta cada parcela a cada 32 dias. Para receber tudo de uma vez, a antecipação custa 1,70% ao mês. Por isso a sugestão é cobrar os juros de quem parcela, como a Hubla faz (3,19% ao mês), e antecipar só quando valer a pena.

**Decisão do dono: por onde passa o cartão.** O Asaas não tem campo de cartão que roda no navegador (como o Stripe tem). Então, no checkout 100% nosso, o número do cartão passa pelo nosso Worker a caminho do Asaas: não é gravado nem aparece em registro, mas passa. Isso nos põe na regra de segurança de cartão mais exigente (PCI DSS). Há duas saídas:

| Caminho | Como fica | Prós e contras |
| --- | --- | --- |
| **A. Cartão no nosso checkout** (recomendado) | Tudo numa página, com a nossa cara | Converte mais e permite 2 e 3 cartões e o 1 clique. Pede cuidado redobrado: HTTPS, Turnstile, limites, nenhum registro do cartão e revisão de segurança antes de abrir |
| **B. Cartão na página do Asaas** | O Pix fica no nosso checkout. No cartão, o botão abre a página segura do Asaas e volta para a nossa tela de obrigado | O cartão nunca toca o nosso servidor. Mas é uma página sem a nossa marca (a API não aceita logo nem cores), sem 2 cartões e sem 1 clique |

Dá para começar pelo B e passar para o A, ou ter o A com o B como reserva, oferta por oferta.

**Depois do pagamento:**
- O Asaas avisa o Worker, que libera o acesso, manda o e-mail, grava a venda com a origem e conta a conquista "Primeira compra".
- **Reembolso:** botão no painel (Administrador) que devolve pelo Asaas e tira o acesso. Dentro dos 7 dias, o aluno pode pedir sozinho no perfil, com um motivo. Isso reduz estorno no cartão, que custa caro e conta contra a conta.
- **Estorno no cartão (chargeback):** o acesso é suspenso na hora e o pedido vai para "contestação" no painel.
- **Nota fiscal:** o Asaas emite a nota de serviço de cada venda pela API, logo depois da confirmação (R$ 0,49 por nota). Precisa dos dados fiscais da empresa na conta. Atenção: quem é do Simples Nacional passa a emitir pelo portal nacional da NFS-e a partir de 01/11/2026.

**Recuperação:**
- Quem deixou o e-mail e não pagou recebe 2 lembretes (30 min e 24 h), com o link que reabre o checkout preenchido.
- Pix gerado e não pago: lembrete antes de vencer.
- Cartão recusado: sugestão de Pix na hora, com o mesmo valor.

**Proteção:**
- Turnstile da Cloudflare (grátis e invisível) contra robô testando cartão.
- 3D Secure (a confirmação no app do banco) opcional, ligado pelo suporte do Asaas. Útil porque **o prejuízo do estorno no cartão é de quem vende**, não do Asaas.
- Limite de tentativas por e-mail e por aparelho.
- Os dados do cartão nunca ficam no banco nem nos registros (seção 11).

**Teste:** tudo passa primeiro pelo **sandbox do Asaas** (dinheiro de mentira), com um script de conferência igual ao `conferir-painel.mjs`.

---

## 5. De onde veio a venda (UTMs e atribuição)

**Link rastreável em tudo que sai:**
- O painel gera links curtos `agenciasetup.com.br/l/<código>`, cada um com `utm_source`, `utm_medium`, `utm_campaign` e `utm_content` já preenchidos.
- Saem sozinhos:
  - um por peça publicada;
  - um por palavra do Comenta X (hoje o link da DM leva `?de=dm-<id>`, que vira UTM de verdade);
  - um para a bio, para os stories, para o Pinterest e para a descrição do YouTube.

**Como guardamos:**
- Na primeira visita, um cookie nosso (`.agenciasetup.com.br`, 1 ano) dá um número ao visitante.
- Cada chegada com UTM, `fbclid` ou `gclid` vira um "toque" no banco: origem, post, página, data. Não guardamos IP.

**Na venda:** o pedido guarda o **primeiro toque**, o **último toque** e todos os toques dos 30 dias antes.

**O painel mostra:**
- quanto cada post vendeu (a **nota de venda** do post, ao lado da nota de engajamento que já existe em Desempenho);
- quanto cada palavra do Comenta X vendeu;
- vendas por rede, campanha e anúncio;
- o funil: visita → landing → checkout → pagou.

Com isso o motor de engajamento passa a saber **o que vende**, e não só o que engaja (exclusivo).

**Anúncios:** Pixel da Meta e API de Conversões (a compra vai do servidor, sem perder venda por bloqueador), GA4 e conversão do Google Ads. Cada um liga e desliga em Integrações.

---

## 6. Avisos, banners, eventos e e-mails

**Peças que a equipe publica:**

| Peça | Onde aparece |
| --- | --- |
| Banner | Topo do Início ou da página do curso, com imagem, texto e botão |
| Aviso | Faixa curta no topo ou janela (para avisos importantes) |
| Evento ao vivo | Fileira de eventos, com "Me lembre", arquivo de agenda (.ics) e o link na hora. A gravação vira aula bônus |
| Notificação | O sino dentro do app; push no celular para quem instalou e aceitou |

**Para quem:** todos, quem tem o curso X, quem não tem o produto Y, quem está parado há 7 dias, quem passou de 50%, quem terminou.

**Quando:** início e fim. Cada peça conta quantos viram, clicaram e fecharam.

**E-mails automáticos** (Resend, no visual da marca):
- boas-vindas;
- acesso e código de entrada;
- "você parou na aula X" (com o link direto para o minuto);
- módulo concluído;
- certificado;
- desafio novo;
- resposta ao seu comentário;
- recuperação de carrinho e de Pix;
- recibo;
- resumo semanal da turma.

**Curso vivo (exclusivo):** aula atualizada ganha o selo "Atualizada em 10/2026". Quem já tinha assistido recebe "Esta aula mudou: veja o que há de novo". Combina com a promessa de material sempre atualizado.

---

## 7. Comunidade, sem montar rede social

Comunidade aqui é **fazer junto e ver o que os outros fizeram**, sem feed para rolar:

1. Comentários por aula, com minuto e resposta oficial.
2. Mural de criações, só com o que foi feito com o curso.
3. Desafio do mês, com votação da turma e destaque.
4. Ao vivo mensal (dúvidas e revisão de criações), com a gravação no curso.
5. **Turmas por mês** ("Turma de Novembro"), com o resumo semanal: o que a turma criou, quem subiu no ranking, a dúvida da semana respondida em vídeo curto.
6. Perfis públicos com criações e certificados.
7. Futuro: duplas de prática (o sistema junta duas pessoas no mesmo ponto do curso) e, se fizer sentido, a Comunidade do WhatsApp ligada em Integrações.

---

## 8. Painel (admin) completo

O painel que já existe ganha estas telas. Toda ação nova entra em `worker/lib/acoes.js`, com permissão e auditoria, e fica disponível no conector do Claude (trava 10).

| Tela | O que faz |
| --- | --- |
| **Cursos** | Monta curso, seções, módulos e aulas arrastando. Liga a aula ao vídeo do Panda. Importa arquivos do Drive. "Gerar com IA" a partir da transcrição: marcadores, abertura e final, resumo, cola, Faça agora, tags. "Ver como aluno". Trilhas |
| **Ofertas** | Preço, parcelas e juros, desconto no Pix, formas de pagamento, bumps, upsell e downsell, combos, cupons, validade, visual do checkout, links rastreáveis |
| **Vendas** | Pedidos com status e origem, reembolso, reenvio de acesso, contestações, recuperação, exportar planilha |
| **Alunos** | Busca, ficha do aluno (compras, progresso, conquistas, conversas com o tutor, linha do tempo), liberar ou tirar acesso, presente, plano equipe |
| **Comunidade** | Comentários para responder e moderar, avaliações, depoimentos (aprovar e mandar para a landing), desafios e entregas, mural, ranking |
| **Comunicação** | Banners, avisos, eventos, notificações, e-mails automáticos (texto e liga/desliga) |
| **Números** | Faturamento, ticket médio, conversão do checkout, funil, vendas por post e por origem, reembolsos, conclusão por aula, onde o vídeo perde gente (retenção do Panda), dúvidas por aula, notas, alunos ativos, turmas |
| **IA** | Chaves, modelo por função, limites e teto de gasto, instruções do tutor, custo por mês, respostas prontas |
| **Integrações** | Seção 10, cada uma com ligar, configurar e "testar agora" |

**Cargos:**
- Administrador: tudo, inclusive reembolso, chaves e integrações.
- Editor: cursos, ofertas, comunidade e comunicação.
- Redator: rascunhos.
- Novo cargo **Suporte**: vê alunos, reenvia acesso, responde comentários e dúvidas do tutor. Não vê faturamento nem reembolsa.

**Relatório da semana por IA (exclusivo):** junta as dúvidas do tutor, os comentários, a retenção do vídeo e as notas e diz em 5 linhas onde os alunos travam e o que mudar. Sai pelo Batch da API (metade do preço).

---

## 9. IA: onde entra, modelo e custo

| Função | Quando roda | Observação |
| --- | --- | --- |
| Tutor da aula (texto e print) | Cada pergunta do aluno | A maior parte do custo. Limites por aluno e teto por mês |
| Marcadores, resumo, cola, Faça agora, tags | Uma vez por aula, ao publicar | Pode rodar aqui no Claude Code, sem custo de API |
| Moderação de comentários | Cada comentário | Curto e barato |
| Relatório da semana, rascunhos de resposta e de avisos | Uma vez por semana | Batch: metade do preço |

**Modelo:** o padrão é o **Claude Opus 5.5**, que dá a melhor resposta. O painel deixa trocar o modelo de cada função.

**Estimativa do tutor** (300 alunos, 10 perguntas por mês cada = 3.000 perguntas; ~10 mil tokens de contexto da aula e ~700 de resposta; metade das perguntas aproveitando o cache da aula):

| Modelo | Custo por mês |
| --- | --- |
| Claude Opus 5.5 (padrão) | ~US$ 120 (~R$ 660) |
| Claude Sonnet 5.5 | ~US$ 62 (~R$ 340) |
| Claude Haiku 5.5 | ~US$ 3 (~R$ 17) |

A escolha é do dono, no painel. A contagem real aparece em IA, por mês e por aluno. A conta usa dólar a ~R$ 5,50.

**Para economizar sem perder qualidade:**
- cache do contexto da aula (o mesmo para todos os alunos da aula);
- respostas prontas para perguntas repetidas;
- limite de perguntas por dia.

---

## 10. Integrações (tela própria no painel)

| Grupo | Integração | Para quê |
| --- | --- | --- |
| Pagamento | Asaas (sandbox e produção) | Pix, cartão, assinatura, reembolso, nota fiscal, divisão de pagamento |
| Vídeo | Panda Video | Player, segurança, retenção, legendas |
| Arquivos | Google Drive | Importar arquivos e pastas para o curso; "Fazer cópia no meu Drive" |
| Arquivos | R2 da Cloudflare (ou bucket privado do Supabase) | Guardar os arquivos do curso e as fotos de perfil |
| E-mail | Resend | Acesso, avisos, recuperação, resumo |
| Rastreamento | Pixel da Meta + API de Conversões, GA4, Google Ads, TikTok | Medir e otimizar anúncios |
| IA | Anthropic (Claude) | Tutor, moderação, relatórios |
| Agenda | Arquivo .ics e Google Agenda | Eventos ao vivo |
| Proteção | Turnstile (Cloudflare) | Checkout sem robô |
| Saída | Webhooks (n8n, Make, Zapier) | "Compra", "matrícula", "conclusão" e "certificado" para outros sistemas |
| Futuro | WhatsApp (link da comunidade; mensagens pela API oficial) | Lembretes e avisos |

**Detalhes que importam:**
- **Google Drive:** o login do Google usa a permissão `drive.file` com o seletor de arquivos do Google. Assim não precisa da auditoria de segurança que o Google exige para ler o Drive inteiro. Usa o mesmo projeto do Google em que o YouTube já está.
- **Chaves:** todas guardadas cifradas, como as das redes (trava 8). Nunca voltam para o painel nem para o Claude.

---

## 11. Segurança, antipirataria e LGPD

**Vídeo:**
- domínio permitido no Panda (só toca em `curso.agenciasetup.com.br`);
- marca d'água com nome e e-mail do aluno, e o vídeo só toca com o token assinado por aluno (grátis no Bronze, seção 12).
- O antidownload criptografado do Panda só existe no plano Gold (R$ 497,90). No Bronze, a marca d'água por aluno é o que desestimula a cópia.

**Conta compartilhada:**
- até 3 aparelhos ao mesmo tempo;
- alerta no painel quando uma conta aparece em muitas cidades no mesmo dia.

**Arquivos:** só por link assinado que vence. Nada fica em pasta pública.

**Banco:** continua fechado (trava 5). O aluno fala só com o Worker.
- O login do aluno usa o mesmo Supabase Auth da equipe, mas o Worker separa: aluno é conferido na tabela `alunos` e nunca entra no `/admin`.
- O cadastro segue fechado.

**Cartão:** o número nunca é gravado (só o token e os 4 últimos dígitos). Os registros do Worker apagam esses campos.

**Pagamento:**
- o aviso do Asaas é conferido pelo token;
- cada aviso é processado uma vez só (tabela de eventos);
- reembolso e liberação manual são ações de Administrador, com auditoria.

**LGPD:**
- pedimos só o necessário;
- o aluno baixa os dados dele ou apaga a conta no perfil;
- perfil público e depoimento só com aceite;
- política de privacidade e termos da área de membros escritos antes de abrir (texto nosso, o dono aprova).

**Texto do aluno** (comentário, pergunta ao tutor, depoimento) é dado, nunca instrução (trava 6). O tutor tem regra explícita para isso.

---

## 12. Arquitetura técnica

```
agenciasetup.com.br           site, landing, /checkout, /l (links), /admin, /mcp, /api/asaas (aviso de pagamento)
curso.agenciasetup.com.br     app do aluno (PWA) + /api/aluno/*
           \                   /
            mesmo Worker (worker/index.js separa pelo endereço)
                    |
     Supabase (banco + login)   R2 ou Storage (arquivos)   Panda (vídeo)   Asaas (pagamento)   Resend (e-mail)   Claude (IA)
```

**App do aluno e checkout:**
- App do aluno em **React + Vite**, como o painel: pasta `aluno/`, compila em `public/aluno/`, com service worker para instalar no celular. As páginas públicas (certificado, perfil público) saem prontas do Worker, para abrir rápido e aparecer bonito quando compartilhadas.
- Checkout em HTML do próprio Worker, com pouco JavaScript: abre rápido no celular de qualquer pessoa.

**Pagamento:**
- O aviso do Asaas chega em `/api/asaas/aviso` e é conferido pelo cabeçalho `asaas-access-token`. Ele é gravado na hora e respondido com 200 em menos de 10 s, como o Asaas exige: com 15 falhas seguidas, a fila dele para. O processamento vem depois, pela fila da Cloudflare (Queues, hoje grátis). Avisos repetidos são ignorados pelo `id`. Assim nenhum pagamento se perde se algo falhar no meio.
- **2 ou 3 cartões:**
  - Cada parte é uma cobrança com `authorizeOnly`. Quando todas ficam autorizadas, o sistema captura cada uma (`captureAuthorizedPayment`).
  - Se uma falha, as outras são soltas. A reserva vence sozinha em 3 dias, e o estorno solta antes; conferir no sandbox.
  - O pedido só vira "pago" com todas capturadas.
- **Cartão:** o pedido ao Asaas leva o IP de quem compra (o Asaas pede) e espera até 60 s de resposta.

**Relógio:** o relógio de 10 minutos ganha a vez para:
- vencer Pix e mandar lembretes;
- recuperação de carrinho;
- liberação programada de módulos;
- conquistas e ranking;
- resumo semanal;
- relatório de IA.

**Player (Panda, conferido na documentação em 10/2026):**
- A biblioteca `api.v2.js` do Panda dá o tempo atual, a duração, "ir para o minuto", velocidade e os eventos de tocar, pausar, pular e terminar. Com isso fazemos:
  - pular abertura e final (o Panda não tem pronto);
  - pausa prática;
  - progresso real e XP (o Panda não manda "% assistido": nós calculamos);
  - "Próxima aula em 5…".
- **Capítulos:** o Panda tem, mas só pelo painel dele, sem API. Os marcadores ficam no nosso banco (a IA gera da transcrição) e aparecem na lista ao lado do vídeo e por cima da linha do tempo. Copiar para os capítulos do Panda é opcional.
- **Retomar de onde parou:** o do Panda fica só no navegador. Guardamos a posição no banco e abrimos com `startTime`, então funciona trocando do celular para o computador.
- **Marca d'água e link por aluno:** o Worker assina um token (JWT) por aluno com nome, e-mail e parte do CPF. Com o grupo de marca d'água ativo, o vídeo só toca com esse token. O nível normal é grátis em todos os planos; o "avançado" (gravado no vídeo) custa R$ 2,90/GB.
- **Retenção:** a curva segundo a segundo vem da API (`/retention/{video}`) e entra em Números. O Panda não separa por aluno; essa parte é nossa, pelos eventos.
- **Legendas:** a transcrição do Panda custa crédito (R$ 1 a cada 30 min no nível básico). Como já temos o texto exato de cada aula, mandamos a legenda pronta (SRT), que é grátis.
- **Envio dos vídeos:** pela API (TUS), direto dos arquivos da pasta `Curso/videos`.
- **Assistir sem internet:** o app gratuito do Panda baixa o vídeo pelo QR que aparece no player, com prazo de 7 ou 30 dias. Liga por vídeo.

---

## 13. Banco (tabelas novas)

Uma migration por fase (trava 2), RLS em tudo e sem política.

| Grupo | Tabelas |
| --- | --- |
| Conteúdo | `cursos`, `secoes`, `modulos`, `aulas` (vídeo, duração, marcadores, abertura e final, transcrição, resumo, cola, Faça agora, tags, liberação), `arquivos` (ficha, origem, versão), `trilhas`, `trilha_itens` |
| Venda | `produtos` (já existe; ganha acessos), `produto_acessos`, `ofertas`, `ofertas_bumps`, `cupons`, `pedidos`, `pagamentos` (vários por pedido), `assinaturas`, `eventos_asaas`, `notas_fiscais`, `cartoes_salvos` (só token e final) |
| Aluno | `alunos`, `matriculas`, `progresso`, `anotacoes`, `minha_lista`, `sessoes_aparelho` |
| Conversa | `comentarios`, `reacoes`, `avaliacoes`, `depoimentos`, `tutor_conversas`, `tutor_respostas_prontas` |
| Jogo | `conquistas`, `aluno_conquistas`, `xp_eventos` (ranking sai daqui), `desafios`, `entregas` |
| Comunicação | `avisos`, `eventos_ao_vivo`, `lembretes_evento`, `notificacoes`, `emails_enviados` |
| Origem | `visitantes`, `toques`, `links` (os curtos) e `cliques_link`; o pedido guarda primeiro e último toque |
| Certificado | `certificados` (código público) |

---

## 14. Custo e carga

Carga com 300 alunos ativos: perto de 1% do limite diário da Cloudflare, igual ao estudo anterior. O checkout e o tutor quase não mudam isso, porque o vídeo vai direto do Panda para o aluno.

| Item | Por mês | Por quê |
| --- | --- | --- |
| Panda Bronze | R$ 97,90 (+ até ~R$ 45 se passar de 500 GB) | Vídeo |
| Cloudflare Workers Paid | US$ 5 (~R$ 28) | **Recomendado ao começar a vender.** No grátis, passar de 100 mil pedidos num dia (lançamento ou post viral) derruba o site e o checkout até meia-noite. Também dá mais tempo de processamento por pedido |
| Supabase Pro | US$ 25 (~R$ 140) | **Recomendado ao começar a vender:** backup diário. Com dados de compra, perder o banco não é opção |
| Resend | R$ 0 (até 100 e-mails/dia) ou US$ 20 (~R$ 110) | Pro só se um lançamento passar de ~100 compras num dia |
| R2 (arquivos) | R$ 0 até 10 GB | Pede cartão cadastrado na Cloudflare |
| Turnstile, Queues | R$ 0 | |
| Tutor de IA | ~R$ 17 a R$ 660 | Conforme o modelo (seção 9) |
| **Total fixo recomendado** | **~R$ 265 + tutor** | |
| Nota fiscal automática (opcional) | R$ 0,49 por nota (~R$ 147 com 300 vendas) | A nota já é obrigatória hoje, com Hubla ou sem. Isso só paga a automação |
| 2 ou 3 cartões | R$ 0,49 a mais por cartão extra | Taxa fixa de cada cobrança |
| Antecipação do parcelado (opcional) | 1,70% ao mês por parcela antecipada | Coberta se os juros forem de quem parcela |

Comparação: a R$ 97 e 300 vendas, a Hubla custaria ~R$ 2.839/mês e o Asaas ~R$ 950. Mesmo com toda a estrutura recomendada e o tutor no Opus, a economia fica perto de R$ 1.000 por mês. Com o tutor no Sonnet, ~R$ 1.300.

---

## 15. Fases (ordem de construção)

### Fase A. Protótipo do visual (antes de qualquer código)
- [x] 6 telas em HTML navegável: Início, Curso, Aula (celular), Aula (computador, modo aplicar), Checkout, Perfil. Regra das 5 etapas. Aprovado em 23/10/2026.

**PARE.** O dono aprova o visual.

### Fase B. Vender e assistir (o mínimo para lançar o mini curso)
- [x] Banco: conteúdo, venda, aluno, origem (migration).
- [x] Rota `curso.agenciasetup.com.br` no Worker. Falta ligar o domínio no deploy (com ok; DNS de e-mail intocado).
- [x] Checkout próprio: Pix, cartão à vista e parcelado (caminho B, na página do Asaas), order bump, cupom, Turnstile (liga com a chave).
- [x] Asaas: cliente, cobrança, aviso de pagamento, reembolso e contestação. Conferido com o pagamento simulado; [ ] falta o sandbox (sem chave ainda).
- [x] Acesso automático, e-mail de boas-vindas (Resend, "simulado" até ter a chave), login com link, código ou senha.
- [x] App do aluno: Início estilo Netflix, curso, aula com Panda, retomar, concluir, marcadores, pular abertura e final, fichas dos arquivos, perfil básico.
- [x] UTMs: links curtos, toques, primeiro e último toque no pedido. O link do Comenta X leva a palavra (`?de=dm-<palavra>`).
- [x] Painel: Vendas, Alunos, Área de membros (aulas, ofertas, links rastreáveis, e-mails). Cargo Suporte. O mini curso entrou pelo `scripts/area-semente.mjs`; criar curso e módulo pelo painel fica para a Fase C.
- [x] Conferência de ponta a ponta: `node scripts/conferir-area.mjs` (compra → acesso → aula → painel → reembolso → acesso tirado). [ ] Repetir no sandbox do Asaas.

**PARE.** Compra de verdade de R$ 1 pelo dono, e o mini curso no ar.

### Fase C. Aprender aplicando (feita em 23/10/2026, no computador)
- [x] Faça agora, modo aplicar, pausa prática, "Abrir no Claude", "Fazer cópia no Drive".
- [x] Tutor de IA (texto e print), limites, respostas prontas, "enviar para a equipe".
- [x] Comentários com minuto, curtidas, avaliação, anotações.
- [x] Busca nas transcrições.
- [x] Certificado com 70%, página pública e LinkedIn.
- [x] E-mails: parou e certificado (o certificado faz o papel do "concluiu").
- [x] App instalável no celular (PWA, com as últimas aulas sem internet).

**PARE.**

### Fase D. Vender dentro e checkout completo (feita em 23/10/2026, no computador)
- [x] Ofertas pelo tema da aula, marcador de oferta, fileira "Para você conhecer".
- [x] Upsell e downsell na tela de obrigado (Pix novo com um toque), combos (order bump), upgrade, presente, plano equipe (vagas), cupom só na primeira compra, indique um amigo.
- [ ] Cartão salvo e 1 clique: não feito. Precisa do cartão digitado no nosso checkout (caminho A, tokenização do Asaas); hoje o cartão é na página do Asaas.
- [ ] 2 e 3 cartões e assinatura (cartão e Pix Automático): não feito. O primeiro depende do caminho A; o segundo, de um produto por assinatura.
- [x] Recuperação de carrinho, Pix e cartão recusado (e-mail pelo relógio).
- [x] Pixel da Meta e API de Conversões, GA4, Google Ads.
- [x] Nota fiscal automática (Asaas, liga em Integrações).
- [x] "Nota de venda" do post em Desempenho.

**PARE.**

### Fase E. Engajar (feita em 23/10/2026, no computador)
- [x] XP, selos, níveis, ranking.
- [x] Desafios, mural de criações, moldura de criador.
- [x] Feedback que vira material e depoimentos na landing.
- [x] Banners, avisos, eventos ao vivo e sino. [ ] Push no celular: não feito (pede chaves VAPID e, no iPhone, o app instalado); o sino e o e-mail cobrem.
- [x] Turmas (em Números) e resumo semanal por e-mail.
- [x] Perfil público.

**PARE.**

### Fase F. Plataforma (feita em 23/10/2026, no computador)
- [x] Trilhas e vários cursos (montar curso, módulo, aula, arquivo e trilha pelo painel).
- [x] Tela de Integrações completa e webhooks de saída (assinados, com nova tentativa).
- [x] Números completos e relatório da semana por IA.
- [x] Ferramentas novas no conector do Claude (área: números, vendas, alunos, liberar curso, dúvidas, cupons, avisos).
- [x] Indique um amigo. [ ] Afiliados e coprodução (divisão de pagamento do Asaas): depois, quando houver parceiro.
- [x] Curso vivo (aula atualizada avisa quem já viu).

Conferência: `node scripts/conferir-area.mjs` (Fase B), `conferir-turma.mjs` (C e E) e `conferir-plataforma.mjs` (D e F), com os dois servidores locais ligados.

---

## 16. O que preciso do dono

**Antes da Fase B:**
1. **Asaas:**
   - criar a conta (CNPJ), uma conta separada no sandbox, e gerar as chaves dos dois. Você cria; eu nunca digito senha;
   - cadastrar uma chave Pix;
   - pedir ao suporte: token de cartão (1 clique) e 3D Secure em produção;
   - informar há quanto tempo o CNPJ existe (Pix Automático pede 6 meses);
   - se quiser a nota automática, os dados fiscais da empresa.
2. **Cartão:** caminho A (no nosso checkout) ou B (na página do Asaas), seção 4.
3. **Panda:** conta no Bronze, chave da API e `curso.agenciasetup.com.br` nos domínios permitidos.
4. **Mini curso:** preço, garantia (7 dias?), parcelas (juros para quem compra ou "sem juros"?) e desconto no Pix.
5. **Resend:** conta e domínio de envio. São registros novos num subdomínio (ex.: `envio.agenciasetup.com.br`); o DNS de e-mail atual fica intocado (trava 3).
6. **OK para:**
   - a rota `curso.agenciasetup.com.br`;
   - as migrations;
   - o Workers Paid e o Supabase Pro;
   - o R2 (pede cartão na Cloudflare) ou o bucket privado do Supabase.
7. **Nome da área** (sugestões: "Setup Play", "Calango Play", ou só "Cursos da Setup").

**Antes da Fase C:**
- chave da API da Anthropic, o modelo do tutor e o teto de gasto por mês.

**Antes de abrir:**
- termos de uso e política da área de membros (eu escrevo, você aprova).

---

## 17. O que nenhuma plataforma entrega junto (nossas exclusividades)

1. Tutor que conhece a aula palavra por palavra, cita o minuto e **lê o print do erro**.
2. **Busca dentro do que foi falado**, com salto para o minuto.
3. **Faça agora** com "Abrir no Claude" (pedido pronto) e "Fazer cópia no meu Drive".
4. **Modo aplicar** e **pausa prática**: assistir e fazer ao mesmo tempo.
5. **Ficha do arquivo** com versão e aviso de "tem versão nova".
6. **Nota de venda por post**: o motor de engajamento passa a saber o que vende.
7. Depoimento aprovado **entra sozinho na landing**.
8. **Perfil público** com conquistas, criações e certificado (marketing feito pelo aluno).
9. **Curso vivo**: aula atualizada avisa quem já assistiu.
10. **Relatório semanal da IA** dizendo onde os alunos travam.
11. Reembolso pelo próprio aluno dentro da garantia (menos estorno no cartão).
12. **Plano equipe** para agências e **presente**.
13. Turmas por mês com resumo semanal, comunidade sem feed.
