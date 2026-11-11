const MAX_IMAGES = 20;
const owns = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isReference = value => typeof value === 'string' && value.trim().length > 0;

function readImageList(value, field, allowSingleReference = false) {
    let list = value;
    if (typeof list === 'string') {
        try {
            list = JSON.parse(list);
        } catch {
            if (allowSingleReference && !/^\s*[\[{]/.test(list)) list = [list];
            else return { error: `${field} debe contener una lista JSON válida de imágenes.` };
        }
    }
    if (allowSingleReference && typeof list === 'string') list = [list];
    if (!Array.isArray(list)) return { error: `${field} debe ser una lista de imágenes.` };
    if (list.length > MAX_IMAGES) return { error: `Podés guardar hasta ${MAX_IMAGES} imágenes por vehículo.` };
    if (!list.every(isReference)) return { error: `${field} solo admite referencias de imagen no vacías.` };
    return { list: [...list] };
}

function isOwnUploadedImage(value, cloudName) {
    if (!cloudName || !isReference(value) || /\s/.test(value)) return false;
    let url;
    try { url = new URL(value); } catch { return false; }
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com'
        || url.username || url.password || url.port || url.search || url.hash) return false;
    const parts = url.pathname.split('/');
    if (parts[1] !== cloudName || parts[2] !== 'image' || parts[3] !== 'upload') return false;
    let folder = 4;
    if (/^v\d+$/.test(parts[folder])) folder++;
    return parts[folder] === 'autosporting-cars'
        && parts.length > folder + 1
        && parts.slice(folder + 1).every(part => part && !['.', '..'].includes(part.replace(/%2e/gi, '.')));
}

/**
 * Resolve only image data before a vehicle handler can write any purchase or
 * expense changes. imageOrder is the explicit final list; omission preserves
 * existing images, while legacy file uploads append without replacing them.
 * The helper never fetches, uploads or removes a remote asset.
 */
export function resolveCarImageUpdate({ body = {}, files = [], existingImages = [], existingCoverImage = '', cloudName = '' } = {}) {
    if (!Array.isArray(files)) return { error: 'No se pudo interpretar la lista de imágenes subidas.' };
    const uploaded = files.map(file => file?.path);
    if (uploaded.length > MAX_IMAGES || !uploaded.every(isReference)) return { error: 'La lista de imágenes subidas no es válida.' };

    if (owns(body, 'imageOrder')) {
        const parsed = readImageList(body.imageOrder, 'imageOrder');
        if (parsed.error) return parsed;
        const existing = new Set([...(existingImages || []), ...(isReference(existingCoverImage) ? [existingCoverImage] : [])]);
        const usedUploads = new Set();
        const images = [];
        for (const entry of parsed.list) {
            if (entry.startsWith('__new__')) {
                const marker = /^__new__(0|[1-9]\d*)$/.exec(entry);
                const index = marker ? Number(marker[1]) : -1;
                if (!Number.isSafeInteger(index) || index < 0 || index >= uploaded.length) {
                    return { error: `La referencia ${entry} no corresponde a una imagen subida en esta solicitud.` };
                }
                usedUploads.add(index);
                images.push(uploaded[index]);
                continue;
            }
            if (existing.has(entry)) {
                images.push(entry);
                continue;
            }
            const uploadIndex = uploaded.indexOf(entry);
            if (uploadIndex >= 0) {
                usedUploads.add(uploadIndex);
                images.push(entry);
                continue;
            }
            if (!isOwnUploadedImage(entry, cloudName.trim())) {
                return { error: 'Una imagen de imageOrder no pertenece al vehículo ni a las fotos subidas de AutoSporting.' };
            }
            images.push(entry);
        }
        if (uploaded.some((_, index) => !usedUploads.has(index))) {
            return { error: 'imageOrder debe incluir todas las imágenes subidas en esta solicitud.' };
        }
        return { provided: true, images, coverImage: images[0] || '' };
    }

    let base = [...(existingImages || [])];
    const hasLegacyImages = owns(body, 'images');
    if (hasLegacyImages) {
        const parsed = readImageList(body.images, 'images', true);
        if (parsed.error) return parsed;
        base = parsed.list;
    }
    if (!hasLegacyImages && !uploaded.length) return { provided: false };
    const images = [...base, ...uploaded];
    if (images.length > MAX_IMAGES) return { error: `Podés guardar hasta ${MAX_IMAGES} imágenes por vehículo.` };
    return { provided: true, images, coverImage: images[0] || '' };
}
