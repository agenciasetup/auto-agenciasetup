-- Confiabilidade do Atendente do direct e do Comenta X (10/11/2026, depois da auditoria). Só acrescenta: uma tabela, uma
-- função nova e duas funções regravadas. Nada é apagado.
--
-- ORDEM: aplicar DEPOIS do deploy do Worker desta versão (ou junto). O Worker novo funciona sem esta migration (o eco
-- continua valendo pela hora e o ensaio filtra as contas no código). O contrário é que tem risco: com o Worker antigo,
-- um direct pego da fila e não tentado ficava em "enviando" até voltar sozinho, e aqui ele passa a ir para conferência.

-- ---------------------------------------------------------------- 1) os ids das mensagens que saem da nossa conta
-- Cada mensagem do direct que sai da conta volta no aviso da Meta como "eco", com o id dela (mid). O sistema guarda o
-- id de tudo o que ele mesmo manda (o Atendente, o envio pelo painel e o Comenta X) e anota cada eco que chega:
--   sistema = true   a mensagem foi mandada pelo sistema;
--   eco_em           quando o eco dela chegou.
-- Eco de um id que o sistema não mandou é alguém da equipe escrevendo pelo aplicativo: o Atendente fica calado nessa
-- conversa por 12 horas (worker/lib/atendente.js, conversaDeGente). Antes isso era adivinhado pela hora, e uma
-- mensagem do dono a até 10 minutos de um envio do sistema passava por envio do sistema.
create table mensagens_nossas (
  mid text primary key check (char_length(mid) between 1 and 300),
  igsid text not null check (igsid ~ '^[0-9]{5,30}$'),
  sistema boolean not null default false,
  eco_em timestamptz,
  criado_em timestamptz not null default now()
);
create index mensagens_nossas_pessoa on mensagens_nossas (igsid, criado_em desc);
create index mensagens_nossas_criado on mensagens_nossas (criado_em);
alter table mensagens_nossas enable row level security;

