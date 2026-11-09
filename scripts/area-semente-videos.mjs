// Monta (ou atualiza) o mini curso complemento "Vídeos com Claude" (tom roxo, R$ 29,90) na área de membros.
// Versão 4 (o padrão desde 28/10/2026): 12 aulas em 5 módulos, lidas de Curso-Videos/aulas4/, videos4/ e do estúdio
// pelo scripts/videos-v4.mjs. As 7 aulas antigas (aulas/ e videos/) não são mais lidas.
// Pode rodar de novo: acha cada coisa pelo seu código (curso pelo slug, módulo pelo número, aula pelo código, arquivo pelo
// nome) e muda no lugar só o que está diferente, sem duplicar e sem apagar progresso de ninguém. As aulas 1 a 7 seguem as
// mesmas linhas; aula do curso que não está entre as 12 vai para arquivado, nunca é apagada.
// De cada aula vão título, módulo, ordem, a duração do MP4, as legendas (as falas com os segundos), os marcadores (o começo
// de cada uma das 6 partes do roteiro), o resumo e o "Faça agora", como no area-semente.mjs do curso de posts. Status,
// grátis, capa, prévia e o vídeo no Bunny ficam como estão (o vídeo é do scripts/bunny.mjs). Aula nova nasce publicada.
// O que nasce desligado fica como o dono deixar: o curso nasce em rascunho e o produto e a oferta nascem desligados; se já
// existem, este script não publica, não liga, não desliga e não muda preço nem texto de venda. A etiqueta das aulas de
// posts (checkout.etiqueta) e o bump no checkout de posts (checkout.bump_em) moram na oferta e só aparecem com ela ligada.
// Uso: node scripts/area-semente-videos.mjs --simular  só lê (GET) e mostra o plano: o que cria, o que muda (antes e
//                                                      depois) e o que arquiva. Nada é gravado no banco nem no storage
//      node scripts/area-semente-videos.mjs            curso, módulos, aulas, kit, produto, oferta e o bump
//      node scripts/area-semente-videos.mjs --sem-kit  não sobe o kit de novo
//      node scripts/area-semente-videos.mjs --vsl <id> grava o id da mini VSL (Bunny) na etiqueta das aulas; o resto da oferta não muda
// A ordem do dia da troca (Bunny antes e depois da semente) está em Curso-Videos/TROCA-V4.md.
import { existsSync, readFileSync } from 'node:fs';
import { env, exige } from './env.mjs';
import { KIT_ZIP, lerCurso } from './videos-v4.mjs';

exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY');
const SIMULAR = process.argv.includes('--simular');
const SEM_KIT = process.argv.includes('--sem-kit');
const SLUG = 'videos-com-claude';
const COR = '#8b5cf6';
const KIT = 'Video-com-Claude-Kit.zip';
const k = env.SUPABASE_SECRET_KEY;
const H = { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': 'application/json' };

// Com --simular, só GET passa: qualquer outra chamada para aqui com erro, antes de sair do computador. A trava fica no
// fetch (vale para o banco, o storage e qualquer outro endereço) e de novo no rest() e no subir().
let leituras = 0;
if (SIMULAR) {
  const fetchDeVerdade = globalThis.fetch;
  globalThis.fetch = (url, opcoes = {}) => {
    const metodo = String(opcoes.method || 'GET').toUpperCase();
    if (metodo !== 'GET') throw new Error(`--simular: ${metodo} ${String(url).split('?')[0]} barrado`);
    leituras++;
    return fetchDeVerdade(url, opcoes);
  };
}
async function rest(caminho, opcoes = {}) {
  const metodo = String(opcoes.method || 'GET').toUpperCase();
  if (SIMULAR && metodo !== 'GET') throw new Error(`--simular: ${metodo} ${caminho} barrado`);
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1${caminho}`, { ...opcoes, method: metodo, headers: { ...H, Prefer: 'return=representation', ...(opcoes.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${caminho} ${r.status}: ${t.slice(0, 400)}`);
  return t ? JSON.parse(t) : null;
}
const um = async (tabela, filtro) => (await rest(`/${tabela}?${filtro}&limit=1`))[0] || null;
const criar = async (tabela, dados) => (await rest(`/${tabela}`, { method: 'POST', body: JSON.stringify(dados) }))[0];
const mudar = async (tabela, id, dados) => (await rest(`/${tabela}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(dados) }))[0];
async function subir(bucket, caminho, corpo, tipo) {
  if (SIMULAR) throw new Error(`--simular: envio de ${bucket}/${caminho} barrado`);
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${bucket}/${caminho.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST', headers: { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': tipo, 'x-upsert': 'true' }, body: corpo,
  });
  if (!r.ok) throw new Error(`upload ${bucket}/${caminho} ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

// ---------------------------------------------------------------- só a VSL
const iVsl = process.argv.indexOf('--vsl');
if (iVsl > 0) {
  const id = String(process.argv[iVsl + 1] || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) { console.log('Passe o id do vídeo no Bunny (36 letras e números, com hífens).'); process.exit(1); }
  const o = await um('ofertas', `slug=eq.${SLUG}`);
  if (!o) { console.log('A oferta ainda não existe: rode o script sem --vsl primeiro.'); process.exit(1); }
  const c = o.checkout || {};
  if (SIMULAR) { console.log(`Simulação: a VSL da etiqueta passaria de ${(c.etiqueta || {}).vsl_bunny || 'nenhuma'} para ${id}. Nada foi gravado.`); process.exit(0); }
  await mudar('ofertas', o.id, { checkout: { ...c, etiqueta: { ...(c.etiqueta || {}), vsl_bunny: id } } });
  console.log(`VSL gravada na etiqueta. A oferta segue ${o.ativa ? 'ligada' : 'desligada'}.`);
  process.exit(0);
}

// ---------------------------------------------------------------- o que deve estar no ar
const { aulas, modulos: MODULOS } = lerCurso();
const semVideo = aulas.filter((a) => !a.duracao_s).map((a) => a.n);
if (semVideo.length && !SIMULAR) { console.log(`Falta o MP4 em Curso-Videos/videos4/ das aulas ${semVideo.join(', ')}. Nada foi gravado.`); process.exit(1); }

const DADOS_CURSO = {
  titulo: 'Vídeos com Claude', subtitulo: 'Do vídeo gravado ao Reels pronto, editado pelo Claude.',
  descricao: 'Edite com o Claude o vídeo que você gravou no celular: cortar pausa e erro, deixar em pé seguindo o rosto, zoom, cor, fundo, legenda, música e vários Reels de um vídeo longo. Faça vídeo em código, o motion, e ponha print ou motion por cima da sua fala.\n\nO Claude olha o vídeo pela folha de quadros e pela fala em texto, sem assistir, e isso economiza tokens. Ele também estuda tutoriais do YouTube e Reels do Instagram pelo Claude in Chrome, só lendo, para você copiar o ritmo de quem já prende. O kit traz as receitas, as ferramentas e os pedidos prontos de cada aula.',
  cor: COR, certificado_pct: 70, tags: ['claude', 'video', 'reels', 'youtube'],
};
const DADOS_KIT = {
  nome: KIT, tipo: 'pacote',
  o_que: 'O kit inteiro numa pasta só: as receitas 01 a 11, a skill video-com-claude, as ferramentas de edição, o motor de motion com os modelos de Reels, os pedidos prontos de cada aula e os erros e soluções.',
  quando: 'Na aula 1. Baixe, descompacte e guarde a pasta em Documentos.',
  como: ['Baixe o arquivo.', 'Descompacte (clique duas vezes no Mac; no Windows, botão direito e Extrair tudo).', 'Mova a pasta Video-com-Claude para Documentos e abra ela no Claude (aba Code).'],
  tempo: '2 min', previa: null, origem: 'storage', caminho: `${SLUG}/${KIT}`, ordem: 0,
};
const AULA_DO_KIT = '1';

// ---------------------------------------------------------------- comparar (só leitura)
// O jsonb volta do banco com as chaves em outra ordem: compara pelo conteúdo.
const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((c) => [c, canon(v[c])])) : v ?? null);
const igual = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const diferente = (atual, desejado) => Object.fromEntries(Object.entries(desejado).filter(([c, v]) => !atual || !igual(atual[c], v)));
const mmss = (s) => (s == null ? 'sem duração' : `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`);
const corta = (t, n = 110) => { const s = String(t ?? 'vazio').replace(/\n+/g, ' / '); return s.length > n ? `${s.slice(0, n)}...` : s; };
function contar(campo, v) {
  if (campo === 'duracao_s') return mmss(v);
  if (campo === 'falas') return `${(v || []).length} legendas`;
  if (campo === 'marcadores') return (v || []).length ? (v || []).map((m) => `${mmss(m.s)} ${m.titulo}`).join(' | ') : 'nenhum';
  if (campo === 'faca_agora') return `${(v || []).length} passos`;
  return corta(Array.isArray(v) ? v.join(', ') : v);
}

