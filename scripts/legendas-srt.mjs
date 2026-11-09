// Legendas .srt e a árvore do Google Drive de um curso, a partir das falas e dos tempos de cada aula.
// Uso: node scripts/legendas-srt.mjs [--curso <slug>] [--drive]
//   --curso posts-automaticos-com-claude (o padrão, igual a antes)
//        grava _local/drive/legendas/aula-<id>.srt, inclusive a da VSL, de falas.json e tempos.json de Curso/aulas/<id>.
//        --drive também monta _local/drive/Posts automáticos com Claude/, a árvore que vai para o Google Drive: vídeo,
//        legenda, resumo e materiais de cada aula, com nomes do banco.
//   --curso videos-com-claude (versão 4, as 12 aulas lidas pelo scripts/videos-v4.mjs, sem banco)
//        grava _local/drive/legendas/videos-com-claude/aula-<n>.srt, com a fala escrita no roteiro e os trechos
//        reaproveitados no lugar certo. --drive também monta _local/drive/Vídeos com Claude/ (kit, e por aula o vídeo de
//        videos4/, a legenda, o resumo e os materiais do kit), com os nomes das aulas novas.
//   --curso posts-on-autopilot (o curso em inglês, igual ao primeiro: Curso/aulas-en, videos-en e kit-en, nomes do banco)
//        grava _local/drive/legendas/posts-on-autopilot/aula-<id>.srt. --drive monta _local/drive/Posts on Autopilot with Claude/.
// Vídeos entram por link físico, sem ocupar espaço de novo. Nada sobe para o Drive: a pasta é só montada aqui.
// Os tempos de tempos.json são os do vídeo final (o total bate com a duração do .mp4).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, linkSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { raiz, sql } from './env.mjs';

const iCurso = process.argv.indexOf('--curso');
const SLUG = iCurso > 0 ? String(process.argv[iCurso + 1] || '') : 'posts-automaticos-com-claude';
if (!['posts-automaticos-com-claude', 'videos-com-claude', 'posts-on-autopilot'].includes(SLUG)) { console.error(`Curso desconhecido: ${SLUG} (posts-automaticos-com-claude, videos-com-claude ou posts-on-autopilot)`); process.exit(1); }
const CURSO = join(raiz, 'Curso');
const KIT = join(CURSO, 'kit');
const SAIDA = join(raiz, '_local', 'drive');
const LEG = join(SAIDA, 'legendas');
const lerJson = (arq) => (existsSync(arq) ? JSON.parse(readFileSync(arq, 'utf8').replace(/^﻿/, '')) : null);

