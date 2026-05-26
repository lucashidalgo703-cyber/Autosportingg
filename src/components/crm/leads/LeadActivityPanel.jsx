import React from 'react';
import { Activity, History, Plus, CornerDownRight } from 'lucide-react';

export default function LeadActivityPanel({ lead }) {
    if (!lead) return null;

    const hasAuditLog = lead.leadAuditLog && lead.leadAuditLog.length > 0;

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Activity size={20} className="text-red-500" />
                Historial de Actividad
            </h3>

            <div className="flex-1 bg-black/30 border border-neutral-800 rounded-xl p-4 overflow-y-auto custom-scrollbar max-h-[500px]">
                {!hasAuditLog ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-50">
                        <History size={32} className="text-neutral-500 mb-4" />
                        <span className="text-white font-medium">Sin historial</span>
                        <p className="text-sm text-neutral-400 max-w-xs mt-2">
                            Todavía no hay movimientos registrados para este lead. Las interacciones futuras aparecerán aquí.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-0 relative">
                        {/* Timeline line */}
                        <div className="absolute left-[15px] top-4 bottom-4 w-px bg-neutral-800 z-0"></div>

                        {[...lead.leadAuditLog].reverse().map((log, index) => {
                            // Icon mapping
                            let Icon = History;
                            let iconColor = 'text-neutral-400';
                            let bgColor = 'bg-neutral-900';
                            
                            if (log.action === 'CREACION') {
                                Icon = Plus;
                                iconColor = 'text-green-500';
                                bgColor = 'bg-green-500/10 border-green-500/20';
                            } else if (log.action === 'ACTUALIZACION') {
                                Icon = Activity;
                                iconColor = 'text-blue-500';
                                bgColor = 'bg-blue-500/10 border-blue-500/20';
                            } else if (log.action === 'CAMBIO_ESTADO') {
                                Icon = CornerDownRight;
                                iconColor = 'text-yellow-500';
                                bgColor = 'bg-yellow-500/10 border-yellow-500/20';
                            }

                            return (
                                <div key={index} className="flex gap-4 relative z-10 pb-6 last:pb-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${bgColor}`}>
                                        <Icon size={14} className={iconColor} />
                                    </div>
                                    <div className="flex flex-col gap-1 flex-1 pt-1">
                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <span className="text-sm font-bold text-white block">
                                                    {log.action}
                                                </span>
                                                <span className="text-xs text-neutral-400">
                                                    {log.details || 'Movimiento registrado'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-neutral-500 whitespace-nowrap bg-neutral-900 px-2 py-1 rounded">
                                                {new Date(log.date).toLocaleString()}
                                            </span>
                                        </div>

                                        {(log.oldValue || log.newValue) && log.action !== 'CREACION' && (
                                            <div className="mt-2 bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg flex items-center gap-2 text-xs">
                                                <span className="text-neutral-500 line-through truncate max-w-[120px]">{String(log.oldValue || 'vacío')}</span>
                                                <ArrowRight size={12} className="text-neutral-600 shrink-0" />
                                                <span className="text-white font-medium truncate max-w-[120px]">{String(log.newValue || 'vacío')}</span>
                                            </div>
                                        )}
                                        
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="w-4 h-4 rounded-full bg-neutral-800 flex items-center justify-center text-[8px] font-bold text-white border border-neutral-700">
                                                {log.user ? log.user.charAt(0).toUpperCase() : 'U'}
                                            </span>
                                            <span className="text-[10px] text-neutral-500">
                                                Por <strong className="text-neutral-400">{log.user || 'Sistema'}</strong> via {log.source}
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

// Re-importing ArrowRight just for the inner div above
function ArrowRight({ size, className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
    );
}
