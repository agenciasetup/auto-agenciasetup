// Confere a área de membros de ponta a ponta, no computador (pagamento simulado):
// toque com marca de origem -> checkout Pix -> pagamento -> acesso, login e e-mail -> app do aluno (início, curso, aula,
// progresso, download, busca) -> painel (vendas, alunos, link de entrada, link curto, liberar curso) -> reembolso -> o acesso cai.
// Cria um aluno, um pedido e uma pessoa da equipe de teste e apaga tudo no fim (também o aluno de teste antigo, teste.area+1).
// Uso (com `npm run dev` e `npm run dev:curso` ligados): node scripts/conferir-area.mjs
//      node scripts/conferir-area.mjs <site> <curso>   (padrão http://localhost:8787 e http://localhost:8788)
import { randomBytes } from 'node:crypto';
import { env, exige, sql } from './env.mjs';

exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_PUBLISHABLE_KEY');
const site = (process.argv[2] || 'http://localhost:8787').replace(/\/$/, '');
const curso = (process.argv[3] || 'http://localhost:8788').replace(/\/$/, '');
if (!/localhost|127\.0\.0\.1/.test(site)) { console.log('O pagamento simulado só existe no computador. Rode com o site local.'); process.exit(1); }
const OFERTA = 'posts-automaticos';
const CURSO = 'posts-automaticos-com-claude';

let falhas = 0;
const ok = (cond, msg, extra = '') => { console.log(`${cond ? 'ok   ' : 'FALHA'} ${msg}${extra ? ` (${extra})` : ''}`); if (!cond) falhas++; };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const txt = (v) => `'${String(v).replace(/'/g, "''")}'`;

