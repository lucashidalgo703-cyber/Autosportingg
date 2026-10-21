import assert from 'node:assert/strict';
import { boot } from './harness.js';
import { getCarPurchasePaymentSummary } from '../../src/utils/carPurchasePayment.js';

const { call, test, finish, mongoose } = await boot();

const Car = mongoose.model('Car');
const Account = mongoose.model('Account');
const Transaction = mongoose.model('Transaction');

console.log('\n--- INICIANDO PRUEBAS DE INTEGRACIÓN: PAGO DE COMPRA DE LA UNIDAD ---');

let testAccount;
let carCaseInconsistency;
let carHistorical;
let carForLinkExpense;

await test('Setup: Crear cuenta bancaria de prueba', async () => {
    testAccount = new Account({
        name: 'Banco Galicia ARS Operativa',
        type: 'Banco',
        currency: 'ARS',
        balance: 30000000, // 30M ARS
        isActive: true
    });
    await testAccount.save();
    assert.ok(testAccount._id, 'Cuenta bancaria creada con éxito');
});

await test('1. Corrección de inconsistencia: Costo 20.646.000 con 0 abonado y pendiente 0 en DB', async () => {
    // Simulamos exactamente el documento que generaba el bug:
    // purchasePaymentState con pendingDebt: 0 (por default de Mongoose) y status 'pendiente'
    carCaseInconsistency = new Car({
        brand: 'Volkswagen',
        name: 'Amarok Highline V6',
        model: 'Amarok',
        year: 2022,
        km: 45000,
        condition: 'Usado',
        fuel: 'Diesel',
        plateOrVin: 'AF123ZZ',
        price: 25000000,
        currency: 'ARS',
        purchasePrice: 20646000,
        purchaseCurrency: 'ARS',
        status: 'Disponible',
        agencyOwned: true,
        purchasePaymentState: {
            totalCost: 20646000,
            amountPaid: 0,
            pendingDebt: 0, // Inconsistencia previa
            status: 'pendiente',
            payments: []
        }
    });
    await carCaseInconsistency.save();

    // Verificamos que la utilidad calcula el saldo pendiente real (20.646.000) y no 0
    const summary = getCarPurchasePaymentSummary(carCaseInconsistency);
    assert.equal(summary.totalCost, 20646000);
    assert.equal(summary.amountPaid, 0);
    assert.equal(summary.pendingDebt, 20646000, 'El saldo pendiente debe ser 20.646.000 y no 0');
    assert.equal(summary.status, 'pendiente');
    assert.equal(summary.isHistorical, false);
});

await test('2. Vehículo histórico sin información de pago: estado "conciliacion_pendiente" sin inventar deuda', async () => {
    carHistorical = new Car({
        brand: 'Toyota',
        name: 'Corolla XEI',
        model: 'Corolla',
        year: 2018,
        km: 90000,
        condition: 'Usado',
        fuel: 'Nafta',
        plateOrVin: 'AA555BB',
        price: 15000000,
        currency: 'ARS',
        purchasePrice: 12000000,
        purchaseCurrency: 'ARS',
        status: 'Disponible',
        agencyOwned: true,
        // Sin purchasePaymentState ni pagos registrados
        purchasePaymentState: undefined
    });
    await carHistorical.save();

    const summary = getCarPurchasePaymentSummary(carHistorical);
    assert.equal(summary.status, 'conciliacion_pendiente');
    assert.equal(summary.pendingDebt, 0, 'No inventa deuda retroactiva para vehículos históricos');
    assert.equal(summary.isHistorical, true);
});

await test('3. Registrar pago parcial: valida fondos, descuenta de la cuenta y crea egreso', async () => {
    const initialBalance = testAccount.balance;
    const paymentAmount = 10000000; // 10M ARS

    const res = await call('POST', `/api/admin/cars/${carCaseInconsistency._id}/purchase-payment`, {
        accountId: testAccount._id.toString(),
        amount: paymentAmount,
        effectiveDate: new Date().toISOString(),
        paymentMethod: 'Transferencia',
        concept: 'Pago anticipo compra Amarok',
        receiptUrl: 'COMP-001',
        deductFromStrategicBox: true
    });

    assert.equal(res.status, 200, `Error: ${JSON.stringify(res.json)}`);
    assert.equal(res.json.ok, true);
    assert.equal(res.json.car.purchasePaymentState.amountPaid, 10000000);
    assert.equal(res.json.car.purchasePaymentState.pendingDebt, 10646000);
    assert.equal(res.json.car.purchasePaymentState.status, 'parcial');

    // Verificar descuento en la cuenta física
    const updatedAccount = await Account.findById(testAccount._id);
    assert.equal(updatedAccount.balance, initialBalance - paymentAmount, 'La cuenta bancaria debe descontar el importe una sola vez');

    // Verificar transacción de egreso creada
    const tx = await Transaction.findOne({ vehicleId: carCaseInconsistency._id, type: 'Egreso' });
    assert.ok(tx, 'Debe existir la transacción de egreso');
    assert.equal(tx.amount, paymentAmount);
    assert.equal(tx.category, 'compra_vehiculo');
    assert.equal(tx.accountId.toString(), testAccount._id.toString());
});

