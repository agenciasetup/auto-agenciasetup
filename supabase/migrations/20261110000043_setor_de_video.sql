-- O setor de vídeo (10/11/2026, pedido do dono: "crie agora o setor de vídeo... um time que saiba viralizar... mas que
-- tenham sentido e VENDAM"). Três partes:
-- 1. agentes.maquina: o agente que só roda numa máquina (a voz clonada e o render são do Windows). Sem sinal de vida
--    dessa máquina, ele aparece offline, mesmo com a outra ligada.
-- 2. videos_virais: os Shorts que saíram da curva do próprio canal, achados pelo Caçador de virais (de graça, pelo RSS).
-- 3. O time: Caçador de virais e Roteirista (Worker), Olheiro de animação (Worker), Locutor, Animador e Revisor de vídeo
--    (Windows). Os novos nascem como planejados; quem liga é o dono ou a construção de cada um.

alter table agentes add column if not exists maquina text check (maquina is null or maquina in ('windows', 'mac'));

create table if not exists videos_virais (
  video_id text primary key check (video_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  rede text not null default 'youtube',
  canal_id text not null,
  canal text,
  idioma text not null default 'pt' check (idioma in ('pt', 'en')),
  tema text,
  titulo text not null,
  publicado_em timestamptz not null,
  views bigint not null default 0,
  curtidas bigint,
  base bigint,                       -- a mediana de visualizações do canal na última leitura
  vezes numeric(8,1),                -- views dividido pela base: quantas vezes o normal do canal
  por_dia bigint,                    -- visualizações por dia desde que saiu
  views_achado bigint,               -- as visualizações no dia em que entrou aqui
  achado_em timestamptz not null default now(),
  visto_em timestamptz not null default now(),
  status text not null default 'novo' check (status in ('novo', 'roteiro', 'usado', 'descartado')),
  leitura jsonb                      -- o que o Roteirista leu: formato, gancho, por que serve para vender
);
alter table videos_virais enable row level security;
create index if not exists videos_virais_fila on videos_virais (status, vezes desc);
create index if not exists videos_virais_vistos on videos_virais (visto_em desc);

-- Guarda os achados de uma rodada. Vídeo novo entra; vídeo já visto só atualiza os números. Devolve quantos são novos.
create or replace function videos_virais_guardar(p_videos jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with dados as (
    select * from jsonb_to_recordset(coalesce(p_videos, '[]'::jsonb)) as v(
      video_id text, canal_id text, canal text, idioma text, tema text, titulo text, publicado_em timestamptz,
      views bigint, curtidas bigint, base bigint, vezes numeric, por_dia bigint)
    where v.video_id ~ '^[A-Za-z0-9_-]{6,20}$' and v.titulo is not null and v.publicado_em is not null
  ), gravados as (
    insert into videos_virais (video_id, canal_id, canal, idioma, tema, titulo, publicado_em, views, curtidas, base, vezes, por_dia, views_achado)
    select video_id, canal_id, left(canal, 80), case when idioma = 'en' then 'en' else 'pt' end, left(tema, 30), left(titulo, 200), publicado_em,
      coalesce(views, 0), curtidas, base, vezes, por_dia, coalesce(views, 0)
    from dados
    on conflict (video_id) do update set
      views = excluded.views, curtidas = excluded.curtidas, base = excluded.base, vezes = excluded.vezes, por_dia = excluded.por_dia,
      titulo = excluded.titulo, visto_em = now()
    returning (xmax = 0) as novo
  )
  select count(*) filter (where novo) into n from gravados;
  return coalesce(n, 0);
end $$;
revoke all on function videos_virais_guardar(jsonb) from public, anon, authenticated;

-- O time. Os dois que já existiam ganham a função de verdade; o estado deles muda pela ação do escritório (com carreira).
update agentes set nome = 'Caçador de virais', onde = 'worker', modelo = null, cadencia = 'De hora em hora, em rodízio',
  funcao = 'Segue os canais do nicho e marca o Short que saiu da curva do próprio canal (visualizações divididas pela média dele). De graça, sem IA.'
where id = 'cacador-de-ganchos';
update agentes set onde = 'worker', modelo = 'claude-sonnet-5-5', cadencia = 'Segunda e quinta, às 9h',
  funcao = 'Lê os virais da semana e o que já vendeu aqui e escreve até 3 roteiros, cada um num formato diferente, sempre terminando na venda com "Comenta PALAVRA". Vão para a mesa.'
where id = 'roteirista';

insert into agentes (id, sala, nome, apelido, funcao, onde, maquina, cadencia, modelo, estado, ordem)
select v.id, 'video', v.nome, v.apelido, v.funcao, v.onde, v.maquina, v.cadencia, v.modelo, 'planejado',
  coalesce((select max(ordem) from agentes where sala = 'video'), 0) + v.n
from (values
  ('olheiro-de-animacao', 'Olheiro de animação', 'Josué B.', 'Procura repositórios, modelos, efeitos, músicas livres e técnicas que deixariam os nossos vídeos melhores. No máximo 2 cartões por semana, com a prova.', 'worker', null, 'Toda semana', 'claude-sonnet-5-5', 1),
  ('locutor', 'Locutor', 'Arão S.', 'Narra o roteiro aprovado com a voz clonada do Filipe e regrava até o texto sair certo. Entrega o áudio e o tempo de cada palavra.', 'computador', 'windows', 'A cada roteiro aprovado', null, 2),
  ('animador', 'Animador', 'Noemi T.', 'Monta as cenas do roteiro no motor de vídeo, com música e legenda palavra por palavra, e renderiza na placa de vídeo. Entrega o vídeo como rascunho na fila.', 'computador', 'windows', 'A cada roteiro aprovado', null, 3),
  ('revisor-de-video', 'Revisor de vídeo', 'Gideão F.', 'Assiste ao vídeo pronto com olhar de quem nunca viu: gancho no primeiro segundo, texto que vaza, som, venda no fim e se ficou igual ao anterior.', 'computador', 'windows', 'A cada vídeo novo', null, 4)
) as v(id, nome, apelido, funcao, onde, maquina, cadencia, modelo, n)
on conflict (id) do nothing;
