import { parseArgentineMoney, resolveVehicleAcquisitionCost, roundMoney } from './saleCommercial.js';

export const emptyMoney = () => ({ ARS: 0, USD: 0 });
export const stockStatus = car => car.sold ? 'vendido' : String(car.status || 'sin_estado').trim().toLowerCase();
export const isActiveStock = car => !['vendido', 'cancelado', 'anulado', 'eliminado'].includes(stockStatus(car));
export const isAvailableStock = car => stockStatus(car) === 'disponible';
export function stockCurrency(value) {
    const code = String(value ?? '').trim().toUpperCase();
    if (['ARS', '$', 'PESOS'].includes(code)) return 'ARS';
    if (['USD', 'U$S', 'US$', 'DÓLARES', 'DOLARES'].includes(code)) return 'USD';
    return null;
}
const money = value => { const n = parseArgentineMoney(value); return Number.isFinite(n) && n > 0 ? roundMoney(n) : null; };
const recordedMoney = value => { const n = parseArgentineMoney(value); return Number.isFinite(n) ? roundMoney(n) : null; };
const pct = value => { if (value === null || value === undefined || value === '') return null; const n = parseArgentineMoney(value); return Number.isFinite(n) && n >= 0 && n <= 100 ? roundMoney(n) : null; };
const nonempty = value => Boolean(String(value ?? '').trim());
const issue = (scope, field, message) => ({ scope, field, message });

// Existing historical investment agreements are read without inventing 50/50.
export function stockOwnership(car) {
    const consignment = nonempty(car.consignedBy || car.consignador);
    const joint = car.jointOwnership || {}, state = car.purchasePaymentState || {};
    const shared = joint.hasPartner === true || state.isSharedInvestment === true || car.isSharedInvestment === true || ['compartido', 'inversor'].includes(car.origen || car.origin);
    const candidates = [car.investor?.percentage, joint.hasPartner ? joint.partnerPercentage : undefined, state.isSharedInvestment ? state.partnerPercentage : undefined];
    let investorPct = candidates.map(pct).find(p => p !== null && p > 0);
    if (investorPct === undefined && joint.hasPartner && pct(joint.agencyPercentage) !== null) investorPct = roundMoney(100 - pct(joint.agencyPercentage));
    if (investorPct === undefined && !shared && !nonempty(car.investor?.name)) investorPct = pct(car.investor?.percentage) ?? undefined;
    const invalidInvestorPct = car.investor?.percentage !== undefined && car.investor?.percentage !== null && pct(car.investor.percentage) === null;
    const investment = shared || investorPct > 0 || nonempty(car.investor?.name) || invalidInvestorPct;
    const thirdParty = !consignment && !investment && car.agencyOwned === false;
    const unknown = !consignment && !thirdParty && ((investment && investorPct === undefined) || (!investment && car.agencyOwned !== true && (car.origen || car.origin) !== 'propio'));
    if (!investment && !unknown) investorPct = 0;
    const ownPct = consignment || thirdParty ? 0 : unknown ? null : roundMoney(100 - investorPct);
    const type = consignment ? 'consignacion' : thirdParty ? 'tercero' : unknown ? 'sin_definir' : investorPct === 100 ? 'inversor' : investorPct > 0 ? 'compartido' : 'propio';
    const label = type === 'consignacion' ? `Consignación${car.consignedBy ? ` · ${car.consignedBy}` : ''}` : type === 'tercero' ? 'Mandato / tercero'
        : type === 'inversor' ? '100% del inversor' : type === 'compartido' ? `Inversión compartida · AutoSporting ${ownPct}% / inversor ${investorPct}%`
        : type === 'sin_definir' ? 'Titularidad / participación por verificar' : 'Propio de AutoSporting';
    return { type, label, ownPct, investorPct: consignment || thirdParty ? 0 : unknown ? null : investorPct,
        externalPct: consignment || thirdParty ? 100 : unknown ? null : investorPct, ownershipKnown: !unknown,
        investorName: car.investor?.name || joint.partnerName || state.partnerCompany || '' };
}

function acquisitionCost(car) {
    const purchase = money(car.purchasePrice), taken = money(car.tradeInOrigin?.value);
    const resolved = resolveVehicleAcquisitionCost({ ...car, purchasePrice: purchase,
        ...(car.tradeInOrigin ? { tradeInOrigin: { ...car.tradeInOrigin, value: taken } } : {}) });
    if (resolved.hasCost) return { ...resolved, currency: stockCurrency(resolved.source === 'valor_de_toma' && taken && car.tradeInOrigin?.saleId ? car.tradeInOrigin.currency : car.purchaseCurrency) };
    const recorded = money(car.purchasePaymentState?.totalCost);
    if (recorded) return { hasCost: true, amount: recorded, currency: stockCurrency(car.purchasePaymentState.currency), source: 'compra_registrada' };
    return { ...resolved, amount: null, currency: stockCurrency(car.purchaseCurrency) };
}

