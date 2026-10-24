import test from 'node:test';
import assert from 'node:assert/strict';
import { projectCapitalReinvestment } from '../src/services/capitalReinvestmentEngine.js';
import { capitalReinvestmentDemoSnapshot } from '../src/services/capitalReinvestmentDemoFixtures.js';

const fixture = () => structuredClone(capitalReinvestmentDemoSnapshot);
const operation = (snapshot = fixture()) => snapshot.operations[0];
const operationResult = (snapshot) => projectCapitalReinvestment(snapshot).operations[0];
const addSaleIncome = (snapshot, changes = {}) => {
    const tx = {
        _id: 'tx-additional-collection',
        type: 'Ingreso',
        status: 'activo',
        amount: 2000000,
        currency: 'ARS',
        source: 'venta',
        saleId: 'sale-corolla',
        vehicleId: 'vehicle-corolla',
        isTreasuryDistributed: false,
        isTreasuryDistributionReversed: false,
        ...changes
    };
    operation(snapshot).saleTransactions.push(tx);
    snapshot.transactions.push(tx);
    return tx;
};

test('venta al contado reutiliza recuperación existente y separa distribuido, reinvertido y disponible', () => {
    const snapshot = fixture();
    const result = projectCapitalReinvestment(snapshot);
    const ars = result.currencies.ARS;
    assert.equal(ars.capitalTarget, 12700000);
    assert.equal(ars.capitalRecovered, 12700000);
    assert.equal(ars.capitalAllocatedToStock, 12700000);
    assert.equal(ars.reinvested, 5400000);
    assert.equal(result.liquidity.ARS.availableForPurchase, 8000000);
    assert.equal(result.liquidity.ARS.accountCash, 18000000);
    assert.equal(result.liquidity.ARS.assignedToBoxes + result.liquidity.ARS.ownUnassigned + result.liquidity.ARS.thirdPartyFunds, result.liquidity.ARS.accountCash);
});

test('venta financiada solo computa la entrega inicial confirmada; cuotas futuras no son efectivo', () => {
    const snapshot = fixture();
    const op = operation(snapshot);
    op.sale.financingDetails = { hasFinancing: true, downPayment: 2000000, installmentsCount: 6, financedBalance: 13500000 };
    op.saleTransactions = [];
    addSaleIncome(snapshot, { amount: 2000000, isTreasuryDistributed: false });
    op.installments = [{ amount: 2250000, status: 'pendiente', dueDate: '2026-11-01' }];
    const result = operationResult(snapshot);
    assert.equal(result.capitalRecovered, 2000000);
    assert.equal(result.confirmedOwnCollections, 2000000);
    assert.equal(result.capitalPending, 10700000);
});

test('cobro parcial queda diferenciado de la asignación a Stock', () => {
    const snapshot = fixture();
    operation(snapshot).saleTransactions = [];
    const tx = addSaleIncome(snapshot, { amount: 3000000, isTreasuryDistributed: false });
    tx.treasuryBreakdown = {};
    const result = operationResult(snapshot);
    assert.equal(result.capitalRecovered, 3000000);
    assert.equal(result.capitalAllocatedToStock, 0);
    assert.equal(result.recoveredPendingAssignment, 3000000);
    assert.equal(result.capitalPending, 9700000);
});

test('seña aplicada sin transacción no se presenta como cobro confirmado', () => {
    const snapshot = fixture();
    operation(snapshot).sale.depositAppliedAmount = 500000;
    operation(snapshot).sale.depositAppliedCurrency = 'ARS';
    operation(snapshot).saleTransactions = [];
    const result = operationResult(snapshot);
    assert.equal(result.confirmedOwnCollections, null);
    assert.equal(result.capitalRecovered, null);
    assert.equal(result.status, 'pendiente_conciliacion');
    assert.ok(result.warnings.some((warning) => warning.code === 'deposit_without_confirmed_transaction'));
});

test('compra parcialmente pagada muestra desembolso y deuda, pero no inventa objetivo exacto', () => {
    const snapshot = fixture();
    const vehicle = operation(snapshot).vehicle;
    const tx = snapshot.transactions.find((item) => item._id === 'tx-corolla-purchase');
    tx.amount = 4000000;
    vehicle.purchasePaymentState.amountPaid = 4000000;
    vehicle.purchasePaymentState.pendingDebt = 8700000;
    vehicle.purchasePaymentState.status = 'parcial';
    vehicle.purchasePaymentState.payments = [{ transactionId: tx._id, amount: 4000000, currency: 'ARS' }];
    const result = operationResult(snapshot);
    assert.equal(result.ownCapitalDisbursed, 4000000);
    assert.equal(result.acquisitionDebt, 8700000);
    assert.equal(result.capitalTarget, null);
    assert.equal(result.capitalPending, null);
    assert.equal(result.status, 'pendiente_conciliacion');
});

