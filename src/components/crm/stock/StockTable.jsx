"use client";
import Link from 'next/link';
import VehicleStatusBadge from './VehicleStatusBadge';
import VehicleRotationAlert from './VehicleRotationAlert';
import { MoreHorizontal, ArrowRight } from 'lucide-react';
import CrmButton from '../ui/CrmButton';

export default function StockTable({ data }) {
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-crm-surface rounded-xl border border-crm-border text-center">
                <p className="text-crm-fg-muted mb-2">No se encontraron vehículos que coincidan con la búsqueda.</p>
            </div>
        );
    }

    return (
        <div className="bg-crm-surface rounded-xl border border-crm-border overflow-x-auto">
            <table className="w-full text-left text-sm text-crm-fg-muted">
                <thead className="bg-crm-topbar border-b border-crm-border text-[10px] uppercase text-crm-fg-muted">
                    <tr>
                        <th className="px-4 py-3 font-medium">Unidad</th>
                        <th className="px-4 py-3 font-medium">Origen</th>
                        <th className="px-4 py-3 font-medium">Costo Total</th>
                        <th className="px-4 py-3 font-medium">Precio (Pub.)</th>
                        <th className="px-4 py-3 font-medium">Margen Est.</th>
                        <th className="px-4 py-3 font-medium text-center">Stock</th>
                        <th className="px-4 py-3 font-medium text-center">Estado</th>
                        <th className="px-4 py-3 font-medium text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-crm-border">
                    {data.map((vehicle) => (
                        <tr key={vehicle.id} className="hover:bg-crm-surface-raised transition-colors group">
                            <td className="px-4 py-3">
                                <div className="flex flex-col">
                                    <span className="font-semibold text-white">{vehicle.marca} {vehicle.modelo}</span>
                                    <span className="text-xs">{vehicle.version} • {vehicle.año} • {vehicle.kilometraje.toLocaleString('es-AR')} km</span>
                                    <span className="text-xs font-mono mt-0.5 px-1.5 py-0.5 bg-crm-bg border border-crm-border rounded w-fit">{vehicle.dominio}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 capitalize">{vehicle.origen}</td>
                            <td className="px-4 py-3">
                                {vehicle.costoTotal > 0 ? (
                                    <span className="text-white">{vehicle.moneda} {vehicle.costoTotal.toLocaleString('es-AR')}</span>
                                ) : (
                                    <span className="text-crm-fg-muted italic">N/A</span>
                                )}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#22C55E]">
                                {vehicle.moneda} {vehicle.precioPublicado.toLocaleString('es-AR')}
                            </td>
                            <td className="px-4 py-3">
                                {vehicle.margenEstimado > 0 ? (
                                    <div className="flex flex-col">
                                        <span className="text-white">{vehicle.moneda} {vehicle.margenEstimado.toLocaleString('es-AR')}</span>
                                        <span className="text-xs text-crm-fg-muted">{vehicle.margenPorcentual}%</span>
                                    </div>
                                ) : (
                                    <span className="text-crm-fg-muted italic">N/A</span>
                                )}
                            </td>
                            <td className="px-4 py-3 text-center">
                                <VehicleRotationAlert dias={vehicle.diasEnStock} />
                            </td>
                            <td className="px-4 py-3 text-center">
                                <VehicleStatusBadge status={vehicle.estado} />
                            </td>
                            <td className="px-4 py-3 text-center">
                                <Link href={`/admin/stock/${vehicle.id}`}>
                                    <CrmButton variant="secondary" className="gap-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Ver ficha
                                        <ArrowRight size={14} />
                                    </CrmButton>
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
