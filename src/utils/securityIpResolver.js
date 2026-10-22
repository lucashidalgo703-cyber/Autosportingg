import net from 'net';

/**
 * Validador estricto de direcciones IPv4 / IPv6 para descartar valores manipulados o inyectados
 */
function isValidIp(ip) {
    return typeof ip === 'string' && net.isIP(ip.trim()) !== 0;
}

/**
 * Resolver de IP confiable para la arquitectura de Vercel y Express.
 * En entornos cloud/serverless (Vercel), Edge Network sobreescribe de forma autoritativa la cabecera 'x-real-ip'.
 * En entornos sin proxy de confianza verificado, previene spoofing descartando cabeceras arbitrarias del cliente.
 */
export function getTrustedClientIp(req) {
    if (!req) return 'unknown';

    const isVercel = process.env.VERCEL === '1' || Boolean(req.headers?.['x-vercel-id']);
    const isExplicitTrustedProxy = process.env.TRUST_PROXY === 'true';
    const isTestOrLocal = process.env.NODE_ENV === 'test' || !process.env.NODE_ENV;

    // Solo confiar en cabeceras de reenvío perimetral si el entorno es de confianza
    if (isVercel || isExplicitTrustedProxy || isTestOrLocal) {
        // 1. Cabecera inyectada autoritativamente por Vercel Edge Network
        const xRealIp = req.headers?.['x-real-ip'];
        if (isValidIp(xRealIp)) {
            return xRealIp.trim();
        }

        // 2. Cabecera de reenvío perimetral interna de Vercel
        const xVercelForwarded = req.headers?.['x-vercel-forwarded-for'];
        if (typeof xVercelForwarded === 'string' && xVercelForwarded.trim()) {
            const first = xVercelForwarded.split(',')[0].trim();
            if (isValidIp(first)) return first;
        }

        // 3. Fallback en caso de proxy reverso estándar (toma la última IP agregada por el gateway confiable)
        const forwarded = req.headers?.['x-forwarded-for'];
        if (typeof forwarded === 'string' && forwarded.trim()) {
            const parts = forwarded.split(',').map(s => s.trim()).filter(isValidIp);
            if (parts.length > 0) {
                return parts[parts.length - 1];
            }
        }
    }

    // 4. Socket directo (desarrollo local o entorno Express directo sin proxy)
    const rawIp = req.socket?.remoteAddress || req.connection?.remoteAddress || req.ip || '127.0.0.1';
    if (typeof rawIp === 'string' && rawIp.startsWith('::ffff:')) {
        const unmapped = rawIp.slice(7);
        if (isValidIp(unmapped)) return unmapped;
    }

    return isValidIp(rawIp) ? rawIp : '127.0.0.1';
}

export default getTrustedClientIp;
