// Leitura do que o site mostra: só o que está publicado.
// No computador, com AMBIENTE=local e DEMO=1, as telas usam exemplos (demo.js) para revisar o visual.
import { comCampanha } from './campanha.js';
import { db } from '../nucleo/db.js';
import * as D from './demo.js';
import { ofertaAtiva } from './gatilhos.js';
import { videoBunny } from './bunny.js';

const LISTA_RECURSO = 'id,slug,titulo,resumo,tipo,categoria_id,capa_url,galeria,ferramentas,tags,downloads,destaque,link_uso,publicado_em';
const LISTA_ARTIGO = 'id,slug,titulo,resumo,categoria_id,capa_url,tags,destaque,tipo,assunto,publicado_em,atualizado_em';
const demo = (env) => env.AMBIENTE === 'local' && env.DEMO === '1';

// Guarda por 60 s no próprio Worker o que quase não muda.
const memoria = new Map();
async function lembrar(chave, fn, ms = 60_000) {
  const m = memoria.get(chave);
  if (m && m.ate > Date.now()) return m.valor;
  const valor = await fn();
  memoria.set(chave, { valor, ate: Date.now() + ms });
  return valor;
}

export const categorias = (env) => lembrar('categorias', () => db.select(env, 'categorias', { ordem: 'ordem.asc' }));

// A oferta do fim do funil (mini curso), quando está no ar. Some sozinha se a landing page sair do ar.
export const oferta = (env) => (demo(env) ? Promise.resolve(null) : lembrar('oferta', () => ofertaAtiva(env).catch(() => null)));

export async function config(env) {
  return lembrar('config', async () => {
    const linhas = await db.select(env, 'config', { filtros: { chave: 'in.(site,adsense)' } });
    return Object.fromEntries(linhas.map((l) => [l.chave, l.valor]));
  });
}

export function contagens(env) {
  if (demo(env)) return Promise.resolve(D.contagens());
  return lembrar('contagens', () => db.rpc(env, 'contagens_recursos'), 30_000);
}