const curso = await um('cursos', `slug=eq.${SLUG}`);
const modulosNoAr = curso ? await rest(`/modulos?curso_id=eq.${curso.id}&select=id,numero,titulo,ordem&order=numero`) : [];
const aulasNoAr = curso ? await rest(`/aulas?curso_id=eq.${curso.id}&select=id,codigo,titulo,modulo_id,ordem,status,duracao_s,video_bunny,falas,marcadores,resumo,faca_agora&order=ordem`) : [];
const kitNoAr = curso ? await um('arquivos', `curso_id=eq.${curso.id}&nome=eq.${encodeURIComponent(KIT)}`) : null;
const numeroDoModulo = (id) => (modulosNoAr.find((m) => m.id === id) || {}).numero;

const plano = { curso: diferente(curso, DADOS_CURSO), modulos: [], aulas: [], arquivar: [] };
for (const m of MODULOS) {
  const atual = modulosNoAr.find((x) => x.numero === m.numero);
  plano.modulos.push({ m, atual, muda: diferente(atual, { titulo: m.titulo, ordem: m.numero }) });
}
for (const a of aulas) {
  const atual = aulasNoAr.find((x) => x.codigo === a.codigo);
  const desejado = { titulo: a.titulo, ordem: a.n, ...(a.duracao_s ? { duracao_s: a.duracao_s } : {}), ...a.area };
  const muda = diferente(atual, desejado);
  const moduloMuda = !atual || numeroDoModulo(atual.modulo_id) !== a.modulo.numero;
  plano.aulas.push({ a, atual, muda, moduloMuda });
}
for (const x of aulasNoAr) if (!aulas.some((a) => a.codigo === x.codigo) && x.status !== 'arquivado') plano.arquivar.push(x);
const kitBytes = existsSync(KIT_ZIP) ? readFileSync(KIT_ZIP).length : null;
const kitDesejado = { ...DADOS_KIT, ...(kitBytes ? { bytes: kitBytes } : {}) };
const kitMuda = diferente(kitNoAr, { ...DADOS_KIT, ...(SEM_KIT ? {} : { bytes: kitBytes }) });
const kitAulaMuda = !kitNoAr || (aulasNoAr.find((x) => x.id === kitNoAr.aula_id) || {}).codigo !== AULA_DO_KIT;

const produto = await um('produtos', `slug=eq.${SLUG}`);
const acesso = produto && curso ? await um('produto_acessos', `produto_id=eq.${produto.id}&curso_id=eq.${curso.id}`) : null;
const ofertaNoAr = await um('ofertas', `slug=eq.${SLUG}`);

