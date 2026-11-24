import { summarizeStock, stockCurrency, stockOwnership } from '../utils/inventoryStock.js';
import { parseArgentineMoney } from '../utils/saleCommercial.js';

export const STOCK_RECOVERY_VERSION = 'stock-recovery-v1';
const TIMEZONE = 'America/Argentina/Buenos_Aires';
const own = (value, key) => value != null && Object.prototype.hasOwnProperty.call(value, key);
const array = value => Array.isArray(value) ? value : [];
const records = value => array(value).filter(item => item && typeof item === 'object' && !Array.isArray(item));
const unreadableArray = value => value !== undefined && value !== null && (!Array.isArray(value)
    || value.some(item => !item || typeof item !== 'object' || Array.isArray(item)));
const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const idOf = value => String(value?._id ?? value?.id ?? value ?? '');
const dateOf = value => {
    if (value === undefined || value === null || value === '') return null;
    const businessDate = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = new Date(businessDate ? value + 'T15:00:00.000Z' : value);
    return Number.isFinite(date.getTime()) && (!businessDate || date.toISOString().slice(0, 10) === value) ? date : null;
};
const periodOf = date => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit' }).formatToParts(date).map(part => [part.type, part.value]));
const get = (object, field) => field.split('.').reduce((value, part) => value?.[part], object);
const numberOf = value => {
    if (value === undefined || value === null || value === '' || typeof value === 'boolean') return null;
    const number = parseArgentineMoney(value); return Number.isFinite(number) && number >= 0 ? number : null;
};
const normalizedStatus = value => {
    const text = String(value || '').trim().toLowerCase();
    return ({ disponible: 'Disponible', vendido: 'Vendido', reservado: 'Reservado', 'señado': 'Reservado', senado: 'Reservado', pausado: 'Pausado', cancelado: 'Cancelado', anulado: 'Anulado', eliminado: 'Eliminado' })[text] || null;
};
const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };

