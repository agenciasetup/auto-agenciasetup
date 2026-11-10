// Cópia de segurança diária do banco (Supabase) para este computador.
// O plano grátis do Supabase não guarda backup (conferido em 10/11/2026), então esta cópia é a única que existe.
// Roda sozinha de madrugada pelo Agendador de Tarefas do Windows (scripts/backup-oculto.vbs). Como funciona, como
// conferir e como restaurar: docs/backup.md.
//
//   node scripts/backup.mjs                    faz a cópia de hoje em _backup/banco/AAAA-MM-DD/
//   node scripts/backup.mjs --listar           mostra as cópias que existem
//   node scripts/backup.mjs --conferir [data]  abre os arquivos de um dia e confere (sem data: a cópia mais nova)
//   node scripts/backup.mjs --tabela <nome>    copia só uma tabela para _backup/banco/teste/ (teste, não conta)
//
// O que entra: todas as tabelas do esquema public (a lista é lida do banco a cada rodada, tabela nova entra sozinha),
// uma por arquivo, um registro por linha em JSON, comprimido com gzip. E os extras, que não são tabela do public e são
// difíceis de refazer: as migrations aplicadas (com o SQL de cada uma), o retrato do esquema (tabelas, funções,
// gatilhos, políticas), os logins do Supabase Auth e a lista de arquivos do Storage (só a lista, sem os arquivos).
//
// Regras deste arquivo:
// - Só lê o banco. A ÚNICA escrita é o sinal de vida em config.backup_ultimo, no fim de uma cópia que deu certo.
// - A cópia tem dado de cliente e fica só no disco deste computador (_backup/ está fora do Git). Nada de upload.
// - Nunca imprime conteúdo de linha nem chave: só nome de tabela, contagem e tamanho.
// - Sem dependência: só módulos do Node.
import { appendFileSync, createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { join, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGunzip, createGzip } from 'node:zlib';
import { env, gestao, projeto, raiz } from './env.mjs';

export const PASTA = join(raiz, '_backup', 'banco');
export const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;
const GUARDAR = 14; // quantas cópias boas ficam no disco; a mais velha sai quando entra a décima quinta
const PAGINA = 1000; // o Supabase entrega no máximo 1000 linhas por pedido
const TENTATIVAS = 3; // quantas vezes uma tabela é relida quando muda no meio da leitura

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
const doisDigitos = (n) => String(n).padStart(2, '0');
export const numero = (n) => Number(n).toLocaleString('pt-BR');
export function tamanho(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} KB`;
  return `${(bytes / 1048576).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
}
// A data da pasta é a do relógio deste computador (a cópia das 3h30 de terça é a de terça).
function hojeLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

// ---------------------------------------------------------------- conversa com o banco

// API REST do Supabase com a chave secreta. A chave nova (sb_secret_...) vai só no apikey; a antiga (JWT) vai nos dois.
// Repete sozinho quando a rede falha ou o banco responde 429 ou 5xx. Erro nunca leva o endereço com filtro
// (o filtro pode ter dado de cliente): só o nome da tabela.
export async function rest(caminho, opcoes = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) throw new Error('faltam SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local');
  const k = env.SUPABASE_SECRET_KEY;
  const headers = { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), ...(opcoes.headers || {}) };
  const onde = caminho.split('?')[0];
  let ultimo = '';
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    try {
      const r = await fetch(`${env.SUPABASE_URL}/rest/v1${caminho}`, { ...opcoes, headers, signal: AbortSignal.timeout(60_000) });
      if (r.status === 429 || r.status >= 500) throw new Error(`o banco respondeu ${r.status}`);
      const texto = opcoes.method === 'HEAD' ? '' : await r.text();
      if (!r.ok) {
        let motivo = '';
        try {
          const j = JSON.parse(texto);
          motivo = [j.code, j.message].filter(Boolean).join(' ');
        } catch {}
        const erro = new Error(`a API REST recusou ${onde} (${r.status}) ${motivo.slice(0, 200)}`);
        erro.definitivo = true;
        throw erro;
      }
      return { texto, faixa: r.headers.get('content-range') || '' };
    } catch (e) {
      if (e.definitivo) throw e;
      ultimo = e.message;
      if (tentativa < 4) await espera(1500 * tentativa);
    }
  }
  throw new Error(`sem resposta do banco em ${onde}: ${ultimo}`);
}

// SQL só de leitura pela API de gestão: o Supabase roda com o usuário supabase_read_only_user numa transação
// que não aceita escrita. Serve para o que a API REST não mostra (catálogo, migrations, auth, storage).
export async function lerSql(query) {
  // Sem o token, o gestao() do env.mjs encerra o programa; aqui vira um erro comum, que a cópia sabe contornar.
  if (!env.SUPABASE_ACCESS_TOKEN) throw new Error('falta SUPABASE_ACCESS_TOKEN no .env.local');
  return gestao('/database/query', { method: 'POST', body: JSON.stringify({ query, read_only: true }) });
}

