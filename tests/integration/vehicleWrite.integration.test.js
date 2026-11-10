// API + MongoDB descartable. No usa registros ni servicios de producción.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { access } from 'node:fs/promises';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, test } from 'node:test';
import { carFixture, accountFixture } from '../fixtures/saleDraftFixtures.js';

const database = `autosporting_vehicle_write_${crypto.randomBytes(6).toString('hex')}`;
const nativeFetch = globalThis.fetch;
let mongo, mongoose, jwt, server, base, models;
const plain = value => JSON.parse(JSON.stringify(value));
const token = (role = 'owner', permissions) => jwt.sign({ id: new mongoose.Types.ObjectId().toString(), username: 'vehicle_qa', role, ...(permissions ? { permissions } : {}) }, process.env.JWT_SECRET, { expiresIn: '10m' });
async function call(method, route, body, auth = token()) {
    const multipart = body instanceof FormData;
    const response = await fetch(`${base}${route}`, {
        method, headers: { ...(multipart ? {} : { 'Content-Type': 'application/json' }), ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
        ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) }), signal: AbortSignal.timeout(15000),
    });
    return { status: response.status, body: await response.json().catch(() => null) };
}

describe('Vehículos: alta, edición, identidad y aislamiento público', { concurrency: false }, () => {
    before(async () => {
        for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) assert.equal(await access(fileURLToPath(new URL(`../../${name}`, import.meta.url))).then(() => true, () => false), false, 'La suite requiere un checkout sin credenciales activas');
        process.env.MONGOMS_DOWNLOAD_DIR ||= fileURLToPath(new URL('../../node_modules/.cache/mongodb-binaries/', import.meta.url));
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongo = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1', dbName: database, launchTimeout: 180000, args: ['--wiredTigerCacheSizeGB', '0.25'] }, spawn: { windowsHide: true } });
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
        mongoose = (await import('mongoose')).default;
        mongoose.set('autoCreate', false);
        const { default: app } = await import('../../server.js');
        models = Object.fromEntries(await Promise.all(['Car', 'Sale', 'Reservation', 'Account', 'Transaction', 'AuditLog'].map(async name => [name, (await import(`../../src/models/${name}.js`)).default])));
        jwt = (await import('jsonwebtoken')).default;
        await (await import('../../src/config/db.js')).default();
        assert.equal(mongoose.connection.host, '127.0.0.1'); assert.equal(mongoose.connection.name, database);
        await Promise.all(Object.values(models).map(model => model.createCollection()));
        server = app.listen({ port: 0, host: '127.0.0.1' }); await once(server, 'listening');
        base = `http://127.0.0.1:${server.address().port}`;
    }, { timeout: 300000 });
    beforeEach(async () => {
        assert.equal(mongoose.connection.host, '127.0.0.1'); assert.equal(mongoose.connection.name, database);
        await Promise.all(Object.values(models).map(model => model.deleteMany({})));
    });
    after(async () => {
        globalThis.fetch = nativeFetch;
        if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
        if (mongoose) await mongoose.disconnect();
        if (mongo) await mongo.stop();
    });

    test('alta y edición mantienen los permisos de escritura del servidor', async () => {
        const car = await models.Car.create(carFixture());
        for (const auth of [null, token('solo_lectura')]) {
            const expected = auth ? 403 : 401;
            assert.equal((await call('POST', '/api/cars', carFixture(), auth)).status, expected);
            assert.equal((await call('PATCH', `/api/admin/cars/${car._id}`, { color: 'Azul' }, auth)).status, expected);
        }
        assert.equal(await models.Car.countDocuments(), 1);
        assert.equal((await models.Car.findById(car._id)).color, undefined);
    });

    test('alta multipart persiste campos técnicos, propietario y documentación sin perder magnitudes', async () => {
        const form = new FormData();
        const input = carFixture({ price: '15.000.000,50', currency: '$', km: '12.500', transmission: ' Manual ', bodyType: 'Sedán', doors: '4', engine: '1.6', version: 'Sport', ownerName: 'Propietario ficticio', ownerPhone: '0000000000', ownerEmail: 'qa@example.invalid', engineNumber: 'MOTOR-QA', chassisNumber: 'VIN-TEST-12345', documentation: JSON.stringify({ cedulaVerde: 'recibido' }) });
        for (const [key, value] of Object.entries(input)) form.append(key, value);
        const created = await call('POST', '/api/cars', form);
        assert.equal(created.status, 201, JSON.stringify(created.body));
        const fetched = await call('GET', `/api/admin/cars/${created.body._id}`);
        assert.equal(fetched.body.price, 15000000.5); assert.equal(fetched.body.km, 12500); assert.equal(fetched.body.currency, 'ARS');
        for (const [key, expected] of Object.entries({ transmission: 'Manual', bodyType: 'Sedán', doors: 4, engine: '1.6', version: 'Sport', ownerName: 'Propietario ficticio', ownerPhone: '0000000000', ownerEmail: 'qa@example.invalid', engineNumber: 'MOTOR-QA', chassisNumber: 'VIN-TEST-12345' })) assert.equal(fetched.body[key], expected, key);
        assert.equal(fetched.body.documentation.cedulaVerde, 'recibido');
        await models.Car.create(carFixture({ plateOrVin: 'SIN-TRANSMISION-QA' }));
        const filtered = await call('GET', '/api/admin/cars?transmission=%20manual%20');
        assert.equal(filtered.status, 200); assert.equal(filtered.body.total, 1); assert.equal(filtered.body.cars[0]._id, created.body._id, 'El filtro usa la transmisión realmente persistida y deja fuera unidades sin dato');
    });

    test('edición parcial conserva datos propios, pago de compra y ausencias técnicas', async () => {
        const car = await models.Car.create(carFixture({ agencyOwned: true, investor: { name: 'Socio ficticio', percentage: 25 }, notes: 'Nota anterior', purchasePaymentState: { modality: 'pendiente', status: 'pendiente', totalCost: 900, pendingDebt: 675, agencyCost: 675 } }));
        const payment = plain(car.purchasePaymentState);
        const changed = await call('PATCH', `/api/admin/cars/${car._id}`, { transmission: 'Automática', bodyType: 'SUV', doors: 5, engine: '2.0', version: 'Prueba', color: 'Rojo', ownerName: 'Nombre ficticio', ownerPhone: '00000', ownerEmail: 'otro@example.invalid' });
        assert.equal(changed.status, 200, JSON.stringify(changed.body));
        assert.equal(changed.body.price, 1200); assert.equal(changed.body.purchasePrice, 900); assert.equal(changed.body.status, 'Disponible');
        assert.deepEqual(changed.body.purchasePaymentState, payment); assert.deepEqual(changed.body.investor, { name: 'Socio ficticio', percentage: 25 }); assert.equal(changed.body.notes, 'Nota anterior');
        assert.ok(changed.body.auditLog.some(entry => entry.field === 'transmission'));
        const cleared = await call('PATCH', `/api/admin/cars/${car._id}`, { transmission: '', doors: '' });
        assert.equal(cleared.status, 200); assert.equal(cleared.body.transmission, ''); assert.equal(cleared.body.doors, null);
        assert.equal(await models.Transaction.countDocuments(), 0);
    });

    test('entrada inválida se rechaza antes de guardar o alterar auditoría/caja', async () => {
        const car = await models.Car.create(carFixture()); const before = JSON.stringify(await models.Car.findById(car._id).lean());
        for (const input of [{ price: -1 }, { price: 'Infinity' }, { price: null }, { km: -1 }, { year: 2024.5 }, { year: 2100 }, { doors: 13 }, { purchasePrice: '' }, { currency: 'EUR' }, { brand: '  ' }, { investor: { name: 'QA', percentage: 101 } }]) {
            const result = await call('PATCH', `/api/admin/cars/${car._id}`, input);
            assert.equal(result.status, 400, JSON.stringify(input)); assert.equal(result.body.code, 'VEHICLE_VALIDATION'); assert.ok(result.body.errors);
        }
        assert.equal((await call('POST', '/api/cars', carFixture({ year: 2020.5 }))).status, 400);
        assert.equal(JSON.stringify(await models.Car.findById(car._id).lean()), before);
        assert.equal(await models.Car.countDocuments(), 1); assert.equal(await models.AuditLog.countDocuments(), 0); assert.equal(await models.Transaction.countDocuments(), 0);
    });

    test('patente y VIN normalizados detectan conflictos activos, sin bloquear placeholders o duplicados legacy sin cambios', async () => {
        const original = await models.Car.create(carFixture({ plateOrVin: ' ab-123 cd ', chassisNumber: 'VIN-QA-123456' }));
        const another = await models.Car.create(carFixture({ plateOrVin: 'OTRA-123' }));
        for (const input of [{ plateOrVin: 'AB123CD' }, { plateOrVin: 'vin qa123456' }, { chassisNumber: 'vin.qa.123456' }]) {
            const result = await call('POST', '/api/cars', carFixture(input)); assert.equal(result.status, 409); assert.equal(result.body.code, 'VEHICLE_IDENTITY_CONFLICT');
        }
        assert.equal((await call('PATCH', `/api/admin/cars/${another._id}`, { plateOrVin: 'AB123CD' })).status, 409);
        await models.Car.create(carFixture({ plateOrVin: 'AB123CD' }));
        const unchanged = await call('PATCH', `/api/admin/cars/${original._id}`, { plateOrVin: 'AB123CD', notes: 'No fusionar legacy' });
        assert.equal(unchanged.status, 200); assert.equal(unchanged.body.notes, 'No fusionar legacy');
        for (const plate of ['S/D', 'S/D', 'af', 'af']) assert.equal((await call('POST', '/api/cars', carFixture({ plateOrVin: plate }))).status, 201);
        await models.Car.updateMany({}, { status: 'Vendido' });
        assert.equal((await call('POST', '/api/cars', carFixture({ plateOrVin: 'AB123CD' }))).status, 201, 'Un reingreso no fusiona el historial anterior vendido');
        assert.equal((await call('PATCH', `/api/admin/cars/${original._id}`, { status: 'Disponible' })).status, 409, 'Reactivar una unidad vendida vuelve a comprobar su identidad aunque no se reenvíe la patente');
    });

    test('la edición genérica no libera stock vinculado a reserva o venta activa', async () => {
        const reserved = await models.Car.create(carFixture({ status: 'Reservado' }));
        await models.Reservation.create({ vehicleId: reserved._id, status: 'activa', agreedPrice: 1000, agreedCurrency: 'USD', depositAmount: 100, depositCurrency: 'USD', depositMethod: 'efectivo', expiresAt: new Date(Date.now() + 86400000) });
        const sold = await models.Car.create(carFixture({ status: 'Vendido', sold: true, plateOrVin: 'OTRA-123' }));
        await models.Sale.create({ vehicleId: sold._id, status: 'confirmada', salePrice: 1000, saleCurrency: 'USD' });
        for (const [car, input] of [[reserved, { status: 'Disponible' }], [sold, { status: 'Pausado' }], [sold, { sold: false }]]) {
            const result = await call('PATCH', `/api/admin/cars/${car._id}`, input); assert.equal(result.status, 409); assert.equal(result.body.code, 'VEHICLE_STATE_CONFLICT');
        }
        assert.equal((await call('PATCH', `/api/admin/cars/${reserved._id}`, { transmission: 'Manual' })).status, 200);
        assert.equal((await models.Car.findById(reserved._id)).status, 'Reservado'); assert.equal((await models.Car.findById(sold._id)).status, 'Vendido');
    });

    test('un reclamo concurrente del estado impide guardar el formulario anterior', async () => {
        const car = await models.Car.create(carFixture({ notes: 'Sin cambios' }));
        const updateOne = models.Car.collection.updateOne;
        let injected = false;
        models.Car.collection.updateOne = async function (filter, update, ...args) {
            if (!injected && String(filter._id) === String(car._id) && update.$set?.status === 'Pausado') {
                injected = true;
                await updateOne.call(this, { _id: car._id }, { $set: { status: 'Reservado' } });
            }
            return updateOne.call(this, filter, update, ...args);
        };
        try {
            const result = await call('PATCH', `/api/admin/cars/${car._id}`, { status: 'Pausado', notes: 'Formulario anterior' });
            assert.equal(result.status, 409, JSON.stringify(result.body)); assert.equal(result.body.code, 'VEHICLE_STATE_CONFLICT');
        } finally { models.Car.collection.updateOne = updateOne; }
        assert.equal(injected, true);
        const actual = await models.Car.findById(car._id); assert.equal(actual.status, 'Reservado'); assert.equal(actual.notes, 'Sin cambios');
    });

    test('cambio conjunto de costo y estado falla antes de tocar la venta de origen', async () => {
        const parent = await models.Car.create(carFixture({ plateOrVin: 'ORIGEN-123' }));
        const source = await models.Sale.create({ vehicleId: parent._id, salePrice: 1000, saleCurrency: 'USD', status: 'entregada' });
        const car = await models.Car.create(carFixture({ plateOrVin: 'PERMUTA-123', tradeInOrigin: { saleId: source._id, value: 900, currency: 'USD' } }));
        const beforeCar = JSON.stringify(await models.Car.findById(car._id).lean()); const beforeSale = JSON.stringify(await models.Sale.findById(source._id).lean());
        const result = await call('PATCH', `/api/admin/cars/${car._id}`, { status: 'Pausado', purchasePrice: 950, purchasePriceChangeType: 'correccion_precio', purchasePriceJustification: 'Corrección QA' });
        assert.equal(result.status, 409); assert.equal(result.body.code, 'VEHICLE_SEPARATE_COST_AND_STATE');
        assert.equal(JSON.stringify(await models.Car.findById(car._id).lean()), beforeCar); assert.equal(JSON.stringify(await models.Sale.findById(source._id).lean()), beforeSale);
    });

    test('cambio de moneda de costo exige motivo y no genera egreso ni gasto duplicado', async () => {
        const car = await models.Car.create(carFixture()); const account = await models.Account.create(accountFixture());
        assert.equal((await call('PATCH', `/api/admin/cars/${car._id}`, { purchaseCurrency: 'ARS' })).status, 400);
        const reason = { purchasePriceChangeType: 'correccion_precio', purchasePriceJustification: 'Corregir moneda de registro ficticio' };
        const corrected = await call('PATCH', `/api/admin/cars/${car._id}`, { purchaseCurrency: 'ARS', ...reason });
        assert.equal(corrected.status, 200, JSON.stringify(corrected.body)); assert.equal(corrected.body.purchasePrice, 900); assert.equal(corrected.body.purchaseCurrency, 'ARS');
        assert.ok(corrected.body.auditLog.some(entry => entry.field === 'purchasePrice' && entry.changeType === 'correccion_precio'));
        assert.equal(corrected.body.expenses.length, 0); assert.equal(await models.Transaction.countDocuments(), 0); assert.equal((await models.Account.findById(account._id)).balance, 1000);
    });

    test('orden y eliminación de fotos se guardan desde PATCH con portada coherente', async () => {
        const car = await models.Car.create(carFixture({ images: ['https://example.invalid/qa-a.jpg', 'https://example.invalid/qa-b.jpg'], coverImage: 'https://example.invalid/qa-a.jpg', imagePositions: ['50% 20%', '50% 80%'], imagePosition: '50% 20%' }));
        const changed = await call('PATCH', `/api/admin/cars/${car._id}`, { imageOrder: JSON.stringify(['https://example.invalid/qa-b.jpg', 'https://example.invalid/qa-a.jpg']), imagePositions: ['50% 80%', '50% 20%'], imagePosition: '50% 80%' });
        assert.equal(changed.status, 200); assert.equal(changed.body.coverImage, 'https://example.invalid/qa-b.jpg'); assert.equal(changed.body.images[0], changed.body.coverImage); assert.ok(changed.body.auditLog.some(entry => entry.field === 'images'));
        assert.deepEqual(changed.body.imagePositions, ['50% 80%', '50% 20%']); assert.equal(changed.body.imagePosition, '50% 80%');
        const reloaded = await call('GET', `/api/admin/cars/${car._id}`);
        assert.deepEqual(reloaded.body.images, ['https://example.invalid/qa-b.jpg', 'https://example.invalid/qa-a.jpg']);
        assert.deepEqual(reloaded.body.imagePositions, ['50% 80%', '50% 20%']); assert.equal(reloaded.body.imagePosition, reloaded.body.imagePositions[0]);
        assert.equal((await call('PATCH', `/api/admin/cars/${car._id}`, { imageOrder: '["https://example.invalid/otra-unidad.jpg"]' })).status, 400);
        const removed = await call('PATCH', `/api/admin/cars/${car._id}`, { imageOrder: '[]', imagePositions: '[]', imagePosition: '50% 75%' }); assert.equal(removed.status, 200); assert.deepEqual(removed.body.images, []); assert.equal(removed.body.coverImage, '');
        assert.deepEqual(removed.body.imagePositions, []); assert.equal(removed.body.imagePosition, '50% 75%');
        const emptyReloaded = await call('GET', `/api/admin/cars/${car._id}`);
        assert.deepEqual(emptyReloaded.body.images, []); assert.equal(emptyReloaded.body.coverImage, ''); assert.deepEqual(emptyReloaded.body.imagePositions, []); assert.equal(emptyReloaded.body.imagePosition, '50% 75%');
    });

    test('API pública usa allowlist y nunca entrega documentos, propietario, inversor o estado de compra', async () => {
        const car = await models.Car.create(carFixture({ transmission: 'Manual', bodyType: 'Sedán', doors: 4, engine: '1.6', version: 'Prueba', description: 'Descripción pública ficticia', ownerName: 'Titular ficticio', ownerPhone: '00000', ownerEmail: 'qa@example.invalid', investor: { name: 'Socio ficticio', percentage: 50 }, notes: 'Nota interna', clientId: new mongoose.Types.ObjectId(), documentationFiles: { cedulaVerde: 'https://example.invalid/privado.jpg' }, tradeInOrigin: { saleId: new mongoose.Types.ObjectId(), value: 900, currency: 'USD' } }));
        const list = await call('GET', '/api/public/cars', undefined, null); const detail = await call('GET', `/api/public/cars/${car._id}`, undefined, null);
        assert.equal(list.status, 200); assert.equal(detail.status, 200);
        for (const record of [list.body[0], detail.body]) {
            for (const key of ['ownerName', 'ownerEmail', 'ownerPhone', 'investor', 'purchasePrice', 'purchasePaymentState', 'clientId', 'documentation', 'documentationFiles', 'tradeInOrigin', 'auditLog', 'notes', 'plateOrVin', 'chassisNumber', 'engineNumber']) assert.equal(Object.hasOwn(record, key), false, key);
            assert.equal(record.transmission, 'Manual');
        }
        assert.equal(detail.body.description, 'Descripción pública ficticia');
        for (const status of ['Reservado', 'Vendido', 'Pausado']) {
            await models.Car.updateOne({ _id: car._id }, { status }); assert.equal((await call('GET', `/api/public/cars/${car._id}`, undefined, null)).status, 404);
        }
    });

    test('alta propia compartida conserva la deuda de compra sin generar caja al marcar pendiente', async () => {
        const created = await call('POST', '/api/cars', carFixture({ agencyOwned: true, investor: { name: 'Socio ficticio', percentage: 25 }, purchasePayment: { modality: 'pendiente', expectedFundsNote: 'Compromiso QA' } }));
        assert.equal(created.status, 201, JSON.stringify(created.body)); assert.equal(created.body.purchasePaymentState.pendingDebt, 675); assert.equal(created.body.purchasePaymentState.partnerContribution, 225); assert.equal(created.body.purchasePaymentState.expectedFundsNote, 'Compromiso QA');
        assert.equal(await models.Transaction.countDocuments(), 0);
    });

    test('pagos de compra inválidos fallan antes de crear stock o alterar cuentas', async () => {
        const usd = await models.Account.create(accountFixture({ currency: 'USD' }));
        const ars = await models.Account.create(accountFixture());
        const inactive = await models.Account.create(accountFixture({ currency: 'USD', isActive: false }));
        const options = [
            'json-inválido', { modality: 'inventada' }, { modality: 'pagar_ahora' },
            { modality: 'pagar_ahora', accountId: String(new mongoose.Types.ObjectId()) },
            { modality: 'pagar_ahora', accountId: String(ars._id) },
            { modality: 'pagar_ahora', accountId: String(inactive._id) },
            ...[0, -1, 676, 'Infinity', ''].map(amountPaid => ({ modality: 'pago_parcial', accountId: String(usd._id), amountPaid })),
        ];
        for (const purchasePayment of options) {
            const result = await call('POST', '/api/cars', carFixture({ agencyOwned: true, investor: { name: 'Socio QA', percentage: 25 }, purchasePayment }));
            assert.equal(result.status, 400, JSON.stringify(purchasePayment)); assert.equal(result.body.code, 'VEHICLE_VALIDATION'); assert.ok(result.body.errors);
        }
        assert.equal(await models.Car.countDocuments(), 0); assert.equal(await models.Transaction.countDocuments(), 0);
        for (const account of await models.Account.find()) assert.equal(account.balance, 1000);
    });

    test('pago propio compartido válido descuenta solo aporte de agencia en cuenta de su moneda', async () => {
        const account = await models.Account.create(accountFixture({ currency: 'USD' }));
        const created = await call('POST', '/api/cars', carFixture({ agencyOwned: true, investor: { name: 'Socio QA', percentage: 25 }, purchasePayment: { modality: 'pagar_ahora', accountId: String(account._id), paymentMethod: 'Transferencia bancaria' } }));
        assert.equal(created.status, 201, JSON.stringify(created.body)); assert.equal(created.body.purchasePaymentState.amountPaid, 675); assert.equal(created.body.purchasePaymentState.pendingDebt, 0);
        assert.equal((await models.Account.findById(account._id)).balance, 325);
        const movements = await models.Transaction.find().lean(); assert.equal(movements.length, 1); assert.equal(movements[0].amount, 675); assert.equal(movements[0].currency, 'USD');
    });

    test('borrador e histórica no incorporan permutas; venta operativa conserva vínculo y datos técnicos', async () => {
        const parent = await models.Car.create(carFixture({ plateOrVin: 'ORIGEN-123' }));
        const draft = await models.Sale.create({ vehicleId: parent._id, salePrice: 1000, saleCurrency: 'USD', status: 'borrador' });
        const historical = await models.Sale.create({ vehicleId: parent._id, salePrice: 1000, saleCurrency: 'USD', status: 'entregada', historicalOnly: true });
        const input = sale => carFixture({ plateOrVin: 'PERMUTA-123', receivedAsTradeIn: true, tradeInOriginSaleId: String(sale._id), tradeInOriginValue: 5000, tradeInOriginCurrency: 'ARS', transmission: 'Automática' });
        for (const sale of [draft, historical]) { const result = await call('POST', '/api/cars', input(sale)); assert.equal(result.status, 409); assert.equal(result.body.code, 'SALE_NOT_OPERATIONAL'); }
        assert.equal(await models.Car.countDocuments(), 1);
        const source = await models.Sale.create({ vehicleId: parent._id, salePrice: 1000, saleCurrency: 'USD', status: 'entregada' });
        const created = await call('POST', '/api/cars', input(source)); assert.equal(created.status, 201, JSON.stringify(created.body)); assert.equal(created.body.purchasePrice, 5000); assert.equal(created.body.purchaseCurrency, 'ARS'); assert.equal(created.body.tradeInOrigin.saleId, String(source._id)); assert.equal(created.body.transmission, 'Automática');
        const sourceAfter = await models.Sale.findById(source._id); assert.equal(String(sourceAfter.tradeIns[0].linkedStockCarId), created.body._id); assert.equal(sourceAfter.tradeIns[0].estimatedValue, 5000);
    });
});