// ------------------------------------------------------------ legenda
const MAX_LINHA = 42;
const MAX_CUE = 84;
const tempo = (s) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const p = (n, t = 2) => String(n).padStart(t, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
// Corta um texto longo em pedaços de até MAX_CUE: frases, depois vírgulas, depois palavras.
function pedacos(texto) {
  const caber = (partes, sep) => {
    const out = [];
    for (const p of partes) {
      const ult = out[out.length - 1];
      if (ult && (ult + sep + p).length <= MAX_CUE) out[out.length - 1] = ult + sep + p;
      else out.push(p);
    }
    return out;
  };
  const porPalavra = (t) => caber(t.split(/\s+/), ' ');
  const porVirgula = (t) => (t.length <= MAX_CUE ? [t] : caber(t.split(/(?<=,)\s+/), ' ').flatMap((p) => (p.length <= MAX_CUE ? [p] : porPalavra(p))));
  const frases = texto.trim().split(/(?<=[.!?])\s+/).flatMap(porVirgula);
  return caber(frases, ' ');
}
// Quebra em duas linhas no espaço mais perto do meio.
function linhas(t) {
  if (t.length <= MAX_LINHA) return t;
  const meio = t.length / 2;
  let melhor = -1;
  for (let i = 0; i < t.length; i++) if (t[i] === ' ' && (melhor < 0 || Math.abs(i - meio) < Math.abs(melhor - meio))) melhor = i;
  return melhor < 0 ? t : `${t.slice(0, melhor)}\n${t.slice(melhor + 1)}`;
}
// lista: [{ inicio, fim, texto }] em segundos do vídeo final.
function srtDe(lista) {
  const cues = [];
  for (const t of lista) {
    if (!t.texto) continue;
    const ps = pedacos(t.texto);
    const total = ps.reduce((s, p) => s + p.length, 0);
    let ini = t.inicio;
    for (const p of ps) {
      const fim = ini + ((t.fim - t.inicio) * p.length) / total;
      cues.push([ini, fim, linhas(p)]);
      ini = fim;
    }
  }
  return cues.map(([a, b, txt], i) => `${i + 1}\n${tempo(a)} --> ${tempo(b)}\n${txt}\n`).join('\n');
}
function srt(pasta) {
  const falas = lerJson(join(pasta, 'audio', 'falas.json')) || [];
  const tempos = (lerJson(join(pasta, 'audio', 'tempos.json')) || {}).falas || {};
  return srtDe(falas.filter((f) => tempos[f.id]).map((f) => ({ inicio: tempos[f.id].inicio, fim: tempos[f.id].fim, texto: f.texto })));
}

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s) % 60).padStart(2, '0')}`;
const minutos = (s) => `${Math.max(1, Math.round(s / 60))} min`;
const pastaModulo = (m) => `${String(m.numero).padStart(2, '0')} ${m.titulo}`;
const ligar = (de, para) => { rmSync(para, { force: true }); try { linkSync(de, para); } catch { copyFileSync(de, para); } };
const zipar = (origem, destino) => {
  rmSync(destino, { force: true });
  execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${origem}' -DestinationPath '${destino}' -Force`]);
};

if (SLUG === 'videos-com-claude') {
  await videos();
  process.exit(0);
}
if (SLUG === 'posts-on-autopilot') {
  await autopilot();
  process.exit(0);
}

// ------------------------------------------------------------ dados do banco
const modulos = await sql(`select m.numero, m.titulo from modulos m join cursos c on c.id = m.curso_id
  where c.slug = 'posts-automaticos-com-claude' order by m.numero`);
const aulas = await sql(`select a.codigo, a.titulo, m.numero as modulo from aulas a join modulos m on m.id = a.modulo_id
  join cursos c on c.id = a.curso_id where c.slug = 'posts-automaticos-com-claude' and a.status = 'publicado' order by a.ordem`);

mkdirSync(LEG, { recursive: true });
for (const a of aulas) {
  writeFileSync(join(LEG, `aula-${a.codigo}.srt`), srt(join(CURSO, 'aulas', a.codigo)));
}
writeFileSync(join(LEG, 'aula-vsl.srt'), srt(join(CURSO, 'aulas', 'vsl')));
console.log(`legendas: ${aulas.length} aulas e a VSL em ${LEG}`);

if (!process.argv.includes('--drive')) process.exit(0);

// ------------------------------------------------------------ árvore do Drive
// Materiais de cada aula (os mesmos de scripts/area-semente.mjs). Pasta vira .zip.
const MATERIAIS = {
  '1.1': ['00-LEIA-PRIMEIRO.md'], '1.2': ['guia-da-tela.md'], '1.3': ['01-comece-aqui.md'], '1.4': ['02-liberar-acessos.md'],
  '2.1': ['03-meu-estilo.md'], '2.2': [], '2.3': ['exemplos-de-correcao.md', 'skills/meu-estilo'],
  '3.1': ['04-radar.md', 'skills/radar'], '3.2': ['05-quadro.md'], '3.3': ['06-posts-do-dia.md', 'skills/posts-do-dia'],
  '4.1': ['07-design.md', 'modelo', 'ferramentas/exportar.mjs'], '4.2': ['skills/design-alto-padrao'],
  '4.3': ['licoes-de-design.md'], '4.4': ['como-dar-feedback.md'],
  '5.1': ['08-nano-banana.md', 'ferramentas/gerar-imagem.mjs'], '5.2': ['09-magnific.md'],
  '6.1': ['10-rotina.md'], '6.2': ['ERROS-E-SOLUCOES.md'],
};
const KIT_ZIP = join(raiz, '_local', 'area-semente', 'Posts-Automaticos-Kit.zip');
const BONUS_ZIP = join(raiz, '_local', 'bonus7', 'Modelos-Prontos.zip');
const RAIZ_DRIVE = join(SAIDA, 'Posts automáticos com Claude');

