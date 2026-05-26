"use client";
import CrmCard from '../ui/CrmCard';
import { Clock, Plus, Tag, Flag, Edit, Eye, Receipt, MessageSquare, AlertCircle } from 'lucide-react';

export default function VehicleHistoryTimeline({ vehicle }) {
    
    // Obtener los logs, ordenarlos del más reciente al más antiguo, y limitar a 50
    const rawLogs = vehicle.auditLog || [];
    const timeline = [...rawLogs]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 50);

    const getActionConfig = (action) => {
        switch (action) {
            case 'PRECIO':
                return { icon: Tag, color: 'bg-[#22C55E]' };
            case 'ESTADO':
                return { icon: Flag, color: 'bg-[#EAB308]' };
            case 'VISIBILIDAD':
                return { icon: Eye, color: 'bg-[#3B82F6]' };
            case 'GASTO':
                return { icon: Receipt, color: 'bg-[#EF4444]' };
            case 'OBSERVACION':
                return { icon: MessageSquare, color: 'bg-[#8B5CF6]' };
            case 'EDICION':
                return { icon: Edit, color: 'bg-[#A1A1AA]' };
            default:
                return { icon: AlertCircle, color: 'bg-[#A1A1AA]' };
        }
    };

    return (
        <CrmCard>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-semibold text-lg">Historial Interno (Audit Log)</h3>
            </div>
            
            {timeline.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-[#161619] rounded-xl border border-[#33333A] border-dashed">
                    <Clock size={24} className="text-[#A1A1AA] mb-2 opacity-50" />
                    <p className="text-sm text-[#A1A1AA]">Todavía no hay movimientos registrados para este vehículo.</p>
                </div>
            ) : (
                <div className="flex flex-col relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-[#33333A] gap-6">
                    {timeline.map((item, index) => {
                        const { icon: Icon, color } = getActionConfig(item.action);
                        const dateObj = new Date(item.date);
                        
                        return (
                            <div key={item._id || index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#1E1E24] ${color} text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow z-10`}>
                                    <Icon size={16} />
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[#161619] p-4 rounded-xl border border-[#33333A]">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-[#24242B] text-white">
                                                {item.action}
                                            </span>
                                            <span className="text-[10px] text-[#A1A1AA] font-medium">
                                                {item.user}
                                            </span>
                                        </div>
                                        <span className="text-xs text-[#A1A1AA] flex items-center gap-1 shrink-0">
                                            <Clock size={12}/> 
                                            {dateObj.toLocaleDateString('es-AR')} {dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-white leading-snug m-0">{item.details}</p>
                                    
                                    {(item.oldValue !== undefined && item.newValue !== undefined && item.action !== 'GASTO') && (
                                        <div className="mt-3 p-2 bg-[#09090B] rounded border border-[#33333A] grid grid-cols-2 gap-2 text-xs">
                                            <div className="flex flex-col gap-0.5 overflow-hidden">
                                                <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wide">Anterior</span>
                                                <span className="text-[#EF4444] line-through truncate" title={String(item.oldValue)}>
                                                    {String(item.oldValue) || '-'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-0.5 overflow-hidden">
                                                <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wide">Nuevo</span>
                                                <span className="text-[#22C55E] truncate" title={String(item.newValue)}>
                                                    {String(item.newValue) || '-'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </CrmCard>
    );
}
