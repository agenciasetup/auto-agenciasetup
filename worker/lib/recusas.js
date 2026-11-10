// Por que o dono recusou um post (10/11/2026, pedido dele: "quando eu recusasse abrisse um porque eu recusei. Aí eu
// escrevo e fica de aprendizado"). Ao recusar a peça no painel, ele escreve o motivo e diz se o problema foi o texto,
// a imagem ou os dois. O motivo fica na peça (pecas.recusa) e vira lição no caderno de quem fez a parte: o Redator
// (texto, id redator-de-frase), o Designer (imagem, id redator-de-carrossel) e sempre o Revisor, que deixou passar.
// As tarefas de post leem as recusas pelo conector (posts_recusados) antes de criar.
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { salvarAgente } from './escritorio.js';

export const PARTES = { texto: 'o texto', imagem: 'a imagem', os_dois: 'o texto e a imagem' };
const QUEM = { texto: ['redator-de-frase'], imagem: ['redator-de-carrossel'], os_dois: ['redator-de-frase', 'redator-de-carrossel'] };
const REVISOR = 'revisor';
const limpar = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// A recusa que vai para a peça. Sem motivo (o conector pode mandar sem), fica só a parte; a parte padrão é os dois.
export function lerRecusa({ motivo, parte } = {}, quem = '') {
  const m = limpar(motivo, 600);
  if (motivo !== undefined && motivo !== null && motivo !== '' && m.length < 3) throw new Erro(400, 'Escreva o motivo da recusa em pelo menos uma frase curta.');
  const p = PARTES[parte] ? parte : 'os_dois';
  return { motivo: m || null, parte: p, em: new Date().toISOString(), por: limpar(quem, 60) || null };
}

// O tipo de post, para a lição dizer de qual formato ela é: frase (até 4 cards, sem material) ou carrossel.
export function tipoDaPeca(peca) {
  const n = Array.isArray(peca.slides) ? peca.slides.length : 0;
  if (peca.formato === 'carrossel' && peca.origem_tipo !== 'recurso' && n > 0 && n <= 4) return 'post de frase';
  if (peca.formato === 'carrossel') return 'carrossel';
  return peca.formato || 'post';
}

// A lição: uma linha para o caderno e a lista de quem aprende com ela.
export function licaoDaRecusa(peca, recusa) {
  const titulo = limpar(peca.titulo || String(peca.legenda || '').split('\n')[0], 80) || 'post sem título';
  const texto = `Recusa do dono no ${tipoDaPeca(peca)} "${titulo}" (problema: ${PARTES[recusa.parte]}): ${recusa.motivo}`;
  return { texto: texto.slice(0, 600), agentes: [...QUEM[recusa.parte], REVISOR] };
}

// Escreve a lição no caderno de cada agente. Falha de um não segura a recusa (ela já está gravada na peça).
export async function aprenderComARecusa(env, peca, recusa, { quem = null, quemNome = '' } = {}) {
  if (!recusa || !recusa.motivo) return { agentes: [] };
  const l = licaoDaRecusa(peca, recusa);
  const feitos = [];
  for (const id of l.agentes) {
    try { await salvarAgente(env, { caderno_mais: l.texto }, id, { quem, quemNome }); feitos.push(id); } catch (e) { console.error('recusa caderno', id, e && e.message); }
  }
  return { agentes: feitos, licao: l.texto };
}

// As recusas dos últimos dias, com o que a tarefa precisa para aprender: título, tipo, parte, motivo, a capa e a
// primeira linha da legenda. Sem motivo não entra (não ensina nada).
export async function listarRecusas(env, { dias = 30, perfil = null, limite = 30 } = {}) {
  const desde = new Date(Date.now() - Math.min(180, Math.max(1, Number(dias) || 30)) * 86_400_000).toISOString();
  const filtros = { recusa: 'not.is.null', 'recusa->>em': `gte.${desde}`, ...(perfil === 'br' || perfil === 'en' ? { perfil: `eq.${perfil}` } : {}) };
  const l = await db.select(env, 'pecas', { filtros, select: 'id,titulo,legenda,formato,origem_tipo,slides,midias,perfil,status,recusa', ordem: 'recusa->>em.desc', limite: Math.min(100, Math.max(1, Number(limite) || 30)) });
  return l.filter((p) => p.recusa && p.recusa.motivo).map((p) => ({
    id: p.id, titulo: p.titulo || null, tipo: tipoDaPeca(p), perfil: p.perfil, status: p.status,
    parte: p.recusa.parte, problema: PARTES[p.recusa.parte] || null, motivo: p.recusa.motivo, em: p.recusa.em, por: p.recusa.por || null,
    capa: (Array.isArray(p.slides) && p.slides[0] && p.slides[0].imagem_url) || (Array.isArray(p.midias) && p.midias[0] && p.midias[0].url) || null,
    legenda: limpar(String(p.legenda || '').split('\n')[0], 160) || null,
  }));
}
