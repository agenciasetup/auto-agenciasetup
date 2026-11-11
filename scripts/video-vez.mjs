// A vez do vídeo: o que a tarefa agendada "video-do-roteiro" (todo dia às 14h, no Windows) faz agora. SÓ LÊ o banco.
// Acha o roteiro aprovado mais antigo que ainda não virou vídeo, confere contra as regras de hoje (a mesma conferência
// da Roteirista, com o preço e as palavras ligadas de agora), conta quantos vídeos saíram nos últimos 7 dias, vê se a
// placa de vídeo está livre e sugere a música e o número do próximo Reel. Imprime um JSON curto (sem dado de cliente).
//   node scripts/video-vez.mjs                      o que fazer agora
//   node scripts/video-vez.mjs --travar <cartao>    marca a placa como ocupada por esta produção (_local/video/produzindo.json)
//   node scripts/video-vez.mjs --soltar             tira a marca
//   node scripts/video-vez.mjs --musica <arquivo.mp3> --reel <n> --inicio <segundos>   anota a faixa que o vídeo usou
//   node scripts/video-vez.mjs --local              só a placa, a música e o número do Reel (sem banco)
//   node scripts/video-vez.mjs --cartao <id>        ensaio: confere um cartão da Roteirista em qualquer estado
// Regras do dono (10/11/2026): 1 vídeo por rodada, no máximo 5 em 7 dias; a trava do limite semanal do Claude (80%) é
// a tarefa que confere, porque só ela lê o uso do plano. Roteiro que esbarra numa regra não é produzido: a tarefa
// avisa o dono e marca o cartão como "espera você" (turno com dados.proposta e dados.desfecho = espera_dono).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { env, exige, raiz } from './env.mjs';

const TETO_SEMANA = 5;
const MARCA_VELHA = 6 * 3600_000; // marca de produção mais velha que isso é de uma rodada que caiu: não segura a placa
const PLACA_CHEIA = 60; // % de uso da placa de vídeo que conta como ocupada
const SEM_REPETIR = 3; // a música não repete a de nenhum dos últimos 3 vídeos
const DIA = 86_400_000;

const args = process.argv.slice(2);
const valor = (nome) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined; };
const pastaLocal = join(raiz, '_local', 'video');
const arqMarca = join(pastaLocal, 'produzindo.json');
const estudio = join(raiz, 'Curso-Videos', 'estudio');
const pastaMusicas = join(estudio, 'musicas', 'pixabay');
const arqUso = join(pastaMusicas, 'uso.json');
const lerJson = (arq, padrao) => { try { return JSON.parse(readFileSync(arq, 'utf8').replace(/^﻿/, '')); } catch { return padrao; } };
const sair = (o) => { console.log(JSON.stringify(o, null, 1)); process.exit(0); };

// O que já se sabia em 10/11/2026 (skill video-agenciasetup e musicas/pixabay/LICENCA.md), para o rodízio começar certo.
const USO_INICIAL = [
  { faixa: 'kulakovka-lofi-upbeat-611601.mp3', reel: 32, inicio: 2.3 },
  { faixa: 'kulakovka-upbeat-funk-614901.mp3', reel: 33, inicio: 47.7 },
  { faixa: 'kulakovka-upbeat-funk-614901.mp3', reel: 41, inicio: null },
  { faixa: 'the_mountain-energetic-upbeat-567417.mp3', reel: 42, inicio: null },
  { faixa: 'folk_tales-upbeat-good-morning-566531.mp3', reel: 43, inicio: null },
];
const lerUso = () => { const u = lerJson(arqUso, null); return Array.isArray(u) ? u : USO_INICIAL; };

