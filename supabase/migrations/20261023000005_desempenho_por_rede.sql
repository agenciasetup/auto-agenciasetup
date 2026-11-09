-- Desempenho por rede: com o Facebook conectado, os números de cada rede não se misturam.
-- A função ganha p_rede (padrão instagram); seguidores vêm da conta daquela rede.

drop function if exists desempenho(int);

create or replace function desempenho(p_dias int default 30, p_rede text default 'instagram') returns jsonb
language sql stable security definer set search_path = public as $$
  with seg as (
    select coalesce((select d.seguidores from contas_dia d join conexoes c on c.id = d.conexao_id where c.plataforma = p_rede and d.seguidores is not null order by d.dia desc limit 1), 0) as n
  ),
  p as (
    select pr.*,
      coalesce(pr.nota, case when (select n from seg) > 0 then round(((coalesce(pr.curtidas, 0) + 3 * coalesce(pr.comentarios, 0))::numeric / (select n from seg)) * 100, 2) end) as nota_final,
      extract(hour from pr.publicado_em at time zone 'America/Sao_Paulo')::int as hora,
      extract(isodow from pr.publicado_em at time zone 'America/Sao_Paulo')::int as dia_semana
    from posts_redes pr
    where pr.rede = p_rede and pr.publicado_em > now() - make_interval(days => greatest(1, least(p_dias, 3650)))
  ),
  med as (
    select
      percentile_cont(0.5) within group (order by nota_final) as nota,
      percentile_cont(0.5) within group (order by comentarios) as comentarios,
      percentile_cont(0.5) within group (order by curtidas) as curtidas,
      percentile_cont(0.5) within group (order by alcance) as alcance,
      percentile_cont(0.5) within group (order by salvos) as salvos,
      percentile_cont(0.5) within group (order by compartilhamentos) as compartilhamentos
    from p
  )
  select jsonb_build_object(
    'dias', p_dias,
    'rede', p_rede,
    'seguidores', (select n from seg),
    'seguidores_7d', (select (select n from seg) - (select d.seguidores from contas_dia d join conexoes c on c.id = d.conexao_id where c.plataforma = p_rede and d.dia <= current_date - 7 and d.seguidores is not null order by d.dia desc limit 1)),
    'seguidores_30d', (select (select n from seg) - (select d.seguidores from contas_dia d join conexoes c on c.id = d.conexao_id where c.plataforma = p_rede and d.dia <= current_date - 30 and d.seguidores is not null order by d.dia desc limit 1)),
    'posts', (select count(*) from p),
    'com_metricas', (select count(*) from p where alcance is not null),
    'totais', (select jsonb_build_object('curtidas', coalesce(sum(curtidas), 0), 'comentarios', coalesce(sum(comentarios), 0), 'salvos', coalesce(sum(salvos), 0),
      'compartilhamentos', coalesce(sum(compartilhamentos), 0), 'alcance', coalesce(sum(alcance), 0), 'visualizacoes', coalesce(sum(visualizacoes), 0)) from p),
    'medianas', (select jsonb_build_object('nota', round(nota::numeric, 2), 'comentarios', round(comentarios::numeric), 'curtidas', round(curtidas::numeric),
      'alcance', round(alcance::numeric), 'salvos', round(salvos::numeric), 'compartilhamentos', round(compartilhamentos::numeric)) from med),
    'top', coalesce((select jsonb_agg(t) from (
      select id, id_na_rede, formato, left(legenda, 220) as legenda, link, miniatura_url, publicado_em, curtidas, comentarios, salvos, compartilhamentos, alcance, visualizacoes,
        nota_final as nota, palavra_chave, temas
      from p where nota_final is not null order by nota_final desc limit 10) t), '[]'::jsonb),
    'mais_comentados', coalesce((select jsonb_agg(t) from (
      select id, id_na_rede, formato, left(legenda, 220) as legenda, link, miniatura_url, publicado_em, curtidas, comentarios, nota_final as nota, palavra_chave
      from p order by comentarios desc nulls last limit 5) t), '[]'::jsonb),
    'por_formato', coalesce((select jsonb_agg(f order by f.nota desc nulls last) from (
      select formato, count(*) as posts, round((percentile_cont(0.5) within group (order by nota_final))::numeric, 2) as nota,
        round((percentile_cont(0.5) within group (order by comentarios))::numeric) as comentarios,
        round((percentile_cont(0.5) within group (order by curtidas))::numeric) as curtidas,
        round((percentile_cont(0.5) within group (order by alcance))::numeric) as alcance
      from p group by formato) f), '[]'::jsonb),
    'por_tema', coalesce((select jsonb_agg(t order by t.nota desc nulls last) from (
      select tema, count(*) as posts, round((percentile_cont(0.5) within group (order by nota_final))::numeric, 2) as nota,
        round((percentile_cont(0.5) within group (order by comentarios))::numeric) as comentarios
      from p, unnest(temas) as tema group by tema having count(*) >= 2 order by count(*) desc limit 20) t), '[]'::jsonb),
    'palavra_chave', jsonb_build_object(
      'com', (select jsonb_build_object('posts', count(*), 'nota', round((percentile_cont(0.5) within group (order by nota_final))::numeric, 2),
        'comentarios', round((percentile_cont(0.5) within group (order by comentarios))::numeric)) from p where palavra_chave is not null),
      'sem', (select jsonb_build_object('posts', count(*), 'nota', round((percentile_cont(0.5) within group (order by nota_final))::numeric, 2),
        'comentarios', round((percentile_cont(0.5) within group (order by comentarios))::numeric)) from p where palavra_chave is null),
      'melhores', coalesce((select jsonb_agg(k) from (
        select palavra_chave as palavra, max(comentarios) as comentarios, (array_agg(link order by comentarios desc nulls last))[1] as link
        from p where palavra_chave is not null
        group by palavra_chave order by max(comentarios) desc nulls last limit 8) k), '[]'::jsonb)),
    'por_horario', coalesce((select jsonb_agg(h order by h.ordem) from (
      select case when hora < 12 then 'manhã' when hora < 18 then 'tarde' else 'noite' end as faixa,
        min(case when hora < 12 then 1 when hora < 18 then 2 else 3 end) as ordem,
        count(*) as posts, round((percentile_cont(0.5) within group (order by nota_final))::numeric, 2) as nota
      from p where hora is not null group by 1) h), '[]'::jsonb),
    'por_dia', coalesce((select jsonb_agg(d order by d.dia) from (
      select dia_semana as dia, count(*) as posts, round((percentile_cont(0.5) within group (order by nota_final))::numeric, 2) as nota
      from p where dia_semana is not null group by dia_semana) d), '[]'::jsonb)
  );
$$;
revoke all on function desempenho(int, text) from public, anon, authenticated;

-- Seguidores do início do painel: os do Instagram (a rede principal).
create or replace function seguidores_rede(p_rede text) returns int
language sql stable security definer set search_path = public as $$
  select d.seguidores from contas_dia d join conexoes c on c.id = d.conexao_id
  where c.plataforma = p_rede and d.seguidores is not null order by d.dia desc limit 1;
$$;
revoke all on function seguidores_rede(text) from public, anon, authenticated;
