-- O idioma do aluno (pedido do dono em 29/10/2026, curso em inglês): quem compra só em dólar recebe os e-mails em inglês
-- (acesso, código, reembolso) e os e-mails que ainda só existem em português (lembretes, desafio, resumo) não saem para
-- ele. Padrão 'pt': tudo o que existia continua igual.
alter table alunos add column if not exists idioma text not null default 'pt' check (idioma in ('pt', 'en'));
