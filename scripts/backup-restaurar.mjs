// O caminho de volta da cópia de segurança (scripts/backup.mjs). Por padrão SÓ SIMULA: nada é escrito.
// Passo a passo para a pessoa em docs/backup.md.
//
//   node scripts/backup-restaurar.mjs [data]                        simula: quantas linhas voltariam, por tabela, e em que ordem
//   node scripts/backup-restaurar.mjs [data] --comparar             simula e compara cada tabela com o banco de agora (só leitura)
//   node scripts/backup-restaurar.mjs [data] --tabela <nome>        simula uma tabela, compara com o banco e ensaia o comando (só leitura)
//   node scripts/backup-restaurar.mjs [data] --tabela <nome> --confirmo   ESCREVE no banco: devolve essa tabela, e só ela
//
// Sem data, usa a cópia mais nova. A simulação sem opção nem toca no banco: funciona até com o banco fora do ar.
//
// Como a escrita funciona (só com --tabela e --confirmo juntos):
// - Uma tabela por vez, pela chave primária: linha que não existe é criada, linha que existe e está diferente volta
//   ao valor da cópia, linha igual não é tocada. Linha que existe no banco e não está na cópia FICA COMO ESTÁ
//   (restaurar nunca apaga).
// - Vai por SQL, pela API de gestão do Supabase (o mesmo caminho das migrations), e não pela API REST: 13 tabelas têm
//   id numerado pelo banco (generated always) e a API REST não deixa gravar esse número de volta. Por SQL, o registro
//   volta com o mesmo id, e a numeração da tabela é acertada no fim para o próximo registro não repetir número.
// - Coluna calculada pelo banco (posts_redes.nota) não é escrita: o banco recalcula.
// - Tabela com ligação para outra precisa que a outra já tenha voltado: siga a ordem que a simulação mostra.
// - Em linha que volta ao valor da cópia, o "atualizado_em" fica com a hora da restauração (o banco marca sozinho).
//
// Nunca imprime conteúdo de linha: só nome de tabela e contagem.
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { gestao, projeto } from './env.mjs';
import { FORMATO_DATA, PASTA, contar, copias, lerCatalogo, lerLinhas, lerResumo, lerSql, numero } from './backup.mjs';

const LOTE_LINHAS = 500; // linhas por comando
const LOTE_BYTES = 600_000; // e, no máximo, este tanto de texto por comando

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
const id = (n) => `"${String(n).replace(/"/g, '""')}"`;
// O detalhe do erro do banco pode trazer dado de cliente ("Key (email)=(...)"): fica só a primeira parte.
const semDetalhe = (e) => String(e.message || e).split(/\\nDETAIL|\nDETAIL|\\nCONTEXT|\nCONTEXT/)[0].replace(/\s+/g, ' ').slice(0, 300);

// A API de gestão aceita um número limitado de pedidos por minuto: quando reclama (429), espera e repete.
async function comCalma(fazer) {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await fazer();
    } catch (e) {
      if (!/\(429\)/.test(e.message) || tentativa >= 6) throw e;
      await espera(15_000);
    }
  }
}

// ---------------------------------------------------------------- ler a cópia

async function linhasDaCopia(data, item) {
  const linhas = [];
  await lerLinhas(join(PASTA, data, item.arquivo), (l) => linhas.push(l));
  if (linhas.length !== item.linhas) throw new Error(`${item.arquivo} tem ${linhas.length} linhas e o resumo diz ${item.linhas}: confira a cópia com node scripts/backup.mjs --conferir ${data}`);
  return linhas;
}

// O esquema guardado na cópia (para a ordem das tabelas mesmo com o banco fora do ar).
async function esquemaDaCopia(data) {
  const caminho = join(PASTA, data, 'extras', 'esquema.json.gz');
  if (!existsSync(caminho)) return null;
  let texto = '';
  await lerLinhas(caminho, (l) => (texto += l));
  return JSON.parse(texto);
}

