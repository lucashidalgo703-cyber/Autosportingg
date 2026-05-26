import CrmCard from '../ui/CrmCard';
import { Clock, Tag, Flag, Eye, Receipt, MessageSquare, Edit, AlertCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function RecentAuditPanel({ metrics }) {
    const { auditGlobal } = metrics;

    const getActionConfig = (action) => {
        switch (action) {
            case 'PRECIO': return { icon: Tag, color: 'text-[#22C55E]' };
            case 'ESTADO': return { icon: Flag, color: 'text-[#EAB308]' };
            case 'VISIBILIDAD': return { icon: Eye, color: 'text-[#3B82F6]' };
            case 'GASTO': return { icon: Receipt, color: 'text-[#EF4444]' };
            case 'OBSERVACION': return { icon: MessageSquare, color: 'text-[#8B5CF6]' };
            case 'EDICION': return { icon: Edit, color: 'text-[#A1A1AA]' };
            default: return { icon: AlertCircle, color: 'text-[#A1A1AA]' };
        }
    };

    return (
        <CrmCard className="h-full flex flex-col">
            <h3 className="text-white font-semibold text-lg mb-6 flex justify-between items-center">
                Últimos Movimientos
                <span className="bg-white/5 border border-white/10 text-xs px-2 py-1 rounded text-gray-400 font-medium">
                    Interno
                </span>
            </h3>

            {auditGlobal.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                    <Clock size={24} className="text-[#A1A1AA] mb-2 opacity-50" />
                    <p className="text-sm text-[#A1A1AA]">No hay actividad reciente en el stock.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    {auditGlobal.map((log, i) => {
                        const { icon: Icon, color } = getActionConfig(log.action);
                        const dateObj = new Date(log.date);

                        return (
                            <div key={i} className="flex gap-4 group">
                                <div className={`w-8 h-8 rounded-full bg-[#1A1A1F] border border-white/5 flex items-center justify-center shrink-0 ${color}`}>
                                    <Icon size={14} />
                                </div>
                                <div className="flex-1 pb-4 border-b border-white/5 group-last:border-0 group-last:pb-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-sm font-semibold text-white">
                                            {log.carTitle}
                                        </p>
                                        <span className="text-[10px] text-[#A1A1AA] shrink-0">
                                            {dateObj.toLocaleDateString('es-AR')} {dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-[#24242B] text-white">
                                            {log.action}
                                        </span>
                                        <span className="text-[10px] text-[#A1A1AA]">por {log.user}</span>
                                    </div>
                                    <p className="text-xs text-[#A1A1AA] mb-2 leading-snug">{log.details}</p>
                                    
                                    <Link href={`/admin/stock/${log.carId}`} className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 w-max">
                                        Ver Vehículo <ExternalLink size={10} />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </CrmCard>
    );
}