function purchaseAgreement(car, amount, currency) {
    const agreement = [car.jointOwnership, car.purchasePaymentState].filter(Boolean).find(a => stockCurrency(a.currency) === currency &&
        recordedMoney(a.agencyCost) !== null && recordedMoney(a.partnerContribution) !== null && recordedMoney(a.agencyCost) >= 0 && recordedMoney(a.partnerContribution) >= 0 &&
        roundMoney(recordedMoney(a.agencyCost) + recordedMoney(a.partnerContribution)) === amount);
    return agreement ? { own: recordedMoney(agreement.agencyCost), investor: recordedMoney(agreement.partnerContribution) } : null;
}
const conflictingAgreement = (ownership, agreement) => Boolean(agreement && ((ownership.type === 'inversor' && agreement.own > 0) || (ownership.type === 'propio' && agreement.investor > 0)));
function splitCost(car, ownership, amount, currency, expense) {
    if (['consignacion', 'tercero'].includes(ownership.type)) return { own: 0, investor: 0, thirdParty: amount, unallocated: 0 };
    let ownPct = ownership.ownPct;
    if (expense?.paidBy === 'agency') ownPct = 100;
    else if (expense?.paidBy === 'investor') ownPct = 0;
    else if (expense?.paidBy === 'shared' && expense.agencyPercentage !== undefined) {
        if (pct(expense.agencyPercentage) === null) return { own: null, investor: null, thirdParty: 0, unallocated: amount };
        ownPct = pct(expense.agencyPercentage);
    }
    else if (!expense) {
        const agreement = purchaseAgreement(car, amount, currency);
        if (conflictingAgreement(ownership, agreement)) return { own: null, investor: null, thirdParty: 0, unallocated: amount };
        if (agreement) return { ...agreement, thirdParty: 0, unallocated: 0 };
    }
    if (ownPct === null) return { own: null, investor: null, thirdParty: 0, unallocated: amount };
    const own = roundMoney(amount * ownPct / 100);
    return { own, investor: roundMoney(amount - own), thirdParty: 0, unallocated: 0 };
}

