// "Comenta X" no estilo do ManyChat (pedido do dono em 24/10/2026, como no Olhar de Fé): quem comenta a palavra recebe
// uma resposta no comentário (escrita pela IA para aquela pessoa) e o material no direct, com o link num botão (link
// curto com UTM por versão) e o mini curso no segundo botão. Três modos:
//  - direto: o link já vai no primeiro direct;
//  - seguir: o primeiro direct pede para seguir, com o botão "Já segui"; o link só vai para quem segue, já com o
//    primeiro nome (a Meta só mostra o perfil depois do toque);
//  - pergunta: o link vai quando a pessoa toca no botão ou responde.
// Cada palavra tem versões da mensagem (o Claude escreve ao criar o post); o sistema manda mais a que traz mais cliques
// e seguidores. Textos, escolha da versão e IA ficam em comenta.js.
// Na hora: a Meta avisa pelo webhook os toques e mensagens no direct e, com Acesso Avançado, os comentários.
// Reserva: o relógio lê os comentários dos posts com palavra ligada. Um comentário entra uma vez só na fila, e uma pessoa
// recebe um direct só por post (o banco garante). Duas etapas no relógio: varrer (barato) e enviar (caro, com limite).
import { contarChamada, db, folgaDeChamadas } from '../nucleo/db.js';
import { slugar } from '../nucleo/util.js';
import { avisarSeTokenMorreu, contaAtiva, contaPorId, contasAtivas, credenciaisAtivas, temRecurso } from '../plataformas/credenciais.js';
import { escolherVariante, formasComLink, formasPergunta, preencher, primeiroNome, respostaPublicaIA, textosDe, variantesDe } from './comenta.js';
import { pago } from './desempenho.js';
import { prepararIntegracoes } from './integracoes.js';
import { PERFIS, idiomaDe, perfilValido, siteDoPerfil } from './perfis.js';
import { codigoDaPessoa, comPessoa } from './pessoa.js';
import { normalPalavra, pediu } from './temas.js';
import { anotarEco, atender } from './atendente.js';

const DIA = 86400_000;
const JANELA_GENERICA = 30 * DIA; // palavra sem post fixo vale para posts dos últimos 30 dias que pedem a palavra
// Erros passageiros da Meta (limite de chamadas, instabilidade): tenta de novo depois.
const PASSAGEIRO = [1, 2, 4, 17, 32, 341, 613];
const PARAR = new Set(['nao', 'pare', 'parar', 'sair', 'stop']);
// No perfil em inglês, o "não quero" em inglês também para.
const PARAR_EN = new Set([...PARAR, 'no', 'unsubscribe']);
const CAMPOS_G = 'id,rede,perfil,palavra,link,mensagem,respostas,ativo,modo,estrategia,variantes,responder_publico,resposta_ia,recurso:recursos(slug,titulo,status,perfil)';
const agora = () => new Date().toISOString();
const usuarioLimpo = (u) => String(u || '').trim().replace(/^@/, '').toLowerCase();
// O idioma das mensagens é o do perfil da palavra (lib/perfis.js): 'pt' no Brasil, 'en' no perfil em inglês.
const idiomaDoGatilho = (g) => idiomaDe(perfilValido(g && g.perfil));
// O recurso só vale para a palavra do mesmo perfil: o do Brasil (em português) ou o em inglês.
const recursoDoPerfil = (g) => (g.recurso && perfilValido(g.recurso.perfil) === perfilValido(g.perfil) ? g.recurso : null);
// O nome do material na mensagem: o título do recurso do perfil, ou "material" ("freebie" em inglês).
const tituloDe = (g) => ((recursoDoPerfil(g) || {}).titulo || '') || (idiomaDoGatilho(g) === 'en' ? 'freebie' : 'material');

// O link do material: recurso publicado do perfil (com ?de=dm-<palavra> para contar o download) ou o link avulso.
// A palavra vira a campanha da venda (origem instagram, meio dm): em Vendas aparece "instagram · dm · prompt".
// O recurso do Brasil mora em agenciasetup.com.br/recursos; o do perfil em inglês, em agenciasetup.com/free.
export const marcaDm = (g) => `de=dm-${String(g.palavra || g.id).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || String(g.id).slice(0, 8)}`;
export function linkDoGatilho(env, g) {
  const perfil = perfilValido(g.perfil);
  const marca = marcaDm(g);
  const rec = recursoDoPerfil(g);
  if (rec && rec.status === 'publicado') return `${siteDoPerfil(env, perfil)}/${perfil === 'en' ? 'free' : 'recursos'}/${rec.slug}?${marca}`;
  if (!g.link) return null;
  try {
    const u = new URL(g.link);
    if (/(^|\.)agenciasetup\.com(\.br)?$/.test(u.hostname)) u.search = u.search ? `${u.search}&${marca}` : `?${marca}`;
    return u.toString();
  } catch {
    return null;
  }
}

// A oferta do fim do funil (mini curso): só com produto ativo e landing page publicada. Cada perfil tem a sua (config
// do perfil, lib/perfis.js). A do inglês leva à raiz do site em inglês, onde mora a página de venda dele.
export async function ofertaAtiva(env, perfil = 'br') {
  if (perfilValido(perfil) === 'en') return ofertaEn(env);
  const c = await db.um(env, 'config', { chave: 'eq.oferta' });
  const o = (c && c.valor) || {};
  if (!o.ativo || !o.landing_slug) return null;
  const lp = await db.um(env, 'landing_pages', { slug: `eq.${o.landing_slug}`, status: 'eq.publicado' }, 'slug,titulo,produto:produtos(nome,ativo,chamada,preco_centavos,imagem_url)');
  if (!lp || (lp.produto && lp.produto.ativo === false)) return null;
  // O título da landing page lê melhor numa frase ("o mini curso Posts com IA") do que o nome do produto.
  const nome = lp.titulo || (lp.produto && lp.produto.nome);
  return { ...o, nome, titulo: o.titulo || nome, texto: o.texto || (lp.produto && lp.produto.chamada) || '', link: `${env.SITE_URL || 'https://agenciasetup.com.br'}/cursos/${lp.slug}`, imagem_url: lp.produto && lp.produto.imagem_url };
}

