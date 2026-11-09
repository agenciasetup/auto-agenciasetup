-- Busca dentro do que foi falado nas aulas (a transcrição com os tempos fica em aulas.falas).
-- Devolve a aula, o segundo e o trecho, só dos cursos que a pessoa pode ver.
create or replace function buscar_falas(p_cursos uuid[], p_q text, p_limite int default 20) returns table (
  aula_id uuid, codigo text, titulo text, capa_url text, curso_id uuid, s int, texto text
)
language sql stable as $$
  select a.id, a.codigo, a.titulo, a.capa_url, a.curso_id, (f->>'s')::numeric::int, f->>'texto'
  from aulas a
  join modulos m on m.id = a.modulo_id
  cross join lateral jsonb_array_elements(a.falas) f
  where a.curso_id = any(p_cursos) and a.status = 'publicado'
    and length(trim(p_q)) >= 3
    and unaccent(lower(f->>'texto')) like '%' || unaccent(lower(trim(p_q))) || '%'
  order by m.ordem, a.ordem, (f->>'s')::numeric
  limit greatest(1, least(p_limite, 50));
$$;

-- Conta um download de arquivo do curso.
create or replace function contar_arquivo(p_id uuid) returns void
language sql as $$ update arquivos set downloads = downloads + 1 where id = p_id; $$;
