// Leitura do que o site mostra: só o que está publicado.
// No computador, com AMBIENTE=local e DEMO=1, as telas usam exemplos (demo.js) para revisar o visual.
import { db } from '../nucleo/db.js';
import * as D from './demo.js';

const LISTA_RECURSO = 'id,slug,titulo,resumo,tipo,categoria_id,capa_url,galeria,ferramentas,tags,downloads,destaque,link_uso,publicado_em';
const LISTA_ARTIGO = 'id,slug,titulo,resumo,categoria_id,capa_url,tags,destaque,publicado_em';
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
  const filtros = { status: 'eq.publicado' };
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

export async function artigos(env, { categoria, limite = 12, offset = 0 } = {}) {
  if (demo(env)) return D.artigos({ limite, offset });
  const filtros = { status: 'eq.publicado' };
  if (categoria) filtros.categoria_id = `eq.${categoria}`;
  return db.select(env, 'artigos', { filtros, select: LISTA_ARTIGO, ordem: 'publicado_em.desc', limite, offset, contar: true });
}

export const recurso = (env, slug) => (demo(env) ? Promise.resolve(D.recurso(slug)) : db.um(env, 'recursos', { slug: `eq.${slug}`, status: 'eq.publicado' }));
export const artigo = (env, slug) => (demo(env) ? Promise.resolve(D.artigo(slug)) : db.um(env, 'artigos', { slug: `eq.${slug}`, status: 'eq.publicado' }));
export const landing = (env, slug) => db.um(env, 'landing_pages', { slug: `eq.${slug}`, status: 'eq.publicado' }, '*,produto:produtos(*)');

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
    db.select(env, 'recursos', { filtros: { status: 'eq.publicado' }, select: 'slug,atualizado_em', limite: 5000 }),
    db.select(env, 'artigos', { filtros: { status: 'eq.publicado' }, select: 'slug,atualizado_em', limite: 5000 }),
    db.select(env, 'landing_pages', { filtros: { status: 'eq.publicado' }, select: 'slug,atualizado_em', limite: 500 }),
  ]);
  return [
    ...r.map((x) => ({ loc: `/recursos/${x.slug}`, lastmod: x.atualizado_em })),
    ...a.map((x) => ({ loc: `/novidades/${x.slug}`, lastmod: x.atualizado_em })),
    ...l.map((x) => ({ loc: `/cursos/${x.slug}`, lastmod: x.atualizado_em })),
  ];
}
