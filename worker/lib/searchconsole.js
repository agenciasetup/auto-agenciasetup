// Os números do Google Search Console no painel (fase C de docs/seo-geo.md). Modelo: src/lib/search-console do jk-portal.
// Entra por uma "conta robô" (conta de serviço do Google, de graça) que só lê: o dono cria, dá acesso "Restrito" nas
// propriedades e cola a chave em Integrações > Google Search Console (cifrada no banco, nunca volta para a tela).
// Sem biblioteca: a assinatura (JWT RS256) é feita com o WebCrypto do Worker. Passo a passo: docs/search-console-automatico.md.
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';

export const SITES = ['sc-domain:agenciasetup.com.br', 'sc-domain:agenciasetup.com'];
export const ENDERECO_DO_SITE = { 'sc-domain:agenciasetup.com.br': 'https://agenciasetup.com.br', 'sc-domain:agenciasetup.com': 'https://agenciasetup.com' };
const ESCOPO = 'https://www.googleapis.com/auth/webmasters.readonly';
const API = 'https://searchconsole.googleapis.com/webmasters/v3';

// ---------------------------------------------------------------- a conta robô
// conta: o JSON da chave (o arquivo baixado do Google Cloud). Devolve { email, chave } ou explica o que está errado.
export function lerConta(texto) {
  let j;
  try { j = typeof texto === 'string' ? JSON.parse(texto) : texto; } catch { throw new Erro(400, 'Cole o conteúdo inteiro do arquivo .json da chave, do { ao }.'); }
  if (!j || j.type !== 'service_account' || !/@[\w.-]+\.iam\.gserviceaccount\.com$/.test(j.client_email || '') || !/BEGIN PRIVATE KEY/.test(j.private_key || '')) {
    throw new Erro(400, 'Esse arquivo não é a chave de uma conta de serviço do Google (falta client_email ou private_key).');
  }
  return { email: j.client_email, chave: j.private_key, json: JSON.stringify({ type: j.type, client_email: j.client_email, private_key: j.private_key, private_key_id: j.private_key_id }) };
}

const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const texto64u = (s) => b64u(new TextEncoder().encode(s));

async function assinar(pem, dados) {
  const corpo = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(corpo), (c) => c.charCodeAt(0));
  const chave = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', chave, new TextEncoder().encode(dados)));
}

// O JWT que o Google troca por uma chave de acesso de 1 hora (exportado para o teste local).
export async function jwtDaConta(conta, agora = Math.floor(Date.now() / 1000)) {
  const cab = texto64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const reivindica = texto64u(JSON.stringify({ iss: conta.email, scope: ESCOPO, aud: 'https://oauth2.googleapis.com/token', iat: agora, exp: agora + 3600 }));
  return `${cab}.${reivindica}.${await assinar(conta.chave, `${cab}.${reivindica}`)}`;
}

let acesso = { email: null, token: null, ate: 0 };
async function tokenDe(conta) {
  if (acesso.email === conta.email && acesso.token && acesso.ate > Date.now() + 60_000) return acesso.token;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: await jwtDaConta(conta) }),
    signal: AbortSignal.timeout(10_000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Erro(400, `O Google não aceitou a chave da conta robô (${j.error_description || j.error || r.status}). Gere uma chave nova e cole de novo.`);
  acesso = { email: conta.email, token: j.access_token, ate: Date.now() + (j.expires_in || 3600) * 1000 };
  return acesso.token;
}

