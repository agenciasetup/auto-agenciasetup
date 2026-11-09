// O que ainda aparece em português no app do aluno em inglês? Lê aluno/src (menos o leitor), aplica aluno/en.json do
// mesmo jeito que o build (aluno/vite.config.en.ts) e lista os textos em português que o dicionário não cobriu: texto de
// JSX, strings, pedaços de strings com modelo (`...${x}...`) e valores de atributos.
//
//   node aluno/scripts/sobra-pt.mjs              lista o que sobrou (sai com erro se sobrou algo fora de FALSOS_POSITIVOS)
//   node aluno/scripts/sobra-pt.mjs --tudo       lista também os falsos positivos já conhecidos
//   node aluno/scripts/sobra-pt.mjs --esqueleto arquivo.txt
//                                                grava, sem usar o dicionário, todos os textos candidatos numerados (uma chave
//                                                por linha, no formato que o en.json usa), para montar ou conferir o dicionário
//
// Um texto "sobrou" quando continua igual ao do código original depois do dicionário e parece texto para ler: texto de JSX,
// ou string com acento, com frase, com maiúscula no começo. Palavra solta em minúscula (id de aba, rota, classe) não conta.
// Se o dicionário trocou o texto mas o inglês ainda tem palavras de português, aparece na lista "traduzido, mas com português".
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseAst } from 'vite';
import { RAIZ_ALUNO, aplicarPares, lerPares, traduzivel } from './en-aplicar.mjs';

// Textos que o scanner acha parecidos com português, mas que ficam como estão em inglês (marcas, siglas, valores técnicos).
// Cada item é o texto exato como o scanner mostra (sem as aspas).
const FALSOS_POSITIVOS = new Set([
  // iguais em inglês
  'Instagram', 'XP', 'PDF', 'Claude', 'Pix', 'LinkedIn', 'Setup', 'Asaas', 'Drive', 'Link', 'Skill', 'Tutor', 'Kit', 'CPF', 'downloads', '% off', 'x', 'min', 'min)',
  // os motivos do reembolso: o servidor só aceita o texto em português, o rótulo em inglês está em MOTIVOS_EN (Compras.tsx)
  'Não era o que eu esperava', 'Não tenho tempo para fazer agora', 'Tive problema para acessar ou usar', 'Comprei por engano', 'Outro motivo',
  // código e formatos técnicos (o arquivo de agenda .ics)
  'Escape', 'IntersectionObserver', 'UID:', 'DTSTAMP:', 'DTSTART:', 'DTEND:', 'SUMMARY:', 'DESCRIPTION:', 'URL:',
  '(max-width: 719px)', '(prefers-reduced-motion: reduce)', 'auto 1fr', 'noopener nofollow', 'destaque destaque-vazio', 'b-cartao b-trilha',
  'logo lt-marca', 'cartao compra', 'moldura sem', 'msg tutor', 'Bearer',
]);

const ACENTO = /[áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÉÈÊÍÓÒÔÕÚÙÛÇ]/;
// Palavras de gramática do português que não existem em inglês (sem "no", "as", "se", que existem).
const GRAMATICA = new Set(['de', 'da', 'das', 'dos', 'em', 'nos', 'nas', 'um', 'uma', 'ou', 'por', 'ao', 'aos', 'sem', 'com', 'para', 'pelo', 'pela', 'seu', 'sua', 'seus', 'suas', 'meu', 'minha', 'mais', 'mas', 'que', 'como', 'até', 'já', 'só', 'não', 'você', 'está', 'são', 'foi', 'ainda', 'quando', 'tudo', 'nada', 'muito', 'também']);
const LEXICO = new Set(['aula', 'aulas', 'curso', 'cursos', 'dia', 'dias', 'hoje', 'ontem', 'agora', 'nota', 'notas', 'perfil', 'turma', 'compra', 'compras', 'enviar', 'salvar', 'sair', 'entrar', 'voltar', 'abrir', 'fechar', 'baixar', 'copiar', 'ver', 'feito', 'passo', 'passos', 'material', 'materiais', 'tutor', 'senha', 'código', 'erro']);

function arquivos(dir, saida = []) {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) arquivos(p, saida);
    else if (traduzivel(p)) saida.push(p);
  }
  return saida;
}

const linhaDe = (src, pos) => src.slice(0, pos).split('\n').length;

// Percorre a árvore. "pai" serve para pular o que não é texto de tela (importações, chaves de objeto, tipos).
function andar(no, pai, fn) {
  if (!no || typeof no !== 'object') return;
  if (Array.isArray(no)) { for (const x of no) andar(x, pai, fn); return; }
  if (typeof no.type === 'string') fn(no, pai);
  for (const k of Object.keys(no)) {
    if (k === 'type' || k === 'start' || k === 'end' || k === 'loc' || k === 'range') continue;
    const v = no[k];
    if (v && typeof v === 'object') andar(v, typeof no.type === 'string' ? no : pai, fn);
  }
}

