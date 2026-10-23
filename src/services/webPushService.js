import crypto from 'crypto';
import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';
import PushDeliveryLog from '../models/PushDeliveryLog.js';
import AdminUser from '../models/AdminUser.js';
import { validatePushEndpoint, sanitizePushEndpoint } from '../utils/webPushEndpointValidator.js';

/**
 * AUTOSPORTING INTELLIGENCE — SERVICIO WEB PUSH DE SEGURIDAD
 * Implementación conforme a W3C Push API, RFC 8291 y RFC 8292 (VAPID).
 */

// Memoria efímera para claves VAPID en entorno de desarrollo/pruebas locales si no hay .env
let cachedVapidKeys = null;

// Memoria de control de tasa para prevenir tormentas de alertas (Rate Limiting en memoria)
const dispatchHistory = [];
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const MAX_PUSH_PER_WINDOW = 10;

/**
 * Obtiene o inicializa las claves VAPID del sistema sin persistir secretos en git ni exponerlos
 */
export function getOrInitializeVapidKeys() {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        return {
            publicKey: process.env.VAPID_PUBLIC_KEY.trim(),
            privateKey: process.env.VAPID_PRIVATE_KEY.trim(),
            subject: (process.env.VAPID_SUBJECT || 'mailto:seguridad@autosporting.com.ar').trim()
        };
    }

    if (!cachedVapidKeys) {
        const generated = webpush.generateVAPIDKeys();
        cachedVapidKeys = {
            publicKey: generated.publicKey,
            privateKey: generated.privateKey,
            subject: 'mailto:seguridad-demo@autosporting.local'
        };
    }

    return cachedVapidKeys;
}

/**
 * Configura los detalles de VAPID en el cliente webpush
 */
export function configureWebPushDetails() {
    const keys = getOrInitializeVapidKeys();
    webpush.setVapidDetails(
        keys.subject,
        keys.publicKey,
        keys.privateKey
    );
    return keys;
}

/**
 * Devuelve la clave pública VAPID para que el navegador del propietario inicie la suscripción
 */
export function getVapidPublicKey() {
    const keys = getOrInitializeVapidKeys();
    return keys.publicKey;
}

/**
 * Registra o reactiva una suscripción Push vinculada exclusivamente al Propietario
 */
