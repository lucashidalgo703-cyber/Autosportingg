import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

// Every record and key below belongs to this disposable loopback database.
// This suite exercises the service's write transaction after authentication;
// the separate HTTP suite covers the registered-channel OTP exchange itself.
const root = path.resolve('.');
if (['.env', '.env.local', '.env.production', '.env.production.local'].some(name => fs.existsSync(path.join(root, name)))) throw new Error('Este test requiere un checkout sin credenciales .env.');
const binary = path.resolve('node_modules/.cache/mongodb-binaries/mongod-x64-win32-8.2.6.exe');
const replica = await MongoMemoryReplSet.create({ binary: { downloadDir: path.dirname(binary), ...(process.platform === 'win32' && fs.existsSync(binary) ? { systemBinary: binary } : {}) }, replSet: { count: 1, storageEngine: 'wiredTiger' } });
Object.assign(process.env, { NODE_ENV: 'production', MONGODB_URI: replica.getUri('autosporting_buyer_portal_race_test'),
    JWT_SECRET: crypto.randomBytes(48).toString('hex'), BUYER_PORTAL_DOCUMENT_KEY: crypto.randomBytes(48).toString('hex'),
    SECURITY_ALERT_EMAIL: 'administrador@example.test', SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_USER: 'fixture@example.test', SMTP_PASS: 'fake-local-only' });
