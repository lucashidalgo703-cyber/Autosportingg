"use client";
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import StockCommercialCalculator from './StockCommercialCalculator';
import { StockEmpty, StockListTotals, StockVehicleActions, vehicleMoney, vehicleOwnership, vehicleStatus, vehicleYear } from './StockVehiclePresentation';
import { formatStockMoney } from '../../../utils/inventoryStock';

export default function StockMobileCards(props) {
    const { data = [], canSeeCosts = false } = props;
    const [expandedId, setExpandedId] = useState(null);
    if (!data.length) return <StockEmpty {...props} />;
    return <div className="space-y-3"><StockListTotals {...props} />{data.map(vehicle => <article data-stock-vehicle={vehicle.id} key={vehicle.id} className="overflow-hidden rounded-xl border border-crm-border bg-crm-surface p-3 text-xs text-crm-fg">
        <h3 className="m-0 text-sm font-semibold">{vehicle.marca} {vehicle.modelo} · {vehicleYear(vehicle)}</h3><p className="m-0 mt-1 text-crm-fg-muted">{vehicle.version}</p><p className="mt-2 font-mono">{vehicle.dominio} · {Number(vehicle.kilometraje || 0).toLocaleString('es-AR')} km</p>
        <div className="my-3 grid grid-cols-2 gap-3"><div><span className="block text-crm-fg-muted">Estado operativo</span><strong>{vehicleStatus(vehicle)}</strong></div><div><span className="block text-crm-fg-muted">Propiedad</span><strong>{vehicleOwnership(vehicle)}</strong></div>{canSeeCosts && <div><span className="block text-crm-fg-muted">Costo acumulado</span><strong>{vehicle.hasAcquisitionCost ? formatStockMoney(vehicle.costByCurrency) : 'Costo pendiente'}</strong></div>}<div><span className="block text-crm-fg-muted">Precio de venta</span><strong>{vehicleMoney(vehicle.moneda, vehicle.precioPublicado)}</strong></div></div>
        <StockVehicleActions {...props} vehicle={vehicle} />
        <button type="button" aria-expanded={expandedId === vehicle.id} onClick={() => setExpandedId(expandedId === vehicle.id ? null : vehicle.id)} className="mt-3 flex w-full items-center justify-between border-t border-crm-border pt-3 text-blue-400">Detalle comercial / simular<ChevronDown size={16} className={expandedId === vehicle.id ? 'rotate-180' : ''} /></button>
        {expandedId === vehicle.id && <div className="pt-3"><StockCommercialCalculator vehicle={vehicle} canSeeCosts={canSeeCosts} /></div>}
    </article>)}</div>;
}
