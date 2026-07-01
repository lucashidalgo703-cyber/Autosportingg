/**
 * Comprime una imagen en el cliente utilizando Canvas y la exporta como WebP.
 * @param {File} file - El archivo de imagen original.
 * @param {number} maxWidth - Ancho máximo de la imagen.
 * @param {number} quality - Calidad de compresión (0 a 1).
 * @returns {Promise<File>} - Archivo comprimido en formato WebP.
 */
export const compressImage = (file, maxWidth = 1280, quality = 0.72) => {
    return new Promise((resolve, reject) => {
        // Evitar procesar si no es en ambiente del navegador
        if (typeof window === 'undefined') {
            resolve(file);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Canvas está vacío'));
                        return;
                    }
                    const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                        type: 'image/webp',
                        lastModified: Date.now()
                    });
                    resolve(newFile);
                }, 'image/webp', quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
