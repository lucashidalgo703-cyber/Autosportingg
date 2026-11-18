// Read-only cash-offer projections. Acquisition/expense/ownership rules remain
// in inventoryStock and the commercial net/share calculation in saleCommercial.
import { stockCurrency, stockValuation } from './inventoryStock.js';
import { computeCommissionAmount, computeSaleProfit, parseArgentineMoney, roundMoney } from './saleCommercial.js';

const MAX_MONEY = 1e12;
const number = value => value === null || value === undefined || value === '' ? null : (() => {
    const parsed = parseArgentineMoney(value);
    return Number.isFinite(parsed) ? parsed : null;
})();
const issue = (field, message) => ({ field, message });
const moneyLabel = (value, currency) => (currency === 'ARS' ? '$' : 'USD ') + Number(value).toLocaleString('es-AR', { maximumFractionDigits: 2 });
const uniqueIssues = values => [...new Map(values.map(value => [value.field, value])).values()];
function converted(amount, from, to, exchangeRate) {
    if (amount === 0 || from === to) return roundMoney(amount);
    if (!(exchangeRate > 0) || !from || !to) return null;
    return roundMoney(to === 'ARS' ? amount * exchangeRate : amount / exchangeRate);
}

function resolveCommission(settings, currency, exchangeRate) {
    const missing = [];
    // Only the commission entered in the sale's commercial panel belongs to
    // its net result. Seller split metadata is not an additional expense.
    const mode = settings?.mode === 'percent' ? 'percent' : 'fixed';
    const percent = mode === 'percent' ? number(settings?.percent) : 0;
    const fixed = mode === 'fixed' ? number(settings?.extraAmount ?? 0) : 0;
    if (percent === null || percent < 0 || percent >= 100) missing.push(issue('commission.percent', 'La comisión del panel comercial debe ser un porcentaje válido menor al 100%.'));
    if (fixed === null || fixed < 0 || fixed > MAX_MONEY) missing.push(issue('commission.extraAmount', 'Falta un importe válido de comisión del panel comercial.'));
    const fixedCurrency = fixed > 0 ? stockCurrency(settings?.extraCurrency) : currency;
    if (fixed > 0 && !fixedCurrency) missing.push(issue('commission.extraCurrency', 'Falta la moneda de la comisión del panel comercial.'));
    const fixedAmount = fixed !== null ? converted(fixed, fixedCurrency, currency, exchangeRate) : null;
    if (fixed > 0 && fixedCurrency && currency && fixedAmount === null) missing.push(issue('commission.exchangeRate', 'Falta tipo de cambio registrado para la comisión del panel comercial.'));
    const components = percent > 0 ? [{ key: 'commercial', percent }] : [];
    const label = settings?.sourceLabel || settings?.label || 'Comisión del panel comercial de la venta';
    return { missing, components, sellerPercent: 0, sharedSellerPercent: 0, additionalPercent: percent,
        effectivePercent: percent, fixedAmount, currency, rawFixedAmount: fixed, rawFixedCurrency: fixedCurrency,
        sourceLabel: label, label };
}

// Use a decimal grid adapted to the actual gap. Every intermediate quote is
// strictly inside (floor, published), is distinct, and never lowers the floor.
export function negotiationIntermediatePrices(published, floor) {
    if (!Number.isFinite(published) || !Number.isFinite(floor) || floor < 0 || published <= floor) return [];
    const first = Math.floor(floor) + 1, last = Math.ceil(published) - 1;
    if (first > last) return [];
    const count = last - first + 1;
    if (count === 1) return [first];
    let quantum = 10 ** Math.max(0, Math.floor(Math.log10((published - floor) / 3)));
    while (quantum > 1 && Math.floor(last / quantum) - Math.ceil(first / quantum) < 1) quantum /= 10;
    const low = Math.ceil(first / quantum), high = Math.floor(last / quantum);
    if (high <= low) return [Math.min(last, Math.max(first, Math.round((published + floor) / 2)))];
    const a = Math.max(low + 1, Math.min(high, Math.round((published - (published - floor) / 3) / quantum)));
    const b = Math.max(low, Math.min(a - 1, Math.round((floor + (published - floor) / 3) / quantum)));
    return [a * quantum, b * quantum];
}

function projection(context, amount) {
    if (!context.calculationReady || !(amount > 0) || amount > MAX_MONEY) return { profit: null, agencyProfit: null, commissionAmount: null };
    const commissionAmount = context.commission.components.reduce((sum, component) => roundMoney(sum + computeCommissionAmount(amount, component.percent)), context.commission.fixedAmount);
    const result = computeSaleProfit({
        salePrice: amount, saleCurrency: context.currency, vehicle: context.vehicle,
        purchaseCost: context.valuation.purchase, purchaseCurrency: context.valuation.purchaseCurrency,
        legacyTradeInOrigin: context.legacyTradeInOrigin, vehicleExpenses: context.vehicle.expenses || [],
        saleExpenses: context.saleExpenses,
        commissionAmount, commissionCurrency: context.currency, exchangeRate: context.exchangeRate,
        investorPercentage: context.valuation.investorPct
    });
    return { profit: result.netProfit, agencyProfit: context.ownership.shared || context.ownership.agencyPercent === 100 ? result.agencyNetProfit : null,
        commissionAmount, investorProfit: result.investorProfitShare };
}

