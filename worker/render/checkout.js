// Páginas do checkout: a da oferta (/checkout/<oferta>) e a de obrigado (/checkout/obrigado?pedido=...).
// HTML pronto do Worker + pouco JavaScript (public/estatico/checkout.js): abre rápido em qualquer celular.
// Cartão: caminho B do plano (a pessoa digita o cartão na página segura do Asaas e volta para cá).
import { esc, jsonScript } from '../nucleo/util.js';
import { parcelasPossiveis } from '../lib/vendas.js';
import { PAISES } from '../lib/paises.js';

const FONTES = 'https://fonts.googleapis.com/css2?family=Inter:wght@400..700&family=Instrument+Serif:ital@1&display=swap';
const LOGO = '<img src="/img/logo-setup-128.png" alt="" width="30" height="30">';
// Curso com marca (tema "leitura", ex.: Dúvidas da Fé): creme claro, azul e ouro da capa, a capa do livro no resumo e o botão
// de pagar verde (estatico/checkout-leitura.css).
const FONTES_LEITURA = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap';
const CRUZ = '<svg class="cruz" viewBox="0 0 16 22" aria-hidden="true"><path d="M6.6 0h2.8v6h5.6v2.8H9.4V22H6.6V8.8H1V6h5.6z"/></svg>';
const SITE = 'https://agenciasetup.com.br';
const zapDe = (marca) => (marca && marca.whatsapp ? `https://wa.me/${String(marca.whatsapp).replace(/\D/g, '')}` : null);
const I = {
  ok: '<path d="M20 6 9 17l-5-5"/>',
  escudo: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  pix: '<path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="m8.2 12 3.8-3.8 3.8 3.8-3.8 3.8z"/>',
  cartao: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
  raio: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  copiar: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  seta: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  fechar: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
};
const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Pixel da Meta, GA4 e Google Ads (Integrações > Pixel da Meta e Google). Só quando a equipe ligou.
export function rastreio(r) {
  if (!r) return '';
  let s = '';
  if (r.meta_pixel) s += `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${esc(r.meta_pixel)}');fbq('track','PageView');</script>`;
  const gtag = r.ga4 || r.google_ads;
  if (gtag) s += `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(gtag)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());${r.ga4 ? `gtag('config','${esc(r.ga4)}');` : ''}${r.google_ads ? `gtag('config','${esc(r.google_ads)}');` : ''}</script>`;
  return s;
}

// Vindo do app do aluno, o e-mail e o nome chegam depois do # (não vão ao servidor). Este script roda antes de tudo:
// guarda os dois para o checkout.js e tira do endereço, para o Pixel e o Google não verem.
// O link da recuperação traz o id (r) do mesmo jeito: o checkout busca os dados com ele.
export const PRE = '<script>(function(){try{var h=location.hash;if(h.length>1&&/(^|[#&])(email|nome|r)=/.test(h)){var p=new URLSearchParams(h.slice(1));window.__pre={email:p.get("email")||"",nome:p.get("nome")||"",r:p.get("r")||""};history.replaceState(null,"",location.pathname+location.search)}}catch(e){}})()</script>';

