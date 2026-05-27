import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Handshake } from 'lucide-react';
import SaleStatusBadge from '../SaleStatusBadge';

export default function SaleDetailHeader({ sale }) {
    if (!sale) return null;

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-6 rounded-2xl mb-6 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4"></div>

            <div className="flex items-start gap-4 relative z-10">
                <Link 
                    href="/admin/ventas"
                    className="w-10 h-10 shrink-0 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors border border-neutral-700"
                    title="Volver a Ventas"
                >
                    <ArrowLeft size={20} />
                </Link>

                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Handshake size={16} className="text-blue-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            Expediente Comercial
                            <SaleStatusBadge status={sale.status} />
                        </h1>
                    </div>
                    <p className="text-sm text-neutral-400 font-mono ml-11">
                        ID: {sale._id}
                    </p>
                </div>
            </div>

            <div className="flex flex-col md:items-end gap-1 relative z-10 ml-14 md:ml-0">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Fecha de Operación</span>
                <span className="text-lg font-bold text-white">
                    {new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}
                </span>
            </div>
        </div>
    );
}
