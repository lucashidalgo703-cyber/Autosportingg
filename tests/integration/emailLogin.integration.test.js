// Isolated end-to-end authentication: a disposable MongoDB and a loopback SMTP server.
// Never loads production credentials or delivers mail outside this process.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import net from 'node:net';
import path from 'node:path';
import { once } from 'node:events';
import { MongoMemoryServer } from 'mongodb-memory-server';

const smtpMessages = [];
const sockets = new Set();
let rejectDelivery = false;
const smtp = net.createServer(socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.setEncoding('utf8');
    socket.write('220 localhost AutoSporting test SMTP\r\n');
    let buffer = '';
    let inData = false;
    let message = '';
    let recipients = [];
    let loginStep = 0;
    socket.on('data', chunk => {
        buffer += chunk;
        while (buffer.includes('\r\n')) {
            const end = buffer.indexOf('\r\n');
            const line = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            if (inData) {
                if (line === '.') {
                    inData = false;
                    smtpMessages.push({ raw: message, recipients });
                    message = '';
                    socket.write('250 queued locally\r\n');
                } else message += `${line.replace(/^\.\./, '.')}\r\n`;
                continue;
            }
            if (loginStep) {
                loginStep--;
                socket.write(loginStep ? '334 UGFzc3dvcmQ6\r\n' : '235 authenticated\r\n');
            } else if (/^(EHLO|HELO) /i.test(line)) socket.write('250-localhost\r\n250 AUTH PLAIN LOGIN\r\n');
            else if (/^AUTH LOGIN/i.test(line)) { loginStep = 2; socket.write('334 VXNlcm5hbWU6\r\n'); }
            else if (/^AUTH PLAIN/i.test(line)) socket.write('235 authenticated\r\n');
            else if (/^MAIL FROM:/i.test(line)) { recipients = []; socket.write('250 sender accepted\r\n'); }
            else if (/^RCPT TO:/i.test(line)) {
                recipients.push(line.slice(8).replace(/[<>]/g, '').trim());
                socket.write(rejectDelivery ? '550 simulated delivery failure\r\n' : '250 recipient accepted\r\n');
            } else if (/^DATA$/i.test(line)) { inData = true; socket.write('354 end with dot\r\n'); }
            else if (/^QUIT$/i.test(line)) socket.end('221 bye\r\n');
            else socket.write('250 ok\r\n');
        }
    });
});

