-- A prova do aceite da licença (11/11/2026). Pedido do dono para a Família Calango (as 5 fontes da agência, arquivo
-- para baixar): "O comprador tem que aceitar a licença e o termo de aceite antes de pagar e de baixar, e esse aceite
-- tem que ficar registrado. É o registro que prova que ele concordou com as multas."
--
-- Uma linha por aceite: no checkout (momento 'compra', um por pedido) e, quando a tela de download existir, antes de
-- baixar (momento 'download'). Quem grava é o Worker (lib/vendas.js, gravarAceite), antes de criar a cobrança: sem a
-- linha gravada, o pedido não segue. Os textos aceitos ficam em lib/licencas.js, por versão; o hash (SHA-256 da frase
-- marcada, da licença e do termo) prova qual foi.
-- Gravado, o aceite não muda: o banco recusa a alteração e só deixa apagar o de pedido de teste (pagamento simulado).
-- Dado pessoal novo: o CPF (ou CNPJ) e o IP, só destes pedidos (a política de privacidade do site diz isso).
create table aceites (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos (id) on delete restrict,
  momento text not null default 'compra' check (momento in ('compra','download')),
  licenca text not null check (licenca ~ '^[a-z0-9-]{2,60}$'),
  versao text not null check (char_length(versao) between 1 and 20),
  texto text not null check (char_length(texto) between 10 and 2000),
  hash text not null check (hash ~ '^[0-9a-f]{64}$'),
  nome text not null check (char_length(nome) between 1 and 160),
  documento text check (documento is null or documento ~ '^([0-9]{11}|[0-9]{14})$'),
  email text check (email is null or char_length(email) <= 160),
  ip text check (ip is null or char_length(ip) <= 64),
  navegador text check (navegador is null or char_length(navegador) <= 500),
  teste boolean not null default false,
  criado_em timestamptz not null default now()
);
create unique index aceites_um_na_compra on aceites (pedido_id) where momento = 'compra';
create index aceites_pedido on aceites (pedido_id, criado_em);
alter table aceites enable row level security;

create or replace function aceites_nao_mudam() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' then raise exception 'O aceite gravado não muda.'; end if;
  if not old.teste then raise exception 'O aceite de um pedido de verdade não se apaga.'; end if;
  return old;
end $$;
create trigger aceites_nao_mudam before update or delete on aceites for each row execute function aceites_nao_mudam();
