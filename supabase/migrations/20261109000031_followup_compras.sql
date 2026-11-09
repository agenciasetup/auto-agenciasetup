-- Follow-up do direct: quem foi marcado "comprou" à mão (sem pedido) também ganha o pedido, o produto e a data da compra
-- quando a venda aparece (antes só entrava compra mais nova que a marca, e a marca à mão tem a data de quando foi feita).
create or replace function followup_compras() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with pagos as (
    select p.id as pedido_id, p.pago_em, coalesce(o.nome, 'Compra') as produto, lower(a.email) as email, followup_nome(a.nome) as nome
    from pedidos p
    join alunos a on a.id = p.aluno_id
    left join ofertas o on o.id = p.oferta_id
    where p.status = 'pago' and not p.teste and p.pago_em is not null
  ), achados as (
    select distinct on (f.id) f.id, pg.pedido_id, pg.pago_em, pg.produto,
      case when f.email is not null and lower(f.email) = pg.email then 'email' else 'nome' end as por,
      pg.pago_em >= f.primeiro_em - interval '1 day' as depois
    from followups f
    join pagos pg on (
      (f.email is not null and lower(f.email) = pg.email)
      or (followup_nome(f.nome) like '% %' and pg.nome like '% %' and (
        followup_nome(f.nome) = pg.nome
        or (split_part(followup_nome(f.nome), ' ', 1) = split_part(pg.nome, ' ', 1)
            and regexp_replace(followup_nome(f.nome), '^.* ', '') = regexp_replace(pg.nome, '^.* ', ''))))
    )
    where f.pedido_id is distinct from pg.pedido_id and (f.pedido_id is null or pg.pago_em > f.comprou_em)
    order by f.id, (f.email is not null and lower(f.email) = pg.email) desc, pg.pago_em desc
  )
  update followups f set
    pedido_id = a.pedido_id, produto = a.produto, comprou_em = a.pago_em,
    compra_por = case when f.compra_por = 'manual' and f.fase = 'comprou' then 'manual' else a.por end,
    fase = case when a.depois or f.fase = 'comprou' then 'comprou' else f.fase end,
    historico = f.historico || jsonb_build_array(jsonb_build_object('em', a.pago_em, 'tipo', 'comprou',
      'texto', 'Comprou ' || a.produto || case when a.por = 'nome' and f.compra_por is distinct from 'manual' then ' (achado pelo nome, confira)' else '' end))
  from achados a where f.id = a.id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function followup_compras() from public, anon, authenticated;
