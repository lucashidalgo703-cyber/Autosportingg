// Integration tests for Treasury Synchronization, Reinvestment Extra and Diagnostic Audit
import assert from 'node:assert/strict';
import { boot } from './harness.js';

const { call, test, finish, mongoose, token, ownerId } = await boot();
const { default: Account } = await import('../../src/models/Account.js');
const { default: Transaction } = await import('../../src/models/Transaction.js');
const { default: Sale } = await import('../../src/models/Sale.js');
const { default: Car } = await import('../../src/models/Car.js');
const { default: TreasuryBox } = await import('../../src/models/TreasuryBox.js');
const { default: TreasuryConfig } = await import('../../src/models/TreasuryConfig.js');
const { ensureDefaultBoxes } = await import('../../src/services/treasuryStrategicService.js');

let treasuryPinToken = null;
const tCall = (method, path, body) => call(
    method,
    path,
    body,
    token,
    treasuryPinToken ? { 'x-treasury-token': treasuryPinToken } : {}
);

const makeCar = async (overrides = {}) => {
    return await Car.create({
        brand: 'Ford',
        name: 'Ranger XLS',
        year: 2023,
        price: 28000000,
        currency: 'ARS',
        purchasePrice: 10000000,
        purchaseCurrency: 'ARS',
        condition: 'Usado',
        fuel: 'Diesel',
        km: 45000,
        status: 'Disponible',
        agencyOwned: true,
        expenses: [],
        ...overrides
    });
};

console.log('\n=== INICIANDO PRUEBAS DE INTEGRACIÓN: TESORERÍA, CONCILIACIÓN Y REINVERSIÓN ===\n');

let bankAccountARS;
let cashAccountUSD;

await test('0. Setup: Inicializar PIN, Cuentas y Cajas de Tesorería', async () => {
    // 0.1 Asegurar cajas por defecto
    await ensureDefaultBoxes();

    // 0.2 Configurar PIN inicial
    const pinRes = await call('POST', '/api/admin/tesoreria-estrategica/pin/setup', {
        pin: '4321',
        confirmPin: '4321'
    }, token);
    assert.equal(pinRes.status, 200);
    assert.equal(pinRes.json.ok, true);
    treasuryPinToken = pinRes.json.treasuryToken;
    assert.ok(treasuryPinToken, 'Token de sesión de Tesorería obtenido');

    // 0.3 Crear cuentas de prueba con saldos iniciales
    bankAccountARS = await Account.create({
        name: 'Banco Galicia ARS Central',
        type: 'Banco',
        currency: 'ARS',
        balance: 50000000, // 50M ARS
        isActive: true
    });

    cashAccountUSD = await Account.create({
        name: 'Caja Fuerte USD',
        type: 'Efectivo',
        currency: 'USD',
        balance: 20000, // 20k USD
        isActive: true
    });

    // 0.4 Configurar esquema de reparto por defecto y extra de reinversión 10%
    const cfgRes = await tCall('POST', '/api/admin/tesoreria-estrategica/config', {
        activeDistributionScheme: 'caja_solida',
        reinvestmentExtraPct: 10
    });
    assert.equal(cfgRes.status, 200);
    assert.equal(cfgRes.json.ok, true);
    assert.equal(cfgRes.json.config.reinvestmentExtraPct, 10);
});

