// A lista de canais que o Caçador de virais segue (setor de vídeo). Acha o id do canal pelo @ no YouTube, neste
// computador, e grava pela ferramenta do conector (video_canal_salvar), que lê os Shorts do canal antes de aceitar.
//   node scripts/video-canais.mjs                         mostra a lista e a régua
//   node scripts/video-canais.mjs add @canal [pt|en] [tema]   põe um canal (tema: ia, social, design, automacao...)
//   node scripts/video-canais.mjs tirar @canal|UC...      tira um canal
//   node scripts/video-canais.mjs semente                 tenta a lista inicial (canal que não existe é pulado)
// A chave do conector vem do .env.local (MCP_CHAVE) e nunca é impressa.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { raiz } from './env.mjs';

const env = readFileSync(join(raiz, '.env.local'), 'utf8');
const chave = (env.match(/^\s*MCP_CHAVE\s*=\s*"?([^"\r\n]+)"?/m) || [])[1];
if (!chave) { console.error('Falta MCP_CHAVE no .env.local (npm run chave -- "Nome").'); process.exit(1); }
const site = process.env.SITE || 'https://agenciasetup.com.br';

async function ferramenta(name, args = {}) {
  const r = await fetch(`${site}/mcp/ferramentas`, {
    method: 'POST',
    headers: { authorization: `Bearer ${chave}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
  });
  const j = await r.json().catch(() => null);
  if (!j || j.error) return { erro: j ? JSON.stringify(j.error).slice(0, 200) : `o conector respondeu ${r.status}` };
  const t = (j.result.content && j.result.content[0] && j.result.content[0].text) || '';
  if (j.result.isError) return { erro: t.slice(0, 200) };
  try { return JSON.parse(t); } catch { return { texto: t }; }
}

const ID = /^UC[A-Za-z0-9_-]{22}$/;
// O id do canal a partir do @: a página do canal traz o endereço oficial com o id.
async function idDoCanal(entrada) {
  const e = String(entrada || '').trim();
  if (ID.test(e)) return { id: e };
  const arroba = e.replace(/^https?:\/\/(www\.)?youtube\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '');
  if (!/^[A-Za-z0-9._-]{2,40}$/.test(arroba)) return { erro: 'nome de canal inválido' };
  const r = await fetch(`https://www.youtube.com/@${arroba}`, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8' }, redirect: 'follow' }).catch(() => null);
  if (!r) return { erro: 'sem resposta do YouTube' };
  if (r.status === 404) return { erro: 'canal não existe' };
  if (!r.ok) return { erro: `o YouTube respondeu ${r.status}` };
  const html = await r.text();
  const m = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})"/) || html.match(/"externalId":"(UC[A-Za-z0-9_-]{22})"/) || html.match(/"browseId":"(UC[A-Za-z0-9_-]{22})"/);
  return m ? { id: m[1], arroba } : { erro: 'não achei o id na página do canal' };
}

async function por(entrada, idioma, tema) {
  const c = await idDoCanal(entrada);
  if (c.erro) return { entrada, erro: c.erro };
  const r = await ferramenta('video_canal_salvar', { id: c.id, idioma: idioma === 'en' ? 'en' : 'pt', tema: tema || undefined, arroba: c.arroba || undefined });
  if (r.erro) return { entrada, erro: r.erro };
  return { entrada, id: c.id, nome: r.lido && r.lido.nome, shorts: r.lido && r.lido.shorts, base: r.lido && r.lido.base, total: r.canais };
}

// A lista inicial: canais de IA, automação, social media e design que publicam Shorts. É só um ponto de partida: o
// script confere um por um e pula o que não existe ou não tem Shorts. O dono põe e tira os dele.
const SEMENTE = [
  ['pt', 'ia', ['igao.ia', 'igaoia', 'jefao.ai', 'jefaoai', 'sandeco', 'InteligenciaMilGrau', 'brunopicinini', 'NoCodeStartUp', 'AsimovAcademy', 'brenoperrucho', 'LucasMontano', 'CanalSemCodar', 'IAnaPratica', 'pedrosobral']],
  ['pt', 'social', ['paulocuenca', 'rafaelkiso', 'camilaporto', 'leandroladeira', 'ericorocha', 'tiagotessmann', 'hyesocial', 'mlabsbr', 'rdstation', 'rockcontent']],
  ['en', 'ia', ['anthropic-ai', 'OpenAI', 'mreflow', 'rileybrownai', 'GregIsenberg', 'AIJasonZ', 'Fireship', 'matthew_berman', 'AlexFinnOfficial', 'nateherk', 'TheAIAdvantage', 'DavidOndrej', 'IndyDevDan', 'AllAboutAI', 'skillleapai', 'futurepedia_io', 'TinaHuang1', 'JeffSu', 'airevolutionx']],
  ['en', 'social', ['katiesteckly', 'modernmillie', 'latashajames', 'VanessaLau', 'jadedarmawangsa', 'elisedarma', 'socialmediaexaminer', 'HubSpotMarketing', 'latermedia', 'brock11johnson']],
  ['en', 'design', ['canva', 'Figma', 'AdobeExpress', 'satorigraphics', 'thefutur', 'flux-academy', 'DesignWithCanva']],
];

const [acao, alvo, a3, a4] = process.argv.slice(2);
if (!acao || acao === 'lista') {
  const r = await ferramenta('video_canais');
  if (r.erro) { console.error(r.erro); process.exit(1); }
  console.log(`${r.canais.length} canais. Régua: ${r.regua.vezes} vezes a média, ${r.regua.views} visualizações, ${r.regua.dias} dias.`);
  for (const c of r.canais) console.log(`  ${c.idioma}  ${String(c.tema || '').padEnd(10)} ${c.nome}${c.arroba ? ` (@${c.arroba})` : ''}  ${c.id}`);
} else if (acao === 'add' && alvo) {
  console.log(JSON.stringify(await por(alvo, a3, a4)));
} else if (acao === 'tirar' && alvo) {
  const c = await idDoCanal(alvo);
  console.log(c.erro ? c.erro : JSON.stringify(await ferramenta('video_canal_salvar', { id: c.id, tirar: true })));
} else if (acao === 'semente') {
  let entrou = 0;
  const fora = [];
  for (const [idioma, tema, nomes] of SEMENTE) {
    for (const n of nomes) {
      const r = await por(n, idioma, tema);
      if (r.erro) fora.push(`${n}: ${r.erro}`);
      else { entrou++; console.log(`ok  ${idioma} ${tema.padEnd(8)} ${r.nome} (${r.shorts} Shorts, média ${r.base})`); }
      await new Promise((ok) => setTimeout(ok, 400));
    }
  }
  console.log(`\n${entrou} canais na lista. Ficaram de fora ${fora.length}:`);
  for (const f of fora) console.log('  ' + f);
} else {
  console.log('Uso: node scripts/video-canais.mjs [lista | add @canal [pt|en] [tema] | tirar @canal | semente]');
}