function findFloor(context) {
    const target = context.minimumProfit;
    const factor = 1 - context.commission.effectivePercent / 100;
    if (!(factor > 0)) return null;
    const required = context.totalCost + context.commission.fixedAmount + target;
    // A single rounded commission below 100% leaves a monotone net result.
    // Search whole prices against the canonical calculation, so cent rounding
    // cannot turn an algebraic estimate into a falsely authorized floor.
    let low = 1, high = Math.min(MAX_MONEY, Math.max(1, Math.ceil((required + .02) / factor) + 1));
    if (projection(context, high).profit < target) high = MAX_MONEY;
    if (projection(context, high).profit < target) return null;
    while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (projection(context, middle).profit >= target) high = middle;
        else low = middle + 1;
    }
    if (projection(context, low).profit < target || low > 1 && projection(context, low - 1).profit >= target) return null;
    return low;
}

export function calculateStockNegotiation({ vehicle = {}, rule = null, commissionSettings = null, exchangeRate = null, legacyTradeInOrigin = null, saleExpenses = [] } = {}) {
    const resolvedVehicle = legacyTradeInOrigin?.saleId && !vehicle.tradeInOrigin?.saleId ? { ...vehicle, tradeInOrigin: legacyTradeInOrigin } : vehicle;
    const valuation = stockValuation(resolvedVehicle), currency = valuation.askingCurrency;
    const rate = number(exchangeRate);
    const validRate = rate > 0 && rate <= MAX_MONEY ? rate : null;
    const missingFields = valuation.missingFields.map(value => issue(value.field, value.message));
    if (valuation.asking > MAX_MONEY) missingFields.push(issue('publishedPrice', 'El precio publicado supera el rango de importes permitido.'));
    if (!valuation.hasCost && !missingFields.some(value => value.field === 'purchasePrice')) missingFields.push(issue('purchasePrice', 'Falta costo real de compra o toma.'));
    if (['consignacion', 'tercero'].includes(valuation.type)) missingFields.push(issue('profitParticipation', 'Falta un acuerdo verificable de ganancia para la unidad de terceros.'));
    const commission = resolveCommission(commissionSettings, currency, validRate);
    missingFields.push(...commission.missing);
    const calculationVehicle = { ...resolvedVehicle, purchasePrice: valuation.purchase, purchaseCurrency: valuation.purchaseCurrency,
        ...(resolvedVehicle.tradeInOrigin ? { tradeInOrigin: { ...resolvedVehicle.tradeInOrigin, value: valuation.purchase, currency: valuation.purchaseCurrency } } : {}),
        expenses: (resolvedVehicle.expenses || []).map((expense, index) => {
            const amount = number(expense.amount);
            if (amount !== null && amount < 0) missingFields.push(issue(`expenses.${index}.amount`, 'Revisá el gasto negativo antes de calcular un piso de negociación.'));
            return { ...expense, amount, currency: stockCurrency(expense.currency) };
        }) };
    if (!Array.isArray(saleExpenses)) missingFields.push(issue('saleExpenses', 'Revisá los gastos comerciales registrados en la operación.'));
    const commercialExpenses = (Array.isArray(saleExpenses) ? saleExpenses : []).map((expense, index) => {
        const amount = number(expense.amount), expenseCurrency = stockCurrency(expense.currency);
        if (amount === null || amount < 0) missingFields.push(issue(`saleExpenses.${index}.amount`, 'Falta un importe válido del gasto comercial.'));
        if (!expenseCurrency) missingFields.push(issue(`saleExpenses.${index}.currency`, 'Falta la moneda del gasto comercial.'));
        return { ...expense, amount, currency: expenseCurrency };
    });
    const base = computeSaleProfit({ salePrice: valuation.asking || 1, saleCurrency: currency || 'ARS', vehicle: calculationVehicle,
        purchaseCost: valuation.purchase, purchaseCurrency: valuation.purchaseCurrency, vehicleExpenses: calculationVehicle.expenses,
        saleExpenses: commercialExpenses,
        commissionAmount: 0, commissionCurrency: currency, exchangeRate: validRate, investorPercentage: valuation.investorPct });
    missingFields.push(...base.missingFields.map((field, index) => issue(field, base.missingReasons[index])));
    const totalCost = valuation.costComplete && base.calculable && !missingFields.some(value => /^(?:expenses\.|saleExpenses)/.test(value.field))
        ? roundMoney(base.acquisitionCost + base.totalExpenses) : null;
    if (totalCost > MAX_MONEY) missingFields.push(issue('totalCost', 'El costo total supera el rango de importes permitido.'));
    let minimumProfit = null;
    const ruleValue = number(rule?.value), ruleMode = rule?.mode;
    if (!rule || !['amount', 'percent'].includes(ruleMode) || ruleValue === null || ruleValue < 0 || ruleValue > MAX_MONEY) {
        missingFields.push(issue('minimumRule', 'Falta configurar una regla válida de ganancia mínima.'));
    } else if (ruleMode === 'percent') {
        if (totalCost !== null) minimumProfit = roundMoney(totalCost * ruleValue / 100);
    } else {
        minimumProfit = converted(ruleValue, 'ARS', currency, validRate);
        if (minimumProfit === null) missingFields.push(issue('minimumExchangeRate', 'Falta tipo de cambio registrado para expresar la ganancia mínima en pesos.'));
    }
    const ownership = { shared: ['compartido', 'inversor'].includes(valuation.type), label: valuation.label, type: valuation.type,
        agencyPercent: ['consignacion', 'tercero'].includes(valuation.type) ? null : valuation.ownPct, investorPercent: valuation.investorPct };
    const context = { vehicle: calculationVehicle, saleExpenses: commercialExpenses, valuation, currency, totalCost, publishedPrice: valuation.asking, rule,
        minimumProfit, commission, ownership, exchangeRate: validRate, legacyTradeInOrigin,
        calculationReady: totalCost !== null && totalCost <= MAX_MONEY && currency && commission.missing.length === 0 && valuation.ownershipKnown && !['consignacion', 'tercero'].includes(valuation.type) };
    const issues = uniqueIssues(missingFields);
    let floor = null;
    if (!issues.length && minimumProfit !== null) {
        floor = findFloor(context);
        if (floor === null) issues.push(issue('floor', 'No se pudo verificar un piso seguro dentro del rango permitido. Revisá costo, mínimo y comisión.'));
    }
    const publishedProjection = context.publishedPrice !== null ? projection(context, context.publishedPrice) : null;
    const status = issues.length ? 'pending' : context.publishedPrice < floor || publishedProjection.profit < minimumProfit ? 'below_floor' : 'ready';
    const steps = [];
    if (context.publishedPrice !== null) steps.push({ key: 'published', price: context.publishedPrice, ...publishedProjection });
    if (floor !== null) {
        const intermediate = negotiationIntermediatePrices(context.publishedPrice, floor);
        for (const [index, price] of intermediate.entries()) {
            const quote = projection(context, price);
            if (quote.profit >= minimumProfit) steps.push({ key: index === 0 ? 'first_discount' : 'suggested_close', price, ...quote });
        }
        steps.push({ key: 'floor', price: floor, ...projection(context, floor) });
    }
    const result = { currency, totalCost, publishedPrice: valuation.asking, rule: rule ? { mode: rule.mode, value: ruleValue } : null,
        minimumProfit, commission, ownership, exchangeRate: validRate, floor, status, missingFields: issues, steps,
        statusMessage: status === 'below_floor' ? 'Revisar precio publicado' : status === 'pending' ? 'Datos pendientes' : 'Precios de contado de consulta' };
    Object.defineProperty(result, '_calculation', { value: context, enumerable: false });
    return result;
}

