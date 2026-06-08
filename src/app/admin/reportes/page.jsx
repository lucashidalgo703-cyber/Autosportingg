"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock3, Trophy } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useAdminSales } from '../../../hooks/useAdminSales';
import { useAdminCars } from '../../../hooks/useAdminCars';
import { useAdminLeads } from '../../../hooks/useAdminLeads';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const normalizeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const isSameMonth = (value, baseDate) => {
    const date = normalizeDate(value);
    if (!date) return false;
    return date.getMonth() === baseDate.getMonth() && date.getFullYear() === baseDate.getFullYear();
};

const getPersonName = (value, fallback = 'AutoSporting') => {
    if (!value) return fallback;
    if (typeof value === 'string') return value || fallback;
    return value.name || value.username || value.email || value.fullName || fallback;
};

const getClientName = (sale) => {
    const client = sale?.clientId || sale?.client || {};
    if (typeof client === 'string') return client;
    return client.fullName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.name || 'Sin cliente';
};

const getSaleUser = (sale) => (
    sale.salesperson ||
    getPersonName(sale.assignedTo, '') ||
    getPersonName(sale.createdBy, '') ||
    sale.user ||
    'Equipo AutoSporting'
);

const formatMonthTitle = (date) => `${MONTHS[date.getMonth()]} De ${date.getFullYear()}`;

