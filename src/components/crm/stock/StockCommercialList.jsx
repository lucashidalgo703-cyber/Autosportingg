"use client";
import { Car, ImageOff, FileCheck, ChevronRight } from 'lucide-react';
import { canReserveVehicle, getVehicleStatusLabel } from '../../../utils/vehicleDetail';

export default function StockCommercialList({ data = [], summaries = {}, onQuickView, onOpenDetail, onInspect, onEditML, onReserve, onPrint, compareIds = [], onToggleCompare, canCompare = true, hasActiveFilters, onClearFilters }) {
    if (!data.length) return <div className="rounded-xl border border-dashed border-crm-border bg-crm-surface px-4 py-12 text-center"><h2 className="text-sm font-semibold text-crm-fg">{hasActiveFilters ? 'Sin coincidencias' : 'Inventario vacío'}</h2><p className="text-xs text-crm-fg-muted">{hasActiveFilters ? 'Probá con otra búsqueda o ajustá los filtros.' : 'Todavía no hay vehículos registrados.'}</p>{hasActiveFilters && <button type="button" onClick={onClearFilters} className="mt-2 text-xs text-crm-red">Limpiar filtros</button>}</div>;
    return <div className="divide-y divide-crm-border overflow-hidden rounded-xl border border-crm-border bg-crm-surface">
        {data.map(vehicle => {
            const source = vehicle._original || {};
            const responsibility = source.consignmentSeller?.name || source.consignmentSeller?.email || source.consignedBy || 'Sin responsable asignado';
            const hasPhoto = Boolean(vehicle.fotos?.length);
            const inspectionDone = Boolean(source.inspection?.updatedAt || source.inspection?.updatedBy);
            const published = ['si', 'sí'].includes(String(source.publishedOnML || '').trim().toLowerCase());
            const selected = compareIds.includes(vehicle.id);
            const summary = summaries[vehicle.id];
            return <article key={vehicle.id} className="grid min-w-0 grid-cols-[84px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:p-4">
                <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => onQuickView(vehicle)} aria-label={`Ficha rápida de ${vehicle.marca} ${vehicle.modelo}`} className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-crm-border bg-crm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red">{hasPhoto ? <img src={vehicle.fotos[0]} alt="" className="h-full w-full object-cover" style={{ objectPosition: source.imagePositions?.[0] || source.imagePosition || '50% 75%' }} /> : <Car size={28} className="mx-auto text-crm-fg-muted" />}</button>
                    {canCompare && <label className="flex min-h-8 items-center gap-1.5 text-[11px] text-crm-fg-muted"><input type="checkbox" checked={selected} onChange={() => onToggleCompare?.(vehicle)} className="accent-crm-red" />Comparar</label>}
                </div>
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                        <div className="min-w-0"><button type="button" onClick={() => onQuickView(vehicle)} className="block max-w-full break-words text-left text-sm font-semibold leading-5 text-crm-fg hover:text-crm-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red">{vehicle.marca} {vehicle.modelo}</button><p className="m-0 mt-0.5 text-xs text-crm-fg-muted">{vehicle.año} · {Number(vehicle.kilometraje || 0).toLocaleString('es-AR')} km · <span className="font-mono">{vehicle.dominio || 'Sin dominio'}</span></p></div>
                        <strong className="text-sm font-semibold text-crm-fg">{Number(vehicle.precioPublicado) > 0 ? `${vehicle.moneda} ${Number(vehicle.precioPublicado).toLocaleString('es-AR')}` : 'Sin precio registrado'}</strong>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-crm-fg-muted"><button type="button" onClick={() => onQuickView(vehicle, 'estado')} aria-label={`Ver detalle del estado de ${vehicle.marca} ${vehicle.modelo}`} className="inline-flex min-h-7 items-center gap-1 rounded-full border border-crm-border bg-crm-bg px-2 capitalize text-crm-fg">{getVehicleStatusLabel(vehicle)}<ChevronRight size={11} /></button><span className="capitalize">{vehicle.origen}{vehicle.investor?.percentage > 0 ? ` · ${vehicle.investor.percentage}% inversor` : ''}</span><span>{vehicle.diasEnStock == null ? 'Ingreso sin fecha' : `${vehicle.diasEnStock} días en stock`}</span><span>{source.location || 'Sin ubicación'}</span></div>
                    <p className="m-0 break-words text-[11px] text-crm-fg-muted">Responsable: {responsibility}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]"><button type="button" onClick={() => onQuickView(vehicle, 'clientes')} className="min-h-7 text-crm-fg-muted underline decoration-crm-border underline-offset-2 hover:text-crm-fg">{summary?.matchingRequests != null ? `${summary.matchingRequests} coincidencias de demanda` : 'Ver coincidencias de demanda'}</button><button type="button" onClick={() => onQuickView(vehicle, 'consultas')} className="min-h-7 text-crm-fg-muted underline decoration-crm-border underline-offset-2 hover:text-crm-fg">{summary?.interestedPeople != null ? `${summary.interestedPeople} personas consultaron` : 'Ver personas que consultaron'}</button></div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-crm-border/70 pt-1.5 text-[11px]">
                        {!published && <button type="button" onClick={() => onEditML ? onEditML(vehicle) : onOpenDetail(vehicle, 'publicaciones')} className="inline-flex min-h-7 items-center gap-1 text-amber-500">Mercado Libre pendiente</button>}
                        {!hasPhoto && <button type="button" onClick={() => onOpenDetail(vehicle, 'resumen')} className="inline-flex min-h-7 items-center gap-1 text-crm-fg-muted"><ImageOff size={12} />Sin foto</button>}
                        <button type="button" onClick={() => onInspect ? onInspect(vehicle) : onOpenDetail(vehicle, 'documentacion')} className="inline-flex min-h-7 items-center gap-1 text-crm-fg-muted"><FileCheck size={12} />{inspectionDone ? 'Ver peritaje' : 'Peritaje pendiente'}</button>
                        {onReserve && <button type="button" onClick={() => onReserve(vehicle)} disabled={!canReserveVehicle(vehicle)} className="min-h-7 text-crm-red disabled:opacity-40">Señar</button>}
                        <button type="button" onClick={() => onPrint?.(vehicle)} className="min-h-7 text-crm-fg-muted">Imprimir</button>
                    </div>
                </div>
            </article>;
        })}
    </div>;
}
