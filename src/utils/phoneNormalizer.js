/**
 * Normaliza un número de teléfono ingresado por el usuario al formato internacional de WhatsApp (ej: 54911...).
 * Especializado en formatos comunes de Argentina.
 * @param {string} phone - Teléfono original ingresado.
 * @returns {string} - Teléfono normalizado.
 */
export function normalizePhoneToWhatsApp(phone) {
    if (!phone) return phone;
    
    // Dejar solo números
    let cleaned = phone.replace(/\D/g, '');
    
    if (!cleaned) return '';

    // Eliminar prefijo 0 inicial si existe
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.slice(1);
    }

    // Verificar si ya tiene el código de país de Argentina (54)
    if (cleaned.startsWith('54')) {
        // En Argentina, los números móviles en WhatsApp requieren '549' seguido del código de área y número.
        // Si tiene 12 dígitos y empieza con 54 (pero no 549), es formato '54 11 ...'. Insertamos el 9 -> '54911...'
        if (!cleaned.startsWith('549') && cleaned.length === 12) {
            cleaned = '549' + cleaned.slice(2);
        }
        return cleaned;
    }

    // Si empieza con 15 y tiene 10 dígitos (formato local sin código de área, ej: 15-1234-5678)
    // Asumimos código de área por defecto de Buenos Aires (11) y prependeamos 549
    if (cleaned.startsWith('15') && cleaned.length === 10) {
        cleaned = '54911' + cleaned.slice(2);
        return cleaned;
    }

    // Si empieza con 9 y tiene 11 dígitos (ej: 9 11 1234 5678), prependeamos 54
    if (cleaned.startsWith('9') && cleaned.length === 11) {
        cleaned = '54' + cleaned;
        return cleaned;
    }

    // Teléfono móvil local con código de área (ej: 11 1234 5678 - 10 dígitos) -> Prependear 549
    if (cleaned.length === 10) {
        cleaned = '549' + cleaned;
        return cleaned;
    }

    // Teléfono local sin código de área (ej: 4765 4321 - 8 dígitos) -> Asumir BsAs (11) y prependear 54911
    if (cleaned.length === 8) {
        cleaned = '54911' + cleaned;
        return cleaned;
    }

    // Caso general si no cumple longitudes estándar pero no tiene 54
    if (cleaned.length >= 7 && cleaned.length <= 11) {
        if (cleaned.startsWith('9')) {
            cleaned = '54' + cleaned;
        } else {
            cleaned = '549' + cleaned;
        }
    }

    return cleaned;
}
