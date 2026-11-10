-- A pessoa no link (10/11/2026). Cada link do curso que sai no direct (botões do Comenta X, Atendente e vendedores do
-- follow-up) leva um código curto de quem recebeu. A visita guarda o código, o pedido leva as visitas, e a compra passa
-- a ser ligada à pessoa do follow-up pelo link, e não só por nome e e-mail (que quase nunca casavam: 2 de 551).
-- Com isso o placar dos vendedores enxerga quem vendeu e o follow-up para de oferecer a quem já comprou.
-- Aplicar ANTES do deploy: o Worker novo grava a coluna "pessoa" em cada visita.

alter table toques add column if not exists pessoa text;

-- O código da pessoa: 10 letras do SHA-256 de "perfil:usuario". Tem de dar o mesmo que codigoDaPessoa (worker/lib/pessoa.js).
create or replace function followup_codigo(p_perfil text, p_usuario text) returns text
language sql immutable set search_path = public as $$
  select left(encode(sha256(convert_to(lower(coalesce(p_perfil, 'br')) || ':' || lower(p_usuario), 'UTF8')), 'hex'), 10)
$$;
revoke all on function followup_codigo(text, text) from public, anon, authenticated;

alter table followups drop constraint if exists followups_compra_por_check;
alter table followups add constraint followups_compra_por_check check (compra_por is null or compra_por in ('email','nome','manual','link'));

-- Quem pagou: primeiro pelo link (certo), depois pelo e-mail, por último pelo nome (com o aviso para conferir).
create or replace function followup_compras() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with pagos as (
    select p.id as pedido_id, p.pago_em, coalesce(o.nome, 'Compra') as produto, lower(a.email) as email, followup_nome(a.nome) as nome,
      (select array_agg(distinct t->>'pessoa')
         from jsonb_array_elements(case when jsonb_typeof(p.toques) = 'array' then p.toques else '[]'::jsonb end) t
        where t->>'pessoa' is not null) as pessoas
    from pedidos p
    join alunos a on a.id = p.aluno_id
    left join ofertas o on o.id = p.oferta_id
    where p.status = 'pago' and not p.teste and p.pago_em is not null
  ), gente as (
    select f.id, f.email, f.nome, f.pedido_id, f.comprou_em, f.primeiro_em, followup_codigo(f.perfil, f.usuario) as codigo
    from followups f
  ), achados as (
    select distinct on (f.id) f.id, pg.pedido_id, pg.pago_em, pg.produto,
      case when f.codigo = any(pg.pessoas) then 'link'
           when f.email is not null and lower(f.email) = pg.email then 'email' else 'nome' end as por,
      pg.pago_em >= f.primeiro_em - interval '1 day' as depois
    from gente f
    join pagos pg on (
      f.codigo = any(pg.pessoas)
      or (f.email is not null and lower(f.email) = pg.email)
      or (followup_nome(f.nome) like '% %' and pg.nome like '% %' and (
        followup_nome(f.nome) = pg.nome
        or (split_part(followup_nome(f.nome), ' ', 1) = split_part(pg.nome, ' ', 1)
            and regexp_replace(followup_nome(f.nome), '^.* ', '') = regexp_replace(pg.nome, '^.* ', ''))))
    )
    where f.pedido_id is distinct from pg.pedido_id and (f.pedido_id is null or pg.pago_em > f.comprou_em)
    order by f.id, coalesce(f.codigo = any(pg.pessoas), false) desc, (f.email is not null and lower(f.email) = pg.email) desc, pg.pago_em desc
  )
  update followups f set
    pedido_id = a.pedido_id, produto = a.produto, comprou_em = a.pago_em,
    compra_por = case when f.compra_por = 'manual' and f.fase = 'comprou' then 'manual' else a.por end,
    fase = case when a.depois or f.fase = 'comprou' then 'comprou' else f.fase end,
    historico = f.historico || jsonb_build_array(jsonb_build_object('em', a.pago_em, 'tipo', 'comprou',
      'texto', 'Comprou ' || a.produto || case
        when a.por = 'link' then ' (pelo link que mandamos)'
        when a.por = 'nome' and f.compra_por is distinct from 'manual' then ' (achado pelo nome, confira)'
        else '' end))
  from achados a where f.id = a.id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function followup_compras() from public, anon, authenticated;
