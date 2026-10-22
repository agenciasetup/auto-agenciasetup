// As ações do sistema, num lugar só: o painel (/api/admin) e o conector do Claude (/mcp) chamam daqui.
// Cada ação confere o cargo (permissoes.js) e grava na auditoria. x = { env, ctx, url, u } (u = quem pede).
import { auditar, exigir } from '../nucleo/auth.js';
import { db, enviarArquivo as subirArquivo } from '../nucleo/db.js';
import { NOME_PAPEL, PAPEIS, acimaOuIgual, pode } from '../nucleo/permissoes.js';
import { Erro, aleatorio, sha256, slugar } from '../nucleo/util.js';
import { plataforma } from '../plataformas/index.js';
import { publicarPeca } from '../plataformas/fila.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Campos que cada tabela aceita de fora.
const CAMPOS = {
  recursos: ['slug', 'titulo', 'resumo', 'corpo_md', 'tipo', 'categoria_id', 'capa_url', 'arquivo_url', 'arquivo_nome', 'arquivo_bytes', 'link_externo', 'tags', 'destaque', 'seo'],
  artigos: ['slug', 'titulo', 'resumo', 'corpo_md', 'categoria_id', 'capa_url', 'tags', 'fontes', 'recurso_id', 'destaque', 'seo'],
  landing_pages: ['slug', 'titulo', 'produto_id', 'blocos', 'seo'],
  produtos: ['slug', 'nome', 'chamada', 'descricao', 'preco_centavos', 'preco_de_centavos', 'link_checkout', 'imagem_url', 'tags', 'ativo'],
  anuncios: ['produto_id', 'titulo', 'texto', 'cta', 'imagem_url', 'link', 'alvo_tags', 'alvo_categorias', 'posicoes', 'peso', 'ativo', 'inicio', 'fim'],
  pautas: ['titulo', 'resumo', 'fonte_url', 'fonte_nome', 'tags', 'status'],
  pecas: ['titulo', 'legenda', 'roteiro', 'slides', 'midias', 'agendado_para', 'conexao_id'],
};
const COM_SLUG = ['recursos', 'artigos', 'landing_pages', 'produtos'];
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
};
export const TIPOS = Object.keys(PERMISSAO);

function pegar(tabela, dados) {
  const r = {};
  for (const c of CAMPOS[tabela]) if (dados[c] !== undefined) r[c] = dados[c] === '' ? null : dados[c];
  return r;
}

export function filtroId(tabela, id) {
  if (UUID.test(String(id))) return { id: `eq.${id}` };
  if (COM_SLUG.includes(tabela)) return { slug: `eq.${slugar(id)}` };
  throw new Erro(400, 'Use o id (uuid) deste item.');
}

export function endereco(x, tabela, r) {
  const base = x.env.SITE_URL || x.url.origin;
  if (!r || !r.slug) return undefined;
  if (tabela === 'recursos') return `${base}/recursos/${r.slug}`;
  if (tabela === 'artigos') return `${base}/novidades/${r.slug}`;
  if (tabela === 'landing_pages') return `${base}/cursos/${r.slug}`;
  return undefined;
}

