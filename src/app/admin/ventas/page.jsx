"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Handshake, ShieldAlert } from 'lucide-react';
import { useAdminSales } from '../../../hooks/useAdminSales';
import SalesSummaryCards from '../../../components/crm/sales/SalesSummaryCards';
import SalesFilters from '../../../components/crm/sales/SalesFilters';
import SalesTable from '../../../components/crm/sales/SalesTable';
import SaleMobileCards from '../../../components/crm/sales/SaleMobileCards';
import SaleDetailDrawer from '../../../components/crm/sales/SaleDetailDrawer';

export default function VentasPage() {
    const { fetchSales, loading, error } = useAdminSales();
    const [allSales, setAllSales] = useState([]);
    
    // Drawer state
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);

    const [filters, setFilters] = useState({
        search: '',
        status: 'todas',
        currency: 'todas',
        paymentMethod: 'todas'
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
            // 1. Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const clientName = (sale.clientId?.fullName || sale.clientId?.firstName || '').toLowerCase();
                const leadName = (sale.leadId?.name || '').toLowerCase();
                const vehicleBrand = (sale.vehicleId?.brand || '').toLowerCase();
                const vehicleName = (sale.vehicleId?.name || '').toLowerCase();
                const vehicleVin = (sale.vehicleId?.plateOrVin || '').toLowerCase();
                const phone = (sale.clientId?.phone || sale.leadId?.phone || '').toLowerCase();

                const matchSearch = 
                    clientName.includes(searchLower) || 
                    leadName.includes(searchLower) || 
                    vehicleBrand.includes(searchLower) || 
                    vehicleName.includes(searchLower) || 
                    vehicleVin.includes(searchLower) || 
                    phone.includes(searchLower);

                if (!matchSearch) return false;
            }

            // 2. Status filter
            if (filters.status !== 'todas' && sale.status !== filters.status) {
                return false;
            }

            // 3. Currency filter
            if (filters.currency !== 'todas' && sale.saleCurrency !== filters.currency) {
                return false;
            }

            // 4. Payment Method filter
            if (filters.paymentMethod !== 'todas' && sale.paymentMethod !== filters.paymentMethod) {
                return false;
            }

            return true;
        });
    }, [allSales, filters]);

    const handleViewDetail = (sale) => {
        setSelectedSale(sale);
        setIsDrawerOpen(true);
    };

    return (
        <div className="max-w-7xl mx-auto flex flex-col h-full min-h-[85vh]">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Handshake size={20} className="text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Gestión de Ventas</h1>
                        <p className="text-sm text-neutral-400 mt-0.5">Control comercial e histórico de oportunidades cerradas</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3">
                    <ShieldAlert size={20} />
                    {error}
                </div>
            )}

            {loading && allSales.length === 0 ? (
                <div className="flex-1 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <>
                    <SalesSummaryCards sales={allSales} />
                    <SalesFilters filters={filters} setFilters={setFilters} />
                    
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-white">
                            Resultados <span className="text-neutral-500 font-normal">({filteredSales.length})</span>
                        </h2>
                    </div>

                    <SalesTable 
                        sales={filteredSales} 
                        onViewDetail={handleViewDetail} 
                    />
                    
                    <SaleMobileCards 
                        sales={filteredSales} 
                        onViewDetail={handleViewDetail} 
                    />
                </>
            )}

            {/* Detalle de Venta (Drawer) */}
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
