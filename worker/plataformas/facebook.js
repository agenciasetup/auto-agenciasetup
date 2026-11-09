// Módulo Facebook (Página). Contrato em worker/plataformas/LEIA.md.
// Login do Facebook para Empresas (config_id, com as permissões de Página escolhidas no app da Meta).
// A pessoa entra com a conta dela e libera a Página; cada Página liberada vira uma conexão com o token da Página
// (tirado de um token de usuário de longa duração, ele não vence sozinho).
// Docs: developers.facebook.com/docs/pages-api
import { Erro } from '../nucleo/util.js';

const GRAPH = 'https://graph.facebook.com';
// Funções do motor de engajamento -> permissão que a conexão precisa ter.
const RECURSOS = {
  metricas: 'read_insights',
  comentarios: 'pages_read_user_content',
  mensagens: 'pages_messaging',
};

async function chamar(url, opcoes = {}) {
  const r = await fetch(url, opcoes);
  const t = await r.text();
  let d;
  try { d = JSON.parse(t); } catch { d = { erro_bruto: t.slice(0, 300) }; }
  if (!r.ok || d.error) {
    const e = d.error || {};
    const msg = e.error_user_msg || e.message || d.erro_bruto || `HTTP ${r.status}`;
    throw new Erro(r.status >= 500 ? 502 : 400, `Facebook recusou: ${String(msg).slice(0, 240)}`, { codigo: e.code });
  }
  return d;
}

// Segredo colado pelo terminal do Windows pode vir com BOM ou quebra de linha.
const limpo = (v) => String(v || '').replace(/^﻿/, '').trim();
const app = (env) => ({ id: limpo(env.META_APP_ID), segredo: limpo(env.META_APP_SECRET), config: limpo(env.FACEBOOK_CONFIG_ID) });
const form = (dados) => ({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(dados) });
const corpo = (dados) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(dados) });
const imagensDaPeca = (p) => (Array.isArray(p.slides) ? p.slides.map((s) => s && s.imagem_url).filter(Boolean) : []);
const midia = (p, tipo) => (Array.isArray(p.midias) ? p.midias.find((m) => m && m.url && (!tipo || m.tipo === tipo)) : null);
const FORMATO = (tipo) => (tipo === 'album' ? 'carrossel' : /video/.test(tipo || '') ? 'video' : tipo === 'photo' ? 'post' : 'texto');

