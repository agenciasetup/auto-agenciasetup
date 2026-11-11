// O banco de capas: as peças que ensinam (as do dono que engajaram, as aprovadas, as que ele manda de inspiração), cada
// uma com o que ela ensina e as medidas dela. Pedido do dono em 11/11/2026: "podemos montar um banco de capas bonitas
// pra você se inspirar". Fica em templates/carrossel/referencias/banco/. As imagens ficam fora do Git (muitas não são
// nossas e o repositório é público); o índice e o LEIA.md entram.
//   node scripts/banco-capas.mjs adicionar <imagem> <nome> "<o que ensina>" --origem dono|aprovada|inspiracao|nossa
//                                [--tags luz,contraluz] [--link https://...] [--nota "curtidas, salvos"]
//   node scripts/banco-capas.mjs entrada        põe no banco tudo que estiver em referencias/banco/entrada/ (a descrever)
//   node scripts/banco-capas.mjs descrever <nome> "<o que ensina>" [--tags ...]   escreve ou troca a lição de uma
//   node scripts/banco-capas.mjs indice         refaz as medidas, o LEIA.md e a folha de miniaturas
// As medidas (cor, luz, contraste) calibram a conferência (scripts/conferir-arte.mjs compara a capa nova com a mediana).
// Nunca copiar uma capa do banco: é a direção, não o modelo.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { raiz } from './env.mjs';

const PASTA = path.join(raiz, 'templates', 'carrossel', 'referencias', 'banco');
const INDICE = path.join(PASTA, 'indice.json');
const ORIGENS = { dono: 'Do dono (as que engajaram)', nossa: 'Nossas, do jeito novo (o gabarito)', aprovada: 'Aprovadas pelo dono', inspiracao: 'Inspiração de fora (a direção, nunca o modelo)' };
fs.mkdirSync(path.join(PASTA, 'entrada'), { recursive: true });
const ler = () => (fs.existsSync(INDICE) ? JSON.parse(fs.readFileSync(INDICE, 'utf8')) : []);
const gravar = (ind) => fs.writeFileSync(INDICE, `${JSON.stringify(ind, null, 1)}\n`);
const slug = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const args = process.argv.slice(2);
const opcao = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

// As medidas de uma imagem: o quanto tem de cor (Hasler e Süsstrunk), a luz média, o contraste (a distância entre o
// claro e o escuro) e as três cores que mais aparecem.
async function medir(arquivo) {
  const { data, info } = await sharp(arquivo).removeAlpha().resize(360, 450, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
  let n = 0, srg = 0, syb = 0, srg2 = 0, syb2 = 0, sl = 0;
  const ls = [], baldes = new Map();
  for (let i = 0; i < data.length; i += 3) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]], rg = r - g, yb = 0.5 * (r + g) - b, l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    n += 1; srg += rg; syb += yb; srg2 += rg * rg; syb2 += yb * yb; sl += l; ls.push(l);
    const chave = `${r >> 5},${g >> 5},${b >> 5}`;
    const bd = baldes.get(chave) || [0, 0, 0, 0]; bd[0] += 1; bd[1] += r; bd[2] += g; bd[3] += b; baldes.set(chave, bd);
  }
  const mrg = srg / n, myb = syb / n;
  ls.sort((a, b) => a - b);
  const hex = (v) => Math.round(v).toString(16).padStart(2, '0');
  const cores = [...baldes.values()].sort((a, b) => b[0] - a[0]).slice(0, 3).map((b) => `#${hex(b[1] / b[0])}${hex(b[2] / b[0])}${hex(b[3] / b[0])}`);
  const meta = await sharp(arquivo).metadata();
  return { largura: meta.width, altura: meta.height, cor: Math.round(Math.sqrt(srg2 / n - mrg * mrg + syb2 / n - myb * myb) + 0.3 * Math.sqrt(mrg * mrg + myb * myb)), luz: Math.round(sl / n), contraste: Math.round(ls[Math.floor(n * 0.95)] - ls[Math.floor(n * 0.05)]), cores };
}

async function folha(ind) {
  const itens = ind.filter((e) => fs.existsSync(path.join(PASTA, e.arquivo)));
  if (!itens.length) return;
  const L = 240, A = 300, porLinha = 6, linhas = Math.ceil(itens.length / porLinha);
  const partes = await Promise.all(itens.map(async (e, i) => ({ input: await sharp(path.join(PASTA, e.arquivo)).resize(L, A, { fit: 'cover', position: 'top' }).toBuffer(), left: (i % porLinha) * L, top: Math.floor(i / porLinha) * A })));
  await sharp({ create: { width: porLinha * L, height: linhas * A, channels: 3, background: '#111' } }).composite(partes).jpeg({ quality: 84 }).toFile(path.join(PASTA, 'folha.jpg'));
}

