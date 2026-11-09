// A lista de entregas fora da área (o Combo Black Calango, liberado na Hubla) pelo conector em produção, para o
// Claude Code usar quando a ferramenta do conector não está carregada na sessão. Mesmas ações do conector
// (entregas_pendentes e marcar_entregue), com a chave da casa do .env.local (MCP_CHAVE).
// Uso: node scripts/entregas.mjs                      lista quem falta entregar
//      node scripts/entregas.mjs marcar <pedido_id...> marca como entregue
//      node scripts/entregas.mjs removido <pedido_id...> marca quem teve o acesso tirado (reembolso)
//      node scripts/entregas.mjs desfazer <pedido_id...> volta para a lista
import { env } from './env.mjs';

if (!env.MCP_CHAVE) { console.error('Falta MCP_CHAVE no .env.local (npm run chave -- "Nome").'); process.exit(1); }
const URL_MCP = 'https://agenciasetup.com.br/mcp/ferramentas'; // sempre a produção: a lista é a das vendas de verdade
let n = 0;
async function mcp(method, params = {}) {
  const r = await fetch(URL_MCP, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${env.MCP_CHAVE}` }, body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method, params }) });
  const t = await r.text();
  const linha = t.split('\n').find((l) => l.startsWith('data:'));
  return JSON.parse(linha ? linha.slice(5) : t);
}
async function chamar(nome, args) {
  const r = await mcp('tools/call', { name: nome, arguments: args });
  const c = r.result && r.result.content && r.result.content[0];
  if (r.error || (r.result && r.result.isError)) throw new Error(c ? c.text : JSON.stringify(r.error));
  return JSON.parse(c.text);
}

await mcp('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'entregas', version: '1' } });
const [acao, ...ids] = process.argv.slice(2);
if (!acao) {
  const d = await chamar('entregas_pendentes', {});
  console.log(JSON.stringify({ total_pendentes: d.total_pendentes, entregues: d.entregues, pendentes: d.pendentes.map(({ pedido_id, numero, email, nome, vitalicio, pago_em }) => ({ pedido_id, numero, email, nome, vitalicio, pago_em })), para_remover: d.para_remover.map(({ pedido_id, email, nome }) => ({ pedido_id, email, nome })) }, null, 1));
} else if (['marcar', 'removido', 'desfazer'].includes(acao) && ids.length) {
  console.log(JSON.stringify(await chamar('marcar_entregue', { pedidos: ids, removido: acao === 'removido', desfazer: acao === 'desfazer' })));
} else {
  console.error('Uso: node scripts/entregas.mjs [marcar|removido|desfazer <pedido_id...>]');
  process.exit(1);
}
