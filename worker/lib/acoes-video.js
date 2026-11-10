// O setor de vídeo (painel e conector): os Shorts que saíram da curva, a lista de canais seguidos e a Roteirista.
// A lógica mora em agentes/cacador-de-virais.js e agentes/roteirista.js. Cargo e auditoria em toda escrita.
import { auditar, exigir } from '../nucleo/auth.js';
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { CHAVE_CANAIS, REGUA, canalValido, feedDe, lerFeed, listarVirais, medir, rodarCacadorDeVirais } from './agentes/cacador-de-virais.js';
import { rodarRoteirista } from './agentes/roteirista.js';

const limpo = (v, max = 80) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export async function verVideosVirais(x, f = {}) {
  exigir(x.u, 'pautas.ver');
  return listarVirais(x.env, f || {});
}

export async function verCanaisDeVideo(x) {
  exigir(x.u, 'pautas.ver');
  const c = await db.um(x.env, 'config', { chave: `eq.${CHAVE_CANAIS}` });
  const v = (c && c.valor) || {};
  return { canais: Array.isArray(v.canais) ? v.canais : [], regua: { ...REGUA, ...(v.regua || {}) } };
}

// Põe, muda ou tira um canal da lista. O id é o do YouTube ("UC" e mais 22 letras); scripts/video-canais.mjs acha o id
// pelo @ do canal. Antes de guardar, o Worker lê o feed de Shorts: canal com menos de 3 Shorts não entra, porque não
// dá para saber o que é fora da curva nele.
export async function salvarCanalDeVideo(x, d = {}) {
  exigir(x.u, 'pautas.editar');
  const id = String(d.id || '').trim();
  if (!canalValido(id)) throw new Erro(400, 'O id do canal é o do YouTube: "UC" e mais 22 letras.');
  const atual = await db.um(x.env, 'config', { chave: `eq.${CHAVE_CANAIS}` });
  const v = (atual && atual.valor) || {};
  const antes = Array.isArray(v.canais) ? v.canais : [];
  const canais = antes.filter((c) => c && c.id !== id);
  let lido = null;
  if (!d.tirar) {
    if (canais.length >= 80) throw new Erro(400, 'A lista aceita até 80 canais. Tire um antes de pôr outro.');
    const r = await fetch(feedDe(id), { headers: { 'user-agent': 'Mozilla/5.0 (compatible; radar/1.0)' }, signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (!r || !r.ok) throw new Erro(400, `Não consegui ler os Shorts desse canal${r ? ` (o YouTube respondeu ${r.status})` : ''}.`);
    const f = lerFeed(await r.text());
    if (f.itens.length < 3) throw new Erro(400, 'Esse canal tem menos de 3 Shorts. Não dá para saber o que é fora da curva nele.');
    lido = { nome: f.canal, shorts: f.itens.length, base: medir(f.itens).base };
    const velho = antes.find((c) => c && c.id === id) || {};
    canais.push({
      id, nome: limpo(d.nome) || f.canal || velho.nome || id, idioma: d.idioma === 'en' ? 'en' : 'pt',
      tema: limpo(d.tema, 30) || velho.tema || null, arroba: limpo(d.arroba, 40).replace(/^@/, '') || velho.arroba || null,
      desde: velho.desde || new Date().toISOString().slice(0, 10),
    });
  } else if (canais.length === antes.length) throw new Erro(404, 'Esse canal não está na lista.');
  await db.insert(x.env, 'config', { chave: CHAVE_CANAIS, valor: { ...v, canais } }, { upsert: true, conflito: 'chave', select: 'chave' });
  await auditar(x.env, x.u, d.tirar ? 'video.canal.tirar' : 'video.canal.salvar', `canal:${id}`, { total: canais.length });
  return { ok: true, canais: canais.length, lido };
}

// A régua do que é fora da curva: quantas vezes a média do canal, o mínimo de visualizações e a idade em dias.
export async function salvarReguaDeVideo(x, d = {}) {
  exigir(x.u, 'pautas.editar');
  const num = (v, min, max) => { const n = Number(v); if (!Number.isFinite(n) || n < min || n > max) throw new Erro(400, `Valor fora do intervalo (${min} a ${max}).`); return n; };
  const regua = {};
  if (d.vezes !== undefined) regua.vezes = num(d.vezes, 1.5, 50);
  if (d.views !== undefined) regua.views = Math.round(num(d.views, 1000, 10_000_000));
  if (d.views_pt !== undefined) regua.views_pt = Math.round(num(d.views_pt, 500, 10_000_000));
  if (d.dias !== undefined) regua.dias = Math.round(num(d.dias, 2, 30));
  const atual = await db.um(x.env, 'config', { chave: `eq.${CHAVE_CANAIS}` });
  const v = (atual && atual.valor) || {};
  const nova = { ...REGUA, ...(v.regua || {}), ...regua };
  await db.insert(x.env, 'config', { chave: CHAVE_CANAIS, valor: { ...v, regua: nova } }, { upsert: true, conflito: 'chave', select: 'chave' });
  await auditar(x.env, x.u, 'video.regua', `config:${CHAVE_CANAIS}`, regua);
  return { ok: true, regua: nova };
}

// Marca um viral: usado (virou vídeo nosso), descartado (não serve) ou novo (volta para a fila da Roteirista).
export async function marcarVideoViral(x, id, status) {
  exigir(x.u, 'pautas.editar');
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(String(id || ''))) throw new Erro(400, 'Id de vídeo inválido.');
  if (!['novo', 'usado', 'descartado'].includes(status)) throw new Erro(400, 'Marque como novo, usado ou descartado.');
  const [r] = await db.update(x.env, 'videos_virais', { video_id: `eq.${id}` }, { status }, 'video_id,status');
  if (!r) throw new Erro(404, 'Não achei esse vídeo.');
  await auditar(x.env, x.u, 'video.viral.marcar', `video:${id}`, { status });
  return { ok: true, ...r };
}

// O Caçador de virais agora, sem gravar nada: lê os próximos canais da vez e devolve a conta.
export async function testarCacadorDeVirais(x, d = {}) {
  exigir(x.u, 'pautas.ver');
  return rodarCacadorDeVirais(x.env, Date.now(), { simular: true, quantos: Math.min(6, Math.max(1, Number(d.quantos) || 4)) });
}

// O Caçador de verdade, fora da hora: lê os próximos canais da vez e guarda o que saiu da curva (não gasta IA).
export async function rodarCacadorAgora(x, d = {}) {
  exigir(x.u, 'pautas.editar');
  const r = await rodarCacadorDeVirais(x.env, Date.now(), { quantos: Math.min(8, Math.max(1, Number(d.quantos) || 4)) });
  await auditar(x.env, x.u, 'video.cacador.rodar', 'agente:cacador-de-ganchos', { canais: r.canais, achados: r.achados });
  return r;
}

// A Roteirista agora (gasta uma chamada ao Claude, dentro do teto do dia). simular: mostra o que ela leria, sem gastar.
export async function rodarRoteiristaAgora(x, d = {}) {
  exigir(x.u, d.simular ? 'pautas.ver' : 'pautas.editar');
  const r = await rodarRoteirista(x.env, Date.now(), { forcar: true, simular: !!d.simular });
  if (!d.simular) await auditar(x.env, x.u, 'video.roteirista.rodar', 'agente:roteirista', { roteiros: r.roteiros || 0, pulou: r.pulou || null });
  return r;
}
