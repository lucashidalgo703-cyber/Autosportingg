/**
 * Resolver de IP confiable para la arquitectura de Vercel y Express.
 * Vercel Edge Network sobreescribe de forma autoritativa la cabecera 'x-real-ip'.
 * No confía en valores de 'x-forwarded-for' que puedan ser inyectados por el cliente.
 */
export function getTrustedClientIp(req) {
    if (!req) return 'unknown';

    // 1. Cabecera inyectada autoritativamente por Vercel Edge Network
    const xRealIp = req.headers?.['x-real-ip'];
    if (typeof xRealIp === 'string' && xRealIp.trim()) {
        return xRealIp.trim();
    }

    // 2. Cabecera de reenvío perimetral interna de Vercel
    const xVercelForwarded = req.headers?.['x-vercel-forwarded-for'];
    if (typeof xVercelForwarded === 'string' && xVercelForwarded.trim()) {
        const first = xVercelForwarded.split(',')[0].trim();
        if (first) return first;
    }

    // 3. Fallback en caso de proxy reverso estándar (toma el último agregado por el gateway)
    const forwarded = req.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        const parts = forwarded.split(',').map(s => s.trim()).filter(Boolean);
        if (parts.length > 0) {
            // El último elemento antes del proxy perimetral es la IP asignada por la infraestructura
            return parts[parts.length - 1];
        }
    }

    // 4. Socket directo (desarrollo local o entorno Express sin proxy)
    return req.socket?.remoteAddress || req.connection?.remoteAddress || req.ip || '127.0.0.1';
}

export default getTrustedClientIp;
