import React from 'react';
import { DollarSign, Clock, CheckCircle2, ShieldAlert, FileX } from 'lucide-react';

export default function ReservationsSummaryCards({ reservations }) {
    if (!reservations) return null;

    const activeReservations = reservations.filter(r => r.status === 'activa');
    const overdueOrExpiring = activeReservations.filter(r => {
        if (!r.expiresAt) return false;
        const expiry = new Date(r.expiresAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return expiry <= today; // Vence hoy o ya venció
    });

    const totalArs = activeReservations
        .filter(r => r.depositCurrency === 'ARS')
        .reduce((sum, r) => sum + (r.depositAmount || 0), 0);

    const totalUsd = activeReservations
        .filter(r => r.depositCurrency === 'USD')
        .reduce((sum, r) => sum + (r.depositAmount || 0), 0);

    const inactiveCount = reservations.filter(r => ['cancelada', 'devuelta', 'retenida'].includes(r.status)).length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-neutral-400">Reservas Activas</span>
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 size={16} className="text-green-500" />
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-2xl font-bold text-white">{activeReservations.length}</span>
                    <span className="text-xs text-neutral-500 mt-1">Total en curso</span>
                </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-neutral-400">Señas USD</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <DollarSign size={16} className="text-emerald-500" />
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-2xl font-bold text-white">USD {totalUsd.toLocaleString('es-AR')}</span>
                    <span className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">Cargadas en reservas</span>
                </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-neutral-400">Señas ARS</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <span className="text-blue-500 font-bold">$</span>
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-2xl font-bold text-white">ARS {totalArs.toLocaleString('es-AR')}</span>
                    <span className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">Cargadas en reservas</span>
                </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-neutral-400 flex items-center gap-1">Vencen Hoy / Vencidas</span>
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Clock size={16} className="text-orange-500" />
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-2xl font-bold text-white">{overdueOrExpiring.length}</span>
                    <span className="text-xs text-orange-500/70 mt-1">Requieren acción</span>
                </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-neutral-400">Canceladas / Dev.</span>
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center">
                        <FileX size={16} className="text-neutral-500" />
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-2xl font-bold text-white">{inactiveCount}</span>
                    <span className="text-xs text-neutral-500 mt-1">Histórico inactivo</span>
                </div>
            </div>
        </div>
    );
}