for (const arq of [KIT_ZIP, BONUS_ZIP, join(CURSO, 'videos', 'aula-vsl.mp4')]) if (!existsSync(arq)) { console.error(`Falta ${arq}`); process.exit(1); }

rmSync(RAIZ_DRIVE, { recursive: true, force: true });
const comece = join(RAIZ_DRIVE, '00 Comece aqui');
mkdirSync(comece, { recursive: true });
ligar(join(CURSO, 'videos', 'aula-vsl.mp4'), join(comece, 'Apresentação do curso.mp4'));
copyFileSync(join(LEG, 'aula-vsl.srt'), join(comece, 'Apresentação do curso.srt'));
copyFileSync(KIT_ZIP, join(comece, 'Posts-Automaticos-Kit.zip'));

const lista = [];
for (const m of modulos) {
  lista.push(`${pastaModulo(m)}`);
  for (const a of aulas.filter((x) => x.modulo === m.numero)) {
    const pasta = join(CURSO, 'aulas', a.codigo);
    const nome = `${a.codigo} ${a.titulo}`;
    const destino = join(RAIZ_DRIVE, pastaModulo(m), nome);
    mkdirSync(destino, { recursive: true });
    const tempos = lerJson(join(pasta, 'audio', 'tempos.json')) || {};
    ligar(join(CURSO, 'videos', `aula-${a.codigo}.mp4`), join(destino, `${nome}.mp4`));
    copyFileSync(join(LEG, `aula-${a.codigo}.srt`), join(destino, `${nome}.srt`));

    const area = lerJson(join(pasta, 'area.json')) || {};
    const md = [`# ${nome}`, '', `Módulo ${m.numero}: ${m.titulo}. Duração: ${minutos(tempos.total || 0)}.`, ''];
    if (area.resumo) md.push('## Resumo', '', area.resumo, '');
    if (area.marcadores?.length) md.push('## Marcadores', '', ...area.marcadores.map((x) => `- ${mmss(x.s)} ${x.titulo}`), '');
    if (area.faca_agora?.length) {
      md.push('## Faça agora', '');
      area.faca_agora.forEach((f, i) => {
        const mats = (f.acoes || []).filter((x) => x.startsWith('baixar:')).map((x) => x.slice(7));
        md.push(`${i + 1}. **${f.titulo}.** ${f.texto}${mats.length ? ` Material: ${mats.join(', ')}.` : ''}`);
      });
      md.push('');
    }
    const mats = [];
    for (const rel of MATERIAIS[a.codigo] || []) {
      const origem = join(KIT, rel);
      if (!existsSync(origem)) { console.error(`Falta o material ${rel} da aula ${a.codigo}`); process.exit(1); }
      if (statSync(origem).isDirectory()) { zipar(origem, join(destino, `${basename(rel)}.zip`)); mats.push(`${basename(rel)}.zip`); }
      else { copyFileSync(origem, join(destino, basename(rel))); mats.push(basename(rel)); }
    }
    if (mats.length) md.push('## Materiais desta aula', '', ...mats.map((x) => `- ${x}`), '');
    writeFileSync(join(destino, `${a.codigo} Resumo.md`), md.join('\n'));
    lista.push(`  ${nome} (${minutos(tempos.total || 0)})`);
  }
}
const bonus = join(RAIZ_DRIVE, 'Bônus');
mkdirSync(bonus, { recursive: true });
copyFileSync(BONUS_ZIP, join(bonus, 'Modelos-Prontos.zip'));

writeFileSync(join(comece, 'LEIA-ME.txt'), [
  'Posts automáticos com Claude',
  'Do zero ao post pronto, bonito e no seu estilo.',
  '',
  'Como usar esta pasta',
  '1. Veja a "Apresentação do curso" e baixe o Posts-Automaticos-Kit.zip. Descompacte e guarde a pasta em Documentos.',
  '2. Siga as aulas na ordem. Cada aula tem a sua pasta com o vídeo, a legenda (.srt), o resumo com o "faça agora" e os materiais.',
  '3. A legenda abre sozinha no VLC quando o .srt fica na mesma pasta do vídeo, com o mesmo nome.',
  '4. O bônus "Modelos prontos" fica na pasta Bônus.',
  '',
  'Aulas',
  ...lista,
  '',
].join('\r\n'));

