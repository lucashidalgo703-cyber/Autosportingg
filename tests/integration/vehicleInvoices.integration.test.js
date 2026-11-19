import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica(), originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
    assert.match(String(input?.url || input), /^http:\/\/127\.0\.0\.1:/, 'Only the disposable loopback server may be contacted');
    return originalFetch(input, options);
};
let passed = 0;
try {
    const { seedVehicleInvoices, invoicePdf, invoicePng } = await import('../fixtures/vehicleInvoicesFixtures.js');
    const f = await seedVehicleInvoices(env.models), endpoint = '/api/admin/vehicle-invoices';
    const api = (index, method, route, body, headers = {}) => env.call(method, route, body, f.sessions[index].token, headers);
    const check = (response, status, context = '') => assert.equal(response.status, status, context + ' ' + JSON.stringify(response.json));
    const invoiceOf = response => response.json.invoice || response.json;
    const idOf = invoice => String(invoice.id || invoice._id);
    const key = () => ({ 'Idempotency-Key': crypto.randomUUID() });
    const test = async (name, callback) => { await callback(); console.log(`ok ${++passed} - ${name}`); };
    const noPrivateBytes = value => assert.doesNotMatch(JSON.stringify(value), /encryptedFile|ciphertext|fileHash|requestFingerprint|passwordHash/);
    const saleInput = { direction: 'sale', saleId: f.saleId, carId: f.soldCarId, invoiceType: 'A', pointOfSale: '00001', invoiceNumber: '00000001',
        invoiceDate: '2026-11-19', totalAmount: 20000000, currency: 'ARS', partyName: 'Comprador A QA', partyTaxId: '20123456789',
        authorizationCode: '12345678901234', notes: 'Registro interno ficticio QA' };
    const purchaseInput = { direction: 'purchase', carId: f.emptyPlateId, invoiceType: 'B', pointOfSale: '00002', invoiceNumber: '00000002',
        invoiceDate: '2026-11-19', totalAmount: 14000, currency: 'USD', partyName: 'Proveedor ficticio QA', partyTaxId: '30987654321' };
    const initialFinance = { transactions: await env.models.Transaction.countDocuments(), account: (await env.models.Account.findById(f.account._id).lean()).balance };
    let saleInvoice, purchaseInvoice, firstSignedUrl;
    const access = (index, invoice, download = false) => api(index, 'POST', `${endpoint}/${idOf(invoice)}/file/access`, { download });
    async function upload(index, invoice, buffer, headers = key(), revision = invoice.revision) {
        const form = new FormData();
        form.set('file', new Blob([buffer], { type: buffer === invoicePng ? 'image/png' : 'application/pdf' }), buffer === invoicePng ? 'factura-qa.png' : 'factura-qa.pdf');
        form.set('revision', String(revision));
        const response = await fetch(`${env.base}${endpoint}/${idOf(invoice)}/file`, { method: 'POST', headers: { Authorization: 'Bearer ' + f.sessions[index].token, ...headers }, body: form });
        return { status: response.status, json: await response.json().catch(() => ({})) };
    }

    await test('billing is restricted to owner and Maia, including explicit legacy broad permission arrays', async () => {
        check(await env.call('GET', endpoint), 401);
        for (const index of [1, 3]) {
            check(await api(index, 'GET', endpoint), 200);
            check(await api(index, 'GET', endpoint + '/operations?direction=sale'), 200);
        }
        for (const index of [0, 2]) {
            const original = f.users[index].permissions;
            await env.models.AdminUser.updateOne({ _id: f.users[index]._id }, { $set: { permissions: Object.values((await import('../../src/utils/adminPermissions.js')).PERMISSIONS) } });
            try {
                check(await api(index, 'GET', endpoint), 403);
                check(await api(index, 'GET', endpoint + '/operations?direction=purchase'), 403);
                check(await api(index, 'POST', endpoint, saleInput, key()), 403);
                check(await api(index, 'GET', '/api/admin/auth/me'), 200);
            } finally { await env.models.AdminUser.updateOne({ _id: f.users[index]._id }, { $set: { permissions: original } }); }
        }
    });
    await test('billing operation search returns the existing sale and purchased unit without granting Maia global Stock or finance access', async () => {
        const sales = await api(3, 'GET', endpoint + '/operations?direction=sale'); check(sales, 200);
        assert.ok(JSON.stringify(sales.json).includes(f.saleId)); assert.ok(JSON.stringify(sales.json).includes(f.soldCarId));
        const purchases = await api(3, 'GET', endpoint + '/operations?direction=purchase&search=Compra%20facturaci%C3%B3n'); check(purchases, 200);
        assert.ok(JSON.stringify(purchases.json).includes(f.emptyPlateId));
        for (const path of ['/api/admin/cars', '/api/admin/transactions', '/api/admin/dashboard']) check(await api(3, 'GET', path), 403);
        check(await api(3, 'GET', '/api/admin/auth/me'), 200);
    });
    await test('sales invoice creation is concurrent-idempotent and retains its operation, amount and currency', async () => {
        const headers = key();
        const results = await Promise.all([0, 1].map(() => api(3, 'POST', endpoint, saleInput, headers)));
        for (const response of results) { assert.ok([200, 201].includes(response.status), JSON.stringify(response.json)); noPrivateBytes(response.json); }
        saleInvoice = invoiceOf(results[0]); assert.equal(idOf(saleInvoice), idOf(invoiceOf(results[1])));
        assert.equal(String(saleInvoice.saleId), f.saleId); assert.equal(String(saleInvoice.carId), f.soldCarId);
        assert.equal(saleInvoice.currency, 'ARS'); assert.equal(saleInvoice.totalAmount, saleInput.totalAmount); assert.equal(saleInvoice.status, 'active');
        check(await api(3, 'POST', endpoint, { ...saleInput, totalAmount: 1 }, headers), 409);
        check(await api(1, 'POST', endpoint, saleInput, key()), 409);
        check(await api(3, 'POST', endpoint, { ...saleInput, saleId: f.secondSaleId, carId: f.secondSoldCarId, currency: 'USD', totalAmount: 21000,
            partyName: 'Comprador B QA', partyTaxId: '20987654321' }, key()), 409);
    });
    await test('a received purchase invoice can be registered without creating a purchase, payment or cash movement', async () => {
        const response = await api(3, 'POST', endpoint, purchaseInput, key()); check(response, 201); purchaseInvoice = invoiceOf(response);
        assert.equal(String(purchaseInvoice.carId), f.emptyPlateId); assert.equal(purchaseInvoice.saleId ?? null, null);
        assert.equal(purchaseInvoice.currency, 'USD'); assert.equal(purchaseInvoice.totalAmount, 14000);
        const otherSupplier = await api(3, 'POST', endpoint, { ...purchaseInput, partyName: 'Otro proveedor ficticio QA', partyTaxId: '30876543210' }, key());
        check(otherSupplier, 201);
        assert.equal(await env.models.Transaction.countDocuments(), initialFinance.transactions);
        assert.equal((await env.models.Account.findById(f.account._id).lean()).balance, initialFinance.account);
    });
    await test('the server rejects mismatched sale-car references and invalid invoice values', async () => {
        check(await api(3, 'POST', endpoint, { ...saleInput, invoiceNumber: '3', carId: f.emptyPlateId }, key()), 409);
        for (const overrides of [{ direction: 'unknown' }, { totalAmount: -1 }, { currency: 'EUR' }, { invoiceDate: 'not-a-date' }]) {
            check(await api(3, 'POST', endpoint, { ...saleInput, invoiceNumber: '4', ...overrides }, key()), 400);
        }
        check(await api(3, 'POST', endpoint, { ...saleInput, invoiceNumber: '5' }), 400);
    });
    await test('invoice edits require a current revision and preserve the linked vehicle and original currency unless explicitly edited', async () => {
        const response = await api(3, 'PATCH', `${endpoint}/${idOf(purchaseInvoice)}`, { revision: purchaseInvoice.revision, notes: 'Corrección QA', totalAmount: 14100 }, key()); check(response, 200);
        const changed = invoiceOf(response); assert.ok(changed.revision > purchaseInvoice.revision); assert.equal(changed.totalAmount, 14100);
        assert.equal(changed.currency, 'USD'); assert.equal(String(changed.carId), f.emptyPlateId);
        check(await api(3, 'PATCH', `${endpoint}/${idOf(changed)}`, { revision: purchaseInvoice.revision, notes: 'Sobrescritura vieja' }, key()), 409);
        purchaseInvoice = changed;
    });
    await test('PDF attachments are private, encrypted, idempotent and viewable/downloadable only through authorized signed access', async () => {
        const headers = key(), response = await upload(3, saleInvoice, invoicePdf, headers); assert.ok([200, 201].includes(response.status), JSON.stringify(response.json));
        const withFile = invoiceOf(response); assert.equal(withFile.file.mimeType, 'application/pdf'); noPrivateBytes(response.json);
        const repeat = await upload(3, saleInvoice, invoicePdf, headers, saleInvoice.revision); assert.ok([200, 201].includes(repeat.status));
        assert.equal(invoiceOf(repeat).file.id, withFile.file.id); saleInvoice = withFile;
        check(await access(2, saleInvoice), 403); check(await access(0, saleInvoice), 403);
        const view = await access(3, saleInvoice); check(view, 200); firstSignedUrl = view.json.url;
        const shown = await fetch(env.base + firstSignedUrl); assert.equal(shown.status, 200); assert.match(shown.headers.get('cache-control') || '', /no-store/);
        assert.match(shown.headers.get('content-disposition') || '', /^inline;/); assert.deepEqual(Buffer.from(await shown.arrayBuffer()), invoicePdf);
        const download = await access(1, saleInvoice, true); check(download, 200);
        const downloaded = await fetch(env.base + download.json.url); assert.equal(downloaded.status, 200); assert.match(downloaded.headers.get('content-disposition') || '', /^attachment;/);
        assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), invoicePdf);
        const filePath = new URL(firstSignedUrl, env.base).pathname; assert.equal((await fetch(env.base + filePath)).status, 401);
        const Model = env.models.VehicleInvoiceFile; assert.ok(Model, 'encrypted attachment model is registered');
        const stored = await Model.findById(withFile.file.id).select('+encryptedFile').lean(); assert.ok(stored?.encryptedFile); assert.notEqual(stored.encryptedFile.data, invoicePdf.toString('base64'));
    });
    await test('replacement retires the former signed file link and rejects unsupported file bytes', async () => {
        const response = await upload(3, saleInvoice, invoicePng); assert.ok([200, 201].includes(response.status), JSON.stringify(response.json));
        saleInvoice = invoiceOf(response); assert.equal(saleInvoice.file.mimeType, 'image/png');
        const old = await fetch(env.base + firstSignedUrl); assert.ok([404, 409].includes(old.status));
        const invalid = await upload(3, saleInvoice, Buffer.from('not a real PDF or image')); check(invalid, 400);
        const view = await access(3, saleInvoice); check(view, 200); const shown = await fetch(env.base + view.json.url);
        assert.equal(shown.status, 200); assert.match(shown.headers.get('content-type') || '', /^image\/png/); assert.deepEqual(Buffer.from(await shown.arrayBuffer()), invoicePng);
    });
    await test('invoice cancellation needs an explanation, revokes file access and preserves all financial records', async () => {
        const view = await access(3, saleInvoice); check(view, 200);
        check(await api(3, 'PATCH', `${endpoint}/${idOf(saleInvoice)}`, { revision: saleInvoice.revision, status: 'annulled' }, key()), 400);
        const response = await api(1, 'PATCH', `${endpoint}/${idOf(saleInvoice)}`, { revision: saleInvoice.revision, status: 'annulled', reason: 'Registro duplicado en prueba QA' }, key()); check(response, 200);
        saleInvoice = invoiceOf(response); assert.equal(saleInvoice.status, 'annulled');
        assert.ok([404, 409].includes((await fetch(env.base + view.json.url)).status));
        assert.ok([404, 409].includes((await access(3, saleInvoice)).status));
        assert.equal(await env.models.Transaction.countDocuments(), initialFinance.transactions);
        assert.equal((await env.models.Account.findById(f.account._id).lean()).balance, initialFinance.account);
    });
    await test('already issued file access is revoked when the staff account is deactivated or loses its billing role', async () => {
        const uploaded = await upload(3, purchaseInvoice, invoicePdf); assert.ok([200, 201].includes(uploaded.status)); purchaseInvoice = invoiceOf(uploaded);
        const view = await access(3, purchaseInvoice); check(view, 200);
        await env.models.AdminUser.updateOne({ _id: f.users[3]._id }, { $set: { role: 'ventas' } });
        try { assert.equal((await fetch(env.base + view.json.url)).status, 403); }
        finally { await env.models.AdminUser.updateOne({ _id: f.users[3]._id }, { $set: { role: 'gestoria_contabilidad' } }); }
        const second = await access(3, purchaseInvoice); check(second, 200);
        await env.models.AdminUser.updateOne({ _id: f.users[3]._id }, { $set: { active: false } });
        try { assert.equal((await fetch(env.base + second.json.url)).status, 401); }
        finally { await env.models.AdminUser.updateOne({ _id: f.users[3]._id }, { $set: { active: true } }); }
    });
    await test('a seller can complete an absent domain atomically without receiving general Stock write access', async () => {
        const route = '/api/admin/stock/negotiation/' + f.emptyPlateId + '/plate';
        const responses = await Promise.all(['ab 123 cd', 'AC123DE'].map(plateOrVin => api(2, 'PATCH', route, { plateOrVin })));
        assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
        const success = responses.find(response => response.status === 200); assert.ok(['AB123CD', 'AC123DE'].includes(success.json.plate));
        const car = await env.models.Car.findById(f.emptyPlateId).lean(); assert.equal(car.plateOrVin, success.json.plate);
        const audits = car.auditLog.length;
        check(await api(2, 'PATCH', route, { plateOrVin: success.json.plate }), 200);
        assert.equal((await env.models.Car.findById(f.emptyPlateId).lean()).auditLog.length, audits);
        check(await api(3, 'PATCH', route, { plateOrVin: 'AD123EF' }), 409);
        check(await api(0, 'PATCH', route, { plateOrVin: 'AD123EF' }), 403);
        check(await api(2, 'PATCH', '/api/admin/cars/' + f.emptyPlateId, { plateOrVin: 'AD123EF' }), 403);
        check(await api(2, 'GET', '/api/admin/auth/me'), 200);
    });
    await test('domain completion rejects forged fields, invalid domains and sold or reserved units', async () => {
        const empty = await env.models.Car.create({ brand: 'DominioQA', name: 'Sin patente', year: 2024, km: 1, fuel: 'Nafta', condition: 'Usado', price: 10, currency: 'USD', status: 'Disponible' });
        const route = '/api/admin/stock/negotiation/' + empty._id + '/plate';
        check(await api(2, 'PATCH', route, { plateOrVin: 'AE123FG', price: 1 }), 400);
        check(await api(2, 'PATCH', route, { plateOrVin: '<script>' }), 400);
        await env.models.Car.updateOne({ _id: f.cars[0]._id }, { $set: { plateOrVin: '' } });
        check(await api(2, 'PATCH', '/api/admin/stock/negotiation/' + f.cars[0]._id + '/plate', { plateOrVin: 'AE123FG' }), 409);
        await env.models.Car.updateOne({ _id: f.cars[3]._id }, { $set: { plateOrVin: '' } });
        check(await api(2, 'PATCH', '/api/admin/stock/negotiation/' + f.cars[3]._id + '/plate', { plateOrVin: 'AF123GH' }), 409);
        check(await api(3, 'PATCH', route, { plateOrVin: 'abc123' }), 200);
        assert.equal((await env.models.Car.findById(empty._id).lean()).plateOrVin, 'ABC123');
    });
    console.log(`PASS: ${passed} isolated vehicle-invoice and domain-completion scenarios; no real users, mail, tax filing or production writes.`);
} finally { globalThis.fetch = originalFetch; await env.stop(); }
