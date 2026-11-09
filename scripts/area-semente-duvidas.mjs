// Monta (ou completa) o curso de leitura "Dúvidas da Fé" (R$ 19,90, perfil da Raquel) na área de membros, com a marca
// e o endereço próprios (duvidasdafe.agenciasetup.com.br). Lê Curso-Duvidas/ (curso.json, duvidas/*.json, img/) e o
// livro já gerado (_local/duvidas/duvidas-da-fe.pdf, do scripts/duvidas.mjs pdf).
// Pode rodar de novo: acha cada coisa pelo seu código (curso e produto pelo slug, capítulo pelo número, dúvida pelo
// código, PDF pelo nome) e só cria o que falta. Dúvida que já existe não muda (o painel é quem edita depois); com
// --atualizar, o texto dos arquivos volta para o banco (cuidado: desfaz o que foi editado no painel).
// O que nasce desligado fica como o dono deixar: o curso nasce em rascunho, e os produtos e as ofertas nascem desligados;
// se já existem, este script não publica, não liga e não muda preço nem texto de venda.
// Uso: node scripts/area-semente-duvidas.mjs --simular      só lê (GET) e mostra o plano; nada é gravado
//      node scripts/area-semente-duvidas.mjs                 curso, capítulos, dúvidas, imagens, PDF, produtos, ofertas e bump
//      node scripts/area-semente-duvidas.mjs --sem-arquivos  não sobe as imagens nem o PDF de novo
//      node scripts/area-semente-duvidas.mjs --atualizar     regrava o texto das dúvidas que já existem
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { env, exige, raiz } from './env.mjs';

exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY');
const SIMULAR = process.argv.includes('--simular');
const SEM_ARQUIVOS = process.argv.includes('--sem-arquivos');
const ATUALIZAR = process.argv.includes('--atualizar');
const SLUG = 'duvidas-da-fe';
const COR = '#A87B2D';
const PASTA = join(raiz, 'Curso-Duvidas');
const PDF = join(raiz, '_local', 'duvidas', 'duvidas-da-fe.pdf');
const PDF_NOME = 'Dúvidas da Fé (livro em PDF)';
const k = env.SUPABASE_SECRET_KEY;
const H = { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': 'application/json' };

// Com --simular, só GET passa (a trava fica no fetch, para o banco e para o storage).
if (SIMULAR) {
  const fetchDeVerdade = globalThis.fetch;
  globalThis.fetch = (url, opcoes = {}) => {
    const metodo = String(opcoes.method || 'GET').toUpperCase();
    if (metodo !== 'GET') throw new Error(`--simular: ${metodo} ${String(url).split('?')[0]} barrado`);
    return fetchDeVerdade(url, opcoes);
  };
}
async function rest(caminho, opcoes = {}) {
  const metodo = String(opcoes.method || 'GET').toUpperCase();
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1${caminho}`, { ...opcoes, method: metodo, headers: { ...H, Prefer: 'return=representation', ...(opcoes.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${caminho} ${r.status}: ${t.slice(0, 400)}`);
  return t ? JSON.parse(t) : null;
}
const um = async (tabela, filtro) => (await rest(`/${tabela}?${filtro}&limit=1`))[0] || null;
const todos = (tabela, filtro) => rest(`/${tabela}?${filtro}`);
const criar = async (tabela, dados) => (await rest(`/${tabela}`, { method: 'POST', body: JSON.stringify(dados) }))[0];
const mudar = async (tabela, id, dados) => (await rest(`/${tabela}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(dados) }))[0];
async function subir(bucket, caminho, corpo, tipo) {
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${bucket}/${caminho.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST', headers: { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': tipo, 'x-upsert': 'true' }, body: corpo,
  });
  if (!r.ok) throw new Error(`upload ${bucket}/${caminho} ${r.status}: ${(await r.text()).slice(0, 200)}`);
}
const publico = (caminho) => `${env.SUPABASE_URL}/storage/v1/object/public/midia/${caminho}`;
const TIPO = { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' };

// ---------------------------------------------------------------- o que está nos arquivos
const curso = JSON.parse(readFileSync(join(PASTA, 'curso.json'), 'utf8'));
const duvidas = Object.fromEntries(readdirSync(join(PASTA, 'duvidas')).filter((f) => f.endsWith('.json')).map((f) => {
  const d = JSON.parse(readFileSync(join(PASTA, 'duvidas', f), 'utf8'));
  return [d.slug, d];
}));
const faltam = curso.capitulos.flatMap((c) => c.duvidas).filter((d) => !duvidas[d.slug]).map((d) => d.slug);
if (faltam.length) throw new Error(`Faltam ${faltam.length} dúvidas em Curso-Duvidas/duvidas: ${faltam.slice(0, 5).join(', ')}`);
if (!SEM_ARQUIVOS && !existsSync(PDF)) throw new Error(`Falta o livro: rode "node scripts/duvidas.mjs pdf" (${PDF}).`);

// O texto da dúvida no formato do banco (aulas.corpo): igual ao arquivo, com a imagem já no endereço público.
const corpoDe = (d) => ({
  minutos: d.minutos || 3, resposta: d.resposta, explicacao: d.explicacao, biblia: d.biblia, igreja: d.igreja, diga: d.diga, e_se: d.e_se || [], guardar: d.guardar,
  imagem: d.imagem ? { url: publico(`${SLUG}/${d.imagem.arquivo}`), alt: d.imagem.alt, legenda: d.imagem.legenda } : null,
});

// ---------------------------------------------------------------- o que já está no banco
const cursoNoAr = await um('cursos', `slug=eq.${SLUG}`);
const modulosNoAr = cursoNoAr ? await todos('modulos', `curso_id=eq.${cursoNoAr.id}&select=id,numero,titulo,descricao`) : [];
const aulasNoAr = cursoNoAr ? await todos('aulas', `curso_id=eq.${cursoNoAr.id}&select=id,codigo,titulo,modulo_id`) : [];
const pdfNoAr = cursoNoAr ? await um('arquivos', `curso_id=eq.${cursoNoAr.id}&nome=eq.${encodeURIComponent(PDF_NOME)}`) : null;
const produtoNoAr = await um('produtos', `slug=eq.${SLUG}`);
const sempreNoAr = await um('produtos', `slug=eq.${SLUG}-para-sempre`);
const ofertaNoAr = await um('ofertas', `slug=eq.${SLUG}`);
const bumpNoAr = await um('ofertas', `slug=eq.${SLUG}-para-sempre`);

let codigo = 0;
const plano = curso.capitulos.map((c) => ({ ...c, duvidas: c.duvidas.map((x, i) => ({ ...duvidas[x.slug], codigo: `${c.numero}.${i + 1}`, ordem: ++codigo })) }));
const novas = plano.flatMap((c) => c.duvidas).filter((d) => !aulasNoAr.some((a) => a.codigo === d.codigo));
console.log(SIMULAR ? 'SIMULAÇÃO: só leitura. Nada foi gravado.' : 'Gravando:');
console.log(`  curso ${SLUG}: ${cursoNoAr ? `já existe (${cursoNoAr.status})` : 'novo, em rascunho'}`);
console.log(`  capítulos: ${plano.length} (${plano.filter((c) => !modulosNoAr.some((m) => m.numero === c.numero)).length} novos)`);
console.log(`  dúvidas: ${codigo} (${novas.length} novas${ATUALIZAR ? `, ${codigo - novas.length} regravadas` : ''})`);
console.log(`  imagens e PDF: ${SEM_ARQUIVOS ? 'não sobem' : `${Object.values(duvidas).filter((d) => d.imagem).length + 1} imagens e o livro (${existsSync(PDF) ? Math.round(readFileSync(PDF).length / 1048576 * 10) / 10 : '?'} MB)`}`);
console.log(`  produtos: ${produtoNoAr ? 'já existe' : 'novo, desligado'} / ${sempreNoAr ? 'para sempre já existe' : 'para sempre novo, desligado'}`);
console.log(`  ofertas: ${ofertaNoAr ? `já existe (${ofertaNoAr.ativa ? 'ligada' : 'desligada'})` : 'nova, R$ 19,90, desligada'} / ${bumpNoAr ? 'bump já existe' : 'bump novo, R$ 14,90'}`);
if (SIMULAR) process.exit(0);

// ---------------------------------------------------------------- imagens (bucket público "midia")
if (!SEM_ARQUIVOS) {
  const imgs = [...new Set([curso.capa.arquivo, ...Object.values(duvidas).filter((d) => d.imagem).map((d) => d.imagem.arquivo)])];
  for (const f of imgs) await subir('midia', `${SLUG}/${f}`, readFileSync(join(PASTA, 'img', f)), TIPO[f.split('.').pop()] || 'application/octet-stream');
  console.log(`  ${imgs.length} imagens no midia/${SLUG}/`);
}

// ---------------------------------------------------------------- curso e marca
const MARCA = { nome: curso.titulo, dominio: curso.endereco, tema: 'leitura', autores: curso.autores, whatsapp: curso.whatsapp, cor: COR };
const cursoGravado = cursoNoAr || await criar('cursos', {
  slug: SLUG, titulo: curso.titulo, subtitulo: curso.subtitulo,
  descricao: `${curso.total} dúvidas sobre a Igreja Católica em ${curso.capitulos.length} capítulos, cada uma em 3 minutos de leitura, com a resposta pronta para a conversa. Por ${curso.autores}.`,
  capa_url: publico(`${SLUG}/${curso.capa.arquivo}`), cor: COR, certificado_pct: 100, status: 'rascunho', tags: ['fe', 'catolico', 'leitura'], marca: MARCA,
});
console.log(`  curso ${cursoGravado.slug} (${cursoGravado.status})`);

// ---------------------------------------------------------------- PDF (bucket privado "curso")
let pdfId = pdfNoAr ? pdfNoAr.id : null;
if (!SEM_ARQUIVOS) {
  const corpo = readFileSync(PDF);
  const caminho = `${SLUG}/duvidas-da-fe.pdf`;
  await subir('curso', caminho, corpo, 'application/pdf');
  const dados = {
    curso_id: cursoGravado.id, nome: PDF_NOME, tipo: 'pdf', origem: 'storage', caminho, bytes: corpo.length, ordem: 0,
    o_que: `O livro inteiro: as ${curso.total} dúvidas, com sumário que leva a cada uma.`, quando: 'Para ler no papel, sem internet ou guardar no celular.', tempo: 'Para sempre',
    versao: new Date().toISOString().slice(0, 10).split('-').reverse().join('/'),
  };
  pdfId = pdfNoAr ? (await mudar('arquivos', pdfNoAr.id, dados)).id : (await criar('arquivos', dados)).id;
  console.log(`  livro em PDF (${Math.round(corpo.length / 1048576 * 10) / 10} MB)`);
}
// A marca aponta para o PDF (o e-mail e o obrigado mandam este arquivo). Marca que o painel já mudou fica como está.
const marcaAtual = cursoGravado.marca || {};
if (!marcaAtual.dominio || (pdfId && !marcaAtual.pdf_arquivo_id)) await mudar('cursos', cursoGravado.id, { marca: { ...MARCA, ...marcaAtual, pdf_arquivo_id: marcaAtual.pdf_arquivo_id || pdfId } });

// ---------------------------------------------------------------- capítulos e dúvidas
const idModulo = {};
for (const c of plano) {
  const m = modulosNoAr.find((x) => x.numero === c.numero);
  idModulo[c.numero] = m ? m.id : (await criar('modulos', { curso_id: cursoGravado.id, numero: c.numero, titulo: c.titulo, descricao: c.linha, ordem: c.numero, liberacao: 'imediata' })).id;
}
for (const c of plano) {
  for (const d of c.duvidas) {
    const dados = {
      modulo_id: idModulo[c.numero], titulo: d.titulo, descricao: d.resposta, ordem: d.ordem, tipo: 'leitura', corpo: corpoDe(d),
      capa_url: d.imagem ? publico(`${SLUG}/${d.imagem.arquivo}`) : null,
    };
    const a = aulasNoAr.find((x) => x.codigo === d.codigo);
    if (!a) await criar('aulas', { curso_id: cursoGravado.id, codigo: d.codigo, status: 'publicado', ...dados });
    else if (ATUALIZAR) await mudar('aulas', a.id, dados);
  }
}
console.log(`  ${codigo} dúvidas (${novas.length} novas)`);

// ---------------------------------------------------------------- produtos, acesso, ofertas e bump (nascem desligados)
// O produto fica desligado de propósito: assim ele não aparece na vitrine da Setup. Quem vende é a oferta.
const produto = produtoNoAr || await criar('produtos', {
  slug: SLUG, nome: curso.titulo, chamada: curso.subtitulo, descricao: `O livro em PDF e a área de leitura no celular, com as ${curso.total} dúvidas.`,
  preco_centavos: 1990, imagem_url: publico(`${SLUG}/${curso.capa.arquivo}`), ativo: false, tags: ['fe', 'catolico'],
});
const sempre = sempreNoAr || await criar('produtos', {
  slug: `${SLUG}-para-sempre`, nome: `${curso.titulo}: acesso para sempre`, chamada: 'A área de leitura sem prazo, com as aulas em vídeo que vierem depois.',
  preco_centavos: 1490, ativo: false, tags: ['fe', 'catolico'],
});
for (const [p, dias] of [[produto, 365], [sempre, null]]) {
  if (!(await um('produto_acessos', `produto_id=eq.${p.id}&curso_id=eq.${cursoGravado.id}`))) await rest('/produto_acessos', { method: 'POST', body: JSON.stringify({ produto_id: p.id, curso_id: cursoGravado.id, dias }) });
}
const oferta = ofertaNoAr || await criar('ofertas', {
  slug: SLUG, produto_id: produto.id, nome: curso.titulo, preco_centavos: 1990, parcelas_max: 3, juros_mes: 0.0319, pix_desconto_pct: 0, pix_minutos: 30,
  metodos: ['pix', 'cartao'], garantia_dias: 7, ativa: false,
  checkout: {
    subtitulo: 'O livro em PDF no seu e-mail na hora',
    poster: { tipo: 'Livro', a: 'Dúvidas', b: 'da Fé', pe: `${curso.total} dúvidas`, cor: COR },
    inclui: [
      'O livro em PDF, no seu e-mail logo depois do pagamento',
      `${curso.total} dúvidas sobre a Igreja Católica, em ${curso.capitulos.length} capítulos`,
      'Cada uma em 3 minutos de leitura, com a resposta pronta para a conversa',
      'Área de leitura no celular, com letra grande e botão de ouvir',
      'Ajuda pelo WhatsApp',
    ],
    depoimentos: [], presente: true,
  },
});
const bump = bumpNoAr || await criar('ofertas', {
  slug: `${SLUG}-para-sempre`, produto_id: sempre.id, nome: `${curso.titulo}: acesso para sempre`, preco_centavos: 1490, parcelas_max: 1, juros_mes: 0.0319,
  pix_desconto_pct: 0, pix_minutos: 30, metodos: ['pix', 'cartao'], garantia_dias: 7, ativa: false, checkout: {},
});
if (!(await um('ofertas_bumps', `oferta_id=eq.${oferta.id}&bump_id=eq.${bump.id}`))) {
  await rest('/ofertas_bumps', { method: 'POST', body: JSON.stringify({
    oferta_id: oferta.id, bump_id: bump.id, titulo: 'Acesso para sempre',
    texto: 'A área de leitura sem prazo e as aulas em vídeo que vierem depois. Sem ele, a área fica aberta por 1 ano (o PDF é seu para sempre).', ordem: 0,
  }) });
}
console.log(`  oferta ${oferta.slug} R$ ${(oferta.preco_centavos / 100).toFixed(2).replace('.', ',')} (${oferta.ativa ? 'ligada' : 'desligada'}) com o bump ${bump.slug} R$ ${(bump.preco_centavos / 100).toFixed(2).replace('.', ',')}`);

// ---------------------------------------------------------------- página de venda (nasce em rascunho; se existe, fica)
// Os blocos vêm de Curso-Duvidas/venda.json; depois, quem muda é o painel (Cursos > Landing pages). Ela abre na raiz do
// endereço da marca (worker/render/venda-leitura.js) quando publicada, com o ok do dono.
const VENDA = join(PASTA, 'venda.json');
if (existsSync(VENDA)) {
  const v = JSON.parse(readFileSync(VENDA, 'utf8'));
  const lp = await um('landing_pages', `slug=eq.${v.slug}`);
  if (!lp) await criar('landing_pages', { slug: v.slug, titulo: v.titulo, produto_id: produto.id, blocos: v.blocos, seo: { ...(v.seo || {}), vitrine: false }, status: 'rascunho' });
  console.log(`  página de venda ${v.slug}: ${lp ? `já existe (${lp.status})` : 'nova, em rascunho'}`);
}
console.log(`\nCurso em ${cursoGravado.status}. Para vender: publicar o curso e ligar a oferta no painel (Cursos > Ofertas), com o ok do dono.`);
