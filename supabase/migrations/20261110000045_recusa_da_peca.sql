-- Por que o dono recusou o post (10/11/2026, pedido dele: "quando eu recusasse abrisse um porque eu recusei. Aí eu
-- escrevo e fica de aprendizado"). Ao recusar uma peça no painel, ele escreve o motivo e diz se o problema foi o texto,
-- a imagem ou os dois. O motivo fica aqui e vira lição no caderno do Redator, do Designer e do Revisor
-- (worker/lib/acoes.js, mudarStatusPeca). As tarefas de post leem as recusas pelo conector (posts_recusados).
-- { motivo, parte: 'texto' | 'imagem' | 'os_dois', em, por }
alter table pecas add column if not exists recusa jsonb;

-- As recusas mais novas primeiro, para a lista que as tarefas leem.
create index if not exists pecas_recusa_em on pecas (((recusa->>'em'))) where recusa is not null;
