// API do painel (/api/admin). Contrato em docs/api-painel.md. As ações de verdade estão em ../acoes.js.
import { authAdmin, db } from '../../nucleo/db.js';
import { auditar, exigir, quemPede } from '../../nucleo/auth.js';
import { DESCRICAO_PAPEL, NOME_PAPEL, PAPEIS, permissoes } from '../../nucleo/permissoes.js';
import { pagina, q, roteador } from '../../nucleo/rota.js';
import { Erro, corpoJson, json, respostaErro } from '../../nucleo/util.js';
import { aprovar, lerPedido } from '../../nucleo/oauth.js';
import { resumoRedes } from '../../plataformas/index.js';
import { desligarConexao, iniciarConexao } from '../../plataformas/conexao.js';
import * as A from '../acoes.js';

const TIPOS_CONTEUDO = { recursos: 'recursos', artigos: 'artigos' };
const tipoConteudo = (x) => {
  const t = TIPOS_CONTEUDO[x.params.tipo];
  if (!t) throw new Erro(404, 'Tipo de conteúdo desconhecido (use recursos ou artigos).');
  return t;
};
const LISTA = {
  recursos: 'id,slug,titulo,resumo,status,tipo,categoria_id,capa_url,downloads,destaque,publicado_em,atualizado_em,criado_em',
  artigos: 'id,slug,titulo,resumo,status,categoria_id,capa_url,destaque,publicado_em,atualizado_em,criado_em',
  pecas: 'id,rede,formato,titulo,legenda,status,agendado_para,publicado_em,url_publicada,erro,tentativas,origem_tipo,origem_id,slides,criado_em,atualizado_em',
};

const usuarioPublico = (u) => ({ id: u.id, nome: u.nome, email: u.email, papel: u.papel, nome_papel: NOME_PAPEL[u.papel] || u.papel });
const lista = async (x, tabela, extra = {}) => {
  const p = pagina(x, extra.porPagina || 30);
  const r = await A.listar(x, tabela, { status: q(x, 'status'), busca: q(x, 'busca'), rede: q(x, 'rede'), limite: p.limite, offset: p.offset, select: extra.select || '*' });
  return { itens: r.linhas, total: r.total, por_pagina: p.por_pagina };
};

// Link de acesso do Supabase (convite ou troca de senha), montado para abrir no painel sem gastar o link na prévia do WhatsApp.
async function linkDeAcesso(x, email, tipo) {
  const r = await authAdmin(x.env, '/admin/generate_link', { method: 'POST', body: JSON.stringify({ type: tipo, email }) });
  const hash = r.hashed_token || (r.properties && r.properties.hashed_token);
  if (!hash) throw new Erro(502, 'O Supabase não devolveu o link de acesso.');
  return `${x.url.origin}/admin/entrar?token=${encodeURIComponent(hash)}&tipo=${tipo === 'invite' ? 'invite' : 'recovery'}`;
}

