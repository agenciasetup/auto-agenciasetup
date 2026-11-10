// O Caçador de virais (docs/escritorio.md, sala Vídeo, agente "cacador-de-ganchos", o Simão P.): segue uma lista de
// canais do nicho no YouTube e marca o Short que saiu da curva DO PRÓPRIO canal (as visualizações dele divididas pela
// mediana do canal). É o que "viralizou esta semana" medido com número, e não com achismo.
//
// De graça e sem chave: o YouTube entrega em RSS os últimos 15 Shorts de um canal, com as visualizações e as curtidas
// (feeds/videos.xml?playlist_id=UUSH + o id do canal sem o "UC"). Sem IA: é conta. Quem lê o resultado e escreve o
// roteiro é o Roteirista (agentes/roteirista.js).
//
// Como roda: o relógio de minuto chama uma vez por hora. Cada rodada lê POR_RODADA canais, em rodízio (o plano grátis
// da Cloudflare dá 50 chamadas por execução), e guarda os achados em videos_virais (uma chamada, a função
// videos_virais_guardar). Quando o rodízio dá a volta, grava um turno com o resumo. O estado fica em
// config.video_cacador e a lista de canais em config.video_canais (scripts/video-canais.mjs e o conector).
// Pausado ou demitido no Escritório, a rodada do relógio sai sem ler canal nenhum.
// O rodízio anda sempre, mesmo quando a rodada falha (canal que não abre, banco que não guarda): a falha vira turno
// com erro, e não uma volta presa nos mesmos canais.
// Título de vídeo é texto de fora: é dado, nunca instrução.
import { contarChamada, db, folgaDeChamadas } from '../../nucleo/db.js';
import { agenteLiberado, registrarTurno } from '../escritorio.js';

const AGENTE = 'cacador-de-ganchos';
const CHAVE = 'video_cacador';
export const CHAVE_CANAIS = 'video_canais';
const DIA = 86_400_000;
const POR_RODADA = 4;
const FOLGA = 12; // chamadas que uma rodada gasta no pior caso (estado, canais, agente, 4 feeds, guardar, estado e as 2 do turno: 11)
const ERRO_DE_NOVO = 6 * 3_600_000; // rodada ruim atrás de rodada ruim: um turno com erro a cada 6 horas, não um por hora
// A régua do que é "fora da curva". O dono muda em config.video_canais.regua. Os canais em português são menores:
// para eles o mínimo de visualizações é views_pt.
export const REGUA = { vezes: 3, views: 20_000, views_pt: 5_000, dias: 10, assentou_dias: 3 };
const CANAL = /^UC[A-Za-z0-9_-]{22}$/;
export const canalValido = (id) => CANAL.test(String(id || ''));
export const feedDe = (canal) => `https://www.youtube.com/feeds/videos.xml?playlist_id=UUSH${String(canal).slice(2)}`;

