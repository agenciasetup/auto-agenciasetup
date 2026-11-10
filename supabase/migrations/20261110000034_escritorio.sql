-- Escritório de IA (09/11/2026, pedido do dono; plano em docs/escritorio.md). Três tabelas:
--   agentes:   quem trabalha no escritório, em qual sala, onde roda e em que estado está.
--   turnos:    cada vez que um agente trabalhou (onde rodou, como terminou, o resumo e o que custou).
--   propostas: a mesa. Todo agente entrega um cartão com prova, o dono decide, e o cartão executado recebe o resultado.
-- O público nunca fala com estas tabelas (RLS sem política): só o Worker, pelas ações de worker/lib/acoes-escritorio.js.
--
-- onde:   worker (Cloudflare, sempre ligado), nuvem (Claude Code rodando fora do computador), computador (PC ou Mac).
-- estado: ativo (trabalha hoje), pausado, planejado (está no plano, ainda não foi construído), desligado (saiu).
create table agentes (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  sala text not null check (sala in ('direcao','vendas','conteudo','video','design','sistema','produto','receita')),
  nome text not null check (char_length(nome) between 2 and 60),
  funcao text not null check (char_length(funcao) between 3 and 300),
  onde text not null default 'worker' check (onde in ('worker','nuvem','computador')),
  cadencia text check (cadencia is null or char_length(cadencia) <= 120),
  modelo text check (modelo is null or char_length(modelo) <= 60),
  estado text not null default 'planejado' check (estado in ('ativo','pausado','planejado','desligado')),
  teto_dia_usd numeric(8,2) check (teto_dia_usd is null or teto_dia_usd >= 0),
  caderno text check (caderno is null or char_length(caderno) <= 6000),
  ordem int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger agentes_tocar before update on agentes for each row execute function tocar_atualizado();
alter table agentes enable row level security;

-- status: rodando (abriu e ainda não fechou), ok, erro, sem_trabalho (rodou e não tinha o que fazer).
create table turnos (
  id bigint generated always as identity primary key,
  agente_id text not null references agentes(id) on delete cascade,
  onde text not null check (onde in ('worker','nuvem','computador')),
  status text not null default 'ok' check (status in ('rodando','ok','erro','sem_trabalho')),
  resumo text check (resumo is null or char_length(resumo) <= 1500),
  custo_usd numeric(10,4) not null default 0 check (custo_usd >= 0),
  tokens_entrada int check (tokens_entrada is null or tokens_entrada >= 0),
  tokens_saida int check (tokens_saida is null or tokens_saida >= 0),
  dados jsonb not null default '{}'::jsonb check (jsonb_typeof(dados) = 'object'),
  inicio timestamptz not null default now(),
  fim timestamptz
);
create index turnos_agente on turnos (agente_id, inicio desc);
create index turnos_inicio on turnos (inicio desc);
alter table turnos enable row level security;

-- status: nova (na mesa), aprovada (o dono disse sim, falta fazer), depois, descartada, feita (executada, com o resultado).
-- esforco: p (um dia), m (2 a 3 dias), g (uma semana).
create table propostas (
  id uuid primary key default gen_random_uuid(),
  agente_id text references agentes(id) on delete set null,
  sala text not null check (sala in ('direcao','vendas','conteudo','video','design','sistema','produto','receita')),
  titulo text not null check (char_length(titulo) between 3 and 160),
  prova text not null check (char_length(prova) between 3 and 1500),
  acao text not null check (char_length(acao) between 3 and 1500),
  esforco text not null default 'p' check (esforco in ('p','m','g')),
  ganho text check (ganho is null or char_length(ganho) <= 400),
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  status text not null default 'nova' check (status in ('nova','aprovada','depois','descartada','feita')),
  motivo text check (motivo is null or char_length(motivo) <= 500),
  decidida_em timestamptz,
  decidida_por uuid references equipe(id) on delete set null,
  decidida_nome text check (decidida_nome is null or char_length(decidida_nome) <= 60),
  resultado text check (resultado is null or char_length(resultado) <= 1500),
  feita_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index propostas_status on propostas (status, criado_em desc);
create index propostas_agente on propostas (agente_id) where agente_id is not null;
create trigger propostas_tocar before update on propostas for each row execute function tocar_atualizado();
alter table propostas enable row level security;

-- Os números da tela, de uma vez: por agente, o último turno, os turnos e o gasto de hoje e o placar das propostas;
-- e o gasto do dia e do mês do escritório inteiro. "Hoje" é o dia de Brasília.
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
    'custo_hoje', (select coalesce(sum(custo_usd), 0) from turnos where inicio >= (select inicio from hoje)),
    'custo_mes', (select coalesce(sum(custo_usd), 0) from turnos where inicio >= (select inicio from mes)),
    'na_mesa', (select count(*) from propostas where status = 'nova'),
    'aprovadas', (select count(*) from propostas where status = 'aprovada')
  )
$$;
revoke all on function escritorio_resumo() from public, anon, authenticated;

-- Quem já trabalha hoje (ativo) e quem está no plano (planejado). O painel e o conector mudam depois.
insert into agentes (id, sala, nome, funcao, onde, cadencia, modelo, estado, ordem) values
  ('chefe-de-gabinete', 'direcao', 'Chefe de gabinete', 'Junta as propostas de todos, tira o repetido e manda o resumo das 8h com as 3 decisões do dia.', 'worker', 'Todo dia, às 8h', null, 'planejado', 10),

  ('vendedor-calango', 'vendas', 'Vendedor Calango', 'Lê o direct, anota cada pessoa na lista de follow-up e manda os toques e as respostas conhecidas, dentro dos tetos.', 'computador', '9h, 10h, 12h, 16h e de 18h a 22h', null, 'ativo', 10),
  ('testador-de-mensagens', 'vendas', 'Testador de mensagens', 'Nas palavras do Comenta X, tira a versão que perde e cria uma desafiante, pelo que vende.', 'computador', 'Todo dia, às 9h', null, 'ativo', 20),
  ('entregador', 'vendas', 'Entregador (Comenta X)', 'Responde quem comenta a palavra e manda o material no direct, com o mini curso no segundo botão.', 'worker', 'Na hora de cada comentário', 'claude-haiku-5-5', 'ativo', 30),
  ('recuperador', 'vendas', 'Recuperador de vendas', 'Manda os dois e-mails para quem começou a compra e não pagou.', 'worker', '15 minutos depois e no dia seguinte', null, 'ativo', 40),
  ('atendente', 'vendas', 'Atendente', 'Responde na hora quem escreveu no direct, pela API do Instagram, sem depender do computador.', 'worker', 'Na hora de cada mensagem', 'claude-sonnet-5-5', 'planejado', 50),
  ('fiscal', 'vendas', 'Fiscal', 'Placar de cada vendedor e de cada mensagem contra as vendas.', 'worker', 'Todo dia', null, 'planejado', 60),

  ('pesquisador', 'conteudo', 'Pesquisador', 'Acompanha 25 fontes de IA e design e marca o que está quente (Em alta).', 'worker', 'A cada 10 minutos, em rodízio', null, 'ativo', 10),
  ('analista', 'conteudo', 'Analista', 'Traz os posts da conta com as métricas e dá a nota de cada um (Desempenho).', 'worker', 'A cada 10 minutos, em rodízio', null, 'ativo', 20),
  ('editor-chefe', 'conteudo', 'Editor-chefe', 'Escreve as ideias de posts e as ações para vender e alcançar mais (Plano).', 'worker', 'A cada 3 dias', 'claude-opus-5-5', 'ativo', 30),
  ('redator-de-frase', 'conteudo', 'Redator de frase', 'Monta os 2 posts de frase e deixa como rascunho, mantendo 3 dias de estoque na agenda.', 'computador', 'Todo dia, às 8h', null, 'ativo', 40),
  ('redator-de-carrossel', 'conteudo', 'Redator de carrossel', 'Monta o carrossel do tema mais quente do dia, com material grátis, como rascunho.', 'computador', 'Todo dia, às 10h', null, 'ativo', 50),
  ('revisor', 'conteudo', 'Revisor', 'Revisa cada peça com olhar de quem nunca viu, antes de mostrar ao dono.', 'computador', 'A cada peça nova', null, 'ativo', 60),
  ('publicador', 'conteudo', 'Publicador', 'Publica na hora marcada o que foi aprovado e agendado.', 'worker', 'A cada minuto', null, 'ativo', 70),
  ('olheiro', 'conteudo', 'Olheiro de concorrentes', 'Segue os perfis de referência e marca o post que saiu da curva do próprio perfil.', 'worker', 'Todo dia', 'claude-haiku-5-5', 'planejado', 80),

  ('cacador-de-ganchos', 'video', 'Caçador de ganchos', 'Guarda as primeiras frases dos Reels e Shorts que explodiram no nicho.', 'worker', 'Toda semana', 'claude-haiku-5-5', 'planejado', 10),
  ('roteirista', 'video', 'Roteirista', 'Escreve 3 roteiros de gravação de tela por semana, no formato que já viralizou.', 'worker', 'Toda semana', 'claude-sonnet-5-5', 'planejado', 20),

  ('olheiro-visual', 'design', 'Olheiro visual', 'Lê as capas que saíram da curva (cor, composição, assunto) e alimenta as referências.', 'worker', 'Toda semana', 'claude-sonnet-5-5', 'planejado', 10),
  ('diretor-de-arte', 'design', 'Diretor de arte', 'Propõe 1 teste de estilo por semana e mede por nota e salvos.', 'worker', 'Toda semana', 'claude-sonnet-5-5', 'planejado', 20),

  ('zelador', 'sistema', 'Zelador', 'Confere se cada turno rodou, o gasto e os erros, e chama o plantão quando o computador não fez.', 'worker', 'A cada 10 minutos', null, 'planejado', 10),
  ('olheiro-de-ferramentas', 'sistema', 'Olheiro de ferramentas', 'Procura repositórios, skills e novidades que melhorariam o sistema. No máximo 3 propostas por semana.', 'nuvem', 'Toda semana', 'claude-sonnet-5-5', 'planejado', 20),

  ('ouvinte', 'produto', 'Ouvinte', 'Lê as dúvidas do direct e dos alunos e os comentários, e monta o mapa do que as pessoas pedem.', 'worker', 'Toda semana', 'claude-haiku-5-5', 'planejado', 10),
  ('criador-de-oferta', 'produto', 'Criador de oferta', 'Propõe 1 produto ou order bump por mês, com um teste barato de procura antes de construir.', 'worker', 'Todo mês', 'claude-opus-5-5', 'planejado', 20),

  ('gerente-de-receita', 'receita', 'Gerente de receita', 'Olha o funil, a recuperação, o bump, o cupom e o preço, e propõe 1 ação por dia.', 'worker', 'Todo dia', 'claude-sonnet-5-5', 'planejado', 10),
  ('trafego', 'receita', 'Tráfego', 'Lê a conta de anúncios e propõe pausar, aumentar ou trocar o criativo. Não mexe em verba.', 'worker', 'Todo dia', 'claude-sonnet-5-5', 'planejado', 20)
on conflict (id) do nothing;
