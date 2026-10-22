// Login do painel: Supabase Auth (só o login; os dados passam pela API do Worker).
// Modelo: admin/src/nucleo/auth.ts do olharondoniense.
import { createClient, type Session } from '@supabase/supabase-js';

declare const __SUPABASE_URL__: string;
declare const __SUPABASE_PUBLICA__: string;

export const supabase = createClient(__SUPABASE_URL__, __SUPABASE_PUBLICA__, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'implicit', storageKey: 'agenciasetup-painel' },
});

let sessaoAtual: Session | null = null;
supabase.auth.onAuthStateChange((_e, s) => { sessaoAtual = s; });

export async function token(): Promise<string | null> {
  if (sessaoAtual && sessaoAtual.expires_at && sessaoAtual.expires_at * 1000 > Date.now() + 30_000) return sessaoAtual.access_token;
  const { data } = await supabase.auth.getSession();
  sessaoAtual = data.session;
  return data.session ? data.session.access_token : null;
}

export async function entrar(email: string, senha: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
  if (error) throw new Error(traduz(error.message));
}

export async function sair() {
  await supabase.auth.signOut();
}

// Convite ou "esqueci a senha": o link traz o token, que só é usado quando a pessoa clica em continuar.
export async function aceitarLink(tokenHash: string, tipo: 'invite' | 'recovery') {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
  if (error) throw new Error(/expired|invalid/i.test(error.message) ? 'Este link venceu ou já foi usado. Peça um novo ao administrador.' : traduz(error.message));
}

export async function trocarSenha(senha: string) {
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) throw new Error(traduz(error.message));
}

export async function esqueciSenha(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${location.origin}/admin/entrar?tipo=recovery` });
  if (error) throw new Error(traduz(error.message));
}

export const senhaForte = (s: string) => s.length >= 10 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s);

function traduz(m: string) {
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha não conferem.';
  if (/Email not confirmed/i.test(m)) return 'Este e-mail ainda não aceitou o convite.';
  if (/Password should be/i.test(m) || /weak/i.test(m)) return 'Senha fraca: use pelo menos 10 caracteres, com letra maiúscula, minúscula e número.';
  if (/rate limit/i.test(m)) return 'Muitas tentativas. Espere alguns minutos.';
  if (/same password|different from the old/i.test(m)) return 'A senha nova precisa ser diferente da atual.';
  return m;
}
