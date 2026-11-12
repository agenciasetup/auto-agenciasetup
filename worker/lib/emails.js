// E-mails da área de membros (acesso, código de entrada, recibo). Saem pelo Resend quando há RESEND_CHAVE.
// Sem a chave, ficam gravados como "simulado" na tabela emails: dá para ver o link no painel (Alunos) e nos testes.
import { db } from '../nucleo/db.js';
import { esc } from '../nucleo/util.js';
import { prepararIntegracoes } from './integracoes.js';

// Domínios reservados para teste (example.com, .test, .invalid...): nunca saem de verdade. E-mail que volta
// (bounce) derruba a reputação do domínio de envio, e os testes automáticos usam esses endereços.
const DOMINIO_TESTE = /@([a-z0-9-]+\.)*(example\.(com|net|org)|[a-z0-9-]+\.(test|example|invalid|localhost))$/i;

// de: outro nome de quem manda (curso com marca própria), sempre no domínio de envio. anexos: [{ filename, path }], com
// path um link que o Resend baixa na hora (o PDF do curso de leitura vai assim, sem passar o arquivo pelo Worker).
// E-mails que só existem em português (lembretes, desafio, resposta da equipe, resumo, certificado...): não saem para quem
// comprou só o curso em inglês (alunos.idioma = 'en'). Os de acesso, código e reembolso têm versão em inglês.
const SO_EM_PORTUGUES = new Set(['resposta', 'desafio', 'entrega', 'evento', 'recuperacao', 'parou', 'resumo', 'selo', 'modulo', 'certificado']);

export async function enviarEmail(env, { para, assunto, tipo, html, texto, ref, de = null, anexos = null }) {
  if (SO_EM_PORTUGUES.has(tipo)) {
    const a = await db.um(env, 'alunos', { email: `eq.${String(para || '').trim().toLowerCase()}` }, 'idioma').catch(() => null);
    if (a && a.idioma === 'en') return { ignorado: true };
  }
  const real = !!env.RESEND_CHAVE && !DOMINIO_TESTE.test(String(para || '').trim());
  const [linha] = await db.insert(env, 'emails', { para, assunto, tipo, html, ref, status: real ? 'fila' : 'simulado' }, { select: 'id' });
  if (!real) {
    if (env.AMBIENTE === 'local') console.log(`[e-mail simulado] ${tipo} para ${para}: ${assunto}`);
    return { simulado: true, id: linha.id };
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_CHAVE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: de || env.EMAIL_DE || 'Agência Setup <cursos@envio.agenciasetup.com.br>', reply_to: env.EMAIL_RESPONDER || 'contato@agenciasetup.com.br', to: [para], subject: assunto, html, text: texto,
        ...(anexos && anexos.length ? { attachments: anexos } : {}),
      }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
    // O id do Resend liga a linha aos avisos de entregue, aberto e clicado (webhookResend, abaixo).
    const enviado = await r.json().catch(() => ({}));
    const resendId = enviado && typeof enviado.id === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(enviado.id) ? enviado.id : null;
    await db.update(env, 'emails', { id: `eq.${linha.id}` }, { status: 'enviado', enviado_em: new Date().toISOString(), ...(resendId ? { resend_id: resendId } : {}) }, 'id');
    return { id: linha.id };
  } catch (e) {
    console.error('email', e.message);
    await db.update(env, 'emails', { id: `eq.${linha.id}` }, { status: 'erro', erro: String(e.message).slice(0, 300) }, 'id').catch(() => {});
    return { erro: true, id: linha.id };
  }
}

// ---------------------------------------------------------------- aviso do Resend (webhook): entregue, aberto, clicado...
// O Resend chama /api/resend/webhook a cada evento, assinado no padrão Svix: cabeçalhos svix-id, svix-timestamp e
// svix-signature ("v1,<base64>", um ou mais separados por espaço), HMAC-SHA256 de "id.timestamp.corpo" com o segredo
// whsec_ (base64 depois do prefixo). O segredo fica cifrado em Integrações > Resend (scripts/resend-rastreio.mjs liga).
// Grava só a hora do primeiro evento de cada tipo, pelo id do Resend; o conteúdo do aviso não é guardado.
const EVENTOS_RESEND = { 'email.delivered': 'entregue_em', 'email.opened': 'aberto_em', 'email.clicked': 'clicado_em', 'email.bounced': 'devolvido_em', 'email.complained': 'spam_em' };
const MAX_AVISO_RESEND = 64_000;
const TOLERANCIA_S = 5 * 60;

