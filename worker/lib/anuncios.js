// Anúncios inteligentes dos nossos produtos + espaço do AdSense.
// A escolha é pelo assunto da página: quem tem tag ou categoria em comum ganha pontos; o peso desempata.
import { db } from '../nucleo/db.js';
import { esc, urlSegura } from '../nucleo/util.js';

let cache = { ate: 0, lista: [] };
async function ativos(env) {
  if (cache.ate > Date.now()) return cache.lista;
  const agora = Date.now();
  const lista = await db.select(env, 'anuncios', {
    filtros: { ativo: 'eq.true' },
    select: 'id,titulo,texto,cta,imagem_url,link,alvo_tags,alvo_categorias,posicoes,peso,inicio,fim,produto:produtos(slug,nome,ativo)',
  });
  const noPrazo = (a) => (!a.inicio || Date.parse(a.inicio) <= agora) && (!a.fim || Date.parse(a.fim) >= agora);
  cache = { ate: agora + 60_000, lista: lista.filter((a) => noPrazo(a) && (!a.produto || a.produto.ativo)) };
  return cache.lista;
}

// contexto: { tags: [], categoria_id }. Devolve um anúncio por posição pedida, sem repetir.
export async function escolher(env, posicoes, contexto = {}) {
  let lista;
  try { lista = await ativos(env); } catch { return {}; }
  const tags = new Set((contexto.tags || []).map((t) => t.toLowerCase()));
  const usados = new Set();
  const saida = {};
  for (const pos of posicoes) {
    const candidatos = lista
      .filter((a) => a.posicoes.includes(pos) && !usados.has(a.id))
      .map((a) => {
        const comuns = a.alvo_tags.filter((t) => tags.has(t.toLowerCase())).length;
        const cat = contexto.categoria_id && a.alvo_categorias.includes(contexto.categoria_id) ? 2 : 0;
        const geral = !a.alvo_tags.length && !a.alvo_categorias.length ? 0.5 : 0;
        return { a, nota: (comuns * 3 + cat + geral) * a.peso + Math.random() * a.peso };
      })
      .filter((x) => x.nota > 0)
      .sort((x, y) => y.nota - x.nota);
    if (candidatos[0]) { saida[pos] = candidatos[0].a; usados.add(candidatos[0].a.id); }
  }
  return saida;
}

export function htmlAnuncio(a, pos) {
  if (!a) return '';
  return `<aside class="anuncio anuncio-${esc(pos)}" data-anuncio="${esc(a.id)}">
  <span class="anuncio-selo">Da Agência Setup</span>
  ${a.imagem_url ? `<img src="${esc(urlSegura(a.imagem_url))}" alt="" loading="lazy">` : ''}
  <div class="anuncio-texto"><strong>${esc(a.titulo)}</strong>${a.texto ? `<p>${esc(a.texto)}</p>` : ''}</div>
  <a class="bt bt-marca" href="/ir/${esc(a.id)}" rel="sponsored">${esc(a.cta)}</a>
</aside>`;
}

// Espaço do AdSense: só aparece quando o cliente (ca-pub-...) está configurado e ligado.
export function htmlAdsense(cfg, slot = '') {
  const ad = cfg && cfg.adsense;
  if (!ad || !ad.ativo || !/^ca-pub-\d+$/.test(ad.cliente || '')) return '';
  return `<div class="adsense"><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(ad.cliente)}"${slot ? ` data-ad-slot="${esc(slot)}"` : ''} data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`;
}

export async function contar(env, ids, campo) {
  if (!ids.length) return;
  try { await db.rpc(env, 'contar_anuncio', { p_ids: ids, p_campo: campo }); } catch {}
}
