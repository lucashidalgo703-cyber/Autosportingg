import assert from 'node:assert/strict';
import { boot } from './harness.js';

const { call, test, finish, mongoose } = await boot();

const Car = mongoose.model('Car');
const Sale = mongoose.model('Sale');
const Client = mongoose.model('Client');
const Account = mongoose.model('Account');
const Transaction = mongoose.model('Transaction');

console.log('\n--- INICIANDO PRUEBAS DE INTEGRACIÓN: 4 PRIORIDADES CRM ---');

// Setup base data
let testClient;
let testCar;
let testSale;
let testAccount;

await test('Setup: Crear entidades base (Cliente, Vehículo, Cuenta, Venta)', async () => {
    testAccount = new Account({
        name: 'Banco Galicia USD Test',
        type: 'Banco',
        currency: 'USD',
        balance: 50000,
        isActive: true
    });
    await testAccount.save();

    testClient = new Client({
        firstName: 'Carlos',
        lastName: 'Gómez',
        fullName: 'Carlos Gómez',
        documentNumber: '30112233',
        phone: '1155443322'
    });
    await testClient.save();

    testCar = new Car({
        brand: 'Toyota',
        name: 'Hilux SRX 4x4',
        model: 'Hilux',
        year: 2023,
        km: 25000,
        condition: 'Usado',
        fuel: 'Diesel',
        plateOrVin: 'AF999ZZ',
        price: 35000,
        currency: 'USD',
        purchasePrice: 28000,
        purchaseCurrency: 'USD',
        status: 'Disponible',
        agencyOwned: true
    });
    await testCar.save();

    testSale = new Sale({
        clientId: testClient._id,
        vehicleId: testCar._id,
        saleDate: new Date(),
        salePrice: 35000,
        saleCurrency: 'USD',
        currency: 'USD',
        status: 'confirmada',
        customerName: 'Carlos Gómez',
        tradeIns: []
    });
    await testSale.save();

    assert.ok(testSale._id, 'Venta base creada');
});

// PRIORIDAD 1: Resumen de tesorería y desbloqueo de PIN
await test('Prioridad 1: Resumen de tesorería para la venta (seña y saldos)', async () => {
    const res = await call('GET', `/api/admin/sales/${testSale._id}/treasury-summary`);
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    assert.equal(res.json.saleState.agreedPrice, 35000);
    assert.equal(res.json.saleState.pendingSaleBalance, 35000);
});

// PRIORIDAD 2: Búsqueda de venta en vivo para cuotas y prevención de duplicados
await test('Prioridad 2a: Búsqueda de ventas para cuotas por cliente, patente o modelo', async () => {
    // Buscar por apellido
    const resByClient = await call('GET', '/api/admin/sales/search-for-installments?q=Gómez');
    assert.equal(resByClient.status, 200);
    assert.ok(resByClient.json.sales.length >= 1);
    assert.equal(resByClient.json.sales[0].client.name, 'Carlos Gómez');

    // Buscar por patente
    const resByPlate = await call('GET', '/api/admin/sales/search-for-installments?q=AF999');
    assert.equal(resByPlate.status, 200);
    assert.ok(resByPlate.json.sales.length >= 1);
    assert.equal(resByPlate.json.sales[0].vehicle.plate, 'AF999ZZ');
    assert.equal(resByPlate.json.sales[0].nextInstallmentNumber, 1);
});

await test('Prioridad 2b: Crear cuota vinculada a venta y prevenir duplicación de número', async () => {
    // 1. Crear cuota 1
    const createRes = await call('POST', '/api/admin/installments', {
        saleId: testSale._id,
        installmentNumber: 1,
        dueDate: '2026-11-15',
        amount: 5000,
        currency: 'USD',
        notes: 'Cuota 1 de 3 acordada'
    });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.json.installmentNumber, 1);
    assert.equal(String(createRes.json.clientId), String(testClient._id), 'Autocompletó clientId de la venta');
    assert.equal(String(createRes.json.vehicleId), String(testCar._id), 'Autocompletó vehicleId de la venta');

    // 2. Intentar crear duplicada de cuota 1 debe rechazar con 409
    const dupRes = await call('POST', '/api/admin/installments', {
        saleId: testSale._id,
        installmentNumber: 1,
        dueDate: '2026-11-20',
        amount: 5000,
        currency: 'USD'
    });
    assert.equal(dupRes.status, 409, 'Debe rechazar cuota duplicada');
    assert.ok(dupRes.json.message.includes('Ya existe la cuota número 1'));

    // 3. Crear cuota 2 exitosa
    const c2Res = await call('POST', '/api/admin/installments', {
        saleId: testSale._id,
        installmentNumber: 2,
        dueDate: '2026-12-15',
        amount: 5000,
        currency: 'USD'
    });
    assert.equal(c2Res.status, 201);
});

