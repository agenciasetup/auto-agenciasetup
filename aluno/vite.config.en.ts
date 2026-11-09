// Build do app do aluno em inglês (o curso "Posts on Autopilot with Claude", em dólar, no endereço próprio): o MESMO código
// do app em português (aluno/src), compilado com os textos trocados por inglês. Sai em public/aluno-en (fora do Git) e o
// Worker serve essa pasta no endereço do curso em inglês (appAluno, em worker/index.js).
//
// Como funciona: um plugin pega cada .ts/.tsx de aluno/src (menos aluno/src/leitor, o leitor de outro curso) ANTES de o
// Vite compilar e troca, por split/join, os textos exatos de aluno/en.json ([português, inglês], na ordem). O código-fonte
// não muda e o app em português continua igual. Cada par leva o contexto (aspas, > e < do JSX, `${`) para nunca pegar
// identificador, classe de CSS, rota ou chave de objeto. Par que não achou o texto (o código mudou) vira aviso no fim do
// build; com EN_ESTRITO=1 o build falha. Troca que quebra a sintaxe derruba o build (o compilador reclama).
// Depois de mudar o app: node aluno/scripts/sobra-pt.mjs mostra o que ficou em português.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-ignore: módulo .mjs compartilhado com o scanner (aluno/scripts/sobra-pt.mjs)
import { aplicarPares, lerPares, traduzivel } from './scripts/en-aplicar.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const env: Record<string, string> = {};
const arq = join(aqui, '..', '.env.local');
if (existsSync(arq)) {
  for (const l of readFileSync(arq, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(\S*)/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const url = process.env.SUPABASE_URL || env.SUPABASE_URL || '';
const publica = process.env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || '';
if (!url || !publica) throw new Error(`Faltam SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY em ${arq}: sem eles o login do aluno não funciona.`);

function ingles(): Plugin {
  // EN_JSON: outro dicionário, só para testar o próprio build (o normal é aluno/en.json).
  const pares: [string, string][] = lerPares(process.env.EN_JSON || join(aqui, 'en.json'));
  const usados = new Set<number>();
  return {
    name: 'aluno-ingles',
    enforce: 'pre',
    transform(codigo, id) {
      if (!traduzivel(id)) return null;
      const novo = aplicarPares(codigo, pares, usados);
      return novo === codigo ? null : { code: novo, map: null };
    },
    // index.html: o idioma, o título e o que mais o dicionário pegar. O manifesto vem do Worker, em inglês (/manifest.webmanifest),
    // não da cópia em português que o Vite põe na pasta.
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return aplicarPares(html, pares, usados)
          .replace(/<html lang="[^"]*"/, '<html lang="en"')
          .replace('href="/aluno-en/manifest.webmanifest"', 'href="/manifest.webmanifest"');
      },
    },
    // No fim (depois do index.html, que o Vite monta por último), os pares que não acharam nada.
    closeBundle() {
      const soltos = pares.filter((_, i) => !usados.has(i));
      if (!soltos.length) return;
      const aviso = `[aluno:en] ${soltos.length} par(es) de aluno/en.json não acharam o texto (o código mudou?):\n  ${soltos.map(([pt]) => JSON.stringify(pt)).join('\n  ')}`;
      if (process.env.EN_ESTRITO) throw new Error(aviso);
      console.warn(`\n${aviso}\n`);
    },
  };
}

export default defineConfig({
  root: aqui,
  base: '/aluno-en/',
  plugins: [ingles(), react()],
  define: {
    __SUPABASE_URL__: JSON.stringify(url),
    __SUPABASE_PUBLICA__: JSON.stringify(publica),
  },
  build: {
    outDir: join(aqui, '..', 'public', 'aluno-en'),
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
