# Cópia de segurança do banco

O banco (Supabase) guarda as vendas, os alunos, os pedidos, a lista de follow-up, a Colmeia, as peças e a configuração. O plano grátis do Supabase **não guarda backup** (conferido em 10/11/2026, a prova está no fim deste arquivo). Por isso existe uma cópia diária feita por nós, de graça, no computador da agência.

Em uma frase: todo dia, de madrugada, o computador copia o banco inteiro para a pasta `_backup/banco/`, guarda as 14 cópias mais novas e deixa um sinal no sistema dizendo que copiou.

## O que é copiado

- **Todas as tabelas do banco** (hoje são 80, com umas 21 mil linhas). A lista é lida do banco a cada rodada: tabela nova entra sozinha, ninguém precisa lembrar.
- **As migrations aplicadas**, com o SQL de cada uma. Com elas dá para refazer a estrutura do banco mesmo sem o repositório.
- **O retrato da estrutura** (tabelas, colunas, funções, gatilhos, índices, políticas), em `extras/esquema.sql`. Serve para consultar e comparar.
- **Os logins** (equipe e alunos) do cofre de login do Supabase, com a senha cifrada. Sem isso, depois de uma perda total, cada pessoa teria que criar a senha de novo.
- **A lista dos arquivos do Storage** (nome e tamanho de cada um). Só a lista, não os arquivos.

## O que não é copiado, e por quê

| O que | Por que fica de fora | Como voltaria |
| --- | --- | --- |
| Arquivos do `midia` (imagens e vídeos dos posts, 1,4 GB) | É grande e dá para refazer: o que foi publicado está nas redes e os originais das peças ficam em `_local/` | Refazendo ou entregando a peça de novo |
| Arquivos do `curso` (kit e PDFs dos cursos, uns 30 MB) | Saem das pastas `Curso/`, `Curso-Videos/` e `Curso-Duvidas/` deste computador | `node scripts/area-semente.mjs --so-kit` e os outros scripts de semente |
| Arquivos do `recursos` (materiais grátis, uns 55 MB) | Também nascem de arquivos deste computador | Subindo de novo pelo painel ou pelo script de cada material |
| Vídeos das aulas | Moram no Bunny, não no Supabase | Já estão lá; os originais ficam em `Curso/videos` |
| Chaves e segredos (`.env.local`, `.dev.vars`, segredos do Worker) | Não ficam no banco | Cada chave se refaz no painel do serviço dela |
| O código | Está no GitHub | `git clone` |

Dois avisos sobre essa tabela:

1. Os arquivos do `curso` e do `recursos` têm hoje duas cópias: a do Supabase e a das pastas deste computador. Se um dia você quiser uma terceira, é um script pequeno (uns 90 MB). Ainda não foi feito.
2. A cópia traz as credenciais das redes e as chaves das integrações **cifradas**, como estão no banco. Elas só abrem com a `CRIPTO_CHAVE`, que mora no Worker (Cloudflare) e no `.dev.vars`. Sem essa chave, depois de restaurar seria preciso conectar as redes e colar as chaves de novo.

## Onde fica

```
_backup/banco/
  2026-11-10/             uma pasta por dia
    resumo.json           hora, tabelas, contagens, tamanho, duração, avisos
    pedidos.jsonl.gz      uma tabela por arquivo, um registro por linha, comprimido
    alunos.jsonl.gz
    ...
    extras/
      migrations.jsonl.gz
      esquema.sql
      esquema.json.gz
      auth-users.jsonl.gz
      auth-identities.jsonl.gz
      storage-buckets.jsonl.gz
      storage-objetos.jsonl.gz
  backup.log              uma linha por rodada: deu certo ou o que falhou
```

- A pasta `_backup/` está fora do Git (o repositório é público e a cópia tem dados dos alunos). **Nunca mova a cópia para dentro de uma pasta que vai para o Git.**
- Cada cópia pesa uns 4 MB hoje. Com 14 guardadas, são uns 60 MB.
- Ficam as **14 cópias mais novas**. Quando entra a décima quinta, a mais velha sai. Se o computador ficar uma semana desligado, nada é apagado: a conta é por cópia, não por data.
- Rodar duas vezes no mesmo dia troca a cópia do dia pela mais nova.

## Como roda sozinha

O Agendador de Tarefas do Windows chama `scripts/backup-oculto.vbs` uma vez por dia. Ele roda `node scripts/backup.mjs` sem abrir janela. Leva menos de um minuto.

Para criar a tarefa (uma vez só, no PowerShell, dentro da pasta do projeto):

```powershell
schtasks /create /tn "AgenciaSetup-Backup" /tr "wscript.exe $PWD\scripts\backup-oculto.vbs" /sc daily /st 03:30 /f
```

**Se o computador estiver desligado às 3h30**, o Windows simplesmente pula a cópia daquele dia, a não ser que a opção abaixo esteja ligada. Com ela, a cópia roda alguns minutos depois que o computador é ligado e você entra no Windows:

```powershell
$t = Get-ScheduledTask -TaskName "AgenciaSetup-Backup"; $t.Settings.StartWhenAvailable = $true; Set-ScheduledTask -InputObject $t
```

