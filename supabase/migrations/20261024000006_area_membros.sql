-- Área de membros, checkout próprio e origem das vendas (Fase B de docs/area-de-membros.md).
-- Mesma regra do resto do banco: RLS ligado e nenhuma política. Só o Worker (chave secreta) lê e escreve.

-- ============================================================ conteúdo
-- Curso -> seções -> módulos -> aulas -> arquivos.
create table cursos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null,
  subtitulo text,
  descricao text,
  capa_url text,
  trailer_url text,
  cor text not null default '#ff7a00',
  certificado_pct int not null default 70 check (certificado_pct between 1 and 100),
  tags text[] not null default '{}',
  ordem int not null default 0,
  status text not null default 'rascunho' check (status in ('rascunho','publicado','arquivado')),
  publicado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger cursos_tocar before update on cursos for each row execute function tocar_atualizado();

create table secoes (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  titulo text not null,
  ordem int not null default 0
);
create index secoes_curso on secoes (curso_id, ordem);

create table modulos (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  secao_id uuid references secoes(id) on delete set null,
  numero int not null,
  titulo text not null,
  descricao text,
  ordem int not null default 0,
  -- Liberação programada: na hora, X dias depois da compra ou numa data.
  liberacao text not null default 'imediata' check (liberacao in ('imediata','dias','data')),
  liberar_dias int,
  liberar_em timestamptz
);
create index modulos_curso on modulos (curso_id, ordem);

