// Checkout: formulário, Pix ao vivo e tela de obrigado. O preço que vale é o do servidor; aqui é só para mostrar.
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const D = JSON.parse(($('#ck-dados') || {}).textContent || '{}');
  // Chegou direto no checkout com marca de origem (anúncio, link da bio): vira um toque antes da compra.
  if (/[?&](utm_[a-z]+|fbclid|gclid|ttclid|de)=/.test(location.search) || (document.referrer && !/agenciasetup\.com/.test(document.referrer))) {
    fetch('/api/toque', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: location.href, referrer: document.referrer }), keepalive: true }).catch(() => {});
  }
  const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const R = D.rastreio || {};
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const evento = (nome, dados = {}, id) => {
    try {
      if (R.meta && window.fbq) window.fbq('track', nome === 'compra' ? 'Purchase' : 'InitiateCheckout', dados.value ? { currency: 'BRL', value: dados.value } : {}, id ? { eventID: id } : undefined);
      if (window.gtag) {
        if (nome === 'compra') {
          window.gtag('event', 'purchase', { transaction_id: id, value: dados.value, currency: 'BRL' });
          if (R.ads) window.gtag('event', 'conversion', { send_to: R.ads, value: dados.value, currency: 'BRL', transaction_id: id });
        } else window.gtag('event', 'begin_checkout', { currency: 'BRL', value: dados.value });
      }
    } catch {}
  };
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;
  const api = async (url, corpo) => {
    const r = await fetch(url, corpo ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) } : {});
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.erro || 'Não deu certo. Tente de novo.'), { dados: d });
    return d;
  };

  // ---------------------------------------------------------------- tela de obrigado
  if (!D.oferta && D.pedido) {
    const titulo = $('#ok-titulo'), texto = $('#ok-texto'), bola = $('#bola'), entrar = $('#entrar');
    const ver = async () => {
      try {
        const p = await api(`/api/checkout/pedido/${D.pedido}`);
        if (p.status === 'pago') {
          try { if (!sessionStorage.getItem(`compra:${p.id}`)) { sessionStorage.setItem(`compra:${p.id}`, '1'); evento('compra', { value: p.total_centavos / 100 }, p.id); } } catch {}
          mostrarDepois(p);
          bola.innerHTML = '<svg class="i" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>';
          titulo.textContent = 'Pagamento confirmado. Seu acesso está pronto.';
          texto.textContent = `Também mandamos o link de entrada para ${p.email || 'o seu e-mail'}.`;
          entrar.href = `${p.curso_url}/entrar?pedido=${encodeURIComponent(p.id)}`;
          entrar.hidden = false;
          // Entrega fora da nossa área (ex.: o combo, liberado na Hubla pela equipe): diz onde o acesso chega, sem "entrar".
          if (p.externa) {
            titulo.textContent = 'Pagamento confirmado!';
            texto.textContent = `Agora a gente libera ${p.externa.o_que || 'o seu acesso'} na ${p.externa.plataforma}${p.externa.prazo ? ` ${p.externa.prazo}` : ''}. O acesso chega em ${p.email || 'o seu e-mail'}, num convite da ${p.externa.plataforma}: é só aceitar.`;
            entrar.hidden = true;
            // Levou junto um curso nosso (ex.: o mini curso como bump): esse já está liberado aqui.
            if (p.externa.aqui && p.externa.aqui.length) {
              texto.textContent += ` E ${p.externa.aqui.join(' e ')} já está liberado na nossa área: entre pelo botão.`;
              entrar.hidden = false;
            }
          }
          // Curso de leitura: o PDF começa a baixar sozinho (uma vez) e fica o botão, para quem não viu o download.
          const pdf = $('#pdf');
          if (p.leitura) {
            titulo.textContent = 'Pronto! Seu livro está aqui.';
            texto.textContent = p.pdf ? `O PDF já está baixando. Também mandamos tudo para ${p.email || 'o seu e-mail'}.` : `Também mandamos tudo para ${p.email || 'o seu e-mail'}.`;
            if (p.pdf && pdf) {
              pdf.href = p.pdf;
              pdf.hidden = false;
              try {
                if (!sessionStorage.getItem(`pdf:${p.id}`)) {
                  sessionStorage.setItem(`pdf:${p.id}`, '1');
                  const f = document.createElement('iframe');
                  f.hidden = true;
                  f.src = p.pdf;
                  document.body.appendChild(f);
                }
              } catch {}
            }
          }
          if ($('#simular')) $('#simular').hidden = true;
          return;
        }
        if (['recusado', 'expirado', 'cancelado'].includes(p.status)) {
          bola.className = 'bola ruim';
          bola.innerHTML = '<svg class="i" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
          titulo.textContent = p.status === 'recusado' ? 'O pagamento não passou' : 'Este pagamento venceu';
          texto.textContent = p.status === 'recusado' ? 'O banco recusou o cartão. Tente outro cartão ou pague com Pix, que aprova na hora.' : 'Volte para a oferta e gere um pagamento novo.';
          if (p.oferta) { entrar.textContent = 'Tentar de novo'; entrar.href = `/checkout/${p.oferta}`; entrar.hidden = false; }
          return;
        }
        titulo.textContent = 'Esperando a confirmação do pagamento...';
      } catch (e) {
        texto.textContent = e.message;
      }
      setTimeout(ver, 4000);
    };
    if ($('#simular')) $('#simular').addEventListener('click', async () => { await api(`/api/checkout/simular/${D.pedido}`, {}).catch(() => {}); });
    // Upsell de 1 toque (e o downsell, se recusar): Pix na hora, sem preencher nada de novo.
    let depoisCarregado = false;
    async function mostrarDepois(p) {
      if (depoisCarregado) return;
      depoisCarregado = true;
      const box = $('#upsell');
      let ofertas;
      try { ofertas = await api(`/api/checkout/pedido/${p.id}/depois`); } catch { return; }
      const mostra = (o, eDownsell) => {
        if (!o) { box.hidden = true; return; }
        const preco = o.pix_desconto_pct ? Math.round(o.preco_centavos * (1 - o.pix_desconto_pct / 100)) : o.preco_centavos;
        box.hidden = false;
        box.innerHTML = `<div class="upsell"><span class="etiqueta">${eDownsell ? 'Última chance' : 'Só agora, para quem acabou de comprar'}</span><b>${esc(o.titulo)}</b>${o.texto ? `<p>${esc(o.texto)}</p>` : ''}<p><span class="preco-b">${brl(preco)} no Pix</span>${o.preco_de_centavos ? ` <s class="fraco">${brl(o.preco_de_centavos)}</s>` : ''}</p><div class="acoes"><button class="bt bt-marca bt-p" id="up-sim" type="button">Quero, gerar o Pix</button><button class="bt bt-p" id="up-nao" type="button">Não, obrigado</button></div><div id="up-pix"></div></div>`;
        $('#up-nao').onclick = () => (eDownsell || !ofertas.downsell ? (box.hidden = true) : mostra(ofertas.downsell, true));
        $('#up-sim').onclick = async () => {
          $('#up-sim').disabled = true;
          try {
            const r = await api('/api/checkout/upsell', { pedido: p.id, oferta: o.slug, metodo: 'pix' });
            $('#up-pix').innerHTML = `<div class="qr">${r.pix.qr ? `<img src="${r.pix.qr}" alt="QR do Pix">` : ''}</div><div class="copia"><code>${esc(r.pix.copia)}</code><button class="bt bt-p" type="button" id="up-copiar">Copiar</button></div><span class="esperando"><span class="giro"></span>Esperando o pagamento...</span>${r.simulado ? '<button class="bt bt-p" type="button" id="up-simular">Simular pagamento (só no computador)</button>' : ''}`;
            $('#up-copiar').onclick = () => navigator.clipboard.writeText(r.pix.copia).catch(() => {});
            if ($('#up-simular')) $('#up-simular').onclick = () => api(`/api/checkout/simular/${r.pedido}`, {}).catch(() => {});
            const segue = async () => { try { const q = await api(`/api/checkout/pedido/${r.pedido}`); if (q.status === 'pago') { $('#up-pix').innerHTML = '<p class="marca-texto"><b>Pronto! Já está na sua área.</b></p>'; evento('compra', { value: q.total_centavos / 100 }, q.id); return; } } catch {} setTimeout(segue, 4000); };
            segue();
          } catch (e) { $('#up-pix').innerHTML = `<p class="erro-geral">${esc(e.message)}</p>`; $('#up-sim').disabled = false; }
        };
      };
      mostra(ofertas.upsell || ofertas.downsell, !ofertas.upsell);
    }
    ver();
    return;
  }
  if (!D.oferta) return;

  // ---------------------------------------------------------------- formulário
  let metodo = ($('[data-metodo][aria-pressed="true"]') || {}).dataset?.metodo || 'pix';
  // Quem mora fora do Brasil (só com a chave ligada no painel): sem CPF, com país; cartão à vista.
  let fora = false;
  const parcela = (base, n) => {
    if (n <= 1 || !D.juros) return Math.ceil(base / Math.max(1, n));
    return Math.ceil((base * D.juros) / (1 - Math.pow(1 + D.juros, -n)));
  };
  const bumpsMarcados = () => $$('[data-bump]').filter((b) => b.checked).map((b) => b.dataset.bump);
  const indicado = new URLSearchParams(location.search).get('indicado');
  // Cotação do servidor: vale quando há cupom ou upgrade (quem já tem o produto anterior paga a diferença).
  let cotacao = null, cotando = 0;
  async function cotar() {
    const cupom = ($('#cupom') || {}).value || '';
    const email = $('#email').value;
    if (!cupom && !(D.upgrade && /@/.test(email))) { cotacao = null; desenha(); return; }
    const vez = ++cotando;
    try {
      const r = await api('/api/checkout/preco', { oferta: D.oferta, email, cupom: cupom || null, metodo, parcelas: metodo === 'cartao' && !fora ? +($('#parcelas').value || 1) : 1, bumps: bumpsMarcados(), ...(fora ? { estrangeiro: true } : {}) });
      if (vez !== cotando) return;
      cotacao = { ...r, metodo, bumps: bumpsMarcados().join(',') };
      const msg = $('#cupom-msg');
      if (msg) { msg.textContent = r.erro_cupom ? r.erro_cupom : r.cupom ? `Cupom ${r.cupom.codigo} aplicado.` : ''; msg.className = r.erro_cupom ? 'msg-erro' : 'msg-ok'; }
    } catch (e) { cotacao = null; }
    desenha();
  }
  function desenha() {
    if (cotacao && cotacao.metodo === metodo && cotacao.bumps === bumpsMarcados().join(',') && (metodo === 'pix' || cotacao.parcelas === +($('#parcelas').value || 1))) {
      const c = cotacao;
      let linhas = c.itens.map((i) => `<div><span>${i.nome}</span><span class="num">${brl(i.centavos)}</span></div>`).join('');
      if (c.desconto) linhas += `<div class="desconto"><span>Descontos${c.cupom ? ` (cupom ${c.cupom.codigo})` : ''}${c.upgrade_centavos ? ' (upgrade)' : ''}${metodo === 'pix' && D.pix_desconto ? ' e Pix' : ''}</span><span class="num">- ${brl(c.desconto)}</span></div>`;
      if (c.juros) linhas += `<div><span>Juros do parcelamento</span><span class="num">${brl(c.juros)}</span></div>`;
      linhas += `<div class="total"><span>Total</span><span class="num">${brl(c.total)}</span></div>`;
      $('#ck-linhas').innerHTML = linhas;
      $('#pagar').textContent = metodo === 'pix' ? `Gerar Pix de ${brl(c.total)}` : c.parcelas > 1 ? `Pagar ${c.parcelas}x de ${brl(c.parcela)} no cartão` : `Pagar ${brl(c.total)} no cartão`;
      return;
    }
    const extras = D.bumps.filter((b) => bumpsMarcados().includes(b.id));
    const sub = D.preco + extras.reduce((s, b) => s + b.preco, 0);
    let linhas = `<div><span>${D.nome}</span><span class="num">${brl(D.preco)}</span></div>` + extras.map((b) => `<div><span>${b.nome}</span><span class="num">${brl(b.preco)}</span></div>`).join('');
    let total = sub, botao = 'Continuar';
    if (metodo === 'pix') {
      const d = Math.round((sub * D.pix_desconto) / 100);
      total = sub - d;
      if (d) linhas += `<div class="desconto"><span>Desconto no Pix</span><span class="num">- ${brl(d)}</span></div>`;
      botao = `Gerar Pix de ${brl(total)}`;
    } else {
      const sel = $('#parcelas'), atual = +sel.value || 1;
      // Parcela mínima de R$ 5 (regra do Asaas), igual ao cálculo do servidor.
      let max = fora ? 1 : D.parcelas_max;
      while (max > 1 && parcela(sub, max) < 500) max--;
      sel.innerHTML = Array.from({ length: max }, (_, i) => { const n = i + 1, p = parcela(sub, n); return `<option value="${n}">${n}x de ${brl(p)}${n === 1 || !D.juros ? ' sem juros' : ` (total ${brl(p * n)})`}</option>`; }).join('');
      sel.value = String(Math.min(atual, max));
      const n = +sel.value, p = parcela(sub, n);
      total = n > 1 ? p * n : sub;
      $('#parcelas-txt').textContent = D.juros ? `A partir de 2x, juros de ${(D.juros * 100).toFixed(2).replace('.', ',')}% ao mês, já somados no total.` : 'Sem juros.';
      if (total > sub) linhas += `<div><span>Juros do parcelamento</span><span class="num">${brl(total - sub)}</span></div>`;
      botao = n > 1 ? `Pagar ${n}x de ${brl(p)} no cartão` : `Pagar ${brl(total)} no cartão`;
    }
    linhas += `<div class="total"><span>Total</span><span class="num">${brl(total)}</span></div>`;
    $('#ck-linhas').innerHTML = linhas;
    $('#pagar').textContent = botao;
  }
  $$('[data-metodo]').forEach((b) => b.addEventListener('click', () => {
    metodo = b.dataset.metodo;
    $$('[data-metodo]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('#m-pix').hidden = metodo !== 'pix';
    $('#m-cartao').hidden = metodo !== 'cartao';
    desenha();
    if (cotacao) cotar();
  }));
  // Vindo da página de venda pelo botão "Vitalício por + R$ ...": o bump já chega marcado (?com=<slug do bump>).
  const com = new URLSearchParams(location.search).get('com');
  if (com) $$('[data-bump]').forEach((b) => { if (b.dataset.slug === com) b.checked = true; });
  $$('[data-bump]').forEach((b) => b.addEventListener('change', () => { desenha(); if (cotacao) cotar(); }));
  // Vindo do app do aluno (etiqueta das aulas): e-mail e nome já preenchidos. O <head> tirou os dois do endereço.
  const pre = window.__pre || {};
  if (pre.email && !$('#email').value) $('#email').value = pre.email;
  if (pre.nome && !$('#nome').value) $('#nome').value = pre.nome;
  if (D.upgrade && pre.email) cotar();
  // Link da recuperação (e-mail ou WhatsApp): busca nome, e-mail e celular com o id. Nunca vem CPF. O que a pessoa já
  // digitou não é trocado.
  if (pre.r) api(`/api/checkout/retomar/${encodeURIComponent(pre.r)}`).then((c) => {
    if (c.email && !$('#email').value) $('#email').value = c.email;
    if (c.nome && !$('#nome').value) $('#nome').value = c.nome;
    if (c.celular && !$('#celular').value) { $('#celular').value = c.celular; $('#celular').dispatchEvent(new Event('input')); }
    if (D.upgrade && c.email) cotar();
  }).catch(() => {});
  // Guarda o contato quando a pessoa sai de um campo ou da página: quem desiste antes de clicar em comprar também pode ser
  // ajudado depois. Só com e-mail válido, e nunca o CPF. Se falhar, a compra segue igual.
  let contatoEnviado = '';
  const guardaContato = () => {
    const email = $('#email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    const c = { oferta: D.oferta, email, nome: $('#nome').value, celular: $('#celular').value, ...(fora ? { estrangeiro: true, ddi: $('#ddi').value } : {}) };
    const s = JSON.stringify(c);
    if (s === contatoEnviado) return;
    contatoEnviado = s;
    fetch('/api/checkout/contato', { method: 'POST', headers: { 'content-type': 'application/json' }, body: s, keepalive: true }).catch(() => {});
  };
  ['#email', '#nome', '#celular'].forEach((c) => $(c).addEventListener('change', guardaContato));
  addEventListener('pagehide', guardaContato);
  if ($('#parcelas')) $('#parcelas').addEventListener('change', () => { desenha(); if (cotacao) cotar(); });
  if ($('#aplicar-cupom')) $('#aplicar-cupom').addEventListener('click', cotar);
  if ($('#cupom')) $('#cupom').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); cotar(); } });
  if (D.upgrade) $('#email').addEventListener('change', cotar);
  if ($('#e-presente')) $('#e-presente').addEventListener('change', () => { $('#presente-campos').hidden = !$('#e-presente').checked; if ($('#e-presente').checked) $('#p-email').focus(); });
  $('#tem-cupom').addEventListener('click', () => { $('#tem-cupom').hidden = true; $('#cupom-linha').hidden = false; $('#cupom').focus(); });

  // Máscaras leves de CPF e celular.
  const mascara = (el, fn) => el.addEventListener('input', () => { el.value = fn(el.value.replace(/\D/g, '')); });
  mascara($('#cpf'), (d) => d.slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})-?(\d{1,2})$/, '$1-$2'));
  $('#celular').addEventListener('input', () => {
    if (fora) return;
    const el = $('#celular'), d = el.value.replace(/\D/g, '');
    el.value = d.slice(0, 11).replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2');
  });

  // "Moro fora do Brasil / não tenho CPF": some o CPF, aparece o país, o celular ganha o código do país e o pagamento
  // fica só no cartão, à vista (regra do Asaas para pagador estrangeiro). O valor continua em reais.
  const ddiDoPais = () => { const o = $('#pais') && $('#pais').selectedOptions[0]; return o ? o.dataset.ddi : ''; };
  function modoFora(liga) {
    fora = liga;
    erroCampo(null);
    $('[data-campo="cpf"]').hidden = liga;
    $('#campo-pais').hidden = !liga;
    $('#ddi').hidden = !liga;
    $('#celular-rotulo').textContent = liga ? 'Celular com o código do país' : 'Celular com DDD';
    $('#celular').value = '';
    $('#celular').maxLength = liga ? 18 : 15;
    $('#celular').placeholder = liga ? '912 345 678' : '';
    if (liga) $('#ddi').value = ddiDoPais() ? `+${ddiDoPais()}` : '+';
    $('#de-fora').textContent = liga ? 'Moro no Brasil e tenho CPF' : 'Moro fora do Brasil / não tenho CPF';
    $('#de-fora').setAttribute('aria-expanded', String(liga));
    const pix = $('[data-metodo="pix"]'), cartao = $('[data-metodo="cartao"]');
    if (pix) pix.hidden = liga;
    if (liga && cartao) cartao.click();
    else if (!liga && pix) pix.click();
    $('#cartao-txt').textContent = liga ? 'à vista' : $('#cartao-txt').dataset.br;
    $('.metodos').classList.toggle('um', liga);
    $('#m-fora').hidden = !liga;
    $('#campo-parcelas').hidden = liga;
    desenha();
    if (cotacao) cotar();
    (liga ? $('#pais') : $('#cpf')).focus();
  }
  if (D.estrangeiros && $('#de-fora')) {
    $('#de-fora').addEventListener('click', () => modoFora(!fora));
    $('#pais').addEventListener('change', () => { $('#ddi').value = ddiDoPais() ? `+${ddiDoPais()}` : '+'; if (!ddiDoPais()) $('#ddi').focus(); });
  }

  // A caixa de aceite da licença (só na oferta que pede, ex.: a Família Calango): o botão de pagar fica apagado e não
  // segue enquanto ela está desmarcada. O servidor confere de novo.
  const caixaAceite = $('#aceite');
  if (caixaAceite) {
    const marcar = () => { $('#pagar').setAttribute('aria-disabled', caixaAceite.checked ? 'false' : 'true'); if (caixaAceite.checked) { const c = $('.ck-aceite.erro'); if (c) { c.classList.remove('erro'); const m = c.querySelector('.msg-erro'); if (m) m.remove(); } } };
    caixaAceite.addEventListener('change', marcar);
    marcar();
  }

  function erroCampo(campo, msg) {
    $$('.campo.erro, .ck-aceite.erro').forEach((c) => { c.classList.remove('erro'); const m = c.querySelector('.msg-erro'); if (m) m.remove(); });
    $('#erro').hidden = true;
    if (!campo) return;
    const c = $(`[data-campo="${campo}"]`);
    if (c) { c.classList.add('erro'); c.insertAdjacentHTML('beforeend', `<span class="msg-erro">${msg}</span>`); c.querySelector('input:not([hidden]), select')?.focus(); }
    else { $('#erro').textContent = msg; $('#erro').hidden = false; }
  }

  let pedido = null, relogio = null;
  $('#ck-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    erroCampo(null);
    if (caixaAceite && !caixaAceite.checked) { erroCampo('aceite', 'Para continuar, marque que leu e aceita a licença e o termo.'); return; }
    const corpo = {
      ...(caixaAceite ? { aceite: { marcado: caixaAceite.checked, versao: D.aceite } } : {}),
      oferta: D.oferta, email: $('#email').value, nome: $('#nome').value, cpf: fora ? null : $('#cpf').value, celular: $('#celular').value,
      ...(fora ? { estrangeiro: true, pais: $('#pais').value, ddi: $('#ddi').value } : {}),
      metodo, parcelas: metodo === 'cartao' && !fora ? +$('#parcelas').value : 1, bumps: bumpsMarcados(), cupom: $('#cupom').value || null,
      turnstile: (document.querySelector('[name="cf-turnstile-response"]') || {}).value || null,
      indicado: indicado || null,
      presente: $('#e-presente') && $('#e-presente').checked ? { email: $('#p-email').value, nome: $('#p-nome').value, mensagem: $('#p-msg').value } : null,
    };
    evento('inicio', { value: cotacao ? cotacao.total / 100 : D.preco / 100 });
    const bt = $('#pagar'), txt = bt.textContent;
    bt.disabled = true; bt.textContent = 'Um instante...';
    try {
      const r = await api('/api/checkout', corpo);
      pedido = r;
      if (r.pagar_em) { location.href = r.pagar_em; return; }
      mostraPix(r);
    } catch (err) {
      const d = err.dados || {};
      erroCampo(d.campo || 'geral', err.message);
      if (!d.campo) { $('#erro').textContent = err.message; $('#erro').hidden = false; }
      if (window.turnstile) window.turnstile.reset();
    } finally {
      bt.disabled = false; bt.textContent = txt;
    }
  });

  function mostraPix(r) {
    $('#ck-form').hidden = true;
    $('#ck-pix').hidden = false;
    $('#ck').classList.add('no-pix');
    $('#pix-valor').textContent = brl(r.total_centavos);
    $('#pix-cod').textContent = r.pix.copia;
    $('#qr').innerHTML = r.pix.qr ? `<img src="${r.pix.qr}" alt="QR do Pix">` : '<canvas width="232" height="232" aria-label="QR de exemplo"></canvas>';
    if (!r.pix.qr) qrDeExemplo($('#qr canvas'));
    const fim = new Date(r.pix.vence).getTime();
    clearInterval(relogio);
    relogio = setInterval(() => { const s = (fim - Date.now()) / 1000; $('#pix-tempo').textContent = mmss(Math.max(0, s)); if (s <= 0) clearInterval(relogio); }, 1000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    acompanha();
  }
  async function acompanha() {
    try {
      const p = await api(`/api/checkout/pedido/${pedido.pedido}`);
      if (p.status === 'pago') { location.href = `/checkout/obrigado?pedido=${pedido.pedido}`; return; }
      if (p.status === 'expirado') { $('.esperando').innerHTML = 'Este Pix venceu. <a href="">Gerar outro</a>'; return; }
    } catch {}
    setTimeout(acompanha, 4000);
  }
  $('#copiar').addEventListener('click', async () => {
    const t = $('#pix-cod').textContent;
    try { await navigator.clipboard.writeText(t); $('#copiar').lastChild.textContent = 'Copiado'; } catch {
      const r = document.createRange(); r.selectNodeContents($('#pix-cod')); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    }
  });
  if ($('#simular')) $('#simular').addEventListener('click', () => api(`/api/checkout/simular/${pedido.pedido}`, {}).catch((e) => alert(e.message)));

  // Só no simulado: desenho com os 3 cantos de um QR, sem codificar nada.
  function qrDeExemplo(c) {
    const x = c.getContext('2d'), N = 29, u = c.width / N;
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#111';
    let seed = 7; const r = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (r() > 0.52) x.fillRect(i * u, j * u, u, u);
    const canto = (a, b) => { x.fillStyle = '#fff'; x.fillRect((a - 1) * u, (b - 1) * u, 9 * u, 9 * u); x.fillStyle = '#111'; x.fillRect(a * u, b * u, 7 * u, 7 * u); x.fillStyle = '#fff'; x.fillRect((a + 1) * u, (b + 1) * u, 5 * u, 5 * u); x.fillStyle = '#111'; x.fillRect((a + 2) * u, (b + 2) * u, 3 * u, 3 * u); };
    canto(0, 0); canto(N - 7, 0); canto(0, N - 7);
  }
  desenha();
})();
