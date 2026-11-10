// O sinal de vida deste computador para o Escritório de IA: avisa o sistema que o computador está ligado.
// Roda de 5 em 5 minutos (no Windows, pelo Agendador de Tarefas; no Mac, pelo launchd ou cron). Sem sinal de nenhum
// computador há mais de 12 minutos, os agentes que rodam no computador aparecem offline (cinza, ZzzZz) na tela.
//   node scripts/batimento.mjs [windows|mac]
// Usa a chave da casa do .env.local (MCP_CHAVE), como o scripts/conector.mjs. Não imprime a chave.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const maquina = process.argv[2] || (process.platform === 'darwin' ? 'mac' : 'windows');
try {
  const r = execFileSync(process.execPath, [path.join(raiz, 'scripts', 'conector.mjs'), 'escritorio_batimento', JSON.stringify({ maquina })], { cwd: raiz, encoding: 'utf8', timeout: 30_000 });
  console.log(String(r).replace(/\s+/g, ' ').slice(0, 160));
} catch (e) {
  console.error('batimento não saiu:', String((e && (e.stderr || e.message)) || '').slice(0, 200));
  process.exit(1);
}