create table aulas (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  modulo_id uuid not null references modulos(id) on delete cascade,
  codigo text not null,
  titulo text not null,
  descricao text,
  ordem int not null default 0,
  -- Vídeo: id externo do Panda; sem ele, o app mostra a capa e avisa que o vídeo ainda não subiu.
  video_panda text,
  duracao_s int,
  capa_url text,
  gratis boolean not null default false,
  abertura_fim_s int,
  final_inicio_s int,
  marcadores jsonb not null default '[]',   -- [{ s, titulo, tipo? }]
  falas jsonb not null default '[]',        -- [{ s, f, texto }]: a transcrição com os tempos (busca, tutor, legenda)
  resumo text,
  faca_agora jsonb not null default '[]',   -- [{ titulo, texto, prompt?, acoes? }]
  tags text[] not null default '{}',
  status text not null default 'publicado' check (status in ('rascunho','publicado','arquivado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (curso_id, codigo)
);
create index aulas_modulo on aulas (modulo_id, ordem);
create trigger aulas_tocar before update on aulas for each row execute function tocar_atualizado();

-- A ficha do arquivo: o que é, quando usar, como usar, tempo, prévia e versão.
create table arquivos (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  aula_id uuid references aulas(id) on delete set null,
  nome text not null,
  tipo text not null default 'guia' check (tipo in ('receita','guia','skill','modelo','ferramenta','pacote','pdf','link')),
  o_que text,
  quando text,
  como jsonb not null default '[]',
  tempo text,
  previa text,
  origem text not null default 'storage' check (origem in ('storage','link','drive')),
  caminho text,           -- no bucket privado "curso"
  link text,
  bytes bigint,
  versao text,
  ordem int not null default 0,
  downloads int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index arquivos_curso on arquivos (curso_id, ordem);
create index arquivos_aula on arquivos (aula_id);
create trigger arquivos_tocar before update on arquivos for each row execute function tocar_atualizado();

-- ============================================================ venda
-- O produto (que já existe) diz o que a pessoa recebe; a oferta diz como se vende.
create table produto_acessos (
  produto_id uuid not null references produtos(id) on delete cascade,
  curso_id uuid not null references cursos(id) on delete cascade,
  dias int,               -- vazio = sem prazo
  primary key (produto_id, curso_id)
);

create table ofertas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  produto_id uuid not null references produtos(id) on delete restrict,
  nome text not null,
  preco_centavos int not null check (preco_centavos >= 100),
  preco_de_centavos int,
  parcelas_max int not null default 12 check (parcelas_max between 1 and 21),
  juros_mes numeric(6,4) not null default 0.0319 check (juros_mes >= 0 and juros_mes < 0.2),
  pix_desconto_pct numeric(5,2) not null default 0 check (pix_desconto_pct >= 0 and pix_desconto_pct < 90),
  pix_minutos int not null default 30 check (pix_minutos between 5 and 1440),
  metodos text[] not null default '{pix,cartao}',
  garantia_dias int not null default 7,
  checkout jsonb not null default '{}',     -- { inclui: [...], depoimentos: [...], aviso }
  limite_vendas int,
  valida_ate timestamptz,
  ativa boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger ofertas_tocar before update on ofertas for each row execute function tocar_atualizado();

-- Order bump: a caixinha "leve junto" no checkout.
create table ofertas_bumps (
  oferta_id uuid not null references ofertas(id) on delete cascade,
  bump_id uuid not null references ofertas(id) on delete cascade,
  titulo text not null,
  texto text,
  ordem int not null default 0,
  primary key (oferta_id, bump_id),
  check (oferta_id <> bump_id)
);

create table cupons (
  codigo text primary key check (codigo = upper(codigo) and codigo ~ '^[A-Z0-9_-]{3,30}$'),
  tipo text not null check (tipo in ('pct','valor')),
  valor numeric(10,2) not null check (valor > 0),
  ofertas uuid[],          -- vazio = vale para todas
  limite int,
  usos int not null default 0,
  valido_ate timestamptz,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Aluno = quem comprou (ou foi liberado). O login é do Supabase Auth; aqui fica o perfil.
create table alunos (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique,
  email text not null unique,
  nome text not null,
  celular text,
  asaas_cliente text,
  foto_url text,
  instagram text,
  bio text,
  area text,
  perfil_publico boolean not null default false,
  no_ranking boolean not null default true,
  ultimo_acesso timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger alunos_tocar before update on alunos for each row execute function tocar_atualizado();

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  aluno_id uuid not null references alunos(id) on delete restrict,
  oferta_id uuid not null references ofertas(id) on delete restrict,
  itens jsonb not null default '[]',        -- [{ oferta_id, produto_id, nome, centavos, bump }]
  cupom text,
  subtotal_centavos int not null,
  desconto_centavos int not null default 0,
  juros_centavos int not null default 0,
  total_centavos int not null,
  metodo text not null check (metodo in ('pix','cartao')),
  parcelas int not null default 1,
  status text not null default 'aberto' check (status in ('aberto','aguardando','pago','recusado','expirado','cancelado','reembolsado','contestado')),
  provedor text not null default 'asaas' check (provedor in ('asaas','simulado')),
  cobranca_id text,
  parcelamento_id text,
  pix_copia text,
  pix_qr text,
  pix_vence timestamptz,
  link_pagamento text,
  -- Origem: o visitante e os toques (UTM, post, DM) que trouxeram a venda.
  visitante text,
  primeiro_toque jsonb,
  ultimo_toque jsonb,
  toques jsonb not null default '[]',
  teste boolean not null default false,
  pago_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index pedidos_status on pedidos (status, criado_em desc);
create index pedidos_aluno on pedidos (aluno_id, criado_em desc);
create index pedidos_cobranca on pedidos (cobranca_id);
create trigger pedidos_tocar before update on pedidos for each row execute function tocar_atualizado();

-- Cada aviso do Asaas é processado uma vez só (ele pode mandar o mesmo mais de uma vez).
create table eventos_pagamento (
  id text primary key,
  provedor text not null default 'asaas',
  tipo text not null,
  cobranca_id text,
  pedido_id uuid references pedidos(id) on delete set null,
  payload jsonb not null,
  recebido_em timestamptz not null default now(),
  processado_em timestamptz,
  erro text
);
create index eventos_pagamento_pendentes on eventos_pagamento (recebido_em) where processado_em is null;

create table matriculas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos(id) on delete cascade,
  curso_id uuid not null references cursos(id) on delete cascade,
  pedido_id uuid references pedidos(id) on delete set null,
  origem text not null default 'compra' check (origem in ('compra','equipe','presente','bonus','teste')),
  inicio timestamptz not null default now(),
  fim timestamptz,
  status text not null default 'ativa' check (status in ('ativa','revogada')),
  motivo text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (aluno_id, curso_id)
);
create trigger matriculas_tocar before update on matriculas for each row execute function tocar_atualizado();

create table progresso (
  aluno_id uuid not null references alunos(id) on delete cascade,
  aula_id uuid not null references aulas(id) on delete cascade,
  posicao_s int not null default 0,
  assistido_s int not null default 0,
  passos int[] not null default '{}',       -- índices do "Faça agora" que a pessoa marcou
  concluida_em timestamptz,
  atualizado_em timestamptz not null default now(),
  primary key (aluno_id, aula_id)
);
create index progresso_recente on progresso (aluno_id, atualizado_em desc);

-- ============================================================ origem (UTMs)
-- Link curto rastreável: agenciasetup.com.br/l/<codigo>.
create table links (
  codigo text primary key check (codigo ~ '^[a-z0-9-]{2,40}$'),
  destino text not null check (destino like '/%'),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  peca_id uuid references pecas(id) on delete set null,
  gatilho_id uuid references gatilhos(id) on delete set null,
  cliques int not null default 0,
  criado_em timestamptz not null default now()
);

-- Cada chegada com marca de origem vira um toque. Sem IP: só o número do visitante (cookie nosso).
create table toques (
  id bigint generated always as identity primary key,
  visitante text not null,
  quando timestamptz not null default now(),
  origem text,
  meio text,
  campanha text,
  conteudo text,
  termo text,
  link text,
  clid text,
  referer text,
  pagina text,
  pais text
);
create index toques_visitante on toques (visitante, quando desc);
create index toques_quando on toques (quando desc);

-- ============================================================ e-mail, limites e configuração
-- Toda mensagem passa por aqui: sem o Resend configurado, fica como "simulado" (dá para ver no painel).
create table emails (
  id uuid primary key default gen_random_uuid(),
  para text not null,
  assunto text not null,
  tipo text not null,
  html text,
  status text not null default 'fila' check (status in ('fila','enviado','erro','simulado')),
  erro text,
  ref text,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz
);
create index emails_recentes on emails (criado_em desc);

-- Contador simples para limitar tentativas (código de entrada, checkout, tutor).
create table limites (
  chave text primary key,
  inicio timestamptz not null default now(),
  contagem int not null default 0
);

alter table cursos enable row level security;
alter table secoes enable row level security;
alter table modulos enable row level security;
alter table aulas enable row level security;
alter table arquivos enable row level security;
alter table produto_acessos enable row level security;
alter table ofertas enable row level security;
alter table ofertas_bumps enable row level security;
alter table cupons enable row level security;
alter table alunos enable row level security;
alter table pedidos enable row level security;
alter table eventos_pagamento enable row level security;
alter table matriculas enable row level security;
alter table progresso enable row level security;
alter table links enable row level security;
alter table toques enable row level security;
alter table emails enable row level security;
alter table limites enable row level security;

-- Cargo novo: Suporte (atende alunos; não vê faturamento nem reembolsa). Regras em worker/nucleo/permissoes.js.
alter table equipe drop constraint equipe_papel_check,
  add constraint equipe_papel_check check (papel in ('administrador','editor','redator','suporte'));
alter table chaves_api drop constraint chaves_api_papel_check,
  add constraint chaves_api_papel_check check (papel in ('administrador','editor','redator','suporte'));

-- Nome e endereço da área (o dono escolhe o nome; até lá, "Cursos da Setup").
insert into config (chave, valor) values ('area', '{"nome":"Cursos da Setup","dominio":"curso.agenciasetup.com.br"}') on conflict (chave) do nothing;

-- Bucket privado dos arquivos do curso: download só por link assinado que o Worker gera.
insert into storage.buckets (id, name, public) values ('curso', 'curso', false) on conflict (id) do nothing;

-- ============================================================ funções
-- Bate no limite: devolve true se ainda pode (e conta), false se passou de p_max na janela.
create or replace function bater_limite(p_chave text, p_janela_s int, p_max int) returns boolean
language plpgsql as $$
declare c int;
begin
  insert into limites (chave, inicio, contagem) values (p_chave, now(), 1)
  on conflict (chave) do update set
    contagem = case when limites.inicio < now() - make_interval(secs => p_janela_s) then 1 else limites.contagem + 1 end,
    inicio = case when limites.inicio < now() - make_interval(secs => p_janela_s) then now() else limites.inicio end
  returning contagem into c;
  return c <= p_max;
end $$;

-- Libera (ou estende) o acesso aos cursos dos produtos do pedido. Pode rodar de novo sem duplicar.
create or replace function liberar_pedido(p_pedido uuid) returns int
language plpgsql as $$
declare
  p pedidos;
  n int := 0;
  r record;
begin
  select * into p from pedidos where id = p_pedido;
  if not found then return 0; end if;
  for r in
    select distinct pa.curso_id, pa.dias
    from jsonb_array_elements(p.itens) it
    join produto_acessos pa on pa.produto_id = (it->>'produto_id')::uuid
  loop
    insert into matriculas (aluno_id, curso_id, pedido_id, origem, inicio, fim, status)
    values (p.aluno_id, r.curso_id, p.id, case when p.teste then 'teste' else 'compra' end, now(),
            case when r.dias is null then null else now() + make_interval(days => r.dias) end, 'ativa')
    on conflict (aluno_id, curso_id) do update set
      status = 'ativa', motivo = null, pedido_id = excluded.pedido_id,
      fim = case when matriculas.fim is null or excluded.fim is null then null else greatest(matriculas.fim, now()) + make_interval(days => r.dias) end;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Tira o acesso que veio deste pedido (reembolso, contestação).
create or replace function revogar_pedido(p_pedido uuid, p_motivo text) returns int
language sql as $$
  with r as (
    update matriculas set status = 'revogada', motivo = p_motivo
    where pedido_id = p_pedido and status = 'ativa'
    returning 1
  ) select count(*)::int from r;
$$;

-- Guarda o progresso sem voltar para trás (o maior tempo assistido fica).
create or replace function salvar_progresso(p_aluno uuid, p_aula uuid, p_posicao int, p_assistido int, p_concluir boolean default false) returns progresso
language plpgsql as $$
declare r progresso;
begin
  insert into progresso (aluno_id, aula_id, posicao_s, assistido_s, concluida_em, atualizado_em)
  values (p_aluno, p_aula, greatest(p_posicao, 0), greatest(p_assistido, 0), case when p_concluir then now() end, now())
  on conflict (aluno_id, aula_id) do update set
    posicao_s = greatest(excluded.posicao_s, 0),
    assistido_s = greatest(progresso.assistido_s, excluded.assistido_s),
    concluida_em = coalesce(progresso.concluida_em, excluded.concluida_em),
    atualizado_em = now()
  returning * into r;
  return r;
end $$;

-- Conta o clique do link curto e devolve o link (para o redirecionamento e o toque).
create or replace function clicar_link(p_codigo text) returns links
language sql as $$
  update links set cliques = cliques + 1 where codigo = p_codigo returning *;
$$;

-- Usa um cupom (dentro do limite). Devolve false se acabou ou venceu.
create or replace function usar_cupom(p_codigo text) returns boolean
language sql as $$
  with u as (
    update cupons set usos = usos + 1
    where codigo = p_codigo and ativo and (valido_ate is null or valido_ate > now()) and (limite is null or usos < limite)
    returning 1
  ) select exists (select 1 from u);
$$;

-- Números do painel de vendas (últimos p_dias).
create or replace function numeros_vendas(p_dias int default 30) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'pagos', count(*) filter (where status = 'pago'),
    'faturamento_centavos', coalesce(sum(total_centavos) filter (where status = 'pago'), 0),
    'aguardando', count(*) filter (where status = 'aguardando'),
    'reembolsados', count(*) filter (where status = 'reembolsado'),
    'contestados', count(*) filter (where status = 'contestado'),
    'pix', count(*) filter (where status = 'pago' and metodo = 'pix'),
    'cartao', count(*) filter (where status = 'pago' and metodo = 'cartao'),
    'alunos', (select count(*) from alunos)
  )
  from pedidos where not teste and criado_em > now() - make_interval(days => p_dias);
$$;
