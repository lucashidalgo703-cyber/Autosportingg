// Arranque común de pruebas de integración: servidor Express real + MongoDB EN MEMORIA (nunca producción).
import crypto from 'node:crypto';
import path from 'node:path';
import { once } from 'node:events';

export async function boot() {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create({
        binary: { downloadDir: path.resolve('node_modules/.cache/mongodb-binaries') },
        instance: { launchTimeout: 60000 }
    });
    process.env.MONGODB_URI = mongod.getUri('autosporting_test');
    process.env.JWT_SECRET = crypto.randomBytes(24).toString('hex');
    process.env.EMAIL_LOGIN_HMAC_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.TWO_FACTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    process.env.NODE_ENV = 'production'; // evita app.listen dentro de server.js

    const { default: mongoose } = await import('mongoose');
    mongoose.set('autoCreate', false);
    const { default: app } = await import('../../server.js');
    const jwt = (await import('jsonwebtoken')).default;
    const { default: connectDB } = await import('../../src/config/db.js');
    const { default: AdminUser } = await import('../../src/models/AdminUser.js');
    const { default: LoginSession } = await import('../../src/models/LoginSession.js');
    const { credentialFingerprint } = await import('../../src/services/emailLoginService.js');
    await connectDB();

    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const ownerId = new mongoose.Types.ObjectId().toString();
    // Fixtures model an already verified login. Production authentication is unchanged.
    // Keep makeToken synchronous for existing callers, and flush durable writes before calls.
    let fixturesReady = Promise.resolve();
    const makeToken = (role = 'owner', customId = null) => {
        const id = String(customId || (role === 'owner' ? ownerId : new mongoose.Types.ObjectId()));
        const sid = crypto.randomBytes(32).toString('base64url');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        fixturesReady = fixturesReady.then(async () => {
            const salt = crypto.randomBytes(16).toString('hex');
            const user = await AdminUser.findOneAndUpdate({ _id: id }, { $setOnInsert: {
                name: `test_${role}`, email: `fixture-${id}@example.test`, role, active: true,
                passwordHash: `${salt}:${crypto.scryptSync(crypto.randomBytes(32), salt, 64).toString('hex')}`,
                permissions: []
            } }, { upsert: true, new: true });
            await LoginSession.create({
                _id: crypto.createHash('sha256').update(sid).digest('hex'), userId: user._id,
                credentialFingerprint: credentialFingerprint(user), expiresAt
            });
        });
        return jwt.sign({ id, userId: id, username: `test_${role}`, role,
            type: 'session', emailVerified: true, sid
        }, process.env.JWT_SECRET, { expiresIn: '24h', algorithm: 'HS256' });
    };
    const token = makeToken('owner', ownerId);
    await fixturesReady;

    const call = async (method, path, body, tk = token, extraHeaders = {}) => {
        await fixturesReady;
        const res = await fetch(base + path, {
            method,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}`, ...extraHeaders },
            body: body ? JSON.stringify(body) : undefined
        });
        const json = await res.json().catch(() => ({}));
        return { status: res.status, json };
    };

    let passed = 0;
    const test = async (name, fn) => {
        try { await fn(); passed++; console.log(`  ok  - ${name}`); }
        catch (e) { console.error(`  FAIL - ${name}\n`, e); process.exitCode = 1; }
    };
    const finish = async () => {
        console.log(`\n${passed} pruebas OK${process.exitCode ? ' (con fallos)' : ''}`);
        server.close();
        await mongoose.disconnect();
        await mongod.stop();
        process.exit(process.exitCode || 0);
    };
    return { call, test, finish, mongoose, makeToken, token, ownerId, base };
}
