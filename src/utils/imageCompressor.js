// The API accepts 2 MiB per file. Leave room for upload metadata and multipart framing.
export const VEHICLE_IMAGE_MAX_BYTES = Math.floor(1.8 * 1024 * 1024);
export const VEHICLE_IMAGE_MAX_DIMENSION = 2560;
export const VEHICLE_IMAGE_QUALITY = 0.9;

const PRESERVABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.onload = event => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('No se pudo abrir la imagen. Usá una foto JPG, PNG o WebP.'));
            image.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function encode(canvas, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) reject(new Error('No se pudo preparar la imagen.'));
            else resolve(blob);
        }, 'image/webp', quality);
    });
}

/**
 * Prepares a high-quality publication source within the existing per-file upload limit.
 * Small, compatible photos keep their original bytes. Larger photos are sampled from
 * the decoded source at every attempt, never from a previously compressed version.
 */
export async function compressImage(file, maxDimension = VEHICLE_IMAGE_MAX_DIMENSION, quality = VEHICLE_IMAGE_QUALITY) {
    if (!file || !Number.isFinite(file.size) || file.size <= 0) throw new Error('La imagen está vacía o no es válida.');
    if (!Number.isFinite(maxDimension) || maxDimension <= 0 || !Number.isFinite(quality) || quality <= 0 || quality > 1) {
        throw new Error('La configuración de la imagen no es válida.');
    }
    if (typeof window === 'undefined') {
        if (file.size > VEHICLE_IMAGE_MAX_BYTES) throw new Error('La imagen debe prepararse en el navegador antes de subirla.');
        return file;
    }

    const image = await loadImage(file);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const sourceLongSide = Math.max(width, height);
    if (!Number.isFinite(sourceLongSide) || width <= 0 || height <= 0) throw new Error('La imagen no tiene dimensiones válidas.');

    if (PRESERVABLE_TYPES.has(file.type) && sourceLongSide <= maxDimension && file.size <= VEHICLE_IMAGE_MAX_BYTES) {
        return file;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('El navegador no pudo preparar la imagen.');
    const qualities = [...new Set([quality, Math.min(quality, 0.86)])];
    let longSide = Math.min(Math.floor(maxDimension), sourceLongSide);
    const minimumLongSide = Math.min(longSide, 1280);

    while (true) {
        const ratio = longSide / sourceLongSide;
        canvas.width = Math.max(1, Math.round(width * ratio));
        canvas.height = Math.max(1, Math.round(height * ratio));
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, width, height, 0, 0, canvas.width, canvas.height);

        for (const encodingQuality of qualities) {
            const blob = await encode(canvas, encodingQuality);
            if (blob.size > VEHICLE_IMAGE_MAX_BYTES) continue;
            const extension = EXTENSIONS[blob.type];
            if (!extension) throw new Error('El navegador no pudo generar una imagen compatible.');
            return new File([blob], `${file.name.replace(/\.[^/.]+$/, '')}.${extension}`, {
                type: blob.type,
                lastModified: file.lastModified || Date.now()
            });
        }

        if (longSide <= minimumLongSide) break;
        longSide = Math.max(minimumLongSide, Math.floor(longSide * 0.8));
    }

    throw new Error('La foto no pudo prepararse dentro del límite de carga. Elegí otra copia de la imagen.');
}