// A oferta do perfil em inglês (config "oferta_en": ativo, nome, titulo, texto, linha_dm, botao_dm): só com ativo.
async function ofertaEn(env) {
  const c = await db.um(env, 'config', { chave: `eq.${PERFIS.en.oferta}` });
  const o = (c && c.valor) || {};
  if (!o.ativo) return null;
  const nome = o.nome || o.titulo || 'mini course';
  return { ...o, nome, titulo: o.titulo || nome, texto: o.texto || '', link: `${siteDoPerfil(env, 'en')}/` };
}

// O botão do mini curso no direct, com a palavra como campanha. Fica em segundo; com "curso_primeiro" ligado na oferta
// ele sobe para primeiro e a marca vira "curso-topo", para a venda de cada posição aparecer separada em Vendas.
function cursoDaOferta(oferta, g, rede, pessoa = '') {
  if (!oferta) return null;
  try {
    const u = new URL(oferta.link);
    u.searchParams.set('utm_source', rede);
    u.searchParams.set('utm_medium', 'dm');
    u.searchParams.set('utm_campaign', slugar(g.palavra, 30) || 'comenta');
    const primeiro = oferta.curso_primeiro === true;
    u.searchParams.set('utm_content', primeiro ? 'curso-topo' : 'curso');
    // O código de quem recebeu (pessoa.js): é por ele que a compra é ligada à pessoa do follow-up.
    if (pessoa) u.searchParams.set('p', pessoa);
    const linha = String(oferta.linha_dm || '').replace(/\{link_curso\}/g, '').replace(/\{curso\}/g, oferta.nome || 'mini curso').trim();
    return { url: u.toString(), nome: oferta.nome, botao: oferta.botao_dm || '', linha, primeiro };
  } catch {
    return null;
  }
}

// Ajustes gerais (config "comenta"): contas de teste (recebem de novo no mesmo post) e limite por hora.
let ajustesMem = { em: 0, v: null };
export async function ajustesComenta(env) {
  if (ajustesMem.v && Date.now() - ajustesMem.em < 60_000) return ajustesMem.v;
  const c = await db.um(env, 'config', { chave: 'eq.comenta' }).catch(() => null);
  const v = { testadores: [], limite_hora: 200, ...((c && c.valor) || {}) };
  ajustesMem = { em: Date.now(), v };
  return v;
}
export function esquecerAjustesComenta() { ajustesMem = { em: 0, v: null }; }
const ehTestador = (cfg, usuario) => !!usuario && (cfg.testadores || []).map(usuarioLimpo).includes(usuarioLimpo(usuario));

// Os números de cada versão (para escolher a que está ganhando). Um minuto na memória do Worker.
const statsMem = new Map();
async function statsDe(env, gid) {
  const m = statsMem.get(gid);
  if (m && Date.now() - m.em < 60_000) return m.v;
  const r = await db.rpc(env, 'numeros_variantes', { p_gatilho: gid }).catch(() => null);
  const v = (r && r[gid]) || {};
  statsMem.set(gid, { em: Date.now(), v });
  return v;
}

// ---------------------------------------------------------------- link curto com UTM, um por palavra, versão e post
// agenciasetup.com.br/l/<palavra>-<versão>-<post>: source a rede, medium dm, campaign a palavra, content palavra e
// versão, term o post. O clique conta na versão (painel) e a visita leva a origem até a venda.
const linksMem = new Map();
export async function linkDaVariante(env, g, v, r) {
  const material = linkDoGatilho(env, g);
  if (!material) return null;
  const campanha = slugar(g.palavra, 30) || 'comenta';
  const utm = { utm_source: r.rede, utm_medium: 'dm', utm_campaign: campanha, utm_content: `${campanha}-${v.id}`, ...(r.post_id ? { utm_term: String(r.post_id) } : {}) };
  let u;
  try { u = new URL(material); } catch { return null; }
  const site = new URL(env.SITE_URL || 'https://agenciasetup.com.br');
  // Material fora do site: vai o link direto, com as UTM.
  if (u.hostname.replace(/^www\./, '') !== site.hostname.replace(/^www\./, '')) {
    for (const [k, val] of Object.entries(utm)) u.searchParams.set(k, val);
    return { url: u.toString(), codigo: null };
  }
  const caminho = u.pathname + u.search;
  const tag = r.post_id ? String(r.post_id).replace(/[^a-z0-9]/gi, '').slice(-6).toLowerCase() : 'dm';
  const codigo = `${campanha.slice(0, 20).replace(/-+$/, '')}-${v.id}-${tag}`.slice(0, 40);
  const url = `${site.origin}/l/${codigo}`;
  if (linksMem.get(codigo) === caminho) return { url, codigo };
  const existe = await db.um(env, 'links', { codigo: `eq.${codigo}` }, 'codigo,destino,gatilho_id');
  if (existe) {
    // O código é de outra coisa (link criado à mão): vai o link direto, sem atropelar o outro.
    if (existe.gatilho_id !== g.id) return { url: material, codigo: null };
    if (existe.destino !== caminho) await db.update(env, 'links', { codigo: `eq.${codigo}` }, { destino: caminho }, 'codigo');
  } else {
    await db.insert(env, 'links', { codigo, destino: caminho, ...utm, utm_term: utm.utm_term || null, gatilho_id: g.id, variante: v.id }, { conflito: 'codigo', ignorar: true, select: 'codigo' });
  }
  linksMem.set(codigo, caminho);
  return { url, codigo };
}

