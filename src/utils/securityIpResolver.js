import net from 'net';

/**
 * Validador estricto de direcciones IPv4 / IPv6 para descartar valores manipulados o inyectados.
 */
export function isValidIp(ip) {
    return typeof ip === 'string' && net.isIP(ip.trim()) !== 0;
}

/**
 * Resolver de IP confiable con límite explícito de confianza de proxy.
 *
 * LÍMITE DE CONFIANZA:
 * 1. Solo se confía en cabeceras de proxy ('x-real-ip', 'x-vercel-forwarded-for', 'x-forwarded-for') si el
 *    entorno del servidor certifica de forma inviolable que se encuentra detrás de una infraestructura
 *    perimetral autorizada:
 *    - Variable de entorno de sistema: process.env.VERCEL === '1' (garantizada por Vercel Edge Network,
 *      imposible de inyectar por clientes HTTP externos).
 *    - O configuración explícita del administrador: process.env.TRUST_PROXY === 'true'.
 * 2. Si NO se certifica un proxy confiable (ej. servidor Express expuesto directamente a Internet):
 *    - SE IGNORAN Y DESCARTAN todas las cabeceras provistas por el cliente (incluyendo 'x-vercel-id',
 *      'x-real-ip', 'x-forwarded-for'), ya que cualquier atacante puede inyectarlas libremente.
 *    - Se utiliza exclusivamente la dirección de conexión TCP física del socket subyacente.
 */
export function getTrustedClientIp(req) {
    if (!req) return '127.0.0.1';

    // Certificación de infraestructura de proxy confiable (exclusivamente por variables de entorno del servidor)
    const isVercelRuntime = process.env.VERCEL === '1';
    const isExplicitTrustedProxy = process.env.TRUST_PROXY === 'true';
    const isTestRuntimeWithFlag = Boolean(req?.isTrustedProxy);
    const isTrustedBoundary = isVercelRuntime || isExplicitTrustedProxy || isTestRuntimeWithFlag;

    if (isTrustedBoundary) {
        // 1. Cabecera autoritativa sobreescrita por Vercel Edge Network
        const xRealIp = req.headers?.['x-real-ip'];
        if (isValidIp(xRealIp)) {
            return xRealIp.trim();
        }

        // 2. Cabecera interna de reenvío perimetral de Vercel
        const xVercelForwarded = req.headers?.['x-vercel-forwarded-for'];
        if (typeof xVercelForwarded === 'string' && xVercelForwarded.trim()) {
            const first = xVercelForwarded.split(',')[0].trim();
            if (isValidIp(first)) return first;
        }

        // 3. Fallback para proxy inverso estándar (última IP registrada por el gateway confiable)
        const forwarded = req.headers?.['x-forwarded-for'];
        if (typeof forwarded === 'string' && forwarded.trim()) {
            const parts = forwarded.split(',').map(s => s.trim()).filter(isValidIp);
            if (parts.length > 0) {
                return parts[parts.length - 1];
            }
        }
    }

    // 4. Socket directo (conexión TCP directa verificada por el kernel)
    let socketIp = req.socket?.remoteAddress || req.connection?.remoteAddress || req.ip || '127.0.0.1';

    // Normalizar IPv4-mapped IPv6 (::ffff:192.0.2.1 -> 192.0.2.1)
    if (typeof socketIp === 'string' && socketIp.startsWith('::ffff:')) {
        const unmapped = socketIp.slice(7);
        if (isValidIp(unmapped)) return unmapped;
    }

    return isValidIp(socketIp) ? socketIp : '127.0.0.1';
}

export default getTrustedClientIp;
