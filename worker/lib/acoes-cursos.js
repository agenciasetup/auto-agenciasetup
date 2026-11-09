// Montar cursos pelo painel (Fase F): curso, seções, módulos, aulas (vídeo, marcadores, pausas, "Faça agora", resumo),
// arquivos com ficha (bucket privado "curso", link ou Google Drive), "curso vivo" (aula atualizada avisa quem já viu)
// e trilhas (pedaços de vários cursos, sugeridas pelo objetivo do aluno). Cargo e auditoria em toda escrita.
import { auditar, exigir } from '../nucleo/auth.js';
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { notificar } from './jogo.js';
import { CERT_PADRAO, EXEMPLO_CERT, configCertificado, limparConfigCertificado } from './certificados.js';
import { configConquista } from './conquista.js';
import { cursoUrl } from './alunos.js';
import { paginaCertificado } from '../render/publico.js';

const UUID = /^[0-9a-f-]{36}$/;
const id = (v) => { if (!UUID.test(String(v))) throw new Erro(404, 'Não encontrado.'); return v; };
const slugDe = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const segundos = (v) => (v === '' || v === null || v === undefined ? null : Math.max(0, Math.round(Number(v) || 0)));
const pegar = (d, campos) => Object.fromEntries(campos.filter((k) => d[k] !== undefined).map((k) => [k, d[k] === '' ? null : d[k]]));

// ---------------------------------------------------------------- curso inteiro (para montar)
export async function lerCursoParaMontar(x, cursoId) {
  exigir(x.u, 'cursos.ver');
  const c = await db.um(x.env, 'cursos', { id: `eq.${id(cursoId)}` });
  if (!c) throw new Erro(404, 'Curso não encontrado.');
  const [secoes, modulos, aulas, arquivos] = await Promise.all([
    db.select(x.env, 'secoes', { filtros: { curso_id: `eq.${c.id}` }, ordem: 'ordem.asc' }),
    db.select(x.env, 'modulos', { filtros: { curso_id: `eq.${c.id}` }, ordem: 'ordem.asc' }),
    db.select(x.env, 'aulas', { filtros: { curso_id: `eq.${c.id}` }, select: 'id,modulo_id,codigo,titulo,descricao,ordem,video_panda,video_bunny,duracao_s,capa_url,previa_url,gratis,abertura_fim_s,final_inicio_s,marcadores,pausas,resumo,faca_agora,tags,status,conteudo_atualizado_em,tipo,corpo', ordem: 'ordem.asc' }),
    db.select(x.env, 'arquivos', { filtros: { curso_id: `eq.${c.id}` }, ordem: 'ordem.asc' }),
  ]);
  return { curso: c, secoes, modulos: modulos.map((m) => ({ ...m, aulas: aulas.filter((a) => a.modulo_id === m.id) })), arquivos };
}

// Marca e endereço próprios (lib/marcas.js). Só subdomínio da Agência Setup: o endereço precisa estar no Worker
// (wrangler.jsonc, routes) para abrir. Vazio tira a marca e o curso volta a ser da Setup.
function marcaValida(m) {
  if (!m || !m.dominio) return null;
  const dominio = String(m.dominio).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!/^[a-z0-9-]{2,40}\.agenciasetup\.com\.br$/.test(dominio) || /^(www|curso)\./.test(dominio)) throw new Erro(400, 'O endereço precisa ser um subdomínio da Agência Setup, como nome.agenciasetup.com.br.', { campo: 'dominio' });
  const texto = (v, n) => (v ? String(v).trim().slice(0, n) : null);
  const zap = m.whatsapp ? String(m.whatsapp).replace(/\D/g, '') : '';
  if (zap && !/^\d{12,13}$/.test(zap)) throw new Erro(400, 'WhatsApp com o 55 e o DDD, só números (ex.: 5511999999999).', { campo: 'whatsapp' });
  return {
    nome: texto(m.nome, 60), dominio, tema: m.tema === 'video' ? 'video' : 'leitura', autores: texto(m.autores, 120), whatsapp: zap || null,
    pdf_arquivo_id: m.pdf_arquivo_id && /^[0-9a-f-]{36}$/.test(m.pdf_arquivo_id) ? m.pdf_arquivo_id : null, cor: m.cor && /^#[0-9a-f]{6}$/i.test(m.cor) ? m.cor : null,
  };
}

