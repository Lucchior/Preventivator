/**
 * service-worker.js — Preventivator
 * Strategia: cache-first per asset locali, stale-while-revalidate per CDN.
 * Aggiorna la cache automaticamente ad ogni nuova versione dell'app.
 *
 * IMPORTANTE: aggiornare CACHE_VERSION ad ogni deploy che modifica i file.
 */

const CACHE_VERSION  = 'v1.5.0';
const CACHE_NAME     = `preventivator-${CACHE_VERSION}`;
const CACHE_CDN_NAME = `preventivator-cdn-${CACHE_VERSION}`;

// Asset locali da precachare all'installazione
const LOCAL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/app.js',
  './js/calc.js',
  './js/storage.js',
  './js/utils.js',
  './js/models.js',
  './js/ui-machines.js',
  './js/ui-materials.js',
  './js/ui-jobs.js',
  './js/ui-summary.js',
  './js/ui-profile.js',
  './js/ui-pdf.js',
  './js/ui-io.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
];

// Origini CDN da cachare al primo utilizzo
const CDN_ORIGINS = [
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
];

// ── Install: precache tutti gli asset locali ──────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.info('[SW] Precaching asset locali…');
        return cache.addAll(LOCAL_ASSETS.map(url => new URL(url, self.location.href).href));
      })
      .then(() => {
        console.info(`[SW] Installato: ${CACHE_NAME}`);
        return self.skipWaiting(); // attiva subito la nuova versione
      })
      .catch(err => console.error('[SW] Errore precaching:', err))
  );
});

// ── Activate: elimina le cache vecchie ────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('preventivator-') && key !== CACHE_NAME && key !== CACHE_CDN_NAME)
          .map(key => {
            console.info(`[SW] Elimino cache obsoleta: ${key}`);
            return caches.delete(key);
          })
      ))
      .then(() => {
        console.info(`[SW] Attivo: ${CACHE_NAME}`);
        return self.clients.claim(); // prende controllo di tutte le tab aperte
      })
  );
});

// ── Fetch: strategia per tipo di risorsa ─────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignora richieste non GET e chrome-extension
  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // ── CDN (jsPDF, html2canvas, idb): stale-while-revalidate ──────────
  if (CDN_ORIGINS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(event.request, CACHE_CDN_NAME));
    return;
  }

  // ── Asset locali: cache-first con fallback network ──────────────────
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request, CACHE_NAME));
    return;
  }

  // ── Tutto il resto: network-first ──────────────────────────────────
  event.respondWith(networkFirst(event.request));
});

// ── Strategie di caching ──────────────────────────────────────────────────────

/** Cache-first: usa la cache se disponibile, altrimenti rete. */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline e non in cache: restituisce index.html come fallback
    const fallback = await caches.match(new URL('./', self.location.href).href);
    return fallback || new Response('Offline — riapri quando sei connesso.', { status: 503 });
  }
}

/** Stale-while-revalidate: risponde subito con la cache, aggiorna in background. */
async function staleWhileRevalidate(request, cacheName) {
  const cache    = await caches.open(cacheName);
  const cached   = await cache.match(request);
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || await fetchPromise || new Response('', { status: 503 });
}

/** Network-first: prova la rete, usa la cache come fallback. */
async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch {
    return await caches.match(request) || new Response('', { status: 503 });
  }
}

// ── Messaggio dal client (es. forza aggiornamento) ────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
