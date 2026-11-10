import React from 'react';
import Link from 'next/link';
import { Filter, ExternalLink, AlertTriangle, Car } from 'lucide-react';
import CrmTable from '../ui/CrmTable';
import { stockIsPublished } from '../../../utils/stockFilters.js';
import { vehicleDetailHref } from '../../../utils/stockNavigation.js';
import { canReserveVehicle } from '../../../utils/vehicleDetail.js';

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
        return <span className="text-green-500 font-medium bg-green-500/10 px-2 py-0.5 rounded">Propio</span>;
    }
    if (vehicle.origen === 'compartido') {
        const investorPct = Number(vehicle.investor?.percentage) || 0;
        if (investorPct === 100) {
            return <span className="text-purple-400 font-medium bg-purple-500/10 px-2 py-0.5 rounded whitespace-nowrap">Inversionista 100% — participación propia 0%</span>;
        }
        if (investorPct === 50) {
            return <span className="text-blue-400 font-medium bg-blue-500/10 px-2 py-0.5 rounded whitespace-nowrap">Compartido (50%)</span>;
        }
        return <span className="text-blue-400 font-medium bg-blue-500/10 px-2 py-0.5 rounded whitespace-nowrap">Compartido ({investorPct}%)</span>;
    }
    if (vehicle.origen === 'tercero') {
        return <span className="text-gray-400 font-medium bg-gray-500/10 px-2 py-0.5 rounded">Tercero</span>;
    }
    const owner = vehicle._original?.consignedBy;
    const ownerName = typeof owner === 'string' ? owner : (owner?.name || owner?.fullName || owner?.phone || '');
    return (
        <span className="text-amber-500 font-medium bg-amber-500/10 px-2 py-0.5 rounded">
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
const getFormattedListTotals = (filteredTotalUSD = 0, filteredTotalARS = 0, dolarBlue = null) => {
    const usd = Math.round(Number(filteredTotalUSD) || 0);
    const ars = Math.round(Number(filteredTotalARS) || 0);

    if (usd === 0 && ars === 0) return 'Sin importes registrados';

    const parts = [];
    if (usd > 0) parts.push(`USD ${formatNumber(usd)}`);
    if (ars > 0) parts.push(`ARS ${formatNumber(ars)}`);

    let result = parts.join(' + ');

    if (dolarBlue && usd > 0 && ars > 0) {
        const approxUSD = Math.round(usd + (ars / dolarBlue));
        result += ` (~ USD ${formatNumber(approxUSD)} equiv. Blue)`;
    }

    return result;
};

export default function StockTable({
    data,
    onEditML,
    onDelete,
    onPrint,
    onSwap,
    isSwapping,
    currentPage = 1,
    totalPages = 1,
    onReserve,
    totalItems,
    filteredTotalUSD,
    filteredTotalARS,
    dolarBlue,
    hasActiveFilters = false,
    onClearFilters = null,
    error = null,
    onRetry = null,
    onNewVehicle = null,
    compact = false,
    canReorder = true,
    showTotals = true,
    canEdit = false,
    returnTo = '/admin/stock'
}) {
    const columns = [
        {
            label: 'Orden',
            key: 'sortOrder',
            width: '80px',
            align: 'center',
            render: (vehicle, rowIndex) => {
                const isFirstRowOnFirstPage = currentPage === 1 && rowIndex === 0;
                const isLastRowOnLastPage = currentPage === totalPages && rowIndex === data.length - 1;

                return (
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-xs font-bold text-crm-fg-muted min-w-[20px] text-right">
                            {(currentPage - 1) * 20 + rowIndex + 1}
                        </span>
                        <div className="flex items-center justify-center gap-1">
                            <button
                                type="button"
                                disabled={isFirstRowOnFirstPage || isSwapping || !canReorder}
                                onClick={() => onSwap && onSwap(rowIndex, 'up')}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-crm-border bg-transparent text-crm-fg hover:bg-crm-surface-raised cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Subir posición"
                            >
                                ▲
                            </button>
                            <button
                                type="button"
                                disabled={isLastRowOnLastPage || isSwapping || !canReorder}
                                onClick={() => onSwap && onSwap(rowIndex, 'down')}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-crm-border bg-transparent text-crm-fg hover:bg-crm-surface-raised cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Bajar posición"
                            >
                                ▼
                            </button>
                        </div>
                    </div>
                );
            }
        },
        {
            label: 'Vehículo',
            key: 'vehicle',
            render: (vehicle) => {
                const days = Number(vehicle.diasEnStock || 0);
                const progress = getProgress(days);
                return (
                    <>
                        <Link href={vehicleDetailHref(vehicle.id, returnTo)} className="font-medium leading-5 text-crm-fg hover:text-crm-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-crm-red">
                            {vehicle.marca} {vehicle.modelo}
                        </Link>
                        <div className="mt-0.5 text-xs text-crm-fg-muted">{vehicle.color}</div>
                        <div className="mt-2">
                            <div className="flex items-center justify-between gap-2 text-xs text-crm-fg">
                                <span>{days}d / 60d</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="mt-1 h-1 overflow-hidden rounded-full bg-crm-bg">
                                <div
                                    className="h-full rounded-full bg-crm-red"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </>
                );
            }
        },
        {
            label: 'Año',
            key: 'year',
            render: (v) => getVehicleYear(v)
        },
        {
            label: 'Patente / VIN',
            key: 'plate',
            cellClassName: 'font-mono text-xs',
            render: (v) => v.dominio || '--'
        },
        {
            label: 'KM',
            key: 'km',
            render: (v) => `${formatNumber(v.kilometraje)} km`
        },
        {
            label: 'Precio',
            key: 'price',
            cellClassName: 'font-semibold',
            render: (v) => formatMoney(v.moneda, v.precioPublicado)
        },
        {
            label: 'Origen',
            key: 'owner',
            cellClassName: 'text-xs',
            render: (v) => getOwner(v)
        },
        {
            label: 'Estado',
            key: 'status',
            render: (v) => getStatusLabel(v.estado)
        },
        {
            label: 'Mercado Libre',
            key: 'ml',
            render: (v) => {
                const isPublished = stockIsPublished(v._original?.publishedOnML);
                return (
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => onEditML && onEditML(v)}>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider group-hover:ring-1 transition-all ${isPublished ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500 ring-yellow-500/50' : 'border-crm-border text-crm-fg-muted ring-crm-border'}`}>
                            {isPublished ? 'Publicado' : 'No Pub.'}
                        </span>
                        {isPublished && v._original?.mlLink && (
                            <a href={v._original.mlLink} target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:text-yellow-400" title="Ver en ML" onClick={(e) => e.stopPropagation()}>
                                <ExternalLink size={14} />
                            </a>
                        )}
                    </div>
                );
            }
        },
        {
            label: 'Ubicación',
            key: 'location',
            cellClassName: 'text-xs text-crm-fg-muted',
            render: (v) => getLocation(v)
        },
        {
            label: 'Ingreso',
            key: 'date',
            cellClassName: 'text-xs text-crm-fg-muted',
            render: (v) => formatDate(v.fechaIngreso)
        },
        {
            label: 'Acciones',
            key: 'actions',
            render: (vehicle) => (
                <div className="flex items-center gap-2">
                    {canEdit && <Link
                        href={vehicleDetailHref(vehicle.id, returnTo, true)}
                        className="inline-flex h-8 items-center rounded-lg border border-transparent bg-transparent px-2 text-xs font-semibold text-crm-fg no-underline transition-colors hover:bg-crm-surface-raised"
                    >
                        Editar
                    </Link>}
                    <button
                        type="button"
                        onClick={() => onPrint && onPrint(vehicle)}
                        className="m-0 h-8 appearance-none rounded-lg border border-transparent bg-transparent px-2 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:bg-crm-surface-raised cursor-pointer"
                    >
                        Imprimir
                    </button>
                    {onReserve && <button
                        type="button"
                        onClick={() => onReserve && onReserve(vehicle)}
                        disabled={!canReserveVehicle(vehicle)}
                        className="m-0 h-8 appearance-none rounded-lg border border-transparent bg-transparent px-2 text-xs font-semibold text-crm-fg transition-colors hover:bg-crm-surface-raised cursor-pointer"
                    >
                        Señar
                    </button>}
                    {onDelete && <button
                        type="button"
                        onClick={() => onDelete && onDelete(vehicle)}
                        className="m-0 h-8 appearance-none rounded-lg border border-transparent bg-transparent px-2 text-xs font-semibold text-crm-red transition-colors hover:bg-crm-red/10 cursor-pointer"
                    >
                        Eliminar
                    </button>}
                </div>
            )
        }
    ];

        let emptyIcon = Filter;
    let emptyTitle = "Sin resultados";
    let emptyMessage = "Todavía no hay vehículos en el stock. Cargá el primero con el botón Nuevo vehículo.";
    let emptyAction = null;

    if (error) {
        emptyIcon = AlertTriangle;
        emptyTitle = "Error al cargar el stock";
        emptyMessage = typeof error === 'string' ? error : "Ocurrió un problema al obtener los vehículos.";
        if (onRetry) {
            emptyAction = (
                <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 rounded-lg border border-crm-red/30 bg-crm-red/10 px-4 py-2 text-sm font-semibold text-crm-red hover:bg-crm-red/20 transition-colors"
                >
                    Reintentar
                </button>
            );
        }
    } else if (hasActiveFilters) {
        emptyIcon = Filter;
        emptyTitle = "Sin coincidencias";
        emptyMessage = "No se encontraron vehículos que coincidan con la búsqueda o filtros aplicados.";
        if (onClearFilters) {
            emptyAction = (
                <button
                    type="button"
                    onClick={onClearFilters}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-crm-border bg-crm-bg px-4 py-2 text-sm font-semibold text-crm-fg hover:bg-crm-surface-hover transition-colors"
                >
                    Limpiar filtros
                </button>
            );
        }
    } else {
        emptyIcon = Car;
        emptyTitle = "Inventario vacío";
        emptyMessage = "Todavía no hay vehículos registrados en el stock.";
        if (onNewVehicle) {
            emptyAction = (
                <button
                    type="button"
                    onClick={onNewVehicle}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-crm-red text-white px-4 py-2 text-sm font-semibold hover:bg-crm-red-hover transition-colors shadow-crm-shadow-red"
                >
                    Nuevo vehículo
                </button>
            );
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-crm-border bg-crm-surface p-3 text-xs font-semibold text-crm-fg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-crm-fg-muted">Resultado filtrado:</span>
                    <strong className="text-white font-bold">{totalItems !== undefined ? totalItems : data.length} {(totalItems !== undefined ? totalItems : data.length) === 1 ? 'vehículo' : 'vehículos'}</strong>
                    {totalPages > 1 && (
                        <span className="text-[11px] text-crm-fg-muted">(Página {currentPage} de {totalPages})</span>
                    )}
                </div>
                {showTotals && <div className="flex items-center gap-1.5">
                    <span className="text-crm-fg-muted">Valor de venta filtrado:</span>
                    <strong className="font-mono text-emerald-400">
                        {getFormattedListTotals(filteredTotalUSD, filteredTotalARS, dolarBlue)}
                    </strong>
                </div>}
            </div>

            <CrmTable
                data={data}
                columns={compact ? columns.filter(column => ['sortOrder', 'vehicle', 'price', 'owner', 'status', 'actions'].includes(column.key)) : columns}
                emptyIcon={emptyIcon}
                emptyTitle={emptyTitle}
                emptyMessage={emptyMessage}
                emptyAction={emptyAction}
                minWidth={compact ? 'min-w-[820px]' : 'min-w-[1080px]'}
            />
        </div>
    );
}
