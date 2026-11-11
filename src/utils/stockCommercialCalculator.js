import { stockCapitalOwnership } from './stockOwnership.js';
import { vehicleDisplayCurrency } from './vehicleFinancialDisplay.js';
import { roundMoney } from './saleCommercial.js';
const amount = value => (typeof value === 'number' || typeof value === 'string' && value.trim()) && Number.isFinite(Number(value)) && Number(value) >= 0 ? roundMoney(Number(value)) : null;
export const stockSimulationKey = (currency, id) => currency + ':' + id;
export function buildStockCommercialCalculation(cars, { currency = 'ARS', property = 'todos', search = '', simulations = {}, simulate = false } = {}) {
    const available = cars.filter(car => String(car.status || '').trim().toLowerCase() === 'disponible' && !car.sold);
    const unknownCurrency = available.filter(car => !vehicleDisplayCurrency(car.currency));
    const query = search.trim().toLocaleLowerCase('es');
    const rows = available.filter(car => vehicleDisplayCurrency(car.currency) === currency).map(car => {
        const id = String(car._id), ownership = stockCapitalOwnership(car), isExcluded = ownership.isConsignment || ownership.isThirdParty;
        const originalPrice = amount(car.price), key = stockSimulationKey(currency, id), isSimulated = simulate && Object.hasOwn(simulations, key);
        const currentPrice = isSimulated ? amount(simulations[key]) : originalPrice;
        const total = isExcluded || currentPrice === null ? null : currentPrice;
        const own = total === null ? null : roundMoney(total * ownership.ownPct / 100), investor = total === null ? null : roundMoney(total - own);
        const ownershipLabel = ownership.isConsignment ? 'Consignación · excluida' : ownership.isThirdParty ? 'Tercero · excluido' : ownership.isShared ? 'Compartido · ' + ownership.ownPct + '% agencia / ' + ownership.invPct + '% inversor' : 'Propio · 100% agencia';
        const reason = isExcluded ? 'El precio se conserva como referencia comercial y no integra las participaciones.' : currentPrice === null ? 'Falta un importe válido; no se inventa un valor para sumarlo.' : currentPrice === 0 ? 'Importe cero registrado; requiere revisar la valuación.' : isSimulated ? 'Precio hipotético en su moneda original. No modifica la unidad ni caja.' : ownership.isShared ? 'Precio distribuido según la participación registrada.' : 'Unidad disponible propia; precio registrado en su moneda original.';
        return { id, brand: car.brand || '', name: car.name || car.model || '', year: car.year, plate: car.plateOrVin || 'S/D', status: car.status, currency, ...ownership, isExcluded, originalPrice, currentPrice, isSimulated, total, own, investor, ownershipLabel, reason };
    }).filter(row => {
        if (property === 'excluidos' && !row.isExcluded || property === 'propio' && (row.isExcluded || row.invPct > 0) || property === 'compartido_50' && (row.isExcluded || row.invPct !== 50) || property === 'inversionista_100' && (row.isExcluded || row.invPct !== 100) || property === 'compartido' && (row.isExcluded || !row.isShared)) return false;
        return !query || [row.brand, row.name, row.plate, row.id].some(value => String(value).toLocaleLowerCase('es').includes(query));
    });
    const totals = { total: 0, own: 0, investor: 0, excluded: 0, includedCount: 0, excludedCount: 0, validIncludedCount: 0, missingCount: 0, zeroCount: 0 };
    for (const row of rows) {
        if (row.isExcluded) { totals.excludedCount++; if (row.currentPrice !== null) totals.excluded = roundMoney(totals.excluded + row.currentPrice); }
        else { totals.includedCount++; if (row.currentPrice !== null) { totals.validIncludedCount++; totals.total = roundMoney(totals.total + row.total); totals.own = roundMoney(totals.own + row.own); totals.investor = roundMoney(totals.investor + row.investor); } }
        if (row.currentPrice === null) totals.missingCount++;
        if (row.currentPrice === 0) totals.zeroCount++;
    }
    return { rows, totals, availableCount: available.length, currencyCount: available.filter(car => vehicleDisplayCurrency(car.currency) === currency).length, unknownCurrency };
}
export async function fetchStockCommercialCars({ token, signal, isCurrent = () => true, onProgress, request = globalThis.fetch }) {
    const check = () => { if (!token || signal?.aborted || !isCurrent() || localStorage.getItem('token') !== token) throw new DOMException('Consulta cancelada o sesión modificada.', 'AbortError'); };
    const base = process.env.NODE_ENV === 'production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const cars = [], ids = new Set(); let total = null, limit = 1000, pages = 1;
    for (let page = 1; page <= pages; page++) {
        check();
        const query = new URLSearchParams({ status: 'disponible', sort: 'oldest', limit: String(limit), page: String(page) });
        const response = await request(base + '/api/admin/cars?' + query, { method: 'GET', headers: { Authorization: 'Bearer ' + token }, signal, cache: 'no-store' });
        const data = await response.json(); check();
        if (!response.ok) throw Error(data.message || 'No se pudo consultar el desglose de Stock.');
        if (!Array.isArray(data.cars) || !Number.isSafeInteger(data.total) || data.total < 0 || !Number.isSafeInteger(data.limit) || data.limit < 1 || data.limit > 1000 || data.page !== page) throw Error('La consulta paginada de Stock no tiene un formato válido.');
        if (total !== null && (data.total !== total || data.limit !== limit)) throw Error('El stock cambió mientras se consultaban sus páginas. Actualizá para obtener el conjunto completo.');
        total = data.total; limit = data.limit; pages = Math.max(1, Math.ceil(total / limit));
        if (data.cars.length !== Math.min(limit, Math.max(0, total - (page - 1) * limit))) throw Error('La consulta llegó incompleta. Actualizá antes de utilizar los totales.');
        for (const car of data.cars) { const id = String(car._id || ''); if (!id || ids.has(id)) throw Error('Las páginas de Stock se superponen o cambiaron. Actualizá antes de utilizar los totales.'); ids.add(id); cars.push(car); }
        onProgress?.({ loaded: cars.length, total, page, pages });
    }
    check(); if (cars.length !== total) throw Error('Faltan unidades para completar el desglose.');
    return cars;
}
