"use client";
import Link from 'next/link';
import { Filter } from 'lucide-react';

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
    if (data.length === 0) {
        return (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-surface px-6 py-16 text-center">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-crm-border bg-crm-bg text-crm-fg-muted">
                    <Filter size={20} />
                </div>
                <h2 className="m-0 text-lg font-bold text-crm-fg">Sin resultados</h2>
                <p className="m-0 mt-2 max-w-md text-sm leading-6 text-crm-fg-muted">
                    Todavía no hay vehículos en el stock. Cargá el primero con el botón Nuevo vehículo.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-crm-border bg-crm-surface p-3 text-sm font-semibold text-crm-fg">
                {data.length} {data.length === 1 ? 'vehículo' : 'vehículos'} en lista
                <span className="mx-1 text-crm-fg-muted">·</span>
                <span>{getListValue(data)}</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-crm-border bg-crm-surface">
                <table className="w-full min-w-[1080px] border-collapse text-left">
                    <thead className="bg-crm-surface-raised text-xs uppercase text-crm-fg-muted">
                        <tr>
                            <th className="px-3 py-2 font-semibold">Vehículo</th>
                            <th className="px-3 py-2 font-semibold">Año</th>
                            <th className="px-3 py-2 font-semibold">Patente / VIN</th>
                            <th className="px-3 py-2 font-semibold">KM</th>
                            <th className="px-3 py-2 font-semibold">Precio</th>
                            <th className="px-3 py-2 font-semibold">Consig.</th>
                            <th className="px-3 py-2 font-semibold">Estado</th>
                            <th className="px-3 py-2 font-semibold">Ubicación</th>
                            <th className="px-3 py-2 font-semibold">Ingreso</th>
                            <th className="px-3 py-2 font-semibold">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border">
                        {data.map((vehicle) => {
                            const days = Number(vehicle.diasEnStock || 0);
                            const progress = getProgress(days);

                            return (
                                <tr key={vehicle.id} className="h-[85px] text-sm text-crm-fg transition-colors hover:bg-crm-surface-raised/70">
                                    <td className="px-3 py-2 align-middle">
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
                                    </td>
                                    <td className="px-3 py-2 align-middle">{getVehicleYear(vehicle)}</td>
                                    <td className="px-3 py-2 align-middle font-mono text-xs">{vehicle.dominio || '--'}</td>
                                    <td className="px-3 py-2 align-middle">{formatNumber(vehicle.kilometraje)} km</td>
                                    <td className="px-3 py-2 align-middle font-semibold">{formatMoney(vehicle.moneda, vehicle.precioPublicado)}</td>
                                    <td className="px-3 py-2 align-middle text-xs text-crm-fg-muted">{getOwner(vehicle)}</td>
                                    <td className="px-3 py-2 align-middle">{getStatusLabel(vehicle.estado)}</td>
                                    <td className="px-3 py-2 align-middle text-xs text-crm-fg-muted">{getLocation(vehicle)}</td>
                                    <td className="px-3 py-2 align-middle text-xs text-crm-fg-muted">{formatDate(vehicle.fechaIngreso)}</td>
                                    <td className="px-3 py-2 align-middle">
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
