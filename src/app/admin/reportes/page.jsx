"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, ShieldAlert } from 'lucide-react';
import { useAdminSales } from '../../../hooks/useAdminSales';
import { useAdminCars } from '../../../hooks/useAdminCars';
import { useAdminInstallments } from '../../../hooks/useAdminInstallments';
import { useAdminCrmTasks } from '../../../hooks/useAdminCrmTasks';

import ReportsSummaryCards from '../../../components/crm/reports/ReportsSummaryCards';
import ReportsFilters from '../../../components/crm/reports/ReportsFilters';
import ReportsExportPanel from '../../../components/crm/reports/ReportsExportPanel';
import ReportsSalesSection from '../../../components/crm/reports/ReportsSalesSection';
import ReportsStockSection from '../../../components/crm/reports/ReportsStockSection';
import ReportsCollectionsSection from '../../../components/crm/reports/ReportsCollectionsSection';
import ReportsOperationsSection from '../../../components/crm/reports/ReportsOperationsSection';
import ReportsTasksSection from '../../../components/crm/reports/ReportsTasksSection';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';

export default function ReportesPage() {
    const { fetchSales } = useAdminSales();
    const { refresh: fetchCars } = useAdminCars();
    const { fetchInstallments } = useAdminInstallments();
    const { fetchTasks } = useAdminCrmTasks();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [data, setData] = useState({
        sales: [],
        cars: [],
        installments: [],
        tasks: []
    });

    const [filters, setFilters] = useState({
        dateRange: 'all', // all, 30d, 90d, year
        currency: 'todos' // todos, ARS, USD
    });

    useEffect(() => {
        loadAllData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [salesData, carsData, instData, tasksData] = await Promise.all([
                fetchSales(),
                fetchCars(),
                fetchInstallments(),
                fetchTasks()
            ]);

            setData({
                sales: salesData || [],
                cars: carsData || [],
                installments: instData || [],
                tasks: tasksData || []
            });
        } catch (err) {
            console.error("Error loading reports data:", err);
            setError("Error al cargar los datos para el reporte.");
        } finally {
            setLoading(false);
        }
    };

    // Aplicar filtros globales (fecha y moneda)
    const filteredData = useMemo(() => {
        let { sales, cars, installments, tasks } = data;

        // Filter by Date (applies to sales, tasks, and installments created)
        if (filters.dateRange !== 'all') {
            const now = new Date();
            let limitDate = new Date();
            if (filters.dateRange === '30d') limitDate.setDate(now.getDate() - 30);
            if (filters.dateRange === '90d') limitDate.setDate(now.getDate() - 90);
            if (filters.dateRange === 'year') limitDate.setFullYear(now.getFullYear() - 1);

            sales = sales.filter(s => new Date(s.saleDate) >= limitDate);
            tasks = tasks.filter(t => new Date(t.createdAt) >= limitDate);
        }

        // Filter by Currency (applies to sales and installments)
        if (filters.currency !== 'todos') {
            sales = sales.filter(s => s.saleCurrency === filters.currency);
            installments = installments.filter(i => i.currency === filters.currency);
        }

        return { sales, cars, installments, tasks };
    }, [data, filters]);

    if (loading) {
        return (
            <div className="flex-1 flex justify-center items-center h-[80vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crm-red"></div>
            </div>
        );
    }

    return (
        <PermissionGuard permission={PERMISSIONS.REPORTES_READ}>
        <div className="max-w-7xl mx-auto flex flex-col h-full min-h-[85vh] pb-12">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-crm-red/10 flex items-center justify-center border border-crm-red/20">
                        <BarChart3 size={20} className="text-crm-red" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Tablero de Dirección</h1>
                        <p className="text-sm text-neutral-400 mt-0.5">Reportes gerenciales del estado global del CRM</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3">
                    <ShieldAlert size={20} />
                    {error}
                </div>
            )}

            <ReportsExportPanel data={filteredData} filters={filters} />
            <ReportsFilters filters={filters} setFilters={setFilters} />
            <ReportsSummaryCards data={filteredData} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <ReportsSalesSection data={filteredData} />
                <ReportsStockSection data={filteredData} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <ReportsCollectionsSection data={filteredData} />
                <ReportsOperationsSection data={filteredData} />
            </div>

            <div className="grid grid-cols-1 gap-6">
                <ReportsTasksSection data={filteredData} />
            </div>
        </div>
        </PermissionGuard>
    );
}
