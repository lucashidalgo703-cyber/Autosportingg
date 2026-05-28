import React from 'react';
import { AlertTriangle, Clock, CalendarDays, Inbox, CheckSquare } from 'lucide-react';

export default function AgendaSummaryCards({ metrics }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col items-start relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 text-yellow-500/5 group-hover:text-yellow-500/10 transition-colors">
                    <CheckSquare size={80} />
                </div>
                <div className="flex items-center gap-2 text-yellow-500 mb-2">
                    <CheckSquare size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Tareas Pend.</span>
                </div>
                <span className="text-white text-3xl font-bold">{metrics.totalPendingTasks || 0}</span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col items-start relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 text-red-500/5 group-hover:text-red-500/10 transition-colors">
                    <AlertTriangle size={80} />
                </div>
                <div className="flex items-center gap-2 text-red-400 mb-2">
                    <AlertTriangle size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Vencidas</span>
                </div>
                <span className="text-white text-3xl font-bold">{metrics.overdue || 0}</span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col items-start relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 text-blue-500/5 group-hover:text-blue-500/10 transition-colors">
                    <Clock size={80} />
                </div>
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <Clock size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Para Hoy</span>
                </div>
                <span className="text-white text-3xl font-bold">{metrics.today || 0}</span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col items-start relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 text-purple-500/5 group-hover:text-purple-500/10 transition-colors">
                    <CalendarDays size={80} />
                </div>
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <CalendarDays size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Próx. 7 Días</span>
                </div>
                <span className="text-white text-3xl font-bold">{metrics.next7Days || 0}</span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col items-start relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 text-green-500/5 group-hover:text-green-500/10 transition-colors">
                    <CheckSquare size={80} />
                </div>
                <div className="flex items-center gap-2 text-green-500 mb-2">
                    <CheckSquare size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Completadas</span>
                </div>
                <span className="text-white text-3xl font-bold">{metrics.completedRecent || 0}</span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col items-start relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 text-orange-500/5 group-hover:text-orange-500/10 transition-colors">
                    <Inbox size={80} />
                </div>
                <div className="flex items-center gap-2 text-orange-500 mb-2">
                    <Inbox size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Cobranzas</span>
                </div>
                <span className="text-white text-3xl font-bold">{metrics.collectionsPending || 0}</span>
            </div>
        </div>
    );
}
