-- Escritório de IA (10/11/2026): cada Calango ganha nome de gente, e o gasto de IA passa a ser anotado chamada por
-- chamada, com o modelo, para a tela mostrar o consumo por sala, por modelo e por agente.
--
-- agentes.apelido: o nome do Calango ("João L."). O campo nome continua sendo a função ("Vendedor Calango"). A tela
-- mostra "João L. · Vendedor Calango". O dono muda o apelido no perfil.
alter table agentes add column apelido text check (apelido is null or char_length(apelido) between 2 and 40);

update agentes set apelido = v.apelido from (values
  ('vendedor-calango', 'João L.'), ('vendedor-pergunta', 'Tiago M.'), ('atendente', 'Ana P.'), ('testador-de-mensagens', 'Lucas R.'),
  ('entregador', 'Pedro S.'), ('recuperador', 'Marta C.'), ('fiscal', 'Natanael B.'),
  ('pesquisador', 'Daniel F.'), ('analista', 'Ester N.'), ('editor-chefe', 'Paulo A.'), ('redator-de-frase', 'Lídia G.'),
  ('redator-de-carrossel', 'Marcos T.'), ('revisor', 'Rute V.'), ('publicador', 'André D.'), ('olheiro', 'Tomé O.'),
  ('olheiro-visual', 'Sara L.'), ('diretor-de-arte', 'Davi C.'),
  ('cacador-de-ganchos', 'Simão P.'), ('roteirista', 'Débora M.'),
  ('chefe-de-gabinete', 'José E.'),
  ('ouvinte', 'Samuel H.'), ('criador-de-oferta', 'Priscila J.'),
  ('gerente-de-receita', 'Mateus Z.'), ('trafego', 'Elias Q.'),
  ('zelador', 'Noé K.'), ('olheiro-de-ferramentas', 'Calebe X.')
) as v(id, apelido) where agentes.id = v.id;

-- Uma linha por chamada de IA de um agente do escritório. origem diz de onde veio: atendente, comenta (a resposta
-- pública do Comenta X), variantes (as versões de mensagem), plano (o plano de ideias), turno (custo informado no
-- turno de uma tarefa) e teste (o teste do Atendente sem mandar).
create table consumo_ia (
  id bigint generated always as identity primary key,
  agente_id text references agentes(id) on delete set null,
  modelo text not null check (char_length(modelo) between 1 and 60),
  origem text check (origem is null or char_length(origem) <= 40),
  tokens_entrada int not null default 0 check (tokens_entrada >= 0),
  tokens_saida int not null default 0 check (tokens_saida >= 0),
  custo_usd numeric(10,5) not null default 0 check (custo_usd >= 0),
  criado_em timestamptz not null default now()
);
create index consumo_ia_criado on consumo_ia (criado_em desc);
create index consumo_ia_agente on consumo_ia (agente_id, criado_em desc);
alter table consumo_ia enable row level security;

-- O que já foi gasto e estava anotado em outros lugares entra aqui, para o histórico começar certo.
insert into consumo_ia (agente_id, modelo, origem, tokens_entrada, tokens_saida, custo_usd, criado_em)
select 'atendente', 'claude-sonnet-5-5', 'atendente', coalesce(tokens_entrada, 0), coalesce(tokens_saida, 0), custo_usd, criado_em
from atendimentos where custo_usd > 0;
insert into consumo_ia (agente_id, modelo, origem, tokens_entrada, tokens_saida, custo_usd, criado_em)
select t.agente_id, coalesce(nullif(t.dados->>'modelo', ''), nullif(a.modelo, ''), 'claude'), 'turno', coalesce(t.tokens_entrada, 0), coalesce(t.tokens_saida, 0), t.custo_usd, t.inicio
from turnos t join agentes a on a.id = t.agente_id where t.custo_usd > 0;
insert into consumo_ia (agente_id, modelo, origem, custo_usd, criado_em)
select 'editor-chefe', coalesce(nullif(valor->>'modelo', ''), 'claude-opus-5-5'), 'plano', (valor->>'custo_usd')::numeric, (valor->>'criado_em')::timestamptz
from config where chave = 'plano_ia' and (valor->>'custo_usd') ~ '^[0-9.]+$' and (valor->>'custo_usd')::numeric > 0 and valor->>'criado_em' is not null
  and exists (select 1 from agentes where id = 'editor-chefe');

-- O consumo dos últimos 30 dias, por agente e por modelo, com os recortes de hoje e de 7 dias.
create or replace function escritorio_consumo() returns jsonb
language sql stable security definer set search_path = public as $$
  with hoje as (select (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as i)
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
    select agente_id, modelo,
      count(*) filter (where criado_em >= (select i from hoje))::int as chamadas_hoje,
      coalesce(sum(custo_usd) filter (where criado_em >= (select i from hoje)), 0)::float8 as custo_hoje,
      count(*) filter (where criado_em >= now() - interval '7 days')::int as chamadas_7d,
      coalesce(sum(custo_usd) filter (where criado_em >= now() - interval '7 days'), 0)::float8 as custo_7d,
      count(*)::int as chamadas_30d,
      coalesce(sum(custo_usd), 0)::float8 as custo_30d,
      coalesce(sum(tokens_entrada), 0)::bigint as tokens_entrada_30d,
      coalesce(sum(tokens_saida), 0)::bigint as tokens_saida_30d
    from consumo_ia where criado_em >= now() - interval '30 days'
    group by agente_id, modelo
  ) x
$$;
revoke all on function escritorio_consumo() from public, anon, authenticated;

-- O gasto do dia e do mês do escritório passa a sair só de consumo_ia (antes somava turnos e atendimentos).
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
    'custo_hoje', (select coalesce(sum(custo_usd), 0) from consumo_ia where criado_em >= (select inicio from hoje)),
    'custo_mes', (select coalesce(sum(custo_usd), 0) from consumo_ia where criado_em >= (select inicio from mes)),
    'na_mesa', (select count(*) from propostas where status = 'nova'),
    'aprovadas', (select count(*) from propostas where status = 'aprovada')
  )
$$;
revoke all on function escritorio_resumo() from public, anon, authenticated;
