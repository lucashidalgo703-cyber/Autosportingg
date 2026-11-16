import Car from '../models/Car.js';
import Account from '../models/Account.js';
import GptExpenseDraft from '../models/GptExpenseDraft.js';
import { PERMISSIONS, hasPermission } from '../utils/adminPermissions.js';
import { createExpenseDraft, getExpenseDraft, EXPENSE_CATEGORIES, categoriesForExpenses } from './gptExpenseService.js';
import { assertExpensePermission, ExpenseError } from './expenseCreationService.js';

const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const contains = (text, phrase) => Boolean(phrase) && new RegExp(`(?:^|[^a-z0-9])${escape(fold(phrase))}(?=$|[^a-z0-9])`).test(text);
const fail = (code, message) => { throw new ExpenseError(400, code, message); };
const words = {
    cero: 0, medio: 0.5, media: 0.5, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
    diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
    veinte: 20, veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25,
    veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50,
    sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, doscientas: 200,
    trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500,
    seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800,
    novecientos: 900, novecientas: 900
};
const numberWord = token => Object.hasOwn(words, token) || /^(mil|millon|millones)$/.test(token);
const validCalendar = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T12:00:00Z'))
    && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
const todayArgentina = now => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
const overlap = (a, b) => a.start < b.end && b.start < a.end;
const blankSpans = (text, spans) => text.split('').map((char, i) => spans.some(span => i >= span.start && i < span.end) ? ' ' : char).join('');

function calendarDate(text, now) {
    const explicit = [...text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b|\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)];
    if (explicit.length > 1) fail('AMBIGUOUS_DATE', 'Encontré más de una fecha. Dejá una sola fecha para este gasto.');
    if (explicit.length) {
        const match = explicit[0];
        const date = match[1] ? match[0] : `${match[6]}-${match[5].padStart(2, '0')}-${match[4].padStart(2, '0')}`;
        if (!validCalendar(date)) fail('INVALID_DATE', 'La fecha dictada no existe. Corregila antes de preparar el gasto.');
        return { date, spans: [{ start: match.index, end: match.index + match[0].length }] };
    }
    const relative = [...text.matchAll(/\b(anteayer|ayer|hoy)\b/g)];
    if (new Set(relative.map(match => match[1])).size > 1) fail('AMBIGUOUS_DATE', 'Encontré fechas distintas. Dejá una sola fecha para este gasto.');
    const date = new Date(todayArgentina(now) + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() - (relative[0]?.[1] === 'anteayer' ? 2 : relative[0]?.[1] === 'ayer' ? 1 : 0));
    return { date: date.toISOString().slice(0, 10), spans: relative.map(match => ({ start: match.index, end: match.index + match[0].length })) };
}

function decimalNumber(token) {
    if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(token)) return Number(token.replaceAll('.', '').replace(',', '.'));
    if (/^\d+,\d{1,2}$/.test(token)) return Number(token.replace(',', '.'));
    if (/^\d+(?:\.\d{1,2})?$/.test(token)) return Number(token);
    return null;
}

function numberValue(tokens) {
    let total = 0, group = 0;
    for (const [index, token] of tokens.entries()) {
        if (token === 'y') continue;
        if ((token === 'medio' || token === 'media') && tokens[index - 1] === 'y') {
            if (tokens[index - 2] === 'mil') { group += 500; continue; }
            if (/^(millon|millones)$/.test(tokens[index - 2] || '')) { total += 500000; continue; }
        }
        if (token === 'mil') group = (group || 1) * 1000;
        else if (token === 'millon' || token === 'millones') { total += (group || 1) * 1000000; group = 0; }
        else if (Object.hasOwn(words, token)) group += words[token];
        else {
            const parsed = decimalNumber(token);
            if (parsed === null) return null;
            group += parsed;
        }
    }
    return total + group;
}

