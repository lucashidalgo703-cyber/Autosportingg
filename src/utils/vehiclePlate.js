// Complete the existing plateOrVin value only when it contains no identifier.
// Keep VINs and previously entered plates intact, including unfamiliar formats.
export function isMissingVehiclePlate(value) {
    const raw = String(value ?? '').normalize('NFKC').trim().toUpperCase();
    const token = raw.replace(/[ _./-]/g, '');
    return !raw || /^[\s./—-]+$/.test(raw) || ['SD', 'SP', 'SINDOMINIO', 'SINPATENTE', 'SINASIGNAR', 'NOINFORMADO', 'NOESPECIFICADO'].includes(token);
}

export function normalizeVehiclePlate(value) {
    if (typeof value !== 'string' || value.length > 30) return null;
    const plate = value.trim().toUpperCase().replace(/[ -]/g, '');
    // Auto and motorcycle identifiers, plus the older provincial format.
    return /^(?:[A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2}|[A-Z]\d{3}[A-Z]{3}|\d{3}[A-Z]{3}|[A-Z]\d{6})$/.test(plate) ? plate : null;
}
