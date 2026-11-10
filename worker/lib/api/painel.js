// API do painel (/api/admin). Contrato em docs/api-painel.md. As ações de verdade estão em ../acoes.js.
import { authAdmin, db } from '../../nucleo/db.js';
import { auditar, exigir, quemPede } from '../../nucleo/auth.js';
import { DESCRICAO_PAPEL, NOME_PAPEL, PAPEIS, permissoes, pode } from '../../nucleo/permissoes.js';
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
  recursos: 'id,slug,titulo,resumo,status,tipo,categoria_id,capa_url,downloads,destaque,publicado_em,atualizado_em,criado_em,perfil',
  artigos: 'id,slug,titulo,resumo,status,categoria_id,capa_url,destaque,tipo,assunto,consulta_alvo,publicado_em,atualizado_em,criado_em',
  pecas: 'id,rede,formato,titulo,legenda,status,agendado_para,publicado_em,url_publicada,erro,tentativas,origem_tipo,origem_id,slides,criado_em,atualizado_em,perfil',
};

const usuarioPublico = (u) => ({ id: u.id, nome: u.nome, email: u.email, papel: u.papel, nome_papel: NOME_PAPEL[u.papel] || u.papel });
const lista = async (x, tabela, extra = {}) => {
  const p = pagina(x, extra.porPagina || 30);
  const r = await A.listar(x, tabela, { status: q(x, 'status'), busca: q(x, 'busca'), rede: q(x, 'rede'), perfil: q(x, 'perfil'), limite: p.limite, offset: p.offset, select: extra.select || '*' });
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
    // O que espera a equipe na comunidade (comentários para aprovar, dúvidas, criações e depoimentos).
    const fila = pode(x.u.papel, 'comunidade.ver') ? await A.filaComunidade(x).catch(() => null) : null;
    const comunidade = fila ? fila.comentarios + fila.duvidas + fila.entregas + fila.depoimentos : 0;
    return { pecas_rascunho: n.pecas_rascunho, pecas_aprovadas: n.pecas_aprovadas, pecas_agendadas: n.pecas_agendadas, pecas_erro: n.pecas_erro, recursos_rascunho: n.recursos_rascunho, artigos_rascunho: n.artigos_rascunho, pautas_novas: n.pautas_novas, comunidade };
  }],
  ['GET', '/inicio', async (x) => {
    const [numeros, proximas, erros, atividade, redes, alta, desempenho, seguidores] = await Promise.all([
      db.rpc(x.env, 'numeros_painel'),
      db.select(x.env, 'pecas', { filtros: { status: 'eq.agendado' }, select: LISTA.pecas, ordem: 'agendado_para.asc', limite: 6 }),
      db.select(x.env, 'pecas', { filtros: { status: 'eq.erro' }, select: LISTA.pecas, ordem: 'atualizado_em.desc', limite: 5 }),
      db.select(x.env, 'auditoria', { select: 'id,quando,quem,via,acao,alvo,detalhes', ordem: 'quando.desc', limite: 10 }),
      resumoRedes(x.env),
      db.rpc(x.env, 'em_alta', { p_horas: 24, p_limite: 3 }),
      // O início mostra o perfil do Brasil (o principal); o em inglês tem a etiqueta nas peças e a troca em Resultados.
      db.rpc(x.env, 'desempenho', { p_dias: 30, p_rede: 'instagram', p_perfil: 'br' }),
      db.rpc(x.env, 'seguidores_rede', { p_rede: 'instagram', p_perfil: 'br' }),
    ]);
    // Os seguidores do início são os do Instagram (a rede principal) do Brasil, mesmo com o Facebook conectado.
    numeros.seguidores = seguidores;
    // "Último post" e "dias sem postar" também do Brasil: o perfil em inglês postando não esconde a conta parada.
    const [ultimo] = await db.select(x.env, 'posts_redes', { filtros: { perfil: 'eq.br' }, select: 'publicado_em', ordem: 'publicado_em.desc.nullslast', limite: 1 }).catch(() => []);
    if (ultimo) numeros.ultimo_post = ultimo.publicado_em;
    // O essencial do motor de engajamento: o que funcionou no mês e o que está quente agora.
    const motor = { em_alta: alta.pautas, assuntos: (alta.assuntos || []).slice(0, 5), melhores: (desempenho.top || []).slice(0, 3), medianas: desempenho.medianas, palavra_chave: desempenho.palavra_chave };
    return { numeros, proximas, erros, atividade, redes, motor };
  }],

  // ---------------------------------------------------------------- conteúdo do site
  ['GET', '/categorias', (x) => db.select(x.env, 'categorias', { select: 'id,slug,nome,descricao,ordem', ordem: 'ordem.asc' })],
  // Fase B de SEO: quem assina os artigos e as buscas-alvo já usadas (o analisador do editor avisa repetição).
  ['GET', '/autores', (x) => A.listarAutores(x)],
  // Fase C: os números do Google Search Console (tela SEO).
  ['GET', '/seo', (x) => A.verSeo(x, { site: x.url.searchParams.get('site') || undefined })],
  ['POST', '/seo/importar', async (x) => A.importarSeoAgora(x, await corpoJson(x.request))],
  ['POST', '/seo/pauta', async (x) => A.oportunidadeParaPauta(x, await corpoJson(x.request))],
  ['GET', '/conteudo/consultas', (x) => A.consultasDosArtigos(x)],
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
  ['GET', '/landing-pages', async (x) => (await A.listar(x, 'landing_pages', { limite: 100, select: 'id,slug,titulo,produto_id,status,seo,publicado_em,atualizado_em' })).linhas.map(({ seo, ...l }) => ({ ...l, na_lista: !(seo && seo.vitrine === false), endereco: A.endereco(x, 'landing_pages', l) }))],
  ['GET', '/landing-pages/:id', (x) => A.ler(x, 'landing_pages', x.params.id)],
  ['POST', '/landing-pages', async (x) => A.salvar(x, 'landing_pages', await corpoJson(x.request))],
  ['PATCH', '/landing-pages/:id', async (x) => A.salvar(x, 'landing_pages', await corpoJson(x.request), x.params.id)],
  ['POST', '/landing-pages/:id/publicar', (x) => A.mudarPublicacao(x, 'landing_pages', x.params.id, true)],
  ['POST', '/landing-pages/:id/arquivar', (x) => A.mudarPublicacao(x, 'landing_pages', x.params.id, false)],
  ['GET', '/anuncios', async (x) => (await A.listar(x, 'anuncios', { limite: 100 })).linhas],
  ['POST', '/anuncios', async (x) => A.salvar(x, 'anuncios', await corpoJson(x.request))],
  ['PATCH', '/anuncios/:id', async (x) => A.salvar(x, 'anuncios', await corpoJson(x.request), x.params.id)],

  // ---------------------------------------------------------------- fila das redes
  ['POST', '/posts', async (x) => A.criarPost(x, await corpoJson(x.request))],
  ['GET', '/agenda', (x) => A.listarAgenda(x, { de: q(x, 'de', ''), ate: q(x, 'ate', ''), perfil: q(x, 'perfil') })],
  ['GET', '/resultados', (x) => A.resultadosPosts(x, { dias: q(x, 'dias', 30), rede: q(x, 'rede', 'instagram'), perfil: q(x, 'perfil', 'br') })],
  ['GET', '/resultados/:id', (x) => A.verPost(x, x.params.id)],
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

  // ---------------------------------------------------------------- pautas e em alta
  ['GET', '/pautas', async (x) => (await A.listar(x, 'pautas', { status: q(x, 'status'), manuais: q(x, 'manuais') === '1', limite: 100 })).linhas],
  ['POST', '/pautas', async (x) => A.salvar(x, 'pautas', await corpoJson(x.request))],
  ['PATCH', '/pautas/:id', async (x) => A.salvar(x, 'pautas', await corpoJson(x.request), x.params.id)],
  ['GET', '/em-alta', (x) => A.verEmAlta(x, { horas: q(x, 'horas', 48), limite: q(x, 'limite', 40) })],
  ['POST', '/em-alta/atualizar', (x) => A.atualizarAgora(x, 'radar')],

  // ---------------------------------------------------------------- desempenho
  ['GET', '/desempenho', (x) => A.verDesempenho(x, q(x, 'dias', 30), q(x, 'rede', 'instagram'), q(x, 'perfil', 'br'))],
  ['GET', '/desempenho/posts', async (x) => {
    const p = pagina(x, 30);
    const r = await A.listarPosts(x, { ordem: q(x, 'ordem', 'recentes'), formato: q(x, 'formato'), dias: q(x, 'dias'), busca: q(x, 'busca'), rede: q(x, 'rede', 'instagram'), perfil: q(x, 'perfil', 'br'), limite: p.limite, offset: p.offset });
    return { itens: r.linhas, total: r.total, por_pagina: p.por_pagina };
  }],
  ['POST', '/desempenho/atualizar', async (x) => A.atualizarAgora(x, 'desempenho', await corpoJson(x.request).catch(() => ({})))],

  // ---------------------------------------------------------------- "Comenta X"
  ['GET', '/comenta', (x) => A.listarGatilhos(x, { perfil: q(x, 'perfil') })],
  ['POST', '/comenta', async (x) => A.salvarGatilho(x, await corpoJson(x.request))],
  ['POST', '/comenta/escrever', async (x) => A.escreverComenta(x, await corpoJson(x.request))],
  ['GET', '/comenta/ajustes', (x) => A.lerAjustesComenta(x)],
  ['PATCH', '/comenta/ajustes', async (x) => A.salvarAjustesComenta(x, await corpoJson(x.request))],
  ['POST', '/comenta/:id/nota', async (x) => A.notaComenta(x, x.params.id, (await corpoJson(x.request)).texto)],
  ['PATCH', '/comenta/:id', async (x) => A.salvarGatilho(x, await corpoJson(x.request), x.params.id)],
  ['POST', '/comenta/:id/ligar', (x) => A.ligarGatilho(x, x.params.id, true)],
  ['POST', '/comenta/:id/desligar', (x) => A.ligarGatilho(x, x.params.id, false)],

  // ---------------------------------------------------------------- oferta do funil
  ['GET', '/oferta', (x) => A.lerOferta(x, q(x, 'perfil'))],
  ['PATCH', '/oferta', async (x) => A.salvarOferta(x, await corpoJson(x.request))],

  // ---------------------------------------------------------------- área de membros: vendas, alunos, aulas, ofertas, links
  ['GET', '/vendas', async (x) => {
    const p = pagina(x, 30);
    return { ...(await A.listarVendas(x, { status: q(x, 'status'), busca: q(x, 'busca'), limite: p.limite, offset: p.offset, moeda: q(x, 'moeda'), de: q(x, 'de'), ate: q(x, 'ate'), dias: q(x, 'dias'), produto: q(x, 'produto'), canal: q(x, 'canal'), campanha: q(x, 'campanha'), conteudo: q(x, 'conteudo') })), por_pagina: p.por_pagina };
  }],
  ['GET', '/vendas/reembolsos', (x) => A.listarReembolsos(x)],
  // Avisos no celular (Web Push): os aparelhos da pessoa, ligar, escolher os tipos, testar e desligar.
  ['GET', '/avisos', (x) => A.verAvisos(x)],
  ['POST', '/avisos', async (x) => A.ligarAvisos(x, await corpoJson(x.request, 4_000))],
  ['POST', '/avisos/teste', async (x) => A.testarAvisos(x, await corpoJson(x.request, 1_000).catch(() => ({})))],
  ['PATCH', '/avisos/:id', async (x) => A.mudarAvisos(x, x.params.id, await corpoJson(x.request, 2_000))],
  ['POST', '/avisos/:id/desligar', (x) => A.desligarAvisos(x, x.params.id)],
  ['POST', '/vendas/reembolsos/:id/cancelar', (x) => A.cancelarReembolsoVenda(x, x.params.id)],
  ['POST', '/vendas/reembolsos/:id/devolver', (x) => A.devolverReembolso(x, x.params.id)],
  ['GET', '/vendas/:id', (x) => A.lerVenda(x, x.params.id)],
  ['POST', '/vendas/:id/reembolsar', async (x) => A.reembolsarVenda(x, x.params.id, await corpoJson(x.request))],
  ['POST', '/vendas/:id/reenviar', (x) => A.reenviarAcesso(x, x.params.id)],
  ['GET', '/alunos', async (x) => {
    const p = pagina(x, 30);
    return { ...(await A.listarAlunos(x, { busca: q(x, 'busca'), limite: p.limite, offset: p.offset })), por_pagina: p.por_pagina };
  }],
  ['POST', '/alunos', async (x) => A.liberarCurso(x, await corpoJson(x.request))],
  ['GET', '/alunos/:id', (x) => A.lerAluno(x, x.params.id)],
  ['GET', '/suporte', (x) => A.verSuporte(x, { dias: q(x, 'dias', 90), curso: q(x, 'curso'), etapa: q(x, 'etapa'), busca: q(x, 'busca'), so_ajuda: q(x, 'ajuda') === '1' })],
  ['POST', '/alunos/:id/link', (x) => A.linkDoAluno(x, x.params.id)],
  ['POST', '/matriculas/:id/revogar', async (x) => A.revogarMatricula(x, x.params.id, (await corpoJson(x.request).catch(() => ({}))).motivo)],
  ['GET', '/area/cursos', (x) => A.listarCursosArea(x)],
  ['POST', '/area/cursos', async (x) => A.salvarCurso(x, await corpoJson(x.request))],
  ['GET', '/area/cursos/:id', (x) => A.lerCursoParaMontar(x, x.params.id)],
  ['PATCH', '/area/cursos/:id', async (x) => A.salvarCurso(x, await corpoJson(x.request), x.params.id)],
  ['POST', '/area/cursos/:id/arquivo', async (x) => { const f = await x.request.formData(); return A.enviarArquivoDoCurso(x, x.params.id, f.get('arquivo')); }],
  ['POST', '/area/secoes', async (x) => A.salvarSecao(x, await corpoJson(x.request))],
  ['PATCH', '/area/secoes/:id', async (x) => A.salvarSecao(x, await corpoJson(x.request), x.params.id)],
  ['POST', '/area/modulos', async (x) => A.salvarModulo(x, await corpoJson(x.request))],
  ['PATCH', '/area/modulos/:id', async (x) => A.salvarModulo(x, await corpoJson(x.request), x.params.id)],
  ['POST', '/area/aulas', async (x) => A.salvarAula(x, await corpoJson(x.request, 200_000))],
  ['PUT', '/area/aulas/:id', async (x) => A.salvarAula(x, await corpoJson(x.request, 200_000), x.params.id)],
  ['POST', '/area/aulas/:id/atualizada', async (x) => A.marcarAulaAtualizada(x, x.params.id, (await corpoJson(x.request).catch(() => ({}))).nota)],
  ['POST', '/area/ordem/:tabela', async (x) => A.reordenar(x, x.params.tabela, (await corpoJson(x.request)).ids)],
  ['POST', '/area/arquivos', async (x) => A.salvarArquivo(x, await corpoJson(x.request))],
  ['PATCH', '/area/arquivos/:id', async (x) => A.salvarArquivo(x, await corpoJson(x.request), x.params.id)],
  ['POST', '/area/arquivos/:id/remover', (x) => A.removerArquivo(x, x.params.id)],
  ['GET', '/area/trilhas', (x) => A.listarTrilhas(x)],
  ['POST', '/area/trilhas', async (x) => A.salvarTrilha(x, await corpoJson(x.request))],
  ['PATCH', '/area/trilhas/:id', async (x) => A.salvarTrilha(x, await corpoJson(x.request), x.params.id)],
  ['PATCH', '/area/aulas/:id', async (x) => A.editarAula(x, x.params.id, await corpoJson(x.request))],
  ['GET', '/area/ofertas', (x) => A.listarOfertas(x)],
  ['POST', '/area/ofertas', async (x) => A.criarOferta(x, await corpoJson(x.request))],
  ['GET', '/area/ofertas/:id/bumps', (x) => A.bumpsDaOferta(x, x.params.id)],
  ['PUT', '/area/ofertas/:id/bumps', async (x) => A.salvarBumps(x, x.params.id, (await corpoJson(x.request)).bumps)],
  ['GET', '/area/produtos/:id/acessos', (x) => A.acessosDoProduto(x, x.params.id)],
  ['PUT', '/area/produtos/:id/acessos', async (x) => A.salvarAcessos(x, x.params.id, (await corpoJson(x.request)).acessos)],
  ['GET', '/area/cupons', (x) => A.listarCupons(x)],
  ['POST', '/area/cupons', async (x) => A.salvarCupom(x, await corpoJson(x.request))],
  ['PATCH', '/area/cupons/:codigo', async (x) => A.salvarCupom(x, await corpoJson(x.request), x.params.codigo)],
  ['PATCH', '/area/ofertas/:id', async (x) => A.editarOferta(x, x.params.id, await corpoJson(x.request))],
  ['GET', '/area/links', (x) => A.listarLinks(x)],
  ['POST', '/area/links', async (x) => A.criarLink(x, await corpoJson(x.request))],
  ['GET', '/area/emails', (x) => A.listarEmails(x)],
  ['GET', '/area/certificado', (x) => A.verCertificado(x)],
  ['PUT', '/area/certificado', async (x) => A.salvarCertificado(x, await corpoJson(x.request))],
  ['GET', '/area/conquista-dias', (x) => A.verConquistaDias(x)],
  ['PUT', '/area/conquista-dias', async (x) => A.salvarConquistaDias(x, await corpoJson(x.request))],
  ['POST', '/area/certificado/previa', async (x) => ({ html: await A.previaCertificado(x, await corpoJson(x.request), { story: q(x, 'formato') === 'story' }) })],
  // ---------------------------------------------------------------- comunidade e comunicação
  ['GET', '/comunidade/fila', (x) => A.filaComunidade(x)],
  ['GET', '/comunidade/comentarios', (x) => A.listarComentariosEquipe(x, { status: q(x, 'status', 'pendente'), pagina: Number(q(x, 'pagina', 1)) })],
  ['POST', '/comunidade/comentarios/:id/responder', async (x) => A.responderComentario(x, x.params.id, await corpoJson(x.request))],
  ['POST', '/comunidade/comentarios/:id/:acao', (x) => A.moderarComentario(x, x.params.id, x.params.acao)],
  ['GET', '/comunidade/duvidas', (x) => A.listarDuvidas(x, { status: q(x, 'status', 'enviada') })],
  ['POST', '/comunidade/duvidas/:id/responder', async (x) => A.responderDuvida(x, x.params.id, await corpoJson(x.request))],
  ['GET', '/comunidade/prontas', (x) => A.listarRespostasProntas(x)],
  ['POST', '/comunidade/prontas', async (x) => A.salvarRespostaPronta(x, await corpoJson(x.request))],
  ['PATCH', '/comunidade/prontas/:id', async (x) => A.salvarRespostaPronta(x, await corpoJson(x.request), x.params.id)],
  ['GET', '/comunidade/depoimentos', (x) => A.listarDepoimentos(x, { status: q(x, 'status', 'pendente') })],
  ['POST', '/comunidade/depoimentos/:id', async (x) => A.avaliarDepoimento(x, x.params.id, await corpoJson(x.request))],
  ['GET', '/comunidade/desafios', (x) => A.listarDesafiosEquipe(x)],
  ['POST', '/comunidade/desafios', async (x) => A.salvarDesafio(x, await corpoJson(x.request))],
  ['PATCH', '/comunidade/desafios/:id', async (x) => A.salvarDesafio(x, await corpoJson(x.request), x.params.id)],
  ['GET', '/comunidade/entregas', (x) => A.listarEntregas(x, { status: q(x, 'status', 'pendente') })],
  ['POST', '/comunidade/entregas/:id', async (x) => A.avaliarEntrega(x, x.params.id, await corpoJson(x.request))],
  ['GET', '/comunidade/selos', (x) => A.listarConquistas(x)],
  ['POST', '/comunidade/selos', async (x) => A.salvarConquista(x, await corpoJson(x.request))],
  ['PATCH', '/comunidade/selos/:id', async (x) => A.salvarConquista(x, await corpoJson(x.request), x.params.id)],
  ['GET', '/comunicacao/avisos', (x) => A.listarAvisos(x)],
  ['POST', '/comunicacao/avisos', async (x) => A.salvarAviso(x, await corpoJson(x.request))],
  ['PATCH', '/comunicacao/avisos/:id', async (x) => A.salvarAviso(x, await corpoJson(x.request), x.params.id)],
  ['GET', '/integracoes', (x) => A.listarIntegracoes(x)],
  ['POST', '/integracoes/:nome', async (x) => A.salvarIntegracao(x, x.params.nome, await corpoJson(x.request))],
  ['GET', '/integracoes/ia/numeros', (x) => A.numerosTutor(x)],
  ['GET', '/webhooks', (x) => A.listarWebhooks(x)],
  ['POST', '/webhooks', async (x) => A.salvarWebhook(x, await corpoJson(x.request))],
  ['PATCH', '/webhooks/:id', async (x) => A.salvarWebhook(x, await corpoJson(x.request), x.params.id)],
  ['POST', '/webhooks/:id/testar', (x) => A.testarWebhook(x, x.params.id)],
  ['GET', '/numeros', (x) => A.verNumeros(x, { dias: q(x, 'dias'), moeda: q(x, 'moeda') })],
  ['GET', '/relatorios', (x) => A.listarRelatorios(x)],
  ['POST', '/relatorios', (x) => A.gerarRelatorioAgora(x)],
  ['GET', '/recuperar', (x) => A.verRecuperacao(x, { aba: q(x, 'aba'), busca: q(x, 'busca'), limite: q(x, 'limite') })],
  ['POST', '/recuperar/:id', async (x) => A.marcarRecuperacao(x, x.params.id, await corpoJson(x.request))],
  ['GET', '/followup', (x) => A.verFollowup(x, { fase: q(x, 'fase'), interesse: q(x, 'interesse'), busca: q(x, 'busca'), perfil: q(x, 'perfil'), limite: q(x, 'limite') })],
  ['GET', '/followup/respostas', (x) => A.verRespostasFollowup(x)],
  ['POST', '/followup', async (x) => A.salvarUmFollowup(x, await corpoJson(x.request))],
  ['POST', '/followup/sincronizar', (x) => A.sincronizarFollowupAgora(x)],
  ['GET', '/colmeia', (x) => A.verColmeia(x, Object.fromEntries(x.url.searchParams))],
  ['POST', '/colmeia', async (x) => A.salvarNaColmeia(x, await corpoJson(x.request))],
  ['POST', '/colmeia/:id', async (x) => A.salvarNaColmeia(x, await corpoJson(x.request), x.params.id)],
  ['GET', '/video/virais', (x) => A.verVideosVirais(x, Object.fromEntries(x.url.searchParams))],
  ['POST', '/video/virais/:id', async (x) => A.marcarVideoViral(x, x.params.id, (await corpoJson(x.request)).status)],
  ['GET', '/video/canais', (x) => A.verCanaisDeVideo(x)],
  ['POST', '/video/canais', async (x) => A.salvarCanalDeVideo(x, await corpoJson(x.request))],
  ['POST', '/followup/atendente', async (x) => A.salvarAtendente(x, await corpoJson(x.request))],
  ['POST', '/followup/atendente/testar', async (x) => A.testarAtendente(x, await corpoJson(x.request))],
  ['POST', '/followup/:id', async (x) => A.salvarUmFollowup(x, await corpoJson(x.request), x.params.id)],
  ['POST', '/followup/:id/mandar', async (x) => A.mandarFollowupPeloSistema(x, x.params.id, (await corpoJson(x.request)).texto)],
  ['POST', '/followup/:id/responder', async (x) => A.responderDuvidaFollowup(x, x.params.id, (await corpoJson(x.request)).resposta)],
  // ---------------------------------------------------------------- escritório de IA (agentes, turnos e a mesa de propostas)
  ['GET', '/escritorio', (x) => A.verOEscritorio(x)],
  ['GET', '/escritorio/sinal', (x) => A.verSinalDeVida(x)],
  ['GET', '/escritorio/agentes/:id', (x) => A.lerAgenteDoEscritorio(x, x.params.id)],
  ['POST', '/escritorio/agentes/:id', async (x) => A.salvarAgenteDoEscritorio(x, await corpoJson(x.request), x.params.id)],
  ['POST', '/escritorio/teto', async (x) => A.salvarTetoDoEscritorio(x, (await corpoJson(x.request)).teto_dia_usd)],
  ['POST', '/escritorio/propostas/:id/decidir', async (x) => A.decidirPropostaDoEscritorio(x, x.params.id, await corpoJson(x.request))],
  ['POST', '/escritorio/propostas/:id/resultado', async (x) => A.resultadoDaProposta(x, x.params.id, await corpoJson(x.request))],
  ['GET', '/plano', (x) => A.verPlano(x)],
  ['POST', '/plano', (x) => A.gerarPlanoAgora(x)],
  ['POST', '/plano/ideias/:id', async (x) => A.marcarIdeiaDoPlano(x, x.params.id, (await corpoJson(x.request)).status)],

  ['GET', '/pagamento', (x) => A.situacaoPagamento(x)],
  ['POST', '/pagamento/chave', async (x) => A.salvarChaveAsaas(x, (await corpoJson(x.request, 2_000)).chave)],
  ['POST', '/pagamento/aviso', (x) => A.ligarAvisoAsaas(x)],
  ['POST', '/pagamento/estrangeiros', async (x) => A.ligarEstrangeiros(x, (await corpoJson(x.request, 1_000)).ligado)],

  // ---------------------------------------------------------------- redes
  ['GET', '/redes', (x) => { exigir(x.u, 'redes.ver'); return resumoRedes(x.env); }],
  ['POST', '/redes/:id/conectar', iniciarConexao],
  ['POST', '/conexoes/:id/desligar', desligarConexao],
  ['POST', '/conexoes/:id/perfil', async (x) => A.mudarPerfilConexao(x, x.params.id, (await corpoJson(x.request)).perfil)],

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
  ['GET', '/skills', (x) => A.listarSkills(x)],
  ['GET', '/skills/:nome', (x) => A.lerSkill(x, x.params.nome, { arquivo: 'tudo', pacote: true })],
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