await test('4. Rechazar pago por fondos insuficientes en la cuenta física', async () => {
    const currentAccount = await Account.findById(testAccount._id);
    const excessiveAmount = currentAccount.balance + 5000000;

    const res = await call('POST', `/api/admin/cars/${carCaseInconsistency._id}/purchase-payment`, {
        accountId: testAccount._id.toString(),
        amount: excessiveAmount,
        paymentMethod: 'Transferencia',
        concept: 'Pago que supera fondos disponibles'
    });

    assert.equal(res.status, 400);
    assert.ok(res.json.message.includes('Fondos insuficientes'));

    // Asegurar que no se tocó el balance
    const checkAccount = await Account.findById(testAccount._id);
    assert.equal(checkAccount.balance, currentAccount.balance);
});

await test('5. Registrar pago restante hasta completar cancelación: status pasa a "pagado"', async () => {
    const remainingDebt = 10646000;
    const accountBefore = await Account.findById(testAccount._id);

    const res = await call('POST', `/api/admin/cars/${carCaseInconsistency._id}/purchase-payment`, {
        accountId: testAccount._id.toString(),
        amount: remainingDebt,
        paymentMethod: 'Transferencia',
        concept: 'Cancelación final saldo de compra'
    });

    assert.equal(res.status, 200, `Error: ${JSON.stringify(res.json)}`);
    assert.equal(res.json.car.purchasePaymentState.pendingDebt, 0);
    assert.equal(res.json.car.purchasePaymentState.status, 'pagado');
    assert.equal(res.json.car.purchasePaymentState.amountPaid, 20646000);

    const accountAfter = await Account.findById(testAccount._id);
    assert.equal(accountAfter.balance, accountBefore.balance - remainingDebt);
});

await test('6. Rechazar pagos adicionales cuando la unidad ya está pagada al 100%', async () => {
    const res = await call('POST', `/api/admin/cars/${carCaseInconsistency._id}/purchase-payment`, {
        accountId: testAccount._id.toString(),
        amount: 1000,
        paymentMethod: 'Efectivo'
    });

    assert.equal(res.status, 400);
    assert.ok(res.json.message.includes('totalmente pagada'));
});

await test('7. Vincular egreso existente sin volver a descontar fondos de la cuenta', async () => {
    // 1. Crear auto con deuda de compra de 5.000.000
    carForLinkExpense = new Car({
        brand: 'Ford',
        name: 'Ranger XLS',
        model: 'Ranger',
        year: 2021,
        km: 50000,
        condition: 'Usado',
        fuel: 'Diesel',
        plateOrVin: 'AD888CC',
        price: 22000000,
        currency: 'ARS',
        purchasePrice: 5000000,
        purchaseCurrency: 'ARS',
        status: 'Disponible',
        agencyOwned: true,
        purchasePaymentState: {
            totalCost: 5000000,
            amountPaid: 0,
            pendingDebt: 5000000,
            status: 'pendiente',
            payments: []
        }
    });
    await carForLinkExpense.save();

    // 2. Crear una transacción previa de Egreso (ya debitada con anterioridad)
    const existingExpense = new Transaction({
        type: 'Egreso',
        category: 'compra_vehiculo',
        amount: 5000000,
        currency: 'ARS',
        accountId: testAccount._id,
        date: new Date('2026-09-15'),
        concept: 'Pago de compra Ranger XLS según boleto',
        description: 'Pago histórico realizado en septiembre'
    });
    await existingExpense.save();

    const accountBalanceBeforeLink = (await Account.findById(testAccount._id)).balance;

    // 3. Vincular el egreso existente exigiendo motivo obligatorio
    const failResNoReason = await call('POST', `/api/admin/cars/${carForLinkExpense._id}/link-purchase-expense`, {
        transactionId: existingExpense._id.toString(),
        reason: '   '
    });
    assert.equal(failResNoReason.status, 400, 'Debe exigir motivo obligatorio');

    const linkRes = await call('POST', `/api/admin/cars/${carForLinkExpense._id}/link-purchase-expense`, {
        transactionId: existingExpense._id.toString(),
        reason: 'Conciliación de comprobante bancario de septiembre'
    });

    assert.equal(linkRes.status, 200, `Error: ${JSON.stringify(linkRes.json)}`);
    assert.equal(linkRes.json.ok, true);
    assert.equal(linkRes.json.car.purchasePaymentState.status, 'pagado');
    assert.equal(linkRes.json.car.purchasePaymentState.amountPaid, 5000000);
    assert.equal(linkRes.json.car.purchasePaymentState.pendingDebt, 0);

    // 4. Verificar que el saldo de la cuenta NO se modificó (sin doble descuento)
    const accountBalanceAfterLink = (await Account.findById(testAccount._id)).balance;
    assert.equal(accountBalanceAfterLink, accountBalanceBeforeLink, 'No debe descontar fondos nuevamente de la cuenta');

    // 5. Verificar que la transacción quedó vinculada
    const updatedTx = await Transaction.findById(existingExpense._id);
    assert.equal(updatedTx.vehicleId.toString(), carForLinkExpense._id.toString());
});

