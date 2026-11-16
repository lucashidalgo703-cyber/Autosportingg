import crypto from 'node:crypto';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import AdminUser from '../models/AdminUser.js';
import LoginSession from '../models/LoginSession.js';
import { GptExpenseCode, GptExpenseGrant, GptExpenseRateLimit } from '../models/GptExpenseAuthorization.js';
import { validateLoginSession } from './authSessionService.js';
import { credentialFingerprint } from './emailLoginService.js';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions.js';

export const GPT_EXPENSE_SCOPE = 'expenses.write';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const randomToken = prefix => prefix + crypto.randomBytes(32).toString('base64url');
const fail = (message, status = 400, code = 'invalid_request') => Object.assign(new Error(message), { status, code });
const equal = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const left = Buffer.from(a), right = Buffer.from(b);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
};

function config() {
    const clientId = process.env.GPT_EXPENSE_CLIENT_ID?.trim();
    const secret = process.env.GPT_EXPENSE_CLIENT_SECRET?.trim();
    const redirectUris = (process.env.GPT_EXPENSE_REDIRECT_URIS || '').split(',').map(value => value.trim()).filter(Boolean);
    if (!clientId || !secret || secret.length < 32 || !redirectUris.length) throw fail('La conexión de gastos todavía no está configurada.', 503, 'temporarily_unavailable');
    if (redirectUris.some(value => {
        try { const url = new URL(value); return url.protocol !== 'https:' || url.username || url.password || url.hash || url.search; }
        catch { return true; }
    })) throw fail('La configuración de callbacks no es válida.', 503, 'temporarily_unavailable');
    return { clientId, secret, redirectUris };
}

export function validateGptAuthorization(input) {
    const settings = config();
    if (input.client_id !== settings.clientId || !settings.redirectUris.includes(input.redirect_uri)) throw fail('Cliente o dirección de retorno no registrados.');
    if (input.response_type !== 'code' || input.scope !== GPT_EXPENSE_SCOPE) throw fail('La conexión solo permite el alcance de gastos.');
    if (typeof input.state !== 'string' || input.state.length < 8 || input.state.length > 1024) throw fail('Falta un estado de autorización válido.');
    return settings;
}

async function liveIdentity(record) {
    const session = await LoginSession.findOne({ _id: record.sessionId, userId: record.userId, revokedAt: null, expiresAt: { $gt: new Date() } }).lean();
    if (!session) return null;
    const user = await AdminUser.findById(record.userId).lean();
    if (!user?.active || session.credentialFingerprint !== credentialFingerprint(user)
        || session.credentialFingerprint !== record.credentialFingerprint || !hasPermission(user, PERMISSIONS.FINANZAS_WRITE)) return null;
    return { id: String(user._id), userId: String(user._id), username: user.name, email: user.email, role: user.role, permissions: user.permissions || [] };
}

export async function issueGptAuthorization(input, sessionToken) {
    validateGptAuthorization(input);
    const user = await validateLoginSession(sessionToken);
    if (!user) throw fail('Iniciá sesión y completá la verificación por correo.', 401, 'login_required');
    if (!hasPermission(user, PERMISSIONS.FINANZAS_WRITE)) throw fail('Tu cuenta no tiene permiso para cargar gastos.', 403, 'access_denied');
    const sessionId = hash(user.sid);
    const session = await LoginSession.findById(sessionId).lean();
    const code = randomToken('gpc_');
    await GptExpenseCode.create({ _id: hash(code), userId: user.id, sessionId,
        credentialFingerprint: session.credentialFingerprint, redirectUri: input.redirect_uri,
        clientId: input.client_id, expiresAt: new Date(Math.min(Date.now() + 5 * 60_000, session.expiresAt.getTime())), sessionExpiresAt: session.expiresAt });
    const callback = new URL(input.redirect_uri);
    callback.searchParams.set('code', code);
    callback.searchParams.set('state', input.state);
    return { redirectUrl: callback.toString() };
}

function validateClient(input) {
    const settings = config();
    if (!equal(input.client_id, settings.clientId) || !equal(input.client_secret, settings.secret)) throw fail('Cliente no autorizado.', 401, 'invalid_client');
    return settings;
}

