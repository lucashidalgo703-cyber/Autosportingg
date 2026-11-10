import { parseArgentineMoney } from './saleCommercial.js';

// Shared by the vehicle forms and the API. This module has no browser or database dependencies.
const REQUIRED_TEXT = { brand: 'La marca', name: 'El modelo', fuel: 'El combustible', condition: 'La condición' };
const TEXT_LIMITS = {
    brand: 200, name: 300, fuel: 100, condition: 100, vehicleType: 100,
    plateOrVin: 100, chassisNumber: 100, engineNumber: 100, color: 100,
    transmission: 100, bodyType: 100, engine: 100, version: 300,
    ownerName: 300, ownerPhone: 100, ownerEmail: 320, linkedClient: 300,
    consignedBy: 300, location: 300, description: 20000, notes: 20000,
    publishedBy: 300, mlLink: 2000,
};
const BOOL_FIELDS = ['agencyOwned', 'visibleEnWeb', 'featured', 'sold'];
const CURRENCY_ALIASES = { USD: 'USD', 'U$S': 'USD', 'US$': 'USD', ARS: 'ARS', '$': 'ARS' };
const EMPTY_IDENTIFIERS = new Set(['SD', 'SP', 'SN', 'NA', 'SINDOMINIO', 'SINPATENTE', 'SINVIN', 'SINCHASIS', 'SINNUMERO', 'NOAPLICA', 'PENDIENTE', 'ACONFIRMAR', '0KM']);
const blank = value => value === undefined || value === null || (typeof value === 'string' && !value.trim());
const own = (input, key) => Object.hasOwn(input, key);

export function normalizeVehicleIdentifier(value) {
    if (typeof value !== 'string') return '';
    const normalized = value.normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g, '');
    // Short labels and explicit unknowns in legacy stock are not identifying documents.
    return normalized.length < 4 || EMPTY_IDENTIFIERS.has(normalized) ? '' : normalized;
}

export function vehicleIdentifierPattern(value) {
    const normalized = normalizeVehicleIdentifier(value);
    return normalized ? new RegExp(`^[^A-Z0-9]*${normalized.split('').join('[^A-Z0-9]*')}[^A-Z0-9]*$`, 'i') : null;
}

export function resolveVehicleImageOrder({ existing = [], uploaded = [], order, images }) {
    let requested = order === undefined ? images : order;
    if (requested === undefined) return [...existing, ...uploaded];
    if (typeof requested === 'string') {
        try { requested = JSON.parse(requested); } catch { throw new Error('No se pudo interpretar el orden de las fotos.'); }
    }
    if (!Array.isArray(requested) || requested.some(item => typeof item !== 'string')) throw new Error('Revisá el orden de las fotos.');
    const allowed = new Set([...existing, ...uploaded]);
    const resolved = requested.map(item => {
        const newFile = /^__new__(\d+)$/.exec(item);
        if (newFile) {
            const image = uploaded[Number(newFile[1])];
            if (!image) throw new Error('Una foto nueva no se recibió. Volvé a seleccionarla.');
            return image;
        }
        if (!allowed.has(item)) throw new Error('Una foto ya no pertenece a esta unidad. Actualizá la ficha antes de guardar.');
        return item;
    });
    if (new Set(resolved).size !== resolved.length) throw new Error('Una misma foto no puede aparecer dos veces.');
    return resolved;
}