const iguais = (a, b) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

async function assinaturaSvix(segredo, id, ts, cabecalho, corpo) {
  let bytes;
  try { bytes = Uint8Array.from(atob(String(segredo).trim().replace(/^whsec_/, '')), (c) => c.charCodeAt(0)); } catch { return false; }
  const chave = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prefixo = new TextEncoder().encode(`${id}.${ts}.`);
  const dados = new Uint8Array(prefixo.length + corpo.length);
  dados.set(prefixo);
  dados.set(corpo, prefixo.length);
  const esperado = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', chave, dados))));
  return cabecalho.split(' ').slice(0, 10).some((parte) => {
    const [versao, assinatura] = parte.split(',');
    return versao === 'v1' && !!assinatura && iguais(assinatura, esperado);
  });
}

export async function webhookResend(request, env, ctx) {
  if (request.method !== 'POST') return new Response('Método não permitido', { status: 405 });
  const id = request.headers.get('svix-id') || '';
  const ts = request.headers.get('svix-timestamp') || '';
  const assinatura = request.headers.get('svix-signature') || '';
  if (!id || id.length > 100 || !/^\d{9,11}$/.test(ts) || !assinatura || assinatura.length > 1000) return new Response('Assinatura inválida', { status: 401 });
  if (Math.abs(Date.now() / 1000 - Number(ts)) > TOLERANCIA_S) return new Response('Aviso fora da hora', { status: 401 });
  if (Number(request.headers.get('content-length') || 0) > MAX_AVISO_RESEND) return new Response('Grande demais', { status: 413 });
  const bruto = new Uint8Array(await request.arrayBuffer());
  if (bruto.byteLength > MAX_AVISO_RESEND) return new Response('Grande demais', { status: 413 });
  await prepararIntegracoes(env).catch(() => {});
  if (!env.RESEND_WEBHOOK_SEGREDO) return new Response('Aviso do Resend não configurado', { status: 503 });
  if (!(await assinaturaSvix(env.RESEND_WEBHOOK_SEGREDO, id, ts, assinatura, bruto))) return new Response('Assinatura inválida', { status: 401 });
  let corpo;
  try { corpo = JSON.parse(new TextDecoder().decode(bruto)); } catch { return new Response('JSON inválido', { status: 400 }); }
  const campo = EVENTOS_RESEND[corpo && corpo.type];
  const emailId = corpo && corpo.data && corpo.data.email_id;
  if (campo && typeof emailId === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(emailId)) {
    const t = Date.parse(corpo.created_at);
    const quando = new Date(Number.isFinite(t) && Math.abs(Date.now() - t) < 30 * 86_400_000 ? t : Date.now()).toISOString();
    // Só a primeira vez de cada tipo (o Resend manda de novo se a resposta atrasar, e cada abertura gera um aviso).
    ctx.waitUntil(db.update(env, 'emails', { resend_id: `eq.${emailId}`, [campo]: 'is.null' }, { [campo]: quando }, 'id')
      .then((r) => console.log(`aviso resend: ${corpo.type}, ${r.length ? 'gravado' : 'sem linha nova'}`))
      .catch((e) => console.error('aviso resend', e && e.message)));
  }
  return new Response('ok');
}

// Moldura dos e-mails: fundo claro (lê bem em qualquer app de e-mail), um botão laranja, texto curto.
function moldura(titulo, corpoHtml) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;color:#18181b">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<div style="font-weight:700;font-size:15px;letter-spacing:-.01em;margin-bottom:20px"><img src="https://agenciasetup.com.br/img/logo-setup-128.png" width="28" height="28" alt="" style="display:inline-block;vertical-align:middle;margin-right:8px;border:0">Agência Setup</div>
<div style="background:#fff;border-radius:18px;padding:28px 24px;border:1px solid #e4e4e7">
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.2;letter-spacing:-.02em">${esc(titulo)}</h1>
${corpoHtml}
</div>
<p style="font-size:12px;color:#71717a;margin:18px 4px 0">Você recebeu este e-mail porque comprou ou entrou num curso da Agência Setup. Dúvidas: contato@agenciasetup.com.br</p>
</div></body></html>`;
}
const botao = (href, txt) => `<p style="margin:22px 0"><a href="${esc(href)}" style="display:inline-block;background:#ff7a00;color:#170900;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px">${esc(txt)}</a></p>`;
const p = (t) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#3f3f46">${t}</p>`;

