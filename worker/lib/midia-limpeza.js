// "Postou, apagou" no Worker (pedido do dono em 10/11/2026): a peça saiu, passaram 2 dias, o original (imagem ou vídeo)
// dá lugar a uma miniatura leve e sai do armazenamento. Peça em rascunho, aprovada, agendada, publicando, com erro ou
// cancelada nunca perde nada.
//
// ESCRITA, NÃO LIGADA. Ninguém chama esta função e, mesmo chamada, ela só simula enquanto o Worker não tiver
// MIDIA_LIMPEZA=ligada. O que já está no bucket se limpa pelo computador: node scripts/midia-limpar.mjs.
//
// O desenho, para caber no plano grátis (50 chamadas externas e pouco processador por execução):
//   Uma peça por execução, uma vez por hora (num minuto vazio do relógio), a mais antiga primeiro. Umas 11 chamadas.
//   Passo 1, soltar: a função midia_usos diz quais arquivos da peça só peças já publicadas citam. Esses saem da peça,
//     a miniatura entra no lugar (slides[0].imagem_url ou midias[0]) e a peça ganha opcoes.midia_limpa. Os caminhos
//     soltos vão para a fila em config.midia_limpeza. Nada é apagado neste passo.
//   Passo 2, apagar: até 40 caminhos da fila passam de novo pela midia_usos, agora contando QUALQUER linha do banco.
//     Só o que ninguém mais cita é apagado, pelo Storage. A mesma arte em duas peças (Instagram e Facebook) sai
//     quando a segunda peça soltar; arquivo que um recurso do site usa nunca sai.
//
// A miniatura: o Worker não tem sharp e não lê vídeo. Por isso ela deve NASCER COM A PEÇA, onde existe ferramenta:
//   nos scripts do computador (templates/carrossel/entregar.mjs, templates/frase/entregar.mjs, entregar-videos.mjs),
//   com sharp e ffmpeg, e no Novo post do painel, com o canvas do navegador (imagem reduzida ou um quadro do vídeo).
//   O endereço vai em opcoes.miniatura_url. Com ela pronta, esta rotina não baixa nem converte nada.
//   Peça sem opcoes.miniatura_url (as de hoje): tenta, nesta ordem, a ligação IMAGES da Cloudflare (se existir no
//   wrangler), a redução da Cloudflare no próprio fetch (cf.image) e a miniatura que a rede devolve
//   (posts_redes.miniatura_url, que no Reels é a capa). Se o resultado passar de 200 KB não é miniatura: a peça fica
//   marcada e o script do computador resolve.
//
// O que falta para ligar (cada item espera o ok do dono):
//   1. Migration nova com a função midia_usos (rascunho em _local/midia-limpeza/migration-rascunho.sql).
//   2. limparOpcoes, em acoes.js, aceitar miniatura_url; os scripts de entrega e o Novo post criarem a miniatura.
//   3. Uma linha em rodarMinuto, no relogio.js:
//        if (new Date(quando).getUTCMinutes() === 37) etapas.push(['midia', () => limparMidiasPublicadas(env)]);
//   4. MIDIA_LIMPEZA=ligada no Worker (npm run segredos -- MIDIA_LIMPEZA). Sem isso, só simula.
import { auditar } from '../nucleo/auth.js';
import { db, enviarArquivo } from '../nucleo/db.js';

const BUCKET = 'midia';
const PASTA_MINI = 'miniaturas';
const DIAS = 2; // espera depois de publicar; o Reels já terminou de processar antes de a peça virar "publicado"
const CHAVE = 'midia_limpeza';
const LARGURA = 320;
const MINI_MAX = 200 * 1024;
const LOTE_APAGAR = 40; // o limite da função midia_usos
const ESQUECER_DEPOIS = 30 * 86400_000; // caminho que continua citado sai da fila depois de 30 dias
// Pastas que não são mídia de post: nunca saem por aqui.
const PASTAS_PROTEGIDAS = [PASTA_MINI, 'curso', 'duvidas-da-fe', 'escritorio', 'alunos', 'entregas', 'email', 'combo-black'];

