import crypto from 'crypto';
import mongoose from 'mongoose';
import SecurityAlert from '../models/SecurityAlert.js';
import AuditLog from '../models/AuditLog.js';
import TrustedDevice from '../models/TrustedDevice.js';
import UserSession from '../models/UserSession.js';
import { dispatchSecurityAlertNotification } from './securityNotificationDispatcher.js';

/**
 * Crea una nueva alerta de seguridad automática en el sistema
 */
export async function createSecurityAlert({
    type,
    severity = 'info',
    title,
    description,
    ip = null,
    userAgent = null,
    userEmail = null,
    deviceId = null,
    sessionId = null,
    metadata = {}
}) {
    // Deduplicación / Throttling: Si existe una alerta pendiente idéntica creada en los últimos 5 minutos, evitar spam
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingRecent = await SecurityAlert.findOne({
        type,
        status: 'pending',
        userEmail: userEmail || null,
        ip: ip || null,
        createdAt: { $gte: fiveMinutesAgo }
    }).lean();

    if (existingRecent) {
        // Incrementar contador en metadata para no perder visibilidad
        await SecurityAlert.updateOne(
            { _id: existingRecent._id },
            { 
                $inc: { 'metadata.occurrenceCount': 1 },
                $set: { updatedAt: new Date() }
            }
        );
        return existingRecent;
    }

    const alertId = `alert_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const alert = new SecurityAlert({
        alertId,
        type,
        severity,
        title,
        description,
        ip,
        userAgent,
        userEmail,
        deviceId,
        sessionId,
        metadata: {
            ...metadata,
            occurrenceCount: 1
        }
    });

    await alert.save();

    // Despachar a los canales desacoplados
    await dispatchSecurityAlertNotification(alert).catch(() => {});

    return alert;
}

/**
 * Evalúa si se superó el umbral de 5 intentos fallidos en 10 minutos
 */
export async function evaluateLoginFailureAlerts({ ip, userEmail, userAgent, deviceId, req = null }) {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const filter = {
        action: 'LOGIN_FALLIDO',
        createdAt: { $gte: tenMinutesAgo }
    };

    if (userEmail) {
        filter.$or = [{ userEmail }, { entityLabel: userEmail }];
    } else if (ip) {
        filter.ip = ip;
    }

    const recentFailures = await AuditLog.countDocuments(filter);

    if (recentFailures >= 5) {
        return await createSecurityAlert({
            type: 'FAILED_LOGINS_FLOOD',
            severity: 'critical',
            title: 'Múltiples intentos de acceso fallidos detectados',
            description: `Se registraron ${recentFailures} intentos de ingreso rechazados en menos de 10 minutos para ${userEmail || ip}.`,
            ip,
            userAgent,
            userEmail,
            deviceId,
            metadata: {
                failuresInWindow: recentFailures,
                windowMinutes: 10
            }
        });
    }

    return null;
}

/**
 * Alerta por fallos repetidos del segundo factor (TOTP / Passkey)
 */
export async function triggerMfaFailureAlert({ userEmail, ip, userAgent, deviceId, count = 3, reason = 'Código inválido' }) {
    return await createSecurityAlert({
        type: 'MFA_REPEATED_FAILURES',
        severity: 'warning',
        title: 'Fallos reiterados en el segundo factor de autenticación',
        description: `Se detectaron intentos fallidos consecutivos de segundo factor para la cuenta ${userEmail || 'desconocida'} (${reason}).`,
        ip,
        userAgent,
        userEmail,
        deviceId,
        metadata: { count, reason }
    });
}

/**
 * Alerta por inicio de sesión completado desde un dispositivo no reconocido (Alta Prioridad)
 */
export async function triggerUnrecognizedDeviceAlert({ deviceId, deviceName, userEmail, ip, userAgent, clientEnv }) {
    const osStr = clientEnv?.os || 'Sistema desconocido';
    const browserStr = clientEnv?.browser || 'Navegador';
    return await createSecurityAlert({
        type: 'UNRECOGNIZED_DEVICE_LOGIN',
        severity: 'warning',
        title: 'Inicio de sesión desde dispositivo no reconocido',
        description: `Se completó un acceso a la cuenta ${userEmail} desde una terminal no registrada previamente (${osStr} · ${browserStr}).`,
        ip,
        userAgent,
        userEmail,
        deviceId,
        metadata: { deviceId, deviceName, clientEnv }
    });
}

/**
 * Alerta por intento de acceso desde dispositivo revocado
 */
export async function triggerRevokedDeviceAlert({ deviceId, deviceName, userEmail, ip, userAgent }) {
    return await createSecurityAlert({
        type: 'REVOKED_DEVICE_ACCESS',
        severity: 'critical',
        title: 'Intento de conexión desde dispositivo revocado',
        description: `La terminal identificada '${deviceName || deviceId}' (marcada previamente como revocada) intentó establecer sesión.`,
        ip,
        userAgent,
        userEmail,
        deviceId,
        metadata: { deviceId, deviceName }
    });
}

/**
 * Alerta por intento de uso de sesión invalidada (Prioridad Crítica)
 */
export async function triggerInvalidSessionAlert({ sessionId, userEmail, ip, userAgent, deviceId }) {
    return await createSecurityAlert({
        type: 'INVALID_SESSION_ACCESS',
        severity: 'critical',
        title: 'Intento de acceso con sesión invalidada o revocada',
        description: `Se intentó realizar una operación utilizando el identificador de sesión revocado '${sessionId}'.`,
        ip,
        userAgent,
        userEmail,
        deviceId,
        sessionId,
        metadata: { sessionId }
    });
}

/**
 * Alerta por registro o revocación de Passkey
 */
export async function triggerPasskeyAlert({ event, userEmail, passkeyName, credentialId, ip, userAgent }) {
    const isReg = event === 'REGISTERED';
    return await createSecurityAlert({
        type: isReg ? 'PASSKEY_REGISTERED' : 'PASSKEY_REVOKED',
        severity: isReg ? 'info' : 'warning',
        title: isReg ? 'Nueva Passkey registrada' : 'Passkey revocada por el usuario',
        description: isReg 
            ? `Se enroló exitosamente la passkey '${passkeyName}' para la cuenta ${userEmail}.`
            : `Se revocó la credencial passkey '${passkeyName}' (${credentialId}) de la cuenta ${userEmail}.`,
        ip,
        userAgent,
        userEmail,
        metadata: { event, passkeyName, credentialId }
    });
}

/**
 * Alerta por autorización de nuevo dispositivo confiable
 */
export async function triggerDeviceRegisteredAlert({ deviceId, deviceName, userEmail, ip, userAgent, authMethod }) {
    return await createSecurityAlert({
        type: 'TRUSTED_DEVICE_REGISTERED',
        severity: 'info',
        title: 'Nueva terminal autorizada como confiable',
        description: `Se autorizó el equipo '${deviceName}' (${deviceId}) mediante ${authMethod || 'MFA'}.`,
        ip,
        userAgent,
        userEmail,
        deviceId,
        metadata: { deviceId, deviceName, authMethod }
    });
}

/**
 * Alerta por cambios sensibles en la configuración de autenticación
 */
export async function triggerAuthConfigChangeAlert({ userEmail, action, description, ip, userAgent }) {
    return await createSecurityAlert({
        type: 'AUTH_CONFIG_CHANGED',
        severity: 'warning',
        title: 'Modificación de configuración sensible de seguridad',
        description: description || `Se modificó la configuración de autenticación (${action}) para ${userEmail}.`,
        ip,
        userAgent,
        userEmail,
        metadata: { action }
    });
}

/**
 * Alerta por ejecución de procedimiento de recuperación de emergencia
 */
export async function triggerEmergencyRecoveryAlert({ userEmail, reason, ip, userAgent }) {
    return await createSecurityAlert({
        type: 'EMERGENCY_RECOVERY_EXECUTED',
        severity: 'critical',
        title: 'Recuperación de desastre fuera de banda ejecutada',
        description: `Se ejecutó el procedimiento administrativo de emergencia para ${userEmail}. Todos los factores y sesiones fueron revocados. Causa: ${reason}.`,
        ip,
        userAgent,
        userEmail,
        metadata: { reason }
    });
}

/**
 * Alerta por anomalías en la integridad de la auditoría criptográfica
 */
export async function triggerAuditIntegrityAnomalyAlert({ anomalyType, description, ip = null }) {
    return await createSecurityAlert({
        type: 'AUDIT_INTEGRITY_ANOMALY',
        severity: 'critical',
        title: 'Anomalía de integridad criptográfica detectada',
        description: description || `Fallo en verificación de cadena de hashes HMAC: ${anomalyType}.`,
        ip,
        metadata: { anomalyType }
    });
}

/**
 * Marca una alerta como revisada por el Propietario
 */
export async function reviewSecurityAlert({ alertId, reviewedBy, notes = '' }) {
    const query = mongoose.Types.ObjectId.isValid(alertId)
        ? { $or: [{ alertId }, { _id: alertId }] }
        : { alertId };

    const alert = await SecurityAlert.findOne(query);

    if (!alert) {
        const err = new Error('Alerta no encontrada');
        err.status = 404;
        throw err;
    }

    alert.status = 'reviewed';
    alert.reviewedAt = new Date();
    alert.reviewedBy = reviewedBy;
    alert.reviewNotes = notes || null;
    await alert.save();

    return alert;
}

/**
 * Consulta de alertas paginada con filtros
 */
export async function getSecurityAlerts({ status = null, severity = null, page = 1, limit = 20 } = {}) {
    const query = {};
    if (status && status !== 'all') {
        query.status = status;
    }
    if (severity && severity !== 'all') {
        query.severity = severity;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10)));
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [alerts, total, pendingCount, criticalCount] = await Promise.all([
        SecurityAlert.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
        SecurityAlert.countDocuments(query),
        SecurityAlert.countDocuments({ status: 'pending' }),
        SecurityAlert.countDocuments({ status: 'pending', severity: 'critical' })
    ]);

    return {
        alerts,
        total,
        page: parseInt(page, 10),
        limit: lim,
        totalPages: Math.ceil(total / lim) || 1,
        counts: {
            pending: pendingCount,
            critical: criticalCount
        }
    };
}

/**
 * Parser liviano de User-Agent sin dependencias pesadas
 */
export function parseUserAgent(uaString = '') {
    if (!uaString || typeof uaString !== 'string') {
        return { browser: 'Navegador desconocido', os: 'SO desconocido', isMobile: false };
    }

    let browser = 'Navegador web';
    let os = 'Sistema operativo';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(uaString);

    // Sistema Operativo
    if (/Windows NT 10.0/i.test(uaString)) os = 'Windows 10/11';
    else if (/Windows NT 6.3/i.test(uaString)) os = 'Windows 8.1';
    else if (/Windows/i.test(uaString)) os = 'Windows';
    else if (/Mac OS X/i.test(uaString)) os = 'macOS';
    else if (/Android/i.test(uaString)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(uaString)) os = 'iOS';
    else if (/Linux/i.test(uaString)) os = 'Linux';

    // Navegador
    if (/Edg\//i.test(uaString)) browser = 'Microsoft Edge';
    else if (/Chrome\//i.test(uaString) && !/Chromium|Edg/i.test(uaString)) browser = 'Google Chrome';
    else if (/Firefox\//i.test(uaString)) browser = 'Mozilla Firefox';
    else if (/Safari\//i.test(uaString) && !/Chrome/i.test(uaString)) browser = 'Apple Safari';
    else if (/Opera|OPR\//i.test(uaString)) browser = 'Opera';

    return { browser, os, isMobile };
}

/**
 * Consulta de métricas del Panel Principal (KPIs en tiempo real)
 */
export async function getSecurityOverviewMetrics({ period = '24h' } = {}) {
    const now = new Date();
    const msInHour = 60 * 60 * 1000;
    const msInDay = 24 * msInHour;

    let periodStart;
    if (period === '7d') {
        periodStart = new Date(now.getTime() - 7 * msInDay);
    } else if (period === '30d') {
        periodStart = new Date(now.getTime() - 30 * msInDay);
    } else {
        // default 24h
        periodStart = new Date(now.getTime() - 24 * msInHour);
    }

    const since24h = new Date(now.getTime() - 24 * msInHour);

    const [
        successfulLogins24h,
        failedLogins24h,
        activeTrustedDevices,
        openSessions,
        pendingAlerts,
        lastSuccessfulLoginDoc,
        periodSuccessCount,
        periodFailCount,
        uniqueIpsPeriod
    ] = await Promise.all([
        // Inicios de sesión exitosos en 24h
        AuditLog.countDocuments({
            action: { $in: ['LOGIN_EXITOSO', 'LOGIN_EXITOSO_2FA', 'PASSKEY_AUTH_SUCCESS'] },
            createdAt: { $gte: since24h }
        }),
        // Intentos fallidos en 24h
        AuditLog.countDocuments({
            action: { $in: ['LOGIN_FALLIDO', 'PASSKEY_AUTH_FAILED', 'DEVICE_REVOKED', 'SESSION_REVOKED', '2FA_FAILED'] },
            createdAt: { $gte: since24h }
        }),
        // Dispositivos confiables activos
        TrustedDevice.countDocuments({ status: 'trusted' }),
        // Sesiones abiertas actualmente
        UserSession.countDocuments({ status: 'active', expiresAt: { $gt: now } }),
        // Alertas pendientes
        SecurityAlert.countDocuments({ status: 'pending' }),
        // Último acceso exitoso
        AuditLog.findOne({
            action: { $in: ['LOGIN_EXITOSO', 'LOGIN_EXITOSO_2FA', 'PASSKEY_AUTH_SUCCESS'] }
        }).sort({ createdAt: -1 }).lean(),
        // Total éxitos periodo
        AuditLog.countDocuments({
            action: { $in: ['LOGIN_EXITOSO', 'LOGIN_EXITOSO_2FA', 'PASSKEY_AUTH_SUCCESS'] },
            createdAt: { $gte: periodStart }
        }),
        // Total fallos periodo
        AuditLog.countDocuments({
            action: { $in: ['LOGIN_FALLIDO', 'PASSKEY_AUTH_FAILED', 'DEVICE_REVOKED', 'SESSION_REVOKED', '2FA_FAILED'] },
            createdAt: { $gte: periodStart }
        }),
        // IPs únicas en el periodo
        AuditLog.distinct('ip', { createdAt: { $gte: periodStart } })
    ]);

    let lastSuccessfulLogin = null;
    if (lastSuccessfulLoginDoc) {
        const parsedUa = parseUserAgent(lastSuccessfulLoginDoc.userAgent);
        lastSuccessfulLogin = {
            timestamp: lastSuccessfulLoginDoc.createdAt,
            userEmail: lastSuccessfulLoginDoc.userEmail,
            ip: lastSuccessfulLoginDoc.ip,
            deviceName: lastSuccessfulLoginDoc.deviceName || 'Desconocido',
            deviceId: lastSuccessfulLoginDoc.deviceId,
            browser: parsedUa.browser,
            os: parsedUa.os,
            action: lastSuccessfulLoginDoc.action
        };
    }

    return {
        period,
        kpis: {
            successfulLogins24h,
            failedLogins24h,
            activeTrustedDevices,
            openSessions,
            pendingAlerts,
            lastSuccessfulLogin
        },
        periodStats: {
            totalSuccessful: periodSuccessCount,
            totalFailed: periodFailCount,
            uniqueIpsCount: (uniqueIpsPeriod || []).filter(Boolean).length
        }
    };
}

/**
 * Consulta de historial de inicios de sesión paginado y enriquecido
 */
export async function getLoginHistory({
    page = 1,
    limit = 20,
    search = '',
    status = 'all', // 'all' | 'success' | 'failed'
    method = 'all', // 'all' | 'password' | 'passkey' | 'totp' | 'recovery_code'
    period = 'all'
} = {}) {
    const query = {
        action: {
            $in: [
                'LOGIN_EXITOSO',
                'LOGIN_EXITOSO_2FA',
                'LOGIN_FALLIDO',
                'PASSKEY_AUTH_SUCCESS',
                'PASSKEY_AUTH_FAILED',
                '2FA_FAILED',
                'SESSION_REVOKED',
                'DEVICE_REVOKED',
                'OWNER_MFA_EMERGENCY_RESET'
            ]
        }
    };

    if (status === 'success') {
        query.action = { $in: ['LOGIN_EXITOSO', 'LOGIN_EXITOSO_2FA', 'PASSKEY_AUTH_SUCCESS'] };
    } else if (status === 'failed') {
        query.action = {
            $in: ['LOGIN_FALLIDO', 'PASSKEY_AUTH_FAILED', '2FA_FAILED', 'SESSION_REVOKED', 'DEVICE_REVOKED']
        };
    }

    if (period === '24h') {
        query.createdAt = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    } else if (period === '7d') {
        query.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (period === '30d') {
        query.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }

    if (search && search.trim()) {
        const s = search.trim();
        query.$or = [
            { userEmail: { $regex: s, $options: 'i' } },
            { entityLabel: { $regex: s, $options: 'i' } },
            { ip: { $regex: s, $options: 'i' } },
            { deviceName: { $regex: s, $options: 'i' } },
            { deviceId: { $regex: s, $options: 'i' } },
            { description: { $regex: s, $options: 'i' } }
        ];
    }

    const p = Math.max(1, parseInt(page, 10));
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (p - 1) * lim;

    const [logs, total] = await Promise.all([
        AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
        AuditLog.countDocuments(query)
    ]);

    const items = logs.map(log => {
        const isSuccess = ['LOGIN_EXITOSO', 'LOGIN_EXITOSO_2FA', 'PASSKEY_AUTH_SUCCESS'].includes(log.action);
        const parsedUa = parseUserAgent(log.userAgent);

        let authMethod = 'password';
        if (log.action.includes('PASSKEY')) authMethod = 'passkey';
        else if (log.action === 'LOGIN_EXITOSO_2FA' || log.action === '2FA_FAILED' || log.metadata?.authMethod === 'totp') authMethod = 'totp';
        else if (log.metadata?.authMethod === 'recovery_code') authMethod = 'recovery_code';

        let failureReason = null;
        if (!isSuccess) {
            if (log.action === 'DEVICE_REVOKED') failureReason = 'DISPOSITIVO_REVOCADO';
            else if (log.action === 'SESSION_REVOKED') failureReason = 'SESION_REVOCADA';
            else if (log.action === 'PASSKEY_AUTH_FAILED') failureReason = 'FIRMA_PASSKEY_INVALIDA';
            else if (log.action === '2FA_FAILED') failureReason = 'CODIGO_TOTP_INCORRECTO';
            else if (log.description?.includes('inactivo')) failureReason = 'USUARIO_INACTIVO';
            else failureReason = 'CREDENCIALES_INCORRECTAS';
        }

        // Clasificación estricta de IP: Loopback, Intranet o Pública
        const isLoopback = log.ip === '127.0.0.1' || log.ip === '::1';
        const isPrivateNet = log.ip?.startsWith('192.168.') || log.ip?.startsWith('10.') || log.ip?.startsWith('172.16.');
        let ipType = 'public';
        let ipLabel = 'IP Pública';
        let locationText = 'Zona Concesionario (Aproximada por IP)';

        if (!log.ip) {
            ipType = 'unknown';
            ipLabel = 'No disponible';
            locationText = 'No disponible';
        } else if (isLoopback) {
            ipType = 'loopback';
            ipLabel = 'Conexión local (Loopback)';
            locationText = 'Entorno Local / Loopback';
        } else if (isPrivateNet) {
            ipType = 'intranet';
            ipLabel = 'Red Local / Intranet';
            locationText = 'Red Privada / Concesionaria';
        }

        // Clasificación de dispositivo: Confiable, Revocado o Sin Registrar
        let deviceType = 'unregistered';
        let deviceBadgeLabel = 'Navegador Web Sin Registrar';
        if (log.deviceStatus === 'trusted' || (log.deviceName && (log.deviceName.toLowerCase().includes('agencia') || log.deviceName.toLowerCase().includes('privada')))) {
            deviceType = 'trusted';
            deviceBadgeLabel = 'Dispositivo Confiable';
        } else if (log.deviceStatus === 'revoked' || log.action === 'DEVICE_REVOKED') {
            deviceType = 'revoked';
            deviceBadgeLabel = 'Dispositivo Revocado';
        }

        // Distinción de cuenta autenticada vs correo introducido
        const hasAuthenticAccount = isSuccess && log.userEmail && log.userEmail !== 'system';
        const resolvedAccountEmail = hasAuthenticAccount 
            ? log.userEmail 
            : (isSuccess ? (log.entityLabel || 'Propietario Autenticado') : null);
        
        const attemptedEmail = !isSuccess 
            ? (log.metadata?.attemptedEmail || log.entityLabel || (log.userEmail !== 'system' ? log.userEmail : null) || 'No informado')
            : null;

        return {
            id: String(log._id),
            timestamp: log.createdAt,
            userEmail: resolvedAccountEmail || (isSuccess ? 'Propietario Autenticado' : 'No verificado'),
            attemptedEmail,
            identityVerified: isSuccess,
            userName: log.userName && log.userName !== 'System' ? log.userName : null,
            result: isSuccess ? 'SUCCESS' : 'FAILED',
            action: log.action,
            ip: log.ip || null,
            ipType,
            ipLabel,
            geoApproximation: {
                location: locationText,
                disclaimer: 'Aproximada por IP - Puede variar por VPN o proveedor. No constituye dirección física exacta ni prueba de presencia o identidad física.'
            },
            browser: parsedUa.browser,
            os: parsedUa.os,
            deviceId: log.deviceId || null,
            deviceName: log.deviceName || null,
            deviceStatus: log.deviceStatus || 'unknown',
            deviceType,
            deviceBadgeLabel,
            authMethod,
            failureReason,
            sessionId: log.sessionId || null,
            currentHash: log.currentHash || null,
            metadata: log.metadata || null
        };
    });

    return {
        items,
        total,
        page: p,
        limit: lim,
        totalPages: Math.ceil(total / lim) || 1
    };
}
