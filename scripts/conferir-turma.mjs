// Confere a turma da área de membros (Fases C e E de docs/area-de-membros.md), no computador:
// comentários (moderação, curtida, resposta oficial), notas, "ajudou?", XP e selos, certificado (página pública e story),
// perfil público, mural (entrega, aprovação, moldura, curtida), desafio, depoimento, banner com público, ranking,
// dúvida para a equipe e o sino. Cria dois alunos e uma pessoa da equipe de teste e apaga tudo no fim.
// Uso (com `npm run dev` e `npm run dev:curso` ligados): node scripts/conferir-turma.mjs
import { randomBytes } from 'node:crypto';
import { env, exige, sql } from './env.mjs';

exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_PUBLISHABLE_KEY');
const site = (process.argv[2] || 'http://localhost:8787').replace(/\/$/, '');
const curso = (process.argv[3] || 'http://localhost:8788').replace(/\/$/, '');
const CURSO = 'posts-automaticos-com-claude';

let falhas = 0;
const ok = (cond, msg, extra = '') => { console.log(`${cond ? 'ok   ' : 'FALHA'} ${msg}${extra ? ` (${extra})` : ''}`); if (!cond) falhas++; };
const txt = (v) => `'${String(v).replace(/'/g, "''")}'`;
const ts = Date.now();
const emails = { a: `turma-a-${ts}@example.com`, b: `turma-b-${ts}@example.com`, equipe: `turma-equipe-${ts}@example.com` };
const usuario = `teste.turma${String(ts).slice(-6)}`;
let membroId = null, authEquipe = null;
const criados = { avisos: [], desafios: [] };

