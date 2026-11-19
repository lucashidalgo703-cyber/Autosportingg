"use client";
import { parseResponseSafe } from '../utils/apiHelper';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getActiveOfflineSnapshot } from '../services/offlineSyncService';
import toast from 'react-hot-toast';
import { filterStockVehicles, summarizeStock, isActiveStock, isAvailableStock } from '../utils/inventoryStock';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions';

const adminCarsQuery = (filters = {}) => {
    const query = new URLSearchParams({ t: String(Date.now()) });
    for (const key of ['page', 'limit', 'search', 'status', 'brand', 'tab', 'ml', 'catalog', 'ownership']) {
        if (filters[key]) query.append(key, String(filters[key]));
    }
    return query.toString();
};

export const useAdminCars = () => {
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(0);
    const [page, setPage] = useState(1);
    const [summary, setSummary] = useState(null);
    const [brands, setBrands] = useState([]);
    const [filteredTotalUSD, setFilteredTotalUSD] = useState(0);
    const [filteredTotalARS, setFilteredTotalARS] = useState(0);
    const [filteredCostUSD, setFilteredCostUSD] = useState(0);
    const [filteredCostARS, setFilteredCostARS] = useState(0);
    const [filteredPropioARS, setFilteredPropioARS] = useState(0);
    const [filteredInversionistasARS, setFilteredInversionistasARS] = useState(0);
    const [filteredPropioUSD, setFilteredPropioUSD] = useState(0);
    const [filteredInversionistasUSD, setFilteredInversionistasUSD] = useState(0);

    const [filteredMetrics, setFilteredMetrics] = useState(null);
    const [financialAccess, setFinancialAccess] = useState(false);
    const { logout, user } = useAuth();
    const activeRequestIdRef = useRef(0);
    const lastFiltersRef = useRef({ page: 1, limit: 20 });

    const applyOfflineFallback = useCallback((filters = {}) => {
        const snap = getActiveOfflineSnapshot();
        const cachedVehicles = snap?.data?.vehicles;
        if (!Array.isArray(cachedVehicles)) return null;

        const filtered = filterStockVehicles(cachedVehicles, filters);
        const limit = Math.max(1, Number(filters.limit) || 20);
        const currentPage = Math.max(1, Number(filters.page) || 1);
        const pageCars = filtered.slice((currentPage - 1) * limit, currentPage * limit);
        const uniqueBrands = Array.from(new Set(cachedVehicles.map(v => v.brand).filter(Boolean))).sort();
        const metrics = summarizeStock(filtered.filter(isAvailableStock));
        const canRead = hasPermission(user, PERMISSIONS.FINANZAS_READ);
        setCars(pageCars);
        setTotal(filtered.length);
        setPages(Math.ceil(filtered.length / limit));
        setPage(currentPage);
        setBrands(uniqueBrands);
        setFinancialAccess(canRead);
        setFilteredMetrics(metrics);
        setFilteredTotalARS(metrics.asking.ARS);
        setFilteredTotalUSD(metrics.asking.USD);
        setFilteredCostARS(canRead ? metrics.cost.ARS : 0);
        setFilteredCostUSD(canRead ? metrics.cost.USD : 0);
        setFilteredPropioARS(canRead ? metrics.ownAsking.ARS : 0);
        setFilteredPropioUSD(canRead ? metrics.ownAsking.USD : 0);
        setFilteredInversionistasARS(canRead ? metrics.investorAsking.ARS : 0);
        setFilteredInversionistasUSD(canRead ? metrics.investorAsking.USD : 0);
        const active = cachedVehicles.filter(isActiveStock);
        const available = cachedVehicles.filter(isAvailableStock);
        setSummary({ inventoryCount: cachedVehicles.length, total: available.length, disponibles: available.length,
            vendidos: cachedVehicles.length - active.length,
            ...(canRead ? { activeMetrics: summarizeStock(available), availableMetrics: summarizeStock(available) } : {}) });
        setError(null);
        return { cars: pageCars, total: filtered.length, pages: Math.ceil(filtered.length / limit), page: currentPage, brands: uniqueBrands, offline: true };
    }, [user]);

    const fetchCars = useCallback(async (incomingFilters) => {
        const requestId = ++activeRequestIdRef.current;
        if (!hasPermission(user, PERMISSIONS.STOCK_READ)) {
            setCars([]);
            setSummary(null);
            setBrands([]);
            setTotal(0);
            setPages(0);
            setFinancialAccess(false);
            setFilteredMetrics(null);
            setLoading(false);
            setError(null);
            return { cars: [] };
        }

        // Si se llama sin argumentos (o undefined), reutilizamos los últimos filtros activos
        const effectiveFilters = incomingFilters !== undefined
            ? { ...lastFiltersRef.current, ...incomingFilters }
            : { ...lastFiltersRef.current };

        lastFiltersRef.current = effectiveFilters;

        try {
            setLoading(true);
            setError(null);

            if (typeof window !== 'undefined' && navigator.onLine === false) {
                const offlineResult = applyOfflineFallback(effectiveFilters);
                if (offlineResult) return offlineResult;
            }

            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');

            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) {
                throw new Error('No admin token found');
            }

            const endpoint = `${baseUrl}/api/admin/cars?${adminCarsQuery(effectiveFilters)}`;
            const headers = {
                'Authorization': `Bearer ${token}`
            };

            const response = await fetch(endpoint, {
                headers,
                cache: 'no-store'
            });

            // Si llegó una petición posterior antes de que esta termine, descartamos esta respuesta
            if (requestId !== activeRequestIdRef.current) {
                return;
            }

            if (!response.ok) {
                if (response.status === 503) {
                    const offlineResult = applyOfflineFallback(effectiveFilters);
                    if (offlineResult) return offlineResult;
                }
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    logout();
                }

                let errorMessage = `Failed to fetch admin cars (status: ${response.status})`;
                try {
                    const text = await response.text();
                    try {
                        const parsed = JSON.parse(text);
                        if (parsed && parsed.message) {
                            errorMessage = parsed.message;
                        } else if (parsed && parsed.error) {
                            errorMessage = parsed.error;
                        }
                    } catch (_) {
                        if (text && text.length < 150) {
                            errorMessage = `${errorMessage}: ${text}`;
                        }
                    }
                } catch (_) {}

                throw Object.assign(new Error(errorMessage), { status: response.status });
            }

            const data = await parseResponseSafe(response);

            // Verificamos nuevamente la vigencia de la respuesta
            if (requestId !== activeRequestIdRef.current) {
                return;
            }

            if (data && data.cars) {
                setCars(data.cars);
                setFilteredMetrics(data.filteredMetrics || null);
                setFinancialAccess(data.financialAccess === true);
                setTotal(data.total || 0);
                setPages(data.pages || 0);
                setPage(data.page || 1);
                if (data.summary) {
                    setSummary(data.summary);
                }
                setBrands(data.brands || []);
                setFilteredTotalUSD(data.filteredTotalUSD || 0);
                setFilteredTotalARS(data.filteredTotalARS || 0);
                setFilteredCostUSD(data.filteredCostUSD || 0);
                setFilteredCostARS(data.filteredCostARS || 0);
                setFilteredPropioARS(data.filteredPropioARS || 0);
                setFilteredInversionistasARS(data.filteredInversionistasARS || 0);
                setFilteredPropioUSD(data.filteredPropioUSD || 0);
                setFilteredInversionistasUSD(data.filteredInversionistasUSD || 0);
                return data;
            } else {
                setCars(Array.isArray(data) ? data : []);
                setFilteredMetrics(null);
                setFinancialAccess(false);
                setFilteredTotalUSD(0);
                setFilteredTotalARS(0);
                setFilteredCostUSD(0);
                setFilteredCostARS(0);
                setFilteredPropioARS(0);
                setFilteredInversionistasARS(0);
                setFilteredPropioUSD(0);
                setFilteredInversionistasUSD(0);
                return { cars: Array.isArray(data) ? data : [] };
            }
        } catch (err) {
            if (requestId !== activeRequestIdRef.current) return;
            if (![401, 403].includes(err.status)) {
                const offlineResult = applyOfflineFallback(effectiveFilters);
                if (offlineResult) return offlineResult;
            }
            console.error("Error fetching admin cars:", err);
            setError(err.message);
            return { cars: [] };
        } finally {
            if (requestId === activeRequestIdRef.current) {
                setLoading(false);
            }
        }
    }, [logout, applyOfflineFallback, user]);

    useEffect(() => {
        const onStockChanged = () => fetchCars();
        const onStorageChanged = (event) => {
            if (event.key === 'crm:stock-changed' && event.newValue !== event.oldValue) {
                fetchCars();
            }
        };
        window.addEventListener('crm:stock-changed', onStockChanged);
        window.addEventListener('storage', onStorageChanged);
        return () => {
            window.removeEventListener('crm:stock-changed', onStockChanged);
            window.removeEventListener('storage', onStorageChanged);
        };
    }, [fetchCars]);

    const deleteCar = async (id) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const endpoint = `${baseUrl}/api/cars/${id}`;

            const res = await fetch(endpoint, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!res.ok) {
                if (res.status === 401) {
                    toast.error('Sesión expirada');
                    logout();
                    return;
                }
                throw new Error('Failed to delete');
            }

            setCars(prev => prev.filter(c => c._id !== id));
            // Actualizamos la lista y el resumen global
            fetchCars();
        } catch (err) {
            console.error("Error deleting car:", err);
            toast.error("Error al eliminar vehículo");
        }
    };

    const swapCars = async (id1, id2, direction, context) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const endpoint = `${baseUrl}/api/cars/reorder/swap`;

            const token = localStorage.getItem('token');
            let targetId = id2;
            if (!targetId && context) {
                const nextPage = Number(context.page) + (direction === 'up' ? -1 : 1);
                if (!['up', 'down'].includes(direction) || !Number.isInteger(nextPage) || nextPage < 1) {
                    throw new Error('No hay una página anterior disponible para este movimiento.');
                }
                const neighborResponse = await fetch(`${baseUrl}/api/admin/cars?${adminCarsQuery({ ...context, page: nextPage })}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: 'no-store'
                });
                const neighborData = await parseResponseSafe(neighborResponse);
                if (!neighborResponse.ok) throw new Error(neighborData?.message || 'No se pudo consultar el vehículo vecino. Reintentá el movimiento.');
                const neighbors = Array.isArray(neighborData?.cars) ? neighborData.cars : [];
                const neighbor = direction === 'up' ? neighbors[neighbors.length - 1] : neighbors[0];
                targetId = neighbor?._id || neighbor?.id;
                if (!targetId || String(targetId) === String(id1)) {
                    throw new Error('La lista cambió y no se pudo encontrar el vehículo vecino. Actualizá el listado antes de ordenar.');
                }
            }
            if (context && ['page', 'limit', 'search', 'status', 'brand', 'tab', 'ml', 'catalog', 'ownership'].some(key => String(lastFiltersRef.current[key] ?? '') !== String(context[key] ?? ''))) throw new Error('Los filtros cambiaron. Reintentá el movimiento con el listado actualizado.');
            if (!token || localStorage.getItem('token') !== token) throw new Error('La sesión cambió. Actualizá el listado antes de ordenar.');
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ id1, id2: targetId, ...(targetId ? {} : { direction }) })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                if (res.status === 401 || res.status === 403) {
                    toast.error('Sesión expirada');
                    logout();
                    return false;
                }
                throw new Error(errData.message || 'Error al cambiar el orden');
            }

            return true;
        } catch (err) {
            console.error("Error swapping cars:", err);
            toast.error(err.message || "Error al cambiar el orden");
            return false;
        }
    };

    return {
        cars,
        loading,
        error,
        refresh: fetchCars,
        deleteCar,
        setCars,
        total,
        pages,
        page,
        summary,
        brands,
        swapCars,
        filteredMetrics,
        financialAccess,
        filteredTotalUSD,
        filteredTotalARS,
        filteredCostUSD,
        filteredCostARS,
        filteredPropioARS,
        filteredInversionistasARS,
        filteredPropioUSD,
        filteredInversionistasUSD
    };
};
