// Integrações (painel > Integrações, só Administrador): Resend, Claude (tutor), Panda, Turnstile e rastreamento.
// Cada chave é conferida no próprio serviço antes de guardar e fica cifrada no banco (lib/integracoes.js).
import Anthropic from '@anthropic-ai/sdk';
import { auditar, exigir } from '../nucleo/auth.js';
import { Erro } from '../nucleo/util.js';
import { INTEGRACOES, gravar, prepararIntegracoes, situacao } from './integracoes.js';
import { MODELOS, PADRAO } from './tutor.js';
import * as stripe from '../pagamento/stripe.js';
import { SITES, lerConta, sitesDaConta } from './searchconsole.js';

export async function listarIntegracoes(x) {
  exigir(x.u, 'integracoes.configurar');
  await prepararIntegracoes(x.env);
  return Promise.all(Object.keys(INTEGRACOES).filter((n) => n !== 'asaas').map((n) => situacao(x.env, n)));
}

const so = (v, re, msg) => { const t = String(v || '').trim(); if (t && !re.test(t)) throw new Erro(400, msg); return t; };

// Confere a chave no serviço. Devolve um resumo para mostrar (sem segredo).
async function testar(nome, d, atual) {
  if (nome === 'email' && d.chave) {
    const r = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${d.chave}` } });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      const dom = (j.data || []).find((x) => x.name === (d.dominio || atual.dominio || 'envio.agenciasetup.com.br'));
      return { ok: true, resumo: dom ? `Domínio ${dom.name}: ${dom.status === 'verified' ? 'verificado' : dom.status}` : 'Chave aceita' };
    }
    // Chave "Sending access" não lê os domínios: o Resend responde 401 restricted_api_key, e ela serve para enviar.
    if (j.name === 'restricted_api_key') return { ok: true, resumo: 'Chave aceita (só envio)' };
    if (r.status === 400 || r.status === 401 || r.status === 403) throw new Erro(400, 'O Resend não aceitou essa chave.');
    throw new Erro(502, 'Não consegui falar com o Resend agora. Tente de novo.');
  }
  if (nome === 'ia' && d.chave) {
    const modelo = d.modelo_tutor || atual.modelo_tutor || PADRAO.modelo_tutor;
    try {
      const m = await new Anthropic({ apiKey: d.chave, maxRetries: 0, timeout: 20_000 }).models.retrieve(modelo);
      return { ok: true, resumo: `Chave aceita: ${m.display_name || modelo}` };
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) throw new Erro(400, 'A Anthropic não aceitou essa chave.');
      if (e instanceof Anthropic.NotFoundError) throw new Erro(400, 'Esse modelo não está disponível nessa chave.');
      throw new Erro(502, 'Não consegui falar com a Anthropic agora. Tente de novo.');
    }
  }
  if (nome === 'panda' && d.chave) {
    const r = await fetch('https://api-v2.pandavideo.com.br/videos?limit=1', { headers: { Authorization: d.chave, accept: 'application/json' } });
    if (r.status === 401 || r.status === 403) throw new Erro(400, 'O Panda não aceitou essa chave.');
    return { ok: r.ok, resumo: r.ok ? 'Chave aceita' : `Panda respondeu ${r.status}` };
  }
  if (nome === 'bunny' && d.chave) {
    const lib = d.biblioteca || atual.biblioteca;
    if (!lib) throw new Erro(400, 'Preencha o número da biblioteca do Bunny.');
    const r = await fetch(`https://video.bunnycdn.com/library/${lib}/videos?page=1&itemsPerPage=1`, { headers: { AccessKey: d.chave, accept: 'application/json' } });
    if (r.status === 401 || r.status === 403) throw new Erro(400, 'O Bunny não aceitou essa chave para essa biblioteca.');
    if (r.status === 404) throw new Erro(400, 'Não achei essa biblioteca no Bunny. Confira o número.');
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, resumo: r.ok ? `Chave aceita: ${j.totalItems ?? 0} vídeos na biblioteca` : `Bunny respondeu ${r.status}` };
  }
  if (nome === 'stripe' && d.chave) {
    try {
      const c = await stripe.testarChave(d.chave);
      return { ok: true, resumo: `Chave aceita: ${c.nome || 'conta'} (${c.pais || '?'}), ${c.producao ? 'produção' : 'modo de teste'}` };
    } catch (e) {
      if (e instanceof Erro && e.status === 400) throw new Erro(400, 'O Stripe não aceitou essa chave.');
      throw new Erro(502, 'Não consegui falar com o Stripe agora. Tente de novo.');
    }
  }
  if (nome === 'search_console' && d.conta) {
    const conta = lerConta(d.conta);
    const sites = await sitesDaConta(conta);
    const nossos = sites.filter((s) => SITES.includes(s.site));
    if (!nossos.length) throw new Erro(400, `A chave funciona, mas a conta robô ainda não vê os sites. No Search Console, em Configurações > Usuários e permissões, adicione ${conta.email} como Restrito em agenciasetup.com.br e em agenciasetup.com.`);
    return { ok: true, resumo: `Conta aceita: lê ${nossos.map((s) => s.site.replace('sc-domain:', '')).join(' e ')}`, sites: nossos.map((s) => s.site) };
  }
  if (nome === 'turnstile' && d.segredo) {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: d.segredo, response: 'teste' }) });
    const j = await r.json().catch(() => ({}));
    if ((j['error-codes'] || []).includes('invalid-input-secret')) throw new Erro(400, 'A Cloudflare não aceitou esse segredo do Turnstile.');
    return { ok: true, resumo: 'Segredo aceito' };
  }
  return null;
}

