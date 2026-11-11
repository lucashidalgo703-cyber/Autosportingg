import test from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { EXPEDIENTE_DOCUMENT_MAX_BYTES, expedienteFileMatches, uploadExpedienteDocument } from '../src/utils/expedienteDocuments.js';

test('private expediente file retries preserve both identities only in the same actor, sale and document scope', async t => {
    const saleId = '123456789012345678901234', file = new File(['%PDF-ficticio'], 'qa.pdf', { type: 'application/pdf' });
    let token = 'qa-expediente-session'; const calls = [];
    const oldStorage = globalThis.localStorage; globalThis.localStorage = { getItem: () => token }; t.after(() => { globalThis.localStorage = oldStorage; });
    t.mock.method(globalThis, 'fetch', async (path, options) => { const body = JSON.parse(options.body); calls.push({ path, metadata: body.metadata }); return new Response(JSON.stringify({ document: { _id: 'qa', ...body.metadata }, replayed: true }), { status: 200 }); });
    const args = { saleId, file, party: 'seller', documentKey: 'dni_front', token };
    const first = await uploadExpedienteDocument(args); await uploadExpedienteDocument(args);
    await uploadExpedienteDocument({ ...args, party: 'buyer' });
    await uploadExpedienteDocument({ ...args, documentKey: 'vehicle_title' });
    await uploadExpedienteDocument({ ...args, saleId: '223456789012345678901234' });
    token = 'qa-other-actor'; await uploadExpedienteDocument({ ...args, token });
    assert.equal(calls[0].path, calls[1].path); assert.deepEqual(calls[0].metadata, calls[1].metadata);
    for (const later of calls.slice(2)) { assert.notEqual(later.path, calls[0].path); assert.notEqual(later.metadata.attachmentId, calls[0].metadata.attachmentId); }
    assert.equal(first.slot, 'expediente_document'); assert.equal(first.documentKey, 'dni_front'); assert.ok(expedienteFileMatches(first, 'seller', 'dni_front')); assert.equal(expedienteFileMatches(first, 'buyer', 'dni_front'), false);
});

test('expediente files reject invalid targets, empty or oversized payloads before sending any bytes', async t => {
    let requests = 0; t.mock.method(globalThis, 'fetch', async () => { requests++; throw Error('unexpected request'); });
    const valid = { saleId: '123456789012345678901234', file: new File(['qa'], 'qa.pdf'), party: 'procedure', documentKey: 'transferred_title', token: 'qa' };
    for (const invalid of [{ saleId: 'missing' }, { party: 'unrelated' }, { documentKey: '../owner_transfer' }, { file: new File([], 'empty.pdf') }, { file: { size: EXPEDIENTE_DOCUMENT_MAX_BYTES + 1, arrayBuffer() {} } }, { attachmentId: 'not-a-uuid' }, { uploadId: 'not-a-uuid' }, { token: '' }]) await assert.rejects(uploadExpedienteDocument({ ...valid, ...invalid }));
    assert.equal(requests, 0);
});
