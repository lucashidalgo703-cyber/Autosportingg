import React from 'react';
import { AlertTriangle, CalendarDays, CheckSquare, Clock, Inbox } from 'lucide-react';

export default function AgendaSummaryCards({ metrics }) {
    const cards = [
        {
            label: 'Tareas pend.',
            value: metrics.totalPendingTasks || 0,
            helper: 'Total abierto',
            icon: CheckSquare,
            tone: 'border-amber-500/20 bg-amber-500/10 text-amber-300'
        },
        {
            label: 'Vencidas',
            value: metrics.overdue || 0,
            helper: 'Atencion urgente',
            icon: AlertTriangle,
            tone: 'border-crm-red/20 bg-crm-red/10 text-red-300'
        },
        {
            label: 'Para hoy',
            value: metrics.today || 0,
            helper: 'Agenda del dia',
            icon: Clock,
            tone: 'border-blue-500/20 bg-blue-500/10 text-blue-300'
        },
        {
            label: 'Prox. 7 dias',
            value: metrics.next7Days || 0,
            helper: 'Seguimientos',
            icon: CalendarDays,
            tone: 'border-purple-500/20 bg-purple-500/10 text-purple-300'
        },
        {
            label: 'Completadas',
            value: metrics.completedRecent || 0,
            helper: 'Ultimos 3 dias',
            icon: CheckSquare,
            tone: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
        },
        {
            label: 'Cobranzas',
            value: metrics.collectionsPending || 0,
            helper: 'Pendientes',
            icon: Inbox,
            tone: 'border-orange-500/20 bg-orange-500/10 text-orange-300'
        }
    ];

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {cards.map((card) => {
                const Icon = card.icon;

                return (
                    <div key={card.label} className="rounded-xl border border-crm-border bg-crm-surface p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">
                                    {card.label}
                                </p>
                                <p className="m-0 mt-3 text-2xl font-bold leading-none text-crm-fg">
                                    {card.value}
                                </p>
                                <p className="m-0 mt-2 truncate text-xs text-crm-fg-muted">{card.helper}</p>
                            </div>
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${card.tone}`}>
                                <Icon size={18} />
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
