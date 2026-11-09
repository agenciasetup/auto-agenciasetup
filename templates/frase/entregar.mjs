// Entrega um post de frase no painel como RASCUNHO: sobe as imagens de _local/frase/<nome>/ no bucket "midia" e cria a
// peça na fila (post único ou carrossel), com a legenda e o texto alternativo de cada imagem. Não aprova, não agenda:
// quem aprova é o dono, no painel (Posts e agenda). Usa o conector em produção com a chave da casa (MCP_CHAVE).
// Uso: node templates/frase/entregar.mjs <conteudo> [<conteudo> ...] [--atualizar]
// --atualizar: sobe as imagens refeitas e troca na peça que já existe (volta para rascunho se estava aprovada).
// Grava o que criou em _local/frase/entrega.json (urls e id da peça).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '../../scripts/env.mjs';

const raiz = join(import.meta.dirname, '..', '..');
const nomes = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const atualizar = process.argv.includes('--atualizar');
if (!nomes.length) { console.log('Uso: node templates/frase/entregar.mjs <conteudo> [--atualizar]'); process.exit(1); }

let n = 0, iniciado = false;
async function mcp(method, params = {}) {
  // /mcp está em modo código (só buscar, consultar e executar); as ferramentas uma a uma continuam em /mcp/ferramentas.
  const r = await fetch('https://agenciasetup.com.br/mcp/ferramentas', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${env.MCP_CHAVE}` }, body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method, params }) });
  const t = await r.text();
  const linha = t.split('\n').find((l) => l.startsWith('data:'));
  return JSON.parse(linha ? linha.slice(5) : t);
}
async function chamar(nome, args) {
  if (!iniciado) { await mcp('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'entregar-frase', version: '1' } }); iniciado = true; }
  const r = await mcp('tools/call', { name: nome, arguments: args });
  const c = r.result && r.result.content && r.result.content[0];
  if (r.error || (r.result && r.result.isError)) throw new Error(`${nome}: ${c ? c.text : JSON.stringify(r.error)}`);
  try { return JSON.parse(c.text); } catch { return c.text; }
}
// O conteúdo é o mesmo arquivo que o modelo lê no navegador (define window.FRASE).
function lerConteudo(nome) {
  const window = {};
  new Function('window', readFileSync(join(raiz, 'templates', 'frase', 'conteudos', `${nome}.js`), 'utf8'))(window);
  return window.FRASE;
}
const limpo = (t) => String(t || '').replace(/\n/g, ' ').replace(/[[\]]/g, '').replace(/^\*/, '').replace(/\s+/g, ' ').trim();

const arqEntrega = join(raiz, '_local', 'frase', 'entrega.json');
const entrega = existsSync(arqEntrega) ? JSON.parse(readFileSync(arqEntrega, 'utf8')) : {};

for (const nome of nomes) {
  const F = lerConteudo(nome);
  const pasta = join(raiz, '_local', 'frase', nome);
  const feito = entrega[nome] || {};
  console.log(`${nome}:`);
  if (!feito.imagens || atualizar) {
    const versao = Date.now().toString(36);
    feito.imagens = [];
    for (let k = 1; k <= F.slides.length; k++) {
      const arq = join(pasta, `${String(k).padStart(2, '0')}.jpg`);
      if (!existsSync(arq)) throw new Error(`Falta ${arq}: rode node scripts/frase.mjs ${nome}`);
      const r = await chamar('enviar_arquivo', { bucket: 'midia', nome: `frase-${nome}-${versao}-${String(k).padStart(2, '0')}.jpg`, tipo: 'image/jpeg', base64: readFileSync(arq).toString('base64') });
      feito.imagens.push(r.url);
    }
    entrega[nome] = feito; writeFileSync(arqEntrega, JSON.stringify(entrega, null, 1));
    console.log(`  ${feito.imagens.length} imagens no bucket midia`);
  }
  const alt = (k) => { const s = F.slides[k]; return `${s.rotulo ? `${limpo(s.rotulo)} ` : ''}${limpo(s.texto)}`; };
  const unico = F.slides.length === 1;
  const peca = unico
    ? { formato: 'post', midias: [{ tipo: 'imagem', url: feito.imagens[0], alt: alt(0) }] }
    : { formato: 'carrossel', slides: feito.imagens.map((url, k) => ({ titulo: limpo(F.slides[k].rotulo || ''), texto: limpo(F.slides[k].texto), imagem_url: url, alt: alt(k) })) };
  if (!feito.peca_id) {
    // F.comenta: a automação do Comenta X da peça (no card de oferta, a palavra que leva ao mini curso).
    const r = await chamar('criar_pecas', { origem_tipo: 'livre', pecas: [{ rede: 'instagram', titulo: F.titulo, legenda: F.legenda, ...peca, ...(F.comenta ? { comenta: F.comenta } : {}) }] });
    const p = Array.isArray(r) ? r[0] : (r.pecas || [r])[0];
    feito.peca_id = p.id; feito.avisos = r.avisos || null;
    console.log(`  peça ${p.id} criada como rascunho${r.avisos ? ` (avisos: ${JSON.stringify(r.avisos)})` : ''}`);
  } else if (atualizar) {
    await chamar('editar_peca', { id: feito.peca_id, titulo: F.titulo, legenda: F.legenda, ...(unico ? { midias: peca.midias } : { slides: peca.slides }) });
    console.log(`  peça ${feito.peca_id} atualizada (rascunho)`);
  } else console.log(`  peça ${feito.peca_id} já existe (use --atualizar para trocar as imagens)`);
  entrega[nome] = feito; writeFileSync(arqEntrega, JSON.stringify(entrega, null, 1));
}
