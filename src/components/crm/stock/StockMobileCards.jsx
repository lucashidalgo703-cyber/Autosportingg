"use client";
import Link from 'next/link';
import VehicleStatusBadge from './VehicleStatusBadge';
import VehicleRotationAlert from './VehicleRotationAlert';
import { MoreHorizontal, Calendar, Gauge } from 'lucide-react';

export default function StockMobileCards({ data }) {
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-crm-surface rounded-xl border border-crm-border text-center">
                <p className="text-crm-fg-muted mb-2 text-sm">No se encontraron vehículos.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {data.map((vehicle) => (
                <div key={vehicle.id} className="bg-crm-surface rounded-xl border border-crm-border p-4 flex flex-col gap-3 relative">
                    <div className="flex justify-between items-start pr-8">
                        <div>
                            <h3 className="text-white font-bold text-base leading-tight">
                                {vehicle.marca} {vehicle.modelo}
                            </h3>
                            <p className="text-crm-fg-muted text-xs mt-1">{vehicle.version}</p>
                        </div>
                        <Link 
                            href={`/admin/stock/${vehicle.id}`}
                            className="absolute top-4 right-4 px-3 py-1 text-xs font-medium text-white bg-crm-surface-raised border border-crm-border hover:bg-crm-red hover:border-crm-red rounded-md transition-colors"
                        >
                            Ficha
                        </Link>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-crm-fg-muted">
                        <div className="flex items-center gap-1 bg-crm-bg px-2 py-1 rounded-md border border-crm-border">
                            <Calendar size={12} /> {vehicle.año}
                        </div>
                        <div className="flex items-center gap-1 bg-crm-bg px-2 py-1 rounded-md border border-crm-border">
                            <Gauge size={12} /> {vehicle.kilometraje.toLocaleString('es-AR')} km
                        </div>
                        <div className="flex items-center gap-1 bg-crm-bg px-2 py-1 rounded-md border border-crm-border font-mono">
                            {vehicle.dominio}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                        <VehicleStatusBadge status={vehicle.estado} />
                        <VehicleRotationAlert dias={vehicle.diasEnStock} />
                    </div>

                    <div className="pt-3 border-t border-crm-border flex flex-col gap-1">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-crm-fg-muted">Precio Publicado</span>
                            <span className="text-[#22C55E] font-bold">{vehicle.moneda} {vehicle.precioPublicado.toLocaleString('es-AR')}</span>
                        </div>
                        {vehicle.costoTotal > 0 && (
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-crm-fg-muted">Margen Estimado</span>
                                <span className="text-white">{vehicle.moneda} {vehicle.margenEstimado.toLocaleString('es-AR')}</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
