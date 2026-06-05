"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAdminSales } from '../../../hooks/useAdminSales';
import SalesSummaryCards from '../../../components/crm/sales/SalesSummaryCards';
import SalesFilters from '../../../components/crm/sales/SalesFilters';
import SalesTable from '../../../components/crm/sales/SalesTable';
import SaleMobileCards from '../../../components/crm/sales/SaleMobileCards';
import SaleDetailDrawer from '../../../components/crm/sales/SaleDetailDrawer';

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

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 pb-20 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg">Ventas</h1>
                        <span className="rounded border border-crm-red/20 bg-crm-red/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-crm-red">
                            Comercial
                        </span>
                    </div>
                    <p className="m-0 mt-1 text-sm text-crm-fg-muted">
                        Operaciones cerradas, entregas y seguimiento comercial.
                    </p>
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

                    <div className="flex items-center justify-between rounded-xl border border-crm-border bg-crm-surface p-3">
                        <h2 className="m-0 text-sm font-bold text-crm-fg">
                            Resultados <span className="font-normal text-crm-fg-muted">({filteredSales.length})</span>
                        </h2>
                    </div>

                    <SalesTable sales={filteredSales} onViewDetail={handleViewDetail} />
                    <SaleMobileCards sales={filteredSales} onViewDetail={handleViewDetail} />
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