await test('1. Diagnóstico de Tesorería (Solo Lectura) y Ecuación Central de Conciliación', async () => {
    const diagRes = await call('GET', '/api/admin/tesoreria-estrategica/diagnostic-audit', null, token);
    assert.equal(diagRes.status, 200);
    assert.equal(diagRes.json.ok, true);

    const { reconciliationEquation, isSystemBalanced, liquidityDetails } = diagRes.json;
    assert.ok(reconciliationEquation, 'Debe devolver la ecuación de conciliación');
    assert.ok(reconciliationEquation.ARS, 'Debe tener desglose ARS');
    assert.ok(reconciliationEquation.USD, 'Debe tener desglose USD');

    // Comprobar regla: Liquidez real = total cajas + unallocated
    const eqARS = reconciliationEquation.ARS;
    assert.equal(eqARS.difference, 0, 'La diferencia en ARS debe ser exactamente 0');
    assert.equal(eqARS.totalCuentas, eqARS.totalCajas + eqARS.unallocated);

    const eqUSD = reconciliationEquation.USD;
    assert.equal(eqUSD.difference, 0, 'La diferencia en USD debe ser exactamente 0');
    assert.equal(eqUSD.totalCuentas, eqUSD.totalCajas + eqUSD.unallocated);

    assert.equal(isSystemBalanced, true, 'El sistema debe estar balanceado');
    assert.ok(Array.isArray(liquidityDetails.accounts.list), 'Debe listar cuentas');
    assert.ok(Array.isArray(liquidityDetails.boxes.list), 'Debe listar cajas');
});

await test('2. Boxes Summary: Endpoint para selección de fondos en pago de compra', async () => {
    const boxRes = await call('GET', '/api/admin/treasury/boxes-summary', null, token);
    assert.equal(boxRes.status, 200);
    assert.equal(boxRes.json.ok, true);
    assert.ok(Array.isArray(boxRes.json.boxes));
    assert.ok(typeof boxRes.json.unallocatedARS === 'number');
    assert.ok(typeof boxRes.json.unallocatedUSD === 'number');

    const stockBox = boxRes.json.boxes.find(b => b.key === 'stock');
    assert.ok(stockBox, 'Debe incluir la caja de Stock / Reposición');
});

await test('3. Pago de compra descontando de la Caja Stock / Reposición', async () => {
    // 3.1 Asignar fondos previos a la caja de stock para probar descuento de caja
    const stockBox = await TreasuryBox.findOne({ key: 'stock' });
    assert.ok(stockBox, 'Debe existir la caja de stock');
    stockBox.balanceARS = 15000000; // 15M ARS
    await stockBox.save();

    const otherBox = await TreasuryBox.findOne({ key: 'operativa' });
    assert.ok(otherBox, 'Debe existir la caja operativa');
    otherBox.balanceARS = 5000000;
    await otherBox.save();

    const initialAccountBalance = bankAccountARS.balance; // 50M

    // 3.2 Crear auto con costo 10M ARS impago
    const car1 = await makeCar({
        price: 28000000,
        purchasePrice: 10000000,
        purchasePaymentState: {
            totalCost: 10000000,
            amountPaid: 0,
            pendingDebt: 10000000,
            status: 'pendiente',
            payments: []
        }
    });

    // 3.3 Registrar pago de compra de 6M ARS desde bankAccountARS usando la caja stock
    const payRes = await call('POST', `/api/admin/cars/${car1._id}/purchase-payment`, {
        amount: 6000000,
        currency: 'ARS',
        accountId: bankAccountARS._id.toString(),
        strategicBoxKey: 'stock',
        paymentMethod: 'Transferencia bancaria',
        concept: 'Pago parcial a proveedor unidad Ranger',
        notes: 'Pago desde caja stock'
    }, token);

    assert.equal(payRes.status, 200);
    assert.equal(payRes.json.ok, true);

    // 3.4 Verificar saldo de cuenta bancaria: se descontó exactamente una vez
    const updatedAcc = await Account.findById(bankAccountARS._id);
    assert.equal(updatedAcc.balance, initialAccountBalance - 6000000);

    // 3.5 Verificar saldo de caja stock: se descontó 6M
    const updatedStockBox = await TreasuryBox.findOne({ key: 'stock' });
    assert.equal(updatedStockBox.balanceARS, 15000000 - 6000000);

    // 3.6 Verificar que la otra caja no se modificó
    const updatedOtherBox = await TreasuryBox.findOne({ key: 'operativa' });
    assert.equal(updatedOtherBox.balanceARS, 5000000);

    // 3.7 Verificar estado de pago en el auto
    const updatedCar = await Car.findById(car1._id);
    assert.equal(updatedCar.purchasePaymentState.amountPaid, 6000000);
    assert.equal(updatedCar.purchasePaymentState.pendingDebt, 4000000);
    assert.equal(updatedCar.purchasePaymentState.status, 'parcial');
    assert.equal(updatedCar.purchasePaymentState.payments.length, 1);
    assert.equal(updatedCar.purchasePaymentState.payments[0].strategicBoxKey, 'stock');

    // 3.8 Verificar auditoría y balances devueltos con saldos anteriores y posteriores
    assert.ok(updatedCar.auditLog.length >= 1, 'Debe registrar la auditoría en el auto');
    assert.equal(payRes.json.balances.account.previousBalance, initialAccountBalance);
    assert.equal(payRes.json.balances.account.resultingBalance, initialAccountBalance - 6000000);
    assert.equal(payRes.json.balances.strategicFund.previousBalance, 15000000);
    assert.equal(payRes.json.balances.strategicFund.resultingBalance, 9000000);
});

