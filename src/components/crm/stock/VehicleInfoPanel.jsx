"use client";
import CrmCard from '../ui/CrmCard';
import { Edit } from 'lucide-react';

export default function VehicleInfoPanel({ vehicle, onEdit }) {
    return (
        <CrmCard>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">Datos Generales</h3>
                {onEdit && (
                    <button onClick={onEdit} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-crm-fg-muted bg-crm-surface-raised border border-crm-border rounded hover:text-white hover:border-crm-fg transition-colors">
                        <Edit size={14} />
                        Editar Datos
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                <div>
                    <span className="block text-xs text-crm-fg-muted mb-1">Kilometraje</span>
                    <span className="text-sm text-white font-medium">{vehicle.kilometraje.toLocaleString('es-AR')} km</span>
                </div>
                <div>
                    <span className="block text-xs text-crm-fg-muted mb-1">Color</span>
                    <span className="text-sm text-white font-medium">{vehicle.color || 'No especificado'}</span>
                </div>
                <div>
                    <span className="block text-xs text-crm-fg-muted mb-1">Dominio</span>
                    <span className="text-sm font-mono text-white bg-crm-bg px-2 py-0.5 rounded border border-crm-border w-fit">
                        {vehicle.dominio || 'S/D'}
                    </span>
                </div>
                <div>
                    <span className="block text-xs text-crm-fg-muted mb-1">Origen</span>
                    <span className="text-sm text-white capitalize font-medium flex items-center gap-2">
                        {vehicle.origen}
                        {vehicle.investor && vehicle.investor.percentage > 0 && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 uppercase tracking-wide" title="Capital Inicial Invertido (Costo de Compra)">
                                {vehicle.investor.name} ({vehicle.investor.percentage}% | {vehicle.monedaCompra || 'USD'} {((vehicle.precioCompra || 0) * (vehicle.investor.percentage / 100)).toLocaleString('es-AR')})
                            </span>
                        )}
                    </span>
                </div>
                <div>
                    <span className="block text-xs text-crm-fg-muted mb-1">Fecha de Ingreso</span>
                    <span className="text-sm text-white font-medium">{new Date(vehicle.fechaIngreso).toLocaleDateString('es-AR')}</span>
                </div>
            </div>

            {vehicle.observaciones && (
                <div className="mt-6 pt-4 border-t border-crm-border">
                    <span className="block text-xs text-crm-fg-muted mb-2">Observaciones Internas</span>
                    <p className="text-sm text-white bg-crm-bg p-3 rounded-lg border border-crm-border m-0">
                        {vehicle.observaciones}
                    </p>
                </div>
            )}
        </CrmCard>
    );
}
