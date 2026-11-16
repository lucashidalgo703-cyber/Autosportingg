"use client";
import { Fragment, useState } from 'react';
import StockCommercialCalculator from './StockCommercialCalculator';
import { StockEmpty, StockListTotals, StockVehicleActions, vehicleMoney, vehicleOwnership, vehicleStatus, vehicleYear } from './StockVehiclePresentation';
import { formatStockMoney } from '../../../utils/inventoryStock';

export default function StockTable(props) {
    const { data = [], onSwap, isSwapping, currentPage = 1, totalPages = 1, canSeeCosts = false, canWrite = false } = props;
    const [expandedId, setExpandedId] = useState(null);
    if (!data.length) return <StockEmpty {...props} />;
    return <div className="space-y-3"><StockListTotals {...props} /><div className="overflow-x-auto rounded-xl border border-crm-border bg-crm-surface"><table className="w-full min-w-[1060px] text-left text-xs text-crm-fg"><thead className="bg-crm-bg text-crm-fg-muted"><tr>{['Orden', 'Modelo / versión', 'Año', 'Patente / VIN', 'Estado operativo', 'Propiedad', ...(canSeeCosts ? ['Costo acumulado'] : []), 'Precio de venta', 'Acciones'].map(label => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-crm-border">{data.map((vehicle, index) => <Fragment key={vehicle.id}>
        <tr data-stock-vehicle={vehicle.id} className="align-top hover:bg-crm-surface-raised/40"><td className="px-3 py-3"><span>{(currentPage - 1) * 20 + index + 1}</span>{canWrite && <div className="mt-1 flex gap-1">{['up', 'down'].map(direction => <button type="button" key={direction} onClick={() => onSwap?.(index, direction)} disabled={isSwapping || (direction === 'up' ? currentPage === 1 && index === 0 : currentPage === totalPages && index === data.length - 1)} className="rounded border border-crm-border px-1 disabled:opacity-30" aria-label={direction === 'up' ? 'Subir posición' : 'Bajar posición'}>{direction === 'up' ? '▲' : '▼'}</button>)}</div>}</td>
            <td className="max-w-[220px] px-3 py-3"><strong>{vehicle.marca} {vehicle.modelo}</strong><p className="m-0 mt-1 line-clamp-2 text-crm-fg-muted">{vehicle.version}</p><p className="m-0 mt-1 text-crm-fg-muted">{Number(vehicle.kilometraje || 0).toLocaleString('es-AR')} km · {vehicle.diasEnStock} días</p><button type="button" aria-expanded={expandedId === vehicle.id} onClick={() => setExpandedId(expandedId === vehicle.id ? null : vehicle.id)} className="mt-2 text-blue-400 underline">{expandedId === vehicle.id ? 'Cerrar detalle comercial' : 'Detalle comercial / simular'}</button></td>
            <td className="px-3 py-3">{vehicleYear(vehicle)}</td><td className="px-3 py-3 font-mono">{vehicle.dominio}</td><td className="px-3 py-3">{vehicleStatus(vehicle)}</td><td className="max-w-[180px] px-3 py-3">{vehicleOwnership(vehicle)}</td>
            {canSeeCosts && <td className="px-3 py-3"><strong>{vehicle.hasAcquisitionCost ? formatStockMoney(vehicle.costByCurrency) : 'Costo pendiente'}</strong>{vehicle.costComplete === false && <p className="mt-1 text-amber-300">Subtotal conocido · revisar datos en la ficha</p>}{!vehicle.hasAcquisitionCost && (vehicle.costByCurrency.ARS > 0 || vehicle.costByCurrency.USD > 0) && <p className="mt-1 text-crm-fg-muted">Gastos: {formatStockMoney(vehicle.costByCurrency)}</p>}</td>}
            <td className="px-3 py-3 font-semibold">{vehicleMoney(vehicle.moneda, vehicle.precioPublicado)}</td><td className="max-w-[250px] px-3 py-3"><StockVehicleActions {...props} vehicle={vehicle} /></td></tr>
        {expandedId === vehicle.id && <tr data-stock-detail={vehicle.id}><td colSpan={canSeeCosts ? 9 : 8} className="border-t border-crm-border bg-crm-bg/50 p-4"><StockCommercialCalculator vehicle={vehicle} canSeeCosts={canSeeCosts} /></td></tr>}
    </Fragment>)}</tbody></table></div></div>;
}
