// Exercise the real server import and connection defaults without the regular
// fixture harness, which deliberately disables autoCreate before importing it.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
for (const name of ['.env', '.env.local', '.env.development', '.env.development.local', '.env.production', '.env.production.local']) {
    assert.equal(fs.existsSync(path.join(root, name)), false, 'Cold startup tests require a checkout without environment files');
}
const binary = path.join(root, 'node_modules/.cache/mongodb-binaries/mongod-x64-win32-8.2.6.exe');
const mongod = await MongoMemoryReplSet.create({
    binary: { downloadDir: path.dirname(binary), ...(process.platform === 'win32' && fs.existsSync(binary) ? { systemBinary: binary } : {}) },
    instanceOpts: [{ launchTimeout: 60000 }], replSet: { count: 1, storageEngine: 'wiredTiger' }
});
const originalCreateCollection = mongoose.Connection.prototype.createCollection;
const ddlCalls = [];
mongoose.Connection.prototype.createCollection = function(name, ...args) {
    ddlCalls.push(name);
    return originalCreateCollection.call(this, name, ...args);
};
Object.assign(process.env, {
    MONGODB_URI: mongod.getUri('autosporting_cold_start_test'), NODE_ENV: 'production',
    JWT_SECRET: crypto.randomBytes(48).toString('hex'), TWO_FACTOR_ENCRYPTION_KEY: crypto.randomBytes(48).toString('hex'),
    EMAIL_LOGIN_HMAC_SECRET: crypto.randomBytes(48).toString('hex'), SECURITY_ALERT_EMAIL: 'administrator@example.test',
    SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: 'test@example.test',
    SMTP_OAUTH_CLIENT_ID: '', SMTP_OAUTH_CLIENT_SECRET: '', SMTP_OAUTH_REFRESH_TOKEN: '',
    REDIS_URL: '', REDIS_TOKEN: '', MONGODB_DNS_SERVERS: '', VERCEL: '', ENABLE_LOCAL_PROXY: 'false', LOCAL_DECOUPLED_PROXY: 'false',
    CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '',
    WHATSAPP_API_TOKEN: '', WHATSAPP_PHONE_NUMBER_ID: '', WHATSAPP_APP_SECRET: ''
});
assert.match(process.env.MONGODB_URI, /^mongodb:\/\/127\.0\.0\.1:/);
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
    assert.match(String(input?.url || input), /^http:\/\/127\.0\.0\.1:/, 'Only isolated loopback services may be contacted');
    return originalFetch(input, options);
};
try {
    // Compile a model before db.js is evaluated, as the real service import
    // graph can do. The connection configuration must still suppress its DDL.
    mongoose.set('autoCreate', true);
    const { default: Car } = await import('../../src/models/Car.js');
    await import('../../server.js');
    const { default: connectDB } = await import('../../src/config/db.js');
    const { getAdminStock } = await import('../../src/services/inventoryStockService.js');
    const connected = await connectDB();
    assert.equal(connected, await connectDB(), 'Warm calls reuse the established connection');
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    for (const name of ['Car', 'AdminUser', 'LoginSession', 'CapitalMonth', 'VehicleInvoice', 'WorkshopOrder']) {
        assert.ok(mongoose.models[name], 'The real server imported ' + name);
    }
    assert.equal(mongoose.get('autoCreate'), false);
    assert.equal(mongoose.connection.config.autoCreate, false);
    assert.equal(mongoose.connection.getClient().options.connectTimeoutMS, 10000);
    assert.equal(mongoose.connection.getClient().options.waitQueueTimeoutMS, 10000);
    assert.equal(mongoose.connection.getClient().options.serverSelectionTimeoutMS, 15000);
    assert.equal(mongoose.connection.getClient().options.socketTimeoutMS, 45000);
    assert.deepEqual(ddlCalls, [], 'Cold import and connect must not call createCollection for every model');
    const empty = await getAdminStock({ limit: 20 }, { role: 'owner' });
    assert.equal(empty.total, 0);
    assert.deepEqual(await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray(), [], 'Reading empty stock creates no collections');
    console.log(`ok 1 - cold server imports ${Object.keys(mongoose.models).length} models and reads stock with zero collection DDL`);

    await Car.create({ brand: 'Prueba local', name: 'Arranque ficticio', year: 2024, km: 10, fuel: 'Nafta', condition: 'Usado',
        price: 20000000, currency: 'ARS', purchasePrice: 15000000, purchaseCurrency: 'ARS', agencyOwned: true, status: 'Disponible' });
    const result = await getAdminStock({ limit: 20 }, { role: 'owner' });
    assert.equal(result.total, 1);
    assert.equal(result.summary.availableMetrics.ownCost.ARS, 15000000);
    assert.deepEqual(ddlCalls, [], 'An ordinary first insert works without implicit Mongoose collection DDL');
    const created = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
    assert.deepEqual(created.map(row => row.name), ['cars']);
    console.log('ok 2 - first ordinary write creates only its own collection and stock valuation remains intact');

    const PreparedFixture = mongoose.model('ColdStartupPreparedFixture', new mongoose.Schema({ value: Number }), 'cold_startup_prepared_fixtures');
    await PreparedFixture.createCollection();
    assert.deepEqual(ddlCalls, ['cold_startup_prepared_fixtures'], 'Explicit feature preparation remains available');
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => { await PreparedFixture.create([{ value: 42 }], { session }); });
    } finally { await session.endSession(); }
    assert.equal((await PreparedFixture.findOne().lean()).value, 42);
    console.log('ok 3 - explicitly prepared collections still support transactional writes');
    console.log('PASS: cold database startup without implicit DDL, connection reuse and ordinary writes; no production data used.');
} finally {
    globalThis.fetch = originalFetch;
    mongoose.Connection.prototype.createCollection = originalCreateCollection;
    await mongoose.disconnect();
    await mongod.stop();
}
