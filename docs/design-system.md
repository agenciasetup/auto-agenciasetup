# Sistema de design do site

Escuro, limpo, no jeito do iOS. O laranja da agência aparece só onde chama a ação. Código em `public/estatico/site.css` (tokens no topo), ícones em `worker/render/icones.js`, comportamento em `public/estatico/site.js`.

## Princípios de UX

1. **Clareza em 3 segundos.** O topo diz o que é (recursos e agentes de IA), para quem (quem cria conteúdo) e quanto custa (grátis, sem cadastro). A ação principal é uma só: buscar.
2. **Um botão principal por tela.** Recurso: "Baixar grátis". Agente: "Abrir no ChatGPT/Claude". Sempre laranja, sempre no mesmo lugar (cartão lateral no computador, barra flutuante no celular).
3. **Celular é app.** Abas embaixo (Início, Recursos, Agentes, Novidades, Buscar), busca em tela cheia, filtros numa folha que sobe de baixo, toque com resposta (leve encolhida).
4. **Tudo é link.** Filtros, busca e páginas viram endereços que dá para compartilhar e voltar. Funciona sem JavaScript; o JS só acelera.
5. **Movimento com propósito.** Seções aparecem na rolagem (subir 18 px, desfoque saindo); capa "voa" da lista para a página; nada pisca. Quem pede menos movimento no aparelho não vê animação.
6. **Nunca sem cara.** Recurso sem imagem ganha capa feita em código, no tom do tipo.

## Tokens

| Grupo | Token | Valor |
| --- | --- | --- |
| Fundo | `--bg` / `--bg-2` / `--bg-3` / `--bg-4` | `#09090a` / `#111113` / `#18181b` / `#212125` |
| Linha | `--linha` / `--linha-2` | branco 7% / 12% |
| Texto | `--texto` / `--texto-2` / `--texto-3` | `#f5f5f7` / `#a1a1aa` / `#74747c` |
| Marca | `--marca` / `--marca-2` / `--degrade` | `#ff7a00` / `#ffb000` / âmbar para laranja |
| Tipos | `--c-agente`, `--c-prompt`, `--c-template`, `--c-planilha`, `--c-automacao`, `--c-guia`, `--c-pack` | cores do sistema iOS |
| Raio | `--raio-s` 12 · `--raio` 18 · `--raio-l` 24 · `--raio-xl` 32 · pílula 999 | |
| Fonte | `--fonte` Inter · `--serifa` Instrument Serif itálico · `--mono` SF Mono | |
| Movimento | `--suave` cubic-bezier(.22,1,.36,1) · `--mola` (toques) | 160 a 700 ms |

**Tipografia:** `.t-display` (herói), `.t-titulo` (seções), `.t-sub`, `.t-lead`. Títulos com espaçamento negativo. Uma palavra por título pode ir em `.serifa` (itálico, laranja ou degradê), como nos carrosséis de 2026.

## Componentes

| Componente | Classe | Uso |
| --- | --- | --- |
| Botões | `.bt`, `.bt-marca` (ação principal), `.bt-tingido`, `.bt-simples`, `.bt-g`, `.bt-cheio`, `.bt-icone` | um `.bt-marca` por tela |
| Etiqueta | `.etiqueta` com `--c` | tipo do recurso |
| Chips e segmentos | `.chips` + `.chip`, `.segmentos` | filtros por tipo |
| Painel | `.painel`, `.painel-vidro` | qualquer bloco elevado |
| Cartão de recurso | `.cartao` + `.capa` / `.capa-auto` | grades e trilhos |
| Bento | `.bento` + `.bloco` (`.bloco-largo`) | assuntos |
| Trilho | `.trilho` | carrossel horizontal (arrasta no celular) |
| Folha | `dialog.folha` | filtros no celular |
| Busca | `dialog.busca-caixa` | Ctrl/⌘ K, "/", ícone; resultados por `/api/busca` |
| Barra de ação | `.barra-acao` | "Baixar"/"Abrir" flutuante no celular |
| Anúncio | `.anuncio` | cursos da agência |
| Receber novidades | `.receber` + `.form-email` | e-mail para `/api/lead` |
| Vazio | `.vazio` | toda lista tem estado vazio com próximo passo |

## Revisar o visual no computador

Com `AMBIENTE=local` e `DEMO=1` no `.dev.vars`, as páginas públicas usam exemplos (`worker/lib/demo.js`) em vez do banco: dá para ver as telas cheias sem publicar nada. Volte para `DEMO=0` antes de rodar as conferências.