export default {
  id: 'facebook',
  nome: 'Facebook',
  cor: '#1877F2',
  formatos: ['carrossel', 'post', 'reels', 'video', 'texto'],
  descricao: 'Posts, álbuns, vídeos e textos na Página da agência.',
  requisitos: [
    'Página do Facebook em que você tenha acesso total',
    'O mesmo app da Meta do Instagram, com o Login do Facebook para Empresas configurado',
    'Enquanto o app estiver em desenvolvimento, quem conecta precisa ter função no app (administrador, desenvolvedor ou testador)',
  ],
  segredos: ['META_APP_ID', 'META_APP_SECRET', 'FACEBOOK_CONFIG_ID'],
  disponivel: true,
  recursos: RECURSOS,

  validar(peca) {
    if (!this.formatos.includes(peca.formato)) return `Facebook não publica o formato ${peca.formato}.`;
    const legenda = peca.legenda || '';
    if (legenda.length > 63206) return 'A legenda passa do limite de 63.206 caracteres do Facebook.';
    if (peca.formato === 'carrossel') {
      const n = imagensDaPeca(peca).length;
      if (n < 2 || n > 10) return `Álbum precisa de 2 a 10 slides com imagem (tem ${n}).`;
    }
    if (peca.formato === 'post' && !((midia(peca, 'imagem') || {}).url || imagensDaPeca(peca)[0])) return 'Post precisa de uma imagem (em mídias ou no primeiro slide).';
    if ((peca.formato === 'reels' || peca.formato === 'video') && !midia(peca, 'video')) return 'Vídeo precisa de um arquivo de vídeo em mídias.';
    if (peca.formato === 'texto' && !legenda.trim()) return 'Post de texto precisa de legenda.';
    return null;
  },

  async urlConectar({ env, estado, retorno }) {
    const { id, config } = app(env);
    const q = new URLSearchParams({ client_id: id, config_id: config, redirect_uri: retorno, response_type: 'code', state: estado, override_default_response_type: 'true' });
    return `https://www.facebook.com/dialog/oauth?${q}`;
  },

  // Volta com ?code=. Troca pelo token da pessoa (longa duração) e devolve uma conexão por Página liberada.
  async concluirConexao({ env, url, retorno }) {
    const code = url.searchParams.get('code');
    if (!code) throw new Erro(400, 'O Facebook não devolveu a autorização.');
    const { id, segredo } = app(env);
    const curto = await chamar(`${GRAPH}/oauth/access_token?${new URLSearchParams({ client_id: id, client_secret: segredo, redirect_uri: retorno, code })}`);
    const longo = await chamar(`${GRAPH}/oauth/access_token?${new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: id, client_secret: segredo, fb_exchange_token: curto.access_token })}`);
    const t = encodeURIComponent(longo.access_token);
    const perms = await chamar(`${GRAPH}/me/permissions?access_token=${t}`);
    const escopos = (perms.data || []).filter((p) => p.status === 'granted').map((p) => p.permission);
    const paginas = await chamar(`${GRAPH}/me/accounts?fields=id,name,access_token,picture{url}&limit=50&access_token=${t}`);
    if (!(paginas.data || []).length) throw new Erro(400, 'Nenhuma Página foi liberada. Conecte de novo e, na tela do Facebook, marque a Página da Agência Setup.');
    return paginas.data.map((p) => ({
      conta_id: String(p.id), conta_nome: p.name, conta_foto: (p.picture && p.picture.data && p.picture.data.url) || null,
      credenciais: { token: p.access_token, usuario: String(p.id), criado: Date.now() }, escopos, expira_em: null,
    }));
  },

  async publicar({ peca, credenciais }) {
    const { token, usuario: pagina } = credenciais;
    const t = encodeURIComponent(token);
    const legenda = peca.legenda || '';
    let id;
    if (peca.formato === 'carrossel') {
      // Álbum: as fotos sobem sem publicar e entram juntas num post só.
      const fotos = [];
      for (const u of imagensDaPeca(peca)) fotos.push((await chamar(`${GRAPH}/${pagina}/photos?access_token=${t}`, form({ url: u, published: 'false' }))).id);
      const dados = { message: legenda };
      fotos.forEach((f, i) => { dados[`attached_media[${i}]`] = JSON.stringify({ media_fbid: f }); });
      id = (await chamar(`${GRAPH}/${pagina}/feed?access_token=${t}`, form(dados))).id;
    } else if (peca.formato === 'post') {
      const u = (midia(peca, 'imagem') || {}).url || imagensDaPeca(peca)[0];
      const r = await chamar(`${GRAPH}/${pagina}/photos?access_token=${t}`, form({ url: u, caption: legenda, published: 'true' }));
      id = r.post_id || r.id;
    } else if (peca.formato === 'reels' || peca.formato === 'video') {
      id = (await chamar(`${GRAPH}/${pagina}/videos?access_token=${t}`, form({ file_url: midia(peca, 'video').url, description: legenda }))).id;
    } else if (peca.formato === 'texto') {
      const link = (midia(peca, 'link') || {}).url;
      id = (await chamar(`${GRAPH}/${pagina}/feed?access_token=${t}`, form(link ? { message: legenda, link } : { message: legenda }))).id;
    } else throw new Erro(400, `Formato não suportado: ${peca.formato}.`);
    let link = null;
    try { link = (await chamar(`${GRAPH}/${id}?fields=permalink_url&access_token=${t}`)).permalink_url || null; } catch {}
    return { id_na_rede: String(id), url_publicada: link };
  },

  // ---------------------------------------------------------------- desempenho
  async lerConta({ credenciais }) {
    const d = await chamar(`${GRAPH}/${credenciais.usuario}?fields=name,followers_count,fan_count&access_token=${encodeURIComponent(credenciais.token)}`);
    return { usuario: d.name || null, seguidores: d.followers_count ?? d.fan_count ?? null, posts: null };
  },

  async lerPosts({ credenciais, limite = 25, depois }) {
    const q = new URLSearchParams({
      fields: 'id,message,created_time,permalink_url,full_picture,attachments{media_type},reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)',
      limit: String(Math.min(100, limite)), access_token: credenciais.token, ...(depois ? { after: depois } : {}),
    });
    const d = await chamar(`${GRAPH}/${credenciais.usuario}/published_posts?${q}`);
    const itens = (d.data || []).map((p) => ({
      id_na_rede: String(p.id), formato: FORMATO(p.attachments && p.attachments.data && p.attachments.data[0] && p.attachments.data[0].media_type),
      legenda: p.message || '', link: p.permalink_url || null, miniatura_url: p.full_picture || null, publicado_em: p.created_time || null,
      curtidas: (p.reactions && p.reactions.summary && p.reactions.summary.total_count) ?? null,
      comentarios: (p.comments && p.comments.summary && p.comments.summary.total_count) ?? null,
    }));
    return { itens, depois: d.paging && d.paging.next ? d.paging.cursors && d.paging.cursors.after : null };
  },

  // Alcance (pessoas que viram) e compartilhamentos. Salvos não existe no Facebook.
  async lerMetricas({ credenciais, post }) {
    const t = encodeURIComponent(credenciais.token);
    let alcance = null;
    for (const metrica of ['post_impressions_unique', 'post_media_view']) {
      try {
        const d = await chamar(`${GRAPH}/${post.id_na_rede}/insights?metric=${metrica}&access_token=${t}`);
        const v = d.data && d.data[0] && d.data[0].values && d.data[0].values[0] && d.data[0].values[0].value;
        if (typeof v === 'number') { alcance = v; break; }
      } catch (e) {
        if (e.extra && [10, 190, 200].includes(e.extra.codigo)) throw e;
      }
    }
    const s = await chamar(`${GRAPH}/${post.id_na_rede}?fields=shares&access_token=${t}`).catch(() => ({}));
    return { alcance, salvos: null, compartilhamentos: (s.shares && s.shares.count) ?? 0, visualizacoes: null };
  },

  // ---------------------------------------------------------------- "Comenta X"
  async lerComentarios({ credenciais, post_id, desde = 0, paginas = 2 }) {
    let url = `${GRAPH}/${post_id}/comments?${new URLSearchParams({ fields: 'id,message,from{id,name},created_time', filter: 'toplevel', order: 'reverse_chronological', limit: '50', access_token: credenciais.token })}`;
    const itens = [];
    for (let i = 0; i < paginas && url; i++) {
      const d = await chamar(url);
      const lote = (d.data || []).map((c) => ({ id: String(c.id), texto: c.message || '', usuario: (c.from && c.from.name) || '', nome: (c.from && c.from.name) || '', pessoa_id: c.from && c.from.id ? String(c.from.id) : null, quando: c.created_time || null }));
      itens.push(...lote);
      if (lote.some((c) => c.quando && Date.parse(c.quando) <= desde)) break;
      url = d.paging && d.paging.next ? d.paging.next : null;
    }
    return itens.filter((c) => !c.quando || Date.parse(c.quando) > desde);
  },

  async responderComentario({ credenciais, comentario_id, texto }) {
    return chamar(`${GRAPH}/${comentario_id}/comments?access_token=${encodeURIComponent(credenciais.token)}`, form({ message: texto }));
  },

  // Resposta privada no Messenger para quem comentou (precisa de pages_messaging), até 7 dias depois do comentário.
  // "formas": a mensagem em ordem de preferência (o botão, depois só o texto), como no Instagram.
  async mensagemPrivada({ credenciais, comentario_id, texto, formas }) {
    return enviarFormas(credenciais, { recipient: { comment_id: comentario_id } }, formas || [{ text: texto }]);
  },

  async mandarDirect({ credenciais, para, texto, formas }) {
    return enviarFormas(credenciais, { recipient: { id: para }, messaging_type: 'RESPONSE' }, formas || [{ text: texto }]);
  },

  // No Messenger não há "segue a Página" pela API: só o nome.
  async perfil({ credenciais, para }) {
    const d = await chamar(`${GRAPH}/${para}?fields=first_name,name&access_token=${encodeURIComponent(credenciais.token)}`);
    return { nome: d.first_name || d.name || '', usuario: '', segue: null };
  },
};

const NAO_TENTAR = new Set([4, 10, 17, 32, 190, 200, 368, 613]);
async function enviarFormas(credenciais, base, formas) {
  const url = `${GRAPH}/${credenciais.usuario}/messages?access_token=${encodeURIComponent(credenciais.token)}`;
  for (let i = 0; ; i++) {
    try {
      return await chamar(url, corpo({ ...base, message: formas[i] }));
    } catch (e) {
      if (i === formas.length - 1 || NAO_TENTAR.has(e.extra && e.extra.codigo) || e.status >= 500) throw e;
    }
  }
}
