// Pruebas de integración para Consistencia y Cálculo de Indicadores de Stock, Filtros y Paginación
// Valida los requerimientos en un entorno aislado en memoria con mongodb-memory-server
import assert from 'node:assert/strict';
import { boot } from './harness.js';

const { call, test, finish, mongoose, token } = await boot();
const { default: Car } = await import('../../src/models/Car.js');
const { default: TreasuryBox } = await import('../../src/models/TreasuryBox.js');
const { default: TreasuryConfig } = await import('../../src/models/TreasuryConfig.js');
const { default: Transaction } = await import('../../src/models/Transaction.js');

console.log('=== PRUEBAS DE INTEGRACIÓN: INDICADORES DE STOCK, FILTROS Y PAGINACIÓN ===');

// Setup: Inicializar dataset de prueba conocido
await Car.deleteMany({});
await TreasuryBox.deleteMany({});
await TreasuryConfig.deleteMany({});
await Transaction.deleteMany({});

await Car.create([
    {
        brand: 'Toyota',
        name: 'Corolla XEI',
        year: 2022,
        km: 25000,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 20000,
        currency: 'USD',
        purchasePrice: 15000,
        purchaseCurrency: 'USD',
        status: 'Disponible',
        agencyOwned: true
    },
    {
        brand: 'Volkswagen',
        name: 'Amarok Highline',
        year: 2021,
        km: 45000,
        fuel: 'Diesel',
        condition: 'Usado',
        price: 30000000,
        currency: 'ARS',
        purchasePrice: 22000000,
        purchaseCurrency: 'ARS',
        status: 'Disponible',
        agencyOwned: true
    },
    {
        brand: 'Ford',
        name: 'Ranger Limited',
        year: 2023,
        km: 15000,
        fuel: 'Diesel',
        condition: 'Usado',
        price: 40000,
        currency: 'USD',
        purchasePrice: 30000,
        purchaseCurrency: 'USD',
        status: 'Disponible',
        agencyOwned: true,
        investor: { name: 'Inversor Carlos', percentage: 40 }
    },
    {
        brand: 'Chevrolet',
        name: 'Cruze LTZ',
        year: 2020,
        km: 50000,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 25000,
        currency: 'USD',
        purchasePrice: 18000,
        purchaseCurrency: 'USD',
        status: 'Reservado', // Seña
        agencyOwned: true
    },
    {
        brand: 'Peugeot',
        name: '208 Feline',
        year: 2022,
        km: 30000,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 15000000,
        currency: 'ARS',
        purchasePrice: 10000000,
        purchaseCurrency: 'ARS',
        status: 'Pausado', // Preparación
        agencyOwned: true
    },
    {
        brand: 'Renault',
        name: 'Sandero Stepway (Histórico Vendido)',
        year: 2019,
        km: 80000,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 35000,
        currency: 'USD',
        purchasePrice: 28000,
        purchaseCurrency: 'USD',
        status: 'Vendido',
        sold: true,
        agencyOwned: true
    },
    {
        brand: 'Fiat',
        name: 'Cronos Drive (Histórico Vendido 2)',
        year: 2021,
        km: 40000,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 10000000,
        currency: 'ARS',
        purchasePrice: 8000000,
        purchaseCurrency: 'ARS',
        status: 'Vendido',
        sold: true,
        agencyOwned: true
    }
]);

await test('1. El resumen global calcula correctamente cantidades y valores por separado sin sumar ARS y USD', async () => {
    const res = await call('GET', '/api/admin/cars', null, token);
    assert.equal(res.status, 200, 'Debe responder 200 OK');
    const { summary, cars, total } = res.json;

    // Stock activo: 5 vehículos (Toyota, Amarok, Ranger, Cruze, 208). Excluye Vendido y Cancelado.
    assert.equal(summary.totalStock, 5, 'El stock total activo debe ser 5');
    assert.equal(summary.disponibles, 3, 'Disponibles deben ser exactamente 3');
    assert.equal(summary.reservados, 1, 'Reservados deben ser exactamente 1');
    assert.equal(summary.pausados, 1, 'Pausados deben ser exactamente 1');

    // Valores de venta de disponibles:
    // Toyota (20k USD) + Ranger (40k USD) = 60.000 USD
    // Amarok (30M ARS) = 30.000.000 ARS
    assert.equal(summary.valorTotalUSD, 60000, 'Valor de venta total USD de disponibles debe ser 60.000');
    assert.equal(summary.valorTotalARS, 30000000, 'Valor de venta total ARS de disponibles debe ser 30.000.000');

    // Capital agencia vs inversionista:
    // Toyota: 100% * 20.000 = 20.000 USD
    // Ranger: 60% * 40.000 = 24.000 USD -> Total Activo USD = 44.000 USD
    assert.equal(summary.valorActivoUSD, 44000, 'Capital agencia en venta USD debe ser 44.000');
    assert.equal(summary.valorActivoInversionistasUSD, 16000, 'Capital inversionistas en venta USD debe ser 16.000');
    assert.equal(summary.valorActivoARS, 30000000, 'Capital agencia en venta ARS debe ser 30.000.000');
    assert.equal(summary.valorActivoInversionistasARS, 0, 'Capital inversionistas en venta ARS debe ser 0');
});

