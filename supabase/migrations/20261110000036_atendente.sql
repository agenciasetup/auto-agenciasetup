-- O Atendente do direct (10/11/2026; docs/escritorio.md, Fase 1). Responde na hora quem escreve no direct, pela API do
-- Instagram, sem depender do computador: o aviso da Meta chega ao Worker, a mensagem entra na lista de follow-up e, se a
-- resposta está no que o dono já liberou, sai em segundos. O resto vira dúvida para ele.
--
-- followups.igsid:     o id da pessoa no Instagram para a API (vem no aviso da Meta). Sem ele não dá para mandar pela API.
-- followups.humano_em: a última vez que alguém da equipe escreveu para a pessoa pelo aplicativo do Instagram. Enquanto
--                      uma conversa de gente está acontecendo, o Atendente só anota e não responde.
alter table followups
  add column igsid text check (igsid is null or igsid ~ '^[0-9]{5,30}$'),
  add column humano_em timestamptz;
create index followups_igsid on followups (igsid) where igsid is not null;

-- Uma linha por mensagem que o Atendente tratou: o que ele fez e o que custou. O "mid" (id da mensagem na Meta) é
-- único: se a Meta mandar o mesmo aviso duas vezes, a segunda não faz nada.
-- classe: respondeu (a resposta saiu), rascunho (ficou pronta para o dono mandar), duvida (foi para o dono), nao_sei,
-- ignorou (reação, figurinha, "kkk"), anotou (só registrou: Atendente desligado, conversa de gente em andamento, quem já
-- comprou), sem_orcamento (o teto do dia acabou), erro.
create table atendimentos (
  id bigint generated always as identity primary key,
  mid text not null unique check (char_length(mid) <= 300),
  followup_id uuid references followups(id) on delete set null,
  perfil text not null default 'br' check (perfil in ('br','en')),
  classe text not null default 'anotou' check (classe in ('respondeu','rascunho','duvida','nao_sei','ignorou','anotou','sem_orcamento','erro')),
  detalhe text check (detalhe is null or char_length(detalhe) <= 500),
  custo_usd numeric(10,5) not null default 0 check (custo_usd >= 0),
  tokens_entrada int,
  tokens_saida int,
  criado_em timestamptz not null default now()
);
create index atendimentos_criado on atendimentos (criado_em desc);
create index atendimentos_followup on atendimentos (followup_id, criado_em desc);
alter table atendimentos enable row level security;

-- O gasto do dia e do mês do escritório passa a somar o que o Atendente gastou de API.
create or replace function escritorio_resumo() returns jsonb
language sql stable security definer set search_path = public as $$
  with hoje as (select (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as inicio),
       mes as (select (date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as inicio)
  select jsonb_build_object(
    'turnos', coalesce((
      select jsonb_object_agg(x.agente_id, x.j) from (
        select t.agente_id, jsonb_build_object(
          'ultimo', (select jsonb_build_object('id', u.id, 'status', u.status, 'resumo', u.resumo, 'onde', u.onde, 'inicio', u.inicio, 'fim', u.fim)
                     from turnos u where u.agente_id = t.agente_id order by u.inicio desc limit 1),
          'hoje', count(*) filter (where t.inicio >= (select inicio from hoje)),
          'custo_hoje', coalesce(sum(t.custo_usd) filter (where t.inicio >= (select inicio from hoje)), 0),
          'erros_7d', count(*) filter (where t.status = 'erro' and t.inicio >= now() - interval '7 days')
        ) as j
        from turnos t where t.inicio >= now() - interval '30 days' group by t.agente_id
      ) x), '{}'::jsonb),
    'propostas', coalesce((
      select jsonb_object_agg(y.agente_id, y.j) from (
        select p.agente_id, jsonb_build_object(
          'feitas_por_ele', count(*),
          'na_mesa', count(*) filter (where p.status = 'nova'),
          'aprovadas', count(*) filter (where p.status in ('aprovada','feita')),
          'com_resultado', count(*) filter (where p.status = 'feita')
        ) as j
        from propostas p where p.agente_id is not null group by p.agente_id
      ) y), '{}'::jsonb),
    'custo_hoje', (select coalesce(sum(custo_usd), 0) from turnos where inicio >= (select inicio from hoje))
                + (select coalesce(sum(custo_usd), 0) from atendimentos where criado_em >= (select inicio from hoje)),
    'custo_mes', (select coalesce(sum(custo_usd), 0) from turnos where inicio >= (select inicio from mes))
               + (select coalesce(sum(custo_usd), 0) from atendimentos where criado_em >= (select inicio from mes)),
    'na_mesa', (select count(*) from propostas where status = 'nova'),
    'aprovadas', (select count(*) from propostas where status = 'aprovada')
  )
$$;
revoke all on function escritorio_resumo() from public, anon, authenticated;

-- O trabalho de hoje ganha o Atendente: quantas conversas ele respondeu, quantas dúvidas mandou para o dono e o custo.
create or replace function escritorio_atividade() returns jsonb
language sql stable security definer set search_path = public as $$
  with hoje as (select (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as i)
  select jsonb_build_object(
    'entregador', (select jsonb_build_object('hoje', count(*) filter (where enviado_em >= (select i from hoje)), 'ultimo', max(enviado_em))
                   from respostas_gatilho where status = 'enviada' and enviado_em >= now() - interval '14 days'),
    'publicador', (select jsonb_build_object('hoje', count(*) filter (where publicado_em >= (select i from hoje)), 'ultimo', max(publicado_em))
                   from pecas where status = 'publicado' and publicado_em >= now() - interval '30 days'),
    'pesquisador', (select jsonb_build_object('hoje', count(*) filter (where criado_em >= (select i from hoje)), 'ultimo', max(criado_em))
                    from pautas where criado_em >= now() - interval '14 days'),
    'analista', (select jsonb_build_object('hoje', count(*) filter (where metricas_em >= (select i from hoje)), 'ultimo', max(metricas_em))
                 from posts_redes where metricas_em >= now() - interval '14 days'),
    'recuperador', (select jsonb_build_object('hoje', count(*) filter (where lembrete_em >= (select i from hoje)), 'ultimo', max(lembrete_em))
                    from recuperacoes where lembrete_em >= now() - interval '30 days'),
    'editor-chefe', (select jsonb_build_object('ultimo', valor->>'criado_em', 'custo_usd', valor->>'custo_usd', 'modelo', valor->>'modelo')
                     from config where chave = 'plano_ia'),
    'atendente', (select jsonb_build_object(
                    'hoje', count(*) filter (where classe = 'respondeu' and criado_em >= (select i from hoje)),
                    'duvidas', count(*) filter (where classe = 'duvida' and criado_em >= (select i from hoje)),
                    'lidas', count(*) filter (where criado_em >= (select i from hoje)),
                    'ultimo', max(criado_em) filter (where classe = 'respondeu'),
                    'custo_usd', coalesce(sum(custo_usd) filter (where criado_em >= (select i from hoje)), 0))
                  from atendimentos where criado_em >= now() - interval '14 days')
  )
$$;
revoke all on function escritorio_atividade() from public, anon, authenticated;
