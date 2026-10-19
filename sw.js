/*
 * Service worker: permite abrir la app sin internet después de la primera visita.
 * - Páginas: primero la red (para recibir actualizaciones) y, sin conexión, la copia guardada.
 * - Archivos (JS, CSS, imágenes): la copia guardada al instante y se actualiza en segundo plano.
 * Solo guarda archivos de la propia app; nunca datos personales (esos viven en localStorage).
 */
const CACHE = 'bienestar-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