const ts = Date.now();
const emailAluno = `conferir-area-${ts}@example.com`;
const emailBonus = `conferir-bonus-${ts}@example.com`;
const emailEquipe = `conferir-equipe-${ts}@example.com`;
const codigoLink = `conferir-${ts}`;
let membroId = null, authEquipe = null, visitante = null, pedidoId = null;
const restaurar = [];

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
async function chamar(base, metodo, caminho, { corpo, token, cabecalhos = {} } = {}) {
  const r = await fetch(`${base}${caminho}`, {
    method: metodo, redirect: 'manual',
    headers: { ...(corpo ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...cabecalhos },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, cab: r.headers, dados: await r.json().catch(() => null) };
}
let tokenEquipe = '', tokenAluno = '';
const painel = (metodo, caminho, corpo) => chamar(site, metodo, `/api/admin${caminho}`, { corpo, token: tokenEquipe });
const aluno = (metodo, caminho, corpo, token = tokenAluno) => chamar(curso, metodo, `/api/aluno${caminho}`, { corpo, token });
// Login de aluno com o token do link (o mesmo que o app faz com verifyOtp).
const entrarComHash = (hash) => supa('/verify', { method: 'POST', body: JSON.stringify({ type: 'magiclink', token_hash: hash }) }, env.SUPABASE_PUBLISHABLE_KEY).then((s) => s.access_token);

console.log(`conferindo a área de membros em ${site} e ${curso}\n`);
try {
  // ------------------------------------------------------------ checkout com origem
  const pag = await fetch(`${site}/checkout/${OFERTA}`);
  ok(pag.status === 200 && (await pag.text()).includes('checkout'), 'a página do checkout abre');
  const toque = await chamar(site, 'POST', '/api/toque', { corpo: { url: `${site}/checkout/${OFERTA}?utm_source=conferir&utm_medium=teste&utm_campaign=area-${ts}`, referrer: 'https://instagram.com/' } });
  visitante = ((toque.cab.get('set-cookie') || '').match(/as_v=([A-Za-z0-9]+)/) || [])[1];
  ok(toque.status === 200 && !!visitante, 'toque com marca de origem cria o visitante');
  await espera(1500);
  const cookie = { cookie: `as_v=${visitante}` };

  const recusa = await chamar(site, 'POST', '/api/checkout', { corpo: { oferta: OFERTA, email: emailAluno, nome: 'Conferência Área', cpf: '11111111111', celular: '62999990000', metodo: 'pix' } });
  ok(recusa.status === 400 && /CPF/.test(recusa.dados?.erro || ''), 'checkout recusa CPF inválido');
  const compra = await chamar(site, 'POST', '/api/checkout', { corpo: { oferta: OFERTA, email: emailAluno, nome: 'Conferência Área', cpf: cpf(), celular: '62999990000', metodo: 'pix' }, cabecalhos: cookie });
  pedidoId = compra.dados?.pedido;
  ok(compra.status === 200 && pedidoId && compra.dados.pix?.copia, 'checkout cria o pedido com Pix', compra.dados?.erro);
  const [oferta] = await sql(`select preco_centavos, pix_desconto_pct from ofertas where slug = ${txt(OFERTA)}`);
  ok(compra.dados.total_centavos === oferta.preco_centavos - Math.round((oferta.preco_centavos * oferta.pix_desconto_pct) / 100), 'Pix com o desconto da oferta', `${compra.dados.total_centavos}`);
  const antes = await chamar(site, 'GET', `/api/checkout/pedido/${pedidoId}`);
  ok(antes.dados?.status === 'aguardando', 'pedido aguardando pagamento');
  ok(!JSON.stringify(antes.dados).includes(emailAluno), 'a situação do pedido não mostra o e-mail inteiro');
  const semToken = await chamar(site, 'POST', '/api/asaas/aviso', { corpo: { id: 'evt_x', event: 'PAYMENT_RECEIVED', payment: { externalReference: pedidoId } } });
  ok(semToken.status === 401, 'aviso do Asaas sem o token é recusado');

  // ------------------------------------------------------------ pagamento e acesso
  const sim = await chamar(site, 'POST', `/api/checkout/simular/${pedidoId}`);
  ok(sim.status === 200, 'pagamento simulado processado', JSON.stringify(sim.dados).slice(0, 120));
  const depois = await chamar(site, 'GET', `/api/checkout/pedido/${pedidoId}`);
  ok(depois.dados?.status === 'pago', 'pedido pago');
  const [p] = await sql(`select p.ultimo_toque, p.primeiro_toque, a.id aluno_id, a.auth_id, m.status mat, m.fim from pedidos p join alunos a on a.id = p.aluno_id left join matriculas m on m.pedido_id = p.id where p.id = ${txt(pedidoId)}`);
  ok(p && p.mat === 'ativa', 'matrícula ativa');
  ok(p && p.auth_id, 'login do aluno criado');
  ok(p && p.ultimo_toque?.origem === 'conferir' && p.ultimo_toque?.campanha === `area-${ts}`, 'pedido guarda de onde a venda veio', JSON.stringify(p?.ultimo_toque));
  const [mail] = await sql(`select html, status from emails where para = ${txt(emailAluno)} and tipo = 'acesso' order by criado_em desc limit 1`);
  ok(!!mail, 'e-mail de boas-vindas registrado', mail?.status);
  const hash = mail && decodeURIComponent(((mail.html.match(/entrar\?token=([^"&]+)/) || [])[1] || ''));
  ok(!!hash, 'o e-mail traz o link de entrada');

  // ------------------------------------------------------------ app do aluno
  ok((await aluno('GET', '/eu', null, '')).status === 401, 'app do aluno recusa quem não entrou');
  tokenAluno = await entrarComHash(hash);
  ok(!!tokenAluno, 'o link do e-mail faz o login');
  const eu = await aluno('GET', '/eu');
  ok(eu.status === 200 && eu.dados?.email === emailAluno, 'GET /eu reconhece o aluno', eu.dados?.erro);
  const ini = await aluno('GET', '/inicio');
  ok(ini.status === 200 && ini.dados.cursos?.length === 1 && ini.dados.continuar, 'início mostra o curso e onde continuar');
  const cur = await aluno('GET', `/cursos/${CURSO}`);
  const aulas = (cur.dados?.secoes || []).flatMap((x) => x.modulos).flatMap((m) => m.aulas);
  ok(cur.status === 200 && aulas.length >= 10, 'o curso lista os módulos e as aulas', `${aulas.length} aulas`);
  const alvo = aulas.find((a) => a.codigo === '1.3') || aulas[1];
  const aula = await aluno('GET', `/aulas/${alvo.id}`);
  ok(aula.status === 200 && aula.dados.aula?.id === alvo.id && aula.dados.proxima, 'a aula abre com a próxima');
  const prog = await aluno('POST', `/aulas/${alvo.id}/progresso`, { posicao: 30, assistido: alvo.duracao_s || 400 });
  ok(prog.status === 200 && prog.dados.concluida, 'assistir 90% conclui a aula');
  const passos = await aluno('POST', `/aulas/${alvo.id}/passos`, { passos: [0, 1] });
  ok(passos.status === 200, 'marcar os passos do "Faça agora"');
  const arq = (aula.dados.arquivos || [])[0] || (aula.dados.kit || [])[0];
  if (arq) {
    const d = await aluno('GET', `/arquivos/${arq.id}`);
    const baixa = d.dados?.url ? await fetch(d.dados.url, { method: 'GET', headers: { range: 'bytes=0-10' } }) : null;
    ok(d.status === 200 && baixa && baixa.status < 300, 'download do material com link assinado', arq.nome);
  } else ok(false, 'a aula deveria ter material');
  const busca = await aluno('GET', '/busca?q=claude');
  ok(busca.status === 200 && Array.isArray(busca.dados.itens), 'busca nas falas das aulas', `${busca.dados?.itens?.length} achados`);
  // Painel do cliente: uma segunda compra pendente, trocar Pix -> cartão -> Pix, comprovante e dados de cobrança.
  const segunda = await chamar(site, 'POST', '/api/checkout', { corpo: { oferta: OFERTA, email: emailAluno, nome: 'Conferência Área', cpf: cpf(), celular: '62999990000', metodo: 'pix' }, cabecalhos: cookie });
  const compras = await aluno('GET', '/compras');
  const pend = compras.dados?.find((c) => c.id === segunda.dados?.pedido);
  ok(compras.status === 200 && compras.dados.length === 2 && pend?.pendente, 'Compras lista a paga e a pendente');
  const proCartao = await aluno('POST', `/compras/${pend?.id}/pagar`, { metodo: 'cartao', parcelas: 3 });
  const [pc] = await sql(`select metodo, parcelas, status, pix_copia from pedidos where id = ${txt(pend?.id)}`);
  ok(proCartao.status === 200 && proCartao.dados.link && pc.metodo === 'cartao' && pc.parcelas === 3 && !pc.pix_copia, 'trocar o Pix por cartão em 3x', proCartao.dados?.erro);
  const proPix = await aluno('POST', `/compras/${pend?.id}/pagar`, { metodo: 'pix' });
  ok(proPix.status === 200 && proPix.dados.pix?.copia && proPix.dados.total_centavos < proCartao.dados.total_centavos, 'voltar para o Pix (com o desconto)');
  ok((await aluno('POST', `/compras/${pedidoId}/pagar`, { metodo: 'pix' })).status === 409, 'compra paga não gera cobrança nova');
  ok((await aluno('GET', `/compras/${pedidoId}/comprovante`)).status === 200, 'comprovante da compra paga');
  const dados = await aluno('PATCH', '/dados', { nome: 'Conferência Área Dois', celular: '62988887777' });
  ok(dados.status === 200 && dados.dados.celular === '62988887777' && dados.dados.nome === 'Conferência Área Dois', 'atualizar os dados de cobrança');
  ok((await aluno('PATCH', '/dados', { cpf: '12345678900' })).status === 400, 'CPF inválido é recusado');

  const atalho = await aluno('POST', '/entrar-pedido', { pedido: pedidoId }, '');
  ok(atalho.status === 200 && atalho.dados.token, 'atalho de entrada depois do pagamento');
  ok((await aluno('POST', '/entrar-pedido', { pedido: pedidoId }, '')).status === 410, 'o atalho vale uma vez só');
  const cod = await aluno('POST', '/codigo', { email: `ninguem-${ts}@example.com` }, '');
  ok(cod.status === 200, 'pedir código com e-mail que não é aluno responde igual (não revela quem comprou)');

  // ------------------------------------------------------------ painel
  const u = await supa('/admin/users', { method: 'POST', body: JSON.stringify({ email: emailEquipe, password: `Cf${randomBytes(12).toString('hex')}9`, email_confirm: true }) });
  authEquipe = u.id;
  const [m] = await sql(`insert into equipe (email, nome, papel) values (${txt(emailEquipe)}, 'Conferência automática', 'administrador') returning id`);
  membroId = m.id;
  const link = await supa('/admin/generate_link', { method: 'POST', body: JSON.stringify({ type: 'magiclink', email: emailEquipe }) });
  tokenEquipe = await entrarComHash(link.hashed_token || link.properties?.hashed_token);
  ok(!!tokenEquipe, 'pessoa da equipe de teste entrou');

  const vendas = await painel('GET', `/vendas?busca=${encodeURIComponent(emailAluno)}`);
  ok(vendas.status === 200 && vendas.dados.itens?.some((i) => i.id === pedidoId) && vendas.dados.numeros, 'Vendas acha o pedido pelo e-mail');
  const venda = await painel('GET', `/vendas/${pedidoId}`);
  ok(venda.status === 200 && venda.dados.eventos?.length && venda.dados.emails?.length && venda.dados.ultimo_toque?.origem === 'conferir', 'detalhe da venda com origem, avisos e e-mails');
  const alunos = await painel('GET', `/alunos?busca=${encodeURIComponent(emailAluno)}`);
  ok(alunos.status === 200 && alunos.dados.itens?.length === 1, 'Alunos acha o aluno');
  const det = await painel('GET', `/alunos/${p.aluno_id}`);
  ok(det.status === 200 && det.dados.concluidas >= 1 && det.dados.matriculas?.[0]?.status === 'ativa', 'detalhe do aluno com o progresso');
  const le = await painel('POST', `/alunos/${p.aluno_id}/link`);
  ok(le.status === 200 && /\/entrar\?token=/.test(le.dados?.link || ''), 'link de entrada para o aluno');
  const reenvio = await painel('POST', `/vendas/${pedidoId}/reenviar`);
  ok(reenvio.status === 200, 'reenviar o acesso');

  const [aulaOrig] = await sql(`select id, abertura_fim_s from aulas where id = ${txt(alvo.id)}`);
  restaurar.push(`update aulas set abertura_fim_s = ${aulaOrig.abertura_fim_s ?? 'null'} where id = ${txt(alvo.id)}`);
  const ed = await painel('PATCH', `/area/aulas/${alvo.id}`, { abertura_fim_s: 12 });
  ok(ed.status === 200 && ed.dados.abertura_fim_s === 12, 'editar a aula (pular abertura)');
  await sql(restaurar.pop());

  const nl = await painel('POST', '/area/links', { codigo: codigoLink, destino: `/checkout/${OFERTA}`, utm_source: 'conferir', utm_medium: 'link' });
  ok(nl.status === 200, 'criar link rastreável', nl.dados?.erro);
  const clique = await chamar(site, 'GET', `/l/${codigoLink}`);
  ok(clique.status === 302 && /utm_source=conferir/.test(clique.cab.get('location') || ''), 'o link curto leva ao destino com a marca');

  const cursos = await painel('GET', '/area/cursos');
  const cursoId = cursos.dados?.find((c) => c.slug === CURSO)?.id;
  const bonus = await painel('POST', '/alunos', { email: emailBonus, nome: 'Bônus Conferência', curso_id: cursoId, origem: 'bonus', dias: 30 });
  ok(bonus.status === 200 && bonus.dados.link, 'liberar curso na mão (bônus)');
  const [mb] = await sql(`select m.id, m.status, m.origem from matriculas m join alunos a on a.id = m.aluno_id where a.email = ${txt(emailBonus)}`);
  ok(mb && mb.status === 'ativa' && mb.origem === 'bonus', 'matrícula de bônus ativa');
  const rv = mb ? await painel('POST', `/matriculas/${mb.id}/revogar`, { motivo: 'conferência' }) : { status: 0 };
  ok(rv.status === 200, 'tirar o acesso na mão');

  // ------------------------------------------------------------ reembolso: fila pelo painel, pedido pelo aluno, devolver
  const situacao = async () => (await sql(`select p.status, m.status mat, m.motivo from pedidos p left join matriculas m on m.pedido_id = p.id where p.id = ${txt(pedidoId)}`))[0];
  const ag = await painel('POST', `/vendas/${pedidoId}/reembolsar`, { dias: 7, motivo: 'conferência' });
  ok(ag.status === 200 && ag.dados?.agendado?.devolver_em, 'painel põe o reembolso na fila (7 dias)', ag.dados?.erro);
  let s = await situacao();
  ok(s.status === 'pago' && s.mat === 'revogada' && s.motivo === 'reembolso agendado', 'na fila: pedido continua pago e o acesso cai');
  const dobro = await painel('POST', `/vendas/${pedidoId}/reembolsar`, { dias: 3 });
  ok(dobro.status === 409, 'não deixa pôr o mesmo pedido duas vezes na fila');
  const fila = await painel('GET', '/vendas/reembolsos');
  const naFila = fila.dados?.itens?.find((r) => r.pedido?.id === pedidoId);
  ok(fila.status === 200 && naFila?.status === 'agendado', 'a fila de reembolso mostra o pedido');
  const lv = await painel('GET', `/vendas?busca=${encodeURIComponent(emailAluno)}`);
  ok(lv.dados?.itens?.find((i) => i.id === pedidoId)?.reembolsos?.some((r) => r.status === 'agendado'), 'a lista de vendas sabe que está na fila');
  const cancelou = naFila ? await painel('POST', `/vendas/reembolsos/${naFila.id}/cancelar`) : { status: 0 };
  ok(cancelou.status === 200 && cancelou.dados?.acesso_voltou >= 1, 'tirar da fila devolve o acesso', cancelou.dados?.erro);
  s = await situacao();
  ok(s.status === 'pago' && s.mat === 'ativa', 'fora da fila: pedido pago e acesso de volta');

  const minhas = await aluno('GET', '/compras');
  const minha = minhas.dados?.find?.((c) => c.id === pedidoId);
  ok(minhas.status === 200 && minha?.garantia_ate && !minha.reembolso, 'o aluno vê a compra com a garantia');
  const uso = await aluno('GET', `/compras/${pedidoId}/reembolso`);
  ok(uso.status === 200 && uso.dados?.aulas_vistas >= 1 && uso.dados?.dias === 7, 'antes de pedir, o aluno vê o que já usou', JSON.stringify(uso.dados)?.slice(0, 160));
  ok(Array.isArray(uso.dados?.arquivos) && uso.dados.arquivos.length >= 1, 'e os arquivos que baixou');
  const semConcordar = await aluno('POST', `/compras/${pedidoId}/reembolso`, { motivo: 'Comprei por engano' });
  ok(semConcordar.status === 400, 'sem marcar "concordo", não pede');
  const semMotivo = await aluno('POST', `/compras/${pedidoId}/reembolso`, { concordo: true });
  ok(semMotivo.status === 400, 'sem motivo, não pede');
  const pediu = await aluno('POST', `/compras/${pedidoId}/reembolso`, { motivo: 'Comprei por engano', concordo: true });
  ok(pediu.status === 200 && pediu.dados?.devolver_em, 'o aluno pede o reembolso pelo app', pediu.dados?.erro);
  s = await situacao();
  ok(s.status === 'pago' && s.mat === 'revogada', 'pedido do aluno: entra na fila e o acesso cai');
  const [ra] = await sql(`select status, dias, pelo_aluno from reembolsos where pedido_id = ${txt(pedidoId)} and status = 'agendado'`);
  ok(ra && ra.dias === 7 && ra.pelo_aluno === true, 'na fila com 7 dias, marcado como pedido pelo aluno');
  const deNovo = await aluno('POST', `/compras/${pedidoId}/reembolso`, { motivo: 'Comprei por engano', concordo: true });
  ok(deNovo.status === 409, 'não pede duas vezes');
  const [em] = await sql(`select count(*)::int n from emails where ref = ${txt(`pedido:${pedidoId}`)} and tipo = 'recibo' and assunto like 'Recebemos seu pedido de reembolso%'`);
  ok(em.n === 1, 'o aluno recebe a confirmação por e-mail');
  const [eq] = await sql(`select count(*)::int n from emails where ref = ${txt(`pedido:${pedidoId}`)} and tipo = 'aviso'`);
  ok(eq.n === 0, 'pedido de teste não avisa a equipe de verdade');

  const fila2 = await painel('GET', '/vendas/reembolsos');
  const doAluno = fila2.dados?.itens?.find((r) => r.pedido?.id === pedidoId);
  const re = doAluno ? await painel('POST', `/vendas/reembolsos/${doAluno.id}/devolver`) : { status: 0 };
  ok(re.status === 200, 'devolver agora pelo painel', re.dados?.erro);
  const [pr] = await sql(`select p.status, m.status mat, r.status fila from pedidos p left join matriculas m on m.pedido_id = p.id left join reembolsos r on r.pedido_id = p.id and r.pelo_aluno where p.id = ${txt(pedidoId)}`);
  ok(pr.status === 'reembolsado' && pr.mat === 'revogada' && pr.fila === 'feito', 'pedido reembolsado, matrícula revogada e a fila marcada como feita');
  const sem = await aluno('GET', `/cursos/${CURSO}`);
  ok(sem.status === 403, 'sem matrícula, o curso fecha para o aluno');
  const semAula = await aluno('GET', `/aulas/${alvo.id}`);
  ok(semAula.status === 403, 'e a aula também');
} catch (e) {
  falhas++;
  console.log('FALHA', e.stack || e.message);
} finally {
  // ------------------------------------------------------------ limpeza (inclui o aluno de teste antigo)
  for (const q of restaurar) await sql(q).catch(() => {});
  const emails = [emailAluno, emailBonus, `ninguem-${ts}@example.com`, 'teste.area+1@agenciasetup.com.br'];
  const lista = emails.map(txt).join(',');
  try {
    const alunos = await sql(`select id, auth_id from alunos where email in (${lista})`);
    const ids = alunos.map((a) => txt(a.id)).join(',') || "'00000000-0000-0000-0000-000000000000'";
    const pedidos = await sql(`select id, visitante from pedidos where aluno_id in (${ids})`);
    const pids = pedidos.map((x) => txt(x.id)).join(',') || "'00000000-0000-0000-0000-000000000000'";
    const vis = [...new Set([visitante, ...pedidos.map((x) => x.visitante)].filter(Boolean))].map(txt).join(',') || "''";
    await sql(`
      delete from progresso where aluno_id in (${ids});
      delete from matriculas where aluno_id in (${ids});
      delete from eventos_pagamento where pedido_id in (${pids});
      delete from emails where para in (${lista}) or ref in (${pedidos.map((x) => txt(`pedido:${x.id}`)).concat(alunos.map((a) => txt(`aluno:${a.id}`))).join(',') || "''"});
      delete from pedidos where id in (${pids});
      delete from toques where visitante in (${vis}) or link = ${txt(codigoLink)};
      delete from links where codigo = ${txt(codigoLink)};
      delete from limites where chave in (${emails.map((e) => txt(`ck:${e}`)).concat(emails.map((e) => txt(`codigo:${e}`)), pedidos.map((x) => txt(`entrada:${x.id}`))).join(',')});
      delete from auditoria where alvo in (${pedidos.map((x) => txt(`pedido:${x.id}`)).concat(alunos.map((a) => txt(`aluno:${a.id}`)), [txt(`link:${codigoLink}`)]).join(',')});
      delete from alunos where id in (${ids});
    `);
    for (const a of alunos) if (a.auth_id) await supa(`/admin/users/${a.auth_id}`, { method: 'DELETE' }).catch((e) => console.log('não apaguei um login de aluno:', e.message));
  } catch (e) {
    console.log('limpeza dos alunos falhou:', e.message);
  }
  if (membroId) await sql(`delete from auditoria where equipe_id = ${txt(membroId)}; delete from equipe where id = ${txt(membroId)}`).catch(() => {});
  if (authEquipe) await supa(`/admin/users/${authEquipe}`, { method: 'DELETE' }).catch((e) => console.log('não apaguei o login de teste:', e.message));
  console.log('\nalunos, pedidos, e-mails, toques e equipe de teste apagados');
}
console.log(falhas ? `\n${falhas} conferência(s) falharam` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
