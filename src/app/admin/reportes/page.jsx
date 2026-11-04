"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock3, Trophy } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useAdminLeads } from '../../../hooks/useAdminLeads';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';
import LoadingSkeleton from '../../../components/crm/ui/LoadingSkeleton';

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
    return client.fullName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.name || sale?.buyerName || sale?.clientName || 'Sin cliente';
};

const getSaleUser = (sale) => (
    sale.salesperson ||
    getPersonName(sale.assignedTo, '') ||
    getPersonName(sale.createdBy, '') ||
    sale.user ||
    'Equipo AutoSporting'
);

const formatMonthTitle = (date) => `${MONTHS[date.getMonth()]} De ${date.getFullYear()}`;

const formatCurrencyAmount = (value, currency = 'ARS') => {
    const number = Number(value || 0);
    if (currency === 'USD') {
        return `USD ${number.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
    }
    return `$ ${number.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
};

const formatUsd = (value) => formatCurrencyAmount(value, 'USD');

const groupBy = (items, getKey) => {
    return items.reduce((acc, item) => {
        const key = getKey(item) || 'Sin datos';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
};

const sortedEntries = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);

function EmptyText({ children = 'Sin datos.' }) {
    return <p className="m-0 text-sm text-zinc-500">{children}</p>;
}

function AnalysisCard({ title, children }) {
    return (
        <div className="rounded-xl border border-crm-border bg-crm-surface p-3 sm:p-4">
            <h3 className="m-0 mb-3 text-sm font-bold leading-5 text-white">{title}</h3>
            {children}
        </div>
    );
}

function CompactBars({ rows, accent = 'bg-purple-600' }) {
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
                    <div className="h-2 overflow-hidden rounded-full bg-crm-bg">
                        <div
                            className={`h-full rounded-full ${accent}`}
                            style={{ width: row.value > 0 ? `${Math.max(6, Math.round((row.value / max) * 100))}%` : '0%' }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

async function fetchCarsPaginated(pageSize = 50) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    let allCars = [];
    let page = 1;
    let totalPages = 1;

    do {
        const response = await fetch(`/api/admin/cars?page=${page}&limit=${pageSize}`, { headers });
        if (!response.ok) {
            throw new Error(`Error al consultar inventario de vehículos (código HTTP: ${response.status})`);
        }
        const data = await response.json();
        const pageCars = Array.isArray(data.cars) ? data.cars : [];
        allCars = allCars.concat(pageCars);
        totalPages = data.pages || (data.total ? Math.ceil(data.total / pageSize) : 1) || 1;
        page++;
    } while (page <= totalPages);

    return allCars;
}

function ReportesPageInner() {
    const { user } = useAuth();
    const { leads, fetchLeads } = useAdminLeads();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [carsError, setCarsError] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState('ARS');
    const [data, setData] = useState({
        sales: [],
        cars: []
    });

    const loadReportData = async () => {
        setLoading(true);
        setError(null);
        setCarsError(false);

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const [salesRes, carsArray, leadsData] = await Promise.all([
                fetch('/api/admin/sales', { headers }),
                fetchCarsPaginated(50).catch((err) => {
                    console.error('Error loading cars inventory in reports:', err);
                    setCarsError(true);
                    return [];
                }),
                fetchLeads({ limit: 1000 }).catch((err) => {
                    console.error('Error loading leads:', err);
                    return [];
                })
            ]);

            if (!salesRes.ok) {
                throw new Error(`Error al cargar ventas (${salesRes.status})`);
            }
            const salesData = await salesRes.json();

            const salesArray = Array.isArray(salesData) ? salesData : (salesData?.sales || []);

            setData({
                sales: salesArray,
                cars: carsArray
            });
        } catch (err) {
            console.error('Error loading reports data:', err);
            setError('No se pudieron cargar los datos de reportes.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReportData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const today = useMemo(() => new Date(), []);
    const report = useMemo(() => {
        const sales = data.sales || [];
        const cars = carsError ? [] : (data.cars || []);
        const leadItems = Array.isArray(leads) ? leads : [];
        const currentMonthSales = sales.filter((sale) => isSameMonth(sale.saleDate || sale.createdAt, today));
        const validSales = sales.filter((sale) => !['cancelada', 'borrador'].includes(String(sale.status || '').toLowerCase()));
        const validMonthSales = currentMonthSales.filter((sale) => !['cancelada', 'borrador'].includes(String(sale.status || '').toLowerCase()));
        const currentMonthCars = cars.filter((car) => isSameMonth(car.createdAt || car.updatedAt, today));
        const consignments = currentMonthCars.filter((car) => {
            const origin = String(car.origen || car.origin || car.source || car.purchaseType || '').toLowerCase();
            return origin.includes('consig') || car.consignedBy;
        }).length;

        const normalizeCurrency = (curr) => {
            const upper = String(curr || '').toUpperCase().trim();
            if (upper === 'USD' || upper === 'U$S') return 'USD';
            return 'ARS';
        };

        const otherCurrency = selectedCurrency === 'ARS' ? 'USD' : 'ARS';
        const hasOperationsInOtherCurrency = validSales.some((s) => normalizeCurrency(s.saleCurrency) === otherCurrency);
        const salesInSelectedCurrency = validSales.filter((s) => normalizeCurrency(s.saleCurrency) === selectedCurrency);

        // Seis meses calendario en orden cronológico estricto (desde hace 5 meses hasta el mes actual)
        const sixCalendarMonths = Array.from({ length: 6 }).map((_, i) => {
            const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
            const y = d.getFullYear();
            const m = d.getMonth();
            const start = new Date(y, m, 1, 0, 0, 0, 0);
            const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
            const label = `${MONTHS[m].slice(0, 3).toUpperCase()} ${String(y).slice(-2)}`;
            return {
                label,
                start,
                end,
                value: 0
            };
        });

        salesInSelectedCurrency.forEach((sale) => {
            const date = normalizeDate(sale.saleDate || sale.createdAt);
            if (!date) return;
            const bucket = sixCalendarMonths.find((b) => date >= b.start && date <= b.end);
            if (bucket) {
                bucket.value += Number(sale.salePrice || 0);
            }
        });

        const salesByMonth = sixCalendarMonths.map((b) => ({
            label: b.label,
            value: b.value,
            display: formatCurrencyAmount(b.value, selectedCurrency)
        }));

        // Estado vacío del gráfico calculado según las ventas de los SEIS MESES VISIBLES
        const hasSalesInVisibleMonths = sixCalendarMonths.some((b) => b.value > 0);
        const hasSalesPriorToVisiblePeriod = salesInSelectedCurrency.some((sale) => {
            const date = normalizeDate(sale.saleDate || sale.createdAt);
            return date && date < sixCalendarMonths[0].start;
        });

        // Vendedores:
        // 1. Identificar todos los vendedores que tienen un ID explícito
        const nameToIds = new Map();
        validSales.forEach((sale) => {
            const sellerId = sale.assignedTo?._id
                ? String(sale.assignedTo._id)
                : (typeof sale.assignedTo === 'string' && /^[0-9a-fA-F]{24}$/.test(sale.assignedTo) ? sale.assignedTo : null);
            const rawSeller = getSaleUser(sale).trim();
            const normKey = rawSeller.toLowerCase();
            if (sellerId) {
                if (!nameToIds.has(normKey)) nameToIds.set(normKey, new Set());
                nameToIds.get(normKey).add(sellerId);
            }
        });

        // 2. Agrupar uniendo registros legados solo cuando haya coincidencia inequívoca y manteniendo homónimos con IDs separados
        const sellerStats = {};
        validSales.forEach((sale) => {
            const rawSeller = getSaleUser(sale).trim();
            const normKey = rawSeller.toLowerCase();
            const explicitId = sale.assignedTo?._id
                ? String(sale.assignedTo._id)
                : (typeof sale.assignedTo === 'string' && /^[0-9a-fA-F]{24}$/.test(sale.assignedTo) ? sale.assignedTo : null);

            let finalKey;
            if (explicitId) {
                // Vendedor con ID: clave única por ID para mantener separados a homónimos
                finalKey = `id:${explicitId}`;
            } else {
                // Registro legado sin ID
                const matchedIds = nameToIds.get(normKey);
                if (matchedIds && matchedIds.size === 1) {
                    // Coincidencia inequívoca: se une al vendedor con ID
                    const singleId = Array.from(matchedIds)[0];
                    finalKey = `id:${singleId}`;
                } else {
                    // Sin ID o sin coincidencia inequívoca
                    finalKey = `legacy:${normKey}`;
                }
            }

            if (!sellerStats[finalKey]) {
                sellerStats[finalKey] = {
                    displayName: rawSeller,
                    count: 0
                };
            } else {
                const currentName = sellerStats[finalKey].displayName;
                if (currentName === currentName.toLowerCase() && rawSeller !== rawSeller.toLowerCase()) {
                    sellerStats[finalKey].displayName = rawSeller;
                }
            }
            sellerStats[finalKey].count += 1;
        });

        const operationsBySeller = Object.values(sellerStats)
            .map((item) => ({ label: item.displayName, value: item.count }))
            .sort((a, b) => b.value - a.value);

        const currentMonthLeads = leadItems.filter((lead) => isSameMonth(lead.createdAt || lead.updatedAt, today));
        const leadOrigins = groupBy(currentMonthLeads, (lead) => lead.source || lead.sourceDetail || 'Sin origen');

        const clientsByCurrency = {};
        salesInSelectedCurrency.forEach((sale) => {
            const client = getClientName(sale);
            clientsByCurrency[client] = (clientsByCurrency[client] || 0) + Number(sale.salePrice || 0);
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
            salesByMonth,
            hasSalesInVisibleMonths,
            hasSalesPriorToVisiblePeriod,
            hasSalesInSelectedCurrency: salesInSelectedCurrency.length > 0,
            hasOperationsInOtherCurrency,
            otherCurrency,
            operationsBySeller,
            leadOrigins: sortedEntries(leadOrigins).map(([label, value]) => ({ label, value })),
            currentMonthLeads: currentMonthLeads.length,
            topClients: sortedEntries(clientsByCurrency).map(([label, value]) => ({
                label,
                value,
                display: formatCurrencyAmount(value, selectedCurrency)
            })),
            stockByStatus,
            stockByBrand,
            totalCars: cars.length
        };
    }, [data, leads, today, selectedCurrency]);

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-7xl px-3 py-5 pb-24 font-sans sm:px-4 sm:py-6">
                <header className="mb-4">
                    <LoadingSkeleton className="h-8 w-48 mb-2" />
                    <LoadingSkeleton className="h-4 w-64" />
                </header>

                <LoadingSkeleton className="h-32 w-full mb-6 rounded-2xl" />
                <LoadingSkeleton className="h-24 w-full mb-6 rounded-2xl" />

                <div className="grid gap-4 md:grid-cols-2 mb-6">
                    <LoadingSkeleton className="h-48 w-full rounded-xl" />
                    <LoadingSkeleton className="h-48 w-full rounded-xl" />
                </div>

                <div className="grid gap-4 md:grid-cols-2 mb-6">
                    <LoadingSkeleton className="h-48 w-full rounded-xl" />
                    <LoadingSkeleton className="h-48 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    const userName = user?.name || user?.username || (user?.email ? user.email.split('@')[0] : 'Equipo');
    const monthTitle = formatMonthTitle(today);

    return (
        <div className="mx-auto w-full max-w-7xl px-3 py-5 pb-24 font-sans text-white animate-in fade-in duration-300 sm:px-4 sm:py-6">
            <header className="mb-4">
                <h1 className="m-0 flex items-center gap-2 text-2xl font-bold leading-8 tracking-tight text-white">
                    <BarChart3 size={24} />
                    Reportes y Análisis
                </h1>
                <p className="m-0 mt-1 text-sm font-medium text-zinc-400">Vista completa — todos los módulos.</p>
            </header>

            {error && (
                <div className="mb-6 rounded-xl border border-red-500/20 bg-crm-red/10 p-4 flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-red-200">{error}</span>
                    <button
                        onClick={loadReportData}
                        className="rounded-lg bg-crm-red px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-500 transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            <section className="mb-6 rounded-2xl bg-gradient-to-br from-indigo-900 to-indigo-700 p-4 text-white">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-300">Competencia del mes</div>
                        <div className="text-lg font-bold capitalize">{MONTHS[today.getMonth()].toLowerCase()} de {today.getFullYear()}</div>
                    </div>
                    <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>

                <div className="overflow-x-auto rounded-xl bg-white/10">
                    <div className="grid min-w-[440px] grid-cols-5 gap-0 border-b border-crm-border px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                        <div className="col-span-2">Vendedor</div>
                        <div className="text-center">Ventas mes</div>
                        <div className="text-center">Consig. mes</div>
                        <div className="text-center">Bono</div>
                    </div>
                    <div className="grid min-w-[440px] grid-cols-5 gap-0 border-b border-crm-border bg-white/15 px-3 py-2.5 last:border-0">
                        <div className="col-span-2 flex items-center gap-2">
                            <span>🥇</span>
                            <span className="truncate text-sm font-bold text-amber-300">{userName} (vos)</span>
                        </div>
                        <div className="text-center text-base font-bold sm:text-xl">{report.currentMonthSales}</div>
                        <div className="text-center">{carsError ? '-' : report.consignments}</div>
                        <div className="text-center text-[11px]">
                            <span className="text-indigo-300">5 para USD 300</span>
                        </div>
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                        ['🥉', 'USD 300', '5 consig.'],
                        ['🥈', 'USD 500', '8 consig.'],
                        ['🏆', 'USD 1000', '12 consig.']
                    ].map(([icon, amount, detail]) => (
                        <div key={amount} className="rounded-xl bg-white/10 p-2 text-center">
                            <div className="text-base">{icon}</div>
                            <div className="text-sm font-bold">{amount}</div>
                            <div className="text-[10px] text-indigo-300">{detail}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mb-6 rounded-2xl bg-gradient-to-br from-sky-900 to-cyan-800 p-4 text-white">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-widest text-cyan-200">Ranking de velocidad</div>
                        <div className="text-lg font-bold capitalize">{MONTHS[today.getMonth()].toLowerCase()} de {today.getFullYear()}</div>
                    </div>
                    <Clock3 className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <p className="m-0 text-sm font-semibold text-white/90">
                    {report.currentMonthLeads ? `${report.currentMonthLeads} cotizaciones cargadas este mes.` : 'Sin leads asignados este mes.'}
                </p>
            </section>

            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-crm-border bg-crm-surface p-3 text-xs">
                <div>
                    <span className="font-bold text-white">Moneda de análisis:</span>
                    <span className="ml-2 text-zinc-400">Operaciones en moneda original de cada transacción (sin conversión)</span>
                </div>
                <div className="inline-flex rounded-lg border border-crm-border bg-crm-bg p-0.5">
                    <button
                        type="button"
                        onClick={() => setSelectedCurrency('ARS')}
                        className={`rounded-md px-3 py-1 font-bold transition-colors ${selectedCurrency === 'ARS' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    >
                        ARS ($)
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedCurrency('USD')}
                        className={`rounded-md px-3 py-1 font-bold transition-colors ${selectedCurrency === 'USD' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    >
                        USD
                    </button>
                </div>
            </div>

            <section className="mb-6 grid gap-4 md:grid-cols-2">
                <AnalysisCard title={`Volumen de Ventas por Mes (${selectedCurrency})`}>
                    <p className="m-0 mb-3 text-[11px] font-semibold text-zinc-400">
                        Período: Últimos 6 meses · Moneda: {selectedCurrency}
                    </p>
                    {report.hasSalesInVisibleMonths ? (
                        <CompactBars rows={report.salesByMonth} />
                    ) : (
                        <EmptyText>
                            {report.hasSalesPriorToVisiblePeriod
                                ? `No hay operaciones registradas en ${selectedCurrency} en los últimos 6 meses (existen ventas anteriores fuera de este período).`
                                : report.hasOperationsInOtherCurrency
                                ? `Hay operaciones registradas en ${report.otherCurrency}, pero ninguna en ${selectedCurrency} para este período.`
                                : 'Sin operaciones registradas en este período.'}
                        </EmptyText>
                    )}
                </AnalysisCard>

                <AnalysisCard title="Operaciones por Vendedor">
                    <CompactBars rows={report.operationsBySeller} accent="bg-emerald-500" />
                </AnalysisCard>
            </section>

            <section className="mb-6 grid gap-4 md:grid-cols-2">
                <AnalysisCard title="Origen de Leads">
                    <CompactBars rows={report.leadOrigins} accent="bg-sky-500" />
                </AnalysisCard>

                <AnalysisCard title={`Top 10 Clientes (${selectedCurrency})`}>
                    <p className="m-0 mb-3 text-[11px] font-semibold text-zinc-400">
                        Período histórico · Moneda: {selectedCurrency}
                    </p>
                    {report.hasSalesInSelectedCurrency ? (
                        <CompactBars rows={report.topClients} accent="bg-amber-500" />
                    ) : (
                        <EmptyText>
                            {report.hasOperationsInOtherCurrency
                                ? `Hay operaciones registradas en ${report.otherCurrency}, pero ninguna en ${selectedCurrency} para este período.`
                                : 'Sin operaciones registradas en este período.'}
                        </EmptyText>
                    )}
                </AnalysisCard>
            </section>

            <section className="mb-6 grid gap-4 md:grid-cols-2">
                <AnalysisCard title="Stock por Estado">
                    {carsError ? (
                        <EmptyText>Error al cargar inventario.</EmptyText>
                    ) : report.totalCars === 0 ? (
                        <EmptyText>Sin vehículos en inventario.</EmptyText>
                    ) : (
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
                    )}
                </AnalysisCard>

                <AnalysisCard title="Stock por Marca">
                    {carsError ? (
                        <EmptyText>Error al cargar inventario.</EmptyText>
                    ) : report.totalCars === 0 ? (
                        <EmptyText>Sin vehículos en inventario.</EmptyText>
                    ) : (
                        <CompactBars rows={report.stockByBrand} />
                    )}
                </AnalysisCard>
            </section>
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