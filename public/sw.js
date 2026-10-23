// public/sw.js
// Service Worker de soporte Offline para AutoSporting CRM (Etapa 4)
// Estrategia: Network-First con respaldo en CacheStorage cuando el navegador está sin conexión.

const CACHE_NAME = 'autosporting-offline-shell-v2';

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
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
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
                    // Distinguir falta real de internet de un fallo de red hacia el servidor (CORS, URL errónea, servidor caído)
                    // para no ocultar errores de API detrás de un mensaje de sin conexión.
                    const browserOffline = self.navigator && self.navigator.onLine === false;
                    const message = browserOffline
                        ? 'Sin conexión a internet — usando datos locales.'
                        : 'No se pudo conectar con el servidor (' + url.origin + '). El navegador tiene internet: revisá la URL de la API, CORS o el estado del servidor.';
                    return new Response(
                        JSON.stringify({ ok: false, offline: browserOffline, networkError: true, target: url.origin, message }),
                        { status: 503, headers: { 'Content-Type': 'application/json' } }
                    );
                }

                throw err;
            }
        })()
    );
});


// ============================================================================
// MANEJO DE NOTIFICACIONES WEB PUSH DE SEGURIDAD (PUSH API & W3C WEB PUSH)
// ============================================================================

self.addEventListener('push', (event) => {
    let payload = {
        title: 'AUTOSPORTING INTELLIGENCE',
        body: 'Nueva alerta de seguridad en el CRM.',
        icon: '/logo192.png',
        badge: '/badge.png',
        data: { url: '/admin/seguridad' }
    };

    if (event.data) {
        try {
            payload = event.data.json();
        } catch (_) {
            payload.body = event.data.text() || payload.body;
        }
    }

    const options = {
        body: payload.body,
        icon: payload.icon || '/logo192.png',
        badge: payload.badge || '/badge.png',
        tag: payload.tag || 'autosporting-security-alert',
        requireInteraction: Boolean(payload.requireInteraction),
        renotify: true,
        data: payload.data || { url: '/admin/seguridad' }
    };

    event.waitUntil(
        self.registration.showNotification(payload.title || 'AUTOSPORTING INTELLIGENCE', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = (event.notification.data && event.notification.data.url) || '/admin/seguridad';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Si ya existe una ventana abierta del CRM, enfocarla y navegar a /admin/seguridad
            for (const client of windowClients) {
                if (client.url && 'focus' in client) {
                    client.focus();
                    if ('navigate' in client) {
                        return client.navigate(targetUrl);
                    }
                    return client;
                }
            }
            // Si no hay ventana abierta, abrir una nueva en el navegador
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
