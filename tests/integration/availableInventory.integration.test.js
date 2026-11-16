import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Car from '../../src/models/Car.js';
import Account from '../../src/models/Account.js';
import Installment from '../../src/models/Installment.js';
import Transaction from '../../src/models/Transaction.js';
import Sale from '../../src/models/Sale.js';
import { getAdminStock } from '../../src/services/inventoryStockService.js';
import { getCapitalSummary } from '../../src/services/capitalSummaryService.js';
const root = path.resolve('.');
if (['.env', '.env.local', '.env.production', '.env.production.local'].some(name => fs.existsSync(path.join(root, name)))) throw new Error('Este test requiere checkout sin credenciales .env.');
const binary = path.resolve('node_modules/.cache/mongodb-binaries/mongod-x64-win32-8.2.6.exe');
const replica = await MongoMemoryReplSet.create({ binary: { downloadDir: path.dirname(binary), ...(process.platform === 'win32' && fs.existsSync(binary) ? { systemBinary: binary } : {}) }, replSet: { count: 1, storageEngine: 'wiredTiger' } });
let passed = 0;
const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
try {
    mongoose.set('autoIndex', false); mongoose.set('autoCreate', false);
    await mongoose.connect(replica.getUri('autosporting_available_inventory_test'));
    for (const Model of [Car, Account, Installment, Transaction, Sale]) await Model.createCollection();
    const base = { brand: 'Prueba', year: 2022, km: 100, condition: 'Usado', fuel: 'Nafta', status: 'Disponible', sold: false,
        agencyOwned: true, purchaseCurrency: 'ARS', currency: 'ARS', createdAt: new Date('2026-01-01') };
    const id = () => new mongoose.Types.ObjectId();
    const ownId = id(), sharedId = id(), investorId = id(), soldId = id();
    await Car.collection.insertMany([
        { ...base, _id: ownId, name: 'Propio', plateOrVin: 'QA001AA', purchasePrice: 10000000, price: 14000000, visibleEnWeb: false },
        { ...base, _id: sharedId, name: 'Compartido', plateOrVin: 'QA002AA', purchasePrice: 20000000, price: 26000000, investor: { name: 'Socio ficticio', percentage: 50 } },
        { ...base, _id: investorId, name: 'Inversor', plateOrVin: 'QA003AA', purchasePrice: 15000000, price: 19000000, jointOwnership: { hasPartner: true, partnerPercentage: 100 } },
        { ...base, _id: soldId, name: 'Vendido', status: 'Vendido', sold: true, purchasePrice: 999000000, price: 999999999 }
    ]);
    const read = (params = {}, user = { role: 'owner' }) => getAdminStock(params, user);
    await test('default inventory, count, unpaginated capital and ownership all use the same three available vehicles', async () => {
        const a = await read({ limit: 1, page: 1 }), b = await read({ limit: 1, page: 3 });
        assert.equal(a.total, 3); assert.equal(a.cars.length, 1); assert.equal(b.cars.length, 1);
        assert.equal(a.summary.totalStock, 3); assert.equal(a.summary.disponibles, 3); assert.equal(a.summary.inventoryCount, 4);
        assert.deepEqual(a.summary, b.summary); assert.deepEqual(a.filteredMetrics, b.filteredMetrics);
        assert.equal(a.summary.availableMetrics.cost.ARS, 45000000); assert.equal(a.summary.availableMetrics.ownCost.ARS, 20000000); assert.equal(a.summary.availableMetrics.investorCost.ARS, 25000000);
        assert.equal(a.summary.availableMetrics.asking.ARS, 59000000); assert.equal(a.summary.availableMetrics.ownAsking.ARS, 27000000); assert.equal(a.summary.availableMetrics.investorAsking.ARS, 32000000);
        assert.equal(a.summary.availableMetrics.countsByOwnership.inversor, 1);
        const capital = await getCapitalSummary();
        assert.equal(capital.inventoryAvailableCount, 3); assert.deepEqual(capital.availableMetrics, a.summary.availableMetrics);
        assert.equal(capital.componentes.stockPropioCosto.byCurrency.ARS, 20000000);
        const hidden = await read({ search: 'QA001AA' }); assert.equal(hidden.total, 1, 'operationally available remains in inventory when web hidden');
    });
    await test('a concurrent status/price change during presentation enrichment cannot mix two revisions in one response', async () => {
        const originalFind = Car.find;
        let changed = false;
        Car.find = function (filter, ...args) {
            const query = originalFind.call(this, filter, ...args);
            if (filter?._id?.$in) {
                const originalExec = query.exec.bind(query);
                query.exec = async (...execArgs) => {
                    changed = true;
                    await Car.collection.updateOne({ _id: sharedId }, { $set: { status: 'Reservado', price: 1 } });
                    return originalExec(...execArgs);
                };
            }
            return query;
        };
        try {
            const response = await read({ limit: 50 });
            assert.equal(changed, true); assert.equal(response.total, 3); assert.equal(response.summary.availableMetrics.count, 3);
            const row = response.cars.find(c => String(c._id) === String(sharedId));
            assert.equal(row.status, 'Disponible'); assert.equal(row.price, 26000000);
            assert.equal(response.summary.availableMetrics.asking.ARS, 59000000);
        } finally {
            Car.find = originalFind;
            await Car.collection.updateOne({ _id: sharedId }, { $set: { status: 'Disponible', price: 26000000 } });
        }
    });
    await test('filter subtotals and history are explicit; sold values never leak into capital or filtered metrics', async () => {
        const filtered = await read({ search: 'Compartido', limit: 1 });
        assert.equal(filtered.total, 1); assert.equal(filtered.filteredMetrics.cost.ARS, 20000000); assert.equal(filtered.summary.availableMetrics.cost.ARS, 45000000);
        const history = await read({ tab: 'historial', status: 'vendido' });
        assert.equal(history.total, 1); assert.equal(history.cars[0].name, 'Vendido'); assert.equal(history.filteredMetrics.count, 0); assert.equal(history.filteredMetrics.cost.ARS, 0);
        assert.equal(history.summary.availableMetrics.cost.ARS, 45000000);
        assert.equal((await read({ status: 'vendido' })).total, 0, 'inventory cannot silently become history');
    });
    await test('reserve and sell remove the unit from every available count and cost/asking total; returning available restores it once', async () => {
        await Car.updateOne({ _id: sharedId }, { $set: { status: 'Reservado' } });
        const reserved = await read();
        assert.equal(reserved.total, 2); assert.equal(reserved.summary.totalStock, 2); assert.equal(reserved.summary.reservados, 1);
        assert.equal(reserved.filteredMetrics.cost.ARS, 25000000); assert.equal(reserved.filteredMetrics.ownCost.ARS, 10000000); assert.equal(reserved.filteredMetrics.investorCost.ARS, 15000000);
        assert.equal(reserved.filteredMetrics.asking.ARS, 33000000); assert.equal((await getCapitalSummary()).availableMetrics.count, 2);
        await Car.updateOne({ _id: sharedId }, { $set: { status: 'Vendido', sold: true } });
        assert.equal((await read()).summary.availableMetrics.cost.ARS, 25000000);
        await Car.updateOne({ _id: sharedId }, { $set: { status: 'Disponible', sold: false } });
        assert.equal((await read()).summary.availableMetrics.cost.ARS, 45000000);
    });
    await test('raw mixed currencies and missing fields remain visible and reconcile before pagination', async () => {
        const crossId = id(), missingId = id();
        await Car.collection.insertMany([
            { ...base, _id: crossId, name: 'Costo USD publicado ARS', purchasePrice: 15000, purchaseCurrency: 'USD', price: 23000000 },
            { ...base, _id: missingId, name: 'Dato pendiente', price: 12000000, investor: { name: 'Sin porcentaje' } }
        ]);
        const result = await read({ limit: 1 }), m = result.summary.availableMetrics;
        assert.equal(m.count, 5); assert.equal(m.cost.ARS, 45000000); assert.equal(m.cost.USD, 15000); assert.equal(m.asking.ARS, 94000000);
        assert.equal(m.completeness.cost, false); assert.equal(m.completeness.asking, false);
        for (const field of ['purchasePrice', 'percentage']) assert.ok(m.pending.some(p => p.vehicleId === String(missingId) && p.field === field));
        const raw = await Car.findById(missingId).lean(); assert.equal(raw.purchaseCurrency, 'ARS'); assert.equal(raw.investor.percentage, undefined, 'lean preserves absent percentage');
        for (const currency of ['ARS', 'USD']) {
            const sum = m.breakdown.cost.filter(row => row.currency === currency && !row.excludedFromCapital).reduce((total, row) => total + row.total, 0);
            assert.equal(sum, m.cost[currency]);
        }
    });
    await test('stock-only access never discloses cost, split, breakdown, agreement amounts or pending financial fields', async () => {
        const result = await read({ limit: 500 }, { role: 'admin', permissions: ['stock.read'] });
        assert.equal(result.financialAccess, false); assert.equal(result.summary.availableMetrics, undefined); assert.equal(result.filteredMetrics.cost, undefined);
        assert.equal(result.filteredMetrics.breakdown, undefined); assert.equal(result.filteredMetrics.ownershipMetrics, undefined);
        for (const c of result.cars) for (const field of ['purchasePrice', 'expenses', 'purchasePaymentState']) assert.equal(c[field], undefined);
    });
    console.log(`PASS: ${passed} isolated available inventory integration groups.`);
} finally { await mongoose.disconnect(); await replica.stop(); }
