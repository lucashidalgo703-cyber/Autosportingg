import React from 'react';

export default function CollectionsSummaryCards({ stats }) {
    const formatCurrency = (amount, currency) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Cuotas Pendientes y Vencidas */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-sm font-bold">Estado Cuotas</span>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-black/20 px-3 py-2 rounded-xl">
                        <span className="text-sm text-neutral-400">Pendientes</span>
                        <span className="text-xl font-bold text-white">{stats.cuotasPendientes}</span>
                    </div>
                    <div className="flex justify-between items-center bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">
                        <span className="text-sm text-red-400 font-bold">Vencidas</span>
                        <span className="text-xl font-bold text-red-400">{stats.cuotasVencidas}</span>
                    </div>
                </div>
            </div>

            {/* Próximos Vencimientos */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-sm font-bold">Próximos Vencimientos</span>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-orange-500/10 px-3 py-2 rounded-xl border border-orange-500/20">
                        <span className="text-sm text-orange-400 font-bold">Vencen Hoy</span>
                        <span className="text-xl font-bold text-orange-400">{stats.vencenHoy}</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/20 px-3 py-2 rounded-xl">
                        <span className="text-sm text-neutral-400">Próximos 7 días</span>
                        <span className="text-xl font-bold text-white">{stats.vencen7Dias}</span>
                    </div>
                </div>
            </div>

            {/* Deuda Pendiente */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-sm font-bold">Deuda Activa</span>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-black/20 px-3 py-2 rounded-xl">
                        <span className="text-sm text-neutral-400">USD</span>
                        <span className="text-lg font-bold text-green-400">{formatCurrency(stats.pendienteUSD, 'USD')}</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/20 px-3 py-2 rounded-xl">
                        <span className="text-sm text-neutral-400">ARS</span>
                        <span className="text-lg font-bold text-blue-400">{formatCurrency(stats.pendienteARS, 'ARS')}</span>
                    </div>
                </div>
            </div>

            {/* Deuda Vencida */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-neutral-400 text-sm font-bold">Deuda Vencida</span>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">
                        <span className="text-sm text-red-400">USD</span>
                        <span className="text-lg font-bold text-red-400">{formatCurrency(stats.vencidoUSD, 'USD')}</span>
                    </div>
                    <div className="flex justify-between items-center bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">
                        <span className="text-sm text-red-400">ARS</span>
                        <span className="text-lg font-bold text-red-400">{formatCurrency(stats.vencidoARS, 'ARS')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
