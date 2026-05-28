import React from 'react';
import { DollarSign, CarFront, Target, AlertTriangle, FileText, Package } from 'lucide-react';

export default function ReportsSummaryCards({ data }) {
    const { sales, cars, installments, tasks } = data;

    // Calculos rápidos
    let stockTotalUsd = 0;
    let stockTotalArs = 0;
    let ventasArs = 0;
    let ventasUsd = 0;

    cars.forEach(c => {
        if (c.status === 'Disponible') {
            if (c.currency === 'USD') stockTotalUsd += c.price || 0;
            if (c.currency === 'ARS') stockTotalArs += c.price || 0;
        }
    });

    sales.forEach(s => {
        if (s.status !== 'cancelada' && s.status !== 'borrador') {
            if (s.saleCurrency === 'USD') ventasUsd += s.salePrice || 0;
            if (s.saleCurrency === 'ARS') ventasArs += s.salePrice || 0;
        }
    });

    const cuotasVencidas = installments.filter(i => {
        if (i.status === 'pagada') return false;
        const due = new Date(i.dueDate);
        due.setHours(0,0,0,0);
        return due < new Date().setHours(0,0,0,0);
    }).length;

    const tareasVencidas = tasks.filter(t => {
        if (t.status !== 'pendiente') return false;
        const due = new Date(t.dueDate);
        due.setHours(0,0,0,0);
        return due < new Date().setHours(0,0,0,0);
    }).length;

    const formatCurrency = (val, cur) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(val);
    };

    const formatStockValue = () => {
        if (stockTotalUsd > 0 && stockTotalArs > 0) return `${formatCurrency(stockTotalUsd, 'USD')} + ARS`;
        if (stockTotalUsd > 0) return formatCurrency(stockTotalUsd, 'USD');
        return formatCurrency(stockTotalArs, 'ARS');
    };

    const cards = [
        {
            title: 'Capital en Stock',
            value: formatStockValue(),
            subtitle: `${cars.filter(c => c.status === 'Disponible').length} disp.`,
            icon: CarFront,
            color: 'text-indigo-500',
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/20'
        },
        {
            title: 'Ventas (USD)',
            value: formatCurrency(ventasUsd, 'USD'),
            subtitle: 'Volumen histórico',
            icon: DollarSign,
            color: 'text-green-500',
            bg: 'bg-green-500/10',
            border: 'border-green-500/20'
        },
        {
            title: 'Cuotas Vencidas',
            value: cuotasVencidas,
            subtitle: 'Requieren gestión',
            icon: Target,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20'
        },
        {
            title: 'Tareas Vencidas',
            value: tareasVencidas,
            subtitle: 'Atrasos en CRM',
            icon: AlertTriangle,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/20'
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {cards.map((card, index) => (
                <div key={index} className="bg-[#161619] border border-[#33333A] rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center border ${card.border}`}>
                            <card.icon size={20} className={card.color} />
                        </div>
                    </div>
                    <div>
                        <div className="text-xl font-bold text-white mb-0.5 truncate" title={card.value}>{card.value}</div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-[#A1A1AA] font-bold uppercase">{card.title}</span>
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-1">{card.subtitle}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