test('gasto directo sin estado de pago no se incluye como desembolso confirmado', () => {
    const snapshot = fixture();
    operation(snapshot).vehicle.expenses = [{ _id: 'expense-unknown', concept: 'Preparación', amount: 450000, currency: 'ARS' }];
    const result = operationResult(snapshot);
    assert.equal(result.ownCapitalDisbursed, null);
    assert.equal(result.capitalTarget, null);
    assert.ok(result.warnings.some((warning) => warning.code === 'expense_payment_unverified'));
});

test('gasto directo pagado solo cuenta con estado y egreso activo coincidente', () => {
    const snapshot = fixture();
    const expenseTx = {
        _id: 'tx-preparation',
        type: 'Egreso',
        status: 'activo',
        amount: 250000,
        currency: 'ARS',
        vehicleId: 'vehicle-corolla'
    };
    operation(snapshot).vehicle.expenses = [{
        _id: 'expense-preparation',
        concept: 'Preparación',
        amount: 250000,
        currency: 'ARS',
        status: 'pagado',
        transactionId: expenseTx._id
    }];
    snapshot.transactions.push(expenseTx);
    const result = operationResult(snapshot);
    assert.equal(result.ownCapitalDisbursed, 12950000);
    assert.equal(result.capitalTarget, 12950000);
    assert.equal(result.status, 'conciliado');
});

test('permuta reduce el efectivo esperado, pero el vehículo recibido no se suma a efectivo', () => {
    const snapshot = fixture();
    const op = operation(snapshot);
    op.vehicle.purchasePrice = 5000000;
    op.vehicle.purchasePaymentState = { status: 'no_aplica', totalCost: 5000000, amountPaid: 0, pendingDebt: 0, currency: 'ARS', payments: [] };
    op.vehicle.tradeInOrigin = { saleId: 'origin-sale-1', value: 5000000, currency: 'ARS', source: 'sale_flow' };
    op.sale.salePrice = 20000000;
    op.sale.tradeInTotalAmount = 5000000;
    op.saleTransactions = [];
    addSaleIncome(snapshot, { amount: 15000000, isTreasuryDistributed: false });
    const result = operationResult(snapshot);
    assert.equal(result.confirmedOwnCollections, 15000000);
    assert.equal(result.recoveryState.expectedCashTotal, 15000000);
    assert.equal(result.ownCapitalDisbursed, 0);
});

test('socio inversor se excluye de capital propio y de cobro propio', () => {
    const snapshot = fixture();
    const op = operation(snapshot);
    op.vehicle.purchasePrice = 10000000;
    op.vehicle.investor = { name: 'Socio Demo', percentage: 30 };
    const purchaseTx = snapshot.transactions.find((tx) => tx._id === 'tx-corolla-purchase');
    purchaseTx.amount = 7000000;
    op.vehicle.purchasePaymentState = {
        status: 'pagado', totalCost: 10000000, amountPaid: 7000000, pendingDebt: 0, agencyCost: 7000000,
        partnerContribution: 3000000, isSharedInvestment: true, currency: 'ARS',
        payments: [{ transactionId: purchaseTx._id, amount: 7000000, currency: 'ARS' }]
    };
    op.saleTransactions = [];
    addSaleIncome(snapshot, { amount: 10000000, thirdPartyAmount: 3000000, isTreasuryDistributed: false });
    const result = operationResult(snapshot);
    assert.equal(result.ownCapitalDisbursed, 7000000);
    assert.equal(result.confirmedOwnCollections, 7000000);
    assert.equal(result.capitalTarget, 7000000);
});

test('capital de terceros explícito no se incorpora al propio', () => {
    const snapshot = fixture();
    const op = operation(snapshot);
    op.vehicle.investor = { name: 'Socio Demo', percentage: 40 };
    op.saleTransactions = [];
    addSaleIncome(snapshot, { amount: 1000000, thirdPartyAmount: 400000, isTreasuryDistributed: false });
    assert.equal(operationResult(snapshot).confirmedOwnCollections, 600000);
});

test('reinversión parcial cuenta solo el egreso activo debitado de Stock', () => {
    const snapshot = fixture();
    const vehicle = snapshot.vehicles.find((item) => item._id === 'vehicle-kicks');
    const tx = snapshot.transactions.find((item) => item._id === 'tx-kicks-reinvestment');
    tx.amount = 2700000;
    vehicle.purchasePaymentState.amountPaid = 2700000;
    vehicle.purchasePaymentState.pendingDebt = 2700000;
    vehicle.purchasePaymentState.payments[0].amount = 2700000;
    const result = projectCapitalReinvestment(snapshot);
    assert.equal(result.currencies.ARS.reinvested, 2700000);
});

test('reinversión total cuenta el movimiento una sola vez aunque haya dos referencias', () => {
    const snapshot = fixture();
    const duplicateVehicle = structuredClone(snapshot.vehicles[0]);
    duplicateVehicle._id = 'vehicle-kicks-duplicate';
    duplicateVehicle.purchasePaymentState.payments[0].transactionId = 'tx-kicks-reinvestment';
    snapshot.vehicles.push(duplicateVehicle);
    const result = projectCapitalReinvestment(snapshot);
    assert.equal(result.currencies.ARS.reinvested, 5400000);
    assert.ok(result.warnings.some((warning) => warning.code === 'duplicate_reinvestment_transaction'));
});

