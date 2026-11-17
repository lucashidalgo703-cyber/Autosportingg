import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica();
let passed = 0;
try {
    process.env.BUYER_PORTAL_DOCUMENT_KEY = crypto.randomBytes(48).toString('hex');
    const portal = await import('../../src/services/buyerPortalService.js');
    const proofsService = await import('../../src/services/buyerPaymentProofService.js');
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const fixture = await seedMobileCrm(env.models);
    await portal.createBuyerPortalIndexes(); await proofsService.createBuyerPaymentIndexes();
    const { Sale, Client, Car, Account, Transaction, Installment, Gestoria, Reservation, BuyerPortal, BuyerPortalSession, BuyerPaymentProof, CollectionRecordingOperation } = env.models;
    const admin = { id: String(fixture.users[0]._id), role: 'admin' }, adminToken = fixture.sessions[0].token;
    const sha = value => crypto.createHash('sha256').update(value).digest('hex');
    const key = crypto.createHmac('sha256', crypto.createHash('sha256').update(process.env.BUYER_PORTAL_DOCUMENT_KEY).digest()).update('autosporting:buyer-portal-signing:v1').digest('hex');
    const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
    const status = (result, expected) => assert.equal(result.status, expected, JSON.stringify(result.json));
    const adminApi = (method, suffix, body, token = adminToken) => env.call(method, '/api/admin/buyer-portal' + suffix, body, token);
    const photo = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
    const pdf = Buffer.from('%PDF-1.4\n% fictional payment receipt\n%%EOF');
    async function create({ currency = 'ARS', withTradeIn = false } = {}) {
        const client = await Client.create({ firstName: 'Comprador', lastName: 'Ficticio', fullName: 'Comprador Ficticio', email: crypto.randomUUID() + '@example.test' });
        const car = await Car.create({ brand: 'Ficticia', name: 'Compra local', year: 2024, km: 1000, fuel: 'Nafta', condition: 'Usado', price: 10000, currency, status: 'Vendido', sold: true });
        const sale = await Sale.create({ clientId: client._id, vehicleId: car._id, salePrice: 10000, saleCurrency: currency, status: 'confirmada',
            ...(withTradeIn ? { tradeInTotalAmount: 1000, tradeIns: [{ brand: 'Ficticia', model: 'Usado recibido', year: 2020, estimatedValue: 1000, currency }] } : {}) });
        const configuration = await portal.configurePortal(admin, String(sale._id), {});
        const link = configuration.url.split('/').at(-1), stored = await BuyerPortal.findById(sale._id).lean();
        const sid = crypto.randomBytes(32).toString('base64url'), exp = Math.floor(Date.now() / 1000) + 1800;
        await BuyerPortalSession.create({ _id: sha(sid), portalId: sale._id, clientId: client._id, generation: stored.generation, contactHash: sha(client.email), expiresAt: new Date(exp * 1000) });
        const token = jwt.sign({ purpose: 'buyer-portal', portalId: String(sale._id), clientId: String(client._id), generation: stored.generation,
            contactHash: sha(client.email), sid, exp }, key, { algorithm: 'HS256', audience: 'autosporting-buyer' });
        const account = await Account.create({ name: 'Cuenta prueba ' + crypto.randomUUID(), currency, type: 'Banco', balance: 0, isActive: true });
        return { sale, client, car, link, token, account, context: await portal.buyerSession(link, token) };
    }
    const buyerApi = (buyer, method, suffix, body, token = buyer.token, headers = {}) => env.call(method, '/api/buyer-portal/' + buyer.link + suffix, body, token, headers);
    async function upload(buyer, values = {}) {
        const { buffer = photo, ...data } = { requestId: crypto.randomUUID(), amount: '100', currency: buyer.sale.saleCurrency,
            paymentDate: '2026-01-02', concept: 'Pago ficticio', targetType: 'purchase', ...values };
        const form = new FormData();
        for (const [name, value] of Object.entries(data)) form.set(name, value);
        form.set('file', new Blob([buffer]), buffer === pdf ? 'comprobante.pdf' : 'comprobante.jpg');
        const response = await fetch(env.base + '/api/buyer-portal/' + buyer.link + '/payments', { method: 'POST', headers: { Authorization: 'Bearer ' + buyer.token }, body: form });
        return { status: response.status, json: await response.json(), data };
    }
    const review = (id, body) => adminApi('POST', '/payment-proofs/' + id + '/review', body);

    await test('both operation modes accept private pending receipts without creating money movements', async () => {
        for (const withTradeIn of [true, false]) {
            const buyer = await create({ withTradeIn }), before = await Transaction.countDocuments();
            const sent = await upload(buyer); status(sent, 200);
            assert.equal(sent.json.proof.status, 'pending'); assert.equal(await Transaction.countDocuments(), before);
            assert.equal((await Account.findById(buyer.account._id)).balance, 0);
            const data = await buyerApi(buyer, 'GET', '/payments'); status(data, 200);
            assert.equal(data.json.proofs[0].amount, 100); assert.equal(data.json.pendingTargets[0].type, 'purchase');
            const adminData = await adminApi('GET', '/sales/' + buyer.sale._id + '/payment-proofs'); status(adminData, 200);
            assert.ok(adminData.json.proofs.some(proof => proof.id === sent.json.proof.id));
        }
    });
    await test('request retries, refresh with another request id and concurrent sends preserve a single file', async () => {
        const buyer = await create(), requestId = crypto.randomUUID();
        const sends = await Promise.all([upload(buyer, { requestId }), upload(buyer, { requestId }), upload(buyer, { requestId: crypto.randomUUID() })]);
        sends.forEach(result => status(result, 200));
        assert.equal(new Set(sends.map(result => result.json.proof.id)).size, 1);
        assert.equal(await BuyerPaymentProof.countDocuments({ saleId: buyer.sale._id }), 1);
        status(await upload(buyer, { requestId, amount: '101' }), 409);
    });
    await test('server enforces verified operation isolation, cookie origin and authenticated downloads', async () => {
        const a = await create(), b = await create(), sent = await upload(a), id = sent.json.proof.id;
        status(await buyerApi(a, 'GET', '/payments', undefined, null), 401);
        status(await buyerApi(b, 'POST', '/payments/' + id + '/access', {}), 404);
        status(await buyerApi(a, 'POST', '/payments/' + id + '/access', {}, null, { Cookie: 'autosporting_buyer_session=' + a.token, Origin: 'https://foreign.example.test' }), 403);
        status(await review(id, { action: 'confirm', accountId: a.account._id }), 200);
        const signed = await buyerApi(a, 'POST', '/payments/' + id + '/access', { download: true }); status(signed, 200);
        const file = await fetch(env.base + signed.json.url); assert.equal(file.status, 200); assert.deepEqual(Buffer.from(await file.arrayBuffer()), photo);
        assert.match(file.headers.get('content-disposition'), /attachment/);
        assert.equal((await fetch(env.base + '/api/buyer-portal/files/' + id + '?kind=payment')).status, 401);
        const denied = await adminApi('GET', '/sales/' + a.sale._id + '/payment-proofs', undefined, fixture.sessions[1].token); status(denied, 403);
    });
    await test('concurrent accreditation creates exactly one income and account credit; retries reuse it', async () => {
        const buyer = await create(), sent = await upload(buyer, { amount: '250' }), id = sent.json.proof.id;
        const results = await Promise.all([review(id, { action: 'confirm', accountId: String(buyer.account._id), paymentMethod: 'transferencia' }),
            review(id, { action: 'confirm', accountId: String(buyer.account._id), paymentMethod: 'transferencia' })]);
        results.forEach(result => status(result, 200));
        const ids = results.map(result => result.json.proof.transactionId); assert.equal(new Set(ids).size, 1);
        assert.equal(await Transaction.countDocuments({ buyerPaymentProofId: id }), 1);
        assert.equal(await CollectionRecordingOperation.countDocuments({ transactionId: ids[0] }), 1);
        assert.equal((await Account.findById(buyer.account._id)).balance, 250);
        status(await review(id, { action: 'confirm', accountId: String(buyer.account._id) }), 200);
        assert.equal((await Account.findById(buyer.account._id)).balance, 250);
    });
    await test('linking an existing collection reuses account and installment effects and rejects wrong movements', async () => {
        const buyer = await create(), other = await create(), sent = await upload(buyer, { amount: '300' });
        const existing = await env.call('POST', '/api/admin/transactions', { type: 'ingreso', amount: 300, currency: 'ARS', concept: 'Cobro manual venta', category: 'Cobro venta',
            saleId: buyer.sale._id, clientId: buyer.client._id, vehicleId: buyer.car._id, accountId: buyer.account._id, paymentDestination: 'purchase', idempotencyKey: crypto.randomUUID() }, adminToken);
        status(existing, 201); const txId = existing.json._id;
        const before = await Transaction.countDocuments();
        status(await review(sent.json.proof.id, { action: 'link', transactionId: txId }), 200);
        status(await review(sent.json.proof.id, { action: 'link', transactionId: txId }), 200);
        assert.equal(await Transaction.countDocuments(), before); assert.equal((await Account.findById(buyer.account._id)).balance, 300);
        const wrong = await Transaction.create({ type: 'Ingreso', amount: 300, currency: 'ARS', concept: 'Otro comprador', description: 'Otro', category: 'Cobro venta', accountId: other.account._id,
            saleId: other.sale._id, clientId: other.client._id, vehicleId: other.car._id, status: 'activo' });
        const next = await upload(buyer, { amount: '300', concept: 'Segundo comprobante', buffer: pdf });
        status(await review(next.json.proof.id, { action: 'link', transactionId: String(wrong._id) }), 409);
        status(await review(next.json.proof.id, { action: 'link', transactionId: txId }), 200);
        assert.equal((await Account.findById(buyer.account._id)).balance, 300);
    });
    await test('partial installment payment uses the same circuit and original USD account/currency', async () => {
        const buyer = await create({ currency: 'USD' });
        const installment = await Installment.create({ saleId: buyer.sale._id, clientId: buyer.client._id, vehicleId: buyer.car._id,
            installmentNumber: 1, dueDate: new Date(), amount: 1000, currency: 'USD', status: 'pendiente' });
        const sent = await upload(buyer, { amount: '250', targetType: 'installment', targetId: String(installment._id) });
        status(sent, 200); status(await review(sent.json.proof.id, { action: 'confirm', accountId: String(buyer.account._id) }), 200);
        let stored = await Installment.findById(installment._id); assert.equal(stored.paidAmount, 250); assert.equal(stored.status, 'parcial');
        const legacy = await env.call('POST', '/api/admin/installments/' + installment._id + '/pay', { amount: 250, accountId: buyer.account._id, idempotencyKey: 'legacy-' + crypto.randomUUID() }, adminToken);
        status(legacy, 200); stored = await Installment.findById(installment._id); assert.equal(stored.paidAmount, 500);
        const excess = await upload(buyer, { amount: '501', targetType: 'installment', targetId: String(installment._id), concept: 'Exceso' });
        status(excess, 200); status(await review(excess.json.proof.id, { action: 'confirm', accountId: String(buyer.account._id) }), 409);
        assert.equal((await Account.findById(buyer.account._id)).balance, 500);
        const wrongCurrency = await Account.create({ name: 'ARS para rechazo', currency: 'ARS', balance: 0 });
        status(await review(excess.json.proof.id, { action: 'confirm', accountId: String(wrongCurrency._id) }), 409);
        const cancelled = await Promise.all([env.call('DELETE', '/api/admin/transactions/' + sent.json.proof.id, undefined, adminToken), env.call('DELETE', '/api/admin/transactions/' + sent.json.proof.id, undefined, adminToken)]);
        cancelled.forEach(result => status(result, 200));
        assert.equal((await Installment.findById(installment._id)).paidAmount, 250);
        assert.equal((await Account.findById(buyer.account._id)).balance, 250);
    });
    await test('procedure and deposit receipts keep their destination and do not double count a recorded deposit', async () => {
        const buyer = await create();
        const reservation = await Reservation.create({ vehicleId: buyer.car._id, clientId: buyer.client._id, agreedPrice: 10000, agreedCurrency: 'ARS',
            depositAmount: 1000, depositCurrency: 'ARS', depositMethod: 'transferencia', expiresAt: new Date(Date.now() + 86400000), status: 'convertida' });
        await Sale.updateOne({ _id: buyer.sale._id }, { $set: { reservationId: reservation._id, depositAppliedAmount: 1000, depositAppliedCurrency: 'ARS' } });
        const deposit = await upload(buyer, { amount: '400', targetType: 'deposit' }); status(deposit, 200);
        status(await review(deposit.json.proof.id, { action: 'confirm', accountId: String(buyer.account._id) }), 200);
        const procedure = await Gestoria.create({ title: 'Trámite prueba', type: 'Transferencia Egreso', saleId: buyer.sale._id, clientId: buyer.client._id, vehicleId: buyer.car._id,
            clientChargeAmount: 300, chargedAmount: 0, currency: 'ARS', status: 'Pendiente' });
        const before = await buyerApi(buyer, 'GET', '/payments');
        const mainBefore = before.json.pendingTargets.find(target => target.type === 'purchase').pendingAmount;
        const fee = await upload(buyer, { amount: '200', targetType: 'gestoria', targetId: String(procedure._id) }); status(fee, 200);
        status(await review(fee.json.proof.id, { action: 'confirm', accountId: String(buyer.account._id) }), 200);
        const after = await buyerApi(buyer, 'GET', '/payments');
        assert.equal(after.json.pendingTargets.find(target => target.type === 'purchase').pendingAmount, mainBefore);
        assert.equal(after.json.pendingTargets.find(target => target.type === 'deposit').recordableAmount, 600);
        assert.equal(after.json.pendingTargets.find(target => target.type === 'deposit').pendingAmount, undefined);
        assert.equal(after.json.pendingTargets.find(target => target.type === 'gestoria').pendingAmount, 100);
        assert.equal((await Account.findById(buyer.account._id)).balance, 600);
        assert.equal((await Transaction.findById(fee.json.proof.transactionId || (await BuyerPaymentProof.findById(fee.json.proof.id)).transactionId)).paymentDestination, 'gestoria');
    });
    await test('correction stays visible without money effects and replaced private files cannot be read by the buyer', async () => {
        const buyer = await create(), sent = await upload(buyer), id = sent.json.proof.id;
        const signed = await buyerApi(buyer, 'POST', '/payments/' + id + '/access', {}); status(signed, 200);
        status(await review(id, { action: 'correction', comment: 'La imagen no muestra la transferencia completa.' }), 200);
        const data = await buyerApi(buyer, 'GET', '/payments'); assert.equal(data.json.proofs[0].status, 'correction_requested'); assert.match(data.json.proofs[0].comment, /transferencia completa/);
        assert.equal(await Transaction.countDocuments({ saleId: buyer.sale._id }), 0);
        const updated = await upload(buyer, { replacesId: id, buffer: pdf }); status(updated, 200); assert.notEqual(updated.json.proof.id, id);
        assert.equal((await fetch(env.base + signed.json.url)).status, 404);
        status(await review(id, { action: 'confirm', accountId: String(buyer.account._id) }), 409);
        status(await review(updated.json.proof.id, { action: 'confirm', accountId: String(buyer.account._id) }), 200);
    });
    await test('procedure expected total is separate from historical receipts and accreditation/reversal update it once', async () => {
        const buyer = await create();
        const procedure = await Gestoria.create({ title: 'Gestoría con pago previo', type: 'Transferencia Egreso', saleId: buyer.sale._id,
            clientId: buyer.client._id, vehicleId: buyer.car._id, cost: 999, chargedAmount: 100, currency: 'ARS' });
        let data = await buyerApi(buyer, 'GET', '/payments');
        assert.equal(data.json.pendingTargets.some(target => target.type === 'gestoria'), false, 'received money and cost never create a debt');
        await Gestoria.updateOne({ _id: procedure._id }, { $set: { clientChargeAmount: 300 } });
        data = await buyerApi(buyer, 'GET', '/payments');
        assert.equal(data.json.pendingTargets.find(target => target.type === 'gestoria').pendingAmount, 200);
        const sent = await upload(buyer, { amount: '150', targetType: 'gestoria', targetId: String(procedure._id) }); status(sent, 200);
        const confirmations = await Promise.all([review(sent.json.proof.id, { action: 'confirm', accountId: String(buyer.account._id) }), review(sent.json.proof.id, { action: 'confirm', accountId: String(buyer.account._id) })]);
        confirmations.forEach(result => status(result, 200));
        assert.equal((await Gestoria.findById(procedure._id)).chargedAmount, 250);
        const { updateGestoria, createGestoriaNotificationIndexes } = await import('../../src/services/gestoriaStatusService.js');
        await createGestoriaNotificationIndexes();
        await assert.rejects(updateGestoria(admin, String(procedure._id), { chargedAmount: 100, collectionRevision: 0 }), error => error.status === 409);
        assert.equal((await Gestoria.findById(procedure._id)).chargedAmount, 250, 'an old edit form cannot overwrite a newly accredited payment');
        const txId = confirmations[0].json.proof.transactionId;
        status(await env.call('PATCH', '/api/admin/transactions/' + txId, { amount: 151 }, adminToken), 409);
        const results = await Promise.all([env.call('DELETE', '/api/admin/transactions/' + txId, undefined, adminToken), env.call('DELETE', '/api/admin/transactions/' + txId, undefined, adminToken)]);
        results.forEach(result => status(result, 200));
        assert.equal((await Gestoria.findById(procedure._id)).chargedAmount, 100);
        assert.equal((await Account.findById(buyer.account._id)).balance, 0);
        data = await buyerApi(buyer, 'GET', '/payments');
        assert.equal(data.json.pendingTargets.find(target => target.type === 'gestoria').pendingAmount, 200);
        assert.equal(data.json.proofs[0].transactionStatus, 'anulado');
        status(await review(sent.json.proof.id, { action: 'confirm', accountId: String(buyer.account._id) }), 200);
        assert.equal((await Account.findById(buyer.account._id)).balance, 0, 'old accreditation retry cannot resurrect an annulled income');
    });
    await test('already recorded procedures and paid installments remain selectable for linking without receiving money again', async () => {
        const buyer = await create();
        const procedure = await Gestoria.create({ title: 'Gestoría ya cobrada', type: 'Transferencia Egreso', saleId: buyer.sale._id,
            clientId: buyer.client._id, vehicleId: buyer.car._id, clientChargeAmount: 300, chargedAmount: 300, currency: 'ARS' });
        const old = await Transaction.create({ type: 'Ingreso', module: 'crm_v2', amount: 300, currency: 'ARS', description: 'Gestoría histórica',
            category: 'Gestoría', accountId: buyer.account._id, saleId: buyer.sale._id, clientId: buyer.client._id, vehicleId: buyer.car._id, status: 'activo' });
        await Account.updateOne({ _id: buyer.account._id }, { $set: { balance: 300 } });
        const sent = await upload(buyer, { amount: '300', targetType: 'gestoria', targetId: String(procedure._id) }); status(sent, 200);
        status(await review(sent.json.proof.id, { action: 'confirm', accountId: String(buyer.account._id) }), 409);
        status(await review(sent.json.proof.id, { action: 'link', transactionId: String(old._id) }), 200);
        assert.equal((await Account.findById(buyer.account._id)).balance, 300);
        assert.equal((await Gestoria.findById(procedure._id)).chargedAmount, 300);
        assert.equal((await Transaction.findById(old._id)).paymentDestination, 'gestoria');
        const installment = await Installment.create({ saleId: buyer.sale._id, installmentNumber: 1, dueDate: new Date(), amount: 100, paidAmount: 100, currency: 'ARS', status: 'pagada' });
        const data = await buyerApi(buyer, 'GET', '/payments');
        assert.ok(data.json.pendingTargets.find(target => target.type === 'gestoria').recorded);
        assert.ok(data.json.pendingTargets.find(target => target.id === String(installment._id)).recorded);
        assert.equal(await Transaction.countDocuments({ saleId: buyer.sale._id }), 1);
    });
    console.log(`PASS: ${passed} payment-proof integration scenarios; no real accounts, files or email services used.`);
} finally { await env.stop(); }
