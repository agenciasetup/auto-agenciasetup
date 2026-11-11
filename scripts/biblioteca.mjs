// A biblioteca de elementos (templates/biblioteca/): recortes sem fundo, organizados por tema, para reaproveitar em
// qualquer post sem gerar de novo (pedido do dono, 11/11/2026: "no futuro teremos uma quantidade absurda e não
// precisaremos ficar gerando"). Cada elemento entra recortado e justo (sem sobra em volta), com nome que diz o que é,
// e o índice (indice.json e LEIA.md, com uma folha de miniaturas por pasta) diz o que tem sem abrir um por um.
// As imagens ficam fora do Git (o repositório é público); o índice entra.
//
//   node scripts/biblioteca.mjs adicionar <imagem> <tema/pasta> <nome> "<o que é>" [opções]
//       --fonte "Magnific 2026-11-11, Nano Banana 2.1, id KLVWQ3Rkqp"   de onde veio
//       --tags borboleta,azul,inseto                                     palavras para achar depois
//       --dica "Combina com cena verde-água; matiz +15 na selva"         como usar bem
//       --ja-recortado    a imagem já é PNG sem fundo (só corta justo)
//       --luz             elemento claro sobre fundo preto (fumaça, brilho, névoa): o próprio claro vira a transparência
//       --volume          nuvem com sombra, em fundo preto: a borda vira transparência e o corpo fica opaco, com o volume
//   node scripts/biblioteca.mjs indice     refaz as folhas de miniaturas e o LEIA.md a partir do indice.json
//
// No conteúdo do carrossel, o caminho é relativo a templates/carrossel/imagens/: arq: '../../biblioteca/<arquivo>'.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { raiz } from './env.mjs';

const BIB = path.join(raiz, 'templates', 'biblioteca');
const INDICE = path.join(BIB, 'indice.json');
const args = process.argv.slice(2);
const opc = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const tem = (k) => args.includes(k);
const posicionais = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--fonte', '--tags', '--dica'].includes(args[i - 1])));

