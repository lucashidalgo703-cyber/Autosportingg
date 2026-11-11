import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildStockQuery, filterStockSnapshot, normalizeStockText, parseStockFilters, stockDays, stockNeedsReview, stockOptions, stockStatisticsCurrency } from '../src/utils/stockFilters.js';

const cut = new Date('2026-11-10T14:00:00Z');
const vehicle = (overrides = {}) => ({ _id: 'a', order: 1, brand: 'Ford', name: 'Focus', status: 'Disponible', price: 10000, currency: 'USD', km: 20000, createdAt: '2026-11-10T03:30:00Z', publishedOnML: 'Sí', images: ['https://example.test/photo.jpg'], ...overrides });

test('transmisión filtra antes de paginar y mantiene equivalencia online/offline sin excluir datos legacy del listado general', () => {
    const cars = [vehicle({ _id: 'manual', transmission: ' Manual ' }), vehicle({ _id: 'auto', transmission: 'Automática' }), vehicle({ _id: 'legacy' })];
    const { query } = buildStockQuery({ transmission: 'manual' }, cut);
    assert.equal(query.$and.find(item => item.transmission).transmission.test(' MANUAL '), true);
    assert.deepEqual(filterStockSnapshot(cars, { transmission: 'manual' }, cut).map(car => car._id), ['manual']);
    assert.equal(filterStockSnapshot(cars, {}, cut).length, 3);
    assert.throws(() => parseStockFilters({ transmission: ['Manual'] }));
    assert.equal(buildStockQuery({ transmission: 'CVT+' }, cut).query.$and.find(item => item.transmission).transmission.test('CVTT'), false);
});

test('marcas y modelos agrupan espacios y mayúsculas sin modificar originales ni fusionar otros nombres', () => {
    const source = [' Ford ', 'FORD', 'Ford', 'Land   Rover', 'land rover', 'Citroën', 'Citroen'];
    const before = [...source];
    assert.deepEqual(stockOptions(source), ['Citroen', 'Citroën', 'Ford', 'Land Rover']);
    assert.deepEqual(source, before);
    assert.notEqual(normalizeStockText('Ｆｏｒｄ'), normalizeStockText('Ford'));
});

test('marca y modelo se tratan como texto literal, no patrones de regex', () => {
    const { query } = buildStockQuery({ brand: '  Ford+  ', model: 'Focus (1.6)' }, cut);
    const brand = query.$and.find(item => item.brand).brand;
    const model = query.$and.find(item => item.name).name;
    assert.equal(brand.test('FORD+  '), true);
    assert.equal(brand.test('Forddd'), false);
    assert.equal(model.test(' Focus (1.6) '), true);
    assert.equal(model.test('Focus 11x6'), false);
});

test('rangos de precio requieren moneda y rechazan negativos, infinito, objetos y límites invertidos', () => {
    for (const invalid of [{ minPrice: 1 }, { currency: 'EUR' }, { minKm: -1 }, { maxKm: 'Infinity' }, { minDays: 2, maxDays: 1 }, { currency: 'USD', minPrice: 2, maxPrice: 1 }, { minKm: [] }, { minKm: true }, { minKm: {} }, { maxDays: 1.5 }]) assert.throws(() => parseStockFilters(invalid));
    assert.equal(parseStockFilters({ currency: 'USD', minPrice: '0' }).minPrice, 0);
    assert.throws(() => buildStockQuery({ minDays: 1e100 }, cut));
    assert.throws(() => filterStockSnapshot([], { minDays: 1e100 }, cut));
});

test('texto largo o repetido como arreglo no entra a la consulta y límites preservan callers de 1000 unidades', () => {
    assert.throws(() => parseStockFilters({ search: 'a'.repeat(301) }));
    assert.throws(() => parseStockFilters({ brand: ['Ford', 'Toyota'] }));
    assert.equal(parseStockFilters({ limit: 1000 }).limit, 1000);
    assert.equal(parseStockFilters({ limit: 2000 }).limit, 1000);
});

test('precio nominal y moneda explícita conservan alias USD/U$S y ARS/$ sin convertir importes', () => {
    const cars = [vehicle(), vehicle({ _id: 'b', currency: 'U$S', price: 9000 }), vehicle({ _id: 'c', currency: ' usd ', price: 11000 }), vehicle({ _id: 'd', currency: '$', price: 10000 })];
    assert.deepEqual(filterStockSnapshot(cars, { currency: 'USD', minPrice: 9000, maxPrice: 11000 }, cut).map(car => car._id), ['a', 'b', 'c']);
    assert.deepEqual(filterStockSnapshot(cars, { currency: 'ARS' }, cut).map(car => car._id), ['d']);
    assert.equal(buildStockQuery({ currency: 'USD' }, cut).query.$and.find(item => item.currency).currency.test(' usd '), true);
});

test('estadísticas respetan la moneda explícita incluso por encima de 200k, sin inferir conversiones por magnitud', () => {
    assert.equal(stockStatisticsCurrency('USD', 200000), 'USD');
    assert.equal(stockStatisticsCurrency('USD', 200001), 'USD');
    assert.equal(stockStatisticsCurrency('EUR', 1000), null);
    assert.equal(stockStatisticsCurrency('U$S', 12000), 'USD');
    assert.equal(stockStatisticsCurrency('ARS', 12000), 'ARS');
    assert.equal(stockStatisticsCurrency('$', 12000), 'ARS');
    assert.equal(stockStatisticsCurrency(' usd ', 12000), 'USD');
    assert.equal(stockStatisticsCurrency('US$', 12000), 'USD');
});

