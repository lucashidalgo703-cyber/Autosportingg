/**
 * AUTOSPORTING INTELLIGENCE — SERVICIO CLIENTE PARA WEB PUSH Y NOTIFICACIONES MÓVILES
 * Conforme a estándares W3C Push API y compatibilidad con iOS Safari (iOS 16.4+) y Android Chrome.
 */

/**
 * Comprueba si el navegador actual soporta Service Worker y Push API
 */
export function isPushSupported() {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

/**
 * Obtiene el estado actual del permiso de notificaciones ('default' | 'granted' | 'denied')
 */
export function getNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'unsupported';
    }
    return Notification.permission;
}

/**
 * Convierte una clave VAPID en Base64 URL Safe a un ArrayBuffer Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Registra el Service Worker de la aplicación si no está activo aún
 */
export async function ensureServiceWorkerReady() {
    if (!('serviceWorker' in navigator)) {
        throw new Error('Service Workers no están soportados en este navegador.');
    }

    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }

    return await navigator.serviceWorker.ready;
}

/**
 * Solicita permiso explícito y registra la suscripción Web Push en el servidor
 */
export async function subscribeToPushNotifications({ token, deviceName = null, baseUrl = '' }) {
    if (!isPushSupported()) {
        throw new Error('Tu navegador no soporta notificaciones push. En iPhone, debes instalar la app en la Pantalla de Inicio (iOS 16.4+).');
    }

    // 1. Solicitar permiso explícito al usuario
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        if (permission === 'denied') {
            throw new Error('El permiso de notificaciones fue bloqueado en este navegador. Habilítalo en la configuración del sitio.');
        }
        throw new Error('Permiso de notificaciones no concedido.');
    }

    // 2. Obtener Service Worker activo
    const swReg = await ensureServiceWorkerReady();

    // 3. Obtener clave pública VAPID del backend
    const keyRes = await fetch(`${baseUrl}/api/admin/push/vapid-public-key`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!keyRes.ok) {
        const err = await keyRes.json().catch(() => ({}));
        throw new Error(err.message || 'Error al obtener la clave pública VAPID.');
    }

    const { publicKey } = await keyRes.json();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // 4. Suscribir a través del PushManager del navegador
    let subscription = await swReg.pushManager.getSubscription();
    if (!subscription) {
        subscription = await swReg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey
        });
    }

    const subJson = subscription.toJSON();

    // 5. Detectar información básica del cliente
    const ua = navigator.userAgent || '';
    let detectedDeviceName = deviceName;
    if (!detectedDeviceName) {
        if (/iPhone/i.test(ua)) detectedDeviceName = 'iPhone (Safari)';
        else if (/iPad/i.test(ua)) detectedDeviceName = 'iPad (Safari)';
        else if (/Android/i.test(ua)) detectedDeviceName = 'Celular Android';
        else if (/Mac/i.test(ua)) detectedDeviceName = 'MacBook / Mac';
        else if (/Windows/i.test(ua)) detectedDeviceName = 'PC Windows';
        else detectedDeviceName = 'Navegador Web';
    }

    // 6. Enviar suscripción al backend
    const saveRes = await fetch(`${baseUrl}/api/admin/push/subscribe`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            subscription: {
                endpoint: subJson.endpoint,
                keys: subJson.keys
            },
            deviceInfo: {
                deviceName: detectedDeviceName
            }
        })
    });

    if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        throw new Error(err.message || 'Error al registrar la suscripción en el servidor.');
    }

    return await saveRes.json();
}

/**
 * Consulta los dispositivos suscritos del Propietario
 */
export async function fetchPushSubscriptions({ token, baseUrl = '' }) {
    const res = await fetch(`${baseUrl}/api/admin/push/subscriptions`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al consultar dispositivos suscritos');
    }

    const data = await res.json();
    return data.subscriptions || [];
}

/**
 * Revoca una suscripción registrada
 */
export async function revokePushSubscription({ token, subscriptionId, baseUrl = '' }) {
    const res = await fetch(`${baseUrl}/api/admin/push/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al revocar la suscripción');
    }

    return await res.json();
}

/**
 * Envía una notificación push de prueba
 */
export async function sendTestPushNotification({ token, deviceName = null, baseUrl = '' }) {
    const res = await fetch(`${baseUrl}/api/admin/push/test`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deviceName })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al emitir notificación de prueba');
    }

    return await res.json();
}

/**
 * Actualiza la preferencia de alertas no críticas
 */
export async function updatePushPreferences({ token, subscriptionId, nonCriticalEnabled, baseUrl = '' }) {
    const res = await fetch(`${baseUrl}/api/admin/push/preferences`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscriptionId, nonCriticalEnabled })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al actualizar preferencias');
    }

    return await res.json();
}
