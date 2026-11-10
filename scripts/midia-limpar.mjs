// "Postou, apagou": tira do armazenamento (bucket "midia" do Supabase) os originais das peças que já saíram nas redes
// e deixa uma miniatura leve por peça, para o painel continuar mostrando o histórico (Agenda e tela da peça).
//
//   node scripts/midia-limpar.mjs                       SIMULA: mede, lista e grava a simulação. Não muda nada.
//   node scripts/midia-limpar.mjs --medir-miniaturas    simula e gera as miniaturas só no computador, para pesar
//   node scripts/midia-limpar.mjs --apagar --confirmo   faz de verdade (as duas palavras juntas; uma só não vale)
//
//   --dias 2        quantos dias depois de publicar a peça entra (nunca menos de 2)
//   --peca <id>     só essa peça         --limite 20   no máximo tantas peças nesta rodada (as mais antigas primeiro)
//   --largura 320   largura da miniatura --por-slide   uma miniatura por slide (padrão: uma por peça)
//   --json          a simulação em JSON na tela
//
// O que entra: arquivo do bucket "midia" citado SÓ por peças com status "publicado" há pelo menos --dias dias e com
// id na rede (saiu mesmo). Um arquivo citado por qualquer outra coisa fica: peça em rascunho, aprovada, agendada,
// publicando, com erro ou cancelada (cancelada pode voltar a rascunho), recurso, landing page, produto, aula, config,
// foto de aluno, e também o que o código cita. Arquivo que ninguém cita ("sem peça") é só medido, não é apagado aqui.
//
// A ordem, para nada ficar pela metade:
//   1. faz a miniatura (WebP) e sobe em midia/miniaturas/<id da peça>.webp;
//   2. troca na peça os endereços dos originais pela miniatura (slides, midias, opcoes.capa_url) e anota
//      opcoes.midia_limpa; a troca só vale se a peça continua publicada e ninguém mexeu nela;
//   3. lê o banco inteiro de novo e só apaga o arquivo que não aparece em mais nenhuma linha;
//   4. apaga pelo Storage (nunca direto na tabela storage.objects) e grava o registro em _local/midia-limpeza/.
// Apagar arquivo não tem volta. A troca na peça tem: o plano gravado antes guarda os campos como eram.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { env, exige, raiz, sql } from './env.mjs';

exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_ACCESS_TOKEN');
const args = process.argv.slice(2);
const tem = (n) => args.includes(n);
const opc = (n, p) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : p; };
if (tem('--apagar') !== tem('--confirmo')) {
  console.error('Para apagar de verdade use as duas juntas: --apagar --confirmo. Sem elas, o script só simula.');
  process.exit(1);
}
const APAGAR = tem('--apagar') && tem('--confirmo');
const DIAS = Math.max(2, Number(opc('--dias', 2)) || 2);
const SO_PECA = opc('--peca', '');
const LIMITE = Math.max(1, Number(opc('--limite', APAGAR ? 20 : 10000)) || 20);
const LARGURA = Math.min(1080, Math.max(120, Number(opc('--largura', 320)) || 320));
const POR_SLIDE = tem('--por-slide');
const MEDIR = tem('--medir-miniaturas');
const JSON_NA_TELA = tem('--json');

