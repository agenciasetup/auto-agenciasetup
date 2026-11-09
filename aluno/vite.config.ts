// Build do app do aluno (curso.agenciasetup.com.br): React + Vite, igual ao painel. Sai em public/aluno (fora do Git).
// O endereço e a chave pública do Supabase (só servem para o login) vêm do .env.local da raiz, no momento do build.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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

export default defineConfig({
  root: aqui,
  base: '/aluno/',
  plugins: [react()],
  define: {
    __SUPABASE_URL__: JSON.stringify(url),
    __SUPABASE_PUBLICA__: JSON.stringify(publica),
  },
  build: {
    outDir: join(aqui, '..', 'public', 'aluno'),
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