// ---------------------------------------------------------------- leitura
export async function listar(x, tabela, { status, busca, rede, limite = 30, offset = 0, select = '*' } = {}) {
  if (!PERMISSAO[tabela]) throw new Erro(400, 'Tipo desconhecido.');
  exigir(x.u, PERMISSAO[tabela].ver);
  const filtros = {};
  if (status) filtros.status = `eq.${status}`;
  if (rede && tabela === 'pecas') filtros.rede = `eq.${rede}`;
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
  const titulo = tabela === 'produtos' ? 'nome' : 'titulo';
  if (COM_SLUG.includes(tabela)) {
    if (!id && !dados[titulo]) throw new Erro(400, `Falta ${titulo}.`);
    if (!id && !dados.slug) dados.slug = slugar(dados[titulo]);
    if (dados.slug) dados.slug = slugar(dados.slug);
    if (dados.slug === '') throw new Erro(400, 'O endereço (slug) ficou vazio.');
  } else if (!id && !dados[titulo]) throw new Erro(400, `Falta ${titulo}.`);
  if (tabela === 'pautas' && dados.status && !['nova', 'aproveitada', 'descartada'].includes(dados.status)) throw new Erro(400, 'Status de pauta inválido.');
  let r;
  if (id) {
    const atual = await db.um(x.env, tabela, filtroId(tabela, id), 'id,status');
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
  return { ...r, endereco: endereco(x, tabela, r) };
}

export async function mudarPublicacao(x, tabela, id, publicar) {
  if (!PUBLICAVEIS.includes(tabela)) throw new Erro(400, 'Só recursos, novidades e landing pages vão para o site.');
  exigir(x.u, PERMISSAO[tabela].publicar);
  const atual = await db.um(x.env, tabela, filtroId(tabela, id), 'id,publicado_em,status');
  if (!atual) throw new Erro(404, 'Não achei esse item.');
  const dados = { status: publicar ? 'publicado' : 'arquivado' };
  if (publicar && !atual.publicado_em) dados.publicado_em = new Date().toISOString();
  const [r] = await db.update(x.env, tabela, { id: `eq.${atual.id}` }, dados);
  await auditar(x.env, x.u, publicar ? 'publicar' : 'arquivar', `${tabela}:${r.id}`);
  return { ...r, endereco: endereco(x, tabela, r) };
}

// ---------------------------------------------------------------- peças da fila
const LINHA_PECA = (origem, p) => ({
  origem_tipo: origem.origem_tipo || 'livre', origem_id: origem.origem_id || null, rede: p.rede, formato: p.formato,
  titulo: p.titulo ?? null, legenda: p.legenda ?? null, roteiro: p.roteiro ?? null,
  slides: p.slides ?? [], midias: p.midias ?? [], agendado_para: null, conexao_id: null, status: 'rascunho',
});

export async function criarPecas(x, { origem_tipo, origem_id, pecas }) {
  exigir(x.u, 'pecas.editar');
  if (!Array.isArray(pecas) || !pecas.length) throw new Erro(400, 'Mande ao menos uma peça.');
  if (pecas.length > 20) throw new Erro(400, 'No máximo 20 peças por vez.');
  for (const p of pecas) {
    const m = plataforma(p.rede);
    if (!m) throw new Erro(400, `Rede desconhecida: ${p.rede}.`);
    if (!m.formatos.includes(p.formato)) throw new Erro(400, `${m.nome} não publica o formato ${p.formato}. Formatos: ${m.formatos.join(', ')}.`);
  }
  // Todas as linhas com os mesmos campos: o banco recusa um lote com formatos diferentes.
  const r = await db.insert(x.env, 'pecas', pecas.map((p) => LINHA_PECA({ origem_tipo, origem_id }, p)), { select: 'id,rede,formato,status' });
  await auditar(x.env, x.u, 'criar', 'pecas', { quantas: r.length, redes: [...new Set(r.map((p) => p.rede))] });
  return r;
}

export async function editarPeca(x, id, dadosBrutos) {
  exigir(x.u, 'pecas.editar');
  const atual = await db.um(x.env, 'pecas', { id: `eq.${id}` }, 'id,status');
  if (!atual) throw new Erro(404, 'Não achei essa peça.');
  if (!['rascunho', 'aprovado', 'erro'].includes(atual.status)) throw new Erro(409, `Peça ${atual.status} não pode ser editada. Volte para rascunho antes.`);
  const dados = pegar('pecas', dadosBrutos);
  delete dados.agendado_para;
  // Editou depois de aprovar (ou de dar erro): volta para rascunho e precisa de nova aprovação.
  if (atual.status !== 'rascunho') Object.assign(dados, { status: 'rascunho', aprovado_por: null, aprovado_em: null, erro: null, tentativas: 0 });
  const [r] = await db.update(x.env, 'pecas', { id: `eq.${atual.id}` }, dados);
  await auditar(x.env, x.u, 'editar', `pecas:${r.id}`, { campos: Object.keys(dados) });
  return r;
}

// aprovar | agendar | cancelar | voltar
export async function mudarStatusPeca(x, id, acao, { agendado_para } = {}) {
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
  } else if (acao === 'voltar') {
    exigir(x.u, 'pecas.editar');
    if (['publicado', 'publicando'].includes(atual.status)) throw new Erro(409, 'Peça já publicada não volta para rascunho.');
    dados = { status: 'rascunho', agendado_para: null, aprovado_por: null, aprovado_em: null, erro: null, tentativas: 0, proxima_tentativa: null };
  } else throw new Erro(400, 'Ação desconhecida. Use aprovar, agendar, cancelar ou voltar.');
  const [r] = await db.update(x.env, 'pecas', { id: `eq.${atual.id}` }, dados);
  await auditar(x.env, x.u, `peca.${acao}`, `pecas:${r.id}`, acao === 'agendar' ? { agendado_para: dados.agendado_para } : {});
  return r;
}

export async function publicarPecaAgora(x, id) {
  exigir(x.u, 'pecas.aprovar');
  const atual = await db.um(x.env, 'pecas', { id: `eq.${id}` });
  if (!atual) throw new Erro(404, 'Não achei essa peça.');
  if (['publicado', 'publicando', 'cancelado'].includes(atual.status)) throw new Erro(409, `Peça ${atual.status} não pode ser publicada agora.`);
  const m = plataforma(atual.rede);
  if (!m || !m.disponivel) throw new Erro(409, `${m ? m.nome : atual.rede} ainda não está ligada ao sistema. A peça fica na fila até o módulo entrar.`);
  const conta = await db.um(x.env, 'conexoes', { plataforma: `eq.${atual.rede}`, status: 'eq.ativa' }, 'id');
  if (!conta) throw new Erro(409, `Nenhuma conta de ${m.nome} conectada. Conecte em Redes, no painel.`);
  // Marca "publicando" só se ninguém pegou antes (o relógio pode estar rodando agora).
  const [pega] = await db.update(x.env, 'pecas', { id: `eq.${atual.id}`, status: `eq.${atual.status}` },
    { status: 'publicando', tentativas: (atual.tentativas || 0) + 1, agendado_para: new Date().toISOString(), aprovado_por: atual.aprovado_por || x.u.id || null, aprovado_em: atual.aprovado_em || new Date().toISOString() });
  if (!pega) throw new Erro(409, 'A peça mudou agora há pouco. Abra de novo.');
  await auditar(x.env, x.u, 'peca.publicar_agora', `pecas:${pega.id}`);
  await publicarPeca(x.env, pega);
  return db.um(x.env, 'pecas', { id: `eq.${pega.id}` });
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
