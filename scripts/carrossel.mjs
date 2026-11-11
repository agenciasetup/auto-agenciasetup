// Exporta um carrossel do modelo (templates/carrossel) em JPEG 1080 x 1350, pronto para o Instagram.
// Usa o Chrome instalado (puppeteer-core): abre modelo.html por slide, espera fontes, imagens e o alinhamento e fotografa.
// Uso: node scripts/carrossel.mjs criado-no-claude [--so 1,5] [--tema preto] [--etapa 1|3|5]
// Sai em _local/carrossel/<nome>/: 01.jpg ... NN.jpg, capa-<tema>.jpg para cada capa extra e previa.jpg (todos lado a lado).
// --etapa 1 (só o mínimo, sem efeito nem textura) e --etapa 3 (com efeitos, sem textura) saem em <nome>/etapa-N/:
// é a regra das 5 etapas (templates/carrossel/LEIA.md). Sem --etapa, sai a peça final (etapa 5).
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { raiz } from './env.mjs';

const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((c) => existsSync(c));
const nome = process.argv[2] || 'criado-no-claude';
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const so = arg('--so') ? arg('--so').split(',').map(Number) : null;
const temaForcado = arg('--tema');
const etapa = [1, 3].includes(Number(arg('--etapa'))) ? Number(arg('--etapa')) : 5;
const modelo = pathToFileURL(join(raiz, 'templates', 'carrossel', 'modelo.html')).href;
const saida = join(raiz, '_local', 'carrossel', nome, ...(etapa < 5 ? [`etapa-${etapa}`] : []));
mkdirSync(saida, { recursive: true });

const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--font-render-hinting=none'] });
const pagina = await navegador.newPage();
await pagina.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });

