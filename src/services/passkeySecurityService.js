import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} from '@simplewebauthn/server';
import PasskeyCredential from '../models/PasskeyCredential.js';
import PasskeyChallenge from '../models/PasskeyChallenge.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * Resuelve la configuración de Relying Party (RP) y orígenes esperados.
 * Admite localhost, subdominios de producción y puertos efímeros de tests.
 */
export function resolveWebAuthnConfig(req) {
    const envRpId = process.env.WEBAUTHN_RP_ID;
    const envOrigin = process.env.WEBAUTHN_ORIGIN;

    let host = req?.headers?.['x-forwarded-host'] || req?.headers?.host || req?.hostname || 'localhost';
    if (typeof host === 'string') {
        host = host.split(':')[0].trim();
    } else {
        host = 'localhost';
    }

    let rpID = envRpId || host;
    if (rpID === '127.0.0.1') {
        rpID = 'localhost';
    }

    const originsSet = new Set();
    if (envOrigin) {
        originsSet.add(envOrigin);
    }

    // Origen de la petición entrante
    const incomingOrigin = req?.get ? req.get('origin') : (req?.headers?.origin);
    if (incomingOrigin) {
        originsSet.add(incomingOrigin);
    }

    // Orígenes locales estándar de desarrollo y pruebas
    originsSet.add('http://localhost:3000');
    originsSet.add('http://localhost:3001');
    originsSet.add('http://127.0.0.1:3000');
    originsSet.add('http://127.0.0.1:3001');
    originsSet.add('https://localhost:3000');
    originsSet.add('https://localhost:3001');

    // Reconstruir origen basado en cabecera host si existe
    const rawHostHeader = req?.headers?.['x-forwarded-host'] || req?.headers?.host;
    if (rawHostHeader) {
        const proto = req?.headers?.['x-forwarded-proto'] || (req?.secure ? 'https' : 'http');
        originsSet.add(`${proto}://${rawHostHeader}`);
    }

    return {
        rpName: 'AutoSporting Intelligence',
        rpID,
        expectedOrigins: Array.from(originsSet)
    };
}

/**
 * Helper para registrar intentos fallidos de autenticación sin romper la cadena HMAC
 * y sin volcar datos biométricos, secretos ni desafíos completos.
 */
async function logAuditSafe({ req, action, user, reason, credentialId }) {
    try {
        await logAudit({
            req,
            action,
            module: 'seguridad',
            entityType: 'PasskeyCredential',
            entityId: credentialId || 'unknown',
            entityLabel: 'WebAuthn 2FA',
            description: `Falla en autenticación WebAuthn 2FA para ${user?.email || 'usuario'}: ${reason}`,
            metadata: {
                reason: String(reason || '').slice(0, 200),
                credentialId: credentialId ? String(credentialId).slice(0, 80) : undefined
            }
        });
    } catch (e) {
        console.error('[WebAuthn Audit Log Safe Error]:', e.message);
    }
}

/**
 * Genera opciones de registro (Ceremonia WebAuthn Registration)
 */
