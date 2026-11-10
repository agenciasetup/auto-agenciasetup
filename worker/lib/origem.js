// De onde veio a venda: o número do visitante (cookie nosso), os toques com marca de origem e os links curtos.
// Sem IP e sem perfil: só origem, meio, campanha, conteúdo e a página. Ver docs/area-de-membros.md, seção 5.
import { db } from '../nucleo/db.js';
import { aleatorio } from '../nucleo/util.js';
import { codigoValido, lerConversa } from './pessoa.js';

export const COOKIE = 'as_v';
const MARCAS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const limpa = (v, n = 120) => (v == null ? null : String(v).replace(/[^\p{L}\p{N} ._:@/+-]/gu, '').slice(0, n) || null);

export function lerVisitante(request) {
  const m = (request.headers.get('cookie') || '').match(/(?:^|;\s*)as_v=([A-Za-z0-9]{16,40})/);
  return m ? m[1] : null;
}

// O cookie vale no domínio de quem pediu: .agenciasetup.com.br (site, curso e marcas) ou .agenciasetup.com (o site em
// inglês). Gravado com o domínio do outro, o navegador recusa e a venda perde a origem.
export function cookieVisitante(env, v, host = '') {
  const prod = env.AMBIENTE !== 'local';
  const dominio = /(^|\.)agenciasetup\.com$/.test(String(host)) ? '.agenciasetup.com' : '.agenciasetup.com.br';
  return `${COOKIE}=${v}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly${prod ? `; Secure; Domain=${dominio}` : ''}`;
}

export const novoVisitante = () => aleatorio(24);

// Sem UTM, a página de onde a pessoa veio ainda diz a origem. Só as conhecidas: o resto (site de pagamento, player de
// vídeo, o nosso próprio site) não é origem de venda.
const REFERENCIAS = [
  [/(^|\.)instagram\.com$/, 'instagram', 'link'], [/(^|\.)threads\.(net|com)$/, 'threads', 'link'], [/(^|\.)(facebook\.com|fb\.com)$/, 'facebook', 'link'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube', 'link'], [/(^|\.)tiktok\.com$/, 'tiktok', 'link'], [/(^|\.)(x\.com|t\.co|twitter\.com)$/, 'x', 'link'],
  [/(^|\.)linkedin\.com$/, 'linkedin', 'link'], [/(^|\.)pinterest\.[a-z.]+$/, 'pinterest', 'link'], [/(^|\.)whatsapp\.com$/, 'whatsapp', 'link'],
  [/(^|\.)google\.[a-z.]+$/, 'google', 'busca'], [/(^|\.)bing\.com$/, 'bing', 'busca'],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, 'chatgpt.com', 'ia'], [/(^|\.)claude\.ai$/, 'claude.ai', 'ia'], [/(^|\.)perplexity\.ai$/, 'perplexity', 'ia'],
];
function referenciaDe(referrer) {
  let host = '';
  try { host = new URL(String(referrer || '')).hostname.toLowerCase(); } catch { return null; }
  const r = REFERENCIAS.find(([padrao]) => padrao.test(host));
  return r ? { origem: r[1], meio: r[2] } : null;
}

// Lê as marcas de um endereço. "?de=dm-xxxx" (DM do Comenta X) e "?de=pinterest" viram origem e meio. "?de=a-código"
// é o link mandado numa conversa do direct (pessoa.js): diz quem mandou (Atendente ou vendedor) e para quem.
export function marcasDe(url, referrer) {
  const s = url.searchParams;
  const t = {
    origem: limpa(s.get('utm_source'), 60), meio: limpa(s.get('utm_medium'), 60), campanha: limpa(s.get('utm_campaign')),
    conteudo: limpa(s.get('utm_content')), termo: limpa(s.get('utm_term')),
    clid: s.get('fbclid') ? 'fbclid' : s.get('gclid') ? 'gclid' : s.get('ttclid') ? 'ttclid' : null,
    // A pessoa do Instagram que recebeu o link: "&p=código" nos botões do Comenta X.
    pessoa: codigoValido(s.get('p')),
  };
  const de = limpa(s.get('de'), 60);
  if (de && !t.origem) {
    const dm = de.match(/^dm-(.+)$/);
    const conversa = lerConversa(de);
    if (conversa) Object.assign(t, { origem: 'instagram', meio: 'direct', campanha: t.campanha || 'conversa', conteudo: t.conteudo || conversa.quem, pessoa: conversa.pessoa || t.pessoa });
    else if (dm) Object.assign(t, { origem: 'instagram', meio: 'dm', campanha: t.campanha || dm[1] });
    else Object.assign(t, { origem: de });
  }
  if (!t.origem && !t.campanha) Object.assign(t, referenciaDe(referrer) || {});
  if (!t.origem && t.clid) t.origem = t.clid === 'fbclid' ? 'meta' : t.clid === 'gclid' ? 'google' : 'tiktok';
  return t.origem || t.campanha || t.clid ? t : null;
}

