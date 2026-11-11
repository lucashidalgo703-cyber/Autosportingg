/**
 * Optimizes a Cloudinary URL by injecting transformation parameters.
 * @param {string} url - The original Cloudinary URL.
 * @param {number} width - The desired width for the image.
 * @returns {string} - The optimized URL.
 */
export const getOptimizedImageUrl = (url, width = 600) => {
    if (!url || typeof url !== 'string') return url || '';
    if (!url.includes('cloudinary.com')) return url;

    // Avoid double transformations if the URL already has them
    if (url.includes('/upload/f_auto') || url.includes('/upload/w_')) return url;

    const parts = url.split('/upload/');

    if (parts.length === 2) {
        return `${parts[0]}/upload/f_auto,q_auto,w_${width},c_limit/${parts[1]}`;
    }

    return url;
};
/**
 * Generates a tiny, blurred placeholder URL for the "blur-up" effect.
 * @param {string} url - The original Cloudinary URL.
 * @returns {string} - The low-quality placeholder URL.
 */
export const getBlurPlaceholder = (url) => {
    if (!url) return '';
    if (!url.includes('cloudinary.com')) return url;

    const parts = url.split('/upload/');
    if (parts.length === 2) {
        // We use a very small width (40px) + high blur + low quality
        return `${parts[0]}/upload/f_auto,q_10,w_40,c_limit,e_blur:1000/${parts[1]}`;
    }

    return url;
};

// Only replace delivery options produced by our image helpers. Crops, effects,
// named transformations and signatures must retain their original URL.
const isCatalogDeliveryToken = token => (
    token === 'f_auto'
    || token === 'c_limit'
    || /^w_[1-9]\d*$/.test(token)
    || /^q_(?:auto(?::(?:best|good|eco|low))?|[1-9]\d?|100)$/.test(token)
);

const getCatalogSource = url => {
    if (typeof url !== 'string' || !url || /\s/.test(url)) return null;

    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return null;
    }

    if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com'
        || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash) return null;

    // Work with the original path rather than decoding/re-encoding public IDs.
    const match = /^(https:\/\/[^/]+\/[^/]+\/image\/upload\/)([^?#]+)$/.exec(url);
    if (!match) return null;
    const segments = match[2].split('/');
    if (segments.some(segment => !segment || ['.', '..'].includes(segment.replace(/%2e/gi, '.')))) return null;
    let start = 0;

    while (start < segments.length) {
        const segment = segments[start];
        if (/^v\d+$/.test(segment)) break;
        if (segment.split(',').every(isCatalogDeliveryToken)) {
            start++;
            continue;
        }
        // Before a version/public ID, these may identify a transformation or
        // a signed URL. Prefer a safe single-source image if ambiguous.
        if (!segment || segment.includes(',') || segment.includes('_') || segment.startsWith('s--')) return null;
        break;
    }

    const asset = segments.slice(start);
    if (!asset.length || !asset.at(-1) || (/^v\d+$/.test(asset[0]) && asset.length < 2)) return null;
    return { prefix: match[1], asset: asset.join('/') };
};

/**
 * Deliver the stored master without another resize or lossy encoding. Known
 * delivery-only variants recover that same URL, sharing the browser cache
 * across cards and gallery images. Edited/signed/ambiguous URLs remain intact.
 */
const getMasterImageProps = url => {
    const fallback = { src: typeof url === 'string' ? url : '' };
    const source = getCatalogSource(url);
    if (!source) return fallback;

    return { src: source.prefix + source.asset };
};

export const getCatalogImageProps = url => getMasterImageProps(url);

/**
 * Existing callers may still pass a gallery variant; every variant now uses
 * the same master to preserve all available pixels without another encoding.
 */
export const getGalleryImageProps = url => getMasterImageProps(url);
