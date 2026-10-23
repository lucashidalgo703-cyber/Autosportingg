import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

/**
 * Servicio del cliente para gestionar Passkeys (WebAuthn / FIDO2)
 * Diseñado exclusivamente para el navegador del propietario (Windows Hello / Touch ID / Hardware Keys)
 */

/**
 * Comprueba si el navegador actual soporta WebAuthn y Passkeys
 */
export function browserSupportsWebAuthn() {
    return (
        typeof window !== 'undefined' &&
        window.PublicKeyCredential !== undefined &&
        typeof window.PublicKeyCredential === 'function'
    );
}

// Alias de exportación retrocompatible requerido por Login.jsx y TwoFactorConfigPage
export const isWebAuthnSupported = browserSupportsWebAuthn;
export const fetchUserPasskeys = listUserPasskeys;

/**
 * Comprueba si el autenticador de plataforma está disponible (Windows Hello, Touch ID, Face ID)
 */
export async function isPlatformAuthenticatorReady() {
    if (!browserSupportsWebAuthn()) return false;
    try {
        if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
            return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Registra una nueva Passkey desde el Centro de Seguridad o Configuración 2FA
 * @param {Object} options
 * @param {string} [options.name] - Nombre asignado por el propietario (ej. 'PC Agencia', 'iPhone')
 * @param {string} [options.friendlyName] - Alias compatible para el nombre asignado
 * @param {string} options.token - Token JWT de sesión del propietario
 * @param {string} [options.baseUrl=''] - URL base de la API (opcional)
 * @param {boolean} [options.isDemo=false] - Indica si opera en entorno de demostración
 */
export async function registerNewPasskey({ name, friendlyName, token, baseUrl = '', isDemo = false } = {}) {
    if (!browserSupportsWebAuthn()) {
        throw new Error('Tu navegador no soporta autenticación mediante Passkeys/WebAuthn.');
    }

    const candidate = (name !== undefined && name !== null) ? name : friendlyName;

    // Validación estricta de tipo de dato
    if (candidate !== undefined && candidate !== null && typeof candidate !== 'string') {
        throw new TypeError('El nombre descriptivo de la passkey debe ser una cadena de texto.');
    }

    const defaultName = isDemo ? 'AutoSporting — PRUEBA LOCAL' : 'Dispositivo Principal';
    const rawName = (candidate !== undefined && candidate !== null) ? candidate : defaultName;

    if (typeof rawName !== 'string') {
        throw new TypeError('El nombre descriptivo de la passkey debe ser una cadena de texto.');
    }

    const passkeyName = rawName.trim();

    // Validación estricta de espacios o nombre vacío
    if (!passkeyName) {
        throw new Error('El nombre descriptivo de la passkey no puede estar vacío ni contener solo espacios.');
    }

    // 1. Obtener opciones del servidor
    const optRes = await fetch(`${baseUrl}/api/admin/passkeys/generate-options`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!optRes.ok) {
        const errData = await optRes.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al obtener opciones de registro WebAuthn');
    }

    const options = await optRes.json();

    // 2. Ejecutar la ceremonia en el navegador (Windows Hello / Touch ID / Face ID)
    let attResp;
    try {
        attResp = await startRegistration({ optionsJSON: options });
    } catch (err) {
        if (err.name === 'NotAllowedError') {
            throw new Error('Operación cancelada por el usuario o tiempo agotado.');
        }
        throw new Error('Error al registrar la passkey: ' + (err.message || 'Error desconocido'));
    }

    // 3. Enviar respuesta de credencial al backend para verificación y guardado
    const verifyRes = await fetch(`${baseUrl}/api/admin/passkeys/verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            credential: attResp,
            name: passkeyName
        })
    });

    if (!verifyRes.ok) {
        const errData = await verifyRes.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al validar la credencial con el servidor');
    }

    return await verifyRes.json();
}

/**
 * Inicia sesión utilizando Passkey como segundo factor
 * @param {string} challengeId - Token JWT temporal 2fa_challenge emitido tras validar contraseña
 * @param {string} baseUrl - URL base de la API (opcional)
 */
export async function loginWithPasskey({ challengeId, baseUrl = '' }) {
    if (!browserSupportsWebAuthn()) {
        throw new Error('Tu navegador no soporta autenticación mediante Passkeys/WebAuthn.');
    }

    // 1. Obtener opciones de autenticación
    const optRes = await fetch(`${baseUrl}/api/auth/passkeys/generate-auth-options`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ challengeId })
    });

    if (!optRes.ok) {
        const errData = await optRes.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al obtener desafío de autenticación WebAuthn');
    }

    const options = await optRes.json();

    // 2. Ejecutar ceremonia biométrica (Windows Hello / PIN)
    let asResp;
    try {
        asResp = await startAuthentication({ optionsJSON: options });
    } catch (err) {
        if (err.name === 'NotAllowedError') {
            throw new Error('Inicio con Passkey cancelado por el usuario.');
        }
        throw new Error('Error al autenticar con passkey: ' + (err.message || 'Error desconocido'));
    }

    // 3. Verificar aserción en el backend
    const verifyRes = await fetch(`${baseUrl}/api/auth/passkeys/verify-auth`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            challengeId,
            credential: asResp
        })
    });

    if (!verifyRes.ok) {
        const errData = await verifyRes.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al verificar la firma de la Passkey');
    }

    return await verifyRes.json();
}

/**
 * Lista las Passkeys registradas para el usuario actual
 */
export async function listUserPasskeys({ token, baseUrl = '' }) {
    const res = await fetch(`${baseUrl}/api/admin/passkeys`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!res.ok) {
        throw new Error('Error al obtener la lista de Passkeys');
    }

    const data = await res.json();
    return data.passkeys || [];
}

/**
 * Revoca una Passkey registrada
 */
export async function revokeUserPasskey({ token, credentialId, reason = 'Revocada por el propietario', baseUrl = '' }) {
    const res = await fetch(`${baseUrl}/api/admin/passkeys/${credentialId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al revocar la Passkey');
    }

    return await res.json();
}
