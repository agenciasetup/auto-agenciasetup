-- Área de membros, Fase D (Vender dentro e checkout completo) de docs/area-de-membros.md: presente, plano equipe (vagas),
-- upsell e downsell depois de pagar, upgrade (paga a diferença), indique um amigo e nota fiscal automática.
-- Mesma regra do resto do banco: RLS ligado e nenhuma política. Só o Worker (chave secreta) lê e escreve.

-- ============================================================ pedido: presente, upsell, indicação e nota fiscal
-- presente: { "email": "...", "nome": "...", "mensagem": "..." } — o acesso vai para essa pessoa.
alter table pedidos add column if not exists presente jsonb;
alter table pedidos add column if not exists pedido_origem uuid references pedidos(id) on delete set null;
alter table pedidos add column if not exists indicado_por uuid references alunos(id) on delete set null;
alter table pedidos add column if not exists vagas int not null default 1 check (vagas between 1 and 50);

-- Libera os cursos do pedido para outra pessoa (presente ou vaga do plano equipe). O reembolso tira de todos
-- (revogar_pedido vai pelo pedido_id da matrícula).
create or replace function liberar_pedido_para(p_pedido uuid, p_aluno uuid) returns int
language plpgsql as $$
declare p pedidos; n int := 0; r record;
begin
  select * into p from pedidos where id = p_pedido;
  if not found then return 0; end if;
  for r in
    select distinct pa.curso_id, pa.dias from jsonb_array_elements(p.itens) it
    join produto_acessos pa on pa.produto_id = (it->>'produto_id')::uuid
  loop
    insert into matriculas (aluno_id, curso_id, pedido_id, origem, inicio, fim, status)
    values (p_aluno, r.curso_id, p.id, case when p.teste then 'teste' when p.presente is not null then 'presente' else 'compra' end, now(),
            case when r.dias is null then null else now() + make_interval(days => r.dias) end, 'ativa')
    on conflict (aluno_id, curso_id) do update set status = 'ativa', motivo = null, pedido_id = excluded.pedido_id,
      fim = case when matriculas.fim is null or excluded.fim is null then null else greatest(matriculas.fim, now()) + make_interval(days => r.dias) end;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ============================================================ plano equipe: as vagas que o comprador distribui
create table vagas_equipe (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  email text not null,
  aluno_id uuid references alunos(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (pedido_id, email)
);
alter table vagas_equipe enable row level security;

-- ============================================================ indique um amigo
alter table alunos add column if not exists codigo_indicacao text unique check (codigo_indicacao is null or codigo_indicacao ~ '^[a-z0-9]{6,12}$');
create table indicacoes (
  id uuid primary key default gen_random_uuid(),
  indicador_id uuid not null references alunos(id) on delete cascade,
  pedido_id uuid not null unique references pedidos(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente','paga','cancelada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger indicacoes_tocar before update on indicacoes for each row execute function tocar_atualizado();
create index indicacoes_indicador on indicacoes (indicador_id, status);
alter table indicacoes enable row level security;

-- ============================================================ nota fiscal (NFS-e pelo Asaas, depois da confirmação)
create table notas_fiscais (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null unique references pedidos(id) on delete cascade,
  asaas_id text,
  status text not null default 'pendente' check (status in ('pendente','agendada','emitida','erro','cancelada')),
  numero text,
  pdf_url text,
  erro text,
  tentativas int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger notas_fiscais_tocar before update on notas_fiscais for each row execute function tocar_atualizado();
create index notas_fiscais_fila on notas_fiscais (status, atualizado_em);
alter table notas_fiscais enable row level security;

-- Selo de quem indica.
insert into conquistas (id, nome, descricao, raridade, icone, cor, regra, xp, ordem) values
  ('indicou', 'Trouxe a turma', 'Indicou alguém que comprou.', 'rara', 'coracao', '#ff375f', '{"tipo":"manual"}', 50, 130)
on conflict (id) do nothing;
