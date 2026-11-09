-- Follow-up do direct (08/11/2026, pedido do dono: "vender todos os dias"). Uma linha por pessoa do Instagram que pode
-- comprar, na fase em que está, até vender. Nasce de quem comentou a palavra de um post (Comenta X, followup_importar)
-- e de quem chega pelo direct (a tarefa do Claude lê o direct pelo Chrome e anota pelo conector). A dúvida que o Claude
-- não sabe responder fica aqui até o dono responder na tela; a resposta vira exemplo para as próximas dúvidas iguais.
-- Quem paga (pedido com o mesmo e-mail, ou nome e sobrenome iguais) ganha a marca da compra (followup_compras).
--
-- fase: novo (chegou, sem oferta), ofertado (a oferta saiu, esperando resposta), conversando (respondeu, pensando ou
-- perguntando), duvida (esperando a resposta do dono), comprou, nao_quer, nao_sei (não deu para saber o que a pessoa quer).
-- interesse: posts (mini curso Posts automáticos), combo (Combo Black Calango), videos (Vídeos com Claude), material (só o
-- material grátis), outro, nao_sei.
create table followups (
  id uuid primary key default gen_random_uuid(),
  perfil text not null default 'br' check (perfil in ('br','en')),
  usuario text not null check (usuario ~ '^[a-z0-9._]{1,30}$'),
  nome text check (nome is null or char_length(nome) <= 120),
  conversa text check (conversa is null or conversa ~ '^[0-9]{6,25}$'),
  origem text not null default 'direct' check (origem in ('direct','story','comentario','manual')),
  interesse text not null default 'nao_sei' check (interesse in ('posts','combo','videos','material','outro','nao_sei')),
  fase text not null default 'novo' check (fase in ('novo','ofertado','conversando','duvida','comprou','nao_quer','nao_sei')),
  palavras text[] not null default '{}',
  posts text[] not null default '{}',
  email text check (email is null or char_length(email) <= 200),
  ultima_mensagem text check (ultima_mensagem is null or char_length(ultima_mensagem) <= 500),
  ultima_em timestamptz,
  nosso_em timestamptz,
  toques int not null default 0,
  proxima_mensagem text check (proxima_mensagem is null or char_length(proxima_mensagem) <= 1000),
  proximo_em timestamptz,
  duvida text check (duvida is null or char_length(duvida) <= 1000),
  duvida_em timestamptz,
  resposta text check (resposta is null or char_length(resposta) <= 2000),
  respondida_em timestamptz,
  respondida_por uuid references equipe(id) on delete set null,
  pedido_id uuid references pedidos(id) on delete set null,
  produto text,
  comprou_em timestamptz,
  compra_por text check (compra_por is null or compra_por in ('email','nome','manual')),
  pos_venda_em timestamptz,
  nota text check (nota is null or char_length(nota) <= 500),
  historico jsonb not null default '[]'::jsonb check (jsonb_typeof(historico) = 'array'),
  primeiro_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (perfil, usuario)
);
create index followups_fase on followups (perfil, fase, proximo_em);
create index followups_email on followups (lower(email)) where email is not null;
create trigger followups_tocar before update on followups for each row execute function tocar_atualizado();
alter table followups enable row level security;

-- Os números da tela: quantas pessoas em cada fase, quantas estão na hora do próximo toque e o interesse de quem está aberto.
create or replace function followup_numeros(p_perfil text default 'br') returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'fases', coalesce((select jsonb_object_agg(fase, n) from (select fase, count(*) n from followups where perfil = p_perfil group by fase) t), '{}'::jsonb),
    'na_hora', (select count(*) from followups where perfil = p_perfil and fase in ('novo','ofertado','conversando') and proximo_em <= now()),
    'interesses', coalesce((select jsonb_object_agg(interesse, n) from (select interesse, count(*) n from followups where perfil = p_perfil and fase in ('novo','ofertado','conversando') group by interesse) t), '{}'::jsonb)
  )
$$;
revoke all on function followup_numeros(text) from public, anon, authenticated;

-- O nome para comparar: sem o que vem depois de "|", " - " ou "•" (a bio no nome do Instagram), sem acento e sem símbolo.
create or replace function followup_nome(t text) returns text
language sql immutable set search_path = public as $$
  select nullif(regexp_replace(trim(regexp_replace(translate(lower(split_part(split_part(split_part(coalesce(t, ''), '|', 1), ' - ', 1), '•', 1)),
    'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'), '[^a-z ]', ' ', 'g')), '\s+', ' ', 'g'), '')
$$;

