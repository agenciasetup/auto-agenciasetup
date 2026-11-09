-- Motor de engajamento: o que funcionou (desempenho dos posts), o que está em alta (radar de fontes),
-- "Comenta X" automático (resposta no comentário + DM com o material) e a oferta do mini curso no fim do funil.
-- Mesma regra da base: RLS em tudo, sem política. Só o Worker (chave secreta) lê e escreve.

-- ---------------------------------------------------------------- desempenho

-- Posts das contas conectadas (os do sistema e os antigos), com os números mais recentes.
-- nota = engajamento ponderado sobre o alcance: (curtidas + 3 comentários + 2 salvos + 2 compartilhamentos) / alcance.
-- Sem alcance (post antigo, sem permissão de métricas), as consultas usam os seguidores no lugar.
create table posts_redes (
  id uuid primary key default gen_random_uuid(),
  conexao_id uuid references conexoes(id) on delete cascade,
  rede text not null,
  id_na_rede text not null,
  peca_id uuid references pecas(id) on delete set null,
  formato text,
  legenda text,
  link text,
  miniatura_url text,
  publicado_em timestamptz,
  curtidas int,
  comentarios int,
  salvos int,
  compartilhamentos int,
  alcance int,
  visualizacoes int,
  nota numeric generated always as (
    case when alcance > 0 then round(((coalesce(curtidas, 0) + 3 * coalesce(comentarios, 0) + 2 * coalesce(salvos, 0) + 2 * coalesce(compartilhamentos, 0))::numeric / alcance) * 100, 2) end
  ) stored,
  palavra_chave text,                 -- o "Comenta X" lido da legenda
  temas text[] not null default '{}', -- ferramentas e assuntos achados na legenda
  metricas_em timestamptz,            -- última leitura de alcance, salvos e compartilhamentos
  comentarios_lidos_em timestamptz,   -- última varredura do "Comenta X"
  comentarios_ate timestamptz,        -- comentário mais novo já visto
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (rede, id_na_rede)
);
create index posts_redes_data on posts_redes (rede, publicado_em desc);
create index posts_redes_metricas on posts_redes (metricas_em nulls first);
create trigger posts_redes_tocar before update on posts_redes for each row execute function tocar_atualizado();
alter table posts_redes enable row level security;

-- Seguidores por dia (uma foto por conta por dia).
create table contas_dia (
  conexao_id uuid not null references conexoes(id) on delete cascade,
  dia date not null,
  seguidores int,
  posts int,
  primary key (conexao_id, dia)
);
alter table contas_dia enable row level security;

-- ---------------------------------------------------------------- radar (em alta)

-- Pautas ganham o que o radar descobre: de onde veio, de que tipo é, quão quente está e o ângulo sugerido.
alter table pautas
  add column chave text unique,                           -- endereço normalizado: a mesma notícia não entra duas vezes
  add column fonte_id text,
  add column tipo text,                                   -- lancamento, ferramenta, discussao, tendencia, noticia
  add column nota int not null default 0,                 -- força da pauta sem contar o tempo (0 a 100)
  add column sinais jsonb not null default '{}',          -- pontos, comentários, estrelas
  add column ferramentas text[] not null default '{}',    -- claude, codex, chatgpt, gemini, photoshop, canva...
  add column angulo text,
  add column formato_sugerido text,
  add column publicado_na_fonte timestamptz,
  add column atualizado_em timestamptz not null default now();
create index pautas_radar on pautas (status, publicado_na_fonte desc);
create trigger pautas_tocar before update on pautas for each row execute function tocar_atualizado();

-- Situação de cada fonte do radar (a lista mora no código: worker/radar/fontes.js).
create table radar_fontes (
  id text primary key,
  nome text not null,
  lido_em timestamptz,
  ultimo_ok timestamptz,
  ultimo_erro text,
  itens int not null default 0
);
alter table radar_fontes enable row level security;

-- ---------------------------------------------------------------- "Comenta X"