export async function salvarIntegracao(x, nome, d) {
  exigir(x.u, 'integracoes.configurar');
  if (!INTEGRACOES[nome] || nome === 'asaas') throw new Erro(404, 'Integração desconhecida.');
  const atual = (await situacao(x.env, nome)).publicos;
  const limpo = { ...d };
  if (nome === 'email') {
    so(d.chave, /^re_[A-Za-z0-9_]{10,}$/, 'A chave do Resend começa com re_.');
    so(d.webhook, /^whsec_[A-Za-z0-9+/=]{20,}$/, 'O segredo do aviso do Resend começa com whsec_.');
    if (d.de !== undefined && d.de && !/^[^<>@]{0,60}<[^<>\s@]+@[^<>\s@]+\.[a-z]{2,}>$|^[^<>\s@]+@[^<>\s@]+\.[a-z]{2,}$/i.test(d.de)) throw new Erro(400, 'Remetente no formato: Agência Setup <cursos@envio.agenciasetup.com.br>');
    so(d.responder_para, /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i, 'E-mail de resposta inválido.');
  }
  if (nome === 'ia') {
    so(d.chave, /^sk-ant-[A-Za-z0-9_-]{20,}$/, 'A chave da Anthropic começa com sk-ant-.');
    if (d.modelo_tutor !== undefined && !MODELOS[d.modelo_tutor]) throw new Erro(400, 'Modelo inválido.');
    if (d.limite_dia !== undefined) limpo.limite_dia = Math.max(1, Math.min(200, Math.round(Number(d.limite_dia)) || PADRAO.limite_dia));
    if (d.teto_mes_usd !== undefined) limpo.teto_mes_usd = Math.max(1, Math.min(5000, Number(d.teto_mes_usd) || PADRAO.teto_mes_usd));
    if (d.ativo !== undefined) limpo.ativo = !!d.ativo;
    if (d.relatorio !== undefined) limpo.relatorio = !!d.relatorio;
    if (d.instrucoes !== undefined) limpo.instrucoes = String(d.instrucoes || '').slice(0, 2000);
  }
  if (nome === 'nota_fiscal') {
    if (d.ativo !== undefined) limpo.ativo = !!d.ativo;
    if (d.iss_pct !== undefined) limpo.iss_pct = Math.max(0, Math.min(5, Number(String(d.iss_pct).replace(',', '.')) || 0));
    so(d.servico_codigo, /^[0-9.\-]{2,20}$/, 'O código do serviço tem números e pontos (ex.: 1.05).');
  }
  if (nome === 'stripe') {
    so(d.chave, /^(sk|rk)_(live|test)_[A-Za-z0-9]{10,}$/, 'A chave do Stripe começa com rk_live_ (restrita, a recomendada) ou sk_live_.');
    so(d.aviso, /^whsec_[A-Za-z0-9]{10,}$/, 'O segredo do aviso do Stripe começa com whsec_.');
  }
  if (nome === 'panda') so(d.biblioteca, /^[a-z0-9-]{6,60}$/i, 'O id da biblioteca do Panda tem letras, números e hífen.');
  if (nome === 'bunny') {
    so(d.biblioteca, /^\d{3,12}$/, 'O número da biblioteca do Bunny só tem números (aparece no endereço: /stream/<número>/).');
    so(d.chave, /^[A-Za-z0-9-]{20,100}$/, 'A chave da API do Bunny tem letras, números e hífen (Stream > biblioteca > API).');
    so(d.token, /^[A-Za-z0-9-]{20,100}$/, 'A chave do token tem letras, números e hífen (Stream > biblioteca > Security).');
  }
  if (nome === 'turnstile') { so(d.site, /^0x[A-Za-z0-9_-]{10,}$/, 'A chave do site do Turnstile começa com 0x.'); so(d.segredo, /^0x[A-Za-z0-9_-]{10,}$/, 'O segredo do Turnstile começa com 0x.'); }
  if (nome === 'rastreio') {
    so(d.meta_pixel, /^\d{10,20}$/, 'O id do Pixel da Meta só tem números.');
    so(d.ga4, /^G-[A-Z0-9]{4,15}$/, 'O id do GA4 começa com G-.');
    so(d.google_ads, /^AW-\d{6,15}$/, 'O id do Google Ads começa com AW-.');
  }
  if (nome === 'search_console' && d.conta) {
    // Guarda só o necessário da chave (e-mail e chave privada), cifrado; o e-mail fica visível para conferir.
    const c = lerConta(d.conta);
    limpo.conta = c.json;
    limpo.email = c.email;
  }
  const t = await testar(nome, limpo, atual);
  if (t && t.sites) limpo.sites = t.sites;
  await gravar(x.env, nome, limpo, t ? { teste: { resumo: t.resumo, em: new Date().toISOString() } } : {});
  await auditar(x.env, x.u, `integracao.${nome}`, `config:${nome}`, { campos: Object.keys(d).filter((k) => !INTEGRACOES[nome].segredos.includes(k)), segredo: INTEGRACOES[nome].segredos.some((s) => d[s]) });
  await prepararIntegracoes(x.env);
  return situacao(x.env, nome);
}
