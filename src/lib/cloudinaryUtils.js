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

export const CATALOG_IMAGE_WIDTHS = Object.freeze([640, 960, 1280, 1600]);
export const GALLERY_IMAGE_WIDTHS = Object.freeze([640, 960, 1280, 1600, 1920, 2560]);
export const GALLERY_THUMBNAIL_WIDTHS = Object.freeze([320, 480, 640, 960]);
export const GALLERY_LIGHTBOX_WIDTHS = Object.freeze([640, 960, 1280, 1600, 1920, 2560, 3200, 3840]);

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
 * Responsive catalog delivery without a second image optimizer. Each URL caps
 * the requested width (c_limit), preserving aspect ratio and avoiding upscale.
 * Original/specially edited URLs remain unchanged when they cannot be safely
 * recognized. Callers supply sizes for their actual layout.
 */
const getResponsiveImageProps = (url, widths, defaultWidth) => {
    const fallback = { src: typeof url === 'string' ? url : '' };
    const source = getCatalogSource(url);
    if (!source) return fallback;

    const atWidth = width => `${source.prefix}f_auto,q_auto:best,w_${width},c_limit/${source.asset}`;
    return {
        src: atWidth(defaultWidth),
        srcSet: widths.map(width => `${atWidth(width)} ${width}w`).join(', ')
    };
};

export const getCatalogImageProps = url => getResponsiveImageProps(url, CATALOG_IMAGE_WIDTHS, 960);

const GALLERY_VARIANTS = Object.freeze({
    main: { widths: GALLERY_IMAGE_WIDTHS, defaultWidth: 1600 },
    thumbnail: { widths: GALLERY_THUMBNAIL_WIDTHS, defaultWidth: 480 },
    lightbox: { widths: GALLERY_LIGHTBOX_WIDTHS, defaultWidth: 1920 }
});

/**
 * Gallery delivery keeps the same safe master URL resolution as the catalog.
 * Main and thumbnail images avoid fetching full-screen files, while lightbox
 * candidates cover high-density screens up to 3840px. c_limit never upscales a
 * smaller source. Callers must supply sizes for each gallery layout.
 */
export const getGalleryImageProps = (url, variant = 'main') => {
    const selected = Object.prototype.hasOwnProperty.call(GALLERY_VARIANTS, variant)
        ? GALLERY_VARIANTS[variant]
        : GALLERY_VARIANTS.main;
    return getResponsiveImageProps(url, selected.widths, selected.defaultWidth);
};
