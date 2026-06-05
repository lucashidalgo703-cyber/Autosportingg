import React from 'react';
import { AlertTriangle, Clock, DollarSign, FileCheck2, Handshake, Truck, XCircle } from 'lucide-react';

export default function SalesSummaryCards({ sales }) {
    if (!sales) return null;

    const metrics = sales.reduce((acc, sale) => {
        acc.total++;
        if (sale.status === 'confirmada') acc.confirmadas++;
        if (sale.status === 'pendiente_entrega') acc.pendientes++;
        if (sale.status === 'entregada') acc.entregadas++;
        if (sale.status === 'cancelada') acc.canceladas++;

        if (sale.status !== 'cancelada') {
            if (sale.saleCurrency === 'ARS') acc.totalARS += (sale.salePrice || 0);
            if (sale.saleCurrency === 'USD') acc.totalUSD += (sale.salePrice || 0);
        }

        return acc;
    }, {
        total: 0,
        confirmadas: 0,
        pendientes: 0,
        entregadas: 0,
        canceladas: 0,
        totalARS: 0,
        totalUSD: 0,
        docPendiente: 0,
        listaParaEntregar: 0,
        demoradas: 0
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    sales.forEach(sale => {
        if (sale.status === 'cancelada') return;

        if (sale.documentationStatus !== 'completo') metrics.docPendiente++;
        if (sale.deliveryStatus === 'listo_para_entregar') metrics.listaParaEntregar++;

        if (sale.estimatedDeliveryDate && sale.deliveryStatus !== 'entregado') {
            const estDate = new Date(sale.estimatedDeliveryDate);
            if (estDate < today) metrics.demoradas++;
        }
    });

    const cards = [
        {
            label: 'Ventas registradas',
            value: metrics.total,
            helper: `${metrics.confirmadas} confirmadas`,
            icon: Handshake,
            tone: 'bg-crm-red/10 text-crm-red border-crm-red/20'
        },
        {
            label: 'Volumen USD',
            value: `USD ${metrics.totalUSD.toLocaleString('es-AR')}`,
            helper: 'Excluye canceladas',
            icon: DollarSign,
            tone: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
        },
        {
            label: 'Volumen ARS',
            value: `ARS ${metrics.totalARS.toLocaleString('es-AR')}`,
            helper: 'Excluye canceladas',
            icon: DollarSign,
            tone: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
        },
        {
            label: 'Pendiente entrega',
            value: metrics.pendientes,
            helper: `${metrics.listaParaEntregar} listas`,
            icon: Clock,
            tone: 'bg-amber-500/10 text-amber-300 border-amber-500/20'
        },
        {
            label: 'Entregadas',
            value: metrics.entregadas,
            helper: 'Operaciones completas',
            icon: Truck,
            tone: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
        },
        {
            label: 'Doc. incompleta',
            value: metrics.docPendiente,
            helper: 'Requiere seguimiento',
            icon: FileCheck2,
            tone: 'bg-blue-500/10 text-blue-300 border-blue-500/20'
        },
        {
            label: 'Demoradas',
            value: metrics.demoradas,
            helper: 'Entrega vencida',
            icon: AlertTriangle,
            tone: 'bg-crm-red/10 text-red-300 border-crm-red/20'
        },
        {
            label: 'Canceladas',
            value: metrics.canceladas,
            helper: 'Historico',
            icon: XCircle,
            tone: 'bg-crm-surface-raised text-crm-fg-muted border-crm-border'
        }
    ];

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-300" />
                <div>
                    <span className="block text-sm font-bold text-amber-200">Ventas comerciales registradas</span>
                    <p className="m-0 mt-1 text-xs leading-5 text-amber-100/80">
                        Estos valores reflejan volumen comercial. No representan caja real ni cobros efectivamente ingresados.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => {
                    const Icon = card.icon;

                    return (
                        <div key={card.label} className="rounded-xl border border-crm-border bg-crm-surface p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">
                                        {card.label}
                                    </p>
                                    <p className="m-0 mt-3 truncate text-2xl font-bold leading-none text-crm-fg">
                                        {card.value}
                                    </p>
                                    <p className="m-0 mt-2 text-xs text-crm-fg-muted">{card.helper}</p>
                                </div>
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${card.tone}`}>
                                    <Icon size={18} />
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
