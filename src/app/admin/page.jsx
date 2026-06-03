"use client";
import { useMemo } from 'react';

import { useAdminCars } from '../../hooks/useAdminCars';
import { calculateDashboardMetrics } from '../../components/crm/dashboard/dashboardMetrics';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../utils/adminPermissions';

// New Dashboard Components
import CapitalSummary from '../../components/crm/dashboard/CapitalSummary';
import StockStatusSummary from '../../components/crm/dashboard/StockStatusSummary';
import RotationAlertsPanel from '../../components/crm/dashboard/RotationAlertsPanel';
import RecentAuditPanel from '../../components/crm/dashboard/RecentAuditPanel';
import TopStockPanels from '../../components/crm/dashboard/TopStockPanels';

export default function AdminDashboardPage() {
    const { cars, loading, error } = useAdminCars();
    const { user } = useAuth();

    const metrics = useMemo(() => {
        if (!cars || cars.length === 0) return null;
        return calculateDashboardMetrics(cars);
    }, [cars]);

    return (
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6 flex flex-col gap-6 pb-12">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-crm-fg m-0 mb-1">¡Hola, {user?.name || 'Equipo'}! 👋</h1>
                    <p className="text-sm text-crm-fg-muted m-0">Aquí tienes el resumen de AutoSporting para hoy, {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="h-8 px-3 text-xs font-medium rounded-lg bg-crm-surface text-crm-fg border border-crm-border hover:bg-crm-surface-raised transition-colors">
                        Ocultar montos
                    </button>
                </div>
            </div>

            {/* Banner Cockpit */}
            <div className="rounded-2xl p-5 text-white bg-gradient-to-r from-crm-red to-[#C42620] shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold mb-1">Cockpit de Rendimiento</h2>
                        <p className="text-sm opacity-90">Monitorea tus KPIs y la salud general del negocio en tiempo real.</p>
                    </div>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10 text-9xl leading-none font-black transform translate-x-4 translate-y-8">
                    AS
                </div>
            </div>

            {/* Tabs Underline */}
            <div className="flex overflow-x-auto border-b border-crm-border mt-2">
                <button className="-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition-colors border-crm-red text-crm-red focus-visible:outline-none">
                    Cockpit CEO
                </button>
                <button className="-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition-colors border-transparent text-crm-fg-muted hover:text-crm-fg focus-visible:outline-none">
                    Dashboard general
                </button>
            </div>

                    {loading ? (
                        <div className="lg:col-span-2">
                            <div className="flex flex-col items-center justify-center h-64 border border-crm-border bg-crm-surface rounded-xl">
                                <Loader2 size={32} className="text-crm-red animate-spin mb-4" />
                                <p className="text-crm-fg-muted font-medium">Cargando métricas de dirección...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 border border-red-500/20 bg-red-500/10 rounded-xl">
                            <AlertCircle size={32} className="text-red-500 mb-4" />
                            <p className="text-red-400 font-medium">Error al cargar datos del dashboard</p>
                            <p className="text-red-400/70 text-sm">{error}</p>
                        </div>
                    ) : metrics ? (
                        <>
                            {hasPermission(user, PERMISSIONS.FINANZAS_READ) && (
                                <CapitalSummary metrics={metrics} />
                            )}
                            
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

                            {hasPermission(user, PERMISSIONS.FINANZAS_READ) && (
                                <TopStockPanels metrics={metrics} />
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 border border-crm-border bg-crm-surface rounded-xl text-center">
                            <p className="text-white font-medium mb-2">No hay vehículos registrados</p>
                            <p className="text-crm-fg-muted text-sm">Carga vehículos en el inventario para ver las métricas.</p>
                        </div>
                    )}
                </div>
    );
}
