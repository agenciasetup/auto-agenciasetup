// Módulo Instagram: API do Instagram com login do Instagram (conta profissional, sem precisar de Página do Facebook).
// Contrato em worker/plataformas/LEIA.md. Publica post (foto), carrossel (2 a 10 fotos), story e Reels.
// Docs: developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
import { Erro } from '../nucleo/util.js';

const GRAPH = 'https://graph.instagram.com';
// Publicar + métricas (alcance, salvos, compartilhamentos) + comentários e DM do "Comenta X".
const RECURSOS = {
  metricas: 'instagram_business_manage_insights',
  comentarios: 'instagram_business_manage_comments',
  mensagens: 'instagram_business_manage_messages',
};
const ESCOPOS = ['instagram_business_basic', 'instagram_business_content_publish', ...Object.values(RECURSOS)];
const ESPERA_VIDEO_MS = 90_000;

async function chamar(url, opcoes = {}) {
  const r = await fetch(url, opcoes);
  const t = await r.text();
  let d;
  try { d = JSON.parse(t); } catch { d = { erro_bruto: t.slice(0, 300) }; }
  if (!r.ok || d.error) {
    const e = d.error || {};
    const msg = e.error_user_msg || e.message || d.error_message || d.erro_bruto || `HTTP ${r.status}`;
    throw new Erro(r.status >= 500 ? 502 : 400, `Instagram recusou: ${String(msg).slice(0, 240)}`, { codigo: e.code });
  }
  return d;
}

// Segredo colado pelo terminal do Windows pode vir com BOM (U+FEFF) ou quebra de linha; o Instagram recusa o app.
const limpo = (v) => String(v || '').replace(/^﻿/, '').trim();
const app = (env) => ({ id: limpo(env.INSTAGRAM_APP_ID), segredo: limpo(env.INSTAGRAM_APP_SECRET) });

const form = (dados) => ({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(dados) });
const corpo = (dados) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(dados) });
const FORMATO = (p) => (p.media_product_type === 'REELS' ? 'reels' : p.media_type === 'CAROUSEL_ALBUM' ? 'carrossel' : p.media_type === 'VIDEO' ? 'video' : 'post');
const ehJpeg = (u) => /\.jpe?g(\?|$)/i.test(String(u || ''));
const ehVideo = (u) => /\.(mp4|mov)(\?|$)/i.test(String(u || ''));
const imagensDaPeca = (p) => (Array.isArray(p.slides) ? p.slides.map((s) => s && s.imagem_url).filter(Boolean) : []);
const midia = (p, tipo) => (Array.isArray(p.midias) ? p.midias.find((m) => m && m.url && (!tipo || m.tipo === tipo)) : null);
// Itens do carrossel: os slides (imagem ou vídeo, com texto alternativo) ou, sem slides com mídia, as mídias da peça.
function itensDoCarrossel(p) {
  const deSlides = (Array.isArray(p.slides) ? p.slides : []).map((s) => (s && s.video_url ? { tipo: 'video', url: s.video_url } : s && s.imagem_url ? { tipo: 'imagem', url: s.imagem_url, alt: s.alt } : null)).filter(Boolean);
  if (deSlides.length) return deSlides;
  return (Array.isArray(p.midias) ? p.midias : []).filter((m) => m && m.url).map((m) => ({ tipo: m.tipo === 'video' || ehVideo(m.url) ? 'video' : 'imagem', url: m.url, alt: m.alt }));
}
// O que o Instagram aceita além da legenda (peca.opcoes): colaboradores (até 3), localização, capa, áudio e teste do
// Reels. O texto alternativo vai em cada imagem (slides[].alt ou midias[].alt).
function extrasDoPost(op = {}) {
  const e = {};
  const colab = (Array.isArray(op.colaboradores) ? op.colaboradores : []).map((u) => String(u).trim().replace(/^@/, '')).filter((u) => /^[\w.]{1,30}$/.test(u)).slice(0, 3);
  if (colab.length) e.collaborators = JSON.stringify(colab);
  if (op.local_id && /^\d{3,30}$/.test(String(op.local_id))) e.location_id = String(op.local_id);
  return e;
}

