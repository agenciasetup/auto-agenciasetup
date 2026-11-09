// Confere o curso de leitura "Dúvidas da Fé" de ponta a ponta, no computador (pagamento simulado):
// checkout com a marca -> Pix com o bump "Acesso para sempre" -> pago -> obrigado com o PDF -> link do PDF -> e-mail com
// a marca -> matrícula sem prazo -> "Ler no celular" (vale mais de uma vez) -> app do curso (capítulos, dúvida de
// leitura, progresso, PDF) -> código de entrada com a marca.
// O curso nasce em rascunho: para o comprador de teste ver o app, ele entra também como pessoa da equipe (só leitura de
// rascunho; papel "redator"). Apaga tudo no fim: aluno, pedido, matrícula, e-mails, equipe e login de teste.
// Uso (com `npm run dev:duvidas` ligado): node scripts/conferir-duvidas.mjs
//      node scripts/conferir-duvidas.mjs --manter   não apaga: mostra o link para abrir o app como o comprador de teste
//      node scripts/conferir-duvidas.mjs --limpar   só apaga o que um --manter deixou
import { env, exige, sql } from './env.mjs';

exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_PUBLISHABLE_KEY');
const marca = 'http://localhost:8789';
const OFERTA = 'duvidas-da-fe';
const MANTER = process.argv.includes('--manter');
const PREFIXO = 'conferir-duvidas-';

