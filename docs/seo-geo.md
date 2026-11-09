# SEO e GEO: plano do site (agenciasetup.com.br)

Pedido do dono (09/11/2026): conteúdo 100% para SEO (Google) e GEO (ser a resposta citada pelo ChatGPT, Gemini, Perplexity e Claude), que venda os nossos cursos e possa ganhar com afiliados no futuro. Assuntos: tudo sobre IA, eletrônicos para quem trabalha com design, notícias de IA, tutoriais que vendem o curso e os melhores cursos de design do mercado (com os nossos).

Referências: `calangopro/jk-portal` (o portal da JK, com SEO, GEO, métricas e conector) e `agenciasetup/calangostudio-landing` (cerca de 80 páginas de SEO já escritas).

Ok do dono para começar em 09/11/2026 ("Pode começar"). As fases A, B e C estão no ar; as outras esperam o ok de cada uma.

---

## 1. Onde estamos

- **Sitemap enviado ao Search Console em 09/11:** 25 páginas (início, listas, 19 recursos, 2 páginas de venda). As três principais pediram indexação.
- **Novidades está vazia:** nenhum artigo publicado.
- **Já temos:** canonical, Open Graph, `WebSite` com busca na página inicial, `CreativeWork` nos recursos e `Course` na página de venda, sitemap e robots.
- **Falta:**
  - `llms.txt`;
  - `Article` e `FAQPage`;
  - página de autor;
  - "resposta rápida" no topo;
  - IndexNow (avisa o Bing na hora, e o ChatGPT busca pelo índice do Bing);
  - os números do Search Console dentro do painel.
- **O `agenciasetup.com` abriu para o Google em 09/11** (ok do dono): a página de venda, os materiais grátis em `/free/` e os termos, com sitemap próprio e propriedade no Search Console. O `duvidasdafe.agenciasetup.com.br` continua fechado (`Disallow: /`).
- **O Calango Studio está fora do ar** (`calangostudio.com.br` responde 402). As cerca de 80 páginas dele (Nano Banana, IA grátis, banco de imagens, criativos, freelancer, social media, comparativos) são nossas, estão escritas para SEO e hoje não rendem nada.

## 2. Regras que seguram tudo

1. **Responder primeiro.** Toda página abre com a resposta em 40 a 60 palavras ("Resposta rápida"), depois explica. É o trecho que o Google põe em destaque e que a IA cita.
2. **Nomear quem fala.**
   - "Agência Setup" e "Filipe Lourenço" aparecem por extenso.
   - Toda página tem autor, com uma página de autor (quem é, o que faz, Instagram e YouTube) e a data de "Atualizado em".
   - O Google pergunta "quem escreveu e por que confiar".
3. **Experiência de verdade.**
   - Comparativo e "melhor X" só com teste ou uso real, com prints e fotos nossas.
   - O Google rebaixa texto genérico feito em massa (a regra "conteúdo em escala"). Melhor 3 páginas boas por semana do que 30 rasas.
4. **Notícia nunca é cópia.** Copiar a matéria de outro site é infringir direito autoral, e o Google trata texto duplicado como sem valor. Do RSS sai a **pauta**. O texto é nosso:
   - o fato em 2 ou 3 frases;
   - o que muda para quem faz design e social media;
   - como usar hoje;
   - o link para a fonte original.
   É o mesmo jeito do Olhar de Fé.
5. **Afiliado às claras.**
   - Link com `rel="sponsored"` e um aviso curto ("ganhamos uma comissão se você comprar pelo link, sem custo para você").
   - Preço sempre com a data em que foi conferido, ou sem preço.
   - Nunca nota ou avaliação inventada.
6. **Sem travessão, frase clara**, como no resto do site.

## 3. Os assuntos (clusters) e os endereços

Cada assunto tem uma **página pilar** (a dúvida ampla) e páginas filhas (as perguntas específicas), todas ligadas entre si e ao curso.