console.log(`árvore do Drive em ${RAIZ_DRIVE}`);

// ------------------------------------------------------------ Vídeos com Claude (versão 4)
// Tudo dos arquivos (scripts/videos-v4.mjs): o banco ainda tem as 7 aulas antigas até a troca.
async function videos() {
  const v4 = await import('./videos-v4.mjs');
  const { aulas: lista4, modulos: mods } = v4.lerCurso();
  const leg = join(LEG, 'videos-com-claude');
  mkdirSync(leg, { recursive: true });
  for (const a of lista4) writeFileSync(join(leg, `aula-${a.codigo}.srt`), srtDe(a.falas));
  console.log(`legendas: ${lista4.length} aulas em ${leg}`);
  if (!process.argv.includes('--drive')) return;

  for (const arq of [v4.KIT_ZIP, ...lista4.map((a) => a.mp4 || join(v4.VIDEOS, `aula-${a.codigo}.mp4`))]) if (!existsSync(arq)) { console.error(`Falta ${arq}`); process.exit(1); }
  const raizDrive = join(SAIDA, 'Vídeos com Claude');
  // Nome de pasta e de arquivo sem os caracteres que o Windows não aceita ("Motion: o Reels" vira "Motion, o Reels").
  const nomeDeArquivo = (t) => t.replace(/:\s*/g, ', ').replace(/[<>"/\\|?*]/g, '').trim();
  const duracaoTxt = (s) => `${Math.floor(s / 60)} min ${String(Math.round(s) % 60).padStart(2, '0')} s`;
  rmSync(raizDrive, { recursive: true, force: true });
  const comece = join(raizDrive, '00 Comece aqui');
  mkdirSync(comece, { recursive: true });
  copyFileSync(v4.KIT_ZIP, join(comece, basename(v4.KIT_ZIP)));

  const indice = [];
  let arquivos = 1;
  for (const m of mods) {
    indice.push(pastaModulo({ numero: m.numero, titulo: nomeDeArquivo(m.titulo) }));
    for (const a of lista4.filter((x) => x.modulo.numero === m.numero)) {
      const nome = `${a.codigo} ${nomeDeArquivo(a.titulo)}`;
      const destino = join(raizDrive, pastaModulo({ numero: m.numero, titulo: nomeDeArquivo(m.titulo) }), nome);
      mkdirSync(destino, { recursive: true });
      ligar(a.mp4, join(destino, `${nome}.mp4`));
      copyFileSync(join(leg, `aula-${a.codigo}.srt`), join(destino, `${nome}.srt`));
      arquivos += 2;

      const md = [`# Aula ${a.codigo}. ${a.titulo}`, '', `Módulo ${m.numero}: ${m.titulo}. Duração: ${duracaoTxt(a.duracao)}.`, ''];
      if (a.area.resumo) md.push('## Resumo', '', a.area.resumo, '');
      if (a.area.marcadores.length) md.push('## Marcadores', '', ...a.area.marcadores.map((x) => `- ${mmss(x.s)} ${x.titulo}`), '');
      if (a.area.faca_agora.length) {
        md.push('## Faça agora', '');
        a.area.faca_agora.forEach((f, i) => md.push(`${i + 1}. **${f.titulo}.**${f.texto ? ` ${f.texto}` : ''}`));
        md.push('');
      }
      const mats = [];
      for (const rel of v4.materialNoKit(a.material)) {
        const origem = join(v4.KIT, rel);
        if (statSync(origem).isDirectory()) { zipar(origem, join(destino, `${basename(rel)}.zip`)); mats.push(`${basename(rel)}.zip`); }
        else { copyFileSync(origem, join(destino, basename(rel))); mats.push(basename(rel)); }
        arquivos++;
      }
      if (mats.length) md.push('## Materiais desta aula', '', ...mats.map((x) => `- ${x}`), '', 'Os mesmos arquivos estão no kit, que fica na pasta 00 Comece aqui.', '');
      writeFileSync(join(destino, `${a.codigo} Resumo.md`), md.join('\n'));
      arquivos++;
      indice.push(`  ${nome} (${duracaoTxt(a.duracao)})`);
    }
  }

  writeFileSync(join(comece, 'LEIA-ME.txt'), [
    'Vídeos com Claude',
    'Editar o vídeo gravado, motion, economizar tokens e aprender com o YouTube e o Instagram pelo Claude in Chrome.',
    '',
    'Como usar esta pasta',
    `1. Baixe o ${basename(v4.KIT_ZIP)}. Descompacte, guarde a pasta Video-com-Claude em Documentos e abra ela no Claude (aba Code).`,
    '2. Siga as aulas na ordem. Cada aula tem a sua pasta com o vídeo, a legenda (.srt), o resumo com o "faça agora" e os materiais.',
    '3. A legenda abre sozinha no VLC quando o .srt fica na mesma pasta do vídeo, com o mesmo nome.',
    '4. Os pedidos de todas as aulas, prontos para copiar, estão no PEDIDOS.md, dentro do kit.',
    '',
    'Aulas',
    ...indice,
    '',
  ].join('\r\n'));
  console.log(`árvore do Drive em ${raizDrive} (${arquivos + 1} arquivos; nada foi enviado ao Drive)`);
}

// ------------------------------------------------------------ Posts on Autopilot with Claude (o curso em inglês)
async function autopilot() {
  const SLUG_EN = 'posts-on-autopilot';
  const AULAS = join(CURSO, 'aulas-en');
  const VIDEOS = join(CURSO, 'videos-en');
  const KIT_EN = join(CURSO, 'kit-en');
  const leg = join(LEG, SLUG_EN);
  const modulos = await sql(`select m.numero, m.titulo from modulos m join cursos c on c.id = m.curso_id where c.slug = '${SLUG_EN}' order by m.numero`);
  const aulas = await sql(`select a.codigo, a.titulo, m.numero as modulo from aulas a join modulos m on m.id = a.modulo_id join cursos c on c.id = a.curso_id where c.slug = '${SLUG_EN}' and a.status = 'publicado' order by a.ordem`);
  mkdirSync(leg, { recursive: true });
  for (const a of aulas) writeFileSync(join(leg, `aula-${a.codigo}.srt`), srt(join(AULAS, a.codigo)));
  writeFileSync(join(leg, 'aula-vsl.srt'), srt(join(AULAS, 'vsl')));
  console.log(`subtitles: ${aulas.length} lessons and the VSL in ${leg}`);
  if (!process.argv.includes('--drive')) return;

  // Os mesmos materiais do curso em português, com os nomes do kit em inglês.
  const MATERIAIS = {
    '1.1': ['00-READ-ME-FIRST.md'], '1.2': ['screen-guide.md'], '1.3': ['01-start-here.md'], '1.4': ['02-grant-access.md'],
    '2.1': ['03-my-style.md'], '2.2': [], '2.3': ['correction-examples.md', 'skills/my-style'],
    '3.1': ['04-radar.md', 'skills/radar'], '3.2': ['05-board.md'], '3.3': ['06-daily-posts.md', 'skills/daily-posts'],
    '4.1': ['07-design.md', 'template', 'tools/export.mjs'], '4.2': ['skills/high-end-design'],
    '4.3': ['design-lessons.md'], '4.4': ['how-to-give-feedback.md'],
    '5.1': ['08-nano-banana.md', 'tools/generate-image.mjs'], '5.2': ['09-magnific.md'],
    '6.1': ['10-routine.md'], '6.2': ['ERRORS-AND-FIXES.md'],
  };
  const KIT_ZIP = join(raiz, '_local', 'area-semente-en', 'Posts-on-Autopilot-Kit.zip');
  const RAIZ = join(SAIDA, 'Posts on Autopilot with Claude');
  for (const arq of [KIT_ZIP, join(VIDEOS, 'aula-vsl.mp4')]) if (!existsSync(arq)) { console.error(`Falta ${arq}`); process.exit(1); }
  rmSync(RAIZ, { recursive: true, force: true });
  const comece = join(RAIZ, '00 Start here');
  mkdirSync(comece, { recursive: true });
  ligar(join(VIDEOS, 'aula-vsl.mp4'), join(comece, 'Course intro.mp4'));
  copyFileSync(join(leg, 'aula-vsl.srt'), join(comece, 'Course intro.srt'));
  copyFileSync(KIT_ZIP, join(comece, 'Posts-on-Autopilot-Kit.zip'));
  const nomeDe = (t) => t.replace(/:\s*/g, ', ').replace(/[<>"/\\|?*]/g, '').trim();
  const lista = [];
  const faltando = [];
  for (const m of modulos) {
    const pm = pastaModulo({ numero: m.numero, titulo: nomeDe(m.titulo) });
    lista.push(pm);
    for (const a of aulas.filter((x) => x.modulo === m.numero)) {
      const pasta = join(AULAS, a.codigo);
      const nome = `${a.codigo} ${nomeDe(a.titulo)}`;
      const destino = join(RAIZ, pm, nome);
      mkdirSync(destino, { recursive: true });
      const tempos = lerJson(join(pasta, 'audio', 'tempos.json')) || {};
      ligar(join(VIDEOS, `aula-${a.codigo}.mp4`), join(destino, `${nome}.mp4`));
      copyFileSync(join(leg, `aula-${a.codigo}.srt`), join(destino, `${nome}.srt`));
      const area = lerJson(join(pasta, 'area.json')) || {};
      const md = [`# ${nome}`, '', `Module ${m.numero}: ${m.titulo}. Length: ${minutos(tempos.total || 0)}.`, ''];
      if (area.resumo) md.push('## Summary', '', area.resumo, '');
      if (area.marcadores?.length) md.push('## Chapters', '', ...area.marcadores.map((x) => `- ${mmss(x.s)} ${x.titulo}`), '');
      if (area.faca_agora?.length) {
        md.push('## Do it now', '');
        area.faca_agora.forEach((f, i) => {
          const mats = (f.acoes || []).filter((x) => x.startsWith('baixar:')).map((x) => x.slice(7));
          md.push(`${i + 1}. **${f.titulo}.** ${f.texto}${mats.length ? ` File: ${mats.join(', ')}.` : ''}`);
        });
        md.push('');
      }
      const mats = [];
      for (const rel of MATERIAIS[a.codigo] || []) {
        const origem = join(KIT_EN, rel);
        if (!existsSync(origem)) { faltando.push(`${a.codigo}: ${rel}`); continue; }
        if (statSync(origem).isDirectory()) { zipar(origem, join(destino, `${basename(rel)}.zip`)); mats.push(`${basename(rel)}.zip`); }
        else { copyFileSync(origem, join(destino, basename(rel))); mats.push(basename(rel)); }
      }
      if (mats.length) md.push('## Files for this lesson', '', ...mats.map((x) => `- ${x}`), '');
      writeFileSync(join(destino, `${a.codigo} Summary.md`), md.join('\n'));
      lista.push(`  ${nome} (${minutos(tempos.total || 0)})`);
    }
  }
  writeFileSync(join(comece, 'READ-ME.txt'), [
    'Posts on Autopilot with Claude',
    'From zero to a finished post, in your own style.',
    '',
    'How to use this folder',
    '1. Watch the "Course intro" and download Posts-on-Autopilot-Kit.zip. Unzip it and keep the folder in Documents.',
    '2. Follow the lessons in order. Each lesson has its own folder with the video, the subtitles (.srt), the summary with "do it now" and the files.',
    '3. Subtitles open automatically in VLC when the .srt is in the same folder as the video, with the same name.',
    '',
    'Lessons',
    ...lista,
    '',
  ].join('\r\n'));
  console.log(`árvore do Drive em ${RAIZ}`);
  if (faltando.length) console.log(`MATERIAIS NÃO ACHADOS: ${faltando.join(' | ')}`);
}
