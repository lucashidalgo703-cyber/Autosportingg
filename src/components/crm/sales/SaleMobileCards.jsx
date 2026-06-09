import React from 'react';
import Link from 'next/link';
import { CarFront, ChevronRight, Search, ShoppingCart, User, Trash2 } from 'lucide-react';
import SaleStatusBadge from './SaleStatusBadge';

export default function SaleMobileCards({ sales, onViewDetail, onDeleteSale }) {
    if (!sales || sales.length === 0) {
        return (
            <div className="flex min-h-[210px] flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-surface p-8 text-center md:hidden">
                <ShoppingCart size={36} className="mb-3 text-crm-fg-subtle" />
                <h3 className="m-0 text-base font-bold text-crm-fg">Sin resultados</h3>
                <p className="m-0 mt-2 text-sm text-crm-fg-muted">Todavía no hay ventas cargadas.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 md:hidden">
            {sales.map(sale => {
                const name = sale.clientId?.fullName || sale.clientId?.firstName || sale.leadId?.name || 'Sin Nombre';
                const vehicleName = sale.vehicleId ? `${sale.vehicleId.brand} ${sale.vehicleId.name}` : 'Vehiculo no asignado';
                const hasClientLink = sale.clientId?._id || sale.leadId?._id;
                const clientHref = sale.clientId?._id ? `/admin/clientes/${sale.clientId._id}` : (sale.leadId?._id ? `/admin/leads/${sale.leadId._id}` : '#');
                const vehicleHref = sale.vehicleId?._id ? `/admin/stock/${sale.vehicleId._id}` : '#';

                return (
                    <article key={sale._id} className="overflow-hidden rounded-xl border border-crm-border bg-crm-bg">
                        <div className="flex items-start justify-between gap-3 border-b border-crm-border bg-crm-surface-raised/60 px-3 py-3">
                            <SaleStatusBadge status={sale.status} />
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-crm-fg-muted">{new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</span>
                                <span className="text-[10px] uppercase text-crm-fg-muted">{sale.paymentMethod || 'contado'}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 px-3 py-3">
                            <div className="flex flex-col">
                                <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Vehiculo</span>
                                {sale.vehicleId ? (
                                    <Link href={vehicleHref} className="flex items-center gap-2 text-sm font-bold text-crm-fg no-underline transition-colors hover:text-crm-red">
                                        <CarFront size={14} className="text-crm-red" />
                                        {vehicleName}
                                    </Link>
                                ) : (
                                    <span className="text-sm font-bold text-crm-fg-muted">N/A</span>
                                )}
                            </div>

                            <div className="flex flex-col">
                                <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Cliente / Cotizacion</span>
                                {hasClientLink ? (
                                    <Link href={clientHref} className="flex items-center gap-1.5 text-sm text-crm-fg-muted no-underline transition-colors hover:text-crm-red">
                                        <User size={14} className="text-crm-fg-muted" />
                                        {name}
                                    </Link>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-sm text-crm-fg-muted">
                                        <User size={14} className="text-crm-fg-muted" />
                                        {name}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 rounded-xl border border-crm-border bg-crm-bg p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase text-crm-fg-muted">Precio Venta</span>
                                    <span className={`text-sm font-bold ${sale.status === 'cancelada' ? 'text-crm-fg-muted line-through' : 'text-emerald-300'}`}>
                                        {sale.saleCurrency} {(sale.salePrice || 0).toLocaleString('es-AR')}
                                    </span>
                                </div>
                                {sale.finance && (
                                    <div className="flex items-center justify-between border-t border-crm-border pt-2">
                                        <span className="text-[10px] uppercase text-crm-fg-muted">Cobranza</span>
                                        <div className="flex flex-col items-end">
                                            {sale.finance.collectionStatus === 'sin_cobro' && <span className="text-[10px] font-bold uppercase text-red-300">Sin Cobro</span>}
                                            {sale.finance.collectionStatus === 'parcial' && <span className="text-[10px] font-bold uppercase text-amber-300">Saldo: {sale.saleCurrency} {sale.finance.pendingBalance.toLocaleString('es-AR')}</span>}
                                            {sale.finance.collectionStatus === 'cobrada' && <span className="text-[10px] font-bold uppercase text-emerald-300">Cobrada</span>}
                                            {sale.finance.collectionStatus === 'sobrecobrada' && <span className="text-[10px] font-bold uppercase text-purple-300">Sobrecobrada</span>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col">
                                    <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Documentacion</span>
                                    <span className={`w-max rounded border px-2 py-0.5 text-xs font-bold uppercase ${
                                        sale.documentationStatus === 'completo' ? 'border-blue-500/20 bg-blue-500/10 text-blue-300' :
                                        sale.documentationStatus === 'parcial' ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' :
                                        'border-crm-border bg-crm-bg text-crm-fg-muted'
                                    }`}>
                                        {sale.documentationStatus || 'pendiente'}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Entrega</span>
                                    <span className={`w-max rounded border px-2 py-0.5 text-xs font-bold uppercase ${
                                        sale.deliveryStatus === 'entregado' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' :
                                        sale.deliveryStatus === 'listo_para_entregar' ? 'border-blue-500/20 bg-blue-500/10 text-blue-300' :
                                        sale.deliveryStatus === 'preparando' ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' :
                                        'border-crm-border bg-crm-bg text-crm-fg-muted'
                                    }`}>
                                        {(sale.deliveryStatus || 'pendiente').replace(/_/g, ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 border-t border-crm-border px-3 py-3">
                            <button
                                type="button"
                                onClick={() => onViewDetail(sale)}
                                className="m-0 flex flex-1 appearance-none items-center justify-center gap-2 rounded-lg border border-crm-border bg-crm-surface-raised px-3 py-2.5 text-sm font-bold text-crm-fg transition-colors hover:bg-crm-border"
                            >
                                <Search size={16} className="text-crm-fg-muted" />
                                Ver detalle
                            </button>

                            {sale.status === 'cancelada' && onDeleteSale ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onDeleteSale(sale);
                                    }}
                                    className="flex w-12 flex-none items-center justify-center rounded-lg border border-crm-red/20 bg-crm-red/10 text-red-300 transition-colors hover:bg-crm-red/20"
                                >
                                    <Trash2 size={18} />
                                </button>
                            ) : (
                                <Link
                                    href={vehicleHref}
                                    className="flex w-12 flex-none items-center justify-center rounded-lg border border-crm-border bg-crm-surface-raised py-2.5 text-crm-fg-muted no-underline transition-colors hover:bg-crm-border"
                                >
                                    <ChevronRight size={18} />
                                </Link>
                            )}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
