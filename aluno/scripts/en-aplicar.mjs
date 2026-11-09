// O que o build em inglês (aluno/vite.config.en.ts) e o scanner (sobra-pt.mjs) têm em comum: ler o dicionário aluno/en.json
// e aplicá-lo ao texto de um arquivo. Cada par é [português, inglês]; vale o texto exato, trocado por split/join, na ordem
// do arquivo. O português precisa levar o contexto (aspas, > e < do texto do JSX, `${` das strings com modelo) para nunca
// pegar um identificador, uma classe de CSS, uma rota ou uma chave de objeto.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const AQUI = dirname(fileURLToPath(import.meta.url));
export const RAIZ_ALUNO = join(AQUI, '..');
export const DICIONARIO = join(RAIZ_ALUNO, 'en.json');

// Tem cara de identificador solto (só letras, números, espaço, _ e $)? Então o par não tem contexto e podia trocar nome de variável.
const SOLTO = /^[\p{L}\p{N}_$ ]+$/u;
const TRAVESSAO = /[–—]/;

export function lerPares(arquivo = DICIONARIO) {
  const bruto = JSON.parse(readFileSync(arquivo, 'utf8'));
  if (!Array.isArray(bruto)) throw new Error(`${arquivo}: precisa ser uma lista de pares [português, inglês].`);
  const vistos = new Set();
  const erros = [];
  bruto.forEach((p, i) => {
    if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'string' || typeof p[1] !== 'string') { erros.push(`par ${i + 1}: não é [português, inglês]`); return; }
    const [pt, en] = p;
    if (!pt) erros.push(`par ${i + 1}: português vazio`);
    else if (SOLTO.test(pt)) erros.push(`par ${i + 1}: "${pt}" não tem contexto (aspas, > <, ${'${'}...): trocaria até identificadores`);
    if (TRAVESSAO.test(en)) erros.push(`par ${i + 1}: o inglês de "${pt}" tem travessão (— ou –): use vírgula, ponto ou parênteses`);
    if (vistos.has(pt)) erros.push(`par ${i + 1}: "${pt}" aparece duas vezes`);
    vistos.add(pt);
  });
  if (erros.length) throw new Error(`${arquivo} tem problemas:\n  ${erros.join('\n  ')}`);
  return bruto;
}

// O inglês entra no lugar do português; se o par é um texto entre aspas, as aspas do mesmo tipo dentro do inglês ganham barra
// (assim "Don't" não quebra um 'texto' de aspas simples).
function paraEncaixar(pt, en) {
  const a = pt[0];
  if (a !== "'" && a !== '"' && a !== '`') return en;
  const solta = () => new RegExp(`(?<!\\\\)${a}`, 'g');
  // Só vale para UM texto entre aspas ('...'): sem aspas do mesmo tipo no meio (senão são dois textos, como 'aula' : 'aulas').
  if (pt.length > 1 && pt[pt.length - 1] === a && !solta().test(pt.slice(1, -1))) {
    const meio = en.slice(1, -1).replace(solta(), `\\${a}`);
    return en[0] === a && en[en.length - 1] === a ? a + meio + a : en.replace(solta(), `\\${a}`);
  }
  return en;
}

// Aplica todos os pares ao texto. "usados" (um Set de índices), se vier, recebe os pares que acharam o que trocar.
export function aplicarPares(codigo, pares, usados = null) {
  let saida = codigo;
  for (let i = 0; i < pares.length; i++) {
    const [pt, en] = pares[i];
    if (!saida.includes(pt)) continue;
    if (usados) usados.add(i);
    saida = saida.split(pt).join(paraEncaixar(pt, en));
  }
  return saida;
}

// Só o código do app do aluno (aluno/src), sem o leitor de outro curso (aluno/src/leitor) e sem node_modules.
export function traduzivel(id) {
  const caminho = String(id).split('?')[0].replace(/\\/g, '/');
  return /\/aluno\/src\/.+\.tsx?$/.test(caminho) && !/\/aluno\/src\/leitor\//.test(caminho) && !caminho.includes('/node_modules/');
}
