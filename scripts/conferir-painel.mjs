// Confere o painel e o login do conector de ponta a ponta, com um login de verdade:
// cria uma pessoa de teste (Supabase Auth + equipe), entra, usa a API do painel, faz o caminho completo do app do
// Claude (registro, Permitir, código, chave, renovação, revogação) e apaga tudo no fim.
// Uso: node scripts/conferir-painel.mjs                       (site ligado em http://localhost:8787)
//      node scripts/conferir-painel.mjs https://agenciasetup.com.br
import { createHash, randomBytes } from 'node:crypto';
import { env, exige, sql } from './env.mjs';

exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_PUBLISHABLE_KEY');
const base = (process.argv[2] || 'http://localhost:8787').replace(/\/$/, '');
let falhas = 0;
const ok = (cond, msg, extra = '') => { console.log(`${cond ? 'ok   ' : 'FALHA'} ${msg}${extra ? ` (${extra})` : ''}`); if (!cond) falhas++; };
const b64u = (b) => Buffer.from(b).toString('base64url');

const ts = Date.now();
const email = `conferir-${ts}@example.com`;
const senha = `Cf${randomBytes(12).toString('hex')}9`;
let authId = null, membroId = null;
const criados = { recursos: [], pecas: [] };

async function supa(caminho, opcoes = {}, chave = env.SUPABASE_SECRET_KEY) {
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1${caminho}`, { ...opcoes, headers: { apikey: chave, 'content-type': 'application/json', ...(opcoes.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`auth ${caminho}: ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}