-- Quem comentou a palavra de um post (ou mandou a palavra no direct) entra como "novo". Quem já está na lista ganha a
-- palavra e o post novos; o interesse só sobe de "não sei" ou "material" para um produto, nunca o contrário.
create or replace function followup_importar(p_desde timestamptz default null) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with c as (
    select coalesce(g.perfil, 'br') as perfil, lower(r.usuario) as usuario, max(r.nome) as nome,
      case when bool_or(r.origem = 'comentario') then 'comentario' else 'direct' end as origem,
      array_agg(distinct upper(g.palavra)) as palavras,
      coalesce(array_agg(distinct r.post_id) filter (where r.post_id is not null), '{}') as posts,
      min(coalesce(r.comentado_em, r.criado_em)) as primeiro,
      max(coalesce(r.comentado_em, r.criado_em)) as ultimo,
      (array_agg(left(r.texto, 500) order by coalesce(r.comentado_em, r.criado_em) desc))[1] as texto,
      (array_agg(case
        when g.recurso_id is not null then 'material'
        when g.link ilike '%combo-black%' then 'combo'
        when g.link ilike '%videos-com-claude%' then 'videos'
        when g.link ilike '%posts-automaticos%' then 'posts'
        else 'nao_sei' end order by coalesce(r.comentado_em, r.criado_em) desc))[1] as interesse
    from respostas_gatilho r
    join gatilhos g on g.id = r.gatilho_id
    where r.rede = 'instagram' and r.usuario ~* '^[a-z0-9._]{1,30}$' and g.palavra not ilike 'teste%'
      and (p_desde is null or r.criado_em >= p_desde)
    group by 1, 2
  )
  insert into followups as f (perfil, usuario, nome, origem, interesse, fase, palavras, posts, ultima_mensagem, ultima_em, primeiro_em, historico)
  select c.perfil, c.usuario, left(c.nome, 120), c.origem, c.interesse, 'novo', c.palavras, c.posts, c.texto, c.ultimo, c.primeiro,
    jsonb_build_array(jsonb_build_object('em', c.primeiro, 'tipo', 'chegou', 'texto', 'Comentou ' || array_to_string(c.palavras, ', ')))
  from c
  on conflict (perfil, usuario) do update set
    palavras = array(select distinct x from unnest(f.palavras || excluded.palavras) x),
    posts = array(select distinct x from unnest(f.posts || excluded.posts) x),
    nome = coalesce(f.nome, excluded.nome),
    interesse = case when f.interesse in ('nao_sei', 'material') and excluded.interesse not in ('nao_sei', 'material') then excluded.interesse else f.interesse end,
    primeiro_em = least(f.primeiro_em, excluded.primeiro_em)
  where not (f.palavras @> excluded.palavras and f.posts @> excluded.posts);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function followup_importar(timestamptz) from public, anon, authenticated;

-- Compara a lista com quem pagou. O e-mail vale primeiro; sem e-mail, nome e sobrenome iguais (pelo menos duas palavras).
-- Quem pagou depois de chegar na lista passa para "comprou"; quem já era aluno antes só ganha a marca do produto,
-- para a conversa saber que é aluno (e oferecer o que falta).
create or replace function followup_compras() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with pagos as (
    select p.id as pedido_id, p.pago_em, coalesce(o.nome, 'Compra') as produto, lower(a.email) as email, followup_nome(a.nome) as nome
    from pedidos p
    join alunos a on a.id = p.aluno_id
    left join ofertas o on o.id = p.oferta_id
    where p.status = 'pago' and not p.teste and p.pago_em is not null
  ), achados as (
    select distinct on (f.id) f.id, pg.pedido_id, pg.pago_em, pg.produto,
      case when f.email is not null and lower(f.email) = pg.email then 'email' else 'nome' end as por,
      pg.pago_em >= f.primeiro_em - interval '1 day' as depois
    from followups f
    join pagos pg on (
      (f.email is not null and lower(f.email) = pg.email)
      or (followup_nome(f.nome) like '% %' and pg.nome like '% %' and (
        followup_nome(f.nome) = pg.nome
        or (split_part(followup_nome(f.nome), ' ', 1) = split_part(pg.nome, ' ', 1)
            and regexp_replace(followup_nome(f.nome), '^.* ', '') = regexp_replace(pg.nome, '^.* ', ''))))
    )
    where f.pedido_id is distinct from pg.pedido_id and (f.comprou_em is null or pg.pago_em > f.comprou_em)
    order by f.id, (f.email is not null and lower(f.email) = pg.email) desc, pg.pago_em desc
  )
  update followups f set
    pedido_id = a.pedido_id, produto = a.produto, comprou_em = a.pago_em, compra_por = a.por,
    fase = case when a.depois then 'comprou' else f.fase end,
    historico = f.historico || jsonb_build_array(jsonb_build_object('em', a.pago_em, 'tipo', 'comprou',
      'texto', 'Comprou ' || a.produto || case when a.por = 'nome' then ' (achado pelo nome, confira)' else '' end))
  from achados a where f.id = a.id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function followup_compras() from public, anon, authenticated;
