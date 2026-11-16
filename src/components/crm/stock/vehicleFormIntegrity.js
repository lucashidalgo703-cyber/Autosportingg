import { stockCurrency } from '../../../utils/inventoryStock.js';
import { parseArgentineMoney } from '../../../utils/saleCommercial.js';

export const investorFormFields = ['isSharedInvestment', 'investorName', 'investorPercentage'];
export const hasVehicleFormChange = (current, initial, fields) => fields.some(key => JSON.stringify(current?.[key]) !== JSON.stringify(initial?.[key]));

// A historical record may be incomplete. Saving a note or a photo must not turn
// empty controls or display defaults into stored financial/operational facts.
export function changedVehiclePayload(payload, initial, current, groups = {}) {
    return Object.fromEntries(Object.entries(payload).filter(([key]) => {
        const sourceFields = groups[key] || (key === 'investor' ? investorFormFields : [key]);
        return hasVehicleFormChange(current, initial, sourceFields);
    }));
}

export function validateVehicleFinancialChanges(current, initial = null) {
    const changed = fields => initial === null || hasVehicleFormChange(current, initial, fields);
    for (const [field, label] of [['price', 'precio de venta'], ['purchasePrice', 'costo de compra o toma']]) {
        if (changed([field]) && current[field] !== '' && current[field] !== undefined && current[field] !== null) {
            const amount = parseArgentineMoney(current[field]);
            if (!Number.isFinite(amount) || amount < 0) return `El ${label} debe ser un importe válido, mayor o igual a cero.`;
        }
    }
    if (changed(['price', 'currency']) && Number(parseArgentineMoney(current.price)) > 0 && !stockCurrency(current.currency)) return 'Elegí explícitamente la moneda del precio de venta.';
    if (changed(['purchasePrice', 'purchaseCurrency']) && Number(parseArgentineMoney(current.purchasePrice)) > 0 && !stockCurrency(current.purchaseCurrency)) return 'Elegí explícitamente la moneda del costo de compra o toma.';
    if (changed(['status']) && !['Disponible', 'Reservado', 'Vendido', 'Pausado'].includes(current.status)) return 'Elegí un estado operativo verificable.';
    if (current.isSharedInvestment && changed(investorFormFields)) {
        const value = current.investorPercentage;
        if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) <= 0 || Number(value) > 100) return 'Indicá el porcentaje real del inversor (mayor que 0 y hasta 100). No se supone un reparto.';
    }
    return null;
}
