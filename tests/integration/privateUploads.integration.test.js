import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { once } from 'node:events';
import { access } from 'node:fs/promises';
import { File } from 'node:buffer';
import { uploadPrivateFiles } from '../../src/utils/uploadPrivateFiles.js';
import { downloadPrivateFile } from '../../src/utils/downloadPrivateFile.js';
let mongoose, jwt, replSet, server, base, Client, Sale, User, ClientDoc, SaleDoc, Chunk, actor;
const nativeFetch = globalThis.fetch, oldStorage = globalThis.localStorage;
const clientRead = ['clientes.read', 'documentacion.read'], clientWrite = [...clientRead, 'clientes.write', 'documentacion.write'];
const saleRead = ['ventas.read', 'documentacion.read'], saleWrite = [...saleRead, 'ventas.write', 'documentacion.write'];
const token = (permissions, id = actor._id) => jwt.sign({ id: String(id), username: 'qa_upload', role: 'ventas', permissions }, process.env.JWT_SECRET, { expiresIn: '10m' });
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const descriptor = (bytes, fileName = 'qa.pdf') => ({ fileIndex: 0, fileCount: 1, fileName, mimeType: 'application/pdf', fileSize: bytes.length, fileSha256: sha(bytes), partCount: Math.ceil(bytes.length / 1048576) });
const payload = (bytes, index = 0, desc = descriptor(bytes)) => { const chunk = bytes.subarray(index * 1048576, Math.min((index + 1) * 1048576, bytes.length)); return { ...desc, partIndex: index, chunkSha256: sha(chunk), data: chunk.toString('base64') }; };
async function request(method, path, body, permissions = clientWrite, options = {}) {
    return fetch(base + path, { method, headers: { Authorization: 'Bearer ' + token(permissions, options.actorId), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
before(async () => {
    for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) assert.equal(await access(name).then(() => true, () => false), false, 'Checkout aislado sin secretos');
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1', spawn: { windowsHide: true }, args: ['--wiredTigerCacheSizeGB', '0.25', '--oplogSize', '16'] }, instanceOpts: [{ ip: '127.0.0.1', launchTimeout: 180000 }] });
    process.env.MONGODB_URI = replSet.getUri('private_upload_qa_' + crypto.randomBytes(6).toString('hex')); process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex'); process.env.TWO_FACTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex'); process.env.NODE_ENV = 'production'; process.env.ENABLE_DAILY_SUMMARY_SCHEDULER = 'false';
    for (const key of ['REDIS_URL', 'REDIS_TOKEN', 'MONGODB_DNS_SERVERS', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) process.env[key] = '';
    globalThis.fetch = (input, options) => { const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url); assert.equal(target.origin, base, 'Sin proveedores ni tráfico externo'); return nativeFetch(input, options); };
    mongoose = (await import('mongoose')).default; mongoose.set('autoCreate', false); jwt = (await import('jsonwebtoken')).default;
    const app = (await import('../../server.js')).default;
    Client = (await import('../../src/models/Client.js')).default; Sale = (await import('../../src/models/Sale.js')).default; User = (await import('../../src/models/AdminUser.js')).default;
    ClientDoc = (await import('../../src/models/ClientDocument.js')).default; SaleDoc = (await import('../../src/models/SaleDocument.js')).default; Chunk = (await import('../../src/models/PrivateUploadChunk.js')).default;
    const Audit = (await import('../../src/models/AuditLog.js')).default;
    await (await import('../../src/config/db.js')).default(); await Promise.all([Client, Sale, User, ClientDoc, SaleDoc, Chunk, Audit].map(model => model.createCollection())); assert.equal(mongoose.connection.host, '127.0.0.1');
    server = app.listen({ port: 0, host: '127.0.0.1' }); await once(server, 'listening'); base = 'http://127.0.0.1:' + server.address().port;
}, { timeout: 300000 });
beforeEach(async () => { await Promise.all([Client, Sale, User, ClientDoc, SaleDoc, Chunk].map(model => model.deleteMany({}))); actor = await User.create({ name: 'QA Upload', email: 'upload@example.test', passwordHash: 'qa-only', role: 'ventas', active: true }); });
after(async () => { globalThis.fetch = nativeFetch; globalThis.localStorage = oldStorage; if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } await mongoose?.disconnect(); await replSet?.stop(); });

test('five MiB client file uses bounded parts, authenticated ranges and committed replay after temporary cleanup', async () => {
    const client = await Client.create({ fullName: 'Cliente ficticio' }), bytes = Buffer.alloc(5 * 1048576, 65); bytes.write('%PDF-');
    const id = crypto.randomUUID(), root = '/api/admin/clients/' + client._id, auth = token(clientWrite); globalThis.localStorage = { getItem: () => auth };
    const result = await uploadPrivateFiles({ basePath: base + root + '/document-uploads', files: [new File([bytes], 'ficticio.pdf', { type: 'application/pdf' })], uploadId: id, token: auth });
    assert.equal(result.documents.length, 1); assert.equal(await Chunk.countDocuments(), 0); assert.equal(await ClientDoc.countDocuments(), 1);
    const replay = await uploadPrivateFiles({ basePath: base + root + '/document-uploads', files: [new File([bytes], 'ficticio.pdf', { type: 'application/pdf' })], uploadId: id, token: auth });
    assert.equal(replay.replayed, true); assert.equal(await Chunk.countDocuments(), 0); assert.equal(await ClientDoc.countDocuments(), 1);
    const blob = await downloadPrivateFile({ url: base + root + '/documents/' + result.documents[0]._id, token: auth, save: false, maxBytes: bytes.length }); assert.deepEqual(Buffer.from(await blob.arrayBuffer()), bytes);
    const range = await request('GET', root + '/documents/' + result.documents[0]._id, null, clientRead, { headers: { Range: 'bytes=0-1048575' } }); assert.equal(range.status, 206); assert.equal(range.headers.get('content-range'), 'bytes 0-1048575/5242880'); assert.match(range.headers.get('cache-control'), /no-store/); assert.equal(range.headers.get('x-content-type-options'), 'nosniff'); assert.match(range.headers.get('content-disposition'), /^attachment/);
    assert.equal((await request('GET', root + '/documents/' + result.documents[0]._id, null, clientRead, { headers: { Range: 'bytes=0-4194303' } })).status, 416);
    const changed = descriptor(Buffer.from('otro'), 'ficticio.pdf'); assert.equal((await request('POST', root + '/document-uploads/' + id + '/commit', { manifest: [changed] })).status, 409);
    for (const key of ['data', 'sha256', 'uploadBatch']) assert.equal(Object.hasOwn(result.documents[0], key), false);
});

test('stage rejects missing permissions, bounds, hashes and mismatched replays without changing permanent documents', async () => {
    const client = await Client.create({ fullName: 'Cliente ficticio' }), bytes = Buffer.from('%PDF-QA'), root = '/api/admin/clients/' + client._id + '/document-uploads/' + crypto.randomUUID();
    for (const permissions of [clientRead, ['clientes.read', 'clientes.write', 'documentacion.read'], ['documentacion.read', 'documentacion.write']]) assert.equal((await request('POST', root + '/chunks', payload(bytes), permissions)).status, 403);
    assert.equal(await Chunk.countDocuments(), 0);
    for (const body of [{ ...payload(bytes), fileSize: 5 * 1048576 + 1 }, { ...payload(bytes), fileCount: 6 }, { ...payload(bytes), partIndex: 1 }, { ...payload(bytes), chunkSha256: '0'.repeat(64) }, { ...payload(bytes), data: 'AAAA' }]) assert.equal((await request('POST', root + '/chunks', body)).status, 400);
    assert.equal((await request('POST', root + '/chunks', payload(bytes))).status, 200); const replay = await request('POST', root + '/chunks', payload(bytes)); assert.equal((await replay.json()).replayed, true);
    assert.equal((await request('POST', root + '/chunks', payload(Buffer.from('%PDF-DIFFERENT')))).status, 409); assert.equal(await ClientDoc.countDocuments(), 0);
    const indexes = await Chunk.collection.indexes(); assert.ok(indexes.some(index => index.key.expiresAt === 1 && index.expireAfterSeconds === 0)); assert.equal(ClientDoc.schema.indexes().some(([, options]) => options.expireAfterSeconds !== undefined), false);
});

test('temporary data belongs to actor and entity, expires without creating permanent files', async () => {
    const client = await Client.create({ fullName: 'Cliente ficticio' }), other = await Client.create({ fullName: 'Otro ficticio' }), bytes = Buffer.from('%PDF-QA'), id = crypto.randomUUID(), root = '/api/admin/clients/' + client._id + '/document-uploads/' + id;
    assert.equal((await request('POST', root + '/chunks', payload(bytes))).status, 200);
    const nextActor = await User.create({ name: 'Otra sesión QA', email: 'other@example.test', passwordHash: 'qa', role: 'ventas', active: true });
    for (const [path, options] of [[root, { actorId: nextActor._id }], ['/api/admin/clients/' + other._id + '/document-uploads/' + id, {}]]) { const response = await request('POST', path + '/commit', { manifest: [descriptor(bytes)] }, clientWrite, options); assert.equal(response.status, 409); assert.equal((await response.json()).code, 'PRIVATE_UPLOAD_INCOMPLETE'); }
    await Chunk.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 10000) } }); const expired = await request('POST', root + '/commit', { manifest: [descriptor(bytes)] }); assert.equal(expired.status, 410); assert.equal(await ClientDoc.countDocuments(), 0);
});