await test('4. Pago de compra descontando de Dinero Sin Asignar (unallocated)', async () => {
    // 4.1 Crear auto 2 con costo 3M ARS
    const car2 = await makeCar({
        name: 'Cruze LTZ',
        price: 18000000,
        purchasePrice: 3000000,
        purchasePaymentState: {
            totalCost: 3000000,
            amountPaid: 0,
            pendingDebt: 3000000,
            status: 'pendiente',
            payments: []
        }
    });

    const stockBefore = (await TreasuryBox.findOne({ key: 'stock' })).balanceARS;
    const accBefore = (await Account.findById(bankAccountARS._id)).balance;

    // 4.2 Pagar 3M especificando 'unallocated'
    const payRes = await call('POST', `/api/admin/cars/${car2._id}/purchase-payment`, {
        amount: 3000000,
        currency: 'ARS',
        accountId: bankAccountARS._id.toString(),
        strategicBoxKey: 'unallocated',
        paymentMethod: 'Transferencia bancaria',
        concept: 'Cancelación total compra Cruze'
    }, token);

    assert.equal(payRes.status, 200);
    assert.equal(payRes.json.ok, true);

    // 4.3 Cuenta se descuenta
    const accAfter = (await Account.findById(bankAccountARS._id)).balance;
    assert.equal(accAfter, accBefore - 3000000);

    // 4.4 Cajas estratégicas NO se modificaron
    const stockAfter = (await TreasuryBox.findOne({ key: 'stock' })).balanceARS;
    assert.equal(stockAfter, stockBefore, 'La caja de stock no debe tocarse cuando se descuenta de fondos sin asignar');

    // 4.5 Auto queda pagado en su totalidad
    const updatedCar2 = await Car.findById(car2._id);
    assert.equal(updatedCar2.purchasePaymentState.pendingDebt, 0);
    assert.equal(updatedCar2.purchasePaymentState.status, 'pagado');
});

