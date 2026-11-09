// Onde roda o código que o Claude escreve no conector em modo código (mcp-codigo.js): um QuickJS compilado em
// WebAssembly, dentro do próprio Worker, no plano grátis da Cloudflare. Modelo: src/lib/conector/sandbox.ts do jk-portal.
//
// O Code Mode da Cloudflare roda o código num Worker dinâmico (Worker Loader), que não existe no plano grátis, e o
// Worker não aceita eval nem new Function. O QuickJS é outro interpretador, com memória própria: lá dentro não existe
// env, fetch, rede, disco nem segredo. A única porta para fora é __chamar, que só conhece as operações que esta
// conexão pode usar, e cada uma passa pelas mesmas travas do conector de sempre (cargo, auditoria, acoes.js).
import { newQuickJSWASMModuleFromVariant, newVariant } from 'quickjs-emscripten-core';
import variante from '@jitl/quickjs-wasmfile-release-sync';
// Caminho direto do arquivo: o wrangler só compila o .wasm na publicação (CompiledWasm) quando o import termina em .wasm.
import wasmQuickjs from '../../node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.wasm';

// O módulo fica guardado entre pedidos do mesmo isolado: montar o WebAssembly uma vez só.
let modulo = null;
function quickjs() {
  if (!modulo) modulo = newQuickJSWASMModuleFromVariant(newVariant(variante, { wasmModule: wasmQuickjs })).catch((e) => { modulo = null; throw e; });
  return modulo;
}

// Tempo de relógio (conta a espera do banco), operações por código, memória e trabalho de CPU.
// O Date.now() do Worker não anda enquanto só o processador trabalha, então o laço sem fim é parado pela contagem de
// interrupções (o QuickJS chama o vigia a cada tantas instruções), não pelo relógio.
// vigias 400 dá uns 20 ms de processador: sobra para filtrar e resumir listas e cabe no limite do plano grátis.
export const LIMITES = { ms: 25_000, chamadas: 60, memoriaMb: 32, vigias: 400 };

const formatoErro = (d) => {
  if (d && typeof d === 'object') {
    if (d.message === 'interrupted') return 'O código foi interrompido por trabalho demais (laço sem fim?). Peça menos coisa por vez.';
    const m = String(d.stack || '').match(/codigo\.js:(\d+)/);
    const linha = m ? Number(m[1]) - 1 : 0;
    return `${d.name && d.name !== 'Error' ? `${d.name}: ` : ''}${d.message ?? String(d)}${linha > 0 ? ` (linha ${linha} do código)` : ''}`;
  }
  return String(d);
};

