-- Área de membros, Fase E (Engajar) de docs/area-de-membros.md: XP, selos (conquistas), níveis, ranking, sequência de dias,
-- desafios e mural de criações, depoimentos que liberam material, avisos e eventos ao vivo, sino e perfil público.
-- Mesma regra do resto do banco: RLS ligado e nenhuma política. Só o Worker (chave secreta) lê e escreve.

-- ============================================================ aluno: perfil público, boas-vindas e jogo
alter table alunos add column if not exists usuario text unique check (usuario is null or usuario ~ '^[a-z0-9._]{3,30}$');
alter table alunos add column if not exists cidade text;
alter table alunos add column if not exists links jsonb not null default '[]';
alter table alunos add column if not exists objetivo text;
alter table alunos add column if not exists aulas_semana int check (aulas_semana is null or aulas_semana between 1 and 30);
alter table alunos add column if not exists boas_vindas_em timestamptz;
alter table alunos add column if not exists xp int not null default 0;
alter table alunos add column if not exists moldura boolean not null default false;
alter table alunos add column if not exists sequencia int not null default 0;
alter table alunos add column if not exists maior_sequencia int not null default 0;
alter table alunos add column if not exists ultimo_dia date;
-- Ranking só com quem aceitou (seção 2.10): o padrão passa a ser "não aparece".
alter table alunos alter column no_ranking set default false;
update alunos set no_ranking = false where boas_vindas_em is null;