// ---------------------------------------------------------------- varrer: acha quem comentou a palavra
// "recentes" (horas): só os posts publicados nesse intervalo. É a conferência de minuto em minuto, que responde rápido
// onde chegam quase todos os comentários; a de 10 minutos continua passando por todos.
// Cada perfil por si (lib/perfis.js): as palavras do perfil, os posts do perfil e a conta do perfil naquela rede.
// Quanto lê por volta. Workers pago (desde 10/11/2026): até 6 páginas de comentários por post; 10 posts na volta de 10
// minutos e 4 na de minuto em minuto, que é só a reserva do aviso da Meta (o comentário chega por ele em uns 8 segundos):
// ler todos os recentes a cada minuto dobraria as leituras na Meta sem ganho. Plano grátis: 2 páginas e 2 posts.
const paginasPorPost = (env) => (pago(env) ? 6 : 2);
const postsPorVolta = (env, recentes) => (pago(env) ? (recentes ? 4 : 10) : 2);
const custoVarrerPost = (env) => paginasPorPost(env) + 2; // chamadas externas para ler um post: as páginas, a gravação e a marca de lido
export async function varrerComentarios(env, { posts: maxPosts, recentes } = {}) {
  const gatilhos = await db.select(env, 'gatilhos', { filtros: { ativo: 'eq.true' }, select: 'id,rede,perfil,palavra,posts' });
  if (!gatilhos.length) return { posts: 0, novos: 0 };
  const cfg = await ajustesComenta(env);
  const resultado = { posts: 0, novos: 0 };
  const CUSTO_VARRER_POST = custoVarrerPost(env);
  const grupos = [...new Set(gatilhos.map((g) => `${g.rede}:${perfilValido(g.perfil)}`))];
  for (const grupo of grupos) {
    // Sem folga de chamadas externas nesta execução (nucleo/db.js): os posts que faltam ficam para a próxima volta.
    // Ler de novo depois não perde nada: o comentário entra uma vez só e o post menos lido vem primeiro.
    if (folgaDeChamadas(env) < CUSTO_VARRER_POST + 2) { resultado.sem_folga = true; break; }
    const [rede, perfil] = grupo.split(':');
    const c = await contaAtiva(env, rede, perfil);
    if (!c || !c.m.lerComentarios || !temRecurso(c.conexao, c.m, 'comentarios')) continue;
    const { conexao, m } = c;
    const daRede = gatilhos.filter((g) => g.rede === rede && perfilValido(g.perfil) === perfil);
    const fixos = [...new Set(daRede.flatMap((g) => g.posts || []))].filter((p) => /^[\w-]+$/.test(p));
    const genericas = new Set(daRede.filter((g) => !(g.posts || []).length).map((g) => normalPalavra(g.palavra)));
    const partes = [];
    if (fixos.length) partes.push(`id_na_rede.in.(${fixos.join(',')})`);
    if (genericas.size) partes.push(`and(publicado_em.gt.${new Date(Date.now() - JANELA_GENERICA).toISOString()},palavra_chave.not.is.null)`);
    if (!partes.length) continue;
    const candidatos = await db.select(env, 'posts_redes', {
      filtros: { rede: `eq.${rede}`, perfil: `eq.${perfil}`, or: `(${partes.join(',')})`, ...(recentes ? { publicado_em: `gt.${new Date(Date.now() - recentes * 3600_000).toISOString()}` } : {}) },
      select: 'id,id_na_rede,palavra_chave,comentarios_ate,comentarios_lidos_em', ordem: 'comentarios_lidos_em.asc.nullsfirst', limite: 40,
    });
    const alvo = candidatos.filter((p) => fixos.includes(p.id_na_rede) || genericas.has(normalPalavra(p.palavra_chave))).slice(0, maxPosts || postsPorVolta(env, recentes));
    if (!alvo.length) continue;
    const credenciais = await credenciaisAtivas(env, conexao);
    const eu = normalPalavra(String(conexao.conta_nome || '').replace(/^@/, ''));
    for (const p of alvo) {
      // Valem só os gatilhos deste post: os fixos nele e os genéricos da palavra que a legenda pede.
      const aplicaveis = [
        ...daRede.filter((g) => (g.posts || []).includes(p.id_na_rede)),
        ...daRede.filter((g) => !(g.posts || []).length && normalPalavra(g.palavra) === normalPalavra(p.palavra_chave)),
      ];
      // Primeira leitura: só os últimos 7 dias (resposta privada mais velha que isso a Meta recusa).
      const desde = p.comentarios_ate ? Date.parse(p.comentarios_ate) : Date.now() - 7 * DIA;
      if (folgaDeChamadas(env) < CUSTO_VARRER_POST) { resultado.sem_folga = true; break; }
      let comentarios;
      try {
        contarChamada(env, paginasPorPost(env)); // até esse tanto de páginas na rede
        comentarios = await m.lerComentarios({ credenciais, post_id: p.id_na_rede, desde, paginas: paginasPorPost(env) });
      } catch (e) {
        // Token morto desta conta: as outras contas (o outro perfil) continuam.
        if (await avisarSeTokenMorreu(env, conexao, e)) break;
        console.error('comenta varrer', p.id_na_rede, e && e.message);
        continue;
      }
      const linhas = [];
      for (const cm of comentarios) {
        if (normalPalavra(cm.usuario) === eu || (cm.pessoa_id && cm.pessoa_id === String(conexao.conta_id))) continue;
        const g = aplicaveis.find((x) => pediu(cm.texto, x.palavra, { tolerante: true }));
        // Conta de teste: sem pessoa_id, recebe de novo no mesmo post.
        if (g) linhas.push({ gatilho_id: g.id, rede, comentario_id: cm.id, post_id: p.id_na_rede, usuario: cm.usuario || null, nome: cm.nome ? primeiroNome(cm.nome) || null : null, pessoa_id: ehTestador(cfg, cm.usuario) ? null : cm.pessoa_id || null, texto: (cm.texto || '').slice(0, 300), comentado_em: cm.quando || null });
      }
      if (linhas.length) {
        const r = await db.insert(env, 'respostas_gatilho', linhas, { conflito: 'rede,comentario_id', ignorar: true, select: 'id' });
        resultado.novos += (r || []).length;
      }
      const maisNovo = comentarios.reduce((mx, cm) => Math.max(mx, Date.parse(cm.quando) || 0), desde);
      await db.update(env, 'posts_redes', { id: `eq.${p.id}` }, { comentarios_lidos_em: agora(), comentarios_ate: new Date(maisNovo).toISOString() }, 'id');
      resultado.posts++;
    }
  }
  return resultado;
}

// ---------------------------------------------------------------- na hora: o aviso da Meta (webhook)
// A Meta chama /api/redes/meta/webhook a cada comentário novo (com Acesso Avançado) e a cada mensagem ou toque de
// botão no direct, com o corpo assinado pela chave secreta do app (cabeçalho x-hub-signature-256). O token de
// verificação sai da CRIPTO_CHAVE (scripts/meta-webhook.mjs inscreve).
const MAX_AVISO = 1_000_000;
const iguais = (a, b) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function tokenVerificacaoMeta(env) {
  if (!env.CRIPTO_CHAVE) return null;
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`webhook-meta:${env.CRIPTO_CHAVE}`))).slice(0, 32);
}

