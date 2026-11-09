-- Recuperar vendas (30/10/2026, pedido do dono): quem chegou no checkout e não comprou. Uma linha por pessoa e oferta:
-- nasce quando a pessoa preenche o e-mail no checkout (mesmo sem clicar em comprar) ou quando um pedido é criado.
-- situacao: nova (a chamar), chamei, comprou, nao_quer. recuperado_centavos só conta quem comprou depois de ser chamado
-- ou de receber o lembrete; quem preenche e paga na hora vira "comprou" com zero.
create table recuperacoes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  nome text,
  celular text,
  oferta_id uuid not null references ofertas(id) on delete cascade,
  moeda text not null default 'brl' check (moeda in ('brl','usd')),
  valor_centavos int not null default 0,
  visitante text,
  ultimo_toque jsonb,
  pedido_id uuid references pedidos(id) on delete set null,
  situacao text not null default 'nova' check (situacao in ('nova','chamei','comprou','nao_quer')),
  lembretes int not null default 0,
  lembrete_em timestamptz,
  chamado_em timestamptz,
  chamado_por uuid references equipe(id) on delete set null,
  contatos int not null default 0,
  nota text check (nota is null or char_length(nota) <= 500),
  comprou_em timestamptz,
  recuperado_centavos int not null default 0,
  visto_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  unique (email, oferta_id)
);
create index recuperacoes_lista on recuperacoes (situacao, visto_em desc);
alter table recuperacoes enable row level security;

-- Os pedidos não pagos dos últimos 30 dias entram na lista. Quem já comprou a mesma oferta nasce como "comprou", e os
-- lembretes que já saíram contam, para ninguém receber o mesmo e-mail duas vezes.
insert into recuperacoes (email, nome, celular, oferta_id, moeda, valor_centavos, visitante, ultimo_toque, pedido_id, situacao, lembretes, visto_em, criado_em)
select distinct on (a.email, p.oferta_id)
  a.email, a.nome, a.celular, p.oferta_id, p.moeda, p.total_centavos, p.visitante, p.ultimo_toque, p.id,
  case when exists (select 1 from pedidos q where q.aluno_id = p.aluno_id and q.oferta_id = p.oferta_id and q.status = 'pago') then 'comprou' else 'nova' end,
  (select count(*)::int from emails e where e.ref like 'recuperacao:' || p.id || ':%'),
  p.criado_em, p.criado_em
from pedidos p
join alunos a on a.id = p.aluno_id
where not p.teste and p.oferta_id is not null and p.status in ('aguardando','expirado','recusado') and p.criado_em > now() - interval '30 days'
order by a.email, p.oferta_id, p.criado_em desc;