test('client active limit commits a selected batch atomically', async () => {
    const client = await Client.create({ fullName: 'Cliente ficticio' }), auth = token(clientWrite), root = base + '/api/admin/clients/' + client._id + '/document-uploads'; globalThis.localStorage = { getItem: () => auth };
    await uploadPrivateFiles({ basePath: root, files: Array.from({ length: 4 }, (_, index) => new File(['%PDF-QA' + index], 'ficticio' + index + '.pdf')), token: auth });
    await assert.rejects(uploadPrivateFiles({ basePath: root, files: [new File(['%PDF-QA5'], 'cinco.pdf'), new File(['%PDF-QA6'], 'seis.pdf')], token: auth }), error => error.status === 409); assert.equal(await ClientDoc.countDocuments(), 4);
});

test('sale fifteen MiB attachment validates stable scopes and permissions, replaces recoverably and replays after cleanup', { timeout: 180000 }, async () => {
    const savedSale = await Sale.create({ salePrice: 100, saleCurrency: 'USD', depositRecords: [{ amount: 10, currency: 'USD', date: new Date() }], tradeIns: [{ brand: 'QA', model: 'Ficticio', year: 2020, estimatedValue: 20 }] });
    const root = '/api/admin/sales/' + savedSale._id, auth = token(saleWrite), bytes = Buffer.alloc(15 * 1048576, 66); bytes.write('%PDF-'); globalThis.localStorage = { getItem: () => auth };
    assert.equal((await request('GET', root + '/documents', null, ['ventas.read'])).status, 403); assert.equal((await request('POST', root + '/document-uploads/' + crypto.randomUUID() + '/chunks', payload(Buffer.from('%PDF-QA')), saleRead)).status, 403); assert.equal(await Chunk.countDocuments(), 0);
    const id = crypto.randomUUID(), metadata = { slot: 'deposit_receipt', depositId: String(savedSale.depositRecords[0]._id) }, file = new File([bytes], 'recibo-ficticio.pdf', { type: 'application/pdf' });
    const result = await uploadPrivateFiles({ basePath: base + root + '/document-uploads', files: [file], metadata, token: auth, uploadId: id }); assert.equal(result.document.slot, metadata.slot); assert.equal(result.document.depositId, metadata.depositId); assert.equal(await Chunk.countDocuments(), 0);
    const blob = await downloadPrivateFile({ url: base + root + '/documents/' + result.document._id, token: auth, save: false }); assert.deepEqual(Buffer.from(await blob.arrayBuffer()), bytes);
    const replay = await uploadPrivateFiles({ basePath: base + root + '/document-uploads', files: [file], metadata, token: auth, uploadId: id }); assert.equal(replay.replayed, true); assert.equal(await SaleDoc.countDocuments(), 1);
    await assert.rejects(uploadPrivateFiles({ basePath: base + root + '/document-uploads', files: [file], metadata: { slot: 'buyer_id_front' }, token: auth, uploadId: id }), error => error.status === 409);
    await assert.rejects(uploadPrivateFiles({ basePath: base + root + '/document-uploads', files: [new File(['%PDF-QA'], 'qa.pdf')], metadata: { slot: 'deposit_receipt', depositId: String(new mongoose.Types.ObjectId()) }, token: auth }), error => error.status === 404);
    const replacement = await uploadPrivateFiles({ basePath: base + root + '/document-uploads', files: [new File(['%PDF-Reemplazo'], 'reemplazo.pdf')], metadata, token: auth });
    assert.equal(await SaleDoc.countDocuments({ deletedAt: null }), 1); assert.ok((await SaleDoc.findById(result.document._id)).deletedAt); assert.equal((await request('GET', root + '/documents/' + result.document._id, null, saleRead)).status, 404);
    assert.equal((await request('PATCH', root + '/documents/' + result.document._id, { deleted: false }, saleWrite)).status, 409); assert.equal((await request('PATCH', root + '/documents/' + replacement.document._id, { deleted: true }, saleWrite)).status, 200); assert.equal((await request('PATCH', root + '/documents/' + result.document._id, { deleted: false }, saleWrite)).status, 200);
    const list = await (await request('GET', root + '/documents', null, saleRead)).json(); for (const document of list.documents) for (const key of ['data', 'sha256', 'uploadBatch']) assert.equal(Object.hasOwn(document, key), false);
    assert.equal((await Sale.findById(savedSale._id)).salePrice, 100); assert.equal(SaleDoc.schema.indexes().some(([, options]) => options.expireAfterSeconds !== undefined), false);
});
