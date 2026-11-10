import { buildCashProjection } from './cashProjection.js';

// Usa las mismas reglas de saldo, venta elegible y fecha de calendario que la
// proyección. El endpoint conserva saleId y añade solo los datos de elegibilidad.
export function getInstallmentCollectionStats(installments = [], asOf = new Date()) {
    const sales = installments.flatMap((item) => {
        if (!item.saleId) return [];
        if (typeof item.saleId === 'object' && item.saleId.status) return [item.saleId];
        if (!item.saleStatus) return [];
        return [{ _id: item.saleId, status: item.saleStatus, historicalOnly: item.saleHistoricalOnly === true }];
    });
    const { calendar } = buildCashProjection({ installments, sales, asOf });
    return calendar.reduce((stats, item) => {
        if (item.daysFromToday === null) stats.sinFecha++;
        else if (item.daysFromToday < 0) stats.vencidas++;
        else if (item.daysFromToday < 7) stats.porVencer++;
        else stats.enFecha++;
        return stats;
    }, { vencidas: 0, porVencer: 0, enFecha: 0, sinFecha: 0 });
}
