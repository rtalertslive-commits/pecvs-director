const CACHE_NAME = 'pecvs-director-mainnet-v2.12.0';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// NETWORK FIRST APPROACH - FORCES FRESH FETCH
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // Solo cacheamos http(s). Extensions (chrome-extension://, moz-extension://)
    // y otros schemes no soportados por Cache API.
    const url = event.request.url;
    if (!url.startsWith('http')) return;

    event.respondWith(
        fetch(event.request, { cache: 'no-store' }).then((response) => {
            // No cachear responses non-ok ni opaqueredirect (evita ERR_BLOCKED_BY_CLIENT)
            if (!response || !response.ok || response.type === 'opaqueredirect') {
                return response;
            }
            const respClone = response.clone();
            // Fire-and-forget: errores de cache nunca rompen la response al cliente.
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, respClone).catch(() => {});
            }).catch(() => {});
            return response;
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});
