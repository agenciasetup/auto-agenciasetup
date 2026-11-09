// A conquista dos 7 dias (pedido do dono, 27/10/2026): uma barra que enche uma parte por dia desde a compra e, no
// último dia, abre o bônus (os modelos prontos) e o "Solicitar certificado". A garantia é de 7 dias: o melhor fica do
// outro lado dela, e a barra aparece desde o primeiro dia para a pessoa voltar.
// Config em config.conquista: { ligada, dias } pelo painel (Área de membros > Certificado) e { bonus } pelo
// scripts/area-bonus.mjs. Desligada: sem barra e sem espera (bônus e certificado seguem só a regra dos 70%).
import { db } from '../nucleo/db.js';

export const CONQUISTA_PADRAO = { ligada: true, dias: 7, bonus: null };
// bonus: { curso_id, arquivo_ids: [uuid], titulo, texto, modelos: [{ nome, texto, imagens: [url, url, url] }] }

export async function configConquista(env) {
  const c = await db.um(env, 'config', { chave: 'eq.conquista' }).catch(() => null);
  const v = { ...CONQUISTA_PADRAO, ...((c && c.valor) || {}) };
  v.ligada = v.ligada !== false;
  v.dias = Math.max(1, Math.min(30, Math.round(Number(v.dias) || 7)));
  return v;
}

// O dia no fuso de Brasília (AAAA-MM-DD) e a conta de dias entre duas datas assim.
const diaSP = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
const entre = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400_000);
const somar = (dia, n) => new Date(Date.parse(`${dia}T12:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);

// Em que dia a pessoa está. O dia da compra (ou da liberação da matrícula) é o dia 1; no dia N (7) abre tudo.
// Curso dado à mão (bônus), matrícula da equipe e quem é da equipe: já liberado. Desligada: null (sem espera).
export function diaDaConquista(cfg, mat, equipe, agora = new Date()) {
  if (!cfg || !cfg.ligada) return null;
  const livre = !!equipe || !mat || ['bonus', 'equipe'].includes(mat.origem);
  const inicio = diaSP(mat && mat.inicio ? new Date(mat.inicio) : agora);
  const hoje = diaSP(agora);
  const dia = livre ? cfg.dias : Math.max(1, Math.min(cfg.dias, entre(inicio, hoje) + 1));
  return { dias: cfg.dias, dia, faltam: cfg.dias - dia, liberado: dia >= cfg.dias, livre, inicio, libera_em: somar(inicio, cfg.dias - 1) };
}

// Os arquivos do bônus deste curso (ficam bloqueados até o dia N).
export function idsDoBonus(cfg, cursoId) {
  const b = cfg && cfg.bonus;
  return b && b.curso_id === cursoId && Array.isArray(b.arquivo_ids) ? b.arquivo_ids : [];
}

// O que o app do aluno mostra: o dia, o bônus (com as prévias) e o certificado.
// cert: { necessarias, faltam, codigo } do curso. Sem conquista ligada: null.
export function conquistaParaTela(cfg, mat, equipe, curso, cert) {
  const d = diaDaConquista(cfg, mat, equipe);
  if (!d) return null;
  const b = cfg.bonus && cfg.bonus.curso_id === curso.id ? cfg.bonus : null;
  return {
    ...d,
    curso: { slug: curso.slug, titulo: curso.titulo },
    bonus: b ? { titulo: b.titulo || 'Modelos prontos', texto: b.texto || '', arquivo_id: (b.arquivo_ids || [])[0] || null, modelos: (b.modelos || []).map((m) => ({ nome: m.nome, texto: m.texto || '', imagens: (m.imagens || []).slice(0, 3) })) } : null,
    certificado: { codigo: cert.codigo || null, faltam_aulas: Math.max(0, cert.faltam || 0), pode_pedir: d.liberado && !cert.codigo && (cert.faltam || 0) <= 0 },
  };
}

// A trava do certificado no servidor: com a conquista ligada, só a partir do dia N.
export async function certificadoPorDia(env, aluno, cursoId) {
  const cfg = await configConquista(env);
  if (!cfg.ligada || aluno.equipe) return { ok: true };
  const mat = await db.um(env, 'matriculas', { aluno_id: `eq.${aluno.id}`, curso_id: `eq.${cursoId}`, status: 'eq.ativa' }, 'inicio,origem');
  const d = diaDaConquista(cfg, mat, false);
  return d.liberado ? { ok: true } : { ok: false, faltam: d.faltam, dia: d.dia, dias: d.dias };
}
