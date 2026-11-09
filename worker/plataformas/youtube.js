// Módulo YouTube: YouTube Data API v3 com login do Google (OAuth 2.0, cliente "Aplicativo da Web").
// Contrato em worker/plataformas/LEIA.md. Publica Short e vídeo no canal; lê inscritos, vídeos, visualizações e comentários.
// Passo a passo do app no Google Cloud: docs/youtube-app.md.
// Atenção: enquanto o projeto do Google Cloud não passa pela auditoria do YouTube, todo vídeo enviado pela API
// fica privado (travado), mesmo pedindo "public". O envio funciona; o público só vê depois da auditoria.
// Docs: developers.google.com/youtube/v3/docs
import { Erro } from '../nucleo/util.js';

const API = 'https://www.googleapis.com/youtube/v3';
const UPLOAD = 'https://www.googleapis.com/upload/youtube/v3/videos';
const LOGIN = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token';
const escopo = (s) => `https://www.googleapis.com/auth/${s}`;
const ENVIO = escopo('youtube.upload');
// Funções do motor de engajamento -> permissão que a conexão precisa ter.
const RECURSOS = { metricas: escopo('youtube.readonly'), comentarios: escopo('youtube.force-ssl') };
const ESCOPOS = [ENVIO, ...Object.values(RECURSOS)];
// Códigos no formato que o resto do sistema já entende (vieram da Meta):
// 190 = token morto (credenciais.js marca a conexão como expirada); 10 = parar o lote agora (desempenho.js avisa e para).
const TOKEN_MORTO = 190;
const PARAR = 10;
const MARGEM_MS = 10 * 60_000; // o token de acesso vale 1 hora; renova quando faltam menos de 10 minutos
const CATEGORIA = '27'; // Educação

// Segredo colado pelo terminal do Windows pode vir com BOM ou quebra de linha.
const limpo = (v) => String(v || '').replace(/^﻿/, '').trim();
const app = (env) => ({ id: limpo(env.GOOGLE_CLIENT_ID), segredo: limpo(env.GOOGLE_CLIENT_SECRET) });
const form = (dados) => ({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(dados) });
const corpo = (dados) => ({ method: 'POST', headers: { 'content-type': 'application/json; charset=UTF-8' }, body: JSON.stringify(dados) });
const daqui = (segundos) => new Date(Date.now() + (Number(segundos) || 3600) * 1000).toISOString();

async function lerJson(r) {
  const t = await r.text();
  try { return t ? JSON.parse(t) : {}; } catch { return { erro_bruto: t.slice(0, 300) }; }
}