const limpar = (s) => String(s || '').replace(/[%*,()."'\\]/g, ' ').trim().slice(0, 80);

export async function recursos(env, { tipo, semTipo, categoria, ferramenta, busca, ordem = 'populares', limite = 24, offset = 0, exceto } = {}) {
  if (demo(env)) return D.recursos({ tipo, semTipo, categoria, ferramenta, busca, ordem, limite, offset, exceto });
  // O site em português mostra só os recursos do Brasil (os do perfil em inglês moram em agenciasetup.com/free).
  const filtros = { status: 'eq.publicado', perfil: 'eq.br' };
  if (tipo) filtros.tipo = `eq.${tipo}`;
  else if (semTipo) filtros.tipo = `neq.${semTipo}`;
  if (categoria) filtros.categoria_id = `eq.${categoria}`;
  if (ferramenta) filtros.ferramentas = `cs.{${limpar(ferramenta)}}`;
  if (exceto) filtros.id = `neq.${exceto}`;
  const b = limpar(busca);
  if (b) filtros.or = `(titulo.ilike.*${b}*,resumo.ilike.*${b}*)`;
  const ord = ordem === 'novos' ? 'publicado_em.desc' : 'destaque.desc,downloads.desc,publicado_em.desc';
  return db.select(env, 'recursos', { filtros, select: LISTA_RECURSO, ordem: ord, limite, offset, contar: true });
}

// assunto: novidades, ia, equipamentos, tutoriais ou guias (lib/assuntos.js). autor: o id de quem assina.
export async function artigos(env, { categoria, assunto, autor, limite = 12, offset = 0 } = {}) {
  if (demo(env)) return D.artigos({ limite, offset });
  const filtros = { status: 'eq.publicado' };
  if (categoria) filtros.categoria_id = `eq.${categoria}`;
  if (assunto) filtros.assunto = `eq.${assunto}`;
  if (autor) filtros.autor_id = `eq.${autor}`;
  return db.select(env, 'artigos', { filtros, select: LISTA_ARTIGO, ordem: 'publicado_em.desc', limite, offset, contar: true });
}

// Os assuntos com algum artigo publicado (os atalhos do topo das listas e o sitemap só mostram esses).
export const assuntosComConteudo = (env) => (demo(env) ? Promise.resolve(['novidades']) : lembrar('assuntos', async () => {
  const l = await db.select(env, 'artigos', { filtros: { status: 'eq.publicado' }, select: 'assunto', limite: 5000 }).catch(() => []);
  return [...new Set(l.map((x) => x.assunto || 'novidades'))];
}));

export const autor = (env, slug) => db.um(env, 'autores', { slug: `eq.${slug}`, ativo: 'eq.true' });

export const recurso = (env, slug) => (demo(env) ? Promise.resolve(D.recurso(slug)) : db.um(env, 'recursos', { slug: `eq.${slug}`, status: 'eq.publicado', perfil: 'eq.br' }));
// O material em inglês (agenciasetup.com/free/<slug>). No computador mostra também o rascunho, para revisar antes de publicar.
export const recursoEn = (env, slug) => db.um(env, 'recursos', { slug: `eq.${slug}`, perfil: 'eq.en', status: env.AMBIENTE === 'local' ? 'neq.arquivado' : 'eq.publicado' });
// Com quem assina e quem revisou (duas ligações com autores, por isso o nome da coluna depois do !).
export const artigo = (env, slug) => (demo(env) ? Promise.resolve(D.artigo(slug)) : db.um(env, 'artigos', { slug: `eq.${slug}`, status: 'eq.publicado' }, '*,autor:autores!autor_id(slug,nome,cargo,foto_url,perfis),revisor:autores!revisor_id(slug,nome)'));
export const landing = (env, slug) => db.um(env, 'landing_pages', { slug: `eq.${slug}`, status: 'eq.publicado' }, '*,produto:produtos(*)');

// O que a página de venda mostra além do texto: a oferta ativa do produto, o curso (módulos, aulas e kit)
// e o vídeo do topo. Vídeo: "aula:1.1" (só aula marcada como grátis) ou o id de um vídeo do Bunny (a VSL).
export async function dadosDaVenda(env, lp) {
  if (!lp.produto_id) return { oferta: null, curso: null, video: null };
  const [ofertas, acessos] = await Promise.all([
    db.select(env, 'ofertas', { filtros: { produto_id: `eq.${lp.produto_id}`, ativa: 'eq.true' }, select: 'id,slug,nome,preco_centavos,preco_de_centavos,parcelas_max,juros_mes,pix_desconto_pct,metodos,garantia_dias,checkout,valida_ate', ordem: 'criado_em.asc' }),
    db.select(env, 'produto_acessos', { filtros: { produto_id: `eq.${lp.produto_id}` }, select: 'curso_id' }),
  ]);
  const agora = Date.now();
  const abertas = ofertas.filter((o) => !o.valida_ate || new Date(o.valida_ate).getTime() > agora).map((o) => comCampanha(o));
  const doLink = ((lp.produto && lp.produto.link_checkout) || '').match(/\/checkout\/([a-z0-9-]+)/);
  const oferta = (doLink && abertas.find((o) => o.slug === doLink[1])) || abertas[0] || null;
  // Os bumps da oferta: a página oferece o primeiro como botão ("Vitalício por + R$ ..."), que chega ao checkout já marcado.
  if (oferta) {
    const bumps = await db.select(env, 'ofertas_bumps', { filtros: { oferta_id: `eq.${oferta.id}` }, select: 'titulo,ordem,bump:ofertas!ofertas_bumps_bump_id_fkey(slug,nome,preco_centavos)', ordem: 'ordem.asc' }).catch(() => []);
    oferta.bumps = bumps.filter((b) => b.bump).map((b) => ({ ...b.bump, titulo: b.titulo }));
  }
  let curso = null;
  if (acessos.length) {
    const id = acessos[0].curso_id;
    const [c, modulos, aulas, arquivos] = await Promise.all([
      db.um(env, 'cursos', { id: `eq.${id}` }, 'id,slug,titulo,capa_url,certificado_pct'),
      db.select(env, 'modulos', { filtros: { curso_id: `eq.${id}` }, select: 'id,numero,titulo', ordem: 'ordem.asc' }),
      db.select(env, 'aulas', { filtros: { curso_id: `eq.${id}`, status: 'eq.publicado' }, select: 'id,modulo_id,codigo,titulo,duracao_s,gratis,capa_url,video_bunny', ordem: 'ordem.asc' }),
      db.select(env, 'arquivos', { filtros: { curso_id: `eq.${id}` }, select: 'nome,tipo,o_que', ordem: 'ordem.asc' }),
    ]);
    if (c) curso = { ...c, arquivos, aulas, modulos: modulos.map((m) => ({ ...m, aulas: aulas.filter((a) => a.modulo_id === m.id) })).filter((m) => m.aulas.length) };
  }
  const heroi = (Array.isArray(lp.blocos) ? lp.blocos : []).find((b) => b.tipo === 'heroi') || {};
  let video = null;
  const v = String(heroi.video || '').trim();
  if (v && env.BUNNY_BIBLIOTECA) {
    const aula = v.startsWith('aula:') && curso ? curso.aulas.find((a) => a.codigo === v.slice(5) && a.gratis && a.video_bunny) : null;
    const id = aula ? aula.video_bunny : (/^[0-9a-f-]{36}$/i.test(v) ? v : null);
    if (id) {
      const b = await videoBunny(env, id);
      video = { url: b.url, poster: heroi.video_capa || (aula && aula.capa_url) || (curso && curso.capa_url) || null, duracao_s: Number(heroi.video_duracao_s) || (aula && aula.duracao_s) || null };
    }
  }
  return { oferta, curso, video };
}

// Parecidos: mesmo tipo primeiro, depois mesmo assunto.
export async function relacionados(env, r, limite = 3) {
  const a = (await recursos(env, { tipo: r.tipo, exceto: r.id, limite })).linhas;
  if (a.length >= limite || !r.categoria_id) return a.slice(0, limite);
  const b = (await recursos(env, { categoria: r.categoria_id, exceto: r.id, limite })).linhas.filter((x) => !a.some((y) => y.id === x.id));
  return [...a, ...b].slice(0, limite);
}

export async function buscar(env, q, limite = 20) {
  const termo = String(q || '').trim().slice(0, 80);
  if (termo.length < 2) return { recursos: [], artigos: [] };
  if (demo(env)) return D.buscar(termo);
  return db.rpc(env, 'buscar', { p_q: termo, p_limite: limite });
}

// Para o sitemap: tudo o que está publicado, só endereço e data.
export async function enderecos(env) {
  const [r, a, l] = await Promise.all([
    db.select(env, 'recursos', { filtros: { status: 'eq.publicado', perfil: 'eq.br' }, select: 'slug,atualizado_em', limite: 5000 }),
    db.select(env, 'artigos', { filtros: { status: 'eq.publicado' }, select: 'slug,atualizado_em', limite: 5000 }),
    db.select(env, 'landing_pages', { filtros: { status: 'eq.publicado' }, select: 'slug,seo,atualizado_em', limite: 500 }),
  ]);
  return [
    ...r.map((x) => ({ loc: `/recursos/${x.slug}`, lastmod: x.atualizado_em })),
    ...a.map((x) => ({ loc: `/novidades/${x.slug}`, lastmod: x.atualizado_em })),
    ...l.filter((x) => !(x.seo && x.seo.vitrine === false)).map((x) => ({ loc: `/cursos/${x.slug}`, lastmod: x.atualizado_em })),
  ];
}