export function emailBoasVindas({ nome, curso, link, entrar }) {
  const primeiro = esc(String(nome || '').split(' ')[0] || 'tudo certo');
  return {
    assunto: `Seu acesso ao ${curso} está pronto`,
    html: moldura(`Tudo pronto, ${primeiro}!`, p(`O pagamento foi confirmado e o <b>${esc(curso)}</b> já está liberado para você.`) + botao(link, 'Entrar no curso')
      + p(`O botão vale por 24 horas. Depois disso, entre em <a href="${esc(entrar)}" style="color:#c2410c">${esc(entrar.replace(/^https?:\/\//, ''))}</a> com este e-mail: a gente manda um código na hora.`)),
    texto: `O pagamento foi confirmado e o ${curso} já está liberado. Entrar no curso: ${link}\nDepois de 24 horas, entre em ${entrar} com este e-mail e peça um código.`,
  };
}

// Entrega fora da nossa área (oferta com checkout.entrega.tipo 'externa', ex.: o Combo Black Calango, entregue na
// Hubla à mão pelo dono): confirma o pagamento e diz onde e como o acesso chega. Sem botão de entrar.
export function emailEntregaExterna({ nome, email, oferta, plataforma = 'Hubla', o_que, prazo, dias, vitalicio = false, aqui = [] }) {
  const primeiro = esc(String(nome || '').split(' ')[0] || 'tudo certo');
  const oq = o_que || oferta;
  const quando = prazo ? ` Isso acontece ${prazo}.` : '';
  const duracao = vitalicio ? 'O acesso vitalício que você levou já vem junto: os cursos ficam com você pra sempre.'
    : dias ? `O acesso vale por ${dias === 365 ? '1 ano' : `${dias} dias`}.` : '';
  const onde = `O acesso chega${email ? ` em <b>${esc(email)}</b>` : ' neste e-mail'}, num convite da ${esc(plataforma)}: é só aceitar.`;
  const junto = aqui.length ? `${aqui.length > 1 ? 'Os cursos' : 'O curso'} ${aqui.join(' e ')} já ${aqui.length > 1 ? 'estão liberados' : 'está liberado'} na nossa área de alunos: o link de entrada chega num e-mail separado.` : '';
  return {
    assunto: `Recebemos seu pagamento: ${oferta}`,
    html: moldura(`Tudo certo, ${primeiro}!`, p(`O pagamento do <b>${esc(oferta)}</b> foi confirmado.`)
      + p(`Agora a gente libera ${esc(oq)} para você na <b>${esc(plataforma)}</b>, a plataforma onde os cursos estão.${esc(quando)} ${onde}`)
      + (duracao ? p(esc(duracao)) : '')
      + (junto ? p(esc(junto)) : '')
      + p('Qualquer dúvida, é só responder este e-mail ou chamar a gente no Instagram <a href="https://instagram.com/agenciasetup" style="color:#c2410c">@agenciasetup</a>.')),
    texto: `O pagamento do ${oferta} foi confirmado. Agora a gente libera ${oq} para você na ${plataforma}.${quando} O acesso chega${email ? ` em ${email}` : ' neste e-mail'}, num convite da ${plataforma}: é só aceitar.${duracao ? ` ${duracao}` : ''}${junto ? ` ${junto}` : ''} Dúvidas: responda este e-mail ou chame no Instagram @agenciasetup.`,
  };
}

// ---------------------------------------------------------------- arquivo com licença (a Família Calango, 11/11/2026)
// Pago o pedido, a cópia identificada é feita no Mac (o número da licença vai dentro de cada arquivo) e chega depois:
// primeiro o "recebemos", depois o link da tela de download (lib/acoes-arquivos.js). Nada de login nem de curso.
export function emailArquivoAguarde({ nome, oferta, o_que, prazo, numero }) {
  const primeiro = esc(String(nome || '').split(' ')[0] || 'tudo certo');
  const oq = o_que || oferta;
  const quando = prazo ? ` ${prazo}` : '';
  return {
    assunto: `Recebemos seu pagamento: ${oferta}`,
    html: moldura(`Tudo certo, ${primeiro}!`, p(`O pagamento do <b>${esc(oferta)}</b> foi confirmado (pedido nº ${esc(numero)}).`)
      + p(`Agora a gente prepara ${esc(oq)}, com o número da sua licença gravado dentro dos arquivos. Ela chega neste e-mail${esc(quando)}, com o link para baixar.`)
      + p('Antes de baixar, você confirma de novo que leu e aceita a Licença de Uso e o Termo de Aceite.')
      + p('Qualquer dúvida, é só responder este e-mail ou chamar a gente no Instagram <a href="https://instagram.com/agenciasetup" style="color:#c2410c">@agenciasetup</a>.')),
    texto: `O pagamento do ${oferta} foi confirmado (pedido nº ${numero}). Agora a gente prepara ${oq}, com o número da sua licença gravado dentro dos arquivos. Ela chega neste e-mail${quando}, com o link para baixar. Antes de baixar, você confirma de novo que leu e aceita a Licença de Uso e o Termo de Aceite. Dúvidas: responda este e-mail ou chame no Instagram @agenciasetup.`,
  };
}

