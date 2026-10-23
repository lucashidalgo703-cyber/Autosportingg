import {
    browserSupportsWebAuthn,
    platformAuthenticatorIsAvailable,
    startAuthentication,
    startRegistration
} from '@simplewebauthn/browser';
import {
    getPersistentDeviceId,
    getOrCreateDeviceKeyPair,
    requestAndSignDeviceChallenge
} from './deviceSecurityService.js';

/**
 * Comprueba si el navegador actual soporta WebAuthn / Passkeys
 */
export function isWebAuthnSupported() {
    return browserSupportsWebAuthn();
}

/**
 * Comprueba si el dispositivo cuenta con autenticador de plataforma
 * (Windows Hello, Touch ID, Face ID, PIN del dispositivo)
 */
export async function isPlatformAuthenticatorReady() {
    try {
        if (!browserSupportsWebAuthn()) return false;
        return await platformAuthenticatorIsAvailable();
    } catch {
        return false;
    }
}

/**
 * Registra una nueva Passkey desde el Centro de Seguridad
 * @param {string} name - Nombre asignado por el propietario (ej. 'PC Agencia', 'iPhone')
 * @param {string} token - Token JWT de sesión del propietario
 * @param {string} baseUrl - URL base de la API (opcional)
 */
export async function registerNewPasskey({ name, token, baseUrl = '' }) {
    if (!browserSupportsWebAuthn()) {
        throw new Error('Tu navegador no soporta autenticación mediante Passkeys/WebAuthn.');
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
            name: name.trim()
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

    // 1. Obtener opciones de autenticación del servidor
    const optRes = await fetch(`${baseUrl}/api/login/passkey/options`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${challengeId}`
        },
        body: JSON.stringify({ challengeId })
    });

    if (!optRes.ok) {
        const errData = await optRes.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al iniciar desafío de passkey');
    }

    const options = await optRes.json();

    // 2. Ejecutar ceremonia de autenticación en el navegador
    let asseResp;
    try {
        asseResp = await startAuthentication({ optionsJSON: options });
    } catch (err) {
        if (err.name === 'NotAllowedError') {
            throw new Error('Autenticación cancelada o tiempo de espera agotado.');
        }
        throw new Error('Fallo en autenticación con passkey: ' + (err.message || 'Error de autenticador'));
    }

    // 3. Recopilar datos criptográficos del dispositivo confiable (TrustedDevice handshake)
    const deviceId = getPersistentDeviceId();
    let keyData = null;
    try {
        keyData = await getOrCreateDeviceKeyPair();
    } catch {}

    let challengeData = null;
    try {
        challengeData = await requestAndSignDeviceChallenge(deviceId, 'login_passkey', baseUrl);
    } catch {}

    // 4. Enviar verificación al servidor
    const verifyRes = await fetch(`${baseUrl}/api/login/passkey/verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${challengeId}`,
            'X-Device-Id': deviceId
        },
        body: JSON.stringify({
            challengeId,
            credential: asseResp,
            deviceId,
            publicKey: keyData?.publicKeyJwk,
            deviceChallengeId: challengeData?.challengeId,
            signature: challengeData?.signature
        })
    });

    if (!verifyRes.ok) {
        const errData = await verifyRes.json().catch(() => ({}));
        throw new Error(errData.message || 'Verificación de passkey rechazada por el servidor');
    }

    return await verifyRes.json();
}

/**
 * Obtiene la lista de passkeys registradas del propietario
 */
export async function fetchUserPasskeys({ token, baseUrl = '' }) {
    const res = await fetch(`${baseUrl}/api/admin/passkeys`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al obtener lista de passkeys');
    }

    const data = await res.json();
    return data.passkeys || [];
}

/**
 * Revoca una passkey registrada
 */
export async function revokeUserPasskey({ credentialId, reason, token, baseUrl = '' }) {
    const res = await fetch(`${baseUrl}/api/admin/passkeys/${encodeURIComponent(credentialId)}/revoke`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al revocar passkey');
    }

    return await res.json();
}