// Container de vídeo (Reels, story em vídeo) e de carrossel precisa terminar de processar antes de publicar:
// publicar no mesmo segundo dá "The media is not ready to be published" (o post de 26/10/2026 caiu nisso).
async function esperarPronto(id, token) {
  const ate = Date.now() + ESPERA_VIDEO_MS;
  while (Date.now() < ate) {
    const s = await chamar(`${GRAPH}/${id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`);
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Erro(400, `Instagram não processou a mídia (${s.status || s.status_code}).`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Erro(504, 'O Instagram ainda está processando a mídia. A fila tenta de novo em alguns minutos.');
}

export default {
  id: 'instagram',
  nome: 'Instagram',
  cor: '#E1306C',
  formatos: ['carrossel', 'post', 'story', 'reels'],
  descricao: 'Carrosséis, posts, stories e Reels no perfil profissional.',
  requisitos: [
    'Conta profissional (Empresa ou Criador de conteúdo) no Instagram',
    'App da Meta com o caso de uso "Gerenciar mensagens e conteúdo no Instagram" (API do Instagram com login do Instagram)',
    'Enquanto o app estiver em desenvolvimento, a conta do Instagram precisa ser testadora do app (convite aceito no Instagram)',
    'Imagens em JPEG com endereço público (o Instagram não aceita PNG pela API)',
  ],
  segredos: ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET'],
  disponivel: true,
  recursos: RECURSOS,

  validar(peca) {
    if (!this.formatos.includes(peca.formato)) return `Instagram não publica o formato ${peca.formato}.`;
    const legenda = peca.legenda || '';
    if (legenda.length > 2200) return 'A legenda passa do limite de 2.200 caracteres do Instagram.';
    if ((legenda.match(/#[\p{L}\p{N}_]+/gu) || []).length > 30) return 'O Instagram aceita no máximo 30 hashtags.';
    if (peca.formato === 'carrossel') {
      const itens = itensDoCarrossel(peca);
      if (itens.length < 2 || itens.length > 10) return `Carrossel precisa de 2 a 10 imagens ou vídeos (tem ${itens.length}).`;
      if (itens.some((i) => i.tipo === 'imagem' && !ehJpeg(i.url))) return 'Todas as imagens do carrossel precisam ser JPEG (.jpg).';
      if (itens.some((i) => i.tipo === 'video' && !ehVideo(i.url))) return 'Os vídeos do carrossel precisam ser MP4 ou MOV.';
    }
    const op = peca.opcoes || {};
    if ((op.colaboradores || []).length > 3) return 'O Instagram aceita no máximo 3 colaboradores.';
    if (op.primeiro_comentario && String(op.primeiro_comentario).length > 2200) return 'O primeiro comentário passa de 2.200 caracteres.';
    if (peca.formato === 'post') {
      const u = (midia(peca, 'imagem') || {}).url || imagensDaPeca(peca)[0];
      if (!u) return 'Post precisa de uma imagem (em mídias ou no primeiro slide).';
      if (!ehJpeg(u)) return 'A imagem do post precisa ser JPEG (.jpg).';
    }
    if (peca.formato === 'reels' && !midia(peca, 'video')) return 'Reels precisa de um vídeo em mídias.';
    if (peca.formato === 'story' && !midia(peca)) return 'Story precisa de uma imagem ou vídeo em mídias.';
    return null;
  },

  async urlConectar({ env, estado, retorno }) {
    const q = new URLSearchParams({
      enable_fb_login: '0', force_authentication: '1', client_id: app(env).id, redirect_uri: retorno,
      response_type: 'code', scope: ESCOPOS.join(','), state: estado,
    });
    return `https://www.instagram.com/oauth/authorize?${q}`;
  },

  async concluirConexao({ env, url, retorno }) {
    const code = (url.searchParams.get('code') || '').replace(/#_$/, '');
    if (!code) throw new Erro(400, 'O Instagram não devolveu a autorização.');
    const { id, segredo } = app(env);
    // 1. Código vira token curto (1 hora).
    const curto = await chamar('https://api.instagram.com/oauth/access_token', form({
      client_id: id, client_secret: segredo, grant_type: 'authorization_code', redirect_uri: retorno, code,
    }));
    const c = Array.isArray(curto.data) ? curto.data[0] : curto;
    // 2. Token curto vira token longo (60 dias, renovável).
    const longo = await chamar(`${GRAPH}/access_token?${new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: segredo, access_token: c.access_token })}`);
    // 3. Quem é a conta.
    const eu = await chamar(`${GRAPH}/me?fields=user_id,username,name,profile_picture_url&access_token=${encodeURIComponent(longo.access_token)}`);
    const escopos = Array.isArray(c.permissions) ? c.permissions : String(c.permissions || '').split(',').filter(Boolean);
    return {
      conta_id: String(eu.user_id || c.user_id),
      conta_nome: eu.username ? `@${eu.username}` : eu.name || String(c.user_id),
      conta_foto: eu.profile_picture_url || null,
      credenciais: { token: longo.access_token, usuario: String(eu.user_id || c.user_id), criado: Date.now() },
      escopos,
      expira_em: new Date(Date.now() + (Number(longo.expires_in) || 60 * 86400) * 1000).toISOString(),
    };
  },

  // Token longo vale 60 dias; renova com pelo menos 24 horas de vida.
  async renovar({ credenciais }) {
    if (credenciais.criado && Date.now() - credenciais.criado < 24 * 3600 * 1000) return null;
    const r = await chamar(`${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(credenciais.token)}`);
    return { credenciais: { ...credenciais, token: r.access_token, criado: Date.now() }, expira_em: new Date(Date.now() + (Number(r.expires_in) || 60 * 86400) * 1000).toISOString() };
  },

  async publicar({ peca, credenciais }) {
    const { token, usuario } = credenciais;
    const t = encodeURIComponent(token);
    const criar = (dados) => chamar(`${GRAPH}/${usuario}/media?access_token=${t}`, form(dados));
    const avisos = [];
    // Opção que o Instagram recusar (conta sem a função, parâmetro novo): publica sem ela e avisa. O post vale mais.
    const criarCom = async (dados, extras) => {
      if (!Object.keys(extras).length) return criar(dados);
      try {
        return await criar({ ...dados, ...extras });
      } catch (e) {
        if (e.status >= 500 || (e.extra && [4, 10, 17, 32, 190, 200, 613].includes(e.extra.codigo))) throw e;
        avisos.push(`Saiu sem ${Object.keys(extras).join(', ')}: ${e.message}`);
        return criar(dados);
      }
    };
    const op = peca.opcoes || {};
    const extras = extrasDoPost(op);
    const legenda = peca.legenda || '';
    let container;
    if (peca.formato === 'carrossel') {
      const filhos = [];
      for (const i of itensDoCarrossel(peca)) {
        if (i.tipo === 'video') {
          const id = (await criar({ media_type: 'VIDEO', video_url: i.url, is_carousel_item: 'true' })).id;
          await esperarPronto(id, token);
          filhos.push(id);
        } else filhos.push((await criarCom({ image_url: i.url, is_carousel_item: 'true' }, i.alt ? { alt_text: String(i.alt).slice(0, 1000) } : {})).id);
      }
      container = (await criarCom({ media_type: 'CAROUSEL', children: filhos.join(','), caption: legenda }, extras)).id;
      await esperarPronto(container, token);
    } else if (peca.formato === 'post') {
      const m = midia(peca, 'imagem') || { url: imagensDaPeca(peca)[0], alt: (peca.slides || [])[0] && peca.slides[0].alt };
      container = (await criarCom({ image_url: m.url, caption: legenda }, { ...extras, ...(m.alt ? { alt_text: String(m.alt).slice(0, 1000) } : {}) })).id;
    } else if (peca.formato === 'reels') {
      const reels = {
        ...extras,
        ...(op.capa_url ? { cover_url: op.capa_url } : op.capa_ms != null ? { thumb_offset: String(Math.max(0, Math.round(Number(op.capa_ms) || 0))) } : {}),
        ...(op.audio_nome ? { audio_name: String(op.audio_nome).slice(0, 100) } : {}),
        ...(['MANUAL', 'SS_PERFORMANCE'].includes(op.teste) ? { trial_params: JSON.stringify({ graduation_strategy: op.teste }) } : {}),
      };
      container = (await criarCom({ media_type: 'REELS', video_url: midia(peca, 'video').url, caption: legenda, share_to_feed: op.no_feed === false ? 'false' : 'true' }, reels)).id;
      await esperarPronto(container, token);
    } else if (peca.formato === 'story') {
      const m = midia(peca);
      const video = m.tipo === 'video' || ehVideo(m.url);
      container = (await criar(video ? { media_type: 'STORIES', video_url: m.url } : { media_type: 'STORIES', image_url: m.url })).id;
      if (video) await esperarPronto(container, token);
    } else throw new Erro(400, `Formato não suportado: ${peca.formato}.`);
    const pub = await chamar(`${GRAPH}/${usuario}/media_publish?access_token=${t}`, form({ creation_id: container }));
    let link = null;
    try { link = (await chamar(`${GRAPH}/${pub.id}?fields=permalink&access_token=${t}`)).permalink || null; } catch {}
    // O primeiro comentário sai do próprio perfil, logo depois de publicar. Se falhar, o post já está no ar.
    if (op.primeiro_comentario && peca.formato !== 'story') {
      try { await chamar(`${GRAPH}/${pub.id}/comments?access_token=${t}`, form({ message: String(op.primeiro_comentario).slice(0, 2200) })); }
      catch (e) { avisos.push(`O primeiro comentário não saiu: ${e.message}`); }
    }
    if (avisos.length) console.error('instagram publicar', avisos.join(' | '));
    return { id_na_rede: pub.id, url_publicada: link, avisos };
  },

  // ---------------------------------------------------------------- desempenho
  async lerConta({ credenciais }) {
    const d = await chamar(`${GRAPH}/me?fields=username,followers_count,media_count&access_token=${encodeURIComponent(credenciais.token)}`);
    return { usuario: d.username || null, seguidores: d.followers_count ?? null, posts: d.media_count ?? null };
  },

  // Uma página de posts, do mais novo para o mais antigo. "depois" é o cursor da página seguinte.
  async lerPosts({ credenciais, limite = 50, depois }) {
    const q = new URLSearchParams({
      fields: 'id,caption,media_type,media_product_type,timestamp,like_count,comments_count,permalink,thumbnail_url,media_url',
      limit: String(Math.min(100, limite)), access_token: credenciais.token, ...(depois ? { after: depois } : {}),
    });
    const d = await chamar(`${GRAPH}/${credenciais.usuario || 'me'}/media?${q}`);
    const itens = (d.data || []).map((p) => ({
      id_na_rede: String(p.id), formato: FORMATO(p), legenda: p.caption || '', link: p.permalink || null,
      miniatura_url: p.thumbnail_url || (p.media_type !== 'VIDEO' ? p.media_url : null) || null,
      publicado_em: p.timestamp || null, curtidas: p.like_count ?? null, comentarios: p.comments_count ?? null,
    }));
    return { itens, depois: d.paging && d.paging.next ? d.paging.cursors && d.paging.cursors.after : null };
  },

  // Alcance, salvos, compartilhamentos e visualizações de um post (precisa da permissão de métricas).
  async lerMetricas({ credenciais, post }) {
    const pedir = (m) => chamar(`${GRAPH}/${post.id_na_rede}/insights?metric=${m}&access_token=${encodeURIComponent(credenciais.token)}`);
    let d;
    try {
      d = await pedir('reach,saved,shares,views');
    } catch (e) {
      // Alguns tipos de post não têm "views": tenta sem. Permissão ou token com problema sobem direto.
      if (e.extra && [10, 190, 200].includes(e.extra.codigo)) throw e;
      d = await pedir('reach,saved,shares');
    }
    const v = Object.fromEntries((d.data || []).map((x) => [x.name, (x.values && x.values[0] && x.values[0].value) ?? (x.total_value && x.total_value.value) ?? null]));
    return { alcance: v.reach ?? null, salvos: v.saved ?? null, compartilhamentos: v.shares ?? null, visualizacoes: v.views ?? null };
  },

  // ---------------------------------------------------------------- "Comenta X"
  // Comentários de um post mais novos que "desde" (milissegundos). A Meta devolve os mais novos primeiro.
  // pessoa_id (de "from"): quem comentou, para mandar um direct só por pessoa em cada post.
  async lerComentarios({ credenciais, post_id, desde = 0, paginas = 2 }) {
    let url = `${GRAPH}/${post_id}/comments?fields=id,text,username,timestamp,from&limit=50&access_token=${encodeURIComponent(credenciais.token)}`;
    const itens = [];
    for (let i = 0; i < paginas && url; i++) {
      const d = await chamar(url);
      const lote = (d.data || []).map((c) => ({ id: String(c.id), texto: c.text || '', usuario: c.username || (c.from && c.from.username) || '', pessoa_id: c.from && c.from.id ? String(c.from.id) : null, quando: c.timestamp || null }));
      itens.push(...lote);
      if (lote.some((c) => c.quando && Date.parse(c.quando) <= desde)) break;
      url = d.paging && d.paging.next ? d.paging.next : null;
    }
    return itens.filter((c) => !c.quando || Date.parse(c.quando) > desde);
  },

  // Resposta pública embaixo do comentário.
  async responderComentario({ credenciais, comentario_id, texto }) {
    return chamar(`${GRAPH}/${comentario_id}/replies?access_token=${encodeURIComponent(credenciais.token)}`, form({ message: texto }));
  },

  // DM para quem comentou (resposta privada): uma por comentário, até 7 dias depois dele. "formas": a mensagem em
  // ordem de preferência (o botão, depois só o texto); a seguinte só vai se a Meta recusar a anterior, e um envio
  // recusado não conta. Devolve recipient_id (o id do direct da pessoa, que volta quando ela toca no botão).
  async mensagemPrivada({ credenciais, comentario_id, texto, formas }) {
    return enviarFormas(credenciais, { recipient: { comment_id: comentario_id } }, formas || [{ text: texto }]);
  },

  // Direct numa conversa aberta (a pessoa escreveu ou tocou num botão nas últimas 24 horas).
  async mandarDirect({ credenciais, para, texto, formas }) {
    return enviarFormas(credenciais, { recipient: { id: para } }, formas || [{ text: texto }]);
  },

  // Nome, @ e se segue o perfil. A Meta só mostra depois que a pessoa escreveu ou tocou num botão do direct.
  async perfil({ credenciais, para }) {
    const d = await chamar(`${GRAPH}/${para}?fields=name,username,is_user_follow_business&access_token=${encodeURIComponent(credenciais.token)}`);
    return { nome: d.name || '', usuario: d.username || '', segue: typeof d.is_user_follow_business === 'boolean' ? d.is_user_follow_business : null };
  },
};

// Token morto, permissão, limite: não adianta tentar outra forma da mensagem.
const NAO_TENTAR = new Set([4, 10, 17, 32, 190, 200, 368, 613]);
async function enviarFormas(credenciais, base, formas) {
  const url = `${GRAPH}/${credenciais.usuario || 'me'}/messages?access_token=${encodeURIComponent(credenciais.token)}`;
  for (let i = 0; ; i++) {
    try {
      return await chamar(url, corpo({ ...base, message: formas[i] }));
    } catch (e) {
      if (i === formas.length - 1 || NAO_TENTAR.has(e.extra && e.extra.codigo) || e.status >= 500) throw e;
    }
  }
}
