import { resolveVehicleAcquisitionCost, roundMoney } from './saleCommercial.js';

// Read-only detail figures. Do not infer an exchange rate, a minimum selling
// price or a commission rule from a vehicle's advertised price.
export function vehicleDisplayCurrency(raw) {
    const value = String(raw ?? '').trim().toUpperCase();
    if (['USD', 'U$S', 'US$'].includes(value)) return 'USD';
    if (['ARS', '$', 'PESO', 'PESOS'].includes(value)) return 'ARS';
    return null;
}

export function getVehicleFinancialDisplay(car = {}) {
    const positiveFinite = value => value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) > 0;
    const hasAgreedTradeInCost = Boolean(car.tradeInOrigin?.saleId && positiveFinite(car.tradeInOrigin.value));
    const acquisition = resolveVehicleAcquisitionCost({
        ...car,
        purchasePrice: positiveFinite(car.purchasePrice) ? car.purchasePrice : undefined,
        tradeInOrigin: car.tradeInOrigin ? { ...car.tradeInOrigin, value: hasAgreedTradeInCost ? car.tradeInOrigin.value : 0 } : undefined,
    });
    const purchaseCurrency = vehicleDisplayCurrency(
        hasAgreedTradeInCost
            ? (car.tradeInOrigin?.currency || car.purchaseCurrency)
            : car.purchaseCurrency
    );
    const saleCurrency = vehicleDisplayCurrency(car.currency);
    const saleAmount = Number(car.price);
    const hasSalePrice = Number.isFinite(saleAmount) && saleAmount > 0;
    const expenses = { ARS: 0, USD: 0, unknownCount: 0 };

    for (const expense of car.expenses || []) {
        const currency = vehicleDisplayCurrency(expense.currency);
        const amount = expense.amount === '' || expense.amount == null ? NaN : Number(expense.amount);
        if (!currency || !Number.isFinite(amount) || amount < 0) {
            expenses.unknownCount += 1;
            continue;
        }
        expenses[currency] = roundMoney(expenses[currency] + amount);
    }

    const costs = { ARS: expenses.ARS, USD: expenses.USD };
    if (acquisition.hasCost && purchaseCurrency) {
        costs[purchaseCurrency] = roundMoney(costs[purchaseCurrency] + acquisition.amount);
    }
    let reason = null;
    if (!acquisition.hasCost) reason = 'Falta el costo de adquisición.';
    else if (!purchaseCurrency) reason = 'Falta una moneda válida para la compra o toma.';
    else if (!hasSalePrice) reason = 'Falta el precio de venta.';
    else if (!saleCurrency) reason = 'Falta una moneda válida de venta.';
    else if (expenses.unknownCount) reason = 'Hay gastos sin importe o moneda válidos.';
    else if (purchaseCurrency !== saleCurrency || costs[saleCurrency === 'USD' ? 'ARS' : 'USD'] !== 0) {
        reason = 'Compra, gastos y venta tienen monedas diferentes; no se aplica una conversión automática.';
    }

    const calculable = reason === null;
    const amount = calculable ? roundMoney(saleAmount - costs[saleCurrency]) : null;
    return {
        purchase: { amount: acquisition.amount, currency: purchaseCurrency, hasCost: acquisition.hasCost },
        expenses,
        costs,
        sale: { amount: hasSalePrice ? roundMoney(saleAmount) : 0, currency: saleCurrency },
        margin: {
            amount,
            currency: saleCurrency,
            percent: calculable && costs[saleCurrency] > 0 ? roundMoney(amount / costs[saleCurrency] * 100) : null,
            calculable,
            reason,
        },
        minimumPrice: null,
    };
}
