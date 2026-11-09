// Entrega um carrossel no painel como RASCUNHO: sobe os slides de _local/carrossel/<nome>/ no bucket "midia", grava o
// recurso (rascunho) e cria a peça na fila com o Comenta X. Não aprova, não agenda, não publica: quem aprova é o dono.
// Lê o conteúdo em templates/carrossel/conteudos/<nome>.js e a ficha em _local/carrossel/<nome>/peca.json:
// { "titulo", "legenda", "perfil" ("br" ou "en"), "recurso": { campos do salvar_recurso }, "comenta": { palavra, nome, modo, variantes } }
// Uso: node templates/carrossel/entregar.mjs <nome> [--simular] [--atualizar]
// --simular: confere os arquivos e mostra o que faria, sem gravar nada.
// --atualizar: sobe os slides refeitos e troca no recurso e na peça que já existem.
// Grava o que criou em _local/carrossel/<nome>/entrega.json: rodar de novo não duplica.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '../../scripts/env.mjs';

const raiz = join(import.meta.dirname, '..', '..');
const nome = process.argv.slice(2).find((a) => !a.startsWith('--'));
const simular = process.argv.includes('--simular');
const atualizar = process.argv.includes('--atualizar');
if (!nome) { console.log('Uso: node templates/carrossel/entregar.mjs <nome> [--simular] [--atualizar]'); process.exit(1); }

let n = 0, iniciado = false;
async function mcp(method, params = {}) {
  const r = await fetch('https://agenciasetup.com.br/mcp/ferramentas', { // /mcp é o modo código desde 09/11/2026
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${env.MCP_CHAVE}` }, body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method, params }) });
  const t = await r.text();
  const linha = t.split('\n').find((l) => l.startsWith('data:'));
  return JSON.parse(linha ? linha.slice(5) : t);
}
async function chamar(ferramenta, args) {
  if (!iniciado) { await mcp('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'entregar-carrossel', version: '1' } }); iniciado = true; }
  const r = await mcp('tools/call', { name: ferramenta, arguments: args });
  const c = r.result && r.result.content && r.result.content[0];
  if (r.error || (r.result && r.result.isError)) throw new Error(`${ferramenta}: ${c ? c.text : JSON.stringify(r.error)}`);
  try { return JSON.parse(c.text); } catch { return c.text; }
}

const pasta = join(raiz, '_local', 'carrossel', nome);
const arqFicha = join(pasta, 'peca.json');
if (!existsSync(arqFicha)) throw new Error(`Falta ${arqFicha}`);
const P = JSON.parse(readFileSync(arqFicha, 'utf8'));
// Post de venda (09/11/2026): sem material grátis, o Comenta X manda um link (`comenta.link`, a página do curso ou do
// combo) e a peça nasce sem recurso (origem livre). Com `recurso`, segue como sempre.
const soLink = !P.recurso && P.comenta && P.comenta.link;
for (const campo of ['titulo', 'legenda', 'comenta', ...(soLink ? [] : ['recurso'])]) if (!P[campo]) throw new Error(`Falta "${campo}" em peca.json`);
const C = new Function('window', `${readFileSync(join(raiz, 'templates', 'carrossel', 'conteudos', `${nome}.js`), 'utf8')}; return window.CARROSSEL;`)({});
const arquivos = C.slides.map((_, k) => join(pasta, `${String(k + 1).padStart(2, '0')}.jpg`));
for (const a of arquivos) if (!existsSync(a)) throw new Error(`Falta ${a}: rode node scripts/carrossel.mjs ${nome}`);

const limpar = (h) => String(h || '').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const alt = (s) => {
  if (s.tipo === 'capa') return limpar(`${s.titulo.pre || ''} ${s.titulo.antes ? `${s.titulo.antes} ` : ''}${s.titulo.script || ''}${s.titulo.condensada || ''} ${s.titulo.linha2 || ''} ${s.titulo.pos || ''}`);
  if (s.tipo === 'chamada') return limpar(`${s.titulo.pre || ''} ${s.titulo.condensada || ''}. ${(s.blocos && s.blocos[0] && s.blocos[0].html) || ''}`);
  return limpar(`${s.titulo || ''} ${s.texto || ''}`);
};

const perfil = P.perfil === 'en' ? 'en' : 'br';
if (simular) {
  console.log(`${nome}: ${arquivos.length} slides, perfil ${perfil}, palavra ${P.comenta.palavra}, ${soLink ? `link ${P.comenta.link}` : `recurso "${P.recurso.titulo}"`}`);
  C.slides.forEach((s, k) => console.log(`  ${k + 1}. ${alt(s)}`));
  process.exit(0);
}

const arqEntrega = join(pasta, 'entrega.json');
const feito = existsSync(arqEntrega) ? JSON.parse(readFileSync(arqEntrega, 'utf8')) : {};
const salvar = () => writeFileSync(arqEntrega, JSON.stringify(feito, null, 1));

if (!feito.slides || atualizar) {
  const versao = Date.now().toString(36);
  const urls = [];
  for (let k = 0; k < arquivos.length; k++) {
    const f = `${String(k + 1).padStart(2, '0')}.jpg`;
    urls.push((await chamar('enviar_arquivo', { bucket: 'midia', nome: `carrossel-${nome}-${versao}-${f}`, tipo: 'image/jpeg', base64: readFileSync(arquivos[k]).toString('base64') })).url);
  }
  feito.slides = urls; salvar();
  console.log(`${urls.length} slides no bucket midia`);
}
if (!soLink && (!feito.recurso_id || atualizar)) {
  const r = await chamar('salvar_recurso', {
    ...P.recurso, ...(feito.recurso_id ? { id: feito.recurso_id } : {}), perfil, capa_url: feito.slides[0],
    galeria: feito.slides.slice(0, 3).map((url, k) => ({ url, alt: `${P.titulo}, slide ${k + 1}` })),
  });
  feito.recurso_id = r.id; feito.recurso_endereco = r.endereco; salvar();
  console.log(`recurso ${r.id} (${r.status})`);
}
const slides = C.slides.map((s, k) => ({ titulo: '', texto: alt(s), imagem_url: feito.slides[k], alt: alt(s) }));
if (!feito.peca_id) {
  const origem = soLink ? { origem_tipo: 'livre' } : { origem_tipo: 'recurso', origem_id: feito.recurso_id };
  const r = await chamar('criar_pecas', { perfil, ...origem, pecas: [{ rede: 'instagram', formato: 'carrossel', titulo: P.titulo, legenda: P.legenda, slides, comenta: P.comenta }] });
  const p = r.pecas[0];
  feito.peca_id = p.id; feito.avisos = r.avisos || null; salvar();
  console.log(`peça ${p.id} criada como rascunho${r.avisos ? ` (avisos: ${JSON.stringify(r.avisos)})` : ''}`);
} else if (atualizar) {
  await chamar('editar_peca', { id: feito.peca_id, titulo: P.titulo, legenda: P.legenda, slides });
  console.log(`peça ${feito.peca_id} atualizada (rascunho)`);
} else console.log(`peça ${feito.peca_id} já existe (use --atualizar para trocar os slides)`);