export function emailArquivoPronto({ nome, oferta, o_que, link, numero }) {
  const primeiro = esc(String(nome || '').split(' ')[0] || 'tudo pronto');
  const oq = o_que || oferta;
  return {
    assunto: `Pronto para baixar: ${oferta}`,
    html: moldura(`Está pronta, ${primeiro}!`, p(`${esc(oq.charAt(0).toUpperCase() + oq.slice(1))} está pronta para baixar (pedido nº ${esc(numero)}).`)
      + botao(link, 'Baixar agora')
      + p('<b>Arquivo licenciado e identificado.</b> Esta cópia leva o número da sua licença. É proibido repassar, revender ou compartilhar os arquivos. Antes de baixar, você confirma o aceite da licença.')
      + p('O link é só seu: guarde este e-mail para baixar de novo quando precisar.')
      + p('Qualquer dúvida, é só responder este e-mail ou chamar a gente no Instagram <a href="https://instagram.com/agenciasetup" style="color:#c2410c">@agenciasetup</a>.')),
    texto: `${oq.charAt(0).toUpperCase() + oq.slice(1)} está pronta para baixar (pedido nº ${numero}): ${link}\n\nArquivo licenciado e identificado. Esta cópia leva o número da sua licença. É proibido repassar, revender ou compartilhar os arquivos. Antes de baixar, você confirma o aceite da licença. O link é só seu: guarde este e-mail para baixar de novo quando precisar. Dúvidas: responda este e-mail ou chame no Instagram @agenciasetup.`,
  };
}

