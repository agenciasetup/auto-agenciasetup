// Certificado (seção 2.11): sai sozinho quando o aluno conclui o percentual do curso (70% por padrão). Página pública com
// código para conferir, versão de impressão (PDF pelo navegador), versão para story e "Adicionar ao LinkedIn".
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { cursoUrl } from './alunos.js';
import { emailCertificado, enviarEmail } from './emails.js';
import { PONTOS, ganharXP, notificar } from './jogo.js';
import { avisarSistemas, pessoa } from './plataforma.js';
import { certificadoPorDia } from './conquista.js';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const novoCodigo = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => ALFABETO[b % ALFABETO.length]).join('');

// Como o certificado se parece (painel: Área de membros > Certificado; fica em config.certificado).
// Nos textos: {nome}, {curso}, {aulas_feitas}, {aulas_total}, {horas} e {data}.
export const CERT_PADRAO = {
  modelo: 'escuro', cor: '#ff7a00',
  titulo: 'Certificado de conclusão', abertura: 'Certificamos que', antes_do_curso: 'concluiu o curso',
  detalhes: '{aulas_feitas} de {aulas_total} aulas · {horas} de conteúdo',
  assinatura_nome: 'Filipe Lourenço', assinatura_cargo: 'Fundador da Agência Setup', assinatura_img: '',
  selo: true, qr: true,
};
// O código de exemplo usa letras que nunca saem num código de verdade (O e 0 ficam fora do alfabeto).
export const EXEMPLO_CERT = { codigo: 'EXEMPLO000', nome: 'Seu Nome Completo', curso_titulo: 'Posts automáticos com Claude', horas: 1.9, aulas_feitas: 18, aulas_total: 18 };

export async function configCertificado(env) {
  const c = await db.um(env, 'config', { chave: 'eq.certificado' }).catch(() => null);
  return { ...CERT_PADRAO, ...((c && c.valor) || {}) };
}

