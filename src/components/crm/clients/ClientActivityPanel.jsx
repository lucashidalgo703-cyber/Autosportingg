import React from 'react';
import { Activity, Clock, Edit3, UserPlus } from 'lucide-react';

export default function ClientActivityPanel({ client }) {
    if (!client) return null;

    const getActionIcon = (action) => {
        switch (action?.toLowerCase()) {
            case 'creacion':
            case 'creación':
                return <UserPlus size={15} className="text-emerald-300" />;
            case 'actualizacion':
            case 'actualización':
                return <Edit3 size={15} className="text-blue-300" />;
            default:
                return <Activity size={15} className="text-crm-fg-muted" />;
        }
    };

    const logs = [...(client.clientAuditLog || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="flex h-full max-h-[600px] flex-col rounded-xl border border-crm-border bg-crm-surface p-5">
            <h3 className="m-0 mb-5 flex shrink-0 items-center gap-2 text-lg font-bold text-crm-fg">
                <Clock size={19} className="text-crm-red" />
                Historial de actividad
            </h3>

            <div className="min-h-0 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {logs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-crm-border bg-crm-bg px-5 py-8 text-center text-sm italic text-crm-fg-muted">
                        No hay registros de actividad.
                    </div>
                ) : (
                    <div className="relative ml-3 space-y-5 border-l border-crm-border pb-2">
                        {logs.map((log, idx) => (
                            <div key={idx} className="relative pl-6">
                                <div className="absolute -left-3 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-crm-border bg-crm-surface">
                                    {getActionIcon(log.action)}
                                </div>

                                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                                    <div className="mb-2 flex items-start justify-between gap-4">
                                        <h4 className="m-0 text-sm font-bold capitalize text-crm-fg">{log.action}</h4>
                                        <span className="whitespace-nowrap text-xs text-crm-fg-muted">
                                            {new Date(log.date).toLocaleString('es-AR', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>

                                    <p className="m-0 text-xs text-crm-fg-muted">
                                        Por <span className="font-semibold text-crm-fg">{log.user || 'Sistema'}</span>
                                    </p>

                                    {log.details && (
                                        <p className="m-0 mt-3 rounded-lg border border-crm-border bg-crm-surface p-2 text-sm text-crm-fg-muted">
                                            {log.details}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