const iguais = (a, b) => ['origem', 'meio', 'campanha', 'conteudo', 'pessoa'].every((k) => (a[k] || null) === (b[k] || null));

export async function registrarToque(env, visitante, marcas, extra = {}) {
  // O clique no link curto e a página que abre logo depois trazem as mesmas marcas: é uma visita só, não duas.
  const [ultimo] = await db.select(env, 'toques', { filtros: { visitante: `eq.${visitante}`, quando: `gte.${new Date(Date.now() - 30 * 60_000).toISOString()}` }, select: 'origem,meio,campanha,conteudo,pessoa', ordem: 'quando.desc', limite: 1 });
  if (ultimo && iguais(ultimo, marcas)) return;
  await db.inserirRapido(env, 'toques', {
    visitante, ...marcas,
    link: extra.link || null,
    referer: limpa(extra.referer, 120),
    pagina: limpa(extra.pagina, 200),
    pais: extra.pais || null,
  });
}

// Os toques dos últimos 30 dias deste visitante: primeiro, último e a lista (até 20).
export async function toquesDoVisitante(env, visitante) {
  if (!visitante) return { primeiro: null, ultimo: null, lista: [] };
  const desde = new Date(Date.now() - 30 * 86400_000).toISOString();
  // Do mais novo para o mais antigo: com mais de 20 toques, o último da conta tem de ser o último de verdade.
  const novos = await db.select(env, 'toques', { filtros: { visitante: `eq.${visitante}`, quando: `gte.${desde}` }, select: 'quando,origem,meio,campanha,conteudo,termo,pessoa,link,clid,pagina', ordem: 'quando.desc', limite: 20 });
  const lista = novos.reverse();
  const [primeiro] = lista.length === 20 ? await db.select(env, 'toques', { filtros: { visitante: `eq.${visitante}`, quando: `gte.${desde}` }, select: 'quando,origem,meio,campanha,conteudo,termo,pessoa,link,clid,pagina', ordem: 'quando.asc', limite: 1 }) : lista;
  return { primeiro: primeiro || null, ultimo: lista[lista.length - 1] || null, lista };
}

// O nome do canal em português. O mesmo lugar chega com marcas diferentes (o Instagram põe "ig · social" sozinho na
// bio, o Comenta X põe "instagram · dm", um story antigo tem "story · automatico"): aqui vira um nome só. Vale para o
// que já está gravado, sem mexer no banco.
const NOMES = { facebook: 'Facebook', threads: 'Threads', youtube: 'YouTube', tiktok: 'TikTok', x: 'X', linkedin: 'LinkedIn', pinterest: 'Pinterest', whatsapp: 'WhatsApp', email: 'E-mail', google: 'Google', bing: 'Bing', 'chatgpt.com': 'ChatGPT', 'claude.ai': 'Claude', perplexity: 'Perplexity', meta: 'Facebook ou Instagram (link sem marca)' };
export function canalDe(t) {
  if (!t || !t.origem) return 'Direto (sem marca)';
  const o = String(t.origem).toLowerCase();
  const m = String(t.meio || '').toLowerCase();
  const pago = /^(cpc|ppc|paid|pago|ads?|anuncio|paid_social)$/.test(m);
  if (o === 'canal') return 'Canal de transmissão';
  if (o === 'recuperacao') return m === 'whatsapp' ? 'Recuperação: WhatsApp' : m === 'email' ? 'Recuperação: e-mail' : 'Recuperação: link';
  const insta = o.match(/^(?:instagram|ig)(?:-(.+))?$/);
  if (insta || o === 'story') {
    const dono = insta && insta[1] ? `Instagram (${insta[1][0].toUpperCase()}${insta[1].slice(1)})` : 'Instagram';
    if (pago) return `Anúncio no ${dono}`;
    if (m === 'direct') return insta && insta[1] ? `Conversa no direct do ${dono}` : 'Conversa no direct';
    if (m === 'dm') return insta && insta[1] ? `Direct do ${dono}` : 'Direct do Comenta X';
    if (o === 'story' || m === 'story') return `${dono}: story`;
    if (m === 'bio' || t.conteudo === 'link_in_bio' || o === 'ig') return `${dono}: link da bio`;
    if (m === 'link') return `${dono}: link sem marca`;
    return dono;
  }
  const nome = NOMES[o] || `${o[0].toUpperCase()}${o.slice(1)}`;
  if (pago) return `Anúncio no ${nome}`;
  return m === 'busca' ? `${nome} (busca)` : nome;
}

// Endereço de destino com as marcas do link (o GA e o pixel também veem a origem).
export function destinoComMarcas(origem, link) {
  const u = new URL(link.destino, origem);
  for (const k of MARCAS) if (link[k] && !u.searchParams.has(k)) u.searchParams.set(k, link[k]);
  return u.toString();
}
