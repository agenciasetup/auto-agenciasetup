-- Recursos viram também agentes de IA, com ferramentas, galeria, "abrir no ChatGPT/Claude" e busca de verdade.

alter table recursos drop constraint recursos_tipo_check;
alter table recursos add constraint recursos_tipo_check
  check (tipo in ('agente','prompt','template','planilha','automacao','guia','pack','ferramenta','video'));

alter table recursos
  add column ferramentas text[] not null default '{}',   -- chatgpt, claude, gemini, midjourney, magnific, n8n, make, notion, figma, capcut...
  add column galeria jsonb not null default '[]',        -- [{ url, alt }]: prévias que aparecem na página
  add column video_url text,                             -- vídeo de "como usar" (YouTube, Vimeo ou arquivo)
  add column link_uso text,                              -- agente: abre direto no ChatGPT, Claude, Gemini...
  add column itens text[] not null default '{}',         -- o que vem no download, em itens curtos
  add column formato text,                               -- PDF, Notion, JSON do n8n, Planilha Google...
  add column nivel text check (nivel in ('iniciante','intermediario','avancado'));

create index recursos_tipo_publicados on recursos (tipo, status, publicado_em desc);

-- Contagens para os atalhos do site (por tipo, por assunto e por ferramenta), só do que está no ar.
create or replace function contagens_recursos() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total', (select count(*) from recursos where status = 'publicado'),
    'tipos', coalesce((select jsonb_object_agg(tipo, n) from (select tipo, count(*) n from recursos where status = 'publicado' group by tipo) t), '{}'::jsonb),
    'categorias', coalesce((select jsonb_object_agg(categoria_id, n) from (select categoria_id, count(*) n from recursos where status = 'publicado' and categoria_id is not null group by categoria_id) c), '{}'::jsonb),
    'ferramentas', coalesce((select jsonb_object_agg(f, n) from (select f, count(*) n from recursos, unnest(ferramentas) f where status = 'publicado' group by f) x), '{}'::jsonb),
    'artigos', (select count(*) from artigos where status = 'publicado')
  );
$$;
revoke all on function contagens_recursos() from public, anon, authenticated;

-- Busca sem acento em recursos e novidades publicados (título, resumo e tags).
create or replace function buscar(p_q text, p_limite int default 20) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  with termo as (select '%' || unaccent(lower(trim(p_q))) || '%' as t)
  select jsonb_build_object(
    'recursos', coalesce((
      select jsonb_agg(r order by r.destaque desc, r.downloads desc) from (
        select id, slug, titulo, resumo, tipo, capa_url, ferramentas, downloads, destaque
        from recursos, termo
        where status = 'publicado' and (
          unaccent(lower(titulo)) like termo.t or unaccent(lower(coalesce(resumo, ''))) like termo.t
          or exists (select 1 from unnest(tags) g where unaccent(lower(g)) like termo.t)
          or exists (select 1 from unnest(ferramentas) g where lower(g) like termo.t))
        limit greatest(1, least(p_limite, 50))
      ) r), '[]'::jsonb),
    'artigos', coalesce((
      select jsonb_agg(a order by a.publicado_em desc) from (
        select id, slug, titulo, resumo, publicado_em
        from artigos, termo
        where status = 'publicado' and (unaccent(lower(titulo)) like termo.t or unaccent(lower(coalesce(resumo, ''))) like termo.t
          or exists (select 1 from unnest(tags) g where unaccent(lower(g)) like termo.t))
        limit 10
      ) a), '[]'::jsonb)
  );
$$;
revoke all on function buscar(text, int) from public, anon, authenticated;

-- E-mail de quem quer receber os recursos novos: sem duplicar, sem erro para quem já está na lista.
create or replace function guardar_lead(p_email text, p_origem text, p_recurso uuid default null) returns void
language sql security definer set search_path = public as $$
  insert into leads (email, origem, recurso_id) values (lower(trim(p_email)), left(p_origem, 200), p_recurso)
  on conflict (email) do nothing;
$$;
revoke all on function guardar_lead(text, text, uuid) from public, anon, authenticated;