// ---------------------------------------------------------------- as marcas locais (sem banco)
if (args.includes('--travar')) {
  const cartao = valor('--travar');
  if (!cartao) { console.error('uso: --travar <id do cartão>'); process.exit(1); }
  mkdirSync(pastaLocal, { recursive: true });
  writeFileSync(arqMarca, JSON.stringify({ cartao, inicio: new Date().toISOString(), pid: process.ppid }, null, 1));
  sair({ travado: true, cartao });
}
if (args.includes('--soltar')) {
  if (existsSync(arqMarca)) rmSync(arqMarca);
  sair({ solto: true });
}
if (args.includes('--musica')) {
  const faixa = valor('--musica');
  const reel = Number(valor('--reel'));
  if (!faixa || !existsSync(join(pastaMusicas, faixa)) || !reel) { console.error('uso: --musica <arquivo.mp3 de musicas/pixabay> --reel <n> --inicio <s>'); process.exit(1); }
  const uso = lerUso().filter((u) => u.reel !== reel);
  uso.push({ faixa, reel, inicio: Number(valor('--inicio')) || null, em: new Date().toISOString().slice(0, 10) });
  writeFileSync(arqUso, JSON.stringify(uso.sort((a, b) => a.reel - b.reel), null, 1));
  sair({ anotado: true, faixa, reel });
}

// ---------------------------------------------------------------- a placa de vídeo
function placa() {
  const motivos = [];
  const marca = lerJson(arqMarca, null);
  if (marca && marca.inicio && Date.now() - Date.parse(marca.inicio) < MARCA_VELHA) motivos.push(`outra produção marcada desde ${marca.inicio} (cartão ${marca.cartao})`);
  // Programas que usam a placa no nosso trabalho: a voz (OmniVoice e Whisper), o render e o ffmpeg do estúdio, o
  // recorte e o tratamento de fotos. Lê a linha de comando de cada um, sem imprimir nada dela.
  try {
    const saida = execFileSync('powershell', ['-NoProfile', '-Command',
      "Get-CimInstance Win32_Process -Filter \"Name='python.exe' or Name='ffmpeg.exe' or Name='node.exe'\" | ForEach-Object { $_.Name + ' ' + $_.CommandLine }"], { encoding: 'utf8', timeout: 30_000 });
    const pesados = saida.split(/\r?\n/).filter((l) => /^ffmpeg\.exe|Curso-Videos|_ferramentas[\\/]voz|tomadas\.py|recortar|tratar\.mjs|iopaint|realesrgan|lama/i.test(l) && !/video-vez\.mjs/i.test(l));
    if (pesados.length) motivos.push(`${pesados.length} programa(s) de vídeo, voz ou foto rodando (${[...new Set(pesados.map((l) => l.split(' ')[0]))].join(', ')})`);
  } catch (e) { motivos.push(`não consegui ler os programas abertos (${String(e.message).slice(0, 80)})`); }
  try {
    const uso = Number(execFileSync('nvidia-smi', ['--query-gpu=utilization.gpu', '--format=csv,noheader,nounits'], { encoding: 'utf8', timeout: 15_000 }).trim().split(/\r?\n/)[0]);
    if (uso >= PLACA_CHEIA) motivos.push(`a placa está com ${uso}% de uso`);
  } catch { /* sem nvidia-smi: fica só com as outras conferências */ }
  return { ocupada: motivos.length > 0, motivos };
}