| Assunto | Endereço | Pilar | Exemplos de páginas | Como vende |
| --- | --- | --- | --- | --- |
| IA | `/ia` | Guia de IA para designer e social media | Claude x ChatGPT para designer; o que é o Claude Code; melhores IAs grátis; Nano Banana: como usar | Oferta do mini curso no fim |
| Equipamentos | `/equipamentos` | O setup do designer em 2026 | Melhor Mac para designer; melhor notebook custo-benefício; melhor SSD para edição; montar um PC barato para design; melhor celular para design | Afiliado (Amazon, Mercado Livre, Magalu, Kabum) |
| Novidades | `/novidades` | (lista) | Saiu o modelo X: o que muda no seu post | Recurso grátis com "Comenta" e o curso |
| Tutoriais | `/tutoriais` | Como fazer posts automáticos com IA | Carrossel no Claude; calendário do mês; legenda com IA; pasta de cliente | É o curso: cada tutorial termina nele |
| Cursos | `/cursos` | Melhores cursos de design e IA | Melhores cursos de design do mercado; curso de social media com IA; vale a pena? | Comparativo honesto, o nosso marcado como nosso |
| Ferramentas | `/ferramentas` | (lista) | Calculadora de preço de post; gerador de paleta; contador de caracteres do Instagram | Ferramenta útil ganha link e volta; termina no curso |

As ferramentas interativas são o que mais ganha link sozinho e o que a IA mais recomenda, e o jk-portal tem esse mesmo tipo de página.

**O que vem do Calango Studio:** as cerca de 80 páginas entram nesses assuntos. Revisamos cada uma, tiramos o que era do produto Calango Studio, pomos o curso no lugar e atualizamos.
- Se o domínio ainda for nosso, ele aponta (301) para as páginas novas, e o pouco de autoridade que ele tinha passa para cá.
- Mexer no DNS e no domínio só com o ok do dono.

## 4. O que entra no painel

Na ordem, cada fase entregue e conferida antes da próxima. O que muda o banco é migration nova; publicar e o deploy, só com ok.

### Fase A. Base técnica (rápida, sem tabela nova)

No ar em 09/11/2026, versão `c713bad5` (`worker/lib/seo.js`; detalhes em `docs/decisoes.md`). Fica de fora o sitemap de notícias, que entra com as notícias na Fase D.

- **`/llms.txt`:** o mapa do site para as IAs, gerado do banco como o sitemap.
- **robots:** libera nominalmente os robôs de IA (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended).
- **Dados estruturados:**
  - `Organization` (com Instagram e YouTube em `sameAs`) e `Person` (o Filipe);
  - `Article` e `NewsArticle` nas novidades;
  - `BreadcrumbList` em todas as páginas;
  - `FAQPage` onde tiver perguntas;
  - `ItemList` nos "melhores".
- **Sitemap por tipo** (recursos, artigos, cursos) e o de notícias para as novidades.
- **IndexNow:** ao publicar ou atualizar, avisa Bing e Yandex na hora, de graça. O ChatGPT busca pelo Bing.
- **Decisão do dono:** abrir para o Google a página de venda do Dúvidas da Fé (o leitor e o checkout continuam fechados). O `agenciasetup.com` já abriu em 09/11.
- **O dono, uma vez:** ligar o Bing Webmaster Tools importando do Search Console (2 minutos, de graça).

### Fase B. Conteúdo de verdade no painel

No ar em 09/11/2026, versão `6334fd70` (detalhes em `docs/decisoes.md`). As páginas pilar de cada assunto aparecem sozinhas quando o primeiro artigo do assunto é publicado. As ferramentas interativas (`/ferramentas`) ficaram para depois.

- **Um tipo de conteúdo só, com variações** (a tabela `artigos` cresce):
  - guia, artigo, notícia, tutorial, comparativo ou review;
  - campos novos: consulta-alvo (a busca que a página quer ganhar), intenção, resposta rápida, perguntas e respostas, autor e revisor, fontes, assunto (cluster), produtos citados e "conferido em".
- **Blocos no editor:**
  - tabela comparativa;
  - prós e contras;
  - caixa de produto (foto, para quem é, link de afiliado);
  - passo a passo;
  - chamada para o curso;
  - fonte.
