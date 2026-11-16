import mongoose from 'mongoose';
import Account from '../models/Account.js';
import Car from '../models/Car.js';
import Transaction from '../models/Transaction.js';
import TreasuryCategoryRule from '../models/TreasuryCategoryRule.js';
import TreasuryBox from '../models/TreasuryBox.js';
import GptExpenseDraft from '../models/GptExpenseDraft.js';
import { PERMISSIONS, hasPermission } from '../utils/adminPermissions.js';
import { assertExpensePermission, createExpenseMovement, ExpenseError } from './expenseCreationService.js';

export { ExpenseError };
export const EXPENSE_CATEGORIES = ['Sueldos', 'Taller', 'Gastos Personales', 'Comisiones', 'Pago Empresas',
    'Pago a Proveedor', 'Retiros', 'AFIP/IVA', 'Mantenimiento', 'Gastos Varios', 'Tarjeta'];
const METHODS = ['efectivo', 'transferencia', 'tarjeta', 'cheque', 'deposito', 'dolares', 'otro'];
const KINDS = ['operational', 'workshop', 'vehicle', 'card'];
const FIELDS = ['kind', 'amount', 'currency', 'date', 'concept', 'paymentMethod', 'accountId', 'accountQuery', 'accountUnassigned',
    'vehicleId', 'vehicleQuery', 'category', 'notes', 'cardTiming', 'dueDate'];
const DRAFT_LIFE_MS = 24 * 60 * 60 * 1000;
const fail = (status, code, message, details) => { throw new ExpenseError(status, code, message, details); };
const str = (value) => String(value ?? '').trim();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ownerId = (user) => {
    const id = str(user?._id || user?.id || user?.userId);
    if (!mongoose.isValidObjectId(id)) fail(401, 'LOGIN_REQUIRED', 'Volvé a conectar el GPT con tu sesión del CRM.');
    return id;
};
const validId = (id) => /^[a-f0-9]{24}$/i.test(str(id));
const dateNowArgentina = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const pageNumber = (n) => Math.max(1, Math.min(100000, Number.parseInt(n, 10) || 1));
const pageSize = (n) => Math.max(1, Math.min(50, Number.parseInt(n, 10) || 20));