// Confere o que vem do painel: só os campos conhecidos, cor em hexadecimal, imagem com https.
export function limparConfigCertificado(d = {}) {
  const v = { ...CERT_PADRAO };
  const texto = (k, max = 140) => { if (d[k] != null) v[k] = String(d[k]).replace(/\s+/g, ' ').trim().slice(0, max); };
  if (['escuro', 'claro'].includes(d.modelo)) v.modelo = d.modelo;
  if (/^#[0-9a-f]{6}$/i.test(String(d.cor || ''))) v.cor = d.cor.toLowerCase();
  ['titulo', 'abertura', 'antes_do_curso', 'assinatura_nome', 'assinatura_cargo'].forEach((k) => texto(k, 80));
  texto('detalhes', 160);
  v.assinatura_img = /^https:\/\/[^\s"'<>]+$/.test(String(d.assinatura_img || '')) ? d.assinatura_img : '';
  v.selo = d.selo !== false;
  v.qr = d.qr !== false;
  return v;
}

// Conta as aulas publicadas e as concluídas do aluno num curso.
async function contagem(env, alunoId, cursoId) {
  const aulas = await db.select(env, 'aulas', { filtros: { curso_id: `eq.${cursoId}`, status: 'eq.publicado' }, select: 'id,duracao_s,modulo_id' });
  if (!aulas.length) return { total: 0, feitas: 0, segundos: 0, aulas: [], concluidas: new Set() };
  const prog = await db.select(env, 'progresso', { filtros: { aluno_id: `eq.${alunoId}`, aula_id: `in.(${aulas.map((a) => a.id).join(',')})`, concluida_em: 'not.is.null' }, select: 'aula_id' });
  const concluidas = new Set(prog.map((p) => p.aula_id));
  return { total: aulas.length, feitas: concluidas.size, segundos: aulas.reduce((s, a) => s + (a.duracao_s || 0), 0), aulas, concluidas };
}

// Depois de concluir uma aula: XP do módulo e do curso completos e o certificado, se chegou no percentual.
export async function depoisDeConcluir(env, aluno, aula) {
  const curso = await db.um(env, 'cursos', { id: `eq.${aula.curso_id}` }, 'id,slug,titulo,certificado_pct,marca');
  if (!curso) return null;
  // Curso com marca própria (ex.: Dúvidas da Fé): sem XP, aviso de módulo nem certificado, que são da Setup.
  if (curso.marca) return null;
  const c = await contagem(env, aluno.id, curso.id);
  const doModulo = c.aulas.filter((a) => a.modulo_id === aula.modulo_id);
  if (doModulo.length && doModulo.every((a) => c.concluidas.has(a.id))) {
    await ganharXP(env, aluno.id, 'modulo', `modulo:${aula.modulo_id}`, { curso_id: curso.id, selos: false });
    await notificar(env, aluno.id, { tipo: 'modulo', titulo: 'Módulo concluído', texto: 'Mais um passo. Siga para o próximo módulo.', link: `/cursos/${curso.slug}`, ref: `modulo:${aula.modulo_id}` });
  }
  if (c.total && c.feitas === c.total) {
    await ganharXP(env, aluno.id, 'curso', `curso:${curso.id}`, { curso_id: curso.id, selos: false });
    await avisarSistemas(env, 'curso.concluido', { aluno: pessoa(aluno), curso: { id: curso.id, titulo: curso.titulo }, aulas: c.total });
  }
  const necessarias = Math.ceil((c.total * curso.certificado_pct) / 100);
  let cert = null;
  // Com a conquista dos 7 dias ligada, antes do dia 7 o certificado espera: a pessoa pede no dia (botão "Solicitar").
  if (c.total && c.feitas >= necessarias && (await certificadoPorDia(env, aluno, curso.id)).ok) cert = await emitir(env, aluno, curso, c);
  return cert;
}

// "Solicitar certificado": o mesmo que sai sozinho, pedido pela pessoa. Valem as duas travas: o dia (conquista) e o
// percentual de aulas do curso (70% por padrão).
export async function pedirCertificado(env, aluno, curso) {
  const ja = await db.um(env, 'certificados', { aluno_id: `eq.${aluno.id}`, curso_id: `eq.${curso.id}` }, 'codigo');
  if (ja) return { codigo: ja.codigo, link: `${cursoUrl(env)}/certificado/${ja.codigo}` };
  const dia = await certificadoPorDia(env, aluno, curso.id);
  if (!dia.ok) throw new Erro(403, dia.faltam === 1 ? 'O certificado libera amanhã.' : `O certificado libera em ${dia.faltam} dias.`, { codigo: 'espera', faltam: dia.faltam });
  const c = await contagem(env, aluno.id, curso.id);
  const necessarias = Math.ceil((c.total * curso.certificado_pct) / 100);
  const faltam = Math.max(0, necessarias - c.feitas);
  if (!c.total || faltam > 0) throw new Erro(403, `Faltam ${faltam} ${faltam === 1 ? 'aula' : 'aulas'} para o certificado.`, { codigo: 'faltam-aulas', faltam });
  const cert = await emitir(env, aluno, curso, c);
  if (cert) return cert;
  const de = await db.um(env, 'certificados', { aluno_id: `eq.${aluno.id}`, curso_id: `eq.${curso.id}` }, 'codigo');
  if (!de) throw new Erro(500, 'Não consegui emitir o certificado agora. Tente de novo.');
  return { codigo: de.codigo, link: `${cursoUrl(env)}/certificado/${de.codigo}` };
}

async function emitir(env, aluno, curso, c) {
  const ja = await db.um(env, 'certificados', { aluno_id: `eq.${aluno.id}`, curso_id: `eq.${curso.id}` }, 'id,codigo');
  if (ja) return null;
  const a = await db.um(env, 'alunos', { id: `eq.${aluno.id}` }, 'nome,email');
  let cert = null;
  for (let i = 0; i < 3 && !cert; i++) {
    const r = await db.insert(env, 'certificados', {
      codigo: novoCodigo(), aluno_id: aluno.id, curso_id: curso.id, nome: a.nome || a.email, curso_titulo: curso.titulo,
      horas: Math.max(0.5, Math.round((c.segundos / 3600) * 2) / 2), aulas_feitas: c.feitas, aulas_total: c.total,
    }, { ignorar: true, conflito: 'aluno_id,curso_id', select: 'id,codigo' }).catch(() => []);
    cert = r[0] || null;
    if (!cert) { const de = await db.um(env, 'certificados', { aluno_id: `eq.${aluno.id}`, curso_id: `eq.${curso.id}` }, 'id'); if (de) return null; }
  }
  if (!cert) return null;
  const link = `${cursoUrl(env)}/certificado/${cert.codigo}`;
  await ganharXP(env, aluno.id, 'certificado', `certificado:${curso.id}`, { pontos: PONTOS.certificado, curso_id: curso.id });
  await notificar(env, aluno.id, { tipo: 'certificado', titulo: 'Seu certificado saiu', texto: curso.titulo, link: `/certificado/${cert.codigo}`, ref: `certificado:${curso.id}` });
  await avisarSistemas(env, 'certificado.emitido', { aluno: pessoa({ id: aluno.id, ...a }), curso: { id: curso.id, titulo: curso.titulo }, codigo: cert.codigo, link });
  const m = emailCertificado({ nome: a.nome, curso: curso.titulo, link });
  await enviarEmail(env, { para: a.email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: 'certificado', ref: `certificado:${cert.id}` }).catch(() => {});
  return { codigo: cert.codigo, link };
}

export async function meusCertificados(env, aluno) {
  return db.select(env, 'certificados', { filtros: { aluno_id: `eq.${aluno.id}` }, select: 'codigo,curso_titulo,horas,emitido_em,curso:cursos(slug)', ordem: 'emitido_em.desc' });
}

export async function certificadoPublico(env, codigo) {
  if (!/^[A-Z0-9]{10}$/.test(String(codigo || ''))) return null;
  return db.um(env, 'certificados', { codigo: `eq.${codigo}` }, 'codigo,nome,curso_titulo,horas,aulas_feitas,aulas_total,emitido_em,aluno:alunos(usuario,perfil_publico)');
}

