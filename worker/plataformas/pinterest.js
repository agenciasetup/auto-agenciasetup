// Módulo Pinterest: API v5 com login OAuth da conta business. Contrato em worker/plataformas/LEIA.md.
// Publica pin de imagem (post), pin carrossel (2 a 5 imagens) e pin de vídeo, sempre levando para o site.
// Acesso do app: começa em teste (Trial), em que os pins criados ficam visíveis só para a própria conta; com o acesso
// padrão (Standard, pedido no portal com um vídeo do login e de uma publicação) os pins saem públicos.
// O Pinterest não abre comentários nem mensagens pela API: sem "Comenta X" aqui.
// Docs: developers.pinterest.com/docs/api/v5/
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';

const API = 'https://api.pinterest.com/v5';
const RECURSOS = { metricas: 'pins:read' };
const ESCOPOS = ['user_accounts:read', 'boards:read', 'pins:read', 'pins:write'];
const ESPERA_VIDEO_MS = 60_000;

// Segredo colado pelo terminal do Windows pode vir com BOM (U+FEFF) ou quebra de linha.
const limpo = (v) => String(v || '').replace(/^﻿/, '').trim();
const app = (env) => ({ id: limpo(env.PINTEREST_APP_ID), segredo: limpo(env.PINTEREST_APP_SECRET) });