// ---------------------------------------------------------------- curso com marca própria (tema "leitura")
// Papel claro, título em serifa, botão escuro e a cruz dourada: a mesma cara do app do curso. Texto curto e direto,
// pensado para quem tem dificuldade com e-mail: o PDF já vai anexado e o botão principal é um só.
function molduraMarca(marca, titulo, corpoHtml) {
  const zap = marca.whatsapp ? String(marca.whatsapp).replace(/\D/g, '') : '';
  const tel = zap.replace(/^55(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#EDEBE6;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#232326">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<div style="font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:19px;margin-bottom:18px"><span style="color:#A87B2D;font-size:22px;margin-right:8px">&#10013;</span>${esc(marca.nome)}</div>
<div style="background:#FAF9F6;border-radius:22px;padding:28px 24px">
<h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.15">${esc(titulo)}</h1>
${corpoHtml}
</div>
<p style="font-size:13px;color:#7E7E84;margin:18px 4px 0;line-height:1.5">Você recebeu este e-mail porque comprou o ${esc(marca.nome)}.${zap ? ` Precisa de ajuda? Fale com a gente no WhatsApp <a href="https://wa.me/${zap}" style="color:#7E7E84">${esc(tel)}</a>.` : ''}</p>
</div></body></html>`;
}
const botaoMarca = (href, txt) => `<p style="margin:22px 0"><a href="${esc(href)}" style="display:inline-block;background:#232326;color:#F2F2F4;text-decoration:none;font-weight:700;font-size:17px;padding:16px 26px;border-radius:999px">${esc(txt)}</a></p>`;
const pm = (t) => `<p style="margin:0 0 12px;font-size:17px;line-height:1.6;color:#4A4A4F">${t}</p>`;

export function emailLivro({ nome, marca, ler, baixar }) {
  const primeiro = esc(String(nome || '').split(' ')[0] || '');
  return {
    assunto: `Seu livro ${marca.nome} chegou`,
    html: molduraMarca(marca, `Seu livro chegou${primeiro ? `, ${primeiro}` : ''}`,
      pm(baixar ? 'O PDF completo está <b>anexado a este e-mail</b>. Toque nele para abrir. Ele é seu para sempre.' : 'O pagamento foi confirmado e o seu acesso está liberado.')
      + pm('Se preferir ler pelo celular, com letra grande e o botão de ouvir:') + botaoMarca(ler, 'Ler no celular')
      + (baixar ? pm(`Não achou o anexo? <a href="${esc(baixar)}" style="color:#A87B2D;font-weight:700">Baixe o PDF por aqui</a>.`) : '')
      + pm('Guarde este e-mail: o botão "Ler no celular" funciona por 30 dias. Depois, é só entrar com o seu e-mail.')),
    texto: `Seu livro ${marca.nome} chegou.${baixar ? ` O PDF está anexado. Baixar: ${baixar}` : ''}\nLer no celular: ${ler}`,
  };
}

export function emailCodigo({ codigo, link, marca = null }) {
  if (marca && marca.idioma === 'en') {
    return {
      assunto: `Your login code: ${codigo}`,
      html: molduraEn(marca, 'Your login code', pe('Type this code on the login screen:') + `<p style="font-size:34px;font-weight:800;letter-spacing:.18em;margin:6px 0 18px">${esc(codigo)}</p>`
        + pe('Or log in directly with the button. The code and the button only work for a short time, and only once.') + botao(link, 'Log in now') + pe("Didn't ask for this? You can ignore this email.")),
      texto: `Your login code: ${codigo}\nOr log in directly: ${link}\nDidn't ask for this? You can ignore it.`,
    };
  }
  if (marca) {
    return {
      assunto: `Seu código de entrada: ${codigo}`,
      html: molduraMarca(marca, 'Seu código de entrada', pm('Digite este código na tela de entrada:') + `<p style="font-size:36px;font-weight:800;letter-spacing:.18em;margin:6px 0 18px">${esc(codigo)}</p>`
        + pm('Ou toque no botão para entrar direto. O código e o botão valem por pouco tempo.') + botaoMarca(link, 'Entrar agora') + pm('Não pediu? Pode ignorar este e-mail.')),
      texto: `Seu código de entrada: ${codigo}\nOu entre direto: ${link}`,
    };
  }
  return {
    assunto: `Seu código de entrada: ${codigo}`,
    html: moldura('Seu código de entrada', p('Digite este código na tela de entrada:') + `<p style="font-size:34px;font-weight:800;letter-spacing:.18em;margin:6px 0 18px">${esc(codigo)}</p>`
      + p(`Ou entre direto pelo botão. O código e o botão valem por pouco tempo e só uma vez.`) + botao(link, 'Entrar agora') + p('Não pediu? Pode ignorar este e-mail.')),
    texto: `Seu código de entrada: ${codigo}\nOu entre direto: ${link}\nNão pediu? Pode ignorar.`,
  };
}

export function emailCertificado({ nome, curso, link }) {
  const primeiro = esc(String(nome || '').split(' ')[0] || 'parabéns');
  return {
    assunto: `Seu certificado do ${curso} saiu`,
    html: moldura(`Parabéns, ${primeiro}!`, p(`Você concluiu o <b>${esc(curso)}</b> e o seu certificado já está pronto, com código para qualquer pessoa conferir.`)
      + botao(link, 'Ver o certificado') + p('Na página dá para baixar em PDF, postar no story e adicionar ao LinkedIn.')),
    texto: `Você concluiu o ${curso}. Seu certificado: ${link}`,
  };
}

export function emailParou({ nome, aula, link, dias }) {
  const primeiro = esc(String(nome || '').split(' ')[0] || 'oi');
  return {
    assunto: `Sua próxima aula está te esperando`,
    html: moldura(`${primeiro}, falta pouco`, p(`Faz ${dias} dias que você não aparece. Você parou em <b>${esc(aula)}</b>, e o botão abre exatamente de onde você saiu.`)
      + botao(link, 'Continuar de onde parei') + p('Dez minutos hoje já contam para a sua sequência.')),
    texto: `Você parou em ${aula}. Continue de onde saiu: ${link}`,
  };
}

export function emailResposta({ nome, aula, resposta, link }) {
  const primeiro = esc(String(nome || '').split(' ')[0] || 'oi');
  return {
    assunto: `A equipe respondeu a sua dúvida`,
    html: moldura(`${primeiro}, sua dúvida foi respondida`, p(`Na aula <b>${esc(aula)}</b>:`)
      + `<blockquote style="margin:0 0 14px;padding:12px 14px;border-left:3px solid #ff7a00;background:#fafafa;font-size:14.5px;line-height:1.55;color:#3f3f46">${esc(String(resposta).slice(0, 600))}</blockquote>`
      + botao(link, 'Ver na aula')),
    texto: `A equipe respondeu a sua dúvida na aula ${aula}: ${String(resposta).slice(0, 600)}\n${link}`,
  };
}