function normalizePayload(input, previous = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400, 'INVALID_PAYLOAD', 'Faltan los datos del gasto.');
    const payload = { ...previous };
    for (const key of Object.keys(input)) {
        if (!FIELDS.includes(key)) fail(400, 'UNKNOWN_FIELD', `El campo ${key} no está permitido.`);
        const value = input[key];
        if (value === null || value === '') { delete payload[key]; continue; }
        if (key === 'amount') {
            if (typeof value !== 'number') fail(400, 'INVALID_AMOUNT', 'El importe debe ser numérico.');
            const amount = value;
            if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000000000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.0001) {
                fail(400, 'INVALID_AMOUNT', 'El importe debe ser positivo y tener como máximo dos decimales.');
            }
            payload.amount = Math.round(amount * 100) / 100;
        } else if (key === 'accountUnassigned') {
            if (typeof value !== 'boolean') fail(400, 'INVALID_FIELD', 'Indicá si la cuenta queda sin asignar.');
            payload.accountUnassigned = value;
        } else if (['accountId', 'vehicleId'].includes(key)) {
            if (!validId(value)) fail(400, 'INVALID_ID', `El identificador ${key} no es válido.`);
            payload[key] = str(value);
        } else {
            if (typeof value !== 'string' || value.length > (key === 'notes' ? 1500 : 300)) fail(400, 'INVALID_FIELD', `El campo ${key} no es válido.`);
            payload[key] = str(value);
        }
    }
    if (input.accountUnassigned === true && input.accountId) fail(400, 'INVALID_ACCOUNT', 'Elegí una cuenta o dejala sin asignar.');
    if (['currency', 'paymentMethod', 'accountQuery'].some((key) => Object.hasOwn(input, key)) && !Object.hasOwn(input, 'accountUnassigned') && !input.accountId) delete payload.accountUnassigned;
    if (input.accountId) payload.accountUnassigned = false;
    if (payload.accountUnassigned) { delete payload.accountId; delete payload.accountQuery; }
    if (payload.currency) payload.currency = payload.currency.toUpperCase();
    if (payload.currency && !['ARS', 'USD'].includes(payload.currency)) fail(400, 'INVALID_CURRENCY', 'Usá ARS o USD.');
    if (payload.kind && !KINDS.includes(payload.kind)) fail(400, 'INVALID_KIND', 'Tipo de gasto inválido.');
    if (payload.paymentMethod && !METHODS.includes(payload.paymentMethod)) fail(400, 'INVALID_METHOD', 'Medio de pago inválido. Consultá el contexto del CRM.');
    if (payload.cardTiming && !['paid', 'deferred'].includes(payload.cardTiming)) fail(400, 'INVALID_CARD_TIMING', 'Indicá si la tarjeta ya se pagó o queda pendiente.');
    for (const key of ['date', 'dueDate']) if (payload[key] && !validDate(payload[key])) fail(400, 'INVALID_DATE', 'La fecha debe ser una fecha real en formato AAAA-MM-DD.');
    payload.kind ||= (payload.vehicleId || payload.vehicleQuery) ? 'vehicle' : 'operational';
    payload.date ||= dateNowArgentina();
    if (payload.kind === 'card') {
        if (payload.paymentMethod && payload.paymentMethod !== 'tarjeta') fail(400, 'INVALID_METHOD', 'Si corregís el gasto a otro medio de pago, corregí también kind.');
        payload.paymentMethod = 'tarjeta';
    }
    payload.category ||= payload.kind === 'workshop' ? 'Taller' : (payload.kind === 'card' ? 'Tarjeta' : (payload.kind === 'vehicle' ? 'Mantenimiento' : undefined));
    if (payload.kind === 'workshop' && !/taller|mec[aá]nic|chapist|repuestos/i.test(payload.category || '')) fail(400, 'WORKSHOP_CATEGORY', 'Usá una categoría de taller para que el arreglo aparezca en Taller / Mecánico.');
    if (payload.paymentMethod !== 'tarjeta') { delete payload.cardTiming; delete payload.dueDate; }
    return payload;
}

function accountFilter(payload = {}) {
    const filter = { isActive: { $ne: false } };
    if (payload.currency) filter.currency = payload.currency;
    if (payload.accountQuery) filter.name = { $regex: escapeRegex(str(payload.accountQuery).slice(0, 120)), $options: 'i' };
    if (['efectivo', 'dolares'].includes(payload.paymentMethod)) filter.type = 'Efectivo';
    if (['transferencia', 'deposito', 'cheque'].includes(payload.paymentMethod)) filter.type = { $in: ['Banco', 'Billetera'] };
    if (payload.paymentMethod === 'tarjeta') filter.type = { $in: ['Banco', 'Billetera', 'Tarjeta'] };
    return filter;
}
function vehicleFilter(query = '') {
    const words = str(query).slice(0, 180).split(/\s+/).filter(Boolean).slice(0, 10);
    const fields = ['brand', 'name', 'plateOrVin', 'infoAuto.brandName', 'infoAuto.modelName', 'infoAuto.versionName'];
    return words.length ? { $and: words.map((word) => ({ $or: [
        ...fields.map((field) => ({ [field]: { $regex: escapeRegex(word), $options: 'i' } })),
        ...(/^\d{4}$/.test(word) ? [{ year: Number(word) }] : [])
    ] })) } : {};
}
const accountDto = (a) => ({ id: String(a._id), name: a.name, type: a.type, currency: a.currency });
const vehicleDto = (car) => ({ id: String(car._id), brand: car.brand, model: car.name, year: car.year,
    plate: car.plateOrVin || 'Sin patente', status: car.status,
    label: `${car.brand} ${car.name} · ${car.year} · ${car.plateOrVin || 'Sin patente'}` });
