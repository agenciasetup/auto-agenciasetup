// Disparo dos e-mails de venda (emails.mjs) pela Resend, em Broadcasts, dentro do plano grátis.
// O plano grátis tem duas cotas separadas: transacional (acesso, código, recibo: 100 por dia, 3.000 por mês) e
// marketing (até 1.000 contatos por mês). O disparo usa só a de marketing, e com folga de 30%: lotes de 700 contatos,
// um lote a cada 30 dias. Cada lote recebe os 3 e-mails; no fim, os contatos dele saem da Resend para dar lugar ao próximo
// (quem pediu para sair fica anotado e não recebe mais nada). A ordem é dos mais quentes: quem comprou e entrou por último.
// A Resend cuida do descadastro: o link "Não quero mais receber" tira a pessoa do lote na hora.
// Precisa no .env.local: RESEND_CHAVE_ADMIN (acesso total; a chave de Integrações é só de envio) e as do Supabase.
// Passos (o andamento fica em _local/email-venda/estado.json; cada passo pode rodar de novo):
//   situacao                       mostra os lotes, quem falta e quando sai o próximo
//   imagens                        sobe as duas vitrines para o storage público (midia/email/posts-automaticos/)
//   lote                           monta o próximo lote: segmento com 700 contatos e os 3 e-mails como rascunho
//   atualizar                      mudou o texto em emails.mjs? regrava os rascunhos ainda não enviados do lote atual
//   teste <endereço> [email-1]     manda um e-mail de teste só para esse endereço (usa a cota transacional: 1 e-mail)
//   enviar email-1 --confirmo      dispara o e-mail para o lote atual (tira antes quem já comprou o curso)
//     ... --em 2026-10-31 [09:00]  em vez de mandar agora, agenda na Resend para esse dia (horário de Brasília)
//   encerrar                       depois do email-3: anota quem saiu da lista e tira os contatos do lote da Resend
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { env, exige, raiz, sql } from '../../scripts/env.mjs';
import { montar } from './emails.mjs';

const pasta = join(raiz, '_local', 'email-venda');
const LISTA = join(raiz, 'Leads Exportados', 'lista-unica-alunos-disparo.csv');
const ARQ_ESTADO = join(pasta, 'estado.json');
const DE = 'Filipe da Agência Setup <filipe@envio.agenciasetup.com.br>';
const RESPONDER = 'contato@agenciasetup.com.br';
const CURSO = 'posts-automaticos-com-claude';
const IMG = `${env.SUPABASE_URL}/storage/v1/object/public/midia/email/posts-automaticos/`;
const LOTE = 700; // 70% dos 1.000 contatos por mês do plano grátis
const INTERVALO_DIAS = 30;
const ORDEM = ['email-1', 'email-2', 'email-3'];
const DIAS_ENTRE_EMAILS = 2;

const estado = existsSync(ARQ_ESTADO) ? JSON.parse(readFileSync(ARQ_ESTADO, 'utf8')) : { lotes: [], descadastrados: [] };
const salvar = () => writeFileSync(ARQ_ESTADO, JSON.stringify(estado, null, 2));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const atual = () => estado.lotes.find((l) => !l.encerrado_em);
const dia = (iso) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
// Dias de calendário entre duas datas, no horário de Brasília: o e-mail 1 no dia 29 libera o 2 no dia 31.
const diasEntre = (a, b) => {
  const data = (x) => Date.parse(new Date(x).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }));
  return Math.round((data(b) - data(a)) / 86_400_000);
};
const saiu = (lote, slug) => lote.enviados[slug] ? (Date.parse(lote.enviados[slug]) > Date.now() ? `agendado para ${dia(lote.enviados[slug])}` : `enviado ${dia(lote.enviados[slug])}`) : 'não enviado';

// Até 10 chamadas por segundo na Resend: uma a cada 150 ms, e espera mais quando ela pede (429).
async function resend(metodo, caminho, corpo) {
  exige('RESEND_CHAVE_ADMIN');
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    await esperar(150);
    const r = await fetch(`https://api.resend.com${caminho}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${env.RESEND_CHAVE_ADMIN}`, 'Content-Type': 'application/json' },
      ...(corpo ? { body: JSON.stringify(corpo) } : {}),
    });
    if (r.status === 429) { await esperar(1500 * (tentativa + 1)); continue; }
    const t = await r.text();
    let dados = null;
    try { dados = t ? JSON.parse(t) : null; } catch { dados = { message: t.slice(0, 200) }; }
    return { ok: r.ok, status: r.status, dados };
  }
  return { ok: false, status: 429, dados: { message: 'limite de chamadas da Resend' } };
}

