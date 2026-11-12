// A conferência da arte: o "olho" que mede o que a gente não vê. Abre cada slide do carrossel no Chrome, lê as medidas
// (templates/carrossel/mapas.js) e cruza três imagens (a peça pronta, só o texto, só os elementos) para acusar, com
// número, o que o dono corrige de olho: margem colada, linhas do título desiguais, texto coberto ou sem contraste,
// elemento demais, bicho sem cor, sombra em quem voa ou para o lado errado, tamanho incoerente no mesmo plano, imagem
// ampliada demais, luz vazando na moldura preta, emenda que não casa e capa sem cor.
// Pedido do dono em 11/11/2026: "veja como melhorar o que não vemos... crie dependências que ajudem nossa skill a
// identificar mais qualidade".
//   node scripts/conferir-arte.mjs <conteudo> [--so 1,10] [--json]
// Sai em _local/carrossel/<conteudo>/conferencia.md (e .json). Só lê e mede: não muda a peça. Erro é o que reprova;
// aviso é para olhar. As regras estão em .claude/skills/carrossel-agenciasetup/references/direcao-de-arte.md.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { raiz } from './env.mjs';

const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((c) => existsSync(c));
const nome = process.argv[2];
if (!nome) { console.error('Uso: node scripts/conferir-arte.mjs <conteudo> [--so 1,10] [--json]'); process.exit(1); }
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const so = arg('--so') ? arg('--so').split(',').map(Number) : null;
const modelo = pathToFileURL(join(raiz, 'templates', 'carrossel', 'modelo.html')).href;
const saida = join(raiz, '_local', 'carrossel', nome);
mkdirSync(saida, { recursive: true });
const W = 1080, H = 1350, J = 40;

const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--font-render-hinting=none'] });
const pagina = await navegador.newPage();
await pagina.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

async function abrir(n, mapa) {
  await pagina.goto(`${modelo}?c=${nome}&s=${n}${mapa ? `&mapa=${mapa}` : ''}`, { waitUntil: 'networkidle0' });
  await pagina.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; }))));
  });
  await pagina.waitForFunction(() => window.PRONTO === true, { timeout: 5000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 200));
}
const foto = async (transparente) => sharp(await pagina.screenshot({ type: 'png', omitBackground: !!transparente, clip: { x: 0, y: 0, width: W, height: H } })).ensureAlpha().raw().toBuffer();

