"use client";
import CrmCard from '../ui/CrmCard';
import { Edit } from 'lucide-react';

export default function VehicleFinancialSummary({ vehicle, onEdit }) {
    const comisionEstimada = (vehicle.precioPublicado || 0) * 0.013;
    const margenNeto = (vehicle.margenEstimado || 0) - comisionEstimada;
    const margenNetoPorcentual = vehicle.costoTotal > 0 
        ? ((margenNeto / vehicle.costoTotal) * 100).toFixed(1)
        : 0;

    return (
        <CrmCard>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">Resumen Financiero</h3>
                {onEdit && (
                    <button onClick={onEdit} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-crm-fg-muted bg-crm-surface-raised border border-crm-border rounded hover:text-white hover:border-crm-fg transition-colors">
                        <Edit size={14} />
                        Editar Valores
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1 p-3 bg-crm-bg rounded-lg border border-crm-border">
                    <span className="text-xs text-crm-fg-muted">Costo de Compra</span>
                    <span className="text-white font-medium">
                        {vehicle.precioCompra > 0 ? `${vehicle.moneda} ${vehicle.precioCompra.toLocaleString('es-AR')}` : 'N/A'}
                    </span>
                </div>
                
                <div className="flex flex-col gap-1 p-3 bg-crm-bg rounded-lg border border-crm-border">
                    <span className="text-xs text-crm-fg-muted">Gastos Operativos</span>
                    <span className="text-white font-medium">
                        {vehicle.gastos > 0 ? `${vehicle.moneda} ${vehicle.gastos.toLocaleString('es-AR')}` : 'N/A'}
                    </span>
                </div>

                <div className="flex flex-col gap-1 p-3 bg-crm-bg rounded-lg border border-crm-border">
                    <span className="text-xs text-crm-fg-muted">Costo Total</span>
                    <span className="text-white font-bold">
                        {vehicle.costoTotal > 0 ? `${vehicle.moneda} ${vehicle.costoTotal.toLocaleString('es-AR')}` : 'N/A'}
                    </span>
                </div>

                <div className="flex flex-col gap-1 p-3 bg-crm-bg rounded-lg border border-crm-red/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#E63027]/10 to-transparent"></div>
                    <span className="text-xs text-crm-fg-muted">Margen Estimado</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-[#22C55E] font-bold">
                            {margenNeto > 0 ? `${vehicle.moneda} ${margenNeto.toLocaleString('es-AR', { maximumFractionDigits: 2 })}` : 'N/A'}
                        </span>
                        {margenNetoPorcentual > 0 && (
                            <span className="text-xs text-crm-fg-muted">({margenNetoPorcentual}%)</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between p-4 bg-crm-surface-raised rounded-lg border border-crm-border gap-4 md:gap-0">
                <div>
                    <span className="block text-sm text-crm-fg-muted">Precio Publicado</span>
                    <span className="block text-2xl font-bold text-white mt-1">
                        {vehicle.moneda} {vehicle.precioPublicado.toLocaleString('es-AR')}
                    </span>
                </div>
                <div className="md:text-center">
                    <span className="block text-sm text-crm-fg-muted">Comisión Estimada (1.3%)</span>
                    <span className="block text-lg font-medium text-[#22C55E] mt-1 opacity-90">
                        {vehicle.moneda} {comisionEstimada.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                    </span>
                </div>
                <div className="md:text-right">
                    <span className="block text-sm text-crm-fg-muted">Precio Mínimo (Reserva)</span>
                    <span className="block text-lg font-medium text-white mt-1 opacity-80">
                        {vehicle.precioMinimo > 0 ? `${vehicle.moneda} ${vehicle.precioMinimo.toLocaleString('es-AR')}` : 'No definido'}
                    </span>
                </div>
            </div>
        </CrmCard>
    );
}