// One valuation feeds server, offline, desktop, mobile and breakdowns. Missing
// values stay explicit; a cost never borrows the asking-price currency.
export function stockValuation(car, simulatedPrice) {
    const ownership = stockOwnership(car), askingCurrency = stockCurrency(car.currency), asking = money(simulatedPrice === undefined ? car.price : simulatedPrice);
    const acquisition = acquisitionCost(car), purchaseCurrency = acquisition.currency;
    const expenses = emptyMoney(), cost = emptyMoney(), ownCost = emptyMoney(), externalCost = emptyMoney(), unallocatedCost = emptyMoney();
    const missingFields = [], excludedFromCapital = ['consignacion', 'tercero'].includes(ownership.type);
    if (!ownership.ownershipKnown) missingFields.push(issue('ownership', 'percentage', 'Falta titularidad o porcentaje de participación verificable.'));
    if (!asking) missingFields.push(issue('asking', 'price', 'Falta precio de venta publicado válido.'));
    if (!askingCurrency) missingFields.push(issue('asking', 'currency', 'Falta moneda del precio publicado.'));
    if (!acquisition.hasCost && !excludedFromCapital) missingFields.push(issue('cost', 'purchasePrice', 'Falta costo real de compra o toma.'));
    if (!purchaseCurrency && (!excludedFromCapital || acquisition.hasCost)) missingFields.push(issue('cost', 'purchaseCurrency', 'Falta moneda del costo de compra o toma.'));
    if (acquisition.hasCost && purchaseCurrency && conflictingAgreement(ownership, purchaseAgreement(car, acquisition.amount, purchaseCurrency))) missingFields.push(issue('cost', 'capitalAgreement', 'El aporte registrado contradice la titularidad del 100%. Revisá el acuerdo de capital.'));
    const components = [];
    if (acquisition.hasCost) components.push({ amount: acquisition.amount, currency: purchaseCurrency });
    for (const [index, expense] of (car.expenses || []).entries()) {
        const value = recordedMoney(expense.amount), currency = stockCurrency(expense.currency);
        if (value === null) missingFields.push(issue('cost', `expenses.${index}.amount`, `Falta importe válido del gasto ${expense.concept || index + 1}.`));
        if (!currency) missingFields.push(issue('cost', `expenses.${index}.currency`, `Falta moneda del gasto ${expense.concept || index + 1}.`));
        if (expense.paidBy === 'shared' && expense.agencyPercentage !== undefined && pct(expense.agencyPercentage) === null) missingFields.push(issue('cost', `expenses.${index}.agencyPercentage`, `Porcentaje inválido del gasto ${expense.concept || index + 1}.`));
        if (value !== null && currency) expenses[currency] = roundMoney(expenses[currency] + value);
        if (value !== null) components.push({ amount: value, currency, expense });
    }
    const costRows = [];
    for (const currency of ['ARS', 'USD']) {
        const known = components.filter(c => c.currency === currency);
        if (!known.length) continue;
        let total = 0, own = 0, investor = 0, thirdParty = 0, unallocated = 0;
        for (const c of known) {
            const split = splitCost(car, ownership, c.amount, currency, c.expense);
            total = roundMoney(total + c.amount); own = roundMoney(own + (split.own ?? 0)); investor = roundMoney(investor + (split.investor ?? 0));
            thirdParty = roundMoney(thirdParty + split.thirdParty); unallocated = roundMoney(unallocated + split.unallocated);
        }
        cost[currency] = total; ownCost[currency] = own; externalCost[currency] = roundMoney(investor + thirdParty); unallocatedCost[currency] = unallocated;
        costRows.push({ currency, total, own, investor, thirdParty, unallocated, allocationComplete: unallocated === 0, excludedFromCapital });
    }
    const unknownCost = components.filter(c => !c.currency);
    if (unknownCost.length || (!acquisition.hasCost && !costRows.length)) costRows.push({ currency: null, total: unknownCost.length ? roundMoney(unknownCost.reduce((sum, c) => sum + c.amount, 0)) : null,
        own: null, investor: null, thirdParty: null, unallocated: null, allocationComplete: false, excludedFromCapital });
    const askingSplit = asking && askingCurrency ? splitCost({}, ownership, asking, askingCurrency, { paidBy: 'shared' }) : { own: null, investor: null, thirdParty: null, unallocated: null };
    return { ...ownership, asking, askingCurrency, hasPrice: Boolean(asking && askingCurrency), purchase: acquisition.hasCost ? acquisition.amount : null,
        purchaseCurrency, hasCost: Boolean(acquisition.hasCost && purchaseCurrency), acquisitionSource: acquisition.source,
        acquisitionSplit: acquisition.hasCost && purchaseCurrency ? splitCost(car, ownership, acquisition.amount, purchaseCurrency) : null, expenses, cost, ownCost, externalCost, unallocatedCost,
        ownAsking: askingSplit.own, externalAsking: askingSplit.investor === null ? null : roundMoney(askingSplit.investor + (askingSplit.thirdParty || 0)), askingSplit, costRows, excludedFromCapital, missingFields,
        costComplete: !missingFields.some(i => i.scope === 'cost' || i.scope === 'ownership'), askingComplete: !missingFields.some(i => i.scope === 'asking' || i.scope === 'ownership') };
}