export async function subscribeOwnerDevice({
    userId,
    userEmail,
    subscription,
    deviceInfo = {},
    allowLoopback = false
}) {
    if (!subscription || !subscription.endpoint || !subscription.keys) {
        const err = new Error('Estructura de suscripción Push inválida. Se requiere endpoint y keys (p256dh, auth).');
        err.status = 400;
        throw err;
    }

    const { endpoint, keys } = subscription;
    if (!keys.p256dh || !keys.auth) {
        const err = new Error('Las claves criptográficas p256dh y auth son obligatorias.');
        err.status = 400;
        throw err;
    }

    // Validación estricta de seguridad y prevención de SSRF
    const endpointValidation = validatePushEndpoint(endpoint, { allowLoopback });
    if (!endpointValidation.valid) {
        const err = new Error(endpointValidation.reason || 'Endpoint de suscripción no autorizado');
        err.status = 400;
        throw err;
    }

    const endpointHash = PushSubscription.hashEndpoint(endpoint);

    // Buscar si ya existe una suscripción para este endpoint
    let pushSub = await PushSubscription.findOne({ endpointHash });

    if (pushSub) {
        // Si ya existía, reactivarla y actualizar claves y metadatos
        pushSub.userId = userId;
        pushSub.userEmail = userEmail;
        pushSub.keys = { p256dh: keys.p256dh, auth: keys.auth };
        pushSub.status = 'active';
        pushSub.revokedAt = null;
        pushSub.revokedReason = null;
        pushSub.deviceInfo = {
            deviceId: deviceInfo.deviceId || pushSub.deviceInfo?.deviceId || null,
            deviceName: deviceInfo.deviceName || pushSub.deviceInfo?.deviceName || 'Dispositivo móvil',
            os: deviceInfo.os || pushSub.deviceInfo?.os || 'unknown',
            browser: deviceInfo.browser || pushSub.deviceInfo?.browser || 'unknown',
            ip: deviceInfo.ip || pushSub.deviceInfo?.ip || null,
            userAgent: deviceInfo.userAgent || pushSub.deviceInfo?.userAgent || null
        };
        pushSub.lastSeenAt = new Date();
        await pushSub.save();
    } else {
        const subscriptionId = `psub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        pushSub = new PushSubscription({
            subscriptionId,
            userId,
            userEmail,
            endpoint,
            endpointHash,
            keys: { p256dh: keys.p256dh, auth: keys.auth },
            status: 'active',
            deviceInfo: {
                deviceId: deviceInfo.deviceId || null,
                deviceName: deviceInfo.deviceName || 'Dispositivo móvil',
                os: deviceInfo.os || 'unknown',
                browser: deviceInfo.browser || 'unknown',
                ip: deviceInfo.ip || null,
                userAgent: deviceInfo.userAgent || null
            },
            lastSeenAt: new Date()
        });
        await pushSub.save();
    }

    return {
        subscriptionId: pushSub.subscriptionId,
        deviceName: pushSub.deviceInfo.deviceName,
        status: pushSub.status,
        createdAt: pushSub.createdAt
    };
}

/**
 * Consulta las suscripciones activas del Propietario
 */
export async function listOwnerSubscriptions(userId) {
    const list = await PushSubscription.find({ userId, status: 'active' })
        .sort({ createdAt: -1 })
        .lean();

    return list.map(sub => ({
        subscriptionId: sub.subscriptionId,
        deviceName: sub.deviceInfo?.deviceName || 'Dispositivo móvil',
        os: sub.deviceInfo?.os,
        browser: sub.deviceInfo?.browser,
        ip: sub.deviceInfo?.ip,
        createdAt: sub.createdAt,
        lastSeenAt: sub.lastSeenAt,
        preferences: sub.preferences,
        stats: sub.stats
    }));
}

/**
 * Revoca formalmente una suscripción de dispositivo
 */
export async function revokeOwnerSubscription({ userId, subscriptionId, reason = 'Revocada por el propietario' }) {
    const sub = await PushSubscription.findOne({ subscriptionId, userId });
    if (!sub) {
        const err = new Error('Suscripción Push no encontrada o no pertenece al usuario autenticado');
        err.status = 404;
        throw err;
    }

    sub.status = 'revoked';
    sub.revokedAt = new Date();
    sub.revokedReason = reason;
    await sub.save();

    return {
        subscriptionId: sub.subscriptionId,
        status: sub.status,
        revokedAt: sub.revokedAt
    };
}

/**
 * Actualiza las preferencias de categorías para el propietario
 */
export async function updateSubscriptionPreferences({ userId, subscriptionId, nonCriticalEnabled }) {
    const sub = await PushSubscription.findOne({ subscriptionId, userId });
    if (!sub) {
        const err = new Error('Suscripción Push no encontrada');
        err.status = 404;
        throw err;
    }

    if (typeof nonCriticalEnabled === 'boolean') {
        sub.preferences.nonCriticalEnabled = nonCriticalEnabled;
    }

    await sub.save();
    return sub;
}

/**
 * Evalúa si una alerta califica para envío Push según severidad y reglas de filtrado
 */
export function qualifiesForPushNotification(alert) {
    if (!alert || !alert.type) return false;

    // Regla: No generar notificaciones por accesos habituales o IP cambiada sola
    if (alert.type === 'IP_CHANGED' || alert.type === 'ROUTINE_LOGIN') {
        return false;
    }

    const highPriorityTypes = [
        'UNRECOGNIZED_DEVICE_LOGIN',
        'FAILED_LOGINS_FLOOD',
        'PASSKEY_REGISTERED',
        'TRUSTED_DEVICE_REGISTERED',
        'MFA_REPEATED_FAILURES'
    ];

    const criticalPriorityTypes = [
        'REVOKED_DEVICE_ACCESS',
        'INVALID_SESSION_ACCESS',
        'EMERGENCY_RECOVERY_EXECUTED',
        'AUDIT_INTEGRITY_ANOMALY'
    ];

    if (criticalPriorityTypes.includes(alert.type) || alert.severity === 'critical') {
        return { qualifies: true, priority: 'critical' };
    }

    if (highPriorityTypes.includes(alert.type) || alert.severity === 'warning') {
        return { qualifies: true, priority: 'high' };
    }

    return false;
}

/**
 * Construye el payload seguro para la notificación Web Push
 * No incluye contraseñas, TOTP, JWT, claves privadas ni datos financieros.
 */
export function buildSecurePushPayload(alert) {
    const isCritical = alert.severity === 'critical';
    const severidadLabel = isCritical ? 'CRÍTICA' : 'ALTA';
    const deviceStr = alert.metadata?.deviceName || alert.deviceId ? `\nDispositivo: ${alert.metadata?.deviceName || alert.deviceId}` : '';

    return {
        title: 'AUTOSPORTING INTELLIGENCE',
        body: `Alerta de seguridad [${severidadLabel}]: ${alert.title}\n${alert.description}${deviceStr}\nEstado: Requiere revisión.`,
        icon: '/logo192.png',
        badge: '/badge.png',
        tag: `autosporting-security-${alert.type}-${alert.alertId || Date.now()}`,
        requireInteraction: isCritical,
        data: {
            alertId: alert.alertId,
            type: alert.type,
            severity: alert.severity,
            timestamp: alert.createdAt ? alert.createdAt.toISOString() : new Date().toISOString(),
            url: '/admin/seguridad',
            device: alert.metadata?.deviceName || alert.deviceId || null
        }
    };
}

/**
 * Comprueba y aplica la protección contra tormentas de alertas (Rate Limiting)
 */
function checkRateLimit() {
    const now = Date.now();
    const cutoff = now - RATE_LIMIT_WINDOW_MS;

    // Purgar entradas antiguas
    while (dispatchHistory.length > 0 && dispatchHistory[0] < cutoff) {
        dispatchHistory.shift();
    }

    if (dispatchHistory.length >= MAX_PUSH_PER_WINDOW) {
        return false;
    }

    dispatchHistory.push(now);
    return true;
}

/**
 * Despacha la notificación Push a una suscripción específica con manejo de 404/410 y reintentos
 */
export async function sendNotificationToSubscription({
    subscription,
    payload,
    alert,
    customClient = null
}) {
    const client = customClient || webpush;
    configureWebPushDetails();

    const pushSubscriptionObj = {
        endpoint: subscription.endpoint,
        keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth
        }
    };

    const logId = `plog_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const stringifiedPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);

    try {
        const response = await client.sendNotification(pushSubscriptionObj, stringifiedPayload, {
            TTL: 86400, // 24 horas en cola del servicio Push
            urgency: alert.severity === 'critical' ? 'high' : 'normal'
        });

        const statusCode = response?.statusCode || 201;

        // Registrar entrega aceptada por el proveedor Push
        await PushDeliveryLog.create({
            logId,
            alertId: alert.alertId || 'test_alert',
            subscriptionId: subscription.subscriptionId,
            endpointHash: subscription.endpointHash,
            eventType: alert.type || 'TEST_PUSH',
            severity: alert.severity || 'info',
            status: 'accepted',
            statusCode,
            attempt: 1
        }).catch(() => {});

        // Actualizar estadísticas de la suscripción
        await PushSubscription.updateOne(
            { _id: subscription._id },
            {
                $inc: { 'stats.sentCount': 1 },
                $set: {
                    'stats.lastDeliveredAt': new Date(),
                    lastSeenAt: new Date()
                }
            }
        ).catch(() => {});

        return { success: true, statusCode, status: 'accepted' };
    } catch (err) {
        const statusCode = err.statusCode || 500;
        const errMsg = err.message || 'Error desconocido al enviar notificación push';

        // Manejo automático de 404 / 410: Suscripción revocada o expirada en el dispositivo
        if (statusCode === 404 || statusCode === 410) {
            await PushSubscription.updateOne(
                { _id: subscription._id },
                {
                    $set: {
                        status: 'expired',
                        revokedAt: new Date(),
                        revokedReason: 'PUSH_SERVICE_EXPIRED_OR_UNSUBSCRIBED',
                        'stats.lastFailureAt': new Date(),
                        'stats.lastFailureReason': `HTTP ${statusCode}: Suscripción invalidada por proveedor push`
                    },
                    $inc: { 'stats.failureCount': 1 }
                }
            ).catch(() => {});

            await PushDeliveryLog.create({
                logId,
                alertId: alert.alertId || 'test_alert',
                subscriptionId: subscription.subscriptionId,
                endpointHash: subscription.endpointHash,
                eventType: alert.type || 'TEST_PUSH',
                severity: alert.severity || 'info',
                status: 'expired',
                statusCode,
                error: errMsg,
                attempt: 1
            }).catch(() => {});

            return { success: false, statusCode, status: 'expired', error: errMsg };
        }

        // Fallo temporal o error de red
        await PushSubscription.updateOne(
            { _id: subscription._id },
            {
                $set: {
                    'stats.lastFailureAt': new Date(),
                    'stats.lastFailureReason': errMsg
                },
                $inc: { 'stats.failureCount': 1 }
            }
        ).catch(() => {});

        await PushDeliveryLog.create({
            logId,
            alertId: alert.alertId || 'test_alert',
            subscriptionId: subscription.subscriptionId,
            endpointHash: subscription.endpointHash,
            eventType: alert.type || 'TEST_PUSH',
            severity: alert.severity || 'info',
            status: 'failed',
            statusCode,
            error: errMsg,
            attempt: 1
        }).catch(() => {});

        return { success: false, statusCode, status: 'failed', error: errMsg };
    }
}