// Vale a chave do app do Instagram (login do Instagram) ou a do app da Meta (login do Facebook).
async function assinaturaMeta(env, corpo, cabecalho) {
  if (!cabecalho || !cabecalho.startsWith('sha256=')) return false;
  for (const segredo of [env.INSTAGRAM_APP_SECRET, env.META_APP_SECRET].filter(Boolean)) {
    const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(segredo).trim()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    if (iguais(hex(await crypto.subtle.sign('HMAC', chave, corpo)), cabecalho.slice(7))) return true;
  }
  return false;
}

export async function webhookMeta(request, env, ctx, url) {
  if (request.method === 'GET') {
    const esperado = await tokenVerificacaoMeta(env);
    if (url.searchParams.get('hub.mode') === 'subscribe' && esperado && iguais(url.searchParams.get('hub.verify_token') || '', esperado)) {
      return new Response(url.searchParams.get('hub.challenge') || '', { headers: { 'content-type': 'text/plain' } });
    }
    return new Response('Proibido', { status: 403 });
  }
  if (request.method !== 'POST') return new Response('Método não permitido', { status: 405 });
  if (Number(request.headers.get('content-length') || 0) > MAX_AVISO) return new Response('Grande demais', { status: 413 });
  const bruto = new Uint8Array(await request.arrayBuffer());
  if (bruto.byteLength > MAX_AVISO) return new Response('Grande demais', { status: 413 });
  if (!(await assinaturaMeta(env, bruto, request.headers.get('x-hub-signature-256')))) return new Response('Assinatura inválida', { status: 401 });
  let corpo;
  try { corpo = JSON.parse(new TextDecoder().decode(bruto)); } catch { return new Response('JSON inválido', { status: 400 }); }
  ctx.waitUntil(avisosMeta(env, corpo, ctx).catch((e) => console.error('comenta webhook', e && e.message)));
  return new Response('EVENT_RECEIVED');
}

// A conta de cada aviso: entry.id é o id da conta na rede (a conta do Instagram ou a Página), e só as palavras do
// perfil dela valem. Sem conta com esse id e com uma conta só daquela rede, vale ela (como antes do segundo perfil).
async function contaDoAviso(env, rede, ids, guardadas) {
  for (const id of ids.filter(Boolean).map(String)) {
    if (!guardadas.has(`${rede}:${id}`)) guardadas.set(`${rede}:${id}`, await contaPorId(env, rede, id).catch(() => null));
    const c = guardadas.get(`${rede}:${id}`);
    if (c) return c;
  }
  if (!guardadas.has(`${rede}:*`)) {
    const todas = await contasAtivas(env, rede).catch(() => []);
    guardadas.set(`${rede}:*`, todas.length === 1 ? todas[0] : null);
  }
  return guardadas.get(`${rede}:*`);
}

async function avisosMeta(env, corpo, ctx) {
  const rede = corpo && corpo.object === 'instagram' ? 'instagram' : corpo && corpo.object === 'page' ? 'facebook' : null;
  if (!rede || !Array.isArray(corpo.entry)) return;
  // A chave do Claude (resposta pública escrita pela IA) vem de Integrações.
  await prepararIntegracoes(env).catch(() => {});
  const guardadas = new Map();
  const porConta = new Map(); // id da conexão -> { c, novos }
  const diretos = [];
  let semConta = 0;
  let novosTotal = 0;
  for (const entrada of corpo.entry.slice(0, 50)) {
    const novos = [];
    for (const mud of (Array.isArray(entrada.changes) ? entrada.changes : []).slice(0, 50)) {
      const v = (mud && mud.value) || {};
      if (rede === 'instagram' && mud.field === 'comments' && v.id && v.media && v.media.id) {
        novos.push({ post_id: String(v.media.id), comentario_id: String(v.id), texto: String(v.text || ''), usuario: String((v.from && v.from.username) || ''), autor_id: String((v.from && v.from.id) || ''), quando: agora() });
      } else if (rede === 'facebook' && mud.field === 'feed' && v.item === 'comment' && v.verb === 'add' && v.comment_id && v.post_id) {
        novos.push({ post_id: String(v.post_id), comentario_id: String(v.comment_id), texto: String(v.message || ''), usuario: '', nome: String((v.from && v.from.name) || ''), autor_id: String((v.from && v.from.id) || ''), quando: agora() });
      }
    }
    const mensagens = (Array.isArray(entrada.messaging) ? entrada.messaging : []).slice(0, 50);
    if (!novos.length && !mensagens.length) continue;
    novosTotal += novos.length;
    for (const m of mensagens) {
      const c = await contaDoAviso(env, rede, [entrada.id, m && m.recipient && m.recipient.id], guardadas);
      if (c) diretos.push({ m, c }); else semConta++;
    }
    if (!novos.length) continue;
    const c = await contaDoAviso(env, rede, [entrada.id], guardadas);
    if (!c) { semConta += novos.length; continue; }
    const g = porConta.get(c.conexao.id) || { c, novos: [] };
    g.novos.push(...novos);
    porConta.set(c.conexao.id, g);
  }
  let naFila = 0;
  for (const { c, novos } of porConta.values()) naFila += await registrarComentarios(env, rede, novos, c);
  const feitos = [];
  for (const { m, c } of diretos) feitos.push(await aoDirect(env, rede, m, c, ctx).catch((e) => { console.error('comenta direct', e && e.message); return 'erro'; }));
  // Só o tipo do aviso no registro do Worker (sem texto nem nome), para conferir com `wrangler tail`.
  const campos = corpo.entry.flatMap((e) => [...(e.changes || []).map((x) => x && x.field), ...(e.messaging ? ['messaging'] : [])]);
  console.log(`aviso meta: ${rede} ${[...new Set(campos)].join(',') || '-'}; ${novosTotal} comentário(s), ${naFila} na fila${feitos.length ? `; direct: ${feitos.join(', ')}` : ''}${semConta ? `; ${semConta} sem conta conectada com esse id` : ''}`);
  if (naFila) await enviarRespostas(env, { limite: 3 });
}

