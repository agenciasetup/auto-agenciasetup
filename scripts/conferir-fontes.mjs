// Ensaio da porta das fontes do site (worker/lib/fontes-site.js), sem servidor e sem banco.
// Monta pedidos de mentira, com um env.ASSETS falso, e confere cada regra. Confere também que nenhum arquivo
// de public/_f/ leva o nome da família por dentro (em texto simples nem em UTF-16).
// Uso: node scripts/conferir-fontes.mjs
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fonteDoSite } from '../worker/lib/fontes-site.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = join(RAIZ, 'public', '_f');

// O ASSETS falso devolve uns bytes para qualquer arquivo pedido.
const assets = { fetch: async () => new Response(new Uint8Array([0x77, 0x4f, 0x46, 0x32]), { status: 200 }) };
const PRODUCAO = { ASSETS: assets };
const COMPUTADOR = { ASSETS: assets, AMBIENTE: 'local' };

const BASE = 'https://agenciasetup.com.br';
const pedido = (caminho, cab = {}, base = BASE) => new Request(base + caminho, { headers: cab });
const doSite = { 'Sec-Fetch-Dest': 'font', Referer: 'https://agenciasetup.com.br/estatico/site.css' };

const casos = [
  ['fonte pedida pelo nosso site', pedido('/_f/r4t9w.woff2', doSite), PRODUCAO, 200],
  ['fonte pedida pelo site em inglês', pedido('/_f/q5j2d.woff2', { 'Sec-Fetch-Dest': 'font', Referer: 'https://agenciasetup.com/estatico/site.css' }, 'https://agenciasetup.com'), PRODUCAO, 200],
  ['fonte pedida pelo curso. (subdomínio)', pedido('/_f/b2n8x.woff2', { 'Sec-Fetch-Dest': 'font', Origin: 'https://curso.agenciasetup.com.br' }), PRODUCAO, 200],
  ['link direto no navegador (document)', pedido('/_f/r4t9w.woff2', { 'Sec-Fetch-Dest': 'document', Referer: 'https://agenciasetup.com.br/' }), PRODUCAO, 403],
  ['sem cabeçalho nenhum (curl, robô)', pedido('/_f/r4t9w.woff2'), PRODUCAO, 403],
  ['outro site no Referer', pedido('/_f/r4t9w.woff2', { 'Sec-Fetch-Dest': 'font', Referer: 'https://copiador.com/pagina' }), PRODUCAO, 403],
  ['outro site no Origin', pedido('/_f/r4t9w.woff2', { 'Sec-Fetch-Dest': 'font', Origin: 'https://agenciasetup.com.br.copiador.com' }), PRODUCAO, 403],
  ['nosso domínio sem https', pedido('/_f/r4t9w.woff2', { 'Sec-Fetch-Dest': 'font', Referer: 'http://agenciasetup.com.br/' }), PRODUCAO, 403],
  ['arquivo que não existe', pedido('/_f/xxxxx.woff2', doSite), PRODUCAO, 404],
  ['tentativa de subir pasta', pedido('/_f/..%2F..%2Fwrangler.jsonc', doSite), PRODUCAO, 404],
  ['POST no lugar de GET', new Request(BASE + '/_f/r4t9w.woff2', { method: 'POST', headers: doSite }), PRODUCAO, 405],
  ['localhost no computador (com AMBIENTE)', pedido('/_f/r4t9w.woff2', { 'Sec-Fetch-Dest': 'font', Referer: 'http://localhost:8787/estatico/site.css' }, 'http://localhost:8787'), COMPUTADOR, 200],
  ['127.0.0.1 no computador (com AMBIENTE)', pedido('/_f/m1v7c.woff2', { 'Sec-Fetch-Dest': 'font', Referer: 'http://127.0.0.1:8787/' }, 'http://127.0.0.1:8787'), COMPUTADOR, 200],
  ['localhost em produção (sem AMBIENTE)', pedido('/_f/r4t9w.woff2', { 'Sec-Fetch-Dest': 'font', Referer: 'http://localhost:8787/estatico/site.css' }, 'http://localhost:8787'), PRODUCAO, 403],
];

