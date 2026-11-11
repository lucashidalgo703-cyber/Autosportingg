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
    const commercialTradeIn = (overrides = {}) => ({ _id: new mongoose.Types.ObjectId().toString(), brand:'Prueba', model:'Permuta', year:2020, mileage:10000, estimatedValue:5000, askingPrice:7000, currency:'USD', fuel:'Diesel', condition:'Usado', shouldEnterStock:true, ...overrides });
    test('acuerdo crea señas pendientes y permutas atómicas sin generar caja; checkout stock conserva moneda y consignación', async()=>{
        const financial = await financialSnapshot(); const row = commercialTradeIn({consigned:true});
        const result = await call('POST','/api/admin/sales',{vehicleId:id(fixture.car),salePrice:20000,saleCurrency:'USD',depositRecords:[{amount:1000,currency:'USD',date:'2026-11-10',accountId:id(fixture.usd),status:'confirmada'}],tradeIns:[row],draftData:{buyerName:'Comprador prueba'}});
        assert.equal(result.status,201,JSON.stringify(result.body)); assert.equal(result.body.depositRecords[0].status,'pendiente'); assert.equal(result.body.depositAppliedAmount,0);
        const car = await models.Car.findById(result.body.tradeIns[0].linkedStockCarId).lean();
        assert.equal(car.fuel,'Diesel');assert.equal(car.price,7000);assert.equal(car.purchasePrice,5000);assert.equal(car.agencyOwned,false);assert.equal(car.tradeInOrigin.consigned,true);assert.equal(car.visibleEnWeb,false);assert.equal(car.status,'Pausado');
        assert.deepEqual(await financialSnapshot(),financial);
        const detail = await call('GET','/api/admin/sales/'+result.body._id);assert.equal(detail.body.finance.netoCobrado,0);assert.equal(detail.body.finance.pendingBalance,15000);
    });
    test('borrador e histórico guardan acuerdo sin autoalta y checkbox off conserva permuta sin Car', async()=>{
        const baseline = await financialSnapshot(); const count = await models.Car.countDocuments();
        for (const mode of ['borrador','historical','off']) {
            const result = await call('POST','/api/admin/sales',{...(mode==='historical'?{isManualImport:true}:{}),status:mode==='borrador'?'borrador':'confirmada',vehicleId:mode==='off'?id(fixture.car):null,salePrice:20000,saleCurrency:'USD',tradeIns:[commercialTradeIn({shouldEnterStock:mode!=='off'})]});
            assert.equal(result.status,201,JSON.stringify(result.body));assert.equal(result.body.tradeIns.length,1);assert.equal(result.body.tradeIns[0].linkedStockCarId,undefined);
        }
        assert.equal(await models.Car.countDocuments(),count); assert.deepEqual(await financialSnapshot(),baseline);
    });
    test('error de cuenta o permiso y fallo posterior al alta de permuta revierten venta y stock completos', async()=>{
        const baseline = await operationalSnapshot(); const body={vehicleId:id(fixture.car),salePrice:20000,saleCurrency:'USD',tradeIns:[commercialTradeIn()]};
        const mismatch=await call('POST','/api/admin/sales',{...body,depositRecords:[{amount:10,currency:'USD',date:'2026-11-10',accountId:id(fixture.ars)}]}); assert.equal(mismatch.status,400,JSON.stringify(mismatch.body));
        const noStock=await call('POST','/api/admin/sales',body,makeToken('solo_lectura',['ventas.write'])); assert.equal(noStock.status,403,JSON.stringify(noStock.body));
        const original=models.Sale.prototype.save; models.Sale.prototype.save=async function(){throw new Error('QA injected after trade-in creation');};
        try { assert.ok((await call('POST','/api/admin/sales',body)).status >= 400); } finally {models.Sale.prototype.save=original;}
        assert.equal(await models.Sale.countDocuments(),0);assert.deepEqual(await operationalSnapshot(),baseline);
    });
    test('editor conserva estado/finanzas/permutas vinculadas; bitácora append y recordatorios roundtrip',async()=>{
        const result=await call('POST','/api/admin/sales',{vehicleId:id(fixture.car),salePrice:20000,saleCurrency:'USD',tradeIns:[commercialTradeIn()]});assert.equal(result.status,201,JSON.stringify(result.body));
        const sid=result.body._id; const financial=await financialSnapshot(); const linked=result.body.tradeIns[0].linkedStockCarId;
        const edit=await call('PATCH','/api/admin/sales/'+sid+'/workspace',{draftData:{buyerName:'Nombre corregido'},managementNote:{recipient:'finanzas',text:'Revisar constancia'},reminders:[{type:'vtv',date:'2026-12-10',note:'Verificar fecha'}],reviewAsked:true,tradeIns:result.body.tradeIns});
        assert.equal(edit.status,200,JSON.stringify(edit.body));assert.equal(edit.body.status,'confirmada');assert.equal(edit.body.managementNotes.length,1);assert.equal(edit.body.managementNotes[0].author,'qa_owner');assert.equal(edit.body.reminders[0].type,'vtv');assert.equal(edit.body.tradeIns[0].linkedStockCarId,linked);assert.ok(edit.body.reviewAskedAt);
        assert.equal((await call('PATCH','/api/admin/sales/'+sid+'/workspace',{status:'entregada'})).status,409);assert.equal((await call('PATCH','/api/admin/sales/'+sid+'/workspace',{tradeIns:[]})).status,400);assert.deepEqual(await financialSnapshot(),financial);
        await models.Installment.create(installmentFixture({saleId:sid,source:'venta',dueDate:new Date('2026-12-10T00:00:00Z')})); assert.equal((await call('PATCH','/api/admin/sales/'+sid+'/workspace',{salePrice:1})).status,409);
    });
    test('estado reserva/cierre y liquidación auditada no registran caja; lectores bloqueados',async()=>{
        const result=await call('POST','/api/admin/sales',{vehicleId:id(fixture.car),salePrice:20000,saleCurrency:'USD'});const sid=result.body._id;const financial=await financialSnapshot();
        assert.equal((await call('PATCH','/api/admin/sales/'+sid+'/workspace-status',{status:'entregada',reason:''})).status,400);
        assert.equal((await call('PATCH','/api/admin/sales/'+sid+'/workspace-status',{status:'señado',reason:'Se acuerda reserva'},makeToken('solo_lectura'))).status,403);
        const reserved=await call('PATCH','/api/admin/sales/'+sid+'/workspace-status',{status:'señado',reason:'Se acuerda reserva'});assert.equal(reserved.status,200,JSON.stringify(reserved.body));assert.equal((await models.Car.findById(fixture.car._id)).status,'Reservado');
        const closed=await call('PATCH','/api/admin/sales/'+sid+'/workspace-status',{status:'entregada',reason:'Entrega confirmada'});assert.equal(closed.status,200,JSON.stringify(closed.body));assert.equal(closed.body.status,'entregada');assert.equal((await models.Car.findById(fixture.car._id)).status,'Vendido');
        const settled=await call('PATCH','/api/admin/sales/'+sid+'/commission-settlement',{settled:true,note:'Liquidación declarada por el responsable'});assert.equal(settled.status,200,JSON.stringify(settled.body));assert.equal(settled.body.commissionSettlement.settled,true);assert.deepEqual(await financialSnapshot(),financial);
    });
    test('crear y vincular comprador es atómico, requiere Clientes.write y reintento no duplica',async()=>{
        const sale=await models.Sale.create({status:'confirmada',salePrice:100,saleCurrency:'USD',draftData:{buyerName:'Comprador demo',buyerDni:'DEMO123'}});const path='/api/admin/sales/'+sale._id+'/create-link-client';
        assert.equal((await call('POST',path,{},makeToken('solo_lectura',['ventas.write']))).status,403);
        const count=await models.Client.countDocuments();const first=await call('POST',path,{});assert.equal(first.status,200,JSON.stringify(first.body));assert.equal(first.body.client.dniCuit,'DEMO123');assert.equal(first.body.client.phone,'');
        const retry=await call('POST',path,{fullName:'No reemplazar'});assert.equal(retry.status,200);assert.equal(retry.body.client._id,first.body.client._id);assert.equal(await models.Client.countDocuments(),count+1);
        const fresh=await models.Sale.create({status:'confirmada',salePrice:1,saleCurrency:'USD'});const original=models.Sale.updateOne;models.Sale.updateOne=()=>{throw new Error('QA link failure');};try{assert.equal((await call('POST','/api/admin/sales/'+fresh._id+'/create-link-client',{fullName:'Rollback comprador'})).status,500);}finally{models.Sale.updateOne=original;}assert.equal(await models.Client.countDocuments(),count+1);
    });

    test('conciliar seña manual aplica ingreso existente una sola vez y marca Caja Aplicada en misma transacción',async()=>{
        const Entry=(await import('../../src/models/FinanceManualEntry.js')).default;
        const sale=await models.Sale.create({status:'confirmada',salePrice:1000,saleCurrency:'USD',depositRecords:[{amount:100,currency:'USD',date:'2026-11-10',accountId:fixture.usd._id},{amount:100,currency:'USD',date:'2026-11-10'}]});
        const txId=new mongoose.Types.ObjectId();const entry=await Entry.create({kind:'deposit',label:'Seña QA',status:'Recibida',amount:100,currency:'USD',date:new Date('2026-11-10'),accountId:fixture.usd._id,saleId:sale._id,transactionId:txId,createdBy:'qa_owner',idempotencyKey:crypto.randomUUID(),payloadHash:'fixture'});
        const tx=await models.Transaction.create(transactionFixture({_id:txId,saleId:sale._id,accountId:fixture.usd._id,amount:100,currency:'USD',source:'manual',concept:'finance_manual_deposit',financeManualEntryId:entry._id}));
        const accounts=asPlain(await models.Account.find().sort({_id:1}).lean());const txCount=await models.Transaction.countDocuments();
        assert.equal((await call('GET','/api/admin/sales/'+sale._id)).body.finance.netoCobrado,0);
        const path='/api/admin/sales/'+sale._id+'/deposit-records/'+sale.depositRecords[0]._id+'/confirm';
        assert.equal((await call('PATCH',path,{transactionId:id(tx)},makeToken('solo_lectura',['ventas.write','caja.write']))).status,403);
        const applied=await call('PATCH',path,{transactionId:id(tx)});assert.equal(applied.status,200,JSON.stringify(applied.body));assert.equal(applied.body.finance.netoCobrado,100);assert.equal(applied.body.finance.pendingBalance,900);assert.equal(applied.body.depositRecords[0].status,'confirmada');
        const storedEntry=await Entry.findById(entry._id);assert.equal(storedEntry.status,'Aplicada');assert.equal(id(storedEntry.appliedSaleDepositId),id(sale.depositRecords[0]));assert.equal(id((await models.Transaction.findById(tx._id)).saleDepositRecordId),id(sale.depositRecords[0]));
        assert.equal((await call('PATCH',path,{transactionId:id(tx)})).status,200);
        assert.equal((await call('PATCH','/api/admin/sales/'+sale._id+'/deposit-records/'+sale.depositRecords[1]._id+'/confirm',{transactionId:id(tx)})).status,409);
        assert.equal(await models.Transaction.countDocuments(),txCount);assert.deepEqual(asPlain(await models.Account.find().sort({_id:1}).lean()),accounts);
    });
    test('conciliación concurrente tiene un ganador y un error posterior revierte claim de ingreso',async()=>{
        const sale=await models.Sale.create({status:'confirmada',salePrice:1000,saleCurrency:'USD',depositRecords:[{amount:100,currency:'USD',date:'2026-11-10'},{amount:100,currency:'USD',date:'2026-11-10'}]});
        const tx=await models.Transaction.create(transactionFixture({saleId:sale._id,accountId:fixture.usd._id,amount:100,currency:'USD',source:'venta'}));
        const path=row=>'/api/admin/sales/'+sale._id+'/deposit-records/'+row._id+'/confirm';
        const original=models.Sale.prototype.save;models.Sale.prototype.save=async function(){throw new Error('QA confirmation rollback');};try{assert.equal((await call('PATCH',path(sale.depositRecords[0]),{transactionId:id(tx)})).status,500);}finally{models.Sale.prototype.save=original;}
        assert.equal((await models.Transaction.findById(tx._id)).saleDepositRecordId,null);
        const results=await Promise.all(sale.depositRecords.map(row=>call('PATCH',path(row),{transactionId:id(tx)})));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal((await models.Sale.findById(sale._id)).depositRecords.filter(row=>row.status==='confirmada').length,1);
    });

    test('autoalta de permuta rechaza identidad del vehículo vendido aunque el claim ya lo cambió a Vendido',async()=>{
        const before=await operationalSnapshot();
        const result=await call('POST','/api/admin/sales',{vehicleId:id(fixture.car),salePrice:20000,saleCurrency:'USD',tradeIns:[commercialTradeIn({plate:fixture.car.plateOrVin})]});
        assert.equal(result.status,409,JSON.stringify(result.body));assert.equal(result.body.code,'VEHICLE_IDENTITY_CONFLICT');assert.equal(await models.Sale.countDocuments(),0);assert.deepEqual(await operationalSnapshot(),before);
    });

    const buyerDeclaration=(overrides={})=>({mode:'external',amount:300,currency:'USD',date:'2026-11-10',method:'transferencia',reason:'Pago directo fuera de la agencia, informado por responsable',expectedPendingBalance:1000,idempotencyKey:crypto.randomUUID(),...overrides});
    test('pago externo requiere ambos permisos y reintento/cambio de sesión no duplica ni acredita caja',async()=>{
        const sale=await models.Sale.create({status:'confirmada',salePrice:1000,saleCurrency:'USD',isManualImport:true,historicalOnly:false,notes:'Legacy preservado',commissionSettings:{sellerPct:2,isManual:true}});const path='/api/admin/sales/'+sale._id+'/buyer-payments';const body={...buyerDeclaration(),salePrice:1,status:'cancelada',historicalOnly:true,depositAppliedAmount:99999};const baseline=await financialSnapshot();
        assert.equal((await call('POST',path,body,null)).status,401);
        assert.equal((await call('POST',path,body,makeToken('solo_lectura',['ventas.write']))).status,403);assert.equal((await call('POST',path,body,makeToken('solo_lectura',['finanzas.write']))).status,403);
        const first=await call('POST',path,body);assert.equal(first.status,201,JSON.stringify(first.body));assert.equal(first.body.sale.finance.netoCobrado,0);assert.equal(first.body.sale.finance.externalPaid,300);assert.equal(first.body.sale.finance.pendingBalance,700);assert.equal(first.body.sale.status,'confirmada');assert.equal(first.body.sale.historicalOnly,false);assert.equal(first.body.sale.isManualImport,true);assert.equal(first.body.sale.notes,'Legacy preservado');assert.equal(first.body.sale.commissionSettings.sellerPct,2);assert.doesNotMatch(JSON.stringify(first.body),/payloadHash|idempotencyKey/);
        const retry=await call('POST',path,body,makeToken('solo_lectura',['ventas.write','finanzas.write']));assert.equal(retry.status,200,JSON.stringify(retry.body));assert.equal(retry.body.declarationId,first.body.declarationId);assert.equal((await models.Sale.findById(sale._id)).externalBuyerPayments.length,1);
        assert.equal((await call('PATCH','/api/admin/sales/'+sale._id+'/workspace',{salePrice:900})).status,409);assert.equal((await call('PATCH','/api/admin/sales/'+sale._id,{saleCurrency:'ARS'})).status,409);
        assert.equal((await call('POST',path,{...body,amount:100})).status,409);assert.equal((await call('POST',path,buyerDeclaration({amount:100}))).status,409);assert.deepEqual(await financialSnapshot(),baseline);
    });
    test('histórico y dar por saldado toman sólo el pendiente y preservan estado, importación y ledger',async()=>{
        for(const mode of ['historical','settled']){
            const sale=await models.Sale.create({status:'entregada',salePrice:1000,saleCurrency:'USD',depositAppliedAmount:100,depositAppliedCurrency:'USD'});
            await models.Transaction.create(transactionFixture({saleId:sale._id,accountId:fixture.usd._id,amount:200,currency:'USD',source:'venta'}));const baseline=await financialSnapshot();
            const result=await call('POST','/api/admin/sales/'+sale._id+'/buyer-payments',buyerDeclaration({mode,amount:999999,expectedPendingBalance:700}));assert.equal(result.status,201,JSON.stringify(result.body));assert.equal(result.body.sale.buyerBalanceAdjustments[0].amount,700);assert.equal(result.body.sale.buyerBalanceAdjustments[0].mode,mode);assert.equal(result.body.sale.finance.netoCobrado,300);assert.equal(result.body.sale.finance.pendingBalance,0);assert.equal(result.body.sale.status,'entregada');assert.equal(result.body.sale.historicalOnly,false);assert.equal(result.body.sale.isManualImport,false);assert.equal(result.body.sale.depositAppliedAmount,100);assert.deepEqual(await financialSnapshot(),baseline);
            assert.ok(result.body.sale.saleAuditLog.some(row=>row.action=== (mode==='historical'?'SALDO_HISTORICO_DECLARADO':'SALDO_DADO_POR_SALDADO')));
        }
    });
    test('declaraciones rechazan cero/exceso/otra moneda y cuotas vigentes sin extinguir obligaciones',async()=>{
        const sale=await models.Sale.create({status:'confirmada',salePrice:1000,saleCurrency:'USD'});const path='/api/admin/sales/'+sale._id+'/buyer-payments';
        for(const invalid of [{amount:0},{amount:-1},{amount:1001},{currency:'ARS'},{reason:''},{method:''},{date:'2026-02-30'}])assert.equal((await call('POST',path,buyerDeclaration(invalid))).status,400,JSON.stringify(invalid));
        const installment=await models.Installment.create(installmentFixture({saleId:sale._id,source:'venta',amount:1000,currency:'USD',dueDate:new Date('2026-12-10T00:00:00Z')}));const baseline=await financialSnapshot();
        for(const mode of ['external','historical','settled']){const result=await call('POST',path,buyerDeclaration({mode}));assert.equal(result.status,409,JSON.stringify(result.body));assert.equal(result.body.code,'SALE_INSTALLMENT_WORKFLOW_REQUIRED');}
        assert.equal((await models.Installment.findById(installment._id)).status,'pendiente');assert.deepEqual(await financialSnapshot(),baseline);assert.equal((await models.Sale.findById(sale._id)).externalBuyerPayments.length,0);
        for(const overrides of [{status:'borrador'},{status:'cancelada'},{historicalOnly:true}]){const blocked=await models.Sale.create({status:'confirmada',salePrice:1000,saleCurrency:'USD',...overrides});assert.equal((await call('POST','/api/admin/sales/'+blocked._id+'/buyer-payments',buyerDeclaration())).status,409);}
    });
    test('CAS entre pagos externos conserva un ganador y fallo de auditoría revierte declaración completa',async()=>{
        const sale=await models.Sale.create({status:'confirmada',salePrice:1000,saleCurrency:'USD'});const path='/api/admin/sales/'+sale._id+'/buyer-payments';const baseline=await financialSnapshot();
        const original=models.AuditLog.create;models.AuditLog.create=()=>{throw new Error('QA buyer declaration rollback');};try{assert.equal((await call('POST',path,buyerDeclaration())).status,500);}finally{models.AuditLog.create=original;}
        assert.equal((await models.Sale.findById(sale._id)).externalBuyerPayments.length,0);
        const results=await Promise.all([call('POST',path,buyerDeclaration({amount:600})),call('POST',path,buyerDeclaration({amount:600}))]);assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);const stored=await models.Sale.findById(sale._id);assert.equal(stored.externalBuyerPayments.length,1);assert.equal((await call('GET','/api/admin/sales/'+sale._id)).body.finance.pendingBalance,400);assert.deepEqual(await financialSnapshot(),baseline);
    });

    test('workspace server pagina y ordena globalmente con conteos/totales completos, monedas separadas y permisos',async()=>{
        const rows=[];for(let i=0;i<25;i++)rows.push({status:i===0?'pendiente_entrega':'confirmada',salePrice:i+1,saleCurrency:i%2?'USD':'ARS',salesperson:i%2?'beta':'alpha',vehicleId:fixture.car._id,saleDate:new Date('2026-11-'+String(i+1).padStart(2,'0')+'T00:00:00Z'),draftData:{buyerName:'Actual '+String(24-i).padStart(2,'0')}});
        rows.push({status:'borrador',salePrice:999,saleCurrency:'USD',salesperson:'alpha'},{status:'cancelada',salePrice:1000,saleCurrency:'ARS',salesperson:'beta'},{status:'entregada',historicalOnly:true,salePrice:50,saleCurrency:'USD',salesperson:'alpha'});await models.Sale.insertMany(rows);
        const baseline=await financialSnapshot();const prefix='/api/admin/sales?workspace=1&sort=price&direction=asc&limit=20';
        const first=await call('GET',prefix+'&page=1');const second=await call('GET',prefix+'&page=2');assert.equal(first.status,200,JSON.stringify(first.body));assert.equal(second.status,200,JSON.stringify(second.body));assert.equal(first.body.sales.length,20);assert.equal(second.body.sales.length,8);assert.equal(first.body.total,28);assert.equal(first.body.pages,2);assert.deepEqual(first.body.summary,second.body.summary);assert.deepEqual(first.body.summary.totals,{ARS:169,USD:206});assert.equal(first.body.summary.computableCount,26);assert.equal(first.body.statusCounts.confirmada,25);assert.equal(first.body.statusCounts.borrador,1);assert.equal(first.body.sellerCounts.find(row=>row.value==='').count,28);
        const all=[...first.body.sales,...second.body.sales];assert.equal(new Set(all.map(row=>row._id)).size,28);assert.ok(all.slice(0,14).every(row=>row.saleCurrency==='ARS'));assert.equal(all[13].salePrice,1000);assert.equal(all[14].saleCurrency,'USD');assert.equal(all[14].salePrice,2);
        const narrowed=await call('GET','/api/admin/sales?workspace=1&seller=alpha&status=confirmada&search=Actual');assert.equal(narrowed.body.total,13);assert.equal(narrowed.body.statusCounts.confirmada,13);assert.equal(narrowed.body.sellerCounts.find(row=>row.value==='').count,25);assert.deepEqual(narrowed.body.summary.totals,{ARS:169,USD:0});
        const reader=makeToken('solo_lectura',['ventas.read']);const restricted=await call('GET',prefix,undefined,reader);assert.equal(restricted.status,200);assert.equal(restricted.body.sales.find(row=>row.vehicleId)?.vehicleId?.purchasePrice,undefined);assert.equal((await call('GET',prefix+'&export=1',undefined,reader)).status,403);const exported=await call('GET',prefix+'&export=1');assert.equal(exported.body.sales.length,28);
        for(const suffix of ['sort=commission','sort=%24where','direction=sideways','page=1.5','limit=1000'])assert.equal((await call('GET','/api/admin/sales?workspace=1&'+suffix)).status,400,suffix);assert.deepEqual(await financialSnapshot(),baseline);
    });
    test('estados iniciales Reserva y Cancelada respetan stock, caja, permisos y cierre operativo separado',async()=>{
        const baseline=await financialSnapshot();
        const reserved=await call('POST','/api/admin/sales',{status:'señado',vehicleId:id(fixture.car),salePrice:1200,saleCurrency:'USD'});assert.equal(reserved.status,201,JSON.stringify(reserved.body));assert.equal(reserved.body.status,'señado');assert.equal((await models.Car.findById(fixture.car._id)).status,'Reservado');
        const stock=asPlain(await models.Car.findById(fixture.car._id).lean());const lead=asPlain(await models.Lead.findById(fixture.lead._id).lean());
        const cancelledBody={status:'cancelada',vehicleId:id(fixture.car),salePrice:1200,saleCurrency:'USD',initialCancellationReason:'Operación anterior no concretada'};
        assert.equal((await call('POST','/api/admin/sales',{...cancelledBody,initialCancellationReason:''})).status,400);assert.equal((await call('POST','/api/admin/sales',cancelledBody,makeToken('solo_lectura',['ventas.write']))).status,403);
        const cancelled=await call('POST','/api/admin/sales',cancelledBody);assert.equal(cancelled.status,201,JSON.stringify(cancelled.body));assert.equal(cancelled.body.status,'cancelada');assert.equal(cancelled.body.historicalOnly,false);assert.equal(cancelled.body.cancellationReason,cancelledBody.initialCancellationReason);assert.ok(cancelled.body.cancelledBy);assert.ok(cancelled.body.saleAuditLog.some(row=>row.action==='VENTA_CANCELADA_CREADA'));
        const close=await call('POST','/api/admin/sales',{status:'entregada',vehicleId:id(fixture.car),salePrice:1200,saleCurrency:'USD'});assert.equal(close.status,409,JSON.stringify(close.body));assert.equal(close.body.code,'SALE_INITIAL_CLOSURE_WORKFLOW_REQUIRED');
        const historical=await call('POST','/api/admin/sales',{isManualImport:true,status:'entregada',salePrice:1200,saleCurrency:'USD'});assert.equal(historical.status,201,JSON.stringify(historical.body));assert.equal(historical.body.historicalOnly,true);
        const draft=await call('POST','/api/admin/sales',{status:'borrador',vehicleId:id(fixture.car),salePrice:1200,saleCurrency:'USD'});assert.equal(draft.status,201);assert.equal(draft.body.status,'borrador');assert.deepEqual(asPlain(await models.Car.findById(fixture.car._id).lean()),stock);assert.deepEqual(asPlain(await models.Lead.findById(fixture.lead._id).lean()),lead);assert.deepEqual(await financialSnapshot(),baseline);
    });

});