export async function categoriesForExpenses(session = null) {
    const existing = await Transaction.distinct('category', { type: 'Egreso', module: 'crm_v2' }).session(session);
    const rules = await TreasuryCategoryRule.distinct('category').session(session);
    return [...new Set([...EXPENSE_CATEGORIES, ...existing, ...rules].filter((c) => typeof c === 'string' && c.trim()))].sort((a, b) => a.localeCompare(b, 'es'));
}

export async function expenseContext(user, query = {}) {
    assertExpensePermission(user);
    const limit = pageSize(query.limit);
    const page = pageNumber(query.page);
    const accountPage = pageNumber(query.accountPage);
    const filter = accountFilter({ currency: ['ARS', 'USD'].includes(query.currency) ? query.currency : undefined,
        paymentMethod: METHODS.includes(query.paymentMethod) ? query.paymentMethod : undefined, accountQuery: query.accountQuery });
    const canUseVehicles = hasPermission(user, PERMISSIONS.STOCK_WRITE);
    const carQuery = vehicleFilter(query.vehicleQuery || query.search);
    const [accounts, accountTotal, categories, vehicles, vehicleTotal] = await Promise.all([
        Account.find(filter).sort({ name: 1, _id: 1 }).skip((accountPage - 1) * limit).limit(limit).select('name type currency').lean(),
        Account.countDocuments(filter), categoriesForExpenses(),
        canUseVehicles ? Car.find(carQuery).select('brand name year plateOrVin status').sort({ brand: 1, name: 1, year: -1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean() : [],
        canUseVehicles ? Car.countDocuments(carQuery) : 0
    ]);
    return { todayArgentina: dateNowArgentina(), currencies: ['ARS', 'USD'], paymentMethods: METHODS,
        kinds: KINDS.filter((kind) => (kind !== 'vehicle' || canUseVehicles) && (kind !== 'workshop' || (canUseVehicles && hasPermission(user, PERMISSIONS.TALLER_PAYMENTS_WRITE)))),
        accounts: accounts.map(accountDto), accountPagination: { page: accountPage, limit, total: accountTotal, hasMore: accountPage * limit < accountTotal },
        categories, vehicles: vehicles.map(vehicleDto), vehiclePagination: { page, limit, total: vehicleTotal, hasMore: page * limit < vehicleTotal },
        cardTiming: [{ value: 'paid', label: 'Ya pagado: egreso activo y un débito en la cuenta elegida' },
            { value: 'deferred', label: 'Pendiente de pago: compromiso sin débito; completar el pago en Finanzas' }] };
}

async function reviewPayload(user, input, session = null, { allowUnassignedAccount = false } = {}) {
    const payload = { ...input };
    if (!allowUnassignedAccount) {
        if (payload.accountUnassigned) fail(400, 'ACCOUNT_REQUIRED', 'Elegí una cuenta de origen para este gasto.');
        delete payload.accountUnassigned;
    }
    assertExpensePermission(user, payload);
    const missing = [];
    const issue = (field, question, candidates = [], total = candidates.length) => missing.push({ field, question, candidates, total });
    if (!payload.amount) issue('amount', '¿Cuánto pagaste?');
    if (!payload.concept) issue('concept', '¿Cuál es el concepto del gasto?');
    if (!payload.paymentMethod) issue('paymentMethod', '¿Con qué medio pagaste?');
    if (payload.paymentMethod === 'tarjeta' && !payload.cardTiming) issue('cardTiming', '¿La tarjeta ya se pagó o queda pendiente de pago?');
    const categories = await categoriesForExpenses(session);
    if (!payload.category || !categories.includes(payload.category)) issue('category', '¿A qué categoría del CRM corresponde?', categories.map((name) => ({ name })));
    let account = payload.accountId ? await Account.findOne({ _id: payload.accountId, isActive: { $ne: false } }).session(session).lean() : null;
    if (account && !payload.currency) payload.currency = account.currency;
    if (!payload.currency) issue('currency', '¿El importe es en pesos (ARS) o dólares (USD)?');
    const filter = accountFilter({ ...payload, accountQuery: payload.accountId ? undefined : payload.accountQuery });
    const accounts = await Account.find(filter).sort({ name: 1, _id: 1 }).limit(10).select('name type currency').session(session).lean();
    const accountTotal = await Account.countDocuments(filter).session(session);
    if (account && (account.currency !== payload.currency || !await Account.exists({ ...filter, _id: account._id }).session(session))) {
        account = null;
        delete payload.accountId;
    }
    // Infer only from the complete result count, never from one page of matches.
    if (!payload.accountUnassigned && !account && accountTotal === 1 && payload.currency && payload.paymentMethod) {
        account = accounts[0];
        payload.accountId = String(account._id);
    }
    if (account) payload.accountUnassigned = false;
    if (!account && allowUnassignedAccount && accountTotal === 0) payload.accountUnassigned = true;
    if (payload.accountUnassigned) { delete payload.accountId; delete payload.accountQuery; }
    else if (!account) issue('accountId', accountTotal ? '¿Desde cuál cuenta pagaste?' : 'No encontré una cuenta activa para esa moneda y medio. Elegí otra cuenta o corregí el medio.', accounts.map(accountDto), accountTotal);
    const needsVehicle = ['workshop', 'vehicle'].includes(payload.kind) || Boolean(payload.vehicleId || payload.vehicleQuery);
    let vehicle = payload.vehicleId ? await Car.findById(payload.vehicleId).select('brand name year plateOrVin status').session(session).lean() : null;
    if (needsVehicle && !vehicle) {
        delete payload.vehicleId;
        const vf = vehicleFilter(payload.vehicleQuery);
        const cars = await Car.find(vf).select('brand name year plateOrVin status').sort({ brand: 1, name: 1, year: -1, _id: 1 }).limit(10).session(session).lean();
        const count = await Car.countDocuments(vf).session(session);
        if (count === 1 && payload.vehicleQuery) { vehicle = cars[0]; payload.vehicleId = String(vehicle._id); }
        else issue('vehicleId', count ? '¿A qué unidad corresponde? Elegí por año y patente.' : 'No encontré esa unidad. Corregí modelo, versión o patente.', cars.map(vehicleDto), count);
    }
    const amount = payload.amount ? `$${payload.amount.toLocaleString('es-AR', { maximumFractionDigits: 2 })} ${payload.currency || ''}`.trim() : 'Importe pendiente';
    const cardLabel = payload.paymentMethod === 'tarjeta' && payload.cardTiming === 'deferred' ? ' · Tarjeta pendiente de pago; sin débito' : '';
    const summary = [amount, payload.concept || 'Concepto pendiente', vehicle ? `${vehicle.brand} ${vehicle.name} ${vehicle.year} (${vehicle.plateOrVin || 'Sin patente'})` : '', account?.name || (payload.accountUnassigned ? 'Cuenta sin asignar' : 'Cuenta pendiente'), payload.date].filter(Boolean).join(' · ') + cardLabel;
    return { payload, summary, missingFields: missing, readyToConfirm: missing.length === 0 };
}
function assertDraftId(id) { if (!validId(id)) fail(404, 'DRAFT_NOT_FOUND', 'No encontré ese borrador.'); }
function publicDraft(draft, review) {
    return { draftId: String(draft._id), version: draft.version, status: draft.status, expiresAt: draft.expiresAt,
        ...review, payload: review.payload, nextQuestion: review.missingFields[0] || null };
}
function assertLive(draft) {
    if (draft.status === 'draft' && draft.expiresAt <= new Date()) fail(410, 'DRAFT_EXPIRED', 'El borrador venció. Creá uno nuevo y revisá los datos.');
}
export async function getExpenseDraft(user, id) {
    assertExpensePermission(user); assertDraftId(id);
    const draft = await GptExpenseDraft.findOne({ _id: id, userId: ownerId(user) }).lean();
    if (!draft) fail(404, 'DRAFT_NOT_FOUND', 'No encontré ese borrador.');
    if (draft.status === 'confirmed') { assertExpensePermission(user, draft.payload); return { ...draft.result, duplicate: true }; }
    assertLive(draft);
    return publicDraft(draft, await reviewPayload(user, draft.payload, null, { allowUnassignedAccount: draft.origin === 'crm_dictation' }));
}
export async function createExpenseDraft(user, { requestId, expense } = {}, { origin = 'gpt' } = {}) {
    assertExpensePermission(user);
    const uid = ownerId(user);
    if (typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(requestId)) fail(400, 'REQUEST_ID_REQUIRED', 'Enviá un requestId único por gasto y reutilizalo en los reintentos.');
    const prior = await GptExpenseDraft.findOne({ userId: uid, requestId }).lean();
    if (prior) return getExpenseDraft(user, String(prior._id));
    // Deployment must prepare the unique key before accepting new requests.
    // Without it, concurrent retries could create two independent drafts.
    const indexes = await GptExpenseDraft.collection.indexes().catch(error => {
        if (error.code === 26) return [];
        throw error;
    });
    if (!indexes.some(index => index.unique === true && !index.partialFilterExpression && index.key.userId === 1 && index.key.requestId === 1 && Object.keys(index.key).length === 2)) {
        fail(503, 'EXPENSE_STORAGE_NOT_READY', 'La carga de gastos todavía no está habilitada en este entorno. Pedile al administrador que complete la configuración.');
    }
    const review = await reviewPayload(user, normalizePayload(expense), null, { allowUnassignedAccount: origin === 'crm_dictation' });
    try {
        const draft = await GptExpenseDraft.create({ userId: uid, requestId, origin, payload: review.payload,
            expiresAt: new Date(Date.now() + DRAFT_LIFE_MS) });
        return publicDraft(draft, review);
    } catch (error) {
        if (error.code !== 11000) throw error;
        const priorDraft = await GptExpenseDraft.findOne({ userId: uid, requestId });
        if (!priorDraft) throw error;
        return getExpenseDraft(user, String(priorDraft._id));
    }
}
export async function editExpenseDraft(user, id, { version, expense } = {}) {
    assertExpensePermission(user); assertDraftId(id);
    if (!Number.isSafeInteger(version) || version < 1) fail(400, 'VERSION_REQUIRED', 'Enviá la versión del borrador que querés corregir.');
    const draft = await GptExpenseDraft.findOne({ _id: id, userId: ownerId(user) }).lean();
    if (!draft) fail(404, 'DRAFT_NOT_FOUND', 'No encontré ese borrador.');
    if (draft.status !== 'draft') fail(409, 'ALREADY_CONFIRMED', 'Ese gasto ya fue confirmado. Abrí el movimiento para editarlo en el CRM.', draft.result);
    assertLive(draft);
    if (draft.version !== version) fail(409, 'DRAFT_CHANGED', 'El borrador cambió. Consultalo de nuevo antes de confirmar.');
    const payload = normalizePayload(expense, draft.payload);
    // A changed search or currency must not retain an earlier inferred selection.
    if (Object.hasOwn(expense, 'vehicleQuery') && !Object.hasOwn(expense, 'vehicleId')) delete payload.vehicleId;
    if (['currency', 'paymentMethod', 'accountQuery'].some((key) => Object.hasOwn(expense, key)) && !Object.hasOwn(expense, 'accountId')) delete payload.accountId;
    if (['currency', 'paymentMethod', 'accountQuery'].some((key) => Object.hasOwn(expense, key)) && !Object.hasOwn(expense, 'accountUnassigned') && !expense.accountId) delete payload.accountUnassigned;
    const review = await reviewPayload(user, payload, null, { allowUnassignedAccount: draft.origin === 'crm_dictation' });
    const updated = await GptExpenseDraft.findOneAndUpdate({ _id: id, userId: ownerId(user), version, status: 'draft', expiresAt: { $gt: new Date() } },
        { $set: { payload: review.payload }, $inc: { version: 1 } }, { new: true });
    if (!updated) fail(409, 'DRAFT_CHANGED', 'El borrador cambió. Consultalo de nuevo antes de confirmar.');
    return publicDraft(updated, review);
}

export async function confirmExpenseDraft(user, id, { version, confirmed } = {}, { req } = {}) {
    assertExpensePermission(user); assertDraftId(id);
    if (confirmed !== true || !Number.isSafeInteger(version) || version < 1) fail(400, 'EXPLICIT_CONFIRMATION_REQUIRED', 'Revisá el resumen y confirmá expresamente esa versión del borrador.');
    const uid = ownerId(user);
    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            const draft = await GptExpenseDraft.findOne({ _id: id, userId: uid }).session(session);
            if (!draft) fail(404, 'DRAFT_NOT_FOUND', 'No encontré ese borrador.');
            assertExpensePermission(user, draft.payload);
            if (draft.status === 'confirmed') { result = { ...draft.result, duplicate: true }; return; }
            assertLive(draft);
            if (draft.version !== version) fail(409, 'DRAFT_CHANGED', 'El borrador cambió. Leé el resumen actualizado y confirmalo de nuevo.');
            const review = await reviewPayload(user, draft.payload.toObject(), session, { allowUnassignedAccount: draft.origin === 'crm_dictation' });
            if (!review.readyToConfirm) fail(422, 'EXPENSE_INCOMPLETE', 'Faltan datos del gasto. Respondé solo la pregunta pendiente.', review);
            // Revalidation may discover changed reference data. Never confirm values
            // inferred after the user's last review (e.g. deleted source account).
            if (['accountId', 'vehicleId'].some((field) => str(review.payload[field]) !== str(draft.payload[field]))) {
                fail(409, 'DRAFT_CHANGED', 'Cambió una cuenta o unidad. Volvé a revisar y corregí el borrador.');
            }
            // First write locks the draft. Concurrent confirmations retry against
            // its committed result rather than creating another movement.
            const locked = await GptExpenseDraft.updateOne({ _id: id, userId: uid, status: 'draft', version },
                { $set: { status: 'confirmed', confirmedAt: new Date(), payload: review.payload } }, { session });
            if (locked.modifiedCount !== 1) fail(409, 'DRAFT_CHANGED', 'El borrador cambió. Consultalo de nuevo.');
            const tx = await createExpenseMovement({ payload: review.payload, user, draftId: id, origin: draft.origin || 'gpt', session, req });
            const tab = review.payload.kind === 'workshop' || /taller|mec[aá]nic|chapist|repuestos/i.test(tx.category) ? 'taller' :
                (tx.paymentMethod === 'tarjeta' ? 'tarjeta' : 'movimientos');
            result = { draftId: id, version, status: 'confirmed', movementId: String(tx._id), movementNumber: String(tx._id),
                movementStatus: tx.status, summary: review.summary,
                url: `/admin/finanzas?tab=${tab}&movement=${tx._id}`, vehicleUrl: tx.vehicleId ? `/admin/stock/${tx.vehicleId}` : null,
                accountAssignmentPending: tx.accountAssignmentStatus === 'pending',
                accountDebited: tx.accountDebitApplied ?? (tx.status === 'activo' && Boolean(tx.accountId)), duplicate: false };
            await GptExpenseDraft.updateOne({ _id: id }, { $set: { movementId: tx._id, result } }, { session });
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
        return result;
    } catch (error) {
        if (error.code === 20 || error.codeName === 'IllegalOperation') fail(503, 'ATOMIC_STORAGE_REQUIRED', 'El entorno de prueba necesita MongoDB con replica set para registrar gastos de forma atómica.');
        throw error;
    } finally { await session.endSession(); }
}

export async function createGptExpenseIndexes() {
    // Required at installation: autoIndex is disabled by the CRM in production.
    await GptExpenseDraft.createIndexes();
    await TreasuryBox.createIndexes();
    await TreasuryCategoryRule.createIndexes();
}
