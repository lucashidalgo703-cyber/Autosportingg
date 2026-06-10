"use client";
import CrmCard from '../ui/CrmCard';
import { Edit } from 'lucide-react';

export default function VehicleFinancialSummary({ vehicle, onEdit }) {
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
                <div className="flex flex-col gap-1 p-3 bg-[#161619] rounded-lg border border-[#33333A]">
                    <span className="text-xs text-[#A1A1AA]">Costo de Compra</span>
                    <span className="text-white font-medium">
                        {vehicle.precioCompra > 0 ? `${vehicle.moneda} ${vehicle.precioCompra.toLocaleString('es-AR')}` : 'N/A'}
                    </span>
                </div>
                
                <div className="flex flex-col gap-1 p-3 bg-[#161619] rounded-lg border border-[#33333A]">
                    <span className="text-xs text-[#A1A1AA]">Gastos Operativos</span>
                    <span className="text-white font-medium">
                        {vehicle.gastos > 0 ? `${vehicle.moneda} ${vehicle.gastos.toLocaleString('es-AR')}` : 'N/A'}
                    </span>
                </div>

                <div className="flex flex-col gap-1 p-3 bg-[#161619] rounded-lg border border-[#33333A]">
                    <span className="text-xs text-[#A1A1AA]">Costo Total</span>
                    <span className="text-white font-bold">
                        {vehicle.costoTotal > 0 ? `${vehicle.moneda} ${vehicle.costoTotal.toLocaleString('es-AR')}` : 'N/A'}
                    </span>
                </div>

                <div className="flex flex-col gap-1 p-3 bg-[#161619] rounded-lg border border-[#E63027]/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#E63027]/10 to-transparent"></div>
                    <span className="text-xs text-[#A1A1AA]">Margen Estimado</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-[#22C55E] font-bold">
                            {vehicle.margenEstimado > 0 ? `${vehicle.moneda} ${vehicle.margenEstimado.toLocaleString('es-AR')}` : 'N/A'}
                        </span>
                        {vehicle.margenPorcentual > 0 && (
                            <span className="text-xs text-[#A1A1AA]">({vehicle.margenPorcentual}%)</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between p-4 bg-[#24242B] rounded-lg border border-[#33333A]">
                <div>
                    <span className="block text-sm text-[#A1A1AA]">Precio Publicado</span>
                    <span className="block text-2xl font-bold text-white mt-1">
                        {vehicle.moneda} {vehicle.precioPublicado.toLocaleString('es-AR')}
                    </span>
                </div>
                <div className="text-right">
                    <span className="block text-sm text-[#A1A1AA]">Precio Mínimo (Reserva)</span>
                    <span className="block text-lg font-medium text-white mt-1 opacity-80">
                        {vehicle.precioMinimo > 0 ? `${vehicle.moneda} ${vehicle.precioMinimo.toLocaleString('es-AR')}` : 'No definido'}
                    </span>
                </div>
            </div>
        </CrmCard>
    );
}
