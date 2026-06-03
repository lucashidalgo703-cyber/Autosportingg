"use client";
import { useMemo, useState } from 'react';

import { useAdminCars } from '../../hooks/useAdminCars';
import { calculateDashboardMetrics } from '../../components/crm/dashboard/dashboardMetrics';
import { BarChart3, Loader2, AlertCircle, Target } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../utils/adminPermissions';

import GeneralDashboardSote from '../../components/crm/dashboard/GeneralDashboardSote';
import CockpitCeoSote from '../../components/crm/dashboard/CockpitCeoSote';

export default function AdminDashboardPage() {
    const { cars, loading, error } = useAdminCars();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('cockpit');
    const displayName = user?.name || user?.username || (user?.email ? user.email.split('@')[0] : 'Equipo');
    const dashboardDate = new Date()
        .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
        .split(' ')
        .map((word) => word ? word.charAt(0).toUpperCase() + word.slice(1) : word)
        .join(' ');

    const metrics = useMemo(() => {
        if (!cars || cars.length === 0) return null;
        return calculateDashboardMetrics(cars);
    }, [cars]);

    return (
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6 flex flex-col pb-12">
            {/* Page Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-crm-fg m-0 mb-1">Hola, {displayName}</h1>
                    <p className="text-sm text-crm-fg-muted m-0">Bienvenido, {displayName} · {dashboardDate}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="appearance-none h-8 px-3 text-xs font-medium rounded-lg bg-crm-surface text-crm-fg border border-crm-border hover:bg-crm-surface-raised transition-colors">
                        Ocultar montos
                    </button>
                </div>
            </div>

            {/* Tabs Underline */}
            <div className="mb-4 flex overflow-x-auto border-b border-crm-border">
                <button 
                    onClick={() => setActiveTab('cockpit')}
                    className={`appearance-none -mb-px flex shrink-0 items-center gap-2 rounded-none border-0 border-b-2 bg-transparent px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none ${activeTab === 'cockpit' ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted hover:text-crm-fg'}`}
                >
                    <Target size={14} />
                    Cockpit CEO
                </button>
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`appearance-none -mb-px flex shrink-0 items-center gap-2 rounded-none border-0 border-b-2 bg-transparent px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none ${activeTab === 'general' ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted hover:text-crm-fg'}`}
                >
                    <BarChart3 size={14} />
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
                        activeTab === 'cockpit' ? (
                                <CockpitCeoSote
                                    metrics={metrics}
                                    canSeeFinancials={hasPermission(user, PERMISSIONS.FINANZAS_READ)}
                                    user={user}
                                />
                            ) : (
                                <GeneralDashboardSote
                                    metrics={metrics}
                                    canSeeFinancials={hasPermission(user, PERMISSIONS.FINANZAS_READ)}
                                    user={user}
                                />
                            )
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 border border-crm-border bg-crm-surface rounded-xl text-center">
                            <p className="text-white font-medium mb-2">No hay vehículos registrados</p>
                            <p className="text-crm-fg-muted text-sm">Carga vehículos en el inventario para ver las métricas.</p>
                        </div>
                    )}
                </div>
    );
}