let token = '';
async function api(metodo, caminho, corpo, extra = {}) {
  const r = await fetch(`${base}/api/admin${caminho}`, {
    method: metodo,
    headers: { authorization: `Bearer ${token}`, ...(corpo && !(corpo instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...extra },
    body: corpo instanceof FormData ? corpo : corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, dados: await r.json().catch(() => null) };
}

console.log(`conferindo o painel em ${base}\n`);
try {
  // ------------------------------------------------------------ login de verdade
  const u = await supa('/admin/users', { method: 'POST', body: JSON.stringify({ email, password: senha, email_confirm: true }) });
  authId = u.id;
  const [m] = await sql(`insert into equipe (email, nome, papel) values ('${email}', 'Conferência automática', 'administrador') returning id`);
  membroId = m.id;
  const s = await supa('/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password: senha }) }, env.SUPABASE_PUBLISHABLE_KEY);
  token = s.access_token;
  ok(!!token, 'login com e-mail e senha no Supabase');

  const semLogin = await fetch(`${base}/api/admin/eu`);
  ok(semLogin.status === 401, 'API do painel recusa quem não entrou');
  const eu = await api('GET', '/eu');
  ok(eu.status === 200 && eu.dados.usuario.email === email && eu.dados.permissoes.includes('equipe.editar'), 'GET /eu reconhece a pessoa e o cargo');
  const [ligado] = await sql(`select auth_id from equipe where id = '${membroId}'`);
  ok(ligado.auth_id === authId, 'primeiro login liga a conta à equipe');
  const pagina = await fetch(`${base}/admin/`);
  ok(pagina.status === 200 && (await pagina.text()).includes('<div id='), '/admin/ entrega o painel');
  const sub = await fetch(`${base}/admin/fila/qualquer`);
  ok(sub.status === 200, '/admin/<qualquer tela> entrega o painel (app de uma página)');

  // ------------------------------------------------------------ início e listas
  for (const c of ['/inicio', '/pendencias', '/categorias', '/conteudo/recursos', '/conteudo/artigos', '/produtos', '/landing-pages', '/anuncios', '/pecas', '/pautas', '/redes', '/claude', '/equipe', '/config', '/historico']) {
    const r = await api('GET', c);
    ok(r.status === 200, `GET ${c}`, r.status !== 200 ? `${r.status} ${r.dados && r.dados.erro}` : '');
  }
  const redes = (await api('GET', '/redes')).dados;
  ok(Array.isArray(redes) && redes.length === 8 && redes.every((r) => r.situacao === 'em_breve'), 'redes: 8 módulos, todos "em breve"');

  // ------------------------------------------------------------ conteúdo
  const rec = await api('POST', '/conteudo/recursos', { titulo: `Recurso conferência ${ts}`, tipo: 'prompt', resumo: 'Teste.', corpo_md: '## Oi', tags: ['teste'] });
  ok(rec.status === 200 && rec.dados.status === 'rascunho', 'criar recurso (rascunho)');
  criados.recursos.push(rec.dados.id);
  const ed = await api('PATCH', `/conteudo/recursos/${rec.dados.id}`, { resumo: 'Editado.' });
  ok(ed.status === 200 && ed.dados.resumo === 'Editado.', 'editar recurso');
  const pub = await api('POST', `/conteudo/recursos/${rec.dados.id}/publicar`);
  ok(pub.status === 200 && pub.dados.status === 'publicado' && pub.dados.endereco, 'publicar recurso');
  const fd = new FormData();
  fd.append('bucket', 'midia');
  fd.append('arquivo', new Blob([Buffer.from('conferencia')], { type: 'text/plain' }), 'teste.txt');
  const up = await api('POST', '/arquivos', fd);
  ok(up.status === 200 && /\/storage\/v1\/object\/public\/midia\//.test(up.dados.url || ''), 'enviar arquivo para o Storage', up.status !== 200 ? up.dados && up.dados.erro : '');
  if (up.status === 200) criados.arquivo = up.dados.url.split('/object/public/midia/')[1];

  // ------------------------------------------------------------ fila
  const tokenCasa = env.MCP_CHAVE;
  const pecasR = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenCasa}` }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'criar_pecas', arguments: { origem_tipo: 'recurso', origem_id: rec.dados.id, pecas: [{ rede: 'instagram', formato: 'carrossel', titulo: 'Teste', legenda: 'Teste', slides: [{ titulo: 'Capa' }] }] } } }) }).then((r) => r.json());
  const pecaId = pecasR.result && pecasR.result.structuredContent && pecasR.result.structuredContent.pecas[0].id;
  ok(!!pecaId, 'Claude cria peça na fila (chave colada)');
  if (pecaId) {
    criados.pecas.push(pecaId);
    const det = await api('GET', `/pecas/${pecaId}`);
    ok(det.status === 200 && det.dados.origem && det.dados.rede && det.dados.rede.id === 'instagram', 'peça mostra origem e rede');
    ok((await api('PATCH', `/pecas/${pecaId}`, { legenda: 'Legenda nova' })).dados.legenda === 'Legenda nova', 'editar peça');
    ok((await api('POST', `/pecas/${pecaId}/aprovar`)).dados.status === 'aprovado', 'aprovar peça');
    const agora = await api('POST', `/pecas/${pecaId}/publicar-agora`);
    ok(agora.status === 409, 'publicar agora recusa rede ainda não ligada', agora.dados && agora.dados.erro);
    ok((await api('POST', `/pecas/${pecaId}/agendar`, { agendado_para: new Date(Date.now() - 3600_000).toISOString() })).dados.status === 'agendado', 'agendar peça');
    if (base.includes('localhost')) {
      await fetch(`${base}/__scheduled?cron=*/10+*+*+*+*`);
      await new Promise((r) => setTimeout(r, 5000));
      const depois = (await api('GET', `/pecas/${pecaId}`)).dados;
      ok(depois.status === 'erro' && /ainda não está ligada/.test(depois.erro || ''), 'relógio pega a peça e avisa que a rede não está ligada', `${depois.status}: ${depois.erro || ''} ${depois.agendado_para}`);
      ok((await api('POST', `/pecas/${pecaId}/voltar`)).dados.status === 'rascunho', 'voltar peça para rascunho');
    }
  }

  // ------------------------------------------------------------ chaves do Claude
  const ch = await api('POST', '/claude/chaves', { nome: 'Conferência', papel: 'redator' });
  ok(ch.status === 200 && /^as_/.test(ch.dados.chave), 'criar chave do conector');
  const ini = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${ch.dados.chave}` }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) }).then((r) => r.json());
  const nomes = (ini.result && ini.result.tools || []).map((t) => t.name);
  ok(nomes.includes('criar_pecas') && !nomes.includes('publicar') && !nomes.includes('publicar_peca_agora'), 'chave de Redator não vê ferramentas de publicar', `${nomes.length} ferramentas`);
  ok((await api('POST', `/claude/chaves/${ch.dados.id}/revogar`)).dados.ok === true, 'revogar chave');

  // ------------------------------------------------------------ login do app do Claude (OAuth)
  const semChave = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"jsonrpc":"2.0","id":1,"method":"initialize"}' });
  const desafio = semChave.headers.get('www-authenticate') || '';
  ok(semChave.status === 401 && desafio.includes('resource_metadata='), '/mcp sem chave aponta para a ficha do login');
  const ficha = await fetch(`${base}/.well-known/oauth-protected-resource/mcp`).then((r) => r.json());
  ok(ficha.resource === `${base}/mcp`, 'ficha do recurso');
  const servidor = await fetch(`${base}/.well-known/oauth-authorization-server`).then((r) => r.json());
  ok(servidor.code_challenge_methods_supported.includes('S256') && servidor.registration_endpoint, 'ficha do servidor de login');
  const volta = 'https://claude.ai/api/mcp/auth_callback';
  const reg = await fetch(servidor.registration_endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_name: 'Conferência', redirect_uris: [volta] }) }).then((r) => r.json());
  ok(/^asc_/.test(reg.client_id || ''), 'registro do app (DCR)');
  const mcp = (chave, metodo = 'tools/list', params) => fetch(`${base}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${chave}` }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: metodo, params }) });
  const trocar = (corpo) => fetch(servidor.token_endpoint, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: reg.client_id, ...corpo }) });
  // O caminho do app do Claude: authorize -> Permitir no painel -> código -> chave.
  async function conectarApp(primeira) {
    const verificador = b64u(randomBytes(32));
    const desafioPkce = b64u(createHash('sha256').update(verificador).digest());
    const aut = await fetch(`${servidor.authorization_endpoint}?${new URLSearchParams({ response_type: 'code', client_id: reg.client_id, redirect_uri: volta, code_challenge: desafioPkce, code_challenge_method: 'S256', state: 'xyz', resource: `${base}/mcp` })}`, { redirect: 'manual' });
    const local = aut.headers.get('location') || '';
    if (primeira) ok(aut.status === 302 && local.includes('/admin/conectar?pedido='), 'authorize manda para a tela Permitir do painel');
    const pedido = new URL(local).searchParams.get('pedido');
    const info = await api('GET', `/oauth/pedido?p=${encodeURIComponent(pedido)}`);
    if (primeira) ok(info.status === 200 && info.dados.sugerido === 'redator' && !info.dados.conferido, 'tela Permitir: app não conferido sugere Redator');
    const apr = await api('POST', '/oauth/aprovar', { pedido, permitir: true, papel: 'redator' });
    const destino = new URL(apr.dados.destino);
    if (primeira) ok(destino.origin === 'https://claude.ai' && destino.searchParams.get('code') && destino.searchParams.get('state') === 'xyz', 'Permitir devolve o código para o app');
    const codigo = destino.searchParams.get('code');
    const tok = await trocar({ grant_type: 'authorization_code', code: codigo, redirect_uri: volta, code_verifier: verificador }).then((r) => r.json());
    return { tok, codigo, verificador };
  }
  const a = await conectarApp(true);
  ok(/^as_/.test(a.tok.access_token || '') && a.tok.refresh_token, 'código vira chave + renovação');
  const usa = await mcp(a.tok.access_token, 'tools/call', { name: 'visao_geral', arguments: {} }).then((r) => r.json());
  ok(usa.result && !usa.result.isError, 'Claude usa o conector com a chave do login');
  const ren = await trocar({ grant_type: 'refresh_token', refresh_token: a.tok.refresh_token }).then((r) => r.json());
  ok(/^as_/.test(ren.access_token || '') && ren.access_token !== a.tok.access_token, 'renovação gira a chave', ren.error ? `${ren.error}: ${ren.error_description}` : '');
  ok((await mcp(a.tok.access_token)).status === 401, 'a chave velha para de valer depois da renovação');
  ok((await mcp(ren.access_token)).status === 200, 'a chave nova vale');
  const repete = await trocar({ grant_type: 'authorization_code', code: a.codigo, redirect_uri: volta, code_verifier: a.verificador });
  ok(repete.status === 400, 'código usado de novo é recusado');
  ok((await mcp(ren.access_token)).status === 401, 'código repetido derruba a conexão feita com ele');
  const b = await conectarApp(false);
  await fetch(servidor.revocation_endpoint, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: b.tok.access_token }) });
  ok((await mcp(b.tok.access_token)).status === 401, 'revogar pelo app desliga a conexão');
} catch (e) {
  falhas++;
  console.log('FALHA', e.message);
} finally {
  // ------------------------------------------------------------ limpeza
  for (const id of criados.pecas) await sql(`delete from auditoria where alvo like '%${id}%'; delete from pecas where id = '${id}'`).catch(() => {});
  for (const id of criados.recursos) await sql(`delete from auditoria where alvo like '%${id}%'; delete from pecas where origem_id = '${id}'; delete from downloads where recurso_id = '${id}'; delete from recursos where id = '${id}'`).catch(() => {});
  // A peça criada pelo Claude com a chave da casa fica registrada sem dono: sai também.
  await sql("delete from auditoria where alvo = 'pecas' and via = 'mcp' and equipe_id is null and quando > now() - interval '10 minutes'").catch(() => {});
  if (criados.arquivo) await fetch(`${env.SUPABASE_URL}/storage/v1/object/midia/${criados.arquivo}`, { method: 'DELETE', headers: { apikey: env.SUPABASE_SECRET_KEY } }).catch(() => {});
  if (membroId) await sql(`delete from auditoria where equipe_id = '${membroId}'; delete from equipe where id = '${membroId}'`).catch(() => {});
  if (authId) await supa(`/admin/users/${authId}`, { method: 'DELETE' }).catch((e) => console.log('não apaguei o login de teste:', e.message));
  console.log('\npessoa, conteúdo, peças e arquivo de teste apagados');
}
console.log(falhas ? `\n${falhas} conferência(s) falharam` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
