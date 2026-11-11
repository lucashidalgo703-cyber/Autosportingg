"use client";
import { useState, useMemo, useEffect, useRef } from 'react';
import { Download, FileText, Plus, ExternalLink, HelpCircle, AlertCircle, CheckCircle2, Info, Calculator, Filter } from 'lucide-react';

import CrmButton from '../../../components/crm/ui/CrmButton';
import CrmPageHeader from '../../../components/crm/ui/CrmPageHeader';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';
import StockFilters from '../../../components/crm/stock/StockFilters';
import StockTable from '../../../components/crm/stock/StockTable';
import StockMobileCards from '../../../components/crm/stock/StockMobileCards';
import StockCards from '../../../components/crm/stock/StockCards';
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
import { STOCK_FILTER_KEYS } from '../../../utils/stockFilters.js';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { buildStockLocation, readStockLocation, STOCK_WORKBENCH_DEFAULTS } from '../../../utils/stockNavigation.js';
import { canReserveVehicle } from '../../../utils/vehicleDetail.js';
import StockCommercialList from '../../../components/crm/stock/StockCommercialList';
import VehicleQuickDrawer from '../../../components/crm/stock/VehicleQuickDrawer';
import VehicleDetailDialog from '../../../components/crm/stock/VehicleDetailDialog';
import VehicleComparisonDialog from '../../../components/crm/stock/VehicleComparisonDialog';
import StockOverviewStrip from '../../../components/crm/stock/StockOverviewStrip';
import StockAttentionView from '../../../components/crm/stock/StockAttentionView';
import StockDemandView from '../../../components/crm/stock/StockDemandView';

