// fast-tiny-tts Service Worker - Auto-updating offline cache
const CACHE_NAME = 'fast-tiny-tts-v6';

// Static assets to pre-cache
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './favicon.svg',
  './dist/web/fast-tiny-tts.js',
  './dist/onnxruntime-web/ort.all.min.mjs',
  './dist/onnxruntime-web/ort-wasm-simd-threaded.wasm',
  './dist/onnxruntime-web/ort-wasm-simd-threaded.mjs',
  './dist/onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm',
  './dist/onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs',
  './dist/models/tiny-voca/model.onnx',
  './dist/models/tiny-voca/config.json',
  './dist/models/tiny-voca/phonemizer/lexicon.tsv',
];

// Install: pre-cache and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const scope = self.registration.scope;
      const cache = await caches.open(CACHE_NAME);
      const urls = PRECACHE_ASSETS.map((rel) => new URL(rel, scope).href);
      console.log('[SW] Pre-caching static assets (v6)...');
      await Promise.all(
        urls.map(async (url) => {
          try {
            const resp = await fetch(url, { credentials: 'same-origin', cache: 'no-cache' });
            if (resp.ok) await cache.put(url, resp);
          } catch (e) {
            console.warn('[SW] Pre-cache skipped:', url);
          }
        })
      );
    })()
  );
});

// Activate: clean up ALL old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
      console.log('[SW] Activated & claimed clients (v5).');
    })()
  );
});

// Fetch routing
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET and backend API requests
  if (req.method !== 'GET') return;
  if (url.pathname.includes('/api/')) return;
  if (url.origin !== location.origin) return;

  const isHtml = req.mode === 'navigate' ||
                 req.destination === 'document' ||
                 url.pathname.endsWith('.html') ||
                 url.pathname.endsWith('/');

  const isScriptOrCode = url.pathname.endsWith('.js') ||
                         url.pathname.endsWith('.mjs') ||
                         url.pathname.endsWith('.json');

  // 1. Navigation & HTML: NETWORK-FIRST so app updates are NEVER blocked by stale HTML
  if (isHtml) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: 'no-cache' });
          if (fresh && fresh.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(req, fresh.clone());
            return fresh;
          }
        } catch (err) {
          // Network failed (offline)
        }
        const cached = await caches.match(req) || await caches.match('./index.html') || await caches.match('./');
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      })()
    );
    return;
  }

  // 2. Scripts & JS Code: NETWORK-FIRST with cache fallback (ensures new builds load instantly)
  if (isScriptOrCode && (url.pathname.includes('fast-tiny-tts') || url.pathname.includes('sw.js'))) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: 'no-cache' });
          if (fresh && fresh.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(req, fresh.clone());
            return fresh;
          }
        } catch (err) {
          // Network failed
        }
        const cached = await caches.match(req);
        if (cached) return cached;
        return fetch(req);
      })()
    );
    return;
  }

  // 3. Static large models, WASM, Lexicon TSV: CACHE-FIRST with network fallback for speed
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        if (fresh && fresh.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (err) {
        return cached || new Response('Asset unavailable offline', { status: 503 });
      }
    })()
  );
});
