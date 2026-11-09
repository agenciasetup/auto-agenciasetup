-- Post feito pelo painel (pedido do dono em 24/10/2026: "achei que teria o painel de agendar post, escolher as
-- plataformas, legenda, formato... com todas as funções do Instagram"; e "ver por post as automações, as métricas,
-- qual post vendeu mais, qual engajou melhor, qual foi uma merda"). Só acrescenta colunas e funções.

-- opcoes: o que cada rede aceita além da legenda (Instagram: colaboradores, primeiro comentário, localização, texto
-- alternativo, capa e áudio do Reels, Reels de teste...). grupo: as peças do mesmo post em várias redes.
alter table pecas add column if not exists opcoes jsonb not null default '{}'::jsonb;
alter table pecas add column if not exists grupo uuid;
create index if not exists pecas_grupo on pecas (grupo) where grupo is not null;
create index if not exists pecas_agenda on pecas (agendado_para) where agendado_para is not null;

-- O "Comenta X" de cada post (pelo id na rede): comentários que pediram a palavra, directs, materiais entregues,
-- seguidores novos e os cliques nos links curtos daquele post (o link de cada versão leva o post em utm_term).
create or replace function numeros_comenta_posts(p_ids text[]) returns jsonb
language sql stable security definer set search_path = public as $$
  with r as (
    select post_id,
      count(*) filter (where status not in ('duplicada', 'ignorada')) as pedidos,
      count(*) filter (where status in ('enviando', 'enviada', 'pergunta', 'respondendo', 'link')) as directs,
      count(*) filter (where status in ('enviada', 'link')) as materiais,
      count(*) filter (where seguiu_em is not null) as seguidores,
      count(*) filter (where status = 'falhou') as falhas
    from respostas_gatilho where post_id = any(p_ids) group by post_id
  ),
  c as (
    select utm_term as post_id, sum(cliques) as cliques from links
    where gatilho_id is not null and utm_term = any(p_ids) group by utm_term
  )
  select coalesce(jsonb_object_agg(coalesce(r.post_id, c.post_id), jsonb_build_object(
    'pedidos', coalesce(r.pedidos, 0), 'directs', coalesce(r.directs, 0), 'materiais', coalesce(r.materiais, 0),
    'seguidores', coalesce(r.seguidores, 0), 'falhas', coalesce(r.falhas, 0), 'cliques', coalesce(c.cliques, 0))), '{}'::jsonb)
  from r full join c on c.post_id = r.post_id;
$$;
revoke all on function numeros_comenta_posts(text[]) from public, anon, authenticated;
