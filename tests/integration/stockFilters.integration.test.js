import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { access } from 'node:fs/promises';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { before, beforeEach, after, describe, test } from 'node:test';
import { filterStockSnapshot, stockOptions } from '../../src/utils/stockFilters.js';
import { getArgentinaDateKey } from '../../src/utils/cashProjection.js';

const database = `autosporting_stock_test_${crypto.randomBytes(6).toString('hex')}`;
const nativeFetch = globalThis.fetch;
let mongo, mongoose, Car, jwt, server, base, records;
const plain = value => JSON.parse(JSON.stringify(value));
const token = (role = 'owner', permissions) => jwt.sign({ id: new mongoose.Types.ObjectId().toString(), username: 'stock_qa', role, ...(permissions ? { permissions } : {}) }, process.env.JWT_SECRET, { expiresIn: '10m' });
const day = (offset, hours = 0) => new Date(Date.parse(getArgentinaDateKey() + 'T03:00:00Z') + offset * 86400000 + hours * 3600000);
async function get(path, auth = token()) {
    return fetch(base + path, { headers: auth ? { Authorization: `Bearer ${auth}` } : {}, signal: AbortSignal.timeout(15000) });
}
async function listing(filters = {}) {
    const response = await get('/api/admin/cars?' + new URLSearchParams(filters));
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    return data;
}
const idList = data => data.map(record => String(record._id));

