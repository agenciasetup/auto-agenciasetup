// As páginas públicas da licença e do termo de aceite de um produto para baixar (/cursos/<chave>/licenca e
// /cursos/<chave>/termo). Hoje, só a Família Calango. O texto vem de lib/licencas.js, como o dono escreveu: aqui ele só
// vira HTML que lê bem no celular (os parágrafos que quebravam a linha em 72 letras voltam a ser um parágrafo só).
import { esc } from '../nucleo/util.js';

const MARCADOR = /^\s+(-|[a-z]\))\s+/; // "  - item" ou "   a) item"
// Título de seção: linha sozinha cujo começo (tirado o "1. ") é todo em maiúsculas ("1. O QUE É ESTA LICENÇA", "RESUMO (...)").
const ehTitulo = (linhas) => {
  if (linhas.length !== 1) return false;
  const letras = linhas[0].replace(/^\d+\.\s+/, '').replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 6);
  return letras.length >= 3 && letras === letras.toUpperCase();
};
// Linha curta seguida de outra (endereço, contato): a quebra é de verdade. Linha comprida: só quebrava na margem.
// Nos textos de 11/11/2026 a linha que quebra na margem tem 62 letras ou mais; a quebra de verdade, 56 ou menos.
const QUEBRA_REAL = 60;
const tudoMaiusculo = (t) => /[A-ZÀ-Ý]/.test(t) && t === t.toUpperCase();

function bloco(linhas) {
  if (ehTitulo(linhas)) return `<h2>${esc(linhas[0].trim())}</h2>`;
  const partes = []; // { tipo: 'p' | 'lista', ... }
  let atual = null;
  const juntar = (alvo, linha, anterior) => { alvo.texto += anterior !== null && anterior.trimEnd().length < QUEBRA_REAL ? `\n${linha.trim()}` : ` ${linha.trim()}`; };
  let anterior = null;
  for (const linha of linhas) {
    const m = linha.match(MARCADOR);
    if (m) {
      let lista = partes[partes.length - 1];
      if (!lista || lista.tipo !== 'lista') { lista = { tipo: 'lista', letras: m[1] !== '-', itens: [] }; partes.push(lista); }
      atual = { texto: m[1] === '-' ? linha.replace(MARCADOR, '') : linha.trim() };
      lista.itens.push(atual);
    } else if (/^\s/.test(linha) && atual) {
      juntar(atual, linha, anterior);
    } else {
      const ultimo = partes[partes.length - 1];
      if (ultimo && ultimo.tipo === 'p' && !/^\s/.test(anterior || '')) juntar(ultimo, linha, anterior);
      else { atual = { tipo: 'p', texto: linha.trim() }; partes.push(atual); }
    }
    anterior = linha;
  }
  const texto = (t) => esc(t.trim()).replace(/\n/g, '<br>');
  return partes.map((x) => (x.tipo === 'lista'
    ? `<ul${x.letras ? ' style="list-style:none;padding-left:0"' : ''}>${x.itens.map((i) => `<li>${texto(i.texto)}</li>`).join('')}</ul>`
    : `<p>${tudoMaiusculo(x.texto) ? `<strong>${texto(x.texto)}</strong>` : texto(x.texto)}</p>`)).join('');
}

// O documento inteiro: o primeiro bloco (nome e versão) vira o cabeçalho; o resto, seções e parágrafos.
export function textoEmHtml(doc) {
  const blocos = String(doc).replace(/\r\n/g, '\n').split(/\n\s*\n/).map((b) => b.split('\n').filter((l) => l.trim())).filter((b) => b.length);
  return blocos.slice(1).map(bloco).join('\n');
}

// qual: 'licenca' ou 'termo'. l: licencaDe(...) de lib/licencas.js. voltar: a página de venda.
export function paginaLicenca({ l, qual, voltar }) {
  const doc = qual === 'termo' ? l.termo : l.licenca;
  const [cab, ...resto] = doc.split('\n\n')[0].split('\n');
  const outra = qual === 'termo' ? { href: l.licenca_url, t: 'Ler a Licença de Uso' } : { href: l.termo_url, t: 'Ler o Termo de Aceite' };
  const versao = l.atual ? '' : `?v=${encodeURIComponent(l.versao)}`;
  return `<article class="leitura">
  <p class="mudo" style="margin:0"><a href="${esc(voltar)}">${esc(l.nome)}</a></p>
  <h1 class="t-titulo">${esc(cab.trim())}</h1>
  ${resto.length ? `<p class="mudo">${esc(resto.join(' ').trim())}</p>` : ''}
  ${l.atual ? '' : '<p class="mudo">Esta é uma versão antiga, guardada para quem comprou com ela. A versão em vigor está na página de venda.</p>'}
  <div class="texto" style="margin-top:24px">${textoEmHtml(doc)}</div>
  <p style="display:flex;gap:8px;flex-wrap:wrap;margin-top:32px"><a class="bt" href="${esc(outra.href + versao)}">${esc(outra.t)}</a><a class="bt" href="${esc(voltar)}">Voltar para a página da ${esc(l.nome)}</a></p>
</article>`;
}