await test('2. El parámetro limit=1 devuelve 1 vehículo pero conserva el resumen global completo', async () => {
    const res = await call('GET', '/api/admin/cars?limit=1&page=1', null, token);
    assert.equal(res.status, 200);
    const { summary, cars, total } = res.json;

    assert.equal(cars.length, 1, 'Debe devolver un único vehículo en la lista paginada');
    assert.equal(total, 5, 'El total filtrado debe seguir siendo 5 vehículos en inventario activo');

    // El summary global sigue reflejando los 5 autos totales y 3 disponibles, nunca se colapsa a 1
    assert.equal(summary.totalStock, 5, 'El totalStock global sigue siendo 5');
    assert.equal(summary.disponibles, 3, 'Los disponibles globales siguen siendo 3');
    assert.equal(summary.valorTotalUSD, 60000, 'El valor total USD sigue siendo 60.000');
});

await test('3. Cambiar un filtro altera el resultado filtrado pero NO los indicadores globales', async () => {
    // Filtramos por estado 'Reservado'
    const res = await call('GET', '/api/admin/cars?status=Reservado', null, token);
    assert.equal(res.status, 200);
    const { summary, cars, total, filteredTotalUSD, filteredTotalARS } = res.json;

    // Resultado filtrado: solo el Cruze LTZ (25.000 USD)
    assert.equal(total, 1, 'Total filtrado debe ser 1');
    assert.equal(cars[0].name, 'Cruze LTZ');
    assert.equal(filteredTotalUSD, 25000, 'Total publicado filtrado en USD es 25.000');
    assert.equal(filteredTotalARS, 0, 'Total publicado filtrado en ARS es 0');

    // Los indicadores globales se mantienen idénticos:
    assert.equal(summary.disponibles, 3, 'Los disponibles globales siguen siendo 3');
    assert.equal(summary.totalStock, 5, 'El total stock global sigue siendo 5');
    assert.equal(summary.valorTotalUSD, 60000, 'El valor total global en USD sigue siendo 60.000');
});

await test('4. Paginación: navegar entre páginas no altera el conteo total ni los valores globales', async () => {
    const p1 = await call('GET', '/api/admin/cars?page=1&limit=2', null, token);
    const p2 = await call('GET', '/api/admin/cars?page=2&limit=2', null, token);
    const p3 = await call('GET', '/api/admin/cars?page=3&limit=2', null, token);

    assert.equal(p1.json.cars.length, 2, 'Página 1 devuelve 2 autos');
    assert.equal(p2.json.cars.length, 2, 'Página 2 devuelve 2 autos');
    assert.equal(p3.json.cars.length, 1, 'Página 3 devuelve 1 auto');

    // En todas las páginas, el total y summary son idénticos
    assert.equal(p1.json.total, 5);
    assert.equal(p2.json.total, 5);
    assert.equal(p3.json.total, 5);

    assert.equal(p1.json.summary.totalStock, 5);
    assert.equal(p2.json.summary.totalStock, 5);
    assert.equal(p3.json.summary.totalStock, 5);
});

await test('5. Altas, modificaciones de precio y cambios de estado actualizan coherentemente los totales', async () => {
    // 5.1 Modificar precio de Toyota Corolla de 20.000 a 22.000 USD
    const toyota = await Car.findOne({ name: 'Corolla XEI' });
    toyota.price = 22000;
    await toyota.save();

    const resAfterPrice = await call('GET', '/api/admin/cars', null, token);
    assert.equal(resAfterPrice.json.summary.valorTotalUSD, 62000, 'El valor publicado global subió a 62.000 USD');

    // 5.2 Cambiar estado de Amarok a Vendido
    const amarok = await Car.findOne({ name: 'Amarok Highline' });
    amarok.status = 'Vendido';
    amarok.sold = true;
    await amarok.save();

    const resAfterSale = await call('GET', '/api/admin/cars', null, token);
    assert.equal(resAfterSale.json.summary.totalStock, 4, 'El stock total activo bajó a 4');
    assert.equal(resAfterSale.json.summary.disponibles, 2, 'Los disponibles bajaron a 2');
    assert.equal(resAfterSale.json.summary.valorTotalARS, 0, 'No quedan disponibles en ARS, valorTotalARS = 0');
});

await test('6. Asignaciones de dinero a la caja estratégica "Stock" no aumentan la cantidad de vehículos ni el inventario', async () => {
    // Creamos caja de stock en tesorería con fondos de reserva
    await TreasuryBox.create({
        key: 'stock',
        name: 'Caja Stock / Vehículos',
        balanceARS: 10000000,
        balanceUSD: 5000,
        availableARS: 10000000,
        availableUSD: 5000
    });

    const res = await call('GET', '/api/admin/cars', null, token);
    assert.equal(res.json.summary.totalStock, 4, 'La cantidad de vehículos sigue siendo 4');
    assert.equal(res.json.summary.valorTotalUSD, 62000, 'El valor del inventario sigue siendo 62.000 USD sin sumar dinero de caja');
});

await finish();