const rotas = roteador([
  // ---------------------------------------------------------------- sessão
  ['GET', '/eu', async (x) => {
    const cfg = await db.um(x.env, 'config', { chave: 'eq.site' });
    const site = (cfg && cfg.valor) || {};
    return { usuario: usuarioPublico(x.u), permissoes: permissoes(x.u.papel), site: { nome: site.nome, dominio: site.dominio, url: x.env.SITE_URL || x.url.origin }, mcp_url: `${x.env.SITE_URL || x.url.origin}/mcp` };
  }],
  ['PATCH', '/eu', async (x) => {
    const d = await corpoJson(x.request);
    const nome = String(d.nome || '').trim().slice(0, 80);
    if (!nome) throw new Erro(400, 'Escreva o seu nome.');
    const [m] = await db.update(x.env, 'equipe', { id: `eq.${x.u.id}` }, { nome }, 'id,nome,email,papel');
    return usuarioPublico(m);
  }],
  ['GET', '/pendencias', async (x) => {
    const n = await db.rpc(x.env, 'numeros_painel');
    return { pecas_rascunho: n.pecas_rascunho, pecas_aprovadas: n.pecas_aprovadas, pecas_agendadas: n.pecas_agendadas, pecas_erro: n.pecas_erro, recursos_rascunho: n.recursos_rascunho, artigos_rascunho: n.artigos_rascunho, pautas_novas: n.pautas_novas };
  }],
  ['GET', '/inicio', async (x) => {
    const [numeros, proximas, erros, atividade, redes] = await Promise.all([
      db.rpc(x.env, 'numeros_painel'),
      db.select(x.env, 'pecas', { filtros: { status: 'eq.agendado' }, select: LISTA.pecas, ordem: 'agendado_para.asc', limite: 6 }),
      db.select(x.env, 'pecas', { filtros: { status: 'eq.erro' }, select: LISTA.pecas, ordem: 'atualizado_em.desc', limite: 5 }),
      db.select(x.env, 'auditoria', { select: 'id,quando,quem,via,acao,alvo,detalhes', ordem: 'quando.desc', limite: 10 }),
      resumoRedes(x.env),
    ]);
    return { numeros, proximas, erros, atividade, redes };
  }],

  // ---------------------------------------------------------------- conteúdo do site
  ['GET', '/categorias', (x) => db.select(x.env, 'categorias', { select: 'id,slug,nome,descricao,ordem', ordem: 'ordem.asc' })],
  ['GET', '/conteudo/:tipo', (x) => lista(x, tipoConteudo(x), { select: LISTA[tipoConteudo(x)] })],
  ['GET', '/conteudo/:tipo/:id', (x) => A.ler(x, tipoConteudo(x), x.params.id)],
  ['POST', '/conteudo/:tipo', async (x) => A.salvar(x, tipoConteudo(x), await corpoJson(x.request))],
  ['PATCH', '/conteudo/:tipo/:id', async (x) => A.salvar(x, tipoConteudo(x), await corpoJson(x.request), x.params.id)],
  ['POST', '/conteudo/:tipo/:id/publicar', (x) => A.mudarPublicacao(x, tipoConteudo(x), x.params.id, true)],
  ['POST', '/conteudo/:tipo/:id/arquivar', (x) => A.mudarPublicacao(x, tipoConteudo(x), x.params.id, false)],
  ['POST', '/arquivos', async (x) => {
    const tipo = x.request.headers.get('content-type') || '';
    if (!tipo.includes('multipart/form-data')) throw new Erro(400, 'Envie o arquivo como formulário (multipart).');
    const f = await x.request.formData();
    const arq = f.get('arquivo');
    if (!arq || typeof arq === 'string') throw new Erro(400, 'Falta o arquivo.');
    return A.enviarArquivo(x, { bucket: String(f.get('bucket') || 'midia'), nome: arq.name || 'arquivo', corpo: await arq.arrayBuffer(), tipo: arq.type || undefined });
  }],

  // ---------------------------------------------------------------- cursos e anúncios
  ['GET', '/produtos', async (x) => (await A.listar(x, 'produtos', { limite: 100 })).linhas],
  ['POST', '/produtos', async (x) => A.salvar(x, 'produtos', await corpoJson(x.request))],
  ['PATCH', '/produtos/:id', async (x) => A.salvar(x, 'produtos', await corpoJson(x.request), x.params.id)],
  ['GET', '/landing-pages', async (x) => (await A.listar(x, 'landing_pages', { limite: 100, select: 'id,slug,titulo,produto_id,status,publicado_em,atualizado_em' })).linhas.map((l) => ({ ...l, endereco: A.endereco(x, 'landing_pages', l) }))],
  ['GET', '/landing-pages/:id', (x) => A.ler(x, 'landing_pages', x.params.id)],
  ['POST', '/landing-pages', async (x) => A.salvar(x, 'landing_pages', await corpoJson(x.request))],
  ['PATCH', '/landing-pages/:id', async (x) => A.salvar(x, 'landing_pages', await corpoJson(x.request), x.params.id)],
  ['POST', '/landing-pages/:id/publicar', (x) => A.mudarPublicacao(x, 'landing_pages', x.params.id, true)],
  ['POST', '/landing-pages/:id/arquivar', (x) => A.mudarPublicacao(x, 'landing_pages', x.params.id, false)],
  ['GET', '/anuncios', async (x) => (await A.listar(x, 'anuncios', { limite: 100 })).linhas],
  ['POST', '/anuncios', async (x) => A.salvar(x, 'anuncios', await corpoJson(x.request))],
  ['PATCH', '/anuncios/:id', async (x) => A.salvar(x, 'anuncios', await corpoJson(x.request), x.params.id)],

  // ---------------------------------------------------------------- fila das redes
  ['GET', '/pecas', (x) => lista(x, 'pecas', { select: LISTA.pecas })],
  ['GET', '/pecas/:id', async (x) => {
    const p = await A.ler(x, 'pecas', x.params.id);
    let origem = null;
    if (p.origem_id && ['recursos', 'artigos', 'produtos'].includes(`${p.origem_tipo}s`)) {
      const t = `${p.origem_tipo}s`;
      const o = await db.um(x.env, t, { id: `eq.${p.origem_id}` }, t === 'produtos' ? 'id,slug,nome' : 'id,slug,titulo');
      if (o) origem = { tipo: p.origem_tipo, id: o.id, titulo: o.titulo || o.nome, endereco: A.endereco(x, t, o) };
    }
    const rede = (await resumoRedes(x.env)).find((r) => r.id === p.rede) || null;
    return { ...p, rede_id: p.rede, origem, rede };
  }],
  ['PATCH', '/pecas/:id', async (x) => A.editarPeca(x, x.params.id, await corpoJson(x.request))],
  ['POST', '/pecas/:id/aprovar', (x) => A.mudarStatusPeca(x, x.params.id, 'aprovar')],
  ['POST', '/pecas/:id/agendar', async (x) => A.mudarStatusPeca(x, x.params.id, 'agendar', await corpoJson(x.request))],
  ['POST', '/pecas/:id/cancelar', (x) => A.mudarStatusPeca(x, x.params.id, 'cancelar')],
  ['POST', '/pecas/:id/voltar', (x) => A.mudarStatusPeca(x, x.params.id, 'voltar')],
  ['POST', '/pecas/:id/publicar-agora', (x) => A.publicarPecaAgora(x, x.params.id)],

  // ---------------------------------------------------------------- pautas
  ['GET', '/pautas', async (x) => (await A.listar(x, 'pautas', { status: q(x, 'status'), limite: 100 })).linhas],
  ['POST', '/pautas', async (x) => A.salvar(x, 'pautas', await corpoJson(x.request))],
  ['PATCH', '/pautas/:id', async (x) => A.salvar(x, 'pautas', await corpoJson(x.request), x.params.id)],

  // ---------------------------------------------------------------- redes
  ['GET', '/redes', (x) => { exigir(x.u, 'redes.ver'); return resumoRedes(x.env); }],
  ['POST', '/redes/:id/conectar', iniciarConexao],
  ['POST', '/conexoes/:id/desligar', desligarConexao],

  // ---------------------------------------------------------------- Claude
  ['GET', '/claude', async (x) => {
    exigir(x.u, 'chaves.proprias');
    const todas = x.u.papel === 'administrador';
    const filtros = { revogada_em: 'is.null', ...(todas ? {} : { equipe_id: `eq.${x.u.id}` }) };
    const linhas = await db.select(x.env, 'chaves_api', { filtros, select: 'id,nome,prefixo,papel,equipe_id,oauth_codigo,criado_em,ultimo_uso,usos,expira_em,dono:equipe(id,nome)', ordem: 'criado_em.desc', limite: 200 });
    // Conexão do app que passou mais de 90 dias sem renovar já caiu: não mostra.
    const vivas = linhas.filter((c) => !c.oauth_codigo || !c.expira_em || Date.now() - new Date(c.expira_em).getTime() < 90 * 86400_000);
    return {
      mcp_url: `${x.env.SITE_URL || x.url.origin}/mcp`,
      chaves: vivas.map(({ oauth_codigo, equipe_id: _e, ...c }) => ({ ...c, conector: !!oauth_codigo, dono: c.dono || null })),
    };
  }],
  ['POST', '/claude/chaves', async (x) => A.criarChave(x, await corpoJson(x.request))],
  ['POST', '/claude/chaves/:id/revogar', (x) => A.revogarChave(x, x.params.id)],
  ['GET', '/oauth/pedido', lerPedido],
  ['POST', '/oauth/aprovar', aprovar],

  // ---------------------------------------------------------------- equipe
  ['GET', '/equipe', async (x) => {
    exigir(x.u, 'equipe.ver');
    const m = await db.select(x.env, 'equipe', { select: 'id,nome,email,papel,ativo,ultimo_acesso,auth_id,criado_em', ordem: 'nome.asc' });
    return m.map(({ auth_id, ...r }) => ({ ...r, nome_papel: NOME_PAPEL[r.papel], convite_pendente: !auth_id }));
  }],
  ['GET', '/equipe/papeis', () => PAPEIS.map((p) => ({ id: p, nome: NOME_PAPEL[p], descricao: DESCRICAO_PAPEL[p] }))],
  ['POST', '/equipe', async (x) => {
    exigir(x.u, 'equipe.editar');
    const d = await corpoJson(x.request);
    const email = String(d.email || '').trim().toLowerCase();
    const nome = String(d.nome || '').trim().slice(0, 80);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Erro(400, 'E-mail inválido.');
    if (!nome) throw new Erro(400, 'Escreva o nome da pessoa.');
    if (!PAPEIS.includes(d.papel)) throw new Erro(400, 'Escolha o cargo.');
    const [membro] = await db.insert(x.env, 'equipe', { email, nome, papel: d.papel }, { select: 'id,nome,email,papel,ativo' });
    let link;
    try {
      link = await linkDeAcesso(x, email, 'invite');
    } catch (e) {
      // Já tem login no Supabase (foi da equipe antes): manda um link de troca de senha.
      link = await linkDeAcesso(x, email, 'recovery');
    }
    await auditar(x.env, x.u, 'equipe.convidar', `equipe:${membro.id}`, { email, papel: d.papel });
    return { membro: { ...membro, nome_papel: NOME_PAPEL[membro.papel], convite_pendente: true }, link };
  }],
  ['PATCH', '/equipe/:id', async (x) => {
    exigir(x.u, 'equipe.editar');
    const d = await corpoJson(x.request);
    const dados = {};
    if (d.nome !== undefined) dados.nome = String(d.nome).trim().slice(0, 80);
    if (d.papel !== undefined) { if (!PAPEIS.includes(d.papel)) throw new Erro(400, 'Cargo inválido.'); dados.papel = d.papel; }
    if (d.ativo !== undefined) dados.ativo = !!d.ativo;
    if (x.params.id === x.u.id && (dados.papel && dados.papel !== x.u.papel || dados.ativo === false)) throw new Erro(403, 'Você não pode mudar o próprio cargo nem se desativar. Peça a outro administrador.');
    const [m] = await db.update(x.env, 'equipe', { id: `eq.${x.params.id}` }, dados, 'id,nome,email,papel,ativo,ultimo_acesso,auth_id');
    if (!m) throw new Erro(404, 'Pessoa não encontrada.');
    // Desativou: as chaves e conexões da pessoa caem junto.
    if (dados.ativo === false) await db.update(x.env, 'chaves_api', { equipe_id: `eq.${m.id}`, revogada_em: 'is.null' }, { revogada_em: new Date().toISOString() }, 'id');
    await auditar(x.env, x.u, 'equipe.editar', `equipe:${m.id}`, dados);
    const { auth_id, ...r } = m;
    return { ...r, nome_papel: NOME_PAPEL[r.papel], convite_pendente: !auth_id };
  }],
  ['POST', '/equipe/:id/link', async (x) => {
    exigir(x.u, 'equipe.editar');
    const m = await db.um(x.env, 'equipe', { id: `eq.${x.params.id}` }, 'id,email,auth_id,ativo');
    if (!m) throw new Erro(404, 'Pessoa não encontrada.');
    if (!m.ativo) throw new Erro(409, 'Ative a pessoa antes de gerar um link.');
    const link = await linkDeAcesso(x, m.email, m.auth_id ? 'recovery' : 'invite').catch(() => linkDeAcesso(x, m.email, 'recovery'));
    await auditar(x.env, x.u, 'equipe.link', `equipe:${m.id}`);
    return { link };
  }],

  // ---------------------------------------------------------------- site e histórico
  ['GET', '/config', async (x) => {
    exigir(x.u, 'config.editar');
    const linhas = await db.select(x.env, 'config', { filtros: { chave: 'in.(site,adsense)' } });
    return Object.fromEntries(linhas.map((l) => [l.chave, l.valor]));
  }],
  ['PATCH', '/config/:chave', async (x) => {
    exigir(x.u, 'config.editar');
    if (!['site', 'adsense'].includes(x.params.chave)) throw new Erro(404, 'Configuração desconhecida.');
    const d = await corpoJson(x.request);
    if (!d.valor || typeof d.valor !== 'object') throw new Erro(400, 'Mande { valor: {...} }.');
    if (x.params.chave === 'adsense' && d.valor.cliente && !/^ca-pub-\d{10,20}$/.test(d.valor.cliente)) throw new Erro(400, 'O código do AdSense tem o formato ca-pub-0000000000000000.');
    const atual = await db.um(x.env, 'config', { chave: `eq.${x.params.chave}` });
    await db.insert(x.env, 'config', { chave: x.params.chave, valor: { ...((atual && atual.valor) || {}), ...d.valor } }, { upsert: true, conflito: 'chave', select: 'chave' });
    await auditar(x.env, x.u, 'config.editar', `config:${x.params.chave}`, { campos: Object.keys(d.valor) });
    return { ok: true };
  }],
  ['GET', '/historico', async (x) => {
    exigir(x.u, 'historico.ver');
    const p = pagina(x, 50);
    const r = await db.select(x.env, 'auditoria', { select: 'id,quando,quem,via,acao,alvo,detalhes', ordem: 'quando.desc', limite: p.limite, offset: p.offset, contar: true });
    return { itens: r.linhas, total: r.total, por_pagina: p.por_pagina };
  }],
]);

export async function apiPainel(request, env, ctx, url) {
  try {
    const u = await quemPede(request, env, ctx);
    exigir(u, 'painel.ver');
    const x = { env, ctx, url, request, u };
    const r = await rotas(request.method, url.pathname.slice('/api/admin'.length) || '/', x);
    return json(r);
  } catch (e) {
    return respostaErro(e);
  }
}