// Põe na fila os comentários que pediram a palavra (mesma regra do relógio: palavra fixa do post ou a genérica
// que a legenda pede, nos posts dos últimos 30 dias). Nunca responde a própria conta. "c" é a conta que recebeu o
// comentário: valem só as palavras e os posts do perfil dela (sem "c", a conta do Brasil).
export async function registrarComentarios(env, rede, comentarios, conta) {
  const c = conta || await contaAtiva(env, rede, 'br');
  const perfil = perfilValido(c && c.conexao.perfil);
  const gatilhos = await db.select(env, 'gatilhos', { filtros: { ativo: 'eq.true', rede: `eq.${rede}`, perfil: `eq.${perfil}` }, select: 'id,rede,palavra,posts' });
  if (!gatilhos.length) return 0;
  const cfg = await ajustesComenta(env);
  const eu = normalPalavra(String((c && c.conexao.conta_nome) || '').replace(/^@/, ''));
  const euId = String((c && c.conexao.conta_id) || '');
  const ids = [...new Set(comentarios.map((x) => x.post_id))].filter((p) => /^[\w-]+$/.test(p));
  const posts = ids.length ? await db.select(env, 'posts_redes', { filtros: { rede: `eq.${rede}`, perfil: `eq.${perfil}`, id_na_rede: `in.(${ids.join(',')})` }, select: 'id_na_rede,palavra_chave,publicado_em' }) : [];
  const porId = new Map(posts.map((p) => [p.id_na_rede, p]));
  const linhas = [];
  for (const cm of comentarios) {
    if ((eu && normalPalavra(cm.usuario) === eu) || (euId && cm.autor_id === euId)) continue;
    const p = porId.get(cm.post_id);
    const recente = p && Date.parse(p.publicado_em) > Date.now() - JANELA_GENERICA;
    const aplicaveis = [
      ...gatilhos.filter((g) => (g.posts || []).includes(cm.post_id)),
      ...(recente ? gatilhos.filter((g) => !(g.posts || []).length && normalPalavra(g.palavra) === normalPalavra(p.palavra_chave)) : []),
    ];
    const g = aplicaveis.find((x) => pediu(cm.texto, x.palavra, { tolerante: true }));
    if (g) linhas.push({ gatilho_id: g.id, rede, comentario_id: cm.comentario_id, post_id: cm.post_id, usuario: cm.usuario || null, nome: cm.nome ? primeiroNome(cm.nome) || null : null, pessoa_id: ehTestador(cfg, cm.usuario) ? null : cm.autor_id || null, texto: cm.texto.slice(0, 300), comentado_em: cm.quando });
  }
  if (!linhas.length) return 0;
  const r = await db.insert(env, 'respostas_gatilho', linhas, { conflito: 'rede,comentario_id', ignorar: true, select: 'id' });
  return (r || []).length;
}

// ---------------------------------------------------------------- enviar: direct + resposta pública, com limite
const marcar = (env, id, status, erro, extra) => db.rpc(env, 'marcar_resposta', { p_id: id, p_status: status, p_erro: erro || null, p_extra: extra || {} });
// O id que a Meta deu à mensagem que saiu. Vai junto no registro (extra.mid) e o banco guarda em mensagens_nossas, para
// o eco dela ser reconhecido como do sistema (atendente.js).
const midDe = (enviado) => (enviado && enviado.message_id ? String(enviado.message_id) : undefined);

// Chamadas externas do envio, para caber no limite da execução (contador em nucleo/db.js).
// O fixo: os ajustes, a conta da hora, a fila, as palavras e, no primeiro item, a conta, os números da versão, o link
// curto e a oferta. Cada item: o direct, o registro, a resposta pública (a IA, o consumo e o comentário) e o registro dela.
const CUSTO_ENVIO_FIXO = 10;
const CUSTO_ENVIO_ITEM = 7;
// Directs por execução (o teto por hora, config.comenta.limite_hora, vale por cima disto). Workers pago: 10, e não
// 40 como antes: cada item leva uns 5 segundos (o direct, a IA e a resposta pública), 40 seguidos passavam de 3
// minutos, o relógio rodava por cima de si mesmo e duas execuções juntas podiam passar do teto por hora. O pico real
// até 10/11/2026 foi de 3 directs num minuto. Plano grátis: 5.
const ENVIOS_POR_VEZ = (env) => (pago(env) ? 10 : 5);

export async function enviarRespostas(env, { limite } = {}) {
  // Só sai da fila o que dá para levar até o fim com as chamadas externas que sobram nesta execução.
  const cabem = Math.floor((folgaDeChamadas(env) - CUSTO_ENVIO_FIXO) / CUSTO_ENVIO_ITEM);
  if (cabem < 1) return { enviadas: 0, falhas: 0, limite: 'Sem folga de chamadas nesta execução: a fila fica para a próxima.' };
  const cfg = await ajustesComenta(env);
  // Limite por hora (proteção da conta): o que passar fica na fila para a próxima volta.
  const teto = Number(cfg.limite_hora) || 200;
  const umaHora = await db.select(env, 'respostas_gatilho', { filtros: { enviado_em: `gte.${new Date(Date.now() - 3600_000).toISOString()}` }, select: 'id', limite: teto + 1 }).catch(() => []);
  const folga = teto - (umaHora || []).length;
  if (folga <= 0) return { enviadas: 0, falhas: 0, limite: `Limite de ${teto} directs por hora.` };
  const lote = await db.rpc(env, 'pegar_respostas', { p_limite: Math.min(limite || ENVIOS_POR_VEZ(env), folga, cabem) });
  if (!lote || !lote.length) return { enviadas: 0, falhas: 0 };
  // O que foi pego e ainda não teve o envio começado. Se a volta parar antes da hora (acesso vencido, limite da Meta,
  // falta de chamadas, erro), esses voltam para "pendente" na hora, no fim da função. Em "enviando" fica só o item que
  // estava no meio do envio: esse o banco marca para conferência em vez de mandar de novo (pegar_respostas, migration 41).
  const naoTentados = new Set(lote.map((r) => r.id));
  const resolver = async (id, ...resto) => { await marcar(env, id, ...resto); naoTentados.delete(id); };
  const res = { enviadas: 0, falhas: 0 };
  try {
    await enviarLote(env, lote, { naoTentados, resolver, res });
  } finally {
    if (naoTentados.size) {
      res.devolvidas = naoTentados.size;
      await db.update(env, 'respostas_gatilho', { id: `in.(${[...naoTentados].join(',')})`, status: 'eq.enviando' }, { status: 'pendente', pego_em: null }, 'id').catch((e) => console.error('comenta devolver', e && e.message));
    }
  }
  return res;
}

