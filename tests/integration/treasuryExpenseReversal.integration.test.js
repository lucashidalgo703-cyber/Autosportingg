// Ejercita reversiones de gastos únicamente con MongoDB en memoria y fixtures ficticios.
import assert from 'node:assert/strict';
import { boot } from './harness.js';

const { test, finish } = await boot();
const { default: Account } = await import('../../src/models/Account.js');
const { default: Transaction } = await import('../../src/models/Transaction.js');
const { default: TreasuryBox } = await import('../../src/models/TreasuryBox.js');
const { ensureDefaultBoxes, syncExpenseWithTreasury } = await import('../../src/services/treasuryStrategicService.js');
const { getCapitalReinvestmentProjection } = await import('../../src/services/capitalReinvestmentReadAdapter.js');

await ensureDefaultBoxes();
const account = await Account.create({ name: 'Cuenta ficticia de pruebas', type: 'Banco', currency: 'ARS', balance: 0, isActive: true });
const user = 'Test ficticio';

async function makeDebitedExpense({ amount = 200000, currency = 'ARS', boxKey = 'operativa', balance = 300000, status = 'anulado' } = {}) {
    const expense = await Transaction.create({
        type: 'Egreso', category: 'Alquiler', amount, currency, description: 'Fixture de reversión',
        accountId: account._id, status, module: 'crm_v2', treasuryBoxKey: boxKey, isTreasuryExpenseSynced: true
    });
    const box = await TreasuryBox.findOne({ key: boxKey });
    box[currency === 'USD' ? 'balanceUSD' : 'balanceARS'] = balance;
    box.history.push({
        date: new Date('2026-10-01T12:00:00.000Z'), type: 'egreso_finanzas', amount: -amount,
        currency, reason: `Débito ficticio ${expense._id}`, user, sourceExpenseId: expense._id
    });
    await box.save();
    return expense;
}

const reversalCount = (box, expenseId) => box.history.filter((entry) =>
    entry.type === 'reversion_egreso' && String(entry.sourceExpenseId) === String(expenseId)
).length;

await test('Anulación restituye una sola vez y conserva referencia de origen', async () => {
    const expense = await makeDebitedExpense();
    await syncExpenseWithTreasury(expense, { statusChanged: true, oldStatus: 'activo', user });
    let box = await TreasuryBox.findOne({ key: 'operativa' }).lean();
    assert.equal(box.balanceARS, 500000);
    assert.equal(reversalCount(box, expense._id), 1);
    const movement = box.history.find((entry) => entry.type === 'reversion_egreso' && String(entry.sourceExpenseId) === String(expense._id));
    assert.equal(movement.amount, 200000);
    assert.equal(movement.currency, 'ARS');

    await syncExpenseWithTreasury(expense, { statusChanged: true, oldStatus: 'activo', user });
    box = await TreasuryBox.findOne({ key: 'operativa' }).lean();
    assert.equal(box.balanceARS, 500000, 'El reintento no debe volver a acreditar');
    assert.equal(reversalCount(box, expense._id), 1);
    assert.equal((await Transaction.findById(expense._id)).isTreasuryExpenseSynced, false);
});

await test('Dos anulaciones concurrentes producen un único crédito', async () => {
    const expense = await makeDebitedExpense({ amount: 12500, balance: 87500 });
    await Promise.all([
        syncExpenseWithTreasury(expense, { statusChanged: true, oldStatus: 'activo', user }),
        syncExpenseWithTreasury(expense, { statusChanged: true, oldStatus: 'activo', user })
    ]);
    const box = await TreasuryBox.findOne({ key: 'operativa' }).lean();
    assert.equal(box.balanceARS, 100000);
    assert.equal(reversalCount(box, expense._id), 1);
});

await test('Fallo al guardar la marca del gasto tras acreditar permite reintento sin duplicación', async () => {
    const expense = await makeDebitedExpense({ amount: 40000, balance: 60000 });
    const originalUpdateOne = Transaction.updateOne.bind(Transaction);
    Transaction.updateOne = async () => { throw new Error('Fallo intermedio simulado al actualizar la marca'); };
    try {
        await assert.rejects(
            syncExpenseWithTreasury(expense, { statusChanged: true, oldStatus: 'activo', user }),
            /Fallo intermedio simulado/
        );
    } finally {
        Transaction.updateOne = originalUpdateOne;
    }
    let box = await TreasuryBox.findOne({ key: 'operativa' }).lean();
    assert.equal(box.balanceARS, 100000, 'Caja e historial se confirman juntos antes de actualizar la marca');
    assert.equal(reversalCount(box, expense._id), 1);

    const retry = await Transaction.findById(expense._id);
    await syncExpenseWithTreasury(retry, { statusChanged: true, oldStatus: 'activo', user });
    box = await TreasuryBox.findOne({ key: 'operativa' }).lean();
    assert.equal(box.balanceARS, 100000);
    assert.equal(reversalCount(box, expense._id), 1);
    assert.equal((await Transaction.findById(expense._id)).isTreasuryExpenseSynced, false);
});

