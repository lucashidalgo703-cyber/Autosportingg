"use client";
import Link from 'next/link';
import VehicleStatusBadge from './VehicleStatusBadge';
import VehicleRotationAlert from './VehicleRotationAlert';
import { MoreHorizontal, Calendar, Gauge } from 'lucide-react';

export default function StockMobileCards({ data }) {
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-[#1E1E24] rounded-xl border border-[#33333A] text-center">
                <p className="text-[#A1A1AA] mb-2 text-sm">No se encontraron vehículos.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {data.map((vehicle) => (
                <div key={vehicle.id} className="bg-[#1E1E24] rounded-xl border border-[#33333A] p-4 flex flex-col gap-3 relative">
                    <div className="flex justify-between items-start pr-8">
                        <div>
                            <h3 className="text-white font-bold text-base leading-tight">
                                {vehicle.marca} {vehicle.modelo}
                            </h3>
                            <p className="text-[#A1A1AA] text-xs mt-1">{vehicle.version}</p>
                        </div>
                        <Link 
                            href={`/admin/stock/${vehicle.id}`}
                            className="absolute top-4 right-4 px-3 py-1 text-xs font-medium text-white bg-[#33333A] hover:bg-[#E63027] rounded-md transition-colors"
                        >
                            Ficha
                        </Link>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-[#A1A1AA]">
                        <div className="flex items-center gap-1 bg-[#161619] px-2 py-1 rounded-md border border-[#33333A]">
                            <Calendar size={12} /> {vehicle.año}
                        </div>
                        <div className="flex items-center gap-1 bg-[#161619] px-2 py-1 rounded-md border border-[#33333A]">
                            <Gauge size={12} /> {vehicle.kilometraje.toLocaleString('es-AR')} km
                        </div>
                        <div className="flex items-center gap-1 bg-[#161619] px-2 py-1 rounded-md border border-[#33333A] font-mono">
                            {vehicle.dominio}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                        <VehicleStatusBadge status={vehicle.estado} />
                        <VehicleRotationAlert dias={vehicle.diasEnStock} />
                    </div>

                    <div className="pt-3 border-t border-[#33333A] flex flex-col gap-1">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[#A1A1AA]">Precio Publicado</span>
                            <span className="text-[#22C55E] font-bold">{vehicle.moneda} {vehicle.precioPublicado.toLocaleString('es-AR')}</span>
                        </div>
                        {vehicle.costoTotal > 0 && (
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-[#A1A1AA]">Margen Estimado</span>
                                <span className="text-white">{vehicle.moneda} {vehicle.margenEstimado.toLocaleString('es-AR')}</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
