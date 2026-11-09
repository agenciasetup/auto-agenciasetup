// Prévias das aulas para o destaque do início do aluno: 8 s sem som, 960 px, entrada e saída suaves para repetir sem pulo.
// Corta de Curso/videos/aula-<código>.mp4 a partir de 30% da aula, sobe para o bucket público "midia" (ao lado da capa)
// e grava o endereço em aulas.previa_url.
//   node scripts/previas.mjs [1.1 2.3] [--refazer] [--curso <slug>] [--inicio 0.3]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { env, exige, raiz, sql } from './env.mjs';

exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY');
const args = process.argv.slice(2);
const opc = (n, p) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : p; };
const CURSO = opc('--curso', 'posts-automaticos-com-claude');
const INICIO = Number(opc('--inicio', '0.3'));
const codigos = args.filter((a, i) => !a.startsWith('--') && !['--curso', '--inicio'].includes(args[i - 1]));
const refazer = args.includes('--refazer');
const txt = (v) => `'${String(v).replace(/'/g, "''")}'`;
const DUR = 8;

// Desfoque leve e um pouco mais escuro no pr�prio arquivo (o app vira ambiente, sem custo no celular).
// O fundo fica sob texto claro e na largura toda: escolhe 8 s do app do Claude em ação (a janela cinza-escura ocupa a
// maior parte do quadro), com movimento, sem cartaz de texto nem tela clara, entre 15% e 85% da aula.
const media = (l) => l.reduce((s, v) => s + v, 0) / (l.length || 1);
function trechoEscuro(fonte, total) {
  const L = 64, A = 36, px = L * A;
  const bruto = execFileSync('ffmpeg', ['-v', 'error', '-i', fonte, '-vf', `fps=1,scale=${L}:${A},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 128 * 1024 * 1024 });
  const quadros = [];
  for (let i = 0; i + px <= bruto.length; i += px) quadros.push(bruto.subarray(i, i + px));
  const luz = quadros.map((q) => media(q));
  const janela = quadros.map((q) => q.filter((v) => v >= 24 && v <= 80).length / px);
  const mov = quadros.map((q, i) => (i ? q.reduce((s, v, k) => s + Math.abs(v - quadros[i - 1][k]), 0) / px : 0));
  let melhor = null;
  for (let ini = Math.floor(total * 0.15); ini + DUR < Math.min(quadros.length, total * 0.85); ini++) {
    const fatia = (l, a = 0) => l.slice(ini + a, ini + DUR);
    const l = media(fatia(luz));
    const j = Math.min(...fatia(janela));
    const m = media(fatia(mov, 1));
    const parado = fatia(mov, 1).filter((v) => v < 0.4).length;
    if (l < 22 || l > 85 || j < 0.55 || parado > 4) continue;
    const nota = 6 * Math.min(m, 12) + 20 * j;
    if (!melhor || nota > melhor.nota) melhor = { ini, nota };
  }
  return melhor ? melhor.ini : Math.max(0, Math.min(total - DUR - 1, total * INICIO));
}

const aulas = await sql(`select a.id, a.codigo, a.previa_url, c.slug from aulas a join cursos c on c.id = a.curso_id where c.slug = ${txt(CURSO)} order by a.ordem`);
const pasta = join(raiz, '_local', 'previas');
mkdirSync(pasta, { recursive: true });
const pastaPublica = CURSO.replace(/-com-claude$/, '');
let n = 0;
for (const a of aulas) {
  if (codigos.length && !codigos.includes(a.codigo)) continue;
  if (a.previa_url && !refazer) continue;
  const fonte = join(raiz, 'Curso', 'videos', `aula-${a.codigo}.mp4`);
  if (!existsSync(fonte)) { console.log(`${a.codigo}: não achei ${fonte}`); continue; }
  const total = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', fonte]).toString().trim());
  const ss = (args.includes('--inicio') ? Math.max(0, Math.min(total - DUR - 1, total * INICIO)) : trechoEscuro(fonte, total)).toFixed(2);
  const saida = join(pasta, `previa-aula-${a.codigo}.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', ss, '-i', fonte, '-t', String(DUR), '-an',
    '-vf', `scale=1600:-2,gblur=sigma=2.2,eq=brightness=-0.05:saturation=1.25,fade=t=in:st=0:d=0.6,fade=t=out:st=${DUR - 0.6}:d=0.6`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', saida]);
  const caminho = `curso/${pastaPublica}/previa-aula-${a.codigo}.mp4`;
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/midia/${caminho}`, {
    method: 'POST', body: readFileSync(saida),
    headers: { apikey: env.SUPABASE_SECRET_KEY, ...(env.SUPABASE_SECRET_KEY.startsWith('sb_') ? {} : { Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` }), 'content-type': 'video/mp4', 'x-upsert': 'true', 'cache-control': '31536000' },
  });
  if (!r.ok) { console.log(`${a.codigo}: o armazenamento recusou (${r.status}) ${(await r.text()).slice(0, 120)}`); continue; }
  const url = `${env.SUPABASE_URL}/storage/v1/object/public/midia/${caminho}?v=${Date.now().toString(36)}`;
  await sql(`update aulas set previa_url = ${txt(url)} where id = ${txt(a.id)}`);
  n++;
  console.log(`${a.codigo}: ${(statSync(saida).size / 1024).toFixed(0)} KB a partir de ${ss} s`);
}
console.log(`${n} prévias prontas.`);
