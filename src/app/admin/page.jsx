"use client";
import { useMemo, useState, useEffect } from 'react';

import { useAdminCars } from '../../hooks/useAdminCars';
import { useAdminSales } from '../../hooks/useAdminSales';
import { useAdminTransactions } from '../../hooks/useAdminTransactions';
import { useAdminInstallments } from '../../hooks/useAdminInstallments';
import { calculateDashboardMetrics } from '../../components/crm/dashboard/dashboardMetrics';
import { BarChart3, Loader2, AlertCircle, Target } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../utils/adminPermissions';

import GeneralDashboardSote from '../../components/crm/dashboard/GeneralDashboardSote';
import CockpitCeoSote from '../../components/crm/dashboard/CockpitCeoSote';

export default function AdminDashboardPage() {
    const { cars, loading: loadingCars, error: errorCars } = useAdminCars();
    const { sales, loading: loadingSales, error: errorSales, fetchSales } = useAdminSales();
    const { fetchTransactions } = useAdminTransactions();
    const { fetchInstallments } = useAdminInstallments();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('cockpit');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [transactions, setTransactions] = useState([]);
    const [installments, setInstallments] = useState([]);

    const displayName = user?.name || user?.username || (user?.email ? user.email.split('@')[0] : 'Equipo');
    const dashboardDate = new Date()
        .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
        .split(' ')
        .map((word) => word ? word.charAt(0).toUpperCase() + word.slice(1) : word)
        .join(' ');

    useEffect(() => {
        fetchSales();
        fetchTransactions().then(data => {
            if (data && Array.isArray(data.transactions)) setTransactions(data.transactions);
            else if (Array.isArray(data)) setTransactions(data);
        });
        fetchInstallments().then(data => {
            if (data && Array.isArray(data.installments)) setInstallments(data.installments);
            else if (Array.isArray(data)) setInstallments(data);
        });
    }, [fetchSales, fetchTransactions, fetchInstallments]);

    const metrics = useMemo(() => {
        if (!cars || cars.length === 0) return null;
        return calculateDashboardMetrics(cars, sales || [], selectedDate, transactions || [], installments || [], user);
    }, [cars, sales, selectedDate, transactions, installments, user]);

    const handlePrevMonth = () => {
        const prev = new Date(selectedDate);
        prev.setMonth(prev.getMonth() - 1);
        setSelectedDate(prev);
    };

    const handleNextMonth = () => {
        const next = new Date(selectedDate);
        next.setMonth(next.getMonth() + 1);
        setSelectedDate(next);
    };

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col p-4 pb-12 md:p-6">
            {/* Page Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="m-0 mb-1 text-xl font-bold text-crm-fg sm:text-2xl">Hola, {displayName}</h1>
                    <p className="text-sm text-crm-fg-muted m-0">Bienvenido, {displayName} · {dashboardDate}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="appearance-none h-8 px-3 text-xs font-medium rounded-lg bg-crm-surface text-crm-fg border border-crm-border hover:bg-crm-surface-raised transition-colors">
                        Ocultar montos
                    </button>
                </div>
            </div>

            {/* Tabs Underline */}
            <div className="mb-4 flex touch-pan-x overflow-x-auto border-b border-crm-border [-webkit-overflow-scrolling:touch]">
                <button 
                    onClick={() => setActiveTab('cockpit')}
                    className={`min-h-11 appearance-none -mb-px flex shrink-0 items-center gap-2 rounded-none border-0 border-b-2 bg-transparent px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none sm:px-5 ${activeTab === 'cockpit' ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted hover:text-crm-fg'}`}
                >
                    <Target size={14} />
                    Cockpit CEO
                </button>
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`min-h-11 appearance-none -mb-px flex shrink-0 items-center gap-2 rounded-none border-0 border-b-2 bg-transparent px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none sm:px-5 ${activeTab === 'general' ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted hover:text-crm-fg'}`}
                >
                    <BarChart3 size={14} />
                    Dashboard general
                </button>
            </div>

                    {loadingCars || loadingSales ? (
                        <div className="lg:col-span-2">
                            <div className="flex flex-col items-center justify-center h-64 border border-crm-border bg-crm-surface rounded-xl">
                                <Loader2 size={32} className="text-crm-red animate-spin mb-4" />
                                <p className="text-crm-fg-muted font-medium">Cargando métricas de dirección...</p>
                            </div>
                        </div>
                    ) : (errorCars || errorSales) ? (
                        <div className="flex flex-col items-center justify-center h-64 border border-red-500/20 bg-red-500/10 rounded-xl">
                            <AlertCircle size={32} className="text-red-500 mb-4" />
                            <p className="text-red-400 font-medium">Error al cargar datos del dashboard</p>
                            <p className="text-red-400/70 text-sm">{errorCars || errorSales}</p>
                        </div>
                    ) : metrics ? (
                        activeTab === 'cockpit' ? (
                                <CockpitCeoSote
                                    metrics={metrics}
                                    canSeeFinancials={hasPermission(user, PERMISSIONS.FINANZAS_READ)}
                                    user={user}
                                    selectedDate={selectedDate}
                                    onPrevMonth={handlePrevMonth}
                                    onNextMonth={handleNextMonth}
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
