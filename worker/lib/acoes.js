// As ações do sistema, num lugar só: o painel (/api/admin) e o conector do Claude (/mcp) chamam daqui.
// Cada ação confere o cargo (permissoes.js) e grava na auditoria. x = { env, ctx, url, u } (u = quem pede).
import { auditar, exigir } from '../nucleo/auth.js';
import { db, enviarArquivo as subirArquivo } from '../nucleo/db.js';
import { NOME_PAPEL, PAPEIS, acimaOuIgual, pode } from '../nucleo/permissoes.js';
import { Erro, aleatorio, sha256, slugar, urlSegura } from '../nucleo/util.js';
import { plataforma } from '../plataformas/index.js';
import { contaDaPeca, publicarPeca } from '../plataformas/fila.js';
import { atualizarMetricas, situacaoContas, sincronizarPosts } from './desempenho.js';
import { MODOS, chanceDeSerAMelhor, comVendas, conferirVariantes, escreverVariantesIA, variantesDe, vendasDasVersoes } from './comenta.js';
import { esquecerAjustesComenta, linkDoGatilho, ofertaAtiva } from './gatilhos.js';
import { prepararIntegracoes } from './integracoes.js';
import { PERFIS, idiomaDe, perfilDe, siteDoPerfil } from './perfis.js';
import { atualizarRadar, situacaoFontes } from './radar.js';
import { normalPalavra } from './temas.js';
import { avisarIndexNow } from './seo.js';
import { ASSUNTOS, INTENCOES, TIPOS_ARTIGO, caminhoArtigo } from './assuntos.js';
import { analisar } from './analisador-seo.js';
import { aprenderComARecusa, lerRecusa, listarRecusas } from './recusas.js';

// As ações da área de membros (vendas, alunos, aulas, ofertas, links) ficam em acoes-area.js e saem por aqui também.
export * from './acoes-area.js';
export * from './acoes-comunidade.js';
export * from './acoes-integracoes.js';
export * from './acoes-cursos.js';
export * from './acoes-plataforma.js';
export * from './acoes-suporte.js';
export * from './acoes-entregas.js';
export * from './acoes-arquivos.js'; // a entrega de arquivo com licença (a Família Calango)
export * from './acoes-followup.js';
export * from './acoes-avisos.js';
export * from './acoes-seo.js';
export * from './acoes-escritorio.js';
export * from './acoes-colmeia.js';
export * from './acoes-treino.js';
export * from './acoes-chamados.js';
export * from './acoes-esperando.js';
export * from './acoes-video.js';
export * from './acoes-design.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// O perfil que veio de fora (painel, Claude). Para gravar, valor desconhecido é erro (nunca vira o do Brasil calado:
// um post em inglês iria para @agenciasetup). Vazio: o padrão.
function lerPerfil(v, padrao = 'br') {
  if (v === undefined || v === null || v === '') return padrao;
  const p = String(v).trim().toLowerCase();
  if (!PERFIS[p]) throw new Erro(400, `Perfil desconhecido: ${String(v).slice(0, 20)}. Use br (Agência Setup, Brasil) ou en (Setup Agency, inglês).`);
  return p;
}
// Para filtrar uma lista: br, en ou nada (todos).
const filtroPerfil = (v) => (PERFIS[String(v || '').trim().toLowerCase()] ? String(v).trim().toLowerCase() : null);

// Campos que cada tabela aceita de fora.
const CAMPOS = {
  recursos: ['slug', 'titulo', 'resumo', 'corpo_md', 'tipo', 'categoria_id', 'capa_url', 'arquivo_url', 'arquivo_nome', 'arquivo_bytes', 'link_externo', 'tags', 'destaque', 'seo',
    'ferramentas', 'galeria', 'video_url', 'link_uso', 'itens', 'formato', 'nivel', 'perfil'],
  artigos: ['slug', 'titulo', 'resumo', 'corpo_md', 'categoria_id', 'capa_url', 'tags', 'fontes', 'recurso_id', 'destaque', 'seo',
    'tipo', 'assunto', 'consulta_alvo', 'intencao', 'resposta', 'faqs', 'autor_id', 'revisor_id', 'conferido_em', 'afiliado'],
  autores: ['slug', 'nome', 'cargo', 'bio', 'foto_url', 'perfis', 'ativo'],
  landing_pages: ['slug', 'titulo', 'produto_id', 'blocos', 'seo'],
  produtos: ['slug', 'nome', 'chamada', 'descricao', 'preco_centavos', 'preco_de_centavos', 'link_checkout', 'imagem_url', 'tags', 'ativo'],
  anuncios: ['produto_id', 'titulo', 'texto', 'cta', 'imagem_url', 'link', 'alvo_tags', 'alvo_categorias', 'posicoes', 'peso', 'ativo', 'inicio', 'fim'],
  pautas: ['titulo', 'resumo', 'fonte_url', 'fonte_nome', 'tags', 'status'],
  pecas: ['titulo', 'legenda', 'roteiro', 'slides', 'midias', 'agendado_para', 'conexao_id', 'opcoes'],
};
const COM_SLUG = ['recursos', 'artigos', 'landing_pages', 'produtos', 'autores'];
const PUBLICAVEIS = ['recursos', 'artigos', 'landing_pages'];
// Quem pode editar e publicar cada tipo.
const PERMISSAO = {
  recursos: { editar: 'conteudo.editar', publicar: 'conteudo.publicar', ver: 'conteudo.ver' },
  artigos: { editar: 'conteudo.editar', publicar: 'conteudo.publicar', ver: 'conteudo.ver' },
  landing_pages: { editar: 'cursos.editar', publicar: 'cursos.editar', ver: 'cursos.ver' },
  produtos: { editar: 'cursos.editar', ver: 'cursos.ver' },
  anuncios: { editar: 'cursos.editar', ver: 'cursos.ver' },
  pautas: { editar: 'pautas.editar', ver: 'pautas.ver' },
  pecas: { editar: 'pecas.editar', ver: 'pecas.ver' },
  // Quem assina os artigos (página /autor/<slug>). Mudar autor muda o que aparece no ar: é de quem publica.
  autores: { editar: 'conteudo.publicar', ver: 'conteudo.ver' },
};
export const TIPOS = Object.keys(PERMISSAO);

