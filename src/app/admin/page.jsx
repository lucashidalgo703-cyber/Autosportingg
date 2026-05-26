"use client";
import { useMemo } from 'react';

import { useAdminCars } from '../../hooks/useAdminCars';
import { calculateDashboardMetrics } from '../../components/crm/dashboard/dashboardMetrics';
import { Loader2, AlertCircle } from 'lucide-react';

// New Dashboard Components
import CapitalSummary from '../../components/crm/dashboard/CapitalSummary';
import StockStatusSummary from '../../components/crm/dashboard/StockStatusSummary';
import RotationAlertsPanel from '../../components/crm/dashboard/RotationAlertsPanel';
import RecentAuditPanel from '../../components/crm/dashboard/RecentAuditPanel';
import TopStockPanels from '../../components/crm/dashboard/TopStockPanels';

export default function AdminDashboardPage() {
    const { cars, loading, error } = useAdminCars();

    const metrics = useMemo(() => {
        if (!cars || cars.length === 0) return null;
        return calculateDashboardMetrics(cars);
    }, [cars]);

    return (
                <div className="flex flex-col gap-6 pb-12">
                    <div>
                        <h1 className="text-2xl font-bold text-white m-0 mb-1">Dashboard</h1>
                        <p className="text-sm text-[#A1A1AA] m-0">Análisis y métricas en tiempo real de AutoSporting</p>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 border border-white/5 bg-[#161619] rounded-xl">
                            <Loader2 size={32} className="text-[#E63027] animate-spin mb-4" />
                            <p className="text-[#A1A1AA] text-sm">Calculando métricas del stock...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 border border-red-500/20 bg-red-500/10 rounded-xl">
                            <AlertCircle size={32} className="text-red-500 mb-4" />
                            <p className="text-red-400 font-medium">Error al cargar datos del dashboard</p>
                            <p className="text-red-400/70 text-sm">{error}</p>
                        </div>
                    ) : metrics ? (
                        <>
                            <CapitalSummary metrics={metrics} />
                            
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-1">
                                    <StockStatusSummary metrics={metrics} />
                                </div>
                                <div className="lg:col-span-1">
                                    <RotationAlertsPanel metrics={metrics} />
                                </div>
                                <div className="lg:col-span-1">
                                    <RecentAuditPanel metrics={metrics} />
                                </div>
                            </div>

                            <TopStockPanels metrics={metrics} />
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 border border-white/5 bg-[#161619] rounded-xl text-center">
                            <p className="text-white font-medium mb-2">No hay vehículos registrados</p>
                            <p className="text-[#A1A1AA] text-sm">Carga vehículos en el inventario para ver las métricas.</p>
                        </div>
                    )}
                </div>
    );
}