// Reembolso pedido pelo app do aluno: a confirmação para a pessoa e o aviso para a equipe.
// O valor sai na moeda do pedido (o curso em inglês é em dólar).
const brl = (c, moeda = 'brl') => (moeda === 'usd' ? `US$ ${(c / 100).toFixed(2)}` : (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const diaMes = (iso) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }).format(new Date(iso));
const comoVolta = (metodo) => (metodo === 'pix' ? 'O valor volta para a conta que fez o Pix.' : 'O estorno é feito no cartão e pode levar até 2 faturas para aparecer, conforme o banco.');

export function emailReembolsoPedido({ nome, numero, curso, total, metodo, devolver }) {
  const primeiro = esc(String(nome || '').split(' ')[0] || 'oi');
  return {
    assunto: `Recebemos seu pedido de reembolso (pedido ${numero})`,
    html: moldura(`${primeiro}, seu pedido de reembolso foi registrado`, p(`O reembolso de <b>${esc(brl(total))}</b> do <b>${esc(curso)}</b> sai até <b>${diaMes(devolver)}</b>. ${comoVolta(metodo)}`)
      + p('O acesso ao curso foi encerrado. Como você confirmou no pedido, o material do curso (aulas, arquivos e modelos) não pode mais ser usado.')
      + p('Se pediu por engano, responda este e-mail antes dessa data.')),
    texto: `O reembolso de ${brl(total)} do ${curso} (pedido ${numero}) sai até ${diaMes(devolver)}. ${comoVolta(metodo)} O acesso ao curso foi encerrado e o material não pode mais ser usado. Se pediu por engano, responda este e-mail antes dessa data.`,
  };
}

export function emailReembolsoEquipe({ nome, email, numero, curso, total, moeda = 'brl', devolver, motivo }) {
  return {
    assunto: `Reembolso pedido pelo app: pedido ${numero} (${brl(total, moeda)})`,
    html: moldura(`Pedido de reembolso pelo app`, p(`<b>${esc(nome || email)}</b> (${esc(email)}) pediu o reembolso do pedido <b>${numero}</b>: ${esc(curso)}, ${esc(brl(total, moeda))}.`)
      + p(`Motivo: ${esc(motivo)}.`) + p(`Entrou na fila de reembolso e sai sozinho em <b>${diaMes(devolver)}</b>. O acesso já caiu. Para tirar da fila ou devolver antes: painel, Vendas.`)
      + botao('https://agenciasetup.com.br/admin/vendas', 'Abrir Vendas')),
    texto: `${nome || email} (${email}) pediu o reembolso do pedido ${numero}: ${curso}, ${brl(total, moeda)}. Motivo: ${motivo}. Sai sozinho em ${diaMes(devolver)}; o acesso já caiu. Painel > Vendas.`,
  };
}

