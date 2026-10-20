"use client";
import { useState, useMemo, useEffect } from 'react';
import { Download, Eye, FileText, Plus, ExternalLink } from 'lucide-react';

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
import Link from 'next/link';
import CrmPagination from '../../../components/crm/ui/CrmPagination';
import VehicleFlyerPdf from '../../../components/crm/stock/VehicleFlyerPdf';


export default function AdminStockPage() {
    const [pageNumber, setPageNumber] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('disponible');
    const [stockTab, setStockTab] = useState('stock');
    const [brandFilter, setBrandFilter] = useState('todas');
    const [mlFilter, setMlFilter] = useState('todas');
    const [selectedVehicleForPrint, setSelectedVehicleForPrint] = useState(null);

    const handlePrint = (carToPrint) => {
        setSelectedVehicleForPrint(carToPrint);
        setTimeout(() => {
            window.print();
            setSelectedVehicleForPrint(null);
        }, 150);
    };

    const { cars, loading, error, refresh, total, pages, summary: backendSummary, brands: backendBrands, swapCars, setCars, filteredTotalUSD, filteredTotalARS } = useAdminCars();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isMandateModalOpen, setIsMandateModalOpen] = useState(false);
    const [editingCar, setEditingCar] = useState(null);
    const [mlEditingCar, setMlEditingCar] = useState(null);
    const [deletingCar, setDeletingCar] = useState(null);
    const [reservingCar, setReservingCar] = useState(null);
    const [confirmDeleteMandate, setConfirmDeleteMandate] = useState({ isOpen: false, mandate: null });
    const { mandates, fetchMandates, deleteMandate } = useAdminMandates();
    const [dolarBlue, setDolarBlue] = useState(null);
    const [isDolarLoading, setIsDolarLoading] = useState(true);
    const [isSwapping, setIsSwapping] = useState(false);

    useEffect(() => {
        setIsDolarLoading(true);
        fetch('https://dolarapi.com/v1/dolares/blue')
            .then(res => res.json())
            .then(data => {
                if (data && data.venta) {
                    setDolarBlue(data.venta);
                }
            })
            .catch(err => console.error('Error fetching dolar blue:', err))
            .finally(() => setIsDolarLoading(false));
            
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
    }, [debouncedSearch, filterStatus, brandFilter, stockTab, mlFilter]);

    // Ejecuta la consulta únicamente cuando cambie la página o los filtros debounced
    useEffect(() => {
        refresh({
            page: pageNumber,
            limit: 20,
            search: debouncedSearch,
            status: filterStatus,
            brand: brandFilter,
            tab: stockTab,
            ml: mlFilter
        });
    }, [pageNumber, debouncedSearch, filterStatus, brandFilter, stockTab, mlFilter, refresh]);

    const handleSwap = async (index, direction) => {
        if (isSwapping) return;

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
                // Cross-page swap using direction parameter
                const success = await swapCars(currentId, undefined, direction);
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
                ml: mlFilter
            });
        }
    };

    const vehicles = useMemo(() => {
        if (!cars || cars.length === 0) return [];
        return cars.map(mapRealCarToCRM);
    }, [cars]);

    // Los indicadores globales provienen exclusivamente del backendSummary calculado sobre la colección completa
    // Nunca deben recalcularse sobre los 20 vehículos de la página actual ni sobre el subconjunto filtrado
    const stockSummary = useMemo(() => {
        if (backendSummary) {
            return {
                ...backendSummary,
                mandatos: mandates.length
            };
        }

        return {
            total: 0,
            disponibles: 0,
            reservados: 0,
            pausados: 0,
            consignaciones: 0,
            compartidos: 0,
            ceroKm: 0,
            mandatos: mandates.length,
            valorActivoUSD: 0,
            valorActivoARS: 0,
            capitalInvertidoUSD: 0,
            capitalInvertidoARS: 0,
            valorActivoInversionistasUSD: 0,
            valorActivoInversionistasARS: 0,
            capitalInvertidoInversionistasUSD: 0,
            capitalInvertidoInversionistasARS: 0,
            valorTotalUSD: 0,
            valorTotalARS: 0,
            costoTotalUSD: 0,
            costoTotalARS: 0
        };
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

    if (loading && cars.length === 0) {
        return (
            <div className="mx-auto flex min-h-[50vh] w-full max-w-7xl items-center justify-center p-4 md:p-6">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                    <span className="text-sm text-crm-fg-muted">Cargando stock real...</span>
                </div>
            </div>
        );
    }



    return (
        <div className="mx-auto w-full max-w-7xl p-4 pb-20 md:p-6 crm-no-print">
            <div className="flex flex-col gap-6">
                <CrmPageHeader 
                    title="Stock"
                    subtitle={`${stockSummary.disponibles} vehículos disponibles para vender`}
                    actions={
                        <>
                            <CrmButton variant="secondary" size="sm" className="gap-2 border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15">
                                <Eye size={14} />
                                Vista previa
                            </CrmButton>
                            <CrmButton variant="secondary" size="sm" className="gap-2" onClick={() => window.open('/catalogo', '_blank', 'noopener,noreferrer')}>
                                <ExternalLink size={14} /> Tu catálogo
                            </CrmButton>
                            <CrmButton variant="secondary" size="sm" className="gap-2" onClick={handleExportXLSX}>
                                <Download size={14} />
                                Exportar XLSX
                            </CrmButton>
                            <CrmButton variant="secondary" size="sm" className="gap-2" onClick={() => setIsImportModalOpen(true)}>
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
                            </CrmButton>
                        </>
                    }
                />

                <div className="flex flex-col gap-3 rounded-2xl border border-crm-border bg-crm-surface p-4 text-xs text-crm-fg-muted lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 font-bold">🚗</span>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-crm-fg-subtle block">Stock Disponible</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="font-bold text-base text-white">{stockSummary.disponibles}</span>
                                    <span className="text-[11px] text-crm-fg-muted">de {stockSummary.total} en stock</span>
                                </div>
                            </div>
                        </div>

                        <div className="border-l border-crm-border/60 pl-4">
                            <span className="text-[10px] uppercase font-bold text-crm-fg-subtle block">
                                Capital Agencia (Venta)
                            </span>
                            <div className="font-mono font-bold text-sm text-white">
                                USD {Number(stockSummary.valorActivoUSD || 0).toLocaleString('es-AR')}
                                {stockSummary.valorActivoARS > 0 && (
                                    <span className="text-xs text-crm-fg-muted font-normal"> · ARS {Number(stockSummary.valorActivoARS || 0).toLocaleString('es-AR')}</span>
                                )}
                            </div>
                            {dolarBlue && stockSummary.valorActivoARS > 0 && (
                                <span className="text-[10px] text-crm-fg-subtle block">
                                    (~ USD {Math.round((stockSummary.valorActivoUSD || 0) + (stockSummary.valorActivoARS / dolarBlue)).toLocaleString('es-AR')} equiv. Blue)
                                </span>
                            )}
                        </div>

                        {(stockSummary.capitalInvertidoUSD > 0 || stockSummary.capitalInvertidoARS > 0) && (
                            <div className="border-l border-crm-border/60 pl-4">
                                <span className="text-[10px] uppercase font-bold text-crm-fg-subtle block">
                                    Costo Invertido (Compra)
                                </span>
                                <div className="font-mono font-bold text-xs text-crm-fg">
                                    USD {Number(stockSummary.capitalInvertidoUSD || 0).toLocaleString('es-AR')}
                                    {stockSummary.capitalInvertidoARS > 0 && (
                                        <span className="text-[11px] text-crm-fg-muted font-normal"> · ARS {Number(stockSummary.capitalInvertidoARS || 0).toLocaleString('es-AR')}</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 border-t border-crm-border/60 pt-3 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-blue-400 block">
                                Inversionistas (Compartidos)
                            </span>
                            <div className="font-mono text-xs text-blue-300">
                                <span>Venta: USD {Number(stockSummary.valorActivoInversionistasUSD || 0).toLocaleString('es-AR')}</span>
                                {(stockSummary.capitalInvertidoInversionistasUSD > 0 || stockSummary.capitalInvertidoInversionistasARS > 0) && (
                                    <span className="text-blue-300/70 text-[10px] block">
                                        Costo: USD {Number(stockSummary.capitalInvertidoInversionistasUSD || 0).toLocaleString('es-AR')}
                                    </span>
                                )}
                            </div>
                        </div>
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
                        mlFilter={mlFilter}
                        setMlFilter={setMlFilter}
                        brandOptions={brandOptions}
                        counts={stockSummary}
                    />

                    {error ? (
                        <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 px-6 py-5 text-center mt-4">
                            <p className="m-0 text-sm font-bold text-crm-red">Error de conexión</p>
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
                                    ml: mlFilter
                                })}
                            >
                                Reintentar
                            </CrmButton>
                        </div>
                    ) : stockTab === 'mandatos' ? (
                        <div className="mt-4">
                            <MandateTable 
                                data={filteredMandates} 
                                onDelete={(m) => setConfirmDeleteMandate({ isOpen: true, mandate: m })}
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
                                    isSwapping={isSwapping} 
                                    currentPage={pageNumber} 
                                    totalPages={pages} 
                                    onReserve={setReservingCar}
                                    totalItems={total}
                                    filteredTotalUSD={filteredTotalUSD}
                                    filteredTotalARS={filteredTotalARS}
                                    dolarBlue={dolarBlue}
                                />
                            </div>
                            <div className="block lg:hidden">
                                <StockMobileCards 
                                    data={filteredVehicles} 
                                    onEditML={setMlEditingCar} 
                                    onDelete={setDeletingCar} 
                                    onPrint={handlePrint} 
                                    totalItems={total}
                                    filteredTotalUSD={filteredTotalUSD}
                                    filteredTotalARS={filteredTotalARS}
                                    dolarBlue={dolarBlue}
                                />
                            </div>
                            <CrmPagination
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
                onClose={() => { setIsFormOpen(false); setEditingCar(null); }}
                onSave={handleSaveVehicle}
                editingCar={editingCar}
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
