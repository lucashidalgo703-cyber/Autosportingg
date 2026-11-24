// Real HTTP handlers against a disposable MongoDB; this checkout must have no .env files.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { boot } from './harness.js';

const root = path.resolve('.');
for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    assert.equal(fs.existsSync(path.join(root, name)), false, 'Run this test in a checkout without .env credentials.');
}

const { call, test, finish, mongoose, makeToken } = await boot();
const { default: Car } = await import('../../src/models/Car.js');
const endpoint = '/api/admin/stock/checklist';
const photos = {
    manuals: 'https://example.invalid/manual.jpg',
    duplicateKeys: 'https://example.invalid/keys.jpg',
    cricket: '',
    wheelWrench: 'https://example.invalid/wrench.jpg',
    officialServices: 'https://example.invalid/service.jpg'
};
const base = {
    brand: 'Ficticia', year: 2022, km: 12000, fuel: 'Nafta', condition: 'Usado',
    status: 'Disponible', sold: false, visibleEnWeb: true,
    price: 23000, currency: 'USD', purchasePrice: 17000, purchaseCurrency: 'USD',
    expenses: [{ concept: 'Prueba', amount: 100, currency: 'USD' }],
    investor: { name: 'Inversor privado', percentage: 25 },
    purchasePaymentState: { amountPaid: 17000, accountName: 'Cuenta privada' },
    notes: 'Nota interna privada', ownerPhone: 'Dato privado',
    hasManuals: 'Sí', hasDuplicateKeys: 'No', hasCricket: 'Parcial',
    hasWheelWrench: 'Sí', hasOfficialServices: 'Sí', checklistPhotos: photos,
    auditLog: [{ action: 'ALTA', user: 'fixture', details: 'Historial original' }],
    createdAt: new Date('2026-01-01T12:00:00.000Z')
};
const fixture = (name, extra = {}) => ({ ...base, _id: new mongoose.Types.ObjectId(), name, ...extra });
const available = [
    fixture('Disponible normal'),
    fixture('Disponible con espacios', { status: ' disponible ' }),
    fixture('Disponible minúscula', { status: 'disponible' }),
    fixture('Disponible oculto en web', { visibleEnWeb: false })
];
const excluded = [
    ...['Vendido', 'vendido', ' VENDIDO ', 'Reservado', 'reservado', 'Pausado', 'pausado',
        'Cancelado', 'cancelado', 'anulado', 'eliminado', '', null].map((status, index) =>
        fixture(`Excluido ${index}`, { status })),
    fixture('Estado ausente'),
    fixture('Disponible marcado vendido', { sold: true })
];
delete excluded[excluded.length - 2].status;
const ids = cars => cars.map(car => String(car._id)).sort();
const expectedIds = ids(available);
const get = async token => {
    const response = await call('GET', endpoint, null, token);
    assert.equal(response.status, 200);
    assert.equal(response.json.ok, true);
    assert.ok(Array.isArray(response.json.cars));
    return response.json.cars;
};

try {
    // Insert raw documents to represent historical state variants outside today's schema enum.
    await Car.collection.insertMany([...available, ...excluded]);
    const historicalBefore = await Car.collection.find({ _id: { $in: excluded.map(car => car._id) } }).toArray();

    await test('Equipamiento incluye solo disponibles normalizados y respeta sold, sin depender de publicación web', async () => {
        const cars = await get();
        assert.deepEqual(ids(cars), expectedIds);
        assert.equal(cars.length, available.length);
        assert.ok(cars.some(car => String(car._id) === String(available[3]._id)), 'A hidden available vehicle remains operational stock.');
    });

    await test('Owner y Ventas reciben el mismo conjunto disponible', async () => {
        const ownerCars = await get();
        const sellerCars = await get(makeToken('ventas'));
        assert.deepEqual(ids(ownerCars), expectedIds);
        assert.deepEqual(ids(sellerCars), expectedIds);
    });

    await test('La ficha conserva los cinco controles y las fotos sin exponer datos financieros o internos', async () => {
        for (const cars of [await get(), await get(makeToken('ventas'))]) {
            for (const car of cars) {
                for (const key of ['hasManuals', 'hasDuplicateKeys', 'hasCricket', 'hasWheelWrench', 'hasOfficialServices']) {
                    assert.equal(car[key], base[key]);
                }
                assert.deepEqual(car.checklistPhotos, photos);
                for (const key of ['price', 'currency', 'purchasePrice', 'purchaseCurrency', 'expenses',
                    'investor', 'jointOwnership', 'purchasePaymentState', 'auditLog', 'notes', 'ownerPhone']) {
                    assert.equal(car[key], undefined, `Checklist must not expose ${key}.`);
                }
            }
        }
    });

    await test('Actualizar equipamiento de una unidad disponible conserva las fotos y no modifica su estado', async () => {
        const car = available[0];
        const response = await call('PATCH', `${endpoint}/${car._id}`, { hasDuplicateKeys: 'Sí' });
        assert.equal(response.status, 200);
        assert.equal(response.json.ok, true);
        assert.equal(response.json.car.hasDuplicateKeys, 'Sí');
        assert.deepEqual(response.json.car.checklistPhotos, photos);
        const stored = await Car.collection.findOne({ _id: car._id });
        assert.equal(stored.status, 'Disponible');
        assert.equal(stored.sold, false);
        assert.equal(stored.purchasePrice, base.purchasePrice);
        assert.equal(stored.hasDuplicateKeys, 'Sí');
    });

    await test('Al vender una unidad desaparece al recargar y su equipamiento queda guardado en el histórico', async () => {
        const car = available[0];
        await Car.collection.updateOne({ _id: car._id }, { $set: { status: 'Vendido', sold: true } });
        const soldBeforeRead = await Car.collection.findOne({ _id: car._id });
        for (const cars of [await get(), await get(makeToken('ventas'))]) {
            assert.deepEqual(ids(cars), ids(available.slice(1)));
        }
        const soldAfterRead = await Car.collection.findOne({ _id: car._id });
        assert.deepEqual(soldAfterRead, soldBeforeRead, 'Listing must not rewrite the sold vehicle.');
        assert.equal(soldAfterRead.hasDuplicateKeys, 'Sí');
        assert.deepEqual(soldAfterRead.checklistPhotos, photos);
    });

    await test('Consultar equipamiento no altera vehículos históricos ni sus datos financieros', async () => {
        const historicalAfter = await Car.collection.find({ _id: { $in: excluded.map(car => car._id) } }).toArray();
        assert.deepEqual(historicalAfter, historicalBefore);
    });
} catch (error) {
    console.error(error);
    process.exitCode = 1;
} finally {
    await finish();
}
