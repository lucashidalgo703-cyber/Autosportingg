import React from 'react';
import { History } from 'lucide-react';

export default function SaleAuditTimeline({ sale }) {
    if (!sale) return null;

    const auditLog = Array.isArray(sale.saleAuditLog) ? sale.saleAuditLog : [];

    // Sort by date descending
    const sortedLog = [...auditLog].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-neutral-800 flex items-center gap-2 bg-[#1E1E24]">
                <History size={16} className="text-neutral-500" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Historial de Auditoría</h3>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
                {sortedLog.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-neutral-500">
                        No hay registros de auditoría
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedLog.map((log, idx) => (
                            <div key={idx} className="flex gap-4">
                                <div className="flex flex-col items-center mt-1">
                                    <div className="w-2 h-2 rounded-full bg-neutral-600 ring-4 ring-neutral-900 z-10"></div>
                                    {idx !== sortedLog.length - 1 && (
                                        <div className="w-px h-full bg-crm-surface-raised my-1 -mb-4"></div>
                                    )}
                                </div>
                                <div className="flex-1 bg-black/20 border border-neutral-800/50 rounded-xl p-3 pb-3">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-white bg-crm-surface-raised px-2 py-0.5 rounded uppercase tracking-wider">
                                            {log.action}
                                        </span>
                                        <span className="text-[10px] text-neutral-500 text-right">
                                            {new Date(log.date).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-neutral-300 mt-2">{log.details}</p>
                                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-neutral-800/50">
                                        <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
                                            {log.user}
                                        </span>
                                        {log.field && (
                                            <span className="text-[10px] text-neutral-600 font-mono">
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
