-- Área de membros, Fase C (Aprender aplicando) de docs/area-de-membros.md: comentários com minuto, curtidas,
-- anotações, avaliações, certificado com 70%, tutor de IA (conversas, custo e respostas prontas) e pausa prática.
-- Mesma regra do resto do banco: RLS ligado e nenhuma política. Só o Worker (chave secreta) lê e escreve.

-- ============================================================ aula: pausa prática e "curso vivo"
-- pausas: [{ s, texto }] — no segundo s o vídeo pausa e mostra "Agora faça isto", com "Fiz, continuar".
alter table aulas add column if not exists pausas jsonb not null default '[]';
-- Quando o conteúdo da aula mudou de verdade (selo "Atualizada" e aviso para quem já viu).
alter table aulas add column if not exists conteudo_atualizado_em timestamptz;

-- ============================================================ comentários (com minuto) e reações
create table comentarios (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references aulas(id) on delete cascade,
  curso_id uuid not null references cursos(id) on delete cascade,
  aluno_id uuid references alunos(id) on delete cascade,
  equipe_id uuid references equipe(id) on delete set null,
  pai_id uuid references comentarios(id) on delete cascade,
  minuto_s int check (minuto_s is null or minuto_s >= 0),
  texto text not null check (char_length(texto) between 1 and 2000),
  tipo text not null default 'comentario' check (tipo in ('comentario','duvida','elogio')),
  status text not null default 'publicado' check (status in ('publicado','pendente','oculto')),
  motivo_pendente text,
  oficial boolean not null default false,
  fixado boolean not null default false,
  resolvido boolean not null default false,
  curtidas int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (aluno_id is not null or equipe_id is not null)
);
create trigger comentarios_tocar before update on comentarios for each row execute function tocar_atualizado();
create index comentarios_aula on comentarios (aula_id, criado_em desc);
create index comentarios_fila on comentarios (status, criado_em desc);
create index comentarios_pai on comentarios (pai_id);
alter table comentarios enable row level security;

create table comentario_reacoes (
  comentario_id uuid not null references comentarios(id) on delete cascade,
  aluno_id uuid not null references alunos(id) on delete cascade,
  tipo text not null check (tipo in ('curtida','resolveu')),
  criado_em timestamptz not null default now(),
  primary key (comentario_id, aluno_id, tipo)
);
alter table comentario_reacoes enable row level security;

-- Liga ou desliga uma reação e acerta a contagem de curtidas. "Resolveu" marca o comentário como resolvido.
create or replace function reagir_comentario(p_comentario uuid, p_aluno uuid, p_tipo text, p_ligar boolean) returns int
language plpgsql as $$
declare n int;
begin
  if p_ligar then
    insert into comentario_reacoes (comentario_id, aluno_id, tipo) values (p_comentario, p_aluno, p_tipo) on conflict do nothing;
  else
    delete from comentario_reacoes where comentario_id = p_comentario and aluno_id = p_aluno and tipo = p_tipo;
  end if;
  select count(*) into n from comentario_reacoes where comentario_id = p_comentario and tipo = 'curtida';
  update comentarios set curtidas = n,
    resolvido = resolvido or exists (select 1 from comentario_reacoes where comentario_id = p_comentario and tipo = 'resolveu')
  where id = p_comentario;
  return n;
end $$;

-- ============================================================ anotações do aluno (presas ao minuto)
create table anotacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  aula_id uuid not null references aulas(id) on delete cascade,
  minuto_s int not null default 0 check (minuto_s >= 0),
  texto text not null check (char_length(texto) between 1 and 2000),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger anotacoes_tocar before update on anotacoes for each row execute function tocar_atualizado();
create index anotacoes_aluno on anotacoes (aluno_id, aula_id, minuto_s);
alter table anotacoes enable row level security;