É a mesma opção que, na tela do Agendador, se chama "Executar a tarefa o mais cedo possível após uma inicialização agendada ser perdida" (Agendador de Tarefas > AgenciaSetup-Backup > Propriedades > Configurações). Ligue: sem ela, um computador que dorme desligado nunca faria a cópia.

A tarefa só roda com você logado no Windows (como a do sinal de vida do Escritório). Para tirar: Agendador de Tarefas > AgenciaSetup-Backup > Excluir.

## Como conferir

```powershell
node scripts/backup.mjs --listar              # as cópias que existem, com data, linhas e tamanho
node scripts/backup.mjs --conferir            # abre a cópia mais nova e confere tudo
node scripts/backup.mjs --conferir 2026-11-10 # confere a de um dia
node scripts/backup.mjs                       # faz a cópia agora
node scripts/backup.mjs --tabela pedidos      # teste: copia só uma tabela para _backup/banco/teste/
```

O que cada conferência garante:

- **Na hora da cópia:** o número de linhas gravado em cada arquivo tem que bater com a contagem feita pelo próprio banco na mesma rodada. Se o banco mudou no meio da leitura, a tabela é lida de novo (até 3 vezes). Se mesmo assim alguma não bater, a rodada termina com erro, diz qual tabela, fica de lado numa pasta `AAAA-MM-DD.falhou` e **não** substitui nenhuma cópia boa.
- **No `--conferir`:** todo arquivo descomprime, toda linha é um registro válido, a contagem bate com o resumo e o conteúdo é o mesmo do dia da cópia (soma de conferência).

Nenhum desses comandos mostra dado de cliente na tela: só nome de tabela, contagem e tamanho.

## Como saber que a cópia parou

No fim de cada cópia que deu certo, o script grava no banco um sinal de vida: a chave `backup_ultimo` da tabela `config`, com a hora, o número de tabelas, de linhas e o tamanho. É a única coisa que o script escreve no banco.

O Zelador do Escritório lê esse sinal de hora em hora (`copiaDoBanco` em `worker/lib/agentes/zelador.js`; feito no computador em 10/11/2026, vale depois de publicado). Ele avisa no celular quando o sinal não existe, quando a última cópia tem mais de 36 horas e quando ela veio com zero tabelas ou zero linhas. Se a cópia saiu mas trouxe algum aviso, ele manda um alerta menor com o primeiro aviso, uma vez, e só lembra de novo depois de 3 dias. A leitura não custa chamada a mais: vem junto com outra que ele já fazia.

Sem o celular, o jeito de saber continua sendo `node scripts/backup.mjs --listar` ou o arquivo `_backup/banco/backup.log`.

Atenção: enquanto a tarefa do Agendador do Windows não for criada (seção "Como roda sozinha"), a cópia só nasce quando alguém roda o comando. Depois de publicado, o Zelador começa a avisar 36 horas depois da última cópia feita à mão.

## Como restaurar, passo a passo

Restaurar é sempre em dois tempos: primeiro simula, depois escreve. A simulação não muda nada.

### Caso 1: apagaram ou estragaram dados de uma tabela

1. Veja as cópias: `node scripts/backup.mjs --listar`. Escolha o dia anterior ao problema.
2. Simule a tabela: `node scripts/backup-restaurar.mjs 2026-11-10 --tabela pedidos`
   A resposta mostra quantas linhas estão iguais, quantas mudaram depois da cópia, quantas não existem mais no banco e quantas só existem no banco.
3. Se os números fizerem sentido, escreva: `node scripts/backup-restaurar.mjs 2026-11-10 --tabela pedidos --confirmo`
4. No fim ele confere e diz quantas linhas ficaram iguais à cópia.

O que acontece na escrita:

- Linha que sumiu é **recriada**, com o mesmo id.
- Linha que mudou depois da cópia **volta ao valor do dia da cópia**. O que foi alterado nela depois se perde. Pense antes de devolver uma tabela inteira por causa de uma linha só.
- Linha igual não é tocada.
- Linha que só existe no banco (criada depois da cópia) **fica como está**. Restaurar nunca apaga.
- É uma tabela por vez. Tabela ligada a outra (pedido que aponta para aluno, por exemplo) precisa que a outra já tenha voltado: a simulação sem opção mostra a ordem certa.

### Caso 2: o banco inteiro se perdeu

É o caso grave (projeto apagado ou corrompido). Faça com o Claude, passo a passo, porque envolve criar um projeto novo:

