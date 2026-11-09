// API do app do aluno (curso.agenciasetup.com.br/api/aluno). Só o próprio aluno vê o que é dele.
// Acesso: matrícula ativa no curso (ou alguém da equipe, que vê tudo para conferir). Módulo com liberação programada fica fechado até a data.
import { db } from '../../nucleo/db.js';
import { roteador, q } from '../../nucleo/rota.js';
import { Erro, corpoJson, json, respostaErro } from '../../nucleo/util.js';
import { alunoPede, emailValido, garantirAluno, linkDeEntrada, normalEmail } from '../alunos.js';
import { emailCodigo, enviarEmail } from '../emails.js';
import { arvore, continuarDe, cursoPorSlug, cursosDoAluno } from '../acesso.js';
import { comprasDoAluno, comprovanteCompra, dadosDoAluno, pagarCompra, pedirReembolso, salvarDadosDoAluno, usoAntesDoReembolso } from '../vendas.js';
import * as T from '../turma.js';
import * as Tutor from '../tutor.js';
import { depoisDeConcluir, meusCertificados, pedirCertificado } from '../certificados.js';
import { configConquista, conquistaParaTela, diaDaConquista, idsDoBonus } from '../conquista.js';
import { ganharXP, marcarDia, meuJogo, nivel, rankingDe } from '../jogo.js';
import { OBJETIVOS, camposDoPerfil, enviarFoto } from '../perfil.js';
import * as Com from '../comunidade.js';
import { avisosParaMim, contarNaoLidas, interagirAviso, lerNotificacoes, minhasNotificacoes } from '../comunicacao.js';
import { etiquetaDoVideo, ofertaPeloTema, ofertasAbertas } from '../vitrine.js';
import { convidarParaVaga, minhaIndicacao, minhasVagas } from '../pos-venda.js';
import { trilhaDoAluno } from '../acoes-cursos.js';
import { avisarSistemas, pessoa } from '../plataforma.js';
import { videoBunny } from '../bunny.js';
import { cursosComMarca, marcaDoPedido, marcaPorHost } from '../marcas.js';
import { estadoDaAjudante, perguntarAjudante } from '../tutor-leitura.js';
import { emIngles } from './aluno-en.js';

const PUBLICO = 'id,email,nome,foto_url,instagram,bio,area,cidade,links,usuario,objetivo,aulas_semana,boas_vindas_em,perfil_publico,no_ranking,xp,moldura,sequencia';
const hojeSP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

// O certificado de um curso para a tela: quantas aulas faltam para o percentual e o código, se já saiu.
const certDe = (t, curso, cert) => {
  const necessarias = Math.ceil((t.total * curso.certificado_pct) / 100);
  return { necessarias, faltam: Math.max(0, necessarias - t.feitas), codigo: cert ? cert.codigo : null, emitido_em: cert ? cert.emitido_em : null };
};
const matDe = (mats, cursoId) => mats.find((m) => m.curso_id === cursoId) || null;

// Material de recompensa (depoimento) só aparece para quem já mandou o depoimento do curso.
async function arquivosVisiveis(env, aluno, cursoId, lista) {
  if (!lista.some((f) => f.recompensa)) return lista;
  const tem = aluno.equipe || (await Com.temDepoimento(env, aluno, cursoId));
  return tem ? lista : lista.filter((f) => !f.recompensa);
}

