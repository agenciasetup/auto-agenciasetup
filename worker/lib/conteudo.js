// Leitura do que o site mostra: só o que está publicado.
import { db } from '../nucleo/db.js';

const CAMPOS_LISTA_RECURSO = 'id,slug,titulo,resumo,tipo,categoria_id,capa_url,tags,downloads,destaque,publicado_em';
const CAMPOS_LISTA_ARTIGO = 'id,slug,titulo,resumo,categoria_id,capa_url,tags,destaque,publicado_em';

// Guarda por 60 s no próprio Worker o que quase não muda (categorias e configuração).
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
    const linhas = await db.select(env, 'config');
    return Object.fromEntries(linhas.map((l) => [l.chave, l.valor]));
  });
}

export function recursos(env, { categoria, tipo, limite = 24, offset = 0, busca } = {}) {
  const filtros = { status: 'eq.publicado' };
  if (categoria) filtros.categoria_id = `eq.${categoria}`;
  if (tipo) filtros.tipo = `eq.${tipo}`;
  if (busca) filtros.or = `(titulo.ilike.*${busca}*,resumo.ilike.*${busca}*)`;
  return db.select(env, 'recursos', { filtros, select: CAMPOS_LISTA_RECURSO, ordem: 'destaque.desc,publicado_em.desc', limite, offset, contar: true });
}

export function artigos(env, { categoria, limite = 12, offset = 0 } = {}) {
  const filtros = { status: 'eq.publicado' };
  if (categoria) filtros.categoria_id = `eq.${categoria}`;
  return db.select(env, 'artigos', { filtros, select: CAMPOS_LISTA_ARTIGO, ordem: 'publicado_em.desc', limite, offset, contar: true });
}

export const recurso = (env, slug) => db.um(env, 'recursos', { slug: `eq.${slug}`, status: 'eq.publicado' });
export const artigo = (env, slug) => db.um(env, 'artigos', { slug: `eq.${slug}`, status: 'eq.publicado' });
export const landing = (env, slug) => db.um(env, 'landing_pages', { slug: `eq.${slug}`, status: 'eq.publicado' }, '*,produto:produtos(*)');

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
