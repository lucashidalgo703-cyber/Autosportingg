"use client";
import { useState, useMemo, useEffect, useRef } from 'react';
import { Download, FileText, Plus, ExternalLink } from 'lucide-react';

import CrmButton from '../../../components/crm/ui/CrmButton';
import CrmPageHeader from '../../../components/crm/ui/CrmPageHeader';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';
import StockFilters from '../../../components/crm/stock/StockFilters';
import StockTable from '../../../components/crm/stock/StockTable';
import StockMobileCards from '../../../components/crm/stock/StockMobileCards';
import VehicleFormModal from '../../../components/VehicleFormModal';
import StockImportModal from '../../../components/crm/stock/StockImportModal';
import MLActionModal from '../../../components/crm/stock/MLActionModal';
import VehicleDeleteModal from '../../../components/crm/stock/VehicleDeleteModal';
import ReservationModal from '../../../components/crm/reservations/ReservationModal';
import MandateTable from '../../../components/crm/stock/MandateTable';
import MandateStockModal from '../../../components/crm/stock/MandateStockModal';
import { useAdminCars } from '../../../hooks/useAdminCars';
import { useAdminMandates } from '../../../hooks/useAdminMandates';
import { mapRealCarToCRM } from '../../../components/crm/stock/vehicleAdapter';
import toast from 'react-hot-toast';
import CrmPagination from '../../../components/crm/ui/CrmPagination';
import VehicleFlyerPdf from '../../../components/crm/stock/VehicleFlyerPdf';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS, canReadStockNegotiation, canReadCapitalHistory, isSalesRole } from '../../../utils/adminPermissions';
import { prepareVehicleImageOrder } from '../../../services/vehicleImageUpload';
import AvailableInventoryValues from '../../../components/crm/stock/AvailableInventoryValues';
import StockNegotiationPanel from '../../../components/crm/stock/StockNegotiationPanel';
import VehicleIntakeModal from '../../../components/crm/stock/VehicleIntakeModal';


export default function AdminStockPage() {
    const { user, loading } = useAuth();
    if (loading || !user) return <p className="text-sm text-crm-fg-muted">Cargando…</p>;
    // Do not mount inventory hooks, cached rows, actions or counters for sellers.
    if (isSalesRole(user)) return <RestrictedStockPage user={user}/>;
    return <StockInventoryPage/>;
}

function RestrictedStockPage({ user }) {
    const [intakeOpen, setIntakeOpen] = useState(false);
    return <div className="flex min-w-0 flex-col gap-6" data-seller-stock-negotiation>
        <CrmPageHeader title="Stock" subtitle="Negociación de contado de las unidades disponibles." actions={hasPermission(user, PERMISSIONS.STOCK_SUBMIT) && <CrmButton type="button" onClick={() => setIntakeOpen(true)}><Plus size={16}/> Solicitar alta de vehículo</CrmButton>}/>
        {canReadStockNegotiation(user) ? <StockNegotiationPanel/> : <p className="text-sm text-crm-fg-muted">No tenés permiso para consultar Negociación.</p>}
        {intakeOpen && <VehicleIntakeModal onClose={() => setIntakeOpen(false)}/>}
    </div>;
}

