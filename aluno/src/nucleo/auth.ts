// Login do aluno: Supabase Auth (só o login; os dados passam pela API do Worker). Cadastro fechado: a conta nasce na compra.
// Três jeitos de entrar: o link do e-mail, o código de 6 números e a senha (se a pessoa criou uma).
import { createClient, type Session } from '@supabase/supabase-js';

declare const __SUPABASE_URL__: string;
declare const __SUPABASE_PUBLICA__: string;

export const supabase = createClient(__SUPABASE_URL__, __SUPABASE_PUBLICA__, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'implicit', storageKey: 'agenciasetup-aluno' },
});

let sessao: Session | null = null;
supabase.auth.onAuthStateChange((_e, s) => { sessao = s; });

export async function token(): Promise<string | null> {
  if (sessao && sessao.expires_at && sessao.expires_at * 1000 > Date.now() + 30_000) return sessao.access_token;
  const { data } = await supabase.auth.getSession();
  sessao = data.session;
  return data.session ? data.session.access_token : null;
}

export async function temSessao() {
  return !!(await token());
}

// Link do e-mail (ou o atalho logo depois de pagar): o hash vira sessão.
export async function entrarComLink(hash: string) {
  let r = await supabase.auth.verifyOtp({ token_hash: hash, type: 'magiclink' });
  if (r.error) r = await supabase.auth.verifyOtp({ token_hash: hash, type: 'email' });
  if (r.error) throw new Error(/expired|invalid/i.test(r.error.message) ? 'Este link venceu ou já foi usado. Peça um código com o seu e-mail.' : traduz(r.error.message));
}

export async function entrarComCodigo(email: string, codigo: string) {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: codigo.replace(/\D/g, ''), type: 'email' });
  if (error) throw new Error(/expired|invalid/i.test(error.message) ? 'Código errado ou vencido. Confira ou peça outro.' : traduz(error.message));
}

export async function entrarComSenha(email: string, senha: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
  if (error) throw new Error(/Invalid login/i.test(error.message) ? 'E-mail ou senha não conferem. Você pode entrar com um código.' : traduz(error.message));
}

export async function criarSenha(senha: string) {
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) throw new Error(traduz(error.message));
}

export async function sair() {
  await supabase.auth.signOut();
}

export const senhaForte = (s: string) => s.length >= 10 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s);

function traduz(m: string) {
  if (/rate limit/i.test(m)) return 'Muitas tentativas. Espere alguns minutos.';
  if (/Password should be|weak/i.test(m)) return 'Senha fraca: use pelo menos 10 caracteres, com letra maiúscula, minúscula e número.';
  if (/same password|different from the old/i.test(m)) return 'A senha nova precisa ser diferente da atual.';
  if (/fetch|network/i.test(m)) return 'Sem conexão. Confira a internet e tente de novo.';
  return m;
}
