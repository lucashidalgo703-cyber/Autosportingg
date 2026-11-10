// Ejecutar: node --test tests/integration/saleDraft.integration.test.js
// Servidor Express real + replica set MongoDB descartable. No usa .env de producción.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
    accountFixture, carFixture, clientFixture, draftFormFixture,
    installmentFixture, leadFixture, transactionFixture
} from '../fixtures/saleDraftFixtures.js';

const TEST_DB = `autosporting_draft_test_${crypto.randomBytes(6).toString('hex')}`;
const externalRequests = [];
const nativeFetch = globalThis.fetch;
let replSet;
let mongoose;
let server;
let base = '';
let jwt;
let models;
let fixture;
let treasuryService;

const id = (value) => String(value?._id ?? value);
const asPlain = (value) => JSON.parse(JSON.stringify(value));
const makeToken = (role = 'owner', permissions) => jwt.sign({
    id: new mongoose.Types.ObjectId().toString(), username: `qa_${role}`, role,
    ...(permissions ? { permissions } : {})
}, process.env.JWT_SECRET, { expiresIn: '10m' });

async function call(method, path, body, token = makeToken()) {
    const response = await fetch(`${base}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(15000)
    });
    return { status: response.status, headers: response.headers, body: await response.json().catch(() => null) };
}

function assertMemoryDatabase() {
    assert.equal(mongoose.connection.host, '127.0.0.1');
    assert.equal(mongoose.connection.name, TEST_DB);
    assert.ok(process.env.MONGODB_URI.startsWith('mongodb://127.0.0.1:'));
}

async function operationalSnapshot() {
    const entries = await Promise.all(['Car', 'Client', 'Lead', 'Account', 'Transaction', 'Installment'].map(async (name) => [
        name, asPlain(await models[name].find().sort({ _id: 1 }).lean())
    ]));
    return Object.fromEntries(entries);
}

async function financialSnapshot() {
    const entries = await Promise.all(['Account', 'Transaction', 'Installment'].map(async (name) => [
        name, asPlain(await models[name].find().sort({ _id: 1 }).lean())
    ]));
    return Object.fromEntries(entries);
}

async function treasurySnapshot() {
    const state = await operationalSnapshot();
    state.Sale = asPlain(await models.Sale.find().sort({ _id: 1 }).lean());
    for (const [name, Model] of Object.entries(mongoose.models).filter(([name]) => name.startsWith('Treasury'))) {
        state[name] = asPlain(await Model.find().sort({ _id: 1 }).lean());
    }
    return state;
}

async function createDraft(overrides = {}) {
    const result = await call('POST', '/api/admin/sales', {
        status: 'borrador', salePrice: 1200, saleCurrency: 'USD',
        vehicleId: id(fixture.car), clientId: id(fixture.client), leadId: id(fixture.lead),
        draftData: draftFormFixture(), ...overrides
    });
    assert.equal(result.status, 201, JSON.stringify(result.body));
    return result.body;
}

function argentinaToday() {
    const parts = new Intl.DateTimeFormat('en', {
        timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const value = (type) => parts.find((part) => part.type === type).value;
    return `${value('year')}-${value('month')}-${value('day')}`;
}

function dayFromToday(offset) {
    const day = new Date(`${argentinaToday()}T00:00:00.000Z`);
    day.setUTCDate(day.getUTCDate() + offset);
    return day;
}

describe('Borradores de venta y caja con MongoDB transaccional', { concurrency: false }, () => {
    before(async () => {
        // La descarga de binarios, si falta el cache, queda dentro del checkout.
        process.env.MONGOMS_DOWNLOAD_DIR ||= fileURLToPath(new URL('../../node_modules/.cache/mongodb-binaries/', import.meta.url));
        const { MongoMemoryReplSet } = await import('mongodb-memory-server');
        replSet = await MongoMemoryReplSet.create({
            replSet: {
                count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1', spawn: { windowsHide: true },
                args: ['--wiredTigerCacheSizeGB', '0.25', '--oplogSize', '16']
            },
            instanceOpts: [{ ip: '127.0.0.1', launchTimeout: 180000 }]
        });
        // Siempre sobrescribe una URI heredada antes de importar cualquier código de la app.
        process.env.MONGODB_URI = replSet.getUri(TEST_DB);
        process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
        process.env.TWO_FACTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
        process.env.NODE_ENV = 'production'; // server.js no abre su puerto habitual.
        process.env.ENABLE_DAILY_SUMMARY_SCHEDULER = 'false';
        for (const key of ['REDIS_URL', 'REDIS_TOKEN', 'MONGODB_DNS_SERVERS', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
            process.env[key] = '';
        }
        // Falla si un flujo probado intenta consultar o enviar a un proveedor externo.
        globalThis.fetch = (input, options) => {
            const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
            if (!base || target.origin !== base) {
                externalRequests.push(target.hostname);
                throw new Error(`Solicitud externa bloqueada en QA: ${target.hostname}`);
            }
            return nativeFetch(input, options);
        };
        mongoose = (await import('mongoose')).default;
        // Evita inicializar todos los dominios ajenos a esta suite. Las colecciones
        // usadas en las transacciones se crean expresamente antes de probar.
        mongoose.set('autoCreate', false);
        const { default: app } = await import('../../server.js');
        jwt = (await import('jsonwebtoken')).default;
        models = Object.fromEntries(await Promise.all(['Sale', 'Car', 'Client', 'Lead', 'Account', 'Transaction', 'Installment', 'AuditLog'].map(async (name) => [
            name, (await import(`../../src/models/${name}.js`)).default
        ])));
        treasuryService = await import('../../src/services/treasuryStrategicService.js');
        const { default: connectDB } = await import('../../src/config/db.js');
        await connectDB();
        assertMemoryDatabase();
        assert.ok((await mongoose.connection.db.admin().command({ hello: 1 })).setName, 'La prueba exige replica set para transacciones reales');
        await Promise.all(Object.values(models).map((Model) => Model.createCollection()));
        server = app.listen({ port: 0, host: '127.0.0.1' });
        await once(server, 'listening');
        base = `http://127.0.0.1:${server.address().port}`;
    }, { timeout: 300000 });

    beforeEach(async () => {
        assertMemoryDatabase();
        const resetModels = new Set([
            ...Object.values(models),
            ...Object.entries(mongoose.models).filter(([name]) => name.startsWith('Treasury')).map(([, Model]) => Model)
        ]);
        await Promise.all([...resetModels].map((Model) => Model.deleteMany({})));
        const [car, client, lead, ars, usd] = await Promise.all([
            models.Car.create(carFixture()), models.Client.create(clientFixture()), models.Lead.create(leadFixture()),
            models.Account.create(accountFixture()), models.Account.create(accountFixture({ name: 'Caja de prueba USD', currency: 'USD', balance: 50 }))
        ]);
        await models.Transaction.create([
            transactionFixture({ accountId: ars._id }),
            transactionFixture({ accountId: usd._id, amount: 50, currency: 'USD' })
        ]);
        fixture = { car, client, lead, ars, usd };
    });

    after(async () => {
        globalThis.fetch = nativeFetch;
        if (server) {
            server.closeAllConnections();
            await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        }
        if (mongoose) await mongoose.disconnect();
        if (replSet) await replSet.stop();
        assert.deepEqual(externalRequests, [], 'Ninguna prueba debe llamar a proveedores externos');
    });

    test('sin sesión o sin permiso no crea ni modifica ventas', async () => {
        const baseline = await operationalSnapshot();
        assert.equal((await call('POST', '/api/admin/sales', {}, null)).status, 401);
        assert.equal((await call('POST', '/api/admin/sales', {}, makeToken('solo_lectura'))).status, 403);
        assert.equal(await models.Sale.countDocuments(), 0);
        assert.deepEqual(await operationalSnapshot(), baseline);
    });

    test('POST vacío persiste borrador USD de precio cero sin tocar stock, clientes, lead ni caja', async () => {
        const baseline = await operationalSnapshot();
        const result = await call('POST', '/api/admin/sales', {});
        assert.equal(result.status, 201, JSON.stringify(result.body));
        assert.equal(result.body.status, 'borrador');
        assert.equal(result.body.saleCurrency, 'USD');
        assert.equal(result.body.salePrice, 0);
        const stored = await models.Sale.findById(result.body._id).lean();
        assert.equal(stored.status, 'borrador');
        assert.equal(stored.saleAuditLog.at(-1).action, 'BORRADOR_CREADO');
        assert.deepEqual(await operationalSnapshot(), baseline);
    });

    test('POST/PATCH/GET recupera datos de trabajo y acuerdo sin generar efectos operativos', async () => {
        const baseline = await operationalSnapshot();
        const draft = await createDraft({
            depositAppliedAmount: 100, depositAppliedCurrency: 'USD', installmentsCount: 3,
            financingDetails: { hasFinancing: true, cashPrice: 1200, downPayment: 100, financedBalance: 1100, installmentsCount: 3 },
            draftData: draftFormFixture({ ignoredField: 'No debe persistirse' })
        });
        assert.deepEqual(await operationalSnapshot(), baseline);
        assert.equal(draft.draftData.ignoredField, undefined);
        const changedData = draftFormFixture({ buyerName: 'Comprador QA actualizado', mileage: '250' });
        const update = await call('PATCH', `/api/admin/sales/${draft._id}`, { status: 'borrador', salePrice: 1300, draftData: changedData, notes: 'Continuar después', syncInstallmentPlan: true });
        assert.equal(update.status, 200, JSON.stringify(update.body));
        const get = await call('GET', `/api/admin/sales/${draft._id}`);
        assert.equal(get.status, 200);
        assert.equal(get.body.status, 'borrador');
        assert.equal(get.body.salePrice, 1300);
        assert.deepEqual(get.body.draftData, changedData);
        assert.equal(id(get.body.vehicleId), id(fixture.car));
        assert.equal(id(get.body.clientId), id(fixture.client));
        assert.deepEqual(await operationalSnapshot(), baseline);
    });

    test('PATCH permite quitar referencias opcionales con null o cadena vacía', async () => {
        const draft = await createDraft();
        const baseline = await operationalSnapshot();
        const result = await call('PATCH', `/api/admin/sales/${draft._id}`, {
            status: 'borrador', vehicleId: null, clientId: '', leadId: null,
            consignationOwnerId: '', consignationManagerId: null
        });
        assert.equal(result.status, 200, JSON.stringify(result.body));
        const stored = await models.Sale.findById(draft._id).lean();
        for (const key of ['vehicleId', 'clientId', 'leadId', 'consignationOwnerId', 'consignationManagerId']) assert.equal(stored[key], null, key);
        assert.deepEqual(await operationalSnapshot(), baseline);
    });

    test('rechaza importes negativos, moneda inválida y referencias mal formadas sin guardar', async () => {
        const baseline = await operationalSnapshot();
        for (const payload of [
            { salePrice: -1 }, { depositAppliedAmount: -1 }, { salePrice: 'NaN' },
            { saleCurrency: 'EUR' }, { vehicleId: 'no-es-id' }, { clientId: 'no-es-id' }, { leadId: 'no-es-id' }
        ]) {
            const response = await call('POST', '/api/admin/sales', { status: 'borrador', ...payload });
            assert.equal(response.status, 400, JSON.stringify({ payload, response }));
        }
        assert.equal(await models.Sale.countDocuments(), 0);
        assert.deepEqual(await operationalSnapshot(), baseline);
    });

    test('rechaza referencias inexistentes y datos arbitrarios de borrador sin efectos', async () => {
        const baseline = await operationalSnapshot();
        for (const field of ['vehicleId', 'clientId', 'leadId']) {
            const response = await call('POST', '/api/admin/sales', { status: 'borrador', [field]: new mongoose.Types.ObjectId().toString() });
            assert.equal(response.status, 400);
            assert.equal(response.body.code, 'SALE_REFERENCE_NOT_FOUND');
        }
        for (const draftData of [null, [], { buyerName: { nested: 'objeto' } }, { hasTradeIn: 'si' }, { buyerName: 'x'.repeat(301) }]) {
            assert.equal((await call('POST', '/api/admin/sales', { draftData })).status, 400);
        }
        assert.equal(await models.Sale.countDocuments(), 0);
        assert.deepEqual(await operationalSnapshot(), baseline);
    });

    test('una activación sin vehículo falla y conserva el borrador completo', async () => {
        const draft = await createDraft({ vehicleId: null });
        const baseline = await operationalSnapshot();
        const before = asPlain(await models.Sale.findById(draft._id).lean());
        const response = await call('PATCH', `/api/admin/sales/${draft._id}`, { status: 'confirmada' });
        assert.equal(response.status, 400);
        assert.equal(response.body.code, 'SALE_VEHICLE_REQUIRED');
        assert.deepEqual(asPlain(await models.Sale.findById(draft._id).lean()), before);
        assert.deepEqual(await operationalSnapshot(), baseline);
    });

    test('activar una vez convierte stock y lead sin acreditar señas, cuotas o dinero', async () => {
        const draft = await createDraft({ depositAppliedAmount: 100, depositAppliedCurrency: 'USD' });
        const baseline = await financialSnapshot();
        const response = await call('PATCH', `/api/admin/sales/${draft._id}`, { status: 'confirmada' });
        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.equal((await models.Car.findById(fixture.car._id)).status, 'Vendido');
        assert.equal((await models.Lead.findById(fixture.lead._id)).crmStatus, 'convertido');
        assert.equal((await models.Sale.findById(draft._id)).status, 'confirmada');
        assert.deepEqual(await financialSnapshot(), baseline);
        const carAfter = asPlain(await models.Car.findById(fixture.car._id).lean());
        const leadAfter = asPlain(await models.Lead.findById(fixture.lead._id).lean());
        const repeat = await call('PATCH', `/api/admin/sales/${draft._id}`, { status: 'confirmada' });
        assert.equal(repeat.status, 200, JSON.stringify(repeat.body));
        assert.deepEqual(asPlain(await models.Car.findById(fixture.car._id).lean()), carAfter);
        assert.deepEqual(asPlain(await models.Lead.findById(fixture.lead._id).lean()), leadAfter);
        assert.deepEqual(await financialSnapshot(), baseline);
    });

    test('borradores no bloquean la venta directa y solo la operación activa compromete stock', async () => {
        const draft = await createDraft();
        const second = await createDraft({ leadId: null });
        const baseline = await financialSnapshot();
        const result = await call('POST', '/api/admin/sales', { vehicleId: id(fixture.car), clientId: id(fixture.client), status: 'señado', salePrice: 1200, saleCurrency: 'USD' });
        assert.equal(result.status, 201, JSON.stringify(result.body));
        assert.equal((await models.Car.findById(fixture.car._id)).status, 'Reservado');
        for (const item of [draft, second]) assert.equal((await models.Sale.findById(item._id)).status, 'borrador');
        assert.equal((await models.Lead.findById(fixture.lead._id)).crmStatus, 'nuevo');
        assert.deepEqual(await financialSnapshot(), baseline);
        const blocked = await call('PATCH', `/api/admin/sales/${draft._id}`, { status: 'confirmada' });
        assert.equal(blocked.status, 409);
        assert.equal(blocked.body.code, 'SALE_VEHICLE_UNAVAILABLE');
        assert.equal((await models.Sale.findById(draft._id)).status, 'borrador');
    });

    test('dos activaciones concurrentes dejan un ganador y el otro borrador intacto', async () => {
        const lead2 = await models.Lead.create(leadFixture({ name: 'Segunda consulta QA' }));
        const first = await createDraft();
        const second = await createDraft({ leadId: id(lead2) });
        const loserSnapshots = new Map([[first._id, asPlain(await models.Sale.findById(first._id).lean())], [second._id, asPlain(await models.Sale.findById(second._id).lean())]]);
        const baseline = await financialSnapshot();
        const responses = await Promise.all([first, second].map((draft) => call('PATCH', `/api/admin/sales/${draft._id}`, { status: 'confirmada' })));
        assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409], JSON.stringify(responses));
        assert.equal(await models.Sale.countDocuments({ vehicleId: fixture.car._id, status: { $nin: ['borrador', 'cancelada'] } }), 1);
        const loser = responses[0].status === 409 ? first : second;
        assert.equal(responses.find((response) => response.status === 409).body.code, 'SALE_VEHICLE_UNAVAILABLE');
        assert.deepEqual(asPlain(await models.Sale.findById(loser._id).lean()), loserSnapshots.get(loser._id));
        assert.equal(await models.Lead.countDocuments({ crmStatus: 'convertido' }), 1);
        const car = await models.Car.findById(fixture.car._id).lean();
        assert.equal(car.status, 'Vendido');
        assert.equal(car.auditLog.filter((event) => event.action === 'ESTADO').length, 1);
        assert.deepEqual(await financialSnapshot(), baseline);
    });

    test('un fallo al convertir el lead revierte venta y stock en la misma transacción', async () => {
        const draft = await createDraft();
        const baseline = await operationalSnapshot();
        const saleBefore = asPlain(await models.Sale.findById(draft._id).lean());
        const originalUpdate = models.Lead.updateOne;
        let injected = false;
        try {
            models.Lead.updateOne = () => { injected = true; throw new Error('Fallo de escritura inyectado por QA'); };
            const result = await call('PATCH', `/api/admin/sales/${draft._id}`, { status: 'confirmada' });
            assert.ok(injected, 'El fallo debe ocurrir después de intentar activar la operación');
            assert.ok(result.status >= 400, JSON.stringify(result));
        } finally {
            models.Lead.updateOne = originalUpdate;
        }
        assert.deepEqual(asPlain(await models.Sale.findById(draft._id).lean()), saleBefore);
        assert.deepEqual(await operationalSnapshot(), baseline);
    });

    test('las cargas históricas cierran sin modificar unidades, lead ni caja', async () => {
        for (const carStatus of ['Disponible', 'Reservado', 'Vendido']) {
            await models.Car.updateOne({ _id: fixture.car._id }, { $set: { status: carStatus } });
            const baseline = await operationalSnapshot();
            const result = await call('POST', '/api/admin/sales', {
                isManualImport: true, status: 'confirmada', vehicleId: id(fixture.car),
                leadId: id(fixture.lead), salePrice: 1000, saleCurrency: 'USD'
            });
            assert.equal(result.status, 201, JSON.stringify(result.body));
            assert.equal(result.body.status, 'entregada');
            assert.equal(result.body.isManualImport, true);
            assert.deepEqual(await operationalSnapshot(), baseline);
        }
        const withoutVehicle = await call('POST', '/api/admin/sales', { isManualImport: true, salePrice: 500, saleCurrency: 'ARS' });
        assert.equal(withoutVehicle.status, 201, JSON.stringify(withoutVehicle.body));
        assert.equal(withoutVehicle.body.status, 'entregada');
    });

    test('una venta activa o cancelada no vuelve a borrador; rol lectura no edita borrador', async () => {
        const draft = await createDraft();
        const baseline = await operationalSnapshot();
        assert.equal((await call('PATCH', `/api/admin/sales/${draft._id}`, { notes: 'No autorizado' }, makeToken('solo_lectura'))).status, 403);
        for (const status of ['confirmada', 'cancelada']) {
            const sale = await models.Sale.create({ status, salePrice: 50, saleCurrency: 'USD' });
            const before = asPlain(await models.Sale.findById(sale._id).lean());
            const result = await call('PATCH', `/api/admin/sales/${sale._id}`, { status: 'borrador' });
            assert.equal(result.status, 409);
            assert.equal(result.body.code, 'SALE_ACTIVE_TO_DRAFT_BLOCKED');
            assert.deepEqual(asPlain(await models.Sale.findById(sale._id).lean()), before);
        }
        assert.deepEqual(await operationalSnapshot(), baseline);
    });

    test('las URLs operativas rechazan cobrar, generar cuotas o alterar stock desde un borrador', async () => {
        const draft = await createDraft();
        const installment = await models.Installment.create(installmentFixture({
            source: 'venta', saleId: draft._id, dueDate: dayFromToday(1)
        }));
        const listed = await call('GET', '/api/admin/installments');
        assert.equal(listed.status, 200, JSON.stringify(listed.body));
        const listedDraftInstallment = listed.body.find(item => item._id === id(installment));
        assert.equal(listedDraftInstallment.saleId, draft._id, 'El enriquecimiento conserva el identificador de venta');
        assert.equal(listedDraftInstallment.saleStatus, 'borrador');
        assert.equal(listedDraftInstallment.saleHistoricalOnly, false);
        const transaction = await models.Transaction.findOne();
        const baseline = await operationalSnapshot();
        const saleBefore = asPlain(await models.Sale.findById(draft._id).lean());
        const guardedCalls = [
            ['PATCH', `/api/admin/sales/${draft._id}/link-vehicle`, { vehicleId: id(fixture.car) }],
            ['POST', `/api/admin/sales/${draft._id}/change-vehicle`, {}],
            ['POST', `/api/admin/sales/${draft._id}/create-link-vehicle`, {}],
            ['POST', `/api/admin/sales/${draft._id}/trade-ins/0/create-stock-car`, {}],
            ['POST', `/api/admin/cars/${id(fixture.car)}/link-trade-in`, { saleId: draft._id }],
            ['POST', '/api/admin/transactions', { saleId: draft._id, accountId: id(fixture.ars), amount: 10, currency: 'ARS', type: 'Ingreso' }],
            ['PATCH', `/api/admin/transactions/${id(transaction)}`, { saleId: draft._id, amount: 10 }],
            ['POST', '/api/admin/installments/manual-and-assign', { saleId: draft._id }],
            ['POST', '/api/admin/installments', { saleId: draft._id }],
            ['POST', `/api/admin/installments/${id(installment)}/pay`, { amount: 10, accountId: id(fixture.ars) }],
            ['POST', `/api/admin/sales/${draft._id}/installments/generate`, {}],
            ['POST', `/api/admin/finance/payables/${draft._id}/pay`, {}]
        ];
        for (const [method, path, body] of guardedCalls) {
            const result = await call(method, path, body);
            assert.equal(result.status, 409, `${method} ${path}: ${JSON.stringify(result.body)}`);
            assert.equal(result.body.code, 'SALE_DRAFT_NOT_OPERATIONAL', path);
        }
        assert.deepEqual(asPlain(await models.Sale.findById(draft._id).lean()), saleBefore);
        assert.deepEqual(await operationalSnapshot(), baseline);
    });

    test('Cobrar y Distribuir rechaza un borrador también desde su servicio sin tocar cuentas o cajas', async () => {
        const draft = await createDraft();
        // Inicialización normal de una tesorería configurada, antes del intento inválido.
        await treasuryService.ensureDefaultBoxes();
        const baseline = await treasurySnapshot();
        await assert.rejects(() => treasuryService.collectAndDistribute({
            saleId: draft._id, amount: 10, currency: 'USD', accountId: id(fixture.usd),
            idempotencyKey: `qa-draft-${crypto.randomUUID()}`, conceptType: 'saldo', distributeNow: false
        }, { role: 'owner', username: 'qa_owner', id: new mongoose.Types.ObjectId().toString() }), /Activá el borrador/i);
        assert.deepEqual(await treasurySnapshot(), baseline);
    });

    test('una cuota de la venta A no puede acreditarse a la venta B por API ni por Tesorería', async () => {
        const [saleA, saleB] = await models.Sale.create([
            { status: 'confirmada', salePrice: 100, saleCurrency: 'USD' },
            { status: 'confirmada', salePrice: 100, saleCurrency: 'USD' }
        ]);
        const installment = await models.Installment.create(installmentFixture({
            source: 'venta', saleId: saleA._id, amount: 100, paidAmount: 20,
            currency: 'USD', status: 'parcial', dueDate: dayFromToday(1)
        }));
        await treasuryService.ensureDefaultBoxes();
        const baseline = await treasurySnapshot();
        const result = await call('POST', '/api/admin/transactions', {
            saleId: id(saleB), installmentId: id(installment), accountId: id(fixture.usd),
            amount: 10, currency: 'USD', type: 'Ingreso', description: 'Cobro QA', category: 'Pruebas'
        });
        assert.equal(result.status, 409, JSON.stringify(result.body));
        assert.equal(result.body.code, 'INSTALLMENT_SALE_MISMATCH');
        await assert.rejects(() => treasuryService.collectAndDistribute({
            saleId: id(saleB), installmentId: id(installment), amount: 10, currency: 'USD',
            accountId: id(fixture.usd), idempotencyKey: `qa-mismatch-${crypto.randomUUID()}`, distributeNow: false
        }, { role: 'owner', username: 'qa_owner', id: new mongoose.Types.ObjectId().toString() }), /cuota no pertenece a la venta/i);
        assert.deepEqual(await treasurySnapshot(), baseline);
    });

    test('GET de liquidez exige simultáneamente finanzas.read y caja.read', async () => {
        const baseline = await operationalSnapshot();
        assert.equal((await call('GET', '/api/admin/finance/cash-projection', undefined, null)).status, 401);
        for (const permissions of [undefined, ['finanzas.read'], ['caja.read']]) {
            assert.equal((await call('GET', '/api/admin/finance/cash-projection', undefined, makeToken('solo_lectura', permissions))).status, 403);
        }
        const result = await call('GET', '/api/admin/finance/cash-projection', undefined, makeToken('solo_lectura', ['finanzas.read', 'caja.read']));
        assert.equal(result.status, 200, JSON.stringify(result.body));
        assert.match(result.headers.get('cache-control'), /no-store/);
        assert.deepEqual(await operationalSnapshot(), baseline);
    });

    test('GET de liquidez usa cuotas netas y reprogramadas, excluye borradores y no escribe', async () => {
        const draftSale = await models.Sale.create({ status: 'borrador', salePrice: 100, saleCurrency: 'ARS' });
        const cancelledSale = await models.Sale.create({ status: 'cancelada', salePrice: 100, saleCurrency: 'ARS' });
        const partial = await models.Installment.create(installmentFixture({ amount: 100, paidAmount: 25, status: 'parcial', dueDate: dayFromToday(1) }));
        await models.Installment.create([
            installmentFixture({ installmentNumber: 2, amount: 40, paidAmount: 10, currency: 'USD', status: 'reprogramada', dueDate: dayFromToday(-10), isRescheduled: true, rescheduledDate: dayFromToday(2) }),
            installmentFixture({ installmentNumber: 3, amount: 600, saleId: draftSale._id, source: 'venta', dueDate: dayFromToday(1) }),
            installmentFixture({ installmentNumber: 4, amount: 500, saleId: cancelledSale._id, source: 'venta', dueDate: dayFromToday(1) }),
            installmentFixture({ installmentNumber: 5, amount: 100, paidAmount: 100, status: 'pagada', dueDate: dayFromToday(1) }),
            installmentFixture({ installmentNumber: 6, amount: 70, paidAmount: 20, status: 'vencida', dueDate: dayFromToday(-2) }),
            installmentFixture({ installmentNumber: 7, amount: 80, currency: 'USD', status: 'anulada', dueDate: dayFromToday(1) })
        ]);
        // Registro legado sin fecha: el resumen debe advertirlo, sin inventar vencimiento.
        await models.Installment.collection.insertOne(installmentFixture({ installmentNumber: 8, amount: 90, paidAmount: 10 }));
        await models.Account.create(accountFixture({ name: 'Cuenta inactiva QA', balance: 9000, isActive: false }));
        await models.Transaction.create([
            transactionFixture({ accountId: fixture.ars._id, status: 'pendiente', amount: 20, dueDate: dayFromToday(3) }),
            transactionFixture({ accountId: fixture.usd._id, status: 'pendiente', type: 'Egreso', amount: 7, currency: 'USD', dueDate: dayFromToday(4) }),
            transactionFixture({ accountId: fixture.ars._id, status: 'pendiente', amount: 75, installmentId: partial._id, dueDate: dayFromToday(1) }),
            transactionFixture({ accountId: fixture.ars._id, status: 'pendiente', type: 'Egreso', amount: 5, date: dayFromToday(2) }),
            transactionFixture({ accountId: fixture.ars._id, status: 'anulado', amount: 999, dueDate: dayFromToday(1) })
        ]);
        const baseline = await operationalSnapshot();
        const salesBefore = asPlain(await models.Sale.find().sort({ _id: 1 }).lean());
        const result = await call('GET', '/api/admin/finance/cash-projection');
        assert.equal(result.status, 200, JSON.stringify(result.body));
        assert.deepEqual(result.body.openingBalances, { ARS: 1000, USD: 50 });
        assert.deepEqual(result.body.periods.map((period) => period.days), [7, 15, 30]);
        for (const period of result.body.periods) {
            assert.deepEqual(period.incoming, { ARS: 95, USD: 30 });
            assert.deepEqual(period.outgoing, { ARS: 0, USD: 7 });
            assert.deepEqual(period.closingBalances, { ARS: 1095, USD: 73 });
        }
        assert.equal(result.body.overdue.incoming.ARS, 50);
        assert.equal(result.body.undated.incoming.ARS, 80);
        assert.equal(result.body.undated.outgoing.ARS, 5);
        assert.equal(result.body.quality.excluded.linkedInstallmentTransactions, 1);
        assert.equal(result.body.quality.excluded.inactiveSales, 2);
        assert.deepEqual(await operationalSnapshot(), baseline);
        assert.deepEqual(asPlain(await models.Sale.find().sort({ _id: 1 }).lean()), salesBefore);
    });

    test('vencimientos próximos devuelve saldo neto y fecha efectiva de cuotas reprogramadas', async () => {
        const partial = await models.Installment.create(installmentFixture({ amount: 100, paidAmount: 25, status: 'parcial', dueDate: dayFromToday(1) }));
        const moved = await models.Installment.create(installmentFixture({ installmentNumber: 2, amount: 40, paidAmount: 10, currency: 'USD', status: 'reprogramada', dueDate: dayFromToday(-20), isRescheduled: true, rescheduledDate: dayFromToday(2) }));
        await models.Installment.create(installmentFixture({ installmentNumber: 3, status: 'pagada', amount: 100, paidAmount: 100, dueDate: dayFromToday(1) }));
        const baseline = await operationalSnapshot();
        const result = await call('GET', '/api/admin/dashboard/upcoming-dues');
        assert.equal(result.status, 200, JSON.stringify(result.body));
        const byId = new Map(result.body.map((item) => [item._id, item]));
        assert.equal(byId.size, 2);
        assert.equal(byId.get(id(partial)).amount, 100, 'El acuerdo original no se reemplaza por el saldo');
        assert.equal(byId.get(id(partial)).pendingAmount, 75);
        assert.equal(byId.get(id(moved)).pendingAmount, 30);
        assert.equal(byId.get(id(moved)).effectiveDueDate.slice(0, 10), dayFromToday(2).toISOString().slice(0, 10));
        assert.deepEqual(await operationalSnapshot(), baseline);
    });
});
