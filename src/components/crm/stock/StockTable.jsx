import React from 'react';
import Link from 'next/link';
import { Filter } from 'lucide-react';
import CrmTable from '../ui/CrmTable';

const getVehicleYear = (vehicle) => vehicle.year || vehicle['año'] || vehicle['aÃ±o'] || 'S/D';
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
    if (!(vehicle.origen || '').toLowerCase().includes('consign')) return '--';
    const owner = vehicle._original?.consignedBy;
    if (!owner) return 'Consignado';
    if (typeof owner === 'string') return owner;
    return owner.name || owner.fullName || owner.phone || 'Consignado';
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
const getListValue = (data) => {
    const totals = data.reduce((acc, vehicle) => {
        const currency = vehicle.moneda || 'ARS';
        acc[currency] = (acc[currency] || 0) + Number(vehicle.precioPublicado || 0);
        return acc;
    }, {});

    if (totals.USD > 0) return `USD ${formatNumber(totals.USD)}`;
    if (totals.ARS > 0) return `ARS ${formatNumber(totals.ARS)}`;
    return '--';
};

export default function StockTable({ data }) {
    const columns = [
        {
            label: 'Vehículo',
            key: 'vehicle',
            render: (vehicle) => {
                const days = Number(vehicle.diasEnStock || 0);
                const progress = getProgress(days);
                return (
                    <>
                        <div className="font-medium leading-5 text-crm-fg">
                            {vehicle.marca} {vehicle.modelo}
                        </div>
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
            label: 'Consig.',
            key: 'owner',
            cellClassName: 'text-xs text-crm-fg-muted',
            render: (v) => getOwner(v)
        },
        {
            label: 'Estado',
            key: 'status',
            render: (v) => getStatusLabel(v.estado)
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
                    <Link
                        href={`/admin/stock/${vehicle.id}`}
                        className="inline-flex h-8 items-center rounded-lg border border-transparent bg-transparent px-2 text-xs font-semibold text-crm-fg no-underline transition-colors hover:bg-crm-surface-raised"
                    >
                        Editar
                    </Link>
                    <button
                        type="button"
                        className="m-0 h-8 appearance-none rounded-lg border border-transparent bg-transparent px-2 text-xs font-semibold text-crm-fg transition-colors hover:bg-crm-surface-raised"
                    >
                        Señar
                    </button>
                    <button
                        type="button"
                        className="m-0 h-8 appearance-none rounded-lg border border-transparent bg-transparent px-2 text-xs font-semibold text-crm-red transition-colors hover:bg-crm-red/10"
                    >
                        Eliminar
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="flex flex-col gap-4">
            {data.length > 0 && (
                <div className="rounded-xl border border-crm-border bg-crm-surface p-3 text-sm font-semibold text-crm-fg">
                    {data.length} {data.length === 1 ? 'vehículo' : 'vehículos'} en lista
                    <span className="mx-1 text-crm-fg-muted">·</span>
                    <span>{getListValue(data)}</span>
                </div>
            )}
            
            <CrmTable 
                data={data}
                columns={columns}
                emptyIcon={Filter}
                emptyTitle="Sin resultados"
                emptyMessage="Todavía no hay vehículos en el stock. Cargá el primero con el botón Nuevo vehículo."
                minWidth="min-w-[1080px]"
            />
        </div>
    );
}