async function supa(caminho, opcoes = {}, chave = env.SUPABASE_SECRET_KEY) {
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1${caminho}`, { ...opcoes, headers: { apikey: chave, 'content-type': 'application/json', ...(opcoes.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`auth ${caminho}: ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}
const entrarComHash = (hash) => supa('/verify', { method: 'POST', body: JSON.stringify({ type: 'magiclink', token_hash: hash }) }, env.SUPABASE_PUBLISHABLE_KEY).then((s) => s.access_token);
async function chamar(base, metodo, caminho, { corpo, token } = {}) {
  const r = await fetch(`${base}${caminho}`, { method: metodo, headers: { ...(corpo ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
  const t = await r.text();
  let dados = null; try { dados = JSON.parse(t); } catch { dados = t; }
  return { status: r.status, dados };
}
const tk = {};
const painel = (m, c, corpo) => chamar(site, m, `/api/admin${c}`, { corpo, token: tk.equipe });
const como = (quem) => (m, c, corpo) => chamar(curso, m, `/api/aluno${c}`, { corpo, token: tk[quem] });
const A = como('a'), B = como('b');

console.log(`conferindo a turma em ${site} e ${curso}\n`);
try {
  // ------------------------------------------------------------ equipe e dois alunos (curso liberado na mão)
  const u = await supa('/admin/users', { method: 'POST', body: JSON.stringify({ email: emails.equipe, password: `Cf${randomBytes(12).toString('hex')}9`, email_confirm: true }) });
  authEquipe = u.id;
  const [m] = await sql(`insert into equipe (email, nome, papel) values (${txt(emails.equipe)}, 'Equipe de Teste', 'administrador') returning id`);
  membroId = m.id;
  const l = await supa('/admin/generate_link', { method: 'POST', body: JSON.stringify({ type: 'magiclink', email: emails.equipe }) });
  tk.equipe = await entrarComHash(l.hashed_token || l.properties?.hashed_token);
  const cursos = await painel('GET', '/area/cursos');
  const c = cursos.dados.find((x) => x.slug === CURSO);
  const aulas = c.modulos.flatMap((mo) => mo.aulas).filter((x) => x.status === 'publicado');
  for (const q of ['a', 'b']) {
    const r = await painel('POST', '/alunos', { email: emails[q], nome: q === 'a' ? 'Ana Turma' : 'Bia Turma', curso_id: c.id, origem: 'bonus' });
    tk[q] = await entrarComHash(decodeURIComponent(r.dados.link.match(/token=([^&]+)/)[1]));
  }
  ok(tk.a && tk.b, 'dois alunos com o curso liberado e login');
  const aula = aulas[0];

  // ------------------------------------------------------------ comentários
  const c1 = await A('POST', `/aulas/${aula.id}/comentarios`, { texto: 'Consegui montar a pasta, ficou ótimo!', minuto_s: 42 });
  ok(c1.status === 200 && !c1.dados.pendente, 'comentário publica na hora');
  const c2 = await A('POST', `/aulas/${aula.id}/comentarios`, { texto: 'Olha meu site www.exemplo.com' });
  ok(c2.status === 200 && c2.dados.pendente, 'comentário com link espera aprovação');
  let lb = await B('GET', `/aulas/${aula.id}/comentarios`);
  ok(lb.dados.itens.some((x) => x.id === c1.dados.id) && !lb.dados.itens.some((x) => x.id === c2.dados.id), 'a turma vê o publicado e não vê o pendente');
  const cur = await B('POST', `/comentarios/${c1.dados.id}/reagir`, { tipo: 'curtida', ligar: true });
  ok(cur.status === 200 && cur.dados.curtidas === 1, 'curtir comentário');
  ok((await A('POST', `/comentarios/${c1.dados.id}/reagir`, { tipo: 'curtida', ligar: true })).status === 400, 'não dá para curtir o próprio comentário');
  const pend = await painel('GET', '/comunidade/comentarios?status=pendente');
  ok(pend.dados.itens.some((x) => x.id === c2.dados.id), 'a equipe vê o comentário pendente');
  ok((await painel('POST', `/comunidade/comentarios/${c2.dados.id}/publicar`)).status === 200, 'a equipe aprova o comentário');
  lb = await B('GET', `/aulas/${aula.id}/comentarios`);
  ok(lb.dados.itens.some((x) => x.id === c2.dados.id), 'aprovado aparece para a turma');
  const resp = await painel('POST', `/comunidade/comentarios/${c1.dados.id}/responder`, { texto: 'Que bom! Veja também [1:30].' });
  ok(resp.status === 200, 'resposta oficial da equipe');
  const la = await A('GET', `/aulas/${aula.id}/comentarios`);
  const meu = la.dados.itens.find((x) => x.id === c1.dados.id);
  ok(meu && meu.respostas.some((r) => r.oficial), 'a resposta oficial aparece embaixo do comentário');

  // ------------------------------------------------------------ notas e "ajudou?"
  const n1 = await A('POST', `/aulas/${aula.id}/anotacoes`, { minuto_s: 75, texto: 'Lembrar da pasta oculta' });
  ok(n1.status === 200 && n1.dados.minuto_s === 75, 'anotar no minuto');
  ok((await A('PATCH', `/anotacoes/${n1.dados.id}`, { texto: 'Pasta oculta: Cmd+Shift+.' })).dados.texto.includes('Cmd'), 'editar a nota');
  ok((await B('PATCH', `/anotacoes/${n1.dados.id}`, { texto: 'invasão' })).status === 404, 'nota de outra pessoa não abre');
  ok((await A('GET', `/cursos/${CURSO}/anotacoes`)).dados.length === 1, 'notas do curso todo');
  ok((await A('POST', `/anotacoes/${n1.dados.id}/apagar`)).status === 200 && (await A('GET', `/aulas/${aula.id}/anotacoes`)).dados.length === 0, 'apagar a nota');
  ok((await A('POST', `/aulas/${aula.id}/avaliar`, { util: false, motivo: 'faltou exemplo' })).status === 200, '"Essa aula te ajudou?"');

  // ------------------------------------------------------------ XP, selos e certificado
  const p1 = await A('POST', `/aulas/${aula.id}/progresso`, { posicao: aula.duracao_s, assistido: aula.duracao_s });
  ok(p1.dados.concluida, 'assistir a aula inteira conclui');
  let jogo = await A('GET', '/jogo');
  ok(jogo.dados.nivel.xp >= 10 && jogo.dados.selos.some((s) => s.id === 'primeira-aula' && s.ganho), 'XP da aula e o selo "Primeira aula"', `${jogo.dados.nivel.xp} XP`);
  const necessarias = Math.ceil((aulas.length * 70) / 100);
  let cert = null;
  for (const x of aulas.slice(1, necessarias)) {
    const r = await A('POST', `/aulas/${x.id}/progresso`, { posicao: 10, assistido: 10, concluir: true });
    if (r.dados.certificado) cert = r.dados.certificado;
  }
  ok(cert && /\/certificado\/[A-Z0-9]{10}$/.test(cert.link), 'certificado sai sozinho com 70%', cert?.link);
  const codigo = cert && cert.link.split('/').pop();
  const pg = await fetch(`${curso}/certificado/${codigo}`);
  const html = await pg.text();
  ok(pg.status === 200 && html.includes('Ana Turma') && html.includes('<svg'), 'página pública do certificado com QR');
  ok((await fetch(`${curso}/certificado/${codigo}?formato=story`)).status === 200, 'versão para o story');
  ok((await fetch(`${curso}/certificado/AAAAAAAAAA`)).status === 404, 'código errado não acha certificado');
  ok((await A('GET', '/certificados')).dados.length === 1, 'certificado no perfil');
  const notifs = await A('GET', '/notificacoes');
  ok(notifs.dados.itens.some((x) => x.tipo === 'certificado') && notifs.dados.itens.some((x) => x.tipo === 'selo') && notifs.dados.itens.some((x) => x.tipo === 'resposta'), 'sino: certificado, selo e resposta da equipe');
  ok((await A('POST', '/notificacoes/lidas')).status === 200 && (await A('GET', '/eu')).dados.nao_lidas === 0, 'marcar o sino como lido');

  // ------------------------------------------------------------ perfil público
  const pe = await A('PATCH', '/eu', { usuario, perfil_publico: true, boas_vindas: true, objetivo: 'automatizar', aulas_semana: 3, cidade: 'Goiânia', links: [{ titulo: 'Portfólio', url: 'https://exemplo.com' }] });
  ok(pe.status === 200 && pe.dados.usuario === usuario && pe.dados.boas_vindas_em, 'perfil: usuário, boas-vindas e links');
  ok((await B('PATCH', '/eu', { usuario })).status === 409, 'usuário repetido é recusado');
  const pp = await fetch(`${curso}/@${usuario}`);
  ok(pp.status === 200 && (await pp.text()).includes('Ana Turma'), 'perfil público abre em /@usuario');
  await A('PATCH', '/eu', { perfil_publico: false });
  ok((await fetch(`${curso}/@${usuario}`)).status === 404, 'perfil fechado some');

  // ------------------------------------------------------------ mural, desafio e moldura
  const e1 = await A('POST', '/entregas', { titulo: 'Meu primeiro carrossel', link: 'https://instagram.com/p/teste', autoriza_repost: true });
  ok(e1.status === 200 && e1.dados.status === 'pendente', 'enviar criação');
  ok((await painel('POST', `/comunidade/entregas/${e1.dados.id}`, { acao: 'aprovar' })).status === 200, 'a equipe aprova a criação');
  const eu = await A('GET', '/eu');
  ok(eu.dados.moldura === true, 'criação aprovada dá a moldura de criador');
  ok((await B('POST', `/entregas/${e1.dados.id}/curtir`, { ligar: true })).dados.curtidas === 1, 'curtir criação no mural');
  ok((await B('GET', '/mural')).dados.itens.some((x) => x.id === e1.dados.id && x.eu_curti), 'mural mostra a criação curtida');
  const d = await painel('POST', '/comunidade/desafios', { titulo: `Desafio de teste ${ts}`, descricao: 'Poste um carrossel', status: 'aberto', premio: 'Selo' });
  criados.desafios.push(d.dados.id);
  ok(d.status === 200 && d.dados.status === 'aberto', 'a equipe abre um desafio');
  ok((await B('GET', '/notificacoes')).dados.itens.some((x) => x.tipo === 'desafio'), 'desafio novo chega no sino da turma');
  const e2 = await B('POST', '/entregas', { titulo: 'Entrega do desafio', link: 'https://instagram.com/p/b', desafio_id: d.dados.id });
  ok(e2.status === 200, 'entregar no desafio');
  ok((await B('POST', '/entregas', { titulo: 'De novo', link: 'https://instagram.com/p/c', desafio_id: d.dados.id })).status === 409, 'uma entrega por desafio');
  ok((await painel('POST', `/comunidade/entregas/${e2.dados.id}`, { acao: 'destaque' })).status === 200, 'a equipe escolhe o destaque');
  jogo = await B('GET', '/jogo');
  ok(jogo.dados.selos.some((s) => s.id === 'criador-destaque' && s.ganho), 'selo "Criador destaque"');

  // ------------------------------------------------------------ depoimento, banner, ranking e dúvida
  const dep = await A('POST', `/cursos/${CURSO}/depoimento`, { nota: 10, texto: 'O curso mudou o meu jeito de postar.', autoriza_uso: true });
  ok(dep.status === 200, 'depoimento depois de 50%');
  ok((await A('GET', `/cursos/${CURSO}`)).dados.depoimento.enviado, 'curso mostra o depoimento enviado');
  ok((await B('POST', `/cursos/${CURSO}/depoimento`, { nota: 9, texto: 'Muito bom mesmo, recomendo.' })).status === 409, 'depoimento antes de 50% é recusado (o presente não sai cedo)');
  const av = await painel('POST', '/comunicacao/avisos', { tipo: 'banner', titulo: `Banner de teste ${ts}`, botao_texto: 'Ver', botao_link: '/turma', publico: { curso_id: c.id, min_pct: 50 } });
  criados.avisos.push(av.dados.id);
  ok(av.status === 200, 'a equipe publica um banner com público');
  const ia = await A('GET', '/inicio');
  const ib = await B('GET', '/inicio');
  ok(ia.dados.avisos.banners.some((x) => x.id === av.dados.id) && !ib.dados.avisos.banners.some((x) => x.id === av.dados.id), 'banner só para quem passou de 50%');
  await A('POST', `/avisos/${av.dados.id}/clique`);
  ok((await painel('GET', '/comunicacao/avisos')).dados.find((x) => x.id === av.dados.id).cliques === 1, 'o painel conta o clique');
  await A('PATCH', '/eu', { no_ranking: true });
  const rk = await B('GET', '/ranking?periodo=semana');
  ok(rk.dados.top.some((t) => t.nome === 'Ana Turma') && !rk.dados.top.some((t) => t.nome === 'Bia Turma'), 'ranking só com quem aceitou');
  const tutor = await A('GET', `/aulas/${aula.id}/tutor`);
  ok(tutor.status === 200 && tutor.dados.ligado === false, 'tutor desligado sem a chave do Claude');
  const duv = await A('POST', `/aulas/${aula.id}/duvida`, { pergunta: 'Onde fica a pasta .claude no Mac?' });
  ok(duv.status === 200, 'dúvida vai para a equipe');
  const fila = await painel('GET', '/comunidade/duvidas?status=enviada');
  ok(fila.dados.some((x) => x.id === duv.dados.conversa_id), 'a equipe vê a dúvida');
  ok((await painel('POST', `/comunidade/duvidas/${duv.dados.conversa_id}/responder`, { texto: 'Cmd+Shift+ponto mostra [1:30].', virar_pronta: true, palavras: ['pasta', 'mac'] })).status === 200, 'a equipe responde e vira resposta pronta');
  ok((await painel('GET', '/comunidade/prontas')).dados.some((x) => x.resposta.includes('Cmd+Shift')), 'resposta pronta guardada');
  ok((await painel('GET', '/comunidade/fila')).status === 200 && (await painel('GET', '/integracoes')).status === 200, 'fila da comunidade e integrações no painel');
} catch (e) {
  falhas++;
  console.log('FALHA', e.stack || e.message);
} finally {
  // ------------------------------------------------------------ limpeza
  try {
    const alunos = await sql(`select id, auth_id from alunos where email in (${[emails.a, emails.b].map(txt).join(',')})`);
    const ids = alunos.map((a) => txt(a.id)).join(',') || "'00000000-0000-0000-0000-000000000000'";
    await sql(`
      delete from tutor_respostas_prontas where resposta like '%Cmd+Shift+ponto%';
      delete from progresso where aluno_id in (${ids});
      delete from matriculas where aluno_id in (${ids});
      delete from emails where para in (${[emails.a, emails.b, emails.equipe].map(txt).join(',')});
      delete from avisos where id in (${criados.avisos.map(txt).join(',') || "'00000000-0000-0000-0000-000000000000'"});
      delete from desafios where id in (${criados.desafios.map(txt).join(',') || "'00000000-0000-0000-0000-000000000000'"});
      delete from comentarios where aluno_id in (${ids}) or pai_id in (select id from comentarios where aluno_id in (${ids}));
      delete from alunos where id in (${ids});
      delete from limites where chave like '%${ts}%';
    `);
    for (const a of alunos) if (a.auth_id) await supa(`/admin/users/${a.auth_id}`, { method: 'DELETE' }).catch(() => {});
  } catch (e) { console.log('limpeza dos alunos falhou:', e.message); }
  if (membroId) await sql(`delete from comentarios where equipe_id = ${txt(membroId)}; delete from auditoria where equipe_id = ${txt(membroId)}; delete from equipe where id = ${txt(membroId)}`).catch((e) => console.log('limpeza da equipe:', e.message));
  if (authEquipe) await supa(`/admin/users/${authEquipe}`, { method: 'DELETE' }).catch(() => {});
  console.log('\nalunos, equipe, comentários, criações, desafio e banner de teste apagados');
}
console.log(falhas ? `\n${falhas} conferência(s) falharam` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
