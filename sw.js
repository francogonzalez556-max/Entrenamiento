/* Service worker: la app funciona sin internet.
   Con conexión siempre busca la versión más nueva (red primero);
   sin conexión usa la copia guardada. Al publicar cambios, sube VERSION. */
const VERSION = 'entreno-v10';
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/app.css', './fonts/bebas-neue-latin-400.woff2',
  './js/data.js', './js/foods.js', './js/anim.js', './js/app.js', './js/vendor/barcode-detector.js', './js/vendor/zxing_reader.wasm',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' evita guardar archivos viejos desde la caché del navegador
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html')))
  );
});
