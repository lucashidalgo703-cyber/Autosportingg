"use client";
import { useState } from 'react';
import Link from 'next/link';
import { vehicleDetailHref } from '../../../utils/stockNavigation.js';
import { ChevronDown, Filter, AlertTriangle, Car } from 'lucide-react';

const getVehicleYear = (vehicle) => vehicle.year || vehicle['año'] || 'S/D';
const formatNumber = (value) => Number(value || 0).toLocaleString('es-AR');
const formatMoney = (currency, value) => {
    if (!value || Number(value) <= 0) return '--';
    return `${currency || 'ARS'} ${formatNumber(value)}`;
};
const formatDate = (value) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toISOString().slice(0, 10);
};
const getLocation = (vehicle) => {
    return vehicle._original?.location || vehicle._original?.ubicacion || vehicle._original?.showroom || 'Salón Principal';
};
const getOwner = (vehicle) => {
    if (vehicle.origen === 'propio') {
        return <span className="text-green-500 font-medium">Propio</span>;
    }
    if (vehicle.origen === 'compartido') {
        const investorPct = Number(vehicle.investor?.percentage) || 0;
        if (investorPct === 100) {
            return <span className="text-purple-400 font-medium whitespace-nowrap">Inversionista 100% — participación propia 0%</span>;
        }
        if (investorPct === 50) {
            return <span className="text-blue-400 font-medium whitespace-nowrap">Compartido (50%)</span>;
        }
        return <span className="text-blue-400 font-medium whitespace-nowrap">Compartido ({investorPct}%)</span>;
    }
    if (vehicle.origen === 'tercero') {
        return <span className="text-gray-400 font-medium">Tercero</span>;
    }
    const owner = vehicle._original?.consignedBy;
    const ownerName = typeof owner === 'string' ? owner : (owner?.name || owner?.fullName || owner?.phone || '');
    return (
        <span className="text-amber-500 font-medium">
            Consigna {ownerName ? `(${ownerName})` : ''}
        </span>
    );
};
const getStatusLabel = (status) => {
    const normalized = status?.toLowerCase();
    if (normalized === 'disponible') return '✅ Disponible';
    if (normalized === 'reservado') return '⚠️ Señado';
    if (normalized === 'vendido') return '⛔ Vendido';
    if (normalized === 'pausado') return '⏳ Vendido sin confirmar';
    return status || '--';
};
const getProgress = (days) => {
    const safeDays = Number(days || 0);
    return Math.min(100, Math.max(0, Math.round((safeDays / 60) * 100)));
};
const getListValue = (data, filteredTotalUSD, filteredTotalARS, dolarBlue) => {
    const totals = filteredTotalUSD !== undefined && filteredTotalARS !== undefined
        ? { USD: filteredTotalUSD, ARS: filteredTotalARS }
        : data.reduce((acc, vehicle) => ({ ...acc, [vehicle.moneda]: (acc[vehicle.moneda] || 0) + Number(vehicle.precioPublicado || 0) }), {});
    const values = ['USD', 'ARS'].filter(currency => Number(totals[currency]) > 0).map(currency => `${currency} ${formatNumber(Math.round(totals[currency]))}`);
    return values.join(' + ') || 'Sin importes registrados';
};