export function summarizeStock(cars) {
    const unique = [...new Map(cars.map((car, i) => [String(car._id || car.id || `row:${i}`), car])).values()]
        .sort((a, b) => String(a._id || a.id || '').localeCompare(String(b._id || b.id || '')));
    const result = { count: unique.length, available: 0, missingCost: 0, missingPrice: 0, missingOwnership: 0, provisionalPrice: 0,
        asking: emptyMoney(), ownAsking: emptyMoney(), investorAsking: emptyMoney(), thirdPartyAsking: emptyMoney(), unallocatedAsking: emptyMoney(),
        cost: emptyMoney(), ownCost: emptyMoney(), investorCost: emptyMoney(), thirdPartyCost: emptyMoney(), unallocatedCost: emptyMoney(),
        countsByOwnership: { propio: 0, compartido: 0, inversor: 0, consignacion: 0, tercero: 0, sin_definir: 0 }, breakdown: { cost: [], asking: [] }, pending: [], completeness: { cost: true, asking: true, ownership: true } };
    result.ownershipMetrics = Object.fromEntries(Object.keys(result.countsByOwnership).map(type => [type, { count: 0,
        cost: emptyMoney(), ownCost: emptyMoney(), investorCost: emptyMoney(), thirdPartyCost: emptyMoney(), unallocatedCost: emptyMoney(),
        asking: emptyMoney(), ownAsking: emptyMoney(), investorAsking: emptyMoney(), thirdPartyAsking: emptyMoney(), unallocatedAsking: emptyMoney(), completeness: { cost: true, asking: true, ownership: true } }]));
    for (const car of unique) {
        const v = stockValuation(car);
        if (isAvailableStock(car)) result.available++;
        if (!v.costComplete) result.missingCost++;
        if (!v.askingComplete) result.missingPrice++;
        if (!v.ownershipKnown) result.missingOwnership++;
        if (v.asking === 1) result.provisionalPrice++;
        result.countsByOwnership[v.type]++;
        const bucket = result.ownershipMetrics[v.type];
        bucket.count++;
        const vehicleId = String(car._id || car.id || ''), title = `${car.brand || ''} ${car.name || car.model || ''} ${car.year || ''}`.trim();
        const meta = { vehicleId, title, model: `${car.brand || ''} ${car.name || car.model || ''}`.trim(), plate: car.plateOrVin || car.plate || 'Sin patente', ownershipType: v.type, ownershipLabel: v.label };
        for (const missing of v.missingFields) result.pending.push({ ...meta, ...missing });
        for (const row of v.costRows) result.breakdown.cost.push({ ...meta, ...row, key: `${vehicleId}:cost:${row.currency || 'pending'}`, complete: v.costComplete, missingFields: v.missingFields.filter(i => i.scope !== 'asking').map(i => i.message) });
        result.breakdown.asking.push({ ...meta, key: `${vehicleId}:asking`, currency: v.askingCurrency, total: v.asking, ...v.askingSplit, complete: v.askingComplete, missingFields: v.missingFields.filter(i => i.scope !== 'cost').map(i => i.message) });
        if (v.hasPrice) {
            const cur = v.askingCurrency;
            for (const target of [result, bucket]) for (const [key, value] of Object.entries({ asking: v.asking, ownAsking: v.askingSplit.own, investorAsking: v.askingSplit.investor, thirdPartyAsking: v.askingSplit.thirdParty, unallocatedAsking: v.askingSplit.unallocated })) target[key][cur] = roundMoney(target[key][cur] + (value ?? 0));
        }
        for (const row of v.costRows.filter(row => row.currency)) {
            const cur = row.currency;
            for (const target of [result, bucket]) {
                if (!row.excludedFromCapital) target.cost[cur] = roundMoney(target.cost[cur] + row.total);
                for (const [key, value] of Object.entries({ ownCost: row.own, investorCost: row.investor, thirdPartyCost: row.thirdParty, unallocatedCost: row.unallocated })) target[key][cur] = roundMoney(target[key][cur] + (value ?? 0));
            }
        }
        result.completeness.cost &&= v.costComplete; result.completeness.asking &&= v.askingComplete; result.completeness.ownership &&= v.ownershipKnown;
        bucket.completeness.cost &&= v.costComplete; bucket.completeness.asking &&= v.askingComplete; bucket.completeness.ownership &&= v.ownershipKnown;
    }
    return result;
}

export const formatStockMoney = value => ['ARS', 'USD'].filter(cur => Number(value?.[cur]) !== 0).map(cur => `${cur} ${Number(value[cur]).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`).join(' + ') || 'Sin importe registrado';

// History is explicit. Web publication never decides operational availability.
export function filterStockVehicles(cars, params = {}) {
    const words = String(params.search || '').trim().toLowerCase().split(/\s+/).filter(Boolean), rawStatus = String(params.status || '').toLowerCase();
    const wantedStatus = ({ senado: 'reservado', 'señado': 'reservado', vendido_sin_confirmar: 'pausado' })[rawStatus] || rawStatus;
    return cars.filter(car => {
        if (params.tab !== 'historial' && !isAvailableStock(car)) return false;
        if (wantedStatus && wantedStatus !== 'todos' && stockStatus(car) !== wantedStatus) return false;
        if (params.brand && params.brand !== 'todas' && String(car.brand).toLowerCase() !== String(params.brand).toLowerCase()) return false;
        const owner = stockOwnership(car);
        if (params.ownership && params.ownership !== 'todos' && owner.type !== params.ownership) return false;
        if (params.tab === 'consignaciones' && owner.type !== 'consignacion') return false;
        if (params.tab === 'compartidos' && !['compartido', 'inversor'].includes(owner.type)) return false;
        if (params.tab === 'cero_km' && !(/^(0\s?km|nuevo)$/i.test(car.condition || '') || car.km === 0)) return false;
        const publishedML = /^s[ií]$/i.test(car.publishedOnML || '');
        if ((params.ml === 'publicados' && !publishedML) || (params.ml === 'no_publicados' && publishedML)) return false;
        const published = car.visibleEnWeb !== false && isAvailableStock(car);
        if ((params.catalog === 'published' && !published) || (params.catalog === 'unpublished' && published)) return false;
        const fields = ['brand', 'name', 'model', 'description', 'plateOrVin', 'ownerName', 'ownerPhone', 'consignedBy', 'location', 'notes', 'engineNumber', 'chassisNumber'].map(key => String(car[key] || '').toLowerCase());
        fields.push(String(car.investor?.name || '').toLowerCase(), String(car.infoAuto?.versionName || '').toLowerCase());
        return words.every(word => fields.some(value => value.includes(word)) || /^\d+$/.test(word) && (car.year === Number(word) || car.km === Number(word)));
    });
}
