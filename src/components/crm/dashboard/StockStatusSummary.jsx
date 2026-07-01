import CrmCard from '../ui/CrmCard';
import { Car, CheckCircle2, Lock, PauseCircle, Eye, EyeOff } from 'lucide-react';

export default function StockStatusSummary({ metrics }) {
    const { counts } = metrics;

    const StatusItem = ({ label, count, icon: Icon, colorClass, total }) => {
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        
        return (
            <div className="flex flex-col bg-crm-bg border border-crm-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-crm-fg-muted text-xs font-medium uppercase tracking-wider">{label}</span>
                    <Icon size={16} className={colorClass.replace('bg-', 'text-').replace('/10', '')} />
                </div>
                <div className="flex items-end gap-2 mb-2">
                    <span className="text-2xl font-bold text-white leading-none">{count}</span>
                    <span className="text-xs text-crm-fg-muted mb-1">unds</span>
                </div>
                {/* Progress Bar Tailwind */}
                <div className="w-full bg-crm-surface h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full ${colorClass.split(' ')[0].replace('/10', '')}`} style={{ width: `${percentage}%` }}></div>
                </div>
            </div>
        );
    };

    return (
        <CrmCard className="h-full">
            <h3 className="text-white font-semibold text-lg mb-6">Estado del Stock</h3>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
                <StatusItem label="Disponibles" count={counts.disponibles} total={counts.total} icon={Car} colorClass="bg-[#22C55E]" />
                <StatusItem label="Reservados" count={counts.reservados} total={counts.total} icon={Lock} colorClass="bg-yellow-500" />
                <StatusItem label="Pausados" count={counts.pausados} total={counts.total} icon={PauseCircle} colorClass="bg-orange-500" />
                <StatusItem label="Vendidos" count={counts.vendidos} total={counts.total} icon={CheckCircle2} colorClass="bg-crm-red" />
            </div>

            <div className="border-t border-crm-border pt-5">
                <h4 className="text-sm font-semibold text-crm-fg-muted mb-4">Visibilidad en Web Pública</h4>
                <div className="flex items-center gap-4">
                    <div className="flex-1 bg-crm-surface border border-crm-border rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Eye size={16} className="text-blue-400" />
                            <span className="text-sm text-white">Públicos</span>
                        </div>
                        <span className="font-bold text-white">{counts.visibles}</span>
                    </div>
                    <div className="flex-1 bg-crm-surface border border-crm-border rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <EyeOff size={16} className="text-crm-fg-muted" />
                            <span className="text-sm text-white">Ocultos</span>
                        </div>
                        <span className="font-bold text-white">{counts.ocultos}</span>
                    </div>
                </div>
            </div>
        </CrmCard>
    );
}
