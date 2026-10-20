import assert from 'node:assert/strict';
import { boot } from './harness.js';

const { call, test, finish, token } = await boot();
const { default: mongoose } = await import('mongoose');
const { default: Sale } = await import('../../src/models/Sale.js');
const { default: Car } = await import('../../src/models/Car.js');
const { default: Client } = await import('../../src/models/Client.js');
const { default: Installment } = await import('../../src/models/Installment.js');

console.log('=== PRUEBAS DE INTEGRACIÓN: CAMBIAR VEHÍCULO EN UNA VENTA ===');

let client;
let carOriginal;
let carNuevo;
let carOcupado;
let sale;

await test('0. Preparación: Cliente, Vehículo Original, Nuevo Vehículo y Venta Activa', async () => {
    client = await Client.create({
        firstName: 'Mariana',
        lastName: 'López',
        fullName: 'Mariana López',
        dni: '32999888',
        phone: '1133445566'
    });

    carOriginal = await Car.create({
        brand: 'Volkswagen',
        name: 'Gol Trend 1.6 MSI',
        year: 2021,
        km: 40000,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 18000000,
        currency: '$',
        plateOrVin: 'AE456CD',
        purchasePrice: 14000000,
        purchaseCurrency: 'ARS',
        status: 'Vendido',
        investor: { name: 'Inversor A', percentage: 20 }
    });

    carNuevo = await Car.create({
        brand: 'Ford',
        name: 'Focus 2.0 Titanium',
        year: 2020,
        km: 55000,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 19500000,
        currency: '$',
        plateOrVin: 'AD789EF',
        purchasePrice: 15500000,
        purchaseCurrency: 'ARS',
        status: 'Disponible',
        investor: { name: 'Inversor B', percentage: 0 }
    });

    carOcupado = await Car.create({
        brand: 'Chevrolet',
        name: 'Cruze LTZ',
        year: 2022,
        km: 25000,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 22000000,
        currency: '$',
        plateOrVin: 'AF999ZZ',
        status: 'Vendido'
    });

    // Otra venta activa vinculada a carOcupado
    await Sale.create({
        clientId: client._id,
        vehicleId: carOcupado._id,
        salePrice: 22000000,
        saleCurrency: 'ARS',
        status: 'confirmada'
    });

    // Venta principal bajo prueba
    sale = await Sale.create({
        clientId: client._id,
        vehicleId: carOriginal._id,
        salePrice: 18000000,
        saleCurrency: 'ARS',
        status: 'confirmada',
        saleDate: new Date()
    });

    // Cuota vinculada a la venta
    await Installment.create({
        saleId: sale._id,
        clientId: client._id,
        vehicleId: carOriginal._id,
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 3000000,
        currency: 'ARS',
        dueDate: new Date(),
        status: 'pendiente'
    });

    assert.ok(sale._id);
});

await test('1. POST /api/admin/sales/:id/change-vehicle/preview - Comparativa, avisos y validaciones', async () => {
    // Intento 1: Sin nuevo vehículo -> 400
    const noVehicle = await call('POST', `/api/admin/sales/${sale._id}/change-vehicle/preview`, {});
    assert.equal(noVehicle.status, 400);

    // Intento 2: Seleccionar un auto asignado a otra venta activa -> 400
    const busyCar = await call('POST', `/api/admin/sales/${sale._id}/change-vehicle/preview`, {
        newVehicleId: carOcupado._id.toString()
    });
    assert.equal(busyCar.status, 400);
    assert.match(busyCar.json.message, /asignado a otra venta/i);

    // Intento 3: Seleccionar el mismo auto ya asignado -> 400
    const sameCar = await call('POST', `/api/admin/sales/${sale._id}/change-vehicle/preview`, {
        newVehicleId: carOriginal._id.toString()
    });
    assert.equal(sameCar.status, 400);
    assert.match(sameCar.json.message, /mismo.*asignado/i);

    // Intento 4: Vista previa válida
    const validPreview = await call('POST', `/api/admin/sales/${sale._id}/change-vehicle/preview`, {
        newVehicleId: carNuevo._id.toString()
    });
    assert.equal(validPreview.status, 200);
    assert.equal(validPreview.json.ok, true);

    const prev = validPreview.json.preview;
    assert.equal(prev.previousVehicle.plateOrVin, 'AE456CD');
    assert.equal(prev.newVehicle.plateOrVin, 'AD789EF');
    // Diferencia de costo: 15.500.000 - 14.000.000 = +1.500.000
    assert.equal(prev.costDiff, 1500000);
    // Diferencia de inversor: 0 - 20 = -20
    assert.equal(prev.investorDiff, -20);
    // Diferencia de precio publicado vs pactado: 19.500.000 vs 18.000.000 -> hasPriceDiff true
    assert.equal(prev.hasPriceDiff, true);
    assert.ok(prev.priceWarning);
    assert.ok(prev.documentsChecklist.length >= 5);
});

