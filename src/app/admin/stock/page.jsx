"use client";
import { useState, useMemo } from 'react';
import CrmShell from '../../../components/crm/layout/CrmShell';
import ProtectedRoute from '../../../components/ProtectedRoute';
import CrmStatCard from '../../../components/crm/ui/CrmStatCard';
import StockFilters from '../../../components/crm/stock/StockFilters';
import StockTable from '../../../components/crm/stock/StockTable';
import StockMobileCards from '../../../components/crm/stock/StockMobileCards';
import VehicleFormDemo from '../../../components/crm/stock/VehicleFormDemo';
import { stockDemoData, calculateVehicleMetrics } from '../../../components/crm/demo/stockDemoData';

export default function AdminStockPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('todos');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [vehicles, setVehicles] = useState(() => 
        stockDemoData.map(calculateVehicleMetrics)
    );

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
        // Simular agregando un vehiculo nuevo al principio
        const newVehicle = calculateVehicleMetrics({
            id: `V-00${vehicles.length + 1}`,
            marca: "Nuevo",
            modelo: "Demo",
            version: "1.0",
            año: 2024,
            kilometraje: 0,
            color: "N/A",
            dominio: "N/A",
            origen: "propio",
            moneda: "USD",
            precioCompra: 0,
            gastos: 0,
            precioPublicado: 0,
            precioMinimo: 0,
            fechaIngreso: new Date().toISOString().split('T')[0],
            estado: "disponible",
            observaciones: "Creado desde formulario demo."
        });
        setVehicles([newVehicle, ...vehicles]);
    };

    return (
        <ProtectedRoute>
            <CrmShell>
                <div className="flex flex-col gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white m-0 mb-1">Stock de Vehículos</h1>
                        <p className="text-sm text-[#A1A1AA] m-0">Gestión de inventario y valuaciones (Demo)</p>
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
            </CrmShell>
        </ProtectedRoute>
    );
}
