import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Handshake } from 'lucide-react';
import SaleStatusBadge from '../SaleStatusBadge';

export default function SaleDetailHeader({ sale, actions }) {
    if (!sale) return null;

    return (
        <div className="mb-6 rounded-xl border border-crm-border bg-crm-surface p-4 md:p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="mb-4 flex items-center gap-3">
                        <Link
                            href="/admin/ventas"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-crm-border bg-crm-bg text-crm-fg-muted no-underline transition-colors hover:bg-crm-surface-raised hover:text-crm-fg"
                            title="Volver a Ventas"
                        >
                            <ArrowLeft size={18} />
                        </Link>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-crm-red/20 bg-crm-red/10 text-crm-red">
                            <Handshake size={20} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <h1 className="m-0 truncate text-2xl font-bold leading-tight text-crm-fg">Expediente Comercial</h1>
                                <SaleStatusBadge status={sale.status} />
                            </div>
                            <p className="m-0 mt-1 max-w-[520px] truncate font-mono text-xs text-crm-fg-muted">
                                ID: {sale._id}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded border border-crm-border bg-crm-bg px-2 py-0.5 text-[10px] font-bold uppercase text-crm-fg-muted">
                            Fecha de operacion
                        </span>
                        <span className="text-sm font-semibold text-crm-fg">
                            {new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                {actions && (
                    <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}