// Todos os textos de um arquivo: { tipo, texto, chave, linha }. "chave" é o trecho do código como o dicionário o escreveria.
export function coletar(src, arquivo) {
  const ast = parseAst(src, { lang: arquivo.endsWith('.tsx') ? 'tsx' : 'ts' }, arquivo);
  const achados = [];
  andar(ast, null, (no, pai) => {
    if (no.type === 'JSXText') {
      const cru = src.slice(no.start, no.end);
      if (!/\p{L}/u.test(cru)) return;
      const ant = src[no.start - 1], dep = src[no.end];
      achados.push({ tipo: 'jsx', texto: cru, chave: /\n/.test(cru) ? cru.trim() : `${ant}${cru}${dep}`, linha: linhaDe(src, no.start) });
    } else if (no.type === 'Literal' && typeof no.value === 'string') {
      if (pai && /^(Import|Export|TSLiteralType|TSImportType|TSEnum)/.test(pai.type)) return;
      if (pai && pai.type === 'Property' && pai.key === no && !pai.computed) return;
      if (pai && pai.type === 'MemberExpression' && pai.property === no) return;
      if (pai && pai.type === 'ExpressionStatement') return; // 'use strict'
      achados.push({ tipo: pai && pai.type === 'JSXAttribute' ? 'attr' : 'str', texto: no.value, chave: src.slice(no.start, no.end), linha: linhaDe(src, no.start) });
    } else if (no.type === 'TemplateElement') {
      const cru = no.value.raw;
      if (!/\p{L}/u.test(cru)) return;
      // O trecho do modelo vai do começo (` ou }) até o fim (` ou ${).
      let ini = src.indexOf(cru, no.start - 1), fim;
      if (ini < 0) return;
      const ant = src[ini - 1];
      fim = ini + cru.length;
      const dep = src[fim] === '`' ? '`' : '${';
      achados.push({ tipo: 'modelo', texto: cru, chave: `${ant}${cru}${dep}`, linha: linhaDe(src, ini) });
    }
  });
  return achados;
}

