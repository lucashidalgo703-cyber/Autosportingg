import crypto from 'node:crypto';
import LoginChallenge from '../models/LoginChallenge.js';
import LoginEmailRateLimit from '../models/LoginEmailRateLimit.js';
import AdminUser from '../models/AdminUser.js';
import { EmailAdapter } from '../lib/emailAdapter.js';

export const EMAIL_CODE_TTL_MS = 5 * 60 * 1000;
export const EMAIL_RESEND_DELAY_MS = 60 * 1000;
export const EMAIL_ATTEMPT_TTL_MS = 15 * 60 * 1000;
export const EMAIL_MAX_ATTEMPTS = 5;
export const EMAIL_MAX_SENDS_PER_WINDOW = 5;

export class LoginChallengeError extends Error {
    constructor(status, message, retryAfter, attemptsRemaining) {
        super(message);
        this.name = 'LoginChallengeError';
        this.status = status;
        this.retryAfter = retryAfter;
        this.attemptsRemaining = attemptsRemaining;
    }
}
const invalidChallenge = () => new LoginChallengeError(401, 'La solicitud de ingreso venció o ya fue utilizada. Iniciá sesión nuevamente.');
const secondsUntil = date => Math.max(1, Math.ceil((new Date(date).getTime() - Date.now()) / 1000));
const hmac = value => {
    const secret = process.env.EMAIL_LOGIN_HMAC_SECRET?.trim() || process.env.JWT_SECRET?.trim();
    if (!secret) throw new LoginChallengeError(503, 'Servicio de autenticación no disponible.');
    return crypto.createHmac('sha256', secret).update(value).digest('hex');
};
export const hashChallengeToken = token => {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw invalidChallenge();
    return crypto.createHash('sha256').update(token).digest('hex');
};
export const credentialFingerprint = user => hmac(`credentials:${user._id}:${user.passwordHash}:${Boolean(user.twoFactorEnabled)}:${user.twoFactorSecret || ''}`);
const hashCode = (challenge, code, generation = challenge.generation) => hmac(`email-code:${challenge._id}:${challenge.userId}:${generation}:${code}`);
const getRecipient = () => {
    const recipient = process.env.SECURITY_ALERT_EMAIL?.trim();
    // A single bare address only; reject lists, headers and display names.
    if (!recipient || !/^[A-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.[A-Z]{2,}$/i.test(recipient)) {
        throw new Error('Security notification recipient unavailable');
    }
    return recipient;
};
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const describeLoginDevice = req => {
    const ua = String(req?.headers?.['user-agent'] || '').slice(0, 1024);
    let browser = 'Navegador desconocido';
    if (/Edg(?:e|A|iOS)?\//i.test(ua)) browser = 'Microsoft Edge';
    else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
    else if (/Firefox\/|FxiOS\//i.test(ua)) browser = 'Firefox';
    else if (/Chrome\/|CriOS\//i.test(ua)) browser = 'Chrome';
    else if (/Safari\//i.test(ua)) browser = 'Safari';
    let os = 'Sistema operativo desconocido';
    if (/Android/i.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS / iPadOS';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
    else if (/CrOS/i.test(ua)) os = 'ChromeOS';
    else if (/Linux/i.test(ua)) os = 'Linux';
    return { browser, os };
};
const buildEmail = (user, code, req) => {
    const name = String(user.name || user.email).replace(/[\r\n]/g, ' ').slice(0, 160);
    const date = new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'full', timeStyle: 'long'
    }).format(new Date());
    const { browser, os } = describeLoginDevice(req);
    return {
        subject: `AutoSporting | Solicitud de ingreso de ${name}`,
        html: `<div style="font-family:Arial,sans-serif;color:#18181b;max-width:600px;margin:auto;padding:24px">
<h1 style="font-size:24px">Solicitud de ingreso pendiente</h1>
<p>Las credenciales de la cuenta fueron validadas, pero <strong>el ingreso al CRM todavía está pendiente</strong>. La sesión se habilitará únicamente al verificar este código en la solicitud que lo generó.</p>
<div style="font-size:42px;letter-spacing:10px;font-weight:bold;padding:24px;background:#f4f4f5;text-align:center">${code}</div>
<p>El código vence en 5 minutos, permite hasta 5 intentos y se usa una sola vez. Si se solicita un nuevo código, el anterior deja de funcionar.</p>
<p><strong>Cuenta que solicita acceso:</strong> ${escapeHtml(name)} (${escapeHtml(user.email)})<br>
<strong>Fecha y hora argentina:</strong> ${escapeHtml(date)}<br>
<strong>Navegador:</strong> ${escapeHtml(browser)}<br>
<strong>Sistema operativo:</strong> ${escapeHtml(os)}</p>
<p>Si no reconocés esta solicitud, no compartas el código. Este correo es el aviso de seguridad y la solicitud de verificación.</p>
</div>`
    };
};
// Conditional MongoDB writes enforce the quota across all server instances.
const reserveAccountSend = async userId => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EMAIL_ATTEMPT_TTL_MS);
    const id = String(userId);
    try {
        await LoginEmailRateLimit.updateOne({ _id: id }, {
            $setOnInsert: { count: 0, windowStartedAt: now, expiresAt }
        }, { upsert: true });
    } catch (error) {
        if (error.code !== 11000) throw error;
    }
    await LoginEmailRateLimit.updateOne({ _id: id, expiresAt: { $lte: now } }, {
        $set: { count: 0, windowStartedAt: now, expiresAt }
    });
    const quota = await LoginEmailRateLimit.findOneAndUpdate({ _id: id, count: { $lt: EMAIL_MAX_SENDS_PER_WINDOW } }, {
        $inc: { count: 1 }
    }, { new: true }).lean();
    if (!quota) {
        const current = await LoginEmailRateLimit.findById(id).lean();
        throw new LoginChallengeError(429, 'Se alcanzó el límite de envíos para esta cuenta. Esperá unos minutos e intentá nuevamente.', current ? secondsUntil(current.expiresAt) : 60);
    }
};
const pendingPayload = (challenge, challengeId, emailSent, message) => ({
    requireEmailVerification: true, challengeId, emailSent,
    expiresAt: challenge.codeExpiresAt.toISOString(),
    attemptExpiresAt: challenge.expiresAt.toISOString(),
    resendAvailableAt: challenge.resendAvailableAt.toISOString(),
    ...(message ? { message } : {})
});
const sendReservedCode = async (challenge, challengeId, user, code, req) => {
    try {
        const recipient = getRecipient();
        const { subject, html } = buildEmail(user, code, req);
        const info = await EmailAdapter.sendEmail(recipient, subject, html, [], { connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
        // SMTP can resolve a request whose recipients were all rejected.
        if (Array.isArray(info?.rejected) && info.rejected.length > 0) throw new Error('Recipient rejected');
        const sent = await LoginChallenge.findOneAndUpdate({
            _id: challenge._id, status: 'pending', generation: challenge.generation,
            expiresAt: { $gt: new Date() }, codeExpiresAt: { $gt: new Date() }
        }, { $set: { emailSent: true } }, { new: true });
        if (!sent) throw new Error('Delivery no longer current');
        return pendingPayload(sent, challengeId, true);
    } catch {
        // Transport errors may contain mail content: never log or serialize them.
        await LoginChallenge.updateOne({ _id: challenge._id, status: 'pending', generation: challenge.generation }, {
            $unset: { codeHash: 1 }, $set: { emailSent: false }
        });
        return pendingPayload(challenge, challengeId, false, 'No se pudo enviar el correo. El acceso sigue pendiente. Podés reintentar el envío cuando termine la espera.');
    }
};
const activeUserFor = async challenge => {
    const user = await AdminUser.findById(challenge.userId);
    if (!user?.active || credentialFingerprint(user) !== challenge.credentialFingerprint) throw invalidChallenge();
    return user;
};
export async function createEmailLoginChallenge(user, req) {
    await reserveAccountSend(user._id);
    const now = new Date();
    const challengeId = crypto.randomBytes(32).toString('hex');
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const challenge = new LoginChallenge({
        _id: hashChallengeToken(challengeId), userId: user._id,
        credentialFingerprint: credentialFingerprint(user),
        generation: crypto.randomBytes(16).toString('hex'),
        codeExpiresAt: new Date(now.getTime() + EMAIL_CODE_TTL_MS),
        expiresAt: new Date(now.getTime() + EMAIL_ATTEMPT_TTL_MS),
        resendAvailableAt: new Date(now.getTime() + EMAIL_RESEND_DELAY_MS)
    });
    challenge.codeHash = hashCode(challenge, code);
    await challenge.save();
    return sendReservedCode(challenge, challengeId, user, code, req);
}
export async function resendEmailLoginChallenge(challengeId, req) {
    const id = hashChallengeToken(challengeId);
    const now = new Date();
    const previous = await LoginChallenge.findOne({ _id: id, status: 'pending', expiresAt: { $gt: now } });
    if (!previous) throw invalidChallenge();
    const user = await activeUserFor(previous);
    if (previous.resendAvailableAt > now) throw new LoginChallengeError(429, 'Esperá antes de reenviar el código.', secondsUntil(previous.resendAvailableAt));
    // Invalidate immediately, including when the replacement delivery fails.
    const claimed = await LoginChallenge.findOneAndUpdate({
        _id: id, status: 'pending', generation: previous.generation,
        resendAvailableAt: { $lte: now }, expiresAt: { $gt: now }
    }, {
        $set: { emailSent: false, resendAvailableAt: new Date(now.getTime() + EMAIL_RESEND_DELAY_MS) },
        $unset: { codeHash: 1 }
    }, { new: true });
    if (!claimed) throw new LoginChallengeError(429, 'Esperá antes de reenviar el código.', 60);
    await reserveAccountSend(user._id);
    let code;
    do { code = String(crypto.randomInt(0, 1000000)).padStart(6, '0'); }
    while (previous.codeHash && hashCode(previous, code) === previous.codeHash);
    const generation = crypto.randomBytes(16).toString('hex');
    claimed.generation = generation;
    const replacement = await LoginChallenge.findOneAndUpdate({
        _id: id, status: 'pending', generation: previous.generation, expiresAt: { $gt: new Date() }
    }, {
        $set: { generation, codeHash: hashCode(claimed, code), attempts: 0,
            codeExpiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS),
            expiresAt: new Date(Date.now() + EMAIL_ATTEMPT_TTL_MS) }
    }, { new: true });
    if (!replacement) throw invalidChallenge();
    return sendReservedCode(replacement, challengeId, user, code, req);
}
export async function verifyEmailLoginChallenge(challengeId, code) {
    const id = hashChallengeToken(challengeId);
    const now = new Date();
    const challenge = await LoginChallenge.findOne({ _id: id, status: 'pending', expiresAt: { $gt: now } });
    if (!challenge) throw invalidChallenge();
    await activeUserFor(challenge);
    if (challenge.attempts >= EMAIL_MAX_ATTEMPTS) throw new LoginChallengeError(429, 'Se agotaron los 5 intentos. Solicitá un nuevo código.', undefined, 0);
    if (!challenge.emailSent || !challenge.codeHash) throw new LoginChallengeError(409, 'El envío está pendiente. Reintentá el envío del correo.');
    if (challenge.codeExpiresAt <= now) throw new LoginChallengeError(401, 'El código venció. Solicitá un nuevo código.');
    const candidate = typeof code === 'string' && /^\d{6}$/.test(code) ? hashCode(challenge, code) : '';
    const filter = {
        _id: id, status: 'pending', generation: challenge.generation, emailSent: true,
        expiresAt: { $gt: new Date() }, codeExpiresAt: { $gt: new Date() }, attempts: { $lt: EMAIL_MAX_ATTEMPTS }
    };
    const verified = candidate ? await LoginChallenge.findOneAndUpdate({ ...filter, codeHash: candidate }, {
        $set: { status: 'email_verified', emailVerifiedAt: new Date() }, $unset: { codeHash: 1 }
    }, { new: true }) : null;
    if (verified) return verified;
    const failed = await LoginChallenge.findOneAndUpdate({ ...filter, codeHash: { $ne: candidate } }, {
        $inc: { attempts: 1 }
    }, { new: true });
    if (!failed) throw invalidChallenge();
    if (failed.attempts >= EMAIL_MAX_ATTEMPTS) throw new LoginChallengeError(429, 'Se agotaron los 5 intentos. Solicitá un nuevo código.', undefined, 0);
    throw new LoginChallengeError(401, `Código incorrecto. Te quedan ${EMAIL_MAX_ATTEMPTS - failed.attempts} intentos.`, undefined, EMAIL_MAX_ATTEMPTS - failed.attempts);
}
export async function loadVerifiedChallenge(challengeId) {
    const challenge = await LoginChallenge.findOne({
        _id: hashChallengeToken(challengeId), status: 'email_verified', expiresAt: { $gt: new Date() }, totpAttempts: { $lt: 5 }
    });
    if (!challenge) throw invalidChallenge();
    await activeUserFor(challenge);
    return challenge;
}
export async function consumeVerifiedChallenge(challengeId) {
    const challenge = await LoginChallenge.findOneAndUpdate({
        _id: hashChallengeToken(challengeId), status: 'email_verified', expiresAt: { $gt: new Date() }, totpAttempts: { $lte: 5 }
    }, { $set: { status: 'completed', completedAt: new Date() } }, { new: true });
    if (!challenge) throw invalidChallenge();
    return challenge;
}
