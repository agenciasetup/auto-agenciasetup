// As 12 aulas da versão 4 do "Vídeos com Claude", lidas só dos arquivos (nunca do banco e nunca escreve nada).
// Usado pelo area-semente-videos.mjs (a área de membros) e pelo legendas-srt.mjs --curso videos-com-claude (.srt e Drive).
//   Curso-Videos/aulas4/<n>/roteiro.md                título, módulo, as 6 partes, a fala escrita, resumo, "Faça agora", material
//   Curso-Videos/videos4/aula-<n>.mp4                 a duração real
//   Curso-Videos/estudio/videos/v4-aula-<n>/audio/    falas.json e tempos.json (tempos-final.json nas aulas com trecho)
//   Curso-Videos/estudio/videos/v4-aula-<n>/trechos.json   trechos de aulas antigas emendados (aulas 1, 4 e 10)
//   Curso-Videos/aulas4/<n>/area.json (opcional)      marcadores, resumo e faca_agora escritos à mão, como no curso de posts
// A legenda usa a fala escrita no roteiro: o falas.json tem a grafia da voz ("môuchon", "éfe éfe émpeg").
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { raiz } from './env.mjs';

export const PASTA = join(raiz, 'Curso-Videos');
export const ROTEIROS = join(PASTA, 'aulas4');
export const VIDEOS = join(PASTA, 'videos4');
export const ESTUDIO = join(PASTA, 'estudio', 'videos');
export const KIT = join(PASTA, 'kit');
export const KIT_ZIP = join(PASTA, 'Video-com-Claude-Kit.zip');
export const NUMEROS = Array.from({ length: 12 }, (_, i) => i + 1);
// O inglês ("Videos with Claude"): roteiros em aulas-en/, vídeos em videos-en/, estúdio em en-aula-<n>, sem trechos emendados.
export const KIT_EN = join(PASTA, 'kit-en');
export const KIT_ZIP_EN = join(PASTA, 'Videos-with-Claude-Kit.zip');
const LUGAR = {
  pt: { roteiros: ROTEIROS, videos: VIDEOS, estudio: 'v4-aula-' },
  en: { roteiros: join(PASTA, 'aulas-en'), videos: join(PASTA, 'videos-en'), estudio: 'en-aula-' },
};

const lerJson = (arq) => (existsSync(arq) ? JSON.parse(readFileSync(arq, 'utf8').replace(/^﻿/, '')) : null);
const limpo = (t) => String(t).replace(/`/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
const segundos = (arq) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq]).toString().trim());

// ------------------------------------------------------------ roteiro
// As falas são linhas "**a1.** "texto"". Trecho reaproveitado é "**b0.** (sem fala nova) Trecho de ...", na parte onde entra.
export function lerRoteiro(arq) {
  if (!existsSync(arq)) throw new Error(`Falta ${arq}`);
  const txt = readFileSync(arq, 'utf8').replace(/^﻿/, '');
  const titulo = (txt.match(/^#\s*(?:Aula|Lesson)\s+\d+\.\s*(.+?)\s*$/m) || [])[1];
  const mod = txt.match(/^- \*\*(?:Módulo|Module):\*\*\s*(\d+)\.\s*(.+?)\s*$/m);
  const fim = (txt.match(/^- \*\*No fim da aula, você:\*\*\s*(.+?)\s*$/m) || [])[1];
  const fimEn = (txt.match(/^- \*\*By the end of the lesson, you:\*\*\s*(.+?)\s*$/m) || [])[1];
  const material = (txt.match(/^- \*\*Material:\*\*\s*(.+?)\s*$/m) || [])[1] || '';
  const partes = [];
  const falas = {};
  const parteDe = {};
  const trechos = [];
  const faca = [];
  let atual = 0;
  let naFaca = false;
  for (const linha of txt.split(/\r?\n/)) {
    const p = linha.match(/^##\s+(\d+)\.\s+(.+?)\s*$/);
    if (p) { atual = Number(p[1]); partes.push({ n: atual, titulo: p[2] }); naFaca = false; continue; }
    if (/^##\s/.test(linha)) { naFaca = /^##\s+(?:Faça agora|Do it now)\s*$/.test(linha); continue; }
    if (naFaca) { const i = linha.match(/^\d+\.\s+(.+)$/); if (i) faca.push(limpo(i[1])); continue; }
    const f = linha.match(/^\*\*([a-z]\d+[a-z]?)\.\*\*\s*(.*)$/);
    if (!f || !atual) continue;
    if (/^\(sem fala nova\)/.test(f[2])) trechos.push({ id: f[1], parte: atual });
    else { const q = f[2].match(/^"(.+)"\s*$/); if (q) { falas[f[1]] = limpo(q[1]); parteDe[f[1]] = atual; } }
  }
  if (!titulo) throw new Error(`Sem título em ${arq} (esperava "# Aula N. Título")`);
  if (!mod) throw new Error(`Sem módulo em ${arq} (esperava "- **Módulo:** N. Nome")`);
  return {
    titulo, modulo: { numero: Number(mod[1]), titulo: mod[2] }, partes, falas, parteDe, trechos,
    resumo: fim ? `No fim da aula, você ${limpo(fim)}` : fimEn ? `By the end of the lesson, you ${limpo(fimEn)}` : null,
    // Cada item vira um passo: a primeira frase é o título, o resto é o texto.
    faca_agora: faca.map((item) => {
      const m = item.match(/^(.+?[.!?])\s+(\S.*)$/);
      const [t, resto] = m ? [m[1], m[2]] : [item, ''];
      return { titulo: t.replace(/\.$/, ''), texto: resto, acoes: [] };
    }),
    material: [...material.matchAll(/`([^`]+)`/g)].map((m) => m[1]),
  };
}

