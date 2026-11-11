"use client";
import { useState, useMemo, useEffect, useRef } from 'react';
import { Download, Eye, FileText, Plus, ExternalLink, HelpCircle, AlertCircle, CheckCircle2, Info, Calculator, Filter } from 'lucide-react';

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
import CapitalSummarySection from '../../../components/crm/stock/CapitalSummarySection';
import StockCommercialCalculator from '../../../components/crm/stock/StockCommercialCalculator';
import StockCalculationModal from '../../../components/crm/stock/StockCalculationModal';
import { prepareVehicleImageOrder } from '../../../services/vehicleImageUpload';


function formatARS(amount) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0
    }).format(Math.round(amount || 0));
}

function formatUSD(amount) {
    return `USD ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(amount || 0))}`;
}

export default function AdminStockPage() {
    const [pageNumber, setPageNumber] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('disponible');
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
        (stockTab && stockTab !== 'stock')
    );

    const handleClearFilters = () => {
        setSearchTerm('');
        setDebouncedSearch('');
        setBrandFilter('todas');
        setMlFilter('todas');
        setCatalogFilter('all');
        setFilterStatus('');
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
        swapCars, setCars, filteredTotalUSD, filteredTotalARS,
        filteredPropioARS, filteredInversionistasARS,
        filteredPropioUSD, filteredInversionistasUSD
    } = useAdminCars();
    const [showCalculationModal, setShowCalculationModal] = useState(false);
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
    }, [debouncedSearch, filterStatus, brandFilter, stockTab, mlFilter, catalogFilter]);

    // Ejecuta la consulta únicamente cuando cambie la página o los filtros debounced
    useEffect(() => {
        refresh({
            page: pageNumber,
            limit: 20,
            search: debouncedSearch,
            status: filterStatus,
            brand: brandFilter,
            tab: stockTab,
            ml: mlFilter,
            catalog: catalogFilter
        });
    }, [pageNumber, debouncedSearch, filterStatus, brandFilter, stockTab, mlFilter, catalogFilter, refresh]);

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
                    catalog: catalogFilter
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
                catalog: catalogFilter
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
            costoTotalARS: 0,
            disponiblesComputadosCount: 0,
            disponiblesTotalCount: 0
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

    if (loading && cars.length === 0) {
        return (
            <div className="flex min-h-[50vh] w-full items-center justify-center p-4 md:p-6">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                    <span className="text-sm text-crm-fg-muted">Cargando stock real...</span>
                </div>
            </div>
        );
    }



    return (
        <div className="w-full min-w-0 p-3 pb-20 sm:p-4 xl:p-5 2xl:p-6 crm-no-print">
            <div className="flex flex-col gap-6">
                <CrmPageHeader 
                    title="Stock"
                    subtitle={`${total} vehículos en listado actual · ${stockSummary.disponibles} disponibles para vender (${stockSummary.total} en stock activo total)`}
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

                {/* BLOQUE DE TARJETAS COMERCIALES: EXCLUSIVAMENTE VEHÍCULOS DISPONIBLES */}
                <div className="space-y-4">
                    {/* Tarjetas Principales: 1. Valor total disponible | 2. Mi participación | 3. Participación de inversores */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 1. VALOR TOTAL DISPONIBLE */}
                        <div className="rounded-2xl border border-crm-border bg-gradient-to-b from-crm-surface to-crm-surface/80 p-5 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-subtle">
                                        1. Valor total disponible
                                    </span>
                                    <span
                                        className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20"
                                        title={`Valorados: ${stockSummary.disponiblesComputadosCount ?? (stockSummary.disponibles ? Math.max(0, stockSummary.disponibles - (stockSummary.consignacionesSoloCount || 0) - (stockSummary.tercerosCount || 0)) : 0)} de ${stockSummary.disponiblesTotalCount ?? stockSummary.disponibles ?? 0} disponibles totales`}
                                    >
                                        Disponibles ({stockSummary.disponiblesComputadosCount ?? (stockSummary.disponibles ? Math.max(0, stockSummary.disponibles - (stockSummary.consignacionesSoloCount || 0) - (stockSummary.tercerosCount || 0)) : 0)} de {stockSummary.disponiblesTotalCount ?? stockSummary.disponibles ?? 0} unid.)
                                    </span>
                                </div>
                                <p className="text-xs text-crm-fg-muted mb-3 leading-relaxed">
                                    Precio publicado completo de vehículos propios y compartidos disponibles (excluye consignaciones y terceros informados aparte).
                                </p>
                                <div className="space-y-1">
                                    <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                                        {formatARS(stockSummary.valorTotalARS)}
                                    </div>
                                    {stockSummary.valorTotalUSD > 0 && (
                                        <div className="text-lg font-bold text-blue-300">
                                            {formatUSD(stockSummary.valorTotalUSD)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-crm-border/60 flex items-center justify-between text-[11px] text-crm-fg-muted">
                                <span>Base comercial</span>
                                <span className="font-semibold text-crm-fg">Precio de venta publicado</span>
                            </div>
                        </div>

                        {/* 2. MI PARTICIPACIÓN */}
                        <div className="rounded-2xl border border-crm-border bg-gradient-to-b from-crm-surface to-crm-surface/80 p-5 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-subtle">
                                        2. Mi participación
                                    </span>
                                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                                        100% Propios + 50% Cuota
                                    </span>
                                </div>
                                <p className="text-xs text-crm-fg-muted mb-3 leading-relaxed">
                                    Mi participación real (100% propios + 50% en compartidos; 0% en inversión de terceros).
                                </p>
                                <div className="space-y-1">
                                    <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-emerald-400">
                                        {formatARS(stockSummary.valorActivoARS)}
                                    </div>
                                    {stockSummary.valorActivoUSD > 0 && (
                                        <div className="text-lg font-bold text-emerald-300">
                                            {formatUSD(stockSummary.valorActivoUSD)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-crm-border/60 flex items-center justify-between text-[11px] text-crm-fg-muted">
                                <span>Participación sobre total</span>
                                <span className="font-semibold text-emerald-400">
                                    {stockSummary.valorTotalARS > 0
                                        ? `${(((stockSummary.valorActivoARS) / stockSummary.valorTotalARS) * 100).toFixed(1)}%`
                                        : '0%'}
                                </span>
                            </div>
                        </div>

                        {/* 3. PARTICIPACIÓN DE INVERSORES */}
                        <div className="rounded-2xl border border-crm-border bg-gradient-to-b from-crm-surface to-crm-surface/80 p-5 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-subtle">
                                        3. Participación de inversores
                                    </span>
                                    <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-400 border border-purple-500/20">
                                        Socios Inversores
                                    </span>
                                </div>
                                <p className="text-xs text-crm-fg-muted mb-3 leading-relaxed">
                                    Participación de inversionistas (50% en compartidos + 100% en autos de inversores).
                                </p>
                                <div className="space-y-1">
                                    <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-purple-300">
                                        {formatARS(stockSummary.valorActivoInversionistasARS)}
                                    </div>
                                    {stockSummary.valorActivoInversionistasUSD > 0 && (
                                        <div className="text-lg font-bold text-purple-300">
                                            {formatUSD(stockSummary.valorActivoInversionistasUSD)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-crm-border/60 flex items-center justify-between text-[11px] text-crm-fg-muted">
                                <span>Participación sobre total</span>
                                <span className="font-semibold text-purple-400">
                                    {stockSummary.valorTotalARS > 0
                                        ? `${(((stockSummary.valorActivoInversionistasARS) / stockSummary.valorTotalARS) * 100).toFixed(1)}%`
                                        : '0%'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Barra de Coherencia Matemática y Botón Ver Cálculo */}
                    <div className="rounded-xl border border-crm-border bg-crm-surface p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                            <CheckCircle2 size={15} className="shrink-0" />
                            <span>
                                <strong>Suma aritmética exacta:</strong> Valor Total ({formatARS(stockSummary.valorTotalARS)}) = Mi Participación ({formatARS(stockSummary.valorActivoARS)}) + Inversores ({formatARS(stockSummary.valorActivoInversionistasARS)})
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <CrmButton
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCalculationModal(true)}
                                className="gap-1.5 text-xs font-bold text-blue-400 border-blue-500/30 hover:bg-blue-500/10 shadow-sm"
                            >
                                <Calculator size={14} />
                                Ver cálculo
                            </CrmButton>
                        </div>
                    </div>

                    {/* Subtotal del Filtro Actual (Identificado aparte para no confundirse con el total disponible) */}
                    {(searchTerm || catalogFilter !== 'all' || (mlFilter && mlFilter !== 'todas') || (brandFilter && brandFilter !== 'todas') || (filterStatus && filterStatus !== 'todos' && filterStatus !== 'disponible') || (stockTab && stockTab !== 'stock')) && (
                        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-in fade-in">
                            <div className="flex items-center gap-2 text-blue-300">
                                <Filter size={15} className="shrink-0 text-blue-400" />
                                <span>
                                    <strong>Subtotal del filtro actual ({total} vehículos):</strong> Total <strong>{formatARS(filteredTotalARS)}</strong> | Mi parte: <strong>{formatARS(filteredPropioARS)}</strong> | Inversionistas: <strong>{formatARS(filteredInversionistasARS)}</strong>
                                </span>
                            </div>
                            <span className="text-[11px] text-blue-200/70 font-sans">
                                * Las 3 tarjetas superiores reflejan siempre el total global de disponibles.
                            </span>
                        </div>
                    )}

                    {/* Información Secundaria: Consignaciones y Costo Invertido */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* Consignaciones (Aparte) */}
                        <div className="rounded-xl border border-crm-border bg-crm-surface/60 p-3.5 flex items-start gap-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 font-bold">
                                📋
                            </div>
                            <div className="space-y-0.5 flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-crm-fg uppercase tracking-wider text-[11px]">
                                        Consignaciones (Información aparte)
                                    </span>
                                    <span className="font-bold text-amber-300">
                                        {stockSummary.consignaciones} {stockSummary.consignaciones === 1 ? 'vehículo' : 'vehículos'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-crm-fg-muted leading-relaxed">
                                    Valor publicado: {formatARS(stockSummary.consignacionesValorARS || 0)}{stockSummary.consignacionesValorUSD > 0 ? ` · ${formatUSD(stockSummary.consignacionesValorUSD)}` : ''}.
                                    {' '}Excluidas del bloque patrimonial principal: no constituyen capital propio de la agencia ni inversión de socios.
                                </p>
                            </div>
                        </div>

                        {/* Costo Invertido de Compra */}
                        <div className="rounded-xl border border-crm-border bg-crm-surface/60 p-3.5 flex items-start gap-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-500/15 text-slate-300 font-bold">
                                💼
                            </div>
                            <div className="space-y-0.5 flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-crm-fg uppercase tracking-wider text-[11px]">
                                        Costo Invertido de Adquisición
                                    </span>
                                    <span className="font-bold text-white">
                                        {formatARS(stockSummary.capitalInvertidoARS || 0)}{stockSummary.capitalInvertidoUSD > 0 ? ` · ${formatUSD(stockSummary.capitalInvertidoUSD)}` : ''}
                                    </span>
                                </div>
                                <p className="text-[11px] text-crm-fg-muted leading-relaxed">
                                    Costo real de compra de la cuota de AutoSporting. Información secundaria de costo; no representa ganancia ni dinero disponible en caja.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Alerta de Datos Incompletos / Pendientes de Revisar */}
                    {(stockSummary.inconsistencias?.missingPriceCount > 0 || stockSummary.inconsistencias?.missingCostCount > 0 || stockSummary.sinEstado > 0) && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-center justify-between text-xs text-amber-200">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={15} className="text-amber-400 shrink-0" />
                                <span>
                                    <strong>Atención de datos:</strong> Se detectaron {stockSummary.inconsistencias?.missingPriceCount || 0} unidades con precio pendiente de revisión, {stockSummary.inconsistencias?.missingCostCount || 0} sin costo registrado{stockSummary.sinEstado > 0 ? ` y ${stockSummary.sinEstado} sin estado asignado` : ''}. Los importes no inventan valores ni asumen datos faltantes como definitivos.
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* TABLA Y CALCULADORA COMERCIAL DE STOCK A PRECIOS DE VENTA */}
                <StockCommercialCalculator  />

                {/* CONCILIACIÓN PATRIMONIAL INTEGRAL (STOCK + CAJA + CARTERA − DEUDAS) */}
                <div className="border-t border-crm-border/60 pt-6">
                    <div className="mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-subtle">
                            Módulo Adicional de Tesorería Patrimonial:
                        </span>
                    </div>
                    <CapitalSummarySection />
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
                        catalogFilter={catalogFilter}
                        setCatalogFilter={setCatalogFilter}
                        disabled={isSwapping}
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
                                    ml: mlFilter,
                                    catalog: catalogFilter
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
                                    isSwapping={isSwapping || loading}
                                    currentPage={pageNumber} 
                                    totalPages={pages} 
                                    onReserve={setReservingCar}
                                    totalItems={total}
                                    filteredTotalUSD={filteredTotalUSD}
                                    filteredTotalARS={filteredTotalARS}
                                    dolarBlue={dolarBlue}
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
                                        catalog: catalogFilter
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
                                    totalItems={total}
                                    filteredTotalUSD={filteredTotalUSD}
                                    filteredTotalARS={filteredTotalARS}
                                    dolarBlue={dolarBlue}
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
                                        catalog: catalogFilter
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

            <StockCalculationModal
                isOpen={showCalculationModal}
                onClose={() => setShowCalculationModal(false)}
            />
        </div>
    );
}
