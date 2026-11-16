import Car from '../models/Car.js';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions.js';
import { isActiveStock, isAvailableStock, stockOwnership, stockStatus, summarizeStock } from '../utils/inventoryStock.js';

export const canReadStockFinances = user => hasPermission(user, PERMISSIONS.FINANZAS_READ);
const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const catalogQuery = () => ({ visibleEnWeb: { $ne: false }, sold: { $ne: true }, status: { $nin: [/^vendido$/i, /^reservado$/i, /^pausado$/i, /^cancelado$/i, /^eliminado$/i] } });
const exact = value => new RegExp(`^${escapeRegex(value)}$`, 'i');

export function buildStockQuery(params = {}) {
    const { search = '', status = '', brand = '', tab = '', ml = '', catalog = 'all', ownership = 'todos' } = params;
    if (!['all', 'published', 'unpublished'].includes(catalog)) throw Object.assign(new Error('El filtro de publicación en el catálogo no es válido.'), { status: 400 });
    if (!['todos', 'propio', 'compartido', 'inversor', 'tercero', 'consignacion'].includes(ownership)) throw Object.assign(new Error('El tipo de propiedad no es válido.'), { status: 400 });
    const clauses = [];
    for (const word of String(search).trim().split(/\s+/).filter(Boolean)) {
        const regex = new RegExp(escapeRegex(word), 'i');
        const conditions = ['brand', 'name', 'model', 'description', 'plateOrVin', 'ownerName', 'ownerPhone', 'consignedBy', 'location', 'notes', 'investor.name', 'engineNumber', 'chassisNumber', 'infoAuto.versionName'].map(key => ({ [key]: regex }));
        if (/^\d+$/.test(word)) conditions.push({ year: Number(word) }, { km: Number(word) });
        clauses.push({ $or: conditions });
    }
    if (status && status !== 'todos') {
        const mapped = ({ senado: 'reservado', vendido_sin_confirmar: 'pausado' })[String(status).toLowerCase()] || String(status).toLowerCase();
        if (mapped === 'sin_estado') clauses.push({ $or: [{ status: { $in: [null, '', 'sin_estado'] } }, { status: { $exists: false } }], sold: { $ne: true } });
        else if (mapped === 'vendido') clauses.push({ $or: [{ status: exact('vendido') }, { sold: true }] });
        else clauses.push({ status: exact(mapped), sold: { $ne: true } });
    }
    if (brand && brand !== 'todas') clauses.push({ brand: exact(brand) });
    const consignment = { consignedBy: { $exists: true, $nin: [null, ''] } };
    const notConsigned = { $or: [{ consignedBy: { $exists: false } }, { consignedBy: { $in: [null, ''] } }] };
    const noInvestor = { $or: [{ 'investor.percentage': { $exists: false } }, { 'investor.percentage': { $lte: 0 } }] };
    const own = { agencyOwned: { $ne: false } };
    if (tab === 'consignaciones') clauses.push(consignment);
    if (tab === 'compartidos') clauses.push(notConsigned, { 'investor.percentage': { $gt: 0 } });
    if (tab === 'cero_km') clauses.push({ $or: [{ condition: /^(0\s?km|nuevo)$/i }, { km: 0 }] });
    if (ownership === 'consignacion') clauses.push(consignment);
    if (ownership === 'propio') clauses.push(notConsigned, noInvestor, own);
    if (ownership === 'compartido') clauses.push(notConsigned, { 'investor.percentage': { $gt: 0, $lt: 100 } });
    if (ownership === 'inversor') clauses.push(notConsigned, { 'investor.percentage': { $gte: 100 } });
    if (ownership === 'tercero') clauses.push(notConsigned, noInvestor, { agencyOwned: false });
    if (ml === 'publicados') clauses.push({ publishedOnML: /^s[ií]$/i });
    if (ml === 'no_publicados') clauses.push({ publishedOnML: { $not: /^s[ií]$/i } });
    if (catalog === 'published') clauses.push(catalogQuery());
    if (catalog === 'unpublished') clauses.push({ $nor: [catalogQuery()] });
    return clauses.length ? { $and: clauses } : {};
}

export function serializeStockCar(car, financialAccess) {
    const value = typeof car.toObject === 'function' ? car.toObject() : { ...car };
    value.financialAccess = Boolean(financialAccess);
    if (!financialAccess) {
        for (const key of ['purchasePrice', 'purchaseCurrency', 'purchasePaymentState', 'expenses', 'auditLog', 'consignmentExpectedPrice', 'consignmentValuation', 'consignmentCommission', 'consignmentGoal']) delete value[key];
        if (value.tradeInOrigin) { value.tradeInOrigin = { ...value.tradeInOrigin }; delete value.tradeInOrigin.value; }
    }
    return value;
}

