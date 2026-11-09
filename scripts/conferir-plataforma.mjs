// Confere as Fases D e F da área de membros (docs/area-de-membros.md), no computador (pagamento simulado):
// vender mais (cupom só na primeira compra, preço antes de pagar, upsell na tela de obrigado, vagas de equipe, indique um
// amigo, presente) e a plataforma (montar curso, aula com marcadores, arquivo no bucket, reordenar, "aula atualizada",
// trilha no início do aluno, webhooks assinados, Números, relatório e as ferramentas area_* do conector).
// Cria produtos, ofertas, alunos, um curso e uma pessoa da equipe de teste e apaga tudo no fim.
// Uso (com `npm run dev` e `npm run dev:curso` ligados): node scripts/conferir-plataforma.mjs
import { createHmac, randomBytes } from 'node:crypto';
import { env, exige, sql } from './env.mjs';

exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_PUBLISHABLE_KEY');
const site = (process.argv[2] || 'http://localhost:8787').replace(/\/$/, '');
const curso = (process.argv[3] || 'http://localhost:8788').replace(/\/$/, '');
if (!/localhost|127\.0\.0\.1/.test(site)) { console.log('O pagamento simulado só existe no computador. Rode com o site local.'); process.exit(1); }
const CURSO = 'posts-automaticos-com-claude';

let falhas = 0;
const ok = (cond, msg, extra = '') => { console.log(`${cond ? 'ok   ' : 'FALHA'} ${msg}${extra ? ` (${extra})` : ''}`); if (!cond) falhas++; };
const txt = (v) => `'${String(v).replace(/'/g, "''")}'`;
const NADA = "'00000000-0000-0000-0000-000000000000'";
const lista = (xs) => xs.filter(Boolean).map(txt).join(',') || NADA;