const EMPTY_STOCK_FILTERS = { model: '', transmission: '', currency: '', minPrice: '', maxPrice: '', minKm: '', maxKm: '', minDays: '', maxDays: '', minYear: '', maxYear: '', location: '', responsible: '', origin: '', stagnant: false, review: false, sort: 'manual' };


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
    const { user, token } = useAuth();
    const [pageNumber, setPageNumber] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('disponible');
    const [stockTab, setStockTab] = useState('stock');
    const [stockView, setStockView] = useState('inventario');
    const [workbenchFilters, setWorkbenchFilters] = useState({ ...STOCK_WORKBENCH_DEFAULTS });
    const [browserOnline, setBrowserOnline] = useState(true);
    const [initialVehicleClient, setInitialVehicleClient] = useState(null), [prefillClientId, setPrefillClientId] = useState(null);
    const prefillRequest = useRef(null);
    const [brandFilter, setBrandFilter] = useState('todas');
    const [mlFilter, setMlFilter] = useState('todas');
    const [advancedFilters, setAdvancedFilters] = useState({ ...EMPTY_STOCK_FILTERS });
    const [debouncedFilters, setDebouncedFilters] = useState({ ...EMPTY_STOCK_FILTERS });
    const [inventoryLayout, setInventoryLayout] = useState('list');
    const [navigationReady, setNavigationReady] = useState(false);
    const [navigationRevision, setNavigationRevision] = useState(0);
    const skipPageResetRef = useRef(false);
    const [selectedVehicleForPrint, setSelectedVehicleForPrint] = useState(null);
    const [quickVehicle, setQuickVehicle] = useState(null);
    const [detailConfig, setDetailConfig] = useState(null);
    const [comparison, setComparison] = useState([]);
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);
    const [savedViews, setSavedViews] = useState([]);
    const [viewUsers, setViewUsers] = useState([]);
    const [commercialSummaries, setCommercialSummaries] = useState({});

    const hasActiveFilters = Boolean(
        searchTerm.trim() ||
        debouncedSearch.trim() ||
        (brandFilter && brandFilter !== 'todas') ||
        (mlFilter && mlFilter !== 'todas') ||
        (filterStatus && filterStatus !== 'todos' && filterStatus !== '') ||
        (stockTab && stockTab !== 'stock') || Object.entries(advancedFilters).some(([key, value]) => key !== 'sort' && Boolean(value))
    );

    const handleClearFilters = () => {
        setSearchTerm('');
        setDebouncedSearch('');
        setBrandFilter('todas');
        setMlFilter('todas');
        setFilterStatus('');
        setStockTab('stock');
        setAdvancedFilters({ ...EMPTY_STOCK_FILTERS });
        setDebouncedFilters({ ...EMPTY_STOCK_FILTERS });
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
        summary: backendSummary, brands: backendBrands, models: backendModels, isOffline: snapshotOffline,
        swapCars, setCars, filteredTotalUSD, filteredTotalARS,
        filteredPropioARS, filteredInversionistasARS,
        filteredPropioUSD, filteredInversionistasUSD
    } = useAdminCars();
    const isOffline = snapshotOffline || !browserOnline;
    const canWriteStock = hasPermission(user, PERMISSIONS.STOCK_WRITE) && !isOffline;
    const canReserve = hasPermission(user, PERMISSIONS.RESERVAS_WRITE) && !isOffline;
    const [showCalculationModal, setShowCalculationModal] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isMandateModalOpen, setIsMandateModalOpen] = useState(false);
    const [editingCar, setEditingCar] = useState(null);
    const [mlEditingCar, setMlEditingCar] = useState(null);
    const [deletingCar, setDeletingCar] = useState(null);
    const [reservingCar, setReservingCar] = useState(null);
    const [confirmDeleteMandate, setConfirmDeleteMandate] = useState({ isOpen: false, mandate: null });
    const { mandates, fetchMandates, deleteMandate, loading: mandatesLoading, error: mandatesError } = useAdminMandates();
    const [dolarBlue, setDolarBlue] = useState(null);
    const [isDolarLoading, setIsDolarLoading] = useState(true);
    const [isSwapping, setIsSwapping] = useState(false);

    useEffect(() => {
        setQuickVehicle(null); setDetailConfig(null); setComparison([]); setIsComparisonOpen(false); setSavedViews([]); setViewUsers([]); setIsFormOpen(false); setEditingCar(null); setMlEditingCar(null); setDeletingCar(null); setReservingCar(null); setInitialVehicleClient(null); setPrefillClientId(null); setConfirmDeleteMandate({ isOpen: false, mandate: null }); prefillRequest.current?.abort();
        if (!token) return;
        const controller = new AbortController();
        Promise.allSettled([
            fetch('/api/admin/stock-views', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal }).then(async response => { if (!response.ok) return; const data = await response.json(); if (!controller.signal.aborted) setSavedViews(data.views || []); }),
            fetch('/api/admin/users/active', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal }).then(async response => { if (!response.ok) return; const data = await response.json(); if (!controller.signal.aborted) setViewUsers(Array.isArray(data) ? data : []); })
        ]);
        return () => controller.abort();
    }, [token]);

    useEffect(() => { const update = () => setBrowserOnline(navigator.onLine); update(); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
    const canReadClients = hasPermission(user, PERMISSIONS.CLIENTES_READ);
    useEffect(() => {
        if (!prefillClientId || !token) return;
        if (!canWriteStock || !canReadClients) { toast.error(isOffline ? 'Reconectate para cargar una consignación desde la ficha del cliente.' : 'Necesitás permisos de edición de Stock y consulta de Clientes.'); setPrefillClientId(null); return; }
        const controller = new AbortController(); prefillRequest.current = controller;
        const base = process.env.NODE_ENV === 'production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        fetch(`${base}/api/admin/clients/${prefillClientId}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' }).then(async response => { const client = await response.json(); if (!response.ok) throw new Error(client.message || 'No se pudo cargar el cliente.'); return client; }).then(client => {
            if (controller.signal.aborted || localStorage.getItem('token') !== token) return;
            setEditingCar(null); setInitialVehicleClient({ _id: client._id, fullName: client.fullName, phone: client.phone || '', email: client.email || '' }); setIsFormOpen(true); setPrefillClientId(null);
        }).catch(failure => { if (!controller.signal.aborted) { toast.error(failure.message); setPrefillClientId(null); } });
        return () => controller.abort();
    }, [prefillClientId, token, canWriteStock, canReadClients, isOffline]);

    const openVehicleDetail = (vehicle, section = 'resumen', activityTab, initialAction) => {
        setQuickVehicle(null); setDetailConfig({ vehicle, section, activityTab, initialAction });
    };
    const openWorkbenchVehicle = (car, section = 'resumen', activityTab) => openVehicleDetail(mapRealCarToCRM(car), section, activityTab);
    const toggleComparison = vehicle => {
        if (comparison.some(item => item.id === vehicle.id)) setComparison(previous => previous.filter(item => item.id !== vehicle.id));
        else if (comparison.length >= 4) toast('Podés comparar hasta cuatro vehículos.');
        else setComparison(previous => [...previous, vehicle]);
    };

    const saveStockView = async name => {
        const response = await fetch('/api/admin/stock-views', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name, filters: { ...currentStockFilters, ...advancedFilters, search: searchTerm, page: 1, vista: stockView, presentacion: inventoryLayout } }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'No se pudo guardar la búsqueda.');
        if (localStorage.getItem('token') !== token) return;
        setSavedViews(previous => [data, ...previous.filter(view => view._id !== data._id)]); toast.success('Vista guardada para tu usuario');
    };
    const deleteStockView = async view => {
        const response = await fetch(`/api/admin/stock-views/${view._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.message || 'No se pudo eliminar la búsqueda.'); }
        if (localStorage.getItem('token') === token) setSavedViews(previous => previous.filter(item => item._id !== view._id));
    };
    const applyStockView = view => {
        const stored = view.filters || {};
        setStockView(stored.vista === 'capital' ? 'capital' : 'inventario');
        setInventoryLayout(['list', 'cards', 'detailed'].includes(stored.presentacion) ? stored.presentacion : 'list');
        setSearchTerm(stored.search || ''); setDebouncedSearch(stored.search || ''); setFilterStatus(stored.status || ''); setBrandFilter(stored.brand || 'todas'); setMlFilter(stored.ml || 'todas'); setStockTab(stored.tab || 'stock');
        const advanced = Object.fromEntries(Object.keys(EMPTY_STOCK_FILTERS).map(key => [key, stored[key] ?? EMPTY_STOCK_FILTERS[key]]));
        setAdvancedFilters(advanced); setDebouncedFilters(advanced); setPageNumber(1);
    };

    useEffect(() => {
        const readLocation = () => {
            const saved = readStockLocation(window.location.search);
            skipPageResetRef.current = true;
            setStockView(saved.view);
            setWorkbenchFilters(saved.workbench);
            const query = new URLSearchParams(window.location.search);
            if (query.get('crear') === 'consignacion' && /^[a-f\d]{24}$/i.test(query.get('cliente') || '')) setPrefillClientId(query.get('cliente'));
            setInventoryLayout(saved.layout);
            setSearchTerm(saved.filters.search);
            setDebouncedSearch(saved.filters.search);
            setFilterStatus(saved.filters.status);
            setBrandFilter(saved.filters.brand);
            setStockTab(saved.filters.tab);
            setMlFilter(saved.filters.ml);
            setAdvancedFilters(saved.advanced);
            setDebouncedFilters(saved.advanced);
            setPageNumber(saved.filters.page);
            setNavigationRevision(value => value + 1);
            setNavigationReady(true);
            if (saved.error) toast.error(`No se pudieron recuperar los filtros: ${saved.error}`);
        };
        readLocation();
        window.addEventListener('popstate', readLocation);
        return () => window.removeEventListener('popstate', readLocation);
    }, []);

    const changeStockView = (view) => {
        setStockView(view);
    };

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
            setDebouncedFilters(advancedFilters);
        }, 350);
        return () => clearTimeout(handler);
    }, [searchTerm, advancedFilters]);

    // Cuando cambian los filtros de búsqueda o estado, reiniciamos a la página 1
    useEffect(() => {
        if (!navigationReady) return;
        if (skipPageResetRef.current) { skipPageResetRef.current = false; return; }
        setPageNumber(1);
    }, [debouncedSearch, filterStatus, brandFilter, stockTab, mlFilter, debouncedFilters, navigationReady, navigationRevision]);

    const currentStockFilters = useMemo(() => ({
        page: pageNumber, limit: 20, search: debouncedSearch, status: filterStatus,
        brand: brandFilter, tab: stockTab, ml: mlFilter, ...debouncedFilters
    }), [pageNumber, debouncedSearch, filterStatus, brandFilter, stockTab, mlFilter, debouncedFilters]);

    // Ejecuta la consulta únicamente cuando cambie la página o los filtros debounced
    useEffect(() => {
        if (navigationReady && !['hoy', 'demanda'].includes(stockView)) refresh(currentStockFilters);
    }, [currentStockFilters, refresh, navigationReady, stockView]);

    const stockReturnTo = useMemo(() => {
        try { return buildStockLocation(currentStockFilters, stockView, inventoryLayout, workbenchFilters); }
        catch { return '/admin/stock'; }
    }, [currentStockFilters, stockView, inventoryLayout, workbenchFilters]);

    useEffect(() => {
        if (!navigationReady) return;
        try {
            const location = buildStockLocation(currentStockFilters, stockView, inventoryLayout, workbenchFilters);
            if (location !== window.location.pathname + window.location.search) {
                window.history.replaceState(window.history.state, '', location);
            }
        } catch { /* El formulario conserva el rango inválido para corregirlo. */ }
    }, [currentStockFilters, stockView, inventoryLayout, navigationReady, workbenchFilters]);

    const handleSwap = async (index, direction) => {
        if (!canWriteStock || isSwapping || advancedFilters.sort !== 'manual' || isOffline) return;

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

    useEffect(() => {
        setCommercialSummaries({});
        if (!token || isOffline || !vehicles.length || inventoryLayout !== 'list') return;
        const controller = new AbortController();
        const ids = vehicles.map(vehicle => vehicle.id).filter(Boolean).join(',');
        fetch(`/api/admin/stock/commercial-summary?${new URLSearchParams({ ids })}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' })
            .then(async response => { if (!response.ok) return; const data = await response.json(); if (!controller.signal.aborted) setCommercialSummaries(data.summaries || {}); }).catch(() => {});
        return () => controller.abort();
    }, [vehicles, token, isOffline, inventoryLayout]);

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
        setInitialVehicleClient(null);
        if (!canWriteStock) return;
        setEditingCar(null);
        setIsFormOpen(true);
    };

    const handleNewMandate = () => {
        if (!canWriteStock) return;
        setIsMandateModalOpen(true);
    };

    const handleExportXLSX = async (filtered = false) => {
        if (isOffline) { toast.error('Conectate para exportar el stock completo o la vista filtrada.'); return; }
        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : API_URL;
            
            toast.loading('Generando archivo XLSX...', { id: 'export-xlsx' });
            
            const params = new URLSearchParams();
            if (filtered) for (const key of STOCK_FILTER_KEYS) {
                const value = currentStockFilters[key];
                if (value !== undefined && value !== null) params.set(key, String(value));
            }
            const res = await fetch(`${baseUrl}/api/admin/cars/export${filtered ? `?${params}` : ''}`, {
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
        let loadingToast;
        try {
            if (!canWriteStock) throw new Error('Necesitás conexión y permiso para editar el stock.');
            formData = { ...formData };
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
                    return false;
                }
            }

            // Preservar estado agencyOwned si está activado
            if (formData.agencyOwned) {
                formData.consignedBy = '';
            }

            const token = localStorage.getItem('token');
            if (!token) throw new Error('Tu sesión no está disponible. Volvé a iniciar sesión.');

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
            
            if (isEditing && Array.isArray(files)) {
                payload.append('imageOrder', JSON.stringify(imageOrder));
            }

            loadingToast = toast.loading(isEditing ? 'Actualizando vehículo...' : 'Creando vehículo...');

            const res = await fetch(endpoint, {
                method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: payload
            });

            toast.dismiss(loadingToast);

            if (!res.ok) {
                const errData = await res.json().catch(()=>({}));
                const error = new Error(errData.message || 'Error al guardar el vehículo');
                error.errors = errData.errors;
                error.code = errData.code;
                error.status = res.status;
                throw error;
            }

            const savedVehicle = await res.json();
            toast.success(isEditing ? 'Vehículo actualizado' : 'Vehículo creado exitosamente');
            setIsFormOpen(false);
            setEditingCar(null);
            setInitialVehicleClient(null);
            if (typeof refresh === 'function') {
                refresh();
            } else {
                // fallback to page reload if refresh is not available from useAdminCars
                window.location.reload();
            }
            return savedVehicle;
        } catch (error) {
            console.error("Save vehicle error:", error);
            toast.error(error.message || 'Error al guardar el vehículo');
            throw error;
        } finally {
            if (loadingToast) toast.dismiss(loadingToast);
        }
    };

    if (!navigationReady || loading && cars.length === 0 && !['hoy', 'demanda'].includes(stockView)) {
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
        <div className="mx-auto w-full max-w-7xl p-4 pb-20 md:pb-4 crm-no-print">
            <div className="flex flex-col gap-6">
                <CrmPageHeader 
                    compact
                    title="Stock"
                    subtitle={['hoy', 'demanda'].includes(stockView) ? 'Inventario, preparación y atención comercial' : isOffline ? `${total} vehículos en la instantánea disponible sin conexión` : `${total} vehículos en listado actual · ${stockSummary.disponibles} disponibles para vender (${stockSummary.total} en stock activo total)`}
                    actions={
                        <>
                            <CrmButton variant="secondary" size="sm" className="gap-2" onClick={() => window.open('/catalogo', '_blank', 'noopener,noreferrer')}>
                                <ExternalLink size={14} /> Tu catálogo
                            </CrmButton>
                            <CrmButton variant="secondary" size="sm" className="gap-2" onClick={() => handleExportXLSX(false)} disabled={isOffline}>
                                <Download size={14} />
                                Exportar todo XLSX
                            </CrmButton>
                            {canWriteStock && <CrmButton variant="secondary" size="sm" className="gap-2" onClick={() => setIsImportModalOpen(true)}>
                                <FileText size={14} />
                                Importar XLSX
                            </CrmButton>}
                            {canWriteStock && <CrmButton variant="primary" size="sm" onClick={handleNewMandate} className="gap-2 bg-blue-600 hover:bg-blue-700">
                                <Plus size={14} />
                                Nuevo mandato + Stock
                            </CrmButton>}
                            {canWriteStock && <CrmButton variant="primary" size="sm" onClick={handleNewVehicle} className="gap-2">
                                <Plus size={14} />
                                Nuevo vehículo
                            </CrmButton>}
                        </>
                    }
                />

                <nav aria-label="Vistas de Stock" className="flex flex-wrap gap-x-5 gap-y-1 border-b border-crm-border">
                    {[
                        { id: 'stock', label: 'Stock general', view: 'inventario' }, { id: 'hoy', label: 'Para resolver hoy', view: 'hoy' },
                        { id: 'consignaciones', label: 'Consignaciones', view: 'inventario' }, { id: 'cero_km', label: '0 km', view: 'inventario' },
                        { id: 'mandatos', label: 'Mandatos', view: 'inventario' }, { id: 'demanda', label: 'Demanda', view: 'demanda' },
                        { id: 'compartidos', label: 'Compartidos', view: 'inventario' }, { id: 'capital', label: 'Capital e inversores', view: 'capital' }
                    ].map(item => {
                        const active = item.view === 'inventario' ? stockView === 'inventario' && stockTab === item.id : stockView === item.view;
                        return <button key={item.id} type="button" aria-pressed={active} onClick={() => { setStockView(item.view); if (item.view === 'inventario') { setStockTab(item.id); setPageNumber(1); } }} className={'inline-flex min-h-10 items-center border-0 border-b-2 bg-transparent px-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red ' + (active ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted hover:text-crm-fg')}>{item.label}</button>;
                    })}
                </nav>
                {stockView !== 'capital' && <StockOverviewStrip key={token || 'signed-out'} />}
                {stockView === 'hoy' && <StockAttentionView filters={workbenchFilters} onChange={patch => setWorkbenchFilters(previous => ({ ...previous, ...patch }))} onOpenVehicle={openWorkbenchVehicle} onOpenMandates={() => { setStockView('inventario'); setStockTab('mandatos'); setPageNumber(1); }} />}
                {stockView === 'demanda' && <StockDemandView filters={workbenchFilters} onChange={patch => setWorkbenchFilters(previous => ({ ...previous, ...patch }))} onOpenVehicle={openWorkbenchVehicle} />}

                {stockView === 'capital' && (
                isOffline ? <section id="stock-capital" aria-label="Capital e inversores" className="rounded-xl border border-crm-border bg-crm-surface p-5"><h2 className="m-0 text-base font-semibold text-crm-fg">Capital no disponible sin conexión</h2><p className="text-sm text-crm-fg-muted">Conectate para consultar el resumen patrimonial y las participaciones vigentes. El inventario guardado sigue disponible en la vista Inventario.</p><CrmButton type="button" variant="secondary" size="sm" onClick={() => changeStockView('inventario')}>Volver a Inventario</CrmButton></section> :
                <section id="stock-capital" aria-label="Capital e inversores" className="space-y-6">
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
                    {(searchTerm || (brandFilter && brandFilter !== 'todas') || (filterStatus && filterStatus !== 'todos' && filterStatus !== 'disponible') || (stockTab && stockTab !== 'stock')) && (
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
                </section>
                )}

                {stockView === 'inventario' && (
                <div id="stock-inventario" className="flex min-w-0 flex-col">
                    <StockFilters
                        showTabs={false}
                            savedViews={savedViews}
                            onSaveView={saveStockView}
                            onApplyView={applyStockView}
                            onDeleteView={deleteStockView}
                            users={viewUsers}
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
                        filters={advancedFilters}
                        setFilters={setAdvancedFilters}
                        modelOptions={backendModels}
                        onClearFilters={handleClearFilters}
                        brandOptions={brandOptions}
                        counts={stockSummary}
                    />
                    {isOffline && <p role="status" className="m-0 mt-3 rounded-lg border border-amber-500/30 px-3 py-2 text-sm text-amber-300">Sin conexión: filtros y páginas sobre la instantánea guardada. Los saldos globales y la exportación requieren conexión.</p>}
                    {stockTab !== 'mandatos' && <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-crm-fg-muted">{total} vehículos</span><button type="button" className="h-8 rounded-lg border border-crm-border bg-crm-surface px-3 text-xs font-medium text-crm-fg disabled:opacity-40" disabled={loading || isOffline || Boolean(error)} onClick={() => handleExportXLSX(true)}>Exportar vista XLSX</button></div>
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <label className="flex min-w-0 items-center gap-2 text-xs text-crm-fg-muted">Ordenar
                            <select aria-label="Orden del inventario" value={advancedFilters.sort} onChange={(event) => setAdvancedFilters(previous => ({ ...previous, sort: event.target.value }))} className="h-8 min-w-0 max-w-full rounded-lg border border-crm-border bg-crm-surface px-2 text-xs text-crm-fg">
                                <option value="manual">Orden del catálogo (manual)</option><option value="recent">Últimos ingresos</option><option value="oldest">Más antiguos</option><option value="price_asc">Precio menor (por moneda)</option><option value="price_desc">Precio mayor (por moneda)</option><option value="year_desc">Año: más nuevos</option><option value="km_asc">Menor kilometraje</option><option value="brand_model">Marca y modelo</option>
                            </select></label>
                            <nav aria-label="Presentación del inventario" className="flex items-center rounded-lg border border-crm-border p-0.5">{[['list', 'Lista'], ['cards', 'Tarjetas'], ['detailed', 'Tabla detallada']].map(([key, label]) => <button key={key} type="button" aria-pressed={inventoryLayout === key} onClick={() => setInventoryLayout(key)} className={`h-8 whitespace-nowrap rounded-md px-2.5 text-xs font-medium ${inventoryLayout === key ? 'bg-crm-red text-white' : 'text-crm-fg-muted hover:text-crm-fg'}`}>{label}</button>)}</nav>
                        </div>
                    </div>}

                    {(stockTab === 'mandatos' ? mandatesError : error) ? (
                        <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 px-6 py-5 text-center mt-4">
                            <p className="m-0 text-sm font-bold text-crm-red">Error de conexión</p>
                            <p className="m-0 mt-2 text-sm text-crm-fg-muted">{stockTab === 'mandatos' ? mandatesError : error}</p>
                            <CrmButton 
                                variant="secondary" 
                                size="sm" 
                                className="mt-4 gap-2 border-crm-red/30 bg-crm-red/10 text-crm-red hover:bg-crm-red/15" 
                                onClick={() => stockTab === 'mandatos' ? fetchMandates() : refresh(currentStockFilters)}
                            >
                                Reintentar
                            </CrmButton>
                        </div>
                    ) : stockTab === 'mandatos' ? (
                        <div className="mt-4">
                            {mandatesLoading && <p role="status" className="text-xs text-crm-fg-muted">Actualizando mandatos…</p>}
                            <MandateTable 
                                data={filteredMandates} 
                                onDelete={canWriteStock ? (m) => setConfirmDeleteMandate({ isOpen: true, mandate: m }) : undefined}
                            />
                        </div>
                    ) : (
                        <>
                            {inventoryLayout === 'list' ? <StockCommercialList data={filteredVehicles} summaries={commercialSummaries} onQuickView={setQuickVehicle} onOpenDetail={openVehicleDetail} onInspect={vehicle => openVehicleDetail(vehicle, 'documentacion', undefined, 'inspection')} onEditML={canWriteStock ? setMlEditingCar : undefined} onReserve={canReserve ? setReservingCar : undefined} onPrint={handlePrint} compareIds={comparison.map(vehicle => vehicle.id)} onToggleCompare={toggleComparison} hasActiveFilters={hasActiveFilters} onClearFilters={handleClearFilters} /> : inventoryLayout === 'cards' ? <StockCards data={filteredVehicles} returnTo={stockReturnTo} onPrint={handlePrint} onReserve={canReserve ? setReservingCar : undefined} onEditML={canWriteStock ? setMlEditingCar : undefined} onDelete={canWriteStock ? setDeletingCar : undefined} hasActiveFilters={hasActiveFilters} onClearFilters={handleClearFilters} /> : <div className="hidden lg:block">
                                <StockTable 
                                    data={filteredVehicles} 
                                    returnTo={stockReturnTo}
                                    canEdit={canWriteStock}
                                    onEditML={canWriteStock ? setMlEditingCar : undefined}
                                    onDelete={canWriteStock ? setDeletingCar : undefined}
                                    onPrint={handlePrint} 
                                    onSwap={handleSwap} 
                                    isSwapping={isSwapping} 
                                    compact={false}
                                    canReorder={canWriteStock && advancedFilters.sort === 'manual'}
                                    showTotals={!isOffline}
                                    currentPage={pageNumber} 
                                    totalPages={pages} 
                                    onReserve={canReserve ? setReservingCar : undefined}
                                    totalItems={total}
                                    filteredTotalUSD={filteredTotalUSD}
                                    filteredTotalARS={filteredTotalARS}
                                    dolarBlue={dolarBlue}
                                    hasActiveFilters={hasActiveFilters}
                                    onClearFilters={handleClearFilters}
                                    error={error}
                                    onRetry={() => refresh(currentStockFilters)}
                                    onNewVehicle={canWriteStock ? handleNewVehicle : undefined}
                                />
                            </div>}
                            {inventoryLayout === 'detailed' && <div className="block lg:hidden">
                                <StockMobileCards 
                                    returnTo={stockReturnTo}
                                    showTotals={!isOffline}
                                    data={filteredVehicles} 
                                    canEdit={canWriteStock}
                                    onEditML={canWriteStock ? setMlEditingCar : undefined}
                                    onDelete={canWriteStock ? setDeletingCar : undefined}
                                    onPrint={handlePrint} 
                                    totalItems={total}
                                    filteredTotalUSD={filteredTotalUSD}
                                    filteredTotalARS={filteredTotalARS}
                                    dolarBlue={dolarBlue}
                                    hasActiveFilters={hasActiveFilters}
                                    onClearFilters={handleClearFilters}
                                    error={error}
                                    onRetry={() => refresh(currentStockFilters)}
                                    onNewVehicle={canWriteStock ? handleNewVehicle : undefined}
                                />
                            </div>}
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
                )}
            </div>

            {comparison.length > 0 && <div className="sticky bottom-16 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-crm-border bg-crm-surface p-3 shadow-lg md:bottom-3"><span className="text-xs text-crm-fg">{comparison.length} vehículos seleccionados</span><div className="flex items-center gap-2"><button type="button" disabled={comparison.length < 2} onClick={() => setIsComparisonOpen(true)} className="min-h-8 rounded-lg bg-crm-red px-3 text-xs font-semibold text-white disabled:opacity-40">Comparar</button><button type="button" onClick={() => setComparison([])} className="min-h-8 px-2 text-xs text-crm-fg-muted">Limpiar selección</button></div></div>}
            {quickVehicle && <VehicleQuickDrawer key={`${token}:${quickVehicle.id}`} vehicle={vehicles.find(vehicle => vehicle.id === quickVehicle.id) || quickVehicle} onClose={() => setQuickVehicle(null)} onOpenDetail={(section, activityTab) => openVehicleDetail(quickVehicle, section, activityTab)} onInspect={() => openVehicleDetail(quickVehicle, 'documentacion', undefined, 'inspection')} onPause={() => openVehicleDetail(quickVehicle, 'resumen', undefined, 'pause')} onDelete={() => { setDeletingCar(quickVehicle); setQuickVehicle(null); }} />}
            {detailConfig && <VehicleDetailDialog key={`${token}:${detailConfig.vehicle.id}`} vehicle={detailConfig.vehicle} initialSection={detailConfig.section} initialAction={detailConfig.initialAction} activityTab={detailConfig.activityTab} onClose={() => setDetailConfig(null)} onVehicleChanged={() => refresh()} />}
            <VehicleComparisonDialog isOpen={isComparisonOpen} vehicles={comparison} onClose={() => setIsComparisonOpen(false)} />
            <VehicleFormModal
                isOpen={isFormOpen && canWriteStock}
                initialClient={initialVehicleClient}
                onClose={() => { setIsFormOpen(false); setEditingCar(null); setInitialVehicleClient(null); }}
                onSave={handleSaveVehicle}
                editingCar={editingCar}
            />

            <MandateStockModal
                isOpen={isMandateModalOpen && canWriteStock}
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
                isOpen={isImportModalOpen && canWriteStock}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={(count) => {
                    toast.success(`Se importaron ${count} vehículos correctamente.`);
                    if (typeof refresh === 'function') refresh();
                    else window.location.reload();
                }}
            />

            <MLActionModal
                isOpen={!!mlEditingCar && canWriteStock}
                onClose={() => setMlEditingCar(null)}
                vehicle={mlEditingCar}
                onSave={() => {
                    setMlEditingCar(null);
                    if (typeof refresh === 'function') refresh();
                    else window.location.reload();
                }}
            />

            <VehicleDeleteModal
                isOpen={!!deletingCar && canWriteStock}
                onClose={() => setDeletingCar(null)}
                vehicle={deletingCar}
                onSuccess={() => {
                    setDeletingCar(null);
                    if (typeof refresh === 'function') refresh();
                    else window.location.reload();
                }}
            />

            <ConfirmModal
                isOpen={confirmDeleteMandate.isOpen && canWriteStock}
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
                isOpen={!!reservingCar && canReserve && canReserveVehicle(reservingCar)}
                onClose={() => setReservingCar(null)}
                onSuccess={() => {
                    setReservingCar(null);
                    if (typeof refresh === 'function') refresh();
                    else window.location.reload();
                }}
                initialData={{
                    vehicleId: reservingCar?.id || reservingCar?._id,
                    vehicleName: `${reservingCar?.marca || ''} ${reservingCar?.modelo || ''} ${reservingCar?.technicalVersion || ''} ${reservingCar?.['año'] || reservingCar?.year || ''}`.trim(),
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