// Decode the actual SMTP MIME parts, including multipart/alternative and folded headers.
function decodedMessage(raw) {
    const splitPart = value => {
        const split = value.indexOf('\r\n\r\n');
        assert.ok(split >= 0, 'El mensaje MIME debe contener cabeceras y cuerpo');
        return { headers: value.slice(0, split).replace(/\r\n[ \t]+/g, ' '), body: value.slice(split + 4) };
    };
    const decodeBody = ({ headers, body }) => {
        if (/^Content-Transfer-Encoding: base64/im.test(headers)) return Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8');
        if (/^Content-Transfer-Encoding: quoted-printable/im.test(headers)) {
            return Buffer.from(body.replace(/=\r\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))), 'latin1').toString('utf8');
        }
        return body;
    };
    const leaves = [];
    const parsePart = value => {
        const part = splitPart(value);
        const contentType = part.headers.match(/^Content-Type:\s*([^\r\n]+)/im)?.[1] || 'text/plain';
        if (/^multipart\//i.test(contentType)) {
            const boundary = contentType.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
            assert.ok(boundary, 'El mensaje multipart debe declarar su separador');
            for (const child of part.body.split('--' + (boundary[1] || boundary[2])).slice(1)) {
                if (child.startsWith('--')) break;
                parsePart(child.replace(/^\r\n/, '').replace(/\r\n$/, ''));
            }
        } else leaves.push({ type: contentType.split(';')[0].trim().toLowerCase(), body: decodeBody(part) });
        return contentType;
    };
    const { headers } = splitPart(raw);
    const subject = (headers.match(/^Subject: (.*)$/mi)?.[1] || '').replace(/(\?=)\s+(=\?)/g, '$1$2').replace(/=\?UTF-8\?([BQ])\?([^?]*)\?=/gi, (_, encoding, data) => (
        encoding.toUpperCase() === 'B' ? Buffer.from(data, 'base64').toString('utf8') : Buffer.from(data.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (m, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8')
    ));
    const contentType = parsePart(raw);
    const html = leaves.find(part => part.type === 'text/html')?.body || '';
    const text = leaves.find(part => part.type === 'text/plain')?.body || '';
    return { subject, body: html || text, html, text, contentType };
}

const seenCodes = new Set();
function readCode(mail) {
    assert.ok(mail, 'El SMTP local debe haber recibido el mensaje');
    const { body } = decodedMessage(mail.raw);
    const match = body.match(/>\s*(\d{6})\s*</);
    assert.ok(match, 'El mensaje debe incluir un código de seis dígitos visible');
    seenCodes.add(match[1]);
    return match[1];
}
const wrongCode = code => code === '000000' ? '111111' : '000000';
const password = 'Ficticia-Local-2026!';
function passwordHash() {
    const salt = crypto.randomBytes(16).toString('hex');
    return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}
let mongod;
let httpServer;
let mongoose;
let passed = 0;
let failed = 0;

try {
    smtp.listen(0, '127.0.0.1');
    await once(smtp, 'listening');
    mongod = await MongoMemoryServer.create({
        binary: { downloadDir: path.resolve('node_modules/.cache/mongodb-binaries') },
        instance: { launchTimeout: 60000 }
    });
    Object.assign(process.env, {
        MONGODB_URI: mongod.getUri('autosporting_email_login_test'),
        JWT_SECRET: crypto.randomBytes(48).toString('hex'),
        EMAIL_LOGIN_HMAC_SECRET: crypto.randomBytes(48).toString('hex'),
        TWO_FACTOR_ENCRYPTION_KEY: crypto.randomBytes(48).toString('hex'),
        NODE_ENV: 'production', // Prevent the module from starting a second HTTP listener.
        SECURITY_ALERT_EMAIL: 'administrador@example.test',
        SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.address().port),
        SMTP_USER: 'smtp-local@example.test', SMTP_PASS: 'local-smtp-only',
        SMTP_FROM: 'AutoSporting prueba <smtp-local@example.test>'
    });
    for (const key of ['SMTP_OAUTH_CLIENT_ID', 'SMTP_OAUTH_CLIENT_SECRET', 'SMTP_OAUTH_REFRESH_TOKEN', 'REDIS_URL', 'REDIS_TOKEN']) delete process.env[key];
    mongoose = (await import('mongoose')).default;
    mongoose.set('autoCreate', false);
    const { default: app } = await import('../../server.js');
    const jwt = (await import('jsonwebtoken')).default;
    const { default: connectDB } = await import('../../src/config/db.js');
    const { default: AdminUser } = await import('../../src/models/AdminUser.js');
    const { default: LoginChallenge } = await import('../../src/models/LoginChallenge.js');
    const { default: LoginEmailRateLimit } = await import('../../src/models/LoginEmailRateLimit.js');
    const { default: LoginSession } = await import('../../src/models/LoginSession.js');
    const { hashChallengeToken } = await import('../../src/services/emailLoginService.js');
    await connectDB();
    const users = await AdminUser.create([
        { name: 'Vendedora Ficticia A', email: 'vendedora-a@example.test', passwordHash: passwordHash(), role: 'ventas' },
        { name: 'Vendedor Ficticio B', email: 'vendedor-b@example.test', passwordHash: passwordHash(), role: 'ventas' },
        { name: 'Administrador Ficticio', email: 'admin@example.test', passwordHash: passwordHash(), role: 'admin' }
    ]);
    httpServer = app.listen(0, '127.0.0.1');
    await once(httpServer, 'listening');
    const base = `http://127.0.0.1:${httpServer.address().port}`;
    async function call(path, body, token, method = 'POST') {
        const response = await fetch(base + path, {
            method,
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            ...(body === undefined ? {} : { body: JSON.stringify(body) })
        });
        return { status: response.status, json: await response.json().catch(() => ({})) };
    }
    const login = (user = users[0]) => call('/api/login', { email: user.email, password });
    const verify = (challenge, code) => call('/api/login/email/verify', { challengeId: challenge.json.challengeId, code });
    const makeResendReady = challenge => LoginChallenge.updateOne({ _id: hashChallengeToken(challenge.json.challengeId) }, { $set: { resendAvailableAt: new Date(Date.now() - 1000) } });
    async function test(name, fn) {
        try {
            rejectDelivery = false;
            await LoginEmailRateLimit.deleteMany({});
            await LoginChallenge.deleteMany({});
            smtpMessages.length = 0;
            await fn();
            passed++;
            console.log(`ok - ${name}`);
        } catch (error) {
            failed++;
            // Report only the test name and assertion message: never dump a response or OTP.
            console.error(`FAIL - ${name}: ${error.message}`);
        }
    }

    await test('Credenciales incorrectas no producen correos ni sesión', async () => {
        const response = await call('/api/login', { email: users[0].email, password: 'incorrecta' });
        assert.equal(response.status, 401);
        assert.equal(smtpMessages.length, 0);
        assert.ok(!response.json.token);
    });

    await test('Todas las cuentas, incluido administrador, quedan pendientes; correo único solo al administrador', async () => {
        for (const user of users) {
            const response = await login(user);
            assert.equal(response.status, 200);
            assert.equal(response.json.requireEmailVerification, true);
            assert.equal(response.json.emailSent, true);
            assert.ok(!response.json.token);
            const mail = smtpMessages.at(-1);
            assert.deepEqual(mail.recipients, ['administrador@example.test']);
            const { html, text, subject, contentType } = decodedMessage(mail.raw);
            assert.equal(subject, `AutoSporting | Solicitud de ingreso de ${user.name}`);
            assert.ok(/^multipart\/alternative(?:;|$)/i.test(contentType), 'Debe enviar un solo correo con alternativas HTML y texto');
            for (const version of [html, text]) {
                assert.ok(version.includes(user.name) && version.includes(user.email), 'Cada versión debe identificar la cuenta solicitante');
                assert.ok(/ingreso al CRM todavía está pendiente/i.test(version.replace(/<[^>]+>/g, '')), 'Cada versión debe aclarar que el acceso sigue pendiente');
                assert.ok(/Windows/i.test(version) && /Chrome/i.test(version), 'Cada versión debe mostrar navegador y sistema');
                assert.ok(/Fecha y hora argentina/i.test(version), 'Cada versión debe indicar hora argentina');
                assert.ok(/5 minutos/i.test(version) && /5 intentos/i.test(version), 'Cada versión debe explicar vencimiento e intentos');
            }
            const htmlCode = readCode(mail);
            const textCode = text.match(/^([0-9]{6})$/m)?.[1];
            assert.ok(textCode === htmlCode, 'HTML y texto deben contener el mismo código sin exponerlo en la prueba');
        }
        assert.equal(smtpMessages.length, 3);
    });

    await test('Dos vendedores simultáneos tienen desafíos aislados por cuenta e intento', async () => {
        const [a, b] = await Promise.all([login(users[0]), login(users[1])]);
        assert.ok(a.json.challengeId && b.json.challengeId && a.json.challengeId !== b.json.challengeId);
        const mailA = smtpMessages.find(mail => decodedMessage(mail.raw).body.includes(users[0].email));
        const mailB = smtpMessages.find(mail => decodedMessage(mail.raw).body.includes(users[1].email));
        const codeA = readCode(mailA);
        const codeB = readCode(mailB);
        // A random six-digit collision is possible; isolation is still tied to the request hash.
        if (codeA !== codeB) {
            assert.equal((await verify(a, codeB)).status, 401);
            assert.equal((await verify(b, codeA)).status, 401);
        }
        assert.equal((await verify(a, codeA)).status, 200);
        assert.equal((await verify(b, codeB)).status, 200);
    });

    await test('Desafío pendiente y tokens anteriores no acceden directamente a APIs protegidas', async () => {
        const pending = await login();
        const oldSession = jwt.sign({ id: String(users[0]._id), role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const oldTotp = jwt.sign({ type: '2fa_challenge', challengeUserId: String(users[0]._id) }, process.env.JWT_SECRET, { expiresIn: '5m' });
        for (const path of ['/api/admin/auth/me', '/api/admin/cars']) {
            for (const token of [undefined, pending.json.challengeId, oldSession, oldTotp]) {
                const response = await call(path, undefined, token, 'GET');
                assert.ok([401, 403].includes(response.status), 'La API debe rechazar toda identidad sin verificación');
            }
        }
        assert.ok([401, 403].includes((await call('/api/admin/jobs/daily-summary', {}, oldSession)).status));
        assert.ok(!(await call('/api/login/2fa', { challengeId: pending.json.challengeId, code: '123456' })).json.token);
    });

    await test('Quinto error bloquea el código, incluso si luego se conoce el correcto', async () => {
        const pending = await login();
        const correct = readCode(smtpMessages.at(-1));
        for (let i = 0; i < 5; i++) {
            const response = await verify(pending, wrongCode(correct));
            assert.ok([401, 429].includes(response.status));
        }
        const response = await verify(pending, correct);
        assert.ok([401, 429].includes(response.status));
        assert.ok(!response.json.token);
    });

    await test('Código vencido no habilita sesión', async () => {
        const pending = await login();
        const code = readCode(smtpMessages.at(-1));
        await LoginChallenge.updateOne({ _id: hashChallengeToken(pending.json.challengeId) }, { $set: { codeExpiresAt: new Date(Date.now() - 1000) } });
        assert.equal((await verify(pending, code)).status, 401);
    });

    await test('Errores simultáneos no permiten superar cinco intentos', async () => {
        const pending = await login();
        const code = readCode(smtpMessages.at(-1));
        const responses = await Promise.all(Array.from({ length: 12 }, () => verify(pending, wrongCode(code))));
        assert.ok(responses.every(response => [401, 429].includes(response.status)));
        const stored = await LoginChallenge.findById(hashChallengeToken(pending.json.challengeId)).lean();
        assert.equal(stored.attempts, 5);
        assert.ok(!(await verify(pending, code)).json.token);
    });

    await test('Código de un uso: dos verificaciones concurrentes emiten una sola sesión', async () => {
        const pending = await login();
        const code = readCode(smtpMessages.at(-1));
        const responses = await Promise.all([verify(pending, code), verify(pending, code)]);
        assert.equal(responses.filter(response => response.status === 200 && response.json.token).length, 1);
        assert.ok(!(await verify(pending, code)).json.token);
        const stored = await LoginChallenge.findById(hashChallengeToken(pending.json.challengeId)).lean();
        assert.ok(!stored.codeHash, 'Debe borrar el digest del código consumido');
        assert.ok(!JSON.stringify(stored).includes(`"${code}"`), 'La base nunca debe persistir el código en claro');
    });

    await test('Reenvío espera 60s, invalida anterior y tiene límite por cuenta entre solicitudes', async () => {
        const pending = await login();
        const oldCode = readCode(smtpMessages.at(-1));
        let response = await call('/api/login/email/resend', { challengeId: pending.json.challengeId });
        assert.equal(response.status, 429);
        assert.equal(smtpMessages.length, 1);
        await makeResendReady(pending);
        response = await call('/api/login/email/resend', { challengeId: pending.json.challengeId });
        assert.equal(response.status, 200);
        const freshCode = readCode(smtpMessages.at(-1));
        if (freshCode !== oldCode) assert.equal((await verify(pending, oldCode)).status, 401);
        // Five dispatch attempts per account / fifteen minutes, including initial requests.
        for (let i = 0; i < 3; i++) assert.equal((await login()).status, 200);
        await makeResendReady(pending);
        response = await call('/api/login/email/resend', { challengeId: pending.json.challengeId });
        assert.equal(response.status, 429);
        assert.equal(smtpMessages.length, 5);
        assert.equal((await login()).status, 429);
    });

    await test('Falla SMTP mantiene pendiente y permite reintentar después del cooldown', async () => {
        rejectDelivery = true;
        const pending = await login();
        assert.equal(pending.status, 200);
        assert.equal(pending.json.requireEmailVerification, true);
        assert.equal(pending.json.emailSent, false);
        assert.ok(!pending.json.token);
        assert.equal(smtpMessages.length, 0);
        const stored = await LoginChallenge.findById(hashChallengeToken(pending.json.challengeId)).lean();
        assert.ok(!stored.codeHash);
        rejectDelivery = false;
        await makeResendReady(pending);
        const response = await call('/api/login/email/resend', { challengeId: pending.json.challengeId });
        assert.equal(response.status, 200);
        assert.equal(response.json.emailSent, true);
        assert.equal((await verify(pending, readCode(smtpMessages.at(-1)))).status, 200);
    });

    await test('Reenvío fallido también invalida el código anterior y reenvíos simultáneos envían una vez', async () => {
        const pending = await login();
        const code = readCode(smtpMessages.at(-1));
        await makeResendReady(pending);
        rejectDelivery = true;
        const failedSend = await call('/api/login/email/resend', { challengeId: pending.json.challengeId });
        assert.equal(failedSend.json.emailSent, false);
        assert.ok(!(await verify(pending, code)).json.token);
        rejectDelivery = false;
        await makeResendReady(pending);
        const responses = await Promise.all(Array.from({ length: 4 }, () => call('/api/login/email/resend', { challengeId: pending.json.challengeId })));
        assert.equal(responses.filter(response => response.status === 200 && response.json.emailSent).length, 1);
        assert.equal(smtpMessages.length, 2);
        assert.equal((await verify(pending, readCode(smtpMessages.at(-1)))).status, 200);
    });

    await test('Solicitudes paralelas de una misma cuenta respetan el límite total de envíos', async () => {
        const responses = await Promise.all(Array.from({ length: 10 }, () => login()));
        assert.equal(responses.filter(response => response.status === 200 && response.json.emailSent).length, 5);
        assert.equal(responses.filter(response => response.status === 429).length, 5);
        assert.equal(smtpMessages.length, 5);
    });

    await test('Mismo navegador: sesión activa sobrevive recargas; logout revoca y próximo login pide código', async () => {
        const first = await login();
        const verified = await verify(first, readCode(smtpMessages.at(-1)));
        const token = verified.json.token;
        assert.ok(token);
        const payload = jwt.decode(token);
        assert.equal(payload.type, 'session');
        assert.equal(payload.emailVerified, true);
        for (let i = 0; i < 2; i++) assert.equal((await call('/api/admin/auth/me', undefined, token, 'GET')).status, 200);
        assert.ok([200, 204].includes((await call('/api/logout', {}, token)).status));
        assert.ok([401, 403].includes((await call('/api/admin/auth/me', undefined, token, 'GET')).status));
        const second = await login();
        assert.equal(second.json.requireEmailVerification, true);
        assert.ok(!second.json.token && second.json.challengeId !== first.json.challengeId);
        assert.ok(!(await verify(second, readCode(smtpMessages[0]))).json.token);
    });

    await test('Configuración ausente o varios destinatarios jamás omiten la verificación', async () => {
        const address = process.env.SECURITY_ALERT_EMAIL;
        for (const value of ['', 'uno@example.test,dos@example.test']) {
            process.env.SECURITY_ALERT_EMAIL = value;
            const response = await login();
            assert.ok(!response.json.token);
            assert.equal(smtpMessages.length, 0);
            if (response.status === 200) assert.equal(response.json.emailSent, false);
        }
        process.env.SECURITY_ALERT_EMAIL = address;
    });

    await test('Sesión vencida se rechaza y el siguiente ingreso exige otro código', async () => {
        const pending = await login();
        const verified = await verify(pending, readCode(smtpMessages.at(-1)));
        assert.ok(verified.json.token);
        const payload = jwt.decode(verified.json.token);
        await LoginSession.updateMany({ userId: users[0]._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
        assert.ok([401, 403].includes((await call('/api/admin/auth/me', undefined, verified.json.token, 'GET')).status));
        const signedExpired = jwt.sign({ ...payload, exp: Math.floor(Date.now() / 1000) - 1 }, process.env.JWT_SECRET);
        assert.ok([401, 403].includes((await call('/api/admin/auth/me', undefined, signedExpired, 'GET')).status));
        assert.equal((await login()).json.requireEmailVerification, true);
    });

    await test('Cambiar contraseña o desactivar usuario invalida solicitudes pendientes y sesiones', async () => {
        const oldHash = users[0].passwordHash;
        const pending = await login();
        const code = readCode(smtpMessages.at(-1));
        await AdminUser.updateOne({ _id: users[0]._id }, { $set: { passwordHash: passwordHash() } });
        assert.ok(!(await verify(pending, code)).json.token);
        await AdminUser.updateOne({ _id: users[0]._id }, { $set: { passwordHash: oldHash } });
        const next = await login();
        const verified = await verify(next, readCode(smtpMessages.at(-1)));
        assert.ok(verified.json.token);
        await AdminUser.updateOne({ _id: users[0]._id }, { $set: { active: false } });
        assert.ok([401, 403].includes((await call('/api/admin/auth/me', undefined, verified.json.token, 'GET')).status));
        assert.equal((await login()).status, 401);
        await AdminUser.updateOne({ _id: users[0]._id }, { $set: { active: true } });
    });

    await test('TOTP opcional se conserva después del correo y no permite omitirlo', async () => {
        const speakeasy = (await import('speakeasy')).default;
        const secret = speakeasy.generateSecret().base32;
        const iv = crypto.randomBytes(12);
        const key = crypto.createHash('sha256').update(process.env.TWO_FACTOR_ENCRYPTION_KEY || process.env.JWT_SECRET).digest();
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
        const encryptedSecret = `${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
        const recoveryCode = 'recuperacion-ficticia-un-solo-uso';
        await AdminUser.updateOne({ _id: users[2]._id }, { $set: {
            twoFactorEnabled: true, twoFactorSecret: encryptedSecret,
            recoveryCodes: [crypto.createHash('sha256').update(recoveryCode).digest('hex')]
        } });
        try {
            const pending = await login(users[2]);
            const totp = () => speakeasy.totp({ secret, encoding: 'base32' });
            const early = await call('/api/login/2fa', { challengeId: pending.json.challengeId, code: totp() });
            assert.equal(early.status, 401);
            assert.ok(!early.json.token);
            const emailVerified = await verify(pending, readCode(smtpMessages.at(-1)));
            assert.equal(emailVerified.status, 200);
            assert.equal(emailVerified.json.require2FA, true);
            assert.ok(!emailVerified.json.token);
            // The fifth allowed TOTP attempt must still be able to succeed.
            for (let i = 0; i < 4; i++) {
                const bad = await call('/api/login/2fa', { challengeId: pending.json.challengeId, code: 'invalid' });
                assert.equal(bad.status, 401);
            }
            const final = await call('/api/login/2fa', { challengeId: pending.json.challengeId, code: totp() });
            assert.equal(final.status, 200);
            assert.ok(final.json.token);
            assert.ok(!(await call('/api/login/2fa', { challengeId: pending.json.challengeId, code: totp() })).json.token);
            const recoveryPending = await login(users[2]);
            assert.equal((await verify(recoveryPending, readCode(smtpMessages.at(-1)))).json.require2FA, true);
            assert.ok((await call('/api/login/2fa', { challengeId: recoveryPending.json.challengeId, recoveryCode })).json.token);
            const reused = await login(users[2]);
            await verify(reused, readCode(smtpMessages.at(-1)));
            assert.equal((await call('/api/login/2fa', { challengeId: reused.json.challengeId, recoveryCode })).status, 401);
        } finally {
            await AdminUser.updateOne({ _id: users[2]._id }, { $set: { twoFactorEnabled: false, twoFactorSecret: null, recoveryCodes: [] } });
        }
    });

    console.log(`${passed} pruebas de autenticación por correo aprobadas; ${failed} fallidas. Correo y base fueron locales.`);
    if (failed) process.exitCode = 1;
} finally {
    if (httpServer) await new Promise(resolve => { httpServer.close(resolve); httpServer.closeAllConnections(); });
    if (mongoose) await mongoose.disconnect();
    if (mongod) await mongod.stop();
    for (const socket of sockets) socket.destroy();
    await new Promise(resolve => smtp.close(resolve));
}
