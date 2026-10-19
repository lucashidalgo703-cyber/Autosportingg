// Ejecutar con: node tests/saleCommercial.test.js
import assert from 'node:assert/strict';
import {
    computeCommissionAmount,
    computeSaleProfit,
    resolveVehicleAcquisitionCost,
    validateCommissionPercent,
    parseDecimal
} from '../src/utils/saleCommercial.js';

// 1. Caso real de producción: venta $25.500.000 ARS (Peugeot 208 compra $21.000.000 ARS, status 'Vendido')
// Con comisión 0,3% ($76.500):
// Ganancia antes de comisión: $4.500.000 | Ganancia neta: $4.423.500
assert.equal(computeCommissionAmount(25500000, 0.3), 76500);
assert.equal(computeCommissionAmount(25500000, '0,3'), 76500);
const prodCase03 = computeSaleProfit({
    salePrice: 25500000,
    saleCurrency: 'ARS',
    vehicle: {
        _id: '6a95fd8665dc40fa0ad980e8',
        status: 'Vendido',
        purchasePrice: 21000000,
        purchaseCurrency: 'ARS',
        expenses: []
    },
    saleExpenses: [],
    commissionSettings: { mode: 'percent', percent: 0.3 }
});
assert.equal(prodCase03.calculable, true);
assert.equal(prodCase03.agreedPrice, 25500000);
assert.equal(prodCase03.acquisitionCost, 21000000);
assert.equal(prodCase03.vehicleExpensesTotal, 0);
assert.equal(prodCase03.saleExpensesTotal, 0);
assert.equal(prodCase03.commissionAmount, 76500);
assert.equal(prodCase03.profitBeforeCommission, 4500000);
assert.equal(prodCase03.netProfit, 4423500);

// Con comisión 1,3% ($331.500):
// Ganancia antes de comisión: $4.500.000 | Ganancia neta: $4.168.500
assert.equal(computeCommissionAmount(25500000, 1.3), 331500);
assert.equal(computeCommissionAmount(25500000, '1,3'), 331500);
const prodCase13 = computeSaleProfit({
    salePrice: 25500000,
    saleCurrency: 'ARS',
    vehicle: {
        _id: '6a95fd8665dc40fa0ad980e8',
        status: 'Vendido',
        purchasePrice: 21000000,
        purchaseCurrency: 'ARS',
        expenses: []
    },
    saleExpenses: [],
    commissionSettings: { mode: 'percent', percent: 1.3 }
});
assert.equal(prodCase13.calculable, true);
assert.equal(prodCase13.profitBeforeCommission, 4500000);
assert.equal(prodCase13.netProfit, 4168500);
assert.equal(prodCase13.commissionAmount, 331500);

// 2. Descuento de compra/toma + gastos del vehículo + gastos comerciales + comisión exactamente una vez
const fullBreakdown = computeSaleProfit({
    salePrice: 30000000,
    saleCurrency: 'ARS',
    vehicle: {
        _id: 'car-1',
        status: 'Vendido',
        purchasePrice: 22000000,
        purchaseCurrency: 'ARS',
        expenses: [
            { description: 'Chapa y pintura', amount: 500000, currency: 'ARS' },
            { description: 'Batería', amount: 200000, currency: 'ARS' }
        ]
    },
    saleExpenses: [
        { description: 'Gestoría', amount: 300000, currency: 'ARS' }
    ],
    commissionSettings: { mode: 'percent', percent: 1 } // 300.000
});
assert.equal(fullBreakdown.calculable, true);
assert.equal(fullBreakdown.acquisitionCost, 22000000);
assert.equal(fullBreakdown.vehicleExpensesTotal, 700000);
assert.equal(fullBreakdown.saleExpensesTotal, 300000);
assert.equal(fullBreakdown.profitBeforeCommission, 7000000); // 30M - 22M - 700k - 300k
assert.equal(fullBreakdown.commissionAmount, 300000);
assert.equal(fullBreakdown.netProfit, 6700000);