const lerIndice = () => (fs.existsSync(INDICE) ? JSON.parse(fs.readFileSync(INDICE, 'utf8')) : { itens: [] });
const gravarIndice = (ind) => fs.writeFileSync(INDICE, `${JSON.stringify(ind, null, 1)}\n`);
const slug = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// O que é claro sobre o preto vira transparência (nuvem, fumaça): a luz é a opacidade, e a cor fica sem o preto.
// Com `volume` (11/11/2026, as nuvens que o dono achou "falsas, cinzas e feias"): a transparência satura cedo, e o corpo
// da nuvem fica opaco com a sombra dela dentro (o volume). Sem isso a parte sombreada vira branco meio transparente e a
// nuvem fica chapada.
async function claroViraAlfa(entrada, { piso = 14, faixa = 190, exp = 0.85 } = {}) {
  const { data, info } = await sharp(entrada).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const a = Math.max(0, Math.min(1, (l - piso) / faixa)) ** exp;
    const k = a > 0.02 ? 1 / a : 0;
    out[j] = Math.min(255, r * k * 0.98); out[j + 1] = Math.min(255, g * k * 0.98); out[j + 2] = Math.min(255, b * k * 0.98);
    out[j + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

// Tira o fundo no computador (scripts/recortar.mjs, BiRefNet na placa de vídeo): primeiro com a borda fina; se o modelo
// não achar o objeto, tenta o padrão e, por último, sem o acabamento da borda.
function recortar(entrada, saida) {
  const tentativas = [['--modelo', 'hr-matting'], [], ['--sem-matting']];
  for (const t of tentativas) {
    const r = spawnSync(process.execPath, [path.join(raiz, 'scripts', 'recortar.mjs'), entrada, saida, ...t], { stdio: 'ignore' });
    if (r.status === 0 && fs.existsSync(saida)) return t.join(' ') || 'padrão';
  }
  throw new Error(`não consegui recortar ${entrada}`);
}

async function adicionar() {
  const [, imagem, pasta, nome, descricao] = posicionais;
  if (!imagem || !pasta || !nome || !descricao) {
    console.error('Uso: node scripts/biblioteca.mjs adicionar <imagem> <tema/pasta> <nome> "<o que é>" [--fonte ...] [--tags ...] [--dica ...] [--ja-recortado] [--luz]');
    process.exit(1);
  }
  if (!fs.existsSync(imagem)) { console.error(`Não achei ${imagem}`); process.exit(1); }
  const destinoPasta = path.join(BIB, ...pasta.split('/').map(slug));
  fs.mkdirSync(destinoPasta, { recursive: true });
  let base = slug(nome);
  let arq = path.join(destinoPasta, `${base}.png`);
  for (let n = 2; fs.existsSync(arq); n++) arq = path.join(destinoPasta, `${base}-${n}.png`);
  let png;
  let como;
  if (tem('--volume')) { png = await claroViraAlfa(imagem, { piso: 7, faixa: 58, exp: 1.15 }); como = 'o claro virou transparência, com o volume guardado'; }
  else if (tem('--luz')) { png = await claroViraAlfa(imagem); como = 'o claro virou transparência'; }
  else if (tem('--ja-recortado')) { png = fs.readFileSync(imagem); como = 'já vinha recortado'; }
  else {
    const tmp = path.join(raiz, '_local', 'biblioteca-tmp.png');
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    como = `recorte ${recortar(path.resolve(imagem), tmp)}`;
    png = fs.readFileSync(tmp);
    fs.rmSync(tmp, { force: true });
  }
  // Justo: sem a sobra transparente em volta (a largura do arquivo é a do elemento).
  const justo = await sharp(png).ensureAlpha().trim({ threshold: 1 }).png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
  fs.writeFileSync(arq, justo.data);
  const ind = lerIndice();
  const item = {
    arquivo: path.relative(BIB, arq).replace(/\\/g, '/'), pasta: pasta.split('/').map(slug).join('/'), descricao,
    largura: justo.info.width, altura: justo.info.height,
    fonte: opc('--fonte') || null, tags: (opc('--tags') || '').split(',').map((t) => t.trim()).filter(Boolean),
    dica: opc('--dica') || null, adicionado: new Date().toISOString().slice(0, 10), como,
  };
  ind.itens = ind.itens.filter((i) => i.arquivo !== item.arquivo).concat(item);
  gravarIndice(ind);
  console.log(`${item.arquivo} (${item.largura} x ${item.altura}, ${como})`);
  if (!tem('--sem-indice')) await refazerIndice();
}

// Uma folha por pasta: as miniaturas sobre um xadrez (para ver a transparência), com o nome do arquivo embaixo.
async function folhaDaPasta(pasta, itens) {
  const L = 260, A = 300, por = 4;
  const linhas = Math.ceil(itens.length / por);
  const xadrez = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${L - 40}"><defs><pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#d9d9d9"/><rect width="10" height="10" fill="#f2f2f2"/><rect x="10" y="10" width="10" height="10" fill="#f2f2f2"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`);
  const partes = [];
  for (const [k, it] of itens.entries()) {
    const x = (k % por) * L, y = Math.floor(k / por) * A;
    const mini = await sharp(path.join(BIB, it.arquivo)).resize(L - 16, L - 56, { fit: 'inside' }).toBuffer({ resolveWithObject: true });
    partes.push({ input: xadrez, left: x, top: y });
    partes.push({ input: mini.data, left: x + Math.round((L - mini.info.width) / 2), top: y + Math.round((L - 40 - mini.info.height) / 2) });
    const nome = path.basename(it.arquivo).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    partes.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${A - (L - 40)}"><rect width="100%" height="100%" fill="#1b1b1b"/><text x="8" y="26" font-family="Arial" font-size="15" fill="#fff">${nome}</text><text x="8" y="48" font-family="Arial" font-size="13" fill="#aaa">${it.largura} x ${it.altura}</text></svg>`), left: x, top: y + L - 40 });
  }
  const destino = path.join(BIB, pasta, 'folha.jpg');
  await sharp({ create: { width: por * L, height: linhas * A, channels: 3, background: '#111' } }).composite(partes).jpeg({ quality: 82 }).toFile(destino);
}