// ---------------------------------------------------------------- o plano
const linhas = [];
const L = (t = '') => linhas.push(t);
L(SIMULAR ? 'SIMULAÇÃO: só leitura. Nada foi gravado no banco nem no storage.' : 'O que vai ser feito agora:');
L();
L(`Curso ${SLUG}: ${curso ? `existe (${curso.status}); o status fica` : 'não existe; nasce em rascunho'}`);
for (const [c, v] of Object.entries(plano.curso)) L(`  muda ${c}\n    antes:  ${corta(curso && curso[c], 2000)}\n    depois: ${corta(v, 2000)}`);
if (curso && !Object.keys(plano.curso).length) L('  nada muda');
L();
L(`Módulos (${MODULOS.length}):`);
const quais = (l) => `${l.length > 1 ? 'aulas' : 'aula'} ${l.join(', ')}`;
for (const { m, atual, muda } of plano.modulos) {
  if (!atual) L(`  cria   ${m.numero}. ${m.titulo} (${quais(m.aulas)})`);
  else if (Object.keys(muda).length) L(`  muda   ${m.numero}. "${atual.titulo}" -> "${m.titulo}" (${quais(m.aulas)})`);
  else L(`  igual  ${m.numero}. ${m.titulo}`);
}
for (const x of modulosNoAr) if (!MODULOS.some((m) => m.numero === x.numero)) L(`  sobra  ${x.numero}. ${x.titulo} (fica como está, sem aula; módulo não tem arquivado)`);
L();
L(`Aulas (${aulas.length}):`);
for (const { a, atual, muda, moduloMuda } of plano.aulas) {
  const video = atual ? (atual.video_bunny ? `Bunny ${atual.video_bunny} (o antigo, até o bunny.mjs trocar)` : 'sem vídeo no Bunny') : 'sem vídeo no Bunny até o bunny.mjs subir';
  if (!atual) {
    L(`  cria   ${a.codigo}. ${a.titulo} (módulo ${a.modulo.numero}, publicada, ${mmss(a.duracao_s)}, ${a.area.falas.length} legendas, ${a.area.marcadores.length} marcadores, resumo, ${a.area.faca_agora.length} passos)${a.mp4 ? '' : ' FALTA O MP4'}`);
    continue;
  }
  const campos = Object.keys(muda);
  if (!campos.length && !moduloMuda) { L(`  igual  ${a.codigo}. ${a.titulo}`); continue; }
  L(`  muda   ${a.codigo}. ${atual.titulo === a.titulo ? a.titulo : `"${atual.titulo}" -> "${a.titulo}"`} (${atual.status}; ${video})`);
  if (moduloMuda) L(`         módulo: ${numeroDoModulo(atual.modulo_id) ?? '?'} -> ${a.modulo.numero}`);
  for (const c of campos.filter((x) => x !== 'titulo')) L(`         ${c}: ${contar(c, atual[c])} -> ${contar(c, muda[c])}`);
  if (atual.status !== 'publicado') L(`         atenção: está "${atual.status}" e continua assim`);
}
for (const x of plano.arquivar) L(`  arquiva ${x.codigo}. ${x.titulo} (${x.status} -> arquivado; a linha e o progresso ficam)`);
if (!plano.arquivar.length) L('  arquivadas: nenhuma (as 12 cobrem todas as aulas do curso)');
const arquivadas = aulasNoAr.filter((x) => x.status === 'arquivado');
if (arquivadas.length) L(`  já arquivadas antes: ${arquivadas.map((x) => x.codigo).join(', ')}`);
L();
L(`Kit ${KIT}: ${SEM_KIT ? 'não sobe (--sem-kit)' : `sobe para curso/${DADOS_KIT.caminho} (${kitBytes ? `${Math.round(kitBytes / 1024)} KB` : 'FALTA O ZIP'}; no ar: ${kitNoAr ? `${Math.round((kitNoAr.bytes || 0) / 1024)} KB, de ${kitNoAr.versao}` : 'nenhum'})`}`);
if (kitAulaMuda) L(`  muda aula: ${kitNoAr ? (aulasNoAr.find((x) => x.id === kitNoAr.aula_id) || {}).codigo ?? 'nenhuma' : 'nenhuma'} -> ${AULA_DO_KIT}`);
for (const c of Object.keys(kitMuda).filter((x) => x !== 'bytes')) L(`  muda ${c}\n    antes:  ${corta(kitNoAr && kitNoAr[c], 300)}\n    depois: ${corta(kitMuda[c], 300)}`);
if (!SEM_KIT) L(`  versao: ${kitNoAr ? kitNoAr.versao : 'nenhuma'} -> a data do dia em que rodar`);
L();
L(`Produto ${SLUG}: ${produto ? `fica como está (${produto.ativo ? 'ligado' : 'desligado'}, R$ ${(produto.preco_centavos / 100).toFixed(2).replace('.', ',')})` : 'não existe; nasce desligado'}`);
L(`Acesso produto -> curso: ${acesso ? `existe (${acesso.dias ?? 'sem prazo'} dias)` : 'não existe; é criado (365 dias)'}`);
L(`Oferta ${SLUG}: ${ofertaNoAr ? `fica como está (${ofertaNoAr.ativa ? 'ligada' : 'desligada'}, R$ ${(ofertaNoAr.preco_centavos / 100).toFixed(2).replace('.', ',')})${!(ofertaNoAr.checkout || {}).etiqueta || !(ofertaNoAr.checkout || {}).bump_em ? '; só completa a etiqueta ou o bump que faltar' : ''}` : 'não existe; nasce desligada'}`);
console.log(linhas.join('\n'));

