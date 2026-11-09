-- Bunny Stream ao lado do Panda: cada aula pode ter o vídeo num dos dois (ou nos dois). O app do aluno usa o Bunny
-- quando a aula tem o id dele e a integração está ligada; senão, o Panda. Só acrescenta uma coluna.
alter table aulas add column if not exists video_bunny text;
