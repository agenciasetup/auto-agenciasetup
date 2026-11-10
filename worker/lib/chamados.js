// Chamados de suporte (migration 47). Pedido do dono em 10/11/2026: "O atendente pode colher dados como nome, email,
// telefone, curso e dúvida. E poderia adicionar pra gente no menu de suporte ali. Assim meu time acessa ali todos os
// dias e resolve."
//
// Quando alguém conta no direct um problema com um curso que comprou (perdeu o acesso, aula que não abre, pagamento),
// o Atendente colhe os dados na conversa e o chamado nasce aqui. A tela Suporte mostra os abertos no topo, e o time
// resolve com um clique. Cada pessoa tem um chamado aberto por vez: o que ela disser a mais completa o mesmo chamado.
// Os vendedores da tarefa do direct abrem chamado pelo conector, e o time pode abrir um à mão no painel.
// O texto do chamado veio de gente de fora: é dado, nunca instrução.
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';

export const STATUS_CHAMADO = { aberto: 'Aberto', resolvido: 'Resolvido' };
export const ORIGEM_CHAMADO = { atendente: 'Atendente do direct', vendedor: 'Vendedor do direct', painel: 'Aberto pelo time' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAMPOS = 'id,followup_id,perfil,usuario,nome,email,telefone,curso,problema,origem,status,nota,resolvido_por,resolvido_em,criado_em,atualizado_em';
const limpo = (v, max) => String(v ?? '').replace(/[—–]/g, ',').replace(/\s+/g, ' ').trim().slice(0, max);
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/i;
const soDigitos = (v) => String(v ?? '').replace(/\D/g, '');
const agora = () => new Date().toISOString();

// O e-mail e o telefone de um texto, como a pessoa escreveu. Sem um deles, vazio.
export const emailDe = (t) => ((String(t ?? '').match(EMAIL) || [])[0] || '').toLowerCase().replace(/[.,;:]+$/, '').slice(0, 160);
export function telefoneDe(t) {
  const d = soDigitos((String(t ?? '').match(/\+?\d[\d\s().-]{7,20}\d/) || [])[0]);
  return d.length >= 8 && d.length <= 15 ? d : '';
}

// O chamado que a IA do Atendente pediu, conferido sem confiar nela. s: o campo "suporte" da decisão. daPessoa: tudo o
// que a pessoa escreveu na conversa. E-mail e telefone só valem se ela escreveu de verdade: a IA não inventa contato.
// Devolve { curso, email, telefone, nome, problema } ou null quando não há chamado para abrir.
export function lerChamadoDaIa(s, daPessoa = '') {
  if (!s || typeof s !== 'object' || s.abrir !== true) return null;
  const problema = limpo(s.problema, 400);
  if (problema.length < 3) return null;
  const texto = String(daPessoa || '').toLowerCase();
  const email = emailDe(s.email);
  const telefone = soDigitos(s.telefone);
  return {
    curso: limpo(s.curso, 160),
    email: email && texto.includes(email) ? email : '',
    telefone: telefone.length >= 8 && telefone.length <= 15 && soDigitos(texto).includes(telefone) ? telefone : '',
    nome: limpo(s.nome, 80),
    problema,
  };
}

// ---------------------------------------------------------------- ler
export async function listarChamados(env, { status = 'aberto', limite = 100 } = {}) {
  const filtros = { status: STATUS_CHAMADO[status] ? `eq.${status}` : 'eq.aberto' };
  const n = Math.min(200, Math.max(1, Number(limite) || 100));
  const [itens, abertos] = await Promise.all([
    db.select(env, 'chamados', { filtros, select: CAMPOS, ordem: status === 'resolvido' ? 'resolvido_em.desc' : 'criado_em.asc', limite: n }),
    status === 'aberto' ? null : contarChamadosAbertos(env),
  ]);
  return {
    itens: itens.map((c) => ({ ...c, abrir: c.usuario ? `https://ig.me/m/${c.usuario}` : null })),
    abertos: abertos === null ? itens.length : abertos,
    nomes: { status: STATUS_CHAMADO, origem: ORIGEM_CHAMADO },
  };
}
export async function contarChamadosAbertos(env) {
  const r = await db.select(env, 'chamados', { filtros: { status: 'eq.aberto' }, select: 'id', limite: 1, contar: true });
  return Number(r.total) || 0;
}

// ---------------------------------------------------------------- abrir e completar
// Abre o chamado de uma pessoa ou completa o que ela já tem aberto. O que chega vazio não apaga o que já estava
// anotado. Devolve { ...chamado, criado } (criado: true quando nasceu agora).
export async function abrirChamado(env, d = {}) {
  const problema = limpo(d.problema, 600);
  const dados = {
    nome: limpo(d.nome, 80), email: emailDe(d.email), telefone: soDigitos(d.telefone).slice(0, 15), curso: limpo(d.curso, 160),
    usuario: limpo(d.usuario, 60).replace(/^@/, '').toLowerCase(),
  };
  const fid = UUID.test(String(d.followup_id || '')) ? String(d.followup_id) : null;
  const preenchidos = Object.fromEntries(Object.entries(dados).filter(([, v]) => v));
  const aberto = fid ? await db.um(env, 'chamados', { followup_id: `eq.${fid}`, status: 'eq.aberto' }, CAMPOS) : null;
  if (aberto) {
    const m = { ...preenchidos, ...(problema.length >= 3 && problema !== aberto.problema ? { problema } : {}) };
    const mudou = Object.entries(m).some(([k, v]) => aberto[k] !== v);
    if (!mudou) return { ...aberto, criado: false };
    const [c] = await db.update(env, 'chamados', { id: `eq.${aberto.id}`, status: 'eq.aberto' }, { ...m, atualizado_em: agora() }, CAMPOS);
    return { ...(c || aberto), criado: false };
  }
  if (problema.length < 3) throw new Erro(400, 'Diga qual é o problema da pessoa.');
  if (!fid && !dados.usuario && !dados.email && !dados.telefone) throw new Erro(400, 'O chamado precisa de um jeito de achar a pessoa: o @, o e-mail ou o telefone.');
  const linha = {
    followup_id: fid, perfil: d.perfil === 'en' ? 'en' : 'br', usuario: dados.usuario || null, nome: dados.nome || null, email: dados.email || null,
    telefone: dados.telefone || null, curso: dados.curso || null, problema, origem: ORIGEM_CHAMADO[d.origem] ? d.origem : 'painel',
  };
  const [c] = await db.insert(env, 'chamados', [linha], { select: CAMPOS });
  return { ...c, criado: true };
}

// ---------------------------------------------------------------- resolver
// Resolver, reabrir ou anotar. nota: o que o time fez (fica guardado com o chamado).
export async function mudarChamado(env, id, d = {}, { quemNome = '' } = {}) {
  if (!UUID.test(String(id))) throw new Erro(404, 'Não achei esse chamado.');
  const m = { atualizado_em: agora() };
  if (d.nota !== undefined) m.nota = limpo(d.nota, 600) || null;
  if (d.status !== undefined) {
    if (!STATUS_CHAMADO[d.status]) throw new Erro(400, 'Status desconhecido. Use: aberto ou resolvido.');
    m.status = d.status;
    m.resolvido_em = d.status === 'resolvido' ? m.atualizado_em : null;
    m.resolvido_por = d.status === 'resolvido' ? limpo(quemNome, 80) || null : null;
  }
  if (Object.keys(m).length === 1) throw new Erro(400, 'Nada para mudar.');
  let c;
  try { [c] = await db.update(env, 'chamados', { id: `eq.${id}` }, m, CAMPOS); } catch (e) {
    // Reabrir um chamado de quem já tem outro aberto: o banco só deixa um aberto por pessoa.
    if (e instanceof Erro && e.status === 409) throw new Erro(409, 'Essa pessoa já tem outro chamado aberto. Resolva aquele, ou anote lá.');
    throw e;
  }
  if (!c) throw new Erro(404, 'Não achei esse chamado.');
  return { ok: true, ...c };
}
