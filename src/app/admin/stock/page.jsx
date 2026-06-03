"use client";
import { useState, useMemo, useEffect } from 'react';

import CrmStatCard from '../../../components/crm/ui/CrmStatCard';
import StockFilters from '../../../components/crm/stock/StockFilters';
import StockTable from '../../../components/crm/stock/StockTable';
import StockMobileCards from '../../../components/crm/stock/StockMobileCards';
import VehicleFormDemo from '../../../components/crm/stock/VehicleFormDemo';
import { useAdminCars } from '../../../hooks/useAdminCars';
import { mapRealCarToCRM } from '../../../components/crm/stock/vehicleAdapter';

export default function AdminStockPage() {
    const { cars, loading, error } = useAdminCars();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('todos');
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Mapeo de datos reales al formato esperado por el CRM
    const vehicles = useMemo(() => {
        if (!cars || cars.length === 0) return [];
        return cars.map(mapRealCarToCRM);
    }, [cars]);

    // Filtrado de datos
    const filteredVehicles = useMemo(() => {
        return vehicles.filter(v => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                v.marca.toLowerCase().includes(searchLower) ||
                v.modelo.toLowerCase().includes(searchLower) ||
                v.version.toLowerCase().includes(searchLower) ||
                (v.dominio && v.dominio.toLowerCase().includes(searchLower));
            
            const matchesStatus = filterStatus === 'todos' || v.estado === filterStatus;
            
            return matchesSearch && matchesStatus;
        });
    }, [vehicles, searchTerm, filterStatus]);

    // KPIs calculados sobre el stock total (no el filtrado)
    const kpis = useMemo(() => {
        const total = vehicles.length;
        const totalCapitalUSD = vehicles.filter(v => v.moneda === 'USD').reduce((sum, v) => sum + v.costoTotal, 0);
        const propias = vehicles.filter(v => v.origen === 'propio').length;
        const consignadas = vehicles.filter(v => v.origen === 'consignación').length;
        const alertas = vehicles.filter(v => v.diasEnStock >= 60 && v.estado === 'disponible').length;

        return { total, totalCapitalUSD, propias, consignadas, alertas };
    }, [vehicles]);

    const handleNewVehicle = () => {
        setIsFormOpen(true);
    };

    const handleFormSubmit = () => {
        setIsFormOpen(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crm-red"></div>
                    <span className="text-[#A1A1AA] text-sm">Cargando stock real...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="flex flex-col items-center gap-3 text-center">
                    <span className="text-[#EF3329] font-bold">Error de conexión</span>
                    <span className="text-[#A1A1AA] text-sm">{error}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-crm-fg m-0 mb-1">Stock de Vehículos</h1>
                            <p className="text-sm text-crm-fg-muted m-0 flex items-center gap-2">
                                Gestión de inventario y valuaciones
                                <span className="bg-crm-success/10 text-crm-success text-[10px] px-2 py-0.5 rounded font-medium border border-crm-success/20">Datos reales (Solo lectura)</span>
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <CrmStatCard 
                            title="Total Unidades" 
                            value={kpis.total} 
                        />
                        <CrmStatCard 
                            title="Capital Inv. (USD)" 
                            value={kpis.totalCapitalUSD.toLocaleString('es-AR')} 
                            prefix="USD " 
                        />
                        <CrmStatCard 
                            title="Unidades Propias" 
                            value={kpis.propias} 
                        />
                        <CrmStatCard 
                            title="Consignaciones" 
                            value={kpis.consignadas} 
                        />
                        <CrmStatCard 
                            title="Alertas +60 días" 
                            value={kpis.alertas} 
                            trend={kpis.alertas > 0 ? "down" : "up"}
                            trendValue={kpis.alertas > 0 ? "Atención" : "Óptimo"}
                        />
                    </div>

                    <div className="flex flex-col">
                        <StockFilters 
                            searchTerm={searchTerm} 
                            setSearchTerm={setSearchTerm}
                            filterStatus={filterStatus}
                            setFilterStatus={setFilterStatus}
                            onNewVehicle={handleNewVehicle}
                        />

                        {/* Responsive Views */}
                        <div className="hidden lg:block">
                            <StockTable data={filteredVehicles} />
                        </div>
                        <div className="block lg:hidden">
                            <StockMobileCards data={filteredVehicles} />
                        </div>
                    </div>
                </div>

                <VehicleFormDemo 
                    isOpen={isFormOpen} 
                    onClose={() => setIsFormOpen(false)} 
                    onSubmit={handleFormSubmit}
                />
        </div>
    );
}
