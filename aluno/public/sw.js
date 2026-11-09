// Service worker do app do aluno: deixa instalar na tela inicial e abre o app mesmo com a rede ruim.
// Páginas do app: rede primeiro, e a última versão guardada se cair. Sem internet, o início, o curso (lista de aulas e
// fichas) e a última aula aberta voltam da cópia guardada. O resto da API e o vídeo: sempre a rede.
// Páginas públicas (/certificado, /@usuario) não são o app: passam direto.
const CACHE = 'setup-aluno-v2';
const API_GUARDADA = /^\/api\/aluno\/(inicio|eu|cursos\/[^/]+|aulas\/[^/]+)$/;
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/']))); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (API_GUARDADA.test(u.pathname)) {
    e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request).then((m) => m || Response.json({ erro: 'Sem internet agora.' }, { status: 503 }))));
    return;
  }
  if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/certificado/') || u.pathname.startsWith('/@')) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put('/', c)); return r; }).catch(() => caches.match('/')));
    return;
  }
  if (u.pathname.startsWith('/aluno/assets/')) {
    e.respondWith(caches.match(e.request).then((m) => m || fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; })));
  }
});