const BUCKET = 'midia';
const PASTA_MINI = 'miniaturas';
const BASE_PUBLICA = `${env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
// Pastas que não são mídia de post: nunca saem por aqui, nem que uma peça publicada cite.
const PASTAS_PROTEGIDAS = [PASTA_MINI, 'curso', 'duvidas-da-fe', 'escritorio', 'alunos', 'entregas', 'email', 'combo-black'];
// Tabelas que citam um endereço só como história, não como uso.
const FORA_DO_USO = ['auditoria'];
const NA_FILA = ['rascunho', 'aprovado', 'agendado', 'publicando', 'erro'];
const PESO_ESTIMADO_MINI = 15 * 1024;
const PASTA_LOCAL = join(raiz, '_local', 'midia-limpeza');
const AGORA = Date.now();
const CARIMBO = new Date(AGORA).toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

const mb = (b) => (Number(b) / 1048576).toFixed(1);
const gb = (b) => (Number(b) / 1073741824).toFixed(2);
const txt = (v) => `'${String(v).replace(/'/g, "''")}'`;
const chaveStorage = { apikey: env.SUPABASE_SECRET_KEY, ...(env.SUPABASE_SECRET_KEY.startsWith('sb_') ? {} : { Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` }) };
const tipoDe = (o) => (String(o.tipo).startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(o.name) ? 'video' : String(o.tipo).startsWith('image/') || /\.(jpe?g|png|webp|gif|avif)$/i.test(o.name) ? 'imagem' : 'outro');

// ---------------------------------------------------------------- endereços
const RE_MIDIA = /\/storage\/v1\/(?:object|render\/image)\/(?:public|sign|authenticated)\/midia\/([^"'`\\\s?)<>#$]+)/g;
const limparCaminho = (c) => { const s = String(c).replace(/[.,;:!]+$/, ''); try { return decodeURIComponent(s); } catch { return s; } };
// O caminho dentro do bucket, se o endereço for do nosso "midia" (outro projeto ou outro site: null).
function caminhoDaUrl(u) {
  const s = String(u || '');
  if (!s.startsWith(env.SUPABASE_URL)) return null;
  const m = s.match(/\/storage\/v1\/(?:object|render\/image)\/(?:public|sign|authenticated)\/midia\/([^?#]+)/);
  return m ? limparCaminho(m[1]) : null;
}
const ehVideoUrl = (u) => /\.(mp4|mov|m4v|webm)(\?|$)/i.test(String(u || ''));

// ---------------------------------------------------------------- leitura (só select)
async function lerObjetos() {
  return sql(`select name, coalesce((metadata->>'size')::bigint, 0) as bytes, coalesce(metadata->>'mimetype', '') as tipo, created_at from storage.objects where bucket_id = '${BUCKET}'`);
}

// Toda linha do banco que cita o bucket, de todas as tabelas (as de hoje e as que vierem), e as peças inteiras.
async function lerBanco() {
  const tabelas = (await sql(`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1`))
    .map((t) => t.table_name).filter((t) => /^[a-z0-9_]+$/.test(t) && !FORA_DO_USO.includes(t) && t !== 'pecas');
  const linhas = [];
  for (let i = 0; i < tabelas.length; i += 20) {
    const q = tabelas.slice(i, i + 20).map((t) => `select '${t}' as t, to_jsonb(x)::text as txt from "${t}" x where x::text like '%/midia/%'`).join(' union all ');
    linhas.push(...await sql(q));
  }
  const pecas = await sql(`select id::text as id, status, rede, formato, perfil, titulo, publicado_em, atualizado_em::text as atualizado_em, id_na_rede, url_publicada, slides, midias, opcoes, to_jsonb(x)::text as txt from pecas x`);
  return { tabelas, linhas, pecas };
}

// O que o código cita com o endereço escrito (capa da VSL nos e-mails, arte do escritório...): arquivo exato ou pasta.
function citadosNoCodigo() {
  const exatos = new Set();
  const prefixos = new Set();
  const EXT = /\.(m?js|tsx?|jsonc?|html?|css|md|py|ps1|sql|txt)$/i;
  const andar = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const c = join(d, e.name);
      if (e.isDirectory()) andar(c);
      else if (EXT.test(e.name) && statSync(c).size < 2_000_000) {
        for (const m of readFileSync(c, 'utf8').matchAll(RE_MIDIA)) { const p = limparCaminho(m[1]); (p.endsWith('/') ? prefixos : exatos).add(p); }
      }
    }
  };
  for (const p of ['worker', 'scripts', 'templates', 'admin/src', 'aluno/src', 'public/estatico', 'docs', '.claude/skills']) if (existsSync(join(raiz, p))) andar(join(raiz, p));
  return { exatos, prefixos };
}

// As mídias de uma peça, nos campos que o painel e as redes leem.
function midiasDaPeca(p) {
  const l = [];
  (Array.isArray(p.slides) ? p.slides : []).forEach((s, i) => {
    if (s && s.imagem_url) l.push({ onde: 'slide', i, campo: 'imagem_url', url: s.imagem_url, tipo: 'imagem' });
    if (s && s.video_url) l.push({ onde: 'slide', i, campo: 'video_url', url: s.video_url, tipo: 'video' });
  });
  (Array.isArray(p.midias) ? p.midias : []).forEach((m, i) => {
    if (m && m.url) l.push({ onde: 'midia', i, campo: 'url', url: m.url, tipo: m.tipo === 'video' || ehVideoUrl(m.url) ? 'video' : 'imagem' });
  });
  if (p.opcoes && p.opcoes.capa_url) l.push({ onde: 'opcoes', i: 0, campo: 'capa_url', url: p.opcoes.capa_url, tipo: 'imagem' });
  return l.map((x) => ({ ...x, caminho: caminhoDaUrl(x.url) })).filter((x) => x.caminho);
}

const publicadaHaTempo = (p) => p.status === 'publicado' && !!p.id_na_rede && !!p.publicado_em && Date.parse(p.publicado_em) <= AGORA - DIAS * 86400_000;
const pastaProtegida = (c) => PASTAS_PROTEGIDAS.includes(c.split('/')[0]);

// ---------------------------------------------------------------- o plano
function montarPlano(objetos, banco, codigo) {
  const porId = new Map(banco.pecas.map((p) => [p.id, p]));
  const estruturados = new Map(banco.pecas.map((p) => [p.id, new Set(midiasDaPeca(p).map((m) => m.caminho))]));
  const todas = [...banco.linhas.map((l) => ({ t: l.t, id: null, txt: l.txt })), ...banco.pecas.map((p) => ({ t: 'pecas', id: p.id, txt: p.txt }))];
  // Quem cita cada caminho.
  const usos = new Map();
  for (const l of todas) {
    for (const m of l.txt.matchAll(RE_MIDIA)) {
      const c = limparCaminho(m[1]);
      if (!usos.has(c)) usos.set(c, []);
      const u = usos.get(c);
      if (!u.some((y) => y.t === l.t && y.id === l.id)) u.push({ t: l.t, id: l.id });
    }
  }
  const noCodigo = (c) => codigo.exatos.has(c) || [...codigo.prefixos].some((p) => c.startsWith(p));
  const elegiveis = banco.pecas.filter(publicadaHaTempo).filter((p) => !SO_PECA || p.id === SO_PECA).sort((a, b) => String(a.publicado_em).localeCompare(String(b.publicado_em)));
  const escolhidas = new Set();
  const inventario = {};
  const somar = (sit, o) => { const k = `${sit}|${tipoDe(o)}`; inventario[k] = inventario[k] || { situacao: sit, tipo: tipoDe(o), arquivos: 0, bytes: 0 }; inventario[k].arquivos++; inventario[k].bytes += Number(o.bytes) || 0; };
  const semPeca = [];
  const candidatos = [];
  for (const o of objetos) {
    const c = o.name;
    const u = usos.get(c) || [];
    const fora = [...new Set(u.filter((y) => y.t !== 'pecas').map((y) => y.t))];
    const ps = u.filter((y) => y.t === 'pecas').map((y) => porId.get(y.id)).filter(Boolean);
    let sit;
    if (c.startsWith(`${PASTA_MINI}/`)) sit = 'miniaturas (o histórico leve)';
    else if (fora.length && ps.length) sit = 'peça e também o site (recurso, landing)';
    else if (fora.length) sit = 'site, cursos, alunos e escritório';
    else if (!ps.length) sit = pastaProtegida(c) || codigo.exatos.has(c) ? 'site, cursos, alunos e escritório' : 'sem peça (ninguém cita)';
    else if (ps.some((p) => NA_FILA.includes(p.status))) sit = 'peça na fila (rascunho, aprovada, agendada, erro)';
    else if (ps.some((p) => p.status === 'cancelado')) sit = 'peça cancelada';
    else if (ps.some((p) => !publicadaHaTempo(p))) sit = `peça publicada há menos de ${DIAS} dias`;
    else if (pastaProtegida(c) || noCodigo(c) || ps.some((p) => !estruturados.get(p.id).has(c))) sit = 'peça publicada, mas protegido';
    else {
      // Conferência dura, por texto puro: o caminho não pode aparecer em nenhuma linha que não seja peça publicada.
      const agulhas = [`/midia/${c}`, `/midia/${encodeURI(c)}`];
      const cita = todas.filter((l) => agulhas.some((a) => l.txt.includes(a)));
      if (cita.some((l) => l.t !== 'pecas' || !publicadaHaTempo(porId.get(l.id)))) sit = 'peça publicada, mas protegido';
      else { sit = 'peça publicada: entra na limpeza'; candidatos.push({ o, pecas: ps.map((p) => p.id) }); }
    }
    somar(sit, o);
    if (sit.startsWith('sem peça')) semPeca.push(o);
  }
  // As peças desta rodada: as mais antigas primeiro, até o limite. O arquivo só sai se TODAS as peças que citam
  // estiverem na rodada (a mesma arte no Instagram e no Facebook, ou em português e em inglês).
  const comArquivo = elegiveis.filter((p) => candidatos.some((k) => k.pecas.includes(p.id)));
  for (const p of comArquivo.slice(0, LIMITE)) escolhidas.add(p.id);
  const saem = candidatos.filter((k) => k.pecas.every((id) => escolhidas.has(id)));
  const esperam = candidatos.filter((k) => !k.pecas.every((id) => escolhidas.has(id)));
  const pecasDoPlano = [...escolhidas].map((id) => porId.get(id)).map((p) => {
    const arquivos = saem.filter((k) => k.pecas.includes(p.id)).map((k) => k.o);
    return { peca: p, arquivos, bytes: arquivos.reduce((s, o) => s + Number(o.bytes), 0) };
  }).filter((x) => x.arquivos.length);
  return { inventario: Object.values(inventario).sort((a, b) => b.bytes - a.bytes), saem: saem.map((k) => ({ ...k.o, pecas: k.pecas })), esperam: esperam.map((k) => k.o), semPeca, pecasDoPlano, elegiveis: elegiveis.length };
}

// ---------------------------------------------------------------- miniatura
let sharp = null;
let ffmpegOk = null;
const temFfmpeg = () => { if (ffmpegOk === null) ffmpegOk = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0; return ffmpegOk; };
async function baixar(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`não baixou (${r.status})`);
  return Buffer.from(await r.arrayBuffer());
}
async function reduzir(buf) {
  if (!sharp) sharp = (await import('sharp')).default;
  return sharp(buf).rotate().resize({ width: LARGURA, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
}
// Um quadro do vídeo, lido direto do endereço (o ffmpeg baixa só o começo). Sem ffmpeg: null.
function quadroDoVideo(url, segundos) {
  if (!temFfmpeg()) return null;
  for (const s of [segundos, 0]) {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(s), '-i', url, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], { maxBuffer: 96 * 1024 * 1024, timeout: 180_000 });
    if (r.status === 0 && r.stdout && r.stdout.length > 1000) return r.stdout;
  }
  return null;
}
async function miniaturaDe(item, peca) {
  if (item.tipo === 'video') {
    const q = quadroDoVideo(item.url, Math.max(0, Number(peca.opcoes && peca.opcoes.capa_ms) / 1000 || 1));
    return q ? reduzir(q) : null;
  }
  return reduzir(await baixar(item.url));
}
// A miniatura da peça: a capa (primeiro slide, a imagem do post ou a capa do Reels); sem imagem, um quadro do vídeo;
// sem ffmpeg, qualquer outra imagem da peça. Devolve null quando não deu (a peça então não é tocada).
async function miniaturaDaPeca(peca) {
  const itens = midiasDaPeca(peca);
  const capa = itens.find((m) => m.onde === 'opcoes') || null;
  const primeiro = itens.find((m) => m.onde !== 'opcoes') || null;
  const ordem = [
    primeiro && primeiro.tipo === 'imagem' ? primeiro : null,
    capa,
    primeiro && primeiro.tipo === 'video' ? primeiro : null,
    ...itens.filter((m) => m.tipo === 'imagem'),
    ...itens.filter((m) => m.tipo === 'video'),
  ].filter(Boolean);
  for (const item of ordem) {
    try { const b = await miniaturaDe(item, peca); if (b && b.length > 200) return { buffer: b, de: item }; } catch { /* tenta a próxima fonte */ }
  }
  return null;
}
async function subirMiniatura(caminho, buffer) {
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${caminho}`, { method: 'POST', body: buffer, headers: { ...chaveStorage, 'content-type': 'image/webp', 'x-upsert': 'true', 'cache-control': '31536000' } });
  if (!r.ok) throw new Error(`o armazenamento recusou a miniatura (${r.status}) ${(await r.text()).slice(0, 120)}`);
  const url = `${BASE_PUBLICA}${caminho}`;
  const v = await fetch(url, { method: 'HEAD' });
  if (!v.ok) throw new Error(`a miniatura subiu mas não abre (${v.status})`);
  return `${url}?v=${AGORA.toString(36)}`;
}

// A peça depois da limpeza: os endereços que saem dão lugar à miniatura (ou somem), o resto fica igual.
// minis: caminho do original -> endereço da miniatura dele (só no --por-slide). capa: a miniatura da peça.
function pecaLimpa(peca, saem, capa, minis, resumo) {
  const sai = (u) => { const c = caminhoDaUrl(u); return !!c && saem.has(c); };
  const slidesAntes = Array.isArray(peca.slides) ? peca.slides : [];
  let mudouSlides = false;
  const slides = slidesAntes.map((s) => {
    if (!s || typeof s !== 'object') return s;
    const n = { ...s };
    if (n.video_url && sai(n.video_url)) { const m = minis.get(caminhoDaUrl(n.video_url)); delete n.video_url; if (m && !n.imagem_url) n.imagem_url = m; mudouSlides = true; }
    if (n.imagem_url && sai(n.imagem_url)) { const m = minis.get(caminhoDaUrl(n.imagem_url)); if (m) n.imagem_url = m; else delete n.imagem_url; mudouSlides = true; }
    return n;
  });
  if (mudouSlides && slides.length && slides[0] && typeof slides[0] === 'object' && !slides[0].imagem_url) slides[0].imagem_url = capa;
  const midiasAntes = Array.isArray(peca.midias) ? peca.midias : [];
  const midias = [];
  let mudouMidias = false;
  for (const m of midiasAntes) {
    if (!m || !sai(m.url)) { midias.push(m); continue; }
    mudouMidias = true;
    const mini = minis.get(caminhoDaUrl(m.url));
    if (mini) midias.push({ url: mini, tipo: 'imagem', miniatura: true, ...(m.alt ? { alt: m.alt } : {}) });
  }
  const temImagem = midias.some((m) => m && m.url && m.tipo !== 'video') || slides.some((s) => s && s.imagem_url);
  if (mudouMidias && !temImagem) midias.unshift({ url: capa, tipo: 'imagem', miniatura: true });
  const opcoes = { ...(peca.opcoes && typeof peca.opcoes === 'object' ? peca.opcoes : {}) };
  if (opcoes.capa_url && sai(opcoes.capa_url)) delete opcoes.capa_url;
  opcoes.midia_limpa = { em: new Date().toISOString(), miniatura: capa, ...resumo };
  return { slides, midias, opcoes };
}

// ---------------------------------------------------------------- apagar (só com --apagar --confirmo)
async function apagarDoBucket(caminhos) {
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: { ...chaveStorage, 'content-type': 'application/json' }, body: JSON.stringify({ prefixes: caminhos }) });
  if (!r.ok) throw new Error(`o armazenamento recusou apagar (${r.status}) ${(await r.text()).slice(0, 160)}`);
  const j = await r.json().catch(() => []);
  return new Set((Array.isArray(j) ? j : []).map((o) => o && o.name).filter(Boolean));
}

async function executar(plano) {
  mkdirSync(PASTA_LOCAL, { recursive: true });
  const arqPlano = join(PASTA_LOCAL, `plano-${CARIMBO}.json`);
  const arqRegistro = join(PASTA_LOCAL, `apagados-${CARIMBO}.jsonl`);
  // Antes de tudo: os campos de cada peça como eram, para dar para desfazer a troca (o arquivo apagado não volta).
  writeFileSync(arqPlano, JSON.stringify({ quando: new Date(AGORA).toISOString(), dias: DIAS, pecas: plano.pecasDoPlano.map((x) => ({ id: x.peca.id, titulo: x.peca.titulo, rede: x.peca.rede, formato: x.peca.formato, publicado_em: x.peca.publicado_em, url_publicada: x.peca.url_publicada, slides: x.peca.slides, midias: x.peca.midias, opcoes: x.peca.opcoes, arquivos: x.arquivos.map((o) => ({ caminho: o.name, bytes: Number(o.bytes) })) })) }, null, 1));
  console.log(`Plano gravado em ${arqPlano}`);
  const trocadas = [];
  for (const x of plano.pecasDoPlano) {
    const p = x.peca;
    try {
      const mini = await miniaturaDaPeca(p);
      if (!mini) { console.log(`- ${p.id} (${p.formato}): sem miniatura possível, não toquei.`); continue; }
      const capa = await subirMiniatura(`${PASTA_MINI}/${p.id}.webp`, mini.buffer);
      const saem = new Set(x.arquivos.map((o) => o.name));
      const minis = new Map();
      if (POR_SLIDE) {
        let n = 0;
        for (const item of midiasDaPeca(p).filter((m) => m.onde !== 'opcoes' && saem.has(m.caminho))) {
          n++;
          if (minis.has(item.caminho)) continue;
          const b = await miniaturaDe(item, p).catch(() => null);
          if (b) minis.set(item.caminho, await subirMiniatura(`${PASTA_MINI}/${p.id}-${String(n).padStart(2, '0')}.webp`, b));
        }
      }
      const nova = pecaLimpa(p, saem, capa, minis, { arquivos: x.arquivos.length, bytes: x.bytes });
      // A troca só vale se a peça continua publicada há tempo e ninguém mexeu nela desde a leitura.
      const r = await sql(`update pecas set slides = ${txt(JSON.stringify(nova.slides))}::jsonb, midias = ${txt(JSON.stringify(nova.midias))}::jsonb, opcoes = ${txt(JSON.stringify(nova.opcoes))}::jsonb
        where id = ${txt(p.id)} and status = 'publicado' and id_na_rede is not null and publicado_em <= now() - interval '${DIAS} days' and atualizado_em = ${txt(p.atualizado_em)}::timestamptz returning id`);
      if (!r || !r.length) { console.log(`- ${p.id}: a peça mudou desde a leitura, não toquei.`); continue; }
      trocadas.push({ ...x, capa });
      console.log(`- ${p.id} (${p.formato}): miniatura de ${(mini.buffer.length / 1024).toFixed(0)} KB no lugar de ${x.arquivos.length} arquivo(s), ${mb(x.bytes)} MB`);
    } catch (e) {
      console.log(`- ${p.id}: parei nesta peça (${e.message}). Nada dela foi apagado.`);
    }
  }
  if (!trocadas.length) { console.log('Nenhuma peça trocada: nada a apagar.'); return; }
  // Lê o banco de novo, inteiro: só sai o arquivo que não aparece em mais nenhuma linha, de nenhuma tabela.
  const depois = await lerBanco();
  const todas = [...depois.linhas, ...depois.pecas].map((l) => l.txt);
  const fila = [];
  for (const x of trocadas) {
    for (const o of x.arquivos) {
      if (fila.some((f) => f.caminho === o.name)) continue;
      const agulhas = [`/midia/${o.name}`, `/midia/${encodeURI(o.name)}`];
      if (todas.some((t) => agulhas.some((a) => t.includes(a)))) { console.log(`  fica (ainda citado no banco): ${o.name}`); continue; }
      fila.push({ caminho: o.name, bytes: Number(o.bytes), tipo: tipoDe(o), peca_id: x.peca.id, peca: x.peca.titulo || null, rede: x.peca.rede, formato: x.peca.formato, publicado_em: x.peca.publicado_em, url_publicada: x.peca.url_publicada || null, miniatura: x.capa });
    }
  }
  let apagados = 0;
  let bytes = 0;
  for (let i = 0; i < fila.length; i += 50) {
    const lote = fila.slice(i, i + 50);
    let feitos = new Set();
    let erro = null;
    try { feitos = await apagarDoBucket(lote.map((f) => f.caminho)); } catch (e) { erro = e.message; }
    for (const f of lote) {
      const ok = feitos.has(f.caminho);
      if (ok) { apagados++; bytes += f.bytes; }
      appendFileSync(arqRegistro, `${JSON.stringify({ quando: new Date().toISOString(), ...f, resultado: ok ? 'apagado' : `não apagou${erro ? `: ${erro}` : ''}` })}\n`);
    }
  }
  // A auditoria do painel, uma linha por peça.
  for (const x of trocadas) {
    const dela = fila.filter((f) => f.peca_id === x.peca.id);
    await sql(`insert into auditoria (quem, acao, alvo, detalhes) values ('scripts/midia-limpar', 'midia.limpar', ${txt(`pecas:${x.peca.id}`)}, ${txt(JSON.stringify({ arquivos: dela.length, bytes: dela.reduce((s, f) => s + f.bytes, 0), miniatura: x.capa }))}::jsonb)`).catch((e) => console.log(`  auditoria falhou em ${x.peca.id}: ${e.message.slice(0, 100)}`));
  }
  console.log(`\nApagados ${apagados} de ${fila.length} arquivos, ${mb(bytes)} MB, de ${trocadas.length} peça(s).`);
  console.log(`Registro: ${arqRegistro}`);
}

// ---------------------------------------------------------------- rodar
const [objetos, banco] = await Promise.all([lerObjetos(), lerBanco()]);
const plano = montarPlano(objetos, banco, citadosNoCodigo());
const total = objetos.reduce((s, o) => s + Number(o.bytes), 0);
const somaDe = (l) => l.reduce((s, o) => s + Number(o.bytes), 0);
const porTipo = (l) => ['imagem', 'video', 'outro'].map((t) => ({ tipo: t, arquivos: l.filter((o) => tipoDe(o) === t).length, bytes: somaDe(l.filter((o) => tipoDe(o) === t)) })).filter((x) => x.arquivos);

// As miniaturas: medidas de verdade (geradas só no computador) ou pela estimativa.
let miniaturas = { pecas: plano.pecasDoPlano.length, bytes: plano.pecasDoPlano.length * PESO_ESTIMADO_MINI, medido: false, sem: [] };
if (MEDIR && !APAGAR) {
  const pasta = join(PASTA_LOCAL, 'miniaturas-previa');
  mkdirSync(pasta, { recursive: true });
  let bytes = 0;
  const sem = [];
  for (const x of plano.pecasDoPlano) {
    const m = await miniaturaDaPeca(x.peca);
    if (!m) { sem.push(x.peca.id); continue; }
    writeFileSync(join(pasta, `${x.peca.id}.webp`), m.buffer);
    bytes += m.buffer.length;
    if (POR_SLIDE) for (const item of midiasDaPeca(x.peca).filter((i) => i.onde !== 'opcoes').slice(1)) { const b = await miniaturaDe(item, x.peca).catch(() => null); if (b) bytes += b.length; }
  }
  miniaturas = { pecas: plano.pecasDoPlano.length - sem.length, bytes, medido: true, sem, pasta };
}

const resumo = {
  quando: new Date(AGORA).toISOString(), modo: APAGAR ? 'apagar' : 'simulacao', dias: DIAS, bucket: BUCKET,
  total: { arquivos: objetos.length, bytes: total },
  inventario: plano.inventario,
  sairia: { arquivos: plano.saem.length, bytes: somaDe(plano.saem), por_tipo: porTipo(plano.saem), pecas: plano.pecasDoPlano.length },
  espera_outra_rodada: { arquivos: plano.esperam.length, bytes: somaDe(plano.esperam) },
  sem_peca: { arquivos: plano.semPeca.length, bytes: somaDe(plano.semPeca), por_tipo: porTipo(plano.semPeca) },
  miniaturas,
  ficaria: { bytes: total - somaDe(plano.saem) + miniaturas.bytes },
  exemplos: [...plano.saem].sort((a, b) => Number(b.bytes) - Number(a.bytes)).slice(0, 5).map((o) => ({ caminho: o.name, bytes: Number(o.bytes) })),
};

if (JSON_NA_TELA) console.log(JSON.stringify(resumo, null, 1));
else {
  console.log(`Bucket ${BUCKET}: ${objetos.length} arquivos, ${mb(total)} MB (${gb(total)} GB). Peças publicadas há ${DIAS} dias ou mais: ${plano.elegiveis}.`);
  console.log('\nO que tem lá, pela situação de quem usa (MB):');
  const sits = [...new Set(plano.inventario.map((i) => i.situacao))];
  for (const s of sits) {
    const de = (t) => plano.inventario.find((i) => i.situacao === s && i.tipo === t) || { arquivos: 0, bytes: 0 };
    const tudo = plano.inventario.filter((i) => i.situacao === s);
    console.log(`  ${s}: imagem ${mb(de('imagem').bytes)} (${de('imagem').arquivos}) | vídeo ${mb(de('video').bytes)} (${de('video').arquivos}) | soma ${mb(tudo.reduce((x, i) => x + i.bytes, 0))}`);
  }
  console.log(`\n${APAGAR ? 'Vai sair' : 'Sairia'} agora: ${resumo.sairia.arquivos} arquivos, ${mb(resumo.sairia.bytes)} MB, de ${resumo.sairia.pecas} peça(s).`);
  for (const t of resumo.sairia.por_tipo) console.log(`  ${t.tipo}: ${t.arquivos} arquivos, ${mb(t.bytes)} MB`);
  if (resumo.espera_outra_rodada.arquivos) console.log(`  Ficam para outra rodada (peça fora do --limite ou do --peca): ${resumo.espera_outra_rodada.arquivos} arquivos, ${mb(resumo.espera_outra_rodada.bytes)} MB`);
  console.log('  Exemplos:');
  for (const e of resumo.exemplos) console.log(`    ${e.caminho} (${mb(e.bytes)} MB)`);
  console.log(`\nMiniaturas (${LARGURA} px, WebP${POR_SLIDE ? ', uma por slide' : ', uma por peça'}): ${miniaturas.pecas} peça(s), ${(miniaturas.bytes / 1024).toFixed(0)} KB ${miniaturas.medido ? 'medidos' : 'estimados (rode com --medir-miniaturas para pesar de verdade)'}.`);
  if (miniaturas.sem.length) console.log(`  Sem miniatura possível (essas peças não seriam tocadas): ${miniaturas.sem.join(', ')}`);
  console.log(`Ficaria no bucket: ${mb(resumo.ficaria.bytes)} MB (${gb(resumo.ficaria.bytes)} GB).`);
  console.log(`\nSem peça (ninguém cita; só medido, este script não apaga): ${resumo.sem_peca.arquivos} arquivos, ${mb(resumo.sem_peca.bytes)} MB.`);
  for (const t of resumo.sem_peca.por_tipo) console.log(`  ${t.tipo}: ${t.arquivos} arquivos, ${mb(t.bytes)} MB`);
}

if (APAGAR) await executar(plano);
else {
  mkdirSync(PASTA_LOCAL, { recursive: true });
  const arq = join(PASTA_LOCAL, `simulacao-${CARIMBO}.json`);
  writeFileSync(arq, JSON.stringify({
    ...resumo,
    pecas: plano.pecasDoPlano.map((x) => ({ id: x.peca.id, titulo: x.peca.titulo, rede: x.peca.rede, formato: x.peca.formato, perfil: x.peca.perfil, publicado_em: x.peca.publicado_em, arquivos: x.arquivos.length, bytes: x.bytes })),
    arquivos: plano.saem.map((o) => ({ caminho: o.name, bytes: Number(o.bytes), tipo: tipoDe(o), pecas: o.pecas })),
    sem_peca_arquivos: plano.semPeca.map((o) => ({ caminho: o.name, bytes: Number(o.bytes), tipo: tipoDe(o), criado_em: o.created_at })),
  }, null, 1));
  if (!JSON_NA_TELA) console.log(`\nSimulação: nada foi apagado nem mudado. Lista completa em ${arq}`);
}
