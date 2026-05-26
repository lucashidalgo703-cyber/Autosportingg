"use client";
import Link from 'next/link';
import VehicleStatusBadge from './VehicleStatusBadge';
import VehicleRotationAlert from './VehicleRotationAlert';
import { MoreHorizontal } from 'lucide-react';

export default function StockTable({ data }) {
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-[#1E1E24] rounded-xl border border-[#33333A] text-center">
                <p className="text-[#A1A1AA] mb-2">No se encontraron vehículos que coincidan con la búsqueda.</p>
            </div>
        );
    }

    return (
        <div className="bg-[#1E1E24] rounded-xl border border-[#33333A] overflow-x-auto">
            <table className="w-full text-left text-sm text-[#A1A1AA]">
                <thead className="bg-[#161619] border-b border-[#33333A] text-xs uppercase text-[#A1A1AA]">
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
                <tbody className="divide-y divide-[#33333A]">
                    {data.map((vehicle) => (
                        <tr key={vehicle.id} className="hover:bg-[#24242B] transition-colors">
                            <td className="px-4 py-3">
                                <div className="flex flex-col">
                                    <span className="font-semibold text-white">{vehicle.marca} {vehicle.modelo}</span>
                                    <span className="text-xs">{vehicle.version} • {vehicle.año} • {vehicle.kilometraje.toLocaleString('es-AR')} km</span>
                                    <span className="text-xs font-mono mt-0.5 px-1.5 py-0.5 bg-[#161619] border border-[#33333A] rounded w-fit">{vehicle.dominio}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 capitalize">{vehicle.origen}</td>
                            <td className="px-4 py-3">
                                {vehicle.costoTotal > 0 ? (
                                    <span className="text-white">{vehicle.moneda} {vehicle.costoTotal.toLocaleString('es-AR')}</span>
                                ) : (
                                    <span className="text-[#A1A1AA] italic">N/A</span>
                                )}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#22C55E]">
                                {vehicle.moneda} {vehicle.precioPublicado.toLocaleString('es-AR')}
                            </td>
                            <td className="px-4 py-3">
                                {vehicle.margenEstimado > 0 ? (
                                    <div className="flex flex-col">
                                        <span className="text-white">{vehicle.moneda} {vehicle.margenEstimado.toLocaleString('es-AR')}</span>
                                        <span className="text-xs text-[#A1A1AA]">{vehicle.margenPorcentual}%</span>
                                    </div>
                                ) : (
                                    <span className="text-[#A1A1AA] italic">N/A</span>
                                )}
                            </td>
                            <td className="px-4 py-3 text-center">
                                <VehicleRotationAlert dias={vehicle.diasEnStock} />
                            </td>
                            <td className="px-4 py-3 text-center">
                                <VehicleStatusBadge status={vehicle.estado} />
                            </td>
                            <td className="px-4 py-3 text-center">
                                <Link 
                                    href={`/admin/stock/${vehicle.id}`}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-[#33333A] hover:bg-[#E63027] rounded-md transition-colors inline-block"
                                >
                                    Ver ficha
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
