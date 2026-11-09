// Chama uma ferramenta do conector do Claude em produção (https://agenciasetup.com.br/mcp/ferramentas, uma ferramenta por
// operação; o /mcp é o modo código desde 09/11/2026) com a chave da casa
// (MCP_CHAVE do .env.local). Serve para as tarefas agendadas quando o conector do app ainda está com a lista antiga de
// ferramentas (ele guarda a lista de quando foi conectado). A chave nunca é impressa.
//   node scripts/conector.mjs <ferramenta> '<json dos argumentos>'
//   node scripts/conector.mjs followup_lista '{"fase":"na_hora"}'
//   node scripts/conector.mjs --listar        (os nomes das ferramentas)
// No PowerShell o JSON perde as aspas: rode pelo bash ou passe o JSON num arquivo com --arquivo <caminho>.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { raiz } from './env.mjs';

const env = readFileSync(join(raiz, '.env.local'), 'utf8');
const chave = (env.match(/^\s*MCP_CHAVE\s*=\s*"?([^"\r\n]+)"?/m) || [])[1];
if (!chave) { console.error('Falta MCP_CHAVE no .env.local (npm run chave -- "Nome").'); process.exit(1); }
const site = process.env.SITE || 'https://agenciasetup.com.br';

async function rpc(method, params) {
  const r = await fetch(`${site}/mcp/ferramentas`, {
    method: 'POST',
    headers: { authorization: `Bearer ${chave}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const j = await r.json().catch(() => null);
  if (!j) { console.error(`O conector respondeu ${r.status} sem JSON.`); process.exit(1); }
  if (j.error) { console.error(JSON.stringify(j.error)); process.exit(1); }
  return j.result;
}

const a = process.argv.slice(2);
if (a[0] === '--listar') {
  const r = await rpc('tools/list', {});
  console.log(r.tools.map((t) => t.name).join('\n'));
} else if (a[0]) {
  const i = a.indexOf('--arquivo');
  const texto = i >= 0 ? readFileSync(a[i + 1], 'utf8') : a[1] || '{}';
  const r = await rpc('tools/call', { name: a[0], arguments: JSON.parse(texto) });
  const t = (r.content && r.content[0] && r.content[0].text) || '';
  if (r.isError) { console.error(t); process.exit(1); }
  console.log(t);
} else {
  console.error("Uso: node scripts/conector.mjs <ferramenta> '<json>'  |  --listar");
  process.exit(1);
}
