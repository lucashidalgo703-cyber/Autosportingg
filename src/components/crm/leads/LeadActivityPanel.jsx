import React from 'react';
import { Activity, ArrowRight, CornerDownRight, History, Plus } from 'lucide-react';

export default function LeadActivityPanel({ lead }) {
    if (!lead) return null;

    const hasAuditLog = Array.isArray(lead.leadAuditLog) && lead.leadAuditLog.length > 0;

    return (
        <div className="flex h-full flex-col rounded-xl border border-crm-border bg-crm-surface p-5">
            <h3 className="m-0 mb-5 flex items-center gap-2 text-lg font-bold text-crm-fg">
                <Activity size={19} className="text-crm-red" />
                Historial de actividad
            </h3>

            <div className="max-h-[500px] flex-1 overflow-y-auto rounded-xl border border-crm-border bg-crm-bg p-4 custom-scrollbar">
                {!hasAuditLog ? (
                    <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                        <History size={28} className="mb-4 text-crm-fg-muted" />
                        <span className="font-semibold text-crm-fg">Sin historial</span>
                        <p className="m-0 mt-2 max-w-xs text-sm text-crm-fg-muted">
                            Todavia no hay movimientos registrados para este lead.
                        </p>
                    </div>
                ) : (
                    <div className="relative flex flex-col gap-0">
                        <div className="absolute bottom-4 left-[15px] top-4 z-0 w-px bg-crm-border" />

                        {[...lead.leadAuditLog].reverse().map((log, index) => {
                            let Icon = History;
                            let iconColor = 'text-crm-fg-muted';
                            let bgColor = 'bg-crm-surface border-crm-border';

                            if (log.action === 'CREACION') {
                                Icon = Plus;
                                iconColor = 'text-emerald-300';
                                bgColor = 'bg-emerald-500/10 border-emerald-500/20';
                            } else if (log.action === 'ACTUALIZACION') {
                                Icon = Activity;
                                iconColor = 'text-blue-300';
                                bgColor = 'bg-blue-500/10 border-blue-500/20';
                            } else if (log.action === 'CAMBIO_ESTADO') {
                                Icon = CornerDownRight;
                                iconColor = 'text-amber-300';
                                bgColor = 'bg-amber-500/10 border-amber-500/20';
                            }

                            return (
                                <div key={index} className="relative z-10 flex gap-4 pb-6 last:pb-0">
                                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${bgColor}`}>
                                        <Icon size={14} className={iconColor} />
                                    </div>
                                    <div className="min-w-0 flex-1 pt-1">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <span className="block text-sm font-bold text-crm-fg">{log.action}</span>
                                                <span className="text-xs text-crm-fg-muted">{log.details || 'Movimiento registrado'}</span>
                                            </div>
                                            <span className="whitespace-nowrap rounded bg-crm-surface px-2 py-1 text-[10px] text-crm-fg-muted">
                                                {new Date(log.date).toLocaleString()}
                                            </span>
                                        </div>

                                        {(log.oldValue || log.newValue) && log.action !== 'CREACION' && (
                                            <div className="mt-3 flex items-center gap-2 rounded-lg border border-crm-border bg-crm-surface p-2.5 text-xs">
                                                <span className="max-w-[120px] truncate text-crm-fg-muted line-through">{String(log.oldValue || 'vacio')}</span>
                                                <ArrowRight size={12} className="shrink-0 text-crm-fg-subtle" />
                                                <span className="max-w-[120px] truncate font-semibold text-crm-fg">{String(log.newValue || 'vacio')}</span>
                                            </div>
                                        )}

                                        <div className="mt-2 flex items-center gap-1.5">
                                            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-crm-border bg-crm-surface text-[8px] font-bold text-crm-fg">
                                                {log.user ? log.user.charAt(0).toUpperCase() : 'U'}
                                            </span>
                                            <span className="text-[10px] text-crm-fg-muted">
                                                Por <strong className="text-crm-fg">{log.user || 'Sistema'}</strong> via {log.source}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
