import mongoose from 'mongoose';
import SavedStockView from '../models/SavedStockView.js';
import { parseStockFilters, STOCK_FILTER_KEYS } from '../utils/stockFilters.js';

export function stockViewOwner(actor) {
    const id = actor?.id || actor?.userId;
    if (!id || !mongoose.isValidObjectId(id)) throw Object.assign(new Error('No se pudo identificar la sesión.'), { statusCode: 401 });
    return id;
}

export async function saveStockView(actor, payload) {
    const userId = stockViewOwner(actor);
    if (typeof payload?.name !== 'string' || !payload.name.trim() || payload.name.trim().length > 80) throw Object.assign(new Error('Ingresá un nombre de hasta 80 caracteres.'), { statusCode: 400 });
    if (!payload.filters || typeof payload.filters !== 'object' || Array.isArray(payload.filters)) throw Object.assign(new Error('Los filtros de la vista no son válidos.'), { statusCode: 400 });
    const name = payload.name.trim();
    const nameKey = name.toLocaleLowerCase('es');
    const parsed = parseStockFilters(payload.filters);
    const filters = Object.fromEntries(STOCK_FILTER_KEYS.map(key => [key, parsed[key]]));
    filters.vista = payload.filters.vista === 'capital' ? 'capital' : 'inventario';
    filters.presentacion = ['list', 'cards', 'detailed'].includes(payload.filters.presentacion) ? payload.filters.presentacion : 'list';
    const existing = await SavedStockView.findOne({ userId, nameKey });
    if (!existing && await SavedStockView.countDocuments({ userId }) >= 30) throw Object.assign(new Error('Podés conservar hasta 30 búsquedas. Eliminá una para guardar otra.'), { statusCode: 400 });
    return SavedStockView.findOneAndUpdate({ userId, nameKey }, { $set: { name, filters } }, { upsert: true, new: true, runValidators: true });
}
