// Service worker do painel (/admin/): só os avisos no celular (Web Push). Não guarda página nem dado nenhum: o painel
// continua vindo sempre da rede, como antes. O aviso abre o app "Vendas" no pedido certo e conta no ícone quantos
// avisos chegaram desde a última vez que o app foi aberto (iPhone com iOS 16.4+ e Chrome).
const ICONE = '/admin/icone-192.png';
const CONTADOR = '/admin/__avisos';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

async function contar(mais) {
  try {
    const c = await caches.open('painel-avisos');
    const r = await c.match(CONTADOR);
    const n = mais === 0 ? 0 : (Number(r ? await r.text() : 0) || 0) + mais;
    await c.put(CONTADOR, new Response(String(n)));
    if (self.navigator && self.navigator.setAppBadge) await (n ? self.navigator.setAppBadge(n) : self.navigator.clearAppBadge());
  } catch {}
}

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { corpo: e.data ? e.data.text() : '' }; }
  const opcoes = { body: d.corpo || '', icon: ICONE, badge: ICONE, data: { url: d.url || '/admin/celular' }, timestamp: d.em || Date.now() };
  // Mesmo pedido (Pix gerado e depois venda aprovada): o aviso novo troca o anterior e toca de novo.
  if (d.tag) { opcoes.tag = d.tag; opcoes.renotify = true; }
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.titulo || 'Agência Setup', opcoes),
    d.tipo === 'teste' ? null : contar(1),
    avisarApp(d.tipo),
  ]));
});

// Com o app aberto: ele atualiza os números na hora e toca o "plim" de moeda na venda.
async function avisarApp(tipo) {
  try {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abertas) c.postMessage({ aviso: tipo || 'aviso' });
  } catch {}
}

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const alvo = new URL((e.notification.data && e.notification.data.url) || '/admin/celular', self.location.origin).href;
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const painel = abertas.find((c) => c.url.startsWith(`${self.location.origin}/admin`));
    if (painel) {
      await painel.focus().catch(() => {});
      painel.postMessage({ abrir: alvo });
      return;
    }
    await self.clients.openWindow(alvo);
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'zerar') e.waitUntil(contar(0)); });
