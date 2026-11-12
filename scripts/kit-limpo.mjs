// Trava do kit do curso: as fontes da família Calango são exclusividade da agência e NUNCA vão para o curso (ordem do
// dono em 11/11/2026: "NÃO ENVIE NOSSAS FONTES DA FAMILIA CALANGO PRO CURSO. Nossas fontes são exclusividade nossa.").
// Esta conferência roda antes de qualquer pacote do kit ser montado (scripts/area-semente.mjs e area-semente-en.mjs) e
// derruba o envio se achar: arquivo de fonte (o kit usa só fontes do Google, por link), arquivo com "calango" no nome,
// ou texto que cite uma fonte Calango ou a pasta templates/fontes.
// Uso à mão: node scripts/kit-limpo.mjs [pasta ...]   (sem pasta: Curso/kit, Curso/kit-codex e Curso/kit-en)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const FONTE = new Set(['.woff2', '.woff', '.ttf', '.otf', '.eot']);
const TEXTO = new Set(['.md', '.js', '.mjs', '.cjs', '.css', '.html', '.json', '.txt', '.svg', '.yml', '.yaml']);
const CITA = /calango\s*(condensed|signature|sans|serif|ink)|calango(condensed|signature|sans|serif|ink)|templates[\\/]fontes|fontes\.css/i;

function* arquivos(pasta) {
  for (const n of readdirSync(pasta)) {
    if (n === 'node_modules' || n === '.git') continue;
    const p = join(pasta, n);
    if (statSync(p).isDirectory()) yield* arquivos(p);
    else yield p;
  }
}

// Devolve a lista de problemas (vazia = limpo).
export function problemasDoKit(pasta) {
  const achados = [];
  if (!existsSync(pasta)) return achados;
  for (const arq of arquivos(pasta)) {
    const rel = relative(pasta, arq), ext = extname(arq).toLowerCase();
    if (FONTE.has(ext)) achados.push(`${rel}: arquivo de fonte (o kit não leva fonte nenhuma; as da família Calango são só da agência)`);
    if (/calango/i.test(rel)) achados.push(`${rel}: "calango" no nome do arquivo`);
    if (TEXTO.has(ext) && statSync(arq).size < 3_000_000) {
      const t = readFileSync(arq, 'utf8');
      const m = t.match(CITA);
      if (m) achados.push(`${rel}: cita "${m[0]}" (fonte ou pasta de fontes da agência)`);
    }
  }
  return achados;
}

// Para os scripts que montam o pacote: derruba na hora.
export function exigirKitLimpo(pasta) {
  const achados = problemasDoKit(pasta);
  if (!achados.length) return;
  console.error(`\nENVIO BLOQUEADO: o kit em ${pasta} tem o que é só da agência.\n  ${achados.join('\n  ')}\nTire isso do kit e rode de novo. As fontes Calango nunca vão para o curso.`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const raiz = join(fileURLToPath(import.meta.url), '..', '..');
  const pastas = process.argv.slice(2).length ? process.argv.slice(2) : ['kit', 'kit-codex', 'kit-en', 'kit-codex-manual'].map((k) => join(raiz, 'Curso', k));
  let ruim = 0;
  for (const p of pastas) {
    const a = problemasDoKit(p);
    console.log(`${existsSync(p) ? (a.length ? 'PROBLEMA' : 'limpo') : 'não existe'}: ${p}`);
    for (const l of a) console.log(`  ${l}`);
    ruim += a.length;
  }
  process.exit(ruim ? 1 : 0);
}
