// Ajusta o login do Supabase para o painel: só por convite, voltas só para /admin, senha forte.
// Pode rodar de novo (sobrescreve com os mesmos valores). Uso: node scripts/auth-config.mjs
//
// Os e-mails do Supabase ficam com o texto padrão: no plano grátis, mudar o modelo exige um SMTP próprio.
// Por isso o convite e a troca de senha saem como link gerado no painel (Equipe), que o administrador envia.
import { gestao } from './env.mjs';

await gestao('/config/auth', {
  method: 'PATCH',
  body: JSON.stringify({
    site_url: 'https://agenciasetup.com.br/admin/',
    uri_allow_list: 'https://agenciasetup.com.br/admin/**,http://localhost:8787/admin/**,http://127.0.0.1:8787/admin/**',
    disable_signup: true,
    password_min_length: 10,
    // Link de convite e de troca de senha vale 24 horas (o padrão é 1 hora).
    mailer_otp_exp: 86400,
  }),
});
const c = await gestao('/config/auth');
console.log('login do painel ajustado:', { site_url: c.site_url, cadastro_aberto: !c.disable_signup, senha_minima: c.password_min_length, link_vale_horas: c.mailer_otp_exp / 3600 });
