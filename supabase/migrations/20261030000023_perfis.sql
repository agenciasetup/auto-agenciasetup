-- Perfis da agência nas redes (pedido do dono em 29/10/2026): o Brasil (@agenciasetup, em português) e o internacional
-- (@setupagency_eng, em inglês, com os mesmos posts traduzidos e o curso em dólar). "O painel precisa ter clareza dos
-- dois perfis, separados." Cada conta conectada, peça, palavra do "Comenta X" e post importado passa a ser de um perfil
-- (worker/lib/perfis.js). Só acrescenta: tudo o que já existe fica no perfil do Brasil (padrão 'br') e as funções
-- antigas continuam respondendo igual, agora só com o Brasil.

alter table conexoes add column if not exists perfil text not null default 'br' check (perfil in ('br', 'en'));
alter table pecas add column if not exists perfil text not null default 'br' check (perfil in ('br', 'en'));
alter table gatilhos add column if not exists perfil text not null default 'br' check (perfil in ('br', 'en'));
alter table posts_redes add column if not exists perfil text not null default 'br' check (perfil in ('br', 'en'));

-- A conta de uma rede num perfil (a mais antiga primeiro: a fila e o "Comenta X" pegam sempre a mesma).
create index if not exists conexoes_perfil on conexoes (plataforma, perfil, status, criado_em);
-- O aviso da Meta diz a conta pelo id dela na rede.
create index if not exists conexoes_conta on conexoes (conta_id);
create index if not exists pecas_perfil on pecas (perfil, status, agendado_para);
create index if not exists gatilhos_perfil on gatilhos (rede, perfil, ativo);
create index if not exists posts_redes_perfil on posts_redes (rede, perfil, publicado_em desc);

-- ---------------------------------------------------------------- desempenho por perfil
-- Mesma conta de 20261023000005_desempenho_por_rede, só com os posts e os seguidores das contas do perfil: o ranking e
-- as medianas de um perfil não se misturam com os do outro. Função nova (três argumentos, sem padrão no terceiro) para
-- não brigar com a de dois na hora de o banco escolher.
create or replace function desempenho(p_dias int, p_rede text, p_perfil text) returns jsonb
language sql stable security definer set search_path = public as $$
  with seg as (
    select coalesce((select d.seguidores from contas_dia d join conexoes c on c.id = d.conexao_id where c.plataforma = p_rede and c.perfil = p_perfil and d.seguidores is not null order by d.dia desc limit 1), 0) as n
  ),
  p as (
    select pr.*,
      coalesce(pr.nota, case when (select n from seg) > 0 then round(((coalesce(pr.curtidas, 0) + 3 * coalesce(pr.comentarios, 0))::numeric / (select n from seg)) * 100, 2) end) as nota_final,
      extract(hour from pr.publicado_em at time zone 'America/Sao_Paulo')::int as hora,
      extract(isodow from pr.publicado_em at time zone 'America/Sao_Paulo')::int as dia_semana
    from posts_redes pr
    where pr.rede = p_rede and pr.perfil = p_perfil and pr.publicado_em > now() - make_interval(days => greatest(1, least(p_dias, 3650)))
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
    'perfil', p_perfil,
    'seguidores', (select n from seg),
    'seguidores_7d', (select (select n from seg) - (select d.seguidores from contas_dia d join conexoes c on c.id = d.conexao_id where c.plataforma = p_rede and c.perfil = p_perfil and d.dia <= current_date - 7 and d.seguidores is not null order by d.dia desc limit 1)),
    'seguidores_30d', (select (select n from seg) - (select d.seguidores from contas_dia d join conexoes c on c.id = d.conexao_id where c.plataforma = p_rede and c.perfil = p_perfil and d.dia <= current_date - 30 and d.seguidores is not null order by d.dia desc limit 1)),
    'posts', (select count(*) from p),
    'com_metricas', (select count(*) from p where alcance is not null),
    'totais', (select jsonb_build_object('curtidas', coalesce(sum(curtidas), 0), 'comentarios', coalesce(sum(comentarios), 0), 'salvos', coalesce(sum(salvos), 0),
      'compartilhamentos', coalesce(sum(compartilhamentos), 0), 'alcance', coalesce(sum(alcance), 0), 'visualizacoes', coalesce(sum(visualizacoes), 0)) from p),
    'medianas', (select jsonb_build_object('nota', round(nota::numeric, 2), 'comentarios', round(comentarios::numeric), 'curtidas', round(curtidas::numeric),
      'alcance', round(alcance::numeric), 'salvos', round(salvos::numeric), 'compartilhamentos', round(compartilhamentos::numeric)) from med),
    'top', coalesce((select jsonb_agg(t) from (
      select id, id_na_rede, formato, left(legenda, 220) as legenda, link, miniatura_url, publicado_em, curtidas, comentarios, salvos, compartilhamentos, alcance, visualizacoes,
        nota_final as nota, palavra_chave, temas, perfil
      from p where nota_final is not null order by nota_final desc limit 10) t), '[]'::jsonb),
    'mais_comentados', coalesce((select jsonb_agg(t) from (
      select id, id_na_rede, formato, left(legenda, 220) as legenda, link, miniatura_url, publicado_em, curtidas, comentarios, nota_final as nota, palavra_chave, perfil
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
revoke all on function desempenho(int, text, text) from public, anon, authenticated;

-- A de dois argumentos (quem ainda chama sem perfil) passa a ser a do Brasil.
create or replace function desempenho(p_dias int default 30, p_rede text default 'instagram') returns jsonb
language sql stable security definer set search_path = public as $$
  select desempenho(p_dias, p_rede, 'br'::text);
$$;
revoke all on function desempenho(int, text) from public, anon, authenticated;

-- Seguidores do início do painel: os da conta do perfil naquela rede.
create or replace function seguidores_rede(p_rede text, p_perfil text) returns int
language sql stable security definer set search_path = public as $$
  select d.seguidores from contas_dia d join conexoes c on c.id = d.conexao_id
  where c.plataforma = p_rede and c.perfil = p_perfil and d.seguidores is not null order by d.dia desc limit 1;
$$;
revoke all on function seguidores_rede(text, text) from public, anon, authenticated;

create or replace function seguidores_rede(p_rede text) returns int
language sql stable security definer set search_path = public as $$
  select seguidores_rede(p_rede, 'br'::text);
$$;
revoke all on function seguidores_rede(text) from public, anon, authenticated;