// As classes de CSS do app: uma string só com classes ("msg tutor", "bt bt-p") é estilo, não texto.
function classesDoCss() {
  const nomes = new Set();
  const ler = (dir) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) ler(p); else if (n.endsWith('.css')) for (const m of readFileSync(p, 'utf8').matchAll(/\.([a-zA-Z_][\w-]*)/g)) nomes.add(m[1]);
    }
  };
  ler(join(RAIZ_ALUNO, 'src'));
  return nomes;
}
const CLASSES = classesDoCss();
const soClasses = (t) => t.split(/\s+/).filter(Boolean).every((c) => CLASSES.has(c));
// Palavras soltas em minúscula que são texto de tela (o resto das palavras soltas é id de aba, rota, tipo...).
const SOLTAS = new Set(['hoje', 'agora', 'ontem', 'amanhã', 'teste', 'print', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez', 'perguntas', 'criação', 'criações', 'pessoa', 'pessoas', 'fixado', 'faltam', 'novas', 'novo', 'restam']);

function parecePortugues(a) {
  const t = a.texto.replace(/\s+/g, ' ').trim();
  if (!t || !/\p{L}/u.test(t)) return false;
  if (FALSOS_POSITIVOS.has(t)) return false;
  if (a.tipo === 'jsx') return true;
  if (/^(https?:|\/[\w@-]|#|\.\.?\/|data:|mailto:|tel:|@|--|<)/.test(t) || /\bhttps?:\/\//.test(t)) return false; // rotas, endereços, SVG
  if (/^[A-Z0-9_ ]+$/.test(t)) return false; // BRL, POST, NFD: siglas e constantes
  if (ACENTO.test(t)) return true;
  if (soClasses(t)) return false;
  const palavras = t.split(' ').map((p) => p.toLowerCase().replace(/[^\p{L}]/gu, '')).filter(Boolean);
  if (palavras.length >= 2) return true;
  const p = palavras[0];
  if (SOLTAS.has(p) || (a.tipo === 'modelo' && (LEXICO.has(p) || GRAMATICA.has(p)))) return true;
  return /^[A-ZÀ-Ý][\p{L}-]{2,}[.…:!?,]*$/u.test(t);
}

// Português no que o dicionário já trocou? Só os sinais fortes (acento ou palavra de gramática que não existe em inglês).
function aindaPortugues(a) {
  const t = a.texto.replace(/\s+/g, ' ').trim();
  if (ACENTO.test(t)) return true;
  return t.split(' ').map((p) => p.toLowerCase().replace(/[^\p{L}]/gu, '')).some((p) => GRAMATICA.has(p));
}

const args = process.argv.slice(2);
const esqueleto = args.includes('--esqueleto') ? args[args.indexOf('--esqueleto') + 1] : null;
const tudo = args.includes('--tudo');
const raiz = join(RAIZ_ALUNO, 'src');
const lista = arquivos(raiz).sort();

if (esqueleto) {
  const unicas = new Map();
  for (const f of lista) {
    const src = readFileSync(f, 'utf8');
    for (const a of coletar(src, f)) if (parecePortugues(a) && !unicas.has(a.chave)) unicas.set(a.chave, `${relative(raiz, f)}:${a.linha}`);
  }
  const linhas = [...unicas.entries()].map(([chave, onde], i) => `${String(i + 1).padStart(3, '0')}\t${onde}\t${chave.replace(/\n/g, '\\n')}`);
  writeFileSync(esqueleto, linhas.join('\n') + '\n', 'utf8');
  console.log(`${linhas.length} textos candidatos gravados em ${esqueleto}`);
  process.exit(0);
}

const pares = lerPares(process.env.EN_JSON || undefined);
const usados = new Set();
let sobras = 0, ignorados = 0, mistos = 0;
// A segunda rede: as palavras de textos que o dicionário trocou são português com certeza (menos as que o inglês também usa).
// Qualquer texto do app em inglês que ainda tenha uma delas, mesmo sem acento, aparece na lista.
const palavrasPt = new Set(), palavrasEn = new Set(), todosOsTextos = [];
const palavrasDe = (t) => (t.toLowerCase().match(/\p{L}{3,}/gu) || []);
for (const f of lista) {
  const original = readFileSync(f, 'utf8');
  const novo = aplicarPares(original, pares, usados);
  const antes = new Map();
  for (const a of coletar(original, f)) antes.set(a.texto, (antes.get(a.texto) || 0) + 1);
  const textosNovos = coletar(novo, f);
  const sobraram = new Map(antes);
  for (const a of textosNovos) { const r = sobraram.get(a.texto) || 0; if (r > 0) sobraram.set(a.texto, r - 1); else palavrasDe(a.texto).forEach((p) => palavrasEn.add(p)); }
  for (const [texto, n] of sobraram) if (n > 0) palavrasDe(texto).forEach((p) => palavrasPt.add(p));
  todosOsTextos.push([f, textosNovos]);
}
for (const p of palavrasEn) palavrasPt.delete(p);
// O index.html (título e o que mais o dicionário trocar) também conta como uso.
aplicarPares(readFileSync(join(RAIZ_ALUNO, 'index.html'), 'utf8'), pares, usados);
for (const [f, textosNovos] of todosOsTextos) {
  const original = readFileSync(f, 'utf8');
  const antes = new Map();
  for (const a of coletar(original, f)) antes.set(a.texto, (antes.get(a.texto) || 0) + 1);
  const saida = [];
  for (const a of textosNovos) {
    const resta = antes.get(a.texto) || 0;
    if (resta > 0) {
      // O texto é igual a um do código original: o dicionário não passou por aqui.
      antes.set(a.texto, resta - 1);
      if (!parecePortugues(a)) continue;
      const t = a.texto.replace(/\s+/g, ' ').trim();
      if (FALSOS_POSITIVOS.has(t)) { ignorados++; if (!tudo) continue; }
      else sobras++;
      saida.push(`  ${relative(RAIZ_ALUNO, f)}:${a.linha}  [${a.tipo}]  ${JSON.stringify(a.texto.replace(/\s+/g, ' ').trim())}`);
    } else if (aindaPortugues(a)) {
      mistos++;
      saida.push(`  ${relative(RAIZ_ALUNO, f)}:${a.linha}  [traduzido, mas com português]  ${JSON.stringify(a.texto.replace(/\s+/g, ' ').trim())}`);
    } else if (palavrasDe(a.texto).some((p) => palavrasPt.has(p))) {
      mistos++;
      saida.push(`  ${relative(RAIZ_ALUNO, f)}:${a.linha}  [traduzido, com palavra em português: ${palavrasDe(a.texto).filter((p) => palavrasPt.has(p)).join(', ')}]  ${JSON.stringify(a.texto.replace(/\s+/g, ' ').trim())}`);
    }
  }
  if (saida.length) console.log(saida.join('\n'));
}
console.log(`\n${lista.length} arquivos, ${pares.length} pares (${usados.size} usados). Sobraram ${sobras} textos em português, ${mistos} traduzidos com sinal de português${tudo ? `, ${ignorados} falsos positivos listados` : ''}.`);
process.exit(sobras || mistos ? 1 : 0);
