import React from 'react';
import { Receipt } from 'lucide-react';

export default function ReportsSalesSection({ data }) {
    const { sales } = data;

    const total = sales.length;
    const confirmadas = sales.filter(s => s.status === 'confirmada').length;
    const pdteEntrega = sales.filter(s => s.status === 'pendiente_entrega').length;
    const entregadas = sales.filter(s => s.status === 'entregada').length;
    const canceladas = sales.filter(s => s.status === 'cancelada').length;
    const borradores = sales.filter(s => s.status === 'borrador').length;

    const ventasUsd = sales.filter(s => s.saleCurrency === 'USD' && s.status !== 'cancelada' && s.status !== 'borrador').length;
    const ventasArs = sales.filter(s => s.saleCurrency === 'ARS' && s.status !== 'cancelada' && s.status !== 'borrador').length;

    const ProgressBar = ({ label, count, max, colorClass }) => {
        const pct = max > 0 ? Math.round((count / max) * 100) : 0;
        return (
            <div className="flex flex-col gap-1 w-full">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400">{label}</span>
                    <span className="text-white font-bold">{count} <span className="text-neutral-500 font-normal">({pct}%)</span></span>
                </div>
                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }}></div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-[#161619] border border-[#33333A] rounded-2xl p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-6 border-b border-[#33333A] pb-4">
                <Receipt size={18} className="text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Embudo de Ventas</h3>
                <span className="ml-auto text-xs font-bold bg-neutral-800 text-white px-2 py-0.5 rounded">Total: {total}</span>
            </div>

            <div className="flex flex-col gap-4 flex-1">
                <ProgressBar label="Entregadas" count={entregadas} max={total} colorClass="bg-green-500" />
                <ProgressBar label="Pendiente de Entrega" count={pdteEntrega} max={total} colorClass="bg-blue-500" />
                <ProgressBar label="Confirmadas (Iniciadas)" count={confirmadas} max={total} colorClass="bg-indigo-500" />
                <ProgressBar label="Borradores" count={borradores} max={total} colorClass="bg-neutral-500" />
                <ProgressBar label="Canceladas" count={canceladas} max={total} colorClass="bg-red-500" />
            </div>

            <div className="mt-6 pt-4 border-t border-[#33333A] flex justify-between">
                <div className="text-center flex-1 border-r border-[#33333A]">
                    <div className="text-xs text-neutral-400 uppercase font-bold mb-1">Ventas USD</div>
                    <div className="text-lg font-bold text-white">{ventasUsd}</div>
                </div>
                <div className="text-center flex-1">
                    <div className="text-xs text-neutral-400 uppercase font-bold mb-1">Ventas ARS</div>
                    <div className="text-lg font-bold text-white">{ventasArs}</div>
                </div>
            </div>
        </div>
    );
}