async function chamar(url, opcoes = {}) {
  const r = await fetch(url, opcoes);
  const t = await r.text();
  let d;
  try { d = t ? JSON.parse(t) : {}; } catch { d = { erro_bruto: t.slice(0, 300) }; }
  if (!r.ok) {
    const msg = d.message || d.error_description || d.error || d.erro_bruto || `HTTP ${r.status}`;
    // 401: token vencido ou retirado (o painel pede "Reconectar").
    throw new Erro(r.status >= 500 ? 502 : 400, `Pinterest recusou: ${String(msg).slice(0, 240)}`, { codigo: d.code, tokenMorto: r.status === 401 });
  }
  return d;
}
const ler = (token, caminho) => chamar(`${API}${caminho}`, { headers: { authorization: `Bearer ${token}` } });
const enviar = (token, caminho, dados) => chamar(`${API}${caminho}`, {
  method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(dados),
});
// Token do OAuth (código ou renovação): Basic com o id e o segredo do app.
function tokenOAuth(env, dados) {
  const { id, segredo } = app(env);
  return chamar(`${API}/oauth/token`, {
    method: 'POST',
    headers: { authorization: `Basic ${btoa(`${id}:${segredo}`)}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(dados),
  });
}
const vence = (segundos, padrao) => new Date(Date.now() + (Number(segundos) || padrao) * 1000).toISOString();

const imagensDaPeca = (p) => (Array.isArray(p.slides) ? p.slides.map((s) => s && s.imagem_url).filter(Boolean) : []);
const midia = (p, tipo) => (Array.isArray(p.midias) ? p.midias.find((m) => m && m.url && (!tipo || m.tipo === tipo)) : null);
const imagemPrincipal = (p) => (midia(p, 'imagem') || {}).url || imagensDaPeca(p)[0] || null;
const FORMATO = (p) => (p.media && p.media.media_type === 'video' ? 'video' : p.media && p.media.media_type === 'multiple_images' ? 'carrossel' : 'post');

// O pin leva para o site: o recurso, a novidade ou a página do curso de onde a peça saiu (com a marca de origem).
async function linkDaPeca(env, peca) {
  const site = env.SITE_URL || 'https://agenciasetup.com.br';
  const caminho = { recurso: ['recursos', 'recursos'], artigo: ['artigos', 'novidades'] }[peca.origem_tipo];
  if (caminho && peca.origem_id) {
    const r = await db.um(env, caminho[0], { id: `eq.${peca.origem_id}` }, 'slug,status').catch(() => null);
    if (r && r.status === 'publicado') return `${site}/${caminho[1]}/${r.slug}?de=pinterest`;
  }
  return `${site}/?de=pinterest`;
}

// Vídeo: registra a mídia, manda o arquivo para o endereço que o Pinterest dá e espera processar.
async function subirVideo(token, url) {
  const reg = await enviar(token, '/media', { media_type: 'video' });
  const arquivo = await fetch(url);
  if (!arquivo.ok) throw new Erro(400, 'Não consegui baixar o vídeo da peça.');
  const form = new FormData();
  for (const [k, v] of Object.entries(reg.upload_parameters || {})) form.append(k, v);
  form.append('file', await arquivo.blob(), 'video.mp4');
  const up = await fetch(reg.upload_url, { method: 'POST', body: form });
  if (!up.ok) throw new Erro(502, `O Pinterest não recebeu o vídeo (HTTP ${up.status}).`);
  const ate = Date.now() + ESPERA_VIDEO_MS;
  while (Date.now() < ate) {
    const s = await ler(token, `/media/${reg.media_id}`);
    if (s.status === 'succeeded') return reg.media_id;
    if (s.status === 'failed') throw new Erro(400, 'O Pinterest não processou o vídeo.');
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Erro(504, 'O Pinterest ainda está processando o vídeo. A fila tenta de novo em alguns minutos.');
}

export default {
  id: 'pinterest',
  nome: 'Pinterest',
  cor: '#E60023',
  formatos: ['post', 'carrossel', 'video'],
  descricao: 'Pins com imagem, carrossel ou vídeo levando para os recursos do site.',
  requisitos: [
    'Conta business no Pinterest, com pelo menos um quadro',
    'App no Pinterest Developers (developers.pinterest.com/apps) com o endereço de volta do painel',
    'Enquanto o app estiver em acesso de teste (Trial), os pins ficam visíveis só para a própria conta; para publicar de verdade, peça o acesso padrão (Standard)',
  ],
  segredos: ['PINTEREST_APP_ID', 'PINTEREST_APP_SECRET'],
  disponivel: true,
  recursos: RECURSOS,

  validar(peca) {
    if (!this.formatos.includes(peca.formato)) return `Pinterest não publica o formato ${peca.formato}.`;
    if ((peca.legenda || '').length > 800) return 'A descrição passa do limite de 800 caracteres do Pinterest.';
    if ((peca.titulo || '').length > 100) return 'O título passa do limite de 100 caracteres do Pinterest.';
    if (peca.formato === 'post' && !imagemPrincipal(peca)) return 'Pin precisa de uma imagem (em mídias ou no primeiro slide).';
    if (peca.formato === 'carrossel') {
      const n = imagensDaPeca(peca).length;
      if (n < 2 || n > 5) return `Pin carrossel precisa de 2 a 5 imagens (tem ${n}). Para um carrossel maior, publique a capa como pin de imagem.`;
    }
    if (peca.formato === 'video' && !midia(peca, 'video')) return 'Pin de vídeo precisa de um vídeo em mídias.';
    return null;
  },

  async urlConectar({ env, estado, retorno }) {
    const q = new URLSearchParams({ client_id: app(env).id, redirect_uri: retorno, response_type: 'code', scope: ESCOPOS.join(','), state: estado });
    return `https://www.pinterest.com/oauth/?${q}`;
  },

  async concluirConexao({ env, url, retorno }) {
    const code = url.searchParams.get('code');
    if (!code) throw new Erro(400, 'O Pinterest não devolveu a autorização.');
    // Token de 30 dias + token de renovação contínua (60 dias, renova sem limite).
    const t = await tokenOAuth(env, { grant_type: 'authorization_code', code, redirect_uri: retorno, continuous_refresh: 'true' });
    const eu = await ler(t.access_token, '/user_account');
    // Os pins vão para o quadro da agência (o de nome mais parecido; senão, o primeiro).
    const quadros = (await ler(t.access_token, '/boards?page_size=100')).items || [];
    if (!quadros.length) throw new Erro(400, 'A conta não tem nenhum quadro. Crie um quadro no Pinterest e conecte de novo.');
    const quadro = quadros.find((b) => /setup|ag[eê]ncia|calango/i.test(b.name)) || quadros[0];
    return {
      conta_id: String(eu.id || eu.username),
      conta_nome: eu.username ? `@${eu.username}` : eu.business_name || 'Pinterest',
      conta_foto: eu.profile_image || null,
      credenciais: {
        token: t.access_token, renovacao: t.refresh_token, renovacao_vence: t.refresh_token_expires_at ? t.refresh_token_expires_at * 1000 : null,
        quadro: { id: quadro.id, nome: quadro.name },
      },
      escopos: String(t.scope || ESCOPOS.join(',')).split(/[ ,]+/).filter(Boolean),
      expira_em: vence(t.expires_in, 30 * 86400),
    };
  },

  // O token vale 30 dias; a renovação devolve token novo (e, na renovação contínua, um token de renovação novo).
  async renovar({ env, credenciais }) {
    if (!credenciais.renovacao) return null;
    const t = await tokenOAuth(env, { grant_type: 'refresh_token', refresh_token: credenciais.renovacao });
    return {
      credenciais: {
        ...credenciais, token: t.access_token, renovacao: t.refresh_token || credenciais.renovacao,
        renovacao_vence: t.refresh_token_expires_at ? t.refresh_token_expires_at * 1000 : credenciais.renovacao_vence,
      },
      expira_em: vence(t.expires_in, 30 * 86400),
    };
  },

  async publicar({ env, peca, credenciais }) {
    const { token, quadro } = credenciais;
    if (!quadro || !quadro.id) throw new Erro(400, 'Falta o quadro do Pinterest. Conecte a conta de novo em Redes.');
    let media_source;
    if (peca.formato === 'post') media_source = { source_type: 'image_url', url: imagemPrincipal(peca) };
    else if (peca.formato === 'carrossel') media_source = { source_type: 'multiple_image_urls', items: imagensDaPeca(peca).slice(0, 5).map((url) => ({ url })) };
    else if (peca.formato === 'video') {
      const capa = imagemPrincipal(peca);
      media_source = { source_type: 'video_id', media_id: await subirVideo(token, midia(peca, 'video').url), ...(capa ? { cover_image_url: capa } : { cover_image_key_frame_time: 1 }) };
    } else throw new Erro(400, `Formato não suportado: ${peca.formato}.`);
    const legenda = peca.legenda || '';
    const pin = await enviar(token, '/pins', {
      board_id: quadro.id,
      title: (peca.titulo || legenda.split('\n')[0] || '').slice(0, 100),
      description: legenda.slice(0, 800),
      link: await linkDaPeca(env, peca),
      alt_text: (peca.titulo || '').slice(0, 500) || undefined,
      media_source,
    });
    return { id_na_rede: String(pin.id), url_publicada: `https://www.pinterest.com/pin/${pin.id}/` };
  },

  // ---------------------------------------------------------------- desempenho
  async lerConta({ credenciais }) {
    const d = await ler(credenciais.token, '/user_account');
    return { usuario: d.username || null, seguidores: d.follower_count ?? null, posts: d.pin_count ?? null };
  },

  // Uma página de pins, do mais novo para o mais antigo, com os números de sempre (reações e comentários).
  async lerPosts({ credenciais, limite = 50, depois }) {
    const q = new URLSearchParams({ page_size: String(Math.min(100, limite)), pin_metrics: 'true', ...(depois ? { bookmark: depois } : {}) });
    const d = await ler(credenciais.token, `/pins?${q}`);
    const itens = (d.items || []).map((p) => {
      const total = (p.pin_metrics && (p.pin_metrics.lifetime_metrics || p.pin_metrics.all_time)) || {};
      const imagens = (p.media && p.media.images) || {};
      return {
        id_na_rede: String(p.id), formato: FORMATO(p), legenda: [p.title, p.description].filter(Boolean).join('\n'),
        link: `https://www.pinterest.com/pin/${p.id}/`,
        miniatura_url: (imagens['600x'] || imagens['400x300'] || imagens['150x150'] || {}).url || (p.media && p.media.cover_image_url) || null,
        publicado_em: p.created_at || null, curtidas: total.reaction ?? null, comentarios: total.comment ?? null,
      };
    });
    return { itens, depois: d.bookmark || null };
  },

  // Impressões (alcance), salvos e cliques de um pin nos últimos 90 dias (o máximo que o Pinterest guarda por pin).
  async lerMetricas({ credenciais, post }) {
    const hoje = new Date();
    const dia = (d) => d.toISOString().slice(0, 10);
    const q = new URLSearchParams({
      start_date: dia(new Date(hoje.getTime() - 89 * 86400_000)), end_date: dia(hoje),
      metric_types: 'IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK',
    });
    const d = await ler(credenciais.token, `/pins/${post.id_na_rede}/analytics?${q}`);
    const t = (d.all && d.all.summary_metrics) || {};
    return { alcance: t.IMPRESSION ?? null, salvos: t.SAVE ?? null, compartilhamentos: null, visualizacoes: t.PIN_CLICK ?? null };
  },
};
