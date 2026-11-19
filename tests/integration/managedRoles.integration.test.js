// Required staff sections and owner-authorized intake, entirely on disposable data.
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
    const { seedManagedRoles } = await import('../fixtures/managedRolesFixtures.js');
    const { sellerAccessPassword } = await import('../fixtures/sellerAccessFixtures.js');
    const fixture = await seedManagedRoles(env.models);
    const { users, sessions, sales, cars, clients } = fixture;
    const api = (index, method, route, body, headers = {}) => env.call(method, route, body, sessions[index].token, headers);
    const check = (response, status, context = '') => assert.equal(response.status, status, context + ' ' + JSON.stringify(response.json));
    const test = async (name, callback) => { await callback(); console.log(`ok ${++passed} - ${name}`); };
    const rows = response => Array.isArray(response.json) ? response.json : response.json.items || response.json.data || response.json.sales;
    const ids = values => values.map(value => String(value._id)).sort();
    const requestId = response => String(response.json.approval?._id || response.json._id || '');
    const noInternalFingerprint = response => assert.doesNotMatch(JSON.stringify(response.json), /intakeFingerprint|requestFingerprint|dedupeHash|passwordHash/);
    const key = () => ({ 'Idempotency-Key': crypto.randomUUID() });
    async function submitVehicle(index, fields, headers) {
        const form = new FormData();
        for (const [name, value] of Object.entries(fields)) form.set(name, typeof value === 'object' ? JSON.stringify(value) : String(value));
        const response = await fetch(env.base + '/api/admin/intake/vehicles', { method: 'POST',
            headers: { Authorization: 'Bearer ' + sessions[index].token, ...headers }, body: form });
        return { status: response.status, json: await response.json().catch(() => ({})) };
    }
    const vehicle = { brand: 'AltaQA', name: 'Solicitada ficticia', year: 2024, km: 1000, fuel: 'Nafta', condition: 'Usado',
        price: 20000000, currency: 'ARS', plateOrVin: 'QAALTA01', purchasePrice: 14000000, purchaseCurrency: 'ARS',
        visibleEnWeb: true, status: 'Vendido', sold: true, purchasePayments: [{ amount: 14000000, currency: 'ARS' }] };
    let vehicleRequest, clientRequest;

    await test('both staff profiles receive their login code at their own address and cannot enter with only a pending challenge', async () => {
        for (const index of [2, 3]) {
            const pending = await env.call('POST', '/api/login', { email: users[index].email, password: sellerAccessPassword }); check(pending, 200);
            assert.ok(pending.json.challengeId); assert.ok(!pending.json.token);
            const mail = env.mailbox.at(-1); assert.equal(mail.to, users[index].email);
            const code = mail.html.match(/>\s*(\d{6})\s*</)?.[1]; assert.ok(Boolean(code));
            check(await env.call('GET', '/api/admin/clients', undefined, pending.json.challengeId), 401);
            const verified = await env.call('POST', '/api/login/email/verify', { challengeId: pending.json.challengeId, code }); check(verified, 200);
            assert.ok(verified.json.token);
            check(await env.call('GET', '/api/admin/auth/me', undefined, verified.json.token), 200);
        }
    });
    await test('both assignable profiles load their required APIs without gaining global Stock, Dashboard or finance access', async () => {
        for (const index of [2, 3]) {
            for (const route of ['/api/admin/clients', '/api/admin/stock/negotiation', '/api/admin/sales', '/api/admin/my-commissions',
                '/api/admin/opportunities', '/api/admin/crm-tasks', '/api/admin/my-space/assets']) check(await api(index, 'GET', route), 200, `${users[index].role} ${route}`);
            for (const route of ['/api/admin/dashboard', '/api/admin/cars', '/api/admin/cars/' + cars[5]._id,
                '/api/admin/transactions', '/api/admin/installments', '/api/admin/team-dashboard']) check(await api(index, 'GET', route), 403);
            check(await api(index, 'GET', '/api/admin/auth/me'), 200);
        }
    });
    await test('own sales, private notes and commissions remain scoped by authenticated account ID', async () => {
        for (const [offset, index] of [2, 3].entries()) {
            const own = await api(index, 'GET', '/api/admin/sales?scope=all&sellerId=' + users[1]._id); check(own, 200);
            assert.deepEqual(ids(rows(own)), [String(sales[offset]._id)]);
            check(await api(index, 'GET', '/api/admin/sales/' + sales[1 - offset]._id), 404);
            const notes = await api(index, 'GET', '/api/admin/crm-tasks?scope=my-space&assignedTo=' + users[1]._id); check(notes, 200);
            assert.deepEqual(ids(rows(notes)), [String(fixture.tasks[offset]._id)]);
            const commissions = await api(index, 'GET', '/api/admin/my-commissions?username=' + users[1].name); check(commissions, 200);
            assert.ok(!JSON.stringify(commissions.json).includes(String(sales[1 - offset]._id)));
        }
    });
    await test('case-management access exposes operational files without global financial or Stock-cost details', async () => {
        for (const [offset, index] of [2, 3].entries()) {
            const response = await api(index, 'GET', '/api/admin/gestoria/sales'); check(response, 200);
            const expected = index === 2 ? [sales[offset]] : sales;
            assert.deepEqual(ids(rows(response)), ids(expected));
            assert.doesNotMatch(JSON.stringify(response.json), /purchasePrice|purchaseCurrency|purchasePaymentState|jointOwnership|PRIVADO-QA/);
            const own = await api(index, 'GET', '/api/admin/gestoria/sales/' + sales[offset]._id); check(own, 200);
            assert.doesNotMatch(JSON.stringify(own.json), /purchasePrice|purchaseCurrency|purchasePaymentState|jointOwnership|PRIVADO-QA/);
        }
        check(await api(2, 'GET', '/api/admin/gestoria/sales/' + sales[1]._id), 404);
        check(await api(3, 'GET', '/api/admin/gestoria/sales/' + sales[0]._id), 200);
        check(await api(3, 'GET', '/api/admin/buyer-portal/sales/' + sales[0]._id + '/delivery-documents'), 200);
        check(await api(3, 'POST', '/api/admin/buyer-portal/delivery-documents/' + fixture.deliveryDocuments[0]._id + '/access', { download: true }), 200);
        check(await api(2, 'POST', '/api/admin/buyer-portal/delivery-documents/' + fixture.deliveryDocuments[1]._id + '/access', { download: true }), 404);
        const restrictedPayments = await api(3, 'GET', '/api/admin/buyer-portal/sales/' + sales[0]._id + '/payment-proofs');
        assert.ok([403, 404].includes(restrictedPayments.status));
    });
    await test('operational file editing preserves commercial data and repeated saves do not duplicate its audit', async () => {
        const before = await env.models.Sale.findById(sales[0]._id).lean();
        const body = { expedienteStatus: 'observado', documentationStatus: 'parcial' };
        check(await api(3, 'PATCH', '/api/admin/gestoria/sales/' + sales[0]._id, body), 200);
        const first = await env.models.Sale.findById(sales[0]._id).lean();
        check(await api(3, 'PATCH', '/api/admin/gestoria/sales/' + sales[0]._id, body), 200);
        const repeated = await env.models.Sale.findById(sales[0]._id).lean();
        assert.equal(repeated.saleAuditLog.length, first.saleAuditLog.length);
        assert.ok(repeated.saleAuditLog.length > before.saleAuditLog.length);
        for (const field of ['salePrice', 'saleCurrency', 'status', 'clientId', 'vehicleId', 'assignedTo']) assert.equal(String(repeated[field]), String(before[field]));
        check(await api(3, 'PATCH', '/api/admin/gestoria/sales/' + sales[0]._id, { salePrice: 1, assignedTo: String(users[3]._id) }), 400);
        check(await api(2, 'PATCH', '/api/admin/gestoria/sales/' + sales[1]._id, body), 404);
        const after = await env.models.Sale.findById(sales[0]._id).lean(); assert.equal(after.salePrice, before.salePrice);
    });
    await test('seller vehicle submission is pending, idempotent and cannot directly change inventory or finances', async () => {
        const before = { cars: await env.models.Car.countDocuments(), transactions: await env.models.Transaction.countDocuments() };
        const headers = key();
        const simultaneous = await Promise.all([0, 1].map(() => submitVehicle(2, vehicle, headers)));
        const first = simultaneous[0]; check(first, 202); assert.equal(first.json.pendingApproval, true);
        noInternalFingerprint(first);
        vehicleRequest = requestId(first); assert.match(vehicleRequest, /^[a-f\d]{24}$/i);
        check(simultaneous[1], 202); assert.equal(requestId(simultaneous[1]), vehicleRequest);
        const repeated = await submitVehicle(2, vehicle, headers); check(repeated, 202); assert.equal(requestId(repeated), vehicleRequest);
        check(await submitVehicle(2, { ...vehicle, price: 21000000 }, headers), 409);
        assert.deepEqual({ cars: await env.models.Car.countDocuments(), transactions: await env.models.Transaction.countDocuments() }, before);
        check(await api(2, 'POST', '/api/cars', vehicle), 403);
        check(await submitVehicle(3, vehicle, key()), 403);
        const request = await env.models.ApprovalRequest.findById(vehicleRequest).lean();
        assert.equal(request.status, 'pending'); assert.equal(request.actionType, 'CREATE_STOCK_VEHICLE');
        assert.equal(String(request.requester), String(users[2]._id));
        assert.equal(await env.models.Car.findById(request.entityId), null);
    });
    await test('seller client submission waits for approval and ignores a forged requester or approved status', async () => {
        const count = await env.models.Client.countDocuments(), headers = key();
        const body = { firstName: 'Cliente pendiente QA', lastName: 'Ficticio', phone: '990001234', email: 'pendiente@example.test',
            requester: String(users[1]._id), status: 'approved', approved: true };
        const first = await api(2, 'POST', '/api/admin/clients', body, headers); check(first, 202); assert.equal(first.json.pendingApproval, true);
        noInternalFingerprint(first);
        clientRequest = requestId(first); assert.match(clientRequest, /^[a-f\d]{24}$/i);
        const repeated = await api(2, 'POST', '/api/admin/clients', body, headers); check(repeated, 202); assert.equal(requestId(repeated), clientRequest);
        check(await api(2, 'POST', '/api/admin/clients', { ...body, firstName: 'Distinto QA' }, headers), 409);
        assert.equal(await env.models.Client.countDocuments(), count);
        const request = await env.models.ApprovalRequest.findById(clientRequest).lean();
        assert.equal(request.status, 'pending'); assert.equal(request.actionType, 'CREATE_CLIENT');
        assert.equal(String(request.requester), String(users[2]._id)); assert.equal(await env.models.Client.findById(request.entityId), null);
        const listed = await api(2, 'GET', '/api/admin/clients'); check(listed, 200);
        assert.ok(!JSON.stringify(listed.json).includes('Cliente pendiente QA'));
    });
    await test('only owner can approve an intake request, even when another profile has explicit approval permissions', async () => {
        for (const index of [0, 2, 3]) check(await api(index, 'PATCH', '/api/admin/approvals/' + vehicleRequest, { status: 'approved' }), 403);
        check(await api(3, 'GET', '/api/admin/approvals'), 403);
        const pending = await env.models.ApprovalRequest.findById(vehicleRequest).lean(); assert.equal(pending.status, 'pending');
        const previousPermissions = users[3].permissions;
        await env.models.AdminUser.updateOne({ _id: users[3]._id }, { $set: { permissions: ['approvals.read', 'approvals.write'] } });
        try {
            const foreign = await api(3, 'GET', '/api/admin/approvals?scope=all&requester=' + users[2]._id); check(foreign, 200);
            assert.ok(!JSON.stringify(foreign.json).includes(vehicleRequest)); assert.ok(!JSON.stringify(foreign.json).includes(clientRequest));
            check(await api(3, 'PATCH', '/api/admin/approvals/' + vehicleRequest, { status: 'approved' }), 403);
        }
        finally { await env.models.AdminUser.updateOne({ _id: users[3]._id }, { $set: { permissions: previousPermissions } }); }
    });
    await test('malformed intake requests and generic approval forgery cannot create a pending or active record', async () => {
        const counts = [await env.models.ApprovalRequest.countDocuments(), await env.models.Car.countDocuments(), await env.models.Client.countDocuments()];
        check(await submitVehicle(2, vehicle, {}), 400);
        check(await submitVehicle(2, { ...vehicle, name: '' }, key()), 400);
        check(await api(2, 'POST', '/api/admin/clients', { firstName: 'Sin clave QA', phone: '990004567' }), 400);
        check(await api(2, 'POST', '/api/admin/clients', {}, key()), 400);
        check(await api(2, 'POST', '/api/admin/approvals', { actionType: 'CREATE_STOCK_VEHICLE', entityType: 'Car',
            entityId: String(cars[5]._id), summary: 'Forjada QA', reason: 'No autorizada', intakePayload: vehicle }), 400);
        assert.deepEqual([await env.models.ApprovalRequest.countDocuments(), await env.models.Car.countDocuments(), await env.models.Client.countDocuments()], counts);
    });
    await test('alternative sale, bulk and trade-in creation paths cannot bypass the seller’s approval requirement', async () => {
        const counts = [await env.models.Car.countDocuments(), await env.models.Client.countDocuments()];
        for (const route of ['/api/admin/clients/bulk', '/api/admin/sales/' + sales[0]._id + '/create-link-client',
            '/api/admin/sales/' + sales[0]._id + '/create-link-vehicle', '/api/admin/sales/' + sales[0]._id + '/trade-ins/0/create-stock-car']) {
            check(await api(2, 'POST', route, { ...vehicle, firstName: 'Cliente de atajo QA', phone: '990004568' }), 403, route);
        }
        check(await api(2, 'POST', '/api/admin/sales', { vehicleId: String(cars[5]._id), buyerName: 'Cliente de atajo QA',
            buyerPhone: '990004568', salePrice: 20000000, saleCurrency: 'ARS', status: 'confirmada' }), 409);
        assert.deepEqual([await env.models.Car.countDocuments(), await env.models.Client.countDocuments()], counts);
    });
    await test('owner approval creates one usable, unpublished vehicle even after simultaneous approval retries', async () => {
        const count = await env.models.Car.countDocuments(), transactions = await env.models.Transaction.countDocuments();
        const approvals = await Promise.all([0, 1].map(() => api(1, 'PATCH', '/api/admin/approvals/' + vehicleRequest, { status: 'approved', resolutionNotes: 'Revisado QA' })));
        for (const result of approvals) check(result, 200);
        const request = await env.models.ApprovalRequest.findById(vehicleRequest).lean(); assert.equal(request.status, 'executed');
        assert.equal(String(request.approver), String(users[1]._id));
        assert.equal(await env.models.Car.countDocuments(), count + 1); assert.equal(await env.models.Transaction.countDocuments(), transactions);
        const created = await env.models.Car.findById(request.entityId).lean(); assert.ok(created);
        assert.equal(created.brand, vehicle.brand); assert.equal(created.name, vehicle.name); assert.equal(created.status, 'Disponible');
        assert.equal(created.visibleEnWeb, false); assert.notEqual(created.sold, true);
        const negotiation = await api(2, 'GET', '/api/admin/stock/negotiation?search=QAALTA01'); check(negotiation, 200);
        assert.ok(JSON.stringify(negotiation.json).includes(String(request.entityId)));
    });
    await test('owner approval creates exactly one client and the same client appears in existing selectors', async () => {
        const count = await env.models.Client.countDocuments();
        const result = await api(1, 'PATCH', '/api/admin/approvals/' + clientRequest, { status: 'approved' }); check(result, 200);
        const repeated = await api(1, 'PATCH', '/api/admin/approvals/' + clientRequest, { status: 'approved' }); check(repeated, 200);
        assert.equal(await env.models.Client.countDocuments(), count + 1);
        const request = await env.models.ApprovalRequest.findById(clientRequest).lean(); assert.equal(request.status, 'executed');
        const client = await env.models.Client.findById(request.entityId).lean(); assert.equal(client.firstName, 'Cliente pendiente QA');
        const listed = await api(2, 'GET', '/api/admin/clients'); check(listed, 200); assert.ok(JSON.stringify(listed.json).includes(String(client._id)));
    });
    await test('rejection needs a comment and cannot later execute; cancellation is restricted to the requester or owner', async () => {
        const count = await env.models.Car.countDocuments();
        const rejected = await submitVehicle(2, { ...vehicle, plateOrVin: 'QARECH01' }, key()); check(rejected, 202);
        const id = requestId(rejected);
        check(await api(1, 'PATCH', '/api/admin/approvals/' + id, { status: 'rejected' }), 400);
        check(await api(1, 'PATCH', '/api/admin/approvals/' + id, { status: 'rejected', resolutionNotes: 'Falta revisar el costo QA' }), 200);
        check(await api(1, 'PATCH', '/api/admin/approvals/' + id, { status: 'approved' }), 409);
        const cancelled = await submitVehicle(2, { ...vehicle, plateOrVin: 'QACANCEL' }, key()); check(cancelled, 202);
        check(await api(3, 'PATCH', '/api/admin/approvals/' + requestId(cancelled), { status: 'cancelled' }), 403);
        check(await api(2, 'PATCH', '/api/admin/approvals/' + requestId(cancelled), { status: 'cancelled' }), 200);
        assert.equal(await env.models.Car.countDocuments(), count);
    });
    await test('Configuration can assign the new profile while staff cannot promote themselves or edit other accounts', async () => {
        const body = { name: 'Perfil nuevo ficticio QA', email: 'perfil.nuevo@example.test', password: 'Solo-Ficticio-QA-2026!', role: 'gestoria_contabilidad', permissions: [] };
        const created = await api(1, 'POST', '/api/admin/users', body); check(created, 201); assert.equal(created.json.role, 'gestoria_contabilidad');
        const id = created.json._id;
        const updated = await api(1, 'PATCH', '/api/admin/users/' + id, { role: 'ventas', permissions: [] }); check(updated, 200); assert.equal(updated.json.role, 'ventas');
        check(await api(0, 'PATCH', '/api/admin/users/' + users[0]._id, { role: 'owner' }), 403);
        check(await api(0, 'PATCH', '/api/admin/users/' + users[1]._id, { name: 'No autorizado QA' }), 403);
        for (const index of [2, 3]) {
            check(await api(index, 'POST', '/api/admin/users', { ...body, email: 'no-permitido-' + index + '@example.test' }), 403);
            check(await api(index, 'PATCH', '/api/admin/users/' + users[index]._id, { role: 'owner', permissions: ['usuarios.write'] }), 403);
            check(await api(index, 'GET', '/api/admin/auth/me'), 200);
        }
    });
    await test('ambiguous historic commission names do not disclose another account’s settlements', async () => {
        await env.models.AdminUser.create({ name: '  LUCAS FICTICIO QA  ', email: 'homonimo.inactivo@example.test',
            role: 'ventas', active: false, passwordHash: users[2].passwordHash });
        await env.models.Settlement.create({ period: '2026-11', type: 'ventas', username: users[2].name,
            totalAmount: 200000, currency: 'ARS', status: 'aprobada', createdBy: users[1].name,
            includedSales: [{ saleId: sales[0]._id, amount: 100000 }, { saleId: sales[1]._id, amount: 100000, notes: 'DETALLE-AJENO-QA' }] });
        const pending = await env.models.Sale.create({ vehicleId: cars[5]._id, clientId: clients[0]._id,
            assignedTo: users[2]._id, salesperson: users[2].name, salePrice: 20000000, saleCurrency: 'ARS', status: 'confirmada' });
        const result = await api(2, 'GET', '/api/admin/my-commissions?seller=' + users[3].name); check(result, 200);
        assert.deepEqual(result.json.settlements, []); assert.ok(result.json.warning);
        assert.deepEqual(ids(result.json.pendingSales), [String(pending._id)]);
        assert.ok(!JSON.stringify(result.json).includes('DETALLE-AJENO-QA'));
        assert.ok(!JSON.stringify(result.json).includes(String(sales[1]._id)));
        assert.doesNotMatch(JSON.stringify(result.json), /purchasePrice|purchaseCurrency|jointOwnership|investor/);
    });
    assert.ok(clients.length === 2);
    console.log(`PASS: ${passed} isolated managed-role and owner-approval scenarios; no real users, mail or production data.`);
} finally { globalThis.fetch = originalFetch; await env.stop(); }
