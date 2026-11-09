-- O aluno pede o reembolso pelo app (pedido do dono em 29/10/2026), com várias confirmações. O pedido entra na fila
-- de reembolso (7 dias) e o acesso cai na hora. Na tela do pedido, a pessoa vê o que já usou: aulas assistidas e
-- os arquivos que baixou.

-- Quem pediu pelo app do aluno (sem ninguém da equipe).
alter table reembolsos add column if not exists pelo_aluno boolean not null default false;

-- O que cada aluno baixou. Antes daqui só havia o total por arquivo (arquivos.downloads).
create table arquivos_baixados (
  aluno_id uuid not null references alunos(id) on delete cascade,
  arquivo_id uuid not null references arquivos(id) on delete cascade,
  primeira_vez timestamptz not null default now(),
  ultima_vez timestamptz not null default now(),
  vezes int not null default 1,
  primary key (aluno_id, arquivo_id)
);
alter table arquivos_baixados enable row level security;

create or replace function baixou_arquivo(p_aluno uuid, p_arquivo uuid) returns void
language sql as $$
  insert into arquivos_baixados (aluno_id, arquivo_id) values (p_aluno, p_arquivo)
  on conflict (aluno_id, arquivo_id) do update set ultima_vez = now(), vezes = arquivos_baixados.vezes + 1;
$$;
