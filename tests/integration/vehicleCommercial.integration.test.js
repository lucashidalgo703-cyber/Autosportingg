// API real + MongoDB descartable en loopback; credenciales ficticias y sin proveedores externos.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { after, before, beforeEach, describe, test } from 'node:test';
import { carFixture } from '../fixtures/saleDraftFixtures.js';
import { clientTodayKey } from '../../src/utils/clientCommercial.js';

const database = `autosporting_vehicle_commercial_${crypto.randomBytes(6).toString('hex')}`;
const nativeFetch = globalThis.fetch;
let mongo, mongoose, jwt, server, base, models, owner;
const token = (role = 'owner', permissions, id = owner._id) => jwt.sign({ id: String(id), username: 'commercial_qa', role, ...(permissions ? { permissions } : {}) }, process.env.JWT_SECRET, { expiresIn: '10m' });
async function call(method, route, body, auth = token()) {
    const response = await fetch(`${base}${route}`, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
    return { status: response.status, headers: response.headers, body: await response.json().catch(() => null) };
}
const activity = overrides => ({ activity: 'consulta', occurredAt: '2026-11-10', channel: 'whatsapp', contactName: 'Contacto ficticio', contactPhone: '11 1234 5678', notes: 'Consulta de prueba', ...overrides });

describe('Ficha comercial de vehículos: persistencia, permisos y aislamiento público', { concurrency: false }, () => {
    before(async () => {
        for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) assert.equal(await access(fileURLToPath(new URL(`../../${name}`, import.meta.url))).then(() => true, () => false), false, 'La suite requiere un checkout sin credenciales activas');
        process.env.MONGOMS_DOWNLOAD_DIR ||= fileURLToPath(new URL('../../node_modules/.cache/mongodb-binaries/', import.meta.url));
        const { MongoMemoryReplSet } = await import('mongodb-memory-server');
        mongo = await MongoMemoryReplSet.create({
            replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1', spawn: { windowsHide: true }, args: ['--wiredTigerCacheSizeGB', '0.25', '--oplogSize', '16'] },
            instanceOpts: [{ ip: '127.0.0.1', launchTimeout: 180000 }]
        });
        process.env.MONGODB_URI = mongo.getUri(database);
        process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
        process.env.TWO_FACTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
        process.env.NODE_ENV = 'production'; process.env.ENABLE_DAILY_SUMMARY_SCHEDULER = 'false';
        for (const key of ['REDIS_URL', 'REDIS_TOKEN', 'MONGODB_DNS_SERVERS', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) process.env[key] = '';
        globalThis.fetch = (input, options) => {
            const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
            assert.equal(target.origin, base, 'Esta suite no consulta proveedores externos');
            return nativeFetch(input, options);
        };
        mongoose = (await import('mongoose')).default; mongoose.set('autoCreate', false);
        const app = (await import('../../server.js')).default;
        models = Object.fromEntries(await Promise.all(['Car', 'Client', 'Lead', 'Sale', 'Reservation', 'CrmTask', 'CommunicationLog', 'AdminUser', 'Pedido', 'Transaction', 'AuditLog', 'CrmSettings', 'LeadAssignmentState'].map(async name => [name, (await import(`../../src/models/${name}.js`)).default])));
        jwt = (await import('jsonwebtoken')).default;
        await (await import('../../src/config/db.js')).default();
        assert.equal(mongoose.connection.host, '127.0.0.1'); assert.equal(mongoose.connection.name, database);
        await Promise.all(Object.values(models).map(model => model.createCollection()));
        server = app.listen({ port: 0, host: '127.0.0.1' }); await once(server, 'listening'); base = `http://127.0.0.1:${server.address().port}`;
    }, { timeout: 300000 });
    beforeEach(async () => {
        await Promise.all(Object.values(models).map(model => model.deleteMany({})));
        owner = await models.AdminUser.create({ name: 'Responsable ficticio', email: 'qa@example.invalid', passwordHash: crypto.randomBytes(32).toString('hex'), role: 'owner', active: true });
    });
    after(async () => {
        globalThis.fetch = nativeFetch;
        if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
        if (mongoose) await mongoose.disconnect();
        if (mongo) await mongo.stop();
    });

    test('stock.read no entrega clientes, actividad ni tareas de otras secciones y no autoriza escrituras', async () => {
        const car = await models.Car.create(carFixture());
        const readOnly = token('administrativo', ['stock.read']);
        assert.equal((await call('GET', `/api/admin/cars/${car._id}/commercial-context`, undefined, null)).status, 401);
        const read = await call('GET', `/api/admin/cars/${car._id}/commercial-context`, undefined, readOnly);
        assert.equal(read.status, 200); assert.match(read.headers.get('cache-control'), /no-store/);
        assert.equal(read.body.permissions.clientsAllowed, false); assert.equal(read.body.permissions.consultationsAllowed, false);
        assert.equal(read.body.summary.interestedPeople, null); assert.equal(read.body.summary.consultations, null); assert.equal(read.body.summary.pendingActions, null);
        assert.deepEqual(read.body.interestedClients, []); assert.deepEqual(read.body.activities, []); assert.deepEqual(read.body.workPlan.pendingActions, []);
        for (const [suffix, input] of [['inspection', { verifiedKm: true }], ['activities', activity()], ['follow-ups', { title: 'Tarea', dueDate: '2026-11-11' }]]) {
            assert.equal((await call(suffix === 'inspection' ? 'PATCH' : 'POST', `/api/admin/cars/${car._id}/${suffix}`, input, readOnly)).status, 403);
        }
        const onlyStockWrite = token('administrativo', ['stock.read', 'stock.write']);
        assert.equal((await call('POST', `/api/admin/cars/${car._id}/activities`, activity(), onlyStockWrite)).status, 403);
        assert.equal((await call('POST', `/api/admin/cars/${car._id}/follow-ups`, { title: 'Tarea', dueDate: '2026-11-11' }, onlyStockWrite)).status, 403);
        assert.equal(await models.CommunicationLog.countDocuments(), 0); assert.equal(await models.CrmTask.countDocuments(), 0);
    });
    test('peritaje parcial conserva datos no enviados, ausencia, cero, falso y auditoría sin alterar caja', async () => {
        const car = await models.Car.create(carFixture());
        assert.deepEqual((await call('GET', `/api/admin/cars/${car._id}/inspection`)).body, { inspection: null });
        const first = await call('PATCH', `/api/admin/cars/${car._id}/inspection`, { mechanic: { status: 'observacion', note: 'Revisar correa' }, tiresPercent: 0, keyCount: 0, singleOwner: false, titleInHand: null });
        assert.equal(first.status, 200, JSON.stringify(first.body)); assert.equal(first.body.inspection.tiresPercent, 0); assert.equal(first.body.inspection.singleOwner, false);
        const second = await call('PATCH', `/api/admin/cars/${car._id}/inspection`, { mechanic: { note: 'Correa revisada' }, generalNotes: 'Prueba' });
        assert.equal(second.status, 200); assert.equal(second.body.inspection.mechanic.status, 'observacion'); assert.equal(second.body.inspection.mechanic.note, 'Correa revisada');
        assert.equal(second.body.inspection.brakes, undefined); assert.equal(second.body.inspection.titleInHand, null);
        const stored = await models.Car.findById(car._id).lean();
        assert.equal(stored.auditLog.filter(log => log.action === 'PERITAJE').length, 2); assert.equal(stored.status, 'Disponible'); assert.equal(stored.price, car.price);
        const publicCar = await call('GET', `/api/public/cars/${car._id}`); assert.equal(publicCar.body.inspection, undefined); assert.equal(publicCar.body.auditLog, undefined);
        assert.equal(await models.Transaction.countDocuments(), 0);
    });
    test('errores de peritaje y referencias rechazan el pedido completo sin efectos parciales', async () => {
        const car = await models.Car.create(carFixture()); const before = JSON.stringify(await models.Car.findById(car._id).lean());
        for (const input of [{ tiresPercent: 101, generalNotes: 'No guardar' }, { keyCount: 2.5 }, { mechanic: { status: 'inventado' } }, { verifiedKm: 'true' }]) {
            const result = await call('PATCH', `/api/admin/cars/${car._id}/inspection`, input);
            assert.equal(result.status, 400); assert.equal(result.body.code, 'VEHICLE_COMMERCIAL_VALIDATION'); assert.ok(result.body.errors);
        }
        assert.equal(JSON.stringify(await models.Car.findById(car._id).lean()), before);
        assert.equal((await call('GET', '/api/admin/cars/no-es-id/inspection')).status, 400);
        assert.equal((await call('GET', `/api/admin/cars/${new mongoose.Types.ObjectId()}/inspection`)).status, 404);
        await call('PATCH', `/api/admin/cars/${car._id}`, { color: 'Rojo', inspection: { verifiedKm: true } });
        assert.equal((await models.Car.findById(car._id)).inspection, undefined, 'La edición genérica no puede evitar el contrato de peritaje');
    });
    test('datos del catálogo y fecha comercial persisten sin publicar peritaje, propietario o costos', async () => {
        for (const extra of [{ youtubeUrl: 'https://youtube.com.ejemplo.invalid/1' }, { youtubeUrl: 'javascript:alert(1)' }, { youtubeUrl: 'https://user:secret@youtube.com/watch?v=1' }, { createdAt: '2026-02-30' }]) assert.equal((await call('POST', '/api/cars', carFixture(extra))).status, 400);
        const created = await call('POST', '/api/cars', carFixture({ createdAt: '2020-02-29', publicEquipment: ' ABS ', publicMaintenance: 'Service informado', publicPurchaseConditions: 'Gastos a consultar', youtubeUrl: 'https://youtu.be/QA12345', ownerPhone: 'Privado', inspection: { verifiedKm: true } }));
        assert.equal(created.status, 201, JSON.stringify(created.body)); assert.equal(created.body.createdAt.slice(0, 10), '2020-02-29');
        assert.equal(created.body.createdAt, '2020-02-29T03:00:00.000Z');
        assert.ok(Date.now() - Date.parse(created.body.auditLog[0].date) < 60000); assert.equal(created.body.inspection, undefined);
        for (const route of [`/api/public/cars/${created.body._id}`, '/api/public/cars']) {
            const fetched = await call('GET', route); const item = Array.isArray(fetched.body) ? fetched.body[0] : fetched.body;
            assert.equal(item.publicEquipment, 'ABS'); assert.equal(item.youtubeUrl, 'https://youtu.be/QA12345');
            for (const field of ['inspection', 'ownerPhone', 'purchasePrice', 'purchasePaymentState', 'clientId', 'auditLog']) assert.equal(item[field], undefined, field);
        }
        const edited = await call('PATCH', `/api/admin/cars/${created.body._id}`, { publicEquipment: '', youtubeUrl: '', publicMaintenance: 'Nuevo dato', createdAt: '2020-02-29T18:30:15.123Z' });
        assert.equal(edited.status, 200); assert.equal(edited.body.publicEquipment, ''); assert.equal(edited.body.publicMaintenance, 'Nuevo dato'); assert.equal(edited.body.createdAt, '2020-02-29T18:30:15.123Z');
    });
    test('actividad reutiliza comunicaciones y personas se deduplican por identificadores exactos', async () => {
        const car = await models.Car.create(carFixture());
        const client = await models.Client.create({ fullName: 'Persona ficticia', phone: '11 1234 5678', dniCuit: '30-12345678-1' });
        const first = await call('POST', `/api/admin/cars/${car._id}/activities`, activity({ clientId: String(client._id) }));
        assert.equal(first.status, 201, JSON.stringify(first.body)); assert.equal(first.body.occurredAt.slice(0, 10), '2026-11-10');
        await call('POST', `/api/admin/cars/${car._id}/activities`, activity({ activity: 'oferta', contactPhone: '+54 9 11 1234 5678' }));
        await call('POST', `/api/admin/cars/${car._id}/activities`, activity({ activity: 'visita', contactPhone: '11 0000 0000', contactDni: '30123456781' }));
        await call('POST', `/api/admin/cars/${car._id}/activities`, activity({ contactName: 'Solo nombre', contactPhone: '' }));
        const context = await call('GET', `/api/admin/cars/${car._id}/commercial-context`);
        assert.equal(context.body.summary.consultations, 2); assert.equal(context.body.summary.offers, 1); assert.equal(context.body.summary.visits, 1);
        assert.equal(context.body.summary.interestedPeople, 1); assert.equal(context.body.summary.unidentifiedContacts, 1);
        assert.equal(context.body.interestedClients.length, 1); assert.equal(context.body.interestedClients[0].clientId, String(client._id));
        assert.equal(context.body.activities.length, 4); assert.equal(await models.CommunicationLog.countDocuments({ vehicleId: car._id, sourceModule: 'stock' }), 4);
        const batch = await call('GET', `/api/admin/stock/commercial-summary?ids=${car._id}`);
        assert.equal(batch.status, 200); assert.deepEqual(batch.body.summaries[String(car._id)], context.body.summary);
        const limited = await call('GET', `/api/admin/stock/commercial-summary?ids=${car._id}`, undefined, token('administrativo', ['stock.read']));
        assert.equal(limited.body.summaries[String(car._id)].consultations, null); assert.equal(limited.body.summaries[String(car._id)].interestedPeople, null);
        assert.equal((await call('GET', '/api/admin/stock/commercial-summary?ids=invalid')).status, 400);
        assert.equal((await call('GET', `/api/admin/stock/commercial-summary?ids=${Array.from({ length: 51 }, () => new mongoose.Types.ObjectId()).join(',')}`)).status, 400);
        for (const input of [activity({ occurredAt: '2026-02-30' }), activity({ clientId: String(new mongoose.Types.ObjectId()) }), activity({ activity: 'venta' })]) assert.equal((await call('POST', `/api/admin/cars/${car._id}/activities`, input)).status, 400);
        assert.equal(await models.CommunicationLog.countDocuments(), 4); assert.equal(await models.Client.countDocuments(), 1); assert.equal(await models.Transaction.countDocuments(), 0);
    });
    test('contexto respeta la visibilidad de comunicaciones del vendedor y oculta contactos sin clientes.read', async () => {
        const car = await models.Car.create(carFixture());
        await call('POST', `/api/admin/cars/${car._id}/activities`, activity());
        const seller = await models.AdminUser.create({ name: 'Vendedor ficticio', email: 'seller@example.invalid', passwordHash: crypto.randomBytes(32).toString('hex'), role: 'ventas', active: true });
        const sellerAuth = token('ventas', ['stock.read', 'stock.write', 'communicationLogs.read', 'communicationLogs.write'], seller._id);
        assert.equal((await call('POST', `/api/admin/cars/${car._id}/activities`, activity({ contactName: 'Otro contacto' }), sellerAuth)).status, 201);
        const context = await call('GET', `/api/admin/cars/${car._id}/commercial-context`, undefined, sellerAuth);
        assert.equal(context.body.summary.consultations, 1); assert.equal(context.body.summary.interestedPeople, null);
        assert.equal(context.body.activities.length, 1); assert.equal(context.body.activities[0].contactPhone, undefined); assert.deepEqual(context.body.interestedClients, []);
    });
    test('seguimiento existe en agenda, exige resolución y conserva asociación/auditoría', async () => {
        const car = await models.Car.create(carFixture()); const other = await models.Car.create(carFixture({ plateOrVin: 'QA-OTRO' }));
        const created = await call('POST', `/api/admin/cars/${car._id}/follow-ups`, { title: 'Revisar documentación', responsibleText: 'Gestoría', assignedTo: String(owner._id), dueDate: '2026-11-11' });
        assert.equal(created.status, 201, JSON.stringify(created.body)); assert.equal(created.body.source, 'stock'); assert.equal(created.body.dueDate, '2026-11-11T00:00:00.000Z');
        const agenda = await call('GET', '/api/admin/crm-tasks'); assert.equal(agenda.body[0]._id, created.body._id); assert.equal(agenda.body[0].vehicleId._id, String(car._id));
        assert.equal((await call('PATCH', `/api/admin/cars/${other._id}/follow-ups/${created.body._id}`, { title: 'No reasociar' })).status, 404);
        assert.equal((await call('PATCH', `/api/admin/cars/${car._id}/follow-ups/${created.body._id}`, { status: 'completada' })).status, 400);
        const done = await call('PATCH', `/api/admin/cars/${car._id}/follow-ups/${created.body._id}`, { status: 'completada', resolutionNote: 'Documentación revisada' });
        assert.equal(done.status, 200); assert.equal(done.body.status, 'completada'); assert.equal(done.body.resolutionNote, 'Documentación revisada'); assert.equal(done.body.auditLog.length, 2);
        const context = await call('GET', `/api/admin/cars/${car._id}/commercial-context`); assert.equal(context.body.summary.pendingActions, 0); assert.equal(context.body.workPlan.nextTask, null);
        assert.equal(await models.Transaction.countDocuments(), 0);
    });
    test('coincidencias usan demanda estructurada exacta y no mezclan monedas ni nombres aproximados', async () => {
        const car = await models.Car.create(carFixture({ brand: 'Toyota', name: 'Corolla', year: 2020, price: 12000, currency: 'USD' }));
        for (const input of [{}, { model: 'Corolla Cross' }, { currency: 'ARS' }, { yearFrom: 2021 }, { pipelineStage: 'cerrado' }]) await models.Client.create({ fullName: 'Pedido ficticio', brand: 'TOYOTA', model: 'Corolla', maxBudget: 15000, currency: 'USD', yearFrom: 2019, yearTo: 2022, ...input });
        await models.Pedido.create({ clientName: 'Demanda ficticia', requestedBrand: 'Toyota', requestedModel: 'Corolla', currency: 'USD', budget: 15000, yearRange: '2019-2022' });
        const context = await call('GET', `/api/admin/cars/${car._id}/commercial-context`); assert.equal(context.body.summary.matchingRequests, 2);
        const clientOnly = await call('GET', `/api/admin/cars/${car._id}/commercial-context`, undefined, token('administrativo', ['stock.read', 'clientes.read']));
        assert.equal(clientOnly.body.permissions.matchingAllowed, false); assert.equal(clientOnly.body.matchingRequests.length, 1, 'La demanda del cliente puede leerse; pedidos requiere su permiso propio');
    });
    test('insights resume todo el período antes de paginar y respeta los límites del día argentino', async () => {
        const today = clientTodayKey(); const start = Date.parse(`${today}T03:00:00.000Z`);
        const car = await models.Car.create(carFixture({ brand: 'Toyota', bodyType: 'SUV' }));
        await models.Client.create(Array.from({ length: 23 }, (_, index) => ({ fullName: `Persona ficticia ${index}`, pipelineStage: index === 0 ? 'nuevo' : index === 1 ? 'sin_contactar' : 'contactado', source: 'web', assignedTo: owner._id, interestedVehicleId: index < 2 ? car._id : null, createdAt: new Date(start + 3600000) })));
        await models.Client.create([{ fullName: 'Período anterior', createdAt: new Date(start - 1), source: 'referido' }, { fullName: 'Próximo día', createdAt: new Date(start + 86400000), source: 'local' }]);
        const list = await call('GET', '/api/admin/clients?limit=20'); assert.equal(list.body.clients.length, 20); assert.equal(list.body.total, 25);
        const insights = await call('GET', '/api/admin/clients-insights?period=hoy');
        assert.equal(insights.status, 200, JSON.stringify(insights.body)); assert.match(insights.headers.get('cache-control'), /no-store/);
        assert.equal(insights.body.totalGlobal, 25); assert.deepEqual(insights.body.current, { total: 23, sinContactar: 2, contactados: 21 }); assert.equal(insights.body.previous.total, 1);
        assert.equal(insights.body.byDay30.length, 30); assert.equal(insights.body.byDay30.find(day => day.key === today).count, 23);
        assert.equal(insights.body.bySource.find(item => item.key === 'web').count, 23); assert.equal(insights.body.byAssignee[0].label, owner.name);
        assert.equal(insights.body.linkedVehicleCount, 2); assert.equal(insights.body.bodyTypeCounts[0].key, 'SUV'); assert.equal(insights.body.bodyTypeCounts[0].count, 2);
        assert.equal(insights.body.byBrand.find(item => item.key === 'Toyota').count, 2);
        assert.equal((await call('GET', '/api/admin/clients-insights?period=inventado')).status, 400);
        assert.equal((await call('GET', '/api/admin/clients-insights', undefined, token('administrativo', ['stock.read']))).status, 403);
    });
    test('insights de pedidos y compras cerradas separa monedas e histórico y respeta permisos por sección', async () => {
        const today = clientTodayKey(); const client = await models.Client.create({ fullName: 'Comprador ficticio' });
        for (const input of [{ salePrice: 1000, saleCurrency: 'USD' }, { salePrice: 2250, saleCurrency: 'USD', historicalOnly: true }, { salePrice: 200000, saleCurrency: 'ARS' }, { salePrice: 99999, saleCurrency: 'USD', status: 'confirmada' }, { salePrice: 99999, saleCurrency: 'USD', status: 'cancelada' }]) await models.Sale.create({ clientId: client._id, status: 'entregada', saleDate: new Date(`${today}T00:00:00.000Z`), ...input });
        await models.Sale.collection.insertOne({ clientId: client._id, status: 'entregada', saleDate: new Date(`${today}T00:00:00.000Z`), salePrice: 9, saleCurrency: 'EUR' });
        await models.Pedido.create([{ clientId: client._id, requestedBrand: 'Toyota', requestedModel: 'Corolla', status: 'Pendiente' }, { clientId: client._id, requestedBrand: 'Ford', requestedModel: 'Focus', status: 'Cumplido' }]);
        const insights = await call('GET', '/api/admin/clients-insights?period=hoy');
        assert.equal(insights.status, 200, JSON.stringify(insights.body)); assert.equal(insights.body.activeRequestsCount, 1); assert.equal(insights.body.byRequestBrand[0].key, 'Toyota');
        const ranked = insights.body.purchaseRanking[0]; assert.equal(ranked.clientId, String(client._id)); assert.equal(ranked.salesCount, 4); assert.equal(ranked.historicalCount, 1); assert.equal(ranked.unknownCurrencyCount, 1); assert.deepEqual(ranked.totals, { ARS: 200000, USD: 3250 });
        const limited = await call('GET', '/api/admin/clients-insights?period=todos', undefined, token('administrativo', ['clientes.read']));
        assert.equal(limited.status, 200); assert.equal(limited.body.previous, null); assert.equal(limited.body.purchaseRanking, null); assert.equal(limited.body.activeRequestsCount, null); assert.equal(limited.body.byRequestBrand, null);
    });
    test('alta cliente preserva perfil estructurado y asigna solo al pedirlo, priorizando al vendedor de la unidad', async () => {
        const seller = await models.AdminUser.create({ name: 'Vendedor ficticio', email: 'routing@example.invalid', passwordHash: crypto.randomBytes(32).toString('hex'), role: 'ventas', active: true });
        const car = await models.Car.create(carFixture({ consignmentSeller: seller._id }));
        const input = { firstName: 'Consulta ficticia', autoAssign: true, interestedVehicleId: String(car._id), reason: 'entro_puerta', segment: 'vip', gender: 'mujer', birthDate: '1990-02-28', occupation: 'Profesional', purchaseMethod: 'financiacion', purchaseTiming: '1_3_meses', availableDownPayment: 0, downPaymentCurrency: 'USD', tradeInIntent: 'no' };
        const created = await call('POST', '/api/admin/clients', input);
        assert.equal(created.status, 201, JSON.stringify(created.body)); assert.equal(created.body.assignedTo, String(seller._id)); assert.equal(created.body.interestedVehicleId, String(car._id)); assert.equal(created.body.segment, 'vip'); assert.equal(created.body.availableDownPayment, 0); assert.equal(created.body.occupation, 'Profesional');
        assert.ok(created.body.clientAuditLog.some(log => log.action === 'RESPONSABLE_ASIGNADO'));
        const edited = await call('PATCH', `/api/admin/clients/${created.body._id}`, { autoAssign: true, notes: 'Solo guardar nota' });
        assert.equal(edited.status, 200); assert.equal(edited.body.assignedTo._id || edited.body.assignedTo, String(seller._id));
        const manual = await call('POST', '/api/admin/clients', { firstName: 'Sin automatismo', interestedVehicleId: String(car._id) }); assert.equal(manual.status, 201); assert.equal(manual.body.assignedTo, null);
        const intakeChanged = await call('PATCH', `/api/admin/clients/${manual.body._id}`, { createdAt: '2019-02-03' });
        assert.equal(intakeChanged.status, 200, JSON.stringify(intakeChanged.body)); assert.equal(intakeChanged.body.createdAt, '2019-02-03T03:00:00.000Z');
        assert.equal((await models.Client.findById(manual.body._id).lean()).createdAt.toISOString(), '2019-02-03T03:00:00.000Z');
        assert.ok(intakeChanged.body.clientAuditLog.some(log => log.field === 'createdAt' && log.newValue));
        const explicit = await call('POST', '/api/admin/clients', { ...input, firstName: 'Asignación explícita', assignedTo: String(owner._id) }); assert.equal(explicit.status, 201); assert.equal(explicit.body.assignedTo, String(owner._id));
        const rejected = await call('POST', '/api/admin/clients', { firstName: 'No guardar', interestedVehicleId: String(new mongoose.Types.ObjectId()) }); assert.equal(rejected.status, 400);
        assert.equal(await models.Client.countDocuments(), 3);
        const manualId = manual.body._id;
        const schedule = await call('PATCH', `/api/admin/clients/${manualId}`, { nextAction: 'Llamar mañana', nextActionDate: '2026-11-11' });
        assert.equal(schedule.status, 200); assert.equal(schedule.body.pipelineStage, 'sin_contactar'); assert.equal(schedule.body.lastContactDate, null);
        for (const interaction of [{ type: 'nota', note: 'Nota interna' }, { type: 'llamada', note: 'No respondió', outboundNoReply: true }, { type: 'cita_agendada', note: 'Agenda para revisar' }, { type: 'cotizacion_enviada', note: 'Cotización enviada' }]) {
            const managed = await call('PATCH', `/api/admin/clients/${manualId}`, { newInteraction: interaction });
            assert.equal(managed.status, 200, JSON.stringify(managed.body)); assert.equal(managed.body.pipelineStage, 'sin_contactar'); assert.equal(managed.body.lastContactDate, null); assert.notEqual(managed.body.contactConfirmed, true);
        }
        const contacted = await call('PATCH', `/api/admin/clients/${manualId}`, { newInteraction: { type: 'whatsapp', note: 'Respondió con su consulta.', outboundNoReply: false } });
        assert.equal(contacted.status, 200); assert.equal(contacted.body.pipelineStage, 'contactado'); assert.ok(contacted.body.lastContactDate); assert.equal(contacted.body.interactions.length, 5);
        const invalid = await call('PATCH', `/api/admin/clients/${manualId}`, { nextAction: 'No guardar', newInteraction: { type: 'inventado', note: 'No guardar' } });
        assert.equal(invalid.status, 400); assert.equal((await models.Client.findById(manualId)).nextAction, 'Llamar mañana');
        const optedOut = await call('PATCH', `/api/admin/clients/${manualId}`, { doNotContact: true, phone: '11 1234 5678', email: 'blocked@example.invalid' }); assert.equal(optedOut.status, 200); assert.equal(optedOut.body.doNotContact, true);
        const linkedLead = await models.Lead.create({ name: 'Consulta ficticia', phone: '11 1234 5678', clientId: manualId });
        for (const [route, input] of [
            ['/api/admin/whatsapp/send', { clientId: manualId, to: '5491112345678', text: 'Prueba bloqueada' }],
            ['/api/admin/whatsapp/send', { leadId: String(linkedLead._id), to: '5491112345678', text: 'Prueba bloqueada' }],
            ['/api/admin/emails/send', { clientId: manualId, to: 'blocked@example.invalid', subject: 'Prueba', html: '<p>Prueba bloqueada</p>' }],
            ['/api/admin/emails/send', { to: ['blocked@example.invalid'], subject: 'Prueba', html: '<p>Prueba bloqueada</p>' }],
            ['/api/admin/nps/generate', { clientId: manualId }]
        ]) { const blocked = await call('POST', route, input); assert.equal(blocked.status, 409, route + JSON.stringify(blocked.body)); assert.equal(blocked.body.code, 'CLIENT_DO_NOT_CONTACT'); }
        assert.equal(await models.CommunicationLog.countDocuments(), 0, 'No se fabrica un envío ni se consulta un proveedor externo');
    });
    test('disponibilidad y rotación excluyen ausentes y separan local/digital sin alterar asignaciones previas', async () => {
        const seller = await models.AdminUser.create({ name: 'Vendedor disponible', email: 'available@example.invalid', passwordHash: crypto.randomBytes(32).toString('hex'), role: 'ventas', active: true });
        const paused = await models.AdminUser.create({ name: 'Vendedor ausente', email: 'paused@example.invalid', passwordHash: crypto.randomBytes(32).toString('hex'), role: 'ventas', active: true });
        const changed = await call('PATCH', `/api/admin/team-availability/${paused._id}`, { status: 'vacation', note: 'Ausencia de prueba' });
        assert.equal(changed.status, 200, JSON.stringify(changed.body));
        const absent = await models.AdminUser.findById(paused._id).lean(); assert.equal(absent.leadAvailabilityStatus, 'vacation');
        const available = await call('GET', '/api/admin/team-availability'); assert.equal(available.status, 200); assert.ok(!JSON.stringify(available.body).includes('passwordHash'));
        const car = await models.Car.create(carFixture({ consignmentSeller: paused._id }));
        for (const reason of ['entro_puerta', 'lead_digital']) {
            const assigned = await call('POST', '/api/admin/clients', { firstName: 'Rotación ficticia', autoAssign: true, interestedVehicleId: String(car._id), reason });
            assert.equal(assigned.status, 201, JSON.stringify(assigned.body)); assert.equal(assigned.body.assignedTo, String(seller._id));
        }
        assert.equal(await models.LeadAssignmentState.countDocuments({ channelKey: { $in: ['client_walk_in:crm', 'client_digital:crm'] } }), 2);
        assert.equal((await call('PATCH', `/api/admin/team-availability/${seller._id}`, { status: 'paused', note: 'Pausa de prueba' }, token('solo_lectura'))).status, 403);
        assert.equal(await models.Client.countDocuments({ assignedTo: seller._id }), 2);
    });
    test('contacto independiente filtra y cuenta meses sin borrar historia ni reabrir cerrados', async () => {
        const today = clientTodayKey(), month = today.slice(0, 7), [year, number] = month.split('-').map(Number);
        const previous = new Date(Date.UTC(year, number - 2, 1)).toISOString().slice(0, 7);
        const original = await models.Client.create({ fullName: 'Negociación ficticia', pipelineStage: 'negociacion', contactConfirmed: false, lastContactDate: new Date(`${month}-01T00:00:00.000Z`), interactions: [{ type: 'visita', note: 'Respuesta histórica conservada' }] });
        await models.Client.create([
            { fullName: 'Cerrado sin confirmar contacto actual', pipelineStage: 'cerrado', contactConfirmed: false, lastContactDate: new Date(`${month}-01T00:00:00.000Z`), nextActionDate: new Date(`${today}T00:00:00Z`) },
            { fullName: 'Contactado este mes', pipelineStage: 'sin_contactar', contactConfirmed: true, lastContactDate: new Date(`${month}-01T00:00:00.000Z`), nextActionDate: new Date(`${today}T00:00:00Z`) },
            { fullName: 'Contactado mes pasado', contactConfirmed: true, lastContactDate: new Date(`${previous}-01T00:00:00.000Z`), nextActionDate: new Date(`${today}T00:00:00Z`) },
            { fullName: 'Declaración sin fecha inventada', contactConfirmed: true, doNotContact: true, nextActionDate: new Date(`${today}T00:00:00Z`) }
        ]);
        const contacts = await call('GET', '/api/admin/clients?segment=contactados&attention=todos&limit=1');
        assert.equal(contacts.status, 200, JSON.stringify(contacts.body)); assert.equal(contacts.body.total, 3); assert.equal(contacts.body.clients.length, 1);
        assert.deepEqual(contacts.body.contactCounts, { total: 3, thisMonth: 1, lastMonth: 1, withoutDate: 1 });
        assert.ok(contacts.body.contactMonths.some(item => item.key === month && item.count === 1));
        const first = await call('GET', '/api/admin/clients?attention=primera'); assert.equal(first.body.total, 1); assert.equal(first.body.clients[0]._id, String(original._id));
        const untouched = await models.Client.findById(original._id).lean(); assert.equal(untouched.pipelineStage, 'negociacion'); assert.equal(untouched.interactions.length, 1); assert.ok(untouched.lastContactDate);
        const insights = await call('GET', '/api/admin/clients-insights?period=todos'); assert.equal(insights.body.current.contactados, 3); assert.equal(insights.body.current.sinContactar, 2);
        const followups = await call('GET', '/api/admin/clients?attention=todos&followups=pending'); assert.equal(followups.body.total, 2, 'Cerrados y No contactar no se convierten en agenda de recontacto');
        const marked = await call('PATCH', `/api/admin/clients/${original._id}`, { newInteraction: { type: 'otro', note: 'Contacto confirmado expresamente', outboundNoReply: false } });
        assert.equal(marked.status, 200); assert.equal(marked.body.contactConfirmed, true); assert.equal(marked.body.pipelineStage, 'negociacion');
        const reset = await call('PATCH', `/api/admin/clients/${original._id}`, { contactConfirmed: false });
        assert.equal(reset.status, 200); assert.equal(reset.body.contactConfirmed, false); assert.equal(reset.body.lastContactDate, marked.body.lastContactDate); assert.equal(reset.body.interactions.length, marked.body.interactions.length); assert.equal(reset.body.pipelineStage, 'negociacion');
        assert.ok(reset.body.clientAuditLog.some(log => log.field === 'contactConfirmed' && log.newValue === false));
    });
    test('ranking ampliado distingue abiertas, conserva historial cerrado y recupera DNI unívoco sin relink', async () => {
        const buyer = await models.Client.create({ fullName: 'Comprador con abierta', dniCuit: '30123456781' });
        const potential = await models.Client.create({ fullName: 'Sólo operación abierta', dniCuit: '20999999999' });
        const orphan = await models.Sale.create({ status: 'entregada', salePrice: 1000, saleCurrency: 'USD', saleDate: new Date('2026-01-02T00:00:00Z'), draftData: { buyerDni: '30-12345678-1' }, historicalOnly: true });
        await models.Sale.create([
            { clientId: buyer._id, status: 'entregada', salePrice: 200000, saleCurrency: 'ARS', saleDate: new Date('2026-11-10T00:00:00Z') },
            { clientId: buyer._id, status: 'confirmada', salePrice: 9999, saleCurrency: 'USD' },
            { clientId: potential._id, status: 'señado', salePrice: 8888, saleCurrency: 'USD' }
        ]);
        const result = await call('GET', '/api/admin/clients-insights?period=todos'); assert.equal(result.status, 200, JSON.stringify(result.body));
        assert.equal(result.body.purchaseRanking.length, 1); assert.equal(result.body.openPurchaseRanking.length, 1);
        const row = result.body.purchaseRanking[0]; assert.equal(row.salesCount, 2); assert.equal(row.openCount, 1); assert.equal(row.dniMatchedCount, 1); assert.equal(row.firstPurchaseDate, '2026-01-02'); assert.equal(row.lastPurchaseDate, '2026-11-10');
        assert.equal(result.body.rankingSummary.vehiclesSold, 2); assert.equal(result.body.rankingSummary.openOnlyClients, 1); assert.deepEqual(result.body.rankingSummary.billed, { ARS: 200000, USD: 1000 });
        assert.ok(!(await models.Sale.findById(orphan._id).lean()).clientId, 'El rescate por DNI es lectura, no modifica la venta');
    });
});