// ---------------------------------------------------------------- música e número do Reel
function musica() {
  const faixas = existsSync(pastaMusicas) ? readdirSync(pastaMusicas).filter((f) => f.toLowerCase().endsWith('.mp3')) : [];
  const uso = lerUso().sort((a, b) => a.reel - b.reel);
  const recentes = new Set(uso.slice(-SEM_REPETIR).map((u) => u.faixa));
  const ultimoReel = (f) => Math.max(0, ...uso.filter((u) => u.faixa === f).map((u) => u.reel));
  const livres = faixas.filter((f) => !recentes.has(f)).sort((a, b) => ultimoReel(a) - ultimoReel(b));
  const escolha = livres[0] || null;
  return {
    faixa: escolha,
    trechos_ja_usados: escolha ? uso.filter((u) => u.faixa === escolha).map((u) => u.inicio).filter((x) => x != null) : [],
    nunca_usadas: faixas.filter((f) => !uso.some((u) => u.faixa === f)),
    ultimas: uso.slice(-SEM_REPETIR).map((u) => `Reel ${u.reel}: ${u.faixa}`),
  };
}
function proximoReel() {
  const n = [];
  const pastas = join(estudio, 'videos');
  if (existsSync(pastas)) for (const d of readdirSync(pastas)) { const m = d.match(/^pt-reel-(\d+)$/); if (m) n.push(Number(m[1])); }
  const prontos = join(raiz, 'Curso-Videos', 'videos-pt');
  if (existsSync(prontos)) for (const f of readdirSync(prontos)) { const m = f.match(/^reel-(\d+)\.mp4$/); if (m) n.push(Number(m[1])); }
  return n.length ? Math.max(...n) + 1 : 1;
}

if (args.includes('--local')) sair({ placa: placa(), musica: musica(), reel: proximoReel() });

// ---------------------------------------------------------------- o banco (só leitura)
exige('SUPABASE_URL', 'SUPABASE_SECRET_KEY');
const banco = new URL(env.SUPABASE_URL).origin;
const buscar = globalThis.fetch;
globalThis.fetch = (alvo, opcoes = {}) => {
  const u = new URL(typeof alvo === 'string' ? alvo : alvo.url);
  const metodo = String(opcoes.method || 'GET').toUpperCase();
  if (!(u.origin === banco && metodo === 'GET')) throw new Error(`Barrado pela trava de leitura: ${metodo} ${u.origin === banco ? u.pathname : u.origin}`);
  return buscar(alvo, opcoes);
};
const de = (p) => import(pathToFileURL(join(raiz, p)).href);
const { db } = await de('worker/nucleo/db.js');
const { lerAndamentos } = await de('worker/lib/escritorio.js');
const { conferirRoteiro } = await de('worker/lib/agentes/roteirista.js');
const { ofertaComPreco } = await de('worker/lib/conteudo.js');
const e = { SUPABASE_URL: env.SUPABASE_URL, SUPABASE_SECRET_KEY: env.SUPABASE_SECRET_KEY, AMBIENTE: 'local' };

const agora = Date.now();
const ensaio = valor('--cartao');
if (ensaio !== undefined && !/^[0-9a-f-]{36}$/i.test(ensaio)) { console.error('uso: --cartao <id do cartão>'); process.exit(1); }
const [aprovadas, feitas, gatilhos, oferta] = await Promise.all([
  db.select(e, 'propostas', { filtros: ensaio ? { id: `eq.${ensaio}`, agente_id: 'eq.roteirista' } : { agente_id: 'eq.roteirista', status: 'eq.aprovada' }, select: 'id,titulo,links,decidida_em,criado_em', ordem: 'decidida_em.asc', limite: 50 }),
  db.select(e, 'propostas', { filtros: { agente_id: 'eq.roteirista', status: 'eq.feita', feita_em: `gte.${new Date(agora - 7 * DIA).toISOString()}` }, select: 'id,feita_em', limite: 50 }),
  db.select(e, 'gatilhos', { filtros: { perfil: 'eq.br', ativo: 'eq.true', rede: 'eq.instagram' }, select: 'palavra', limite: 200 }),
  ofertaComPreco(e),
]);
const andamentos = ensaio ? {} : await lerAndamentos(e, aprovadas, agora);
const palavras = [...new Set(gatilhos.map((g) => String(g.palavra || '').trim().toUpperCase()).filter((p) => p && !/^TESTE/.test(p)))].map((palavra) => ({ palavra }));
const preco = oferta && oferta.venda && oferta.venda.preco_centavos ? `R$ ${(Number(oferta.venda.preco_centavos) / 100).toFixed(2).replace('.', ',')}` : null;