let falhas = 0;
const ok = (cond, msg, extra = '') => { console.log(`${cond ? 'ok   ' : 'FALHA'} ${msg}${extra ? ` (${extra})` : ''}`); if (!cond) falhas++; };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const txt = (v) => `'${String(v).replace(/'/g, "''")}'`;
function cpf() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * (a.length + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  n.push(dv(n)); n.push(dv(n));
  return n.join('');
}
async function supa(caminho, opcoes = {}, chave = env.SUPABASE_SECRET_KEY) {
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1${caminho}`, { ...opcoes, headers: { apikey: chave, 'content-type': 'application/json', ...(opcoes.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`auth ${caminho}: ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}
async function chamar(metodo, caminho, { corpo, token } = {}) {
  const r = await fetch(`${marca}${caminho}`, {
    method: metodo, redirect: 'manual',
    headers: { ...(corpo ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const t = await r.text();
  let dados = null;
  try { dados = JSON.parse(t); } catch {}
  return { status: r.status, cab: r.headers, dados, texto: t };
}
const entrarComHash = (hash) => supa('/verify', { method: 'POST', body: JSON.stringify({ type: 'magiclink', token_hash: hash }) }, env.SUPABASE_PUBLISHABLE_KEY).then((s) => s.access_token);

async function limpar() {
  const alunos = await sql(`select id, email, auth_id from alunos where email like '${PREFIXO}%@example.com'`);
  const equipe = await sql(`select id from equipe where email like '${PREFIXO}%@example.com'`);
  if (alunos.length) {
    const ids = alunos.map((a) => txt(a.id)).join(',');
    const pedidos = await sql(`select id from pedidos where aluno_id in (${ids})`);
    const pids = pedidos.map((x) => txt(x.id)).join(',') || "'00000000-0000-0000-0000-000000000000'";
    await sql(`
      delete from progresso where aluno_id in (${ids});
      delete from matriculas where aluno_id in (${ids});
      delete from eventos_pagamento where pedido_id in (${pids});
      delete from emails where para in (${alunos.map((a) => txt(a.email)).join(',')}) or ref in (${pedidos.map((x) => txt(`pedido:${x.id}`)).concat(alunos.map((a) => txt(`aluno:${a.id}`))).join(',') || "''"});
      delete from pedidos where id in (${pids});
      delete from limites where chave in (${alunos.map((a) => txt(`ck:${a.email}`)).concat(alunos.map((a) => txt(`codigo:${a.email}`)), pedidos.map((x) => txt(`entrada:${x.id}`))).join(',')});
      delete from auditoria where alvo in (${pedidos.map((x) => txt(`pedido:${x.id}`)).concat(alunos.map((a) => txt(`aluno:${a.id}`))).join(',')});
    `);
  }
  if (equipe.length) await sql(`delete from auditoria where equipe_id in (${equipe.map((m) => txt(m.id)).join(',')}); delete from equipe where id in (${equipe.map((m) => txt(m.id)).join(',')})`);
  if (alunos.length) {
    await sql(`delete from alunos where id in (${alunos.map((a) => txt(a.id)).join(',')})`);
    for (const a of alunos) if (a.auth_id) await supa(`/admin/users/${a.auth_id}`, { method: 'DELETE' }).catch((e) => console.log('não apaguei um login de teste:', e.message));
  }
  console.log(`apagado: ${alunos.length} aluno(s) de teste, ${equipe.length} pessoa(s) de equipe de teste, com pedidos, matrículas, progresso e e-mails`);
}

if (process.argv.includes('--limpar')) { await limpar(); process.exit(0); }

const ts = Date.now();
const email = `${PREFIXO}${ts}@example.com`;
console.log(`conferindo o Dúvidas da Fé em ${marca}\n`);
try {
  // ------------------------------------------------------------ checkout com a marca e o bump
  const pag = await chamar('GET', `/checkout/${OFERTA}`);
  ok(pag.status === 200 && pag.texto.includes('tema-leitura') && pag.texto.includes('Dúvidas da Fé'), 'o checkout abre com a marca');
  ok(pag.texto.includes('Acesso para sempre'), 'o bump "Acesso para sempre" aparece');
  const [bump] = await sql(`select id from ofertas where slug = '${OFERTA}-para-sempre'`);
  const compra = await chamar('POST', '/api/checkout', { corpo: { oferta: OFERTA, email, nome: 'Maria Conferência', cpf: cpf(), celular: '11999990000', metodo: 'pix', bumps: [bump.id] } });
  const pedidoId = compra.dados && compra.dados.pedido;
  ok(compra.status === 200 && !!pedidoId, 'o Pix é gerado', compra.status !== 200 ? JSON.stringify(compra.dados).slice(0, 160) : '');
  ok(compra.dados && compra.dados.total_centavos === 3480, 'o total soma o bump (R$ 34,80)', compra.dados && String(compra.dados.total_centavos));
  const antes = await chamar('GET', `/api/checkout/pedido/${pedidoId}`);
  ok(antes.dados && antes.dados.leitura === true && !antes.dados.pdf, 'antes de pagar: é de leitura e ainda sem PDF');

  // ------------------------------------------------------------ pago: obrigado, PDF, e-mail, matrícula
  const sim = await chamar('POST', `/api/checkout/simular/${pedidoId}`);
  ok(sim.status === 200, 'pagamento simulado processado');
  await espera(2500);
  const st = await chamar('GET', `/api/checkout/pedido/${pedidoId}`);
  ok(st.dados && st.dados.status === 'pago', 'o pedido está pago');
  ok(st.dados && st.dados.curso_url === marca, 'o obrigado leva para o app do curso', st.dados && st.dados.curso_url);
  ok(st.dados && String(st.dados.pdf || '').endsWith(`/checkout/pdf?pedido=${pedidoId}`), 'o obrigado oferece o PDF');
  const obrigado = await chamar('GET', `/checkout/obrigado?pedido=${pedidoId}`);
  ok(obrigado.status === 200 && obrigado.texto.includes('id="pdf"') && obrigado.texto.includes('Ler no celular'), 'a tela de obrigado tem "Baixar o PDF" e "Ler no celular"');
  const pdf = await chamar('GET', `/checkout/pdf?pedido=${pedidoId}`);
  const destino = pdf.cab.get('location') || '';
  ok(pdf.status === 302 && destino.includes('/object/sign/curso/duvidas-da-fe/'), 'o link do PDF leva ao arquivo assinado');
  const arq = destino ? await fetch(destino, { headers: { range: 'bytes=0-1023' } }) : null;
  ok(arq && (arq.status === 200 || arq.status === 206) && /pdf/.test(arq.headers.get('content-type') || ''), 'o PDF baixa', arq ? `${arq.status} ${arq.headers.get('content-type')}` : '');
  const falso = await chamar('GET', '/checkout/pdf?pedido=00000000-0000-0000-0000-000000000000');
  ok(falso.status === 404, 'pedido que não existe não baixa o PDF');
  const [al] = await sql(`select id, auth_id from alunos where email = ${txt(email)}`);
  const mats = await sql(`select c.slug, m.fim from matriculas m join cursos c on c.id = m.curso_id where m.aluno_id = ${txt(al.id)}`);
  ok(mats.length === 1 && mats[0].slug === 'duvidas-da-fe' && mats[0].fim === null, 'matrícula no Dúvidas da Fé, sem prazo (bump para sempre)', JSON.stringify(mats));
  const [mail] = await sql(`select tipo, assunto, html, status from emails where ref = ${txt(`pedido:${pedidoId}`)} and tipo = 'acesso'`);
  ok(mail && /Seu livro Dúvidas da Fé chegou/.test(mail.assunto) && /anexado/.test(mail.html) && /Ler no celular/.test(mail.html), 'o e-mail sai com a marca, o PDF anexado e o "Ler no celular"', mail ? `${mail.assunto} · ${mail.status}` : 'sem e-mail');
  ok(mail && !/Agência Setup/.test(mail.html), 'o e-mail não fala de Agência Setup');

  // ------------------------------------------------------------ "Ler no celular": vale mais de uma vez
  const e1 = await chamar('POST', '/api/aluno/entrar-pedido', { corpo: { pedido: pedidoId } });
  const e2 = await chamar('POST', '/api/aluno/entrar-pedido', { corpo: { pedido: pedidoId } });
  ok(e1.status === 200 && e2.status === 200, '"Ler no celular" entra, e entra de novo', `${e1.status} ${e2.status}`);
  const token = await entrarComHash(e2.dados.token);
  ok(!!token, 'o login abre');

  // ------------------------------------------------------------ app do curso (o curso está em rascunho: entra como equipe)
  const colunas = (await sql(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'equipe'`)).map((c) => c.column_name);
  const [authId] = (await sql(`select auth_id from alunos where id = ${txt(al.id)}`)).map((x) => x.auth_id);
  await sql(`insert into equipe (email, nome, papel${colunas.includes('auth_id') ? ', auth_id' : ''}) values (${txt(email)}, 'Conferência Dúvidas', 'redator'${colunas.includes('auth_id') ? `, ${txt(authId)}` : ''})`);
  const curso = await chamar('GET', '/api/aluno/cursos/duvidas-da-fe', { token });
  const caps = curso.dados ? curso.dados.secoes.flatMap((s) => s.modulos) : [];
  ok(curso.status === 200 && curso.dados.total === 60 && caps.length === 8, 'o curso abre: 8 capítulos e 60 dúvidas', curso.status !== 200 ? JSON.stringify(curso.dados).slice(0, 160) : '');
  const pdfDoCurso = curso.dados && curso.dados.arquivos.find((f) => f.tipo === 'pdf');
  ok(!!pdfDoCurso, 'o PDF está nos arquivos do curso');
  const primeira = caps[0] && caps[0].aulas[0];
  const aula = await chamar('GET', `/api/aluno/aulas/${primeira.id}`, { token });
  ok(aula.status === 200 && aula.dados.aula.tipo === 'leitura' && !!aula.dados.aula.corpo.resposta && aula.dados.video.tipo === 'nenhum', 'a dúvida abre como leitura, sem vídeo');
  ok(aula.dados && aula.dados.aula.corpo.imagem && /\/object\/public\/midia\/duvidas-da-fe\//.test(aula.dados.aula.corpo.imagem.url), 'a imagem da dúvida vem do midia');
  const prog = await chamar('POST', `/api/aluno/aulas/${primeira.id}/progresso`, { token, corpo: { concluir: true, posicao: 0, assistido: 0 } });
  ok(prog.status === 200 && prog.dados.concluida && !prog.dados.certificado, 'marcar como lida funciona, sem certificado da Setup');
  const dl = pdfDoCurso ? await chamar('GET', `/api/aluno/arquivos/${pdfDoCurso.id}`, { token }) : { status: 0 };
  ok(dl.status === 200 && /\/object\/sign\/curso\//.test(dl.dados.url), 'o botão PDF do app abre o arquivo');
  // A ajudante (IA): só quem comprou vê; no computador fica desligada (a chave mora nas Integrações e o local não lê).
  const ajud = await chamar('GET', '/api/aluno/cursos/duvidas-da-fe/ajudante', { token });
  ok(ajud.status === 200 && typeof ajud.dados.ligado === 'boolean' && ajud.dados.limite_dia > 0 && ajud.dados.restantes >= 0, 'a ajudante mostra o estado e as perguntas do dia', JSON.stringify(ajud.dados));
  const ajudFora = await chamar('GET', '/api/aluno/cursos/duvidas-da-fe/ajudante');
  ok(ajudFora.status === 401, 'a ajudante não abre sem entrar', ajudFora.status);
  const pagina = await chamar('GET', '/ler');
  ok(pagina.status === 200 && pagina.texto.includes('window.__MARCA') && pagina.texto.includes('<title>Dúvidas da Fé</title>'), 'a página do app leva a marca');
  const manifesto = await chamar('GET', '/manifest.webmanifest');
  ok(manifesto.status === 200 && manifesto.dados && manifesto.dados.name === 'Dúvidas da Fé', 'o app no celular se chama Dúvidas da Fé');

  // ------------------------------------------------------------ código de entrada com a marca
  const cod = await chamar('POST', '/api/aluno/codigo', { corpo: { email } });
  const [mc] = await sql(`select assunto, html from emails where para = ${txt(email)} and tipo = 'codigo' order by criado_em desc limit 1`);
  ok(cod.status === 200 && mc && mc.html.includes('Dúvidas da Fé') && mc.html.includes(`${marca}/entrar?token=`), 'o código de entrada sai com a marca e volta para o app do curso');

  if (MANTER) console.log(`\nComprador de teste mantido. Abra: ${marca}/entrar?pedido=${pedidoId}\nDepois: node scripts/conferir-duvidas.mjs --limpar`);
} catch (e) {
  falhas++;
  console.log('FALHA', e.message);
} finally {
  if (!MANTER) await limpar().catch((e) => console.log('limpeza falhou:', e.message));
}
console.log(falhas ? `\n${falhas} conferência(s) falharam` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