async function enviarLote(env, lote, { naoTentados, resolver, res }) {
  const ids = [...new Set(lote.map((r) => r.gatilho_id).filter(Boolean))];
  const gatilhos = ids.length ? await db.select(env, 'gatilhos', { filtros: { id: `in.(${ids.join(',')})` }, select: CAMPOS_G }) : [];
  const porId = new Map(gatilhos.map((g) => [g.id, g]));
  // A oferta e a conta são as do perfil da palavra (lib/perfis.js): palavra do perfil em inglês sai pela conta em inglês.
  const ofertas = new Map();
  const ofertaDo = async (perfil) => {
    if (!ofertas.has(perfil)) ofertas.set(perfil, await ofertaAtiva(env, perfil).catch(() => null));
    return ofertas.get(perfil);
  };
  const contas = new Map();
  for (const r of lote) {
    // Faltou folga de chamadas para mais um item inteiro: os que sobraram voltam para a fila (no fim de enviarRespostas).
    if (folgaDeChamadas(env) < CUSTO_ENVIO_ITEM + 1) break;
    // Pedido pelo direct que parou no meio (o Worker caiu): não dá para responder como comentário.
    if (r.origem === 'direct') { await resolver(r.id, 'falhou', 'O envio pelo direct parou no meio. Confira no app.'); continue; }
    const g = porId.get(r.gatilho_id);
    if (!g || !g.ativo) { await resolver(r.id, 'ignorada', 'A palavra foi desligada antes do envio.'); continue; }
    const perfil = perfilValido(g.perfil);
    const idioma = idiomaDe(perfil);
    const tx = textosDe(idioma);
    const chave = `${r.rede}:${perfil}`;
    if (!contas.has(chave)) {
      // Rede com DM (Instagram, Facebook): o material vai no direct. Rede sem DM (YouTube): vai na resposta ao comentário.
      const c = await contaAtiva(env, r.rede, perfil);
      const porDm = !!(c && c.m.mensagemPrivada && temRecurso(c.conexao, c.m, 'mensagens'));
      const emPublico = !!(c && !c.m.mensagemPrivada && c.m.responderComentario && temRecurso(c.conexao, c.m, 'comentarios'));
      contas.set(chave, porDm || emPublico ? { ...c, porDm, credenciais: await credenciaisAtivas(env, c.conexao) } : null);
    }
    const c = contas.get(chave);
    if (!c) { await resolver(r.id, 'pendente', 'A conta não tem permissão de mensagens. Reconecte em Redes.'); continue; }
    const v = escolherVariante(g, await statsDe(env, g.id));
    if (!v) { await resolver(r.id, 'falhou', 'A palavra não tem versão ativa.'); res.falhas++; continue; }
    let link = null;
    try { link = await linkDaVariante(env, g, v, r); } catch (e) { console.error('comenta link', e && e.message); }
    if (!link) { await resolver(r.id, 'falhou', 'O material desta palavra não está publicado no site.'); res.falhas++; continue; }
    const titulo = tituloDe(g);
    // O nome só vem no comentário do Facebook; no Instagram, só depois do toque no botão.
    const usuario = r.nome || '';
    const espera = c.porDm && (g.modo === 'seguir' || g.modo === 'pergunta');
    let enviado = null;
    try {
      const pessoa = c.porDm && !espera ? await codigoDaPessoa(perfil, r.usuario).catch(() => '') : '';
      const curso = c.porDm && !espera ? cursoDaOferta(await ofertaDo(perfil), g, r.rede, pessoa) : null;
      // Daqui para a frente o envio começou: se a execução cair, este item não volta para a fila.
      naoTentados.delete(r.id);
      contarChamada(env);
      if (c.porDm) {
        const formas = espera
          ? formasPergunta(preencher(v.pergunta, { usuario, titulo, idioma }), `cx:${r.id}`, g.modo === 'seguir' ? tx.segui : tx.quero)
          : formasComLink(v.dm, { link: comPessoa(link.url, pessoa), usuario, titulo, botao: v.botao, curso, idioma });
        enviado = await c.m.mensagemPrivada({ credenciais: c.credenciais, comentario_id: r.comentario_id, formas });
      } else {
        await c.m.responderComentario({ credenciais: c.credenciais, comentario_id: r.comentario_id, texto: `${r.usuario ? `@${r.usuario} ` : ''}${tx.semDm(titulo, link.url)}` });
      }
    } catch (e) {
      if (await avisarSeTokenMorreu(env, c.conexao, e)) { await marcar(env, r.id, 'pendente', e.message); break; }
      const passageiro = e.status >= 500 || (e.extra && PASSAGEIRO.includes(e.extra.codigo));
      await marcar(env, r.id, passageiro ? 'pendente' : 'falhou', e.message);
      res.falhas++;
      if (passageiro) break; // limite da Meta: para agora e continua na próxima execução
      continue;
    }
    // O direct saiu: registra já, antes da resposta pública (que chama a IA e pode demorar ou cair). Se a execução
    // parar daqui para a frente, o item já está como enviado e não sai de novo. "mid" é o id da mensagem na Meta: o
    // banco guarda para reconhecer o eco dela (mensagens_nossas).
    statsMem.delete(g.id);
    await marcar(env, r.id, espera ? 'pergunta' : 'enviada', null, { variante: v.id, igsid: enviado && enviado.recipient_id ? String(enviado.recipient_id) : undefined, link_codigo: link.codigo || undefined, mid: midDe(enviado) });
    res.enviadas++;
    // A resposta pública ajuda o post (mais comentários) e avisa quem comentou. Escrita pela IA para aquela pessoa;
    // sem a IA (ou se ela falhar), uma das respostas da versão. Se falhar, o direct já foi.
    if (c.porDm && g.responder_publico !== false && c.m.responderComentario) {
      const lista = v.publico && v.publico.length ? v.publico : (g.respostas && g.respostas.length ? g.respostas : tx.respostas);
      const comIA = g.resposta_ia !== false && !!env.ANTHROPIC_CHAVE;
      if (comIA) contarChamada(env);
      const frase = (comIA && await respostaPublicaIA(env, { comentario: r.texto, palavra: g.palavra, titulo, exemplos: lista, idioma }))
        || preencher(lista[Math.floor(Math.random() * lista.length)], { usuario, titulo, idioma });
      contarChamada(env);
      const publico_ok = await c.m.responderComentario({ credenciais: c.credenciais, comentario_id: r.comentario_id, texto: frase }).then(() => true, (e) => { console.error('comenta resposta publica', e && e.message); return false; });
      // Só o campo: o estado não é tocado, porque a pessoa já pode ter tocado no botão nesse meio tempo.
      await db.update(env, 'respostas_gatilho', { id: `eq.${r.id}` }, { publico_ok }, 'id').catch((e) => console.error('comenta publico', e && e.message));
    }
  }
}

