import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { File } from 'node:buffer';
import { uploadPrivateFiles, PRIVATE_UPLOAD_CHUNK_BYTES } from '../src/utils/uploadPrivateFiles.js';

test('a 15 MiB private file travels in bounded JSON parts and commits only after staging', async t => {
    const token = 'qa-private-session', data = Buffer.alloc(15 * 1024 * 1024, 65), uploadId = crypto.randomUUID();
    const calls = [], progress = [];
    t.mock.method(globalThis, 'fetch', async (path, options) => {
        const payload = JSON.parse(options.body); calls.push({ path, payload, bodyBytes: Buffer.byteLength(options.body) });
        assert.equal(options.headers.Authorization, `Bearer ${token}`); assert.equal(options.headers['Content-Type'], 'application/json');
        if (path.endsWith('/commit')) return new Response(JSON.stringify(calls.some(call => call.path.endsWith('/chunks')) ? { documents: [{ _id: 'qa-doc' }] } : { code: 'PRIVATE_UPLOAD_INCOMPLETE', message: 'Faltan partes' }), { status: calls.some(call => call.path.endsWith('/chunks')) ? 201 : 409 });
        const bytes = Buffer.from(payload.data, 'base64'); assert.equal(bytes.length, PRIVATE_UPLOAD_CHUNK_BYTES); assert.equal(payload.chunkSha256, crypto.createHash('sha256').update(bytes).digest('hex'));
        assert.ok(Buffer.byteLength(options.body) < 2 * 1024 * 1024);
        return new Response(JSON.stringify({ received: true }), { status: 200 });
    });
    const oldStorage = globalThis.localStorage; globalThis.localStorage = { getItem: () => token }; t.after(() => { globalThis.localStorage = oldStorage; });
    const result = await uploadPrivateFiles({ basePath: '/api/admin/transactions/qa/document-uploads', files: [new File([data], 'documento.pdf', { type: 'application/pdf' })], token, uploadId, onProgress: state => progress.push(state.percent) });
    assert.equal(result.documents[0]._id, 'qa-doc'); assert.equal(calls.filter(call => call.path.endsWith('/chunks')).length, 15); assert.equal(calls.at(-1).path, `/api/admin/transactions/qa/document-uploads/${uploadId}/commit`); assert.equal(progress.at(-1), 100);
});

test('committed metadata replay avoids reuploading and changed sessions send no bytes', async t => {
    const token = 'qa-private-session'; let calls = 0;
    const oldStorage = globalThis.localStorage; globalThis.localStorage = { getItem: () => token }; t.after(() => { globalThis.localStorage = oldStorage; });
    t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response(JSON.stringify({ documents: [{ _id: 'saved' }], replayed: true }), { status: 201 }); });
    const args = { basePath: '/api/admin/clients/qa/document-uploads', files: [new File(['archivo ficticio'], 'qa.txt')], token, uploadId: crypto.randomUUID() };
    const replay = await uploadPrivateFiles(args); assert.equal(replay.replayed, true); assert.equal(calls, 1);
    globalThis.localStorage = { getItem: () => 'different-session' };
    await assert.rejects(uploadPrivateFiles(args), error => error.name === 'AbortError'); assert.equal(calls, 1);
    await assert.rejects(uploadPrivateFiles({ ...args, basePath: 'https://unexpected.example/api/admin/private' }), /ruta/); assert.equal(calls, 1);
});
