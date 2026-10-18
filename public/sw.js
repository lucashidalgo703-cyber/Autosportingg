// public/sw.js
// Service Worker de soporte Offline para AutoSporting CRM (Etapa 4)
// Estrategia: Network-First con respaldo en CacheStorage cuando el navegador está sin conexión.

const CACHE_NAME = 'autosporting-offline-shell-v1';

function normalizeCacheKey(requestUrl) {
    try {
        const u = new URL(requestUrl);
        u.searchParams.delete('t');
        u.searchParams.delete('_rsc');
        return u.toString();
    } catch {
        return requestUrl;
    }
}

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    let url;
    try {
        url = new URL(request.url);
    } catch {
        return;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            const normalizedKey = normalizeCacheKey(request.url);

            try {
                const networkResponse = await fetch(request);
                if (networkResponse && networkResponse.status === 200) {
                    try {
                        await cache.put(request, networkResponse.clone());
                        if (normalizedKey !== request.url) {
                            await cache.put(normalizedKey, networkResponse.clone());
                        }
                        if (request.mode === 'navigate') {
                            await cache.put(url.origin + url.pathname, networkResponse.clone());
                        }
                    } catch (_) {
                        // Ignorar errores de cuota de almacenamiento
                    }
                }
                return networkResponse;
            } catch (err) {
                // Sin conexión: buscar coincidencia exacta o normalizada en caché
                const exactMatch = await cache.match(request);
                if (exactMatch) return exactMatch;

                const normalizedMatch = await cache.match(normalizedKey);
                if (normalizedMatch) return normalizedMatch;

                const pathOnlyMatch = await cache.match(url.origin + url.pathname);
                if (pathOnlyMatch) return pathOnlyMatch;

                // Si es navegación HTML a una ruta del CRM, servir el shell cacheado más cercano
                const acceptHeader = request.headers.get('accept') || '';
                if (request.mode === 'navigate' || acceptHeader.includes('text/html')) {
                    const fallbacks = [
                        url.origin + '/admin/stock',
                        url.origin + '/admin/dashboard',
                        url.origin + '/admin/ventas',
                        url.origin + '/admin/clientes',
                        url.origin + '/'
                    ];
                    for (const fb of fallbacks) {
                        const match = await cache.match(fb);
                        if (match) return match;
                    }
                }

                // Si es una consulta de API en segundo plano sin caché previa, devolver JSON controlado
                if (url.pathname.startsWith('/api/')) {
                    return new Response(
                        JSON.stringify({ ok: false, offline: true, message: 'Sin conexión a internet — usando datos locales.' }),
                        { status: 503, headers: { 'Content-Type': 'application/json' } }
                    );
                }

                throw err;
            }
        })()
    );
});
