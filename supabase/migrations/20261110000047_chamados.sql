-- Chamados de suporte (10/11/2026). Pedido do dono: "O atendente pode colher dados como nome, email, telefone, curso
-- e dúvida. E poderia adicionar pra gente no menu de suporte ali. Assim meu time acessa ali todos os dias e resolve."
--
-- Quando alguém conta no direct um problema com um curso que comprou, o Atendente colhe os dados na conversa e o
-- chamado nasce aqui (worker/lib/chamados.js). A tela Suporte mostra os abertos e o time resolve.
-- origem: atendente (a IA do direct), vendedor (a tarefa do direct, pelo conector) ou painel (aberto pelo time).
-- Cada pessoa da lista de follow-up tem um chamado aberto por vez: o que ela disser a mais completa o mesmo chamado.
create table chamados (
  id uuid primary key default gen_random_uuid(),
  followup_id uuid references followups (id) on delete set null,
  perfil text not null default 'br' check (perfil in ('br','en')),
  usuario text check (usuario is null or char_length(usuario) <= 60),
  nome text check (nome is null or char_length(nome) <= 80),
  email text check (email is null or char_length(email) <= 160),
  telefone text check (telefone is null or char_length(telefone) <= 15),
  curso text check (curso is null or char_length(curso) <= 160),
  problema text not null check (char_length(problema) between 3 and 600),
  origem text not null default 'atendente' check (origem in ('atendente','vendedor','painel')),
  status text not null default 'aberto' check (status in ('aberto','resolvido')),
  nota text check (nota is null or char_length(nota) <= 600),
  resolvido_por text check (resolvido_por is null or char_length(resolvido_por) <= 80),
  resolvido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index chamados_um_aberto on chamados (followup_id) where status = 'aberto' and followup_id is not null;
create index chamados_status on chamados (status, criado_em desc);
alter table chamados enable row level security;