// ---------------------------------------------------------------- direct: toque no botão, resposta ou a palavra
// Só mensagem de verdade (texto, botão); leitura, reação e o eco das nossas mensagens também chegam por aqui.
// "conta": a conta que recebeu a mensagem (o aviso diz qual); só as palavras do perfil dela valem. Sem ela, a do Brasil.
export async function aoDirect(env, rede, m, conta, ctx) {
  if (!m || !m.sender || !m.sender.id) return 'sem remetente';
  if (!m.message && !m.postback) return 'sem mensagem';
  const msg = m.message || {};
  if (msg.is_echo) {
    // O eco de uma mensagem nossa. O id dele (msg.mid) é anotado e comparado com os ids que o sistema mandou
    // (atendente.js, anotarEco). Se não é de um envio do sistema e é texto simples que não veio do nosso app, foi alguém
    // da equipe pelo aplicativo: o Atendente fica quieto nessa conversa por um tempo.
    const doApp = !!msg.app_id && [env.META_APP_ID, env.INSTAGRAM_APP_ID].filter(Boolean).map(String).includes(String(msg.app_id));
    const comBotao = Array.isArray(msg.attachments) && msg.attachments.some((x) => x && x.type === 'template');
    if (rede === 'instagram' && m.recipient && m.recipient.id) return anotarEco(env, { igsid: String(m.recipient.id), mid: msg.mid, talvezGente: !doApp && !comBotao && !!msg.text });
    return `eco${msg.app_id ? (doApp ? ' do sistema' : ' de outro app') : ''}`;
  }
  if (msg.is_deleted) return 'eco';
  const c = conta || await contaAtiva(env, rede, 'br');
  if (!c || !c.m.mandarDirect) return 'sem conta';
  const igsid = String(m.sender.id);
  if (igsid === String(c.conexao.conta_id)) return 'nosso';
  const payload = String((msg.quick_reply && msg.quick_reply.payload) || (m.postback && m.postback.payload) || '');
  const texto = String(msg.text || payload || (m.postback && m.postback.title) || '').slice(0, 1000);
  // 1) Toque no botão (ou resposta) do primeiro direct dos modos seguir e pergunta.
  let pend = null;
  const doBotao = payload.match(/^cx:(\d{1,18})$/);
  if (doBotao) pend = await db.um(env, 'respostas_gatilho', { id: `eq.${doBotao[1]}`, status: 'eq.pergunta' });
  if (pend && pend.igsid && pend.igsid !== igsid) pend = null;
  if (!pend) [pend] = await db.select(env, 'respostas_gatilho', { filtros: { igsid: `eq.${igsid}`, status: 'eq.pergunta', criado_em: `gte.${new Date(Date.now() - 7 * DIA).toISOString()}` }, ordem: 'criado_em.desc', limite: 1 });
  const credenciais = await credenciaisAtivas(env, c.conexao);
  if (pend) return responderToque(env, c, credenciais, pend, igsid, texto);
  // 2) A palavra mandada no direct (de um story ou de um Reels): o material vai na hora.
  if (!texto || !msg.mid) return 'conversa';
  const r = await palavraNoDirect(env, c, credenciais, rede, igsid, msg.mid, texto);
  if (r !== 'conversa' || rede !== 'instagram') return r;
  // 3) Conversa comum: o Atendente anota na lista de follow-up e responde o que o dono já liberou (atendente.js).
  // Roda depois da resposta à Meta, para o aviso não estourar o tempo.
  const quem = await perfilDe(c, credenciais, igsid);
  const tarefa = atender(env, { conta: c, credenciais, igsid, mid: msg.mid, texto, deStory: !!(msg.reply_to && msg.reply_to.story), perfilDaPessoa: quem })
    .then((x) => { console.log(`atendente: ${x}`); return x; })
    .catch((e) => { console.error('atendente', e && e.message); return 'erro'; });
  if (ctx && ctx.waitUntil) { ctx.waitUntil(tarefa); return 'atendente'; }
  return tarefa;
}

async function perfilDe(c, credenciais, igsid) {
  if (!c.m.perfil) return null;
  try { return await c.m.perfil({ credenciais, para: igsid }); } catch (e) { console.error('comenta perfil', e && e.message); return null; }
}

