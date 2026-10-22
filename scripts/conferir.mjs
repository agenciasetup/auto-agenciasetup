// Confere o site e o conector de ponta a ponta. Cria um recurso de teste pelo conector, publica,
// abre a página, arquiva e apaga no fim.
// Uso: node scripts/conferir.mjs                       (site ligado em http://localhost:8787)
//      node scripts/conferir.mjs https://agenciasetup.com.br
import { env, exige, sql } from './env.mjs';

exige('MCP_CHAVE');
const base = (process.argv[2] || 'http://localhost:8787').replace(/\/$/, '');
let falhas = 0;
const ok = (cond, msg, extra = '') => { console.log(`${cond ? 'ok   ' : 'FALHA'} ${msg}${extra ? ` (${extra})` : ''}`); if (!cond) falhas++; };

async function pagina(caminho, status = 200, contem) {
  const r = await fetch(base + caminho, { redirect: 'manual' });
  const t = await r.text();
  ok(r.status === status && (!contem || t.includes(contem)), `${caminho} responde ${status}`, r.status !== status ? `veio ${r.status}` : '');
  return t;
}

let n = 0;
async function mcp(method, params = {}, chave = env.MCP_CHAVE) {
  const r = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(chave ? { authorization: `Bearer ${chave}` } : {}) },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method, params }),
  });
  return { status: r.status, corpo: await r.json().catch(() => null) };
}
const ferramenta = async (name, args) => {
  const r = await mcp('tools/call', { name, arguments: args });
  const res = r.corpo && r.corpo.result;
  if (!res || res.isError) throw new Error(`${name}: ${res ? res.content[0].text : JSON.stringify(r.corpo)}`);
  return res.structuredContent;
};

console.log(`conferindo ${base}\n`);
const saude = await (await fetch(`${base}/api/saude`)).json();
ok(saude.banco === 'ok', 'banco responde pelo Worker');

await pagina('/', 200, 'Agência Setup');
await pagina('/recursos', 200);
await pagina('/recursos?c=automacao', 200, 'Automação');
await pagina('/novidades', 200);
await pagina('/cursos', 200);
await pagina('/privacidade', 200, 'LGPD');
await pagina('/termos', 200);
await pagina('/essa-pagina-nao-existe', 404);
await pagina('/robots.txt', 200, 'Sitemap');
await pagina('/sitemap.xml', 200, '<urlset');
await pagina('/estatico/site.css', 200, '--laranja');

const semChave = await mcp('initialize', {}, null);
ok(semChave.status === 401, 'conector recusa quem chega sem chave');
const ini = await mcp('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'conferir', version: '1' } });
ok(ini.corpo?.result?.serverInfo?.name === 'agencia-setup', 'conector abre com a chave');
const lista = await mcp('tools/list');
ok((lista.corpo?.result?.tools || []).length >= 15, 'conector lista as ferramentas', `${(lista.corpo?.result?.tools || []).length}`);
const estilo = await ferramenta('ver_estilo', {});
ok(String(estilo.guia_md || '').includes('Calango'), 'ver_estilo devolve o guia da marca');

const slug = `teste-conferir-${Date.now()}`;
let id;
try {
  const criado = await ferramenta('salvar_recurso', { titulo: 'Recurso de teste', slug, resumo: 'Criado pela conferência.', tipo: 'prompt', corpo_md: '## Como usar\n\n- passo **um**\n- passo dois', link_externo: 'https://agenciasetup.com.br', tags: ['teste'] });
  id = criado.id;
  ok(criado.status === 'rascunho', 'recurso nasce como rascunho');
  await pagina(`/recursos/${slug}`, 404);
  await ferramenta('publicar', { tipo: 'recursos', id });
  await pagina(`/recursos/${slug}`, 200, 'Recurso de teste');
  const b = await fetch(`${base}/baixar/${slug}`, { redirect: 'manual' });
  ok(b.status === 302, '/baixar redireciona para o arquivo');
  const pecas = await ferramenta('criar_pecas', { origem_tipo: 'recurso', origem_id: id, pecas: [{ rede: 'instagram', formato: 'carrossel', titulo: 'Teste', slides: [{ titulo: 'Capa' }] }, { rede: 'x', formato: 'thread', legenda: 'Teste' }] });
  ok(pecas.pecas.length === 2, 'fila das redes recebe as peças');
  await ferramenta('arquivar', { tipo: 'recursos', id });
  await pagina(`/recursos/${slug}`, 404);
} finally {
  if (id) await sql(`delete from pecas where origem_id = '${id}'; delete from recursos where id = '${id}';`);
  console.log('\nteste apagado do banco');
}

console.log(falhas ? `\n${falhas} conferência(s) falharam` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