const ts = Date.now();
const em = (q) => `plataforma-${q}-${ts}@example.com`;
const emails = { a: em('a'), b: em('b'), c: em('c'), d: em('d'), e: em('e'), equipe: em('equipe') };
const slugBase = `conf-base-${ts}`, slugExtra = `conf-extra-${ts}`;
const cupom = `PRIMEIRA${String(ts).slice(-5)}`, cupomMcp = `MCP${String(ts).slice(-5)}`;
let membroId = null, authEquipe = null;
const criado = { produtos: [], ofertas: [], cursoTeste: null, arquivo: null, trilha: null, webhook: null, aulaReal: null, atualizadoAntes: undefined };

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
const entrarComHash = (hash) => supa('/verify', { method: 'POST', body: JSON.stringify({ type: 'magiclink', token_hash: hash }) }, env.SUPABASE_PUBLISHABLE_KEY).then((s) => s.access_token);
async function chamar(base, metodo, caminho, { corpo, token, form } = {}) {
  const r = await fetch(`${base}${caminho}`, { method: metodo, headers: { ...(corpo ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: form || (corpo ? JSON.stringify(corpo) : undefined) });
  const t = await r.text();
  let dados = null; try { dados = JSON.parse(t); } catch { dados = t; }
  return { status: r.status, dados };
}
const tk = {};
const painel = (m, c, corpo) => chamar(site, m, `/api/admin${c}`, { corpo, token: tk.equipe });
const aluno = (quem) => (m, c, corpo) => chamar(curso, m, `/api/aluno${c}`, { corpo, token: tk[quem] });
const A = aluno('a');
const checkout = (corpo) => chamar(site, 'POST', '/api/checkout', { corpo: { nome: 'Teste Plataforma', cpf: cpf(), celular: '62999990000', metodo: 'pix', ...corpo } });
const pagar = (pedido) => chamar(site, 'POST', `/api/checkout/simular/${pedido}`);
const alunoId = async (email) => ((await sql(`select id from alunos where email = ${txt(email)}`))[0] || {}).id;
const matriculado = async (email, cursoId) => (await sql(`select m.origem from matriculas m join alunos a on a.id = m.aluno_id where a.email = ${txt(email)} and m.curso_id = ${txt(cursoId)} and m.status = 'ativa'`))[0] || null;
async function entrar(quem) {
  const r = await painel('POST', `/alunos/${await alunoId(emails[quem])}/link`);
  tk[quem] = await entrarComHash(decodeURIComponent(r.dados.link.match(/token=([^&]+)/)[1]));
}
let n = 0;
async function mcp(method, params = {}) {
  const r = await fetch(`${site}/mcp/ferramentas`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${env.MCP_CHAVE}` }, body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method, params }) });
  return r.json().catch(() => null);
}

console.log(`conferindo a plataforma em ${site} e ${curso}\n`);
try {
  // ------------------------------------------------------------ equipe, curso real e ofertas de teste
  const u = await supa('/admin/users', { method: 'POST', body: JSON.stringify({ email: emails.equipe, password: `Cf${randomBytes(12).toString('hex')}9`, email_confirm: true }) });
  authEquipe = u.id;
  const [m] = await sql(`insert into equipe (email, nome, papel) values (${txt(emails.equipe)}, 'Equipe de Teste', 'administrador') returning id`);
  membroId = m.id;
  const l = await supa('/admin/generate_link', { method: 'POST', body: JSON.stringify({ type: 'magiclink', email: emails.equipe }) });
  tk.equipe = await entrarComHash(l.hashed_token || l.properties?.hashed_token);
  const cursos = (await painel('GET', '/area/cursos')).dados;
  const real = cursos.find((x) => x.slug === CURSO);
  const aulasReais = real.modulos.flatMap((mo) => mo.aulas).filter((x) => x.status === 'publicado');
  const [p1] = await sql(`insert into produtos (slug, nome, preco_centavos, ativo) values (${txt(slugBase)}, 'Base de Teste', 3990, true) returning id`);
  const [p2] = await sql(`insert into produtos (slug, nome, preco_centavos, ativo) values (${txt(slugExtra)}, 'Extra de Teste', 1990, true) returning id`);
  criado.produtos.push(p1.id, p2.id);
  await sql(`insert into produto_acessos (produto_id, curso_id) values (${txt(p1.id)}, ${txt(real.id)})`);
  const [oExtra] = await sql(`insert into ofertas (slug, produto_id, nome, preco_centavos, metodos, ativa) values (${txt(slugExtra)}, ${txt(p2.id)}, 'Extra de Teste', 1990, '{pix}', false) returning id`);
  const [oBase] = await sql(`insert into ofertas (slug, produto_id, nome, preco_centavos, metodos, ativa, checkout) values (${txt(slugBase)}, ${txt(p1.id)}, 'Base de Teste', 3990, '{pix,cartao}', false, ${txt(JSON.stringify({ vagas: 3, upsell: { oferta: slugExtra, titulo: 'Leve também o extra' } }))}::jsonb) returning id`);
  criado.ofertas.push(oBase.id, oExtra.id);
  ok(true, 'ofertas de teste (base com 3 vagas e upsell, extra)');

  // ------------------------------------------------------------ webhook (antes das vendas, para pegar os eventos)
  const wh = await painel('POST', '/webhooks', { nome: `Teste ${ts}`, url: 'https://127.0.0.1:9/conferir', eventos: ['venda.paga', 'aluno.liberado', 'aula.concluida'] });
  criado.webhook = wh.dados && wh.dados.id;
  ok(wh.status === 200 && /^whsec_[0-9a-f]{48}$/.test(wh.dados.segredo || ''), 'webhook criado e o segredo aparece uma vez');
  const lw = await painel('GET', '/webhooks');
  ok(lw.dados.webhooks.some((x) => x.id === criado.webhook && x.segredo === undefined), 'a lista não traz o segredo');
  ok((await painel('POST', '/webhooks', { nome: 'x', url: 'http://inseguro.com', eventos: ['venda.paga'] })).status === 400, 'endereço sem https é recusado');
  const teste = await painel('POST', `/webhooks/${criado.webhook}/testar`);
  ok(teste.status === 200 && teste.dados.ok === false && !!teste.dados.erro, 'testar mostra o erro quando o outro sistema não responde', teste.dados && teste.dados.erro);
  const { assinar } = await import('../worker/lib/plataforma.js');
  ok((await assinar('segredo', '{"a":1}')) === createHmac('sha256', 'segredo').update('{"a":1}').digest('hex'), 'assinatura HMAC SHA-256 confere com a do Node');

  // ------------------------------------------------------------ cupom só na primeira compra + preço antes de pagar
  const cp = await painel('POST', '/area/cupons', { codigo: cupom, tipo: 'pct', valor: 10, primeira_compra: true, ativo: true, ofertas: [oBase.id] });
  ok(cp.status === 200, 'cupom de primeira compra criado');
  const cot = await chamar(site, 'POST', '/api/checkout/preco', { corpo: { oferta: slugBase, email: emails.a, cupom, metodo: 'pix' } });
  ok(cot.status === 200 && cot.dados.cupom && cot.dados.desconto === 399 && cot.dados.total === 3591, 'cotar mostra o desconto antes de pagar', cot.dados && `${cot.dados.total}`);
  const ca = await checkout({ oferta: slugBase, email: emails.a, cupom });
  ok(ca.status === 200 && ca.dados.total_centavos === 3591, 'compra com o cupom');
  const pa = await pagar(ca.dados.pedido);
  ok(pa.status === 200 && pa.dados.resultado === 'pago', 'pagamento simulado confirmado');
  ok(!!(await matriculado(emails.a, real.id)), 'a oferta base libera o curso pelo produto');
  const cot2 = await chamar(site, 'POST', '/api/checkout/preco', { corpo: { oferta: slugBase, email: emails.a, cupom } });
  ok(cot2.dados && /primeira compra/.test(cot2.dados.erro_cupom || ''), 'quem já comprou não usa o cupom de novo');

  // ------------------------------------------------------------ upsell na tela de obrigado
  const dep = await chamar(site, 'GET', `/api/checkout/pedido/${ca.dados.pedido}/depois`);
  ok(dep.dados && dep.dados.upsell && dep.dados.upsell.slug === slugExtra, 'a tela de obrigado oferece o upsell');
  const up = await chamar(site, 'POST', '/api/checkout/upsell', { corpo: { pedido: ca.dados.pedido, oferta: slugExtra, metodo: 'pix' } });
  ok(up.status === 200 && up.dados.pix && up.dados.total_centavos === 1990, 'upsell com um toque (Pix novo, sem preencher nada)');
  const [orig] = up.dados.pedido ? await sql(`select pedido_origem from pedidos where id = ${txt(up.dados.pedido)}`) : [{}];
  ok(orig && orig.pedido_origem === ca.dados.pedido, 'o upsell lembra o pedido de origem');

  // ------------------------------------------------------------ vagas de equipe e indique um amigo
  await entrar('a');
  const vg = await A('GET', '/vagas');
  const vaga = (vg.dados || []).find((x) => x.id === ca.dados.pedido);
  ok(vaga && vaga.vagas === 3 && vaga.usadas === 1, 'a compra mostra 3 vagas (1 usada)');
  const cv = await A('POST', `/vagas/${ca.dados.pedido}`, { email: emails.e, nome: 'Eva Equipe' });
  ok(cv.status === 200 && !!(await matriculado(emails.e, real.id)), 'convidar alguém da equipe libera o curso para ela');
  ok((await A('POST', `/vagas/${ca.dados.pedido}`, { email: emails.e })).status === 409, 'a mesma pessoa não ocupa duas vagas');
  const ind = await A('GET', '/indicacao');
  ok(ind.status === 200 && /^[a-z0-9]{6,12}$/.test(ind.dados.codigo || ''), 'código de indicação do aluno');
  const cd = await checkout({ oferta: slugBase, email: emails.d, indicado: ind.dados.codigo });
  const [pd] = await sql(`select indicado_por from pedidos where id = ${txt(cd.dados.pedido)}`);
  ok(pd && pd.indicado_por === (await alunoId(emails.a)), 'a compra indicada guarda quem indicou');
  await pagar(cd.dados.pedido);
  const [indic] = await sql(`select status from indicacoes where pedido_id = ${txt(cd.dados.pedido)}`);
  const [xp] = await sql(`select count(*)::int as n from xp_eventos where ref = ${txt(`indicacao:${cd.dados.pedido}`)}`);
  ok(indic && indic.status === 'paga' && xp.n === 1, 'indicação paga: +50 XP para quem indicou');
  const indDepois = await A('GET', '/indicacao');
  ok(indDepois.dados.pagas === 1, 'o aluno vê a indicação que comprou');

  // ------------------------------------------------------------ presente
  const cb = await checkout({ oferta: slugBase, email: emails.b, presente: { email: emails.c, nome: 'Cora Presente', mensagem: 'Feliz aniversário!' } });
  ok(cb.status === 200, 'compra para presente');
  await pagar(cb.dados.pedido);
  const mc = await matriculado(emails.c, real.id);
  ok(mc && !(await matriculado(emails.b, real.id)), 'o presente libera o curso para quem ganhou, não para quem comprou', mc && mc.origem);

  // ------------------------------------------------------------ montar um curso no painel
  const nc = await painel('POST', '/area/cursos', { titulo: `Curso de Teste ${ts}`, subtitulo: 'só para conferir' });
  criado.cursoTeste = nc.dados && nc.dados.id;
  ok(nc.status === 200 && nc.dados.status === 'rascunho' && nc.dados.slug.startsWith('curso-de-teste'), 'curso novo nasce rascunho com slug');
  const md = await painel('POST', '/area/modulos', { curso_id: criado.cursoTeste, titulo: 'Começo' });
  ok(md.status === 200 && md.dados.numero === 1, 'módulo 1');
  const a1 = await painel('POST', '/area/aulas', { modulo_id: md.dados.id, titulo: 'Primeira', duracao_s: 300, marcadores: [{ s: 200, titulo: 'Depois' }, { s: 40, titulo: 'Antes' }], pausas: [{ s: 60, texto: 'Faça no seu Claude' }], faca_agora: [{ titulo: 'Abrir o Claude', prompt: 'Oi [nome]', acoes: 'copiar, claude' }] });
  const a2 = await painel('POST', '/area/aulas', { modulo_id: md.dados.id, titulo: 'Segunda' });
  ok(a1.dados.codigo === '1.1' && a2.dados.codigo === '1.2', 'aulas ganham o código sozinhas (1.1, 1.2)');
  ok(a1.dados.marcadores[0].s === 40 && a1.dados.faca_agora[0].acoes.join() === 'copiar,claude', 'marcadores em ordem e botões do "Faça agora"');
  await painel('POST', '/area/ordem/aulas', { ids: [a2.dados.id, a1.dados.id] });
  let lido = await painel('GET', `/area/cursos/${criado.cursoTeste}`);
  ok(lido.dados.modulos[0].aulas[0].id === a2.dados.id, 'reordenar as aulas');
  const pub = await painel('PUT', `/area/aulas/${a1.dados.id}`, { status: 'publicado', video_panda: ' abc-123 ', video_bunny: ' 1f2e3d4c-0000-4000-8000-000000000000 ' });
  ok(pub.dados.video_panda === 'abc-123' && pub.dados.video_bunny === '1f2e3d4c-0000-4000-8000-000000000000', 'editar e publicar a aula (vídeo do Panda e do Bunny)');
  const [antesBunny] = await sql(`select count(*)::int as n from config where chave = 'bunny'`);
  const bErrado = await painel('POST', '/integracoes/bunny', { biblioteca: '788430', chave: 'chave-errada-0000-0000-0000-000000000000', token: 'token-errado-0000-0000-0000-000000000000' });
  const [depoisBunny] = await sql(`select count(*)::int as n from config where chave = 'bunny'`);
  ok(bErrado.status === 400 && depoisBunny.n === antesBunny.n, 'chave errada do Bunny é recusada e nada é gravado', bErrado.dados && bErrado.dados.erro);
  const form = new FormData();
  form.append('arquivo', new Blob(['# Guia de teste\nlinha 2\n'], { type: 'text/markdown' }), `guia-${ts}.md`);
  const env1 = await chamar(site, 'POST', `/api/admin/area/cursos/${criado.cursoTeste}/arquivo`, { token: tk.equipe, form });
  ok(env1.status === 200 && env1.dados.caminho.endsWith(`guia-${ts}.md`), 'arquivo sobe para o bucket privado', env1.status !== 200 ? JSON.stringify(env1.dados).slice(0, 120) : '');
  criado.arquivo = env1.dados && env1.dados.caminho;
  const fa = await painel('POST', '/area/arquivos', { curso_id: criado.cursoTeste, nome: 'Guia de teste', tipo: 'guia', caminho: criado.arquivo, bytes: env1.dados.bytes, como: 'passo 1\npasso 2', aula_id: a1.dados.id });
  ok(fa.status === 200 && fa.dados.origem === 'storage' && fa.dados.como.length === 2, 'ficha do arquivo (origem e "como usar")');
  ok((await painel('POST', `/area/arquivos/${fa.dados.id}/remover`)).status === 200, 'tirar o arquivo do curso');

  // ------------------------------------------------------------ aula concluída, curso vivo e trilha
  const [aula1, aula2] = aulasReais;
  criado.aulaReal = aula1.id;
  criado.atualizadoAntes = ((await sql(`select conteudo_atualizado_em from aulas where id = ${txt(aula1.id)}`))[0] || {}).conteudo_atualizado_em ?? null;
  const pr = await A('POST', `/aulas/${aula1.id}/progresso`, { posicao: 10, assistido: 10, concluir: true });
  ok(pr.status === 200 && pr.dados.concluida, 'aluno conclui uma aula');
  const at = await painel('POST', `/area/aulas/${aula1.id}/atualizada`, { nota: 'Prompt novo no passo 2.' });
  ok(at.status === 200 && at.dados.avisados >= 1, '"aula atualizada" avisa quem já tinha visto', at.dados && at.dados.avisados);
  const sino = await A('GET', '/notificacoes');
  ok(JSON.stringify(sino.dados).includes('Prompt novo no passo 2.'), 'o aviso chega no sino do aluno');
  await A('PATCH', '/eu', { objetivo: 'automatizar' });
  const tr = await painel('POST', '/area/trilhas', { titulo: `Trilha ${ts}`, objetivo: 'automatizar', itens: [{ tipo: 'aula', id: aula1.id, titulo: 'Começar' }, { tipo: 'aula', id: aula2.id, titulo: 'Seguir' }] });
  criado.trilha = tr.dados && tr.dados.id;
  ok(tr.status === 200 && tr.dados.itens.length === 2, 'trilha criada no painel');
  const ini = await A('GET', '/inicio');
  const t = ini.dados && ini.dados.trilha;
  ok(t && t.titulo === `Trilha ${ts}` && t.passos[0].estado === 'feito' && t.passos[1].estado === 'agora' && t.passos[1].primeira === aula2.id, 'a trilha do objetivo aparece no início, com o passo feito e o próximo');

  // ------------------------------------------------------------ a fila dos webhooks
  const fila = await sql(`select evento, payload from webhook_envios where webhook_id = ${txt(criado.webhook)} and evento <> 'teste'`);
  const ev = new Set(fila.map((x) => x.evento));
  ok(ev.has('venda.paga') && ev.has('aluno.liberado') && ev.has('aula.concluida'), 'vendas, acessos e aula concluída entram na fila do webhook', [...ev].join(', '));
  const venda = fila.find((x) => x.evento === 'venda.paga' && x.payload.dados.aluno.email === emails.a);
  ok(venda && venda.payload.dados.pedido.total_centavos === 3591 && venda.payload.dados.pedido.cupom === cupom, 'o aviso da venda traz o pedido e o aluno');

  // ------------------------------------------------------------ números e relatório
  const nu = await painel('GET', '/numeros?dias=30');
  ok(nu.status === 200 && nu.dados.vendas && nu.dados.funil && nu.dados.aulas.length >= aulasReais.length && Array.isArray(nu.dados.turmas), 'a tela Números responde com vendas, funil, aulas e turmas');
  const [reais] = await sql(`select count(*)::int as n from pedidos where status = 'pago' and not teste and criado_em > now() - interval '30 days'`);
  ok(nu.dados.vendas.pagos === reais.n, 'pedidos de teste ficam fora dos números');
  const aulaN = nu.dados.aulas.find((x) => x.id === aula1.id);
  ok(aulaN && aulaN.concluiram >= 1, 'cada aula conta quem concluiu');
  ok((await painel('GET', '/relatorios')).status === 200, 'lista de relatórios');
  if (!nu.dados.ia) ok((await painel('POST', '/relatorios')).status === 409, 'sem o Claude ligado, o relatório pede para ligar');
  else console.log('pulei   gerar o relatório (gasta créditos do Claude)');

  // ------------------------------------------------------------ conector do Claude
  if (env.MCP_CHAVE) {
    const ferr = (await mcp('tools/list')).result.tools.map((f) => f.name);
    ok(['area_numeros', 'area_vendas', 'area_alunos', 'area_duvidas', 'area_salvar_cupom', 'area_salvar_aviso', 'area_ligar_aviso'].every((f) => ferr.includes(f)), 'o conector tem as ferramentas da área de membros');
    const rn = await mcp('tools/call', { name: 'area_numeros', arguments: { dias: 7 } });
    ok(rn.result && !rn.result.isError && rn.result.structuredContent.vendas, 'area_numeros responde');
    const rc = await mcp('tools/call', { name: 'area_salvar_cupom', arguments: { codigo: cupomMcp, tipo: 'pct', valor: 5, ativo: true } });
    ok(rc.result && !rc.result.isError && rc.result.structuredContent.ativo === false, 'cupom criado pelo Claude nasce desligado');
    const ra = await mcp('tools/call', { name: 'area_salvar_aviso', arguments: { tipo: 'aviso', titulo: `Aviso MCP ${ts}`, texto: 'teste', ativo: true } });
    ok(ra.result && !ra.result.isError && ra.result.structuredContent.ativo === false, 'aviso criado pelo Claude nasce desligado');
  } else console.log('pulei   o conector (falta MCP_CHAVE no .env.local)');
} catch (e) {
  falhas++;
  console.log('FALHA inesperada:', e.stack || e.message);
} finally {
  // ------------------------------------------------------------ limpeza
  try {
    if (criado.aulaReal) await sql(`update aulas set conteudo_atualizado_em = ${criado.atualizadoAntes ? txt(criado.atualizadoAntes) : 'null'} where id = ${txt(criado.aulaReal)}`);
    const todos = Object.values(emails);
    const alunos = await sql(`select id, auth_id from alunos where email in (${lista(todos)})`);
    const ids = lista(alunos.map((a) => a.id));
    const pedidos = await sql(`select id from pedidos where aluno_id in (${ids}) or oferta_id in (${lista(criado.ofertas)})`);
    const pids = lista(pedidos.map((x) => x.id));
    await sql(`
      delete from eventos_pagamento where pedido_id in (${pids});
      delete from emails where para in (${lista(todos)}) or ref in (${lista(pedidos.map((x) => `pedido:${x.id}`))});
      update pedidos set pedido_origem = null where id in (${pids});
      delete from pedidos where id in (${pids});
      delete from limites where chave like '%${ts}%' or chave in (${lista(pedidos.map((x) => `upsell:${x.id}`))});
      delete from auditoria where alvo in (${lista([...pedidos.map((x) => `pedido:${x.id}`), ...alunos.map((a) => `aluno:${a.id}`)])});
      delete from alunos where id in (${ids});
      delete from cupons where codigo in (${lista([cupom, cupomMcp])});
      delete from avisos where titulo = ${txt(`Aviso MCP ${ts}`)};
      delete from ofertas where id in (${lista(criado.ofertas)});
      delete from produtos where id in (${lista(criado.produtos)});
      delete from cursos where id in (${lista([criado.cursoTeste])});
      delete from trilhas where id in (${lista([criado.trilha])});
      delete from webhooks_saida where id in (${lista([criado.webhook])});
    `);
    if (criado.arquivo) await fetch(`${env.SUPABASE_URL}/storage/v1/object/curso/${criado.arquivo}`, { method: 'DELETE', headers: { apikey: env.SUPABASE_SECRET_KEY, ...(env.SUPABASE_SECRET_KEY.startsWith('sb_') ? {} : { authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` }) } }).catch(() => {});
    for (const a of alunos) if (a.auth_id) await supa(`/admin/users/${a.auth_id}`, { method: 'DELETE' }).catch((e) => console.log('não apaguei um login de aluno:', e.message));
  } catch (e) {
    console.log('limpeza falhou:', e.message);
  }
  if (membroId) await sql(`delete from auditoria where equipe_id = ${txt(membroId)} or (via = 'mcp' and alvo in (${lista([`cupom:${cupomMcp}`])})); delete from equipe where id = ${txt(membroId)}`).catch((e) => console.log('limpeza da equipe:', e.message));
  if (authEquipe) await supa(`/admin/users/${authEquipe}`, { method: 'DELETE' }).catch((e) => console.log('não apaguei o login de teste:', e.message));
  console.log('\nalunos, pedidos, ofertas, curso, trilha, webhook e equipe de teste apagados');
}
console.log(falhas ? `\n${falhas} falha(s).` : '\ntudo certo.');
process.exit(falhas ? 1 : 0);
