// fast-tiny-tts Service Worker - Offline cache for models and assets
const CACHE_NAME = 'fast-tiny-tts-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dist/web/tiny-voca.js',
  '/dist/onnxruntime-web/ort.all.min.mjs',
  '/dist/onnxruntime-web/ort-wasm-simd-threaded.wasm',
  '/dist/onnxruntime-web/ort-wasm-simd-threaded.mjs',
  '/dist/onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm',
  '/dist/onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs',
  '/dist/models/tiny-voca/model.onnx',
  '/dist/models/tiny-voca/config.json',
  '/dist/models/tiny-voca/phonemizer/lexicon.tsv',
];

// Install: cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets...');
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { credentials: 'same-origin' })));
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache first, then network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Serve from cache, update in background
        event.waitUntil(
          fetch(event.request).then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
            }
          }).catch(() => {})
        );
        return cached;
      }
      
      // Not in cache: fetch from network
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});