// Pais antes dos filhos: a tabela que outras apontam volta primeiro. Devolve a lista em ordem e as que
// ficaram presas num ciclo (uma aponta para a outra e vice-versa), que precisam de cuidado à mão.
function ordemDeVolta(nomes, esquema) {
  if (!esquema) return { ordem: [...nomes], ciclo: [], semEsquema: true };
  const existe = new Set(nomes);
  const pais = new Map(nomes.map((n) => [n, new Set()]));
  for (const t of esquema.tabelas) {
    if (!existe.has(t.nome)) continue;
    for (const r of t.restricoes) {
      const para = r.tipo === 'f' && r.para ? r.para.replace(/^public\./, '').replace(/"/g, '') : '';
      if (para && para !== t.nome && existe.has(para)) pais.get(t.nome).add(para);
    }
  }
  const ordem = [];
  const falta = new Set(nomes);
  for (;;) {
    const livres = [...falta].filter((n) => [...pais.get(n)].every((p) => !falta.has(p))).sort();
    if (!livres.length) break;
    for (const n of livres) {
      ordem.push(n);
      falta.delete(n);
    }
  }
  return { ordem, ciclo: [...falta].sort(), semEsquema: false };
}

// ---------------------------------------------------------------- montar os comandos

// O que dá para devolver: as colunas que existem na cópia e no banco de agora, menos as calculadas pelo banco.
function plano(tabela, linhas, estrutura) {
  if (!estrutura) throw new Error(`a tabela ${tabela} não existe no banco de agora. Num banco novo, rode as migrations antes (npm run migrar).`);
  if (!estrutura.pk.length) throw new Error(`a tabela ${tabela} não tem chave primária: não dá para devolver linha por linha`);
  const naCopia = new Set(linhas.length ? Object.keys(JSON.parse(linhas[0])) : estrutura.colunas.map((c) => c.nome));
  const doBanco = estrutura.colunas.filter((c) => c.gerada !== 's');
  const colunas = doBanco.filter((c) => naCopia.has(c.nome));
  const nomes = new Set(colunas.map((c) => c.nome));
  for (const c of estrutura.pk) if (!nomes.has(c)) throw new Error(`a cópia de ${tabela} não tem a coluna da chave (${c})`);
  const avisos = [];
  const somem = [...naCopia].filter((c) => !estrutura.colunas.some((x) => x.nome === c));
  const novas = doBanco.filter((c) => !naCopia.has(c.nome)).map((c) => c.nome);
  if (somem.length) avisos.push(`coluna da cópia que não existe mais no banco e fica de fora: ${somem.join(', ')}`);
  if (novas.length) avisos.push(`coluna nova no banco que a cópia não tem e fica como está: ${novas.join(', ')}`);
  return {
    tabela,
    pk: estrutura.pk,
    colunas,
    // Na linha que já existe: tudo menos a chave e o número que o banco não deixa mudar (generated always).
    atualizar: colunas.filter((c) => !estrutura.pk.includes(c.nome) && c.identidade !== 'a'),
    numeradas: colunas.filter((c) => c.identidade === 'a' || c.identidade === 'd' || /^nextval\(/.test(c.padrao || '')).map((c) => c.nome),
    avisos,
  };
}

function lotes(linhas) {
  const saida = [];
  let atual = [];
  let bytes = 0;
  for (const l of linhas) {
    if (atual.length && (atual.length >= LOTE_LINHAS || bytes + l.length > LOTE_BYTES)) {
      saida.push(atual);
      atual = [];
      bytes = 0;
    }
    atual.push(l);
    bytes += l.length;
  }
  if (atual.length) saida.push(atual);
  return saida;
}

// As linhas do lote viram registros do tipo da tabela dentro do próprio banco (jsonb_populate_recordset),
// que converte cada valor para o tipo da coluna. O texto vai entre marcas que não aparecem no conteúdo.
function origem(p, lote) {
  const corpo = `[${lote.join(',')}]`;
  let marca;
  do marca = `$c${randomBytes(6).toString('hex')}$`;
  while (corpo.includes(marca));
  return `jsonb_populate_recordset(null::public.${id(p.tabela)}, ${marca}${corpo}${marca}::jsonb)`;
}

// Coluna do tipo json não tem comparação de igualdade no Postgres: compara como texto.
const lado = (apelido, c) => `${apelido}.${id(c.nome)}${c.tipo === 'json' ? '::text' : ''}`;
const fileira = (apelido, colunas) => `row(${colunas.map((c) => lado(apelido, c)).join(', ')})`;

function sqlComparar(p, lote) {
  const junta = p.pk.map((c) => `a.${id(c)} = c.${id(c)}`).join(' and ');
  const existe = `a.${id(p.pk[0])} is not null`;
  const igual = p.atualizar.length ? `${existe} and ${fileira('a', p.atualizar)} is not distinct from ${fileira('c', p.atualizar)}` : existe;
  return `select count(*)::int as lote, count(*) filter (where not (${existe}))::int as faltam, count(*) filter (where ${igual})::int as iguais
from ${origem(p, lote)} c left join public.${id(p.tabela)} a on ${junta}`;
}

function sqlEscrever(p, lote) {
  const lista = p.colunas.map((c) => id(c.nome)).join(', ');
  const conflito = p.atualizar.length
    ? `do update set ${p.atualizar.map((c) => `${id(c.nome)} = excluded.${id(c.nome)}`).join(', ')} where ${fileira('alvo', p.atualizar)} is distinct from ${fileira('excluded', p.atualizar)}`
    : 'do nothing';
  return `with escrita as (
  insert into public.${id(p.tabela)} as alvo (${lista})
  overriding system value
  select ${lista} from ${origem(p, lote)}
  on conflict (${p.pk.map(id).join(', ')}) ${conflito}
  returning (xmax = 0) as criada
)
select count(*) filter (where criada)::int as criadas, count(*) filter (where not criada)::int as atualizadas from escrita`;
}

// Depois de devolver ids numerados, a numeração da tabela anda até o maior número, para o próximo não repetir.
const sequencia = (p, coluna) => `pg_get_serial_sequence('public.${id(p.tabela)}', '${coluna.replace(/'/g, "''")}')::regclass`;
const maiorNumero = (p, coluna) => `greatest(coalesce((select max(${id(coluna)}) from public.${id(p.tabela)}), 0), coalesce(pg_sequence_last_value(${sequencia(p, coluna)}), 0), 1)`;

// ---------------------------------------------------------------- simular

async function compararTabela(data, item, estruturas) {
  const linhas = await linhasDaCopia(data, item);
  const p = plano(item.nome, linhas, estruturas.get(item.nome));
  let faltam = 0;
  let iguais = 0;
  for (const lote of lotes(linhas)) {
    const [r] = await comCalma(() => lerSql(sqlComparar(p, lote)));
    if (r.lote !== lote.length) throw new Error(`o banco leu ${r.lote} linhas de um lote de ${lote.length} em ${item.nome}`);
    faltam += r.faltam;
    iguais += r.iguais;
  }
  const noBanco = await contar(item.nome);
  return { p, linhas, naCopia: linhas.length, iguais, faltam, diferentes: linhas.length - iguais - faltam, soNoBanco: noBanco - (linhas.length - faltam) };
}

// Manda o banco só planejar o comando de escrita (explain, sem executar) numa transação que não aceita escrita.
// Se o comando estivesse mal formado (coluna que não existe, chave errada), o erro apareceria aqui.
async function ensaiar(p, lote) {
  try {
    await comCalma(() => lerSql(`explain ${sqlEscrever(p, lote)}`));
    return 'o banco aceitou a forma do comando de escrita (planejou sem executar)';
  } catch (e) {
    // O usuário só de leitura não tem permissão de escrita na tabela: o banco entende o comando inteiro e para aí.
    if (/42501|permission denied/.test(e.message)) return 'o banco entendeu o comando de escrita e parou na permissão, como deve ser numa leitura';
    throw new Error(`o comando de escrita de ${p.tabela} não passou no ensaio: ${semDetalhe(e)}`);
  }
}

async function simular(data, resumo, { comparar, soTabela }) {
  const esquema = await esquemaDaCopia(data);
  let itens = resumo.tabelas;
  if (soTabela) {
    itens = itens.filter((t) => t.nome === soTabela);
    if (!itens.length) throw new Error(`a cópia de ${data} não tem a tabela ${soTabela}`);
  }
  const { ordem, ciclo, semEsquema } = ordemDeVolta(resumo.tabelas.map((t) => t.nome), esquema);
  const posicao = new Map([...ordem, ...ciclo].map((n, i) => [n, i + 1]));
  itens = [...itens].sort((a, b) => posicao.get(a.nome) - posicao.get(b.nome));

  const olhaOBanco = comparar || !!soTabela;
  let estruturas = null;
  if (olhaOBanco) estruturas = new Map((await lerCatalogo()).tabelas.map((t) => [t.nome, t]));

  console.log(`SIMULAÇÃO: nada é escrito. Cópia de ${data}, feita em ${new Date(resumo.em).toLocaleString('pt-BR')}.`);
  if (resumo.projeto !== projeto) console.log(`Atenção: a cópia veio do projeto ${resumo.projeto} e o banco de agora é o ${projeto}.`);
  console.log(olhaOBanco ? '\nordem  tabela                      na cópia    iguais  diferentes  faltam no banco  só no banco' : '\nordem  tabela                      linhas que voltariam  chave');

  const soma = { naCopia: 0, iguais: 0, diferentes: 0, faltam: 0, soNoBanco: 0 };
  const avisos = [];
  let ensaio = '';
  for (const item of itens) {
    const n = String(posicao.get(item.nome)).padStart(4);
    if (!olhaOBanco) {
      const linhas = await linhasDaCopia(data, item);
      soma.naCopia += linhas.length;
      console.log(`${n}   ${item.nome.padEnd(26)} ${numero(linhas.length).padStart(21)}  ${item.pk.join(', ') || 'SEM CHAVE'}`);
      continue;
    }
    let r;
    try {
      r = await compararTabela(data, item, estruturas);
    } catch (e) {
      avisos.push(`${item.nome}: ${semDetalhe(e)}`);
      console.log(`${n}   ${item.nome.padEnd(26)} não deu para comparar (veja os avisos)`);
      continue;
    }
    for (const k of Object.keys(soma)) soma[k] += r[k];
    for (const a of r.p.avisos) avisos.push(`${item.nome}: ${a}`);
    console.log(`${n}   ${item.nome.padEnd(26)} ${numero(r.naCopia).padStart(9)} ${numero(r.iguais).padStart(9)} ${numero(r.diferentes).padStart(11)} ${numero(r.faltam).padStart(16)} ${numero(r.soNoBanco).padStart(12)}`);
    if (soTabela && r.linhas.length) ensaio = await ensaiar(r.p, lotes(r.linhas)[0]);
  }

  if (!olhaOBanco) {
    console.log(`\n${itens.length} tabelas, ${numero(soma.naCopia)} linhas voltariam se a cópia inteira fosse devolvida, na ordem acima.`);
  } else {
    console.log(`\n${itens.length} ${itens.length === 1 ? 'tabela' : 'tabelas'}: ${numero(soma.naCopia)} linhas na cópia. Voltariam ${numero(soma.diferentes + soma.faltam)}: ${numero(soma.diferentes)} que mudaram depois da cópia (voltam ao valor antigo) e ${numero(soma.faltam)} que não existem mais no banco (são recriadas).`);
    console.log(`${numero(soma.iguais)} já estão iguais e não seriam tocadas. ${numero(soma.soNoBanco)} linhas só existem no banco (criadas depois da cópia) e ficariam como estão.`);
  }
  if (ensaio) console.log(`Ensaio: ${ensaio}.`);
  if (semEsquema) console.log('Esta cópia não tem o retrato do esquema: a ordem acima é só alfabética.');
  if (ciclo.length) console.log(`Tabelas que apontam uma para a outra em círculo (devolver com cuidado, pedindo ajuda): ${ciclo.join(', ')}`);
  for (const a of avisos) console.log(`aviso: ${a}`);
  if (soTabela) console.log(`\nPara escrever de verdade só esta tabela: node scripts/backup-restaurar.mjs ${data} --tabela ${soTabela} --confirmo`);
  else console.log('\nPara ver uma tabela de perto: --tabela <nome>. Escrever é sempre uma tabela por vez, com --tabela <nome> --confirmo.');
}

// ---------------------------------------------------------------- escrever (só com --tabela e --confirmo)

async function escrever(data, resumo, tabela) {
  const item = resumo.tabelas.find((t) => t.nome === tabela);
  if (!item) throw new Error(`a cópia de ${data} não tem a tabela ${tabela}`);
  if (!resumo.ok || !item.ok) throw new Error(`a cópia de ${data} não fechou a contagem de ${tabela}: não uso para restaurar`);
  const estruturas = new Map((await lerCatalogo()).tabelas.map((t) => [t.nome, t]));
  const linhas = await linhasDaCopia(data, item);
  const p = plano(tabela, linhas, estruturas.get(tabela));

  console.log(`ESCREVENDO no banco ${projeto}: tabela ${tabela}, cópia de ${data} (${numero(linhas.length)} linhas).`);
  if (resumo.projeto !== projeto) console.log(`Atenção: a cópia veio do projeto ${resumo.projeto}.`);
  for (const a of p.avisos) console.log(`aviso: ${a}`);

  let criadas = 0;
  let atualizadas = 0;
  const partes = lotes(linhas);
  for (let i = 0; i < partes.length; i++) {
    let r;
    try {
      [r] = await comCalma(() => gestao('/database/query', { method: 'POST', body: JSON.stringify({ query: sqlEscrever(p, partes[i]) }) }));
    } catch (e) {
      throw new Error(`parou no lote ${i + 1} de ${partes.length} (os anteriores já entraram; rodar de novo é seguro): ${semDetalhe(e)}`);
    }
    criadas += r.criadas;
    atualizadas += r.atualizadas;
    console.log(`  lote ${i + 1} de ${partes.length}: ${partes[i].length} linhas, ${r.criadas} criadas, ${r.atualizadas} que voltaram ao valor da cópia`);
  }
  for (const coluna of p.numeradas) {
    await comCalma(() => gestao('/database/query', { method: 'POST', body: JSON.stringify({ query: `select setval(${sequencia(p, coluna)}, ${maiorNumero(p, coluna)})` }) }));
    console.log(`  numeração de ${coluna} acertada`);
  }
  const depois = await compararTabela(data, item, estruturas);
  console.log(`\nPronto: ${numero(criadas)} linhas recriadas e ${numero(atualizadas)} que voltaram ao valor da cópia.`);
  console.log(`Conferência: das ${numero(depois.naCopia)} linhas da cópia, ${numero(depois.iguais)} estão iguais no banco, ${numero(depois.diferentes)} diferentes e ${numero(depois.faltam)} faltando. ${numero(depois.soNoBanco)} linhas só existem no banco e não foram tocadas.`);
  if (depois.diferentes || depois.faltam) process.exitCode = 1;
}

// ---------------------------------------------------------------- comando

const args = process.argv.slice(2);
try {
  const conhecidas = ['--comparar', '--tabela', '--confirmo'];
  const i = args.indexOf('--tabela');
  const tabela = i >= 0 ? args[i + 1] || '' : '';
  if (i >= 0 && !/^[a-z_][a-z0-9_]*$/i.test(tabela)) throw new Error('diga a tabela assim: --tabela pedidos');
  const soltos = args.filter((a, n) => !conhecidas.includes(a) && !(i >= 0 && n === i + 1));
  const estranhos = soltos.filter((a) => !FORMATO_DATA.test(a));
  if (estranhos.length || soltos.length > 1) throw new Error(`não entendi ${(estranhos.length ? estranhos : soltos).join(' ')}. Uso: node scripts/backup-restaurar.mjs [AAAA-MM-DD] [--comparar] [--tabela <nome> [--confirmo]]`);
  const data = soltos[0] || copias()[0];
  if (!data) throw new Error('ainda não existe nenhuma cópia em _backup/banco/ (faça uma com node scripts/backup.mjs)');
  if (!existsSync(join(PASTA, data, 'resumo.json'))) throw new Error(`não existe cópia de ${data} (veja as que existem com node scripts/backup.mjs --listar)`);
  const resumo = lerResumo(data);

  if (args.includes('--confirmo')) {
    if (!tabela) throw new Error('escrever é uma tabela por vez: --tabela <nome> --confirmo. Sem --confirmo, é só simulação.');
    await escrever(data, resumo, tabela);
  } else {
    await simular(data, resumo, { comparar: args.includes('--comparar'), soTabela: tabela });
  }
} catch (e) {
  console.error(`Parei: ${semDetalhe(e)}`);
  process.exitCode = 1;
}