export async function getAdminStock(params = {}, user = null) {
    const query = buildStockQuery(params);
    const limit = Math.min(500, Math.max(1, Number.parseInt(params.limit, 10) || 20));
    const page = Math.max(1, Number.parseInt(params.page, 10) || 1);
    const financialAccess = canReadStockFinances(user);
    const projection = 'status sold currency purchaseCurrency price purchasePrice investor agencyOwned consignedBy km condition visibleEnWeb expenses tradeInOrigin';
    const [allCars, filteredCars, cars, total, brands] = await Promise.all([
        Car.find({}).select(projection).lean(), Car.find(query).select(projection).lean(),
        Car.find(query).select('-auditLog').populate('consignmentSeller', 'name email').sort({ order: 1, createdAt: -1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
        Car.countDocuments(query), Car.distinct('brand')
    ]);
    const active = allCars.filter(isActiveStock);
    const available = allCars.filter(isAvailableStock);
    const availableMetrics = summarizeStock(available);
    const activeMetrics = summarizeStock(active);
    const filteredMetrics = summarizeStock(filteredCars);
    const summary = { total: active.length, totalStock: active.length, inventoryCount: allCars.length,
        disponibles: available.length, reservados: active.filter(c => stockStatus(c) === 'reservado').length,
        pausados: active.filter(c => stockStatus(c) === 'pausado').length,
        sinEstado: active.filter(c => !['disponible', 'reservado', 'pausado'].includes(stockStatus(c))).length,
        vendidos: allCars.filter(c => stockStatus(c) === 'vendido').length,
        publicadosWeb: available.filter(c => c.visibleEnWeb !== false).length,
        consignaciones: allCars.filter(c => ['consignacion', 'tercero'].includes(stockOwnership(c).type)).length,
        consignacionesSoloCount: allCars.filter(c => stockOwnership(c).type === 'consignacion').length,
        tercerosCount: allCars.filter(c => stockOwnership(c).type === 'tercero').length,
        compartidos: allCars.filter(c => ['compartido', 'inversor'].includes(stockOwnership(c).type)).length,
        ceroKm: allCars.filter(c => /^(0\s?km|nuevo)$/i.test(c.condition || '') || c.km === 0).length,
        availableMetrics, activeMetrics,
        inconsistencias: { missingPriceCount: activeMetrics.missingPrice, missingCostCount: activeMetrics.missingCost, provisionalPriceCount: activeMetrics.provisionalPrice, sinEstadoCount: active.filter(c => stockStatus(c) === 'sin_estado').length }
    };
    // Legacy commercial fields retain their original meaning (available own + investor units only).
    for (const currency of ['ARS', 'USD']) {
        summary[`valorTotal${currency}`] = availableMetrics.ownAsking[currency] + availableMetrics.investorAsking[currency];
        summary[`valorActivo${currency}`] = availableMetrics.ownAsking[currency];
        summary[`valorActivoInversionistas${currency}`] = availableMetrics.investorAsking[currency];
        summary[`consignacionesValor${currency}`] = availableMetrics.thirdPartyAsking[currency];
        summary[`capitalInvertido${currency}`] = activeMetrics.ownCost[currency];
    }
    const result = { cars: cars.map(car => serializeStockCar(car, financialAccess)), total, pages: Math.ceil(total / limit), page, limit, brands: brands.filter(Boolean).sort(), summary, financialAccess, filteredMetrics };
    for (const currency of ['ARS', 'USD']) {
        result[`filteredTotal${currency}`] = filteredMetrics.asking[currency];
        result[`filteredCost${currency}`] = filteredMetrics.cost[currency];
        result[`filteredPropio${currency}`] = filteredMetrics.ownAsking[currency];
        result[`filteredInversionistas${currency}`] = filteredMetrics.investorAsking[currency];
        result[`filteredConsignaciones${currency}`] = filteredMetrics.thirdPartyAsking[currency];
    }
    if (!financialAccess) {
        for (const key of ['activeMetrics', 'availableMetrics']) delete summary[key];
        for (const key of Object.keys(summary)) if (/^(valor|capital|consignacionesValor)/.test(key)) delete summary[key];
        delete summary.inconsistencias.missingCostCount;
        for (const key of ['cost', 'ownCost', 'investorCost', 'thirdPartyCost', 'ownAsking', 'investorAsking', 'thirdPartyAsking', 'missingCost']) delete filteredMetrics[key];
        for (const key of Object.keys(result)) if (/^filtered(Cost|Propio|Inversionistas|Consignaciones)/.test(key)) delete result[key];
    }
    return result;
}
