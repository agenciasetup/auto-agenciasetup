# Modelos prontos

Seu bônus da conquista dos 7 dias: 4 estilos de carrossel que aparecem no curso, prontos para editar. Cada pasta é um modelo inteiro, com os textos, o visual e o robô que transforma em imagem (PNG 1080 x 1350, o tamanho 4:5 do Instagram).

| Pasta | Estilo | Bom para |
| --- | --- | --- |
| `1-Padrao-Setup` | O modelo em camadas do curso: capa com palavra gigante, celular desenhado, notificação e "Comenta PALAVRA" | qualquer nicho, conteúdo do dia |
| `2-Advocacia` | Escuro, vidro e verde-limão, no jeito do iPhone | advocacia, contabilidade, finanças, saúde |
| `3-Elegante` | Tom quente, monograma dourado, serifa itálica e a sua foto | eventos, mentorias, beleza, moda |
| `4-Religioso` | Pintura escura, texto claro e uma palavra em letra manuscrita | conteúdo católico e cristão, reflexão |

## Como usar (o jeito fácil)

1. Descompacte e guarde a pasta em Documentos.
2. Abra o Claude na pasta do seu projeto (aba Code) e arraste a pasta do modelo para a conversa.
3. Cole o pedido pronto do `LEIA.md` da pasta, trocando o nicho e o assunto.
4. Revise as etapas que ele mostrar (1, 3 e a final) e aprove.

## Para ver ou exportar à mão

- Ver: abra o `.html` no navegador e acrescente `?s=2` no endereço para ir ao slide 2.
- Exportar: no terminal, dentro da pasta do modelo, `node exportar.mjs` (no Padrão Setup, `node ferramentas/exportar.mjs criado-no-claude`). Na primeira vez, rode `npm install puppeteer`.

As pinturas do Religioso são exemplos feitos com IA. Os números e os textos são de exemplo: no seu post, use os seus dados.
