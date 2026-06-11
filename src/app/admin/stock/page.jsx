"use client";
import { useState, useMemo } from 'react';
import { Download, Eye, FileText, Plus } from 'lucide-react';

import CrmButton from '../../../components/crm/ui/CrmButton';
import StockFilters from '../../../components/crm/stock/StockFilters';
import StockTable from '../../../components/crm/stock/StockTable';
import StockMobileCards from '../../../components/crm/stock/StockMobileCards';
import VehicleFormModal from '../../../components/VehicleFormModal';
import { useAdminCars } from '../../../hooks/useAdminCars';
import { mapRealCarToCRM } from '../../../components/crm/stock/vehicleAdapter';
import toast from 'react-hot-toast';

export default function AdminStockPage() {
    const { cars, loading, error } = useAdminCars();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('disponible');
    const [stockTab, setStockTab] = useState('stock');
    const [brandFilter, setBrandFilter] = useState('todas');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCar, setEditingCar] = useState(null);

    const vehicles = useMemo(() => {
        if (!cars || cars.length === 0) return [];
        return cars.map(mapRealCarToCRM);
    }, [cars]);

    const stockSummary = useMemo(() => {
        const disponibles = vehicles.filter(v => v.estado === 'disponible');
        const valorActivoUSD = disponibles
            .filter(v => v.moneda === 'USD')
            .reduce((sum, v) => sum + (v.precioPublicado || 0), 0);
        const valorActivoARS = disponibles
            .filter(v => v.moneda !== 'USD')
            .reduce((sum, v) => sum + (v.precioPublicado || 0), 0);

        return {
            total: vehicles.length,
            disponibles: disponibles.length,
            consignaciones: vehicles.filter(v => (v.origen || '').toLowerCase().includes('consign')).length,
            mandatos: vehicles.filter(v => (v.origen || '').toLowerCase().includes('mandato')).length,
            valorActivoUSD,
            valorActivoARS
        };
    }, [vehicles]);

    const brandOptions = useMemo(() => {
        return Array.from(new Set(vehicles.map(v => v.marca).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    }, [vehicles]);

    const filteredVehicles = useMemo(() => {
        return vehicles.filter(vehicle => {
            const searchLower = searchTerm.trim().toLowerCase();
            const matchesSearch =
                !searchLower ||
                vehicle.marca.toLowerCase().includes(searchLower) ||
                vehicle.modelo.toLowerCase().includes(searchLower) ||
                vehicle.version.toLowerCase().includes(searchLower) ||
                (vehicle.dominio && vehicle.dominio.toLowerCase().includes(searchLower)) ||
                (vehicle.origen && vehicle.origen.toLowerCase().includes(searchLower));

            const statusMap = {
                disponible: ['disponible'],
                senado: ['reservado'],
                vendido_sin_confirmar: ['pausado'],
                vendido: ['vendido']
            };

            const matchesStatus =
                filterStatus === 'todos' ||
                (statusMap[filterStatus] || [filterStatus]).includes(vehicle.estado);

            const matchesBrand = brandFilter === 'todas' || vehicle.marca === brandFilter;
            const matchesTab =
                stockTab === 'stock' ||
                (stockTab === 'consignaciones' && (vehicle.origen || '').toLowerCase().includes('consign')) ||
                (stockTab === 'mandatos' && (vehicle.origen || '').toLowerCase().includes('mandato'));

            return matchesSearch && matchesStatus && matchesBrand && matchesTab;
        });
    }, [vehicles, searchTerm, filterStatus, brandFilter, stockTab]);

    const handleNewVehicle = () => {
        setEditingCar(null);
        setIsFormOpen(true);
    };

    const handleSaveVehicle = async (formData, files) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error("No token found");

            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            
            const isEditing = !!formData._id;
            const endpoint = isEditing ? `${baseUrl}/api/cars/${formData._id}` : `${baseUrl}/api/cars`;
            const method = isEditing ? 'PUT' : 'POST';

            const payload = new FormData();
            
            // Append scalar fields
            Object.keys(formData).forEach(key => {
                if (key !== '_id' && key !== 'images' && key !== 'createdAt' && key !== 'updatedAt' && formData[key] !== undefined) {
                    payload.append(key, formData[key]);
                }
            });

            // Handle images and imageOrder for PUT
            let imageOrder = [];
            let newFileIndex = 0;

            if (files && files.length > 0) {
                files.forEach((file) => {
                    if (file.isExisting) {
                        imageOrder.push(file.url);
                    } else {
                        // Es un archivo nuevo File
                        payload.append('images', file);
                        imageOrder.push(`__new__${newFileIndex}`);
                        newFileIndex++;
                    }
                });
            }
            
            if (isEditing) {
                payload.append('imageOrder', JSON.stringify(imageOrder));
            }

            const loadingToast = toast.loading(isEditing ? 'Actualizando vehículo...' : 'Creando vehículo...');

            const res = await fetch(endpoint, {
                method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: payload
            });

            toast.dismiss(loadingToast);

            if (!res.ok) {
                const errData = await res.json().catch(()=>({}));
                throw new Error(errData.message || 'Error al guardar el vehículo');
            }

            toast.success(isEditing ? 'Vehículo actualizado' : 'Vehículo creado exitosamente');
            setIsFormOpen(false);
            setEditingCar(null);
            if (typeof refresh === 'function') {
                refresh();
            } else {
                // fallback to page reload if refresh is not available from useAdminCars
                window.location.reload();
            }
        } catch (error) {
            console.error("Save vehicle error:", error);
            toast.error(error.message || 'Error al guardar el vehículo');
        }
    };

    if (loading) {
        return (
            <div className="mx-auto flex min-h-[50vh] w-full max-w-7xl items-center justify-center p-4 md:p-6">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                    <span className="text-sm text-crm-fg-muted">Cargando stock real...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto flex min-h-[50vh] w-full max-w-7xl items-center justify-center p-4 md:p-6">
                <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 px-6 py-5 text-center">
                    <p className="m-0 text-sm font-bold text-crm-red">Error de conexion</p>
                    <p className="m-0 mt-2 text-sm text-crm-fg-muted">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-7xl p-4 pb-20 md:p-6">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg">Stock</h1>
                        <p className="m-0 mt-1 text-sm text-crm-fg-muted">
                            {stockSummary.disponibles} vehículos disponibles para vender
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <CrmButton variant="secondary" size="sm" className="gap-2 border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15">
                            <Eye size={14} />
                            Vista previa
                        </CrmButton>
                        <CrmButton variant="secondary" size="sm" className="gap-2">
                            <Download size={14} />
                            Exportar XLSX
                        </CrmButton>
                        <CrmButton variant="secondary" size="sm" className="gap-2">
                            <FileText size={14} />
                            Nuevo mandato + Stock
                        </CrmButton>
                        <CrmButton variant="primary" size="sm" onClick={handleNewVehicle} className="gap-2">
                            <Plus size={14} />
                            Nuevo vehículo
                        </CrmButton>
                    </div>
                </div>

                <div className="flex flex-col gap-2 rounded-xl border border-crm-border bg-crm-surface px-4 py-3 text-sm text-crm-fg-muted sm:flex-row sm:items-center sm:gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-base">🚗</span>
                        <span className="font-semibold text-crm-fg">{stockSummary.disponibles}</span>
                        <span>disponibles</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-crm-fg-subtle">
                            Valor activo(disponible):
                        </span>
                        <span className="font-semibold text-crm-fg">
                            {stockSummary.valorActivoUSD > 0 ? `USD ${stockSummary.valorActivoUSD.toLocaleString('es-AR')}` : '--'}
                        </span>
                        {stockSummary.valorActivoARS > 0 && (
                            <span className="text-crm-fg-muted">
                                ARS {stockSummary.valorActivoARS.toLocaleString('es-AR')}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-col">
                    <StockFilters
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        stockTab={stockTab}
                        setStockTab={setStockTab}
                        brandFilter={brandFilter}
                        setBrandFilter={setBrandFilter}
                        brandOptions={brandOptions}
                        counts={stockSummary}
                    />

                    <div className="hidden lg:block">
                        <StockTable data={filteredVehicles} />
                    </div>
                    <div className="block lg:hidden">
                        <StockMobileCards data={filteredVehicles} />
                    </div>
                </div>
            </div>

            <VehicleFormModal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditingCar(null); }}
                onSave={handleSaveVehicle}
                editingCar={editingCar}
            />
        </div>
    );
}
