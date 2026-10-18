// Arranque común de pruebas de integración: servidor Express real + MongoDB EN MEMORIA (nunca producción).
import crypto from 'node:crypto';

export async function boot() {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri('autosporting_test');
    process.env.JWT_SECRET = crypto.randomBytes(24).toString('hex');
    process.env.NODE_ENV = 'production'; // evita app.listen dentro de server.js

    const { default: app } = await import('../../server.js');
    const { default: mongoose } = await import('mongoose');
    const jwt = (await import('jsonwebtoken')).default;
    const { default: connectDB } = await import('../../src/config/db.js');
    await connectDB();

    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}`;
    const ownerId = new mongoose.Types.ObjectId().toString();
    const makeToken = (role = 'owner', customId = null) => jwt.sign({ id: customId || (role === 'owner' ? ownerId : new mongoose.Types.ObjectId().toString()), username: `test_${role}`, role }, process.env.JWT_SECRET);
    const token = makeToken('owner', ownerId);

    const call = async (method, path, body, tk = token, extraHeaders = {}) => {
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
