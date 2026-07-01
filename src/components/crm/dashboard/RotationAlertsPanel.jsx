import CrmCard from '../ui/CrmCard';
import { AlertTriangle, Clock, ExternalLink, Car } from 'lucide-react';
import Link from 'next/link';

export default function RotationAlertsPanel({ metrics }) {
    const { alertas } = metrics;
    const totalAlerts = alertas.alerta60.length + alertas.alerta90.length;

    const AlertList = ({ title, items, colorClass, borderClass, bgClass, iconColor }) => {
        if (items.length === 0) return null;

        return (
            <div className="mb-6 last:mb-0">
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${colorClass}`}>
                    <AlertTriangle size={14} />
                    {title} ({items.length})
                </h4>
                <div className="space-y-2">
                    {items.map(car => (
                        <div key={car.id} className={`flex items-center justify-between p-3 rounded-lg border ${borderClass} ${bgClass} hover:brightness-110 transition-all`}>
                            <div className="flex items-center gap-3">
                                {car.coverImage ? (
                                    <div className="w-10 h-8 rounded bg-crm-bg overflow-hidden shrink-0">
                                        <img src={car.coverImage} alt={car.brand} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-8 rounded bg-crm-surface-raised border border-crm-border shrink-0 flex items-center justify-center">
                                        <Car size={14} className="text-crm-fg-muted" />
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-semibold text-white leading-tight">{car.brand} {car.name}</p>
                                    <p className="text-[10px] text-crm-fg-muted uppercase">{car.status}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className={`text-sm font-bold ${colorClass}`}>{car.daysInStock} días</p>
                                </div>
                                <Link href={`/admin/stock/${car.id}`} className="text-crm-fg-muted hover:text-white transition-colors">
                                    <ExternalLink size={16} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <CrmCard className="h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                    Alertas de Rotación
                    {totalAlerts > 0 && (
                        <span className="bg-crm-red text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {totalAlerts}
                        </span>
                    )}
                </h3>
            </div>

            {totalAlerts === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-center border border-dashed border-crm-border rounded-xl">
                    <Clock size={24} className="text-[#22C55E] mb-2" />
                    <p className="text-sm text-crm-fg-muted font-medium">Stock saludable</p>
                    <p className="text-xs text-[#666]">No hay autos activos con más de 60 días.</p>
                </div>
            ) : (
                <div className="overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    <AlertList 
                        title="Crítico (+90 días)" 
                        items={alertas.alerta90} 
                        colorClass="text-crm-red" 
                        borderClass="border-red-500/20" 
                        bgClass="bg-crm-red/5" 
                    />
                    <AlertList 
                        title="Atención (+60 días)" 
                        items={alertas.alerta60} 
                        colorClass="text-orange-500" 
                        borderClass="border-orange-500/20" 
                        bgClass="bg-orange-500/5" 
                    />
                </div>
            )}
        </CrmCard>
    );
}
