export const CAPITAL_CURRENCIES = ['ARS', 'USD'];
export function capitalBucket(summary, currency) {
    const bucket = CAPITAL_CURRENCIES.includes(currency) ? summary?.byCurrency?.[currency] : null;
    return bucket?.currency === currency && bucket.componentes && bucket.totales ? bucket : null;
}
export function capitalAuditRows(bucket, { search = '', status = 'todos' } = {}) {
    const component = bucket?.componentes?.stockPropioCosto;
    const rows = [...new Map([...(component?.items || []), ...(component?.itemsConsignaciones || [])].map(row => [String(row.id), row])).values()];
    const query = search.trim().toLocaleLowerCase('es');
    return rows.filter(row => {
        if (status === 'consignacion' && !row.isConsignment) return false;
        if (status === 'tercero' && !row.isThirdParty) return false;
        if (!['todos', 'consignacion', 'tercero'].includes(status) && String(row.status || 'sin_estado').toLocaleLowerCase('es') !== status) return false;
        return !query || [row.brand, row.name, row.model, row.plate, row.id].some(value => String(value || '').toLocaleLowerCase('es').includes(query));
    });
}
export function capitalAuditCsv(rows, currency) {
    const cell = value => { let text = String(value ?? ''); if (typeof value === 'string' && (/^[\s]*[=+@-]/.test(text) || /^[\t\r]/.test(text))) text = "'" + text; return '"' + text.replace(/"/g, '""') + '"'; };
    const headers = ['ID', 'Marca', 'Modelo', 'Año', 'Patente', 'Estado', 'Propiedad', 'Moneda del informe', 'Moneda original de adquisición', 'Moneda original publicada', 'Costo compra en moneda informe', 'Gastos en moneda informe', 'Costo total en moneda informe', 'Precio publicado en moneda informe', '% Propio', 'Costo propio', 'Precio propio', '% Inversor', 'Costo inversor', 'Precio inversor', 'Publicado de terceros excluidos', 'Motivo'];
    const values = rows.map(row => { const excluded=row.isConsignment||row.isThirdParty; return [row.id, row.brand, row.name || row.model, row.year, row.plate, row.status, row.isThirdParty?'Tercero excluido':row.isConsignment?'Consignada excluida':row.isShared?'Compartida':'Propia', currency, row.originalPurchaseCurrency, row.originalSaleCurrency, row.purchasePrice, row.expenses, row.costoBase, row.price, row.ownPct, row.costoPropio, row.precioPropio, row.invPct, excluded?0:row.costoInv, excluded?0:row.precioInv, excluded?row.price:0, row.reason]; });
    return '\uFEFF' + [headers, ...values].map(row => row.map(cell).join(',')).join('\r\n');
}
export function formatCapitalMoney(value, currency) {
    return CAPITAL_CURRENCIES.includes(currency) && value !== null && value !== undefined && Number.isFinite(Number(value)) ? currency + ' ' + Number(value).toLocaleString('es-AR', { maximumFractionDigits: 2 }) : '—';
}