// ---------------------------------------------------------------- contas de pixel
const lum = (r, g, b) => { const f = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contraste = (a, b) => { const [x, y] = a > b ? [a, b] : [b, a]; return (x + 0.05) / (y + 0.05); };
// A cor em Lab, para medir a diferença de cor (o amarelo no branco tem pouco contraste de claro e escuro e muita
// diferença de cor: lê-se bem).
function lab(r, g, b) {
  const f = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = [f(r), f(g), f(b)];
  const g3 = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const X = g3((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047), Y = g3(0.2126 * R + 0.7152 * G + 0.0722 * B), Z = g3((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
const mediana = (v) => { if (!v.length) return null; const o = [...v].sort((a, b) => a - b); return o[Math.floor(o.length / 2)]; };
const dentro = (c) => ({ x0: Math.max(0, Math.floor(c.x)), y0: Math.max(0, Math.floor(c.y)), x1: Math.min(W, Math.ceil(c.x2)), y1: Math.min(H, Math.ceil(c.y2)) });
// Quanto da tinta de um texto fica onde tem elemento (em cima ou embaixo dele).
function cobertura(texto, elementos, caixa) {
  const { x0, y0, x1, y1 } = dentro(caixa);
  let tinta = 0, coberta = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * 4 + 3;
    if (texto[i] > 128) { tinta += 1; if (elementos[i] > 128) coberta += 1; }
  }
  return tinta ? coberta / tinta : 0;
}
// O contraste do texto com o que está atrás dele, em faixas ao longo da largura (o pior trecho é o que conta: o "um"
// do "um designer" em cima da faixa escura do chapéu).
// Devolve o contraste de claro e escuro e a diferença de cor (ΔE) do pior trecho. `fora`: pixels a ignorar (onde um
// elemento cobre o texto que está atrás dele).
function contrasteDoTexto(final, texto, caixa, fora) {
  const { x0, y0, x1, y1 } = dentro({ x: caixa.x - 10, y: caixa.y - 10, x2: caixa.x2 + 10, y2: caixa.y2 + 10 });
  const faixas = Math.max(1, Math.min(8, Math.floor((x1 - x0) / 70)));
  const larg = (x1 - x0) / faixas;
  let pior = null;
  for (let f = 0; f < faixas; f++) {
    const t = [[], [], []], fu = [[], [], []];
    for (let y = y0; y < y1; y += 2) for (let x = Math.floor(x0 + f * larg); x < Math.floor(x0 + (f + 1) * larg); x += 2) {
      const i = (y * W + x) * 4;
      if (fora && fora[i + 3] > 128) continue;
      const alvo = texto[i + 3] > 220 ? t : texto[i + 3] < 8 ? fu : null;
      if (alvo) { alvo[0].push(final[i]); alvo[1].push(final[i + 1]); alvo[2].push(final[i + 2]); }
    }
    if (t[0].length < 30 || fu[0].length < 30) continue;
    const ct = t.map(mediana), cf = fu.map(mediana);
    const c = contraste(lum(...ct), lum(...cf));
    const [l1, a1, b1] = lab(...ct), [l2, a2, b2] = lab(...cf);
    const de = Math.hypot(l1 - l2, a1 - a2, b1 - b2);
    // O trecho vale pelo melhor dos dois (lê-se por claro e escuro ou por cor); o texto vale pelo pior trecho.
    const nota = Math.max(c / 2, de / 40);
    if (pior === null || nota < pior.nota) pior = { c, de, nota };
  }
  return pior;
}
// A caixa da tinta de verdade, pelos pixels do mapa de texto (confere a medida da fonte).
function tintaPorPixel(texto, caixa) {
  const { x0, y0, x1, y1 } = dentro({ x: caixa.x - 12, y: caixa.y - 12, x2: caixa.x2 + 12, y2: caixa.y2 + 12 });
  let a = null;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (texto[(y * W + x) * 4 + 3] > 128) { a = a || { x, y, x2: x, y2: y }; a.x = Math.min(a.x, x); a.x2 = Math.max(a.x2, x); a.y = Math.min(a.y, y); a.y2 = Math.max(a.y2, y); }
  return a;
}
// A cor da capa (Hasler e Süsstrunk): o quanto a imagem tem de cor. Capa sem cor flopa (dados de 04/11/2026).
function cor(final) {
  let n = 0, srg = 0, syb = 0, srg2 = 0, syb2 = 0;
  for (let y = J; y < H - J; y += 3) for (let x = J; x < W - J; x += 3) {
    const i = (y * W + x) * 4, rg = final[i] - final[i + 1], yb = 0.5 * (final[i] + final[i + 1]) - final[i + 2];
    n += 1; srg += rg; syb += yb; srg2 += rg * rg; syb2 += yb * yb;
  }
  const mrg = srg / n, myb = syb / n;
  return Math.sqrt(srg2 / n - mrg * mrg + syb2 / n - myb * myb) + 0.3 * Math.sqrt(mrg * mrg + myb * myb);
}

// ---------------------------------------------------------------- as regras
const VOA = /animais\/(abelhas|borboletas|vagalumes|passaros|insetos|mariposas|libelulas)/;
const VIVO = /^(animais|personagens\/(historicos|pessoas)|plantas)\//;
const VETOR = { 'cima-esquerda': [-1, -1], cima: [0, -1], 'cima-direita': [1, -1], esquerda: [-1, 0], direita: [1, 0], 'baixo-esquerda': [-1, 1], baixo: [0, 1], 'baixo-direita': [1, 1], contraluz: [0, -1] };

const total = await (async () => { await abrir(1); return pagina.evaluate(() => window.SLIDES || 0); })();
const achados = [];
const medidas = [];
const finais = [];
const diz = (nivel, slide, texto) => achados.push({ nivel, slide, texto });

for (let n = 1; n <= total; n++) {
  if (so && !so.includes(n)) continue;
  await abrir(n);
  const m = await pagina.evaluate(() => window.MEDIDAS || null);
  if (!m) { diz('aviso', n, 'o modelo não devolveu as medidas (mapas.js não carregou?)'); continue; }
  const final = await foto(false);
  await abrir(n, 'texto');
  const texto = await foto(true);
  await abrir(n, 'elementos');
  const elementos = await foto(true);
  medidas.push(m); finais.push({ n, final });

  // 1. Margens, bloco do título, espaço entre linhas, texto pequeno (as regras do mapa de margens).
  for (const r of m.regras || []) if (!r.ok) diz(r.grave === false ? 'aviso' : 'erro', n, r.texto);
  // 2. As fontes da agência.
  for (const fam of m.fontes.faltando || []) diz('erro', n, `a ${fam} não carregou (faltam os arquivos em templates/fontes/?): o texto saiu na fonte de reserva`);
  // 3. A medida da tinta confere com os pixels? (se não, as margens do mapa estão erradas)
  if (m.titulo) for (const l of m.titulo.linhas) {
    const px = tintaPorPixel(texto, l.tinta);
    // O desfoque progressivo espalha a ponta da palavra: até 16 px de diferença é normal.
    if (px && (Math.abs(px.y - l.tinta.y) > 16 || Math.abs(px.y2 - l.tinta.y2) > 16)) diz('aviso', n, `a medida da tinta de "${l.texto}" (${Math.round(l.tinta.y)} a ${Math.round(l.tinta.y2)}) não bate com os pixels (${px.y} a ${px.y2}): confira as margens no olho`);
  }
  // 4. Texto e elemento no mesmo lugar, e o contraste de cada texto com o que está atrás.
  const blocos = [
    ...(m.titulo ? m.titulo.linhas.map((l) => ({ nome: `título "${l.texto}"`, caixa: l.tinta, titulo: true })) : []),
    ...(m.pos ? [{ nome: `"${m.pos.texto}"`, caixa: m.pos.caixa, naFrente: m.pos.naFrente, apoio: true }] : []),
    ...(m.pre ? [{ nome: `"${m.pre.texto}"`, caixa: m.pre.caixa, apoio: true }] : []),
    ...m.textos.map((t) => ({ nome: `"${t.texto.slice(0, 40)}"`, caixa: t.caixa })),
  ];
  for (const b of blocos) {
    const c = cobertura(texto, elementos, b.caixa);
    const pc = Math.round(c * 100);
    if (b.titulo) {
      // O assunto pode encostar de leve na headline ("levemente acima"): até 12% da tinta. Mais que isso, esconde.
      if (c > 0.22) diz('erro', n, `${b.nome}: ${pc}% da palavra está atrás de um elemento (o assunto só encosta de leve, até uns 12%)`);
      else if (c > 0.12) diz('aviso', n, `${b.nome}: ${pc}% da palavra está atrás de um elemento`);
    } else if (!b.naFrente) {
      if (c > 0.08) diz('erro', n, `${b.nome}: ${pc}% do texto divide o lugar com um elemento (o que atravessa não cobre texto)`);
      else if (c > 0.02) diz('aviso', n, `${b.nome}: ${pc}% do texto encosta num elemento`);
    }
    // O texto que fica atrás dos elementos (o título, o apoio que não está na frente) só se mede onde aparece.
    const k = contrasteDoTexto(final, texto, b.caixa, b.titulo || (!b.naFrente && b.apoio) ? elementos : null);
    if (k !== null) {
      // Lê-se com contraste de claro e escuro (2 no título, 3,2 no texto) ou com diferença de cor (ΔE de 40 no título, 55 no texto).
      const ok = b.titulo ? k.c >= 2 || k.de >= 40 : k.c >= 3.2 || k.de >= 55;
      const ruim = b.titulo ? k.c < 1.45 && k.de < 28 : k.c < 2.3 && k.de < 38;
      const txt = `${b.nome}: no pior trecho, contraste ${k.c.toFixed(1)} e diferença de cor ${Math.round(k.de)}`;
      if (ruim) diz('erro', n, `${txt}: não dá para ler ali`);
      else if (!ok) diz('aviso', n, `${txt}: confira a leitura`);
    }
  }
  // 5. Os elementos: quantidade, cor, sombra, tamanho no mesmo plano, desfoque e resolução.
  const vis = m.elementos.filter((e) => e.visivel && !e.fundo);
  const nitidos = vis.filter((e) => !e.suave);
  if (nitidos.length > 7) diz('aviso', n, `${nitidos.length} elementos no card: confira se não poluiu ("exagerou na quantidade de coisas")`);
  const [vx, vy] = VETOR[m.luzDe] || VETOR['cima-esquerda'];
  for (const e of vis) {
    if (e.sat === 0 && VIVO.test(e.pasta)) diz('erro', n, `${e.arq} está sem cor: bicho, planta e gente têm cor ("você deixou abelhas cinzas, não curto")`);
    if (e.sombra && VOA.test(e.pasta) && (e.z || 0) < 0.3) diz('aviso', n, `${e.arq} voa e tem sombra: só se estiver logo acima de um cartão ("a sombra na abelha ficou artificial")`);
    if (e.sombra && e.sombra.x * -vx + e.sombra.y * -vy < 0) diz('erro', n, `a sombra de ${e.arq} cai para o lado da luz (a luz vem de ${m.luzDe})`);
    if (e.z !== null && e.z >= 0.3 && e.blur < 4) diz('aviso', n, `${e.arq} está perto da lente (z ${e.z}) e nítido: o desfoque sai da distância`);
    if (e.z !== null && Math.abs(e.z) <= 0.05 && e.blur > 3 && !e.suave) diz('aviso', n, `${e.arq} está no plano do foco (z ${e.z}) e desfocado (${e.blur} px)`);
    if (e.escala && e.escala > 1.18 && !e.suave && e.blur < 6) diz('aviso', n, `${e.arq} aparece ${e.escala.toFixed(2)} vez o tamanho do arquivo: vai ficar mole (node scripts/tratar.mjs ampliar)`);
  }
  const porPasta = {};
  // Compara só coisa da mesma espécie: a pasta e a primeira palavra do arquivo (abelha com abelha, peça com peça). Na
  // mesma pasta moram coisas de tamanhos de verdade diferentes (o braço inteiro do robô e uma engrenagem solta).
  for (const e of vis.filter((x) => x.z !== null && Math.abs(x.z) <= 0.05 && !x.suave && x.pasta)) (porPasta[`${e.pasta}/${String(e.arq).split('-')[0]}`] ||= []).push(e);
  for (const [pasta, lista] of Object.entries(porPasta)) {
    const ls = lista.map((e) => e.largura).sort((a, b) => a - b);
    if (ls.length > 1 && ls[ls.length - 1] / ls[0] > 1.6) diz('aviso', n, `dois elementos de ${pasta}-* nítidos no mesmo plano com ${Math.round(ls[0])} e ${Math.round(ls[ls.length - 1])} px: um vai parecer gigante`);
  }
  // 6. Luz ou cor vazando na moldura preta: longe de qualquer elemento que atravessa, a moldura é preta.
  if (m.janela.x >= 20) {
    const cruzam = m.elementos.filter((e) => e.visivel && (e.camada === 'travessia' || e.camada === 'acima')).map((e) => { const f = e.blur * 3 + (e.contorno ? 80 : 0) + (e.sombra ? Math.abs(e.sombra.x) + Math.abs(e.sombra.y) + e.sombra.blur * 2 : 0) + 30; return { x: e.caixa.x - f, y: e.caixa.y - f, x2: e.caixa.x2 + f, y2: e.caixa.y2 + f }; });
    let vazou = null, cont = 0;
    for (let y = 0; y < H && cont < 400; y += 3) for (let x = 0; x < W; x += 3) {
      if (x > 26 && x < W - 26 && y > 26 && y < H - 26) { x = W - 27; continue; }
      if (cruzam.some((c) => x >= c.x && x <= c.x2 && y >= c.y && y <= c.y2)) continue;
      const i = (y * W + x) * 4;
      if (Math.max(final[i], final[i + 1], final[i + 2]) > 34) { cont += 1; vazou = vazou || [x, y]; }
    }
    if (cont >= 40) diz('erro', n, `luz ou cor vazando para a moldura preta (perto de x ${vazou[0]}, y ${vazou[1]})`);
  }
  // 7. A cor da capa.
  if (m.tipo === 'capa') m.cor = Math.round(cor(final));
}

// 8. A emenda do carrossel infinito: a última coluna de um card e a primeira do seguinte são vizinhas na tela larga.
if (medidas.some((m) => m.larga) && !so) {
  for (let k = 0; k < finais.length - 1; k++) {
    const a = finais[k].final, b = finais[k + 1].final;
    let emenda = 0, dentroA = 0;
    for (let y = 0; y < H; y++) for (let c = 0; c < 3; c++) {
      emenda += Math.abs(a[(y * W + W - 1) * 4 + c] - b[(y * W) * 4 + c]);
      dentroA += Math.abs(a[(y * W + W - 1) * 4 + c] - a[(y * W + W - 2) * 4 + c]);
    }
    emenda /= H * 3; dentroA /= H * 3;
    if (emenda > dentroA * 3 + 7) diz('aviso', finais[k].n, `a emenda com o card ${finais[k + 1].n} pode não casar (diferença ${emenda.toFixed(1)} na divisa contra ${dentroA.toFixed(1)} por dentro): abra a larga.jpg`);
  }
}
// 9. A cor da capa contra o banco de capas (a mediana das referências).
const bancoArq = join(raiz, 'templates', 'carrossel', 'referencias', 'banco', 'indice.json');
const banco = existsSync(bancoArq) ? JSON.parse(readFileSync(bancoArq, 'utf8')) : [];
const coresDoBanco = banco.map((r) => r.cor).filter((v) => typeof v === 'number');
const refCor = mediana(coresDoBanco);
for (const m of medidas.filter((x) => x.cor !== undefined)) {
  if (refCor && m.cor < refCor * 0.6) diz('aviso', m.slide, `capa com pouca cor (${m.cor} contra ${Math.round(refCor)} das capas do banco): "sinto falta de cor"`);
}
await navegador.close();

// ---------------------------------------------------------------- o relatório
const erros = achados.filter((a) => a.nivel === 'erro'), avisos = achados.filter((a) => a.nivel === 'aviso');
const linhas = [`# Conferência da arte: ${nome}`, '', `${medidas.length} slides medidos. ${erros.length} erro(s), ${avisos.length} aviso(s).`, ''];
if (erros.length) { linhas.push('## Erros (reprovam)', ''); erros.forEach((a) => linhas.push(`- Card ${a.slide}: ${a.texto}`)); linhas.push(''); }
if (avisos.length) { linhas.push('## Avisos (para olhar)', ''); avisos.forEach((a) => linhas.push(`- Card ${a.slide}: ${a.texto}`)); linhas.push(''); }
linhas.push('## Medidas', '', '| Card | Tipo | Margens do título (cima, esq., dir.) | Larguras das linhas | Entre linhas | Elementos | Cor |', '| --- | --- | --- | --- | --- | --- | --- |');
for (const m of medidas) {
  const t = m.titulo;
  linhas.push(`| ${m.slide} | ${m.tipo} ${m.tema} | ${t ? `${Math.round(t.margens.cima)}, ${Math.round(t.margens.esquerda)}, ${Math.round(t.margens.direita)}` : m.texto ? `texto: ${Math.round(m.texto.margens.cima)}, ${Math.round(m.texto.margens.esquerda)}, ${Math.round(m.texto.margens.direita)}` : ''} | ${t ? t.larguras.map((v) => Math.round(v)).join(' e ') : ''} | ${t && t.vaos.length ? t.vaos.map((v) => Math.round(v)).join(', ') : ''} | ${m.elementos.filter((e) => e.visivel && !e.fundo).length} | ${m.cor ?? ''} |`);
}
linhas.push('', 'Os mapas (construção, margens, luz, profundidade, desfoque) saem em `mapas/` com `node scripts/carrossel.mjs`.', '');
writeFileSync(join(saida, 'conferencia.md'), linhas.join('\n'));
writeFileSync(join(saida, 'conferencia.json'), JSON.stringify({ nome, erros, avisos, medidas }, null, 1));
if (process.argv.includes('--json')) console.log(JSON.stringify({ erros, avisos }, null, 1));
else {
  console.log(`conferência de ${nome}: ${erros.length} erro(s), ${avisos.length} aviso(s)`);
  erros.forEach((a) => console.log(`  ✖ card ${a.slide}: ${a.texto}`));
  avisos.forEach((a) => console.log(`  ! card ${a.slide}: ${a.texto}`));
  console.log(`  relatório: ${join('_local', 'carrossel', nome, 'conferencia.md')}`);
}
