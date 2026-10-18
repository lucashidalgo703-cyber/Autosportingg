// src/services/offlineSyncService.js
// Servicio de almacenamiento aislado por usuario, preparación del dispositivo y sincronización de cola offline v1 (Etapa 4)

const STORAGE_PREFIX = 'autosporting_offline_v1_';

function getStorage(customStorage) {
    if (customStorage) return customStorage;
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    return null;
}

export function getUserStorageNamespace(userId) {
    const cleanId = String(userId || 'anon').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${STORAGE_PREFIX}${cleanId}`;
}

function readNamespaceBundle(userId, customStorage) {
    const storage = getStorage(customStorage);
    if (!storage) return null;
    const key = getUserStorageNamespace(userId);
    try {
        const raw = storage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function writeNamespaceBundle(userId, bundle, customStorage) {
    const storage = getStorage(customStorage);
    if (!storage) return false;
    const key = getUserStorageNamespace(userId);
    storage.setItem(key, JSON.stringify(bundle));
    return true;
}

async function convertImageToDataUrl(imageUrl, fetcher) {
    if (!imageUrl || typeof imageUrl !== 'string') return imageUrl;
    if (imageUrl.startsWith('data:image/')) return imageUrl;
    if (typeof window === 'undefined' || typeof FileReader === 'undefined') return imageUrl;

    try {
        const res = await fetcher(imageUrl, { method: 'GET' });
        if (!res || !res.ok) return imageUrl;
        const blob = await res.blob();
        if (!blob || blob.size === 0 || blob.size > 2 * 1024 * 1024) return imageUrl;
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : imageUrl);
            reader.onerror = () => resolve(imageUrl);
            reader.readAsDataURL(blob);
        });
    } catch {
        return imageUrl;
    }
}

async function warmOfflineShellCache(token) {
    if (typeof window === 'undefined') return;
    try {
        if ('serviceWorker' in navigator) {
            await navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
        }
        if ('caches' in window) {
            const cache = await window.caches.open('autosporting-offline-shell-v1');
            const origin = window.location.origin;
            const urlsToCache = new Set([
                window.location.href,
                origin + window.location.pathname,
                origin + '/admin/stock',
                origin + '/admin/dashboard',
                origin + '/admin/clientes',
                origin + '/admin/ventas'
            ]);

            if (typeof document !== 'undefined') {
                document.querySelectorAll('script[src], link[rel="stylesheet"][href]').forEach((el) => {
                    const src = el.src || el.href;
                    if (src && src.startsWith(origin)) {
                        urlsToCache.add(src);
                    }
                });
            }

            await Promise.all(
                Array.from(urlsToCache).map(async (u) => {
                    try {
                        const resp = await fetch(u, {
                            headers: token ? { Authorization: `Bearer ${token}` } : {}
                        });
                        if (resp && resp.status === 200) {
                            await cache.put(u, resp.clone());
                        }
                    } catch (_) {}
                })
            );
        }
    } catch (_) {}
}

/**
 * Descarga y guarda en almacenamiento local aislado por usuario los datos autorizados para uso sin conexión.
 * Opcionalmente descarga miniaturas/fotos principales comprimidas.
 */
export async function prepareDeviceForOffline({
    userId,
    token,
    includePhotos = true,
    onProgress,
    fetchImpl,
    customStorage
} = {}) {
    if (!userId) throw new Error('Se requiere userId para aislar los datos offline por usuario.');
    const fetcher = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetcher) throw new Error('Fetch API no disponible.');

    if (typeof onProgress === 'function') {
        onProgress({ step: 'requesting', percent: 15, label: 'Descargando catálogo, clientes, ventas, cuotas y gastos…' });
    }

    const res = await fetcher(`/api/admin/offline/bootstrap?includePhotos=${includePhotos ? 'true' : 'false'}`, {
        method: 'GET',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    const payload = await res.json();
    if (!res.ok || !payload?.ok) {
        throw new Error(payload?.message || 'Error al preparar los datos para uso sin conexión.');
    }

    let vehicles = Array.isArray(payload.data?.vehicles) ? payload.data.vehicles : [];

    if (includePhotos && typeof window !== 'undefined' && vehicles.length > 0) {
        if (typeof onProgress === 'function') {
            onProgress({ step: 'caching_photos', percent: 50, label: 'Guardando fotos principales para visualización sin conexión…' });
        }
        vehicles = await Promise.all(
            vehicles.map(async (v) => {
                const rawImg = v.coverImage || (Array.isArray(v.images) && v.images[0]) || null;
                if (!rawImg) return v;
                const dataUrl = await convertImageToDataUrl(rawImg, fetcher);
                return {
                    ...v,
                    coverImage: dataUrl,
                    images: [dataUrl]
                };
            })
        );
    }

    if (typeof onProgress === 'function') {
        onProgress({ step: 'saving_records', percent: 75, label: 'Guardando fichas y resúmenes en el dispositivo…' });
    }

    const existing = readNamespaceBundle(userId, customStorage) || {};
    const preservedOutbox = Array.isArray(existing.outbox) ? existing.outbox : [];
    const preservedConflicts = Array.isArray(existing.conflicts) ? existing.conflicts : [];
    const preservedPendingConfirmations = Array.isArray(existing.pendingConfirmations) ? existing.pendingConfirmations : [];

    const bundle = {
        version: 1,
        userId: String(userId),
        userScope: payload.userScope || { userId: String(userId) },
        syncedAt: payload.syncedAt || new Date().toISOString(),
        includePhotos: Boolean(includePhotos),
        treasuryStrategicExcluded: true,
        summary: payload.summary || {},
        data: {
            vehicles,
            clients: Array.isArray(payload.data?.clients) ? payload.data.clients : [],
            sales: Array.isArray(payload.data?.sales) ? payload.data.sales : [],
            installments: Array.isArray(payload.data?.installments) ? payload.data.installments : [],
            expenses: Array.isArray(payload.data?.expenses) ? payload.data.expenses : []
        },
        outbox: preservedOutbox,
        conflicts: preservedConflicts,
        pendingConfirmations: preservedPendingConfirmations
    };

    writeNamespaceBundle(userId, bundle, customStorage);

    await warmOfflineShellCache(token);

    if (typeof onProgress === 'function') {
        onProgress({ step: 'completed', percent: 100, label: 'Dispositivo listo para trabajar sin conexión.' });
    }

    return bundle;
}

/**
 * Obtiene el estado actual y los datos guardados para el usuario activo.
 */
export function getOfflineSnapshot(userId, customStorage) {
    if (!userId) return null;
    return readNamespaceBundle(userId, customStorage);
}

/**
 * Obtiene el snapshot offline del usuario autenticado actual leyendo el JWT de localStorage.
 */
export function getActiveOfflineSnapshot(customStorage) {
    const storage = getStorage(customStorage);
    if (!storage) return null;
    try {
        const token = storage.getItem('token');
        if (token) {
            const parts = token.split('.');
            if (parts.length === 3) {
                const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                const decoded = JSON.parse(atob(base64));
                const uid = decoded?.id || decoded?._id || decoded?.username;
                if (uid) {
                    const snap = readNamespaceBundle(uid, storage);
                    if (snap) return snap;
                }
            }
        }
        for (let i = 0; i < storage.length; i++) {
            const k = storage.key(i);
            if (k && k.startsWith(STORAGE_PREFIX)) {
                const raw = storage.getItem(k);
                if (raw) return JSON.parse(raw);
            }
        }
    } catch {}
    return null;
}

/**
 * Encola una operación creada sin conexión con clave de idempotencia única.
 */
export function enqueueOfflineOperation(userId, operation, customStorage) {
    if (!userId) throw new Error('Se requiere userId para encolar operaciones offline.');
    const bundle = readNamespaceBundle(userId, customStorage) || {
        version: 1,
        userId: String(userId),
        syncedAt: null,
        includePhotos: false,
        treasuryStrategicExcluded: true,
        summary: {},
        data: { vehicles: [], clients: [], sales: [], installments: [], expenses: [] },
        outbox: [],
        conflicts: [],
        pendingConfirmations: []
    };

    const idempotencyKey = operation.idempotencyKey || `offline_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const alreadyQueued = bundle.outbox.find(item => item.idempotencyKey === idempotencyKey);
    if (alreadyQueued) {
        return alreadyQueued;
    }

    const entry = {
        idempotencyKey,
        operationType: operation.operationType,
        entityType: operation.entityType || null,
        entityId: operation.entityId || null,
        payload: operation.payload || {},
        expectedUpdatedAt: operation.expectedUpdatedAt || null,
        clientCreatedAt: operation.clientCreatedAt || new Date().toISOString(),
        status: 'queued'
    };

    bundle.outbox.push(entry);
    writeNamespaceBundle(userId, bundle, customStorage);
    return entry;
}