function monetaryAmount(text, excluded) {
    const tokens = [...text.matchAll(/\d+(?:[.,]\d+)*|[a-z]+/g)].map(match => ({ value: match[0], start: match.index, end: match.index + match[0].length }));
    const candidates = [];
    for (let i = 0; i < tokens.length; i++) {
        const first = tokens[i];
        if (!numberWord(first.value) && !/^\d/.test(first.value)) continue;
        // Numeric fragments of plates, versions and VINs are not amounts.
        if (/[a-z0-9]/.test(text[first.start - 1] || '') || /[a-z]/.test(text[first.end] || '')
            && !/^(?:mil|millon|millones|pesos?|ars|dolares?|usd)\b/.test(text.slice(first.end))) continue;
        const group = [first];
        while (i + 1 < tokens.length) {
            const token = tokens[i + 1], previous = group.at(-1);
            if (!/^\s*$/.test(text.slice(previous.end, token.start)) || (!numberWord(token.value) && token.value !== 'y' && !/^\d/.test(token.value))) break;
            if (token.value === 'y' && !numberWord(tokens[i + 2]?.value || '')) break;
            group.push(token); i++;
        }
        const candidate = { start: first.start, end: group.at(-1).end };
        if (excluded.some(span => overlap(span, candidate))) continue;
        const before = text.slice(Math.max(0, candidate.start - 35), candidate.start);
        const after = text.slice(candidate.end, candidate.end + 25);
        const currencyAfter = after.match(/^\s*(?:de\s+)?(pesos?|ars|dolares?|usd)\b/);
        const currencyBefore = before.match(/(u\$s|us\$|usd|ars|\$)\s*$/);
        const paidBefore = /\b(?:pague|gaste|abone|transferi|pago|importe|monto)(?:\s+(?:de|por|unos|unas))?\s*[-−]?\s*$/.test(before);
        const magnitude = group.some(token => /^(mil|millon|millones)$/.test(token.value));
        if (!currencyAfter && !currencyBefore && !paidBefore && !magnitude) continue;
        let value = numberValue(group.map(token => token.value));
        const currency = currencyAfter ? (/^(dolar|usd)/.test(currencyAfter[1]) ? 'USD' : 'ARS')
            : currencyBefore ? (currencyBefore[1] === '$' || currencyBefore[1] === 'ars' ? 'ARS' : 'USD') : null;
        if (/[-−]\s*$/.test(before) || /\bmenos\s*$/.test(before)) fail('INVALID_AMOUNT', 'El gasto debe tener un importe positivo. Corregí el monto.');
        if (currencyAfter) candidate.end += currencyAfter[0].length;
        const cents = text.slice(candidate.end).match(/^\s+(?:con|y)\s+(.{1,120}?)\s+centavos?\b/);
        if (cents) {
            const centTokens = cents[1].split(/\s+/);
            const centValue = centTokens.every(token => numberWord(token) || token === 'y' || /^\d+$/.test(token)) ? numberValue(centTokens) : null;
            value = centValue !== null && centValue >= 0 && centValue < 100 && Number.isInteger(centValue) ? value + centValue / 100 : null;
            candidate.end += cents[0].length;
        }
        if (currencyBefore) candidate.start -= currencyBefore[0].length;
        candidates.push({ ...candidate, value, currency });
    }
    return candidates;
}

const accountNoise = new Set(['banco', 'caja', 'cuenta', 'efectivo', 'prueba', 'ars', 'usd', 'de', 'la', 'el', 'en', 'uno', 'dos']);
function accountReference(text, accounts) {
    const matches = accounts.filter(account => {
        const name = fold(account.name).trim();
        if (contains(text, name)) return true;
        const significant = name.split(/[^a-z0-9]+/).filter(token => token.length > 2 && !accountNoise.has(token));
        return significant.length > 0 && significant.every(token => contains(text, token));
    });
    return matches.length === 1 ? matches[0] : null;
}

const vehicleNoise = new Set(['prueba', 'reservada', 'reservado', 'disponible', 'vendido', 'vendida', 'pausada', 'pausado', 'historica', 'historico', 'ars', 'usd', 'auto', 'camioneta']);
function vehicleReferences(text, vehicles) {
    const references = vehicles.map(vehicle => {
        const name = vehicle.name || vehicle.model || '';
        const modelTokens = fold(name).split(/[^a-z0-9]+/).filter(token => token && !vehicleNoise.has(token));
        const primary = modelTokens[0];
        const plate = contains(text, vehicle.plateOrVin || vehicle.plate);
        const fullName = contains(text, name);
        const model = contains(text, primary);
        const version = contains(text, vehicle.infoAuto?.versionName || vehicle.version);
        const brand = contains(text, vehicle.brand);
        return { vehicle, plate, directModel: model || fullName || version, primary, model: model || fullName || version || brand, score: fullName ? 8 + Math.min(name.length, 300) / 1000 : version ? 5 : model ? 4 : brand ? 2 : 0,
            query: fullName ? name : version ? vehicle.infoAuto?.versionName || vehicle.version : model ? primary : brand ? vehicle.brand : '' };
    }).filter(reference => reference.plate || reference.model);
    const plates = references.filter(reference => reference.plate);
    const modelMatches = references.filter(reference => reference.model);
    if (plates.length && modelMatches.length && plates.some(plate => !plate.model)) return { conflict: true, matches: [], spans: [] };
    if (!plates.length && new Set(modelMatches.filter(reference => reference.directModel).map(reference => reference.primary)).size > 1) {
        return { conflict: true, matches: [], spans: [] };
    }
    let matches = plates.length ? plates : modelMatches;
    if (!plates.length && matches.some(reference => reference.score >= 5)) {
        const topScore = Math.max(...matches.map(reference => reference.score));
        matches = matches.filter(reference => reference.score === topScore);
    }
    const years = [...text.matchAll(/\b(?:19|20)\d{2}\b/g)].map(match => Number(match[0]));
    if (!plates.length && years.length === 1) matches = matches.filter(reference => Number(reference.vehicle.year) === years[0]);
    if (!matches.length) return { matches: [], spans: [] };
    if (new Set(matches.map(reference => fold(reference.query))).size > 1) return { conflict: true, matches: [], spans: [] };
    const best = matches.reduce((winner, reference) => reference.score > winner.score ? reference : winner, matches[0]);
    const phrases = [...new Set(matches.flatMap(reference => [reference.query, reference.vehicle.plateOrVin || reference.vehicle.plate,
        reference.vehicle.brand, String(reference.vehicle.year || '')]).filter(Boolean))];
    const spans = phrases.flatMap(phrase => [...text.matchAll(new RegExp(`\\b${escape(fold(phrase))}\\b`, 'g'))].map(match => ({ start: match.index, end: match.index + match[0].length })));
    return { matches, query: best.query, spans };
}