// ---------------------------------------------------------------- o que existe no banco

// Um pedido só: tabelas do public (com chave primária, colunas, restrições, índices, gatilhos e políticas),
// visões, funções, sequências, tipos e extensões. É a lista de tabelas da rodada e também o retrato do esquema.
const SQL_CATALOGO = `
select jsonb_build_object(
  'versao', version(),
  'tabelas', coalesce((select jsonb_agg(t order by t->>'nome') from (
    select jsonb_build_object(
      'nome', c.relname,
      'rls', c.relrowsecurity,
      'permissoes', c.relacl::text,
      'comentario', obj_description(c.oid, 'pg_class'),
      'pk', coalesce((select jsonb_agg(a.attname order by k.ord)
        from pg_index i cross join lateral unnest(i.indkey) with ordinality as k(num, ord)
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.num
        where i.indrelid = c.oid and i.indisprimary), '[]'::jsonb),
      'colunas', (select jsonb_agg(jsonb_build_object(
          'nome', a.attname, 'tipo', format_type(a.atttypid, a.atttypmod), 'obrigatoria', a.attnotnull,
          'padrao', pg_get_expr(d.adbin, d.adrelid), 'identidade', a.attidentity, 'gerada', a.attgenerated) order by a.attnum)
        from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
        where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped),
      'restricoes', coalesce((select jsonb_agg(jsonb_build_object(
          'nome', k.conname, 'tipo', k.contype, 'def', pg_get_constraintdef(k.oid),
          'para', case when k.contype = 'f' then k.confrelid::regclass::text end) order by k.contype, k.conname)
        from pg_constraint k where k.conrelid = c.oid), '[]'::jsonb),
      'indices', coalesce((select jsonb_agg(jsonb_build_object(
          'nome', ic.relname, 'def', pg_get_indexdef(x.indexrelid),
          'de_restricao', exists (select 1 from pg_constraint k where k.conindid = x.indexrelid)) order by ic.relname)
        from pg_index x join pg_class ic on ic.oid = x.indexrelid where x.indrelid = c.oid), '[]'::jsonb),
      'gatilhos', coalesce((select jsonb_agg(jsonb_build_object('nome', g.tgname, 'def', pg_get_triggerdef(g.oid)) order by g.tgname)
        from pg_trigger g where g.tgrelid = c.oid and not g.tgisinternal), '[]'::jsonb),
      'politicas', coalesce((select jsonb_agg(to_jsonb(p) order by p.policyname)
        from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname), '[]'::jsonb)
    ) as t
    from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and not c.relispartition
  ) x), '[]'::jsonb),
  'visoes', coalesce((select jsonb_agg(jsonb_build_object('nome', c.relname, 'tipo', c.relkind, 'def', pg_get_viewdef(c.oid, true)) order by c.relname)
    from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('v', 'm')), '[]'::jsonb),
  'funcoes', coalesce((select jsonb_agg(jsonb_build_object(
      'nome', p.proname, 'argumentos', pg_get_function_identity_arguments(p.oid), 'def', pg_get_functiondef(p.oid))
      order by p.proname, pg_get_function_identity_arguments(p.oid))
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p')
      and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')), '[]'::jsonb),
  'sequencias', coalesce((select jsonb_agg(jsonb_build_object('nome', s.sequencename, 'tipo', s.data_type::text, 'ultimo', s.last_value) order by s.sequencename)
    from pg_sequences s where s.schemaname = 'public'), '[]'::jsonb),
  'tipos', coalesce((select jsonb_agg(jsonb_build_object('nome', t.typname,
      'valores', (select jsonb_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid)) order by t.typname)
    from pg_type t where t.typnamespace = 'public'::regnamespace and t.typtype = 'e'), '[]'::jsonb),
  'extensoes', coalesce((select jsonb_agg(jsonb_build_object('nome', e.extname, 'versao', e.extversion, 'esquema', e.extnamespace::regnamespace::text) order by e.extname)
    from pg_extension e), '[]'::jsonb)
) as esquema`;

export async function lerCatalogo() {
  const [linha] = await lerSql(SQL_CATALOGO);
  return linha.esquema;
}

