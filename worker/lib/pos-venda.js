// Depois da venda (Fase D): presente (o acesso vai para outra pessoa), plano equipe (vagas que o comprador distribui),
// indique um amigo (quem indicou ganha), a compra enviada pelo servidor para a Meta (API de Conversões, sem perder venda
// por bloqueador) e a nota fiscal na fila. Upsell e downsell de 1 toque na tela de obrigado.
import { db } from '../nucleo/db.js';
import { Erro } from '../nucleo/util.js';
import { cursoUrl, emailValido, garantirAluno, linkDeEntrada, normalEmail } from './alunos.js';
import { emailBoasVindas, emailPresente, enviarEmail } from './emails.js';
import { PONTOS, ganharXP, notificar } from './jogo.js';

const sha256 = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(t).trim().toLowerCase())))].map((b) => b.toString(16).padStart(2, '0')).join('');

// ---------------------------------------------------------------- presente
export async function entregarPresente(env, p) {
  const pr = p.presente || {};
  const dest = await garantirAluno(env, { email: normalEmail(pr.email), nome: pr.nome || undefined });
  await db.rpc(env, 'liberar_pedido_para', { p_pedido: p.id, p_aluno: dest.id });
  const curso = (p.itens[0] && p.itens[0].nome) || 'curso';
  const { link } = await linkDeEntrada(env, dest);
  const de = (p.aluno && p.aluno.nome) || 'Alguém';
  const m = emailPresente({ nome: dest.nome || pr.nome, de, curso, mensagem: pr.mensagem, link, entrar: `${cursoUrl(env)}/entrar` });
  await enviarEmail(env, { para: dest.email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: 'acesso', ref: `pedido:${p.id}` });
  return { link, para: dest.email };
}

// ---------------------------------------------------------------- plano equipe
export async function minhasVagas(env, aluno) {
  const pedidos = await db.select(env, 'pedidos', { filtros: { aluno_id: `eq.${aluno.id}`, status: 'eq.pago', vagas: 'gt.1' }, select: 'id,numero,itens,vagas,pago_em,vagas_equipe(email,criado_em)', ordem: 'pago_em.desc' });
  return pedidos.map((p) => ({ id: p.id, numero: p.numero, produto: (p.itens[0] && p.itens[0].nome) || '', vagas: p.vagas, usadas: 1 + (p.vagas_equipe || []).length, convidados: p.vagas_equipe || [] }));
}

export async function convidarParaVaga(env, aluno, pedidoId, d) {
  if (!/^[0-9a-f-]{36}$/.test(String(pedidoId))) throw new Erro(404, 'Compra não encontrada.');
  const p = await db.um(env, 'pedidos', { id: `eq.${pedidoId}`, aluno_id: `eq.${aluno.id}`, status: 'eq.pago' }, 'id,itens,vagas,vagas_equipe(email)');
  if (!p || p.vagas < 2) throw new Erro(404, 'Essa compra não tem vagas de equipe.');
  const email = normalEmail(d.email);
  if (!emailValido(email)) throw new Erro(400, 'Confira o e-mail.');
  if (email === normalEmail(aluno.email)) throw new Erro(400, 'Você já está nesta compra.');
  if ((p.vagas_equipe || []).some((v) => v.email === email)) throw new Erro(409, 'Essa pessoa já foi convidada.');
  if (1 + (p.vagas_equipe || []).length >= p.vagas) throw new Erro(409, 'Todas as vagas já foram usadas.');
  const dest = await garantirAluno(env, { email, nome: String(d.nome || '').trim().slice(0, 120) || undefined });
  await db.insert(env, 'vagas_equipe', { pedido_id: p.id, email, aluno_id: dest.id }, { select: 'id' });
  await db.rpc(env, 'liberar_pedido_para', { p_pedido: p.id, p_aluno: dest.id });
  const { link } = await linkDeEntrada(env, dest);
  const m = emailBoasVindas({ nome: dest.nome, curso: (p.itens[0] && p.itens[0].nome) || 'curso', link, entrar: `${cursoUrl(env)}/entrar` });
  await enviarEmail(env, { para: email, assunto: m.assunto, html: m.html, texto: m.texto, tipo: 'acesso', ref: `pedido:${p.id}` });
  return { ok: true };
}

