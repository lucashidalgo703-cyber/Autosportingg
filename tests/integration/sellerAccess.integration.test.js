// Real Express authorization against disposable MongoDB; no production accounts or services.
import assert from 'node:assert/strict';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica();
const localFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
    assert.match(String(input?.url || input), /^http:\/\/127\.0\.0\.1:/, 'Only the disposable loopback server may be contacted');
    return localFetch(input, options);
};
let passed = 0;
try {
    const { seedSellerAccess } = await import('../fixtures/sellerAccessFixtures.js');
    const fixture = await seedSellerAccess(env.models);
    const { users, sessions, sales, cars, clients, reservations, deliveryDocuments, paymentProofs } = fixture;
    const sellers = [2, 3], leaders = [0, 1];
    const test = async (name, callback) => { await callback(); console.log(`ok ${++passed} - ${name}`); };
    const api = (index, method, route, body) => env.call(method, route, body, sessions[index].token);
    const check = (response, status) => assert.equal(response.status, status, JSON.stringify(response.json));
    const ids = rows => rows.map(row => String(row._id)).sort();
    const rows = response => Array.isArray(response.json) ? response.json : response.json.items || response.json.quotes || response.json.data;

    await test('even an explicitly overprivileged seller cannot read Dashboard APIs or general Stock', async () => {
        const blocked = ['/api/admin/dashboard', '/api/admin/dashboard/upcoming-dues', '/api/stats/dashboard',
            '/api/admin/team-dashboard', '/api/admin/team-dashboard/' + users[3]._id,
            '/api/admin/cars', '/api/admin/cars/export', '/api/admin/cars/' + cars[5]._id,
            '/api/admin/cars/' + cars[5]._id + '/linkable-expenses', '/api/admin/stock/capital-summary', '/api/admin/exports/stock'];
        for (const index of sellers) for (const route of blocked) {
            const response = await api(index, 'GET', route);
            check(response, 403); assert.ok(!JSON.stringify(response.json).includes('PRIVADO-QA'));
        }
    });
    await test('Mis Ventas API scopes by authenticated seller ID, excluding namesakes and records without ownership IDs', async () => {
        for (const [offset, index] of sellers.entries()) {
            const result = await api(index, 'GET', '/api/admin/sales'); check(result, 200);
            assert.deepEqual(ids(rows(result)), [String(sales[offset]._id)]);
            const own = await api(index, 'GET', '/api/admin/sales/' + sales[offset]._id); check(own, 200);
            assert.doesNotMatch(JSON.stringify(own.json.vehicleId), /purchasePrice|purchaseCurrency|expenses|investor|jointOwnership|tradeInOrigin/);
            for (const foreign of sales.filter((_, saleIndex) => saleIndex !== offset)) {
                check(await api(index, 'GET', '/api/admin/sales/' + foreign._id), 404);
                check(await api(index, 'GET', '/api/admin/sales/' + foreign._id + '/treasury-summary'), 404);
            }
            const injection = new URLSearchParams({ sellerId: String(users[index === 2 ? 3 : 2]._id), assignedTo: String(users[index === 2 ? 3 : 2]._id), mine: 'false', scope: 'all', userId: String(users[1]._id) });
            const queried = await api(index, 'GET', '/api/admin/sales?' + injection); check(queried, 200);
            assert.deepEqual(ids(rows(queried)), [String(sales[offset]._id)], 'query strings must not replace authenticated ownership');
            const foreignFilter = await api(index, 'GET', '/api/admin/sales?clientId=' + clients[1 - offset]._id); check(foreignFilter, 200);
            assert.deepEqual(rows(foreignFilter), []);
        }
    });
    await test('reservation lists and details cannot reveal another seller’s operation', async () => {
        for (const [offset, index] of sellers.entries()) {
            const route = 'reservations', records = reservations;
            const own = await api(index, 'GET', '/api/admin/' + route); check(own, 200);
            assert.deepEqual(ids(rows(own)), [String(records[offset]._id)]);
            check(await api(index, 'GET', '/api/admin/' + route + '/' + records[1 - offset]._id), 404);
            const injection = await api(index, 'GET', '/api/admin/' + route + '?sellerId=' + users[index === 2 ? 3 : 2]._id + '&scope=all');
            check(injection, 200); assert.deepEqual(ids(rows(injection)), [String(records[offset]._id)]);
        }
    });
    await test('Mi Espacio personal assets and tasks stay assigned to the current account, with valid sessions after permission denials', async () => {
        const personalAssets = [], personalTasks = [];
        const dueDate = new Date().toISOString().slice(0, 10);
        for (const [offset, index] of sellers.entries()) {
            const foreignSeller = users[index === 2 ? 3 : 2]._id;
            const asset = await api(index, 'POST', '/api/admin/my-space/assets', {
                userId: String(foreignSeller), title: 'Auto personal privado QA ' + offset,
                type: 'auto', brand: 'PersonalQA', model: 'Propio ' + offset, estimatedValue: 1000, currency: 'ARS'
            });
            check(asset, 201); assert.equal(String(asset.json.userId), String(users[index]._id)); personalAssets.push(asset.json);
            const task = await api(index, 'POST', '/api/admin/crm-tasks', {
                assignedTo: String(foreignSeller), title: 'Pendiente personal privado QA ' + offset,
                description: '[MI_ESPACIO_PENDIENTE]\nSólo en la cuenta propia', type: 'general', status: 'pendiente', dueDate
            });
            check(task, 201); assert.equal(String(task.json.assignedTo), String(users[index]._id)); personalTasks.push(task.json);
        }
        const legacy = await env.models.CrmTask.create({ title: 'Privada histórica sin ID QA', description: '[MI_ESPACIO_PENDIENTE]',
            user: users[2].name, dueDate, type: 'general', status: 'pendiente' });
        for (const [offset, index] of sellers.entries()) {
            const foreign = 1 - offset;
            const assets = await api(index, 'GET', '/api/admin/my-space/assets?userId=' + users[index === 2 ? 3 : 2]._id); check(assets, 200);
            assert.deepEqual(ids(rows(assets)), [String(personalAssets[offset]._id)]);
            const tasks = await api(index, 'GET', '/api/admin/crm-tasks?scope=my-space&assignedTo=' + users[index === 2 ? 3 : 2]._id); check(tasks, 200);
            assert.deepEqual(ids(rows(tasks)), [String(personalTasks[offset]._id)]);
            assert.ok(!JSON.stringify(tasks.json).includes(String(legacy._id)));
            const agenda = await api(index, 'GET', '/api/admin/crm-tasks'); check(agenda, 200);
            assert.ok(!JSON.stringify(agenda.json).includes(String(personalTasks[foreign]._id)));
            assert.ok(!JSON.stringify(agenda.json).includes(String(legacy._id)));
            check(await api(index, 'PATCH', '/api/admin/my-space/assets/' + personalAssets[foreign]._id, { title: 'No autorizado' }), 404);
            check(await api(index, 'DELETE', '/api/admin/my-space/assets/' + personalAssets[foreign]._id), 404);
            check(await api(index, 'PATCH', '/api/admin/crm-tasks/' + personalTasks[foreign]._id, { title: 'No autorizado' }), 404);
            check(await api(index, 'DELETE', '/api/admin/crm-tasks/' + personalTasks[foreign]._id), 404);
            const updatedAsset = await api(index, 'PATCH', '/api/admin/my-space/assets/' + personalAssets[offset]._id, { notes: 'Edición propia QA' }); check(updatedAsset, 200);
            assert.equal(String(updatedAsset.json.userId), String(users[index]._id));
            const updatedTask = await api(index, 'PATCH', '/api/admin/crm-tasks/' + personalTasks[offset]._id, { title: 'Edición propia QA ' + offset }); check(updatedTask, 200);
            assert.equal(String(updatedTask.json.assignedTo), String(users[index]._id));
            check(await api(index, 'GET', '/api/admin/cars'), 403);
            check(await api(index, 'GET', '/api/admin/auth/me'), 200);
        }
        for (const route of ['/api/admin/transactions', '/api/admin/installments']) check(await api(3, 'GET', route), 403);
        check(await api(3, 'GET', '/api/admin/auth/me'), 200);
        check(await env.call('GET', '/api/admin/auth/me', undefined, 'invalid-session-token'), 401);
        await env.models.AdminUser.updateOne({ _id: users[3]._id }, { $set: { active: false } });
        try { check(await api(3, 'GET', '/api/admin/auth/me'), 401); }
        finally { await env.models.AdminUser.updateOne({ _id: users[3]._id }, { $set: { active: true } }); }
    });
    await test('a seller cannot assign sales or reservations to another account or convert their reservation', async () => {
        const before = { sales: await env.models.Sale.countDocuments(), reservations: await env.models.Reservation.countDocuments() };
        for (const [offset, index] of sellers.entries()) {
            const foreignSeller = users[index === 2 ? 3 : 2]._id;
            check(await api(index, 'POST', '/api/admin/sales', { assignedTo: foreignSeller }), 403);
            check(await api(index, 'PATCH', '/api/admin/sales/' + sales[offset]._id, { assignedTo: foreignSeller }), 403);
            check(await api(index, 'POST', '/api/admin/reservations', { assignedTo: foreignSeller }), 403);
            check(await api(index, 'PATCH', '/api/admin/reservations/' + reservations[offset]._id, { assignedTo: foreignSeller }), 403);
            check(await api(index, 'POST', '/api/admin/sales', { reservationId: reservations[1 - offset]._id }), 404);
            const search = await api(index, 'GET', '/api/admin/sales/search-for-installments?q=QA&limit=50'); check(search, 200);
            for (const foreign of sales.filter((_, saleIndex) => saleIndex !== offset)) assert.ok(!JSON.stringify(search.json).includes(String(foreign._id)));
        }
        assert.deepEqual({ sales: await env.models.Sale.countDocuments(), reservations: await env.models.Reservation.countDocuments() }, before);
    });
    await test('seller negotiation remains read-only consultation with usable cash-offer simulation', async () => {
        const route = '/api/admin/stock/negotiation';
        const before = await env.models.StockNegotiationPolicy.find({}).lean();
        for (const index of sellers) {
            const list = await api(index, 'GET', route + '?search=QANEGOCIA'); check(list, 200);
            assert.equal(list.json.canConfigure, false); assert.equal(list.json.items.length, 1);
            const unit = list.json.items[0]; assert.equal(unit.id, String(cars[5]._id)); assert.ok(unit.floor > 0);
            const result = await api(index, 'POST', route + '/' + unit.id + '/simulate', { amount: unit.floor }); check(result, 200);
            assert.equal(result.json.status, 'at_floor');
            check(await api(index, 'PUT', route + '/rule', { rule: { mode: 'amount', value: 0 }, expectedRevision: 1 }), 403);
            check(await api(index, 'PUT', route + '/' + unit.id + '/rule', { rule: { mode: 'amount', value: 0 }, expectedRevision: 0 }), 403);
        }
        assert.deepEqual(await env.models.StockNegotiationPolicy.find({}).lean(), before);
    });
    await test('portal configuration, documents and payment proofs cannot bypass operation ownership', async () => {
        for (const [offset, index] of sellers.entries()) {
            const own = String(sales[offset]._id), foreign = String(sales[1 - offset]._id);
            for (const suffix of ['', '/access', '/delivery-documents', '/payment-proofs']) {
                check(await api(index, 'GET', '/api/admin/buyer-portal/sales/' + foreign + suffix), 404);
            }
            check(await api(index, 'GET', '/api/admin/buyer-portal/documents?saleId=' + foreign), 404);
            for (const [route, records] of [['delivery-documents', deliveryDocuments], ['payment-proofs', paymentProofs]]) {
                check(await api(index, 'POST', '/api/admin/buyer-portal/' + route + '/' + records[1 - offset]._id + '/access', { download: true, saleId: own }), 404);
            }
            check(await api(index, 'PATCH', '/api/admin/buyer-portal/sales/' + foreign + '/tracking', { actionRequired: false, latestUpdate: 'Intento QA', nextStep: 'QA' }), 404);
            const ownPortal = await api(index, 'GET', '/api/admin/buyer-portal/sales/' + own); check(ownPortal, 200);
            assert.ok(!JSON.stringify(ownPortal.json).includes(clients[1 - offset].email));
        }
    });
    await test('the sale vehicle selector exposes available units and only the current seller’s reservations without Stock cost details', async () => {
        for (const [offset, index] of sellers.entries()) {
            const response = await api(index, 'GET', '/api/admin/sales/vehicle-options?q=&limit=50'); check(response, 200);
            const content = JSON.stringify(response.json);
            assert.ok(content.includes('QANEGOCIA')); assert.ok(content.includes(cars[3 + offset].plateOrVin));
            assert.ok(!content.includes(cars[4 - offset].plateOrVin), 'another seller’s reserved unit must not reveal their operation');
            assert.doesNotMatch(content, /purchasePrice|purchaseCurrency|expenses|investor|jointOwnership|PRIVADO-QA|Nota interna ficticia/);
        }
    });
    await test('admin and owner retain Dashboard, inventory, all operations and configuration access', async () => {
        for (const index of leaders) {
            check(await api(index, 'GET', '/api/admin/dashboard'), 200);
            check(await api(index, 'GET', '/api/admin/cars'), 200);
            check(await api(index, 'GET', '/api/admin/cars/' + cars[5]._id), 200);
            const allSales = await api(index, 'GET', '/api/admin/sales'); check(allSales, 200); assert.deepEqual(ids(rows(allSales)), ids(sales));
            const negotiation = await api(index, 'GET', '/api/admin/stock/negotiation'); check(negotiation, 200); assert.equal(negotiation.json.canConfigure, true);
        }
    });
    await test('public catalogue list and detail retain marketing fields without exposing internal Stock fields', async () => {
        const template = await env.models.Car.findById(cars[5]._id).lean();
        const publicId = new env.mongoose.Types.ObjectId();
        await env.models.Car.collection.insertOne({ ...template, _id: publicId, visibleEnWeb: true, name: 'Catálogo público QA',
            model: 'Modelo público QA', description: 'Descripción comercial pública QA', equipment: ['Aire acondicionado QA'],
            features: ['Airbag QA'], images: ['/__fixture-media/catalogue-qa.jpg'],
            purchasePaymentState: { totalCost: 14000000, pendingDebt: 7000000, currency: 'ARS' },
            tradeInOrigin: { saleId: sales[0]._id, value: 14000000, currency: 'ARS' },
            investor: { name: 'Socio privado QA', percentage: 40 }, jointOwnership: { agencyCost: 8400000, partnerContribution: 5600000 },
            documentationFiles: { title: 'DOCUMENTO-PRIVADO-QA' }, consignmentValuation: 1234567,
            infoAuto: { brandName: 'PermisosQA', modelName: 'Modelo público QA', versionName: 'Versión pública QA', valor: 123456789 } });
        const list = await env.call('GET', '/api/public/cars'); check(list, 200);
        const listed = list.json.find(car => String(car._id) === String(publicId)); assert.ok(listed);
        const detail = await env.call('GET', '/api/public/cars/' + publicId); check(detail, 200);
        for (const car of [listed, detail.json]) {
            assert.equal(car.brand, template.brand); assert.equal(car.name, 'Catálogo público QA'); assert.equal(car.price, template.price);
            assert.deepEqual(car.images, ['/__fixture-media/catalogue-qa.jpg']);
            assert.doesNotMatch(JSON.stringify(car), /purchasePrice|purchaseCurrency|purchasePaymentState|tradeInOrigin|investor|jointOwnership|notes|documentationFiles|ownerPhone|consignmentValuation|123456789|DOCUMENTO-PRIVADO-QA/);
        }
        assert.equal(detail.json.model, 'Modelo público QA'); assert.equal(detail.json.description, 'Descripción comercial pública QA');
        assert.deepEqual(detail.json.equipment, ['Aire acondicionado QA']); assert.deepEqual(detail.json.features, ['Airbag QA']);
        assert.equal(detail.json.infoAuto.modelName, 'Modelo público QA'); assert.equal(detail.json.infoAuto.valor, undefined);
    });
    console.log(`PASS: ${passed} isolated seller access scenarios; no employee accounts or production data.`);
} finally { globalThis.fetch = localFetch; await env.stop(); }
