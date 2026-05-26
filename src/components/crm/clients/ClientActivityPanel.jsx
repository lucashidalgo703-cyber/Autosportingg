import React from 'react';
import { Activity, Clock, Edit3, UserPlus } from 'lucide-react';

export default function ClientActivityPanel({ client }) {
    if (!client) return null;

    const getActionIcon = (action) => {
        switch(action?.toLowerCase()) {
            case 'creación': return <UserPlus size={16} className="text-green-500" />;
            case 'actualización': return <Edit3 size={16} className="text-blue-500" />;
            default: return <Activity size={16} className="text-neutral-500" />;
        }
    };

    const logs = [...(client.clientAuditLog || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col h-full max-h-[600px]">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 shrink-0">
                <Clock size={20} className="text-red-500" />
                Historial de Actividad
            </h3>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {logs.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 text-sm italic">
                        No hay registros de actividad.
                    </div>
                ) : (
                    <div className="relative border-l border-neutral-800 ml-3 space-y-6 pb-4">
                        {logs.map((log, idx) => (
                            <div key={idx} className="relative pl-6">
                                {/* Dot */}
                                <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center">
                                    {getActionIcon(log.action)}
                                </div>
                                
                                <div className="bg-neutral-800/30 border border-neutral-800/50 rounded-xl p-4">
                                    <div className="flex justify-between items-start mb-2 gap-4">
                                        <h4 className="text-sm font-bold text-white capitalize">{log.action}</h4>
                                        <span className="text-xs text-neutral-500 whitespace-nowrap">
                                            {new Date(log.date).toLocaleString('es-AR', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    
                                    <p className="text-xs text-neutral-400 mb-1">
                                        Por <span className="text-white font-medium">{log.user || 'Sistema'}</span>
                                    </p>
                                    
                                    {log.details && (
                                        <p className="text-sm text-neutral-300 mt-2 bg-black/20 p-2 rounded border border-neutral-800/50">
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