mongoose.set('autoIndex', false); mongoose.set('autoCreate', false);
let passed = 0;
try {
    await mongoose.connect(process.env.MONGODB_URI);
    const service = await import('../../src/services/buyerPortalService.js');
    const { EmailAdapter } = await import('../../src/lib/emailAdapter.js');
    EmailAdapter.sendEmail = async () => { throw new Error('Esta suite no debe enviar correos.'); };
    const { Sale, Client, BuyerPortal, BuyerPortalSession, BuyerPortalDocument } = mongoose.models;
    for (const Model of Object.values(mongoose.models)) await Model.createCollection();
    await service.createBuyerPortalIndexes();
    const admin = { id: String(new mongoose.Types.ObjectId()), role: 'owner', name: 'Administrador ficticio' };
    const sha = value => crypto.createHash('sha256').update(String(value)).digest('hex');
    const documentKey = crypto.createHash('sha256').update(process.env.BUYER_PORTAL_DOCUMENT_KEY).digest();
    const portalSigningKey = crypto.createHmac('sha256', documentKey).update('autosporting:buyer-portal-signing:v1').digest('hex');
    const fixture = async () => {
        const client = await Client.create({ fullName: 'Comprador ficticio', email: crypto.randomUUID() + '@example.test', status: 'activo' });
        const sale = await Sale.create({ clientId: client._id, status: 'confirmada', salePrice: 10000000, saleCurrency: 'ARS',
            tradeIns: [{ brand: 'Ficticia', model: 'Toma de prueba', year: 2022, plate: 'QA001AA', estimatedValue: 5000000, currency: 'ARS' }] });
        const configuration = await service.configurePortal(admin, String(sale._id), {});
        const token = configuration.url.split('/').at(-1);
        const portal = await BuyerPortal.findById(sale._id).lean();
        const sid = crypto.randomBytes(32).toString('base64url'), expires = Math.floor(Date.now() / 1000) + 1800;
        await BuyerPortalSession.create({ _id: sha(sid), portalId: sale._id, generation: portal.generation,
            clientId: client._id, contactHash: sha(client.email), expiresAt: new Date(expires * 1000) });
        const sessionToken = jwt.sign({ purpose: 'buyer-portal', portalId: String(sale._id), generation: portal.generation,
            clientId: String(client._id), contactHash: sha(client.email), sid, exp: expires }, portalSigningKey,
        { algorithm: 'HS256', audience: 'autosporting-buyer' });
        const context = await service.buyerSession(token, sessionToken);
        const input = { tradeInId: String(sale.tradeIns[0]._id), requirementKey: 'title', slot: 'title-page-1', side: 'page',
            description: 'Título · Página 1', requestId: crypto.randomUUID() };
        return { client, sale, portal, context, input, sessionToken };
    };
    const file = { buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]), originalname: 'foto-ficticia.jpg' };
    const upload = f => service.uploadBuyerDocument(f.context, f.input, file);
    const counters = async f => ({
        portal: (await BuyerPortal.findById(f.sale._id).lean()).uploadSequence || 0,
        device: (await BuyerPortalSession.findById(sha(f.context.session.sid)).lean()).uploadSequence || 0,
        sale: (await Sale.findById(f.sale._id).lean()).buyerPortalUploadSequence || 0,
        client: (await Client.findById(f.client._id).lean()).buyerPortalUploadSequence || 0
    });
    const rejectedWithoutDocument = async f => {
        const before = await counters(f);
        await assert.rejects(upload(f), error => [401, 404].includes(error.status));
        assert.equal(await BuyerPortalDocument.countDocuments({ saleId: f.sale._id }), 0);
        assert.deepEqual(await counters(f), before, 'aborted authorization checks cannot leave committed upload locks');
    };
    const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
    await test('a context authenticated before the registered email changes cannot save a file', async () => {
        const f = await fixture();
        await Client.updateOne({ _id: f.client._id }, { $set: { email: 'nuevo-comprador@example.test' } });
        await rejectedWithoutDocument(f);
    });
    await test('reassigning the sale to another buyer invalidates the old upload context', async () => {
        const f = await fixture(), other = await Client.create({ fullName: 'Otro comprador ficticio', email: 'otro@example.test', status: 'activo' });
        await Sale.updateOne({ _id: f.sale._id }, { $set: { clientId: other._id } });
        await rejectedWithoutDocument(f);
    });
    await test('a cancelled sale rejects an already authenticated upload without writing a file', async () => {
        const f = await fixture();
        await Sale.updateOne({ _id: f.sale._id }, { $set: { status: 'cancelada' } });
        await rejectedWithoutDocument(f);
    });
    await test('removing the trade-in rejects its stale upload context without orphaning a file', async () => {
        const f = await fixture();
        await Sale.updateOne({ _id: f.sale._id }, { $set: { tradeIns: [] } });
        await rejectedWithoutDocument(f);
    });
    await test('explicit link revocation rejects an upload that was authenticated before revocation', async () => {
        const f = await fixture();
        await service.revokePortal(admin, String(f.sale._id));
        await rejectedWithoutDocument(f);
    });
    await test('closing the remembered device rejects an upload that was authenticated before logout', async () => {
        const f = await fixture();
        await service.revokeBuyerSession(f.sessionToken);
        await rejectedWithoutDocument(f);
    });
    // The hook commits an external edit after Sale and Client have been read in
    // the upload transaction, immediately before its guaranteed Sale write.
    // A correct implementation encounters a MongoDB write conflict, retries,
    // revalidates the old context and rejects it; it cannot commit the file.
    const concurrentEdit = async edit => {
        const f = await fixture(), original = Sale.updateOne;
        let injected = false;
        Sale.updateOne = function (filter, update, options) {
            const query = original.call(this, filter, update, options);
            if (update?.$inc?.buyerPortalUploadSequence) {
                const exec = query.exec.bind(query);
                query.exec = async (...args) => {
                    if (!injected) { injected = true; await edit(f); }
                    return exec(...args);
                };
            }
            return query;
        };
        try { await rejectedWithoutDocument(f); assert.equal(injected, true, 'the external edit must occur during the write transaction'); }
        finally { Sale.updateOne = original; }
    };
    await test('email changed during the transaction conflicts, retries and rejects the old channel', async () => {
        await concurrentEdit(f => Client.collection.updateOne({ _id: f.client._id }, { $set: { email: 'canal-cambiado@example.test' } }));
    });
    await test('cancellation committed during the transaction cannot be followed by a later document commit', async () => {
        await concurrentEdit(f => Sale.collection.updateOne({ _id: f.sale._id }, { $set: { status: 'cancelada' } }));
    });
    await test('trade-in removed during the transaction cannot receive an orphaned attachment', async () => {
        await concurrentEdit(f => Sale.collection.updateOne({ _id: f.sale._id }, { $set: { tradeIns: [] } }));
    });
    await test('valid independent uploads perform guaranteed counter writes while preserving one current entry per slot', async () => {
        const f = await fixture();
        const a = await upload(f);
        f.input = { ...f.input, slot: 'title-page-2', description: 'Título · Página 2', requestId: crypto.randomUUID() };
        const b = await upload(f);
        assert.notEqual(a.entry.id, b.entry.id);
        assert.deepEqual(await counters(f), { portal: 2, device: 2, sale: 2, client: 2 });
        assert.equal(await BuyerPortalDocument.countDocuments({ saleId: f.sale._id, isCurrent: true }), 2);
    });
    console.log(`PASS: ${passed} isolated buyer portal transaction-race groups.`);
} finally { await mongoose.disconnect(); await replica.stop(); }
