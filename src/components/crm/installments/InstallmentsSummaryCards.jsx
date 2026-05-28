import React from 'react';
import { Landmark, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function InstallmentsSummaryCards({ stats }) {
    const formatCurrency = (amount, currency) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            
            {/* Total Pendiente ARS */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Landmark size={20} className="text-blue-500" />
                    </div>
                </div>
                <div className="relative z-10">
                    <h3 className="text-neutral-400 text-sm font-medium mb-1 uppercase tracking-wider">Pendiente ARS</h3>
                    <div className="text-2xl font-bold text-white">
                        {formatCurrency(stats?.pendienteARS, 'ARS')}
                    </div>
                </div>
            </div>

            {/* Total Vencido ARS */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/5 rounded-full blur-2xl"></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                        <AlertCircle size={20} className="text-red-500" />
                    </div>
                </div>
                <div className="relative z-10">
                    <h3 className="text-neutral-400 text-sm font-medium mb-1 uppercase tracking-wider">Vencido ARS</h3>
                    <div className="text-2xl font-bold text-red-400">
                        {formatCurrency(stats?.vencidoARS, 'ARS')}
                    </div>
                </div>
            </div>

            {/* Total Pendiente USD */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/5 rounded-full blur-2xl"></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                        <Landmark size={20} className="text-green-500" />
                    </div>
                </div>
                <div className="relative z-10">
                    <h3 className="text-neutral-400 text-sm font-medium mb-1 uppercase tracking-wider">Pendiente USD</h3>
                    <div className="text-2xl font-bold text-white">
                        {formatCurrency(stats?.pendienteUSD, 'USD')}
                    </div>
                </div>
            </div>

            {/* Total Vencido USD */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/5 rounded-full blur-2xl"></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                        <AlertCircle size={20} className="text-red-500" />
                    </div>
                </div>
                <div className="relative z-10">
                    <h3 className="text-neutral-400 text-sm font-medium mb-1 uppercase tracking-wider">Vencido USD</h3>
                    <div className="text-2xl font-bold text-red-400">
                        {formatCurrency(stats?.vencidoUSD, 'USD')}
                    </div>
                </div>
            </div>

        </div>
    );
}