await test('5. Cobro de Venta: Recupero de capital propio y Extra de Reinversión (10% sobre costo propio)', async () => {
    // 5.1 Crear auto co-invertido: costo 10M, 50% agencia y 50% socio
    const partnerCar = await makeCar({
        name: 'Toyota Hilux SRV',
        price: 25000000,
        purchasePrice: 10000000,
        investor: {
            name: 'Inversor Juan Perez',
            percentage: 50
        }
    });

    // 5.2 Crear venta por 20.000.000 ARS en efectivo total
    const saleDoc = await Sale.create({
        vehicleId: partnerCar._id,
        vehicleName: 'Toyota Hilux SRV',
        clientName: 'Cliente Martin Gomez',
        salePrice: 20000000,
        saleCurrency: 'ARS',
        paymentType: 'contado',
        status: 'confirmada',
        saleDate: new Date()
    });

    // 5.3 Preview de distribución:
    // Base de costo de compra propio = 50% de 10.000.000 = 5.000.000 ARS.
    // Extra de reinversión objetivo (10% de 5.000.000) = 500.000 ARS.
    const previewRes = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/preview-distribution', {
        saleId: saleDoc._id.toString(),
        amount: 20000000,
        currency: 'ARS',
        schemeKey: 'caja_solida'
    });

    assert.equal(previewRes.status, 200);
    assert.equal(previewRes.json.ok, true);

    const proposal = previewRes.json.proposal;
    const saleState = previewRes.json.saleState;

    assert.equal(saleState.ownPurchaseCost, 5000000, 'El costo de compra propio de la agencia debe ser 5.000.000 (50% de 10M)');
    assert.equal(proposal.capitalRecoveredToStock, 5000000, 'Debe recuperar el capital propio a Stock');
    assert.equal(proposal.extraReinvestmentTarget, 500000, 'El extra de reinversión objetivo debe ser el 10% del costo propio = 500.000');
    assert.equal(proposal.extraReinvestmentToStock, 500000, 'Debe asignar 500.000 de extra a Stock');

    // 5.4 Ejecutar cobro y distribución efectiva
    const stockBeforeCollect = (await TreasuryBox.findOne({ key: 'stock' })).balanceARS;

    const collectRes = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        idempotencyKey: `col_test_${Date.now()}`,
        saleId: saleDoc._id.toString(),
        concept: 'entrega_inicial',
        amount: 20000000,
        currency: 'ARS',
        accountId: bankAccountARS._id.toString(),
        schemeKey: 'caja_solida'
    });

    assert.equal(collectRes.status, 200);
    assert.equal(collectRes.json.ok, true);

    // 5.5 Comprobar que la caja de stock recibió: 5.000.000 (capital propio) + 500.000 (extra reinversión) = 5.500.000
    const stockAfterCollect = (await TreasuryBox.findOne({ key: 'stock' })).balanceARS;
    assert.equal(stockAfterCollect - stockBeforeCollect, 5500000, 'La caja stock debe recibir capital recuperado + extra reinversión');
});

await test('6. Ventas en Cuotas: El extra de reinversión no se repite una vez cubierto el objetivo', async () => {
    // 6.1 Crear auto 100% de la agencia: costo 4.000.000. Objetivo extra 10% = 400.000 ARS.
    const carInst = await makeCar({
        name: 'Peugeot 208 Allure',
        price: 12000000,
        purchasePrice: 4000000
    });

    const saleInst = await Sale.create({
        vehicleId: carInst._id,
        vehicleName: 'Peugeot 208 Allure',
        clientName: 'Cliente Financiado',
        salePrice: 12000000,
        saleCurrency: 'ARS',
        paymentType: 'financiado',
        status: 'confirmada',
        saleDate: new Date()
    });

    // 6.2 Cobro Cuota 1: 5.000.000 ARS.
    // Cubre capital propio (4.000.000) y extra de reinversión (400.000). Margen restante = 600.000.
    const res1 = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        idempotencyKey: `col_inst1_${Date.now()}`,
        saleId: saleInst._id.toString(),
        concept: 'cuota',
        amount: 5000000,
        currency: 'ARS',
        accountId: bankAccountARS._id.toString(),
        schemeKey: 'caja_solida'
    });
    assert.equal(res1.status, 200);
    assert.equal(res1.json.summary.capitalRecovered, 4000000);
    assert.equal(res1.json.summary.extraReinvestmentToStock, 400000);

    // 6.3 Cobro Cuota 2: 3.000.000 ARS.
    // Como el capital propio ya fue recuperado (0 pendiente) y el extra ya fue cubierto (400.000/400.000),
    // el extra de reinversión reservado en la Cuota 2 debe ser 0.
    const res2 = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        idempotencyKey: `col_inst2_${Date.now()}`,
        saleId: saleInst._id.toString(),
        concept: 'cuota',
        amount: 3000000,
        currency: 'ARS',
        accountId: bankAccountARS._id.toString(),
        schemeKey: 'caja_solida'
    });
    assert.equal(res2.status, 200);
    assert.equal(res2.json.summary.capitalRecovered, 0, 'No debe recuperar capital dos veces');
    assert.equal(res2.json.summary.extraReinvestmentToStock, 0, 'No debe repetir el extra de reinversión una vez alcanzado el objetivo acumulado');
});

await finish();