function periodsBetween(from, through, now) {
    const valid = value => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && value.slice(0, 4) >= '1900';
    const parts = periodOf(now), current = `${parts.year}-${parts.month}`;
    if (!valid(from) || !valid(through) || from > through || through > current) fail('Elegí un rango histórico válido hasta el mes actual.');
    const result = [];
    for (let period = from; period <= through;) {
        const [year, month] = period.split('-').map(Number);
        // Buenos Aires has a fixed UTC-03 offset throughout the supported CRM history.
        const end = new Date(Date.UTC(year, month, 1, 3) - 1);
        result.push({ period, cutoff: end > now ? now : end });
        if (result.length > 60) fail('La recuperación admite hasta 60 meses por vez.');
        const next = new Date(Date.UTC(year, month, 15));
        period = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    return result;
}

function logsFor(car, audits) {
    const rows = records(car.auditLog).map(log => ({ ...log, at: dateOf(log.date || log.createdAt), basis: 'vehicle-audit' }));
    for (const audit of audits) {
        if (idOf(audit.entityId) !== idOf(car) || !/^(car|vehicle|vehiculo)$/i.test(String(audit.entityType || 'Car'))) continue;
        for (const change of records(audit.metadata?.changes)) rows.push({ ...change, action: audit.action, at: dateOf(audit.createdAt || audit.date), basis: 'system-audit' });
    }
    const unique = new Map();
    for (const log of rows.filter(log => log.at)) {
        const key = JSON.stringify([log.field, log.at.toISOString(), log.oldValue, log.newValue]);
        if (!unique.has(key)) unique.set(key, log);
    }
    return [...unique.values()].sort((a, b) => a.at - b.at);
}

function anchorRows(anchors, sales) {
    const rows = [];
    for (const anchor of anchors) {
        const at = dateOf(anchor.capturedAt || anchor.asOf || anchor.checkedAt);
        if (!at) continue;
        const values = records(anchor.cars || anchor.vehicles || anchor.data?.cars || (anchor.vehicle ? [anchor.vehicle] : []));
        for (const value of values) rows.push({ carId: idOf(value), value, at, basis: 'dated-stock-copy' });
    }
    // These are the explicit financial snapshots in vehicle replacements. A normal
    // sale is not a purchase-cost snapshot and must never be treated as one.
    for (const sale of sales) for (const change of records(sale.vehicleChangeHistory)) {
        const at = dateOf(change.date); if (!at) continue;
        for (const [key, id] of [['previousVehicleSnapshot', change.previousVehicleId], ['newVehicleSnapshot', change.newVehicleId]]) {
            if (change[key] && id) rows.push({ carId: idOf(id), value: change[key], at, basis: 'sale-vehicle-snapshot' });
        }
    }
    return rows;
}

function fieldEvidence(field, logs, anchors, cutoff) {
    const relevant = logs.filter(log => log.field === field);
    const after = relevant.find(log => log.at > cutoff && own(log, 'oldValue'));
    const before = [...relevant].reverse().find(log => log.at <= cutoff && own(log, 'newValue'));
    const anchor = [...anchors].filter(row => row.at <= cutoff && get(row.value, field) !== undefined).sort((a, b) => b.at - a.at)[0];
    // An oldValue in the next known change brackets the cutoff. It is evidence,
    // not a guarantee that unlogged changes never occurred (all rows stay partial).
    if (after) return { value: copy(after.oldValue), basis: after.basis + ':old', at: after.at, documented: true };
    if (before && (!anchor || before.at >= anchor.at)) return { value: copy(before.newValue), basis: before.basis + ':new', at: before.at, documented: true };
    return anchor ? { value: copy(get(anchor.value, field)), basis: anchor.basis, at: anchor.at, documented: true } : null;
}

function moneyPair(value, currency) {
    if (value && typeof value === 'object') return moneyPair(value.amount ?? value.value ?? value.purchasePrice ?? value.price, value.currency ?? value.purchaseCurrency ?? currency);
    if (typeof value === 'string') {
        const match = value.trim().match(/^(ARS|USD|U\$S|US\$|\$)\s+([\d.,\s]+)$/i);
        if (match) return moneyPair(match[2].replace(/\s/g, ''), match[1]);
    }
    const amount = numberOf(value), code = stockCurrency(currency);
    return amount !== null && amount > 0 && code ? { amount, currency: code } : null;
}

function financialEvidence(car, logs, anchors, cutoff, invoices, sales) {
    const resolve = (field, currencyField) => {
        const amount = fieldEvidence(field, logs, anchors, cutoff), currency = fieldEvidence(currencyField, logs, anchors, cutoff);
        const pair = amount && moneyPair(amount.value, currency?.value);
        // A dated snapshot supplies both fields from one coherent observation.
        const coherent = amount?.basis.includes('snapshot') || amount?.basis === 'dated-stock-copy';
        const actual = pair || (coherent ? moneyPair(amount.value, get(anchors.find(row => row.at.getTime() === amount.at.getTime() && get(row.value, field) !== undefined)?.value, currencyField)) : null);
        return actual ? { ...actual, basis: amount.basis, at: amount.at } : null;
    };
    let cost = resolve('purchasePrice', 'purchaseCurrency');
    const price = resolve('price', 'currency');
    if (!cost) {
        const invoice = invoices.filter(row => idOf(row.carId) === idOf(car) && row.direction === 'purchase'
            && dateOf(row.invoiceDate) && dateOf(row.invoiceDate) <= cutoff
            // Existing invoice history stores the new edited fields, not their
            // old values. Later financial/date edits cannot safely be reversed.
            && !unreadableArray(row.history)
            && records(row.history).every(change => dateOf(change.at))
            && !records(row.history).some(change => dateOf(change.at) > cutoff
                && ['totalAmount', 'currency', 'invoiceDate'].some(field => own(change.changes, field)))
            && !(row.status === 'annulled' && (!dateOf(row.annulledAt) || dateOf(row.annulledAt) <= cutoff)))
            .sort((a, b) => dateOf(b.invoiceDate) - dateOf(a.invoiceDate))[0];
        const pair = invoice && moneyPair(invoice.totalAmount, invoice.currency);
        if (pair) cost = { ...pair, basis: 'purchase-invoice', at: dateOf(invoice.invoiceDate) };
    }
    if (!cost) for (const sale of sales) {
        const item = records(sale.tradeIns).find(row => idOf(row.linkedStockCarId) === idOf(car));
        const at = dateOf(item?.enteredStockAt || item?.receivedAt);
        const pair = item && moneyPair(item.estimatedValue, item.currency);
        if (at && at <= cutoff && pair && sale.status !== 'cancelada') { cost = { ...pair, basis: 'dated-trade-in-contract', at }; break; }
    }
    const ownership = ownershipEvidence(logs, anchors, cutoff);
    return { cost, price, ownership };
}

function expenseKey(value) {
    return value?._id ? 'id:' + idOf(value._id) : JSON.stringify([value?.amount, value?.currency, value?.date, value?.concept || '']);
}
function historicalExpenses(car, logs, anchors, cutoff) {
    const arrays = logs.filter(log => log.field === 'expenses' && (Array.isArray(log.oldValue) || Array.isArray(log.newValue)));
    const proof = fieldEvidence('expenses', arrays, anchors, cutoff);
    const documented = new Map(records(proof?.value).map(expense => [expenseKey(expense), expense]));
    const additions = logs.filter(log => log.field === 'expenses' && log.action === 'GASTO' && log.newValue && !Array.isArray(log.newValue));
    for (const addition of additions) if (addition.at <= cutoff && (!proof || addition.at > proof.at)) {
        const expense = { ...copy(addition.newValue), date: addition.newValue.date || addition.at.toISOString() };
        documented.set(expenseKey(expense), expense);
    }
    const notYetAdded = new Set(additions.filter(log => log.at > cutoff).map(log => expenseKey(log.newValue)));
    const restored = [...documented.values()];
    const semanticKey = expense => JSON.stringify([expense?.concept || '', expense?.currency, dateOf(expense?.date)?.toISOString() || null]);
    const knownSemantics = new Set(restored.map(semanticKey));
    const unsupported = Array.isArray(proof?.value) ? [] : records(car.expenses).filter(expense => !notYetAdded.has(expenseKey(expense))
        && !documented.has(expenseKey(expense)) && !knownSemantics.has(semanticKey(expense)));
    return { documented: restored, estimates: [...restored, ...unsupported], unsupported: unsupported.length };
}

function ownershipEvidence(logs, anchors, cutoff) {
    const whole = [...anchors].filter(row => row.at <= cutoff && row.basis === 'dated-stock-copy'
        && (own(row.value, 'agencyOwned') || own(row.value, 'consignedBy'))).sort((a, b) => b.at - a.at)[0];
    const fields = ['agencyOwned', 'investor', 'investor.percentage', 'consignedBy', 'consignador', 'jointOwnership', 'purchasePaymentState', 'isSharedInvestment', 'origen', 'origin'];
    const value = whole ? copy(whole.value) : {};
    let touched = false;
    for (const field of fields) {
        const proof = fieldEvidence(field, logs, anchors, cutoff);
        if (!proof || (!whole && !proof.basis.includes('audit'))) continue;
        let target = value; const parts = field.split('.');
        for (const part of parts.slice(0, -1)) target = target[part] ||= {};
        target[parts.at(-1)] = proof.value; touched = true;
    }
    if (!whole && !touched) return null;
    // A lone 100%-owned flag cannot prove that an unlogged investor percentage
    // was zero. Whole snapshots explicitly retain absence/presence of investors.
    const validPct = amount => numberOf(amount) !== null && numberOf(amount) <= 100;
    const hasPct = validPct(value.investor?.percentage) || validPct(value.jointOwnership?.partnerPercentage)
        || value.jointOwnership?.hasPartner === true && validPct(value.jointOwnership?.agencyPercentage)
        || value.purchasePaymentState?.isSharedInvestment === true && validPct(value.purchasePaymentState?.partnerPercentage);
    const consignor = Boolean(value.consignedBy || value.consignador);
    if (!whole && !hasPct && !consignor) return null;
    if (!stockOwnership(value).ownershipKnown) return null;
    return { value, basis: whole?.basis || 'ownership-audit' };
}

function statusAt(car, logs, cutoff, now, sales, reservations) {
    const proof = fieldEvidence('status', logs, [], cutoff);
    let result = proof && normalizedStatus(proof.value) ? { status: normalizedStatus(proof.value), basis: proof.basis, supported: true,
        at: proof.basis.endsWith(':old') ? cutoff : proof.at } : null;
    let saleFact = null;
    for (const sale of sales) {
        let carId = idOf(sale.vehicleId);
        for (const change of records(sale.vehicleChangeHistory).sort((a, b) => (dateOf(b.date) || 0) - (dateOf(a.date) || 0))) {
            if (dateOf(change.date) > cutoff) carId = idOf(change.previousVehicleId);
        }
        if (carId !== idOf(car)) continue;
        const at = dateOf(sale.saleDate); if (!at || at > cutoff) continue;
        const saleLog = fieldEvidence('status', records(sale.saleAuditLog).map(log => ({ ...log, at: dateOf(log.date), basis: 'sale-audit' })).filter(log => log.at).sort((a, b) => a.at - b.at), [], cutoff);
        let status = String(saleLog?.value || sale.status || '').toLowerCase();
        if (!saleLog && status === 'cancelada' && dateOf(sale.cancelledAt) > cutoff) status = 'confirmada';
        if (['borrador', 'cancelada', ''].includes(status)) continue;
        const fact = { status: ['señado', 'senado'].includes(status) ? 'Reservado' : 'Vendido', at, basis: 'dated-sale', supported: true };
        if (!saleFact || fact.at > saleFact.at) saleFact = fact;
    }
    if (saleFact && (!result || saleFact.at > result.at)) result = saleFact;
    else if (saleFact?.status === 'Vendido' && result?.status === 'Disponible' && result.basis.endsWith(':old')) {
        return { status: null, supported: false, basis: 'conflicting-sale-and-status', warning: 'Venta vigente y auditoría de disponibilidad contradictorias.' };
    }
    if (result) return result;
    for (const reservation of reservations) {
        if (idOf(reservation.vehicleId) !== idOf(car)) continue;
        const start = dateOf(reservation.depositDate || reservation.createdAt), end = dateOf(reservation.expiresAt);
        if (!start || start > cutoff || !end || end <= cutoff) continue;
        const proof = fieldEvidence('status', records(reservation.reservationAuditLog).map(log => ({ ...log, at: dateOf(log.date), basis: 'reservation-audit' })).filter(log => log.at).sort((a, b) => a.at - b.at), [], cutoff);
        const status = String(proof?.value || reservation.status || '').toLowerCase();
        if (status === 'activa') return { status: 'Reservado', basis: 'dated-reservation', at: start, supported: true };
    }
    const soldAtProof = fieldEvidence('soldAt', logs, [], cutoff);
    const soldAt = dateOf(soldAtProof ? soldAtProof.value : car.soldAt);
    if (soldAt && soldAt <= cutoff) return { status: 'Vendido', basis: soldAtProof?.basis || 'recorded-soldAt', supported: true };
    const current = car.sold ? 'Vendido' : normalizedStatus(car.status);
    if (cutoff.getTime() === now.getTime()) return { status: current, basis: 'current-record', supported: true };
    if (current === 'Disponible' || soldAt && soldAt > cutoff) return { status: 'Disponible', basis: 'inferred-availability', supported: false };
    return { status: null, basis: 'historical-status-missing', supported: false, warning: 'No hay estado histórico suficiente para incluir esta unidad.' };
}

function compact(metrics) {
    return { version: 'available-stock-v1', scope: 'available-global', count: metrics.count,
        byCurrency: Object.fromEntries(['ARS', 'USD'].map(currency => [currency, {
            cost: { total: metrics.cost[currency], own: metrics.ownCost[currency], investors: metrics.investorCost[currency], unallocated: metrics.unallocatedCost[currency], thirdPartyExcluded: metrics.thirdPartyCost[currency] },
            published: { total: metrics.asking[currency], own: metrics.ownAsking[currency], investors: metrics.investorAsking[currency], unallocated: metrics.unallocatedAsking[currency], thirdParty: metrics.thirdPartyAsking[currency] }
        }])), completeness: { ...metrics.completeness }, missingCost: metrics.missingCost, missingPrice: metrics.missingPrice, missingOwnership: metrics.missingOwnership };
}

function allVehicles(cars, trash) {
    const map = new Map(cars.filter(car => idOf(car)).map(car => [idOf(car), { car: copy(car), deletedAt: null }]));
    for (const item of trash) {
        if (!/^(Car|Vehicle|Vehiculo)$/i.test(String(item.entityType || ''))) continue;
        const car = item.snapshot; if (!car || typeof car !== 'object' || Array.isArray(car)) continue;
        const id = idOf(car._id || item.entityId); if (!id || map.has(id)) continue;
        map.set(id, { car: { ...copy(car), _id: id }, deletedAt: dateOf(item.createdAt) });
    }
    return [...map.values()].sort((a, b) => idOf(a.car).localeCompare(idOf(b.car)));
}

/** Pure recovery: no database, network, current-time substitution or writes. */
export function buildStockRecovery({ cars = [], sales = [], reservations = [], audits = [], trash = [], invoices = [], observations = [], anchors = [], from = '2026-05', through, now = new Date() } = {}) {
    now = dateOf(typeof now === 'function' ? now() : now); if (!now) fail('Fecha de recuperación inválida.');
    const parts = periodOf(now); through ||= `${parts.year}-${parts.month}`;
    const rawSources = { cars, sales, reservations, audits, trash, invoices, observations, anchors };
    const unreadableSources = Object.values(rawSources).filter(unreadableArray).length;
    ({ cars, sales, reservations, audits, trash, invoices, observations, anchors } = Object.fromEntries(Object.entries(rawSources).map(([key, value]) => [key, records(value)])));
    const sourceCounts = Object.fromEntries(Object.entries({ cars, sales, reservations, audits, trash, invoices, observations, anchors }).map(([key, rows]) => [key, rows.length]));
    const vehicles = allVehicles(cars, trash), historicalAnchors = anchorRows(anchors, sales);
    const unreadableHistories = unreadableSources + vehicles.reduce((sum, value) => sum + Number(unreadableArray(value.car.auditLog)) + Number(unreadableArray(value.car.expenses)), 0)
        + sales.reduce((sum, value) => sum + Number(unreadableArray(value.vehicleChangeHistory)) + Number(unreadableArray(value.saleAuditLog)) + Number(unreadableArray(value.tradeIns)), 0)
        + reservations.filter(value => unreadableArray(value.reservationAuditLog)).length + invoices.filter(value => unreadableArray(value.history)).length
        + audits.filter(value => unreadableArray(value.metadata?.changes)).length;
    const prepared = vehicles.map(value => ({ ...value, logs: logsFor(value.car, audits), anchors: historicalAnchors.filter(anchor => anchor.carId === idOf(value.car)) }));
    const rows = periodsBetween(from, through, now).map(({ period, cutoff }) => {
        const coverage = { totalVehicles: vehicles.length, candidateVehicles: 0, availableVehicles: 0, availableSupported: 0, availableInferred: 0,
            excludedVehicles: 0, uncertainVehicles: 0, missingIntakeDate: 0, documentedCostVehicles: 0, estimatedCostVehicles: 0, missingCostVehicles: 0,
            documentedPriceVehicles: 0, estimatedPriceVehicles: 0, missingPriceVehicles: 0, documentedOwnershipVehicles: 0, estimatedOwnershipVehicles: 0,
            missingOwnershipVehicles: 0, undatedExpenses: 0, documentedExpenseVehicles: 0, unverifiedExpenses: 0, unusableExpenses: 0, unreadableHistories };
        const included = [], estimated = [], vehicleEvidence = [];
        for (const { car, logs, anchors: vehicleAnchors, deletedAt } of prepared) {
            const warnings = [], intakeProof = fieldEvidence('createdAt', logs, [], cutoff);
            const intake = dateOf(intakeProof ? intakeProof.value : car.createdAt);
            const evidence = { vehicleId: idOf(car), included: false, status: null, statusBasis: null, intakeDate: intake?.toISOString() || null,
                intakeBasis: intakeProof?.basis || (intake ? 'recorded-createdAt' : 'missing'), costBasis: null, priceBasis: null, ownershipBasis: null, warnings };
            vehicleEvidence.push(evidence);
            if (unreadableArray(car.auditLog) || unreadableArray(car.expenses)) warnings.push('Parte del historial de esta unidad tiene formato ilegible y se ignoró.');
            if (!intake) { coverage.missingIntakeDate++; coverage.uncertainVehicles++; warnings.push('Falta fecha de ingreso utilizable.'); continue; }
            if (intake > cutoff) {
                const earlierMovement = logs.some(log => log.at <= cutoff) || sales.some(sale => idOf(sale.vehicleId) === idOf(car) && dateOf(sale.saleDate) && dateOf(sale.saleDate) <= cutoff);
                if (earlierMovement) { coverage.uncertainVehicles++; warnings.push('La fecha de alta es posterior a movimientos conservados; no se puede fijar el ingreso histórico.'); }
                else coverage.excludedVehicles++;
                continue;
            }
            if (deletedAt && deletedAt <= cutoff) { coverage.excludedVehicles++; continue; }
            coverage.candidateVehicles++;
            const status = statusAt(car, logs, cutoff, now, sales, reservations);
            Object.assign(evidence, { status: status.status, statusBasis: status.basis });
            if (status.warning) warnings.push(status.warning);
            if (!status.status) { coverage.uncertainVehicles++; continue; }
            if (status.status !== 'Disponible') { coverage.excludedVehicles++; continue; }
            evidence.included = true; coverage.availableVehicles++;
            if (status.supported) coverage.availableSupported++; else coverage.availableInferred++;
            const financial = financialEvidence(car, logs, vehicleAnchors, cutoff, invoices, sales);
            const resolved = { _id: idOf(car), status: 'Disponible', sold: false, expenses: [] };
            if (financial.ownership) {
                for (const field of ['agencyOwned', 'investor', 'consignedBy', 'consignador', 'jointOwnership', 'isSharedInvestment', 'origen', 'origin']) {
                    if (financial.ownership.value[field] !== undefined) resolved[field] = copy(financial.ownership.value[field]);
                }
                const agreement = financial.ownership.value.purchasePaymentState;
                if (agreement) {
                    // Ownership agreements may be used, but totalCost is not an
                    // alternative dated acquisition proof for missing purchasePrice.
                    resolved.purchasePaymentState = Object.fromEntries(['isSharedInvestment', 'partnerPercentage', 'agencyCost', 'partnerContribution', 'currency']
                        .filter(field => agreement[field] !== undefined).map(field => [field, copy(agreement[field])]));
                }
                coverage.documentedOwnershipVehicles++; evidence.ownershipBasis = financial.ownership.basis;
            } else { coverage.missingOwnershipVehicles++; evidence.ownershipBasis = 'unverified'; }
            if (financial.cost) { resolved.purchasePrice = financial.cost.amount; resolved.purchaseCurrency = financial.cost.currency; coverage.documentedCostVehicles++; evidence.costBasis = financial.cost.basis; }
            else { coverage.missingCostVehicles++; evidence.costBasis = 'missing-dated-cost'; }
            if (financial.price) { resolved.price = financial.price.amount; resolved.currency = financial.price.currency; coverage.documentedPriceVehicles++; evidence.priceBasis = financial.price.basis; }
            else { coverage.missingPriceVehicles++; evidence.priceBasis = 'missing-dated-price'; }
            const expenses = historicalExpenses(car, logs, vehicleAnchors, cutoff);
            coverage.unverifiedExpenses += expenses.unsupported;
            for (const expense of expenses.documented) {
                const at = dateOf(expense.date);
                if (!at) { coverage.undatedExpenses++; continue; }
                if (at <= cutoff && numberOf(expense.amount) !== null && stockCurrency(expense.currency)) {
                    // Preserve attribution only when it is explicitly stored on the dated expense.
                    resolved.expenses.push({ amount: numberOf(expense.amount), currency: stockCurrency(expense.currency), paidBy: expense.paidBy, agencyPercentage: expense.agencyPercentage });
                } else if (at <= cutoff) coverage.unusableExpenses++;
            }
            if (resolved.expenses.length) coverage.documentedExpenseVehicles++;
            const estimate = { ...copy(car), _id: idOf(car), status: 'Disponible', sold: false,
                expenses: expenses.estimates.filter(expense => dateOf(expense.date) && dateOf(expense.date) <= cutoff) };
            if (financial.ownership) {
                for (const field of ['agencyOwned', 'investor', 'consignedBy', 'consignador', 'jointOwnership', 'purchasePaymentState', 'isSharedInvestment', 'origen', 'origin']) {
                    delete estimate[field];
                    if (resolved[field] !== undefined) estimate[field] = copy(resolved[field]);
                }
            }
            if (financial.cost) { estimate.purchasePrice = financial.cost.amount; estimate.purchaseCurrency = financial.cost.currency; delete estimate.tradeInOrigin; delete estimate.purchasePaymentState; }
            if (financial.price) { estimate.price = financial.price.amount; estimate.currency = financial.price.currency; }
            if (!financial.cost && moneyPair(car.purchasePrice, car.purchaseCurrency)) coverage.estimatedCostVehicles++;
            if (!financial.price && moneyPair(car.price, car.currency)) coverage.estimatedPriceVehicles++;
            if (!financial.ownership) coverage.estimatedOwnershipVehicles++;
            included.push(resolved); estimated.push(estimate);
        }
        const stockCapital = compact(summarizeStock(included));
        const estimateCapital = compact(summarizeStock(estimated));
        for (const currency of ['ARS', 'USD']) {
            const knownCost = included.some(car => car.purchaseCurrency === currency && car.purchasePrice > 0 || car.expenses.some(expense => expense.currency === currency));
            const knownPrice = included.some(car => car.currency === currency && car.price > 0);
            if (!knownCost && (coverage.missingCostVehicles || !included.length)) for (const key of Object.keys(stockCapital.byCurrency[currency].cost)) stockCapital.byCurrency[currency].cost[key] = null;
            if (!knownPrice && (coverage.missingPriceVehicles || !included.length)) for (const key of Object.keys(stockCapital.byCurrency[currency].published)) stockCapital.byCurrency[currency].published[key] = null;
            if (coverage.missingOwnershipVehicles) for (const kind of ['cost', 'published']) for (const key of ['own', 'investors']) {
                if (stockCapital.byCurrency[currency][kind][key] === 0) stockCapital.byCurrency[currency][kind][key] = null;
            }
        }
        // These legacy sources cannot establish complete lifecycle/change coverage.
        stockCapital.completeness = { cost: false, asking: false, ownership: false };
        const warnings = [
            'Reconstrucción parcial: puede haber movimientos o unidades eliminadas sin historial conservado.',
            'No se reconstruyeron caja, cartera, obligaciones ni capital propio neto.'
        ];
        if (!coverage.availableVehicles) warnings.push('No hay unidades disponibles reconstruibles para este corte; un importe vacío no significa stock cero.');
        if (coverage.uncertainVehicles) warnings.push(`${coverage.uncertainVehicles} unidades quedaron fuera por fecha o estado histórico insuficiente.`);
        if (coverage.undatedExpenses) warnings.push(`${coverage.undatedExpenses} gastos sin fecha quedaron fuera del cálculo.`);
        if (coverage.unverifiedExpenses) warnings.push(`${coverage.unverifiedExpenses} gastos actuales sin auditoría temporal suficiente figuran solo en estimaciones.`);
        if (coverage.unusableExpenses) warnings.push(`${coverage.unusableExpenses} gastos documentados sin importe o moneda utilizables quedaron fuera del cálculo.`);
        if (coverage.unreadableHistories) warnings.push(`${coverage.unreadableHistories} fuentes o historiales con formato ilegible se ignoraron; la cobertura puede ser menor.`);
        const assumptions = ['Se usan fechas y cambios conservados, sin asegurar que la auditoría histórica sea exhaustiva.'];
        if (coverage.availableInferred) assumptions.push(`${coverage.availableInferred} unidades se consideran disponibles por inferencia de sus registros; la cantidad es provisional.`);
        if (coverage.estimatedCostVehicles || coverage.estimatedPriceVehicles || coverage.estimatedOwnershipVehicles) assumptions.push('Los valores actuales sin respaldo temporal figuran únicamente como estimación separada; no integran los importes recuperados.');
        return { period, asOf: cutoff.toISOString(), stockCapital,
            quality: { status: 'partial', costStatus: 'partial', publishedStatus: 'partial', missingCost: coverage.missingCostVehicles,
                missingPrice: coverage.missingPriceVehicles, missingOwnership: coverage.missingOwnershipVehicles,
                message: 'Stock reconstruido parcialmente con fuentes disponibles. Los importes son subtotales documentados y no permiten afirmar crecimiento completo.' },
            recovery: { version: STOCK_RECOVERY_VERSION, reconstructedAt: now.toISOString(), cutoffAt: cutoff.toISOString(), method: 'dated-records-and-audit-reversal',
                coverage, sourceCounts: { ...sourceCounts }, assumptions, warnings, vehicleEvidence,
                estimates: { label: 'Estimación indicativa con datos actuales no acreditados al corte histórico', stockCapital: estimateCapital } } };
    });
    return { rows, sourceCounts };
}
