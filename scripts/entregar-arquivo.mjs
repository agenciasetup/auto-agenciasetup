// A entrega dos arquivos com licença (a Família Calango), para o Mac ou qualquer computador com este repositório e a
// chave do conector (MCP_CHAVE no .env.local). Não precisa de chave do banco: o zip sobe por um link de envio que vence
// (arquivo_link_envio) e o "pronto" manda ao comprador o e-mail com o link da tela de download. Roteiro completo em
// docs/entrega-familia-calango.md. A cópia identificada (montar.py) é feita antes, fora deste script.
// Uso: node scripts/entregar-arquivo.mjs                                  lista quem espera a cópia
//      node scripts/entregar-arquivo.mjs enviar <pedido_id> <arquivo.zip>  sobe o zip e marca pronto (manda o e-mail)
// Opções: --site http://127.0.0.1:8792 (teste no computador), --teste (inclui pedidos de teste), --sem-email (só marca)
import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { env } from './env.mjs';

const args = process.argv.slice(2);
const opcao = (n) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : null; };
const marca = (n) => { const i = args.indexOf(n); if (i < 0) return false; args.splice(i, 1); return true; };
const site = (opcao('--site') || 'https://agenciasetup.com.br').replace(/\/+$/, '');
const teste = marca('--teste');
const semEmail = marca('--sem-email');
if (!env.MCP_CHAVE) { console.error('Falta MCP_CHAVE no .env.local (uma chave do conector, criada no painel em Claude).'); process.exit(1); }

let n = 0;
async function mcp(method, params = {}) {
  const r = await fetch(`${site}/mcp/ferramentas`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${env.MCP_CHAVE}` }, body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method, params }) });
  const t = await r.text();
  const linha = t.split('\n').find((l) => l.startsWith('data:'));
  return JSON.parse(linha ? linha.slice(5) : t);
}
async function chamar(nome, a) {
  const r = await mcp('tools/call', { name: nome, arguments: a });
  const c = r.result && r.result.content && r.result.content[0];
  if (r.error || (r.result && r.result.isError)) throw new Error(c ? c.text : JSON.stringify(r.error));
  return JSON.parse(c.text);
}

await mcp('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'entregar-arquivo', version: '1' } });
const [acao, pedido, zip] = args;
if (!acao) {
  const d = await chamar('arquivos_pendentes', { teste });
  console.log(JSON.stringify({ total_pendentes: d.total_pendentes, prontos: d.prontos, pendentes: d.pendentes }, null, 1));
} else if (acao === 'enviar' && pedido && zip) {
  if (!/\.zip$/i.test(zip)) throw new Error('Mande o arquivo .zip da cópia identificada.');
  const bytes = statSync(zip).size;
  if (!bytes) throw new Error('O zip está vazio.');
  const l = await chamar('arquivo_link_envio', { pedido_id: pedido });
  const r = await fetch(l.envio_url, { method: 'PUT', headers: { 'content-type': 'application/zip', 'x-upsert': 'true' }, body: readFileSync(zip) });
  if (!r.ok) throw new Error(`O envio do zip falhou (${r.status}): ${(await r.text()).slice(0, 200)}`);
  const p = await chamar('arquivo_pronto', { pedido_id: pedido, caminho: l.caminho, sem_email: semEmail, nota: `zip ${basename(zip)}` });
  console.log(JSON.stringify({ pedido: p.numero, subiu: `${(bytes / 1048576).toFixed(1)} MB`, email_enviado: p.email_enviado, tela: p.tela }));
} else {
  console.error('Uso: node scripts/entregar-arquivo.mjs [enviar <pedido_id> <arquivo.zip>] [--site <url>] [--teste] [--sem-email]');
  process.exit(1);
}
