-- Prévia curta em vídeo (8 s, sem som) que toca no fundo do destaque do início do aluno. Fica no bucket público "midia",
-- ao lado da capa; o vídeo da aula continua protegido no Bunny ou no Panda. Só acrescenta uma coluna.
alter table aulas add column if not exists previa_url text;