-- Palavra que a pessoa comenta para receber o material na DM.
-- Nasce desligado; liga quem aprova (ou sozinho quando a peça que pediu a palavra é publicada).
create table gatilhos (
  id uuid primary key default gen_random_uuid(),
  rede text not null default 'instagram',
  palavra text not null,
  recurso_id uuid references recursos(id) on delete set null,
  link text,                                -- quando o material não é um recurso do site
  mensagem text,                            -- texto da DM ({nome}, {titulo}, {link}); vazio = texto padrão
  respostas text[] not null default '{}',   -- respostas públicas no comentário (sorteia uma)
  posts text[] not null default '{}',       -- ids dos posts na rede; vazio = posts recentes que pedem a palavra na legenda
  peca_id uuid references pecas(id) on delete set null,
  ativo boolean not null default false,
  ativado_por uuid references equipe(id) on delete set null,
  ativado_em timestamptz,
  enviados int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index gatilhos_ativos on gatilhos (rede, ativo);
create trigger gatilhos_tocar before update on gatilhos for each row execute function tocar_atualizado();
alter table gatilhos enable row level security;

-- Cada comentário que pediu a palavra, uma vez só (unique): ninguém recebe a DM duas vezes.
create table respostas_gatilho (
  id bigint generated always as identity primary key,
  gatilho_id uuid references gatilhos(id) on delete set null,
  rede text not null,
  comentario_id text not null,
  post_id text,
  usuario text,
  texto text,
  status text not null default 'pendente' check (status in ('pendente','enviando','enviada','falhou','ignorada')),
  erro text,
  tentativas int not null default 0,
  comentado_em timestamptz,
  pego_em timestamptz,
  enviado_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (rede, comentario_id)
);
create index respostas_fila on respostas_gatilho (status, criado_em);
create index respostas_gatilho_id on respostas_gatilho (gatilho_id, status);
alter table respostas_gatilho enable row level security;

-- O relógio pega as respostas pendentes de uma vez só (duas execuções nunca mandam a mesma DM).
-- A Meta só aceita resposta privada até 7 dias depois do comentário: depois disso vira "ignorada".
create or replace function pegar_respostas(p_limite int default 10) returns setof respostas_gatilho
language plpgsql security definer set search_path = public as $$
begin
  update respostas_gatilho set status = 'pendente', pego_em = null
  where status = 'enviando' and pego_em < now() - interval '15 minutes';
  update respostas_gatilho set status = 'ignorada', erro = 'Passou de 7 dias: a Meta não aceita mais a resposta privada.'
  where status = 'pendente' and coalesce(comentado_em, criado_em) < now() - interval '7 days';
  return query
  update respostas_gatilho set status = 'enviando', tentativas = tentativas + 1, pego_em = now()
  where id in (
    select id from respostas_gatilho
    where status = 'pendente'
    order by criado_em
    limit greatest(1, least(p_limite, 50))
    for update skip locked
  )
  returning *;
end $$;
revoke all on function pegar_respostas(int) from public, anon, authenticated;

-- Fecha uma resposta: enviada conta no gatilho; falha passageira volta para a fila até 3 tentativas.
create or replace function marcar_resposta(p_id bigint, p_status text, p_erro text default null) returns void
language plpgsql security definer set search_path = public as $$
declare r respostas_gatilho;
begin
  select * into r from respostas_gatilho where id = p_id;
  if not found then return; end if;
  if p_status = 'pendente' and r.tentativas >= 3 then p_status := 'falhou'; end if;
  update respostas_gatilho set status = p_status, erro = left(p_erro, 300), pego_em = null,
    enviado_em = case when p_status = 'enviada' then now() else enviado_em end
  where id = p_id;
  if p_status = 'enviada' and r.gatilho_id is not null then
    update gatilhos set enviados = enviados + 1 where id = r.gatilho_id;
  end if;
end $$;
revoke all on function marcar_resposta(bigint, text, text) from public, anon, authenticated;

-- Números de cada gatilho: pendentes, falhas, envios da semana e downloads que vieram da DM (?de=dm-<id>).
create or replace function numeros_gatilhos() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(g.id, jsonb_build_object(
    'pendentes', (select count(*) from respostas_gatilho r where r.gatilho_id = g.id and r.status in ('pendente','enviando')),
    'falhas', (select count(*) from respostas_gatilho r where r.gatilho_id = g.id and r.status = 'falhou'),
    'enviadas_7d', (select count(*) from respostas_gatilho r where r.gatilho_id = g.id and r.status = 'enviada' and r.enviado_em > now() - interval '7 days'),
    'cliques', (select count(*) from downloads d where d.origem like '%de=dm-' || left(g.id::text, 8) || '%')
  )), '{}'::jsonb)
  from gatilhos g;
$$;
revoke all on function numeros_gatilhos() from public, anon, authenticated;

-- ---------------------------------------------------------------- leituras do painel e do Claude