export async function issuePasskeyRegistrationOptions({ user, req }) {
    if (!user || user.role !== 'owner' || !user.active) {
        const err = new Error('Acceso restringido exclusivamente al propietario autorizado.');
        err.code = 'ONLY_OWNER_ALLOWED';
        err.status = 403;
        throw err;
    }

    const config = resolveWebAuthnConfig(req);

    // Excluir credenciales existentes activas para evitar registrar la misma llave física dos veces
    const existingPasskeys = await PasskeyCredential.find({
        userId: user._id,
        status: 'active'
    }).lean();

    const excludeCredentials = existingPasskeys.map(p => ({
        id: p.credentialId,
        type: 'public-key',
        transports: p.transports && p.transports.length > 0 ? p.transports : undefined
    }));

    const options = await generateRegistrationOptions({
        rpName: config.rpName,
        rpID: config.rpID,
        userID: new Uint8Array(Buffer.from(user._id.toString())),
        userName: user.email,
        userDisplayName: user.name || user.email,
        attestationType: 'none',
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'required'
        },
        excludeCredentials,
        timeout: 60000
    });

    // Guardar desafío atómico con TTL de 5 minutos
    await PasskeyChallenge.create({
        challenge: options.challenge,
        userId: user._id,
        purpose: 'registration',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    return options;
}

/**
 * Valida la respuesta de registro y persiste la nueva Passkey
 */
export async function verifyAndRegisterPasskey({ user, credentialResponse, name, req }) {
    if (!user || user.role !== 'owner' || !user.active) {
        const err = new Error('Acceso restringido exclusivamente al propietario autorizado.');
        err.code = 'ONLY_OWNER_ALLOWED';
        err.status = 403;
        throw err;
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
        const err = new Error('El nombre de la credencial es obligatorio (ej. PC Agencia, iPhone).');
        err.code = 'INVALID_NAME';
        err.status = 400;
        throw err;
    }

    if (!credentialResponse?.response?.clientDataJSON) {
        const err = new Error('Respuesta de credencial WebAuthn incompleta.');
        err.code = 'INVALID_CREDENTIAL_RESPONSE';
        err.status = 400;
        throw err;
    }

    let clientDataJSON;
    try {
        const rawJson = Buffer.from(credentialResponse.response.clientDataJSON, 'base64url').toString('utf8');
        clientDataJSON = JSON.parse(rawJson);
    } catch {
        const err = new Error('clientDataJSON malformado.');
        err.code = 'MALFORMED_CLIENT_DATA';
        err.status = 400;
        throw err;
    }

    const challengeStr = clientDataJSON.challenge;
    if (!challengeStr) {
        const err = new Error('Desafío no encontrado en clientDataJSON.');
        err.code = 'MISSING_CHALLENGE';
        err.status = 400;
        throw err;
    }

    // 1. Consumo atómico del desafío (un solo uso, anti-replay)
    const challengeDoc = await PasskeyChallenge.findOneAndUpdate(
        {
            challenge: challengeStr,
            userId: user._id,
            purpose: 'registration',
            used: false,
            expiresAt: { $gt: new Date() }
        },
        { $set: { used: true, usedAt: new Date() } }
    );

    if (!challengeDoc) {
        const err = new Error('Desafío de registro WebAuthn inválido, expirado o ya utilizado.');
        err.code = 'CHALLENGE_INVALID_OR_EXPIRED';
        err.status = 401;
        throw err;
    }

    const config = resolveWebAuthnConfig(req);

    let verification;
    try {
        verification = await verifyRegistrationResponse({
            response: credentialResponse,
            expectedChallenge: challengeDoc.challenge,
            expectedOrigin: config.expectedOrigins,
            expectedRPID: config.rpID,
            requireUserVerification: true
        });
    } catch (vErr) {
        const err = new Error('Verificación de registro WebAuthn fallida: ' + vErr.message);
        err.code = 'VERIFICATION_ERROR';
        err.status = 400;
        throw err;
    }

    if (!verification.verified || !verification.registrationInfo) {
        const err = new Error('No se pudo verificar la credencial WebAuthn.');
        err.code = 'VERIFICATION_FAILED';
        err.status = 400;
        throw err;
    }

    const { credential, deviceType, backedUp, aaguid } = verification.registrationInfo;

    // Verificar si ya existe registrada y activa
    const existing = await PasskeyCredential.findOne({ credentialId: credential.id });
    if (existing && existing.status === 'active') {
        const err = new Error('Esta credencial ya se encuentra registrada y activa.');
        err.code = 'CREDENTIAL_ALREADY_EXISTS';
        err.status = 409;
        throw err;
    }

    const publicKeyBase64 = Buffer.from(credential.publicKey).toString('base64url');
    const transports = credentialResponse.response.transports || credential.transports || [];

    const newPasskey = new PasskeyCredential({
        credentialId: credential.id,
        userId: user._id,
        name: name.trim(),
        publicKey: publicKeyBase64,
        counter: credential.counter || 0,
        deviceType: deviceType || 'singleDevice',
        backedUp: Boolean(backedUp),
        transports,
        aaguid: aaguid || '',
        status: 'active',
        registeredAt: new Date()
    });

    await newPasskey.save();

    await logAudit({
        req,
        action: 'PASSKEY_REGISTERED',
        module: 'seguridad',
        entityType: 'PasskeyCredential',
        entityId: credential.id,
        entityLabel: name.trim(),
        description: `Passkey registrada exitosamente: "${name.trim()}" para ${user.email} (UV=required)`,
        metadata: {
            credentialId: credential.id,
            deviceType,
            backedUp: Boolean(backedUp),
            aaguid
        }
    });

    return {
        ok: true,
        passkey: {
            credentialId: newPasskey.credentialId,
            name: newPasskey.name,
            createdAt: newPasskey.registeredAt,
            status: newPasskey.status,
            deviceType: newPasskey.deviceType,
            transports: newPasskey.transports
        }
    };
}

/**
 * Genera opciones de autenticación (Ceremonia WebAuthn Authentication)
 */
export async function issuePasskeyAuthenticationOptions({ user, req }) {
    if (!user || user.role !== 'owner' || !user.active) {
        const err = new Error('Acceso restringido exclusivamente al propietario autorizado.');
        err.code = 'ONLY_OWNER_ALLOWED';
        err.status = 403;
        throw err;
    }

    const activePasskeys = await PasskeyCredential.find({
        userId: user._id,
        status: 'active'
    }).lean();

    if (activePasskeys.length === 0) {
        const err = new Error('No existen passkeys activas para este usuario.');
        err.code = 'NO_ACTIVE_PASSKEYS';
        err.status = 404;
        throw err;
    }

    const config = resolveWebAuthnConfig(req);

    const allowCredentials = activePasskeys.map(p => ({
        id: p.credentialId,
        type: 'public-key',
        transports: p.transports && p.transports.length > 0 ? p.transports : undefined
    }));

    const options = await generateAuthenticationOptions({
        rpID: config.rpID,
        allowCredentials,
        userVerification: 'required',
        timeout: 60000
    });

    // Guardar desafío atómico con TTL de 5 minutos
    await PasskeyChallenge.create({
        challenge: options.challenge,
        userId: user._id,
        purpose: 'authentication',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    return options;
}

/**
 * Valida la aserción criptográfica WebAuthn de segundo factor
 */
export async function verifyPasskeyAuthentication({ user, credentialResponse, req }) {
    if (!user || user.role !== 'owner' || !user.active) {
        const err = new Error('Acceso restringido exclusivamente al propietario autorizado.');
        err.code = 'ONLY_OWNER_ALLOWED';
        err.status = 403;
        throw err;
    }

    if (!credentialResponse?.id || !credentialResponse?.response?.clientDataJSON) {
        const err = new Error('Respuesta de autenticación WebAuthn incompleta.');
        err.code = 'INVALID_CREDENTIAL_RESPONSE';
        err.status = 400;
        throw err;
    }

    let clientDataJSON;
    try {
        const rawJson = Buffer.from(credentialResponse.response.clientDataJSON, 'base64url').toString('utf8');
        clientDataJSON = JSON.parse(rawJson);
    } catch {
        const err = new Error('clientDataJSON malformado.');
        err.code = 'MALFORMED_CLIENT_DATA';
        err.status = 400;
        throw err;
    }

    const challengeStr = clientDataJSON.challenge;
    if (!challengeStr) {
        const err = new Error('Desafío no presente en clientDataJSON.');
        err.code = 'MISSING_CHALLENGE';
        err.status = 400;
        throw err;
    }

    // 1. Consumo atómico del desafío (un solo uso, anti-replay)
    const challengeDoc = await PasskeyChallenge.findOneAndUpdate(
        {
            challenge: challengeStr,
            userId: user._id,
            purpose: 'authentication',
            used: false,
            expiresAt: { $gt: new Date() }
        },
        { $set: { used: true, usedAt: new Date() } }
    );

    if (!challengeDoc) {
        await logAuditSafe({ req, action: 'PASSKEY_AUTH_FAILED', user, reason: 'CHALLENGE_INVALID_OR_EXPIRED', credentialId: credentialResponse.id });
        const err = new Error('Desafío WebAuthn inválido, expirado o ya utilizado.');
        err.code = 'CHALLENGE_INVALID_OR_EXPIRED';
        err.status = 401;
        throw err;
    }

    // 2. Verificar que la credencial exista y pertenezca al usuario Owner
    const passkeyDoc = await PasskeyCredential.findOne({
        credentialId: credentialResponse.id,
        userId: user._id
    });

    if (!passkeyDoc) {
        await logAuditSafe({ req, action: 'PASSKEY_AUTH_FAILED', user, reason: 'PASSKEY_NOT_FOUND_OR_WRONG_USER', credentialId: credentialResponse.id });
        const err = new Error('La credencial no pertenece al usuario autenticado.');
        err.code = 'CREDENTIAL_USER_MISMATCH';
        err.status = 401;
        throw err;
    }

    if (passkeyDoc.status !== 'active') {
        await logAuditSafe({ req, action: 'PASSKEY_AUTH_FAILED', user, reason: 'PASSKEY_REVOKED', credentialId: credentialResponse.id });
        const err = new Error('Esta credencial ha sido revocada y no puede utilizarse.');
        err.code = 'PASSKEY_REVOKED';
        err.status = 401;
        throw err;
    }

    const config = resolveWebAuthnConfig(req);

    let verification;
    try {
        verification = await verifyAuthenticationResponse({
            response: credentialResponse,
            expectedChallenge: challengeDoc.challenge,
            expectedOrigin: config.expectedOrigins,
            expectedRPID: config.rpID,
            credential: {
                id: passkeyDoc.credentialId,
                publicKey: new Uint8Array(Buffer.from(passkeyDoc.publicKey, 'base64url')),
                counter: passkeyDoc.counter || 0,
                transports: passkeyDoc.transports
            },
            requireUserVerification: true
        });
    } catch (vErr) {
        await logAuditSafe({ req, action: 'PASSKEY_AUTH_FAILED', user, reason: vErr.message, credentialId: passkeyDoc.credentialId });
        const err = new Error('Fallo de verificación criptográfica WebAuthn: ' + vErr.message);
        err.code = 'PASSKEY_VERIFICATION_FAILED';
        err.status = 401;
        throw err;
    }

    if (!verification.verified || !verification.authenticationInfo) {
        await logAuditSafe({ req, action: 'PASSKEY_AUTH_FAILED', user, reason: 'VERIFICATION_UNSUCCESSFUL', credentialId: passkeyDoc.credentialId });
        const err = new Error('Firma criptográfica inválida.');
        err.code = 'PASSKEY_VERIFICATION_FAILED';
        err.status = 401;
        throw err;
    }

    const { newCounter, userVerified } = verification.authenticationInfo;

    // Validación estricta de User Verification (UV = required)
    if (!userVerified) {
        await logAuditSafe({ req, action: 'PASSKEY_AUTH_FAILED', user, reason: 'USER_VERIFICATION_NOT_MET', credentialId: passkeyDoc.credentialId });
        const err = new Error('La verificación biométrica/PIN (User Verification) es obligatoria y no fue satisfecha.');
        err.code = 'USER_VERIFICATION_REQUIRED';
        err.status = 401;
        throw err;
    }

    // Detección de clonación de autenticador:
    // Si el contador anterior era > 0 y el nuevo contador es <= al anterior, potencial llave clonada
    if (passkeyDoc.counter > 0 && newCounter > 0 && newCounter <= passkeyDoc.counter) {
        await logAuditSafe({ req, action: 'PASSKEY_AUTH_FAILED', user, reason: 'COUNTER_CLONE_DETECTED', credentialId: passkeyDoc.credentialId });
        const err = new Error('Posible anomalía de firma o clonación detectada en el autenticador.');
        err.code = 'COUNTER_CLONE_DETECTED';
        err.status = 401;
        throw err;
    }

    // Actualizar contador y último uso
    passkeyDoc.counter = newCounter;
    passkeyDoc.lastUsedAt = new Date();
    await passkeyDoc.save();

    await logAudit({
        req,
        action: 'PASSKEY_AUTH_SUCCESS',
        module: 'seguridad',
        entityType: 'PasskeyCredential',
        entityId: passkeyDoc.credentialId,
        entityLabel: passkeyDoc.name,
        description: `Autenticación 2FA exitosa con Passkey "${passkeyDoc.name}" para ${user.email} (UV=verified)`,
        metadata: {
            credentialId: passkeyDoc.credentialId,
            counter: newCounter,
            userVerified
        }
    });

    return {
        verified: true,
        passkey: passkeyDoc
    };
}

/**
 * Revoca una credencial WebAuthn
 */
export async function revokePasskey({ userId, credentialId, operatorUser, reason = 'Revocación manual por el propietario', req }) {
    if (!operatorUser || operatorUser.role !== 'owner') {
        const err = new Error('Acceso restringido exclusivamente al propietario autorizado.');
        err.code = 'ONLY_OWNER_ALLOWED';
        err.status = 403;
        throw err;
    }

    const passkey = await PasskeyCredential.findOne({
        credentialId,
        userId
    });

    if (!passkey) {
        const err = new Error('Passkey no encontrada.');
        err.code = 'PASSKEY_NOT_FOUND';
        err.status = 404;
        throw err;
    }

    if (passkey.status === 'revoked') {
        return { ok: true, message: 'La passkey ya se encontraba revocada.', passkey };
    }

    passkey.status = 'revoked';
    passkey.revokedAt = new Date();
    passkey.revokedBy = {
        userId: String(operatorUser._id || operatorUser.userId),
        name: operatorUser.name || operatorUser.email
    };
    passkey.revocationReason = reason;

    await passkey.save();

    await logAudit({
        req,
        action: 'PASSKEY_REVOKED',
        module: 'seguridad',
        entityType: 'PasskeyCredential',
        entityId: passkey.credentialId,
        entityLabel: passkey.name,
        description: `Passkey revocada: "${passkey.name}" por ${operatorUser.email}`,
        metadata: {
            credentialId: passkey.credentialId,
            revocationReason: reason
        }
    });

    return {
        ok: true,
        message: 'Passkey revocada exitosamente.',
        passkey
    };
}
