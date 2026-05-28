import React from 'react';
import { Target, AlertCircle } from 'lucide-react';

export default function ReportsCollectionsSection({ data }) {
    const { installments } = data;

    let cuotasPendientes = 0;
    let cuotasVencidas = 0;
    let cuotasProximas = 0;
    let cuotasCobradas = 0;

    const now = new Date();
    now.setHours(0,0,0,0);
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    next7Days.setHours(0,0,0,0);

    let deudaPendienteArs = 0;
    let deudaPendienteUsd = 0;

    installments.forEach(i => {
        if (i.status === 'pagada') {
            cuotasCobradas++;
            return;
        }

        if (i.status === 'pendiente') {
            cuotasPendientes++;
            
            const remaining = (i.amount || 0) - (i.paidAmount || 0);
            if (i.currency === 'ARS') deudaPendienteArs += remaining;
            if (i.currency === 'USD') deudaPendienteUsd += remaining;

            const due = new Date(i.dueDate);
            due.setHours(0,0,0,0);

            if (due < now) {
                cuotasVencidas++;
            } else if (due <= next7Days) {
                cuotasProximas++;
            }
        }
    });

    const formatCurrency = (val, cur) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="bg-[#161619] border border-[#33333A] rounded-2xl p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-6 border-b border-[#33333A] pb-4">
                <Target size={18} className="text-red-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cobranzas y Cuotas</h3>
            </div>

            <div className="flex flex-col md:flex-row gap-6 mb-6 flex-1">
                <div className="flex-1 flex flex-col gap-3">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex flex-col justify-center items-center text-center h-full min-h-[100px]">
                        <AlertCircle size={20} className="text-red-500 mb-2" />
                        <div className="text-2xl font-bold text-red-500">{cuotasVencidas}</div>
                        <div className="text-[10px] text-red-400 font-bold uppercase mt-1">Cuotas Vencidas</div>
                    </div>
                </div>
                
                <div className="flex-1 flex flex-col gap-3 justify-center">
                    <div className="flex justify-between items-center bg-[#1E1E24] p-3 rounded-lg border border-[#33333A]">
                        <span className="text-xs text-neutral-400 font-bold uppercase">Pdtes (Total)</span>
                        <span className="text-sm font-bold text-white">{cuotasPendientes}</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#1E1E24] p-3 rounded-lg border border-[#33333A]">
                        <span className="text-xs text-neutral-400 font-bold uppercase">Próx. 7 días</span>
                        <span className="text-sm font-bold text-white">{cuotasProximas}</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#1E1E24] p-3 rounded-lg border border-[#33333A]">
                        <span className="text-xs text-neutral-400 font-bold uppercase">Pagadas</span>
                        <span className="text-sm font-bold text-green-400">{cuotasCobradas}</span>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-[#33333A] flex justify-between gap-4">
                <div className="flex-1">
                    <div className="text-[10px] text-neutral-400 uppercase font-bold mb-1">Deuda Pdte USD</div>
                    <div className="text-lg font-bold text-white">{formatCurrency(deudaPendienteUsd, 'USD')}</div>
                </div>
                <div className="flex-1 text-right">
                    <div className="text-[10px] text-neutral-400 uppercase font-bold mb-1">Deuda Pdte ARS</div>
                    <div className="text-lg font-bold text-white">{formatCurrency(deudaPendienteArs, 'ARS')}</div>
                </div>
            </div>
        </div>
    );
}
