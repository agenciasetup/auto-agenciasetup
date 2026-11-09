// O material grátis do perfil em inglês (@setupagency_eng), em agenciasetup.com/free/<slug>: é o link que a DM do
// "Comenta X" em inglês manda. Mesmo visual escuro do checkout e dos termos em inglês, feito para o celular (quem chega
// vem do direct do Instagram). Baixar e abrir passam por /free/<slug>/download e /open, que contam o uso.
// No fim, o curso em inglês quando a oferta "oferta_en" está ligada.
import { esc, markdown, tamanho, urlSegura } from '../nucleo/util.js';
import { PERFIS } from '../lib/perfis.js';

const TIPO = { prompt: 'Prompt', agente: 'AI agent', template: 'Template', planilha: 'Spreadsheet', automacao: 'Automation', guia: 'Guide', pack: 'Pack', ferramenta: 'Tool', video: 'Video' };
const NIVEL = { iniciante: 'Beginner', intermediario: 'Intermediate', avancado: 'Advanced' };
const NOME_FERRAMENTA = { chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini', midjourney: 'Midjourney', magnific: 'Magnific', n8n: 'n8n', make: 'Make', notion: 'Notion', figma: 'Figma', capcut: 'CapCut', canva: 'Canva' };
const ferramenta = (f) => NOME_FERRAMENTA[String(f).toLowerCase()] || String(f);

function onde(r) {
  const u = String(r.link_uso || '');
  return /claude\.ai/.test(u) ? 'Claude' : /gemini\.google/.test(u) ? 'Gemini' : /chatgpt\.com|chat\.openai/.test(u) ? 'ChatGPT' : 'AI';
}

function video(url) {
  const u = urlSegura(url);
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(yt[1])}" title="How to use" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`;
  if (/\.(mp4|webm)(\?|$)/i.test(u)) return `<div class="video"><video src="${esc(u)}" controls preload="metadata" playsinline></video></div>`;
  return `<p><a href="${esc(u)}" target="_blank" rel="noopener">Watch how to use it</a></p>`;
}

// Quem dá o material é a agência (o perfil em inglês), não o curso: o topo e o rodapé levam "Setup Agency".
export function paginaRecursoEn({ r, oferta, url }) {
  const nome = PERFIS.en.nome;
  const agente = r.tipo === 'agente' && r.link_uso;
  const arquivo = r.arquivo_url || r.link_externo;
  const galeria = (Array.isArray(r.galeria) ? r.galeria : []).filter((g) => g && g.url);
  const capa = r.capa_url || (galeria[0] && galeria[0].url) || null;
  const extras = galeria.filter((g) => g.url !== capa);
  const base = `/free/${esc(r.slug)}`;
  const principal = agente
    ? `<a class="bt" href="${base}/open" target="_blank" rel="noopener nofollow">Open in ${esc(onde(r))}</a>`
    : arquivo ? `<a class="bt" href="${base}/download" rel="nofollow">Download free</a>`
      : r.corpo_md ? '<a class="bt" href="#how">See how to use it</a>' : '';
  const segundo = agente && arquivo ? `<a class="bt bt-2" href="${base}/download" rel="nofollow">Download the extras</a>` : '';
  const ficha = [
    ['Type', TIPO[r.tipo] || 'Freebie'],
    r.formato && ['Format', r.formato],
    r.nivel && ['Level', NIVEL[r.nivel] || r.nivel],
    (r.ferramentas || []).length && ['Works with', r.ferramentas.map(ferramenta).join(', ')],
    !agente && r.arquivo_bytes && ['Size', tamanho(r.arquivo_bytes)],
  ].filter(Boolean);
  const titulo = `${r.titulo} · ${nome}`;
  const descricao = r.resumo || 'A free resource from Setup Agency.';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title><meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="${esc(url)}"><link rel="icon" href="/img/favicon.png" type="image/png"><meta name="theme-color" content="#09090a">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(r.titulo)}"><meta property="og:description" content="${esc(descricao)}"><meta property="og:url" content="${esc(url)}">${capa ? `<meta property="og:image" content="${esc(urlSegura(capa))}">` : ''}<meta name="twitter:card" content="summary_large_image">