// motivo: saiu (preencheu e não clicou em comprar), pix, cartao ou cartao_aberto (worker/lib/recuperacao.js). vez: 1 (15 minutos
// depois) ou 2 (no dia seguinte). O botão leva direto à oferta com os dados preenchidos, sem passar pelo login do app.
export function emailRecuperacao({ nome, produto, link, parar, motivo, vez, garantia, marca = null }) {
  const n = String(nome || '').trim().split(/\s+/)[0] || '';
  const primeiro = esc(n);
  const moldar = marca ? (t, c) => molduraMarca(marca, t, c) : moldura;
  const bt = marca ? botaoMarca : botao;
  const tem = esc(produto);
  const assuntos = { saiu: `Você quase terminou: ${produto}`, pix: `Seu Pix do ${produto} não foi pago`, cartao: `O cartão não passou no ${produto}`, cartao_aberto: `Falta só o pagamento do ${produto}` };
  const frases = {
    saiu: `Você começou a compra do <b>${tem}</b> e não terminou. Guardamos seus dados para você não preencher tudo de novo.`,
    pix: `O Pix do <b>${tem}</b> não foi pago. Acontece, ele vence rápido. Um novo sai na hora.`,
    cartao: `O banco recusou o cartão na compra do <b>${tem}</b>. Dá para tentar outro cartão ou pagar no Pix, que aprova na hora.`,
    cartao_aberto: `O pagamento do <b>${tem}</b> não terminou. Se o cartão deu problema, no Pix aprova na hora.`,
  };
  const garante = garantia ? ` Você tem ${Number(garantia)} dias de garantia: não gostou, devolvemos tudo.` : '';
  const pe = `<p style="margin:18px 0 0;font-size:12.5px;line-height:1.5;color:#8a8a93">Recebeu isso porque começou essa compra. <a href="${esc(parar)}" style="color:#8a8a93">Parar estes lembretes</a>.</p>`;
  const tratamento = primeiro ? `${primeiro}, ` : '';
  if (vez === 2) {
    return {
      assunto: `Ainda quer o ${produto}?`,
      html: moldar(`${tratamento}ficou alguma dúvida?`, p(`Sua compra do <b>${tem}</b> ainda está aqui, com seus dados preenchidos.${garante}`) + p('Se algo te fez parar, é só responder este e-mail. Quem lê é a nossa equipe.') + bt(link, 'Terminar a compra') + pe),
      texto: `Sua compra do ${produto} ainda está aqui. Termine aqui: ${link}\n\nParar estes lembretes: ${parar}`,
    };
  }
  return {
    assunto: assuntos[motivo] || assuntos.saiu,
    html: moldar(`${tratamento}falta pouco`, p(frases[motivo] || frases.saiu) + bt(link, 'Terminar a compra') + p('O botão abre a compra com seu nome, e-mail e celular preenchidos.') + pe),
    texto: `${String(frases[motivo] || frases.saiu).replace(/<[^>]+>/g, '')} Termine aqui: ${link}\n\nParar estes lembretes: ${parar}`,
  };
}

