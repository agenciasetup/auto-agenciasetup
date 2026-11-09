// Alunos da área de membros: cadastro (só quem comprou ou foi liberado), login e quem está pedindo.
// O login é o Supabase Auth do projeto (o mesmo da equipe), com o cadastro fechado: o Worker cria a conta na compra.
// O aluno nunca entra no /admin: lá a pessoa precisa estar na tabela equipe.
import { authAdmin, db } from '../nucleo/db.js';
import { conferirJwt } from '../nucleo/auth.js';
import { Erro } from '../nucleo/util.js';

const COLUNAS = 'id,auth_id,email,nome,celular,asaas_cliente,foto_url,instagram,bio,area,cidade,links,usuario,objetivo,aulas_semana,boas_vindas_em,perfil_publico,no_ranking,xp,moldura,sequencia,ultimo_dia,ultimo_acesso,criado_em';

export function cursoUrl(env) {
  return (env.CURSO_URL || 'https://curso.agenciasetup.com.br').replace(/\/+$/, '');
}

export const normalEmail = (e) => String(e || '').trim().toLowerCase();
export const emailValido = (e) => /^[^@\s]{1,64}@[^@\s]{1,190}\.[a-z]{2,24}$/i.test(e);

// Acha ou cria o aluno pelo e-mail. Nome e celular novos sobrescrevem os antigos.
export async function garantirAluno(env, { email, nome, celular }) {
  email = normalEmail(email);
  let a = await db.um(env, 'alunos', { email: `eq.${email}` }, COLUNAS);
  if (!a) {
    const novos = await db.insert(env, 'alunos', { email, nome: nome || email.split('@')[0], celular: celular || null }, { ignorar: true, conflito: 'email', select: COLUNAS });
    a = novos[0] || await db.um(env, 'alunos', { email: `eq.${email}` }, COLUNAS);
  } else if ((nome && nome !== a.nome) || (celular && celular !== a.celular)) {
    [a] = await db.update(env, 'alunos', { id: `eq.${a.id}` }, { ...(nome ? { nome } : {}), ...(celular ? { celular } : {}) }, COLUNAS);
  }
  return a;
}

// Link mágico do Supabase: devolve o usuário (id), o código de 6 números e o hash do link.
async function linkMagico(env, email) {
  const r = await authAdmin(env, '/admin/generate_link', { method: 'POST', body: JSON.stringify({ type: 'magiclink', email }) });
  const pr = r.properties || r;
  return { id: r.id || (r.user && r.user.id), codigo: pr.email_otp, hash: pr.hashed_token };
}

// Garante a conta de login do aluno (criada sem senha; ele entra pelo link ou pelo código).
export async function garantirLogin(env, aluno) {
  if (aluno.auth_id) return aluno.auth_id;
  let id = null;
  try {
    const u = await authAdmin(env, '/admin/users', { method: 'POST', body: JSON.stringify({ email: aluno.email, email_confirm: true, user_metadata: { nome: aluno.nome, aluno: true } }) });
    id = u.id;
  } catch (e) {
    // Já existe (ex.: alguém da equipe que comprou): pega o id pelo link mágico.
    id = (await linkMagico(env, aluno.email)).id;
  }
  if (!id) throw new Erro(502, 'Não consegui criar o login do aluno.');
  await db.update(env, 'alunos', { id: `eq.${aluno.id}` }, { auth_id: id }, 'id');
  return id;
}

// Link de entrada (24 horas, uma vez): abre o app já logado.
// base: o endereço do app (padrão curso.agenciasetup.com.br; o curso com marca em vídeo usa o da marca).
export async function linkDeEntrada(env, aluno, base = null) {
  await garantirLogin(env, aluno);
  const m = await linkMagico(env, aluno.email);
  if (!m.hash) throw new Error('sem hash');
  return { link: `${base || cursoUrl(env)}/entrar?token=${encodeURIComponent(m.hash)}`, codigo: m.codigo, hash: m.hash };
}

// Quem está pedindo na API do aluno. Equipe ativa também entra (para ver como aluno), sem precisar de compra.
export async function alunoPede(request, env, ctx) {
  const h = request.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) throw new Erro(401, 'Entre para continuar.');
  if (token.startsWith('as_')) throw new Erro(401, 'Entre com o seu e-mail.');
  const jwt = await conferirJwt(env, token);
  let a = await db.um(env, 'alunos', { auth_id: `eq.${jwt.sub}` }, COLUNAS);
  const email = normalEmail(jwt.email);
  if (!a && email) {
    a = await db.um(env, 'alunos', { email: `eq.${email}`, auth_id: 'is.null' }, COLUNAS);
    if (a) [a] = await db.update(env, 'alunos', { id: `eq.${a.id}` }, { auth_id: jwt.sub }, COLUNAS);
  }
  const equipe = await db.um(env, 'equipe', { auth_id: `eq.${jwt.sub}`, ativo: 'is.true' }, 'id,nome,papel');
  if (!a && equipe && email) {
    a = await garantirAluno(env, { email, nome: equipe.nome });
    [a] = await db.update(env, 'alunos', { id: `eq.${a.id}` }, { auth_id: jwt.sub }, COLUNAS);
  }
  if (!a) throw new Erro(403, 'Este login não tem curso. Entre com o e-mail que você usou na compra.', { codigo: 'sem-curso' });
  if (!a.ultimo_acesso || Date.now() - new Date(a.ultimo_acesso).getTime() > 10 * 60_000) {
    ctx.waitUntil(db.update(env, 'alunos', { id: `eq.${a.id}` }, { ultimo_acesso: new Date().toISOString() }, 'id').catch(() => {}));
  }
  return { ...a, equipe: equipe || null };
}
