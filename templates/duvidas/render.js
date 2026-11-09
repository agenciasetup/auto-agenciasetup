// Monta o HTML de uma dúvida a partir do JSON (Curso-Duvidas/duvidas/<slug>.json). Usado pelo leitor e pelo livro.
// Os dados chegam em window.DADOS (scripts/duvidas.mjs grava _local/duvidas/dados.js).
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// Texto corrido: as aspas retas do JSON viram aspas curvas.
const txt = (t) => esc(t).replace(/&quot;(.*?)&quot;/g, '“$1”');

const ICONES = {
  busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  baixar: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14"/>',
  ouvir: '<path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z"/><path d="M16 9a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11"/>',
  letra: '<path d="M3 19 8.5 5h1L15 19M5.2 14h7.6M16 19l3-7.5h1l3 7.5M17 16.5h5"/>',
  certo: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  seta: '<path d="m9 5 7 7-7 7"/>',
  voltar: '<path d="m15 5-7 7 7 7"/>',
  avancar: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  subir: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
  copiar: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/>',
  zap: '<path d="M4.5 20 6 15.6A8 8 0 1 1 9 18.6L4.5 20Z"/><path d="M9.2 9.2c0 2.8 2.8 5.6 5.6 5.6l1.2-1.6-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2-1.6 1.2Z"/>',
};
const icone = (n) => `<svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[n]}</svg>`;

function capituloDe(slug) {
  return window.DADOS.curso.capitulos.find((c) => c.duvidas.some((d) => d.slug === slug));
}

// livro: true tira os botões que só funcionam na tela e põe a navegação do PDF (voltar ao sumário, próxima dúvida).
function duvidaHTML(d, { livro = false, proxima = null } = {}) {
  const cap = capituloDe(d.slug);
  const sumario = `<a class="pilula" href="#sumario">${icone('subir')}Voltar ao sumário</a>`;
  const topo = livro ? `<nav class="nav-livro"><a href="#cap-${cap.numero}">Capítulo ${cap.numero} · ${esc(cap.titulo)}</a>${sumario}</nav>` : '';
  // No livro, a cópia em JPEG da imagem (scripts/duvidas.mjs explica o porquê).
  const arquivo = d.imagem && (livro ? d.imagem.arquivo.replace(/\.webp$/, '.jpg') : d.imagem.arquivo);
  const img = d.imagem ? `<figure class="capa-duvida"><img src="${window.DADOS.img}${esc(arquivo)}" alt="${esc(d.imagem.alt)}"><figcaption>${esc(d.imagem.legenda)}</figcaption></figure>` : '';
  const video = d.video ? `<div class="video" data-video="${esc(d.video.id)}"></div>` : '';
  const ferramentas = livro ? '' : `<div class="ferramentas"><button class="pilula" data-ouvir>${icone('ouvir')}Ouvir</button><button class="pilula" data-letra>${icone('letra')}Letra maior</button></div>`;
  const versos = d.biblia.map((v) => `<blockquote class="verso"><p>${esc(v.texto)}</p><cite><b>${esc(v.ref)}</b>${v.nota ? ` · ${esc(v.nota)}` : ''}</cite></blockquote>`).join('');
  const igreja = d.igreja.map((c) => `<figure class="cita"><blockquote><p>${esc(c.texto)}</p></blockquote><figcaption><b>${esc(c.doc)}, ${esc(c.numero)}</b>${livro ? '' : `<br><a href="${esc(c.url)}">Ler no site do Vaticano</a>`}</figcaption></figure>`).join('');
  const botoesDiga = livro ? '' : `<div class="ferramentas"><button class="pilula" data-copiar>${icone('copiar')}Copiar</button><button class="pilula" data-zap>${icone('zap')}Mandar</button></div>`;
  const ese = d.e_se?.length ? `<section class="ab"><p class="olho">E se a conversa continuar?</p><div class="ese">${d.e_se.map((e) => `<div><b>${txt(e.pergunta)}</b><p>${txt(e.resposta)}</p></div>`).join('')}</div></section>` : '';
  const fim = livro ? `<nav class="fim-livro">${proxima ? `<a class="proxima" href="#${proxima.slug}"><span class="olho">Próxima dúvida</span><b>${esc(proxima.titulo)}</b><span class="roda">${icone('avancar')}</span></a>` : ''}${sumario}</nav>` : '';
  return `<article class="duvida" id="${esc(d.slug)}">
    ${topo}${video}${img}
    <p class="olho">Capítulo ${cap.numero} · ${d.minutos} minutos de leitura</p>
    <h1>${esc(d.titulo)}</h1>
    ${ferramentas}
    <div class="resposta"><p class="olho verde">${icone('certo')}Resposta rápida</p><p class="resposta-tx">${txt(d.resposta)}</p></div>
    <section class="ab"><p class="olho">Explicando com calma</p><div class="prosa">${d.explicacao.map((p) => `<p>${txt(p)}</p>`).join('')}</div></section>
    <section class="ab"><p class="olho ouro">Na Bíblia</p>${versos}</section>
    <section class="ab"><p class="olho ouro">A Igreja ensina</p>${igreja}</section>
    <section class="ab ab-diga"><p class="olho ouro">Se alguém te perguntar, diga</p><p class="diga-tx">${txt(d.diga)}</p>${botoesDiga}</section>
    ${ese}
    <div class="guardar"><p class="olho">Para guardar</p><p class="guardar-tx">${txt(d.guardar)}</p>${livro ? '' : `<button class="pilula" data-zap-guardar>${icone('zap')}Mandar no WhatsApp</button>`}</div>
    ${fim}
  </article>`;
}