async function refazer() {
  const ind = ler();
  for (const e of ind) { const arq = path.join(PASTA, e.arquivo); if (fs.existsSync(arq)) Object.assign(e, await medir(arq)); }
  gravar(ind);
  const med = (campo) => { const v = ind.map((e) => e[campo]).filter((x) => typeof x === 'number').sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
  const linhas = ['# Banco de capas', '',
    'As peças que ensinam. Abra a `folha.jpg` (as miniaturas, na ordem desta lista) e leia o que cada uma ensina antes de criar uma capa: escolha de 1 a 3 como direção e diga quais no registro do turno. **Nunca copie uma delas: é a direção, não o modelo.**', '',
    `As imagens ficam fora do Git. Mediana do banco: cor ${med('cor')}, luz ${med('luz')}, contraste ${med('contraste')} (a conferência avisa quando a capa nova fica com menos de 60% da cor mediana).`, '',
    'Para pôr uma capa nova: `node scripts/banco-capas.mjs adicionar <imagem> <nome> "<o que ensina>" --origem dono|aprovada|inspiracao|nossa --tags ...`. O dono pode só jogar o arquivo em `entrada/` e pedir para descrever (`node scripts/banco-capas.mjs entrada`).', ''];
  for (const [chave, titulo] of Object.entries(ORIGENS)) {
    const grupo = ind.filter((e) => e.origem === chave);
    if (!grupo.length) continue;
    linhas.push(`## ${titulo} (${grupo.length})`, '', '| Arquivo | O que ensina | Tags | Cor, luz, contraste | Cores | Nota |', '| --- | --- | --- | --- | --- | --- |');
    for (const e of grupo) linhas.push(`| \`${e.arquivo}\`${fs.existsSync(path.join(PASTA, e.arquivo)) ? '' : ' (sem o arquivo aqui)'} | ${e.ensina || 'A DESCREVER'} | ${(e.tags || []).join(', ')} | ${e.cor ?? ''}, ${e.luz ?? ''}, ${e.contraste ?? ''} | ${(e.cores || []).join(' ')} | ${[e.nota, e.link].filter(Boolean).join(' · ')} |`);
    linhas.push('');
  }
  fs.writeFileSync(path.join(PASTA, 'LEIA.md'), linhas.join('\n'));
  await folha(ind);
  console.log(`banco: ${ind.length} capas (LEIA.md e folha.jpg refeitos)`);
}

if (args[0] === 'adicionar') {
  const [, imagem, nomeBruto, ensina] = args;
  if (!imagem || !nomeBruto || !ensina) { console.error('Uso: node scripts/banco-capas.mjs adicionar <imagem> <nome> "<o que ensina>" --origem dono|aprovada|inspiracao|nossa [--tags a,b] [--link ...] [--nota ...]'); process.exit(1); }
  const origem = ORIGENS[opcao('--origem')] ? opcao('--origem') : 'inspiracao';
  const arquivo = `${slug(nomeBruto)}.jpg`;
  await sharp(imagem).flatten({ background: '#000' }).resize(1080, 1350, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toFile(path.join(PASTA, arquivo));
  const ind = ler().filter((e) => e.arquivo !== arquivo);
  ind.push({ arquivo, origem, ensina, tags: (opcao('--tags') || '').split(',').map((t) => t.trim()).filter(Boolean), link: opcao('--link') || '', nota: opcao('--nota') || '', em: new Date().toISOString().slice(0, 10) });
  gravar(ind);
  console.log(`${arquivo} (${origem})`);
  if (!args.includes('--sem-indice')) await refazer();
} else if (args[0] === 'entrada') {
  const ind = ler();
  const novos = fs.readdirSync(path.join(PASTA, 'entrada')).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  for (const f of novos) {
    const arquivo = `${slug(f.replace(/\.\w+$/, ''))}.jpg`;
    await sharp(path.join(PASTA, 'entrada', f)).flatten({ background: '#000' }).resize(1080, 1350, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toFile(path.join(PASTA, arquivo));
    if (!ind.some((e) => e.arquivo === arquivo)) ind.push({ arquivo, origem: 'inspiracao', ensina: '', tags: [], link: '', nota: '', em: new Date().toISOString().slice(0, 10) });
    fs.rmSync(path.join(PASTA, 'entrada', f));
    console.log(`${arquivo}: no banco, A DESCREVER (olhe a imagem e rode: node scripts/banco-capas.mjs descrever ${arquivo.replace('.jpg', '')} "<o que ensina>" --tags ...)`);
  }
  gravar(ind);
  await refazer();
} else if (args[0] === 'descrever') {
  const ind = ler(), e = ind.find((x) => x.arquivo === `${slug(args[1] || '')}.jpg`);
  if (!e || !args[2]) { console.error('Uso: node scripts/banco-capas.mjs descrever <nome> "<o que ensina>" [--tags a,b]'); process.exit(1); }
  e.ensina = args[2];
  if (opcao('--tags')) e.tags = opcao('--tags').split(',').map((t) => t.trim()).filter(Boolean);
  gravar(ind);
  await refazer();
} else if (args[0] === 'indice') {
  await refazer();
} else {
  console.error('Uso: node scripts/banco-capas.mjs adicionar | entrada | descrever | indice (veja o começo do arquivo)');
  process.exit(1);
}
