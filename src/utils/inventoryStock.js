import { normalizeCurrency, resolveVehicleAcquisitionCost, roundMoney } from './saleCommercial.js';

export const emptyMoney = () => ({ ARS: 0, USD: 0 });
export const stockStatus = (car) => car.sold ? 'vendido' : String(car.status || 'sin_estado').trim().toLowerCase();
export const isActiveStock = (car) => !['vendido', 'cancelado', 'anulado', 'eliminado'].includes(stockStatus(car));
export const isAvailableStock = (car) => stockStatus(car) === 'disponible';

export function stockOwnership(car) {
    const consignment = Boolean(String(car.consignedBy || '').trim());
    const investorPct = Math.min(100, Math.max(0, Number(car.investor?.percentage) || 0));
    const thirdParty = !consignment && car.agencyOwned === false && investorPct === 0;
    const ownPct = consignment || thirdParty ? 0 : roundMoney(100 - investorPct);
    const type = consignment ? 'consignacion' : thirdParty ? 'tercero' : investorPct === 100 ? 'inversor' : investorPct > 0 ? 'compartido' : 'propio';
    const label = type === 'consignacion' ? `Consignación${car.consignedBy ? ` · ${car.consignedBy}` : ''}`
        : type === 'tercero' ? 'Tercero' : type === 'inversor' ? 'Inversor 100% · propia 0%'
        : type === 'compartido' ? `Compartido · propia ${ownPct}% / inversor ${investorPct}%` : 'Propio 100%';
    return { type, label, ownPct, investorPct: consignment || thirdParty ? 0 : investorPct, externalPct: consignment || thirdParty ? 100 : investorPct };
}

// No inferimos la moneda a partir del importe ni convertimos sin una cotización registrada.
export function stockValuation(car, simulatedPrice) {
    const ownership = stockOwnership(car);
    const askingCurrency = normalizeCurrency(car.currency);
    const asking = Math.max(0, roundMoney(simulatedPrice === undefined ? car.price : simulatedPrice));
    const acquisition = resolveVehicleAcquisitionCost(car);
    const purchaseCurrency = acquisition.currency || normalizeCurrency(car.purchaseCurrency || car.currency);
    const expenses = emptyMoney();
    for (const expense of car.expenses || []) {
        const currency = normalizeCurrency(expense.currency || purchaseCurrency);
        expenses[currency] = roundMoney(expenses[currency] + (Number(expense.amount) || 0));
    }
    const cost = { ...expenses };
    if (acquisition.hasCost) cost[purchaseCurrency] = roundMoney(cost[purchaseCurrency] + acquisition.amount);
    const ownCost = emptyMoney();
    const externalCost = emptyMoney();
    for (const currency of ['ARS', 'USD']) {
        ownCost[currency] = roundMoney(cost[currency] * ownership.ownPct / 100);
        externalCost[currency] = roundMoney(cost[currency] - ownCost[currency]);
    }
    const ownAsking = roundMoney(asking * ownership.ownPct / 100);
    return { ...ownership, asking, askingCurrency, purchase: acquisition.hasCost ? acquisition.amount : null,
        purchaseCurrency, hasCost: acquisition.hasCost, acquisitionSource: acquisition.source,
        expenses, cost, ownCost, externalCost, ownAsking, externalAsking: roundMoney(asking - ownAsking) };
}

export function summarizeStock(cars) {
    const result = { count: cars.length, available: 0, missingCost: 0, missingPrice: 0, provisionalPrice: 0,
        asking: emptyMoney(), ownAsking: emptyMoney(), investorAsking: emptyMoney(), thirdPartyAsking: emptyMoney(),
        cost: emptyMoney(), ownCost: emptyMoney(), investorCost: emptyMoney(), thirdPartyCost: emptyMoney() };
    for (const car of cars) {
        const value = stockValuation(car);
        const external = ['consignacion', 'tercero'].includes(value.type);
        if (isAvailableStock(car)) result.available++;
        if (!value.hasCost && !external) result.missingCost++;
        if (!value.asking) result.missingPrice++;
        if (value.asking === 1) result.provisionalPrice++;
        const currency = value.askingCurrency;
        result.asking[currency] = roundMoney(result.asking[currency] + value.asking);
        result.ownAsking[currency] = roundMoney(result.ownAsking[currency] + value.ownAsking);
        const askingBucket = external ? 'thirdPartyAsking' : 'investorAsking';
        result[askingBucket][currency] = roundMoney(result[askingBucket][currency] + value.externalAsking);
        for (const cur of ['ARS', 'USD']) {
            result.cost[cur] = roundMoney(result.cost[cur] + value.cost[cur]);
            result.ownCost[cur] = roundMoney(result.ownCost[cur] + value.ownCost[cur]);
            const costBucket = external ? 'thirdPartyCost' : 'investorCost';
            result[costBucket][cur] = roundMoney(result[costBucket][cur] + value.externalCost[cur]);
        }
    }
    return result;
}

export const formatStockMoney = (value) => ['ARS', 'USD'].filter(currency => Number(value?.[currency]) !== 0)
    .map(currency => `${currency} ${Number(value[currency]).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`).join(' + ') || 'Sin importe registrado';

// Offline snapshots use the same filter semantics as the server; callers paginate only afterwards.
export function filterStockVehicles(cars, params = {}) {
    const words = String(params.search || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const wantedStatus = ({ senado: 'reservado', vendido_sin_confirmar: 'pausado' })[params.status] || params.status;
    return cars.filter(car => {
        if (wantedStatus && wantedStatus !== 'todos' && stockStatus(car) !== wantedStatus) return false;
        if (params.brand && params.brand !== 'todas' && String(car.brand).toLowerCase() !== String(params.brand).toLowerCase()) return false;
        const owner = stockOwnership(car);
        if (params.ownership && params.ownership !== 'todos' && owner.type !== params.ownership) return false;
        if (params.tab === 'consignaciones' && owner.type !== 'consignacion') return false;
        if (params.tab === 'compartidos' && !['compartido', 'inversor'].includes(owner.type)) return false;
        if (params.tab === 'cero_km' && !(/^(0\s?km|nuevo)$/i.test(car.condition || '') || car.km === 0)) return false;
        const publishedML = /^s[ií]$/i.test(car.publishedOnML || '');
        if (params.ml === 'publicados' && !publishedML || params.ml === 'no_publicados' && publishedML) return false;
        const published = car.visibleEnWeb !== false && !car.sold && !/^(vendido|reservado|pausado|cancelado|eliminado)$/i.test(car.status || '');
        if (params.catalog === 'published' && !published || params.catalog === 'unpublished' && published) return false;
        const fields = ['brand', 'name', 'model', 'description', 'plateOrVin', 'ownerName', 'ownerPhone', 'consignedBy', 'location', 'notes', 'engineNumber', 'chassisNumber'].map(key => String(car[key] || '').toLowerCase());
        fields.push(String(car.investor?.name || '').toLowerCase(), String(car.infoAuto?.versionName || '').toLowerCase());
        return words.every(word => fields.some(value => value.includes(word)) || /^\d+$/.test(word) && (car.year === Number(word) || car.km === Number(word)));
    });
}