const formatUsd = (value) => {
    const number = Number(value || 0);
    return `USD ${number.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
};

const groupBy = (items, getKey) => {
    return items.reduce((acc, item) => {
        const key = getKey(item) || 'Sin datos';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
};

const sortedEntries = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);

function EmptyText({ children = 'Sin datos.' }) {
    return <p className="m-0 text-sm font-medium text-zinc-500">{children}</p>;
}

function AnalysisCard({ title, children }) {
    return (
        <section className="min-h-[86px] rounded-xl border border-[#33333a] bg-[#1e1e24] p-4">
            <h3 className="m-0 mb-3 text-sm font-bold leading-5 text-white">{title}</h3>
            {children}
        </section>
    );
}

function CompactBars({ rows, accent = 'bg-[#6d5dfc]' }) {
    const max = rows.reduce((acc, row) => Math.max(acc, row.value), 0);

    if (!rows.length || max === 0) return <EmptyText />;

    return (
        <div className="space-y-2">
            {rows.slice(0, 10).map((row) => (
                <div key={row.label} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate text-zinc-400">{row.label}</span>
                        <span className="shrink-0 font-bold text-white">{row.display || row.value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#101013]">
                        <div
                            className={`h-full rounded-full ${accent}`}
                            style={{ width: `${Math.max(6, Math.round((row.value / max) * 100))}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

function ReportesPageInner() {
    const { user } = useAuth();
    const { fetchSales } = useAdminSales();
    const { refresh: fetchCars } = useAdminCars();
    const { leads, fetchLeads } = useAdminLeads();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState({
        sales: [],
        cars: []
    });

    useEffect(() => {
        const loadReportData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [salesData, carsData] = await Promise.all([
                    fetchSales(),
                    fetchCars(),
                    fetchLeads({ limit: 1000 })
                ]);

                setData({
                    sales: Array.isArray(salesData) ? salesData : [],
                    cars: Array.isArray(carsData) ? carsData : []
                });
            } catch (err) {
                console.error('Error loading reports data:', err);
                setError('No se pudieron cargar los datos de reportes.');
            } finally {
                setLoading(false);
            }
        };

        loadReportData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const today = useMemo(() => new Date(), []);
    const report = useMemo(() => {
        const sales = data.sales || [];
        const cars = data.cars || [];
        const leadItems = Array.isArray(leads) ? leads : [];
        const currentMonthSales = sales.filter((sale) => isSameMonth(sale.saleDate || sale.createdAt, today));
        const validMonthSales = currentMonthSales.filter((sale) => !['cancelada', 'borrador'].includes(String(sale.status || '').toLowerCase()));
        const currentMonthCars = cars.filter((car) => isSameMonth(car.createdAt || car.updatedAt, today));
        const consignments = currentMonthCars.filter((car) => {
            const origin = String(car.origen || car.origin || car.source || car.purchaseType || '').toLowerCase();
            return origin.includes('consig') || car.consignedBy;
        }).length;

        const salesByMonth = {};
        sales
            .filter((sale) => sale.saleCurrency === 'USD' && !['cancelada', 'borrador'].includes(String(sale.status || '').toLowerCase()))
            .forEach((sale) => {
                const date = normalizeDate(sale.saleDate || sale.createdAt);
                if (!date) return;
                const label = `${MONTHS[date.getMonth()].slice(0, 3).toUpperCase()} ${String(date.getFullYear()).slice(-2)}`;
                salesByMonth[label] = (salesByMonth[label] || 0) + Number(sale.salePrice || 0);
            });

        const operationsBySeller = {};
        sales
            .filter((sale) => !['cancelada', 'borrador'].includes(String(sale.status || '').toLowerCase()))
            .forEach((sale) => {
                const seller = getSaleUser(sale);
                operationsBySeller[seller] = (operationsBySeller[seller] || 0) + 1;
            });

        const leadOrigins = groupBy(leadItems, (lead) => lead.source || lead.sourceDetail || 'Sin origen');
        const clientsByUsd = {};
        sales
            .filter((sale) => sale.saleCurrency === 'USD' && !['cancelada', 'borrador'].includes(String(sale.status || '').toLowerCase()))
            .forEach((sale) => {
                const client = getClientName(sale);
                clientsByUsd[client] = (clientsByUsd[client] || 0) + Number(sale.salePrice || 0);
            });

        const stockByStatus = [
            {
                label: 'Disponibles',
                color: 'bg-emerald-500',
                value: cars.filter((car) => ['disponible', 'publicado', 'activo'].includes(String(car.status || '').toLowerCase())).length
            },
            {
                label: 'Reservados / Senados',
                color: 'bg-amber-500',
                value: cars.filter((car) => ['reservado', 'senado', 'señado'].includes(String(car.status || '').toLowerCase())).length
            },
            {
                label: 'Vendidos',
                color: 'bg-violet-500',
                value: cars.filter((car) => String(car.status || '').toLowerCase() === 'vendido').length
            },
            {
                label: 'En prep.',
                color: 'bg-sky-500',
                value: cars.filter((car) => ['preparacion', 'en preparacion', 'preparando'].includes(String(car.status || '').toLowerCase())).length
            }
        ];

        const stockByBrand = sortedEntries(groupBy(cars, (car) => car.brand || 'Sin marca'))
            .map(([label, value]) => ({ label, value }));

        return {
            currentMonthSales: validMonthSales.length,
            consignments,
            salesByMonth: sortedEntries(salesByMonth).map(([label, value]) => ({ label, value, display: formatUsd(value) })),
            operationsBySeller: sortedEntries(operationsBySeller).map(([label, value]) => ({ label, value })),
            leadOrigins: sortedEntries(leadOrigins).map(([label, value]) => ({ label, value })),
            topClients: sortedEntries(clientsByUsd).map(([label, value]) => ({ label, value, display: formatUsd(value) })),
            stockByStatus,
            stockByBrand
        };
    }, [data, leads, today]);

    if (loading) {
        return (
            <div className="flex h-72 items-center justify-center font-sans text-xs font-bold uppercase tracking-wider text-zinc-500">
                Cargando reportes...
            </div>
        );
    }

    const userName = user?.name || user?.username || (user?.email ? user.email.split('@')[0] : 'Equipo');
    const monthTitle = formatMonthTitle(today);

    return (
        <div className="mx-auto w-full max-w-[960px] space-y-6 px-4 pb-24 pt-6 font-sans text-[#f4f4f5] animate-in fade-in duration-300 md:px-6 md:pt-7">
            <header>
                <h1 className="m-0 flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
                    <BarChart3 size={24} />
                    Reportes y Analisis
                </h1>
                <p className="m-0 mt-1 text-sm font-medium text-zinc-400">Vista completa - todos los modulos.</p>
            </header>

            {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-200">
                    {error}
                </div>
            )}

            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3d2aa8] via-[#5847cd] to-[#3222a4] p-4 shadow-[0_18px_60px_rgba(91,74,214,0.22)]">
                <Trophy size={28} className="absolute right-5 top-5 text-white" />
                <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-white/55">Competencia del mes</p>
                <h2 className="m-0 mt-1 text-xl font-bold text-white">{monthTitle}</h2>

                <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-white/10">
                    <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-2 px-4 py-3 text-[11px] font-black uppercase tracking-wider text-white/55">
                        <span>Vendedor</span>
                        <span className="text-center">Ventas mes</span>
                        <span className="text-center">Consig. mes</span>
                        <span className="text-center">Bono</span>
                    </div>
                    <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] items-center gap-2 bg-white/10 px-4 py-4 text-sm font-bold text-white">
                        <span className="truncate text-yellow-200">🏅 {userName} (vos)</span>
                        <span className="text-center text-2xl">{report.currentMonthSales}</span>
                        <span className="text-center text-2xl">{report.consignments}</span>
                        <span className="text-center text-xs font-semibold text-white/70">5 para USD 300</span>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                        ['🥉', 'USD 300', '5 consig.'],
                        ['🥈', 'USD 500', '8 consig.'],
                        ['🏆', 'USD 1000', '12 consig.']
                    ].map(([icon, amount, detail]) => (
                        <div key={amount} className="rounded-xl bg-white/10 p-4 text-center">
                            <div className="text-xl">{icon}</div>
                            <div className="mt-1 text-base font-black text-white">{amount}</div>
                            <div className="text-xs font-semibold text-white/55">{detail}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#075f77] via-[#0b6d86] to-[#075466] p-4 shadow-[0_18px_50px_rgba(8,113,135,0.18)]">
                <Clock3 size={28} className="absolute right-5 top-5 text-white" />
                <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-white/55">Ranking de velocidad</p>
                <h2 className="m-0 mt-1 text-xl font-bold text-white">{monthTitle}</h2>
                <p className="m-0 mt-4 text-sm font-semibold text-white/85">
                    {report.leadOrigins.length ? `${report.leadOrigins.reduce((acc, row) => acc + row.value, 0)} cotizaciones cargadas este mes.` : 'Sin leads asignados este mes.'}
                </p>
            </section>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AnalysisCard title="Volumen de Ventas por Mes (USD)">
                    <CompactBars rows={report.salesByMonth.slice(-6)} />
                </AnalysisCard>

                <AnalysisCard title="Operaciones por Vendedor">
                    <CompactBars rows={report.operationsBySeller} accent="bg-emerald-500" />
                </AnalysisCard>

                <AnalysisCard title="Origen de Leads">
                    <CompactBars rows={report.leadOrigins} accent="bg-sky-500" />
                </AnalysisCard>

                <AnalysisCard title="Top 10 Clientes (USD)">
                    <CompactBars rows={report.topClients} accent="bg-amber-500" />
                </AnalysisCard>

                <AnalysisCard title="Stock por Estado">
                    <div className="space-y-2">
                        {report.stockByStatus.map((row) => (
                            <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                                <span className="flex min-w-0 items-center gap-2 text-zinc-400">
                                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.color}`} />
                                    <span className="truncate">{row.label}</span>
                                </span>
                                <span className="font-bold text-white">{row.value}</span>
                            </div>
                        ))}
                    </div>
                </AnalysisCard>

                <AnalysisCard title="Stock por Marca">
                    <CompactBars rows={report.stockByBrand} />
                </AnalysisCard>
            </div>
        </div>
    );
}

export default function ReportesPage() {
    return (
        <PermissionGuard permission={PERMISSIONS.REPORTES_READ}>
            <ReportesPageInner />
        </PermissionGuard>
    );
}