const ehVideoUrl = (u) => /\.(mp4|mov|m4v|webm)(\?|$)/i.test(String(u || ''));
// O caminho dentro do bucket, se o endereço for do nosso "midia".
function caminhoDaUrl(env, u) {
  const s = String(u || '');
  if (!env.SUPABASE_URL || !s.startsWith(env.SUPABASE_URL)) return null;
  const m = s.match(/\/storage\/v1\/object\/public\/midia\/([^?#]+)/);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
}
// As mídias da peça nos campos que o painel e as redes leem. opcoes.miniatura_url fica de fora de propósito.
function midiasDaPeca(env, p) {
  const l = [];
  (Array.isArray(p.slides) ? p.slides : []).forEach((s) => {
    if (s && s.imagem_url) l.push({ url: s.imagem_url, tipo: 'imagem' });
    if (s && s.video_url) l.push({ url: s.video_url, tipo: 'video' });
  });
  (Array.isArray(p.midias) ? p.midias : []).forEach((m) => {
    if (m && m.url) l.push({ url: m.url, tipo: m.tipo === 'video' || ehVideoUrl(m.url) ? 'video' : 'imagem' });
  });
  if (p.opcoes && p.opcoes.capa_url) l.push({ url: p.opcoes.capa_url, tipo: 'imagem', capa: true });
  return l.map((x) => ({ ...x, caminho: caminhoDaUrl(env, x.url) })).filter((x) => x.caminho && !PASTAS_PROTEGIDAS.includes(x.caminho.split('/')[0]));
}

// A imagem reduzida: pela ligação IMAGES ou pela redução da Cloudflare no fetch. Sem nenhuma das duas o fetch
// devolve o arquivo como está, e o teto de 200 KB decide se serve.
async function reduzir(env, url) {
  if (env.IMAGES) {
    const r = await fetch(url);
    if (!r.ok || !r.body) return null;
    const saida = await env.IMAGES.input(r.body).transform({ width: LARGURA }).output({ format: 'image/webp', quality: 72 });
    return { corpo: await saida.response().arrayBuffer(), tipo: 'image/webp' };
  }
  const r = await fetch(url, { cf: { image: { width: LARGURA, format: 'webp', quality: 72 } } });
  if (!r.ok) return null;
  const tipo = (r.headers.get('content-type') || '').split(';')[0];
  if (!tipo.startsWith('image/')) return null;
  return { corpo: await r.arrayBuffer(), tipo };
}

// O endereço da miniatura da peça, ou null quando não dá para ter uma leve (a peça fica para o computador).
async function miniaturaDaPeca(env, p, ligada) {
  const pronta = p.opcoes && p.opcoes.miniatura_url;
  if (pronta && /^https:\/\//.test(String(pronta))) return String(pronta);
  const itens = midiasDaPeca(env, p);
  const fontes = [(itens.find((m) => m.tipo === 'imagem' && !m.capa) || {}).url, (itens.find((m) => m.capa) || {}).url].filter(Boolean);
  if (!fontes.length || (itens[0] && itens[0].tipo === 'video')) {
    // Vídeo sem capa: a miniatura que a rede devolve (no Reels é a capa escolhida pelo Instagram).
    const post = await db.um(env, 'posts_redes', { peca_id: `eq.${p.id}`, miniatura_url: 'not.is.null' }, 'miniatura_url');
    if (post && post.miniatura_url) fontes.unshift(post.miniatura_url);
  }
  for (const url of fontes.slice(0, 2)) {
    const m = await reduzir(env, url).catch(() => null);
    if (!m || !m.corpo || m.corpo.byteLength < 200 || m.corpo.byteLength > MINI_MAX) continue;
    if (!ligada) return `(simulação) ${PASTA_MINI}/${p.id}`;
    const ext = m.tipo === 'image/webp' ? 'webp' : m.tipo === 'image/png' ? 'png' : 'jpg';
    return enviarArquivo(env, BUCKET, `${PASTA_MINI}/${p.id}.${ext}`, m.corpo, m.tipo);
  }
  return null;
}

// A peça sem os originais que saem: a miniatura no primeiro slide (ou na primeira mídia), o resto igual.
function pecaLimpa(env, p, saem, mini) {
  const sai = (u) => { const c = caminhoDaUrl(env, u); return !!c && saem.has(c); };
  let mudouSlides = false;
  const slides = (Array.isArray(p.slides) ? p.slides : []).map((s) => {
    if (!s || typeof s !== 'object') return s;
    const n = { ...s };
    if (n.video_url && sai(n.video_url)) { delete n.video_url; mudouSlides = true; }
    if (n.imagem_url && sai(n.imagem_url)) { delete n.imagem_url; mudouSlides = true; }
    return n;
  });
  if (mudouSlides && slides[0] && typeof slides[0] === 'object' && !slides[0].imagem_url) slides[0].imagem_url = mini;
  const antes = Array.isArray(p.midias) ? p.midias : [];
  const midias = antes.filter((m) => !m || !sai(m.url));
  const temImagem = midias.some((m) => m && m.url && m.tipo !== 'video') || slides.some((s) => s && s.imagem_url);
  if (midias.length !== antes.length && !temImagem) midias.unshift({ url: mini, tipo: 'imagem', miniatura: true });
  const opcoes = { ...(p.opcoes && typeof p.opcoes === 'object' ? p.opcoes : {}) };
  if (opcoes.capa_url && sai(opcoes.capa_url)) delete opcoes.capa_url;
  return { slides, midias, opcoes };
}

// Só marca a peça (nada para soltar, ou sem miniatura leve), para ela não voltar na próxima hora.
async function marcar(env, p, nota, ligada) {
  if (ligada) await db.update(env, 'pecas', { id: `eq.${p.id}`, status: 'eq.publicado' }, { opcoes: { ...(p.opcoes || {}), midia_limpa: { em: new Date().toISOString(), arquivos: 0, ...nota } } }, 'id');
  return { peca: p.id, soltos: [], ...nota };
}

// Passo 1: o que esta peça pode soltar, a miniatura no lugar e os caminhos para a fila.
async function soltarDaPeca(env, p, ligada) {
  const caminhos = [...new Set(midiasDaPeca(env, p).map((m) => m.caminho))];
  if (!caminhos.length) return marcar(env, p, { nada: true }, ligada);
  // Citado por rascunho, agendada, cancelada, recurso, landing, aula, config: fica. Peça publicada há tempo não conta.
  const emUso = new Set(await db.rpc(env, 'midia_usos', { p_caminhos: caminhos.slice(0, LOTE_APAGAR), p_dias: DIAS }));
  const saem = new Set(caminhos.slice(0, LOTE_APAGAR).filter((c) => !emUso.has(c)));
  if (!saem.size) return marcar(env, p, { nada: true }, ligada);
  const mini = await miniaturaDaPeca(env, p, ligada);
  if (!mini) return marcar(env, p, { sem_miniatura: true }, ligada);
  if (!ligada) return { peca: p.id, soltos: [...saem], miniatura: mini, simulado: true };
  const nova = pecaLimpa(env, p, saem, mini);
  nova.opcoes.midia_limpa = { em: new Date().toISOString(), miniatura: mini, arquivos: saem.size };
  // A troca só vale se a peça continua publicada e ninguém mexeu nela desde a leitura.
  const r = await db.update(env, 'pecas', { id: `eq.${p.id}`, status: 'eq.publicado', atualizado_em: `eq.${p.atualizado_em}` }, nova, 'id');
  if (!r || !r.length) return { peca: p.id, soltos: [], mudou: true };
  return { peca: p.id, soltos: [...saem], miniatura: mini };
}

// Passo 2: da fila, só sai o que nenhuma linha do banco cita mais. Devolve os caminhos apagados.
async function apagarSoltos(env, fila, ligada) {
  const lote = fila.slice(0, LOTE_APAGAR);
  if (!lote.length) return [];
  const citados = new Set(await db.rpc(env, 'midia_usos', { p_caminhos: lote.map((f) => f.c), p_dias: null }));
  const livres = lote.filter((f) => !citados.has(f.c)).map((f) => f.c);
  if (!livres.length || !ligada) return ligada ? [] : livres;
  const k = env.SUPABASE_SECRET_KEY;
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: livres }),
  });
  if (!r.ok) { console.error('midia apagar', r.status, (await r.text()).slice(0, 200)); return []; }
  const j = await r.json().catch(() => []);
  return (Array.isArray(j) ? j : []).map((o) => o && o.name).filter(Boolean);
}

