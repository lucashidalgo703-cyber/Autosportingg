import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import Car from '../../src/models/Car.js';
import Sale from '../../src/models/Sale.js';
import Reservation from '../../src/models/Reservation.js';
import Client from '../../src/models/Client.js';
import AdminUser from '../../src/models/AdminUser.js';
import { getSaleVehicleOptions, completeSaleAtomic } from '../../src/services/saleCompletionService.js';

// Every vehicle, buyer and operation belongs to this disposable loopback DB.
if (['.env', '.env.local', '.env.production', '.env.production.local'].some(name => fs.existsSync(path.resolve(name)))) throw new Error('Este test requiere un checkout sin credenciales .env.');
const binary = path.resolve('node_modules/.cache/mongodb-binaries/mongod-x64-win32-8.2.6.exe');
const replica = await MongoMemoryReplSet.create({ binary: { downloadDir: path.dirname(binary), ...(process.platform === 'win32' && fs.existsSync(binary) ? { systemBinary: binary } : {}) }, replSet: { count: 1, storageEngine: 'wiredTiger' } });
let passed = 0;
const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
try {
    mongoose.set('autoIndex', false); mongoose.set('autoCreate', false);
    await mongoose.connect(replica.getUri('autosporting_sale_vehicle_search_test'));
    for (const model of Object.values(mongoose.models)) await model.createCollection();
    const base = { brand: 'Ford', name: 'Maverick Lariat', year: 2024, km: 36000,
        fuel: 'Nafta', condition: 'Usado', price: 45000000, currency: 'ARS', purchasePrice: 35000000,
        purchaseCurrency: 'ARS', agencyOwned: true, status: 'Disponible', sold: false, createdAt: new Date('2026-01-01') };
    const [available, sold, reserved, otherYear, otherBrand, literal] = await Car.create([
        { ...base, plateOrVin: 'QA001AA', visibleEnWeb: false },
        { ...base, plateOrVin: 'QA002AA', status: 'Vendido', sold: true },
        { ...base, plateOrVin: 'QA003AA', status: 'Reservado' },
        { ...base, plateOrVin: 'QA004AA', year: 2023 },
        { ...base, plateOrVin: 'QA005AA', brand: 'Otra marca' },
        { ...base, name: 'Modelo.* [QA]', plateOrVin: 'QA006AA' }
    ]);
    const client = await Client.create({ fullName: 'Comprador ficticio', email: 'comprador@example.test' });
    const actor = await AdminUser.create({ name: 'Administrador ficticio', email: 'admin@example.test', passwordHash: 'fake-local-only', role: 'owner', active: true });
    const sale = await Sale.create({ vehicleId: sold._id, clientId: client._id, salePrice: 45000000,
        saleCurrency: 'ARS', status: 'entregada', salesperson: actor.name, assignedTo: actor._id });
    const reservation = await Reservation.create({ vehicleId: reserved._id, clientId: client._id, status: 'activa',
        agreedPrice: 45000000, agreedCurrency: 'ARS', depositAmount: 1000000, depositCurrency: 'ARS', depositMethod: 'efectivo',
        expiresAt: new Date(Date.now() + 86400000) });
    const user = { id: String(actor._id), name: actor.name, username: actor.name, role: 'owner' };
    const search = (q, options = {}) => getSaleVehicleOptions({ q, limit: 50, ...options }, user);
    const ids = response => response.cars.map(car => String(car._id)).sort();

    await test('brand and model words match across fields, ignoring repeated whitespace and case', async () => {
        const expected = [available, sold, reserved, otherYear].map(car => String(car._id)).sort();
        assert.deepEqual(ids(await search('Ford Maverick')), expected);
        assert.deepEqual(ids(await search('  FORD   maverick  Lariat  ')), expected);
        assert.equal((await search('Ford Maverick Inexistente')).total, 0);
        assert.equal((await search('Maverick')).total, 5, 'brand does not become an implicit restriction');
    });
    await test('a four-digit year, model/version words and plate combine without searching partial pages', async () => {
        const result = await search('2024 Ford Maverick Lariat');
        assert.deepEqual(ids(result), [available, sold, reserved].map(car => String(car._id)).sort());
        assert.equal((await search('Ford Maverick 2023')).cars[0]._id.toString(), String(otherYear._id));
        assert.equal((await search('Ford Maverick QA001AA')).cars[0]._id.toString(), String(available._id));
        assert.equal((await search('2022 Ford Maverick')).total, 0);
        for (let page = 1; page <= 3; page++) {
            const paged = await search('Ford Maverick 2024', { page, limit: 1 });
            assert.equal(paged.total, 3); assert.equal(paged.pages, 3); assert.equal(paged.cars.length, 1);
        }
        const pagedIds = await Promise.all([1, 2, 3].map(page => search('Ford Maverick 2024', { page, limit: 1 })));
        assert.equal(new Set(pagedIds.flatMap(result => ids(result))).size, 3);
    });
    await test('regex metacharacters stay literal rather than broadening the query', async () => {
        assert.deepEqual(ids(await search('Ford Modelo.* [QA]')), [String(literal._id)]);
        assert.equal((await search('Ford Maverick.*')).total, 0);
        assert.equal((await search('Ford (Maverick|Modelo)')).total, 0);
    });
    await test('sold and reserved matches remain visible with their existing operation, without making them sellable', async () => {
        const response = await search('Ford Maverick 2024');
        const soldOption = response.cars.find(car => String(car._id) === String(sold._id));
        const reservedOption = response.cars.find(car => String(car._id) === String(reserved._id));
        const availableOption = response.cars.find(car => String(car._id) === String(available._id));
        assert.equal(soldOption.status, 'Vendido');
        assert.equal(String(soldOption.activeSale._id), String(sale._id));
        assert.equal(String(reservedOption.reservation._id), String(reservation._id));
        assert.equal(availableOption.activeSale, null); assert.equal(availableOption.reservation, null);
        await assert.rejects(completeSaleAtomic({ payload: { vehicleId: String(sold._id), salePrice: 45000000, saleCurrency: 'ARS', clientId: String(client._id) }, user }),
            error => error.status === 409 && String(error.details?.activeSaleId) === String(sale._id));
        // A manual availability correction alone must never bypass an actual sale.
        await Car.updateOne({ _id: sold._id }, { $set: { status: 'Disponible', sold: false } });
        assert.equal(String((await search('Ford Maverick QA002AA')).cars[0].activeSale._id), String(sale._id));
        await assert.rejects(completeSaleAtomic({ payload: { vehicleId: String(sold._id), salePrice: 45000000, saleCurrency: 'ARS', clientId: String(client._id) }, user }),
            error => error.status === 409 && String(error.details?.activeSaleId) === String(sale._id));
        assert.equal(await Sale.countDocuments({ vehicleId: sold._id }), 1);
    });
    console.log(`PASS: ${passed} isolated multiword sale vehicle search groups.`);
} finally { await mongoose.disconnect(); await replica.stop(); }
