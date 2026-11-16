import Link from 'next/link';
import { stockOwnership, formatStockMoney } from '../../../utils/inventoryStock';

export const vehicleYear = vehicle => vehicle.year || vehicle['año'] || 'S/D';
export const vehicleStatus = vehicle => ({ disponible: 'Disponible', reservado: 'Reservado', pausado: 'Pausado', vendido: 'Vendido', sin_estado: 'Sin estado', cancelado: 'Cancelado', anulado: 'Anulado' })[vehicle.estado] || vehicle.estado || 'Sin estado';
export const vehicleOwnership = vehicle => stockOwnership(vehicle._original || vehicle).label;
export const vehicleMoney = (currency, amount) => amount === null || amount === undefined ? 'Sin importe' : `${currency || 'ARS'} ${Number(amount).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
export function StockListTotals({ totalItems = 0, currentPage = 1, totalPages = 1, filteredTotalUSD = 0, filteredTotalARS = 0 }) {
    return <div className="flex flex-wrap justify-between gap-2 rounded-xl border border-crm-border bg-crm-surface p-3 text-xs text-crm-fg"><span><strong>{totalItems} vehículos</strong> · Página {currentPage} de {Math.max(1, totalPages)}</span><span>Venta publicada del filtro completo: <strong>{formatStockMoney({ ARS: filteredTotalARS, USD: filteredTotalUSD })}</strong></span></div>;
}
export function StockVehicleActions({ vehicle, canWrite = false, canReserve = false, onPrint, onEditML, onDelete, onReserve, onMandate }) {
    const button = 'rounded-lg border border-crm-border px-2 py-1.5 text-xs font-semibold text-crm-fg hover:bg-crm-surface-raised';
    return <div className="flex flex-wrap gap-1.5">
        <Link href={`/admin/stock/${vehicle.id}`} className={button}>Ver ficha{canWrite ? ' / Editar' : ''}</Link>
        <button type="button" onClick={() => onPrint?.(vehicle)} className={button}>Imprimir</button>
        {canReserve && vehicle.estado === 'disponible' && <button type="button" onClick={() => onReserve?.(vehicle)} className={button}>Señar</button>}
        {canWrite && <><button type="button" onClick={() => onEditML?.(vehicle)} className={button}>Mercado Libre</button><button type="button" onClick={() => onDelete?.(vehicle)} className={`${button} text-crm-red`}>Eliminar</button></>}
        {vehicle._original?.linkedMandates?.length > 0 && <button type="button" onClick={() => onMandate?.(vehicle)} className={button}>Mandato ({vehicle._original.linkedMandates.length})</button>}
        {vehicle._original?.consignedBy && <Link href={`/admin/stock/${vehicle.id}`} className={`${button} text-amber-300`}>Consignación</Link>}
    </div>;
}
export function StockEmpty({ error, hasActiveFilters, onRetry, onClearFilters, onNewVehicle }) {
    const action = error ? onRetry : hasActiveFilters ? onClearFilters : onNewVehicle;
    return <div className="rounded-xl border border-dashed border-crm-border p-8 text-center text-crm-fg"><h3 className="font-semibold">{error ? 'Error al cargar Stock' : hasActiveFilters ? 'Sin coincidencias' : 'Inventario vacío'}</h3><p className="text-sm text-crm-fg-muted">{error || (hasActiveFilters ? 'Revisá la búsqueda y los filtros del inventario.' : 'Todavía no hay unidades registradas.')}</p>{action && <button type="button" className="rounded-lg border border-crm-border px-3 py-2 text-sm" onClick={action}>{error ? 'Reintentar' : hasActiveFilters ? 'Limpiar filtros' : 'Nuevo vehículo'}</button>}</div>;
}