test('días en stock siguen el calendario de Argentina y distinguen 90 de 91 independientemente de la hora', () => {
    assert.equal(stockDays(vehicle(), cut), 0);
    assert.equal(stockDays(vehicle({ createdAt: '2026-08-12T23:59:00-03:00' }), cut), 90);
    assert.equal(stockDays(vehicle({ createdAt: '2026-08-11T23:59:00-03:00' }), cut), 91);
    assert.equal(stockDays(vehicle({ createdAt: null }), cut), null);
    const cars = [vehicle({ _id: '90', createdAt: '2026-08-12T03:00:00Z' }), vehicle({ _id: '91', createdAt: '2026-08-11T23:59:00-03:00' })];
    assert.deepEqual(filterStockSnapshot(cars, { stagnant: true }, cut).map(car => car._id), ['91']);
    const { query } = buildStockQuery({ minDays: 90, maxDays: 90 }, cut);
    const range = query.$and.find(item => item.createdAt).createdAt;
    assert.equal(range.$gte.toISOString(), '2026-08-12T03:00:00.000Z');
    assert.equal(range.$lt.toISOString(), '2026-08-13T03:00:00.000Z');
});

test('A revisar considera publicación, foto y precio, con imágenes y portada alternativas reales', () => {
    assert.equal(stockNeedsReview(vehicle()), false);
    assert.equal(stockNeedsReview(vehicle({ publishedOnML: ' Si ' })), false);
    assert.equal(stockNeedsReview(vehicle({ images: [], coverImage: 'https://example.test/cover.jpg' })), false);
    for (const change of [{ publishedOnML: 'No' }, { images: [' '] }, { images: [], coverImage: '' }, { price: 0 }, { price: null }]) assert.equal(stockNeedsReview(vehicle(change)), true);
});

test('los filtros se combinan antes de paginar y no cambian propiedad, estado ni orden del catálogo', () => {
    const cars = [vehicle({ _id: 'a', brand: ' FORD ', name: ' FOCUS ', investor: { percentage: 50 } }), vehicle({ _id: 'b', brand: 'Ford', investor: { percentage: 50 }, km: 50000 }), vehicle({ _id: 'c', status: 'Reservado' })];
    const before = JSON.stringify(cars);
    const result = filterStockSnapshot(cars, { status: 'disponible', brand: 'ford', model: 'focus', tab: 'compartidos', minKm: 10000, maxKm: 30000 }, cut);
    assert.deepEqual(result.map(car => car._id), ['a']);
    assert.equal(JSON.stringify(cars), before);
});

test('orden por precio separa monedas, agrupa alias y el orden manual sigue siendo predeterminado', () => {
    const cars = [vehicle({ _id: 'a', order: 2, price: 10000 }), vehicle({ _id: 'b', order: 1, currency: 'U$S', price: 9000 }), vehicle({ _id: 'c', order: 3, currency: '$', price: 5000000 })];
    assert.deepEqual(filterStockSnapshot(cars, {}, cut).map(car => car._id), ['b', 'a', 'c']);
    assert.deepEqual(filterStockSnapshot(cars, { sort: 'price_asc' }, cut).map(car => car._id), ['c', 'b', 'a']);
    assert.deepEqual(filterStockSnapshot(cars, { sort: 'price_desc' }, cut).map(car => car._id), ['c', 'a', 'b']);
});

test('búsqueda de varias palabras se aplica al mismo vehículo y conserva estados propios', () => {
    const cars = [vehicle({ _id: 'a', notes: 'Atender prueba', ownerName: 'Propietario QA', status: 'Pausado' }), vehicle({ _id: 'b', status: 'Vendido' })];
    assert.deepEqual(filterStockSnapshot(cars, { search: 'Ford Propietario', status: 'vendido_sin_confirmar' }, cut).map(car => car._id), ['a']);
    assert.deepEqual(filterStockSnapshot(cars, { status: 'vendido' }, cut).map(car => car._id), ['b']);
});

test('años, ubicación, responsable y origen combinados filtran la instantánea sin cambiar los registros', () => {
    const responsible = 'a'.repeat(24);
    const cars = [vehicle({ _id: 'a', year: 2023, agencyOwned: true, location: 'Salón QA', consignmentSeller: responsible }), vehicle({ _id: 'b', year: 2020, agencyOwned: true, location: 'Salón QA' }), vehicle({ _id: 'c', year: 2024, agencyOwned: false, ownerName: 'Consignante ficticio', location: 'Salón QA' })];
    const before = JSON.stringify(cars);
    assert.deepEqual(filterStockSnapshot(cars, { minYear: 2022, maxYear: 2025, location: ' salón qa ', responsible, origin: 'owned' }, cut).map(car => car._id), ['a']);
    assert.deepEqual(filterStockSnapshot(cars, { responsible: 'unassigned', origin: 'consigned' }, cut).map(car => car._id), ['c']);
    assert.equal(JSON.stringify(cars), before);
});

test('el año y el responsable avanzados se validan antes de consultar', () => {
    for (const input of [{ minYear: 2022.5 }, { minYear: 2030, maxYear: 2020 }, { responsible: 'usuario' }, { origin: 'cualquiera' }]) assert.throws(() => parseStockFilters(input));
});