/** Conservative local interpretation. No financial write occurs before the reviewed draft is confirmed. */
export function parseExpenseText(text, { now = new Date(), vehicles = [], accounts = [], categories = EXPENSE_CATEGORIES } = {}) {
    if (typeof text !== 'string' || !text.trim() || text.length > 3000) fail('INVALID_DICTATION', 'Escribí o dictá un gasto de hasta 3000 caracteres.');
    const original = text.trim(), normalized = fold(original);
    const interpretationWarnings = [];
    const expense = {};
    const calendar = calendarDate(normalized, now);
    expense.date = calendar.date;
    const amounts = monetaryAmount(normalized, calendar.spans);
    if (amounts.length === 1 && amounts[0].value !== null) {
        expense.amount = amounts[0].value;
        const currencyMentions = [...normalized.matchAll(/\b(pesos?|ars|dolares?|usd)\b|u\$s|us\$/g)].map(match => /dolar|usd|u\$s|us\$/.test(match[0]) ? 'USD' : 'ARS');
        const currencies = [...new Set(currencyMentions)];
        if (currencies.length > 1) interpretationWarnings.push('Hay referencias a pesos y dólares. Elegí la moneda del gasto.');
        else {
            expense.currency = amounts[0].currency || currencies[0] || 'ARS';
            if (!amounts[0].currency && !currencies.length) interpretationWarnings.push('Tomé el importe en ARS. Revisá la moneda antes de confirmar.');
        }
    } else if (amounts.length > 1) interpretationWarnings.push('Encontré más de un importe. Elegí el monto de este gasto antes de confirmar.');
    else if (amounts.length && amounts[0].value === null) interpretationWarnings.push('No pude interpretar el formato del importe. Corregí el monto.');

    const methodPatterns = [
        ['transferencia', /\b(?:transferi|transferencia|transferido|transferimos|debito bancario)\b/],
        ['efectivo', /\b(?:en efectivo|efectivo|cash|al contado)\b/],
        ['tarjeta', /\b(?:tarjeta|credito|debito)\b/],
        ['cheque', /\bcheque\b/], ['deposito', /\bdeposito\b/]
    ];
    const methods = methodPatterns.filter(([, pattern]) => pattern.test(normalized));
    if (methods.length === 1) expense.paymentMethod = methods[0][0];
    else if (methods.length > 1) interpretationWarnings.push('Mencionaste distintos medios de pago. Elegí el que corresponde a este gasto.');
    const account = accountReference(normalized, accounts);
    if (account) {
        expense.accountId = String(account._id || account.id);
        if (!expense.currency && amounts.length === 1) expense.currency = account.currency;
    }
    const vehicleText = blankSpans(normalized, [...calendar.spans, ...amounts]);
    const references = vehicleReferences(vehicleText, vehicles);
    if (references.conflict) {
        interpretationWarnings.push('El modelo y la patente mencionados no coinciden. Elegí la unidad correcta.');
        expense.vehicleQuery = '__revisar_unidad__';
    } else if (references.matches.length === 1) expense.vehicleId = String(references.matches[0].vehicle._id || references.matches[0].vehicle.id);
    else if (references.matches.length > 1) expense.vehicleQuery = references.query;

    const mechanical = /\b(?:alineacion|balanceo|taller|mecanico|mecanica|reparacion|repuestos?|chapista|neumaticos?|cubiertas?|frenos?|service)\b|\bcambio de aceite\b/.test(normalized)
        || /\barreglo\b/.test(normalized) && Boolean(expense.vehicleId || expense.vehicleQuery || /\b(auto|camioneta|unidad)\b/.test(normalized));
    expense.kind = mechanical ? 'workshop' : expense.vehicleId || expense.vehicleQuery ? 'vehicle' : expense.paymentMethod === 'tarjeta' ? 'card' : 'operational';
    const chooseCategory = preferred => categories.find(category => fold(category) === fold(preferred));
    expense.category = chooseCategory(mechanical ? 'Taller' : expense.kind === 'vehicle' ? 'Mantenimiento' : expense.kind === 'card' ? 'Tarjeta' :
        /\b(sueldo|sueldos|salario|salarios)\b/.test(normalized) ? 'Sueldos' : /\bcomision(?:es)?\b/.test(normalized) ? 'Comisiones' : 'Gastos Varios');
    const explicitCategories = categories.filter(category => contains(normalized, category));
    if (!mechanical && explicitCategories.length === 1) expense.category = explicitCategories[0];
    if (!expense.category) delete expense.category;
    if (expense.paymentMethod === 'tarjeta') {
        if (/\b(?:pendiente|a pagar|queda por pagar|sin pagar|proximo resumen)\b/.test(normalized)) expense.cardTiming = 'deferred';
        else if (/\b(?:pague|pagado|ya pago|ya pagada|ya pagado|debitaron|debitado)\b/.test(normalized)) expense.cardTiming = 'paid';
    }

    const spans = [...calendar.spans, ...amounts, ...references.spans];
    if (account) for (const match of normalized.matchAll(new RegExp(`\\b${escape(fold(account.name))}\\b`, 'g'))) spans.push({ start: match.index, end: match.index + match[0].length });
    let concept = blankSpans(original, spans);
    const por = fold(concept).match(/\bpor\b/);
    if (por) concept = concept.slice(por.index + por[0].length);
    concept = concept.replace(/\b(?:en\s+)?(?:efectivo|cash|tarjeta|transferencia|cheque|depósito|deposito|al contado)\b/gi, ' ')
        .replace(/\b(?:pendiente de pago|pendiente|a pagar|ya pagado|ya pagada|sin pagar)\b/gi, ' ')
        .replace(/^\s*(?:pagué|pague|gasté|gaste|aboné|abone|transferí|transferi|compré|compre|registrá|registra|cargá|carga)\b/i, '')
        .replace(/\s+/g, ' ').replace(/^[\s.,:;]+|[\s.,:;]+$/g, '')
        .replace(/^(?:(?:por|en|con|de|del|para|el|la|los|las|un|una)\s+)+/i, '')
        .replace(/(?:\s+(?:del|de|la|el|los|las|para|en|con|por|al))+$/i, '').trim();
    const hasIntent = Boolean(expense.amount || expense.paymentMethod || references.matches.length || mechanical || /\b(pague|gaste|abone|transferi|compre|gasto)\b/.test(normalized));
    if (concept && hasIntent) expense.concept = concept.charAt(0).toLocaleUpperCase('es-AR') + concept.slice(1);
    return { expense, interpretationWarnings };
}

