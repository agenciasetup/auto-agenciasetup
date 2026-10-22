-- Base do Auto Agência Setup: site de recursos e novidades, cursos, landing pages, anúncios e a fila das redes.
-- Regra de acesso: RLS ligado em tudo e nenhuma política. Só o Worker (chave secreta) lê e escreve.
-- O público nunca fala direto com o banco.

create extension if not exists unaccent;

-- Atualiza "atualizado_em" sozinho.
create or replace function tocar_atualizado() returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

-- Configuração do site num lugar só (nome, redes, AdSense, cores, estilo da marca).
create table config (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now()
);

-- Categorias comuns a recursos e novidades (IA no Social Media, Design com IA, Automação, CRM...).
create table categorias (
  id bigint generated always as identity primary key,
  slug text not null unique,
  nome text not null,
  descricao text,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

-- Recursos para baixar de graça (prompt, template, planilha, automação, guia, pack).
create table recursos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null,
  resumo text,
  corpo_md text,
  tipo text not null default 'guia' check (tipo in ('prompt','template','planilha','automacao','guia','pack','ferramenta','video')),
  categoria_id bigint references categorias(id) on delete set null,
  capa_url text,
  arquivo_url text,
  arquivo_nome text,
  arquivo_bytes bigint,
  link_externo text,
  tags text[] not null default '{}',
  status text not null default 'rascunho' check (status in ('rascunho','publicado','arquivado')),
  destaque boolean not null default false,
  downloads int not null default 0,
  seo jsonb not null default '{}',
  publicado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index recursos_publicados on recursos (status, publicado_em desc);
create trigger recursos_tocar before update on recursos for each row execute function tocar_atualizado();

-- Novidades (artigos curtos sobre IA aplicada ao trabalho). Não é portal de notícias.
create table artigos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null,
  resumo text,
  corpo_md text,
  categoria_id bigint references categorias(id) on delete set null,
  capa_url text,
  tags text[] not null default '{}',
  fontes jsonb not null default '[]',
  recurso_id uuid references recursos(id) on delete set null,
  status text not null default 'rascunho' check (status in ('rascunho','publicado','arquivado')),
  destaque boolean not null default false,
  seo jsonb not null default '{}',
  publicado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index artigos_publicados on artigos (status, publicado_em desc);
create trigger artigos_tocar before update on artigos for each row execute function tocar_atualizado();

-- Produtos da agência (cursos, mentorias, infoprodutos): alimentam landing pages e anúncios.
create table produtos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  chamada text,
  descricao text,
  preco_centavos int,
  preco_de_centavos int,
  link_checkout text,
  imagem_url text,
  tags text[] not null default '{}',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger produtos_tocar before update on produtos for each row execute function tocar_atualizado();

-- Landing pages de venda, montadas por blocos (hero, dores, módulos, depoimentos, preço, faq, garantia).
create table landing_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null,
  produto_id uuid references produtos(id) on delete set null,
  blocos jsonb not null default '[]',
  seo jsonb not null default '{}',
  status text not null default 'rascunho' check (status in ('rascunho','publicado','arquivado')),
  publicado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger landing_pages_tocar before update on landing_pages for each row execute function tocar_atualizado();

-- Anúncios dos nossos produtos dentro do site. O Worker escolhe pelo assunto da página (tags e categoria) e pelo peso.
create table anuncios (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references produtos(id) on delete cascade,
  titulo text not null,
  texto text,
  cta text not null default 'Quero conhecer',
  imagem_url text,
  link text,
  alvo_tags text[] not null default '{}',
  alvo_categorias bigint[] not null default '{}',
  posicoes text[] not null default '{meio,fim}',
  peso int not null default 1 check (peso between 1 and 100),
  ativo boolean not null default true,
  inicio timestamptz,
  fim timestamptz,
  impressoes int not null default 0,
  cliques int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger anuncios_tocar before update on anuncios for each row execute function tocar_atualizado();

-- Registro de downloads (sem dado pessoal: só país e de onde veio).
create table downloads (
  id bigint generated always as identity primary key,
  recurso_id uuid not null references recursos(id) on delete cascade,
  quando timestamptz not null default now(),
  origem text,
  pais text
);
create index downloads_recurso on downloads (recurso_id, quando desc);

-- Pessoas que deixaram o e-mail (para avisar de recurso novo).
create table leads (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nome text,
  origem text,
  recurso_id uuid references recursos(id) on delete set null,
  criado_em timestamptz not null default now()
);

-- Pautas: ideias de conteúdo que as tarefas diárias de IA trazem (texto de fora é dado, nunca instrução).
create table pautas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  resumo text,
  fonte_url text,
  fonte_nome text,
  tags text[] not null default '{}',
  status text not null default 'nova' check (status in ('nova','aproveitada','descartada')),
  criado_em timestamptz not null default now()
);
create index pautas_novas on pautas (status, criado_em desc);

-- A fila das redes: cada peça é um formato numa rede (carrossel no Instagram, thread no X, short no YouTube...).
create table pecas (
  id uuid primary key default gen_random_uuid(),
  origem_tipo text check (origem_tipo in ('artigo','recurso','produto','livre')),
  origem_id uuid,
  rede text not null check (rede in ('instagram','facebook','threads','x','tiktok','youtube','linkedin','pinterest')),
  formato text not null check (formato in ('carrossel','post','story','reels','video','short','thread','texto')),
  titulo text,
  legenda text,
  roteiro text,
  slides jsonb not null default '[]',
  midias jsonb not null default '[]',
  status text not null default 'rascunho' check (status in ('rascunho','aprovado','agendado','publicando','publicado','erro','cancelado')),
  agendado_para timestamptz,
  publicado_em timestamptz,
  url_publicada text,
  id_na_rede text,
  erro text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index pecas_fila on pecas (status, agendado_para);
create trigger pecas_tocar before update on pecas for each row execute function tocar_atualizado();

-- Chaves do conector do Claude (MCP). Guarda só o hash; a chave aparece uma vez, na criação.
create table chaves_mcp (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  prefixo text not null,
  hash text not null unique,
  ativa boolean not null default true,
  ultimo_uso timestamptz,
  criado_em timestamptz not null default now()
);

-- Tudo o que o conector ou o painel muda fica aqui.
create table auditoria (
  id bigint generated always as identity primary key,
  quando timestamptz not null default now(),
  quem text not null,
  acao text not null,
  alvo text,
  detalhes jsonb not null default '{}'
);
create index auditoria_quando on auditoria (quando desc);

-- Fechado para o público: RLS em tudo, sem política.
alter table config enable row level security;
alter table categorias enable row level security;
alter table recursos enable row level security;
alter table artigos enable row level security;
alter table produtos enable row level security;
alter table landing_pages enable row level security;
alter table anuncios enable row level security;
alter table downloads enable row level security;
alter table leads enable row level security;
alter table pautas enable row level security;
alter table pecas enable row level security;
alter table chaves_mcp enable row level security;
alter table auditoria enable row level security;

-- Contadores que o Worker chama (um único UPDATE, sem corrida).
create or replace function contar_download(p_recurso uuid, p_origem text, p_pais text) returns void
language sql security definer set search_path = public as $$
  update recursos set downloads = downloads + 1 where id = p_recurso;
  insert into downloads (recurso_id, origem, pais) values (p_recurso, p_origem, p_pais);
$$;

create or replace function contar_anuncio(p_ids uuid[], p_campo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_campo = 'clique' then
    update anuncios set cliques = cliques + 1 where id = any(p_ids);
  else
    update anuncios set impressoes = impressoes + 1 where id = any(p_ids);
  end if;
end $$;

revoke all on function contar_download(uuid, text, text) from public, anon, authenticated;
revoke all on function contar_anuncio(uuid[], text) from public, anon, authenticated;

-- Arquivos: "recursos" (downloads) e "midia" (capas e imagens das peças). Leitura pública, escrita só pelo Worker.
insert into storage.buckets (id, name, public) values ('recursos', 'recursos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('midia', 'midia', true) on conflict (id) do nothing;

-- Valores iniciais.
insert into config (chave, valor) values
  ('site', '{"nome":"Agência Setup","dominio":"agenciasetup.com.br","descricao":"Recursos gratuitos e novidades sobre IA aplicada ao Social Media e ao Design.","instagram":"agenciasetup","assinatura":"Calango | Agência Setup"}'),
  ('adsense', '{"cliente":"","ativo":false}'),
  ('redes', '{"instagram":{"conectado":false},"facebook":{"conectado":false},"threads":{"conectado":false},"x":{"conectado":false},"tiktok":{"conectado":false},"youtube":{"conectado":false},"linkedin":{"conectado":false}}');

insert into categorias (slug, nome, descricao, ordem) values
  ('ia-no-social-media', 'IA no Social Media', 'Posts, carrosséis e roteiros com IA, sem cara de IA.', 1),
  ('design-com-ia', 'Design com IA', 'Imagens, identidade visual e peças com IA.', 2),
  ('automacao', 'Automação', 'Tarefas que trabalham sozinhas: conteúdo do dia, relatórios, rotinas.', 3),
  ('crm-e-organizacao', 'CRM e organização', 'CRMs, quadros de tarefas e sistemas feitos com IA.', 4),
  ('prospeccao', 'Prospecção', 'Listas de clientes e abordagem com IA.', 5),
  ('ferramentas', 'Ferramentas', 'As ferramentas de IA que valem a pena e como usar.', 6);