const rotas = roteador([
  // ---------------------------------------------------------------- eu e perfil
  ['GET', '/eu', async (x) => {
    const { equipe, asaas_cliente, auth_id, ultimo_dia, ...a } = x.a;
    return { ...a, equipe: !!equipe, nivel: nivel(a.xp || 0), nao_lidas: await contarNaoLidas(x.env, x.a), objetivos: OBJETIVOS };
  }],
  ['PATCH', '/eu', async (x) => {
    const dados = await camposDoPerfil(x.env, x.a, await corpoJson(x.request, 8_000));
    if (!Object.keys(dados).length) throw new Erro(400, 'Nada para salvar.');
    const [a] = await db.update(x.env, 'alunos', { id: `eq.${x.a.id}` }, dados, PUBLICO);
    return { ...a, nivel: nivel(a.xp || 0) };
  }],
  ['POST', '/eu/foto', async (x) => enviarFoto(x.env, x.a, await corpoJson(x.request, 800_000))],
  ['GET', '/jogo', (x) => meuJogo(x.env, x.a)],
  ['GET', '/ranking', async (x) => {
    const slug = q(x, 'curso');
    const curso = slug ? await cursoPorSlug(x.env, slug, x.a) : null;
    return rankingDe(x.env, x.a, { periodo: q(x, 'periodo', 'semana'), curso_id: curso ? curso.id : x.a.escopo && x.a.escopo !== 'setup' ? x.a.escopo.curso_id : null });
  }],
  ['GET', '/certificados', (x) => meusCertificados(x.env, x.a)],

  // ---------------------------------------------------------------- início
  ['GET', '/inicio', async (x) => {
    const { ids, mats, inicioDe } = await cursosDoAluno(x.env, x.a);
    const [cursos, cfgConquista, certs] = await Promise.all([
      ids.length ? db.select(x.env, 'cursos', { filtros: { id: `in.(${ids.join(',')})` }, select: 'id,slug,titulo,subtitulo,capa_url,cor,certificado_pct,status', ordem: 'ordem.asc' }) : [],
      configConquista(x.env),
      ids.length ? db.select(x.env, 'certificados', { filtros: { aluno_id: `eq.${x.a.id}` }, select: 'curso_id,codigo,emitido_em' }) : [],
    ]);
    const resumo = [];
    let continuar = null, proximas = [], conquista = null;
    for (const c of cursos.slice(0, 4)) {
      const t = await arvore(x.env, c, x.a, inicioDe(c.id));
      resumo.push({ ...c, total: t.total, feitas: t.feitas, pct: t.pct });
      // A barra dos 7 dias: a do curso que tem o bônus; senão, a do primeiro curso.
      const cq = conquistaParaTela(cfgConquista, matDe(mats, c.id), x.a.equipe, c, certDe(t, c, certs.find((k) => k.curso_id === c.id)));
      if (cq && (!conquista || (cq.bonus && !conquista.bonus))) conquista = cq;
      if (!continuar) {
        const k = continuarDe(t.ordenadas);
        if (k) {
          continuar = { ...k, curso: { slug: c.slug, titulo: c.titulo } };
          const i = t.ordenadas.findIndex((a) => a.id === k.id);
          proximas = t.ordenadas.slice(i, i + 8).map((a) => ({ ...a, curso: c.slug }));
        }
      }
    }
    // Para conhecer: cursos publicados que a pessoa não tem, com a oferta aberta (se houver).
    // Curso com marca própria (ex.: Dúvidas da Fé) não aparece na vitrine da Setup: ele se vende no endereço dele.
    // No endereço de um curso com marca (ex.: o curso em inglês), a vitrine dos cursos da Setup (em português) não aparece.
    const outros = x.a.escopo !== 'setup' ? [] : await db.select(x.env, 'cursos', { filtros: { status: 'eq.publicado', marca: 'is.null', ...(ids.length ? { id: `not.in.(${ids.join(',')})` } : {}) }, select: 'id,slug,titulo,subtitulo,capa_url,cor', ordem: 'ordem.asc', limite: 12 });
    let conhecer = outros;
    if (outros.length) {
      const acessos = await db.select(x.env, 'produto_acessos', { filtros: { curso_id: `in.(${outros.map((c) => c.id).join(',')})` }, select: 'curso_id,produto:produtos(id,ofertas(slug,preco_centavos,ativa))' });
      conhecer = outros.map((c) => {
        const ofs = acessos.filter((a) => a.curso_id === c.id).flatMap((a) => (a.produto && a.produto.ofertas) || []).filter((o) => o.ativa);
        const o = ofs.sort((p, r) => p.preco_centavos - r.preco_centavos)[0];
        return { ...c, oferta: o ? { slug: o.slug, preco_centavos: o.preco_centavos } : null };
      });
    }
    // Curso com marca própria que a pessoa tem (ex.: Dúvidas da Fé): no app da Setup, só o botão para o app dele.
    const marcas = x.a.escopo === 'setup' ? await cursosComMarca(x.env) : new Map();
    const outrosApps = mats.map((m) => marcas.get(m.curso_id)).filter(Boolean).map((k) => ({ nome: k.nome, titulo: k.curso.titulo, capa_url: k.curso.capa_url, url: k.url }));
    const bonusIds = (cfgConquista.bonus && cfgConquista.bonus.arquivo_ids) || [];
    const [materiais, avisos, mural, ranking, desafios, trilha] = await Promise.all([
      // O bônus dos 7 dias não entra aqui: ele tem a barra dele.
      ids.length ? db.select(x.env, 'arquivos', { filtros: { curso_id: `in.(${ids.join(',')})`, recompensa: 'is.false', ...(bonusIds.length ? { id: `not.in.(${bonusIds.join(',')})` } : {}) }, select: 'id,nome,tipo,o_que,tempo,downloads,aula_id', ordem: 'downloads.desc', limite: 8 }) : [],
      avisosParaMim(x.env, x.a, { cursos: resumo }),
      Com.mural(x.env, x.a, 1).then((m) => m.itens.slice(0, 10)).catch(() => []),
      // No endereço de um curso com marca, o ranking é só da turma dele.
      rankingDe(x.env, x.a, { periodo: 'semana', curso_id: x.a.escopo && x.a.escopo !== 'setup' ? x.a.escopo.curso_id : null }).catch(() => null),
      Com.listarDesafios(x.env, x.a).then((l) => l.filter((d) => d.status === 'aberto')).catch(() => []),
      trilhaDoAluno(x.env, x.a).catch(() => null),
    ]);
    return { cursos: resumo, outros_apps: outrosApps, continuar, proximas, conquista, conhecer, materiais, avisos, mural, ranking, desafios, trilha, sequencia: x.a.sequencia || 0, nivel: nivel(x.a.xp || 0), boas_vindas: !x.a.boas_vindas_em };
  }],

  // ---------------------------------------------------------------- curso
  ['GET', '/cursos/:slug', async (x) => {
    const c = await cursoPorSlug(x.env, x.params.slug, x.a);
    const { ids, mats, inicioDe } = await cursosDoAluno(x.env, x.a);
    if (!ids.includes(c.id)) {
      // Curso com marca própria aberto no app da Setup (link antigo, aviso): mostra o caminho para o app dele.
      const daMarca = x.a.escopo === 'setup' ? (await cursosComMarca(x.env)).get(c.id) : null;
      if (daMarca) throw new Erro(403, `Este curso abre no app dele, o ${daMarca.nome}.`, { codigo: 'outro-app', url: daMarca.url, nome: daMarca.nome });
      const acessos = await db.select(x.env, 'produto_acessos', { filtros: { curso_id: `eq.${c.id}` }, select: 'produto:produtos(ofertas(slug,preco_centavos,ativa))' });
      const oferta = acessos.flatMap((a) => (a.produto && a.produto.ofertas) || []).find((o) => o.ativa) || null;
      throw new Erro(403, 'Você ainda não tem este curso.', { codigo: 'sem-matricula', oferta });
    }
    const t = await arvore(x.env, c, x.a, inicioDe(c.id));
    const [todos, cert, nota, avisos, cfgConquista] = await Promise.all([
      db.select(x.env, 'arquivos', { filtros: { curso_id: `eq.${c.id}` }, select: 'id,nome,tipo,o_que,quando,como,tempo,previa,versao,atualizado_em,aula_id,origem,link,recompensa', ordem: 'ordem.asc' }),
      db.um(x.env, 'certificados', { aluno_id: `eq.${x.a.id}`, curso_id: `eq.${c.id}` }, 'codigo,emitido_em'),
      db.um(x.env, 'avaliacoes_curso', { aluno_id: `eq.${x.a.id}`, curso_id: `eq.${c.id}` }, 'nota,texto'),
      avisosParaMim(x.env, x.a, { cursos: [{ id: c.id, pct: t.pct, feitas: t.feitas, total: t.total }], curso_id: c.id }),
      configConquista(x.env),
    ]);
    const certificado = certDe(t, c, cert);
    const conquista = conquistaParaTela(cfgConquista, matDe(mats, c.id), x.a.equipe, c, certificado);
    const bonus = idsDoBonus(cfgConquista, c.id);
    const fechado = !!(conquista && !conquista.liberado);
    const arquivos = (await arquivosVisiveis(x.env, x.a, c.id, todos)).map(({ link, ...f }) => ({ ...f, drive: f.origem === 'drive', ...(bonus.includes(f.id) ? { bonus: true, bloqueado: fechado, libera_dia: conquista ? conquista.dias : null } : {}) }));
    const secoes = t.secoes.map((s) => ({ ...s, modulos: t.modulos.filter((m) => m.secao_id === s.id) }));
    const soltos = t.modulos.filter((m) => !m.secao_id);
    if (soltos.length) secoes.push({ id: null, titulo: '', ordem: 999, modulos: soltos });
    return {
      curso: c, secoes, total: t.total, feitas: t.feitas, pct: t.pct, continuar: continuarDe(t.ordenadas), arquivos, avisos, minha_nota: nota,
      certificado: { ...certificado, espera: fechado }, conquista,
      depoimento: await Com.estadoDepoimento(x.env, x.a, c, t.pct),
    };
  }],
  // "Solicitar certificado": a partir do dia 7 (conquista) e com o percentual de aulas do curso. Trava aqui e na tela.
  ['POST', '/cursos/:slug/certificado', async (x) => {
    const c = await cursoPorSlug(x.env, x.params.slug, x.a);
    const { ids } = await cursosDoAluno(x.env, x.a);
    if (!ids.includes(c.id)) throw new Erro(403, 'Você ainda não tem este curso.', { codigo: 'sem-matricula' });
    return pedirCertificado(x.env, x.a, c);
  }],
  // A ajudante de IA do curso de leitura (lib/tutor-leitura.js): pergunta escrita e/ou print.
  ['GET', '/cursos/:slug/ajudante', (x) => estadoDaAjudante(x.env, x.a, x.params.slug)],
  ['POST', '/cursos/:slug/ajudante', async (x) => perguntarAjudante(x.env, x.a, x.params.slug, await corpoJson(x.request, 2_500_000))],
  ['GET', '/cursos/:slug/anotacoes', (x) => T.anotacoesDoCurso(x.env, x.a, x.params.slug)],
  ['POST', '/cursos/:slug/avaliar', async (x) => T.avaliarCurso(x.env, x.a, x.params.slug, await corpoJson(x.request, 3_000))],
  ['POST', '/cursos/:slug/depoimento', async (x) => Com.enviarDepoimento(x.env, x.a, x.params.slug, await corpoJson(x.request, 5_000))],
  ['POST', '/cursos/:slug/resultado', async (x) => Com.salvarResultado(x.env, x.a, x.params.slug, await corpoJson(x.request, 2_000))],

  // ---------------------------------------------------------------- aula
  ['GET', '/aulas/:id', async (x) => {
    const a = await db.um(x.env, 'aulas', { id: `eq.${x.params.id}` }, 'id,curso_id,modulo_id,codigo,titulo,descricao,video_panda,video_bunny,duracao_s,capa_url,gratis,abertura_fim_s,final_inicio_s,marcadores,pausas,resumo,faca_agora,tags,status,conteudo_atualizado_em,tipo,corpo');
    if (!a || (a.status !== 'publicado' && !x.a.equipe)) throw new Erro(404, 'Aula não encontrada.');
    const { ids, mats, inicioDe } = await cursosDoAluno(x.env, x.a);
    if (!ids.includes(a.curso_id) && !a.gratis) throw new Erro(403, 'Você ainda não tem este curso.', { codigo: 'sem-matricula' });
    const curso = await db.um(x.env, 'cursos', { id: `eq.${a.curso_id}` }, 'id,slug,titulo,certificado_pct,status,tags');
    const t = await arvore(x.env, curso, x.a, inicioDe(curso.id));
    const i = t.ordenadas.findIndex((o) => o.id === a.id);
    const atual = t.ordenadas[i];
    if (atual && !atual.liberada) throw new Erro(403, 'Esta aula ainda não foi liberada.', { codigo: 'bloqueada' });
    const modulo = t.modulos.find((m) => m.id === a.modulo_id);
    const [doCurso, prog, avaliacao, ncom, tema, complemento, cfgConquista, cert] = await Promise.all([
      db.select(x.env, 'arquivos', { filtros: { curso_id: `eq.${a.curso_id}` }, select: 'id,aula_id,nome,tipo,o_que,quando,como,tempo,previa,versao,atualizado_em,origem,recompensa', ordem: 'ordem.asc' }),
      db.um(x.env, 'progresso', { aluno_id: `eq.${x.a.id}`, aula_id: `eq.${a.id}` }, 'posicao_s,assistido_s,passos,concluida_em,atualizado_em'),
      db.um(x.env, 'avaliacoes_aula', { aluno_id: `eq.${x.a.id}`, aula_id: `eq.${a.id}` }, 'util'),
      db.select(x.env, 'comentarios', { filtros: { aula_id: `eq.${a.id}`, status: 'eq.publicado' }, select: 'id', limite: 1, contar: true }).then((r) => r.total),
      ofertaPeloTema(x.env, ids, [...(a.tags || []), ...(curso.tags || [])], x.a.escopo).catch(() => null),
      // A etiqueta do vídeo olha só a matrícula de verdade: a equipe também vê o "Aprender" quando não tem o curso.
      etiquetaDoVideo(x.env, curso, x.a, mats.map((m) => m.curso_id)).catch(() => null),
      configConquista(x.env),
      db.um(x.env, 'certificados', { aluno_id: `eq.${x.a.id}`, curso_id: `eq.${curso.id}` }, 'codigo,emitido_em'),
    ]);
    // A faixa fina dos 7 dias em cima da aula (só para quem tem o curso).
    const conquista = ids.includes(curso.id) ? conquistaParaTela(cfgConquista, matDe(mats, curso.id), x.a.equipe, curso, certDe(t, curso, cert)) : null;
    // Uma oferta por tela: se a etiqueta já oferece o produto, o cartão "Quer ir além?" não repete.
    const oferta = tema && complemento && tema.id === complemento.produto_id ? null : tema;
    const visiveis = await arquivosVisiveis(x.env, x.a, a.curso_id, doCurso);
    const arquivos = visiveis.filter((f) => f.aula_id === a.id).map((f) => ({ ...f, drive: f.origem === 'drive' }));
    // O "Faça agora" cita arquivos do kit pelo nome ("baixar:03-meu-estilo.md"): vai a lista de nomes do curso.
    const kit = visiveis.map((f) => ({ id: f.id, nome: f.nome }));
    let video = { tipo: 'nenhum' };
    if (a.video_bunny && x.env.BUNNY_BIBLIOTECA) video = await videoBunny(x.env, a.video_bunny);
    else if (a.video_panda && x.env.PANDA_BIBLIOTECA) video = { tipo: 'panda', biblioteca: x.env.PANDA_BIBLIOTECA, id: a.video_panda };
    else if (x.env.AMBIENTE === 'local' && x.env.DEV_VIDEOS && a.tipo !== 'leitura') video = { tipo: 'arquivo', url: `${x.env.DEV_VIDEOS.replace(/\/+$/, '')}/aula-${a.codigo}.mp4` };
    // Curso vivo: a aula mudou depois que a pessoa assistiu.
    const mudou = !!(a.conteudo_atualizado_em && prog && prog.concluida_em && new Date(a.conteudo_atualizado_em) > new Date(prog.concluida_em));
    const ia = x.env.__ia || {};
    return {
      aula: { ...a, numero: i + 1 }, video, arquivos, kit, progresso: prog || { posicao_s: 0, assistido_s: 0, passos: [], concluida_em: null },
      curso: { slug: curso.slug, titulo: curso.titulo, total: t.total, feitas: t.feitas },
      modulo: modulo ? { numero: modulo.numero, titulo: modulo.titulo, aulas: modulo.aulas } : null,
      anterior: t.ordenadas[i - 1] ? { id: t.ordenadas[i - 1].id, codigo: t.ordenadas[i - 1].codigo, titulo: t.ordenadas[i - 1].titulo } : null,
      proxima: t.ordenadas[i + 1] ? { id: t.ordenadas[i + 1].id, codigo: t.ordenadas[i + 1].codigo, titulo: t.ordenadas[i + 1].titulo, liberada: t.ordenadas[i + 1].liberada } : null,
      avaliacao: avaliacao ? avaliacao.util : null, comentarios: ncom, oferta, complemento, mudou, conquista,
      tutor: { ligado: !!x.env.ANTHROPIC_CHAVE && ia.ativo !== false },
      fim_modulo: !!(modulo && modulo.aulas.length && modulo.aulas[modulo.aulas.length - 1].id === a.id),
    };
  }],

  ['POST', '/aulas/:id/progresso', async (x) => {
    const d = await corpoJson(x.request, 2_000);
    const a = await db.um(x.env, 'aulas', { id: `eq.${x.params.id}` }, 'id,curso_id,modulo_id,duracao_s');
    if (!a) throw new Erro(404, 'Aula não encontrada.');
    const { ids } = await cursosDoAluno(x.env, x.a);
    if (!ids.includes(a.curso_id)) throw new Erro(403, 'Você ainda não tem este curso.');
    const lim = (n) => Math.max(0, Math.min(Math.round(Number(n) || 0), (a.duracao_s || 7200) + 5));
    const assistido = lim(d.assistido);
    // Conclui quando a pessoa pede ou quando assistiu 90% do vídeo de verdade.
    const pelaTela = !!(a.duracao_s && assistido >= a.duracao_s * 0.9);
    const antes = await db.um(x.env, 'progresso', { aluno_id: `eq.${x.a.id}`, aula_id: `eq.${a.id}` }, 'concluida_em');
    const r = await db.rpc(x.env, 'salvar_progresso', { p_aluno: x.a.id, p_aula: a.id, p_posicao: lim(d.posicao), p_assistido: assistido, p_concluir: !!d.concluir || pelaTela });
    if (x.a.ultimo_dia !== hojeSP()) await marcarDia(x.env, x.a.id);
    let certificado = null;
    // XP só por ver de verdade (90% tocado); o botão "Concluir" marca a aula, mas não dá os pontos de assistir.
    if (pelaTela) await ganharXP(x.env, x.a.id, 'aula', `aula:${a.id}`, { curso_id: a.curso_id });
    if (r.concluida_em && !(antes && antes.concluida_em)) {
      await avisarSistemas(x.env, 'aula.concluida', { aluno: pessoa(x.a), aula: { id: a.id }, curso_id: a.curso_id });
      certificado = await depoisDeConcluir(x.env, x.a, a);
    }
    return { posicao_s: r.posicao_s, assistido_s: r.assistido_s, concluida: !!r.concluida_em, certificado };
  }],
  ['POST', '/aulas/:id/passos', async (x) => {
    const d = await corpoJson(x.request, 2_000);
    const passos = (Array.isArray(d.passos) ? d.passos : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < 30).slice(0, 30);
    const a = await db.um(x.env, 'aulas', { id: `eq.${x.params.id}` }, 'id,curso_id');
    if (!a) throw new Erro(404, 'Aula não encontrada.');
    const { ids } = await cursosDoAluno(x.env, x.a);
    if (!ids.includes(a.curso_id)) throw new Erro(403, 'Você ainda não tem este curso.');
    const antes = await db.um(x.env, 'progresso', { aluno_id: `eq.${x.a.id}`, aula_id: `eq.${a.id}` }, 'passos');
    await db.insert(x.env, 'progresso', { aluno_id: x.a.id, aula_id: a.id, passos: [...new Set(passos)], atualizado_em: new Date().toISOString() }, { upsert: true, conflito: 'aluno_id,aula_id', select: 'aula_id' });
    // XP só pelos passos novos (a ref no banco garante uma vez por passo); os selos são conferidos no último.
    const novos = passos.filter((n) => !((antes && antes.passos) || []).includes(n)).slice(0, 5);
    for (const [k, n] of novos.entries()) await ganharXP(x.env, x.a.id, 'passo', `passo:${a.id}:${n}`, { curso_id: a.curso_id, selos: k === novos.length - 1 });
    if (x.a.ultimo_dia !== hojeSP()) await marcarDia(x.env, x.a.id);
    return { passos };
  }],
  ['POST', '/aulas/:id/avaliar', async (x) => T.avaliarAula(x.env, x.a, x.params.id, await corpoJson(x.request, 2_000))],

  // Comentários (com minuto), curtidas e "resolveu minha dúvida".
  ['GET', '/aulas/:id/comentarios', (x) => T.listarComentarios(x.env, x.a, x.params.id)],
  ['POST', '/aulas/:id/comentarios', async (x) => T.comentar(x.env, x.a, x.params.id, await corpoJson(x.request, 6_000))],
  ['POST', '/comentarios/:id/reagir', async (x) => T.reagir(x.env, x.a, x.params.id, await corpoJson(x.request, 500))],
  ['POST', '/comentarios/:id/apagar', (x) => T.apagarComentario(x.env, x.a, x.params.id)],
  // Anotações do aluno presas ao minuto.
  ['GET', '/aulas/:id/anotacoes', (x) => T.listarAnotacoes(x.env, x.a, x.params.id)],
  ['POST', '/aulas/:id/anotacoes', async (x) => T.anotar(x.env, x.a, x.params.id, await corpoJson(x.request, 6_000))],
  ['PATCH', '/anotacoes/:id', async (x) => T.editarAnotacao(x.env, x.a, x.params.id, await corpoJson(x.request, 6_000))],
  ['POST', '/anotacoes/:id/apagar', (x) => T.apagarAnotacao(x.env, x.a, x.params.id)],
  // Tutor de IA (texto e print) e a dúvida para a equipe.
  ['GET', '/aulas/:id/tutor', (x) => Tutor.conversaDaAula(x.env, x.a, x.params.id)],
  ['POST', '/aulas/:id/tutor', async (x) => Tutor.perguntar(x.env, x.a, x.params.id, await corpoJson(x.request, 3_200_000))],
  ['POST', '/aulas/:id/duvida', async (x) => Tutor.duvidaParaEquipe(x.env, x.a, x.params.id, await corpoJson(x.request, 6_000))],
  ['POST', '/tutor/:id/avaliar', async (x) => Tutor.avaliarResposta(x.env, x.a, x.params.id, (await corpoJson(x.request, 300)).util)],
  ['POST', '/tutor/conversas/:id/equipe', (x) => Tutor.enviarParaEquipe(x.env, x.a, x.params.id)],

  ['GET', '/arquivos/:id', async (x) => {
    const f = await db.um(x.env, 'arquivos', { id: `eq.${x.params.id}` }, 'id,curso_id,nome,origem,caminho,link,recompensa');
    if (!f) throw new Erro(404, 'Arquivo não encontrado.');
    const { ids } = await cursosDoAluno(x.env, x.a);
    if (!ids.includes(f.curso_id)) throw new Erro(403, 'Você ainda não tem este curso.');
    if (f.recompensa && !x.a.equipe && !(await Com.temDepoimento(x.env, x.a, f.curso_id))) throw new Erro(403, 'Esse material libera depois que você conta como foi o curso.');
    // O bônus dos 7 dias: fechado até o dia 7 da pessoa.
    const cfgConquista = await configConquista(x.env);
    if (idsDoBonus(cfgConquista, f.curso_id).includes(f.id)) {
      const mat = await db.um(x.env, 'matriculas', { aluno_id: `eq.${x.a.id}`, curso_id: `eq.${f.curso_id}`, status: 'eq.ativa' }, 'inicio,origem');
      const d = diaDaConquista(cfgConquista, mat, x.a.equipe);
      if (d && !d.liberado) throw new Erro(403, d.faltam === 1 ? 'Os modelos prontos liberam amanhã.' : `Os modelos prontos liberam em ${d.faltam} dias.`, { codigo: 'espera' });
    }
    x.ctx.waitUntil(db.rpc(x.env, 'contar_arquivo', { p_id: f.id }).catch(() => {}));
    // O que cada um baixou: aparece para a pessoa no pedido de reembolso.
    x.ctx.waitUntil(db.rpc(x.env, 'baixou_arquivo', { p_aluno: x.a.id, p_arquivo: f.id }).catch(() => {}));
    // Google Docs, Planilhas e Apresentações: "Fazer cópia no meu Drive" (o original fica protegido).
    if (f.origem === 'drive') return { url: f.link, copia: String(f.link || '').replace(/\/(edit|view|preview)([?#].*)?$/, '/copy') };
    if (f.origem !== 'storage') return { url: f.link };
    // Link assinado de 10 minutos: o endereço não serve para repassar.
    const r = await fetch(`${x.env.SUPABASE_URL}/storage/v1/object/sign/curso/${f.caminho.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'POST', headers: { apikey: x.env.SUPABASE_SECRET_KEY, ...(x.env.SUPABASE_SECRET_KEY.startsWith('sb_') ? {} : { Authorization: `Bearer ${x.env.SUPABASE_SECRET_KEY}` }), 'content-type': 'application/json' },
      body: JSON.stringify({ expiresIn: 600 }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.signedURL) throw new Erro(502, 'Não consegui preparar o download agora. Tente de novo.');
    return { url: `${x.env.SUPABASE_URL}/storage/v1${d.signedURL}&download=${encodeURIComponent(f.nome)}` };
  }],

  // ---------------------------------------------------------------- turma: desafios, mural e avisos
  ['GET', '/desafios', (x) => Com.listarDesafios(x.env, x.a)],
  ['GET', '/desafios/:slug', (x) => Com.lerDesafio(x.env, x.a, x.params.slug)],
  ['GET', '/mural', (x) => Com.mural(x.env, x.a, Number(q(x, 'pagina', 1)) || 1)],
  ['POST', '/entregas', async (x) => Com.entregar(x.env, x.a, await corpoJson(x.request, 3_200_000))],
  ['POST', '/entregas/:id/curtir', async (x) => Com.curtirEntrega(x.env, x.a, x.params.id, (await corpoJson(x.request, 300)).ligar)],
  ['POST', '/avisos/:id/:tipo', (x) => interagirAviso(x.env, x.a, x.params.id, x.params.tipo)],
  ['GET', '/notificacoes', (x) => minhasNotificacoes(x.env, x.a)],
  ['POST', '/notificacoes/lidas', (x) => lerNotificacoes(x.env, x.a)],
  ['GET', '/vitrine', async (x) => { const { ids } = await cursosDoAluno(x.env, x.a); return ofertasAbertas(x.env, ids, x.a.escopo); }],

  // Compras e pagamentos: ver, pagar de novo (Pix vencido, cartão recusado), trocar Pix <-> cartão, comprovante e dados de cobrança.
  ['GET', '/compras', (x) => comprasDoAluno(x.env, x.a)],
  ['POST', '/compras/:id/pagar', async (x) => pagarCompra(x.env, x.a, x.params.id, await corpoJson(x.request, 1_000).catch(() => ({})))],
  ['GET', '/compras/:id/comprovante', (x) => comprovanteCompra(x.env, x.a, x.params.id)],
  // Reembolso pelo app: primeiro o que a pessoa já usou, depois o pedido (com "concordo"). Entra na fila de 7 dias.
  ['GET', '/compras/:id/reembolso', (x) => usoAntesDoReembolso(x.env, x.a, x.params.id)],
  ['POST', '/compras/:id/reembolso', async (x) => pedirReembolso(x.env, x.a, x.params.id, await corpoJson(x.request, 2_000))],
  ['GET', '/dados', (x) => dadosDoAluno(x.env, x.a)],
  // Plano equipe (o comprador distribui as vagas) e indique um amigo.
  ['GET', '/vagas', (x) => minhasVagas(x.env, x.a)],
  ['POST', '/vagas/:id', async (x) => convidarParaVaga(x.env, x.a, x.params.id, await corpoJson(x.request, 2_000))],
  ['GET', '/indicacao', (x) => minhaIndicacao(x.env, x.a)],
  ['PATCH', '/dados', async (x) => salvarDadosDoAluno(x.env, x.a, await corpoJson(x.request, 2_000))],

  ['GET', '/busca', async (x) => {
    const termo = String(q(x, 'q', '')).trim().slice(0, 60);
    if (termo.length < 3) return { itens: [] };
    const { ids } = await cursosDoAluno(x.env, x.a);
    if (!ids.length) return { itens: [] };
    const itens = await db.rpc(x.env, 'buscar_falas', { p_cursos: ids, p_q: termo, p_limite: 20 });
    return { itens };
  }],
]);

// Rotas sem login: pedir o código de entrada e entrar direto depois de pagar.
async function semLogin(request, env, ctx, url) {
  const ip = request.headers.get('cf-connecting-ip') || 'sem-ip';
  if (url.pathname === '/api/aluno/codigo' && request.method === 'POST') {
    const d = await corpoJson(request, 2_000);
    const email = normalEmail(d.email);
    if (!emailValido(email)) throw new Erro(400, 'Confira o e-mail.');
    const ok = (await db.rpc(env, 'bater_limite', { p_chave: `codigo:${email}`, p_janela_s: 900, p_max: 5 })) && (await db.rpc(env, 'bater_limite', { p_chave: `codigo-ip:${ip}`, p_janela_s: 900, p_max: 20 }));
    if (!ok) throw new Erro(429, 'Muitos códigos pedidos. Espere 15 minutos e tente de novo.');
    // Só manda para quem é aluno (ou da equipe). A resposta é a mesma nos dois casos: ninguém descobre quem comprou.
    const a = await db.um(env, 'alunos', { email: `eq.${email}` }, 'id,email,nome,auth_id');
    const eq = a ? null : await db.um(env, 'equipe', { email: `eq.${email}`, ativo: 'is.true' }, 'id,nome');
    const aluno = a || (eq ? await garantirAluno(env, { email, nome: eq.nome }) : null);
    if (aluno) {
      const l = await linkDeEntrada(env, aluno);
      // No endereço de um curso com marca, o e-mail sai com a cara dele e o botão volta para o app dele.
      const marca = await marcaPorHost(env, url.hostname);
      const m = marca ? emailCodigo({ codigo: l.codigo, link: `${marca.url}/entrar?token=${encodeURIComponent(l.hash)}`, marca }) : emailCodigo({ codigo: l.codigo, link: l.link });
      await enviarEmail(env, { para: email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: 'codigo', ref: `aluno:${aluno.id}` });
    }
    return json({ ok: true });
  }
  if (url.pathname === '/api/aluno/entrar-pedido' && request.method === 'POST') {
    const d = await corpoJson(request, 1_000);
    if (!/^[0-9a-f-]{36}$/.test(String(d.pedido || ''))) throw new Erro(400, 'Pedido inválido.');
    const p = await db.um(env, 'pedidos', { id: `eq.${d.pedido}` }, 'id,status,pago_em,itens,aluno:alunos!pedidos_aluno_id_fkey(id,email,nome,auth_id)');
    // Vale uma vez, até 2 horas depois do pagamento. Depois disso, entra pelo e-mail.
    // Curso de leitura (marca própria, público que tem dificuldade com e-mail e navegador): o botão "Ler no celular" do
    // e-mail é este atalho, e vale por 30 dias, mais de uma vez (no máximo 10 por dia). O id do pedido é o segredo.
    const leitura = p && p.status === 'pago' ? (await marcaDoPedido(env, p.itens))?.tema === 'leitura' : false;
    const prazo = leitura ? 30 * 86400_000 : 2 * 3600_000;
    if (!p || p.status !== 'pago' || !p.pago_em || Date.now() - new Date(p.pago_em).getTime() > prazo) throw new Erro(410, 'Entre com o seu e-mail: mandamos o acesso para ele.', { codigo: 'use-email' });
    const ok = leitura
      ? await db.rpc(env, 'bater_limite', { p_chave: `entrada:${p.id}`, p_janela_s: 86400, p_max: 10 })
      : await db.rpc(env, 'bater_limite', { p_chave: `entrada:${p.id}`, p_janela_s: 7200, p_max: 1 });
    if (!ok) throw new Erro(410, leitura ? 'Muitas entradas por este botão hoje. Entre com o seu e-mail.' : 'Este atalho já foi usado. Entre com o seu e-mail.', { codigo: 'use-email' });
    const l = await linkDeEntrada(env, p.aluno);
    return json({ token: l.hash, email: p.aluno.email });
  }
  return null;
}


// Bunny Stream: o player abre só com o link assinado (token = SHA-256 de chave do token + id do vídeo + validade em
// segundos), que vale 6 horas. Sem a chave do token, o link vai sem assinatura (a biblioteca precisa estar sem a trava).
// No endereço do curso em inglês, os textos do servidor saem em inglês (lib/api/aluno-en.js); nos outros, a resposta é a de sempre.
export async function apiAluno(request, env, ctx, url) {
  return emIngles(env, url, await apiAlunoPt(request, env, ctx, url));
}

async function apiAlunoPt(request, env, ctx, url) {
  try {
    const livre = await semLogin(request, env, ctx, url);
    if (livre) return livre;
    const a = await alunoPede(request, env, ctx);
    // Cada endereço mostra só os seus cursos (acesso.js, cursosDoAluno): o da Setup sem os cursos com marca própria.
    const marca = await marcaPorHost(env, url.hostname);
    a.escopo = marca ? { curso_id: marca.curso.id, cursos: marca.cursos || [marca.curso.id], dominio: marca.dominio } : 'setup';
    const x = { env, ctx, url, request, a };
    return json(await rotas(request.method, url.pathname.slice('/api/aluno'.length) || '/', x));
  } catch (e) {
    return respostaErro(e);
  }
}
