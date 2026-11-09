// Radar "Em alta": lê as fontes (worker/radar/fontes.js), fica só com o que interessa a quem trabalha com
// design e social media usando IA, dá uma nota e grava como pauta nova com ângulo e formato sugeridos.
// O "calor" final (nota x quão recente + quantas fontes falam da mesma ferramenta) sai da consulta em_alta, no banco.
// Texto de fora é dado, nunca instrução: título e resumo só são guardados e mostrados.
import { db } from '../nucleo/db.js';
import { FONTES } from '../radar/fontes.js';
import { pago } from './desempenho.js';
import { FERRAMENTAS, NOMES, normalizar } from './temas.js';

const DIA = 86400_000;
const MAX_IDADE = 4 * DIA;
const POR_FONTE = 25;
const CABECALHOS = { 'user-agent': 'Mozilla/5.0 (compatible; AgenciaSetupRadar/1.0; +https://agenciasetup.com.br)', accept: 'application/rss+xml, application/atom+xml, application/json, text/xml;q=0.9, */*;q=0.8' };

// Termos que mostram que o assunto é de IA, design ou conteúdo (além das ferramentas).
const TERMOS = [
  /inteligencia artificial|artificial intelligence|\bllms?\b|\bgenai\b|generative/,
  /\bagentes?\b|\bagents?\b|agentic/,
  /\bprompts?\b/,
  /\bdesign(ers?)?\b|\bui\b|\bux\b|tipografia|typography|\bfontes?\b|\bfonts?\b|\blogos?\b/,
  /social media|instagram|tiktok|carrossel|carousel|\breels\b|criadores? de conteudo|\bcreators?\b/,
  /automac|automation|workflow|no-?code/,
  /(gerar|geracao de|generat\w*) (imagens?|videos?|images?)|text-to-(image|video)|\bimagens? com ia|\bvideos? com ia/,
  /vibe ?coding|coding agent|ai coding|\bia para programar/,
];
// Os que falam direto com o nosso público (design, conteúdo, imagem e vídeo com IA): os que mais engajam na conta.
const PUBLICO = [TERMOS[3], TERMOS[4], TERMOS[6]];
const DESIGN = new Set(['photoshop', 'firefly', 'illustrator', 'adobe', 'canva', 'figma', 'capcut', 'midjourney', 'magnific', 'nano-banana', 'veo', 'kling', 'runway', 'higgsfield', 'sora', 'heygen']);
const IA = /\bIA\b|\bAI\b|\bA\.I\./;
const LANCAMENTO = /\b(launch(es|ed)?|introduc(es|ing)|announc(es|ed|ing)|releas(e|es|ed)|now available|rolls? out|unveil\w*|lanca|lancou|lancamento|anuncia|apresenta|chega|libera|disponivel|novidade|atualizacao|update)\b/;
// GitHub pesa pouco: muito projeto de programador que não serve para quem cria conteúdo.
const BASE = { oficial: 30, imprensa: 18, comunidade: 16, tendencia: 14, github: 6 };