// Reserva para quando a API de gestão não responde (token vencido, por exemplo): a própria API REST conta quais
// tabelas enxerga e qual é a chave primária de cada uma. Não separa tabela de visão, e não traz o esquema.
async function tabelasPelaRest() {
  const { texto } = await rest('/');
  const definicoes = JSON.parse(texto).definitions || {};
  return Object.entries(definicoes)
    .map(([nome, d]) => ({
      nome,
      colunas: Object.keys(d.properties || {}),
      pk: Object.entries(d.properties || {}).filter(([, p]) => /<pk\/>/.test(p.description || '')).map(([c]) => c),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

// ---------------------------------------------------------------- leitura de uma tabela, em páginas

// Corta o texto de uma página ("[{...}, {...}]") em um pedaço por registro, sem reescrever nada: o que vai para
// o arquivo é o texto exato que o banco mandou. Assim número grande (bigint, numeric) não perde precisão ao
// passar pelo JavaScript.
export function fatiar(texto) {
  const partes = [];
  let nivel = 0;
  let dentroDeTexto = false;
  let escapando = false;
  let inicio = -1;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    if (dentroDeTexto) {
      if (escapando) escapando = false;
      else if (c === 92) escapando = true; // barra invertida
      else if (c === 34) dentroDeTexto = false; // aspas
      continue;
    }
    if (c === 34) dentroDeTexto = true;
    else if (c === 123 || c === 91) {
      // abre chave ou colchete
      if (nivel === 1 && c === 123) inicio = i;
      nivel++;
    } else if (c === 125 || c === 93) {
      // fecha chave ou colchete
      nivel--;
      if (nivel === 1 && c === 125 && inicio >= 0) {
        partes.push(texto.slice(inicio, i + 1));
        inicio = -1;
      }
    }
  }
  return partes;
}

// Valor dentro de um filtro or=(...): entre aspas, para aceitar vírgula, ponto, dois-pontos e arroba.
const entreAspas = (v) => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

// O filtro "depois da última linha lida", pela chave primária (uma coluna ou várias). Ler assim, em vez de
// pular N linhas, não repete nem pula registro quando alguém grava na tabela no meio da leitura.
export function depoisDe(pk, cursor) {
  const termos = pk.map((coluna, i) => {
    const partes = [...pk.slice(0, i).map((c) => `${c}.eq.${entreAspas(cursor[c])}`), `${coluna}.gt.${entreAspas(cursor[coluna])}`];
    return partes.length > 1 ? `and(${partes.join(',')})` : partes[0];
  });
  return `(${termos.join(',')})`;
}

function consulta(t, colunas, cursor, lidas) {
  const q = new URLSearchParams({ select: colunas, limit: String(PAGINA) });
  if (t.pk.length) {
    q.set('order', t.pk.map((c) => `${c}.asc`).join(','));
    if (cursor) q.set('or', depoisDe(t.pk, cursor));
  } else {
    // Tabela sem chave primária (hoje não existe nenhuma): ordena por todas as colunas e pula as já lidas.
    q.set('order', t.colunas.map((c) => `${c}.asc`).join(','));
    q.set('offset', String(lidas));
  }
  return q.toString();
}

// Lê a tabela inteira em páginas e entrega cada página para "cadaPagina(pedaços, objetos)".
// "colunas" é o select da API REST ("*" para tudo). Devolve quantas linhas leu, quantos pedidos fez e o total que
// o banco contou junto com a primeira página (a contagem sai da mesma leitura, então vale como conferência quando
// a tabela cabe numa página só).
// Página que vem menor que o pedido é a última. Com "ateVazia", só para quando o banco devolve uma página vazia:
// é o jeito lento e à prova de tudo, usado quando a contagem não bate na primeira leitura.
export async function lerTabela(t, colunas, cadaPagina, ateVazia = false) {
  let lidas = 0;
  let pedidos = 0;
  let total = null;
  let cursor = null;
  for (;;) {
    const { texto, faixa } = await rest(`/${encodeURIComponent(t.nome)}?${consulta(t, colunas, cursor, lidas)}`, pedidos ? {} : { headers: { Prefer: 'count=exact' } });
    if (!pedidos) total = Number((faixa.match(/\/(\d+)$/) || [])[1] ?? NaN);
    pedidos++;
    const objetos = JSON.parse(texto);
    const partes = fatiar(texto);
    if (!Array.isArray(objetos) || partes.length !== objetos.length) throw new Error(`o corte da página de ${t.nome} não bateu (${partes.length} pedaços)`);
    if (!objetos.length) return { lidas, pedidos, total };
    // Um registro por linha: se algum vier com quebra de linha crua (só coluna do tipo json faz isso), é reescrito.
    for (let i = 0; i < partes.length; i++) if (/[\n\r]/.test(partes[i])) partes[i] = JSON.stringify(objetos[i]);
    if (t.pk.length) {
      const ultimo = {};
      for (const c of t.pk) {
        const v = objetos[objetos.length - 1][c];
        if (v === null || v === undefined || (typeof v === 'number' && !Number.isSafeInteger(v))) throw new Error(`a chave ${c} de ${t.nome} não serve para paginar`);
        ultimo[c] = v;
      }
      if (cursor && t.pk.every((c) => ultimo[c] === cursor[c])) throw new Error(`a leitura de ${t.nome} parou de andar`);
      cursor = ultimo;
    }
    await cadaPagina(partes, objetos);
    lidas += objetos.length;
    if (objetos.length < PAGINA && !ateVazia) return { lidas, pedidos, total };
  }
}

// Quantas linhas a tabela tem agora, contadas pelo banco.
export async function contar(nome) {
  const { faixa } = await rest(`/${encodeURIComponent(nome)}?select=*`, { method: 'HEAD', headers: { Prefer: 'count=exact', Range: '0-0' } });
  const m = faixa.match(/\/(\d+)$/);
  if (!m) throw new Error(`o banco não disse quantas linhas tem ${nome}`);
  return Number(m[1]);
}

// ---------------------------------------------------------------- arquivos .jsonl.gz

function abrirGz(caminho) {
  const gz = createGzip({ level: 9 });
  const pronto = pipeline(gz, createWriteStream(caminho));
  pronto.catch(() => {}); // o erro aparece no fechar()
  const hash = createHash('sha256');
  let abertos = 0;
  return {
    async escrever(texto) {
      const b = Buffer.from(texto, 'utf8');
      abertos += b.length;
      hash.update(b);
      if (!gz.write(b)) await once(gz, 'drain');
    },
    async fechar() {
      gz.end();
      await pronto;
      return { bytes: statSync(caminho).size, bytes_abertos: abertos, sha256: hash.digest('hex') };
    },
  };
}

// Abre um .jsonl.gz e entrega linha por linha. "bruto" recebe os bytes descomprimidos (para a soma de conferência).
export async function lerLinhas(caminho, cada, bruto) {
  let n = 0;
  let resto = Buffer.alloc(0);
  await pipeline(createReadStream(caminho), createGunzip(), async (fonte) => {
    for await (const pedaco of fonte) {
      if (bruto) bruto(pedaco);
      const buf = resto.length ? Buffer.concat([resto, pedaco]) : pedaco;
      let ini = 0;
      for (let i = buf.indexOf(10, ini); i !== -1; i = buf.indexOf(10, ini)) {
        cada(buf.toString('utf8', ini, i));
        n++;
        ini = i + 1;
      }
      resto = buf.subarray(ini);
    }
  });
  if (resto.length) {
    cada(resto.toString('utf8'));
    n++;
  }
  return n;
}

// ---------------------------------------------------------------- a cópia

async function copiarTabela(t, pasta) {
  const arquivo = `${t.nome}.jsonl.gz`;
  let feito = null;
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    const gz = abrirGz(join(pasta, arquivo));
    let lido;
    try {
      lido = await lerTabela(t, '*', (partes) => gz.escrever(`${partes.join('\n')}\n`), tentativa > 1);
    } catch (e) {
      await gz.fechar().catch(() => {});
      throw e;
    }
    const gravado = await gz.fechar();
    const linhas = lido.lidas;
    // A conferência: o que foi gravado tem que bater com a contagem feita pelo banco. Tabela que coube numa página
    // só já veio contada na mesma leitura; a maior é contada de novo no fim. Se a tabela mudou no meio
    // (o relógio grava a cada minuto), lê de novo.
    const noBanco = lido.pedidos === 1 && Number.isInteger(lido.total) ? lido.total : await contar(t.nome);
    feito = { nome: t.nome, arquivo, linhas, no_banco: noBanco, ...gravado, pk: t.pk, tentativas: tentativa, ok: linhas === noBanco };
    if (feito.ok) break;
    if (tentativa < TENTATIVAS) await espera(2000 * tentativa);
  }
  return feito;
}

// Os extras ficam fora do public, então a API REST não mostra: vêm por SQL só de leitura, em páginas pela chave.
const EXTRAS = [
  { nome: 'migrations', de: 'supabase_migrations.schema_migrations', chave: 'version', oque: 'migrations aplicadas, com o SQL de cada uma' },
  { nome: 'auth-users', de: 'auth.users', chave: 'id', oque: 'logins do Supabase Auth (equipe e alunos, com a senha cifrada)' },
  { nome: 'auth-identities', de: 'auth.identities', chave: 'id', oque: 'a forma de entrar de cada login' },
  { nome: 'storage-buckets', de: 'storage.buckets', chave: 'id', oque: 'os baldes do Storage' },
  { nome: 'storage-objetos', de: 'storage.objects', chave: 'id', oque: 'a lista dos arquivos do Storage (só a lista)' },
];

async function copiarExtra(x, pasta) {
  const arquivo = `extras/${x.nome}.jsonl.gz`;
  const gz = abrirGz(join(pasta, arquivo));
  let linhas = 0;
  let pedidos = 0;
  let total = 0;
  let ultimo = null;
  try {
    for (;;) {
      const depois = ultimo === null ? '' : `where e.${x.chave} > '${String(ultimo).replace(/'/g, "''")}'`;
      const pagina = await lerSql(`select to_jsonb(e)::text as l, e.${x.chave}::text as k, (count(*) over ())::int as total from ${x.de} e ${depois} order by e.${x.chave} limit 500`);
      pedidos++;
      if (!pagina.length) break;
      if (pedidos === 1) total = pagina[0].total;
      await gz.escrever(`${pagina.map((p) => p.l).join('\n')}\n`);
      linhas += pagina.length;
      ultimo = pagina[pagina.length - 1].k;
      if (pagina.length < 500) break;
    }
  } catch (e) {
    await gz.fechar().catch(() => {});
    throw e;
  }
  const gravado = await gz.fechar();
  // Coube num pedido só: a contagem veio junto, da mesma leitura. Mais de um: conta de novo no fim.
  const n = pedidos === 1 ? total : (await lerSql(`select count(*)::int as n from ${x.de}`))[0].n;
  return { nome: x.nome, arquivo, oque: x.oque, linhas, no_banco: n, ...gravado, ok: linhas === n };
}

// O retrato do esquema em SQL, para ler e comparar. Não é o caminho para refazer o banco (esse são as migrations),
// mas mostra como o banco estava de verdade no dia, inclusive o que alguém tenha mudado fora das migrations.
function esquemaEmSql(e) {
  const id = (n) => `"${String(n).replace(/"/g, '""')}"`;
  const l = [
    '-- Retrato do esquema public no dia da cópia, montado a partir do catálogo do Postgres.',
    '-- Serve para consulta e comparação. Para refazer o banco, o caminho são as migrations',
    '-- (supabase/migrations no repositório, ou extras/migrations.jsonl.gz nesta mesma cópia).',
    `-- ${e.versao}`,
    '',
    'set check_function_bodies = off;',
    '',
  ];
  for (const x of e.extensoes) l.push(`create extension if not exists ${id(x.nome)} with schema ${id(x.esquema)}; -- versão ${x.versao}`);
  l.push('');
  for (const t of e.tipos) l.push(`create type public.${id(t.nome)} as enum (${(t.valores || []).map((v) => `'${v.replace(/'/g, "''")}'`).join(', ')});`);
  for (const s of e.sequencias) l.push(`-- sequência public.${id(s.nome)} (${s.tipo}), último valor ${s.ultimo ?? 'não lido'}`);
  l.push('');
  for (const f of e.funcoes) l.push(`${f.def.trim()};`, '');
  for (const t of e.tabelas) {
    if (t.comentario) l.push(`-- ${t.comentario}`);
    l.push(`create table public.${id(t.nome)} (`);
    l.push(
      t.colunas
        .map((c) => {
          let d = `  ${id(c.nome)} ${c.tipo}`;
          if (c.gerada === 's') d += ` generated always as (${c.padrao}) stored`;
          else if (c.identidade === 'a') d += ' generated always as identity';
          else if (c.identidade === 'd') d += ' generated by default as identity';
          else if (c.padrao !== null && c.padrao !== undefined) d += ` default ${c.padrao}`;
          if (c.obrigatoria) d += ' not null';
          return d;
        })
        .join(',\n'),
    );
    l.push(');');
    for (const k of t.restricoes.filter((r) => 'puxc'.includes(r.tipo))) l.push(`alter table public.${id(t.nome)} add constraint ${id(k.nome)} ${k.def};`);
    for (const i of t.indices.filter((x) => !x.de_restricao)) l.push(`${i.def};`);
    if (t.rls) l.push(`alter table public.${id(t.nome)} enable row level security;`);
    for (const p of t.politicas) {
      l.push(`create policy ${id(p.policyname)} on public.${id(t.nome)} as ${p.permissive} for ${p.cmd} to ${(p.roles || []).join(', ')}${p.qual ? ` using (${p.qual})` : ''}${p.with_check ? ` with check (${p.with_check})` : ''};`);
    }
    for (const g of t.gatilhos) l.push(`${g.def};`);
    if (t.permissoes) l.push(`-- permissões: ${t.permissoes}`);
    l.push('');
  }
  l.push('-- Ligações entre tabelas (por último, quando todas as tabelas já existem)');
  for (const t of e.tabelas) for (const k of t.restricoes.filter((r) => r.tipo === 'f')) l.push(`alter table public.${id(t.nome)} add constraint ${id(k.nome)} ${k.def};`);
  l.push('');
  for (const v of e.visoes) l.push(`create ${v.tipo === 'm' ? 'materialized view' : 'view'} public.${id(v.nome)} as`, v.def.trim(), '');
  return `${l.join('\n')}\n`;
}

// ---------------------------------------------------------------- as cópias no disco

export function copias() {
  if (!existsSync(PASTA)) return [];
  return readdirSync(PASTA, { withFileTypes: true })
    .filter((d) => d.isDirectory() && FORMATO_DATA.test(d.name) && existsSync(join(PASTA, d.name, 'resumo.json')))
    .map((d) => d.name)
    .sort()
    .reverse();
}

export function lerResumo(data) {
  return JSON.parse(readFileSync(join(PASTA, data, 'resumo.json'), 'utf8'));
}

// Só apaga pasta com nome de data (ou de data com .parcial ou .falhou), que esteja dentro de _backup/banco.
function apagarPasta(nome) {
  if (!/^\d{4}-\d{2}-\d{2}(\.parcial|\.falhou)?$/.test(nome) && nome !== 'teste') throw new Error(`não apago ${nome}`);
  const alvo = join(PASTA, nome);
  if (!alvo.startsWith(PASTA + sep)) throw new Error(`não apago ${nome}`);
  rmSync(alvo, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
}

async function renomear(de, para) {
  for (let tentativa = 1; ; tentativa++) {
    try {
      renameSync(join(PASTA, de), join(PASTA, para));
      return;
    } catch (e) {
      // Antivírus ou um programa de sincronização podem segurar a pasta por um instante.
      if (tentativa >= 8) throw e;
      await espera(1000 * tentativa);
    }
  }
}

function anotarNoDiario(texto) {
  const arquivo = join(PASTA, 'backup.log');
  mkdirSync(PASTA, { recursive: true });
  appendFileSync(arquivo, `${new Date().toISOString()} ${texto}\n`);
  const linhas = readFileSync(arquivo, 'utf8').split('\n');
  if (linhas.length > 400) writeFileSync(arquivo, linhas.slice(-300).join('\n'));
}

// ---------------------------------------------------------------- comandos

async function fazerCopia(soTabela) {
  const inicio = Date.now();
  const data = hojeLocal();
  const avisos = [];
  mkdirSync(PASTA, { recursive: true });
  // Sobras de uma rodada que morreu no meio.
  for (const d of readdirSync(PASTA)) if (/^\d{4}-\d{2}-\d{2}\.parcial$/.test(d)) apagarPasta(d);
  const nomeDaPasta = soTabela ? 'teste' : `${data}.parcial`;
  const pasta = join(PASTA, nomeDaPasta);
  if (soTabela) apagarPasta('teste');
  mkdirSync(join(pasta, 'extras'), { recursive: true });

  // 1) A lista de tabelas desta rodada.
  let esquema = null;
  let tabelas;
  try {
    esquema = await lerCatalogo();
    tabelas = esquema.tabelas.map((t) => ({ nome: t.nome, pk: t.pk, colunas: t.colunas.map((c) => c.nome) }));
  } catch (e) {
    avisos.push(`A API de gestão não respondeu (${e.message.replace(/\s+/g, ' ').slice(0, 120)}): a lista de tabelas veio da API REST e os extras ficaram de fora.`);
    tabelas = await tabelasPelaRest();
  }
  if (soTabela) {
    tabelas = tabelas.filter((t) => t.nome === soTabela);
    if (!tabelas.length) throw new Error(`não existe a tabela ${soTabela} no public`);
  }
  if (!tabelas.length) throw new Error('o banco não mostrou nenhuma tabela');
  console.log(`projeto ${projeto}: ${tabelas.length} ${tabelas.length === 1 ? 'tabela' : 'tabelas'} para copiar`);

  // 2) Cada tabela, uma por arquivo.
  const feitas = [];
  for (const t of tabelas) {
    if (!t.pk.length) avisos.push(`A tabela ${t.nome} não tem chave primária: foi lida pulando linhas, que é menos seguro.`);
    const r = await copiarTabela(t, pasta);
    feitas.push(r);
    console.log(`  ${r.ok ? 'ok   ' : 'FALHA'} ${t.nome.padEnd(26)} ${numero(r.linhas).padStart(8)} linhas ${tamanho(r.bytes).padStart(9)}${r.tentativas > 1 ? `  (${r.tentativas} leituras)` : ''}`);
  }

  // 3) Os extras (só na cópia inteira e só se a API de gestão respondeu).
  const extras = [];
  if (!soTabela && esquema) {
    for (const x of EXTRAS) {
      try {
        const r = await copiarExtra(x, pasta);
        extras.push(r);
        if (!r.ok) avisos.push(`O extra ${x.nome} mudou durante a leitura (${r.linhas} gravadas, ${r.no_banco} no banco).`);
        console.log(`  extra ${x.nome.padEnd(26)} ${numero(r.linhas).padStart(8)} linhas ${tamanho(r.bytes).padStart(9)}`);
      } catch (e) {
        avisos.push(`O extra ${x.nome} não foi copiado: ${e.message.replace(/\s+/g, ' ').slice(0, 160)}`);
      }
    }
    const json = abrirGz(join(pasta, 'extras', 'esquema.json.gz'));
    await json.escrever(`${JSON.stringify(esquema)}\n`);
    extras.push({ nome: 'esquema-json', arquivo: 'extras/esquema.json.gz', oque: 'o esquema como o catálogo do Postgres descreve', linhas: 1, ...(await json.fechar()), ok: true });
    const sqlDoEsquema = esquemaEmSql(esquema);
    writeFileSync(join(pasta, 'extras', 'esquema.sql'), sqlDoEsquema);
    extras.push({ nome: 'esquema-sql', arquivo: 'extras/esquema.sql', oque: 'o esquema em SQL, para ler e comparar', bytes: Buffer.byteLength(sqlDoEsquema), ok: true });
    // Migration aplicada no banco que não está na pasta do repositório (ou o contrário) merece aviso.
    const pastaDasMigrations = join(raiz, 'supabase', 'migrations');
    const noRepositorio = existsSync(pastaDasMigrations) ? readdirSync(pastaDasMigrations).filter((f) => f.endsWith('.sql')).length : undefined;
    const noBanco = extras.find((x) => x.nome === 'migrations')?.linhas;
    if (noBanco !== undefined && noRepositorio !== undefined && noBanco !== noRepositorio) avisos.push(`O banco tem ${noBanco} migrations aplicadas e a pasta supabase/migrations tem ${noRepositorio}.`);
  }

  // 4) O resumo e a conferência.
  const falhas = feitas.filter((t) => !t.ok);
  const total = {
    tabelas: feitas.length,
    linhas: feitas.reduce((s, t) => s + t.linhas, 0),
    bytes: feitas.reduce((s, t) => s + t.bytes, 0) + extras.reduce((s, x) => s + (x.bytes || 0), 0),
  };
  const resumo = {
    versao: 1,
    projeto,
    data,
    em: new Date().toISOString(),
    duracao_s: Math.round((Date.now() - inicio) / 1000),
    ok: !falhas.length,
    so_tabela: soTabela || undefined,
    total,
    avisos,
    tabelas: feitas,
    extras,
  };
  writeFileSync(join(pasta, 'resumo.json'), `${JSON.stringify(resumo, null, 1)}\n`);
  for (const a of avisos) console.log(`  aviso: ${a}`);

  if (soTabela) {
    console.log(`\nTeste ${resumo.ok ? 'certo' : 'COM FALHA'}: ${numero(total.linhas)} linhas, ${tamanho(total.bytes)}, ${resumo.duracao_s} s. Ficou em _backup/banco/teste/ e não conta como cópia.`);
    if (!resumo.ok) process.exitCode = 1;
    return;
  }

  if (falhas.length) {
    // Cópia com contagem que não bate não vira a cópia do dia: fica de lado, para olhar, e não apaga nenhuma boa.
    apagarPasta(`${data}.falhou`);
    await renomear(nomeDaPasta, `${data}.falhou`);
    const quais = falhas.map((t) => `${t.nome} (${t.linhas} gravadas, ${t.no_banco} no banco)`).join(', ');
    anotarNoDiario(`FALHOU contagem não bate: ${quais}`);
    console.error(`\nA cópia NÃO vale: a contagem não bateu em ${quais}. Ficou em _backup/banco/${data}.falhou/.`);
    process.exitCode = 1;
    return;
  }

  // 5) Vira a cópia do dia (troca a de hoje, se já existia), e as mais velhas saem.
  apagarPasta(data);
  await renomear(nomeDaPasta, data);
  const todas = copias();
  const saem = todas.slice(GUARDAR);
  for (const d of saem) apagarPasta(d);
  const maisVelha = todas[Math.min(todas.length, GUARDAR) - 1];
  for (const d of readdirSync(PASTA)) if (/^\d{4}-\d{2}-\d{2}\.falhou$/.test(d) && d.slice(0, 10) < maisVelha) apagarPasta(d);

  // 6) O sinal de vida no banco: a única escrita deste arquivo. O Zelador pode ler e avisar quando a cópia parar.
  let sinal = 'gravado';
  try {
    await rest('/config?on_conflict=chave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ chave: 'backup_ultimo', valor: { em: resumo.em, tabelas: total.tabelas, linhas: total.linhas, bytes: total.bytes, avisos }, atualizado_em: resumo.em }),
    });
  } catch (e) {
    sinal = `NÃO gravado (${e.message.slice(0, 120)})`;
  }

  anotarNoDiario(`ok ${total.tabelas} tabelas, ${total.linhas} linhas, ${total.bytes} bytes, ${resumo.duracao_s} s, ${avisos.length} avisos, sinal de vida ${sinal}${saem.length ? `, saíram ${saem.join(' ')}` : ''}`);
  console.log(`\nCópia de ${data} pronta: ${total.tabelas} tabelas, ${numero(total.linhas)} linhas, ${tamanho(total.bytes)} no disco, ${resumo.duracao_s} s.`);
  console.log(`Contagem conferida em todas as tabelas. Sinal de vida ${sinal}. Cópias guardadas: ${Math.min(todas.length, GUARDAR)}${saem.length ? ` (saíram: ${saem.join(', ')})` : ''}.`);
}

function listar() {
  const todas = copias();
  if (!todas.length) {
    console.log('Ainda não existe nenhuma cópia em _backup/banco/.');
    return;
  }
  console.log('data        feita às  tabelas    linhas    tamanho  avisos');
  let soma = 0;
  for (const d of todas) {
    const r = lerResumo(d);
    soma += r.total.bytes;
    const hora = new Date(r.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    console.log(`${d}  ${hora.padEnd(8)}  ${String(r.total.tabelas).padStart(7)}  ${numero(r.total.linhas).padStart(8)}  ${tamanho(r.total.bytes).padStart(9)}  ${r.avisos.length || ''}`);
  }
  console.log(`${todas.length} ${todas.length === 1 ? 'cópia' : 'cópias'}, ${tamanho(soma)} no disco (guarda as ${GUARDAR} mais novas).`);
  const falhadas = readdirSync(PASTA).filter((d) => /^\d{4}-\d{2}-\d{2}\.falhou$/.test(d));
  if (falhadas.length) console.log(`Rodadas que falharam e ficaram de lado: ${falhadas.join(', ')}`);
}

async function conferir(data) {
  const pasta = join(PASTA, data);
  if (!existsSync(join(pasta, 'resumo.json'))) throw new Error(`não existe cópia de ${data} (veja as que existem com --listar)`);
  const resumo = lerResumo(data);
  const problemas = [];
  let linhas = 0;
  for (const item of [...resumo.tabelas, ...resumo.extras]) {
    const caminho = join(pasta, item.arquivo);
    if (!existsSync(caminho)) {
      problemas.push(`${item.arquivo}: o arquivo sumiu`);
      continue;
    }
    if (!item.arquivo.endsWith('.gz')) {
      if (statSync(caminho).size !== item.bytes) problemas.push(`${item.arquivo}: o tamanho mudou`);
      continue;
    }
    const hash = createHash('sha256');
    let n = 0;
    let estragadas = 0;
    try {
      n = await lerLinhas(
        caminho,
        (linha) => {
          try {
            const o = JSON.parse(linha);
            if (!o || typeof o !== 'object') estragadas++;
          } catch {
            estragadas++;
          }
        },
        (pedaco) => hash.update(pedaco),
      );
    } catch (e) {
      problemas.push(`${item.arquivo}: não descomprime (${e.code || e.message})`);
      continue;
    }
    linhas += n;
    if (n !== item.linhas) problemas.push(`${item.arquivo}: tem ${n} linhas e o resumo diz ${item.linhas}`);
    else if (estragadas) problemas.push(`${item.arquivo}: ${estragadas} linhas não são JSON`);
    else if (hash.digest('hex') !== item.sha256) problemas.push(`${item.arquivo}: o conteúdo mudou depois da cópia`);
  }
  const esperados = new Set([...resumo.tabelas, ...resumo.extras].map((i) => i.arquivo.replace(/^extras\//, '')));
  const aMais = [...readdirSync(pasta), ...(existsSync(join(pasta, 'extras')) ? readdirSync(join(pasta, 'extras')) : [])].filter((f) => f !== 'resumo.json' && f !== 'extras' && !esperados.has(f));
  if (aMais.length) problemas.push(`arquivo que não está no resumo: ${aMais.join(', ')}`);
  if (!resumo.ok) problemas.push('o resumo diz que a cópia não fechou a contagem');

  console.log(`Cópia de ${data}, feita em ${resumo.em}: ${resumo.tabelas.length} tabelas e ${resumo.extras.length} extras, ${numero(linhas)} linhas abertas e contadas.`);
  if (problemas.length) {
    for (const p of problemas) console.error(`  PROBLEMA ${p}`);
    console.error(`${problemas.length} ${problemas.length === 1 ? 'problema' : 'problemas'}. Esta cópia não é confiável.`);
    process.exitCode = 1;
    return;
  }
  console.log('Tudo descomprime, toda linha é JSON e as contagens e as somas de conferência batem com o resumo.');
}

// Só roda quando este arquivo é o chamado (o backup-restaurar.mjs importa as funções daqui).
if (/(^|[\\/])backup\.mjs$/i.test(process.argv[1] || '')) {
  const args = process.argv.slice(2);
  const depois = (opcao) => {
    const i = args.indexOf(opcao);
    return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : '';
  };
  try {
    if (args.includes('--listar')) listar();
    else if (args.includes('--conferir')) {
      let data = depois('--conferir');
      if (data === 'hoje') data = hojeLocal();
      if (!data) data = copias()[0] || '';
      if (!FORMATO_DATA.test(data)) throw new Error('diga a data assim: --conferir 2026-11-10 (ou faça a primeira cópia antes)');
      await conferir(data);
    } else if (args.includes('--tabela')) {
      const nome = depois('--tabela');
      if (!/^[a-z_][a-z0-9_]*$/i.test(nome)) throw new Error('diga a tabela assim: --tabela pedidos');
      await fazerCopia(nome);
    } else if (args.length) {
      throw new Error(`não conheço ${args.join(' ')}. Opções: --listar, --conferir [data], --tabela <nome>`);
    } else {
      await fazerCopia('');
    }
  } catch (e) {
    const texto = String(e.message || e).replace(/\s+/g, ' ').slice(0, 400);
    if (!args.length) {
      try {
        anotarNoDiario(`FALHOU ${texto}`);
      } catch {}
    }
    console.error(`Parei: ${texto}`);
    process.exitCode = 1;
  }
}
