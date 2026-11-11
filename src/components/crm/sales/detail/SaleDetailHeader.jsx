import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Handshake, CarFront, UserRound, CalendarDays } from 'lucide-react';
import SaleStatusBadge from '../SaleStatusBadge';

export default function SaleDetailHeader({ sale, actions }) {
    if (!sale) return null;
    const vehicleName = [sale.vehicleId?.brand || sale.vehicleId?.make, sale.vehicleId?.name || sale.vehicleId?.model].filter(Boolean).join(' ') || 'Vehículo por vincular';
    const buyerName = sale.clientId?.fullName || sale.buyerName || 'Comprador por vincular';

    return (
        <div className="rounded-2xl border border-crm-border bg-gradient-to-br from-crm-surface-raised to-crm-surface p-4 shadow-[var(--crm-shadow-card)] sm:p-5">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-start gap-3">
                        <Link
                            href="/admin/ventas"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-crm-border bg-crm-surface text-crm-fg-muted no-underline transition-colors hover:bg-crm-surface-raised hover:text-crm-fg"
                            title="Volver a Ventas"
                        >
                            <ArrowLeft size={18} />
                        </Link>
                        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-crm-red/20 bg-crm-red/10 text-crm-red sm:flex">
                            <Handshake size={20} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <h1 className="m-0 text-xl font-bold leading-tight text-crm-fg sm:text-2xl">Expediente Comercial</h1>
                                <SaleStatusBadge status={sale.status} />
                            </div>
                            <p className="m-0 mt-1 break-all font-mono text-[10px] text-crm-fg-muted sm:text-xs">
                                ID: {sale._id}
                            </p>
                        </div>
                    </div>

                </div>

                {actions && (
                    <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
                        {actions}
                    </div>
                )}
            </div>
            <div className="mt-4 grid min-w-0 gap-2 border-t border-crm-border pt-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <div className="flex min-w-0 items-center gap-2 text-xs text-crm-fg"><CarFront size={15} className="shrink-0 text-crm-fg-muted"/><span className="break-words"><span className="mr-1 text-crm-fg-muted">Vehículo:</span>{vehicleName}</span></div>
                <div className="flex min-w-0 items-center gap-2 text-xs text-crm-fg"><UserRound size={15} className="shrink-0 text-crm-fg-muted"/><span className="break-words"><span className="mr-1 text-crm-fg-muted">Comprador:</span>{buyerName}</span></div>
                <div className="flex items-center gap-2 text-xs text-crm-fg"><CalendarDays size={15} className="shrink-0 text-crm-fg-muted"/><span><span className="mr-1 text-crm-fg-muted">Operación:</span>{new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</span></div>
            </div>
        </div>
    );
}
