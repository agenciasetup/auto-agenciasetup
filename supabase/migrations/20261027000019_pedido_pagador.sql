-- Quem pagou o pedido, quando não é o caso padrão (pessoa no Brasil, com CPF).
-- Hoje: compra de quem mora fora do Brasil, sem CPF. { "estrangeiro": true, "pais": "PT", "pais_nome": "Portugal", "ddi": "351" }
-- Nulo = comprou com CPF, como sempre. Nenhum dado pessoal novo: o celular continua em alunos.celular.
alter table pedidos add column if not exists pagador jsonb;
