import crypto from 'crypto';
import TrustedDevice from '../models/TrustedDevice.js';
import UserSession from '../models/UserSession.js';
import AuditLog from '../models/AuditLog.js';
import AdminUser from '../models/AdminUser.js';
import SecurityChallenge from '../models/SecurityChallenge.js';
import SecurityRateLimit from '../models/SecurityRateLimit.js';
import Car from '../models/Car.js';
import { logAudit } from '../utils/auditLogger.js';
import { getTrustedClientIp } from '../utils/securityIpResolver.js';
import speakeasy from 'speakeasy';

// Helper de cifrado/descifrado seguro AES-256-GCM para 2FA Secrets (100% compatible con server.js)
const getTwoFactorEncryptionKey = () => {
    const key = process.env.TWO_FACTOR_ENCRYPTION_KEY || process.env.JWT_SECRET || 'autosporting-default-secret';
    return crypto.createHash('sha256').update(String(key)).digest();
};

export function encrypt2FaSecret(text) {
    try {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', getTwoFactorEncryptionKey(), iv);
        let encrypted = cipher.update(text, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        const authTag = cipher.getAuthTag().toString('base64');
        return `${iv.toString('base64')}:${authTag}:${encrypted}`;
    } catch (err) {
        console.error('Encryption error:', err);
        throw err;
    }
}

export function decrypt2FaSecret(encryptedData) {
    if (!encryptedData) return null;
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) return null;
        const iv = Buffer.from(parts[0], 'base64');
        const authTag = Buffer.from(parts[1], 'base64');
        const encryptedText = Buffer.from(parts[2], 'base64');

        const decipher = crypto.createDecipheriv('aes-256-gcm', getTwoFactorEncryptionKey(), iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch {
        return null;
    }
}

/**
 * Parser no invasivo de Sistema Operativo y Navegador
 */
export function parseClientEnvironment(userAgent = '') {
    const ua = String(userAgent);
    let os = 'Desconocido';
    let browser = 'Desconocido';

    // Detección de OS
    if (/windows nt 10\.0/i.test(ua)) os = 'Windows 10/11';
    else if (/windows nt 6\.3/i.test(ua)) os = 'Windows 8.1';
    else if (/windows nt 6\.1/i.test(ua)) os = 'Windows 7';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    // Detección de Browser
    if (/edg\//i.test(ua)) browser = 'Microsoft Edge';
    else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = 'Google Chrome';
    else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = 'Apple Safari';
    else if (/firefox\//i.test(ua)) browser = 'Mozilla Firefox';
    else if (/opera|opr\//i.test(ua)) browser = 'Opera';

    return { os, browser, rawUserAgent: ua };
}

/**
 * Crea un desafío criptográfico de corta duración (TTL 90s) vinculado a una terminal
 */
export async function createSecurityChallenge({ deviceId, purpose = 'login' }) {
    if (!deviceId) throw new Error('deviceId requerido para emitir desafío');

    const challengeId = crypto.randomUUID();
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 90 * 1000);

    const challenge = new SecurityChallenge({
        challengeId,
        deviceId,
        nonce,
        purpose,
        expiresAt
    });

    await challenge.save();
    return {
        challengeId,
        nonce,
        expiresAt
    };
}

/**
 * Valida la firma ECDSA P-256 de una terminal contra un desafío
 * Formato IEEE P1363 compatible nativamente entre Web Crypto API y Node.js
 */
export async function verifyDeviceSignature({ challengeId, deviceId, signature, publicKeyJwk }) {
    if (!challengeId || !deviceId || !signature || !publicKeyJwk) {
        return { valid: false, reason: 'PARAMETROS_INCOMPLETOS' };
    }

    // 1. Consumir atómicamente el desafío (un solo uso, protección contra replay)
    const challenge = await SecurityChallenge.findOneAndUpdate(
        { challengeId, deviceId, used: false, expiresAt: { $gt: new Date() } },
        { $set: { used: true, usedAt: new Date() } }
    );

    if (!challenge) {
        return { valid: false, reason: 'CHALLENGE_INVALIDO_O_EXPIRADO' };
    }

    // 2. Verificar la firma asimétrica contra la clave pública JWK usando IEEE P1363 (Web Crypto)
    try {
        const jwkObj = typeof publicKeyJwk === 'string' ? JSON.parse(publicKeyJwk) : publicKeyJwk;
        const keyObject = crypto.createPublicKey({ key: jwkObj, format: 'jwk' });
        
        const verify = crypto.createVerify('SHA256');
        verify.update(challenge.nonce);
        
        const sigBuffer = Buffer.from(signature, 'hex');
        const isValid = verify.verify({ key: keyObject, dsaEncoding: 'ieee-p1363' }, sigBuffer);
        
        return { valid: isValid, reason: isValid ? null : 'FIRMA_NO_COINCIDE' };
    } catch (err) {
        console.error('Error verificando firma ECDSA:', err.message);
        return { valid: false, reason: 'ERROR_CRIPTO: ' + err.message };
    }
}

/**
 * Resuelve o registra un dispositivo en el flujo de login
 */
export async function resolveDeviceOnLogin({ deviceId, publicKey, signature, challengeId, user, req }) {
    const ip = getTrustedClientIp(req);
    const userAgent = req?.headers?.['user-agent'] || 'unknown';
    const clientEnv = parseClientEnvironment(userAgent);

    let device = null;
    let isUnknown = false;

    if (deviceId) {
        device = await TrustedDevice.findOne({ deviceId });
    }

    if (!device) {
        // Dispositivo no registrado previamente -> Estado unknown / pending_verification
        const assignedDeviceId = deviceId || crypto.randomUUID();

        // Si se provee clave y firma, validar que el cliente posea la clave privada antes de guardarla
        if (publicKey && signature && challengeId) {
            const sigCheck = await verifyDeviceSignature({
                challengeId,
                deviceId: assignedDeviceId,
                signature,
                publicKeyJwk: publicKey
            });
            if (!sigCheck.valid) {
                const err = new Error('Firma criptográfica inicial inválida para la clave pública proporcionada.');
                err.code = 'FIRMA_INICIAL_INVALIDA';
                err.status = 403;
                throw err;
            }
        }

        device = new TrustedDevice({
            deviceId: assignedDeviceId,
            deviceName: 'Dispositivo desconocido',
            status: 'unknown',
            publicKey: publicKey || null,
            registeredBy: {
                userId: String(user._id || user.id),
                name: user.name || user.username,
                email: user.email
            },
            firstRegisteredIp: ip,
            lastSeenIp: ip,
            lastSeenUser: user.name || user.username,
            clientInfo: clientEnv,
            trustHistory: [{
                event: 'REGISTRO_SOLICITADO',
                performedBy: {
                    userId: String(user._id || user.id),
                    name: user.name || user.username,
                    role: user.role
                },
                authMethod: 'system',
                ip,
                details: `Acceso inicial desde navegador no registrado (${clientEnv.os} · ${clientEnv.browser})`
            }]
        });
        await device.save();
        isUnknown = true;

        // Registrar alerta de seguridad inmediata
        await logAudit({
            req,
            action: 'DISPOSITIVO_DESCONOCIDO_ACCESO',
            module: 'seguridad',
            entityType: 'TrustedDevice',
            entityId: assignedDeviceId,
            entityLabel: 'Dispositivo desconocido',
            description: `Acceso registrado desde equipo no autorizado: ${clientEnv.os} · ${clientEnv.browser} (IP: ${ip}) por ${user.email}`,
            metadata: { deviceId: assignedDeviceId, ip, clientEnv }
        });
    } else {
        // Dispositivo registrado previamente -> Comprobar si está revocado
        if (device.status === 'revoked') {
            device.trustHistory.push({
                event: 'ACCESO_POST_REVOCACION',
                performedBy: {
                    userId: String(user._id || user.id),
                    name: user.name || user.username,
                    role: user.role
                },
                authMethod: 'system',
                ip,
                details: `Intento de inicio de sesión desde dispositivo revocado`
            });
            await device.save();

            await logAudit({
                req,
                action: 'DISPOSITIVO_REVOCADO_ACCESO',
                module: 'seguridad',
                entityType: 'TrustedDevice',
                entityId: device.deviceId,
                entityLabel: device.deviceName,
                description: `Intento de acceso bloqueado desde dispositivo revocado: ${device.deviceName} (ID: ${device.deviceId}) por ${user.email}`,
                metadata: { deviceId: device.deviceId, ip }
            });

            const error = new Error('Este dispositivo ha sido revocado por razones de seguridad. Comuníquese con el Propietario para reautorizarlo.');
            error.status = 403;
            error.code = 'DEVICE_REVOKED';
            throw error;
        }

        // FASE 2: Validar seguridad criptográfica en terminales autorizadas
        if (device.status === 'trusted') {
            // Impedir que un cliente sustituya arbitrariamente la clave pública de un dispositivo previamente autorizado
            if (publicKey && device.publicKey && publicKey !== device.publicKey) {
                await logAudit({
                    req,
                    action: 'INTENTO_SUSTITUCION_CLAVE',
                    module: 'seguridad',
                    entityType: 'TrustedDevice',
                    entityId: device.deviceId,
                    entityLabel: device.deviceName,
                    description: `Intento bloqueado de sustitución de clave pública en terminal confiable: ${device.deviceName}`,
                    metadata: { deviceId: device.deviceId, ip }
                });
                const err = new Error('Violación de Seguridad: No se permite sustituir la clave pública de un dispositivo confiable.');
                err.code = 'INTENTO_SUSTITUCION_CLAVE';
                err.status = 403;
                throw err;
            }

            // Si la terminal tiene clave pública registrada y el cliente envía firma, verificarla
            if (device.publicKey && signature && challengeId) {
                const sigCheck = await verifyDeviceSignature({
                    challengeId,
                    deviceId: device.deviceId,
                    signature,
                    publicKeyJwk: device.publicKey
                });

                if (!sigCheck.valid) {
                    await logAudit({
                        req,
                        action: 'FIRMA_INVALIDA_CLONACION',
                        module: 'seguridad',
                        entityType: 'TrustedDevice',
                        entityId: device.deviceId,
                        entityLabel: device.deviceName,
                        description: `Firma criptográfica inválida en terminal ${device.deviceName} (${sigCheck.reason})`,
                        metadata: { deviceId: device.deviceId, reason: sigCheck.reason, ip }
                    });
                    const err = new Error('Firma criptográfica de terminal inválida. No se pudo verificar la posesión de la clave privada.');
                    err.code = 'FIRMA_INVALIDA_CLONACION';
                    err.status = 403;
                    throw err;
                }
            }
        }

        // Registrar cambio de IP si aplica
        if (device.lastSeenIp && device.lastSeenIp !== ip) {
            device.trustHistory.push({
                event: 'IP_CAMBIADA',
                performedBy: {
                    userId: String(user._id || user.id),
                    name: user.name || user.username,
                    role: user.role
                },
                previousValue: device.lastSeenIp,
                newValue: ip,
                ip,
                details: `Cambio de IP detectado: ${device.lastSeenIp} -> ${ip}`
            });
        }

        device.lastSeenAt = new Date();
        device.lastSeenIp = ip;
        device.lastSeenUser = user.name || user.username;
        if (publicKey && !device.publicKey && device.status !== 'trusted') {
            device.publicKey = publicKey;
        }
        await device.save();
    }

    return { device, isUnknown };
}

/**
 * Crea una sesión revocable vinculada al usuario y al dispositivo
 */
export async function createUserSession({ user, device, req }) {
    const ip = getTrustedClientIp(req);
    const userAgent = req?.headers?.['user-agent'] || 'unknown';
    const sessionId = crypto.randomUUID();

    const session = new UserSession({
        sessionId,
        userId: user._id || user.id,
        userName: user.name || user.username,
        userEmail: user.email,
        userRole: user.role,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        deviceStatus: device.status,
        status: 'active',
        ip,
        userAgent,
        loginAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    await session.save();
    return session;
}

/**
 * Validador unificado de sesión y dispositivo para Express y Next.js
 * Erradica la confianza en tokens legacy sin sessionId y verifica revocaciones en MongoDB.
 */
export async function validateSessionAndDevice({ sessionId, user, deviceId }) {
    if (!sessionId) {
        return {
            valid: false,
            status: 401,
            code: 'LEGACY_TOKEN_REJECTED',
            message: 'Su sesión requiere reautenticación por actualización de seguridad. Por favor inicie sesión nuevamente.'
        };
    }

    const session = await UserSession.findOne({ sessionId })
        .select('status deviceId deviceName deviceStatus userId')
        .lean();

    if (!session || session.status !== 'active') {
        return {
            valid: false,
            status: 401,
            code: 'SESSION_REVOKED',
            message: 'Esta sesión ha sido revocada o ha finalizado. Por favor inicie sesión nuevamente.'
        };
    }

    if (session.deviceStatus === 'revoked') {
        return {
            valid: false,
            status: 401,
            code: 'DEVICE_REVOKED',
            message: 'Este dispositivo ha sido revocado por el administrador.'
        };
    }

    // Comprobación de seguridad adicional: verificar si el dispositivo figura revocado en TrustedDevice
    const targetDeviceId = session.deviceId || deviceId;
    if (targetDeviceId) {
        const devDoc = await TrustedDevice.findOne({ deviceId: targetDeviceId }).select('status').lean();
        if (devDoc && devDoc.status === 'revoked') {
            return {
                valid: false,
                status: 401,
                code: 'DEVICE_REVOKED',
                message: 'Este dispositivo ha sido revocado por el administrador.'
            };
        }
    }

    return {
        valid: true,
        session
    };
}

/**
 * Autoriza un dispositivo como confiable ('PC Agencia' o 'PC Privada') con verificación MFA obligatoria
 */
/**
 * Rate Limiter distribuido en MongoDB para proteger endpoints críticos en entornos multi-instancia/serverless
 */
export async function enforceSecurityRateLimit({ key, maxAttempts = 5, windowSeconds = 900 }) {
    const now = new Date();
    const resetAt = new Date(now.getTime() + windowSeconds * 1000);

    // Intentar incrementar atómicamente si el registro activo existe y no ha superado el límite
    const updated = await SecurityRateLimit.findOneAndUpdate(
        { key, expiresAt: { $gt: now }, points: { $lt: maxAttempts } },
        { $inc: { points: 1 }, $set: { updatedAt: now } },
        { new: true }
    );

    if (updated) {
        return {
            allowed: true,
            remaining: Math.max(0, maxAttempts - updated.points),
            resetAt: updated.expiresAt
        };
    }

    // Si no se actualizó, verificar si ya superó el límite dentro de la ventana activa
    const existing = await SecurityRateLimit.findOne({ key, expiresAt: { $gt: now } });
    if (existing && existing.points >= maxAttempts) {
        const retryAfterSeconds = Math.max(1, Math.ceil((existing.expiresAt.getTime() - Date.now()) / 1000));
        return {
            allowed: false,
            remaining: 0,
            resetAt: existing.expiresAt,
            retryAfterSeconds
        };
    }

    // No existe o expiró: reiniciar o crear nuevo registro con upsert
    try {
        const fresh = await SecurityRateLimit.findOneAndUpdate(
            { key },
            { $set: { points: 1, expiresAt: resetAt, updatedAt: now } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return {
            allowed: true,
            remaining: maxAttempts - 1,
            resetAt: fresh.expiresAt
        };
    } catch (e) {
        const current = await SecurityRateLimit.findOne({ key });
        const allowed = !current || current.points < maxAttempts;
        return {
            allowed,
            remaining: allowed ? Math.max(0, maxAttempts - (current?.points || 1)) : 0,
            resetAt: current?.expiresAt || resetAt
        };
    }
}

export async function authorizeDeviceAsTrusted({ deviceId, targetName, verificationCode, recoveryCode, ownerUser, req }) {
    if (ownerUser.role !== 'owner') {
        const err = new Error('Solo el propietario de la agencia puede autorizar computadoras de confianza.');
        err.status = 403;
        throw err;
    }

    if (!['PC Agencia', 'PC Privada'].includes(targetName) && !targetName.trim()) {
        const err = new Error('El nombre de la computadora debe ser "PC Agencia", "PC Privada" o un nombre descriptivo.');
        err.status = 400;
        throw err;
    }

    // Cargar usuario owner completo con secretos 2FA
    const ownerDoc = await AdminUser.findById(ownerUser.id || ownerUser._id);
    if (!ownerDoc) {
        const err = new Error('Usuario propietario no encontrado.');
        err.status = 404;
        throw err;
    }

    const ip = getTrustedClientIp(req);
    const ownerId = String(ownerDoc._id);

    // FASE 3: Rate Limiting Distribuido (Max 5 intentos por ventana de 15 min por IP y por Owner)
    const ipLimit = await enforceSecurityRateLimit({
        key: `dev_auth:ip:${ip}`,
        maxAttempts: 5,
        windowSeconds: 900
    });
    if (!ipLimit.allowed) {
        await logAudit({
            req,
            action: 'RATE_LIMIT_EXCEDIDO_AUTORIZACION',
            module: 'seguridad',
            entityType: 'TrustedDevice',
            entityId: deviceId,
            description: `Límite de tasa excedido para autorización de dispositivos desde IP ${ip}`,
            metadata: { ip, retryAfterSeconds: ipLimit.retryAfterSeconds }
        });
        const err = new Error(`Demasiados intentos de autorización. Por seguridad, la IP ha sido temporalmente bloqueada por ${Math.ceil(ipLimit.retryAfterSeconds / 60)} minutos.`);
        err.status = 429;
        err.code = 'RATE_LIMIT_EXCEEDED';
        throw err;
    }

    const userLimit = await enforceSecurityRateLimit({
        key: `dev_auth:owner:${ownerId}`,
        maxAttempts: 5,
        windowSeconds: 900
    });
    if (!userLimit.allowed) {
        await logAudit({
            req,
            action: 'RATE_LIMIT_EXCEDIDO_AUTORIZACION',
            module: 'seguridad',
            entityType: 'TrustedDevice',
            entityId: deviceId,
            description: `Límite de tasa excedido para autorización de dispositivos para usuario Owner ${ownerId}`,
            metadata: { ownerId, retryAfterSeconds: userLimit.retryAfterSeconds }
        });
        const err = new Error(`Demasiados intentos de autorización para esta cuenta. Por seguridad, intente nuevamente en ${Math.ceil(userLimit.retryAfterSeconds / 60)} minutos.`);
        err.status = 429;
        err.code = 'RATE_LIMIT_EXCEEDED';
        throw err;
    }

    // VERIFICACIÓN OBLIGATORIA INDEPENDIENTE (MFA TOTP o Recovery Code)
    let isVerified = false;
    let authMethod = 'mfa_totp';

    if (verificationCode && ownerDoc.twoFactorEnabled && ownerDoc.twoFactorSecret) {
        const secret = decrypt2FaSecret(ownerDoc.twoFactorSecret);
        if (secret) {
            isVerified = speakeasy.totp.verify({
                secret,
                encoding: 'base32',
                token: String(verificationCode).trim(),
                window: 1
            });
        }
    } else if (recoveryCode) {
        // FASE 3: Consumo atómico de códigos de recuperación contra Race Conditions
        const hashedInput = crypto.createHash('sha256').update(recoveryCode.trim()).digest('hex');
        const updatedOwner = await AdminUser.findOneAndUpdate(
            { _id: ownerDoc._id, recoveryCodes: hashedInput },
            { $pull: { recoveryCodes: hashedInput } },
            { new: true }
        );
        if (updatedOwner) {
            isVerified = true;
            authMethod = 'recovery_code';
        }
    }

    if (!isVerified) {
        // Registrar intento de autorización fallido
        await logAudit({
            req,
            action: 'DISPOSITIVO_AUTORIZACION_FALLIDA',
            module: 'seguridad',
            entityType: 'TrustedDevice',
            entityId: deviceId,
            description: `Intento fallido de autorizar ${targetName} sin verificación MFA válida por ${ownerUser.email}`,
            metadata: { deviceId, targetName, ip }
        });

        const err = new Error('Código de verificación MFA inválido. Se requiere autenticación en dos pasos para registrar una computadora de confianza.');
        err.status = 401;
        throw err;
    }

    const device = await TrustedDevice.findOne({ deviceId });
    if (!device) {
        const err = new Error('Dispositivo no encontrado.');
        err.status = 404;
        throw err;
    }

    const prevStatus = device.status;
    const prevName = device.deviceName;

    device.status = 'trusted';
    device.deviceName = targetName.trim();
    device.authorizedBy = {
        userId: String(ownerDoc._id),
        name: ownerDoc.name,
        email: ownerDoc.email,
        authorizedAt: new Date(),
        authMethod
    };

    device.trustHistory.push({
        event: 'REGISTRO_AUTORIZADO',
        performedBy: {
            userId: String(ownerDoc._id),
            name: ownerDoc.name,
            role: ownerDoc.role
        },
        authMethod,
        previousValue: `${prevName} (${prevStatus})`,
        newValue: `${targetName} (trusted)`,
        ip,
        details: `Dispositivo promovido a Confiable con verificación ${authMethod}`
    });

    await device.save();

    // Actualizar todas las sesiones activas de este dispositivo para reflejar el estado confiable
    await UserSession.updateMany(
        { deviceId: device.deviceId, status: 'active' },
        { $set: { deviceStatus: 'trusted', deviceName: targetName.trim() } }
    );

    // Registro de auditoría
    await logAudit({
        req,
        action: 'DISPOSITIVO_AUTORIZADO',
        module: 'seguridad',
        entityType: 'TrustedDevice',
        entityId: device.deviceId,
        entityLabel: targetName,
        description: `Dispositivo ${targetName} (${device.deviceId}) autorizado como Confiable por ${ownerDoc.name} mediante ${authMethod}`,
        metadata: { deviceId: device.deviceId, previousName: prevName, targetName, authMethod }
    });

    return device;
}

/**
 * Revoca un dispositivo de forma inmediata e invalida todas sus sesiones activas
 */
export async function revokeDevice({ deviceId, reason, ownerUser, req }) {
    if (ownerUser.role !== 'owner') {
        const err = new Error('Solo el propietario de la agencia puede revocar computadoras.');
        err.status = 403;
        throw err;
    }

    const device = await TrustedDevice.findOne({ deviceId });
    if (!device) {
        const err = new Error('Dispositivo no encontrado.');
        err.status = 404;
        throw err;
    }

    const ip = getTrustedClientIp(req);
    const prevStatus = device.status;

    device.status = 'revoked';
    device.revokedAt = new Date();
    device.revokedBy = {
        userId: String(ownerUser.id || ownerUser._id),
        name: ownerUser.name || ownerUser.username
    };
    device.revocationReason = reason || 'Revocación manual por el propietario';

    device.trustHistory.push({
        event: 'DISPOSITIVO_REVOCADO',
        performedBy: {
            userId: String(ownerUser.id || ownerUser._id),
            name: ownerUser.name || ownerUser.username,
            role: ownerUser.role
        },
        authMethod: 'system',
        previousValue: prevStatus,
        newValue: 'revoked',
        ip,
        details: `Motivo: ${device.revocationReason}`
    });

    await device.save();

    // INVALIDACIÓN ATÓMICA DE SESIONES EN MONGODB
    // Al pasar a 'revoked', cualquier solicitud posterior en cualquier instancia serverless será rechazada
    const sessionUpdateResult = await UserSession.updateMany(
        { deviceId: device.deviceId, status: 'active' },
        { 
            $set: { 
                status: 'revoked', 
                deviceStatus: 'revoked', 
                revokedAt: new Date(), 
                revokedBy: ownerUser.name,
                revocationReason: device.revocationReason 
            } 
        }
    );

    await logAudit({
        req,
        action: 'DISPOSITIVO_REVOCADO',
        module: 'seguridad',
        entityType: 'TrustedDevice',
        entityId: device.deviceId,
        entityLabel: device.deviceName,
        description: `Dispositivo ${device.deviceName} (${device.deviceId}) fue REVOCADO por ${ownerUser.name}. Sesiones terminadas: ${sessionUpdateResult.modifiedCount}`,
        metadata: { 
            deviceId: device.deviceId, 
            reason: device.revocationReason, 
            sessionsTerminated: sessionUpdateResult.modifiedCount 
        }
    });

    return { device, sessionsTerminated: sessionUpdateResult.modifiedCount };
}

/**
 * Consulta forense completa para una computadora (12 puntos de análisis)
 */
export async function getDeviceForensicAudit(deviceId, requestingUser = null) {
    const device = await TrustedDevice.findOne({ deviceId }).lean();
    if (!device) {
        const err = new Error('Dispositivo no encontrado.');
        err.status = 404;
        throw err;
    }

    // FASE 4: Restricción estricta de PC Privada (Solo accesible por rol 'owner')
    if (device.deviceName === 'PC Privada' && requestingUser && requestingUser.role !== 'owner') {
        const err = new Error('Acceso denegado: Solo el Propietario (Owner) puede auditar la PC Privada.');
        err.status = 403;
        err.code = 'PC_PRIVADA_ACCESS_DENIED';
        throw err;
    }

    // 1. Historial de sesiones
    const sessions = await UserSession.find({ deviceId })
        .sort({ loginAt: -1 })
        .limit(100)
        .lean();

    // 2. Usuarios distintos
    const distinctUsers = await UserSession.distinct('userName', { deviceId });

    // 3. IPs distintas utilizadas
    const distinctIps = await UserSession.distinct('ip', { deviceId });

    // 4. Modificaciones con valores anteriores y nuevos
    const modifications = await AuditLog.find({ 
        deviceId, 
        action: { $regex: /_EDITADO|_ACTUALIZADO/ } 
    }).sort({ createdAt: -1 }).limit(100).lean();

    // 5. Vehículos consultados
    const vehicleConsults = await AuditLog.find({ 
        deviceId, 
        action: 'VEHICULO_CONSULTADO' 
    }).sort({ createdAt: -1 }).limit(100).lean();

    // 6. Operaciones financieras
    const financialOperations = await AuditLog.find({ 
        deviceId, 
        module: { $in: ['finanzas', 'tesoreria', 'ventas', 'cuotas'] } 
    }).sort({ createdAt: -1 }).limit(100).lean();

    // 7. Intentos fallidos
    const failedLogins = await AuditLog.find({ 
        $or: [
            { deviceId, action: 'LOGIN_FALLIDO' },
            { ip: { $in: distinctIps }, action: 'LOGIN_FALLIDO' }
        ]
    }).sort({ createdAt: -1 }).limit(50).lean();

    // 8. Exportaciones y eliminaciones
    const exportsAndDeletions = await AuditLog.find({ 
        deviceId, 
        action: { $regex: /EXPORT|ELIMINAD/ } 
    }).sort({ createdAt: -1 }).limit(50).lean();

    // 9. Secciones visitadas
    const sectionsVisited = await AuditLog.find({ 
        deviceId, 
        action: 'SECCION_VISITADA' 
    }).sort({ createdAt: -1 }).limit(100).lean();

    return {
        device,
        summary: {
            totalSessions: sessions.length,
            distinctUsersCount: distinctUsers.length,
            users: distinctUsers,
            ips: distinctIps,
            activeSessions: sessions.filter(s => s.status === 'active').length
        },
        sessions,
        modifications,
        vehicleConsults,
        financialOperations,
        failedLogins,
        exportsAndDeletions,
        sectionsVisited,
        trustHistory: device.trustHistory || []
    };
}
