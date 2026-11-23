import { listingIdentity } from './purchaseListingSources.js';
export { listingIdentity } from './purchaseListingSources.js';

export const markets = ['Comodoro Rivadavia', 'Patagonia', 'Nacional'];
export const currencies = ['ARS', 'USD'];
export const priceTypes = ['contado', 'financiado', 'promoción', 'sin confirmar'];
export const verificationStates = ['cotejado manualmente', 'sin verificar', 'ya no disponible'];

const clean = value => typeof value === 'string' ? value.trim().slice(0, 300) : '';
const key = value => clean(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const amount = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e13 ? value : null;
const textFields = ['brand', 'model', 'version', 'engine', 'transmission', 'traction', 'condition', 'location'];
const validYear = value => Number.isInteger(value) && value >= 1900 && value <= new Date().getFullYear() + 1;
const round = value => Math.round(value * 100) / 100;
const percentile = (prices, quantile) => {
    const index = (prices.length - 1) * quantile;
    return round(prices[Math.floor(index)] + (prices[Math.ceil(index)] - prices[Math.floor(index)]) * (index % 1));
};

export function evaluatePurchase(input, dashboard, now = new Date()) {
    const vehicle = Object.fromEntries(textFields.map(field => [field, clean(input.vehicle?.[field])]));
    vehicle.year = input.vehicle?.year;
    vehicle.km = amount(input.vehicle?.km);
    vehicle.market = input.vehicle?.market;
    vehicle.repairs = clean(input.vehicle?.repairs);
    if (textFields.some(field => !key(vehicle[field])) || vehicle.km === null || !validYear(vehicle.year) || !markets.includes(vehicle.market)) {
        throw new Error('Completá los datos y el mercado del vehículo.');
    }
    const terms = Object.fromEntries(['asking', 'offer', 'tradeValue', 'cashNow', 'repairsCost', 'commercialCost', 'share', 'targetProfit'].map(field => [field, amount(input.terms?.[field])]));
    const currency = input.terms?.currency;
    const expensePayer = input.terms?.expensePayer;
    const tradeVehicle = clean(input.terms?.tradeVehicle);
    const paymentNotes = clean(input.terms?.paymentNotes);
    const payments = input.terms?.payments ?? [];
    if (!Array.isArray(payments) || payments.length > 24 || payments.some(payment => !payment || !/^\d{4}-\d{2}-\d{2}$/.test(payment.date) || !Number.isFinite(Date.parse(payment.date)) || new Date(payment.date).toISOString().slice(0, 10) !== payment.date || payment.date <= now.toISOString().slice(0, 10) || !amount(payment.amount))) {
        throw new Error('Indicá fecha futura e importe positivo para cada pago.');
    }
    const future = round(payments.reduce((sum, payment) => sum + payment.amount, 0));
    if (!currencies.includes(currency) || Object.values(terms).some(value => value === null) || terms.asking <= 0 || terms.offer <= 0 || terms.share <= 0 || terms.share > 100 ||
        !['agency', 'shared', 'partner'].includes(expensePayer) || (terms.share === 100 && expensePayer === 'partner') ||
        Boolean(terms.tradeValue) !== Boolean(tradeVehicle) || round(terms.tradeValue + terms.cashNow + future) !== round(terms.offer)) {
        throw new Error('Revisá los importes, la participación y la permuta. Efectivo, pagos futuros y permuta deben sumar la oferta.');
    }
    Object.assign(terms, { currency, expensePayer, tradeVehicle, paymentNotes, payments: payments.map(({ date, amount }) => ({ date, amount })), future });

    if (!Array.isArray(input.listings) || input.listings.length > 60) throw new Error('Se admiten hasta 60 publicaciones.');
    const ids = new Set();
    const fingerprints = new Set();
    const listings = input.listings.map((row, index) => {
        const identity = listingIdentity(row?.url);
        if (!identity) throw new Error('La publicación ' + (index + 1) + ' requiere un enlace directo HTTPS compatible.');
        const comparable = Object.fromEntries(textFields.map(field => [field, clean(row[field])]));
        const title = clean(row.title);
        const checked = typeof row.checkedAt === 'string' ? Date.parse(row.checkedAt) : NaN;
        if (!title || !validYear(row.year) || amount(row.km) === null || !amount(row.price) || !currencies.includes(row.currency) ||
            !priceTypes.includes(row.priceType) || !verificationStates.includes(row.verification) || !markets.includes(row.market) ||
            !Number.isFinite(checked) || checked > +now) throw new Error('Revisá los datos de la publicación ' + (index + 1) + '.');
        const matching = textFields.slice(0, 7).every(field => key(vehicle[field]) === key(comparable[field]));
        const sameModel = ['brand', 'model'].every(field => key(vehicle[field]) === key(comparable[field]));
        const yearGap = Math.abs(vehicle.year - row.year);
        const kmGap = Math.abs(vehicle.km - row.km);
        const similarity = matching && yearGap === 0 && kmGap <= Math.max(10000, vehicle.km * 0.2) ? 'exacta' :
            sameModel && yearGap <= 2 ? 'parcial' : 'baja';
        const id = identity.source + ':' + identity.id;
        const fingerprint = [key(title), row.year, row.km, key(comparable.location), row.price, row.currency].join('|');
        const duplicate = ids.has(id) || fingerprints.has(fingerprint);
        const exclusions = [];
        if (duplicate) exclusions.push('Posible duplicado');
        if (similarity !== 'exacta') exclusions.push('Fuera de la coincidencia exacta');
        if (row.market !== vehicle.market) exclusions.push('Otro mercado');
        if (row.currency !== currency) exclusions.push('Otra moneda');
        if (row.priceType !== 'contado') exclusions.push('Precio de contado sin confirmar');
        if (row.verification !== verificationStates[0]) exclusions.push('Aviso sin cotejo vigente');
        if (+now - checked > 30 * 86400000) exclusions.push('Cotejo de más de 30 días');
        if (!exclusions.length) {
            ids.add(id);
            fingerprints.add(fingerprint);
        }
        return { ...identity, ...comparable, title, year: row.year, km: row.km, price: row.price, currency: row.currency,
            market: row.market, priceType: row.priceType, seller: clean(row.seller), checkedAt: new Date(checked).toISOString(),
            verification: row.verification, similarity, exclusions };
    });

    const accepted = listings.filter(row => !row.exclusions.length);
    const prices = accepted.map(row => row.price).sort((a, b) => a - b);
    const sufficient = prices.length >= 3;
    const min = prices[0] ?? null;
    const max = prices.at(-1) ?? null;
    const median = prices.length ? percentile(prices, 0.5) : null;
    const dispersion = prices.length ? round(max - min) : null;
    const confidence = sufficient ? (prices.length >= 5 && dispersion / median <= 0.2 ? 'media' : 'baja') : 'insuficiente';
    const market = { found: listings.length, accepted: accepted.length, min, max, median, dispersion, confidence, sufficient,
        publish: sufficient ? median : null, fast: sufficient ? percentile(prices, 0.25) : null, close: null, adjustments: [] };
    const expenses = terms.repairsCost + terms.commercialCost;
    const cost = round(terms.offer + expenses);
    const share = terms.share / 100;
    const agencyExpense = expenses * { agency: 1, shared: share, partner: 0 }[expensePayer];
    const scenarios = sufficient ? [['Conservador', 0.25], ['Base', 0.5], ['Optimista', 0.75]].map(([name, q]) => {
        const sale = percentile(prices, q);
        return { name, percentile: q, sale, gross: round(sale - terms.offer), net: round(sale - cost),
            ownNet: round((sale - terms.offer) * share - agencyExpense), marginCost: round((sale - cost) / cost * 100),
            marginSale: round((sale - cost) / sale * 100) };
    }) : [];
    const finance = { acquisition: terms.offer, cost, maxBuy: sufficient && input.terms?.targetConfirmed === true
        ? Math.max(0, round(market.fast - expenses - terms.targetProfit)) : null, scenarios };
    return { methodology: 1, vehicle, terms: { ...terms, targetConfirmed: input.terms?.targetConfirmed === true }, listings, market, finance,
        liquidity: evaluateLiquidity(dashboard, terms, share, agencyExpense) };
}

function evaluateLiquidity(dashboard, terms, share, agencyExpense) {
    const { auditInfo, summary, boxes } = dashboard ?? {};
    const row = summary?.byCurrency?.[terms.currency];
    const physical = summary?.['totalEfectivo' + terms.currency];
    const reserve = boxes?.find(box => box.key === 'reserva')?.['targetMoney' + terms.currency];
    if (auditInfo?.isReconciliationConfirmed !== true || auditInfo.hasPhysicalCashInconsistency !== false || row?.isBalanced !== true ||
        [row.saldoReal, row.fondosDeTerceros, row.compromisos, row.faltantes, row.disponibleParaComprarStock, reserve, physical].some(value => !Number.isFinite(value))) {
        return { status: 'Sin capacidad verificable. Revisá la conciliación y la configuración de Tesorería.' };
    }
    const immediate = round(terms.cashNow * share + agencyExpense);
    const future = round(terms.future * share);
    const ownCash = row.saldoReal - row.fondosDeTerceros;
    const projected = round(ownCash - row.compromisos - immediate - future);
    const budget = round(row.disponibleParaComprarStock - row.faltantes);
    const gap = round(Math.max(0, immediate + future - budget, reserve - projected));
    return { status: gap > 0 ? 'Fondos verificados insuficientes' : 'Cubierta con fondos verificados',
        physical, ownCash, budget, immediate, future, commitments: row.compromisos, reserve, projected, minimum: projected,
        futureFundingGap: gap, asOf: auditInfo.updatedAt };
}