export async function interpretExpenseText(user, { text, requestId } = {}) {
    assertExpensePermission(user);
    if (typeof text !== 'string' || !text.trim() || text.length > 3000) fail('INVALID_DICTATION', 'Escribí o dictá un gasto de hasta 3000 caracteres.');
    if (typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(requestId)) fail('REQUEST_ID_REQUIRED', 'Enviá un identificador válido para el gasto y reutilizalo en los reintentos.');
    // Idempotency is checked before parsing changed reference data on a retry.
    const prior = await GptExpenseDraft.findOne({ userId: user.id || user._id || user.userId, requestId }).select('_id').lean();
    if (prior) return { ...await getExpenseDraft(user, String(prior._id)), interpretationWarnings: [] };
    const accounts = await Account.find({ isActive: { $ne: false } }).select('name type currency').lean();
    const vehicles = [];
    if (hasPermission(user, PERMISSIONS.STOCK_WRITE)) {
        // Cursor batches cover the whole inventory without a page-one selection.
        const cursor = Car.find({}).select('brand name year plateOrVin status infoAuto.versionName').lean().cursor({ batchSize: 100 });
        for await (const vehicle of cursor) vehicles.push(vehicle);
    }
    const categories = await categoriesForExpenses();
    const parsed = parseExpenseText(text, { accounts, vehicles, categories });
    const draft = await createExpenseDraft(user, { requestId, expense: parsed.expense }, { origin: 'crm_dictation' });
    return { ...draft, interpretationWarnings: parsed.interpretationWarnings };
}
