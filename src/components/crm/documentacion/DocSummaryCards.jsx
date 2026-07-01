import React from 'react';
import { FileWarning, CheckCircle, Clock, Truck, FileCheck2, AlertCircle } from 'lucide-react';

export default function DocSummaryCards({ sales, getSaleTaskStatus }) {
    if (!sales) return null;

    // Filtramos solo ventas activas para métricas relevantes
    const activeSales = sales.filter(s => s.status !== 'cancelada');

    const docIncompleta = activeSales.filter(s => (s.documentationStatus || 'pendiente') !== 'completo').length;
    const listasParaEntregar = activeSales.filter(s => s.deliveryStatus === 'listo_para_entregar').length;
    const entregasPendientes = activeSales.filter(s => s.deliveryStatus === 'pendiente' || s.deliveryStatus === 'preparando').length;
    const entregadas = activeSales.filter(s => s.deliveryStatus === 'entregado').length;

    // Con tareas de doc/entrega pendientes
    const conTareasPendientes = activeSales.filter(s => {
        const pendingTasks = getSaleTaskStatus(s._id);
        return pendingTasks && pendingTasks.length > 0;
    }).length;

    const cards = [
        {
            title: 'Doc. Incompleta',
            value: docIncompleta,
            icon: FileWarning,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/20'
        },
        {
            title: 'Listas p/ Entregar',
            value: listasParaEntregar,
            icon: CheckCircle,
            color: 'text-green-500',
            bg: 'bg-green-500/10',
            border: 'border-green-500/20'
        },
        {
            title: 'Entregas Pendientes',
            value: entregasPendientes,
            icon: Clock,
            color: 'text-yellow-500',
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/20'
        },
        {
            title: 'Entregadas (Total)',
            value: entregadas,
            icon: Truck,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20'
        },
        {
            title: 'Con Tareas Asignadas',
            value: conTareasPendientes,
            icon: AlertCircle,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20'
        }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {cards.map((card, index) => (
                <div key={index} className="bg-crm-bg border border-crm-border rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center border ${card.border}`}>
                            <card.icon size={20} className={card.color} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white mb-1">{card.value}</div>
                        <div className="text-xs text-crm-fg-muted font-medium tracking-wide uppercase">{card.title}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