export function evaluateNegotiationOffer(context, rawAmount) {
    const amount = number(rawAmount), currency = context.currency;
    if (!(amount > 0) || amount > MAX_MONEY) return { amount: null, currency, profit: null, agencyProfit: null, commissionAmount: null,
        status: 'pending', difference: null, message: 'Ingresá un importe de oferta válido mayor a cero.' };
    const offered = roundMoney(amount);
    if (!(offered > 0)) return { amount: null, currency, profit: null, agencyProfit: null, commissionAmount: null,
        status: 'pending', difference: null, message: 'Ingresá un importe de oferta válido mayor a cero.' };
    const projected = projection(context._calculation || context, offered);
    if (context.floor === null || context.status === 'pending') return { amount: offered, currency, ...projected, status: 'pending', difference: null,
        message: 'Completá los datos pendientes para evaluar el piso autorizado.' };
    if (projected.profit === null || offered >= context.floor && projected.profit < context.minimumProfit) {
        return { amount: offered, currency, ...projected, status: 'pending', difference: null,
            message: 'Requiere revisar el redondeo de las comisiones: esta oferta no conserva la ganancia mínima.' };
    }
    const difference = roundMoney(Math.abs(offered - context.floor));
    const status = offered > context.floor ? 'above_floor' : offered < context.floor ? 'below_floor' : 'at_floor';
    const message = status === 'above_floor' ? `Podés cotizar y todavía podés bajar ${moneyLabel(difference, currency)}`
        : status === 'at_floor' ? 'Estás en el piso autorizado'
            : `Requiere autorización: faltan ${moneyLabel(difference, currency)} para llegar al piso`;
    return { amount: offered, currency, ...projected, status, difference, message };
}