// Erro do Google -> Erro com mensagem em português. "envio" muda o texto genérico.
function erroDoGoogle(status, d, contexto) {
  // Login (oauth2.googleapis.com/token): { error: 'invalid_grant', error_description }.
  if (typeof d.error === 'string') {
    if (d.error === 'invalid_grant') return new Erro(401, 'O Google recusou o acesso ao YouTube (venceu ou foi retirado). Conecte de novo em Redes.', { codigo: TOKEN_MORTO });
    if (d.error === 'invalid_client' || d.error === 'unauthorized_client') return new Erro(503, 'O Google não reconheceu o app: confira GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no Worker.');
    if (d.error === 'redirect_uri_mismatch') return new Erro(400, 'O endereço de volta não está cadastrado no cliente OAuth do Google (veja docs/youtube-app.md).');
    return new Erro(status >= 500 ? 502 : 400, `O Google recusou o login: ${String(d.error_description || d.error).slice(0, 200)}`);
  }
  // API do YouTube: { error: { code, message, errors: [{ reason }], details: [{ reason }] } }.
  const e = d.error || {};
  const motivos = new Set([...(e.errors || []).map((x) => x.reason), ...(e.details || []).map((x) => x.reason)].filter(Boolean));
  const tem = (...r) => r.some((x) => motivos.has(x));
  const original = String(e.message || d.erro_bruto || `HTTP ${status}`).replace(/<[^>]+>/g, '').slice(0, 200);
  if (tem('quotaExceeded', 'dailyLimitExceeded')) return new Erro(429, 'A cota diária da API do YouTube acabou (10.000 unidades; cada envio gasta 1.600). Ela volta à meia-noite do horário do Pacífico (4h ou 5h em Brasília).', { codigo: PARAR });
  if (tem('rateLimitExceeded', 'userRateLimitExceeded', 'RATE_LIMIT_EXCEEDED')) return new Erro(503, 'O YouTube pediu para ir mais devagar. Tento de novo em alguns minutos.');
  if (tem('youtubeSignupRequired')) return new Erro(400, 'Essa conta do Google não tem canal no YouTube. Conecte de novo e escolha o canal da Agência Setup.');
  if (tem('authError') || status === 401 || e.status === 'UNAUTHENTICATED') return new Erro(401, 'O acesso ao YouTube venceu ou foi retirado. Conecte de novo em Redes.', { codigo: TOKEN_MORTO });
  if (tem('insufficientPermissions', 'ACCESS_TOKEN_SCOPE_INSUFFICIENT')) return new Erro(403, 'A conexão com o YouTube não liberou esta permissão. Conecte de novo em Redes e deixe todas as caixas marcadas na tela do Google.', { codigo: PARAR });
  if (tem('accessNotConfigured', 'SERVICE_DISABLED')) return new Erro(503, 'A YouTube Data API v3 não está ligada no projeto do Google Cloud (veja docs/youtube-app.md).', { codigo: PARAR });
  if (tem('uploadLimitExceeded')) return new Erro(429, 'O canal passou do limite de envios do YouTube por hoje. Tente de novo amanhã.');
  if (tem('invalidTitle')) return new Erro(400, 'O YouTube recusou o título do vídeo (até 100 caracteres).');
  if (tem('invalidDescription')) return new Erro(400, 'O YouTube recusou a descrição do vídeo (até 5.000 bytes).');
  if (tem('commentsDisabled')) return new Erro(403, 'Os comentários deste vídeo estão desligados.');
  if (tem('videoNotFound')) return new Erro(404, 'O vídeo não existe mais no YouTube.');
  return new Erro(status >= 500 ? 502 : 400, `${contexto === 'envio' ? 'O YouTube recusou o envio do vídeo' : 'YouTube recusou'}: ${original}`);
}

async function chamar(url, opcoes = {}, contexto) {
  const r = await fetch(url, opcoes);
  const d = await lerJson(r);
  if (!r.ok || d.error) throw erroDoGoogle(r.status, d, contexto);
  return d;
}

// Chamada à API com o token da conexão. "fields" corta a resposta: menos JSON para ler no plano grátis.
const api = (credenciais, caminho, params, opcoes = {}) =>
  chamar(`${API}/${caminho}?${new URLSearchParams(params)}`, { ...opcoes, headers: { ...opcoes.headers, authorization: `Bearer ${credenciais.access_token}` } });

// ---------------------------------------------------------------- texto da peça
const SHORTS = /#shorts(?![\p{L}\p{N}_])/iu;
// O YouTube recusa < e > no título e na descrição: troca pelos parecidos.
const semSinais = (s) => String(s || '').replace(/</g, '‹').replace(/>/g, '›');
const bytesDo = (cp) => (cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4);
const bytes = (s) => { let n = 0; for (const c of s) n += bytesDo(c.codePointAt(0)); return n; };

// Corta sem partir emoji, de preferência num espaço.
function cortar(s, max) {
  if (s.length <= max) return s;
  let out = '';
  for (const c of s) { if (out.length + c.length > max - 1) break; out += c; }
  const espaco = out.lastIndexOf(' ');
  return `${(espaco > max * 0.6 ? out.slice(0, espaco) : out).trimEnd()}…`;
}
function cortarBytes(s, max) {
  let out = '';
  let n = 0;
  for (const c of s) { const b = bytesDo(c.codePointAt(0)); if (n + b > max) break; out += c; n += b; }
  return out;
}