// O id do Short que inspirou o roteiro está no link do cartão (cartaoDe em roteirista.js).
const shortDe = (p) => { for (const l of Array.isArray(p.links) ? p.links : []) { const m = String((l && l.url) || '').match(/shorts\/([A-Za-z0-9_-]{6,20})/); if (m) return m[1]; } return null; };
const ids = aprovadas.map(shortDe).filter(Boolean);
const virais = ids.length ? await db.select(e, 'videos_virais', { filtros: { video_id: `in.(${ids.join(',')})` }, select: 'video_id,canal,idioma,titulo,views,vezes,por_dia,status,leitura', limite: 50 }) : [];

const pulados = [];
const travados = [];
let escolhido = null;
for (const p of aprovadas) {
  const a = andamentos[p.id];
  const cartao = { id: p.id, titulo: p.titulo, aprovado_em: p.decidida_em };
  if (a && a.estado === 'espera_dono') { pulados.push({ ...cartao, motivo: `Espera o dono: ${a.nota}` }); continue; }
  if (a && a.estado === 'fazendo') { pulados.push({ ...cartao, motivo: 'Uma rodada está produzindo este agora.' }); continue; }
  if (a && (a.estado === 'feito' || a.estado === 'falta_publicar')) { pulados.push({ ...cartao, motivo: 'Já produzido: falta anotar o resultado no cartão.' }); continue; }
  if (a && a.tentativas >= 2) { pulados.push({ ...cartao, motivo: `Tentou ${a.tentativas} vezes e não conseguiu. Espera o dono.` }); continue; }
  if (a && a.hoje) { pulados.push({ ...cartao, motivo: 'Já teve uma tentativa hoje.' }); continue; }
  const id = shortDe(p);
  const v = virais.find((x) => x.video_id === id);
  const roteiro = v && v.leitura && v.leitura.roteiro;
  if (!roteiro) { travados.push({ ...cartao, motivo: 'O roteiro inteiro não está guardado no viral do cartão (videos_virais.leitura.roteiro).' }); continue; }
  const conferido = conferirRoteiro({ ...roteiro, viral: v.video_id, vende: '' }, { virais: [v], palavras, preco });
  if (typeof conferido === 'string') { travados.push({ ...cartao, short: v.video_id, motivo: conferido }); continue; }
  if (!escolhido) escolhido = { cartao, short: v.video_id, viral: { titulo: v.titulo, canal: v.canal, views: v.views, vezes: v.vezes, padrao: v.leitura.padrao || null }, roteiro: { formato: roteiro.formato, gancho: roteiro.gancho, falas: roteiro.falas, tela: roteiro.tela, palavra: String(roteiro.palavra).toUpperCase(), segundos: roteiro.segundos } };
}

const semana = { feitos_7_dias: feitas.length, teto: TETO_SEMANA };
const p = escolhido ? placa() : null;
let vez = 'nada';
let motivo = aprovadas.length ? 'Nenhum roteiro aprovado pode ser produzido agora.' : 'Nenhum roteiro aprovado esperando vídeo.';
if (escolhido && feitas.length >= TETO_SEMANA) { vez = 'teto'; motivo = `Já saíram ${feitas.length} vídeos nos últimos 7 dias (teto ${TETO_SEMANA}).`; }
else if (escolhido && p.ocupada) { vez = 'ocupada'; motivo = `A placa de vídeo está ocupada: ${p.motivos.join('; ')}.`; }
else if (escolhido) { vez = 'produzir'; motivo = `Produzir o roteiro "${escolhido.roteiro.gancho}" (palavra ${escolhido.roteiro.palavra}).`; }

sair({
  ...(ensaio ? { ensaio: 'só conferência de um cartão: não produza a partir daqui' } : {}),
  vez, motivo, semana, preco_de_hoje: preco, palavras_ligadas: palavras.map((x) => x.palavra),
  ...(vez === 'produzir' ? { ...escolhido, reel: proximoReel(), musica: musica() } : { proximo: escolhido ? escolhido.cartao : null }),
  travados, pulados, placa: p,
});