export default function StockMobileCards({
    data,
    onEditML,
    onDelete,
    onPrint,
    totalItems,
    filteredTotalUSD,
    filteredTotalARS,
    dolarBlue,
    hasActiveFilters = false,
    onClearFilters = null,
    error = null,
    onRetry = null,
    onNewVehicle = null,
    showTotals = true,
    canEdit = false,
    returnTo = '/admin/stock'
}) {
    const [expandedId, setExpandedId] = useState(data[0]?.id || null);

    if (data.length === 0) {
        return (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-surface px-5 py-12 text-center">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-crm-border bg-crm-bg text-crm-fg-muted">
                    <Filter size={20} />
                </div>
                <h2 className="m-0 text-lg font-bold text-crm-fg">Sin resultados</h2>
                <p className="m-0 mt-2 text-sm leading-6 text-crm-fg-muted">
                    {hasActiveFilters ? 'No hay vehículos que coincidan con los filtros aplicados.' : 'Todavía no hay vehículos en el stock. Cargá el primero con el botón Nuevo vehículo.'}
                </p>
                {hasActiveFilters && <button type="button" onClick={onClearFilters} className="mt-3 text-sm text-crm-red">Limpiar filtros</button>}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-crm-border bg-crm-surface p-3 text-sm font-semibold text-crm-fg">
                {totalItems || data.length} {(totalItems || data.length) === 1 ? 'vehículo' : 'vehículos'} en lista
                {showTotals && <><span className="mx-1 text-crm-fg-muted">·</span><span>{getListValue(data, filteredTotalUSD, filteredTotalARS, dolarBlue)}</span></>}
            </div>

            <div className="flex flex-col gap-3">
                {data.map((vehicle) => {
                    const isExpanded = expandedId === vehicle.id;
                    const days = Number(vehicle.diasEnStock || 0);
                    const progress = getProgress(days);

                    return (
                        <article key={vehicle.id} className="overflow-hidden rounded-xl border border-crm-border bg-crm-surface">
                            <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : vehicle.id)}
                                className="m-0 flex w-full appearance-none items-center justify-between gap-3 border-0 bg-transparent px-3 py-3 text-left text-crm-fg"
                            >
                                <div className="min-w-0">
                                    <h3 className="m-0 truncate text-sm font-semibold leading-5 text-crm-fg">
                                        {vehicle.marca} {vehicle.modelo} {getVehicleYear(vehicle)}
                                    </h3>
                                    <p className="m-0 mt-1 truncate text-xs text-crm-fg-muted">
                                        {getStatusLabel(vehicle.estado)} {formatMoney(vehicle.moneda, vehicle.precioPublicado)} · {vehicle.dominio || '--'}
                                    </p>
                                </div>
                                <ChevronDown
                                    size={18}
                                    className={`shrink-0 text-crm-fg-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {isExpanded && (
                                <div className="border-t border-crm-border bg-crm-bg/40 px-3 py-3">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                        <InfoItem label="KM" value={`${formatNumber(vehicle.kilometraje)} km`} />
                                        <InfoItem label="Color" value={vehicle.color || '--'} />
                                        <InfoItem label="Cond." value={vehicle.condicion || '--'} />
                                        <InfoItem label="Ubic." value={getLocation(vehicle)} />
                                        <InfoItem label="Origen" value={getOwner(vehicle)} />
                                        <InfoItem label="Ingreso" value={formatDate(vehicle.fechaIngreso)} />
                                    </div>

                                    <div className="mt-4">
                                        <div className="flex items-center justify-between text-xs text-crm-fg">
                                            <span>{days}d / 60d</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-crm-surface">
                                            <div
                                                className="h-full rounded-full bg-crm-red"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center gap-2 border-t border-crm-border pt-3">
                                        <Link
                                            href={vehicleDetailHref(vehicle.id, returnTo)}
                                            className="inline-flex h-7 items-center justify-center rounded-lg bg-crm-red/10 px-3 text-xs font-semibold text-red-300 no-underline transition-colors hover:bg-crm-red/15"
                                        >
                                            Ver detalle
                                        </Link>
                                        {canEdit && <Link
                                            href={vehicleDetailHref(vehicle.id, returnTo, true)}
                                            className="inline-flex h-7 items-center justify-center rounded-lg bg-crm-surface-raised px-3 text-xs font-semibold text-crm-fg no-underline transition-colors hover:bg-crm-border"
                                        >
                                            Editar
                                        </Link>}
                                        <button
                                            onClick={() => onPrint && onPrint(vehicle)}
                                            className="inline-flex h-7 items-center justify-center rounded-lg bg-blue-500/10 px-3 text-xs font-semibold text-blue-400 transition-colors hover:bg-blue-500/20 ml-2 cursor-pointer"
                                        >
                                            Imprimir
                                        </button>
                                        {onEditML && <button
                                            onClick={() => onEditML && onEditML(vehicle)}
                                            className="inline-flex h-7 items-center justify-center rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 text-xs font-semibold text-yellow-500 transition-colors hover:bg-yellow-500/20 ml-auto"
                                        >
                                            ML
                                        </button>}
                                        {onDelete && <button
                                            onClick={() => onDelete && onDelete(vehicle)}
                                            className="inline-flex h-7 items-center justify-center rounded-lg bg-crm-red/10 px-3 text-xs font-semibold text-crm-red transition-colors hover:bg-crm-red/20 ml-2"
                                        >
                                            Eliminar
                                        </button>}
                                    </div>
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>
        </div>
    );
}

function InfoItem({ label, value }) {
    return (
        <div className="min-w-0 text-crm-fg-muted">
            <span className="font-semibold text-crm-fg-muted">{label}: </span>
            <span className="text-crm-fg">{value}</span>
        </div>
    );
}