export function emailRecuperacaoEn({ nome, produto, link, parar, vez, garantia, marca = null }) {
  const n = String(nome || '').trim().split(/\s+/)[0] || '';
  const primeiro = esc(n);
  const tem = esc(produto);
  const garante = garantia ? ` You have a ${Number(garantia)}-day guarantee: if you don't like it, you get all your money back.` : '';
  const pe_ = `<p style="margin:18px 0 0;font-size:12.5px;line-height:1.5;color:#8a8a93">You got this because you started this purchase. <a href="${esc(parar)}" style="color:#8a8a93">Stop these reminders</a>.</p>`;
  if (vez === 2) {
    return {
      assunto: `Still want ${produto}?`,
      html: molduraEn(marca, `${primeiro ? `${primeiro}, any` : 'Any'} questions?`, pe(`Your order for <b>${tem}</b> is still here, with your details filled in.${garante}`) + pe('If something stopped you, just reply to this email. Our team reads every one.') + botao(link, 'Finish my order') + pe_),
      texto: `Your order for ${produto} is still here. Finish it here: ${link}\n\nStop these reminders: ${parar}`,
    };
  }
  return {
    assunto: `You're almost there: ${produto}`,
    html: molduraEn(marca, `${primeiro ? `${primeiro}, you're` : "You're"} almost there`, pe(`You started buying <b>${tem}</b> and didn't finish. We kept your details so you don't have to type them again.`) + botao(link, 'Finish my order') + pe_),
    texto: `You started buying ${produto} and didn't finish. Finish it here: ${link}\n\nStop these reminders: ${parar}`,
  };
}

export function emailDesafio({ nome, titulo, link, fim }) {
  const primeiro = esc(String(nome || '').split(' ')[0] || 'oi');
  return {
    assunto: `Desafio novo: ${titulo}`,
    html: moldura(`${primeiro}, desafio aberto`, p(`<b>${esc(titulo)}</b>${fim ? ` vai até ${esc(fim)}` : ''}. Entregue o que você criou com o curso, a turma curte e os destaques ganham selo e repost.`) + botao(link, 'Ver o desafio')),
    texto: `Desafio novo: ${titulo}. ${link}`,
  };
}

export function emailResumoSemanal({ nome, linhas, link }) {
  const primeiro = esc(String(nome || '').split(' ')[0] || 'oi');
  return {
    assunto: 'O resumo da sua semana na Setup',
    html: moldura(`${primeiro}, sua semana`, linhas.map((l) => p(esc(l))).join('') + botao(link, 'Abrir a área')),
    texto: `${linhas.join('\n')}\n${link}`,
  };
}

export function emailPresente({ nome, de, curso, mensagem, link, entrar }) {
  const primeiro = esc(String(nome || '').split(' ')[0] || 'oi');
  return {
    assunto: `${de} te deu o curso ${curso}`,
    html: moldura(`${primeiro}, você ganhou um presente`, p(`<b>${esc(de)}</b> te deu o <b>${esc(curso)}</b>. O acesso já está liberado.`)
      + (mensagem ? `<blockquote style="margin:0 0 14px;padding:12px 14px;border-left:3px solid #ff7a00;background:#fafafa;font-size:14.5px;line-height:1.55;color:#3f3f46">${esc(String(mensagem).slice(0, 500))}</blockquote>` : '')
      + botao(link, 'Abrir o presente') + p(`Depois de 24 horas, entre em <a href="${esc(entrar)}" style="color:#c2410c">${esc(entrar.replace(/^https?:\/\//, ''))}</a> com este e-mail.`)),
    texto: `${de} te deu o curso ${curso}.${mensagem ? `\n"${mensagem}"` : ''}\nAbrir: ${link}`,
  };
}

export function emailPresenteEnviado({ nome, para, curso }) {
  return {
    assunto: `Seu presente foi entregue`,
    html: moldura(`Presente entregue`, p(`${esc(String(nome || '').split(' ')[0] || 'Oi')}, o <b>${esc(curso)}</b> já chegou para <b>${esc(para)}</b>, com a sua mensagem.`)),
    texto: `O ${curso} já chegou para ${para}.`,
  };
}

// ---------------------------------------------------------------- curso em inglês (marca com idioma "en")
// A mesma moldura clara dos e-mails da Setup, com o nome do curso no topo e o rodapé em inglês.
function molduraEn(marca, titulo, corpoHtml) {
  return `<!doctype html><html lang="en"><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;color:#18181b">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<div style="font-weight:700;font-size:15px;letter-spacing:-.01em;margin-bottom:20px"><img src="https://agenciasetup.com.br/img/logo-setup-128.png" width="28" height="28" alt="" style="display:inline-block;vertical-align:middle;margin-right:8px;border:0">${esc((marca && marca.nome) || 'Agência Setup')}</div>
<div style="background:#fff;border-radius:18px;padding:28px 24px;border:1px solid #e4e4e7">
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.2;letter-spacing:-.02em">${esc(titulo)}</h1>
${corpoHtml}
</div>
<p style="font-size:12px;color:#71717a;margin:18px 4px 0">You got this email because you bought or joined a course from Agência Setup. Questions? contato@agenciasetup.com.br</p>
</div></body></html>`;
}
const pe = (t) => p(t);

export function emailBoasVindasEn({ nome, curso, link, entrar, marca }) {
  const primeiro = esc(String(nome || '').split(' ')[0] || '');
  return {
    assunto: `Your access to ${curso} is ready`,
    html: molduraEn(marca, `You're all set${primeiro ? `, ${primeiro}` : ''}!`, pe(`Your payment went through and <b>${esc(curso)}</b> is unlocked for you.`) + botao(link, 'Open the course')
      + pe(`The button works for 24 hours. After that, go to <a href="${esc(entrar)}" style="color:#c2410c">${esc(entrar.replace(/^https?:\/\//, ''))}</a> and use this email: we send you a login code right away.`)
      + pe('You have a 7-day guarantee. Any questions, just reply to this email.')),
    texto: `Your payment went through and ${curso} is unlocked. Open the course: ${link}\nAfter 24 hours, go to ${entrar}, use this email and ask for a code.`,
  };
}

const diaMesEn = (iso) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', month: 'short', day: 'numeric' }).format(new Date(iso));

export function emailReembolsoPedidoEn({ nome, numero, curso, total, moeda, devolver }) {
  const primeiro = esc(String(nome || '').split(' ')[0] || '');
  return {
    assunto: `We got your refund request (order ${numero})`,
    html: molduraEn(null, `${primeiro ? `${primeiro}, your` : 'Your'} refund request is in`, pe(`The refund of <b>${esc(brl(total, moeda))}</b> for <b>${esc(curso)}</b> goes out by <b>${diaMesEn(devolver)}</b>. It goes back to your card and can take 5 to 10 business days to show up, depending on your bank.`)
      + pe('Your access to the course has ended. As you confirmed in the request, the course material (lessons, files and templates) can no longer be used.')
      + pe('If you asked by mistake, reply to this email before that date.')),
    texto: `The refund of ${brl(total, moeda)} for ${curso} (order ${numero}) goes out by ${diaMesEn(devolver)}, back to your card (5 to 10 business days to show up). Your access has ended and the material can no longer be used. If you asked by mistake, reply before that date.`,
  };
}