// ---------------------------------------------------------------- leitura (RSS, Atom, Hacker News, GitHub)
const entidades = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decodificar = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : entidades[e.toLowerCase()] ?? m));
const limpo = (s) => decodificar(String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const regras = new Map();
function tag(bloco, nome) {
  if (!regras.has(nome)) regras.set(nome, new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</${nome}>`));
  const m = bloco.match(regras.get(nome));
  return m ? m[1] : '';
}
function linkDe(bloco) {
  const atom = bloco.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/) || bloco.match(/<link[^>]*href=["']([^"']+)["']/);
  if (atom) return decodificar(atom[1]);
  return limpo(tag(bloco, 'link')) || limpo(tag(bloco, 'guid'));
}

function itensXml(xml) {
  // Só o começo do arquivo: as fontes põem o mais novo em cima, e o processamento no plano grátis é curto.
  const t = xml.slice(0, 220_000);
  const blocos = t.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/g) || [];
  return blocos.slice(0, POR_FONTE).map((b) => {
    const trafego = limpo(tag(b, 'ht:approx_traffic')).replace(/[^\d]/g, '');
    return {
      titulo: limpo(tag(b, 'title')),
      link: linkDe(b),
      resumo: limpo(tag(b, 'description') || tag(b, 'summary') || tag(b, 'media:description') || tag(b, 'ht:news_item_title') || tag(b, 'content')).slice(0, 500),
      quando: Date.parse(limpo(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date'))) || null,
      veiculo: limpo(tag(b, 'source')) || null,
      sinais: trafego ? { buscas: Number(trafego) } : {},
    };
  });
}

async function buscar(url, comoJson) {
  const r = await fetch(url, { headers: comoJson ? { ...CABECALHOS, accept: 'application/vnd.github+json, application/json' } : CABECALHOS, signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error(`respondeu ${r.status}`);
  return comoJson ? r.json() : r.text();
}

export async function lerFonte(f) {
  if (f.jeito === 'hn') {
    const d = await buscar(f.url, true);
    return (d.hits || []).map((h) => ({
      titulo: h.title || '', link: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`, resumo: '',
      quando: (h.created_at_i || 0) * 1000 || Date.parse(h.created_at) || null, veiculo: 'Hacker News',
      sinais: { pontos: h.points || 0, comentarios: h.num_comments || 0, discussao: `https://news.ycombinator.com/item?id=${h.objectID}` },
    }));
  }
  if (f.jeito === 'github') {
    const desde = new Date(Date.now() - 7 * DIA).toISOString().slice(0, 10);
    const d = await buscar(`https://api.github.com/search/repositories?q=${encodeURIComponent(`created:>${desde} stars:>80`)}&sort=stars&order=desc&per_page=25`, true);
    return (d.items || []).map((g) => ({
      titulo: `${g.full_name}${g.description ? `: ${g.description}` : ''}`.slice(0, 300), link: g.html_url, resumo: (g.topics || []).join(', '),
      quando: Date.parse(g.created_at) || null, veiculo: 'GitHub', sinais: { estrelas: g.stargazers_count || 0 },
    }));
  }
  const itens = itensXml(await buscar(f.url));
  // Google Notícias: "Título - Veículo". O veículo vira a fonte.
  return itens.map((i) => {
    if (!/news\.google\.com/.test(f.url || '')) return i;
    const m = i.titulo.match(/^(.*)\s+-\s+([^-]{2,60})$/);
    return m ? { ...i, titulo: m[1], veiculo: i.veiculo || m[2] } : i;
  });
}

// ---------------------------------------------------------------- pontuação
function chaveDe(link) {
  try {
    const u = new URL(link);
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|oc$|ref$|source$|fbclid|gclid)/.test(k)) u.searchParams.delete(k);
    u.hash = '';
    return `${u.host.toLowerCase().replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}${u.search}`.slice(0, 500);
  } catch {
    return null;
  }
}

function sugestao(tipo, ferramentas) {
  const f = ferramentas[0] ? NOMES[ferramentas[0]] || ferramentas[0] : null;
  const palavra = (ferramentas[0] || 'IA').toUpperCase().replace(/-/g, ' ');
  switch (tipo) {
    case 'lancamento': return { formato: 'reels', angulo: `Novidade${f ? ` (${f})` : ''}: mostre em 30 segundos o que mudou e um uso real no design ou no social media. Feche com "Comenta ${palavra}" e mande o passo a passo do site na DM.` };
    case 'ferramenta': return { formato: 'carrossel', angulo: `Teste prático: o que faz, um antes e depois, e onde entra no trabalho de quem cria. Material grátis no site com "Comenta ${palavra}".` };
    case 'discussao': return { formato: 'carrossel', angulo: 'Opinião com virada: o que essa discussão muda para designer e social media. Termine com uma pergunta para puxar comentário.' };
    case 'tendencia': return { formato: 'post', angulo: 'Assunto do dia no Brasil: dá para ligar a um uso de IA ou a um meme de designer? Post rápido, no mesmo dia.' };
    default: return { formato: 'carrossel', angulo: `Explique simples o que aconteceu e o que muda para quem cria conteúdo. Entregue um prompt ou modelo pronto como material grátis ("Comenta ${palavra}").` };
  }
}