await test('Fallo del update no registra movimiento y el reintento completa la restitución', async () => {
    const expense = await makeDebitedExpense({ amount: 15000, balance: 85000 });
    const originalUpdateOne = TreasuryBox.updateOne.bind(TreasuryBox);
    let failOnce = true;
    TreasuryBox.updateOne = async (...args) => {
        if (failOnce) { failOnce = false; throw new Error('Fallo de caja simulado'); }
        return originalUpdateOne(...args);
    };
    try {
        await assert.rejects(syncExpenseWithTreasury(expense, { statusChanged: true, oldStatus: 'activo', user }), /Fallo de caja simulado/);
        let box = await TreasuryBox.findOne({ key: 'operativa' }).lean();
        assert.equal(box.balanceARS, 85000);
        assert.equal(reversalCount(box, expense._id), 0);

        await syncExpenseWithTreasury(expense, { statusChanged: true, oldStatus: 'activo', user });
        box = await TreasuryBox.findOne({ key: 'operativa' }).lean();
        assert.equal(box.balanceARS, 100000);
        assert.equal(reversalCount(box, expense._id), 1);
    } finally {
        TreasuryBox.updateOne = originalUpdateOne;
    }
});

await test('ARS y USD se acreditan en la caja y campo monetario correspondientes', async () => {
    const arsExpense = await makeDebitedExpense({ amount: 25000, currency: 'ARS', boxKey: 'impuestos', balance: 75000 });
    const usdExpense = await makeDebitedExpense({ amount: 125, currency: 'USD', boxKey: 'stock', balance: 375, status: 'anulado' });
    await syncExpenseWithTreasury(arsExpense, { statusChanged: true, oldStatus: 'activo', user });
    await syncExpenseWithTreasury(usdExpense, { statusChanged: true, oldStatus: 'activo', user });

    const taxBox = await TreasuryBox.findOne({ key: 'impuestos' }).lean();
    const stockBox = await TreasuryBox.findOne({ key: 'stock' }).lean();
    assert.equal(taxBox.balanceARS, 100000);
    assert.equal(taxBox.balanceUSD, 0);
    assert.equal(stockBox.balanceUSD, 500);
    assert.equal(stockBox.balanceARS, 0);
    assert.equal(reversalCount(taxBox, arsExpense._id), 1);
    assert.equal(reversalCount(stockBox, usdExpense._id), 1);
});

await test('La restitución conserva precisión monetaria de centavos', async () => {
    const expense = await makeDebitedExpense({ amount: 0.1, currency: 'ARS', boxKey: 'crecimiento', balance: 0.2 });
    await syncExpenseWithTreasury(expense, { statusChanged: true, oldStatus: 'activo', user });
    const box = await TreasuryBox.findOne({ key: 'crecimiento' }).lean();
    assert.equal(box.balanceARS, 0.3);
    assert.equal(reversalCount(box, expense._id), 1);
});

await test('Volver a pendiente restituye saldo y restablece el compromiso pendiente', async () => {
    const expense = await makeDebitedExpense({ amount: 30000, balance: 70000, status: 'pendiente' });
    const boxBefore = await TreasuryBox.findOne({ key: 'operativa' });
    boxBefore.pendingCommitmentsARS = 0;
    await boxBefore.save();
    await syncExpenseWithTreasury(expense, { statusChanged: true, oldStatus: 'activo', user });
    const boxAfter = await TreasuryBox.findOne({ key: 'operativa' }).lean();
    assert.equal(boxAfter.balanceARS, 100000);
    assert.equal(boxAfter.pendingCommitmentsARS, 30000);
    assert.equal(reversalCount(boxAfter, expense._id), 1);
});

await test('Sin débito original no acredita dinero ni inventa una restitución', async () => {
    const expense = await Transaction.create({
        type: 'Egreso', category: 'Alquiler', amount: 9000, currency: 'ARS', description: 'Sin débito',
        accountId: account._id, status: 'anulado', module: 'crm_v2', treasuryBoxKey: 'operativa', isTreasuryExpenseSynced: true
    });
    const before = (await TreasuryBox.findOne({ key: 'operativa' }).lean()).balanceARS;
    await assert.rejects(
        syncExpenseWithTreasury(expense, { statusChanged: true, oldStatus: 'activo', user }),
        /no existe un débito de Tesorería asociado/
    );
    const after = await TreasuryBox.findOne({ key: 'operativa' }).lean();
    assert.equal(after.balanceARS, before);
    assert.equal(reversalCount(after, expense._id), 0);
});

await test('La proyección de Capital observa caja e historial ya restituidos y conserva bloqueo conservador', async () => {
    const expense = await makeDebitedExpense({ amount: 200000, balance: 300000, boxKey: 'reserva' });
    await syncExpenseWithTreasury(expense, { statusChanged: true, oldStatus: 'activo', user });
    const box = await TreasuryBox.findOne({ key: 'reserva' }).lean();
    const debit = box.history.find((entry) => entry.type === 'egreso_finanzas' && String(entry.sourceExpenseId) === String(expense._id));
    const credit = box.history.find((entry) => entry.type === 'reversion_egreso' && String(entry.sourceExpenseId) === String(expense._id));
    assert.equal(box.balanceARS, 500000);
    assert.equal(Math.round((500000 - 300000) * 100) / 100, debit.amount * -1);
    assert.equal(credit.amount, debit.amount * -1);

    const projection = await getCapitalReinvestmentProjection();
    assert.equal(projection.sourceReconciliation.balanceIntegrity, 'unknown_expense_reversal');
    assert.ok(projection.warnings.some((warning) => warning.code === 'expense_reversal_balance_unverified'));
    assert.equal(projection.liquidity.ARS.availableForPurchase, null, 'Hasta conciliación explícita, el adaptador no declara liquidez utilizable');
});

await finish();