async function foto(n, tema, arquivo) {
  await pagina.goto(`${modelo}?c=${nome}&s=${n}&etapa=${etapa}${tema ? `&tema=${tema}` : ''}`, { waitUntil: 'networkidle0' });
  await pagina.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; }))));
  });
  // O modelo alinha os textos de apoio e o selo depois das fontes (window.PRONTO).
  await pagina.waitForFunction(() => window.PRONTO === true, { timeout: 5000 }).catch(() => console.log('  (alinhamento não confirmou)'));
  await new Promise((r) => setTimeout(r, 250));
  const caminho = join(saida, arquivo);
  await pagina.screenshot({ path: caminho, type: 'jpeg', quality: 93, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
  console.log(`  ${arquivo}`);
  return caminho;
}

console.log(`carrossel ${nome} -> ${saida}`);
await pagina.goto(`${modelo}?c=${nome}&s=1`, { waitUntil: 'networkidle0' });
const total = await pagina.evaluate(() => window.SLIDES || 0);
const capas = await pagina.evaluate(() => window.CAPAS || []);

// Camadas reais da capa, para a prova "camadas": uma imagem por camada, em fundo transparente, recortada na janela.
// Saem sempre da peça final (etapa 5), em _local/carrossel/<nome>/camadas/.
if (await pagina.evaluate(() => (window.CARROSSEL?.slides || []).some((s) => s.prova?.tipo === 'camadas'))) {
  const pasta = join(raiz, '_local', 'carrossel', nome, 'camadas');
  mkdirSync(pasta, { recursive: true });
  for (const c of ['fundo', 'titulo', 'assunto', 'frente', 'acabamento']) {
    await pagina.goto(`${modelo}?c=${nome}&s=1&so=${c}`, { waitUntil: 'networkidle0' });
    await pagina.waitForFunction(() => window.PRONTO === true, { timeout: 5000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 200));
    await pagina.screenshot({ path: join(pasta, `${c}.png`), type: 'png', omitBackground: true, clip: { x: 40, y: 40, width: 1000, height: 1270 } });
  }
  console.log('  camadas/ (fundo, titulo, assunto, frente, acabamento)');
}
const feitos = [];
for (let n = 1; n <= total; n++) {
  if (so && !so.includes(n)) continue;
  feitos.push(await foto(n, temaForcado, `${String(n).padStart(2, '0')}.jpg`));
}
// Capas extras (a oficial já saiu como 01.jpg).
if (!so || so.includes(1)) for (const t of capas.slice(1)) await foto(1, t, `capa-${t}.jpg`);

// Prévia: os slides em fila (como no arrastar do Instagram) e as capas embaixo.
if (!so) {
  const b64 = (f) => `data:image/jpeg;base64,${readFileSync(f).toString('base64')}`;
  const linha = feitos.map((f) => `<img src="${b64(f)}">`).join('');
  const extras = capas.slice(1).map((t) => `<img src="${b64(join(saida, `capa-${t}.jpg`))}">`).join('');
  const html = `<html><body style="margin:0;background:#111;padding:40px;display:flex;flex-direction:column;gap:40px">
    <div style="display:flex;gap:0">${linha}</div><div style="display:flex;gap:30px">${b64 ? `<img src="${b64(feitos[0])}">` : ''}${extras}</div>
    <style>img{width:360px;height:450px;display:block}</style></body></html>`;
  const arq = join(saida, 'previa.html');
  writeFileSync(arq, html);
  await pagina.setViewport({ width: 80 + feitos.length * 360, height: 80 + 450 * 2 + 40, deviceScaleFactor: 1 });
  await pagina.goto(pathToFileURL(arq).href, { waitUntil: 'load' });
  await pagina.screenshot({ path: join(saida, 'previa.jpg'), type: 'jpeg', quality: 88, fullPage: true });
  console.log('  previa.jpg');
  // Carrossel infinito (`panorama` ou `travessia` no conteúdo): a tela larga inteira, os cards colados em tamanho real,
  // para conferir a emenda (o que atravessa de um card para o outro tem de casar no pixel).
  await pagina.goto(`${modelo}?c=${nome}&s=1`, { waitUntil: 'networkidle0' });
  const larga = await pagina.evaluate(() => !!(window.CARROSSEL && (window.CARROSSEL.panorama || (window.CARROSSEL.travessia || []).length)));
  if (larga) {
    const arqL = join(saida, 'larga.html');
    writeFileSync(arqL, `<html><body style="margin:0;display:flex">${feitos.map((f) => `<img src="${b64(f)}" style="width:1080px;height:1350px;display:block">`).join('')}</body></html>`);
    await pagina.setViewport({ width: feitos.length * 1080, height: 1350, deviceScaleFactor: 1 });
    await pagina.goto(pathToFileURL(arqL).href, { waitUntil: 'load' });
    await pagina.screenshot({ path: join(saida, 'larga.jpg'), type: 'jpeg', quality: 90, clip: { x: 0, y: 0, width: feitos.length * 1080, height: 1350 } });
    console.log(`  larga.jpg (a tela de ${feitos.length * 1080} x 1350)`);
  }
  // Os mapas de conferência (11/11/2026, pedido do dono: "crie mapa de margem, mapa de construção, mapa de profundidade,
  // de desfoque, desfoque de movimento, luz, sombra realista"). Saem em <nome>/mapas/, uma tira com todos os cards:
  //   construcao.jpg   o esqueleto: cada camada na sua cor e na ordem, os terços, o centro e as bordas alinhadas
  //   margens.jpg      as distâncias do título e do texto até a janela, em verde (dentro da regra) ou vermelho
  //   luz.jpg          de onde vem a luz, cada bola de luz e para onde cai cada sombra
  //   profundidade.jpg cada elemento num cinza pela distância (mais claro, mais perto da lente), com o número
  //   desfoque.jpg     cada elemento num cinza pelo desfoque (branco é nítido), com o rastro de movimento
  // Os três últimos só no carrossel infinito. --sem-mapas pula.
  if (!process.argv.includes('--sem-mapas')) {
    const pastaM = join(saida, 'mapas');
    mkdirSync(pastaM, { recursive: true });
    const tira = async (mapa) => {
      await pagina.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
      const fotos = [];
      for (let k = 1; k <= feitos.length; k++) {
        await pagina.goto(`${modelo}?c=${nome}&s=${k}&mapa=${mapa}`, { waitUntil: 'networkidle0' });
        await pagina.waitForFunction(() => window.PRONTO === true, { timeout: 5000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 120));
        fotos.push(await pagina.screenshot({ type: 'jpeg', quality: 82, encoding: 'base64', clip: { x: 0, y: 0, width: 1080, height: 1350 } }));
      }
      const arqH = join(pastaM, `${mapa}.html`);
      writeFileSync(arqH, `<html><body style="margin:0;display:flex">${fotos.map((b) => `<img src="data:image/jpeg;base64,${b}" style="width:1080px;height:1350px;display:block">`).join('')}</body></html>`);
      await pagina.setViewport({ width: feitos.length * 1080, height: 1350, deviceScaleFactor: 1 });
      await pagina.goto(pathToFileURL(arqH).href, { waitUntil: 'load' });
      await pagina.screenshot({ path: join(pastaM, `${mapa}.jpg`), type: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: feitos.length * 1080, height: 1350 } });
      rmSync(arqH);
    };
    const lista = ['construcao', 'margens', ...(larga ? ['luz', 'profundidade', 'desfoque'] : [])];
    for (const m of lista) await tira(m);
    // O mapa de profundidade continua também na raiz (a skill e o revisor abrem ali).
    if (larga) copyFileSync(join(pastaM, 'profundidade.jpg'), join(saida, 'profundidade.jpg'));
    console.log(`  mapas/ (${lista.join(', ')})`);
  }
}
await navegador.close();
