import crypto from 'crypto';
import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';
import PushDeliveryLog from '../models/PushDeliveryLog.js';
import PushSystemConfig from '../models/PushSystemConfig.js';
import TrustedDevice from '../models/TrustedDevice.js';
import AdminUser from '../models/AdminUser.js';
import { validatePushEndpoint, sanitizePushEndpoint } from '../utils/webPushEndpointValidator.js';

/**
 * AUTOSPORTING INTELLIGENCE — SERVICIO WEB PUSH RESILIENTE PARA SERVERLESS Y CRM
 * Conforme a W3C Push API, RFC 8291, RFC 8292 (VAPID).
 * Arquitectura de persistencia en MongoDB resistente a reinicios y reciclado de contenedores serverless.
 */

// Caché en memoria para claves VAPID para evitar lecturas redundantes en caliente
let cachedVapidKeys = null;

// Memoria de control de tasa para prevenir tormentas de alertas en alta prioridad
const dispatchHistory = [];
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const MAX_NON_CRITICAL_PUSH_PER_WINDOW = 10;

/**
 * Obtiene o inicializa las claves VAPID del sistema de forma persistente.
 * Prioridad:
 * 1. Variables de entorno de producción (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
 * 2. Documento persistente en MongoDB (PushSystemConfig) para que todas las instancias serverless compartan la misma clave
 * 3. Generación automática y almacenamiento atómico en MongoDB si no existen
 */
export async function getOrInitializeVapidKeysAsync({ forceRefresh = false } = {}) {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        cachedVapidKeys = {
            publicKey: process.env.VAPID_PUBLIC_KEY.trim(),
            privateKey: process.env.VAPID_PRIVATE_KEY.trim(),
            subject: (process.env.VAPID_SUBJECT || 'mailto:seguridad@autosporting.com.ar').trim()
        };
        return cachedVapidKeys;
    }

    if (cachedVapidKeys && !forceRefresh) {
        return cachedVapidKeys;
    }

    try {
        let configDoc = await PushSystemConfig.findOne({ key: 'vapid_keys' });
        if (configDoc) {
            cachedVapidKeys = {
                publicKey: configDoc.vapidPublicKey,
                privateKey: configDoc.vapidPrivateKey,
                subject: configDoc.subject
            };
            return cachedVapidKeys;
        }

        // Generar nuevo par criptográfico VAPID y persistirlo en MongoDB
        const generated = webpush.generateVAPIDKeys();
        const subject = 'mailto:seguridad@autosporting.local';

        configDoc = await PushSystemConfig.findOneAndUpdate(
            { key: 'vapid_keys' },
            {
                $setOnInsert: {
                    vapidPublicKey: generated.publicKey,
                    vapidPrivateKey: generated.privateKey,
                    subject
                }
            },
            { upsert: true, new: true }
        );

        cachedVapidKeys = {
            publicKey: configDoc.vapidPublicKey,
            privateKey: configDoc.vapidPrivateKey,
            subject: configDoc.subject
        };
        return cachedVapidKeys;
    } catch (_) {
        // Fallback efímero de emergencia si la BD no está disponible en el instante exacto
        if (!cachedVapidKeys) {
            const fallbackGenerated = webpush.generateVAPIDKeys();
            cachedVapidKeys = {
                publicKey: fallbackGenerated.publicKey,
                privateKey: fallbackGenerated.privateKey,
                subject: 'mailto:seguridad-demo@autosporting.local'
            };
        }
        return cachedVapidKeys;
    }
}

/**
 * Versión sincrónica de lectura de claves (usa caché o variables de entorno)
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
export async function getVapidPublicKey() {
    const keys = await getOrInitializeVapidKeysAsync();
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
 * Revoca todas las suscripciones Push asociadas a un dispositivo revocado en TrustedDevice
 */
export async function revokeDevicePushSubscriptions(deviceId, reason = 'Dispositivo revocado por el propietario') {
    if (!deviceId) return { modifiedCount: 0 };
    return await PushSubscription.updateMany(
        { 'deviceInfo.deviceId': deviceId, status: 'active' },
        {
            $set: {
                status: 'revoked',
                revokedAt: new Date(),
                revokedReason: reason
            }
        }
    );
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
            timestamp: alert.createdAt ? (alert.createdAt instanceof Date ? alert.createdAt.toISOString() : alert.createdAt) : new Date().toISOString(),
            url: '/admin/seguridad',
            device: alert.metadata?.deviceName || alert.deviceId || null
        }
    };
}