export async function exchangeGptToken(input) {
    validateClient(input);
    await connectDB();
    const now = new Date();
    let source;
    if (input.grant_type === 'authorization_code') {
        if (typeof input.code !== 'string' || input.code.length > 100 || typeof input.redirect_uri !== 'string') throw fail('Código inválido.', 400, 'invalid_grant');
        source = await GptExpenseCode.findOne({ _id: hash(input.code), clientId: input.client_id, redirectUri: input.redirect_uri, consumedAt: null, expiresAt: { $gt: now } }).lean();
    } else if (input.grant_type === 'refresh_token') {
        if (typeof input.refresh_token !== 'string' || input.refresh_token.length > 100) throw fail('Token inválido.', 400, 'invalid_grant');
        source = await GptExpenseGrant.findOne({ refreshHash: hash(input.refresh_token), clientId: input.client_id, revokedAt: null, expiresAt: { $gt: now } }).lean();
    } else throw fail('Tipo de autorización no admitido.', 400, 'unsupported_grant_type');
    if (!source || !await liveIdentity(source)) throw fail('La sesión expiró. Volvé a conectar tu cuenta.', 400, 'invalid_grant');
    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            const consumed = input.grant_type === 'authorization_code'
                ? await GptExpenseCode.updateOne({ _id: source._id, consumedAt: null, expiresAt: { $gt: now } }, { $set: { consumedAt: now } }, { session })
                : await GptExpenseGrant.updateOne({ _id: source._id, revokedAt: null, expiresAt: { $gt: now } }, { $set: { revokedAt: now } }, { session });
            if (consumed.modifiedCount !== 1) throw fail('La autorización ya fue utilizada.', 400, 'invalid_grant');
            const access = randomToken('gpa_');
            const refresh = randomToken('gpr_');
            const expiresAt = source.sessionExpiresAt || source.expiresAt;
            const accessExpiresAt = new Date(Math.min(Date.now() + 15 * 60_000, expiresAt.getTime()));
            await GptExpenseGrant.create([{ _id: hash(access), refreshHash: hash(refresh), userId: source.userId,
                sessionId: source.sessionId, credentialFingerprint: source.credentialFingerprint, clientId: source.clientId,
                accessExpiresAt, expiresAt }], { session });
            result = { access_token: access, refresh_token: refresh, token_type: 'Bearer', scope: GPT_EXPENSE_SCOPE,
                expires_in: Math.max(1, Math.floor((accessExpiresAt.getTime() - Date.now()) / 1000)) };
        });
        return result;
    } finally { await session.endSession(); }
}

export async function authenticateGpt(req, res, next) {
    try {
        const token = req.headers.authorization?.match(/^Bearer (gpa_[A-Za-z0-9_-]{43})$/)?.[1];
        if (!token) throw fail('Conectá tu cuenta del CRM.', 401, 'invalid_token');
        await connectDB();
        const grant = await GptExpenseGrant.findOne({ _id: hash(token), revokedAt: null, accessExpiresAt: { $gt: new Date() }, expiresAt: { $gt: new Date() } }).lean();
        const user = grant && await liveIdentity(grant);
        if (!user) throw fail('La sesión expiró o ya no tiene permiso. Volvé a conectar el CRM.', 401, 'invalid_token');
        req.user = user;
        req.gptScope = GPT_EXPENSE_SCOPE;
        await gptRequestQuota('expense:' + user.id, 120);
        next();
    } catch (error) {
        res.status(error.status || 503).json({ error: error.code || 'temporarily_unavailable', message: error.status ? error.message : 'No se pudo validar la conexión.' });
    }
}

// Mongo-backed fixed windows also work with multiple serverless instances.
export async function gptRequestQuota(key, max = 40) {
    await connectDB();
    const window = Math.floor(Date.now() / 60_000);
    const id = hash(key + ':' + window);
    let result;
    try {
        result = await GptExpenseRateLimit.findOneAndUpdate({ _id: id }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 2) * 60_000) } }, { upsert: true, returnDocument: 'after' }).lean();
    } catch (error) {
        if (error.code !== 11000) throw error;
        result = await GptExpenseRateLimit.findOneAndUpdate({ _id: id }, { $inc: { count: 1 } }, { returnDocument: 'after' }).lean();
    }
    if (result.count > max) throw fail('Demasiadas solicitudes. Esperá un minuto.', 429, 'rate_limit_exceeded');
}