// ------------------------------------------------------------ falas com o tempo do vídeo final
// O vídeo das aulas 1, 4 e 10 tem trechos emendados (Curso-Videos/emendar-v4.mjs). Os tempos das falas novas no vídeo
// emendado estão no tempos-final.json; os do trecho saem da aula antiga, deslocados pela mesma conta do emendar-v4.mjs.
const X = 0.3, FPS = 30, PAD = 0.4;
const q = (t) => Math.round(t * FPS) / FPS;
function roteiroAntigo(origem) {
  const m = String(origem).match(/^v(\d+)-aula-(\d+)$/);
  const arq = m ? join(PASTA, `aulas${m[1]}`, m[2], 'roteiro.md') : null;
  return arq && existsSync(arq) ? lerRoteiro(arq).falas : {};
}
function posicoesDosTrechos(trechos, base) {
  let desl = 0;
  return trechos.map((t, i) => {
    const de = q(t.de), ate = q(t.ate), dur = q(ate - de + PAD);
    const T = base.falas[t.antes];
    if (!T) throw new Error(`a fala ${t.antes} do trechos.json não está no tempos.json`);
    const noComeco = i === 0 && T.inicio - 0.95 < 0.5;
    const corteA = noComeco ? X : q(T.inicio - 0.95);
    const corteB = q(Math.max(0, T.inicio - 0.4));
    const inicio = noComeco ? 0 : corteA + desl - X;
    desl += dur - 2 * X - (corteB - corteA);
    return { ...t, de, ate, dur, inicio };
  });
}

// [{ id, inicio, fim, texto, parte }] em segundos do MP4 de videos4/, na ordem.
export function falasDaAula(n, rot = lerRoteiro(join(ROTEIROS, String(n), 'roteiro.md')), idioma = 'pt') {
  const pasta = join(ESTUDIO, `${LUGAR[idioma].estudio}${n}`);
  const voz = lerJson(join(pasta, 'audio', 'falas.json')) || [];
  const base = lerJson(join(pasta, 'audio', 'tempos.json'));
  const final = lerJson(join(pasta, 'audio', 'tempos-final.json'));
  const trechos = lerJson(join(pasta, 'trechos.json')) || [];
  if (!base && idioma !== 'pt') return []; // aula em inglês ainda não narrada
  if (!base) throw new Error(`Falta ${join(pasta, 'audio', 'tempos.json')}`);
  if (trechos.length && !final) throw new Error(`A aula ${n} tem trechos e falta o tempos-final.json`);
  const tempos = (trechos.length ? final : base).falas;
  const lista = voz.filter((f) => tempos[f.id]).map((f) => ({
    id: f.id, inicio: tempos[f.id].inicio, fim: tempos[f.id].fim, texto: rot.falas[f.id] || limpo(f.texto), parte: rot.parteDe[f.id] || 0,
  }));
  posicoesDosTrechos(trechos, base).forEach((t, i) => {
    const op = join(ESTUDIO, t.origem, 'audio');
    const vozAntiga = lerJson(join(op, 'falas.json')) || [];
    const temposAntigos = (lerJson(join(op, 'tempos.json')) || {}).falas || {};
    const escrito = roteiroAntigo(t.origem);
    const parte = (rot.trechos[i] || {}).parte || rot.parteDe[t.antes] || 0;
    let primeira = true;
    for (const f of vozAntiga) {
      const tt = temposAntigos[f.id];
      if (!tt) continue;
      const a = Math.max(tt.inicio, t.de), b = Math.min(tt.fim, t.ate);
      // Entra a fala que está no trecho (pelo menos 60% dela); o trecho foi cortado no fim de uma fala.
      if (b - a < 0.6 * (tt.fim - tt.inicio)) continue;
      lista.push({ id: `${t.origem}:${f.id}`, inicio: +(t.inicio + a - t.de).toFixed(3), fim: +(t.inicio + b - t.de).toFixed(3), texto: escrito[f.id] || limpo(f.texto), parte, trecho: i + 1, comecoTrecho: primeira ? t.inicio : undefined });
      primeira = false;
    }
  });
  return lista.sort((a, b) => a.inicio - b.inicio);
}

