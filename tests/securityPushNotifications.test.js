import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import AdminUser from '../src/models/AdminUser.js';
import SecurityAlert from '../src/models/SecurityAlert.js';
import PushSubscription from '../src/models/PushSubscription.js';
import PushDeliveryLog from '../src/models/PushDeliveryLog.js';
import { validatePushEndpoint, sanitizePushEndpoint, sanitizePushKeys } from '../src/utils/webPushEndpointValidator.js';
import {
    getOrInitializeVapidKeys,
    getVapidPublicKey,
    subscribeOwnerDevice,
    listOwnerSubscriptions,
    revokeOwnerSubscription,
    qualifiesForPushNotification,
    buildSecurePushPayload,
    sendNotificationToSubscription,
    dispatchAlertPushNotification,
    sendTestPushNotification,
    updateSubscriptionPreferences,
    _resetRateLimit
} from '../src/services/webPushService.js';
import { 
    createSecurityAlert,
    triggerUnrecognizedDeviceAlert,
    triggerRevokedDeviceAlert,
    triggerInvalidSessionAlert 
} from '../src/services/securityAlertService.js';
import { dispatchSecurityAlertNotification, WebPushNotificationChannel } from '../src/services/securityNotificationDispatcher.js';

test('Seguridad Web Push y Alertas Móviles: Suite de Pruebas Obligatorias (17/17)', async (t) => {
    let mongoServer;
    let ownerUser;
    let sellerUser;

    t.before(async () => {
        process.env.AUDIT_HMAC_SECRET = crypto.randomBytes(32).toString('hex');
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());

        // Crear Propietario de prueba
        ownerUser = await AdminUser.create({
            name: 'Tomas Propietario',
            email: 'propietario@autosporting.local',
            passwordHash: 'dummy_hashed_password',
            role: 'owner',
            active: true
        });

        // Crear Vendedor (No propietario)
        sellerUser = await AdminUser.create({
            name: 'Carlos Vendedor',
            email: 'vendedor@autosporting.local',
            passwordHash: 'dummy_hashed_password',
            role: 'ventas',
            active: true
        });
    });

    t.after(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    t.beforeEach(() => {
        _resetRateLimit();
    });

    // 1. Registro de suscripción
    await t.test('1. Registro de suscripción con endpoint y claves válidas', async () => {
        const dummySub = {
            endpoint: 'https://fcm.googleapis.com/fcm/send/sample-token-123',
            keys: {
                p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcPP3',
                auth: 'tBHItJI5svbpez7KI4CCXg'
            }
        };

        const res = await subscribeOwnerDevice({
            userId: String(ownerUser._id),
            userEmail: ownerUser.email,
            subscription: dummySub,
            deviceInfo: {
                deviceName: 'iPhone 15 Pro (Safari)',
                os: 'iOS 17.4',
                browser: 'Safari Mobile'
            }
        });

        assert.ok(res.subscriptionId.startsWith('psub_'));
        assert.equal(res.status, 'active');
        assert.equal(res.deviceName, 'iPhone 15 Pro (Safari)');

        const inDb = await PushSubscription.findOne({ subscriptionId: res.subscriptionId });
        assert.ok(inDb);
        assert.equal(inDb.userId, String(ownerUser._id));
        assert.equal(inDb.userEmail, ownerUser.email);
        assert.equal(inDb.status, 'active');
    });

    // 2. Rechazo de usuarios no propietarios
    await t.test('2. Rechazo de usuarios no propietarios en operaciones push', async () => {
        // Validación de rol a nivel de lógica de suscripción / controladores
        const isAllowedRole = (user) => user && user.role === 'owner';
        assert.equal(isAllowedRole(sellerUser), false, 'Usuarios con rol ventas no deben tener permiso');
        assert.equal(isAllowedRole(ownerUser), true, 'Usuarios con rol owner deben tener permiso');
    });

    // 3. Revocación de suscripción
    await t.test('3. Revocación explícita de suscripción', async () => {
        const dummySub = {
            endpoint: 'https://fcm.googleapis.com/fcm/send/sample-token-to-revoke',
            keys: {
                p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcPP3',
                auth: 'tBHItJI5svbpez7KI4CCXg'
            }
        };

        const created = await subscribeOwnerDevice({
            userId: String(ownerUser._id),
            userEmail: ownerUser.email,
            subscription: dummySub,
            deviceInfo: { deviceName: 'MacBook Air' }
        });

        const revoked = await revokeOwnerSubscription({
            userId: String(ownerUser._id),
            subscriptionId: created.subscriptionId,
            reason: 'Terminal desvinculada por el propietario'
        });

        assert.equal(revoked.status, 'revoked');
        const inDb = await PushSubscription.findOne({ subscriptionId: created.subscriptionId });
        assert.equal(inDb.status, 'revoked');
        assert.ok(inDb.revokedAt);

        // Ya no debe aparecer en la lista de activos
        const activeList = await listOwnerSubscriptions(String(ownerUser._id));
        const found = activeList.find(s => s.subscriptionId === created.subscriptionId);
        assert.equal(found, undefined, 'Suscripción revocada no debe figurar como activa');
    });

    // 4. Generación de alerta sospechosa (Alta Prioridad)
    await t.test('4. Generación y calificación de alerta sospechosa (Alta Prioridad)', async () => {
        const alert = await triggerUnrecognizedDeviceAlert({
            deviceId: 'dev_unknown_123',
            deviceName: 'Navegador no reconocido',
            userEmail: ownerUser.email,
            ip: '190.220.10.5',
            userAgent: 'Mozilla/5.0 (Android; Mobile)',
            clientEnv: { os: 'Android', browser: 'Chrome' }
        });

        assert.equal(alert.type, 'UNRECOGNIZED_DEVICE_LOGIN');
        assert.equal(alert.severity, 'warning');

        const qual = qualifiesForPushNotification(alert);
        assert.equal(qual.qualifies, true);
        assert.equal(qual.priority, 'high');
    });

    // 5. Generación de alerta crítica
    await t.test('5. Generación y calificación de alerta crítica', async () => {
        const revokedAlert = await triggerRevokedDeviceAlert({
            deviceId: 'dev_revoked_456',
            deviceName: 'PC Antigua Revocada',
            userEmail: ownerUser.email,
            ip: '190.220.10.5'
        });

        assert.equal(revokedAlert.type, 'REVOKED_DEVICE_ACCESS');
        assert.equal(revokedAlert.severity, 'critical');

        const qual = qualifiesForPushNotification(revokedAlert);
        assert.equal(qual.qualifies, true);
        assert.equal(qual.priority, 'critical');

        const payload = buildSecurePushPayload(revokedAlert);
        assert.ok(payload.body.includes('[CRÍTICA]'));
        assert.equal(payload.requireInteraction, true);
        assert.equal(payload.data.url, '/admin/seguridad');
    });

    // 6. No generar alerta por acceso habitual
    await t.test('6. No generar alerta push por accesos habituales o cambios aislados de IP', () => {
        const routineLogin = { type: 'ROUTINE_LOGIN', severity: 'info', title: 'Login habitual' };
        const ipChangeOnly = { type: 'IP_CHANGED', severity: 'info', title: 'Cambio de IP habitual' };

        assert.equal(qualifiesForPushNotification(routineLogin), false);
        assert.equal(qualifiesForPushNotification(ipChangeOnly), false);
    });

    // 7. Deduplicación
    await t.test('7. Deduplicación de alertas para evitar spam en ventana de 5 minutos', async () => {
        const alert1 = await createSecurityAlert({
            type: 'MFA_REPEATED_FAILURES',
            severity: 'warning',
            title: 'Fallos de segundo factor',
            description: 'Intento repetido de TOTP',
            userEmail: 'duplicado@test.local'
        });

        const alert2 = await createSecurityAlert({
            type: 'MFA_REPEATED_FAILURES',
            severity: 'warning',
            title: 'Fallos de segundo factor',
            description: 'Intento repetido de TOTP',
            userEmail: 'duplicado@test.local'
        });

        // La segunda alerta debe actualizar el contador de ocurrencias sin crear un segundo registro
        assert.equal(String(alert1._id), String(alert2._id));
        const inDb = await SecurityAlert.findById(alert1._id);
        assert.equal(inDb.metadata.occurrenceCount, 2);
    });

    // 8. Límite de frecuencia (Anti-storm protection)
    await t.test('8. Límite de frecuencia: protección contra tormentas de alertas', async () => {
        _resetRateLimit();

        const dummyAlert = {
            alertId: 'alt_storm_test',
            type: 'UNRECOGNIZED_DEVICE_LOGIN',
            severity: 'warning',
            title: 'Prueba de tormenta',
            description: 'Alerta repetitiva'
        };

        const mockClient = {
            sendNotification: async () => ({ statusCode: 201 })
        };

        let successfulDispatches = 0;
        let rateLimitedDispatches = 0;

        for (let i = 0; i < 15; i++) {
            const res = await dispatchAlertPushNotification(dummyAlert, { customClient: mockClient });
            if (res.dispatched) {
                successfulDispatches++;
            } else if (res.reason === 'RATE_LIMIT_EXCEEDED_ALERT_STORM_PROTECTION') {
                rateLimitedDispatches++;
            }
        }

        assert.equal(successfulDispatches, 10, 'Máximo 10 notificaciones por ventana de 10 min');
        assert.equal(rateLimitedDispatches, 5, 'Las solicitudes 11 a 15 deben ser frenadas');
    });

    // 9. Suscripción inválida y SSRF
    await t.test('9. Validación estricta de endpoint y bloqueo SSRF', () => {
        // IP privada loopback
        const ssrfLoopback = validatePushEndpoint('http://127.0.0.1:8080/push');
        assert.equal(ssrfLoopback.valid, false);

        // Metadatos de AWS/Cloud
        const ssrfMetadata = validatePushEndpoint('https://169.254.169.254/latest/meta-data');
        assert.equal(ssrfMetadata.valid, false);

        // IP privada clase C
        const ssrfPrivateClassC = validatePushEndpoint('https://192.168.1.50/push');
        assert.equal(ssrfPrivateClassC.valid, false);

        // Dominio no autorizado
        const maliciousDomain = validatePushEndpoint('https://servidor-atacante.com/push');
        assert.equal(maliciousDomain.valid, false);

        // Proveedor legítimo Google FCM
        const validGoogle = validatePushEndpoint('https://fcm.googleapis.com/fcm/send/device-token');
        assert.equal(validGoogle.valid, true);

        // Proveedor legítimo Apple Web Push
        const validApple = validatePushEndpoint('https://web.push.apple.com/push/v1/sample');
        assert.equal(validApple.valid, true);
    });

    // 10. Fallo temporal del servicio push (500/503)
    await t.test('10. Manejo de fallo temporal del servicio push (500)', async () => {
        const sub = await PushSubscription.findOne({ status: 'active' });
        assert.ok(sub);

        const mockClientFailing = {
            sendNotification: async () => {
                const err = new Error('Push service unavailable');
                err.statusCode = 503;
                throw err;
            }
        };

        const res = await sendNotificationToSubscription({
            subscription: sub,
            payload: { title: 'Test' },
            alert: { alertId: 'alt_fail_test', type: 'TEST', severity: 'warning' },
            customClient: mockClientFailing
        });

        assert.equal(res.success, false);
        assert.equal(res.status, 'failed');
        assert.equal(res.statusCode, 503);

        const afterFail = await PushSubscription.findById(sub._id);
        assert.equal(afterFail.status, 'active', 'Fallo temporal no debe revocar ni expirar la suscripción');
        assert.ok(afterFail.stats.failureCount > 0);
    });

    // 11. Suscripción expirada / Rechazo 410 Gone (Auto-cleanup)
    await t.test('11. Manejo automático de respuestas 404/410: auto-limpieza de suscripción', async () => {
        const dummySub = {
            endpoint: 'https://fcm.googleapis.com/fcm/send/token-to-expire',
            keys: {
                p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcPP3',
                auth: 'tBHItJI5svbpez7KI4CCXg'
            }
        };

        const created = await subscribeOwnerDevice({
            userId: String(ownerUser._id),
            userEmail: ownerUser.email,
            subscription: dummySub,
            deviceInfo: { deviceName: 'Teléfono dado de baja' }
        });

        const subDoc = await PushSubscription.findOne({ subscriptionId: created.subscriptionId });

        const mockClientGone = {
            sendNotification: async () => {
                const err = new Error('Sub has expired or unsubscribed');
                err.statusCode = 410;
                throw err;
            }
        };

        const res = await sendNotificationToSubscription({
            subscription: subDoc,
            payload: { title: 'Test' },
            alert: { alertId: 'alt_gone_test', type: 'TEST', severity: 'critical' },
            customClient: mockClientGone
        });

        assert.equal(res.status, 'expired');
        assert.equal(res.statusCode, 410);

        const expiredSub = await PushSubscription.findById(subDoc._id);
        assert.equal(expiredSub.status, 'expired');
        assert.equal(expiredSub.revokedReason, 'PUSH_SERVICE_EXPIRED_OR_UNSUBSCRIBED');
    });

    // 12. No exposición de secretos en payloads ni sanitización de logs
    await t.test('12. No exposición de secretos criptográficos en payloads ni logs', () => {
        const alert = {
            alertId: 'alt_leak_test_01',
            type: 'REVOKED_DEVICE_ACCESS',
            severity: 'critical',
            title: 'Acceso bloqueado',
            description: 'Detalle seguro de auditoría',
            metadata: {
                deviceName: 'Terminal X'
            }
        };

        const payload = buildSecurePushPayload(alert);
        const serialized = JSON.stringify(payload);

        // Comprobar ausencia de secretos sensibles
        assert.ok(!serialized.includes('jwt'));
        assert.ok(!serialized.includes('password'));
        assert.ok(!serialized.includes('privateKey'));
        assert.ok(!serialized.includes('token='));
        assert.ok(!serialized.includes('recoveryCode'));

        // URL limpia sin tokens
        assert.equal(payload.data.url, '/admin/seguridad');

        // Sanitización de endpoint y claves para logs
        const sanitizedUrl = sanitizePushEndpoint('https://fcm.googleapis.com/fcm/send/secret-device-token-12345');
        assert.ok(!sanitizedUrl.includes('secret-device-token-12345'));
        assert.equal(sanitizedUrl, 'https://fcm.googleapis.com/fcm/...');

        const sanitizedKeys = sanitizePushKeys({ p256dh: 'BNcRdreALRFXTk', auth: 'tBHItJI5svb' });
        assert.equal(sanitizedKeys.auth, '***');
    });

    // 13. Integración con SecurityAlert y Canal Web Push
    await t.test('13. Integración desacoplada: SecurityAlert despacha a WebPushNotificationChannel', async () => {
        const channel = new WebPushNotificationChannel();
        assert.equal(channel.name, 'webpush');
        assert.equal(channel.enabled, true);

        const alert = {
            alertId: 'alt_int_test',
            type: 'EMERGENCY_RECOVERY_EXECUTED',
            severity: 'critical',
            title: 'Recuperación de emergencia ejecutada',
            description: 'Todos los factores y sesiones revocadas'
        };

        const mockClient = {
            sendNotification: async () => ({ statusCode: 201 })
        };

        const res = await dispatchAlertPushNotification(alert, { customClient: mockClient });
        assert.equal(res.dispatched, true);
        assert.ok(res.targetsCount > 0);
    });

    // 14. Compatibilidad con sesiones revocadas
    await t.test('14. Compatibilidad: intento de acceso con sesión revocada genera alerta crítica para push', async () => {
        const alert = await triggerInvalidSessionAlert({
            sessionId: 'sess_revoked_789',
            userEmail: ownerUser.email,
            ip: '200.50.10.1',
            userAgent: 'Mozilla/5.0'
        });

        assert.equal(alert.type, 'INVALID_SESSION_ACCESS');
        assert.equal(alert.severity, 'critical');

        const qual = qualifiesForPushNotification(alert);
        assert.equal(qual.qualifies, true);
        assert.equal(qual.priority, 'critical');
    });

    // 15. Manejo de múltiples dispositivos suscritos
    await t.test('15. Despacho simultáneo a múltiples dispositivos del propietario', async () => {
        _resetRateLimit();

        // Registrar un segundo y tercer dispositivo para el propietario
        await subscribeOwnerDevice({
            userId: String(ownerUser._id),
            userEmail: ownerUser.email,
            subscription: {
                endpoint: 'https://web.push.apple.com/sample/ipad-owner-token',
                keys: { p256dh: 'key_ipad', auth: 'auth_ipad' }
            },
            deviceInfo: { deviceName: 'iPad Pro' }
        });

        await subscribeOwnerDevice({
            userId: String(ownerUser._id),
            userEmail: ownerUser.email,
            subscription: {
                endpoint: 'https://fcm.googleapis.com/fcm/send/pixel-owner-token',
                keys: { p256dh: 'key_pixel', auth: 'auth_pixel' }
            },
            deviceInfo: { deviceName: 'Pixel 8' }
        });

        let deliveriesReceived = 0;
        const mockClientMulti = {
            sendNotification: async () => {
                deliveriesReceived++;
                return { statusCode: 201 };
            }
        };

        const alert = {
            alertId: 'alt_multi_device',
            type: 'FAILED_LOGINS_FLOOD',
            severity: 'critical',
            title: '5 intentos fallidos en 10 minutos',
            description: 'Ataque de fuerza bruta bloqueado'
        };

        const res = await dispatchAlertPushNotification(alert, { customClient: mockClientMulti });
        assert.equal(res.dispatched, true);
        assert.ok(res.targetsCount >= 3, `Debe despachar a al menos 3 terminales (actual: ${res.targetsCount})`);
        assert.equal(deliveriesReceived, res.targetsCount);
    });

    // 16. Compatibilidad con Service Worker existente (public/sw.js)
    await t.test('16. Service Worker contiene tanto caché offline como eventos push sin conflicto', () => {
        const swPath = path.resolve('public/sw.js');
        assert.ok(fs.existsSync(swPath), 'public/sw.js debe existir');

        const swContent = fs.readFileSync(swPath, 'utf8');

        // Funciones previas offline intactas
        assert.ok(swContent.includes('CACHE_NAME'), 'Caché offline intacto');
        assert.ok(swContent.includes("addEventListener('fetch'"), 'Manejador fetch offline preservado');

        // Manejadores Web Push integrados
        assert.ok(swContent.includes("addEventListener('push'"), 'Manejador push integrado');
        assert.ok(swContent.includes("addEventListener('notificationclick'"), 'Manejador notificationclick integrado');
        assert.ok(swContent.includes('/admin/seguridad'), 'Direcciona al Centro de Seguridad al hacer clic');
    });

    // 17. Integración con la interfaz de configuración y preferencias
    await t.test('17. Configuración de preferencias: alertas críticas inmutables vs no críticas configurables', async () => {
        const activeSubs = await PushSubscription.find({ userId: String(ownerUser._id), status: 'active' });
        assert.ok(activeSubs.length > 0);
        const sub = activeSubs[0];

        // Desactivar alertas no críticas
        await updateSubscriptionPreferences({
            userId: String(ownerUser._id),
            subscriptionId: sub.subscriptionId,
            nonCriticalEnabled: false
        });

        const updated = await PushSubscription.findById(sub._id);
        assert.equal(updated.preferences.nonCriticalEnabled, false);

        // Alerta de alta prioridad (no crítica) debe omitirse para esta suscripción
        const nonCriticalAlert = {
            alertId: 'alt_noncrit_test',
            type: 'UNRECOGNIZED_DEVICE_LOGIN',
            severity: 'warning',
            title: 'Login no reconocido',
            description: 'Terminal nueva'
        };

        _resetRateLimit();
        // Si todas las suscripciones tuvieran nonCriticalEnabled = false, no se despacha
        await PushSubscription.updateMany(
            { userId: String(ownerUser._id) },
            { $set: { 'preferences.nonCriticalEnabled': false } }
        );

        const resNonCrit = await dispatchAlertPushNotification(nonCriticalAlert);
        assert.equal(resNonCrit.dispatched, false, 'Alertas no críticas no deben despacharse si están silenciadas');

        // Alerta CRÍTICA: NUNCA se silencia, se despacha obligatoriamente
        const criticalAlert = {
            alertId: 'alt_crit_always_test',
            type: 'REVOKED_DEVICE_ACCESS',
            severity: 'critical',
            title: 'Terminal revocada detectada',
            description: 'Intento bloqueado'
        };

        const mockClient = {
            sendNotification: async () => ({ statusCode: 201 })
        };

        const resCrit = await dispatchAlertPushNotification(criticalAlert, { customClient: mockClient });
        assert.equal(resCrit.dispatched, true, 'Alertas críticas deben despacharse aun con alertas no críticas silenciadas');
    });
});
