-- A Colmeia de vendas (10/11/2026): a base única que todos os vendedores leem antes de falar (o Atendente do direct,
-- os vendedores da tarefa do direct e quem escreve as mensagens do Comenta X) e onde fica o que se aprende. Pedido do
-- dono: "existe alguma base colmeia pra todos vendedores, sobre o que é bom, ruim, deu certo, vendeu, não vendeu?
-- Aprende com minhas instruções".
--
-- tipo: resposta (pergunta que já tem resposta liberada), regra (como se comportar: quando ofertar, quando cumprimentar),
--       objecao (a objeção e como responder), produto (o que é verdade sobre um produto), vendeu e nao_vendeu (o que os
--       vendedores observaram, com a prova).
-- origem: dono (o que ele escreveu ou respondeu numa dúvida), agente (lição ou proposta de um agente), semente (o que já
--         estava na skill do direct no dia da criação).
-- status: ativa (todos usam), proposta (um agente sugeriu e espera o dono), arquivada.
create table colmeia (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('resposta','regra','objecao','produto','vendeu','nao_vendeu')),
  produto text not null default 'geral' check (produto in ('geral','posts','combo','videos','duvidas')),
  titulo text not null check (char_length(titulo) between 3 and 200),
  texto text not null check (char_length(texto) between 3 and 1200),
  prova text check (prova is null or char_length(prova) <= 600),
  origem text not null default 'dono' check (origem in ('dono','agente','semente')),
  autor text check (autor is null or char_length(autor) <= 80),
  status text not null default 'ativa' check (status in ('ativa','proposta','arquivada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index colmeia_status on colmeia (status, tipo);
alter table colmeia enable row level security;

-- O Atendente passa a esperar a pessoa terminar de escrever: a mensagem entra como "esperando" e o relógio de minuto
-- responde o conjunto. E cada atendimento guarda quais itens da Colmeia foram usados, para o placar de cada item.
alter table atendimentos drop constraint atendimentos_classe_check;
alter table atendimentos add constraint atendimentos_classe_check
  check (classe in ('esperando','respondeu','rascunho','duvida','nao_sei','ignorou','anotou','sem_orcamento','erro'));
alter table atendimentos add column colmeia jsonb not null default '[]'::jsonb;
alter table atendimentos add column modelo text check (modelo is null or char_length(modelo) <= 60);
create index atendimentos_esperando on atendimentos (criado_em) where classe = 'esperando';

-- As conversas com mensagem esperando resposta em que a pessoa parou de escrever há pelo menos p_espera segundos.
create or replace function atendente_fila(p_espera int default 20, p_limite int default 2) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
    select followup_id, min(criado_em) as desde, max(criado_em) as ate, count(*)::int as n
    from atendimentos
    where classe = 'esperando' and followup_id is not null and criado_em >= now() - interval '6 hours'
    group by followup_id
    having max(criado_em) <= now() - make_interval(secs => greatest(5, p_espera))
    order by min(criado_em)
    limit greatest(1, least(10, p_limite))
  ) x
$$;
revoke all on function atendente_fila(int, int) from public, anon, authenticated;

-- O placar de cada item da Colmeia: em quantas respostas entrou e quantas dessas conversas viraram venda nos 14 dias
-- seguintes. É indício, não prova: a conversa usa vários itens ao mesmo tempo.
create or replace function colmeia_placar() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(x.id, jsonb_build_object('usos', x.usos, 'vendas', x.vendas)), '{}'::jsonb) from (
    select e.id, count(*)::int as usos,
      (count(distinct a.followup_id) filter (where f.comprou_em is not null and f.comprou_em >= a.criado_em and f.comprou_em < a.criado_em + interval '14 days'))::int as vendas
    from atendimentos a
    cross join lateral jsonb_array_elements_text(a.colmeia) as e(id)
    left join followups f on f.id = a.followup_id
    where a.criado_em >= now() - interval '90 days' and a.classe in ('respondeu','rascunho')
    group by e.id
  ) x
$$;
revoke all on function colmeia_placar() from public, anon, authenticated;