-- ============================================================ avaliações
-- "Essa aula te ajudou?" (polegar) e a nota do curso (0 a 10, depois de 50% e no certificado).
create table avaliacoes_aula (
  aluno_id uuid not null references alunos(id) on delete cascade,
  aula_id uuid not null references aulas(id) on delete cascade,
  util boolean not null,
  motivo text check (motivo is null or char_length(motivo) <= 500),
  criado_em timestamptz not null default now(),
  primary key (aluno_id, aula_id)
);
alter table avaliacoes_aula enable row level security;

create table avaliacoes_curso (
  aluno_id uuid not null references alunos(id) on delete cascade,
  curso_id uuid not null references cursos(id) on delete cascade,
  nota int not null check (nota between 0 and 10),
  texto text check (texto is null or char_length(texto) <= 1000),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (aluno_id, curso_id)
);
create trigger avaliacoes_curso_tocar before update on avaliacoes_curso for each row execute function tocar_atualizado();
alter table avaliacoes_curso enable row level security;

-- ============================================================ certificado
create table certificados (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[A-Z0-9]{10}$'),
  aluno_id uuid not null references alunos(id) on delete cascade,
  curso_id uuid not null references cursos(id) on delete cascade,
  nome text not null,
  curso_titulo text not null,
  horas numeric(6,1) not null default 0,
  aulas_feitas int not null default 0,
  aulas_total int not null default 0,
  emitido_em timestamptz not null default now(),
  unique (aluno_id, curso_id)
);
alter table certificados enable row level security;

-- ============================================================ tutor de IA
create table tutor_conversas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  aula_id uuid references aulas(id) on delete set null,
  curso_id uuid references cursos(id) on delete set null,
  status text not null default 'aberta' check (status in ('aberta','enviada','respondida')),
  resposta_equipe text,
  respondida_por uuid references equipe(id) on delete set null,
  respondida_em timestamptz,
  enviada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger tutor_conversas_tocar before update on tutor_conversas for each row execute function tocar_atualizado();
create index tutor_conversas_aluno on tutor_conversas (aluno_id, aula_id, atualizado_em desc);
create index tutor_conversas_fila on tutor_conversas (status, atualizado_em desc);
alter table tutor_conversas enable row level security;

create table tutor_respostas_prontas (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid references cursos(id) on delete cascade,
  aula_id uuid references aulas(id) on delete cascade,
  pergunta text not null,
  resposta text not null,
  palavras text[] not null default '{}',
  ativa boolean not null default true,
  usos int not null default 0,
  criado_por uuid references equipe(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index tutor_prontas_aula on tutor_respostas_prontas (aula_id) where ativa;
alter table tutor_respostas_prontas enable row level security;

create table tutor_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references tutor_conversas(id) on delete cascade,
  aluno_id uuid not null references alunos(id) on delete cascade,
  papel text not null check (papel in ('aluno','tutor','equipe')),
  texto text not null,
  com_imagem boolean not null default false,
  modelo text,
  entrada_tokens int not null default 0,
  saida_tokens int not null default 0,
  cache_lido_tokens int not null default 0,
  cache_criado_tokens int not null default 0,
  custo_usd numeric(12,6) not null default 0,
  pronta_id uuid references tutor_respostas_prontas(id) on delete set null,
  util boolean,
  criado_em timestamptz not null default now()
);
create index tutor_mensagens_conversa on tutor_mensagens (conversa_id, criado_em);
create index tutor_mensagens_aluno_dia on tutor_mensagens (aluno_id, criado_em) where papel = 'aluno';
create index tutor_mensagens_mes on tutor_mensagens (criado_em) where papel = 'tutor';
alter table tutor_mensagens enable row level security;

-- Gasto do mês (em dólar) e perguntas do aluno hoje, para o teto e o limite do painel.
create or replace function tutor_gasto_mes() returns numeric
language sql stable as $$
  select coalesce(sum(custo_usd), 0) from tutor_mensagens where papel = 'tutor' and criado_em >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
$$;
create or replace function tutor_perguntas_hoje(p_aluno uuid) returns int
language sql stable as $$
  select count(*)::int from tutor_mensagens where aluno_id = p_aluno and papel = 'aluno' and criado_em >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
$$;
