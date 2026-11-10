-- A carreira dos agentes do escritório (10/11/2026): quem foi admitido, promovido, rebaixado, pausado e demitido, com o
-- motivo e a data. O dono pediu para ver isso no perfil de cada agente e num quadro geral da tela Escritório.
--
-- agentes.nivel: 1 Em experiência, 2 Efetivo, 3 Sênior, 4 Líder da sala. Promover e rebaixar mudam o nível. Quem decide
-- é o dono (ou o Claude a pedido dele), olhando o placar: propostas aprovadas, resultado medido e vendas.
alter table agentes add column nivel smallint not null default 1 check (nivel between 1 and 4);

create table agentes_historico (
  id bigint generated always as identity primary key,
  agente_id text not null references agentes(id) on delete cascade,
  tipo text not null check (tipo in ('admitido','promovido','rebaixado','pausado','voltou','demitido','nota')),
  de text check (de is null or char_length(de) <= 40),
  para text check (para is null or char_length(para) <= 40),
  motivo text check (motivo is null or char_length(motivo) <= 400),
  por uuid references equipe(id) on delete set null,
  por_nome text check (por_nome is null or char_length(por_nome) <= 80),
  criado_em timestamptz not null default now()
);
create index agentes_historico_agente on agentes_historico (agente_id, criado_em desc);
create index agentes_historico_criado on agentes_historico (criado_em desc);
alter table agentes_historico enable row level security;

-- O começo da história: quem já trabalhava entra como admitido na data em que foi criado no escritório, e como efetivo.
insert into agentes_historico (agente_id, tipo, de, para, motivo, por_nome, criado_em)
select id, 'admitido', 'planejado', 'ativo', 'Já trabalhava quando o escritório abriu.', 'Sistema', criado_em
from agentes where estado in ('ativo','pausado') and id <> 'atendente';
update agentes set nivel = 2 where estado in ('ativo','pausado') and id <> 'atendente';

-- O Atendente começou hoje, em experiência, só preparando a resposta.
insert into agentes_historico (agente_id, tipo, de, para, motivo, por_nome)
select id, 'admitido', 'planejado', 'ativo', 'Começou a atender o direct pela API, no modo que só prepara a resposta.', 'Claude'
from agentes where id = 'atendente' and estado = 'ativo';
