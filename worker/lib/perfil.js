// Perfil do aluno (seção 2.9): foto (recortada no aparelho), nome, @ do Instagram, frase, área, cidade, links,
// boas-vindas em 3 passos (foto e @, objetivo, aulas por semana) e o perfil público curso.agenciasetup.com.br/@usuario.
import { db, enviarArquivo } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { nivel } from './jogo.js';

const RESERVADOS = new Set(['admin', 'agencia', 'agenciasetup', 'setup', 'calango', 'equipe', 'suporte', 'certificado', 'cursos', 'aulas', 'perfil', 'entrar', 'api', 'aluno']);
export const OBJETIVOS = {
  automatizar: 'Automatizar os meus posts',
  clientes: 'Atender mais clientes com IA',
  design: 'Fazer design melhor com IA',
  comecar: 'Começar do zero na área',
};

const limpo = (v, n) => (v === undefined ? undefined : String(v || '').trim().slice(0, n) || null);

// Campos que o aluno muda (PATCH /eu). Devolve o que gravar.
export async function camposDoPerfil(env, aluno, d) {
  const dados = {};
  if (d.nome !== undefined) { const n = String(d.nome).trim().replace(/\s+/g, ' ').slice(0, 80); if (n.length < 2) throw new Erro(400, 'Escreva o seu nome.'); dados.nome = n; }
  if (d.instagram !== undefined) dados.instagram = String(d.instagram || '').trim().replace(/^@+/, '').replace(/[^a-z0-9._]/gi, '').slice(0, 30) || null;
  if (d.bio !== undefined) dados.bio = limpo(d.bio, 160);
  if (d.area !== undefined) dados.area = limpo(d.area, 40);
  if (d.cidade !== undefined) dados.cidade = limpo(d.cidade, 60);
  if (d.perfil_publico !== undefined) dados.perfil_publico = !!d.perfil_publico;
  if (d.no_ranking !== undefined) dados.no_ranking = !!d.no_ranking;
  if (d.objetivo !== undefined) dados.objetivo = OBJETIVOS[d.objetivo] ? d.objetivo : null;
  if (d.aulas_semana !== undefined) dados.aulas_semana = d.aulas_semana ? Math.max(1, Math.min(30, Math.round(Number(d.aulas_semana)) || 1)) : null;
  if (d.boas_vindas) dados.boas_vindas_em = new Date().toISOString();
  if (d.links !== undefined) {
    const links = (Array.isArray(d.links) ? d.links : []).slice(0, 4).map((l) => ({ titulo: String(l.titulo || '').trim().slice(0, 40), url: String(l.url || '').trim().slice(0, 300) }))
      .filter((l) => /^https:\/\/[^\s]+$/i.test(l.url));
    dados.links = links;
  }
  if (d.usuario !== undefined) {
    const u = String(d.usuario || '').trim().toLowerCase().replace(/^@+/, '');
    if (!u) dados.usuario = null;
    else {
      if (!/^[a-z0-9._]{3,30}$/.test(u)) throw new Erro(400, 'O usuário tem de 3 a 30 letras, números, ponto ou sublinhado.');
      if (RESERVADOS.has(u)) throw new Erro(400, 'Esse usuário é reservado. Escolha outro.');
      const ja = await db.um(env, 'alunos', { usuario: `eq.${u}`, id: `neq.${aluno.id}` }, 'id');
      if (ja) throw new Erro(409, 'Esse usuário já é de outra pessoa.');
      dados.usuario = u;
    }
  }
  return dados;
}

// Foto: o app recorta e reduz (400 x 400) antes de mandar.
export async function enviarFoto(env, aluno, d) {
  const m = String(d.imagem || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Erro(400, 'Mande a foto em JPG, PNG ou WEBP.');
  if (m[2].length > 700_000) throw new Erro(400, 'A foto ficou grande demais. Tente outra.');
  if (!(await db.rpc(env, 'bater_limite', { p_chave: `foto:${aluno.id}`, p_janela_s: 3600, p_max: 10 }))) throw new Erro(429, 'Muitas fotos seguidas. Espere um pouco.');
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  const nome = `alunos/${aluno.id}-${Date.now().toString(36)}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  const url = await enviarArquivo(env, 'midia', nome, bytes, `image/${m[1]}`);
  const [a] = await db.update(env, 'alunos', { id: `eq.${aluno.id}` }, { foto_url: url }, 'foto_url');
  return a;
}

export async function perfilPublico(env, usuario) {
  const a = await db.um(env, 'alunos', { usuario: `eq.${usuario}`, perfil_publico: 'is.true' }, 'id,nome,usuario,foto_url,instagram,bio,area,cidade,links,xp,moldura,criado_em');
  if (!a) return null;
  const [selos, certificados, criacoes] = await Promise.all([
    db.select(env, 'aluno_conquistas', { filtros: { aluno_id: `eq.${a.id}` }, select: 'ganha_em,conquista:conquistas(nome,descricao,raridade,cor,icone)', ordem: 'ganha_em.desc' }),
    db.select(env, 'certificados', { filtros: { aluno_id: `eq.${a.id}` }, select: 'codigo,curso_titulo,emitido_em', ordem: 'emitido_em.desc' }),
    db.select(env, 'entregas', { filtros: { aluno_id: `eq.${a.id}`, status: 'in.(aprovada,destaque)' }, select: 'id,titulo,imagem_url,link,status,curtidas,criado_em', ordem: 'criado_em.desc', limite: 24 }),
  ]);
  const { id, ...resto } = a;
  return { ...resto, nivel: nivel(a.xp), selos: selos.map((s) => ({ ...s.conquista, ganha_em: s.ganha_em })), certificados, criacoes };
}
