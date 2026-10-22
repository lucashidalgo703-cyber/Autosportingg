// Formato educativo: decimal con signo opcional, sin agrupación ni exponentes.
export function parseAcademyDecimal(raw) {
    if (typeof raw === 'number') {
        if (Number.isFinite(raw)) return raw;
        throw new Error('Ingresá un decimal finito.');
    }
    if (typeof raw !== 'string' || !/^[+-]?\d+(?:[.,]\d+)?$/.test(raw.trim())) {
        throw new Error('Usá números decimales sin separadores de miles, exponentes ni prefijos.');
    }
    const value = Number(raw.trim().replace(',', '.'));
    if (!Number.isFinite(value)) throw new Error('El número excede el rango admitido.');
    return value;
}
