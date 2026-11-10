-- Escritório de IA, parte 2 (10/11/2026; plano em docs/escritorio.md).
--
-- 1) escritorio_atividade(): o trabalho de hoje dos agentes que rodam no Worker, tirado das tabelas que eles já
--    escrevem. Assim ninguém grava um turno a cada minuto (encheria o banco e gastaria as chamadas do plano grátis).
--    "Hoje" é o dia de Brasília.
create or replace function escritorio_atividade() returns jsonb
language sql stable security definer set search_path = public as $$
  with hoje as (select (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as i)
  select jsonb_build_object(
    'entregador', (select jsonb_build_object('hoje', count(*) filter (where enviado_em >= (select i from hoje)), 'ultimo', max(enviado_em))
                   from respostas_gatilho where status = 'enviada' and enviado_em >= now() - interval '14 days'),
    'publicador', (select jsonb_build_object('hoje', count(*) filter (where publicado_em >= (select i from hoje)), 'ultimo', max(publicado_em))
                   from pecas where status = 'publicado' and publicado_em >= now() - interval '30 days'),
    'pesquisador', (select jsonb_build_object('hoje', count(*) filter (where criado_em >= (select i from hoje)), 'ultimo', max(criado_em))
                    from pautas where criado_em >= now() - interval '14 days'),
    'analista', (select jsonb_build_object('hoje', count(*) filter (where metricas_em >= (select i from hoje)), 'ultimo', max(metricas_em))
                 from posts_redes where metricas_em >= now() - interval '14 days'),
    'recuperador', (select jsonb_build_object('hoje', count(*) filter (where lembrete_em >= (select i from hoje)), 'ultimo', max(lembrete_em))
                    from recuperacoes where lembrete_em >= now() - interval '30 days'),
    'editor-chefe', (select jsonb_build_object('ultimo', valor->>'criado_em', 'custo_usd', valor->>'custo_usd', 'modelo', valor->>'modelo')
                     from config where chave = 'plano_ia')
  )
$$;
revoke all on function escritorio_atividade() from public, anon, authenticated;

-- 2) Teste de vendedor no follow-up do direct. Cada pessoa fica com um vendedor (um roteiro de conversa) desde a
--    primeira mensagem nossa. tocado_em: quando essa primeira mensagem saiu. respondeu_em: a primeira resposta da pessoa
--    depois dela. O placar compara os vendedores por resposta, por compra e por receita.
alter table followups
  add column vendedor text check (vendedor is null or vendedor ~ '^[a-z0-9-]{2,40}$'),
  add column tocado_em timestamptz,
  add column respondeu_em timestamptz;
create index followups_vendedor on followups (perfil, vendedor) where vendedor is not null;

-- Quem já recebeu mensagem nossa antes desta migration foi atendido pelo jeito atual: o vendedor "calango".
-- A hora do primeiro toque e da primeira resposta sai do histórico.
update followups f set
  vendedor = 'calango',
  tocado_em = coalesce((select min((h->>'em')::timestamptz) from jsonb_array_elements(f.historico) h where h->>'tipo' = 'nos'), f.nosso_em, f.atualizado_em)
where f.toques > 0 and f.vendedor is null;
update followups f set
  respondeu_em = (select min((h->>'em')::timestamptz) from jsonb_array_elements(f.historico) h where h->>'tipo' = 'pessoa' and (h->>'em')::timestamptz > f.tocado_em)
where f.tocado_em is not null and f.respondeu_em is null;

create or replace function followup_placar(p_perfil text default 'br') returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by t.pessoas desc), '[]'::jsonb) from (
    select f.vendedor,
      count(*) as pessoas,
      count(*) filter (where f.respondeu_em is not null) as responderam,
      count(*) filter (where f.comprou_em is not null and f.comprou_em >= f.tocado_em) as compraram,
      coalesce(sum(p.total_centavos) filter (where f.comprou_em is not null and f.comprou_em >= f.tocado_em), 0) as receita_centavos,
      min(f.tocado_em) as desde
    from followups f left join pedidos p on p.id = f.pedido_id
    where f.perfil = p_perfil and f.vendedor is not null and f.tocado_em is not null
    group by f.vendedor
  ) t
$$;
revoke all on function followup_placar(text) from public, anon, authenticated;

-- O segundo vendedor entra no escritório, ao lado do Calango.
update agentes set funcao = 'O jeito atual do direct: amigo, link e uma frase curta. Lê o direct, anota cada pessoa e manda os toques dentro dos tetos.' where id = 'vendedor-calango';
insert into agentes (id, sala, nome, funcao, onde, cadencia, modelo, estado, ordem) values
  ('vendedor-pergunta', 'vendas', 'Vendedor Pergunta', 'Abre com uma pergunta e só oferta depois da resposta. Disputa com o Calango no placar das vendas.', 'computador', '9h, 10h, 12h, 16h e de 18h a 22h', null, 'ativo', 15)
on conflict (id) do nothing;