// PRIORIDAD 3: Compra de vehículos propios (Stock) con pago inmediato, pendiente o parcial
await test('Prioridad 3a: Alta de vehículo propio con modalidad "pagar_ahora"', async () => {
    const initialAccBalance = testAccount.balance;

    const res = await call('POST', '/api/cars', {
        brand: 'Ford',
        name: 'Ranger LTD',
        year: 2024,
        km: 5000,
        condition: 'Usado',
        fuel: 'Diesel',
        price: 40000,
        currency: 'USD',
        purchasePrice: 30000,
        purchaseCurrency: 'USD',
        agencyOwned: true,
        purchasePayment: JSON.stringify({
            modality: 'pagar_ahora',
            accountId: testAccount._id,
            amountPaid: 30000,
            paymentMethod: 'Transferencia bancaria',
            reference: 'OP-BANC-9988',
            deductFromStrategicBox: false
        })
    });

    assert.equal(res.status, 201);
    const savedCar = res.json;
    assert.equal(savedCar.purchasePaymentState?.status, 'pagado');
    assert.equal(savedCar.purchasePaymentState?.amountPaid, 30000);
    assert.equal(savedCar.purchasePaymentState?.pendingDebt, 0);

    // Verificar deducción de cuenta física
    const updatedAccount = await Account.findById(testAccount._id);
    assert.equal(updatedAccount.balance, initialAccBalance - 30000);

    // Verificar egreso generado en Transaction
    const tx = await Transaction.findOne({ carId: savedCar._id, type: 'Egreso' });
    assert.ok(tx, 'Transacción de egreso registrada');
    assert.equal(tx.category, 'compra_vehiculo');
    assert.equal(tx.amount, 30000);
});

await test('Prioridad 3b: Alta de vehículo con modalidad "pendiente" y pago posterior', async () => {
    const res = await call('POST', '/api/cars', {
        brand: 'Volkswagen',
        name: 'Amarok V6',
        year: 2023,
        km: 15000,
        condition: 'Usado',
        fuel: 'Diesel',
        price: 38000,
        currency: 'USD',
        purchasePrice: 28000,
        purchaseCurrency: 'USD',
        agencyOwned: true,
        purchasePayment: JSON.stringify({
            modality: 'pendiente',
            expectedFundsNote: 'Se liquidará con el cobro de la venta #102'
        })
    });

    assert.equal(res.status, 201);
    const amarok = res.json;
    assert.equal(amarok.purchasePaymentState?.status, 'pendiente');
    assert.equal(amarok.purchasePaymentState?.amountPaid, 0);
    assert.equal(amarok.purchasePaymentState?.pendingDebt, 28000);

    // Abonar pago parcial de USD 10.000 vía endpoint de pago de compra
    const payRes = await call('POST', `/api/admin/cars/${amarok._id}/purchase-payment`, {
        amount: 10000,
        accountId: testAccount._id,
        paymentMethod: 'Transferencia bancaria',
        reference: 'ANTICIPO-1',
        notes: 'Primer pago por Amarok'
    });

    assert.equal(payRes.status, 200);
    assert.equal(payRes.json.ok, true);
    assert.equal(payRes.json.car.purchasePaymentState.amountPaid, 10000);
    assert.equal(payRes.json.car.purchasePaymentState.pendingDebt, 18000);
    assert.equal(payRes.json.car.purchasePaymentState.status, 'parcial');
});

// PRIORIDAD 4: Historial de cuentas y resumen categorizado de gastos
await test('Prioridad 4a: Historial de movimientos y extracto por cuenta', async () => {
    const res = await call('GET', `/api/admin/accounts/${testAccount._id}/movements`);
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    assert.ok(Array.isArray(res.json.movements));
    assert.ok(res.json.movements.length >= 2, 'Al menos 2 movimientos de compra de autos registrados');
    assert.ok(res.json.summary.totalEgresosStock >= 40000, 'Egresos de stock identificados');
});

await test('Prioridad 4b: Resumen categorizado de gastos y compromisos pendientes', async () => {
    const res = await call('GET', '/api/admin/finance/expenses-summary');
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    assert.ok(res.json.categories.compra_vehiculos.totalUSD >= 40000);
    assert.ok(res.json.pendingCommitments.pendingPurchasesUSD >= 18000, 'Compromiso de Amarok pendiente detectado');
});

await test('Prioridad 4c: Recálculo de saldos con preview seguro y auditoría', async () => {
    // Preview mode: no modifica
    const previewRes = await call('POST', '/api/admin/accounts/recalculate?preview=true');
    assert.equal(previewRes.status, 200);
    assert.equal(previewRes.json.ok, true);
    assert.equal(previewRes.json.preview, true);

    // Recálculo real con auditoría
    const realRes = await call('POST', '/api/admin/accounts/recalculate');
    assert.equal(realRes.status, 200);
    assert.equal(realRes.json.ok, true);
});

await finish();