/**
 * Despacha una alerta a todas las suscripciones Push activas del Propietario de forma desacoplada
 */
export async function dispatchAlertPushNotification(alert, { customClient = null } = {}) {
    const qualification = qualifiesForPushNotification(alert);
    if (!qualification || !qualification.qualifies) {
        return { dispatched: false, reason: 'ALERT_DOES_NOT_QUALIFY_FOR_PUSH' };
    }

    // Deduplicación / Límite de frecuencia (Anti-storm protection)
    if (!checkRateLimit()) {
        return { dispatched: false, reason: 'RATE_LIMIT_EXCEEDED_ALERT_STORM_PROTECTION' };
    }

    // Buscar propietarios activos
    const owners = await AdminUser.find({ role: 'owner' }, { _id: 1, email: 1 }).lean();
    const ownerIds = owners.map(o => String(o._id));

    // Si la alerta tiene userEmail específico y ese usuario es owner, podemos priorizarlo,
    // o enviar a todos los propietarios suscritos si es crítica
    const targetQuery = {
        userId: { $in: ownerIds },
        status: 'active'
    };

    if (qualification.priority !== 'critical') {
        // Para alertas no críticas, respetar preferencia nonCriticalEnabled
        targetQuery['preferences.nonCriticalEnabled'] = { $ne: false };
    }

    const subscriptions = await PushSubscription.find(targetQuery);
    if (!subscriptions || subscriptions.length === 0) {
        return { dispatched: false, reason: 'NO_ACTIVE_OWNER_SUBSCRIPTIONS' };
    }

    const payload = buildSecurePushPayload(alert);

    // Despacho asíncrono para cada dispositivo suscrito
    const deliveryPromises = subscriptions.map(sub => 
        sendNotificationToSubscription({
            subscription: sub,
            payload,
            alert,
            customClient
        })
    );

    const results = await Promise.all(deliveryPromises);
    return {
        dispatched: true,
        targetsCount: subscriptions.length,
        results
    };
}