// Roda `codigo` como corpo de uma função async. `setup` já existe lá dentro, com uma função por operação
// (setup.listar_posts({...})). O valor do return volta como resultado. chamar(nome, args) faz a operação de verdade.
export async function rodarCodigo(codigo, nomes, chamar, limites = LIMITES) {
  const QJS = await quickjs();
  const rt = QJS.newRuntime();
  rt.setMemoryLimit(limites.memoriaMb * 1024 * 1024);
  rt.setMaxStackSize(512 * 1024);
  const prazo = Date.now() + limites.ms;
  let vigias = 0;
  rt.setInterruptHandler(() => ++vigias > limites.vigias || Date.now() > prazo);
  const vm = rt.newContext();

  const registros = [];
  let tamanho = 0;
  let chamadas = 0;
  const pendentes = new Set();
  let encerrado = false;
  const bombear = () => {
    if (encerrado || !vm.alive) return;
    const r = rt.executePendingJobs();
    if (r.error) r.error.dispose();
  };

  const fnChamar = vm.newFunction('__chamar', (nomeH, argsH) => {
    const nome = vm.getString(nomeH);
    const argsTexto = vm.getString(argsH);
    const adiado = vm.newPromise();
    chamadas += 1;
    const trabalho = (async () => {
      if (chamadas > limites.chamadas) throw new Error(`Passou de ${limites.chamadas} operações num código só. Divida em mais de um executar.`);
      let args;
      try { args = JSON.parse(argsTexto); } catch { throw new Error(`Os argumentos de ${nome} não viraram JSON.`); }
      return chamar(nome, args);
    })()
      .then(
        (valor) => {
          if (encerrado || !vm.alive) return;
          const s = vm.newString(JSON.stringify(valor === undefined ? null : valor));
          adiado.resolve(s);
          s.dispose();
        },
        (e) => {
          if (encerrado || !vm.alive) return;
          const er = vm.newError(e instanceof Error ? e.message : String(e));
          adiado.reject(er);
          er.dispose();
        },
      )
      .finally(() => { pendentes.delete(trabalho); bombear(); });
    pendentes.add(trabalho);
    return adiado.handle;
  });
  vm.setProp(vm.global, '__chamar', fnChamar);
  fnChamar.dispose();

  const fnLog = vm.newFunction('__log', (h) => {
    const s = vm.getString(h);
    if (tamanho < 20_000) { registros.push(s.slice(0, 4000)); tamanho += s.length; }
  });
  vm.setProp(vm.global, '__log', fnLog);
  fnLog.dispose();

  // O objeto `setup`, com uma função por operação. Nome que não existe dá erro dizendo o que existe.
  const base = `
const __fmt = (v) => typeof v === "string" ? v : (() => { try { return JSON.stringify(v); } catch { return String(v); } })();
const console = { log: (...a) => __log(a.map(__fmt).join(" ")), info: (...a) => __log(a.map(__fmt).join(" ")), warn: (...a) => __log("aviso: " + a.map(__fmt).join(" ")), error: (...a) => __log("erro: " + a.map(__fmt).join(" ")) };
const __op = (nome) => (args) => __chamar(nome, JSON.stringify(args === undefined ? {} : args)).then(JSON.parse);
const setup = new Proxy(Object.fromEntries(${JSON.stringify(nomes)}.map((n) => [n, __op(n)])), {
  get(alvo, k) { if (typeof k === "string" && !(k in alvo) && k !== "then") throw new Error("setup." + k + " não existe aqui. Use a ferramenta buscar para ver as operações."); return alvo[k]; }
});
`;
  // O código do Claude começa na linha 2: o erro diz a linha certa descontando 1.
  const fonte = `(async () => { const __v = await (async () => {\n${codigo}\n})(); return JSON.stringify(__v === undefined ? null : __v); })()`;

  const encerrar = async () => {
    encerrado = true;
    await Promise.allSettled([...pendentes]);
    if (vm.alive) vm.dispose();
    if (rt.alive) rt.dispose();
  };

  try {
    const b = vm.evalCode(base, 'base.js');
    if (b.error) { b.error.dispose(); await encerrar(); return { ok: false, erro: 'Não deu para montar o ambiente do código.', registros, chamadas }; }
    b.value.dispose();
    const avaliado = vm.evalCode(fonte, 'codigo.js');
    if (avaliado.error) {
      const erro = formatoErro(vm.dump(avaliado.error));
      avaliado.error.dispose();
      await encerrar();
      return { ok: false, erro, registros, chamadas };
    }
    const promessa = vm.resolvePromise(avaliado.value);
    avaliado.value.dispose();
    bombear();

    let relogio;
    const esgotou = new Promise((r) => { relogio = setTimeout(() => r('esgotou'), Math.max(0, prazo - Date.now()) + 50); });
    const fim = await Promise.race([promessa, esgotou]);
    clearTimeout(relogio);
    if (fim === 'esgotou') {
      await encerrar();
      return { ok: false, erro: `O código passou de ${Math.round(limites.ms / 1000)} segundos. Peça menos coisa por vez ou divida em mais de um executar.`, registros, chamadas };
    }
    if (fim.error) {
      const erro = formatoErro(vm.dump(fim.error));
      fim.error.dispose();
      await encerrar();
      return { ok: false, erro, registros, chamadas };
    }
    const texto = vm.getString(fim.value);
    fim.value.dispose();
    await encerrar();
    let valor = null;
    try { valor = JSON.parse(texto); } catch { valor = texto; }
    return { ok: true, valor, registros, chamadas };
  } catch (e) {
    await encerrar();
    return { ok: false, erro: e instanceof Error ? e.message : String(e), registros, chamadas };
  }
}
