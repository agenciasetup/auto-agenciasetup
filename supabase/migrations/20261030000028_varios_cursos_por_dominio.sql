-- Um endereço pode ter vários cursos (30/10/2026): agenciasetup.com tem o de posts e o de vídeos em inglês, e o app da marca
-- mostra os dois para quem tem os dois (worker/lib/marcas.js). O que continua único é o curso principal de cada endereço.
drop index cursos_marca_dominio;
create index cursos_marca_dominio on cursos ((marca->>'dominio')) where marca is not null;
create unique index cursos_marca_principal on cursos ((marca->>'dominio')) where (marca->>'principal') = 'true';