if (SIMULAR) {
  if (semVideo.length) console.log(`\nAtenção: falta o MP4 das aulas ${semVideo.join(', ')}; sem ele a semente para antes de gravar.`);
  console.log(`\n${leituras} leituras (GET) no banco, nenhuma escrita. Para gravar, rode sem --simular (só com o ok do dono).`);
  process.exit(0);
}

// ---------------------------------------------------------------- gravar (só sem --simular)
console.log('\nGravando...');
const cursoGravado = curso ? (Object.keys(plano.curso).length ? await mudar('cursos', curso.id, plano.curso) : curso) : await criar('cursos', { slug: SLUG, ...DADOS_CURSO, status: 'rascunho' });
const idModulo = {};
for (const { m, atual, muda: d } of plano.modulos) {
  if (!atual) idModulo[m.numero] = (await criar('modulos', { curso_id: cursoGravado.id, numero: m.numero, titulo: m.titulo, ordem: m.numero })).id;
  else { if (Object.keys(d).length) await mudar('modulos', atual.id, d); idModulo[m.numero] = atual.id; }
}
const idAula = {};
for (const { a, atual, muda: d, moduloMuda } of plano.aulas) {
  if (!atual) {
    idAula[a.codigo] = (await criar('aulas', { curso_id: cursoGravado.id, modulo_id: idModulo[a.modulo.numero], codigo: a.codigo, titulo: a.titulo, ordem: a.n, status: 'publicado', gratis: false, duracao_s: a.duracao_s, ...a.area })).id;
  } else {
    const dados = { ...d, ...(moduloMuda ? { modulo_id: idModulo[a.modulo.numero] } : {}) };
    if (Object.keys(dados).length) await mudar('aulas', atual.id, dados);
    idAula[a.codigo] = atual.id;
  }
  console.log(`  aula ${a.codigo}. ${a.titulo} (${mmss(a.duracao_s)}, ${a.area.falas.length} legendas, ${a.area.marcadores.length} marcadores)`);
}
for (const x of plano.arquivar) { await mudar('aulas', x.id, { status: 'arquivado' }); console.log(`  aula ${x.codigo} arquivada`); }

if (!SEM_KIT) {
  if (!kitBytes) throw new Error(`Falta ${KIT_ZIP}`);
  const corpo = readFileSync(KIT_ZIP);
  await subir('curso', DADOS_KIT.caminho, corpo, 'application/zip');
  const dados = { curso_id: cursoGravado.id, aula_id: idAula[AULA_DO_KIT], ...kitDesejado, bytes: corpo.length, versao: new Date().toISOString().slice(0, 10).split('-').reverse().join('/') };
  if (kitNoAr) await mudar('arquivos', kitNoAr.id, dados); else await criar('arquivos', dados);
  console.log(`  kit ${KIT} (${Math.round(corpo.length / 1024)} KB)`);
} else if (kitNoAr && (kitAulaMuda || Object.keys(kitMuda).length)) {
  await mudar('arquivos', kitNoAr.id, { ...kitMuda, aula_id: idAula[AULA_DO_KIT] });
}

