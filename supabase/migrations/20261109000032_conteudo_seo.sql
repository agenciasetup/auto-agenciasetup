-- Fase B de SEO e GEO (docs/seo-geo.md): o artigo do site com o que o Google e as IAs pedem para confiar e citar.
-- Autor de verdade (com página), resposta rápida no topo, perguntas e respostas, a busca que a página quer ganhar,
-- o assunto (o grupo de páginas) e o aviso de afiliado.

-- Quem assina ou revisa. Página própria em /autor/<slug>; perfis viram sameAs (só perfis reais, nunca inventar).
create table autores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  cargo text,
  bio text,
  foto_url text,
  perfis text[] not null default '{}',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table autores enable row level security;
create trigger autores_tocar before update on autores for each row execute function tocar_atualizado();

-- O fundador, com o texto do site do Calango Studio (nosso).
insert into autores (slug, nome, cargo, bio, foto_url, perfis) values (
  'filipe-lourenco', 'Filipe Lourenço', 'Designer e Empreendedor Digital',
  'Filipe Lourenço é designer, empreendedor digital e educador em design gráfico e criação de conteúdo. Fundador da Agência Setup e criador do Calango Studio, hoje ensina a usar IA para criar posts no Social Media e no Design.',
  '/img/filipe.webp', '{https://instagram.com/lipealourenco,https://instagram.com/agenciasetup}'
) on conflict (slug) do nothing;

-- O artigo: tipo, assunto (vira o endereço: /ia, /equipamentos, /tutoriais, /guias ou /novidades), a busca-alvo,
-- a intenção, a resposta rápida, as perguntas, autor e revisor, quando os preços foram conferidos e se tem afiliado.
alter table artigos
  add column tipo text not null default 'noticia' check (tipo in ('noticia','guia','artigo','tutorial','comparativo','review')),
  add column assunto text not null default 'novidades' check (assunto in ('novidades','ia','equipamentos','tutoriais','guias')),
  add column consulta_alvo text,
  add column intencao text check (intencao in ('informacional','comparacao','compra','navegacao')),
  add column resposta text,
  add column faqs jsonb not null default '[]',
  add column autor_id uuid references autores(id) on delete set null,
  add column revisor_id uuid references autores(id) on delete set null,
  add column conferido_em date,
  add column afiliado boolean not null default false;
create index artigos_assunto on artigos (assunto, status, publicado_em desc);