// Título: o da peça; sem ele, a primeira linha da legenda (sem hashtags). Até 100 caracteres.
function tituloDa(peca) {
  const linha = String(peca.legenda || '').split('\n').map((l) => l.replace(/#[\p{L}\p{N}_]+/gu, '').trim()).find(Boolean) || '';
  const t = semSinais(String(peca.titulo || '').trim() || linha).replace(/\s+/g, ' ').trim();
  return cortar(t, 100) || 'Agência Setup';
}

// Descrição: a legenda; no Short, com #Shorts no fim (se ainda não tiver). Limite do YouTube: 5.000 bytes.
function descricaoDa(peca) {
  const d = semSinais(peca.legenda || '').trim();
  if (peca.formato !== 'short' || SHORTS.test(d)) return d;
  return d ? `${d}\n\n#Shorts` : '#Shorts';
}

const videoDa = (p) => (Array.isArray(p.midias)
  ? p.midias.find((m) => m && m.url && (m.tipo === 'video' || (!m.tipo && /\.(mp4|mov|m4v|webm)(\?|$)/i.test(m.url))))
  : null);

// ---------------------------------------------------------------- posts lidos do canal
function segundos(iso) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(iso || ''));
  return m ? (Number(m[1] || 0) * 86400) + (Number(m[2] || 0) * 3600) + (Number(m[3] || 0) * 60) + Number(m[4] || 0) : 0;
}
// A API não diz se é Short: vale o #Shorts no título ou na descrição (o sistema põe) ou até 60 segundos.
function FORMATO(v) {
  const s = v.snippet || {};
  if (SHORTS.test(`${s.title || ''} ${s.description || ''}`)) return 'short';
  const dur = segundos(v.contentDetails && v.contentDetails.duration);
  return dur > 0 && dur <= 60 ? 'short' : 'video';
}
const endereco = (id, formato) => (formato === 'short' ? `https://www.youtube.com/shorts/${id}` : `https://youtu.be/${id}`);
const numero = (v) => (v == null ? null : Number(v));

// A lista "envios" do canal (todos os vídeos dele). Fica guardada nas credenciais desde a conexão.
async function listaDeEnvios(credenciais) {
  if (credenciais.uploads) return credenciais.uploads;
  const d = await api(credenciais, 'channels', { part: 'contentDetails', mine: 'true', fields: 'items/contentDetails/relatedPlaylists/uploads' });
  const u = d.items && d.items[0] && d.items[0].contentDetails && d.items[0].contentDetails.relatedPlaylists.uploads;
  if (!u) throw new Erro(400, 'Não achei a lista de vídeos do canal no YouTube.');
  return u;
}

