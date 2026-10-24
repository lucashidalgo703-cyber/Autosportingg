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
    const { default: UserSession } = await import('../../src/models/UserSession.js');
    const { default: TrustedDevice } = await import('../../src/models/TrustedDevice.js');
    const { default: AdminUser } = await import('../../src/models/AdminUser.js');
    await connectDB();

    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}`;
    const ownerId = new mongoose.Types.ObjectId().toString();
    const adminUserId = new mongoose.Types.ObjectId().toString();
    const vendedorUserId = new mongoose.Types.ObjectId().toString();

    // Crear dispositivo confiable y sesión revocable válida para pruebas de integración
    const harnessDeviceId = 'harness-device-' + crypto.randomUUID();
    await TrustedDevice.create({
        deviceId: harnessDeviceId,
        deviceName: 'PC Agencia',
        status: 'trusted',
        registeredBy: { userId: ownerId, name: 'test_owner' }
    });

    const harnessSessionId = 'harness-session-' + crypto.randomUUID();
    await UserSession.create({
        sessionId: harnessSessionId,
        userId: ownerId,
        userName: 'test_owner',
        deviceId: harnessDeviceId,
        deviceName: 'PC Agencia',
        deviceStatus: 'trusted',
        status: 'active',
        expiresAt: new Date(Date.now() + 86400000)
    });

    // Crear usuarios en MongoDB para verificar la barrera estricta de base de datos
    await AdminUser.create([
        { _id: new mongoose.Types.ObjectId(ownerId), name: 'test_owner', email: 'owner@autosporting.test', passwordHash: 'dummy_hash', role: 'owner', active: true, status: 'activo' },
        { _id: new mongoose.Types.ObjectId(adminUserId), name: 'test_admin', email: 'admin@autosporting.test', passwordHash: 'dummy_hash', role: 'admin', active: true, status: 'activo' },
        { _id: new mongoose.Types.ObjectId(vendedorUserId), name: 'test_vendedor', email: 'vendedor@autosporting.test', passwordHash: 'dummy_hash', role: 'ventas', active: true, status: 'activo' }
    ]);

    const makeToken = (role = 'owner', customId = null) => {
        let uId = customId;
        if (!uId) {
            if (role === 'owner') uId = ownerId;
            else if (role === 'admin') uId = adminUserId;
            else if (role === 'vendedor' || role === 'ventas') uId = vendedorUserId;
            else uId = new mongoose.Types.ObjectId().toString();
        }
        return jwt.sign({
            id: uId,
            userId: uId,
            username: `test_${role}`,
            role,
            sessionId: harnessSessionId,
            deviceId: harnessDeviceId,
            deviceStatus: 'trusted'
        }, process.env.JWT_SECRET);
    };

    const token = makeToken('owner', ownerId);

    const call = async (method, path, body, tk = token, extraHeaders = {}) => {
        const headers = { 'Content-Type': 'application/json', 'X-Device-Id': harnessDeviceId, ...extraHeaders };
        if (tk !== null && tk !== undefined) {
            headers.Authorization = `Bearer ${tk}`;
        }
        const res = await fetch(base + path, {
            method,
            headers,
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
