/**
 * AUTOSPORTING INTELLIGENCE — VALIDADOR DE ENDPOINTS Y PROTECCIÓN CONTRA SSRF
 * 
 * Reglas de validación:
 * 1. Protocolo estricto HTTPS (excepto pruebas locales controladas).
 * 2. Validación de dominios legítimos de proveedores Web Push (Google, Apple, Mozilla, Microsoft).
 * 3. Bloqueo de rangos de direcciones IP privadas, loopback y metadatos de nube (SSRF).
 * 4. Sanitización de logs para prevenir filtraciones de tokens o claves.
 */

const ALLOWED_PUSH_DOMAINS = [
    // Google Cloud Messaging / Firebase Cloud Messaging
    /\.googleapis\.com$/,
    // Apple Push Notification service (Web Push)
    /\.push\.apple\.com$/,
    // Mozilla Autopush
    /\.services\.mozilla\.com$/,
    /\.mozilla\.com$/,
    // Microsoft Windows Push Notification Services
    /\.notify\.windows\.com$/,
    // Samsung Push Service
    /\.push\.samsung\.com$/
];

const PRIVATE_IP_PATTERNS = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./, // Link-local & Cloud Metadata (AWS/GCP/Azure)
    /^0\./,
    /^localhost$/i,
    /^\[?::1\]?$/,
    /^\[?fc00:/i,
    /^\[?fe80:/i
];

/**
 * Valida si un endpoint de suscripción Web Push es seguro y pertenece a un proveedor autorizado
 * @param {string} endpointUrl - URL del endpoint proporcionado por el navegador
 * @param {Object} [options]
 * @param {boolean} [options.allowLoopback=false] - Habilita endpoints de prueba locales en suite de tests
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validatePushEndpoint(endpointUrl, { allowLoopback = false } = {}) {
    if (!endpointUrl || typeof endpointUrl !== 'string') {
        return { valid: false, reason: 'El endpoint es requerido y debe ser una cadena de texto.' };
    }

    const trimmed = endpointUrl.trim();
    if (trimmed.length > 2048) {
        return { valid: false, reason: 'La longitud del endpoint excede el límite máximo permitido (2048 caracteres).' };
    }

    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch {
        return { valid: false, reason: 'URL de endpoint inválida o malformada.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // En entorno de tests aislado se permite mock local si se habilita explícitamente
    if (allowLoopback) {
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === 'mock.push.local') {
            return { valid: true };
        }
    }

    // 1. Debe ser HTTPS estricto
    if (parsed.protocol !== 'https:') {
        return { valid: false, reason: 'El endpoint Web Push debe utilizar obligatoriamente el protocolo seguro HTTPS.' };
    }

    // 2. Comprobar que no apunte a direcciones IP privadas o de metadatos (SSRF)
    for (const pattern of PRIVATE_IP_PATTERNS) {
        if (pattern.test(hostname)) {
            return { valid: false, reason: 'El endpoint especifica una dirección interna o privada no permitida (bloqueo SSRF).' };
        }
    }

    // 3. Comprobar que pertenezca a la lista blanca de proveedores Web Push
    const isAllowedProvider = ALLOWED_PUSH_DOMAINS.some(domainRegex => domainRegex.test(hostname));
    if (!isAllowedProvider) {
        return { 
            valid: false, 
            reason: `El dominio '${hostname}' no pertenece a los proveedores Web Push reconocidos por el sistema.` 
        };
    }

    return { valid: true };
}

/**
 * Sanitiza una URL de endpoint para impresión en logs sin exponer tokens de suscripción
 */
export function sanitizePushEndpoint(endpointUrl) {
    if (!endpointUrl || typeof endpointUrl !== 'string') return '[ENDPOINT_VACIO]';
    try {
        const u = new URL(endpointUrl);
        const pathParts = u.pathname.split('/').filter(Boolean);
        const maskedPath = pathParts.length > 0 ? `/${pathParts[0]}/...` : '';
        return `${u.protocol}//${u.host}${maskedPath}`;
    } catch {
        return '[ENDPOINT_INVALIDO]';
    }
}

/**
 * Sanitiza el objeto de claves criptográficas de la suscripción para logs
 */
export function sanitizePushKeys(keys) {
    if (!keys || typeof keys !== 'object') return { p256dh: '[AUSENTE]', auth: '[AUSENTE]' };
    return {
        p256dh: keys.p256dh ? `${keys.p256dh.slice(0, 6)}...` : '[AUSENTE]',
        auth: keys.auth ? '***' : '[AUSENTE]'
    };
}