function pegar(tabela, dados) {
  const r = {};
  for (const c of CAMPOS[tabela]) if (dados[c] !== undefined) r[c] = dados[c] === '' ? null : dados[c];
  if (tabela === 'artigos') arrumarArtigo(r);
  if (tabela === 'autores') {
    if (r.perfis !== undefined) r.perfis = (Array.isArray(r.perfis) ? r.perfis : String(r.perfis || '').split(/[\s,]+/)).map((u) => String(u).trim()).filter((u) => /^https:\/\//.test(u)).slice(0, 10);
    if (r.ativo === null) delete r.ativo;
  }
  return r;
}

// Os campos de SEO do artigo (fase B, docs/seo-geo.md): valor desconhecido é erro, nunca vira outro calado.
function arrumarArtigo(r) {
  const escolha = (campo, lista, nome) => {
    if (r[campo] === undefined) return;
    if (r[campo] === null) { if (campo === 'intencao') return; delete r[campo]; return; }
    const v = String(r[campo]).trim().toLowerCase();
    if (!lista[v]) throw new Erro(400, `${nome} desconhecido: ${String(r[campo]).slice(0, 30)}. Use ${Object.keys(lista).join(', ')}.`);
    r[campo] = v;
  };
  escolha('tipo', TIPOS_ARTIGO, 'Tipo');
  escolha('assunto', ASSUNTOS, 'Assunto');
  escolha('intencao', INTENCOES, 'Intenção');
  if (r.faqs !== undefined) {
    r.faqs = (Array.isArray(r.faqs) ? r.faqs : []).map((f) => ({ pergunta: String((f && (f.pergunta || f.question)) || '').trim().slice(0, 300), resposta: String((f && (f.resposta || f.answer)) || '').trim().slice(0, 2000) })).filter((f) => f.pergunta && f.resposta).slice(0, 15);
  }
  for (const c of ['autor_id', 'revisor_id']) if (r[c] !== undefined && r[c] !== null && !UUID.test(String(r[c]))) throw new Erro(400, `${c} precisa ser o id do autor (veja listar_autores).`);
  if (r.conferido_em !== undefined && r.conferido_em !== null && !/^\d{4}-\d{2}-\d{2}$/.test(String(r.conferido_em).slice(0, 10))) throw new Erro(400, 'conferido_em é uma data: AAAA-MM-DD.');
  if (r.conferido_em) r.conferido_em = String(r.conferido_em).slice(0, 10);
  if (r.afiliado !== undefined) r.afiliado = r.afiliado === true || r.afiliado === 'true';
  for (const c of ['consulta_alvo', 'resposta']) if (typeof r[c] === 'string') r[c] = r[c].trim().slice(0, c === 'resposta' ? 1200 : 120) || null;
}

// Os dados que o analisador de SEO precisa de um artigo (o próprio e as outras páginas, para a canibalização).
export async function dadosParaAnalise(env, artigo) {
  const outros = await db.select(env, 'artigos', { filtros: { consulta_alvo: 'not.is.null', status: 'neq.arquivado' }, select: 'id,titulo,consulta_alvo', limite: 2000 }).catch(() => []);
  return { ...artigo, outros };
}

// Quem pode assinar um artigo (o painel e o conector escolhem por aqui).
export async function listarAutores(x) {
  exigir(x.u, PERMISSAO.autores.ver);
  const l = await db.select(x.env, 'autores', { select: 'id,slug,nome,cargo,bio,foto_url,perfis,ativo', ordem: 'nome.asc', limite: 100 });
  return l.map((a) => ({ ...a, endereco: endereco(x, 'autores', a) }));
}

// As buscas-alvo já usadas (para o analisador avisar quando duas páginas querem a mesma busca).
export async function consultasDosArtigos(x) {
  exigir(x.u, PERMISSAO.artigos.ver);
  return db.select(x.env, 'artigos', { filtros: { consulta_alvo: 'not.is.null', status: 'neq.arquivado' }, select: 'id,titulo,consulta_alvo', limite: 2000 });
}

// Confere um artigo pelo analisador de SEO e GEO (o mesmo do painel). Para o conector e a trava de publicar.
export async function checarSeo(x, id) {
  exigir(x.u, PERMISSAO.artigos.ver);
  const a = await db.um(x.env, 'artigos', filtroId('artigos', id));
  if (!a) throw new Erro(404, 'Não achei esse artigo.');
  const r = analisar(await dadosParaAnalise(x.env, a));
  return { id: a.id, titulo: a.titulo, endereco: endereco(x, 'artigos', a), ...r, checks: r.checks.filter((c) => c.nivel !== 'ok'), ok: r.checks.filter((c) => c.nivel === 'ok').map((c) => c.titulo) };
}

export function filtroId(tabela, id) {
  if (UUID.test(String(id))) return { id: `eq.${id}` };
  if (COM_SLUG.includes(tabela)) return { slug: `eq.${slugar(id)}` };
  throw new Erro(400, 'Use o id (uuid) deste item.');
}

export function endereco(x, tabela, r) {
  const base = x.env.SITE_URL || x.url.origin;
  if (!r || !r.slug) return undefined;
  // O recurso do perfil em inglês mora no site em inglês (agenciasetup.com/free).
  if (tabela === 'recursos' && r.perfil === 'en') return `${siteDoPerfil(x.env, 'en')}/free/${r.slug}`;
  if (tabela === 'recursos') return `${base}/recursos/${r.slug}`;
  if (tabela === 'artigos') return `${base}${caminhoArtigo(r)}`;
  if (tabela === 'autores') return `${base}/autor/${r.slug}`;
  if (tabela === 'landing_pages') return `${base}/cursos/${r.slug}`;
  return undefined;
}

// ---------------------------------------------------------------- leitura
export async function listar(x, tabela, { status, busca, rede, perfil, manuais, limite = 30, offset = 0, select = '*' } = {}) {
  if (!PERMISSAO[tabela]) throw new Erro(400, 'Tipo desconhecido.');
  exigir(x.u, PERMISSAO[tabela].ver);
  const filtros = {};
  if (status) filtros.status = `eq.${status}`;
  if (rede && tabela === 'pecas') filtros.rede = `eq.${rede}`;
  if (tabela === 'pecas' && filtroPerfil(perfil)) filtros.perfil = `eq.${filtroPerfil(perfil)}`;
  // Pautas anotadas por alguém (as do radar ficam na tela Em alta).
  if (manuais && tabela === 'pautas') filtros.fonte_id = 'is.null';
  if (busca) {
    const b = String(busca).replace(/[%*,()]/g, ' ').trim().slice(0, 80);
    if (b) filtros.or = tabela === 'produtos' ? `(nome.ilike.*${b}*,chamada.ilike.*${b}*)` : tabela === 'pecas' ? `(titulo.ilike.*${b}*,legenda.ilike.*${b}*)` : `(titulo.ilike.*${b}*)`;
  }
  const ordem = tabela === 'pecas' && status === 'agendado' ? 'agendado_para.asc' : 'criado_em.desc';
  return db.select(x.env, tabela, { filtros, select, ordem, limite: Math.min(100, limite), offset, contar: true });
}

export async function ler(x, tabela, id) {
  if (!PERMISSAO[tabela]) throw new Erro(400, 'Tipo desconhecido.');
  exigir(x.u, PERMISSAO[tabela].ver);
  const r = await db.um(x.env, tabela, filtroId(tabela, id));
  if (!r) throw new Erro(404, 'Não achei esse item.');
  return { ...r, endereco: endereco(x, tabela, r) };
}

// ---------------------------------------------------------------- salvar (criar ou editar)
export async function salvar(x, tabela, dadosBrutos, id) {
  if (!CAMPOS[tabela] || tabela === 'pecas') throw new Erro(400, 'Tipo desconhecido.');
  exigir(x.u, PERMISSAO[tabela].editar);
  const dados = pegar(tabela, dadosBrutos);
  // O perfil do recurso: br (site em português) ou en (agenciasetup.com/free, o material da DM em inglês).
  if (tabela === 'recursos' && dados.perfil !== undefined) dados.perfil = lerPerfil(dados.perfil);
  const titulo = tabela === 'produtos' || tabela === 'autores' ? 'nome' : 'titulo';
  if (COM_SLUG.includes(tabela)) {
    if (!id && !dados[titulo]) throw new Erro(400, `Falta ${titulo}.`);
    if (!id && !dados.slug) dados.slug = slugar(dados[titulo]);
    if (dados.slug) dados.slug = slugar(dados.slug);
    if (dados.slug === '') throw new Erro(400, 'O endereço (slug) ficou vazio.');
  } else if (!id && !dados[titulo]) throw new Erro(400, `Falta ${titulo}.`);
  if (tabela === 'pautas' && dados.status && !['nova', 'aproveitada', 'descartada'].includes(dados.status)) throw new Erro(400, 'Status de pauta inválido.');
  let r;
  if (id) {
    // Produtos e anúncios não têm status: pedir a coluna fazia o banco recusar toda edição deles.
    const atual = await db.um(x.env, tabela, filtroId(tabela, id), PERMISSAO[tabela].publicar ? 'id,status' : 'id');
    if (!atual) throw new Erro(404, 'Não achei esse item.');
    // Mexer no que já está no ar é coisa de quem publica.
    if (atual.status === 'publicado' && PERMISSAO[tabela].publicar && !pode(x.u.papel, PERMISSAO[tabela].publicar)) {
      throw new Erro(403, 'Este item já está no ar. Só quem publica pode alterar.');
    }
    if (!Object.keys(dados).length) throw new Erro(400, 'Nada para salvar: nenhum campo conhecido foi enviado.');
    [r] = await db.update(x.env, tabela, { id: `eq.${atual.id}` }, dados);
  } else {
    [r] = await db.insert(x.env, tabela, dados);
  }
  await auditar(x.env, x.u, id ? 'editar' : 'criar', `${tabela}:${r.id}`, { campos: Object.keys(dados) });
  // Mexeu no que já está no ar: o IndexNow avisa o Bing para ler de novo (lib/seo.js).
  if (r.status === 'publicado' && PUBLICAVEIS.includes(tabela)) avisarBuscadores(x, [endereco(x, tabela, r)]);
  return { ...r, endereco: endereco(x, tabela, r) };
}

// Depois da resposta, sem atrasar quem salvou e sem derrubar nada se o IndexNow falhar.
function avisarBuscadores(x, urls) {
  const t = avisarIndexNow(x.env, urls);
  if (x.ctx && x.ctx.waitUntil) x.ctx.waitUntil(t); else t.catch(() => {});
}

export async function mudarPublicacao(x, tabela, id, publicar) {
  if (!PUBLICAVEIS.includes(tabela)) throw new Erro(400, 'Só recursos, novidades e landing pages vão para o site.');
  exigir(x.u, PERMISSAO[tabela].publicar);
  const atual = await db.um(x.env, tabela, filtroId(tabela, id), tabela === 'artigos' ? '*' : 'id,publicado_em,status');
  if (!atual) throw new Erro(404, 'Não achei esse item.');
  // Artigo só vai ao ar sem defeito objetivo (título, resumo, H1 no corpo, imagem sem descrição, travessão).
  if (publicar && tabela === 'artigos') {
    const { bloqueios } = analisar(atual);
    if (bloqueios.length) throw new Erro(400, `Antes de publicar, arrume: ${bloqueios.map((b) => b.titulo.toLowerCase()).join('; ')}.`);
  }
  const dados = { status: publicar ? 'publicado' : 'arquivado' };
  if (publicar && !atual.publicado_em) dados.publicado_em = new Date().toISOString();
  const [r] = await db.update(x.env, tabela, { id: `eq.${atual.id}` }, dados);
  await auditar(x.env, x.u, publicar ? 'publicar' : 'arquivar', `${tabela}:${r.id}`);
  // Publicou ou tirou do ar: o IndexNow avisa na hora (no arquivado, para o buscador tirar a página).
  avisarBuscadores(x, [endereco(x, tabela, r)]);
  return { ...r, endereco: endereco(x, tabela, r) };
}

// ---------------------------------------------------------------- peças da fila
const LINHA_PECA = (origem, p) => ({
  origem_tipo: origem.origem_tipo || 'livre', origem_id: origem.origem_id || null, rede: p.rede, formato: p.formato,
  titulo: p.titulo ?? null, legenda: p.legenda ?? null, roteiro: p.roteiro ?? null,
  slides: p.slides ?? [], midias: p.midias ?? [], agendado_para: null, conexao_id: null, status: 'rascunho',
  opcoes: limparOpcoes(p.opcoes), grupo: origem.grupo || null, perfil: p.perfil,
});

// Opções de cada rede (Instagram: colaboradores, primeiro comentário, localização, capa, áudio e teste do Reels).
function limparOpcoes(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return {};
  const r = {};
  const colab = (Array.isArray(o.colaboradores) ? o.colaboradores : String(o.colaboradores || '').split(/[\s,]+/)).map((u) => String(u).trim().replace(/^@/, '')).filter((u) => /^[\w.]{1,30}$/.test(u)).slice(0, 3);
  if (colab.length) r.colaboradores = colab;
  if (o.primeiro_comentario) r.primeiro_comentario = String(o.primeiro_comentario).slice(0, 2200);
  if (o.local_id && /^\d{3,30}$/.test(String(o.local_id).trim())) { r.local_id = String(o.local_id).trim(); if (o.local_nome) r.local_nome = String(o.local_nome).slice(0, 120); }
  if (o.capa_url && /^https:\/\//.test(String(o.capa_url))) r.capa_url = String(o.capa_url).slice(0, 1000);
  if (o.capa_ms != null && o.capa_ms !== '' && Number.isFinite(Number(o.capa_ms))) r.capa_ms = Math.max(0, Math.round(Number(o.capa_ms)));
  if (o.audio_nome) r.audio_nome = String(o.audio_nome).slice(0, 100);
  if (o.no_feed === false) r.no_feed = false;
  if (['MANUAL', 'SS_PERFORMANCE'].includes(o.teste)) r.teste = o.teste;
  return r;
}

// perfil (lib/perfis.js): o da chamada vale para todas as peças, e cada peça pode trazer o dela. Padrão: o do Brasil.
export async function criarPecas(x, { origem_tipo, origem_id, pecas, grupo, perfil }) {
  exigir(x.u, 'pecas.editar');
  if (!Array.isArray(pecas) || !pecas.length) throw new Erro(400, 'Mande ao menos uma peça.');
  if (pecas.length > 20) throw new Erro(400, 'No máximo 20 peças por vez.');
  const geral = lerPerfil(perfil);
  pecas = pecas.map((p) => ({ ...p, perfil: lerPerfil(p.perfil, geral) }));
  for (const p of pecas) {
    const m = plataforma(p.rede);
    if (!m) throw new Erro(400, `Rede desconhecida: ${p.rede}.`);
    if (!m.formatos.includes(p.formato)) throw new Erro(400, `${m.nome} não publica o formato ${p.formato}. Formatos: ${m.formatos.join(', ')}.`);
    // No perfil em inglês o material é um recurso em inglês (agenciasetup.com/free) ou um link.
    if (p.comenta && p.comenta.palavra && p.perfil === 'en' && !p.comenta.link && !p.comenta.recurso_id && origem_tipo !== 'recurso') throw new Erro(400, 'No perfil em inglês, o Comenta X manda um recurso em inglês (comenta.recurso_id, perfil en) ou um link (comenta.link).');
    // O recurso da palavra é do perfil da peça: confere antes de criar, para não sobrar peça sem a palavra.
    const recDaPalavra = p.comenta && p.comenta.palavra && (p.comenta.recurso_id || (origem_tipo === 'recurso' && !(p.perfil === 'en' && p.comenta.link) ? origem_id : null));
    if (recDaPalavra) {
      const rec = await db.um(x.env, 'recursos', filtroId('recursos', recDaPalavra), 'id,perfil');
      if (!rec) throw new Erro(400, 'Não achei o recurso da palavra. Use o id ou o slug de um recurso.');
      if ((rec.perfil || 'br') !== p.perfil) throw new Erro(400, `O recurso da palavra é do perfil ${perfilDe(rec.perfil).rotulo} e a peça é do perfil ${perfilDe(p.perfil).rotulo}.`);
    }
  }
  // Todas as linhas com os mesmos campos: o banco recusa um lote com formatos diferentes.
  const r = await db.insert(x.env, 'pecas', pecas.map((p) => LINHA_PECA({ origem_tipo, origem_id, grupo }, p)), { select: 'id,rede,formato,status,grupo,perfil' });
  await auditar(x.env, x.u, 'criar', 'pecas', { quantas: r.length, redes: [...new Set(r.map((p) => p.rede))], perfis: [...new Set(r.map((p) => p.perfil))] });
  // "Comenta X" da peça: nasce desligado e liga sozinho quando a peça (aprovada) for publicada. A palavra é do perfil da peça.
  const avisos = [];
  for (let i = 0; i < pecas.length; i++) {
    const c = pecas[i].comenta;
    if (!c || !c.palavra || !r[i]) continue;
    // Com link e sem recurso dito, a palavra em inglês manda o link (a origem pode ser um recurso do Brasil).
    const en = pecas[i].perfil === 'en';
    const recurso_id = c.recurso_id || (origem_tipo === 'recurso' && !(en && c.link) ? origem_id : null);
    const g = await salvarGatilho(x, { ...c, recurso_id, rede: r[i].rede, peca_id: r[i].id, perfil: pecas[i].perfil });
    r[i].comenta = { gatilho_id: g.id, palavra: g.palavra };
    if (!normalPalavra(pecas[i].legenda || '').includes(normalPalavra(g.palavra))) avisos.push(`A legenda da peça ${i + 1} não pede "${g.palavra}". Coloque "Comenta ${g.palavra}" na legenda.`);
  }
  return avisos.length ? Object.assign(r, { avisos }) : r;
}

export async function editarPeca(x, id, dadosBrutos) {
  exigir(x.u, 'pecas.editar');
  const atual = await db.um(x.env, 'pecas', { id: `eq.${id}` }, 'id,status,rede,perfil,conexao_id');
  if (!atual) throw new Erro(404, 'Não achei essa peça.');
  if (!['rascunho', 'aprovado', 'erro'].includes(atual.status)) throw new Erro(409, `Peça ${atual.status} não pode ser editada. Volte para rascunho antes.`);
  const dados = pegar('pecas', dadosBrutos);
  delete dados.agendado_para;
  if (dados.opcoes !== undefined) dados.opcoes = limparOpcoes(dados.opcoes);
  // Trocar o perfil (lib/perfis.js): a conta escolhida do outro perfil sai, e a palavra do Comenta X da peça vai junto.
  const perfil = lerPerfil(dadosBrutos.perfil, atual.perfil || 'br');
  if (perfil !== (atual.perfil || 'br')) {
    dados.perfil = perfil;
    if (dados.conexao_id === undefined && atual.conexao_id) dados.conexao_id = null;
  }
  // A conta escolhida precisa ser da rede e do perfil da peça.
  if (dados.conexao_id) {
    const c = await db.um(x.env, 'conexoes', { id: `eq.${dados.conexao_id}` }, 'id,plataforma,perfil,conta_nome');
    if (!c || c.plataforma !== atual.rede) throw new Erro(400, 'Essa conta não é desta rede.');
    if ((c.perfil || 'br') !== perfil) throw new Erro(400, `A conta ${c.conta_nome || ''} é do perfil ${perfilDe(c.perfil).rotulo} e a peça é do perfil ${perfilDe(perfil).rotulo}.`);
  }
  // Editou depois de aprovar (ou de dar erro): volta para rascunho e precisa de nova aprovação.
  if (atual.status !== 'rascunho') Object.assign(dados, { status: 'rascunho', aprovado_por: null, aprovado_em: null, erro: null, tentativas: 0 });
  if (!Object.keys(dados).length) throw new Erro(400, 'Nada para salvar: nenhum campo conhecido foi enviado.');
  const [r] = await db.update(x.env, 'pecas', { id: `eq.${atual.id}` }, dados);
  if (dados.perfil) await db.update(x.env, 'gatilhos', { peca_id: `eq.${atual.id}`, ativo: 'eq.false' }, { perfil: dados.perfil }, 'id').catch((e) => console.error('perfil da palavra', e && e.message));
  await auditar(x.env, x.u, 'editar', `pecas:${r.id}`, { campos: Object.keys(dados), ...(dados.perfil ? { perfil: dados.perfil } : {}) });
  return r;
}

// aprovar | agendar | cancelar | voltar
// cancelar é o "Recusar" do painel: com motivo (e a parte, texto, imagem ou os dois), a recusa fica na peça e vira
// lição no caderno do Redator, do Designer e do Revisor (lib/recusas.js).
export async function mudarStatusPeca(x, id, acao, { agendado_para, motivo, parte } = {}) {
  const atual = await db.um(x.env, 'pecas', { id: `eq.${id}` });
  if (!atual) throw new Erro(404, 'Não achei essa peça.');
  let dados;
  if (acao === 'aprovar') {
    exigir(x.u, 'pecas.aprovar');
    if (!['rascunho', 'erro'].includes(atual.status)) throw new Erro(409, `Peça ${atual.status} não precisa de aprovação.`);
    dados = { status: 'aprovado', aprovado_por: x.u.id || null, aprovado_em: new Date().toISOString(), erro: null };
  } else if (acao === 'agendar') {
    exigir(x.u, 'pecas.aprovar');
    if (!['rascunho', 'aprovado', 'erro', 'agendado'].includes(atual.status)) throw new Erro(409, `Peça ${atual.status} não pode ser agendada.`);
    const quando = agendado_para ? new Date(agendado_para) : new Date();
    if (Number.isNaN(quando.getTime())) throw new Erro(400, 'Data de agendamento inválida.');
    const m = plataforma(atual.rede);
    const problema = m && m.validar ? m.validar(atual) : null;
    if (problema) throw new Erro(400, problema);
    dados = { status: 'agendado', agendado_para: quando.toISOString(), erro: null, tentativas: 0, proxima_tentativa: null };
    if (atual.status !== 'aprovado' && atual.status !== 'agendado') Object.assign(dados, { aprovado_por: x.u.id || null, aprovado_em: new Date().toISOString() });
  } else if (acao === 'cancelar') {
    exigir(x.u, 'pecas.editar');
    if (['publicado', 'publicando'].includes(atual.status)) throw new Erro(409, 'Peça já publicada (ou publicando) não pode ser cancelada.');
    dados = { status: 'cancelado', proxima_tentativa: null };
    if (motivo !== undefined || parte !== undefined) dados.recusa = lerRecusa({ motivo, parte }, x.u.casa ? 'Claude' : String(x.u.nome || '').trim().split(/\s+/)[0]);
  } else if (acao === 'voltar') {
    exigir(x.u, 'pecas.editar');
    if (['publicado', 'publicando'].includes(atual.status)) throw new Erro(409, 'Peça já publicada não volta para rascunho.');
    dados = { status: 'rascunho', agendado_para: null, aprovado_por: null, aprovado_em: null, erro: null, tentativas: 0, proxima_tentativa: null };
  } else throw new Erro(400, 'Ação desconhecida. Use aprovar, agendar, cancelar ou voltar.');
  const [r] = await db.update(x.env, 'pecas', { id: `eq.${atual.id}` }, dados);
  await auditar(x.env, x.u, `peca.${acao}`, `pecas:${r.id}`, acao === 'agendar' ? { agendado_para: dados.agendado_para } : dados.recusa ? { parte: dados.recusa.parte, motivo: dados.recusa.motivo } : {});
  if (dados.recusa && dados.recusa.motivo) {
    const quem = x.u.casa ? { quem: null, quemNome: 'Claude' } : { quem: x.u.id || null, quemNome: String(x.u.nome || '').trim().split(/\s+/)[0] };
    r.aprendeu = (await aprenderComARecusa(x.env, atual, dados.recusa, quem)).agentes;
  }
  return r;
}

// As recusas do dono, com o motivo: o que a tarefa de post lê antes de criar (conector posts_recusados).
export async function verPostsRecusados(x, d = {}) {
  exigir(x.u, 'pecas.ver');
  return { recusas: await listarRecusas(x.env, { dias: d.dias, perfil: d.perfil, limite: d.limite }) };
}

export async function publicarPecaAgora(x, id) {
  exigir(x.u, 'pecas.aprovar');
  const atual = await db.um(x.env, 'pecas', { id: `eq.${id}` });
  if (!atual) throw new Erro(404, 'Não achei essa peça.');
  if (['publicado', 'publicando', 'cancelado'].includes(atual.status)) throw new Erro(409, `Peça ${atual.status} não pode ser publicada agora.`);
  const m = plataforma(atual.rede);
  if (!m || !m.disponivel) throw new Erro(409, `${m ? m.nome : atual.rede} ainda não está ligada ao sistema. A peça fica na fila até o módulo entrar.`);
  // A mesma conta que a fila usaria: a escolhida na peça ou a do perfil da peça naquela rede.
  const conta = await contaDaPeca(x.env, atual);
  if (conta && conta.outroPerfil) throw new Erro(409, `A conta escolhida (${conta.outroPerfil.conta_nome || m.nome}) é do perfil ${perfilDe(conta.outroPerfil.perfil).rotulo} e a peça é do perfil ${perfilDe(atual.perfil).rotulo}. Escolha outra conta na peça.`);
  if (!conta) throw new Erro(409, `Nenhuma conta de ${m.nome} conectada no perfil ${perfilDe(atual.perfil).rotulo}. Conecte em Redes.`);
  // Marca "publicando" só se ninguém pegou antes (o relógio pode estar rodando agora).
  const [pega] = await db.update(x.env, 'pecas', { id: `eq.${atual.id}`, status: `eq.${atual.status}` },
    { status: 'publicando', tentativas: (atual.tentativas || 0) + 1, agendado_para: new Date().toISOString(), aprovado_por: atual.aprovado_por || x.u.id || null, aprovado_em: atual.aprovado_em || new Date().toISOString() });
  if (!pega) throw new Erro(409, 'A peça mudou agora há pouco. Abra de novo.');
  await auditar(x.env, x.u, 'peca.publicar_agora', `pecas:${pega.id}`);
  await publicarPeca(x.env, pega);
  return db.um(x.env, 'pecas', { id: `eq.${pega.id}` });
}

// ---------------------------------------------------------------- post feito no painel
// Pedido do dono em 24/10/2026: "achei que teria o painel de agendar post, escolher as plataformas, legenda,
// formato". Uma peça por rede escolhida, no mesmo grupo, com o texto próprio de cada rede (ou a legenda), as mídias,
// as opções de cada rede e o Comenta X (no Instagram). acao: rascunho, agendar ou publicar (as duas últimas são de
// quem aprova).
const limparMidia = (m) => (m && /^https:\/\//.test(String(m.url || '')) ? { url: String(m.url), tipo: m.tipo === 'video' || /\.(mp4|mov)(\?|$)/i.test(m.url) ? 'video' : 'imagem', ...(m.alt ? { alt: String(m.alt).slice(0, 1000) } : {}) } : null);
export async function criarPost(x, d = {}) {
  exigir(x.u, 'pecas.editar');
  // Para qual perfil (lib/perfis.js): todas as peças do post são do mesmo.
  const perfil = lerPerfil(d.perfil);
  const redes = [...new Set((Array.isArray(d.redes) ? d.redes : []).map(String))].filter((r) => plataforma(r));
  if (!redes.length) throw new Erro(400, 'Escolha ao menos uma rede.');
  const formato = String(d.formato || '');
  const acao = ['rascunho', 'agendar', 'publicar'].includes(d.acao) ? d.acao : 'rascunho';
  if (acao !== 'rascunho') exigir(x.u, 'pecas.aprovar');
  const midias = (Array.isArray(d.midias) ? d.midias : []).map(limparMidia).filter(Boolean).slice(0, 10);
  if (!midias.length && formato !== 'texto') throw new Erro(400, 'Envie ao menos uma imagem ou vídeo.');
  const textos = d.textos && typeof d.textos === 'object' ? d.textos : {};
  const opcoes = d.opcoes && typeof d.opcoes === 'object' ? d.opcoes : {};
  // Carrossel: as mídias viram os slides (imagem ou vídeo, com texto alternativo), na ordem escolhida.
  const slides = formato === 'carrossel' ? midias.map((m) => (m.tipo === 'video' ? { video_url: m.url, ...(m.alt ? { alt: m.alt } : {}) } : { imagem_url: m.url, ...(m.alt ? { alt: m.alt } : {}) })) : [];
  const pecas = redes.map((rede) => ({
    rede, formato, titulo: d.titulo ? String(d.titulo).slice(0, 200) : null,
    legenda: String(textos[rede] != null && String(textos[rede]).trim() ? textos[rede] : d.legenda || '').slice(0, 5000),
    slides, midias: formato === 'carrossel' ? [] : midias, opcoes: opcoes[rede] || {},
    ...(rede === 'instagram' && d.comenta && d.comenta.palavra ? { comenta: d.comenta } : {}),
  }));
  // O Comenta X conferido antes de criar as peças (erro aqui não deixa peça pela metade).
  if (d.comenta && d.comenta.palavra) {
    exigir(x.u, 'gatilhos.editar');
    if (perfil === 'en' && !d.comenta.link) throw new Erro(400, 'No perfil em inglês, o Comenta X manda um link para o material em inglês (as páginas de recurso do site são em português).');
    if (!d.comenta.recurso_id && !d.comenta.link) throw new Erro(400, 'Diga qual material o Comenta X manda: um recurso do site ou um link.');
    if (Array.isArray(d.comenta.variantes) && d.comenta.variantes.length) conferirVariantes(d.comenta.variantes, MODOS.includes(d.comenta.modo) ? d.comenta.modo : 'direto');
  }
  let quando = null;
  if (acao !== 'rascunho') {
    // Antes de criar: o que cada rede recusaria (formato, tamanho da legenda, mídia).
    const problemas = pecas.map((p) => { const m = plataforma(p.rede); return m && m.validar ? m.validar(p) : null; }).filter(Boolean);
    if (problemas.length) throw new Erro(400, problemas.join(' '));
    if (acao === 'agendar') {
      quando = new Date(d.agendado_para);
      if (Number.isNaN(quando.getTime())) throw new Erro(400, 'Escolha a data e a hora.');
      if (quando.getTime() < Date.now() - 60_000) throw new Erro(400, 'Essa data já passou. Para sair agora, use Publicar agora.');
    }
  }
  const criadas = await criarPecas(x, { origem_tipo: d.origem_tipo || 'livre', origem_id: UUID.test(String(d.origem_id || '')) ? d.origem_id : null, pecas, grupo: crypto.randomUUID(), perfil });
  const r = [];
  for (const p of criadas) {
    if (acao === 'agendar') r.push(await mudarStatusPeca(x, p.id, 'agendar', { agendado_para: quando.toISOString() }));
    else if (acao === 'publicar') r.push(await publicarPecaAgora(x, p.id).catch((e) => ({ ...p, status: 'erro', erro: e.message })));
    else r.push(p);
  }
  return { grupo: criadas[0] && criadas[0].grupo, perfil, pecas: r.map((p) => ({ id: p.id, rede: p.rede, formato: p.formato, perfil: p.perfil || perfil, status: p.status, erro: p.erro || null, url_publicada: p.url_publicada || null })), avisos: criadas.avisos || [] };
}

// A agenda: o que está marcado e o que saiu num período (peças do painel e posts feitos pelo app), mais os
// rascunhos sem data. Leve: só o que o calendário mostra.
const CAMPOS_AGENDA = 'id,rede,formato,titulo,legenda,status,agendado_para,publicado_em,url_publicada,grupo,slides,midias,erro,criado_em,perfil';
const miniatura = (p) => {
  const s = (Array.isArray(p.slides) ? p.slides : []).find((x) => x && x.imagem_url);
  const m = (Array.isArray(p.midias) ? p.midias : []).find((x) => x && x.url && x.tipo !== 'video');
  return (s && s.imagem_url) || (m && m.url) || null;
};
const itemAgenda = (p) => ({
  id: p.id, rede: p.rede, formato: p.formato, titulo: p.titulo || String(p.legenda || '').split('\n')[0].slice(0, 90) || 'Sem título',
  status: p.status, quando: p.publicado_em || p.agendado_para || null, url_publicada: p.url_publicada || null, grupo: p.grupo || null, miniatura: miniatura(p), erro: p.erro || null,
  perfil: p.perfil || 'br',
});
// perfil: br, en ou nada (os dois perfis juntos, cada item com o seu).
export async function listarAgenda(x, { de, ate, perfil } = {}) {
  exigir(x.u, 'pecas.ver');
  const ini = new Date(de || Date.now() - 7 * 86400_000);
  const fim = new Date(ate || Date.now() + 35 * 86400_000);
  if (Number.isNaN(ini.getTime()) || Number.isNaN(fim.getTime()) || fim - ini > 380 * 86400_000) throw new Erro(400, 'Período inválido (até 1 ano).');
  const faixa = (c) => `and(${c}.gte.${ini.toISOString()},${c}.lt.${fim.toISOString()})`;
  const so = filtroPerfil(perfil) ? { perfil: `eq.${filtroPerfil(perfil)}` } : {};
  const [pecas, rascunhos, doApp] = await Promise.all([
    db.select(x.env, 'pecas', { filtros: { or: `(${faixa('agendado_para')},${faixa('publicado_em')})`, status: 'neq.cancelado', ...so }, select: CAMPOS_AGENDA, ordem: 'agendado_para.asc.nullslast', limite: 1000 }),
    db.select(x.env, 'pecas', { filtros: { status: 'in.(rascunho,aprovado,erro)', agendado_para: 'is.null', ...so }, select: CAMPOS_AGENDA, ordem: 'criado_em.desc', limite: 60 }),
    // Posts feitos direto no app da rede (sem peça): entram no calendário como publicados.
    db.select(x.env, 'posts_redes', { filtros: { peca_id: 'is.null', publicado_em: `gte.${ini.toISOString()}`, and: `(publicado_em.lt.${fim.toISOString()})`, ...so }, select: 'id,rede,formato,legenda,link,miniatura_url,publicado_em,perfil', ordem: 'publicado_em.asc', limite: 1000 }),
  ]);
  return {
    de: ini.toISOString(), ate: fim.toISOString(), perfil: filtroPerfil(perfil),
    itens: [
      ...pecas.map(itemAgenda),
      ...doApp.map((p) => ({ id: `post:${p.id}`, post_id: p.id, rede: p.rede, formato: p.formato, titulo: String(p.legenda || '').split('\n')[0].slice(0, 90) || 'Post', status: 'publicado', quando: p.publicado_em, url_publicada: p.link, miniatura: p.miniatura_url, pelo_app: true, perfil: p.perfil || 'br' })),
    ].sort((a, b) => String(a.quando).localeCompare(String(b.quando))),
    rascunhos: rascunhos.map(itemAgenda),
  };
}

// ---------------------------------------------------------------- "Comenta X"
// O recurso da palavra (id e perfil): o do Brasil para palavra do Brasil, o em inglês para palavra em inglês.
async function recursoDaPalavra(x, v) {
  if (!v) return null;
  const r = await db.um(x.env, 'recursos', filtroId('recursos', v), 'id,perfil');
  if (!r) throw new Erro(400, 'Não achei esse recurso. Use o id ou o slug de um recurso do site.');
  return r;
}

export async function salvarGatilho(x, dados, id) {
  exigir(x.u, 'gatilhos.editar');
  const d = {};
  if (dados.palavra !== undefined) {
    d.palavra = String(dados.palavra || '').trim().replace(/^["“”'‘’]+|["“”'‘’]+$/g, '').toUpperCase().slice(0, 40);
    if (!normalPalavra(d.palavra)) throw new Erro(400, 'Escreva a palavra que a pessoa vai comentar.');
  }
  if (dados.rede !== undefined) {
    if (!plataforma(dados.rede)) throw new Erro(400, 'Rede desconhecida.');
    d.rede = dados.rede;
  }
  let rec;
  if (dados.recurso_id !== undefined) {
    rec = await recursoDaPalavra(x, dados.recurso_id);
    d.recurso_id = rec ? rec.id : null;
  }
  if (dados.link !== undefined) {
    d.link = dados.link ? urlSegura(dados.link) : null;
    if (d.link === '#') throw new Erro(400, 'O link precisa começar com https://.');
  }
  if (dados.mensagem !== undefined) d.mensagem = dados.mensagem ? String(dados.mensagem).slice(0, 900) : null;
  if (dados.respostas !== undefined) d.respostas = (Array.isArray(dados.respostas) ? dados.respostas : []).map((t) => String(t).trim().slice(0, 200)).filter(Boolean).slice(0, 8);
  if (dados.posts !== undefined) d.posts = (Array.isArray(dados.posts) ? dados.posts : []).map(String).filter((p) => /^[\w-]{3,40}$/.test(p)).slice(0, 20);
  if (dados.peca_id !== undefined && UUID.test(String(dados.peca_id))) d.peca_id = dados.peca_id;
  // Estilo ManyChat: nome, modo (direto, seguir, pergunta), versões da mensagem, resposta no comentário e IA.
  if (dados.nome !== undefined) d.nome = dados.nome ? String(dados.nome).trim().slice(0, 80) : null;
  if (dados.modo !== undefined) {
    if (!MODOS.includes(dados.modo)) throw new Erro(400, `Modo desconhecido. Use ${MODOS.join(', ')}.`);
    d.modo = dados.modo;
  }
  if (dados.estrategia !== undefined) {
    if (!['melhor', 'igual'].includes(dados.estrategia)) throw new Erro(400, 'Estratégia: melhor ou igual.');
    d.estrategia = dados.estrategia;
  }
  if (dados.responder_publico !== undefined) d.responder_publico = dados.responder_publico !== false;
  if (dados.resposta_ia !== undefined) d.resposta_ia = dados.resposta_ia !== false;
  const origemTexto = x.u && x.u.via === 'mcp' ? 'mcp' : 'painel';
  // O material da DM é do perfil da palavra: no inglês, um recurso em inglês (agenciasetup.com/free) ou um link.
  const SO_EN = 'No perfil em inglês, o Comenta X manda um recurso em inglês (perfil en, em agenciasetup.com/free) ou um link.';
  const conferirRecurso = (perfil) => {
    if (rec && (rec.perfil || 'br') !== perfil) throw new Erro(400, `O recurso é do perfil ${perfilDe(rec.perfil).rotulo} e a palavra é do perfil ${perfilDe(perfil).rotulo}.`);
  };
  let r;
  if (id) {
    const atual = await db.um(x.env, 'gatilhos', { id: `eq.${id}` }, 'id,ativo,modo,variantes,perfil,peca_id,link,recurso_id');
    if (!atual) throw new Erro(404, 'Não achei essa palavra.');
    // Mexer numa palavra que já está mandando DM é coisa de quem aprova.
    if (atual.ativo) exigir(x.u, 'gatilhos.ativar');
    // O perfil (lib/perfis.js) da palavra de uma peça é o da peça: muda na peça. A avulsa muda aqui, desligada.
    const perfilAtual = atual.perfil || 'br';
    const perfil = lerPerfil(dados.perfil, perfilAtual);
    if (perfil !== perfilAtual) {
      if (atual.peca_id) throw new Erro(400, 'Esta palavra é de uma peça: o perfil dela é o da peça. Mude o perfil na peça.');
      if (atual.ativo) throw new Erro(409, 'Desligue a palavra antes de mudar o perfil dela.');
      d.perfil = perfil;
    }
    conferirRecurso(perfil);
    if (perfil === 'en' && !(d.link !== undefined ? d.link : atual.link) && !(d.recurso_id !== undefined ? d.recurso_id : atual.recurso_id)) throw new Erro(400, SO_EN);
    // As versões conferidas pelo modo que vale depois de salvar (mudar só o modo confere as versões que já existem).
    if (dados.variantes !== undefined || d.modo) d.variantes = conferirVariantes((dados.variantes !== undefined ? dados.variantes : atual.variantes) || [], d.modo || atual.modo).map((v) => ({ ...v, origem: v.origem === 'painel' ? origemTexto : v.origem }));
    if (!Object.keys(d).length) throw new Erro(400, 'Nada para salvar.');
    [r] = await db.update(x.env, 'gatilhos', { id: `eq.${atual.id}` }, d);
  } else {
    if (!d.palavra) throw new Erro(400, 'Falta a palavra.');
    // Com peça, o perfil é o da peça; avulsa, o escolhido (padrão: Brasil).
    let perfil = lerPerfil(dados.perfil);
    if (d.peca_id) {
      const peca = await db.um(x.env, 'pecas', { id: `eq.${d.peca_id}` }, 'id,perfil');
      if (peca) {
        if (dados.perfil && perfil !== (peca.perfil || 'br')) throw new Erro(400, `A peça é do perfil ${perfilDe(peca.perfil).rotulo}: a palavra dela também.`);
        perfil = peca.perfil || 'br';
      }
    }
    conferirRecurso(perfil);
    if (perfil === 'en' && !d.link && !d.recurso_id) throw new Erro(400, SO_EN);
    if (!d.recurso_id && !d.link) throw new Erro(400, 'Diga qual material vai na DM: um recurso do site (recurso_id) ou um link.');
    const modo = d.modo || 'direto';
    // Sem versões: a padrão do modo (a mensagem antiga, se veio) no idioma do perfil, que o painel ou o Claude troca depois.
    d.variantes = dados.variantes && dados.variantes.length
      ? conferirVariantes(dados.variantes, modo).map((v) => ({ ...v, origem: v.origem === 'painel' ? origemTexto : v.origem }))
      : variantesDe({ modo, mensagem: d.mensagem, respostas: d.respostas, perfil });
    [r] = await db.insert(x.env, 'gatilhos', { rede: 'instagram', ...d, perfil, modo, ativo: false });
  }
  await auditar(x.env, x.u, id ? 'gatilho.editar' : 'gatilho.criar', `gatilhos:${r.id}`, { palavra: r.palavra, modo: r.modo, versoes: (r.variantes || []).length, perfil: r.perfil });
  return r;
}

// O Claude escreve as versões da mensagem (não grava: o painel mostra para a pessoa revisar e salvar).
// perfil 'en': as versões em inglês, com a oferta do perfil em inglês.
export async function escreverComenta(x, { palavra, recurso_id, link, legenda, modo = 'direto', quantas = 2, perfil } = {}) {
  exigir(x.u, 'gatilhos.editar');
  if (!MODOS.includes(modo)) throw new Erro(400, `Modo desconhecido. Use ${MODOS.join(', ')}.`);
  if (!String(palavra || '').trim()) throw new Erro(400, 'Escreva a palavra antes.');
  const p = lerPerfil(perfil);
  await prepararIntegracoes(x.env);
  let titulo = '';
  if (recurso_id) {
    const rec = await db.um(x.env, 'recursos', filtroId('recursos', recurso_id), 'titulo,resumo,perfil');
    if (rec && (rec.perfil || 'br') === p) {
      titulo = rec.titulo;
      if (!legenda) legenda = rec.resumo;
    }
  }
  const oferta = await ofertaAtiva(x.env, p).catch(() => null);
  const variantes = await escreverVariantesIA(x.env, { palavra: String(palavra).toUpperCase(), titulo: titulo || (link ? (p === 'en' ? 'freebie' : 'material') : ''), legenda, modo, quantas: Math.min(Math.max(Number(quantas) || 2, 1), 4), curso: oferta ? oferta.nome : '', idioma: idiomaDe(p) });
  await auditar(x.env, x.u, 'gatilho.escrever_ia', `gatilhos:${palavra}`, { modo, quantas: variantes.length, perfil: p });
  return { variantes };
}

// O resumo do Claude sobre a palavra (qual versão ganha, o que testar), em cima das mensagens no painel.
export async function notaComenta(x, id, texto) {
  exigir(x.u, 'gatilhos.editar');
  const t = String(texto || '').trim();
  if (/[—–]/.test(t)) throw new Erro(400, 'Sem travessão: use vírgula, ponto ou parênteses.');
  const [r] = await db.update(x.env, 'gatilhos', { id: `eq.${id}` }, { nota: t ? t.slice(0, 3000) : null }, 'id,palavra,nota');
  if (!r) throw new Erro(404, 'Não achei essa palavra.');
  await auditar(x.env, x.u, 'gatilho.nota', `gatilhos:${r.id}`);
  return r;
}

// Ajustes gerais: contas de teste (recebem de novo no mesmo post) e o limite de directs por hora.
export async function lerAjustesComenta(x) {
  exigir(x.u, 'gatilhos.ver');
  const c = await db.um(x.env, 'config', { chave: 'eq.comenta' });
  return { testadores: [], limite_hora: 200, ...((c && c.valor) || {}) };
}
export async function salvarAjustesComenta(x, d = {}) {
  exigir(x.u, 'gatilhos.ativar');
  const atual = await lerAjustesComenta(x);
  const valor = {
    testadores: d.testadores !== undefined ? (Array.isArray(d.testadores) ? d.testadores : String(d.testadores).split(/[\s,]+/)).map((t) => String(t).trim().replace(/^@/, '').toLowerCase()).filter((t) => /^[a-z0-9._]{1,30}$/.test(t)).slice(0, 20) : atual.testadores,
    limite_hora: d.limite_hora !== undefined ? Math.min(Math.max(Number(d.limite_hora) || 200, 10), 750) : atual.limite_hora,
  };
  await db.insert(x.env, 'config', { chave: 'comenta', valor }, { upsert: true, conflito: 'chave', select: 'chave' });
  esquecerAjustesComenta();
  await auditar(x.env, x.u, 'comenta.ajustes', 'config:comenta', valor);
  return valor;
}

export async function ligarGatilho(x, id, ligar) {
  exigir(x.u, 'gatilhos.ativar');
  const g = await db.um(x.env, 'gatilhos', { id: `eq.${id}` }, 'id,palavra,link,ativo,perfil,recurso:recursos(slug,titulo,status,perfil)');
  if (!g) throw new Erro(404, 'Não achei essa palavra.');
  if (ligar && !linkDoGatilho(x.env, g)) throw new Erro(409, (g.perfil || 'br') === 'en' ? 'Publique o material em inglês (agenciasetup.com/free) ou ponha um link antes de ligar: a DM manda esse link.' : 'Publique o material no site antes de ligar: a DM manda o link dele.');
  const dados = ligar ? { ativo: true, ativado_por: x.u.id || null, ativado_em: new Date().toISOString() } : { ativo: false };
  const [r] = await db.update(x.env, 'gatilhos', { id: `eq.${g.id}` }, dados);
  await auditar(x.env, x.u, ligar ? 'gatilho.ligar' : 'gatilho.desligar', `gatilhos:${g.id}`, { palavra: g.palavra });
  return r;
}

// perfil: br, en ou nada (os dois). Cada palavra, resposta, sugestão e conta diz o perfil dela.
export async function listarGatilhos(x, { perfil } = {}) {
  exigir(x.u, 'gatilhos.ver');
  const so = filtroPerfil(perfil);
  const [gatilhos, numeros, porVersao, ultimas, sugestoes, contas, ajustes, vendas] = await Promise.all([
    db.select(x.env, 'gatilhos', { filtros: so ? { perfil: `eq.${so}` } : {}, select: '*,recurso:recursos(id,slug,titulo,status,perfil)', ordem: 'criado_em.desc', limite: 100 }),
    db.rpc(x.env, 'numeros_gatilhos'),
    db.rpc(x.env, 'numeros_variantes', { p_gatilho: null }),
    db.select(x.env, 'respostas_gatilho', { filtros: so ? { 'gatilhos.perfil': `eq.${so}` } : {}, select: `id,gatilho_id,origem,usuario,nome,texto,status,erro,variante,seguia,seguiu_em,publico_ok,criado_em,enviado_em,link_em,gatilhos${so ? '!inner' : ''}(perfil)`, ordem: 'criado_em.desc', limite: 30 }),
    // Posts do último ano que pedem uma palavra (os mais comentados primeiro): viral antigo ainda recebe comentário.
    db.select(x.env, 'posts_redes', { filtros: { palavra_chave: 'not.is.null', publicado_em: `gt.${new Date(Date.now() - 365 * 86400_000).toISOString()}`, ...(so ? { perfil: `eq.${so}` } : {}) }, select: 'rede,id_na_rede,palavra_chave,legenda,link,miniatura_url,publicado_em,comentarios,perfil', ordem: 'comentarios.desc.nullslast', limite: 30 }),
    situacaoContas(x.env, { perfil: so }),
    lerAjustesComenta(x),
    // As vendas de cada versão (comenta.js): a mesma conta que a escolha automática usa. Sem a leitura, segue sem elas.
    vendasDasVersoes(x.env).catch(() => null),
  ]);
  const usadas = new Set(gatilhos.filter((g) => g.ativo).map((g) => `${g.rede}:${g.perfil || 'br'}:${normalPalavra(g.palavra)}`));
  const VAZIO = { comentarios: 0, enviados: 0, links: 0, respostas: 0, seguidores: 0, ja_seguiam: 0, erros: 0, cliques: 0, vendas: 0, vendas_centavos: 0 };
  const taxa = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : null);
  // A receita de cada versão só aparece para quem vê faturamento; a quantidade de vendas, para todos.
  const veReceita = veVendasDe(x.u);
  return {
    contas,
    ajustes,
    gatilhos: gatilhos.map((g) => {
      const variantes = variantesDe(g);
      const stats = comVendas((porVersao && porVersao[g.id]) || {}, vendas && (vendas[g.id] || {}));
      const chance = chanceDeSerAMelhor(variantes, stats);
      return {
        ...g, variantes, link_dm: linkDoGatilho(x.env, g), numeros: numeros[g.id] || { pendentes: 0, falhas: 0, enviadas_7d: 0, cliques: 0 },
        // Por versão: envios, cliques no link curto, seguidores novos e a chance de ser a melhor. "?" são os envios de
        // antes das versões (sem versão marcada).
        por_versao: variantes.map((v) => {
          const s = { ...VAZIO, ...(stats[v.id] || {}) };
          if (!veReceita) delete s.vendas_centavos;
          return { id: v.id, nome: v.nome, ativa: v.ativa !== false, ...s, taxa_clique: taxa(s.cliques, s.enviados), taxa_seguidor: taxa(s.seguidores, s.enviados), chance_de_ser_a_melhor: v.ativa !== false ? chance[v.id] ?? null : null };
        }),
        antes_das_versoes: stats['?'] || null,
      };
    }),
    perfil: so,
    ultimas: ultimas.map(({ gatilhos: dono, ...r }) => ({ ...r, perfil: (dono && dono.perfil) || 'br' })),
    sugestoes: sugestoes.filter((p) => !usadas.has(`${p.rede}:${p.perfil || 'br'}:${normalPalavra(p.palavra_chave)}`)).slice(0, 12).map((p) => ({ ...p, legenda: (p.legenda || '').slice(0, 160) })),
  };
}

// ---------------------------------------------------------------- oferta (mini curso no fim do funil)
// Cada perfil tem a sua oferta (lib/perfis.js): a do Brasil em "oferta", a do inglês em "oferta_en" (o curso em dólar,
// que leva à raiz de agenciasetup.com; nome e botao_dm só existem nela).
const CAMPOS_OFERTA = ['ativo', 'landing_slug', 'titulo', 'texto', 'cta', 'linha_dm', 'nome', 'botao_dm', 'curso_primeiro'];
const OFERTA_SIM_NAO = ['ativo', 'curso_primeiro'];

export async function lerOferta(x, perfil) {
  exigir(x.u, 'cursos.ver');
  const p = lerPerfil(perfil);
  const c = await db.um(x.env, 'config', { chave: `eq.${perfilDe(p).oferta}` });
  const no_ar = await ofertaAtiva(x.env, p);
  return { ...((c && c.valor) || {}), perfil: p, no_ar: !!no_ar, link: no_ar ? no_ar.link : null };
}

export async function salvarOferta(x, dados) {
  exigir(x.u, 'cursos.editar');
  const p = lerPerfil(dados.perfil);
  const chave = perfilDe(p).oferta;
  const d = {};
  for (const k of CAMPOS_OFERTA) if (dados[k] !== undefined) d[k] = OFERTA_SIM_NAO.includes(k) ? !!dados[k] : dados[k] == null ? '' : String(dados[k]).slice(0, k === 'texto' || k === 'linha_dm' ? 400 : 120);
  if (d.landing_slug) {
    d.landing_slug = slugar(d.landing_slug);
    const lp = await db.um(x.env, 'landing_pages', { slug: `eq.${d.landing_slug}` }, 'id');
    if (!lp) throw new Erro(400, 'Não achei essa landing page.');
  }
  const atual = await db.um(x.env, 'config', { chave: `eq.${chave}` });
  await db.insert(x.env, 'config', { chave, valor: { ...((atual && atual.valor) || {}), ...d } }, { upsert: true, conflito: 'chave', select: 'chave' });
  await auditar(x.env, x.u, 'oferta.editar', `config:${chave}`, { campos: Object.keys(d), perfil: p });
  return lerOferta(x, p);
}

// ---------------------------------------------------------------- desempenho e em alta
// Um perfil por vez (lib/perfis.js, padrão Brasil): o ranking e as medianas de um perfil nunca se misturam com o outro.
export async function verDesempenho(x, dias = 30, rede = 'instagram', perfil = 'br') {
  exigir(x.u, 'desempenho.ver');
  const d = Math.min(3650, Math.max(1, Number(dias) || 30));
  const r = plataforma(rede) ? rede : 'instagram';
  const f = filtroPerfil(perfil) || 'br';
  const [resumo, todas] = await Promise.all([db.rpc(x.env, 'desempenho', { p_dias: d, p_rede: r, p_perfil: f }), situacaoContas(x.env)]);
  const contas = todas.filter((c) => c.perfil === f);
  // "contas": a da rede escolhida primeiro; "redes": as que têm conta no perfil para trocar; "perfis": os que têm conta.
  return { ...resumo, perfil: f, contas: [...contas.filter((c) => c.rede === r), ...contas.filter((c) => c.rede !== r)], redes: [...new Set(contas.map((c) => c.rede))], perfis: [...new Set(todas.map((c) => c.perfil))] };
}

const ORDEM_POSTS = { nota: 'nota.desc.nullslast', recentes: 'publicado_em.desc', comentarios: 'comentarios.desc.nullslast', curtidas: 'curtidas.desc.nullslast', alcance: 'alcance.desc.nullslast', salvos: 'salvos.desc.nullslast', compartilhamentos: 'compartilhamentos.desc.nullslast' };
export async function listarPosts(x, { ordem = 'recentes', formato, dias, busca, rede, perfil, limite = 30, offset = 0 } = {}) {
  exigir(x.u, 'desempenho.ver');
  const filtros = {};
  if (rede && plataforma(rede)) filtros.rede = `eq.${rede}`;
  if (filtroPerfil(perfil)) filtros.perfil = `eq.${filtroPerfil(perfil)}`;
  if (formato) filtros.formato = `eq.${String(formato).replace(/[^a-z]/g, '')}`;
  if (dias) filtros.publicado_em = `gt.${new Date(Date.now() - Math.min(3650, Number(dias) || 30) * 86400_000).toISOString()}`;
  const b = String(busca || '').replace(/[%*,()]/g, ' ').trim().slice(0, 60);
  if (b) filtros.legenda = `ilike.*${b}*`;
  const r = await db.select(x.env, 'posts_redes', {
    filtros, ordem: ORDEM_POSTS[ordem] || ORDEM_POSTS.recentes, limite: Math.min(100, Number(limite) || 30), offset, contar: true,
    select: 'id,rede,id_na_rede,peca_id,formato,legenda,link,miniatura_url,publicado_em,curtidas,comentarios,salvos,compartilhamentos,alcance,visualizacoes,nota,palavra_chave,temas,metricas_em,perfil',
  });
  // Nota de venda: o que cada post vendeu (pela palavra do Comenta X na DM, ou pelo link com utm_content do post).
  if (r.linhas.length && x.u && ['administrador', 'editor'].includes(x.u.papel)) await somarVendas(x.env, r.linhas).catch((e) => console.error('vendas por post', e.message));
  return r;
}

const normalPalavraDm = (p) => String(p || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
// De quem é cada venda: o post do link (utm_content ou utm_term do link curto do Comenta X) ou, pela palavra da DM
// (utm_campaign), o post mais recente com aquela palavra antes da compra. Devolve { id do post: [pedidos] }.
async function atribuirVendas(env, posts) {
  const desde = posts.reduce((m, p) => (p.publicado_em && p.publicado_em < m ? p.publicado_em : m), new Date().toISOString());
  // A moeda das vendas é a do perfil dos posts (Brasil em real, inglês em dólar): nunca soma uma com a outra.
  const moedas = [...new Set(posts.map((p) => (p.perfil === 'en' ? 'usd' : 'brl')))];
  const pedidos = await db.select(env, 'pedidos', { filtros: { status: 'eq.pago', teste: 'is.false', pago_em: `gte.${desde}`, moeda: `in.(${moedas.join(',') || 'brl'})` }, select: 'total_centavos,pago_em,ultimo_toque', limite: 2000 });
  // Todos os posts com palavra (não só os desta página), para dar a venda ao post mais recente antes da compra.
  // Só os posts dos perfis desta lista disputam a venda (lib/perfis.js): a palavra igual no outro perfil não leva.
  const perfis = [...new Set(posts.map((p) => p.perfil || 'br'))];
  const comPalavra = await db.select(env, 'posts_redes', { filtros: { palavra_chave: 'not.is.null', publicado_em: `gte.${new Date(new Date(desde).getTime() - 60 * 86400_000).toISOString()}`, perfil: `in.(${perfis.join(',')})` }, select: 'id,palavra_chave,publicado_em', limite: 1000 });
  const por = {};
  for (const p of pedidos) {
    const t = p.ultimo_toque || {};
    let dono = null;
    if (t.conteudo || t.termo) dono = posts.find((x) => [t.conteudo, t.termo].includes(x.peca_id) || [t.conteudo, t.termo].includes(x.id_na_rede) || x.id === t.conteudo);
    if (!dono && t.meio === 'dm' && t.campanha) {
      const cands = comPalavra.filter((x) => normalPalavraDm(x.palavra_chave) === t.campanha && x.publicado_em <= p.pago_em).sort((a, b) => (a.publicado_em < b.publicado_em ? 1 : -1));
      dono = cands[0] ? posts.find((x) => x.id === cands[0].id) || null : null;
    }
    if (!dono) continue;
    (por[dono.id] = por[dono.id] || []).push({ pago_em: p.pago_em, total_centavos: p.total_centavos });
  }
  return por;
}
export async function somarVendas(env, posts) {
  const por = await atribuirVendas(env, posts);
  for (const p of posts) { const l = por[p.id] || []; p.vendas = l.length; p.vendas_centavos = l.reduce((s, v) => s + v.total_centavos, 0); }
}

// ---------------------------------------------------------------- resultados por post
// Pedido do dono em 24/10/2026: "ver por post as automações, as métricas, qual vendeu mais, qual engajou melhor,
// qual foi uma merda". Todos os posts do período com os números, o Comenta X e as vendas; o painel ordena e filtra.
// Classe pelo engajamento (nota) contra a mediana do período: acima (1,5 vez ou mais), abaixo (60% ou menos), normal.
const CAMPOS_POST = 'id,rede,id_na_rede,peca_id,formato,legenda,link,miniatura_url,publicado_em,curtidas,comentarios,salvos,compartilhamentos,alcance,visualizacoes,nota,palavra_chave,temas,metricas_em,perfil';
const mediana = (l) => { const v = l.filter((n) => n != null && Number.isFinite(Number(n))).map(Number).sort((a, b) => a - b); if (!v.length) return null; const m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const veVendasDe = (u) => !!u && ['administrador', 'editor'].includes(u.papel);
function classe(p, med) {
  const base = p.nota != null && med.nota ? Number(p.nota) / med.nota : p.comentarios != null && med.comentarios ? p.comentarios / med.comentarios : null;
  if (base == null) return { classe: null, vezes: null };
  return { classe: base >= 1.5 ? 'acima' : base <= 0.6 ? 'abaixo' : 'normal', vezes: Math.round(base * 10) / 10 };
}
// Um perfil por vez (padrão Brasil): a média e a classe de cada post são as do perfil dele.
export async function resultadosPosts(x, { dias = 30, rede = 'instagram', perfil = 'br' } = {}) {
  exigir(x.u, 'desempenho.ver');
  const d = Math.min(3650, Math.max(1, Number(dias) || 30));
  const r = plataforma(rede) ? rede : 'instagram';
  const f = filtroPerfil(perfil) || 'br';
  const posts = await db.select(x.env, 'posts_redes', { filtros: { rede: `eq.${r}`, perfil: `eq.${f}`, publicado_em: `gt.${new Date(Date.now() - d * 86400_000).toISOString()}` }, select: CAMPOS_POST, ordem: 'publicado_em.desc', limite: 400 });
  const ids = posts.map((p) => p.id_na_rede).filter(Boolean);
  const [comenta, todas] = await Promise.all([ids.length ? db.rpc(x.env, 'numeros_comenta_posts', { p_ids: ids }) : {}, situacaoContas(x.env)]);
  const contas = todas.filter((c) => c.perfil === f);
  const veVendas = veVendasDe(x.u);
  if (veVendas && posts.length) await somarVendas(x.env, posts).catch((e) => console.error('vendas por post', e.message));
  const med = Object.fromEntries(['nota', 'comentarios', 'curtidas', 'alcance', 'salvos', 'compartilhamentos'].map((k) => [k, mediana(posts.map((p) => p[k]))]));
  const lista = posts.map((p) => ({ ...p, legenda: String(p.legenda || '').slice(0, 220), comenta: (comenta && comenta[p.id_na_rede]) || null, ...classe(p, med) }));
  const soma = (k) => lista.reduce((s, p) => s + (Number(p[k]) || 0), 0);
  const somaC = (k) => lista.reduce((s, p) => s + ((p.comenta && Number(p.comenta[k])) || 0), 0);
  const maior = (f) => { const l = lista.filter((p) => Number(f(p)) > 0); return l.length ? l.reduce((a, b) => (Number(f(b)) > Number(f(a)) ? b : a)) : null; };
  // O pior: abaixo da mediana e com pelo menos 2 dias no ar (post de ontem ainda está crescendo).
  // Sem curtida nem comentário é número que não chegou (story, post sem leitura), não post ruim.
  const pior = () => { const l = lista.filter((p) => p.classe === 'abaixo' && (p.curtidas || 0) + (p.comentarios || 0) > 0 && Date.now() - Date.parse(p.publicado_em) > 2 * 86400_000); return l.length ? l.reduce((a, b) => ((b.vezes ?? 9) < (a.vezes ?? 9) ? b : a)) : null; };
  const leve = (p) => p && { id: p.id, legenda: p.legenda.slice(0, 120), miniatura_url: p.miniatura_url, link: p.link, publicado_em: p.publicado_em, formato: p.formato, nota: p.nota, comentarios: p.comentarios, alcance: p.alcance, vendas: p.vendas || 0, vendas_centavos: p.vendas_centavos || 0, vezes: p.vezes, directs: p.comenta ? p.comenta.directs : 0 };
  return {
    dias: d, rede: r, perfil: f, contas: contas.filter((c) => c.rede === r), redes: [...new Set(contas.map((c) => c.rede))], perfis: [...new Set(todas.map((c) => c.perfil))], ve_vendas: veVendas, medianas: med,
    resumo: {
      posts: lista.length, alcance: soma('alcance'), curtidas: soma('curtidas'), comentarios: soma('comentarios'), salvos: soma('salvos'), compartilhamentos: soma('compartilhamentos'),
      pedidos_palavra: somaC('pedidos'), directs: somaC('directs'), cliques: somaC('cliques'), seguidores: somaC('seguidores'),
      ...(veVendas ? { vendas: soma('vendas'), vendas_centavos: soma('vendas_centavos') } : {}),
    },
    destaques: {
      engajamento: leve(maior((p) => p.nota)), comentarios: leve(maior((p) => p.comentarios)), alcance: leve(maior((p) => p.alcance)),
      ...(veVendas ? { vendas: leve(maior((p) => p.vendas_centavos)) } : {}), directs: leve(maior((p) => p.comenta && p.comenta.directs)), pior: leve(pior()),
    },
    posts: lista,
  };
}

// Um post: os números contra a mediana da época dele, o Comenta X (por versão), as últimas respostas e as vendas.
export async function verPost(x, id) {
  exigir(x.u, 'desempenho.ver');
  const p = await db.um(x.env, 'posts_redes', UUID.test(String(id)) ? { id: `eq.${id}` } : { id_na_rede: `eq.${String(id).replace(/[^\w-]/g, '')}` }, CAMPOS_POST);
  if (!p) throw new Erro(404, 'Não achei esse post.');
  // A média é a da época do post (120 dias antes e 30 depois): conta parada por meses não fica sem comparação.
  const quando = Date.parse(p.publicado_em) || Date.now();
  const desde = new Date(quando - 120 * 86400_000).toISOString();
  const ate = new Date(quando + 30 * 86400_000).toISOString();
  const palavra = String(p.palavra_chave || '').replace(/[^\p{L}\p{N}]/gu, '');
  const [peca, gatilhos, respostas, links, outros, numeros] = await Promise.all([
    p.peca_id ? db.um(x.env, 'pecas', { id: `eq.${p.peca_id}` }, 'id,titulo,status,formato,slides,midias,opcoes,grupo,aprovado_em,origem_tipo,origem_id,perfil') : null,
    db.select(x.env, 'gatilhos', { filtros: { or: `(posts.cs.{${p.id_na_rede}}${p.peca_id ? `,peca_id.eq.${p.peca_id}` : ''}${palavra ? `,and(posts.eq.{},palavra.ilike.${palavra})` : ''})` }, select: 'id,palavra,nome,modo,ativo,perfil,variantes,mensagem,respostas,link,recurso:recursos(slug,titulo,status,perfil)', limite: 5 }),
    db.select(x.env, 'respostas_gatilho', { filtros: { post_id: `eq.${p.id_na_rede}` }, select: 'id,gatilho_id,variante,status,nome,usuario,texto,erro,seguia,seguiu_em,publico_ok,criado_em,enviado_em,link_em', ordem: 'criado_em.desc', limite: 1000 }),
    db.select(x.env, 'links', { filtros: { utm_term: `eq.${p.id_na_rede}`, gatilho_id: 'not.is.null' }, select: 'codigo,variante,cliques', limite: 50 }),
    // A média da época, só com os posts do mesmo perfil.
    db.select(x.env, 'posts_redes', { filtros: { rede: `eq.${p.rede}`, perfil: `eq.${p.perfil || 'br'}`, publicado_em: `gt.${desde}`, and: `(publicado_em.lt.${ate})` }, select: 'nota,comentarios,curtidas,alcance,salvos,compartilhamentos', limite: 400 }),
    db.rpc(x.env, 'numeros_comenta_posts', { p_ids: [p.id_na_rede] }),
  ]);
  const med = Object.fromEntries(['nota', 'comentarios', 'curtidas', 'alcance', 'salvos', 'compartilhamentos'].map((k) => [k, mediana(outros.map((o) => o[k]))]));
  // Por versão: directs, materiais, seguidores novos e cliques do link curto daquele post.
  const porVersao = {};
  const linha = (v) => (porVersao[v] = porVersao[v] || { id: v, directs: 0, materiais: 0, seguidores: 0, falhas: 0, cliques: 0 });
  for (const r of respostas) {
    const s = linha(r.variante || '?');
    if (['enviando', 'enviada', 'pergunta', 'respondendo', 'link'].includes(r.status)) s.directs++;
    if (['enviada', 'link'].includes(r.status)) s.materiais++;
    if (r.seguiu_em) s.seguidores++;
    if (r.status === 'falhou') s.falhas++;
  }
  for (const l of links) linha(l.variante || '?').cliques += l.cliques || 0;
  const nomes = Object.fromEntries(gatilhos.flatMap((g) => variantesDe(g).map((v) => [v.id, v.nome])));
  let vendas = null;
  if (veVendasDe(x.u)) {
    const l = (await atribuirVendas(x.env, [p]).catch(() => ({})))[p.id] || [];
    vendas = { quantidade: l.length, centavos: l.reduce((s, v) => s + v.total_centavos, 0), pedidos: l.slice(0, 50) };
  }
  return {
    post: p, peca, medianas: med, ...classe(p, med),
    comenta: {
      ...((numeros && numeros[p.id_na_rede]) || { pedidos: 0, directs: 0, materiais: 0, seguidores: 0, falhas: 0, cliques: 0 }),
      gatilhos: gatilhos.map((g) => ({ id: g.id, palavra: g.palavra, nome: g.nome, modo: g.modo, ativo: g.ativo, material: (g.recurso && g.recurso.titulo) || g.link })),
      versoes: Object.values(porVersao).map((v) => ({ ...v, nome: nomes[v.id] || (v.id === '?' ? 'Antes das versões' : '') })),
    },
    ultimas: respostas.slice(0, 15).map((r) => ({ id: r.id, nome: r.nome, usuario: r.usuario, texto: r.texto, status: r.status, variante: r.variante, erro: r.erro, seguia: r.seguia, seguiu_em: r.seguiu_em, criado_em: r.criado_em, link_em: r.link_em })),
    vendas,
  };
}

export async function verEmAlta(x, { horas = 48, limite = 30 } = {}) {
  exigir(x.u, 'pautas.ver');
  const [alta, fontes] = await Promise.all([
    db.rpc(x.env, 'em_alta', { p_horas: Math.min(336, Math.max(1, Number(horas) || 48)), p_limite: Math.min(100, Math.max(1, Number(limite) || 30)) }),
    situacaoFontes(x.env),
  ]);
  return { ...alta, fontes };
}

// "Atualizar agora" do painel e do Claude: uma fatia do que o relógio faria (o limite de chamadas vale aqui também).
// Desempenho: só a rede pedida (padrão Instagram), para caber nas 50 chamadas por execução do plano grátis.
export async function atualizarAgora(x, oque, { rede, perfil } = {}) {
  let r;
  if (oque === 'radar') {
    exigir(x.u, 'pautas.editar');
    r = await atualizarRadar(x.env, { quantas: 4 });
  } else if (oque === 'desempenho') {
    exigir(x.u, 'desempenho.ver');
    const qual = String(rede || 'instagram').replace(/[^a-z]/g, '');
    // Com perfil, só a conta daquele perfil (cabe nas chamadas de uma execução); sem, as contas da rede.
    const f = filtroPerfil(perfil) || undefined;
    r = { posts: await sincronizarPosts(x.env, { rede: qual, perfil: f }), metricas: await atualizarMetricas(x.env, { limite: 8, rede: qual, perfil: f }) };
  } else throw new Erro(400, 'Use radar ou desempenho.');
  await auditar(x.env, x.u, `atualizar.${oque}`, oque);
  return r;
}

// ---------------------------------------------------------------- perfil de uma conta conectada
// Pedido do dono em 29/10/2026 ("clareza dos dois perfis, separados"): a conta que entrou no perfil errado muda aqui.
// Os posts dela vão junto (o perfil do post é o da conta). Peças agendadas sem conta escolhida seguem o perfil delas:
// o aviso diz quantas ficariam sem conta.
export async function mudarPerfilConexao(x, id, perfilNovo) {
  exigir(x.u, 'redes.conectar');
  const perfil = lerPerfil(perfilNovo, null);
  if (!perfil) throw new Erro(400, 'Diga o perfil: br (Agência Setup, Brasil) ou en (Setup Agency, inglês).');
  if (!UUID.test(String(id))) throw new Erro(400, 'Use o id da conexão.');
  const c = await db.um(x.env, 'conexoes', { id: `eq.${id}` }, 'id,plataforma,conta_nome,perfil,status');
  if (!c || c.status === 'desligada') throw new Erro(404, 'Conexão não encontrada.');
  const antes = c.perfil || 'br';
  if (antes === perfil) return { conexao: c, mudou: false };
  const [r] = await db.update(x.env, 'conexoes', { id: `eq.${c.id}` }, { perfil }, 'id,plataforma,conta_nome,perfil,status');
  await db.update(x.env, 'posts_redes', { conexao_id: `eq.${c.id}` }, { perfil }, 'id').catch((e) => console.error('perfil dos posts', e && e.message));
  // Peças do perfil de antes que dependiam dela (sem conta escolhida) e não têm outra conta naquela rede.
  const [outra, presas, escolhidas] = await Promise.all([
    db.um(x.env, 'conexoes', { plataforma: `eq.${c.plataforma}`, perfil: `eq.${antes}`, status: 'eq.ativa' }, 'id'),
    db.select(x.env, 'pecas', { filtros: { rede: `eq.${c.plataforma}`, perfil: `eq.${antes}`, status: 'in.(aprovado,agendado)', conexao_id: 'is.null' }, select: 'id', limite: 200 }),
    db.select(x.env, 'pecas', { filtros: { conexao_id: `eq.${c.id}`, perfil: `neq.${perfil}`, status: 'in.(rascunho,aprovado,agendado,erro)' }, select: 'id', limite: 200 }),
  ]);
  const avisos = [];
  const m = plataforma(c.plataforma);
  if (!outra && presas.length) avisos.push(`${presas.length} ${presas.length === 1 ? 'peça' : 'peças'} de ${m ? m.nome : c.plataforma} do perfil ${perfilDe(antes).rotulo} ${presas.length === 1 ? 'ficou' : 'ficaram'} sem conta: conecte a conta desse perfil antes da hora marcada.`);
  if (escolhidas.length) avisos.push(`${escolhidas.length} ${escolhidas.length === 1 ? 'peça escolheu' : 'peças escolheram'} esta conta: elas vão dar erro até você escolher outra conta ou mudar o perfil da peça.`);
  await auditar(x.env, x.u, 'rede.perfil', `rede:${c.plataforma}`, { conta: c.conta_nome, de: antes, para: perfil });
  return { conexao: r, mudou: true, avisos };
}

// ---------------------------------------------------------------- arquivos
export async function enviarArquivo(x, { bucket, nome, corpo, tipo }) {
  exigir(x.u, 'arquivos.enviar');
  if (!['recursos', 'midia'].includes(bucket)) throw new Erro(400, 'Pasta inválida: use recursos ou midia.');
  if (!corpo || !corpo.byteLength) throw new Erro(400, 'Arquivo vazio.');
  if (corpo.byteLength > 50 * 1024 * 1024) throw new Erro(413, 'Arquivo acima de 50 MB.');
  const ext = (String(nome).match(/\.[a-z0-9]{1,8}$/i)?.[0] || '').toLowerCase();
  const limpo = (slugar(String(nome).replace(/\.[^.]+$/, '')) || 'arquivo') + ext;
  const caminho = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID().slice(0, 8)}-${limpo}`;
  const url = await subirArquivo(x.env, bucket, caminho, corpo, tipo);
  await auditar(x.env, x.u, 'enviar_arquivo', `${bucket}:${caminho}`, { bytes: corpo.byteLength });
  return { url, bytes: corpo.byteLength, nome: limpo, tipo: tipo || null };
}

// ---------------------------------------------------------------- chaves do conector
export async function criarChave(x, { nome, papel }) {
  exigir(x.u, 'chaves.proprias');
  if (!x.u.id) throw new Erro(403, 'Chaves novas são criadas por uma pessoa da equipe, no painel.');
  const p = PAPEIS.includes(papel) ? papel : x.u.papel;
  if (!acimaOuIgual(x.u.papel, p)) throw new Erro(403, 'A chave não pode ter cargo acima do seu.');
  const n = String(nome || '').trim().slice(0, 80) || 'Claude';
  const chave = `as_${aleatorio(40)}`;
  const [r] = await db.insert(x.env, 'chaves_api', { nome: n, prefixo: chave.slice(0, 7), hash: await sha256(chave), equipe_id: x.u.id, papel: p }, { select: 'id' });
  await auditar(x.env, x.u, 'chave.criar', `chave:${r.id}`, { nome: n, papel: NOME_PAPEL[p] });
  return { id: r.id, chave };
}

export async function revogarChave(x, id) {
  exigir(x.u, 'chaves.proprias');
  const c = await db.um(x.env, 'chaves_api', { id: `eq.${id}`, revogada_em: 'is.null' }, 'id,nome,equipe_id');
  if (!c) throw new Erro(404, 'Chave não encontrada.');
  if (c.equipe_id !== x.u.id) exigir(x.u, 'chaves.todas');
  await db.update(x.env, 'chaves_api', { id: `eq.${c.id}` }, { revogada_em: new Date().toISOString() }, 'id');
  await auditar(x.env, x.u, 'chave.revogar', `chave:${c.id}`, { nome: c.nome });
  return { ok: true };
}

// ---------------------------------------------------------------- skills do Claude
// As skills de .claude/skills/ (gravadas por scripts/skill.mjs em config "skill:<nome>"): o processo completo de uma
// tarefa (ex.: carrossel-agenciasetup), com as verificações. O painel mostra e baixa; o conector lê (ver_skill).
const linhaSkill = (c) => ({ nome: c.valor.nome, descricao: c.valor.descricao, atualizado: c.valor.atualizado, arquivos: Object.keys(c.valor.arquivos || {}) });

export async function listarSkills(x) {
  exigir(x.u, 'painel.ver');
  const linhas = await db.select(x.env, 'config', { filtros: { chave: 'like.skill:*' }, ordem: 'chave.asc' });
  return linhas.map(linhaSkill);
}

// Sem arquivo: o SKILL.md. arquivo "tudo": todos os arquivos. pacote: devolve também o .skill em base64 (painel).
export async function lerSkill(x, nome, { arquivo, pacote } = {}) {
  exigir(x.u, 'painel.ver');
  const c = await db.um(x.env, 'config', { chave: `eq.skill:${String(nome || '').replace(/[^a-z0-9-]/g, '')}` });
  if (!c) throw new Erro(404, 'Skill não encontrada. Grave com npm run skill.');
  const base = linhaSkill(c);
  if (arquivo === 'tudo') return { ...base, conteudo: c.valor.arquivos, ...(pacote ? { pacote_b64: c.valor.pacote_b64 } : {}) };
  const qual = arquivo || 'SKILL.md';
  if (!(qual in c.valor.arquivos)) throw new Erro(404, `Arquivo não encontrado. Os da skill: ${base.arquivos.join(', ')}.`);
  return { ...base, arquivo: qual, conteudo: c.valor.arquivos[qual] };
}
