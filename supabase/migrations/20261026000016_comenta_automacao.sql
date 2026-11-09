-- "Comenta X" no estilo do ManyChat (pedido do dono em 24/10/2026: "quero todo aquele esquema de automação" do Olhar de
-- Fé). Cada palavra ganha versões da mensagem (o Claude escreve ao criar o post) e o sistema manda mais a que traz mais
-- cliques e seguidores; o link vai num botão, com link curto e UTM por versão; três modos (link direto, "segue e toca no
-- botão" e pergunta); e um direct por pessoa em cada post. Só acrescenta colunas e funções: nada é apagado.

-- ---------------------------------------------------------------- a automação (a palavra)
-- variantes: [{id, nome, dm, pergunta, depois, lembrete, botao, publico: [..], ativa, origem}]
--   direto: o primeiro direct já leva o link (dm com {link}, que vira botão);
--   seguir: o primeiro direct pede para seguir, com o botão "Já segui"; o link (depois) só vai para quem segue;
--   pergunta: o primeiro direct pergunta, com o botão "Quero o link"; o link (depois) vai quando a pessoa responde.
-- {usuario} vira o primeiro nome (a Meta só mostra o perfil depois que a pessoa toca num botão ou escreve no direct).
alter table gatilhos
  add column if not exists nome text,
  add column if not exists modo text not null default 'direto',
  add column if not exists estrategia text not null default 'melhor',
  add column if not exists variantes jsonb not null default '[]'::jsonb,
  add column if not exists responder_publico boolean not null default true,
  add column if not exists resposta_ia boolean not null default true,
  add column if not exists nota text;
alter table gatilhos add constraint gatilhos_modo check (modo in ('direto', 'seguir', 'pergunta'));
alter table gatilhos add constraint gatilhos_estrategia check (estrategia in ('melhor', 'igual'));
alter table gatilhos add constraint gatilhos_variantes check (jsonb_typeof(variantes) = 'array');

-- A palavra que já existia vira a versão "a" (mesma mensagem e mesmas respostas).
update gatilhos set variantes = jsonb_build_array(jsonb_build_object(
  'id', 'a', 'nome', 'Mensagem original', 'dm', coalesce(mensagem, ''), 'pergunta', '', 'depois', '', 'lembrete', '', 'botao', '',
  'publico', to_jsonb(respostas), 'ativa', true, 'origem', 'painel'))
where variantes = '[]'::jsonb;

-- ---------------------------------------------------------------- cada comentário (ou direct) que pediu a palavra
-- pessoa_id: quem comentou (id na rede); igsid: o id do direct, que volta no envio e nos toques do botão.
alter table respostas_gatilho
  add column if not exists origem text not null default 'comentario',
  add column if not exists pessoa_id text,
  add column if not exists igsid text,
  add column if not exists variante text,
  add column if not exists nome text,
  add column if not exists link_codigo text,
  add column if not exists publico_ok boolean,
  add column if not exists seguia boolean,
  add column if not exists seguiu_em timestamptz,
  add column if not exists respondeu_em timestamptz,
  add column if not exists link_em timestamptz;
alter table respostas_gatilho add constraint respostas_origem check (origem in ('comentario', 'direct'));
-- pergunta: o primeiro direct saiu e espera o toque; respondendo: o toque chegou e o link está saindo;
-- link: o link saiu depois do toque; duplicada: a pessoa já recebeu o material deste post.
alter table respostas_gatilho drop constraint if exists respostas_gatilho_status_check;
alter table respostas_gatilho add constraint respostas_gatilho_status_check
  check (status in ('pendente', 'enviando', 'enviada', 'pergunta', 'respondendo', 'link', 'falhou', 'ignorada', 'duplicada'));
create index if not exists respostas_igsid on respostas_gatilho (igsid, criado_em desc) where igsid is not null;
create index if not exists respostas_pessoa on respostas_gatilho (rede, pessoa_id, post_id) where pessoa_id is not null;
-- Um direct por pessoa e post, garantido pelo banco (dois avisos ao mesmo tempo não mandam dois).
create unique index if not exists respostas_um_por_post on respostas_gatilho (rede, pessoa_id, coalesce(post_id, ''))
  where origem = 'comentario' and pessoa_id is not null and status in ('enviando', 'enviada', 'pergunta', 'respondendo', 'link');

-- O link curto de cada versão (agenciasetup.com.br/l/<codigo>, com as UTM), para somar os cliques de cada mensagem.
alter table links add column if not exists variante text;
create index if not exists links_gatilho on links (gatilho_id, variante) where gatilho_id is not null;

-- ---------------------------------------------------------------- fila
-- Antes de pegar: quem já recebeu o material do mesmo post (ou tem um pedido mais antigo na fila) vira "duplicada".
create or replace function pegar_respostas(p_limite int default 10) returns setof respostas_gatilho
language plpgsql security definer set search_path = public as $$
begin
  update respostas_gatilho set status = 'pendente', pego_em = null
  where status = 'enviando' and pego_em < now() - interval '15 minutes';
  update respostas_gatilho set status = 'ignorada', erro = 'Passou de 7 dias: a Meta não aceita mais a resposta privada.'
  where status = 'pendente' and coalesce(comentado_em, criado_em) < now() - interval '7 days';
  update respostas_gatilho r set status = 'duplicada', erro = 'Esta pessoa já recebeu o material deste post.'
  where r.status = 'pendente' and r.origem = 'comentario' and r.pessoa_id is not null and exists (
    select 1 from respostas_gatilho o
    where o.rede = r.rede and o.pessoa_id = r.pessoa_id and coalesce(o.post_id, '') = coalesce(r.post_id, '') and o.id <> r.id
      and (o.status in ('enviando', 'enviada', 'pergunta', 'respondendo', 'link') or (o.status = 'pendente' and o.id < r.id)));
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

-- Fecha um envio numa chamada só (o plano grátis da Cloudflare conta cada chamada): o estado e o que veio junto
-- (versão, igsid, link, nome, se seguia). "enviada" e "pergunta" contam no total da palavra.
drop function if exists marcar_resposta(bigint, text, text);
create or replace function marcar_resposta(p_id bigint, p_status text, p_erro text default null, p_extra jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare r respostas_gatilho;
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
end $$;
revoke all on function marcar_resposta(bigint, text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- números por versão
-- Por palavra e versão: comentários, directs, links entregues, seguidores novos, quem já seguia, erros e cliques
-- (somados dos links curtos da versão). O sistema usa para escolher a versão; o painel mostra.
create or replace function numeros_variantes(p_gatilho uuid default null) returns jsonb
language sql stable security definer set search_path = public as $$
  with e as (
    select gatilho_id, coalesce(variante, '?') as variante,
      count(*) filter (where status not in ('duplicada', 'ignorada')) as comentarios,
      count(*) filter (where status in ('enviando', 'enviada', 'pergunta', 'respondendo', 'link')) as enviados,
      count(*) filter (where status in ('enviada', 'link')) as links,
      count(*) filter (where status in ('respondendo', 'link') or respondeu_em is not null) as respostas,
      count(*) filter (where seguiu_em is not null) as seguidores,
      count(*) filter (where seguia is true and seguiu_em is null) as ja_seguiam,
      count(*) filter (where status = 'falhou') as erros
    from respostas_gatilho
    where gatilho_id is not null and (p_gatilho is null or gatilho_id = p_gatilho)
    group by 1, 2
  ),
  c as (
    select gatilho_id, coalesce(variante, '?') as variante, sum(cliques) as cliques
    from links where gatilho_id is not null and (p_gatilho is null or gatilho_id = p_gatilho)
    group by 1, 2
  ),
  j as (
    select coalesce(e.gatilho_id, c.gatilho_id) as gatilho_id, coalesce(e.variante, c.variante) as variante,
      jsonb_build_object('comentarios', coalesce(e.comentarios, 0), 'enviados', coalesce(e.enviados, 0), 'links', coalesce(e.links, 0),
        'respostas', coalesce(e.respostas, 0), 'seguidores', coalesce(e.seguidores, 0), 'ja_seguiam', coalesce(e.ja_seguiam, 0),
        'erros', coalesce(e.erros, 0), 'cliques', coalesce(c.cliques, 0)) as n
    from e full join c on c.gatilho_id = e.gatilho_id and c.variante = e.variante
  )
  select coalesce(jsonb_object_agg(g.gatilho_id, g.v), '{}'::jsonb)
  from (select gatilho_id, jsonb_object_agg(variante, n) as v from j group by gatilho_id) g;
$$;
revoke all on function numeros_variantes(uuid) from public, anon, authenticated;
