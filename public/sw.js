// fast-tiny-tts Service Worker - Offline cache for models and assets
const CACHE_NAME = 'fast-tiny-tts-v3';

// Install: cache all static assets relative to service worker scope
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const scope = self.registration.scope;
      const assetsToCache = [
        './',
        './index.html',
        './favicon.svg',
        './dist/web/tiny-voca.js',
        './dist/onnxruntime-web/ort.all.min.mjs',
        './dist/onnxruntime-web/ort-wasm-simd-threaded.wasm',
        './dist/onnxruntime-web/ort-wasm-simd-threaded.mjs',
        './dist/onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm',
        './dist/onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs',
        './dist/models/tiny-voca/model.onnx',
        './dist/models/tiny-voca/config.json',
        './dist/models/tiny-voca/phonemizer/lexicon.tsv',
      ].map((rel) => new URL(rel, scope).href);

      const cache = await caches.open(CACHE_NAME);
      console.log('[SW] Caching static assets for scope:', scope);
      await Promise.all(
        assetsToCache.map(async (url) => {
          try {
            const resp = await fetch(url, { credentials: 'same-origin' });
            if (resp.ok) await cache.put(url, resp);
          } catch (e) {
            console.warn('[SW] Cache prefetch skipped for:', url);
          }
        })
      );
      return self.skipWaiting();
    })()
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: cache-first with network fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and API calls
  if (event.request.method !== 'GET') return;
  if (url.pathname.includes('/api/')) return;
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Return cached and update in background
        fetch(event.request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html') || caches.match('./');
        }
      });
    })
  );
});