function pagina({ titulo, corpo, scripts = '', turnstile = false, rastrear = null, marca = null }) {
  const leitura = !!marca;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">${PRE}<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><link rel="icon" href="${leitura ? `/img/marcas/${esc(marca.curso.slug)}-192.png` : '/img/favicon.png'}" type="image/png">
<title>${esc(titulo)}</title><meta name="robots" content="noindex"><meta name="theme-color" content="${leitura ? '#FBF7EF' : '#09090a'}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${leitura ? FONTES_LEITURA : FONTES}">
<link rel="stylesheet" href="/estatico/checkout.css?v=4">${leitura ? '<link rel="stylesheet" href="/estatico/checkout-leitura.css?v=2">' : ''}${turnstile ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' : ''}${rastreio(rastrear)}
</head><body${leitura ? ' class="tema-leitura"' : ''}>
<header class="gutter"><div class="ck-topo">${leitura ? `<span class="logo">${CRUZ}${esc(marca.nome)}</span>` : `<a class="logo" href="/">${LOGO}Agência Setup</a>`}<span class="seguro">${ic('escudo')}Pagamento seguro</span></div></header>
<main class="gutter">${corpo}</main>${scripts}
</body></html>`;
}

function poster(o) {
  const p = (o.checkout && o.checkout.poster) || {};
  const nome = p.a || o.produto?.nome || o.nome;
  return `<div class="poster" style="--c:${esc(p.cor || '#ff7a00')}"><span class="tipo">${esc(p.tipo || 'Curso')}</span><span class="nome">${esc(nome)}${p.b ? `<span class="serifa">${esc(p.b)}</span>` : ''}</span><span class="pe">${esc(p.pe || '')}</span></div>`;
}

// estrangeiros: a chave "Aceitar compra de quem mora fora do Brasil" (lib/vendas.js, estrangeirosLigado). Desligada,
// a página sai exatamente como antes. Ligada, aparece o link "Moro fora do Brasil": país, celular com o código do país
// e só cartão à vista (regra do Asaas para pagador estrangeiro). Precisa de cartão na oferta.
export function paginaCheckout({ oferta, simulado, turnstileSite, rastrear = null, estrangeiros = false, marca = null }) {
  const c = oferta.checkout || {};
  const inclui = (c.inclui || []).map((t) => `<li>${ic('ok')}${esc(t)}</li>`).join('');
  const depos = (c.depoimentos || []).map((d) => `<div class="depo"><b>${esc(d.nome)}${d.quem ? ` · ${esc(d.quem)}` : ''}</b>"${esc(d.texto)}"</div>`).join('');
  const temPix = oferta.metodos.includes('pix');
  const temCartao = oferta.metodos.includes('cartao');
  const deFora = !!estrangeiros && temCartao;
  const pixDesc = Number(oferta.pix_desconto_pct) || 0;
  const dados = {
    oferta: oferta.slug, preco: oferta.preco_centavos, juros: Number(oferta.juros_mes), parcelas_max: oferta.parcelas_max,
    pix_desconto: pixDesc, bumps: oferta.bumps.map((b) => ({ id: b.id, nome: b.nome, preco: b.preco_centavos })),
    nome: oferta.nome, simulado: !!simulado, teste: !!oferta.teste, turnstile: turnstileSite || null,
    upgrade: !!(c.upgrade && c.upgrade.de_produto_id), presente: c.presente !== false, ...(deFora ? { estrangeiros: true } : {}),
    rastreio: rastrear ? { meta: !!rastrear.meta_pixel, ga4: !!rastrear.ga4, ads: rastrear.google_ads && rastrear.google_ads_rotulo ? `${rastrear.google_ads}/${rastrear.google_ads_rotulo}` : null } : null,
  };
  const corpo = `
<div class="ck" id="ck">
  <aside class="ck-resumo" aria-label="Resumo do pedido">
    <div class="ck-prod">${marca ? `<img class="ck-capa" src="/img/marcas/${esc(marca.curso.slug)}-capa.webp" alt="Capa do livro ${esc(marca.nome)}">` : poster(oferta)}<div><h1>${esc(oferta.nome)}</h1><p>${esc(c.subtitulo || 'Acesso começa na hora')}</p>${oferta.preco_de_centavos > oferta.preco_centavos ? `<p class="ck-de"><s>${brl(oferta.preco_de_centavos)}</s><b>${brl(oferta.preco_centavos)}</b><span>-${Math.round((1 - oferta.preco_centavos / oferta.preco_de_centavos) * 100)}%</span></p>` : ''}</div></div>
    ${inclui ? `<ul class="ck-inclui">${inclui}</ul>` : ''}
    <div class="ck-linhas" id="ck-linhas"><div class="total"><span>Total</span><span class="num">${brl(oferta.preco_centavos)}</span></div></div>
    <div class="ck-garantia">${ic('escudo')}<span><b>Garantia de ${oferta.garantia_dias} dias.</b> Não gostou, devolvemos tudo.</span></div>
  </aside>

  <form class="ck-form" id="ck-form" novalidate>
    ${oferta.teste ? '<div class="erro-geral">Oferta em teste: só funciona no computador e não cobra nada.</div>' : ''}
    <div class="ck-bloco">
      <h2><span class="n">1</span>Seus dados</h2>
      <div class="campos">
        <div class="campo" data-campo="email"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="email" inputmode="email" required><small>Seu acesso chega aqui.</small></div>
        <div class="campo" data-campo="nome"><label for="nome">Nome completo</label><input id="nome" name="nome" autocomplete="name" required></div>
      </div>
      <div class="campos dois">
        <div class="campo" data-campo="cpf"><label for="cpf">CPF</label><input id="cpf" name="cpf" inputmode="numeric" autocomplete="off" maxlength="14" required></div>
        ${deFora ? `<div class="campo" data-campo="pais" id="campo-pais" hidden><label for="pais">País onde você mora</label><select id="pais" name="pais" autocomplete="country">${PAISES.map((p) => `<option value="${p.codigo}" data-ddi="${p.ddi}">${esc(p.nome)}</option>`).join('')}</select></div>` : ''}
        <div class="campo" data-campo="celular"><label for="celular" id="celular-rotulo">Celular com DDD</label>${deFora ? '<div class="tel-linha"><input id="ddi" class="ddi" inputmode="tel" autocomplete="tel-country-code" maxlength="5" aria-label="Código do país" hidden>' : ''}<input id="celular" name="celular" inputmode="tel" autocomplete="tel-national" maxlength="15" required>${deFora ? '</div>' : ''}</div>
      </div>
      ${deFora ? '<button type="button" class="link-simples" id="de-fora" aria-expanded="false">Moro fora do Brasil / não tenho CPF</button>' : ''}
      <small class="ck-aviso-contato">Se a compra não terminar, podemos usar seu e-mail e celular para ajudar você a concluir. Dá para parar quando quiser.</small>
    </div>

    <div class="ck-bloco">
      <h2><span class="n">2</span>Como você quer pagar</h2>
      <div class="metodos" role="group" aria-label="Forma de pagamento">
        ${temPix ? `<button type="button" class="metodo" data-metodo="pix" aria-pressed="true">${ic('pix')}<b>Pix</b><small>${pixDesc ? `${String(pixDesc).replace('.', ',')}% de desconto` : 'aprovação na hora'}</small></button>` : ''}
        ${temCartao ? `<button type="button" class="metodo" data-metodo="cartao" aria-pressed="${temPix ? 'false' : 'true'}">${ic('cartao')}<b>Cartão</b><small id="cartao-txt" data-br="até ${parcelasPossiveis(oferta.preco_centavos, oferta)}x">até ${parcelasPossiveis(oferta.preco_centavos, oferta)}x</small></button>` : ''}
      </div>
      ${deFora ? `<div id="m-fora" class="aviso-metodo aviso-cartao" hidden>${ic('cartao')}<span>Para quem mora fora, o pagamento é no cartão internacional, à vista. O valor é em reais e o seu banco converte.</span></div>` : ''}
      <div id="m-pix" class="aviso-metodo"${temPix ? '' : ' hidden'}>${ic('raio')}<span>Aprovação na hora. O QR aparece no próximo passo e vale por ${oferta.pix_minutos} minutos.</span></div>
      <div id="m-cartao" class="campos"${temPix ? ' hidden' : ''}>
        <div class="campo" id="campo-parcelas"><label for="parcelas">Parcelas</label><select id="parcelas" name="parcelas"></select><small id="parcelas-txt"></small></div>
        <div class="aviso-metodo aviso-cartao">${ic('escudo')}<span>Você digita o cartão na página segura do Asaas, nosso banco de pagamentos, e volta para cá. O número do cartão não passa por nós.</span></div>
      </div>
    </div>

    ${oferta.bumps.length ? `<div class="ck-bloco">${oferta.bumps.map((b) => `<label class="bump${b.cor ? ' tingido' : ''}" for="bump-${esc(b.id)}"${b.cor ? ` style="--c:${esc(b.cor)}"` : ''}><input type="checkbox" id="bump-${esc(b.id)}" data-bump="${esc(b.id)}" data-slug="${esc(b.slug || '')}"><span><b>${esc(b.titulo || `Leve junto: ${b.nome}`)}</b><p>${esc(b.texto || '')} <span class="preco-b">+ ${brl(b.preco_centavos)}</span>${b.preco_de_centavos ? ` <span class="fraco"><s>${brl(b.preco_de_centavos)}</s></span>` : ''}</p></span></label>`).join('')}</div>` : ''}

    <div class="ck-bloco">
      <button type="button" class="link-simples" id="tem-cupom">Tenho um cupom</button>
      <div class="cupom-linha" id="cupom-linha" hidden><div class="campo" data-campo="cupom" style="flex:1"><label for="cupom" class="fraco">Cupom</label><input id="cupom" name="cupom" autocomplete="off" style="text-transform:uppercase"><small id="cupom-msg"></small></div><button type="button" class="bt bt-p" id="aplicar-cupom">Aplicar</button></div>
      ${c.presente !== false ? `<label class="presente-liga"><input type="checkbox" id="e-presente"> É para dar de presente</label>
      <div class="campos" id="presente-campos" hidden>
        <div class="campo" data-campo="presente"><label for="p-email">E-mail de quem vai ganhar</label><input id="p-email" type="email" inputmode="email" autocomplete="off"><small>O acesso vai para essa pessoa. Você recebe a confirmação.</small></div>
        <div class="campo"><label for="p-nome">Nome de quem vai ganhar</label><input id="p-nome" autocomplete="off"></div>
        <div class="campo"><label for="p-msg">Mensagem (opcional)</label><input id="p-msg" maxlength="500" autocomplete="off"></div>
      </div>` : ''}
    </div>

    ${turnstileSite ? `<div class="cf-turnstile" data-sitekey="${esc(turnstileSite)}" data-theme="${marca ? 'light' : 'dark'}" data-size="flexible"></div>` : ''}
    <div class="erro-geral" id="erro" role="alert" hidden></div>
    <div class="pagar-fixo">
      <button type="submit" class="bt bt-marca bt-g bt-cheio" id="pagar">Continuar</button>
      <small>Ao pagar você aceita os <a href="${marca ? SITE : ''}/termos">termos de uso</a> e a <a href="${marca ? SITE : ''}/privacidade">política de privacidade</a>.</small>
    </div>
    ${depos ? `<div class="depos">${depos}</div>` : ''}
  </form>

  <section class="ck-pix" id="ck-pix" hidden aria-live="polite">
    <span class="etiqueta" style="--c:var(--verde)">Pix gerado</span>
    <h2>Pague <span id="pix-valor"></span> no app do seu banco</h2>
    <div class="qr" id="qr"></div>
    <ol class="passos-pix"><li>Abra o app do seu banco e escolha Pix.</li><li>Leia o QR ou use o "copia e cola".</li><li>Esta tela muda sozinha quando o pagamento cair.</li></ol>
    <div class="copia"><code id="pix-cod"></code><button class="bt bt-p" type="button" id="copiar">${ic('copiar')}Copiar</button></div>
    <span class="esperando"><span class="giro"></span>Esperando o pagamento · vale por <b class="num" id="pix-tempo"></b></span>
    ${simulado ? '<button class="bt bt-p" type="button" id="simular">Simular pagamento (só no computador)</button>' : ''}
  </section>
</div>
<script type="application/json" id="ck-dados">${jsonScript(dados)}</script>`;
  return pagina({ titulo: `${oferta.nome} · Pagamento`, corpo, scripts: '<script src="/estatico/checkout.js?v=8" defer></script>', turnstile: !!turnstileSite, rastrear, marca });
}

// Curso de leitura: pago, a tela oferece o PDF (e já começa o download) e o "Ler no celular", com a ajuda no WhatsApp.
export function paginaObrigado({ pedidoId, simulado, rastrear = null, marca = null }) {
  const zap = zapDe(marca);
  const corpo = `
<div class="ck pago" id="ck">
  <section class="ok-tela" id="ok" aria-live="polite">
    <span class="bola" id="bola"><span class="giro"></span></span>
    <h2 id="ok-titulo">Conferindo o pagamento...</h2>
    <p id="ok-texto">Isso leva alguns segundos. Pode deixar esta tela aberta.</p>
    ${marca ? '<a class="bt bt-marca bt-g" id="pdf" href="#" hidden>Baixar o PDF</a>' : ''}
    <a class="bt ${marca ? 'bt-p' : 'bt-marca'} bt-g" id="entrar" href="#" hidden>${marca ? 'Ler no celular' : 'Entrar no curso'}${ic('seta')}</a>
    ${zap ? `<a class="ajuda-zap" href="${esc(zap)}">Precisa de ajuda? Fale com a gente no WhatsApp</a>` : ''}
    ${simulado ? '<button class="bt bt-p" type="button" id="simular">Simular pagamento (só no computador)</button>' : ''}
  </section>
  <section class="upsell-tela" id="upsell" hidden aria-live="polite"></section>
</div>
<script type="application/json" id="ck-dados">${jsonScript({ pedido: pedidoId, simulado: !!simulado, rastreio: rastrear ? { meta: !!rastrear.meta_pixel, ga4: !!rastrear.ga4, ads: rastrear.google_ads && rastrear.google_ads_rotulo ? `${rastrear.google_ads}/${rastrear.google_ads_rotulo}` : null } : null })}</script>`;
  return pagina({ titulo: `Pagamento · ${marca ? marca.nome : 'Agência Setup'}`, corpo, scripts: '<script src="/estatico/checkout.js?v=8" defer></script>', rastrear, marca });
}

// O link do PDF não abriu: pedido que não existe, ainda não pago ou devolvido.
export function paginaSemPdf({ marca }) {
  const zap = zapDe(marca);
  return pagina({ titulo: `PDF · ${marca.nome}`, marca, corpo: `<div class="fechada"><span class="bola ruim">${ic('fechar')}</span><h2>Não deu para abrir o PDF por este link</h2><p class="mudo">Confira se o pagamento já foi aprovado. Se você já pagou, entre no curso com o seu e-mail ou fale com a gente.</p><a class="bt bt-marca" href="/entrar">Entrar com o meu e-mail</a>${zap ? ` <a class="bt" href="${esc(zap)}">Falar no WhatsApp</a>` : ''}</div>` });
}

export function paginaFechada({ marca = null } = {}) {
  if (marca) {
    const zap = zapDe(marca);
    return pagina({ titulo: `Oferta indisponível · ${marca.nome}`, marca, corpo: `<div class="fechada"><span class="bola ruim">${ic('fechar')}</span><h2>Esta oferta não está disponível agora</h2><p class="mudo">Ela pode ter acabado ou ainda não ter começado.${zap ? ' Fale com a gente pelo WhatsApp.' : ''}</p>${zap ? `<a class="bt" href="${esc(zap)}">Falar no WhatsApp</a>` : ''}</div>` });
  }
  return pagina({ titulo: 'Oferta indisponível · Agência Setup', corpo: `<div class="fechada"><span class="bola ruim">${ic('fechar')}</span><h2>Esta oferta não está disponível agora</h2><p class="mudo">Ela pode ter acabado ou ainda não ter começado. Veja os cursos abertos.</p><a class="bt" href="/cursos">Ver os cursos</a></div>` });
}