// A rotina. limite: peças por execução (1 no plano grátis; com WORKERS_PAGO pode subir).
export async function limparMidiasPublicadas(env, { limite = env.WORKERS_PAGO ? 3 : 1 } = {}) {
  const ligada = env.MIDIA_LIMPEZA === 'ligada';
  const agora = Date.now();
  const [linha, pecas] = await Promise.all([
    db.um(env, 'config', { chave: `eq.${CHAVE}` }),
    db.select(env, 'pecas', {
      filtros: { status: 'eq.publicado', id_na_rede: 'not.is.null', publicado_em: `lt.${new Date(agora - DIAS * 86400_000).toISOString()}`, 'opcoes->midia_limpa': 'is.null' },
      select: 'id,rede,formato,publicado_em,atualizado_em,slides,midias,opcoes', ordem: 'publicado_em.asc', limite,
    }),
  ]);
  const estado = { fila: [], ...((linha && linha.valor) || {}) };
  const feito = { ligada, pecas: [], apagados: [] };
  for (const p of pecas) {
    const r = await soltarDaPeca(env, p, ligada);
    feito.pecas.push(r);
    for (const c of r.soltos) if (!estado.fila.some((f) => f.c === c)) estado.fila.push({ c, p: p.id, desde: agora });
    if (ligada && r.soltos.length) await auditar(env, null, 'midia.limpar', `pecas:${p.id}`, { arquivos: r.soltos.length, miniatura: r.miniatura });
  }
  feito.apagados = await apagarSoltos(env, estado.fila, ligada);
  if (ligada) {
    const fora = new Set(feito.apagados);
    // Quem foi conferido e continua citado vai para o fim da fila; depois de 30 dias sai dela.
    const conferidos = estado.fila.slice(0, LOTE_APAGAR).filter((f) => !fora.has(f.c) && agora - f.desde < ESQUECER_DEPOIS);
    estado.fila = [...estado.fila.slice(LOTE_APAGAR), ...conferidos];
    estado.ultima = new Date(agora).toISOString();
    estado.apagados_total = (estado.apagados_total || 0) + feito.apagados.length;
    if (pecas.length || feito.apagados.length || conferidos.length) await db.insert(env, 'config', { chave: CHAVE, valor: estado, atualizado_em: new Date(agora).toISOString() }, { upsert: true, conflito: 'chave', select: 'chave' });
  }
  feito.fila = estado.fila.length;
  return feito;
}
