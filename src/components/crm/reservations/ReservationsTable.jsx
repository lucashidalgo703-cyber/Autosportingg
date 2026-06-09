import React from 'react';
import Link from 'next/link';
import { AlertCircle, CarFront, ChevronRight, Lock, User, XCircle, Trash2 } from 'lucide-react';
import ReservationStatusBadge from './ReservationStatusBadge';
import CrmButton from '../ui/CrmButton';

export default function ReservationsTable({ reservations, onLiberar, onConvertir, getIsOverdue, onDelete }) {
    if (!reservations || reservations.length === 0) {
        return (
            <div className="hidden min-h-[210px] flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-surface p-12 text-center md:flex">
                <Lock size={42} className="mb-4 text-crm-fg-subtle" />
                <h3 className="m-0 text-base font-bold text-crm-fg">Sin resultados</h3>
                <p className="m-0 mt-2 max-w-md text-sm leading-6 text-crm-fg-muted">
                    Todavia no hay reservas cargadas o no coinciden con los filtros actuales.
                </p>
            </div>
        );
    }

    return (
        <div className="hidden overflow-hidden rounded-xl border border-crm-border bg-crm-surface md:block">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1060px] border-collapse text-left">
                    <thead className="bg-crm-bg text-[10px] uppercase tracking-[0.08em] text-crm-fg-muted">
                        <tr>
                            <th className="px-4 py-3 font-bold">Fecha</th>
                            <th className="px-4 py-3 font-bold">Cliente / Lead</th>
                            <th className="px-4 py-3 font-bold">Vehiculo</th>
                            <th className="px-4 py-3 font-bold">Estado</th>
                            <th className="px-4 py-3 text-right font-bold">Sena</th>
                            <th className="px-4 py-3 text-right font-bold">Vencimiento</th>
                            <th className="px-4 py-3 text-center font-bold">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border">
                        {reservations.map((res) => {
                            const isOverdue = getIsOverdue(res);
                            const name = res.clientId?.fullName || res.clientId?.firstName || res.leadId?.name || 'Sin nombre';
                            const phone = res.clientId?.phone || res.leadId?.phone || '';
                            const vehicleName = res.vehicleId ? `${res.vehicleId.brand} ${res.vehicleId.name}` : 'Vehiculo no asignado';
                            const vehicleVin = res.vehicleId?.plateOrVin || '';
                            const hasLink = res.clientId?._id || res.leadId?._id;
                            const linkHref = res.clientId?._id ? `/admin/clientes/${res.clientId._id}` : (res.leadId?._id ? `/admin/leads/${res.leadId._id}` : '#');
                            const vehicleHref = res.vehicleId?._id ? `/admin/stock/${res.vehicleId._id}` : '#';

                            return (
                                <tr key={res._id} className={`h-[78px] text-sm text-crm-fg transition-colors hover:bg-crm-surface-raised/70 ${isOverdue && res.status === 'activa' ? 'bg-amber-500/5' : ''}`}>
                                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                                        <span className="block text-sm text-crm-fg">{new Date(res.createdAt).toLocaleDateString('es-AR')}</span>
                                        <span className="text-[10px] uppercase text-crm-fg-muted">{new Date(res.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </td>

                                    <td className="px-4 py-3 align-middle">
                                        <div className="flex flex-col">
                                            {hasLink ? (
                                                <Link href={linkHref} className="flex max-w-[200px] items-center gap-2 truncate text-sm font-bold text-crm-fg no-underline transition-colors hover:text-crm-red">
                                                    <User size={13} className="shrink-0 text-crm-fg-muted" />
                                                    {name}
                                                </Link>
                                            ) : (
                                                <span className="flex max-w-[200px] items-center gap-2 truncate text-sm font-bold text-crm-fg">
                                                    <User size={13} className="shrink-0 text-crm-fg-muted" />
                                                    {name}
                                                </span>
                                            )}
                                            {phone && <span className="mt-0.5 text-xs text-crm-fg-muted">{phone}</span>}
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 align-middle">
                                        <div className="flex flex-col">
                                            {res.vehicleId ? (
                                                <Link href={vehicleHref} className="flex max-w-[210px] items-center gap-2 truncate text-sm font-bold text-crm-fg no-underline transition-colors hover:text-crm-red">
                                                    <CarFront size={14} className="shrink-0 text-crm-red" />
                                                    {vehicleName}
                                                </Link>
                                            ) : (
                                                <span className="text-sm font-bold text-crm-fg-muted">N/A</span>
                                            )}
                                            {vehicleVin && (
                                                <span className="mt-1 w-max rounded border border-crm-border bg-crm-bg px-1.5 py-0.5 font-mono text-[10px] uppercase text-crm-fg-muted">
                                                    {vehicleVin}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                                        <ReservationStatusBadge status={res.status} isOverdue={isOverdue} />
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-3 text-right align-middle">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-sm font-bold ${res.status === 'activa' ? 'text-emerald-300' : 'text-crm-fg-muted'}`}>
                                                {res.depositCurrency} {(res.depositAmount || 0).toLocaleString('es-AR')}
                                            </span>
                                            <span className="text-[10px] text-crm-fg-muted">
                                                Acordado: {res.agreedCurrency} {(res.agreedPrice || 0).toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-3 text-right align-middle">
                                        {res.expiresAt ? (
                                            <div className="flex flex-col items-end">
                                                <span className={`inline-flex items-center gap-1 text-sm font-medium ${isOverdue && res.status === 'activa' ? 'font-bold text-amber-300' : 'text-crm-fg-muted'}`}>
                                                    {isOverdue && res.status === 'activa' && <AlertCircle size={12} />}
                                                    {new Date(res.expiresAt).toLocaleDateString('es-AR')}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-sm italic text-crm-fg-muted">Sin fecha</span>
                                        )}
                                    </td>

                                    <td className="px-4 py-3 text-center align-middle">
                                        <div className="flex items-center justify-center gap-2">
                                            {res.status === 'activa' && (
                                                <>
                                                    <CrmButton
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => onConvertir(res)}
                                                        className="h-8 px-3 text-xs"
                                                        title="Convertir a venta"
                                                    >
                                                        Vender
                                                    </CrmButton>
                                                    <button
                                                        type="button"
                                                        onClick={() => onLiberar(res)}
                                                        className="m-0 flex h-8 w-8 appearance-none items-center justify-center rounded-lg border border-crm-border bg-crm-surface-raised text-crm-fg-muted transition-colors hover:border-crm-red/40 hover:bg-crm-red/10 hover:text-crm-red"
                                                        title="Liberar / cancelar reserva"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                </>
                                            )}

                                            {(res.status === 'cancelada' || res.status === 'convertida') && onDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDelete(res)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-crm-red/20 bg-crm-red/10 text-red-300 transition-colors hover:bg-crm-red/20"
                                                    title={`Eliminar reserva ${res.status}`}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}

                                            <Link
                                                href={vehicleHref}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-crm-border bg-crm-surface-raised text-crm-fg-muted no-underline transition-colors hover:bg-crm-border hover:text-crm-fg"
                                                title="Ver vehiculo"
                                            >
                                                <ChevronRight size={16} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
