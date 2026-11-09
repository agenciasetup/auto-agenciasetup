-- O material em inglês do perfil @setupagency_eng (pedido do dono em 29/10/2026): o recurso de perfil 'en' mora em
-- agenciasetup.com/free/<slug> e é o que a DM do "Comenta X" em inglês manda. Ele não aparece no site em português
-- (lista, busca, contagens e mapa do site). Padrão 'br': tudo o que existia continua igual.
alter table recursos add column if not exists perfil text not null default 'br' check (perfil in ('br', 'en'));
create index if not exists recursos_perfil_publicados on recursos (perfil, status, publicado_em desc);

-- As contagens do site em português: só os recursos do Brasil.
create or replace function contagens_recursos() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total', (select count(*) from recursos where status = 'publicado' and perfil = 'br'),
    'tipos', coalesce((select jsonb_object_agg(tipo, n) from (select tipo, count(*) n from recursos where status = 'publicado' and perfil = 'br' group by tipo) t), '{}'::jsonb),
    'categorias', coalesce((select jsonb_object_agg(categoria_id, n) from (select categoria_id, count(*) n from recursos where status = 'publicado' and perfil = 'br' and categoria_id is not null group by categoria_id) c), '{}'::jsonb),
    'ferramentas', coalesce((select jsonb_object_agg(f, n) from (select f, count(*) n from recursos, unnest(ferramentas) f where status = 'publicado' and perfil = 'br' group by f) x), '{}'::jsonb),
    'artigos', (select count(*) from artigos where status = 'publicado')
  );
$$;
revoke all on function contagens_recursos() from public, anon, authenticated;

-- A busca do site em português: só os recursos do Brasil.
create or replace function buscar(p_q text, p_limite int default 20) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  with termo as (select '%' || unaccent(lower(trim(p_q))) || '%' as t)
  select jsonb_build_object(
    'recursos', coalesce((
      select jsonb_agg(r order by r.destaque desc, r.downloads desc) from (
        select id, slug, titulo, resumo, tipo, capa_url, ferramentas, downloads, destaque
        from recursos, termo
        where status = 'publicado' and perfil = 'br' and (
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
