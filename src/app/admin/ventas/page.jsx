"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCcw, ShieldAlert } from 'lucide-react';
import { useAdminSales } from '../../../hooks/useAdminSales';
import SalesSummaryCards from '../../../components/crm/sales/SalesSummaryCards';
import SalesFilters from '../../../components/crm/sales/SalesFilters';
import SalesTable from '../../../components/crm/sales/SalesTable';
import SaleMobileCards from '../../../components/crm/sales/SaleMobileCards';
import SaleDetailDrawer from '../../../components/crm/sales/SaleDetailDrawer';
import CrmButton from '../../../components/crm/ui/CrmButton';

export default function VentasPage() {
    const { fetchSales, loading, error } = useAdminSales();
    const [allSales, setAllSales] = useState([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);

    const [filters, setFilters] = useState({
        search: '',
        status: 'todas',
        currency: 'todas',
        paymentMethod: 'todas',
        documentationStatus: 'todas',
        deliveryStatus: 'todas',
        collectionStatus: 'todas'
    });

    const loadData = async () => {
        const data = await fetchSales();
        setAllSales(data || []);
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredSales = useMemo(() => {
        return allSales.filter(sale => {
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const clientName = (sale.clientId?.fullName || sale.clientId?.firstName || '').toLowerCase();
                const quoteName = (sale.leadId?.name || '').toLowerCase();
                const vehicleBrand = (sale.vehicleId?.brand || '').toLowerCase();
                const vehicleName = (sale.vehicleId?.name || '').toLowerCase();
                const vehicleVin = (sale.vehicleId?.plateOrVin || '').toLowerCase();
                const phone = (sale.clientId?.phone || sale.leadId?.phone || '').toLowerCase();

                const matchSearch =
                    clientName.includes(searchLower) ||
                    quoteName.includes(searchLower) ||
                    vehicleBrand.includes(searchLower) ||
                    vehicleName.includes(searchLower) ||
                    vehicleVin.includes(searchLower) ||
                    phone.includes(searchLower);

                if (!matchSearch) return false;
            }

            if (filters.status !== 'todas' && sale.status !== filters.status) return false;
            if (filters.currency !== 'todas' && sale.saleCurrency !== filters.currency) return false;
            if (filters.paymentMethod !== 'todas' && sale.paymentMethod !== filters.paymentMethod) return false;
            if (filters.documentationStatus && filters.documentationStatus !== 'todas' && (sale.documentationStatus || 'pendiente') !== filters.documentationStatus) return false;
            if (filters.deliveryStatus && filters.deliveryStatus !== 'todas' && (sale.deliveryStatus || 'pendiente') !== filters.deliveryStatus) return false;
            if (filters.collectionStatus && filters.collectionStatus !== 'todas' && (sale.finance?.collectionStatus || 'sin_cobro') !== filters.collectionStatus) return false;

            return true;
        });
    }, [allSales, filters]);

    const handleViewDetail = (sale) => {
        setSelectedSale(sale);
        setIsDrawerOpen(true);
    };

    const totals = useMemo(() => {
        const validSales = allSales.filter((sale) => sale.status !== 'cancelada');
        return {
            total: allSales.length,
            active: validSales.length,
            delivered: allSales.filter((sale) => sale.status === 'entregada').length,
            pending: allSales.filter((sale) => sale.status === 'pendiente_entrega').length
        };
    }, [allSales]);

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 pb-24 md:p-6">
            <div className="flex flex-col gap-4 border-b border-crm-border pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg">Ventas</h1>
                    <p className="m-0 mt-1 text-sm font-medium text-crm-fg-muted">
                        {totals.total} ventas · {totals.active} activas · {totals.delivered} entregadas
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-9 items-center rounded-full border border-crm-border bg-crm-surface px-3 text-xs font-bold text-crm-fg-muted">
                        {totals.pending} pendientes de entrega
                    </span>
                    <CrmButton
                        variant="secondary"
                        size="sm"
                        onClick={loadData}
                        disabled={loading}
                        className="h-9"
                    >
                        <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
                        Actualizar
                    </CrmButton>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                    <ShieldAlert size={20} />
                    {error}
                </div>
            )}

            {loading && allSales.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                        <span className="text-sm text-crm-fg-muted">Cargando ventas...</span>
                    </div>
                </div>
            ) : (
                <>
                    <SalesSummaryCards sales={allSales} />
                    <SalesFilters filters={filters} setFilters={setFilters} />

                    <section className="overflow-hidden rounded-xl border border-crm-border bg-crm-surface">
                        <div className="flex flex-col gap-1 border-b border-crm-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="m-0 text-sm font-bold uppercase tracking-[0.06em] text-crm-fg">Listado de ventas</h2>
                                <p className="m-0 mt-0.5 text-xs text-crm-fg-muted">{filteredSales.length} resultados encontrados</p>
                            </div>
                            <span className="inline-flex w-fit rounded-full border border-crm-red/20 bg-crm-red/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-crm-red">
                                Comercial
                            </span>
                        </div>

                        <SalesTable sales={filteredSales} onViewDetail={handleViewDetail} />
                        <SaleMobileCards sales={filteredSales} onViewDetail={handleViewDetail} />
                    </section>
                </>
            )}

            <SaleDetailDrawer
                isOpen={isDrawerOpen}
                onClose={() => {
                    setIsDrawerOpen(false);
                    setSelectedSale(null);
                }}
                sale={selectedSale}
            />
        </div>
    );
}
