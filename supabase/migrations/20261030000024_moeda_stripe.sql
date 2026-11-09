-- Venda em dólar (pedido do dono em 29/10/2026): o curso em inglês sai pelo Stripe, em US$.
-- A moeda mora na oferta e no pedido (padrão 'brl': tudo o que existia continua em real). O Stripe entra como provedor.
-- Os números do painel não misturam moedas: faturamento, ticket e desconto contam só real; o dólar vem à parte
-- (faturamento_usd_centavos, pagos_usd). As funções abaixo são as de 20261024000006 e 20261025000013 com só essa troca.

alter table ofertas add column if not exists moeda text not null default 'brl' check (moeda in ('brl', 'usd'));
alter table pedidos add column if not exists moeda text not null default 'brl' check (moeda in ('brl', 'usd'));

alter table pedidos drop constraint if exists pedidos_provedor_check;
alter table pedidos add constraint pedidos_provedor_check check (provedor in ('asaas', 'simulado', 'stripe'));

CREATE OR REPLACE FUNCTION public.numeros_area(p_dias integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
with periodo as (select now() - make_interval(days => greatest(1, least(p_dias, 3650))) as desde),
ped as (select p.* from pedidos p, periodo where not p.teste and p.criado_em > periodo.desde),
pagos as (select * from ped where status = 'pago'),
mat as (select m.* from matriculas m where m.status = 'ativa' and m.origem <> 'teste')
select jsonb_build_object(
  'dias', p_dias,
  'vendas', (select jsonb_build_object(
    'pedidos', count(*),
    'pagos', count(*) filter (where status = 'pago'),
    'faturamento_centavos', coalesce(sum(total_centavos) filter (where status = 'pago' and moeda = 'brl'), 0),
    'faturamento_usd_centavos', coalesce(sum(total_centavos) filter (where status = 'pago' and moeda = 'usd'), 0),
    'pagos_usd', count(*) filter (where status = 'pago' and moeda = 'usd'),
    'ticket_centavos', coalesce(round(avg(total_centavos) filter (where status = 'pago' and moeda = 'brl')), 0),
    'desconto_centavos', coalesce(sum(desconto_centavos) filter (where status = 'pago' and moeda = 'brl'), 0),
    'reembolsados', count(*) filter (where status in ('reembolsado', 'contestado')),
    'pix', count(*) filter (where status = 'pago' and metodo = 'pix'),
    'cartao', count(*) filter (where status = 'pago' and metodo = 'cartao'),
    'com_cupom', count(*) filter (where status = 'pago' and cupom is not null)
  ) from ped),
  'por_dia', (select coalesce(jsonb_agg(jsonb_build_object('dia', d, 'pagos', n, 'centavos', c) order by d), '[]'::jsonb) from (
    select (pago_em at time zone 'America/Sao_Paulo')::date as d, count(*) as n, coalesce(sum(total_centavos) filter (where moeda = 'brl'), 0) as c from pagos where pago_em is not null group by 1
  ) x),
  'origens', (select coalesce(jsonb_agg(jsonb_build_object('origem', o, 'vendas', n, 'centavos', c) order by c desc), '[]'::jsonb) from (
    select coalesce(nullif(ultimo_toque->>'origem', ''), 'direto') || coalesce(' · ' || nullif(ultimo_toque->>'meio', ''), '') as o, count(*) as n, coalesce(sum(total_centavos) filter (where moeda = 'brl'), 0) as c
    from pagos group by 1 order by 3 desc limit 12
  ) x),
  'funil', jsonb_build_object(
    'visitantes', (select count(distinct visitante) from toques, periodo where quando > periodo.desde),
    'pedidos', (select count(*) from ped),
    'pagos', (select count(*) from pagos),
    'comecaram', (select count(distinct pr.aluno_id) from progresso pr where pr.aluno_id in (select aluno_id from pagos)),
    'certificado', (select count(distinct ce.aluno_id) from certificados ce where ce.aluno_id in (select aluno_id from pagos))
  ),
  'alunos', jsonb_build_object(
    'total', (select count(*) from alunos),
    'novos', (select count(*) from alunos, periodo where alunos.criado_em > periodo.desde),
    'com_curso', (select count(distinct aluno_id) from mat),
    'ativos_7d', (select count(distinct aluno_id) from progresso where atualizado_em > now() - interval '7 days'),
    'ativos_30d', (select count(distinct aluno_id) from progresso where atualizado_em > now() - interval '30 days')
  ),
  'cursos', (select coalesce(jsonb_agg(x order by x.ordem), '[]'::jsonb) from (
    select c.id, c.titulo, c.ordem,
      (select count(*) from mat where mat.curso_id = c.id) as matriculados,
      (select count(*) from certificados ce where ce.curso_id = c.id) as certificados,
      (select round(avg(v.nota)::numeric, 1) from avaliacoes_curso v where v.curso_id = c.id) as nota,
      (select count(*) from avaliacoes_curso v where v.curso_id = c.id) as avaliacoes,
      (select round(100.0 * (count(*) filter (where v.nota >= 9) - count(*) filter (where v.nota <= 6)) / nullif(count(*), 0)) from avaliacoes_curso v where v.curso_id = c.id) as nps
    from cursos c where c.status = 'publicado'
  ) x),
  -- Desde o começo (não só no período): quanto cada aula segura, ajuda e gera de dúvida.
  'aulas', (select coalesce(jsonb_agg(x order by x.curso_ordem, x.ordem), '[]'::jsonb) from (
    select a.id, a.codigo, a.titulo, a.ordem, c.ordem as curso_ordem, c.titulo as curso,
      (select count(*) from mat where mat.curso_id = a.curso_id) as matriculados,
      (select count(*) from progresso pr where pr.aula_id = a.id) as comecaram,
      (select count(*) from progresso pr where pr.aula_id = a.id and pr.concluida_em is not null) as concluiram,
      (select count(*) from avaliacoes_aula v where v.aula_id = a.id and v.util) as uteis,
      (select count(*) from avaliacoes_aula v where v.aula_id = a.id and not v.util) as nao_uteis,
      (select count(*) from tutor_conversas t where t.aula_id = a.id) as duvidas,
      (select count(*) from comentarios k where k.aula_id = a.id and k.aluno_id is not null and k.pai_id is null) as comentarios
    from aulas a join cursos c on c.id = a.curso_id where a.status = 'publicado'
  ) x),
  -- Turmas: quem entrou em cada mês e até onde foi.
  'turmas', (select coalesce(jsonb_agg(x order by x.mes desc), '[]'::jsonb) from (
    select to_char(date_trunc('month', m.inicio at time zone 'America/Sao_Paulo'), 'YYYY-MM') as mes,
      count(*) as matriculas,
      count(*) filter (where exists (select 1 from progresso pr join aulas a on a.id = pr.aula_id where pr.aluno_id = m.aluno_id and a.curso_id = m.curso_id)) as comecaram,
      count(*) filter (where (select count(*) from progresso pr join aulas a on a.id = pr.aula_id where pr.aluno_id = m.aluno_id and a.curso_id = m.curso_id and pr.concluida_em is not null and a.status = 'publicado') * 2
        >= greatest(1, (select count(*) from aulas a where a.curso_id = m.curso_id and a.status = 'publicado'))) as metade,
      count(*) filter (where exists (select 1 from certificados ce where ce.aluno_id = m.aluno_id and ce.curso_id = m.curso_id)) as certificado,
      count(*) filter (where exists (select 1 from progresso pr join aulas a on a.id = pr.aula_id where pr.aluno_id = m.aluno_id and a.curso_id = m.curso_id and pr.atualizado_em > now() - interval '7 days')) as ativos_7d
    from mat m where m.inicio > now() - interval '6 months' group by 1
  ) x),
  'tutor', (select jsonb_build_object(
    'perguntas', count(*) filter (where papel = 'aluno'),
    'respostas_ia', count(*) filter (where papel = 'tutor'),
    'respostas_equipe', count(*) filter (where papel = 'equipe'),
    'uteis', count(*) filter (where util),
    'nao_uteis', count(*) filter (where util = false),
    'custo_usd', coalesce(sum(custo_usd), 0)
  ) from tutor_mensagens, periodo where tutor_mensagens.criado_em > periodo.desde)
);
$function$;

CREATE OR REPLACE FUNCTION public.numeros_vendas(p_dias integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select jsonb_build_object(
    'pagos', count(*) filter (where status = 'pago'),
    'faturamento_centavos', coalesce(sum(total_centavos) filter (where status = 'pago' and moeda = 'brl'), 0),
    'faturamento_usd_centavos', coalesce(sum(total_centavos) filter (where status = 'pago' and moeda = 'usd'), 0),
    'pagos_usd', count(*) filter (where status = 'pago' and moeda = 'usd'),
    'aguardando', count(*) filter (where status = 'aguardando'),
    'reembolsados', count(*) filter (where status = 'reembolsado'),
    'contestados', count(*) filter (where status = 'contestado'),
    'pix', count(*) filter (where status = 'pago' and metodo = 'pix'),
    'cartao', count(*) filter (where status = 'pago' and metodo = 'cartao'),
    'alunos', (select count(*) from alunos)
  )
  from pedidos where not teste and criado_em > now() - make_interval(days => p_dias);
$function$;

revoke all on function numeros_area(int) from public, anon, authenticated;
revoke all on function numeros_vendas(int) from public, anon, authenticated;
