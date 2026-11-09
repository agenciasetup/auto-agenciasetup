-- Rastreio do e-mail (tela Suporte): o id da mensagem no Resend e a hora do primeiro aviso de cada tipo (entregue, aberto,
-- clicado, voltou, marcado como spam), gravados pela rota /api/resend/webhook. Só a hora: o conteúdo do aviso não fica.
-- E-mails de antes do rastreio ficam sem resend_id e sem essas horas (a tela trata como "sem dado", não como "não abriu").
alter table emails
  add column resend_id text,
  add column entregue_em timestamptz,
  add column aberto_em timestamptz,
  add column clicado_em timestamptz,
  add column devolvido_em timestamptz,
  add column spam_em timestamptz;

create unique index emails_resend_id on emails (resend_id) where resend_id is not null;