// ---------------------------------------------------------------- ler o feed
const solto = (t) => String(t || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const pega = (bloco, re) => { const m = bloco.match(re); return m ? m[1] : ''; };
export function lerFeed(xml) {
  const itens = [];
  for (const m of String(xml || '').matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const b = m[1];
    const id = pega(b, /<yt:videoId>([A-Za-z0-9_-]{6,20})<\/yt:videoId>/);
    const publicado = Date.parse(pega(b, /<published>([^<]+)<\/published>/));
    if (!id || !Number.isFinite(publicado)) continue;
    itens.push({
      id, publicado, titulo: solto(pega(b, /<title>([\s\S]*?)<\/title>/)).slice(0, 200),
      views: Number(pega(b, /<media:statistics[^>]*\sviews="(\d+)"/)) || 0,
      curtidas: Number(pega(b, /<media:starRating[^>]*\scount="(\d+)"/)) || 0,
    });
  }
  const canal = solto(pega(String(xml || ''), /<author>\s*<name>([\s\S]*?)<\/name>/)).slice(0, 80);
  return { canal, itens };
}

// ---------------------------------------------------------------- a conta
const mediana = (l) => { if (!l.length) return 0; const o = [...l].sort((a, b) => a - b); const m = o.length >> 1; return o.length % 2 ? o[m] : Math.round((o[m - 1] + o[m]) / 2); };
// A base do canal: a mediana dos Shorts que já assentaram (mais de 3 dias no ar). Com menos de 4 deles, usa todos.
// Devolve só os recentes que passaram da régua, com "vezes" (quantas vezes a base) e "por_dia".
export function medir(itens, agora = Date.now(), regua = REGUA) {
  const r = { ...REGUA, ...(regua || {}) };
  const velhos = itens.filter((i) => agora - i.publicado > r.assentou_dias * DIA).map((i) => i.views);
  const base = mediana(velhos.length >= 4 ? velhos : itens.map((i) => i.views));
  const fora = itens
    .filter((i) => agora - i.publicado <= r.dias * DIA && i.views >= r.views)
    .map((i) => ({ ...i, base, vezes: Math.round((i.views / Math.max(base, 1)) * 10) / 10, por_dia: Math.round(i.views / Math.max(1, (agora - i.publicado) / DIA)) }))
    .filter((i) => i.vezes >= r.vezes);
  return { base, fora };
}

// ---------------------------------------------------------------- o que ele lembra e a lista de canais
// erro_em: quando saiu o último turno com erro de uma rodada ruim (para não repetir de hora em hora).
function lerEstado(linha) {
  const v = (linha && linha.valor) || {};
  return { cursor: Number(v.cursor) || 0, volta: v.volta && typeof v.volta === 'object' ? v.volta : { lidos: 0, erros: 0, achados: [] }, ultima: v.ultima || null, ultima_volta: v.ultima_volta || null, erro_em: v.erro_em || null };
}
export function lerCanais(linha) {
  const v = (linha && linha.valor) || {};
  const canais = (Array.isArray(v.canais) ? v.canais : []).filter((c) => c && canalValido(c.id) && c.ativo !== false);
  return { canais, regua: { ...REGUA, ...(v.regua && typeof v.regua === 'object' ? v.regua : {}) } };
}

// ---------------------------------------------------------------- a rodada
async function buscarFeed(env, canal) {
  contarChamada(env);
  const r = await fetch(feedDe(canal.id), { headers: { 'user-agent': 'Mozilla/5.0 (compatible; radar/1.0)', accept: 'application/atom+xml,application/xml' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`o YouTube respondeu ${r.status}`);
  return lerFeed(await r.text());
}

const milhar = (n) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')} mi` : n >= 1000 ? `${Math.round(n / 1000)} mil` : String(n));

// simular: lê os canais pedidos e devolve a conta, sem gravar nada (scripts/conferir-video.mjs e o conector).
export async function rodarCacadorDeVirais(env, quando = Date.now(), { simular = false, quantos = POR_RODADA } = {}) {
  if (!simular && folgaDeChamadas(env) < FOLGA) return { pulou: 'sem folga de chamadas neste minuto' };
  // O teste (simular) só lê e faz a conta: vale mesmo com o agente em pausa. A rodada de verdade confere o estado.
  const [linhaEstado, linhaCanais, liberado] = await Promise.all([
    db.um(env, 'config', { chave: `eq.${CHAVE}` }).catch(() => null),
    db.um(env, 'config', { chave: `eq.${CHAVE_CANAIS}` }).catch(() => null),
    simular ? true : agenteLiberado(env, AGENTE),
  ]);
  if (!liberado) return { pulou: 'agente_parado' };
  const { canais, regua } = lerCanais(linhaCanais);
  if (!canais.length) return { pulou: 'nenhum canal na lista (config.video_canais)' };
  const estado = lerEstado(linhaEstado);
  const inicio = estado.cursor % canais.length;
  const n = Math.min(Math.max(1, quantos), canais.length);
  const vez = Array.from({ length: n }, (_, i) => canais[(inicio + i) % canais.length]);
  const lidos = await Promise.all(vez.map(async (c) => {
    try {
      const f = await buscarFeed(env, c);
      const m = medir(f.itens, quando, c.idioma === 'en' ? regua : { ...regua, views: regua.views_pt });
      return { canal: c, nome: c.nome || f.canal, shorts: f.itens.length, base: m.base, fora: m.fora };
    } catch (e) { return { canal: c, nome: c.nome, erro: String((e && e.message) || e).slice(0, 120) }; }
  }));
  const achados = lidos.flatMap((l) => (l.fora || []).map((v) => ({
    video_id: v.id, canal_id: l.canal.id, canal: String(l.nome || '').slice(0, 80), idioma: l.canal.idioma === 'en' ? 'en' : 'pt', tema: String(l.canal.tema || '').slice(0, 30) || null,
    titulo: v.titulo, publicado_em: new Date(v.publicado).toISOString(), views: v.views, curtidas: v.curtidas, base: v.base, vezes: v.vezes, por_dia: v.por_dia,
  })));
  const resumo = { canais: lidos.map((l) => ({ nome: l.nome, shorts: l.shorts || 0, base: l.base || 0, fora: (l.fora || []).length, erro: l.erro })), achados };
  if (simular) return { simulado: true, ...resumo };

  const agora = new Date(quando).toISOString();
  const falharam = lidos.filter((l) => l.erro);
  const volta = estado.volta;
  volta.lidos = (Number(volta.lidos) || 0) + lidos.length - falharam.length;
  volta.erros = (Number(volta.erros) || 0) + falharam.length;
  const deuAVolta = inicio + n >= canais.length;
  // Rodada ruim: mais da metade dos canais não abriu, ou o banco não guardou os achados.
  let novos = 0;
  let naoGuardou = null;
  let anotaErro = false;
  try {
    if (achados.length) {
      novos = Number(await db.rpc(env, 'videos_virais_guardar', { p_videos: achados })) || 0;
      // Só entra no resumo da volta o que foi guardado de verdade.
      volta.achados = [...(volta.achados || []), ...achados.map((a) => ({ t: a.titulo.slice(0, 70), c: a.canal, v: a.views, x: a.vezes }))].sort((a, b) => b.x - a.x).slice(0, 6);
    }
  } catch (e) {
    naoGuardou = String((e && e.message) || e).slice(0, 120).replace(/[.\s]+$/, '') || 'o banco não respondeu';
    console.error('cacador guardar', naoGuardou);
  } finally {
    // O rodízio anda sempre: uma rodada que falhou não fica presa nos mesmos canais (o que não foi guardado volta a
    // aparecer na próxima passada por esses canais, enquanto o Short ainda for recente).
    const ruim = !!naoGuardou || falharam.length * 2 > n;
    anotaErro = ruim && !deuAVolta && !(quando - Date.parse(estado.erro_em || '') < ERRO_DE_NOVO);
    const proximo = {
      cursor: (inicio + n) % canais.length, ultima: agora, volta: deuAVolta ? { lidos: 0, erros: 0, achados: [] } : volta,
      ultima_volta: deuAVolta ? agora : estado.ultima_volta, erro_em: anotaErro ? agora : estado.erro_em,
    };
    await db.insert(env, 'config', { chave: CHAVE, valor: proximo }, { upsert: true, conflito: 'chave', select: 'chave' });
  }
  const motivos = [...new Set(falharam.map((l) => l.erro))].slice(0, 2).join('; ');
  const naoAbriu = (k) => (k === 1 ? 'não abriu' : 'não abriram');
  const turno = (status, resumo, extra = {}) => registrarTurno(env, { agente: AGENTE, onde: 'worker', status, resumo, dados: { canais: volta.lidos, erros: volta.erros, achados: (volta.achados || []).length, ...extra } })
    .catch((e) => console.error('cacador turno', e && e.message));
  if (deuAVolta) {
    // Um turno por volta completa na lista (umas 3 por dia com 30 canais), com o que saiu da curva. A volta em que mais
    // da metade dos canais não abriu, ou que terminou sem guardar, é turno com erro: "olhei 0 canais" não é sem trabalho.
    const total = volta.lidos + volta.erros;
    const voltaRuim = volta.erros > volta.lidos || !!naoGuardou;
    const achou = (volta.achados || []).length;
    const top = (volta.achados || []).slice(0, 3).map((a) => `"${a.t}" (${a.c}: ${milhar(a.v)}, ${String(a.x).replace('.', ',')} vezes a média do canal)`);
    const olhei = `Olhei ${volta.lidos} ${volta.lidos === 1 ? 'canal' : 'canais'}${volta.erros ? ` (${volta.erros} de ${total} ${naoAbriu(volta.erros)})` : ''}.`;
    const texto = [
      olhei,
      achou ? `Fora da curva: ${top.join('; ')}.` : 'Nenhum Short saiu da curva nesta volta.',
      voltaRuim && volta.erros > volta.lidos ? `Mais da metade dos canais não abriu${motivos ? `: ${motivos}` : ''}.` : '',
      naoGuardou ? `Não consegui guardar ${achados.length} ${achados.length === 1 ? 'Short' : 'Shorts'} desta rodada: ${naoGuardou}.` : '',
    ].filter(Boolean).join(' ');
    await turno(voltaRuim ? 'erro' : achou ? 'ok' : 'sem_trabalho', texto);
  } else if (anotaErro) {
    const texto = naoGuardou
      ? `Achei ${achados.length} ${achados.length === 1 ? 'Short' : 'Shorts'} fora da curva e não consegui guardar: ${naoGuardou}. O rodízio seguiu para os próximos canais.`
      : `Nesta rodada, ${falharam.length} de ${n} ${n === 1 ? 'canal' : 'canais'} ${naoAbriu(falharam.length)}${motivos ? `: ${motivos}` : ''}. O rodízio seguiu para os próximos canais.`;
    await turno('erro', texto, { rodada: { canais: n, erros: falharam.length } });
  }
  return { canais: n, achados: achados.length, novos, erros: falharam.length, deu_a_volta: deuAVolta, ...(naoGuardou ? { nao_guardou: naoGuardou } : {}) };
}

// ---------------------------------------------------------------- para o painel e o conector
export async function listarVirais(env, { status = 'novo', dias = 14, limite = 30, idioma = '' } = {}) {
  const filtros = { visto_em: `gte.${new Date(Date.now() - Math.min(90, Math.max(1, Number(dias) || 14)) * DIA).toISOString()}` };
  if (['novo', 'roteiro', 'usado', 'descartado'].includes(status)) filtros.status = `eq.${status}`;
  if (idioma === 'pt' || idioma === 'en') filtros.idioma = `eq.${idioma}`;
  const [itens, linhaCanais, linhaEstado] = await Promise.all([
    db.select(env, 'videos_virais', { filtros, select: 'video_id,canal,idioma,tema,titulo,publicado_em,views,curtidas,base,vezes,por_dia,views_achado,achado_em,visto_em,status,leitura', ordem: 'vezes.desc', limite: Math.min(100, Math.max(1, Number(limite) || 30)) }),
    db.um(env, 'config', { chave: `eq.${CHAVE_CANAIS}` }).catch(() => null),
    db.um(env, 'config', { chave: `eq.${CHAVE}` }).catch(() => null),
  ]);
  const { canais, regua } = lerCanais(linhaCanais);
  return {
    itens: itens.map((v) => ({ ...v, url: `https://www.youtube.com/shorts/${v.video_id}` })),
    canais: canais.length, regua, ultima_rodada: lerEstado(linhaEstado).ultima,
  };
}
