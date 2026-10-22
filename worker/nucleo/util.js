// Peças pequenas usadas no Worker inteiro.
// Modelo: worker/nucleo/util.js do olharondoniense (fuso de São Paulo aqui).

export const FUSO = 'America/Sao_Paulo';

export class Erro extends Error {
  constructor(status, mensagem, extra) {
    super(mensagem);
    this.status = status;
    this.extra = extra;
  }
}

export function json(dados, status = 200, cab = {}) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cab },
  });
}

export function respostaErro(e) {
  const status = e instanceof Erro ? e.status : 500;
  const mensagem = e instanceof Erro ? e.message : 'Algo deu errado do nosso lado. Tente de novo em instantes.';
  if (!(e instanceof Erro)) console.error('erro interno', e && e.stack ? e.stack : e);
  return json({ erro: mensagem, ...(e instanceof Erro && e.extra ? e.extra : {}) }, status);
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// JSON seguro dentro de <script>.
export function jsonScript(o) {
  return JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export function slugar(t, max = 80) {
  const s = String(t || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (s.length <= max) return s;
  const corte = s.slice(0, max);
  return corte.slice(0, corte.lastIndexOf('-') > 20 ? corte.lastIndexOf('-') : max).replace(/-+$/, '');
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export function hoje(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function dataLonga(iso) {
  if (!iso) return '';
  const [a, m, d] = hoje(new Date(iso)).split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}
export function dataCurta(iso) {
  if (!iso) return '';
  const [a, m, d] = hoje(new Date(iso)).split('-');
  return `${d}/${m}/${a}`;
}

export function tamanho(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export async function sha256(texto) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function aleatorio(n = 32) {
  const abc = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = crypto.getRandomValues(new Uint8Array(n));
  return [...b].map((x) => abc[x % abc.length]).join('');
}

// Corpo JSON com limite de tamanho; erro claro em vez de exceção solta.
export async function corpoJson(request, limite = 200_000) {
  const t = await request.text();
  if (t.length > limite) throw new Erro(413, 'Conteúdo grande demais.');
  if (!t) return {};
  try {
    const d = JSON.parse(t);
    if (!d || typeof d !== 'object') throw new Error();
    return d;
  } catch {
    throw new Erro(400, 'O conteúdo enviado não é um JSON válido.');
  }
}

// Teste no computador: só com AMBIENTE=local, pedido de localhost e o cabeçalho de teste. Em produção nada disso existe.
export function ehLocal(request, env) {
  if (env.AMBIENTE !== 'local') return false;
  const h = new URL(request.url).hostname;
  return (h === 'localhost' || h === '127.0.0.1') && request.headers.get('x-teste') === '1';
}

// Só endereços http(s); o resto vira "#".
export function urlSegura(u) {
  try {
    const x = new URL(String(u || ''));
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.toString() : '#';
  } catch {
    return String(u || '').startsWith('/') && !String(u).startsWith('//') ? String(u) : '#';
  }
}

// Markdown simples para HTML seguro: ## títulos, listas, **negrito**, *itálico*, `código`, [link](url), ![alt](img), > citação.
// Tudo é escapado antes; nenhum HTML de quem escreveu passa.
function inline(t) {
  return esc(t)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => `<img src="${esc(urlSegura(src))}" alt="${alt}" loading="lazy">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, href) => {
      const u = urlSegura(href);
      const fora = /^https?:/.test(u) && !u.includes('agenciasetup.com.br');
      return `<a href="${esc(u)}"${fora ? ' target="_blank" rel="noopener"' : ''}>${txt}</a>`;
    })
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
}

export function markdown(md = '') {
  const linhas = String(md).replace(/\r/g, '').split('\n');
  const out = [];
  let lista = null;
  let para = [];
  let bloco = null;
  const fecharPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const fecharLista = () => { if (lista) { out.push(`</${lista}>`); lista = null; } };
  for (const l of linhas) {
    if (bloco !== null) {
      if (/^```/.test(l)) { out.push(`<pre><code>${esc(bloco.join('\n'))}</code></pre>`); bloco = null; } else bloco.push(l);
      continue;
    }
    if (/^```/.test(l)) { fecharPara(); fecharLista(); bloco = []; continue; }
    const h = l.match(/^(#{2,4})\s+(.+)/);
    if (h) { fecharPara(); fecharLista(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    const li = l.match(/^\s*(?:[-*]|(\d+)\.)\s+(.+)/);
    if (li) {
      fecharPara();
      const tipo = li[1] ? 'ol' : 'ul';
      if (lista !== tipo) { fecharLista(); out.push(`<${tipo}>`); lista = tipo; }
      out.push(`<li>${inline(li[2])}</li>`);
      continue;
    }
    const q = l.match(/^>\s?(.*)/);
    if (q) { fecharPara(); fecharLista(); out.push(`<blockquote>${inline(q[1])}</blockquote>`); continue; }
    if (!l.trim()) { fecharPara(); fecharLista(); continue; }
    fecharLista();
    para.push(l.trim());
  }
  if (bloco !== null) out.push(`<pre><code>${esc(bloco.join('\n'))}</code></pre>`);
  fecharPara();
  fecharLista();
  return out.join('\n');
}