const CABECALHO = `# Biblioteca de elementos

Recortes sem fundo para compor posts (carrossel, frase, capa), organizados por tema, para reaproveitar em vez de gerar de novo. Pedido do Filipe em 11/11/2026: "Crie uma pasta no projeto com elementos que você já baixou, organize de forma inteligente por tema... no futuro teremos uma quantidade absurda e não precisaremos ficar gerando."

**Este arquivo é gerado** por \`node scripts/biblioteca.mjs indice\` a partir do \`indice.json\`. Para mudar a descrição de um elemento, mude no \`indice.json\` e rode de novo. As imagens ficam só no computador (fora do Git: o repositório é público); este índice e o \`indice.json\` entram no Git.

## Como usar
- **Antes de gerar qualquer elemento, procure aqui** (por tema abaixo, ou pelas \`tags\` no \`indice.json\`). Abra a \`folha.jpg\` da pasta para ver todos de uma vez.
- No conteúdo do carrossel (\`templates/carrossel/conteudos/\`), o caminho é relativo a \`templates/carrossel/imagens/\`: \`arq: '../../biblioteca/<arquivo>'\`. Na travessia do carrossel infinito: \`{ arq: '../../biblioteca/insetos/borboletas/...png', x, y, w, matiz, sat, luz, blur }\`.
- **Ajuste a cor para a cena** (regra do Filipe, 11/11/2026: "Folha verde que tá numa cor completamente diferente do cenário, quebra tudo e deixa amador"): \`matiz\` (graus), \`sat\` e \`luz\` na travessia.
- **O foco segue a distância do assunto**: no plano do assunto, nítido; perto da lente, maior e desfocado; no fundo, menor e desfocado.
- Os elementos daqui foram feitos com **luz suave vindo de cima, à esquerda**. Quem gera um novo pede a mesma luz, para tudo combinar.

## Como acrescentar
1. Gere o elemento **sozinho**, nunca a cena inteira, em fundo liso cinza claro (o que é claro, como nuvem e fumaça, em fundo preto), com a luz de cima à esquerda e o elemento inteiro dentro do quadro (borda natural, sem corte). No Magnific, só o modelo que diz "Unlimited".
2. \`node scripts/biblioteca.mjs adicionar <imagem> <tema/pasta> <nome> "<o que é>" --fonte "..." --tags a,b --dica "..."\` (com \`--volume\` para nuvem de verdade em fundo preto, que guarda a sombra dela; com \`--luz\` para fumaça e brilho; com \`--ja-recortado\` se já for PNG sem fundo ou for para usar com \`mistura: 'multiply'\`, como o banco de nuvens em fundo branco). O script tira o fundo no computador, corta justo, salva e refaz este índice.
3. Confira a folha da pasta: recorte com borda reta, fundo sobrando ou pedaço comido não fica.

## Temas que ainda não têm nada
Dinheiro (notas, moedas, maço), mosquitos e outros insetos voando, cobras, outros pássaros, ovos soltos, madeira em tábua, pedras, flores tropicais. Quando um post pedir, gere e acrescente aqui.

## Outros recortes do projeto (fora desta pasta)
- \`templates/carrossel/imagens/bicho-*.png\`: os bichos das capas (o quadro inteiro, com a transparência em volta).
- \`templates/carrossel/imagens/elementos/\`: as letras, a placa e o travessão de posts antigos.
- \`templates/frase/imagens/\`: os objetos dos posts de frase.
`;

async function refazerIndice() {
  const ind = lerIndice();
  const existentes = ind.itens.filter((i) => fs.existsSync(path.join(BIB, i.arquivo)));
  const pastas = [...new Set(existentes.map((i) => i.pasta))].sort();
  let md = CABECALHO;
  md += `\n## O que tem (${existentes.length} elementos)\n`;
  for (const p of pastas) {
    const itens = existentes.filter((i) => i.pasta === p).sort((a, b) => a.arquivo.localeCompare(b.arquivo));
    await folhaDaPasta(p, itens);
    md += `\n### ${p} (${itens.length})\n\nFolha: \`${p}/folha.jpg\`\n\n| Arquivo | O que é | Tamanho | Tags | Dica | De onde veio |\n| --- | --- | --- | --- | --- | --- |\n`;
    for (const i of itens) md += `| \`${i.arquivo}\` | ${i.descricao} | ${i.largura} x ${i.altura} | ${(i.tags || []).join(', ')} | ${i.dica || ''} | ${i.fonte || ''} |\n`;
  }
  fs.writeFileSync(path.join(BIB, 'LEIA.md'), md);
  console.log(`índice: ${existentes.length} elementos em ${pastas.length} pastas (LEIA.md e as folhas refeitas)`);
}

const comando = posicionais[0];
if (comando === 'adicionar') await adicionar();
else if (comando === 'indice') await refazerIndice();
else { console.error('Use: adicionar ou indice (veja o começo do arquivo).'); process.exit(1); }
