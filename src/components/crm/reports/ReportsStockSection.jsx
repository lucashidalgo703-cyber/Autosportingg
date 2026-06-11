import React from 'react';
import { CarFront } from 'lucide-react';

export default function ReportsStockSection({ data }) {
    const { cars } = data;

    const total = cars.length;
    const disponibles = cars.filter(c => c.status === 'Disponible').length;
    const reservados = cars.filter(c => c.status === 'Reservado').length;
    const vendidos = cars.filter(c => c.status === 'Vendido').length;
    const pausados = cars.filter(c => c.status === 'Pausado' || c.status === 'Oculto').length;

    // Calcular días en stock aproximado (si createdAt existe)
    let aging60 = 0;
    let aging90 = 0;
    const now = new Date();
    
    cars.forEach(c => {
        if (c.status === 'Disponible' && c.createdAt) {
            const diffTime = Math.abs(now - new Date(c.createdAt));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= 90) aging90++;
            else if (diffDays >= 60) aging60++;
        }
    });

    return (
        <div className="bg-[#161619] border border-crm-border rounded-2xl p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-6 border-b border-crm-border pb-4">
                <CarFront size={18} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Estado de Inventario</h3>
                <span className="ml-auto text-xs font-bold bg-crm-surface-raised text-white px-2 py-0.5 rounded">Total: {total}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1">
                <div className="bg-[#1E1E24] rounded-xl p-3 flex flex-col justify-center items-center border border-crm-border">
                    <div className="text-2xl font-bold text-white">{disponibles}</div>
                    <div className="text-[10px] text-neutral-400 font-bold uppercase mt-1">Disponibles</div>
                </div>
                <div className="bg-[#1E1E24] rounded-xl p-3 flex flex-col justify-center items-center border border-crm-border">
                    <div className="text-2xl font-bold text-white">{reservados}</div>
                    <div className="text-[10px] text-neutral-400 font-bold uppercase mt-1">Reservados</div>
                </div>
                <div className="bg-[#1E1E24] rounded-xl p-3 flex flex-col justify-center items-center border border-crm-border">
                    <div className="text-2xl font-bold text-white">{vendidos}</div>
                    <div className="text-[10px] text-neutral-400 font-bold uppercase mt-1">Vendidos (Hist.)</div>
                </div>
                <div className="bg-[#1E1E24] rounded-xl p-3 flex flex-col justify-center items-center border border-crm-border">
                    <div className="text-2xl font-bold text-white">{pausados}</div>
                    <div className="text-[10px] text-neutral-400 font-bold uppercase mt-1">Pausados</div>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-crm-border">
                <h4 className="text-[10px] text-neutral-400 uppercase font-bold mb-3">Antigüedad en Stock (Disponibles)</h4>
                <div className="flex gap-4">
                    <div className="flex-1 bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 text-center">
                        <div className="text-lg font-bold text-orange-500">{aging60}</div>
                        <div className="text-[9px] uppercase font-bold text-orange-400/80 mt-0.5">&gt; 60 días</div>
                    </div>
                    <div className="flex-1 bg-crm-red/10 border border-red-500/20 rounded-lg p-2 text-center">
                        <div className="text-lg font-bold text-crm-red">{aging90}</div>
                        <div className="text-[9px] uppercase font-bold text-red-400/80 mt-0.5">&gt; 90 días</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
