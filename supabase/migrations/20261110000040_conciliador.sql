-- O Conciliador da Colmeia (10/11/2026). Pedido do dono: "Crie um agente que verifica contradições. Ele é o cara que
-- soluciona isso." Às vezes dois itens da Colmeia se contradizem ou se sobrepõem, e o vendedor oscila entre os dois.
-- O Conciliador (worker/lib/agentes/conciliador.js) acha esses casos e escreve UM item novo que junta os dois.
--
-- colmeia.substitui: no item novo, a lista de quem ele substitui, como [{"id": "...", "titulo": "..."}]. Vazio (null)
-- em todo item comum. Enquanto o item novo vale, os itens de antes ficam arquivados; "Desfazer a junção" na tela
-- arquiva o novo e devolve os de antes. Junção que o dono desfez ou descartou continua guardada (arquivada), para o
-- Conciliador não propor a mesma coisa de novo.
alter table colmeia add column substitui jsonb check (substitui is null or jsonb_typeof(substitui) = 'array');

-- O agente no Escritório. Começa como planejado e passa a "trabalhando" sozinho no primeiro turno que dá certo.
insert into agentes (id, sala, nome, apelido, funcao, onde, cadencia, modelo, estado, ordem) values
  ('conciliador', 'vendas', 'Conciliador da Colmeia', 'Salomão R.',
   'Acha os itens da Colmeia que se contradizem ou se repetem e junta numa regra só, com a condição que separa os casos.',
   'worker', 'Quando a Colmeia muda', 'claude-sonnet-5-5', 'planejado', 55)
on conflict (id) do nothing;