let falhas = 0;
for (const [nome, req, env, esperado] of casos) {
  const r = await fonteDoSite(req, env, new URL(req.url));
  let ok = r.status === esperado;
  let extra = '';
  if (r.status === 200) {
    const h = r.headers;
    const certos = h.get('content-type') === 'font/woff2' && h.get('cross-origin-resource-policy') === 'same-site'
      && h.get('x-content-type-options') === 'nosniff' && h.get('cache-control') === 'private, max-age=2592000'
      && /Origin/.test(h.get('vary') || '') && /Sec-Fetch-Dest/.test(h.get('vary') || '') && !h.has('access-control-allow-origin');
    if (!certos) { ok = false; extra = ' (cabeçalhos errados)'; }
  }
  if (!ok) falhas++;
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${String(r.status).padEnd(3)} ${nome}${ok ? '' : ` (esperado ${esperado})`}${extra}`);
}

// Os arquivos de verdade: nenhum leva o nome da família por dentro.
const PALAVRA = 'calango';
const formas = [Buffer.from(PALAVRA, 'latin1'), Buffer.from(PALAVRA, 'utf16le'), Buffer.from(PALAVRA, 'utf16le').swap16()];
if (!existsSync(PASTA)) { console.log('FALHA public/_f/ não existe (rode o _local/fontes-site/gerar.py)'); falhas++; }
else {
  for (const arq of readdirSync(PASTA).sort()) {
    const bruto = readFileSync(join(PASTA, arq));
    // Busca sem diferença de maiúscula: baixa só as letras A-Z do arquivo antes de procurar.
    const baixo = Buffer.from(bruto.map((b) => (b >= 0x41 && b <= 0x5a ? b + 32 : b)));
    const achou = formas.some((f) => baixo.includes(f));
    if (achou) falhas++;
    console.log(`${achou ? 'FALHA' : 'ok   '} ${arq} (${bruto.length} bytes) ${achou ? 'tem o nome da família dentro' : 'sem o nome da família'}`);
  }
}

// A lista do CSS compartilhado (public/estatico/tipos.css): cada arquivo citado existe na pasta e a porta entrega;
// cada arquivo da pasta é citado (nada sobrando).
const TIPOS = join(RAIZ, 'public', 'estatico', 'tipos.css');
const css = readFileSync(TIPOS, 'utf8');
const citados = [...new Set([...css.matchAll(/\/_f\/([a-z0-9]+\.woff2)/g)].map((m) => m[1]))];
const naPasta = existsSync(PASTA) ? readdirSync(PASTA) : [];
for (const arq of citados) {
  const r = await fonteDoSite(pedido(`/_f/${arq}`, { 'Sec-Fetch-Dest': 'font', Referer: 'https://agenciasetup.com.br/estatico/tipos.css' }), PRODUCAO, new URL(`${BASE}/_f/${arq}`));
  const ok = r.status === 200 && naPasta.includes(arq);
  if (!ok) falhas++;
  console.log(`${ok ? 'ok   ' : 'FALHA'} tipos.css cita ${arq}: porta ${r.status}, ${naPasta.includes(arq) ? 'arquivo na pasta' : 'SEM o arquivo na pasta'}`);
}
for (const arq of naPasta.filter((a) => !citados.includes(a))) { falhas++; console.log(`FALHA ${arq} está na pasta e não está em tipos.css`); }

// Nos arquivos que vão para o site, nem a palavra da família nem as fontes antigas da agência.
const PAGINAS = ['public/estatico/tipos.css', 'public/estatico/site.css', 'public/estatico/venda.css', 'worker/render/casca.js',
  'worker/render/venda.js', 'worker/render/publico.js', 'worker/render/legal-en.js', 'worker/render/recurso-en.js', 'worker/lib/fontes-site.js'];
const ANTIGAS = /Inter Tight|Inter\+Tight|family=Inter\b|['"]Inter['"]|\bInter,|Instrument[ +]Serif|Mrs[ +]Saint[ +]Delafield/;
for (const p of PAGINAS) {
  const txt = readFileSync(join(RAIZ, p), 'utf8');
  // Comentário pode contar a história ("era a Inter Tight"); só o código conta.
  const codigo = txt.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  // A palavra da família não pode aparecer nos CSS nem na porta; nas páginas, só nas linhas de fonte (o Calango
  // mascote e o Combo Black Calango são conteúdo da página, não nome de fonte).
  const deFonte = p.endsWith('.css') || p.endsWith('fontes-site.js') ? txt : txt.split('\n').filter((l) => /font|tipos\.css|\/_f\//i.test(l)).join('\n');
  const temNome = /calango/i.test(deFonte);
  const antiga = codigo.match(ANTIGAS);
  if (temNome || antiga) falhas++;
  console.log(`${temNome || antiga ? 'FALHA' : 'ok   '} ${p}${temNome ? ' tem o nome da família' : ''}${antiga ? ` ainda usa ${antiga[0]}` : ''}`);
}

console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