await test('2. POST /api/admin/sales/:id/change-vehicle - Ejecución atómica y consistencia total', async () => {
    // Intento 1: Sin motivo obligatorio -> 400
    const noReason = await call('POST', `/api/admin/sales/${sale._id}/change-vehicle`, {
        newVehicleId: carNuevo._id.toString(),
        reason: '   '
    });
    assert.equal(noReason.status, 400);
    assert.match(noReason.json.message, /motivo.*obligatorio/i);

    // Intento 2: Ejecución exitosa
    const confirmRes = await call('POST', `/api/admin/sales/${sale._id}/change-vehicle`, {
        newVehicleId: carNuevo._id.toString(),
        reason: 'Error en la carga original de la patente: el cliente compró la unidad Focus',
        documentsChecklist: [
            { key: 'form_08', label: 'Formulario 08', checked: true },
            { key: 'seguro', label: 'Seguro', checked: true }
        ],
        notes: 'Verificado con el cliente en salón'
    });
    assert.equal(confirmRes.status, 200);
    assert.equal(confirmRes.json.ok, true);

    // 1. Auto anterior vuelve a Disponible y tiene auditoría de desvinculación
    const updatedOldCar = await Car.findById(carOriginal._id);
    assert.equal(updatedOldCar.status, 'Disponible');
    const oldCarAudit = updatedOldCar.auditLog.find(a => a.details.includes('Desvinculado de la venta'));
    assert.ok(oldCarAudit, 'El auto anterior debe registrar la desvinculación');

    // 2. Nuevo auto pasa a Vendido y tiene auditoría de vinculación
    const updatedNewCar = await Car.findById(carNuevo._id);
    assert.equal(updatedNewCar.status, 'Vendido');
    const newCarAudit = updatedNewCar.auditLog.find(a => a.details.includes('Asignado a la venta'));
    assert.ok(newCarAudit, 'El nuevo auto debe registrar la vinculación');

    // 3. Venta conserva condiciones pactadas y registra vehicleChangeHistory
    const updatedSale = await Sale.findById(sale._id);
    assert.equal(updatedSale.vehicleId.toString(), carNuevo._id.toString());
    assert.equal(updatedSale.salePrice, 18000000, 'Conserva el precio de venta acordado');
    assert.equal(updatedSale.clientId.toString(), client._id.toString(), 'Conserva el cliente');
    assert.equal(updatedSale.vehicleChangeHistory.length, 1);
    assert.equal(updatedSale.vehicleChangeHistory[0].reason, 'Error en la carga original de la patente: el cliente compró la unidad Focus');
    assert.equal(updatedSale.vehicleChangeHistory[0].previousVehicleSnapshot.plate, 'AE456CD');
    assert.equal(updatedSale.vehicleChangeHistory[0].newVehicleSnapshot.plate, 'AD789EF');

    // 4. Las cuotas asociadas ahora apuntan al nuevo vehículo
    const updatedInst = await Installment.findOne({ saleId: sale._id });
    assert.equal(updatedInst.vehicleId.toString(), carNuevo._id.toString());
});

console.log('=== PRUEBAS DE CAMBIAR VEHÍCULO COMPLETADAS EXITOSAMENTE ===');
await finish();