<style>
:root{--fundo:#09090a;--cartao:#141416;--linha:#26262b;--texto:#e4e4e7;--fraco:#a1a1aa;--mudo:#71717a;--marca:#ffad1f}
*{box-sizing:border-box}body{margin:0;background:var(--fundo);color:var(--texto);font:16px/1.65 Inter,-apple-system,Segoe UI,Arial,sans-serif}
main{max-width:760px;margin:0 auto;padding:20px 16px 72px}a{color:var(--marca)}
.topo{display:flex;align-items:center;gap:10px;font-weight:700;color:#fff;text-decoration:none}
.cabeca{display:grid;gap:24px;margin-top:24px;align-items:start}
@media(min-width:720px){.cabeca{grid-template-columns:280px 1fr}}
.capa{width:100%;max-width:340px;aspect-ratio:4/5;object-fit:cover;border-radius:16px;border:1px solid var(--linha);background:var(--cartao)}
.selo{display:inline-block;font-size:13px;font-weight:700;color:#09090a;background:var(--marca);border-radius:999px;padding:3px 10px}
h1{font-size:30px;line-height:1.15;margin:12px 0 10px;color:#fff;letter-spacing:-.01em}
.lead{color:var(--fraco);margin:0 0 18px;font-size:17px}
.bt{display:flex;justify-content:center;align-items:center;min-height:50px;padding:12px 18px;border-radius:12px;background:var(--marca);color:#09090a;font-weight:800;text-decoration:none;font-size:16px}
.bt-2{background:transparent;color:#fff;border:1px solid var(--linha);margin-top:10px}
.ficha{list-style:none;padding:0;margin:18px 0 0;border-top:1px solid var(--linha)}
.ficha li{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--linha);font-size:14px}.ficha span:first-child{color:var(--mudo)}
section{margin-top:36px}h2{font-size:20px;color:#fff;margin:0 0 10px}
.vem{list-style:none;padding:0;margin:0}.vem li{position:relative;padding:6px 0 6px 28px;color:var(--texto)}
.vem li::before{content:"";position:absolute;left:2px;top:13px;width:14px;height:8px;border-left:2.5px solid var(--marca);border-bottom:2.5px solid var(--marca);transform:rotate(-45deg)}
.texto p,.texto li{color:#c9c9d1}.texto h2,.texto h3{color:#fff;margin:26px 0 8px}.texto h3{font-size:17px}
.texto code{background:var(--cartao);border:1px solid var(--linha);border-radius:6px;padding:1px 6px;font-size:.92em}
.texto pre{position:relative;background:var(--cartao);border:1px solid var(--linha);border-radius:12px;padding:44px 16px 16px;overflow-x:auto;white-space:pre-wrap;word-break:break-word}
.texto pre code{background:none;border:0;padding:0;font-size:14px;line-height:1.6}
.copiar{position:absolute;top:8px;right:8px;font:600 13px Inter,-apple-system,Segoe UI,Arial,sans-serif;color:#fff;background:#232327;border:1px solid var(--linha);border-radius:8px;padding:6px 10px;cursor:pointer}
.texto blockquote{margin:12px 0;padding:4px 14px;border-left:3px solid var(--marca);color:var(--fraco)}
.galeria{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.galeria img{width:100%;border-radius:12px;border:1px solid var(--linha)}
.video{position:relative;aspect-ratio:16/9}.video iframe,.video video{position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px}
.oferta{margin-top:44px;padding:22px;border-radius:16px;background:linear-gradient(160deg,#1d1608,#141416 60%);border:1px solid #3a2c0d}
.oferta p{color:var(--fraco);margin:0 0 16px}.oferta small{display:block;color:var(--mudo);font-size:13px;margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em}
footer{margin-top:48px;padding-top:18px;border-top:1px solid var(--linha);display:flex;flex-wrap:wrap;gap:8px 18px;font-size:14px;color:var(--mudo)}footer a{color:var(--fraco);text-decoration:none}
</style></head><body><main>
<a class="topo" href="/"><img src="/img/logo-setup-128.png" alt="" width="28" height="28">${esc(nome)}</a>
<div class="cabeca">
  ${capa ? `<img class="capa" src="${esc(urlSegura(capa))}" alt="${esc(r.titulo)}" width="340" height="425">` : ''}
  <div>
    <span class="selo">Free</span>
    <h1>${esc(r.titulo)}</h1>
    ${r.resumo ? `<p class="lead">${esc(r.resumo)}</p>` : ''}
    ${principal}${segundo}
    ${ficha.length ? `<ul class="ficha">${ficha.map(([k, v]) => `<li><span>${esc(k)}</span><span>${esc(v)}</span></li>`).join('')}</ul>` : ''}
  </div>
</div>
${Array.isArray(r.itens) && r.itens.length ? `<section><h2>What's inside</h2><ul class="vem">${r.itens.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>` : ''}
${r.video_url ? `<section><h2>Watch how to use it</h2>${video(r.video_url)}</section>` : ''}
${r.corpo_md ? `<section id="how"><h2>How to use it</h2><div class="texto">${markdown(r.corpo_md)}</div></section>` : ''}
${extras.length ? `<section><h2>Examples</h2><div class="galeria">${extras.map((g) => `<img src="${esc(urlSegura(g.url))}" alt="${esc(g.alt || '')}" loading="lazy" decoding="async">`).join('')}</div></section>` : ''}
${oferta ? `<div class="oferta"><small>Next step</small><h2>${esc(oferta.titulo || oferta.nome)}</h2>${oferta.texto ? `<p>${esc(oferta.texto)}</p>` : ''}<a class="bt" href="${esc(oferta.link)}">See the course</a></div>` : ''}
<footer><span>© ${new Date().getFullYear()} ${esc(nome)}</span><a href="https://www.instagram.com/setupagency_eng/" target="_blank" rel="noopener">Instagram</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a></footer>
</main>
<script>
document.querySelectorAll('.texto pre').forEach(function(pre){var b=document.createElement('button');b.type='button';b.className='copiar';b.textContent='Copy';b.addEventListener('click',function(){var t=(pre.querySelector('code')||pre).innerText;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){b.textContent='Copied';setTimeout(function(){b.textContent='Copy'},1800)}).catch(function(){b.textContent='Select and copy'})});pre.appendChild(b)});
if(/[?&](de|utm_source)=/.test(location.search)||(document.referrer&&!/agenciasetup\.com/.test(document.referrer)))fetch('/api/toque',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:location.href,referrer:document.referrer}),keepalive:true}).catch(function(){});
</script></body></html>`;
}
