import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { once } from 'node:events';
import { before, beforeEach, after, describe, test } from 'node:test';
import { carFixture, clientFixture, accountFixture } from '../fixtures/saleDraftFixtures.js';
const database = `qa_registry_refund_${crypto.randomBytes(6).toString('hex')}`;
let repl, mongoose, models, server, base, jwt, fixture, ownerAuth;
const nativeFetch = globalThis.fetch, external = [];
const id = value => String(value?._id ?? value);
const token = (role = 'owner', permissions) => jwt.sign({ id: new mongoose.Types.ObjectId().toString(), username: `qa_${role}`, role, ...(permissions ? { permissions } : {}) }, process.env.JWT_SECRET);
async function call(method, path, body, auth = ownerAuth) {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json().catch(() => null) };
}
const declaration = () => ({ amount: 1200, currency: 'ARS', date: '2026-11-10', notes: 'Reintegro informado en prueba', idempotencyKey: crypto.randomUUID() });
const create = body => call('POST', `/api/admin/gestoria/${fixture.source._id}/registry-refunds`, body || declaration());
const ledger = async () => ({ accounts: JSON.stringify(await models.Account.find().sort({ _id: 1 }).lean()), transactions: JSON.stringify(await models.Transaction.find().sort({ _id: 1 }).lean()) });
describe('Reintegros del Registro desde Gestoría a Finanzas', { concurrency: false }, () => {
    before(async () => {
        const { MongoMemoryReplSet } = await import('mongodb-memory-server');
        repl = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1', spawn: { windowsHide: true }, args: ['--wiredTigerCacheSizeGB', '0.25', '--oplogSize', '16'] } });
        process.env.MONGODB_URI = repl.getUri(database); process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex'); process.env.NODE_ENV = 'production'; process.env.ENABLE_DAILY_SUMMARY_SCHEDULER = 'false';
        for (const key of ['REDIS_URL', 'REDIS_TOKEN', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) process.env[key] = '';
        globalThis.fetch = (input, options) => { const url = new URL(typeof input === 'string' ? input : input.url); if (url.hostname !== '127.0.0.1') { external.push(url.hostname); throw Error('QA blocks external requests'); } return nativeFetch(input, options); };
        mongoose = (await import('mongoose')).default; mongoose.set('autoCreate', false);
        const app = (await import('../../server.js')).default; jwt = (await import('jsonwebtoken')).default;
        models = Object.fromEntries(await Promise.all(['RegistryRefund', 'Gestoria', 'Sale', 'Car', 'Client', 'Account', 'Transaction', 'AuditLog'].map(async name => [name, (await import(`../../src/models/${name}.js`)).default])));
        await (await import('../../src/config/db.js')).default(); assert.equal(mongoose.connection.name, database); assert.equal(mongoose.connection.host, '127.0.0.1');
        await Promise.all(Object.values(models).map(Model => Model.createCollection()));
        await models.RegistryRefund.createIndexes();
        server = app.listen({ port: 0, host: '127.0.0.1' }); await once(server, 'listening'); base = `http://127.0.0.1:${server.address().port}`;
    }, { timeout: 180000 });
    beforeEach(async () => {
        ownerAuth = token();
        await Promise.all(Object.values(models).map(Model => Model.deleteMany({})));
        const [car, client, ars, usd] = await Promise.all([models.Car.create(carFixture()), models.Client.create(clientFixture()), models.Account.create(accountFixture()), models.Account.create(accountFixture({ name: 'USD', currency: 'USD', balance: 50 }))]);
        const sale = await models.Sale.create({ vehicleId: car._id, clientId: client._id, status: 'entregada', salePrice: 1000, saleCurrency: 'USD' });
        const source = await models.Gestoria.create({ title: 'Transferencia QA', type: 'Transferencia Egreso', status: 'Finalizado', saleId: sale._id, gestorName: 'Gestor demo' });
        fixture = { car, client, sale, source, ars, usd };
    });
    after(async () => { globalThis.fetch = nativeFetch; if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } if (mongoose) await mongoose.disconnect(); if (repl) await repl.stop(); assert.deepEqual(external, []); });

    test('roles y validación de origen impiden alta desde Finanzas o trámites sin finalizar sin efectos', async () => {
        const baseline = await ledger(); const path = `/api/admin/gestoria/${fixture.source._id}/registry-refunds`;
        assert.equal((await call('POST', path, declaration(), null)).status, 401);
        assert.equal((await call('POST', path, declaration(), token('solo_lectura', ['gestoria.read']))).status, 403);
        assert.ok((await call('POST', '/api/admin/finance/registry-refunds', declaration())).status >= 400);
        await models.Gestoria.updateOne({ _id: fixture.source._id }, { $set: { status: 'Pendiente' } }); assert.equal((await create()).status, 409);
        for (const body of [{ amount: -1 }, { currency: 'EUR' }, { date: '2026-02-30' }, { amount: {} }]) assert.equal((await create({ ...declaration(), ...body })).status, 400);
        assert.equal(await models.RegistryRefund.countDocuments(), 0); assert.deepEqual(await ledger(), baseline);
    });
    test('alta conserva origen exacto, audita y reintento concurrente no duplica ni toca caja', async () => {
        const baseline = await ledger(); const payload = declaration(); const results = await Promise.all([create(payload), create(payload)]);
        assert.deepEqual(results.map(row => row.status).sort(), [200, 201]); assert.equal(await models.RegistryRefund.countDocuments(), 1);
        const row = results[0].body.item; assert.equal(row.status, 'por_confirmar'); assert.equal(row.saleId, id(fixture.sale)); assert.equal(row.vehicleId, id(fixture.car)); assert.equal(row.clientId, id(fixture.client)); assert.equal(row.vehiclePlate, fixture.car.plateOrVin); assert.equal(row.clientName, fixture.client.fullName); assert.equal('payloadHash' in row, false);
        assert.equal((await create({ ...payload, amount: 1 })).status, 409); assert.deepEqual(await ledger(), baseline);
        assert.equal((await models.Gestoria.findById(fixture.source._id)).auditLog.at(-1).action, 'REINTEGRO_REGISTRO_DECLARADO');
    });
    test('acreditación requiere cuenta activa misma moneda y genera un solo ingreso sin saldo comprador', async () => {
        const row = (await create()).body.item; const path = `/api/admin/finance/registry-refunds/${row._id}`;
        assert.equal((await call('PATCH', path, { status: 'acreditada', accountId: id(fixture.ars), reason: 'Confirmado' }, token('solo_lectura', ['finanzas.read', 'finanzas.write']))).status, 403);
        assert.equal((await call('PATCH', path, { status: 'acreditada', accountId: id(fixture.usd), reason: 'Confirmado' })).status, 400);
        await models.Account.updateOne({ _id: fixture.ars._id }, { $set: { isActive: false } }); assert.equal((await call('PATCH', path, { status: 'acreditada', accountId: id(fixture.ars), reason: 'Confirmado' })).status, 400); await models.Account.updateOne({ _id: fixture.ars._id }, { $set: { isActive: true } });
        const body = { status: 'acreditada', accountId: id(fixture.ars), reason: 'Registro acreditó el arancel' }; const results = await Promise.all([call('PATCH', path, body), call('PATCH', path, body)]); assert.ok(results.every(result => result.status === 200), JSON.stringify(results));
        assert.equal((await models.Account.findById(fixture.ars._id)).balance, 2200); assert.equal(await models.Transaction.countDocuments(), 1);
        const tx = await models.Transaction.findOne(); assert.equal(tx.type, 'Ingreso'); assert.equal(id(tx.registryRefundId), row._id); assert.equal(tx.saleId, undefined); assert.equal(tx.vehicleId, undefined);
        assert.equal((await call('GET', `/api/admin/sales/${fixture.sale._id}`)).body.finance.netoCobrado, 0);
        assert.equal((await call('PATCH', path, { status: 'devuelta_cliente', reason: 'Cambiar destino' })).status, 409);
    });
    test('devolución directa al cliente es declaración auditada sin caja ni segundo cambio de estado', async () => {
        const row = (await create()).body.item; const baseline = await ledger(); const path = `/api/admin/finance/registry-refunds/${row._id}`;
        assert.equal((await call('PATCH', path, { status: 'devuelta_cliente', reason: '' })).status, 400);
        const result = await call('PATCH', path, { status: 'devuelta_cliente', reason: 'El Registro reintegró al cliente' }, token('solo_lectura', ['finanzas.read', 'finanzas.write'])); assert.equal(result.status, 200, JSON.stringify(result.body)); assert.equal(result.body.item.status, 'devuelta_cliente'); assert.equal(result.body.item.transactionId, undefined); assert.ok(result.body.item.resolvedAt);
        assert.deepEqual(await ledger(), baseline); assert.match(result.body.item.auditLog.at(-1).details, /Sin paso por caja/);
    });
    test('fallo después de actualizar caja revierte reintegro, cuenta y transacción', async () => {
        const row = (await create()).body.item; const baseline = await ledger(); const original = models.AuditLog.create; models.AuditLog.create = () => { throw Error('QA rollback registry'); };
        try { assert.equal((await call('PATCH', `/api/admin/finance/registry-refunds/${row._id}`, { status: 'acreditada', accountId: id(fixture.ars), reason: 'Confirmado' })).status, 500); } finally { models.AuditLog.create = original; }
        assert.deepEqual(await ledger(), baseline); assert.equal((await models.RegistryRefund.findById(row._id)).status, 'por_confirmar');
    });
    test('listado global resume por estado y moneda, busca literal y respeta lectura', async () => {
        await create(); await create({ ...declaration(), amount: 20, currency: 'USD' });
        assert.equal((await call('GET', '/api/admin/finance/registry-refunds', undefined, token('solo_lectura', ['gestoria.read']))).status, 403);
        const result = await call('GET', '/api/admin/finance/registry-refunds?search=Gestor&limit=1'); assert.equal(result.status, 200); assert.equal(result.body.items.length, 1); assert.equal(result.body.total, 2); assert.equal(result.body.summary.por_confirmar.ARS, 1200); assert.equal(result.body.summary.por_confirmar.USD, 20);
        assert.equal((await call('GET', '/api/admin/finance/registry-refunds?search=%5B')).body.total, 0);
    });
});
