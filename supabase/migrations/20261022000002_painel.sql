-- Painel, login do conector (OAuth) e redes plugáveis.
-- Mesma regra da base: RLS em tudo, sem política; só o Worker (chave secreta) lê e escreve.

-- Equipe do painel. O login é do Supabase Auth (auth_id); o cargo mora aqui, nunca no token.
create table equipe (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique,
  email text not null unique,
  nome text not null,
  papel text not null default 'redator' check (papel in ('administrador','editor','redator')),
  ativo boolean not null default true,
  ultimo_acesso timestamptz,
  criado_em timestamptz not null default now()
);
alter table equipe enable row level security;

-- As chaves do conector viram chaves de API: coladas à mão (Claude Code) ou criadas pelo login do app (OAuth).
alter table chaves_mcp rename to chaves_api;
alter table chaves_api
  add column equipe_id uuid references equipe(id) on delete cascade,
  add column papel text not null default 'administrador' check (papel in ('administrador','editor','redator')),
  add column expira_em timestamptz,
  add column revogada_em timestamptz,
  add column usos int not null default 0,
  add column oauth_codigo text unique;
update chaves_api set revogada_em = now() where ativa = false;
alter table chaves_api drop column ativa;
create index chaves_api_equipe on chaves_api (equipe_id) where revogada_em is null;

-- Auditoria passa a saber quem da equipe fez e por onde (painel, mcp, sistema).
alter table auditoria
  add column equipe_id uuid references equipe(id) on delete set null,
  add column via text not null default 'sistema';

-- Contas conectadas de cada rede (um módulo por rede em worker/plataformas/).
-- As credenciais vão cifradas (AES-GCM, chave CRIPTO_CHAVE do Worker): nem quem lê o banco vê o token.
create table conexoes (
  id uuid primary key default gen_random_uuid(),
  plataforma text not null,
  conta_id text not null,
  conta_nome text,
  conta_foto text,
  credenciais text not null,
  escopos text[] not null default '{}',
  expira_em timestamptz,
  status text not null default 'ativa' check (status in ('ativa','expirada','erro','desligada')),
  ultimo_erro text,
  conectado_por uuid references equipe(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (plataforma, conta_id)
);
create trigger conexoes_tocar before update on conexoes for each row execute function tocar_atualizado();
alter table conexoes enable row level security;

-- A fila ganha conta de destino, tentativas e quem aprovou.
alter table pecas
  add column conexao_id uuid references conexoes(id) on delete set null,
  add column tentativas int not null default 0,
  add column proxima_tentativa timestamptz,
  add column aprovado_por uuid references equipe(id) on delete set null,
  add column aprovado_em timestamptz;

-- O relógio pega as peças vencidas de uma vez só: duas execuções seguidas nunca publicam a mesma peça.
create or replace function pegar_pecas_para_publicar(p_limite int default 5) returns setof pecas
language sql security definer set search_path = public as $$
  update pecas set status = 'publicando', tentativas = tentativas + 1, atualizado_em = now()
  where id in (
    select id from pecas
    where status = 'agendado' and agendado_para <= now()
      and (proxima_tentativa is null or proxima_tentativa <= now())
    order by agendado_para
    limit greatest(1, least(p_limite, 20))
    for update skip locked
  )
  returning *;
$$;
revoke all on function pegar_pecas_para_publicar(int) from public, anon, authenticated;

-- Peça que ficou presa em "publicando" (Worker caiu no meio) volta para a fila depois de 15 minutos.
create or replace function soltar_pecas_presas() returns int
language sql security definer set search_path = public as $$
  with s as (
    update pecas set status = 'agendado', proxima_tentativa = now()
    where status = 'publicando' and atualizado_em < now() - interval '15 minutes'
    returning 1
  ) select count(*)::int from s;
$$;
revoke all on function soltar_pecas_presas() from public, anon, authenticated;

-- Números do início do painel numa consulta só.
create or replace function numeros_painel() returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'recursos_publicados', (select count(*) from recursos where status = 'publicado'),
    'recursos_rascunho', (select count(*) from recursos where status = 'rascunho'),
    'artigos_publicados', (select count(*) from artigos where status = 'publicado'),
    'artigos_rascunho', (select count(*) from artigos where status = 'rascunho'),
    'downloads_total', (select coalesce(sum(downloads), 0) from recursos),
    'downloads_7d', (select count(*) from downloads where quando > now() - interval '7 days'),
    'pecas_rascunho', (select count(*) from pecas where status = 'rascunho'),
    'pecas_aprovadas', (select count(*) from pecas where status = 'aprovado'),
    'pecas_agendadas', (select count(*) from pecas where status = 'agendado'),
    'pecas_erro', (select count(*) from pecas where status = 'erro'),
    'pecas_publicadas_7d', (select count(*) from pecas where status = 'publicado' and publicado_em > now() - interval '7 days'),
    'pautas_novas', (select count(*) from pautas where status = 'nova'),
    'anuncios_cliques_total', (select coalesce(sum(cliques), 0) from anuncios),
    'anuncios_impressoes_total', (select coalesce(sum(impressoes), 0) from anuncios),
    'leads_total', (select count(*) from leads)
  );
$$;
revoke all on function numeros_painel() from public, anon, authenticated;