export default {
  id: 'youtube',
  nome: 'YouTube',
  cor: '#FF0000',
  formatos: ['short', 'video'],
  descricao: 'Shorts e vídeos no canal.',
  requisitos: [
    'Projeto no Google Cloud com a YouTube Data API v3 ligada e um cliente OAuth do tipo "Aplicativo da Web" (passo a passo em docs/youtube-app.md)',
    'Tela de consentimento externa. Enquanto estiver "Em teste", a conta do Google do canal precisa estar em Usuários de teste e o login vence a cada 7 dias',
    'Até o projeto passar pela auditoria do YouTube, os vídeos enviados pela API ficam privados (travados), mesmo pedindo público',
    'Short: vídeo vertical ou quadrado de até 3 minutos (o YouTube decide sozinho se vira Short)',
    'Cota grátis de 10.000 unidades por dia: cada envio gasta 1.600 (uns 5 vídeos por dia, com folga para métricas e comentários)',
  ],
  segredos: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  disponivel: true,
  recursos: RECURSOS,

  validar(peca) {
    if (!this.formatos.includes(peca.formato)) return `YouTube não publica o formato ${peca.formato}.`;
    if (!videoDa(peca)) return 'Vídeo do YouTube precisa de um arquivo de vídeo em mídias.';
    if (!String(peca.titulo || '').trim() && !String(peca.legenda || '').trim()) return 'Vídeo do YouTube precisa de título (ou de legenda, de onde sai o título).';
    if (bytes(descricaoDa(peca)) > 5000) return 'A legenda passa do limite de 5.000 bytes do YouTube (letra com acento conta 2, emoji conta 4).';
    return null;
  },

  async urlConectar({ env, estado, retorno }) {
    const q = new URLSearchParams({
      client_id: app(env).id, redirect_uri: retorno, response_type: 'code', scope: ESCOPOS.join(' '),
      access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state: estado,
    });
    return `${LOGIN}?${q}`;
  },

  async concluirConexao({ env, url, retorno }) {
    const code = url.searchParams.get('code');
    if (!code) throw new Erro(400, 'O Google não devolveu a autorização.');
    const { id, segredo } = app(env);
    const t = await chamar(TOKEN, form({ code, client_id: id, client_secret: segredo, redirect_uri: retorno, grant_type: 'authorization_code' }));
    // Sem refresh_token o acesso morre em 1 hora e não há como renovar.
    if (!t.refresh_token) throw new Erro(400, 'O Google não devolveu a chave de renovação. Desconecte o app em myaccount.google.com/permissions e conecte de novo.');
    const escopos = String(t.scope || '').split(/\s+/).filter(Boolean);
    // Na tela do Google dá para desmarcar caixas. Sem a de envio não há o que publicar.
    if (!escopos.includes(ENVIO)) throw new Erro(400, 'Faltou liberar o envio de vídeos. Conecte de novo e deixe todas as caixas marcadas na tela do Google.');
    const credenciais = { access_token: t.access_token, refresh_token: t.refresh_token, expira_em: daqui(t.expires_in) };
    const c = await api(credenciais, 'channels', { part: 'snippet,statistics,contentDetails', mine: 'true' });
    const canal = c.items && c.items[0];
    if (!canal) throw new Erro(400, 'Essa conta do Google não tem canal no YouTube. Conecte de novo e escolha o canal da Agência Setup na tela do Google.');
    const fotos = (canal.snippet && canal.snippet.thumbnails) || {};
    return {
      conta_id: String(canal.id),
      conta_nome: (canal.snippet && (canal.snippet.title || canal.snippet.customUrl)) || String(canal.id),
      conta_foto: (fotos.medium || fotos.default || fotos.high || {}).url || null,
      // canal e uploads: para achar os vídeos do canal e pular os comentários do próprio canal sem chamada extra.
      credenciais: { ...credenciais, canal: String(canal.id), uploads: (canal.contentDetails && canal.contentDetails.relatedPlaylists && canal.contentDetails.relatedPlaylists.uploads) || null },
      escopos,
      expira_em: credenciais.expira_em,
    };
  },

  // Token de acesso vale 1 hora; renova pelo refresh_token quando está perto de vencer.
  async renovar({ env, credenciais }) {
    const vence = Date.parse(credenciais.expira_em || '') || 0;
    if (vence - Date.now() > MARGEM_MS) return null;
    if (!credenciais.refresh_token) throw new Erro(401, 'A conexão do YouTube está sem a chave de renovação. Conecte de novo em Redes.', { codigo: TOKEN_MORTO });
    const { id, segredo } = app(env);
    const t = await chamar(TOKEN, form({ client_id: id, client_secret: segredo, grant_type: 'refresh_token', refresh_token: credenciais.refresh_token }));
    const expira_em = daqui(t.expires_in);
    // O refresh_token não volta na renovação: fica o antigo.
    return { credenciais: { ...credenciais, access_token: t.access_token, refresh_token: t.refresh_token || credenciais.refresh_token, expira_em }, expira_em };
  },

  // Envio retomável em duas chamadas: abre a sessão com os dados do vídeo e manda o arquivo de uma vez.
  // O arquivo passa em stream (da URL da mídia direto para o Google): nunca fica inteiro na memória do Worker.
  async publicar({ peca, credenciais }) {
    const video = videoDa(peca);
    if (!video) throw new Erro(400, 'A peça não tem vídeo em mídias.');
    const short = peca.formato === 'short';
    const auth = { authorization: `Bearer ${credenciais.access_token}` };
    // 1. Sessão de envio. O endereço dela volta no cabeçalho Location.
    const ini = await fetch(`${UPLOAD}?uploadType=resumable&part=snippet,status`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-type': 'video/*' },
      body: JSON.stringify({
        snippet: { title: tituloDa(peca), description: cortarBytes(descricaoDa(peca), 5000), categoryId: CATEGORIA, defaultLanguage: 'pt-BR', defaultAudioLanguage: 'pt-BR' },
        status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
      }),
    });
    if (!ini.ok) throw erroDoGoogle(ini.status, await lerJson(ini), 'envio');
    await ini.body?.cancel();
    const sessao = ini.headers.get('location');
    if (!sessao) throw new Erro(502, 'O YouTube não abriu a sessão de envio. A fila tenta de novo em alguns minutos.');
    // 2. O arquivo, da URL da peça.
    const arq = await fetch(video.url, { headers: { 'accept-encoding': 'identity' } });
    const tipo = arq.headers.get('content-type') || '';
    if (!arq.ok || !arq.body || /^text\//i.test(tipo)) {
      await arq.body?.cancel();
      throw new Erro(400, arq.ok ? 'O endereço do vídeo devolveu uma página, não um arquivo de vídeo.' : `Não consegui baixar o vídeo da peça (HTTP ${arq.status}).`);
    }
    // Com o tamanho conhecido, FixedLengthStream faz o Worker mandar Content-Length (o Google pede) sem ler o arquivo.
    const tamanho = Number(arq.headers.get('content-length')) || 0;
    let fluxo = arq.body;
    if (tamanho > 0 && typeof FixedLengthStream === 'function') {
      const { readable, writable } = new FixedLengthStream(tamanho);
      arq.body.pipeTo(writable).catch(() => {});
      fluxo = readable;
    }
    const r = await fetch(sessao, { method: 'PUT', headers: { ...auth, 'content-type': /^video\//i.test(tipo) ? tipo : 'application/octet-stream' }, body: fluxo });
    const v = await lerJson(r);
    if (!r.ok || v.error) throw erroDoGoogle(r.status, v, 'envio');
    // Deu 200 sem id: o vídeo subiu. Não lança erro (a fila mandaria de novo e o vídeo sairia duplicado).
    if (!v.id) {
      console.error('youtube envio sem id', peca.id, JSON.stringify(v).slice(0, 300));
      return { id_na_rede: null, url_publicada: null };
    }
    // Projeto sem auditoria: o YouTube trava como privado. O envio deu certo; só o público não vê.
    if (v.status && v.status.privacyStatus && v.status.privacyStatus !== 'public') console.log('youtube: vídeo ficou', v.status.privacyStatus, v.id);
    return { id_na_rede: String(v.id), url_publicada: endereco(v.id, short ? 'short' : 'video') };
  },

  // ---------------------------------------------------------------- desempenho
  // Inscritos (a API arredonda para 3 dígitos significativos) e total de vídeos.
  async lerConta({ credenciais }) {
    const d = await api(credenciais, 'channels', { part: 'snippet,statistics', mine: 'true', fields: 'items(snippet(title,customUrl),statistics(subscriberCount,hiddenSubscriberCount,videoCount))' });
    const c = (d.items && d.items[0]) || {};
    const s = c.statistics || {};
    return {
      usuario: (c.snippet && (c.snippet.customUrl || c.snippet.title)) || null,
      seguidores: s.hiddenSubscriberCount ? null : numero(s.subscriberCount),
      posts: numero(s.videoCount),
    };
  },

  // Uma página da lista de envios do canal (mais novo primeiro) + curtidas e comentários de cada vídeo.
  // Duas chamadas de 1 unidade. "depois" é o pageToken da página seguinte. Vídeo privado fica de fora (não tem público).
  async lerPosts({ credenciais, limite = 25, depois }) {
    const lista = await api(credenciais, 'playlistItems', {
      part: 'contentDetails', playlistId: await listaDeEnvios(credenciais), maxResults: String(Math.min(50, limite)),
      fields: 'nextPageToken,items/contentDetails/videoId', ...(depois ? { pageToken: depois } : {}),
    });
    const ids = (lista.items || []).map((i) => i.contentDetails && i.contentDetails.videoId).filter(Boolean);
    const dados = ids.length ? await api(credenciais, 'videos', {
      part: 'snippet,contentDetails,statistics,status', id: ids.join(','), maxResults: '50',
      fields: 'items(id,snippet(publishedAt,title,description,thumbnails/medium/url),contentDetails/duration,statistics(likeCount,commentCount),status/privacyStatus)',
    }) : { items: [] };
    const porId = new Map((dados.items || []).map((v) => [v.id, v]));
    const itens = ids.map((id) => porId.get(id)).filter((v) => v && !(v.status && v.status.privacyStatus === 'private')).map((v) => {
      const s = v.snippet || {};
      const st = v.statistics || {};
      const formato = FORMATO(v);
      return {
        id_na_rede: String(v.id), formato, legenda: s.description || s.title || '', link: endereco(v.id, formato),
        miniatura_url: (s.thumbnails && s.thumbnails.medium && s.thumbnails.medium.url) || null,
        publicado_em: s.publishedAt || null, curtidas: numero(st.likeCount), comentarios: numero(st.commentCount),
      };
    });
    return { itens, depois: lista.nextPageToken || null };
  },

  // Visualizações. O YouTube não dá alcance (pessoas únicas) nesta API: alcance = visualizações.
  // Salvos e compartilhamentos só existem na YouTube Analytics API (outra permissão): ficam vazios.
  async lerMetricas({ credenciais, post }) {
    const d = await api(credenciais, 'videos', { part: 'statistics', id: post.id_na_rede, fields: 'items/statistics/viewCount' });
    const v = d.items && d.items[0] && d.items[0].statistics;
    const views = v ? numero(v.viewCount) : null;
    return { alcance: views, salvos: null, compartilhamentos: null, visualizacoes: views };
  },

  // ---------------------------------------------------------------- "Comenta X"
  // Comentários de primeiro nível mais novos que "desde" (milissegundos), do mais novo para o mais antigo.
  // Os do próprio canal ficam de fora. 1 unidade por página de 100.
  async lerComentarios({ credenciais, post_id, desde = 0, paginas = 2 }) {
    const itens = [];
    let pagina = null;
    for (let i = 0; i < paginas; i++) {
      const d = await api(credenciais, 'commentThreads', {
        part: 'snippet', videoId: post_id, order: 'time', maxResults: '100', textFormat: 'plainText',
        fields: 'nextPageToken,items/snippet/topLevelComment(id,snippet(textDisplay,authorDisplayName,authorChannelId,publishedAt))',
        ...(pagina ? { pageToken: pagina } : {}),
      });
      const lote = (d.items || []).map((t) => t.snippet && t.snippet.topLevelComment).filter(Boolean).map((c) => {
        const s = c.snippet || {};
        return { id: String(c.id), texto: s.textDisplay || '', usuario: String(s.authorDisplayName || '').replace(/^@/, ''), quando: s.publishedAt || null, canal: s.authorChannelId && s.authorChannelId.value };
      });
      itens.push(...lote);
      if (lote.some((c) => c.quando && Date.parse(c.quando) <= desde)) break;
      pagina = d.nextPageToken || null;
      if (!pagina) break;
    }
    return itens
      .filter((c) => (!c.quando || Date.parse(c.quando) > desde) && !(credenciais.canal && c.canal === credenciais.canal))
      .map(({ canal: _canal, ...c }) => c);
  },

  // Resposta pública embaixo do comentário (50 unidades). YouTube não tem DM: sem mensagemPrivada.
  async responderComentario({ credenciais, comentario_id, texto }) {
    return api(credenciais, 'comments', { part: 'snippet', fields: 'id' }, corpo({ snippet: { parentId: comentario_id, textOriginal: texto } }));
  },
};