export function validateVehicleInput(input, { partial = false, now = new Date() } = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return { values: {}, errors: { _form: 'Los datos del vehículo no son válidos.' } };
    }
    const values = { ...input };
    const errors = {};
    for (const [key, limit] of Object.entries(TEXT_LIMITS)) {
        if (!own(input, key)) {
            if (!partial && REQUIRED_TEXT[key]) errors[key] = `Completá ${REQUIRED_TEXT[key].toLowerCase()}.`;
            continue;
        }
        if (input[key] === null && !REQUIRED_TEXT[key]) { values[key] = ''; continue; }
        if (typeof input[key] !== 'string') { errors[key] = 'Ingresá un texto válido.'; continue; }
        values[key] = input[key].trim();
        if (REQUIRED_TEXT[key] && !values[key]) errors[key] = `Completá ${REQUIRED_TEXT[key].toLowerCase()}.`;
        else if (values[key].length > limit) errors[key] = `Este campo no puede superar ${limit} caracteres.`;
    }
    for (const key of BOOL_FIELDS) {
        if (!own(input, key)) continue;
        if (input[key] === true || input[key] === 'true') values[key] = true;
        else if (input[key] === false || input[key] === 'false') values[key] = false;
        else errors[key] = 'Elegí una opción válida.';
    }
    for (const key of ['currency', 'purchaseCurrency']) {
        if (!own(input, key)) {
            if (!partial && key === 'currency') errors[key] = 'Indicá la moneda del precio de venta.';
            continue;
        }
        const code = typeof input[key] === 'string' ? CURRENCY_ALIASES[input[key].trim().toUpperCase()] : undefined;
        if (!code) errors[key] = 'Elegí ARS o USD.';
        else values[key] = code;
    }
    for (const [key, label] of Object.entries({ price: 'El precio de venta', purchasePrice: 'El costo de compra/toma', km: 'El kilometraje' })) {
        if (!own(input, key)) {
            if (!partial && key !== 'purchasePrice') errors[key] = `${label} es obligatorio.`;
            continue;
        }
        if (blank(input[key]) && key === 'purchasePrice' && !partial) { delete values[key]; continue; }
        const number = ['string', 'number'].includes(typeof input[key]) ? parseArgentineMoney(input[key]) : NaN;
        if (!Number.isFinite(number) || number < 0 || number > Number.MAX_SAFE_INTEGER) {
            errors[key] = `${label} debe ser un número válido mayor o igual a cero.`;
        } else values[key] = number;
    }
    const numericFields = {
        year: { min: 1886, max: now.getFullYear() + 2, label: 'El año', required: true },
        owners: { min: 1, max: Number.MAX_SAFE_INTEGER, label: 'La cantidad de dueños' },
        doors: { min: 0, max: 12, label: 'La cantidad de puertas' },
    };
    for (const [key, rule] of Object.entries(numericFields)) {
        if (!own(input, key)) {
            if (!partial && rule.required) errors[key] = `${rule.label} es obligatorio.`;
            continue;
        }
        if (!rule.required && blank(input[key])) { values[key] = null; continue; }
        const value = ['string', 'number'].includes(typeof input[key]) && !blank(input[key]) ? Number(input[key]) : NaN;
        if (!Number.isSafeInteger(value) || value < rule.min || value > rule.max) errors[key] = `${rule.label} debe ser un entero entre ${rule.min} y ${rule.max}.`;
        else values[key] = value;
    }
    if (own(input, 'status') && !['Disponible', 'Pausado', 'Reservado', 'Vendido'].includes(input.status)) errors.status = 'Elegí un estado válido del vehículo.';
    if (own(input, 'investor')) {
        let investor = input.investor;
        if (typeof investor === 'string') { try { investor = JSON.parse(investor); } catch { investor = null; } }
        if (!investor || typeof investor !== 'object' || Array.isArray(investor)) errors.investor = 'Revisá los datos del inversor.';
        else {
            const percentage = blank(investor.percentage) ? 0 : (['number', 'string'].includes(typeof investor.percentage) ? Number(investor.percentage) : NaN);
            if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) errors.investorPercentage = 'La participación del inversor debe estar entre 0 y 100%.';
            if (percentage > 0 && (typeof investor.name !== 'string' || !investor.name.trim())) errors.investorName = 'Indicá el nombre del inversor.';
            if (typeof investor.name === 'string' && investor.name.length > 300) errors.investorName = 'El nombre del inversor no puede superar 300 caracteres.';
            values.investor = { name: typeof investor.name === 'string' ? investor.name.trim() : '', percentage };
        }
    }
    if (own(input, 'documentation')) {
        let documentation = input.documentation;
        if (typeof documentation === 'string') { try { documentation = JSON.parse(documentation); } catch { documentation = null; } }
        const allowed = ['tituloAutomotor', 'cedulaVerde', 'verificacionPolicial', 'informeDominio', 'formulario08', 'libreDeudaPatentes'];
        if (!documentation || typeof documentation !== 'object' || Array.isArray(documentation) || Object.entries(documentation).some(([key, value]) => !allowed.includes(key) || !['recibido', 'pendiente', 'no aplica'].includes(value))) {
            errors.documentation = 'Revisá los estados de documentación.';
        } else values.documentation = documentation;
    }
    if (own(input, 'purchasePayment')) {
        let payment = input.purchasePayment;
        if (typeof payment === 'string') { try { payment = JSON.parse(payment); } catch { payment = null; } }
        if (!payment || typeof payment !== 'object' || Array.isArray(payment)) errors.purchasePayment = 'Revisá los datos del pago de compra.';
        else {
            const normalized = { ...payment, modality: payment.modality || 'ya_pagado_historico' };
            if (!['pagar_ahora', 'pago_parcial', 'pendiente', 'ya_pagado_historico'].includes(normalized.modality)) errors['purchasePayment.modality'] = 'Elegí una modalidad válida para el pago de compra.';
            if (own(payment, 'amountPaid') && !blank(payment.amountPaid)) {
                normalized.amountPaid = ['number', 'string'].includes(typeof payment.amountPaid) ? parseArgentineMoney(payment.amountPaid) : NaN;
                if (!Number.isFinite(normalized.amountPaid) || normalized.amountPaid < 0) errors['purchasePayment.amountPaid'] = 'Ingresá un importe abonado válido mayor o igual a cero.';
            }
            values.purchasePayment = normalized;
        }
    }
    return { values, errors };
}