/**
 * Envía una notificación de prueba al dispositivo o a los dispositivos del Propietario
 */
export async function sendTestPushNotification({ userId, deviceName = null, customClient = null }) {
    const subscriptions = await PushSubscription.find({ userId, status: 'active' });
    if (!subscriptions || subscriptions.length === 0) {
        const err = new Error('No existen suscripciones Web Push activas registradas para este dispositivo/usuario.');
        err.status = 404;
        throw err;
    }

    const testAlert = {
        alertId: `test_${Date.now()}`,
        type: 'TEST_NOTIFICATION',
        severity: 'info',
        title: 'Prueba de Alertas Push',
        description: `Notificación de prueba emitida con éxito para ${deviceName || 'la terminal del propietario'}.`,
        createdAt: new Date(),
        metadata: { deviceName }
    };

    const payload = {
        title: 'AUTOSPORTING INTELLIGENCE',
        body: `Prueba de Alertas de Seguridad\nLas notificaciones push están operando correctamente en este dispositivo.`,
        icon: '/logo192.png',
        badge: '/badge.png',
        tag: `autosporting-test-${Date.now()}`,
        data: {
            alertId: testAlert.alertId,
            type: testAlert.type,
            severity: 'info',
            timestamp: new Date().toISOString(),
            url: '/admin/seguridad'
        }
    };

    const results = await Promise.all(subscriptions.map(sub => 
        sendNotificationToSubscription({
            subscription: sub,
            payload,
            alert: testAlert,
            customClient
        })
    ));

    return { ok: true, targetsCount: subscriptions.length, results };
}

// Reset para suites de pruebas
export function _resetRateLimit() {
    dispatchHistory.length = 0;
}
