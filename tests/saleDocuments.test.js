import test from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { uploadSaleDocument } from '../src/utils/saleDocuments.js';
import { normalizeSaleDocumentScope } from '../src/services/saleDocumentService.js';
test('sale file retries keep upload identity for the same file, session and stable scope only', async t => {
    const token = 'qa-upload-session', saleId = '123456789012345678901234', file = new File(['%PDF-ficticio'], 'qa.pdf'), paths = [];
    const previous = globalThis.localStorage; globalThis.localStorage = { getItem: () => token }; t.after(() => { globalThis.localStorage = previous; });
    t.mock.method(globalThis, 'fetch', async (path, options) => { paths.push(path); const body = JSON.parse(options.body); return new Response(JSON.stringify({ document: { _id: 'qa', ...body.metadata }, replayed: true }), { status: 200 }); });
    const first = await uploadSaleDocument({ saleId, file, slot: 'buyer_id_front', token }); await uploadSaleDocument({ saleId, file, slot: 'buyer_id_front', token }); await uploadSaleDocument({ saleId, file, slot: 'buyer_id_back', token });
    assert.equal(first.slot, 'buyer_id_front'); assert.equal(paths[0], paths[1]); assert.notEqual(paths[1], paths[2]);
});
test('sale attachment scope requires stable matching subdocument kind and excludes unrelated metadata', () => {
    const id = 'ABCDEF123456789012345678';
    assert.deepEqual(normalizeSaleDocumentScope({ slot: 'deposit_receipt', depositId: id }), { slot: 'deposit_receipt', depositId: id.toLowerCase() });
    assert.deepEqual(normalizeSaleDocumentScope({ slot: 'trade_in_card_front', tradeInId: id }), { slot: 'trade_in_card_front', tradeInId: id.toLowerCase() });
    for (const scope of [{ slot: 'deposit_receipt' }, { slot: 'buyer_id_front', depositId: id }, { slot: 'trade_in_card_back', depositId: id }, { slot: 'buyer_id_front', publicUrl: 'https://example.test' }, { slot: 'fake' }]) assert.throws(() => normalizeSaleDocumentScope(scope));
});
