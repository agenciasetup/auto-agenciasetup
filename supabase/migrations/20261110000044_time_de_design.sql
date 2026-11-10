-- O time de Design (10/11/2026, com o ok do dono: "Pode aplicar"). A regra: Conteúdo cuida das palavras e dos números,
-- Design cuida da imagem. Todo post passa pelos dois, nessa ordem: o Redator entrega a pauta pronta (tese, texto de
-- cada slide, legenda, palavra e material), o Designer devolve a peça pronta na fila, como rascunho, e o Revisor é a
-- última porta antes do dono. Plano em docs/escritorio.md ("Conteúdo e Design").
--
-- Os ids ficam como estão: turnos, carreira, consumo e os Calangos continuam ligados a eles. Muda a sala, o nome, a
-- função, a cadência e a ordem. O motivo de cada mudança entra na carreira pela ação do escritório (escritorio_agente).
--   redator-de-frase (Lídia G.): passa a ser o Redator de todo post, de frase e de carrossel.
--   redator-de-carrossel (Marcos T.): passa a ser o Designer, na sala Design.
--   revisor (Rute V.): vai para a sala Design.
--   olheiro-visual (Sara L.) e diretor-de-arte (Davi C.): o trabalho que o Worker faz toda segunda
--   (worker/lib/agentes/olheiro-visual.js e diretor-de-arte.js).

update agentes set
  nome = 'Redator',
  funcao = 'Escreve o texto de todo post, de frase e de carrossel: a tese, o texto de cada slide, a legenda e o Comenta X. Entrega a pauta pronta ao Design.',
  cadencia = 'Todo dia, às 8h (frase) e às 10h (carrossel)',
  ordem = 40
where id = 'redator-de-frase';

update agentes set
  sala = 'design',
  nome = 'Designer',
  funcao = 'Faz a arte de todo post, de frase e de carrossel: a ficha da capa, a imagem, a montagem nas 5 etapas e a capa animada. Recebe a pauta pronta do Redator e segue o teste da semana do Diretor de arte.',
  cadencia = 'Todo dia, às 8h (frase) e às 10h (carrossel)',
  ordem = 30
where id = 'redator-de-carrossel';

update agentes set
  sala = 'design',
  funcao = 'A última porta antes do dono: lê o post inteiro como quem nunca viu, o texto primeiro e depois a arte. Reprovou o texto, volta ao Redator; a imagem, ao Designer.',
  ordem = 40
where id = 'revisor';

update agentes set
  funcao = 'Toda segunda, acha as capas que saíram da curva em nota e salvos, para cima e para baixo, e diz o que elas têm em comum (assunto, cor, palavra grande), com as capas e os números como prova.',
  cadencia = 'Toda segunda, às 9h',
  modelo = 'claude-sonnet-5-5',
  ordem = 10
where id = 'olheiro-visual';

update agentes set
  funcao = 'Toda segunda, transforma a leitura do Olheiro visual em 1 teste de estilo com uma regra clara para o Designer, e na semana seguinte mede o teste contra as outras capas, por nota e salvos.',
  cadencia = 'Toda segunda, às 10h',
  modelo = 'claude-sonnet-5-5',
  ordem = 20
where id = 'diretor-de-arte';
