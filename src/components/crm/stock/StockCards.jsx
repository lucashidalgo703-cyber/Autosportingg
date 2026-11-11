"use client";
import Link from 'next/link';
import Image from 'next/image';
import { Car } from 'lucide-react';
import { stockIsPublished } from '../../../utils/stockFilters.js';
import { vehicleDetailHref } from '../../../utils/stockNavigation.js';
import { canReserveVehicle, getVehicleStatusLabel } from '../../../utils/vehicleDetail.js';

export default function StockCards({ data, onPrint, onReserve, onEditML, onDelete, hasActiveFilters, onClearFilters, returnTo = '/admin/stock' }) {
    if (!data.length) return <div className="mt-4 rounded-xl border border-dashed border-crm-border p-8 text-center"><h2 className="m-0 text-base font-semibold text-crm-fg">{hasActiveFilters ? 'Sin coincidencias' : 'Inventario vacío'}</h2><p className="text-sm text-crm-fg-muted">{hasActiveFilters ? 'No hay vehículos que coincidan con los filtros aplicados.' : 'Todavía no hay vehículos registrados en el stock.'}</p>{hasActiveFilters && <button type="button" onClick={onClearFilters} className="text-sm text-crm-red">Limpiar filtros</button>}</div>;
    return <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.map(vehicle => <article key={vehicle.id} className="min-w-0 overflow-hidden rounded-xl border border-crm-border bg-crm-surface">
            <Link href={vehicleDetailHref(vehicle.id, returnTo)} className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-crm-bg text-crm-fg-muted" aria-label={`Ver ficha de ${vehicle.marca} ${vehicle.modelo}`}>
                {vehicle.fotos?.[0] ? <Image src={vehicle.fotos[0]} alt={`${vehicle.marca} ${vehicle.modelo}`} fill unoptimized sizes="(min-width:1280px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover" /> : <Car size={42} aria-hidden="true" />}
            </Link>
            <div className="flex flex-col gap-3 p-3">
                <div><h2 className="m-0 truncate text-sm font-semibold text-crm-fg"><Link href={vehicleDetailHref(vehicle.id, returnTo)}>{vehicle.marca} {vehicle.modelo}</Link></h2><p className="m-0 mt-1 text-xs text-crm-fg-muted">{vehicle['año']} · {Number(vehicle.kilometraje).toLocaleString('es-AR')} km · {vehicle.dominio}</p></div>
                <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-base text-crm-fg">{Number(vehicle.precioPublicado) > 0 ? `${vehicle.moneda} ${Number(vehicle.precioPublicado).toLocaleString('es-AR')}` : 'Sin precio'}</strong><span className="rounded-full border border-crm-border px-2 py-0.5 text-xs text-crm-fg-muted">{getVehicleStatusLabel(vehicle)}</span></div>
                <div className="flex flex-wrap justify-between gap-2 text-xs text-crm-fg-muted"><span>{vehicle.origen === 'compartido' ? `Compartido (${Number(vehicle.investor?.percentage) || 0}% inversor)` : vehicle.origen}</span><span>{vehicle.diasEnStock === null ? 'Ingreso sin fecha' : `${vehicle.diasEnStock} días en stock`}</span></div>
                <div className="flex flex-wrap gap-1 border-t border-crm-border pt-2">
                    <Link href={vehicleDetailHref(vehicle.id, returnTo)} className="inline-flex h-8 items-center rounded-lg px-2 text-xs font-medium text-crm-fg hover:bg-crm-surface-raised">Ver ficha</Link>
                    {onEditML && <button type="button" onClick={() => onEditML(vehicle)} className="h-8 rounded-lg px-2 text-xs text-crm-fg-muted hover:bg-crm-surface-raised">{stockIsPublished(vehicle._original?.publishedOnML) ? 'ML publicado' : 'Registrar ML'}</button>}
                    <button type="button" onClick={() => onPrint?.(vehicle)} className="h-8 rounded-lg px-2 text-xs text-crm-fg-muted hover:bg-crm-surface-raised">Imprimir</button>
                    {onReserve && <button type="button" disabled={!canReserveVehicle(vehicle)} onClick={() => onReserve(vehicle)} className="h-8 rounded-lg px-2 text-xs text-crm-fg-muted hover:bg-crm-surface-raised disabled:opacity-40">Señar</button>}
                    {onDelete && <button type="button" onClick={() => onDelete(vehicle)} className="h-8 rounded-lg px-2 text-xs text-crm-red hover:bg-crm-red/10">Eliminar</button>}
                </div>
            </div>
        </article>)}
    </div>;
}