-- ============================================================ XP
create table xp_eventos (
  id bigint generated always as identity primary key,
  aluno_id uuid not null references alunos(id) on delete cascade,
  tipo text not null,
  pontos int not null check (pontos between -1000 and 1000),
  ref text not null,
  curso_id uuid references cursos(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (aluno_id, ref)
);
create index xp_eventos_quando on xp_eventos (criado_em desc);
create index xp_eventos_aluno on xp_eventos (aluno_id, criado_em desc);
alter table xp_eventos enable row level security;

-- Soma XP uma vez por ref (aula, passo, curtida...). Devolve o XP novo, ou null se já tinha ganho.
create or replace function ganhar_xp(p_aluno uuid, p_tipo text, p_pontos int, p_ref text, p_curso uuid default null) returns int
language plpgsql as $$
declare n int;
begin
  insert into xp_eventos (aluno_id, tipo, pontos, ref, curso_id) values (p_aluno, p_tipo, p_pontos, p_ref, p_curso) on conflict (aluno_id, ref) do nothing;
  if not found then return null; end if;
  update alunos set xp = greatest(0, xp + p_pontos) where id = p_aluno returning xp into n;
  return n;
end $$;

-- Dia de estudo: mantém a sequência (dias seguidos, no fuso de São Paulo) e dá 5 XP por dia.
create or replace function marcar_dia(p_aluno uuid) returns int
language plpgsql as $$
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date; u date; s int;
begin
  select ultimo_dia, sequencia into u, s from alunos where id = p_aluno for update;
  if u = hoje then return s; end if;
  s := case when u = hoje - 1 then s + 1 else 1 end;
  update alunos set ultimo_dia = hoje, sequencia = s, maior_sequencia = greatest(maior_sequencia, s) where id = p_aluno;
  perform ganhar_xp(p_aluno, 'dia', 5, 'dia:' || hoje::text, null);
  if extract(hour from now() at time zone 'America/Sao_Paulo') between 5 and 6 then
    perform ganhar_xp(p_aluno, 'madrugador', 0, 'madrugador:' || hoje::text, null);
  end if;
  return s;
end $$;

-- ============================================================ selos (conquistas)
-- regra: { "tipo": "aulas|modulos|cursos|passos|sequencia|uteis|entregas|destaques|certificados|aula|madrugador|depoimento", "n": 1, "codigo": "3.3" }
create table conquistas (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  nome text not null,
  descricao text not null,
  raridade text not null default 'comum' check (raridade in ('comum','rara','epica','lendaria')),
  icone text not null default 'medalha',
  cor text not null default '#ff7a00',
  regra jsonb not null default '{}',
  xp int not null default 0,
  ordem int not null default 0,
  ativa boolean not null default true,
  secreta boolean not null default false,
  criado_em timestamptz not null default now()
);
alter table conquistas enable row level security;

create table aluno_conquistas (
  aluno_id uuid not null references alunos(id) on delete cascade,
  conquista_id text not null references conquistas(id) on delete cascade,
  ganha_em timestamptz not null default now(),
  vista boolean not null default false,
  primary key (aluno_id, conquista_id)
);
alter table aluno_conquistas enable row level security;

-- Confere as regras e entrega os selos novos. Devolve os ids ganhos agora.
create or replace function verificar_conquistas(p_aluno uuid) returns text[]
language plpgsql as $$
declare
  c record; v int; ganhos text[] := '{}';
  n_aulas int; n_passos int; n_modulos int; n_cursos int; n_uteis int; n_entregas int; n_destaques int; n_cert int; n_seq int; n_madrugador int; n_dep int;
begin
  select count(*) into n_aulas from progresso where aluno_id = p_aluno and concluida_em is not null;
  select coalesce(sum(coalesce(array_length(passos, 1), 0)), 0) into n_passos from progresso where aluno_id = p_aluno;
  select count(*) into n_modulos from modulos m
    where exists (select 1 from aulas a where a.modulo_id = m.id and a.status = 'publicado')
      and not exists (select 1 from aulas a where a.modulo_id = m.id and a.status = 'publicado'
        and not exists (select 1 from progresso p where p.aula_id = a.id and p.aluno_id = p_aluno and p.concluida_em is not null));
  select count(*) into n_cursos from cursos cu
    where exists (select 1 from aulas a where a.curso_id = cu.id and a.status = 'publicado')
      and not exists (select 1 from aulas a where a.curso_id = cu.id and a.status = 'publicado'
        and not exists (select 1 from progresso p where p.aula_id = a.id and p.aluno_id = p_aluno and p.concluida_em is not null));
  select count(*) into n_uteis from comentario_reacoes r join comentarios co on co.id = r.comentario_id where co.aluno_id = p_aluno;
  select count(*) filter (where status in ('aprovada','destaque')), count(*) filter (where status = 'destaque') into n_entregas, n_destaques from entregas where aluno_id = p_aluno;
  select count(*) into n_cert from certificados where aluno_id = p_aluno;
  select maior_sequencia into n_seq from alunos where id = p_aluno;
  select count(*) into n_madrugador from xp_eventos where aluno_id = p_aluno and tipo = 'madrugador';
  select count(*) into n_dep from depoimentos where aluno_id = p_aluno and status = 'aprovado';
  for c in select * from conquistas where ativa and id not in (select conquista_id from aluno_conquistas where aluno_id = p_aluno) loop
    v := case c.regra->>'tipo'
      when 'aulas' then n_aulas when 'passos' then n_passos when 'modulos' then n_modulos when 'cursos' then n_cursos
      when 'uteis' then n_uteis when 'entregas' then n_entregas when 'destaques' then n_destaques when 'certificados' then n_cert
      when 'sequencia' then n_seq when 'madrugador' then n_madrugador when 'depoimento' then n_dep
      when 'aula' then (select count(*) from progresso p join aulas a on a.id = p.aula_id where p.aluno_id = p_aluno and p.concluida_em is not null and a.codigo = c.regra->>'codigo')
      else 0 end;
    if v >= coalesce((c.regra->>'n')::int, 1) then
      insert into aluno_conquistas (aluno_id, conquista_id) values (p_aluno, c.id) on conflict do nothing;
      if found then
        ganhos := ganhos || c.id;
        if c.xp <> 0 then perform ganhar_xp(p_aluno, 'conquista', c.xp, 'conquista:' || c.id, null); end if;
      end if;
    end if;
  end loop;
  return ganhos;
end $$;

-- Ranking do período (semana, mês ou tudo), geral ou por curso. Só quem aceitou aparecer.
create or replace function ranking(p_desde timestamptz, p_curso uuid default null, p_limite int default 10)
returns table (aluno_id uuid, nome text, foto_url text, usuario text, moldura boolean, pontos bigint, posicao bigint)
language sql stable as $$
  with t as (
    select a.id, a.nome, a.foto_url, a.usuario, a.moldura, sum(x.pontos) pontos
    from xp_eventos x join alunos a on a.id = x.aluno_id
    where a.no_ranking and x.criado_em >= p_desde and (p_curso is null or x.curso_id = p_curso)
    group by a.id
  )
  select id, nome, foto_url, usuario, moldura, pontos, rank() over (order by pontos desc) from t order by pontos desc, nome limit p_limite;
$$;

create or replace function posicao_ranking(p_aluno uuid, p_desde timestamptz, p_curso uuid default null)
returns table (pontos bigint, posicao bigint, participantes bigint)
language sql stable as $$
  with t as (
    select a.id, sum(x.pontos) pontos
    from xp_eventos x join alunos a on a.id = x.aluno_id
    where (a.no_ranking or a.id = p_aluno) and x.criado_em >= p_desde and (p_curso is null or x.curso_id = p_curso)
    group by a.id
  ), r as (select id, pontos, rank() over (order by pontos desc) posicao, count(*) over () participantes from t)
  select pontos, posicao, participantes from r where id = p_aluno;
$$;

-- ============================================================ desafios e mural de criações
create table desafios (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  titulo text not null,
  descricao text not null default '',
  regras text,
  premio text,
  curso_id uuid references cursos(id) on delete set null,
  capa_url text,
  inicio timestamptz not null default now(),
  fim timestamptz,
  conquista_id text references conquistas(id) on delete set null,
  status text not null default 'rascunho' check (status in ('rascunho','aberto','encerrado')),
  criado_por uuid references equipe(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger desafios_tocar before update on desafios for each row execute function tocar_atualizado();
alter table desafios enable row level security;

create table entregas (
  id uuid primary key default gen_random_uuid(),
  desafio_id uuid references desafios(id) on delete set null,
  aluno_id uuid not null references alunos(id) on delete cascade,
  curso_id uuid references cursos(id) on delete set null,
  aula_id uuid references aulas(id) on delete set null,
  titulo text not null check (char_length(titulo) between 2 and 120),
  descricao text check (descricao is null or char_length(descricao) <= 1000),
  link text,
  imagem_url text,
  autoriza_repost boolean not null default false,
  status text not null default 'pendente' check (status in ('pendente','aprovada','destaque','recusada')),
  motivo text,
  curtidas int not null default 0,
  avaliada_por uuid references equipe(id) on delete set null,
  avaliada_em timestamptz,
  criado_em timestamptz not null default now(),
  check (link is not null or imagem_url is not null)
);
create index entregas_mural on entregas (status, criado_em desc);
create index entregas_desafio on entregas (desafio_id, status);
alter table entregas enable row level security;

create table entrega_curtidas (
  entrega_id uuid not null references entregas(id) on delete cascade,
  aluno_id uuid not null references alunos(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (entrega_id, aluno_id)
);
alter table entrega_curtidas enable row level security;

create or replace function curtir_entrega(p_entrega uuid, p_aluno uuid, p_ligar boolean) returns int
language plpgsql as $$
declare n int;
begin
  if p_ligar then insert into entrega_curtidas (entrega_id, aluno_id) values (p_entrega, p_aluno) on conflict do nothing;
  else delete from entrega_curtidas where entrega_id = p_entrega and aluno_id = p_aluno; end if;
  select count(*) into n from entrega_curtidas where entrega_id = p_entrega;
  update entregas set curtidas = n where id = p_entrega;
  return n;
end $$;

-- ============================================================ depoimentos (feedback que vira material)
create table depoimentos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  curso_id uuid not null references cursos(id) on delete cascade,
  nota int not null check (nota between 0 and 10),
  texto text not null check (char_length(texto) between 10 and 2000),
  video_url text,
  autoriza_uso boolean not null default false,
  status text not null default 'pendente' check (status in ('pendente','aprovado','recusado')),
  na_landing boolean not null default false,
  resultado text,
  resultado_em timestamptz,
  avaliado_por uuid references equipe(id) on delete set null,
  avaliado_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (aluno_id, curso_id)
);
create index depoimentos_fila on depoimentos (status, criado_em desc);
alter table depoimentos enable row level security;

-- Material que só libera depois do depoimento ("conta como foi e ganhe o pack").
alter table arquivos add column if not exists recompensa boolean not null default false;

-- ============================================================ comunicação: banners, avisos, eventos ao vivo e o sino
-- publico: { "curso_id": "...", "sem_produto_id": "...", "parado_dias": 7, "min_pct": 50, "concluiu": true }
create table avisos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('banner','aviso','evento')),
  titulo text not null,
  texto text,
  imagem_url text,
  botao_texto text,
  botao_link text,
  publico jsonb not null default '{}',
  inicio timestamptz not null default now(),
  fim timestamptz,
  evento_em timestamptz,
  evento_fim timestamptz,
  evento_link text,
  gravacao_aula_id uuid references aulas(id) on delete set null,
  importante boolean not null default false,
  ativo boolean not null default true,
  ordem int not null default 0,
  vistos int not null default 0,
  cliques int not null default 0,
  fechados int not null default 0,
  lembretes int not null default 0,
  criado_por uuid references equipe(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger avisos_tocar before update on avisos for each row execute function tocar_atualizado();
create index avisos_ativos on avisos (ativo, inicio, fim);
alter table avisos enable row level security;

create table aviso_interacoes (
  aviso_id uuid not null references avisos(id) on delete cascade,
  aluno_id uuid not null references alunos(id) on delete cascade,
  tipo text not null check (tipo in ('visto','clique','fechado','lembrete')),
  criado_em timestamptz not null default now(),
  primary key (aviso_id, aluno_id, tipo)
);
alter table aviso_interacoes enable row level security;

create or replace function interagir_aviso(p_aviso uuid, p_aluno uuid, p_tipo text) returns void
language plpgsql as $$
begin
  insert into aviso_interacoes (aviso_id, aluno_id, tipo) values (p_aviso, p_aluno, p_tipo) on conflict do nothing;
  if found then
    update avisos set
      vistos = vistos + (p_tipo = 'visto')::int, cliques = cliques + (p_tipo = 'clique')::int,
      fechados = fechados + (p_tipo = 'fechado')::int, lembretes = lembretes + (p_tipo = 'lembrete')::int
    where id = p_aviso;
  end if;
end $$;

create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  texto text,
  link text,
  ref text,
  lida_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (aluno_id, ref)
);
create index notificacoes_aluno on notificacoes (aluno_id, criado_em desc);
alter table notificacoes enable row level security;

-- Respostas prontas do tutor: conta o uso (Fase C).
create or replace function contar_resposta_pronta(p_id uuid) returns void
language sql as $$ update tutor_respostas_prontas set usos = usos + 1 where id = p_id; $$;

-- ============================================================ selos iniciais (a equipe edita no painel)
insert into conquistas (id, nome, descricao, raridade, icone, cor, regra, xp, ordem) values
  ('primeira-aula', 'Primeira aula', 'Concluiu a primeira aula.', 'comum', 'tocar', '#34c759', '{"tipo":"aulas","n":1}', 10, 10),
  ('modulo-completo', 'Módulo completo', 'Terminou um módulo inteiro.', 'comum', 'listas', '#0a84ff', '{"tipo":"modulos","n":1}', 20, 20),
  ('aplicou-10', 'Aplicou 10 vezes', 'Fez 10 passos do "Faça agora".', 'rara', 'ok', '#ff9f0a', '{"tipo":"passos","n":10}', 30, 30),
  ('primeiro-post', 'Primeiro post automático', 'Concluiu a aula dos posts do dia.', 'rara', 'brilho', '#ff7a00', '{"tipo":"aula","codigo":"3.3","n":1}', 40, 40),
  ('sequencia-7', 'Sete dias seguidos', 'Estudou 7 dias seguidos.', 'epica', 'relogio', '#bf5af2', '{"tipo":"sequencia","n":7}', 50, 50),
  ('madrugador', 'Madrugador', 'Estudou antes das 7 da manhã.', 'rara', 'relogio', '#64d2ff', '{"tipo":"madrugador","n":1}', 10, 60),
  ('ajudou-turma', 'Ajudou a turma', 'Recebeu 5 curtidas ou "resolveu" nos comentários.', 'rara', 'curtir', '#ff375f', '{"tipo":"uteis","n":5}', 30, 70),
  ('criador', 'Criador', 'Teve uma criação aprovada no mural.', 'epica', 'modelo', '#ff7a00', '{"tipo":"entregas","n":1}', 50, 80),
  ('criador-destaque', 'Criador destaque', 'Teve uma criação escolhida como destaque.', 'lendaria', 'medalha', '#ffd60a', '{"tipo":"destaques","n":1}', 100, 90),
  ('curso-concluido', 'Curso concluído', 'Terminou todas as aulas de um curso.', 'epica', 'curso', '#30d158', '{"tipo":"cursos","n":1}', 100, 100),
  ('certificado', 'Certificado', 'Conquistou um certificado.', 'epica', 'escudo', '#ffd60a', '{"tipo":"certificados","n":1}', 50, 110),
  ('deu-a-real', 'Deu a real', 'Contou como foi o curso.', 'comum', 'nota', '#8e8e93', '{"tipo":"depoimento","n":1}', 20, 120)
on conflict (id) do nothing;