// ---------------------------------------------------------------- produto, acesso e oferta (nascem desligados; se existem, ficam)
// Os textos abaixo só valem para o que ainda não existe. O produto e a oferta no ar mudam pelo painel, com o ok do dono.
const produtoGravado = produto || await criar('produtos', {
  slug: SLUG, nome: 'Vídeos com Claude', chamada: DADOS_CURSO.subtitulo,
  descricao: 'Mini curso complemento com 12 aulas de uns 5 minutos e meio e o kit para editar com o Claude o vídeo que você gravou, fazer motion e estudar referências.',
  preco_centavos: 2990, ativo: false, tags: ['claude', 'video', 'reels', 'youtube'],
});
if (!acesso) await rest('/produto_acessos', { method: 'POST', body: JSON.stringify({ produto_id: produtoGravado.id, curso_id: cursoGravado.id, dias: 365 }) });
// A etiqueta em cima dos vídeos do curso de posts e o bump no checkout dele moram aqui, na oferta nova: o código só mostra
// os dois com ela ligada. Nada vai para ofertas_bumps, que o código antigo mostraria mesmo com a oferta desligada.
const ETIQUETA = {
  cursos: ['posts-automaticos-com-claude'], rotulo: 'Vídeo e voz gerados com IA', acao: 'Aprender', vsl_bunny: null,
  texto: 'Tá vendo esse vídeo? Ele foi gerado pelo Claude. Cada movimento e cada cena é código. Quer aprender a fazer vídeos assim e a editar os que você grava?',
};
const BUMP_EM = [{
  oferta: 'posts-automaticos', titulo: 'Leve junto: Vídeos com Claude',
  texto: 'Edite com o Claude o vídeo que você grava e faça vídeos como as aulas deste curso. 12 aulas e o kit.',
}];
let oferta = ofertaNoAr;
if (oferta) {
  // Oferta que já existe: só completa o que falta. Ligada ou não, preço e o que o dono mudou ficam como estão.
  const c = oferta.checkout || {};
  if (!c.etiqueta || !c.bump_em) oferta = await mudar('ofertas', oferta.id, { checkout: { ...c, etiqueta: c.etiqueta || ETIQUETA, bump_em: c.bump_em || BUMP_EM } });
} else {
  oferta = await criar('ofertas', {
    slug: SLUG, produto_id: produtoGravado.id, nome: 'Vídeos com Claude', preco_centavos: 2990, parcelas_max: 3, juros_mes: 0.0319, pix_desconto_pct: 0, pix_minutos: 30,
    metodos: ['pix', 'cartao'], garantia_dias: 7, ativa: false,
    checkout: {
      subtitulo: 'Acesso por 1 ano · começa na hora',
      poster: { tipo: 'Mini curso', a: 'Vídeos', b: 'com Claude', pe: '12 aulas', cor: COR },
      inclui: ['12 aulas de uns 5 minutos e meio', 'Editar o vídeo gravado: cortes, em pé, zoom, cor, legenda e música', 'Motion, e print ou motion por cima da sua fala', 'Referências do YouTube e do Instagram pelo Claude in Chrome, gastando poucos tokens', 'O kit: receitas, ferramentas e os pedidos prontos de cada aula'],
      depoimentos: [],
      presente: true,
      etiqueta: ETIQUETA,
      bump_em: BUMP_EM,
    },
  });
}
console.log(`produto ${produtoGravado.slug} (${produtoGravado.ativo ? 'ligado' : 'desligado'}), oferta ${oferta.slug} R$ ${(oferta.preco_centavos / 100).toFixed(2).replace('.', ',')} (${oferta.ativa ? 'ligada' : 'desligada'})`);
const c = oferta.checkout || {};
console.log(`etiqueta nas aulas de: ${((c.etiqueta || {}).cursos || []).join(', ') || 'nenhum'} · VSL ${(c.etiqueta || {}).vsl_bunny ? 'gravada' : 'ainda sem (o painel mostra só o texto)'}`);
console.log(`bump no checkout de: ${(c.bump_em || []).map((b) => b.oferta).join(', ') || 'nenhum'} · os dois aparecem só com a oferta ligada`);