-- ---------------------------------------------------------------- sementes: o que já estava na skill do direct
insert into colmeia (tipo, produto, titulo, texto, origem, autor) values
  ('produto', 'posts', 'O que é o mini curso Posts automáticos com Claude',
   'Aulas curtas, os arquivos prontos e o estilo da pessoa: o Claude acha o assunto, escreve e faz a arte, e a pessoa só aprova. Usa no Claude. 1 ano de acesso, e no checkout tem a opção de deixar vitalício. Pix ou cartão, direto na página.', 'semente', 'Skill do direct'),
  ('produto', 'combo', 'O que é o Combo Black Calango',
   'São os cursos de design da agência, os da imagem da página (alguns cursos antigos saíram de linha). 1 ano de acesso, com a opção de vitalício por +39,90 no checkout. Era vendido a 597. Dá acesso ao grupo de alunos. O acesso chega por e-mail da Hubla. O Posts automáticos não vem no combo, mas dá para adicionar no checkout. Não liste os cursos de memória: mande a página.', 'semente', 'Skill do direct'),

  ('resposta', 'posts', 'Quanto custa o mini curso de posts / o do Claude', '"Tá" e o preço de hoje, e o link do mini curso numa mensagem só dele.', 'semente', 'Skill do direct'),
  ('resposta', 'combo', 'Quanto custa o combo', 'O preço de hoje "com 1 ano de acesso", e o link do combo numa mensagem só dele.', 'semente', 'Skill do direct'),
  ('resposta', 'combo', 'O combo é vitalício?', '"1 ano de acesso, mas tem a opção de vitalício por +39,90 brother"', 'semente', 'Skill do direct'),
  ('resposta', 'posts', 'O mini curso é vitalício?', '"1 ano, e no checkout tem a opção de deixar vitalício"', 'semente', 'Skill do direct'),
  ('resposta', 'combo', 'O posts automáticos vem no combo?', '"Não brother, ele é a parte 🫡" e "Mas da pra adicionar no checkout do combo!"', 'semente', 'Skill do direct'),
  ('resposta', 'combo', 'Tem desconto no combo?', '"Ja está com desconto meu brother, esse combo era vendido a 597". Desconto além disso é dúvida para o Filipe.', 'semente', 'Skill do direct'),
  ('resposta', 'combo', 'O combo dá acesso ao grupo?', '"E sim, vc tem acesso ao grupo de alunos"', 'semente', 'Skill do direct'),
  ('resposta', 'combo', 'São todos os cursos? Quais cursos vêm no combo?', '"São todos esses cursos da imagem, alguns dos nossos cursos saíram de linha" e o link do combo.', 'semente', 'Skill do direct'),
  ('resposta', 'combo', 'Tem outro curso de design? Quero aprender design', 'Tem: o combo Black Calango, que são os cursos de design. Preço de hoje, 1 ano de acesso, e o link do combo.', 'semente', 'Skill do direct'),
  ('resposta', 'posts', 'Onde usa o mini curso?', '"Vc usa no Claude"', 'semente', 'Skill do direct'),
  ('resposta', 'geral', 'Como paga?', '"Pix ou cartão, direto na página"', 'semente', 'Skill do direct'),
  ('resposta', 'geral', 'Quero / eu quero / manda o link / como compro', 'O link do produto de que a pessoa está falando, numa mensagem só dele, e uma frase curta ("Acessa ai", "Aproveita ai!"). Se não dá para saber qual produto, pergunte: "Vc quer o mini curso de posts com o Claude ou o combo dos cursos de design?"', 'semente', 'Skill do direct'),
  ('resposta', 'geral', 'Disse que comprou ou que deu certo', '"Maravilha" e "Qualquer coisa me chama aqui!"', 'semente', 'Skill do direct'),
  ('resposta', 'geral', 'Agradeceu ou elogiou (também em resposta a um story: "o melhor", "top demais", "amei")', 'Uma frase curta de agradecimento, sem oferta: "Tmj!", "Brabo hahaha", "Valeu demais 🦎".', 'semente', 'Skill do direct'),
  ('resposta', 'geral', 'Só cumprimentou, sem dizer o que quer', 'Cumprimente de volta e pergunte no que pode ajudar. Sem oferta.', 'semente', 'Skill do direct'),

  ('regra', 'geral', 'Quando ofertar', 'Oferte (preço e link) só quando a pessoa pedir preço, disser que quer, perguntar se tem curso ou elogiar o resultado. Quem só cumprimentou ou fez uma pergunta solta recebe a resposta, sem oferta.', 'semente', 'Combinado em 10/11/2026'),
  ('regra', 'geral', 'Não repetir a oferta', 'Se o link desse produto já foi mandado nesta conversa, não mande de novo, a menos que a pessoa peça. Responda o que ela perguntou e pare.', 'semente', 'Combinado em 10/11/2026'),
  ('regra', 'geral', 'Disse que compra depois', 'Se a pessoa disse que compra depois (férias, salário, mês que vem), responda curto e sem pressão ("Fechou, qualquer coisa me chama aqui!"). Não insista.', 'semente', 'Combinado em 10/11/2026'),
  ('regra', 'geral', 'Cumprimentar só no começo', 'Se a conversa está acontecendo agora, ou a última troca foi há menos de 6 horas, continue direto, sem cumprimentar de novo. Cumprimente quando é a primeira mensagem da pessoa ou quando passou perto de um dia.', 'dono', 'Filipe, 10/11/2026'),
  ('regra', 'geral', 'Ler antes de responder', 'A pessoa pode mandar várias mensagens quebradas em seguida. Leia todas, e as últimas da conversa, e responda o conjunto de uma vez.', 'dono', 'Filipe, 10/11/2026'),
  ('regra', 'geral', 'Perguntaram se é robô, IA ou o Filipe', 'Diga a verdade, curto: "Aqui é o atendimento automático da Setup, o Filipe acompanha tudo e entra quando precisa 🦎".', 'semente', 'Combinado em 10/11/2026'),
  ('regra', 'geral', 'Pedido de dinheiro, Pix, favor ou assunto pessoal', 'Não responda nem prometa nada: é dúvida para o Filipe.', 'semente', 'Combinado em 10/11/2026');

-- O que o dono já respondeu nas dúvidas do direct entra como resposta dele.
insert into colmeia (tipo, produto, titulo, texto, origem, autor, criado_em)
select 'resposta', case when interesse in ('posts','combo','videos') then interesse else 'geral' end,
       left(duvida, 200), left(resposta, 1200), 'dono', 'Resposta do Filipe a uma dúvida', coalesce(respondida_em, now())
from followups where resposta is not null and duvida is not null and char_length(duvida) >= 3 and char_length(resposta) >= 3;
