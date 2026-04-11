/**
 * Optimizes a Cloudinary URL by injecting transformation parameters.
 * @param {string} url - The original Cloudinary URL.
 * @param {number} width - The desired width for the image.
 * @returns {string} - The optimized URL.
 */
export const getOptimizedImageUrl = (url, width = 600) => {
    if (!url) return '';
    if (!url.includes('cloudinary.com')) return url;

    // Check if already optimized or has transformations (simple check)
    // We want to inject /f_auto,q_auto,w_{width}/ after /upload/

    // Split the URL at '/upload/'
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
