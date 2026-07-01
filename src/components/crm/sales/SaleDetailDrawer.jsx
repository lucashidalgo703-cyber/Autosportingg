import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Calendar, CarFront, ChevronRight, DollarSign, ExternalLink, Receipt, ShieldCheck, User, X } from 'lucide-react';
import SaleStatusBadge from './SaleStatusBadge';

export default function SaleDetailDrawer({ sale, isOpen, onClose }) {
    if (!isOpen || !sale) return null;

    const vehicleName = sale.vehicleId ? `${sale.vehicleId.brand} ${sale.vehicleId.name}` : 'Vehiculo no asignado';
    const vehicleVin = sale.vehicleId?.plateOrVin || '';
    const clientName = sale.clientId?.fullName || sale.clientId?.firstName || sale.leadId?.name || 'Sin Nombre';
    const clientPhone = sale.clientId?.phone || sale.leadId?.phone || 'Sin telefono';

    const hasClientLink = sale.clientId?._id || sale.leadId?._id;
    const clientHref = sale.clientId?._id ? `/admin/clientes/${sale.clientId._id}` : (sale.leadId?._id ? `/admin/leads/${sale.leadId._id}` : '#');
    const vehicleHref = sale.vehicleId?._id ? `/admin/stock/${sale.vehicleId._id}` : '#';

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <button
                type="button"
                aria-label="Cerrar detalle"
                className="absolute inset-0 m-0 appearance-none border-0 bg-black/80 p-0 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden border-l border-crm-border bg-crm-surface shadow-2xl animate-slide-in-right">
                <div className="flex items-start justify-between border-b border-crm-border bg-crm-topbar p-5">
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <h2 className="m-0 text-lg font-bold tracking-tight text-crm-fg">Detalle de Venta</h2>
                            <SaleStatusBadge status={sale.status} />
                        </div>
                        <p className="m-0 max-w-[280px] truncate font-mono text-xs text-crm-fg-muted">
                            ID: {sale._id}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="m-0 flex h-9 w-9 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent text-crm-fg-muted transition-colors hover:bg-crm-surface hover:text-crm-fg"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto p-5 custom-scrollbar">
                    <div className="flex items-start gap-3 rounded-xl border border-crm-red/20 bg-crm-red/10 p-3">
                        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-crm-red" />
                        <div className="text-xs leading-5 text-red-100/80">
                            <span className="mb-0.5 block font-bold text-red-200">Vista de solo lectura</span>
                            La edicion y cancelacion de ventas se gestionan desde la ficha completa.
                        </div>
                    </div>

                    <section>
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-crm-fg-muted">
                            <DollarSign size={14} />
                            Resumen Comercial
                        </h3>
                        <div className="space-y-4 rounded-xl border border-crm-border bg-crm-bg p-4">
                            <div className="flex items-center justify-between border-b border-crm-border pb-4">
                                <span className="text-sm text-crm-fg-muted">Precio Final</span>
                                <span className={`text-lg font-black ${sale.status === 'cancelada' ? 'text-crm-fg-muted line-through' : 'text-emerald-300'}`}>
                                    {sale.saleCurrency} {(sale.salePrice || 0).toLocaleString('es-AR')}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-crm-fg-muted">Metodo de Pago</span>
                                <span className="text-sm font-bold uppercase text-crm-fg">{sale.paymentMethod}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-crm-fg-muted">Sena Aplicada</span>
                                <span className="text-sm font-bold text-crm-fg">
                                    {sale.depositAppliedAmount > 0
                                        ? `${sale.depositAppliedCurrency} ${sale.depositAppliedAmount.toLocaleString('es-AR')}`
                                        : 'No aplicada'
                                    }
                                </span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-crm-fg-muted">
                            <Receipt size={14} />
                            Entidades Relacionadas
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-xl border border-crm-border bg-crm-bg p-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-crm-border bg-crm-surface">
                                        <CarFront size={14} className="text-crm-fg-muted" />
                                    </div>
                                    <div className="flex min-w-0 flex-col">
                                        <span className="text-[10px] font-bold uppercase text-crm-fg-muted">Vehiculo</span>
                                        <span className="truncate text-sm font-bold text-crm-fg">{vehicleName}</span>
                                        {vehicleVin && <span className="mt-0.5 font-mono text-[10px] text-crm-fg-muted">{vehicleVin}</span>}
                                    </div>
                                </div>
                                {sale.vehicleId && (
                                    <Link href={vehicleHref} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-crm-border bg-crm-surface text-crm-fg no-underline transition-colors hover:bg-crm-surface-raised">
                                        <ChevronRight size={16} />
                                    </Link>
                                )}
                            </div>

                            {sale.clientId ? (
                                <div className="flex items-center justify-between rounded-xl border border-crm-border bg-crm-bg p-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-crm-border bg-crm-surface">
                                            <User size={14} className="text-crm-fg-muted" />
                                        </div>
                                        <div className="flex min-w-0 flex-col">
                                            <span className="text-[10px] font-bold uppercase text-crm-fg-muted">Cliente Oficial</span>
                                            <span className="truncate text-sm font-bold text-crm-fg">{clientName}</span>
                                            <span className="mt-0.5 text-[10px] text-crm-fg-muted">{clientPhone}</span>
                                        </div>
                                    </div>
                                    {hasClientLink && (
                                        <Link href={clientHref} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-crm-border bg-crm-surface text-crm-fg no-underline transition-colors hover:bg-crm-surface-raised">
                                            <ChevronRight size={16} />
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 rounded-xl border border-crm-red/20 bg-crm-red/10 p-3 text-center">
                                    <AlertTriangle size={20} className="text-red-300" />
                                    <div>
                                        <span className="block text-sm font-bold text-red-300">Venta sin cliente vinculado</span>
                                        <span className="text-xs text-red-100/70">Abre la ficha completa para vincular un cliente oficial.</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <section>
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-crm-fg-muted">
                            <Calendar size={14} />
                            Registro y Auditoria
                        </h3>
                        <div className="space-y-4 rounded-xl border border-crm-border bg-crm-bg p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-crm-fg-muted">Fecha de Venta</span>
                                <span className="text-sm font-bold text-crm-fg">
                                    {new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-crm-fg-muted">Vendedor Asignado</span>
                                <span className="text-sm font-bold text-crm-fg">{sale.salesperson || 'N/A'}</span>
                            </div>

                            {sale.notes && (
                                <div className="border-t border-crm-border pt-4">
                                    <span className="mb-2 block text-xs text-crm-fg-muted">Notas:</span>
                                    <p className="m-0 whitespace-pre-wrap rounded-lg border border-crm-border bg-crm-surface p-3 text-sm text-crm-fg-muted">
                                        {sale.notes}
                                    </p>
                                </div>
                            )}

                            {sale.saleAuditLog && sale.saleAuditLog.length > 0 && (
                                <div className="border-t border-crm-border pt-4">
                                    <span className="mb-2 block text-xs text-crm-fg-muted">Historial de Auditoria:</span>
                                    <div className="space-y-2">
                                        {sale.saleAuditLog.map((log, idx) => (
                                            <div key={idx} className="flex gap-2 text-xs">
                                                <div className="mt-1 flex flex-col items-center">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-crm-red" />
                                                    {idx !== sale.saleAuditLog.length - 1 && <div className="my-1 h-full w-px bg-crm-border" />}
                                                </div>
                                                <div className="flex-1 pb-2">
                                                    <span className="block text-crm-fg">{log.action}</span>
                                                    <span className="text-[10px] text-crm-fg-muted">
                                                        {new Date(log.date).toLocaleString()} por {log.user}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                <div className="border-t border-crm-border bg-crm-topbar p-5">
                    <Link
                        href={`/admin/ventas/${sale._id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-crm-red px-4 py-3 font-bold text-white no-underline transition-colors hover:bg-crm-red-hover"
                    >
                        <ExternalLink size={18} />
                        Abrir ficha completa
                    </Link>
                </div>
            </div>
        </div>
    );
}
