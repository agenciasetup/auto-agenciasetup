// Páginas públicas do curso.agenciasetup.com.br, prontas no Worker (abrem rápido e aparecem bonitas quando compartilhadas):
// o certificado (/certificado/<código>) e o perfil público do aluno (/@usuario).
import qrcode from 'qrcode-generator';
import { esc } from '../nucleo/util.js';

// As fontes da agência (public/estatico/tipos.css, pela porta /_f/ do Worker; vale no curso. também). Nada do Google.
const FONTES = '/estatico/tipos.css?v=1';
const LOGO = '<img src="/aluno/logo.png" alt="" width="28" height="28">';
const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dataLonga = (iso) => { const d = new Date(new Date(iso).getTime() - 3 * 3600_000); return `${d.getUTCDate()} de ${MES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`; };
const horas = (h) => (Number(h) % 1 ? String(Number(h)).replace('.', ',') : String(Number(h)));

function qr(texto) {
  const q = qrcode(0, 'M');
  q.addData(texto);
  q.make();
  return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
}

function casca({ titulo, descricao, url, imagem, corpo, tema = 'escuro', css = '', fontes = FONTES }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title><meta name="description" content="${esc(descricao)}"><meta name="theme-color" content="${tema === 'claro' ? '#f4f1ea' : '#09090a'}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(descricao)}"><meta property="og:url" content="${esc(url)}">${imagem ? `<meta property="og:image" content="${esc(imagem)}">` : ''}
<meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/aluno/icone.svg" type="image/svg+xml">
<link rel="stylesheet" href="${fontes}">
<style>
*{box-sizing:border-box}html,body{margin:0}body{font-family:'as-texto',system-ui,sans-serif;-webkit-font-smoothing:antialiased;background:#09090a;color:#f5f5f7}
a{color:inherit}.logo{display:inline-flex;align-items:center;gap:9px;font-weight:750;letter-spacing:-.02em;text-decoration:none}.logo img{width:28px;height:28px;object-fit:contain}
.bt{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;border:0;background:#18181b;color:#f5f5f7;font:600 14.5px 'as-texto',sans-serif;text-decoration:none;cursor:pointer;box-shadow:0 0 0 1px rgba(255,255,255,.1)}
.bt-marca{background:linear-gradient(135deg,#ffb000,#ff6a00);color:#170900;box-shadow:none}.serifa{font-family:'as-destaque',serif;font-style:italic;font-weight:400}
${css}
</style></head><body class="${tema}">${corpo}</body></html>`;
}

// ---------------------------------------------------------------- certificado
// Padrão Setup: preto com o brilho laranja e grão (ou papel claro), nome em letra cursiva, curso em destaque,
// selo redondo, assinatura e QR para conferir. Tudo medido pela largura da folha (cqw): a tela e o PDF saem iguais.
const GRAO = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";
const FONTES_CERT = FONTES; // a assinatura (as-assinatura) também está em tipos.css
const CSS_CERT = `
.pagina{min-height:100dvh;display:grid;place-items:center;gap:22px;padding:28px 16px 40px;background:radial-gradient(60% 40% at 50% 0%,rgba(255,122,0,.12),transparent 70%),#09090a}
.folha,.story{--c2:color-mix(in srgb,var(--c) 70%,#ffd000);--c3:color-mix(in srgb,var(--c) 80%,#ff2a00);--deg:linear-gradient(120deg,var(--c2),var(--c) 50%,var(--c3));position:relative;overflow:hidden;isolation:isolate;container-type:inline-size;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.folha{width:min(1060px,100%);aspect-ratio:297/210;border-radius:clamp(10px,1.6cqw,20px);display:grid;grid-template-rows:auto 1fr auto;padding:5.2cqw 6cqw 4.6cqw;box-shadow:0 40px 90px -40px rgba(0,0,0,.9)}
.m-escuro{background:radial-gradient(70% 90% at 100% 0%,color-mix(in srgb,var(--c) 34%,transparent),transparent 60%),radial-gradient(50% 70% at 0% 100%,color-mix(in srgb,var(--c) 16%,transparent),transparent 65%),#0b0b0c;color:#f5f5f7}
.m-claro{background:radial-gradient(60% 80% at 100% 0%,color-mix(in srgb,var(--c) 16%,transparent),transparent 60%),#f7f3ec;color:#18181b}
.f-marca{position:absolute;z-index:-1;right:-7cqw;top:50%;width:46cqw;height:auto;transform:translateY(-54%) rotate(-8deg);opacity:.07;pointer-events:none}
.m-claro .f-marca{opacity:.09}
.story .f-marca{right:-30cqw;top:30%;width:110cqw}
.grao{position:absolute;inset:0;z-index:-1;background-image:${GRAO};background-size:220px;opacity:.09;mix-blend-mode:overlay;pointer-events:none}
.m-claro .grao{opacity:.22;mix-blend-mode:multiply;filter:invert(1)}
.moldura{position:absolute;inset:2.2cqw;border-radius:1.2cqw;border:1px solid rgba(255,255,255,.1);pointer-events:none}
.m-claro .moldura{border-color:color-mix(in srgb,var(--c) 30%,transparent)}
.moldura i{position:absolute;width:2.6cqw;height:2.6cqw;border:.22cqw solid var(--c)}
.moldura i:nth-child(1){top:-1px;left:-1px;border-right:0;border-bottom:0;border-top-left-radius:1.2cqw}
.moldura i:nth-child(2){top:-1px;right:-1px;border-left:0;border-bottom:0;border-top-right-radius:1.2cqw}
.moldura i:nth-child(3){bottom:-1px;left:-1px;border-right:0;border-top:0;border-bottom-left-radius:1.2cqw}
.moldura i:nth-child(4){bottom:-1px;right:-1px;border-left:0;border-top:0;border-bottom-right-radius:1.2cqw}
.f-cab{display:flex;justify-content:space-between;align-items:center;gap:2cqw}
.f-logo{display:inline-flex;align-items:center;gap:1cqw;font-weight:750;font-size:1.75cqw;letter-spacing:-.02em}.f-logo img{width:3.2cqw;height:3.2cqw;object-fit:contain}
.f-num{font-size:1.15cqw;letter-spacing:.16em;text-transform:uppercase;opacity:.6;font-weight:600}.f-num b{opacity:1;letter-spacing:.12em;font-weight:750}
.f-meio{display:grid;align-content:center;justify-items:start;gap:.2cqw;padding-top:1cqw}
.f-titulo{margin:0 0 1.4cqw;display:inline-flex;align-items:center;gap:1.2cqw;font-size:1.3cqw;font-weight:750;letter-spacing:.22em;text-transform:uppercase;color:var(--c)}
.f-titulo::before{content:'';width:4cqw;height:.22cqw;border-radius:9px;background:var(--deg)}
.m-claro .f-titulo{color:color-mix(in srgb,var(--c) 75%,#000)}
.f-abre{margin:0;font-size:1.75cqw;opacity:.68}
.f-nome{margin:.2cqw 0 .6cqw;font-family:'as-destaque',serif;font-style:italic;font-weight:400;font-size:8.4cqw;line-height:1;letter-spacing:-.01em;max-width:100%}
.f-nome.longo{font-size:6.6cqw}.f-nome.muito{font-size:5.2cqw}
.f-antes{margin:1cqw 0 0;font-size:1.75cqw;opacity:.68}
.f-curso{margin:.3cqw 0 0;font-size:3.9cqw;line-height:1.05;font-weight:800;letter-spacing:-.04em;background:var(--deg);-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:.2cqw;max-width:72cqw}
.f-det{margin:1.3cqw 0 0;font-size:1.5cqw;opacity:.62;font-variant-numeric:tabular-nums}
.f-pe{display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:3cqw}
.f-ass{display:grid;justify-items:start;gap:.35cqw}
.f-firma{font-family:'as-assinatura',cursive;font-size:4.6cqw;line-height:.8;margin:0 0 -.6cqw .4cqw;white-space:nowrap}
.f-firma-img{height:5.4cqw;width:auto;max-width:24cqw;object-fit:contain;margin-bottom:-.4cqw}
.m-escuro .f-firma-img{filter:invert(1) brightness(1.4)}
.f-linha{width:24cqw;height:1px;background:currentColor;opacity:.3;margin:.2cqw 0 .5cqw}
.f-ass b{font-size:1.45cqw;font-weight:700;letter-spacing:-.01em}.f-ass small{font-size:1.2cqw;opacity:.6}
.f-data{margin-top:.6cqw;font-size:1.2cqw;opacity:.6}
.f-selo{width:12cqw;height:12cqw;justify-self:center}.f-selo svg{width:100%;height:100%;display:block}
.f-conf{justify-self:end;display:flex;align-items:flex-end;gap:1.4cqw;text-align:right;font-size:1.1cqw;line-height:1.45;opacity:.9}
.f-conf span{opacity:.65}.f-conf code{display:block;font:750 1.35cqw/1.3 'as-texto',sans-serif;letter-spacing:.12em;opacity:1;color:inherit}
.f-qr{width:8cqw;height:8cqw;padding:.6cqw;border-radius:.9cqw;background:#fff;flex:none}.f-qr svg{width:100%;height:100%;display:block}
.m-claro .f-qr{box-shadow:0 0 0 1px rgba(0,0,0,.08)}
.acoes{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
.aviso{font-size:13px;color:#a1a1aa;text-align:center;max-width:52ch;margin:0}
.story{width:min(420px,100%);aspect-ratio:9/16;border-radius:24px;display:grid;grid-template-rows:auto 1fr auto;padding:9cqw 8cqw 8cqw;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 30px 80px -30px #000}
.story .moldura{inset:4cqw;border-radius:5cqw}.story .moldura i{width:7cqw;height:7cqw;border-width:.7cqw}
.story .moldura i:nth-child(1){border-top-left-radius:5cqw}.story .moldura i:nth-child(2){border-top-right-radius:5cqw}.story .moldura i:nth-child(3){border-bottom-left-radius:5cqw}.story .moldura i:nth-child(4){border-bottom-right-radius:5cqw}
.story .f-logo{font-size:4.6cqw;gap:2.4cqw}.story .f-logo img{width:8cqw;height:8cqw}
.story .f-corpo{display:grid;grid-template-columns:minmax(0,1fr);align-content:center}.story .f-meio{grid-template-columns:minmax(0,1fr)}.story .f-meio{gap:.6cqw}
.story .f-titulo{font-size:3.4cqw;gap:3cqw;margin-bottom:4cqw}.story .f-titulo::before{width:9cqw;height:.6cqw}
.story .f-abre,.story .f-antes{font-size:4.6cqw}
.story .f-nome{font-size:15cqw;margin:1cqw 0 2cqw}.story .f-nome.longo{font-size:12cqw}.story .f-nome.muito{font-size:10cqw}
.story .f-curso{font-size:9cqw;max-width:none}
.story .f-det{font-size:3.8cqw;margin-top:3cqw}
.story .f-selo{width:30cqw;height:30cqw;justify-self:start;margin-top:6cqw}
.story .f-pe{grid-template-columns:minmax(0,1fr);gap:6cqw}
.story .f-conf{font-size:3.2cqw;gap:3cqw;justify-self:stretch;justify-content:space-between;text-align:left}.story .f-conf code{font-size:3.6cqw}.story .f-qr{width:20cqw;height:20cqw;padding:1.6cqw;border-radius:2.4cqw}
.story .f-ass b{font-size:3.8cqw}.story .f-ass small{font-size:3.2cqw}.story .f-firma{font-size:10cqw}.story .f-linha{width:40cqw}
@media print{@page{size:A4 landscape;margin:0}html,body{background:#fff}.pagina{padding:0;background:none;min-height:auto;display:block}.acoes,.aviso,.story{display:none!important}.folha{width:297mm;height:210mm;aspect-ratio:auto;border-radius:0;box-shadow:none;page-break-after:avoid}}
`;

// Selo redondo: o nome da casa em volta e a logo no meio, no degradê da cor escolhida.
function selo(ano, cor, base) {
  const id = `s${Math.random().toString(36).slice(2, 7)}`;
  const texto = `AGÊNCIA SETUP · CERTIFICADO DE CONCLUSÃO · ${ano} · `;
  return `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb,${cor} 70%,#ffd000)"/><stop offset=".5" style="stop-color:${cor}"/><stop offset="1" style="stop-color:color-mix(in srgb,${cor} 80%,#ff2a00)"/></linearGradient><path id="${id}p" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0"/></defs>
<circle cx="60" cy="60" r="57" fill="none" stroke="url(#${id}g)" stroke-width="2"/><circle cx="60" cy="60" r="35" fill="url(#${id}g)" opacity=".14"/><circle cx="60" cy="60" r="35" fill="none" stroke="url(#${id}g)" stroke-width="1.2"/>
<text font-family="'as-texto',sans-serif" font-size="7" font-weight="700" fill="currentColor" opacity=".8"><textPath href="#${id}p" startOffset="0" textLength="286" lengthAdjust="spacing">${esc(texto)}</textPath></text>
<image href="${base}/aluno/logo.png" x="40" y="40" width="40" height="40"/></svg>`;
}

const trocar = (t, d) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => (d[k] != null ? d[k] : m));

export function paginaCertificado(c, { url, story = false, cfg = {}, base = '', previa = false }) {
  const k = { modelo: 'escuro', cor: '#ff7a00', selo: true, qr: true, ...cfg };
  const emitido = dataLonga(c.emitido_em || new Date().toISOString());
  const d = new Date(c.emitido_em || Date.now());
  const linkedin = `https://www.linkedin.com/profile/add?${new URLSearchParams({ startTask: 'CERTIFICATION_NAME', name: c.curso_titulo, organizationName: 'Agência Setup', issueYear: String(d.getUTCFullYear()), issueMonth: String(d.getUTCMonth() + 1), certUrl: url, certId: c.codigo })}`;
  const h = Number(c.horas);
  const dados = { nome: c.nome, curso: c.curso_titulo, aulas_feitas: c.aulas_feitas, aulas_total: c.aulas_total, horas: `${horas(h)} ${h === 1 ? 'hora' : 'horas'}`, data: emitido };
  const tam = c.nome.length > 34 ? ' muito' : c.nome.length > 24 ? ' longo' : '';
  const logo = `<img src="${esc(base)}/aluno/logo.png" alt="" width="64" height="64">`;
  const firma = k.assinatura_img ? `<img class="f-firma-img" src="${esc(k.assinatura_img)}" alt="">` : (k.assinatura_nome ? `<span class="f-firma">${esc(k.assinatura_nome)}</span>` : '');
  const ass = `<div class="f-ass">${firma}<span class="f-linha"></span><b>${esc(k.assinatura_nome || 'Agência Setup')}</b>${k.assinatura_cargo ? `<small>${esc(k.assinatura_cargo)}</small>` : ''}${story ? '' : `<span class="f-data">${esc(emitido)}</span>`}</div>`;
  const conf = `<div class="f-conf"><div><span>Confira em</span><br><span>${esc(url.replace(/^https?:\/\//, '').replace(/\/[^/]+$/, '/'))}</span><code>${esc(c.codigo)}</code></div>${k.qr ? `<div class="f-qr">${qr(url)}</div>` : ''}</div>`;
  const meio = `<section class="f-meio">
    <p class="f-titulo">${esc(k.titulo)}</p>
    <p class="f-abre">${esc(trocar(k.abertura, dados))}</p>
    <h1 class="f-nome${tam}">${esc(c.nome)}</h1>
    <p class="f-antes">${esc(trocar(k.antes_do_curso, dados))}</p>
    <p class="f-curso">${esc(c.curso_titulo)}</p>
    ${k.detalhes ? `<p class="f-det">${esc(trocar(k.detalhes, dados))}${story ? ` · ${esc(emitido)}` : ''}</p>` : ''}
  </section>`;
  const fundo = `<div class="grao"></div><img class="f-marca" src="${esc(base)}/aluno/logo.png" alt=""><div class="moldura"><i></i><i></i><i></i><i></i></div>`;
  const estilo = `style="--c:${esc(k.cor)}"`;
  const folha = `
<article class="folha m-${esc(k.modelo)}" ${estilo} aria-label="Certificado">
  ${fundo}
  <header class="f-cab"><span class="f-logo">${logo}Agência Setup</span><span class="f-num">Nº <b>${esc(c.codigo)}</b></span></header>
  ${meio}
  <footer class="f-pe">${ass}${k.selo ? `<div class="f-selo">${selo(d.getUTCFullYear(), esc(k.cor), esc(base))}</div>` : '<span></span>'}${conf}</footer>
</article>`;
  const historia = `
<article class="story m-${esc(k.modelo)}" ${estilo} aria-label="Certificado para o story">
  ${fundo}
  <header class="f-cab"><span class="f-logo">${logo}Agência Setup</span></header>
  <div class="f-corpo">${meio}${k.selo ? `<div class="f-selo">${selo(d.getUTCFullYear(), esc(k.cor), esc(base))}</div>` : ''}</div>
  <footer class="f-pe">${ass}${conf}</footer>
</article>`;
  if (previa) return casca({ titulo: 'Prévia do certificado', descricao: '', url, corpo: `<main class="pagina" style="min-height:auto;padding:16px">${story ? historia : folha}</main>`, css: CSS_CERT, fontes: FONTES_CERT });
  const corpo = `<main class="pagina">
${story ? historia : folha}
<div class="acoes">
  ${story ? `<a class="bt" href="?">Ver o certificado</a>` : `<button class="bt bt-marca" onclick="print()">Baixar em PDF</button><a class="bt" href="?formato=story">Versão para o story</a>`}
  <a class="bt" href="${esc(linkedin)}" target="_blank" rel="noopener">Adicionar ao LinkedIn</a>
  <button class="bt" onclick="navigator.clipboard.writeText(location.origin+location.pathname).then(()=>this.textContent='Link copiado')">Copiar link</button>
</div>
<p class="aviso">${story ? 'Tire um print desta tela e poste no story.' : `Este certificado é verdadeiro: foi emitido pela Agência Setup em ${esc(emitido)}. O código ${esc(c.codigo)} confere esta página.`}</p>
</main>`;
  return casca({ titulo: `Certificado de ${c.nome}: ${c.curso_titulo}`, descricao: `${c.nome} concluiu o curso ${c.curso_titulo} da Agência Setup.`, url, corpo, css: CSS_CERT, fontes: FONTES_CERT });
}

// ---------------------------------------------------------------- perfil público (/@usuario)
const CSS_PERFIL = `
.pp{width:min(760px,100%);margin:0 auto;padding:28px 16px 56px;display:grid;gap:22px}
.pp-topo{display:flex;justify-content:space-between;align-items:center}
.pp-cartao{display:grid;justify-items:center;gap:10px;text-align:center;padding:28px 18px;border-radius:24px;background:radial-gradient(80% 60% at 50% 0%,rgba(255,122,0,.16),transparent 70%),#111113;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}
.av{width:112px;height:112px;border-radius:50%;padding:4px;background:#212125;display:grid;place-items:center}.av.moldura{background:conic-gradient(from 200deg,#ffb000,#ff6a00,#ff375f,#ffb000)}
.av img,.av span{width:100%;height:100%;border-radius:50%;object-fit:cover;background:#18181b;display:grid;place-items:center;font-size:40px;font-weight:700;border:3px solid #09090a}
.pp h1{margin:6px 0 0;font-size:30px;letter-spacing:-.03em}.pp .mudo{color:#a1a1aa;margin:0;font-size:14.5px}
.chip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 11px;border-radius:999px;font-size:12.5px;font-weight:600;background:color-mix(in srgb,var(--c) 16%,transparent);color:color-mix(in srgb,var(--c) 85%,white)}
.linha{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.pp h2{font-size:15px;margin:0 0 10px;letter-spacing:-.01em}
.bloco{padding:18px;border-radius:20px;background:#111113;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}
.selos{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.selo{padding:12px;border-radius:14px;background:#18181b;display:grid;gap:4px}.selo b{font-size:13.5px}.selo small{font-size:12px;color:#a1a1aa}
.selo i{width:30px;height:30px;border-radius:9px;display:block;background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 40%,#000))}
.certs a{display:flex;justify-content:space-between;gap:10px;padding:12px 0;border-top:1px solid rgba(255,255,255,.07);text-decoration:none;font-size:14.5px}.certs a:first-of-type{border-top:0}.certs small{color:#a1a1aa}
.criacoes{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}.criacao{border-radius:14px;overflow:hidden;background:#18181b;text-decoration:none;display:grid}.criacao img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block}.criacao span{padding:10px;font-size:13px;font-weight:600}
.cta{text-align:center;display:grid;gap:10px;justify-items:center}.cta p{margin:0;color:#a1a1aa;font-size:14px}
`;

export function paginaPerfil(a, { url }) {
  const ini = String(a.nome || '?').trim()[0].toUpperCase();
  const selos = (a.selos || []).map((s) => `<div class="selo" style="--c:${esc(s.cor || '#ff7a00')}"><i></i><b>${esc(s.nome)}</b><small>${esc(s.descricao || '')}</small></div>`).join('');
  const certs = (a.certificados || []).map((c) => `<a href="/certificado/${esc(c.codigo)}"><span>${esc(c.curso_titulo)}</span><small>${esc(dataLonga(c.emitido_em))}</small></a>`).join('');
  const criacoes = (a.criacoes || []).map((c) => `<a class="criacao" href="${esc(c.link || c.imagem_url || '#')}" target="_blank" rel="noopener nofollow">${c.imagem_url ? `<img src="${esc(c.imagem_url)}" alt="" loading="lazy">` : ''}<span>${esc(c.titulo)}${c.status === 'destaque' ? ' · destaque' : ''}</span></a>`).join('');
  const links = (a.links || []).map((l) => `<a class="bt" href="${esc(l.url)}" target="_blank" rel="noopener nofollow">${esc(l.titulo || l.url.replace(/^https:\/\//, ''))}</a>`).join('');
  const corpo = `<main class="pp">
<div class="pp-topo"><a class="logo" href="https://agenciasetup.com.br">${LOGO}Agência Setup</a></div>
<section class="pp-cartao">
  <div class="av${a.moldura ? ' moldura' : ''}">${a.foto_url ? `<img src="${esc(a.foto_url)}" alt="">` : `<span>${esc(ini)}</span>`}</div>
  <h1>${esc(a.nome)}</h1>
  <p class="mudo">@${esc(a.usuario)}${a.instagram ? ` · <a href="https://instagram.com/${esc(a.instagram)}" target="_blank" rel="noopener">Instagram @${esc(a.instagram)}</a>` : ''}</p>
  <div class="linha"><span class="chip" style="--c:#ff7a00">${esc(a.nivel.nome)} · ${a.nivel.xp} XP</span>${a.area ? `<span class="chip" style="--c:#8e8e93">${esc(a.area)}</span>` : ''}${a.cidade ? `<span class="chip" style="--c:#8e8e93">${esc(a.cidade)}</span>` : ''}</div>
  ${a.bio ? `<p class="mudo">${esc(a.bio)}</p>` : ''}
  ${links ? `<div class="linha">${links}</div>` : ''}
</section>
${criacoes ? `<section class="bloco"><h2>Criações</h2><div class="criacoes">${criacoes}</div></section>` : ''}
${selos ? `<section class="bloco"><h2>Selos</h2><div class="selos">${selos}</div></section>` : ''}
${certs ? `<section class="bloco certs"><h2>Certificados</h2>${certs}</section>` : ''}
<div class="cta"><p>${esc(a.nome.split(' ')[0])} estuda com a Agência Setup: IA aplicada ao social media e ao design.</p><a class="bt bt-marca" href="https://agenciasetup.com.br/cursos">Conhecer os cursos</a></div>
</main>`;
  return casca({ titulo: `${a.nome} (@${a.usuario}) · Agência Setup`, descricao: a.bio || `${a.nome} na área de membros da Agência Setup.`, url, imagem: a.foto_url, corpo, css: CSS_PERFIL });
}

export function paginaNaoAchada(texto = 'Esta página não existe ou foi retirada.') {
  return casca({ titulo: 'Não encontrado', descricao: texto, url: '', corpo: `<main style="min-height:100dvh;display:grid;place-items:center;padding:24px;text-align:center"><div style="display:grid;gap:16px;justify-items:center"><span class="logo">${LOGO}Agência Setup</span><p style="color:#a1a1aa;margin:0">${esc(texto)}</p><a class="bt" href="/">Ir para a área do aluno</a></div></main>` });
}
