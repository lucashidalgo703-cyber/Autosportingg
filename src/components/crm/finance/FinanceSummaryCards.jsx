import React from 'react';
import { Wallet, ArrowDownRight, ArrowUpRight, AlertTriangle } from 'lucide-react';

export default function FinanceSummaryCards({ transactions }) {
    if (!transactions) return null;

    const metrics = transactions.reduce((acc, tx) => {
        if (tx.status === 'anulado') return acc;
        
        if (tx.currency === 'ARS') {
            if (tx.type === 'Ingreso') acc.ars.ingresos += tx.amount;
            if (tx.type === 'Egreso') acc.ars.egresos += tx.amount;
        } else if (tx.currency === 'USD') {
            if (tx.type === 'Ingreso') acc.usd.ingresos += tx.amount;
            if (tx.type === 'Egreso') acc.usd.egresos += tx.amount;
        }
        return acc;
    }, {
        ars: { ingresos: 0, egresos: 0 },
        usd: { ingresos: 0, egresos: 0 }
    });

    const arsBalance = metrics.ars.ingresos - metrics.ars.egresos;
    const usdBalance = metrics.usd.ingresos - metrics.usd.egresos;

    return (
        <div className="mb-6">
            <div className="mb-4 bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-start gap-3">
                <AlertTriangle size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                    <span className="font-bold text-blue-400 block text-sm">Caja Manual V2</span>
                    <p className="text-xs text-blue-200 mt-1">
                        Esta caja registra ingresos y egresos de forma manual. No está conectada automáticamente a ventas ni reservas por medidas de seguridad. Las monedas ARS y USD se procesan de forma separada.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Caja ARS */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                            <Wallet size={16} className="text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white">Caja ARS</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-black/40 rounded-xl p-3 border border-neutral-800/50">
                            <div className="flex items-center gap-1.5 mb-1">
                                <ArrowUpRight size={14} className="text-green-500" />
                                <span className="text-[10px] font-bold text-neutral-500 uppercase">Ingresos</span>
                            </div>
                            <span className="text-lg font-bold text-white">${metrics.ars.ingresos.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="bg-black/40 rounded-xl p-3 border border-neutral-800/50">
                            <div className="flex items-center gap-1.5 mb-1">
                                <ArrowDownRight size={14} className="text-red-500" />
                                <span className="text-[10px] font-bold text-neutral-500 uppercase">Egresos</span>
                            </div>
                            <span className="text-lg font-bold text-white">${metrics.ars.egresos.toLocaleString('es-AR')}</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-800 flex justify-between items-end">
                        <span className="text-sm text-neutral-400">Balance Total ARS</span>
                        <span className={`text-2xl font-black ${arsBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${arsBalance.toLocaleString('es-AR')}
                        </span>
                    </div>
                </div>

                {/* Caja USD */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-all duration-500"></div>
                    <div className="flex items-center gap-2 mb-4 relative z-10">
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center border border-green-500/30">
                            <Wallet size={16} className="text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white">Caja USD</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
                        <div className="bg-black/40 rounded-xl p-3 border border-neutral-800/50">
                            <div className="flex items-center gap-1.5 mb-1">
                                <ArrowUpRight size={14} className="text-green-500" />
                                <span className="text-[10px] font-bold text-neutral-500 uppercase">Ingresos</span>
                            </div>
                            <span className="text-lg font-bold text-white">U$S {metrics.usd.ingresos.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="bg-black/40 rounded-xl p-3 border border-neutral-800/50">
                            <div className="flex items-center gap-1.5 mb-1">
                                <ArrowDownRight size={14} className="text-red-500" />
                                <span className="text-[10px] font-bold text-neutral-500 uppercase">Egresos</span>
                            </div>
                            <span className="text-lg font-bold text-white">U$S {metrics.usd.egresos.toLocaleString('es-AR')}</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-800 flex justify-between items-end relative z-10">
                        <span className="text-sm text-neutral-400">Balance Total USD</span>
                        <span className={`text-2xl font-black ${usdBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            U$S {usdBalance.toLocaleString('es-AR')}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
