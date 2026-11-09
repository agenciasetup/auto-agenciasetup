# Order bumps do mini curso (proposta, 23/10/2026)

O mini curso "Posts automáticos com Claude" custa R$ 39,90. O bump é a caixinha "Leve junto" no checkout: um clique, sem sair da página. O checkout já aceita até 2 bumps por oferta (Área de membros > Ofertas > a oferta > Pôr order bump), cada um com título e texto próprios.

**Criado em 23/10/2026 (ok do dono):** o bump 1, acesso vitalício por R$ 19,90 (oferta `acesso-vitalicio`, **desligada de propósito**: assim ela só entra junto com o curso e nunca se compra sozinha em `/checkout/acesso-vitalicio`). Conferido: com o bump o acesso fica sem prazo, sem ele fica 1 ano, o reembolso tira o acesso e o checkout de produção soma o bump no total. As outras ideias continuam como proposta.

Regras que valem para todos:

- **Preço do bump até metade do produto principal** (R$ 14,90 a R$ 24,90). Mais que isso, a pessoa para para pensar e a compra principal cai.
- **Complemento, não outro curso.** O bump resolve a próxima dúvida de quem acabou de decidir comprar.
- **No máximo 2 na tela.** Medir em Números (ticket médio e taxa de bump) por 2 semanas antes de trocar.

## As ideias, da mais fácil para a mais trabalhosa

### 1. Acesso vitalício (recomendo começar por esta)

- **Preço:** R$ 19,90.
- **Por que vende:** o curso principal dá 1 ano. O Claude muda rápido e o curso é "vivo" (aula refeita avisa o aluno). Quem compra quer garantir as atualizações.
- **Custo de produção:** zero.
- **Como entrega:** produto novo "Acesso vitalício" com acesso ao mesmo curso e **dias em branco** (sem prazo). Na mesma compra, o acesso sem prazo vence o de 1 ano (a função `liberar_pedido` já faz isso).
- **Texto da caixinha:** "**Sim, quero o acesso para sempre.** O curso muda junto com o Claude: toda aula nova ou refeita fica sua, sem prazo de 1 ano. Só nesta página, R$ 19,90."

### 2. Pauta pronta: 90 posts e 60 "Comenta PALAVRA"

- **Preço:** R$ 14,90.
- **Por que vende:** o maior medo de quem começa é "e se eu não tiver assunto?". Mesmo com o radar, ter 90 ideias separadas por objetivo (alcance, engajamento, venda) tira o bloqueio da primeira semana.
- **Custo de produção:** baixo. Uma planilha e um arquivo `.md` que o Claude importa direto para o quadro do aluno, mais 60 palavras-chave com a ideia de material grátis para cada uma (o que já fazemos no @agenciasetup).
- **Como entrega:** um "curso" curto só de materiais (sem aula), com os arquivos para baixar na área de membros.
- **Texto da caixinha:** "**Leve 90 pautas prontas.** Ideias de post por objetivo e 60 palavras para o seu 'Comenta PALAVRA', no formato que o Claude já põe no seu quadro. R$ 14,90."

### 3. Pack de 10 modelos de carrossel no padrão Setup

- **Preço:** R$ 19,90 a R$ 24,90.
- **Por que vende:** o curso traz um modelo de arte. Com 10, o feed não fica repetido: lista, antes e depois, polêmica com virada, passo a passo, citação, comparação, bastidor, resultado, pergunta e chamada para comentar.
- **Custo de produção:** médio. Saem do mesmo motor de carrossel em camadas que já usamos (`templates/carrossel/`), cada um com uma prévia.
- **Como entrega:** curso só de materiais, com o `.zip` dos modelos e a prévia de cada um.
- **Texto da caixinha:** "**Mais 10 modelos de carrossel.** Os formatos que mais engajam no @agenciasetup, prontos para o Claude preencher no seu estilo. R$ 19,90."

### 4. Radar pronto por nicho (12 nichos)

- **Preço:** R$ 24,90.
- **Por que vende:** montar o radar é a parte em que mais gente trava (quais sites, perfis e termos olhar). Com o nicho pronto, a aula 3.1 leva 5 minutos.
- **Custo de produção:** médio. Para cada nicho (nutrição, estética, advocacia, imobiliária, moda, gastronomia, fitness, educação, pet, loja local, social media, designer): fontes, perfis de referência, termos de busca e 5 exemplos de gancho. Precisa de revisão humana.
- **Como entrega:** curso só de materiais, um arquivo por nicho.
- **Texto da caixinha:** "**Seu radar já montado.** Fontes, perfis e termos do seu nicho, prontos para o Claude procurar assunto todo dia. 12 nichos. R$ 24,90."

### Fora do bump (para depois)

- **Aula bônus: Reels e stories no automático** (R$ 27,90): boa, mas exige produzir aulas novas. Fica como produto próprio ou upsell.
- **Montagem guiada ao vivo** (R$ 197, poucas vagas): 45 minutos de chamada para montar junto. Caro demais para caixinha; funciona como oferta na página de obrigado ou no e-mail do dia 3.

## Recomendação

1. Agora: **acesso vitalício** (custo zero, entrega automática).
2. Em seguida: **pauta pronta** (rápida de fazer e fala com o medo de começar).
3. Depois de 2 semanas de números, testar o **pack de modelos** no lugar do que vender menos.

## Como criar no painel (quando decidir)

1. Área de membros > Ofertas > **Nova oferta**: nome do bump, preço e o produto (cria junto).
2. Na oferta nova, em **acessos**, escolha o curso e os dias (em branco = sem prazo).
3. Na oferta principal (`posts-automaticos`), **Pôr order bump**: escolha a oferta nova e escreva o título e o texto da caixinha.
4. Confira no checkout (`/checkout/posts-automaticos`) e faça uma compra de teste com reembolso.
