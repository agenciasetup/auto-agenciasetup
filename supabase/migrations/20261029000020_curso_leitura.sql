-- Curso de leitura (o primeiro é o "Dúvidas da Fé"): a aula pode ser um texto, e o curso pode ter marca e endereço próprios.
-- Só acrescenta colunas: as aulas e os cursos de hoje continuam iguais (tipo "video", sem marca).

-- tipo "leitura": a aula é o texto em `corpo`; o vídeo (Bunny ou Panda) continua possível e, se houver, aparece em cima.
-- corpo: { minutos, resposta, explicacao: [parágrafos], biblia: [{ texto, ref, nota }], igreja: [{ texto, doc, numero, url }],
--          diga, e_se: [{ pergunta, resposta }], guardar, imagem: { url, alt, legenda } }
alter table aulas add column tipo text not null default 'video' check (tipo in ('video','leitura'));
alter table aulas add column corpo jsonb;

-- marca: o curso que tem endereço próprio abre com a cara dele (app do aluno, checkout, obrigado e e-mails).
-- { nome, dominio, tema: "leitura", autores, whatsapp, pdf_arquivo_id, cor }
-- Curso sem marca é da Agência Setup (curso.agenciasetup.com.br), como sempre foi.
alter table cursos add column marca jsonb;
create unique index cursos_marca_dominio on cursos ((marca->>'dominio')) where marca is not null;
