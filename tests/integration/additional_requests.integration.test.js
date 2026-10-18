import assert from 'node:assert/strict';
import { boot } from './harness.js';
import Car from '../../src/models/Car.js';
import Account from '../../src/models/Account.js';

const { call, test, finish } = await boot();
console.log('Pedidos Adicionales — Justificación de Compra/Toma y Empresa Receptora ALWAYS SAS');

await test('1. Modificar purchasePrice sin justificación o sin tipo de cambio es rechazado con 400 y no altera el vehículo', async () => {
    const car = await Car.create({
        brand: 'Volkswagen',
        name: 'Amarok V6 Extreme',
        year: 2023,
        km: 15000,
        fuel: 'Diesel',
        condition: 'Usado',
        currency: 'USD',
        purchaseCurrency: 'USD',
        price: 48000,
        purchasePrice: 40000,
        status: 'Disponible'
    });

    // Intento sin justificación
    const resNoJust = await call('PATCH', `/api/admin/cars/${car._id}`, {
        purchasePrice: 41500,
        purchasePriceChangeType: 'correccion_precio',
        purchasePriceJustification: '   '
    });
    assert.equal(resNoJust.status, 400, 'Debe rechazar cambio de costo sin justificación');
    assert.match(resNoJust.json.message, /justificaci[oó]n obligatoria/i);

    // Intento sin tipo válido
    const resNoType = await call('PATCH', `/api/admin/cars/${car._id}`, {
        purchasePrice: 41500,
        purchasePriceJustification: 'Ajuste acordado con proveedor'
    });
    assert.equal(resNoType.status, 400, 'Debe rechazar cambio de costo sin tipo válido');

    const unchanged = await Car.findById(car._id);
    assert.equal(unchanged.purchasePrice, 40000, 'El costo de compra no debe haberse modificado');
});

await test('2. Modificar purchasePrice como correccion_precio actualiza base de compra/toma, registra en Historial Interno y no duplica gastos', async () => {
    const car = await Car.create({
        brand: 'Toyota',
        name: 'SW4 Diamond',
        year: 2022,
        km: 32000,
        fuel: 'Diesel',
        condition: 'Usado',
        currency: 'USD',
        purchaseCurrency: 'USD',
        price: 52000,
        purchasePrice: 44000,
        status: 'Disponible',
        tradeInOrigin: {
            value: 44000,
            currency: 'USD',
            takenAt: new Date()
        }
    });

    const res = await call('PATCH', `/api/admin/cars/${car._id}`, {
        purchasePrice: 43200,
        purchasePriceChangeType: 'correccion_precio',
        purchasePriceJustification: 'Descuento por detalle en paragolpes trasero al cerrar toma'
    });

    assert.equal(res.status, 200, 'Debe permitir actualizar con justificación y tipo correccion_precio');
    assert.equal(res.json.purchasePrice, 43200);
    assert.equal(res.json.tradeInOrigin.value, 43200, 'Si era permuta debe sincronizar tradeInOrigin.value sin duplicar');
    assert.equal((res.json.expenses || []).length, 0, 'No debe agregar gastos duplicados en corrección de precio');

    const logEntry = (res.json.auditLog || []).find(l => l.action === 'COSTO_COMPRA');
    assert.ok(logEntry, 'Debe existir registro en el Historial Interno (auditLog)');
    assert.equal(logEntry.changeType, 'correccion_precio');
    assert.equal(logEntry.justification, 'Descuento por detalle en paragolpes trasero al cerrar toma');
    assert.match(String(logEntry.oldValue), /44\.?000/);
    assert.match(String(logEntry.newValue), /43\.?200/);
});

await test('3. Modificar purchasePrice como gasto_adicional conserva el precio base original, suma solo la diferencia como gasto y audita sin duplicar costos', async () => {
    const car = await Car.create({
        brand: 'Ford',
        name: 'Ranger Limited',
        year: 2021,
        km: 58000,
        fuel: 'Diesel',
        condition: 'Usado',
        currency: 'ARS',
        purchaseCurrency: 'ARS',
        price: 38000000,
        purchasePrice: 31000000,
        status: 'Disponible',
        expenses: [
            { concept: 'Lavado inicial', amount: 50000, currency: 'ARS', date: new Date() }
        ]
    });

    const res = await call('PATCH', `/api/admin/cars/${car._id}`, {
        purchasePrice: 31450000,
        purchasePriceChangeType: 'gasto_adicional',
        purchasePriceJustification: 'Reparación de tren delantero y alineación en taller oficial'
    });

    assert.equal(res.status, 200, 'Debe procesar gasto adicional correctamente');
    assert.equal(res.json.purchasePrice, 31000000, 'El precio de compra base debe mantenerse sin duplicar el incremento');
    assert.equal(res.json.expenses.length, 2, 'Debe haberse sumado exactamente 1 gasto adicional por la diferencia');

    const addedExpense = res.json.expenses[1];
    assert.equal(addedExpense.amount, 450000, 'El gasto adicional debe ser exactamente la diferencia (31.450.000 - 31.000.000)');
    assert.match(addedExpense.concept, /Reparaci[oó]n de tren delantero/i);

    const totalCost = res.json.purchasePrice + res.json.expenses.reduce((acc, e) => acc + e.amount, 0);
    assert.equal(totalCost, 31500000, 'El costo total (base 31M + 50k previo + 450k nuevo) no debe duplicar montos');

    const logEntry = (res.json.auditLog || []).find(l => l.changeType === 'gasto_adicional');
    assert.ok(logEntry, 'Debe quedar registrado en el Historial Interno con changeType=gasto_adicional');
    assert.equal(logEntry.action, 'GASTO');
    assert.equal(logEntry.justification, 'Reparación de tren delantero y alineación en taller oficial');
});

await test('4. Empresa receptora ALWAYS SAS disponible y persistente en transacciones sin duplicados ni datos fiscales inventados', async () => {
    const acc = await Account.create({
        name: 'Caja Central ARS',
        type: 'Efectivo',
        currency: 'ARS',
        balance: 10000000,
        isActive: true
    });

    const createRes = await call('POST', '/api/admin/transactions', {
        type: 'Egreso',
        category: 'Pago Empresas',
        payeeCompany: 'ALWAYS SAS',
        concept: 'Cancelación lote repuestos ALWAYS SAS',
        description: 'Transferencia orden #884',
        amount: 1250000,
        currency: 'ARS',
        paymentMethod: 'transferencia',
        accountId: String(acc._id),
        date: new Date().toISOString()
    });

    assert.equal(createRes.status, 201, 'Debe crear el egreso con ALWAYS SAS como empresa receptora');
    assert.equal(createRes.json.payeeCompany, 'ALWAYS SAS');

    // Verificar persistencia en base de datos y listado
    const listRes = await call('GET', '/api/admin/transactions?category=Pago%20Empresas');
    assert.equal(listRes.status, 200);
    const matches = (listRes.json.transactions || listRes.json || []).filter(
        t => t.payeeCompany === 'ALWAYS SAS' && t.concept === 'Cancelación lote repuestos ALWAYS SAS'
    );
    assert.equal(matches.length, 1, 'Debe persistir una única vez sin duplicados');
    assert.equal(matches[0].payeeCompany, 'ALWAYS SAS');
});

await finish();
