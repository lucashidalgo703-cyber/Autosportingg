import React from 'react';
import { History } from 'lucide-react';

export default function SaleAuditTimeline({ sale }) {
    if (!sale) return null;

    const auditLog = Array.isArray(sale.saleAuditLog) ? sale.saleAuditLog : [];

    // Sort by date descending
    const sortedLog = [...auditLog].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="min-w-0 overflow-hidden rounded-2xl border border-crm-border bg-crm-surface shadow-sm">
            <div className="flex items-center gap-2 border-b border-crm-border bg-crm-surface-raised/50 p-4">
                <History size={16} className="text-crm-fg-muted" />
                <h3 className="m-0 text-sm font-semibold text-crm-fg">Historial de Auditoría</h3>
            </div>
            
            <div className="max-h-[28rem] overflow-y-auto overscroll-contain p-4 custom-scrollbar">
                {sortedLog.length === 0 ? (
                    <div className="rounded-lg bg-crm-surface-raised/40 p-3 text-sm text-crm-fg-muted">
                        No hay registros de auditoría
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedLog.map((log, idx) => (
                            <div key={idx} className="flex gap-3">
                                <div className="flex flex-col items-center mt-1">
                                    <div className="z-10 h-2 w-2 rounded-full bg-crm-red/60 ring-4 ring-crm-surface"></div>
                                    {idx !== sortedLog.length - 1 && (
                                        <div className="w-px h-full bg-crm-surface-raised my-1 -mb-4"></div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 rounded-xl border border-crm-border bg-crm-surface-raised/40 p-3">
                                    <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                                        <span className="max-w-full break-words rounded bg-crm-surface-raised px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-crm-fg">
                                            {log.action}
                                        </span>
                                        <span className="text-[11px] text-crm-fg-muted">
                                            {new Date(log.date).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    <p className="mb-0 mt-2 break-words text-xs leading-5 text-crm-fg">{log.details}</p>
                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-crm-border pt-2">
                                        <span className="flex items-center gap-1 text-[10px] text-crm-fg-muted">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
                                            {log.user}
                                        </span>
                                        {log.field && (
                                            <span className="break-all font-mono text-[10px] text-crm-fg-muted">
                                                Campo: {log.field}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