// Aula de leitura (tipo "leitura"): o texto da dúvida, no formato do Curso-Duvidas (scripts/duvidas.mjs). Corta o que
// passar do tamanho e joga fora item vazio; a ordem dos campos é a da tela.
const LIM = { resposta: 1200, paragrafo: 2000, diga: 1200, guardar: 400, curto: 300 };
function corpoValido(c) {
  if (!c || typeof c !== 'object') return null;
  const t = (v, n) => String(v || '').trim().slice(0, n);
  const lista = (l, max, f) => (Array.isArray(l) ? l : []).slice(0, max).map(f).filter(Boolean);
  const img = c.imagem && c.imagem.url ? { url: t(c.imagem.url, 500), alt: t(c.imagem.alt, LIM.curto), legenda: t(c.imagem.legenda, LIM.curto) } : null;
  return {
    minutos: Math.max(1, Math.min(30, Math.round(Number(c.minutos) || 3))),
    resposta: t(c.resposta, LIM.resposta),
    explicacao: lista(c.explicacao, 8, (p) => t(p, LIM.paragrafo) || null),
    biblia: lista(c.biblia, 4, (v) => (v && v.texto ? { texto: t(v.texto, 800), ref: t(v.ref, 40), nota: t(v.nota, 200) || undefined } : null)),
    igreja: lista(c.igreja, 3, (v) => (v && v.texto ? { texto: t(v.texto, 800), doc: t(v.doc, 120), numero: t(v.numero, 40), url: /^https:\/\//.test(v.url || '') ? t(v.url, 400) : undefined } : null)),
    diga: t(c.diga, LIM.diga),
    e_se: lista(c.e_se, 3, (e) => (e && e.pergunta && e.resposta ? { pergunta: t(e.pergunta, LIM.curto), resposta: t(e.resposta, 1200) } : null)),
    guardar: t(c.guardar, LIM.guardar),
    imagem: img,
  };
}

export async function salvarCurso(x, d, cid) {
  exigir(x.u, 'cursos.editar');
  const dados = pegar(d, ['titulo', 'subtitulo', 'descricao', 'capa_url', 'trailer_url', 'cor', 'certificado_pct', 'tags', 'ordem', 'status']);
  if (dados.status && !['rascunho', 'publicado', 'arquivado'].includes(dados.status)) throw new Erro(400, 'Situação inválida.');
  if (dados.certificado_pct !== undefined) dados.certificado_pct = Math.max(1, Math.min(100, Math.round(Number(dados.certificado_pct) || 70)));
  if (dados.status === 'publicado') dados.publicado_em = new Date().toISOString();
  if (d.marca !== undefined) dados.marca = marcaValida(d.marca);
  if (!cid) {
    if (!d.titulo) throw new Erro(400, 'Dê um título ao curso.');
    dados.slug = slugDe(d.slug || d.titulo);
  }
  const [c] = cid ? await db.update(x.env, 'cursos', { id: `eq.${id(cid)}` }, dados, '*') : await db.insert(x.env, 'cursos', dados, { select: '*' });
  await auditar(x.env, x.u, cid ? 'curso.editar' : 'curso.criar', `curso:${c.id}`, { campos: Object.keys(dados) });
  return c;
}

export async function salvarSecao(x, d, sid) {
  exigir(x.u, 'cursos.editar');
  const dados = pegar(d, ['titulo', 'ordem']);
  if (!sid) { dados.curso_id = id(d.curso_id); if (!dados.titulo) throw new Erro(400, 'Dê um título à seção.'); }
  const [s] = sid ? await db.update(x.env, 'secoes', { id: `eq.${id(sid)}` }, dados, '*') : await db.insert(x.env, 'secoes', dados, { select: '*' });
  await auditar(x.env, x.u, sid ? 'secao.editar' : 'secao.criar', `secao:${s.id}`);
  return s;
}

export async function salvarModulo(x, d, mid) {
  exigir(x.u, 'cursos.editar');
  const dados = pegar(d, ['titulo', 'descricao', 'numero', 'ordem', 'secao_id', 'liberacao', 'liberar_dias', 'liberar_em']);
  if (dados.liberacao && !['imediata', 'dias', 'data'].includes(dados.liberacao)) throw new Erro(400, 'Liberação inválida.');
  if (!mid) {
    dados.curso_id = id(d.curso_id);
    if (!dados.titulo) throw new Erro(400, 'Dê um título ao módulo.');
    if (dados.numero === undefined || dados.numero === null) {
      const n = await db.select(x.env, 'modulos', { filtros: { curso_id: `eq.${dados.curso_id}` }, select: 'numero', ordem: 'numero.desc', limite: 1 });
      dados.numero = ((n[0] && n[0].numero) || 0) + 1;
      dados.ordem = dados.numero;
    }
  }
  const [m] = mid ? await db.update(x.env, 'modulos', { id: `eq.${id(mid)}` }, dados, '*') : await db.insert(x.env, 'modulos', dados, { select: '*' });
  await auditar(x.env, x.u, mid ? 'modulo.editar' : 'modulo.criar', `modulo:${m.id}`);
  return m;
}

// Lista de itens com tempo: marcadores [{ s, titulo, tipo?, link?, texto? }] e pausas [{ s, texto }].
const listaComTempo = (l, campos) => (Array.isArray(l) ? l : []).map((i) => ({ s: Math.max(0, Math.round(Number(i.s) || 0)), ...Object.fromEntries(campos.map((c) => [c, i[c] ? String(i[c]).slice(0, 300) : undefined]).filter(([, v]) => v !== undefined)) })).sort((a, b) => a.s - b.s).slice(0, 60);

export async function salvarAula(x, d, aid) {
  exigir(x.u, 'cursos.editar');
  const dados = pegar(d, ['codigo', 'titulo', 'descricao', 'ordem', 'modulo_id', 'video_panda', 'video_bunny', 'duracao_s', 'capa_url', 'previa_url', 'gratis', 'resumo', 'status', 'tags']);
  if (dados.status && !['rascunho', 'publicado', 'arquivado'].includes(dados.status)) throw new Erro(400, 'Situação inválida.');
  for (const k of ['abertura_fim_s', 'final_inicio_s']) if (d[k] !== undefined) dados[k] = segundos(d[k]);
  if (d.duracao_s !== undefined) dados.duracao_s = segundos(d.duracao_s);
  if (d.marcadores !== undefined) dados.marcadores = listaComTempo(d.marcadores, ['titulo', 'tipo', 'link', 'texto']);
  if (d.pausas !== undefined) dados.pausas = listaComTempo(d.pausas, ['texto']);
  if (d.faca_agora !== undefined) dados.faca_agora = (Array.isArray(d.faca_agora) ? d.faca_agora : []).slice(0, 8).map((p) => ({
    titulo: String(p.titulo || '').slice(0, 200), texto: p.texto ? String(p.texto).slice(0, 2000) : undefined, prompt: p.prompt ? String(p.prompt).slice(0, 4000) : undefined,
    acoes: (Array.isArray(p.acoes) ? p.acoes : String(p.acoes || '').split(',')).map((a) => String(a).trim()).filter(Boolean).slice(0, 6),
  })).filter((p) => p.titulo);
  for (const k of ['video_panda', 'video_bunny']) if (dados[k] !== undefined) dados[k] = dados[k] ? String(dados[k]).trim() : null;
  if (d.tipo !== undefined) dados.tipo = d.tipo === 'leitura' ? 'leitura' : 'video';
  if (d.corpo !== undefined) {
    dados.corpo = corpoValido(d.corpo);
    // A resposta rápida também vai na descrição: é o que a lista e a busca mostram.
    if (dados.corpo && dados.corpo.resposta) dados.descricao = dados.corpo.resposta;
  }
  if (!aid) {
    const m = await db.um(x.env, 'modulos', { id: `eq.${id(d.modulo_id)}` }, 'id,curso_id,numero');
    if (!m) throw new Erro(404, 'Módulo não encontrado.');
    dados.curso_id = m.curso_id;
    if (!dados.titulo) throw new Erro(400, 'Dê um título à aula.');
    const n = await db.select(x.env, 'aulas', { filtros: { modulo_id: `eq.${m.id}` }, select: 'ordem', ordem: 'ordem.desc', limite: 1 });
    const ultima = await db.select(x.env, 'aulas', { filtros: { curso_id: `eq.${m.curso_id}` }, select: 'ordem', ordem: 'ordem.desc', limite: 1 });
    const qtd = await db.select(x.env, 'aulas', { filtros: { modulo_id: `eq.${m.id}` }, select: 'id', limite: 1, contar: true });
    dados.ordem = dados.ordem ?? (((ultima[0] && ultima[0].ordem) || (n[0] && n[0].ordem) || 0) + 1);
    dados.codigo = dados.codigo || `${m.numero}.${qtd.total + 1}`;
    dados.status = dados.status || 'rascunho';
  }
  const [a] = aid ? await db.update(x.env, 'aulas', { id: `eq.${id(aid)}` }, dados, '*') : await db.insert(x.env, 'aulas', dados, { select: '*' });
  if (!a) throw new Erro(404, 'Aula não encontrada.');
  await auditar(x.env, x.u, aid ? 'aula.editar' : 'aula.criar', `aula:${a.id}`, { campos: Object.keys(dados) });
  return a;
}

// Reordena seções, módulos, aulas ou arquivos (a lista vem na ordem nova).
export async function reordenar(x, tabela, ids) {
  exigir(x.u, 'cursos.editar');
  if (!['secoes', 'modulos', 'aulas', 'arquivos'].includes(tabela)) throw new Erro(400, 'Lista inválida.');
  const lista = (Array.isArray(ids) ? ids : []).filter((v) => UUID.test(String(v))).slice(0, 200);
  for (const [i, v] of lista.entries()) await db.update(x.env, tabela, { id: `eq.${v}` }, { ordem: i + 1 }, 'id');
  await auditar(x.env, x.u, 'curso.reordenar', tabela, { itens: lista.length });
  return { ok: true };
}

// Curso vivo: a aula mudou de verdade. Quem já tinha concluído recebe o aviso no sino.
export async function marcarAulaAtualizada(x, aid, nota) {
  exigir(x.u, 'cursos.editar');
  const agora = new Date().toISOString();
  const [a] = await db.update(x.env, 'aulas', { id: `eq.${id(aid)}` }, { conteudo_atualizado_em: agora }, 'id,codigo,titulo');
  if (!a) throw new Erro(404, 'Aula não encontrada.');
  const viram = await db.select(x.env, 'progresso', { filtros: { aula_id: `eq.${a.id}`, concluida_em: 'not.is.null' }, select: 'aluno_id', limite: 2000 });
  const ref = `aula-atualizada:${a.id}:${agora.slice(0, 10)}`;
  const linhas = viram.map((v) => ({ aluno_id: v.aluno_id, tipo: 'aviso', titulo: `Aula atualizada: ${a.codigo} ${a.titulo}`, texto: String(nota || 'Tem coisa nova nesta aula. Vale ver de novo.').slice(0, 200), link: `/aulas/${a.id}`, ref }));
  for (let i = 0; i < linhas.length; i += 200) await db.insert(x.env, 'notificacoes', linhas.slice(i, i + 200), { ignorar: true, conflito: 'aluno_id,ref', select: 'id' });
  await auditar(x.env, x.u, 'aula.atualizada', `aula:${a.id}`, { avisados: linhas.length });
  return { avisados: linhas.length };
}

// ---------------------------------------------------------------- arquivos com ficha
const CAMPOS_ARQUIVO = ['nome', 'tipo', 'o_que', 'quando', 'como', 'tempo', 'previa', 'versao', 'aula_id', 'ordem', 'origem', 'link', 'recompensa'];
export async function salvarArquivo(x, d, fid) {
  exigir(x.u, 'cursos.editar');
  const dados = pegar(d, CAMPOS_ARQUIVO);
  if (dados.tipo && !['receita', 'guia', 'skill', 'modelo', 'ferramenta', 'pacote', 'pdf', 'link'].includes(dados.tipo)) throw new Erro(400, 'Tipo inválido.');
  if (dados.origem && !['storage', 'link', 'drive'].includes(dados.origem)) throw new Erro(400, 'Origem inválida.');
  if (dados.link && !/^https:\/\//.test(dados.link)) throw new Erro(400, 'O link precisa começar com https://');
  if (dados.como !== undefined) dados.como = (Array.isArray(dados.como) ? dados.como : String(dados.como || '').split('\n')).map((l) => String(l).trim()).filter(Boolean).slice(0, 10);
  if (dados.recompensa !== undefined) dados.recompensa = !!dados.recompensa;
  if (!fid) {
    dados.curso_id = id(d.curso_id);
    if (!dados.nome) throw new Erro(400, 'Dê um nome ao arquivo.');
    if (d.caminho) dados.caminho = String(d.caminho);
    if (d.bytes) dados.bytes = Number(d.bytes) || null;
    if (!dados.origem) dados.origem = d.caminho ? 'storage' : /docs\.google\.com|drive\.google\.com/.test(dados.link || '') ? 'drive' : 'link';
  } else if (d.caminho) { dados.caminho = String(d.caminho); dados.origem = 'storage'; if (d.bytes) dados.bytes = Number(d.bytes) || null; }
  const [f] = fid ? await db.update(x.env, 'arquivos', { id: `eq.${id(fid)}` }, dados, '*') : await db.insert(x.env, 'arquivos', dados, { select: '*' });
  if (!f) throw new Erro(404, 'Arquivo não encontrado.');
  await auditar(x.env, x.u, fid ? 'arquivo.editar' : 'arquivo.criar', `arquivo:${f.id}`, { nome: f.nome });
  return f;
}

// Sobe o arquivo para o bucket privado "curso" (o aluno baixa por link que vence em 10 minutos).
export async function enviarArquivoDoCurso(x, cursoId, arquivo) {
  exigir(x.u, 'cursos.editar');
  const c = await db.um(x.env, 'cursos', { id: `eq.${id(cursoId)}` }, 'slug');
  if (!c) throw new Erro(404, 'Curso não encontrado.');
  if (!arquivo || typeof arquivo === 'string') throw new Erro(400, 'Escolha um arquivo.');
  if (arquivo.size > 50 * 1024 * 1024) throw new Erro(400, 'Arquivo grande demais (até 50 MB).');
  const nome = String(arquivo.name || 'arquivo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 100);
  const caminho = `${c.slug}/${nome}`;
  const r = await fetch(`${x.env.SUPABASE_URL}/storage/v1/object/curso/${caminho.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST', body: arquivo.stream(), duplex: 'half',
    headers: { apikey: x.env.SUPABASE_SECRET_KEY, ...(x.env.SUPABASE_SECRET_KEY.startsWith('sb_') ? {} : { Authorization: `Bearer ${x.env.SUPABASE_SECRET_KEY}` }), 'Content-Type': arquivo.type || 'application/octet-stream', 'x-upsert': 'true' },
  });
  if (!r.ok) { console.error('storage curso', r.status, (await r.text()).slice(0, 200)); throw new Erro(502, 'O armazenamento recusou o arquivo.'); }
  await auditar(x.env, x.u, 'arquivo.enviar', `curso:${cursoId}`, { caminho });
  return { caminho, bytes: arquivo.size, nome: arquivo.name };
}

export async function removerArquivo(x, fid) {
  exigir(x.u, 'cursos.editar');
  const f = await db.um(x.env, 'arquivos', { id: `eq.${id(fid)}` }, 'id,nome');
  if (!f) throw new Erro(404, 'Arquivo não encontrado.');
  await db.apagar(x.env, 'arquivos', { id: `eq.${f.id}` });
  await auditar(x.env, x.u, 'arquivo.remover', `arquivo:${f.id}`, { nome: f.nome });
  return { ok: true };
}

// ---------------------------------------------------------------- trilhas
export async function listarTrilhas(x) {
  exigir(x.u, 'cursos.ver');
  return db.select(x.env, 'trilhas', { select: '*', ordem: 'ordem.asc' });
}

export async function salvarTrilha(x, d, tid) {
  exigir(x.u, 'cursos.editar');
  const dados = pegar(d, ['titulo', 'descricao', 'objetivo', 'ordem', 'ativa']);
  if (d.itens !== undefined) dados.itens = (Array.isArray(d.itens) ? d.itens : []).filter((i) => ['curso', 'modulo', 'aula'].includes(i.tipo) && UUID.test(String(i.id))).slice(0, 60).map((i) => ({ tipo: i.tipo, id: i.id, titulo: String(i.titulo || '').slice(0, 160) }));
  if (!tid) { if (!dados.titulo) throw new Erro(400, 'Dê um título à trilha.'); dados.slug = slugDe(d.slug || d.titulo); }
  const [t] = tid ? await db.update(x.env, 'trilhas', { id: `eq.${id(tid)}` }, dados, '*') : await db.insert(x.env, 'trilhas', dados, { select: '*' });
  await auditar(x.env, x.u, tid ? 'trilha.editar' : 'trilha.criar', `trilha:${t.id}`);
  return t;
}

// A trilha do aluno: a do objetivo dele (ou a primeira ativa), com o que já fez.
export async function trilhaDoAluno(env, aluno) {
  const lista = await db.select(env, 'trilhas', { filtros: { ativa: 'is.true' }, select: 'id,slug,titulo,descricao,objetivo,itens', ordem: 'ordem.asc', limite: 20 });
  const t = lista.find((x) => x.objetivo && x.objetivo === aluno.objetivo) || lista.find((x) => !x.objetivo) || null;
  if (!t || !t.itens.length) return null;
  const aulasIds = t.itens.filter((i) => i.tipo === 'aula').map((i) => i.id);
  const modIds = t.itens.filter((i) => i.tipo === 'modulo').map((i) => i.id);
  const cursoIds = t.itens.filter((i) => i.tipo === 'curso').map((i) => i.id);
  const filtros = [];
  if (aulasIds.length) filtros.push(`id.in.(${aulasIds.join(',')})`);
  if (modIds.length) filtros.push(`modulo_id.in.(${modIds.join(',')})`);
  if (cursoIds.length) filtros.push(`curso_id.in.(${cursoIds.join(',')})`);
  const aulas = filtros.length ? await db.select(env, 'aulas', { filtros: { status: 'eq.publicado', or: `(${filtros.join(',')})` }, select: 'id,curso_id,modulo_id', limite: 500 }) : [];
  const feitas = aulas.length ? new Set((await db.select(env, 'progresso', { filtros: { aluno_id: `eq.${aluno.id}`, aula_id: `in.(${aulas.map((a) => a.id).join(',')})`, concluida_em: 'not.is.null' }, select: 'aula_id' })).map((p) => p.aula_id)) : new Set();
  const passos = t.itens.map((i) => {
    const doItem = aulas.filter((a) => (i.tipo === 'aula' ? a.id === i.id : i.tipo === 'modulo' ? a.modulo_id === i.id : a.curso_id === i.id));
    const n = doItem.filter((a) => feitas.has(a.id)).length;
    return { ...i, total: doItem.length, feitas: n, primeira: (doItem.find((a) => !feitas.has(a.id)) || doItem[0] || {}).id || null };
  });
  const agora = passos.findIndex((p) => p.feitas < p.total);
  return { titulo: t.titulo, descricao: t.descricao, passos: passos.map((p, k) => ({ ...p, estado: p.total && p.feitas === p.total ? 'feito' : k === agora ? 'agora' : '' })) };
}

// ---------------------------------------------------------------- certificado: o visual (Área de membros > Certificado)
export async function verCertificado(x) {
  exigir(x.u, 'cursos.ver');
  return { config: await configCertificado(x.env), padrao: CERT_PADRAO, exemplo: `${cursoUrl(x.env)}/certificado/exemplo` };
}

export async function salvarCertificado(x, d) {
  exigir(x.u, 'cursos.editar');
  const valor = limparConfigCertificado({ ...(await configCertificado(x.env)), ...d });
  await db.insert(x.env, 'config', { chave: 'certificado', valor }, { upsert: true, conflito: 'chave', select: 'chave' });
  await auditar(x.env, x.u, 'certificado.visual', 'config:certificado', { modelo: valor.modelo, cor: valor.cor });
  return { config: valor };
}

// ---------------------------------------------------------------- conquista dos 7 dias (Área de membros > Certificado)
// A barra que enche um dia por vez desde a compra e, no último dia, abre os modelos prontos e o "Solicitar certificado".
export async function verConquistaDias(x) {
  exigir(x.u, 'cursos.ver');
  const c = await configConquista(x.env);
  const b = c.bonus;
  let arquivos = [];
  if (b && (b.arquivo_ids || []).length) arquivos = await db.select(x.env, 'arquivos', { filtros: { id: `in.(${b.arquivo_ids.join(',')})` }, select: 'id,nome,bytes,downloads' });
  return { ligada: c.ligada, dias: c.dias, bonus: b ? { titulo: b.titulo, curso_id: b.curso_id, modelos: (b.modelos || []).map((m) => ({ nome: m.nome, imagens: m.imagens })), arquivos } : null };
}

export async function salvarConquistaDias(x, d = {}) {
  exigir(x.u, 'cursos.editar');
  const atual = await configConquista(x.env);
  const valor = { ...atual };
  if (d.ligada !== undefined) valor.ligada = d.ligada !== false;
  if (d.dias !== undefined) {
    const n = Math.round(Number(d.dias));
    if (!Number.isFinite(n) || n < 1 || n > 30) throw new Erro(400, 'Os dias vão de 1 a 30.');
    valor.dias = n;
  }
  await db.insert(x.env, 'config', { chave: 'conquista', valor }, { upsert: true, conflito: 'chave', select: 'chave' });
  await auditar(x.env, x.u, 'conquista.salvar', 'config:conquista', { ligada: valor.ligada, dias: valor.dias, antes: { ligada: atual.ligada, dias: atual.dias } });
  return verConquistaDias(x);
}

// Prévia sem salvar: a mesma página do certificado, com um nome de exemplo e o que está no formulário.
export async function previaCertificado(x, d, { story = false } = {}) {
  exigir(x.u, 'cursos.ver');
  const base = cursoUrl(x.env);
  return paginaCertificado({ ...EXEMPLO_CERT, emitido_em: new Date().toISOString() }, { url: `${base}/certificado/exemplo`, story, cfg: limparConfigCertificado(d), base, previa: true });
}
