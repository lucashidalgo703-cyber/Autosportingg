const PREFIX = 'autosporting_vehicle_draft_v1_';
export const VEHICLE_DRAFT_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const FIELDS = new Set(['brand', 'name', 'version', 'description', 'year', 'km', 'fuel', 'condition', 'price', 'currency', 'featured', 'status', 'vehicleType', 'plateOrVin', 'color', 'purchasePrice', 'purchaseCurrency', 'location', 'owners', 'agencyOwned', 'ownerName', 'linkedClient', 'ownerPhone', 'ownerEmail', 'consignedBy', 'engineNumber', 'chassisNumber', 'transmission', 'bodyType', 'doors', 'engine', 'hasManuals', 'hasDuplicateKeys', 'hasOfficialServices', 'publishedOnML', 'publishedBy', 'mlLink', 'notes', 'visibleEnWeb', 'isSharedInvestment', 'investorName', 'investorPercentage', 'documentation', 'receivedAsTradeIn']);

export function vehicleDraftIdentity(token, now = Date.now()) {
    try {
        if (typeof token !== 'string' || token.split('.').length !== 3) return null;
        const encoded = atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(encoded, character => character.charCodeAt(0))));
        if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= now) return null;
        const id = payload.id || payload._id || payload.username;
        return typeof id === 'string' && id.trim() && id.length <= 128 ? id : null;
    } catch { return null; }
}

function safeValues(values) {
    const result = {};
    for (const [key, value] of Object.entries(values || {})) {
        if (key === 'draftPurchaseModality' && ['pagar_ahora', 'pendiente', 'pago_parcial', 'ya_pagado_historico'].includes(value)) { result[key] = value; continue; }
        if (!FIELDS.has(key)) continue;
        if (key === 'documentation' && value && typeof value === 'object' && !Array.isArray(value)) {
            result.documentation = Object.fromEntries(Object.entries(value).filter(([name, status]) => ['tituloAutomotor', 'cedulaVerde', 'verificacionPolicial', 'informeDominio', 'formulario08', 'libreDeudaPatentes'].includes(name) && ['recibido', 'pendiente', 'no aplica'].includes(status)));
        } else if (typeof value === 'string') result[key] = value.slice(0, 10000);
        else if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) result[key] = value;
    }
    return result;
}

export function readVehicleDraft(storage, userId, now = Date.now()) {
    if (!storage || !userId) return null;
    try {
        const data = JSON.parse(storage.getItem(PREFIX + encodeURIComponent(userId)));
        if (!data || data.version !== 1 || data.userId !== userId || !Number.isFinite(data.savedAt) || data.savedAt > now || now - data.savedAt > VEHICLE_DRAFT_MAX_AGE) return null;
        return { savedAt: data.savedAt, values: safeValues(data.values) };
    } catch { return null; }
}

export function writeVehicleDraft(storage, userId, values, now = Date.now()) {
    if (!storage || !userId) return false;
    try { storage.setItem(PREFIX + encodeURIComponent(userId), JSON.stringify({version: 1, userId, savedAt: now, values: safeValues(values)})); return true; } catch { return false; }
}

export function clearVehicleDraft(storage, userId) {
    if (!storage || !userId) return;
    try { storage.removeItem(PREFIX + encodeURIComponent(userId)); } catch { /* Storage may be disabled. */ }
}