1. Criar um projeto novo no Supabase e pôr as chaves novas no `.env.local`, no `.claude/supabase-projeto` e no Worker.
2. Refazer a estrutura: `npm run migrar`. Se a pasta `supabase/migrations` não existir mais, o SQL de cada migration está em `extras/migrations.jsonl.gz`.
3. Ver a ordem: `node scripts/backup-restaurar.mjs 2026-11-10`. Ele lista as 80 tabelas na ordem em que precisam voltar.
4. Devolver tabela por tabela, nessa ordem, com `--tabela <nome> --confirmo`.
5. Algumas tabelas as migrations já preenchem (agentes, conquistas, config). Se alguma reclamar de registro repetido, pare e peça ajuda: a saída é esvaziar a tabela recém-criada antes de devolver.
6. Logins: o script de restaurar não devolve logins. Ou o Claude devolve a partir de `extras/auth-users.jsonl.gz` e `extras/auth-identities.jsonl.gz` (as senhas continuam as mesmas), ou limpa-se a coluna `auth_id` de `alunos` e `equipe` e cada pessoa entra de novo pelo link de acesso.
7. Arquivos do Storage: subir de novo com os scripts de semente. A lista do que existia está em `extras/storage-objetos.jsonl.gz`.
8. Conferir tudo: `node scripts/backup-restaurar.mjs 2026-11-10 --comparar`.

**Seja honesto com este caso:** a volta do banco inteiro nunca foi ensaiada de verdade. A escrita de uma tabela também nunca foi executada: foi simulada, e o comando de escrita foi mostrado ao banco para ele conferir a forma, sem executar (10/11/2026). O dia de fazer um ensaio completo, num projeto de teste separado, é uma decisão sua.

## Se o computador pifar

**A cópia está só neste computador.** Isso tem duas consequências:

- Se o HD queimar, as cópias vão junto. O banco continua no Supabase, então nada se perde na hora, mas você fica sem rede de segurança até montar a cópia em outro computador.
- Sem o computador ligado, não nasce cópia nova.

O pior cenário é perder o Supabase e o computador na mesma época. É improvável, mas é o risco que sobra.

A saída mais simples é ter uma **segunda cópia fora do computador**: apontar um serviço de nuvem que você já usa (Google Drive, OneDrive, iCloud) para sincronizar só a pasta `_backup/banco`. São uns 60 MB, cabe em qualquer conta grátis. No Google Drive para computador, por exemplo: Preferências > Meu computador > Adicionar pasta.

Se for por esse caminho, três cuidados:

1. A cópia tem dado pessoal dos alunos (nome, e-mail, celular), os logins com a senha cifrada e as credenciais das redes cifradas. A conta da nuvem precisa ser só sua, com verificação em duas etapas.
2. Nunca compartilhe a pasta por link.
3. Sincronize só `_backup/banco`, não a pasta do projeto inteira.

Outra saída, sem nuvem: copiar `_backup/banco` para um pendrive ou HD externo uma vez por semana. Protege menos (depende de lembrar), mas não põe os dados em lugar nenhum fora de casa.

A decisão é sua. O script nunca manda a cópia para fora.

Para montar a cópia em outro computador: clonar o repositório, criar o `.env.local` com `SUPABASE_URL`, `SUPABASE_SECRET_KEY` e `SUPABASE_ACCESS_TOKEN`, e criar a tarefa do Agendador de novo.

## Limites desta solução

- **É uma foto por dia, não um histórico por minuto.** Se o banco se perder às 18h, o que aconteceu desde a cópia da madrugada não está na cópia. As vendas desse intervalo ainda estariam no Asaas e no Stripe, e dá para reconstruir a partir de lá, à mão.
- **A foto não é de um instante só.** As tabelas são lidas uma depois da outra, em menos de um minuto. Um pedido criado bem no meio pode aparecer numa tabela e não na outra. É pouco, mas existe.
- **Depende do computador ligado** e de você logado no Windows.
- **Guarda 14 cópias.** Um estrago que só for percebido depois de 14 cópias não tem mais volta por aqui.
- **Não copia os arquivos do Storage** (veja a tabela lá em cima).
- **A restauração completa nunca foi ensaiada.**
- Se o token da conta do Supabase (`SUPABASE_ACCESS_TOKEN`) vencer, as tabelas continuam sendo copiadas, mas os extras (migrations, estrutura, logins, lista de arquivos) ficam de fora e a cópia registra um aviso.

O jeito de não ter esses limites é o plano Pro do Supabase (US$ 25 por mês), que guarda backup diário por 7 dias do lado deles. Mesmo com ele, esta cópia continua valendo como segunda rede.

## O que foi conferido no Supabase (10/11/2026)

- O plano da organização é `free` (resposta de `GET /v1/organizations/<id>`: `"plan": "free"`).
- A lista de backups do projeto está vazia e a recuperação por minuto está desligada (resposta de `GET /v1/projects/<ref>/database/backups`: `"backups": []`, `"pitr_enabled": false`). O projeto existe desde 22/10/2026, então não é falta de tempo: o plano grátis não oferece backup para baixar nem para restaurar.
- Nenhum complemento contratado (`GET /v1/projects/<ref>/billing/addons`: `"selected_addons": []`).
- O banco ocupa 42 MB (o plano grátis vai até 500 MB).
- O Storage está com 1,5 GB (quase tudo no `midia`). O plano grátis costuma incluir 1 GB; a tela de uso do Supabase não foi conferida. Não tem a ver com a cópia, mas vale olhar (`node scripts/midia-limpar.mjs` simula a limpeza das peças já publicadas).
