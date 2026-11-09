-- Área de membros, Fase F (Plataforma) de docs/area-de-membros.md: trilhas (pedaços de vários cursos, por objetivo),
-- avisos para outros sistemas (webhooks de saída: n8n, Make, Zapier) e o relatório da semana feito pela IA.
-- Mesma regra do resto do banco: RLS ligado e nenhuma política. Só o Worker (chave secreta) lê e escreve.

-- ============================================================ trilhas
-- itens: [{ "tipo": "curso"|"modulo"|"aula", "id": "<uuid>", "titulo": "..." }] na ordem.
create table trilhas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  titulo text not null,
  descricao text,
  objetivo text,
  itens jsonb not null default '[]',
  ordem int not null default 0,
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger trilhas_tocar before update on trilhas for each row execute function tocar_atualizado();
alter table trilhas enable row level security;

-- ============================================================ webhooks de saída
create table webhooks_saida (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  url text not null check (url ~ '^https://'),
  eventos text[] not null default '{}',
  segredo text not null,
  ativo boolean not null default true,
  falhas int not null default 0,
  ultimo_envio timestamptz,
  ultimo_status int,
  criado_em timestamptz not null default now()
);
alter table webhooks_saida enable row level security;

create table webhook_envios (
  id bigint generated always as identity primary key,
  webhook_id uuid not null references webhooks_saida(id) on delete cascade,
  evento text not null,
  payload jsonb not null,
  status int,
  tentativas int not null default 0,
  erro text,
  enviado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index webhook_envios_fila on webhook_envios (enviado_em, criado_em) where enviado_em is null;
alter table webhook_envios enable row level security;

-- ============================================================ relatório da semana (IA)
create table relatorios (
  id uuid primary key default gen_random_uuid(),
  semana date not null unique,
  texto text not null,
  dados jsonb not null default '{}',
  modelo text,
  custo_usd numeric(12,6) not null default 0,
  criado_em timestamptz not null default now()
);
alter table relatorios enable row level security;
