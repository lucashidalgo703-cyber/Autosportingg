import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadPrivateFile } from '../src/utils/downloadPrivateFile.js';
test('private fifteen MiB download requests bounded authenticated ranges and reconstructs exact bytes', async t => {
    const token = 'qa-session', bytes = Buffer.alloc(15 * 1048576, 65), progress = []; let requests = 0;
    const previous = globalThis.localStorage; globalThis.localStorage = { getItem: () => token }; t.after(() => { globalThis.localStorage = previous; });
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(url, '/api/admin/sales/qa/documents/qa'); assert.equal(options.headers.Authorization, 'Bearer ' + token); const range = /^bytes=(\d+)-(\d+)$/.exec(options.headers.Range); const start = Number(range[1]), end = Math.min(Number(range[2]), bytes.length - 1); assert.ok(end - start + 1 <= 1048576); requests++;
        return new Response(bytes.subarray(start, end + 1), { status: 206, headers: { 'Content-Range': `bytes ${start}-${end}/${bytes.length}`, 'Content-Type': 'application/pdf' } });
    });
    const blob = await downloadPrivateFile({ url: '/api/admin/sales/qa/documents/qa', token, save: false, onProgress: value => progress.push(value.percent) }); assert.equal(requests, 15); assert.deepEqual(Buffer.from(await blob.arrayBuffer()), bytes); assert.equal(progress.at(-1), 100);
});
test('private downloads reject corrupt ranges and stop when session changes', async t => {
    const token = 'qa-session'; let session = token, requests = 0; const previous = globalThis.localStorage; globalThis.localStorage = { getItem: () => session }; t.after(() => { globalThis.localStorage = previous; });
    t.mock.method(globalThis, 'fetch', async () => { requests++; return new Response('qa', { status: 206, headers: { 'Content-Range': 'bytes 1-2/3' } }); });
    await assert.rejects(downloadPrivateFile({ url: '/api/admin/clients/qa/documents/qa', token, save: false }), /incompleta/);
    session = 'other'; await assert.rejects(downloadPrivateFile({ url: '/api/admin/clients/qa/documents/qa', token, save: false }), error => error.name === 'AbortError'); assert.equal(requests, 1);
});