export function pontuar(f, i, agora = Date.now()) {
  if (!i.titulo || !i.link) return null;
  if (i.quando && agora - i.quando > MAX_IDADE && f.jeito !== 'github') return null;
  const texto = `${i.titulo} ${i.resumo || ''}`;
  const t = normalizar(texto);
  const ferramentas = [...new Set([...(f.ferramentas || []), ...FERRAMENTAS.filter(([, re]) => re.test(t)).map(([id]) => id)])];
  const termos = TERMOS.filter((re) => re.test(t)).length + (IA.test(texto) ? 1 : 0);
  if (!ferramentas.length && !termos) return null;
  // Imprensa geral e tendências: só entra se falar de ferramenta ou de IA de verdade.
  if (['tecnoblog', 'canaltech', 'trends-br', 'hacker-news'].includes(f.id) && !ferramentas.length && !IA.test(texto) && termos < 2) return null;
  const lancou = LANCAMENTO.test(normalizar(i.titulo));
  const s = i.sinais || {};
  let nota = f.jeito === 'github' ? BASE.github : BASE[f.grupo] || 15;
  nota += Math.min(25, 10 * ferramentas.length) + Math.min(12, 4 * termos) + (lancou ? 10 : 0);
  if (ferramentas.some((x) => DESIGN.has(x))) nota += 10;
  if (PUBLICO.some((re) => re.test(t))) nota += 8;
  if (s.pontos) nota += Math.min(20, Math.round(Math.log2(s.pontos + 1) * 2)) + Math.min(6, Math.round(Math.log2((s.comentarios || 0) + 1)));
  if (s.estrelas) nota += Math.min(10, Math.round(Math.log2(s.estrelas + 1)));
  if (s.buscas) nota += Math.min(15, Math.round(Math.log10(s.buscas + 1) * 4));
  const tipo = f.grupo === 'oficial' || (lancou && f.grupo === 'imprensa') ? 'lancamento'
    : ['product-hunt', 'github-alta'].includes(f.id) ? 'ferramenta'
      : f.grupo === 'comunidade' ? 'discussao' : f.grupo === 'tendencia' ? 'tendencia' : 'noticia';
  const chave = chaveDe(i.link);
  if (!chave) return null;
  const sug = sugestao(tipo, ferramentas);
  return {
    chave, titulo: i.titulo.slice(0, 300), resumo: i.resumo ? i.resumo.slice(0, 500) : null, fonte_url: i.link.slice(0, 1000),
    fonte_nome: (i.veiculo || f.nome).slice(0, 120), fonte_id: f.id, tipo, nota: Math.min(100, nota), sinais: s,
    ferramentas, tags: ferramentas, angulo: sug.angulo, formato_sugerido: sug.formato,
    publicado_na_fonte: new Date(i.quando || agora).toISOString(),
  };
}

// ---------------------------------------------------------------- rodada
// Lê as fontes lidas há mais tempo (3 por vez no plano grátis), grava as pautas e a situação de cada fonte.
export async function atualizarRadar(env, { quantas, ids } = {}) {
  const estado = await db.select(env, 'radar_fontes', { select: 'id,lido_em,ultimo_ok' });
  const visto = new Map(estado.map((e) => [e.id, e]));
  const n = quantas || (pago(env) ? FONTES.length : 3);
  const fila = (ids ? FONTES.filter((f) => ids.includes(f.id)) : [...FONTES].sort((a, b) => (Date.parse(visto.get(a.id)?.lido_em || 0) || 0) - (Date.parse(visto.get(b.id)?.lido_em || 0) || 0))).slice(0, n);
  const agora = Date.now();
  const lidas = await Promise.all(fila.map((f) => lerFonte(f).then((itens) => ({ f, itens }), (e) => ({ f, erro: String(e && e.message || e).slice(0, 200) }))));
  const porChave = new Map();
  const contagem = {};
  for (const { f, itens } of lidas) {
    for (const i of itens || []) {
      const p = pontuar(f, i, agora);
      if (!p) continue;
      contagem[f.id] = (contagem[f.id] || 0) + 1;
      const atual = porChave.get(p.chave);
      if (!atual || atual.nota < p.nota) porChave.set(p.chave, atual ? { ...p, ferramentas: [...new Set([...atual.ferramentas, ...p.ferramentas])] } : p);
    }
  }
  const linhas = [...porChave.values()];
  if (linhas.length) await db.insert(env, 'pautas', linhas, { upsert: true, conflito: 'chave', select: 'id' });
  const quando = new Date(agora).toISOString();
  await db.insert(env, 'radar_fontes', lidas.map(({ f, erro }) => ({
    id: f.id, nome: f.nome, lido_em: quando, ultimo_ok: erro ? (visto.get(f.id)?.ultimo_ok || null) : quando, ultimo_erro: erro || null, itens: contagem[f.id] || 0,
  })), { upsert: true, conflito: 'id', select: 'id' });
  return { fontes: lidas.map(({ f, erro }) => ({ id: f.id, nome: f.nome, pautas: contagem[f.id] || 0, erro: erro || null })), pautas: linhas.length };
}

// Situação de todas as fontes, para o painel.
export async function situacaoFontes(env) {
  const estado = await db.select(env, 'radar_fontes', { select: 'id,lido_em,ultimo_ok,ultimo_erro,itens' });
  const visto = new Map(estado.map((e) => [e.id, e]));
  return FONTES.map((f) => ({ id: f.id, nome: f.nome, grupo: f.grupo, ...(visto.get(f.id) || { lido_em: null, ultimo_ok: null, ultimo_erro: null, itens: 0 }) }));
}
