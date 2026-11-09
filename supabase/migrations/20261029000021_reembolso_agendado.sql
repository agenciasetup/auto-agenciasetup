-- Fila de reembolso (pedido do dono em 29/10/2026): no painel, o reembolso é agendado para daqui a N dias (padrão 7),
-- para o dinheiro só sair do caixa no dia. O relógio de 10 minutos devolve no Asaas quando chega a hora.
-- Enquanto está na fila, o pedido continua "pago" (conta no faturamento). Cancelar antes do dia tira da fila e,
-- se o acesso tinha caído, devolve o acesso.
-- status: agendado (na fila), devolvendo (o relógio pegou), feito, cancelado, falhou (3 tentativas sem sucesso).
create table reembolsos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  status text not null default 'agendado' check (status in ('agendado','devolvendo','feito','cancelado','falhou')),
  dias int not null check (dias between 0 and 30),
  devolver_em timestamptz not null,
  motivo text check (motivo is null or char_length(motivo) <= 300),
  tirou_acesso boolean not null default true,
  pedido_por uuid references equipe(id) on delete set null,
  cancelado_por uuid references equipe(id) on delete set null,
  nota text,                                -- ex.: "devolvido fora do painel", "contestação no cartão"
  erro text,
  tentativas int not null default 0,
  feito_em timestamptz,
  criado_em timestamptz not null default now()
);
-- Um reembolso aberto por pedido.
create unique index reembolsos_aberto_por_pedido on reembolsos (pedido_id) where status in ('agendado','devolvendo');
create index reembolsos_fila on reembolsos (devolver_em) where status = 'agendado';
alter table reembolsos enable row level security;