// ------------------------------------------------------------ a aula inteira
// Marcadores: uma parada no começo de cada uma das 6 partes do roteiro (a primeira no segundo 0).
function marcadoresDe(rot, falas) {
  const out = [];
  for (const p of rot.partes) {
    const daParte = falas.filter((f) => f.parte === p.n);
    if (!daParte.length) continue;
    const s = Math.floor(Math.min(...daParte.map((f) => f.comecoTrecho ?? f.inicio)));
    out.push({ s: out.length ? s : 0, titulo: p.titulo });
  }
  return out.filter((m, i) => i === 0 || m.s > out[i - 1].s);
}

export function lerAula(n, idioma = 'pt') {
  const pasta = join(LUGAR[idioma].roteiros, String(n));
  const rot = lerRoteiro(join(pasta, 'roteiro.md'));
  const falas = falasDaAula(n, rot, idioma);
  const mp4 = join(LUGAR[idioma].videos, `aula-${n}.mp4`);
  const duracao = existsSync(mp4) ? segundos(mp4) : null;
  const area = lerJson(join(pasta, 'area.json')) || {};
  return {
    n, codigo: String(n), titulo: rot.titulo, modulo: rot.modulo, mp4: existsSync(mp4) ? mp4 : null,
    duracao, duracao_s: duracao == null ? null : Math.round(duracao),
    falas, // com os segundos exatos, para o .srt
    area: {
      falas: falas.map((f) => ({ s: Math.floor(f.inicio), f: Math.ceil(f.fim), texto: f.texto })),
      marcadores: area.marcadores || marcadoresDe(rot, falas),
      resumo: area.resumo || rot.resumo,
      faca_agora: area.faca_agora || rot.faca_agora,
    },
    material: rot.material,
  };
}

export function lerCurso(idioma = 'pt') {
  const aulas = NUMEROS.map((n) => lerAula(n, idioma));
  const modulos = [];
  for (const a of aulas) {
    let m = modulos.find((x) => x.numero === a.modulo.numero);
    if (!m) modulos.push((m = { ...a.modulo, aulas: [] }));
    else if (m.titulo !== a.modulo.titulo) throw new Error(`Módulo ${m.numero} com dois nomes: "${m.titulo}" e "${a.modulo.titulo}" (aula ${a.n})`);
    m.aulas.push(a.n);
  }
  return { aulas, modulos: modulos.sort((a, b) => a.numero - b.numero) };
}

// ------------------------------------------------------------ material da aula no kit
// Os nomes entre crases da linha "Material" do roteiro que existem no kit (arquivo ou pasta). O que não está no kit
// (o PROJETO.md, que nasce no projeto do aluno; o aula.md, que o Claude escreve) fica de fora.
let todos = null;
function arquivosDoKit(pasta = KIT, rel = '') {
  const out = [];
  for (const nome of readdirSync(pasta)) {
    const r = rel ? `${rel}/${nome}` : nome;
    if (statSync(join(pasta, nome)).isDirectory()) out.push(...arquivosDoKit(join(pasta, nome), r));
    else out.push(r);
  }
  return out;
}
export function materialNoKit(itens) {
  todos = todos || arquivosDoKit();
  const out = [];
  for (const item of itens) {
    const rel = item.replace(/\/+$/, '');
    if (existsSync(join(KIT, rel))) { out.push(rel); continue; }
    const achados = todos.filter((r) => basename(r) === basename(rel));
    if (achados.length === 1) out.push(achados[0]);
  }
  // Sem repetir o que já vem dentro de uma pasta da lista (aula 12: a pasta editar e o exportar.mjs dela).
  return [...new Set(out)].filter((r, _, l) => !l.some((o) => o !== r && r.startsWith(`${o}/`)));
}
