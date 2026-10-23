import fs from 'node:fs';
import path from 'node:path';

/**
 * Valida de forma estricta que una URI de MongoDB apunte exclusivamente
 * a loopback local y no a servidores externos ni use resolución SRV remota.
 *
 * @param {string} uri - URI de conexión de MongoDB
 * @returns {{ valid: boolean, hosts: Array<{host: string, port: number}>, error?: string }}
 */
export function validateDemoMongoUri(uri) {
    if (!uri || typeof uri !== 'string') {
        return { valid: false, hosts: [], error: 'URI de MongoDB indefinida o inválida' };
    }

    const trimmed = uri.trim();

    // 1. Prohibir estrictamente mongodb+srv:// (descubrimiento DNS remoto)
    if (trimmed.startsWith('mongodb+srv://') || trimmed.toLowerCase().includes('+srv')) {
        return { valid: false, hosts: [], error: 'Protocolo mongodb+srv:// no autorizado para pruebas locales.' };
    }

    // 2. Debe comenzar estrictamente con mongodb://
    if (!trimmed.startsWith('mongodb://')) {
        return { valid: false, hosts: [], error: 'Protocolo inválido. Solo se admite mongodb:// local.' };
    }

    try {
        // Extraer la porción de autoridad y hosts: entre 'mongodb://' y el primer '/' o '?'
        const afterScheme = trimmed.slice('mongodb://'.length);
        const hostPortion = afterScheme.split('/')[0].split('?')[0];

        if (!hostPortion) {
            return { valid: false, hosts: [], error: 'URI sin especificación de host o puerto.' };
        }

        // Si contiene credenciales ('user:pass@hosts'), remover la parte previa a '@'
        let hostsString = hostPortion;
        if (hostsString.includes('@')) {
            const parts = hostsString.split('@');
            hostsString = parts[parts.length - 1]; // tomar lo que está después del último '@'
        }

        // Soportar lista de réplicas separadas por coma
        const rawHosts = hostsString.split(',');
        if (rawHosts.length === 0) {
            return { valid: false, hosts: [], error: 'Lista de hosts vacía.' };
        }

        const parsedHosts = [];
        const ALLOWED_LOOPBACK_HOSTS = new Set([
            '127.0.0.1',
            'localhost',
            '::1',
            '[::1]'
        ]);

        for (const rawHost of rawHosts) {
            const h = rawHost.trim();
            if (!h) {
                return { valid: false, hosts: [], error: 'Host vacío detectado en la cadena de réplica.' };
            }

            // Separar host y puerto
            let hostname = '';
            let portStr = '';

            if (h.startsWith('[')) {
                // IPv6 [::1]:port
                const closeIdx = h.indexOf(']');
                if (closeIdx === -1) {
                    return { valid: false, hosts: [], error: `Formato IPv6 inválido en host: ${h}` };
                }
                hostname = h.slice(0, closeIdx + 1);
                const remainder = h.slice(closeIdx + 1);
                if (remainder.startsWith(':')) {
                    portStr = remainder.slice(1);
                }
            } else {
                const colonParts = h.split(':');
                if (colonParts.length === 2) {
                    hostname = colonParts[0].toLowerCase();
                    portStr = colonParts[1];
                } else if (colonParts.length === 1) {
                    hostname = colonParts[0].toLowerCase();
                    portStr = '27017'; // default mongo port
                } else {
                    return { valid: false, hosts: [], error: `Múltiples dos puntos en host inválido: ${h}` };
                }
            }

            // Validar hostname estricto contra loopback
            if (!ALLOWED_LOOPBACK_HOSTS.has(hostname)) {
                return { 
                    valid: false, 
                    hosts: [], 
                    error: `Destino no loopback denegado: "${hostname}". Solo se admiten 127.0.0.1, localhost o ::1.` 
                };
            }

            // Validar puerto
            const portNum = Number.parseInt(portStr, 10);
            if (!Number.isInteger(portNum) || portNum < 1024 || portNum > 65535) {
                return { 
                    valid: false, 
                    hosts: [], 
                    error: `Puerto fuera de rango válido (1024-65535): "${portStr}" en ${h}.` 
                };
            }

            parsedHosts.push({ host: hostname, port: portNum });
        }

        return { valid: true, hosts: parsedHosts };
    } catch (err) {
        return { valid: false, hosts: [], error: `Error procesando URI: ${err.message}` };
    }
}

/**
 * Valida un número de puerto backend para asegurar que sea numérico y seguro
 * @param {string|number} port
 * @returns {number|null}
 */
export function validateBackendPort(port) {
    if (port === undefined || port === null) return 3001;
    const num = Number.parseInt(String(port), 10);
    if (Number.isInteger(num) && num >= 1024 && num <= 65535) {
        return num;
    }
    return null;
}

/**
 * Verifica si existen archivos .env no autorizados en el directorio raíz.
 * Solo se permite .env.example. Si existe cualquier otro archivo de entorno
 * (ej. .env, .env.local, .env.production), devuelve error para abortar.
 *
 * @param {string} rootDir
 * @returns {{ safe: boolean, unauthorizedFiles: string[] }}
 */
export function checkForUnauthorizedEnvFiles(rootDir) {
    try {
        const files = fs.readdirSync(rootDir);
        const unauthorized = files.filter(f => {
            const lower = f.toLowerCase();
            return lower.startsWith('.env') && lower !== '.env.example';
        });

        return {
            safe: unauthorized.length === 0,
            unauthorizedFiles: unauthorized
        };
    } catch {
        return { safe: true, unauthorizedFiles: [] };
    }
}

/**
 * Construye un objeto de entorno limpio y estrictamente aislado para procesos
 * hijos de la demo (Next.js), eliminando variables heredadas del sistema
 * que pudieran contener secretos externos o configuraciones de producción.
 *
 * @param {NodeJS.ProcessEnv} parentEnv - Variables del proceso padre
 * @param {Record<string, string>} explicitDemoVars - Variables explícitas de la demo
 * @returns {Record<string, string>}
 */
export function filterDemoChildProcessEnv(parentEnv = {}, explicitDemoVars = {}) {
    // Whitelist estricta de variables de sistema imprescindibles para Node y Next.js en Windows/Linux
    const SYSTEM_KEYS = [
        'PATH', 'Path', 'path',
        'SYSTEMROOT', 'SystemRoot', 'systemroot',
        'COMSPEC', 'ComSpec', 'comspec',
        'TEMP', 'TMP', 'temp', 'tmp',
        'APPDATA', 'LOCALAPPDATA',
        'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH',
        'OS', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE',
        'HOME', 'SHELL', 'USER', 'LANG', 'LC_ALL'
    ];

    const cleanEnv = {};

    for (const key of SYSTEM_KEYS) {
        if (parentEnv[key] !== undefined) {
            cleanEnv[key] = parentEnv[key];
        }
    }

    // Inyectar exclusivamente las variables de demo controladas
    for (const [key, val] of Object.entries(explicitDemoVars)) {
        if (val !== undefined && val !== null) {
            cleanEnv[key] = String(val);
        }
    }

    return cleanEnv;
}