async function google(conta, caminho, corpo) {
  const r = await fetch(`${API}${caminho}`, {
    method: corpo ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${await tokenDe(conta)}`, ...(corpo ? { 'content-type': 'application/json' } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined, signal: AbortSignal.timeout(20_000),
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 403) throw new Erro(400, `A conta robô não tem acesso (${(j.error && j.error.message) || 'sem permissão'}). No Search Console, em Configurações > Usuários e permissões, adicione ${conta.email} como Restrito.`);
  if (!r.ok) throw new Erro(502, `O Search Console respondeu ${r.status}: ${(j.error && j.error.message) || 'erro'}`);
  return j;
}

// As propriedades que a conta robô enxerga (o teste da integração).
export async function sitesDaConta(conta) {
  const j = await google(conta, '/sites');
  return (j.siteEntry || []).map((s) => ({ site: s.siteUrl, nivel: s.permissionLevel }));
}

// A conta guardada (Integrações > Google Search Console), já decifrada por prepararIntegracoes (env.GSC_CONTA).
export function contaGuardada(env) {
  if (!env.GSC_CONTA) return null;
  try { return lerConta(env.GSC_CONTA); } catch { return null; }
}

// ---------------------------------------------------------------- importação
const diaBr = (ms) => new Date(ms - 3 * 3600_000).toISOString().slice(0, 10);

async function consultar(conta, site, inicio, fim, dimensoes, limite) {
  const j = await google(conta, `/sites/${encodeURIComponent(site)}/searchAnalytics/query`, { startDate: inicio, endDate: fim, dimensions: dimensoes, rowLimit: limite, dataState: 'final' });
  return j.rows || [];
}

const num = (r) => ({ cliques: Math.round(r.clicks || 0), impressoes: Math.round(r.impressions || 0), ctr: Number((r.ctr || 0).toFixed(4)), posicao: Number((r.position || 0).toFixed(2)) });

// Importa um site: 90 dias dia a dia e os últimos 28 dias por página, por busca e por par. O Google leva uns 2 dias
// para fechar os números, então o período termina anteontem.
export async function importarSite(env, conta, site, agora = Date.now()) {
  const fim = diaBr(agora - 2 * 86400_000);
  const inicio28 = diaBr(agora - 29 * 86400_000);
  const inicio90 = diaBr(agora - 91 * 86400_000);
  const [dias, paginas, consultas, pares] = await Promise.all([
    consultar(conta, site, inicio90, fim, ['date'], 100),
    consultar(conta, site, inicio28, fim, ['page'], 1000),
    consultar(conta, site, inicio28, fim, ['query'], 1000),
    consultar(conta, site, inicio28, fim, ['query', 'page'], 5000),
  ]);
  if (dias.length) await db.insert(env, 'seo_dias', dias.map((r) => ({ site, dia: r.keys[0], ...num(r) })), { upsert: true, conflito: 'site,dia', select: 'site' });
  const itens = [
    ...paginas.map((r) => ({ tipo: 'pagina', pagina: r.keys[0], ...num(r) })),
    ...consultas.map((r) => ({ tipo: 'consulta', consulta: r.keys[0], ...num(r) })),
    ...pares.filter((r) => r.impressions >= 2).map((r) => ({ tipo: 'par', consulta: r.keys[0], pagina: r.keys[1], ...num(r) })),
  ].map((x) => ({ site, inicio: inicio28, fim, ...x }));
  await db.apagar(env, 'seo_itens', { site: `eq.${site}` });
  for (let i = 0; i < itens.length; i += 2000) await db.insert(env, 'seo_itens', itens.slice(i, i + 2000), { select: 'id' });
  return { site, dias: dias.length, paginas: paginas.length, consultas: consultas.length, pares: pares.length, fim };
}

// O que o relógio chama (lib/relogio.js): um site por vez, uma vez por dia, a partir das 6h de Brasília, tentando de novo
// de hora em hora se falhar. A marca de cada site fica em config.seo_importacao.
export async function importarDaVez(env, quando = Date.now(), { forcar = false, site: soEste } = {}) {
  const conta = contaGuardada(env);
  if (!conta) return { pulou: 'sem conta robô' };
  const hoje = diaBr(quando);
  const marca = ((await db.um(env, 'config', { chave: 'eq.seo_importacao' })) || {}).valor || {};
  const pendente = soEste ? [soEste] : SITES.filter((s) => forcar || !(marca[s] && marca[s].dia === hoje && marca[s].ok));
  if (!pendente.length) return { pulou: 'em dia' };
  const site = pendente[0];
  let r;
  try {
    r = await importarSite(env, conta, site, quando);
    marca[site] = { dia: hoje, em: new Date(quando).toISOString(), ok: true, ...r };
  } catch (e) {
    marca[site] = { ...(marca[site] || {}), dia: hoje, em: new Date(quando).toISOString(), ok: false, erro: String(e && e.message).slice(0, 300) };
    r = { site, erro: marca[site].erro };
  }
  await db.insert(env, 'config', { chave: 'seo_importacao', valor: marca }, { upsert: true, conflito: 'chave', select: 'chave' });
  return r;
}

// ---------------------------------------------------------------- leitura e oportunidades
// CTR que se espera de cada posição (média de mercado, aproximada): abaixo da metade, o título e a descrição não convencem.
const CTR_ESPERADO = [0, 0.28, 0.15, 0.1, 0.07, 0.05, 0.04, 0.03, 0.025, 0.02, 0.02];
const esperado = (pos) => CTR_ESPERADO[Math.min(10, Math.max(1, Math.round(pos)))] || 0.01;

// A página que a busca encontra, sem o domínio. Lista, início e busca não são "página da busca": falta uma página própria.
const caminho = (u) => { try { return new URL(u).pathname.replace(/\/+$/, '') || '/'; } catch { return u; } };
const GENERICA = /^\/($|recursos$|agentes$|novidades$|cursos$|busca|ia$|equipamentos$|tutoriais$|guias$)/;

export function oportunidades(itens) {
  const consultas = itens.filter((i) => i.tipo === 'consulta');
  const melhorPagina = new Map();
  for (const p of itens.filter((i) => i.tipo === 'par')) {
    const atual = melhorPagina.get(p.consulta);
    if (!atual || p.impressoes > atual.impressoes) melhorPagina.set(p.consulta, p);
  }
  const lista = [];
  for (const c of consultas) {
    const pag = melhorPagina.get(c.consulta);
    const onde = pag ? caminho(pag.pagina) : null;
    const base = { consulta: c.consulta, cliques: c.cliques, impressoes: c.impressoes, ctr: c.ctr, posicao: c.posicao, pagina: onde };
    if (c.impressoes >= 30 && c.posicao <= 10 && c.ctr < esperado(c.posicao) * 0.5) {
      lista.push({ ...base, tipo: 'titulo', motivo: `Aparece em ${c.impressoes} buscas na posição ${c.posicao.toFixed(1)}, mas só ${(c.ctr * 100).toFixed(1)}% clicam.`, acao: 'Reescreva o título e o resumo da página com a busca nas primeiras palavras e um motivo para clicar.' });
    } else if (c.impressoes >= 20 && c.posicao > 8 && c.posicao <= 20) {
      lista.push({ ...base, tipo: 'reforcar', motivo: `Está na posição ${c.posicao.toFixed(1)} (segunda página) com ${c.impressoes} aparições.`, acao: 'Reforce a página: resposta rápida, perguntas, mais exemplos e links de outras páginas nossas para ela.' });
    }
    // Sem página própria: a busca cai no início ou numa lista (ou longe, sem saber em qual página) e não vai bem.
    const vaiBem = c.posicao <= 5 && c.ctr >= esperado(c.posicao) * 0.5;
    if (c.impressoes >= 15 && !vaiBem && (onde ? GENERICA.test(onde) : c.posicao > 10)) {
      lista.push({ ...base, tipo: 'nova', motivo: `${c.impressoes} buscas por isso caem ${onde ? `em ${onde}` : 'longe, na posição ' + c.posicao.toFixed(0)}, sem uma página própria.`, acao: 'Escreva um artigo com essa busca-alvo.' });
    }
  }
  // As que mais podem render primeiro: aparições vezes o quanto falta de clique.
  return lista.map((o) => ({ ...o, peso: Math.round(o.impressoes * Math.max(0.01, esperado(Math.min(o.posicao, 10)) - o.ctr) * 100) }))
    .sort((a, b) => b.peso - a.peso).slice(0, 25);
}