function StockInventoryPage() {
    const [pageNumber, setPageNumber] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('todos');
    const [ownershipFilter, setOwnershipFilter] = useState('todos');
    const [stockTab, setStockTab] = useState('stock');
    const [brandFilter, setBrandFilter] = useState('todas');
    const [mlFilter, setMlFilter] = useState('todas');
    const [catalogFilter, setCatalogFilter] = useState('all');
    const [selectedVehicleForPrint, setSelectedVehicleForPrint] = useState(null);

    const hasActiveFilters = Boolean(
        searchTerm.trim() ||
        debouncedSearch.trim() ||
        (brandFilter && brandFilter !== 'todas') ||
        (mlFilter && mlFilter !== 'todas') ||
        catalogFilter !== 'all' ||
        (filterStatus && filterStatus !== 'todos' && filterStatus !== '') ||
        ownershipFilter !== 'todos' ||
        (stockTab && stockTab !== 'stock')
    );

    const handleClearFilters = () => {
        setSearchTerm('');
        setDebouncedSearch('');
        setBrandFilter('todas');
        setMlFilter('todas');
        setCatalogFilter('all');
        setFilterStatus('todos');
        setOwnershipFilter('todos');
        setStockTab('stock');
        setPageNumber(1);
    };

    const handlePrint = (carToPrint) => {
        setSelectedVehicleForPrint(carToPrint);
        setTimeout(() => {
            window.print();
            setSelectedVehicleForPrint(null);
        }, 150);
    };

    const { 
        cars, loading, error, refresh, total, pages, 
        summary: backendSummary, brands: backendBrands, 
        swapCars, setCars, filteredTotalUSD, filteredTotalARS, filteredMetrics, financialAccess,
    } = useAdminCars();
    const { user } = useAuth();
    const canNegotiate = canReadStockNegotiation(user);
    const canWrite = ['owner', 'admin'].includes(user?.role) || hasPermission(user, PERMISSIONS.STOCK_WRITE);
    const canReserve = ['owner', 'admin'].includes(user?.role) || hasPermission(user, PERMISSIONS.RESERVAS_WRITE);
    const canSeeCosts = financialAccess;
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSavingVehicle, setIsSavingVehicle] = useState(false);
    const savingVehicleRef = useRef(false);
    const imageUploadCache = useRef(new WeakMap());
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isMandateModalOpen, setIsMandateModalOpen] = useState(false);
    const [editingCar, setEditingCar] = useState(null);
    const [mlEditingCar, setMlEditingCar] = useState(null);
    const [deletingCar, setDeletingCar] = useState(null);
    const [reservingCar, setReservingCar] = useState(null);
    const [confirmDeleteMandate, setConfirmDeleteMandate] = useState({ isOpen: false, mandate: null });
    const { mandates, fetchMandates, deleteMandate } = useAdminMandates();
    const [isSwapping, setIsSwapping] = useState(false);

    useEffect(() => {
        fetchMandates();
    }, [fetchMandates]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 350);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Cuando cambian los filtros de búsqueda o estado, reiniciamos a la página 1
    useEffect(() => {
        setPageNumber(1);
    }, [debouncedSearch, filterStatus, brandFilter, stockTab, mlFilter, catalogFilter, ownershipFilter]);

    // Ejecuta la consulta únicamente cuando cambie la página o los filtros debounced
    useEffect(() => {
        if (stockTab === 'negotiation') return;
        refresh({
            page: pageNumber,
            limit: 20,
            search: debouncedSearch,
            status: filterStatus,
            brand: brandFilter,
            tab: stockTab,
            ml: mlFilter,
            catalog: catalogFilter,
            ownership: ownershipFilter
        });
    }, [pageNumber, debouncedSearch, filterStatus, brandFilter, stockTab, mlFilter, catalogFilter, ownershipFilter, refresh]);
    useEffect(() => {
        if (stockTab === 'negotiation' && !canNegotiate) setStockTab('stock');
    }, [stockTab, canNegotiate]);

    const handleSwap = async (index, direction) => {
        if (isSwapping || loading) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const isCrossPage = targetIndex < 0 || targetIndex >= vehicles.length;

        const currentVehicle = vehicles[index];
        if (!currentVehicle) return;

        const currentId = currentVehicle._original?._id || currentVehicle.id;
        const originalCars = [...cars];

        setIsSwapping(true);

        try {
            if (!isCrossPage) {
                // Optimistic local update
                const updatedCars = [...cars];
                const temp = updatedCars[index];
                updatedCars[index] = updatedCars[targetIndex];
                updatedCars[targetIndex] = temp;

                setCars(updatedCars);

                const otherVehicle = vehicles[targetIndex];
                const otherId = otherVehicle._original?._id || otherVehicle.id;

                const success = await swapCars(currentId, otherId);
                if (!success) {
                    setCars(originalCars);
                }
            } else {
                // Consulta el vecino de la página filtrada para no intercambiar con una unidad oculta.
                const success = await swapCars(currentId, undefined, direction, {
                    page: pageNumber,
                    limit: 20,
                    search: debouncedSearch,
                    status: filterStatus,
                    brand: brandFilter,
                    tab: stockTab,
                    ml: mlFilter,
                    catalog: catalogFilter,
                    ownership: ownershipFilter
                });
                if (!success) {
                    // Fail fallback
                }
            }
        } catch (error) {
            console.error("Error swapping vehicles:", error);
            setCars(originalCars);
        } finally {
            setIsSwapping(false);
            refresh({
                page: pageNumber,
                limit: 20,
                search: searchTerm,
                status: filterStatus,
                brand: brandFilter,
                tab: stockTab,
                ml: mlFilter,
                catalog: catalogFilter,
                ownership: ownershipFilter
            });
        }
    };

    const vehicles = useMemo(() => {
        if (!cars || cars.length === 0) return [];
        return cars.map(car => mapRealCarToCRM({ ...car, linkedMandates: mandates.filter(m => String(m.linkedCarId?._id || m.linkedCarId || '') === String(car._id)).map(m => ({ id: String(m._id), status: m.status })) }));
    }, [cars, mandates]);

    // Los indicadores globales provienen exclusivamente del backendSummary calculado sobre la colección completa
    // Nunca deben recalcularse sobre los 20 vehículos de la página actual ni sobre el subconjunto filtrado
    const stockSummary = useMemo(() => {
        if (backendSummary) {
            return {
                ...backendSummary,
                mandatos: mandates.length
            };
        }

        return { total: 0, inventoryCount: 0, disponibles: 0, reservados: 0, pausados: 0,
            consignaciones: 0, compartidos: 0, ceroKm: 0, mandatos: mandates.length };

    }, [backendSummary, mandates.length]);

    const brandOptions = useMemo(() => {
        return backendBrands || [];
    }, [backendBrands]);

    const filteredVehicles = useMemo(() => {
        return vehicles;
    }, [vehicles]);

    const filteredMandates = useMemo(() => {
        return mandates.filter(mandate => {
            const searchLower = searchTerm.trim().toLowerCase();
            if (!searchLower) return true;
            return (
                mandate.brand?.toLowerCase().includes(searchLower) ||
                mandate.model?.toLowerCase().includes(searchLower) ||
                mandate.clientName?.toLowerCase().includes(searchLower) ||
                mandate.plate?.toLowerCase().includes(searchLower) ||
                mandate.representativeName?.toLowerCase().includes(searchLower)
            );
        });
    }, [mandates, searchTerm]);

    const handleNewVehicle = () => {
        setEditingCar(null);
        setIsFormOpen(true);
    };

    const handleNewMandate = () => {
        setIsMandateModalOpen(true);
    };

    const handleExportXLSX = async () => {
        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : API_URL;
            
            toast.loading('Generando archivo XLSX...', { id: 'export-xlsx' });
            
            const res = await fetch(`${baseUrl}/api/admin/cars/export`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!res.ok) throw new Error('Error al generar el export');
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Extraer filename del header si es posible, sino default
            const contentDisposition = res.headers.get('Content-Disposition');
            let filename = 'stock-autosporting.xlsx';
            if (contentDisposition && contentDisposition.includes('filename=')) {
                filename = contentDisposition.split('filename=')[1].replace(/["']/g, '');
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            toast.success('Archivo descargado con éxito', { id: 'export-xlsx' });
        } catch (error) {
            toast.error('Error al exportar stock', { id: 'export-xlsx' });
            console.error('Export error:', error);
        }
    };

    const handleSaveVehicle = async (formData, files) => {
        if (savingVehicleRef.current) return;
        savingVehicleRef.current = true;
        setIsSavingVehicle(true);
        const saveToastId = 'save-vehicle-with-photos';
        try {
            // Normalización de marcas
            if (formData.brand) {
                const brandLower = formData.brand.toLowerCase().trim();
                if (brandLower === 'fiat') formData.brand = 'Fiat';
                else if (brandLower === 'volskwagen' || brandLower === 'volkswagen') formData.brand = 'Volkswagen';
                else formData.brand = formData.brand.trim();
            }

            // Validación de precio anómalo
            if (formData.price && Number(formData.price) <= 100 && formData.currency === 'ARS') {
                if (!window.confirm("⚠️ El precio publicado en ARS parece anómalo (<= 100). ¿Guardar de todas formas?")) {
                    return;
                }
            }

            // Preservar estado agencyOwned si está activado
            if (formData.agencyOwned) {
                formData.consignedBy = '';
            }

            const token = localStorage.getItem('token');
            if (!token) throw new Error("No token found");

            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            
            const isEditing = !!formData._id;
            const endpoint = isEditing ? `${baseUrl}/api/admin/cars/${formData._id}` : `${baseUrl}/api/cars`;
            const method = isEditing ? 'PATCH' : 'POST';

            const payload = new FormData();
            
            // Append scalar fields
            Object.keys(formData).forEach(key => {
                if (key !== '_id' && key !== 'images' && key !== 'imageOrder' && key !== 'createdAt' && key !== 'updatedAt' && formData[key] !== undefined) {
                    payload.append(key, formData[key]);
                }
            });

            toast.loading(isEditing ? 'Actualizando vehículo...' : 'Creando vehículo...', { id: saveToastId });
            if (Array.isArray(files)) {
                const imageOrder = await prepareVehicleImageOrder(files, {
                    token,
                    baseUrl,
                    cache: imageUploadCache.current,
                    onProgress: (index, count) => toast.loading(`Subiendo foto ${index} de ${count}...`, { id: saveToastId })
                });
                payload.append('imageOrder', JSON.stringify(imageOrder));
            }
            toast.loading(isEditing ? 'Guardando cambios del vehículo...' : 'Guardando vehículo...', { id: saveToastId });

            const res = await fetch(endpoint, {
                method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: payload
            });

            toast.dismiss(saveToastId);

            if (!res.ok) {
                const errData = await res.json().catch(()=>({}));
                throw new Error(errData.message || 'Error al guardar el vehículo');
            }

            toast.success(isEditing ? 'Vehículo actualizado' : 'Vehículo creado exitosamente');
            imageUploadCache.current = new WeakMap();
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
        } finally {
            toast.dismiss(saveToastId);
            savingVehicleRef.current = false;
            setIsSavingVehicle(false);
        }
    };

    if (cars.length === 0 && (loading || error)) {
        return (
            <div role={error ? 'alert' : 'status'} aria-live="polite" className="flex min-h-[50vh] w-full items-center justify-center p-4 md:p-6">
                <div className="flex max-w-lg flex-col items-center gap-3 text-center">
                    <h1 className="m-0 text-xl font-bold text-crm-fg">Stock</h1>
                    {loading && !error && <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />}
                    {error && <p className="m-0 font-bold text-crm-red">No se pudo cargar Stock</p>}
                    <span className="text-sm text-crm-fg-muted">{error || 'Cargando stock real...'}</span>
                    <div className="flex flex-wrap justify-center gap-2">
                        <CrmButton variant="secondary" size="sm" onClick={() => refresh()}>Reintentar</CrmButton>
                        <CrmButton variant="ghost" size="sm" onClick={() => window.location.reload()}>Recargar Stock</CrmButton>
                    </div>
                </div>
            </div>
        );
    }



    return (
        <div className="w-full min-w-0 p-3 pb-20 sm:p-4 xl:p-5 2xl:p-6 crm-no-print">
            <div className="flex flex-col gap-6">
                <CrmPageHeader 
                    title="Stock"
                    subtitle={stockTab === 'negotiation' ? 'Precios de contado y ganancia proyectada de las unidades disponibles.' : 'Inventario disponible para vender. Las fichas de otros estados se conservan en el historial.'}
                    actions={
                        <>
                            <CrmButton variant="secondary" size="sm" className="gap-2" onClick={() => window.open('/catalogo', '_blank', 'noopener,noreferrer')}>
                                <ExternalLink size={14} /> Tu catálogo
                            </CrmButton>
                            {stockTab !== 'negotiation' && <CrmButton variant="secondary" size="sm" className="gap-2" onClick={handleExportXLSX}>
                                <Download size={14} />
                                Exportar XLSX
                            </CrmButton>}
                            {canWrite && <><CrmButton variant="secondary" size="sm" className="gap-2" onClick={() => setIsImportModalOpen(true)}>
                                <FileText size={14} />
                                Importar XLSX
                            </CrmButton>
                            <CrmButton variant="primary" size="sm" onClick={handleNewMandate} className="gap-2 bg-blue-600 hover:bg-blue-700">
                                <Plus size={14} />
                                Nuevo mandato + Stock
                            </CrmButton>
                            <CrmButton variant="primary" size="sm" onClick={handleNewVehicle} className="gap-2">
                                <Plus size={14} />
                                Nuevo vehículo
                            </CrmButton></>}
                        </>
                    }
                />

                {canSeeCosts && !['mandatos', 'negotiation'].includes(stockTab) && <AvailableInventoryValues metrics={stockSummary.availableMetrics} filteredMetrics={filteredMetrics} hasFilter={stockTab !== 'historial' && hasActiveFilters} showCapitalHistory={canReadCapitalHistory(user)} />}

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
                        mlFilter={mlFilter}
                        setMlFilter={setMlFilter}
                        catalogFilter={catalogFilter}
                        ownershipFilter={ownershipFilter}
                        setOwnershipFilter={setOwnershipFilter}
                        setCatalogFilter={setCatalogFilter}
                        disabled={isSwapping}
                        brandOptions={brandOptions}
                        counts={stockSummary}
                        canNegotiate={canNegotiate}
                    />

                    {stockTab !== 'negotiation' && <h2 className="mb-1 mt-5 text-lg font-bold text-crm-fg" data-stock-heading>{stockTab === 'mandatos' ? `Mandatos (${filteredMandates.length})` : stockTab === 'historial' ? `Historial de unidades (${total})` : hasActiveFilters ? `${total} de ${stockSummary.disponibles} disponibles` : `Inventario disponible (${stockSummary.disponibles})`}</h2>}
                    {stockTab === 'historial' && <p className="mb-3 text-xs text-crm-fg-muted">Consulta de fichas en todos los estados. Los totales de capital de arriba incluyen únicamente unidades disponibles.</p>}

                    {stockTab === 'negotiation' && canNegotiate ? <StockNegotiationPanel/> : error ? (
                        <div role="alert" className="rounded-xl border border-crm-red/30 bg-crm-red/10 px-6 py-5 text-center mt-4">
                            <p className="m-0 text-sm font-bold text-crm-red">No se pudo cargar Stock</p>
                            <p className="m-0 mt-2 text-sm text-crm-fg-muted">{error}</p>
                            <CrmButton 
                                variant="secondary" 
                                size="sm" 
                                className="mt-4 gap-2 border-crm-red/30 bg-crm-red/10 text-crm-red hover:bg-crm-red/15" 
                                onClick={() => refresh({
                                    page: pageNumber,
                                    limit: 20,
                                    search: debouncedSearch,
                                    status: filterStatus,
                                    brand: brandFilter,
                                    tab: stockTab,
                                    ml: mlFilter,
                                    catalog: catalogFilter,
                                    ownership: ownershipFilter
                                })}
                            >
                                Reintentar
                            </CrmButton>
                        </div>
                    ) : stockTab === 'mandatos' ? (
                        <div className="mt-4">
                            <MandateTable 
                                data={filteredMandates} 
                                onDelete={(m) => { if (canWrite) setConfirmDeleteMandate({ isOpen: true, mandate: m }); }}
                            />
                        </div>
                    ) : (
                        <>
                            <div className="hidden lg:block">
                                <StockTable 
                                    data={filteredVehicles} 
                                    onEditML={setMlEditingCar} 
                                    onDelete={setDeletingCar} 
                                    onPrint={handlePrint} 
                                    onSwap={handleSwap} 
                                    isSwapping={isSwapping || loading}
                                    currentPage={pageNumber} 
                                    totalPages={pages} 
                                    onReserve={setReservingCar}
                                    totalItems={total}
                                    showPublishedSubtotal={stockTab !== 'historial'}
                                    isFiltered={hasActiveFilters}
                                    filteredMetrics={filteredMetrics}
                                    filteredTotalUSD={filteredTotalUSD}
                                    filteredTotalARS={filteredTotalARS}
                                    canSeeCosts={canSeeCosts}
                                    canWrite={canWrite}
                                    canReserve={canReserve}
                                    onMandate={(vehicle) => { setStockTab('mandatos'); setSearchTerm(vehicle.dominio === 'S/D' ? vehicle.modelo : vehicle.dominio); }}
                                    hasActiveFilters={hasActiveFilters}
                                    onClearFilters={handleClearFilters}
                                    error={error}
                                    onRetry={() => refresh({
                                        page: pageNumber,
                                        limit: 20,
                                        search: debouncedSearch,
                                        status: filterStatus,
                                        brand: brandFilter,
                                        tab: stockTab,
                                        ml: mlFilter,
                                        catalog: catalogFilter,
                                        ownership: ownershipFilter
                                    })}
                                    onNewVehicle={() => { setEditingCar(null); setIsFormOpen(true); }}
                                />
                            </div>
                            <div className="block lg:hidden">
                                <StockMobileCards 
                                    data={filteredVehicles} 
                                    onEditML={setMlEditingCar} 
                                    onDelete={setDeletingCar} 
                                    onPrint={handlePrint} 
                                    currentPage={pageNumber}
                                    totalPages={pages}
                                    onReserve={setReservingCar}
                                    totalItems={total}
                                    showPublishedSubtotal={stockTab !== 'historial'}
                                    isFiltered={hasActiveFilters}
                                    filteredMetrics={filteredMetrics}
                                    filteredTotalUSD={filteredTotalUSD}
                                    filteredTotalARS={filteredTotalARS}
                                    canSeeCosts={canSeeCosts}
                                    canWrite={canWrite}
                                    canReserve={canReserve}
                                    onMandate={(vehicle) => { setStockTab('mandatos'); setSearchTerm(vehicle.dominio === 'S/D' ? vehicle.modelo : vehicle.dominio); }}
                                    hasActiveFilters={hasActiveFilters}
                                    onClearFilters={handleClearFilters}
                                    error={error}
                                    onRetry={() => refresh({
                                        page: pageNumber,
                                        limit: 20,
                                        search: debouncedSearch,
                                        status: filterStatus,
                                        brand: brandFilter,
                                        tab: stockTab,
                                        ml: mlFilter,
                                        catalog: catalogFilter,
                                        ownership: ownershipFilter
                                    })}
                                    onNewVehicle={() => { setEditingCar(null); setIsFormOpen(true); }}
                                />
                            </div>
                            <CrmPagination
                                disabled={isSwapping}
                                currentPage={pageNumber}
                                totalPages={pages}
                                totalItems={total}
                                onPageChange={setPageNumber}
                                limit={20}
                            />
                        </>
                    )}
                </div>
            </div>

            <VehicleFormModal
                isOpen={isFormOpen}
                onClose={() => { if (!savingVehicleRef.current) { setIsFormOpen(false); setEditingCar(null); } }}
                onSave={handleSaveVehicle}
                editingCar={editingCar}
                saving={isSavingVehicle}
            />

            <MandateStockModal
                isOpen={isMandateModalOpen}
                onClose={() => setIsMandateModalOpen(false)}
                onSave={async (data) => {
                    const token = localStorage.getItem('token');
                    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                    const baseUrl = process.env.NODE_ENV === 'production' ? '' : API_URL;
                    const res = await fetch(`${baseUrl}/api/admin/mandates`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(data)
                    });
                    if (!res.ok) {
                        const err = await res.json().catch(()=>({}));
                        throw new Error(err.error || 'Error al guardar');
                    }
                    toast.success('Mandato creado exitosamente');
                    fetchMandates();
                    if (data.createCar) {
                        if (typeof refresh === 'function') refresh();
                        else window.location.reload();
                    }
                }}
            />
            
            <StockImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={(count) => {
                    toast.success(`Se importaron ${count} vehículos correctamente.`);
                    if (typeof refresh === 'function') refresh();
                    else window.location.reload();
                }}
            />

            <MLActionModal
                isOpen={!!mlEditingCar}
                onClose={() => setMlEditingCar(null)}
                vehicle={mlEditingCar}
                onSave={() => {
                    setMlEditingCar(null);
                    if (typeof refresh === 'function') refresh();
                    else window.location.reload();
                }}
            />

            <VehicleDeleteModal
                isOpen={!!deletingCar}
                onClose={() => setDeletingCar(null)}
                vehicle={deletingCar}
                onSuccess={() => {
                    setDeletingCar(null);
                    if (typeof refresh === 'function') refresh();
                    else window.location.reload();
                }}
            />

            <ConfirmModal
                isOpen={confirmDeleteMandate.isOpen}
                onClose={() => setConfirmDeleteMandate({ isOpen: false, mandate: null })}
                onConfirm={async () => {
                    if (!confirmDeleteMandate.mandate) return;
                    try {
                        await deleteMandate(confirmDeleteMandate.mandate._id);
                        toast.success('Mandato eliminado');
                    } catch(e) {
                        toast.error('Error al eliminar');
                    }
                }}
                title="Eliminar Mandato"
                message="¿Seguro que deseas eliminar este mandato? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                isDestructive={true}
            />

            <ReservationModal
                isOpen={!!reservingCar}
                onClose={() => setReservingCar(null)}
                onSuccess={() => {
                    setReservingCar(null);
                    if (typeof refresh === 'function') refresh();
                    else window.location.reload();
                }}
                initialData={{
                    vehicleId: reservingCar?.id || reservingCar?._id,
                    vehicleName: `${reservingCar?.marca} ${reservingCar?.modelo} ${reservingCar?.version || ''} ${reservingCar?.year || ''}`.trim(),
                    agreedPrice: reservingCar?.precioPublicado || reservingCar?.precio,
                    agreedCurrency: reservingCar?.moneda || 'USD'
                }}
            />

            <VehicleFlyerPdf vehicle={selectedVehicleForPrint} />

        </div>
    );
}
