-- Cupom "só na primeira compra" (seção 3 de docs/area-de-membros.md): quem já tem pedido pago não usa.
alter table cupons add column if not exists primeira_compra boolean not null default false;
alter table cupons add column if not exists descricao text;