await test('8. Editar datos del compromiso: exige motivo obligatorio y registra auditoría', async () => {
    // Falla si no hay motivo
    const resNoReason = await call('PATCH', `/api/admin/cars/${carCaseInconsistency._id}/purchase-commitment`, {
        expectedDate: '2026-11-15',
        expectedFundsNote: 'Fondos de cobro de venta lote 3',
        commitNotes: 'Acordado con el titular',
        reason: ''
    });
    assert.equal(resNoReason.status, 400, 'Debe rechazar motivo vacío');

    // Exitoso con motivo
    const resSuccess = await call('PATCH', `/api/admin/cars/${carCaseInconsistency._id}/purchase-commitment`, {
        expectedDate: '2026-11-15',
        expectedFundsNote: 'Fondos de cobro de venta lote 3',
        commitNotes: 'Acordado con el titular',
        reason: 'Ajuste de fecha acordada de pago y origen de fondos'
    });

    assert.equal(resSuccess.status, 200, `Error: ${JSON.stringify(resSuccess.json)}`);
    assert.equal(resSuccess.json.ok, true);
    assert.equal(resSuccess.json.car.purchasePaymentState.expectedFundsNote, 'Fondos de cobro de venta lote 3');

    // Verificar log de auditoría
    const savedCar = await Car.findById(carCaseInconsistency._id);
    assert.ok(savedCar.purchasePaymentState.commitAuditLog.length > 0, 'Debe registrar en commitAuditLog');
    assert.equal(savedCar.purchasePaymentState.commitAuditLog[0].reason, 'Ajuste de fecha acordada de pago y origen de fondos');
});

await test('9. Editar costo del vehículo: actualiza metadatos sin crear transacciones automáticas', async () => {
    const txCountBefore = await Transaction.countDocuments();
    const accountBalanceBefore = (await Account.findById(testAccount._id)).balance;

    // Actualizamos precio de compra vía PATCH /api/admin/cars/:id con justificación obligatoria
    const editRes = await call('PATCH', `/api/admin/cars/${carHistorical._id}`, {
        purchasePrice: 13500000,
        purchasePriceChangeType: 'correccion_precio',
        purchasePriceJustification: 'Corrección de precio acordado con el proveedor según boleto'
    });
    assert.equal(editRes.status, 200, `Error: ${JSON.stringify(editRes.json)}`);

    const txCountAfter = await Transaction.countDocuments();
    const accountBalanceAfter = (await Account.findById(testAccount._id)).balance;

    assert.equal(txCountAfter, txCountBefore, 'No debe crear transacciones financieras automáticas');
    assert.equal(accountBalanceAfter, accountBalanceBefore, 'No debe modificar saldos de cuentas');
});

