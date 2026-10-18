// Ejecutar con: node tests/saleCommercial.test.js
import assert from 'node:assert/strict';
import {
    computeCommissionAmount,
    computeSaleProfit,
    validateCommissionPercent,
    parseDecimal
} from '../src/utils/saleCommercial.js';

// Ejemplo de validación del pedido: venta 25.500.000 con 1,3% => 331.500
assert.equal(computeCommissionAmount(25500000, 1.3), 331500);
assert.equal(computeCommissionAmount(25500000, '1,3'), 331500);
assert.equal(computeCommissionAmount(0, 1.3), 0);
assert.equal(computeCommissionAmount(1000000, 0), 0);

// Ganancia antes de comisión 4.500.000 (precio 25.500.000, costo 21.000.000, sin gastos) => neta 4.168.500
const p = computeSaleProfit({
    salePrice: 25500000,
    saleCurrency: 'ARS',
    purchaseCost: 21000000,
    purchaseCurrency: 'ARS',
    expenses: [],
    commissionAmount: 331500,
    commissionCurrency: 'ARS'
});
assert.equal(p.profitBeforeCommission, 4500000);
assert.equal(p.netProfit, 4168500);
assert.equal(p.commissionAmount, 331500);

// Recalcular al cambiar precio o porcentaje; la comisión se descuenta una sola vez
const p2 = computeSaleProfit({
    salePrice: 26000000, saleCurrency: 'ARS', purchaseCost: 21000000, purchaseCurrency: 'ARS',
    commissionAmount: computeCommissionAmount(26000000, 2), commissionCurrency: 'ARS'
});
assert.equal(p2.profitBeforeCommission, 5000000);
assert.equal(p2.netProfit, 5000000 - 520000);

// Monedas distintas: no se mezclan
const p3 = computeSaleProfit({
    salePrice: 20000, saleCurrency: 'USD', purchaseCost: 15000000, purchaseCurrency: 'ARS',
    expenses: [{ amount: 500, currency: 'ARS' }, { amount: 100, currency: 'USD' }]
});
assert.equal(p3.costComparable, false);
assert.equal(p3.excludedExpensesCount, 1);
assert.equal(p3.profitBeforeCommission, 19900);

// Validación de porcentaje
assert.equal(validateCommissionPercent('abc').ok, false);
assert.equal(validateCommissionPercent(-1).ok, false);
assert.equal(validateCommissionPercent(101).ok, false);
assert.equal(validateCommissionPercent('1,3').value, 1.3);
assert.ok(Number.isNaN(parseDecimal('')));

console.log('saleCommercial: OK');