-- ---------------------------------------------------------------- 2) Comenta X: o registro do envio guarda o id
-- Igual à versão da migration 16, com um acréscimo no fim: se o registro traz o id da mensagem (p_extra.mid), ele entra
-- em mensagens_nossas como envio do sistema, na mesma chamada (o plano grátis da Cloudflare conta cada chamada).
create or replace function marcar_resposta(p_id bigint, p_status text, p_erro text default null, p_extra jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  r respostas_gatilho;
  v_mid text;
  v_igsid text;
begin
  select * into r from respostas_gatilho where id = p_id;
  if not found then return; end if;
  if p_status = 'pendente' and r.tentativas >= 3 then p_status := 'falhou'; end if;
  update respostas_gatilho set
    status = p_status, erro = left(p_erro, 300), pego_em = null,
    enviado_em = case when p_status in ('enviada', 'pergunta') and enviado_em is null then now() else enviado_em end,
    variante = coalesce(p_extra->>'variante', variante),
    igsid = coalesce(p_extra->>'igsid', igsid),
    link_codigo = coalesce(p_extra->>'link_codigo', link_codigo),
    nome = coalesce(p_extra->>'nome', nome),
    usuario = coalesce(p_extra->>'usuario', usuario),
    publico_ok = coalesce((p_extra->>'publico_ok')::boolean, publico_ok),
    seguia = coalesce((p_extra->>'seguia')::boolean, seguia),
    seguiu_em = case when (p_extra->>'seguiu')::boolean then now() else seguiu_em end,
    respondeu_em = case when (p_extra->>'respondeu')::boolean then now() else respondeu_em end,
    link_em = case when p_status in ('enviada', 'link') and link_em is null then now() else link_em end
  where id = p_id;
  if p_status in ('enviada', 'pergunta') and r.status not in ('enviada', 'pergunta', 'respondendo', 'link') and r.gatilho_id is not null then
    update gatilhos set enviados = enviados + 1 where id = r.gatilho_id;
  end if;
  v_mid := left(p_extra->>'mid', 300);
  v_igsid := coalesce(p_extra->>'igsid', r.igsid);
  if v_mid is not null and v_mid <> '' and v_igsid is not null and v_igsid ~ '^[0-9]{5,30}$' then
    -- Guardar o id nunca derruba o registro do envio: se der erro aqui, o envio continua marcado.
    begin
      insert into mensagens_nossas (mid, igsid, sistema) values (v_mid, v_igsid, true)
      on conflict (mid) do update set sistema = true;
    exception when others then
      null;
    end;
  end if;
end $$;
revoke all on function marcar_resposta(bigint, text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- 3) Comenta X: preso no meio do envio não sai de novo
-- Igual à versão da migration 16, com duas mudanças:
-- a) Item preso em "enviando" há mais de 15 minutos não volta mais para a fila. A execução caiu no meio do envio e não
--    dá para saber se o direct saiu; mandar de novo arriscava a pessoa receber o material duas vezes. Fica como
--    "falhou", com o aviso para conferir, e aparece na tela do Comenta X. (O Worker registra "enviada" logo depois do
--    direct e devolve na hora, para "pendente", o que pegou e não chegou a tentar.)
-- b) Limpa os ids de mensagem com mais de 3 dias (só servem nas 12 horas da conversa de gente).
create or replace function pegar_respostas(p_limite int default 10) returns setof respostas_gatilho
language plpgsql security definer set search_path = public as $$
begin
  update respostas_gatilho set status = 'falhou', pego_em = null,
    erro = 'O envio parou no meio e o direct pode ter saído. Confira no Instagram antes de mandar de novo.'
  where status = 'enviando' and pego_em < now() - interval '15 minutes';
  update respostas_gatilho set status = 'ignorada', erro = 'Passou de 7 dias: a Meta não aceita mais a resposta privada.'
  where status = 'pendente' and coalesce(comentado_em, criado_em) < now() - interval '7 days';
  update respostas_gatilho r set status = 'duplicada', erro = 'Esta pessoa já recebeu o material deste post.'
  where r.status = 'pendente' and r.origem = 'comentario' and r.pessoa_id is not null and exists (
    select 1 from respostas_gatilho o
    where o.rede = r.rede and o.pessoa_id = r.pessoa_id and coalesce(o.post_id, '') = coalesce(r.post_id, '') and o.id <> r.id
      and (o.status in ('enviando', 'enviada', 'pergunta', 'respondendo', 'link') or (o.status = 'pendente' and o.id < r.id)));
  -- A limpeza nunca derruba a fila.
  begin
    delete from mensagens_nossas where criado_em < now() - interval '3 days';
  exception when others then
    null;
  end;
  return query
  update respostas_gatilho set status = 'enviando', tentativas = tentativas + 1, pego_em = now()
  where id in (
    select id from respostas_gatilho
    where status = 'pendente'
    order by criado_em
    limit greatest(1, least(p_limite, 50))
    for update skip locked
  )
  returning *;
end $$;
revoke all on function pegar_respostas(int) from public, anon, authenticated;

-- ---------------------------------------------------------------- 4) Atendente: a fila do modo ensaio
-- No modo ensaio o Atendente só responde as contas de teste do dono (config.atendente.contas_teste). A mensagem das
-- outras pessoas continua "esperando" e é respondida quando o modo volta para automático. Como a fila devolve só as
-- conversas mais antigas, essas que não são de teste travariam as de teste: esta função é a mesma atendente_fila
-- (migration 39), só com as conversas das contas pedidas. A atendente_fila continua igual.
create or replace function atendente_fila_ensaio(p_espera int default 20, p_limite int default 2, p_usuarios text[] default '{}') returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
    select a.followup_id, min(a.criado_em) as desde, max(a.criado_em) as ate, count(*)::int as n
    from atendimentos a
    join followups f on f.id = a.followup_id
    where a.classe = 'esperando' and a.criado_em >= now() - interval '6 hours' and f.usuario = any(p_usuarios)
    group by a.followup_id
    having max(a.criado_em) <= now() - make_interval(secs => greatest(5, p_espera))
    order by min(a.criado_em)
    limit greatest(1, least(10, p_limite))
  ) x
$$;
revoke all on function atendente_fila_ensaio(int, int, text[]) from public, anon, authenticated;