/**
 * Comprueba y aplica la protección contra tormentas de alertas en alta prioridad
 * No aplica a alertas CRÍTICAS.
 */
function checkNonCriticalRateLimit() {
    const now = Date.now();
    const cutoff = now - RATE_LIMIT_WINDOW_MS;

    while (dispatchHistory.length > 0 && dispatchHistory[0] < cutoff) {
        dispatchHistory.shift();
    }

    if (dispatchHistory.length >= MAX_NON_CRITICAL_PUSH_PER_WINDOW) {
        return false;
    }

    dispatchHistory.push(now);
    return true;
}

/**
 * Encola una notificación persistente en MongoDB con clave de idempotencia
 */
export async function enqueuePushNotification({ subscription, payload, alert }) {
    const alertId = alert.alertId || `alt_${Date.now()}`;
    const idempotencyKey = `${alertId}:${subscription.subscriptionId}`;

    // Comprobar si ya existe una tarea para esta alerta y dispositivo
    let logDoc = await PushDeliveryLog.findOne({ idempotencyKey });
    if (logDoc) {
        return { logDoc, isNew: false };
    }

    const logId = `plog_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    logDoc = await PushDeliveryLog.create({
        logId,
        idempotencyKey,
        alertId,
        subscriptionId: subscription.subscriptionId,
        endpointHash: subscription.endpointHash,
        eventType: alert.type || 'SECURITY_ALERT',
        severity: alert.severity || 'info',
        status: 'pending',
        attempt: 0,
        maxAttempts: 3,
        nextRetryAt: new Date(),
        payload: typeof payload === 'object' ? payload : { raw: payload }
    });

    return { logDoc, isNew: true };
}

/**
 * Despacha la notificación Push a una suscripción con persistencia atómica en MongoDB
 */
export async function sendNotificationToSubscription({
    subscription,
    payload,
    alert,
    customClient = null,
    deliveryLogDoc = null
}) {
    // 1. Comprobar estado de la suscripción
    if (subscription.status !== 'active') {
        return { success: false, status: subscription.status, reason: 'SUBSCRIPTION_NOT_ACTIVE' };
    }

    // 2. Comprobar si el dispositivo vinculado fue revocado en TrustedDevice
    if (subscription.deviceInfo?.deviceId) {
        const linkedDevice = await TrustedDevice.findOne({ deviceId: subscription.deviceInfo.deviceId }).lean();
        if (linkedDevice && linkedDevice.status === 'revoked') {
            await PushSubscription.updateOne(
                { _id: subscription._id },
                {
                    $set: {
                        status: 'revoked',
                        revokedAt: new Date(),
                        revokedReason: 'DISPOSITIVO_VINCULADO_REVOCADO'
                    }
                }
            );
            return { success: false, status: 'revoked', reason: 'LINKED_DEVICE_REVOKED' };
        }
    }

    // 3. Obtener o crear registro persistente de entrega
    let log = deliveryLogDoc;
    if (!log) {
        const enq = await enqueuePushNotification({ subscription, payload, alert });
        log = enq.logDoc;
        // Si ya fue entregada previamente, retornar éxito idempotente sin re-enviar
        if (!enq.isNew && log.status === 'accepted') {
            return { success: true, statusCode: log.statusCode, status: 'accepted', idempotent: true };
        }
    }

    // 4. Marcar en proceso
    log.status = 'processing';
    log.attempt = (log.attempt || 0) + 1;
    await log.save().catch(() => {});

    const client = customClient || webpush;
    configureWebPushDetails();

    const pushSubscriptionObj = {
        endpoint: subscription.endpoint,
        keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth
        }
    };

    const stringifiedPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);

    try {
        const response = await client.sendNotification(pushSubscriptionObj, stringifiedPayload, {
            TTL: 86400,
            urgency: alert.severity === 'critical' ? 'high' : 'normal'
        });

        const statusCode = response?.statusCode || 201;

        // Éxito: Marcar como aceptada por el proveedor Push
        log.status = 'accepted';
        log.statusCode = statusCode;
        log.dispatchedAt = new Date();
        log.attemptsHistory.push({
            attempt: log.attempt,
            statusCode,
            timestamp: new Date()
        });
        await log.save().catch(() => {});

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

        // Manejo de suscripción eliminada o caducada (404 / 410)
        if (statusCode === 404 || statusCode === 410) {
            log.status = 'expired';
            log.statusCode = statusCode;
            log.error = errMsg;
            log.attemptsHistory.push({
                attempt: log.attempt,
                statusCode,
                error: errMsg,
                timestamp: new Date()
            });
            await log.save().catch(() => {});

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

            return { success: false, statusCode, status: 'expired', error: errMsg };
        }

        // Fallo temporal con reintento y backoff exponencial
        const hasRemainingAttempts = log.attempt < log.maxAttempts;
        log.status = hasRemainingAttempts ? 'failed' : 'exhausted';
        log.statusCode = statusCode;
        log.error = errMsg;
        // Backoff exponencial: 2^attempt minutos (2m, 4m, 8m)
        log.nextRetryAt = hasRemainingAttempts 
            ? new Date(Date.now() + Math.pow(2, log.attempt) * 60 * 1000)
            : null;
        log.attemptsHistory.push({
            attempt: log.attempt,
            statusCode,
            error: errMsg,
            timestamp: new Date()
        });
        await log.save().catch(() => {});

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

        return { 
            success: false, 
            statusCode, 
            status: log.status, 
            attempt: log.attempt,
            nextRetryAt: log.nextRetryAt,
            error: errMsg 
        };
    }
}

/**
 * Despacha una alerta a todas las suscripciones Push activas del Propietario
 * Las alertas críticas NUNCA son bloqueadas por límites de menor prioridad.
 */
export async function dispatchAlertPushNotification(alert, { customClient = null } = {}) {
    const qualification = qualifiesForPushNotification(alert);
    if (!qualification || !qualification.qualifies) {
        return { dispatched: false, reason: 'ALERT_DOES_NOT_QUALIFY_FOR_PUSH' };
    }

    // Regla 4: El límite de frecuencia aplica exclusivamente a alertas no críticas.
    // Las alertas CRÍTICAS (dispositivos revocados, sesiones inválidas, emergencias)
    // NUNCA son frenadas por el límite de alertas de menor prioridad.
    if (qualification.priority !== 'critical') {
        if (!checkNonCriticalRateLimit()) {
            return { dispatched: false, reason: 'RATE_LIMIT_EXCEEDED_ALERT_STORM_PROTECTION' };
        }
    }

    // Buscar propietarios activos
    const owners = await AdminUser.find({ role: 'owner' }, { _id: 1, email: 1 }).lean();
    const ownerIds = owners.map(o => String(o._id));

    const targetQuery = {
        userId: { $in: ownerIds },
        status: 'active'
    };

    if (qualification.priority !== 'critical') {
        targetQuery['preferences.nonCriticalEnabled'] = { $ne: false };
    }

    const subscriptions = await PushSubscription.find(targetQuery);
    if (!subscriptions || subscriptions.length === 0) {
        return { dispatched: false, reason: 'NO_ACTIVE_OWNER_SUBSCRIPTIONS' };
    }

    const payload = buildSecurePushPayload(alert);

    // Encolar y despachar concurrentemente a cada terminal registrada
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
        priority: qualification.priority,
        targetsCount: subscriptions.length,
        results
    };
}

/**
 * Procesa y reintenta las entregas pendientes o fallidas almacenadas en MongoDB
 * Mecanismo seguro para ejecución en serverless (cron de Vercel o drenaje)
 */
export async function processPendingPushDeliveries({ limit = 20, customClient = null } = {}) {
    const now = new Date();
    const pendingLogs = await PushDeliveryLog.find({
        status: { $in: ['pending', 'failed'] },
        nextRetryAt: { $lte: now }
    }).limit(limit);

    if (!pendingLogs || pendingLogs.length === 0) {
        return { processed: 0, successful: 0, failed: 0 };
    }

    let successful = 0;
    let failed = 0;

    for (const log of pendingLogs) {
        const sub = await PushSubscription.findOne({ subscriptionId: log.subscriptionId, status: 'active' });
        if (!sub) {
            log.status = 'expired';
            log.error = 'Suscripción inactiva o eliminada';
            await log.save();
            continue;
        }

        const alertStub = {
            alertId: log.alertId,
            type: log.eventType,
            severity: log.severity
        };

        const res = await sendNotificationToSubscription({
            subscription: sub,
            payload: log.payload,
            alert: alertStub,
            customClient,
            deliveryLogDoc: log
        });

        if (res.success) {
            successful++;
        } else {
            failed++;
        }
    }

    return {
        processed: pendingLogs.length,
        successful,
        failed
    };
}

/**
 * Envía una notificación de prueba a las terminales activas del Propietario
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

export function _resetVapidCache() {
    cachedVapidKeys = null;
}