async function compradores() {
  const linhas = await sql(`select lower(a.email) as email from matriculas m join alunos a on a.id = m.aluno_id
    join cursos c on c.id = m.curso_id where c.slug = '${CURSO}' and m.status = 'ativa'`);
  return new Set(linhas.map((l) => l.email));
}

// Uma linha do CSV em campos (campo entre aspas pode ter vírgula, como a coluna de cursos).
function campos(linha) {
  const saida = [];
  let atualCampo = '', aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (aspas && c === '"' && linha[i + 1] === '"') { atualCampo += '"'; i++; }
    else if (c === '"') aspas = !aspas;
    else if (c === ',' && !aspas) { saida.push(atualCampo); atualCampo = ''; }
    else atualCampo += c;
  }
  return [...saida, atualCampo];
}

// A lista na ordem de envio: quem já comprou algo primeiro, depois quem entrou por último.
function lerLista() {
  const data = (t) => { const m = /(\d\d)\/(\d\d)\/(\d{4})/.exec(t || ''); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };
  return readFileSync(LISTA, 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((l) => {
    const c = campos(l);
    return { email: c[0].trim().toLowerCase(), primeiro: (c[2] || '').trim(), comprou: c[6] === 'Sim', ultima: data(c[9]) };
  }).sort((a, b) => (b.comprou - a.comprou) || b.ultima.localeCompare(a.ultima));
}

const emails = () => montar({ img: IMG, nome: '{{{contact.first_name|Calango}}}', sair: '{{{RESEND_UNSUBSCRIBE_URL}}}' });
const [, , passo, ...resto] = process.argv;

if (passo === 'situacao' || !passo) {
  const usados = new Set(estado.lotes.flatMap((l) => l.contatos));
  const faltam = lerLista().filter((p) => !usados.has(p.email) && !estado.descadastrados.includes(p.email)).length;
  for (const l of estado.lotes) {
    console.log(`lote ${l.n}: ${l.contatos.length} contatos, criado em ${dia(l.criado_em)}; ${ORDEM.map((s) => `${s} ${saiu(l, s)}`).join(', ')}${l.encerrado_em ? `; encerrado em ${dia(l.encerrado_em)}` : ''}`);
  }
  const ultimo = estado.lotes.at(-1);
  const proximo = ultimo ? new Date(Date.parse(ultimo.criado_em) + INTERVALO_DIAS * 86_400_000) : new Date();
  console.log(`faltam ${faltam} contatos (cerca de ${Math.ceil(faltam / LOTE)} lotes); descadastrados: ${estado.descadastrados.length}`);
  console.log(atual() ? `lote ${atual().n} em andamento` : `próximo lote liberado a partir de ${proximo.toLocaleDateString('pt-BR')}`);
  if (!passo) console.log('\nPassos: situacao | imagens | lote | atualizar | teste <endereço> [email-N] | enviar <email-N> --confirmo [--em AAAA-MM-DD [HH:MM]] | encerrar');
} else if (passo === 'imagens') {
  exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY');
  const k = env.SUPABASE_SECRET_KEY;
  for (const nome of ['vitrine-leque.jpg', 'vitrine-grade.jpg']) {
    const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/midia/email/posts-automaticos/${nome}`, {
      method: 'POST', headers: { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
      body: readFileSync(join(pasta, nome)),
    });
    if (!r.ok) throw new Error(`upload ${nome} ${r.status}: ${(await r.text()).slice(0, 200)}`);
    console.log(`no ar: ${IMG}${nome}`);
  }
} else if (passo === 'lote') {
  if (atual()) throw new Error(`O lote ${atual().n} ainda está em andamento. Envie os 3 e-mails e rode "encerrar" antes.`);
  const ultimo = estado.lotes.at(-1);
  if (ultimo && Date.now() - Date.parse(ultimo.criado_em) < INTERVALO_DIAS * 86_400_000) {
    throw new Error(`O plano grátis libera 1.000 contatos por mês. O próximo lote sai a partir de ${new Date(Date.parse(ultimo.criado_em) + INTERVALO_DIAS * 86_400_000).toLocaleDateString('pt-BR')}.`);
  }
  const usados = new Set(estado.lotes.flatMap((l) => l.contatos));
  const ja = await compradores();
  const escolhidos = lerLista().filter((p) => !usados.has(p.email) && !ja.has(p.email) && !estado.descadastrados.includes(p.email)).slice(0, LOTE);
  if (!escolhidos.length) throw new Error('Não falta ninguém: a lista inteira já recebeu.');
  const n = estado.lotes.length + 1;
  const s = await resend('POST', '/segments', { name: `Posts automáticos: lote ${n}` });
  if (!s.ok) throw new Error(`segmento: ${s.status} ${JSON.stringify(s.dados)}`);
  const lote = { n, segmento: s.dados.id, contatos: [], criado_em: new Date().toISOString(), rascunhos: {}, enviados: {} };
  estado.lotes.push(lote);
  salvar();
  for (const [i, p] of escolhidos.entries()) {
    let r = await resend('POST', '/contacts', { email: p.email, ...(p.primeiro ? { first_name: p.primeiro } : {}), segments: [{ id: lote.segmento }] });
    // Contato que já existia na Resend (um aluno da área de membros, por exemplo): só entra no segmento.
    if (!r.ok) r = await resend('POST', `/contacts/${encodeURIComponent(p.email)}/segments/${lote.segmento}`);
    if (r.ok) lote.contatos.push(p.email);
    else console.log(`não entrou: ${p.email} (${r.status} ${JSON.stringify(r.dados).slice(0, 120)})`);
    if ((i + 1) % 100 === 0) { salvar(); console.log(`${i + 1} de ${escolhidos.length}`); }
  }
  for (const e of emails()) {
    const r = await resend('POST', '/broadcasts', {
      segment_id: lote.segmento, from: DE, reply_to: RESPONDER, subject: e.assunto, html: e.html, text: e.texto,
      name: `Posts automáticos: ${e.slug} (lote ${n})`,
    });
    if (!r.ok) throw new Error(`${e.slug}: ${r.status} ${JSON.stringify(r.dados)}`);
    lote.rascunhos[e.slug] = r.dados.id;
  }
  salvar();
  console.log(`lote ${n}: ${lote.contatos.length} contatos no segmento e os 3 e-mails como rascunho em resend.com/broadcasts (nada enviado).`);
} else if (passo === 'atualizar') {
  const lote = atual();
  if (!lote) throw new Error('Não há lote em andamento.');
  for (const e of emails()) {
    if (lote.enviados[e.slug]) { console.log(`${e.slug}: já enviado, fica como está`); continue; }
    const r = await resend('PATCH', `/broadcasts/${lote.rascunhos[e.slug]}`, { subject: e.assunto, html: e.html, text: e.texto });
    console.log(r.ok ? `${e.slug}: rascunho atualizado` : `${e.slug}: falhou (${r.status} ${JSON.stringify(r.dados).slice(0, 160)})`);
  }
} else if (passo === 'teste') {
  const [para, slug = 'email-1'] = resto;
  if (!para || !para.includes('@')) throw new Error('Diga o endereço: teste voce@exemplo.com [email-1]');
  const e = emails().find((x) => x.slug === slug);
  if (!e) throw new Error(`Não existe ${slug}. Use ${ORDEM.join(', ')}.`);
  const trocar = (t) => t.replaceAll('{{{contact.first_name|Calango}}}', 'Filipe').replaceAll('{{{RESEND_UNSUBSCRIBE_URL}}}', 'https://agenciasetup.com.br');
  const r = await resend('POST', '/emails', { from: DE, reply_to: RESPONDER, to: [para], subject: `[Teste] ${e.assunto}`, html: trocar(e.html), text: trocar(e.texto) });
  console.log(r.ok ? `teste de ${slug} enviado para ${para}` : `falhou: ${r.status} ${JSON.stringify(r.dados)}`);
} else if (passo === 'enviar') {
  const [slug] = resto;
  const lote = atual();
  if (!lote) throw new Error('Não há lote em andamento. Rode "lote" antes.');
  if (!ORDEM.includes(slug)) throw new Error(`Use ${ORDEM.join(', ')}.`);
  if (lote.enviados[slug]) throw new Error(`O ${slug} do lote ${lote.n} já está ${saiu(lote, slug)}.`);
  // --em AAAA-MM-DD [HH:MM]: agenda na Resend (horário de Brasília, 9h se não disser a hora).
  const iEm = resto.indexOf('--em');
  const hora = /^\d\d:\d\d$/.test(resto[iEm + 2] || '') ? resto[iEm + 2] : '09:00';
  const quando = iEm >= 0 ? new Date(`${resto[iEm + 1]}T${hora}:00-03:00`) : new Date();
  if (Number.isNaN(quando.getTime())) throw new Error('Data inválida. Use --em AAAA-MM-DD [HH:MM].');
  if (iEm >= 0 && quando <= new Date()) throw new Error('Essa data já passou.');
  const anterior = ORDEM[ORDEM.indexOf(slug) - 1];
  if (anterior && !lote.enviados[anterior]) throw new Error(`Envie ou agende o ${anterior} antes.`);
  if (anterior && diasEntre(lote.enviados[anterior], quando) < DIAS_ENTRE_EMAILS) {
    throw new Error(`Deixe ${DIAS_ENTRE_EMAILS} dias depois do ${anterior} (${saiu(lote, anterior)}).`);
  }
  if (!resto.includes('--confirmo')) throw new Error(`Este passo ${iEm >= 0 ? 'agenda' : 'manda'} o ${slug} para ${lote.contatos.length} pessoas do lote ${lote.n}. Rode de novo com --confirmo.`);
  // Quem comprou o curso depois de entrar no lote não recebe mais a oferta.
  for (const email of await compradores()) {
    if (!lote.contatos.includes(email)) continue;
    const r = await resend('DELETE', `/contacts/${encodeURIComponent(email)}/segments/${lote.segmento}`);
    if (r.ok) { lote.contatos = lote.contatos.filter((e) => e !== email); console.log(`saiu do lote (já comprou): ${email}`); }
  }
  salvar();
  const r = await resend('POST', `/broadcasts/${lote.rascunhos[slug]}/send`, iEm >= 0 ? { scheduled_at: quando.toISOString() } : {});
  if (!r.ok) throw new Error(`envio: ${r.status} ${JSON.stringify(r.dados)}`);
  lote.enviados[slug] = quando.toISOString();
  salvar();
  console.log(iEm >= 0
    ? `${slug} agendado na Resend para ${quando.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (lote ${lote.n}, ${lote.contatos.length} contatos). Para cancelar, apague o agendamento em resend.com/broadcasts.`
    : `${slug} disparado para o lote ${lote.n} (${lote.contatos.length} contatos). Acompanhe entregas, aberturas e devoluções em resend.com/broadcasts.`);
} else if (passo === 'encerrar') {
  const lote = atual();
  if (!lote) throw new Error('Não há lote em andamento.');
  const ultimoEmail = lote.enviados[ORDEM.at(-1)];
  if (!ultimoEmail || Date.parse(ultimoEmail) > Date.now()) throw new Error(`O ${ORDEM.at(-1)} do lote ${lote.n} ainda não saiu (${saiu(lote, ORDEM.at(-1))}).`);
  let saiu = 0;
  for (const email of lote.contatos) {
    const c = await resend('GET', `/contacts/${encodeURIComponent(email)}`);
    if (c.ok && c.dados && c.dados.unsubscribed && !estado.descadastrados.includes(email)) { estado.descadastrados.push(email); saiu++; }
    const r = await resend('DELETE', `/contacts/${encodeURIComponent(email)}`);
    if (!r.ok && r.status !== 404) console.log(`não saiu da Resend: ${email} (${r.status})`);
  }
  lote.encerrado_em = new Date().toISOString();
  salvar();
  console.log(`lote ${lote.n} encerrado: ${saiu} pediram para sair (anotados), contatos tirados da Resend. O próximo lote sai a partir de ${new Date(Date.parse(lote.criado_em) + INTERVALO_DIAS * 86_400_000).toLocaleDateString('pt-BR')}.`);
} else {
  console.log('Passos: situacao | imagens | lote | atualizar | teste <endereço> [email-N] | enviar <email-N> --confirmo [--em AAAA-MM-DD [HH:MM]] | encerrar');
}
