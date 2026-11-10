-- O Treino da Colmeia e o formato dos itens (10/11/2026). Pedido do dono: "Seria ótimo criarmos um ambiente de testes,
-- onde eu e o Erick conversamos. Um como cliente, outro como suporte/atendente. E aí você vai aprendendo com nossas
-- conversas. Pode colocar um botão de recomeçar, salvar, aprender." E, sobre a Colmeia: "Eu não entendi se coloco
-- exatamente o que você deve responder, ou se explico o contexto."
--
-- colmeia.modo: como o item foi ensinado. frase = as palavras do dono, para o vendedor usar como estão (uma mensagem
-- por linha). explicacao = o dono explicou o que fazer e o vendedor escreve do jeito dele. Vazio (null) em lição de
-- vendedor e em item que ninguém classificou: esses seguem como eram.
alter table colmeia add column modo text check (modo is null or modo in ('frase','explicacao'));

-- treinos: uma conversa de ensaio. aberta = a conversa do momento (uma só, a mesma para todo mundo que abre a tela),
-- salva = guardada na lista, descartada = saiu da lista (nada é apagado). n = quantas falas tinha ao salvar.
-- aprendizado: o que o último "Aprender" entregou: { em, por, ids (itens da Colmeia criados), ja_sabia, resumo }.
create table treinos (
  id uuid primary key default gen_random_uuid(),
  titulo text check (titulo is null or char_length(titulo) <= 120),
  status text not null default 'aberta' check (status in ('aberta','salva','descartada')),
  criado_por text check (criado_por is null or char_length(criado_por) <= 80),
  n int not null default 0,
  aprendizado jsonb check (aprendizado is null or jsonb_typeof(aprendizado) = 'object'),
  aprendido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index treinos_status on treinos (status, atualizado_em desc);
alter table treinos enable row level security;

-- As falas. papel: cliente e atendente são as duas pontas da conversa; nota é um aviso do sistema no meio dela (o que
-- o Atendente de IA faria em vez de responder). ia = escrita pelo Atendente de IA em teste: nunca ensina nada.
create table treino_mensagens (
  id bigint generated always as identity primary key,
  treino_id uuid not null references treinos (id) on delete cascade,
  papel text not null check (papel in ('cliente','atendente','nota')),
  texto text not null check (char_length(texto) between 1 and 1000),
  autor text check (autor is null or char_length(autor) <= 80),
  ia boolean not null default false,
  criado_em timestamptz not null default now()
);
create index treino_mensagens_treino on treino_mensagens (treino_id, id);
alter table treino_mensagens enable row level security;

-- O formato dos 29 itens que valiam em 10/11/2026, um a um (lidos e classificados na revisão). Frase pronta: os que
-- já eram a fala do dono, inteira. Explicação: regras, fatos de produto, junções e respostas que dizem o que fazer.
-- A lição de vendedor fica sem formato. Item que não existir mais é só pulado.
update colmeia set modo = 'frase' where modo is null and id in (
  '8df7b4b2-8c8c-46b3-851e-cffbcb95597b',
  'b4989695-5056-412d-8ab4-5141f21c953d',
  'acc7e8b4-c9fd-4222-b998-9dbba61b6d3d',
  'cec00341-3275-4b85-8924-76f729f9211a',
  '1189f4f1-dc11-46e4-abee-e5f82f900c75',
  '7677c66d-1d89-4b5d-93cb-687816fe0396',
  '3a3573d3-9eb1-47e7-a4f2-9ca2ca96384d',
  'b9ef45ee-f7cc-4f8b-a831-f6fa8b4fac65'
);
update colmeia set modo = 'explicacao' where modo is null and id in (
  '2e1cba49-fd70-4da1-ad20-88b8a64df673',
  'e5658914-2b5d-4690-a9f9-5eae0fa46d4f',
  '7cfd998b-68ff-4ef1-b2ca-565272c6a6a9',
  '182393fc-9844-4454-ac75-7f4eebffd6ae',
  '8df97714-e940-4b4f-a041-6c7c8f54e877',
  'fbb191be-64c8-46e9-8dea-e86788d0ac9d',
  '4747e527-d7f0-4bfb-91b2-6056e95d68df',
  'ee893935-925d-46f4-a45c-1a6c07dbf50c',
  '2c071c11-d453-4c22-b894-2edbd2b906b5',
  'd84b17e0-d5b4-4082-a945-06424ca18a53',
  '2db5a2c4-d6a1-4784-b586-ab4a73f38174',
  '832fb52c-2b57-499c-8453-1a6708f1c721',
  'd58a6b5d-ad9c-4c80-a746-c046ba2cd565',
  '1ae02b65-30bb-487b-a4f2-1f92503e1aed',
  '6cab20e8-012f-4001-aced-3e08eaf7cc5e',
  'a322d9d2-711a-4385-aaf7-c5d5a0daf97e',
  '8e340845-5c62-4418-a267-a65e3fc4a128',
  '249b44d0-fab7-41f7-95eb-63849177ca32',
  'ec69e259-8c64-45a9-9693-35d5b2592e4b',
  '32d83827-5a8f-4159-9d43-afb5e22d3b4b',
  '7c17dc61-e325-4c9f-bcbb-2bf23ddc38eb'
);
