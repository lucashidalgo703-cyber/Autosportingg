import { VEHICLE_IMAGE_MAX_BYTES } from '../utils/imageCompressor.js';

const safePhotoUrl = value => {
    if (typeof value !== 'string' || !value.trim()) return false;
    try { return new URL(value).protocol === 'https:'; } catch { return false; }
};

/**
 * Uploads each new photo independently before the vehicle is saved. The final
 * vehicle request contains only URLs, keeping multi-photo requests small.
 * A failed upload leaves the vehicle untouched; successful files can be reused
 * on retry without uploading the same File again.
 */
export async function prepareVehicleImageOrder(files, { token, baseUrl = '', cache = new WeakMap(), fetchImpl = fetch, onProgress = () => {} } = {}) {
    if (!Array.isArray(files) || files.length > 20) throw new Error('Podés guardar hasta 20 fotos por vehículo.');
    if (!token) throw new Error('La sesión venció. Iniciá sesión nuevamente.');
    for (const file of files) {
        if (file?.isExisting) {
            if (typeof file.url !== 'string' || !file.url) throw new Error('Una foto existente no tiene una dirección válida.');
        } else if (!(file instanceof Blob) || !file.size || file.size > VEHICLE_IMAGE_MAX_BYTES) {
            throw new Error('Una foto no está lista para subir. Volvé a seleccionarla.');
        }
    }
    const total = files.filter(file => !file.isExisting && !cache.has(file)).length;
    let uploaded = 0;
    const order = [];
    for (const file of files) {
        if (file.isExisting) {
            order.push(file.url);
            continue;
        }
        const cached = cache.get(file);
        if (cached) {
            order.push(cached);
            continue;
        }
        onProgress(uploaded + 1, total);
        const body = new FormData();
        body.append('files', file, file.name || 'foto.webp');
        const response = await fetchImpl(`${baseUrl}/api/admin/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body
        });
        let result;
        try { result = await response.json(); } catch { result = null; }
        if (!response.ok) throw new Error(result?.message || result?.error || `No se pudo subir ${file.name || 'la foto'}. Intentá guardar nuevamente.`);
        const urls = result?.uploadedFiles;
        if (!Array.isArray(urls) || urls.length !== 1 || !safePhotoUrl(urls[0]?.url)) {
            throw new Error('La foto no devolvió una dirección válida. Intentá guardar nuevamente.');
        }
        cache.set(file, urls[0].url);
        order.push(urls[0].url);
        uploaded++;
    }
    return order;
}