await test('10. Registrar pago con inversión a medias (50% LHIVER): cancela obligación propia y no deja saldo pendiente', async () => {
    // Fondos suficientes para la prueba
    await Account.findByIdAndUpdate(testAccount._id, { balance: 30000000 });

    // Vehículo con costo total $20.000.000
    const carShared = new Car({
        brand: 'Jeep',
        name: 'Compass Limited',
        model: 'Compass',
        year: 2023,
        km: 20000,
        condition: 'Usado',
        fuel: 'Nafta',
        plateOrVin: 'AF777XX',
        price: 25000000,
        currency: 'ARS',
        purchasePrice: 20000000,
        purchaseCurrency: 'ARS',
        status: 'Disponible',
        agencyOwned: true,
        purchasePaymentState: {
            totalCost: 20000000,
            amountPaid: 0,
            pendingDebt: 20000000,
            status: 'pendiente',
            payments: []
        }
    });
    await carShared.save();

    const initialAccountBalance = (await Account.findById(testAccount._id)).balance;
    const agencyShareAmount = 10000000; // 50% de 20M

    const res = await call('POST', `/api/admin/cars/${carShared._id}/purchase-payment`, {
        accountId: testAccount._id.toString(),
        amount: agencyShareAmount,
        paymentMethod: 'Transferencia bancaria',
        concept: 'Pago compra 50% Jeep Compass en conjunto',
        isSharedInvestment: true,
        partnerCompany: 'LHIVER',
        partnerPercentage: 50,
        payeeCompany: 'LHIVER'
    });

    assert.equal(res.status, 200, `Error: ${JSON.stringify(res.json)}`);
    assert.equal(res.json.ok, true);

    const updatedPaymentState = res.json.car.purchasePaymentState;
    assert.equal(updatedPaymentState.isSharedInvestment, true);
    assert.equal(updatedPaymentState.partnerCompany, 'LHIVER');
    assert.equal(updatedPaymentState.partnerPercentage, 50);
    assert.equal(updatedPaymentState.partnerContribution, 10000000);
    assert.equal(updatedPaymentState.agencyCost, 10000000);
    assert.equal(updatedPaymentState.amountPaid, 10000000);
    assert.equal(updatedPaymentState.pendingDebt, 0, 'No debe quedar saldo pendiente al saldar la cuota de la agencia');
    assert.equal(updatedPaymentState.status, 'pagado', 'El estado debe ser pagado');

    // Verificar descuento en la cuenta física
    const currentAccount = await Account.findById(testAccount._id);
    assert.equal(currentAccount.balance, initialAccountBalance - agencyShareAmount);

    // Verificar transacción creada con la empresa cargada vinculada
    const tx = await Transaction.findOne({ vehicleId: carShared._id, type: 'Egreso' });
    assert.ok(tx);
    assert.equal(tx.amount, agencyShareAmount);
    assert.equal(tx.payeeCompany, 'LHIVER');

    // Verificar que getCarPurchasePaymentSummary refleja no pendiente
    const summary = getCarPurchasePaymentSummary(res.json.car);
    assert.equal(summary.pendingDebt, 0);
    assert.equal(summary.status, 'pagado');
});

await test('11. Editar compromiso a inversión a medias con empresa (AUTOTERRA): liquida deuda pendiente si cuota fue abonada', async () => {
    // Vehículo con costo 30.000.000 y 15.000.000 ya abonados (quedaban 15M pendientes como auto propio)
    const carToAdjust = new Car({
        brand: 'Ford',
        name: 'Territory Titanium',
        model: 'Territory',
        year: 2022,
        km: 30000,
        condition: 'Usado',
        fuel: 'Nafta',
        plateOrVin: 'AF888YY',
        price: 35000000,
        currency: 'ARS',
        purchasePrice: 30000000,
        purchaseCurrency: 'ARS',
        status: 'Disponible',
        agencyOwned: true,
        purchasePaymentState: {
            totalCost: 30000000,
            amountPaid: 15000000,
            pendingDebt: 15000000,
            status: 'parcial',
            payments: [{
                date: new Date('2026-09-01'),
                amount: 15000000,
                currency: 'ARS',
                paymentMethod: 'Transferencia',
                user: 'Admin'
            }]
        }
    });
    await carToAdjust.save();

    // Modificamos el compromiso a inversión a medias con AUTOTERRA (50%)
    const patchRes = await call('PATCH', `/api/admin/cars/${carToAdjust._id}/purchase-commitment`, {
        isSharedInvestment: true,
        partnerCompany: 'AUTOTERRA',
        partnerPercentage: 50,
        reason: 'Corrección contable: adquisición a medias con AUTOTERRA, los 15M pagados cancelan la cuota de la agencia'
    });

    assert.equal(patchRes.status, 200, `Error: ${JSON.stringify(patchRes.json)}`);
    assert.equal(patchRes.json.ok, true);

    const state = patchRes.json.car.purchasePaymentState;
    assert.equal(state.isSharedInvestment, true);
    assert.equal(state.partnerCompany, 'AUTOTERRA');
    assert.equal(state.agencyCost, 15000000);
    assert.equal(state.partnerContribution, 15000000);
    assert.equal(state.amountPaid, 15000000);
    assert.equal(state.pendingDebt, 0, 'El saldo pendiente debe quedar en 0');
    assert.equal(state.status, 'pagado', 'El estado debe pasar a pagado');

    // Comprobar summary
    const summary = getCarPurchasePaymentSummary(patchRes.json.car);
    assert.equal(summary.pendingDebt, 0);
    assert.equal(summary.status, 'pagado');
});

await test('12. Endpoint GET /api/admin/companies lista empresas cargadas en el sistema', async () => {
    const res = await call('GET', '/api/admin/companies');
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    assert.ok(Array.isArray(res.json.companies));
    assert.ok(res.json.companies.includes('LHIVER'));
    assert.ok(res.json.companies.includes('AUTOTERRA'));
    assert.ok(res.json.companies.includes('AKAR'));
    assert.ok(res.json.companies.includes('ALWAYS SAS'));
});

await finish();
