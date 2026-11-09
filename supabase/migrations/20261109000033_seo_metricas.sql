-- Fase C de SEO e GEO (docs/seo-geo.md): os números do Google Search Console dentro do painel.
-- O relógio importa todo dia pela conta robô (worker/lib/searchconsole.js). site: "sc-domain:agenciasetup.com.br" ou
-- "sc-domain:agenciasetup.com".

-- O dia a dia do site inteiro (os últimos 90 dias): o gráfico e a comparação com os 28 dias antes.
create table seo_dias (
  site text not null,
  dia date not null,
  cliques integer not null default 0,
  impressoes integer not null default 0,
  ctr real,
  posicao real,
  primary key (site, dia)
);
alter table seo_dias enable row level security;

-- Os últimos 28 dias por página, por busca e por par busca + página (de onde saem as oportunidades).
-- Cada importação troca as linhas do site inteiro: a tabela fica sempre pequena.
create table seo_itens (
  id bigint generated always as identity primary key,
  site text not null,
  tipo text not null check (tipo in ('pagina','consulta','par')),
  consulta text,
  pagina text,
  cliques integer not null default 0,
  impressoes integer not null default 0,
  ctr real,
  posicao real,
  inicio date,
  fim date,
  importado_em timestamptz not null default now()
);
create index seo_itens_site_tipo on seo_itens (site, tipo, impressoes desc);
alter table seo_itens enable row level security;