-- O que funcionou num período: totais, medianas, os melhores posts e os cortes por formato, tema, palavra-chave e horário.
create or replace function desempenho(p_dias int default 30) returns jsonb
language sql stable security definer set search_path = public as $$
  with seg as (
    select coalesce((select seguidores from contas_dia where seguidores is not null order by dia desc limit 1), 0) as n
  ),
  p as (
    select pr.*,
      coalesce(pr.nota, case when (select n from seg) > 0 then round(((coalesce(pr.curtidas, 0) + 3 * coalesce(pr.comentarios, 0))::numeric / (select n from seg)) * 100, 2) end) as nota_final,
      extract(hour from pr.publicado_em at time zone 'America/Sao_Paulo')::int as hora,
      extract(isodow from pr.publicado_em at time zone 'America/Sao_Paulo')::int as dia_semana
    from posts_redes pr
    where pr.publicado_em > now() - make_interval(days => greatest(1, least(p_dias, 3650)))
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
    'seguidores', (select n from seg),
    'seguidores_7d', (select (select n from seg) - (select seguidores from contas_dia where dia <= current_date - 7 and seguidores is not null order by dia desc limit 1)),
    'seguidores_30d', (select (select n from seg) - (select seguidores from contas_dia where dia <= current_date - 30 and seguidores is not null order by dia desc limit 1)),
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
revoke all on function desempenho(int) from public, anon, authenticated;

-- O que está em alta: pautas novas do radar com o "calor" de agora (força x quão recente + quantas fontes falam da mesma ferramenta)
-- e os assuntos do momento (ferramentas mais citadas).
create or replace function em_alta(p_horas int default 48, p_limite int default 30) returns jsonb
language sql stable security definer set search_path = public as $$
  with recentes as (
    select *, extract(epoch from (now() - coalesce(publicado_na_fonte, criado_em))) / 3600 as horas
    from pautas
    where status = 'nova' and fonte_id is not null
      and coalesce(publicado_na_fonte, criado_em) > now() - make_interval(hours => greatest(1, least(p_horas, 24 * 14)))
  ),
  contagem as (
    select f, count(*) as n, count(distinct fonte_id) as fontes from recentes, unnest(ferramentas) as f group by f
  ),
  calor as (
    select r.*,
      least(100, round(r.nota * (case when r.horas < 6 then 1 when r.horas < 24 then 0.85 when r.horas < 48 then 0.65 else 0.4 end)
        + coalesce((select least(20, 4 * (max(c.fontes) - 1)) from contagem c where c.f = any(r.ferramentas)), 0)))::int as calor
    from recentes r
  )
  select jsonb_build_object(
    'assuntos', coalesce((select jsonb_agg(jsonb_build_object('ferramenta', f, 'mencoes', n, 'fontes', fontes) order by n desc)
      from (select * from contagem order by n desc limit 12) c), '[]'::jsonb),
    'pautas', coalesce((select jsonb_agg(to_jsonb(x) order by x.calor desc) from (
      select id, titulo, resumo, fonte_url, fonte_nome, fonte_id, tipo, ferramentas, angulo, formato_sugerido, sinais, publicado_na_fonte, criado_em, calor
      from calor order by calor desc, publicado_na_fonte desc nulls last limit greatest(1, least(p_limite, 100))) x), '[]'::jsonb)
  );
$$;
revoke all on function em_alta(int, int) from public, anon, authenticated;

-- Números do início do painel: os de antes + desempenho, radar e "Comenta X".
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
    'em_alta_24h', (select count(*) from pautas where status = 'nova' and fonte_id is not null and coalesce(publicado_na_fonte, criado_em) > now() - interval '24 hours'),
    'anuncios_cliques_total', (select coalesce(sum(cliques), 0) from anuncios),
    'anuncios_impressoes_total', (select coalesce(sum(impressoes), 0) from anuncios),
    'leads_total', (select count(*) from leads),
    'leads_7d', (select count(*) from leads where criado_em > now() - interval '7 days'),
    'seguidores', (select seguidores from contas_dia where seguidores is not null order by dia desc limit 1),
    'posts_7d', (select count(*) from posts_redes where publicado_em > now() - interval '7 days'),
    'ultimo_post', (select max(publicado_em) from posts_redes),
    'gatilhos_ativos', (select count(*) from gatilhos where ativo),
    'dms_7d', (select count(*) from respostas_gatilho where status = 'enviada' and enviado_em > now() - interval '7 days'),
    'dms_pendentes', (select count(*) from respostas_gatilho where status in ('pendente','enviando'))
  );
$$;
revoke all on function numeros_painel() from public, anon, authenticated;

-- ---------------------------------------------------------------- oferta (mini curso no fim do funil)

-- O produto que fecha o funil: aparece no fim das páginas de recurso e da DM do "Comenta X".
-- Só aparece com produto ativo e landing page publicada.
insert into config (chave, valor) values
  ('oferta', '{"ativo":false,"produto_id":null,"landing_slug":null,"titulo":"","texto":"","cta":"Quero conhecer","linha_dm":""}')
on conflict (chave) do nothing;