async function responderToque(env, c, credenciais, pend, igsid, texto) {
  const g = pend.gatilho_id && await db.um(env, 'gatilhos', { id: `eq.${pend.gatilho_id}` }, CAMPOS_G);
  const v = g && variantesDe(g).find((x) => x.id === pend.variante);
  if (!g || !g.ativo || !v) return 'palavra desligada';
  // A palavra é de outro perfil (outra conta): não responde por esta.
  if (perfilValido(g.perfil) !== perfilValido(c.conexao.perfil)) return 'outro perfil';
  const perfil = perfilValido(g.perfil);
  const idioma = idiomaDe(perfil);
  const tx = textosDe(idioma);
  // Toques seguidos no botão: um a cada 5 segundos.
  if (pend.respondeu_em && Date.now() - Date.parse(pend.respondeu_em) < 5000) return 'toque repetido';
  const tomado = await db.update(env, 'respostas_gatilho', { id: `eq.${pend.id}`, status: 'eq.pergunta' }, { status: 'respondendo', respondeu_em: agora() }, 'id');
  if (!(tomado || []).length) return 'já respondido';
  if ((idioma === 'en' ? PARAR_EN : PARAR).has(normalPalavra(texto).replace(/[^a-z]/g, ''))) { await marcar(env, pend.id, 'ignorada', 'A pessoa não quis o material.'); return 'não quis'; }
  const quem = await perfilDe(c, credenciais, igsid);
  const usuario = primeiroNome(quem && quem.nome);
  const segue = quem ? quem.segue : null;
  const titulo = tituloDe(g);
  const extra = { igsid, nome: usuario || undefined, usuario: (quem && quem.usuario) || undefined };
  // Modo seguir: o material só vai para quem segue; quem não segue recebe o lembrete com o botão de novo. Se a Meta
  // não disser se segue, vai o material (melhor do que travar todo mundo).
  if (g.modo === 'seguir' && segue === false) {
    let lembrete = null;
    try {
      lembrete = await c.m.mandarDirect({ credenciais, para: igsid, formas: formasPergunta(preencher(v.lembrete || tx.lembrete, { usuario, titulo, idioma }), `cx:${pend.id}`, tx.segui) });
    } catch (e) { console.error('comenta lembrete', e && e.message); }
    await marcar(env, pend.id, 'pergunta', null, { ...extra, seguia: false, mid: midDe(lembrete) });
    return 'lembrete';
  }
  const link = await linkDaVariante(env, g, v, pend);
  if (!link) { await marcar(env, pend.id, 'falhou', 'O material desta palavra não está publicado no site.', extra); return 'sem material'; }
  let saiu = null;
  try {
    const oferta = await ofertaAtiva(env, perfil).catch(() => null);
    const pessoa = await codigoDaPessoa(perfil, (quem && quem.usuario) || pend.usuario).catch(() => '');
    saiu = await c.m.mandarDirect({ credenciais, para: igsid, formas: formasComLink(v.depois || v.dm, { link: comPessoa(link.url, pessoa), usuario, titulo, botao: v.botao, curso: cursoDaOferta(oferta, g, pend.rede, pessoa), idioma }) });
  } catch (e) {
    await marcar(env, pend.id, 'falhou', `O material não saiu: ${e.message}`, extra);
    return 'erro';
  }
  // "seguia": se já seguia no primeiro toque. Quem passou a seguir depois do lembrete conta como seguidor novo.
  const passou = g.modo === 'seguir' && pend.seguia === false && segue === true;
  await marcar(env, pend.id, 'link', null, { ...extra, mid: midDe(saiu), link_codigo: link.codigo || undefined, ...(passou ? { seguiu: true } : segue === null ? {} : { seguia: segue }) });
  statsMem.delete(g.id);
  return 'link';
}

async function palavraNoDirect(env, c, credenciais, rede, igsid, mid, texto) {
  const perfil = perfilValido(c.conexao.perfil);
  const idioma = idiomaDe(perfil);
  const tx = textosDe(idioma);
  const ativos = await db.select(env, 'gatilhos', { filtros: { ativo: 'eq.true', rede: `eq.${rede}`, perfil: `eq.${perfil}` }, select: CAMPOS_G });
  const g = ativos.find((x) => pediu(texto, x.palavra));
  if (!g) return 'conversa';
  // Um material por pessoa a cada 24 horas pelo direct (evita vai e vem com robô e não gasta o limite).
  const recente = await db.select(env, 'respostas_gatilho', { filtros: { igsid: `eq.${igsid}`, origem: 'eq.direct', criado_em: `gte.${new Date(Date.now() - DIA).toISOString()}` }, select: 'id', limite: 1 });
  if (recente.length) return 'repetido';
  const [r] = await db.insert(env, 'respostas_gatilho', [{ gatilho_id: g.id, rede, origem: 'direct', comentario_id: `dm:${mid}`.slice(0, 200), igsid, texto: texto.slice(0, 300), status: 'enviando', comentado_em: agora(), pego_em: agora() }], { conflito: 'rede,comentario_id', ignorar: true, select: '*' });
  if (!r) return 'repetido';
  const v = escolherVariante(g, await statsDe(env, g.id));
  if (!v) { await marcar(env, r.id, 'falhou', 'A palavra não tem versão ativa.'); return 'sem versão'; }
  const quem = await perfilDe(c, credenciais, igsid);
  const usuario = primeiroNome(quem && quem.nome);
  const titulo = tituloDe(g);
  const extra = { variante: v.id, igsid, nome: usuario || undefined, usuario: (quem && quem.usuario) || undefined };
  const link = await linkDaVariante(env, g, v, r);
  if (!link) { await marcar(env, r.id, 'falhou', 'O material desta palavra não está publicado no site.', extra); return 'sem material'; }
  try {
    // Modo seguir para quem ainda não segue: o pedido para seguir com o botão; o material no toque.
    if (g.modo === 'seguir' && quem && quem.segue === false) {
      const pedido = await c.m.mandarDirect({ credenciais, para: igsid, formas: formasPergunta(preencher(v.pergunta, { usuario, titulo, idioma }), `cx:${r.id}`, tx.segui) });
      await marcar(env, r.id, 'pergunta', null, { ...extra, seguia: false, link_codigo: link.codigo || undefined, mid: midDe(pedido) });
      return 'pergunta';
    }
    const oferta = await ofertaAtiva(env, perfil).catch(() => null);
    const pessoa = await codigoDaPessoa(perfil, quem && quem.usuario).catch(() => '');
    const saiu = await c.m.mandarDirect({ credenciais, para: igsid, formas: formasComLink(g.modo === 'direto' ? v.dm : v.depois, { link: comPessoa(link.url, pessoa), usuario, titulo, botao: v.botao, curso: cursoDaOferta(oferta, g, rede, pessoa), idioma }) });
    await marcar(env, r.id, 'enviada', null, { ...extra, mid: midDe(saiu), link_codigo: link.codigo || undefined, ...(quem && quem.segue !== null ? { seguia: quem.segue } : {}) });
    statsMem.delete(g.id);
    return 'material';
  } catch (e) {
    await marcar(env, r.id, 'falhou', e.message, extra);
    return 'erro';
  }
}