describe('Stock: filtros, páginas y exportación sobre MongoDB descartable', { concurrency: false }, () => {
    before(async () => {
        for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
            const exists = await access(fileURLToPath(new URL(`../../${name}`, import.meta.url))).then(() => true, () => false);
            assert.equal(exists, false, 'Esta suite exige un checkout aislado sin archivos de entorno activos');
        }
        process.env.MONGOMS_DOWNLOAD_DIR ||= fileURLToPath(new URL('../../node_modules/.cache/mongodb-binaries/', import.meta.url));
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongo = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1', dbName: database, launchTimeout: 180000, args: ['--wiredTigerCacheSizeGB', '0.25'] }, spawn: { windowsHide: true } });
        process.env.MONGODB_URI = mongo.getUri(database);
        process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
        process.env.TWO_FACTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
        process.env.NODE_ENV = 'production';
        process.env.ENABLE_DAILY_SUMMARY_SCHEDULER = 'false';
        for (const key of ['REDIS_URL', 'REDIS_TOKEN', 'MONGODB_DNS_SERVERS', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) process.env[key] = '';
        globalThis.fetch = (input, options) => {
            const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
            assert.equal(url.origin, base, 'No se admiten proveedores externos en esta suite');
            return nativeFetch(input, options);
        };
        mongoose = (await import('mongoose')).default;
        mongoose.set('autoCreate', false);
        const { default: app } = await import('../../server.js');
        Car = (await import('../../src/models/Car.js')).default;
        jwt = (await import('jsonwebtoken')).default;
        await (await import('../../src/config/db.js')).default();
        assert.equal(mongoose.connection.host, '127.0.0.1');
        assert.equal(mongoose.connection.name, database);
        await Car.createCollection();
        server = app.listen({ port: 0, host: '127.0.0.1' });
        await once(server, 'listening');
        base = `http://127.0.0.1:${server.address().port}`;
    }, { timeout: 300000 });

    beforeEach(async () => {
        assert.equal(mongoose.connection.host, '127.0.0.1');
        assert.equal(mongoose.connection.name, database);
        await Car.deleteMany({});
        const cars = Array.from({ length: 25 }, (_, index) => ({
            brand: ['Ford', ' FORD ', 'ford'][index % 3], name: index === 24 ? 'Ka QA' : ['Focus', ' FOCUS '][index % 2],
            year: 2020 + index % 5, km: index * 1000, fuel: 'Nafta', condition: 'Usado', agencyOwned: true,
            currency: ['USD', 'U$S', 'ARS', '$'][index % 4], price: index % 4 < 2 ? 10000 + index * 100 : 10000000 + index * 1000,
            order: index, plateOrVin: `STOCK-QA-${index}`, createdAt: day(index === 3 ? -90 : index === 4 ? -91 : -index, 20),
            images: index === 1 ? [] : ['https://example.test/qa.jpg'], publishedOnML: index === 2 ? 'No' : 'Sí',
            notes: index === 24 ? 'Especial segunda página' : ''
        }));
        cars[0].price = 0;
        cars[5].currency = ' usd ';
        cars.push({ ...cars[0], brand: 'Ford+', name: 'Focus (1.6)', plateOrVin: 'LITERAL', order: 30, price: 10000, images: ['https://example.test/qa.jpg'] });
        cars.push({ ...cars[0], brand: 'Toyota', name: 'Corolla', plateOrVin: 'VENDIDO', order: 31, status: 'Vendido', price: 10000 });
        records = plain(await Car.create(cars));
    });

    after(async () => {
        globalThis.fetch = nativeFetch;
        if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
        if (mongoose) await mongoose.disconnect();
        if (mongo) await mongo.stop();
    });

    test('permisos de stock se mantienen para listado y exportación', async () => {
        for (const path of ['/api/admin/cars', '/api/admin/cars/export']) {
            assert.equal((await get(path, null)).status, 401);
            assert.equal((await get(path, token('qa_sin_acceso'))).status, 403);
            assert.equal((await get(path, token('solo_lectura', ['stock.read']))).status, 200);
        }
    });

    test('marca canónica, facets globales y página 2 usan todos los registros antes de paginar', async () => {
        const first = await listing({ brand: 'Ford', status: 'disponible', page: 1, limit: 20 });
        const second = await listing({ brand: 'Ford', status: 'disponible', page: 2, limit: 20 });
        assert.equal(first.total, 25);
        assert.equal(first.pages, 2);
        assert.equal(first.cars.length, 20);
        assert.equal(second.cars.length, 5);
        assert.equal(new Set([...idList(first.cars), ...idList(second.cars)]).size, 25);
        assert.equal(first.models.some(model => model === 'Ka QA'), true, 'Facets no se limitan a la primera página');
        assert.equal(first.brands.filter(brand => brand.trim().toLowerCase() === 'ford').length, 1);
        assert.equal(first.models.filter(model => model.trim().toLowerCase() === 'focus').length, 1);
        assert.deepEqual(first.brands, stockOptions(records.map(car => car.brand)));
        const found = await listing({ brand: 'Ford', search: 'Especial segunda página' });
        assert.equal(found.total, 1);
        assert.equal(found.cars[0].plateOrVin, 'STOCK-QA-24');
        assert.equal(found.filteredTotalUSD, 12400);
        const legacyCaller = await listing({ status: 'disponible', limit: 1000 });
        assert.equal(legacyCaller.limit, 1000);
        assert.equal(legacyCaller.cars.length, 26);
    });

    test('modelo y marca escapan regex sin fusionar nombres distintos', async () => {
        const result = await listing({ brand: 'Ford+', model: 'Focus (1.6)' });
        assert.equal(result.total, 1);
        assert.equal(result.cars[0].plateOrVin, 'LITERAL');
    });

    test('rangos inválidos devuelven 400 y el precio nunca compara monedas sin selección', async () => {
        for (const query of ['minPrice=10', 'minKm=-1', 'currency=EUR', 'minDays=Infinity', 'minDays=1.5', 'minKm=20&maxKm=10', 'brand=Ford&brand=Toyota', 'currency=USD&minPrice=200&maxPrice=100']) {
            for (const path of ['/api/admin/cars?', '/api/admin/cars/export?']) {
                const response = await get(path + query);
                assert.equal(response.status, 400, path + query);
                assert.ok((await response.json()).message);
            }
        }
    });

    test('filtros y orden de moneda tienen el mismo resultado online/offline, incluyendo alias legacy', async () => {
        const combinations = [
            { brand: 'Ford', model: 'focus', currency: 'USD', minPrice: '10000', maxPrice: '13000', minKm: '0' },
            { currency: 'ARS', sort: 'price_asc' }, { sort: 'price_desc', brand: 'Ford' },
            { brand: 'Ford', stagnant: 'true' }, { minDays: '90', maxDays: '90' }, { review: 'true' },
            { ml: 'publicados', sort: 'brand_model' }, { status: 'vendido' }, { tab: 'cero_km' }
        ];
        for (const filters of combinations) {
            const online = await listing({ ...filters, limit: 1000 });
            const offline = filterStockSnapshot(records, filters);
            assert.deepEqual(idList(online.cars), idList(offline), JSON.stringify(filters));
            assert.equal(online.total, offline.length);
        }
        const legacyAlias = await listing({ currency: 'USD', search: 'STOCK-QA-5' });
        assert.equal(legacyAlias.filteredTotalUSD, 10500, 'La clasificación de variantes no cambia el importe');
    });

    test('rangos excluyen importes legacy que no son números de BSON sin inventar conversión', async () => {
        await Car.collection.insertOne({ ...records[0], _id: new mongoose.Types.ObjectId(), brand: 'Legacy inválido', price: '10000', currency: 'USD' });
        const result = await listing({ brand: 'Legacy inválido', currency: 'USD', minPrice: '1', maxPrice: '20000' });
        assert.equal(result.total, 0);
    });

    test('exportación filtrada incluye el conjunto completo y exportación global conserva todo el stock', async () => {
        const xlsx = await import('xlsx');
        const decode = async response => {
            assert.equal(response.status, 200);
            const workbook = xlsx.read(Buffer.from(await response.arrayBuffer()), { type: 'buffer' });
            return xlsx.utils.sheet_to_json(workbook.Sheets.Stock);
        };
        const filtered = await decode(await get('/api/admin/cars/export?brand=Ford&status=disponible&limit=20&page=2'));
        assert.equal(filtered.length, 25, 'Exportar vista ignora la página actual y conserva los filtros');
        assert.equal(filtered.some(car => car.Dominio === 'STOCK-QA-24'), true);
        const all = await decode(await get('/api/admin/cars/export'));
        assert.equal(all.length, 27, 'Exportar todo conserva vendidos e incluye nombres literales distintos');
    });

    test('capital global y filtrado reconocen permuta propia legacy y separan costo por su moneda real', async () => {
        await Car.deleteMany({});
        const fixture = { brand: 'Capital QA', name: 'Unidad ficticia', year: 2022, km: 100, fuel: 'Nafta', condition: 'Usado', status: 'Disponible', currency: 'USD', agencyOwned: false };
        const legacy = await Car.create({ ...fixture, plateOrVin: 'LEGACY-OWN', price: 10000, purchasePrice: 0, purchaseCurrency: 'ARS', tradeInOrigin: { saleId: new mongoose.Types.ObjectId(), value: 7000, currency: 'USD' } });
        await Car.create({ ...fixture, plateOrVin: 'SHARED', price: 20000, purchasePrice: 2000000, purchaseCurrency: 'ARS', investor: { name: 'Inversor ficticio', percentage: 25 } });
        await Car.create({ ...fixture, plateOrVin: 'CONSIGNED', price: 12000, ownerName: 'Propietario ficticio', tradeInOrigin: { saleId: new mongoose.Types.ObjectId(), value: 8000, currency: 'USD', consigned: true, agencyOwned: false } });
        await Car.create({ ...fixture, plateOrVin: 'THIRD-PARTY', price: 5000, purchasePrice: 3000 });
        const result = await listing();
        assert.equal(result.summary.valorTotalUSD, 30000); assert.equal(result.summary.valorActivoUSD, 25000); assert.equal(result.summary.valorActivoInversionistasUSD, 5000);
        assert.equal(result.summary.capitalInvertidoUSD, 7000); assert.equal(result.summary.capitalInvertidoARS, 1500000); assert.equal(result.summary.capitalInvertidoInversionistasARS, 500000);
        assert.equal(result.summary.costoTotalARS, 2000000); assert.equal(result.summary.costoTotalUSD, 7000); assert.equal(result.summary.consignaciones, 2); assert.equal(result.summary.consignacionesSoloCount, 1); assert.equal(result.summary.tercerosCount, 1); assert.equal(result.summary.disponiblesComputadosCount, 2);
        assert.equal(result.filteredTotalUSD, 30000); assert.equal(result.filteredPropioUSD, 25000); assert.equal(result.filteredInversionistasUSD, 5000); assert.equal(result.filteredCostUSD, 7000); assert.equal(result.filteredCostARS, 2000000); assert.equal(result.filteredConsignacionesUSD, 17000);
        const owned = await listing({ origin: 'owned' }); assert.deepEqual(idList(owned.cars), [String(legacy._id)]); assert.equal(owned.filteredCostUSD, 7000); assert.equal(owned.filteredCostARS, 0);
        const consigned = await listing({ origin: 'consigned' }); assert.equal(consigned.total, 1); assert.equal(consigned.filteredTotalUSD, 0); assert.equal(consigned.filteredCostUSD, 0);
    });

    test('capital patrimonial excluye consignadas y terceros sin borrar participaciones de permuta propia e inversor', async () => {
        await Car.deleteMany({});
        const fixture = { brand: 'Capital QA', name: 'Unidad ficticia', year: 2022, km: 100, fuel: 'Nafta', condition: 'Usado', status: 'Disponible', currency: 'ARS', purchaseCurrency: 'ARS', agencyOwned: false };
        const own = await Car.create({ ...fixture, price: 10000, purchasePrice: 0, tradeInOrigin: { saleId: new mongoose.Types.ObjectId(), value: 7000, currency: 'ARS' } });
        const shared = await Car.create({ ...fixture, price: 20000, purchasePrice: 12000, investor: { name: 'Inversor ficticio', percentage: 25 } });
        await Car.create({ ...fixture, price: 90000, purchasePrice: 60000, tradeInOrigin: { saleId: new mongoose.Types.ObjectId(), consigned: true, agencyOwned: false } });
        await Car.create({ ...fixture, price: 50000, purchasePrice: 30000 });
        const response = await get('/api/admin/stock/capital-summary'); assert.equal(response.status, 200); const { data } = await response.json();
        assert.equal(data.componentes.stockPropioCosto.monto, 16000); assert.equal(data.componentes.stockPropioCosto.subtotalInversionistas, 3000); assert.equal(data.componentes.stockPropioCosto.unidadesTotal, 2);
        assert.deepEqual(new Set(data.componentes.stockPropioCosto.items.map(item => item.id)), new Set([String(own._id), String(shared._id)]));
        assert.equal(data.totales.stockPropioPublicado, 25000); assert.equal(data.totales.stockInversionistasPublicado, 5000); assert.equal(data.totales.consignacionesTotalPublicado, 140000);
    });

    test('consultar, filtrar, ordenar y exportar no modifica unidades ni orden del catálogo', async () => {
        const before = plain(await Car.find().sort({ _id: 1 }).lean());
        await listing({ review: 'true', sort: 'price_desc' });
        await listing({ model: 'Focus', minDays: '10', maxDays: '100' });
        const response = await get('/api/admin/cars/export?currency=USD');
        assert.equal(response.status, 200);
        await response.arrayBuffer();
        assert.deepEqual(plain(await Car.find().sort({ _id: 1 }).lean()), before);
    });
});