/**
 * Sincroniza la cola pendiente con el servidor cuando vuelve la conexión.
 */
export async function syncOfflineOutbox({
    userId,
    token,
    fetchImpl,
    customStorage
} = {}) {
    if (!userId) throw new Error('Se requiere userId para sincronizar la cola offline.');
    const bundle = readNamespaceBundle(userId, customStorage);
    if (!bundle || !Array.isArray(bundle.outbox) || bundle.outbox.length === 0) {
        return {
            ok: true,
            syncedCount: 0,
            summary: { totalReceived: 0, appliedCount: 0, pendingConfirmationCount: 0, conflictCount: 0, rejectedCount: 0, duplicateCount: 0 },
            results: []
        };
    }

    const fetcher = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetcher) throw new Error('Fetch API no disponible.');

    const res = await fetcher('/api/admin/offline/sync', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ operations: bundle.outbox })
    });

    const data = await res.json();
    if (!res.ok || !data?.ok) {
        throw new Error(data?.message || 'Error al sincronizar la cola offline con el servidor.');
    }

    const resultsByKey = new Map((data.results || []).map(r => [r.idempotencyKey, r]));
    const remainingOutbox = [];
    const conflicts = Array.isArray(bundle.conflicts) ? [...bundle.conflicts] : [];
    const pendingConfirmations = Array.isArray(bundle.pendingConfirmations) ? [...bundle.pendingConfirmations] : [];

    for (const item of bundle.outbox) {
        const outcome = resultsByKey.get(item.idempotencyKey);
        if (!outcome) {
            remainingOutbox.push(item);
            continue;
        }
        if (outcome.status === 'conflict') {
            conflicts.unshift({
                ...item,
                status: 'conflict',
                conflictDetails: outcome.conflictDetails,
                detectedAt: new Date().toISOString()
            });
        } else if (outcome.status === 'pending_confirmation') {
            pendingConfirmations.unshift({
                ...item,
                status: 'pending_confirmation',
                draftId: outcome.draftId || null,
                message: outcome.resultData?.message || 'Pendiente de confirmación en servidor'
            });
        }
        // Si fue 'applied', 'duplicate' o 'rejected', sale de la cola activa (outbox)
    }

    bundle.outbox = remainingOutbox;
    bundle.conflicts = conflicts.slice(0, 50);
    bundle.pendingConfirmations = pendingConfirmations.slice(0, 50);
    bundle.lastQueueSyncAt = data.syncedAt || new Date().toISOString();
    writeNamespaceBundle(userId, bundle, customStorage);

    return data;
}

/**
 * Limpia los datos offline de un usuario específico o de todos los usuarios al cerrar sesión.
 */
export function clearOfflineData(userId, customStorage) {
    const storage = getStorage(customStorage);
    if (!storage) return;

    if (userId) {
        storage.removeItem(getUserStorageNamespace(userId));
        return;
    }

    const keysToRemove = [];
    for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
            keysToRemove.push(k);
        }
    }
    keysToRemove.forEach(k => storage.removeItem(k));
}
