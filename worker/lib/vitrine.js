// Vender dentro do curso (seção 3): o cartão "Quer ir além?" pelo tema da aula (as tags da aula e do curso casam com as
// tags do produto, como os anúncios do site), o marcador de oferta no minuto do vídeo e a fileira "Para você conhecer".
// Regra: só para quem ainda não tem o produto, uma oferta por tela e nunca por cima do vídeo (a exceção é a etiqueta
// pequena do fim deste arquivo, que só abre o painel quando a pessoa toca nela).
import { db } from '../nucleo/db.js';
import { videoBunny } from './bunny.js';
import { cursosComMarca } from './marcas.js';
import { ofertaLigada } from './vendas.js';

// Cada app oferece só o que é dele (escopo da API do aluno): o da Setup, os produtos dos cursos sem marca própria (e os
// sem curso); o de uma marca, os produtos dos cursos do mesmo endereço. Assim o app em português não oferece o curso em
// dólar, e o em inglês não oferece os cursos em português. Sem escopo, vale tudo.
async function doApp(env, escopo) {
  if (!escopo) return () => true;
  const marcas = await cursosComMarca(env);
  const dominio = escopo !== 'setup' ? escopo.dominio || null : null;
  if (escopo !== 'setup' && !dominio) return (cursos) => cursos.length > 0 && cursos.every((c) => (escopo.cursos || [escopo.curso_id]).includes(c));
  return (cursos) => (dominio ? cursos.length > 0 && cursos.every((c) => (marcas.get(c) || {}).dominio === dominio) : cursos.every((c) => !marcas.has(c)));
}

// Produtos ativos com oferta aberta que a pessoa ainda não tem. cursosIds: os cursos da pessoa.
export async function ofertasAbertas(env, cursosIds, escopo = null) {
  const doEsteApp = await doApp(env, escopo);
  const prods = await db.select(env, 'produtos', {
    filtros: { ativo: 'is.true' },
    select: 'id,slug,nome,chamada,imagem_url,tags,preco_centavos,produto_acessos(curso_id),ofertas(slug,nome,preco_centavos,preco_de_centavos,ativa,valida_ate)',
    limite: 50,
  });
  const agora = Date.now();
  return prods.map((p) => {
    const cursos = (p.produto_acessos || []).map((a) => a.curso_id);
    const tem = cursos.length && cursos.every((c) => cursosIds.includes(c));
    if (!doEsteApp(cursos)) return null;
    const ofs = (p.ofertas || []).filter((o) => o.ativa && (!o.valida_ate || new Date(o.valida_ate).getTime() > agora)).sort((a, b) => a.preco_centavos - b.preco_centavos);
    return tem || !ofs.length ? null : { id: p.id, slug: p.slug, nome: p.nome, chamada: p.chamada, imagem_url: p.imagem_url, tags: p.tags || [], oferta: ofs[0] };
  }).filter(Boolean);
}

// A oferta que mais casa com o tema (tags da aula + do curso). Sem tag em comum, nada aparece.
export async function ofertaPeloTema(env, cursosIds, tags, escopo = null) {
  const alvo = new Set((tags || []).map((t) => String(t).toLowerCase()));
  if (!alvo.size) return null;
  const abertas = await ofertasAbertas(env, cursosIds, escopo);
  const comNota = abertas.map((o) => ({ o, n: o.tags.filter((t) => alvo.has(String(t).toLowerCase())).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  return comNota.length ? comNota[0].o : null;
}

// A etiqueta em cima do vídeo das aulas, como a do YouTube: "✨ Vídeo e voz gerados com IA | Aprender" (pedido do dono,
// 26/10/2026). Vem da oferta que tem checkout.etiqueta, com o slug do curso em .cursos, e só com a oferta ligada (no
// computador, OFERTAS_LIGADAS liga na memória). Quem já tem o produto vê "Ir para o curso". Sem VSL, o painel mostra só o texto.
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function etiquetaDoVideo(env, curso, aluno, matriculados) {
  const ofs = await db.select(env, 'ofertas', {
    filtros: { 'checkout->etiqueta': 'not.is.null' },
    select: 'id,slug,nome,produto_id,preco_centavos,preco_de_centavos,ativa,valida_ate,checkout,produto:produtos(produto_acessos(curso:cursos(id,slug,status)))',
    ordem: 'criado_em.asc', limite: 10,
  });
  const o = ofs.find((x) => ofertaLigada(env, x) && ((x.checkout.etiqueta || {}).cursos || []).includes(curso.slug));
  if (!o) return null;
  const e = o.checkout.etiqueta;
  const cursos = ((o.produto && o.produto.produto_acessos) || []).map((a) => a.curso).filter(Boolean);
  const tem = cursos.length > 0 && cursos.every((c) => matriculados.includes(c.id));
  const vsl = !tem && GUID.test(String(e.vsl_bunny || '')) && env.BUNNY_BIBLIOTECA
    ? await videoBunny(env, String(e.vsl_bunny), 'autoplay=true&preload=true&responsive=true') : null;
  const poster = o.checkout.poster || {};
  return {
    rotulo: String(e.rotulo || 'Vídeo e voz gerados com IA').slice(0, 60),
    acao: tem ? 'Ir para o curso' : String(e.acao || 'Aprender').slice(0, 30),
    tem, curso: cursos[0] ? cursos[0].slug : null, cor: poster.cor || '#8b5cf6',
    titulo: o.nome, sub: [poster.tipo, poster.pe].filter(Boolean).join(' · '),
    texto: String(e.texto || '').slice(0, 400), vsl: vsl ? vsl.url : null,
    oferta: o.slug, produto_id: o.produto_id, preco_centavos: o.preco_centavos, preco_de_centavos: o.preco_de_centavos || null,
    // Para o checkout já abrir com o e-mail e o nome (vão depois do #, que não chega a servidor nenhum).
    pre: tem ? null : { email: aluno.email, nome: aluno.nome || '' },
  };
}