- **Autores:** tabela `autores` e página `/autor/filipe-lourenco`.
- **Analisador de SEO e GEO, sem IA e sem custo** (o `rules.ts` do jk-portal). Enquanto a pessoa escreve, dá uma nota e diz o que falta: título e descrição no tamanho, um H1, resposta rápida, perguntas, links internos de entrada e saída, imagem com texto alternativo, travessão, e duas páginas brigando pela mesma busca (canibalização). Só barra o que é defeito objetivo.
- **Páginas novas:** `/ia`, `/equipamentos`, `/tutoriais`, `/ferramentas` e as pilares, no sistema de design do site.

### Fase C. Números de SEO no painel

No ar em 09/11/2026, versão `62991220` (detalhes em `docs/decisoes.md`). Falta o dono criar a conta robô (`docs/search-console-automatico.md`). Os cliques de afiliado ficaram para a Fase E.

- **Search Console automático,** de graça, por uma "conta robô" do Google (o passo a passo do jk-portal, 15 minutos do dono).
  - O relógio busca os últimos 28 dias toda semana.
  - A tela **SEO** mostra cliques, impressões, posição e CTR por página e por busca.
- **Oportunidades viram pautas sozinhas:**
  - busca com muita impressão e pouco clique (melhorar título e descrição);
  - posição de 5 a 20 (reforçar a página);
  - busca sem página (escrever uma nova).
- **Cliques de afiliado** pelo `/ir/` que já existe, com a página de origem.

### Fase D. A fábrica de conteúdo com o Claude

- **No conector em modo código, as operações de SEO:**
  - ler oportunidades;
  - criar rascunho;
  - conferir com o analisador;
  - publicar (pede sim);
  - avisar o IndexNow.
- **Notícias:** o radar "Em alta" já lê 25 fontes. A notícia quente vira pauta, o Claude escreve a nota no nosso ângulo, com a fonte, como rascunho, e o dono aprova.
- **Uma tarefa agendada:** 1 ou 2 notas por dia nos horários de pico, só rascunho. Gasta limite do Claude: começar com uma por dia e medir.
- **Toda nota e todo tutorial levam** o recurso grátis ligado e a oferta do mini curso no fim.

### Fase E. Afiliados (quando tiver tráfego)

- Programas: Amazon Associados, Mercado Livre, Magalu Parceiro, Kabum, e Hotmart ou Kiwify para curso de terceiros.
- Link curto por produto (`/ir/`), com aviso e `sponsored`.
- Relatório de cliques por página e por produto.

## 5. As primeiras pautas (sugestão)

Ordem pensada para vender o curso primeiro e abrir os assuntos de afiliado em seguida:

1. Como fazer posts automáticos com IA (pilar de Tutoriais; o curso é a resposta).
2. Claude x ChatGPT para designer e social media.
3. Melhores IAs grátis para criar posts (do Calango Studio, atualizada).
4. Como criar carrossel no Claude, passo a passo.
5. Nano Banana: como usar (do Calango Studio, atualizada).
6. Melhores cursos de design e social media com IA (o nosso marcado como nosso).
7. Melhor Mac para designer em 2026.
8. Melhor notebook custo-benefício para design.
9. Como montar um PC barato para design e edição.
10. Melhor celular para trabalhar com design.

Mais 1 ou 2 notícias por dia pela Fase D.

## 6. Como medir

- **Linha de base** de 09/11/2026: 25 páginas no sitemap. Os números do Search Console chegam em cerca de um dia.
- **Todo mês:** páginas indexadas, impressões, cliques, buscas novas em que aparecemos, posição média dos assuntos, cliques para o curso e vendas com origem "Google" (o `canalDe` já separa a busca orgânica).
- **GEO:** perguntar todo mês ao ChatGPT, Gemini, Perplexity e Claude as 10 perguntas das pautas e anotar se citam a Agência Setup.

## 7. O que precisa do dono

- **Ok para este plano** e para a ordem das fases.
- **Decisões:**
  - abrir para o Google a página de venda do Dúvidas da Fé;
  - o que fazer com o domínio do Calango Studio.
- **15 minutos uma vez:** a conta robô do Search Console (Fase C) e o Bing Webmaster Tools (Fase A).