test('reversión de cobro retira el capital recuperado asignado', () => {
    const snapshot = fixture();
    const tx = operation(snapshot).saleTransactions[0];
    tx.status = 'anulado';
    tx.isTreasuryDistributed = false;
    const result = operationResult(snapshot);
    assert.equal(result.capitalRecovered, 0);
    assert.equal(result.capitalAllocatedToStock, 0);
    assert.equal(result.capitalPending, 12700000);
});

test('reversión de gasto sin asiento inverso bloquea la disponibilidad exacta', () => {
    const snapshot = fixture();
    snapshot.treasury.expenseTransactions = [{ _id: 'expense-1', type: 'Egreso', status: 'anulado' }];
    snapshot.treasury.boxes[0].history = [{ type: 'egreso_finanzas', sourceExpenseId: 'expense-1', amount: -200000 }];
    const result = projectCapitalReinvestment(snapshot);
    assert.equal(result.liquidity.ARS.status, 'pendiente_conciliacion');
    assert.equal(result.liquidity.ARS.availableForPurchase, null);
    assert.deepEqual(result.unresolvedExpenseReversalIds, ['expense-1']);
});

test('diferencia entre cuentas y cajas no genera disponibilidad aparentemente exacta', () => {
    const snapshot = fixture();
    snapshot.treasury.accountBalances.ARS += 1000;
    const result = projectCapitalReinvestment(snapshot);
    assert.equal(result.liquidity.ARS.equationBalanced, false);
    assert.equal(result.liquidity.ARS.availableForPurchase, null);
    assert.equal(result.liquidity.ARS.status, 'pendiente_conciliacion');
});

test('capital asignado a Stock requiere coincidencia con el historial auditable de cajas', () => {
    const snapshot = fixture();
    snapshot.treasury.boxes.find((box) => box.key === 'stock').history = [];
    const result = projectCapitalReinvestment(snapshot);
    assert.equal(result.operations[0].status, 'pendiente_conciliacion');
    assert.equal(result.operations[0].capitalAllocatedToStock, null);
    assert.ok(result.warnings.some((warning) => warning.code === 'capital_allocation_history_mismatch'));
});

test('compromisos y fondos protegidos se muestran sin volver a sumarlos al efectivo', () => {
    const result = projectCapitalReinvestment(fixture());
    assert.equal(result.liquidity.ARS.accountCash, 18000000);
    assert.equal(result.liquidity.ARS.assignedToBoxes, 14000000);
    assert.equal(result.liquidity.ARS.commitments, 1750000);
    assert.equal(result.liquidity.ARS.protectedFunds, 2750000);
    assert.equal(result.liquidity.ARS.availableForPurchase, 8000000);
});

test('ARS y USD se mantienen separados, sin conversión implícita', () => {
    const result = projectCapitalReinvestment(fixture());
    assert.equal(result.currencies.ARS.capitalRecovered, 12700000);
    assert.equal(result.currencies.USD.capitalRecovered, 0);
    assert.equal(result.liquidity.ARS.availableForPurchase, 8000000);
    assert.equal(result.liquidity.USD.availableForPurchase, 10500);
});

test('operación incompleta no publica cifras de capital como conciliadas', () => {
    const snapshot = fixture();
    delete operation(snapshot).vehicle.purchasePaymentState;
    const result = operationResult(snapshot);
    assert.equal(result.status, 'pendiente_conciliacion');
    assert.equal(result.ownCapitalDisbursed, null);
    assert.equal(result.capitalTarget, null);
    assert.equal(result.realizedMargin, null);
});

test('falta de cotización para pagos cruzados deja la operación pendiente', () => {
    const snapshot = fixture();
    const op = operation(snapshot);
    op.sale.saleCurrency = 'USD';
    op.sale.exchangeRate = null;
    const purchaseTx = snapshot.transactions.find((tx) => tx._id === 'tx-corolla-purchase');
    purchaseTx.currency = 'ARS';
    op.vehicle.purchasePaymentState.currency = 'ARS';
    op.vehicle.purchasePaymentState.payments[0].currency = 'ARS';
    const result = operationResult(snapshot);
    assert.equal(result.status, 'pendiente_conciliacion');
    assert.equal(result.capitalTarget, null);
    assert.ok(result.warnings.some((warning) => warning.code === 'purchase_payment_fx_missing'));
});

test('vista previa de distribución reutiliza la cascada configurada y no muta el snapshot', () => {
    const snapshot = fixture();
    const tx = addSaleIncome(snapshot, { amount: 1000000, isTreasuryDistributed: false });
    tx.treasuryBreakdown = {};
    const before = JSON.stringify(snapshot);
    const result = operationResult(snapshot);
    assert.ok(result.distributionRecommendation);
    assert.equal(result.distributionRecommendation.currency, 'ARS');
    assert.equal(JSON.stringify(snapshot), before);
});