// ---------------------------------------------------------------- indique um amigo
const ALFA = 'abcdefghjkmnpqrstuvwxyz23456789';
export async function minhaIndicacao(env, aluno) {
  let a = await db.um(env, 'alunos', { id: `eq.${aluno.id}` }, 'codigo_indicacao');
  let codigo = a && a.codigo_indicacao;
  for (let i = 0; !codigo && i < 4; i++) {
    const novo = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => ALFA[b % ALFA.length]).join('');
    const r = await db.update(env, 'alunos', { id: `eq.${aluno.id}`, codigo_indicacao: 'is.null' }, { codigo_indicacao: novo }, 'codigo_indicacao').catch(() => []);
    codigo = (r[0] && r[0].codigo_indicacao) || null;
    if (!codigo) a = await db.um(env, 'alunos', { id: `eq.${aluno.id}` }, 'codigo_indicacao'), codigo = a && a.codigo_indicacao;
  }
  const lista = await db.select(env, 'indicacoes', { filtros: { indicador_id: `eq.${aluno.id}` }, select: 'status,criado_em', ordem: 'criado_em.desc', limite: 50 });
  const oferta = await db.um(env, 'ofertas', { ativa: 'is.true', order: 'criado_em.asc' }, 'slug');
  const site = env.SITE_URL || 'https://agenciasetup.com.br';
  return { codigo, link: oferta ? `${site}/checkout/${oferta.slug}?indicado=${codigo}` : `${site}/cursos?indicado=${codigo}`, pagas: lista.filter((l) => l.status === 'paga').length, pendentes: lista.filter((l) => l.status === 'pendente').length };
}

export async function indicadorDe(env, codigo, emailComprador) {
  if (!/^[a-z0-9]{6,12}$/.test(String(codigo || ''))) return null;
  const a = await db.um(env, 'alunos', { codigo_indicacao: `eq.${codigo}` }, 'id,email');
  return a && normalEmail(a.email) !== normalEmail(emailComprador) ? a.id : null;
}

async function pagarIndicacao(env, p) {
  const [i] = await db.update(env, 'indicacoes', { pedido_id: `eq.${p.id}`, status: 'eq.pendente' }, { status: 'paga' }, 'indicador_id');
  if (!i) return;
  await ganharXP(env, i.indicador_id, 'indicacao', `indicacao:${p.id}`, { pontos: 50, selos: false });
  await db.insert(env, 'aluno_conquistas', { aluno_id: i.indicador_id, conquista_id: 'indicou' }, { ignorar: true, conflito: 'aluno_id,conquista_id', select: 'aluno_id' }).catch(() => {});
  await notificar(env, i.indicador_id, { tipo: 'selo', titulo: 'Sua indicação comprou!', texto: 'Obrigado por trazer gente nova para a turma. +50 XP.', link: '/perfil?aba=conquistas', ref: `indicacao:${p.id}` });
}

// ---------------------------------------------------------------- compra pelo servidor (Meta)
async function compraParaMeta(env, p) {
  const r = env.__rastreio || {};
  if (!r.meta_pixel || !env.META_CAPI_TOKEN || p.teste) return;
  const aluno = p.aluno || {};
  const user = { em: [await sha256(aluno.email || '')] };
  // Celular com "+" já tem o código do país (quem mora fora); o do Brasil leva o 55.
  if (aluno.celular) user.ph = [await sha256(`${String(aluno.celular).startsWith('+') ? '' : '55'}${String(aluno.celular).replace(/\D/g, '')}`)];
  const corpo = { data: [{ event_name: 'Purchase', event_time: Math.floor(Date.now() / 1000), event_id: p.id, action_source: 'website', event_source_url: `${env.SITE_URL || 'https://agenciasetup.com.br'}/checkout/obrigado`, user_data: user, custom_data: { currency: 'BRL', value: p.total_centavos / 100, order_id: String(p.numero) } }] };
  const resp = await fetch(`https://graph.facebook.com/v21.0/${r.meta_pixel}/events?access_token=${encodeURIComponent(env.META_CAPI_TOKEN)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
  if (!resp.ok) console.error('capi', resp.status, (await resp.text()).slice(0, 200));
}

// Tudo o que acontece depois do pagamento confirmado, além de liberar o acesso de quem comprou.
export async function depoisDoPagamento(env, pedidoId) {
  const p = await db.um(env, 'pedidos', { id: `eq.${pedidoId}` }, 'id,numero,total_centavos,teste,indicado_por,provedor,cobranca_id,aluno:alunos!pedidos_aluno_id_fkey(email,celular,nome)');
  if (!p) return;
  if (p.indicado_por) await pagarIndicacao(env, p).catch((e) => console.error('indicacao', e.message));
  await compraParaMeta(env, p).catch((e) => console.error('capi', e.message));
  // Nota fiscal: entra na fila (o relógio emite pelo Asaas, se estiver ligada em Integrações).
  const nf = await db.um(env, 'config', { chave: 'eq.nota_fiscal' }, 'valor').catch(() => null);
  if (nf && nf.valor && nf.valor.ativo && !p.teste && p.provedor === 'asaas') await db.insert(env, 'notas_fiscais', { pedido_id: p.id }, { ignorar: true, conflito: 'pedido_id', select: 'id' }).catch(() => {});
}

export async function cancelarIndicacao(env, pedidoId) {
  await db.update(env, 'indicacoes', { pedido_id: `eq.${pedidoId}` }, { status: 'cancelada' }, 'id').catch(() => {});
}

export { PONTOS };
