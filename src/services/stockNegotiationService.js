import mongoose from 'mongoose';
import Car from '../models/Car.js';
import Sale from '../models/Sale.js';
import Reservation from '../models/Reservation.js';
import CrmSettings from '../models/CrmSettings.js';
import StockNegotiationPolicy from '../models/StockNegotiationPolicy.js';
import { canReadStockNegotiation, canConfigureStockNegotiation } from '../utils/adminPermissions.js';
import { isAvailableStock } from '../utils/inventoryStock.js';
import { calculateStockNegotiation, evaluateNegotiationOffer } from '../utils/stockNegotiation.js';

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const idOf = value => String(value?._id || value || '');
const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const keyOf = carId => carId ? 'car:' + idOf(carId).toLowerCase() : 'global';
const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const projection = '_id brand name model year plateOrVin status sold price currency purchasePrice purchaseCurrency tradeInOrigin expenses agencyOwned investor jointOwnership origen origin isSharedInvestment consignador consignedBy purchasePaymentState.totalCost purchasePaymentState.currency purchasePaymentState.isSharedInvestment purchasePaymentState.partnerPercentage purchasePaymentState.agencyCost purchasePaymentState.partnerContribution purchasePaymentState.partnerCompany order createdAt';
const issue = (field, message) => ({ field, message });
const actorId = user => mongoose.isValidObjectId(user?.id || user?._id) ? user.id || user._id : null;
function readAccess(user) { if (!canReadStockNegotiation(user)) fail('No tenés permiso para consultar la negociación del stock.', 403); }
function writeAccess(user) { if (!canConfigureStockNegotiation(user)) fail('Sólo administración puede configurar los mínimos de negociación.', 403); }
function ruleDto(policy) { return policy?.rule ? { mode: policy.rule.mode, value: policy.rule.value } : null; }
function pagination(params) {
    const number = (raw, fallback, max, label) => {
        if (raw === undefined || raw === '') return fallback;
        const value = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw;
        if (!Number.isSafeInteger(value) || value < 1 || value > max) fail(`${label} no válido.`);
        return value;
    };
    if (params.search !== undefined && (typeof params.search !== 'string' || params.search.length > 160)) fail('La búsqueda no es válida.');
    return { page: number(params.page, 1, 100000, 'Número de página'), limit: number(params.limit, 20, 100, 'Límite'), search: normalized(params.search) };
}
async function storedExchangeRate() {
    // Read the same saved quotation used by the CRM dashboard without making an
    // external quote request, changing its value, or inventing a 1:1 conversion.
    const settings = await CrmSettings.collection.findOne({}, { projection: { dolarBlueConfig: 1 } });
    const saved = settings?.dolarBlueConfig, value = Number(saved?.rate);
    const fetched = saved?.lastFetchedAt ? new Date(saved.lastFetchedAt) : null;
    return { rate: Number.isFinite(value) && value > 0 ? value : null,
        lastFetchedAt: fetched && Number.isFinite(fetched.getTime()) ? fetched.toISOString() : null,
        publishedAt: typeof saved?.publishedAt === 'string' ? saved.publishedAt.slice(0, 160) : null,
        source: typeof saved?.source === 'string' ? saved.source.slice(0, 160) : null, isManual: Boolean(saved?.isManual) };
}
async function relatedData(cars) {
    const ids = cars.map(car => car._id), keys = ['global', ...ids.map(keyOf)];
    const [policies, operations, origins, reservations, exchangeRate] = await Promise.all([
        StockNegotiationPolicy.find({ _id: { $in: keys } }).lean(),
        ids.length ? Sale.find({ vehicleId: { $in: ids }, status: { $ne: 'cancelada' } }).select('_id vehicleId status commissionSettings saleExpenses').lean() : [],
        ids.length ? Sale.find({ 'tradeIns.linkedStockCarId': { $in: ids }, status: { $ne: 'cancelada' } }).select('_id saleCurrency tradeIns').lean() : [],
        ids.length ? Reservation.find({ vehicleId: { $in: ids }, status: 'activa', expiresAt: { $gt: new Date() } }).select('vehicleId').lean() : [],
        storedExchangeRate()
    ]);
    return { policyMap: new Map(policies.map(policy => [policy._id, policy])), operations, origins, reservations, exchangeRate };
}
function contextFor(car, related) {
    const general = related.policyMap.get('global'), particular = related.policyMap.get(keyOf(car._id));
    const overrideRule = ruleDto(particular), effectiveRule = overrideRule || ruleDto(general);
    const operations = related.operations.filter(operation => idOf(operation.vehicleId) === idOf(car));
    const drafts = operations.filter(operation => operation.status === 'borrador');
    const conflicts = [], committed = operations.some(operation => operation.status !== 'borrador');
    if (committed) conflicts.push(issue('availability', 'La unidad tiene una operación vigente que contradice su estado Disponible. Revisá el estado de la unidad.'));
    if (related.reservations.some(reservation => idOf(reservation.vehicleId) === idOf(car))) conflicts.push(issue('availability', 'La unidad tiene una reserva activa; revisá su estado.'));
    if (drafts.length > 1) conflicts.push(issue('commission', 'Hay más de una venta borrador para esta unidad. Revisá cuál es la comisión aplicable.'));
    // Only the commercial panel's configured commission applies to negotiation.
    // Its actual Sale model default is zero; salesperson settlement percentages
    // remain separate. Historical/cancelled operations never set today's panel.
    const standard = new Sale().toObject().commissionSettings;
    const commissionSettings = drafts.length === 1 && !committed ? { ...standard, ...drafts[0].commissionSettings, sourceLabel: 'Panel comercial de la venta borrador vigente' }
        : { ...standard, sourceLabel: 'Panel comercial predeterminado del CRM (sin comisión)' };
    let legacyTradeInOrigin = null;
    if (!car.tradeInOrigin?.saleId) {
        const matches = related.origins.flatMap(sale => (sale.tradeIns || []).filter(item => idOf(item.linkedStockCarId) === idOf(car)).map(item => ({ sale, item })));
        if (matches.length > 1) conflicts.push(issue('acquisitionOrigin', 'Hay más de una venta de origen para la toma. Revisá el costo de adquisición de esta unidad.'));
        else if (matches.length === 1) {
            const { sale, item } = matches[0];
            legacyTradeInOrigin = { saleId: sale._id, value: item.estimatedValue ?? car.purchasePrice, currency: item.currency || sale.saleCurrency || car.purchaseCurrency };
        }
    }
    const saleExpenses = drafts.length === 1 && !committed ? drafts[0].saleExpenses || [] : [];
    return { calculation: { vehicle: car, rule: effectiveRule, commissionSettings, saleExpenses, exchangeRate: related.exchangeRate.rate, legacyTradeInOrigin }, conflicts,
        policy: { ruleSource: overrideRule ? 'vehicle' : effectiveRule ? 'general' : 'missing', effectiveRule, overrideRule,
            ruleRevision: particular?.revision || 0, globalRuleRevision: general?.revision || 0 } };
}
function pendingResult(result, conflicts, simulation = false) {
    if (!conflicts.length) return result;
    const missingFields = [...(result.missingFields || []), ...conflicts];
    return { ...result, status: 'pending', floor: null, profit: null, agencyProfit: null, difference: null, missingFields,
        ...(simulation ? { message: 'Datos pendientes: ' + conflicts.map(value => value.message).join(' ') } : {
            steps: (result.steps || []).filter(step => step.key === 'published').map(step => ({ ...step, profit: null, agencyProfit: null }))
        }) };
}
function itemDto(car, related) {
    const context = contextFor(car, related), calculated = calculateStockNegotiation(context.calculation);
    return { id: idOf(car), brand: car.brand || '', model: car.name || car.model || '', year: car.year || null,
        plate: car.plateOrVin || 'Sin dominio', ...pendingResult(calculated, context.conflicts), ...context.policy };
}
export async function getStockNegotiation(user, params = {}) {
    readAccess(user); const { page, limit, search } = pagination(params);
    const cars = (await Car.find({}).select(projection).lean()).filter(isAvailableStock).filter(car => {
        const text = normalized([car.brand, car.name, car.model, car.plateOrVin].filter(Boolean).join(' '));
        return search.split(/\s+/).filter(Boolean).every(word => text.includes(word));
    }).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0) || idOf(a).localeCompare(idOf(b)));
    const current = cars.slice((page - 1) * limit, page * limit), related = await relatedData(current), general = related.policyMap.get('global');
    return { items: current.map(car => itemDto(car, related)), total: cars.length, pages: Math.ceil(cars.length / limit), page, limit,
        canConfigure: canConfigureStockNegotiation(user), rule: ruleDto(general), ruleRevision: general?.revision || 0,
        exchangeRate: related.exchangeRate, calculatedAt: new Date().toISOString() };
}
async function availableCar(id) {
    if (!validId(id)) fail('Unidad no encontrada.', 404);
    const car = await Car.findById(id).select(projection).lean();
    if (!car) fail('Unidad no encontrada.', 404);
    if (!isAvailableStock(car)) fail('La unidad ya no está disponible. Actualizá Stock antes de cotizar.', 409);
    return car;
}
export async function simulateStockNegotiation(user, id, input = {}) {
    readAccess(user);
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Ingresá el importe de la oferta.');
    const amount = typeof input.amount === 'string' && /^\d+(?:[.,]\d{1,2})?$/.test(input.amount.trim()) ? Number(input.amount.replace(',', '.')) : input.amount;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 1e12 || Math.abs(amount * 100 - Math.round(amount * 100)) > .0001) fail('Ingresá un importe válido, con hasta dos decimales y sin separadores de miles.');
    const car = await availableCar(id), related = await relatedData([car]), context = contextFor(car, related);
    const calculated = calculateStockNegotiation(context.calculation);
    const result = evaluateNegotiationOffer(calculated, amount);
    return { id, floor: calculated.floor, minimumProfit: calculated.minimumProfit, missingFields: calculated.missingFields,
        ownership: calculated.ownership, ...pendingResult(result, context.conflicts, true),
        exchangeRate: related.exchangeRate, calculatedAt: new Date().toISOString() };
}
function validateInput(input, clear = false) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) fail('Actualizá la configuración antes de guardar el mínimo.');
    if (!clear && !Object.hasOwn(input, 'rule')) fail('Completá la regla de ganancia mínima.');
    if (clear || input.rule === null) return { rule: null, expectedRevision: input.expectedRevision };
    const rule = input.rule;
    if (!rule || typeof rule !== 'object' || Array.isArray(rule) || !['amount', 'percent'].includes(rule.mode)) fail('Elegí un mínimo en pesos o como porcentaje del costo total.');
    const value = typeof rule.value === 'string' && /^\d+(?:[.,]\d{1,2})?$/.test(rule.value.trim()) ? Number(rule.value.replace(',', '.')) : rule.value;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1e12 || Math.abs(value * 100 - Math.round(value * 100)) > .0001) fail('Ingresá un mínimo válido, positivo o cero, con hasta dos decimales y sin separadores de miles.');
    return { rule: { mode: rule.mode, value }, expectedRevision: input.expectedRevision };
}
async function savePolicy(user, carId, input, clear = false) {
    writeAccess(user); const { rule, expectedRevision } = validateInput(input, clear);
    if (carId) await availableCar(carId);
    const key = keyOf(carId), existing = await StockNegotiationPolicy.findById(key).lean();
    if (JSON.stringify(ruleDto(existing)) === JSON.stringify(rule) && existing) return existing;
    if ((existing?.revision || 0) !== expectedRevision) fail('El mínimo cambió en otra pantalla. Actualizá antes de guardar.', 409);
    const actor = actorId(user), audit = { before: ruleDto(existing), after: rule, actorId: actor, date: new Date() };
    if (!existing) {
        try { return (await StockNegotiationPolicy.create({ _id: key, ...(carId ? { carId } : {}), rule, revision: 1, updatedBy: actor, audit: [audit] })).toObject(); }
        catch (error) { if (error.code === 11000) fail('El mínimo cambió en otra pantalla. Actualizá antes de guardar.', 409); throw error; }
    }
    const saved = await StockNegotiationPolicy.findOneAndUpdate({ _id: key, revision: expectedRevision },
        { $set: { rule, updatedBy: actor }, $inc: { revision: 1 }, $push: { audit: { $each: [audit], $slice: -100 } } }, { new: true, runValidators: true }).lean();
    if (!saved) fail('El mínimo cambió en otra pantalla. Actualizá antes de guardar.', 409);
    return saved;
}
export async function setGeneralNegotiationRule(user, input) {
    const saved = await savePolicy(user, null, input); return { rule: ruleDto(saved), revision: saved.revision };
}
export async function setVehicleNegotiationRule(user, id, input) {
    if (!validId(id)) fail('Unidad no encontrada.', 404);
    const saved = await savePolicy(user, id, input); return { overrideRule: ruleDto(saved), revision: saved.revision };
}
export async function clearVehicleNegotiationRule(user, id, input) {
    if (!validId(id)) fail('Unidad no encontrada.', 404);
    const saved = await savePolicy(user, id, input, true); return { overrideRule: ruleDto(saved), revision: saved.revision };
}