// 3. Prohibido asumir costo 0 si falta el vehículo o falta su costo de compra/toma
const missingVehicle = computeSaleProfit({
    salePrice: 25500000,
    saleCurrency: 'ARS',
    vehicle: null,
    commissionAmount: 76500,
    commissionCurrency: 'ARS'
});
assert.equal(missingVehicle.calculable, false);
assert.equal(missingVehicle.statusLabel, 'Ganancia no calculable');
assert.equal(missingVehicle.profitBeforeCommission, null);
assert.equal(missingVehicle.netProfit, null);
assert.ok(missingVehicle.missingFields.includes('vehicle'));

const missingCost = computeSaleProfit({
    salePrice: 25500000,
    saleCurrency: 'ARS',
    vehicle: { _id: 'car-no-cost', purchasePrice: 0, purchaseCurrency: 'ARS' },
    commissionAmount: 76500,
    commissionCurrency: 'ARS'
});
assert.equal(missingCost.calculable, false);
assert.equal(missingCost.statusLabel, 'Ganancia no calculable');
assert.equal(missingCost.profitBeforeCommission, null);
assert.equal(missingCost.netProfit, null);
assert.ok(missingCost.missingFields.includes('purchaseCost'));

// 4. Monedas distintas (ARS vs USD): sin cotización registrada -> "Ganancia no calculable"
const mixedNoRate = computeSaleProfit({
    salePrice: 20000,
    saleCurrency: 'USD',
    purchaseCost: 15000000,
    purchaseCurrency: 'ARS',
    expenses: [{ amount: 500000, currency: 'ARS' }, { amount: 100, currency: 'USD' }]
});
assert.equal(mixedNoRate.calculable, false);
assert.equal(mixedNoRate.statusLabel, 'Ganancia no calculable');
assert.equal(mixedNoRate.costComparable, false);
assert.equal(mixedNoRate.excludedExpensesCount, 1);
assert.equal(mixedNoRate.profitBeforeCommission, null);
assert.equal(mixedNoRate.netProfit, null);

// Con cotización registrada (ej. 1 USD = 1000 ARS):
// Compra 15.000.000 ARS = 15.000 USD, gasto 500.000 ARS = 500 USD + 100 USD = 600 USD
// Ganancia = 20.000 - 15.000 - 600 = 4.400 USD
const mixedWithRate = computeSaleProfit({
    salePrice: 20000,
    saleCurrency: 'USD',
    purchaseCost: 15000000,
    purchaseCurrency: 'ARS',
    expenses: [{ amount: 500000, currency: 'ARS' }, { amount: 100, currency: 'USD' }],
    exchangeRate: 1000
});
assert.equal(mixedWithRate.calculable, true);
assert.equal(mixedWithRate.acquisitionCost, 15000);
assert.equal(mixedWithRate.saleExpensesTotal, 600);
assert.equal(mixedWithRate.netProfit, 4400);

// 5. Vehículo ingresado por permuta (valor_de_toma) y participación de socio
const tradeInAndPartner = computeSaleProfit({
    salePrice: 18000000,
    saleCurrency: 'ARS',
    vehicle: {
        _id: 'car-tradein',
        status: 'Vendido',
        purchasePrice: 0,
        tradeInOrigin: { saleId: 'origin-sale-1', value: 14000000, currency: 'ARS' },
        investor: { name: 'Socio A', percentage: 50 }
    },
    commissionSettings: { mode: 'fixed', extraAmount: 0, extraCurrency: 'USD' } // extraCurrency USD pero monto 0 no bloquea
});
assert.equal(tradeInAndPartner.calculable, true);
assert.equal(tradeInAndPartner.acquisitionSource, 'valor_de_toma');
assert.equal(tradeInAndPartner.acquisitionCost, 14000000);
assert.equal(tradeInAndPartner.netProfit, 4000000);
assert.equal(tradeInAndPartner.agencyNetProfit, 2000000);
assert.equal(tradeInAndPartner.partnerNetProfit, 2000000);

// Validación de porcentaje
assert.equal(validateCommissionPercent('abc').ok, false);
assert.equal(validateCommissionPercent(-1).ok, false);
assert.equal(validateCommissionPercent(101).ok, false);
assert.equal(validateCommissionPercent('1,3').value, 1.3);
assert.equal(validateCommissionPercent('0,3').value, 0.3);
assert.ok(Number.isNaN(parseDecimal('')));

console.log('saleCommercial: OK');
