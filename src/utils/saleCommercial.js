// Reglas comerciales de una venta compartidas entre servidor (server.js) y CRM (React).
// Mantener este archivo libre de dependencias para poder importarlo desde ambos lados.

export const VALID_INSTALLMENT_COUNTS = [6, 12, 18, 24];

export const roundMoney = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Acepta número o texto ("1,3" / "1.3"). Devuelve NaN si no es un número válido.
export const parseDecimal = (raw) => {
    if (typeof raw === 'number') return raw;
    if (raw === null || raw === undefined) return NaN;
    const text = String(raw).trim().replace(',', '.');
    if (text === '') return NaN;
    return Number(text);
};

// Comisión por porcentaje: importe = base × porcentaje / 100.
// La base es el precio total pactado de la venta (en ventas financiadas, el total de la operación:
// entrega + cuotas con interés). No se suman por separado entrega, cuotas ni permutas.
export const computeCommissionAmount = (base, percent) => {
    const b = Number(base);
    const p = parseDecimal(percent);
    if (!Number.isFinite(b) || !Number.isFinite(p)) return 0;
    return roundMoney((b * p) / 100);
};

export const validateCommissionPercent = (raw) => {
    const p = parseDecimal(raw);
    if (!Number.isFinite(p)) return { ok: false, message: 'Ingresá un porcentaje de comisión válido.' };
    if (p < 0) return { ok: false, message: 'El porcentaje de comisión no puede ser negativo.' };
    if (p > 100) return { ok: false, message: 'El porcentaje de comisión no puede superar 100%.' };
    return { ok: true, value: p };
};

// Ganancia de la operación (devengada). No equivale a dinero cobrado.
// - Usa solo gastos en la misma moneda de la venta (no suma ARS con USD).
// - Si el costo de compra está en otra moneda, no lo resta y lo informa (`costComparable: false`).
// - La comisión se descuenta una sola vez, en `netProfit`.
export const computeSaleProfit = ({
    salePrice,
    saleCurrency = 'ARS',
    purchaseCost = 0,
    purchaseCurrency,
    expenses = [],
    commissionAmount = 0,
    commissionCurrency
}) => {
    const price = Number(salePrice) || 0;
    const cost = Number(purchaseCost) || 0;
    const costComparable = !purchaseCurrency || purchaseCurrency === saleCurrency || cost === 0;

    let sameCurrencyExpenses = 0;
    let excludedExpenses = 0;
    for (const exp of expenses || []) {
        const amount = Number(exp?.amount) || 0;
        if (!exp?.currency || exp.currency === saleCurrency) sameCurrencyExpenses += amount;
        else if (amount !== 0) excludedExpenses += 1;
    }

    const commissionComparable = !commissionCurrency || commissionCurrency === saleCurrency;
    const commission = commissionComparable ? Number(commissionAmount) || 0 : 0;

    const profitBeforeCommission = roundMoney(price - (costComparable ? cost : 0) - sameCurrencyExpenses);
    const netProfit = roundMoney(profitBeforeCommission - commission);

    return {
        currency: saleCurrency,
        profitBeforeCommission,
        commissionAmount: roundMoney(commission),
        netProfit,
        costComparable,
        commissionComparable,
        excludedExpensesCount: excludedExpenses
    };
};
